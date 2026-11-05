#!/usr/bin/env python3
"""Servidor de desarrollo: carta y reservas DEMO persistentes, sin dependencias."""
import argparse
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
CONFIG = json.loads((ROOT / 'config.json').read_text())
RULES = CONFIG['reservations']
TZ = ZoneInfo(RULES['timezone'])
DATA = Path(os.environ.get('RESTAURANT_DATA_DIR', str(ROOT.parent.parent / 'restaurante-data'))).resolve()
ADMIN = os.environ.get('RESTAURANT_ADMIN_TOKEN', '')
if CONFIG.get('demo') is not True:
    raise RuntimeError('Esta versión solo admite reservas de demostración.')
if DATA == PUBLIC or PUBLIC in DATA.parents:
    raise RuntimeError('La base de datos debe estar fuera de public.')
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / 'reservations.sqlite3'
RATE = {}
LOCK = threading.Lock()


def connection():
    con = sqlite3.connect(DB, timeout=15, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA busy_timeout=15000')
    return con


def initialize():
    with connection() as con:
        con.execute('PRAGMA journal_mode=WAL')
        con.execute('''CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, request_key TEXT UNIQUE NOT NULL,
            payload_hash TEXT NOT NULL, start INTEGER NOT NULL, end INTEGER NOT NULL,
            party INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed', created TEXT NOT NULL)''')
        con.execute('CREATE INDEX IF NOT EXISTS booking_times ON bookings(start,end,status)')


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def valid_day(value):
    day = date.fromisoformat(value)
    today = datetime.now(TZ).date()
    if not today <= day <= today + timedelta(days=RULES['maxAdvanceDays']):
        raise ValueError('Elige una fecha dentro de los próximos 60 días.')
    return day


def candidates(day):
    if day.isoformat() in RULES['closedDates']:
        return []
    values = []
    for opening, closing in RULES['weeklyHours'].get(str(day.weekday()), []):
        start = datetime.fromisoformat(f'{day.isoformat()}T{opening}').replace(tzinfo=TZ)
        end = datetime.fromisoformat(f'{day.isoformat()}T{closing}').replace(tzinfo=TZ)
        while start + timedelta(minutes=RULES['durationMinutes']) <= end:
            if start >= datetime.now(TZ) + timedelta(hours=RULES['minimumNoticeHours']):
                values.append(int(start.timestamp()))
            start += timedelta(minutes=RULES['stepMinutes'])
    return values


def used_capacity(con, start, end):
    # Sweep events: capacity is maximum simultaneous occupancy, not the sum of all
    # bookings that intersect any part of the requested interval.
    rows = con.execute("SELECT start,end,party FROM bookings WHERE status='confirmed' AND start<? AND end>?", (end, start)).fetchall()
    events = []
    for row in rows:
        events.extend([(max(start, row['start']), row['party']), (min(end, row['end']), -row['party'])])
    current = peak = 0
    for _, delta in sorted(events, key=lambda event: (event[0], event[1])):
        current += delta
        peak = max(peak, current)
    return peak


def public_booking(row):
    start = datetime.fromtimestamp(row['start'], TZ)
    return {'id': row['id'], 'date': start.date().isoformat(), 'time': start.strftime('%H:%M'),
            'partySize': row['party'], 'name': row['name'], 'status': row['status'], 'demo': True}


class Handler(BaseHTTPRequestHandler):
    server_version = 'RestaurantDemo/1.0'

    def log_message(self, *_):
        pass  # Never log contact details or private authorization headers.

    def headers_common(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'")

    def respond(self, status, value):
        content = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.headers_common()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(content)

    def error(self, status, message):
        self.respond(status, {'error': message})

    def body(self):
        if self.headers.get_content_type() != 'application/json':
            raise ValueError('Envía el formulario como JSON.')
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            raise ValueError('Origen no permitido.')
        length = int(self.headers.get('Content-Length', 0))
        if not 0 < length <= 8192:
            raise ValueError('Formulario vacío o demasiado grande.')
        body = json.loads(self.rfile.read(length))
        if not isinstance(body, dict):
            raise ValueError('Formulario no válido.')
        return body

    def authorized_booking(self, booking_id, con):
        row = con.execute('SELECT * FROM bookings WHERE id=?', (booking_id,)).fetchone()
        token = self.headers.get('Authorization', '').removeprefix('Bearer ')
        return row if row and hmac.compare_digest(digest(token), row['token_hash']) else None

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)
        query = parse_qs(parsed.query)
        try:
            if path == '/healthz':
                return self.respond(200, {'status': 'ok', 'demo': True})
            if path == '/api/config':
                today = datetime.now(TZ).date()
                return self.respond(200, {**CONFIG, 'today': today.isoformat(), 'maxDate': (today + timedelta(days=RULES['maxAdvanceDays'])).isoformat()})
            if path == '/api/availability':
                day = valid_day(query.get('date', [''])[0])
                party = int(query.get('partySize', ['2'])[0])
                if not 1 <= party <= RULES['maxParty']:
                    raise ValueError('Selecciona entre 1 y 8 personas.')
                slots = []
                with connection() as con:
                    for start in candidates(day):
                        end = start + (RULES['durationMinutes'] + RULES['bufferMinutes']) * 60
                        if used_capacity(con, start, end) + party <= RULES['capacity']:
                            slots.append({'time': datetime.fromtimestamp(start, TZ).strftime('%H:%M')})
                return self.respond(200, {'slots': slots, 'demo': True})
            if path == '/api/admin/reservations':
                supplied = self.headers.get('Authorization', '').removeprefix('Bearer ')
                if len(ADMIN) < 24 or not hmac.compare_digest(supplied, ADMIN):
                    return self.error(401, 'Administración no autorizada.')
                with connection() as con:
                    rows = con.execute('SELECT * FROM bookings ORDER BY start DESC LIMIT 500').fetchall()
                return self.respond(200, {'reservations': [public_booking(row) for row in rows]})
            if path.startswith('/api/reservations/'):
                with connection() as con:
                    row = self.authorized_booking(path.rsplit('/', 1)[-1], con)
                return self.respond(200, public_booking(row)) if row else self.error(404, 'Referencia o clave privada incorrecta.')
            if path.startswith('/api/'):
                return self.error(404, 'Ruta no encontrada.')
            file = (PUBLIC / path.lstrip('/')).resolve()
            if file != PUBLIC and PUBLIC not in file.parents:
                return self.error(404, 'Página no encontrada.')
            if file.is_dir():
                file = file / 'index.html'
            if not file.is_file() or file.suffix not in {'.html', '.css', '.js', '.json', '.webp', '.svg', '.png', '.ico'}:
                return self.error(404, 'Página no encontrada.')
            data = file.read_bytes()
            self.send_response(200)
            self.headers_common()
            self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(data)
        except (ValueError, TypeError, KeyError):
            self.error(400, 'Revisa la fecha, las personas y los datos enviados.')
        except sqlite3.Error:
            self.error(503, 'La agenda no está disponible. Inténtalo de nuevo.')

    def do_POST(self):
        try:
            with LOCK:
                now = time.monotonic()
                # Bounded in-memory rate limit, no persistent IP tracking.
                for key in list(RATE):
                    if RATE[key][0] < now - 60:
                        del RATE[key]
                key = self.client_address[0]
                then, count = RATE.get(key, (now, 0))
                RATE[key] = (then, count + 1)
                if count >= 60:
                    return self.error(429, 'Espera un minuto antes de volver a intentarlo.')
            path = urlsplit(self.path).path
            body = self.body()
            if path.startswith('/api/reservations/') and path.endswith('/cancel'):
                booking_id = path.split('/')[-2]
                with connection() as con:
                    con.execute('BEGIN IMMEDIATE')
                    row = self.authorized_booking(booking_id, con)
                    if not row:
                        con.rollback()
                        return self.error(404, 'Referencia o clave privada incorrecta.')
                    con.execute("UPDATE bookings SET status='cancelled' WHERE id=?", (booking_id,))
                    con.commit()
                    row = con.execute('SELECT * FROM bookings WHERE id=?', (booking_id,)).fetchone()
                return self.respond(200, public_booking(row))
            if path != '/api/reservations':
                return self.error(404, 'Ruta no encontrada.')
            if body.get('privacyAccepted') is not True:
                raise ValueError('Debes aceptar la información de privacidad.')
            party = body.get('partySize')
            if type(party) is not int or not 1 <= party <= RULES['maxParty']:
                raise ValueError('Selecciona entre 1 y 8 personas.')
            fields = {name: str(body.get(name, '')).strip() for name in ['name', 'email', 'phone']}
            if not 2 <= len(fields['name']) <= 100 or not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', fields['email']) or len(fields['email']) > 160 or not re.fullmatch(r'[+\d ()-]{6,30}', fields['phone']):
                raise ValueError('Revisa el nombre, email y teléfono.')
            request_key = body.get('idempotencyKey', '')
            token = body.get('accessKey', '')
            if not isinstance(request_key, str) or not re.fullmatch(r'[a-zA-Z0-9-]{20,80}', request_key) or not isinstance(token, str) or not re.fullmatch(r'[a-f0-9]{64}', token):
                raise ValueError('Referencia privada no válida. Recarga la página.')
            payload = {**fields, 'date': body.get('date'), 'time': body.get('time'), 'partySize': party}
            payload_hash = digest(json.dumps(payload, sort_keys=True))
            with connection() as con:
                con.execute('BEGIN IMMEDIATE')
                existing = con.execute('SELECT * FROM bookings WHERE request_key=?', (request_key,)).fetchone()
                if existing:
                    con.rollback()
                    if existing['payload_hash'] != payload_hash or not hmac.compare_digest(existing['token_hash'], digest(token)):
                        return self.error(409, 'Esta solicitud ya se utilizó con otros datos.')
                    return self.respond(200, public_booking(existing))
                day = valid_day(str(body.get('date', '')))
                available = {datetime.fromtimestamp(s, TZ).strftime('%H:%M'): s for s in candidates(day)}
                start = available.get(body.get('time'))
                if start is None:
                    con.rollback()
                    return self.error(409, 'Ese horario ya no está disponible.')
                end = start + (RULES['durationMinutes'] + RULES['bufferMinutes']) * 60
                if used_capacity(con, start, end) + party > RULES['capacity']:
                    con.rollback()
                    return self.error(409, 'No queda aforo para ese grupo. Elige otro horario.')
                booking_id = secrets.token_hex(8)
                con.execute('INSERT INTO bookings (id,token_hash,request_key,payload_hash,start,end,party,name,email,phone,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                            (booking_id, digest(token), request_key, payload_hash, start, end, party, fields['name'], fields['email'], fields['phone'], datetime.now(TZ).isoformat()))
                con.commit()
                row = con.execute('SELECT * FROM bookings WHERE id=?', (booking_id,)).fetchone()
            return self.respond(201, public_booking(row))
        except (ValueError, TypeError, KeyError) as exc:
            self.error(400, str(exc) if isinstance(exc, ValueError) else 'Formulario no válido.')
        except sqlite3.Error:
            self.error(503, 'La agenda no está disponible. Inténtalo de nuevo.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=3002)
    args = parser.parse_args()
    initialize()
    print(f'Restaurante DEMO · puerto {args.port} · {RULES["timezone"]}', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
