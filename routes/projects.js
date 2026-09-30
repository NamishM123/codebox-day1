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

router.get("/", (req, res) => res.json(svc.getAll()));

router.get("/:id", (req, res) => {
  const p = svc.getById(req.params.id);
  if (!p) return res.status(404).json({ error: "project not found" });
  res.json(p);
});

router.post("/", requireAuth, (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: "title is required" });
  if (!description || !String(description).trim())
    return res.status(400).json({ error: "description is required" });
  res.status(201).json(svc.create(req.user.id, req.body));
});

router.put("/:id", requireAuth, (req, res) => {
  const p = svc.getById(req.params.id);
  if (!p) return res.status(404).json({ error: "project not found" });
  if (!canManage(req.user, p))
    return res.status(403).json({ error: "you can't manage this project" });
  res.json(svc.update(req.params.id, req.body || {}));
});

router.delete("/:id", requireAuth, (req, res) => {
  const p = svc.getById(req.params.id);
  if (!p) return res.status(404).json({ error: "project not found" });
  if (!canManage(req.user, p))
    return res.status(403).json({ error: "you can't delete this project" });
  svc.remove(req.params.id);
  res.status(204).end();
});

module.exports = router;
