// SQLite database setup using Node's built-in `node:sqlite` (Node 22+).
// Two tables: members (auth) and posts (the club board). Full CRUD lives
// on posts; members power authentication.
// No external database server or native dependencies are required.

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const os = require("os");

// Pick a writable location for the DB file:
//  - DB_PATH env var wins (tests / custom setups)
//  - On Vercel/Lambda the app dir is READ-ONLY; only the temp dir is writable.
//  - Locally, keep the DB file next to this module.
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
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id  INTEGER NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    category   TEXT NOT NULL DEFAULT 'announcement',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS teams (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id      INTEGER NOT NULL,
    name          TEXT NOT NULL,
    idea          TEXT NOT NULL,
    skills_needed TEXT NOT NULL DEFAULT '',
    max_size      INTEGER NOT NULL DEFAULT 4,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id   INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (team_id, member_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

module.exports = db;
