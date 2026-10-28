"""Package a portable static site and a self-contained HTML preview. No deployment."""
from pathlib import Path
import base64
import json
import zipfile

root=Path(__file__).resolve().parents[1]
r=root/'el-budares' if (root/'el-budares').is_dir() else root
def uri(path,mime):return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
html=(r/'index.html').read_text()
css=(r/'assets/budares.css').read_text()
for file in ['display.ttf','interface.ttf']:
 css=css.replace("url('fonts/"+file+"')","url('"+uri(r/'assets/fonts'/file,'font/ttf')+"')")
photos=['menu-a','menu-b','menu-c']
css+='\n:root{'+''.join('--photo-'+name+':url("'+uri(r/'assets'/(name+'.webp'),'image/webp')+'");' for name in photos)+'}'
for name in photos:html=html.replace("background-image:url('assets/"+name+".webp')",'background-image:var(--photo-'+name+')')
for name in ['hero-burger','hero-cachapa']:html=html.replace('assets/'+name+'.webp',uri(r/'assets'/(name+'.webp'),'image/webp'))
html=html.replace('<link rel="preload" href="assets/fonts/display.ttf" as="font" type="font/ttf" crossorigin>','')
html=html.replace('<link rel="stylesheet" href="assets/budares.css">','<style>'+css+'</style>')
data=json.loads((r/'assets/menu.json').read_text())
bootstrap='window.BUDARES_MENU='+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+';'
bootstrap+='window.BUDARES_IMAGES=Object.fromEntries('+json.dumps(photos)+'.map(name=>{const value=getComputedStyle(document.documentElement).getPropertyValue("--photo-"+name).trim();return [name,value.slice(4,-1).replace(/^[\'"]|[\'"]$/g,"")]}));'
script=(r/'assets/budares.js').read_text().replace('</script','<\\/script')
html=html.replace('<script type="module" src="assets/budares.js"></script>','<script>'+bootstrap+'</script><script type="module">'+script+'</script>')
preview=root.parent/'el-budares.html';preview.write_text(html)
archive=root.parent/'el-budares-completo.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(r.rglob('*')):
  if p.is_file() and '__pycache__' not in p.parts:z.write(p,p.relative_to(r))
 with_source=[Path(__file__).resolve().with_name('render_budares.py'),Path(__file__).resolve()]
 for p in with_source:z.write(p,'development/'+p.name)
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print('HTML preview:',preview,round(preview.stat().st_size/1e6,2),'MB')
print('Portable ZIP:',archive,round(archive.stat().st_size/1e6,2),'MB')
