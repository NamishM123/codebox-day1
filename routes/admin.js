// Admin-only routes: manage users and roles.

const express = require("express");
const { listUsers, setRole } = require("../services/authService");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// All admin routes require an authenticated admin.
router.use(requireAuth, requireRole("admin"));

// GET /api/admin/users
router.get("/users", (req, res) => res.json(listUsers()));

// PUT /api/admin/users/:id/role  { role }
router.put("/users/:id/role", (req, res) => {
  const { role } = req.body || {};
  // Guard: an admin can't demote themselves (avoid locking out the last admin).
  if (Number(req.params.id) === req.user.id && role !== "admin")
    return res.status(400).json({ error: "you can't change your own admin role" });

  const result = setRole(req.params.id, role);
  if (result.ok) return res.json(result.user);
  const map = { bad_role: [400, "invalid role"], not_found: [404, "user not found"] };
  const [code, msg] = map[result.reason] || [400, "could not update role"];
  res.status(code).json({ error: msg });
});

module.exports = router;
