// Application ("I'm interested") logic and tech-lead review actions.

const db = require("../db");

const STATUSES = ["pending", "accepted", "rejected", "waitlisted"];
const INTEREST = ["high", "medium", "low"];

const BASE = `
  SELECT a.*, m.username AS developer, m.name AS developer_name,
         p.title AS project_title, p.created_by AS project_owner, p.tech_lead_id AS project_lead
  FROM applications a
  JOIN members m ON m.id = a.developer_id
  JOIN projects p ON p.id = a.project_id`;

function getById(id) {
  return db.prepare(`${BASE} WHERE a.id = ?`).get(Number(id));
}

function listByProject(projectId) {
  return db.prepare(`${BASE} WHERE a.project_id = ? ORDER BY a.id DESC`).all(Number(projectId));
}

function listByDeveloper(devId) {
  return db.prepare(`${BASE} WHERE a.developer_id = ? ORDER BY a.id DESC`).all(Number(devId));
}

// Apply. Returns { ok, application } or { ok:false, reason }.
function apply(projectId, developerId, d) {
  const proj = db.prepare("SELECT id FROM projects WHERE id = ?").get(Number(projectId));
  if (!proj) return { ok: false, reason: "no_project" };
  const dup = db
    .prepare("SELECT id FROM applications WHERE project_id = ? AND developer_id = ?")
    .get(Number(projectId), Number(developerId));
  if (dup) return { ok: false, reason: "already_applied" };

  const result = db
    .prepare(
      "INSERT INTO applications (project_id, developer_id, preferred_role, interest_level, message) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      Number(projectId),
      Number(developerId),
      d.preferred_role || "",
      INTEREST.includes(d.interest_level) ? d.interest_level : "medium",
      d.message || ""
    );
  return { ok: true, application: getById(result.lastInsertRowid) };
}

function setStatus(id, status) {
  if (!STATUSES.includes(status)) return { ok: false, reason: "bad_status" };
  const app = getById(id);
  if (!app) return { ok: false, reason: "not_found" };
  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, Number(id));
  return { ok: true, application: getById(id) };
}

function remove(id) {
  return db.prepare("DELETE FROM applications WHERE id = ?").run(Number(id)).changes > 0;
}

module.exports = { STATUSES, INTEREST, getById, listByProject, listByDeveloper, apply, setStatus, remove };
