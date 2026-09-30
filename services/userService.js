// Business logic for users, backed by the SQLite database (see db.js).
// Every function runs a prepared statement against the `users` table,
// so all changes are persisted to disk.

const db = require("../db");

// Return every user.
function getAllUsers() {
  return db.prepare("SELECT id, name, email FROM users ORDER BY id").all();
}

// Find a single user by id. Returns the user object, or undefined if none match.
function getUserById(id) {
  return db
    .prepare("SELECT id, name, email FROM users WHERE id = ?")
    .get(Number(id));
}

// Create a new user. Returns the newly created user.
function createUser({ name, email }) {
  const result = db
    .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
    .run(name, email);
  return getUserById(result.lastInsertRowid);
}

// Update an existing user's name/email. Returns the updated user, or
// undefined if no user with that id exists.
function updateUser(id, { name, email }) {
  const existing = getUserById(id);
  if (!existing) return undefined;

  const updated = {
    name: name ?? existing.name,
    email: email ?? existing.email,
  };

  db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(
    updated.name,
    updated.email,
    Number(id)
  );

  return getUserById(id);
}

// Delete a user by id. Returns true if a row was removed, false otherwise.
function deleteUser(id) {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(Number(id));
  return result.changes > 0;
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
