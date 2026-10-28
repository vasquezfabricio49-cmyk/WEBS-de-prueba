"""Export Shalom as a drag-and-drop Netlify demo without a Python backend."""
import argparse
import json
from pathlib import Path
import re
import shutil
import zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',default=str(root/'dist/shalom-netlify'))
parser.add_argument('--zip',default=str(root.parent/'shalom-netlify.zip'))
args=parser.parse_args()
out=Path(args.output).resolve()
if out==root or root in out.parents and 'dist' not in out.relative_to(root).parts:
    raise RuntimeError('Export into dist or an external output folder, not the source tree')
out.mkdir(parents=True,exist_ok=True)
assets=out/'assets';assets.mkdir(exist_ok=True)
for filename in ['clinic.js','experience.js','luxury.css','premium.css','manage.js','shalom-sculpture.webp','shalom-services-a.webp','shalom-services-b.webp','shalom-space.webp']:
    shutil.copy2(root/'assets'/filename,assets/filename)
shutil.copytree(root/'assets/fonts',assets/'fonts',dirs_exist_ok=True)
shutil.copy2(root/'src/netlify-browser-demo.js',assets/'browser-demo.js')
data=json.loads((root/'assets/catalog.json').read_text())
(assets/'catalog.json').write_text(json.dumps({'shalom':data['shalom']},ensure_ascii=False))
local_note='<strong>Demo en este navegador.</strong> Las solicitudes se guardan solo en tu dispositivo. No hay agenda compartida entre personas o dispositivos, no se envían mensajes al centro y no se confirma ninguna cita real. Usa datos ficticios.'
for filename in ['index.html','reserva.html','privacidad.html']:
    html=(root/'shalom-beauty-clinique'/filename).read_text()
    html=html.replace('../assets/','assets/')
    html=html.replace('</head>','<script src="assets/browser-demo.js"></script></head>')
    html=html.replace('<a href="admin.html">Panel de agenda</a> · ','')
    html=html.replace('<a href="../">El estudio Tap & Go</a>','<a href="https://tapandgoweb.com/" target="_blank" rel="noopener noreferrer">El estudio Tap & Go</a>')
    html=re.sub(r'(<div class="demo-note" id="booking-mode">).*?(</div>)',lambda match:match[1]+local_note+match[2],html,flags=re.S)
    html=html.replace('Esta demo guarda los datos en su propia agenda y no envía correos, SMS ni mensajes a Shalom.','Esta demo guarda los datos solo en este navegador. No hay una agenda compartida ni se envían mensajes a Shalom.')
    html=html.replace('Guarda el enlace de gestión: es privado y permite consultar o cancelar tu solicitud. No se envía por correo.','Guarda el enlace para consultar o cancelar tu solicitud en este mismo navegador. No funcionará en otro dispositivo y no se envía por correo.')
    html=html.replace('Una cabina. Tiempo entre sesiones. Cuidado sin prisas.','Una cabina simulada. Tiempo entre sesiones. Cuidado sin prisas.')
    html=html.replace('Se guarda en la agenda de prueba; no se envían mensajes al centro ni se confirma una cita real.','Se guarda solo en este navegador: no hay agenda compartida entre dispositivos, no se envían mensajes al centro ni se confirma una cita real.')
    html=html.replace('Consulta o cancela tu solicitud desde este enlace privado.','Consulta o cancela tu solicitud desde el mismo navegador donde la creaste.')
    html=html.replace('Agenda de demostración. Esta solicitud no se comunica al centro y no equivale a una cita real.','Demo local en este navegador. No se comparte entre dispositivos, no se comunica al centro y no equivale a una cita real.')
    (out/filename).write_text(html)
privacy=(out/'privacidad.html').read_text()
privacy=privacy.replace('en la base de datos del servidor que ejecuta esta propuesta','en el almacenamiento local del navegador que utilizas')
privacy=privacy.replace('Quien tenga la clave de administración de esta instalación y quien tenga el enlace privado de gestión de su solicitud.','Quien utilice este perfil del navegador en este dispositivo. No existe administración compartida. El enlace de gestión sirve únicamente en el navegador que contiene la solicitud.')
privacy=privacy.replace('Las solicitudes se conservan mientras se utiliza esta instalación de demostración. Cancelar una solicitud libera la hora pero no borra su registro. El operador de la demo puede eliminar los registros y su base de datos.','Las solicitudes se conservan en este navegador hasta borrar los datos del sitio. Cancelar libera la hora dentro de esta demo, pero no borra su registro. Puedes eliminar todos los registros borrando el almacenamiento local del sitio desde tu navegador.')
(out/'privacidad.html').write_text(privacy)
# Additional context after a successful local-only save.
p=assets/'clinic.js';s=p.read_text().replace("Pendiente de confirmación · no es una cita real`", "Guardada solo en este navegador · no es una cita real`")
p.write_text(s)
(out/'_headers').write_text('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'
''')
(out/'netlify.toml').write_text('[build]\n  publish = "."\n')
(out/'LEEME.txt').write_text('SHALOM — EXPORTACIÓN PARA NETLIFY DROP\nArrastra este ZIP a la zona de nuevo proyecto de Netlify. Esta carpeta contiene solo Shalom, con recursos locales. No requiere Node ni Python.\nLa agenda es una demo de navegador: no usa servidor, no comparte disponibilidad entre dispositivos y no realiza citas reales. Utiliza datos ficticios. El paquete completo Python/SQLite sigue disponible para un despliegue con backend.\nDespués de publicar, abre Domain management, añade shalom.tapandgoweb.com y usa exactamente los registros que indique Netlify. No reutilices el CNAME de ChatGPT Site.\n')
with zipfile.ZipFile(args.zip,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for p in sorted(out.rglob('*')):
        if p.is_file():archive.write(p,p.relative_to(out))
print('Export ready:',args.zip)
