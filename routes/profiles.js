// Developer profile routes.

const express = require("express");
const { getByMemberId, upsertProfile } = require("../services/profileService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/profiles/me -> my profile (or null)
router.get("/me", requireAuth, (req, res) => {
  res.json(getByMemberId(req.user.id));
});

// PUT /api/profiles/me -> create/update my profile
router.put("/me", requireAuth, (req, res) => {
  const profile = upsertProfile(req.user.id, req.body || {});
  res.json(profile);
});

// GET /api/profiles/:memberId -> public profile lookup
router.get("/:memberId", (req, res) => {
  const profile = getByMemberId(req.params.memberId);
  if (!profile) return res.status(404).json({ error: "profile not found" });
  res.json(profile);
});

module.exports = router;
