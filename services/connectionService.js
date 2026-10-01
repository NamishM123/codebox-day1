// Connection requests between members (devs <-> leads) for networking.
const db = require("../db");

async function create(fromId, toId, message) {
  toId = Number(toId);
  if (!toId || toId === fromId) return { ok: false, reason: "bad_target" };
  const dup = await db.get(
    "SELECT id FROM connections WHERE from_id=$1 AND to_id=$2",
    [fromId, toId]
  );
  if (dup) return { ok: false, reason: "exists" };
  await db.query(
    "INSERT INTO connections (from_id, to_id, message) VALUES ($1,$2,$3)",
    [fromId, toId, message || ""]
  );
  return { ok: true };
}

// All connections touching this user, with the other person's info + direction.
async function listForUser(userId) {
  const rows = await db.query(
    `SELECT c.*,
            fm.username AS from_user, fm.name AS from_name,
            tm.username AS to_user, tm.name AS to_name,
            fp.github_url AS from_github, tp.github_url AS to_github
     FROM connections c
     JOIN members fm ON fm.id = c.from_id
     JOIN members tm ON tm.id = c.to_id
     LEFT JOIN developer_profiles fp ON fp.member_id = c.from_id
     LEFT JOIN developer_profiles tp ON tp.member_id = c.to_id
     WHERE c.from_id=$1 OR c.to_id=$1
     ORDER BY c.id DESC`,
    [Number(userId)]
  );
  return rows.map((r) => ({
    ...r,
    incoming: r.to_id === Number(userId),
    other_name: r.to_id === Number(userId) ? r.from_name || r.from_user : r.to_name || r.to_user,
    other_github: r.to_id === Number(userId) ? r.from_github : r.to_github,
  }));
}

async function setStatus(id, userId, status) {
  if (!["accepted", "declined"].includes(status)) return { ok: false, reason: "bad_status" };
  const c = await db.get("SELECT * FROM connections WHERE id=$1", [Number(id)]);
  if (!c) return { ok: false, reason: "not_found" };
  if (c.to_id !== Number(userId)) return { ok: false, reason: "forbidden" };
  await db.query("UPDATE connections SET status=$1 WHERE id=$2", [status, Number(id)]);
  return { ok: true };
}

module.exports = { create, listForUser, setStatus };
