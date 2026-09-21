# RekberWE Admin Desktop (Windows)

Aplikasi PC **khusus dashboard admin** — hanya membuka `https://rekberwe.id/admin`.

## Alur pakai

1. Buka aplikasi → langsung ke halaman login/dashboard admin
2. Pilih **Login Google** (atau Discord / Telegram)
3. Login di dalam jendela aplikasi (bukan browser terpisah)
4. Setelah sukses → **langsung kembali ke dashboard admin**

Session tersimpan di aplikasi, jadi biasanya tidak perlu login ulang setiap buka.

## Fitur

- Khusus `/admin` (bukan website user)
- Login Google tetap di dalam app (User-Agent Chrome)
- Auto-redirect ke `/admin` jika OAuth sempat mendarat di homepage
- Notifikasi Windows native untuk order/chat baru
- System tray (tutup window = minimize ke tray)
- Live event tetap aktif saat di-minimize
- Single instance

## Konfigurasi

Edit `config.json`:

```json
{
  "adminUrl": "https://rekberwe.id/admin",
  "openAtLogin": false,
  "minimizeToTray": true
}
```

Atau environment:

```powershell
$env:REKBER_ADMIN_URL="http://localhost:3000/admin"
npm start
```

## Development

```powershell
cd admin-desktop
npm install
npm start
```

## Build .exe

```powershell
cd admin-desktop
npm install
npm run build:win
```

Output di `admin-desktop/dist/`:

| File | Kegunaan |
|------|----------|
| `RekberWE Admin Setup 1.1.0.exe` | Installer (disarankan) |
| `RekberWE Admin 1.1.0.exe` | Portable (tanpa install) |

PC tujuan hanya butuh Windows 10/11 + internet — **tidak perlu Node.js**.
