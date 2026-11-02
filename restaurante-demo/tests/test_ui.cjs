const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'fusion-ui-'));
 const port=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
 const adminToken='test-only-admin-token-01234567890123456789';
 const server=spawn('python3',['server.py','--host','127.0.0.1','--port',String(port)],{cwd:root,env:{...process.env,RESTAURANT_DATA_DIR:data,RESTAURANT_ADMIN_TOKEN:adminToken},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;let browser;let checks=0;
 const check=(value,label)=>{assert.ok(value,label);checks++;};
 try{
  for(let i=0;i<100;i++){try{if((await fetch(base+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,40));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for(const reducedMotion of ['reduce','no-preference']){
   const page=await browser.newPage({reducedMotion});const errors=[];const broken=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)broken.push(r.url());});
   await page.goto(base);await page.locator('.em-card').first().waitFor();
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow ${width} ${reducedMotion}`);
    await page.locator('#galeria').scrollIntoViewIfNeeded();
    await page.waitForTimeout(reducedMotion==='reduce'?50:800);
    check(await page.locator('.gallery-item').first().evaluate(el=>Number(getComputedStyle(el).opacity)>.9),'gallery revealed');
    for(const image of await page.locator('img:visible').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());check(await image.evaluate(img=>img.naturalWidth>0),'image decodes');}
    await page.locator('#reservas').scrollIntoViewIfNeeded();await page.waitForTimeout(reducedMotion==='reduce'?20:750);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(50);
    if(width===390){await page.screenshot({path:'/tmp/fusion-mobile.png',fullPage:true});}
    if(width===1440){await page.screenshot({path:'/tmp/fusion-desktop.png',fullPage:true});}
   }
   await page.setViewportSize({width:390,height:1000});await page.locator('.nav-toggle').click();check(await page.locator('.nav-toggle').getAttribute('aria-expanded')==='true','mobile nav opens');await page.locator('#site-nav a[href="#carta"]').click();check(await page.locator('.nav-toggle').getAttribute('aria-expanded')==='false','mobile nav closes');
   await page.locator('[data-filter="fusion"]').click();check(await page.locator('.em-card').count()===2,'fusion filter');await page.locator('.em-card').last().click();await page.locator('.em-add').click();check((await page.locator('.em-total').innerText()).includes('8,00'),'selection total');await page.keyboard.press('Escape');check(await page.locator('.em-card').last().evaluate(el=>el===document.activeElement),'focus returned');await page.locator('.em-view').click();await page.getByRole('button',{name:'Quitar una unidad'}).click();check((await page.locator('.em-total').innerText()).includes('0,00'),'remove item');await page.keyboard.press('Escape');
   await page.locator('.em-search input').fill('notfound');check(await page.locator('.em-card').count()===0,'empty search');await page.locator('.em-search input').fill('');await page.locator('[data-filter="todos"]').click();check(await page.locator('.em-card').count()===4,'all dishes');
   await page.locator('.gallery-item').first().click();check(await page.locator('.gallery-dialog').isVisible(),'lightbox opens');await page.keyboard.press('Escape');check(!await page.locator('.gallery-dialog').isVisible(),'lightbox closes');
   const config=await (await fetch(base+'/api/config')).json();let day;
   for(let i=1;i<=7;i++){const date=new Date(config.today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+i);const value=date.toISOString().slice(0,10);const availability=await (await fetch(base+`/api/availability?date=${value}&partySize=2`)).json();if(availability.slots.length){day=value;break;}}
   assert.ok(day);await page.locator('#booking-date').fill(day);await page.locator('#booking-slots button').first().click();
   await page.locator('#booking-form [name="name"]').fill('Cliente ficticio');await page.locator('#booking-form [name="email"]').fill('demo@example.invalid');await page.locator('#booking-form [name="phone"]').fill('600000000');await page.locator('#booking-form [name="privacyAccepted"]').check();
   await page.locator('#booking-submit').click();await page.locator('#booking-result').waitFor();check((await page.locator('#booking-status').innerText()).includes('Reserva demo guardada'),'booking created');check(await page.locator('#booking-result code').count()===2,'private credentials shown');
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar justificante'}).click();check((await download).suggestedFilename()==='reserva-demo.txt','confirmation download');
   await page.getByRole('button',{name:'Consultar esta reserva'}).click();await page.locator('#manage-form button').click();await page.getByRole('button',{name:'Cancelar reserva demo',exact:true}).click();await page.getByRole('button',{name:'Confirmar cancelación',exact:true}).click();await page.locator('#manage-status').filter({hasText:'cancelada'}).waitFor();check((await page.locator('#manage-result').innerText()).includes('Cancelada'),'booking cancelled');await page.keyboard.press('Escape');
   check(errors.length===0,errors.join('\n'));check(broken.length===0,broken.join('\n'));
   await page.goto(base+'/admin.html');await page.locator('[name="token"]').fill(adminToken);await page.getByRole('button',{name:'Consultar reservas'}).click();await page.locator('#admin-logout').waitFor();check((await page.locator('#admin-results').innerText()).includes('Cliente ficticio'),'admin lists reservations');await page.locator('#admin-logout').click();check(await page.locator('#admin-results').innerText()==='','admin logout clears data');
   await page.close();
  }
  console.log(`PASS UI: ${checks} checks, four viewports, reduced/normal motion, images, menu, gallery, booking, cancellation and admin`);
 }finally{await browser?.close();server.kill();await new Promise(resolve=>server.once('exit',resolve));await fs.rm(data,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
