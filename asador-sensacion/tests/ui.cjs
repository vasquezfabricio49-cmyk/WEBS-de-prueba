const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const data=mkdtempSync(path.join(tmpdir(),'sensacion-ui-'));
 const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
 const server=spawn('python3',[path.join(root,'server.py'),'--port',String(port)],{env:{...process.env,SENSACION_DATA_DIR:data,SENSACION_ACCEPT_REQUESTS:'0'},stdio:'ignore'});
 let browser;const errors=[];let checks=0;const check=(value,message)=>{assert(value,message);checks++};
 try{
  const base='http://127.0.0.1:'+port;
  let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch(base+'/api/status')).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100))}check(ready,'server ready');
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const reducedMotion of ['reduce','no-preference']){
   const page=await browser.newPage({reducedMotion});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.waitForFunction(()=>document.querySelector('#products').children.length===36);await page.evaluate(()=>document.fonts.ready);
   check(await page.locator('.card').count()===36,'36 dishes');
   for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+width);}
   if(reducedMotion==='no-preference')await page.waitForFunction(()=>getComputedStyle(document.querySelector('.opening')).visibility==='hidden');
   await page.screenshot({path:'/tmp/sensacion-redesign-desktop.png'});
   check(await page.locator('.card img').evaluateAll(images=>new Set(images.map(img=>img.src)).size)===36,'36 distinct individual photos');
   const catalog=JSON.parse(require('node:fs').readFileSync(path.join(root,'catalog.json'),'utf8'));
   for(const dish of catalog)check((await page.request.get(base+'/'+dish.image)).ok(),'photo available: '+dish.name);
   await page.locator('.card img').first().evaluate(image=>image.decode());
   check(await page.locator('.card img').first().evaluate(image=>image.naturalWidth>=1024),'high resolution dish photos');
   check((await page.request.get(base+'/images/hero-pique.webp')).ok(),'transparent hero loads');
   check((await page.request.get(base+'/images/garnish.webp')).ok(),'foreground garnish loads');
   await page.locator('[data-hero=saltenas]').click();await page.waitForFunction(()=>document.querySelector('[data-hero=saltenas]').getAttribute('aria-pressed')==='true');
   check((await page.locator('#hero-dish').getAttribute('src')).includes('saltenas.webp'),'hero dish switch');
   await page.locator('[data-hero=pollo-brasa]').click();await page.waitForFunction(()=>document.querySelector('[data-hero=pollo-brasa]').getAttribute('aria-pressed')==='true');
   check((await page.locator('#hero-dish').getAttribute('src')).includes('pollo-brasa.webp'),'hero third dish');
   await page.locator('[data-hero=pique-macho]').click();await page.waitForFunction(()=>document.querySelector('[data-hero=pique-macho]').getAttribute('aria-pressed')==='true');
   const scene=await page.locator('#hero-scene').boundingBox();await page.mouse.move(scene.x+scene.width*.8,scene.y+scene.height*.45);
   if(reducedMotion==='no-preference'){
    await page.waitForFunction(()=>document.querySelector('#food-stage').style.getPropertyValue('--ry')!=='');
    check(await page.locator('#food-stage').evaluate(el=>Math.abs(parseFloat(el.style.getPropertyValue('--ry')))>0),'pointer changes depth');
    await page.locator('#replay-intro').click();await page.waitForTimeout(100);
    check(await page.locator('.dish-float').evaluate(el=>el.getAnimations().some(animation=>animation.playState==='running')),'entry animation replays');
   }else check(await page.locator('#food-stage').evaluate(el=>el.style.getPropertyValue('--ry')===''),'reduced motion disables pointer tilt');
   await page.mouse.move(5,5);
   check(await page.locator('#food-stage').evaluate(el=>el.style.getPropertyValue('--ry')===''),'depth resets after pointer leaves');

   await page.getByRole('button',{name:'Al fuego',exact:true}).click();check(await page.locator('.card').count()===6,'category filter');
   await page.getByRole('button',{name:'Todo',exact:true}).click();await page.locator('#search').fill('quinua');check(await page.locator('.card').count()===2,'search');
   await page.locator('#search').fill('impossible-dish');check(await page.locator('#empty').isVisible(),'empty state');await page.locator('#reset').click();check(await page.locator('.card').count()===36,'reset');
   await page.locator('#sort').selectOption('price-desc');check((await page.locator('.card h3').first().innerText()).includes('Churrasco'),'price order');
   await page.locator('#sort').selectOption('default');const opener=page.getByRole('button',{name:'Ver detalle de Salteñas',exact:true});await opener.click();check(await page.locator('#dish-dialog').isVisible(),'detail dialog');
   await page.locator('#dialog-add').click();check(await page.locator('#cart-count').innerText()==='1','add via dialog');await page.keyboard.press('Escape');check(!await page.locator('#dish-dialog').isVisible(),'Escape closes');check(await opener.evaluate(el=>el===document.activeElement),'focus restored');
   await page.locator('#cart-toggle').click();check((await page.locator('#selection').innerText()).includes('3,50'),'total');await page.locator('#selection').getByRole('button',{name:'Añadir uno de Salteñas'}).click();check((await page.locator('#cart-total').innerText()).includes('7,00'),'quantity total');await page.locator('#clear-cart').click();check(await page.locator('#cart-count').innerText()==='0','clear');await page.locator('#cart-close').click();
   await page.locator('[name=name]').fill('Prueba ficticia');await page.locator('[name=phone]').fill('600000000');await page.locator('[name=date]').fill(new Date(Date.now()+86400000).toISOString().slice(0,10));await page.locator('[name=time]').fill('14:00');await page.locator('[name=consent]').check();await page.locator('button[type=submit]').click();check((await page.locator('#result').innerText()).includes('Todavía no se ha enviado'),'honest offline request');check(await page.locator('#download').isVisible(),'download');
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/sensacion-redesign-mobile.png'});
   if(reducedMotion==='reduce')check(await page.locator('.opening').evaluate(el=>getComputedStyle(el).display)==='none','reduced motion');
   await page.close();
  }
  check(errors.length===0,'no JS errors: '+errors.join(','));console.log('PASS '+checks+' checks: 36 dishes, images, categories, search, sort, dialogs, focus, cart, offline booking, 4 widths, reduced motion.');
 }finally{if(browser)await browser.close();server.kill();rmSync(data,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
