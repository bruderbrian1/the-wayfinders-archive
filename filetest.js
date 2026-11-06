const { chromium } = require('/home/user/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/files/index.html');
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => ({
    ready: document.documentElement.getAttribute('data-ready'),
    errors: window.__WF_ERRORS,
    title: document.querySelector('.brand-title') && document.querySelector('.brand-title').textContent,
    items: document.querySelectorAll('.item-card').length,
    routes: document.querySelectorAll('.route-card').length
  }));
  console.log(JSON.stringify({ r, errs }, null, 2));
  await b.close();
})();
