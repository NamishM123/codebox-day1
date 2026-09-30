// JWT helpers + auth/role middleware.
// Tokens are HS256, signed with JWT_SECRET (stable dev fallback for local use;
// set a real JWT_SECRET in production / Vercel env vars).

const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "codebox-match-dev-secret-change-me";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn: "7d" });
}

// Require a valid Bearer token. Attaches req.user = { id, username, role }.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }
  try {
    const p = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    req.user = { id: p.sub, username: p.username, role: p.role || "developer" };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Require one of the given roles (admin always allowed). Use after requireAuth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (req.user.role === "admin" || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
  };
}

module.exports = { signToken, requireAuth, requireRole };
