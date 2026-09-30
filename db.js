// SQLite database for CodeBox Match (Node's built-in node:sqlite, Node 22+).
// Models: members (users w/ roles), developer_profiles, projects, applications.
// No external DB server or native deps.

const { DatabaseSync } = require("node:sqlite");
const crypto = require("crypto");
const path = require("path");
const os = require("os");

const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const DB_FILE =
  process.env.DB_PATH ||
  (isServerless
    ? path.join(os.tmpdir(), "codebox.db")
    : path.join(__dirname, "codebox.db"));

const db = new DatabaseSync(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'developer',
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS developer_profiles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id        INTEGER NOT NULL UNIQUE,
    bio              TEXT NOT NULL DEFAULT '',
    skills           TEXT NOT NULL DEFAULT '',
    experience_level TEXT NOT NULL DEFAULT 'beginner',
    availability     TEXT NOT NULL DEFAULT '',
    preferred_roles  TEXT NOT NULL DEFAULT '',
    github_url       TEXT NOT NULL DEFAULT '',
    portfolio_url    TEXT NOT NULL DEFAULT '',
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by   INTEGER NOT NULL,
    tech_lead_id INTEGER,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    category     TEXT NOT NULL DEFAULT 'general',
    tech_stack   TEXT NOT NULL DEFAULT '',
    needed_roles TEXT NOT NULL DEFAULT '',
    difficulty   TEXT NOT NULL DEFAULT 'intermediate',
    timeline     TEXT NOT NULL DEFAULT '',
    accent       TEXT NOT NULL DEFAULT '#7b61ff',
    status       TEXT NOT NULL DEFAULT 'open',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS applications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id     INTEGER NOT NULL,
    developer_id   INTEGER NOT NULL,
    preferred_role TEXT NOT NULL DEFAULT '',
    interest_level TEXT NOT NULL DEFAULT 'medium',
    message        TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (project_id, developer_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (developer_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

// --- Lightweight migration: add columns that older DBs may lack ---
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn("members", "role", "role TEXT NOT NULL DEFAULT 'developer'");
ensureColumn("members", "name", "name TEXT NOT NULL DEFAULT ''");

// --- Password hashing (kept here so seeding has no circular dep) ---
function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}

// --- Seed a demo admin + sample projects so the app is never empty ---
const memberCount = db.prepare("SELECT COUNT(*) AS c FROM members").get().c;
if (memberCount === 0) {
  const insMember = db.prepare(
    "INSERT INTO members (username, name, role, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
  );
  const mk = (username, name, role, pw) => {
    const h = hash(pw);
    return insMember.run(username, name, role, h.hash, h.salt).lastInsertRowid;
  };

  const adminId = mk("admin", "Club Admin", "admin", "admin123");
  const leadId = mk("ada", "Ada Lovelace", "tech_lead", "password");
  const devId = mk("linus", "Linus T.", "developer", "password");

  db.prepare(
    "INSERT INTO developer_profiles (member_id, bio, skills, experience_level, availability, preferred_roles, github_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    devId,
    "CS sophomore who loves systems programming.",
    "C, Rust, Linux, Git",
    "intermediate",
    "10 hrs/week",
    "Backend, DevOps",
    "https://github.com/torvalds"
  );

  const insProject = db.prepare(
    `INSERT INTO projects (created_by, tech_lead_id, title, description, category, tech_stack, needed_roles, difficulty, timeline, accent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insProject.run(leadId, leadId, "Prismatic Rift", "A real-time collaborative shader playground for the club to build WebGL art together.", "Web", "React, WebGL, Node", "Frontend, Graphics", "advanced", "6 weeks", "#7b61ff", "open");
  insProject.run(leadId, leadId, "Ember Clouds", "Weather-driven generative art installation for the club showcase night.", "Creative", "Python, TouchDesigner", "Backend, Design", "intermediate", "4 weeks", "#ff4114", "open");
  insProject.run(adminId, null, "Neon Portal", "A campus events aggregator with a slick dark UI and push notifications.", "Mobile", "Flutter, Firebase", "Mobile, Backend", "intermediate", "8 weeks", "#00c8ff", "reviewing");
  insProject.run(devId, null, "Launch Window", "Track club rocketry telemetry live from a ground-station dashboard.", "Hardware", "Next.js, MQTT, Postgres", "Fullstack, Data", "advanced", "10 weeks", "#14307a", "open");
}

module.exports = db;
