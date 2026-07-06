require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@libsql/client');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function ensureColumn(table, column, definition) {
  const columns = await allAsync(`PRAGMA table_info(${table})`);
  if (columns.some((col) => col.name === column)) return;
  await runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function formatLocalDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}




async function runAsync(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return { changes: result.rowsAffected, lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined };
}

async function allAsync(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

async function getAsync(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows[0];
}

async function ensureSchemaAndSeed() {
  try {
    await runAsync(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      fullname TEXT,
      role TEXT,
      phone TEXT
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      address TEXT,
      phone TEXT,
      email TEXT
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      points INTEGER DEFAULT 0
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS products (
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

    await runAsync(`CREATE TABLE IF NOT EXISTS incoming_goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_in TEXT,
      product_id INTEGER,
      quantity INTEGER,
      supplier_id INTEGER,
      staff_name TEXT
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS outgoing_goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_out TEXT,
      product_id INTEGER,
      quantity INTEGER,
      destination TEXT,
      staff_name TEXT
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS sales_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      cashier_name TEXT,
      product_id INTEGER,
      quantity INTEGER,
      price INTEGER,
      total_price INTEGER,
      payment_method TEXT,
      product_code TEXT,
      product_name TEXT,
      unit TEXT,
      purchase_price INTEGER,
      sale_price INTEGER,
      profit_per_unit INTEGER
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS sales_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      cashier_name TEXT,
      payment_method TEXT,
      subtotal INTEGER,
      total_items INTEGER
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS sales_receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      price INTEGER,
      total_price INTEGER,
      product_code TEXT,
      product_name TEXT,
      unit TEXT,
      purchase_price INTEGER,
      sale_price INTEGER,
      profit_per_unit INTEGER,
      FOREIGN KEY(receipt_id) REFERENCES sales_receipts(id)
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      product_id INTEGER,
      quantity INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS inventory_count_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      counted_at TEXT,
      staff_name TEXT,
      note TEXT
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS inventory_count_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      product_id INTEGER,
      system_stock INTEGER,
      counted_stock INTEGER,
      difference INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES inventory_count_sessions(id)
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS cash_drawer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      cashier_name TEXT,
      opening_balance INTEGER,
      closing_balance INTEGER,
      difference INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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
    await ensureColumn('sales_transactions', 'product_code', 'TEXT');
    await ensureColumn('sales_transactions', 'product_name', 'TEXT');
    await ensureColumn('sales_transactions', 'unit', 'TEXT');
    await ensureColumn('sales_transactions', 'purchase_price', 'INTEGER');
    await ensureColumn('sales_transactions', 'sale_price', 'INTEGER');
    await ensureColumn('sales_transactions', 'profit_per_unit', 'INTEGER');
    await ensureColumn('cash_drawer', 'date', 'TEXT');
    await ensureColumn('cash_drawer', 'cashier_name', 'TEXT');
    await ensureColumn('cash_drawer', 'opening_balance', 'INTEGER');
    await ensureColumn('cash_drawer', 'closing_balance', 'INTEGER');
    await ensureColumn('cash_drawer', 'difference', 'INTEGER');
    await ensureColumn('cash_drawer', 'notes', 'TEXT');

    async function seedTableCount(table, seedData, insertSql) {
      const row = await getAsync(`SELECT COUNT(*) AS count FROM ${table}`);
      if (row && row.count > 0) return;
      for (const item of seedData) {
        await runAsync(insertSql, item);
      }
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

  } catch (err) {
    console.error("Error during schema ensure and seed:", err);
  }
}


function sendError(res, message, status = 400) {
  res.status(status).json({ success: false, message });
}

function requireRole(req, res, allowedRoles = []) {
  const role = req.body?.role || req.query?.role;
  if (!role) {
    sendError(res, 'Role wajib dikirim.', 401);
    return true;
  }
  if (!allowedRoles.includes(role)) {
    sendError(res, `Akses ditolak untuk role: ${role}.`, 403);
    return true;
  }
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
        `SELECT date as day, 
                SUM(total_price) as total_gross,
                SUM(COALESCE(purchase_price, 0) * quantity) as total_capital,
                SUM(COALESCE(profit_per_unit, 0) * quantity) as total_net
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

    const todayStr = new Date().toISOString().slice(0, 10);

    const [counts] = await Promise.all([
      allAsync(
        `SELECT 
          (SELECT COUNT(*) FROM products) AS totalProducts,
          (SELECT COUNT(*) FROM users) AS totalUsers,
          (SELECT COUNT(*) FROM customers) AS totalCustomers,
          (SELECT COALESCE(SUM(total_price),0) FROM sales_transactions WHERE date = ?) AS todaySales,
          (SELECT COALESCE(SUM(total_price),0) FROM sales_transactions WHERE date = ?) AS todayGrossRevenue,
          (SELECT COALESCE(SUM(purchase_price * quantity),0) FROM sales_transactions WHERE date = ?) AS todayCapitalCost,
          (SELECT COALESCE(SUM(profit_per_unit * quantity),0) FROM sales_transactions WHERE date = ?) AS todayNetProfit`,
        [todayStr, todayStr, todayStr, todayStr]
      )
    ]);

    const chartSales = salesChartRows.map((r) => ({ day: r.day, total: r.total_gross || 0 }));
    const chartPurchase = salesChartRows.map((r) => ({ day: r.day, total: r.total_capital || 0 }));
    const chartProfit = salesChartRows.map((r) => ({ day: r.day, total: r.total_net || 0 }));

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
      todayGrossRevenue: ensureNumber(counts?.[0]?.todayGrossRevenue),
      todayCapitalCost: ensureNumber(counts?.[0]?.todayCapitalCost),
      todayNetProfit: ensureNumber(counts?.[0]?.todayNetProfit),
      salesChartData: chartSales,
      purchaseChartData: chartPurchase,
      profitChartData: chartProfit
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

app.put('/api/categories/:id', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const name = (payload.name || '').trim();
    const description = (payload.description || '').trim();

    if (!Number.isFinite(id)) return sendError(res, 'ID kategori tidak valid.');
    if (!name) return sendError(res, 'Nama kategori wajib.');

    await runAsync(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    return res.json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal memperbarui kategori.', 500);
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendError(res, 'ID kategori tidak valid.');

    await runAsync('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menghapus kategori.', 500);
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

app.put('/api/suppliers/:id', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const name = (payload.name || '').trim();
    const address = (payload.address || '').trim();
    const phone = (payload.phone || '').trim();
    const email = (payload.email || '').trim();

    if (!Number.isFinite(id)) return sendError(res, 'ID supplier tidak valid.');
    if (!name || !address || !phone || !email) return sendError(res, 'Data supplier tidak valid.');

    await runAsync(
      'UPDATE suppliers SET name = ?, address = ?, phone = ?, email = ? WHERE id = ?',
      [name, address, phone, email, id]
    );

    return res.json({ success: true, message: 'Supplier berhasil diperbarui.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal memperbarui supplier.', 500);
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendError(res, 'ID supplier tidak valid.');

    await runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Supplier berhasil dihapus.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menghapus supplier.', 500);
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
  const roleCheck = requireRole(req, res, ['gudang', 'admin']);
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

// ===== Stock Opname (Inventory Count) =====
app.get('/api/stock-opname/products', async (req, res) => {
  const roleCheck = requireRole(req, res, ['gudang', 'admin']);
  if (roleCheck) return;

  try {
    const rows = await allAsync(
      `SELECT p.id, p.code, p.name, p.stock, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ORDER BY p.id DESC`
    );
    return res.json({ success: true, products: rows.map(toProductJoined) });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil produk untuk stok opname.', 500);
  }
});

app.post('/api/stock-opname', async (req, res) => {
  const roleCheck = requireRole(req, res, ['gudang', 'admin']);
  if (roleCheck) return;

  const payload = req.body || {};
  const staffName = (payload.staffName || '').trim() || 'Gudang';
  const note = (payload.note || '').trim();
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!items.length) return sendError(res, 'Item stok opname wajib diisi.');

  const dbRun = (sql, params = []) => runAsync(sql, params);

  try {
    await dbRun('BEGIN TRANSACTION');

    const insertSession = await dbRun(
      `INSERT INTO inventory_count_sessions (counted_at, staff_name, note) VALUES (?, ?, ?)`,
      [new Date().toISOString().slice(0, 19).replace('T', ' '), staffName, note || null]
    );

    const sessionId = insertSession.lastID;

    for (const it of items) {
      const productId = Number(it.productId);
      const systemStock = ensureNumber(it.systemStock);
      const countedStock = ensureNumber(it.countedStock);
      const difference = countedStock - systemStock;
      const itemNote = (it.note || '').trim();

      const product = await getAsync('SELECT stock FROM products WHERE id = ?', [productId]);
      if (!product) throw new Error(`Produk tidak ditemukan: ${productId}`);

      // gunakan stock DB sebagai sumber kebenaran untuk update
      const actualSystemStock = ensureNumber(product.stock);
      const actualDifference = countedStock - actualSystemStock;

      await dbRun(
        `INSERT INTO inventory_count_items (session_id, product_id, system_stock, counted_stock, difference, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, productId, actualSystemStock, countedStock, actualDifference, itemNote || null]
      );

      await dbRun('UPDATE products SET stock = stock + ? WHERE id = ?', [actualDifference, productId]);

      await dbRun(
        `INSERT INTO inventory_logs (type, product_id, quantity, note)
         VALUES (?, ?, ?, ?)`,
        ['stock_opname', productId, actualDifference, `Stok opname (${staffName}): ${countedStock}`]
      );
    }

    await dbRun('COMMIT');
    return res.json({ success: true, message: 'Stok opname berhasil disimpan.' });
  } catch (e) {
    console.error(e);
    try { await dbRun('ROLLBACK'); } catch {}
    return sendError(res, e?.message ? `Gagal menyimpan stok opname: ${e.message}` : 'Gagal menyimpan stok opname.', 500);
  }
});

app.get('/api/stock-opname/logs', async (req, res) => {
  const roleCheck = requireRole(req, res, ['gudang', 'admin']);
  if (roleCheck) return;

  try {
    const rows = await allAsync(
      `SELECT s.id, s.counted_at, s.staff_name, s.note,
              COUNT(i.id) as item_count
       FROM inventory_count_sessions s
       LEFT JOIN inventory_count_items i ON i.session_id = s.id
       GROUP BY s.id
       ORDER BY s.id DESC
       LIMIT 20`
    );
    return res.json({ success: true, logs: rows });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil histori stok opname.', 500);
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

// ===== Receipts (POS) =====
// Receipt dibuat per checkout agar struk lengkap (satu transaksi) bisa diprint/download.

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

app.post('/api/checkout', async (req, res) => {
  const roleCheck = requireRole(req, res, ['kasir', 'admin']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const cart = Array.isArray(payload.cart) ? payload.cart : [];
    const paymentMethod = (payload.paymentMethod || '').trim() || 'Tunai';
    const cashierName = (payload.cashierName || '').trim() || 'Kasir';

    if (!cart.length) return sendError(res, 'Cart wajib diisi.');

    // Validasi & hitung semua baris terlebih dahulu
    const receiptItems = [];
    let subtotal = 0;
    let itemsCount = 0;

    await runAsync('BEGIN TRANSACTION');

    try {
      for (const it of cart) {
        const productId = Number(it.productId);
        const quantity = ensureNumber(it.quantity);
        if (!productId || quantity <= 0) throw new Error('Item cart tidak valid.');

        const product = await getAsync(
          'SELECT stock, sale_price, purchase_price, code, name, unit FROM products WHERE id = ?',
          [productId]
        );
        if (!product) throw new Error(`Produk tidak ditemukan: ${productId}`);
        if (ensureNumber(product.stock) < quantity) throw new Error(`Stok tidak cukup untuk ${product.name}`);

        const price = ensureNumber(product.sale_price);
        const totalPrice = price * quantity;
        const purchasePrice = ensureNumber(product.purchase_price);
        const profitPerUnit = price - purchasePrice;

        // update stok
        await runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);

        await runAsync(
          `INSERT INTO inventory_logs (type, product_id, quantity, note)
           VALUES (?, ?, ?, ?)`,
          ['sell', productId, quantity, `Penjualan x${quantity} (metode: ${paymentMethod})`]
        );

        receiptItems.push({
          productId,
          quantity,
          price,
          totalPrice,
          paymentMethod,
          cashierName,
          product_code: product.code ?? null,
          product_name: product.name ?? null,
          unit: product.unit ?? null,
          purchase_price: purchasePrice,
          sale_price: price,
          profit_per_unit: profitPerUnit
        });

        subtotal += totalPrice;
        itemsCount += quantity;
      }

      // simpan receipt header
      const insertReceipt = await runAsync(
        `INSERT INTO sales_receipts (date, cashier_name, payment_method, subtotal, total_items)
         VALUES (?, ?, ?, ?, ?)`,
        [new Date().toISOString().slice(0, 10), cashierName, paymentMethod, subtotal, itemsCount]
      );
      const receiptId = insertReceipt.lastID;

      // simpan receipt items dan sales_transactions
      for (const ri of receiptItems) {
        await runAsync(
          `INSERT INTO sales_receipt_items (
              receipt_id,
              product_id,
              quantity,
              price,
              total_price,
              product_code,
              product_name,
              unit,
              purchase_price,
              sale_price,
              profit_per_unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            ri.productId,
            ri.quantity,
            ri.price,
            ri.totalPrice,
            ri.product_code,
            ri.product_name,
            ri.unit,
            ri.purchase_price,
            ri.sale_price,
            ri.profit_per_unit
          ]
        );

        await runAsync(
          `INSERT INTO sales_transactions (
              date,
              cashier_name,
              product_id,
              quantity,
              price,
              total_price,
              payment_method,
              product_code,
              product_name,
              unit,
              purchase_price,
              sale_price,
              profit_per_unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            new Date().toISOString().slice(0, 10),
            ri.cashierName,
            ri.productId,
            ri.quantity,
            ri.price,
            ri.totalPrice,
            ri.paymentMethod,
            ri.product_code,
            ri.product_name,
            ri.unit,
            ri.purchase_price,
            ri.sale_price,
            ri.profit_per_unit
          ]
        );
      }

      await runAsync('COMMIT');
      return res.json({ success: true, receiptId, message: 'Checkout tersimpan.' });
    } catch (e) {
      try { await runAsync('ROLLBACK'); } catch {}
      return sendError(res, e?.message ? `Gagal menyimpan checkout: ${e.message}` : 'Gagal menyimpan checkout.', 500);
    }
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal memproses checkout.', 500);
  }
});

app.get('/api/receipts/:id/pdf', async (req, res) => {
  const roleCheck = requireRole(req, res, ['kasir', 'admin', 'gudang']);
  if (roleCheck) return;

  try {
    const receiptId = Number(req.params.id);
    if (!Number.isFinite(receiptId)) return sendError(res, 'ID receipt tidak valid.');

    const header = await getAsync(
      `SELECT * FROM sales_receipts WHERE id = ?`,
      [receiptId]
    );
    if (!header) return sendError(res, 'Receipt tidak ditemukan.', 404);

    const items = await allAsync(
      `SELECT * FROM sales_receipt_items WHERE receipt_id = ? ORDER BY id ASC`,
      [receiptId]
    );

    // Generate PDF biner asli menggunakan PDFKit
    const doc = new PDFDocument({ size: [226, 800], margin: 16, autoFirstPage: false });

    // Kumpulkan chunk buffer
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=struk-${receiptId}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    });
    doc.on('error', (err) => {
      console.error('PDFKit error:', err);
      if (!res.headersSent) sendError(res, 'Gagal membuat PDF struk.', 500);
    });

    const storeName = 'Ngebrak Store';
    const pageWidth = 226;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    // Format rupiah
    const formatRp = (val) => {
      const n = Number(val) || 0;
      return 'Rp ' + n.toLocaleString('id-ID');
    };

    // Hitung tinggi halaman dinamis: header ~120px + per item ~20px + footer ~60px
    const estimatedHeight = 160 + items.length * 22 + 80;
    doc.addPage({ size: [pageWidth, Math.max(estimatedHeight, 300)] });

    // ── Header toko ──
    doc.font('Helvetica-Bold').fontSize(13).text(storeName, margin, 18, { width: contentWidth, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#555').text('Struk Penjualan', margin, doc.y, { width: contentWidth, align: 'center' });

    // Garis pemisah
    const drawDash = (y) => {
      doc.save().moveTo(margin, y).lineTo(pageWidth - margin, y)
        .dash(2, { space: 2 }).strokeColor('#aaa').lineWidth(0.5).stroke().restore();
    };
    drawDash(doc.y + 4);
    doc.moveDown(0.6);

    // ── Info struk ──
    const infoY = doc.y;
    doc.font('Helvetica').fontSize(7.5).fillColor('#333');
    const labelX = margin;
    const valueX = margin + 55;
    const drawInfo = (label, value) => {
      const curY = doc.y;
      doc.text(label, labelX, curY, { width: 53, align: 'left' });
      doc.text(String(value), valueX, curY, { width: contentWidth - 55, align: 'left' });
      doc.moveDown(0.3);
    };
    drawInfo('No. Struk', `#${receiptId}`);
    drawInfo('Tanggal', header.date ? String(header.date).slice(0, 16) : '-');
    drawInfo('Kasir', header.cashier_name || '-');
    drawInfo('Metode Bayar', header.payment_method || '-');

    drawDash(doc.y + 4);
    doc.moveDown(0.6);

    // ── Header tabel ──
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111');
    const colProduk = margin;
    const colQty = margin + 95;
    const colHarga = margin + 120;
    const colTotal = margin + 158;
    const rowY = doc.y;
    doc.text('Produk', colProduk, rowY, { width: 93 });
    doc.text('Qty', colQty, rowY, { width: 23, align: 'right' });
    doc.text('Harga', colHarga, rowY, { width: 36, align: 'right' });
    doc.text('Total', colTotal, rowY, { width: contentWidth - (colTotal - margin), align: 'right' });
    doc.moveDown(0.2);
    drawDash(doc.y + 2);
    doc.moveDown(0.4);

    // ── Baris item ──
    doc.font('Helvetica').fontSize(7.5).fillColor('#222');
    for (const it of items) {
      const ry = doc.y;
      const qty = Number(it.quantity) || 0;
      const price = Number(it.price) || 0;
      const total = Number(it.total_price) || 0;
      doc.text(String(it.product_name), colProduk, ry, { width: 93 });
      doc.text(String(qty), colQty, ry, { width: 23, align: 'right' });
      doc.text(formatRp(price), colHarga, ry, { width: 36, align: 'right' });
      doc.text(formatRp(total), colTotal, ry, { width: contentWidth - (colTotal - margin), align: 'right' });
      doc.moveDown(0.35);
    }

    drawDash(doc.y + 2);
    doc.moveDown(0.5);

    // ── Total ──
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    const totalY = doc.y;
    doc.text('TOTAL', margin, totalY, { width: contentWidth - 60 });
    doc.text(formatRp(header.subtotal), margin, totalY, { width: contentWidth, align: 'right' });
    doc.moveDown(1);

    // ── Footer ──
    drawDash(doc.y + 2);
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(7).fillColor('#555')
      .text('Terima kasih telah berbelanja!', margin, doc.y, { width: contentWidth, align: 'center' });
    doc.moveDown(0.2);
    doc.text('Ngebrak Store - Solusi Belanja Anda', margin, doc.y, { width: contentWidth, align: 'center' });

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) return sendError(res, 'Gagal membuat PDF struk.', 500);
  }
});

app.post('/api/sell', async (req, res) => {
  const roleCheck = requireRole(req, res, ['kasir', 'admin']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const productId = Number(payload.productId);
    const quantity = ensureNumber(payload.quantity);
    const paymentMethod = (payload.paymentMethod || '').trim() || 'Tunai';
    const cashierName = (payload.cashierName || '').trim() || 'Kasir';

    if (!productId || quantity <= 0) return sendError(res, 'Data sell tidak valid.');

    const product = await getAsync('SELECT stock, sale_price, purchase_price FROM products WHERE id = ?', [productId]);
    if (!product) return sendError(res, 'Produk tidak ditemukan.');
    if (ensureNumber(product.stock) < quantity) return sendError(res, 'Stok tidak cukup.');

    const price = ensureNumber(product.sale_price);
    const totalPrice = price * quantity;

    const purchasePrice = ensureNumber(product.purchase_price);
    const profitPerUnit = price - purchasePrice;

    const productSnap = await getAsync(
      `SELECT code, name, unit, purchase_price, sale_price
       FROM products
       WHERE id = ?`,
      [productId]
    );

    const product_code = productSnap?.code ?? null;
    const product_name = productSnap?.name ?? null;
    const unit = productSnap?.unit ?? null;

    await runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);

    await runAsync(
      `INSERT INTO sales_transactions (
          date,
          cashier_name,
          product_id,
          quantity,
          price,
          total_price,
          payment_method,
          product_code,
          product_name,
          unit,
          purchase_price,
          sale_price,
          profit_per_unit
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        new Date().toISOString().slice(0, 10),
        cashierName,
        productId,
        quantity,
        price,
        totalPrice,
        paymentMethod,
        product_code,
        product_name,
        unit,
        purchasePrice,
        price,
        profitPerUnit
      ]
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

app.get('/api/reports/summary/pdf', async (req, res) => {
  const roleCheck = requireRole(req, res, ['admin']);
  if (roleCheck) return;

  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // ── Rentang tanggal dari query parameter ──
    const startDate = (req.query.startDate || '').trim();
    const endDate = (req.query.endDate || '').trim();
    const hasDateRange = startDate && endDate;

    // Bangun klausa WHERE untuk filter tanggal
    const dateWhereClause = hasDateRange ? `WHERE st.date >= ? AND st.date <= ?` : '';
    const dateParams = hasDateRange ? [startDate, endDate] : [];

    // Label periode untuk header PDF
    const periodeLabel = hasDateRange
      ? `Periode: ${startDate} s/d ${endDate}`
      : 'Sepanjang Waktu';

    // ── Query data: ringkasan keuangan (filtered by date range) ──
    const financeSql = `SELECT
        COALESCE(SUM(st.total_price), 0) AS periodGross,
        COALESCE(SUM(st.profit_per_unit * st.quantity), 0) AS periodNet,
        COALESCE(SUM(COALESCE(st.purchase_price, 0) * st.quantity), 0) AS periodCapital,
        COUNT(*) AS totalTransactions
      FROM sales_transactions st
      ${dateWhereClause}`;
    const financeRow = (await allAsync(financeSql, dateParams))[0] || {};

    // ── Query: detail penjualan per produk (JOIN ke products untuk nama terkini) ──
    const salesDetailSql = `SELECT
        st.product_id,
        p.code AS current_code,
        p.name AS current_name,
        p.unit AS current_unit,
        SUM(st.quantity) AS total_qty,
        SUM(st.total_price) AS total_revenue,
        SUM(COALESCE(st.purchase_price, 0) * st.quantity) AS total_capital,
        SUM(st.profit_per_unit * st.quantity) AS total_profit
      FROM sales_transactions st
      LEFT JOIN products p ON p.id = st.product_id
      ${dateWhereClause}
      GROUP BY st.product_id
      ORDER BY total_revenue DESC`;
    const salesByProduct = await allAsync(salesDetailSql, dateParams);

    // ── Query: data counts (tidak di-filter tanggal) ──
    const countRow = (await allAsync(
      `SELECT
        (SELECT COUNT(*) FROM products) AS totalProducts,
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM customers) AS totalCustomers`
    ))[0] || {};

    // ── Query: daftar produk untuk stok opname ──
    const products = await allAsync(
      `SELECT code, name, stock, purchase_price, sale_price FROM products ORDER BY name ASC`
    );

    // ── PDF Generation ──
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      const filename = hasDateRange
        ? `laporan-${startDate}_${endDate}.pdf`
        : `laporan-rekapan-${todayStr}.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    });
    doc.on('error', (err) => {
      console.error('PDFKit error:', err);
      if (!res.headersSent) sendError(res, 'Gagal membuat PDF Laporan.', 500);
    });

    const formatRp = (val) => 'Rp ' + (Number(val) || 0).toLocaleString('id-ID');

    // ═══ Warna tema Excel-style ═══
    const COLOR_HEADER_BG = '#1F4E79';     // Biru tua untuk header tabel
    const COLOR_HEADER_TEXT = '#FFFFFF';    // Putih untuk teks header
    const COLOR_ROW_EVEN = '#F2F7FB';      // Biru sangat muda untuk baris genap
    const COLOR_ROW_ODD = '#FFFFFF';       // Putih untuk baris ganjil
    const COLOR_BORDER = '#B0BEC5';        // Abu-abu border
    const COLOR_TOTAL_BG = '#D6E4F0';     // Biru muda untuk baris total
    const COLOR_SECTION_BG = '#E8F0FE';   // Background judul section
    const COLOR_TEXT_DARK = '#1A1A1A';     // Teks utama
    const COLOR_TEXT_SECONDARY = '#555555'; // Teks sekunder

    const PAGE_LEFT = 40;
    const PAGE_RIGHT = 555;
    const TABLE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

    // ═══ Helper: Gambar cell dengan border ═══
    const drawCell = (x, y, w, h, text, options = {}) => {
      const {
        bgColor = null,
        textColor = COLOR_TEXT_DARK,
        font = 'Helvetica',
        fontSize = 9,
        align = 'left',
        borderColor = COLOR_BORDER,
        padding = 4
      } = options;

      // Background
      if (bgColor) {
        doc.save().rect(x, y, w, h).fill(bgColor).restore();
      }

      // Border (4 sisi)
      doc.save()
        .rect(x, y, w, h)
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .stroke()
        .restore();

      // Teks di dalam cell
      doc.font(font).fontSize(fontSize).fillColor(textColor);
      doc.text(text, x + padding, y + (h - fontSize) / 2, {
        width: w - padding * 2,
        align: align,
        lineBreak: false
      });
    };

    // ═══ Helper: Gambar baris tabel penjualan ═══
    const SALES_COLS = [
      { label: 'No',          width: 30,  align: 'center' },
      { label: 'Produk',      width: 155, align: 'left' },
      { label: 'Qty',         width: 45,  align: 'right' },
      { label: 'Pendapatan',  width: 95,  align: 'right' },
      { label: 'Modal',       width: 95,  align: 'right' },
      { label: 'Keuntungan',  width: 95,  align: 'right' }
    ];
    const SALES_ROW_HEIGHT = 22;

    const drawSalesHeader = () => {
      let x = PAGE_LEFT;
      const y = doc.y;
      SALES_COLS.forEach((col) => {
        drawCell(x, y, col.width, SALES_ROW_HEIGHT + 2, col.label, {
          bgColor: COLOR_HEADER_BG,
          textColor: COLOR_HEADER_TEXT,
          font: 'Helvetica-Bold',
          fontSize: 9,
          align: col.align
        });
        x += col.width;
      });
      doc.y = y + SALES_ROW_HEIGHT + 2;
    };

    const drawSalesRow = (rowData, index) => {
      let x = PAGE_LEFT;
      const y = doc.y;
      const bgColor = index % 2 === 0 ? COLOR_ROW_ODD : COLOR_ROW_EVEN;
      const values = [
        String(index + 1),
        rowData.name,
        String(rowData.qty),
        rowData.revenue,
        rowData.capital,
        rowData.profit
      ];
      SALES_COLS.forEach((col, i) => {
        drawCell(x, y, col.width, SALES_ROW_HEIGHT, values[i], {
          bgColor: bgColor,
          fontSize: 8.5,
          align: col.align
        });
        x += col.width;
      });
      doc.y = y + SALES_ROW_HEIGHT;
    };

    const drawSalesTotalRow = (totals) => {
      let x = PAGE_LEFT;
      const y = doc.y;
      const vals = ['', 'TOTAL', totals.qty, totals.revenue, totals.capital, totals.profit];
      SALES_COLS.forEach((col, i) => {
        drawCell(x, y, col.width, SALES_ROW_HEIGHT + 2, vals[i], {
          bgColor: COLOR_TOTAL_BG,
          font: 'Helvetica-Bold',
          fontSize: 9,
          align: col.align,
          borderColor: '#7BA7CC'
        });
        x += col.width;
      });
      doc.y = y + SALES_ROW_HEIGHT + 2;
    };

    // ═══ Helper: Gambar baris tabel stok opname ═══
    const STOCK_COLS = [
      { label: 'No',          width: 30,  align: 'center' },
      { label: 'Kode',        width: 75,  align: 'left' },
      { label: 'Nama Produk', width: 175, align: 'left' },
      { label: 'Stok',        width: 50,  align: 'right' },
      { label: 'Hrg Beli',    width: 90,  align: 'right' },
      { label: 'Hrg Jual',    width: 95,  align: 'right' }
    ];
    const STOCK_ROW_HEIGHT = 22;

    const drawStockHeader = () => {
      let x = PAGE_LEFT;
      const y = doc.y;
      STOCK_COLS.forEach((col) => {
        drawCell(x, y, col.width, STOCK_ROW_HEIGHT + 2, col.label, {
          bgColor: COLOR_HEADER_BG,
          textColor: COLOR_HEADER_TEXT,
          font: 'Helvetica-Bold',
          fontSize: 9,
          align: col.align
        });
        x += col.width;
      });
      doc.y = y + STOCK_ROW_HEIGHT + 2;
    };

    const drawStockRow = (p, index) => {
      let x = PAGE_LEFT;
      const y = doc.y;
      const bgColor = index % 2 === 0 ? COLOR_ROW_ODD : COLOR_ROW_EVEN;
      const values = [
        String(index + 1),
        p.code || '-',
        p.name || '-',
        String(p.stock || 0),
        formatRp(p.purchase_price),
        formatRp(p.sale_price)
      ];
      STOCK_COLS.forEach((col, i) => {
        drawCell(x, y, col.width, STOCK_ROW_HEIGHT, values[i], {
          bgColor: bgColor,
          fontSize: 8.5,
          align: col.align
        });
        x += col.width;
      });
      doc.y = y + STOCK_ROW_HEIGHT;
    };

    // ═══ Helper: Judul Section dengan background ═══
    const drawSectionTitle = (title) => {
      const y = doc.y;
      const h = 28;
      doc.save().rect(PAGE_LEFT, y, TABLE_WIDTH, h).fill(COLOR_SECTION_BG).restore();
      doc.save().rect(PAGE_LEFT, y, TABLE_WIDTH, h).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke().restore();
      // Garis aksen kiri
      doc.save().rect(PAGE_LEFT, y, 4, h).fill(COLOR_HEADER_BG).restore();
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR_HEADER_BG);
      doc.text(title, PAGE_LEFT + 14, y + (h - 12) / 2, { width: TABLE_WIDTH - 20 });
      doc.y = y + h + 8;
    };

    // ═══════════════════════════════════════════════════
    //                  MULAI RENDER PDF
    // ═══════════════════════════════════════════════════

    // ── Header Utama ──
    // Logo bar atas
    doc.save().rect(0, 0, 595.28, 80).fill(COLOR_HEADER_BG).restore();
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF');
    doc.text('LAPORAN REKAPAN', PAGE_LEFT, 18, { width: TABLE_WIDTH, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#B8D4E8');
    doc.text('NGEBRAK STORE', PAGE_LEFT, 44, { width: TABLE_WIDTH, align: 'center' });
    doc.y = 90;

    // Info periode & tanggal cetak
    doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT_SECONDARY);
    doc.text(periodeLabel, PAGE_LEFT, doc.y, { width: TABLE_WIDTH, align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(8).fillColor('#999999');
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, PAGE_LEFT, doc.y, { width: TABLE_WIDTH, align: 'center' });
    doc.moveDown(1.2);

    // ── Section 1: Ringkasan Keuangan (styled cards) ──
    drawSectionTitle('Ringkasan Keuangan');

    // Summary cards dalam grid 2x2
    const cardW = (TABLE_WIDTH - 10) / 2;
    const cardH = 48;
    const cardPad = 8;
    const summaryItems = [
      { label: 'Pendapatan Kotor', value: formatRp(financeRow.periodGross), color: '#27AE60' },
      { label: 'Total Modal',       value: formatRp(financeRow.periodCapital), color: '#E67E22' },
      { label: 'Keuntungan Bersih', value: formatRp(financeRow.periodNet), color: '#2980B9' },
      { label: 'Jumlah Transaksi',  value: String(financeRow.totalTransactions || 0), color: '#8E44AD' }
    ];

    const cardStartY = doc.y;
    summaryItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = PAGE_LEFT + col * (cardW + 10);
      const cy = cardStartY + row * (cardH + 8);

      // Card background & border
      doc.save().rect(cx, cy, cardW, cardH).fill('#FAFBFC').restore();
      doc.save().rect(cx, cy, cardW, cardH).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke().restore();
      // Aksen kiri warna
      doc.save().rect(cx, cy, 4, cardH).fill(item.color).restore();

      // Label
      doc.font('Helvetica').fontSize(8).fillColor(COLOR_TEXT_SECONDARY);
      doc.text(item.label, cx + cardPad + 4, cy + 8, { width: cardW - cardPad * 2 });
      // Value
      doc.font('Helvetica-Bold').fontSize(13).fillColor(item.color);
      doc.text(item.value, cx + cardPad + 4, cy + 24, { width: cardW - cardPad * 2 });
    });
    doc.y = cardStartY + 2 * (cardH + 8) + 4;

    // Info tambahan (small stats row)
    const statsY = doc.y;
    const statW = TABLE_WIDTH / 3;
    const statItems = [
      { label: 'Total Produk', value: String(countRow.totalProducts || 0) },
      { label: 'Total Pelanggan', value: String(countRow.totalCustomers || 0) },
      { label: 'Total Staff', value: String(countRow.totalUsers || 0) }
    ];
    statItems.forEach((st, i) => {
      const sx = PAGE_LEFT + i * statW;
      doc.save().rect(sx, statsY, statW, 26).fill('#F5F5F5').restore();
      doc.save().rect(sx, statsY, statW, 26).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke().restore();
      doc.font('Helvetica').fontSize(7.5).fillColor(COLOR_TEXT_SECONDARY);
      doc.text(st.label + ':', sx + 6, statsY + 4, { width: statW - 12, continued: false });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_TEXT_DARK);
      doc.text(st.value, sx + 6, statsY + 14, { width: statW - 12 });
    });
    doc.y = statsY + 26 + 16;

    // ── Section 2: Detail Penjualan Per Produk ──
    drawSectionTitle('Detail Penjualan Per Produk');

    if (salesByProduct.length === 0) {
      const emptyY = doc.y;
      doc.save().rect(PAGE_LEFT, emptyY, TABLE_WIDTH, 30).fill('#FFF9E6').restore();
      doc.save().rect(PAGE_LEFT, emptyY, TABLE_WIDTH, 30).strokeColor('#F0C36D').lineWidth(0.5).stroke().restore();
      doc.font('Helvetica').fontSize(9).fillColor('#8B6914');
      doc.text('⚠ Tidak ada data penjualan pada periode ini.', PAGE_LEFT + 10, emptyY + 9, { width: TABLE_WIDTH - 20 });
      doc.y = emptyY + 30 + 16;
    } else {
      drawSalesHeader();

      salesByProduct.forEach((row, idx) => {
        if (doc.y > 730) {
          doc.addPage();
          drawSalesHeader();
        }
        drawSalesRow({
          name: row.current_name || `ID:${row.product_id}`,
          qty: row.total_qty || 0,
          revenue: formatRp(row.total_revenue),
          capital: formatRp(row.total_capital),
          profit: formatRp(row.total_profit)
        }, idx);
      });

      // Baris total
      drawSalesTotalRow({
        qty: String(salesByProduct.reduce((s, r) => s + (r.total_qty || 0), 0)),
        revenue: formatRp(financeRow.periodGross),
        capital: formatRp(financeRow.periodCapital),
        profit: formatRp(financeRow.periodNet)
      });
      doc.moveDown(1.5);
    }

    // ── Section 3: Stok Opname Produk ──
    if (doc.y > 640) doc.addPage();
    drawSectionTitle('Laporan Stok Opname Produk');

    drawStockHeader();

    products.forEach((p, idx) => {
      if (doc.y > 730) {
        doc.addPage();
        drawStockHeader();
      }
      drawStockRow(p, idx);
    });

    // ── Footer ──
    doc.moveDown(1.5);
    const footerY = doc.y;
    doc.save()
      .moveTo(PAGE_LEFT, footerY)
      .lineTo(PAGE_RIGHT, footerY)
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .stroke()
      .restore();
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(7.5).fillColor('#999999');
    doc.text('Dokumen ini digenerate secara otomatis oleh sistem Ngebrak Store.', PAGE_LEFT, doc.y, { width: TABLE_WIDTH, align: 'center' });
    doc.moveDown(0.2);
    doc.text('© Ngebrak Store — Solusi Belanja Anda', PAGE_LEFT, doc.y, { width: TABLE_WIDTH, align: 'center' });

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) return sendError(res, 'Gagal membuat laporan PDF.', 500);
  }
});

// Serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simpan promise inisialisasi DB agar bisa di-await oleh setiap request
const dbReady = ensureSchemaAndSeed().catch((err) => {
  console.error('Gagal inisialisasi database:', err);
});

// Middleware: Pastikan DB sudah siap sebelum setiap request API diproses
// (Penting untuk Vercel serverless / cold start)
app.use('/api', async (req, res, next) => {
  await dbReady;
  next();
});

if (!process.env.VERCEL) {
  dbReady.then(() => {
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  });
}

module.exports = app;

