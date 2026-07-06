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

  elements.dashboardMetrics = document.getElementById('dashboardMetrics');
  elements.lowStockItems = document.getElementById('lowStockItems');
  elements.financeMetrics = document.getElementById('financeMetrics');
  elements.combinedChart = document.getElementById('combinedChart');
  elements.chartLegend = document.getElementById('chartLegend');



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

  // Incoming goods + inventory logs (role gudang)
  elements.incomingProductSelect = document.getElementById('incomingProductSelect');
  elements.incomingQuantityInput = document.getElementById('incomingQuantity');
  elements.incomingSupplierSelect = document.getElementById('incomingSupplierSelect');
  elements.incomingNoteInput = document.getElementById('incomingNote');
  elements.incomingSubmitButton = document.getElementById('incomingSubmitButton');

  elements.incomingTableBody = document.getElementById('incomingGoodsTable')?.querySelector('tbody');
  elements.refreshIncomingButton = document.getElementById('refreshIncomingButton');

  elements.inventoryLogsTableBody = document.getElementById('inventoryLogsTable')?.querySelector('tbody');
  elements.refreshInventoryLogsButton = document.getElementById('refreshInventoryLogsButton');



  elements.openProductModal = document.getElementById('openProductModal');
  elements.openCategoryModal = document.getElementById('openCategoryModal');
  elements.openSupplierModal = document.getElementById('openSupplierModal');
  elements.openCustomerModal = document.getElementById('openCustomerModal');

  // Stock opname
  elements.stockOpnameSection = document.getElementById('stockOpnameSection');
  elements.stockOpnameTableBody = document.getElementById('stockOpnameTable')?.querySelector('tbody');
  elements.stockOpnameNote = document.getElementById('stockOpnameNote');
  elements.startStockOpnameButton = document.getElementById('startStockOpnameButton');
  elements.saveStockOpnameButton = document.getElementById('saveStockOpnameButton');

  elements.modalOverlay = document.getElementById('modalOverlay');
  elements.modalDialog = document.getElementById('modalDialog');
}

function bindEvents() {
  elements.sidebarLogout?.addEventListener('click', () => {
    localStorage.removeItem('ngebrakUser');
    window.location.href = '/';
  });

  // Laporan section elements
  elements.laporanStartDate = document.getElementById('laporanStartDate');
  elements.laporanEndDate = document.getElementById('laporanEndDate');
  elements.downloadLaporanBtn = document.getElementById('downloadLaporanBtn');
  elements.previewLaporanBtn = document.getElementById('previewLaporanBtn');

  // Laporan: preset buttons
  document.querySelectorAll('.laporan-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleLaporanPreset(btn.dataset.preset));
  });

  // Laporan: preview
  elements.previewLaporanBtn?.addEventListener('click', () => {
    showLaporanPdfPreview();
  });

  // Laporan: download
  elements.downloadLaporanBtn?.addEventListener('click', () => {
    const startDate = elements.laporanStartDate?.value || '';
    const endDate = elements.laporanEndDate?.value || '';
    let url = '/api/reports/summary/pdf?role=' + (state.user?.role || 'admin');
    if (startDate && endDate) {
      url += '&startDate=' + startDate + '&endDate=' + endDate;
    }
    
    // Menggunakan tag a dinamis agar download langsung terpicu tanpa diblokir popup blocker
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  document.getElementById('bulkDeleteSelectedProductsButton')?.addEventListener('click', bulkDeleteSelectedProducts);
  document.getElementById('bulkDeleteSelectAllProductsCheckbox')?.addEventListener('change', (e) => {
    const checked = !!e.target.checked;
    document.querySelectorAll('.bulk-delete-checkbox').forEach((c) => {
      c.checked = checked;
    });
    updateBulkDeleteControls();
  });

  elements.openProductModal?.addEventListener('click', openProductModal);

  elements.openCategoryModal?.addEventListener('click', openCategoryModal);
  elements.openSupplierModal?.addEventListener('click', openSupplierModal);
  elements.openCustomerModal?.addEventListener('click', openCustomerModal);

  // Stock opname
  elements.startStockOpnameButton?.addEventListener('click', renderStockOpname);
  elements.saveStockOpnameButton?.addEventListener('click', submitStockOpname);

  // Incoming goods + inventory logs (role gudang)
  elements.incomingProductSelect?.addEventListener('change', () => {
    const productId = elements.incomingProductSelect?.value;
    if (productId) {
      populateIncomingSupplierOptionsForProduct(productId);
    } else {
      populateIncomingSupplierOptions();
    }
  });

  elements.incomingSubmitButton?.addEventListener('click', submitIncomingGoods);

  // daftar incoming otomatis
  elements.refreshIncomingButton?.addEventListener('click', async () => {
    await fetchIncomingGoodsList();
    renderIncomingList();
  });

  elements.refreshInventoryLogsButton?.addEventListener('click', renderInventoryLogs);




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
  const role = state.user?.role;

  let menuItems = [];
  if (role === 'kasir') {
    menuItems = [
      { label: 'Dashboard', section: 'dashboard' },
      { label: 'POS', section: 'pos' }
    ];
  } else if (role === 'gudang') {
    menuItems = [
      { label: 'Dashboard', section: 'dashboard' },
      { label: 'Manajemen Stok', section: 'stock' },
      { label: 'Stok Opname', section: 'stockOpname' },
      { label: 'Supplier', section: 'suppliers' }
    ];
  } else {
    // admin (dan fallback untuk role selain kasir/gudang)
    menuItems = [
      { label: 'Dashboard', section: 'dashboard' },
      { label: 'POS', section: 'pos' },
      { label: 'Manajemen Stok', section: 'stock' },
      { label: 'Stok Opname', section: 'stockOpname' },
      { label: 'Produk', section: 'products' },
      { label: 'Kategori', section: 'categories' },
      { label: 'Supplier', section: 'suppliers' },
      { label: 'Pelanggan', section: 'customers' },
      { label: 'Laporan', section: 'laporan' }
    ];
  }

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
  // Guard agar section yang tidak diizinkan tidak bisa diakses walau dipaksa dari UI/DOM.
  const role = state.user?.role;
  const allowedSections = (() => {
    if (role === 'kasir') return new Set(['dashboard', 'pos']);
    if (role === 'gudang') return new Set(['dashboard', 'stock', 'stockOpname', 'suppliers']);
    return new Set(['dashboard', 'pos', 'products', 'categories', 'suppliers', 'customers', 'stock', 'stockOpname', 'laporan']);
  })();

  if (!allowedSections.has(section)) {
    // redirect ke section pertama di sidebar agar konsisten
    const firstBtn = elements.sidebarMenu.querySelector('.sidebar-link');
    const fallback = firstBtn?.dataset.section || 'dashboard';
    section = fallback;
  }

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
  if (section === 'stock') {
    renderStockManagement();
    // tampilkan daftar barang masuk otomatis
    fetchIncomingGoodsList().then(() => renderIncomingList());
  }
  if (section === 'stockOpname') renderStockOpname();
  if (section === 'laporan') renderLaporanSection();

}

// ===== Laporan Section =====
function renderLaporanSection() {
  // Default: bulan ini
  if (!elements.laporanStartDate?.value && !elements.laporanEndDate?.value) {
    handleLaporanPreset('thisMonth');
  }
}

function handleLaporanPreset(preset) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let start, end;

  switch (preset) {
    case 'today':
      start = end = toDateStr(now);
      break;
    case 'thisWeek': {
      const dayOfWeek = now.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = toDateStr(monday);
      end = toDateStr(sunday);
      break;
    }
    case 'thisMonth':
      start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      end = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'lastMonth': {
      const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = toDateStr(lastM);
      end = toDateStr(new Date(lastM.getFullYear(), lastM.getMonth() + 1, 0));
      break;
    }
    case 'allTime':
      start = '';
      end = '';
      break;
    default:
      return;
  }

  if (elements.laporanStartDate) elements.laporanStartDate.value = start;
  if (elements.laporanEndDate) elements.laporanEndDate.value = end;

  // Highlight active preset button
  document.querySelectorAll('.laporan-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === preset);
  });
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
    const section = getActiveSection();
    if (section === 'products') renderProductTable();
    if (section === 'pos') renderProductListForPOS();
    if (section === 'stock') renderStockManagement();

    // populate incoming select
    populateIncomingProductOptions();
    populateIncomingSupplierOptions();

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

  const metrics = [];
  if (state.user.role === 'admin') {
    metrics.push({ label: 'Total Produk', value: overview.totalProducts || state.products.length });
    metrics.push({ label: 'Total Pengguna', value: overview.totalUsers || 0 });
    metrics.push({ label: 'Total Pelanggan', value: overview.totalCustomers || state.customers.length });
    metrics.push({ label: 'Penjualan Hari Ini', value: formatCurrency(overview.todaySales || 0) });
  } else if (state.user.role === 'kasir') {
    metrics.push({ label: 'Transaksi Hari Ini', value: formatCurrency(overview.todaySales || 0) });
    metrics.push({ label: 'Pendapatan Hari Ini', value: formatCurrency(overview.todayGrossRevenue || 0) });
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

  // Financial summary for today
  const grossRevenue = overview.todayGrossRevenue || 0;
  const capitalCost = overview.todayCapitalCost || 0;
  const netProfit = overview.todayNetProfit || 0;

  if (elements.financeMetrics) {
    elements.financeMetrics.innerHTML = `
      <div class="finance-metric-item">
        <div class="finance-metric-dot" style="background: #f59e0b;"></div>
        <div class="finance-metric-info">
          <div class="finance-metric-label">Pendapatan Kotor</div>
          <div class="finance-metric-value" style="color: #f59e0b;">${formatCurrency(grossRevenue)}</div>
        </div>
      </div>
      <div class="finance-metric-item">
        <div class="finance-metric-dot" style="background: #ff6b6b;"></div>
        <div class="finance-metric-info">
          <div class="finance-metric-label">Total Modal</div>
          <div class="finance-metric-value" style="color: #ff6b6b;">${formatCurrency(capitalCost)}</div>
        </div>
      </div>
      <div class="finance-metric-item">
        <div class="finance-metric-dot" style="background: #2ee59d;"></div>
        <div class="finance-metric-info">
          <div class="finance-metric-label">Untung Bersih</div>
          <div class="finance-metric-value" style="color: #2ee59d;">${formatCurrency(netProfit)}</div>
        </div>
      </div>
    `;
  }

  // Combined trend chart (7 hari)
  const salesRows = overview.salesChartData || [];
  const purchaseRows = overview.purchaseChartData || [];
  const profitRows = overview.profitChartData || [];

  renderCombinedChart(salesRows, purchaseRows, profitRows);
  renderLowStockItems(lowStock);
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

function renderCombinedChart(salesRows, purchaseRows, profitRows, options = {}) {
  const element = elements.combinedChart;
  if (!element) return;

  const points = options.points || 7;
  const safeSales = Array.isArray(salesRows) ? salesRows : [];
  const safePurchase = Array.isArray(purchaseRows) ? purchaseRows : [];
  const safeProfit = Array.isArray(profitRows) ? profitRows : [];

  const dataSales = normalizeLineChartData(safeSales, points);
  const dataPurchase = normalizeLineChartData(safePurchase, points);
  const dataProfit = normalizeLineChartData(safeProfit, points);

  const allValues = [
    ...dataSales.map((d) => d.value),
    ...dataPurchase.map((d) => d.value),
    ...dataProfit.map((d) => d.value)
  ];
  const minV = Math.min(...allValues, 0);
  const maxV = Math.max(...allValues, 1);
  const safeMax = maxV - minV === 0 ? maxV || 1 : maxV;
  const v0 = minV;

  const w = 800;
  const h = 220;
  const paddingLeft = 75;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 30;

  const plotW = w - paddingLeft - paddingRight;
  const plotH = h - paddingTop - paddingBottom;

  const xAt = (i) => paddingLeft + (plotW * i) / (points - 1);
  const yAt = (val) => {
    const norm = (val - v0) / (safeMax - v0 === 0 ? 1 : safeMax - v0);
    return paddingTop + plotH * (1 - norm);
  };

  const pathSales = dataSales.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`).join(' ');
  const pathPurchase = dataPurchase.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`).join(' ');
  const pathProfit = dataProfit.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`).join(' ');

  const maxLabel = formatCurrency(maxV);
  const midLabel = formatCurrency(v0 + (maxV - v0) / 2);
  const minLabel = formatCurrency(v0);

  const salesStroke = 'rgba(245,158,11,0.95)';
  const salesFill = 'rgba(245,158,11,0.1)';
  const purchaseStroke = 'rgba(255,107,107,0.95)';
  const purchaseFill = 'rgba(255,107,107,0.1)';
  const profitStroke = 'rgba(46,229,157,0.95)';
  const profitFill = 'rgba(46,229,157,0.1)';

  element.innerHTML = `
    <div class="trend-chart-wrap">
      <svg class="trend-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-label="combined-trend-chart">
        <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft + plotW}" y2="${paddingTop}" class="trend-grid-line" style="stroke: rgba(0,0,0,0.05);" />
        <line x1="${paddingLeft}" y1="${paddingTop + plotH / 2}" x2="${paddingLeft + plotW}" y2="${paddingTop + plotH / 2}" class="trend-grid-line" style="stroke: rgba(0,0,0,0.05);" />
        <line x1="${paddingLeft}" y1="${paddingTop + plotH}" x2="${paddingLeft + plotW}" y2="${paddingTop + plotH}" class="trend-grid-line" />

        <text x="${paddingLeft - 8}" y="${paddingTop + 4}" text-anchor="end" class="trend-axis-label" style="font-size: 9px;">${maxLabel}</text>
        <text x="${paddingLeft - 8}" y="${paddingTop + plotH / 2 + 4}" text-anchor="end" class="trend-axis-label" style="font-size: 9px;">${midLabel}</text>
        <text x="${paddingLeft - 8}" y="${paddingTop + plotH + 4}" text-anchor="end" class="trend-axis-label" style="font-size: 9px;">${minLabel}</text>

        ${dataSales
          .map((d, i) => {
            const x = xAt(i);
            return `<text x="${x}" y="${paddingTop + plotH + 22}" text-anchor="middle" class="trend-axis-label" style="font-size:10px;">${d.label}</text>`;
          })
          .join('')}

        <path d="${pathSales}" stroke="${salesStroke}" class="trend-series-line" style="filter: drop-shadow(0 4px 8px rgba(79,140,255,0.15));" />
        ${dataSales
          .map((p, i) => `
            <circle cx="${xAt(i)}" cy="${yAt(p.value)}" r="3.5" fill="${salesFill}" stroke="${salesStroke}" class="trend-series-dot" />
            <text x="${xAt(i)}" y="${yAt(p.value) - 10}" text-anchor="middle" class="trend-axis-label" style="font-size:9px; fill: ${salesStroke}; font-weight: bold;">${formatShortCurrency(p.value)}</text>
          `)
          .join('')}

        <path d="${pathPurchase}" stroke="${purchaseStroke}" class="trend-series-line" style="filter: drop-shadow(0 4px 8px rgba(255,107,107,0.15));" />
        ${dataPurchase
          .map((p, i) => `
            <circle cx="${xAt(i)}" cy="${yAt(p.value)}" r="3.5" fill="${purchaseFill}" stroke="${purchaseStroke}" class="trend-series-dot" />
            <text x="${xAt(i)}" y="${yAt(p.value) + 18}" text-anchor="middle" class="trend-axis-label" style="font-size:9px; fill: ${purchaseStroke};">${formatShortCurrency(p.value)}</text>
          `)
          .join('')}

        <path d="${pathProfit}" stroke="${profitStroke}" class="trend-series-line" style="filter: drop-shadow(0 4px 8px rgba(46,229,157,0.15));" />
        ${dataProfit
          .map((p, i) => `
            <circle cx="${xAt(i)}" cy="${yAt(p.value)}" r="3.5" fill="${profitFill}" stroke="${profitStroke}" class="trend-series-dot" />
            <text x="${xAt(i)}" y="${yAt(p.value) - 22}" text-anchor="middle" class="trend-axis-label" style="font-size:9px; fill: ${profitStroke};">${formatShortCurrency(p.value)}</text>
          `)
          .join('')}
      </svg>
    </div>
  `;

  if (elements.chartLegend) {
    elements.chartLegend.innerHTML = `
      <div class="trend-legend" style="justify-content: center; margin-top: 14px;">
        <div class="trend-legend-item">
          <span class="trend-legend-swatch" style="background: ${salesStroke};"></span>
          <span>Pendapatan Kotor</span>
        </div>
        <div class="trend-legend-item">
          <span class="trend-legend-swatch" style="background: ${purchaseStroke};"></span>
          <span>Modal</span>
        </div>
        <div class="trend-legend-item">
          <span class="trend-legend-swatch" style="background: ${profitStroke};"></span>
          <span>Keuntungan Bersih</span>
        </div>
      </div>
    `;
  }
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

function normalizeLineChartData(rows, points = 7) {
  const dayLabels = Array.from({ length: points }, (_, index) => {
    const date = new Date(Date.now() - (points - 1 - index) * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  });

  return dayLabels.map((day) => {
    const record = (rows || []).find((row) => row.day === day);
    const value = record ? Number(record.total) : 0;
    const label = new Date(day).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' });
    return { day, label, value };
  });
}

function renderLineChart(element, rows, options = {}) {
  if (!element) return;
  const points = options.points || 7;
  const safeRows = Array.isArray(rows) ? rows : [];

  const stroke = options.stroke || 'rgba(245,158,11,0.95)';
  const fill = options.fill || 'rgba(245,158,11,0.18)';

  const data = normalizeLineChartData(safeRows, points);
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const safeMax = maxV - minV === 0 ? maxV || 1 : maxV;
  const v0 = minV;

  const w = 640;
  const h = 180;
  const paddingLeft = 28;
  const paddingRight = 12;
  const paddingTop = 12;
  const paddingBottom = 26;

  const plotW = w - paddingLeft - paddingRight;
  const plotH = h - paddingTop - paddingBottom;

  const xAt = (i) => paddingLeft + (plotW * i) / (points - 1);
  const yAt = (val) => {
    const norm = (val - v0) / (safeMax - v0 === 0 ? 1 : safeMax - v0);
    return paddingTop + plotH * (1 - norm);
  };

  const path = data
    .map((d, i) => {
      const x = xAt(i);
      const y = yAt(d.value);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const dots = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), value: d.value, label: d.label }));

  // y-axis label (max)
  const maxLabel = options.formatValue ? options.formatValue(safeMax) : formatCurrency(safeMax);

  element.innerHTML = `
    <div class="trend-chart-wrap">
      <svg class="trend-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="trend-chart">
        <line x1="${paddingLeft}" y1="${paddingTop + plotH}" x2="${paddingLeft + plotW}" y2="${paddingTop + plotH}" class="trend-grid-line" />
        <text x="${paddingLeft}" y="${paddingTop + plotH + 18}" class="trend-axis-label">${maxLabel}</text>

        ${data
          .map((d, i) => {
            const x = xAt(i);
            const show = i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2);
            return show
              ? `<text x="${x}" y="${paddingTop + plotH + 18}" text-anchor="middle" class="trend-axis-label">${d.label}</text>`
              : '';
          })
          .join('')}

        <path d="${path}" stroke="${stroke}" class="trend-series-line" style="filter: drop-shadow(0 8px 18px rgba(79,140,255,0.22));" />
        ${dots
          .map((p) => {
            return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${fill}" stroke="${stroke}" class="trend-series-dot" />`;
          })
          .join('')}
      </svg>
    </div>
  `;
}





function renderPOSSection() {
  renderPOSFilters();
  renderProductListForPOS();
  updateCartSummary();
  if (state.user.role !== 'kasir' && state.user.role !== 'admin') {
    elements.checkoutButton.disabled = true;
    elements.checkoutButton.textContent = 'Hanya kasir dapat checkout';
  } else {
    elements.checkoutButton.disabled = false;
    elements.checkoutButton.textContent = 'Checkout';
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

  elements.posProductGrid.innerHTML = filtered.map((product) => {
    const sale = Number(product.sale_price ?? product.salePrice ?? 0);
    const stok = Number(product.stock ?? 0);

    return `
      <div class="product-card">
        <div class="product-info">
          <h4>${product.name}</h4>
          <p class="price">${formatCurrency(sale)}</p>
          <p class="stock">Stok: ${stok}</p>
        </div>
        <button type="button" class="primary-button add-to-cart" data-id="${product.id}">Tambah</button>
      </div>
    `;
  }).join('');

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

  // Pastikan purchasePrice ada untuk perhitungan modal & profit bersih.
  if (typeof product.purchasePrice !== 'number' && typeof product.purchase_price !== 'number') {
    // payload dari server memakai purchase_price
    product.purchasePrice = Number(product.purchase_price || 0);
  }
  if (typeof product.salePrice !== 'number' && typeof product.sale_price !== 'number') {
    product.salePrice = Number(product.sale_price || 0);
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

  elements.cartItems.innerHTML = state.cart.map((item) => {
    const saleUnit = Number(item.sale_price ?? item.salePrice ?? 0);
    const product = state.products.find((entry) => entry.id === item.id);
    const stok = Number(product?.stock ?? item.stock ?? 0);

    return `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
          <p class="price">${formatCurrency(saleUnit)}</p>
          <p class="stock">Stok: ${stok}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="secondary-button decrease" data-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button type="button" class="secondary-button increase" data-id="${item.id}">+</button>
          <button type="button" class="secondary-button delete" data-id="${item.id}">Hapus</button>
        </div>
      </div>
    `;
  }).join('');


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
  const subtotal = state.cart.reduce((sum, item) => sum + Number(item.sale_price ?? item.salePrice ?? 0) * item.quantity, 0);

  // Modal & profit bersih (berdasarkan harga beli vs harga jual)
  const totalModal = state.cart.reduce((sum, item) => sum + Number(item.purchase_price ?? item.purchasePrice ?? 0) * item.quantity, 0);
  const totalProfitBersih = state.cart.reduce((sum, item) => {
    const purchase = Number(item.purchase_price ?? item.purchasePrice ?? 0);
    const sale = Number(item.sale_price ?? item.salePrice ?? 0);
    return sum + (sale - purchase) * item.quantity;
  }, 0);

  const discount = Number(elements.cartDiscount?.value || 0);
  const taxRate = Number(elements.cartTax?.value || 0);
  const discounted = Math.max(0, subtotal - (subtotal * discount) / 100);
  const grandTotal = Math.max(0, discounted + (discounted * taxRate) / 100);

  elements.cartTotalItems.textContent = state.cart.length;
  elements.cartSubtotal.textContent = formatCurrency(subtotal);
  elements.cartGrandTotal.textContent = formatCurrency(grandTotal);

  // Elemen tambahan (kalau ada di HTML)
  if (elements.cartTotalModal) elements.cartTotalModal.textContent = formatCurrency(totalModal);
  if (elements.cartTotalProfit) {
    const safeProfit = totalProfitBersih;
    elements.cartTotalProfit.textContent = formatCurrency(safeProfit);
    elements.cartTotalProfit.classList.toggle('negative', safeProfit < 0);
  }
}


async function handleCheckout() {
  if (!state.cart.length) {
    alert('Keranjang kosong.');
    return;
  }
  if (state.user.role !== 'kasir' && state.user.role !== 'admin') {
    alert('Hanya kasir yang dapat menyelesaikan transaksi.');
    return;
  }

  const paymentMethod = elements.paymentMethod.value || 'Tunai';

  const cartPayload = {
    role: state.user.role,
    cart: state.cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity
    })),
    paymentMethod,
    cashierName: state.user.fullname
  };

  const result = await apiPost('/api/checkout', cartPayload);
  if (!result.success) {
    alert(result.message || 'Checkout gagal.');
    return;
  }

  alert('✅ Transaksi berhasil disimpan!');

  const receiptId = result.receiptId;
  if (receiptId) {
    try {
      await showReceiptPdfModal(receiptId);
    } catch (e) {
      console.warn('gagal tampilkan pdf', e);
      alert('Transaksi tersimpan, namun gagal memuat PDF struk.');
    }
  }

  state.cart = [];
  renderCartItems();
  updateCartSummary();
  await refreshStoreData();
}

async function showReceiptPdfModal(receiptId) {
  const overlay = document.getElementById('pdfViewerOverlay');
  const frame = document.getElementById('pdfViewerFrame');
  const spinner = document.getElementById('pdfLoadingSpinner');
  const downloadBtn = document.getElementById('pdfDownloadBtn');
  const closeBtn = document.getElementById('pdfCloseBtn');
  const title = document.getElementById('pdfViewerTitle');

  if (!overlay || !frame) return;

  // Reset state
  frame.classList.add('hidden');
  spinner.classList.remove('hidden');
  title.textContent = `Struk #${receiptId}`;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Fetch PDF sebagai blob agar bisa ditampilkan inline
  // requireRole di server membaca role dari req.query untuk GET request
  const role = encodeURIComponent(state.user?.role || 'kasir');
  const url = `/api/receipts/${receiptId}/pdf?role=${role}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  // Set download link
  downloadBtn.href = blobUrl;
  downloadBtn.download = `struk-${receiptId}.pdf`;

  // Load ke iframe
  frame.onload = () => {
    spinner.classList.add('hidden');
    frame.classList.remove('hidden');
  };
  frame.src = blobUrl;

  // Close handler
  const closePdf = () => {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    // Revoke blob URL setelah sedikit delay agar download masih bisa jalan
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    closeBtn.removeEventListener('click', closePdf);
    overlay.removeEventListener('click', handleOverlayClick);
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlay) closePdf();
  };

  closeBtn.addEventListener('click', closePdf);
  overlay.addEventListener('click', handleOverlayClick);

  // Keyboard ESC
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closePdf();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

async function showLaporanPdfPreview() {
  const overlay = document.getElementById('pdfViewerOverlay');
  const frame = document.getElementById('pdfViewerFrame');
  const spinner = document.getElementById('pdfLoadingSpinner');
  const downloadBtn = document.getElementById('pdfDownloadBtn');
  const closeBtn = document.getElementById('pdfCloseBtn');
  const title = document.getElementById('pdfViewerTitle');
  const icon = document.getElementById('pdfViewerIcon');

  if (!overlay || !frame) return;

  // Build URL
  const startDate = elements.laporanStartDate?.value || '';
  const endDate = elements.laporanEndDate?.value || '';
  let url = '/api/reports/summary/pdf?role=' + (state.user?.role || 'admin');
  if (startDate && endDate) {
    url += '&startDate=' + startDate + '&endDate=' + endDate;
  }

  // Build filename
  let filename = 'laporan-rekapan.pdf';
  if (startDate && endDate) {
    filename = `laporan-${startDate}_${endDate}.pdf`;
  }

  // Build title text
  let titleText = 'Laporan Rekapan';
  if (startDate && endDate) {
    titleText = `Laporan ${startDate} s/d ${endDate}`;
  }

  // Reset state
  frame.classList.add('hidden');
  spinner.classList.remove('hidden');
  // Update spinner text for laporan context
  const spinnerText = spinner.querySelector('span');
  if (spinnerText) spinnerText.textContent = 'Memuat laporan PDF...';
  title.textContent = titleText;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Set download link
    downloadBtn.href = blobUrl;
    downloadBtn.download = filename;

    // Load ke iframe
    frame.onload = () => {
      spinner.classList.add('hidden');
      frame.classList.remove('hidden');
    };
    frame.src = blobUrl;

    // Close handler
    const closePdf = () => {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
      frame.src = '';
      // Restore spinner text
      if (spinnerText) spinnerText.textContent = 'Memuat struk PDF...';
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      closeBtn.removeEventListener('click', closePdf);
      overlay.removeEventListener('click', handleOverlayClick);
      document.removeEventListener('keydown', handleKeydown);
    };

    const handleOverlayClick = (e) => {
      if (e.target === overlay) closePdf();
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') closePdf();
    };

    closeBtn.addEventListener('click', closePdf);
    overlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeydown);
  } catch (e) {
    console.error('Gagal memuat preview laporan:', e);
    spinner.classList.add('hidden');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    alert('Gagal memuat preview laporan. Silakan coba lagi.');
  }
}


function renderProductTable() {
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
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:16px;">Tidak ada produk.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((product) => {
    const purchase = Number(product.purchase_price ?? product.purchasePrice ?? 0);
    const sale = Number(product.sale_price ?? product.salePrice ?? 0);
    const profitPerUnit = sale - purchase;
    const stock = Number(product.stock ?? 0);

    const stockBadge = stock <= 5
      ? '<span class="badge-low">Stok rendah</span>'
      : '<span class="badge-normal">Stok aman</span>';

    return `
      <tr>
        <td>${product.code || '—'}</td>
        <td><strong>${product.name}</strong></td>
        <td>${formatCurrency(purchase)}</td>
        <td>${formatCurrency(sale)}</td>
        <td>${formatCurrency(profitPerUnit)}</td>
        <td>${product.unit || '—'}</td>
        <td class="stock-qty">${stock}</td>
        <td class="stock-status">${stockBadge}</td>
        <td><input class="bulk-delete-checkbox" type="checkbox" data-id="${product.id}" /></td>
        <td><button type="button" class="action-button edit" data-id="${product.id}">Edit</button> <button type="button" class="action-button delete" data-id="${product.id}">Hapus</button></td>
      </tr>
    `;
  }).join('');


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

  tbody.querySelectorAll('.bulk-delete-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      updateBulkDeleteControls();
    });
  });

  elements.productCategoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
    state.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');

  updateBulkDeleteControls();
}

function updateBulkDeleteControls() {
  const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
  const selectedIds = Array.from(checkboxes)
    .filter((c) => c.checked)
    .map((c) => Number(c.dataset.id))
    .filter((id) => Number.isFinite(id));

  const bulkBtn = document.getElementById('bulkDeleteSelectedProductsButton');
  if (bulkBtn) {
    bulkBtn.disabled = selectedIds.length === 0;
    bulkBtn.textContent = selectedIds.length ? `Hapus ${selectedIds.length} produk` : 'Hapus Produk Terpilih';
  }

  const headerCheckbox = document.getElementById('bulkDeleteSelectAllProductsCheckbox');
  if (headerCheckbox) {
    headerCheckbox.checked = selectedIds.length === checkboxes.length && checkboxes.length > 0;
  }
}

function openProductModal(product = null) {
  const title = 'Tambah Produk';

  const categories = state.categories;
  const suppliers = state.suppliers;
  // Pastikan ambil dari field DB yang benar (snake_case) agar tidak kosong/Rp 0
  const purchasePriceValRaw = product?.purchase_price ?? product?.purchasePrice;
  const salePriceValRaw = product?.sale_price ?? product?.salePrice;

  const purchasePriceVal = Number.isFinite(Number(purchasePriceValRaw)) ? String(Number(purchasePriceValRaw)) : '';
  const salePriceVal = Number.isFinite(Number(salePriceValRaw)) ? String(Number(salePriceValRaw)) : '';


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

        <label>Harga beli<input type="number" name="purchasePrice" min="0" value="${purchasePriceVal}" required></label>
        <label>Harga jual<input type="number" name="salePrice" min="0" value="${salePriceVal}" required></label>

        <label>Untung bersih / unit
          <input id="profitPerUnitPreview" type="text" disabled value="${(() => {
            const p = Number(purchasePriceVal || 0);
            const s = Number(salePriceVal || 0);
            const profit = s - p;
            return formatCurrency(profit);
          })()}" />
        </label>

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

  // Sembunyikan seluruh background section agar tombol "Tambah Produk" tidak terlihat saat modal terbuka
  document.querySelectorAll('.page-section').forEach((sec) => sec.classList.add('hidden'));

  // Pastikan juga tombol/section products tidak terlihat (untuk kasus layout/hidden tergantung state)
  const productsSection = document.getElementById('productsSection');
  productsSection?.classList.add('hidden');

  const modalForm = document.getElementById('productModalForm');
  modalForm?.addEventListener('submit', (event) => handleProductForm(event, product?.id));
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);

  // Preview untung/unit saat user ubah harga beli/jual
  const preview = document.getElementById('profitPerUnitPreview');
  const purchaseInput = modalForm?.querySelector('input[name="purchasePrice"]');
  const saleInput = modalForm?.querySelector('input[name="salePrice"]');

  const updatePreview = () => {
    if (!preview) return;
    const p = Number(purchaseInput?.value || 0);
    const s = Number(saleInput?.value || 0);
    preview.value = formatCurrency(s - p);
  };

  purchaseInput?.addEventListener('input', updatePreview);
  saleInput?.addEventListener('input', updatePreview);
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

async function bulkDeleteSelectedProducts() {
  const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
  const selectedIds = Array.from(checkboxes)
    .filter((c) => c.checked)
    .map((c) => Number(c.dataset.id))
    .filter((id) => Number.isFinite(id));

  if (!selectedIds.length) {
    alert('Pilih produk yang ingin dihapus.');
    return;
  }

  const ok = confirm(`Yakin ingin menghapus ${selectedIds.length} produk?`);
  if (!ok) return;

  // Hapus berurutan agar log inventory tetap rapi
  for (const productId of selectedIds) {
    const result = await apiCall(`/api/products/${productId}`, 'DELETE', { role: state.user.role });
    if (!result.success) {
      alert(result.message || `Gagal menghapus produk #${productId}`);
      return;
    }
  }

  alert('Penghapusan selesai.');
  await refreshProducts();
  await loadOverview();
  selectSection('products');
}

function openCategoryModal(category = null) {
  const isEdit = !!category;
  showModal(isEdit ? 'Edit Kategori' : 'Tambah Kategori', `
    <form id="categoryModalForm" class="modal-form">
      <div class="modal-grid">
        <label>Nama kategori<input name="name" required value="${category?.name || ''}" /></label>
        <label>Deskripsi<input name="description" value="${category?.description || ''}" /></label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="primary-button">${isEdit ? 'Simpan Perubahan' : 'Simpan'}</button>
        <button type="button" class="secondary-button" id="cancelModalButton">Batal</button>
      </div>
    </form>
  `);

  document.querySelectorAll('.page-section').forEach((sec) => sec.classList.add('hidden'));
  const categoriesSection = document.getElementById('categoriesSection');
  categoriesSection?.classList.add('hidden');

  const form = document.getElementById('categoryModalForm');
  form?.addEventListener('submit', (event) => handleCategoryForm(event, category?.id));
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);
}

async function handleCategoryForm(event, categoryId = null) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    role: state.user.role,
    name: formData.get('name').trim(),
    description: formData.get('description').trim()
  };

  const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
  const method = categoryId ? 'PUT' : 'POST';
  const result = await apiCall(url, method, payload);

  if (!result.success) {
    alert(result.message || 'Gagal menyimpan kategori.');
    return;
  }

  alert(result.message || 'Kategori berhasil disimpan.');
  closeModal();
  await refreshCategories();
  await loadOverview();
  // Pastikan state yang dipakai tabel benar-benar ter-update
  const activeSection = getActiveSection();
  if (activeSection === 'categories') renderCategoryTable();
}



function openSupplierModal(supplier = null) {
  const isEdit = !!supplier;
  showModal(isEdit ? 'Edit Supplier' : 'Tambah Supplier', `
    <form id="supplierModalForm" class="modal-form">
      <div class="modal-grid">
        <label>Nama supplier<input name="name" required value="${supplier?.name || ''}" /></label>
        <label>Alamat<input name="address" required value="${supplier?.address || ''}" /></label>
        <label>Telepon<input name="phone" required value="${supplier?.phone || ''}" /></label>
        <label>Email<input type="email" name="email" required value="${supplier?.email || ''}" /></label>
      </div>
      <div class="modal-actions">
        <button type="submit" class="primary-button">${isEdit ? 'Simpan Perubahan' : 'Simpan'}</button>
        <button type="button" class="secondary-button" id="cancelModalButton">Batal</button>
      </div>
    </form>
  `);

  document.querySelectorAll('.page-section').forEach((sec) => sec.classList.add('hidden'));
  const suppliersSection = document.getElementById('suppliersSection');
  suppliersSection?.classList.add('hidden');

  const form = document.getElementById('supplierModalForm');
  form?.addEventListener('submit', (event) => handleSupplierForm(event, supplier?.id));
  document.getElementById('cancelModalButton')?.addEventListener('click', closeModal);
}

async function handleSupplierForm(event, supplierId = null) {
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

  const url = supplierId ? `/api/suppliers/${supplierId}` : '/api/suppliers';
  const method = supplierId ? 'PUT' : 'POST';
  const result = await apiCall(url, method, payload);

  if (!result.success) {
    alert(result.message || 'Gagal menyimpan supplier.');
    return;
  }

  alert(result.message || 'Supplier berhasil disimpan.');
  closeModal();
  await refreshSuppliers();
  await loadOverview();
  const activeSection = getActiveSection();
  if (activeSection === 'suppliers') renderSupplierTable();
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
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="action-button edit-category" data-id="${category.id}">Edit</button>
          <button type="button" class="action-button delete-category" data-id="${category.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.edit-category').forEach((button) => {
    button.addEventListener('click', () => {
      const categoryId = Number(button.dataset.id);
      const category = state.categories.find((c) => c.id === categoryId);
      openCategoryModal(category);
    });
  });

  tbody.querySelectorAll('.delete-category').forEach((button) => {
    button.addEventListener('click', () => deleteCategory(Number(button.dataset.id)));
  });
}

async function deleteCategory(categoryId) {
  if (!Number.isFinite(categoryId)) return;
  const ok = confirm('Yakin ingin menghapus kategori ini?');
  if (!ok) return;

  const result = await apiCall(`/api/categories/${categoryId}`, 'DELETE', { role: state.user.role });
  if (!result.success) {
    alert(result.message || 'Gagal menghapus kategori.');
    return;
  }

  alert(result.message || 'Kategori berhasil dihapus.');
  await refreshCategories();
  await loadOverview();
  renderCategoryTable();
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
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="action-button edit-supplier" data-id="${supplier.id}">Edit</button>
          <button type="button" class="action-button delete-supplier" data-id="${supplier.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.edit-supplier').forEach((button) => {
    button.addEventListener('click', () => {
      const supplierId = Number(button.dataset.id);
      const supplier = state.suppliers.find((s) => s.id === supplierId);
      openSupplierModal(supplier);
    });
  });

  tbody.querySelectorAll('.delete-supplier').forEach((button) => {
    button.addEventListener('click', () => deleteSupplier(Number(button.dataset.id)));
  });
}

async function deleteSupplier(supplierId) {
  if (!Number.isFinite(supplierId)) return;
  const ok = confirm('Yakin ingin menghapus supplier ini?');
  if (!ok) return;

  const result = await apiCall(`/api/suppliers/${supplierId}`, 'DELETE', { role: state.user.role });
  if (!result.success) {
    alert(result.message || 'Gagal menghapus supplier.');
    return;
  }

  alert(result.message || 'Supplier berhasil dihapus.');
  await refreshSuppliers();
  await loadOverview();
  renderSupplierTable();
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

let stockOpnameDraft = { items: [], sessionNote: '' };

function renderStockOpname() {
  const section = document.getElementById('stockOpnameSection');
  if (!section) return;

  const tbody = document.getElementById('stockOpnameTable')?.querySelector('tbody');
  if (!tbody) {
    console.warn('stockOpname tbody not found');
    return;
  }

  (async () => {
const result = await apiGet(`/api/stock-opname/products?role=${encodeURIComponent(state.user.role)}`);
    console.log('stock-opname products', result);
    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px;">Gagal memuat: ${result.message || '-'}.</td></tr>`;
      return;
    }

    const products = result.products || [];
    stockOpnameDraft.items = products.map((p) => ({
      productId: p.id,
      productName: p.name,
      code: p.code,
      systemStock: Number(p.stock || 0),
      countedStock: Number(p.stock || 0),
      difference: 0
    }));
    stockOpnameDraft.sessionNote = elements.stockOpnameNote?.value?.trim() || '';

    tbody.innerHTML = stockOpnameDraft.items.map((item, idx) => {
      const diff = item.countedStock - item.systemStock;
      const badgeCls = diff === 0 ? 'badge-safe' : diff > 0 ? 'badge-low-stock' : 'badge-out';
      const badgeText = diff === 0 ? '0' : (diff > 0 ? `+${diff}` : `${diff}`);

      return `
        <tr>
          <td>${item.code || '—'}</td>
          <td><strong>${item.productName}</strong></td>
          <td>${item.systemStock}</td>
          <td>
            <input class="stock-opname-input" type="number" min="0" data-idx="${idx}" value="${item.countedStock}" />
          </td>
          <td>
            <span class="${badgeCls} stock-opname-diff" data-idx="${idx}">${badgeText}</span>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.stock-opname-input').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.idx);
        const v = Number(input.value);
        const safeV = Number.isFinite(v) ? v : 0;
        const it = stockOpnameDraft.items[idx];
        if (!it) return;
        it.countedStock = safeV;
        it.difference = it.countedStock - it.systemStock;

        const diffEl = tbody.querySelector(`.stock-opname-diff[data-idx="${idx}"]`);
        if (!diffEl) return;
        const diff = it.difference;
        const badgeCls = diff === 0 ? 'badge-safe' : diff > 0 ? 'badge-low-stock' : 'badge-out';
        const badgeText = diff === 0 ? '0' : (diff > 0 ? `+${diff}` : `${diff}`);

        diffEl.textContent = badgeText;
        diffEl.classList.remove('badge-safe', 'badge-low-stock', 'badge-out');
        diffEl.classList.add(badgeCls);
      });
    });
  })();
}

async function submitStockOpname() {
  if (!stockOpnameDraft.items?.length) {
    alert('Belum ada data opname. Klik Mulai Opname dulu.');
    return;
  }

  const note = elements.stockOpnameNote?.value?.trim() || '';
  const payload = {
    role: state.user.role,
    note,
    staffName: state.user.fullname || state.user.username,
    items: stockOpnameDraft.items.map((it) => ({
      productId: it.productId,
      systemStock: it.systemStock,
      countedStock: it.countedStock,
      difference: it.countedStock - it.systemStock
    }))
  };

  const result = await apiPost('/api/stock-opname', payload);
  if (!result.success) {
    alert(result.message || 'Gagal menyimpan stok opname.');
    return;
  }

  alert('Stok opname tersimpan dan stok sistem diperbarui.');
  stockOpnameDraft = { items: [], sessionNote: '' };
  await refreshProducts();
  await loadOverview();
  selectSection('stock');
}

function renderStockManagement() {

  const stockSection = document.getElementById('stockSection');
  if (!stockSection) return;

  if (!state.products?.length) {
    const tbody = stockSection.querySelector('tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px;">Tidak ada data stok.</td></tr>';
    return;
  }

  const tbody = stockSection.querySelector('#stockTable tbody') || stockSection.querySelector('tbody');
  if (!tbody) return;


  // Gudang fokus: tampilkan stok produk + status habis/menipis.
  const ensureNumberSafe = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  };

  const stockVal = (p) => ensureNumberSafe(p.stock ?? p.quantity ?? 0);

  const low = state.products.filter((p) => stockVal(p) <= 5 && stockVal(p) > 0);
  const out = state.products.filter((p) => stockVal(p) <= 0);
  const available = state.products.filter((p) => stockVal(p) > 5);


  // Samakan konten kolom dengan tabel daftar produk (produk milik admin)
  // Pastikan pakai field join/mapping yang ada di `state.products`.
  tbody.innerHTML = [...available, ...low, ...out].map((product) => {
    const stock = Number(product.stock ?? product.quantity ?? 0);

    const status = stock <= 0
      ? { label: 'Habis', cls: 'badge-out' }
      : stock <= 5
        ? { label: 'Akan habis', cls: 'badge-low-stock' }
        : { label: 'Aman', cls: 'badge-safe' };

    const hargaJual = Number(
      product.sale_price ?? product.salePrice ?? 0
    );

    const kategori =
      product.category ?? product.category_name ?? product.categoryName ?? '—';

    const supplier =
      product.supplier ?? product.supplier_name ?? product.supplierName ?? '—';

    return `
      <tr>
        <td>${product.code || '—'}</td>
        <td><strong>${product.name}</strong></td>
        <td>${kategori}</td>
        <td>${supplier}</td>
        <td>${formatCurrency(hargaJual)}</td>
        <td>${stock}</td>
        <td><span class="${status.cls}">${status.label}</span></td>
      </tr>
    `;
  }).join('');

}



function showModal(title, contentHtml) {
  elements.modalDialog.classList.remove('hidden');
  elements.modalOverlay.classList.remove('hidden');

  // Hilangkan header modal (termasuk judul "Tambah Produk") sesuai permintaan.
  // Tetap sediakan tombol tutup di area body agar modal bisa ditutup.
  elements.modalDialog.innerHTML = `
    <div class="modal-body">
      <div class="modal-top-actions">
        <button id="modalCloseButton" class="secondary-button">Tutup</button>
      </div>
      ${contentHtml}
    </div>
  `;

  document.getElementById('modalCloseButton')?.addEventListener('click', closeModal);
}

function closeModal() {
  elements.modalDialog.classList.add('hidden');
  elements.modalOverlay.classList.add('hidden');

  // Kembalikan tampilan section berdasarkan section aktif di sidebar
  const activeSection = getActiveSection();
  document.querySelectorAll('.page-section').forEach((sec) => {
    const id = sec.id || '';
    if (id === `${activeSection}Section`) sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
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
    elements.storeTaxInput.value = settings.taxRate || 0;
    elements.receiptPrinterInput.value = settings.receiptPrinter || '';
  } catch (err) {
    console.warn('Gagal memuat pengaturan', err);
  }
}

function getProductById(id) {
  const pid = Number(id);
  if (!Number.isFinite(pid)) return null;
  return state.products.find((p) => Number(p.id) === pid) || null;
}

function populateIncomingProductOptions() {
  const sel = elements.incomingProductSelect;
  if (!sel || !Array.isArray(state.products) || !state.products.length) return;

  const current = sel.value;
  sel.innerHTML = '<option value="">Pilih Produk</option>' +
    state.products.map((p) => {
      const stock = Number(p.stock ?? 0);
      return `<option value="${p.id}">${p.code || '—'} — ${p.name} (Stok: ${stock})</option>`;
    }).join('');

  if (current && sel.querySelector(`option[value="${current}"]`)) {
    sel.value = current;
  }

  // Saat produk terpilih, supplier dropdown mengikuti
  const selectedProductId = sel.value;
  if (selectedProductId) {
    populateIncomingSupplierOptionsForProduct(selectedProductId);
  } else {
    populateIncomingSupplierOptions();
  }
}

function populateIncomingSupplierOptionsForProduct(productId) {
  const sel = elements.incomingSupplierSelect;
  if (!sel) return;

  // Cari supplier yang terkait dengan produk terpilih (single pilihan: supplierId milik produk)
  const product = state.products.find((p) => Number(p.id) === Number(productId));
  const supplierId = product?.supplierId ?? product?.supplier_id ?? product?.supplier?.id;

  sel.innerHTML = '<option value="">Pilih Supplier (opsional)</option>' +
    (supplierId && Number.isFinite(Number(supplierId))
      ? (() => {
          const supplier = state.suppliers.find((s) => Number(s.id) === Number(supplierId));
          if (!supplier) return '';
          return `<option value="${supplier.id}" selected>${supplier.name || 'Supplier'}</option>`;
        })()
      : '') ;
}

function populateIncomingSupplierOptions() {
  // default: isi kosong
  const sel = elements.incomingSupplierSelect;
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Supplier (opsional)</option>';
}

// ===== incoming list (berdasarkan pembelian dari admin/supplier) =====
function renderIncomingList() {
  const tbody = elements.incomingTableBody;
  if (!tbody) return;

  const logs = state.incomingGoodsList || [];
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">Belum ada barang masuk.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map((row) => {
    const productName = row.product_name || row.productName || row.product_name || '—';
    const supplierName = row.supplier_name || row.supplierName || row.supplier_name || '—';
    const dateIn = row.date_in ? new Date(row.date_in).toLocaleString('id-ID') : '';
    const staff = row.staff_name || row.staffName || '—';

    return `
      <tr>
        <td>${dateIn}</td>
        <td><strong>${productName}</strong></td>
        <td>${supplierName}</td>
        <td>${row.quantity ?? '—'}</td>
        <td>${row.note || row.staff_name || staff}</td>
      </tr>
    `;
  }).join('');
}

async function fetchIncomingGoodsList() {
  const result = await apiGet('/api/incoming');
  if (!result.success) return;
  state.incomingGoodsList = result.incoming || [];
}



function populateIncomingProductOptions() {
  const sel = elements.incomingProductSelect;
  if (!sel || !Array.isArray(state.products) || !state.products.length) return;

  const current = sel.value;
  sel.innerHTML = '<option value="">Pilih Produk</option>' +
    state.products
      .filter((p) => Number.isFinite(Number(p.id)))
      .map((p) => {
        const stock = Number(p.stock ?? 0);
        return `<option value="${p.id}">${p.code || '—'} — ${p.name || 'Produk'} (Stok: ${stock})</option>`;
      })
      .join('');

  if (current && sel.querySelector(`option[value="${current}"]`)) {
    sel.value = current;
  }
}


async function submitIncomingGoods() {
  if (state.user?.role !== 'gudang' && state.user?.role !== 'admin') {
    alert('Hanya gudang yang dapat mencatat barang masuk.');
    return;
  }

  const productId = Number(elements.incomingProductSelect?.value);
  const quantity = Number(elements.incomingQuantityInput?.value);
  const supplierIdRaw = elements.incomingSupplierSelect?.value;
  const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
  const note = (elements.incomingNoteInput?.value || '').trim();

  if (!Number.isFinite(productId) || productId <= 0) {
    alert('Pilih produk yang valid.');
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    alert('Jumlah harus lebih dari 0.');
    return;
  }

    const result = await apiPost('/api/incoming', {
      role: state.user.role,
      productId,
      quantity,
      supplierId,
      staffName: state.user.fullname || state.user.username,
      staff_name: state.user.fullname || state.user.username,
      note
    });


  if (!result.success) {
    alert(result.message || 'Gagal menyimpan barang masuk.');
    return;
  }

  alert(result.message || 'Barang masuk berhasil dicatat.');

  if (elements.incomingQuantityInput) elements.incomingQuantityInput.value = '';
  if (elements.incomingNoteInput) elements.incomingNoteInput.value = '';
  if (elements.incomingSupplierSelect) elements.incomingSupplierSelect.value = '';

  await refreshStoreData();
  await renderInventoryLogs();
}

async function renderInventoryLogs() {
  const tbody = elements.inventoryLogsTableBody;
  if (!tbody) return;

  const result = await apiGet('/api/overview?role=' + encodeURIComponent(state.user.role));
  if (!result.success) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">Gagal memuat log.</td></tr>';
    return;
  }

  const logs = result.overview?.recentLogs || [];
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">Tidak ada log.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map((l) => {
    const date = new Date(l.created_at || Date.now()).toLocaleString('id-ID');
    const label = l.type === 'sell' ? 'Penjualan' : l.type === 'incoming' ? 'Barang masuk' : l.type === 'delete' ? 'Hapus produk' : 'Aktivitas';
    return `
      <tr>
        <td>${date}</td>
        <td>${label}</td>
        <td>${l.product_id || l.productId || '—'}</td>
        <td>${l.quantity ?? '—'}</td>
        <td>${l.note || '-'}</td>
      </tr>
    `;
  }).join('');
}

async function apiGet(url) {
  const finalUrl = url.includes('role=') ? url : url + (url.includes('?') ? '&' : '?') + 'role=' + encodeURIComponent(window.state?.user?.role || '');

  try {
    const response = await fetch(finalUrl);
    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {}
      console.warn('apiGet non-200', { url, status: response.status, bodyText });
      return { success: false, message: bodyText || 'Koneksi gagal.' };
    }
    return await response.json();
  } catch (err) {
    console.error('apiGet error', { url, err });
    return { success: false, message: 'Koneksi gagal.' };
  }
}

async function apiPost(url, payload) {
  return apiCall(url, 'POST', payload);
}

async function apiCall(url, method, payload) {
  const finalUrl = url.includes('role=') ? url : url + (url.includes('?') ? '&' : '?') + 'role=' + encodeURIComponent(window.state?.user?.role || '');
  try {
    const response = await fetch(finalUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {}
      console.warn('apiCall non-200', { url, method, status: response.status, bodyText });
      return { success: false, message: bodyText || 'Koneksi gagal.' };
    }

    return await response.json();
  } catch (err) {
    console.error('apiCall error', { url, method, err });
    return { success: false, message: 'Koneksi gagal.' };
  }
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

function formatShortCurrency(value) {
  const num = Number(value || 0);
  if (num === 0) return '0';
  if (num >= 1000000) return 'Rp' + (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (num >= 1000) return 'Rp' + (num / 1000).toFixed(0) + 'K';
  return 'Rp' + num;
}
