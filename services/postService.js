// CRUD logic for board posts, backed by SQLite.
// Each post is authored by a member; posts are returned joined with the
// author's username for display.

const db = require("../db");

const SELECT =
  `SELECT posts.id, posts.title, posts.body, posts.category,
          posts.created_at, posts.member_id,
          members.username AS author
   FROM posts JOIN members ON members.id = posts.member_id`;

function getAllPosts() {
  return db.prepare(`${SELECT} ORDER BY posts.id DESC`).all();
}

function getPostById(id) {
  return db.prepare(`${SELECT} WHERE posts.id = ?`).get(Number(id));
}

function createPost(memberId, { title, body, category }) {
  const result = db
    .prepare(
      "INSERT INTO posts (member_id, title, body, category) VALUES (?, ?, ?, ?)"
    )
    .run(Number(memberId), title, body, category || "announcement");
  return getPostById(result.lastInsertRowid);
}

// Update a post's fields. Returns the updated post, or undefined if missing.
function updatePost(id, { title, body, category }) {
  const existing = getPostById(id);
  if (!existing) return undefined;

  const next = {
    title: title ?? existing.title,
    body: body ?? existing.body,
    category: category ?? existing.category,
  };

  db.prepare(
    "UPDATE posts SET title = ?, body = ?, category = ? WHERE id = ?"
  ).run(next.title, next.body, next.category, Number(id));

  return getPostById(id);
}

function deletePost(id) {
  const result = db.prepare("DELETE FROM posts WHERE id = ?").run(Number(id));
  return result.changes > 0;
}

module.exports = {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
};
