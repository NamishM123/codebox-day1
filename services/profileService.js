// Developer profile logic. One profile per member (upsert on save).

const db = require("../db");

const FIELDS = [
  "bio",
  "skills",
  "experience_level",
  "availability",
  "preferred_roles",
  "github_url",
  "portfolio_url",
  "location",
  "year",
  "timezone",
];

function shape(row) {
  if (!row) return null;
  return {
    ...row,
    skills: row.skills ? row.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    preferred_roles: row.preferred_roles
      ? row.preferred_roles.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

async function getByMemberId(memberId) {
  const row = await db.get(
    `SELECT dp.*, m.username, m.name, m.role
     FROM developer_profiles dp JOIN members m ON m.id = dp.member_id
     WHERE dp.member_id = $1`,
    [Number(memberId)]
  );
  return shape(row);
}

// Create or update the member's profile (Postgres UPSERT).
async function upsertProfile(memberId, data) {
  const norm = (v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));
  const vals = FIELDS.map((f) => norm(data[f]));
  const cols = FIELDS.join(", ");
  const insertPlaceholders = FIELDS.map((_, i) => `$${i + 2}`).join(", ");
  const updateSet = FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ");

  await db.query(
    `INSERT INTO developer_profiles (member_id, ${cols})
     VALUES ($1, ${insertPlaceholders})
     ON CONFLICT (member_id) DO UPDATE SET ${updateSet}, updated_at = now()`,
    [Number(memberId), ...vals]
  );
  return getByMemberId(memberId);
}

// Directory of members + their profiles, optionally filtered by a skill term.
async function listDevelopers(skill) {
  const base = `
    SELECT m.id, m.username, m.name, m.role,
           dp.skills, dp.experience_level, dp.availability,
           dp.preferred_roles, dp.github_url, dp.portfolio_url, dp.bio,
           dp.location, dp.year, dp.timezone
    FROM members m
    LEFT JOIN developer_profiles dp ON dp.member_id = m.id`;
  const rows =
    skill && skill.trim()
      ? await db.query(base + " WHERE dp.skills ILIKE $1 ORDER BY m.name", ["%" + skill.trim() + "%"])
      : await db.query(base + " ORDER BY m.name");
  return rows.map((r) => ({
    ...r,
    skills: r.skills ? r.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    preferred_roles: r.preferred_roles ? r.preferred_roles.split(",").map((s) => s.trim()).filter(Boolean) : [],
  }));
}

module.exports = { getByMemberId, upsertProfile, listDevelopers };
