// Developer profile routes.

const express = require("express");
const { getByMemberId, upsertProfile } = require("../services/profileService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/profiles/me -> my profile (or null)
router.get("/me", requireAuth, async (req, res) => {
  res.json(await getByMemberId(req.user.id));
});

// PUT /api/profiles/me -> create/update my profile
router.put("/me", requireAuth, async (req, res) => {
  res.json(await upsertProfile(req.user.id, req.body || {}));
});

// GET /api/profiles/:memberId -> public profile lookup
router.get("/:memberId", async (req, res) => {
  const profile = await getByMemberId(req.params.memberId);
  if (!profile) return res.status(404).json({ error: "profile not found" });
  res.json(profile);
});

module.exports = router;
