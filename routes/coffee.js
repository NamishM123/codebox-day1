// Coffee-chat slots. Listing is public; offering/booking/removing need auth.
const express = require("express");
const svc = require("../services/coffeeService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => res.json(await svc.list()));

router.post("/", requireAuth, async (req, res) => {
  const { slot_time, topic } = req.body || {};
  const r = await svc.create(req.user.id, slot_time, topic);
  if (r.ok) return res.status(201).json({ ok: true });
  res.status(400).json({ error: "a time is required" });
});

router.post("/:id/book", requireAuth, async (req, res) => {
  const r = await svc.book(req.params.id, req.user.id);
  if (r.ok) return res.json({ ok: true });
  const map = { not_found: [404, "not found"], taken: [409, "already booked"], own: [400, "that's your own slot"] };
  const [code, msg] = map[r.reason] || [400, "could not book"];
  res.status(code).json({ error: msg });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const r = await svc.remove(req.params.id, req.user.id);
  if (r.ok) return res.status(204).end();
  res.status(r.reason === "forbidden" ? 403 : 404).json({ error: "could not remove" });
});

module.exports = router;
