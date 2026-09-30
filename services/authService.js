// Authentication logic: member registration and login.
// Passwords are hashed with scrypt (Node's built-in crypto) + a per-user
// random salt, so plaintext passwords are never stored. No native deps.

const crypto = require("crypto");
const db = require("../db");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

// Constant-time comparison to avoid timing attacks.
function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Create a new member. Throws if the username already exists (UNIQUE).
function registerMember(username, password) {
  const { hash, salt } = hashPassword(password);
  const result = db
    .prepare(
      "INSERT INTO members (username, password_hash, password_salt) VALUES (?, ?, ?)"
    )
    .run(username, hash, salt);
  return { id: result.lastInsertRowid, username };
}

function findByUsername(username) {
  return db.prepare("SELECT * FROM members WHERE username = ?").get(username);
}

// Returns { id, username } on success, or null on bad credentials.
function authenticate(username, password) {
  const member = findByUsername(username);
  if (!member) return null;
  const ok = verifyPassword(password, member.password_salt, member.password_hash);
  return ok ? { id: member.id, username: member.username } : null;
}

module.exports = { registerMember, findByUsername, authenticate };
