/* Local demonstration only: no payment API, wallet API or financial data collection. */
(() => {
 const checkout=document.querySelector('#checkout-dialog');
 const pay=document.querySelector('#simulate-payment');
 const consent=document.querySelector('#payment-consent');
 const status=document.querySelector('#payment-status');
 const methods=[...document.querySelectorAll('[data-payment]')];
 let method='card',processing=false,completed=false,snapshot=[],receiptURL=null,timer=null;
 const labels={card:'Tarjeta ficticia',apple:'Apple Pay simulado',google:'Google Pay simulado'};
 const total=()=>snapshot.reduce((sum,item)=>sum+Math.round(item.price*100)*item.quantity,0)/100;
 const update=()=>{pay.disabled=processing||!consent.checked;pay.textContent=processing?'Simulando…':'Simular '+money(total())+' · '+labels[method];document.querySelector('#simulate-decline').disabled=processing||!consent.checked;methods.forEach(button=>button.disabled=processing);consent.disabled=processing};
 function choose(button){method=button.dataset.payment;methods.forEach(b=>b.setAttribute('aria-pressed',b===button));document.querySelector('#demo-card').hidden=method!=='card';document.querySelector('#demo-wallet').hidden=method==='card';document.querySelector('#wallet-mark').textContent=method==='apple'?'Apple Pay · DEMO':'Google Pay · DEMO';status.textContent='';update()}
 methods.forEach(button=>button.onclick=()=>choose(button));consent.onchange=update;
 document.querySelector('#checkout-open').onclick=()=>{
  snapshot=dishes.filter(dish=>quantities[dish.id]>0).map(dish=>({name:dish.name,price:dish.price,quantity:quantities[dish.id]}));if(!snapshot.length)return;
  cart(false);completed=false;processing=false;consent.checked=false;
  const items=document.querySelector('#checkout-items');items.replaceChildren();for(const item of snapshot){const row=document.createElement('p');const name=document.createElement('span');name.textContent=item.quantity+' × '+item.name;const price=document.createElement('strong');price.textContent=money(item.quantity*item.price);row.append(name,price);items.append(row)}
  document.querySelector('#checkout-total').textContent=money(total());document.querySelector('#payment-flow').hidden=false;document.querySelector('#payment-success').hidden=true;choose(methods[0]);checkout.showModal();
 };
 function close(){if(timer)clearTimeout(timer);timer=null;processing=false;checkout.close();document.querySelector('#cart-toggle').focus()}
 document.querySelector('#checkout-close').onclick=close;checkout.addEventListener('cancel',event=>{event.preventDefault();close()});
 function simulate(decline){if(processing||completed||!consent.checked)return;processing=true;status.textContent='Simulando la respuesta. No hay conexión con ningún banco.';update();timer=setTimeout(()=>{
  processing=false;timer=null;
  if(decline){status.textContent='Pago de prueba rechazado. No se ha cobrado nada. Puedes reintentar o cambiar el método.';update();return}
  completed=true;const reference='DEMO-'+Array.from(crypto.getRandomValues(new Uint8Array(4)),byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase();const amount=money(total());const summary=reference+' · '+amount+' · '+labels[method];document.querySelector('#receipt-summary').textContent=summary;
  const text='ASADOR SENSACIÓN / COMPRA FICTICIA\n'+summary+'\n'+snapshot.map(item=>`${item.quantity} × ${item.name}: ${money(item.price*item.quantity)}`).join('\n')+'\nTOTAL DEMO: '+amount+'\nSin cobro. Sin pedido real. Precios orientativos.';
  if(receiptURL)URL.revokeObjectURL(receiptURL);receiptURL=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));document.querySelector('#receipt-download').href=receiptURL;
  for(const id of Object.keys(quantities))delete quantities[id];selection();document.querySelector('#payment-flow').hidden=true;document.querySelector('#payment-success').hidden=false;document.querySelector('#payment-success').focus();
 },650)}
 pay.onclick=()=>simulate(false);document.querySelector('#simulate-decline').onclick=()=>simulate(true);document.querySelector('#payment-done').onclick=close;
 window.addEventListener('pagehide',()=>{if(timer)clearTimeout(timer);if(receiptURL)URL.revokeObjectURL(receiptURL)},{once:true});
})();
