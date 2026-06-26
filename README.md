<div align="center">

# 🍱 LogiEat OS

### Sistem Operasi Logistik Katering bertenaga AI

**Bagi tugas otomatis · rute sadar-kebasian dengan AI · pelacakan armada real-time**

Platform lengkap untuk katering besar: AI membagi & mengurutkan pengantaran berdasarkan
risiko basi makanan, kurir dapat navigasi turn-by-turn, dan owner memantau seluruh armada
secara live — semuanya dalam satu sistem yang terhubung.

`Go` · `Laravel` · `React Native (Expo)` · `FastAPI (A2C)` · `MySQL` · `MapLibre + OSRM`

</div>

---

## ✨ Kenapa LogiEat OS?

Katering besar punya masalah klasik: **puluhan kurir, ratusan pesanan, dan makanan yang
cepat basi.** Bagi tugas manual lewat WhatsApp bikin urutan antar kacau, makanan basi, dan
owner buta posisi kurir. LogiEat OS menggantinya dengan alur otomatis end-to-end:

| Tanpa LogiEat OS | Dengan LogiEat OS |
|---|---|
| Bagi tugas manual (WA/kertas) | **AI membagi & mengurutkan otomatis** |
| Kurir bingung urutan & rute | **Navigasi turn-by-turn** ikut jalan |
| Makanan basi karena urutan asal | **Spoilage-aware** (model Q10 + suhu) |
| Owner tak tahu posisi kurir | **Armada live** + chat real-time |
| Rekap penjualan manual | **Analitik** otomatis |

---

## 🧩 Komponen Sistem

LogiEat OS terdiri dari **2 aplikasi mobile + 1 dashboard web + 1 landing page**, semua
terhubung ke backend & database yang sama.

| Komponen | Untuk | Teknologi |
|---|---|---|
| 📱 **LogiEat Kurir** (APK) | Kurir di lapangan | React Native (Expo) |
| 📱 **LogiEat Manager** (APK) | Owner / admin katering | React Native (Expo) |
| 🖥️ **Admin Web** | Owner (desktop) | Laravel + Inertia + React |
| 🌐 **Landing Page** | Promosi + unduh APK | HTML + Three.js + GSAP |

> Aplikasi Kurir & Manager dibangun dari **satu codebase** (dipilih saat build via
> `EXPO_PUBLIC_APP_ROLE`), jadi tema & komponen konsisten.

---

## 🛠️ Tech Stack

**⚙️ Backend & AI**

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch_(A2C)-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)

**📱 Mobile & Frontend**

![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_(Inertia)-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**🗄️ Database · 🗺️ Maps · 🧰 Tooling**

![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![OpenStreetMap](https://img.shields.io/badge/MapLibre_+_OSM-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)
![OSRM](https://img.shields.io/badge/OSRM-5B396B?style=for-the-badge&logo=openstreetmap&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

| Layer | Teknologi | Peran |
|---|---|---|
| 🧠 **AI** | Python · FastAPI · PyTorch (A2C) | Routing spoilage-aware + Q10 spoilage model |
| ⚙️ **Core** | Go (`net/http`, gorilla/websocket) | Realtime, GPS streaming, jembatan ke AI |
| 🏢 **Admin/API** | Laravel 13 · Inertia · React | Auth, billing, orders, analitik, dashboard |
| 📱 **Mobile** | React Native · Expo · TypeScript | App Kurir & Manager (1 codebase, 2 APK) |
| 🗄️ **Database** | MySQL / MariaDB (Laragon) | Data relasional, multi-tenant |
| 🗺️ **Maps** | MapLibre GL · OpenStreetMap · OSRM | Peta gratis + navigasi turn-by-turn |
| 🌐 **Landing** | HTML · Three.js · GSAP · Lenis | Promosi 3D + unduh APK |

---

## 🚀 Fitur Utama

**AI Dispatch (inti)**
- Model **A2C (Actor-Critic) reinforcement learning** menyusun rute optimal per kurir
- **Spoilage-aware**: makanan paling cepat basi didahulukan (model Q10 — suhu menaikkan urgensi)
- Fallback heuristik pintar bila model/API tak tersedia → tidak pernah crash

**Kurir**
- Navigasi **turn-by-turn** ala Maps — rute mengikuti jalan (OSRM), bagian yang sudah
  dilewati highlight-nya hilang, peta mengikuti GPS, banner instruksi belokan
- **Proof of Delivery**: foto tiap titik (dikompres + geotag) sebelum lanjut
- Rute dibuka bertahap; chat realtime ke dapur pusat

**Owner / Katering**
- Dispatcher: pilih kurir + pesanan → **Optimasi AI** → kirim tugas
- **Armada Live** — marker kurir bergerak real-time di peta + chat
- Approve pendaftaran kurir (via Catering ID), kelola pesanan, analitik penjualan & rekap kurir

**Realtime & Notifikasi**
- **WebSocket** (Go) untuk GPS streaming + chat (delay minimal)
- Floating notification (in-app heads-up + push) saat tugas baru / update

**Hemat biaya**
- Peta **gratis**: MapLibre GL + OpenStreetMap + OSRM — tanpa API Google

---

## 🏗️ Arsitektur

```
   📱 Kurir App ───┐                                  ┌─── 🖥️ Admin Web
   📱 Manager App ─┼──► Go Core (REST + WebSocket) ◄──┤    (Laravel + Inertia/React)
                   │    routing bridge · GPS · chat   │
                   │           │            │         └──► Laravel (auth · billing ·
                   ▼           ▼            ▼               orders · analytics)
                FCM push    app.py       MySQL  ◄────────────────┘
                          (FastAPI AI)  (shared DB)
                           A2C model         │
                                             ▼
                                   OSRM + MapLibre/OSM (rute & peta)
```

- **Go** menangani konkuren tinggi (WebSocket, GPS, jembatan AI). **Laravel** untuk auth,
  billing, CRUD, analitik. Keduanya berbagi **satu MySQL** + **JWT secret yang sama**.
- **Multi-tenancy**: setiap query terisolasi per `company_id` (katering tidak bisa lihat data katering lain).

📖 Detail lengkap: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/API.md`](docs/API.md) · [`docs/DATABASE.md`](docs/DATABASE.md)

---

## 📂 Struktur Proyek

```
LogiEatOS/
├─ ai-service/      # FastAPI + model A2C (app.py) — routing spoilage-aware
├─ backend-go/      # Go core: WebSocket, GPS, jembatan dispatch ke app.py
├─ admin-laravel/   # Laravel + Inertia + React — dashboard owner (web)
├─ mobile-expo/     # React Native (Expo) — 2 app: Kurir & Manager (1 codebase)
├─ landing/         # Landing page promosi + unduh APK
├─ packages/tokens/ # Design tokens (1 sumber → tema mobile + web)
├─ infra/           # docker-compose (opsi all-in-one)
└─ docs/            # PRD, ARCHITECTURE, DATABASE, API, ROADMAP, mockups
```

---

## ⚙️ Menjalankan (Windows + Laragon)

**Prasyarat:** [Laragon](https://laragon.org) (MySQL + PHP + Composer), Go 1.26+, Node 20+,
Python 3.11+, Android Studio (untuk build APK).

### 1. Siapkan database
Buka Laragon → **Start All** → buka HeidiSQL → buat database **`logieat`** (utf8mb4).
```bash
cd admin-laravel
cp .env.example .env          # set DB_DATABASE=logieat
composer install && npm install && npm run build
php artisan migrate
```

### 2. Jalankan semua server (1 klik)
```
Start-all.bat
```
Otomatis menyalakan: **app.py** (:9000), **Go core** (:8080), **Laravel** (:8001, host 0.0.0.0
agar HP bisa akses). Pastikan MySQL Laragon sudah *Start All*.

### 3. Mobile (Expo)
```bash
cd mobile-expo && npm install
# atur EXPO_PUBLIC_API_URL di .env ke IP LAN PC kamu (mis. http://192.168.1.10:8001/api)
npx expo start -c                                  # App Kurir
EXPO_PUBLIC_APP_ROLE=catering npx expo start -c    # App Manager
```

### 4. Build APK
```bash
cd mobile-expo
npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)         # Kurir
EXPO_PUBLIC_APP_ROLE=catering npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)  # Manager
```

---

## 🔑 Akun Demo

| App | Peran | Email | Password |
|---|---|---|---|
| Manager | Owner (Katering Sehat) | `joko@sehat.id` | `secret123` |
| Manager | Owner (Dapur Bahagia) | `owner@bahagia.id` | `secret123` |
| Kurir | Kurir (Katering Sehat) | `joni@sehat.id` | `secret1` |
| Kurir | Kurir (Dapur Bahagia) | `budi@x.id` | `secret1` |

---

## 🎨 Tampilan

- **Tema:** gold / black premium (Inter + Cinzel + JetBrains Mono), konsisten di semua platform
- Preview semua layar: [`docs/mockups/mockups.html`](docs/mockups/mockups.html)
- Landing page: [`landing/index.html`](landing/index.html)

---

## 🛣️ Status

✅ Auth + multi-tenant · ✅ Orders + AI Dispatch · ✅ Realtime GPS + chat · ✅ Navigasi turn-by-turn
· ✅ PoD camera · ✅ Approve kurir + push · ✅ Analitik · ✅ 2 APK + admin web + landing

Rencana lanjut: Redis (scale-out multi-instance), OSRM self-host, offline cache (SQLite),
rilis APK via GitHub Releases.

---

<div align="center">

**LogiEat OS** — dibuat sebagai proyek akhir oleh [**Theology26**](https://github.com/Theology26)

</div>
