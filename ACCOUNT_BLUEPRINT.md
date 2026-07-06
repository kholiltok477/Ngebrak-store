# Account Blueprint — Ngebrak Store

Dokumen ini merangkum **akun/role**, **alur login**, serta **data awal yang di-seed** untuk kebutuhan laporan dan referensi implementasi.

---

## 1) Ringkasan Aplikasi (bagian yang relevan untuk akun)
- Backend: **Node.js + Express** (`server.js`)
- Database: **SQLite** (`db.sqlite` di root)
- Frontend login: `public/index.html` dengan `public/login.js`
- Setelah login: role dipakai untuk menampilkan modul di `public/app.html` + `public/app.js`
- Persistensi login di browser memakai `localStorage` key: **`ngebrakUser`**

---

## 2) Endpoint Login & Format Data
### Endpoint
- `POST /api/login`

### Request body
```json
{ "username": "...", "password": "..." }
```

### Response sukses
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "fullname": "Administrator",
    "role": "admin"
  }
}
```

### Validasi utama
- Username dan password wajib diisi.
- Password dicocokkan langsung dari tabel `users` (tanpa hashing di implementasi saat ini).

---

## 3) Mekanisme Simpan Session (di sisi frontend)
Di `public/login.js`:
1. Setelah login sukses, user disimpan ke:
   - `localStorage.setItem('ngebrakUser', JSON.stringify(result.user))`
2. Browser diarahkan ke:
   - `/app.html`
3. Di `public/app.js`, saat `DOMContentLoaded`:
   - dibaca `localStorage.getItem('ngebrakUser')`
   - jika tidak ada/gagal parsing => redirect kembali ke `/` (halaman login)

---

## 4) Role & Hak Akses
Role ditentukan oleh field `users.role`.

### 4.1 `admin`
**Akses UI & fitur** (di `public/app.js`):
- Modul: Dashboard, POS, Produk, Kategori, Supplier, Pelanggan, Pengaturan
- Backend guard (di `server.js`):
  - CRUD Produk: `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
  - Tambah Kategori: `POST /api/categories`
  - Tambah Supplier: `POST /api/suppliers`
  - Tambah Pelanggan: `POST /api/customers`
  - Stok Opname (read & write):
    - `GET /api/stock-opname/products`
    - `POST /api/stock-opname`

### 4.2 `kasir`
**Akses UI & fitur**:
- Modul: Dashboard dan POS
- Backend guard:
  - Checkout/Penjualan: `POST /api/sell`

### 4.3 `gudang`
**Akses UI & fitur**:
- Modul: Dashboard, Manajemen Stok, Stok Opname, Supplier
- Backend guard:
  - Catat barang masuk: `POST /api/incoming`
  - Stok Opname (read & write):
    - `GET /api/stock-opname/products`
    - `POST /api/stock-opname`

---

## 5) Data Akun Default (seed di database)
Data akun dibuat otomatis oleh `server.js` pada saat startup melalui proses `ensureSchemaAndSeed()`.
Seed hanya dilakukan jika tabel masih kosong (cek `COUNT(*) > 0`).

### Seed array `users` di `server.js`
Berikut data akun yang di-insert:

| Username | Password | Fullname | Role |
|---|---|---|---|
| `admin` | `admin123` | Administrator | `admin` |
| `kasir` | `kasir123` | Kasir Ngebrak | `kasir` |
| `gudang` | `gudang123` | Petugas Gudang | `gudang` |

> Catatan: field `phone` juga diisi pada seed, namun yang dipakai untuk otorisasi modul adalah `role`.

---

## 6) Titik Integrasi Role ke UI
Di `public/app.js` fungsi `buildSidebar()` dan `selectSection()`:
- Menu sidebar dibentuk berdasarkan `state.user.role`.
- Terdapat guard `allowedSections` agar section yang tidak diizinkan tidak bisa diakses walau UI dipaksa (mis. via manipulasi DOM).

Ringkas guard section:
- `kasir` => `dashboard`, `pos`
- `gudang` => `dashboard`, `stock`, `stockOpname`, `suppliers`
- `admin` => semua (dashboard, pos, products, categories, suppliers, customers, stock, stockOpname, settings)

---

## 7) Cara Mengganti Akun Default untuk Laporan
Agar laporan sesuai kebutuhan (mis. username/password baru):

1. Buka `server.js` pada bagian seed:
   - bagian konstanta `users = [ ... ]`
2. Ubah `username`, `password`, `fullname`, `role` (dan `phone` jika perlu)
3. Bersihkan dan/atau reset database SQLite agar seed ter-trigger ulang.

Alternatif:
- Ada script `setup-db.js` dan `db/init.js` (jika dipakai pada workflow proyek), namun pada dokumen ini perilaku seed utama ada di `server.js`.

---

## 8) Contoh Skenario Pengujian Login (untuk laporan)
1. Buka `http://localhost:3000`
2. Login sebagai:
   - admin/admin123 => pastikan modul Produk/Kategori/Supplier/Pelanggan muncul
   - kasir/kasir123 => pastikan modul POS aktif dan tombol checkout mengirim `POST /api/sell`
   - gudang/gudang123 => pastikan modul Stok Opname dan Barang Masuk tersedia serta guard backend `POST /api/incoming`

---

## 9) Referensi File
- `server.js`
  - seed tabel `users`
  - `POST /api/login`
  - route lain yang memakai guard role
- `public/login.js`
  - menyimpan user ke `localStorage` dan redirect ke `/app.html`
- `public/app.js`
  - membangun menu sidebar berdasarkan role

---

Jika dibandingkan dengan `ACCOUNT_BLUEPRINT.md` yang sudah ada, dokumen ini berfokus pada **bagian akun/role/login** serta **data seed default** agar langsung bisa dipakai untuk bagian laporan.

---

## 10) Fitur PDF Struk Transaksi (Kasir)

### Deskripsi
Setelah kasir menyelesaikan transaksi (checkout), sistem secara otomatis menghasilkan **struk PDF biner asli** dan menampilkannya dalam modal viewer di dalam aplikasi.

### Alur
1. Kasir klik **Bayar Sekarang** → `POST /api/checkout` berhasil
2. Frontend memanggil `showReceiptPdfModal(receiptId)`
3. Fetch ke `GET /api/receipts/:id/pdf?role=kasir` → server menghasilkan PDF biner dengan **PDFKit**
4. PDF diterima sebagai `Blob` → dikonversi ke `Object URL`
5. Modal PDF viewer terbuka, PDF ditampilkan dalam `<iframe>`
6. Kasir bisa **Download** atau **Tutup** modal

### Endpoint PDF
```
GET /api/receipts/:id/pdf?role=<role>
```
- **Auth**: role wajib dikirim sebagai query param (`?role=kasir` / `?role=admin` / `?role=gudang`)
- **Response**: `application/pdf` (PDF biner, Content-Disposition: `inline`)
- **Library**: `pdfkit` (sudah ada di `dependencies` package.json)

### Isi Struk PDF
| Bagian | Konten |
|---|---|
| Header | Nama toko "Ngebrak Store" + label "Struk Penjualan" |
| Info | No. Struk, Tanggal, Kasir, Metode Bayar |
| Tabel | Produk, Qty, Harga satuan (Rp), Total per item |
| Footer | TOTAL keseluruhan + pesan terima kasih |

### File yang Diubah
| File | Perubahan |
|---|---|
| `server.js` | Import `PDFDocument = require('pdfkit')`. Endpoint `/api/receipts/:id/pdf` diganti dari HTML-palsu menjadi PDF biner PDFKit. Header `Content-Disposition: inline`. |
| `public/app.html` | Tambah modal `#pdfViewerOverlay` dengan `<iframe id="pdfViewerFrame">`, tombol Download & Tutup, loading spinner. |
| `public/styles.css` | Tambah style `.pdf-viewer-overlay`, `.pdf-viewer-container`, `.pdf-viewer-frame`, `.pdf-loading-spinner`, `.pdf-action-btn`, dll. dengan efek glassmorphism & animasi. |
| `public/app.js` | Ganti `downloadReceiptPdf()` dengan `showReceiptPdfModal()` — fetch PDF sebagai Blob → Object URL → tampilkan di `<iframe>`. URL fetch menyertakan `?role=` agar lolos `requireRole`. |

### Catatan Penting
- `requireRole` di `server.js` membaca role dari `req.body?.role` **atau** `req.query?.role`. Karena GET request tidak punya body, role **wajib** dikirim sebagai query param: `?role=kasir`.
- Blob URL di-revoke otomatis setelah 30 detik (setelah modal ditutup) untuk efisiensi memori.
- Modal bisa ditutup dengan: tombol **Tutup**, klik area gelap di luar modal, atau tekan **ESC**.

