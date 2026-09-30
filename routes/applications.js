// Application routes: developers apply; project managers review.

const express = require("express");
const appSvc = require("../services/applicationService");
const projSvc = require("../services/projectService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function managesProject(user, project) {
  return (
    user.role === "admin" ||
    project.created_by === user.id ||
    project.tech_lead_id === user.id
  );
}

// POST /api/applications -> "I'm interested"
router.post("/", requireAuth, async (req, res) => {
  const { project_id } = req.body || {};
  if (!project_id) return res.status(400).json({ error: "project_id is required" });

  const result = await appSvc.apply(project_id, req.user.id, req.body);
  if (result.ok) return res.status(201).json(result.application);
  const map = {
    no_project: [404, "project not found"],
    already_applied: [409, "you already applied to this project"],
  };
  const [code, msg] = map[result.reason] || [400, "could not apply"];
  res.status(code).json({ error: msg });
});

// GET /api/applications/mine -> the developer's own applications
router.get("/mine", requireAuth, async (req, res) => {
  res.json(await appSvc.listByDeveloper(req.user.id));
});

// GET /api/applications/project/:projectId -> applicants (project managers only)
router.get("/project/:projectId", requireAuth, async (req, res) => {
  const project = await projSvc.getById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "project not found" });
  if (!managesProject(req.user, project))
    return res.status(403).json({ error: "only the project's tech lead can view applicants" });
  res.json(await appSvc.listByProject(req.params.projectId));
});

// PUT /api/applications/:id/status -> accept/reject/waitlist (managers only)
router.put("/:id/status", requireAuth, async (req, res) => {
  const app = await appSvc.getById(req.params.id);
  if (!app) return res.status(404).json({ error: "application not found" });
  const project = await projSvc.getById(app.project_id);
  if (!managesProject(req.user, project))
    return res.status(403).json({ error: "only the project's tech lead can review applicants" });

  const result = await appSvc.setStatus(req.params.id, (req.body || {}).status);
  if (result.ok) return res.json(result.application);
  res.status(400).json({ error: "invalid status" });
});

// DELETE /api/applications/:id -> withdraw (owner of the application or a manager)
router.delete("/:id", requireAuth, async (req, res) => {
  const app = await appSvc.getById(req.params.id);
  if (!app) return res.status(404).json({ error: "application not found" });
  const project = await projSvc.getById(app.project_id);
  const isSelf = app.developer_id === req.user.id;
  if (!isSelf && !managesProject(req.user, project))
    return res.status(403).json({ error: "not allowed" });
  await appSvc.remove(req.params.id);
  res.status(204).end();
});

module.exports = router;
