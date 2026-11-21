const { chromium } = require('playwright');
const BASE = 'http://localhost:3001';
const log = (ok, m) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'aura_uid', value: 'u-meera', url: BASE }]);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  // Wrong answer on an MCQ must produce a hint + expected answer, and persist.
  await page.goto(`${BASE}/app/practice?topic=t-ohm`, { waitUntil: 'domcontentloaded' });
  const opts = page.locator('input[type=radio]');
  const n = await opts.count();
  log(n >= 4, `MCQ rendered ${n} options`);
  // deliberately pick the LAST option (wrong one for q-ohm-1, whose answer is 'b')
  await opts.nth(n - 1).check();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.waitForSelector('text=/Correct|Not correct/', { timeout: 15000 });
  const body = await page.textContent('body');
  log(/Correct|Not correct/.test(body), 'answer graded');
  log(/Expected:/.test(body), 'wrong answer reveals the expected answer');
  log(/hint/i.test(body), 'feedback references a hint');
  log(/recorded|saved|Next question/i.test(body), 'attempt persistence acknowledged in UI');

  // Hint button before answering
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Show a hint/ }).click();
  await page.waitForSelector('text=Hint.', { timeout: 10000 });
  log(true, 'hint reveals progressively before the answer');

  // Event registration toggle
  await page.goto(`${BASE}/events`, { waitUntil: 'domcontentloaded' });
  const reg = page.getByRole('button', { name: /^Register$/ });
  if (await reg.count()) {
    await reg.first().click();
    await page.waitForTimeout(2000);
    const t = await page.textContent('body');
    log(/You are registered|Cancel registration|Full/i.test(t), 'event registration changes state visibly');
  }
  console.log(errs.length ? `\nERRORS:\n${errs.join('\n')}` : '\nNo page errors.');
  await b.close();
})();
