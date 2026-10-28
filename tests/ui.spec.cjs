const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, mkdir, readFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const data = await mkdtemp(path.join(os.tmpdir(), 'tapgo-ui-'));
  const port = await new Promise(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); }); });
  const server = spawn('python3', ['server.py', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...process.env, SHALOM_DATA_DIR: data, SHALOM_BOOKING_MODE: 'demo', SHALOM_ADMIN_TOKEN: '' }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  let browser;
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try { if ((await fetch(base + '/healthz')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    assert.ok(ready, 'isolated server must start');
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const screenshotDir = path.join(data, 'screenshots');
    await mkdir(screenshotDir);
    for (const slug of ['', 'shalom-beauty-clinique/', 'esthetica-latino/']) {
      for (const width of [320, 390, 768, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        const errors = [];
        const broken = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) broken.push(`${response.status()} ${new URL(response.url()).pathname}`); });
        await page.goto(base + '/' + slug);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.hero-object').evaluate(image => image.decode());
        check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${slug} ${width} overflow`);
        check(await page.locator('.hero-object').evaluate(image => image.naturalWidth > 0), 'hero loads');
        check(await page.evaluate(() => document.fonts.check('500 16px Editorial')), 'local editorial font loads');
        if (width <= 700) {
          await page.locator('.menu-toggle').click();
          check(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'true', 'mobile menu opens');
          await page.locator('.nav-items a').first().click();
          check(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false', 'mobile menu closes');
        }
        if (slug) {
          await page.locator('[data-filter]').nth(1).click();
          check(await page.locator('.service-card:visible').count() > 0, 'category filter has results');
          check(await page.locator('.service-card[hidden]').count() > 0, 'other categories hidden');
          await page.locator('.service-card:visible [data-details]').first().click();
          await page.locator('#service-dialog').waitFor({ state: 'visible' });
          check((await page.locator('#service-title').textContent()).length > 0, 'service detail populated');
          await page.keyboard.press('Escape');
          check(!await page.locator('#service-dialog').isVisible(), 'dialog keyboard dismissal');
          await page.locator('[data-filter="all"]').click();
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(screenshotDir, `${slug.split('/')[0] || 'tapgo'}-${width}.png`) });
        check(errors.length === 0, errors.join('\n'));
        check(broken.length === 0, broken.join('\n'));
        await page.close();
      }
    }
    // Actual Motion bundle executes in normal-motion mode as well.
    const motionPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const motionErrors = [];
    motionPage.on('pageerror', error => motionErrors.push(error.message));
    await motionPage.goto(base);
    await motionPage.evaluate(() => document.fonts.ready);
    await motionPage.waitForTimeout(1000);
    await motionPage.locator('#proyectos').scrollIntoViewIfNeeded();
    await motionPage.waitForTimeout(800);
    check(motionErrors.length === 0, motionErrors.join('\n'));
    check(Number(await motionPage.locator('.work-card').first().evaluate(el => getComputedStyle(el).opacity)) > .9, 'Motion scroll reveal completes');
    await motionPage.close();

    const page = await browser.newPage({ viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await page.goto(base);
    await page.locator('[data-project-open]:visible').first().click();
    await page.locator('#project-form [name=name]').fill('Cliente de prueba');
    await page.locator('#project-form [name=business]').fill('Marca demo');
    await page.locator('#project-form [name=idea]').fill('Una web cálida con vídeos de nuestros servicios.');
    await page.locator('#project-form button[type=submit]').click();
    check(await page.locator('#project-result').isVisible(), 'brief is generated');
    check((await page.locator('#project-brief').textContent()).includes('Marca demo'), 'brief contains customer input');
    const briefDownload = page.waitForEvent('download');
    await page.locator('#download-brief').click();
    check((await briefDownload).suggestedFilename().endsWith('.txt'), 'brief can be downloaded');
    await page.keyboard.press('Escape');

    await page.goto(base + '/shalom-beauty-clinique/');
    await page.locator('[data-book]:visible').first().click();
    await page.locator('#booking-service option').nth(1).waitFor({ state: 'attached' });
    await page.locator('#booking-service').selectOption('diagnostico-veraface');
    await page.locator('#booking-next').click();
    const cfg = await (await fetch(base + '/api/config')).json();
    let day;
    for (let n = 1; n <= 7; n++) {
      const value = new Date(cfg.today + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + n);
      const candidate = value.toISOString().slice(0, 10);
      const availability = await (await fetch(base + '/api/availability?service=diagnostico-veraface&date=' + candidate)).json();
      if (availability.slots.length) { day = candidate; break; }
    }
    assert.ok(day, 'future demo availability');
    await page.locator('#booking-date').fill(day);
    await page.locator('#booking-date').dispatchEvent('change');
    await page.locator('.slot').first().waitFor();
    await page.locator('.slot').first().click();
    await page.locator('#booking-next').click();
    await page.locator('#booking-form [name=name]').fill('Persona ficticia');
    await page.locator('#booking-form [name=email]').fill('demo@example.com');
    await page.locator('#booking-form [name=phone]').fill('+34 600 000 000');
    await page.locator('#booking-form [name=consent]').check();
    await page.locator('#booking-submit').click();
    await page.locator('#booking-success').waitFor({ state: 'visible' });
    check((await page.locator('#success-reference').textContent()).startsWith('SH-'), 'booking persisted with reference');
    const calendarDownload = page.waitForEvent('download');
    await page.locator('#download-calendar').click();
    const calendar = await calendarDownload;
    check((await readFile(await calendar.path(), 'utf8')).includes('STATUS:TENTATIVE'), 'download is a tentative calendar event');
    const link = await page.locator('#manage-booking').getAttribute('href');
    await page.goto(link);
    await page.locator('#manage-panel').waitFor({ state: 'visible' });
    check((await page.locator('#manage-summary').textContent()).includes('Persona ficticia'), 'private management retrieves booking');
    await page.locator('#cancel-request').click();
    await page.locator('#confirm-cancel').click();
    await page.waitForFunction(() => document.querySelector('#manage-status').textContent === 'Cancelada');
    check((await page.locator('#cancel-feedback').textContent()).includes('disponible'), 'cancellation releases slot');
    await page.close();
    console.log(`PASS: ${checks} UI checks, 3 sites at 4 viewport widths, Motion, project briefing, booking, calendar and cancellation.`);
  } finally {
    await browser?.close();
    server.kill();
    await rm(data, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
