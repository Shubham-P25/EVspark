# EVspark — Agent Execution Manual (`commands.md`)

> Audience: an autonomous coding agent (Gemini Flash class) working inside the EVspark monorepo.
> Owner: pp (student developer). Goal: turn the current demo-grade skeleton into an industrial-grade, fast, cheap-to-run EV charging platform.
> Authority order if two sources disagree: **(1) this file → (2) `codemap.md` → (3) `starting (1).md` → (4) existing code.**

---

## 0. HOW YOU MUST WORK (read this section first, every session)

You have a limited context window. Most failures come from doing too much at once. Follow these rules exactly.

### 0.1 Operating loop
1. Work on **ONE task at a time** (IDs look like `T2.3`). Never start a task before the previous one is verified.
2. Before editing: write a **plan of at most 5 lines** (files you will touch, what changes, how you will verify).
3. Read **only the files the task names** plus files you must touch. Do not scan the whole repo.
4. Make the change. Run the task's **Verify** command(s). If they fail, fix and re-run. Maximum 3 fix attempts, then STOP and report (see 0.6).
5. Commit with the message given in the task (`git add -A && git commit -m "..."`).
6. Update `docs/PROGRESS.md` (see 0.4). Then move to the next task.
7. After the last task of a phase, print a **Phase Report** (what was done, what was skipped and why, open risks) and **wait for the user to say "continue"**. Do not auto-start the next phase.

### 0.2 Files and folders you must NEVER read or open
- `codedump.txt`, `ev-spark.zip`, `tree`, `.qmind/`, `node_modules/`, `.next/`, `dist/`, `apps/api/src/generated/`, `*.lock`, `pnpm-lock.yaml`, `tsconfig.tsbuildinfo`.
- They are huge or generated. Opening them wastes your context. (Task T1.2 deletes the junk ones.)

### 0.3 Hard rules (violating any = task failed)
- **No placeholders.** No `// TODO`, `// implement later`, `pass`, fake returns, or "example only" code. If you cannot finish a task, STOP and report instead of stubbing.
- **No invented data.** Never hardcode fake statistics in the UI. Every number shown must come from the API or be labelled **"Simulated data"**.
- **No secrets in code or logs.** Real keys live only in `.env` files (git-ignored). Provide `.env.example` with empty values. Never print a secret value in your output.
- **Do not upgrade or downgrade dependency major versions** unless a task says so. Do not "fix" version numbers that look unusual (this project uses Next 16, React 19, Prisma 7, Express 5, Zod 4, TypeScript 5/7 — they are intentional).
- **Stay in scope.** Do not refactor, rename, or reformat files a task does not mention. No drive-by changes.
- **TypeScript strict.** No `any` unless unavoidable; if used, add a one-line comment why. No `@ts-ignore`.
- **Cross-platform scripts.** The user may be on Windows PowerShell. In `package.json` scripts and tooling use only cross-platform tools (`rimraf`, `cross-env`, node scripts). No `rm -rf`, no bash-only syntax in scripts.
- **Package manager is `pnpm`** after Phase 1. Never run `npm install` after that.
- **Never rewrite git history** (`filter-branch`, `filter-repo`, force push). Report large-file history to the user instead.
- **Do not guess third-party APIs** (Neon Auth, Sentry, BullMQ, Upstash, Magic UI, Google Maps). Read the installed package's README/types in `node_modules/<pkg>` or its official docs first. If still unclear, STOP and ask.
- One branch per phase: `phase-1-cleanup`, `phase-2-infra`, … Merge only when the user approves.

### 0.4 Progress file (your memory between sessions)
Create `docs/PROGRESS.md` in T1.1. After every task append one line:
`- [x] T2.3 Redis client + health check — commit abc1234 — verified: pnpm --filter api test`
If your context resets, **re-read `docs/PROGRESS.md` and this file's current phase only**, then continue at the first unchecked task.

### 0.5 Output style
- Be concise in chat. Show commands you ran and their pass/fail result. No long explanations.
- Never paste whole files into chat; refer to paths.

### 0.6 When to STOP and ask the user
Stop immediately and ask (one clear question, with your recommended default) when:
- A required secret/env value is missing and the task cannot run without it.
- A dataset file the task needs is missing from `data/raw/` (see Phase 5).
- A verify step fails 3 times.
- Two instructions conflict, or a task would delete something not listed for deletion.
- You find a **real secret committed in the repo** (see T1.1) — report file path and key *name* only, never the value.

---

## 1. PROJECT FACTS (ground truth — do not re-derive)

**Product:** EVspark ("EV Twin"): EV charging platform for India. Driver map with smart station recommendation, Station (operator) dashboard, Admin dashboard, AI wait-time forecasting, real-time updates. Data is **simulated** (digital twin) on top of a real all-India station list. Currency ₹ INR. Default region Maharashtra (Mumbai, Thane, Pune); must work all-India.

**Repo today (`EVspark-main/`):**
| Path | Reality |
|---|---|
| `apps/api` | Express 5 + Prisma 7 (`prisma-client` generator → `src/generated/prisma`, adapter-pg) + Socket.io + OCPP 1.6J WebSocket (`src/lib/ocpp.ts`, handles BootNotification, StatusNotification, StartTransaction, MeterValues, StopTransaction) + MQTT consumer (`src/lib/mqtt.ts`). 13 controllers. `prisma.config.ts` is CommonJS and only reads `DATABASE_URL`. **No migrations folder content, no auth, CORS `*`, no tests, only stations use Zod.** `validate.ts` only validates `req.body`. |
| `apps/web` | Custom Next.js 16 app (NOT the planned template, no `components.json`). Duplicate routes: `/auth/*` and `/(auth)/*`; `/operator` and `/dashboard/operator`; `/admin` and `/dashboard/admin`; `/driver` and `/dashboard/driver`. Driver page (957 lines) starts from seed/local state; Operator page uses mock data; landing has invented numbers. Both Google Maps and Leaflet installed. Auth libs present: `@stackframe/stack`, `next-auth`, `@neondatabase/auth`. |
| `apps/models` | FastAPI `main.py` with a hand-written demand curve, labelled "LightGBM-Hybrid-v1" but **nothing is trained**. CORS `*`. |
| `packages/shared` (`@evspark/shared`) | `wait-time.ts`, `scoring.ts`, `geo.ts`, `types.ts`, tests with `node:test`. **Not imported by anyone**; API has a duplicate at `apps/api/src/services/scoring.ts`. |
| `scripts/MQTT-simulator` | 91-line script that randomly flips a charger status. Root `package.json` references lowercase `scripts/mqtt-simulator` → broken on Linux. |
| Root | npm workspaces, `.gitignore` wrongly excludes `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `package-lock.json`. Junk: `codedump.txt` (4.4 MB), `ev-spark.zip`, `tree`, `.qmind/`. |

**Database models (Prisma, keep names):** User, VehicleModel, DriverProfile, OperatorProfile, Station (`lat`,`lng` floats), Charger (`ocppId`, `connectorType`, `powerKw`, `status`), ChargerEvent, Session (`source` default "sim" — comment says "real"|"sim"), QueueEntry, Booking, Favorite, Review, Issue, StationMetricHourly, Forecast (`predictedWait`, `actualWait?`), SimConfig (`speed`, `surgeStations`, `seed`).

**Decisions already made (do not reopen):**
- Keep Express (no Fastify rewrite). Keep Postgres (no MongoDB, Kafka, Elasticsearch, Algolia).
- Single auth: **Neon Auth**. Remove `@stackframe/stack` and `next-auth` from web.
- Single map: **Google Maps** (`@react-google-maps/api`). Remove Leaflet.
- Internal event bus: **Redis pub/sub**. OCPP 1.6J is the charger protocol. MQTT stays **only** as an optional module for the hazard-sensor demo, disabled by default.
- Images → Cloudinary. Everything else (video, model files, backups) → Cloudflare R2.
- Realtime: Socket.io **rooms** + 1-second batching. Never `io.emit` globally for charger updates.
- Demo priority: **Driver dashboard + Station dashboard**. Admin and landing polish are the cut line.
- Overload alerts: **red highlight only, no emails.**
- Landing page = **light theme**.

---

## 2. TARGET REPO STRUCTURE (final state after all phases)

```
evspark/
├─ .github/
│  ├─ workflows/ci.yml                 # web+api+shared+ml jobs
│  └─ dependabot.yml
├─ apps/
│  ├─ web/                             # Next.js 16 on arhamkhnz template
│  ├─ api/                             # Express 5 API + OCPP + Socket.io
│  └─ ml-service/                      # FastAPI forecast service (renamed from apps/models)
├─ packages/
│  └─ shared/                          # types, zod schemas, wait-time, scoring, geo
├─ scripts/
│  ├─ twin-engine/                     # virtual vehicles + OCPP charge points
│  ├─ seed/                            # station import + pattern builder
│  └─ mqtt-simulator/                  # hazard demo only (renamed, lowercase)
├─ tests/
│  ├─ e2e/                             # Playwright smoke test
│  └─ load/                            # k6 scripts
├─ data/
│  ├─ raw/                             # user-provided datasets (git-ignored, README inside)
│  └─ patterns/                        # generated hourly profiles (committed, small JSON)
├─ docs/
│  ├─ PROGRESS.md
│  ├─ ARCHITECTURE.md
│  └─ DEPLOYMENT.md
├─ docker-compose.yml
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
├─ .gitignore  .env.example  .editorconfig  .nvmrc
└─ README.md
```

---

## 3. ENVIRONMENT VARIABLES (create these `.env.example` files; values empty)

**Root `.env.example`** (used by docker-compose): `POSTGRES_USER=evspark`, `POSTGRES_PASSWORD=evspark`, `POSTGRES_DB=evspark` (local-only defaults are allowed here).

**`apps/api/.env.example`**
```
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=              # pooled Neon URL at runtime (local: docker postgres)
DIRECT_URL=                # direct (non-pooled) URL, used ONLY by prisma migrate
REDIS_URL=redis://localhost:6379      # Upstash: rediss://...
NEON_AUTH_JWKS_URL=        # from Neon Auth dashboard
NEON_AUTH_ISSUER=          # from Neon Auth dashboard
ADMIN_EMAILS=              # comma-separated; these emails get ADMIN role
ML_SERVICE_URL=http://localhost:8000
SENTRY_DSN=
LOG_LEVEL=info
ENABLE_MQTT=false
MQTT_BROKER_URL=
MQTT_USERNAME=
MQTT_PASSWORD=
SOCKET_REDIS_ADAPTER=false # true only when running >1 API instance
QUEUE_DRIVER=cron          # cron | bullmq
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```
**`apps/web/.env.example`**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_NEON_AUTH_URL`, `NEXT_PUBLIC_HERO_VIDEO_URL`, `NEXT_PUBLIC_HERO_POSTER_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.
**`apps/ml-service/.env.example`**: `ALLOWED_ORIGINS`, `MODEL_PATH=models/forecast.joblib`, `SENTRY_DSN`, `LOG_LEVEL`.
**`scripts/twin-engine/.env.example`**: `API_URL=http://localhost:4000`, `OCPP_URL=ws://localhost:4000/ocpp/1.6`, `TWIN_API_KEY=`.

---

# PHASE 1 — Repo cleanup and tooling  (branch `phase-1-cleanup`)

### T1.1 — Safety scan and progress file
1. Create branch `phase-1-cleanup`. Create `docs/PROGRESS.md` with a title and an empty checklist.
2. Run a secret scan over **tracked files only** using `git grep -nIE "(AIza[0-9A-Za-z_-]{35}|postgres(ql)?://[^ \"']+:[^ \"'@]+@|sk_live|rediss?://[^ ]*:[^ ]*@|cloudinary://|api[_-]?secret\s*=\s*\S+)"`. Do **not** open `codedump.txt` in the editor; grep output must show file path and line number only (use `-l` first, then report names, never values).
3. If anything matches: STOP, tell the user which files and key *types* were found and that those keys must be **rotated** (Google Maps key, Neon password, Cloudinary secret). Continue only after the user acknowledges.
**Verify:** `docs/PROGRESS.md` exists; scan result reported. **Commit:** `chore: add progress tracker`.

### T1.2 — Remove junk and fix `.gitignore`
1. `git rm` these: `codedump.txt`, `ev-spark.zip`, `tree`, `.qmind/` (whole folder), `apps/web/tsconfig.tsbuildinfo`, `apps/api/.agents/`, `apps/api/.claude/`, `apps/api/.windsurf/`, `apps/api/skills-lock.json` if tracked.
2. **Replace** `.gitignore` entirely with a single clean file containing: `node_modules/`, `.pnpm-store/`, `.turbo/`, `.next/`, `dist/`, `build/`, `coverage/`, `*.tsbuildinfo`, `.env`, `.env.*` with `!.env.example`, `venv/`, `.venv/`, `__pycache__/`, `*.pyc`, `apps/api/src/generated/`, `data/raw/*` with `!data/raw/README.md`, `models/*.joblib` (ml artifacts go to R2), `.DS_Store`, `*.log`, agent folders (`.agents/`, `.claude/`, `.windsurf/`, `.qmind/`).
3. **Critical:** the new file must NOT ignore `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, or lockfiles. Add `package-lock.json` to ignore only (we move to pnpm; commit `pnpm-lock.yaml`).
4. Create `data/raw/README.md` explaining which datasets the user must place there (list in Phase 5).
**Verify:** `git status` shows the four config files (`tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`) as tracked/untracked-but-not-ignored: run `git check-ignore -v apps/web/tsconfig.json apps/web/next.config.ts apps/api/tsconfig.json` → must print nothing. **Commit:** `chore: remove junk files and fix gitignore`.

### T1.3 — Rename folders and fix path bugs
1. `git mv apps/models apps/ml-service`. `git mv scripts/MQTT-simulator scripts/mqtt-simulator` (use a two-step rename via a temp name so case-only rename works on Windows/macOS).
2. Update every reference to the old paths (root `package.json`, any README/docs). Search with `git grep -n "apps/models\|MQTT-simulator"`.
3. Add `apps/ml-service/README.md` (3 lines: purpose, run command, model path).
**Verify:** `git grep -n "apps/models\|MQTT-simulator"` returns nothing. **Commit:** `chore: normalise folder names`.

### T1.4 — Move to pnpm + Turborepo
1. Delete `package-lock.json` files and all `node_modules`. Create `pnpm-workspace.yaml` listing `apps/*`, `packages/*`, `scripts/*`.
2. Rewrite root `package.json`: name `evspark`, `"private": true`, `"packageManager": "pnpm@<current stable 9/10 — run pnpm -v and use it>"`, `"engines": {"node": ">=22"}`, devDependencies `turbo`, `rimraf`, `cross-env`; scripts: `dev` (turbo run dev), `dev:web`, `dev:api`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`, `sim`, `twin`.
3. Create `turbo.json` with tasks `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`), `dev` (cache false, persistent true), `lint`, `typecheck`, `test`.
4. Create `.nvmrc` with the Node major in use. Create `.editorconfig` (LF, 2 spaces, UTF-8, final newline).
5. In each workspace package ensure scripts named `lint`, `typecheck` (`tsc --noEmit`), `test` exist (use `echo "no tests yet"` temporarily ONLY for `scripts/*` packages; real tests come in Phase 7).
6. `pnpm install`.
**Verify:** `pnpm -r exec node -e "console.log('ok')"` succeeds; `pnpm turbo run typecheck --filter=@evspark/shared` passes. **Commit:** `build: migrate to pnpm and turborepo`.

### T1.5 — Make `@evspark/shared` the single source of truth
1. Ensure `packages/shared/src/index.ts` exists and re-exports `types`, `geo`, `scoring`, `wait-time`. Add `tsconfig.json` (strict, `moduleResolution: bundler`, `noEmit`).
2. Diff `apps/api/src/services/scoring.ts` against `packages/shared/src/scoring.ts`. Merge any logic that exists only in the API copy into the shared copy (keep behaviour identical), then **delete** the API copy.
3. Add `"@evspark/shared": "workspace:*"` to `apps/api` and `apps/web` dependencies. Replace all imports of the deleted file in `apps/api` with `@evspark/shared`. If the API (CommonJS/ESM mismatch) cannot import TS source directly, configure the shared package to build to `dist/` with `tsup` (dual ESM) and point `main/types/exports` to it, and add a `build` dependency in `turbo.json`.
**Verify:** `pnpm --filter @evspark/shared test` (the 3+ existing tests pass), `pnpm --filter api typecheck`. **Commit:** `refactor: api uses shared scoring and wait-time`.

### T1.6 — Collapse duplicate web routes (preparation only)
Do NOT delete yet — Phase 6 rebuilds the web app. Only create `apps/web/ROUTES.md` listing the canonical routes: `/`, `/login`, `/register`, `/onboarding`, `/driver`, `/station`, `/admin` (+ sub-routes) and which legacy folders map to them. This guides Phase 6.
**Commit:** `docs: canonical web routes`.

**Phase 1 Done when:** fresh clone + `pnpm install` + `pnpm turbo run typecheck` works (web may fail typecheck only if it failed before — note it in the report).

---

# PHASE 2 — Infrastructure base  (branch `phase-2-infra`)

### T2.1 — Docker Compose (local everything)
Create `docker-compose.yml` at root with services:
- `postgres`: image `postgis/postgis:16-3.4`, env from root `.env`, volume `pgdata`, port 5432, healthcheck `pg_isready`.
- `redis`: image `redis:7-alpine`, port 6379, healthcheck `redis-cli ping`, command with `--maxmemory 128mb --maxmemory-policy allkeys-lru`.
- `api`: build `apps/api/Dockerfile`, depends on healthy postgres+redis, env file `apps/api/.env`, port 4000.
- `ml`: build `apps/ml-service/Dockerfile`, port 8000.
- `web`: optional profile `full` (so dev normally runs web with `pnpm dev:web` on the host).
- `twin`: profile `sim`, build `scripts/twin-engine`.
Create **multi-stage** Dockerfiles: `apps/api/Dockerfile` (deps → build → slim runtime, non-root user, `NODE_ENV=production`), `apps/ml-service/Dockerfile` (python:3.12-slim, no cache, non-root), and `.dockerignore` files (exclude node_modules, .next, data/raw, .git).
**Verify:** `docker compose up -d postgres redis` → both `healthy` in `docker compose ps`. **Commit:** `feat(infra): docker compose and dockerfiles`.

### T2.2 — Real Prisma migrations + connection setup
1. Update `apps/api/prisma.config.ts`: keep CommonJS style; `datasource.url` must use `DIRECT_URL` (fall back to `DATABASE_URL` if `DIRECT_URL` unset) because migrations need a non-pooled connection. Runtime stays on `DATABASE_URL` via the existing adapter in `src/lib/prisma.ts` — open that file and confirm it uses `DATABASE_URL`; configure the `pg` pool `max` to 10 (env `DB_POOL_MAX`).
2. Generate the baseline migration from the current schema: `pnpm --filter api exec prisma migrate dev --name init` against the local docker postgres. Commit the `prisma/migrations/` folder.
3. Add scripts to `apps/api/package.json`: `prisma:generate`, `db:migrate` (`prisma migrate deploy`), `db:migrate:dev`, and a `postinstall` of `prisma generate`.
**Verify:** `pnpm --filter api exec prisma migrate status` says up to date. **Commit:** `feat(db): baseline migration and connection config`.

### T2.3 — PostGIS spatial column and index
1. Create a **new migration** (`prisma migrate dev --create-only --name postgis_station_location`) and hand-edit the SQL to:
   - `CREATE EXTENSION IF NOT EXISTS postgis;`
   - `ALTER TABLE "Station" ADD COLUMN "location" geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lng","lat"),4326)::geography) STORED;`
   - `CREATE INDEX "Station_location_gist" ON "Station" USING GIST ("location");`
   - Helpful extra indexes: `CREATE INDEX ON "Station" ("status","city");`, `CREATE INDEX ON "Charger" ("stationId","status");`, `CREATE INDEX ON "QueueEntry" ("stationId","status","joinedTs");`, `CREATE INDEX ON "Session" ("stationId","endTs");`.
2. In `schema.prisma` declare the column as `location Unsupported("geography(Point,4326)")?` so Prisma knows about it but never writes it. Apply migration.
3. Create `apps/api/src/repositories/stations.repo.ts` exporting two functions using `prisma.$queryRaw` with **parameterised** values (tagged template, never string concatenation):
   - `findStationsInBbox({minLng,minLat,maxLng,maxLat,limit})` using `location && ST_MakeEnvelope(...)::geography`.
   - `findNearbyStations({lat,lng,radiusM,limit})` using `ST_DWithin(location, point, radiusM)` ordered by `location <-> point`, returning `distanceM`.
   Both return only list fields: `id,name,operatorName,lat,lng,city,pricePerKwh,status` (+ distance). Charger aggregates (counts per status) come from a single grouped query, not N+1.
**Verify:** with seed data loaded, `EXPLAIN` of nearby query shows `Index Scan using Station_location_gist` (run via `psql`, report one line). **Commit:** `feat(db): postgis spatial index and station repository`.

### T2.4 — Redis client and health
1. Add deps to api: `ioredis`. Create `apps/api/src/lib/redis.ts`: single shared client from `REDIS_URL`; `maxRetriesPerRequest: null` (required by BullMQ), lazy connect, TLS auto when URL starts with `rediss://`. Export a `getRedis()`; a no-op-safe `cacheGet/cacheSet(key, ttlSeconds)` JSON helper that **returns null instead of throwing** when Redis is down (cache must never break the API).
2. Extend `/readyz` to check DB **and** Redis; return 503 with component statuses if either fails.
**Verify:** `curl localhost:4000/readyz` returns both `ok`; stop redis container → returns 503, API keeps running. **Commit:** `feat(api): redis client and readiness`.

### T2.5 — Structured logging (Pino)
1. Add `pino`, `pino-http`, `pino-pretty` (dev only). Create `src/lib/logger.ts` (JSON in prod, pretty in dev, level from `LOG_LEVEL`, redact `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.token`).
2. Add `pino-http` middleware with a request id (`x-request-id` or generated UUID), echo it in the response header.
3. Replace **every** `console.log/error/warn` in `apps/api/src` and `scripts/*` with the logger.
**Verify:** `git grep -n "console\." apps/api/src` returns nothing. **Commit:** `feat(api): structured logging`.

### T2.6 — Central error handling
Rewrite `src/middleware/errorHandler.ts`: define `class AppError(status, code, message, details?)`; handler returns `{ "error": { "code", "message", "requestId", "details?" } }`; in production never expose `err.message` for unexpected errors (log full error, return generic 500). Zod errors → 400 with flattened issues. Prisma known errors: `P2002` → 409, `P2025` → 404. Express 5 forwards async errors automatically — **do not add async wrapper helpers**. Remove all controller-level `try { } catch (err) { res.status(500).json({error: err.message}) }` blocks; let errors propagate. Do this controller by controller and keep response shapes the web app already uses (success payloads unchanged).
**Verify:** `curl -X POST localhost:4000/api/stations -d '{}' -H 'content-type: application/json'` → 400 JSON in the new format (auth will come in Phase 3, so this may be 401 later — that's fine). **Commit:** `refactor(api): central error handling`.

### T2.7 — Sentry (api, web, ml)
Follow the **official Sentry docs for the installed major version**. API: `@sentry/node`, init in `src/instrument.ts` imported as the very first line of `index.ts`, attach the Express error handler before your own. Web: `@sentry/nextjs` with DSN from env. ML: `sentry-sdk[fastapi]`. Rules: Sentry must be a **complete no-op when the DSN env var is empty** (local dev); tracesSampleRate 0.1; scrub auth headers. **Verify:** API starts with empty DSN without errors. **Commit:** `feat: sentry integration (no-op without dsn)`.

### T2.8 — CI and Dependabot
Create `.github/workflows/ci.yml` triggered on PR and push to `main`. Jobs (use path filters / turbo `--filter=...[origin/main]`): **js** (checkout, pnpm setup with cache, `pnpm install --frozen-lockfile`, `turbo run lint typecheck test build`), **api-db** (service containers postgis + redis, run migrations, run api tests), **ml** (python 3.12, `pip install -r requirements.txt`, `pytest`), **secrets** (gitleaks action). Create `.github/dependabot.yml` for `npm` (root, weekly, grouped minor/patch), `pip` (apps/ml-service), `github-actions`, and `docker`. **Verify:** `act` is not required; validate YAML with `pnpm dlx @action-validator/cli .github/workflows/ci.yml` or equivalent and report. **Commit:** `ci: github actions and dependabot`.

**Phase 2 Done when:** `docker compose up -d` brings postgres/redis/api/ml healthy, migrations apply, logs are JSON.

---

# PHASE 3 — Auth and security  (branch `phase-3-auth`)

### T3.1 — Study Neon Auth (no code yet)
Open the installed `@neondatabase/auth` package (README, exported types) and Neon's official Neon Auth docs. Write a 10-line note into `docs/ARCHITECTURE.md` under "Auth": how the browser obtains a session/JWT, where the JWKS URL lives, token claims available (`sub`, `email`, `name`). **If you cannot determine how to get a verifiable JWT and the JWKS URL, STOP and ask.** **Commit:** `docs: neon auth notes`.

### T3.2 — API JWT middleware
1. Add `jose`. Create `src/middleware/auth.ts` exporting `requireAuth` (verifies `Authorization: Bearer <jwt>` against `NEON_AUTH_JWKS_URL` using `createRemoteJWKSet`, checks issuer from `NEON_AUTH_ISSUER`, rejects expired tokens with 401) and `optionalAuth`.
2. On first valid token, **upsert a `User`** keyed by the auth subject (add a `authId String @unique` column via a new migration if one doesn't exist). Role: if email ∈ `ADMIN_EMAILS` → `ADMIN`; else keep stored role (default `DRIVER`).
3. Attach `req.user = { id, authId, email, role }`. Add the Express type augmentation in `src/types/express.d.ts`.
4. Create `requireRole(...roles)` middleware → 403 `FORBIDDEN` on mismatch.
**Verify:** unit test with a locally generated key pair and mocked JWKS: valid → 200, no token → 401, wrong role → 403. **Commit:** `feat(api): jwt auth and rbac middleware`.

### T3.3 — Apply guards to routes (this closes the biggest security hole)
- Public (no auth): `GET /health*`, `GET /readyz`, `GET /api/stations*` (list/nearby/detail), `GET /api/vehicles`, `POST /api/recommend`, `POST /api/journeys/plan`.
- `requireAuth`: `/api/me/*`, `/api/favorites*`, `/api/favourites*`, `/api/bookings*`, `/api/reviews` (POST), `/api/issues` (POST), `/api/users/*`.
- `requireAuth + requireRole('OPERATOR','ADMIN')`: everything under `/api/operator/*`, plus **ownership check**: an operator may only touch stations where `operatorUserId === req.user.id` (ADMIN bypasses).
- `requireAuth + requireRole('ADMIN')`: everything under `/api/admin/*`.
- Fix `bookings.controller.ts`: **remove the "first DRIVER user" fallback**; always use `req.user.id`.
**Verify:** Supertest-style checks (or curl): `/api/admin/users` without token → 401; with driver token → 403. **Commit:** `feat(api): protect routes with auth and ownership checks`.

### T3.4 — Validation everywhere (Zod 4)
Upgrade `middleware/validate.ts` to `validate({ body?, query?, params? })`. Put **all** schemas in `packages/shared/src/schemas/` (so web forms reuse them). Create schemas for every route that takes input: stations (create/update/bbox/nearby), chargers, bookings, reviews, issues, operator actions, admin actions, recommend, journey. Coerce numeric query params. Bound values (lat −90..90, lng −180..180, radius ≤ 50 000 m, limit ≤ 200, string max lengths). Strip unknown keys. **Verify:** each route returns 400 for a bad payload (list the routes checked). **Commit:** `feat(api): zod validation on all routes`.

### T3.5 — Hardening middleware
1. Add `helmet`, `compression`. Replace `cors({origin:"*"})` with an allow-list from `WEB_ORIGIN` (comma-separated), `credentials: true`; same for Socket.io and the ML service (`ALLOWED_ORIGINS`).
2. Add `express-rate-limit` + `rate-limit-redis` using the shared ioredis client. Limits: global 300/min per IP; write endpoints 60/min per user; auth-sensitive/expensive (`/recommend`, `/journeys/plan`) 30/min per IP. If Redis is down, **fail open** with in-memory limiter and log a warning. Return `429` in the standard error format with `Retry-After`.
3. `app.disable('x-powered-by')`, `express.json({ limit: '100kb' })`, trust proxy setting from env (`TRUST_PROXY=1` behind Cloudflare/Render) so IPs are correct.
4. OCPP WebSocket: reject connections for unknown `chargePointId` (must exist as `Charger.ocppId`); add max message size; optional basic-auth token via `OCPP_SHARED_SECRET` env (twin engine uses it).
**Verify:** 31 rapid calls to `/recommend` → last returns 429; browser origin not in allow-list is blocked. **Commit:** `feat(api): security hardening`.

### T3.6 — Web auth wiring (do at Phase 6 start, listed here for completeness)
Handled in T6.4 (login/register/onboarding + route guard).

**Phase 3 Done when:** no `/api/admin` or `/api/operator` endpoint is reachable without a valid token and role.

---

# PHASE 4 — Realtime and caching  (branch `phase-4-realtime`)

### T4.1 — Station list endpoints (fast path)
Rewrite `stations.controller.ts` + routes:
- `GET /api/stations?bbox=minLng,minLat,maxLng,maxLat&zoom=Z&connector=&status=` → uses `findStationsInBbox`. At zoom < 11 return at most 150 stations; server never returns more than `limit` (default 200).
- `GET /api/stations/nearby?lat&lng&radius=&connector=` → `findNearbyStations`.
- `GET /api/stations/:id` → full detail (chargers, queue length, reviews summary, computed wait time, marker colour).
Computation of wait time/marker colour uses `@evspark/shared` `computeWaitTime` on **batched** charger/queue data (two grouped queries for the whole list, not per station).
**Verify:** with ≥500 seeded stations, bbox query for Mumbai responds < 100 ms locally (report the timing). **Commit:** `feat(api): bbox and nearby station endpoints`.

### T4.2 — Caching layer
Cache keys and TTLs (use `cacheGet/cacheSet`):
- `stations:bbox:{zoom}:{roundedBbox}:{connector}` → 15 s
- `station:{id}` → 10 s (invalidate on any charger update for that station)
- `waittime:{stationId}` → 10 s
- `forecast:{stationId}:{yyyyMMddHH}` → 3600 s
Round bbox coordinates to 2 decimals to raise hit rate. Add `Cache-Control: public, s-maxage=15, stale-while-revalidate=30` on public GET list endpoints (Cloudflare will honour it); detail endpoints `s-maxage=10`. Add `ETag` support (Express default is fine; keep it enabled).
**Verify:** call the same bbox twice; second call served from Redis (add a `x-cache: HIT|MISS` header for debugging, enabled in non-production). **Commit:** `feat(api): redis caching and cache headers`.

### T4.3 — Recommend endpoint rewrite
`POST /api/recommend` body: `{ lat, lng, connector, batteryPct?, vehicleModelId?, radiusKm? }`. Steps: (1) `findNearbyStations` radius default 15 km, limit 30 → (2) fetch charger/queue aggregates in two queries → (3) score with `@evspark/shared` `calculateFuelRecommendations` → (4) return top 5 with `reason` strings. Remove "load every approved station" logic. Wait time used in the score is the **predicted wait at arrival time** (`now + driveMinutes`): call `getForecast(stationId, arrivalTs)` (T4.6) and fall back to current wait if the ML service is down. **Verify:** unit test for scoring weights still passes; endpoint returns ≤5 results and ≤ 100 ms (excluding ML). **Commit:** `refactor(api): spatial recommend`.

### T4.4 — Socket.io rooms + batching
Rewrite `src/lib/socket.ts`:
- Authenticate sockets optionally (token in `handshake.auth.token`); anonymous allowed for read-only public rooms.
- Rooms: `station:{id}` (detail/operator view), `tile:{zoom}:{x}:{y}` (map viewport using fixed-size tiles; helper `bboxToTiles` in `@evspark/shared/geo`), `operator:{userId}`, `admin`.
- Client events: `subscribe:tiles` (array, max 12 tiles), `subscribe:station`, `unsubscribe:*`.
- Server: replace every `io.emit("charger:update", …)`. Introduce `publishChargerUpdate(update)` which pushes into an in-memory map keyed by `stationId`; a **1 000 ms flush timer** emits one `stations:delta` message per room containing only changed stations (id, marker colour, wait time, available count) and invalidates their cache keys.
- Redis pub/sub: the OCPP handler and operator controller publish `charger:update` to Redis channel `evspark:events`; a subscriber in the same API process feeds `publishChargerUpdate`. This keeps the design ready for multiple instances. Enable `@socket.io/redis-adapter` only when `SOCKET_REDIS_ADAPTER=true`.
- Hard limits: max 12 tile subscriptions per socket; payload < 16 KB.
**Verify:** connect two socket clients subscribed to different tiles; update a charger in tile A → only client A receives it, once per second at most. **Commit:** `feat(api): socket rooms and batched deltas`.

### T4.5 — Scheduled jobs
Create `src/jobs/` with plain async functions (each idempotent, with a Redis `SET NX EX` lock so two instances never run the same job): `hourlyRollup` (aggregate Session/ChargerEvent/QueueEntry into `StationMetricHourly` for the previous hour), `retentionCleanup` (delete `ChargerEvent` older than 7 days and `Session` older than 90 days **only if** an hourly rollup exists for that hour), `forecastEvaluation` (fill `Forecast.actualWait` for forecasts whose horizon has passed), `forecastRefresh` (prefetch next-hour forecasts for stations with activity).
Create `src/jobs/scheduler.ts`: when `QUEUE_DRIVER=cron` use `node-cron` (already installed); when `bullmq` use BullMQ repeatable jobs (add `bullmq` dep). Default is `cron` because queue polling consumes Upstash free quota. **Verify:** run each job manually via `pnpm --filter api job <name>`; rollup row appears. **Commit:** `feat(api): scheduled jobs with locks`.

### T4.6 — Forecast service client
`src/services/forecast.service.ts`: `getForecast(stationId, atTs)` → check Redis → call ML `POST /predict` with a 1.5 s timeout and one retry → on failure return `{ source: "fallback", predictedWaitMin }` computed from current queue (never throw). Persist each ML forecast to `Forecast` (batched, max 1 write per station per hour bucket). **Commit:** `feat(api): forecast client with cache and fallback`.

### T4.7 — Optional modules
- MQTT: wrap `initMqtt()` in `if (process.env.ENABLE_MQTT === "true")`. 
- Update `docs/ARCHITECTURE.md` with the event flow diagram (text/mermaid): Twin → OCPP WS → API → Redis pub/sub → Socket rooms → Web.
**Commit:** `refactor(api): mqtt optional, architecture doc`.

---

# PHASE 5 — Twin engine and data  (branch `phase-5-twin`)

### T5.1 — Schema additions (new migration)
Add: `Session.source` allowed values documented as `"real" | "twin"` (default `"twin"`; migrate existing `"sim"` rows to `"twin"`); `Session.queueWaitMin Float?`; `QueueEntry.vehicleModelId String?`, `QueueEntry.etaTs DateTime?`; new model `VehiclePing { id, vehicleRef, stationId?, lat, lng, ts, intent String }` with index `[stationId, ts]` and a 30-minute retention in `retentionCleanup`; `Station.datasetSource String?` and `Station.externalId String? @unique` for imports; extend `SimConfig` with `arrivalsPerMin Float @default(0.5)`, `running Boolean @default(true)`, `surgeMultiplier Float @default(2.0)`. **Verify:** `prisma migrate status` clean, `pnpm --filter api typecheck`. **Commit:** `feat(db): twin engine schema`.

### T5.2 — OCPP session mapping (fix known gap)
In `src/lib/ocpp.ts`: on `StartTransaction`, create a `Session` mapped by `transactionId` (store the transactionId in an in-memory map and in `Session.payload`/a new `ocppTxId Int?` column), link to `driverUserId`/`vehicleRef` via `idTag`; on `MeterValues` update `energyKwh`/`socEnd`; on `StopTransaction` close the session, compute `amountInr = energyKwh × station.pricePerKwh`, release the charger, and promote the next `QueueEntry` (status waiting → charging). Every state change calls `publishChargerUpdate`. Sessions from the twin use `source: "twin"`. Validate every OCPP payload with Zod; respond with proper OCPP `CALLERROR` on invalid payload. **Verify:** integration test connecting a `ws` client that runs Boot → Status(Available) → Start → MeterValues → Stop; asserts DB rows. **Commit:** `feat(ocpp): transaction to session mapping and queue promotion`.

### T5.3 — Telemetry endpoint for geofence wait time
`POST /api/telemetry/ping` (auth: twin API key header `x-twin-key` **or** driver JWT) body `{ vehicleRef, lat, lng, intent: "navigating"|"queueing"|"charging" }` → stores `VehiclePing` and updates an in-Redis set `geofence:{stationId}` (members expire after 5 min via sorted-set timestamps). Geofence radius: 250 m (constant in `@evspark/shared`). **Commit:** `feat(api): vehicle ping telemetry`.

### T5.4 — Blended wait time (shared logic + tests)
In `packages/shared/src/wait-time.ts` add `computeBlendedWait({ chargerBasedMin, vehiclesInGeofence, operationalChargers, avgSessionMin, alpha = 0.7 })`:
- `geofenceBasedMin = ceil(max(0, vehiclesInGeofence − operationalChargers) / max(1, operationalChargers)) × avgSessionMin`
- `blended = alpha × chargerBasedMin + (1 − alpha) × geofenceBasedMin`
- If no geofence data (0 pings recently) → return `chargerBasedMin` unchanged, `source: "charger"`.
Return `{ waitMinutes, source: "charger"|"blended" }`. Write at least 8 unit tests (edge cases: 0 chargers, all faulted, huge queue, alpha bounds). Use the result in the station detail endpoint. **Verify:** `pnpm --filter @evspark/shared test`. **Commit:** `feat(shared): blended wait time`.

### T5.5 — Station dataset import (L1)
Create `scripts/seed/` workspace package (`tsx`, `csv-parse`, `zod`, `@prisma/client` via api). Files:
- `scripts/seed/import-stations.ts` reads `data/raw/mop_stations.csv` (Ministry of Power dataset, Dataful 23369). **The user must download this file.** If missing: STOP and ask; do not fabricate stations.
- `scripts/seed/column-map.ts`: a single mapping object from CSV headers → our fields (name, operatorName, state, district, city, address, lat, lng). Inspect the CSV header row (first line only) and fill the map; report any unmapped columns.
- Rules: skip rows with invalid/zero coordinates or outside India's bounding box (lat 6–37, lng 68–98); dedupe by `externalId` then by name + 50 m proximity; trim/normalise state and city names; upsert in batches of 500 inside transactions; default charger layout per station when the dataset lacks it (e.g. 2×CCS2 DC 30 kW + 2×Type2 AC 7.4 kW, clearly flagged `datasetSource = "mop"` and chargers created as `inferred`).
- `scripts/seed/enrich-ocm.ts` (optional, runs only if `OCM_API_KEY` set): Open Charge Map lookup within 200 m of each station to improve connector types/power; rate-limited (max 5 req/s), cache responses to `data/raw/ocm-cache.json` (git-ignored).
- Keep the existing 30 hand-written Mumbai stations as `datasetSource = "demo"` only for the `--demo` flag; production seed must come from the dataset.
- Seed 10 Indian vehicle models (already in `seed.ts`) into `VehicleModel` via `scripts/seed/vehicles.ts` (move, don't duplicate).
**Verify:** `pnpm db:seed` prints counts (imported / skipped / duplicates); API `GET /api/stations?bbox=` returns Mumbai stations. **Commit:** `feat(seed): all-india station import`.

### T5.6 — Demand patterns (L2)
`scripts/seed/build-patterns.ts` reads whichever of these exist in `data/raw/` (ACN-Data CSV, Dundee CSV, UrbanEV CSV — **user provides**) and produces `data/patterns/hourly-profile.json`: normalised arrival intensity per hour-of-day (0–23) for weekday/weekend, plus session duration distribution (mean/p10/p90 minutes) and energy per session. If no raw files exist, write a **clearly labelled synthetic default profile** (`"origin": "synthetic-default"`, morning peak 8–10, evening peak 17–21) and print a loud warning. Commit the JSON (< 20 KB). **Commit:** `feat(seed): demand pattern profile`.

### T5.7 — Twin engine (`scripts/twin-engine`)
TypeScript package run with `tsx`. Modules (one file each, each under ~200 lines):
- `config.ts` — loads env + polls `GET /api/admin/sim-config` (twin key auth) every 10 s for `arrivalsPerMin`, `speed`, `surgeStations`, `surgeMultiplier`, `running`.
- `profile.ts` — loads `data/patterns/hourly-profile.json`; returns intensity multiplier for the current simulated hour.
- `arrivals.ts` — Poisson arrival process: inter-arrival time ~ Exponential(λ) with λ = `arrivalsPerMin × profile × (surge ? surgeMultiplier : 1) × speed`. Seeded RNG (`SimConfig.seed`) so runs are reproducible.
- `vehicle.ts` — Vehicle state machine: `SPAWNED → NAVIGATING → ARRIVED → QUEUEING → CHARGING → DEPARTED | ABANDONED`. Picks a random `VehicleModel` (battery kWh, max kW, connector), random SoC 10–40 %, a station via the **public `/api/recommend`** (so the product's own logic is exercised) with 20 % random override to avoid unrealistic uniformity. Sends GPS pings every 5 simulated seconds along a straight-line path to the station (`intent: navigating`), then `queueing` while waiting.
- `ocpp-client.ts` — one OCPP 1.6J WebSocket client per charger with an `ocppId` (connect with `OCPP_SHARED_SECRET`): BootNotification, periodic Heartbeat, StatusNotification, StartTransaction (with vehicle `idTag`), MeterValues every N seconds (energy follows a realistic charge curve: constant power to 80 %, tapering afterwards), StopTransaction.
- `faults.ts` — each charger has ~0.5 % chance per simulated hour of going `Faulted` for 5–30 minutes, then recovering.
- `abandonment` — a queueing vehicle leaves if its wait exceeds a random tolerance (10–40 min), setting `QueueEntry.status = "abandoned"`.
- `index.ts` — orchestrates, handles SIGINT/SIGTERM cleanly (close sockets, stop timers), logs a one-line summary each minute (vehicles active, avg wait, sessions started).
- Charging duration comes from the energy needed and charger power, **not** a fixed random number; scale by `speed`.
- Limit concurrency: max 300 active vehicles; max 1 OCPP socket per charger; if the API is unreachable use exponential backoff (cap 30 s).
**Verify:** run `pnpm twin` for 3 minutes against a seeded DB: sessions appear with `source = "twin"`, queue entries appear when chargers fill, `GET /api/stations/:id` wait time changes. **Commit:** `feat(twin): digital twin engine`.

### T5.8 — Admin sim controls API
`GET/PATCH /api/admin/sim-config` (ADMIN or `x-twin-key`): validate with Zod (speed 1–60, arrivalsPerMin 0–20, surgeMultiplier 1–5, running boolean, `surgeStations` as array stored joined). **Commit:** `feat(api): sim config endpoints`.

### T5.9 — Retire the old simulator
Keep `scripts/mqtt-simulator` but update its README to say "hazard-sensor demo only, not part of EVspark core". Remove the Operator PATCH-based charger flipping. **Commit:** `chore: retire legacy charger flipping simulator`.

---

# PHASE 6 — Frontend rebuild  (branch `phase-6-web`)

> Rule for this phase: **never delete a legacy file until its replacement works.** Keep legacy code under `apps/web/_legacy/` (move, don't copy) while porting, then delete `_legacy/` in the last task.

### T6.1 — Install the template into `apps/web`
1. In a temp folder run `npx degit arhamkhnz/next-shadcn-admin-dashboard tmp-template`. Read its `package.json`, folder layout, and its `src/app` route groups (only these; do not read all components).
2. Move current `apps/web/src` → `apps/web/_legacy/src` and current `apps/web/public` assets you still need → keep. Copy the template into `apps/web` (keep `apps/web/package.json` name `web` and add `"@evspark/shared": "workspace:*"`). Keep the template's `components.json`, theme presets, sidebar layout, auth layouts.
3. Remove from `package.json`: `@stackframe/stack`, `next-auth`, `axios`, `leaflet`, `react-leaflet`, `@types/leaflet`, `lucide-react` (after step T6.6). Keep `@neondatabase/auth`.
4. Add: `@phosphor-icons/react`, `@tanstack/react-query`, `@googlemaps/markerclusterer`, `socket.io-client`, `zod`, `@sentry/nextjs` (already from T2.7), `@next/bundle-analyzer`.
5. Add Magic UI components with exactly these commands (run inside `apps/web`): `pnpm dlx shadcn@latest add "https://magicui.design/r/marquee.json"`, same for `bento-grid`, `globe`, `shimmer-button`, `number-ticker`.
6. Fonts in root `layout.tsx` via `next/font/google`: `Plus_Jakarta_Sans` (headings/landing), `Geist` (body), `Geist_Mono` (numbers: kW, ₹, minutes). Expose as CSS variables.
**Verify:** `pnpm --filter web build` succeeds with only the template's default pages. **Commit:** `feat(web): adopt shadcn admin template`.

### T6.2 — Design tokens and shared UI rules
Create `apps/web/src/styles/tokens.css` (or the template's theme file) and apply everywhere:
- Landing is **light**. Dashboards support light/dark via the template's theme switch.
- Primary colour: emerald/teal family; neutral greys; semantic marker colours: green (available), amber (busy/short wait), red (overloaded/faulted), grey (offline). **Never** use neon yellow.
- Body text ≥ 16 px, line-height 1.6; headings scale 36/30/24/20. Vertical section padding 80 px desktop / 48 px mobile — **consistent, no extreme gaps**.
- Numbers: `Intl.NumberFormat('en-IN')`; currency always `₹`; time in minutes; distance in km.
- Icons: Phosphor only, weight `regular` for UI, `duotone` for feature cards, `fill` for status.
- Accessibility: visible focus rings, contrast AA, `prefers-reduced-motion` disables all non-essential animation.
**Commit:** `feat(web): design tokens`.

### T6.3 — API client, query layer, sockets
`src/lib/api.ts`: `fetch` wrapper (base URL env, attaches Neon Auth JWT, parses the standard error shape, timeouts 10 s, no axios). `src/lib/queries/` with TanStack Query hooks per resource (`useStationsInBbox`, `useStation`, `useRecommend`, `useBookings`, …) with `staleTime` matching server TTLs. `src/lib/socket.ts`: singleton client, `subscribeTiles()` / `subscribeStation()` helpers that dedupe subscriptions, merge `stations:delta` messages into the Query cache. Types and Zod schemas come from `@evspark/shared`. **Commit:** `feat(web): api client and realtime layer`.

### T6.4 — Auth, onboarding, route protection
Routes (route group `(auth)`): `/login`, `/register`, `/onboarding`. Use the template's auth layout.
- Login/Register: Neon Auth (email+password and Google if enabled in the Neon dashboard — do not hardcode a fallback URL; read `NEXT_PUBLIC_NEON_AUTH_URL` and fail with a clear error if missing).
- Onboarding step 1: choose role **Driver** or **Station owner** (Admin cannot be chosen). Driver step 2: vehicle model (from `/api/vehicles`), connector type, battery %, home city. Station step 2: station name, address, map pin picker, number of chargers with connector/power rows, generated OCPP ids shown for copy; status becomes `PENDING` until an admin approves.
- `src/middleware.ts` (Next): redirect unauthenticated users from `/driver`, `/station`, `/admin` to `/login`; role mismatch → `/` with a toast. Server-side checks are the real security; this is UX.
- Delete `RoleGuard` tab-switcher concept entirely.
**Verify:** manual: unauthenticated visit to `/admin` redirects; driver account cannot open `/station`. **Commit:** `feat(web): auth, onboarding and route guards`.

### T6.5 — Map module (shared by Driver and Station views)
Create `src/components/map/`:
- `EvMap.tsx` — Google Map via `@react-google-maps/api`, loaded once (`useJsApiLoader`, libraries `places`,`geometry`). Props: `onViewportChange`, `selectedStationId`.
- Viewport fetching: debounce 400 ms on `idle` → `useStationsInBbox`. Cluster markers with `MarkerClusterer` at zoom < 13. Only list fields on the map; full details loaded on marker click.
- Marker colours from `@evspark/shared` marker rule (green/amber/red/grey). Overloaded stations get a **red pulsing ring** (CSS animation, disabled for reduced motion).
- User location blue dot via `useGeolocation` (handle permission denied with a friendly banner).
- `StationCard.tsx` popup/side sheet: name, operator, ₹/kWh, distance, drive time, wait time (+ "blended"/"charger" source tag), chargers by connector with live status, reviews, buttons: **Directions**, **Book**, **Favourite**, **Report issue**.
- `Directions` button: Google Directions service from user to station, draws polyline, shows ETA, and sets the "arrival time" used for the recommendation.
- **Fuel button** ("Find best charger now"): calls `/api/recommend`, shows top 5 in the side panel with reasons, highlights #1 on the map.
- Side panel: nearby stations list (virtualised if > 50), filters (connector, min kW, available only, price).
- Remove all Leaflet code. **Verify:** map renders full tiles, clustering works at low zoom, panning triggers exactly one request per idle. **Commit:** `feat(web): google map module`.

### T6.6 — Pages
Build with the template layouts. Each page loads real data; skeletons while loading; empty/error states for every list.
1. **Landing `/`** (route group `(marketing)`, light theme). Sections in order: (1) Hero with **WebM looped background** (`NEXT_PUBLIC_HERO_VIDEO_URL`, poster image first, `preload="metadata"`, paused when off-screen, replaced by poster for reduced motion/slow connections) + headline + `shimmer-button` CTAs; (2) "Compatible with OCPP 1.6J networks" `marquee` (text-only labels; **no logos, no partnership claims** — word it as "designed to work with OCPP 1.6J based networks"); (3) The problem (queues, no live availability); (4) How it works — 3 steps with SVG **path draw-in** connectors; (5) Feature `bento-grid`; (6) Live network metrics with `number-ticker` fed by `GET /api/public/stats` (stations, chargers online, sessions today) labelled **"Simulated data"**; (7) Forecasting explainer; (8) Charging animation (CSS keyframe pulse rings); (9) Role showcase tabs (Driver / Station / Admin) using real screenshots or compact real components; (10) India context (₹ pricing, supported connectors, FAME II / PM e-DRIVE mentioned as policy context only); (11) FAQ; (12) CTA + footer. `globe` is loaded with `next/dynamic({ ssr:false })` only in section 6/10 and only when in viewport. Scroll animations use `framer-motion` `LazyMotion` + `m` components. **No invented numbers.** Add `GET /api/public/stats` (cached 30 s) to the API.
2. **Driver `/driver`**: tabs/sections — Map (T6.5), My bookings, Favourites, Session history (₹ and kWh), Vehicle profile, Eco impact (CO₂ saved formula in `@evspark/shared`: `kWh × 0.82 kgCO₂/kWh grid factor` avoided vs. petrol equivalent — keep constants in one file with a source comment), Journey planner (A→B with charging stops using `/api/journeys/plan`), Notifications.
3. **Station `/station`** (operators): Overview (live charger grid with status colours, **overloaded chargers/stations highlighted red**, queue list, today's sessions/revenue), Chargers (status, power, enable/disable, fault flag), Queue & bookings, Analytics (Recharts: hourly sessions, occupancy, revenue ₹, forecast vs actual), Pricing & hours, Reviews & issues, Station settings (Cloudinary photo upload through a signed upload from the API). Implement the operator services chosen in `codemap.md`: **items 1–10, 13, 15, 16, 19** (alert = red highlight only, no email). If the numbering is not in `codemap.md`, ask the user.
4. **Admin `/admin`**: Approvals queue, Users, Stations, Platform analytics, Sim controls (speed, arrivals, surge, run/pause), System health (readyz, Redis, queue/jobs status), Audit log. Implement admin services **1–7, 9, 10, 12–20** from `codemap.md` as far as time allows; priority below Driver/Station. Mark unfinished admin items clearly in the UI as "Coming soon" (honest).
5. Delete duplicates: all of `_legacy/` once every page above renders real data. Delete `mock/`, `mockData.ts`, `stations-data.ts`, `driver.css` (replace with Tailwind).
**Verify per page:** build passes; page works with API down (error state), with empty DB (empty state), and with live twin data. **Commit per page:** `feat(web): <page>`.

### T6.7 — Performance pass
1. Add `@next/bundle-analyzer` (`ANALYZE=true pnpm --filter web build`); record first-load JS per route in `docs/ARCHITECTURE.md`. Targets: landing ≤ 180 kB JS, driver ≤ 300 kB.
2. `next/image` for all images (Cloudinary loader for station photos, `remotePatterns` set), `next/font` only, no CSS `@import`.
3. Lazy-load: Google Maps, Recharts, Globe, Sentry replay. Use `next/dynamic` and route-level code splitting.
4. Set `headers()` in `next.config.ts`: security headers (CSP report-only first, X-Content-Type-Options, Referrer-Policy), long-cache for static assets.
5. Lighthouse (mobile) on `/` and `/driver`: report scores; fix anything that costs > 5 points cheaply.
**Commit:** `perf(web): bundle and loading optimisations`.

---

# PHASE 7 — ML service and tests  (branch `phase-7-ml-tests`)

### T7.1 — ML service structure and honest labelling
Restructure `apps/ml-service/` to: `app/main.py`, `app/schemas.py`, `app/model.py`, `app/train.py`, `app/features.py`, `tests/`, `requirements.txt` (pinned), `Dockerfile`, `.env.example`. Remove wildcard CORS (env allow-list). Add `/health` (returns `model_loaded`, `model_version`) and keep `/predict`.
- `/predict` request: station id, current wait, chargers busy/total, `target_ts`, horizon. Response: `predicted_wait_min`, `confidence` (derived from model residual std, not a constant), `model_version`, `source: "model" | "fallback-curve"`.
- **Rename the label.** If no trained model file is loaded → `model_version = "fallback-curve-v1"`. Never print "LightGBM" unless a LightGBM model is loaded.
**Commit:** `refactor(ml): service structure and honest labelling`.

### T7.2 — Training pipeline
- `scripts/seed/export-training-data.ts` exports `StationMetricHourly` (+ features like hour, weekday, capacity, avg power, price) to `data/training/hourly.parquet` or CSV (git-ignored).
- `app/train.py`: LightGBM regressor on features: hour-of-day (cyclical sin/cos), weekday, is_weekend, station capacity, lagged occupancy (1h, 24h), rolling means, current queue length. Time-based train/validation split (never random). Report MAE and RMSE vs. a naïve baseline (same hour yesterday); **only ship the model if it beats the baseline**, else keep fallback and report honestly. Save `models/forecast.joblib` + `models/metadata.json` (version, metrics, trained_at, feature list). Upload artefacts to R2 via a small `scripts/publish-model.ts` (S3-compatible API); service downloads on boot if `MODEL_URL` is set.
- Needs at least 7 days of twin history; if the DB has less, run twin at high `speed` first and tell the user.
**Commit:** `feat(ml): lightgbm training pipeline`.

### T7.3 — API tests (Vitest + Supertest)
Add `vitest`, `supertest`. Test DB: docker postgis; truncate between suites. Required tests (≥ 25 total): auth (401/403/200 matrix for each protected route group), validation (400 per route family), station bbox/nearby correctness with known coordinates, recommend ranking sanity, booking rules (no double booking, ownership), OCPP lifecycle (T5.2), rate limiting (429), cache HIT/MISS, error format, readiness degraded when Redis down. Add `pnpm --filter api test` and wire into CI. **Commit:** `test(api): integration test suite`.

### T7.4 — Shared + ML tests
Shared: convert existing `node:test` tests to Vitest (or keep `node:test` — pick one and apply to all packages; recommend Vitest) and add the blended wait tests. ML: `pytest` for features, `/predict` schema, fallback behaviour. **Commit:** `test: shared and ml tests`.

### T7.5 — E2E smoke test and load test
- `tests/e2e/smoke.spec.ts` (Playwright, chromium only): landing loads and shows non-zero live stats → login with a seeded test driver → `/driver` map container visible → click a station → card shows wait time. Provide `pnpm test:e2e`.
- `tests/load/stations.js` (k6): 50 virtual users for 60 s hitting `/api/stations?bbox=` (mixed bboxes), `/api/stations/nearby`, `/api/recommend`. Thresholds: p95 < 300 ms, error rate < 1 %. Run against local compose, paste summary numbers into `docs/ARCHITECTURE.md` under "Measured performance".
**Commit:** `test: e2e smoke and k6 load scripts`.

---

# PHASE 8 — Documentation and deployment  (branch `phase-8-docs`)

### T8.1 — README.md (root)
Sections: what EVspark is, screenshot placeholders **taken from the real app**, architecture diagram (mermaid), tech stack table, quick start (`pnpm install`, `docker compose up -d`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`, `pnpm twin`), env var guide, project structure, test commands, honest-data statement ("all live charger activity is simulated by a digital twin; station locations come from the Ministry of Power dataset"), licence notes for template/Magic UI/Phosphor (all MIT).

### T8.2 — `docs/DEPLOYMENT.md`
Write step-by-step for: Neon (pooled + direct URLs, `dev` branch, enable PostGIS), Upstash Redis (note free quota and why `QUEUE_DRIVER=cron`), API on Render/Railway (`TRUST_PROXY=1`, health path `/readyz`, WebSocket support, start command), ML service on a second small container, web on Vercel, Cloudflare in front of the API (DNS proxied, cache rule for `/api/stations*` honouring origin `Cache-Control`, WebSockets enabled, SSL Full(strict)), R2 bucket for hero video/model/backups with public custom domain for the video, Cloudinary preset, Sentry projects, UptimeRobot monitors hitting `/healthz` every 5 min, GitHub secrets list for CI. Include a rollback note and a nightly `pg_dump` → R2 backup job (GitHub Actions cron, secrets from repo settings).

### T8.3 — Final audit
Run: `pnpm turbo run lint typecheck test build`, `git grep -n "TODO\|FIXME\|console\.log"`, secret scan again, bundle sizes, `docker compose up` cold start. Produce `docs/FINAL_REPORT.md`: what is done, what is partial, measured numbers, known limitations. Be honest about anything incomplete.

---

## 9. DEFINITION OF "INDUSTRIAL-READY" (final acceptance checklist)
- [ ] Fresh clone → `pnpm install` → `docker compose up -d` → migrate → seed → app works
- [ ] No unauthenticated access to operator/admin data; ownership checks tested
- [ ] All inputs validated with Zod; consistent error format with request ids
- [ ] Structured logs, Sentry (no-op without DSN), `/healthz` + `/readyz` (DB + Redis)
- [ ] Rate limiting, helmet, CORS allow-list, request size limits
- [ ] Spatial queries use the PostGIS GIST index; station lists are viewport-scoped and cached
- [ ] Socket.io uses rooms with 1 s batched deltas; no global `io.emit`
- [ ] Twin engine produces realistic sessions/queues via OCPP; geofence + charger wait blend works
- [ ] ML label matches reality; model beats baseline or fallback is clearly labelled
- [ ] No mock data or invented statistics in the UI; simulated data labelled
- [ ] Migrations committed; CI green; tests: shared + api + ml + 1 e2e; k6 numbers recorded
- [ ] README, ARCHITECTURE, DEPLOYMENT, FINAL_REPORT written

## 10. QUICK REFERENCE — commands
```
pnpm install                      # install all workspaces
docker compose up -d postgres redis
pnpm db:migrate && pnpm db:seed
pnpm dev                          # turbo: web + api (+ ml via docker)
pnpm twin                         # start digital twin engine
pnpm turbo run lint typecheck test build
pnpm --filter api job hourlyRollup
```

**END OF FILE. Start at Phase 1, Task T1.1. Do not skip ahead.**
