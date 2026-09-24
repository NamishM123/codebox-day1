// Teaching shortcut: signs a JWT for sample user id 1 with a 15-minute expiry.
// This is NOT real credential checking — there is no email/password verification.
// It only exists so you can test the protected /api/me route locally.

require("dotenv").config();

const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error(
    "JWT_SECRET is not set. Create a .env file with JWT_SECRET before running this script."
  );
  process.exit(1);
}

const token = jwt.sign({ sub: 1, name: "Alex" }, secret, {
  algorithm: "HS256",
  expiresIn: "15m",
});

console.log(token);
