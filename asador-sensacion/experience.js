/* Progressive enhancement: all content and actions work without this file. */
(() => {
  const scene = document.querySelector('#hero-scene');
  const stage = document.querySelector('#food-stage');
  const heroImage = document.querySelector('#hero-dish');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const controls = [...document.querySelectorAll('[data-hero]')];
  const heroDishes = {
    'pique-macho': {src: 'images/pique-film-poster.png', label: 'PIQUE MACHO', alt: 'Ilustración con IA de un pique macho boliviano', flat: false},
    saltenas: {src: 'images/saltenas.webp', label: 'SALTEÑAS', alt: 'Ilustración con IA de salteñas bolivianas', flat: true},
    'pollo-brasa': {src: 'images/pollo-brasa.webp', label: 'POLLO A LA BRASA', alt: 'Ilustración con IA de pollo a la brasa boliviano', flat: true}
  };
  let frame = 0, point = null, visible = true, changing = false;
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0; point = null;
    for (const name of ['--rx','--ry','--tx','--ty','--light-x','--light-y']) stage.style.removeProperty(name);
  };
  const update = () => {
    frame = 0;
    if (!point || motion.matches || !finePointer.matches || !visible || document.hidden) return;
    const rect = scene.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (point.x - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (point.y - rect.top) / rect.height - .5));
    stage.style.setProperty('--rx', `${-y * 11}deg`);
    stage.style.setProperty('--ry', `${x * 13}deg`);
    stage.style.setProperty('--tx', `${x * 10}px`);
    stage.style.setProperty('--ty', `${y * 8}px`);
    stage.style.setProperty('--light-x', `${50 + x * 45}%`);
    stage.style.setProperty('--light-y', `${30 + y * 30}%`);
  };
  scene.addEventListener('pointermove', event => {
    if (motion.matches || !finePointer.matches) return;
    point = {x: event.clientX, y: event.clientY};
    if (!frame) frame = requestAnimationFrame(update);
  }, {passive: true});
  scene.addEventListener('pointerleave', reset);
  document.addEventListener('visibilitychange', () => {if (document.hidden) reset()});
  const sceneObserver = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; if (!visible) reset()}, {threshold: .05});
  sceneObserver.observe(scene);
  const configureMotion = () => {
    document.documentElement.classList.toggle('motion-enabled', !motion.matches);
    reset();
    if (motion.matches) document.querySelectorAll('.reveal.pending').forEach(element => element.classList.remove('pending'));
  };
  motion.addEventListener('change', configureMotion); configureMotion();

  async function selectDish(button) {
    if (changing || button.getAttribute('aria-pressed') === 'true') return;
    changing = true;
    const dish = heroDishes[button.dataset.hero];
    button.setAttribute('aria-busy', 'true');
    const image = new Image(); image.src = dish.src;
    try {
      await image.decode();
      if (!motion.matches && heroImage.animate) {
        await heroImage.animate([{opacity:1, transform:'translateY(0) rotate(0)'},{opacity:0, transform:'translateY(20px) rotate(-8deg)'}], {duration:180, easing:'ease-in', fill:'forwards'}).finished;
      }
      heroImage.src = dish.src; heroImage.alt = dish.alt;
      heroImage.classList.toggle('flat-photo', dish.flat);
      document.querySelector('#hero-dish-name').textContent = dish.label;
      controls.forEach(control => control.setAttribute('aria-pressed', control === button));
      heroImage.getAnimations().forEach(animation => animation.cancel());
      if (!motion.matches && heroImage.animate) {
        heroImage.animate([{opacity:0, transform:'translateY(25px) rotate(7deg) scale(.92)'},{opacity:1, transform:'translateY(0) rotate(0) scale(1)'}], {duration:650, easing:'cubic-bezier(.16,1,.3,1)'});
      }
    } catch {
      const label = document.querySelector('#hero-dish-name');
      label.textContent = 'No se pudo cargar. Inténtalo de nuevo.';
    } finally {
      button.removeAttribute('aria-busy'); changing = false;
    }
  }
  controls.forEach(button => button.addEventListener('click', () => selectDish(button)));
  document.querySelector('#replay-intro').addEventListener('click', () => {
    if (motion.matches) return;
    scene.classList.add('intro-replay');
    requestAnimationFrame(() => requestAnimationFrame(() => scene.classList.remove('intro-replay')));
  });
  // Only reveal sections after observation is available. Never hide primary actions.
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.remove('pending'); revealObserver.unobserve(entry.target);
    }
  }, {threshold: .12});
  document.querySelectorAll('.section-head, .intro-grid, .facts, .booking > div, .gallery-grid').forEach(element => {
    element.classList.add('reveal');
    if (!motion.matches) element.classList.add('pending');
    revealObserver.observe(element);
  });
  window.addEventListener('pagehide', () => {reset();sceneObserver.disconnect();revealObserver.disconnect()}, {once:true});
})();
