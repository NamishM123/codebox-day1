// JWT verification middleware.
// Expects an HS256 token in: Authorization: Bearer <token>
// Verifies the signature and expiration using JWT_SECRET from the environment.

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;

  // No hardcoded/fallback secret: fail clearly if it is not configured.
  if (!secret) {
    return res
      .status(500)
      .json({ error: "Server misconfigured: JWT_SECRET is not set" });
  }

  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    req.user = payload; // make token claims available to the route
    next();
  } catch (err) {
    // Covers invalid signature, expired token, wrong algorithm, etc.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
