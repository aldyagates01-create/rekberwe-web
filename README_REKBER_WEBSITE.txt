REKBER WEBSITE

Folder ini sekarang berisi frontend + backend Node.js/Express untuk website rekber.

Struktur utama:
- index.html
- admin.html
- styles.css
- app.js
- admin.js
- package.json
- .env.example
- server/server.js
- server/database.js
- data/rekberwe.sqlite

Fitur login yang sudah disiapkan:
- Telegram web auth / OAuth style login
- Google OAuth
- Facebook Login OAuth
- Discord OAuth
- Session login backend dengan cookie
- Tombol login dengan logo social masing-masing

Fitur backend yang sudah disiapkan:
- Penyimpanan user ke SQLite
- Penyimpanan transaksi ke SQLite
- Penyimpanan chat transaksi ke SQLite
- Penyimpanan daftar upload bukti ke SQLite
- Simpan verifikasi KTP dan WhatsApp ke SQLite
- Dashboard admin terpisah di `/admin`

Cara menjalankan:
1. Buka folder `rekber-web`
2. Jalankan `npm install`
3. Copy `.env.example` menjadi `.env`
4. Isi semua `CLIENT_ID` dan `CLIENT_SECRET`
5. Jalankan `npm start`
6. Buka `http://localhost:3000`

Redirect URI yang perlu didaftarkan:
- Google: `http://localhost:3000/auth/google/callback`
- Facebook: `http://localhost:3000/auth/facebook/callback`
- Discord: `http://localhost:3000/auth/discord/callback`
- Telegram: `http://localhost:3000/auth/telegram/callback`

Catatan penting:
- Data utama transaksi sekarang disimpan di SQLite
- Session login disimpan di server via cookie
- Verifikasi KTP dan WhatsApp sekarang disimpan di backend/database
- Untuk production, ubah `APP_BASE_URL`, `SESSION_SECRET`, dan pakai HTTPS

Catatan Telegram:
- Telegram di sini tidak lagi memakai bot deep-link
- Backend memakai flow web auth Telegram dan verifikasi `id_token`
- Anda tetap perlu mendaftarkan app Telegram dan mengisi `TELEGRAM_CLIENT_ID` serta `TELEGRAM_CLIENT_SECRET`

Cara tes login social:
1. Isi `.env` dengan `CLIENT_ID` dan `CLIENT_SECRET` provider yang ingin dites
2. Jalankan `npm start`
3. Buka `http://localhost:3000`
4. Klik tombol login provider yang ingin dites
5. Login di halaman resmi provider
6. Jika sukses, browser akan kembali ke website dan status login tampil di kartu pengguna

Cara tes Telegram:
1. Pastikan app Telegram web auth sudah dibuat
2. Pastikan redirect URI Telegram cocok dengan `.env`
3. Isi `TELEGRAM_CLIENT_ID` dan `TELEGRAM_CLIENT_SECRET`
4. Klik tombol `Telegram`
5. Setelah approve, website harus kembali ke `/auth/telegram/callback` lalu masuk otomatis

Cara tes Google / Facebook / Discord:
1. Daftarkan redirect URI resmi provider
2. Isi kredensial di `.env`
3. Klik tombol provider yang sesuai
4. Selesaikan consent/login
5. Pastikan website kembali ke homepage dalam status login

Cara tes admin:
1. Login dulu dengan salah satu akun social
2. Lihat `ID sosial` akun yang masuk
3. Set `ADMIN_USER_IDS` di `.env` dengan format `provider-id`, contoh `google-123456789`
4. Restart server
5. Login ulang, lalu buka `http://localhost:3000/admin`

Alur halaman terbaru:
- Homepage hanya menampilkan panduan dan login/daftar
- Setelah login, area profil pengguna dan form transaksi baru akan muncul di homepage
- Dashboard admin dipisah ke alamat `/admin`
