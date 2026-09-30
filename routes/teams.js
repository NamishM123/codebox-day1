// Routes for hackathon teams.
// Reads are public; create/update/delete/join/leave require auth.
// Update and delete are owner-only.

const express = require("express");
const {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
} = require("../services/teamService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// READ all (public)
router.get("/", (req, res) => {
  res.json(getAllTeams());
});

// READ one (public)
router.get("/:id", (req, res) => {
  const team = getTeamById(req.params.id);
  if (!team) return res.status(404).json({ error: "team not found" });
  res.json(team);
});

// CREATE (auth) — creator becomes owner + first member
router.post("/", requireAuth, (req, res) => {
  const { name, idea, skills_needed, max_size } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim())
    return res.status(400).json({ error: "team name is required" });
  if (!idea || typeof idea !== "string" || !idea.trim())
    return res.status(400).json({ error: "project idea is required" });
  if (max_size !== undefined && (Number(max_size) < 1 || Number(max_size) > 12))
    return res.status(400).json({ error: "max_size must be between 1 and 12" });

  const team = createTeam(req.user.id, {
    name: name.trim(),
    idea: idea.trim(),
    skills_needed,
    max_size,
  });
  res.status(201).json(team);
});

// UPDATE (owner only)
router.put("/:id", requireAuth, (req, res) => {
  const existing = getTeamById(req.params.id);
  if (!existing) return res.status(404).json({ error: "team not found" });
  if (existing.owner_id !== req.user.id)
    return res.status(403).json({ error: "only the owner can edit this team" });

  const team = updateTeam(req.params.id, req.body || {});
  res.json(team);
});

// DELETE (owner only)
router.delete("/:id", requireAuth, (req, res) => {
  const existing = getTeamById(req.params.id);
  if (!existing) return res.status(404).json({ error: "team not found" });
  if (existing.owner_id !== req.user.id)
    return res.status(403).json({ error: "only the owner can delete this team" });

  deleteTeam(req.params.id);
  res.status(204).end();
});

// JOIN (auth)
router.post("/:id/join", requireAuth, (req, res) => {
  const result = joinTeam(req.params.id, req.user.id);
  if (result.ok) return res.json(result.team);

  const map = {
    not_found: [404, "team not found"],
    already_member: [409, "you are already on this team"],
    full: [409, "this team is full"],
  };
  const [code, msg] = map[result.reason] || [400, "could not join"];
  res.status(code).json({ error: msg });
});

// LEAVE (auth)
router.post("/:id/leave", requireAuth, (req, res) => {
  const result = leaveTeam(req.params.id, req.user.id);
  if (result.ok) return res.json(result.team);

  const map = {
    not_found: [404, "team not found"],
    owner_cannot_leave: [400, "owners can't leave — delete the team instead"],
    not_member: [409, "you are not on this team"],
  };
  const [code, msg] = map[result.reason] || [400, "could not leave"];
  res.status(code).json({ error: msg });
});

module.exports = router;
