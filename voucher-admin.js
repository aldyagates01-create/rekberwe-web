const adminVoucherState = {
  products: [],
  orders: [],
  activeOrder: null,
  editingProductId: null,
  report: null,
};

const adminVoucherElements = {
  catalogPage: document.querySelector('[data-admin-page-content="voucher-catalog"]'),
  ordersPage: document.querySelector('[data-admin-page-content="voucher-orders"]'),
  dataPage: document.querySelector('[data-admin-page-content="voucher-data"]'),
  productList: document.getElementById("admin-voucher-product-list"),
  productForm: document.getElementById("admin-voucher-product-form"),
  orderList: document.getElementById("admin-voucher-order-list"),
  orderRoom: document.getElementById("admin-voucher-order-room"),
  reportDateFrom: document.getElementById("voucher-report-date-from"),
  reportDateTo: document.getElementById("voucher-report-date-to"),
  reportLoadButton: document.getElementById("voucher-report-load-btn"),
  reportSummary: document.getElementById("voucher-report-summary"),
  reportList: document.getElementById("voucher-report-list"),
  voucherPaymentBankName: document.getElementById("voucher-payment-bank-name"),
  voucherPaymentBankNumber: document.getElementById("voucher-payment-bank-number"),
  voucherPaymentBankHolder: document.getElementById("voucher-payment-bank-holder"),
  voucherPaymentQrisUrl: document.getElementById("voucher-payment-qris-url"),
  voucherPaymentInstructions: document.getElementById("voucher-payment-instructions"),
  voucherPaymentTerms: document.getElementById("voucher-payment-terms"),
  manualForm: document.getElementById("admin-voucher-manual-form"),
  manualProductSelect: document.getElementById("admin-voucher-manual-product"),
  manualPreview: document.getElementById("admin-voucher-manual-preview"),
  manualOrdersList: document.getElementById("voucher-manual-orders-list"),
};

function getDefaultVoucherReportRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { from: toInput(start), to: toInput(end) };
}

function formatAdminDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID");
}

function formatProductCostDetail(product) {
  const costIdr = formatCurrency(product?.costPrice || 0);
  const currency = String(product?.costCurrency || "IDR").toUpperCase();
  const original = Number(product?.costAmountOriginal ?? product?.costPrice ?? 0);
  if (currency !== "IDR" && original > 0) {
    const amountText = Number.isInteger(original) ? String(original) : original.toFixed(2);
    return `${amountText} ${currency} → ${costIdr}`;
  }
  return costIdr;
}

function getProductProfit(product) {
  return Number(product?.price || 0) - Number(product?.costPrice || 0);
}

let catalogCostPreviewTimer = null;

async function loadCostCurrencyOptions(selected = "IDR") {
  const select = adminVoucherElements.productForm?.costCurrency;
  if (!select) return;
  try {
    const payload = await fetchJson("/api/admin/voucher/currencies");
    const currencies = Array.isArray(payload.currencies) ? payload.currencies : [];
    select.innerHTML = currencies.map((item) => (
      `<option value="${escapeAttribute(item.code)}">${escapeHtml(item.label)}</option>`
    )).join("");
    select.value = selected || "IDR";
  } catch {
    select.value = selected || "IDR";
  }
}

async function updateCatalogCostPreview() {
  const form = adminVoucherElements.productForm;
  const preview = document.getElementById("admin-voucher-cost-preview");
  if (!form || !preview) return;
  const amount = Number(form.costAmount?.value || 0);
  const currency = String(form.costCurrency?.value || "IDR");
  const sellPrice = Number(form.price?.value || 0);
  if (amount <= 0 && sellPrice <= 0) {
    preview.innerHTML = "<p class=\"mini-note\">Isi nominal modal dan harga jual untuk melihat konversi IDR dan estimasi profit.</p>";
    return;
  }
  try {
    const params = new URLSearchParams({
      amount: String(amount),
      currency,
      sellPrice: String(sellPrice || 0),
    });
    const data = await fetchJson(`/api/admin/voucher/fx-preview?${params.toString()}`);
    const rateNote = currency === "IDR"
      ? ""
      : `<p class="mini-note">Kurs ${escapeHtml(currency)}/IDR: ${escapeHtml(Number(data.fxRate || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 }))}${data.rateDate ? ` • ${escapeHtml(data.rateDate)}` : ""} • refresh ~10 menit</p>`;
    preview.innerHTML = `
      <div class="voucher-manual-preview-grid">
        <article><p class="mini-label">Modal (IDR)</p><strong>${formatCurrency(data.idrAmount)}</strong></article>
        <article><p class="mini-label">Harga jual</p><strong>${formatCurrency(sellPrice)}</strong></article>
        <article><p class="mini-label">Profit</p><strong>${formatCurrency(data.profit)}</strong></article>
      </div>
      ${rateNote}
    `;
  } catch (error) {
    preview.innerHTML = `<p class="mini-note voucher-cost-preview-error">${escapeHtml(error.message || "Gagal menghitung konversi.")}</p>`;
  }
}

function scheduleCatalogCostPreview() {
  clearTimeout(catalogCostPreviewTimer);
  catalogCostPreviewTimer = setTimeout(() => {
    updateCatalogCostPreview().catch(() => {});
  }, 350);
}

function initVoucherReportDateInputs() {
  const defaults = getDefaultVoucherReportRange();
  if (adminVoucherElements.reportDateFrom && !adminVoucherElements.reportDateFrom.value) {
    adminVoucherElements.reportDateFrom.value = defaults.from;
  }
  if (adminVoucherElements.reportDateTo && !adminVoucherElements.reportDateTo.value) {
    adminVoucherElements.reportDateTo.value = defaults.to;
  }
}

async function loadAdminVoucherReport() {
  const from = String(adminVoucherElements.reportDateFrom?.value || "").trim();
  const to = String(adminVoucherElements.reportDateTo?.value || "").trim();
  if (!from || !to) {
    showStatus("Pilih rentang tanggal laporan voucher.", true);
    return;
  }
  const payload = await fetchJson(`/api/admin/voucher/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  adminVoucherState.report = payload.report || null;
  renderAdminVoucherReport();
}

function renderAdminPaymentProofLink(order, label = "Lihat bukti TF") {
  if (!order?.paymentProofUrl) return "";
  return `<a href="${escapeAttribute(order.paymentProofUrl)}" target="_blank" rel="noreferrer" class="ghost-btn voucher-proof-link">${escapeHtml(label)}</a>`;
}

function renderAdminVoucherReport() {
  const report = adminVoucherState.report;
  if (!adminVoucherElements.reportSummary || !adminVoucherElements.reportList) return;
  if (!report) {
    adminVoucherElements.reportSummary.innerHTML = "";
    adminVoucherElements.reportList.innerHTML = "<p class='mini-note'>Pilih rentang tanggal lalu klik Tampilkan data.</p>";
    return;
  }
  const summary = report.summary || {};
  adminVoucherElements.reportSummary.innerHTML = `
    <article><p class="mini-label">Order selesai</p><strong>${Number(summary.totalOrders || 0)}</strong></article>
    <article><p class="mini-label">Total penjualan</p><strong>${formatCurrency(summary.totalRevenue || 0)}</strong></article>
    <article><p class="mini-label">Total modal</p><strong>${formatCurrency(summary.totalCost || 0)}</strong></article>
    <article><p class="mini-label">Total profit</p><strong>${formatCurrency(summary.totalProfit || 0)}</strong></article>
  `;
  const products = Array.isArray(report.products) ? report.products : [];
  adminVoucherElements.reportList.innerHTML = products.length
    ? products.map((item) => `
      <article class="admin-list-item voucher-report-product-card">
        <img src="${escapeAttribute(item.imageUrl || "")}" alt="" class="voucher-admin-product-thumb" />
        <div class="voucher-report-product-copy">
          <strong>${escapeHtml(item.productName || "-")}</strong>
          <p class="mini-note">${Number(item.orderCount || 0)} order selesai</p>
          <p>Jual: ${formatCurrency(item.totalRevenue || 0)} • Modal: ${formatCurrency(item.totalCost || 0)} • Profit: <strong>${formatCurrency(item.totalProfit || 0)}</strong></p>
          <div class="voucher-report-order-table">
            <div class="voucher-report-order-head">
              <span>Kode order</span>
              <span>Pembeli</span>
              <span>Harga jual</span>
              <span>Harga modal</span>
              <span>Profit</span>
              <span>Selesai</span>
              <span>Aksi</span>
            </div>
            ${(item.orders || []).map((order) => `
              <div class="voucher-report-order-row">
              <span>${escapeHtml(order.orderCode)}</span>
              <span>${escapeHtml(order.userName || "-")}${order.orderSource === "manual" ? " • Manual" : ""}</span>
                <span>${formatCurrency(order.sellPrice || 0)}</span>
                <span>${formatCurrency(order.costPrice || 0)}</span>
                <span><strong>${formatCurrency(order.profit || 0)}</strong></span>
                <span>${escapeHtml(formatAdminDateTime(order.completedAt))}</span>
                <span class="voucher-report-order-actions">
                  ${order.paymentProofUrl ? `<a href="${escapeAttribute(order.paymentProofUrl)}" target="_blank" rel="noreferrer" class="ghost-btn voucher-proof-link">Lihat bukti TF</a>` : ""}
                  <button type="button" class="ghost-btn danger-btn voucher-report-delete-btn" data-admin-voucher-report-delete="${escapeAttribute(order.orderCode)}">Hapus</button>
                </span>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
    `).join("")
    : "<p class='mini-note'>Belum ada order voucher selesai pada rentang tanggal ini.</p>";
}

function isAdminManualVoucherOrder(order) {
  return String(order?.orderSource || "") === "manual";
}

function getAdminVoucherBuyerLabel(order) {
  if (isAdminManualVoucherOrder(order)) {
    const telegram = String(order.buyerTelegram || "").trim().replace(/^@+/, "");
    return telegram ? `@${telegram}` : "Manual";
  }
  return order.user?.displayName || "-";
}

function buildManualVoucherCopyText(order) {
  const accounts = Array.isArray(order?.accountAccounts) ? order.accountAccounts : [];
  const email = String(order?.accountEmail || accounts[0]?.email || "-").trim();
  const password = String(order?.accountPassword || accounts[0]?.password || "-").trim();
  const productName = String(order?.product?.name || "-").trim();
  return `email : ${email}\npassword : ${password}\nvoucher yang dibeli : ${productName}`;
}

function buildVoucherAccountCredentialsText(order) {
  const productName = String(order.product?.name || "").trim();
  const accounts = Array.isArray(order.accountAccounts) && order.accountAccounts.length
    ? order.accountAccounts
    : (order.accountEmail ? [{ email: order.accountEmail, password: order.accountPassword || "-" }] : []);
  const lines = [];
  accounts.forEach((item, index) => {
    lines.push(`Akun ${index + 1}`);
    lines.push(`Email: ${item.email || "-"}`);
    lines.push(`Password: ${item.password || "-"}`);
    lines.push("");
  });
  if (productName) lines.push(productName);
  return lines.join("\n").trim();
}

function renderAdminVoucherAccountCredentials(order) {
  const accounts = Array.isArray(order.accountAccounts) && order.accountAccounts.length
    ? order.accountAccounts
    : (order.accountEmail ? [{ email: order.accountEmail, password: order.accountPassword || "-" }] : []);
  if (!accounts.length) return "";
  const productName = String(order.product?.name || "").trim();
  const copyText = buildVoucherAccountCredentialsText(order);
  return `
    <div class="voucher-account-credentials">
      <div class="voucher-account-credentials-head">
        <p class="mini-label">Akun subscription pembeli (${accounts.length} akun)</p>
        <button type="button" class="voucher-copy-btn" data-voucher-copy-text="${escapeAttribute(copyText)}">Salin</button>
        <span class="voucher-copy-feedback" hidden>Sudah di copy</span>
      </div>
      <div class="voucher-account-credentials-body">
        ${accounts.map((item, index) => `
          <article class="voucher-credential-row">
            <p class="mini-label">Akun ${index + 1}</p>
            <p><strong>Email:</strong> ${escapeHtml(item.email || "-")}</p>
            <p><strong>Password:</strong> ${escapeHtml(item.password || "-")}</p>
          </article>
        `).join("")}
        ${productName ? `<p class="voucher-credential-product-name">${escapeHtml(productName)}</p>` : ""}
      </div>
    </div>
  `;
}

async function copyVoucherCredentialText(button) {
  const text = String(button.dataset.voucherCopyText || "");
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
  const container = button.closest(".voucher-account-credentials")
    || button.closest(".voucher-manual-order-actions")
    || button.closest(".voucher-credential-row");
  const feedback = container?.querySelector(".voucher-copy-feedback");
  if (feedback) feedback.hidden = false;
  const originalLabel = button.textContent;
  button.textContent = "Tersalin";
  button.disabled = true;
  window.setTimeout(() => {
    button.disabled = false;
    button.textContent = originalLabel;
    if (feedback) feedback.hidden = true;
  }, 1600);
}

function adminVoucherStatusClass(status) {
  if (status === "completed") return "status-chip success";
  if (status === "cancelled") return "status-chip muted";
  if (status === "dispute") return "status-chip danger";
  if (status === "manual_pending") return "status-chip warning";
  return "status-chip warning";
}

async function refreshAdminVoucherData() {
  const [productsPayload, ordersPayload] = await Promise.all([
    fetchJson("/api/admin/voucher/products"),
    fetchJson("/api/admin/voucher/orders"),
  ]);
  adminVoucherState.products = productsPayload.products || [];
  adminVoucherState.orders = ordersPayload.orders || [];
  renderAdminVoucherProducts();
  renderManualVoucherProductOptions();
  renderAdminVoucherOrders();
  renderManualVoucherOrdersList();
  if (adminVoucherState.activeOrder) {
    const latest = adminVoucherState.orders.find((item) => item.orderCode === adminVoucherState.activeOrder.orderCode);
    if (latest) {
      adminVoucherState.activeOrder = latest;
      renderAdminVoucherOrderRoom();
    }
  }
  window.updateAdminNotificationBadges?.();
}

function renderAdminVoucherProducts() {
  if (!adminVoucherElements.productList) return;
  adminVoucherElements.productList.innerHTML = adminVoucherState.products.map((product) => `
    <article class="admin-list-item voucher-admin-product-item">
      <img src="${escapeAttribute(product.displayImage)}" alt="" class="voucher-admin-product-thumb" />
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <p>${formatCurrency(product.price)} jual • Modal ${escapeHtml(formatProductCostDetail(product))} • Profit ${formatCurrency(getProductProfit(product))}</p>
        <p class="mini-note">${product.isActive ? "Aktif" : "Nonaktif"} • ${escapeHtml(product.readyState?.scheduleLabel || "")}</p>
        <p class="mini-note">${product.requiresAccountLogin ? "Butuh email & password akun" : "Tanpa login akun"}</p>
      </div>
      <div class="admin-user-actions">
        <button type="button" class="ghost-btn" data-admin-voucher-edit="${product.id}">Edit</button>
        <button type="button" class="ghost-btn" data-admin-voucher-delete="${product.id}">Hapus</button>
      </div>
    </article>
  `).join("") || "<p class='mini-note'>Belum ada produk katalog.</p>";
}

function bindAdminFileUploadFields(root = document) {
  root.querySelectorAll('input[type="file"]').forEach((input) => {
    if (input.dataset.uploadUiBound === "1") return;
    input.dataset.uploadUiBound = "1";
    const label = input.closest("label");
    if (!label) return;
    label.classList.add("file-upload-field");
    let hint = label.querySelector(".file-upload-hint");
    if (!hint) {
      hint = document.createElement("span");
      hint.className = "file-upload-hint mini-note";
      hint.textContent = "Belum ada file dipilih";
      input.insertAdjacentElement("afterend", hint);
    }
    const syncHint = () => {
      const files = input.multiple
        ? Array.from(input.files || [])
        : [input.files?.[0]].filter(Boolean);
      hint.textContent = files.length
        ? (files.length === 1 ? files[0].name : `${files.length} file dipilih`)
        : (input.dataset.emptyHint || "Belum ada file dipilih");
      label.classList.toggle("has-file", files.length > 0);
    };
    input.addEventListener("change", syncHint);
    syncHint();
  });
}

function resetAdminFileUploadInput(input, emptyHint = "Belum ada file dipilih") {
  if (!input) return;
  input.dataset.emptyHint = emptyHint;
  input.value = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillAdminVoucherProductForm(product = null) {
  if (!adminVoucherElements.productForm) return;
  adminVoucherState.editingProductId = product?.id || null;
  adminVoucherElements.productForm.name.value = product?.name || "";
  adminVoucherElements.productForm.description.value = product?.description || "";
  if (adminVoucherElements.productForm.costAmount) {
    adminVoucherElements.productForm.costAmount.value = product?.costAmountOriginal ?? product?.costPrice ?? 0;
  }
  loadCostCurrencyOptions(product?.costCurrency || "IDR").then(() => scheduleCatalogCostPreview());
  adminVoucherElements.productForm.price.value = product?.price || "";
  adminVoucherElements.productForm.readyMode.value = product?.readyMode || "24h";
  adminVoucherElements.productForm.readyStart.value = product?.readyStart || "";
  adminVoucherElements.productForm.readyEnd.value = product?.readyEnd || "";
  adminVoucherElements.productForm.isActive.checked = product ? product.isActive : true;
  adminVoucherElements.productForm.stock.value = product?.stock ?? -1;
  adminVoucherElements.productForm.sortOrder.value = product?.sortOrder || 0;
  if (adminVoucherElements.productForm.requiresAccountLogin) {
    adminVoucherElements.productForm.requiresAccountLogin.checked = Boolean(product?.requiresAccountLogin);
  }
  const imageInput = adminVoucherElements.productForm.image;
  if (imageInput) {
    const imageName = product?.displayImage ? decodeURIComponent(String(product.displayImage).split("/").pop() || "") : "";
    resetAdminFileUploadInput(
      imageInput,
      product?.displayImage ? `Foto saat ini: ${imageName || "tersimpan"} (pilih file baru untuk mengganti)` : "Belum ada file dipilih",
    );
  }
}

async function saveAdminVoucherProduct(event) {
  event.preventDefault();
  const form = adminVoucherElements.productForm;
  const body = {
    name: form.name.value,
    description: form.description.value,
    costCurrency: form.costCurrency?.value || "IDR",
    costAmount: Number(form.costAmount?.value || 0),
    price: Number(form.price.value || 0),
    readyMode: form.readyMode.value,
    readyStart: form.readyStart.value,
    readyEnd: form.readyEnd.value,
    isActive: form.isActive.checked,
    stock: Number(form.stock.value || -1),
    sortOrder: Number(form.sortOrder.value || 0),
    requiresAccountLogin: Boolean(form.requiresAccountLogin?.checked),
  };
  let productId = adminVoucherState.editingProductId;
  if (productId) {
    await fetchJson(`/api/admin/voucher/products/${productId}`, { method: "PUT", body: JSON.stringify(body) });
  } else {
    const payload = await fetchJson("/api/admin/voucher/products", { method: "POST", body: JSON.stringify(body) });
    productId = payload.product?.id;
  }
  const imageFile = form.image?.files?.[0];
  if (imageFile && productId) {
    const formData = new FormData();
    formData.append("productImage", imageFile);
    await uploadWithProgress(`/api/admin/voucher/products/${productId}/image`, formData);
  }
  fillAdminVoucherProductForm();
  await refreshAdminVoucherData();
  showStatus("Produk katalog voucher berhasil disimpan.");
}

function renderManualVoucherProductOptions() {
  const select = adminVoucherElements.manualProductSelect;
  if (!select) return;
  const currentValue = select.value;
  const products = adminVoucherState.products.filter((product) => product.isActive);
  select.innerHTML = [
    '<option value="">Pilih produk dari katalog...</option>',
    ...products.map((product) => {
      const label = `${product.name} — ${formatCurrency(product.price)}`;
      return `<option value="${product.id}">${escapeHtml(label)}</option>`;
    }),
  ].join("");
  if (currentValue) select.value = currentValue;
  updateManualVoucherPreview();
}

function updateManualVoucherPreview() {
  const preview = adminVoucherElements.manualPreview;
  const productId = Number(adminVoucherElements.manualProductSelect?.value || 0);
  if (!preview) return;
  const product = adminVoucherState.products.find((item) => item.id === productId);
  if (!product) {
    preview.innerHTML = "<p class=\"mini-note\">Pilih produk untuk melihat estimasi harga jual, modal, dan profit.</p>";
    return;
  }
  const sellPrice = Number(product.price || 0);
  const costPrice = Number(product.costPrice || 0);
  const profit = sellPrice - costPrice;
  const costDetail = formatProductCostDetail(product);
  preview.innerHTML = `
    <div class="voucher-manual-preview-grid">
      <article><p class="mini-label">Harga jual</p><strong>${formatCurrency(sellPrice)}</strong></article>
      <article><p class="mini-label">Harga modal</p><strong>${escapeHtml(costDetail)}</strong></article>
      <article><p class="mini-label">Profit</p><strong>${formatCurrency(profit)}</strong></article>
    </div>
    <p class="mini-note">Order manual akan masuk ke Data Voucher / GT dengan keterangan Manual setelah diklik Selesai.</p>
  `;
}

async function submitManualVoucherOrder(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData();
  formData.append("buyerTelegram", String(form.buyerTelegram?.value || "").trim());
  formData.append("accountEmail", String(form.accountEmail?.value || "").trim());
  formData.append("accountPassword", String(form.accountPassword?.value || "").trim());
  formData.append("productId", String(form.productId?.value || ""));
  const proofFile = form.paymentProof?.files?.[0];
  if (proofFile) formData.append("paymentProof", proofFile);
  const payload = await uploadWithProgress("/api/admin/voucher/orders/manual", formData);
  form.reset();
  resetAdminFileUploadInput(form.paymentProof);
  updateManualVoucherPreview();
  adminVoucherState.activeOrder = payload.order;
  await refreshAdminVoucherData();
  renderAdminVoucherOrderRoom();
  showStatus(`Order manual ${payload.order.orderCode} berhasil disimpan.`);
}

function renderManualVoucherOrdersList() {
  const container = adminVoucherElements.manualOrdersList;
  if (!container) return;
  const manualOrders = adminVoucherState.orders.filter((order) => (
    isAdminManualVoucherOrder(order) && !["completed", "cancelled"].includes(order.status)
  ));
  if (!manualOrders.length) {
    container.innerHTML = "<p class='mini-note'>Belum ada order manual aktif.</p>";
    return;
  }
  container.innerHTML = manualOrders.map((order) => {
    const profit = (order.price || 0) - (order.costPrice || order.product?.costPrice || 0);
    const canProcess = order.status === "manual_pending";
    const canCopy = order.status === "processing";
    const canComplete = order.status === "processing";
    const copyText = buildManualVoucherCopyText(order);
    return `
      <article class="voucher-manual-order-item">
        <div class="voucher-manual-order-head">
          <div>
            <strong>${escapeHtml(order.product?.name || order.orderCode)}</strong>
            <p class="mini-note">${escapeHtml(order.orderCode)} • ${escapeHtml(getAdminVoucherBuyerLabel(order))}</p>
          </div>
          <div class="voucher-manual-order-badges">
            <span class="voucher-manual-source-badge">Manual</span>
            <span class="${adminVoucherStatusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span>
          </div>
        </div>
        <div class="voucher-manual-order-meta">
          <span>Jual ${formatCurrency(order.price)}</span>
          <span>Modal ${formatCurrency(order.costPrice || order.product?.costPrice || 0)}</span>
          <span>Profit <strong>${formatCurrency(profit)}</strong></span>
          ${order.paymentProofUrl ? `<span>${renderAdminPaymentProofLink(order)}</span>` : ""}
        </div>
        <div class="voucher-manual-order-actions">
          ${canProcess ? `<button type="button" class="primary-btn" data-admin-voucher-action="manual_process" data-admin-voucher-order-code="${escapeAttribute(order.orderCode)}">Proses</button>` : ""}
          ${canCopy ? `<button type="button" class="ghost-btn" data-voucher-copy-text="${escapeAttribute(copyText)}">Copy Order</button><span class="voucher-copy-feedback" hidden>Sudah di copy</span>` : ""}
          ${canComplete ? `<button type="button" class="primary-btn" data-admin-voucher-action="complete" data-admin-voucher-order-code="${escapeAttribute(order.orderCode)}">Selesai</button>` : ""}
          <button type="button" class="ghost-btn" data-admin-voucher-delete-order="${escapeAttribute(order.orderCode)}">Hapus</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderAdminVoucherOrders() {
  if (!adminVoucherElements.orderList) return;
  adminVoucherElements.orderList.innerHTML = adminVoucherState.orders.map((order) => {
    const unreadCount = window.getAdminVoucherUnreadCount?.(order) || 0;
    const isNew = window.isAdminVoucherOrderNew?.(order);
    const badgeCount = unreadCount || (isNew ? 1 : 0);
    const isActive = adminVoucherState.activeOrder?.orderCode === order.orderCode;
    return `
    <button type="button" class="voucher-order-list-item ${isActive ? "is-active" : ""} ${isNew ? "is-new" : ""}" data-admin-voucher-order="${escapeAttribute(order.orderCode)}">
      <div class="voucher-order-list-body">
        <div class="voucher-order-list-top">
          <strong class="voucher-order-list-title">${escapeHtml(order.product?.name || order.orderCode)}</strong>
          ${badgeCount ? `<span class="notif-badge list-notif-badge">${badgeCount > 99 ? "99+" : badgeCount}</span>` : ""}
          <span class="${adminVoucherStatusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span>
        </div>
        <div class="voucher-order-list-meta">
          <span class="voucher-order-list-code">${escapeHtml(order.orderCode)}</span>
          <span class="voucher-order-list-buyer">${escapeHtml(getAdminVoucherBuyerLabel(order))}</span>
          ${isAdminManualVoucherOrder(order) ? `<span class="voucher-manual-source-badge">Manual</span>` : ""}
          <span class="voucher-order-list-price">${formatCurrency(order.price)}</span>
        </div>
      </div>
    </button>
  `;
  }).join("") || "<p class='mini-note'>Belum ada order voucher.</p>";
}

function renderAdminVoucherMessage(message) {
  if (window.VoucherChatUI?.renderMessageBubble) {
    return window.VoucherChatUI.renderMessageBubble(message, { viewerRole: "admin" });
  }
  const attachment = message.attachmentUrl
    ? (String(message.attachmentType || "").startsWith("image/")
      ? `<a href="${escapeAttribute(message.attachmentUrl)}" target="_blank" rel="noreferrer"><img class="voucher-chat-image" src="${escapeAttribute(message.attachmentUrl)}" alt="" /></a>`
      : `<a href="${escapeAttribute(message.attachmentUrl)}" target="_blank" rel="noreferrer">${escapeHtml(message.attachmentName || "Lampiran")}</a>`)
    : "";
  return `
    <article class="voucher-chat-message ${message.senderRole === "admin" ? "is-admin" : "is-user"}">
      <strong>${escapeHtml(message.senderName)}</strong>
      ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
      ${attachment}
    </article>
  `;
}

function buildAdminVoucherActionsHtml(order) {
  const canProcess = ["awaiting_confirmation", "needs_verification"].includes(order.status);
  const canComplete = ["processing", "needs_verification", "dispute"].includes(order.status);
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing", "dispute"].includes(order.status);
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  const accountsReady = order.product?.requiresAccountLogin
    && accounts.length >= quantity
    && accounts.slice(0, quantity).every((item) => item.email && item.email.includes("@") && item.password);
  const canRequestAccountRevision = accountsReady
    && !order.accountRevisionRequested
    && ["processing", "needs_verification", "dispute"].includes(order.status);
  return `
    <section class="voucher-room-side-card voucher-room-admin-actions-card">
      <h4>Aksi Admin</h4>
      <div class="voucher-admin-chat-actions">
        ${canProcess ? `<button type="button" class="primary-btn" data-admin-voucher-action="process">PROSES</button>` : ""}
        ${order.status === "processing" ? `<button type="button" class="ghost-btn" data-admin-voucher-action="needs_verification">Butuh Verifikasi</button>` : ""}
        ${canRequestAccountRevision ? `<button type="button" class="ghost-btn" data-admin-voucher-action="request_account_revision">Minta Perbaikan Data Akun</button>` : ""}
        ${canCancel ? `<button type="button" class="ghost-btn" data-admin-voucher-action="cancel">BATALKAN</button>` : ""}
        ${canComplete ? `<button type="button" class="primary-btn" data-admin-voucher-action="complete">Selesai</button>` : ""}
        <button type="button" class="ghost-btn danger-btn" data-admin-voucher-delete-order="${escapeAttribute(order.orderCode)}">Hapus Order</button>
      </div>
    </section>
  `;
}

function buildAdminVoucherSidebarExtra(order) {
  const profit = (order.price || 0) - (order.costPrice || order.product?.costPrice || 0);
  return `
    <section class="voucher-room-side-card">
      <h4>Ringkasan Finansial</h4>
      <dl class="voucher-room-detail-list">
        <div><dt>Harga jual</dt><dd>${formatCurrency(order.price)}</dd></div>
        <div><dt>Harga modal</dt><dd>${formatCurrency(order.costPrice || order.product?.costPrice || 0)}</dd></div>
        <div><dt>Profit</dt><dd>${formatCurrency(profit)}</dd></div>
      </dl>
    </section>
    ${renderAdminVoucherAccountCredentials(order)}
    ${order.paymentProofUrl ? `<p class="mini-note voucher-room-proof-link"><a href="${escapeAttribute(order.paymentProofUrl)}" target="_blank" rel="noreferrer">Lihat bukti pembayaran</a></p>` : ""}
  `;
}

function buildAdminVoucherComposeMarkup() {
  if (window.VoucherChatUI?.buildComposeMarkup) {
    return window.VoucherChatUI.buildComposeMarkup({
      formId: "admin-voucher-chat-form",
      inputId: "admin-voucher-chat-input",
      uploadId: "admin-voucher-chat-upload",
    });
  }
  return `
    <form id="admin-voucher-chat-form" class="profile-form">
      <label>Pesan admin<input type="text" id="admin-voucher-chat-input" /></label>
      <label class="file-upload-field">Lampiran
        <input type="file" id="admin-voucher-chat-upload" accept="image/jpeg,image/png,image/webp" multiple />
        <span class="file-upload-hint mini-note">Belum ada file dipilih</span>
      </label>
      <button type="submit" class="primary-btn">Kirim ke pembeli</button>
    </form>
  `;
}

function renderAdminVoucherOrderRoom() {
  const order = adminVoucherState.activeOrder;
  if (!adminVoucherElements.orderRoom || !order) {
    if (adminVoucherElements.orderRoom) {
      adminVoucherElements.orderRoom.innerHTML = "<p class='mini-note'>Pilih order voucher untuk melihat detail dan chat.</p>";
    }
    return;
  }

  if (isAdminManualVoucherOrder(order)) {
    const profit = (order.price || 0) - (order.costPrice || order.product?.costPrice || 0);
    const canProcess = order.status === "manual_pending";
    const canCopy = order.status === "processing";
    const canComplete = order.status === "processing";
    const copyText = buildManualVoucherCopyText(order);
    adminVoucherElements.orderRoom.innerHTML = `
      <div class="section-head">
        <p class="eyebrow">${escapeHtml(order.orderCode)} • Manual</p>
        <h3>${escapeHtml(order.product?.name || "Order Voucher")}</h3>
        <span class="${adminVoucherStatusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span>
      </div>
      <div class="admin-summary">
        <article><p class="mini-label">Telegram pembeli</p><strong>${escapeHtml(getAdminVoucherBuyerLabel(order))}</strong></article>
        <article><p class="mini-label">Harga jual</p><strong>${formatCurrency(order.price)}</strong></article>
        <article><p class="mini-label">Harga modal</p><strong>${formatCurrency(order.costPrice || order.product?.costPrice || 0)}</strong></article>
        <article><p class="mini-label">Profit</p><strong>${formatCurrency(profit)}</strong></article>
        <article><p class="mini-label">Waktu input</p><strong>${escapeHtml(formatAdminDateTime(order.createdAt))}</strong></article>
      </div>
      ${renderAdminVoucherAccountCredentials(order)}
      <div class="voucher-admin-chat-actions voucher-manual-order-actions">
        ${canProcess ? `<button type="button" class="primary-btn" data-admin-voucher-action="manual_process" data-admin-voucher-order-code="${escapeAttribute(order.orderCode)}">Proses</button>` : ""}
        ${canCopy ? `<button type="button" class="ghost-btn" data-voucher-copy-text="${escapeAttribute(copyText)}">Copy Order</button><span class="voucher-copy-feedback" hidden>Sudah di copy</span>` : ""}
        ${canComplete ? `<button type="button" class="primary-btn" data-admin-voucher-action="complete" data-admin-voucher-order-code="${escapeAttribute(order.orderCode)}">Selesai</button>` : ""}
        <button type="button" class="ghost-btn danger-btn" data-admin-voucher-delete-order="${escapeAttribute(order.orderCode)}">Hapus Order</button>
      </div>
      ${renderAdminPaymentProofLink(order, "Lihat bukti transfer")}
      ${order.paymentProofUrl ? `<p class="mini-note">Bukti TF: ${escapeHtml(order.paymentProofName || "Lampiran")}</p>` : ""}
      <p class="mini-note">Order manual tidak memiliki chat pembeli. Setelah Proses, salin data order ke pembeli lalu klik Selesai agar masuk laporan Data Voucher / GT.</p>
    `;
    return;
  }

  const activeElement = document.activeElement;
  const prevInput = document.getElementById("admin-voucher-chat-input");
  const hadFocus = activeElement === prevInput;
  const previousValue = prevInput?.value || "";
  const selectionStart = hadFocus ? prevInput.selectionStart : null;
  const selectionEnd = hadFocus ? prevInput.selectionEnd : null;

  if (window.VoucherChatUI?.buildRoomMarkup) {
    adminVoucherElements.orderRoom.innerHTML = window.VoucherChatUI.buildRoomMarkup(order, {
      viewerRole: "admin",
      layoutMode: "admin",
      chatBoxId: "admin-voucher-chat-box",
      statusClass: adminVoucherStatusClass,
      buyerLabel: order.user?.displayName || "-",
      adminActionsHtml: buildAdminVoucherActionsHtml(order),
      sidebarExtra: buildAdminVoucherSidebarExtra(order),
      bottomHtml: buildAdminVoucherComposeMarkup(),
      toolbarActionsHtml: "",
    });
  } else {
  const canProcess = ["awaiting_confirmation", "needs_verification"].includes(order.status);
  const canComplete = ["processing", "needs_verification", "dispute"].includes(order.status);
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing", "dispute"].includes(order.status);
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  const accountsReady = order.product?.requiresAccountLogin
    && accounts.length >= quantity
    && accounts.slice(0, quantity).every((item) => item.email && item.email.includes("@") && item.password);
  const canRequestAccountRevision = accountsReady
    && !order.accountRevisionRequested
    && ["processing", "needs_verification", "dispute"].includes(order.status);
  adminVoucherElements.orderRoom.innerHTML = `
    <div class="section-head">
      <p class="eyebrow">${escapeHtml(order.orderCode)}</p>
      <h3>${escapeHtml(order.product?.name || "Order Voucher")}</h3>
      <span class="${adminVoucherStatusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span>
    </div>
    <div class="admin-summary">
      <article><p class="mini-label">Pembeli</p><strong>${escapeHtml(order.user?.displayName || "-")}</strong></article>
      <article><p class="mini-label">Jumlah</p><strong>${Math.max(1, Number(order.quantity || 1))} pcs</strong></article>
      <article><p class="mini-label">Harga jual</p><strong>${formatCurrency(order.price)}</strong></article>
      <article><p class="mini-label">Harga modal</p><strong>${formatCurrency(order.costPrice || order.product?.costPrice || 0)}</strong></article>
      <article><p class="mini-label">Profit</p><strong>${formatCurrency((order.price || 0) - (order.costPrice || order.product?.costPrice || 0))}</strong></article>
      <article><p class="mini-label">Waktu order</p><strong>${escapeHtml(formatAdminDateTime(order.createdAt))}</strong></article>
    </div>
    ${renderAdminVoucherAccountCredentials(order)}
    ${order.paymentProofUrl ? `<p><a href="${escapeAttribute(order.paymentProofUrl)}" target="_blank" rel="noreferrer">Lihat bukti pembayaran</a></p>` : ""}
    <div class="voucher-admin-chat-actions">
      ${canProcess ? `<button type="button" class="primary-btn" data-admin-voucher-action="process">PROSES</button>` : ""}
      ${order.status === "processing" ? `<button type="button" class="ghost-btn" data-admin-voucher-action="needs_verification">Butuh Verifikasi</button>` : ""}
      ${canRequestAccountRevision ? `<button type="button" class="ghost-btn" data-admin-voucher-action="request_account_revision">Minta Perbaikan Data Akun</button>` : ""}
      ${canCancel ? `<button type="button" class="ghost-btn" data-admin-voucher-action="cancel">BATALKAN</button>` : ""}
      ${canComplete ? `<button type="button" class="primary-btn" data-admin-voucher-action="complete">Selesai</button>` : ""}
      <button type="button" class="ghost-btn danger-btn" data-admin-voucher-delete-order="${escapeAttribute(order.orderCode)}">Hapus Order</button>
    </div>
    <div class="voucher-chat-box" id="admin-voucher-chat-box">${(order.messages || []).map(renderAdminVoucherMessage).join("")}</div>
    ${buildAdminVoucherComposeMarkup()}
  `;
  }
  const box = document.getElementById("admin-voucher-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  const nextInput = document.getElementById("admin-voucher-chat-input");
  if (nextInput && previousValue && !nextInput.value) {
    nextInput.value = previousValue;
    if (hadFocus) {
      nextInput.focus();
      if (selectionStart != null && selectionEnd != null) {
        nextInput.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }
  bindAdminFileUploadFields(adminVoucherElements.orderRoom || document.getElementById("admin-voucher-order-room"));
  window.VoucherChatUI?.bindSidebarEvents?.(adminVoucherElements.orderRoom || document);
}

async function openAdminVoucherOrder(orderCode) {
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
  adminVoucherState.activeOrder = payload.order;
  window.markAdminVoucherOrderSeen?.(payload.order);
  renderAdminVoucherOrders();
  renderAdminVoucherOrderRoom();
  window.requestAnimationFrame(() => {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    document.getElementById("admin-voucher-order-room")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function runAdminVoucherAction(action, orderCode = "") {
  const normalizedCode = String(orderCode || adminVoucherState.activeOrder?.orderCode || "").trim().toUpperCase();
  if (!normalizedCode) return;
  const order = adminVoucherState.orders.find((item) => item.orderCode === normalizedCode) || adminVoucherState.activeOrder;
  if (!order) return;
  let note = "";
  if (action === "cancel") {
    note = window.prompt("Alasan pembatalan admin:") || "";
    if (!note.trim()) return;
  }
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(normalizedCode)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
  if (adminVoucherState.activeOrder?.orderCode === normalizedCode) {
    adminVoucherState.activeOrder = payload.order;
  }
  await refreshAdminVoucherData();
  if (action === "complete") {
    await loadAdminVoucherReport().catch((error) => {
      showStatus(error.message || "Gagal memuat laporan voucher.", true);
    });
  }
  showStatus(`Status order diperbarui: ${payload.statusLabel || payload.order.status}`);
}

async function submitAdminVoucherChat(event) {
  event.preventDefault();
  const order = adminVoucherState.activeOrder;
  if (!order) return;
  const text = String(document.getElementById("admin-voucher-chat-input")?.value || "").trim();
  const chatUpload = document.getElementById("admin-voucher-chat-upload");
  const files = Array.from(chatUpload?.files || []);
  if (!text && !files.length) return;
  if (text) {
    await fetchJson(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }
  if (files.length) {
    const formData = new FormData();
    files.forEach((file) => formData.append("chatFiles", file));
    await uploadWithProgress(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}/uploads`, formData);
  }
  document.getElementById("admin-voucher-chat-input").value = "";
  resetAdminFileUploadInput(chatUpload);
  await openAdminVoucherOrder(order.orderCode);
}

function renderAdminVoucherPaymentSettings(settings) {
  const payment = settings?.voucherPayment || {};
  if (adminVoucherElements.voucherPaymentBankName) adminVoucherElements.voucherPaymentBankName.value = payment.bankName || "";
  if (adminVoucherElements.voucherPaymentBankNumber) adminVoucherElements.voucherPaymentBankNumber.value = payment.bankNumber || "";
  if (adminVoucherElements.voucherPaymentBankHolder) adminVoucherElements.voucherPaymentBankHolder.value = payment.bankHolder || "";
  if (adminVoucherElements.voucherPaymentQrisUrl) adminVoucherElements.voucherPaymentQrisUrl.value = payment.qrisUrl || "";
  if (adminVoucherElements.voucherPaymentInstructions) adminVoucherElements.voucherPaymentInstructions.value = payment.instructions || "";
  if (adminVoucherElements.voucherPaymentTerms) adminVoucherElements.voucherPaymentTerms.value = payment.termsAndConditions || "";
}

async function deleteAdminVoucherOrder(orderCode) {
  const normalized = String(orderCode || "").trim().toUpperCase();
  if (!normalized) return;
  const confirmed = window.confirm(
    `Hapus order ${normalized}?\n\nOrder akan dihapus dari admin dan juga hilang dari riwayat pembeli. Tindakan ini tidak bisa dibatalkan.`,
  );
  if (!confirmed) return;
  await fetchJson(`/api/admin/voucher/orders/${encodeURIComponent(normalized)}`, { method: "DELETE" });
  if (adminVoucherState.activeOrder?.orderCode === normalized) {
    adminVoucherState.activeOrder = null;
    renderAdminVoucherOrderRoom();
  }
  await Promise.all([
    refreshAdminVoucherData().catch((error) => {
      showStatus(error.message || "Gagal memuat data voucher.", true);
    }),
    loadAdminVoucherReport().catch((error) => {
      showStatus(error.message || "Gagal memuat laporan voucher.", true);
    }),
  ]);
  showStatus(`Order ${normalized} berhasil dihapus.`);
}

function bindAdminVoucherEvents() {
  adminVoucherElements.reportLoadButton?.addEventListener("click", () => {
    loadAdminVoucherReport().catch((error) => {
      showStatus(error.message || "Gagal memuat laporan voucher.", true);
    });
  });
  adminVoucherElements.manualProductSelect?.addEventListener("change", updateManualVoucherPreview);
  adminVoucherElements.manualForm?.addEventListener("submit", async (event) => {
    try {
      await submitManualVoucherOrder(event);
    } catch (error) {
      showStatus(error.message || "Gagal menyimpan order manual.", true);
    }
  });
  adminVoucherElements.productForm?.addEventListener("submit", async (event) => {
    try {
      await saveAdminVoucherProduct(event);
    } catch (error) {
      showStatus(error.message || "Gagal menyimpan produk.", true);
    }
  });
  adminVoucherElements.productForm?.costAmount?.addEventListener("input", scheduleCatalogCostPreview);
  adminVoucherElements.productForm?.costCurrency?.addEventListener("change", scheduleCatalogCostPreview);
  adminVoucherElements.productForm?.price?.addEventListener("input", scheduleCatalogCostPreview);
  document.getElementById("admin-voucher-product-reset")?.addEventListener("click", () => fillAdminVoucherProductForm());
  document.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-admin-voucher-edit]");
    if (editButton) {
      const product = adminVoucherState.products.find((item) => item.id === Number(editButton.dataset.adminVoucherEdit));
      fillAdminVoucherProductForm(product || null);
      return;
    }
    const deleteButton = event.target.closest("[data-admin-voucher-delete]");
    if (deleteButton) {
      if (!window.confirm("Hapus produk ini?")) return;
      await fetchJson(`/api/admin/voucher/products/${deleteButton.dataset.adminVoucherDelete}`, { method: "DELETE" });
      await refreshAdminVoucherData();
      showStatus("Produk dihapus.");
      return;
    }
    const orderButton = event.target.closest("[data-admin-voucher-order]");
    if (orderButton) {
      await openAdminVoucherOrder(orderButton.dataset.adminVoucherOrder);
      return;
    }
    const actionButton = event.target.closest("[data-admin-voucher-action]");
    if (actionButton) {
      try {
        await runAdminVoucherAction(
          actionButton.dataset.adminVoucherAction,
          actionButton.dataset.adminVoucherOrderCode,
        );
      } catch (error) {
        showStatus(error.message || "Gagal memperbarui order.", true);
      }
      return;
    }
    const reportDeleteButton = event.target.closest("[data-admin-voucher-report-delete]");
    if (reportDeleteButton) {
      try {
        await deleteAdminVoucherOrder(reportDeleteButton.dataset.adminVoucherReportDelete);
      } catch (error) {
        showStatus(error.message || "Gagal menghapus order voucher.", true);
      }
      return;
    }
    const deleteOrderButton = event.target.closest("[data-admin-voucher-delete-order]");
    if (deleteOrderButton) {
      try {
        await deleteAdminVoucherOrder(deleteOrderButton.dataset.adminVoucherDeleteOrder);
      } catch (error) {
        showStatus(error.message || "Gagal menghapus order voucher.", true);
      }
      return;
    }
    const copyCredentialButton = event.target.closest("[data-voucher-copy-text]");
    if (copyCredentialButton) {
      try {
        await copyVoucherCredentialText(copyCredentialButton);
      } catch (error) {
        showStatus(error.message || "Gagal menyalin teks.", true);
      }
    }
  });
  document.addEventListener("submit", async (event) => {
    if (event.target?.id !== "admin-voucher-chat-form") return;
    event.preventDefault();
    try {
      await submitAdminVoucherChat(event);
    } catch (error) {
      showStatus(error.message || "Gagal mengirim chat admin.", true);
    }
  });
}

function handleAdminVoucherLiveEvent(payload) {
  if (payload?.type !== "voucher_order_updated") return Promise.resolve();
  if (payload.deleted) {
    const code = String(payload.orderCode || payload.code || "").trim().toUpperCase();
    if (code) {
      adminVoucherState.orders = adminVoucherState.orders.filter((item) => item.orderCode !== code);
      if (adminVoucherState.activeOrder?.orderCode === code) {
        adminVoucherState.activeOrder = null;
        renderAdminVoucherOrderRoom();
      }
      renderAdminVoucherOrders();
      renderManualVoucherOrdersList();
    }
  }
  return refreshAdminVoucherData().catch(() => {});
}

window.RekberAdminVoucher = {
  init() {
    bindAdminVoucherEvents();
    bindAdminFileUploadFields(adminVoucherElements.productForm || document);
    bindAdminFileUploadFields(adminVoucherElements.manualForm || document);
    initVoucherReportDateInputs();
    loadCostCurrencyOptions("IDR").finally(() => {
      fillAdminVoucherProductForm();
    });
    renderAdminVoucherReport();
  },
  refresh: refreshAdminVoucherData,
  refreshReport: loadAdminVoucherReport,
  renderPaymentSettings: renderAdminVoucherPaymentSettings,
  handleLiveEvent: handleAdminVoucherLiveEvent,
  openOrder: openAdminVoucherOrder,
  getOrders() {
    return Array.isArray(adminVoucherState.orders) ? [...adminVoucherState.orders] : [];
  },
};
