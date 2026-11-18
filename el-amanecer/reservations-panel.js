/* Requests in this demonstration are local to the current browser. */
(()=>{
 const CMS=window.SensacionCMS,$=s=>document.querySelector(s);
 const statuses={pending:'Pendiente',confirmed:'Confirmada',rejected:'Rechazada',cancelled:'Cancelada'};
 let last='';
 const day=date=>new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeZone:'Europe/Madrid'}).format(new Date(date+'T12:00:00Z'));
 function render(rows){
  const bookings=$('#booking-list'),customers=$('#customer-list');bookings.replaceChildren();customers.replaceChildren();
  if(!rows.length){bookings.textContent=window.AmanecerBackend?.enabled?'Todavía no hay reservas.':'Todavía no hay solicitudes guardadas en este navegador. Prueba el formulario de la web.';customers.textContent=window.AmanecerBackend?.enabled?'Aquí aparecerán los contactos de las reservas.':'Aquí se agrupan las personas de las solicitudes locales, por teléfono. No hay una agenda compartida.'}
  for(const item of rows){
   const row=document.createElement('article'),info=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');row.className='record';h.textContent=item.name;p.textContent=`${day(item.date)} · ${item.time} · ${item.people} personas\n${item.phone}\n${item.reference}${window.AmanecerBackend?.enabled?'':' · Prueba local'}`;info.append(h,p);
   const select=document.createElement('select');select.setAttribute('aria-label','Estado local de solicitud de '+item.name);
   for(const [value,label] of Object.entries(statuses)){if(window.AmanecerBackend?.enabled&&value!==item.status&&value!=='cancelled')continue;const option=new Option(label,value);option.selected=value===item.status;select.append(option)}
   select.onchange=async()=>{select.disabled=true;try{await CMS.setBookingStatus(item.reference,select.value);$('#save-state').textContent=window.AmanecerBackend?.enabled?'● Reserva actualizada':'● Estado guardado en este navegador'}catch(error){select.value=item.status;$('#save-state').textContent=error.message}finally{select.disabled=false}};
   row.append(info,select);bookings.append(row);
  }
  const people=new Map();for(const r of rows){const key=r.phone.replace(/\D/g,'');if(!people.has(key))people.set(key,{name:r.name,phone:r.phone,count:0,last:r.date});people.get(key).count++}
  for(const person of people.values()){const row=document.createElement('article'),info=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');row.className='record';h.textContent=person.name;p.textContent=`${person.phone}\n${person.count} solicitud${person.count===1?'':'es'} local${person.count===1?'':'es'} · Última fecha: ${day(person.last)}`;info.append(h,p);row.append(info);customers.append(row)}
  const stats=document.querySelectorAll('#stats .stat');if(stats.length===4){stats[2].querySelector('span').textContent=window.AmanecerBackend?.enabled?'Reservas':'Solicitudes locales';stats[2].querySelector('strong').textContent=rows.length;stats[2].querySelector('small').textContent=window.AmanecerBackend?.enabled?'Compartidas':'Solo en este navegador';stats[3].querySelector('span').textContent='Personas';stats[3].querySelector('strong').textContent=people.size;stats[3].querySelector('small').textContent=window.AmanecerBackend?.enabled?'Contactos de reservas':'Solicitudes de prueba'}
 }
 function load(force=false){const rows=CMS.readBookings(),snapshot=JSON.stringify(rows);if(force||snapshot!==last){last=snapshot;render(rows)}}
 addEventListener('storage',event=>{if(event.key===CMS.bookingKey||event.key===null)load()});
 addEventListener('amanecer:bookings-change',()=>load(true));addEventListener('amanecer:panel-change',()=>load(true));addEventListener('focus',()=>load());
 load(true);
})();

