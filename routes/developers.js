// Developer directory + skill search (public read).
const express = require("express");
const { listDevelopers } = require("../services/profileService");

const router = express.Router();

// GET /api/developers?skill=react
router.get("/", async (req, res) => {
  res.json(await listDevelopers(req.query.skill));
});

module.exports = router;
