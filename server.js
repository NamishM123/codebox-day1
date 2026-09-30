// Express app for CodeBox Board — a coding-club members' board.
// Auth lives in routes/auth.js, board CRUD in routes/posts.js, data logic in
// services/, JWT in middleware/auth.js, and the SQLite DB in db.js.
// This module exports the app; index.js starts the HTTP server.

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");

const authRouter = require("./routes/auth");
const postsRouter = require("./routes/posts");

const app = express();

// Load the single-page UI once at startup.
const indexHtml = fs.readFileSync(
  path.join(__dirname, "public", "index.html"),
  "utf8"
);

app.use(express.json());

// Homepage: the board UI (register/login + create/edit/delete posts).
app.get("/", (req, res) => {
  res.type("html").send(indexHtml);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);

module.exports = app;
