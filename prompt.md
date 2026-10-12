# EVspark: Frontend UI Redesign Brief (LIGHT THEME ONLY)

You already have my full project. This is a **frontend-only visual and UX upgrade**. Read the existing codebase first, then redesign the pages listed below.

---

## 0. HARD RULES (read first)

1. **LIGHT THEME ONLY.** Do not create, keep, or reference any dark mode: no `dark:` classes, no theme toggle, no `prefers-color-scheme: dark`, no dark backgrounds on pages or sections. Remove existing dark-mode code if present. Every surface is white or soft off-white.
2. **Do NOT touch backend, API routes, data fetching, auth logic, state management, or database code.** Only change presentation, layout, components, styling, and animation. Keep all existing props, endpoints, form field names, and validation behavior working exactly as they do now.
3. **Keep the existing stack.** Detect what the project uses (Next.js, Tailwind, shadcn/ui, the map library, etc.) and work within it. Do not swap frameworks. Add only small, well-known libraries when needed (e.g. `framer-motion`, `lucide-react`). If you use any 3D library, it must be lazy-loaded and have a graceful fallback.
4. **Do not break existing routes.** Find them in the codebase (landing `/`, `/login`, `/register`, onboarding, map, driver dashboard, and so on) and keep the same URLs.
5. **Responsive and accessible.** Everything must work from 360px mobile to 1920px desktop. Maintain WCAG AA contrast, visible focus rings, and keyboard navigation. Respect `prefers-reduced-motion` by disabling heavy animation and showing static versions.
6. **No broken or hot-linked images.** Do not depend on random external image URLs. Use local assets in `/public`, generated SVG, or CSS/gradient art.

---

## 1. Global Design System (apply everywhere)

**Brand feel:** clean, trustworthy, modern, "premium fintech meets climate-tech". Think Stripe, Linear, Tesla, and Rivian light-mode websites.

**Colors (light only):**
- Background: `#FFFFFF` and `#F7F9FC` (soft off-white sections)
- Surface/cards: white, 1px border `#E6EAF2`, soft shadow `0 8px 30px rgba(16, 40, 90, 0.06)`
- Primary: electric blue `#1D6BFF` (keep current brand blue) with a gradient to `#4F8CFF`
- Accent: spark green `#16C784` (available), amber `#F5A524` (busy/short wait), red `#EF4444` (offline/long wait)
- Text: headings `#0B1220`, body `#4A5568`, muted `#8A94A6`

**Typography:** replace the current default font with a professional pairing loaded via `next/font`:
- Headings: **Plus Jakarta Sans** (or Geist), weights 600 to 800, tight letter-spacing (`-0.02em`)
- Body/UI: **Inter**, weights 400 to 600
- Define a consistent type scale (display, h1, h2, h3, body, small, caption) and use it everywhere. No random sizes.

**Shape and spacing:** 8px spacing grid, card radius 16 to 20px, input/button radius 12px. Generous whitespace.

**Motion language:** subtle and purposeful. Use `framer-motion`. Fade-up on scroll, 200 to 300ms ease-out hover transitions, springy micro-interactions on buttons and cards. Nothing flashy or slow.

**Reusable components:** create or refine shared `Button` (primary, secondary, ghost), `Input`, `Card`, `Badge`, `Stepper`, and `Section` components so every page feels consistent.

---

## 2. Landing Page (`/`): make it a "wow, I'm hooked" first impression

The layout and copy are good. **Keep the navbar, hero headline ("Find a charger without the wait."), stats row, and sections.** The problem is the **right-side hero visual**, which is a flat static card, plus the overall lack of motion and depth.

**Replace the hero right side with an interactive 3D-style showcase (light theme):**
- A floating, layered "digital twin" composition: an isometric/3D-tilted phone or dashboard mockup showing a live map with glowing charger pins, and 2 to 3 floating glass cards around it (e.g. "Hinjewadi Hub · 0 min wait", "AI Match · ETA 28 min", "Telemetry live").
- Use **CSS 3D transforms + mouse-parallax** (cards tilt and shift subtly with cursor movement, different depth layers move at different speeds). Optionally use `@react-three/fiber` for a light, soft-lit 3D EV or charger model, but only if it is lazy-loaded with a CSS fallback and stays smooth on low-end laptops.
- Add an **animated route line** (SVG path drawing itself along a stylized Pune–Mumbai corridor) with pulsing station pins appearing in sequence.
- Soft animated gradient blobs (very light blue/green tints) behind the visual, plus a faint dotted grid pattern. Keep it airy and bright.
- Live-feeling micro-animations: wait-time numbers that count or tick, a pulsing "Live" dot, bay-availability bars filling in.

**Page-wide enhancements:**
- Hero headline: animated gradient shimmer on "without the wait." and a staggered word reveal on load.
- Number counters in the stats row that count up when scrolled into view.
- "How it works": 3 to 4 steps with a connecting animated line and icons that animate on scroll.
- "Features" and "Network": bento-grid layout with hover lift and subtle tilt. In the Network section, add an animated map of Maharashtra with pulsing station dots.
- **Optional video:** if a short looping video would help, add a muted, autoplaying, looping, `playsInline` background or inline video component with a poster image and a CSS fallback. Wire it so the file path is easy to swap (`/public/media/hero-loop.mp4`). It must not block page load and must be disabled under reduced-motion.
- Sticky navbar with soft blur-glass effect on scroll (light, `bg-white/80 backdrop-blur`).
- Smooth scroll, a trust/partners strip, a polished footer, and a final CTA section with a strong gradient button.

---

## 3. Login and Sign Up (`/login`, `/register`): make them professional

Right now the screens look dull, with a plain left text panel, a bare form, and a cramped layout. Redesign both:

**Layout:** split-screen at desktop, single column on mobile.
- **Left panel (brand side):** a rich light-gradient panel (soft blue to white) with the logo, headline, and the 3 feature points. Add a floating animated visual (mini map card, charging-progress ring, or pulsing stations) so it does not feel empty. Add a short testimonial or a trust badge such as "70+ live hubs".
- **Right panel (form side):** a vertically centered card. The whole form must fit in the viewport without awkward scrolling on a standard laptop. Tighten spacing, put Username and Full name side by side on wider screens, and put email below.

**Form polish:**
- Role selector ("EV Driver" / "Station Operator") becomes a proper segmented control with an animated sliding highlight and icons.
- Inputs: floating or clean top labels (not ALL-CAPS tiny labels), leading icons, a clear focus ring in brand blue, inline validation with friendly messages, and a password strength meter.
- Primary button: full width with gradient, hover lift, and a loading spinner state.
- "or continue with" Google and GitHub buttons: consistent height, official logos, subtle border, hover state.
- Add smooth page-load animation (card fades up), a link between Login and Sign up, and "Forgot password?" on login.
- Keep all existing form fields, names, and submit handlers unchanged.

---

## 4. Onboarding Pages: rebuild as a polished multi-step wizard

Current onboarding looks like a messy raw form with inconsistent fonts and layout. Rebuild the UI (keep all existing fields, data, and submit logic):

- **Wizard layout:** centered card (max-width ~720px) on a soft gradient background, with a top **stepper/progress bar** ("Step 2 of 4") and a Back/Continue footer. Animated transitions between steps (slide + fade).
- One clear purpose per step with a friendly heading and a one-line description.
- **Selection UI instead of plain inputs wherever possible:** large selectable cards with icons for choices (vehicle type, connector type CCS2/Type 2/CHAdeMO, charging preferences, operator type), chips for multi-select, and sliders for ranges (battery %, budget).
- Vehicle step: searchable dropdown or card grid for EV make/model if the data supports it.
- Consistent labels, helper text, error states, and required-field indicators. Use the global fonts and type scale only.
- Final step: a review or summary card and a celebratory completion state (subtle confetti or check animation), then a clear CTA into the dashboard.
- Mobile: full-width, sticky bottom action bar.

---

## 5. Map Page: HIGHEST PRIORITY, put the most effort here

Markers are the core of the product. They currently look bad, and station images are not loading. Detect the map library in use (Leaflet, Mapbox GL, Google Maps, etc.) and implement the following in that library.

### 5a. Custom station markers (light, modern, status-aware)
- Replace default markers with **custom HTML/SVG markers**: a rounded teardrop or pill pin with a lightning-bolt icon.
- **Color by live status:**
  - Green = available now
  - Amber = short wait (< 10 min)
  - Red = long wait / busy
  - Grey = offline
- Each marker shows a **small label badge** (wait time like "3 min" or a free-bay count like "2/4") so users can read the map at a glance.
- **Selected marker:** scales up, gets a pulsing ring/glow, a stronger shadow, and rises above the others (z-index).
- **Hover:** gentle lift plus a mini tooltip with station name and wait time.
- **Clusters:** when zoomed out, group markers into clean cluster bubbles (white circle, blue border, count in bold) that expand on click with a smooth animation.
- Add the user's location marker (pulsing blue dot) and, when a route exists, a styled route polyline (blue with a white casing) with animated direction.
- Use a **light, clean map style** (e.g. Carto Positron / Mapbox Light / Google light, muted colors) so the markers pop.

### 5b. Station detail card (on marker click)
- A beautiful card or bottom sheet (side panel on desktop, draggable bottom sheet on mobile) with:
  - **Hero station image** at the top (see 5c), with a status badge overlaid
  - Station name, address, operator, rating
  - Live stats: wait time, free bays of total, power (kW), connector types as chips, price per kWh
  - AI prediction highlight, e.g. "AI match · ETA 28 min", in a highlighted tinted strip
  - Primary actions: **Navigate**, **Reserve or Hold**, **Save**
  - Small amenities icons (cafe, restroom, wifi, etc.) if available in the data
- Smooth open/close animation. Map pans so the selected marker stays visible.

### 5c. Station images: fix loading and add fallbacks
- Diagnose why images are not loading (CORS, `next/image` missing `remotePatterns` in `next.config`, wrong paths, empty URLs) and fix it properly.
- Use `next/image` with correct config, or a plain `<img>` with `loading="lazy"` and an `onError` fallback.
- **Always show something good:** if there is no image or it fails, render a generated fallback, a branded gradient card with the operator's initial/logo and a charger illustration (SVG, stored locally in `/public`). Add 4 to 6 local placeholder charging-station illustrations or photos to `/public/stations/` and map them to stations deterministically (e.g. by id hash) so each station looks distinct.
- Add skeleton shimmer while loading and a fade-in once loaded.

### 5d. Map page layout
- Left (desktop): a scrollable, filterable station list with image thumbnails and status badges. Hovering a list item highlights its marker, and clicking one flies to it. Mobile: map full-screen with a draggable results sheet.
- Floating glass search bar and filter chips on the map (Available now, Fast charging 50kW+, Connector type, Max wait, Price).
- Map controls (zoom, locate me, layers) in clean, rounded, white floating buttons.
- A small legend for marker colors.
- Empty, loading, and error states that look designed, not default.

---

## 6. Driver Dashboard: already good, make it exceptional

Keep the current structure and information. Elevate it:
- Cleaner card hierarchy: a greeting header ("Good evening, Rohit") with a quick-action row (Find charger, Plan trip, My bookings).
- **Stat cards** with mini sparklines, animated counters, and trend indicators (kWh charged, spend, CO2 saved, sessions).
- **Active charging session card:** circular animated progress ring (battery %), time remaining, live power draw, cost so far.
- Charts: consistent light chart style (soft gradients, rounded bars, tooltips). Spending/energy over time and an AI wait-time forecast chart.
- Upcoming reservations and recent sessions as clean list or timeline items with status badges.
- A "Recommended for you" nearby-stations strip using the new marker-consistent status colors and station images.
- Skeleton loaders, smooth hover states, subtle staggered entrance animations, and a clean sidebar/topbar with an active-state indicator and notifications bell.
- Fully responsive (sidebar collapses to a bottom nav or drawer on mobile).

---

## 7. Implementation Notes

- Work page by page. Start with the shared design system (fonts, tokens, base components), then Map, Landing, Auth, Onboarding, Dashboard.
- Reuse components. Do not duplicate styles across pages.
- Put design tokens in Tailwind config / CSS variables (light values only).
- Keep performance in mind: lazy-load heavy visuals (3D, video, map), optimize images, avoid layout shift, and keep Lighthouse performance reasonable.
- Add short comments where animation or map-marker logic is non-obvious.
- If anything in the existing data shape blocks a design (e.g. a station has no image field), handle it gracefully on the frontend with fallbacks rather than changing the backend.

## 8. Definition of Done (self-check before you finish)

- [ ] No dark theme anywhere (no `dark:` classes, no toggle)
- [ ] Landing hero has a 3D/parallax interactive visual plus scroll animations
- [ ] Login and signup are polished, fit one screen, and keep working
- [ ] Onboarding is a stepper wizard with a consistent font and clean selection UI
- [ ] Map markers are custom, status-colored, labeled, clustered, with a selected state
- [ ] Station images load, with a good fallback and skeleton
- [ ] Station detail card is rich and highlights the AI prediction
- [ ] Driver dashboard is upgraded and consistent with the new system
- [ ] Mobile responsive, accessible, reduced-motion respected
- [ ] No backend or logic changes, and all existing routes and forms still work
