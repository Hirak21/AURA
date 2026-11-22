/**
 * Deterministic, manifest-scoped production demo dataset.
 *
 * This module is deliberately separate from lib/db/seed.ts. It does NOT change
 * the baseline catalogue or any real account. It creates six locked,
 * clearly-labelled demo identities (no password hashes, no sessions) plus a
 * fictional activity layer that references only existing demo catalogue rows.
 *
 * Every row has a fixed ID (or fixed composite key) and is recorded in
 * demo_seed_meta, so a rerun is a no-op and removal is scoped to exactly what
 * this script added. No secrets, passwords or live-service URLs are stored.
 */
import { createHash } from "node:crypto";
import { tutorResponseSchema, type TutorResponse } from "../lib/domain/types";

export const DATASET_ID = "aura-production-demo-v2";
export const DATASET_VERSION = 2;
export const DEMO_ID_PREFIX = "pd2-";

export const DEMO_IDS = {
  projects: {
    showcase: "pd2-project-showcase-led",
    approved: "pd2-project-approved-motion",
  },
  eventRecap: "pd2-event-recap",
  request: "pd2-request-outreach",
  allocations: {
    resistorKit: "pd2-allocation-resistor-kit",
    ledPack: "pd2-allocation-led-pack",
    jumpers: "pd2-allocation-jumpers",
    multimeter: "pd2-allocation-multimeter",
  },
} as const;

/**
 * Locked demo-only identities. They have no password hash and no sessions, so
 * they cannot be used to sign in. They exist so fictional activity never has
 * to be attached to a real user account.
 */
export const DEMO_USERS = {
  ananya: "pd2-user-ananya",
  rohit: "pd2-user-rohit",
  meera: "pd2-user-meera",
  kabir: "pd2-user-kabir",
  devika: "pd2-user-devika",
  ishaan: "pd2-user-ishaan",
} as const;

export type SqlValue = string | number | null;

export interface DemoRow {
  table: string;
  /** Primary-key columns. These identify the row for skip/verify/remove. */
  keys: Record<string, SqlValue>;
  /** Full row payload, using database column names. */
  values: Record<string, SqlValue>;
}

export interface ManifestRow {
  table: string;
  keys: Record<string, SqlValue>;
  columns: string[];
  hash: string;
}

export interface DemoManifest {
  datasetId: string;
  version: number;
  generatedAt: string;
  rows: ManifestRow[];
}

export interface DemoDataset {
  asOf: string;
  rows: DemoRow[];
  manifest: DemoManifest;
}

/** Baseline catalogue records this dataset is allowed to reference. */
export const REQUIRED_REFERENCES = {
  topics: [
    { id: "t-ohm", title: "Ohm's Law" },
    { id: "t-series", title: "Series & Parallel Circuits" },
    { id: "t-fractions", title: "Fractions & Ratios" },
    { id: "t-newton", title: "Newton's Second Law" },
    { id: "t-algebra", title: "Linear Equations" },
  ],
  questions: [
    { id: "q-ohm-1", topicId: "t-ohm" },
    { id: "q-ohm-2", topicId: "t-ohm" },
    { id: "q-ohm-3", topicId: "t-ohm" },
    { id: "q-frac-1", topicId: "t-fractions" },
    { id: "q-frac-2", topicId: "t-fractions" },
  ],
  challenges: [
    { id: "c-led-circuit", topicId: "t-ohm" },
    { id: "c-projectile", topicId: "t-newton" },
  ],
  events: [
    { id: "e-solder", title: "Intro to Soldering & Breadboards (demo workshop)" },
    { id: "e-school", title: "School Robotics Outreach — Circuit Basics (demo)" },
  ],
  resources: [
    { id: "r-ohm-1", topicId: "t-ohm" },
    { id: "r-ohm-3", topicId: "t-ohm" },
    { id: "r-frac-1", topicId: "t-fractions" },
  ],
  inventoryItems: ["i-3", "i-4", "i-5", "i-6", "i-7"],
  collaborationRequests: ["sr-2"],
  schools: ["sch-2"],
} as const;

/** Reverse dependency order: used by the scoped removal script. */
export const DELETE_ORDER = [
  "audit_events",
  "project_reviews",
  "practice_attempts",
  "tutor_messages",
  "tutor_sessions",
  "learning_goals",
  "bookmarks",
  "event_registrations",
  "resource_allocations",
  "stock_movements",
  "collaboration_requests",
  "projects",
  "events",
  "mentor_assignments",
  "user_roles",
  "users",
] as const;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Hash of a row's identity + payload. Used for informational drift reports. */
export function rowHash(input: Pick<DemoRow, "table" | "keys" | "values">) {
  return createHash("sha256")
    .update(stableStringify({ table: input.table, keys: input.keys, values: input.values }))
    .digest("hex");
}

function tutorResponse(args: {
  topicId: string;
  level: "beginner" | "intermediate" | "advanced";
  mode: "simple" | "step-by-step" | "example-first" | "socratic";
  summary: string;
  blocks: TutorResponse["blocks"];
  nextStep: TutorResponse["nextStep"];
  sources: TutorResponse["sources"];
  checkQuestionId?: string;
  generatedAt: string;
}): string {
  const parsed: TutorResponse = tutorResponseSchema.parse({
    provider: "demo",
    ...args,
  });
  return JSON.stringify(parsed);
}

/**
 * Build the full dataset. `asOf` is the only time input, so the same timestamp
 * always produces byte-identical rows and the same manifest hashes.
 */
export function buildDemoDataset(asOf: Date): DemoDataset {
  const iso = (d: Date) => d.toISOString();
  const at = (days: number, hours = 0) =>
    iso(new Date(asOf.getTime() + days * 86_400_000 + hours * 3_600_000));

  const rows: DemoRow[] = [];
  const toColumn = (key: string) => key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
  const add = (table: string, keys: Record<string, SqlValue>, values: object) => {
    const normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [toColumn(key), value as SqlValue]),
    );
    rows.push({ table, keys, values: normalized });
  };

  // ── Locked demo identities ──────────────────────────────────────────────
  // No password_hash / password_updated_at columns are supplied: these rows
  // cannot authenticate. Roles are included so mentor/reviewer workflows render.
  const demoPeople: Array<{
    id: string;
    displayName: string;
    email: string;
    preferredLevel: "beginner" | "intermediate" | "advanced";
    learningGoal: string;
    roles: string[];
    createdDay: number;
  }> = [
    {
      id: DEMO_USERS.ananya,
      displayName: "Ananya Baruah (demo)",
      email: "ananya.pd2@demo.aura.local",
      preferredLevel: "beginner",
      learningGoal: "Build and explain a safe LED indicator circuit.",
      roles: ["student"],
      createdDay: -21,
    },
    {
      id: DEMO_USERS.rohit,
      displayName: "Rohit Das (demo)",
      email: "rohit.pd2@demo.aura.local",
      preferredLevel: "intermediate",
      learningGoal: "Connect force, mass and acceleration in one model.",
      roles: ["student", "member"],
      createdDay: -30,
    },
    {
      id: DEMO_USERS.meera,
      displayName: "Meera Kalita (demo)",
      email: "meera.pd2@demo.aura.local",
      preferredLevel: "beginner",
      learningGoal: "Simplify fractions without hints.",
      roles: ["student"],
      createdDay: -14,
    },
    {
      id: DEMO_USERS.kabir,
      displayName: "Kabir Ahmed (demo)",
      email: "kabir.pd2@demo.aura.local",
      preferredLevel: "advanced",
      learningGoal: "Review electronics and motion projects.",
      roles: ["mentor", "reviewer"],
      createdDay: -60,
    },
    {
      id: DEMO_USERS.devika,
      displayName: "Devika Sharma (demo)",
      email: "devika.pd2@demo.aura.local",
      preferredLevel: "intermediate",
      learningGoal: "Coordinate fictional school outreach.",
      roles: ["liaison", "organizer"],
      createdDay: -90,
    },
    {
      id: DEMO_USERS.ishaan,
      displayName: "Ishaan Gogoi (demo)",
      email: "ishaan.pd2@demo.aura.local",
      preferredLevel: "beginner",
      learningGoal: "Track demo lab inventory.",
      roles: ["custodian"],
      createdDay: -45,
    },
  ];
  for (const person of demoPeople) {
    add("users", { id: person.id }, {
      id: person.id,
      displayName: person.displayName,
      email: person.email,
      status: "active",
      preferredLevel: person.preferredLevel,
      learningGoal: person.learningGoal,
      isDemo: 1,
      createdAt: at(person.createdDay),
    });
    for (const role of person.roles) {
      add("user_roles", { user_id: person.id, role }, { user_id: person.id, role });
    }
  }

  const mentorLinks: Array<{ id: string; mentorId: string; studentId: string; scope: string; day: number }> = [
    { id: `${DEMO_ID_PREFIX}mentor-ananya`, mentorId: DEMO_USERS.kabir, studentId: DEMO_USERS.ananya, scope: "LED circuit project (demo)", day: -12 },
    { id: `${DEMO_ID_PREFIX}mentor-rohit`, mentorId: DEMO_USERS.kabir, studentId: DEMO_USERS.rohit, scope: "Motion explanation project (demo)", day: -7 },
  ];
  for (const link of mentorLinks) {
    add("mentor_assignments", { id: link.id }, {
      id: link.id,
      mentorId: link.mentorId,
      studentId: link.studentId,
      scope: link.scope,
      status: "active",
      createdAt: at(link.day),
    });
  }

  // ── Learning evidence ───────────────────────────────────────────────────
  const tutorSessions: Array<[string, string, number, number]> = [
    [DEMO_USERS.ananya, "t-ohm", -12, -6],
    [DEMO_USERS.ananya, "t-series", -6, -5],
    [DEMO_USERS.meera, "t-fractions", -9, -4],
  ];
  for (const [userId, topicId, first, last] of tutorSessions) {
    add(
      "tutor_sessions",
      { user_id: userId, topic_id: topicId },
      {
        id: `${DEMO_ID_PREFIX}-ts-${userId.slice(2)}-${topicId.slice(2)}`,
        user_id: userId,
        topic_id: topicId,
        first_opened_at: at(first),
        last_opened_at: at(last),
      },
    );
  }

  const ohmResponse = tutorResponse({
    topicId: "t-ohm",
    level: "beginner",
    mode: "step-by-step",
    summary: "Use V = I × R to choose a resistor that keeps the LED at its rated current.",
    blocks: [
      {
        kind: "text",
        heading: "Key idea",
        body: "The supply pushes charge through the circuit; the resistor limits how much current reaches the LED. The LED's own voltage drop is already fixed by its material.",
      },
      {
        kind: "formula",
        heading: "The relationship",
        body: "V = I × R. Rearranged: R = (V_supply − V_LED) ÷ I_target.",
      },
      {
        kind: "steps",
        heading: "Work through it",
        body: "Use the same order every time:",
        items: [
          "Write down the supply voltage and the LED forward voltage.",
          "Subtract to find the voltage the resistor must drop.",
          "Convert the target current from mA to A.",
          "Divide voltage by current to get resistance.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example",
        body: "For 5 V, a 2 V red LED and 20 mA: R = (5 − 2) ÷ 0.02 = 150 Ω.",
      },
    ],
    nextStep: {
      label: "Check your resistor calculation",
      reason: "Answer the numeric question on choosing a 150 Ω resistor before you build the circuit.",
    },
    sources: [
      {
        resourceId: "r-ohm-1",
        title: "Demo note: Ohm's Law in three lines",
        author: "AURA demo content",
        url: "https://demo.aura.local/notes/ohm-3-lines",
        isDemo: true,
      },
      {
        resourceId: "r-ohm-3",
        title: "Demo note: choosing a resistor (worked example)",
        author: "AURA demo content",
        url: "https://demo.aura.local/notes/resistor-sizing",
        isDemo: true,
      },
    ],
    checkQuestionId: "q-ohm-3",
    generatedAt: at(-6),
  });

  const fractionsResponse = tutorResponse({
    topicId: "t-fractions",
    level: "beginner",
    mode: "socratic",
    summary: "A fraction is simplified when numerator and denominator share no whole-number factor.",
    blocks: [
      {
        kind: "question",
        heading: "Think it through",
        body: "Try these before reading the explanation:",
        items: [
          "What number divides both 6 and 8 exactly?",
          "If you divide both parts by it, can anything still divide both?",
          "How would you check your answer by multiplying back?",
        ],
      },
      {
        kind: "text",
        heading: "Key idea",
        body: "Dividing the top and bottom by the same factor does not change the value — it only changes how the same ratio is written.",
      },
    ],
    nextStep: {
      label: "Try the simplification check",
      reason: "Reduce 6/8 yourself, then compare with the feedback on the short-answer question.",
    },
    sources: [
      {
        resourceId: "r-frac-1",
        title: "Demo note: the four fraction operations",
        author: "AURA demo content",
        url: "https://demo.aura.local/notes/fraction-ops",
        isDemo: true,
      },
    ],
    checkQuestionId: "q-frac-2",
    generatedAt: at(-4),
  });

  const tutorMessages: Array<{
    id: string;
    userId: string;
    topicId: string;
    role: "user" | "tutor";
    level: string;
    mode: string;
    content: string;
    createdAt: string;
  }> = [
    {
      id: "pd2-tm-ohm-question",
      userId: DEMO_USERS.ananya,
      topicId: "t-ohm",
      role: "user",
      level: "beginner",
      mode: "step-by-step",
      content: JSON.stringify({ question: "Why do we need a resistor if the LED already has a voltage drop?" }),
      createdAt: at(-6),
    },
    {
      id: "pd2-tm-ohm-answer",
      userId: DEMO_USERS.ananya,
      topicId: "t-ohm",
      role: "tutor",
      level: "beginner",
      mode: "step-by-step",
      content: ohmResponse,
      createdAt: at(-6, 0.01),
    },
    {
      id: "pd2-tm-frac-question",
      userId: DEMO_USERS.meera,
      topicId: "t-fractions",
      role: "user",
      level: "beginner",
      mode: "socratic",
      content: JSON.stringify({ question: "How do I know when 6/8 is fully simplified?" }),
      createdAt: at(-4),
    },
    {
      id: "pd2-tm-frac-answer",
      userId: DEMO_USERS.meera,
      topicId: "t-fractions",
      role: "tutor",
      level: "beginner",
      mode: "socratic",
      content: fractionsResponse,
      createdAt: at(-4, 0.01),
    },
  ];
  for (const m of tutorMessages) add("tutor_messages", { id: m.id }, m);

  const attempts: Array<{
    id: string;
    userId: string;
    questionId: string;
    topicId: string;
    response: string;
    isCorrect: number;
    feedback: string;
    confidence: number;
    createdAt: string;
  }> = [
    {
      id: "pd2-pa-ohm-mcq-wrong",
      userId: DEMO_USERS.ananya, questionId: "q-ohm-1", topicId: "t-ohm", response: "a",
      isCorrect: 0,
      feedback: "Not quite. Raising resistance lowers current for the same voltage; start from I = V ÷ R.",
      confidence: 3, createdAt: at(-6),
    },
    {
      id: "pd2-pa-ohm-mcq-right",
      userId: DEMO_USERS.ananya, questionId: "q-ohm-1", topicId: "t-ohm", response: "b",
      isCorrect: 1,
      feedback: "Correct. Ohm's Law gives I = V ÷ R.",
      confidence: 4, createdAt: at(-6, 0.02),
    },
    {
      id: "pd2-pa-ohm-numeric",
      userId: DEMO_USERS.ananya, questionId: "q-ohm-2", topicId: "t-ohm", response: "2",
      isCorrect: 1,
      feedback: "Correct. R = 6 V ÷ 3 A = 2 Ω.",
      confidence: 4, createdAt: at(-5),
    },
    {
      id: "pd2-pa-frac-add",
      userId: DEMO_USERS.meera, questionId: "q-frac-1", topicId: "t-fractions", response: "0.83",
      isCorrect: 1,
      feedback: "Correct. 1/2 + 1/3 = 5/6 ≈ 0.83.",
      confidence: 4, createdAt: at(-4),
    },
    {
      id: "pd2-pa-frac-simplify-wrong",
      userId: DEMO_USERS.meera, questionId: "q-frac-2", topicId: "t-fractions", response: "4/6",
      isCorrect: 0,
      feedback: "You made a valid equivalent fraction, but 2 still divides both numbers. Keep going.",
      confidence: 3, createdAt: at(-4, 0.01),
    },
    {
      id: "pd2-pa-frac-simplify-right",
      userId: DEMO_USERS.meera, questionId: "q-frac-2", topicId: "t-fractions", response: "3/4",
      isCorrect: 1,
      feedback: "Correct. 6 and 8 share the factor 2, so 6/8 = 3/4.",
      confidence: 5, createdAt: at(-4, 0.02),
    },
    {
      id: "pd2-pa-ohm-resistor",
      userId: DEMO_USERS.rohit, questionId: "q-ohm-3", topicId: "t-ohm", response: "150",
      isCorrect: 1,
      feedback: "Correct. The resistor drops 3 V at 0.02 A, so R = 150 Ω.",
      confidence: 5, createdAt: at(-3),
    },
  ];
  for (const a of attempts) add("practice_attempts", { id: a.id }, a);

  const goals = [
    {
      id: "pd2-goal-ananya",
      user_id: DEMO_USERS.ananya,
      text: "Build and explain a safe LED indicator circuit by the end of the week.",
      created_at: at(-12),
    },
    {
      id: "pd2-goal-meera",
      user_id: DEMO_USERS.meera,
      text: "Clear the fractions check without opening a hint.",
      created_at: at(-9),
    },
  ];
  for (const g of goals) add("learning_goals", { id: g.id }, g);

  const bookmarks: Array<[string, string, number]> = [
    [DEMO_USERS.ananya, "t-series", -5],
    [DEMO_USERS.rohit, "t-newton", -4],
    [DEMO_USERS.meera, "t-algebra", -3],
  ];
  for (const [user_id, topic_id, day] of bookmarks) {
    add("bookmarks", { user_id, topic_id }, { user_id, topic_id, created_at: at(day) });
  }

  // ── Project → mentor review → showcase ──────────────────────────────────
  const showcaseProject = {
    id: DEMO_IDS.projects.showcase,
    challenge_id: "c-led-circuit",
    author_id: DEMO_USERS.ananya,
    title: "LED rail indicator with a measured resistor choice",
    draft:
      "Demo record. Target 20 mA from a 5 V rail; the red LED drops 2 V, so the resistor drops 3 V. R = 3 ÷ 0.02 = 150 Ω. I measured 2.98 V across the resistor on the breadboard, giving about 19.9 mA. The revised note also records the LED voltage and explains why the nearest standard value is safe.",
    evidence_url: "https://demo.aura.local/evidence/pd2-ananya-led",
    status: "showcased",
    reviewer_id: DEMO_USERS.kabir,
    consent_to_showcase: 1,
    created_at: at(-10),
    updated_at: at(-2),
    submitted_at: at(-4),
  };
  add("projects", { id: showcaseProject.id }, showcaseProject);

  const approvedProject = {
    id: DEMO_IDS.projects.approved,
    challenge_id: "c-projectile",
    author_id: DEMO_USERS.rohit,
    title: "Why two masses fall together in the ideal model",
    draft:
      "Demo record. I listed the forces on a 2 kg and a 5 kg cart, applied F = m × a with the same net force, and showed that the smaller mass accelerates faster. For ideal free fall the force grows with mass too, so acceleration stays the same. I added a note separating the model from air resistance.",
    evidence_url: "https://demo.aura.local/evidence/pd2-rohit-motion",
    status: "approved",
    reviewer_id: DEMO_USERS.kabir,
    consent_to_showcase: 0,
    created_at: at(-7),
    updated_at: at(-3),
    submitted_at: at(-5),
  };
  add("projects", { id: approvedProject.id }, approvedProject);

  const reviews = [
    {
      id: "pd2-review-led-changes",
      project_id: showcaseProject.id,
      reviewer_id: DEMO_USERS.kabir,
      decision: "changes_requested",
      feedback:
        "Demo review: the resistor maths is correct, but add the measured LED voltage and explain why the nearest standard value is safe before resubmitting.",
      created_at: at(-5),
    },
    {
      id: "pd2-review-led-approved",
      project_id: showcaseProject.id,
      reviewer_id: DEMO_USERS.kabir,
      decision: "approved",
      feedback:
        "Demo review: revision records both measurements and the safety reasoning. Approved for showcase with the author's consent.",
      created_at: at(-3),
    },
    {
      id: "pd2-review-motion-approved",
      project_id: approvedProject.id,
      reviewer_id: DEMO_USERS.kabir,
      decision: "approved",
      feedback:
        "Demo review: force, mass and acceleration are separated correctly, and the ideal-model caveat is clearly stated. Approved; not published because consent was not given.",
      created_at: at(-3, 0.5),
    },
  ];
  for (const r of reviews) add("project_reviews", { id: r.id }, r);

  // ── Events ──────────────────────────────────────────────────────────────
  const recapEvent = {
    id: DEMO_IDS.eventRecap,
    title: "Demo Build Review & Showcase Rehearsal",
    summary:
      "Fictional past workshop: learners presented the resistor calculation and project notes later used in the showcase review.",
    type: "workshop",
    starts_at: at(-8),
    ends_at: at(-8, 2),
    venue: "Engineering Lab 2 (demo)",
    mode: "in_person",
    capacity: 12,
    registration_opens_at: at(-12),
    registration_closes_at: at(-9),
    topic_id: "t-ohm",
    status: "completed",
    is_demo: 1,
  };
  add("events", { id: recapEvent.id }, recapEvent);

  const registrations = [
    { id: "pd2-reg-solder-ananya", event_id: "e-solder", user_id: DEMO_USERS.ananya, status: "registered", created_at: at(-3), attended_at: null },
    { id: "pd2-reg-solder-meera", event_id: "e-solder", user_id: DEMO_USERS.meera, status: "registered", created_at: at(-3), attended_at: null },
    { id: "pd2-reg-school-ananya", event_id: "e-school", user_id: DEMO_USERS.ananya, status: "registered", created_at: at(-2), attended_at: null },
    { id: "pd2-reg-recap-ananya", event_id: recapEvent.id, user_id: DEMO_USERS.ananya, status: "attended", created_at: at(-9), attended_at: at(-8) },
    { id: "pd2-reg-recap-rohit", event_id: recapEvent.id, user_id: DEMO_USERS.rohit, status: "attended", created_at: at(-9), attended_at: at(-8) },
  ];
  for (const r of registrations) {
    add("event_registrations", { event_id: r.event_id, user_id: r.user_id }, r);
  }

  // ── School collaboration ────────────────────────────────────────────────
  const outreachRequest = {
    id: DEMO_IDS.request,
    reference: "AURA-PD1-2001",
    school_name: "Riverside Academy (demo)",
    location: "Jorhat, Assam",
    contact_name: "Demo Liaison (fictional)",
    contact_email: "liaison@riverside.demo.local",
    activity_type: "Follow-up circuit clinic",
    grade_range: "Class 9–10",
    expected_participants: 28,
    preferred_dates: "Fortnight after the scheduled outreach visit",
    facilities: "Projector, lab benches, power sockets",
    message: "Fictional follow-up request used to demonstrate the in-review school workflow.",
    status: "in_review",
    owner_id: DEMO_USERS.devika,
    internal_notes: "Demo-only: awaiting custodian confirmation on a second kit before scheduling.",
    linked_event_id: null,
    created_at: at(-2),
    updated_at: at(-1),
  };
  add("collaboration_requests", { id: outreachRequest.id }, outreachRequest);

  // ── Hardware movement and allocation ────────────────────────────────────
  const movements = [
    { id: "pd2-movement-received", item_id: "i-4", kind: "received", quantity_delta: 2, actor_id: DEMO_USERS.ishaan, reason: "Demo workshop kit top-up", created_at: at(-11) },
    { id: "pd2-movement-resistors", item_id: "i-5", kind: "consumed", quantity_delta: -1, actor_id: DEMO_USERS.ishaan, reason: "LED project build issued to Ananya (demo)", created_at: at(-8) },
    { id: "pd2-movement-leds", item_id: "i-6", kind: "consumed", quantity_delta: -2, actor_id: DEMO_USERS.ishaan, reason: "LED project build issued to Ananya (demo)", created_at: at(-8) },
    { id: "pd2-movement-damaged", item_id: "i-7", kind: "damaged", quantity_delta: -1, actor_id: DEMO_USERS.ishaan, reason: "Probe lead worn during a demo check", created_at: at(-3) },
  ];
  for (const m of movements) add("stock_movements", { id: m.id }, m);

  const allocations = [
    {
      id: DEMO_IDS.allocations.resistorKit,
      item_id: "i-5", quantity: 1, recipient_id: DEMO_USERS.ananya,
      recipient_label: "Ananya Baruah — LED indicator project (demo)",
      linked_event_id: null,
      linked_collaboration_id: null,
      linked_project_id: showcaseProject.id,
      issued_at: at(-8), expected_return_at: at(-1), returned_at: at(-2),
      condition_on_issue: "good", condition_on_return: "good",
      issued_by_id: DEMO_USERS.ishaan, returned_by_id: DEMO_USERS.ishaan,
      notes: "Resistor assortment issued for the demo build; returned with unused values.",
    },
    {
      id: DEMO_IDS.allocations.ledPack,
      item_id: "i-6", quantity: 2, recipient_id: DEMO_USERS.ananya,
      recipient_label: "Ananya Baruah — LED indicator project (demo)",
      linked_event_id: null,
      linked_collaboration_id: null,
      linked_project_id: showcaseProject.id,
      issued_at: at(-8), expected_return_at: at(-1), returned_at: at(-2),
      condition_on_issue: "good", condition_on_return: "good",
      issued_by_id: DEMO_USERS.ishaan, returned_by_id: DEMO_USERS.ishaan,
      notes: "Two demo LEDs; neither was returned because they were consumed in the build.",
    },
    {
      id: DEMO_IDS.allocations.jumpers,
      item_id: "i-3", quantity: 2, recipient_id: DEMO_USERS.devika,
      recipient_label: "School outreach — Riverside (demo)",
      linked_event_id: "e-school",
      linked_collaboration_id: "sr-2",
      linked_project_id: null,
      issued_at: at(-2), expected_return_at: at(22), returned_at: null,
      condition_on_issue: "good", condition_on_return: null,
      issued_by_id: DEMO_USERS.ishaan, returned_by_id: null,
      notes: "Demo allocation linked to the already-scheduled school request.",
    },
    {
      id: DEMO_IDS.allocations.multimeter,
      item_id: "i-7", quantity: 1, recipient_id: DEMO_USERS.rohit,
      recipient_label: "Rohit Das — motion project measurement (demo)",
      linked_event_id: null,
      linked_collaboration_id: null,
      linked_project_id: approvedProject.id,
      issued_at: at(-5), expected_return_at: at(-3), returned_at: at(-3),
      condition_on_issue: "good", condition_on_return: "fair",
      issued_by_id: DEMO_USERS.ishaan, returned_by_id: DEMO_USERS.ishaan,
      notes: "Returned with a worn probe lead; matching damage movement recorded.",
    },
  ];
  for (const a of allocations) add("resource_allocations", { id: a.id }, a);

  // ── Audit trail ─────────────────────────────────────────────────────────
  const audits = [
    { id: "pd2-audit-tutor", actor_id: DEMO_USERS.ananya, action: "tutor.session_opened", entity_type: "topic", entity_id: "t-ohm", metadata_json: JSON.stringify({ mode: "step-by-step", level: "beginner" }), created_at: at(-6) },
    { id: "pd2-audit-submit", actor_id: DEMO_USERS.ananya, action: "project.submitted", entity_type: "project", entity_id: showcaseProject.id, metadata_json: "{}", created_at: at(-4) },
    { id: "pd2-audit-review", actor_id: DEMO_USERS.kabir, action: "project.reviewed", entity_type: "project", entity_id: showcaseProject.id, metadata_json: JSON.stringify({ decision: "approved" }), created_at: at(-3) },
    { id: "pd2-audit-issue", actor_id: DEMO_USERS.ishaan, action: "inventory.issued", entity_type: "resource_allocation", entity_id: DEMO_IDS.allocations.resistorKit, metadata_json: JSON.stringify({ quantity: 1 }), created_at: at(-8) },
    { id: "pd2-audit-request", actor_id: DEMO_USERS.devika, action: "school_request.status_changed", entity_type: "collaboration_request", entity_id: outreachRequest.id, metadata_json: JSON.stringify({ to: "in_review" }), created_at: at(-1) },
    { id: "pd2-audit-recap", actor_id: DEMO_USERS.devika, action: "event.registration_marked_attended", entity_type: "event", entity_id: recapEvent.id, metadata_json: JSON.stringify({ count: 2 }), created_at: at(-8, 2) },
  ];
  for (const e of audits) add("audit_events", { id: e.id }, e);

  const manifest: DemoManifest = {
    datasetId: DATASET_ID,
    version: DATASET_VERSION,
    generatedAt: iso(asOf),
    rows: rows.map((row) => ({
      table: row.table,
      keys: row.keys,
      columns: Object.keys(row.values),
      hash: rowHash(row),
    })),
  };

  return { asOf: iso(asOf), rows, manifest };
}
