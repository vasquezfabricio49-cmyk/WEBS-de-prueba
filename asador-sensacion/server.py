#!/usr/bin/env python3
"""Solicitudes pendientes, sin confirmación automática ni notificaciones."""
import argparse
import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('SENSACION_DATA_DIR', str(ROOT.parent.parent / 'sensacion-data'))).resolve()
if DATA == ROOT or ROOT in DATA.parents:
    raise RuntimeError('Los datos deben estar fuera del directorio público')
DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
DB = DATA / 'requests.sqlite3'
TOKEN = os.environ.get('SENSACION_ADMIN_TOKEN', '')
ENABLED = os.environ.get('SENSACION_ACCEPT_REQUESTS') == '1'
with sqlite3.connect(DB) as db:
    db.execute('CREATE TABLE IF NOT EXISTS requests (reference TEXT PRIMARY KEY, name TEXT, phone TEXT, day TEXT, time TEXT, people INTEGER, status TEXT, created TEXT)')
os.chmod(DB, 0o600)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Evitar datos personales y claves en logs.

    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/status':
            return self.reply(200, {'reservations': ENABLED})
        if path == '/api/reservations':
            supplied = self.headers.get('Authorization', '')
            if len(TOKEN) < 24 or not hmac.compare_digest(supplied, 'Bearer ' + TOKEN):
                return self.reply(401, {'error': 'Acceso restringido'})
            with sqlite3.connect(DB) as db:
                db.row_factory = sqlite3.Row
                rows = [dict(row) for row in db.execute('SELECT * FROM requests ORDER BY created DESC LIMIT 500')]
            return self.reply(200, {'requests': rows})
        # Solo recursos públicos: nunca servir código Python ni documentación operativa.
        if path.startswith('/api/'):
            return self.reply(404, {'error': 'Ruta inexistente'})
        if path.endswith('/'):
            path += 'index.html'
        if Path(path).suffix.lower() not in {'.html', '.css', '.js', '.jpg', '.jpeg', '.webp', '.png', '.svg', '.woff2'}:
            return self.reply(404, {'error': 'Ruta inexistente'})
        super().do_GET()

    def do_PATCH(self):
        match = re.fullmatch(r'/api/reservations/(SEN-[A-F0-9]{10})', self.path)
        if not match:
            return self.reply(404, {'error': 'Ruta inexistente'})
        if len(TOKEN) < 24 or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN):
            return self.reply(401, {'error': 'Acceso restringido'})
        if urlsplit(self.headers.get('Origin', '')).netloc != self.headers.get('Host'):
            return self.reply(403, {'error': 'Origen no permitido'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 512:
                raise ValueError()
            status = json.loads(self.rfile.read(size))['status']
            if status not in ('pending', 'confirmed', 'rejected', 'cancelled'):
                raise ValueError()
        except (ValueError, KeyError, TypeError):
            return self.reply(400, {'error': 'Estado inválido'})
        with sqlite3.connect(DB) as db:
            changed = db.execute('UPDATE requests SET status=? WHERE reference=?', (status, match[1])).rowcount
        self.reply(200 if changed else 404, {'status': status} if changed else {'error': 'Solicitud inexistente'})

    def do_POST(self):
        if self.path != '/api/reservations':
            return self.reply(404, {'error': 'Ruta inexistente'})
        if not ENABLED:
            return self.reply(503, {'error': 'Las solicitudes online no están activadas. Llama al restaurante.'})
        origin = self.headers.get('Origin')
        if not origin or urlsplit(origin).netloc != self.headers.get('Host'):
            return self.reply(403, {'error': 'Origen no permitido'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 2048 or self.headers.get('Content-Type') != 'application/json':
                raise ValueError()
            data = json.loads(self.rfile.read(size))
            name, phone = data['name'].strip(), data['phone'].strip()
            when = datetime.strptime(data['date'] + ' ' + data['time'], '%Y-%m-%d %H:%M').replace(tzinfo=ZoneInfo('Europe/Madrid'))
            now = datetime.now(ZoneInfo('Europe/Madrid'))
            if not (1 <= len(name) <= 80 and re.fullmatch(r'[+0-9 ()-]{7,24}', phone) and type(data['people']) is int and 1 <= data['people'] <= 8 and data['consent'] is True and now < when < now + timedelta(days=180)):
                raise ValueError()
        except (ValueError, KeyError, TypeError, AttributeError):
            return self.reply(400, {'error': 'Revisa nombre, teléfono, fecha futura y consentimiento (máximo 180 días).'})
        reference = 'SEN-' + secrets.token_hex(5).upper()
        with sqlite3.connect(DB, timeout=10) as db:
            db.execute('BEGIN IMMEDIATE')
            # Limitar duplicados por teléfono y fecha; evita solicitudes repetidas por reintentos.
            existing = db.execute('SELECT reference FROM requests WHERE phone=? AND day=? AND time=?', (phone, data['date'], data['time'])).fetchone()
            if existing:
                return self.reply(200, {'reference': existing[0], 'status': 'pending'})
            count = db.execute('SELECT count(*) FROM requests WHERE created > ?', ((now-timedelta(hours=1)).isoformat(),)).fetchone()[0]
            if count >= 60:
                return self.reply(429, {'error': 'Demasiadas solicitudes. Contacta por teléfono.'})
            db.execute('INSERT INTO requests VALUES (?,?,?,?,?,?,?,?)', (reference, name, phone, data['date'], data['time'], data['people'], 'pending', now.isoformat()))
        self.reply(201, {'reference': reference, 'status': 'pending'})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=3003)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    print(f'Sensación: puerto {args.port}; solicitudes activadas: {ENABLED}', flush=True)
    ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=str(ROOT))).serve_forever()
