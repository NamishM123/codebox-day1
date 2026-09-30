// JWT helpers + verification middleware.
// Tokens are HS256, signed with JWT_SECRET. A stable dev fallback is used
// when the env var is unset so the app runs out-of-the-box (set a real
// JWT_SECRET in production / Vercel env vars).

const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "codebox-club-dev-secret-change-me";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn: "7d" });
}

// Require a valid Bearer token. On success, attaches req.user = { id, username }.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { signToken, requireAuth };
