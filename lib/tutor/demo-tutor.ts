/**
 * Demo Tutor provider — deterministic, curated, clearly labelled.
 *
 * Contract: returns a validated TutorResponse for a topic, level and mode.
 * There is deliberately NO live-model path in this build (product decision):
 * the UI shows "Demo tutor · curated response" wherever content is served.
 *
 * Swap-in point for a real provider is documented in docs/architecture.md §6.
 */
import type {
  ExplanationLevel,
  TutorBlock,
  TutorMode,
  TutorResponse,
  TutorSource,
} from "../domain/types";
import { tutorResponseSchema } from "../domain/types";

interface TopicContent {
  title: string;
  summary: string;
  prerequisites: string[];
  keyTerms: { term: string; meaning: string }[];
  formula: { heading: string; body: string } | null;
  analogy: string;
  steps: string[];
  workedExample: string;
  socraticQuestions: string[];
  beginnerSummary: string;
  intermediateSummary: string;
  advancedSummary: string;
  uncertainty?: string;
}

export interface DemoTopicInput {
  topicId: string;
  title: string;
  summary: string;
  prerequisites: { id: string; title: string }[];
  sources: TutorSource[];
}

const CONTENT: Record<string, TopicContent> = {
  "t-ohm": {
    title: "Ohm's Law",
    summary: "Voltage pushes current through resistance, and the three are linked by one simple relationship.",
    prerequisites: ["Series & Parallel Circuits"],
    keyTerms: [
      { term: "Voltage (V)", meaning: "The electrical 'push' provided by a source, measured in volts." },
      { term: "Current (I)", meaning: "How much charge flows each second, measured in amperes." },
      { term: "Resistance (R)", meaning: "How strongly a component opposes that flow, measured in ohms (Ω)." },
    ],
    formula: { heading: "The relationship", body: "V = I × R" },
    analogy:
      "Think of water in a pipe: voltage is the pump pressure, current is the flow rate, and resistance is how narrow the pipe is. Squeeze the pipe (more resistance) and less water flows for the same pump pressure.",
    steps: [
      "Write down what you know: any two of V, I and R.",
      "Pick the rearranged form you need: V = I × R, I = V ÷ R, or R = V ÷ I.",
      "Convert milliamps to amps before calculating (20 mA = 0.02 A).",
      "Substitute the values and keep the unit in the answer.",
    ],
    workedExample:
      "A 9 V battery drives a circuit with a 450 Ω resistor. Current = V ÷ R = 9 ÷ 450 = 0.02 A, which is 20 mA. Check it: 0.02 A × 450 Ω = 9 V ✓",
    socraticQuestions: [
      "If you double the resistance while keeping the voltage fixed, what must happen to the current?",
      "Which two quantities would you measure to calculate the third?",
    ],
    beginnerSummary:
      "Ohm's Law is one sentence: voltage equals current multiplied by resistance. If you know two of the three numbers, you can always find the third.",
    intermediateSummary:
      "Ohm's Law links the three fundamental electrical quantities: V = I × R. It holds for ohmic components — those whose resistance stays constant as voltage changes — and lets you size components in real circuits.",
    advancedSummary:
      "V = I × R is the linear constitutive relation for an ideal resistor. It underpins analytical circuit simplification; for non-ohmic elements (diodes, LEDs) the relation is non-linear and Ohm's Law applies only to the passive parts of the circuit.",
    uncertainty:
      "Real components drift with temperature; calculations here assume ideal values at room temperature.",
  },
  "t-series": {
    title: "Series & Parallel Circuits",
    summary: "Chained components share current; split branches share voltage.",
    prerequisites: ["Ohm's Law"],
    keyTerms: [
      { term: "Series", meaning: "Components on one path: the same current flows through each." },
      { term: "Parallel", meaning: "Components across the same two points: each sees the same voltage." },
    ],
    formula: { heading: "Equivalent resistance", body: "Series: R = R₁ + R₂ + …   Parallel: 1/R = 1/R₁ + 1/R₂ + …" },
    analogy:
      "Two narrow sections of pipe in a row make the whole pipe harder to push through (series). Two parallel pipes give water an extra route (parallel).",
    steps: [
      "Trace the path from the source and back — is there only one route? Then it is series.",
      "For series sections, add resistances.",
      "For parallel sections, add reciprocals and invert the total.",
      "Recombine sections step by step until one equivalent resistance remains.",
    ],
    workedExample:
      "Two 100 Ω resistors in parallel: 1/R = 1/100 + 1/100 = 1/50, so R = 50 Ω. Two in series: 100 + 100 = 200 Ω.",
    socraticQuestions: [
      "Why does adding a resistor in parallel lower the total resistance?",
      "In a series string, why is it risky for one component to fail open?",
    ],
    beginnerSummary:
      "In a series circuit everything shares one path. In a parallel circuit the current can choose branches. That changes how resistance adds up.",
    intermediateSummary:
      "Series rules: R adds, current is common, voltages divide. Parallel rules: voltage is common, currents divide, conductances add. These two rules let you collapse almost any resistive network.",
    advancedSummary:
      "Network reduction via series/parallel combination is the crudest form of circuit analysis; delta–star transforms and nodal analysis extend it to non-reducible networks.",
  },
  "t-newton": {
    title: "Newton's Second Law",
    summary: "Force changes motion in proportion to mass: a larger push means faster acceleration, a heavier object means slower.",
    prerequisites: ["Fractions & Ratios"],
    keyTerms: [
      { term: "Force (F)", meaning: "A push or pull, measured in newtons." },
      { term: "Mass (m)", meaning: "How much matter is being accelerated, in kilograms." },
      { term: "Acceleration (a)", meaning: "How quickly velocity changes, in m/s²." },
    ],
    formula: { heading: "The relationship", body: "F = m × a" },
    analogy:
      "Pushing a shopping trolley: an empty trolley (small mass) jumps forward; a fully loaded one accelerates slowly for the same push.",
    steps: [
      "Draw the object and list the forces acting on it.",
      "Add the forces as vectors to get the net force.",
      "Rearrange F = m × a for the quantity you need.",
      "Substitute with units and sanity-check the size of the answer.",
    ],
    workedExample:
      "A 2 kg cart is pushed with a net force of 6 N. Acceleration = F ÷ m = 6 ÷ 2 = 3 m/s².",
    socraticQuestions: [
      "If you double the mass but want the same acceleration, how must the force change?",
      "What is the net force on an object moving at constant velocity?",
    ],
    beginnerSummary:
      "Force equals mass times acceleration. The same push gives a light object more acceleration than a heavy one.",
    intermediateSummary:
      "ΣF = m × a relates net force to the rate of change of momentum. Identifying the net force — not any single applied force — is the step where most mistakes happen.",
    advancedSummary:
      "F = dp/dt generalises Newton's second law to variable mass; the constant-mass form F = ma is the special case used in most coursework problems.",
  },
  "t-fractions": {
    title: "Fractions & Ratios",
    summary: "Parts of a whole, and how to combine them without losing track of the denominator.",
    prerequisites: [],
    keyTerms: [
      { term: "Numerator", meaning: "The top number: how many parts you have." },
      { term: "Denominator", meaning: "The bottom number: how many parts the whole is cut into." },
    ],
    formula: null,
    analogy:
      "Cutting a pizza: if you have half the pizza and your friend has a third, you want slices the same size before you count them together.",
    steps: [
      "To add or subtract: make denominators the same first.",
      "To multiply: multiply numerators and denominators directly.",
      "To divide: multiply by the reciprocal.",
      "To simplify: divide both parts by the greatest common factor.",
    ],
    workedExample: "1/2 + 1/3 → 3/6 + 2/6 = 5/6.",
    socraticQuestions: [
      "Why can't you just add the tops and the bottoms of 1/2 and 1/3?",
      "Which is larger: 2/3 or 3/5? How can you tell without a calculator?",
    ],
    beginnerSummary:
      "A fraction is a piece of a whole. To combine pieces you first make them the same size by using a common denominator.",
    intermediateSummary:
      "Fraction operations reduce to finding common denominators and simplifying with GCD. Ratio problems use the same skills scaled up.",
    advancedSummary:
      "Rational arithmetic is the base case of field arithmetic; comfort with simplification and common denominators underpins algebraic manipulation later.",
  },
  "t-algebra": {
    title: "Linear Equations",
    summary: "Keep both sides balanced and you can always isolate the unknown.",
    prerequisites: ["Fractions & Ratios"],
    keyTerms: [{ term: "Variable", meaning: "A letter standing for an unknown number." }],
    formula: { heading: "General form", body: "ax + b = c  ⇒  x = (c − b) ÷ a" },
    analogy: "A balance scale: whatever you do to one side you must do to the other, or it tips.",
    steps: [
      "Simplify each side separately.",
      "Move the constant term away from the variable's side.",
      "Divide by the variable's coefficient.",
      "Substitute your answer back to check it.",
    ],
    workedExample: "3x + 4 = 19 → 3x = 15 → x = 5.",
    socraticQuestions: [
      "What operation would you undo first in 3x + 4 = 19, and why?",
      "How can you check a solution in ten seconds?",
    ],
    beginnerSummary:
      "You are keeping two sides equal while peeling operations away from the unknown, like unwrapping a parcel.",
    intermediateSummary:
      "Linear equations are solved by inverse operations applied in reverse order of precedence, preserving equality at each step.",
    advancedSummary:
      "Systems of linear equations generalise to matrix methods; single-variable techniques remain the intuition pump for row reduction.",
  },
  "t-arrays": {
    title: "Arrays & Lists",
    summary: "Ordered storage where position is cheap and insertion can be expensive.",
    prerequisites: [],
    keyTerms: [
      { term: "Index", meaning: "The position of an element, counted from 0 in most languages." },
      { term: "Contiguous", meaning: "Elements sit next to each other in memory." },
    ],
    formula: null,
    analogy:
      "A row of numbered lockers: reaching locker 42 by number is instant, but squeezing a new locker into the middle means shifting everything after it.",
    steps: [
      "Identify whether you need fast lookups or fast insertions.",
      "Use indexing for direct access, O(1).",
      "Remember that insertion in the middle shifts later elements, O(n).",
      "Prefer appending when order allows.",
    ],
    workedExample:
      "In [10, 20, 30], the element at index 1 is 20. Inserting 15 after it shifts 30 one place to the right.",
    socraticQuestions: [
      "Why is accessing index 500 of a list as fast as index 0?",
      "Which operation gets slower as a list grows?",
    ],
    beginnerSummary:
      "An array stores values in order and lets you jump straight to any position by number.",
    intermediateSummary:
      "Arrays give O(1) random access at the cost of O(n) insertion/deletion in the middle; dynamic lists amortise growth by over-allocating capacity.",
    advancedSummary:
      "Cache locality makes array traversal far faster in practice than pointer-chasing structures despite equal asymptotic bounds; amortised analysis explains dynamic-array appends at O(1) average cost.",
  },
  "t-complexity": {
    title: "Big-O Basics",
    summary: "A way to describe how work grows as input grows, ignoring constant factors.",
    prerequisites: ["Arrays & Lists"],
    keyTerms: [
      { term: "Growth rate", meaning: "How a function's cost increases as n increases." },
      { term: "Asymptotic", meaning: "Concerned with behaviour for large n, not small." },
    ],
    formula: { heading: "Common growth", body: "O(1) < O(log n) < O(n) < O(n log n) < O(n²)" },
    analogy:
      "Finding a name in a sorted phone book: open the middle, halve, repeat — that's logarithmic. Reading every page is linear.",
    steps: [
      "Count the operations that depend on n.",
      "Drop constants and lower-order terms.",
      "Name the dominant term (for example n² → O(n²)).",
      "Check the worst case that matters for your use.",
    ],
    workedExample:
      "A loop that scans a list once costs O(n). A nested loop over the same list costs O(n²).",
    socraticQuestions: [
      "Why do we ignore the constant factor in Big-O?",
      "Which is faster for large n: O(n log n) or O(n²)?",
    ],
    beginnerSummary:
      "Big-O is a label for how quickly work grows. Doubling the input inside a loop of loops hurts much more than a single pass.",
    intermediateSummary:
      "Big-O describes the asymptotic upper bound of growth. It guides algorithm choice; it does not promise real-world speed.",
    advancedSummary:
      "Big-O is one bound family among Θ, Ω; amortised and average-case analysis may materially differ from worst-case complexity for the same algorithm.",
  },
};

function levelSummary(c: TopicContent, level: ExplanationLevel) {
  if (level === "beginner") return c.beginnerSummary;
  if (level === "intermediate") return c.intermediateSummary;
  return c.advancedSummary;
}

function modeBlocks(c: TopicContent, mode: TutorMode): TutorBlock[] {
  const keyIdea: TutorBlock = {
    kind: "text",
    heading: "Key idea",
    body: c.summary,
  };
  const analogy: TutorBlock = { kind: "example", heading: "A way to picture it", body: c.analogy };
  const steps: TutorBlock = {
    kind: "steps",
    heading: "How to work through it",
    body: "A reliable procedure you can reuse:",
    items: c.steps,
  };
  const formula: TutorBlock | null = c.formula
    ? { kind: "formula", heading: c.formula.heading, body: c.formula.body }
    : null;
  const worked: TutorBlock = {
    kind: "example",
    heading: "Worked example",
    body: c.workedExample,
  };
  const socratic: TutorBlock = {
    kind: "question",
    heading: "Think it through",
    body: "Answer these in your own words before looking ahead:",
    items: c.socraticQuestions,
  };

  switch (mode) {
    case "simple":
      return [keyIdea, analogy, ...(formula ? [formula] : [])];
    case "step-by-step":
      return [keyIdea, steps, ...(formula ? [formula] : []), worked];
    case "example-first":
      return [worked, keyIdea, analogy, ...(formula ? [formula] : [])];
    case "socratic":
      return [socratic, keyIdea];
  }
}

export interface DemoRequest {
  topic: DemoTopicInput;
  level: ExplanationLevel;
  mode: TutorMode;
  question?: string;
}

export function buildDemoTutorResponse(req: DemoRequest): TutorResponse {
  const { topic, level, mode, question } = req;
  const content = CONTENT[topic.topicId];
  const nowIso = new Date().toISOString();

  if (!content) {
    // Honest fallback for topics without curated content
    const fallback: TutorResponse = {
      provider: "demo",
      topicId: topic.topicId,
      level,
      mode,
      summary: `This prototype's demo tutor does not yet have a curated explanation for “${topic.title}”. It will not invent one.`,
      blocks: [
        {
          kind: "warning",
          heading: "Curated content missing",
          body: `Choose a topic with reviewed demo content (Ohm's Law, Series & Parallel, Newton's Second Law, Fractions, Linear Equations, Arrays, Big-O), or ask a mentor. Fabricating an explanation would be worse than admitting the gap.`,
        },
      ],
      nextStep: {
        label: "Open a topic with curated demo content",
        reason: "The demo tutor is deterministic and only answers from reviewed seed content.",
      },
      sources: [],
      generatedAt: nowIso,
    };
    return tutorResponseSchema.parse(fallback);
  }

  const blocks: TutorBlock[] = [];
  const effectiveMode: TutorMode =
    question && /hint|stuck|don'?t get|confused|help me think/i.test(question) ? "socratic" : mode;

  if (question && question.trim().length > 0 && effectiveMode !== mode) {
    blocks.push({
      kind: "text",
      heading: "Your question",
      body: `You asked: “${question.trim()}”. In hints mode the demo tutor starts with guiding questions instead of the full answer — try answering one before revealing the explanation.`,
    });
  } else if (question && question.trim().length > 0) {
    blocks.push({
      kind: "text",
      heading: "Your question",
      body: `You asked: “${question.trim()}”. This demo tutor answers from curated notes for “${content.title}”. Here is the explanation at your selected level and mode.`,
    });
  }

  blocks.push(...modeBlocks(content, effectiveMode));

  const prereqNote =
    topic.prerequisites.length > 0
      ? `${content.title} builds on ${topic.prerequisites.map((p) => `“${p.title}”`).join(" and ")}. If any step below feels unfamiliar, revisit that topic first — the practice check will guide you.`
      : undefined;

  return tutorResponseSchema.parse({
    provider: "demo",
    topicId: topic.topicId,
    level,
    mode,
    summary: levelSummary(content, level),
    blocks,
    prerequisiteNote: prereqNote,
    nextStep: {
      label: "Answer the understanding check below",
      reason:
        "Reading an explanation is not evidence of learning. One short attempt gives the adaptive step something real to work with.",
    },
    sources: topic.sources,
    uncertaintyNote: content.uncertainty,
    generatedAt: nowIso,
  });
}

export function getCuratedTopics(): string[] {
  return Object.keys(CONTENT);
}
