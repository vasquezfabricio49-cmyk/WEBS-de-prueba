const dishes = [
 {id:'chuleton',name:'Chuletón de Viejo a la Brasa',category:'vasco',price:52,unit:'kg',description:'Madurado durante 45 días, carbón de encina y sal gorda.',pairing:'Rioja Alavesa Reserva'},
 {id:'silpancho',name:'Silpancho de Entraña Premium',category:'boliviano',price:22,description:'Entraña con especias andinas, arroz, patatas doradas y huevo de corral.',pairing:'Tinto de Altura'},
 {id:'kokotxas',name:'Kokotxas al Pil-Pil de Ají Amarillo',category:'fusion',price:28,description:'La tradición del pil-pil con el aroma del ají amarillo.',pairing:'Txakoli de Bizkaia'},
 {id:'cunape',name:'Cuñapé de Idiazabal',category:'fusion',price:8,description:'Pan de yuca boliviano con queso ahumado de Idiazabal.',pairing:'Sidra Vasca Natural'}
];
const money = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
export function mountInteractiveMenu(root, {imageBase='../images/'}={}) {
 if (!(root instanceof HTMLElement)) throw new Error('Se necesita un elemento de montaje');
 const controller=new AbortController(); const signal=controller.signal;
 const selection=new Map(); let filter='todos',query='',active=null,lastFocus=null;
 root.classList.add('ember-menu');
 root.innerHTML=`<header class="em-intro"><p class="em-eyebrow">Euskadi × Bolivia · Propuesta gastronómica</p><h2>Dos raíces.<br><em>Un mismo fuego.</em></h2><p>Explora la carta. Descubre cada plato. Prepara tu selección.</p><a class="em-jump" href="#em-dishes">Descubrir la carta ↓</a></header><section class="em-catalog" aria-label="Carta digital"><div class="em-toolbar"><div class="em-filters" role="group" aria-label="Filtrar por cocina">${[['todos','Toda la carta'],['vasco','Euskadi'],['boliviano','Bolivia'],['fusion','Fusión']].map(([id,label])=>`<button type="button" data-filter="${id}" aria-pressed="${id==='todos'}">${label}</button>`).join('')}</div><label class="em-search">Buscar plato<input type="search" placeholder="¿Qué te apetece?" maxlength="100"></label></div><p class="em-note">Precios y composición provisionales. Imágenes ilustrativas generadas con IA.</p><p class="em-count" role="status" aria-live="polite"></p><div id="em-dishes" class="em-grid"></div></section><aside class="em-selection" aria-label="Tu selección"><div><span>Tu selección · no es un pedido</span><strong class="em-total"></strong></div><button type="button" class="em-view">Ver selección</button></aside><dialog class="em-dialog"><button type="button" class="em-close" aria-label="Cerrar">✕</button><div class="em-dialog-content"></div></dialog>`;
 const grid=root.querySelector('.em-grid'), dialog=root.querySelector('dialog'),content=root.querySelector('.em-dialog-content');
 const on=(el,event,fn)=>el.addEventListener(event,fn,{signal});
 function render(){
  const visible=dishes.filter(d=>(filter==='todos'||d.category===filter)&&`${d.name} ${d.description}`.toLocaleLowerCase('es').includes(query));
  grid.replaceChildren();
  for(const [index,d] of visible.entries()){
   const card=document.createElement('button');card.type='button';card.className='em-card';card.style.setProperty('--i',index);
   card.innerHTML=`<span class="em-photo"><img loading="lazy" src="${imageBase}${d.id}.webp" alt="Ilustración de ${d.name}"><span class="em-discover">Descubrir ↗</span></span><span class="em-card-meta">${d.category==='fusion'?'Fusión':d.category==='vasco'?'Euskadi':'Bolivia'}<span>${money(d.price)}${d.unit?'/kg':''}</span></span><h3>${d.name}</h3><p>${d.description}</p>`;
   on(card,'click',()=>showDish(d,card));grid.append(card);
  }
  root.querySelector('.em-count').textContent=visible.length?`${visible.length} platos para descubrir`:'No hay platos con esa búsqueda.';
 }
 function open(trigger){lastFocus=trigger;dialog.showModal();root.querySelector('.em-close').focus();}
 function showDish(d,trigger){active=d;content.innerHTML=`<img class="em-detail-photo" src="${imageBase}${d.id}.webp" alt="Ilustración de ${d.name}"><p class="em-eyebrow">Cocina ${d.category}</p><h3>${d.name}</h3><p>${d.description}</p><p>Maridaje propuesto: ${d.pairing}</p><p class="em-note">Precio provisional · ${money(d.price)}${d.unit?' por kg. Selección de referencia: 1 kg; importe final según peso.':''}</p><button type="button" class="em-add">Añadir a mi selección · ${money(d.price)}</button>`;on(content.querySelector('.em-add'),'click',()=>{selection.set(d.id,Math.min(20,(selection.get(d.id)||0)+1));updateTotal();content.querySelector('.em-add').textContent='Añadido ✓ · Añadir otra unidad';});open(trigger);}
 function updateTotal(){let total=0,count=0;for(const [id,n] of selection){total+=dishes.find(d=>d.id===id).price*n;count+=n;}root.querySelector('.em-total').textContent=`${count} ${count===1?'selección':'selecciones'} · ${money(total)} orientativos`;}
 function showSelection(trigger){active=null;content.innerHTML='<p class="em-eyebrow">A tu gusto</p><h3>Tu selección</h3><p>No se envía al restaurante ni constituye un pedido o una reserva. El chuletón se estima por kg.</p>';for(const [id,n] of selection){const d=dishes.find(d=>d.id===id);const row=document.createElement('div');row.className='em-line';const label=document.createElement('span');label.textContent=`${n} × ${d.name}${d.unit?' (1 kg por unidad)':''} · ${money(n*d.price)}`;const remove=document.createElement('button');remove.type='button';remove.textContent='Quitar';remove.setAttribute('aria-label',`Quitar una unidad de ${d.name}`);on(remove,'click',()=>{if(n===1)selection.delete(id);else selection.set(id,n-1);updateTotal();showSelection(trigger);});row.append(label,remove);content.append(row);}if(!selection.size){const p=document.createElement('p');p.textContent='Todavía no has elegido ningún plato.';content.append(p);}if(!dialog.open)open(trigger);}
 on(root.querySelector('.em-view'),'click',e=>showSelection(e.currentTarget));
 on(root.querySelector('.em-close'),'click',()=>dialog.close());
 on(dialog,'close',()=>{active=null;lastFocus?.focus();});
 on(dialog,'click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 for(const button of root.querySelectorAll('[data-filter]'))on(button,'click',()=>{filter=button.dataset.filter;for(const b of root.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b===button));render();});
 on(root.querySelector('input'),'input',e=>{query=e.target.value.toLocaleLowerCase('es').trim();render();});
 render();updateTotal();
 return ()=>{if(dialog.open)dialog.close();controller.abort();root.replaceChildren();root.classList.remove('ember-menu');};
}
