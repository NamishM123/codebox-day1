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

async function registerMember(username, name, password) {
  const { hash, salt } = hashPassword(password);
  const rows = await db.query(
    "INSERT INTO members (username, name, role, password_hash, password_salt) VALUES ($1,$2,'developer',$3,$4) RETURNING *",
    [username, name || username, hash, salt]
  );
  return publicUser(rows[0]);
}

async function getByUsername(username) {
  return db.get("SELECT * FROM members WHERE username = $1", [username]);
}

async function getById(id) {
  return db.get("SELECT * FROM members WHERE id = $1", [Number(id)]);
}

async function authenticate(username, password) {
  const m = await getByUsername(username);
  if (!m) return null;
  return verifyPassword(password, m.password_salt, m.password_hash) ? publicUser(m) : null;
}

// --- Admin operations ---
async function listUsers() {
  return db.query("SELECT id, username, name, role, created_at FROM members ORDER BY id");
}

async function setRole(id, role) {
  if (!ROLES.includes(role)) return { ok: false, reason: "bad_role" };
  const user = await getById(id);
  if (!user) return { ok: false, reason: "not_found" };
  await db.query("UPDATE members SET role = $1 WHERE id = $2", [role, Number(id)]);
  return { ok: true, user: publicUser(await getById(id)) };
}

module.exports = { ROLES, registerMember, authenticate, getById, publicUser, listUsers, setRole };
