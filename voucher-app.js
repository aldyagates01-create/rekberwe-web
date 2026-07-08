const voucherState = {
  products: [],
  orders: [],
  activeProduct: null,
  activeOrder: null,
  detailProduct: null,
  detailQuantity: 1,
  screen: "catalog",
  catalogSearchQuery: "",
  paymentSettings: null,
  historyRoomOrderCode: "",
};

const voucherElements = {
  panel: document.getElementById("workspace-voucher-panel"),
  rekberPanel: document.getElementById("workspace-rekber-panel"),
  serviceButtons: Array.from(document.querySelectorAll("[data-workspace-service]")),
  catalogView: document.getElementById("voucher-catalog-view"),
  detailView: document.getElementById("voucher-detail-view"),
  checkoutView: document.getElementById("voucher-checkout-view"),
  ordersView: document.getElementById("voucher-orders-view"),
  chatView: document.getElementById("voucher-chat-view"),
  sidebarOrdersList: document.getElementById("voucher-orders-sidebar-list"),
};

function voucherFetchJson(url, options = {}) {
  return window.fetchJson ? window.fetchJson(url, options) : fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Permintaan gagal.");
    return payload;
  });
}

function voucherEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function voucherFormatCurrency(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function voucherStatusClass(status) {
  if (status === "completed") return "status-chip status-chip-success";
  if (status === "cancelled") return "status-chip status-chip-muted";
  if (status === "dispute") return "status-chip status-chip-danger";
  if (status === "processing" || status === "needs_verification") return "status-chip status-chip-warning";
  return "status-chip";
}

function voucherReadyChipClass(ready = {}) {
  if (ready.ready) return "voucher-ready-chip is-ready";
  return "voucher-ready-chip is-not-ready";
}

function buildVoucherReadyLabel(ready = {}) {
  if (!ready.label) return "-";
  if (ready.ready) return `🕐 ${ready.label}`;
  return ready.label;
}

function buildVoucherCountdownBadge(ready = {}) {
  if (!ready.nextReadyAt) return "";
  return `<span class="voucher-ready-countdown" data-ready-countdown="${voucherEscapeHtml(ready.nextReadyAt)}">--:--:--</span>`;
}

let voucherCatalogCountdownTimer = null;

function stopVoucherCatalogCountdowns() {
  if (voucherCatalogCountdownTimer) {
    clearInterval(voucherCatalogCountdownTimer);
    voucherCatalogCountdownTimer = null;
  }
}

function startVoucherCatalogCountdowns() {
  stopVoucherCatalogCountdowns();
  const nodes = Array.from(document.querySelectorAll("[data-ready-countdown]"));
  if (!nodes.length) return;

  const tick = () => {
    const now = Date.now();
    let shouldRefreshCatalog = false;
    nodes.forEach((node) => {
      const target = Date.parse(node.dataset.readyCountdown || "");
      if (!target || Number.isNaN(target)) return;
      const diff = Math.max(0, target - now);
      if (diff <= 0) {
        shouldRefreshCatalog = true;
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      node.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    });
    if (shouldRefreshCatalog && voucherState.screen === "catalog") {
      renderVoucherCatalog({ preserveSearchFocus: true });
    }
  };

  tick();
  voucherCatalogCountdownTimer = setInterval(tick, 1000);
}

function getVoucherGridClass(count) {
  if (count <= 1) return "is-single";
  if (count === 2) return "is-duo";
  if (count === 3) return "is-trio";
  return "is-many";
}

function getVoucherMaxQuantity(product) {
  if (!product) return 1;
  if (Number(product.stock) === 0) return 0;
  if (product.stock > 0) return Math.min(20, product.stock);
  return 20;
}

function formatVoucherDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID");
}

function setVoucherDetailQuantity(nextQuantity) {
  const product = voucherState.detailProduct;
  if (!product) return 1;
  const maxQty = getVoucherMaxQuantity(product);
  if (maxQty === 0) {
    voucherState.detailQuantity = 0;
    return 0;
  }
  const quantity = Math.max(1, Math.min(maxQty, Number(nextQuantity || 1)));
  voucherState.detailQuantity = quantity;
  const input = document.getElementById("voucher-detail-quantity");
  if (input) input.value = String(quantity);
  const minusBtn = document.querySelector("[data-voucher-qty-minus]");
  const plusBtn = document.querySelector("[data-voucher-qty-plus]");
  if (minusBtn) minusBtn.disabled = quantity <= 1;
  if (plusBtn) plusBtn.disabled = quantity >= maxQty;
  const totalEl = document.getElementById("voucher-detail-total");
  if (totalEl) {
    totalEl.textContent = voucherFormatCurrency(Number(product.price || 0) * quantity);
  }
  return quantity;
}

async function copyVoucherBankNumber(button) {
  const text = String(button.dataset.voucherCopyBank || "").trim();
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
  const row = button.closest(".voucher-bank-number-row");
  const feedback = row?.querySelector(".voucher-copy-feedback");
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

function hasVoucherAccountsComplete(order) {
  if (!order?.product?.requiresAccountLogin) return true;
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  if (accounts.length < quantity) return false;
  return accounts.slice(0, quantity).every((item) => item.email && item.email.includes("@") && item.password);
}

function shouldShowVoucherAccountForm(order) {
  if (!order?.product?.requiresAccountLogin) return false;
  if (order.accountRevisionRequested) return true;
  return !hasVoucherAccountsComplete(order);
}

function buildVoucherAccountFormsMarkup(order, options = {}) {
  if (!order?.product?.requiresAccountLogin) return "";
  const isRevision = Boolean(order.accountRevisionRequested);
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  const formId = options.formId || "voucher-accounts-form";
  if (hasVoucherAccountsComplete(order) && !isRevision) {
    return `
      <section class="voucher-account-forms-card voucher-account-forms-compact is-complete">
        <div class="voucher-account-forms-head">
          <h4>Data akun · ${quantity} pcs</h4>
          <p class="mini-note">Terkirim</p>
        </div>
        <div class="voucher-account-complete-list">
        ${accounts.slice(0, quantity).map((item, index) => `
          <div class="voucher-account-complete-row">
            <span class="voucher-account-num">${index + 1}</span>
            <span class="voucher-account-complete-email">${voucherEscapeHtml(item.email)}</span>
          </div>
        `).join("")}
        </div>
      </section>
    `;
  }
  const revisionNotice = isRevision
    ? `<p class="mini-note voucher-account-revision-note">Admin meminta perbaikan data akun. Silakan perbarui email dan password lalu kirim ulang.</p>`
    : "";
  return `
    <section class="voucher-account-forms-card voucher-account-forms-compact${isRevision ? " is-revision" : ""}">
      <div class="voucher-account-forms-head">
        <h4>${isRevision ? "Perbaiki data akun" : "Data akun"} · ${quantity} pcs</h4>
      </div>
      ${revisionNotice}
      <form id="${voucherEscapeHtml(formId)}" class="voucher-account-forms">
        ${Array.from({ length: quantity }, (_, index) => {
    const existing = accounts[index] || {};
    return `
          <div class="voucher-account-row">
            <span class="voucher-account-num" aria-hidden="true">${index + 1}</span>
            <input type="email" name="account_email_${index}" value="${voucherEscapeHtml(existing.email || "")}" required autocomplete="username" placeholder="Email akun ${index + 1}" aria-label="Email akun ${index + 1}" />
            <input type="password" name="account_password_${index}" value="${voucherEscapeHtml(existing.password || "")}" required autocomplete="current-password" placeholder="Password" aria-label="Password akun ${index + 1}" />
          </div>
        `;
  }).join("")}
        <button type="submit" class="primary-btn voucher-account-submit-btn">${isRevision ? "Kirim perbaikan data akun" : "Kirim data akun"}</button>
      </form>
    </section>
  `;
}

function setWorkspaceService(service) {
  const isVoucher = service === "voucher";
  voucherElements.rekberPanel?.classList.toggle("hidden", isVoucher);
  voucherElements.panel?.classList.toggle("hidden", !isVoucher);
  voucherElements.serviceButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.workspaceService === service);
  });
  if (isVoucher) {
    refreshVoucherData().catch((error) => {
      window.setAuthStatus?.(error.message || "Gagal memuat katalog voucher.", true);
    });
  }
}

async function refreshVoucherData() {
  const [productsPayload, ordersPayload, configPayload] = await Promise.all([
    voucherFetchJson("/api/voucher/products"),
    voucherFetchJson("/api/voucher/orders"),
    voucherFetchJson("/api/config"),
  ]);
  voucherState.products = productsPayload.products || [];
  voucherState.orders = ordersPayload.orders || [];
  voucherState.paymentSettings = configPayload.voucherPayment || {};
  renderVoucherCatalog();
  renderVoucherOrdersSidebar();
  if (voucherState.activeOrder) {
    const latest = voucherState.orders.find((item) => item.orderCode === voucherState.activeOrder.orderCode);
    if (latest) {
      voucherState.activeOrder = latest;
      renderVoucherChat();
    }
  }
}

function getVoucherCatalogProducts() {
  const query = String(voucherState.catalogSearchQuery || "").trim().toLowerCase();
  if (!query) return voucherState.products;
  return voucherState.products.filter((product) => {
    const haystack = [
      product.name,
      product.description,
      product.displayImage,
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

let voucherCatalogSearchTimer = null;

function renderVoucherCatalog(options = {}) {
  if (!voucherElements.catalogView) return;
  const preserveSearchFocus = options.preserveSearchFocus !== false;
  const activeElement = document.activeElement;
  const searchHadFocus = preserveSearchFocus && activeElement?.id === "voucher-catalog-search";
  const selectionStart = searchHadFocus ? activeElement.selectionStart : null;
  const selectionEnd = searchHadFocus ? activeElement.selectionEnd : null;
  const filteredProducts = getVoucherCatalogProducts();
  const cards = filteredProducts.map((product) => {
    const ready = product.readyState || {};
    const disabled = !ready.canPurchase;
    return `
      <article class="voucher-product-card ${disabled ? "is-disabled" : "is-clickable"}" ${disabled ? "" : `data-voucher-buy="${product.id}"`} ${disabled ? "" : 'tabindex="0" role="button"'}>
        <div class="voucher-product-image-wrap">
          ${product.isBestseller ? `<span class="voucher-bestseller-badge">Terlaris</span>` : ""}
          ${buildVoucherCountdownBadge(ready)}
          <img src="${voucherEscapeHtml(product.displayImage)}" alt="${voucherEscapeHtml(product.name)}" loading="lazy" />
        </div>
        <div class="voucher-product-body">
          <div class="voucher-product-head">
            <h4>${voucherEscapeHtml(product.name)}</h4>
            <span class="${voucherReadyChipClass(ready)}">${voucherEscapeHtml(buildVoucherReadyLabel(ready))}</span>
          </div>
          <p class="voucher-product-price">${voucherFormatCurrency(product.price)}</p>
          <p class="mini-note voucher-product-desc">${voucherEscapeHtml(product.description || "Produk digital RekberWE.id")}</p>
          <button type="button" class="primary-btn voucher-product-buy-btn" data-voucher-buy="${product.id}" ${disabled ? "disabled" : ""}>
            ${disabled ? voucherEscapeHtml(ready.label || "Belum Ready") : "Beli Sekarang"}
          </button>
        </div>
      </article>
    `;
  }).join("");
  const gridClass = getVoucherGridClass(filteredProducts.length || voucherState.products.length);
  voucherElements.catalogView.innerHTML = `
    <div class="voucher-catalog-shell">
      <div class="voucher-catalog-head">
        <div class="section-head">
          <p class="eyebrow">Marketplace</p>
          <h3>Beli Voucher / Gametime</h3>
          <p class="mini-note">Pilih produk digital, transfer ke rekening admin, lalu upload bukti pembayaran.</p>
        </div>
        <div class="voucher-catalog-toolbar">
          <input type="search" id="voucher-catalog-search" placeholder="Cari produk voucher / gametime..." value="${voucherEscapeHtml(voucherState.catalogSearchQuery)}" autocomplete="off" enterkeyhint="search" />
        </div>
      </div>
      <div class="voucher-catalog-scroll">
        <div class="voucher-product-grid ${gridClass}">${cards || `<p class='mini-note'>${voucherState.products.length ? "Tidak ada produk yang cocok dengan pencarian." : "Belum ada produk aktif."}</p>`}</div>
      </div>
    </div>
  `;

  if (searchHadFocus) {
    const searchInput = document.getElementById("voucher-catalog-search");
    if (searchInput) {
      searchInput.focus();
      if (selectionStart != null && selectionEnd != null) {
        try {
          searchInput.setSelectionRange(selectionStart, selectionEnd);
        } catch {
          // Some browsers block selection restore on type=search.
        }
      }
    }
  }

  startVoucherCatalogCountdowns();
}

function renderVoucherOrdersSidebar() {
  if (!voucherElements.sidebarOrdersList) return;
  voucherElements.sidebarOrdersList.innerHTML = voucherState.orders.slice(0, 8).map((order) => `
    <button type="button" class="activity-item voucher-order-sidebar-item" data-voucher-order="${voucherEscapeHtml(order.orderCode)}">
      <strong>${voucherEscapeHtml(order.product?.name || order.orderCode)}</strong>
      <span>${voucherEscapeHtml(order.statusLabel || order.status)}</span>
    </button>
  `).join("") || "<p class='mini-note'>Belum ada order voucher.</p>";
}

function openVoucherScreen(screen) {
  voucherState.screen = screen;
  voucherElements.catalogView?.classList.toggle("hidden", screen !== "catalog");
  voucherElements.detailView?.classList.toggle("hidden", screen !== "detail");
  voucherElements.checkoutView?.classList.toggle("hidden", screen !== "checkout");
  voucherElements.ordersView?.classList.toggle("hidden", screen !== "orders");
  voucherElements.chatView?.classList.toggle("hidden", screen !== "chat");
}

function openVoucherProductDetail(productId) {
  const product = voucherState.products.find((item) => item.id === Number(productId));
  if (!product) return;
  voucherState.detailProduct = product;
  voucherState.detailQuantity = 1;
  renderVoucherProductDetail();
  openVoucherScreen("detail");
}

function renderVoucherProductDetail() {
  const product = voucherState.detailProduct;
  if (!voucherElements.detailView || !product) return;
  const ready = product.readyState || {};
  const maxQty = getVoucherMaxQuantity(product);
  const quantity = Math.max(1, Math.min(maxQty, Number(voucherState.detailQuantity || 1)));
  voucherState.detailQuantity = quantity;
  const totalPrice = Number(product.price || 0) * quantity;
  voucherElements.detailView.innerHTML = `
    <div class="voucher-detail-layout">
      <button type="button" class="ghost-btn" data-voucher-screen="catalog">← Kembali ke katalog</button>
      <div class="voucher-detail-hero">
        <div class="voucher-product-image-wrap voucher-detail-image">
          ${buildVoucherCountdownBadge(ready)}
          <img src="${voucherEscapeHtml(product.displayImage)}" alt="${voucherEscapeHtml(product.name)}" />
        </div>
        <div class="voucher-detail-copy">
          <p class="eyebrow">Detail produk</p>
          <h3>${voucherEscapeHtml(product.name)}</h3>
          <span class="${voucherReadyChipClass(ready)}">${voucherEscapeHtml(buildVoucherReadyLabel(ready))}</span>
          <p class="voucher-product-price">${voucherFormatCurrency(product.price)} <span class="mini-note">/ pcs</span></p>
          <div class="voucher-detail-description">
            <h4>Keterangan produk</h4>
            <p>${voucherEscapeHtml(product.description || "Produk digital RekberWE.id")}</p>
          </div>
          ${product.requiresAccountLogin ? `<p class="mini-note voucher-login-note">Setelah pembayaran, Anda akan diminta mengisi email & password akun di ruang chat.</p>` : ""}
          <p class="mini-note voucher-ready-note">${voucherEscapeHtml(ready.scheduleLabel || "")}</p>
        </div>
      </div>
      <section class="voucher-detail-purchase card">
        <div class="voucher-qty-control">
          <span class="voucher-qty-label-text">Jumlah pembelian (pcs)</span>
          <div class="voucher-qty-stepper" role="group" aria-label="Jumlah pembelian">
            <button type="button" class="voucher-qty-step-btn" data-voucher-qty-minus aria-label="Kurangi jumlah" ${quantity <= 1 ? "disabled" : ""}>−</button>
            <input type="text" id="voucher-detail-quantity" class="voucher-qty-value" value="${quantity}" readonly inputmode="numeric" aria-live="polite" />
            <button type="button" class="voucher-qty-step-btn" data-voucher-qty-plus aria-label="Tambah jumlah" ${quantity >= maxQty ? "disabled" : ""}>+</button>
          </div>
        </div>
        <p class="voucher-detail-total">Total bayar: <strong id="voucher-detail-total">${voucherFormatCurrency(totalPrice)}</strong></p>
        <button type="button" class="primary-btn" data-voucher-confirm-buy="${product.id}" ${ready.canPurchase ? "" : "disabled"}>
          ${ready.canPurchase ? "Beli" : (ready.label || "Belum Ready")}
        </button>
      </section>
    </div>
  `;
  startVoucherCatalogCountdowns();
}

async function createVoucherOrderForProduct(product, options = {}) {
  const quantity = Math.max(1, Number(options.quantity || 1));
  const payload = await voucherFetchJson("/api/voucher/orders", {
    method: "POST",
    body: JSON.stringify({
      productId: product.id,
      quantity,
    }),
  });
  voucherState.activeOrder = payload.order;
  voucherState.orders.unshift(payload.order);
  renderVoucherCheckout(payload.order);
  openVoucherScreen("checkout");
  renderVoucherOrdersSidebar();
}

async function startVoucherCheckout(productId) {
  openVoucherProductDetail(productId);
}

async function confirmVoucherPurchase(productId) {
  const product = voucherState.products.find((item) => item.id === Number(productId))
    || voucherState.detailProduct;
  if (!product) return;
  const maxQty = getVoucherMaxQuantity(product);
  const quantity = Math.max(1, Math.min(maxQty, Number(voucherState.detailQuantity || 1)));
  try {
    await createVoucherOrderForProduct(product, { quantity });
  } catch (error) {
    window.setAuthStatus?.(error.message || "Gagal membuat order.", true);
  }
}

function renderVoucherCheckout(order) {
  if (!voucherElements.checkoutView || !order) return;
  voucherElements.checkoutView.innerHTML = `
    <div class="section-head">
      <p class="eyebrow">Pembayaran</p>
      <h3>${voucherEscapeHtml(order.product?.name || "Order Voucher")}</h3>
      <p class="mini-note">Kode order: <strong>${voucherEscapeHtml(order.orderCode)}</strong></p>
    </div>
    ${buildVoucherAwaitingPaymentBody(order, {
      formId: "voucher-payment-proof-form",
      inputId: "voucher-payment-proof-input",
      showBackButton: true,
      showMessages: false,
    })}
  `;
}

function buildVoucherPaymentBankMarkup(payment = {}) {
  return `
    <article class="voucher-checkout-card">
      <h4>Transfer ke rekening admin</h4>
      <p><strong>${voucherEscapeHtml(payment.bankName || "-")}</strong></p>
      <div class="voucher-bank-number-row">
        <p class="voucher-bank-number">${voucherEscapeHtml(payment.bankNumber || "-")}</p>
        ${payment.bankNumber ? `
          <button type="button" class="voucher-copy-btn voucher-bank-copy-btn" data-voucher-copy-bank="${voucherEscapeHtml(payment.bankNumber)}">Copy</button>
          <span class="voucher-copy-feedback" hidden>Sudah di copy</span>
        ` : ""}
      </div>
      <p>a.n ${voucherEscapeHtml(payment.bankHolder || "-")}</p>
      ${payment.qrisUrl ? `<p><a href="${voucherEscapeHtml(payment.qrisUrl)}" target="_blank" rel="noreferrer">Buka QRIS</a></p>` : ""}
      <pre class="voucher-payment-instructions">${voucherEscapeHtml(payment.instructions || "")}</pre>
    </article>
  `;
}

function buildVoucherAwaitingPaymentBody(order, options = {}) {
  const payment = voucherState.paymentSettings || {};
  const quantity = Math.max(1, Number(order.quantity || 1));
  const unitPrice = quantity ? Math.round(Number(order.price || 0) / quantity) : Number(order.price || 0);
  const formId = options.formId || "voucher-payment-proof-form";
  const inputId = options.inputId || "voucher-payment-proof-input";
  const showBackButton = options.showBackButton === true;
  const showMessages = options.showMessages !== false;
  return `
    ${showMessages ? `
      <div class="voucher-chat-box voucher-awaiting-payment-messages">
        ${(order.messages || []).map(renderVoucherMessageItem).join("")}
      </div>
    ` : ""}
    <div class="voucher-awaiting-payment-actions">
      <button type="button" class="primary-btn" data-voucher-scroll-payment>Lanjutkan pembayaran</button>
      <button type="button" class="ghost-btn voucher-chat-action-btn" data-voucher-cancel="${voucherEscapeHtml(order.orderCode)}">Batalkan transaksi</button>
    </div>
    <div class="voucher-payment-section" id="voucher-payment-section">
      <div class="voucher-checkout-grid">
        <article class="voucher-checkout-card">
          <h4>Detail order</h4>
          <p><strong>${voucherEscapeHtml(order.product?.name || "-")}</strong></p>
          <p class="mini-note">${quantity} pcs × ${voucherFormatCurrency(unitPrice)}</p>
          <p class="voucher-product-price">Total: ${voucherFormatCurrency(order.price)}</p>
          <p class="mini-note">${voucherEscapeHtml(order.product?.description || "")}</p>
        </article>
        ${buildVoucherPaymentBankMarkup(payment)}
      </div>
      <form id="${voucherEscapeHtml(formId)}" class="profile-form voucher-payment-proof-form">
        <label>
          Upload bukti pembayaran
          <input type="file" id="${voucherEscapeHtml(inputId)}" name="paymentProof" accept="image/jpeg,image/png,image/webp,application/pdf" required />
        </label>
        <p class="mini-note">Setelah bukti terkirim, Anda akan masuk ke ruang chat untuk melengkapi data akun (jika diperlukan).</p>
        <div class="topbar-actions">
          ${showBackButton ? `<button type="button" class="ghost-btn" data-voucher-screen="catalog">Kembali ke katalog</button>` : ""}
          <button type="submit" class="primary-btn">Kirim bukti pembayaran</button>
        </div>
      </form>
    </div>
  `;
}

function buildVoucherAwaitingPaymentMarkup(order, options = {}) {
  return `
    <section class="voucher-chat-layout voucher-awaiting-payment-layout">
      <div class="voucher-chat-head">
        <div>
          <p class="eyebrow">Order ${voucherEscapeHtml(order.orderCode)}</p>
          <h3>${voucherEscapeHtml(order.product?.name || "Voucher")}</h3>
          <p class="mini-note">${Math.max(1, Number(order.quantity || 1))} pcs • ${voucherFormatCurrency(order.price)}</p>
          <span class="${voucherStatusClass(order.status)}">${voucherEscapeHtml(order.statusLabel || order.status)}</span>
        </div>
      </div>
      ${buildVoucherAwaitingPaymentBody(order, options)}
    </section>
  `;
}

async function ensureVoucherPaymentSettings() {
  if (voucherState.paymentSettings?.bankNumber || voucherState.paymentSettings?.bankName) return;
  const payload = await voucherFetchJson("/api/config");
  voucherState.paymentSettings = payload.voucherPayment || {};
}

function renderVoucherOrdersPage() {
  if (!voucherElements.ordersView) return;
  voucherElements.ordersView.innerHTML = `
    <div class="section-head">
      <p class="eyebrow">Riwayat</p>
      <h3>Order Voucher / Gametime</h3>
    </div>
    <div class="activity-list">
      ${voucherState.orders.map((order) => `
        <article class="activity-item voucher-order-card">
          <div>
            <strong>${voucherEscapeHtml(order.product?.name || order.orderCode)}</strong>
            <p class="mini-note">${voucherEscapeHtml(order.orderCode)} • ${voucherFormatCurrency(order.price)}</p>
            <span class="${voucherStatusClass(order.status)}">${voucherEscapeHtml(order.statusLabel || order.status)}</span>
          </div>
          <div class="voucher-order-card-actions">
            ${order.status === "awaiting_payment"
    ? `<button type="button" class="primary-btn" data-voucher-open-chat="${voucherEscapeHtml(order.orderCode)}">Lanjutkan pembayaran</button>`
    : `<button type="button" class="ghost-btn" data-voucher-open-chat="${voucherEscapeHtml(order.orderCode)}">Chat / Detail</button>`}
            ${["awaiting_payment", "awaiting_confirmation", "processing"].includes(order.status)
    ? `<button type="button" class="ghost-btn" data-voucher-cancel="${voucherEscapeHtml(order.orderCode)}">Batalkan</button>`
    : ""}
            ${["processing", "needs_verification", "completed"].includes(order.status)
    ? `<button type="button" class="ghost-btn" data-voucher-dispute="${voucherEscapeHtml(order.orderCode)}">Ajukan Sengketa</button>`
    : ""}
          </div>
        </article>
      `).join("") || "<p class='mini-note'>Belum ada order voucher.</p>"}
    </div>
    <button type="button" class="ghost-btn" data-voucher-screen="catalog">Kembali ke katalog</button>
  `;
}

function renderVoucherMessageItem(message) {
  const isAdmin = message.senderRole === "admin";
  const attachment = message.attachmentUrl
    ? (String(message.attachmentType || "").startsWith("image/")
      ? `<a href="${voucherEscapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer"><img class="voucher-chat-image" src="${voucherEscapeHtml(message.attachmentUrl)}" alt="${voucherEscapeHtml(message.attachmentName || "Lampiran")}" /></a>`
      : `<a href="${voucherEscapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer">${voucherEscapeHtml(message.attachmentName || "Lihat lampiran")}</a>`)
    : "";
  return `
    <article class="voucher-chat-message ${isAdmin ? "is-admin" : "is-user"}">
      <div class="voucher-chat-meta">
        <strong>${voucherEscapeHtml(message.senderName || (isAdmin ? "Admin" : "Anda"))}</strong>
        <span>${voucherEscapeHtml(formatVoucherDateTime(message.time))}</span>
      </div>
      ${message.text ? `<p>${voucherEscapeHtml(message.text)}</p>` : ""}
      ${attachment}
    </article>
  `;
}

function renderVoucherChat() {
  const order = voucherState.activeOrder;
  if (!voucherElements.chatView || !order) return;
  voucherElements.chatView.innerHTML = buildVoucherChatMarkup(order, {
    backButton: '<button type="button" class="ghost-btn" data-voucher-screen="catalog">← Kembali ke katalog</button>',
    chatBoxId: "voucher-chat-box",
    formId: "voucher-chat-form",
    inputId: "voucher-chat-input",
    uploadId: "voucher-chat-upload",
  });
  const box = document.getElementById("voucher-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  if (order.accountRevisionRequested) {
    window.requestAnimationFrame(() => {
      document.querySelector("#voucher-chat-view .voucher-account-forms-card.is-revision")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function buildVoucherChatMarkup(order, options = {}) {
  const canChat = ["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status);
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing"].includes(order.status);
  const showAccountForms = shouldShowVoucherAccountForm(order) && canChat;
  const chatBoxId = options.chatBoxId || "voucher-chat-box";
  const formId = options.formId || "voucher-chat-form";
  const inputId = options.inputId || "voucher-chat-input";
  const uploadId = options.uploadId || "voucher-chat-upload";
  const accountsFormId = options.accountsFormId || "voucher-accounts-form";
  const backButton = options.backButton || "";
  return `
    <section class="voucher-chat-layout">
    <div class="voucher-chat-head">
      ${backButton}
      <div>
        <p class="eyebrow">Order ${voucherEscapeHtml(order.orderCode)}</p>
        <h3>${voucherEscapeHtml(order.product?.name || "Voucher")}</h3>
        <p class="mini-note">${Math.max(1, Number(order.quantity || 1))} pcs • ${voucherFormatCurrency(order.price)}</p>
        <span class="${voucherStatusClass(order.status)}">${voucherEscapeHtml(order.statusLabel || order.status)}</span>
      </div>
    </div>
    <div class="voucher-chat-box" id="${voucherEscapeHtml(chatBoxId)}">
      ${(order.messages || []).map(renderVoucherMessageItem).join("")}
    </div>
    ${showAccountForms ? buildVoucherAccountFormsMarkup(order, { formId: accountsFormId }) : ""}
    ${canChat ? `
      <div class="voucher-chat-compose">
        <form id="${voucherEscapeHtml(formId)}" class="voucher-chat-form">
          <div class="voucher-chat-compose-row">
            <label class="voucher-chat-attach-btn" title="Lampirkan gambar">
              <input type="file" id="${voucherEscapeHtml(uploadId)}" accept="image/jpeg,image/png,image/webp" multiple hidden />
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true"><path d="M12 5v10M8 9l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              <span class="voucher-chat-attach-label">File</span>
            </label>
            <input type="text" id="${voucherEscapeHtml(inputId)}" class="voucher-chat-input" placeholder="Tulis pesan ke admin..." autocomplete="off" />
            <button type="submit" class="primary-btn voucher-chat-send-btn">Kirim</button>
          </div>
        </form>
        <div class="voucher-chat-actions">
          ${canCancel ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-voucher-cancel="${voucherEscapeHtml(order.orderCode)}">Batalkan</button>` : ""}
          ${["processing", "needs_verification", "completed"].includes(order.status)
    ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-voucher-dispute="${voucherEscapeHtml(order.orderCode)}">Sengketa</button>`
    : ""}
        </div>
      </div>
    ` : `<p class="mini-note voucher-chat-waiting">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`}
    </section>
  `;
}

function renderVoucherHistoryRoom(order) {
  const container = document.getElementById("voucher-history-room");
  if (!container || !order) return;
  voucherState.activeOrder = order;
  voucherState.historyRoomOrderCode = order.orderCode;
  if (order.status === "awaiting_payment") {
    ensureVoucherPaymentSettings()
      .then(() => {
        container.innerHTML = buildVoucherAwaitingPaymentMarkup(order, {
          formId: "voucher-history-payment-proof-form",
          inputId: "voucher-history-payment-proof-input",
          showMessages: true,
        });
      })
      .catch(() => {
        container.innerHTML = buildVoucherAwaitingPaymentMarkup(order, {
          formId: "voucher-history-payment-proof-form",
          inputId: "voucher-history-payment-proof-input",
          showMessages: true,
        });
      });
    return;
  }
  container.innerHTML = buildVoucherChatMarkup(order, {
    chatBoxId: "voucher-history-chat-box",
    formId: "voucher-history-chat-form",
    inputId: "voucher-history-chat-input",
    uploadId: "voucher-history-chat-upload",
    accountsFormId: "voucher-history-accounts-form",
  });
  const box = document.getElementById("voucher-history-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  if (order.accountRevisionRequested) {
    window.requestAnimationFrame(() => {
      document.querySelector("#voucher-history-room .voucher-account-forms-card.is-revision")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

async function openVoucherOrderChat(orderCode) {
  const payload = await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
  voucherState.activeOrder = payload.order;
  if (payload.order.status === "awaiting_payment") {
    renderVoucherCheckout(payload.order);
    openVoucherScreen("checkout");
    return;
  }
  renderVoucherChat();
  openVoucherScreen("chat");
  window.markUserVoucherOrderSeen?.(payload.order);
}

async function submitVoucherAccounts(event, options = {}) {
  event.preventDefault();
  const order = voucherState.activeOrder;
  if (!order) return;
  const form = event.target;
  const quantity = Math.max(1, Number(order.quantity || 1));
  const wasRevision = Boolean(order.accountRevisionRequested);
  const accounts = Array.from({ length: quantity }, (_, index) => ({
    email: String(form.querySelector(`[name="account_email_${index}"]`)?.value || "").trim(),
    password: String(form.querySelector(`[name="account_password_${index}"]`)?.value || "").trim(),
  }));
  const payload = await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}/accounts`, {
    method: "POST",
    body: JSON.stringify({ accounts }),
  });
  voucherState.activeOrder = payload.order;
  await refreshVoucherData();
  refreshActiveVoucherChatView();
  window.refreshUserTransactionHistory?.();
  window.setAuthStatus?.(wasRevision ? "Perbaikan data akun berhasil dikirim ke admin." : "Data akun berhasil dikirim ke admin.");
}

async function submitVoucherPaymentProof(event) {
  event.preventDefault();
  const form = event.target;
  const fileInput = form.querySelector('input[type="file"]');
  const file = fileInput?.files?.[0];
  if (!file || !voucherState.activeOrder) return;
  const formData = new FormData();
  formData.append("paymentProof", file);
  const response = await fetch(`/api/voucher/orders/${encodeURIComponent(voucherState.activeOrder.orderCode)}/payment-proof`, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Upload bukti gagal.");
  voucherState.activeOrder = payload.order;
  await refreshVoucherData();
  const inHistoryRoom = voucherState.historyRoomOrderCode === payload.order.orderCode;
  if (inHistoryRoom) {
    refreshActiveVoucherChatView();
    window.syncHistoryVoucherOrder?.(payload.order);
  } else {
    renderVoucherChat();
    openVoucherScreen("chat");
  }
  window.markUserVoucherOrderSeen?.(payload.order);
  window.refreshUserTransactionHistory?.();
  window.setAuthStatus?.("Bukti pembayaran terkirim. Lengkapi data akun di ruang chat jika diperlukan.");
}

function refreshActiveVoucherChatView() {
  const order = voucherState.activeOrder;
  if (!order) return;
  const historyRoom = document.getElementById("voucher-history-room");
  if (voucherState.historyRoomOrderCode === order.orderCode && historyRoom && !historyRoom.classList.contains("hidden")) {
    renderVoucherHistoryRoom(order);
    window.syncHistoryVoucherOrder?.(order);
    return;
  }
  if (voucherState.screen === "chat") renderVoucherChat();
}

async function submitVoucherChatMessage(event, options = {}) {
  event.preventDefault();
  const order = voucherState.activeOrder;
  if (!order) return;
  const inputId = options.inputId || "voucher-chat-input";
  const uploadId = options.uploadId || "voucher-chat-upload";
  const text = String(document.getElementById(inputId)?.value || "").trim();
  const files = Array.from(document.getElementById(uploadId)?.files || []);
  if (!text && !files.length) return;
  if (text) {
    await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }
  if (files.length) {
    const formData = new FormData();
    files.forEach((file) => formData.append("chatFiles", file));
    const response = await fetch(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}/uploads`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Upload chat gagal.");
    voucherState.activeOrder = payload.order;
  } else {
    const payload = await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}`);
    voucherState.activeOrder = payload.order;
  }
  refreshActiveVoucherChatView();
  window.refreshUserTransactionHistory?.();
}

async function runVoucherOrderAction(orderCode, action) {
  let note = "";
  if (action === "dispute" || action === "cancel") {
    note = await window.openPromptModal?.(
      action === "dispute" ? "Ajukan sengketa" : "Batalkan order",
      {
        eyebrow: action === "dispute" ? "Sengketa" : "Pembatalan",
        label: action === "dispute" ? "Alasan sengketa" : "Alasan pembatalan",
        placeholder: action === "dispute" ? "Jelaskan masalah pada order ini..." : "Jelaskan alasan pembatalan...",
      },
    ) || "";
    if (!note.trim()) return;
  }
  const payload = await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
  voucherState.activeOrder = payload.order;
  await refreshVoucherData();
  refreshActiveVoucherChatView();
  if (voucherState.screen === "orders") renderVoucherOrdersPage();
  window.refreshUserTransactionHistory?.();
  window.setAuthStatus?.(`Status order diperbarui: ${payload.statusLabel || payload.order.status}`);
}

function bindVoucherEvents() {
  voucherElements.serviceButtons.forEach((button) => {
    button.addEventListener("click", () => setWorkspaceService(button.dataset.workspaceService));
  });

  document.addEventListener("input", (event) => {
    if (event.target?.id === "voucher-catalog-search") {
      voucherState.catalogSearchQuery = String(event.target.value || "");
      clearTimeout(voucherCatalogSearchTimer);
      voucherCatalogSearchTimer = setTimeout(() => {
        renderVoucherCatalog({ preserveSearchFocus: true });
      }, 150);
      return;
    }
  });

  document.addEventListener("search", (event) => {
    if (event.target?.id !== "voucher-catalog-search") return;
    voucherState.catalogSearchQuery = String(event.target.value || "");
    clearTimeout(voucherCatalogSearchTimer);
    renderVoucherCatalog({ preserveSearchFocus: true });
  });

  document.addEventListener("keydown", async (event) => {
    if (event.target?.id === "voucher-catalog-search") {
      event.stopPropagation();
      return;
    }
    const card = event.target.closest(".voucher-product-card.is-clickable[data-voucher-buy]");
    if (!card || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    await startVoucherCheckout(card.dataset.voucherBuy);
  });

  document.addEventListener("click", async (event) => {
    if (event.target.closest("#voucher-catalog-search, .voucher-catalog-toolbar")) {
      return;
    }
    const buyButton = event.target.closest("[data-voucher-buy]");
    if (buyButton) {
      await startVoucherCheckout(buyButton.dataset.voucherBuy);
      return;
    }
    const confirmBuyButton = event.target.closest("[data-voucher-confirm-buy]");
    if (confirmBuyButton) {
      await confirmVoucherPurchase(confirmBuyButton.dataset.voucherConfirmBuy);
      return;
    }
    const qtyMinusButton = event.target.closest("[data-voucher-qty-minus]");
    if (qtyMinusButton) {
      setVoucherDetailQuantity(Number(voucherState.detailQuantity || 1) - 1);
      return;
    }
    const qtyPlusButton = event.target.closest("[data-voucher-qty-plus]");
    if (qtyPlusButton) {
      setVoucherDetailQuantity(Number(voucherState.detailQuantity || 1) + 1);
      return;
    }
    const bankCopyButton = event.target.closest("[data-voucher-copy-bank]");
    if (bankCopyButton) {
      try {
        await copyVoucherBankNumber(bankCopyButton);
      } catch (error) {
        window.setAuthStatus?.(error.message || "Gagal menyalin nomor rekening.", true);
      }
      return;
    }
    const screenButton = event.target.closest("[data-voucher-screen]");
    if (screenButton) {
      const screen = screenButton.dataset.voucherScreen;
      if (screen === "orders") renderVoucherOrdersPage();
      openVoucherScreen(screen);
      return;
    }
    const openChatButton = event.target.closest("[data-voucher-open-chat]");
    if (openChatButton) {
      await openVoucherOrderChat(openChatButton.dataset.voucherOpenChat);
      return;
    }
    const orderSidebarButton = event.target.closest("[data-voucher-order]");
    if (orderSidebarButton) {
      await openVoucherOrderChat(orderSidebarButton.dataset.voucherOrder);
      return;
    }
    const cancelButton = event.target.closest("[data-voucher-cancel]");
    if (cancelButton) {
      await runVoucherOrderAction(cancelButton.dataset.voucherCancel, "cancel");
      return;
    }
    const disputeButton = event.target.closest("[data-voucher-dispute]");
    if (disputeButton) {
      await runVoucherOrderAction(disputeButton.dataset.voucherDispute, "dispute");
      return;
    }
    const scrollPaymentButton = event.target.closest("[data-voucher-scroll-payment]");
    if (scrollPaymentButton) {
      document.getElementById("voucher-payment-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      const fileInput = document.getElementById("voucher-history-payment-proof-input")
        || document.getElementById("voucher-payment-proof-input");
      window.requestAnimationFrame(() => fileInput?.focus());
    }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target?.id === "voucher-payment-proof-form" || event.target?.id === "voucher-history-payment-proof-form") {
      event.preventDefault();
      try {
        await submitVoucherPaymentProof(event);
      } catch (error) {
        window.setAuthStatus?.(error.message || "Gagal mengirim bukti pembayaran.", true);
      }
      return;
    }
    if (event.target?.id === "voucher-accounts-form" || event.target?.id === "voucher-history-accounts-form") {
      event.preventDefault();
      try {
        await submitVoucherAccounts(event);
      } catch (error) {
        window.setAuthStatus?.(error.message || "Gagal mengirim data akun.", true);
      }
      return;
    }
    if (event.target?.id === "voucher-chat-form") {
      event.preventDefault();
      try {
        await submitVoucherChatMessage(event);
      } catch (error) {
        window.setAuthStatus?.(error.message || "Gagal mengirim pesan.", true);
      }
      return;
    }
    if (event.target?.id === "voucher-history-chat-form") {
      event.preventDefault();
      try {
        await submitVoucherChatMessage(event, {
          inputId: "voucher-history-chat-input",
          uploadId: "voucher-history-chat-upload",
        });
      } catch (error) {
        window.setAuthStatus?.(error.message || "Gagal mengirim pesan.", true);
      }
    }
  });
}

function handleVoucherLiveEvent(payload) {
  if (payload?.type !== "voucher_order_updated") return;

  if (payload.deleted) {
    const code = String(payload.orderCode || payload.code || "").trim().toUpperCase();
    if (!code) return;
    voucherState.orders = voucherState.orders.filter((item) => item.orderCode !== code);
    if (voucherState.activeOrder?.orderCode === code) {
      voucherState.activeOrder = null;
    }
    if (voucherState.historyRoomOrderCode === code) {
      voucherState.historyRoomOrderCode = "";
      const historyRoom = document.getElementById("voucher-history-room");
      if (historyRoom) historyRoom.innerHTML = "";
    }
    renderVoucherOrdersSidebar();
    if (voucherState.screen === "orders") renderVoucherOrdersPage();
    if (voucherState.screen === "chat") openVoucherScreen("orders");
    window.refreshUserTransactionHistory?.();
    return;
  }

  if (!payload.order) return;
  const index = voucherState.orders.findIndex((item) => item.orderCode === payload.order.orderCode);
  if (index >= 0) voucherState.orders[index] = payload.order;
  else voucherState.orders.unshift(payload.order);
  if (voucherState.activeOrder?.orderCode === payload.order.orderCode) {
    voucherState.activeOrder = payload.order;
    refreshActiveVoucherChatView();
  }
  renderVoucherOrdersSidebar();
  if (voucherState.screen === "orders") renderVoucherOrdersPage();
  window.refreshUserTransactionHistory?.();
}

window.RekberVoucher = {
  init(currentUser) {
    if (!currentUser) return;
    bindVoucherEvents();
    setWorkspaceService("rekber");
  },
  refresh: refreshVoucherData,
  handleLiveEvent: handleVoucherLiveEvent,
  openService: setWorkspaceService,
  getOrders() {
    return Array.isArray(voucherState.orders) ? [...voucherState.orders] : [];
  },
  openOrder(orderCode) {
    return openVoucherOrderChat(orderCode);
  },
  renderHistoryRoom(order) {
    return renderVoucherHistoryRoom(order);
  },
  ensurePaymentSettings: ensureVoucherPaymentSettings,
  clearHistoryRoom() {
    voucherState.historyRoomOrderCode = "";
  },
};
