const chatroomRoot = document.getElementById("voucher-chatroom-root");
const chatroomState = {
  order: null,
  orderCode: "",
  uploadRunning: false,
};
let chatroomLiveSource = null;

function getChatroomOrderCode() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((part) => part.toLowerCase() === "chatroom");
  const code = idx >= 0 ? parts[idx + 1] : "";
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

function uploadWithProgress(url, formData, onProgress) {
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

function setUploadProgress(message, percent = 0, state = "uploading", detail = "Menyiapkan file...") {
  const container = document.getElementById("chatroom-upload-progress");
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

function buildUploadScreen(order, fileName = "") {
  return `
    <section class="card voucher-chatroom-upload-card">
      <p class="eyebrow">Order ${escapeHtml(order.orderCode)}</p>
      <h2>Mengirim bukti pembayaran</h2>
      <p class="mini-note">${escapeHtml(order.product?.name || "Voucher")} • ${escapeHtml(formatCurrency(order.price))}</p>
      <div class="upload-progress voucher-payment-upload-progress chatroom-upload-progress" id="chatroom-upload-progress" aria-live="polite">
        <div class="upload-progress-top">
          <strong class="voucher-payment-upload-label"><span class="upload-spinner"></span>Menyiapkan upload...</strong>
          <span class="voucher-payment-upload-value">0%</span>
        </div>
        <p class="upload-progress-detail voucher-payment-upload-detail">${escapeHtml(fileName || "Menyiapkan file...")}</p>
        <div class="upload-progress-track">
          <span class="voucher-payment-upload-bar"></span>
        </div>
      </div>
      <p class="mini-note chatroom-upload-hint">Jangan tutup halaman ini sampai upload selesai dan ruang chat terbuka.</p>
    </section>
  `;
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
        : "Belum ada file dipilih";
      label.classList.toggle("has-file", files.length > 0);
    };
    input.addEventListener("change", syncHint);
    syncHint();
  });
}

function resetFileInput(input) {
  if (!input) return;
  input.value = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
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
    ? `<p class="mini-note voucher-account-revision-note">Admin meminta perbaikan data akun.</p>`
    : "";
  return `
    <section class="voucher-account-forms-card voucher-account-forms-compact${isRevision ? " is-revision" : ""}">
      <div class="voucher-account-forms-head"><h4>${isRevision ? "Perbaiki data akun" : "Data akun"} · ${quantity} pcs</h4></div>
      ${revisionNotice}
      <form id="chatroom-accounts-form" class="voucher-account-forms">
        ${Array.from({ length: quantity }, (_, index) => {
    const existing = accounts[index] || {};
    return `
          <div class="voucher-account-row">
            <span class="voucher-account-num">${index + 1}</span>
            <input type="email" name="account_email_${index}" value="${escapeHtml(existing.email || "")}" required placeholder="Email akun ${index + 1}" />
            <input type="password" name="account_password_${index}" value="${escapeHtml(existing.password || "")}" required placeholder="Password" />
          </div>
        `;
  }).join("")}
        <button type="submit" class="primary-btn voucher-account-submit-btn">${isRevision ? "Kirim perbaikan" : "Kirim data akun"}</button>
      </form>
    </section>
  `;
}

function buildReplaceProofMarkup(order) {
  if (!shouldShowReplaceProof(order)) return "";
  return `
    <section class="voucher-replace-proof-card voucher-replace-proof-compact">
      <form id="chatroom-replace-proof-form" class="voucher-replace-proof-form">
        <p class="mini-note voucher-replace-proof-label">Admin meminta ganti bukti transfer. Upload bukti baru di sini.</p>
        <div class="voucher-replace-proof-row">
          <label class="file-upload-field voucher-replace-proof-file">
            <span class="voucher-replace-proof-file-text">Pilih file</span>
            <input type="file" id="chatroom-replace-proof-input" name="paymentProof" accept="image/jpeg,image/png,image/webp" required />
            <span class="file-upload-hint mini-note">Belum ada file</span>
          </label>
          <button type="submit" class="ghost-btn voucher-payment-submit-btn">Kirim</button>
        </div>
      </form>
    </section>
  `;
}

function buildChatBottom(order) {
  const canChat = ["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status);
  const canCancel = ["awaiting_payment", "awaiting_confirmation", "processing"].includes(order.status);
  const canDispute = ["processing", "needs_verification", "completed"].includes(order.status);
  if (!canChat) {
    if (order.status === "completed") {
      return `
        <div class="voucher-chat-compose voucher-chat-completed-actions">
          <p class="mini-note">Order sudah selesai. Ajukan sengketa jika ada masalah pada akun.</p>
          <div class="voucher-chat-actions">
            <button type="button" class="primary-btn voucher-chat-action-btn" data-chatroom-action="dispute">Ajukan Sengketa</button>
          </div>
        </div>
      `;
    }
    return `<p class="mini-note voucher-chat-waiting">Chat akan aktif setelah admin memproses pembayaran Anda.</p>`;
  }
  const actionsHtml = `
    <div class="voucher-chat-actions">
      ${canCancel ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-chatroom-action="cancel">Batalkan</button>` : ""}
      ${canDispute ? `<button type="button" class="ghost-btn voucher-chat-action-btn" data-chatroom-action="dispute">Ajukan Sengketa</button>` : ""}
    </div>
  `;
  if (window.VoucherChatUI?.buildComposeMarkup) {
    return window.VoucherChatUI.buildComposeMarkup({
      formId: "chatroom-chat-form",
      inputId: "chatroom-chat-input",
      uploadId: "chatroom-chat-upload",
      actionsHtml,
    });
  }
  return "";
}

function buildToolbarActions(order) {
  const canDispute = ["processing", "needs_verification", "completed"].includes(order.status);
  if (!canDispute) return "";
  return `<button type="button" class="danger-btn voucher-room-dispute-btn" data-chatroom-action="dispute">Laporkan Masalah / Ajukan Sengketa</button>`;
}

function renderChatRoom(order) {
  if (!chatroomRoot || !order) return;
  chatroomState.order = order;
  const canChat = ["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status);
  const showAccountForms = shouldShowAccountForm(order) && canChat;

  const activeElement = document.activeElement;
  const prevInput = document.getElementById("chatroom-chat-input");
  const hadFocus = activeElement === prevInput;
  const previousValue = prevInput?.value || "";
  const selectionStart = hadFocus ? prevInput.selectionStart : null;
  const selectionEnd = hadFocus ? prevInput.selectionEnd : null;

  if (window.VoucherChatUI?.buildRoomMarkup) {
    chatroomRoot.innerHTML = window.VoucherChatUI.buildRoomMarkup(order, {
      viewerRole: "user",
      layoutMode: "chatroom",
      chatBoxId: "chatroom-chat-box",
      backButton: '<a class="ghost-btn voucher-room-back-btn" href="/">← Kembali ke dashboard</a>',
      toolbarActionsHtml: buildToolbarActions(order),
      statusClass,
      accountsFormHtml: showAccountForms ? buildAccountFormsMarkup(order) : "",
      replaceProofHtml: buildReplaceProofMarkup(order),
      bottomHtml: buildChatBottom(order),
      sidebarId: "chatroom-sidebar",
    });
  } else {
    chatroomRoot.innerHTML = `<p class="mini-note">Gagal memuat tampilan chat.</p>`;
    return;
  }

  const box = document.getElementById("chatroom-chat-box");
  if (box) box.scrollTop = box.scrollHeight;
  const nextInput = document.getElementById("chatroom-chat-input");
  if (nextInput && previousValue && !nextInput.value) {
    nextInput.value = previousValue;
    if (hadFocus) {
      nextInput.focus();
      if (selectionStart != null && selectionEnd != null) {
        nextInput.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }
  bindFileUploadFields(chatroomRoot);
  window.VoucherChatUI?.bindSidebarEvents?.(chatroomRoot);
  document.title = `Chat ${order.orderCode} — RekberWE.id`;
}

async function runPendingUpload(order) {
  if (chatroomState.uploadRunning) return;
  chatroomState.uploadRunning = true;
  const file = await window.VoucherUploadBridge?.consumePendingPaymentProof(order.orderCode);
  if (!file) {
    chatroomRoot.innerHTML = `
      <section class="card voucher-chatroom-upload-card">
        <h3>File bukti tidak ditemukan</h3>
        <p class="mini-note">Silakan kembali ke halaman pembayaran, pilih bukti transfer, lalu klik <strong>Kirim bukti pembayaran</strong> lagi.</p>
        <a class="primary-btn" href="/">Kembali ke dashboard</a>
      </section>
    `;
    chatroomState.uploadRunning = false;
    return;
  }

  chatroomRoot.innerHTML = buildUploadScreen(order, file.name);
  setUploadProgress("Mengupload bukti pembayaran...", 0, "uploading", file.name);

  const formData = new FormData();
  formData.append("paymentProof", file);

  try {
    const payload = await uploadWithProgress(
      `/api/voucher/orders/${encodeURIComponent(order.orderCode)}/payment-proof`,
      formData,
      (percent) => {
        setUploadProgress(
          "Mengupload bukti pembayaran...",
          percent,
          "uploading",
          `${file.name} • ${percent}%`,
        );
      },
    );
    if (!payload.order) throw new Error("Upload bukti gagal.");
    setUploadProgress("Bukti pembayaran terkirim.", 100, "done", "Membuka ruang chat...");

    let latestOrder = payload.order;
    try {
      const fresh = await fetchJson(`/api/voucher/orders/${encodeURIComponent(order.orderCode)}`);
      if (fresh?.order) latestOrder = fresh.order;
    } catch {
      // keep upload response
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("upload");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));

    window.setTimeout(() => renderChatRoom(latestOrder), 400);
  } catch (error) {
    setUploadProgress(error.message || "Upload bukti gagal.", 100, "error", "Silakan coba lagi dari dashboard.");
    chatroomRoot.insertAdjacentHTML("beforeend", `
      <div class="voucher-chat-actions" style="margin-top:12px">
        <a class="primary-btn" href="/">Kembali ke dashboard</a>
      </div>
    `);
  } finally {
    chatroomState.uploadRunning = false;
  }
}

async function submitPaymentProofInline(orderCode, formId) {
  const form = document.getElementById(formId);
  const fileInput = form?.querySelector('input[type="file"]');
  const file = fileInput?.files?.[0];
  if (!file) throw new Error("Bukti pembayaran wajib diupload.");
  await window.VoucherUploadBridge.storePendingPaymentProof(orderCode, file);
  const order = chatroomState.order || { orderCode, product: {}, price: 0 };
  await runPendingUpload(order);
  resetFileInput(fileInput);
}

async function submitAccounts(event) {
  event.preventDefault();
  const order = chatroomState.order;
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
  renderChatRoom(payload.order);
}

async function submitChat(orderCode) {
  const textInput = document.getElementById("chatroom-chat-input");
  const chatUpload = document.getElementById("chatroom-chat-upload");
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
    resetFileInput(chatUpload);
    const latest = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
    renderChatRoom(latest.order);
    return;
  }

  await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  if (textInput) textInput.value = "";
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
  renderChatRoom(payload.order);
}

async function promptOrderNote(action) {
  const label = action === "dispute" ? "Jelaskan masalah pada order ini:" : "Jelaskan alasan pembatalan:";
  const note = window.prompt(label);
  if (note === null) return "";
  return String(note).trim();
}

async function runOrderAction(action) {
  const orderCode = chatroomState.orderCode;
  if (!orderCode) return;
  const note = await promptOrderNote(action);
  if (!note) return;
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
  renderChatRoom(payload.order);
}

function startLiveUpdates(orderCode) {
  chatroomState.orderCode = orderCode;
  if (chatroomLiveSource) {
    chatroomLiveSource.close();
    chatroomLiveSource = null;
  }
  chatroomLiveSource = new EventSource("/api/events", { withCredentials: true });
  chatroomLiveSource.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type !== "voucher_order_updated") return;
      const eventCode = String(payload.orderCode || payload.order?.orderCode || "").trim().toUpperCase();
      if (eventCode !== orderCode) return;
      if (chatroomState.uploadRunning) return;
      if (payload.deleted) {
        chatroomRoot.innerHTML = `
          <section class="card voucher-chatroom-upload-card">
            <h3>Order tidak tersedia</h3>
            <p class="mini-note">Order ini telah dihapus atau tidak lagi tersedia.</p>
            <a class="primary-btn" href="/">Kembali ke dashboard</a>
          </section>
        `;
        return;
      }
      if (payload.order) {
        renderChatRoom(payload.order);
        return;
      }
      const fresh = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
      renderChatRoom(fresh.order);
    } catch {
      // ignore malformed events
    }
  };
}

function bindChatroomEvents(orderCode) {
  document.addEventListener("submit", async (event) => {
    if (event.target?.id === "chatroom-chat-form") {
      event.preventDefault();
      try {
        await submitChat(orderCode);
      } catch (error) {
        alert(error.message || "Gagal mengirim pesan.");
      }
      return;
    }
    if (event.target?.id === "chatroom-accounts-form") {
      event.preventDefault();
      try {
        await submitAccounts(event);
      } catch (error) {
        alert(error.message || "Gagal mengirim data akun.");
      }
      return;
    }
    if (event.target?.id === "chatroom-replace-proof-form") {
      event.preventDefault();
      try {
        await submitPaymentProofInline(orderCode, "chatroom-replace-proof-form");
      } catch (error) {
        alert(error.message || "Gagal mengirim bukti pembayaran.");
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-chatroom-action]");
    if (!actionButton) return;
    try {
      await runOrderAction(actionButton.dataset.chatroomAction);
    } catch (error) {
      alert(error.message || "Gagal memperbarui order.");
    }
  });
}

async function bootstrapChatroom() {
  const orderCode = getChatroomOrderCode();
  if (!orderCode) {
    chatroomRoot.innerHTML = "<p class='mini-note'>Kode order tidak valid.</p>";
    return;
  }
  chatroomState.orderCode = orderCode;

  try {
    const session = await fetchJson("/api/session");
    if (!session?.user) {
      chatroomRoot.innerHTML = `
        <section class="card voucher-chatroom-upload-card">
          <h3>Login diperlukan</h3>
          <p class="mini-note">Silakan login terlebih dahulu untuk membuka ruang chat.</p>
          <a class="primary-btn" href="/?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}">Login / Daftar</a>
        </section>
      `;
      return;
    }

    const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(orderCode)}`);
    const order = payload.order;
    chatroomState.order = order;

    const shouldUpload = new URLSearchParams(window.location.search).get("upload") === "1";
    if (shouldUpload && order.status === "awaiting_payment") {
      await runPendingUpload(order);
    } else if (["awaiting_confirmation", "processing", "needs_verification", "dispute", "completed"].includes(order.status)) {
      renderChatRoom(order);
    } else if (order.status === "awaiting_payment") {
      chatroomRoot.innerHTML = `
        <section class="card voucher-chatroom-upload-card">
          <h3>Menunggu bukti pembayaran</h3>
          <p class="mini-note">Order <strong>${escapeHtml(order.orderCode)}</strong> belum menerima bukti transfer. Kembali ke dashboard untuk mengirim bukti.</p>
          <a class="primary-btn" href="/">Kembali ke dashboard</a>
        </section>
      `;
    } else {
      renderChatRoom(order);
    }

    bindChatroomEvents(orderCode);
    startLiveUpdates(orderCode);
  } catch (error) {
    chatroomRoot.innerHTML = `
      <section class="card voucher-chatroom-upload-card">
        <h3>Gagal memuat ruang chat</h3>
        <p class="mini-note">${escapeHtml(error.message || "Terjadi kesalahan.")}</p>
        <a class="primary-btn" href="/">Kembali ke dashboard</a>
      </section>
    `;
  }
}

bootstrapChatroom();
