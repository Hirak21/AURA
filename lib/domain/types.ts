import { z } from "zod";

/* ============================================================
   Shared enums — single source of truth for statuses.
   Stored as TEXT in SQLite, validated by zod at boundaries.
   ============================================================ */

export const ROLES = [
  "student",
  "member",
  "mentor",
  "curator",
  "reviewer",
  "organizer",
  "liaison",
  "custodian",
  "admin",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  member: "Member",
  mentor: "Mentor",
  curator: "Learning Curator",
  reviewer: "Reviewer",
  organizer: "Event Organizer",
  liaison: "School Liaison",
  custodian: "Inventory Custodian",
  admin: "Association Admin",
};

export const EXPLANATION_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExplanationLevel = (typeof EXPLANATION_LEVELS)[number];

export const TUTOR_MODES = ["simple", "step-by-step", "example-first", "socratic"] as const;
export type TutorMode = (typeof TUTOR_MODES)[number];

export const MODE_LABELS: Record<TutorMode, string> = {
  simple: "Simple",
  "step-by-step": "Step-by-step",
  "example-first": "Example first",
  socratic: "Hints / Socratic",
};

export const LEVEL_LABELS: Record<ExplanationLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const DIFFICULTIES = ["intro", "core", "stretch"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPES = ["mcq", "numeric", "short"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const PROJECT_STATUSES = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "showcased",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  submitted: "Submitted — awaiting review",
  changes_requested: "Changes requested",
  approved: "Approved",
  showcased: "Showcased",
};

export const REGISTRATION_STATUSES = ["registered", "cancelled", "attended"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const EVENT_STATUSES = ["draft", "published", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REQUEST_STATUSES = [
  "new",
  "in_review",
  "approved",
  "scheduled",
  "completed",
  "declined",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  completed: "Completed",
  declined: "Declined",
};

export const MOVEMENT_TYPES = ["received", "adjusted", "damaged", "consumed"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/* Legal status transitions (used by server actions) */
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  new: ["in_review", "declined"],
  in_review: ["approved", "declined"],
  approved: ["scheduled", "declined"],
  scheduled: ["completed"],
  completed: [],
  declined: [],
};

export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["submitted"],
  submitted: ["changes_requested", "approved"],
  changes_requested: ["submitted"],
  approved: ["showcased"],
  showcased: [],
};

/* ============================================================
   Tutor response contract
   The Demo Tutor and any future live provider MUST return this
   shape. The UI renders it; it never parses free text.
   ============================================================ */

export const tutorBlockSchema = z.object({
  kind: z.enum(["text", "steps", "formula", "example", "warning", "question"]),
  heading: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  items: z.array(z.string().min(1).max(1000)).max(12).optional(),
});
export type TutorBlock = z.infer<typeof tutorBlockSchema>;

export const tutorSourceSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  url: z.string().min(1),
  isDemo: z.boolean(),
});
export type TutorSource = z.infer<typeof tutorSourceSchema>;

export const tutorResponseSchema = z.object({
  provider: z.literal("demo"),
  topicId: z.string().min(1),
  level: z.enum(EXPLANATION_LEVELS),
  mode: z.enum(TUTOR_MODES),
  summary: z.string().min(1).max(1200),
  blocks: z.array(tutorBlockSchema).min(1).max(8),
  prerequisiteNote: z.string().max(600).optional(),
  checkQuestionId: z.string().optional(),
  nextStep: z.object({
    label: z.string().min(1).max(200),
    reason: z.string().min(1).max(400),
  }),
  sources: z.array(tutorSourceSchema).max(4),
  uncertaintyNote: z.string().max(400).optional(),
  generatedAt: z.string(),
});
export type TutorResponse = z.infer<typeof tutorResponseSchema>;

/* ============================================================
   Adaptive recommendation contract
   Deterministic, explainable, inspectable. Never claims mastery.
   ============================================================ */

export const recommendationSchema = z.object({
  action: z.enum(["start", "revisit", "drill_prereq", "more_practice", "advance"]),
  topicId: z.string(),
  relatedTopicId: z.string().optional(),
  label: z.string(),
  reason: z.string(),
  evidence: z.array(z.string()).min(1).max(4),
});
export type Recommendation = z.infer<typeof recommendationSchema>;

/* ============================================================
   Practice / evidence contracts
   ============================================================ */

export interface AttemptRecord {
  questionId: string;
  topicId: string;
  isCorrect: boolean;
  createdAt: string;
  confidence?: number | null;
}

export interface QuestionForGrading {
  id: string;
  topicId: string;
  type: QuestionType;
  answer: string;
  acceptedAnswers: string[];
  difficulty: Difficulty;
  prompt: string;
  explanation: string;
  hint: string;
  options: { id: string; label: string }[];
}

export interface GradeResult {
  isCorrect: boolean;
  feedback: string;
  correctAnswerDisplay: string;
}

export type TopicEvidenceState =
  | "not_started"
  | "exploring"
  | "practicing"
  | "building"
  | "applied";

export const EVIDENCE_LABELS: Record<TopicEvidenceState, string> = {
  not_started: "Not started",
  exploring: "Explored",
  practicing: "Practising",
  building: "Building evidence",
  applied: "Applied in a project",
};
