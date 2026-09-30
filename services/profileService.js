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

function getByMemberId(memberId) {
  const row = db
    .prepare(
      `SELECT dp.*, m.username, m.name, m.role
       FROM developer_profiles dp JOIN members m ON m.id = dp.member_id
       WHERE dp.member_id = ?`
    )
    .get(Number(memberId));
  return shape(row);
}

// Create or update the member's profile. Array fields accept arrays or strings.
function upsertProfile(memberId, data) {
  const norm = (v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));
  const existing = db
    .prepare("SELECT id FROM developer_profiles WHERE member_id = ?")
    .get(Number(memberId));

  const vals = FIELDS.map((f) => norm(data[f]));

  if (existing) {
    db.prepare(
      `UPDATE developer_profiles SET ${FIELDS.map((f) => `${f} = ?`).join(", ")}, updated_at = datetime('now') WHERE member_id = ?`
    ).run(...vals, Number(memberId));
  } else {
    db.prepare(
      `INSERT INTO developer_profiles (member_id, ${FIELDS.join(", ")}) VALUES (?, ${FIELDS.map(() => "?").join(", ")})`
    ).run(Number(memberId), ...vals);
  }
  return getByMemberId(memberId);
}

module.exports = { getByMemberId, upsertProfile };
