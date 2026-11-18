/* Production flow is enabled only by an explicitly configured connection. */
(()=>{'use strict';const B=window.AmanecerBackend,form=document.querySelector('#booking');if(!B||!form)return;
 let token='',widget,key='',lastPayload='';
 const result=document.querySelector('#result'),submit=form.querySelector('[type=submit]');
 B.policyReady.then(()=>{if(!B.enabled)return;
  form.querySelector('.fine').textContent='Reserva tu mesa. Recibirás la confirmación y un enlace para gestionarla por correo.';
  document.querySelector('#booking-mode').textContent='Antelación mínima: '+B.policy.minimumNoticeMinutes+' minutos. Duración de mesa: '+B.policy.mealDurationMinutes+' minutos. Grupos de 2 a 6 personas.';
  if(!B.policy.enabled){submit.disabled=true;result.textContent='Las reservas online aún no están activadas. Contacta por teléfono.';return}
  form.elements.email.required=true;form.elements.email.parentElement.firstChild.textContent='Correo electrónico';form.elements.email.placeholder='Aquí recibirás tu confirmación';
  form.elements.people.replaceChildren(...[2,3,4,5,6].map(n=>new Option(String(n),String(n))));
  const consent=form.querySelector('.consent span');consent.replaceChildren(document.createTextNode('He leído la información de privacidad y acepto recibir los avisos necesarios para gestionar mi reserva.'));
  const privacy=document.createElement('a');privacy.href='privacidad.html';privacy.textContent=' Información de privacidad';consent.append(privacy);
  document.querySelector('#reservas>div>p:not(.eyebrow)').textContent='Tu reserva se confirma automáticamente cuando hay una mesa disponible.';
  submit.firstChild.textContent='Reservar mesa ';submit.disabled=true;
  const box=document.createElement('div');submit.before(box);
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
  script.onload=()=>{widget=window.turnstile.render(box,{sitekey:B.config.turnstileSiteKey,action:'reservation',callback:t=>{token=t;submit.disabled=false},'expired-callback':()=>{token='';submit.disabled=true},'error-callback':()=>{token='';submit.disabled=true;result.textContent='No se pudo cargar la comprobación de seguridad. Recarga la página.'}})};
  script.onerror=()=>{result.textContent='No se pudo cargar la comprobación de seguridad. Recarga la página.'};document.head.append(script);
 }).catch(()=>{submit.disabled=true;result.textContent='No se ha podido comprobar el servicio de reservas. Contacta por teléfono.'});
 form.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  try{await B.policyReady;if(!B.enabled){form.onsubmit?.(e);return}if(!B.policy.enabled)throw Error('CONFIGURATION_REQUIRED');
   if(!form.reportValidity()||!token)return;
   const d=Object.fromEntries(new FormData(form)),times=window.AmanecerBookingRules.candidates(d.date,d.time);
   if(times.length!==1||!window.AmanecerBookingRules.meetsNotice(d.date,d.time))throw Error('NOTICE_REQUIRED');
   const payload={name:d.name.trim(),phone:d.phone.trim(),email:d.email.trim(),people:Number(d.people),start:new Date(times[0]).toISOString(),consent:true};
   const serialized=JSON.stringify(payload);if(lastPayload!==serialized){key=crypto.randomUUID();lastPayload=serialized}
   submit.disabled=true;result.textContent='Comprobando tu mesa…';
   const response=await B.book({...payload,key,token});
   result.textContent='Reserva confirmada. Referencia: '+response.reservation.reservation_id+'. Los avisos por correo están preparados para su envío.';
   const note=document.createElement('p');note.textContent='Si el correo tarda, revisa spam. Conserva esta referencia.';result.append(note);form.reset();key='';lastPayload='';
  }catch(error){result.textContent=B.friendly(error)}finally{if(B.enabled){token='';submit.disabled=true;if(widget!==undefined)window.turnstile?.reset(widget)}}
 },true);
})();

