// Business logic and (temporary) in-memory data for users.
// No database yet — this array lives only while the server is running.

const users = [
  { id: 1, name: "Alex" },
  { id: 2, name: "Sam" },
];

// Return every user.
function getAllUsers() {
  return users;
}

// Find a single user by id. Returns the user object, or undefined if none match.
function getUserById(id) {
  const numericId = Number(id);
  return users.find((u) => u.id === numericId);
}

module.exports = { getAllUsers, getUserById };
