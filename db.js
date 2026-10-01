// Data layer for CodeBox Match (PostgreSQL).
//
// Production (Vercel): connects to Supabase Postgres via DATABASE_URL.
// Local dev / tests: an in-process Postgres (PGlite) — same SQL dialect, no
// server to run. Set PGLITE_MEMORY=1 for an ephemeral in-memory DB (tests).
//
// Everything is async. `query`/`get` await `ready`, which creates the schema
// and seeds demo data exactly once.

const crypto = require("crypto");
const path = require("path");
const os = require("os");

const useSupabase = Boolean(process.env.DATABASE_URL);
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let backend;
if (useSupabase) {
  const { Pool } = require("pg");
  // Serverless-friendly settings for the Supabase transaction pooler:
  // one connection per instance, release it when idle, and fail fast
  // instead of hanging until the platform kills the request.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    keepAlive: true,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
    statement_timeout: 8000,
    allowExitOnIdle: true,
  });
  backend = { query: (sql, params) => pool.query(sql, params) };
} else {
  // Local dev / tests, or a Vercel deploy before DATABASE_URL is configured.
  // On serverless the app dir is read-only, so PGlite must live in /tmp
  // (ephemeral — set DATABASE_URL to a Supabase project for durable storage).
  const { PGlite } = require("@electric-sql/pglite");
  const dir =
    process.env.PGLITE_DIR ||
    (isServerless ? path.join(os.tmpdir(), "pgdata") : path.join(__dirname, ".pgdata"));
  const pg = process.env.PGLITE_MEMORY ? new PGlite() : new PGlite(dir);
  backend = { query: (sql, params) => pg.query(sql, params || []) };
}

async function rawQuery(sql, params = []) {
  const res = await backend.query(sql, params);
  return res.rows;
}

// --- Schema + seed, run once ---
async function initSchema() {
  await rawQuery(`
    CREATE TABLE IF NOT EXISTS members (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL DEFAULT '',
      role          TEXT NOT NULL DEFAULT 'developer',
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await rawQuery(`
    CREATE TABLE IF NOT EXISTS developer_profiles (
      id               SERIAL PRIMARY KEY,
      member_id        INTEGER NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
      bio              TEXT NOT NULL DEFAULT '',
      skills           TEXT NOT NULL DEFAULT '',
      experience_level TEXT NOT NULL DEFAULT 'beginner',
      availability     TEXT NOT NULL DEFAULT '',
      preferred_roles  TEXT NOT NULL DEFAULT '',
      github_url       TEXT NOT NULL DEFAULT '',
      portfolio_url    TEXT NOT NULL DEFAULT '',
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await rawQuery(`
    CREATE TABLE IF NOT EXISTS projects (
      id           SERIAL PRIMARY KEY,
      created_by   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      tech_lead_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL,
      category     TEXT NOT NULL DEFAULT 'general',
      tech_stack   TEXT NOT NULL DEFAULT '',
      needed_roles TEXT NOT NULL DEFAULT '',
      difficulty   TEXT NOT NULL DEFAULT 'intermediate',
      timeline     TEXT NOT NULL DEFAULT '',
      accent       TEXT NOT NULL DEFAULT '#7b61ff',
      image        TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'open',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await rawQuery(`
    CREATE TABLE IF NOT EXISTS connections (
      id         SERIAL PRIMARY KEY,
      from_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      to_id      INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      message    TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (from_id, to_id)
    )`);
  await rawQuery(`
    CREATE TABLE IF NOT EXISTS applications (
      id             SERIAL PRIMARY KEY,
      project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      developer_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      preferred_role TEXT NOT NULL DEFAULT '',
      interest_level TEXT NOT NULL DEFAULT 'medium',
      message        TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT 'pending',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (project_id, developer_id)
    )`);
}

function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}

async function seedIfEmpty() {
  const rows = await rawQuery("SELECT COUNT(*)::int AS c FROM members");
  if (rows[0].c > 0) return;

  const mk = async (username, name, role, pw) => {
    const h = hash(pw);
    const r = await rawQuery(
      "INSERT INTO members (username, name, role, password_hash, password_salt) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [username, name, role, h.hash, h.salt]
    );
    return r[0].id;
  };
  const adminId = await mk("admin", "Club Admin", "admin", "admin123");
  const leadId = await mk("ada", "Ada Lovelace", "tech_lead", "password");
  const devId = await mk("linus", "Linus T.", "developer", "password");

  await rawQuery(
    `INSERT INTO developer_profiles (member_id, bio, skills, experience_level, availability, preferred_roles, github_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [devId, "CS sophomore who loves systems programming.", "C, Rust, Linux, Git", "intermediate", "10 hrs/week", "Backend, DevOps", "https://github.com/torvalds"]
  );

  const img = (id) => `https://picsum.photos/id/${id}/1200/800?grayscale`;
  const proj = (by, lead, t, d, cat, stack, roles, diff, time, accent, image, status) =>
    rawQuery(
      `INSERT INTO projects (created_by, tech_lead_id, title, description, category, tech_stack, needed_roles, difficulty, timeline, accent, image, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [by, lead, t, d, cat, stack, roles, diff, time, accent, image, status]
    );
  await proj(leadId, leadId, "Prismatic Rift", "A real-time collaborative shader playground for the club to build WebGL art together.", "Web", "React, WebGL, Node", "Frontend, Graphics", "advanced", "6 weeks", "#e0a24a", img(180), "open");
  await proj(leadId, leadId, "Ember Clouds", "Weather-driven generative art installation for the club showcase night.", "Creative", "Python, TouchDesigner", "Backend, Design", "intermediate", "4 weeks", "#e0553a", img(0), "open");
  await proj(adminId, null, "Neon Portal", "A campus events aggregator with a slick dark UI and push notifications.", "Mobile", "Flutter, Firebase", "Mobile, Backend", "intermediate", "8 weeks", "#3fb6c9", img(20), "reviewing");
  await proj(devId, null, "Launch Window", "Track club rocketry telemetry live from a ground-station dashboard.", "Hardware", "Next.js, MQTT, Postgres", "Fullstack, Data", "advanced", "10 weeks", "#4d7ef0", img(60), "open");
}

const ready = (async () => {
  // In production the Supabase DB is already provisioned (schema via migration,
  // demo data seeded), so do NO boot work — query directly. This avoids a
  // transient boot failure poisoning a serverless instance. Locally (PGlite)
  // we set up the schema and seed on first run.
  if (useSupabase) return;
  await initSchema();
  await seedIfEmpty();
})();

async function query(sql, params = []) {
  await ready;
  return rawQuery(sql, params);
}
async function get(sql, params = []) {
  return (await query(sql, params))[0];
}

module.exports = { query, get, ready };
