"""Integration tests against a real isolated SQLite database and HTTP server."""
import concurrent.futures
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

ROOT = Path(__file__).resolve().parents[1]
checks = 0

def check(condition, label):
    global checks
    assert condition, label
    checks += 1

with tempfile.TemporaryDirectory(prefix='fusion-api-') as data:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    token = secrets.token_hex(24)
    process = None
    def request(path, body=None, key=None, method=None, origin=None):
        headers = {'Content-Type': 'application/json'}
        if key:
            headers['Authorization'] = 'Bearer ' + key
        if origin:
            headers['Origin'] = origin
        req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                content = response.read()
                return response.status, json.loads(content) if content else {}
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())
    def start():
        proc = subprocess.Popen(['python3', str(ROOT / 'server.py'), '--host', '127.0.0.1', '--port', str(port)], env={**os.environ, 'RESTAURANT_DATA_DIR': data, 'RESTAURANT_ADMIN_TOKEN': token}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            try:
                if request('/healthz')[0] == 200:
                    return proc
            except OSError:
                pass
            if proc.poll() is not None:
                raise AssertionError(proc.stderr.read().decode())
            time.sleep(.03)
        proc.terminate()
        raise AssertionError('Server did not start')
    try:
        process = start()
        _, config = request('/api/config')
        check(config['demo'] and len(config['menu']) == 4, 'central config with four dishes')
        for path in ['/', '/styles.css', '/app.js', '/images/chuleton.webp', '/interactive-menu/', '/admin.html', '/privacidad.html']:
            with urllib.request.urlopen(base + path) as response:
                check(response.status == 200 and response.read(), path)
        with urllib.request.urlopen(urllib.request.Request(base + '/', method='HEAD')) as response:
            check(response.status == 200 and not response.read(), 'HEAD has no body')
        check(request('/api/admin/reservations')[0] == 401, 'admin protected')
        check(request('/api/availability?date=2000-01-01')[0] == 400, 'past dates rejected')
        check(request('/api/availability?date=not-a-date')[0] == 400, 'invalid dates rejected')
        check(request('/api/availability?date=' + config['today'] + '&partySize=100')[0] == 400, 'large groups rejected')
        check(request('/config.json')[0] == 404, 'configuration file not directly exposed')
        day = None
        for n in range(1, 8):
            value = (date.fromisoformat(config['today']) + timedelta(days=n)).isoformat()
            _, availability = request('/api/availability?date=' + value + '&partySize=8')
            if availability['slots']:
                day, slot = value, availability['slots'][0]['time']
                break
        check(day is not None, 'future availability')
        def payload():
            return {'date': day, 'time': slot, 'partySize': 8, 'name': 'Cliente ficticio', 'email': 'demo@example.invalid', 'phone': '600000000', 'privacyAccepted': True, 'idempotencyKey': secrets.token_hex(16), 'accessKey': secrets.token_hex(32)}
        invalid = {**payload(), 'privacyAccepted': False}
        check(request('/api/reservations', invalid)[0] == 400, 'consent required')
        check(request('/api/reservations', payload(), origin='https://different.invalid')[0] == 400, 'foreign origin rejected')
        a, b = payload(), payload()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            responses = list(pool.map(lambda p: request('/api/reservations', p), [a, b]))
        check(sorted(code for code, _ in responses) == [201, 409], 'concurrent requests cannot exceed 12 seats')
        winner = 0 if responses[0][0] == 201 else 1
        saved = responses[winner][1]
        winning = [a, b][winner]
        path = '/api/reservations/' + saved['id']
        check(request(path)[0] == 404, 'private lookup protected')
        check(request(path, key=winning['accessKey'])[1]['status'] == 'confirmed', 'private lookup works')
        repeat = request('/api/reservations', winning)
        check(repeat[0] == 200 and repeat[1]['id'] == saved['id'], 'idempotent retry')
        check(request('/api/reservations', {**winning, 'name': 'Otro cliente'})[0] == 409, 'idempotency rejects changed payload')
        check(len(request('/api/admin/reservations', key=token)[1]['reservations']) == 1, 'one persistent reservation')
        process.terminate()
        process.wait(timeout=5)
        process = start()
        check(request(path, key=winning['accessKey'])[1]['status'] == 'confirmed', 'persists across server restart')
        check(request(path + '/cancel', {}, key=secrets.token_hex(32))[0] == 404, 'cancellation protected')
        check(request(path + '/cancel', {}, key=winning['accessKey'])[1]['status'] == 'cancelled', 'private cancellation')
        check(request(path + '/cancel', {}, key=winning['accessKey'])[1]['status'] == 'cancelled', 'cancellation is idempotent')
        check(request('/api/reservations', payload())[0] == 201, 'cancellation releases capacity')
        # Slot occupancy sweep handles non-overlapping partial intersections correctly.
        import importlib.util
        old_dir = os.environ.get('RESTAURANT_DATA_DIR')
        os.environ['RESTAURANT_DATA_DIR'] = data
        spec = importlib.util.spec_from_file_location('restaurant_server', ROOT / 'server.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with module.connection() as con:
            con.execute('DELETE FROM bookings')
            for i, (start_at, end_at) in enumerate([(100, 200), (200, 300)]):
                con.execute('INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', (str(i), 'hash', str(i), 'hash', start_at, end_at, 8, 'Test', 'demo@example.invalid', '600000000', 'confirmed', 'test'))
            check(module.used_capacity(con, 150, 250) == 8, 'capacity sweep counts concurrent occupancy only')
        if old_dir is None:
            del os.environ['RESTAURANT_DATA_DIR']
        else:
            os.environ['RESTAURANT_DATA_DIR'] = old_dir
        print(f'PASS API: {checks} checks, persistent SQLite, concurrency, idempotency, origin, privacy and cancellation')
    finally:
        if process:
            process.terminate()
            process.wait(timeout=5)
