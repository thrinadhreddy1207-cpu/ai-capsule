# AI Capsule: Cloud-Deployed AI Prompt Manager

CSE3CWA / CSE5006 Assignment 3. A private prompt library where a user signs in with GitHub and can create, read, update and delete their own AI prompt records.

> **TODO before submitting:** replace every `YOUR-APP` and every section marked **TODO** with your own details.

## Deployment

| | |
|---|---|
| Public URL | https://YOUR-APP.onrender.com |
| Cloud platform | Render (free Web Service, Node runtime) |
| Health check | https://YOUR-APP.onrender.com/api/health returns `{ "status": "ok" }` |

The React frontend and the Express API are served by **one** Render web service from the same public URL. Express serves the built React files from `client/dist`, so the browser talks to the API on the same origin. That avoids CORS and cross-site cookie configuration.

The free Render instance sleeps when idle, so the first request after a while can take 30 to 60 seconds.

## Tech stack

React 18 (Vite, React Router) · Node.js + Express 4 · GitHub OAuth · `jsonwebtoken` · SQLite (Node's built-in `node:sqlite` module)

## Project structure

```
ai-capsule/
├── package.json            # one package for frontend + backend
├── vite.config.js          # builds client/ into client/dist
├── .env.example            # variable names only, no secrets
├── server/
│   ├── index.js            # Express app, /api/health, static React files
│   ├── db.js               # SQLite connection + CREATE TABLE
│   ├── middleware/
│   │   └── requireAuth.js  # JWT verification middleware
│   └── routes/
│       ├── auth.js         # GitHub OAuth login, callback, /auth/me, logout
│       └── capsules.js     # protected CRUD
└── client/
    ├── index.html
    └── src/
        ├── api.js          # fetch wrapper for all API calls
        ├── App.jsx         # routes: /, /login, /dashboard
        ├── pages/          # Landing, Login, Dashboard
        └── components/     # CapsuleForm, CapsuleCard, Header
```

## Install and run locally

Requires Node.js 22.13 or later (uses the built-in `node:sqlite` module, so nothing needs compiling).

```bash
npm install
cp .env.example .env        # then fill in your own values
npm run build               # builds the React app into client/dist
npm start                   # Express on http://localhost:3000
```

Open http://localhost:3000. For local login, create a GitHub OAuth App with callback `http://localhost:3000/auth/github/callback`, and leave `CLIENT_URL` empty in `.env` so the redirect goes back to port 3000.

Optional hot-reload development: run `npm run dev:server` and `npm run dev:client` in two terminals, then open http://localhost:5173 with `CLIENT_URL=http://localhost:5173`. Vite proxies `/api` and `/auth` to Express.

### Render settings

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Environment | Node |

## Environment variables

Stored in Render's **Environment** settings and in a local `.env` file. `.env` is listed in `.gitignore` and is never committed.

| Name | Purpose |
|---|---|
| `JWT_SECRET` | Secret used to sign and verify the application JWT |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | `https://YOUR-APP.onrender.com/auth/github/callback` |
| `NODE_ENV` | `production` on Render |
| `CLIENT_URL` | Local dev only (Vite URL); unset on Render |
| `DB_PATH` | Optional SQLite file path (default `./data/capsules.db`) |
| `PORT` | Set automatically by Render |

The server refuses to start if `JWT_SECRET` or any GitHub variable is missing.

## API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Returns `{ "status": "ok" }` |
| GET | `/api/capsules` | JWT | List the signed-in user's records |
| POST | `/api/capsules` | JWT | Create a record owned by the signed-in user |
| PUT | `/api/capsules/:id` | JWT | Update one of the user's own records |
| DELETE | `/api/capsules/:id` | JWT | Delete one of the user's own records |
| GET | `/auth/github` | Public | Starts GitHub OAuth |
| GET | `/auth/github/callback` | Public | OAuth callback; issues the JWT cookie |
| GET | `/auth/me` | JWT | Returns the signed-in user (used by the dashboard) |
| POST | `/auth/logout` | Public | Clears the `token` cookie |

Page routes `/`, `/login` and `/dashboard` are handled by React Router; Express returns `index.html` for them.

### How React talks to Express

`client/src/api.js` wraps `fetch` with `credentials: 'include'`. Because the page and API share one origin, the browser attaches the HttpOnly `token` cookie automatically. The React code never sees or stores the JWT. If any call returns 401, the dashboard sends the user to `/login`.

## OAuth and JWT

Provider: **GitHub OAuth** (web application flow).

1. `/login` has a link to `/auth/github`. Express generates a random `state` value, stores it in a short-lived HttpOnly cookie, and redirects to GitHub's authorize page with scope `read:user`.
2. GitHub redirects back to `/auth/github/callback?code=...&state=...`. Express checks that `state` matches the cookie (CSRF protection).
3. Express exchanges the code for a GitHub access token server-to-server, using the client secret, and calls `https://api.github.com/user` once to get the user's GitHub ID and login. The GitHub token is not stored and never reaches the browser.
4. Express signs its **own application JWT** with `jsonwebtoken` (HS256, `JWT_SECRET`, 1-day expiry). The payload has `sub` (GitHub user ID), `login`, `name` and `avatar`.
5. The JWT is set in a cookie named **`token`** with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. It is not put in localStorage or an Authorization header.
6. `server/middleware/requireAuth.js` runs on every `/api/capsules` route (`router.use(requireAuth)`). It reads `req.cookies.token` and calls `jwt.verify`. Missing, malformed, wrongly signed or expired tokens get `401 Unauthorized` and no data.

`app.set('trust proxy', 1)` is set because Render terminates HTTPS at a proxy in front of the app.

## Database and ownership

SQLite through Node's built-in `node:sqlite` module. `server/db.js` creates the `capsules` table (schema from the specification) with `CREATE TABLE IF NOT EXISTS` on startup, so no manual setup is needed.

Ownership: `user_id` is the GitHub user ID taken from the **verified JWT** (`req.user.id`). The API never reads `user_id` from the request body.

- CREATE inserts `req.user.id` as `user_id`.
- READ uses `WHERE user_id = ?`.
- UPDATE and DELETE use `WHERE id = ? AND user_id = ?`. If no row matches, the API returns 404, so a user cannot change or delete another user's record, or tell whether it exists.

**Storage is ephemeral on Render's free tier.** The SQLite file lives on the instance's local disk, which is wiped on restart, redeploy or spin-down. Records are lost when that happens. A Render PostgreSQL database or a paid persistent disk would fix this.

## cURL security tests

Run against the deployed URL:

```bash
# Test 1 - no authentication
curl -i https://YOUR-APP.onrender.com/api/capsules

# Test 2 - fake / invalid JWT
curl -i -H "Cookie: token=fake-token-123" https://YOUR-APP.onrender.com/api/capsules
```

**TODO: paste your real results.** Expected:

```
Test 1: HTTP/2 401   {"error":"Unauthorized: no token"}
Test 2: HTTP/2 401   {"error":"Unauthorized: invalid token"}
```

## Limitation

Data does not persist on the free Render instance: because SQLite is stored on the instance's temporary filesystem, all capsules are lost whenever the service restarts, redeploys or sleeps. The app also has no search or filtering, so a long list of capsules becomes hard to browse.

## AI-assisted development

**TODO: write this section in your own words. It must be true, and you need to be able to explain it.**

- **Tools used:** e.g. Claude (Anthropic) for project scaffolding, Express routes, OAuth/JWT code, the React UI and this README.
- **Problem found and corrected:** describe one real issue you hit, what was wrong and how you fixed it. Common ones during deployment: the GitHub OAuth callback URL not matching `GITHUB_CALLBACK_URL` (GitHub shows "redirect_uri is not associated with this application"); the cookie not being set until `trust proxy` / HTTPS were in place; `/dashboard` returning "Cannot GET" before the catch-all route was added.
- **How OAuth, JWT and protected API behaviour were verified:** signed in with GitHub on the deployed site and reached the dashboard; ran the two cURL tests (both 401); checked in browser DevTools > Application > Cookies that `token` is HttpOnly and Secure; confirmed POST, PUT and DELETE without a cookie also return 401.
- **How CRUD and ownership were verified:** created, edited and deleted a record on the deployed site and refreshed to confirm the changes; signed in with a second GitHub account and confirmed it saw an empty list and could not see the first account's records. *(Only claim what you actually did.)*
- **Decision I made and can explain:** e.g. serving React and Express from one Render service, so the cookie is first-party and no CORS setup is needed; or using `WHERE id = ? AND user_id = ?` so ownership is enforced in the database query itself rather than checked afterwards.
