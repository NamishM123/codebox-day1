// Application ("I'm interested") logic and tech-lead review actions.

const db = require("../db");

const STATUSES = ["pending", "accepted", "rejected", "waitlisted"];
const INTEREST = ["high", "medium", "low"];

const BASE = `
  SELECT a.*, m.username AS developer, m.name AS developer_name,
         dp.skills AS dev_skills,
         p.title AS project_title, p.created_by AS project_owner, p.tech_lead_id AS project_lead
  FROM applications a
  JOIN members m ON m.id = a.developer_id
  LEFT JOIN developer_profiles dp ON dp.member_id = a.developer_id
  JOIN projects p ON p.id = a.project_id`;

async function getById(id) {
  return db.get(`${BASE} WHERE a.id = $1`, [Number(id)]);
}

async function listByProject(projectId) {
  return db.query(`${BASE} WHERE a.project_id = $1 ORDER BY a.id DESC`, [Number(projectId)]);
}

async function listByDeveloper(devId) {
  return db.query(`${BASE} WHERE a.developer_id = $1 ORDER BY a.id DESC`, [Number(devId)]);
}

async function apply(projectId, developerId, d) {
  const proj = await db.get("SELECT id FROM projects WHERE id = $1", [Number(projectId)]);
  if (!proj) return { ok: false, reason: "no_project" };
  const dup = await db.get(
    "SELECT id FROM applications WHERE project_id = $1 AND developer_id = $2",
    [Number(projectId), Number(developerId)]
  );
  if (dup) return { ok: false, reason: "already_applied" };

  const rows = await db.query(
    "INSERT INTO applications (project_id, developer_id, preferred_role, interest_level, message) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [
      Number(projectId),
      Number(developerId),
      d.preferred_role || "",
      INTEREST.includes(d.interest_level) ? d.interest_level : "medium",
      d.message || "",
    ]
  );
  return { ok: true, application: await getById(rows[0].id) };
}

async function setStatus(id, status) {
  if (!STATUSES.includes(status)) return { ok: false, reason: "bad_status" };
  const app = await getById(id);
  if (!app) return { ok: false, reason: "not_found" };
  await db.query("UPDATE applications SET status = $1 WHERE id = $2", [status, Number(id)]);
  return { ok: true, application: await getById(id) };
}

async function remove(id) {
  const rows = await db.query("DELETE FROM applications WHERE id = $1 RETURNING id", [Number(id)]);
  return rows.length > 0;
}

module.exports = { STATUSES, INTEREST, getById, listByProject, listByDeveloper, apply, setStatus, remove };
