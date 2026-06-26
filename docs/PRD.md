# LogiEat OS — Product Requirements Document (PRD)

> **Status:** Baseline v1 · 2026-06-26 · Owner: solo/final-project
> **Related:** [`design.md`](../design.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DATABASE.md`](./DATABASE.md) · [`ROADMAP.md`](./ROADMAP.md) · mockups: [`mockups/mockups.html`](./mockups/mockups.html)

## 1. Mission
Mempermudah operasional **katering besar** yang punya banyak kurir & pesanan ramai: membagi
tugas antar ke kurir secara otomatis, menyusun **rute sadar-kebasian** dengan AI, dan melacak
seluruh armada real-time — menjamin keamanan makanan & ketepatan antar.

## 2. Problem
Katering besar saat ini: bagi tugas manual (WhatsApp/kertas), kurir bingung urutan & rute,
makanan basi karena urutan asal, owner tak tahu posisi/status kurir, rekap penjualan manual.

## 3. Core Objectives
1. **AI-Driven Dispatch** — otomasi alokasi & urutan antar berbasis urgensi kebasian (spoilage), tenggat, dan jarak (pakai `ai-service/app.py`).
2. **Operational Transparency** — "Single Pane of Glass": owner memantau seluruh armada real-time.
3. **Courier Efficiency** — navigasi pasti, proof-of-delivery (PoD) foto, komunikasi instan.

## 4. Stakeholders & Roles
| Role | Platform | Ringkasan |
|---|---|---|
| **Catering Owner / Admin** | Admin Web (Laravel + Inertia/React) | Kelola pesanan, dispatch ke kurir, monitor armada live, analitik, kelola profil/depot, approve kurir, billing. |
| **Courier (Kurir)** | Mobile (React Native / Expo, Android) | Terima tugas, navigasi, PoD foto tiap titik, chat ke dapur pusat, kirim GPS. |
| **(Sistem) AI Service** | FastAPI `app.py` | Hitung spoilage + susun rute optimal per kurir. |

> Catatan: aplikasi mobile berfokus pada **kurir**. Owner beroperasi via **web dashboard**
> (keputusan terkunci). Splash/landing mobile = entry aplikasi kurir.

## 5. Scope (v1)

### 5.1 In Scope
- Auth & onboarding (owner registrasi + langganan; kurir via Catering ID + approval admin).
- Manajemen pesanan (CRUD) dengan kategori makanan & deadline.
- **Dispatch manual-assisted + AI sequencing**: admin pilih kurir + centang pesanan → AI urutkan → kirim tugas.
- Eksekusi kurir: pickup (PoD) → rute bertahap per titik (PoD tiap titik) → rute balik depot → selesai.
- Real-time GPS streaming kurir → admin (interval ±5 dtk) di peta live.
- Chat real-time owner ⇄ kurir.
- Floating notifications (in-app toast + push FCM) dengan color-coding.
- Analitik: penjualan (hari/bulan/6bln/tahun) + rekap kurir (jumlah antar, km).
- Landing page promosi + tombol unduh APK Android.
- Multi-tenancy (isolasi data antar katering).

### 5.2 Out of Scope (v1)
- Pembayaran end-customer / marketplace publik (ini B2B internal katering).
- iOS build / rilis Play Store (APK langsung — tugas final).
- Live traffic congestion real-time (OSRM = rute & ETA berbasis jalan, **bukan** macet live).
- Multi-vehicle auto-clustering (AI hanya urutkan 1 rute/kurir; pembagian antar-kurir = manual).
- Vision OCR & menu-suggest (`/vision`, `/decision/*`) = **opsional/bonus**, bukan jalur kritis.

## 6. Functional Requirements

### 6.1 Auth & Onboarding
- **FR-A1** Owner registrasi: nama perusahaan, nama owner, no. telp (WA), email, password, alamat depot (+lat/lng).
- **FR-A2** Owner wajib pilih & bayar **langganan** (QRIS/VA/e-wallet — mock gateway) sebelum akun aktif.
- **FR-A3** Sistem generate **Catering ID** unik & aman (hash acak, bukan integer berurutan).
- **FR-A4** Kurir registrasi: input Catering ID (divalidasi → tampilkan nama katering), nama, telp, plat kendaraan → status **pending**.
- **FR-A5** Admin meng-**approve/reject** kurir; kurir dapat notifikasi & baru bisa login setelah approved.
- **FR-A6** Login email+password; sesi via token (lihat ARCHITECTURE §Auth).

### 6.2 Orders
- **FR-O1** Admin input pesanan: penerima, no. telp, menu, kategori makanan (Santan/Basah/Kering), jumlah (pax/demand), alamat (+link Google Maps), koordinat, batas antar (deadline).
- **FR-O2** Sistem hitung `time_window_minutes` dari kategori + suhu (Q10) bila tidak diisi manual.
- **FR-O3** Daftar pesanan dengan filter status & badge risk.

### 6.3 Dispatch (AI)
- **FR-D1** Admin pilih 1 kurir + centang ≥1 pesanan belum ditugaskan.
- **FR-D2** "Optimasi Rute" → Go kirim depot + nodes ke `app.py /routing/optimize` → terima urutan + risk/ETA/jarak per titik.
- **FR-D3** Tampilkan hasil (urutan, jarak, ETA, risk, total) → admin "Kirim ke Kurir".
- **FR-D4** Persist `routes` + `route_assignments`, lalu push notifikasi tugas ke kurir.
- **FR-D5** Bila app.py/NVIDIA gagal → fallback heuristik app.py tetap menghasilkan rute (jangan crash).

### 6.4 Courier Execution
- **FR-C1** Kurir lihat daftar tugas terurut (prioritas risk tertinggi).
- **FR-C2** "Pick Up Semua" → kamera PoD (foto, dikompres client-side, geotag+waktu) → konfirmasi.
- **FR-C3** Dapat rute ke titik #1 (MapLibre + OSRM). Hanya 1 segmen rute dibuka pada satu waktu.
- **FR-C4** Tiba di titik → "Konfirmasi Tiba" + foto PoD → baru terbuka rute titik berikutnya.
- **FR-C5** Setelah semua titik selesai → rute balik ke depot → "Selesaikan Pengantaran".
- **FR-C6** Selama aktif (pickup→selesai), kirim GPS tiap ±5 dtk.

### 6.5 Live Monitoring (Owner)
- **FR-M1** Peta live semua kurir (posisi, heading, status, rute, depot).
- **FR-M2** Panel status per kurir (mirror bottom-sheet): progres x/y, menuju mana, ETA balik depot, km tempuh.
- **FR-M3** Chat real-time ke kurir dari panel.
- **FR-M4** Notifikasi saat kurir pickup/antar/tiba.

### 6.6 Chat & Notifications
- **FR-N1** Pesan terkirim ke pihak lain seketika (delay minimal) via WebSocket; read receipts.
- **FR-N2** Floating notif (heads-up) color-coded: **Merah**=tugas baru/urgensi tinggi, **Kuning**=update rute, **Hijau**=antar sukses, **Biru**=chat.
- **FR-N3** App tertutup/background → push **FCM**.

### 6.7 Analytics
- **FR-S1** Penjualan: hari ini / 1 bln / 6 bln / 1 thn (line/area chart).
- **FR-S2** KPI: penjualan, jumlah antar, on-time %, km armada.
- **FR-S3** Rekap kurir: jumlah antar, total km, on-time (grouped bar). Lazy-load history (default 30 hari terakhir).

### 6.8 Profile
- **FR-P1** Owner edit profil katering termasuk **lokasi depot** (dipakai sebagai titik awal & akhir rute).
- **FR-P2** Kurir lihat/edit profil & kendaraan.

## 7. Non-Functional Requirements
| # | Kategori | Target |
|---|---|---|
| NFR-1 | Realtime latency | GPS & chat propagasi < 1 dtk (WebSocket). |
| NFR-2 | AI routing | Inferensi rute < 200 ms (lihat `app.py` ~<120 ms); bulk = async queue. |
| NFR-3 | Resiliensi | Fallback heuristik AI; offline cache rute terakhir (SQLite mobile); retry GPS. |
| NFR-4 | Keamanan | Multi-tenant `company_id` wajib di setiap query; validasi payload; Catering ID = hash; endpoint enforce `X-Company-ID`. |
| NFR-5 | Aksesibilitas | WCAG 2.2 AA; touch target ≥48dp; warna+label (lihat design.md §10). |
| NFR-6 | Performa | Dashboard lazy-load history (30 hari); kompres foto PoD; vector tiles. |
| NFR-7 | Hemat biaya | Maps gratis (MapLibre + OSM + OSRM), tanpa API Google. |

## 8. Core User Flows
**Owner onboarding:** Landing → Register → Bayar Langganan → Setup Profil/Depot → Dashboard.
**Courier onboarding:** Landing → Join (Catering ID) → Pending → (Approved) → Login → Tugas.
**AI dispatch loop:** Input pesanan → Pilih kurir+pesanan → Optimasi (Go→app.py) → Persist → Notif kurir → Kurir pickup(PoD) → rute bertahap(PoD/titik) → balik depot → selesai. GPS streaming sepanjang proses.
**Landing:** Hero + fitur + CTA "Download for Android (APK)".

## 9. Success Metrics
- Waktu dispatch ↓ (manual → < 1 menit per batch).
- On-time delivery ↑ (target ≥ 90%).
- 0 kebocoran data antar katering.
- Kurir bisa selesaikan loop tanpa bingung urutan (usability).

## 10. QA / Acceptance Checklist
- [ ] Fallback AI (heuristik) jalan saat NVIDIA/app.py error.
- [ ] Offline: mobile cache koordinat & rute terakhir saat sinyal fluktuatif.
- [ ] PoD: gambar dikompres client-side sebelum upload.
- [ ] WCAG 2.2 AA (kontras dicek); tombol Konfirmasi ≥48dp.
- [ ] Dashboard lazy-load riwayat kurir (default 30 hari).
- [ ] Semua endpoint enforce `X-Company-ID` / company scope.
- [ ] Cold start splash mulus; map pakai vector tiles (ringan).
- [ ] Edge: kurir batalkan di tengah → status `route_assignments` terupdate + admin dapat notif.
