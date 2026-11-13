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
from threading import Lock

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('SENSACION_DATA_DIR', str(ROOT.parent.parent / 'sensacion-data'))).resolve()
if DATA == ROOT or ROOT in DATA.parents:
    raise RuntimeError('Los datos deben estar fuera del directorio público')
DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
DB = DATA / 'requests.sqlite3'
TOKEN = os.environ.get('SENSACION_ADMIN_TOKEN', '')
ENABLED = os.environ.get('SENSACION_ACCEPT_REQUESTS') == '1'
SITE_FILE = DATA / 'site-editor.json'
SITE_LOCK = Lock()
with sqlite3.connect(DB) as db:
    db.execute('CREATE TABLE IF NOT EXISTS requests (reference TEXT PRIMARY KEY, name TEXT, phone TEXT, day TEXT, time TEXT, people INTEGER, status TEXT, created TEXT)')
os.chmod(DB, 0o600)

class Handler(SimpleHTTPRequestHandler):
    def local_editor(self):
        return (self.client_address[0] in ('127.0.0.1', '::1')
                and urlsplit('http://' + self.headers.get('Host', '')).hostname in ('127.0.0.1', 'localhost')
                and self.headers.get('X-Sensacion-Editor') == '1')
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
        if path == '/api/site':
            with SITE_LOCK:
                try:
                    site = json.loads(SITE_FILE.read_text(encoding='utf-8'))
                except (FileNotFoundError, ValueError):
                    site = {'version': 1, 'menu': json.loads((ROOT / 'catalog.json').read_text(encoding='utf-8')), 'content': {}}
            return self.reply(200, site)
        if path == '/api/status':
            return self.reply(200, {'reservations': ENABLED})
        if path == '/api/reservations':
            supplied = self.headers.get('Authorization', '')
            if not self.local_editor() and (len(TOKEN) < 24 or not hmac.compare_digest(supplied, 'Bearer ' + TOKEN)):
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
        if Path(path).suffix.lower() not in {'.html', '.css', '.js', '.jpg', '.jpeg', '.webp', '.png', '.svg', '.woff2', '.ttf', '.json'}:
            return self.reply(404, {'error': 'Ruta inexistente'})
        super().do_GET()

    def do_PUT(self):
        if urlsplit(self.path).path != '/api/site':
            return self.reply(404, {'error': 'Ruta inexistente'})
        # This presentation editor is intentionally confined to this computer.
        origin = urlsplit(self.headers.get('Origin', ''))
        host = self.headers.get('Host', '')
        if self.client_address[0] not in ('127.0.0.1', '::1') or origin.netloc != host or origin.hostname not in ('127.0.0.1', 'localhost') or self.headers.get('X-Sensacion-Editor') != '1':
            return self.reply(403, {'error': 'La edición solo está disponible desde la vista previa local'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 5 * 1024 * 1024:
                raise ValueError()
            site = json.loads(self.rfile.read(size))
            menu, content = site['menu'], site.get('content', {})
            if site.get('version') != 1 or not isinstance(menu, list) or len(menu) > 200 or not isinstance(content, dict):
                raise ValueError()
            ids = set()
            for dish in menu:
                if not re.fullmatch(r'[-a-zA-Z0-9]{1,100}', dish['id']) or dish['id'] in ids:
                    raise ValueError()
                ids.add(dish['id'])
                for field, limit in [('name', 100), ('description', 1000), ('category', 80)]:
                    if not isinstance(dish[field], str) or not 0 < len(dish[field]) <= limit:
                        raise ValueError()
                if isinstance(dish['price'], bool) or not isinstance(dish['price'], (int, float)) or not 0 <= dish['price'] <= 10000:
                    raise ValueError()
                if not isinstance(dish['image'], str) or not re.match(r'^(images/[-a-zA-Z0-9_.]+\.(?:webp|png|jpe?g|svg)$|data:image/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$|https://[^\s"<>]+$)', dish['image']):
                    raise ValueError()
            if any(not isinstance(k, str) or not isinstance(v, str) or len(k) > 80 or len(v) > 2 * 1024 * 1024 for k, v in content.items()):
                raise ValueError()
            public = {'version': 1, 'menu': menu, 'content': content}
            with SITE_LOCK:
                temp = SITE_FILE.with_suffix('.tmp')
                temp.write_text(json.dumps(public, ensure_ascii=False, allow_nan=False), encoding='utf-8')
                temp.replace(SITE_FILE)
            return self.reply(200, {'saved': True})
        except (ValueError, TypeError, KeyError, OSError):
            return self.reply(400, {'error': 'Los datos no se pudieron guardar. Revisa los campos y las fotografías.'})

    def do_PATCH(self):
        match = re.fullmatch(r'/api/reservations/(SEN-[A-F0-9]{10})', self.path)
        if not match:
            return self.reply(404, {'error': 'Ruta inexistente'})
        if not self.local_editor() and (len(TOKEN) < 24 or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN)):
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
