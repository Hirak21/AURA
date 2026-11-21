import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

/* Identity */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  preferredLevel: text("preferred_level", { enum: ["beginner", "intermediate", "advanced"] })
    .notNull()
    .default("beginner"),
  learningGoal: text("learning_goal"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
  /** scrypt hash. Null means "no password set" (demo cookie accounts). */
  passwordHash: text("password_hash"),
  passwordUpdatedAt: text("password_updated_at"),
  createdAt: text("created_at").notNull(),
});

/**
 * Server-side sessions. The cookie carries an opaque 256-bit token; the table
 * stores only its SHA-256 digest, so a database leak does not hand over live
 * session cookies. Expired rows are deleted lazily on read.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token), hex
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    ipHash: text("ip_hash").notNull().default(""),
  },
  (t) => ({
    userIdx: index("session_user_idx").on(t.userId),
    expiryIdx: index("session_expiry_idx").on(t.expiresAt),
  }),
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id").notNull().references(() => users.id),
    role: text("role").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.role] }) }),
);

/**
 * Invite-only registration. Only a SHA-256 digest of the code is stored, so a
 * database leak cannot be replayed to create accounts. Redemption is capped by
 * `maxUses`, `expiresAt`, an optional email binding, and `revokedAt`.
 */
export const invites = sqliteTable(
  "invites",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull().unique(),
    label: text("label").notNull().default(""),
    /** When set, only this address may redeem the code. */
    email: text("email"),
    maxUses: integer("max_uses").notNull().default(1),
    uses: integer("uses").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({ codeIdx: index("invite_code_idx").on(t.codeHash) }),
);

/* Learning catalogue */
export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
});

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  difficulty: text("difficulty", { enum: ["intro", "core", "stretch"] }).notNull(),
  outcomes: text("outcomes").notNull(), // JSON string[]
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const topicPrerequisites = sqliteTable(
  "topic_prerequisites",
  {
    topicId: text("topic_id").notNull().references(() => topics.id),
    prerequisiteTopicId: text("prerequisite_topic_id").notNull().references(() => topics.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.topicId, t.prerequisiteTopicId] }) }),
);

export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull().references(() => topics.id),
  title: text("title").notNull(),
  type: text("type", { enum: ["note", "video", "diagram", "paper"] }).notNull(),
  author: text("author").notNull(),
  url: text("url").notNull(),
  level: text("level", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  reviewStatus: text("review_status", { enum: ["draft", "reviewed"] }).notNull().default("draft"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
  reviewedAt: text("reviewed_at"),
});

export const practiceQuestions = sqliteTable(
  "practice_questions",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id").notNull().references(() => topics.id),
    type: text("type", { enum: ["mcq", "numeric", "short"] }).notNull(),
    prompt: text("prompt").notNull(),
    optionsJson: text("options_json").notNull().default("[]"),
    answer: text("answer").notNull(),
    acceptedAnswersJson: text("accepted_answers_json").notNull().default("[]"),
    explanation: text("explanation").notNull(),
    hint: text("hint").notNull(),
    difficulty: text("difficulty", { enum: ["intro", "core", "stretch"] }).notNull(),
    reviewStatus: text("review_status", { enum: ["draft", "reviewed"] }).notNull().default("reviewed"),
  },
  (t) => ({ topicIdx: index("pq_topic_idx").on(t.topicId) }),
);

/* Learning activity */
export const tutorMessages = sqliteTable(
  "tutor_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    topicId: text("topic_id").notNull().references(() => topics.id),
    role: text("role", { enum: ["user", "tutor"] }).notNull(),
    level: text("level").notNull(),
    mode: text("mode").notNull(),
    content: text("content").notNull(), // JSON TutorResponse for tutor turns
    helpful: integer("helpful", { mode: "boolean" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({ userTopicIdx: index("tm_user_topic_idx").on(t.userId, t.topicId) }),
);

export const tutorSessions = sqliteTable(
  "tutor_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    topicId: text("topic_id").notNull().references(() => topics.id),
    firstOpenedAt: text("first_opened_at").notNull(),
    lastOpenedAt: text("last_opened_at").notNull(),
  },
  (t) => ({ uniq: primaryKey({ columns: [t.userId, t.topicId] }) }),
);

export const practiceAttempts = sqliteTable(
  "practice_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    questionId: text("question_id").notNull().references(() => practiceQuestions.id),
    topicId: text("topic_id").notNull().references(() => topics.id),
    response: text("response").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    feedback: text("feedback").notNull(),
    confidence: integer("confidence"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({ userTopicIdx: index("pa_user_topic_idx").on(t.userId, t.topicId) }),
);

export const learningGoals = sqliteTable("learning_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    userId: text("user_id").notNull().references(() => users.id),
    topicId: text("topic_id").notNull().references(() => topics.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.topicId] }) }),
);

/* Application */
export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull().references(() => topics.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  objective: text("objective").notNull(),
  requiredConceptsJson: text("required_concepts_json").notNull().default("[]"),
  estimatedHours: integer("estimated_hours").notNull().default(2),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
});

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    challengeId: text("challenge_id").notNull().references(() => challenges.id),
    authorId: text("author_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    draft: text("draft").notNull().default(""),
    evidenceUrl: text("evidence_url").notNull().default(""),
    status: text("status", {
      enum: ["draft", "submitted", "changes_requested", "approved", "showcased"],
    })
      .notNull()
      .default("draft"),
    reviewerId: text("reviewer_id").references(() => users.id),
    consentToShowcase: integer("consent_to_showcase", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    submittedAt: text("submitted_at"),
  },
  (t) => ({ authorIdx: index("project_author_idx").on(t.authorId) }),
);

export const projectReviews = sqliteTable("project_reviews", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  reviewerId: text("reviewer_id").notNull().references(() => users.id),
  decision: text("decision", { enum: ["changes_requested", "approved"] }).notNull(),
  feedback: text("feedback").notNull(),
  createdAt: text("created_at").notNull(),
});

/* Core OS */
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  type: text("type", { enum: ["workshop", "talk", "hackathon", "school_visit"] }).notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  venue: text("venue").notNull(),
  mode: text("mode", { enum: ["in_person", "online", "hybrid"] }).notNull(),
  capacity: integer("capacity").notNull(),
  registrationOpensAt: text("registration_opens_at").notNull(),
  registrationClosesAt: text("registration_closes_at").notNull(),
  topicId: text("topic_id").references(() => topics.id),
  status: text("status", { enum: ["draft", "published", "completed", "cancelled"] })
    .notNull()
    .default("draft"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
});

export const eventRegistrations = sqliteTable(
  "event_registrations",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id),
    userId: text("user_id").notNull().references(() => users.id),
    status: text("status", { enum: ["registered", "cancelled", "attended"] })
      .notNull()
      .default("registered"),
    createdAt: text("created_at").notNull(),
    attendedAt: text("attended_at"),
  },
  (t) => ({ uniq: primaryKey({ columns: [t.eventId, t.userId] }) }),
);

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
});

export const collaborationRequests = sqliteTable("collaboration_requests", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  schoolName: text("school_name").notNull(),
  location: text("location").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  activityType: text("activity_type").notNull(),
  gradeRange: text("grade_range").notNull(),
  expectedParticipants: integer("expected_participants").notNull(),
  preferredDates: text("preferred_dates").notNull(),
  facilities: text("facilities").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status", {
    enum: ["new", "in_review", "approved", "scheduled", "completed", "declined"],
  })
    .notNull()
    .default("new"),
  ownerId: text("owner_id").references(() => users.id),
  internalNotes: text("internal_notes").notNull().default(""),
  linkedEventId: text("linked_event_id").references(() => events.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  identifier: text("identifier").notNull().unique(),
  unit: text("unit").notNull().default("pcs"),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  condition: text("condition", { enum: ["good", "fair", "damaged", "retired"] })
    .notNull()
    .default("good"),
  location: text("location").notNull().default(""),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  notes: text("notes").notNull().default(""),
});

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => inventoryItems.id),
    kind: text("kind", { enum: ["received", "adjusted", "damaged", "consumed"] }).notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    actorId: text("actor_id").notNull().references(() => users.id),
    reason: text("reason").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({ itemIdx: index("sm_item_idx").on(t.itemId) }),
);

export const resourceAllocations = sqliteTable(
  "resource_allocations",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => inventoryItems.id),
    quantity: integer("quantity").notNull(),
    recipientId: text("recipient_id").references(() => users.id),
    recipientLabel: text("recipient_label").notNull(),
    linkedEventId: text("linked_event_id").references(() => events.id),
    linkedCollaborationId: text("linked_collaboration_id").references(() => collaborationRequests.id),
    linkedProjectId: text("linked_project_id").references(() => projects.id),
    issuedAt: text("issued_at").notNull(),
    expectedReturnAt: text("expected_return_at").notNull(),
    returnedAt: text("returned_at"),
    conditionOnIssue: text("condition_on_issue").notNull().default("good"),
    conditionOnReturn: text("condition_on_return"),
    issuedById: text("issued_by_id").notNull().references(() => users.id),
    returnedById: text("returned_by_id").references(() => users.id),
    notes: text("notes").notNull().default(""),
  },
  (t) => ({ itemIdx: index("ra_item_idx").on(t.itemId) }),
);

export const mentorAssignments = sqliteTable("mentor_assignments", {
  id: text("id").primaryKey(),
  mentorId: text("mentor_id").notNull().references(() => users.id),
  studentId: text("student_id").notNull().references(() => users.id),
  scope: text("scope").notNull(),
  status: text("status", { enum: ["active", "ended"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({ createdIdx: index("audit_created_idx").on(t.createdAt) }),
);
