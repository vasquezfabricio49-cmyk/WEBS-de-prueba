"""End-to-end API checks against an isolated database, no clinic data."""
import concurrent.futures
import datetime as dt
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temp:
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 token=secrets.token_hex(24)
 env={**os.environ,'SHALOM_DATA_DIR':temp,'SHALOM_ADMIN_TOKEN':token,'SHALOM_BOOKING_MODE':'demo'}
 proc=subprocess.Popen(['python3',str(ROOT/'server.py'),'--host','127.0.0.1','--port',str(port)],env=env,stdout=subprocess.DEVNULL)
 base=f'http://127.0.0.1:{port}'
 def req(path,data=None,auth=None,extra=None):
  headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+auth} if auth else {}),**(extra or {})}
  try:
   with urllib.request.urlopen(urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers=headers),timeout=10) as response:return response.status,json.load(response)
  except urllib.error.HTTPError as exc:return exc.code,json.load(exc)
 try:
  for _ in range(100):
   try:code,cfg=req('/api/config');break
   except OSError:time.sleep(.03)
  assert code==200 and cfg['mode']=='demo'
  assert req('/api/admin/bookings')[0]==401
  service=cfg['services'][0]['id']
  today=dt.date.fromisoformat(cfg['today'])
  for n in range(1,8):
   day=(today+dt.timedelta(days=n)).isoformat();code,slots=req('/api/availability?service='+service+'&date='+day)
   if slots['slots']:break
  body={'service':service,'date':day,'time':slots['slots'][0]['time'],'name':'Demo Test','email':'demo@example.com','phone':'+34 600 000 000','consent':True,'idempotency':secrets.token_hex(16),'managementKey':secrets.token_hex(32)}
  code,booking=req('/api/bookings',body);assert code==201,(code,booking)
  assert req('/api/bookings',body)[0]==200
  assert req('/api/bookings/'+booking['id'])[0]==404
  assert req('/api/bookings/'+booking['id'],auth=body['managementKey'])[0]==200
  conflict={**body,'idempotency':secrets.token_hex(16),'managementKey':secrets.token_hex(32)}
  assert req('/api/bookings',conflict)[0]==409
  assert req('/api/bookings/'+booking['id']+'/cancel',{},body['managementKey'])[0]==200
  def race(_):return req('/api/bookings',{**body,'idempotency':secrets.token_hex(16),'managementKey':secrets.token_hex(32)})[0]
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(race,range(2)))==[201,409]
  assert req('/api/bookings',{**body,'consent':False})[0]==400
  assert req('/api/bookings',body,extra={'Origin':'https://untrusted.example'})[0]==400
  code,rows=req('/api/admin/bookings',auth=token);assert code==200 and len(rows['bookings'])==2
  pending=next(b for b in rows['bookings'] if b['status']=='pending')
  assert req('/api/admin/bookings/'+pending['id'],{'status':'confirmed'},token)[0]==200
  with urllib.request.urlopen(urllib.request.Request(base+'/',headers={'Host':'shalom.tapandgoweb.com'})) as f:assert b'SHALOM' in f.read()
  with urllib.request.urlopen(urllib.request.Request(base+'/',headers={'Host':'esthetica.tapandgoweb.com'})) as f:assert b'esthetica' in f.read()
  print('PASS: availability, persistence, idempotency, authentication, cancellation, concurrent collision, consent, origin validation, admin confirmation, two domain routes (15 checks)')
 finally:proc.terminate();proc.wait(timeout=10)
