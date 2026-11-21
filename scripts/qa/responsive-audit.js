const { chromium } = require('playwright');
const BASE = 'http://localhost:3001';
const WIDTHS = [360, 390, 768, 1024, 1440];

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/learn', name: 'learn' },
  { path: '/learn/t-ohm', name: 'topic' },
  { path: '/app', name: 'overview', cookie: 'u-ananya' },
  { path: '/app/tutor/t-ohm', name: 'tutor', cookie: 'u-ananya' },
  { path: '/app/practice', name: 'practice', cookie: 'u-ananya' },
  { path: '/app/projects', name: 'projects', cookie: 'u-ananya' },
  { path: '/mentor', name: 'mentor', cookie: 'u-kabir' },
  { path: '/admin', name: 'admin', cookie: 'u-jyoti' },
  { path: '/admin/inventory', name: 'inventory', cookie: 'u-jyoti' },
  { path: '/admin/schools', name: 'schools', cookie: 'u-jyoti' },
  { path: '/events', name: 'events' },
  { path: '/collaborate', name: 'collaborate' },
];

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  const consoleErrors = [];

  for (const p of PAGES) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      if (p.cookie) {
        await ctx.addCookies([{ name: 'aura_uid', value: p.cookie, url: BASE }]);
      }
      const page = await ctx.newPage();
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(`${p.name}@${w}: ${m.text().slice(0, 160)}`);
      });
      page.on('pageerror', (e) => consoleErrors.push(`${p.name}@${w}: PAGEERROR ${e.message.slice(0, 160)}`));
      const res = await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (res.status() !== 200) failures.push(`HTTP ${res.status()} ${p.path}@${w}`);

      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const overflow = de.scrollWidth - de.clientWidth;
        // find elements wider than the viewport (excluding intentional scrollers)
        const wide = [...document.querySelectorAll('body *')].filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return false;
          const scrollable = el.scrollWidth > el.clientWidth && getComputedStyle(el).overflowX !== 'visible';
          return r.right > de.clientWidth + 2 && !scrollable && !el.closest('.table-wrap, .tutor-scroll, [class*="overflow-x"]');
        }).slice(0, 3).map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 40)}`);
        // tap targets < 32px on mobile
        const small = window.innerWidth < 500
          ? [...document.querySelectorAll('button, a')].filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.height < 24;
            }).length
          : 0;
        return { overflow, wide, small, h1: document.querySelectorAll('h1').length };
      });

      if (m.overflow > 2) failures.push(`H-SCROLL ${m.overflow}px ${p.name}@${w} :: ${m.wide.join(' | ')}`);
      if (m.h1 > 1) failures.push(`MULTIPLE-H1(${m.h1}) ${p.name}@${w}`);

      if (w === 390 && ['landing','overview','tutor','admin','inventory','learn'].includes(p.name)) {
        await page.screenshot({ path: `/home/user/shots/${p.name}-390.png`, fullPage: false });
      }
      if (w === 1440 && ['landing','overview','tutor','admin','inventory','learn','mentor','schools'].includes(p.name)) {
        await page.screenshot({ path: `/home/user/shots/${p.name}-1440.png`, fullPage: false });
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log('=== FAILURES ===');
  console.log(failures.length ? failures.join('\n') : 'none');
  console.log('=== CONSOLE ERRORS ===');
  const uniq = [...new Set(consoleErrors)];
  console.log(uniq.length ? uniq.slice(0, 15).join('\n') : 'none');
})();
