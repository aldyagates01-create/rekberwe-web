const roomRoot = document.getElementById("voucher-standalone-room");

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
        <span>${escapeHtml(new Date(message.time).toLocaleString("id-ID"))}</span>
      </div>
      ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
      ${attachment}
    </article>
  `;
}

function renderRoom(order) {
  if (!roomRoot || !order) return;
  const canChat = ["processing", "needs_verification", "dispute", "awaiting_payment", "awaiting_confirmation"].includes(order.status);
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
          <label>Lampiran<input type="file" id="voucher-standalone-chat-upload" accept="image/jpeg,image/png,image/webp" multiple /></label>
          <button type="submit" class="primary-btn">Kirim</button>
        </form>
      ` : `<p class="mini-note">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`}
    </section>
  `;
  const box = document.getElementById("voucher-standalone-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
}

async function submitChat(orderCode) {
  const text = String(document.getElementById("voucher-standalone-chat-input")?.value || "").trim();
  const files = Array.from(document.getElementById("voucher-standalone-chat-upload")?.files || []);
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
  }
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
    const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
    renderRoom(payload.order);
    document.addEventListener("submit", async (event) => {
      if (event.target?.id !== "voucher-standalone-chat-form") return;
      event.preventDefault();
      try {
        await submitChat(orderCode);
      } catch (error) {
        alert(error.message || "Gagal mengirim pesan.");
      }
    });
  } catch (error) {
    roomRoot.innerHTML = `<p class="mini-note">${escapeHtml(error.message || "Gagal memuat order voucher.")}</p>`;
  }
}

bootstrapVoucherRoom();
