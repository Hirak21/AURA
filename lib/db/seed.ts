/**
 * AURA demo seed — small, coherent, clearly fictional.
 * All people are invented. All resources are internally authored demo notes.
 * Refresh dates are relative to seed time so the demo never looks stale.
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "../security/password";

const iso = (d: Date) => d.toISOString();
const now = () => new Date();
const days = (n: number) => new Date(Date.now() + n * 86_400_000);
const hours = (n: number) => new Date(Date.now() + n * 3_600_000);

export const IDS = {
  users: {
    ananya: "u-ananya",
    rohit: "u-rohit",
    meera: "u-meera",
    kabir: "u-kabir",
    devika: "u-devika",
    ishaan: "u-ishaan",
    jyoti: "u-jyoti",
  },
  subjects: { physics: "s-physics", maths: "s-maths", cs: "s-cs" },
  topics: {
    ohm: "t-ohm",
    series: "t-series",
    newton: "t-newton",
    fractions: "t-fractions",
    algebra: "t-algebra",
    complexity: "t-complexity",
    arrays: "t-arrays",
  },
  challenge: "c-led-circuit",
  events: { soldering: "e-solder", schoolVisit: "e-school" },
  requests: { newReq: "sr-1", scheduledReq: "sr-2" },
};

type Row = Record<string, unknown>;
export interface SeedTable {
  table: string;
  rows: Row[];
}

export function buildSeed(): SeedTable[] {
  const t0 = now();

  // One shared demo password is intentional: these are fictional accounts in a
  // demo dataset. Real users created with scripts/create-user.ts get a unique
  // scrypt salt. Set AURA_SEED_PASSWORD before `npm run db:init` to change it.
  const demoPassword = process.env.AURA_SEED_PASSWORD ?? "aura-demo-2026";
  const demoHash = hashPassword(demoPassword);
  const demoPasswordUpdatedAt = iso(days(-1));

  const users: Row[] = [
    {
      id: IDS.users.ananya, displayName: "Ananya Baruah", email: "ananya@demo.aura.local",
      status: "active", preferredLevel: "beginner", learningGoal: "Build a working sensor project on breadboard",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-21)),
    },
    {
      id: IDS.users.rohit, displayName: "Rohit Das", email: "rohit@demo.aura.local",
      status: "active", preferredLevel: "intermediate", learningGoal: "Understand motion for mechanics elective",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-30)),
    },
    {
      id: IDS.users.meera, displayName: "Meera Kalita", email: "meera@demo.aura.local",
      status: "active", preferredLevel: "beginner", learningGoal: "Pass maths foundation checks",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-14)),
    },
    {
      id: IDS.users.kabir, displayName: "Kabir Ahmed", email: "kabir@demo.aura.local",
      status: "active", preferredLevel: "advanced", learningGoal: "Mentor electronics builds",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-60)),
    },
    {
      id: IDS.users.devika, displayName: "Devika Sharma", email: "devika@demo.aura.local",
      status: "active", preferredLevel: "intermediate", learningGoal: "Coordinate school outreach",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-90)),
    },
    {
      id: IDS.users.ishaan, displayName: "Ishaan Gogoi", email: "ishaan@demo.aura.local",
      status: "active", preferredLevel: "beginner", learningGoal: "Manage lab inventory",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-45)),
    },
    {
      id: IDS.users.jyoti, displayName: "Jyoti Nath", email: "jyoti@demo.aura.local",
      status: "active", preferredLevel: "beginner", learningGoal: "Run association operations",
      isDemo: true, passwordHash: demoHash, passwordUpdatedAt: demoPasswordUpdatedAt, createdAt: iso(days(-120)),
    },
  ];

  const userRoles: Row[] = [
    { userId: IDS.users.ananya, role: "student" },
    { userId: IDS.users.rohit, role: "student" },
    { userId: IDS.users.rohit, role: "member" },
    { userId: IDS.users.meera, role: "student" },
    { userId: IDS.users.kabir, role: "mentor" },
    { userId: IDS.users.kabir, role: "reviewer" },
    { userId: IDS.users.devika, role: "liaison" },
    { userId: IDS.users.devika, role: "organizer" },
    { userId: IDS.users.ishaan, role: "custodian" },
    { userId: IDS.users.jyoti, role: "admin" },
    { userId: IDS.users.jyoti, role: "curator" },
  ];

  const subjects: Row[] = [
    { id: IDS.subjects.physics, title: "Physics", description: "Circuits, motion and the physical world — the foundation of every AURA robotics build.", sortOrder: 1, published: true },
    { id: IDS.subjects.maths, title: "Mathematics", description: "The language underneath engineering: fractions, algebra and problem structure.", sortOrder: 2, published: true },
    { id: IDS.subjects.cs, title: "Computer Science", description: "How machines process information — from arrays to algorithmic thinking.", sortOrder: 3, published: true },
  ];

  const outcomes = (a: string[]) => JSON.stringify(a);

  const topics: Row[] = [
    {
      id: IDS.topics.ohm, subjectId: IDS.subjects.physics, title: "Ohm's Law",
      summary: "Voltage, current and resistance are linked by one relationship. Learn it, then use it to size a resistor for a real LED circuit.",
      difficulty: "core",
      outcomes: outcomes([
        "State the relationship V = I × R in your own words",
        "Rearrange it to find any one quantity from the other two",
        "Choose a resistor value for an LED given its forward voltage and current",
      ]),
      published: true, sortOrder: 1,
    },
    {
      id: IDS.topics.series, subjectId: IDS.subjects.physics, title: "Series & Parallel Circuits",
      summary: "How current and voltage behave when components are chained or split across branches.",
      difficulty: "core",
      outcomes: outcomes([
        "Identify series and parallel sections in a diagram",
        "Compute equivalent resistance for simple combinations",
      ]),
      published: true, sortOrder: 2,
    },
    {
      id: IDS.topics.newton, subjectId: IDS.subjects.physics, title: "Newton's Second Law",
      summary: "Force, mass and acceleration: why heavier things resist motion and how the same push changes outcomes.",
      difficulty: "core",
      outcomes: outcomes([
        "Explain F = m × a using a real example",
        "Solve one-step problems for force, mass or acceleration",
      ]),
      published: true, sortOrder: 3,
    },
    {
      id: IDS.topics.fractions, subjectId: IDS.subjects.maths, title: "Fractions & Ratios",
      summary: "The prerequisite that quietly breaks algebra. Operations, comparison and ratio reasoning.",
      difficulty: "intro",
      outcomes: outcomes([
        "Add and multiply fractions confidently",
        "Reduce an expression to a ratio in simplest form",
      ]),
      published: true, sortOrder: 1,
    },
    {
      id: IDS.topics.algebra, subjectId: IDS.subjects.maths, title: "Linear Equations",
      summary: "Solving for an unknown when the unknown appears in a balanced expression.",
      difficulty: "core",
      outcomes: outcomes([
        "Rearrange a simple linear equation",
        "Check a solution by substitution",
      ]),
      published: true, sortOrder: 2,
    },
    {
      id: IDS.topics.arrays, subjectId: IDS.subjects.cs, title: "Arrays & Lists",
      summary: "Storing sequences of values and the cost of the operations you perform on them.",
      difficulty: "intro",
      outcomes: outcomes([
        "Explain indexing and why the first index is 0",
        "Describe one operation that is linear in the list length",
      ]),
      published: true, sortOrder: 1,
    },
    {
      id: IDS.topics.complexity, subjectId: IDS.subjects.cs, title: "Big-O Basics",
      summary: "Comparing algorithms by how their work grows with input size, not by stopwatch.",
      difficulty: "stretch",
      outcomes: outcomes([
        "Read a simple Big-O claim and say what it means in practice",
        "Order common growth rates by cost",
      ]),
      published: true, sortOrder: 2,
    },
  ];

  const topicPrerequisites: Row[] = [
    { topicId: IDS.topics.ohm, prerequisiteTopicId: IDS.topics.series },
    { topicId: IDS.topics.series, prerequisiteTopicId: IDS.topics.ohm },
    { topicId: IDS.topics.newton, prerequisiteTopicId: IDS.topics.fractions },
    { topicId: IDS.topics.algebra, prerequisiteTopicId: IDS.topics.fractions },
    { topicId: IDS.topics.complexity, prerequisiteTopicId: IDS.topics.arrays },
  ];

  const resources: Row[] = [
    {
      id: "r-ohm-1", topicId: IDS.topics.ohm, title: "Demo note: Ohm's Law in three lines",
      type: "note", author: "AURA demo content", url: "https://demo.aura.local/notes/ohm-3-lines",
      level: "beginner", reviewStatus: "reviewed", isDemo: true, reviewedAt: iso(days(-10)),
    },
    {
      id: "r-ohm-2", topicId: IDS.topics.ohm, title: "Demo diagram: resistor–LED circuit with labelled parts",
      type: "diagram", author: "AURA demo content", url: "https://demo.aura.local/diagrams/led-circuit",
      level: "beginner", reviewStatus: "reviewed", isDemo: true, reviewedAt: iso(days(-10)),
    },
    {
      id: "r-ohm-3", topicId: IDS.topics.ohm, title: "Demo note: choosing a resistor (worked example)",
      type: "note", author: "AURA demo content", url: "https://demo.aura.local/notes/resistor-sizing",
      level: "intermediate", reviewStatus: "reviewed", isDemo: true, reviewedAt: iso(days(-8)),
    },
    {
      id: "r-newton-1", topicId: IDS.topics.newton, title: "Demo note: F = ma with everyday examples",
      type: "note", author: "AURA demo content", url: "https://demo.aura.local/notes/f-ma-examples",
      level: "beginner", reviewStatus: "reviewed", isDemo: true, reviewedAt: iso(days(-12)),
    },
    {
      id: "r-frac-1", topicId: IDS.topics.fractions, title: "Demo note: the four fraction operations",
      type: "note", author: "AURA demo content", url: "https://demo.aura.local/notes/fraction-ops",
      level: "beginner", reviewStatus: "reviewed", isDemo: true, reviewedAt: iso(days(-15)),
    },
  ];

  const practiceQuestions: Row[] = [
    {
      id: "q-ohm-1", topicId: IDS.topics.ohm, type: "mcq",
      prompt: "A battery pushes current through a resistor. Which statement is correct?",
      optionsJson: JSON.stringify([
        { id: "a", label: "Increasing resistance increases current for the same voltage" },
        { id: "b", label: "Current equals voltage divided by resistance" },
        { id: "c", label: "Voltage equals resistance divided by current" },
        { id: "d", label: "Current and resistance are unrelated to voltage" },
      ]),
      answer: "b",
      acceptedAnswersJson: "[]",
      explanation: "Ohm's Law gives I = V / R, so current falls as resistance rises.",
      hint: "Start from V = I × R and rearrange for I.",
      difficulty: "intro", reviewStatus: "reviewed",
    },
    {
      id: "q-ohm-2", topicId: IDS.topics.ohm, type: "numeric",
      prompt: "A 6 V supply drives 3 A through a resistor. What is the resistance, in ohms? (Enter the number.)",
      optionsJson: "[]", answer: "2", acceptedAnswersJson: JSON.stringify(["2", "2.0"]),
      explanation: "R = V / I = 6 V ÷ 3 A = 2 Ω.",
      hint: "Use R = V ÷ I.", difficulty: "core", reviewStatus: "reviewed",
    },
    {
      id: "q-ohm-3", topicId: IDS.topics.ohm, type: "numeric",
      prompt: "An LED needs 20 mA and drops 2 V. With a 5 V supply, what resistance (Ω) should go in series? (Enter the number.)",
      optionsJson: "[]", answer: "150", acceptedAnswersJson: JSON.stringify(["150", "150.0"]),
      explanation: "The resistor takes the leftover 3 V at 0.02 A: R = 3 ÷ 0.02 = 150 Ω.",
      hint: "First find the voltage the resistor must drop: 5 V − 2 V. Then R = V ÷ I with I in amperes.",
      difficulty: "stretch", reviewStatus: "reviewed",
    },
    {
      id: "q-newton-1", topicId: IDS.topics.newton, type: "mcq",
      prompt: "The same 10 N push is applied to a 2 kg cart and a 5 kg cart. What happens?",
      optionsJson: JSON.stringify([
        { id: "a", label: "The 5 kg cart accelerates faster" },
        { id: "b", label: "Both accelerate equally" },
        { id: "c", label: "The 2 kg cart accelerates faster" },
        { id: "d", label: "Neither accelerates" },
      ]),
      answer: "c",
      acceptedAnswersJson: "[]",
      explanation: "a = F / m, so lower mass gives higher acceleration for the same force.",
      hint: "Look at where mass sits in a = F ÷ m.", difficulty: "intro", reviewStatus: "reviewed",
    },
    {
      id: "q-newton-2", topicId: IDS.topics.newton, type: "numeric",
      prompt: "A 4 kg object accelerates at 3 m/s². What net force acts on it, in newtons?",
      optionsJson: "[]", answer: "12", acceptedAnswersJson: JSON.stringify(["12", "12.0"]),
      explanation: "F = m × a = 4 × 3 = 12 N.",
      hint: "Multiply mass by acceleration.", difficulty: "core", reviewStatus: "reviewed",
    },
    {
      id: "q-frac-1", topicId: IDS.topics.fractions, type: "numeric",
      prompt: "What is 1/2 + 1/3? Enter the decimal value to two places.",
      optionsJson: "[]", answer: "0.83", acceptedAnswersJson: JSON.stringify(["0.83", "0.833"]),
      explanation: "1/2 + 1/3 = 3/6 + 2/6 = 5/6 ≈ 0.83.",
      hint: "Give both fractions the same denominator before adding.", difficulty: "intro",
      reviewStatus: "reviewed",
    },
    {
      id: "q-frac-2", topicId: IDS.topics.fractions, type: "short",
      prompt: "Reduce 6/8 to its simplest form (e.g. '3/4').",
      optionsJson: "[]", answer: "3/4",
      acceptedAnswersJson: JSON.stringify(["3/4", "three quarters", "3 quarters"]),
      explanation: "Divide numerator and denominator by their common factor 2.",
      hint: "What number divides both 6 and 8?", difficulty: "intro", reviewStatus: "reviewed",
    },
    {
      id: "q-algebra-1", topicId: IDS.topics.algebra, type: "numeric",
      prompt: "Solve for x: 3x + 4 = 19. Enter the value of x.",
      optionsJson: "[]", answer: "5", acceptedAnswersJson: JSON.stringify(["5", "5.0"]),
      explanation: "3x = 15, so x = 5.",
      hint: "Subtract 4 from both sides first.", difficulty: "core", reviewStatus: "reviewed",
    },
    {
      id: "q-arrays-1", topicId: IDS.topics.arrays, type: "mcq",
      prompt: "In most languages, what is the index of the first element in a list?",
      optionsJson: JSON.stringify([
        { id: "a", label: "0" }, { id: "b", label: "1" }, { id: "c", label: "It depends on length" }, { id: "d", label: "−1" },
      ]),
      answer: "a", acceptedAnswersJson: "[]",
      explanation: "Most languages index from 0, so the first element sits at index 0 and the last at length − 1.",
      hint: "Think about offset from the start of the memory block.", difficulty: "intro", reviewStatus: "reviewed",
    },
    {
      id: "q-complexity-1", topicId: IDS.topics.complexity, type: "mcq",
      prompt: "Which grows slowest as input size n doubles?",
      optionsJson: JSON.stringify([
        { id: "a", label: "O(n²)" }, { id: "b", label: "O(n log n)" }, { id: "c", label: "O(log n)" }, { id: "d", label: "O(n)" },
      ]),
      answer: "c", acceptedAnswersJson: "[]",
      explanation: "Logarithmic growth adds only a constant amount of work when n doubles.",
      hint: "Which function increases by a constant when its input doubles?", difficulty: "stretch", reviewStatus: "reviewed",
    },
  ];

  const challenges: Row[] = [
    {
      id: IDS.challenge, topicId: IDS.topics.ohm,
      title: "Design a safe LED circuit",
      summary: "Pick a resistor so an LED runs at its rated current from a 5 V supply — then explain the choice in your own words.",
      objective: "Produce a short written design note that states your target current, the voltage the resistor must drop, the resistance you choose from the nearest standard value, and how you would check your work on a breadboard.",
      requiredConceptsJson: JSON.stringify(["Ohm's Law", "Voltage divider logic", "Standard resistor values", "LED forward voltage"]),
      estimatedHours: 2, published: true,
    },
    {
      id: "c-projectile", topicId: IDS.topics.newton,
      title: "Model a falling object",
      summary: "Use F = ma to estimate acceleration for two different masses and explain why the results match.",
      objective: "Write down the forces acting on a falling object, apply F = ma for two masses, and explain why acceleration does not depend on mass in the ideal case.",
      requiredConceptsJson: JSON.stringify(["Newton's Second Law", "Free-body reasoning"]),
      estimatedHours: 1, published: true,
    },
  ];

  const projects: Row[] = [
    {
      id: "p-seed-1", challengeId: IDS.challenge, authorId: IDS.users.rohit,
      title: "LED indicator for a breadboard power rail",
      draft: "Target current 20 mA. Supply 5 V, LED drops 2 V, so the resistor takes 3 V. R = 3 ÷ 0.02 = 150 Ω. Chose 150 Ω (standard). Verified with a multimeter across the resistor: 2.98 V, so current ≈ 19.9 mA.",
      evidenceUrl: "https://demo.aura.local/evidence/rohit-led",
      status: "submitted", reviewerId: IDS.users.kabir, consentToShowcase: true,
      createdAt: iso(days(-3)), updatedAt: iso(days(-1)), submittedAt: iso(days(-1)),
    },
  ];

  const projectReviews: Row[] = [];

  const events: Row[] = [
    {
      id: IDS.events.soldering, title: "Intro to Soldering & Breadboards (demo workshop)",
      summary: "Hands-on session: read a schematic, build the resistor–LED circuit from the Ohm's Law topic, and solder your first joint. Equipment provided from the demo inventory.",
      type: "workshop", startsAt: iso(days(9)), endsAt: iso(hours(9 * 24 + 2)),
      venue: "Engineering Lab 2 (demo)", mode: "in_person", capacity: 20,
      registrationOpensAt: iso(days(-5)), registrationClosesAt: iso(days(7)),
      topicId: IDS.topics.ohm, status: "published", isDemo: true,
    },
    {
      id: IDS.events.schoolVisit, title: "School Robotics Outreach — Circuit Basics (demo)",
      summary: "AURA volunteers run a 90-minute circuits session for school students. Demo record created from an approved collaboration request.",
      type: "school_visit", startsAt: iso(days(21)), endsAt: iso(hours(21 * 24 + 1.5)),
      venue: "Partner school (demo)", mode: "in_person", capacity: 40,
      registrationOpensAt: iso(days(-2)), registrationClosesAt: iso(days(18)),
      topicId: IDS.topics.ohm, status: "published", isDemo: true,
    },
  ];

  const eventRegistrations: Row[] = [
    {
      id: randomUUID(), eventId: IDS.events.soldering, userId: IDS.users.rohit,
      status: "registered", createdAt: iso(days(-2)), attendedAt: null,
    },
  ];

  const schools: Row[] = [
    { id: "sch-1", name: "Sunrise Public School (demo)", location: "Guwahati, Assam" },
    { id: "sch-2", name: "Riverside Academy (demo)", location: "Jorhat, Assam" },
  ];

  const collaborationRequests: Row[] = [
    {
      id: IDS.requests.newReq, reference: "AURA-SR-1001",
      schoolName: "Sunrise Public School (demo)", location: "Guwahati, Assam",
      contactName: "P. Deka (demo)", contactEmail: "contact@sunrise.demo.local",
      activityType: "Circuit basics workshop", gradeRange: "Class 9–10",
      expectedParticipants: 35, preferredDates: "Any Saturday in the next 6 weeks",
      facilities: "Projector, two long tables, power sockets",
      message: "We would like a beginner-friendly session on circuits for our science club.",
      status: "new", ownerId: null, internalNotes: "", linkedEventId: null,
      createdAt: iso(days(-1)), updatedAt: iso(days(-1)),
    },
    {
      id: IDS.requests.scheduledReq, reference: "AURA-SR-1002",
      schoolName: "Riverside Academy (demo)", location: "Jorhat, Assam",
      contactName: "T. Bora (demo)", contactEmail: "office@riverside.demo.local",
      activityType: "Robotics awareness talk", gradeRange: "Class 11–12",
      expectedParticipants: 60, preferredDates: "Third week of next month",
      facilities: "Auditorium, projector",
      message: "A 60-minute talk on robotics careers and a short demo.",
      status: "scheduled", ownerId: IDS.users.devika,
      internalNotes: "Approved by liaison. Linked workshop created; kit allocation requested from custodian.",
      linkedEventId: IDS.events.schoolVisit,
      createdAt: iso(days(-6)), updatedAt: iso(days(-2)),
    },
  ];

  const inventoryItems: Row[] = [
    { id: "i-1", name: "Arduino Uno R3", category: "Microcontroller board", identifier: "ARD-UNO-001", unit: "pcs", quantityOnHand: 6, condition: "good", location: "Shelf A1", lowStockThreshold: 2, archived: false, notes: "Demo inventory record." },
    { id: "i-2", name: "Solder wire (60/40)", category: "Consumable", identifier: "SOL-6040-01", unit: "rolls", quantityOnHand: 3, condition: "good", location: "Drawer B2", lowStockThreshold: 2, archived: false, notes: "" },
    { id: "i-3", name: "Jumper wires (set of 40)", category: "Cable", identifier: "JMP-40-01", unit: "sets", quantityOnHand: 9, condition: "good", location: "Shelf A3", lowStockThreshold: 3, archived: false, notes: "" },
    { id: "i-4", name: "Breadboard (830 tie-point)", category: "Prototyping", identifier: "BB-830-01", unit: "pcs", quantityOnHand: 12, condition: "good", location: "Shelf A2", lowStockThreshold: 4, archived: false, notes: "" },
    { id: "i-5", name: "Resistor assortment kit", category: "Component", identifier: "RES-KIT-01", unit: "kits", quantityOnHand: 4, condition: "good", location: "Drawer C1", lowStockThreshold: 2, archived: false, notes: "Includes 150 Ω values used in the LED activity." },
    { id: "i-6", name: "LED assortment (5 mm)", category: "Component", identifier: "LED-5MM-01", unit: "packs", quantityOnHand: 7, condition: "good", location: "Drawer C2", lowStockThreshold: 2, archived: false, notes: "" },
    { id: "i-7", name: "Digital multimeter", category: "Instrument", identifier: "DMM-001", unit: "pcs", quantityOnHand: 2, condition: "fair", location: "Shelf D1", lowStockThreshold: 1, archived: false, notes: "One unit has a worn probe lead." },
    { id: "i-8", name: "Soldering iron (25 W)", category: "Tool", identifier: "SRD-25W-01", unit: "pcs", quantityOnHand: 5, condition: "good", location: "Shelf D2", lowStockThreshold: 2, archived: false, notes: "" },
  ];

  const stockMovements: Row[] = inventoryItems.map((item, idx) => ({
    id: randomUUID(), itemId: item.id, kind: "received",
    quantityDelta: item.quantityOnHand as number, actorId: IDS.users.ishaan,
    reason: "Opening demo stock", createdAt: iso(days(-40 + idx)),
  }));

  const resourceAllocations: Row[] = [
    {
      id: "ra-1", itemId: "i-4", quantity: 4, recipientId: IDS.users.devika,
      recipientLabel: "School outreach — Riverside (demo)", linkedEventId: IDS.events.schoolVisit,
      linkedCollaborationId: IDS.requests.scheduledReq, linkedProjectId: null,
      issuedAt: iso(days(-2)), expectedReturnAt: iso(days(22)), returnedAt: null,
      conditionOnIssue: "good", conditionOnReturn: null,
      issuedById: IDS.users.ishaan, returnedById: null, notes: "For the scheduled school workshop.",
    },
  ];

  const mentorAssignments: Row[] = [
    { id: "ma-1", mentorId: IDS.users.kabir, studentId: IDS.users.ananya, scope: "Electronics builds and LED circuit project", status: "active", createdAt: iso(days(-10)) },
    { id: "ma-2", mentorId: IDS.users.kabir, studentId: IDS.users.rohit, scope: "Electronics builds and LED circuit project", status: "active", createdAt: iso(days(-12)) },
    { id: "ma-3", mentorId: IDS.users.devika, studentId: IDS.users.meera, scope: "Maths foundations", status: "active", createdAt: iso(days(-8)) },
  ];

  const auditEvents: Row[] = [
    { id: randomUUID(), actorId: IDS.users.ishaan, action: "inventory.item_created", entityType: "inventory_item", entityId: "i-1", metadataJson: "{}", createdAt: iso(days(-40)) },
    { id: randomUUID(), actorId: IDS.users.ishaan, action: "inventory.issued", entityType: "resource_allocation", entityId: "ra-1", metadataJson: JSON.stringify({ quantity: 4 }), createdAt: iso(days(-2)) },
    { id: randomUUID(), actorId: IDS.users.devika, action: "school_request.status_changed", entityType: "collaboration_request", entityId: IDS.requests.scheduledReq, metadataJson: JSON.stringify({ to: "scheduled" }), createdAt: iso(days(-2)) },
  ];

  const tutorMessages: Row[] = [];
  const practiceAttempts: Row[] = [
    {
      id: randomUUID(), userId: IDS.users.rohit, questionId: "q-ohm-1", topicId: IDS.topics.ohm,
      response: "b", isCorrect: true, feedback: "Correct. Ohm's Law gives I = V / R.",
      confidence: 4, createdAt: iso(days(-2)),
    },
  ];
  const learningGoals: Row[] = [];
  const bookmarks: Row[] = [];
  const tutorSessions: Row[] = [];

  void t0;

  return [
    { table: "users", rows: users },
    { table: "user_roles", rows: userRoles },
    { table: "subjects", rows: subjects },
    { table: "topics", rows: topics },
    { table: "topic_prerequisites", rows: topicPrerequisites },
    { table: "resources", rows: resources },
    { table: "practice_questions", rows: practiceQuestions },
    { table: "tutor_sessions", rows: tutorSessions },
    { table: "tutor_messages", rows: tutorMessages },
    { table: "practice_attempts", rows: practiceAttempts },
    { table: "learning_goals", rows: learningGoals },
    { table: "bookmarks", rows: bookmarks },
    { table: "challenges", rows: challenges },
    { table: "projects", rows: projects },
    { table: "project_reviews", rows: projectReviews },
    { table: "events", rows: events },
    { table: "event_registrations", rows: eventRegistrations },
    { table: "schools", rows: schools },
    { table: "collaboration_requests", rows: collaborationRequests },
    { table: "inventory_items", rows: inventoryItems },
    { table: "stock_movements", rows: stockMovements },
    { table: "resource_allocations", rows: resourceAllocations },
    { table: "mentor_assignments", rows: mentorAssignments },
    { table: "audit_events", rows: auditEvents },
  ];
}
