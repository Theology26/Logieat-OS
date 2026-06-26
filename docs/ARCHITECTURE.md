# LogiEat OS — System Architecture

> 2026-06-26 · Pair with [`PRD.md`](./PRD.md) · [`DATABASE.md`](./DATABASE.md) · [`design.md`](../design.md)

## 1. Topology

```
                        ┌──────────────────────────┐
   Courier Mobile  ───► │  Go Core API (REST + WS)  │ ◄── Admin Web (Laravel
   (React Native)       │  routing bridge · GPS ·   │      + Inertia/React)
        ▲   │           │  chat · notifications     │            │
        │   │ WS/REST   └─────┬───────────┬─────────┘            │ REST/Inertia
        │   │                 │           │                      ▼
   FCM push                   │           │              ┌────────────────────┐
        ▲                     ▼           ▼              │ Laravel (PHP)      │
        │              ┌────────────┐ ┌──────────┐       │ auth · billing ·   │
        └──────────────│   Redis    │ │ app.py   │       │ companies/users ·  │
                       │ pub/sub +  │ │ FastAPI  │       │ orders CRUD ·      │
                       │ job queue  │ │ A2C AI   │       │ analytics          │
                       └─────┬──────┘ └────┬─────┘       └─────────┬──────────┘
                             │             │                       │
                             └─────────────┴───────────────────────┘
                                           ▼
                                   ┌──────────────┐   ┌─────────────────────┐
                                   │ MySQL 8 /    │   │ OSRM + MapLibre/OSM │
                                   │ MariaDB      │   │ (routing geometry,  │
                                   │ (shared DB)  │   │  vector tiles)      │
                                   └──────────────┘   └─────────────────────┘
```

**Local dev (Laragon):** MySQL, PHP/Laravel, Node, and Redis run via Laragon on Windows;
**Go** + **Python (app.py)** run directly; **OSRM** via Docker. A `docker-compose.yml` is kept
for an all-in-one / production setup: `mysql`, `redis`, `go-core`, `laravel-admin`,
`ai-service` (existing `app.py`), `osrm`, and a tile server (or hosted OSM style).

## 2. Responsibility Split (why Go *and* Laravel)
| Concern | Service | Reason |
|---|---|---|
| Real-time WebSocket, GPS streaming, chat fan-out | **Go** | High-concurrency, low-latency; goroutines per connection. |
| AI routing bridge (call app.py, persist, notify) | **Go** | Sits next to realtime; async via Redis queue. |
| Auth, company/user mgmt, courier approval | **Laravel** | Mature, fast to build, validation/middleware. |
| Billing / subscription | **Laravel** | Forms, gateways, admin ergonomics. |
| Orders CRUD, analytics queries | **Laravel** | Eloquent + Inertia pages. |
| Admin web UI | **Laravel + Inertia + React** | Server routing + React components, shared design tokens. |
| Mobile app | **React Native (Expo)** | Cross-platform, camera/geo/maps. |

> **Shared MySQL** is the contract between Go and Laravel. Both enforce `company_id`.
> Both validate the **same JWT** (shared secret) so a token issued by Laravel is accepted by Go.

## 3. The AI Bridge (Go ↔ `app.py`)
`app.py` is unchanged. Go is a thin orchestrator — it does **no** heavy compute.

**Single dispatch (interactive):**
1. Admin selects courier + orders → Laravel/Go builds `RouteOptimizeRequest` (depot from company profile, `schools[]` = selected orders mapped to `SchoolNode`, `vehicle_capacity`, `temperature`).
2. Go `POST http://ai-service:9000/routing/optimize` (internal network, REST/JSON).
3. app.py returns `route[]` (sequence, spoilage_risk, distance_km, estimated_minutes, minutes_until_spoilage) + totals.
4. Go persists `routes` + `route_assignments` (in a DB transaction) **before** notifying.
5. Go pushes notification (WS + FCM) to courier: "Tugas baru: N pengantaran."

**Bulk dispatch (many batches):** enqueue jobs to **Redis queue**; a Go worker calls app.py
asynchronously (never block the admin request), persists, then notifies. Idempotent per batch.

**Order → SchoolNode mapping:**
```
SchoolNode{ id: order.id, name: order.recipient_name, latitude, longitude,
            demand: order.quantity, time_window_minutes, food_category }
```
`food_category ∈ {Santan,Basah,Kering}` lets app.py auto-derive spoilage window from temperature.
**Risk colors** (`critical/high/medium/low`) flow straight through to UI per design.md §1.5 — never re-map.

**OSRM vs AI:** app.py decides **order** (which stop next, Haversine @30km/h estimate). **OSRM**
draws the real road polyline + road ETA between consecutive stops for navigation. Two layers,
distinct jobs. (No live traffic — documented limitation.)

## 4. Real-time Layer
- **Transport:** WebSocket served by Go. One connection per authenticated client (courier app, admin dashboard tab).
- **Scale-out / fan-out:** **Redis Pub/Sub**. Any producer (Go handler, or Laravel emitting an event) publishes to a channel; all Go instances subscribed relay to their local WS clients. Channels are **namespaced by company**: `company:{id}:fleet`, `company:{id}:chat:{routeId}`, `company:{id}:notif:{userId}`.
- **GPS streaming:** courier app sends location every ~5s → Go → (a) update `courier_locations` (last known), optional append to history, (b) publish to `company:{id}:fleet` → admin map updates live.
- **Chat:** message → Go persists `messages` → publish to thread channel → delivered + read receipts.
- **Notifications:** in-app via WS toast; background/closed app via **FCM**. Laravel triggers business events (e.g. courier approved) by publishing to Redis; Go relays.

**Cross-service events:** Laravel does not open WS itself. When Laravel needs to push (approval,
new order), it `PUBLISH`es to Redis and Go broadcasts. Single realtime owner = Go.

## 5. Auth & Multi-Tenancy (security)
- **Identity:** Laravel issues a **JWT** on login containing `sub` (user id), `company_id`, `role`. Mobile stores it in secure storage (Expo SecureStore); web via Inertia session + token.
- **Validation:** Go and Laravel share the JWT secret. Every request → extract `company_id` from token; never trust a client-sent company id for authorization (the `X-Company-ID` header is for the AI service convenience/logging and must equal the token claim).
- **Tenant isolation:**
  - Laravel: a **global Eloquent scope** auto-adds `WHERE company_id = ?` to every tenant model.
  - Go: a middleware injects `company_id` into the request context; every query **must** filter by it. Code review rule: no tenant query without `company_id`.
- **Courier join security:** `companies.catering_code` = random URL-safe hash (e.g. base32 of 8 random bytes → `DBC-7F3A9K`), **not** an incremental integer (prevents guessing other companies).
- **Approval flow:** courier `status = pending` until owner approves → `active`. Pending users cannot fetch tasks.
- **Payload validation:** app.py already validates coordinate ranges; Laravel validates all order inputs; reject out-of-region coords.
- **PoD images:** compressed **client-side** (expo-image-manipulator) before upload to storage (local disk / S3-compatible).
- **Transport:** HTTPS/WSS in production; internal service calls on a private docker network.

## 6. API Surface (high-level)
**Laravel (REST/Inertia):** `POST /auth/register-owner`, `/auth/register-courier`, `/auth/login`;
`/companies/{id}` (profile/depot); `/couriers` (+approve/reject); `/orders` (CRUD);
`/subscriptions`; `/analytics/*`; Inertia pages for dashboard/dispatch/fleet/orders/stats.

**Go (REST + WS):** `POST /dispatch/optimize` (→app.py), `POST /dispatch/assign`;
`WS /ws` (auth via token) channels: fleet/chat/notif; `POST /gps` (or via WS);
`POST /assignments/{id}/pickup`, `/arrive`, `/deliver` (with PoD), `/complete`;
`POST /chat/messages` (or WS). Health: `GET /healthz`.

## 7. Frontend Engineering Conventions
> Grounded in `ui-ux-pro-max` `react-native` + `react` stack guidance. Tokens come from
> `design.md` §11 — **never** hardcode colors/sizes.

### 7.1 Mobile (React Native / Expo)
- **Language:** TypeScript everywhere. Functional components only; keep components small; colocate files (`Component/index.tsx`, `styles.ts`).
- **Styling:** `StyleSheet.create` (no inline styles in render); flexbox; responsive via `useWindowDimensions`; consume `theme.ts` (design.md §11.1). Handle platform diffs explicitly.
- **Navigation:** **React Navigation**, typed params; deep linking (for notif → screen); predictable hardware back.
- **State:** `useState` local; `useReducer` for complex; **Zustand** for app/session/fleet state; context sparingly. Avoid prop drilling.
- **Lists:** `FlatList` for tasks/chat; `keyExtractor`; memoized `renderItem`; `getItemLayout` for fixed rows; tune `windowSize`.
- **Perf:** `React.memo`, `useCallback` for handlers, `useMemo` for expensive ops; no anonymous functions in JSX hot paths; **Hermes** engine on.
- **Media/maps/camera:** `expo-image` (set dimensions), **MapLibre RN** (`@maplibre/maplibre-react-native`) + OSM vector tiles, `@gorhom/bottom-sheet`, `expo-camera` + `expo-image-manipulator` (PoD compress), `expo-location` (GPS), `react-native-toast-message` (floating notif), FCM via `@react-native-firebase/messaging`. Lottie via `lottie-react-native` (splash).
- **Offline:** cache last route/coords in SQLite (`expo-sqlite`); queue GPS pings when offline, flush on reconnect.
- **A11y:** every icon-only button has `accessibilityLabel`; respect reduce-motion & dynamic type (design.md §10).

### 7.2 Admin Web (Laravel + Inertia + React)
- TypeScript React components; keep small & composed; destructure props; fragments over wrapper divs.
- **Rendering perf:** correct `key`s; memoize expensive calcs (`useMemo`) and child callbacks (`useCallback`); `React.memo` wisely; avoid inline object/array literals in JSX; clean up effects with correct deps.
- **State:** local `useState`, lift when shared; `useReducer` for complex; avoid unnecessary state/effects; refs for non-reactive values.
- **Charts:** **Recharts** per design.md §13 (line/area trends, KPI tiles, grouped bar); accessible color + data-table fallback.
- **Realtime:** small WS client (or `laravel-echo` against Go/Redis) for live map & chat; MapLibre GL JS for the fleet map.
- **Design tokens:** shared CSS vars (design.md §11.2) + Tailwind theme generated from `tokens.json`.

## 8. Deployment / Env
- `docker-compose.yml` (all-in-one/prod): mysql, redis, go-core, laravel-admin (+nginx+php-fpm), ai-service, osrm-backend (+ region `.osm.pbf`), optional tileserver-gl. Local dev uses Laragon for mysql/php/node/redis instead.
- Env: `DB_DSN` (mysql, e.g. `user:pass@tcp(127.0.0.1:3306)/logieat?parseTime=true&loc=UTC`), `REDIS_URL`, `JWT_SECRET` (shared Go/Laravel), `AI_SERVICE_URL=http://ai-service:9000`, `OSRM_URL`, `NVIDIA_API_KEY` (optional), `FCM_*`.
- ai-service Dockerfile already CPU-only torch; falls back to heuristic if weights/API absent.
- APK: built with EAS/Expo, hosted as static file behind the landing page download button.

## 9. Key Decisions Log
- Dispatch = **manual assign + AI sequence** (app.py is single-route).
- Realtime owner = **Go**; Laravel emits via Redis.
- One **shared MySQL** (Laragon), one **shared JWT secret**.
- Maps **free** (MapLibre+OSM+OSRM); **no live traffic** (documented).
- `app.py` untouched; Go adapts to its schema.
