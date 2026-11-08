'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { setDateLocale } from './money';

export type Lang = 'id' | 'en';

// Kunci = teks sumber bahasa Indonesia. Nilai = terjemahan Inggris.
// Teks yang tidak ada di kamus tetap tampil apa adanya (fallback aman).
export const EN: Record<string, string> = {
  // Umum
  'Bahasa': 'Language',
  'Ganti bahasa': 'Change language',
  'Pilih bahasa': 'Choose language',
  'Tutup': 'Close',
  'Tutup notifikasi': 'Close notification',
  'Batal': 'Cancel',
  'Kembali': 'Back',
  'Coba Lagi': 'Try Again',
  'Ya, Lanjutkan': 'Yes, Continue',
  'Memuat…': 'Loading…',
  'Memproses…': 'Processing…',
  'Mengirim…': 'Sending…',
  'Menyimpan…': 'Saving…',
  'Membuat…': 'Creating…',
  'Memeriksa…': 'Checking…',
  'Memperbarui…': 'Updating…',
  'Memperbaiki…': 'Repairing…',
  'Gagal memuat data': 'Failed to load data',
  'Total': 'Total',
  'Kode': 'Code',
  'Waktu': 'Time',
  'Pelanggan': 'Customer',
  'Meja': 'Table',
  'Metode': 'Method',
  'Catatan': 'Note',
  'Edit': 'Edit',
  'Hapus': 'Delete',
  'Semua': 'All',
  'Tersedia': 'Available',
  'Habis': 'Sold out',
  'Kasir': 'Cashier',
  'Bos': 'Owner',
  'Akun': 'Account',
  'dan': 'and',
  'Foto': 'Photo',
  // Label status (lib/types)
  'Baru': 'New',
  'Diproses': 'In progress',
  'Siap': 'Ready',
  'Selesai': 'Completed',
  'Dibatalkan': 'Cancelled',
  'Belum Bayar': 'Unpaid',
  'Lunas': 'Paid',
  'Tunai': 'Cash',
  // Filter kasir & log (huruf kecil, ditampilkan capitalize)
  'aktif': 'active',
  'baru': 'new',
  'siap': 'ready',
  'riwayat': 'history',
  'semua': 'all',
  'diproses': 'in progress',
  'selesai': 'completed',
  'batal': 'cancelled',
  'belum_bayar': 'unpaid',
  'lunas': 'paid',
  // Halaman pelanggan
  'Ilustrasi hutan Area Barat — tupai menikmati secangkir kopi hangat saat senja': 'Area Barat forest illustration — a squirrel enjoying a warm cup of coffee at dusk',
  'Pesan dari mejamu, pantau pesananmu langsung di sini.': 'Order from your table and track your order right here.',
  'Pesanan Saya': 'My Orders',
  'WiFi kedai': "Café WiFi",
  'Salin sandi': 'Copy password',
  'Tersalin': 'Copied',
  'Sandi gagal disalin. Salin manual ya.': 'Could not copy the password. Please copy it manually.',
  'WiFi untuk pelanggan': 'WiFi for customers',
  'Nama WiFi': 'WiFi name',
  'Sandi WiFi': 'WiFi password',
  'Contoh: Area Barat Guest': 'e.g. Area Barat Guest',
  'Contoh: kopihutan123': 'e.g. forestcoffee123',
  'Nama dan sandi tampil di halaman pelanggan. Kosongkan nama WiFi untuk menyembunyikan.': 'The name and password appear on the customer page. Leave the WiFi name empty to hide it.',
  'Kedai sedang tidak menerima pesanan online untuk sementara. Menu tetap bisa dilihat.': 'The shop is temporarily not accepting online orders. You can still browse the menu.',
  'Cari menu…': 'Search menu…',
  'Cari menu': 'Search menu',
  'Kategori menu': 'Menu categories',
  '{n} item': '{n} items',
  'Lihat Keranjang': 'View Cart',
  'Detail Pemesanan': 'Checkout',
  'Keranjang': 'Cart',
  'Sedang habis — hapus dari keranjang': 'Sold out — remove from cart',
  'Hapus {nama}': 'Remove {nama}',
  'Lanjut ke Pemesanan': 'Continue to Checkout',
  'Pesanan terkirim ke kasir!': 'Order sent to the cashier!',
  'Kurangi': 'Decrease',
  'Tambah': 'Add',
  'Tambah {nama} ke keranjang': 'Add {nama} to cart',
  'Nama Kamu': 'Your Name',
  'Contoh: Budi': 'e.g. Budi',
  'Nomor Meja': 'Table Number',
  'Contoh: 5 (atau tulis Bawa Pulang)': 'e.g. 5 (or write Takeaway)',
  'Metode Pembayaran': 'Payment Method',
  '(belum tersedia)': '(not available yet)',
  'Bayar di meja kasir saat ambil pesanan — kasir menunjukkan QR QRIS dengan nominal yang sesuai.': 'Pay at the cashier desk when you pick up — the cashier shows the QRIS QR with the exact amount.',
  'Bayar tunai di meja kasir saat mengambil pesanan.': 'Pay cash at the cashier desk when picking up your order.',
  'Catatan (opsional)': 'Note (optional)',
  'Contoh: es batu sedikit saja': 'e.g. less ice, please',
  'Kirim Pesanan': 'Place Order',
  'Gagal mengirim pesanan.': 'Failed to send the order.',
  'Menu tidak ditemukan': 'No menu found',
  'Belum ada menu. Bos bisa menambahkannya di halaman Bos.': 'No menu yet. The owner can add items in the Owner panel.',
  'Coba kata kunci atau kategori lain.': 'Try another keyword or category.',
  'Keranjang kosong': 'Your cart is empty',
  'Yuk pilih menu favoritmu dulu.': 'Pick your favorites first.',
  // Lacak pesanan
  'Pesananmu sedang dibuat barista.': 'The barista is making your order.',
  'Pesanan dibatalkan.': 'Order cancelled.',
  'Pesanan selesai. Terima kasih!': 'Order completed. Thank you!',
  'SIAP! Ambil & bayar di kasir — Area Barat': 'READY! Pick up & pay at the cashier — Area Barat',
  'Selesai — Area Barat': 'Completed — Area Barat',
  'Lacak Pesanan — Area Barat': 'Track Order — Area Barat',
  'Alarm dimatikan. Selamat menikmati!': 'Alarm off. Enjoy!',
  'Alarm siap dinyalakan.': 'Ready alarm turned on.',
  'Alarm siap dimatikan.': 'Ready alarm turned off.',
  'Nota dibagikan — simpan ke galeri.': 'Receipt shared — save it to your gallery.',
  'Nota diunduh sebagai foto (PNG).': 'Receipt downloaded as a photo (PNG).',
  'Gagal membuat foto nota.': 'Failed to create the receipt photo.',
  'Terima kasih atas ulasanmu!': 'Thanks for your review!',
  'Pesanan tidak ditemukan': 'Order not found',
  'Link pesanan tidak valid.': 'Invalid order link.',
  'Kembali ke Menu': 'Back to Menu',
  'Matikan alarm pesanan siap': 'Turn off ready alarm',
  'Nyalakan alarm pesanan siap': 'Turn on ready alarm',
  'Koneksi terganggu: {error}. Mencoba lagi otomatis…': 'Connection interrupted: {error}. Retrying automatically…',
  'Kode Pesanan': 'Order Code',
  'Meja {meja}': 'Table {meja}',
  'Pesanan Dibatalkan': 'Order Cancelled',
  'Kalau sudah terlanjur bayar, hubungi kasir ya.': 'If you already paid, please contact the cashier.',
  'Pesan Lagi': 'Order Again',
  'Pesananmu SIAP!': 'Your order is READY!',
  'Ambil di kasir dan bayar': 'Pick up at the cashier and pay',
  'Tunjukkan kode': 'Show code',
  'ke kasir.': 'to the cashier.',
  'Oke, Saya Ambil': 'OK, I am Picking It Up',
  'Alarm berbunyi terus sampai kamu menekan tombol di atas.': 'The alarm keeps ringing until you press the button above.',
  'Alarm dimatikan.': 'Alarm off.',
  'Selesai — selamat menikmati!': 'Completed — enjoy!',
  'Simpan Nota': 'Save Receipt',
  'Cetak': 'Print',
  'Nota disimpan sebagai foto PNG yang rapi — langsung masuk galeri.': 'The receipt is saved as a neat PNG photo — straight to your gallery.',
  'Status pesanan': 'Order status',
  'sekarang': 'now',
  'Halaman ini update otomatis — tidak perlu refresh atau bolak-balik ke kasir.': 'This page updates automatically — no need to refresh or walk back to the cashier.',
  'Pembayaran': 'Payment',
  'Pembayaran lunas. Terima kasih!': 'Payment complete. Thank you!',
  'Semua pembayaran di meja kasir': 'All payments at the cashier desk',
  'Saat pesanan siap, kasir akan menunjukkan QR QRIS dan nominal {total}. Scan di kasir, lalu kasir mengonfirmasi pembayaranmu.': 'When your order is ready, the cashier will show the QRIS QR and the amount {total}. Scan at the desk, then the cashier confirms your payment.',
  'Siapkan uang {total} — bayar langsung ke kasir saat mengambil pesanan.': 'Have {total} ready — pay the cashier directly when picking up your order.',
  'Rincian Pesanan': 'Order Details',
  'Ulasan Kamu': 'Your Review',
  'Terima kasih — ulasanmu membantu kami jadi lebih baik.': 'Thank you — your review helps us improve.',
  'Gimana pesananmu? Beri rating biar kami tahu.': 'How was your order? Rate it so we know.',
  'Tulis komentar (opsional)…': 'Write a comment (optional)…',
  'Kirim Ulasan': 'Submit Review',
  'Batalkan Pesanan': 'Cancel Order',
  'Pesanan {kode} akan dibatalkan dan kasir diberitahu. Lanjutkan?': 'Order {kode} will be cancelled and the cashier notified. Continue?',
  'Batalkan pesanan?': 'Cancel this order?',
  'Ya, Batalkan': 'Yes, Cancel',
  'Memuat pesanan…': 'Loading orders…',
  'Diterima': 'Received',
  'Dibuat': 'Making',
  'Pesanan masuk ke kasir': 'Order sent to the cashier',
  'Barista sedang meracik': 'The barista is brewing',
  'Ambil & bayar di kasir': 'Pick up & pay at the cashier',
  'Selamat menikmati!': 'Enjoy!',
  // Nota
  'Nota Pembayaran': 'Payment Receipt',
  'N O T A   P E M B A Y A R A N': 'P A Y M E N T   R E C E I P T',
  'LUNAS': 'PAID',
  'BELUM BAYAR': 'UNPAID',
  'Terima kasih sudah mampir!': 'Thanks for stopping by!',
  'Terima kasih sudah mampir': 'Thanks for stopping by',
  'Simpan nota ini sebagai bukti pembayaran.': 'Keep this receipt as proof of payment.',
  'Simpan nota ini sebagai bukti pembayaran': 'Keep this receipt as proof of payment',
  'Nota {kode}': 'Receipt {kode}',
  'Nota pembayaran {kedai}': 'Payment receipt from {kedai}',
  'Canvas tidak tersedia di perangkat ini.': 'Canvas is not available on this device.',
  'Gagal membuat gambar nota.': 'Failed to create the receipt image.',
  // Bintang
  '{value} dari 5 bintang': '{value} out of 5 stars',
  'Rating pesanan': 'Order rating',
  '{i} bintang': '{i}-star rating',
  // Login & kerangka staff
  'Login Staff': 'Staff Login',
  'Untuk kasir, bos, dan developer.': 'For cashier, owner, and developer.',
  'Masuk': 'Sign In',
  'Kembali ke halaman pelanggan': 'Back to customer page',
  'Panel Kasir': 'Cashier Panel',
  'Panel Bos': 'Owner Panel',
  'Panel Developer': 'Developer Panel',
  'Pesanan': 'Orders',
  'Ketersediaan Menu': 'Menu Availability',
  'Kelola Menu': 'Manage Menu',
  'QRIS & Kedai': 'QRIS & Shop',
  'Laporan': 'Reports',
  'Akun Staff': 'Staff Accounts',
  'Log Error & Aktivitas': 'Error & Activity Logs',
  'Diagnostik': 'Diagnostics',
  'Sistem': 'System',
  'Keluar': 'Sign Out',
  'Navigasi': 'Navigation',
  // Kasir
  'Pesanan baru: {codes}': 'New order: {codes}',
  '({n}) Pesanan Baru — Kasir Area Barat': '({n}) New Orders — Area Barat Cashier',
  'Kasir — Area Barat': 'Cashier — Area Barat',
  '{kode} diperbarui.': '{kode} updated.',
  'Suara Aktif': 'Sound On',
  'Aktifkan Suara': 'Enable Sound',
  'Pesanan {kode} akan dibatalkan dan pelanggan melihat statusnya.': 'Order {kode} will be cancelled and the customer will see the status.',
  'Pastikan uang {total} benar-benar sudah diterima di meja kasir (tunai/QRIS).': 'Make sure {total} has actually been received at the cashier desk (cash/QRIS).',
  'Status lunas {kode} akan dikembalikan ke belum bayar. Gunakan hanya jika salah pencet.': 'The paid status of {kode} will be reverted to unpaid. Use only if pressed by mistake.',
  'Tandai lunas?': 'Mark as paid?',
  'Batalkan status lunas?': 'Undo paid status?',
  'Ya, Sudah Terima': 'Yes, Received',
  'Ya, Kembalikan': 'Yes, Revert',
  'Bayar QRIS — {kode}': 'QRIS Payment — {kode}',
  'Nominal tagihan': 'Amount due',
  'QR QRIS Area Barat': 'Area Barat QRIS QR',
  'QR QRIS belum diunggah. Minta Bos upload di Panel Bos → QRIS, atau terima pembayaran tunai.': 'No QRIS QR uploaded yet. Ask the owner to upload it in Owner Panel → QRIS, or accept cash.',
  'Tunjukkan layar ini ke pembeli untuk discan. Pastikan nominal yang masuk sesuai, lalu cek mutasi QRIS kedai sebelum konfirmasi.': 'Show this screen to the customer to scan. Make sure the incoming amount matches, then check the shop QRIS transactions before confirming.',
  'Konfirmasi Lunas': 'Confirm Paid',
  'Tunjukkan QRIS': 'Show QRIS',
  'Tandai Lunas': 'Mark Paid',
  'Batalkan status lunas': 'Undo paid status',
  'Salah pencet? Kembalikan ke belum bayar': 'Pressed by mistake? Revert to unpaid',
  'Proses': 'Process',
  'Kembalikan ke diproses': 'Back to in progress',
  'Konfirmasi pembayaran di kasir dulu sebelum menyelesaikan': 'Confirm payment at the cashier before completing',
  'Selesaikan': 'Complete',
  'Batalkan {kode}': 'Cancel {kode}',
  'Matikan menu yang habis — pelanggan langsung melihat label "Habis" dan tidak bisa memesannya.': 'Turn off sold-out items — customers immediately see a "Sold out" label and cannot order them.',
  'Ketersediaan {nama}': 'Availability of {nama}',
  'Tidak ada pesanan di sini': 'No orders here',
  'Pesanan baru dari pelanggan muncul otomatis tanpa refresh.': 'New customer orders appear automatically without refreshing.',
  'Belum ada menu': 'No menu yet',
  'Bos bisa menambah menu di Panel Bos.': 'The owner can add menu items in the Owner Panel.',
  'Gagal memperbarui pesanan.': 'Failed to update the order.',
  'Gagal mengubah ketersediaan.': 'Failed to change availability.',
  // Bos: menu
  'Menu "{nama}" dihapus. Riwayat pesanan lama tetap aman.': 'Menu "{nama}" deleted. Past order history stays safe.',
  'Cari menu / kategori…': 'Search menu / category…',
  'Tambah Menu': 'Add Menu',
  '"{nama}" akan hilang dari daftar pelanggan. Riwayat pesanan yang sudah ada tidak berubah. Kalau hanya sementara habis, lebih baik tandai "Habis" saja lewat edit.': '"{nama}" will disappear from the customer list. Existing order history is unchanged. If it is only temporarily out, better mark it "Sold out" via edit.',
  'Hapus menu?': 'Delete this menu?',
  'Ya, Hapus': 'Yes, Delete',
  'Klik Tambah Menu untuk membuat menu pertama lengkap dengan foto dan deskripsi.': 'Click Add Menu to create your first item with a photo and description.',
  'Menu diperbarui.': 'Menu updated.',
  'Menu baru ditambahkan.': 'New menu added.',
  'Gagal menghapus menu.': 'Failed to delete the menu.',
  'Tambah Menu Baru': 'Add New Menu',
  'Nama Menu': 'Menu Name',
  'Contoh: Kopi Susu Gula Aren': 'e.g. Iced Palm Sugar Latte',
  'Kategori': 'Category',
  'Kopi': 'Coffee',
  'Harga (Rp)': 'Price (Rp)',
  'Deskripsi': 'Description',
  'Ceritakan singkat menu ini…': 'Briefly describe this item…',
  'Foto Menu': 'Menu Photo',
  'Tersedia (bisa dipesan)': 'Available (can be ordered)',
  'Simpan Perubahan': 'Save Changes',
  'Gagal menyimpan menu.': 'Failed to save the menu.',
  // Bos: QRIS & profil
  'QRIS berhasil diganti. Pelanggan langsung melihat QR baru.': 'QRIS replaced. Customers immediately see the new QR.',
  'QRIS dihapus — pelanggan hanya bisa bayar tunai.': 'QRIS removed — customers can only pay cash.',
  'Gagal menyimpan QRIS.': 'Failed to save QRIS.',
  'Profil kedai disimpan.': 'Shop profile saved.',
  'Gagal menyimpan.': 'Failed to save.',
  'QR QRIS Pembayaran': 'QRIS Payment QR',
  'QR ini ditampilkan ke pelanggan yang memilih bayar QRIS. Upload foto/screenshot QR QRIS statis kedai kamu.': 'This QR is shown to customers who choose QRIS payment. Upload a photo/screenshot of your shop static QRIS QR.',
  'QR QRIS aktif': 'Active QRIS QR',
  'Menyimpan QRIS…': 'Saving QRIS…',
  'Profil Kedai': 'Shop Profile',
  'Nama Kedai': 'Shop Name',
  'Pengumuman (tampil di halaman pelanggan)': 'Announcement (shown on the customer page)',
  'Contoh: Promo Jumat! Diskon semua kopi 20%': 'e.g. Friday promo! 20% off all coffee',
  'Kosongkan untuk menyembunyikan pengumuman.': 'Leave empty to hide the announcement.',
  'Simpan Profil': 'Save Profile',
  // Upload gambar
  'Belum ada gambar': 'No image yet',
  'Pilih file {label}': 'Choose {label} file',
  'Ganti Gambar': 'Change Image',
  'Pilih Gambar': 'Choose Image',
  'Atur Foto': 'Crop Photo',
  'Memuat foto…': 'Loading photo…',
  'Geser foto untuk mengatur posisi, lalu atur ukurannya.': 'Drag the photo to position it, then adjust the size.',
  'Ukuran': 'Size',
  'Reset Posisi': 'Reset Position',
  'Pakai Foto': 'Use Photo',
  'Gagal memotong gambar.': 'Failed to crop the image.',
  'Gagal memuat gambar. Coba file lain.': 'Failed to load the image. Try another file.',
  'File harus berupa gambar (JPG/PNG/WebP).': 'The file must be an image (JPG/PNG/WebP).',
  'Ukuran file maksimal 15 MB.': 'Maximum file size is 15 MB.',
  'Browser tidak mendukung pemrosesan gambar.': 'This browser does not support image processing.',
  'Gambar terlalu besar. Pilih foto lain.': 'The image is too large. Choose another photo.',
  'JPG/PNG/WebP. Atur posisi & ukuran foto dulu, lalu otomatis dikompres.': 'JPG/PNG/WebP. Adjust the photo first, then it is compressed automatically.',
  'JPG/PNG/WebP, otomatis dikompres biar hemat & cepat.': 'JPG/PNG/WebP, automatically compressed to stay light & fast.',
  'Gagal upload gambar.': 'Failed to upload the image.',
  // Akun staff
  'Akun "{username}" dihapus.': 'Account "{username}" deleted.',
  'Kelola akun kasir & bos: tambah admin, ganti username, dan reset password.': 'Manage cashier & owner accounts: add admins, change usernames, and reset passwords.',
  'Tambah Akun': 'Add Account',
  'Mengganti password atau username membuat sesi login lama akun itu otomatis keluar.': 'Changing the password or username automatically signs out that account’s previous sessions.',
  'dikelola terpisah oleh developer (tidak bisa diubah di sini).': 'is managed separately by the developer (cannot be changed here).',
  '(kamu)': '(you)',
  'dibuat {date}': 'created {date}',
  'Edit akun {username}': 'Edit account {username}',
  'Hapus akun {username}': 'Delete account {username}',
  'Tidak bisa menghapus akun yang sedang dipakai login': 'You cannot delete the account you are logged in with',
  'Akun "{username}" diperbarui.': 'Account "{username}" updated.',
  'Akun baru ditambahkan.': 'New account added.',
  'Gagal menghapus akun.': 'Failed to delete the account.',
  'Akun "{username}" ({role}) akan dihapus dan tidak bisa login lagi. Tindakan ini tidak bisa dibatalkan.': 'Account "{username}" ({role}) will be deleted and can no longer sign in. This cannot be undone.',
  'Hapus akun?': 'Delete this account?',
  'Edit Akun — {username}': 'Edit Account — {username}',
  'Tambah Akun Staff': 'Add Staff Account',
  'contoh: kasir2': 'e.g. kasir2',
  'Huruf kecil, angka, underscore. 3-20 karakter.': 'Lowercase letters, numbers, underscore. 3-20 characters.',
  'Peran': 'Role',
  'Password Baru (opsional)': 'New Password (optional)',
  'Kosongkan jika tidak diganti': 'Leave empty to keep unchanged',
  'Minimal 6 karakter': 'At least 6 characters',
  'Isi hanya jika ingin mengganti password. Sesi login lama akun ini akan keluar.': 'Fill in only to change the password. This account’s previous sessions will be signed out.',
  'Username: 3-20 karakter, hanya huruf kecil, angka, dan underscore.': 'Username: 3-20 characters, lowercase letters, numbers, and underscore only.',
  'Username "dev" dicadangkan untuk developer.': 'Username "dev" is reserved for the developer.',
  'Password minimal 6 karakter.': 'Password must be at least 6 characters.',
  'Password baru minimal 6 karakter.': 'New password must be at least 6 characters.',
  'Tidak ada perubahan.': 'No changes.',
  'Gagal menyimpan akun.': 'Failed to save the account.',
  'Belum ada akun staff': 'No staff accounts yet',
  'Tambahkan akun kasir atau bos agar staff bisa login.': 'Add a cashier or owner account so staff can sign in.',
  // Laporan
  'Hari Ini': 'Today',
  '7 Hari': '7 Days',
  '30 Hari': '30 Days',
  'Koneksi terganggu: {error}. Data diperbarui otomatis tiap 30 detik.': 'Connection interrupted: {error}. Data refreshes automatically every 30 seconds.',
  'Menghitung laporan…': 'Calculating report…',
  'Pendapatan (lunas)': 'Revenue (paid)',
  'Pesanan lunas': 'Paid orders',
  '{n} total pesanan': '{n} total orders',
  'Rata-rata / pesanan': 'Average / order',
  'Item terjual': 'Items sold',
  'Pendapatan Harian': 'Daily Revenue',
  'Menu Terlaris': 'Best Sellers',
  'Belum ada penjualan lunas di periode ini.': 'No paid sales in this period yet.',
  'Metode Pembayaran (lunas)': 'Payment Methods (paid)',
  '{n} pesanan': '{n} orders',
  'Status Pesanan': 'Order Status',
  'Ulasan Pelanggan': 'Customer Reviews',
  '{n} ulasan': '{n} reviews',
  'Belum ada ulasan di periode ini. Ulasan muncul setelah pelanggan menyelesaikan pesanan dan memberi rating.': 'No reviews in this period yet. Reviews appear after customers complete an order and leave a rating.',
  'Transaksi ({n})': 'Transactions ({n})',
  'Bayar': 'Payment',
  'Belum ada transaksi': 'No transactions yet',
  'Transaksi muncul otomatis setelah ada pesanan masuk.': 'Transactions appear automatically once orders come in.',
  'Belum ada pendapatan lunas di periode ini.': 'No paid revenue in this period yet.',
  'Grafik pendapatan harian': 'Daily revenue chart',
  '{date}: {total} ({n} pesanan)': '{date}: {total} ({n} orders)',
  // Developer: log
  'Semua log dibersihkan.': 'All logs cleared.',
  'Gagal membersihkan log.': 'Failed to clear logs.',
  'Refresh log': 'Refresh logs',
  'Bersihkan': 'Clear',
  'Error dari browser pelanggan/staff dan server tercatat otomatis di sini (update tiap 10 detik). Klik baris untuk detail teknis.': 'Errors from customer/staff browsers and the server are logged here automatically (updates every 10 seconds). Click a row for technical details.',
  'Tidak ada log': 'No logs',
  'Sistem sehat — belum ada aktivitas/error tercatat.': 'System healthy — no activity/errors recorded yet.',
  'Bersihkan semua log?': 'Clear all logs?',
  'Semua catatan error dan aktivitas dihapus permanen dari spreadsheet. Pastikan error penting sudah dicatat/diperbaiki.': 'All error and activity records are permanently deleted from the spreadsheet. Make sure important errors have been noted/fixed.',
  'Ya, Bersihkan': 'Yes, Clear',
  'Sumber': 'Source',
  '(tanpa detail)': '(no detail)',
  // Developer: diagnostik
  'Perbaikan selesai — lihat hasil di bawah.': 'Repair finished — see results below.',
  'Perbaikan gagal.': 'Repair failed.',
  'Menjalankan diagnostik…': 'Running diagnostics…',
  'Diagnostik tidak tersedia.': 'Diagnostics unavailable.',
  'Sistem Sehat': 'System Healthy',
  'Perlu Perhatian': 'Needs Attention',
  'Google Spreadsheet (produksi)': 'Google Spreadsheet (production)',
  'Demo lokal (belum terhubung Spreadsheet)': 'Local demo (not connected to Spreadsheet)',
  'BELUM DIKONFIGURASI': 'NOT CONFIGURED',
  'Respons database: {ms} ms': 'Database response: {ms} ms',
  'Refresh diagnostik': 'Refresh diagnostics',
  'Mode demo aktif karena GOOGLE_SCRIPT_URL belum diisi. Data tersimpan lokal di perangkat server ini saja. Ikuti SETUP.md untuk menghubungkan Spreadsheet.': 'Demo mode is active because GOOGLE_SCRIPT_URL is not set. Data is stored locally on this server only. Follow SETUP.md to connect the Spreadsheet.',
  'Diagnostik database gagal: {error}': 'Database diagnostics failed: {error}',
  'Konfigurasi Server': 'Server Configuration',
  'GOOGLE_SCRIPT_URL (alamat bridge Apps Script)': 'GOOGLE_SCRIPT_URL (Apps Script bridge URL)',
  'GOOGLE_SCRIPT_SECRET (kunci rahasia bridge)': 'GOOGLE_SCRIPT_SECRET (bridge secret key)',
  'Kunci sesi login (SESSION_SECRET / turunan secret)': 'Login session key (SESSION_SECRET / derived secret)',
  'Struktur Database': 'Database Structure',
  'Baris': 'Rows',
  'Ada': 'Present',
  'Tidak ada': 'Missing',
  'Benar': 'OK',
  'Rusak': 'Broken',
  'Folder penyimpanan gambar (Drive)': 'Image storage folder (Drive)',
  'bermasalah': 'problem',
  'Perbaikan Jarak Jauh': 'Remote Repair',
  'Membuat ulang tab/header yang hilang dan folder gambar tanpa menghapus data. Aman dijalankan kapan saja.': 'Recreates missing tabs/headers and the image folder without deleting data. Safe to run anytime.',
  'Jalankan Perbaikan Otomatis': 'Run Automatic Repair',
  // Developer: sistem
  'Akun staff direset ke default.': 'Staff accounts reset to default.',
  'Gagal mereset akun.': 'Failed to reset accounts.',
  'Reset Akun Staff': 'Reset Staff Accounts',
  'Kembalikan akun kasir & bos ke default': 'Restore cashier & owner accounts to default',
  'Akun tambahan dihapus dan semua staff dipaksa login ulang. Pakai jika bos lupa password atau terkunci di luar. Akun dev tidak terpengaruh.': 'Extra accounts are deleted and all staff are forced to sign in again. Use if the owner forgot the password or is locked out. The dev account is unaffected.',
  'Reset ke Default': 'Reset to Default',
  'Reset semua akun staff?': 'Reset all staff accounts?',
  'Akun kasir & bos kembali ke kasir/kasir dan bos/bos. Akun tambahan dihapus permanen dan semua staff harus login ulang. Segera ganti password default lewat Panel Bos setelah reset.': 'Cashier & owner accounts return to kasir/kasir and bos/bos. Extra accounts are permanently deleted and all staff must sign in again. Change the default passwords in the Owner Panel right after resetting.',
  'Ya, Reset': 'Yes, Reset',
  'Mode Maintenance': 'Maintenance Mode',
  'Saat aktif, pelanggan masih bisa melihat menu tapi tidak bisa mengirim pesanan. Pakai saat ada perbaikan atau kedai tutup mendadak.': 'When active, customers can still browse the menu but cannot place orders. Use during repairs or sudden closure.',
  'Mode maintenance': 'Maintenance mode',
  'AKTIF — kedai tidak menerima pesanan': 'ACTIVE — shop is not accepting orders',
  'Nonaktif — kedai menerima pesanan': 'Inactive — shop is accepting orders',
  'Mode maintenance AKTIF — pelanggan tidak bisa memesan.': 'Maintenance mode ACTIVE — customers cannot order.',
  'Mode maintenance dimatikan — kedai buka kembali.': 'Maintenance mode off — the shop is open again.',
  'Gagal mengubah mode.': 'Failed to change the mode.',
  'Keamanan Akun': 'Account Security',
  'Password default (kasir/kasir, bos/bos) mudah ditebak. Untuk keamanan jangka panjang:': 'Default passwords (kasir/kasir, bos/bos) are easy to guess. For long-term security:',
  'dikelola di database — ganti username/password dan tambah admin lewat': 'are managed in the database — change usernames/passwords and add admins via',
  'Panel Bos → Akun Staff': 'Owner Panel → Staff Accounts',
  'Sesi login lama otomatis keluar saat akun diubah.': 'Old login sessions are automatically signed out when the account changes.',
  'hanya lewat environment variable': 'only via the environment variable',
  'di Vercel (lalu Redeploy). Username "dev" dicadangkan dan tidak bisa dibuat lewat Panel Bos.': 'in Vercel (then Redeploy). The username "dev" is reserved and cannot be created in the Owner Panel.',
  'isi teks acak panjang (32+ karakter) agar sesi login makin kuat.': 'fill in a long random text (32+ characters) to make login sessions stronger.',
  'Sesi login berlaku 12 jam dan tersimpan sebagai cookie terenkripsi (HTTP-only). Jika semua akun bos terkunci, gunakan Reset Akun Staff di bawah.': 'Login sessions last 12 hours and are stored as an encrypted cookie (HTTP-only). If all owner accounts are locked out, use Reset Staff Accounts below.',
  'Tentang Aplikasi': 'About the App',
  'Area Barat POS v1.0 — Next.js di Vercel + Google Spreadsheet via Apps Script.': 'Area Barat POS v1.0 — Next.js on Vercel + Google Spreadsheet via Apps Script.',
  'Pesanan, menu, pengaturan, akun staff, dan log tersimpan di spreadsheet kedai (tab Menu/Orders/Settings/Accounts/Logs).': 'Orders, menu, settings, staff accounts, and logs are stored in the shop spreadsheet (Menu/Orders/Settings/Accounts/Logs tabs).',
  'Foto menu dan QR QRIS tersimpan di folder Google Drive "Area Barat - Assets". Semua pembayaran dikonfirmasi kasir di meja kasir.': 'Menu photos and the QRIS QR are stored in the Google Drive folder "Area Barat - Assets". All payments are confirmed by the cashier at the desk.',
  'Log dipangkas otomatis di 5.000 entri terakhir agar spreadsheet tetap ringan.': 'Logs are automatically trimmed to the latest 5,000 entries to keep the spreadsheet light.',
  // Halaman error & 404
  'Ada yang salah': 'Something went wrong',
  'Halaman mengalami error dan sudah otomatis dilaporkan ke tim developer. Coba muat ulang.': 'This page hit an error and it was automatically reported to the developer team. Try reloading.',
  'Halaman tidak ditemukan': 'Page not found',
  'Alamat yang kamu tuju tidak ada.': 'The address you are looking for does not exist.',
  // Pesan error statis dari API
  'Aplikasi belum terhubung ke Spreadsheet. Buka halaman /dev setelah mengatur GOOGLE_SCRIPT_URL dan GOOGLE_SCRIPT_SECRET di Vercel (lihat SETUP.md).': 'The app is not connected to the Spreadsheet yet. Open /dev after setting GOOGLE_SCRIPT_URL and GOOGLE_SCRIPT_SECRET in Vercel (see SETUP.md).',
  'Data sudah diubah perangkat lain. Muat ulang lalu coba lagi.': 'The data was changed by another device. Reload and try again.',
  'Menu tidak ditemukan.': 'Menu not found.',
  'Pesanan tidak ditemukan.': 'Order not found.',
  'Pesanan ini sudah diberi ulasan.': 'This order already has a review.',
  'Akun tidak ditemukan.': 'Account not found.',
  'SESSION_SECRET belum diatur di server. Lihat SETUP.md bagian environment variable.': 'SESSION_SECRET is not set on the server. See the environment variable section in SETUP.md.',
  'Permintaan tidak valid.': 'Invalid request.',
  'Username atau password salah.': 'Wrong username or password.',
  'Silakan login dulu.': 'Please sign in first.',
  'Akses ditolak untuk peran ini.': 'Access denied for this role.',
  'Akun ini sudah diubah atau dihapus. Silakan login ulang.': 'This account was changed or deleted. Please sign in again.',
  'Gambar tidak ditemukan.': 'Image not found.',
  'Kedai sedang tidak menerima pesanan (maintenance). Coba lagi nanti ya.': 'The shop is not accepting orders right now (maintenance). Please try again later.',
  'Keranjang kosong atau terlalu banyak item.': 'The cart is empty or has too many items.',
  'Pembayaran QRIS belum tersedia. Pilih Tunai dulu ya.': 'QRIS payment is not available yet. Please choose Cash for now.',
  'Ada menu yang sudah dihapus. Muat ulang halaman.': 'Some menu items were deleted. Reload the page.',
  'Tandai pembayaran LUNAS dulu sebelum menyelesaikan pesanan.': 'Mark the payment as PAID before completing the order.',
  'Pesanan tidak ditemukan. Pastikan link benar.': 'Order not found. Make sure the link is correct.',
  'Pesanan sudah diproses kasir, tidak bisa dibatalkan sendiri. Hubungi kasir ya.': 'The cashier already processed this order, so you cannot cancel it yourself. Please contact the cashier.',
  'Pesanan sudah lunas, hubungi kasir untuk pembatalan.': 'This order is already paid; contact the cashier to cancel.',
  'Spreadsheet belum dikonfigurasi. Lihat panduan SETUP.md.': 'Spreadsheet is not configured. See the SETUP.md guide.',
  'Tidak bisa menghubungi Spreadsheet (timeout/jaringan). Coba lagi.': 'Cannot reach the Spreadsheet (timeout/network). Try again.',
  'Bridge Spreadsheet membalas tidak valid. Pastikan deploy Apps Script sudah benar (akses: Anyone).': 'The Spreadsheet bridge returned an invalid response. Make sure the Apps Script deployment is correct (access: Anyone).',
  'Secret bridge ditolak. Samakan GOOGLE_SCRIPT_SECRET dengan BRIDGE_SECRET di Apps Script.': 'Bridge secret rejected. Make GOOGLE_SCRIPT_SECRET match BRIDGE_SECRET in Apps Script.',
  'Minimal harus ada satu akun bos. Buat akun bos lain dulu sebelum mengubah peran ini.': 'There must be at least one owner account. Create another owner account before changing this role.',
  'Minimal harus ada satu akun bos.': 'There must be at least one owner account.',
  'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.': 'Too many attempts. Wait a moment and try again.',
  'Ulasan hanya bisa diberikan setelah pesanan selesai.': 'You can only review after the order is completed.',
  'Pesanan ini sudah diberi ulasan. Terima kasih!': 'This order already has a review. Thank you!',
  'Terjadi error tidak diketahui': 'An unknown error occurred',
};

const FIELD_EN: Record<string, string> = {
  Nama: 'Name',
  Meja: 'Table',
  Catatan: 'Note',
  'Metode bayar': 'Payment method',
  Menu: 'Menu',
  Jumlah: 'Quantity',
  'Nama menu': 'Menu name',
  Kategori: 'Category',
  Harga: 'Price',
  Deskripsi: 'Description',
  Foto: 'Photo',
  Tersedia: 'Available',
  Peran: 'Role',
  Status: 'Status',
  'Status bayar': 'Payment status',
  Rating: 'Rating',
  Komentar: 'Comment',
  Nilai: 'Value',
  gambar: 'image',
  'format gambar': 'image format',
};

const VALIDATION_EN: Record<string, string> = {
  'harus berupa teks': 'must be text',
  'wajib diisi': 'is required',
  'tidak valid': 'is invalid',
  'harus berupa angka bulat': 'must be a whole number',
  'harus true/false': 'must be true/false',
  'data gambar tidak valid': 'invalid image data',
  'ukuran maksimal 2 MB setelah kompresi': 'max 2 MB after compression',
  'hanya huruf kecil, angka, dan underscore (3-20 karakter)': 'lowercase letters, numbers, and underscore only (3-20 characters)',
  '"dev" dicadangkan untuk developer': '"dev" is reserved for the developer',
};

// Pesan error server yang mengandung bagian dinamis diterjemahkan lewat pola.
function serverEn(msg: string): string | null {
  let m: RegExpMatchArray | null;
  if (msg.startsWith('Server error: ')) return `Server error: ${EN[msg.slice(14)] ?? serverEn(msg.slice(14)) ?? msg.slice(14)}`;
  if (msg.startsWith('Spreadsheet error: ')) return `Spreadsheet error: ${EN[msg.slice(19)] ?? serverEn(msg.slice(19)) ?? msg.slice(19)}`;
  if ((m = msg.match(/^"(.+)" baru saja habis\. Hapus dari keranjang lalu coba lagi\.$/))) return `"${m[1]}" just sold out. Remove it from your cart and try again.`;
  if ((m = msg.match(/^Jumlah "(.+)" maksimal 99\.$/))) return `Quantity for "${m[1]}" is capped at 99.`;
  if ((m = msg.match(/^Menu "(.+)" sudah ada\. Gunakan nama lain atau edit menu yang ada\.$/))) return `Menu "${m[1]}" already exists. Use another name or edit the existing one.`;
  if ((m = msg.match(/^Username "(.+)" sudah dipakai\.$/))) return `Username "${m[1]}" is already taken.`;
  if ((m = msg.match(/^Tidak bisa mengubah status dari "(.+)" ke "(.+)"\.$/))) return `Cannot change status from "${EN[m[1]] ?? m[1]}" to "${EN[m[2]] ?? m[2]}".`;
  if ((m = msg.match(/^Transisi pembayaran "(.+)" ke "(.+)" tidak diizinkan\.$/))) return `Payment transition from "${EN[m[1]] ?? m[1]}" to "${EN[m[2]] ?? m[2]}" is not allowed.`;
  if ((m = msg.match(/^maksimal (\d+) karakter$/))) return `at most ${m[1]} characters`;
  if ((m = msg.match(/^harus antara (\d+) dan (\d+)$/))) return `must be between ${m[1]} and ${m[2]}`;
  if ((m = msg.match(/^harus salah satu dari: (.+)$/))) return `must be one of: ${m[1]}`;
  const idx = msg.indexOf(': ');
  if (idx > 0) {
    const field = msg.slice(0, idx);
    const rest = msg.slice(idx + 2);
    let tr: string | null = VALIDATION_EN[rest] ?? null;
    if (!tr && (m = rest.match(/^maksimal (\d+) karakter$/))) tr = `at most ${m[1]} characters`;
    if (!tr && (m = rest.match(/^harus antara (\d+) dan (\d+)$/))) tr = `must be between ${m[1]} and ${m[2]}`;
    if (!tr && (m = rest.match(/^harus salah satu dari: (.+)$/))) tr = `must be one of: ${m[1]}`;
    if (tr) return `${FIELD_EN[field] ?? field}: ${tr}`;
  }
  return null;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let out = lang === 'en' ? (EN[key] ?? serverEn(key) ?? key) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nCtx = createContext<I18nValue>({ lang: 'id', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ab_lang');
      if (saved === 'en' || saved === 'id') {
        setDateLocale(saved === 'en' ? 'en-GB' : 'id-ID');
        setLangState(saved);
      }
    } catch { /* penyimpanan tidak tersedia */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setDateLocale(l === 'en' ? 'en-GB' : 'id-ID');
    setLangState(l);
    try { localStorage.setItem('ab_lang', l); } catch { /* abaikan */ }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'id', label: 'Bahasa Indonesia', short: 'ID' },
  { code: 'en', label: 'English', short: 'EN' },
];

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (code: Lang) => {
    setLang(code);
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div ref={box} className={`relative shrink-0 ${className}`}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Ganti bahasa')}
        className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg border border-forest-700 bg-forest-900/85 text-cream text-sm font-semibold cursor-pointer transition-colors duration-200 hover:bg-forest-800"
      >
        <Globe size={16} className="text-moss" aria-hidden />
        <span>{lang === 'id' ? 'Indonesia' : 'English'}</span>
        <ChevronDown size={14} className={`text-moss transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('Pilih bahasa')}
          className="absolute right-0 top-full mt-2 z-50 w-60 origin-top-right rounded-xl border border-forest-700 bg-forest-850 p-1.5 shadow-sheet anim-scale-in"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-xs text-moss">{t('Pilih bahasa')}</p>
          {LANGS.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pick(l.code)}
                className={`flex w-full items-center gap-3 min-h-[44px] px-2.5 rounded-lg text-left text-sm cursor-pointer transition-colors duration-150 ${active ? 'bg-forest-800 text-cream' : 'text-cream-dim hover:bg-forest-800/70 hover:text-cream'}`}
              >
                <Check size={15} className={active ? 'text-wood-300' : 'text-transparent'} aria-hidden />
                <span className="flex-1">{l.label}</span>
                <span className="text-[11px] font-semibold text-moss">{l.short}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}