# backend-go — LogiEat OS Core Service

High-concurrency Go service: realtime (WebSocket + Redis pub/sub), GPS streaming, AI-dispatch
bridge to `ai-service/app.py`, and courier execution endpoints. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Run (local)
```bash
cp .env.example .env          # adjust if needed
go run ./cmd/server           # serves :8080
curl http://127.0.0.1:8080/healthz
```

## Layout
```
cmd/server/main.go        entrypoint
internal/config/          env config (DB_DSN, REDIS_URL, AI_SERVICE_URL, JWT_SECRET…)
internal/server/          HTTP server, routes, health, middleware
  ├─ server.go            wiring + http.Server
  ├─ routes.go            route table (Phase 2/3 endpoints stubbed)
  ├─ health.go            GET /healthz
  └─ middleware.go        request logging (+ tenant JWT middleware TODO Phase 1)
```

## Build
```bash
go build ./...        # compile
go vet ./...          # static checks
docker build -t logieat-core .
```

## Next (per ROADMAP)
- **Phase 1:** `tenant()` middleware (validate shared JWT, inject company_id).
- **Phase 2:** `POST /dispatch/optimize` → calls app.py; `POST /dispatch/assign` (persist + notify).
- **Phase 3:** `GET /ws`, `POST /gps`, assignment pickup/arrive/deliver/complete, chat.

> Deps: stdlib only for now. Add MySQL driver (`go-sql-driver/mysql`) + Redis + WS lib in Phase 1–3.
