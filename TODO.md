# TODO - CSS gak tampil sama sekali

## Step 1: Investigasi
- [x] Cek `frontend/public/styles.css` (terlihat campuran/duplikasi dan berpotensi invalid)
- [x] Cek link CSS di `frontend/public/index.html` dan `frontend/public/app.html`
- [x] Cek ketersediaan route `GET /styles.css` di server

## Step 2: Perbaikan CSS
- [x] Bersihkan `frontend/public/styles.css` menjadi CSS murni (hapus bagian HTML/JS/yang tidak valid)
- [x] Pastikan file berakhir normal dan hanya berisi selector CSS


## Step 3: Verifikasi
- [x] Jalankan server
- [x] Buka halaman dan cek Network/Console untuk status `/styles.css` dan parsing errors


