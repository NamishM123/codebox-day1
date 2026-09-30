// Project routes. Reads public; create needs auth; edit/delete restricted to
// the creator, the assigned tech lead, or an admin.

const express = require("express");
const svc = require("../services/projectService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function canManage(user, project) {
  return (
    user.role === "admin" ||
    project.created_by === user.id ||
    project.tech_lead_id === user.id
  );
}

router.get("/", async (req, res) => res.json(await svc.getAll()));

router.get("/:id", async (req, res) => {
  const p = await svc.getById(req.params.id);
  if (!p) return res.status(404).json({ error: "project not found" });
  res.json(p);
});

router.post("/", requireAuth, async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: "title is required" });
  if (!description || !String(description).trim())
    return res.status(400).json({ error: "description is required" });
  res.status(201).json(await svc.create(req.user.id, req.body));
});

router.put("/:id", requireAuth, async (req, res) => {
  const p = await svc.getById(req.params.id);
  if (!p) return res.status(404).json({ error: "project not found" });
  if (!canManage(req.user, p))
    return res.status(403).json({ error: "you can't manage this project" });
  res.json(await svc.update(req.params.id, req.body || {}));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const p = await svc.getById(req.params.id);
  if (!p) return res.status(404).json({ error: "project not found" });
  if (!canManage(req.user, p))
    return res.status(403).json({ error: "you can't delete this project" });
  await svc.remove(req.params.id);
  res.status(204).end();
});

module.exports = router;
