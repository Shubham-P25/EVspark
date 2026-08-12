# EV Twin — Starting Guide

A phased checklist to take the repo from "scaffolded" to "deployed." Based on a review of the current codebase (Aug 2026).

---

## Current State

**Working / in place**
- Monorepo with npm workspaces: `apps/web`, `apps/api`, `scripts/mqtt-simulator`
- `apps/api`: Prisma 7 schema defined (User, Station, Charger, Favorite, Review), `prisma.config.ts` correctly configured, `prisma.ts` client wired with the `pg` adapter, `.env.example` lists all needed vars
- `apps/web`: Next.js 16 app created, but still the default `create-next-app` scaffold (no real pages yet)
- `apps/models` (FastAPI ML service): only `.env.example` exists — no Python code yet

**Missing / broken — fix these first**
1. **No Express entry point in `apps/api`** — no `index.ts`/`server.ts`, no routes, no controllers, no CORS/Socket.io/MQTT wiring, despite the dependencies (`express`, `cors`, `socket.io`, `mqtt`) already installed.
2. **`apps/models` is empty** — no `main.py`, no `requirements.txt`, nothing runnable.
3. **`scripts/MQTT-simulator` folder casing mismatch** — root `package.json` workspaces list `scripts/mqtt-simulator` (lowercase), but the actual folder is `scripts/MQTT-simulator`. Works on Windows (case-insensitive FS) but **will break on Vercel/Linux deploys**. Rename the folder to match exactly.
4. **`scripts/MQTT-simulator/package.json` has no dependencies** — no `mqtt` package installed, and no actual simulator script exists yet.
5. **Neon Auth (`@neondatabase/auth`) is installed in `apps/api` only** — it's not wired anywhere, and for a Next.js app it's normally driven from `apps/web`.
6. No visible `.gitignore` in the dump — confirm one exists and covers `node_modules`, `.env`, `apps/models/venv`, `.next`, `dist`.

---

## Phase 0 — Quick fixes (do these before anything else)

- [ ] Rename `scripts/MQTT-simulator` → `scripts/mqtt-simulator` so it matches `package.json` workspaces exactly
- [ ] Add/verify root `.gitignore`:
  ```
  node_modules/
  .env
  .env.local
  apps/models/venv/
  apps/models/__pycache__/
  .next/
  dist/
  ```
- [ ] Confirm `git status` isn't already tracking `node_modules` or `venv` from earlier commits (if it is, `git rm -r --cached` them)

---

## Phase 1 — `apps/api`: finish the core server

- [ ] `src/index.ts` — Express app bootstrap: JSON body parsing, `cors` (allow the web app's origin), mount routers, error-handling middleware, `PORT` from env
- [ ] `src/routes/` + `src/controllers/` for each model: `stations`, `chargers`, `users`, `favorites`, `reviews`
- [ ] Wire Socket.io on top of the HTTP server (for live charger status pushes to the driver map)
- [ ] MQTT consumer: subscribe to the simulator's topic(s), update `Charger.status`/`updatedAt` in the DB, emit a Socket.io event on change
- [ ] Basic input validation (zod or similar) on the write endpoints
- [ ] Confirm `npx prisma db push` runs clean against a real Neon database, then `npx prisma generate`

---

## Phase 2 — `apps/models`: FastAPI forecasting service

- [ ] `requirements.txt` — fastapi, uvicorn, pandas, prophet (or whatever the forecasting approach ends up being), python-dotenv
- [ ] `main.py` — app instance, a `/health` endpoint, and a stub `/forecast` endpoint that accepts a station/charger id and returns a placeholder wait-time estimate
- [ ] `.env` loading for `PORT` (already in `.env.example`)
- [ ] Local run check: `uvicorn main:app --reload --port 8000`
- [ ] Decide the actual forecasting input data before building the real model — this can stay a stub until `apps/api` is emitting real usage data to train on

---

## Phase 3 — `scripts/mqtt-simulator`

- [ ] `npm install mqtt` in this workspace
- [ ] `index.js`/`index.ts` — connects to the broker, picks a few fake charger IDs, publishes randomized status/power readings on an interval
- [ ] `start`/`dev` script in `package.json` (currently only has a placeholder `test` script)
- [ ] Point it at the same `MQTT_BROKER_URL` the api uses to consume from

---

## Phase 4 — Neon Auth

Neon Auth here means **Managed Better Auth** (`@neondatabase/auth`), which is already a dependency in `apps/api` — but for a Next.js app the auth flow is normally driven from `apps/web`.

- [ ] In the Neon console: Project → Branch → **Auth** → Enable Auth, copy the Auth URL
- [ ] In `apps/web`: `npm install @neondatabase/auth @neondatabase/auth-ui`
- [ ] Env vars (in `apps/web/.env.local` and wherever you deploy it):
  ```
  NEON_AUTH_BASE_URL=<from Neon console>
  NEON_AUTH_COOKIE_SECRET=<openssl rand -base64 32>
  ```
- [ ] `lib/auth/server.ts` — `createNeonAuth()` server instance
- [ ] `lib/auth/client.ts` — `createAuthClient()` for client components
- [ ] Wrap the app in `NeonAuthUIProvider` (in `app/providers.tsx`), pull in the prebuilt sign-in/sign-up UI components
- [ ] Decide how `Role` (DRIVER/OPERATOR/ADMIN) maps onto Neon Auth's user object — likely a custom field or a lookup against your own `User` table on login
- [ ] If `apps/api` needs to verify who's calling it (e.g. protecting operator/admin endpoints), check whether Neon Auth ships a framework-agnostic verify function, or plan to pass a session token from the frontend for the API to validate

*(This area moves fast — double-check the exact API surface against Neon's current docs when you get to this phase, since package versions shift often.)*

---

## Phase 5 — `apps/web`: replace the scaffold with real pages

- [ ] Replace `app/page.tsx` with an actual landing page (what EV Twin is, sign-in/sign-up CTA)
- [ ] `app/layout.tsx` — real nav (logo, links, auth state) instead of the default shell
- [ ] `app/map/page.tsx` — driver map view using `@react-google-maps/api` (already installed), pulling stations from `apps/api`
- [ ] `app/dashboard/operator/page.tsx` — operator dashboard shell (their stations, charger statuses)
- [ ] `app/dashboard/admin/page.tsx` — admin dashboard shell (pending station approvals, all stations)
- [ ] `app/sign-in`, `app/sign-up` — using Neon Auth UI components from Phase 4
- [ ] A small typed API client (`lib/api.ts`) wrapping `axios`, pointed at `ML_SERVICE_URL`/API base URL via env
- [ ] Socket.io client wiring for live charger updates on the map

---

## Phase 6 — Git

- [ ] `git status` — confirm what's already tracked
- [ ] If not already a repo: `git init`
- [ ] Stage and commit: `git add . && git commit -m "Scaffold EV Twin monorepo"`
- [ ] Create the GitHub repo (via github.com or `gh repo create`)
- [ ] `git remote add origin <repo-url>` and `git push -u origin main`
- [ ] Double check `.env` files were never committed (`git log --all --full-history -- "*.env"` should be empty)

---

## Phase 7 — Deployment

Three different runtimes here, so three different targets:

| App | Platform | Why |
|---|---|---|
| `apps/web` (Next.js) | **Vercel** | Native Next.js support, zero-config |
| `apps/api` (Express + Socket.io + MQTT) | **Railway** or **Render** | Needs a long-running process for Socket.io connections and the MQTT subscriber — not a fit for Vercel's serverless functions |
| `apps/models` (FastAPI) | **Railway** or **Render** | Same reasoning — long-running Python process |
| `scripts/mqtt-simulator` | **Railway** (background worker) | Not user-facing, just needs to keep running |
| Database | **Neon** (already your DB) | Already in use for Prisma |

- [ ] Set all `.env.example` values as real env vars on each platform (don't forget `DATABASE_URL`, `NEON_AUTH_*`, `MQTT_BROKER_URL`, `ML_SERVICE_URL` pointing at the deployed FastAPI URL, not `localhost`)
- [ ] Update CORS in `apps/api` to allow the deployed Vercel domain, not just `localhost`
- [ ] After first deploy, run `npx prisma db push` (or set up proper migrations with `prisma migrate deploy`) against the production Neon database
- [ ] Confirm Socket.io still works cross-origin once `apps/web` and `apps/api` are on different domains

---

## Suggested order of attack

1. Phase 0 (quick fixes) — 15 minutes, prevents future pain
2. Phase 1 (`apps/api` core) — biggest single chunk, everything else depends on it
3. Phase 3 (MQTT simulator) — needed to test Phase 1's consumer end-to-end
4. Phase 6 (git) — commit once you have a working api, don't wait until the whole thing is "done"
5. Phase 4 (Neon Auth) + Phase 5 (frontend pages) — can happen in parallel once the api has real endpoints to hit
6. Phase 2 (FastAPI stub) — can be a thin placeholder until you have real usage data anyway
7. Phase 7 (deployment) — once each piece runs locally end-to-end
