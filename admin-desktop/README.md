# RekberWE Admin Desktop (Windows)

Aplikasi PC khusus **dashboard admin** RekberWE. Memuat halaman admin dari server (production atau lokal) dengan:

- Notifikasi Windows native saat ada order/chat baru
- System tray (tutup window = minimize ke tray, tidak keluar)
- Koneksi live event tetap aktif saat window di-minimize
- Single instance (hanya satu app admin terbuka)

## Persyaratan

- Windows 10/11
- Node.js 20+

## Konfigurasi URL

Edit `config.json`:

```json
{
  "adminUrl": "https://rekberwe.id/admin",
  "openAtLogin": false,
  "minimizeToTray": true
}
```

Atau set environment variable:

```powershell
$env:REKBER_ADMIN_URL="http://localhost:3000/admin"
npm start
```

## Jalankan (development)

```powershell
cd admin-desktop
npm install
npm start
```

Pastikan server RekberWE sudah berjalan jika memakai URL lokal.

## Build file .exe Windows (bisa di-install di PC lain)

Di PC yang punya Node.js (biasanya PC developer):

```powershell
cd admin-desktop
npm install
npm run build:win
```

Output ada di `admin-desktop/dist/`:

| File | Kegunaan |
|------|----------|
| `RekberWE Admin Setup x.x.x.exe` | **Installer** — untuk install di PC lain (disarankan) |
| `RekberWE Admin x.x.x.exe` | **Portable** — bisa langsung jalan tanpa install |

**Cara pasang di PC lain:**
1. Copy file `RekberWE Admin Setup x.x.x.exe` ke PC tujuan (USB, Google Drive, dll.)
2. Double-click → Next → Install
3. Buka dari shortcut desktop / Start Menu
4. PC lain **tidak perlu** Node.js — cukup Windows 10/11 + internet

## Alur login di aplikasi

```
Buka app → Layar login admin → Pilih Google / Telegram / Discord
    → Dialihkan ke halaman login provider (di dalam app)
    → Setelah sukses, kembali otomatis ke dashboard admin di app
```

Session login tersimpan di aplikasi (cookie), jadi biasanya **tidak perlu login ulang** setiap buka app.

## Catatan

- Login admin tetap lewat web (session cookie disimpan di app).
- Notifikasi desktop aktif otomatis saat dibuka lewat app ini.
- Untuk auto-start saat Windows nyala, set `"openAtLogin": true` di `config.json` lalu build ulang / jalankan ulang app.
