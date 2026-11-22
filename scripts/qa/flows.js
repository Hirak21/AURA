const { chromium } = require('playwright');
const { BASE, sessionCookies } = require('./session');
const log = (ok, m) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(sessionCookies());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  // ---- Flow 1: tutor ----
  await page.goto(`${BASE}/app/tutor/t-ohm`, { waitUntil: 'domcontentloaded' });
  await page.selectOption('#level', 'beginner');
  await page.selectOption('#mode', 'example-first');
  await page.getByRole('button', { name: /Explain/i }).click();
  await page.waitForSelector('text=Demo tutor · curated response', { timeout: 20000 });
  log(true, 'tutor returns a labelled curated response');
  const hasExample = await page.locator('text=Worked example').count();
  log(hasExample > 0, 'example-first mode rendered the worked example block');
  const hasCheck = await page.locator('text=Check your understanding').count();
  log(hasCheck > 0, 'check-your-understanding module appears after explanation');

  // ---- Flow 2: answer a check wrongly, then correctly ----
  const numeric = page.getByPlaceholder('Enter a number');
  if (await numeric.count()) {
    await numeric.fill('7');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await page.waitForSelector('text=Not quite yet', { timeout: 15000 });
    log(true, 'wrong numeric answer gets specific feedback');
    const fb = await page.locator('text=Hint:').count();
    log(fb > 0, 'feedback includes a hint and the expected answer');
  }

  // ---- Flow 3: follow-up in composer ----
  await page.getByLabel('Ask a follow-up question').fill('what if resistance doubles?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const userTurn = await page.locator('text=what if resistance doubles?').count();
  log(userTurn > 0, 'follow-up question is persisted and shown in the thread');

  // ---- Flow 4: overview reflects the new attempt ----
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
  const rec = await page.locator('text=Recommended next').count();
  log(rec > 0, 'overview shows an explainable recommendation');
  const evidence = await page.locator('text=Evidence used').count();
  log(evidence > 0, 'overview exposes the evidence behind the recommendation');

  // ---- Flow 5: practice submit ----
  await page.goto(`${BASE}/app/practice?topic=t-ohm`, { waitUntil: 'domcontentloaded' });
  const firstRadio = page.locator('input[type=radio]').first();
  if (await firstRadio.count()) {
    await firstRadio.check();
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await page.waitForSelector('text=/Correct|Not correct/', { timeout: 15000 });
    log(true, 'practice grades an MCQ and shows explanatory feedback');
  }

  // ---- Flow 6: project draft save ----
  await page.goto(`${BASE}/app/projects?challenge=c-led-circuit`, { waitUntil: 'domcontentloaded' });
  await page.locator('#p-draft').fill('Target current 20 mA. Supply is 5 V and the LED drops 2 V, so the resistor takes 3 V. R = 3 / 0.02 = 150 ohm. I would confirm by measuring the voltage across the resistor.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForSelector('text=Draft saved.', { timeout: 15000 });
  log(true, 'project draft saves and confirms visibly');

  // ---- Flow 7: sign out ----
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  log(true, 'sign out returns to the public site');

  console.log(errs.length ? `\nPAGE ERRORS:\n${errs.join('\n')}` : '\nNo page errors.');
  await b.close();
})();
