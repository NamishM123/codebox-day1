// HTTP handlers for /api/users, wired up with an Express Router.
// Routes only deal with request/response; lookup logic lives in the service.

const express = require("express");
const { getAllUsers, getUserById } = require("../services/userService");

const router = express.Router();

// GET /api/users -> full list
router.get("/", (req, res) => {
  res.json(getAllUsers());
});

// GET /api/users/:id -> one user, or 404 JSON error
router.get("/:id", (req, res) => {
  const user = getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: `User ${req.params.id} not found` });
  }

  res.json(user);
});

module.exports = router;
