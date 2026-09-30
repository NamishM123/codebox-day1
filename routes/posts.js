// CRUD routes for board posts.
// Reads are public; create/update/delete require auth, and a member may
// only modify their own posts (ownership check).

const express = require("express");
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} = require("../services/postService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const CATEGORIES = ["announcement", "event", "project"];

// READ: all posts (public)
router.get("/", (req, res) => {
  res.json(getAllPosts());
});

// READ: one post (public)
router.get("/:id", (req, res) => {
  const post = getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: "post not found" });
  res.json(post);
});

// CREATE: authored by the logged-in member
router.post("/", requireAuth, (req, res) => {
  const { title, body, category } = req.body || {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!body || typeof body !== "string" || !body.trim()) {
    return res.status(400).json({ error: "body is required" });
  }
  if (category && !CATEGORIES.includes(category)) {
    return res
      .status(400)
      .json({ error: `category must be one of: ${CATEGORIES.join(", ")}` });
  }

  const post = createPost(req.user.id, {
    title: title.trim(),
    body: body.trim(),
    category,
  });
  res.status(201).json(post);
});

// UPDATE: only the author may edit
router.put("/:id", requireAuth, (req, res) => {
  const existing = getPostById(req.params.id);
  if (!existing) return res.status(404).json({ error: "post not found" });
  if (existing.member_id !== req.user.id) {
    return res.status(403).json({ error: "you can only edit your own posts" });
  }

  const { title, body, category } = req.body || {};
  if (category && !CATEGORIES.includes(category)) {
    return res
      .status(400)
      .json({ error: `category must be one of: ${CATEGORIES.join(", ")}` });
  }

  const post = updatePost(req.params.id, { title, body, category });
  res.json(post);
});

// DELETE: only the author may delete
router.delete("/:id", requireAuth, (req, res) => {
  const existing = getPostById(req.params.id);
  if (!existing) return res.status(404).json({ error: "post not found" });
  if (existing.member_id !== req.user.id) {
    return res.status(403).json({ error: "you can only delete your own posts" });
  }

  deletePost(req.params.id);
  res.status(204).end();
});

module.exports = router;
