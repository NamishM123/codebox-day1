// Auth routes: register, login, current user.

const express = require("express");
const { registerMember, authenticate, getById, publicUser } = require("../services/authService");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

function tokenFor(user) {
  return signToken({ sub: user.id, username: user.username, role: user.role });
}

// POST /api/auth/register -> everyone starts as a developer
router.post("/register", (req, res) => {
  const { username, name, password } = req.body || {};
  if (!username || typeof username !== "string" || username.trim().length < 3)
    return res.status(400).json({ error: "username must be at least 3 characters" });
  if (!password || typeof password !== "string" || password.length < 6)
    return res.status(400).json({ error: "password must be at least 6 characters" });

  try {
    const user = registerMember(username.trim(), (name || "").trim(), password);
    res.status(201).json({ token: tokenFor(user), user });
  } catch (err) {
    if (String(err.message).includes("UNIQUE"))
      return res.status(409).json({ error: "username already taken" });
    res.status(500).json({ error: "could not register" });
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "username and password are required" });
  const user = authenticate(username, password);
  if (!user) return res.status(401).json({ error: "invalid username or password" });
  res.json({ token: tokenFor(user), user });
});

// GET /api/auth/me -> fresh user record (role may have changed since login)
router.get("/me", requireAuth, (req, res) => {
  const user = publicUser(getById(req.user.id));
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json({ user, token: tokenFor(user) });
});

module.exports = router;
