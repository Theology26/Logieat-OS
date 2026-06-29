# LogiEat OS — Web (Go + React)

Front end **React (Vite + TypeScript)** untuk **UAS Popular Programming Technology**, mengonsumsi
**REST API GoLang** di `../backend-go` (client-server, berbagi DB MySQL dengan Laravel).

## Jawaban UAS & diagram
Pemetaan tiap Learning Outcome → fitur/kode, diagram (use case, class, ERD, sequence),
serta outline PPT & laporan ada di **[`../docs/UAS-NOTES.md`](../docs/UAS-NOTES.md)** (Bagian B).

## Menjalankan
```bash
# 1) Go REST API (port 8080) — di folder backend-go
cd ../backend-go && go run ./cmd/server
# (untuk Dispatch AI, jalankan juga ai-service: python app.py)

# 2) React (port 5173)
npm install
npm run dev
```
Base URL API bisa diubah lewat `VITE_API_URL` (default `http://localhost:8080`).

Login demo: `owner@bahagia.id` / `password` (owner) atau `budi@bahagia.id` / `password` (kurir).

## Struktur
```
src/
├─ lib/      api.ts (REST client), auth.tsx (context+JWT), ws.ts (WebSocket)
├─ pages/    Login, Dashboard, Orders, Dispatch, Fleet
├─ components/ Layout (sidebar + protected outlet)
└─ App.tsx   client-side routing (react-router)
```

Bukti jalan (screenshot): [`../docs/uas-web-screenshots/`](../docs/uas-web-screenshots/).
