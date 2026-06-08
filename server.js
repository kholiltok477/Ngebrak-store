const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.sqlite');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Gagal membuka database:', err.message);
    process.exit(1);
  }
});

function ensureColumn(table, column, definition) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
      if (err) return reject(err);
      if (columns.some((col) => col.name === column)) return resolve();
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
        if (alterErr) return reject(alterErr);
        resolve();
      });
    });
  });
}

function formatLocalDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function ensureSchemaAndSeed() {
  await new Promise((resolve, reject) => {
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

      db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        points INTEGER DEFAULT 0
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

      db.run(`CREATE TABLE IF NOT EXISTS cash_drawer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        cashier_name TEXT,
        opening_balance INTEGER,
        closing_balance INTEGER,
        difference INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, async (err) => {
        if (err) return reject(err);
        (async () => {
          try {
            await ensureColumn('users', 'phone', 'TEXT');
            await ensureColumn('products', 'code', 'TEXT');
            await ensureColumn('products', 'category_id', 'INTEGER');
            await ensureColumn('products', 'unit', 'TEXT');
            await ensureColumn('products', 'purchase_price', 'INTEGER');
            await ensureColumn('products', 'sale_price', 'INTEGER');
            await ensureColumn('products', 'entry_date', 'TEXT');
            await ensureColumn('products', 'storage_location', 'TEXT');
            await ensureColumn('products', 'supplier_id', 'INTEGER');
            await ensureColumn('categories', 'description', 'TEXT');
            await ensureColumn('suppliers', 'address', 'TEXT');
            await ensureColumn('suppliers', 'phone', 'TEXT');
            await ensureColumn('suppliers', 'email', 'TEXT');
            await ensureColumn('incoming_goods', 'date_in', 'TEXT');
            await ensureColumn('incoming_goods', 'product_id', 'INTEGER');
            await ensureColumn('incoming_goods', 'quantity', 'INTEGER');
            await ensureColumn('incoming_goods', 'supplier_id', 'INTEGER');
            await ensureColumn('incoming_goods', 'staff_name', 'TEXT');
            await ensureColumn('outgoing_goods', 'date_out', 'TEXT');
            await ensureColumn('outgoing_goods', 'product_id', 'INTEGER');
            await ensureColumn('outgoing_goods', 'quantity', 'INTEGER');
            await ensureColumn('outgoing_goods', 'destination', 'TEXT');
            await ensureColumn('outgoing_goods', 'staff_name', 'TEXT');
            await ensureColumn('sales_transactions', 'date', 'TEXT');
            await ensureColumn('sales_transactions', 'cashier_name', 'TEXT');
            await ensureColumn('sales_transactions', 'product_id', 'INTEGER');
            await ensureColumn('sales_transactions', 'quantity', 'INTEGER');
            await ensureColumn('sales_transactions', 'price', 'INTEGER');
            await ensureColumn('sales_transactions', 'total_price', 'INTEGER');
            await ensureColumn('sales_transactions', 'payment_method', 'TEXT');
            await ensureColumn('cash_drawer', 'date', 'TEXT');
            await ensureColumn('cash_drawer', 'cashier_name', 'TEXT');
            await ensureColumn('cash_drawer', 'opening_balance', 'INTEGER');
            await ensureColumn('cash_drawer', 'closing_balance', 'INTEGER');
            await ensureColumn('cash_drawer', 'difference', 'INTEGER');
            await ensureColumn('cash_drawer', 'notes', 'TEXT');
          } catch (columnErr) {
            console.error('Gagal memastikan kolom tabel:', columnErr);
            throw columnErr;
          }

          async function seedTableCount(table, seedData, insertSql) {
            const row = await getAsync(`SELECT COUNT(*) AS count FROM ${table}`);
            if (row.count > 0) return;
            const stmt = db.prepare(insertSql);
            seedData.forEach((item) => stmt.run(item));
            stmt.finalize();
          }

          const users = [
            ['admin', 'admin123', 'Administrator', 'admin', '081234567890'],
            ['kasir', 'kasir123', 'Kasir Ngebrak', 'kasir', '081298765432'],
            ['gudang', 'gudang123', 'Petugas Gudang', 'gudang', '081212121212']
          ];

          const categories = [
            ['Elektronik', 'Perangkat elektronik dan aksesoris'],
            ['Makanan', 'Bahan makanan dan snack'],
            ['Minuman', 'Minuman kemasan dan segar'],
            ['Perawatan', 'Produk kebersihan dan perawatan diri']
          ];

          const suppliers = [
            ['PT Sumber Jaya', 'Jl. Merdeka No. 12', '081100112233', 'supplier1@example.com'],
            ['CV Sejahtera', 'Jl. Kebon Jeruk No. 45', '081199887766', 'supplier2@example.com']
          ];

          const products = [
            ['BRG-001', 'Pulsa Elektrik', 2, 'Paket', 12000, 15000, 24, '2026-05-05', 'Rak A1', 1],
            ['BRG-002', 'Kopi Sachet', 2, 'Sachet', 4000, 5000, 40, '2026-05-07', 'Rak B3', 2],
            ['BRG-003', 'Beras 5kg', 2, 'Karung', 60000, 70000, 12, '2026-05-09', 'Gudang 1', 2],
            ['BRG-004', 'Minuman Ringan', 3, 'Botol', 5000, 8000, 8, '2026-05-10', 'Rak C2', 2]
          ];

          await seedTableCount('users', users, 'INSERT INTO users (username, password, fullname, role, phone) VALUES (?, ?, ?, ?, ?)');
          await seedTableCount('categories', categories, 'INSERT INTO categories (name, description) VALUES (?, ?)');
          await seedTableCount('suppliers', suppliers, 'INSERT INTO suppliers (name, address, phone, email) VALUES (?, ?, ?, ?)');
          await seedTableCount('products', products, 'INSERT INTO products (code, name, category_id, unit, purchase_price, sale_price, stock, entry_date, storage_location, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

          resolve();
        })().catch(reject);
      });
    });
  });
}

function sendError(res, message, status = 400) {
  res.status(status).json({ success: false, message });
}

function requireRole(req, res, allowedRoles = []) {
  const role = req.body?.role || req.query?.role;
  if (!role) return sendError(res, 'Role wajib dikirim.', 401);
  if (!allowedRoles.includes(role)) return sendError(res, `Akses ditolak untuk role: ${role}.`, 403);
  return null;
}

function ensureNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function toProductJoined(product) {
  return {
    ...product,
    categoryId: product.category_id,
    category: product.category_name,
    supplierId: product.supplier_id,
    supplier: product.supplier_name
  };
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return sendError(res, 'Username dan password wajib diisi.');
  }

  try {
    const user = await getAsync(
      'SELECT id, username, fullname, role FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (!user) return sendError(res, 'Username atau password salah.');
    return res.json({ success: true, user });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Terjadi kesalahan saat login.', 500);
  }
});

// ===== Overview =====
app.get('/api/overview', async (req, res) => {
  try {
    const role = req.query?.role;

    const [products, categories, suppliers, customers, recentSalesRows, recentLogsRows, salesChartRows, purchaseChartRows] = await Promise.all([
      allAsync(
        `SELECT p.*, c.name AS category_name, s.name AS supplier_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN suppliers s ON s.id = p.supplier_id`
      ),
      allAsync('SELECT * FROM categories'),
      allAsync('SELECT * FROM suppliers'),
      allAsync('SELECT * FROM customers'),
      allAsync(
        `SELECT st.*, p.name AS productName
         FROM sales_transactions st
         LEFT JOIN products p ON p.id = st.product_id
         ORDER BY st.id DESC
         LIMIT 7`
      ),
      allAsync(
        `SELECT * FROM inventory_logs
         ORDER BY created_at DESC
         LIMIT 8`
      ),
      allAsync(
        `SELECT date as day, SUM(total_price) as total
         FROM sales_transactions
         GROUP BY date
         ORDER BY day DESC
         LIMIT 7`
      ),
      allAsync(
        `SELECT date_in as day, SUM(quantity) as total
         FROM incoming_goods
         GROUP BY date_in
         ORDER BY day DESC
         LIMIT 7`
      )
    ]);

    const today = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const [counts] = await Promise.all([
      allAsync(
        `SELECT 
          (SELECT COUNT(*) FROM products) AS totalProducts,
          (SELECT COUNT(*) FROM users) AS totalUsers,
          (SELECT COUNT(*) FROM customers) AS totalCustomers,
          (SELECT COALESCE(SUM(total_price),0) FROM sales_transactions WHERE date = ?) AS todaySales`,
        [todayStr]
      )
    ]);

    const chartSales = salesChartRows.map((r) => ({ day: r.day, total: r.total }));
    const chartPurchase = purchaseChartRows.map((r) => ({ day: r.day, total: r.total }));

    const overview = {
      products: products.map(toProductJoined),
      categories,
      suppliers,
      customers,
      recentSales: recentSalesRows.map((r) => ({
        productId: r.product_id,
        productName: r.productName,
        quantity: r.quantity,
        totalPrice: r.total_price
      })),
      recentLogs: recentLogsRows.map((l) => ({
        id: l.id,
        type: l.type,
        productId: l.product_id,
        quantity: l.quantity,
        note: l.note,
        created_at: l.created_at
      })),
      lowStock: products
        .filter((p) => ensureNumber(p.stock) <= 5)
        .map(toProductJoined),
      totalProducts: counts?.[0]?.totalProducts || 0,
      totalUsers: counts?.[0]?.totalUsers || 0,
      totalCustomers: counts?.[0]?.totalCustomers || 0,
      todaySales: ensureNumber(counts?.[0]?.todaySales),
      salesChartData: chartSales,
      purchaseChartData: chartPurchase
    };

    return res.json({ success: true, overview });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil overview.', 500);
  }
});

// ===== Products CRUD =====
app.get('/api/products', async (req, res) => {
  try {
    const rows = await allAsync(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ORDER BY p.id DESC`
    );
    return res.json({ success: true, products: rows.map(toProductJoined) });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil produk.', 500);
  }
});

app.post('/api/products', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;
  try {
    const payload = req.body || {};
    const payloadFixed = {
      code: (payload.code || '').trim(),
      name: (payload.name || '').trim(),
      categoryId: payload.categoryId,
      unit: (payload.unit || '').trim(),
      purchasePrice: ensureNumber(payload.purchasePrice),
      salePrice: ensureNumber(payload.salePrice),
      stock: ensureNumber(payload.stock),
      entryDate: payload.entryDate || null,
      storageLocation: (payload.storageLocation || '').trim(),
      supplierId: payload.supplierId
    };

    if (!payloadFixed.code || !payloadFixed.name || !payloadFixed.categoryId || !payloadFixed.unit) {
      return sendError(res, 'Data produk tidak valid.');
    }

    await runAsync(
      `INSERT INTO products (code, name, category_id, unit, purchase_price, sale_price, stock, entry_date, storage_location, supplier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        payloadFixed.code,
        payloadFixed.name,
        payloadFixed.categoryId,
        payloadFixed.unit,
        payloadFixed.purchasePrice,
        payloadFixed.salePrice,
        payloadFixed.stock,
        payloadFixed.entryDate,
        payloadFixed.storageLocation,
        payloadFixed.supplierId || null
      ]
    );

    await runAsync(
      `INSERT INTO inventory_logs (type, product_id, quantity, note)
       VALUES (?, ?, ?, ?)`,
      ['create', null, payloadFixed.stock, `Menambah produk ${payloadFixed.name}`]
    );

    return res.json({ success: true, message: 'Produk berhasil disimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menyimpan produk.', 500);
  }
});

app.put('/api/products/:id', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const id = Number(req.params.id);
    const payload = req.body || {};

    await runAsync(
      `UPDATE products SET
        code = ?,
        name = ?,
        category_id = ?,
        unit = ?,
        purchase_price = ?,
        sale_price = ?,
        stock = ?,
        entry_date = ?,
        storage_location = ?,
        supplier_id = ?
       WHERE id = ?`,
      [
        (payload.code || '').trim(),
        (payload.name || '').trim(),
        payload.categoryId,
        (payload.unit || '').trim(),
        ensureNumber(payload.purchasePrice),
        ensureNumber(payload.salePrice),
        ensureNumber(payload.stock),
        payload.entryDate || null,
        (payload.storageLocation || '').trim(),
        payload.supplierId || null,
        id
      ]
    );

    return res.json({ success: true, message: 'Produk berhasil disimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengubah produk.', 500);
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const id = Number(req.params.id);

    await runAsync(`DELETE FROM products WHERE id = ?`, [id]);
    await runAsync(
      `INSERT INTO inventory_logs (type, product_id, quantity, note)
       VALUES (?, ?, ?, ?)`,
      ['delete', id, 0, `Hapus produk #${id}`]
    );

    return res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menghapus produk.', 500);
  }
});

// ===== Categories =====
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM categories ORDER BY id DESC');
    return res.json({ success: true, categories: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil kategori.', 500);
  }
});

app.post('/api/categories', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const name = (payload.name || '').trim();
    const description = (payload.description || '').trim();
    if (!name) return sendError(res, 'Nama kategori wajib.');

    await runAsync('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    return res.json({ success: true, message: 'Kategori berhasil disimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menyimpan kategori.', 500);
  }
});

// ===== Suppliers =====
app.get('/api/suppliers', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM suppliers ORDER BY id DESC');
    return res.json({ success: true, suppliers: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil supplier.', 500);
  }
});

app.post('/api/suppliers', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const name = (payload.name || '').trim();
    const address = (payload.address || '').trim();
    const phone = (payload.phone || '').trim();
    const email = (payload.email || '').trim();

    if (!name || !address || !phone || !email) return sendError(res, 'Data supplier tidak valid.');

    await runAsync(
      'INSERT INTO suppliers (name, address, phone, email) VALUES (?, ?, ?, ?)',
      [name, address, phone, email]
    );

    return res.json({ success: true, message: 'Supplier berhasil disimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menyimpan supplier.', 500);
  }
});

// ===== Customers =====
app.get('/api/customers', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM customers ORDER BY id DESC');
    return res.json({ success: true, customers: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil pelanggan.', 500);
  }
});

app.post('/api/customers', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const name = (payload.name || '').trim();
    const phone = (payload.phone || '').trim();
    const email = (payload.email || '').trim();
    const address = (payload.address || '').trim();

    if (!name || !phone || !email) return sendError(res, 'Data pelanggan tidak valid.');

    await runAsync(
      'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [name, phone, email, address]
    );

    return res.json({ success: true, message: 'Pelanggan berhasil disimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menyimpan pelanggan.', 500);
  }
});

// ===== Incoming goods (gudang) =====
app.get('/api/incoming', async (req, res) => {
  try {
    const rows = await allAsync(
      `SELECT ig.*, p.name AS product_name, s.name AS supplier_name
       FROM incoming_goods ig
       LEFT JOIN products p ON p.id = ig.product_id
       LEFT JOIN suppliers s ON s.id = ig.supplier_id
       ORDER BY ig.id DESC`
    );
    return res.json({ success: true, incoming: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil incoming.', 500);
  }
});

app.post('/api/incoming', async (req, res) => {
  const roleCheck = requireRole(req, res, ['gudang']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const productId = Number(payload.productId);
    const quantity = ensureNumber(payload.quantity);
    const supplierId = payload.supplierId ? Number(payload.supplierId) : null;
    const staffName = (payload.staffName || payload.staff_name || payload.cashierName || payload.cashier_name || '').trim() || 'Gudang';
    if (!productId || quantity <= 0) return sendError(res, 'Data incoming tidak valid.');

    const product = await getAsync('SELECT stock FROM products WHERE id = ?', [productId]);
    if (!product) return sendError(res, 'Produk tidak ditemukan.');

    await runAsync('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
    await runAsync(
      `INSERT INTO incoming_goods (date_in, product_id, quantity, supplier_id, staff_name)
       VALUES (?, ?, ?, ?, ?)` ,
      [new Date().toISOString().slice(0, 10), productId, quantity, supplierId, staffName]
    );

    await runAsync(
      `INSERT INTO inventory_logs (type, product_id, quantity, note)
       VALUES (?, ?, ?, ?)` ,
      ['incoming', productId, quantity, `Barang masuk x${quantity} (staff: ${staffName})`]
    );

    return res.json({ success: true, message: 'Barang masuk berhasil dicatat.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mencatat barang masuk.', 500);
  }
});

// ===== Outgoing + Sales =====
app.get('/api/outgoing', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM outgoing_goods ORDER BY id DESC');
    return res.json({ success: true, outgoing: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil outgoing.', 500);
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM sales_transactions ORDER BY id DESC');
    return res.json({ success: true, sales: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil sales.', 500);
  }
});

app.post('/api/sell', async (req, res) => {
  const roleCheck = requireRole(req, res, ['kasir']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const productId = Number(payload.productId);
    const quantity = ensureNumber(payload.quantity);
    const paymentMethod = (payload.paymentMethod || '').trim() || 'Tunai';
    const cashierName = (payload.cashierName || '').trim() || 'Kasir';

    if (!productId || quantity <= 0) return sendError(res, 'Data sell tidak valid.');

    const product = await getAsync('SELECT stock, sale_price FROM products WHERE id = ?', [productId]);
    if (!product) return sendError(res, 'Produk tidak ditemukan.');
    if (ensureNumber(product.stock) < quantity) return sendError(res, 'Stok tidak cukup.');

    const price = ensureNumber(product.sale_price);
    const totalPrice = price * quantity;

    await runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);

    await runAsync(
      `INSERT INTO sales_transactions (date, cashier_name, product_id, quantity, price, total_price, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [new Date().toISOString().slice(0, 10), cashierName, productId, quantity, price, totalPrice, paymentMethod]
    );

    await runAsync(
      `INSERT INTO inventory_logs (type, product_id, quantity, note)
       VALUES (?, ?, ?, ?)` ,
      ['sell', productId, quantity, `Penjualan x${quantity} (metode: ${paymentMethod})`]
    );

    return res.json({ success: true, message: 'Sell tersimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menyimpan transaksi.', 500);
  }
});

// Serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

ensureSchemaAndSeed()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Gagal inisialisasi database:', err);
    process.exit(1);
  });

