const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');


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

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
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
        payment_method TEXT,
        product_code TEXT,
        product_name TEXT,
        unit TEXT,
        purchase_price INTEGER,
        sale_price INTEGER,
        profit_per_unit INTEGER
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inventory_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        product_id INTEGER,
        quantity INTEGER,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inventory_count_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        counted_at TEXT,
        staff_name TEXT,
        note TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inventory_count_items (
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

      db.run(`CREATE TABLE IF NOT EXISTS cash_drawer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        cashier_name TEXT,
        opening_balance INTEGER,
        closing_balance INTEGER,
        difference INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // receipt tables
      db.run(`CREATE TABLE IF NOT EXISTS sales_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        cashier_name TEXT,
        payment_method TEXT,
        subtotal INTEGER,
        total_items INTEGER
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS sales_receipt_items (
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

      db.run(`CREATE INDEX IF NOT EXISTS idx_sales_receipt_items_receipt_id ON sales_receipt_items(receipt_id)`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_sales_receipts_date ON sales_receipts(date)`);

      db.run(`SELECT 1`, async (err) => {
        if (err) return reject(err);
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
        } catch (e) {
          console.error('Gagal memastikan kolom tabel:', e);
          return reject(e);
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
      });
    });
  });
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return sendError(res, 'Username dan password wajib diisi.');

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

app.get('/api/overview', async (req, res) => {
  try {
    const [products, categories, suppliers, customers, recentSalesRows, recentLogsRows, salesChartRows, purchaseChartRows, profitChartRows] = await Promise.all([
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
        `SELECT sri.product_id, sri.product_name AS productName, sri.quantity, sri.total_price
         FROM sales_receipt_items sri
         JOIN sales_receipts sr ON sr.id = sri.receipt_id
         ORDER BY sri.id DESC
         LIMIT 7`
      ),
      allAsync(`SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 8`),
      allAsync(
        `SELECT sr.date as day, SUM(sr.subtotal) as total_gross
         FROM sales_receipts sr
         GROUP BY sr.date
         ORDER BY day DESC
         LIMIT 7`
      ),
      allAsync(
        `SELECT sr.date as day, SUM(sri.purchase_price * sri.quantity) as total_capital
         FROM sales_receipt_items sri
         JOIN sales_receipts sr ON sr.id = sri.receipt_id
         GROUP BY sr.date
         ORDER BY day DESC
         LIMIT 7`
      ),
      allAsync(
        `SELECT sr.date as day, SUM(sri.profit_per_unit * sri.quantity) as total_net
         FROM sales_receipt_items sri
         JOIN sales_receipts sr ON sr.id = sri.receipt_id
         GROUP BY sr.date
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
          (SELECT COALESCE(SUM(subtotal),0) FROM sales_receipts WHERE date = ?) AS todayGrossRevenue,
          (SELECT COALESCE(SUM(sri.purchase_price * sri.quantity),0) FROM sales_receipt_items sri JOIN sales_receipts sr ON sr.id = sri.receipt_id WHERE sr.date = ?) AS todayCapitalCost,
          (SELECT COALESCE(SUM(sri.profit_per_unit * sri.quantity),0) FROM sales_receipt_items sri JOIN sales_receipts sr ON sr.id = sri.receipt_id WHERE sr.date = ?) AS todayNetProfit`,
        [todayStr, todayStr, todayStr]
      )
    ]);

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
      lowStock: products.filter((p) => ensureNumber(p.stock) <= 5).map(toProductJoined),
      totalProducts: counts?.[0]?.totalProducts || 0,
      totalUsers: counts?.[0]?.totalUsers || 0,
      totalCustomers: counts?.[0]?.totalCustomers || 0,
      todaySales: ensureNumber(counts?.[0]?.todayGrossRevenue),
      todayGrossRevenue: ensureNumber(counts?.[0]?.todayGrossRevenue),
      todayCapitalCost: ensureNumber(counts?.[0]?.todayCapitalCost),
      todayNetProfit: ensureNumber(counts?.[0]?.todayNetProfit),
      salesChartData: salesChartRows.map((r) => ({ day: r.day, total: r.total_gross })),
      purchaseChartData: purchaseChartRows.map((r) => ({ day: r.day, total: r.total_capital })),
      profitChartData: profitChartRows.map((r) => ({ day: r.day, total: r.total_net }))
    };

    return res.json({ success: true, overview });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal mengambil overview.', 500);
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

    const product = await getAsync('SELECT stock, sale_price, purchase_price FROM products WHERE id = ?', [productId]);
    if (!product) return sendError(res, 'Produk tidak ditemukan.');
    if (ensureNumber(product.stock) < quantity) return sendError(res, 'Stok tidak cukup.');

    const price = ensureNumber(product.sale_price);
    const totalPrice = price * quantity;

    const purchasePrice = ensureNumber(product.purchase_price);
    const profitPerUnit = price - purchasePrice;

    const productSnap = await getAsync(
      `SELECT code, name, unit, purchase_price, sale_price FROM products WHERE id = ?`,
      [productId]
    );

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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString().slice(0, 10),
        cashierName,
        productId,
        quantity,
        price,
        totalPrice,
        paymentMethod,
        productSnap?.code ?? null,
        productSnap?.name ?? null,
        productSnap?.unit ?? null,
        purchasePrice,
        price,
        profitPerUnit
      ]
    );

    await runAsync(
      `INSERT INTO inventory_logs (type, product_id, quantity, note)
       VALUES (?, ?, ?, ?)`,
      ['sell', productId, quantity, `Penjualan x${quantity} (metode: ${paymentMethod})`]
    );

    return res.json({ success: true, message: 'Sell tersimpan.' });
  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal menyimpan transaksi.', 500);
  }
});

// receipt per checkout (single request) - will be used later if you modify frontend
app.post('/api/checkout', async (req, res) => {
  const roleCheck = requireRole(req, res, ['kasir']);
  if (roleCheck) return;

  try {
    const payload = req.body || {};
    const cart = Array.isArray(payload.cart) ? payload.cart : [];
    const paymentMethod = (payload.paymentMethod || '').trim() || 'Tunai';
    const cashierName = (payload.cashierName || '').trim() || 'Kasir';

    if (!cart.length) return sendError(res, 'Cart wajib diisi.');

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

      const insertReceipt = await runAsync(
        `INSERT INTO sales_receipts (date, cashier_name, payment_method, subtotal, total_items)
         VALUES (?, ?, ?, ?, ?)`,
        [new Date().toISOString().slice(0, 10), cashierName, paymentMethod, subtotal, itemsCount]
      );
      const receiptId = insertReceipt.lastID;

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
  // endpoint download struk: tidak butuh role, karena browser melakukan GET langsung.



  try {
    const receiptId = Number(req.params.id);
    if (!Number.isFinite(receiptId)) return sendError(res, 'ID receipt tidak valid.');

    const header = await getAsync(`SELECT * FROM sales_receipts WHERE id = ?`, [receiptId]);
    if (!header) return sendError(res, 'Receipt tidak ditemukan.', 404);

    const items = await allAsync(`SELECT * FROM sales_receipt_items WHERE receipt_id = ? ORDER BY id ASC`, [receiptId]);

    const storeName = 'Ngebrak Store';
    const html = `
      <html><head><meta charset="utf-8"/><title>Struk #${receiptId}</title>
      <style>
        body{ font-family: Arial, Helvetica, sans-serif; padding:24px; }
        h1{ font-size:18px; margin:0 0 8px; }
        .meta{ font-size:12px; color:#333; margin-bottom:14px; }
        table{ width:100%; border-collapse:collapse; font-size:12px; }
        th,td{ border-bottom:1px dashed #ccc; padding:6px 0; }
        th{ text-align:left; color:#222; }
        .right{ text-align:right; }
        .total{ font-weight:700; border-top:2px solid #000; }
        .footer{ margin-top:18px; font-size:11px; color:#333; }
      </style></head>
      <body>
        <h1>${escapeHtml(storeName)}</h1>
        <div class="meta">
          <div>No: <strong>#${escapeHtml(receiptId)}</strong></div>
          <div>Tanggal: ${escapeHtml(header.date)}</div>
          <div>Kasir: ${escapeHtml(header.cashier_name)}</div>
          <div>Metode: ${escapeHtml(header.payment_method)}</div>
        </div>
        <table>
          <thead><tr><th>Produk</th><th class="right">Qty</th><th class="right">Harga</th><th class="right">Total</th></tr></thead>
          <tbody>
            ${items.map((it) => `
              <tr>
                <td>${escapeHtml(it.product_name)}</td>
                <td class="right">${escapeHtml(String(it.quantity))}</td>
                <td class="right">${escapeHtml(String(it.price))}</td>
                <td class="right">${escapeHtml(String(it.total_price))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div class="total right">Subtotal: ${escapeHtml(String(header.subtotal))}</div>
          <div style="margin-top:6px;">Terima kasih.</div>
        </div>
      </body></html>
    `;

    // Render PDF biner menggunakan pdfkit.
    // Catatan: pdfkit tidak otomatis render HTML, jadi kita tulis teks + garis sederhana.
    // (tetap menghasilkan file PDF reader-compatible.)

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${receiptId}.pdf`);

    const doc = new PDFDocument({ size: 'A6', margin: 18 });
    doc.pipe(res);

    const pad = (n) => String(n ?? '').toString();
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(storeName, { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    doc.text(`No: #${receiptId}`, { align: 'left' });
    doc.text(`Tanggal: ${header.date}`, { align: 'left' });
    doc.text(`Kasir: ${header.cashier_name}`, { align: 'left' });
    doc.text(`Metode: ${header.payment_method}`, { align: 'left' });

    doc.moveDown(0.4);
    doc.font('Helvetica-Bold');
    doc.text('--------------------------------', { align: 'left' });
    doc.font('Helvetica');

    // header tabel sederhana
    doc.fontSize(9).text('Produk', 0, doc.y, { width: 170 });
    doc.text('Qty', 180, doc.y, { width: 20, align: 'right' });
    doc.text('Total', 205, doc.y, { width: 60, align: 'right' });
    doc.moveDown(0.2);

    doc.fontSize(9);

    for (const it of items) {
      doc.text(it.product_name || '-', 0, doc.y, { width: 170 });
      doc.text(String(it.quantity), 180, doc.y - 1, { width: 20, align: 'right' });
      doc.text(String(it.total_price), 205, doc.y - 1, { width: 60, align: 'right' });
      doc.moveDown(0.15);
    }

    doc.moveDown(0.2);
    doc.font('Helvetica-Bold');
    doc.text('--------------------------------', { align: 'left' });
    doc.font('Helvetica');

    doc.fontSize(10).text(`Subtotal: ${header.subtotal}`, { align: 'right' });
    doc.moveDown(0.2);
    doc.fontSize(9).text('Terima kasih.', { align: 'center' });

    doc.end();
    return;


  } catch (e) {
    console.error(e);
    return sendError(res, 'Gagal membuat PDF struk.', 500);
  }
});

// Keep SPA routing
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

