// Express app definition and middleware setup.
// Route handlers live in routes/, business logic in services/, auth in
// middleware/, and the SQLite database in db.js. This module exports the
// configured app; index.js is responsible for starting the HTTP server.

require("dotenv").config();

const express = require("express");
const usersRouter = require("./routes/users");
const { requireAuth } = require("./middleware/auth");

const app = express();

// Middleware
app.use(express.json());

// Public routes
app.get("/", (req, res) => {
  res.send("Hello from CodeBox!");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Users resource: full CRUD backed by SQLite.
app.use("/api/users", usersRouter);

// Protected route: requires a valid JWT (see middleware/auth.js).
app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    id: 1,
    name: "Alex",
    email: "alex@codebox.dev",
    role: "member",
  });
});

module.exports = app;
