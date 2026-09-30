// Express app definition and middleware setup.
// Route handlers live in routes/, business logic in services/, auth in
// middleware/, and the SQLite database in db.js. This module exports the
// configured app; index.js is responsible for starting the HTTP server.

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const usersRouter = require("./routes/users");
const { requireAuth } = require("./middleware/auth");

const app = express();

// Load the single-page UI once at startup.
const indexHtml = fs.readFileSync(
  path.join(__dirname, "public", "index.html"),
  "utf8"
);

// Middleware
app.use(express.json());

// Homepage: a small UI that lists, creates, and deletes users via the API.
app.get("/", (req, res) => {
  res.type("html").send(indexHtml);
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
