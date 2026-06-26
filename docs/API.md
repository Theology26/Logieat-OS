# LogiEat OS — API Contract

> Source of truth for **how mobile (APK) + admin web talk to the backend**. Keep this in sync
> with `routes/api.php` (Laravel) and the Go core routes. 2026-06-26.

## 1. Base URLs

| Service | Local (PC) | What it serves |
|---|---|---|
| **Laravel API** | `http://127.0.0.1:8001/api` (`php artisan serve --port=8001`) | auth, billing, orders, analytics |
| **Go core** | `http://127.0.0.1:8080` | dispatch (→app.py), realtime, GPS, chat *(Phase 2/3)* |
| **WebSocket** | `ws://127.0.0.1:8080/ws` | live fleet, chat, notifications *(Phase 3)* |

### ⚠️ Reaching the backend from a real phone / APK
`127.0.0.1` on the phone = the phone itself, **not your PC**. Pick one:

| Scenario | API base URL to use |
|---|---|
| **Android emulator** | `http://10.0.2.2:8001/api` (10.0.2.2 = host loopback) |
| **Physical device (APK), same Wi-Fi** | `http://<PC-LAN-IP>:8001/api` — find IP via `ipconfig` (e.g. `192.168.1.10`). Run Laravel with `php artisan serve --host=0.0.0.0 --port=8001`. |
| **Anywhere (no same network)** | **ngrok** (bundled in Laragon): `ngrok http 8001` → use the `https://xxxx.ngrok-free.app/api` URL |
| **Production** | your deployed HTTPS domain |

Set it via `EXPO_PUBLIC_API_URL` (see `mobile-expo/.env`). Native React Native fetch is **not**
subject to CORS, so the APK can call these directly. (CORS only matters for the browser admin web.)

## 2. Auth
- Scheme: **Bearer JWT** (HS256), header `Authorization: Bearer <token>`.
- Token claims: `sub` (user id), `company_id`, `role` (`owner|admin|courier`), `exp` (7 days).
- The **same secret** (`JWT_SECRET`) is shared by Laravel (issuer) and Go (validator).
- Always send `Accept: application/json`.

## 3. Endpoints — Phase 1 (Laravel, **implemented & tested** ✅)

### POST `/api/auth/register-owner` → 201
```json
// request
{ "company_name":"Dapur Bahagia", "owner_name":"Bu Ratna", "phone":"08123456789",
  "email":"owner@bahagia.id", "password":"secret123", "password_confirmation":"secret123",
  "depot_lat":-6.2, "depot_lng":106.8 }
// response
{ "token":"<jwt>", "user":{...,"role":"owner"}, "company":{...,"catering_code":"DAP-2A520F",
  "subscription_status":"inactive"}, "next":"subscription" }
```

### POST `/api/subscriptions/activate` → 200  *(auth: owner)*
```json
{ "plan":"pro_monthly|pro_yearly", "method":"qris|va|ewallet" }
// → { "message":"Langganan aktif.", "company":{"subscription_status":"active"} }
```

### POST `/api/auth/register-courier` → 201 / 422
```json
// request — catering_code comes from the owner
{ "catering_code":"DAP-2A520F", "name":"Budi", "phone":"0822",
  "vehicle_plate":"B1234XX", "email":"budi@x.id", "password":"secret1" }
// 201 → { "message":"Menunggu persetujuan admin Dapur Bahagia.", "status":"pending" }
// 422 → { "message":"Catering ID tidak ditemukan." }
```

### POST `/api/auth/login` → 200 / 401 / 403
```json
{ "email":"owner@bahagia.id", "password":"secret123" }
// 200 → { "token":"<jwt>", "user":{...} }
// 403 → { "message":"Akun kurir menunggu persetujuan admin." }   (pending courier)
// 401 → { "message":"Email atau kata sandi salah." }
```

### GET `/api/auth/me` → 200  *(auth)*  → `{ "user":{...}, "company":{...} }`

### Courier approval *(auth: owner/admin, tenant-scoped)*
| Method | Path | Result |
|---|---|---|
| GET | `/api/couriers/pending` | list pending couriers (this company only) |
| GET | `/api/couriers` | all couriers |
| POST | `/api/couriers/{id}/approve` | `status → active` |
| POST | `/api/couriers/{id}/reject` | `status → rejected` |

## 4. Endpoints — Phase 2 (Go core, **implemented & tested** ✅)
Base: `http://127.0.0.1:8080`. Auth: same Bearer JWT (Go validates with the shared secret;
reads `company_id` from the token). Owner/admin only.

### POST `/dispatch/optimize` → 200  *(preview, no DB write)*
```json
// request
{ "order_ids": ["<uuid>", "..."], "courier_id": "<uuid?>",
  "temperature": 31, "max_time_minutes": 180, "vehicle_capacity": 100 }
// response — sequence decided by app.py A2C model
{ "route":[ {"sequence":1,"order_id":"...","code":"#1023","recipient":"SMP 12",
    "distance_km":3.0,"estimated_minutes":6.0,"spoilage_risk":"critical","minutes_until_spoilage":5.0}, ... ],
  "total_distance_km":10.3,"total_time_minutes":20.6,
  "spoilage_summary":{"critical":4,"high":0,"medium":0,"low":0},"model_type":"a2c_spoilage_aware_v2" }
```
Go maps each order → `SchoolNode` (deadline → `time_window_minutes`, `food_category` for Q10),
calls app.py `/routing/optimize`, maps the result back to order ids. Falls back to app.py's
heuristic automatically if the A2C weights/NVIDIA are unavailable.

### POST `/dispatch/assign` → 201  *(persists)*
Same body but `courier_id` **required**. Optimizes, then writes `routes` + `route_assignments`
(one txn) and marks the orders `assigned` (caching `spoilage_risk`). Returns `route_id` + stops.
*(Phase 3: also pushes a `new_task` notification to the courier.)*

## 5. Endpoints — Phase 3 (Go core, **planned**)
| Method | Path | Purpose |
|---|---|---|
| GET | `/ws` | WebSocket: fleet, chat, notifications |
| POST | `/gps` | courier location ping (~5s) |
| POST | `/assignments/{id}/pickup\|arrive\|deliver\|complete` | execution + PoD |
| POST | `/chat/messages` | send chat message |

> These accept the same Bearer JWT; Go reads `company_id` from it (never trust client-sent ids).

## 6. Error shape
All errors: `{ "message": "..." }` (+ Laravel `errors` object on 422 validation). HTTP status
codes are meaningful (401 auth, 403 forbidden/inactive, 422 validation, 404 not found).
