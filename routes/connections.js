// Connection requests (networking) — all require auth.
const express = require("express");
const svc = require("../services/connectionService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// POST /api/connections { to_id, message }
router.post("/", async (req, res) => {
  const { to_id, message } = req.body || {};
  const r = await svc.create(req.user.id, to_id, message);
  if (r.ok) return res.status(201).json({ ok: true });
  const map = { bad_target: [400, "invalid recipient"], exists: [409, "you already reached out to them"] };
  const [code, msg] = map[r.reason] || [400, "could not send"];
  res.status(code).json({ error: msg });
});

// GET /api/connections/mine
router.get("/mine", async (req, res) => res.json(await svc.listForUser(req.user.id)));

// PUT /api/connections/:id/status { status }
router.put("/:id/status", async (req, res) => {
  const r = await svc.setStatus(req.params.id, req.user.id, (req.body || {}).status);
  if (r.ok) return res.json({ ok: true });
  const map = { not_found: [404, "not found"], forbidden: [403, "not allowed"], bad_status: [400, "bad status"] };
  const [code, msg] = map[r.reason] || [400, "error"];
  res.status(code).json({ error: msg });
});

module.exports = router;
