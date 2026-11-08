# Panduan Setup Area Barat POS

Aplikasi kasir coffee shop: Next.js (deploy ke Vercel) + Google Spreadsheet sebagai database, dihubungkan lewat Google Apps Script.

**Halaman:**
| Halaman | Alamat | Login |
|---|---|---|
| Pelanggan (pesan & lacak) | `/` | Tanpa login |
| Login staff | `/login` | — |
| Kasir | `/kasir` | `kasir` / `kasir` (default, ganti lewat Panel Bos) |
| Bos (menu, QRIS, laporan, akun staff) | `/bos` | `bos` / `bos` (default, ganti lewat Panel Bos) |
| Developer (log, diagnostik, maintenance) | `/dev` | `dev` / `DEV_PASSWORD` |

> **Penting:** ganti password default sebelum dipakai betulan. Akun **kasir & bos** diganti lewat **Panel Bos → Akun Staff** (langkah 5); akun **dev** lewat env var `DEV_PASSWORD` (langkah 4).

---

## Langkah 1 — Siapkan Spreadsheet

1. Buat spreadsheet kosong baru di Google Sheets (atau pakai milikmu sendiri), lalu buka. Link spreadsheet-nya jangan dibagikan.
2. **Batasi akses:** klik **Share** → ubah General access menjadi **Restricted** (hanya akun Google kamu). Aplikasi tidak butuh spreadsheet ini publik — bridge berjalan sebagai pemilik.
3. Kosongkan isi sheet jika ada data lama yang tidak dipakai (tab `Menu`, `Orders`, `Settings`, `Accounts`, `Logs`, `Reviews` akan dibuat otomatis oleh script).

## Langkah 2 — Pasang Bridge Apps Script

1. Di spreadsheet, buka **Extensions → Apps Script**.
2. Hapus kode contoh di editor, lalu **salin seluruh isi file [`apps-script/Code.gs`](apps-script/Code.gs)** dari project ini ke editor tersebut. Simpan (ikon disket).
3. Di dropdown fungsi (atas), pilih **`setup`**, klik **Run**.
4. Muncul permintaan izin Google: **Review permissions** → pilih akun kamu → **Advanced** → **Go to (nama project) (unsafe)** → **Allow**. (Wajar muncul "unsafe" karena ini script buatan sendiri, belum diverifikasi Google.)
5. Cek spreadsheet: sekarang ada tab **Menu**, **Orders**, **Settings**, **Accounts**, **Logs**, **Reviews** dengan header, dan folder **Area Barat - Assets** di Google Drive kamu (tempat foto menu & QR QRIS).

> **Upgrade dari versi lama:** kalau spreadsheet kamu sudah pernah dipakai versi sebelumnya, salin ulang seluruh `Code.gs` terbaru ke editor Apps Script lalu **Deploy → Manage deployments → Edit → Version: New version → Deploy**. Tab `Reviews` dibuat otomatis saat pertama kali dipakai (atau lewat `/dev` → Perbaikan Otomatis); data lama tidak hilang.

## Langkah 3 — Deploy Bridge sebagai Web App

1. Di editor Apps Script: **Deploy → New deployment**.
2. Klik ikon gerigi → pilih **Web app**.
3. Isi:
   - **Description:** `Area Barat bridge`
   - **Execute as:** **Me** (akun Google kamu)
   - **Who has access:** **Anyone**
4. Klik **Deploy**, izinkan lagi jika diminta, lalu **salin Web app URL** (bentuknya `https://script.google.com/macros/s/..../exec`).

> "Anyone" di sini aman: setiap request wajib menyertakan `BRIDGE_SECRET` yang tertanam di script. Tanpa secret itu, request ditolak. Jangan bagikan URL + secret ke siapa pun.

## Langkah 4 — Deploy ke Vercel

1. Push project ini ke GitHub (atau gunakan Vercel CLI: `npx vercel`).
2. Di [vercel.com](https://vercel.com): **Add New → Project** → import repo → framework terdeteksi **Next.js** → biarkan build command default.
3. Sebelum klik Deploy, buka **Environment Variables**, tambahkan:

   | Name | Value |
   |---|---|
   | `GOOGLE_SCRIPT_URL` | Web app URL dari langkah 3 |
   | `GOOGLE_SCRIPT_SECRET` | kunci rahasia milikmu — sama persis dengan `BRIDGE_SECRET` di `apps-script/Code.gs` |
   | `SESSION_SECRET` | teks acak panjang, min. 32 karakter (lihat `.env.example`) |
   | `DEV_PASSWORD` | password baru untuk dev |

   > Akun **kasir & bos tidak pakai env var** — keduanya disimpan di database dan diatur lewat **Panel Bos → Akun Staff** setelah deploy (langkah 5). Password default pertama: `kasir`/`kasir` dan `bos`/`bos`.

4. Klik **Deploy**. Selesai — buka URL Vercel kamu.
5. Setiap kali mengubah env var: **Deployments → ... → Redeploy** agar berlaku.

> Kalau kamu pernah mengubah `BRIDGE_SECRET` di Code.gs, samakan juga nilai `GOOGLE_SCRIPT_SECRET` di Vercel, lalu **Deploy → New deployment** ulang di Apps Script (atau Manage deployments → Edit → New version).

## Langkah 5 — Isi Kedai Kamu

1. Login sebagai **bos** → tab **Kelola Menu** → hapus menu contoh (kalau ada) → **Tambah Menu** (nama, kategori, harga, deskripsi, foto).
2. Tab **QRIS & Kedai** → upload **QR QRIS statis** kedai kamu → isi nama kedai & pengumuman (opsional). QR ini nanti ditampilkan kasir ke pembeli saat bayar, dengan nominal yang otomatis sesuai pesanan.
3. Tab **Akun Staff** → ganti password `kasir` dan `bos` dari default, tambah admin/kasir lain bila perlu. Username & password tersimpan di database; sesi login lama otomatis keluar saat akun diubah.
4. Login sebagai **kasir** di perangkat kasir → tab **Pesanan**. Aktifkan tombol **Aktifkan Suara** sekali agar pesanan baru berbunyi.
5. Pelanggan tinggal buka URL utama (atau scan QR yang mengarah ke URL itu) — tanpa login.

---

## Pemakaian Harian

- **Pelanggan:** pilih menu → keranjang → isi nama & meja → pilih Tunai/QRIS → kirim. Halaman lacak update otomatis tiap ±4 detik: Diterima → Dibuat → **Siap** → Selesai. Saat **Siap**, alarm lembut **berbunyi terus sampai pelanggan menekan "Oke, Saya Ambil"** (+ getar di HP), supaya tidak terlewat. **Semua pembayaran di meja kasir** saat ambil pesanan (bukan di halaman ini) — kalau QRIS, kasir menunjukkan QR + nominal yang sesuai; kalau Tunai, siapkan uang. Setelah selesai, pelanggan bisa **Simpan Nota** (foto PNG rapi, langsung masuk galeri / dibagikan) atau **Cetak**, lalu memberi **ulasan bintang + komentar** yang masuk ke laporan bos.
- **Kasir:** pesanan baru muncul otomatis + notif suara. Alur: **Proses → Siap → terima pembayaran di meja kasir → Selesaikan**. Untuk QRIS klik **Tunjukkan QRIS** (QR + nominal otomatis tampil untuk discan pembeli), cek mutasi, lalu **Konfirmasi Lunas**; untuk Tunai klik **Tandai Lunas** setelah terima uang. Pesanan **tidak bisa diselesaikan sebelum lunas** (anti-curang). Menu habis? Tab **Ketersediaan Menu** → matikan — pelanggan langsung lihat label "Habis".
- **Bos:** tab **Laporan** — pendapatan lunas, pesanan, item terlaris, metode bayar, grafik harian (Hari Ini / 7 / 30 hari), **ulasan pelanggan** (rata-rata bintang, sebaran rating, daftar komentar), export **CSV** (bisa dibuka di Excel/Sheets), semua auto-update. Tab **Akun Staff** — ganti username/password kasir & bos, tambah admin, hapus akun.
- **Developer:** tab **Log** (error browser & server tercatat otomatis, update 10 detik), **Diagnostik** (cek koneksi & struktur database, tombol **Jalankan Perbaikan Otomatis** untuk membuat ulang tab/header/folder yang hilang tanpa menghapus data), **Sistem** (mode maintenance + **Reset Akun Staff** bila bos lupa password / terkunci di luar).

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Halaman staff tampil "Database belum dikonfigurasi" (503) | `GOOGLE_SCRIPT_URL` / `GOOGLE_SCRIPT_SECRET` belum diisi di Vercel, atau belum Redeploy setelah mengisinya. |
| Semua request database gagal (502) | Secret tidak cocok dengan `BRIDGE_SECRET` di Code.gs, atau deployment Apps Script belum di-update ke versi terbaru. Cek tab **Diagnostik** di `/dev`. |
| Foto tidak muncul | Jalankan **Perbaikan Otomatis** di `/dev` (membuat ulang folder Drive). Pastikan izin Drive sudah diberikan saat run `setup`. |
| Pesanan lambat masuk | Normal di mode gratis: Apps Script butuh ±1–3 detik per request. Aplikasi sudah pakai cache + polling hemat kuota. Jangan spam refresh. |
| Lupa password kasir/bos | Login sebagai bos → **Akun Staff** → edit akun → ganti password. Kalau semua akun bos terkunci: login **dev** → **Sistem** → **Reset Akun Staff** (kembali ke default, lalu segera ganti). |
| Lupa password dev | Ubah env var `DEV_PASSWORD` di Vercel → Redeploy. |
| Tab/header spreadsheet terhapus tidak sengaja | `/dev` → Diagnostik → **Jalankan Perbaikan Otomatis**. Data baris yang tersisa tidak dihapus. |

## Catatan Keamanan (jujur)

Tidak ada sistem yang 100% mustahil dibobol — tapi aplikasi ini sudah memakai lapisan proteksi standar industri:

- Sesi login: cookie HTTP-only + terenkripsi (JWT HS256), berlaku 12 jam, otomatis kedaluwarsa.
- Password disimpan sebagai hash SHA-256 + salt (bukan plaintext), dibandingkan secara timing-safe. Akun kasir/bos diganti lewat Panel Bos, dev lewat env var; sesi login lama otomatis keluar saat akun diubah/dihapus.
- Semua endpoint staff/dev dilindungi middleware + cek role per API (kasir tidak bisa ubah menu/laporan, dst).
- Harga & ketersediaan dihitung ulang di server — pelanggan tidak bisa memanipulasi harga.
- Link lacak memakai token acak 128-bit (tidak bisa ditebak); QR QRIS hanya bisa dilihat staff yang login. Semua pembayaran dikonfirmasi kasir di meja kasir — tidak ada upload bukti dari pelanggan yang bisa dipalsukan, dan pesanan tak bisa selesai sebelum lunas.
- Rate limiting di login & endpoint publik; input divalidasi; formula injection ke spreadsheet dicegah.
- Header keamanan (CSP, anti-clickjacking, nosniff) aktif.

**Yang harus kamu lakukan agar tetap aman:**
1. Ganti password default `kasir`/`bos` lewat **Panel Bos → Akun Staff**, dan `dev` lewat `DEV_PASSWORD` — ini titik terlemah kalau dibiarkan.
2. Jaga spreadsheet tetap **Restricted** (jangan "Anyone with the link").
3. Jangan bagikan `GOOGLE_SCRIPT_SECRET` / `SESSION_SECRET` / URL bridge ke siapa pun.
4. Kalau curiga ada kebocoran: ganti `BRIDGE_SECRET` di Code.gs + Vercel, ganti password, deploy ulang. Sesi lama otomatis tidak berlaku jika `SESSION_SECRET` diganti.

## Development Lokal

```bash
npm install
npm run dev
```

Tanpa env var, aplikasi berjalan dalam **mode demo** (data lokal di `.data/`, bukan spreadsheet) — enak untuk coba-coba. Untuk mengetes koneksi spreadsheet sungguhan dari lokal, salin `.env.example` menjadi `.env.local` dan isi nilainya.