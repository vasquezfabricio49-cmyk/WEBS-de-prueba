import { animate, inView, stagger } from 'motion';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const money = cents => currency.format(cents / 100);
const imageURL = item => window.BUDARES_IMAGES?.[item.image] || `assets/${item.image}.webp`;
const storageKey = 'budares-selection-v1';
let catalog, items, cart = [], current = null, quantity = 1, selectedCategory = 'all', toastTimer, clearArmed = false;

function toast(message) {
  const box = $('#toast');
  box.textContent = message; box.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 2800);
}
function openDialog(dialog) {
  $$('dialog[open]').forEach(other => other.close());
  dialog.showModal(); document.body.style.overflow = 'hidden';
}
$$('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.style.overflow = ''; });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
});
const menuToggle = $('.mobile-menu');
const navigation = $('.nav-links');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('open', open);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { navigation.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }));
$$('[data-order]').forEach(button => button.addEventListener('click', () => openDialog($('#order-dialog'))));
$$('[data-legal]').forEach(button => button.addEventListener('click', () => openDialog($('#legal-dialog'))));

function setQuantity(value) {
  quantity = Math.min(20, Math.max(1, value));
  $('#detail-quantity').textContent = String(quantity);
  $('#detail-less').disabled = quantity === 1;
  $('#detail-more').disabled = quantity === 20;
}
function detail(item) {
  current = item;
  $('#product-title').textContent = item.name;
  $('#detail-category').textContent = item.category;
  $('#detail-description').textContent = item.description;
  $('#detail-price').textContent = money(item.price) + (item.estimated ? ' *' : '');
  const image = $('#detail-photo'); image.className = `food-photo product-detail-photo tile-${item.tile}`;
  image.style.backgroundImage = `url('${imageURL(item)}')`;
  image.setAttribute('aria-label', 'Fotografía ilustrativa de ' + item.name);
  $('#detail-note').value = '';
  $('#detail-note-price').textContent = item.estimated ? '* Precio orientativo de propuesta, pendiente de confirmar con el restaurante.' : 'Precio transcrito de la carta facilitada. Confirma su vigencia en la plataforma antes de pedir.';
  const select = $('#detail-option'); select.replaceChildren();
  $('#detail-option-label').hidden = item.options.length === 0;
  select.required = item.options.length > 0;
  if (item.options.length) {
    select.add(new Option('Selecciona una opción', ''));
    item.options.forEach(option => select.add(new Option(option, option)));
  }
  setQuantity(1);
  openDialog($('#product-dialog'));
}
$('#detail-less').addEventListener('click', () => setQuantity(quantity - 1));
$('#detail-more').addEventListener('click', () => setQuantity(quantity + 1));
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(cart)); }
  catch { toast('Tu selección se mantiene durante esta visita, pero el navegador no permite guardarla.'); }
}
function updateCounts() {
  const count = cart.reduce((total, line) => total + line.qty, 0);
  $$('[data-cart-count]').forEach(output => { output.textContent = String(count); });
}
function add(item, option = '', note = '', qty = 1) {
  const cleanNote = note.trim().slice(0, 250);
  const line = cart.find(line => line.id === item.id && line.option === option && line.note === cleanNote);
  if (line) line.qty = Math.min(20, line.qty + qty);
  else cart.push({ id: item.id, option, note: cleanNote, qty: Math.min(20, qty), key: crypto.randomUUID ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(12))].join('') });
  persist(); updateCounts(); toast('Añadido a tu antojo.');
}
$('#detail-add').addEventListener('click', () => {
  if (!current) return;
  const select = $('#detail-option');
  if (current.options.length && !select.reportValidity()) return;
  add(current, current.options.length ? select.value : '', $('#detail-note').value, quantity);
  $('#product-dialog').close();
});

function element(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
function cartRender() {
  $('#cart-lines').replaceChildren(); $('#cart-feedback').textContent = '';
  $('#cart-empty').hidden = cart.length > 0; $('#cart-summary').hidden = cart.length === 0;
  for (const line of cart) {
    const item = items.get(line.id);
    const article = element('article', 'cart-line');
    const image = element('div', `food-photo tile-${item.tile}`); image.style.backgroundImage = `url('${imageURL(item)}')`; image.setAttribute('aria-hidden', 'true');
    const content = element('div'); content.append(element('h3', '', item.name));
    if (line.option || line.note) content.append(element('p', '', [line.option, line.note].filter(Boolean).join(' · ')));
    if (item.estimated) content.append(element('p', '', '* Precio de propuesta, pendiente de confirmar.'));
    const controls = element('div'); const qty = element('div', 'quantity-control');
    const less = element('button', '', '−'); less.type = 'button'; less.setAttribute('aria-label', 'Reducir cantidad de ' + item.name); less.disabled = line.qty === 1;
    const amount = element('output', '', String(line.qty)); amount.setAttribute('aria-live', 'polite');
    const more = element('button', '', '+'); more.type = 'button'; more.setAttribute('aria-label', 'Aumentar cantidad de ' + item.name); more.disabled = line.qty === 20;
    const change = delta => { line.qty = Math.max(1, Math.min(20, line.qty + delta)); persist(); updateCounts(); cartRender(); };
    less.addEventListener('click', () => change(-1)); more.addEventListener('click', () => change(1)); qty.append(less, amount, more);
    const remove = element('button', 'remove-line', 'Quitar'); remove.type = 'button'; remove.setAttribute('aria-label', 'Quitar ' + item.name);
    remove.addEventListener('click', () => { cart = cart.filter(row => row.key !== line.key); persist(); updateCounts(); cartRender(); });
    controls.append(qty, remove); content.append(controls);
    article.append(image, content, element('div', 'line-price', money(line.qty * item.price)));
    $('#cart-lines').append(article);
  }
  $('#cart-total').textContent = money(cart.reduce((total, line) => total + items.get(line.id).price * line.qty, 0));
  $('#cart-estimate-note').hidden = !cart.some(line => items.get(line.id).estimated);
}
function selectionText() {
  const lines = cart.map(line => {
    const item = items.get(line.id);
    return `${line.qty} × ${item.name}${line.option ? ' (' + line.option + ')' : ''} — ${money(line.qty * item.price)}${item.estimated ? ' * precio orientativo' : ''}${line.note ? '\n   Nota de selección: ' + line.note : ''}`;
  });
  return `EL BUDARE’S — MI SELECCIÓN\n\n${lines.join('\n')}\n\nSubtotal orientativo: ${money(cart.reduce((total, line) => total + items.get(line.id).price * line.qty, 0))}\n\nNO ES UN PEDIDO ENVIADO. Esta selección no se transfiere automáticamente. Debes elegir y confirmar los productos en la plataforma. Los precios finales, los gastos y la disponibilidad pueden ser distintos. Los importes con * son orientativos de propuesta.\n\nGlovo: ${catalog.glovo}\nUber Eats: ${catalog.uber}`;
}
$('#copy-selection').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(selectionText()); $('#cart-feedback').textContent = 'Selección copiada. No se ha enviado ningún pedido.'; }
  catch { $('#cart-feedback').textContent = 'El navegador no permite copiar. Puedes descargar el resumen.'; }
});
$('#download-selection').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([selectionText()], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'mi-antojo-el-budares.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#cart-feedback').textContent = 'Resumen preparado para descargar. No se ha enviado ningún pedido.';
});
$('#clear-selection').addEventListener('click', () => {
  if (!clearArmed) { clearArmed = true; $('#clear-selection').textContent = 'Confirmar vaciado'; $('#cart-feedback').textContent = 'Pulsa de nuevo para vaciar toda la selección.'; return; }
  cart = []; persist(); updateCounts(); cartRender(); clearArmed = false; $('#clear-selection').textContent = 'Vaciar selección';
});

const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filter() {
  const query = normalized($('#menu-search').value.trim()); let count = 0;
  $$('.menu-card').forEach(card => {
    const item = items.get(card.dataset.item);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    card.hidden = !matchesCategory || !normalized(item.name + ' ' + item.description + ' ' + item.category).includes(query);
    if (!card.hidden) count++;
  });
  $('#menu-count').textContent = `${count} ${count === 1 ? 'plato' : 'platos'}`; $('#menu-empty').hidden = count > 0;
}
const carousel = $('#featured-carousel');
$('#carousel-prev').addEventListener('click', () => carousel.scrollBy({ left: -carousel.clientWidth * .85, behavior: reduced ? 'instant' : 'smooth' }));
$('#carousel-next').addEventListener('click', () => carousel.scrollBy({ left: carousel.clientWidth * .85, behavior: reduced ? 'instant' : 'smooth' }));

async function boot() {
  try {
    if (window.BUDARES_MENU) catalog = window.BUDARES_MENU;
    else { const response = await fetch('assets/menu.json'); if (!response.ok) throw Error('menu'); catalog = await response.json(); }
    items = new Map(catalog.items.map(item => [item.id, item]));
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      cart = Array.isArray(saved) ? saved.filter(line => line && items.has(line.id) && typeof line.key === 'string' && typeof line.option === 'string' && typeof line.note === 'string' && line.note.length <= 250 && Number.isInteger(line.qty) && line.qty >= 1 && line.qty <= 20 && (items.get(line.id).options.length ? items.get(line.id).options.includes(line.option) : line.option === '')).slice(0, 100) : [];
    } catch { cart = []; }
    updateCounts();
    $$('[data-details]').forEach(button => button.addEventListener('click', () => detail(items.get(button.dataset.details))));
    $$('[data-add]').forEach(button => button.addEventListener('click', () => { const item = items.get(button.dataset.add); if (item.options.length) detail(item); else add(item); }));
    $$('[data-cart]').forEach(button => button.addEventListener('click', () => { clearArmed = false; $('#clear-selection').textContent = 'Vaciar selección'; cartRender(); openDialog($('#cart-dialog')); }));
    $$('[data-filter]').forEach(button => button.addEventListener('click', () => { selectedCategory = button.dataset.filter; $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); filter(); }));
    $('#menu-search').addEventListener('input', filter);
    document.body.dataset.ready = 'true';
  } catch { toast('No se ha podido cargar la selección. La carta sigue visible y puedes pedir desde los enlaces de las plataformas.'); }
}
boot();
if (!reduced) {
  animate('.hero-title > span', { opacity: [0, 1], y: [28, 0] }, { duration: .75, delay: stagger(.12), ease: [.22, 1, .36, 1] });
  $$('.hero-food').forEach((food, i) => { const control = animate(food, { y: [0, i ? 9 : -9, 0] }, { duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }); document.addEventListener('visibilitychange', () => document.hidden ? control.pause() : control.play()); });
  inView('.motion-item', element => {
    animate(element, { opacity: [.2, 1], y: [24, 0] }, { duration: .65, ease: [.22, 1, .36, 1] });
  }, { margin: '0px 0px -35px 0px' });
}
