# CodeBox Board

A members' board for the CodeBox coding club. Members register and log in,
then post **announcements**, **events**, and **project shares** — and can edit
or delete their own posts. Built with **Express** + **SQLite**, with **JWT
authentication**.

## Requirements checklist

- ✅ **Running site** — a single-page UI served at `/`
- ✅ **Connected to a DB** — file-based SQLite via Node's built-in `node:sqlite`
- ✅ **User authentication** — register/login with hashed passwords (scrypt) and JWT
- ✅ **CRUD** — create / read / update / delete board posts, with per-owner permissions
- ✅ **Bonus: Vercel** — deploys as a serverless function

## Architecture

```mermaid
flowchart TD
    UI["Web UI (public/index.html)<br/>register · login · post CRUD"]
    subgraph App["Express app (Vercel serverless)"]
        MW["Auth middleware<br/>verify JWT → req.user"]
        Auth["routes/auth.js<br/>register · login · me"]
        Posts["routes/posts.js<br/>CRUD + ownership checks"]
        ASvc["authService<br/>scrypt hashing"]
        PSvc["postService<br/>SQL for posts"]
    end
    DB[("SQLite<br/>members + posts")]

    UI -->|"fetch + Bearer token"| MW
    MW --> Auth --> ASvc --> DB
    MW --> Posts --> PSvc --> DB
    DB --> PSvc --> UI
```

**How auth works:** on register/login the server verifies credentials and
returns a signed JWT. The browser stores it and sends it as
`Authorization: Bearer <token>` on every write. Middleware verifies the token
and attaches the member to the request; routes enforce that a member can only
modify their **own** posts.

## Project structure

```
index.js                  # starts the HTTP server
server.js                 # Express app: UI + API wiring
db.js                     # SQLite: members + posts tables
public/index.html         # the web UI (auth + board + CRUD)
routes/auth.js            # register / login / me
routes/posts.js           # posts CRUD (+ ownership checks)
services/authService.js   # password hashing + credential checks
services/postService.js   # SQL for posts
middleware/auth.js        # JWT sign + verify
vercel.json               # serverless routing + file bundling
```

## Run locally

```bash
npm install
npm start          # http://localhost:3000
```

Optional: set a real `JWT_SECRET` (a dev fallback is used otherwise).

```bash
cp .env.example .env      # then edit JWT_SECRET
```

## API

| Method | Route                 | Auth | Description            |
| ------ | --------------------- | ---- | ---------------------- |
| POST   | `/api/auth/register`  | —    | Create account → token |
| POST   | `/api/auth/login`     | —    | Log in → token         |
| GET    | `/api/auth/me`        | ✅   | Current member         |
| GET    | `/api/posts`          | —    | **Read** all posts     |
| GET    | `/api/posts/:id`      | —    | **Read** one post      |
| POST   | `/api/posts`          | ✅   | **Create** a post      |
| PUT    | `/api/posts/:id`      | ✅*  | **Update** a post      |
| DELETE | `/api/posts/:id`      | ✅*  | **Delete** a post      |

`*` owner-only (returns `403` otherwise).

## Deploy notes (Vercel)

- Set a `JWT_SECRET` environment variable in the Vercel project settings.
- The SQLite file is written to `/tmp` on Vercel (the only writable path),
  so data is per-instance and resets on cold starts. For durable, shared
  storage, swap SQLite for a hosted DB such as **Turso** (SQLite-compatible)
  or **Vercel Postgres**.
