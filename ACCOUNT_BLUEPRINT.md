# Blueprint Akun Ngebrak Store

## Tujuan
File ini menjelaskan struktur login, role, database, dan perubahan frontend/backend terbaru di aplikasi Ngebrak Store.

## Ringkasan Aplikasi
- Backend: Node.js + Express.
- Frontend login: `public/index.html` dengan `public/login.js`.
- Frontend aplikasi: `public/app.html` dengan `public/app.js`.
- Database: SQLite `db.sqlite` di root.
- Database init/seed: `setup-db.js` dan `db/init.js`.

## Role dan Akun Saat Ini
Akun default:
- `admin` / `admin123` — role `admin`
- `kasir` / `kasir123` — role `kasir`
- `gudang` / `gudang123` — role `gudang`

Akun ini di-seed otomatis jika database kosong oleh `server.js` saat startup, dan juga dapat dibuat ulang melalui `setup-db.js`.

## File Penting
- `server.js`
  - Menginisialisasi SQLite, memastikan tabel dan kolom.
  - Menyediakan endpoint login dan API data operasi.
  - Endpoints utama:
    - `POST /api/login`
    - `GET /api/overview`
    - `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
    - `GET /api/categories`, `POST /api/categories`
    - `GET /api/suppliers`, `POST /api/suppliers`
    - `GET /api/customers`, `POST /api/customers`
    - `GET /api/incoming`, `POST /api/incoming`
    - `GET /api/outgoing`
    - `GET /api/sales`
    - `POST /api/sell`
- `public/index.html`
  - Halaman login utama.
  - Mengirim kredensial ke `/api/login`.
- `public/login.js`
  - Menangani submit form login.
  - Menyimpan user ke `localStorage` dengan key `ngebrakUser`.
  - Redirect ke `/app.html` setelah login.
- `public/app.html`
  - Tampilan dashboard/POS modern.
  - Menyediakan panel sidebar, dashboard, POS, produk, kategori, supplier, pelanggan, dan pengaturan.
- `public/app.js`
  - Mengelola state user, data produk, kategori, supplier, pelanggan, dan keranjang.
  - Mengambil data dari backend via `/api/overview` dan endpoint terkait.
  - Menampilkan grafik penjualan dan pembelian di dashboard.
  - Mengendalikan role-specific UI:
    - `admin`: CRUD produk, kategori, supplier, pelanggan.
    - `kasir`: POS, keranjang, checkout.
    - `gudang`: pencatatan barang masuk.
  - Menyimpan pengaturan toko lokal di `localStorage`.
- `setup-db.js`
  - Script tambahan untuk membuat dan mengisi ulang `db.sqlite` dengan seed data awal.
- `db/init.js`
  - Alternatif inisialisasi schema database jika diperlukan.

## Perubahan Terbaru yang Sudah Dimasukkan ke Blueprint
- Mengganti implementasi frontend POS dari `public/pos.js` ke `public/app.html` + `public/app.js`.
- Menambahkan dashboard role-based lengkap di `public/app.js`.
- Menyelaraskan `public/app.js` dengan `public/app.html` untuk semua elemen UI yang tersedia.
- Menambahkan grafik penjualan dan pembelian di dashboard menggunakan data `overview`.
- Memperbarui tampilan POS untuk daftar produk vertikal panjang di dalam kartu scrollable.
- Menambahkan fitur scan barcode pada POS untuk menambahkan produk ke keranjang langsung.
- Menambahkan endpoint backend baru dan yang sudah ada untuk:
  - `POST /api/customers`
  - `POST /api/incoming`
  - `GET /api/outgoing`
  - `GET /api/sales`
  - `GET /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- Menambahkan seeding `admin`, `kasir`, `gudang`, kategori, supplier, dan produk default.

## Hak Akses Role
- `admin`
  - Bisa login dan mengakses tampilan lengkap.
  - Tambah/ubah/hapus produk.
  - Tambah kategori.
  - Tambah supplier.
  - Tambah pelanggan.
- `kasir`
  - Bisa login dan mengakses POS.
  - Tambah item ke keranjang.
  - Checkout transaksi melalui `POST /api/sell`.
- `gudang`
  - Bisa login dan mengakses panel gudang.
  - Mencatat barang masuk melalui `POST /api/incoming`.

## Struktur Data dan Endpoint
### Login
- `POST /api/login`
  - Request body: `{ username, password }`
  - Response: `{ success, user }`

### Overview
- `GET /api/overview`
  - Response: `{ success, overview }`
  - `overview` berisi produk, kategori, supplier, pelanggan, penjualan, aktivitas, serta data grafik penjualan dan pembelian.

### Produk
- `GET /api/products`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)

### Kategori
- `GET /api/categories`
- `POST /api/categories` (admin)

### Supplier
- `GET /api/suppliers`
- `POST /api/suppliers` (admin)

### Pelanggan
- `GET /api/customers`
- `POST /api/customers` (admin)

### Barang Masuk
- `GET /api/incoming`
- `POST /api/incoming` (gudang)

### Barang Keluar
- `GET /api/outgoing`

### Penjualan
- `GET /api/sales`
- `POST /api/sell` (kasir)

## Cara Memperbarui Akun
### 1. Ubah seed di `setup-db.js`
Cari array `users` dan ubah username/password/fullname/role/phone.

### 2. Jalankan ulang seed
```bash
node setup-db.js
```

### 3. Restart server jika perlu
```bash
npm start
```

## Catatan Khusus
- `server.js` sudah otomatis membuat tabel dan menambah kolom bila belum ada.
- `public/app.js` bergantung pada `localStorage` untuk user login.
- `public/app.html` sudah menyediakan semua section untuk role-based dashboard.
- Jika menambahkan role baru, sesuaikan logika role di `public/app.js` dan backend authorization bila diperlukan.

## Tes Setelah Perubahan
1. Jalankan server:
   ```bash
   npm start
   ```
2. Buka `http://localhost:3000`
3. Login dengan salah satu akun default.
4. Cek halaman dashboard, POS, produk, kategori, supplier, pelanggan, dan pengaturan.
5. Pastikan operasi CRUD dan checkout berfungsi.
