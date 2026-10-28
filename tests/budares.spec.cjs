const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs/promises');
(async () => {
  const root = path.resolve(__dirname, '..');
  const port = await new Promise(resolve => { const s = net.createServer(); s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))}); });
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(root,'el-budares')],{stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;
  let browser, checks=0;
  const check=(v,message)=>{assert.ok(v,message);checks++};
  try {
    for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,40))}
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
    for(const width of [320,390,768,1440]){
      const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
      const errors=[],broken=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)broken.push(r.url())});
      await page.goto(base);await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);await page.locator('.hero-food').first().evaluate(i=>i.decode());
      check(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),`no overflow at ${width}`);
      check(await page.locator('.menu-card').count()===38,'complete menu');
      check(await page.locator('.review-reference').count()===6,'six original review links');
      check(await page.evaluate(()=>document.fonts.check('400 18px BudareDisplay')),'local display font');
      await page.locator('[data-filter="Cachapas"]').click();check(await page.locator('.menu-card:visible').count()===6,'category count');
      await page.locator('#menu-search').fill('pizza');check(await page.locator('#menu-empty').isVisible(),'empty filter state');
      await page.locator('[data-filter="all"]').click();check(await page.locator('.menu-card:visible').count()===1,'search works across categories');
      await page.locator('#menu-search').fill('');check(await page.locator('.menu-card:visible').count()===38,'reset filters');
      await page.locator('[data-order]:visible').first().click();await page.locator('#order-dialog').waitFor({state:'visible'});
      check((await page.locator('#order-dialog a').first().getAttribute('href'))==='https://glovoapp.com/es/es/bilbao/stores/budares-bilbao','real Glovo destination');
      check((await page.locator('#order-dialog a').nth(1).getAttribute('href')).includes('BxT8qflOWrSpxIh-qIn11Q'),'real Uber Eats destination');
      await page.keyboard.press('Escape');
      if(width<701){await page.locator('.mobile-menu').click();check(await page.locator('.mobile-menu').getAttribute('aria-expanded')==='true','mobile menu opens');await page.locator('.nav-links a').first().click();check(await page.locator('.mobile-menu').getAttribute('aria-expanded')==='false','mobile menu closes')}
      await page.evaluate(()=>document.querySelector('#featured-carousel').scrollLeft=0);await page.locator('#carousel-next').click();check(await page.locator('#featured-carousel').evaluate(e=>e.scrollLeft>0),'carousel navigates');
      check(errors.length===0,errors.join('\n'));check(broken.length===0,broken.join('\n'));await page.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce',acceptDownloads:true});
    await page.goto(base);await page.waitForFunction(()=>document.body.dataset.ready==='true');
    await page.locator('[data-add="cachapa-carne-pollo"]').click();await page.locator('#product-dialog').waitFor({state:'visible'});
    await page.locator('#detail-add').click();check(await page.locator('#product-dialog').isVisible(),'variant required');
    await page.locator('#detail-option').selectOption('Pollo');await page.locator('#detail-more').click();await page.locator('#detail-note').fill('Sin cebolla <img src=x onerror=alert(1)>');await page.locator('#detail-add').click();
    check(await page.locator('[data-cart-count]').first().textContent()==='2','add chosen variant and quantity');
    await page.locator('[data-add="burger-clasica"]').click();await page.locator('[data-add="emp-pabellon"]').click();await page.locator('[data-add="huevos-rotos"]').click();
    await page.locator('[data-cart]').first().click();await page.locator('#cart-dialog').waitFor({state:'visible'});
    check((await page.locator('#cart-total').textContent()).includes('57,90'),'exact cent arithmetic');
    check(await page.locator('#cart-estimate-note').isVisible(),'estimated prices explicitly marked');
    check(await page.locator('#cart-lines img').count()===0,'notes render as text, never HTML');
    const downloadPromise=page.waitForEvent('download');await page.locator('#download-selection').click();const download=await downloadPromise;const text=await fs.readFile(await download.path(),'utf8');check(text.includes('NO ES UN PEDIDO ENVIADO.'),'download does not pretend to send order');check(text.includes('Pollo'),'variant in summary');
    await page.locator('[aria-label="Quitar Huevos rotos"]').click();check((await page.locator('#cart-total').textContent()).includes('44,90'),'remove recalculates subtotal');
    await page.locator('[aria-label="Aumentar cantidad de Hamburguesa clásica"]').click();check((await page.locator('#cart-total').textContent()).includes('56,90'),'quantity changes update total');
    await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.locator('[data-cart]').first().click();check((await page.locator('#cart-total').textContent()).includes('56,90'),'selection persists after reload');
    await page.locator('#clear-selection').click();check(await page.locator('#cart-lines .cart-line').count()===3,'clear requires second click');await page.locator('#clear-selection').click();check(await page.locator('#cart-empty').isVisible(),'clear empties cart');check(await page.locator('[data-cart-count]').first().textContent()==='0','count resets');await page.close();
    const motion=await browser.newPage({reducedMotion:'no-preference'});const errs=[];motion.on('pageerror',e=>errs.push(e.message));await motion.goto(base);await motion.waitForFunction(()=>document.body.dataset.ready==='true');await motion.locator('#opiniones').scrollIntoViewIfNeeded();await motion.waitForTimeout(800);check(errs.length===0,errs.join('\n'));check(Number(await motion.locator('.review-card').first().evaluate(e=>getComputedStyle(e).opacity))>.9,'animated review links visible');await motion.close();
    console.log(`PASS El Budare’s: ${checks} checks; 4 viewport sizes, complete menu, providers, cart arithmetic, variants, persistence, safe notes and review animation.`);
  } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
