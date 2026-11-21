# AURA — Design System

**Version 3.0 · Monochrome Precision + Scoped Gold**
Supersedes `04-design-system.md` (strict monochrome) by resolving it against the supplied brand kit. Read §1 for the rule that governs everything else.

---

## 1. The design idea, in one paragraph

AURA should feel like a **precision instrument built by people who care about learning**: calm, editorial, information-dense where it needs to be, and never decorative. Personality comes from typography, hierarchy, generous spacing, real content, and the quality of interaction feedback — not from colour, gradients or illustration. A student should feel trusted, not marketed at. An administrator should feel the system is honest with them, because the numbers it shows are the numbers it computed.

**The single sentence to test any screen against:** *Would this look at home in a well-made technical journal, or does it look like a stock ed-tech template?*

---

## 2. Colour

### 2.1 The monochrome core (used everywhere, always)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#111111` | Primary text, primary action fill |
| `black` | `#000000` | Pressed/active states, inverse surfaces |
| `paper` | `#FFFFFF` | Page canvas |
| `mist` | `#F7F7F7` | Secondary surface, grouped info, table headers |
| `cloud` | `#EFEFEF` | Hover/selected surface, meter track, neutral badge |
| `line` | `#E3E3E3` | Borders, dividers, hairlines |
| `mid` | `#777777` | Secondary text, metadata, mono labels |
| `strong` | `#555555` | Body secondary, descriptive text |
| `disabled` | `#A3A3A3` | Disabled text/state |

### 2.2 The gold accent — **scoped, and only scoped**

| Token | Hex | Permitted use |
|---|---|---|
| `gold-300` | `#DCC287` | Gradient end of an accent rule |
| `gold-400` | `#C9A24B` | Accent hairline start, small emphasis |
| `gold-500` | `#B8892B` | Accent text on white (eyebrows on marketing pages) |
| `gold-600` | `#9A701F` | Accent text where additional contrast is needed |
| `night` | `#0B0B0C` | Reserved for dark marketing surfaces |

**THE RULE.** Gold exists only inside an element carrying `.public-surface`. That class is applied by exactly two layouts: the public marketing layout and the school-collaboration form page. It sets `--accent`, `--accent-strong`, `--accent-soft`.

```css
.public-surface { --accent: var(--gold-500); --accent-strong: var(--gold-600); }
.public-surface .accent-text { color: var(--accent-strong); }
.public-surface .accent-rule { background: linear-gradient(90deg, gold-400, gold-200); }
```

**Gold must never appear in the workspace, tutor, practice, mentor or admin surfaces.** Those surfaces are monochrome, full stop.

### 2.3 What colour may never do

1. **Never encode state.** No red/green/yellow statuses. Status = neutral badge + text label + (where useful) an icon. Reason: the product must be usable by colour-blind learners, and status colour in ed-tech implies judgement about a person.
2. **Never appear in a chart.** No charts exist in v3.0, deliberately — see §7.
3. **Never be the only signal for "correct/incorrect".** Correct answers use an inverse-ink surface with the word "Correct."; misses use `mist` with the word "Not correct — and that is fine."

### 2.4 Contrast

All text pairs meet WCAG AA at their size. `mid` (#777) is used only at ≥12px on white or as mono micro-labels; `strong` (#555) carries body-adjacent text. `gold-500` on white is 4.6:1 (AA for normal text); `gold-600` is used when the text is small.

---

## 3. Typography

| Role | Face | Notes |
|---|---|---|
| UI / body / headings | **Inter Variable** (self-hosted via `@fontsource-variable/inter`) | `font-feature-settings: "cv11","ss01"` for a cleaner `a` and `g` |
| Technical: IDs, dates, metrics, code, eyebrows | **JetBrains Mono Variable** | `font-variant-numeric: tabular-nums` for numbers |

### Scale (px, with the real classes used)

| Token | Size / line-height | Class | Use |
|---|---|---|---|
| Display | 72 / 1.04 (lg), 56 (sm), 40 (base) | `.h-serif text-[72px]` | Landing hero only |
| H1 | 28–34 / 1.08 | `text-[28px] sm:text-[32px]` | Page titles |
| H2 | 19–24 | `text-[19px]` / `text-[24px]` | Section titles |
| H3 | 14.5–16 | `text-[15px]` | Card titles |
| Body | 13.5–15 / 1.6–1.7 | `text-[13.5px] leading-relaxed` | Default |
| Small | 12.5 | `text-[12.5px]` | Secondary, helpers |
| Micro / eyebrow | 10–11.5, uppercase, `tracking-[0.14em]` | `.eyebrow` | Labels |

**Rules**
- Headings use tight tracking: `-0.02em` to `-0.04em` (`.h-serif` applies `-0.035em`).
- Body line length is capped at **68ch** (`.max-w-prose`) — tutor explanations especially never span a full desktop width.
- Eyebrows are mono, uppercase, letter-spaced. They are the main "technical journal" texture of the system.
- Numerals in metrics always tabular so columns don't jitter.

---

## 4. Space, radius, elevation

**4px base scale.** Practical stops: 4, 8, 12, 16, 20, 24, 32, 48, 64.

| Context | Value |
|---|---|
| Workspace padding | 16 (mobile) → 24 (sm) → 32 (lg) |
| Public page padding | 20 → 32 |
| Public max width | 1240 (`max-w-public`) |
| Workspace max width | 1440 (`max-w-workspace`) |
| Sidebar | 248 (fixed, desktop) |
| Card radius | 14 (`rounded-card`); inputs 8; pills/buttons full |
| Card border | 1px `line` |
| Shadow | **Almost none.** Only the composer uses `shadow-lift` (0 8px 24px -12px, 14% ink) to separate it from a scrolling transcript |

**Vertical rhythm**: page title block → 24-28 to content; section → 32-40 between; card interior 16-24. Never nest a card inside a card inside a card.

---

## 5. Components

### 5.1 Buttons
`primary` = ink fill / paper text. `secondary` = paper fill, ink border. `tertiary` = text-only with underline on hover. `destructive` = same as secondary but only used with an explicit confirmation label (declining a school request). Sizes: `sm` 32px, `md` 40px, `lg` 48px.
Required states: default, hover, active, focus-visible, disabled (`opacity-45` + `cursor-not-allowed`), and loading (label changes to a present participle: "Saving…", "Publishing…", "Checking…").

**Rule:** a button label always describes the outcome ("Submit for review"), never a mood ("Let's go!").

### 5.2 Cards
White, 1px `line` border, 14px radius, no shadow. Padding 16–24. A card exists to group one decision or one record — not to decorate a sentence. Interiors never scroll; the page does.

### 5.3 Form controls
- Labels **above** fields, always visible. Optional fields marked `(optional)` in `mid`; required marked `*`.
- Inputs 40px high, 8px radius, `line` border; hover `mid`; focus `ink` border + 2px `ink/10` ring.
- Errors: inline below the field, `role="alert"`, prefixed with a mono `!`. Messages are actionable ("Enter a valid email address."), never "Invalid input".
- Server-side validation errors are humanised — raw schema JSON never reaches the UI (`parseOrThrow` produces `field: message`).

### 5.4 Status badge
Neutral pill, 11.5px medium. Variants: `neutral` (cloud bg), `outline` (line border), `solid` (ink bg / paper text — reserved for terminal-positive states like `registered`, `approved`). **Never coloured.**

### 5.5 Demo badge
Mono, 10px, uppercase, with a 3.5px dot. Reads `Demo data` / `Demo event` / `Fictional members` / `Demo tutor`. Appears on any surface where a visitor could mistake sample content for real institutional data. This is a **product requirement**, not decoration.

### 5.6 Evidence meter
A row of 4 hairline segments filled in ink. Always accompanied by literal text: `"3 of 4 — explored → practised → built → applied"`. It reports **steps with records**, never a percentage of ability.

### 5.7 Data table
`line` borders, `mist` header row with 11.5px uppercase mono labels, 13.5px cells, 12px vertical padding. Wrapped in `.table-wrap` which allows horizontal scroll below 640px rather than crushing columns. Every table has a caption (visually hidden when a visible heading already names it).

### 5.8 Empty state
Dashed border, centred, one-line title + one or two sentences explaining **why it is empty** and what would fill it. Example: *"Nothing public yet — and nothing faked to fill the gap."* Empty states are where honesty is most visible; write them carefully.

### 5.9 Inline alert
Four tones, all monochrome: `info` (mist), `warn` (ink/25 border), `error` (cloud), `success` (inverse: ink bg, paper text). Success inverts so it is unmistakable without colour.

---

## 6. Screen-level guidance

### 6.1 Public landing (`/`)
- Sticky header, hairline bottom border, backdrop blur at 95% opacity.
- **Hero**: a CSS hairline grid masked by a radial gradient (no image), gold hairline + gold eyebrow, display headline "Build skills. / Create what matters.", one-sentence promise, two CTAs, a brand panel using the official `aura-core.svg`, then a 4-cell stat strip of *honest* numbers (`0 fabricated claims`).
- **Loop section**: three numbered cards (01 Understand / 02 Practice / 03 Apply) with line icons at 18px and 1.6 stroke.
- **Topics**: three cards, hover border darkens to `mid` (the only hover affordance on cards).
- **Apply section**: `mist` band, left column of claims, right column showing the actual linked challenge record (objective + required concepts pulled from the database, not hardcoded copy).
- **Events + Showcase**: events show real seeded records with `Demo event` badges; showcase shows an honest empty state unless a project has been approved *and* consented.
- **Schools CTA**: card with a 2px gold top rule — the single most visible gold moment in the product.
- Footer: 4 columns; the last states the prototype limitations in plain words.

### 6.2 Learning hub (`/learn`, `/learn/[topic]`)
Subject sections with a count per subject, topic cards showing difficulty badge + first two outcomes. Topic page: breadcrumb, outcomes as a checklist-ish list, prerequisites as bordered pills, linked build card, and a right rail with reviewed resources, check count by type, and siblings.

### 6.3 Tutor (`/app/tutor/[topic]`) — the signature screen
Three zones:
1. **Control card**: level select + style select, each with a one-line plain-language description (`"Everyday words, minimal assumed knowledge"`), and a primary `Explain "…"` button.
2. **Conversation**: user turns are ink-filled right-aligned bubbles; tutor turns are full-width cards with a **labelled header** (`DEMO TUTOR · CURATED RESPONSE` on the left, `BEGINNER · EXAMPLE FIRST` on the right). Blocks render by kind — formula blocks are bordered and mono, steps are numbered, question blocks are dashed, examples are `mist`. Sources render only when present. Helpful / not-helpful at the bottom of each response.
3. **Context rail** (300px, sticky): session context (level, style, provider = "Demo (curated)", checks available), "How to get value here" (four numbered instructions including *"Ask what is actually confusing"*), and an honesty note.
4. **Composer**: sticky bottom, rounded-2xl, `shadow-lift`, ink circular send button, and a permanent footer line stating the tutor is deterministic with no live model.

Mobile: rail collapses beneath; conversation remains primary; everything stays one column.

### 6.4 Practice (`/app/practice`)
Three stat cards (attempts recorded, correct-of-all **with the note "Not a score — a record. Retries count too."**, topics with checks). Topic chips with a `suggested` marker tied to the recommendation. Question card: difficulty + index in a mono header, MCQ as large tappable rows, `Show a hint` before submit, optional 1–5 confidence, then a verdict block that explains and reveals the expected answer. Right rail explains **why this topic**, the evidence state, prerequisites, and a compact per-question history (`✓✗`).

### 6.5 Overview (`/app`)
Greeting + goal + `Continue learning`. Then the **recommendation card**: label, reason paragraph, evidence chips, three onward actions, and a bordered "Evidence used" panel listing attempts on this topic, topics explored (n of 7), and the derived evidence state — plus the sentence *"No ability score is computed or stored."* Below: recent evidence list (question, correctness, relative time) and a rail with the linked build, next event (with Registered badge if applicable) and per-topic evidence meters.

### 6.6 Mentor (`/mentor`)
Queue cards with mono header (status, topic, submitted date) and author name; the learner's design note rendered as preformatted prose; evidence link shown as a **demo link not fetched**; showcase consent state shown. Right side: the review form — a textarea with a 15-character minimum and two decisions. Second section lists *out-of-scope* items explicitly labelled as such, which is the honest way to show scope enforcement in a demo.

### 6.7 Admin (`/admin` and children)
Dense but calm. Eight metric tiles (2×2 on mobile, 4×N on desktop), each linking to its list. Two queue columns, then an audit strip with mono timestamps. Inventory: three balance tiles (on hand / allocated / available), issue form, adjust form, register table with low-stock and fully-out flags, open allocations with a condition select and `Record return`, then the movement ledger. School requests: each card shows requester-facing fields in a definition list, then a visually separated, lock-icon'd **internal notes** block labelled *"never shown to the requester"*, and a lifecycle panel that only offers legal transitions.

---

## 7. Deliberate absences (and why)

- **No charts.** Of any kind. In a product that refuses to imply ability measurement, a progress chart is a promise we cannot keep. Numbers appear as counts with stated meanings.
- **No gradients** except the two hairline accent rules on public surfaces.
- **No illustration people.** Lucide line icons at 1.6–1.8 stroke only.
- **No streaks, XP, badges, confetti.** A learner's motivation here is evidence, not points.
- **No glassmorphism, no neon, no dark-mode dashboard.** The only dark surface is the ink success alert and the user's own chat bubble.
- **No logo recreation.** The official supplied artwork ships unmodified under `public/brand/` and is rendered through `components/brand.tsx`. The dotted `A.U.R.A.` wordmark is **never** retyped in CSS or HTML; black/white variants are used on their matching surfaces.

---

## 8. Motion

- One keyframe: `fade-up` (opacity 0→1, translateY 6px→0) at **180 ms** ease-out, used only for newly-arrived tutor turns.
- All transitions are `120–180 ms`. Nothing animates on scroll. No parallax.
- `@media (prefers-reduced-motion: reduce)` sets every animation and transition duration to `0.001ms` and disables smooth scrolling globally.

---

## 9. Accessibility checklist (must pass before any screen ships)

- [ ] Exactly one `h1`; heading levels never skip.
- [ ] Every interactive element reachable and operable by keyboard.
- [ ] `:focus-visible` ring visible on every control (2px ink, 2px offset).
- [ ] Every input has a programmatic label; errors use `aria-invalid` + `role="alert"`.
- [ ] Status is conveyed by text, not colour.
- [ ] Tables have captions; long tables scroll in a labelled region.
- [ ] Touch targets ≥ 32px on mobile; primary actions 40px+.
- [ ] No horizontal page scroll at 360/390/768/1024/1440.
- [ ] Images and icons are decorative (`alt=""` / `aria-hidden`) unless meaningful.
- [ ] Reduced motion respected.
- [ ] Skip-to-content link present and functional.

---

## 10. Writing style (this is part of the design system)

- **Plain, specific, calm.** "Only 4 available. Cannot issue 99." — not "Oops! Something went wrong 😬".
- **Never blame the learner.** "Not quite yet." + a hint + the expected answer and its reasoning.
- **Never overclaim.** Instead of "Mastered!" → "Correct — recorded." Instead of "AI-powered insights" → "Rules run locally on recorded attempts."
- **Say what happens next.** Every confirmation states the consequence: "Submitted for review. A mentor will see it in their queue."
- **Mono for facts, prose for meaning.** IDs, dates, quantities, states → mono. Explanations → prose.
- **No exclamation marks outside genuine success confirmations, and even then, sparingly.**
