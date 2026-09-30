// HTTP handlers for /api/users, wired up with an Express Router.
// Full CRUD: Create (POST), Read (GET), Update (PUT), Delete (DELETE).
// Routes only deal with request/response; data logic lives in the service.

const express = require("express");
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../services/userService");

const router = express.Router();

// Basic email shape check for create/update.
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// READ: GET /api/users -> full list
router.get("/", (req, res) => {
  res.json(getAllUsers());
});

// READ: GET /api/users/:id -> one user, or 404 JSON error
router.get("/:id", (req, res) => {
  const user = getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: `User ${req.params.id} not found` });
  }

  res.json(user);
});

// CREATE: POST /api/users -> create a user
router.post("/", (req, res) => {
  const { name, email } = req.body || {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "a valid email is required" });
  }

  try {
    const user = createUser({ name, email });
    res.status(201).json(user);
  } catch (err) {
    // UNIQUE constraint on email, etc.
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "email already exists" });
    }
    res.status(500).json({ error: "could not create user" });
  }
});

// UPDATE: PUT /api/users/:id -> update name and/or email
router.put("/:id", (req, res) => {
  const { name, email } = req.body || {};

  if (email !== undefined && !isValidEmail(email)) {
    return res.status(400).json({ error: "a valid email is required" });
  }
  if (name !== undefined && (typeof name !== "string" || name.length === 0)) {
    return res.status(400).json({ error: "name must be a non-empty string" });
  }

  try {
    const user = updateUser(req.params.id, { name, email });
    if (!user) {
      return res.status(404).json({ error: `User ${req.params.id} not found` });
    }
    res.json(user);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "email already exists" });
    }
    res.status(500).json({ error: "could not update user" });
  }
});

// DELETE: DELETE /api/users/:id -> remove a user
router.delete("/:id", (req, res) => {
  const removed = deleteUser(req.params.id);

  if (!removed) {
    return res.status(404).json({ error: `User ${req.params.id} not found` });
  }

  res.status(204).end();
});

module.exports = router;
