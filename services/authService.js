// Auth + user management: register, login, and admin user operations.
// Passwords are scrypt-hashed with a per-user salt.

const crypto = require("crypto");
const db = require("../db");

const ROLES = ["developer", "tech_lead", "admin"];

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}

function verifyPassword(password, salt, expected) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(m) {
  if (!m) return null;
  return { id: m.id, username: m.username, name: m.name, role: m.role };
}

function registerMember(username, name, password) {
  const { hash, salt } = hashPassword(password);
  const result = db
    .prepare(
      "INSERT INTO members (username, name, role, password_hash, password_salt) VALUES (?, ?, 'developer', ?, ?)"
    )
    .run(username, name || username, hash, salt);
  return publicUser(getById(result.lastInsertRowid));
}

function getByUsername(username) {
  return db.prepare("SELECT * FROM members WHERE username = ?").get(username);
}

function getById(id) {
  return db.prepare("SELECT * FROM members WHERE id = ?").get(Number(id));
}

function authenticate(username, password) {
  const m = getByUsername(username);
  if (!m) return null;
  return verifyPassword(password, m.password_salt, m.password_hash) ? publicUser(m) : null;
}

// --- Admin operations ---
function listUsers() {
  return db
    .prepare("SELECT id, username, name, role, created_at FROM members ORDER BY id")
    .all();
}

function setRole(id, role) {
  if (!ROLES.includes(role)) return { ok: false, reason: "bad_role" };
  const user = getById(id);
  if (!user) return { ok: false, reason: "not_found" };
  db.prepare("UPDATE members SET role = ? WHERE id = ?").run(role, Number(id));
  return { ok: true, user: publicUser(getById(id)) };
}

module.exports = {
  ROLES,
  registerMember,
  authenticate,
  getById,
  publicUser,
  listUsers,
  setRole,
};
