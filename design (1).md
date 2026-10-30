# EVspark — design.md
### Torque-style UI + backend logic for 3 pages: **Login · Onboarding · Station (Operator)**

> Hand this whole file to the Antigravity agent. It is written so every step is explicit.
> Build order = section order. Landing, Driver Map and Admin come later (not in this file).

---

## 0. RULES FOR THE AGENT (read first, obey always)

1. **Inspect before writing.** Open the existing repo and read: `prisma/schema.prisma`, the Express entry file, the Socket.io setup, the frontend `app/` folder. **Reuse existing names. Never create a duplicate model, route or file.** If a model below already exists, *merge the missing fields* into it.
2. Paths below use `apps/web` (Next.js) and `apps/api` (Express). If the monorepo uses other folder names, map them 1:1. Keep one concept per file as written.
3. After **each numbered section** run `npx tsc --noEmit` (web and api) and fix every error before continuing. Do not move on with red errors.
4. Install **only** the packages listed in §1. Do not add UI kits, animation libraries or CSS frameworks for these 3 pages. Existing Tailwind/shadcn may stay for other pages, but these pages use **`torque.css` classes only** (no Tailwind utility classes inside the Torque components).
5. **Light theme is default.** Dark theme exists through `data-theme="dark"` (toggle in top bar), never forced.
6. **Motion rule:** choreographed motion (reveals, count-ups, split-title, sliding nav pill, rings, drawers, toasts, car slide-in) is done in **JS with the Web Animations API / requestAnimationFrame** (`lib/motion.tsx`). CSS only holds states, hover/focus colour transitions and a few *ambient loops* (`@keyframes` for cable flow / pulse). Every animation must be skipped when `prefers-reduced-motion: reduce`.
7. Every network call shows a **loader** (button spinner or skeleton) and a **failure toast**. No silent failures. No `alert()`.
8. Never trust the client: role, station ownership and prices are checked on the server. `ADMIN` can never be requested from the client.
9. Money is shown in ₹ with `toLocaleString("en-IN")`. Numbers use the `.num` class (Geist Mono, tabular).
10. Sidebar bug from before ("options invisible"): nav items MUST have an explicit colour (`--side-dim`) and the pill MUST be `z-index:0` behind items (`z-index:1`). Do not remove either.

---

## 1. Packages and environment

**apps/web**
```bash
npm i @clerk/nextjs socket.io-client zod @phosphor-icons/react
```
**apps/api**
```bash
npm i @clerk/express @clerk/backend socket.io zod
```
(Prisma, Express, cors already exist.)

**apps/web/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/post-auth
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/post-auth
```
**apps/api/.env**
```
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
WEB_ORIGIN=http://localhost:3000
DEMO_SIMULATOR=true
DEMO_OPERATOR_CLERK_ID=user_xxx   # clerk id of the demo operator account
```
**Clerk dashboard (one-time, tell the user to do this):** enable *Username*, *Password*, *Google*, *GitHub*; collect first + last name at sign-up.

---

## 2. File map (create exactly these)

```
apps/web
  middleware.ts                      (Next 16 → name it proxy.ts, same content)
  app/
    layout.tsx
    torque.css                       ← §3
    (auth)/login/[[...login]]/page.tsx
    (auth)/signup/[[...signup]]/page.tsx
    post-auth/page.tsx
    onboarding/page.tsx
    (operator)/layout.tsx            ← wraps AppShell + onboarding gate
    (operator)/station/page.tsx
    (operator)/[section]/page.tsx    ← "Coming soon" for chargers/sessions/analytics/pricing/settings
  components/torque/
    motion.tsx  toast.tsx  primitives.tsx  AppShell.tsx  AuthShell.tsx
    onboarding/{schemas.ts, info.ts, Wizard.tsx}
    station/{types.ts, liveMath.ts, useStationLive.ts, BayCard.tsx, Lanes.tsx, Widgets.tsx, Feed.tsx, WalkInDrawer.tsx, ChargerDrawer.tsx}
  lib/api.ts
apps/api/src
  lib/{prisma.ts, errors.ts, chargeMath.ts, broadcast.ts}
  middleware/{auth.ts, errorHandler.ts}
  routes/{me.ts, onboarding.ts, operator.ts}
  services/{stationService.ts, snapshot.ts, demoSimulator.ts, sweeper.ts}
  socket/operatorNamespace.ts
  scripts/seedDemo.ts
```

---

## 3. DESIGN TOKENS + BASE CSS — `apps/web/app/torque.css`

Source of truth = the Torque admin template (warm paper background, near-black sidebar with orange sliding pill, off-white 20px cards, pill controls, Geist + Geist Mono, tight negative letter-spacing).

```css
/* ===== TOKENS ===== */
:root{
  --bg:#ecebe6; --glow-a:rgba(255,154,60,.16); --glow-b:rgba(14,165,233,.10);
  --card:#fbfaf7; --card-2:#f3f1ec; --line:rgba(23,24,27,.08); --line-strong:rgba(23,24,27,.15);
  --ink:#17181b; --ink-2:#4a4c52; --ink-3:#8a8c93;
  --side:#17181b; --side-ink:#ecebe6; --side-dim:#9a9ca3;
  --pill:#ff9a3c; --primary:#c2410c;
  --orange:#f97316; --amber:#f59e0b; --sky:#0ea5e9; --teal:#14b8a6;
  --violet:#8b5cf6; --rose:#f43f5e; --lime:#84cc16; --slate:#64748b;
  --ok:#16a34a; --warn:#d97706; --bad:#dc2626;
  --r-card:20px; --h-ctl:44px; --side-w:248px; --top-h:72px;
  --shadow-1:0 1px 0 rgba(255,255,255,.8) inset,0 1px 2px rgba(23,24,27,.05),0 14px 28px -16px rgba(23,24,27,.14);
  --shadow-2:0 1px 0 rgba(255,255,255,.6) inset,0 4px 8px rgba(23,24,27,.06),0 30px 60px -24px rgba(23,24,27,.28);
  --ease:cubic-bezier(.2,.8,.2,1);
}
[data-theme="dark"]{
  --bg:#101113; --glow-a:rgba(255,154,60,.10); --glow-b:rgba(14,165,233,.08);
  --card:#1a1b1f; --card-2:#222328; --line:rgba(255,255,255,.07); --line-strong:rgba(255,255,255,.14);
  --ink:#f3f1ec; --ink-2:#b9bbc2; --ink-3:#80828a;
  --side:#0b0b0d; --shadow-1:0 1px 0 rgba(255,255,255,.04) inset,0 14px 28px -16px rgba(0,0,0,.6);
}

/* ===== BASE ===== */
*{box-sizing:border-box}
html,body{min-height:100%}
body{
  margin:0; color:var(--ink); font-family:var(--font-sans),system-ui,sans-serif; letter-spacing:-.011em;
  -webkit-font-smoothing:antialiased; background-attachment:fixed;
  background:
    radial-gradient(900px 520px at 6% -8%,var(--glow-a),transparent 60%),
    radial-gradient(800px 520px at 100% 0%,var(--glow-b),transparent 55%),
    var(--bg);
}
h1,h2,h3,h4,p{margin:0}
h1,h2,h3{letter-spacing:-.035em}
.num,.mono{font-family:var(--font-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.03em}
.muted{color:var(--ink-3)} .sub{color:var(--ink-2)}
.eyebrow{font:600 11px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
button{font-family:inherit}
:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
::selection{background:color-mix(in oklab,var(--pill) 40%,transparent)}

/* ===== SHELL ===== */
.shell{display:grid;grid-template-columns:var(--side-w) 1fr;min-height:100dvh}
.side{position:sticky;top:12px;margin:12px 0 12px 12px;height:calc(100dvh - 24px);background:var(--side);color:var(--side-ink);
  border-radius:26px;padding:20px 14px;display:flex;flex-direction:column;gap:22px;box-shadow:var(--shadow-2)}
.brand{display:flex;align-items:center;gap:10px;padding:2px 10px;font-weight:600;font-size:18px;letter-spacing:-.04em}
.brand-mark{width:34px;height:34px;border-radius:12px;background:var(--pill);display:grid;place-items:center;color:#17181b}
.nav{position:relative;display:flex;flex-direction:column;gap:4px}
.nav-pill{position:absolute;left:0;top:0;width:0;height:0;border-radius:999px;background:var(--pill);z-index:0;opacity:0;will-change:transform,width,height}
.nav-item{position:relative;z-index:1;display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:999px;
  color:var(--side-dim);text-decoration:none;font-weight:500;font-size:14.5px;transition:color .25s}
.nav-item:hover{color:#fff}
.nav-item[aria-current="page"],.nav-item[aria-current="page"]:hover{color:#17181b}
.side-foot{margin-top:auto;padding:12px;border-radius:18px;background:rgba(255,255,255,.06);font-size:12.5px;color:var(--side-dim)}
.main{min-width:0;padding:0 28px 48px 24px}
.top{height:var(--top-h);display:flex;align-items:center;gap:12px}
.search{flex:1;max-width:520px;height:var(--h-ctl);border-radius:999px;background:var(--card);border:1px solid var(--line);
  box-shadow:var(--shadow-1);display:flex;align-items:center;gap:10px;padding:0 8px 0 16px;color:var(--ink-3);cursor:pointer;font-size:14px}
.search .grow{flex:1;text-align:left}
.kbd{font:600 11px var(--font-mono);padding:4px 8px;border-radius:9px;background:var(--card-2);border:1px solid var(--line);color:var(--ink-2)}
.icon-btn{width:var(--h-ctl);height:var(--h-ctl);border-radius:999px;border:1px solid var(--line);background:var(--card);
  display:grid;place-items:center;cursor:pointer;color:var(--ink);box-shadow:var(--shadow-1)}
.top-spacer{flex:1}

/* ===== PAGE HEAD ===== */
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:6px 0 22px}
.page-title{font-size:clamp(36px,5vw,60px);font-weight:600;line-height:1;overflow:hidden;padding-bottom:8px;letter-spacing:-.05em}
.ch{display:inline-block;will-change:transform}
.page-actions{display:flex;gap:10px;flex-wrap:wrap}

/* ===== BUTTONS ===== */
.btn{--bg:var(--card);--fg:var(--ink);position:relative;height:var(--h-ctl);padding:0 20px;border-radius:999px;border:1px solid var(--line-strong);
  background:var(--bg);color:var(--fg);font:600 14px var(--font-sans);letter-spacing:-.01em;display:inline-flex;align-items:center;justify-content:center;
  gap:8px;cursor:pointer;white-space:nowrap;transition:background .2s,box-shadow .2s,opacity .2s,border-color .2s;will-change:transform}
.btn:hover{border-color:var(--ink-3)}
.btn-primary{--bg:var(--primary);--fg:#fff;border-color:transparent;box-shadow:0 10px 22px -10px color-mix(in oklab,var(--primary) 80%,transparent)}
.btn-primary:hover{border-color:transparent;background:color-mix(in oklab,var(--primary) 88%,#000)}
.btn-dark{--bg:var(--ink);--fg:var(--bg-inv,#fff);border-color:transparent}
[data-theme="dark"] .btn-dark{--bg:var(--ink);--fg:#17181b}
.btn-ghost{--bg:transparent;border-color:transparent}
.btn-sm{height:34px;padding:0 14px;font-size:13px}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.btn .spin{position:absolute;opacity:0}
.btn.is-loading .lbl{opacity:0}
.btn.is-loading .spin{opacity:1}
.spinner{width:18px;height:18px;border-radius:50%;border:2.5px solid currentColor;border-right-color:transparent;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== CARDS / STATS / PILLS ===== */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r-card);box-shadow:var(--shadow-1);padding:20px}
.card-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.card-t{font-size:15px;font-weight:600;letter-spacing:-.02em}
.grid{display:grid;gap:14px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}
.stat-k{font:600 11px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:8px}
.stat-v{font-size:clamp(28px,3vw,38px);font-weight:600;margin-top:10px;line-height:1}
.stat-f{margin-top:10px;font-size:12.5px;color:var(--ink-3)}
.pill{--c:var(--slate);display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 11px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;
  background:color-mix(in oklab,var(--c) 14%,transparent);color:color-mix(in oklab,var(--c) 72%,var(--ink))}
.pill[data-c="orange"]{--c:var(--orange)} .pill[data-c="amber"]{--c:var(--amber)} .pill[data-c="sky"]{--c:var(--sky)}
.pill[data-c="teal"]{--c:var(--teal)} .pill[data-c="violet"]{--c:var(--violet)} .pill[data-c="rose"]{--c:var(--rose)}
.pill[data-c="lime"]{--c:var(--lime)} .pill[data-c="slate"]{--c:var(--slate)} .pill[data-c="ok"]{--c:var(--ok)} .pill[data-c="bad"]{--c:var(--bad)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--c,currentColor)}
.skeleton{border-radius:14px;background:linear-gradient(90deg,var(--card-2),color-mix(in oklab,var(--card-2) 50%,var(--card)),var(--card-2));
  background-size:200% 100%;animation:shimmer 1.3s linear infinite}
@keyframes shimmer{to{background-position:-200% 0}}

/* ===== FORMS ===== */
.field{display:grid;gap:7px}
.label{font-size:13px;font-weight:600;letter-spacing:-.01em;display:flex;justify-content:space-between}
.hint{font-size:12px;color:var(--ink-3)} .err{font-size:12px;color:var(--bad);font-weight:500}
.input{height:48px;width:100%;border-radius:999px;border:1px solid var(--line-strong);background:color-mix(in oklab,var(--card) 60%,#fff);
  padding:0 18px;font:500 15px var(--font-sans);color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s}
[data-theme="dark"] .input{background:var(--card-2)}
.input:focus{border-color:var(--primary);box-shadow:0 0 0 4px color-mix(in oklab,var(--primary) 16%,transparent)}
.input[aria-invalid="true"]{border-color:var(--bad)}
select.input{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--ink-3) 50%),linear-gradient(135deg,var(--ink-3) 50%,transparent 50%);
  background-position:calc(100% - 22px) 21px,calc(100% - 16px) 21px;background-size:6px 6px;background-repeat:no-repeat;padding-right:40px}
.seg{position:relative;display:inline-flex;padding:4px;border-radius:999px;background:var(--card-2);border:1px solid var(--line)}
.seg-pill{position:absolute;left:0;top:0;border-radius:999px;background:var(--ink);opacity:0;z-index:0}
.seg button{position:relative;z-index:1;height:38px;padding:0 18px;border:0;background:transparent;border-radius:999px;font-weight:600;font-size:14px;
  color:var(--ink-2);cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:color .25s}
.seg button[aria-pressed="true"]{color:var(--card)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line-strong);background:transparent;color:var(--ink);font-weight:500;font-size:13.5px;cursor:pointer;transition:background .2s,color .2s}
.chip[aria-pressed="true"]{background:var(--ink);color:var(--card);border-color:var(--ink)}
.stepper{display:inline-flex;align-items:center;height:48px;border-radius:999px;border:1px solid var(--line-strong);padding:0 6px;gap:6px;background:color-mix(in oklab,var(--card) 60%,#fff)}
[data-theme="dark"] .stepper{background:var(--card-2)}
.stepper button{width:36px;height:36px;border-radius:50%;border:0;background:var(--card-2);cursor:pointer;display:grid;place-items:center;color:var(--ink)}
.stepper .v{min-width:64px;text-align:center;font-weight:600}
.switch{display:inline-flex;align-items:center;gap:12px;cursor:pointer;font-weight:500;font-size:14px}
.switch i{position:relative;width:46px;height:28px;border-radius:99px;background:var(--line-strong);transition:background .25s}
.switch i::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.25);transition:transform .35s var(--ease)}
.switch[aria-checked="true"] i{background:var(--ok)}
.switch[aria-checked="true"] i::after{transform:translateX(18px)}
.range{width:100%;accent-color:var(--primary)}

/* ===== PROGRESS / RING / GAUGE ===== */
.prog{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:8px}
.prog-seg{position:relative;height:8px;border-radius:99px;background:var(--line-strong);overflow:hidden}
.prog-seg b{position:absolute;inset:0;border-radius:inherit;background:var(--primary);transform-origin:left;transform:scaleX(0)}
.prog-seg[data-state="done"] b{background:var(--ok)}
.ring{position:relative;display:grid;place-items:center}
.ring-in{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
.bar{height:8px;border-radius:99px;background:var(--line-strong);overflow:hidden}
.bar>b{display:block;height:100%;width:100%;border-radius:inherit;background:var(--teal);transform-origin:left;transform:scaleX(0)}

/* ===== STATION: BAYS / LANES / FEED ===== */
.bays{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.bay{position:relative;overflow:hidden;display:grid;gap:12px;padding:16px}
.bay[data-state="CHARGING"]{border-color:color-mix(in oklab,var(--teal) 45%,var(--line))}
.bay[data-state="MAINTENANCE"],.bay[data-state="OFFLINE"]{background-image:repeating-linear-gradient(135deg,transparent 0 11px,color-mix(in oklab,var(--amber) 11%,transparent) 11px 22px)}
.bay-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.bay-art{border-radius:14px;background:var(--card-2);overflow:hidden}
.bay-svg{display:block;width:100%;height:auto}
.cable-flow{stroke-dasharray:6 8;animation:flow 1s linear infinite}
@keyframes flow{to{stroke-dashoffset:-14}}
.pulse{animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{50%{opacity:.35}}
.bay-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13px}
.lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.lane{border-radius:22px;padding:12px;background:color-mix(in oklab,var(--card-2) 70%,transparent);border:1px dashed var(--line-strong);min-height:230px;display:grid;gap:10px;align-content:start}
.lane-h{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 2px;font-weight:600;font-size:14px}
.kcard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;display:grid;gap:8px;box-shadow:var(--shadow-1)}
.kcard-r{display:flex;justify-content:space-between;align-items:center;gap:8px}
.feed{list-style:none;margin:0;padding:0;display:grid;gap:2px;max-height:360px;overflow:auto}
.feed li{display:grid;grid-template-columns:10px 1fr auto;gap:12px;align-items:start;padding:10px 4px;border-bottom:1px solid var(--line);font-size:13.5px}
.feed li:last-child{border-bottom:0}
.feed .dot{margin-top:6px}
.spark{display:flex;align-items:flex-end;gap:5px;height:64px}
.spark i{flex:1;border-radius:6px 6px 3px 3px;background:color-mix(in oklab,var(--primary) 70%,var(--pill));transform-origin:bottom;min-height:3px}
.empty{display:grid;place-items:center;text-align:center;gap:8px;padding:26px 12px;color:var(--ink-3);font-size:13.5px}

/* ===== OVERLAYS ===== */
.veil{position:fixed;inset:0;background:rgba(23,24,27,.38);backdrop-filter:blur(3px);z-index:50}
.drawer{position:fixed;top:12px;right:12px;bottom:12px;width:min(460px,calc(100vw - 24px));background:var(--card);border:1px solid var(--line);
  border-radius:26px;box-shadow:var(--shadow-2);z-index:60;display:flex;flex-direction:column;overflow:hidden}
.drawer-h{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid var(--line)}
.drawer-b{padding:22px;overflow:auto;display:grid;gap:18px;align-content:start;flex:1}
.drawer-f{padding:16px 22px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end}
.toasts{position:fixed;right:20px;bottom:20px;display:grid;gap:10px;z-index:90;width:min(360px,calc(100vw - 32px))}
.toast{position:relative;overflow:hidden;background:#17181b;color:#f3f1ec;border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:center;box-shadow:var(--shadow-2)}
.toast .t{font-weight:600;font-size:14px} .toast .d{font-size:12.5px;color:#b9bbc2;margin-top:2px}
.toast .grow{flex:1}
.toast .undo{height:32px;padding:0 14px;border-radius:999px;border:0;background:var(--pill);color:#17181b;font-weight:700;cursor:pointer}
.toast .life{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--pill);transform-origin:left}
.cmd{position:fixed;left:50%;top:14vh;transform:translateX(-50%);width:min(560px,calc(100vw - 24px));background:var(--card);border-radius:22px;z-index:70;box-shadow:var(--shadow-2);overflow:hidden;border:1px solid var(--line)}
.cmd input{width:100%;height:58px;border:0;border-bottom:1px solid var(--line);padding:0 22px;font:500 16px var(--font-sans);background:transparent;color:var(--ink);outline:none}
.cmd-item{display:flex;align-items:center;gap:12px;height:48px;padding:0 22px;cursor:pointer;font-weight:500}
.cmd-item[aria-selected="true"]{background:var(--card-2)}

/* ===== AUTH ===== */
.auth{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);min-height:100dvh}
.auth-art{position:relative;margin:12px;border-radius:30px;background:var(--side);color:var(--side-ink);padding:36px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.auth-art::before{content:"";position:absolute;inset:-20% -10% auto auto;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(255,154,60,.35),transparent 65%)}
.auth-art>*{position:relative}
.auth-pane{display:grid;place-items:center;padding:28px}
.auth-box{width:min(440px,100%);display:grid;gap:22px}
.auth-tabs{display:flex;justify-content:center}

/* ===== ONBOARDING ===== */
.ob{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:14px;padding:12px;min-height:100dvh}
.ob-rail{background:var(--side);color:var(--side-ink);border-radius:30px;padding:32px;display:flex;flex-direction:column;gap:18px;position:sticky;top:12px;height:calc(100dvh - 24px);overflow:auto}
.info{display:grid;grid-template-columns:40px 1fr;gap:14px;padding:14px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);opacity:.5;transition:opacity .3s,background .3s}
.info[data-on="true"]{opacity:1;background:rgba(255,154,60,.12);border-color:rgba(255,154,60,.35)}
.info-i{width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.08);display:grid;place-items:center;color:var(--pill)}
.info h4{font-size:14.5px;font-weight:600;color:#fff} .info p{font-size:12.5px;color:var(--side-dim);margin-top:3px;line-height:1.45}
.ob-main{display:grid;place-items:center;padding:24px}
.ob-card{width:min(640px,100%);display:grid;gap:24px}
.ob-body{display:grid;gap:18px}
.ob-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.row-card{display:grid;grid-template-columns:1.2fr 1fr 1fr auto;gap:10px;align-items:end;padding:14px;border-radius:18px;border:1px solid var(--line);background:var(--card-2)}

/* ===== MOBILE: sidebar → floating dock, drawers → bottom sheets ===== */
@media (max-width:900px){
  .shell{grid-template-columns:1fr}
  .side{position:fixed;left:12px;right:12px;bottom:12px;top:auto;margin:0;height:auto;flex-direction:row;padding:8px;border-radius:999px;z-index:40}
  .brand,.side-foot,.nav-item .t{display:none}
  .nav{flex-direction:row;flex:1;justify-content:space-between}
  .nav-item{padding:0 16px;flex:1;justify-content:center}
  .main{padding:0 14px 110px}
  .search .grow{display:none} .search{flex:0 0 auto}
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lanes{grid-template-columns:1fr}
  .drawer{top:auto;left:0;right:0;bottom:0;width:auto;max-height:90dvh;border-radius:26px 26px 0 0}
  .auth,.ob{grid-template-columns:1fr} .auth-art{display:none} .ob-rail{position:static;height:auto}
  .ob-grid,.row-card{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
```

---

## 4. MOTION LIBRARY — `apps/web/components/torque/motion.tsx`

```tsx
"use client";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const EASE = "cubic-bezier(.2,.8,.2,1)";
export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Smoothly counts toward `target`; re-targets from the current value (good for live tickers). */
export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    if (prefersReduced()) { cur.current = target; setV(target); return; }
    const from = cur.current, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      cur.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function Num({ value, decimals = 0, prefix = "", suffix = "", duration = 900, className = "" }:
  { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string }) {
  const v = useCountUp(value, duration);
  return (
    <span className={`num ${className}`}>
      {prefix}{v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

/** Page title: every letter slides up (Torque "split-letter title"). */
export function SplitTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    const anims = Array.from(el.querySelectorAll<HTMLElement>(".ch")).map((c, i) =>
      c.animate(
        [{ transform: "translateY(110%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
        { duration: 700, delay: 26 * i, easing: EASE, fill: "backwards" }
      )
    );
    return () => anims.forEach((a) => a.cancel());
  }, [text]);
  return (
    <h1 ref={ref} className="page-title" aria-label={text}>
      {Array.from(text).map((c, i) => (
        <span key={i} className="ch" aria-hidden="true">{c === " " ? "\u00A0" : c}</span>
      ))}
    </h1>
  );
}

/** Staggered entrance for every descendant that has data-reveal. Re-runs only when deps change. */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReduced()) return;
    const anims = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).map((el, i) =>
      el.animate(
        [{ opacity: 0, transform: "translateY(14px) scale(.985)" }, { opacity: 1, transform: "none" }],
        { duration: 650, delay: 60 * i, easing: EASE, fill: "backwards" }
      )
    );
    return () => anims.forEach((a) => a.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Magnetic hover (buttons drift toward the cursor). */
export function useMagnetic<T extends HTMLElement>(strength = 0.22) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px,${(e.clientY - r.top - r.height / 2) * strength}px)`;
    };
    const leave = () => {
      el.animate([{ transform: el.style.transform || "none" }, { transform: "translate(0,0)" }], { duration: 480, easing: EASE });
      el.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [strength]);
  return ref;
}

/** Sliding highlight pill (sidebar nav + segmented controls). `activeSelector` marks the active child. */
export function useSlidingPill(
  container: RefObject<HTMLElement | null>,
  pill: RefObject<HTMLElement | null>,
  activeSelector: string,
  dep: unknown
) {
  const first = useRef(true);
  useLayoutEffect(() => {
    const c = container.current, p = pill.current;
    if (!c || !p) return;
    const place = (animate: boolean) => {
      const a = c.querySelector<HTMLElement>(activeSelector);
      if (!a) { p.style.opacity = "0"; return; }
      const to = {
        transform: `translate(${a.offsetLeft}px, ${a.offsetTop}px)`,
        width: `${a.offsetWidth}px`,
        height: `${a.offsetHeight}px`,
      };
      if (animate && !prefersReduced() && p.style.width) {
        p.animate(
          [{ transform: p.style.transform || "none", width: p.style.width, height: p.style.height }, to],
          { duration: 460, easing: EASE }
        );
      }
      Object.assign(p.style, to);
      p.style.opacity = "1";
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [container, pill, activeSelector, dep]);
}

/** Circular ring. value 0..1. Stroke animates with WAAPI. children render in the centre. */
export function Ring({ value, size = 104, stroke = 11, color = "var(--teal)", duration = 900, easing = EASE, children }:
  { value: number; size?: number; stroke?: number; color?: string; duration?: number; easing?: string; children?: React.ReactNode }) {
  const arc = useRef<SVGCircleElement>(null);
  const prev = useRef(0);
  const v = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    const el = arc.current;
    if (!el) return;
    if (!prefersReduced()) el.animate([{ strokeDashoffset: 1 - prev.current }, { strokeDashoffset: 1 - v }], { duration, easing });
    el.style.strokeDashoffset = String(1 - v);
    prev.current = v;
  }, [v, duration, easing]);
  const r = (size - stroke) / 2;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        <circle ref={arc} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1} strokeOpacity={v <= 0 ? 0 : 1} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

/** Half-circle gauge (power meter). value 0..1. */
export function Gauge({ value, width = 190, color = "var(--orange)", children }:
  { value: number; width?: number; color?: string; children?: React.ReactNode }) {
  const arc = useRef<SVGPathElement>(null);
  const prev = useRef(0);
  const v = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    const el = arc.current;
    if (!el) return;
    if (!prefersReduced()) el.animate([{ strokeDashoffset: 1 - prev.current }, { strokeDashoffset: 1 - v }], { duration: 900, easing: EASE });
    el.style.strokeDashoffset = String(1 - v);
    prev.current = v;
  }, [v]);
  const d = "M 14 100 A 86 86 0 0 1 186 100";
  return (
    <div style={{ position: "relative", width, height: width * 0.56 }}>
      <svg viewBox="0 0 200 110" width={width} aria-hidden="true">
        <path d={d} fill="none" stroke="var(--line-strong)" strokeWidth="14" strokeLinecap="round" />
        <path ref={arc} d={d} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={1} strokeOpacity={v <= 0 ? 0 : 1} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "end center", paddingBottom: 2, textAlign: "center" }}>{children}</div>
    </div>
  );
}

/** Thin horizontal progress bar animated with transform (no layout cost). */
export function Bar({ value, color = "var(--teal)", duration = 1000 }: { value: number; color?: string; duration?: number }) {
  const el = useRef<HTMLElement>(null);
  const prev = useRef(0);
  const v = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    const b = el.current;
    if (!b) return;
    if (!prefersReduced()) b.animate([{ transform: `scaleX(${prev.current})` }, { transform: `scaleX(${v})` }], { duration, easing: "linear" });
    b.style.transform = `scaleX(${v})`;
    prev.current = v;
  }, [v, duration]);
  return <div className="bar"><b ref={el} style={{ background: color }} /></div>;
}

/** Wall-clock that ticks every `ms`, corrected by the server clock offset. */
export function useNow(ms = 1000, offsetMs = 0) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offsetMs), ms);
    return () => clearInterval(id);
  }, [ms, offsetMs]);
  return now;
}
```

---

## 5. TOASTS WITH UNDO — `components/torque/toast.tsx`

```tsx
"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { EASE, prefersReduced } from "./motion";

export type ToastItem = {
  id: number; title: string; desc?: string; tone?: "ok" | "bad" | "info";
  undo?: () => void | Promise<void>; ttl: number;
};
let items: ToastItem[] = [];
let nid = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function toast(t: Omit<ToastItem, "id" | "ttl"> & { ttl?: number }) {
  const id = nid++;
  items = [...items, { ...t, id, ttl: t.ttl ?? (t.undo ? 7000 : 4200) }];
  emit();
  return id;
}
export function dismissToast(id: number) { items = items.filter((i) => i.id !== id); emit(); }

function ToastView({ t }: { t: ToastItem }) {
  const root = useRef<HTMLDivElement>(null);
  const life = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current, bar = life.current;
    if (el && !prefersReduced()) el.animate([{ transform: "translateY(24px) scale(.96)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 480, easing: EASE });
    if (bar && !prefersReduced()) bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: t.ttl, easing: "linear", fill: "forwards" });
    const timer = setTimeout(() => close(), t.ttl);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function close() {
    const el = root.current;
    if (!el || prefersReduced()) return dismissToast(t.id);
    el.animate([{ opacity: 1 }, { opacity: 0, transform: "translateX(30px)" }], { duration: 260, easing: EASE, fill: "forwards" }).onfinish = () => dismissToast(t.id);
  }
  const color = t.tone === "bad" ? "var(--bad)" : t.tone === "ok" ? "var(--teal)" : "var(--pill)";
  return (
    <div ref={root} className="toast" role="status">
      <span className="dot" style={{ background: color, width: 10, height: 10 }} />
      <div className="grow"><div className="t">{t.title}</div>{t.desc && <div className="d">{t.desc}</div>}</div>
      {t.undo && <button className="undo" onClick={async () => { await t.undo?.(); close(); }}>Undo</button>}
      <div ref={life} className="life" style={{ background: color }} />
    </div>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);
  return <div className="toasts" aria-live="polite">{list.map((t) => <ToastView key={t.id} t={t} />)}</div>;
}
```

---

## 6. UI PRIMITIVES — `components/torque/primitives.tsx`

```tsx
"use client";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Minus, Plus, X } from "@phosphor-icons/react";
import { EASE, prefersReduced, useMagnetic, useSlidingPill } from "./motion";

export function Spinner() { return <span className="spinner" aria-hidden="true" />; }

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "dark" | "ghost"; size?: "md" | "sm"; loading?: boolean; magnetic?: boolean;
};
export function Button({ variant = "default", size = "md", loading, magnetic, className = "", children, disabled, ...rest }: BtnProps) {
  const mref = useMagnetic<HTMLButtonElement>(0.22);
  const cls = ["btn", variant !== "default" && `btn-${variant}`, size === "sm" && "btn-sm", loading && "is-loading", className].filter(Boolean).join(" ");
  return (
    <button ref={magnetic ? mref : undefined} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      <span className="lbl" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{children}</span>
      <span className="spin"><Spinner /></span>
    </button>
  );
}

export function Pill({ c = "slate", dot, children }: { c?: string; dot?: boolean; children: ReactNode }) {
  return <span className="pill" data-c={c}>{dot && <i className="dot" />}{children}</span>;
}

export function Field({ label, hint, error, htmlFor, right, children }:
  { label: string; hint?: string; error?: string; htmlFor?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}><span>{label}</span>{right}</label>
      {children}
      {error ? <span className="err" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className = "", ...rest }, ref) {
    return <input ref={ref} className={`input ${className}`} aria-invalid={invalid || undefined} {...rest} />;
  }
);

export function Segmented<T extends string>({ value, onChange, options }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[] }) {
  const box = useRef<HTMLDivElement>(null), pill = useRef<HTMLSpanElement>(null);
  useSlidingPill(box, pill, '[aria-pressed="true"]', value);
  return (
    <div className="seg" ref={box} role="group">
      <span className="seg-pill" ref={pill} />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.icon}{o.label}</button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, multi }:
  { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className="chip" aria-pressed={on}
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o) : [...value, o]) : [o])}>{o}</button>
        );
      })}
    </div>
  );
}

export function NumberStepper({ value, onChange, min = 0, max = 999, step = 1, suffix = "", decimals = 0 }:
  { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; decimals?: number }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Number(n.toFixed(decimals)))));
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" onClick={() => set(value - step)}><Minus size={16} weight="bold" /></button>
      <span className="v num">{value}{suffix}</span>
      <button type="button" aria-label="Increase" onClick={() => set(value + step)}><Plus size={16} weight="bold" /></button>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}
      style={{ background: "none", border: 0, padding: 0, color: "inherit" }}>
      <i /><span>{label}</span>
    </button>
  );
}

export function Skeleton({ h = 20, w = "100%", r = 14 }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}<strong style={{ color: "var(--ink)" }}>{title}</strong>{body && <span>{body}</span>}{action}
    </div>
  );
}

/** Right drawer on desktop, bottom sheet on mobile. Animated in/out with WAAPI. */
export function Drawer({ open, onClose, title, children, footer }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const panel = useRef<HTMLDivElement>(null), veil = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  useEffect(() => {
    if (!mounted) return;
    const p = panel.current, v = veil.current;
    if (!p || !v) return;
    const sheet = window.matchMedia("(max-width: 900px)").matches;
    const off = sheet ? "translateY(105%)" : "translateX(110%)";
    if (open) {
      if (!prefersReduced()) { p.animate([{ transform: off }, { transform: "none" }], { duration: 520, easing: EASE }); v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); }
    } else if (prefersReduced()) {
      setMounted(false);
    } else {
      p.animate([{ transform: "none" }, { transform: off }], { duration: 360, easing: EASE, fill: "forwards" }).onfinish = () => setMounted(false);
      v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
    }
  }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!mounted) return null;
  return (
    <>
      <div ref={veil} className="veil" onClick={onClose} />
      <aside ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-h"><h3 style={{ fontSize: 20 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="drawer-b">{children}</div>
        {footer && <div className="drawer-f">{footer}</div>}
      </aside>
    </>
  );
}
```

---

## 7. APP PLUMBING

### 7.1 `app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./torque.css";
import { Toaster } from "@/components/torque/toast";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = { title: "EVspark", description: "Live EV charging network" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="light" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('tq-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        </head>
        <body>{children}<Toaster /></body>
      </html>
    </ClerkProvider>
  );
}
```

### 7.2 `middleware.ts` (Next 16: rename file `proxy.ts`)
```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isProtected = createRouteMatcher(["/onboarding(.*)", "/post-auth(.*)", "/station(.*)", "/chargers(.*)", "/sessions(.*)", "/analytics(.*)", "/pricing(.*)", "/settings(.*)"]);
export default clerkMiddleware(async (auth, req) => { if (isProtected(req)) await auth.protect(); });
export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"] };
```

### 7.3 `lib/api.ts`
```ts
"use client";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? "ERROR", body?.error?.message ?? res.statusText, body?.error?.fields);
    return body as T;
  }, [getToken]);
}

export type Me = {
  id: string; role: "DRIVER" | "OPERATOR" | "ADMIN"; name: string | null; username: string | null; email: string | null;
  onboarded: boolean; onboardingDraft: { step: number; data: Record<string, unknown> } | null;
};

export function useMe() {
  const api = useApi();
  const { isLoaded, isSignedIn } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { const r = await api<{ user: Me }>("/api/me"); setMe(r.user); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { if (isLoaded && isSignedIn) void refresh(); }, [isLoaded, isSignedIn, refresh]);
  return { me, loading, error, refresh, setMe };
}
```

### 7.4 `components/torque/AppShell.tsx` (sidebar + top bar + sliding pill + ⌘K)
```tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ChartLineUp, CurrencyInr, Gear, Lightning, ListChecks, MagnifyingGlass, Moon, PlugsConnected, Sun } from "@phosphor-icons/react";
import { EASE, prefersReduced, useSlidingPill } from "./motion";

export const NAV = [
  { href: "/station", label: "Station", Icon: Lightning },
  { href: "/chargers", label: "Chargers", Icon: PlugsConnected },
  { href: "/sessions", label: "Sessions", Icon: ListChecks },
  { href: "/analytics", label: "Analytics", Icon: ChartLineUp },
  { href: "/pricing", label: "Pricing", Icon: CurrencyInr },
  { href: "/settings", label: "Settings", Icon: Gear },
];

export function toggleTheme() {
  const el = document.documentElement;
  const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
  el.setAttribute("data-theme", next);
  try { localStorage.setItem("tq-theme", next); } catch {}
}

export function AppShell({ children, stationName }: { children: React.ReactNode; stationName?: string }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null), pill = useRef<HTMLSpanElement>(null);
  const active = NAV.find((n) => path.startsWith(n.href))?.href ?? "";
  useSlidingPill(nav, pill, '[aria-current="page"]', active);
  const [cmd, setCmd] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); }
      if (e.key === "Escape") setCmd(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="brand-mark"><Lightning size={20} weight="fill" /></span>EVspark</div>
        <nav className="nav" ref={nav}>
          <span className="nav-pill" ref={pill} />
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="nav-item" aria-current={active === href ? "page" : undefined}>
              <Icon size={20} weight={active === href ? "fill" : "regular"} /><span className="t">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot"><strong style={{ color: "#fff", display: "block", fontSize: 13 }}>{stationName ?? "Your station"}</strong>Operator panel</div>
      </aside>
      <div className="main">
        <header className="top">
          <button className="search" onClick={() => setCmd(true)} aria-label="Search">
            <MagnifyingGlass size={18} /><span className="grow">Search or jump to…</span><span className="kbd">⌘K</span>
          </button>
          <div className="top-spacer" />
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme"><Sun size={18} /><Moon size={0} /></button>
          <UserButton />
        </header>
        {children}
      </div>
      {cmd && <CommandPalette onClose={() => setCmd(false)} />}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState(""), [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const items = useMemo(() => [
    ...NAV.map((n) => ({ label: `Go to ${n.label}`, run: () => router.push(n.href) })),
    { label: "Toggle light / dark theme", run: toggleTheme },
  ].filter((x) => x.label.toLowerCase().includes(q.toLowerCase())), [q, router]);
  useEffect(() => {
    if (box.current && !prefersReduced()) box.current.animate([{ opacity: 0, transform: "translate(-50%,-12px) scale(.98)" }, { opacity: 1, transform: "translate(-50%,0) scale(1)" }], { duration: 320, easing: EASE });
  }, []);
  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className="cmd" ref={box} role="dialog" aria-label="Command palette">
        <input autoFocus placeholder="Type a command…" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setI((v) => Math.min(items.length - 1, v + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
            if (e.key === "Enter" && items[i]) { items[i].run(); onClose(); }
          }} />
        {items.map((it, idx) => (
          <div key={it.label} className="cmd-item" aria-selected={idx === i} onMouseEnter={() => setI(idx)} onClick={() => { it.run(); onClose(); }}>{it.label}</div>
        ))}
        {items.length === 0 && <div className="empty">No match</div>}
      </div>
    </>
  );
}
```
**Theme icon note:** replace the `<Sun/><Moon size={0}/>` placeholder by a small component that reads `data-theme` on mount and shows Sun in dark mode / Moon in light mode.

### 7.5 `app/(operator)/layout.tsx` — onboarding gate + shell
```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/torque/AppShell";
import { Skeleton } from "@/components/torque/primitives";
import { useMe } from "@/lib/api";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (loading || !me) return;
    if (!me.onboarded) router.replace("/onboarding");
    else if (me.role === "DRIVER") router.replace("/map"); // ← set to the real driver home route of the repo
  }, [me, loading, router]);
  if (loading || !me || !me.onboarded || me.role === "DRIVER") {
    return <div style={{ padding: 40, display: "grid", gap: 14, maxWidth: 900 }}><Skeleton h={56} w={320} /><Skeleton h={120} /><Skeleton h={260} /></div>;
  }
  return <AppShell>{children}</AppShell>;
}
```
`app/(operator)/[section]/page.tsx` → renders `<EmptyState title="Coming soon" body="This section ships in the next phase." />` inside a `.card`, so no sidebar link ever 404s.

---

# PAGE 1 — LOGIN / SIGN-UP (Torque split screen)

**Look:** left = near-black rounded panel with an orange glow, split-letter headline, an auto-charging ring and 3 ticking stat tiles. Right = warm paper pane, sliding `Sign in | Create account` pill, then the Clerk form restyled to pill inputs. Light theme only on auth pages.
**Flow:** `/login` or `/signup` → Clerk (username + password, Google, GitHub) → `/post-auth` (calls backend sync) → `/onboarding` (first time) or role home.
**Role at sign-up:** a `Driver | Operator` pill above the Clerk form; its value goes in `unsafeMetadata.role`. The server validates it (never trusts it for ADMIN) and the user can still switch role on the first onboarding screen (needed for Google/GitHub sign-ups).

### 8.1 `components/torque/clerkAppearance.ts`
```ts
export const clerkAppearance = {
  variables: {
    colorPrimary: "#c2410c", colorText: "#17181b", colorBackground: "transparent",
    colorInputBackground: "#ffffff", colorInputText: "#17181b", borderRadius: "14px",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none", border: "none", background: "transparent" },
    card: { boxShadow: "none", border: "none", background: "transparent", padding: 0, gap: 18 },
    headerTitle: { fontSize: 30, fontWeight: 600, letterSpacing: "-0.04em" },
    headerSubtitle: { color: "#4a4c52" },
    formButtonPrimary: { height: 48, borderRadius: 999, background: "#c2410c", textTransform: "none", fontWeight: 600, fontSize: 14, boxShadow: "0 10px 22px -10px rgba(194,65,12,.8)" },
    formFieldInput: { height: 48, borderRadius: 999, padding: "0 18px", border: "1px solid rgba(23,24,27,.15)" },
    socialButtonsBlockButton: { height: 48, borderRadius: 999, border: "1px solid rgba(23,24,27,.15)" },
    footerAction: { display: "none" },
  },
} as const;
```

### 8.2 `components/torque/AuthShell.tsx`
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightning } from "@phosphor-icons/react";
import { Num, Ring, SplitTitle, useReveal } from "./motion";
import { Segmented } from "./primitives";

export function AuthShell({ mode, children }: { mode: "login" | "signup"; children: React.ReactNode }) {
  const router = useRouter();
  const root = useReveal<HTMLDivElement>([]);
  const [p, setP] = useState(0.12);
  useEffect(() => { // ambient "charging" loop for the ring
    const id = setInterval(() => setP((v) => (v >= 1 ? 0.1 : Math.min(1, v + 0.22))), 1700);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", "light"); }, []);

  return (
    <div className="auth" ref={root}>
      <section className="auth-art">
        <div className="brand" data-reveal><span className="brand-mark"><Lightning size={20} weight="fill" /></span>EVspark</div>
        <div style={{ display: "grid", gap: 26 }}>
          <div><SplitTitle text="Charge smarter." /><p style={{ color: "var(--side-dim)", marginTop: 14, maxWidth: 380 }} data-reveal>
            Live wait times, queue-aware routing and a real operator panel — one network, no guessing.</p></div>
          <div data-reveal style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Ring value={p} size={132} stroke={13} color="var(--pill)" duration={1500}>
              <div><div className="num" style={{ fontSize: 28, fontWeight: 600 }}><Num value={Math.round(p * 100)} suffix="%" duration={1500} /></div>
                <div className="eyebrow" style={{ color: "var(--side-dim)" }}>charging</div></div>
            </Ring>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
              {[{ k: "Stations", v: 128 }, { k: "Avg wait", v: 6, s: " min" }, { k: "Live now", v: 342 }, { k: "Uptime", v: 99, s: "%" }].map((t) => (
                <div key={t.k} style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: "12px 14px" }}>
                  <div className="eyebrow" style={{ color: "var(--side-dim)" }}>{t.k}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }}><Num value={t.v} suffix={t.s} /></div>
                </div>))}
            </div>
          </div>
        </div>
        <div className="eyebrow" style={{ color: "var(--side-dim)" }}>Mumbai · live network</div>
      </section>
      <section className="auth-pane">
        <div className="auth-box">
          <div className="auth-tabs" data-reveal>
            <Segmented value={mode} onChange={(m) => router.push(m === "login" ? "/login" : "/signup")}
              options={[{ value: "login", label: "Sign in" }, { value: "signup", label: "Create account" }]} />
          </div>
          <div data-reveal>{children}</div>
        </div>
      </section>
    </div>
  );
}
```

### 8.3 `app/(auth)/login/[[...login]]/page.tsx`
```tsx
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/torque/AuthShell";
import { clerkAppearance } from "@/components/torque/clerkAppearance";
export default function Page() {
  return (<AuthShell mode="login"><SignIn routing="path" path="/login" signUpUrl="/signup" appearance={clerkAppearance} /></AuthShell>);
}
```

### 8.4 `app/(auth)/signup/[[...signup]]/page.tsx`
```tsx
"use client";
import { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import { Car, Buildings } from "@phosphor-icons/react";
import { AuthShell } from "@/components/torque/AuthShell";
import { clerkAppearance } from "@/components/torque/clerkAppearance";
import { Segmented } from "@/components/torque/primitives";

export default function Page() {
  const [role, setRole] = useState<"DRIVER" | "OPERATOR">("DRIVER");
  return (
    <AuthShell mode="signup">
      <div style={{ display: "grid", gap: 18, justifyItems: "center" }}>
        <div className="eyebrow">I am a</div>
        <Segmented value={role} onChange={setRole}
          options={[{ value: "DRIVER", label: "Driver", icon: <Car size={16} /> }, { value: "OPERATOR", label: "Station operator", icon: <Buildings size={16} /> }]} />
        <SignUp routing="path" path="/signup" signInUrl="/login" unsafeMetadata={{ role }} appearance={clerkAppearance} />
      </div>
    </AuthShell>
  );
}
```

### 8.5 `app/post-auth/page.tsx` — sync + smart redirect (Torque loader)
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Lightning } from "@phosphor-icons/react";
import { Button } from "@/components/torque/primitives";
import { useApi, type Me } from "@/lib/api";

export default function PostAuth() {
  const api = useApi(); const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const ran = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setErr(null);
    try {
      const { user } = await api<{ user: Me }>("/api/me/sync", { method: "POST" });
      router.replace(!user.onboarded ? "/onboarding" : user.role === "OPERATOR" || user.role === "ADMIN" ? "/station" : "/map");
    } catch (e) { setErr((e as Error).message); }
  }
  useEffect(() => { if (isLoaded && isSignedIn && !ran.current) { ran.current = true; void run(); } }, [isLoaded, isSignedIn]); // eslint-disable-line

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
        <span className="brand-mark pulse" style={{ width: 56, height: 56, borderRadius: 18 }}><Lightning size={28} weight="fill" /></span>
        {err ? (<><p className="err">{err}</p><Button variant="primary" onClick={() => { ran.current = true; void run(); }}>Try again</Button></>)
             : <p className="sub">Setting up your workspace…</p>}
      </div>
    </div>
  );
}
```
(`/map` = the existing driver map route; change if different.)

---

# PAGE 2 — ONBOARDING (one-time, 3 small steps)

**Look:** split layout. Left = dark rail with **7 info blocks** about the user's role; the block(s) for the current step light up orange. Right = one card: segmented progress bar (each segment fills, **turns green when that step is saved**), the step form (pill inputs, steppers, chips, switches), Back/Continue magnetic buttons with spinners, and a success screen (ring → ✓) before redirect.
**Rules:** 3 steps max per role. Every Continue validates (zod) → saves draft to DB (`PUT /api/onboarding/draft`) → slides next step in. Last step → `POST /api/onboarding/complete` (transaction) → `onboardedAt` set → later logins skip this page. Closing the tab resumes at the saved step. Driver: vehicle fields mandatory. Operator: station + chargers mandatory.

### 9.1 `components/torque/onboarding/schemas.ts` — **copy this file verbatim to `apps/api/src/validators/onboarding.ts` too**
```ts
import { z } from "zod";

export const CONNECTORS = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC001", "BHARAT_DC001"] as const;
export const CONNECTOR_LABEL: Record<(typeof CONNECTORS)[number], string> = {
  CCS2: "CCS2 (DC fast)", TYPE2: "Type 2 (AC)", CHADEMO: "CHAdeMO", GBT: "GB/T", BHARAT_AC001: "Bharat AC-001", BHARAT_DC001: "Bharat DC-001",
};
export const CITIES = ["Mumbai", "Navi Mumbai", "Thane", "Pune", "Delhi NCR", "Bengaluru", "Hyderabad", "Chennai", "Other"] as const;
export const AMENITIES = ["Restroom", "Cafe", "Wi-Fi", "Covered parking", "24x7 security", "Lounge", "EV mechanic"] as const;
export const HABITS = ["Home", "Office", "Public fast chargers", "Highway trips"] as const;

const connector = z.enum(CONNECTORS);
const phoneRe = /^(\+91)?[6-9]\d{9}$/;
const phoneOpt = z.string().trim().refine((v) => v === "" || phoneRe.test(v), "Enter a valid 10-digit mobile number");
const phoneReq = z.string().trim().regex(phoneRe, "Enter a valid 10-digit mobile number");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const driverStep1 = z.object({
  displayName: z.string().trim().min(2, "Tell us what to call you").max(60),
  phone: phoneOpt,
  city: z.enum(CITIES, { message: "Pick your city" }),
});
export const driverStep2 = z.object({
  vehicle: z.object({
    make: z.string().trim().min(2, "Required").max(40),
    model: z.string().trim().min(1, "Required").max(40),
    batteryKwh: z.number().min(5, "Min 5 kWh").max(200, "Max 200 kWh"),
    connector,
    maxDcKw: z.number().min(3).max(350),
    plate: z.string().trim().regex(/^[A-Za-z0-9 -]{6,14}$/, "e.g. MH 02 AB 1234"),
  }),
});
export const driverStep3 = z.object({
  prefs: z.object({
    maxPricePerKwh: z.number().min(5).max(60),
    habits: z.array(z.string()).max(4),
    notifyWait: z.boolean(),
    notifyOffers: z.boolean(),
  }),
});
export const driverSchema = z.object({ ...driverStep1.shape, ...driverStep2.shape, ...driverStep3.shape });

export const operatorStep1 = z.object({
  displayName: z.string().trim().min(2, "Tell us what to call you").max(60),
  businessName: z.string().trim().min(2, "Business name is required").max(80),
  phone: phoneReq,
  gstin: z.string().trim().refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v.toUpperCase()), "Invalid GSTIN"),
});
export const operatorStep2 = z.object({
  station: z.object({
    name: z.string().trim().min(3, "Station name is required").max(80),
    address: z.string().trim().min(8, "Add the full address").max(200),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    open24h: z.boolean(),
    opensAt: hhmm,
    closesAt: hhmm,
    amenities: z.array(z.string()).max(10),
  }),
});
export const operatorStep3 = z.object({
  chargers: z.array(z.object({
    connector,
    powerKw: z.number().min(3, "Min 3 kW").max(400),
    pricePerKwh: z.number().min(1, "Min ₹1").max(100),
    count: z.number().int().min(1).max(12),
  })).min(1, "Add at least one charger type").max(6)
    .refine((a) => a.reduce((s, c) => s + c.count, 0) <= 24, "A station can have at most 24 chargers"),
});
export const operatorSchema = z.object({ ...operatorStep1.shape, ...operatorStep2.shape, ...operatorStep3.shape });

export type DriverData = z.infer<typeof driverSchema>;
export type OperatorData = z.infer<typeof operatorSchema>;
```

### 9.2 `components/torque/onboarding/info.tsx` — the 7 info blocks per role
```tsx
import { Bell, ChartLineUp, Clock, CurrencyInr, Heart, Lightning, ListChecks, MapPinLine, PlugsConnected, ShieldCheck, Star, Wrench } from "@phosphor-icons/react";
import type { ReactNode } from "react";
export type InfoBlock = { icon: ReactNode; title: string; body: string; step: 0 | 1 | 2 };
export const INFO: Record<"DRIVER" | "OPERATOR", InfoBlock[]> = {
  DRIVER: [
    { step: 0, icon: <Clock size={20} />, title: "Live wait times", body: "See how long a station will really take — based on who is charging and who is queued right now." },
    { step: 0, icon: <MapPinLine size={20} />, title: "Queue-aware geofence", body: "When you arrive at a station you join its queue automatically. No app tapping in a car park." },
    { step: 1, icon: <PlugsConnected size={20} />, title: "Plug-matched stations", body: "We show chargers that fit your connector and your car's max charging speed." },
    { step: 1, icon: <Lightning size={20} />, title: "Smart ETA", body: "Distance, drive time and predicted wait combined into one arrival estimate." },
    { step: 2, icon: <CurrencyInr size={20} />, title: "Price you control", body: "Set a ₹/kWh ceiling and we flag stations that stay under it." },
    { step: 2, icon: <Heart size={20} />, title: "Favourites & alerts", body: "Save home and office stations and get pinged the moment a bay frees up." },
    { step: 2, icon: <Star size={20} />, title: "Honest reviews", body: "Reviews from drivers who actually charged there, not anonymous drive-bys." },
  ],
  OPERATOR: [
    { step: 0, icon: <ShieldCheck size={20} />, title: "Only your data", body: "You see your stations and nothing else. Every query is scoped to your account." },
    { step: 0, icon: <ChartLineUp size={20} />, title: "Revenue ticker", body: "Revenue and energy delivered tick up live as every vehicle charges." },
    { step: 1, icon: <MapPinLine size={20} />, title: "Be found on the map", body: "Your pin, hours and amenities show to nearby drivers the moment you finish setup." },
    { step: 1, icon: <ListChecks size={20} />, title: "Queue kanban", body: "Waiting → Charging → Done lanes with one-tap step buttons and Undo." },
    { step: 2, icon: <PlugsConnected size={20} />, title: "Live charger bays", body: "Animated bays fill to 100% while charging and show ETA and ₹ per session." },
    { step: 2, icon: <CurrencyInr size={20} />, title: "Your pricing", body: "Set ₹/kWh per charger type and change it any time from the panel." },
    { step: 2, icon: <Wrench size={20} />, title: "Maintenance mode", body: "Take a bay out of service in one click; drivers stop being routed to it." },
  ],
};
```

### 9.3 `components/torque/onboarding/Wizard.tsx`
```tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Buildings, Car, Check, Crosshair, Lightning, Plus, Trash } from "@phosphor-icons/react";
import { EASE, Num, prefersReduced, Ring } from "../motion";
import { Button, Chips, Field, Input, NumberStepper, Segmented, Switch } from "../primitives";
import { toast } from "../toast";
import { ApiError, useApi, type Me } from "@/lib/api";
import * as S from "./schemas";
import { INFO } from "./info";
import type { ZodTypeAny } from "zod";

type Role = "DRIVER" | "OPERATOR";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;

const DEFAULTS: Record<Role, Data> = {
  DRIVER: { displayName: "", phone: "", city: "Mumbai",
    vehicle: { make: "", model: "", batteryKwh: 40, connector: "CCS2", maxDcKw: 50, plate: "" },
    prefs: { maxPricePerKwh: 25, habits: [], notifyWait: true, notifyOffers: false } },
  OPERATOR: { displayName: "", businessName: "", phone: "", gstin: "",
    station: { name: "", address: "", lat: 19.0669, lng: 72.8697, open24h: true, opensAt: "06:00", closesAt: "23:00", amenities: [] },
    chargers: [{ connector: "CCS2", powerKw: 60, pricePerKwh: 18, count: 2 }] },
};
const STEPS: Record<Role, { title: string; sub: string; schema: ZodTypeAny }[]> = {
  DRIVER: [
    { title: "About you", sub: "So we can personalise your map.", schema: S.driverStep1 },
    { title: "Your vehicle", sub: "We match chargers to your car.", schema: S.driverStep2 },
    { title: "How you charge", sub: "Price ceiling and alerts.", schema: S.driverStep3 },
  ],
  OPERATOR: [
    { title: "You & your business", sub: "Who runs this station?", schema: S.operatorStep1 },
    { title: "Your station", sub: "Where drivers will find you.", schema: S.operatorStep2 },
    { title: "Your chargers", sub: "Connector, power and price.", schema: S.operatorStep3 },
  ],
};
const PRESETS = [
  { label: "2× CCS2 60 kW", v: { connector: "CCS2", powerKw: 60, pricePerKwh: 18, count: 2 } },
  { label: "1× CCS2 30 kW", v: { connector: "CCS2", powerKw: 30, pricePerKwh: 16, count: 1 } },
  { label: "2× Type 2 22 kW", v: { connector: "TYPE2", powerKw: 22, pricePerKwh: 12, count: 2 } },
  { label: "4× Bharat AC-001", v: { connector: "BHARAT_AC001", powerKw: 3.3, pricePerKwh: 10, count: 4 } },
];

const get = (o: Data, p: string) => p.split(".").reduce((a: Data | undefined, k) => (a == null ? undefined : (a as Data)[k]), o);
function setIn(obj: Data, path: string[], value: unknown): Data {
  const [k, ...rest] = path;
  const base: Data = Array.isArray(obj) ? ([...obj] as unknown as Data) : { ...obj };
  base[k] = rest.length ? setIn((base[k] ?? {}) as Data, rest, value) : value;
  return base;
}

function ProgSeg({ state }: { state: "done" | "current" | "todo" }) {
  const b = useRef<HTMLElement>(null); const prev = useRef(0);
  const to = state === "done" ? 1 : state === "current" ? 0.45 : 0;
  useEffect(() => {
    const el = b.current; if (!el) return;
    if (!prefersReduced()) el.animate([{ transform: `scaleX(${prev.current})` }, { transform: `scaleX(${to})` }], { duration: 700, easing: EASE });
    el.style.transform = `scaleX(${to})`; prev.current = to;
  }, [to]);
  return <div className="prog-seg" data-state={state === "done" ? "done" : "todo"}><b ref={b} /></div>;
}

export function Wizard({ me, onRoleChanged }: { me: Me; onRoleChanged: () => Promise<void> }) {
  const api = useApi(); const router = useRouter();
  const role: Role = me.role === "OPERATOR" ? "OPERATOR" : "DRIVER";
  const steps = STEPS[role];
  const [data, setData] = useState<Data>(() => ({ ...DEFAULTS[role], displayName: me.name ?? "", ...(me.onboardingDraft?.data ?? {}) }));
  const [step, setStep] = useState(() => Math.min(me.onboardingDraft?.step ?? 0, steps.length - 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const dir = useRef(1);

  // slide-in on every step change
  useEffect(() => {
    if (!body.current || prefersReduced()) return;
    body.current.animate([{ opacity: 0, transform: `translateX(${28 * dir.current}px)` }, { opacity: 1, transform: "none" }], { duration: 520, easing: EASE });
  }, [step]);

  const set = (path: string, v: unknown) => { setData((d) => setIn(d, path.split("."), v)); setErrors((e) => { const n = { ...e }; delete n[path]; return n; }); };
  const err = (p: string) => errors[p];
  const ci = (p: string) => ({ id: p, invalid: !!errors[p], value: get(data, p) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(p, e.target.value) });
  const num = (p: string) => ({ id: p, invalid: !!errors[p], type: "number" as const, inputMode: "decimal" as const, value: get(data, p) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(p, e.target.value === "" ? NaN : Number(e.target.value)) });

  function validate(): boolean {
    const r = steps[step].schema.safeParse(data);
    if (r.success) { setErrors({}); return true; }
    const m: Record<string, string> = {};
    for (const i of r.error.issues) { const k = i.path.join("."); if (!m[k]) m[k] = i.message; }
    setErrors(m);
    body.current?.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 320, easing: EASE });
    return false;
  }

  async function next() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (step < steps.length - 1) {
        await api("/api/onboarding/draft", { method: "PUT", body: JSON.stringify({ step: step + 1, data }) });
        dir.current = 1; setStep(step + 1);
      } else {
        await api("/api/onboarding/complete", { method: "POST", body: JSON.stringify({ data }) });
        setDone(true);
        setTimeout(() => router.replace(role === "OPERATOR" ? "/station" : "/map"), 1800);
      }
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      toast({ title: "Couldn't save", desc: (e as Error).message, tone: "bad" });
    } finally { setSaving(false); }
  }
  function back() { dir.current = -1; setStep((s) => Math.max(0, s - 1)); setErrors({}); }

  async function switchRole(r: Role) {
    if (r === role) return;
    try { await api("/api/me/role", { method: "POST", body: JSON.stringify({ role: r }) }); await onRoleChanged(); }
    catch (e) { toast({ title: "Couldn't switch role", desc: (e as Error).message, tone: "bad" }); }
  }
  // role switch remounts Wizard from the page via key={me.role}

  const locateMe = () => navigator.geolocation?.getCurrentPosition(
    (p) => { set("station.lat", Number(p.coords.latitude.toFixed(6))); set("station.lng", Number(p.coords.longitude.toFixed(6))); toast({ title: "Location set", tone: "ok" }); },
    () => toast({ title: "Location blocked", desc: "Enter latitude and longitude manually.", tone: "bad" }));

  const totalChargers = useMemo(() => (data.chargers ?? []).reduce((s: number, c: Data) => s + (Number(c.count) || 0), 0), [data.chargers]);
  const totalKw = useMemo(() => (data.chargers ?? []).reduce((s: number, c: Data) => s + (Number(c.count) || 0) * (Number(c.powerKw) || 0), 0), [data.chargers]);

  return (
    <div className="ob">
      <aside className="ob-rail">
        <div className="brand" style={{ padding: 0 }}><span className="brand-mark"><Lightning size={20} weight="fill" /></span>EVspark</div>
        <div><div className="eyebrow" style={{ color: "var(--side-dim)" }}>{role === "DRIVER" ? "Driver" : "Station operator"}</div>
          <h2 style={{ fontSize: 30, marginTop: 8, color: "#fff" }}>{role === "DRIVER" ? "Never wait blind again." : "Run your station like a pro."}</h2></div>
        {INFO[role].map((b) => (
          <div key={b.title} className="info" data-on={done || b.step === step}>
            <div className="info-i">{b.icon}</div><div><h4>{b.title}</h4><p>{b.body}</p></div>
          </div>
        ))}
      </aside>

      <main className="ob-main">
        <div className="ob-card">
          {done ? (
            <div style={{ display: "grid", placeItems: "center", gap: 18, textAlign: "center", padding: 30 }}>
              <Ring value={1} size={150} stroke={14} color="var(--ok)" duration={1100}><Check size={54} weight="bold" color="var(--ok)" /></Ring>
              <h2 style={{ fontSize: 34 }}>You&apos;re all set</h2>
              <p className="sub">Taking you to your {role === "OPERATOR" ? "station" : "map"}…</p>
            </div>
          ) : (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="eyebrow">Step {step + 1} of {steps.length}</span>
              <Segmented value={role} onChange={switchRole} options={[
                { value: "DRIVER", label: "Driver", icon: <Car size={15} /> }, { value: "OPERATOR", label: "Operator", icon: <Buildings size={15} /> }]} />
            </div>
            <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step}>
              {steps.map((_, i) => <ProgSeg key={i} state={i < step ? "done" : i === step ? "current" : "todo"} />)}
            </div>
            <div><h2 style={{ fontSize: 36 }}>{steps[step].title}</h2><p className="sub" style={{ marginTop: 6 }}>{steps[step].sub}</p></div>

            <div className="ob-body" ref={body}>
              {role === "DRIVER" && step === 0 && (<>
                <Field label="What should we call you?" htmlFor="displayName" error={err("displayName")}><Input {...ci("displayName")} placeholder="Shubham" /></Field>
                <div className="ob-grid">
                  <Field label="Mobile (optional)" htmlFor="phone" error={err("phone")} hint="For wait-time alerts"><Input {...ci("phone")} placeholder="98xxxxxx10" inputMode="tel" /></Field>
                  <Field label="City" htmlFor="city" error={err("city")}>
                    <select className="input" id="city" value={data.city} onChange={(e) => set("city", e.target.value)}>{S.CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                </div></>)}
              {role === "DRIVER" && step === 1 && (<>
                <div className="ob-grid">
                  <Field label="Make" htmlFor="vehicle.make" error={err("vehicle.make")}><Input {...ci("vehicle.make")} placeholder="Tata" /></Field>
                  <Field label="Model" htmlFor="vehicle.model" error={err("vehicle.model")}><Input {...ci("vehicle.model")} placeholder="Nexon EV" /></Field>
                </div>
                <div className="ob-grid">
                  <Field label="Battery (kWh)" error={err("vehicle.batteryKwh")}><NumberStepper value={data.vehicle.batteryKwh} onChange={(v) => set("vehicle.batteryKwh", v)} min={5} max={200} step={0.5} decimals={1} /></Field>
                  <Field label="Max DC speed (kW)" error={err("vehicle.maxDcKw")}><NumberStepper value={data.vehicle.maxDcKw} onChange={(v) => set("vehicle.maxDcKw", v)} min={3} max={350} step={5} /></Field>
                </div>
                <Field label="Connector" error={err("vehicle.connector")}>
                  <Chips options={[...S.CONNECTORS]} value={[data.vehicle.connector]} onChange={(v) => set("vehicle.connector", v[0])} /></Field>
                <Field label="Number plate" htmlFor="vehicle.plate" error={err("vehicle.plate")}><Input {...ci("vehicle.plate")} placeholder="MH 02 AB 1234" style={{ textTransform: "uppercase" }} /></Field></>)}
              {role === "DRIVER" && step === 2 && (<>
                <Field label={`Max price you'll pay: ₹${data.prefs.maxPricePerKwh}/kWh`}>
                  <input className="range" type="range" min={5} max={60} step={1} value={data.prefs.maxPricePerKwh} onChange={(e) => set("prefs.maxPricePerKwh", Number(e.target.value))} /></Field>
                <Field label="Where do you usually charge?"><Chips multi options={[...S.HABITS]} value={data.prefs.habits} onChange={(v) => set("prefs.habits", v)} /></Field>
                <Switch checked={data.prefs.notifyWait} onChange={(v) => set("prefs.notifyWait", v)} label="Alert me when a bay frees up at my favourites" />
                <Switch checked={data.prefs.notifyOffers} onChange={(v) => set("prefs.notifyOffers", v)} label="Tell me about price drops" /></>)}

              {role === "OPERATOR" && step === 0 && (<>
                <div className="ob-grid">
                  <Field label="Your name" htmlFor="displayName" error={err("displayName")}><Input {...ci("displayName")} /></Field>
                  <Field label="Business name" htmlFor="businessName" error={err("businessName")}><Input {...ci("businessName")} placeholder="Volt Hub Pvt Ltd" /></Field>
                </div>
                <div className="ob-grid">
                  <Field label="Mobile" htmlFor="phone" error={err("phone")}><Input {...ci("phone")} inputMode="tel" placeholder="98xxxxxx10" /></Field>
                  <Field label="GSTIN (optional)" htmlFor="gstin" error={err("gstin")}><Input {...ci("gstin")} placeholder="27ABCDE1234F1Z5" style={{ textTransform: "uppercase" }} /></Field>
                </div></>)}
              {role === "OPERATOR" && step === 1 && (<>
                <Field label="Station name" htmlFor="station.name" error={err("station.name")}><Input {...ci("station.name")} placeholder="Volt Hub — BKC" /></Field>
                <Field label="Full address" htmlFor="station.address" error={err("station.address")}><Input {...ci("station.address")} placeholder="Plot C-54, G Block, BKC, Mumbai 400051" /></Field>
                <div className="ob-grid">
                  <Field label="Latitude" htmlFor="station.lat" error={err("station.lat")}><Input {...num("station.lat")} step="any" /></Field>
                  <Field label="Longitude" htmlFor="station.lng" error={err("station.lng")}><Input {...num("station.lng")} step="any" /></Field>
                </div>
                <Button size="sm" onClick={locateMe}><Crosshair size={16} />Use my current location</Button>
                <Switch checked={data.station.open24h} onChange={(v) => set("station.open24h", v)} label="Open 24 hours" />
                {!data.station.open24h && (<div className="ob-grid">
                  <Field label="Opens" htmlFor="station.opensAt" error={err("station.opensAt")}><Input {...ci("station.opensAt")} type="time" /></Field>
                  <Field label="Closes" htmlFor="station.closesAt" error={err("station.closesAt")}><Input {...ci("station.closesAt")} type="time" /></Field></div>)}
                <Field label="Amenities"><Chips multi options={[...S.AMENITIES]} value={data.station.amenities} onChange={(v) => set("station.amenities", v)} /></Field></>)}
              {role === "OPERATOR" && step === 2 && (<>
                <div className="chips">{PRESETS.map((p) => <button key={p.label} type="button" className="chip" onClick={() => set("chargers", [...data.chargers, { ...p.v }])}>+ {p.label}</button>)}</div>
                {err("chargers") && <span className="err">{err("chargers")}</span>}
                {data.chargers.map((c: Data, i: number) => (
                  <div className="row-card" key={i}>
                    <Field label="Connector"><select className="input" value={c.connector} onChange={(e) => set(`chargers.${i}.connector`, e.target.value)}>
                      {S.CONNECTORS.map((k) => <option key={k} value={k}>{S.CONNECTOR_LABEL[k]}</option>)}</select></Field>
                    <Field label="Power (kW)" error={err(`chargers.${i}.powerKw`)}><Input {...num(`chargers.${i}.powerKw`)} step="any" /></Field>
                    <Field label="₹ / kWh" error={err(`chargers.${i}.pricePerKwh`)}><Input {...num(`chargers.${i}.pricePerKwh`)} step="any" /></Field>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <NumberStepper value={c.count} onChange={(v) => set(`chargers.${i}.count`, v)} min={1} max={12} suffix="×" />
                      <button className="icon-btn" aria-label="Remove" onClick={() => set("chargers", data.chargers.filter((_: Data, j: number) => j !== i))}><Trash size={16} /></button></div>
                  </div>))}
                <Button size="sm" onClick={() => set("chargers", [...data.chargers, { connector: "CCS2", powerKw: 30, pricePerKwh: 16, count: 1 }])}><Plus size={16} />Add charger type</Button>
                <div className="card" style={{ display: "flex", gap: 28, padding: 16 }}>
                  <div><div className="eyebrow">Chargers</div><div style={{ fontSize: 28, fontWeight: 600 }}><Num value={totalChargers} /></div></div>
                  <div><div className="eyebrow">Total capacity</div><div style={{ fontSize: 28, fontWeight: 600 }}><Num value={totalKw} decimals={0} suffix=" kW" /></div></div></div></>)}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <Button variant="ghost" onClick={back} disabled={step === 0 || saving}><ArrowLeft size={16} />Back</Button>
              <Button variant="primary" magnetic loading={saving} onClick={next}>{step === steps.length - 1 ? "Finish setup" : "Continue"}<ArrowRight size={16} /></Button>
            </div>
          </>)}
        </div>
      </main>
    </div>
  );
}
```

### 9.4 `app/onboarding/page.tsx`
```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/torque/primitives";
import { Wizard } from "@/components/torque/onboarding/Wizard";
import { useMe } from "@/lib/api";

export default function OnboardingPage() {
  const { me, loading, refresh } = useMe();
  const router = useRouter();
  useEffect(() => { if (me?.onboarded) router.replace(me.role === "DRIVER" ? "/map" : "/station"); }, [me, router]);
  if (loading || !me) return <div style={{ padding: 40, display: "grid", gap: 14, maxWidth: 720, margin: "0 auto" }}><Skeleton h={40} w={260} /><Skeleton h={10} /><Skeleton h={320} /></div>;
  return <Wizard key={me.role} me={me} onRoleChanged={refresh} />;
}
```

---

# PAGE 3 — STATION (OPERATOR PANEL, the Torque "Floor" view for EV)

**Mapping from Torque → EVspark:** garage *bays* → **charger bays**, kanban of jobs → **Waiting → Charging → Completed** lanes with step buttons, techs/stock widgets → **utilization ring + power gauge + revenue bars**, activity feed → **station activity**, job drawer → **charger drawer**, "new job" → **walk-in vehicle**.

**Layout (top → bottom):**
1. Split-letter title **"Station"** (+ station name eyebrow, Live/Reconnecting pill, Demo pill) and magnetic buttons `Add walk-in` · `Refresh`.
2. **Stat strip** (4 cards, counting numbers): Revenue today ₹ (ticks every second) · Energy kWh · Utilization % · Avg wait min.
3. **Charger bays** grid: illustrated bay card per charger. A car drives in when charging starts, cable animates, bar fills to 100%, ETA + ₹ tick live. Free bay = dashed empty bay + "Start next". Maintenance = amber hatch.
4. **Queue lanes** (Waiting → Charging → Completed) with step buttons. Every step shows a toast with **Undo (7 s)**.
5. Widgets row: **Utilization ring · Power gauge · Revenue bars (12 h)**.
6. **Activity feed**.
7. Drawers: **Walk-in** and **Charger details** (price, maintenance switch).

**Live data rule:** the page loads one snapshot (`GET /api/operator/station`), then Socket.io events patch it. Progress/ETA/₹ are **computed on the client every second from timestamps** (`startedAt`, `plannedDurationMs`) so the UI never waits for the server to look alive. A 20 s poll self-heals missed events. Server clock offset is applied.

### 10.1 `components/torque/station/types.ts`
```ts
export type ChargerStatus = "AVAILABLE" | "CHARGING" | "MAINTENANCE" | "OFFLINE";
export type SessionStatus = "QUEUED" | "CHARGING" | "COMPLETED" | "CANCELLED";
export interface ChargerDTO { id: string; label: string; connector: string; powerKw: number; pricePerKwh: number; status: ChargerStatus; }
export interface SessionDTO {
  id: string; chargerId: string | null; vehicleLabel: string; plate: string; batteryKwh: number;
  socStart: number; socTarget: number; powerKw: number; pricePerKwh: number; status: SessionStatus;
  source: "WALKIN" | "APP" | "DEMO"; queuedAt: string; startedAt: string | null; endedAt: string | null;
  plannedDurationMs: number | null; energyKwh: number; amount: number;
}
export interface ActivityDTO { id: string; kind: string; message: string; createdAt: string; tone: "ok" | "info" | "warn" | "bad"; }
export interface StatsDTO { sessionsToday: number; avgWaitMin: number; hourlyRevenue: number[]; }
export interface StationSnapshot {
  station: { id: string; name: string; address: string; isDemo: boolean; open24h: boolean };
  chargers: ChargerDTO[]; sessions: SessionDTO[]; stats: StatsDTO; activity: ActivityDTO[]; serverTime: string;
}
```

### 10.2 `components/torque/station/liveMath.ts`
```ts
import type { SessionDTO } from "./types";
type Need = Pick<SessionDTO, "batteryKwh" | "socStart" | "socTarget">;
export const needKwh = (s: Need) => (s.batteryKwh * (s.socTarget - s.socStart)) / 100;
export function progressOf(s: SessionDTO, now: number): number {
  if (s.status === "COMPLETED") return 1;
  if (s.status !== "CHARGING" || !s.startedAt || !s.plannedDurationMs) return 0;
  return Math.max(0, Math.min(1, (now - Date.parse(s.startedAt)) / s.plannedDurationMs));
}
export const liveKwh = (s: SessionDTO, now: number) => (s.status === "COMPLETED" ? s.energyKwh : needKwh(s) * progressOf(s, now));
export const liveAmount = (s: SessionDTO, now: number) => (s.status === "COMPLETED" ? s.amount : liveKwh(s, now) * s.pricePerKwh);
export const socNow = (s: SessionDTO, now: number) => s.socStart + (s.socTarget - s.socStart) * progressOf(s, now);
export const etaMs = (s: SessionDTO, now: number) =>
  s.status === "CHARGING" && s.startedAt && s.plannedDurationMs ? Math.max(0, Date.parse(s.startedAt) + s.plannedDurationMs - now) : 0;
export function fmtDuration(ms: number) {
  const t = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
export const inr = (n: number, d = 0) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`;
};
```

### 10.3 `components/torque/station/useStationLive.ts`
```ts
"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";
import { API_URL, useApi } from "@/lib/api";
import type { ActivityDTO, ChargerDTO, SessionDTO, StationSnapshot, StatsDTO } from "./types";

type Action =
  | { t: "snapshot"; snap: StationSnapshot } | { t: "session"; s: SessionDTO } | { t: "charger"; c: ChargerDTO }
  | { t: "stats"; stats: StatsDTO } | { t: "activity"; a: ActivityDTO };

function reducer(state: StationSnapshot | null, a: Action): StationSnapshot | null {
  if (a.t === "snapshot") return a.snap;
  if (!state) return state;
  switch (a.t) {
    case "session": {
      const has = state.sessions.some((x) => x.id === a.s.id);
      return { ...state, sessions: has ? state.sessions.map((x) => (x.id === a.s.id ? a.s : x)) : [a.s, ...state.sessions] };
    }
    case "charger": return { ...state, chargers: state.chargers.map((c) => (c.id === a.c.id ? a.c : c)) };
    case "stats": return { ...state, stats: a.stats };
    case "activity": return { ...state, activity: [a.a, ...state.activity.filter((x) => x.id !== a.a.id)].slice(0, 40) };
  }
}

export function useStationLive() {
  const api = useApi();
  const { getToken, isSignedIn } = useAuth();
  const [snap, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api<StationSnapshot>("/api/operator/station");
      setOffset(Date.parse(s.serverTime) - Date.now());
      dispatch({ t: "snapshot", snap: s });
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { if (isSignedIn) void load(); }, [isSignedIn, load]);
  useEffect(() => { const id = setInterval(() => void load(), 20000); return () => clearInterval(id); }, [load]);

  useEffect(() => {
    if (!isSignedIn) return;
    const sock = io(`${API_URL}/operator`, {
      transports: ["websocket"],
      auth: (cb) => { void getToken().then((token) => cb({ token })); }, // fresh Clerk token on every (re)connect
    });
    sock.on("connect", () => setLive(true));
    sock.on("disconnect", () => setLive(false));
    sock.on("session:upsert", (s: SessionDTO) => dispatch({ t: "session", s }));
    sock.on("charger:upsert", (c: ChargerDTO) => dispatch({ t: "charger", c }));
    sock.on("stats:update", (stats: StatsDTO) => dispatch({ t: "stats", stats }));
    sock.on("activity:new", (a: ActivityDTO) => dispatch({ t: "activity", a }));
    sock.on("snapshot:invalidate", () => void load());
    return () => { sock.disconnect(); };
  }, [isSignedIn, getToken, load]);

  return { snap, loading, error, offset, live, reload: load };
}
```

### 10.4 `components/torque/station/BayCard.tsx` — the illustrated bay
```tsx
"use client";
import { useEffect, useRef } from "react";
import { CaretRight, Wrench } from "@phosphor-icons/react";
import { Bar, EASE, Num, prefersReduced } from "../motion";
import { Button, Pill } from "../primitives";
import { etaMs, fmtDuration, liveAmount, liveKwh, progressOf, socNow } from "./liveMath";
import type { ChargerDTO, SessionDTO } from "./types";

const COLORS = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#14b8a6", "#f59e0b", "#84cc16"];
const hash = (s: string) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);

export function BayCard({ charger, session, now, waiting, busy, onComplete, onStartNext, onOpen }: {
  charger: ChargerDTO; session?: SessionDTO; now: number; waiting: number; busy: boolean;
  onComplete: (id: string) => void; onStartNext: () => void; onOpen: () => void;
}) {
  const car = useRef<SVGGElement>(null);
  const had = useRef(false);
  const charging = charger.status === "CHARGING" && !!session;
  const p = session ? progressOf(session, now) : 0;
  const ready = charging && p >= 1;
  const color = session ? COLORS[hash(session.plate) % COLORS.length] : "#94a3b8";

  useEffect(() => { // car drives in / out
    const el = car.current;
    if (!el) return;
    if (!prefersReduced()) {
      if (charging && !had.current) el.animate([{ transform: "translateX(150px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 900, easing: EASE });
      if (!charging && had.current) el.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(150px)", opacity: 0 }], { duration: 600, easing: EASE });
    }
    had.current = charging;
  }, [charging]);

  const statusPill = charger.status === "CHARGING" ? (ready ? <Pill c="ok" dot>Fully charged</Pill> : <Pill c="teal" dot>Charging</Pill>)
    : charger.status === "AVAILABLE" ? <Pill c="lime" dot>Free</Pill>
    : charger.status === "MAINTENANCE" ? <Pill c="amber" dot>Maintenance</Pill> : <Pill c="slate" dot>Offline</Pill>;

  return (
    <div className="card bay" data-state={charger.status} data-reveal>
      <div className="bay-top">
        <div><strong style={{ fontSize: 17, letterSpacing: "-.03em" }}>{charger.label}</strong>
          <div className="muted num" style={{ fontSize: 12, marginTop: 2 }}>{charger.connector.replace("_", "-")} · {charger.powerKw} kW · ₹{charger.pricePerKwh}/kWh</div></div>
        {statusPill}
      </div>

      <div className="bay-art">
        <svg className="bay-svg" viewBox="0 0 240 130" role="img" aria-label={`${charger.label} ${charger.status}`}>
          <rect x="0" y="109" width="240" height="2" fill="var(--line-strong)" />
          <rect x="88" y="66" width="140" height="43" rx="10" fill="none" stroke="var(--line-strong)" strokeDasharray="5 6" />
          <rect x="16" y="30" width="36" height="79" rx="11" fill="var(--ink)" />
          <rect x="22" y="38" width="24" height="17" rx="5" fill={charging ? "var(--teal)" : "var(--ink-3)"} />
          <path d="M35 64 l-7 11 h6 l-3 10 10-13 h-6 l3-8z" fill="var(--pill)" className={charging && !ready ? "pulse" : ""} />
          <path d="M52 86 C 70 86 78 92 98 90" stroke="var(--ink)" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={charging ? 1 : 0.35} />
          {charging && !ready && <path d="M52 86 C 70 86 78 92 98 90" stroke="var(--pill)" strokeWidth="2" fill="none" strokeLinecap="round" className="cable-flow" />}
          <g ref={car} style={{ opacity: charging ? 1 : 0 }}>
            <rect x="96" y="80" width="130" height="24" rx="9" fill={color} />
            <path d="M120 80 L134 62 Q137 58 142 58 H184 Q189 58 192 62 L206 80 Z" fill={color} />
            <path d="M130 78 L140 64 H160 V78 Z" fill="#fff" opacity=".78" />
            <path d="M166 64 H184 L196 78 H166 Z" fill="#fff" opacity=".78" />
            <circle cx="122" cy="104" r="9" fill="var(--ink)" /><circle cx="122" cy="104" r="4" fill="#cbd5e1" />
            <circle cx="200" cy="104" r="9" fill="var(--ink)" /><circle cx="200" cy="104" r="4" fill="#cbd5e1" />
          </g>
        </svg>
      </div>

      {charging && session && (<>
        <div className="bay-row"><strong style={{ fontSize: 14.5 }}>{session.vehicleLabel}</strong><span className="muted num">{session.plate}</span></div>
        <Bar value={p} color={ready ? "var(--ok)" : "var(--teal)"} />
        <div className="bay-row">
          <span className="num"><Num value={Math.round(socNow(session, now))} suffix="%" duration={1000} /> battery</span>
          <span className="num muted">{ready ? "Ready" : `ETA ${fmtDuration(etaMs(session, now))}`}</span>
        </div>
        <div className="bay-row">
          <span className="num"><Num value={liveKwh(session, now)} decimals={2} suffix=" kWh" duration={1000} /></span>
          <strong className="num" style={{ fontSize: 17 }}><Num value={liveAmount(session, now)} decimals={2} prefix="₹" duration={1000} /></strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant={ready ? "primary" : "default"} size="sm" loading={busy} onClick={() => onComplete(session.id)} style={{ flex: 1 }}>{ready ? "Complete & bill" : "Complete early"}</Button>
          <Button size="sm" aria-label="Details" onClick={onOpen}><CaretRight size={16} /></Button>
        </div>
      </>)}

      {charger.status === "AVAILABLE" && (<>
        <div className="empty" style={{ padding: "6px 0" }}>{waiting > 0 ? `${waiting} vehicle${waiting > 1 ? "s" : ""} waiting` : "Free — waiting for a vehicle"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" variant="primary" disabled={waiting === 0} onClick={onStartNext} style={{ flex: 1 }}>Start next in queue</Button>
          <Button size="sm" aria-label="Details" onClick={onOpen}><CaretRight size={16} /></Button>
        </div>
      </>)}

      {(charger.status === "MAINTENANCE" || charger.status === "OFFLINE") && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span className="sub" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Wrench size={16} />Out of service</span>
          <Button size="sm" onClick={onOpen}>Manage</Button>
        </div>)}
    </div>
  );
}
```

### 10.5 `components/torque/station/Lanes.tsx`
```tsx
"use client";
import { ArrowRight, Check, X } from "@phosphor-icons/react";
import { Num } from "../motion";
import { Button, EmptyState, Pill } from "../primitives";
import { fmtDuration, inr, progressOf } from "./liveMath";
import type { ChargerDTO, SessionDTO } from "./types";

type To = "CHARGING" | "COMPLETED" | "CANCELLED";

function KCard({ s, now, children }: { s: SessionDTO; now: number; children?: React.ReactNode }) {
  return (
    <div className="kcard" data-reveal>
      <div className="kcard-r"><strong style={{ fontSize: 14 }}>{s.vehicleLabel}</strong><span className="muted num" style={{ fontSize: 12 }}>{s.plate}</span></div>
      <div className="kcard-r" style={{ fontSize: 12.5 }}>
        <span className="sub num">{s.socStart}% → {s.socTarget}% · {s.batteryKwh} kWh</span>
        {s.source === "DEMO" && <Pill c="violet">Demo</Pill>}
      </div>
      {children}
    </div>
  );
}

export function Lanes({ sessions, chargers, now, busyId, onStep }: {
  sessions: SessionDTO[]; chargers: ChargerDTO[]; now: number; busyId: string | null; onStep: (id: string, to: To) => void;
}) {
  const waiting = sessions.filter((s) => s.status === "QUEUED").sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt));
  const charging = sessions.filter((s) => s.status === "CHARGING");
  const done = sessions.filter((s) => s.status === "COMPLETED").sort((a, b) => Date.parse(b.endedAt ?? "0") - Date.parse(a.endedAt ?? "0")).slice(0, 8);
  const hasFree = chargers.some((c) => c.status === "AVAILABLE");
  return (
    <div className="lanes">
      <div className="lane">
        <div className="lane-h"><span>Waiting</span><Pill c="amber"><Num value={waiting.length} /></Pill></div>
        {waiting.length === 0 && <EmptyState title="Queue is empty" body="Vehicles that arrive show up here." />}
        {waiting.map((s) => (
          <KCard key={s.id} s={s} now={now}>
            <div className="kcard-r"><span className="num sub" style={{ fontSize: 12.5 }}>Waited {fmtDuration(now - Date.parse(s.queuedAt))}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" variant="ghost" aria-label="Remove from queue" onClick={() => onStep(s.id, "CANCELLED")}><X size={14} /></Button>
                <Button size="sm" variant="primary" loading={busyId === s.id} disabled={!hasFree} title={hasFree ? "Start charging" : "No free bay"} onClick={() => onStep(s.id, "CHARGING")}>Start<ArrowRight size={14} /></Button>
              </div></div>
          </KCard>))}
      </div>
      <div className="lane">
        <div className="lane-h"><span>Charging</span><Pill c="teal"><Num value={charging.length} /></Pill></div>
        {charging.length === 0 && <EmptyState title="No active sessions" />}
        {charging.map((s) => (
          <KCard key={s.id} s={s} now={now}>
            <div className="kcard-r"><span className="num sub" style={{ fontSize: 12.5 }}>{Math.round(progressOf(s, now) * 100)}% · {chargers.find((c) => c.id === s.chargerId)?.label ?? "—"}</span>
              <Button size="sm" loading={busyId === s.id} onClick={() => onStep(s.id, "COMPLETED")}>Complete<Check size={14} /></Button></div>
          </KCard>))}
      </div>
      <div className="lane">
        <div className="lane-h"><span>Completed today</span><Pill c="ok"><Num value={sessions.filter((s) => s.status === "COMPLETED").length} /></Pill></div>
        {done.length === 0 && <EmptyState title="Nothing billed yet" />}
        {done.map((s) => (
          <KCard key={s.id} s={s} now={now}>
            <div className="kcard-r"><span className="num sub" style={{ fontSize: 12.5 }}>{s.energyKwh.toFixed(2)} kWh</span><strong className="num">{inr(s.amount, 2)}</strong></div>
          </KCard>))}
      </div>
    </div>
  );
}
```

### 10.6 `components/torque/station/Widgets.tsx` + `Feed.tsx`
```tsx
"use client";
import { useEffect, useRef } from "react";
import { EASE, Gauge, Num, prefersReduced, Ring } from "../motion";
import { ago } from "./liveMath";
import type { ActivityDTO } from "./types";

export function UtilizationCard({ busy, total }: { busy: number; total: number }) {
  const v = total ? busy / total : 0;
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Utilization</span><span className="eyebrow">{busy}/{total} bays</span></div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <Ring value={v} size={140} stroke={14} color="var(--teal)">
          <div><div style={{ fontSize: 30, fontWeight: 600 }}><Num value={Math.round(v * 100)} suffix="%" /></div><div className="eyebrow">in use</div></div>
        </Ring>
      </div>
    </div>
  );
}

export function PowerCard({ kw, capacityKw }: { kw: number; capacityKw: number }) {
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Power draw</span><span className="eyebrow">{Math.round(capacityKw)} kW cap</span></div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <Gauge value={capacityKw ? kw / capacityKw : 0} width={200}>
          <div><div style={{ fontSize: 28, fontWeight: 600 }}><Num value={kw} decimals={1} /></div><div className="eyebrow">kW now</div></div>
        </Gauge>
      </div>
    </div>
  );
}

export function RevenueBars({ hourly }: { hourly: number[] }) {
  const box = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...hourly);
  useEffect(() => {
    if (!box.current || prefersReduced()) return;
    box.current.querySelectorAll<HTMLElement>("i").forEach((el, i) =>
      el.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 700, delay: 40 * i, easing: EASE, fill: "backwards" }));
  }, [hourly.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Revenue · last 12 h</span><span className="eyebrow">₹ / hour</span></div>
      <div className="spark" ref={box}>{hourly.map((v, i) => <i key={i} title={`₹${Math.round(v)}`} style={{ height: `${Math.max(5, (v / max) * 100)}%` }} />)}</div>
    </div>
  );
}

const TONE: Record<ActivityDTO["tone"], string> = { ok: "var(--ok)", info: "var(--sky)", warn: "var(--amber)", bad: "var(--bad)" };
export function Feed({ items, now }: { items: ActivityDTO[]; now: number }) {
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Station activity</span><span className="eyebrow">live</span></div>
      <ul className="feed">
        {items.length === 0 && <li style={{ gridTemplateColumns: "1fr" }}><span className="muted">Activity will appear here.</span></li>}
        {items.map((a) => (<li key={a.id}><i className="dot" style={{ background: TONE[a.tone] }} /><span>{a.message}</span><span className="muted num" style={{ fontSize: 12 }}>{ago(a.createdAt, now)}</span></li>))}
      </ul>
    </div>
  );
}
```

### 10.7 `components/torque/station/WalkInDrawer.tsx`
```tsx
"use client";
import { useState } from "react";
import { Button, Drawer, Field, Input, NumberStepper } from "../primitives";
import { toast } from "../toast";
import { ApiError, useApi } from "@/lib/api";

export function WalkInDrawer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const api = useApi();
  const [f, setF] = useState({ vehicleLabel: "", plate: "", batteryKwh: 40, vehicleMaxKw: 50, socStart: 20, socTarget: 80 });
  const [err, setErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  async function submit() {
    const e: Record<string, string> = {};
    if (f.vehicleLabel.trim().length < 2) e.vehicleLabel = "Vehicle name is required";
    if (!/^[A-Za-z0-9 -]{4,14}$/.test(f.plate)) e.plate = "Enter the number plate";
    if (f.socTarget <= f.socStart) e.socTarget = "Target must be above the current charge";
    setErr(e); if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api("/api/operator/sessions", { method: "POST", body: JSON.stringify(f) });
      toast({ title: "Vehicle added", desc: "Started automatically if a bay is free.", tone: "ok" });
      onDone(); onClose();
      setF({ vehicleLabel: "", plate: "", batteryKwh: 40, vehicleMaxKw: 50, socStart: 20, socTarget: 80 });
    } catch (x) { if (x instanceof ApiError && x.fields) setErr(x.fields); toast({ title: "Couldn't add vehicle", desc: (x as Error).message, tone: "bad" }); }
    finally { setSaving(false); }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Add walk-in vehicle"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={submit}>Add to queue</Button></>}>
      <Field label="Vehicle" htmlFor="vl" error={err.vehicleLabel}><Input id="vl" invalid={!!err.vehicleLabel} value={f.vehicleLabel} onChange={(e) => setF({ ...f, vehicleLabel: e.target.value })} placeholder="Tata Nexon EV" /></Field>
      <Field label="Number plate" htmlFor="pl" error={err.plate}><Input id="pl" invalid={!!err.plate} value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value.toUpperCase() })} placeholder="MH 02 AB 1234" /></Field>
      <Field label="Battery (kWh)"><NumberStepper value={f.batteryKwh} onChange={(v) => setF({ ...f, batteryKwh: v })} min={5} max={200} step={0.5} decimals={1} /></Field>
      <Field label="Vehicle max charge speed (kW)"><NumberStepper value={f.vehicleMaxKw} onChange={(v) => setF({ ...f, vehicleMaxKw: v })} min={3} max={350} step={5} /></Field>
      <Field label={`Current charge: ${f.socStart}%`}><input className="range" type="range" min={1} max={95} value={f.socStart} onChange={(e) => setF({ ...f, socStart: Number(e.target.value) })} /></Field>
      <Field label={`Charge to: ${f.socTarget}%`} error={err.socTarget}><input className="range" type="range" min={5} max={100} value={f.socTarget} onChange={(e) => setF({ ...f, socTarget: Number(e.target.value) })} /></Field>
    </Drawer>
  );
}
```

### 10.8 `components/torque/station/ChargerDrawer.tsx`
```tsx
"use client";
import { useEffect, useState } from "react";
import { Button, Drawer, Field, Input, Pill, Switch } from "../primitives";
import { toast } from "../toast";
import { useApi } from "@/lib/api";
import type { ChargerDTO } from "./types";

export function ChargerDrawer({ charger, onClose, onDone }: { charger: ChargerDTO | null; onClose: () => void; onDone: () => void }) {
  const api = useApi();
  const [price, setPrice] = useState(0); const [maint, setMaint] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => { if (charger) { setPrice(charger.pricePerKwh); setMaint(charger.status === "MAINTENANCE"); } }, [charger]);
  async function save() {
    if (!charger) return;
    if (!(price >= 1 && price <= 100)) return toast({ title: "Price must be ₹1–₹100", tone: "bad" });
    setSaving(true);
    try {
      await api(`/api/operator/chargers/${charger.id}`, { method: "PATCH", body: JSON.stringify({ pricePerKwh: price, maintenance: maint }) });
      toast({ title: `${charger.label} updated`, tone: "ok" }); onDone(); onClose();
    } catch (e) { toast({ title: "Couldn't update", desc: (e as Error).message, tone: "bad" }); } finally { setSaving(false); }
  }
  return (
    <Drawer open={!!charger} onClose={onClose} title={charger?.label ?? "Charger"}
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" loading={saving} onClick={save}>Save changes</Button></>}>
      {charger && (<>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Pill c="sky">{charger.connector.replace("_", "-")}</Pill><Pill c="orange">{charger.powerKw} kW</Pill><Pill c="slate">{charger.status}</Pill></div>
        <Field label="Price per kWh (₹)" hint="Applies to new sessions only"><Input type="number" step="any" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
        <Switch checked={maint} onChange={setMaint} label="Maintenance mode (out of service)" />
        {charger.status === "CHARGING" && <span className="hint">A vehicle is charging — complete the session before enabling maintenance.</span>}
      </>)}
    </Drawer>
  );
}
```

### 10.9 `app/(operator)/station/page.tsx` — assemble
```tsx
"use client";
import { useMemo, useState } from "react";
import { Plus, ArrowsClockwise, PlugsConnected } from "@phosphor-icons/react";
import { Num, SplitTitle, useNow, useReveal } from "@/components/torque/motion";
import { Button, EmptyState, Pill, Skeleton } from "@/components/torque/primitives";
import { toast } from "@/components/torque/toast";
import { useApi } from "@/lib/api";
import { useStationLive } from "@/components/torque/station/useStationLive";
import { liveAmount, liveKwh, progressOf } from "@/components/torque/station/liveMath";
import { BayCard } from "@/components/torque/station/BayCard";
import { Lanes } from "@/components/torque/station/Lanes";
import { Feed, PowerCard, RevenueBars, UtilizationCard } from "@/components/torque/station/Widgets";
import { WalkInDrawer } from "@/components/torque/station/WalkInDrawer";
import { ChargerDrawer } from "@/components/torque/station/ChargerDrawer";

type To = "CHARGING" | "COMPLETED" | "CANCELLED";

export default function StationPage() {
  const api = useApi();
  const { snap, loading, error, offset, live, reload } = useStationLive();
  const now = useNow(1000, offset);
  const [busy, setBusy] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const root = useReveal<HTMLDivElement>([!!snap]);

  const d = useMemo(() => {
    if (!snap) return null;
    const sessions = snap.sessions.filter((s) => s.status !== "CANCELLED");
    const charging = sessions.filter((s) => s.status === "CHARGING");
    const byCharger = new Map(charging.filter((s) => s.chargerId).map((s) => [s.chargerId as string, s]));
    const usable = snap.chargers.filter((c) => c.status === "AVAILABLE" || c.status === "CHARGING");
    return { sessions, charging, byCharger, usable, waiting: sessions.filter((s) => s.status === "QUEUED").length };
  }, [snap]);

  async function step(id: string, to: To) {
    setBusy(id);
    try {
      const r = await api<{ undoToken: string | null }>(`/api/operator/sessions/${id}/advance`, { method: "POST", body: JSON.stringify({ to }) });
      toast({
        title: to === "CHARGING" ? "Charging started" : to === "COMPLETED" ? "Session completed & billed" : "Removed from queue", tone: "ok",
        undo: r.undoToken ? async () => {
          try { await api(`/api/operator/sessions/${id}/undo`, { method: "POST" }); void reload(); }
          catch (e) { toast({ title: "Can't undo", desc: (e as Error).message, tone: "bad" }); }
        } : undefined,
      });
      void reload();
    } catch (e) { toast({ title: "Action failed", desc: (e as Error).message, tone: "bad" }); } finally { setBusy(null); }
  }
  async function startNext() {
    if (!snap) return;
    const first = snap.sessions.filter((s) => s.status === "QUEUED").sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt))[0];
    if (first) await step(first.id, "CHARGING");
  }

  if (loading) return <div style={{ display: "grid", gap: 14 }}><Skeleton h={64} w={300} /><Skeleton h={110} /><Skeleton h={300} /></div>;
  if (error || !snap || !d) return <div className="card"><EmptyState icon={<PlugsConnected size={32} />} title="Couldn't load your station" body={error ?? "No station found for your account."} action={<Button onClick={() => void reload()}>Retry</Button>} /></div>;

  const revenue = d.sessions.filter((s) => s.status === "COMPLETED" || s.status === "CHARGING").reduce((a, s) => a + liveAmount(s, now), 0);
  const energy = d.sessions.filter((s) => s.status === "COMPLETED" || s.status === "CHARGING").reduce((a, s) => a + liveKwh(s, now), 0);
  const busyBays = d.usable.filter((c) => c.status === "CHARGING").length;
  const kwNow = d.charging.reduce((a, s) => a + (progressOf(s, now) < 1 ? s.powerKw : 0), 0);
  const capacity = snap.chargers.reduce((a, c) => a + c.powerKw, 0);
  const openCharger = snap.chargers.find((c) => c.id === openId) ?? null;

  return (
    <div ref={root}>
      <div className="page-head">
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }} data-reveal>
            <span className="eyebrow">{snap.station.name}</span>
            <Pill c={live ? "ok" : "amber"} dot>{live ? "Live" : "Reconnecting"}</Pill>
            {snap.station.isDemo && <Pill c="violet">Demo data</Pill>}
          </div>
          <SplitTitle text="Station" />
        </div>
        <div className="page-actions" data-reveal>
          <Button magnetic onClick={() => void reload()}><ArrowsClockwise size={16} />Refresh</Button>
          <Button variant="primary" magnetic onClick={() => setWalkIn(true)}><Plus size={16} weight="bold" />Add walk-in</Button>
        </div>
      </div>

      <div className="stats">
        <div className="card" data-reveal><div className="stat-k">Revenue today</div><div className="stat-v"><Num value={revenue} decimals={2} prefix="₹" duration={1000} /></div><div className="stat-f"><Num value={snap.stats.sessionsToday} /> sessions</div></div>
        <div className="card" data-reveal><div className="stat-k">Energy delivered</div><div className="stat-v"><Num value={energy} decimals={1} suffix=" kWh" duration={1000} /></div><div className="stat-f">across all bays</div></div>
        <div className="card" data-reveal><div className="stat-k">Utilization</div><div className="stat-v"><Num value={d.usable.length ? Math.round((busyBays / d.usable.length) * 100) : 0} suffix="%" /></div><div className="stat-f">{busyBays} of {d.usable.length} bays in use</div></div>
        <div className="card" data-reveal><div className="stat-k">Avg wait</div><div className="stat-v"><Num value={snap.stats.avgWaitMin} decimals={1} suffix=" min" /></div><div className="stat-f"><Num value={d.waiting} /> waiting now</div></div>
      </div>

      <div className="card-h" style={{ margin: "22px 4px 12px" }} data-reveal><h2 style={{ fontSize: 22 }}>Charger bays</h2><span className="eyebrow">{snap.chargers.length} bays</span></div>
      {snap.chargers.length === 0 ? <div className="card"><EmptyState title="No chargers yet" body="Add chargers from the Chargers page." /></div> : (
        <div className="bays">
          {snap.chargers.map((c) => (
            <BayCard key={c.id} charger={c} session={d.byCharger.get(c.id)} now={now} waiting={d.waiting} busy={busy === d.byCharger.get(c.id)?.id}
              onComplete={(id) => step(id, "COMPLETED")} onStartNext={startNext} onOpen={() => setOpenId(c.id)} />
          ))}
        </div>)}

      <div className="card-h" style={{ margin: "26px 4px 12px" }} data-reveal><h2 style={{ fontSize: 22 }}>Queue</h2><span className="eyebrow">Waiting → Charging → Done</span></div>
      <Lanes sessions={d.sessions} chargers={snap.chargers} now={now} busyId={busy} onStep={step} />

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", margin: "14px 0" }}>
        <UtilizationCard busy={busyBays} total={d.usable.length} />
        <PowerCard kw={kwNow} capacityKw={capacity} />
        <RevenueBars hourly={snap.stats.hourlyRevenue} />
      </div>
      <Feed items={snap.activity} now={now} />

      <WalkInDrawer open={walkIn} onClose={() => setWalkIn(false)} onDone={() => void reload()} />
      <ChargerDrawer charger={openCharger} onClose={() => setOpenId(null)} onDone={() => void reload()} />
    </div>
  );
}
```
**Animation checklist for this page (must all be visible):** split-letter title · staggered card reveal · counting stat numbers · car drives in/out of the bay · cable flow loop · bar + % + ETA + ₹ ticking each second · ring and gauge sweep · revenue bars grow · drawer slide (sheet on mobile) · toast with undo countdown · sliding nav pill · magnetic buttons.

