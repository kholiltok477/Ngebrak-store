const state = {
  user: null,
  products: [],
  categories: [],
  suppliers: [],
  customers: [],
  overview: null,
  cart: []
};

const elements = {};

window.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  const storedUser = localStorage.getItem('ngebrakUser');
  if (!storedUser) {
    window.location.href = '/';
    return;
  }

  try {
    state.user = JSON.parse(storedUser);
  } catch (err) {
    localStorage.removeItem('ngebrakUser');
    window.location.href = '/';
    return;
  }

  mapElements();
  bindEvents();
  setUserHeader();
  loadSettings();
  buildSidebar();
  selectSection('dashboard');
  refreshStoreData();
}

function mapElements() {
  elements.sidebarMenu = document.getElementById('sidebarMenu');
  elements.profileName = document.getElementById('profileName');
  elements.profileRole = document.getElementById('profileRole');
  elements.headerUser = document.getElementById('headerUser');
  elements.searchInput = document.getElementById('searchInput');
  elements.sidebarLogout = document.getElementById('logoutButton');
  elements.modeToggle = document.getElementById('modeToggle');

  elements.dashboardMetrics = document.getElementById('dashboardMetrics');
  elements.topProducts = document.getElementById('topProducts');
  elements.lowStockItems = document.getElementById('lowStockItems');
  elements.activityList = document.getElementById('activityList');
  elements.salesChart = document.getElementById('salesChart');
  elements.purchaseChart = document.getElementById('purchaseChart');

  elements.posCategoryFilter = document.getElementById('posCategoryFilter');
  elements.posSupplierFilter = document.getElementById('posSupplierFilter');
  elements.posBarcodeInput = document.getElementById('posBarcodeInput');
  elements.posSearchInput = document.getElementById('posSearchInput');
  elements.posProductGrid = document.getElementById('posProductGrid');
  elements.cartItems = document.getElementById('cartItems');
  elements.cartDiscount = document.getElementById('cartDiscount');
  elements.cartTax = document.getElementById('cartTax');
  elements.cartTotalItems = document.getElementById('cartTotalItems');
  elements.cartSubtotal = document.getElementById('cartSubtotal');
  elements.cartGrandTotal = document.getElementById('cartGrandTotal');
  elements.paymentMethod = document.getElementById('paymentMethod');
  elements.checkoutButton = document.getElementById('checkoutButton');

  elements.productSearch = document.getElementById('productSearch');
  elements.productCategoryFilter = document.getElementById('productCategoryFilter');
  elements.productTable = document.getElementById('productTable');

  elements.categoryTable = document.getElementById('categoryTable');
  elements.supplierTable = document.getElementById('supplierTable');
  elements.customerTable = document.getElementById('customerTable');

  elements.storeNameInput = document.getElementById('storeNameInput');
  elements.storeLogoInput = document.getElementById('storeLogoInput');
  elements.storeTaxInput = document.getElementById('storeTaxInput');
  elements.receiptPrinterInput = document.getElementById('receiptPrinterInput');
  elements.saveSettingsButton = document.getElementById('saveSettingsButton');

  elements.openProductModal = document.getElementById('openProductModal');
  elements.openCategoryModal = document.getElementById('openCategoryModal');
  elements.openSupplierModal = document.getElementById('openSupplierModal');
  elements.openCustomerModal = document.getElementById('openCustomerModal');

  elements.modalOverlay = document.getElementById('modalOverlay');
  elements.modalDialog = document.getElementById('modalDialog');
}

function bindEvents() {
  elements.sidebarLogout?.addEventListener('click', () => {
    localStorage.removeItem('ngebrakUser');
    window.location.href = '/';
  });

  elements.modeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  elements.searchInput?.addEventListener('input', () => {
    const section = getActiveSection();
    if (section === 'products') renderProductTable();
    if (section === 'pos') renderProductListForPOS();
  });

  elements.posSearchInput?.addEventListener('input', renderProductListForPOS);
  elements.posBarcodeInput?.addEventListener('keydown', handleBarcodeScan);
  elements.posCategoryFilter?.addEventListener('change', renderProductListForPOS);
  elements.posSupplierFilter?.addEventListener('change', renderProductListForPOS);
  elements.cartDiscount?.addEventListener('input', updateCartSummary);
  elements.cartTax?.addEventListener('input', updateCartSummary);
  elements.checkoutButton?.addEventListener('click', handleCheckout);

  elements.productSearch?.addEventListener('input', renderProductTable);
  elements.productCategoryFilter?.addEventListener('change', renderProductTable);

  elements.openProductModal?.addEventListener('click', openProductModal);
  elements.openCategoryModal?.addEventListener('click', openCategoryModal);
  elements.openSupplierModal?.addEventListener('click', openSupplierModal);
  elements.openCustomerModal?.addEventListener('click', openCustomerModal);

  elements.saveSettingsButton?.addEventListener('click', saveSettings);
  elements.modalOverlay?.addEventListener('click', closeModal);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

function setUserHeader() {
  elements.profileName.textContent = state.user.fullname || state.user.username;
  elements.profileRole.textContent = state.user.role?.toUpperCase() || 'USER';
  elements.headerUser.textContent = state.user.fullname || state.user.username;
}

function buildSidebar() {
  const menuItems = [
    { label: 'Dashboard', section: 'dashboard' },
    { label: 'POS', section: 'pos' },
    { label: 'Produk', section: 'products' },
    { label: 'Kategori', section: 'categories' },
    { label: 'Supplier', section: 'suppliers' },
    { label: 'Pelanggan', section: 'customers' },
    { label: 'Pengaturan', section: 'settings' }
  ];

  elements.sidebarMenu.innerHTML = menuItems
    .map((item, index) => `<button class="sidebar-link${index === 0 ? ' active' : ''}" data-section="${item.section}">${item.label}</button>`)
    .join('');

  elements.sidebarMenu.querySelectorAll('.sidebar-link').forEach((button) => {
    button.addEventListener('click', () => selectSection(button.dataset.section));
  });
}

function getActiveSection() {
  const activeButton = elements.sidebarMenu.querySelector('.sidebar-link.active');
  return activeButton?.dataset.section || 'dashboard';
}

function selectSection(section) {
  const sections = document.querySelectorAll('.page-section');
  sections.forEach((sectionElement) => {
    sectionElement.classList.toggle('hidden', sectionElement.id !== `${section}Section`);
  });

  elements.sidebarMenu.querySelectorAll('.sidebar-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });

  if (section === 'dashboard') renderDashboard();
  if (section === 'pos') renderPOSSection();
  if (section === 'products') renderProductTable();
  if (section === 'categories') renderCategoryTable();
  if (section === 'suppliers') renderSupplierTable();
  if (section === 'customers') renderCustomerTable();
}

async function refreshStoreData() {
  await Promise.all([
    loadOverview(),
    refreshProducts(),
    refreshCategories(),
    refreshSuppliers(),
    refreshCustomers()
  ]);
}

async function loadOverview() {
  const result = await apiGet(`/api/overview?role=${state.user.role}`);
  if (!result.success) return;
  state.overview = result.overview;
  state.products = result.overview.products || state.products;
  state.categories = result.overview.categories || state.categories;
  state.suppliers = result.overview.suppliers || state.suppliers;
  state.customers = result.overview.customers || state.customers;
  if (getActiveSection() === 'dashboard') renderDashboard();
}

async function refreshProducts() {
  const result = await apiGet('/api/products');
  if (result.success) {
    state.products = result.products || [];
    if (getActiveSection() === 'products') renderProductTable();
    if (getActiveSection() === 'pos') renderProductListForPOS();
  }
}

async function refreshCategories() {
  const result = await apiGet('/api/categories');
  if (result.success) state.categories = result.categories || [];
}

async function refreshSuppliers() {
  const result = await apiGet('/api/suppliers');
  if (result.success) state.suppliers = result.suppliers || [];
}

async function refreshCustomers() {
  const result = await apiGet('/api/customers');
  if (result.success) state.customers = result.customers || [];
}

function renderDashboard() {
  const overview = state.overview || {};
  const lowStock = overview.lowStock || state.products.filter((product) => product.stock <= 5);
  const recentSales = overview.recentSales || [];
  const recentLogs = overview.recentLogs || [];

  const metrics = [];
  if (state.user.role === 'admin') {
    metrics.push({ label: 'Total Produk', value: overview.totalProducts || state.products.length });
    metrics.push({ label: 'Total Pengguna', value: overview.totalUsers || 0 });
    metrics.push({ label: 'Total Pelanggan', value: overview.totalCustomers || state.customers.length });
    metrics.push({ label: 'Penjualan Hari Ini', value: overview.todaySales || 0 });
  } else if (state.user.role === 'kasir') {
    metrics.push({ label: 'Transaksi Hari Ini', value: overview.todaySales || 0 });
    metrics.push({ label: 'Produk Terjual', value: recentSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0) });
    metrics.push({ label: 'Pendapatan', value: formatCurrency(recentSales.reduce((sum, sale) => sum + Number(sale.totalPrice || 0), 0)) });
    metrics.push({ label: 'Produk Tersedia', value: overview.totalProducts || state.products.length });
  } else if (state.user.role === 'gudang') {
    metrics.push({ label: 'Total Produk', value: overview.totalProducts || state.products.length });
    metrics.push({ label: 'Stok Menipis', value: lowStock.length });
    metrics.push({ label: 'Supplier', value: state.suppliers.length });
    metrics.push({ label: 'Pelanggan', value: overview.totalCustomers || state.customers.length });
  }

  elements.dashboardMetrics.innerHTML = metrics
    .map((item) => `
      <div class="metrics-card">
        <div class="metric-label">${item.label}</div>
        <div class="metric-value">${item.value}</div>
      </div>
    `)
    .join('');

  renderSalesChart(overview.salesChartData || []);
  renderPurchaseChart(overview.purchaseChartData || []);
  renderTopProducts(recentSales);
  renderLowStockItems(lowStock);
  renderActivityList(recentLogs);
}

function renderTopProducts(recentSales) {
  const topProducts = recentSales.reduce((acc, sale) => {
    const name = sale.productName || 'Produk tidak dikenal';
    const product = acc.find((item) => item.name === name);
    if (product) {
      product.sold += Number(sale.quantity || 0);
    } else {
      acc.push({ name, sold: Number(sale.quantity || 0) });
    }
    return acc;
  }, []);

  topProducts.sort((a, b) => b.sold - a.sold);
  const items = topProducts.slice(0, 5);
  if (!items.length) {
    elements.topProducts.innerHTML = '<li>Tidak ada data produk terlaris.</li>';
    return;
  }
  elements.topProducts.innerHTML = items
    .map((item) => `<li>${item.name} — ${item.sold} terjual</li>`)
    .join('');
}

function renderLowStockItems(lowStock) {
  if (!lowStock.length) {
    elements.lowStockItems.innerHTML = '<li>Tidak ada produk stok rendah.</li>';
    return;
  }
  elements.lowStockItems.innerHTML = lowStock
    .map((item) => `<li>${item.name} — ${item.stock} tersisa</li>`)
    .join('');
}

function renderActivityList(logs) {
  if (!logs.length) {
    elements.activityList.innerHTML = '<li>Tidak ada aktivitas terbaru.</li>';
    return;
  }
  elements.activityList.innerHTML = logs
    .map((log) => {
      const label = log.type === 'sell' ? 'Penjualan' : log.type === 'incoming' ? 'Barang masuk' : log.type === 'delete' ? 'Hapus produk' : 'Aktivitas';
      const date = new Date(log.created_at || log.date || Date.now()).toLocaleString('id-ID');
      return `<li><strong>${label}</strong> — ${log.note || '-'}<br><small>${date}</small></li>`;
    })
    .join('');
}

function normalizeChartData(rows, points = 7) {
  const dayLabels = Array.from({ length: points }, (_, index) => {
    const date = new Date(Date.now() - (points - 1 - index) * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  });

  return dayLabels.map((day) => {
    const record = rows.find((row) => row.day === day);
    return {
      label: new Date(day).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' }),
      value: record ? Number(record.total) : 0
    };
  });
}

function renderChart(element, rows, title) {
  if (!element) return;
  const data = normalizeChartData(rows);
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  element.innerHTML = `
    <div class="chart-grid">
      ${data
        .map(
          (item) => `
        <div class="chart-bar">
          <div class="chart-bar-fill" style="height: ${Math.round((item.value / maxValue) * 100)}%"></div>
          <div class="chart-bar-label">${item.label}</div>
          <div class="chart-bar-value">${formatCurrency(item.value)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderSalesChart(rows) {
  renderChart(elements.salesChart, rows, 'Penjualan 7 Hari');
}

function renderPurchaseChart(rows) {
  renderChart(elements.purchaseChart, rows, 'Pembelian 7 Hari');
}

function renderPOSSection() {
  renderPOSFilters();
  renderProductListForPOS();
  updateCartSummary();
  if (state.user.role !== 'kasir') {
    elements.checkoutButton.disabled = true;
    elements.checkoutButton.textContent = 'Hanya kasir dapat checkout';
  } else {
    elements.checkoutButton.disabled = false;
    elements.checkoutButton.textContent = 'Bayar Sekarang';
  }
}

function renderPOSFilters() {
  elements.posCategoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
    state.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
  elements.posSupplierFilter.innerHTML = '<option value="">Semua Supplier</option>' +
    state.suppliers.map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`).join('');
}

function renderProductListForPOS() {
  const searchTerm = elements.posSearchInput.value.trim().toLowerCase();
  const categoryId = Number(elements.posCategoryFilter.value || 0);
  const supplierId = Number(elements.posSupplierFilter.value || 0);

  const filtered = state.products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm) || (product.code || '').toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryId || product.categoryId === categoryId;
    const matchesSupplier = !supplierId || product.supplierId === supplierId;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  if (!filtered.length) {
    elements.posProductGrid.innerHTML = '<div class="empty-cart">Tidak ada produk yang cocok.</div>';
    return;
  }

  elements.posProductGrid.innerHTML = filtered.map((product) => `
    <div class="product-card">
      <h4>${product.name}</h4>
      <p>${product.category || '-'} • ${product.supplier || '-'}</p>
      <p class="price">${formatCurrency(product.salePrice)}</p>
      <p class="stock">Stok: ${product.stock}</p>
      <button type="button" class="primary-button add-to-cart" data-id="${product.id}">Tambah</button>
    </div>
  `).join('');

  elements.posProductGrid.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', () => addProductToCart(Number(button.dataset.id)));
  });
}

function handleBarcodeScan(event) {
  if (event.key !== 'Enter') return;
  const code = elements.posBarcodeInput.value.trim();
  if (!code) return;

  const product = state.products.find((item) => (item.code || '').toLowerCase() === code.toLowerCase());
  if (!product) {
    alert(`Produk dengan barcode/kode '${code}' tidak ditemukan.`);
    return;
  }

  addProductToCart(product.id);
  elements.posBarcodeInput.value = '';
}

function addProductToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  if (product.stock <= 0) {
    alert('Produk habis stok.');
    return;
  }

  const existing = state.cart.find((item) => item.id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      alert('Tidak bisa menambahkan lebih dari stok tersedia.');
      return;
    }
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, quantity: 1 });
  }

  renderCartItems();
  updateCartSummary();
}

function renderCartItems() {
  if (!state.cart.length) {
    elements.cartItems.innerHTML = '<div class="empty-cart">Keranjang masih kosong.</div>';
    return;
  }

  elements.cartItems.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div>
        <h4>${item.name}</h4>
        <p>${formatCurrency(item.salePrice)} × ${item.quantity}</p>
      </div>
      <div class="item-actions">
        <button type="button" class="secondary-button decrease" data-id="${item.id}">-</button>
        <span>${item.quantity}</span>
        <button type="button" class="secondary-button increase" data-id="${item.id}">+</button>
        <button type="button" class="secondary-button delete" data-id="${item.id}">Hapus</button>
      </div>
    </div>
  `).join('');

  elements.cartItems.querySelectorAll('.decrease').forEach((button) => {
    button.addEventListener('click', () => changeCartQuantity(Number(button.dataset.id), -1));
  });
  elements.cartItems.querySelectorAll('.increase').forEach((button) => {
    button.addEventListener('click', () => changeCartQuantity(Number(button.dataset.id), 1));
  });
  elements.cartItems.querySelectorAll('.delete').forEach((button) => {
    button.addEventListener('click', () => removeCartItem(Number(button.dataset.id)));
  });
}

function changeCartQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.id === productId);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  if (item.quantity > item.stock) item.quantity = item.stock;
  renderCartItems();
  updateCartSummary();
}

function removeCartItem(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  renderCartItems();
  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = state.cart.reduce((sum, item) => sum + Number(item.salePrice || 0) * item.quantity, 0);
  const discount = Number(elements.cartDiscount?.value || 0);
  const taxRate = Number(elements.cartTax?.value || 0);
  const discounted = Math.max(0, subtotal - (subtotal * discount) / 100);
  const grandTotal = Math.max(0, discounted + (discounted * taxRate) / 100);

  elements.cartTotalItems.textContent = state.cart.length;
  elements.cartSubtotal.textContent = formatCurrency(subtotal);
  elements.cartGrandTotal.textContent = formatCurrency(grandTotal);
}

async function handleCheckout() {
  if (!state.cart.length) {
    alert('Keranjang kosong.');
    return;
  }
  if (state.user.role !== 'kasir') {
    alert('Hanya kasir yang dapat menyelesaikan transaksi.');
    return;
  }

  const paymentMethod = elements.paymentMethod.value || 'Tunai';
  const payload = state.cart.map((item) => ({
    role: state.user.role,
    productId: item.id,
    quantity: item.quantity,
    paymentMethod,
    cashierName: state.user.fullname
  }));

  for (const item of payload) {
    const result = await apiPost('/api/sell', item);
    if (!result.success) {
      alert(`Transaksi gagal: ${result.message}`);
      return;
    }
  }

  alert('Transaksi berhasil disimpan.');
  state.cart = [];
  renderCartItems();
  updateCartSummary();
  await refreshStoreData();
}

async function renderProductTable() {
  const tbody = elements.productTable.querySelector('tbody');
  if (!tbody) return;
  const searchTerm = elements.productSearch.value.trim().toLowerCase();
  const categoryId = Number(elements.productCategoryFilter.value || 0);

  const filtered = state.products.filter((product) => {
    const matchesText = product.name.toLowerCase().includes(searchTerm) || (product.code || '').toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryId || product.categoryId === categoryId;
    return matchesText && matchesCategory;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px;">Tidak ada produk.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((product) => `
    <tr>
      <td>${product.code || '—'}<br><strong>${product.name}</strong></td>
      <td>${product.category || '—'}</td>
      <td>${product.supplier || '—'}</td>
      <td>${formatCurrency(product.salePrice)}</td>
      <td>${product.stock}</td>
      <td>${product.stock <= 5 ? '<span class="badge-low">Stok rendah</span>' : '<span class="badge-normal">Stok aman</span>'}</td>
      <td><button type="button" class="action-button edit" data-id="${product.id}">Edit</button> <button type="button" class="action-button delete" data-id="${product.id}">Hapus</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.edit').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = Number(button.dataset.id);
      const product = state.products.find((item) => item.id === productId);
      openProductModal(product);
    });
  });

  tbody.querySelectorAll('.delete').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = Number(button.dataset.id);
      deleteProduct(productId);
    });
  });

  elements.productCategoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
    state.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
}

function openProductModal(product = null) {
  const title = product ? 'Ubah Produk' : 'Tambah Produk';
  const categories = state.categories;
  const suppliers = state.suppliers;
  const formHtml = `
    <form id="productModalForm" class="modal-form">
      <div class="modal-grid">
        <label>Kode produk<input name="code" value="${product?.code || ''}" required></label>
        <label>Nama produk<input name="name" value="${product?.name || ''}" required></label>
        <label>Kategori
          <select name="categoryId" required>
            <option value="">Pilih kategori</option>
            ${categories.map((category) => `<option value="${category.id}" ${product?.categoryId === category.id ? 'selected' : ''}>${category.name}</option>`).join('')}
          </select>
        </label>
        <label>Satuan<input name="unit" value="${product?.unit || ''}" required></label>
        <label>Harga beli<input type="number" name="purchasePrice" min="0" value="${product?.purchasePrice || ''}" required></label>
        <label>Harga jual<input type="number" name="salePrice" min="0" value="${product?.salePrice || ''}" required></label>
        <label>Stok<input type="number" name="stock" min="0" value="${product?.stock ?? 0}" required></label>
        <label>Tanggal masuk<input type="date" name="entryDate" value="${product?.entryDate || ''}"></label>
        <label>Lokasi penyimpanan<input name="storageLocation" value="${product?.storageLocation || ''}"></label>
        <label>Supplier
          <select name="supplierId">
            <option value="">Pilih supplier</option>
            ${suppliers.map((supplier) => `<option value="${supplier.id}" ${product?.supplierId === supplier.id ? 'selected' : ''}>${supplier.name}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="primary-button">Simpan</button>
        <button type="button" class="secondary-button" id="cancelModalButton">Batal</button>
      </div>
    </form>
  `;

  showModal(title, formHtml);
  document.getElementById('productModalForm')?.addEventListener('submit', (event) => handleProductForm(event, product?.id));
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);
}

async function handleProductForm(event, productId) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    role: state.user.role,
    code: formData.get('code').trim(),
    name: formData.get('name').trim(),
    categoryId: Number(formData.get('categoryId')),
    unit: formData.get('unit').trim(),
    purchasePrice: Number(formData.get('purchasePrice')),
    salePrice: Number(formData.get('salePrice')),
    stock: Number(formData.get('stock')),
    entryDate: formData.get('entryDate') || undefined,
    storageLocation: formData.get('storageLocation').trim(),
    supplierId: formData.get('supplierId') ? Number(formData.get('supplierId')) : null
  };

  const url = productId ? `/api/products/${productId}` : '/api/products';
  const method = productId ? 'PUT' : 'POST';
  const result = await apiCall(url, method, payload);
  if (!result.success) {
    alert(result.message || 'Gagal menyimpan produk.');
    return;
  }

  alert(result.message || 'Produk berhasil disimpan.');
  closeModal();
  await refreshProducts();
  await loadOverview();
}

async function deleteProduct(productId) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;
  const result = await apiCall(`/api/products/${productId}`, 'DELETE', { role: state.user.role });
  if (!result.success) {
    alert(result.message || 'Gagal menghapus produk.');
    return;
  }
  alert(result.message || 'Produk berhasil dihapus.');
  await refreshProducts();
  await loadOverview();
}

function openCategoryModal() {
  showModal('Tambah Kategori', `
    <form id="categoryModalForm" class="modal-form">
      <div class="modal-grid">
        <label>Nama kategori<input name="name" required></label>
        <label>Deskripsi<input name="description"></label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="primary-button">Simpan</button>
        <button type="button" class="secondary-button" id="cancelModalButton">Batal</button>
      </div>
    </form>
  `);
  document.getElementById('categoryModalForm')?.addEventListener('submit', handleCategoryForm);
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);
}

async function handleCategoryForm(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    role: state.user.role,
    name: formData.get('name').trim(),
    description: formData.get('description').trim()
  };
  const result = await apiPost('/api/categories', payload);
  if (!result.success) {
    alert(result.message || 'Gagal menyimpan kategori.');
    return;
  }
  alert(result.message || 'Kategori berhasil disimpan.');
  closeModal();
  await refreshCategories();
  await loadOverview();
}

function openSupplierModal() {
  showModal('Tambah Supplier', `
    <form id="supplierModalForm" class="modal-form">
      <div class="modal-grid">
        <label>Nama supplier<input name="name" required></label>
        <label>Alamat<input name="address" required></label>
        <label>Telepon<input name="phone" required></label>
        <label>Email<input type="email" name="email" required></label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="primary-button">Simpan</button>
        <button type="button" class="secondary-button" id="cancelModalButton">Batal</button>
      </div>
    </form>
  `);
  document.getElementById('supplierModalForm')?.addEventListener('submit', handleSupplierForm);
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);
}

async function handleSupplierForm(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    role: state.user.role,
    name: formData.get('name').trim(),
    address: formData.get('address').trim(),
    phone: formData.get('phone').trim(),
    email: formData.get('email').trim()
  };
  const result = await apiPost('/api/suppliers', payload);
  if (!result.success) {
    alert(result.message || 'Gagal menyimpan supplier.');
    return;
  }
  alert(result.message || 'Supplier berhasil disimpan.');
  closeModal();
  await refreshSuppliers();
  await loadOverview();
}

function openCustomerModal() {
  showModal('Tambah Pelanggan', `
    <form id="customerModalForm" class="modal-form">
      <div class="modal-grid">
        <label>Nama pelanggan<input name="name" required></label>
        <label>Telepon<input name="phone" required></label>
        <label>Email<input type="email" name="email" required></label>
        <label>Alamat<input name="address"></label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="primary-button">Simpan</button>
        <button type="button" class="secondary-button" id="cancelModalButton">Batal</button>
      </div>
    </form>
  `);
  document.getElementById('customerModalForm')?.addEventListener('submit', handleCustomerForm);
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);
}

async function handleCustomerForm(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    role: state.user.role,
    name: formData.get('name').trim(),
    phone: formData.get('phone').trim(),
    email: formData.get('email').trim(),
    address: formData.get('address').trim()
  };
  const result = await apiPost('/api/customers', payload);
  if (!result.success) {
    alert(result.message || 'Gagal menyimpan pelanggan.');
    return;
  }
  alert(result.message || 'Pelanggan berhasil disimpan.');
  closeModal();
  await refreshCustomers();
  await loadOverview();
}

function renderCategoryTable() {
  const tbody = elements.categoryTable.querySelector('tbody');
  if (!tbody) return;
  if (!state.categories.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:16px;">Tidak ada kategori.</td></tr>';
    return;
  }
  tbody.innerHTML = state.categories.map((category) => `
    <tr>
      <td>${category.name}</td>
      <td>${category.description || '—'}</td>
      <td><button type="button" class="action-button delete-category" data-id="${category.id}">Hapus</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.delete-category').forEach((button) => {
    button.addEventListener('click', () => alert('Hapus kategori belum tersedia.'));
  });
}

function renderSupplierTable() {
  const tbody = elements.supplierTable.querySelector('tbody');
  if (!tbody) return;
  if (!state.suppliers.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">Tidak ada supplier.</td></tr>';
    return;
  }
  tbody.innerHTML = state.suppliers.map((supplier) => `
    <tr>
      <td>${supplier.name}</td>
      <td>${supplier.phone || '—'}</td>
      <td>${supplier.email || '—'}</td>
      <td>${supplier.address || '—'}</td>
      <td><button type="button" class="action-button delete-supplier" data-id="${supplier.id}">Hapus</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.delete-supplier').forEach((button) => {
    button.addEventListener('click', () => alert('Hapus supplier belum tersedia.'));
  });
}

function renderCustomerTable() {
  const tbody = elements.customerTable.querySelector('tbody');
  if (!tbody) return;
  if (!state.customers.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">Tidak ada pelanggan.</td></tr>';
    return;
  }
  tbody.innerHTML = state.customers.map((customer) => `
    <tr>
      <td>${customer.name}</td>
      <td>${customer.phone}</td>
      <td>${customer.email}</td>
      <td>${customer.address || '—'}</td>
      <td>${customer.points || 0}</td>
      <td><button type="button" class="action-button delete-customer" data-id="${customer.id}">Hapus</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.delete-customer').forEach((button) => {
    button.addEventListener('click', () => alert('Hapus pelanggan belum tersedia.'));
  });
}

function showModal(title, contentHtml) {
  elements.modalDialog.classList.remove('hidden');
  elements.modalOverlay.classList.remove('hidden');
  elements.modalDialog.innerHTML = `
    <div class="modal-header">
      <h2>${title}</h2>
      <button id="modalCloseButton" class="secondary-button">Tutup</button>
    </div>
    <div class="modal-body">${contentHtml}</div>
  `;
  document.getElementById('modalCloseButton')?.addEventListener('click', closeModal);
}

function closeModal() {
  elements.modalDialog.classList.add('hidden');
  elements.modalOverlay.classList.add('hidden');
}

async function saveSettings() {
  const settings = {
    storeName: elements.storeNameInput.value.trim(),
    storeLogo: elements.storeLogoInput.value.trim(),
    taxRate: Number(elements.storeTaxInput.value || 0),
    receiptPrinter: elements.receiptPrinterInput.value.trim()
  };
  localStorage.setItem('ngebrakStoreSettings', JSON.stringify(settings));
  alert('Pengaturan tersimpan.');
}

function loadSettings() {
  const settingsText = localStorage.getItem('ngebrakStoreSettings');
  if (!settingsText) return;
  try {
    const settings = JSON.parse(settingsText);
    elements.storeNameInput.value = settings.storeName || '';
    elements.storeLogoInput.value = settings.storeLogo || '';
    elements.storeTaxInput.value = settings.taxRate || 10;
    elements.receiptPrinterInput.value = settings.receiptPrinter || '';
  } catch (err) {
    console.warn('Gagal memuat pengaturan', err);
  }
}

async function apiGet(url) {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : { success: false, message: 'Koneksi gagal.' };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Koneksi gagal.' };
  }
}

async function apiPost(url, payload) {
  return apiCall(url, 'POST', payload);
}

async function apiCall(url, method, payload) {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.ok ? await response.json() : { success: false, message: 'Koneksi gagal.' };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Koneksi gagal.' };
  }
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}
