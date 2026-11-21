# QA scripts

These drive the **real app in a browser**. They are kept out of `npm test` because they need a running server and Chromium.

```bash
npm i -D playwright && npx playwright install chromium   # once
npm run build && npm start                               # or: npm run dev
node scripts/qa/responsive-audit.js                      # 13 routes × 5 widths
node scripts/qa/flows.js                                 # tutor → check → recommendation → project
node scripts/qa/flows-practice.js                        # wrong answer, hints, event registration
node scripts/qa/overflow-probe.js                        # names the element causing overflow
```

If a script points at port 3001, run `npm start -- -p 3001` or change `BASE` at the top of the file.
Results of the last run are recorded in `docs/QA.md`.
