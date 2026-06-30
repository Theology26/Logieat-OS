# LogiEat OS — Development Roadmap

> 2026-06-26 · Pair with [`PRD.md`](./PRD.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> Build order follows the 30-yr rule: **realtime backbone first**, then layer AI, then UI polish.

## Phase 0 — Foundation Setup (scaffold)
**Goal:** repo + infra skeleton so everything has a home.
- Monorepo layout: `ai-service/` (exists) · `backend-go/` · `admin-laravel/` · `mobile-expo/` · `landing/` (exists) · `docs/` (exists) · `infra/` (docker-compose).
- Local dev via **Laragon** (MySQL + PHP + Node + Redis); Go + Python run directly; OSRM via Docker. `docker-compose.yml` kept for all-in-one/prod (mysql, redis, ai-service, osrm, go-core, laravel-admin).
- Create MySQL database `logieat` (HeidiSQL); shared `JWT_SECRET`, `.env` templates, `tokens.json` → generate RN `theme.ts` + web CSS vars.
- **Done when:** Laragon serves Laravel welcome + MySQL reachable; ai-service `/health` green; placeholder Go `/healthz`.

## Phase 1 — Database & Auth (security backbone)  ✅ DONE (2026-06-26)
> Laravel 13 in `admin-laravel/`; 11 tables migrated on MySQL `logieat`; JWT (firebase/php-jwt,
> shared secret), multi-tenant global scope + `jwt.auth` middleware. Auth flow tested end-to-end:
> owner register → subscribe → courier register (Catering ID) → login blocked (pending) → approve →
> login OK. Endpoints in [`API.md`](./API.md). Mobile client stub in `mobile-expo/src/lib/`.

**Focus:** tenancy + identity. **Deliverables:**
- Laravel migrations for all tables (DATABASE.md, MySQL) + inline enums.
- Auth: owner register + subscription gate; courier register via Catering ID + **approval** flow; login → JWT (company_id, role).
- Multi-tenancy: Laravel global scope; Go JWT middleware injecting `company_id`.
- Catering code generator (random hash).
**Acceptance:**
- [ ] Two companies cannot read each other's data (tenant test).
- [ ] Courier blocked until approved; approval emits notification.
- [ ] JWT issued by Laravel is accepted by Go.

## Phase 2 — Dispatch Engine (AI integration + orders)  🟡 backend DONE (2026-06-26)
> Orders CRUD (Laravel, tenant-scoped, auto codes) + Go bridge `/dispatch/optimize` & `/dispatch/assign`
> tested end-to-end: Laravel JWT → Go (stdlib HS256 verify) → app.py A2C (`a2c_spoilage_aware_v2`) →
> persist `routes`+`route_assignments`, orders → `assigned`. Go uses `go-sql-driver/mysql` on the shared DB.
> **Remaining:** admin Inertia/React dispatcher UI + Redis async queue for bulk dispatch.

**Focus:** the core loop. **Deliverables:**
- Orders CRUD (Laravel + Inertia/React) with food_category + deadline + map coords.
- Go `POST /dispatch/optimize` → maps orders→`SchoolNode` → calls `app.py /routing/optimize` → returns sequenced result.
- `POST /dispatch/assign` → persist `routes` + `route_assignments` in a txn → notify courier.
- Redis job queue for bulk dispatch (async worker).
- Dispatcher UI (matches mockup C-Dispatcher).
**Acceptance:**
- [ ] Select courier + orders → AI returns ordered route with risk/ETA/distance.
- [ ] Fallback heuristic works when NVIDIA/app.py errors (no crash).
- [ ] Assignment persists then courier gets a `new_task` notification.

## Phase 3 — Logistics: Real-time, Maps & Mobile (the hard part)  🟢 mostly DONE (2026-06-26)
> **Mobile courier app (Expo SDK 56, Expo Go-compatible):** Splash → Landing → Login → Tasks
> (live AI route) → Navigation (MapLibre GL JS in WebView, dark CARTO tiles, slide-up panel,
> **GPS streaming**) → PoD Camera (expo-camera → compress → geotag → upload) → staged reveal →
> complete; **Chat** (realtime). **Go realtime:** WS hub, `/ws`, GPS→`current_locations`+fleet
> broadcast, chat→`messages`, new-task notif. **Admin:** Fleet page (maplibre-gl live markers + chat).
> All verified (node WS relay, tsc+bundle, builds). **Remaining:** Redis fan-out (scale-out),
> FCM background push, offline SQLite cache, owner approval-UI page.

**Focus:** WebSocket + maps + courier app. **Deliverables:**
- Go WebSocket server + Redis pub/sub fan-out (channels per company).
- GPS streaming (mobile every ~5s) → live admin map (MapLibre GL JS) + slide-in panel.
- Courier app (RN/Expo): splash (Lottie) → landing → auth → tasks → navigation (MapLibre RN + OSRM, bottom sheet) → **PoD camera** (compress+geotag) → staged route reveal → return-to-depot → complete.
- Chat real-time (both sides) + floating notifications (toast + FCM) color-coded.
- Offline cache (SQLite) for last route/coords; GPS queue + flush.
**Acceptance:**
- [ ] Admin sees courier move live (<1s latency).
- [ ] Next route segment unlocks only after PoD confirm of current stop.
- [ ] Chat delivers instantly with read receipts; background push via FCM.
- [ ] Cancel-mid-route updates `route_assignments` + notifies admin.

## Phase 4 — Analytics & Polish  🟡 analytics DONE (2026-06-26)
> `orders.price` added; AnalyticsController (KPIs + sales trend day/month/6mo/year + courier recap);
> Statistik page (Recharts: KPI tiles, area chart w/ granularity switch, courier km bars), nav "Statistik".
> Verified /statistik renders computed data. **Remaining:** APK build (EAS), final QA pass, profile/depot edit.

**Focus:** insight + quality. **Deliverables:**
- Analytics (Recharts): sales day/month/6mo/year (line/area), KPI tiles, courier recap (bars); lazy-load 30 days.
- Profile/depot edit (owner) + courier profile.
- Landing page final + APK download wiring (EAS build) — `landing/` already drafted.
- QA pass: PRD §10 checklist, design.md §10 a11y, performance (vector tiles, image compression, list virtualization), reduced-motion.
**Acceptance:**
- [ ] All charts have accessible fallbacks + correct number formatting.
- [ ] Full PRD §10 + design.md pre-delivery checklist green.
- [ ] APK downloadable from landing page and installs on Android 8+.

## Dependency Order (critical path)
```
Phase 0 ─► Phase 1 ─► Phase 2 ─► Phase 3 ─► Phase 4
                         │            ▲
                   (app.py exists)  (WS first, then AI calls layered in per advice)
```
> Tip from the brief: get the **WebSocket layer streaming** before wiring AI route calc into
> the live flow. AI dispatch (Phase 2) can be tested via REST before realtime (Phase 3) exists.

## Status Snapshot (2026-06-26)
- ✅ `ai-service/app.py` (A2C routing spoilage-aware) — built & trained.
- ✅ `design.md` (design system) + `docs/mockups/mockups.html` (13 screens).
- ✅ `landing/index.html` (premium promo + APK CTA).
- ✅ Docs: PRD / ARCHITECTURE / DATABASE / ROADMAP.
- ⬜ Phase 0 scaffold → next.
