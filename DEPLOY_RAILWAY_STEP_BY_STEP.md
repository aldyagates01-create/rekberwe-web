# Deploy Railway Step by Step

Panduan ini untuk membuat `RekberWE.id` online **tanpa domain sendiri dulu**, memakai URL Railway seperti:

- `https://nama-project-anda.railway.app`

## 1. Rapikan folder project

Pastikan yang Anda upload adalah folder:

- `rekber-web`

Isi penting yang harus ada:

- `package.json`
- `server/server.js`
- `server/database.js`
- `app.js`
- `admin.js`
- `index.html`
- `admin.html`
- `styles.css`
- `assets/`
- `railway.json`

## 2. Buat repository GitHub

Jika belum punya repo:

1. Buka GitHub
2. Klik `New repository`
3. Isi nama repo, misalnya:
   - `rekberwe-web`
4. Klik `Create repository`

## 3. Upload project ke GitHub

### Opsi paling mudah: upload manual via web GitHub

1. Buka repository GitHub yang baru dibuat
2. Klik `uploading an existing file`
3. Masuk ke folder:
   - `C:\FOLDER BOT TELEGRAM\qhead01(bot balas chat)\rekber-web`
4. Drag semua isi folder `rekber-web` ke halaman GitHub
5. Tunggu selesai upload
6. Scroll ke bawah
7. Isi commit message:
   - `first upload rekber web`
8. Klik `Commit changes`

### Catatan

Jangan upload file berikut:

- `.env`
- `node_modules`
- `data`
- `uploads`

File-file ini sudah diblok oleh `.gitignore`.

## 4. Buat project di Railway

1. Buka:
   - `https://railway.app`
2. Login dengan GitHub
3. Klik `New Project`
4. Klik `Deploy from GitHub Repo`
5. Pilih repo:
   - `rekberwe-web`

Railway akan mulai build otomatis.

## 5. Tentukan penyimpanan data

Sekarang ada 2 pilihan:

### Opsi A - PostgreSQL / Supabase (Disarankan)

Ini paling aman untuk:

- chat
- transaksi
- user
- verifikasi

Jika memakai opsi ini, isi:

- `DATABASE_URL`
- `DATABASE_SSL=true`

Contoh:

- `DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`
- `DATABASE_SSL=true`

Jika Anda ingin mengimpor data lama dari SQLite satu kali saat boot:

- `MIGRATE_SQLITE_ON_BOOT=true`
- `SQLITE_IMPORT_PATH=/data/rekberwe.sqlite`

### Opsi B - SQLite + Volume

Kalau belum siap memakai PostgreSQL, Anda masih bisa pakai SQLite.
Untuk opsi ini Anda **wajib** menambahkan volume.

Langkah:

1. Di project Railway, buka service aplikasi Anda
2. Klik tab / menu `Volumes`
3. Tambahkan volume baru
4. Mount path isi:
   - `/data`

## 6. Isi Environment Variables

Masuk ke:

- `Service` → `Variables`

Lalu isi variabel berikut:

### Wajib

- `APP_BASE_URL`
- `SESSION_SECRET`
- `ADMIN_USER_IDS`

### Contoh untuk Railway

- `APP_BASE_URL=https://nama-project-anda.railway.app`
- `SESSION_SECRET=isi-random-panjang-dan-rahasia`
- `ADMIN_USER_IDS=google-1234567890`

### Jika pakai SQLite + Volume

- `DATA_DIR=/data`
- `UPLOADS_DIR=/data/uploads`

### Jika pakai PostgreSQL / Supabase

- `DATABASE_URL=postgresql://...`
- `DATABASE_SSL=true`
- `DATA_DIR=/data` (opsional, hanya jika mau import SQLite lama)
- `UPLOADS_DIR=/data/uploads` (opsional fallback lokal)
- `MIGRATE_SQLITE_ON_BOOT=true` (opsional, satu kali import)
- `SQLITE_IMPORT_PATH=/data/rekberwe.sqlite` (opsional)

### OAuth Provider

Isi juga semua provider yang ingin dipakai:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `TELEGRAM_CLIENT_ID`
- `TELEGRAM_CLIENT_SECRET`

### Upload Media ke Cloudinary

Jika Anda ingin foto, video, dan file bukti tersimpan aman walau Railway restart, isi juga:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`

Contoh:

- `CLOUDINARY_CLOUD_NAME=abcd1234`
- `CLOUDINARY_API_KEY=123456789012345`
- `CLOUDINARY_API_SECRET=rahasia-cloudinary-anda`
- `CLOUDINARY_FOLDER=rekberwe`

Jika variable Cloudinary diisi, upload media akan langsung masuk ke Cloudinary.
Jika belum diisi, sistem otomatis fallback ke folder lokal `UPLOADS_DIR`.

## 7. Generate domain Railway

Setelah deploy selesai:

1. Buka service Anda di Railway
2. Buka `Settings` atau `Networking`
3. Klik `Generate Domain`

Nanti Anda akan mendapatkan URL seperti:

- `https://rekberwe-production.up.railway.app`

Gunakan URL itu untuk `APP_BASE_URL`.

## 8. Redeploy setelah env diisi

Setelah semua variable diisi:

1. Klik `Redeploy`
2. Tunggu sampai status sukses

## 9. Update callback OAuth

Ini langkah **wajib** supaya login social media tetap jalan di website live.

Ganti semua callback URL ke domain Railway Anda.

Format callback:

- Google:
  - `https://domain-anda.railway.app/auth/google/callback`
- Facebook:
  - `https://domain-anda.railway.app/auth/facebook/callback`
- Discord:
  - `https://domain-anda.railway.app/auth/discord/callback`
- Telegram:
  - `https://domain-anda.railway.app/auth/telegram/callback`

## 10. Tes website live

Tes satu per satu:

1. Homepage terbuka
2. Login Google berhasil
3. Profil tampil
4. Pengaturan admin bisa dibuka
5. Fee tampil di homepage
6. Buat transaksi baru
7. Chat realtime jalan
8. Upload bukti jalan
9. Refresh halaman, file bukti tetap ada

## 11. Jika deploy gagal

Cek urutan berikut:

1. `APP_BASE_URL` sudah benar atau belum
2. Volume sudah dipasang atau belum
3. `DATA_DIR=/data` sudah diisi atau belum
4. `UPLOADS_DIR=/data/uploads` sudah diisi atau belum
5. Callback OAuth sudah diarahkan ke domain Railway atau belum
6. `ADMIN_USER_IDS` sudah benar atau belum

## 13. Frontend Next.js (Chat Mobile)

Project sekarang punya frontend Next.js di folder `web/` untuk chat transaksi mobile.

Route baru:

- `/transaksi/[code]` — chat transaksi mobile (dark mode, collapsible summary)
- `/transaksi/[code]/detail` — detail transaksi terpisah

Build wajib di Railway:

- `npm run build` (sudah di `railway.json`)

Env opsional:

- `USE_NEXT_FRONTEND=true` (default aktif)

Di mobile, app legacy otomatis redirect ke `/transaksi/[code]` saat membuka ruang chat.

## 12. Rekomendasi setelah live tes berhasil

Setelah tes berhasil, langkah berikutnya yang disarankan:

- pakai PostgreSQL / Supabase untuk data permanen
- simpan upload ke Cloudinary
- aktifkan domain sendiri
- aktifkan HTTPS callback final di semua provider
