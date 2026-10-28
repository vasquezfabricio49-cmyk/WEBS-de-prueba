"""Export Esthetica Latino as a standalone Netlify Drop website."""
import argparse
import json
from pathlib import Path
import shutil
import zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',default=str(root/'dist/esthetica-netlify'))
parser.add_argument('--zip',default=str(root.parent/'esthetica-netlify.zip'))
args=parser.parse_args()
out=Path(args.output).resolve()
if out==root or root in out.parents and 'dist' not in out.relative_to(root).parts:
    raise RuntimeError('Export into dist or an external output folder, not the source tree')
out.mkdir(parents=True,exist_ok=True)
assets=out/'assets';assets.mkdir(exist_ok=True)
for filename in ['clinic.js','experience.js','luxury.css','premium.css','latino-sculpture.webp','latino-services-a.webp','latino-services-b.webp','latino-services-c.webp','latino-hero.webp']:
    shutil.copy2(root/'assets'/filename,assets/filename)
shutil.copytree(root/'assets/fonts',assets/'fonts',dirs_exist_ok=True)
data=json.loads((root/'assets/catalog.json').read_text())
(assets/'catalog.json').write_text(json.dumps({'latino':data['latino']},ensure_ascii=False))
html=(root/'esthetica-latino/index.html').read_text().replace('../assets/','assets/')
html=html.replace('<a href="../">El estudio Tap & Go</a>','<a href="https://tapandgoweb.com/" target="_blank" rel="noopener noreferrer">El estudio Tap & Go</a>')
(out/'index.html').write_text(html)
(out/'_headers').write_text('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'
''')
(out/'netlify.toml').write_text('[build]\n  publish = "."\n')
(out/'LEEME.txt').write_text('ESTHETICA LATINO — NETLIFY DROP\nArrastra este ZIP a la zona de nuevo proyecto de Netlify. La web de Esthetica aparece en la raíz y todos los recursos están incluidos. No necesita Python ni Node.\nEl catálogo contiene 12 experiencias. Las citas se consultan por WhatsApp al contacto que aparece en el material del centro; no se realizan ni confirman reservas automáticamente.\nDespués de publicar, añade esthetica.tapandgoweb.com en la gestión de dominios del proyecto y utiliza exactamente los registros indicados por Netlify. Conserva intactos los DNS de otros proyectos.\n')
with zipfile.ZipFile(args.zip,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for p in sorted(out.rglob('*')):
        if p.is_file():archive.write(p,p.relative_to(out))
print('Export ready:',args.zip)
