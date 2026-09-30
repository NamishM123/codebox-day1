// SQLite database setup using Node's built-in `node:sqlite` (Node 22+).
// A single file-based database lives on disk.
// No external database server or native dependencies are required.

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const os = require("os");

// Pick a writable location for the DB file:
//  - DB_PATH env var wins (used by tests / custom setups)
//  - On Vercel (and other serverless hosts) the app directory is READ-ONLY;
//    only the OS temp dir (/tmp) is writable, so use that there.
//  - Locally, keep the DB file next to this module.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE =
  process.env.DB_PATH ||
  (isServerless
    ? path.join(os.tmpdir(), "codebox.db")
    : path.join(__dirname, "codebox.db"));

const db = new DatabaseSync(DB_FILE);

// Create the users table if it does not already exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  )
`);

// Seed a couple of rows the first time the DB is created, so the demo has data.
const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get();
if (count === 0) {
  const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  insert.run("Alex", "alex@codebox.dev");
  insert.run("Sam", "sam@codebox.dev");
}

module.exports = db;
