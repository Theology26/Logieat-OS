# LogiEat OS — Documentation Index

Canonical reference set. Read before building anything.

| Doc | What it covers |
|---|---|
| [PRD.md](./PRD.md) | Mission, roles, scope, functional + non-functional requirements, flows, QA checklist. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System topology, Go↔app.py AI bridge, realtime (WebSocket/Redis), auth & multi-tenancy, **frontend engineering conventions (RN + React)**, deployment. |
| [DATABASE.md](./DATABASE.md) | MySQL 8 / MariaDB schema (DDL, Laragon), enums, tenancy rules, analytics derivation. |
| [API.md](./API.md) | **API contract** — base URLs (incl. how an APK reaches the backend), auth, all endpoints with examples. |
| [ROADMAP.md](./ROADMAP.md) | Phase 0–4 build plan with deliverables + acceptance criteria. |
| [../design.md](../design.md) | **Design system** (tokens, components, screens, charts, a11y). Source of truth for UI. |
| [mockups/mockups.html](./mockups/mockups.html) | 13 token-accurate screen mockups (onboarding · courier app · admin web). |
| [../landing/index.html](../landing/index.html) | Premium promo landing page + APK download CTA. |

**Locked decisions:** dispatch = manual assign + AI sequence · admin web = Laravel + Inertia/React ·
mobile = React Native (Expo) · maps = MapLibre + OSM + OSRM (free, no live traffic) ·
AI = existing FastAPI `app.py` · realtime owner = Go · **DB = MySQL/MariaDB (Laragon)** · shared DB + shared JWT.

**Skills (auto-use):** `ui-ux-pro-max` for any UI/design work; `web3d-interactive-design` /
`web3d-integration-patterns` for landing animations/3D.
