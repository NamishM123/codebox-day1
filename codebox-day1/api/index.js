// Vercel serverless entry point.
// Vercel does not run `app.listen()` — instead it invokes this exported
// handler per request. The Express app is a valid (req, res) handler, so we
// export it directly. All routes are wired up in server.js.
module.exports = require("../server");
