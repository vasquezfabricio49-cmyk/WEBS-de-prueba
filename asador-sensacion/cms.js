/* Local presentation CMS. It never grants access to server reservations. */
(()=>{
 const key='sensacion-editor-v1';
 const image=value=>typeof value==='string'&&(/^(images\/[a-z0-9_.-]+\.(webp|png|jpe?g|svg))$/i.test(value)||/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)||/^https:\/\/[^\s"<>]+$/i.test(value));
 const valid=data=>data&&data.version===1&&Array.isArray(data.menu)&&data.menu.length<=200&&new Set(data.menu.map(d=>d.id)).size===data.menu.length&&data.menu.every(d=>typeof d.id==='string'&&/^[-a-z0-9]+$/i.test(d.id)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=100&&typeof d.description==='string'&&d.description.length<=1000&&typeof d.category==='string'&&d.category.length<=80&&Number.isFinite(d.price)&&d.price>=0&&d.price<=10000&&image(d.image));
 const fields=[
  ['notice','Aviso superior','.notice'],['hero-title','Título de portada','#hero-title'],['hero-copy','Texto de portada','.hero-copy>p:not(.eyebrow)'],
  ['country-title','Título de raíces','#country-title'],['country-copy-1','Raíces: primer párrafo','.country-copy>p:not(.eyebrow)'],['country-copy-2','Raíces: segundo párrafo','.country-copy>p:not(.eyebrow):last-of-type'],
  ['intro-title','Título de nuestra cocina','#casa h2'],['intro-lead','Presentación de la cocina','#casa .lead'],['intro-copy','Historia de la cocina','#casa .intro-grid>div>p:not(.lead)'],
  ['menu-title','Título de la carta','#carta h2'],['menu-copy','Introducción a la carta','#carta .section-head>p'],['quote','Frase de sobremesa','.quote-band h2'],
  ['booking-title','Título de reservas','#reservas h2'],['booking-copy','Información de reservas','#reservas>div>p:not(.eyebrow)'],
  ['visit-title','Título de ubicación','#visitanos h2'],['address','Dirección','#visitanos .lead'],['hours','Horario y servicio','#visitanos .intro-grid>div>p:not(.lead)']
 ];
 const read=()=>{try{const d=JSON.parse(localStorage.getItem(key));return valid(d)?d:null}catch{return null}};
 const write=async d=>{if(!valid(d))throw Error('Revisa los datos de la carta.');const response=await fetch('api/site',{method:'PUT',headers:{'Content-Type':'application/json','X-Sensacion-Editor':'1'},body:JSON.stringify({version:1,menu:d.menu,content:d.content||{}})});if(!response.ok)throw Error('El servidor no pudo guardar los cambios.');localStorage.setItem(key,JSON.stringify(d))};
 const apply=()=>{const d=read();if(!d)return;for(const [id,,selector] of fields){const el=document.querySelector(selector),value=d.content?.[id];if(el&&typeof value==='string'){el.textContent=value;el.style.whiteSpace='pre-line'}}
  if(d.content?.phone&&/^[+0-9 ()-]{7,24}$/.test(d.content.phone)){const a=document.querySelector('.booking-contact>a');if(a){a.textContent=d.content.phone+' ↗';a.href='tel:'+d.content.phone.replace(/[^+0-9]/g,'')}}
  if(image(d.content?.rootsImage)){document.querySelector('.country-art')?.style.setProperty('background-image',`url("${d.content.rootsImage}")`)}
  if(/^#[0-9a-f]{6}$/i.test(d.content?.accent||''))document.documentElement.style.setProperty('--gold',d.content.accent);
 };
 window.SensacionCMS={key,image,valid,fields,read,write,apply};
 if(document.querySelector('#hero-title'))apply();
})();
