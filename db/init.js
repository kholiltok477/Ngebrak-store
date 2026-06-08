const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(__dirname, '..', 'db.sqlite');
if (fs.existsSync(DB_FILE)) {
  console.log('Database sudah ada di', DB_FILE);
  process.exit(0);
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Gagal membuat database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    fullname TEXT,
    role TEXT,
    phone TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT,
    category_id INTEGER,
    unit TEXT,
    purchase_price INTEGER,
    sale_price INTEGER,
    stock INTEGER,
    entry_date TEXT,
    storage_location TEXT,
    supplier_id INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS incoming_goods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_in TEXT,
    product_id INTEGER,
    quantity INTEGER,
    supplier_id INTEGER,
    staff_name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS outgoing_goods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_out TEXT,
    product_id INTEGER,
    quantity INTEGER,
    destination TEXT,
    staff_name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    cashier_name TEXT,
    product_id INTEGER,
    quantity INTEGER,
    price INTEGER,
    total_price INTEGER,
    payment_method TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    product_id INTEGER,
    quantity INTEGER,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const users = [
    ['admin', 'admin123', 'Administrator', 'admin', '081234567890'],
    ['kasir', 'kasir123', 'Kasir Ngebrak', 'kasir', '081298765432'],
    ['gudang', 'gudang123', 'Petugas Gudang', 'gudang', '081212121212']
  ];

  const categories = [
    ['Elektronik', 'Perangkat elektronik dan aksesoris'],
    ['Fashion', 'Pakaian dan aksesori mode'],
    ['Makanan', 'Bahan makanan dan snack'],
    ['Minuman', 'Minuman kemasan dan segar'],
    ['Rumah Tangga', 'Peralatan rumah tangga dan kebutuhan sehari-hari'],
    ['Perawatan', 'Produk kebersihan dan perawatan diri']
  ];

  const suppliers = [
    ['PT Elektronik Maju', 'Jl. Merdeka No. 12', '081100112233', 'supplier1@example.com'],
    ['CV Tekstil Sejahtera', 'Jl. Kebon Jeruk No. 45', '081199887766', 'supplier2@example.com'],
    ['PT Distributor Makanan', 'Jl. Gatot Subroto No. 88', '082111223344', 'supplier3@example.com'],
    ['CV Minuman Segar', 'Jl. Ahmad Yani No. 30', '082244556677', 'supplier4@example.com'],
    ['PT Perawatan Kecantikan', 'Jl. Sudirman No. 99', '081333445566', 'supplier5@example.com']
  ];

  const products = [
    // Elektronik
    ['EL-001', 'Smartphone Android 128GB', 1, 'Unit', 2500000, 3500000, 15, '2026-05-05', 'Rak A1', 1],
    ['EL-002', 'Powerbank 20000mAh', 1, 'Unit', 150000, 250000, 32, '2026-05-05', 'Rak A2', 1],
    ['EL-003', 'Charger USB-C 65W', 1, 'Unit', 80000, 149000, 28, '2026-05-05', 'Rak A3', 1],
    ['EL-004', 'Headphone Wireless', 1, 'Unit', 200000, 399000, 18, '2026-05-05', 'Rak A4', 1],
    ['EL-005', 'Kabel Data USB-C 2m', 1, 'Unit', 25000, 49000, 50, '2026-05-05', 'Rak A5', 1],
    ['EL-006', 'Tas Laptop 15 inch', 1, 'Unit', 120000, 249000, 12, '2026-05-05', 'Rak A6', 1],
    
    // Fashion
    ['FH-001', 'T-Shirt Premium Cotton', 2, 'Unit', 45000, 99000, 45, '2026-05-06', 'Rak B1', 2],
    ['FH-002', 'Jeans Standar Blue', 2, 'Unit', 120000, 249000, 30, '2026-05-06', 'Rak B2', 2],
    ['FH-003', 'Kemeja Formal White', 2, 'Unit', 80000, 179000, 25, '2026-05-06', 'Rak B3', 2],
    ['FH-004', 'Jaket Casual Bomber', 2, 'Unit', 150000, 349000, 16, '2026-05-06', 'Rak B4', 2],
    ['FH-005', 'Sepatu Olahraga Putih', 2, 'Pasang', 180000, 399000, 20, '2026-05-06', 'Rak B5', 2],
    ['FH-006', 'Kaos Oblong Polos', 2, 'Unit', 25000, 59000, 60, '2026-05-06', 'Rak B6', 2],
    
    // Makanan
    ['MK-001', 'Kopi Sachet Premium', 3, 'Box (12 sachet)', 18000, 35000, 48, '2026-05-07', 'Rak C1', 3],
    ['MK-002', 'Beras Premium 5kg', 3, 'Karung', 60000, 89000, 25, '2026-05-07', 'Gudang 1', 3],
    ['MK-003', 'Mie Instan Goreng', 3, 'Dus (30 bungkus)', 24000, 45000, 35, '2026-05-07', 'Rak C2', 3],
    ['MK-004', 'Snack Keripik Singkong', 3, 'Kemasan 200g', 15000, 29000, 55, '2026-05-07', 'Rak C3', 3],
    ['MK-005', 'Roti Tawar Putih', 3, 'Bungkus', 18000, 35000, 40, '2026-05-07', 'Rak C4', 3],
    ['MK-006', 'Telur Ayam 1 Lusin', 3, 'Lusin', 20000, 38000, 50, '2026-05-07', 'Gudang 2', 3],
    
    // Minuman
    ['MN-001', 'Air Mineral 1.5L', 4, 'Botol', 3000, 7000, 120, '2026-05-08', 'Rak D1', 4],
    ['MN-002', 'Teh Manis Kemasan', 4, 'Botol 500ml', 4500, 9000, 95, '2026-05-08', 'Rak D2', 4],
    ['MN-003', 'Kopi Siap Minum', 4, 'Kaleng 250ml', 8000, 15000, 72, '2026-05-08', 'Rak D3', 4],
    ['MN-004', 'Jus Jeruk Natural', 4, 'Botol 1L', 15000, 28000, 36, '2026-05-08', 'Rak D4', 4],
    ['MN-005', 'Susu Cair Murni', 4, 'Sachet 200ml', 5000, 10000, 80, '2026-05-08', 'Rak D5', 4],
    
    // Rumah Tangga
    ['RT-001', 'Sabun Cuci Piring', 5, 'Botol 750ml', 8000, 14000, 45, '2026-05-09', 'Rak E1', 5],
    ['RT-002', 'Deterjen Cair', 5, 'Botol 1L', 15000, 27000, 30, '2026-05-09', 'Rak E2', 5],
    ['RT-003', 'Sapu Plastik', 5, 'Unit', 12000, 25000, 20, '2026-05-09', 'Rak E3', 5],
    ['RT-004', 'Pengharum Ruangan', 5, 'Botol 250ml', 18000, 35000, 28, '2026-05-09', 'Rak E4', 5],
    ['RT-005', 'Tissue Gulung 4 Rol', 5, 'Paket', 25000, 45000, 35, '2026-05-09', 'Rak E5', 5],
    
    // Perawatan
    ['PR-001', 'Shampo Herbal 200ml', 6, 'Botol', 25000, 49000, 32, '2026-05-10', 'Rak F1', 5],
    ['PR-002', 'Sabun Mandi Cair', 6, 'Botol 250ml', 12000, 24000, 48, '2026-05-10', 'Rak F2', 5],
    ['PR-003', 'Pasta Gigi Peppermint', 6, 'Tube 100g', 8000, 16000, 65, '2026-05-10', 'Rak F3', 5],
    ['PR-004', 'Sikat Gigi Soft', 6, 'Unit', 5000, 12000, 55, '2026-05-10', 'Rak F4', 5],
    ['PR-005', 'Face Cream Moisturizer', 6, 'Jar 50ml', 35000, 74000, 20, '2026-05-10', 'Rak F5', 5],
    ['PR-006', 'Deodorant Stick 40g', 6, 'Unit', 22000, 45000, 25, '2026-05-10', 'Rak F6', 5]
  ];

  const insertUser = db.prepare('INSERT INTO users (username, password, fullname, role, phone) VALUES (?, ?, ?, ?, ?)');
  users.forEach((user) => insertUser.run(user));
  insertUser.finalize();

  const insertCategory = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  categories.forEach((category) => insertCategory.run(category));
  insertCategory.finalize();

  const insertSupplier = db.prepare('INSERT INTO suppliers (name, address, phone, email) VALUES (?, ?, ?, ?)');
  suppliers.forEach((supplier) => insertSupplier.run(supplier));
  insertSupplier.finalize();

  const insertProduct = db.prepare('INSERT INTO products (code, name, category_id, unit, purchase_price, sale_price, stock, entry_date, storage_location, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  products.forEach((product) => insertProduct.run(product));
  insertProduct.finalize();

  console.log('Database Ngebrak Store berhasil dibuat dan diisi awal.');
});

db.close();
