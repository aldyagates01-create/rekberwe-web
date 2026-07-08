# Checklist Deploy Live — Voucher / Gametime

Gunakan dokumen ini **sebelum** membuka fitur voucher/gametime ke publik.

## 1. Environment wajib

Tambahkan ke `.env` production (jangan commit file ini):

```env
SESSION_SECRET=<random-string-panjang-unik>
VOUCHER_CREDENTIALS_KEY=<random-string-min-32-karakter-terpisah-dari-SESSION_SECRET>
```

`VOUCHER_CREDENTIALS_KEY` dipakai untuk enkripsi AES-256-GCM email & password akun subscription di database.

## 2. Restart server setelah set env

Saat startup, migrasi otomatis mengenkripsi kredensial plaintext lama. Cek log:

```
[voucher-crypto] X order voucher — kredensial dienkripsi.
```

## 3. Cloudinary (jika aktif)

- Upload sensitif (bukti TF, lampiran chat voucher) memakai mode **authenticated**, bukan public.
- Pastikan plan Cloudinary mendukung authenticated delivery.
- URL file sensitif di-resolve ke **signed URL** (exp ~1 jam) saat dikirim ke client.

## 4. Keamanan yang sudah aktif

| Item | Status |
|------|--------|
| Bypass `submit_payment` tanpa bukti TF | ✅ Diblok |
| Enkripsi kredensial di DB | ✅ (butuh `VOUCHER_CREDENTIALS_KEY`) |
| Response 404 seragam (anti enumerasi order) | ✅ |
| Sanitasi WebSocket voucher | ✅ |
| Rate limit create order (15/jam) | ✅ |
| Rate limit lookup order (40/menit) | ✅ |
| Strip kredensial di list order user | ✅ |
| Stok atomik + manual decrement | ✅ |
| MIME bukti TF: JPG/PNG/WEBP saja | ✅ |

## 5. Jangan commit ke git

- `data/rekberwe.sqlite` / file WAL-SHM
- `.env`
- `uploads/` (bukti transfer, KTP, dll.)

## 6. Verifikasi manual sebelum go-live

- [ ] Buat order voucher → upload bukti TF → admin konfirmasi → selesai
- [ ] Coba akses order orang lain → harus 404
- [ ] Coba `POST /actions` dengan `submit_payment` tanpa file → harus gagal
- [ ] Cek DB: kolom `account_password` berformat `enc:v1:...` (bukan plaintext)
- [ ] Login pembeli: kredensial akun hanya tampil di detail order (bukan di list)
- [ ] Order manual admin: stok berkurang, profit di laporan benar

## 7. Rollback plan

- Backup `data/rekberwe.sqlite` sebelum deploy
- Simpan salinan `VOUCHER_CREDENTIALS_KEY` di password manager — **tanpa key ini data kredensial tidak bisa didekripsi**
