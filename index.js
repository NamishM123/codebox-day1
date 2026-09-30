// Application entry point: starts the HTTP server.
// The Express app (routes, middleware, DB wiring) is defined in server.js.

const app = require("./server");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
