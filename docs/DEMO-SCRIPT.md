# Demo Script — 4 Minutes, Judge-Facing

Refines `06-hackathon-demo-story.md` into a click-by-click sequence that matches what this build actually does. Every step below has been verified working.

**Before you start:** `npm run db:reset` → `npm run build` → `npm start`. Open two browser windows side by side (one for the student, one for staff) or use one window and switch accounts at `/login`.

---

## 0. The problem, in 20 seconds (before touching the laptop)

> "Students don't all struggle with the same thing. One needs a simpler explanation. One needs a worked example. One understands it but can't apply it. And almost every tool treats 'reading the answer' as 'learning it'.
>
> AURA fixes all three — and then connects the learning to something real they can build."

---

## Act 1 — Personalise the explanation (60s)

1. Sign in as **Ananya Baruah (Student)** → she lands on **Overview**.
2. Point at the recommendation card: *"This is the whole product in one card."* Read the reason aloud: **"No attempts yet. This topic lists 1 prerequisite — the tutor will remind you where needed."**
3. Click **Open tutor** → the AI Tutor screen for *Ohm's Law*.
4. Point at the two selectors. Set **Beginner**. Set **Example first**.
   > "She picks the level and the *shape* of the explanation. These aren't cosmetic — Example-first genuinely leads with the worked example."
5. Press **Explain "Ohm's Law"**.
6. Scroll the response. Point out, in order:
   - the header: **`DEMO TUTOR · CURATED RESPONSE`** — *"we label this honestly; no model is connected"*
   - the worked example first, then the key idea, then the pipe/water analogy
   - the **prerequisite reminder**
   - the **next step with its reason**
7. Type a follow-up in the composer: `what if resistance doubles?` → send.
   > "Follow-ups stay in context of the topic."

---

## Act 2 — Check, adapt, improve (75s) — **the money moment**

8. The **Check your understanding** card appears. Answer it **wrong on purpose**.
9. Read the feedback aloud: *"Not quite yet. **Hint:** Use R = V ÷ I. The expected answer is '2'."*
10. Point out: *"It doesn't just say ✗. It tells her the route and the answer, and it doesn't shame her."*
11. Go to **Overview** (left nav). The recommendation has **changed**:
    - label now reads *"Try another guided question on this topic"*
    - the evidence chips read **`Recent miss streak: 1`**, `Last attempt: missed`
    > "The system responded to evidence from *her* interaction — and it shows you the evidence. Nothing about this is a black box."
12. Open **Practice** → answer one correctly → return to Overview.
    > "Now the recommendation moves toward application, because a correct check plus a linked build means the useful next step is to *build* something."

**Say this explicitly:** *"Note what is missing: no score, no percentage, no 'mastered' badge. One correct answer is progress, not mastery — and we refuse to pretend otherwise."*

---

## Act 3 — Apply it (45s)

13. From Overview, click the linked mini-project **Design a safe LED circuit**.
14. Show objective + required concepts, then type a short design note (or use the pre-filled seed copy):
    > *Target 20 mA. Supply 5 V, LED drops 2 V → resistor takes 3 V. R = 3 ÷ 0.02 = 150 Ω. I'd verify by measuring across the resistor.*
15. **Save draft** → confirmation appears. Then **Submit for review** → status becomes `Submitted — awaiting review` and the content locks.
16. Switch account → **Kabir Ahmed (Mentor)**.
17. `/mentor` → the submission is in his queue, with the learner's note and the evidence link (labelled *demo link, not fetched*).
18. Write feedback and click **Approve**.
    > "Structured review by a human. AURA never grades a project by itself."

---

## Act 4 — The Core OS, briefly (50s)

19. Switch to **Jyoti Nath (Admin)** → `/admin`.
    > "Every number here is computed from the same tables these modules write to. Nothing is decorative — each tile links to its records."
20. Click **School requests** → open **Sunrise Public School**.
    - Show the **internal notes** block with the lock icon: *"never shown to the requester."*
    - Walk the lifecycle: `In review` → `Approved`.
    - Click **Convert to workshop**, set a date and venue → **Create event**.
21. Go to **Inventory**. Issue 4 breadboards against that workshop (show `Only N available` if you try to over-issue — it's enforced server-side).
22. Return them, set condition **Good** → availability recovers.
    > "Issue and return are transactional. You can't drive stock negative, and a damaged return is written off the ledger instead of quietly going back on the shelf."

---

## Act 5 — Close the loop (30s)

23. Back as **Ananya**: `/app/projects` → tick **I consent to public showcase**.
24. As **Jyoti**: `/admin/projects` → **Publish to showcase**.
25. Visit `/projects` **publicly**.
    > "It's only here because a mentor approved it *and* she consented. Two independent gates. On a fresh database this page says: *'Nothing public yet — and nothing faked to fill the gap.'*"

---

## Closing line (10s)

> "Understanding → evidence → application → community. One system, and every claim on screen is one the data can back up. That's AURA."

---

## Handling judge questions

| Question | Answer |
|---|---|
"Where's the AI?" | "There's no live model in this build — deliberately. The tutor is deterministic and curated so nothing on screen is fabricated, and the response contract is typed so a real provider drops in behind the same interface. The footer says so on every response." |
"What stops a student faking progress?" | "Progress is evidence states derived from records — attempts, submissions, reviews. There's no score to fake, and the showcase needs two gates." |
"Does it support real classrooms?" | "The learning loop, project review and workshop operations are real. Authentication is password-based and demo data is labelled; institutional SSO and a pilot evaluation are the next steps, not claims we make today." |
"What's genuinely novel?" | "The bridge: a topic, a check, a self-explaining recommendation, a build, a mentor, and the workshop that teaches it — all one data model. Most tools stop at the chatbot." |
"How did you decide the next step?" | "Six deterministic rules in priority order — prerequisite gap, miss streak, low confidence despite a correct answer, correct, explained-but-unattempted, fresh. Every one states the evidence it used." |
"Accessibility?" | "No colour-coded statuses at all — status is text. Keyboard reachable, visible focus, labelled inputs, reduced-motion respected, no horizontal overflow at 360px." |

---

## Do not say

- "AI-powered insights", "personalised learning path", "mastery" — the build does not do these.
- "Real students", "partner schools", "N members" — all demo.
- "Powered by <model>" — no model is connected.
- "Production ready" — it isn't, and saying so is worth more than the claim.

## If something breaks mid-demo

1. Keep talking about the **problem**, not the screen.
2. `npm run db:reset` in a second terminal restores a clean, coherent demo state in ~1 second.
3. Fall back to `/admin` — the metrics are computed live and will look sane even after partial flows.
