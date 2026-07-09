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
  creatingOrder: false,
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

function voucherLinkifyText(text) {
  const source = String(text || "");
  const pattern = /(?:https?:\/\/|www\.)[^\s<]+[^\s.,;:!?)\]}"']/gi;
  let result = "";
  let lastIndex = 0;
  let match = pattern.exec(source);
  while (match) {
    result += voucherEscapeHtml(source.slice(lastIndex, match.index));
    const rawUrl = match[0];
    const href = /^www\./i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
    if (/^https?:\/\//i.test(href)) {
      result += `<a href="${voucherEscapeHtml(href)}" target="_blank" rel="noreferrer noopener">${voucherEscapeHtml(rawUrl)}</a>`;
    } else {
      result += voucherEscapeHtml(rawUrl);
    }
    lastIndex = pattern.lastIndex;
    match = pattern.exec(source);
  }
  result += voucherEscapeHtml(source.slice(lastIndex));
  return result;
}

function voucherFormatMultiline(value, fallback = "") {
  const text = String(value || "").trim() || fallback;
  return voucherLinkifyText(text).replace(/\r?\n/g, "<br>");
}

function bindFileUploadFields(root = document) {
  root.querySelectorAll('input[type="file"]').forEach((input) => {
    if (input.dataset.uploadUiBound === "1") return;
    input.dataset.uploadUiBound = "1";
    const label = input.closest("label");
    if (!label) return;
    label.classList.add("file-upload-field");
    const attachLabel = label.querySelector(".voucher-chat-attach-label");
    const syncHint = () => {
      const files = input.multiple
        ? Array.from(input.files || [])
        : [input.files?.[0]].filter(Boolean);
      if (attachLabel && input.hidden) {
        attachLabel.textContent = files.length ? `${files.length} file` : "File";
        label.classList.toggle("has-file", files.length > 0);
        return;
      }
      let hint = label.querySelector(".file-upload-hint");
      if (!hint) {
        hint = document.createElement("span");
        hint.className = "file-upload-hint mini-note";
        hint.textContent = "Belum ada file dipilih";
        input.insertAdjacentElement("afterend", hint);
      }
      hint.textContent = files.length
        ? (files.length === 1 ? files[0].name : `${files.length} file dipilih`)
        : (input.dataset.emptyHint || "Belum ada file dipilih");
      label.classList.toggle("has-file", files.length > 0);
    };
    input.addEventListener("change", syncHint);
    syncHint();
  });
}

function resetFileUploadInput(input) {
  if (!input) return;
  input.value = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const VOUCHER_STATUS_RANK = {
  cancelled: 0,
  awaiting_payment: 1,
  awaiting_confirmation: 2,
  processing: 3,
  needs_verification: 4,
  dispute: 4,
  completed: 5,
  manual_pending: 1,
};

function getVoucherStatusRank(status) {
  return VOUCHER_STATUS_RANK[String(status || "")] ?? 0;
}

function preferResolvedAttachmentUrl(incomingUrl = "", currentUrl = "") {
  const incoming = String(incomingUrl || "").trim();
  const current = String(currentUrl || "").trim();
  if (!incoming) return current;
  if (!current) return incoming;
  if (incoming.startsWith("http") && current.startsWith("cloudinary-private:")) return incoming;
  if (current.startsWith("http") && incoming.startsWith("cloudinary-private:")) return current;
  return incoming;
}

function mergeVoucherMessages(currentMessages = [], incomingMessages = []) {
  if (incomingMessages.length > currentMessages.length) return incomingMessages;
  if (incomingMessages.length < currentMessages.length) return currentMessages;
  return incomingMessages.map((message, index) => {
    const previous = currentMessages[index];
    if (!previous) return message;
    return {
      ...message,
      attachmentUrl: preferResolvedAttachmentUrl(message.attachmentUrl, previous.attachmentUrl),
    };
  });
}

function mergeVoucherOrderPreservingMessages(current, incoming) {
  if (!incoming) return current;
  if (!current || current.orderCode !== incoming.orderCode) return incoming;
  const currentMessages = Array.isArray(current.messages) ? current.messages : [];
  const incomingMessages = Array.isArray(incoming.messages) ? incoming.messages : [];
  const currentRank = getVoucherStatusRank(current.status);
  const incomingRank = getVoucherStatusRank(incoming.status);
  const useIncomingStatus = incomingRank >= currentRank;
  const merged = {
    ...incoming,
    status: useIncomingStatus ? incoming.status : current.status,
    statusLabel: useIncomingStatus ? incoming.statusLabel : current.statusLabel,
    paymentProofUrl: preferResolvedAttachmentUrl(incoming.paymentProofUrl, current.paymentProofUrl),
    messages: mergeVoucherMessages(currentMessages, incomingMessages),
  };
  return merged;
}

function isVoucherHistoryRoomActive(orderCode = "") {
  const historyRoom = document.getElementById("voucher-history-room");
  const normalized = String(orderCode || voucherState.activeOrder?.orderCode || "").trim().toUpperCase();
  return Boolean(
    normalized
    && voucherState.historyRoomOrderCode === normalized
    && historyRoom
    && !historyRoom.classList.contains("hidden"),
  );
}

const VOUCHER_ASSET_VERSION = "20260709b";

function goToVoucherChatroom(orderCode, options = {}) {
  const code = String(orderCode || "").trim().toUpperCase();
  if (!code) return;
  const url = window.VoucherUploadBridge?.buildChatroomUrl(code, options)
    || `/chatroom/${encodeURIComponent(code)}${options.upload ? "?upload=1" : ""}`;
  window.location.assign(url);
}

async function navigateToVoucherChatAfterPayment(order, options = {}) {
  if (!order) return;
  voucherState.activeOrder = order;
  const index = voucherState.orders.findIndex((item) => item.orderCode === order.orderCode);
  if (index >= 0) voucherState.orders[index] = order;
  else voucherState.orders.unshift(order);

  if (options.isReplaceForm) {
    refreshVoucherActiveOrderView();
    return;
  }

  if (isVoucherHistoryRoomActive(order.orderCode)) {
    renderVoucherHistoryRoom(order);
    window.syncHistoryVoucherOrder?.(order);
    return;
  }

  if (typeof window.openHistoryVoucherRoom === "function") {
    await window.openHistoryVoucherRoom(order.orderCode);
    return;
  }

  renderVoucherChat();
  openVoucherScreen("chat");
}

function voucherUploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.responseType = "text";
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress?.(percent);
    });
    xhr.addEventListener("load", () => {
      let payload = {};
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload);
        return;
      }
      reject(new Error(payload.message || "Upload bukti gagal."));
    });
    xhr.addEventListener("error", () => reject(new Error("Koneksi upload terputus.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload dibatalkan.")));
    xhr.send(formData);
  });
}

function setVoucherPaymentUploadProgress(container, message, percent = 0, state = "uploading", detail = "Menyiapkan file...") {
  if (!container) return;
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  container.classList.remove("hidden", "upload-progress-done", "upload-progress-error");
  if (state === "done") container.classList.add("upload-progress-done");
  if (state === "error") container.classList.add("upload-progress-error");
  const label = container.querySelector(".voucher-payment-upload-label");
  const value = container.querySelector(".voucher-payment-upload-value");
  const detailEl = container.querySelector(".voucher-payment-upload-detail");
  const bar = container.querySelector(".voucher-payment-upload-bar");
  if (label) label.innerHTML = `<span class="upload-spinner"></span>${voucherEscapeHtml(message)}`;
  if (value) value.textContent = `${normalized}%`;
  if (detailEl) detailEl.textContent = detail;
  if (bar) bar.style.width = `${normalized}%`;
}

function hideVoucherPaymentUploadProgress(container) {
  if (!container) return;
  container.classList.add("hidden");
  container.classList.remove("upload-progress-done", "upload-progress-error");
  const bar = container.querySelector(".voucher-payment-upload-bar");
  if (bar) bar.style.width = "0%";
}

function buildVoucherPaymentUploadProgressMarkup() {
  return `
    <div class="upload-progress hidden voucher-payment-upload-progress" aria-live="polite">
      <div class="upload-progress-top">
        <strong class="voucher-payment-upload-label"><span class="upload-spinner"></span>Sedang upload bukti...</strong>
        <span class="voucher-payment-upload-value">0%</span>
      </div>
      <p class="upload-progress-detail voucher-payment-upload-detail">Menyiapkan file...</p>
      <div class="upload-progress-track">
        <span class="voucher-payment-upload-bar"></span>
      </div>
    </div>
  `;
}

function renderWorkspaceVoucherSidePanel() {
  document.body.classList.add("workspace-voucher-active");
  const termsHead = document.querySelector("#workspace-side-terms-box h4");
  const termsList = document.getElementById("workspace-terms-list");
  if (termsHead) termsHead.textContent = "Syarat dan ketentuan voucher / gametime";
  const raw = String(voucherState.paymentSettings?.termsAndConditions || "").trim();
  const items = raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (termsList) {
    termsList.innerHTML = items.length
      ? items.map((item) => `<li>${voucherLinkifyText(item)}</li>`).join("")
      : "<li>Syarat voucher belum diatur admin.</li>";
  }
}

function renderWorkspaceRekberSidePanel() {
  document.body.classList.remove("workspace-voucher-active");
  const termsHead = document.querySelector("#workspace-side-terms-box h4");
  if (termsHead) termsHead.textContent = "Syarat dan ketentuan";
  window.renderPublicFeeList?.();
  window.renderTermsAndConditions?.();
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
  await copyVoucherPlainText(text, button);
}

async function copyVoucherPlainText(text, button) {
  const value = String(text || "").trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
  const row = button?.closest(".voucher-bank-number-row, .voucher-pay-code-row, .voucher-pay-bank-number-row");
  const feedback = row?.querySelector(".voucher-copy-feedback");
  if (feedback) feedback.hidden = false;
  if (!button) return;
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

function shouldShowVoucherReplaceProof(order) {
  return Boolean(order?.proofRevisionRequested) && order.status === "awaiting_confirmation";
}

function buildVoucherAccountFormsMarkup(order, options = {}) {
  if (!order?.product?.requiresAccountLogin) return "";
  const isRevision = Boolean(order.accountRevisionRequested);
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  const formId = options.formId || "voucher-accounts-form";
  if (hasVoucherAccountsComplete(order) && !isRevision) {
    return "";
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
    }).finally(() => {
      renderWorkspaceVoucherSidePanel();
    });
  } else {
    renderWorkspaceRekberSidePanel();
  }
}

async function refreshVoucherData(options = {}) {
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
  if (document.body.classList.contains("workspace-voucher-active")) {
    renderWorkspaceVoucherSidePanel();
  }
  if (!options.skipActiveOrderView) {
    const trackedCode = voucherState.activeOrder?.orderCode;
    let latest = trackedCode
      ? voucherState.orders.find((item) => item.orderCode === trackedCode)
      : null;
    if (!latest) {
      latest = voucherState.orders.find((item) =>
        ["awaiting_payment", "awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(item.status),
      );
      if (latest) voucherState.activeOrder = latest;
    }
    if (latest) {
      voucherState.activeOrder = mergeVoucherOrderPreservingMessages(voucherState.activeOrder || latest, latest);
      refreshVoucherActiveOrderView();
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
  const buyNowLabel = window.t?.("voucher.buy_now") || "Beli Sekarang";
  const noMatchLabel = window.t?.("voucher.no_match") || "Tidak ada produk yang cocok dengan pencarian.";
  const noActiveLabel = window.t?.("voucher.no_active") || "Belum ada produk aktif.";
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
        <div class="voucher-product-desc-panel">
          <p class="voucher-product-desc">${voucherFormatMultiline(product.description, "Produk digital RekberWE.id")}</p>
        </div>
        <div class="voucher-product-body">
          <div class="voucher-product-head">
            <h4>${voucherEscapeHtml(product.name)}</h4>
            <span class="${voucherReadyChipClass(ready)}">${voucherEscapeHtml(buildVoucherReadyLabel(ready))}</span>
          </div>
          <p class="voucher-product-price">${voucherFormatCurrency(product.price)}</p>
          <button type="button" class="primary-btn voucher-product-buy-btn" data-voucher-buy="${product.id}" ${disabled ? "disabled" : ""}>
            ${disabled ? voucherEscapeHtml(ready.label || "Belum Ready") : voucherEscapeHtml(buyNowLabel)}
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
          <p class="eyebrow">${voucherEscapeHtml(window.t?.("voucher.catalog_eyebrow") || "Marketplace")}</p>
          <h3>${voucherEscapeHtml(window.t?.("voucher.catalog_title") || "Beli Voucher / Gametime")}</h3>
          <p class="mini-note">${voucherEscapeHtml(window.t?.("voucher.catalog_note") || "Pilih produk digital, transfer ke rekening admin, lalu upload bukti pembayaran.")}</p>
        </div>
        <div class="voucher-catalog-toolbar">
          <input type="search" id="voucher-catalog-search" placeholder="${voucherEscapeHtml(window.t?.("voucher.catalog_search") || "Cari produk voucher / gametime...")}" value="${voucherEscapeHtml(voucherState.catalogSearchQuery)}" autocomplete="off" enterkeyhint="search" />
        </div>
      </div>
      <div class="voucher-catalog-scroll">
        <div class="voucher-product-grid ${gridClass}">${cards || `<p class='mini-note'>${voucherEscapeHtml(voucherState.products.length ? noMatchLabel : noActiveLabel)}</p>`}</div>
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
  const panel = document.getElementById("workspace-voucher-panel");
  if (panel) {
    panel.dataset.voucherScreen = screen;
    ["catalog", "detail", "checkout", "orders", "chat"].forEach((name) => {
      panel.classList.toggle(`is-voucher-screen-${name}`, screen === name);
    });
  }
  if (screen === "detail" || screen === "checkout" || screen === "orders") {
    window.requestAnimationFrame(() => {
      const activeView = {
        detail: voucherElements.detailView,
        checkout: voucherElements.checkoutView,
        orders: voucherElements.ordersView,
      }[screen];
      activeView?.scrollTo?.({ top: 0, behavior: "auto" });
    });
  }
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
        <div class="voucher-detail-media">
          <div class="voucher-product-image-wrap voucher-detail-image">
            ${buildVoucherCountdownBadge(ready)}
            <img src="${voucherEscapeHtml(product.displayImage)}" alt="${voucherEscapeHtml(product.name)}" />
          </div>
          <div class="voucher-detail-copy">
            <p class="eyebrow">Detail produk</p>
            <h3>${voucherEscapeHtml(product.name)}</h3>
            <span class="${voucherReadyChipClass(ready)}">${voucherEscapeHtml(buildVoucherReadyLabel(ready))}</span>
            <p class="voucher-product-price">${voucherFormatCurrency(product.price)} <span class="mini-note">/ pcs</span></p>
            ${product.requiresAccountLogin ? `<p class="mini-note voucher-login-note">Setelah pembayaran, Anda akan diminta mengisi email & password akun di ruang chat.</p>` : ""}
            <p class="mini-note voucher-ready-note">${voucherEscapeHtml(ready.scheduleLabel || "")}</p>
          </div>
          <div class="voucher-detail-description">
            <h4>Keterangan produk</h4>
            <p class="voucher-multiline-text">${voucherFormatMultiline(product.description, "Produk digital RekberWE.id")}</p>
          </div>
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
  if (voucherState.creatingOrder) return;
  voucherState.creatingOrder = true;
  const buyButton = document.querySelector(`[data-voucher-confirm-buy="${product.id}"]`);
  if (buyButton) {
    buyButton.disabled = true;
    buyButton.dataset.voucherBuyBusy = "1";
  }
  try {
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
    window.refreshUserTransactionHistory?.();
  } finally {
    voucherState.creatingOrder = false;
    if (buyButton) {
      delete buyButton.dataset.voucherBuyBusy;
      const ready = product.readyState || {};
      buyButton.disabled = !ready.canPurchase;
    }
  }
}

async function startVoucherCheckout(productId) {
  openVoucherProductDetail(productId);
}

async function confirmVoucherPurchase(productId) {
  if (voucherState.creatingOrder) return;
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
  if (order.status !== "awaiting_payment" && isVoucherChatRoomStatus(order.status)) {
    if (typeof window.openHistoryVoucherRoom === "function") {
      window.openHistoryVoucherRoom(order.orderCode);
    } else {
      goToVoucherChatroom(order.orderCode);
    }
    return;
  }
  voucherElements.checkoutView.innerHTML = buildVoucherAwaitingPaymentMarkup(order, {
    layoutMode: "checkout",
    formId: "voucher-payment-proof-form",
    inputId: "voucher-payment-proof-input",
    showBackToCatalog: true,
    showMessages: false,
  });
  bindFileUploadFields(voucherElements.checkoutView);
}

function buildVoucherReplaceProofMarkup(order, options = {}) {
  if (!shouldShowVoucherReplaceProof(order)) return "";
  const formId = options.formId || "voucher-replace-proof-form";
  const inputId = options.inputId || "voucher-replace-proof-input";
  return `
    <section class="voucher-replace-proof-card voucher-replace-proof-compact">
      <form id="${voucherEscapeHtml(formId)}" class="voucher-replace-proof-form">
        <p class="mini-note voucher-replace-proof-label">Admin meminta ganti bukti transfer. Upload bukti baru di sini.</p>
        <div class="voucher-replace-proof-row">
          <label class="file-upload-field voucher-replace-proof-file">
            <span class="voucher-replace-proof-file-text">Pilih file</span>
            <input type="file" id="${voucherEscapeHtml(inputId)}" name="paymentProof" accept="image/jpeg,image/png,image/webp" required />
            <span class="file-upload-hint mini-note">Belum ada file</span>
          </label>
          <button type="submit" class="ghost-btn voucher-payment-submit-btn">Kirim</button>
        </div>
      </form>
    </section>
  `;
}

function isVoucherChatRoomStatus(status) {
  return ["awaiting_confirmation", "processing", "needs_verification", "dispute", "completed"].includes(status);
}

function refreshVoucherActiveOrderView(options = {}) {
  const order = voucherState.activeOrder;
  if (!order) return;
  if (isVoucherHistoryRoomActive(order.orderCode)) {
    if (order.status === "awaiting_payment") {
      const historyRoom = document.getElementById("voucher-history-room");
      const renderAwaiting = () => {
        historyRoom.innerHTML = buildVoucherAwaitingPaymentMarkup(order, {
          formId: "voucher-history-payment-proof-form",
          inputId: "voucher-history-payment-proof-input",
          showMessages: true,
        });
        bindFileUploadFields(historyRoom);
      };
      ensureVoucherPaymentSettings().then(renderAwaiting).catch(renderAwaiting);
    } else if (isVoucherChatRoomStatus(order.status)) {
      renderVoucherHistoryRoom(order);
    }
    window.syncHistoryVoucherOrder?.(order);
    return;
  }
  if (order.status === "awaiting_payment") {
    if (voucherState.screen === "checkout") renderVoucherCheckout(order);
    return;
  }
  if (!isVoucherChatRoomStatus(order.status)) return;
  if (voucherState.screen === "chat") {
    renderVoucherChat();
    if (options.forceChatScreen) openVoucherScreen("chat");
  }
}

function getVoucherPaymentBanks(payment = {}) {
  if (Array.isArray(payment.banks) && payment.banks.length) return payment.banks;
  if (!payment.bankName && !payment.bankNumber) return [];
  return [{
    id: "bank-1",
    name: payment.bankName || "",
    number: payment.bankNumber || "",
    holder: payment.bankHolder || "",
    logoUrl: payment.bankLogoUrl || "",
  }];
}

function extractVoucherProductRegion(product) {
  const name = String(product?.name || "");
  const regionMatch = name.match(/REGION\s+([A-Za-z0-9][A-Za-z0-9\s-]*)/i);
  if (regionMatch) return regionMatch[1].trim();
  const descLine = String(product?.description || "").trim().split(/\r?\n/).find(Boolean);
  return descLine || "-";
}

function getVoucherPaymentActiveStep(order) {
  const status = String(order?.status || "");
  if (status === "awaiting_payment") return 2;
  if (status === "awaiting_confirmation") return 3;
  if (["processing", "needs_verification", "dispute"].includes(status)) return 4;
  if (status === "completed") return 5;
  return 1;
}

function buildVoucherPaymentStepper(order) {
  const steps = [
    { id: 1, label: "Order Dibuat" },
    { id: 2, label: "Menunggu Pembayaran" },
    { id: 3, label: "Menunggu Konfirmasi" },
    { id: 4, label: "Sedang Diproses" },
    { id: 5, label: "Selesai" },
  ];
  const activeStep = getVoucherPaymentActiveStep(order);
  return `
    <nav class="voucher-pay-stepper" aria-label="Progress order">
      ${steps.map((step) => {
    const state = step.id < activeStep ? "is-done" : step.id === activeStep ? "is-active" : "";
    return `
          <div class="voucher-pay-step ${state}">
            <span class="voucher-pay-step-dot" aria-hidden="true">${step.id < activeStep ? "✓" : step.id}</span>
            <span class="voucher-pay-step-label">${voucherEscapeHtml(step.label)}</span>
          </div>
        `;
  }).join("")}
    </nav>
  `;
}

function buildVoucherPaymentBankCardsMarkup(payment = {}, options = {}) {
  const banks = getVoucherPaymentBanks(payment);
  const copyLabel = options.copyLabel || window.t?.("voucher.copy") || "Salin";
  const copiedLabel = options.copiedLabel || window.t?.("voucher.copied") || "Sudah di copy";
  const holderLabel = options.holderLabel || window.t?.("voucher.account_holder") || "a.n";
  if (!banks.length) {
    return `<p class="mini-note">Rekening pembayaran belum dikonfigurasi admin.</p>`;
  }
  return banks.map((bank) => `
    <article class="voucher-pay-bank-card">
      <div class="voucher-pay-bank-card-top">
        ${bank.logoUrl
    ? `<img class="voucher-pay-bank-logo" src="${voucherEscapeHtml(bank.logoUrl)}" alt="${voucherEscapeHtml(bank.name || "Bank")}" loading="lazy" decoding="async" />`
    : `<span class="voucher-pay-bank-logo-fallback">${voucherEscapeHtml(String(bank.name || "B").slice(0, 3).toUpperCase())}</span>`}
        <div class="voucher-pay-bank-meta">
          <strong>${voucherEscapeHtml(bank.name || "Bank")}</strong>
          <div class="voucher-pay-bank-number-row">
            <span class="voucher-pay-bank-number">${voucherEscapeHtml(bank.number || "-")}</span>
            ${bank.number ? `
              <button type="button" class="voucher-copy-btn voucher-bank-copy-btn" data-voucher-copy-bank="${voucherEscapeHtml(bank.number)}">${voucherEscapeHtml(copyLabel)}</button>
              <span class="voucher-copy-feedback" hidden>${voucherEscapeHtml(copiedLabel)}</span>
            ` : ""}
          </div>
          <p class="voucher-pay-bank-holder">${voucherEscapeHtml(holderLabel)} ${voucherEscapeHtml(bank.holder || "-")}</p>
        </div>
      </div>
    </article>
  `).join("");
}

function buildVoucherPaymentSidebarMarkup(order, payment = {}) {
  const quantity = Math.max(1, Number(order.quantity || 1));
  const unitPrice = quantity ? Math.round(Number(order.price || 0) / quantity) : Number(order.price || 0);
  const infoLines = String(payment.instructions || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const termsLines = String(payment.termsAndConditions || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = [...new Set([...infoLines, ...termsLines])].slice(0, 6);
  return `
    <aside class="voucher-pay-sidebar">
      <section class="voucher-pay-side-card">
        <h4>Informasi Order</h4>
        <dl class="voucher-pay-info-list">
          <div><dt>Kode Transaksi</dt><dd class="voucher-pay-code-row"><span>${voucherEscapeHtml(order.orderCode)}</span>${order.orderCode ? `<button type="button" class="voucher-copy-btn voucher-order-copy-btn" data-voucher-copy-text="${voucherEscapeHtml(order.orderCode)}">Salin</button>` : ""}</dd></div>
          <div><dt>Tanggal dibuat</dt><dd>${voucherEscapeHtml(formatVoucherDateTime(order.createdAt))}</dd></div>
          <div><dt>Produk</dt><dd>${voucherEscapeHtml(order.product?.name || "-")}</dd></div>
          <div><dt>Jumlah</dt><dd>${quantity} pcs</dd></div>
          <div><dt>Harga satuan</dt><dd>${voucherEscapeHtml(voucherFormatCurrency(unitPrice))}</dd></div>
          <div><dt>Total harga</dt><dd>${voucherEscapeHtml(voucherFormatCurrency(order.price))}</dd></div>
          <div><dt>Status</dt><dd><span class="${voucherStatusClass(order.status)}">${voucherEscapeHtml(order.statusLabel || order.status)}</span></dd></div>
        </dl>
      </section>
      <section class="voucher-pay-side-card">
        <h4>Informasi Penting</h4>
        <ul class="voucher-pay-info-bullets">
          ${bullets.length
    ? bullets.map((line) => `<li><span aria-hidden="true">✓</span><span>${voucherEscapeHtml(line)}</span></li>`).join("")
    : `<li><span aria-hidden="true">✓</span><span>Transfer sesuai nominal order.</span></li><li><span aria-hidden="true">✓</span><span>Upload bukti setelah transfer.</span></li>`}
        </ul>
      </section>
      <section class="voucher-pay-side-card voucher-pay-help-card">
        <h4>Butuh Bantuan?</h4>
        <p class="mini-note">Tim support siap membantu proses pembayaran dan order Anda.</p>
        <button type="button" class="primary-btn voucher-pay-support-btn" data-voucher-open-support>Live Chat Sekarang</button>
      </section>
    </aside>
  `;
}

function buildVoucherAwaitingPaymentBody(order, options = {}) {
  const payment = voucherState.paymentSettings || {};
  const quantity = Math.max(1, Number(order.quantity || 1));
  const unitPrice = quantity ? Math.round(Number(order.price || 0) / quantity) : Number(order.price || 0);
  const formId = options.formId || "voucher-payment-proof-form";
  const inputId = options.inputId || "voucher-payment-proof-input";
  const productImage = order.product?.imageUrl || order.product?.displayImage || "/assets/rekberwe-logo-shield.png?v=7";
  const region = extractVoucherProductRegion(order.product);
  const showMessages = options.showMessages === true;
  return `
    ${showMessages ? `
      <div class="voucher-chat-box voucher-awaiting-payment-messages">
        ${(order.messages || []).map(renderVoucherMessageItem).join("")}
      </div>
    ` : ""}
    <div class="voucher-pay-layout">
      <div class="voucher-pay-main">
        <section class="voucher-pay-card voucher-pay-order-card">
          <h4>Detail Pesanan</h4>
          <div class="voucher-pay-order-row">
            <div class="voucher-pay-product">
              <img class="voucher-pay-product-image" src="${voucherEscapeHtml(productImage)}" alt="${voucherEscapeHtml(order.product?.name || "Produk")}" loading="lazy" decoding="async" />
              <div class="voucher-pay-product-copy">
                <strong>${voucherEscapeHtml(order.product?.name || "-")}</strong>
                <p class="mini-note">${quantity} pcs${region && region !== "-" ? ` • ${voucherEscapeHtml(region)}` : ""}</p>
              </div>
            </div>
            <p class="voucher-pay-order-price">${voucherEscapeHtml(voucherFormatCurrency(order.price))}</p>
          </div>
        </section>

        <section class="voucher-pay-card voucher-pay-transfer-card">
          <h4>Lakukan Pembayaran</h4>
          <p class="mini-note voucher-pay-transfer-note">Transfer sesuai nominal ke rekening admin berikut</p>
          <div class="voucher-pay-bank-list">
            ${buildVoucherPaymentBankCardsMarkup(payment)}
          </div>
          <div class="voucher-pay-total-box">
            <p class="mini-note">Total yang harus ditransfer</p>
            <strong>${voucherEscapeHtml(voucherFormatCurrency(order.price))}</strong>
            <p class="mini-note">Pastikan nominal transfer sama persis</p>
          </div>
          ${payment.qrisUrl ? `<p class="voucher-pay-qris-link"><a href="${voucherEscapeHtml(payment.qrisUrl)}" target="_blank" rel="noreferrer">Buka QRIS</a></p>` : ""}
        </section>

        <section class="voucher-pay-card voucher-pay-upload-card">
          <h4>Upload Bukti Pembayaran</h4>
          <form id="${voucherEscapeHtml(formId)}" class="voucher-payment-proof-form">
            <label class="file-upload-field voucher-payment-dropzone">
              <input type="file" id="${voucherEscapeHtml(inputId)}" name="paymentProof" accept="image/jpeg,image/png,image/webp" required data-empty-hint="Klik atau drag file ke sini (PNG, JPG, JPEG, Max 5MB)" />
              <span class="voucher-payment-dropzone-icon" aria-hidden="true">⬆</span>
              <span class="voucher-payment-dropzone-title">Klik atau drag file ke sini</span>
              <span class="file-upload-hint mini-note">PNG, JPG, JPEG, Max 5MB</span>
            </label>
            ${buildVoucherPaymentUploadProgressMarkup()}
            <p class="voucher-pay-privacy-note"><span aria-hidden="true">🔒</span> Bukti pembayaran hanya dapat dilihat oleh admin.</p>
            <div class="voucher-pay-form-actions">
              <button type="button" class="ghost-btn voucher-chat-action-btn" data-voucher-cancel="${voucherEscapeHtml(order.orderCode)}">Batalkan transaksi</button>
              <button type="submit" class="primary-btn voucher-payment-submit-btn">Upload & Kirim Bukti</button>
            </div>
          </form>
        </section>
      </div>
      ${buildVoucherPaymentSidebarMarkup(order, payment)}
    </div>
  `;
}

function buildVoucherAwaitingPaymentMarkup(order, options = {}) {
  const showCatalogBack = options.showBackToCatalog !== false && options.layoutMode !== "history";
  return `
    <section class="voucher-pay-checkout voucher-awaiting-payment-layout">
      <header class="voucher-pay-topbar">
        ${showCatalogBack ? `
          <button type="button" class="ghost-btn voucher-pay-back-btn" data-voucher-screen="catalog">
            <span aria-hidden="true">←</span>
            <span>Kembali ke Katalog</span>
          </button>
        ` : `<span></span>`}
        <div class="voucher-pay-topbar-actions">
          <button type="button" class="ghost-btn voucher-pay-dispute-link" data-voucher-cancel="${voucherEscapeHtml(order.orderCode)}">Batalkan Order</button>
        </div>
      </header>
      ${buildVoucherPaymentStepper(order)}
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

function renderVoucherMessageItem(message, options = {}) {
  if (window.VoucherChatUI?.renderMessageBubble) {
    return window.VoucherChatUI.renderMessageBubble(message, {
      ...options,
      order: options.order || voucherState.activeOrder || null,
      adminAvatarUrl: options.adminAvatarUrl || "/assets/rekberwe-logo-shield.png?v=7",
    });
  }
  const isAdmin = message.senderRole === "admin";
  const attachment = message.attachmentUrl
    ? (String(message.attachmentType || "").startsWith("image/")
      ? `<a href="${voucherEscapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer"><img class="voucher-chat-image" src="${voucherEscapeHtml(message.attachmentUrl)}" alt="${voucherEscapeHtml(message.attachmentName || "Lampiran")}" loading="eager" decoding="async" /></a>`
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

function buildVoucherChatToolbarActions(order, options = {}) {
  const canDispute = ["processing", "needs_verification", "completed"].includes(order.status);
  if (!canDispute) return "";
  const attr = options.disputeAttr || "data-voucher-dispute";
  return `<button type="button" class="danger-btn voucher-room-dispute-btn" ${attr}="${voucherEscapeHtml(order.orderCode)}">Laporkan Masalah / Ajukan Sengketa</button>`;
}

function buildVoucherChatBottomMarkup(order, options = {}) {
  const canChat = ["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status);
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing"].includes(order.status);
  const cancelAttr = options.cancelAttr || "data-voucher-cancel";
  const disputeAttr = options.disputeAttr || "data-voucher-dispute";
  if (!canChat) {
    if (order.status === "completed") {
      return `
        <div class="voucher-chat-compose voucher-chat-completed-actions">
          <p class="mini-note">Order sudah selesai. Jika ada masalah pada akun, ajukan sengketa untuk membuka kembali chat dengan admin.</p>
          <div class="voucher-chat-actions">
            <button type="button" class="primary-btn voucher-chat-action-btn" ${disputeAttr}="${voucherEscapeHtml(order.orderCode)}">Ajukan Sengketa</button>
          </div>
        </div>
      `;
    }
    return `<p class="mini-note voucher-chat-waiting">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`;
  }
  const actionsHtml = `
    <div class="voucher-chat-actions">
      ${canCancel ? `<button type="button" class="ghost-btn voucher-chat-action-btn" ${cancelAttr}="${voucherEscapeHtml(order.orderCode)}">Batalkan</button>` : ""}
    </div>
  `;
  if (window.VoucherChatUI?.buildComposeMarkup) {
    return window.VoucherChatUI.buildComposeMarkup({
      formId: options.formId || "voucher-chat-form",
      inputId: options.inputId || "voucher-chat-input",
      uploadId: options.uploadId || "voucher-chat-upload",
      actionsHtml,
    });
  }
  return "";
}

function bindVoucherRoomSidebar(container = document) {
  if (window.VoucherChatUI?.bindSidebarEvents) {
    window.VoucherChatUI.bindSidebarEvents(container);
  }
}

function buildVoucherChatMarkup(order, options = {}) {
  const canChat = ["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status);
  const showAccountForms = shouldShowVoucherAccountForm(order) && canChat;
  const viewerRole = options.viewerRole || "user";
  const chatBoxId = options.chatBoxId || "voucher-chat-box";
  const formId = options.formId || "voucher-chat-form";
  const inputId = options.inputId || "voucher-chat-input";
  const uploadId = options.uploadId || "voucher-chat-upload";
  const accountsFormId = options.accountsFormId || "voucher-accounts-form";
  const backButton = options.backButton || "";
  const layoutMode = options.layoutMode || "workspace";
  const toolbarActionsHtml = options.toolbarActionsHtml ?? buildVoucherChatToolbarActions(order, options);
  const accountsFormHtml = showAccountForms
    ? buildVoucherAccountFormsMarkup(order, { formId: accountsFormId })
    : "";
  const replaceProofHtml = buildVoucherReplaceProofMarkup(order, {
    formId: options.replaceProofFormId || "voucher-replace-proof-form",
    inputId: options.replaceProofInputId || "voucher-replace-proof-input",
  });
  const bottomHtml = buildVoucherChatBottomMarkup(order, {
    formId,
    inputId,
    uploadId,
    cancelAttr: options.cancelAttr,
    disputeAttr: options.disputeAttr,
  });

  if (window.VoucherChatUI?.buildRoomMarkup) {
    return window.VoucherChatUI.buildRoomMarkup(order, {
      viewerRole,
      layoutMode,
      chatBoxId,
      backButton,
      toolbarActionsHtml,
      toolbarHtml: options.hideToolbar ? `
        <div class="voucher-room-toolbar is-history is-minimal">
          <div class="voucher-room-toolbar-actions">
            <button type="button" class="ghost-btn voucher-room-sidebar-toggle workspace-mobile-only" data-voucher-sidebar-open>Detail</button>
          </div>
        </div>
      ` : undefined,
      statusClass: voucherStatusClass,
      accountsFormHtml,
      replaceProofHtml,
      bottomHtml,
      sidebarId: options.sidebarId,
      sidebarExtra: options.sidebarExtra || "",
      adminActionsHtml: options.adminActionsHtml || "",
      buyerLabel: options.buyerLabel || `${order.user?.displayName || "Pembeli"} - Pembeli`,
    });
  }

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
        ${(order.messages || []).map((message) => renderVoucherMessageItem(message, { viewerRole })).join("")}
      </div>
      ${accountsFormHtml}
      ${replaceProofHtml}
      ${bottomHtml}
    </section>
  `;
}

function renderVoucherChat() {
  const order = voucherState.activeOrder;
  if (!voucherElements.chatView || !order) return;

  const activeElement = document.activeElement;
  const prevInput = document.getElementById("voucher-chat-input");
  const hadFocus = activeElement === prevInput;
  const previousValue = prevInput?.value || "";
  const selectionStart = hadFocus ? prevInput.selectionStart : null;
  const selectionEnd = hadFocus ? prevInput.selectionEnd : null;

  voucherElements.chatView.innerHTML = buildVoucherChatMarkup(order, {
    backButton: '<button type="button" class="ghost-btn" data-voucher-screen="catalog">← Kembali ke katalog</button>',
    chatBoxId: "voucher-chat-box",
    formId: "voucher-chat-form",
    inputId: "voucher-chat-input",
    uploadId: "voucher-chat-upload",
  });
  const box = document.getElementById("voucher-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  const nextInput = document.getElementById("voucher-chat-input");
  if (nextInput && previousValue && !nextInput.value) {
    nextInput.value = previousValue;
    if (hadFocus) {
      nextInput.focus();
      if (selectionStart != null && selectionEnd != null) {
        nextInput.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }
  if (order.accountRevisionRequested) {
    window.requestAnimationFrame(() => {
      document.querySelector("#voucher-chat-view .voucher-account-forms-card.is-revision")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  bindFileUploadFields(voucherElements.chatView);
  bindVoucherRoomSidebar(voucherElements.chatView);
}

function renderVoucherHistoryRoom(order) {
  const container = document.getElementById("voucher-history-room");
  if (!container || !order) return;
  voucherState.activeOrder = order;
  voucherState.historyRoomOrderCode = order.orderCode;
  if (order.status === "awaiting_payment") {
    const renderAwaiting = () => {
      container.innerHTML = buildVoucherAwaitingPaymentMarkup(order, {
        layoutMode: "history",
        formId: "voucher-history-payment-proof-form",
        inputId: "voucher-history-payment-proof-input",
        showBackToCatalog: false,
        showMessages: false,
      });
      bindFileUploadFields(container);
    };
    ensureVoucherPaymentSettings()
      .then(renderAwaiting)
      .catch(renderAwaiting);
    return;
  }

  const activeElement = document.activeElement;
  const prevInput = document.getElementById("voucher-history-chat-input");
  const hadFocus = activeElement === prevInput;
  const previousValue = prevInput?.value || "";
  const selectionStart = hadFocus ? prevInput.selectionStart : null;
  const selectionEnd = hadFocus ? prevInput.selectionEnd : null;

  container.innerHTML = buildVoucherChatMarkup(order, {
    layoutMode: "history",
    hideToolbar: true,
    toolbarActionsHtml: "",
    chatBoxId: "voucher-history-chat-box",
    formId: "voucher-history-chat-form",
    inputId: "voucher-history-chat-input",
    uploadId: "voucher-history-chat-upload",
    accountsFormId: "voucher-history-accounts-form",
    replaceProofFormId: "voucher-history-replace-proof-form",
    replaceProofInputId: "voucher-history-replace-proof-input",
  });
  const box = document.getElementById("voucher-history-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  const nextInput = document.getElementById("voucher-history-chat-input");
  if (nextInput && previousValue && !nextInput.value) {
    nextInput.value = previousValue;
    if (hadFocus) {
      nextInput.focus();
      if (selectionStart != null && selectionEnd != null) {
        nextInput.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }
  if (order.accountRevisionRequested) {
    window.requestAnimationFrame(() => {
      document.querySelector("#voucher-history-room .voucher-account-forms-card.is-revision")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  bindFileUploadFields(container);
  bindVoucherRoomSidebar(container);
}

async function openVoucherOrderChat(orderCode) {
  const payload = await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
  voucherState.activeOrder = payload.order;
  if (payload.order.status === "awaiting_payment") {
    renderVoucherCheckout(payload.order);
    openVoucherScreen("checkout");
  } else if (isVoucherChatRoomStatus(payload.order.status)) {
    if (typeof window.openHistoryVoucherRoom === "function") {
      await window.openHistoryVoucherRoom(payload.order.orderCode);
    } else {
      goToVoucherChatroom(payload.order.orderCode);
    }
  } else {
    renderVoucherChat();
    openVoucherScreen("chat");
  }
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
  const submitBtn = form.querySelector(".voucher-payment-submit-btn, button[type='submit']");
  const progressEl = form.querySelector(".voucher-payment-upload-progress");
  const file = fileInput?.files?.[0];
  if (!file || !voucherState.activeOrder) return;
  const orderCode = voucherState.activeOrder.orderCode;
  const isReplaceForm = form.id === "voucher-replace-proof-form"
    || form.id === "voucher-history-replace-proof-form";
  const useStandaloneChatroomUpload = !isReplaceForm
    && !window.openHistoryVoucherRoom
    && window.VoucherUploadBridge?.storePendingPaymentProof;

  if (useStandaloneChatroomUpload) {
    if (submitBtn) submitBtn.disabled = true;
    try {
      await window.VoucherUploadBridge.storePendingPaymentProof(orderCode, file);
      window.VoucherUploadBridge.openVoucherChatroom(orderCode, { upload: true, sameWindow: true });
      resetFileUploadInput(fileInput);
    } catch (error) {
      window.setAuthStatus?.(error.message || "Gagal menyiapkan upload bukti.", true);
      if (submitBtn) submitBtn.disabled = false;
    }
    return;
  }

  const formData = new FormData();
  formData.append("paymentProof", file);

  if (submitBtn) submitBtn.disabled = true;
  setVoucherPaymentUploadProgress(progressEl, "Mengupload bukti pembayaran...", 0, "uploading", file.name);

  try {
    const payload = await voucherUploadWithProgress(
      `/api/voucher/orders/${encodeURIComponent(orderCode)}/payment-proof`,
      formData,
      (percent) => {
        setVoucherPaymentUploadProgress(
          progressEl,
          "Mengupload bukti pembayaran...",
          percent,
          "uploading",
          `${file.name} • ${percent}%`,
        );
      },
    );
    if (!payload.order) throw new Error("Upload bukti gagal.");
    setVoucherPaymentUploadProgress(progressEl, "Bukti pembayaran terkirim.", 100, "done", "Membuka ruang chat...");

    let latestOrder = payload.order;
    try {
      const fresh = await voucherFetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
      if (fresh?.order) latestOrder = fresh.order;
    } catch {
      // keep upload response order
    }

    const isReplaceForm = form.id === "voucher-replace-proof-form"
      || form.id === "voucher-history-replace-proof-form";
    await navigateToVoucherChatAfterPayment(latestOrder, { isReplaceForm });
    renderVoucherOrdersSidebar();
    window.markUserVoucherOrderSeen?.(latestOrder);
    window.refreshUserTransactionHistory?.();
    window.setAuthStatus?.(
      isReplaceForm
        ? "Bukti pembayaran baru terkirim."
        : "Bukti pembayaran terkirim. Anda sudah masuk ke ruang chat.",
    );
    resetFileUploadInput(fileInput);
    refreshVoucherData({ skipActiveOrderView: true }).catch(() => {});
  } catch (error) {
    setVoucherPaymentUploadProgress(progressEl, error.message || "Upload bukti gagal.", 100, "error", "Silakan coba lagi.");
    throw error;
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    window.setTimeout(() => hideVoucherPaymentUploadProgress(progressEl), 2800);
  }
}

function refreshActiveVoucherChatView() {
  refreshVoucherActiveOrderView();
}

async function submitVoucherChatMessage(event, options = {}) {
  event.preventDefault();
  const order = voucherState.activeOrder;
  if (!order) return;
  const inputId = options.inputId || "voucher-chat-input";
  const uploadId = options.uploadId || "voucher-chat-upload";
  const textInput = document.getElementById(inputId);
  const uploadInput = document.getElementById(uploadId);
  const text = String(textInput?.value || "").trim();
  const files = Array.from(uploadInput?.files || []);
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
  if (textInput) textInput.value = "";
  resetFileUploadInput(uploadInput);
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

  if (action === "dispute") {
    const historyRoom = document.getElementById("voucher-history-room");
    const inHistoryRoom = voucherState.historyRoomOrderCode === orderCode
      && historyRoom
      && !historyRoom.classList.contains("hidden");
    if (inHistoryRoom) {
      renderVoucherHistoryRoom(payload.order);
      window.syncHistoryVoucherOrder?.(payload.order);
    } else {
      renderVoucherChat();
      openVoucherScreen("chat");
    }
  } else {
    refreshActiveVoucherChatView();
  }

  if (voucherState.screen === "orders") renderVoucherOrdersPage();
  window.refreshUserTransactionHistory?.();
  window.setAuthStatus?.(
    action === "dispute"
      ? "Sengketa diajukan. Chat dengan admin sudah dibuka kembali."
      : `Status order diperbarui: ${payload.statusLabel || payload.order.status}`,
  );
}

function bindVoucherEvents() {
  bindVoucherRoomSidebar(document);
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
    const copyTextButton = event.target.closest("[data-voucher-copy-text]");
    if (copyTextButton) {
      try {
        await copyVoucherPlainText(copyTextButton.dataset.voucherCopyText, copyTextButton);
      } catch (error) {
        window.setAuthStatus?.(error.message || "Gagal menyalin teks.", true);
      }
      return;
    }
    const supportButton = event.target.closest("[data-voucher-open-support]");
    if (supportButton) {
      document.getElementById("support-widget-toggle")?.click();
      document.getElementById("sidebar-live-chat-button")?.click();
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
  });

  document.addEventListener("submit", async (event) => {
    if (event.target?.id === "voucher-payment-proof-form"
      || event.target?.id === "voucher-history-payment-proof-form"
      || event.target?.id === "voucher-replace-proof-form"
      || event.target?.id === "voucher-history-replace-proof-form") {
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

  window.addEventListener("rekber:locale-changed", () => {
    window.RekberI18n?.applyTranslations?.(document);
    if (voucherState.screen === "catalog") {
      renderVoucherCatalog({ preserveSearchFocus: true });
      return;
    }
    if (voucherState.screen === "detail") {
      renderVoucherProductDetail();
      return;
    }
    if (voucherState.screen === "orders") {
      renderVoucherOrdersPage();
      return;
    }
    const order = voucherState.activeOrder;
    if (!order) return;
    if (order.status === "awaiting_payment" && voucherState.screen === "checkout") {
      renderVoucherCheckout(order);
    } else if (isVoucherHistoryRoomActive(order.orderCode)) {
      renderVoucherHistoryRoom(order);
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
    voucherState.activeOrder = mergeVoucherOrderPreservingMessages(voucherState.activeOrder, payload.order);
    if (isVoucherHistoryRoomActive(payload.order.orderCode)) {
      renderVoucherHistoryRoom(payload.order);
      window.syncHistoryVoucherOrder?.(payload.order);
    } else if (voucherState.screen === "checkout" || voucherState.screen === "chat") {
      refreshActiveVoucherChatView();
    }
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
    if (!currentUser.banned) {
      refreshVoucherData().catch(() => {});
    }
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
  buildPaymentCheckoutMarkup: buildVoucherAwaitingPaymentMarkup,
};
