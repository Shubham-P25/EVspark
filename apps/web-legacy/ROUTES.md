# Canonical Web Routes (`apps/web/ROUTES.md`)

This document defines the canonical URL routes for the EVspark frontend application and maps legacy duplicate route folders to the target structure to guide Phase 6 (Frontend Rebuild).

## Route Mapping Overview

| Canonical Route | Target Route Group / Path | Purpose | Legacy Folders / Sources |
|---|---|---|---|
| `/` | `src/app/(marketing)/page.tsx` | Public Landing Page (Light theme, hero video, stats ticker, bento grid, India pricing) | `src/app/page.tsx` |
| `/login` | `src/app/(auth)/login/page.tsx` | Neon Auth Login | `src/app/(auth)/login/`, `src/app/auth/login/` |
| `/register` | `src/app/(auth)/register/page.tsx` | Neon Auth Registration | `src/app/(auth)/register/`, `src/app/auth/register/` |
| `/onboarding` | `src/app/(auth)/onboarding/page.tsx` | 2-Step Role Selection (Driver vs Station Owner) | `src/app/auth/onboarding/` |
| `/driver` | `src/app/(dashboard)/driver/page.tsx` | Driver Dashboard & Interactive Map (Google Maps, recommendations, bookings, eco impact) | `src/app/driver/`, `src/app/dashboard/driver/` |
| `/station` | `src/app/(dashboard)/station/page.tsx` | Station Operator Dashboard (Charger grid, live queue, hourly revenue, overload alerts) | `src/app/operator/`, `src/app/dashboard/operator/` |
| `/admin` | `src/app/(dashboard)/admin/page.tsx` | Superadmin Dashboard (Approvals, user/station management, digital twin sim controls) | `src/app/admin/`, `src/app/dashboard/admin/` |

## Sub-Routes & Sections

### 1. Driver (`/driver`)
- `/driver` (Default view: EvMap with station search, nearby filters, and live station sheet)
- `/driver/bookings` (Active reservations, queue token status)
- `/driver/favorites` (Saved stations)
- `/driver/history` (Charging sessions, kWh billed, ₹ paid)
- `/driver/vehicles` (Vehicle model specs, SoC tracking)
- `/driver/journey` (A→B route planner with charging stops)

### 2. Station Operator (`/station` — formerly `/operator`)
- `/station` (Overview: live charger status cards, active queue entries, daily revenue)
- `/station/chargers` (Charger management, OCPP status, manual toggle)
- `/station/queue` (Real-time queue management & promotion)
- `/station/analytics` (Recharts: occupancy curves, revenue, forecast comparison)
- `/station/settings` (Pricing ₹/kWh, operating hours, Cloudinary photos)

### 3. Admin (`/admin`)
- `/admin` (Overview metrics & system readiness)
- `/admin/approvals` (Pending station verification & activation)
- `/admin/stations` (Station list & charger inventory)
- `/admin/users` (User directory & role permissions)
- `/admin/sim` (Digital Twin controls: speed, arrivals/min, surge multipliers)
- `/admin/health` (Readiness check: PostgreSQL, Redis, queue worker status)

## Migration Guidelines for Phase 6
- Keep legacy source files under `apps/web/_legacy/src` during transition until replacements are operational.
- Eliminate all duplicate route folders (`apps/web/src/app/auth`, `apps/web/src/app/dashboard/*`, `apps/web/src/app/operator`).
- Replace `RoleGuard` tab-switcher with Next.js middleware and server-side RBAC guards.
