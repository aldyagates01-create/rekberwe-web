const roomRoot = document.getElementById("voucher-standalone-room");
const roomState = {
  order: null,
  orderCode: "",
};
let roomPaymentSettings = {};
let roomLiveSource = null;

function getOrderCodeFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((part) => part.toLowerCase() === "voucher-order");
  const code = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
  return String(code || "").trim().toUpperCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusClass(status) {
  if (status === "completed") return "status-chip status-chip-success";
  if (status === "cancelled") return "status-chip status-chip-muted";
  if (status === "dispute") return "status-chip status-chip-danger";
  if (status === "processing" || status === "needs_verification") return "status-chip status-chip-warning";
  return "status-chip";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Permintaan gagal.");
  return payload;
}

function bindRoomFileUploadFields(root = document) {
  root.querySelectorAll('input[type="file"]').forEach((input) => {
    if (input.dataset.uploadUiBound === "1") return;
    input.dataset.uploadUiBound = "1";
    const label = input.closest("label");
    if (!label) return;
    label.classList.add("file-upload-field");
    const syncHint = () => {
      const files = input.multiple
        ? Array.from(input.files || [])
        : [input.files?.[0]].filter(Boolean);
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

function resetRoomFileInput(input) {
  if (!input) return;
  input.value = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function roomUploadWithProgress(url, formData, onProgress) {
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
    xhr.send(formData);
  });
}

function setRoomPaymentUploadProgress(container, message, percent = 0, state = "uploading", detail = "Menyiapkan file...") {
  if (!container) return;
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  container.classList.remove("hidden", "upload-progress-done", "upload-progress-error");
  if (state === "done") container.classList.add("upload-progress-done");
  if (state === "error") container.classList.add("upload-progress-error");
  const label = container.querySelector(".voucher-payment-upload-label");
  const value = container.querySelector(".voucher-payment-upload-value");
  const detailEl = container.querySelector(".voucher-payment-upload-detail");
  const bar = container.querySelector(".voucher-payment-upload-bar");
  if (label) label.innerHTML = `<span class="upload-spinner"></span>${escapeHtml(message)}`;
  if (value) value.textContent = `${normalized}%`;
  if (detailEl) detailEl.textContent = detail;
  if (bar) bar.style.width = `${normalized}%`;
}

function hideRoomPaymentUploadProgress(container) {
  if (!container) return;
  container.classList.add("hidden");
  container.classList.remove("upload-progress-done", "upload-progress-error");
  const bar = container.querySelector(".voucher-payment-upload-bar");
  if (bar) bar.style.width = "0%";
}

async function ensurePaymentSettings() {
  if (roomPaymentSettings?.bankNumber || roomPaymentSettings?.bankName) return;
  const payload = await fetchJson("/api/config");
  roomPaymentSettings = payload.voucherPayment || {};
}

function hasAccountsComplete(order) {
  if (!order?.product?.requiresAccountLogin) return true;
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  if (accounts.length < quantity) return false;
  return accounts.slice(0, quantity).every((item) => item.email && item.email.includes("@") && item.password);
}

function shouldShowAccountForm(order) {
  if (!order?.product?.requiresAccountLogin) return false;
  if (order.accountRevisionRequested) return true;
  return !hasAccountsComplete(order);
}

function shouldShowReplaceProof(order) {
  return Boolean(order?.proofRevisionRequested) && order.status === "awaiting_confirmation";
}

function buildAccountFormsMarkup(order) {
  if (!order?.product?.requiresAccountLogin) return "";
  const isRevision = Boolean(order.accountRevisionRequested);
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  if (hasAccountsComplete(order) && !isRevision) {
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
      <form id="voucher-standalone-accounts-form" class="voucher-account-forms">
        ${Array.from({ length: quantity }, (_, index) => {
    const existing = accounts[index] || {};
    return `
          <div class="voucher-account-row">
            <span class="voucher-account-num" aria-hidden="true">${index + 1}</span>
            <input type="email" name="account_email_${index}" value="${escapeHtml(existing.email || "")}" required autocomplete="username" placeholder="Email akun ${index + 1}" aria-label="Email akun ${index + 1}" />
            <input type="password" name="account_password_${index}" value="${escapeHtml(existing.password || "")}" required autocomplete="current-password" placeholder="Password" aria-label="Password akun ${index + 1}" />
          </div>
        `;
  }).join("")}
        <button type="submit" class="primary-btn voucher-account-submit-btn">${isRevision ? "Kirim perbaikan data akun" : "Kirim data akun"}</button>
      </form>
    </section>
  `;
}

function buildReplaceProofMarkup(order) {
  if (!shouldShowReplaceProof(order)) return "";
  return `
    <section class="voucher-replace-proof-card voucher-replace-proof-compact">
      <form id="voucher-standalone-replace-proof-form" class="voucher-replace-proof-form">
        <p class="mini-note voucher-replace-proof-label">Admin meminta ganti bukti transfer. Upload bukti baru di sini.</p>
        <div class="voucher-replace-proof-row">
          <label class="file-upload-field voucher-replace-proof-file">
            <span class="voucher-replace-proof-file-text">Pilih file</span>
            <input type="file" id="voucher-standalone-replace-proof-input" name="paymentProof" accept="image/jpeg,image/png,image/webp" required />
            <span class="file-upload-hint mini-note">Belum ada file</span>
          </label>
          <button type="submit" class="ghost-btn voucher-payment-submit-btn">Kirim</button>
        </div>
      </form>
    </section>
  `;
}

function renderMessage(message) {
  const isAdmin = message.senderRole === "admin";
  const attachment = message.attachmentUrl
    ? (String(message.attachmentType || "").startsWith("image/")
      ? `<a href="${escapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer"><img class="voucher-chat-image" src="${escapeHtml(message.attachmentUrl)}" alt="" loading="eager" decoding="async" /></a>`
      : `<a href="${escapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer">${escapeHtml(message.attachmentName || "Lampiran")}</a>`)
    : "";
  return `
    <article class="voucher-chat-message ${isAdmin ? "is-admin" : "is-user"}">
      <div class="voucher-chat-meta">
        <strong>${escapeHtml(message.senderName || (isAdmin ? "Admin" : "Anda"))}</strong>
        <span>${escapeHtml(formatDateTime(message.time))}</span>
      </div>
      ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
      ${attachment}
    </article>
  `;
}

function getPaymentBanks(payment = {}) {
  if (Array.isArray(payment.banks) && payment.banks.length) {
    return payment.banks.map((bank) => ({
      name: String(bank?.name || "").trim(),
      number: String(bank?.number || "").trim(),
      holder: String(bank?.holder || "").trim(),
      logoUrl: String(bank?.logoUrl || "").trim(),
    })).filter((bank) => bank.name || bank.number);
  }
  const legacyName = String(payment.bankName || "").trim();
  const legacyNumber = String(payment.bankNumber || "").trim();
  if (!legacyName && !legacyNumber) return [];
  return [{
    name: legacyName,
    number: legacyNumber,
    holder: String(payment.bankHolder || "").trim(),
    logoUrl: "",
  }];
}

function extractProductRegion(product) {
  const name = String(product?.name || "");
  const regionMatch = name.match(/REGION\s+([A-Za-z0-9][A-Za-z0-9\s-]*)/i);
  if (regionMatch) return regionMatch[1].trim();
  const descLine = String(product?.description || "").trim().split(/\r?\n/).find(Boolean);
  return descLine || "-";
}

function buildPaymentBankCards(payment = {}) {
  const banks = getPaymentBanks(payment);
  const holderLabel = window.t?.("voucher.account_holder") || "a.n";
  if (!banks.length) return `<p class="mini-note">Rekening pembayaran belum dikonfigurasi admin.</p>`;
  return banks.map((bank) => `
    <article class="voucher-pay-bank-card">
      <div class="voucher-pay-bank-card-top">
        ${bank.logoUrl
    ? `<img class="voucher-pay-bank-logo" src="${escapeHtml(bank.logoUrl)}" alt="${escapeHtml(bank.name || "Bank")}" loading="lazy" decoding="async" />`
    : `<span class="voucher-pay-bank-logo-fallback">${escapeHtml(String(bank.name || "B").slice(0, 3).toUpperCase())}</span>`}
        <div class="voucher-pay-bank-meta">
          <strong>${escapeHtml(bank.name || "Bank")}</strong>
          <div class="voucher-pay-bank-number-row">
            <span class="voucher-pay-bank-number">${escapeHtml(bank.number || "-")}</span>
            ${bank.number ? `<button type="button" class="voucher-copy-btn voucher-bank-copy-btn" data-voucher-copy-bank="${escapeHtml(bank.number)}">Salin</button>` : ""}
          </div>
          <p class="voucher-pay-bank-holder">${escapeHtml(holderLabel)} ${escapeHtml(bank.holder || "-")}</p>
        </div>
      </div>
    </article>
  `).join("");
}

function buildPaymentStepper(order) {
  const steps = [
    { id: 1, label: "Order Dibuat" },
    { id: 2, label: "Menunggu Pembayaran" },
    { id: 3, label: "Menunggu Konfirmasi" },
    { id: 4, label: "Sedang Diproses" },
    { id: 5, label: "Selesai" },
  ];
  const activeStep = order.status === "awaiting_payment" ? 2 : 1;
  return `
    <nav class="voucher-pay-stepper" aria-label="Progress order">
      ${steps.map((step) => {
    const state = step.id < activeStep ? "is-done" : step.id === activeStep ? "is-active" : "";
    return `
          <div class="voucher-pay-step ${state}">
            <span class="voucher-pay-step-dot" aria-hidden="true">${step.id < activeStep ? "✓" : step.id}</span>
            <span class="voucher-pay-step-label">${escapeHtml(step.label)}</span>
          </div>
        `;
  }).join("")}
    </nav>
  `;
}

function buildPaymentSection(order) {
  if (window.RekberVoucher?.buildPaymentCheckoutMarkup) {
    return window.RekberVoucher.buildPaymentCheckoutMarkup(order, {
      layoutMode: "standalone",
      formId: "voucher-standalone-payment-form",
      inputId: "voucher-standalone-payment-input",
      showBackToCatalog: false,
      showMessages: false,
    });
  }
  const payment = roomPaymentSettings || {};
  const quantity = Math.max(1, Number(order.quantity || 1));
  const productImage = order.product?.imageUrl || order.product?.displayImage || "/assets/rekberwe-logo-shield.png?v=7";
  const region = extractProductRegion(order.product);
  const infoLines = String(payment.instructions || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return `
    <section class="voucher-pay-checkout voucher-awaiting-payment-layout">
      <header class="voucher-pay-topbar">
        <a class="ghost-btn voucher-pay-back-btn" href="/"><span aria-hidden="true">←</span><span>Kembali ke Dashboard</span></a>
        <div class="voucher-pay-topbar-actions">
          <button type="button" class="ghost-btn voucher-pay-dispute-link" data-room-order-action="cancel">Batalkan Order</button>
        </div>
      </header>
      ${buildPaymentStepper(order)}
      <div class="voucher-pay-layout">
        <div class="voucher-pay-main">
          <section class="voucher-pay-card voucher-pay-order-card">
            <h4>Detail Pesanan</h4>
            <div class="voucher-pay-order-row">
              <div class="voucher-pay-product">
                <img class="voucher-pay-product-image" src="${escapeHtml(productImage)}" alt="${escapeHtml(order.product?.name || "Produk")}" loading="lazy" decoding="async" />
                <div class="voucher-pay-product-copy">
                  <strong>${escapeHtml(order.product?.name || "-")}</strong>
                  <p class="mini-note">${quantity} pcs${region && region !== "-" ? ` • ${escapeHtml(region)}` : ""}</p>
                </div>
              </div>
              <p class="voucher-pay-order-price">${escapeHtml(formatCurrency(order.price))}</p>
            </div>
          </section>
          <section class="voucher-pay-card voucher-pay-transfer-card">
            <h4>Lakukan Pembayaran</h4>
            <p class="mini-note voucher-pay-transfer-note">Transfer sesuai nominal ke rekening admin berikut</p>
            <div class="voucher-pay-bank-list">${buildPaymentBankCards(payment)}</div>
            <div class="voucher-pay-total-box">
              <p class="mini-note">Total yang harus ditransfer</p>
              <strong>${escapeHtml(formatCurrency(order.price))}</strong>
              <p class="mini-note">Pastikan nominal transfer sama persis</p>
            </div>
          </section>
          <section class="voucher-pay-card voucher-pay-upload-card">
            <h4>Upload Bukti Pembayaran</h4>
            <form id="voucher-standalone-payment-form" class="voucher-payment-proof-form">
              <label class="file-upload-field voucher-payment-dropzone">
                <input type="file" id="voucher-standalone-payment-input" name="paymentProof" accept="image/jpeg,image/png,image/webp" required data-empty-hint="Klik atau drag file ke sini (PNG, JPG, JPEG, Max 5MB)" />
                <span class="voucher-payment-dropzone-icon" aria-hidden="true">⬆</span>
                <span class="voucher-payment-dropzone-title">Klik atau drag file ke sini</span>
                <span class="file-upload-hint mini-note">PNG, JPG, JPEG, Max 5MB</span>
              </label>
              <div class="upload-progress hidden voucher-payment-upload-progress" aria-live="polite">
                <div class="upload-progress-top">
                  <strong class="voucher-payment-upload-label"><span class="upload-spinner"></span>Sedang upload bukti...</strong>
                  <span class="voucher-payment-upload-value">0%</span>
                </div>
                <p class="upload-progress-detail voucher-payment-upload-detail">Menyiapkan file...</p>
                <div class="upload-progress-track"><span class="voucher-payment-upload-bar"></span></div>
              </div>
              <p class="voucher-pay-privacy-note"><span aria-hidden="true">🔒</span> Bukti pembayaran hanya dapat dilihat oleh admin.</p>
              <button type="submit" class="primary-btn voucher-payment-submit-btn">Upload & Kirim Bukti</button>
            </form>
          </section>
        </div>
        <aside class="voucher-pay-sidebar">
          <section class="voucher-pay-side-card">
            <h4>Informasi Order</h4>
            <dl class="voucher-pay-info-list">
              <div><dt>Kode Transaksi</dt><dd>${escapeHtml(order.orderCode)}</dd></div>
              <div><dt>Tanggal dibuat</dt><dd>${escapeHtml(formatDateTime(order.createdAt))}</dd></div>
              <div><dt>Produk</dt><dd>${escapeHtml(order.product?.name || "-")}</dd></div>
              <div><dt>Total harga</dt><dd>${escapeHtml(formatCurrency(order.price))}</dd></div>
              <div><dt>Status</dt><dd><span class="${statusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span></dd></div>
            </dl>
          </section>
          <section class="voucher-pay-side-card">
            <h4>Informasi Penting</h4>
            <ul class="voucher-pay-info-bullets">
              ${infoLines.length
    ? infoLines.map((line) => `<li><span aria-hidden="true">✓</span><span>${escapeHtml(line)}</span></li>`).join("")
    : `<li><span aria-hidden="true">✓</span><span>Transfer sesuai nominal order.</span></li><li><span aria-hidden="true">✓</span><span>Upload bukti setelah transfer.</span></li>`}
            </ul>
          </section>
        </aside>
      </div>
    </section>
  `;
}

function buildStandaloneChatBottom(order) {
  const canChat = ["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status);
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing"].includes(order.status);
  const canDispute = ["processing", "needs_verification", "completed"].includes(order.status);
  if (!canChat) {
    if (order.status === "completed") {
      return `
        <div class="voucher-chat-compose voucher-chat-completed-actions">
          <p class="mini-note">Order sudah selesai. Jika ada masalah pada akun, ajukan sengketa untuk membuka kembali chat dengan admin.</p>
          <div class="voucher-chat-actions">
            <button type="button" class="primary-btn voucher-chat-action-btn" data-room-order-action="dispute">Ajukan Sengketa</button>
          </div>
        </div>
      `;
    }
    return `<p class="mini-note voucher-chat-waiting">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`;
  }
  const actionsHtml = `
    <div class="voucher-chat-actions">
      ${canCancel ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-room-order-action="cancel">Batalkan</button>` : ""}
      ${canDispute ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-room-order-action="dispute">Ajukan Sengketa</button>` : ""}
    </div>
  `;
  if (window.VoucherChatUI?.buildComposeMarkup) {
    return window.VoucherChatUI.buildComposeMarkup({
      formId: "voucher-standalone-chat-form",
      inputId: "voucher-standalone-chat-input",
      uploadId: "voucher-standalone-chat-upload",
      actionsHtml,
    });
  }
  return "";
}

function buildStandaloneToolbarActions(order) {
  const canDispute = ["processing", "needs_verification", "completed"].includes(order.status);
  if (!canDispute) return "";
  return `<button type="button" class="danger-btn voucher-room-dispute-btn" data-room-order-action="dispute">Laporkan Masalah / Ajukan Sengketa</button>`;
}

function buildChatSection(order) {
  const canChat = ["processing", "needs_verification", "dispute", "awaiting_confirmation"].includes(order.status);
  const showAccountForms = shouldShowAccountForm(order) && canChat;
  if (window.VoucherChatUI?.buildRoomMarkup) {
    return window.VoucherChatUI.buildRoomMarkup(order, {
      viewerRole: "user",
      layoutMode: "standalone",
      chatBoxId: "voucher-standalone-chat-box",
      backButton: '<a class="ghost-btn voucher-room-back-btn" href="/">← Kembali ke dashboard</a>',
      toolbarActionsHtml: buildStandaloneToolbarActions(order),
      statusClass,
      accountsFormHtml: showAccountForms ? buildAccountFormsMarkup(order) : "",
      replaceProofHtml: buildReplaceProofMarkup(order),
      bottomHtml: buildStandaloneChatBottom(order),
    });
  }
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing"].includes(order.status);
  const canDispute = ["processing", "needs_verification", "completed"].includes(order.status);
  return `
    <section class="voucher-chat-layout voucher-standalone-chat-layout">
      <div class="voucher-chat-box" id="voucher-standalone-chat-box">
        ${(order.messages || []).map(renderMessage).join("")}
      </div>
      ${showAccountForms ? buildAccountFormsMarkup(order) : ""}
      ${buildReplaceProofMarkup(order)}
      ${canChat ? `
        <div class="voucher-chat-compose">
          <form id="voucher-standalone-chat-form" class="voucher-chat-form">
            <div class="voucher-chat-compose-row">
              <label class="voucher-chat-attach-btn" title="Lampirkan gambar">
                <input type="file" id="voucher-standalone-chat-upload" accept="image/jpeg,image/png,image/webp" multiple hidden />
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true"><path d="M12 5v10M8 9l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                <span class="voucher-chat-attach-label">File</span>
              </label>
              <input type="text" id="voucher-standalone-chat-input" class="voucher-chat-input" placeholder="Tulis pesan ke admin..." autocomplete="off" />
              <button type="submit" class="primary-btn voucher-chat-send-btn">Kirim</button>
            </div>
          </form>
          <div class="voucher-chat-actions">
            ${canCancel ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-room-order-action="cancel">Batalkan</button>` : ""}
            ${canDispute ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-room-order-action="dispute">Ajukan Sengketa</button>` : ""}
          </div>
        </div>
      ` : `
        <div class="voucher-chat-compose voucher-chat-completed-actions">
          ${order.status === "completed" ? `
            <p class="mini-note">Order sudah selesai. Jika ada masalah pada akun, ajukan sengketa untuk membuka kembali chat dengan admin.</p>
            <div class="voucher-chat-actions">
              <button type="button" class="primary-btn voucher-chat-action-btn" data-room-order-action="dispute">Ajukan Sengketa</button>
            </div>
          ` : `<p class="mini-note">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`}
        </div>
      `}
    </section>
  `;
}

function renderRoom(order) {
  if (!roomRoot || !order) return;
  roomState.order = order;
  const isAwaitingPayment = order.status === "awaiting_payment";

  const activeElement = document.activeElement;
  const prevInput = document.getElementById("voucher-standalone-chat-input");
  const hadFocus = activeElement === prevInput;
  const previousValue = prevInput?.value || "";
  const selectionStart = hadFocus ? prevInput.selectionStart : null;
  const selectionEnd = hadFocus ? prevInput.selectionEnd : null;

  roomRoot.innerHTML = isAwaitingPayment
    ? `<div class="card voucher-standalone-card voucher-standalone-payment-card">${buildPaymentSection(order)}</div>`
    : buildChatSection(order);

  if (!isAwaitingPayment) {
    const box = document.getElementById("voucher-standalone-chat-box");
    if (box) box.scrollTop = box.scrollHeight;
    const nextInput = document.getElementById("voucher-standalone-chat-input");
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
        document.querySelector(".voucher-account-forms-card.is-revision")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }
  bindRoomFileUploadFields(roomRoot);
  window.VoucherChatUI?.bindSidebarEvents?.(roomRoot);
}

async function promptOrderNote(action) {
  const label = action === "dispute" ? "Jelaskan masalah pada order ini:" : "Jelaskan alasan pembatalan:";
  const note = window.prompt(label);
  if (note === null) return "";
  return String(note).trim();
}

async function runOrderAction(action) {
  const orderCode = roomState.orderCode;
  if (!orderCode) return;
  const note = await promptOrderNote(action);
  if (!note) return;
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
  renderRoom(payload.order);
}

async function submitAccounts(event) {
  event.preventDefault();
  const order = roomState.order;
  if (!order) return;
  const form = event.target;
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.from({ length: quantity }, (_, index) => ({
    email: String(form.querySelector(`[name="account_email_${index}"]`)?.value || "").trim(),
    password: String(form.querySelector(`[name="account_password_${index}"]`)?.value || "").trim(),
  }));
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}/accounts`, {
    method: "POST",
    body: JSON.stringify({ accounts }),
  });
  renderRoom(payload.order);
}

async function submitPaymentProof(orderCode, formId = "voucher-standalone-payment-form") {
  const form = document.getElementById(formId);
  const fileInput = form?.querySelector('input[type="file"]');
  const submitBtn = form?.querySelector(".voucher-payment-submit-btn, button[type='submit']");
  const progressEl = form?.querySelector(".voucher-payment-upload-progress");
  const file = fileInput?.files?.[0];
  if (!file) throw new Error("Bukti pembayaran wajib diupload.");
  const formData = new FormData();
  formData.append("paymentProof", file);

  if (submitBtn) submitBtn.disabled = true;
  setRoomPaymentUploadProgress(progressEl, "Mengupload bukti pembayaran...", 0, "uploading", file.name);

  try {
    const payload = await roomUploadWithProgress(
      `/api/voucher/orders/${encodeURIComponent(orderCode)}/payment-proof`,
      formData,
      (percent) => {
        setRoomPaymentUploadProgress(
          progressEl,
          "Mengupload bukti pembayaran...",
          percent,
          "uploading",
          `${file.name} • ${percent}%`,
        );
      },
    );
    if (!payload.order) throw new Error("Upload bukti gagal.");
    setRoomPaymentUploadProgress(progressEl, "Bukti pembayaran terkirim.", 100, "done", "Membuka ruang chat...");
    resetRoomFileInput(fileInput);
    let latestOrder = payload.order;
    try {
      const fresh = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
      if (fresh?.order) latestOrder = fresh.order;
    } catch {
      // keep upload response order
    }
    renderRoom(latestOrder);
  } catch (error) {
    setRoomPaymentUploadProgress(progressEl, error.message || "Upload bukti gagal.", 100, "error", "Silakan coba lagi.");
    throw error;
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    window.setTimeout(() => hideRoomPaymentUploadProgress(progressEl), 2800);
  }
}

async function submitChat(orderCode) {
  const textInput = document.getElementById("voucher-standalone-chat-input");
  const chatUpload = document.getElementById("voucher-standalone-chat-upload");
  const text = String(textInput?.value || "").trim();
  const files = Array.from(chatUpload?.files || []);
  if (!text && !files.length) return;

  if (files.length) {
    const formData = new FormData();
    files.forEach((file) => formData.append("chatFiles", file));
    const response = await fetch(`/api/voucher/orders/${encodeURIComponent(orderCode)}/uploads`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Upload gagal.");
    if (text) {
      await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    }
    if (textInput) textInput.value = "";
    resetRoomFileInput(chatUpload);
    const latest = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
    renderRoom(latest.order);
    return;
  }

  await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  if (textInput) textInput.value = "";
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
  renderRoom(payload.order);
}

function startRoomLiveUpdates(orderCode) {
  roomState.orderCode = orderCode;
  if (roomLiveSource) {
    roomLiveSource.close();
    roomLiveSource = null;
  }
  roomLiveSource = new EventSource("/api/events", { withCredentials: true });
  roomLiveSource.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type !== "voucher_order_updated") return;
      const eventCode = String(payload.orderCode || payload.order?.orderCode || "").trim().toUpperCase();
      if (eventCode !== orderCode) return;
      if (payload.deleted) {
        roomRoot.innerHTML = `
          <section class="card voucher-standalone-card">
            <h3>Order tidak tersedia</h3>
            <p class="mini-note">Order ini telah dihapus atau tidak lagi tersedia.</p>
            <a class="primary-btn" href="/">Kembali ke dashboard</a>
          </section>
        `;
        return;
      }
      if (payload.order) {
        renderRoom(payload.order);
        return;
      }
      const fresh = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
      renderRoom(fresh.order);
    } catch {
      // ignore malformed live events
    }
  };
  roomLiveSource.onerror = () => {
    if (roomLiveSource) {
      roomLiveSource.close();
      roomLiveSource = null;
    }
  };
}

function bindRoomEvents(orderCode) {
  document.addEventListener("submit", async (event) => {
    if (event.target?.id === "voucher-standalone-chat-form") {
      event.preventDefault();
      try {
        await submitChat(orderCode);
      } catch (error) {
        alert(error.message || "Gagal mengirim pesan.");
      }
      return;
    }
    if (event.target?.id === "voucher-standalone-accounts-form") {
      event.preventDefault();
      try {
        await submitAccounts(event);
      } catch (error) {
        alert(error.message || "Gagal mengirim data akun.");
      }
      return;
    }
    if (event.target?.id === "voucher-standalone-payment-form") {
      event.preventDefault();
      const fileInput = event.target.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];
      if (!file) return;
      try {
        await window.VoucherUploadBridge.storePendingPaymentProof(orderCode, file);
        window.VoucherUploadBridge.openVoucherChatroom(orderCode, { upload: true, sameWindow: true });
      } catch (error) {
        alert(error.message || "Gagal menyiapkan upload bukti pembayaran.");
      }
      return;
    }
    if (event.target?.id === "voucher-standalone-replace-proof-form") {
      event.preventDefault();
      try {
        await submitPaymentProof(orderCode, event.target.id);
      } catch (error) {
        alert(error.message || "Gagal mengirim bukti pembayaran.");
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const bankCopyButton = event.target.closest("[data-voucher-copy-bank]");
    if (bankCopyButton) {
      const text = String(bankCopyButton.dataset.voucherCopyBank || "").trim();
      if (text) {
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
        const original = bankCopyButton.textContent;
        bankCopyButton.textContent = "Tersalin";
        window.setTimeout(() => { bankCopyButton.textContent = original; }, 1600);
      }
      return;
    }
    const actionButton = event.target.closest("[data-room-order-action]");
    if (!actionButton) return;
    try {
      await runOrderAction(actionButton.dataset.roomOrderAction);
    } catch (error) {
      alert(error.message || "Gagal memperbarui order.");
    }
  });
}

async function bootstrapVoucherRoom() {
  const orderCode = getOrderCodeFromPath();
  if (!orderCode) {
    roomRoot.innerHTML = "<p class='mini-note'>Kode order tidak valid.</p>";
    return;
  }
  try {
    const session = await fetchJson("/api/session");
    if (!session?.user) {
      roomRoot.innerHTML = `
        <section class="card voucher-standalone-card">
          <h3>Login diperlukan</h3>
          <p class="mini-note">Silakan login terlebih dahulu untuk membuka ruang chat voucher.</p>
          <a class="primary-btn" href="/?returnTo=${encodeURIComponent(window.location.pathname)}">Login / Daftar</a>
        </section>
      `;
      return;
    }
    await ensurePaymentSettings();
    const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
    bindRoomEvents(orderCode);
    startRoomLiveUpdates(orderCode);
    renderRoom(payload.order);
  } catch (error) {
    roomRoot.innerHTML = `<p class="mini-note">${escapeHtml(error.message || "Gagal memuat order voucher.")}</p>`;
  }
}

bootstrapVoucherRoom();
