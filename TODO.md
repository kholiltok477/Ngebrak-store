# TODO - Fitur Struk PDF POS

- [ ] (Sebelum implement) Tambah tabel/kolom untuk menyimpan header receipt per checkout (id receipt) + item receipt.
- [ ] Buat endpoint baru `POST /api/checkout` (sekali request dari POS) yang memproses seluruh isi cart, update stok, simpan ke receipt header & receipt items, dan mengembalikan `receiptId`.
- [ ] Buat endpoint `GET /api/receipts/:id/pdf` yang menghasilkan PDF struk dan mengirim sebagai download.
- [ ] Update front-end POS: ganti `handleCheckout()` agar memanggil `/api/checkout` dan kemudian membuka/download PDF.
- [ ] (Opsional) Tambah tombol “Print PDF / Cetak Struk” atau langsung auto-open setelah checkout.
- [ ] Uji end-to-end: login kasir -> tambah beberapa item -> checkout -> download PDF.

