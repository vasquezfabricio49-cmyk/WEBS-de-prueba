/* Shared services. No private keys belong in this file or connection.json. */
(()=>{'use strict';
 const editor=location.pathname.endsWith('/editor.html');
 const B=window.AmanecerBackend={enabled:false,site:null,revision:0,bookings:[],token:'',config:null};
 const errors={REVISION_CONFLICT:'Otra persona ha guardado cambios. Recarga antes de editar.',NO_AVAILABILITY:'No queda una mesa para ese horario.',NOTICE_REQUIRED:'Reserva con al menos 2 horas de antelación.',OUTSIDE_OPENING_HOURS:'Ese horario no permite completar las 2 horas de mesa.',CONFIGURATION_REQUIRED:'Las reservas aún no están activadas.',INVALID_ACTION:'Esta reserva ya no admite ese cambio.',FORBIDDEN:'No tienes permiso para acceder.',BOT_CHECK_FAILED:'Repite la comprobación de seguridad.',TRY_LATER:'Demasiados intentos. Espera unos minutos.',INVALID_INPUT:'Revisa los datos del formulario.'};
 const friendly=e=>errors[e?.message]||'No se ha podido completar la operación. Inténtalo de nuevo.';B.friendly=friendly;
 async function api(path,body,method='POST',staff=false){
  if(!B.config)throw Error('CONFIGURATION_REQUIRED');
  const r=await fetch(B.config.supabaseUrl+path,{method,headers:{apikey:B.config.publishableKey,...(staff?{Authorization:'Bearer '+B.token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const text=await r.text();let data;try{data=text?JSON.parse(text):null}catch{throw Error('SERVICE_UNAVAILABLE')}
  if(!r.ok)throw Error(data?.error||data?.message||'SERVICE_UNAVAILABLE');return data;
 }
 B.api=api;
 B.ready=fetch('connection.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('SERVICE_UNAVAILABLE');return r.json()}).then(c=>{
  if(c.enabled!==true)return;
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.supabaseUrl)||typeof c.publishableKey!=='string'||!c.publishableKey||!c.turnstileSiteKey)throw Error('CONFIGURATION_REQUIRED');
  if(c.publishableKey.startsWith('sb_secret_'))throw Error('CONFIGURATION_REQUIRED');
  if(c.publishableKey.startsWith('eyJ')){try{const claim=JSON.parse(atob(c.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claim.role!=='anon')throw Error()}catch{throw Error('CONFIGURATION_REQUIRED')}}
  B.config=c;B.enabled=true;
 });
 B.ready.catch(()=>{});
 B.policyReady=B.ready.then(async()=>{if(!B.enabled)return;B.policy=await api('/rest/v1/rpc/read_booking_policy',{});if(window.AmanecerBookingRules)window.AmanecerBookingRules.minimumNoticeMinutes=B.policy.minimumNoticeMinutes;return B.policy});
 B.policyReady.catch(()=>{});
 let authPromise,loadPromise;
 async function login(){if(authPromise)return authPromise;
  authPromise=new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='connection-login';dialog.setAttribute('aria-labelledby','login-title');
   dialog.innerHTML='<form><h2 id="login-title">Tu restaurante, en un solo lugar.</h2><p>Accede con el correo autorizado de administración.</p><label>Correo electrónico<input name="email" type="email" autocomplete="email" required></label><label hidden>Código del correo<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}"></label><button type="submit">Recibir código de acceso</button><p role="status"></p></form>';
   document.body.append(dialog);dialog.showModal();dialog.addEventListener('cancel',e=>e.preventDefault());
   const form=dialog.querySelector('form'),status=form.querySelector('[role=status]'),button=form.querySelector('button');let sent=false;
   form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{
    const email=form.elements.email.value.trim();
    if(!sent){await api('/auth/v1/otp',{email,create_user:false});sent=true;form.elements.email.readOnly=true;form.elements.code.parentElement.hidden=false;form.elements.code.required=true;button.textContent='Entrar al panel';status.textContent='Introduce el código que has recibido por correo.';form.elements.code.focus()}
    else{const session=await api('/auth/v1/verify',{email,token:form.elements.code.value.trim(),type:'email'});B.token=session.access_token;
     const staff=await api('/rest/v1/restaurant_staff?select=user_id',undefined,'GET',true);if(!staff?.length){B.token='';throw Error('FORBIDDEN')}
     dialog.close();dialog.remove();resolve();
     setTimeout(()=>{B.token='';location.reload()},Math.max(60000,((session.expires_in||3600)-30)*1000));
     const logout=document.createElement('button');logout.textContent='Cerrar sesión';logout.onclick=()=>{B.token='';location.reload()};document.querySelector('.sidebar')?.append(logout);
    }
   }catch(e){B.token='';status.textContent=friendly(e)}finally{button.disabled=false}};
  });return authPromise;
 }
 B.loadSite=async(force=false)=>{await B.ready;if(!B.enabled)return null;if(editor)await login();if(loadPromise&&!force)return loadPromise;
  loadPromise=api('/rest/v1/site_documents?select=document,revision&id=eq.true',undefined,'GET').then(rows=>{if(rows?.[0]){B.site=rows[0].document;B.revision=rows[0].revision}return B.site});return loadPromise;
 };
 B.upload=async file=>{
  await B.ready;if(!B.enabled||!B.token)throw Error('FORBIDDEN');
  const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
  const ext=extensions[file.type];if(!ext||file.size>50*1024*1024)throw Error('INVALID_INPUT');
  const name=crypto.randomUUID()+'.'+ext;
  const r=await fetch(B.config.supabaseUrl+'/storage/v1/object/restaurant-media/'+name,{method:'POST',headers:{apikey:B.config.publishableKey,Authorization:'Bearer '+B.token,'Content-Type':file.type},body:file,signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error('SERVICE_UNAVAILABLE');return B.config.supabaseUrl+'/storage/v1/object/public/restaurant-media/'+name;
 };
 B.saveSite=async site=>{
  await B.loadSite();const copy=structuredClone(site);
  async function uploadEmbedded(node){for(const k of Object.keys(node)){const value=node[k];if(typeof value==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(value)){node[k]=await B.upload(await(await fetch(value)).blob())}else if(value&&typeof value==='object')await uploadEmbedded(value)}}
  await uploadEmbedded(copy);B.revision=await api('/rest/v1/rpc/publish_site',{p_document:copy,p_revision:B.revision},'POST',true);B.site=copy;dispatchEvent(new Event('amanecer:site-change'));
 };
 B.refreshBookings=async()=>{
  await B.loadSite();if(!B.enabled)return;
  const rows=await api('/rest/v1/reservations?select=id,customer_name,phone,email,people,starts_at,status&order=starts_at.desc&limit=500',undefined,'GET',true);
  B.bookings=rows.map(r=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(r.starts_at)).map(x=>[x.type,x.value]));return {reference:r.id,name:r.customer_name,phone:r.phone,email:r.email,people:r.people,date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute,status:r.status}});
  dispatchEvent(new Event('amanecer:bookings-change'));
 };
 B.cancel=async id=>{await api('/rest/v1/rpc/staff_cancel_booking',{p_id:id},'POST',true);await B.refreshBookings()};
 async function operationControls(){
  const host=document.querySelector('#bookings');const settings=document.createElement('form');settings.className='surface';
  settings.innerHTML='<h3>Reglas de las mesas</h3><label>Antelación mínima (minutos)<input name="notice" type="number" min="120" max="10080" required></label><label>Duración de la mesa (minutos)<input name="duration" type="number" min="30" max="360" required></label><button type="submit">Guardar reglas</button><p role="status"></p>';
  const config=(await api('/rest/v1/restaurant_settings?select=minimum_notice_minutes,meal_duration_minutes&id=eq.true',undefined,'GET',true))[0];settings.elements.notice.value=config.minimum_notice_minutes;settings.elements.duration.value=config.meal_duration_minutes;host.append(settings);
  settings.onsubmit=async e=>{e.preventDefault();const message=settings.querySelector('[role=status]'),button=settings.querySelector('button');button.disabled=true;try{await api('/rest/v1/restaurant_settings?id=eq.true',{minimum_notice_minutes:Number(settings.elements.notice.value),meal_duration_minutes:Number(settings.elements.duration.value)},'PATCH',true);message.textContent='Reglas actualizadas. Se aplicarán a las nuevas reservas y cambios.'}catch(e){message.textContent=friendly(e)}finally{button.disabled=false}};
  const delivery=document.createElement('section');delivery.className='surface';host.append(delivery);
  async function notices(){try{const rows=await api('/rest/v1/notification_outbox?select=id,state,attempts,reservation_id&state=neq.delivered&order=created_at.desc&limit=50',undefined,'GET',true);delivery.replaceChildren();const heading=document.createElement('h3');heading.textContent='Avisos por correo';delivery.append(heading);if(!rows.length){const p=document.createElement('p');p.textContent='No hay avisos pendientes.';delivery.append(p)}for(const r of rows){const p=document.createElement('p');p.textContent=r.reservation_id+' · '+(r.state==='failed'?'Envío pendiente de reintento':'Pendiente de entrega');delivery.append(p);if(r.state==='failed'){const retry=document.createElement('button');retry.textContent='Reintentar aviso';retry.onclick=async()=>{retry.disabled=true;try{await api('/rest/v1/rpc/retry_booking_notice',{p_id:r.id},'POST',true);await notices()}catch(e){p.textContent=friendly(e);retry.disabled=false}};delivery.append(retry)}}}catch{delivery.textContent='No se ha podido comprobar la entrega de avisos.'}}
  await notices();setInterval(()=>{if(!document.hidden)notices()},30000);
 }
 B.book=async data=>api('/functions/v1/book',data);
 B.manage=async data=>api('/functions/v1/manage',data);
 B.ready.then(()=>{if(B.enabled&&!editor)setInterval(async()=>{if(document.hidden)return;try{const before=JSON.stringify(B.site);await B.loadSite(true);if(JSON.stringify(B.site)!==before)dispatchEvent(new Event('amanecer:site-change'))}catch{}},30000)}).catch(()=>{});
 if(editor)B.ready.then(async()=>{if(!B.enabled)return;await login();await B.refreshBookings();
  document.querySelector('.local-demo-notice').hidden=true;
  document.querySelector('.sidebar>p').textContent='Administración privada · Datos compartidos';
  document.querySelector('#bookings .section-heading p').textContent='Reservas compartidas. Al cancelar se libera la mesa y se preparan los avisos por correo.';
  document.querySelector('#customers .section-heading p').textContent='Contactos de las reservas del restaurante.';
  document.querySelector('#content .section-heading p').textContent='Los cambios guardados se publican para todos los visitantes.';
  document.querySelector('.publish-instructions').hidden=true;document.querySelector('.quick [data-go=bookings] span').textContent='Consulta y gestiona las reservas compartidas.';
  document.querySelector('.backup>p').textContent='Exporta una copia de carta, textos y multimedia. Las reservas se protegen con las copias del servicio de base de datos.';
  document.querySelector('.backup>a').hidden=true;
  document.querySelector('#export').textContent='Exportar copia del contenido';
  document.querySelector('#export-content').textContent='Exportar textos y multimedia';
  document.querySelector('#export-catalog').textContent='Exportar carta';
  operationControls().catch(()=>{document.querySelector('#save-state').textContent='No se han podido cargar las reglas de reservas.'});
  const mediaNote=document.querySelector('.media-manager .hint');if(mediaNote)mediaNote.textContent='Guarda para publicar fotos, vídeos y textos para todos los visitantes.';
  setInterval(()=>{if(!document.hidden)B.refreshBookings().catch(()=>{document.querySelector('#save-state').textContent='No se han podido actualizar las reservas.'})},15000);
 }).catch(e=>{document.querySelector('#save-state').textContent=friendly(e);document.querySelectorAll('main button').forEach(b=>b.disabled=true)});
})();

