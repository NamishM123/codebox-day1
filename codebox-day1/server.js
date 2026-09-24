const express = require("express");

const app = express();
const PORT = 3000;

// In-memory user data (no database yet)
const users = [
  { id: 1, name: "Alex" },
  { id: 2, name: "Sam" },
];

app.get("/", (req, res) => {
  res.send("Hello from CodeBox!");
});

// Return the full list of users
app.get("/api/users", (req, res) => {
  res.json(users);
});

// Return a single user by id, or 404 if not found
app.get("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: `User ${req.params.id} not found` });
  }

  res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
