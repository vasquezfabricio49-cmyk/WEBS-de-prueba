"""Prepare the persistent volume, then run the app as an unprivileged user."""
import os
from pathlib import Path
import sys

root=Path(__file__).resolve().parent
storage=Path(os.environ.get('SHALOM_DATA_DIR','/var/data/shalom')).resolve()
if storage == Path('/') or storage == root or root in storage.parents:
    raise RuntimeError('Booking data must live outside the public application folder')
storage.mkdir(mode=0o700,parents=True,exist_ok=True)
if os.getuid() == 0:
    # Only this app's directory and known SQLite files; never change the whole disk.
    os.chown(storage,10001,10001)
    os.chmod(storage,0o700)
    for name in ['appointments.sqlite3','appointments.sqlite3-wal','appointments.sqlite3-shm']:
        file=storage/name
        if file.exists() and not file.is_symlink():os.chown(file,10001,10001)
    os.setgroups([])
    os.setgid(10001)
    os.setuid(10001)
os.chdir(root)
os.execv(sys.executable,[sys.executable,str(root/'server.py'),'--port',os.environ.get('PORT','3000')])
