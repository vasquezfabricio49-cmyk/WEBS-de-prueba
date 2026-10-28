import { animate, inView, scroll, stagger } from 'motion';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = $('.header');
const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 35);
updateHeader();
addEventListener('scroll', updateHeader, { passive: true });

// Clinic navigation is owned by clinic.js; the studio shares its accessible pattern.
if (document.body.classList.contains('tapgo')) {
  const toggle = $('.menu-toggle');
  const navigation = $('.nav-items');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    navigation?.classList.toggle('open', open);
  });
  navigation?.querySelectorAll('a, button').forEach((item) => {
    item.addEventListener('click', () => {
      toggle?.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('open');
    });
  });
}

const progress = $('.scroll-progress');
if (progress && !reduceMotion) scroll((value) => { progress.style.transform = `scaleX(${value})`; });

if (!reduceMotion) {
  const title = $$('.scene-title > span, .scene-title > em');
  if (title.length) animate(title, { opacity: [0, 1], y: [36, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: .95, delay: stagger(.15, { startDelay: .12 }), ease: [.22, 1, .36, 1] });
  const heroObject = $('.hero-object');
  if (heroObject) {
    animate(heroObject, { opacity: [0, 1], scale: [.93, 1], rotate: [-4, 0] }, { duration: 1.5, ease: [.22, 1, .36, 1] });
    const float = animate(heroObject, { y: [0, -12, 0] }, { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 });
    document.addEventListener('visibilitychange', () => document.hidden ? float.pause() : float.play());
  }
  $$('.floating-note').forEach((note, index) => {
    animate(note, { opacity: [0, 1], scale: [.9, 1] }, { duration: .7, delay: .5 + index * .13 });
    animate(note, { y: [0, index % 2 ? 7 : -7, 0] }, { duration: 5 + index, repeat: Infinity, ease: 'easeInOut', delay: .8 });
  });
  const scene = $('.scene-hero');
  const stage = $('.object-stage');
  if (scene && stage && matchMedia('(min-width: 701px)').matches) {
    scroll(animate(stage, { y: [0, 90], rotate: [0, 5], opacity: [1, .6] }, { ease: 'linear' }), { target: scene, offset: ['start start', 'end start'] });
  }
  const targets = $$('.section-heading, .studio-statement, .space-copy, .featured-copy, .value, .process-card, .work-card, .studio-tile, .brand-quote blockquote');
  targets.forEach((el) => {
    if (el.getBoundingClientRect().top > innerHeight) {
      el.classList.add('animated-reveal');
      el.style.opacity = '0';
      inView(el, () => {
        animate(el, { opacity: [0, 1], y: [24, 0] }, { duration: .7, ease: [.22, 1, .36, 1] });
      }, { margin: '0px 0px -30px 0px' });
    }
  });
}

// A useful studio CTA without inventing an email address or pretending to send a lead.
const projectDialog = $('#project-dialog');
if (projectDialog) {
  let briefing = '';
  const close = () => { projectDialog.close(); document.body.style.overflow = ''; };
  $$('[data-project-open]').forEach((button) => button.addEventListener('click', () => {
    projectDialog.showModal(); document.body.style.overflow = 'hidden';
  }));
  $('[data-project-close]').addEventListener('click', close);
  projectDialog.addEventListener('close', () => { document.body.style.overflow = ''; });
  projectDialog.addEventListener('click', (event) => {
    if (event.target !== projectDialog) return;
    const box = projectDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
  });
  $('#project-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    briefing = `TAP & GO — MI PRÓXIMO PROYECTO\n\nNombre: ${data.get('name').trim()}\nNegocio: ${data.get('business').trim()}\nProyecto: ${data.get('type')}\n\nLA IDEA\n${data.get('idea').trim()}\n\nBriefing preparado para compartir con Tap & Go. No enviado automáticamente.`;
    $('#project-brief').textContent = briefing;
    form.hidden = true;
    $('#project-result').hidden = false;
  });
  $('#edit-brief').addEventListener('click', () => {
    $('#project-form').hidden = false;
    $('#project-result').hidden = true;
  });
  $('#download-brief').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([briefing], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'mi-proyecto-tap-and-go.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#copy-brief').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(briefing);
      $('#brief-status').textContent = 'Briefing copiado. Ya puedes compartirlo con Tap & Go.';
    } catch {
      $('#brief-status').textContent = 'Puedes seleccionar el texto o descargar el archivo para compartirlo.';
    }
  });
}
