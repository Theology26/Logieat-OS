# LogiEat OS — Landing Page

Halaman promosi LogiEat OS (HTML + Three.js + GSAP). Menampilkan hero phone 3D dengan
**screenshot asli APK**, galeri tampilan aplikasi, fitur, dan tombol unduh APK.

## Menjalankan
Buka `index.html` langsung di browser, atau serve sederhana:
```bash
python -m http.server 5500    # lalu buka http://localhost:5500
```

## Catatan
- Tombol **"Masuk"** mengarah ke dashboard admin web (`http://localhost:8001/login`).
- Gambar di `shots/` adalah screenshot asli dari APK (lihat juga `../docs/screenshots/`).
- Tombol unduh menunjuk ke `app-kurir.apk` / `app-manager.apk` (taruh file APK di folder ini bila ingin aktif).
