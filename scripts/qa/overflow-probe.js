const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 900 } });
  await ctx.addCookies([{ name: 'aura_uid', value: 'u-jyoti', url: 'http://localhost:3001' }]);
  const p = await ctx.newPage();
  await p.goto('http://localhost:3001/admin', { waitUntil: 'domcontentloaded' });
  const info = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > vw + 1 && !el.closest('.table-wrap, .tutor-scroll, [class*="overflow-x"]');
    }).map(el => ({
      tag: el.tagName,
      cls: String(el.className).slice(0, 90),
      text: (el.textContent || '').trim().slice(0, 60),
      right: Math.round(el.getBoundingClientRect().right),
      width: Math.round(el.getBoundingClientRect().width),
    })).slice(0, 8);
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
