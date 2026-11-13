// Scroll and pointer detail, progressively enhanced without changing shopping or booking.
(()=>{
 const hero=document.querySelector('.hero'),scene=document.querySelector('#food-stage'),motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
 const update=()=>{frame=0;if(motion.matches||document.hidden)return;const r=hero.getBoundingClientRect(),progress=Math.max(0,Math.min(1,-r.top/(r.height*.8)));scene.style.setProperty('--dish-shift',`${-progress*28}px`);scene.style.setProperty('--dish-turn',`${-6+progress*7}deg`);scene.style.setProperty('--garnish-x',`${progress*16}px`);scene.style.setProperty('--garnish-y',`${-progress*24}px`)};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};addEventListener('scroll',schedule,{passive:true});motion.addEventListener('change',()=>{if(motion.matches){for(const property of ['--dish-shift','--dish-turn','--garnish-x','--garnish-y'])scene.style.removeProperty(property)}else schedule()});schedule();
 addEventListener('pagehide',()=>{cancelAnimationFrame(frame);removeEventListener('scroll',schedule)},{once:true});
})();
