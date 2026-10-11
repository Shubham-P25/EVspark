# EVspark — Frontend Audit (`docs/FRONTEND_AUDIT.md`)

Audited from source code and runtime behavior across routes `/`, `/operator`, `/journey`, `/admin`, and `/register` (and `/login`, `/auth/onboarding`) as specified in Phase F0 task `F0.1`.

---

## 1. Typecheck Results

Command:
```bash
pnpm --filter web typecheck
```
Output:
```
$ tsc --noEmit
(0 errors, exited with code 0)
```
Status: Passes TypeScript compilation with 0 compile-time errors. All issues are runtime / architectural / hydration / styling bugs.

---

## 2. Verbatim Console, Overlay, and Hydration Issues

### Issue 1: Hydration Mismatch via Client-Only `localStorage` in Global State
- **File & Lines**: [`apps/web/src/lib/auth-store.ts:26-50`](file:///d:/EVspark/apps/web/src/lib/auth-store.ts#L26-L50)
- **Code**:
  ```ts
  function getInitialState(): { token: string | null; user: AuthUser | null } {
    if (typeof window === "undefined") {
      return { token: null, user: null };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      token: "mock-dev-token",
      user: {
        id: "usr_mock_driver_1",
        email: "driver@evspark.local",
        name: "Aarav Sharma",
        role: "DRIVER",
        vehicleModelName: "Tata Nexon EV Max",
      },
    };
  }
  ```
- **Error / Symptom**: Next.js hydration error:
  `Hydration failed because the server-rendered HTML didn't match the client. As a result this tree will be regenerated on the client.`
- **Cause**: On the server `getInitialState()` evaluates to `{ token: null, user: null }` (rendering signed-out UI / login triggers), whereas on the client it synchronously initializes to mock driver "Aarav Sharma" or reads from `localStorage` during initial render.

---

### Issue 2: Direct Client Mutation of `<html>` Class without `suppressHydrationWarning`
- **File & Lines**:
  - [`apps/web/src/app/layout.tsx:16-26`](file:///d:/EVspark/apps/web/src/app/layout.tsx#L16-L26)
  - [`apps/web/src/components/layout/Navbar.tsx:17-27`](file:///d:/EVspark/apps/web/src/components/layout/Navbar.tsx#L17-L27)
- **Code**:
  In `layout.tsx`:
  ```tsx
  export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#0B0F17' };
  export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
      <html lang="en" className={cn("dark bg-[#0B0F17]", "font-sans", figtree.variable)}>
  ```
  In `Navbar.tsx`:
  ```tsx
  useEffect(() => {
    const savedTheme = localStorage.getItem("evspark-theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);
  ```
- **Error / Symptom**: Hydration warning / flash of mismatched theme classes on `<html>`. Next.js overlay warns about DOM attribute mismatches on `<html>` tag because client dynamically alters `classList` post-mount without `suppressHydrationWarning`.

---

### Issue 3: Missing `"use client"` in Components with Interactive Handlers
- **File & Lines**:
  - [`apps/web/src/components/ui/Toggle.tsx:1-7`](file:///d:/EVspark/apps/web/src/components/ui/Toggle.tsx#L1-L7)
  - [`apps/web/src/components/ui/role-guard.tsx:1-3`](file:///d:/EVspark/apps/web/src/components/ui/role-guard.tsx#L1-L3)
  - [`apps/web/src/components/auth/auth-submit.tsx:1`](file:///d:/EVspark/apps/web/src/components/auth/auth-submit.tsx#L1)
- **Code**:
  `Toggle.tsx`:
  ```tsx
  export function Toggle({ status, onChange }: { status: ChargerStatus; onChange: (status: ChargerStatus) => void }) {
    return <button type="button" onClick={() => onChange(next[status])} ... />
  }
  ```
  `role-guard.tsx`:
  ```tsx
  export function RoleGuard({ active, onChange }: { active: string; onChange: (role: string) => void }) {
    return <div className="role-tabs">{... <button onClick={() => onChange(role)}> ...}</div>
  }
  ```
  `auth-submit.tsx`:
  ```tsx
  export function AuthSubmit({ children, onClick, disabled = false }: ...) {
    return <button type="button" className="auth-submit" onClick={onClick} disabled={disabled}>{children}</button>
  }
  ```
- **Error / Symptom**: React server component error when rendered without client boundary:
  `Event handlers cannot be passed to Client Component props. If you need interactivity, consider converting part of this to a Client Component.`

---

### Issue 4: Google Maps Missing Key & Fallback Loading Flicker
- **File & Lines**: [`apps/web/src/components/map/StationMap.tsx:63-67`](file:///d:/EVspark/apps/web/src/components/map/StationMap.tsx#L63-L67)
- **Code**:
  ```ts
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
  if (!apiKey || apiKey === "mock") {
    setMapError(true);
    return;
  }
  ```
- **Error / Symptom**: When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset or blank, `StationMap` sets `mapError(true)` and displays an inline static fallback grid. Also in `page.tsx`:
  `StationMap` is lazy loaded with `{ ssr: false, loading: () => <div ...>Loading Maharashtra Map Grid...</div> }`, causing a black flash/flicker (`#0B0F17`) before error resolution.

---

### Issue 5: Hardcoded Remote Auth Endpoint Fallback
- **File & Lines**: [`apps/web/src/lib/neon-auth.ts:3`](file:///d:/EVspark/apps/web/src/lib/neon-auth.ts#L3)
- **Code**:
  ```ts
  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL || process.env.NEON_AUTH_BASE_URL || 'https://ep-lucky-pond-az0mvcxc.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth'
  ```
- **Error / Symptom**: If environment variables are missing, client hits an external third-party AWS Neon auth instance (`https://ep-lucky-pond-az0mvcxc...`), which fails CORS or returns network 401/404 errors during sign-in/sign-up.

---

### Issue 6: Fabricated Data and Hardcoded Constants on `/operator`
- **File & Lines**: [`apps/web/src/app/operator/page.tsx:45-70`](file:///d:/EVspark/apps/web/src/app/operator/page.tsx#L45-L70)
- **Code**:
  ```ts
  const occupancyPct = chargers.length > 0 ? Math.round((busyCount / chargers.length) * 100) : 62;
  const avgWaitMin = activeStation?.waitMinutes || 8;
  const revenueToday = revenueData?.summary?.totalRevenue || 14250;
  // Fallback fake queue
  const queueEntries = activeStation?.queueEntries || [
    { id: "q1", vehicleRef: "MH 12 RN 4021", vehicleModelId: "Tata Nexon EV", ... },
    { id: "q2", vehicleRef: "MH 14 AB 9981", vehicleModelId: "MG ZS EV", ... }
  ];
  // Fallback fake sessions
  const stationSessions = liveSessions.length > 0 ? ... : [
    { id: "s-1", driver: { name: "Aditya Verma" }, charger: { label: "Bay #1 (CCS2)", powerKw: 60 }, ... },
    { id: "s-2", driver: { name: "Priya Shinde" }, ... }
  ];
  ```
- **Error / Symptom**: Operator dashboard renders fabricated static constants (`|| 62`, `|| 8`, `|| 14250`) and fake hardcoded vehicle queues/sessions rather than live real-time API/WebSocket streams.

---

### Issue 7: Incomplete Route Planner Integration on `/journey`
- **File & Lines**: [`apps/web/src/app/journey/page.tsx:50-65`](file:///d:/EVspark/apps/web/src/app/journey/page.tsx#L50-L65)
- **Code**:
  Uses hardcoded `PRESET_CITIES` dropdowns and requests `/journeys/plan`, but the results panel does not integrate with live map navigation, in-map waypoints, or interactive along-route station discovery.

---

### Issue 8: Redundant Navigation & Dev Role Bypass on All Routes
- **File & Lines**:
  - Mounted by `app/page.tsx:5`
  - Mounted by `operator/page.tsx:5`
  - Mounted by `journey/page.tsx:4`
  - Mounted by `admin/page.tsx:4`
- **Code**:
  `Navbar.tsx` includes a global role selector dropdown (`setRole`) allowing instant bypass between `DRIVER`, `OPERATOR`, and `ADMIN` without authentication guards.
