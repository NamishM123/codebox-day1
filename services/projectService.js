// Project logic: CRUD plus derived data (interested count, tech lead name).

const db = require("../db");

const STATUSES = ["open", "reviewing", "team_formed", "closed"];
const ARRAY_FIELDS = ["tech_stack", "needed_roles"];

function shape(row) {
  if (!row) return null;
  const out = { ...row };
  for (const f of ARRAY_FIELDS) {
    out[f] = row[f] ? row[f].split(",").map((s) => s.trim()).filter(Boolean) : [];
  }
  return out;
}

const BASE = `
  SELECT p.*,
         creator.username AS creator,
         lead.username     AS tech_lead,
         (SELECT COUNT(*)::int FROM applications a WHERE a.project_id = p.id) AS interested
  FROM projects p
  JOIN members creator ON creator.id = p.created_by
  LEFT JOIN members lead ON lead.id = p.tech_lead_id`;

async function getAll() {
  const rows = await db.query(`${BASE} ORDER BY p.id DESC`);
  return rows.map(shape);
}

async function getById(id) {
  return shape(await db.get(`${BASE} WHERE p.id = $1`, [Number(id)]));
}

async function create(createdBy, d) {
  const norm = (v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));
  const rows = await db.query(
    `INSERT INTO projects
      (created_by, tech_lead_id, title, description, category, tech_stack, needed_roles, difficulty, timeline, accent, image, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      Number(createdBy),
      d.tech_lead_id ? Number(d.tech_lead_id) : null,
      d.title,
      d.description,
      d.category || "general",
      norm(d.tech_stack),
      norm(d.needed_roles),
      d.difficulty || "intermediate",
      d.timeline || "",
      d.accent || "#7b61ff",
      d.image || "",
      STATUSES.includes(d.status) ? d.status : "open",
    ]
  );
  return getById(rows[0].id);
}

async function update(id, d) {
  const existing = await getById(id);
  if (!existing) return undefined;
  const norm = (v, cur) =>
    v === undefined ? cur : Array.isArray(v) ? v.join(", ") : String(v);

  const next = {
    title: d.title ?? existing.title,
    description: d.description ?? existing.description,
    category: d.category ?? existing.category,
    tech_stack: norm(d.tech_stack, existing.tech_stack.join(", ")),
    needed_roles: norm(d.needed_roles, existing.needed_roles.join(", ")),
    difficulty: d.difficulty ?? existing.difficulty,
    timeline: d.timeline ?? existing.timeline,
    accent: d.accent ?? existing.accent,
    image: d.image ?? existing.image,
    status: STATUSES.includes(d.status) ? d.status : existing.status,
    tech_lead_id:
      d.tech_lead_id === undefined ? existing.tech_lead_id : d.tech_lead_id ? Number(d.tech_lead_id) : null,
  };

  await db.query(
    `UPDATE projects SET title=$1, description=$2, category=$3, tech_stack=$4, needed_roles=$5,
       difficulty=$6, timeline=$7, accent=$8, image=$9, status=$10, tech_lead_id=$11 WHERE id=$12`,
    [next.title, next.description, next.category, next.tech_stack, next.needed_roles,
     next.difficulty, next.timeline, next.accent, next.image, next.status, next.tech_lead_id, Number(id)]
  );
  return getById(id);
}

async function remove(id) {
  const rows = await db.query("DELETE FROM projects WHERE id = $1 RETURNING id", [Number(id)]);
  return rows.length > 0;
}

module.exports = { STATUSES, getAll, getById, create, update, remove };
