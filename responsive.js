const { chromium } = require('/home/user/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle' });
  for (const w of [1440, 1280, 1024, 900, 768, 560, 390, 360]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cols: getComputedStyle(document.querySelector('.layout')).gridTemplateColumns,
      lower: getComputedStyle(document.querySelector('.lower')).gridTemplateColumns,
      headerH: document.querySelector('.topbar').getBoundingClientRect().height
    }));
    console.log(w, JSON.stringify(r));
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: '/tmp/wf-mobile3.png', fullPage: true });
  await b.close();
})();
