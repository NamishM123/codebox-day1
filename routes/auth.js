// Authentication routes: register, login, and current-member lookup.

const express = require("express");
const { registerMember, authenticate } = require("../services/authService");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register -> create account, return a token
router.post("/register", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "username must be at least 3 characters" });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res
      .status(400)
      .json({ error: "password must be at least 6 characters" });
  }

  try {
    const member = registerMember(username.trim(), password);
    const token = signToken({ sub: member.id, username: member.username });
    res.status(201).json({ token, user: member });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "username already taken" });
    }
    res.status(500).json({ error: "could not register" });
  }
});

// POST /api/auth/login -> verify credentials, return a token
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const member = authenticate(username, password);
  if (!member) {
    return res.status(401).json({ error: "invalid username or password" });
  }

  const token = signToken({ sub: member.id, username: member.username });
  res.json({ token, user: member });
});

// GET /api/auth/me -> the current member (requires a valid token)
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
