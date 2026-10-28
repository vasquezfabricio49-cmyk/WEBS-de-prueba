#!/usr/bin/env python3
"""Static websites and a persistent, single-resource booking agenda. Python 3.12+."""
from __future__ import annotations
import argparse
import calendar
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
TZ = ZoneInfo('Europe/Madrid')
DATA = Path(os.environ.get('SHALOM_DATA_DIR', str(ROOT.parent / 'shalom-data')))
DATA.mkdir(mode=0o700, parents=True, exist_ok=True)
DB = DATA / 'appointments.sqlite3'
MODE = os.environ.get('SHALOM_BOOKING_MODE', 'demo')
if MODE not in ('demo', 'live'):
    raise RuntimeError('SHALOM_BOOKING_MODE must be demo or live')
ADMIN_TOKEN = os.environ.get('SHALOM_ADMIN_TOKEN', '')
DEFAULT_SCHEDULE = {'1': [['10:00', '14:00'], ['16:00', '20:00']], '2': [['10:00', '14:00'], ['16:00', '20:00']], '3': [['10:00', '14:00'], ['16:00', '20:00']], '4': [['10:00', '14:00'], ['16:00', '20:00']], '5': [['10:00', '14:00']]}
CONFIG_PATH = os.environ.get('SHALOM_AGENDA_CONFIG')
if MODE == 'live' and (not CONFIG_PATH or len(ADMIN_TOKEN) < 24):
    raise RuntimeError('Live mode requires a validated SHALOM_AGENDA_CONFIG and SHALOM_ADMIN_TOKEN of at least 24 characters')
AGENDA = json.loads(Path(CONFIG_PATH).read_text()) if CONFIG_PATH else {'weekly_hours': DEFAULT_SCHEDULE, 'buffer_minutes': 15, 'closed_dates': [], 'durations': {}}
SERVICES = {s['id']: dict(s) for s in json.loads((ROOT / 'assets/catalog.json').read_text())['shalom']}
for key, minutes in AGENDA.get('durations', {}).items():
    if key not in SERVICES or not isinstance(minutes, int) or not 15 <= minutes <= 240:
        raise RuntimeError('Invalid service duration in agenda configuration')
    SERVICES[key]['duration'] = minutes
if MODE == 'live' and set(AGENDA.get('durations', {})) != set(SERVICES):
    raise RuntimeError('Live mode requires validated durations for every service')
if not isinstance(AGENDA.get('buffer_minutes', 15), int) or not 0 <= AGENDA.get('buffer_minutes', 15) <= 120:
    raise RuntimeError('Invalid buffer_minutes')
for weekday, intervals in AGENDA.get('weekly_hours', {}).items():
    if weekday not in {str(n) for n in range(7)}:
        raise RuntimeError('Invalid weekday')
    previous_end = ''
    for start, end in intervals:
        if not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', start) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', end) or start >= end or start < previous_end:
            raise RuntimeError('Invalid or overlapping opening hours')
        previous_end = end
for closed in AGENDA.get('closed_dates', []):
    date.fromisoformat(closed)
BUFFER = AGENDA.get('buffer_minutes', 15)
RATE_LOCK = threading.Lock()
RATE: dict[str, list[float]] = {}

def connection():
    con = sqlite3.connect(DB, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA busy_timeout=15000')
    return con

with connection() as con:
    con.execute('PRAGMA journal_mode=WAL')
    con.execute('''CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, service TEXT NOT NULL,
        start INTEGER NOT NULL, end INTEGER NOT NULL, name TEXT NOT NULL,
        email TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL,
        created INTEGER NOT NULL, mode TEXT NOT NULL, idempotency TEXT UNIQUE NOT NULL
    )''')
    con.execute('CREATE INDEX IF NOT EXISTS idx_slots ON appointments(start, end, status, mode)')
os.chmod(DB, 0o600)

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def now():
    return datetime.now(TZ)

def valid_date(value):
    d = date.fromisoformat(value)
    today = now().date()
    if not today <= d <= today + timedelta(days=60):
        raise ValueError('Elige una fecha entre hoy y los próximos 60 días.')
    return d

def candidates(day, service):
    if day.isoformat() in AGENDA.get('closed_dates', []):
        return []
    duration = SERVICES[service]['duration']
    result = []
    for a, b in AGENDA.get('weekly_hours', {}).get(str(day.weekday()), []):
        opening = datetime.combine(day, datetime.strptime(a, '%H:%M').time(), TZ)
        closing = datetime.combine(day, datetime.strptime(b, '%H:%M').time(), TZ)
        current = opening
        while current + timedelta(minutes=duration + BUFFER) <= closing:
            if current > now() + timedelta(hours=2):
                result.append(int(current.timestamp()))
            current += timedelta(minutes=30)
    return result

def overlaps(con, start, end, exclude=None):
    sql = "SELECT 1 FROM appointments WHERE mode=? AND status IN ('pending','confirmed') AND start < ? AND end > ?"
    args = [MODE, end, start]
    if exclude:
        sql += ' AND id != ?'
        args.append(exclude)
    return con.execute(sql, args).fetchone() is not None

def public_booking(row):
    start = datetime.fromtimestamp(row['start'], TZ)
    return {'id': row['id'], 'service': row['service'], 'serviceName': SERVICES[row['service']]['name'],
            'date': start.date().isoformat(), 'time': start.strftime('%H:%M'),
            'duration': SERVICES[row['service']]['duration'], 'status': row['status'], 'mode': row['mode'],
            'start': row['start'], 'name': row['name'], 'email': row['email'], 'phone': row['phone'], 'timezone': 'Europe/Madrid'}

class Handler(BaseHTTPRequestHandler):
    server_version = 'ShalomAgenda/1.0'

    def log_message(self, fmt, *args):
        # Never log customer details, bearer tokens, queries or booking URLs.
        pass

    def headers_common(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; media-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")

    def respond(self, code, value):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(code)
        self.headers_common()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def error(self, code, message):
        self.respond(code, {'error': message})

    def admin(self):
        supplied = self.headers.get('Authorization', '')
        return len(ADMIN_TOKEN) >= 24 and hmac.compare_digest(supplied, 'Bearer ' + ADMIN_TOKEN)

    def body(self):
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            raise ValueError('El formulario debe enviar JSON.')
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 < length <= 8192:
            raise ValueError('Formulario vacío o demasiado grande.')
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            raise ValueError('Origen no permitido.')
        value = json.loads(self.rfile.read(length))
        if not isinstance(value, dict):
            raise ValueError('Formulario no válido.')
        return value

    def do_GET(self):
        parts = urlsplit(self.path)
        path = unquote(parts.path)
        q = parse_qs(parts.query)
        try:
            if path == '/healthz':
                return self.respond(200, {'status':'ok','mode':MODE})
            if path == '/api/config':
                return self.respond(200, {'mode': MODE, 'timezone': 'Europe/Madrid', 'today': now().date().isoformat(), 'maxDate': (now().date()+timedelta(days=60)).isoformat(), 'adminEnabled': len(ADMIN_TOKEN) >= 24, 'services': [{'id': s['id'], 'name': s['name'], 'duration': s['duration']} for s in SERVICES.values()]})
            if path == '/api/availability':
                service = q.get('service', [''])[0]
                if service not in SERVICES:
                    raise ValueError('Selecciona un servicio válido.')
                day = valid_date(q.get('date', [''])[0])
                slots = []
                with connection() as con:
                    for start in candidates(day, service):
                        end = start + (SERVICES[service]['duration']+BUFFER)*60
                        if not overlaps(con, start, end):
                            slots.append({'time': datetime.fromtimestamp(start, TZ).strftime('%H:%M'), 'start': start})
                return self.respond(200, {'slots': slots, 'mode': MODE, 'timezone': 'Europe/Madrid'})
            if path == '/api/admin/bookings':
                if not self.admin():
                    return self.error(401, 'Acceso de administración no autorizado.')
                with connection() as con:
                    rows = con.execute('SELECT * FROM appointments WHERE mode=? ORDER BY start DESC LIMIT 500', [MODE]).fetchall()
                return self.respond(200, {'bookings': [public_booking(row) for row in rows], 'mode': MODE})
            if path.startswith('/api/bookings/'):
                key = path.removeprefix('/api/bookings/')
                with connection() as con:
                    row = con.execute('SELECT * FROM appointments WHERE id=? AND mode=?', [key, MODE]).fetchone()
                supplied = self.headers.get('Authorization', '').removeprefix('Bearer ')
                if not row or not hmac.compare_digest(digest(supplied), row['token_hash']):
                    return self.error(404, 'No se encuentra la solicitud o el enlace no es válido.')
                return self.respond(200, public_booking(row))
            if path.startswith('/api/'):
                return self.error(404, 'Ruta no encontrada.')
            return self.static(path)
        except (ValueError, TypeError, json.JSONDecodeError):
            return self.error(400, 'Revisa el servicio y la fecha seleccionados.')
        except sqlite3.Error:
            return self.error(503, 'La agenda no está disponible. Inténtalo de nuevo.')

    def static(self, path):
        host = self.headers.get('Host','').split(':')[0].lower()
        clinic = 'shalom-beauty-clinique' if host == os.environ.get('SHALOM_HOST','shalom.tapandgoweb.com').lower() else ('esthetica-latino' if host == os.environ.get('LATINO_HOST','esthetica.tapandgoweb.com').lower() else '')
        if clinic and path in ('/', '/index.html', '/reserva.html', '/admin.html', '/privacidad.html'):
            path = '/' + clinic + ('/index.html' if path in ('/','/index.html') else path)
        allowed = path in ('/', '/index.html') or path.startswith(('/assets/', '/esthetica-latino/', '/shalom-beauty-clinique/'))
        if not allowed:
            return self.error(404, 'Página no encontrada.')
        file = (ROOT / path.lstrip('/')).resolve()
        if ROOT not in file.parents and file != ROOT:
            return self.error(404, 'Página no encontrada.')
        if file.is_dir():
            file = file / 'index.html'
        if not file.is_file() or file.suffix.lower() not in {'.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.webp', '.mp4', '.woff2', '.ttf', '.woff'}:
            return self.error(404, 'Página no encontrada.')
        import mimetypes
        data = file.read_bytes()
        self.send_response(200)
        self.headers_common()
        self.send_header('Content-Type', (mimetypes.guess_type(str(file))[0] or 'application/octet-stream') + ('; charset=utf-8' if file.suffix in {'.html', '.css', '.js', '.json', '.svg'} else ''))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache' if file.suffix in {'.html','.json','.js','.css'} else 'public, max-age=3600')
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            data = self.body()
            if path == '/api/bookings':
                return self.create(data)
            match = re.fullmatch(r'/api/bookings/(SH-[A-F0-9]+)/cancel', path)
            if match:
                with connection() as con:
                    con.execute('BEGIN IMMEDIATE')
                    row = con.execute('SELECT * FROM appointments WHERE id=? AND mode=?', [match[1], MODE]).fetchone()
                    token = self.headers.get('Authorization', '').removeprefix('Bearer ')
                    if not row or not hmac.compare_digest(digest(token), row['token_hash']):
                        return self.error(404, 'Solicitud no encontrada.')
                    if row['start'] <= int(time.time()):
                        return self.error(409, 'No se puede cancelar una cita pasada desde este enlace.')
                    con.execute("UPDATE appointments SET status='cancelled' WHERE id=?", [row['id']])
                return self.respond(200, {'status': 'cancelled'})
            match = re.fullmatch(r'/api/admin/bookings/(SH-[A-F0-9]+)', path)
            if match:
                if not self.admin():
                    return self.error(401, 'Acceso no autorizado.')
                status = data.get('status')
                if status not in ('confirmed', 'cancelled'):
                    raise ValueError('Estado no válido.')
                with connection() as con:
                    con.execute('BEGIN IMMEDIATE')
                    row = con.execute('SELECT * FROM appointments WHERE id=? AND mode=?', [match[1], MODE]).fetchone()
                    if not row:
                        return self.error(404, 'Solicitud no encontrada.')
                    if row['status'] == 'cancelled' and status == 'confirmed':
                        return self.error(409, 'Una solicitud cancelada no se reactiva. Crea una nueva.')
                    con.execute('UPDATE appointments SET status=? WHERE id=?', [status,row['id']])
                return self.respond(200, {'status': status})
            return self.error(404, 'Ruta no encontrada.')
        except (ValueError, TypeError, KeyError, OverflowError, json.JSONDecodeError):
            return self.error(400, 'Revisa los datos, acepta la política de privacidad y vuelve a intentarlo.')
        except sqlite3.Error:
            return self.error(503, 'No se pudo guardar la solicitud. Inténtalo de nuevo.')

    def create(self, data):
        service = data.get('service')
        if service not in SERVICES:
            raise ValueError('Servicio no válido.')
        day = valid_date(data.get('date', ''))
        requested = data.get('time', '')
        start = next((s for s in candidates(day, service) if datetime.fromtimestamp(s,TZ).strftime('%H:%M') == requested), None)
        if start is None:
            return self.error(409, 'Ese horario ya no está disponible. Elige otro.')
        for key in ('name','email','phone','idempotency'):
            if not isinstance(data.get(key), str):
                raise ValueError('Campo no válido.')
        name, email, phone = data['name'].strip(), data['email'].strip().lower(), data['phone'].strip()
        if not 2 <= len(name) <= 80 or not re.fullmatch(r'[^\s@]{1,100}@[^\s@.]{1,100}\.[^\s@]{2,30}', email) or not re.fullmatch(r'[+0-9 ()-]{7,25}', phone):
            raise ValueError('Datos de contacto no válidos.')
        if data.get('consent') is not True or not re.fullmatch(r'[a-zA-Z0-9-]{16,80}', data['idempotency']):
            raise ValueError('Consentimiento o identificador no válido.')
        # A client-generated 256-bit management key makes safe idempotent retries possible.
        token = data.get('managementKey', '')
        if not isinstance(token,str) or not re.fullmatch(r'[a-f0-9]{64}', token):
            raise ValueError('Clave de gestión no válida.')
        end = start + (SERVICES[service]['duration']+BUFFER)*60
        with connection() as con:
            con.execute('BEGIN IMMEDIATE')
            existing = con.execute('SELECT * FROM appointments WHERE idempotency=?', [data['idempotency']]).fetchone()
            if existing:
                if existing['mode'] != MODE or not hmac.compare_digest(existing['token_hash'], digest(token)):
                    return self.error(409, 'La solicitud no coincide con el intento anterior.')
                if (existing['service'],existing['start'],existing['name'],existing['email'],existing['phone']) != (service,start,name,email,phone):
                    return self.error(409, 'Los datos cambiaron. Inicia una nueva solicitud.')
                return self.respond(200, {**public_booking(existing), 'managementKey':token})
            if overlaps(con, start, end):
                return self.error(409, 'Otra persona acaba de solicitar ese horario. Selecciona otro.')
            ip = self.client_address[0]
            with RATE_LOCK:
                stamp = time.monotonic()
                recent = [v for v in RATE.get(ip,[]) if stamp-v<3600]
                RATE[ip] = recent
                if len(recent)>=20:
                    return self.error(429, 'Demasiadas solicitudes. Inténtalo más tarde.')
                recent.append(stamp)
                if len(RATE)>10000:
                    for key in list(RATE):
                        if not RATE[key] or stamp-RATE[key][-1]>=3600: RATE.pop(key,None)
            key = 'SH-' + secrets.token_hex(5).upper()
            con.execute('INSERT INTO appointments VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [key,digest(token),service,start,end,name,email,phone,'pending',int(time.time()),MODE,data['idempotency']])
            row = con.execute('SELECT * FROM appointments WHERE id=?',[key]).fetchone()
        return self.respond(201, {**public_booking(row), 'managementKey': token})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=3000)
    parser.add_argument('--host', default='0.0.0.0')
    args = parser.parse_args()
    print(f'Shalom server: port {args.port}; booking mode: {MODE}; timezone: Europe/Madrid', flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
