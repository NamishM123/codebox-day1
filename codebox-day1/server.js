// Server startup and middleware setup.
// Route handlers live in routes/, business logic in services/, auth in middleware/.

require("dotenv").config();

const express = require("express");
const usersRouter = require("./routes/users");
const { requireAuth } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Public routes
app.get("/", (req, res) => {
  res.send("Hello from CodeBox!");
});

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
