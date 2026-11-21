import type { Database } from "better-sqlite3";

/**
 * Idempotent schema creation. Kept as explicit SQL so the schema is
 * reviewable without generating migration files for the demo build.
 * Mirrors lib/db/schema.ts exactly.
 */
export function migrate(sqlite: Database) {
  sqlite.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    preferred_level TEXT NOT NULL DEFAULT 'beginner',
    learning_goal TEXT,
    is_demo INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT,
    password_updated_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS session_user_idx ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS session_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
  );

  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT '',
    email TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1,
    uses INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS invite_code_idx ON invites(code_hash);

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    outcomes TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS topic_prerequisites (
    topic_id TEXT NOT NULL REFERENCES topics(id),
    prerequisite_topic_id TEXT NOT NULL REFERENCES topics(id),
    PRIMARY KEY (topic_id, prerequisite_topic_id)
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    author TEXT NOT NULL,
    url TEXT NOT NULL,
    level TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'draft',
    is_demo INTEGER NOT NULL DEFAULT 1,
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS practice_questions (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    options_json TEXT NOT NULL DEFAULT '[]',
    answer TEXT NOT NULL,
    accepted_answers_json TEXT NOT NULL DEFAULT '[]',
    explanation TEXT NOT NULL,
    hint TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'reviewed'
  );
  CREATE INDEX IF NOT EXISTS pq_topic_idx ON practice_questions(topic_id);

  CREATE TABLE IF NOT EXISTS tutor_sessions (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    topic_id TEXT NOT NULL REFERENCES topics(id),
    first_opened_at TEXT NOT NULL,
    last_opened_at TEXT NOT NULL,
    PRIMARY KEY (user_id, topic_id)
  );

  CREATE TABLE IF NOT EXISTS tutor_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    topic_id TEXT NOT NULL REFERENCES topics(id),
    role TEXT NOT NULL,
    level TEXT NOT NULL,
    mode TEXT NOT NULL,
    content TEXT NOT NULL,
    helpful INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tm_user_topic_idx ON tutor_messages(user_id, topic_id);

  CREATE TABLE IF NOT EXISTS practice_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    question_id TEXT NOT NULL REFERENCES practice_questions(id),
    topic_id TEXT NOT NULL REFERENCES topics(id),
    response TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    confidence INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pa_user_topic_idx ON practice_attempts(user_id, topic_id);

  CREATE TABLE IF NOT EXISTS learning_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id),
    topic_id TEXT NOT NULL REFERENCES topics(id),
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, topic_id)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    objective TEXT NOT NULL,
    required_concepts_json TEXT NOT NULL DEFAULT '[]',
    estimated_hours INTEGER NOT NULL DEFAULT 2,
    published INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL REFERENCES challenges(id),
    author_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    draft TEXT NOT NULL DEFAULT '',
    evidence_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    reviewer_id TEXT REFERENCES users(id),
    consent_to_showcase INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    submitted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS project_author_idx ON projects(author_id);

  CREATE TABLE IF NOT EXISTS project_reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    decision TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    type TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    venue TEXT NOT NULL,
    mode TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    registration_opens_at TEXT NOT NULL,
    registration_closes_at TEXT NOT NULL,
    topic_id TEXT REFERENCES topics(id),
    status TEXT NOT NULL DEFAULT 'draft',
    is_demo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS event_registrations (
    id TEXT NOT NULL,
    event_id TEXT NOT NULL REFERENCES events(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'registered',
    created_at TEXT NOT NULL,
    attended_at TEXT,
    PRIMARY KEY (event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS collaboration_requests (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    school_name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    grade_range TEXT NOT NULL,
    expected_participants INTEGER NOT NULL,
    preferred_dates TEXT NOT NULL,
    facilities TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    owner_id TEXT REFERENCES users(id),
    internal_notes TEXT NOT NULL DEFAULT '',
    linked_event_id TEXT REFERENCES events(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    identifier TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'pcs',
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    condition TEXT NOT NULL DEFAULT 'good',
    location TEXT NOT NULL DEFAULT '',
    low_stock_threshold INTEGER NOT NULL DEFAULT 2,
    archived INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id),
    kind TEXT NOT NULL,
    quantity_delta INTEGER NOT NULL,
    actor_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sm_item_idx ON stock_movements(item_id);

  CREATE TABLE IF NOT EXISTS resource_allocations (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL,
    recipient_id TEXT REFERENCES users(id),
    recipient_label TEXT NOT NULL,
    linked_event_id TEXT REFERENCES events(id),
    linked_collaboration_id TEXT REFERENCES collaboration_requests(id),
    linked_project_id TEXT REFERENCES projects(id),
    issued_at TEXT NOT NULL,
    expected_return_at TEXT NOT NULL,
    returned_at TEXT,
    condition_on_issue TEXT NOT NULL DEFAULT 'good',
    condition_on_return TEXT,
    issued_by_id TEXT NOT NULL REFERENCES users(id),
    returned_by_id TEXT REFERENCES users(id),
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS ra_item_idx ON resource_allocations(item_id);

  CREATE TABLE IF NOT EXISTS mentor_assignments (
    id TEXT PRIMARY KEY,
    mentor_id TEXT NOT NULL REFERENCES users(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    scope TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events(created_at);
  `);

  // --- Forward-only upgrades for databases created before v3.1 -------------
  // CREATE TABLE IF NOT EXISTS does not add columns, so older files need an
  // explicit ALTER. Each check is idempotent and safe to run on every boot.
  const userColumns = sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const hasColumn = (name: string) => userColumns.some((c) => c.name === name);
  if (!hasColumn("password_hash")) sqlite.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  if (!hasColumn("password_updated_at")) sqlite.exec("ALTER TABLE users ADD COLUMN password_updated_at TEXT");

  sqlite
    .prepare("INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run("3.2.0");
}
