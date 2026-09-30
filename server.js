// Express app for CodeBox Match — a project-matching platform for a coding club.
// Frontend (public/) shows the UI; routes/ expose the API; services/ hold
// business logic; db.js is the SQLite layer; middleware/auth.js handles auth
// and role protection. This module exports the app; index.js starts the server.

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");

const authRouter = require("./routes/auth");
const profilesRouter = require("./routes/profiles");
const projectsRouter = require("./routes/projects");
const applicationsRouter = require("./routes/applications");
const adminRouter = require("./routes/admin");

const app = express();

const indexHtml = fs.readFileSync(
  path.join(__dirname, "public", "index.html"),
  "utf8"
);

app.use(express.json());

// Homepage: the CodeBox Match single-page app.
app.get("/", (req, res) => res.type("html").send(indexHtml));

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Temporary DB diagnostic: surfaces the real Postgres error + timing.
app.get("/api/dbcheck", async (req, res) => {
  const db = require("./db");
  const t0 = Date.now();
  try {
    const rows = await db.query("SELECT 1 AS ok");
    res.json({ ok: true, ms: Date.now() - t0, rows });
  } catch (e) {
    res.status(500).json({ ok: false, ms: Date.now() - t0, error: e.message, code: e.code || null });
  }
});

// Temporary write diagnostic: a parameterized INSERT (mirrors register).
app.get("/api/dbwrite", async (req, res) => {
  const db = require("./db");
  const t0 = Date.now();
  try {
    const u = "diag_" + Date.now();
    const ins = await db.query(
      "INSERT INTO members (username, name, role, password_hash, password_salt) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [u, "diag", "developer", "h", "s"]
    );
    await db.query("DELETE FROM members WHERE id = $1", [ins[0].id]);
    res.json({ ok: true, ms: Date.now() - t0, insertedId: ins[0].id });
  } catch (e) {
    res.status(500).json({ ok: false, ms: Date.now() - t0, error: e.message, code: e.code || null });
  }
});

// API
app.use("/api/auth", authRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/admin", adminRouter);

// JSON error handler (Express 5 forwards async route rejections here).
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
