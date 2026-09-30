// SQLite database setup using Node's built-in `node:sqlite` (Node 22+).
// A single file-based database lives on disk, so data survives restarts.
// No external database server or native dependencies are required.

const { DatabaseSync } = require("node:sqlite");
const path = require("path");

// Store the DB file next to this module. Overridable via DB_PATH for tests.
const DB_FILE = process.env.DB_PATH || path.join(__dirname, "codebox.db");

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
