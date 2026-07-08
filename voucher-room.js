const roomRoot = document.getElementById("voucher-standalone-room");
let roomPaymentSettings = {};

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
        : "Belum ada file dipilih";
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

async function ensurePaymentSettings() {
  if (roomPaymentSettings?.bankNumber || roomPaymentSettings?.bankName) return;
  const payload = await fetchJson("/api/config");
  roomPaymentSettings = payload.voucherPayment || {};
}

function renderMessage(message) {
  const isAdmin = message.senderRole === "admin";
  const attachment = message.attachmentUrl
    ? (String(message.attachmentType || "").startsWith("image/")
      ? `<a href="${escapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer"><img class="voucher-chat-image" src="${escapeHtml(message.attachmentUrl)}" alt="" /></a>`
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

function buildPaymentSection(order) {
  const payment = roomPaymentSettings || {};
  const quantity = Math.max(1, Number(order.quantity || 1));
  const unitPrice = quantity ? Math.round(Number(order.price || 0) / quantity) : Number(order.price || 0);
  return `
    <div class="voucher-chat-box voucher-awaiting-payment-messages">
      ${(order.messages || []).map(renderMessage).join("")}
    </div>
    <div class="voucher-awaiting-payment-actions">
      <button type="button" class="primary-btn" data-voucher-scroll-payment>Lanjutkan pembayaran</button>
    </div>
    <div class="voucher-payment-section" id="voucher-payment-section">
      <div class="voucher-checkout-grid">
        <article class="voucher-checkout-card">
          <h4>Detail order</h4>
          <p><strong>${escapeHtml(order.product?.name || "-")}</strong></p>
          <p class="mini-note">${quantity} pcs × ${escapeHtml(formatCurrency(unitPrice))}</p>
          <p class="voucher-product-price">Total: ${escapeHtml(formatCurrency(order.price))}</p>
        </article>
        <article class="voucher-checkout-card">
          <h4>Transfer ke rekening admin</h4>
          <p><strong>${escapeHtml(payment.bankName || "-")}</strong></p>
          <p class="voucher-bank-number">${escapeHtml(payment.bankNumber || "-")}</p>
          <p>a.n ${escapeHtml(payment.bankHolder || "-")}</p>
          ${payment.qrisUrl ? `<p><a href="${escapeHtml(payment.qrisUrl)}" target="_blank" rel="noreferrer">Buka QRIS</a></p>` : ""}
          <pre class="voucher-payment-instructions">${escapeHtml(payment.instructions || "")}</pre>
        </article>
      </div>
      <form id="voucher-standalone-payment-form" class="profile-form voucher-payment-proof-form">
        <label class="file-upload-field">
          Upload bukti pembayaran
          <input type="file" id="voucher-standalone-payment-input" name="paymentProof" accept="image/jpeg,image/png,image/webp" required />
          <span class="file-upload-hint mini-note">Belum ada file dipilih</span>
        </label>
        <button type="submit" class="primary-btn">Kirim bukti pembayaran</button>
      </form>
    </div>
  `;
}

function renderRoom(order) {
  if (!roomRoot || !order) return;
  const isAwaitingPayment = order.status === "awaiting_payment";
  const canChat = ["processing", "needs_verification", "dispute", "awaiting_confirmation"].includes(order.status);

  if (isAwaitingPayment) {
    roomRoot.innerHTML = `
      <section class="card voucher-standalone-card">
        <div class="voucher-chat-head">
          <a class="ghost-btn" href="/">← Kembali ke dashboard</a>
          <div>
            <p class="eyebrow">Order ${escapeHtml(order.orderCode)}</p>
            <h3>${escapeHtml(order.product?.name || "Voucher")}</h3>
            <span class="${statusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span>
          </div>
        </div>
        ${buildPaymentSection(order)}
      </section>
    `;
    document.querySelector("[data-voucher-scroll-payment]")?.addEventListener("click", () => {
      document.getElementById("voucher-payment-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bindRoomFileUploadFields(roomRoot);
    return;
  }

  roomRoot.innerHTML = `
    <section class="card voucher-standalone-card">
      <div class="voucher-chat-head">
        <a class="ghost-btn" href="/">← Kembali ke dashboard</a>
        <div>
          <p class="eyebrow">Order ${escapeHtml(order.orderCode)}</p>
          <h3>${escapeHtml(order.product?.name || "Voucher")}</h3>
          <span class="${statusClass(order.status)}">${escapeHtml(order.statusLabel || order.status)}</span>
        </div>
      </div>
      <div class="voucher-chat-box" id="voucher-standalone-chat-box">
        ${(order.messages || []).map(renderMessage).join("")}
      </div>
      ${canChat ? `
        <form id="voucher-standalone-chat-form" class="profile-form voucher-chat-form">
          <label>Pesan<input type="text" id="voucher-standalone-chat-input" placeholder="Tulis pesan ke admin..." /></label>
          <label class="file-upload-field">Lampiran
            <input type="file" id="voucher-standalone-chat-upload" accept="image/jpeg,image/png,image/webp" multiple />
            <span class="file-upload-hint mini-note">Belum ada file dipilih</span>
          </label>
          <button type="submit" class="primary-btn">Kirim</button>
        </form>
      ` : `<p class="mini-note">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`}
    </section>
  `;
  const box = document.getElementById("voucher-standalone-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  bindRoomFileUploadFields(roomRoot);
}

async function submitPaymentProof(orderCode) {
  const fileInput = document.getElementById("voucher-standalone-payment-input");
  const file = fileInput?.files?.[0];
  if (!file) throw new Error("Bukti pembayaran wajib diupload.");
  const formData = new FormData();
  formData.append("paymentProof", file);
  const response = await fetch(`/api/voucher/orders/${encodeURIComponent(orderCode)}/payment-proof`, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Upload bukti gagal.");
  renderRoom(payload.order);
}

async function submitChat(orderCode) {
  const textInput = document.getElementById("voucher-standalone-chat-input");
  const chatUpload = document.getElementById("voucher-standalone-chat-upload");
  const text = String(textInput?.value || "").trim();
  const files = Array.from(chatUpload?.files || []);
  if (!text && !files.length) return;
  if (text) {
    await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }
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
    if (textInput) textInput.value = "";
    resetRoomFileInput(chatUpload);
    renderRoom(payload.order);
    return;
  }
  if (textInput) textInput.value = "";
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
  renderRoom(payload.order);
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
    renderRoom(payload.order);
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
      if (event.target?.id === "voucher-standalone-payment-form") {
        event.preventDefault();
        try {
          await submitPaymentProof(orderCode);
        } catch (error) {
          alert(error.message || "Gagal mengirim bukti pembayaran.");
        }
      }
    });
  } catch (error) {
    roomRoot.innerHTML = `<p class="mini-note">${escapeHtml(error.message || "Gagal memuat order voucher.")}</p>`;
  }
}

bootstrapVoucherRoom();
