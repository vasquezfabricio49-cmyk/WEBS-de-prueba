/* GitHub Pages demo: settings and requests stay in this browser. */
(()=>{
 const key='amanecer-editor-carta20261114',bookingKey='amanecer-reservations-v1';
 const image=value=>typeof value==='string'&&(/^(images\/[a-z0-9_.-]+\.(webp|png|jpe?g|svg))$/i.test(value)||/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)||/^https:\/\/[^\s"<>]+$/i.test(value));
 const valid=data=>data&&data.version===1&&Array.isArray(data.menu)&&data.menu.length<=200&&data.menu.every(d=>d&&typeof d.id==='string'&&/^[-a-z0-9]{1,100}$/i.test(d.id)&&typeof d.name==='string'&&d.name.trim().length>0&&d.name.length<=100&&typeof d.description==='string'&&d.description.trim().length>0&&d.description.length<=1000&&typeof d.category==='string'&&d.category.trim().length>0&&d.category.length<=80&&(d.price===null||(Number.isFinite(d.price)&&d.price>=0&&d.price<=10000))&&image(d.image)&&(!d.image4k||image(d.image4k)))&&new Set(data.menu.map(d=>d.id)).size===data.menu.length;
 const fields=[
  ['notice','Aviso superior','.notice'],['hero-title','Título de portada','#hero-title'],['hero-copy','Texto de portada','.hero-copy>p:not(.eyebrow)'],
  ['country-title','Título de raíces','#country-title'],['country-copy-1','Raíces: primer párrafo','.country-copy>p:not(.eyebrow)'],['country-copy-2','Raíces: segundo párrafo','.country-copy>p:not(.eyebrow):last-of-type'],
  ['intro-title','Título de nuestra cocina','#casa h2'],['intro-lead','Presentación de la cocina','#casa .lead'],['intro-copy','Historia de la cocina','#casa .intro-grid>div>p:not(.lead)'],
  ['menu-title','Título de la carta','#carta h2'],['menu-copy','Introducción a la carta','#carta .section-head>p'],['quote','Frase de sobremesa','.quote-band h2'],['events-title','Título de celebraciones','#events-title'],['event-wedding','Bodas: texto','.event-card:nth-child(1) p:not(.eyebrow)'],['event-birthday','Cumpleaños: texto','.event-card:nth-child(2) p:not(.eyebrow)'],['event-cultural','Celebraciones: texto','.event-card:nth-child(3) p:not(.eyebrow)'],['karaoke-title','Título de karaoke','.karaoke-banner h3'],['karaoke-copy','Texto de karaoke','.karaoke-banner p'],
  ['booking-title','Título de reservas','#reservas h2'],['booking-copy','Información de reservas','#reservas>div>p:not(.eyebrow)'],
  ['visit-title','Título de ubicación','#visitanos h2'],['address','Dirección','#visitanos .lead'],['hours','Horario y servicio','#visitanos .intro-grid>div>p:not(.lead)']
 ];
 const read=()=>{try{const d=JSON.parse(localStorage.getItem(key));return valid(d)?d:null}catch{return null}};
 const write=async d=>{if(!valid(d))throw Error('Revisa los datos de la carta.');localStorage.setItem(key,JSON.stringify({version:1,menu:d.menu,content:d.content||{}}));dispatchEvent(new Event('amanecer:site-change'))};
 const original=new Map(fields.map(([id,,selector])=>[id,document.querySelector(selector)?.innerHTML]));
 const phone=document.querySelector('.booking-contact>a'),originalPhone=phone?{html:phone.innerHTML,href:phone.getAttribute('href')}:null;
 const apply=(d=read())=>{for(const [id,,selector] of fields){const el=document.querySelector(selector),value=d?.content?.[id];if(!el)continue;if(typeof value==='string'){el.textContent=value;el.style.whiteSpace='pre-line'}else if(original.has(id)){el.innerHTML=original.get(id);el.style.removeProperty('white-space')}}
  if(phone&&originalPhone){if(d?.content?.phone&&/^[+0-9 ()-]{7,24}$/.test(d.content.phone)){phone.textContent=d.content.phone+' ↗';phone.href='tel:'+d.content.phone.replace(/[^+0-9]/g,'')}else{phone.innerHTML=originalPhone.html;phone.setAttribute('href',originalPhone.href)}}
  const roots=document.querySelector('.country-art');if(roots){if(image(d?.content?.rootsImage))roots.style.setProperty('background-image',`url("${d.content.rootsImage}")`);else roots.style.removeProperty('background-image')}
  if(/^#[0-9a-f]{6}$/i.test(d?.content?.accent||''))document.documentElement.style.setProperty('--gold',d.content.accent);else document.documentElement.style.removeProperty('--gold');
 };
 const statuses=['pending','confirmed','rejected','cancelled'];
 const validBooking=b=>b&&typeof b.reference==='string'&&/^AMA-[A-Z0-9-]{1,60}$/.test(b.reference)&&typeof b.name==='string'&&b.name.trim().length>0&&b.name.length<=80&&typeof b.phone==='string'&&/^[+0-9 ()-]{7,24}$/.test(b.phone)&&b.phone.replace(/\D/g,'').length>=7&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&/^\d{2}:\d{2}$/.test(b.time)&&Number.isInteger(b.people)&&b.people>=1&&b.people<=30&&statuses.includes(b.status);
 const readBookings=()=>{try{const rows=JSON.parse(localStorage.getItem(bookingKey));return Array.isArray(rows)?rows.filter(validBooking).slice(0,500):[]}catch{return []}};
 const writeBookings=rows=>{if(!Array.isArray(rows)||rows.length>500||!rows.every(validBooking))throw Error('Revisa los datos de la solicitud.');localStorage.setItem(bookingKey,JSON.stringify(rows));dispatchEvent(new Event('amanecer:bookings-change'))};
 const addBooking=data=>{const rows=readBookings(),booking={reference:'AMA-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().slice(0,4).toUpperCase(),name:String(data.name||'').trim(),phone:String(data.phone||'').trim(),date:data.date,time:data.time,people:Number(data.people),status:'pending'};if(!validBooking(booking))throw Error('Revisa el nombre, teléfono y los datos de la mesa.');writeBookings([booking,...rows]);return booking};
 const setBookingStatus=(reference,status)=>{const rows=readBookings(),item=rows.find(b=>b.reference===reference);if(!item)throw Error('No se encuentra la solicitud en este navegador.');item.status=status;writeBookings(rows)};
 window.SensacionCMS={key,bookingKey,image,valid,fields,read,write,apply,readBookings,addBooking,setBookingStatus};
 if(document.querySelector('#hero-title'))apply();
})();
