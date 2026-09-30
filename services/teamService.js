// Business logic for hackathon teams, backed by SQLite.
// A team has an owner (who auto-joins), an idea, skills wanted, and a size
// cap. Members can join (until full) or leave; the owner cannot leave their
// own team (they delete it instead).

const db = require("../db");

// Return a team with its roster and derived counts, or undefined.
function getTeamById(id) {
  const team = db
    .prepare(
      `SELECT teams.*, members.username AS owner
       FROM teams JOIN members ON members.id = teams.owner_id
       WHERE teams.id = ?`
    )
    .get(Number(id));
  if (!team) return undefined;

  const roster = db
    .prepare(
      `SELECT members.id, members.username
       FROM team_members
       JOIN members ON members.id = team_members.member_id
       WHERE team_members.team_id = ?
       ORDER BY team_members.joined_at`
    )
    .all(Number(id));

  return {
    ...team,
    skills_needed: team.skills_needed
      ? team.skills_needed.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    members: roster,
    member_count: roster.length,
    spots_left: Math.max(0, team.max_size - roster.length),
  };
}

function getAllTeams() {
  const ids = db.prepare("SELECT id FROM teams ORDER BY id DESC").all();
  return ids.map((row) => getTeamById(row.id));
}

// Create a team; the owner is added to the roster automatically.
function createTeam(ownerId, { name, idea, skills_needed, max_size }) {
  const skills = Array.isArray(skills_needed)
    ? skills_needed.join(", ")
    : skills_needed || "";
  const size = Number(max_size) > 0 ? Number(max_size) : 4;

  const result = db
    .prepare(
      "INSERT INTO teams (owner_id, name, idea, skills_needed, max_size) VALUES (?, ?, ?, ?, ?)"
    )
    .run(Number(ownerId), name, idea, skills, size);

  const teamId = result.lastInsertRowid;
  // Owner auto-joins.
  db.prepare(
    "INSERT OR IGNORE INTO team_members (team_id, member_id) VALUES (?, ?)"
  ).run(teamId, Number(ownerId));

  return getTeamById(teamId);
}

function updateTeam(id, { name, idea, skills_needed, max_size }) {
  const existing = getTeamById(id);
  if (!existing) return undefined;

  const next = {
    name: name ?? existing.name,
    idea: idea ?? existing.idea,
    skills:
      skills_needed === undefined
        ? existing.skills_needed.join(", ")
        : Array.isArray(skills_needed)
        ? skills_needed.join(", ")
        : skills_needed,
    max_size: max_size === undefined ? existing.max_size : Number(max_size),
  };

  db.prepare(
    "UPDATE teams SET name = ?, idea = ?, skills_needed = ?, max_size = ? WHERE id = ?"
  ).run(next.name, next.idea, next.skills, next.max_size, Number(id));

  return getTeamById(id);
}

function deleteTeam(id) {
  const result = db.prepare("DELETE FROM teams WHERE id = ?").run(Number(id));
  return result.changes > 0;
}

// Join result: { ok: true, team } or { ok: false, reason }.
function joinTeam(id, memberId) {
  const team = getTeamById(id);
  if (!team) return { ok: false, reason: "not_found" };
  if (team.members.some((m) => m.id === Number(memberId)))
    return { ok: false, reason: "already_member" };
  if (team.spots_left <= 0) return { ok: false, reason: "full" };

  db.prepare(
    "INSERT OR IGNORE INTO team_members (team_id, member_id) VALUES (?, ?)"
  ).run(Number(id), Number(memberId));
  return { ok: true, team: getTeamById(id) };
}

// Leave result: { ok: true, team } or { ok: false, reason }.
function leaveTeam(id, memberId) {
  const team = getTeamById(id);
  if (!team) return { ok: false, reason: "not_found" };
  if (team.owner_id === Number(memberId))
    return { ok: false, reason: "owner_cannot_leave" };

  const result = db
    .prepare("DELETE FROM team_members WHERE team_id = ? AND member_id = ?")
    .run(Number(id), Number(memberId));
  if (result.changes === 0) return { ok: false, reason: "not_member" };
  return { ok: true, team: getTeamById(id) };
}

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
};
