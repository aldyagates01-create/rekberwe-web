(function initVoucherChatUI(global) {
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

  function formatDateOnly(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatTimeOnly(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function groupMessagesByDate(messages = []) {
    const groups = [];
    let currentDate = "";
    (Array.isArray(messages) ? messages : []).forEach((message) => {
      const dateLabel = formatDateOnly(message.time);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ type: "date", label: dateLabel });
      }
      groups.push({ type: "message", message });
    });
    return groups;
  }

  function isAccountSubmissionMessage(message) {
    return /^Data akun subscription/i.test(String(message?.text || ""));
  }

  function renderAvatarHtml(message, options = {}) {
    const senderName = message.senderName || (message.senderRole === "admin" ? "Rekberwe.id" : "Anda");
    const initial = String(senderName).trim().charAt(0).toUpperCase() || "?";
    const adminAvatarUrl = options.adminAvatarUrl || "/assets/rekberwe-logo-shield.png?v=7";
    const userAvatarUrl = options.userAvatarUrl || options.order?.user?.avatar || "";
    const isAdminMessage = message.senderRole === "admin";
    if (isAdminMessage) {
      if (adminAvatarUrl) {
        return `<img class="voucher-bubble-avatar is-admin" src="${escapeHtml(adminAvatarUrl)}" alt="RekberWe Admin" loading="lazy" decoding="async" />`;
      }
      return `<span class="voucher-bubble-avatar is-admin" aria-hidden="true">🛡</span>`;
    }
    if (userAvatarUrl) {
      return `<img class="voucher-bubble-avatar is-user" src="${escapeHtml(userAvatarUrl)}" alt="${escapeHtml(senderName)}" loading="lazy" decoding="async" />`;
    }
    return `<span class="voucher-bubble-avatar is-user" aria-hidden="true">${escapeHtml(initial)}</span>`;
  }

  function renderMessageBubble(message, options = {}) {
    const viewerRole = options.viewerRole || "user";
    const isOwn = String(message.senderRole || "") === viewerRole;
    const rowClass = isOwn ? "is-own" : "is-other";
    const senderName = message.senderName || (message.senderRole === "admin" ? "Rekberwe.id" : "Anda");
    const attachment = message.attachmentUrl
      ? (String(message.attachmentType || "").startsWith("image/")
        ? `<a class="voucher-bubble-attachment" href="${escapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer"><img class="voucher-chat-image" src="${escapeHtml(message.attachmentUrl)}" alt="${escapeHtml(message.attachmentName || "Lampiran")}" loading="lazy" decoding="async" /></a>`
        : `<a class="voucher-bubble-attachment-file" href="${escapeHtml(message.attachmentUrl)}" target="_blank" rel="noreferrer">${escapeHtml(message.attachmentName || "Lihat lampiran")}</a>`)
      : "";
    const avatar = renderAvatarHtml(message, options);
    const accountMessage = isAccountSubmissionMessage(message);
    const textHtml = message.text
      ? (accountMessage
        ? `<div class="voucher-account-message-body">${escapeHtml(message.text).replace(/\n/g, "<br>")}${options.order?.accountRevisionRequested && isOwn ? `<button type="button" class="voucher-account-edit-link" data-voucher-scroll-accounts>Edit data akun</button>` : ""}</div>`
        : `<p>${escapeHtml(message.text)}</p>`)
      : "";
    return `
      <article class="voucher-bubble-row ${rowClass}">
        ${isOwn ? "" : avatar}
        <div class="voucher-bubble-stack">
          <div class="voucher-bubble${accountMessage ? " is-account" : ""}">
            ${textHtml}
            ${attachment}
          </div>
          <div class="voucher-bubble-meta">
            <span>${escapeHtml(formatTimeOnly(message.time))}</span>
            ${isOwn ? `<span class="voucher-bubble-read" aria-hidden="true">✓✓</span>` : ""}
          </div>
        </div>
        ${isOwn ? avatar : ""}
      </article>
    `;
  }

  function renderChatMessages(messages, options = {}) {
    return groupMessagesByDate(messages).map((item) => {
      if (item.type === "date") {
        return `<div class="voucher-chat-date-sep"><span>${escapeHtml(item.label)}</span></div>`;
      }
      return renderMessageBubble(item.message, options);
    }).join("");
  }

  function buildComposeMarkup(options = {}) {
    const formId = options.formId || "voucher-chat-form";
    const inputId = options.inputId || "voucher-chat-input";
    const uploadId = options.uploadId || "voucher-chat-upload";
    const submitLabel = options.submitLabel || "Kirim";
    return `
      <div class="voucher-chat-compose">
        <form id="${escapeHtml(formId)}" class="voucher-chat-form">
          <div class="voucher-chat-compose-row">
            <label class="voucher-chat-attach-btn" title="Lampirkan gambar">
              <input type="file" id="${escapeHtml(uploadId)}" accept="image/jpeg,image/png,image/webp" multiple hidden />
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true"><path d="M12 5v10M8 9l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </label>
            <input type="text" id="${escapeHtml(inputId)}" class="voucher-chat-input" placeholder="Tulis pesan ke admin..." data-i18n-placeholder="chat.placeholder" autocomplete="off" />
            <button type="submit" class="primary-btn voucher-chat-send-btn" aria-label="Kirim pesan">
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true"><path d="m5 12 14-7v4h7v6h-7v4z" fill="currentColor"/></svg>
            </button>
          </div>
        </form>
        ${options.actionsHtml || ""}
      </div>
    `;
  }

  function buildSidebar(order, options = {}) {
    const quantity = Math.max(1, Number(order.quantity || 1));
    const unitPrice = quantity ? Math.round(Number(order.price || 0) / quantity) : Number(order.price || 0);
    const buyerName = options.buyerLabel || order.user?.displayName || "Pembeli";
    const sidebarId = options.sidebarId || "voucher-room-sidebar";
    const adminAvatarUrl = options.adminAvatarUrl || "/assets/rekberwe-logo-shield.png?v=7";
    return `
      <aside class="voucher-room-sidebar" id="${escapeHtml(sidebarId)}">
        <button type="button" class="voucher-room-sidebar-close" data-voucher-sidebar-close aria-label="Tutup detail">×</button>
        ${options.adminActionsHtml || ""}
        <section class="voucher-room-side-card">
          <h4>Detail Transaksi</h4>
          <dl class="voucher-room-detail-list">
            <div><dt>Kode transaksi</dt><dd>${escapeHtml(order.orderCode)}</dd></div>
            <div><dt>Produk</dt><dd>${escapeHtml(order.product?.name || "-")}</dd></div>
            <div><dt>Jumlah</dt><dd>${quantity} pcs × ${escapeHtml(formatCurrency(unitPrice))}</dd></div>
            <div><dt>Total harga</dt><dd>${escapeHtml(formatCurrency(order.price))}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(order.statusLabel || order.status || "-")}</dd></div>
            <div><dt>Tanggal dibuat</dt><dd>${escapeHtml(formatDateTime(order.createdAt))}</dd></div>
            <div><dt>Pembeli</dt><dd>${escapeHtml(buyerName)}</dd></div>
          </dl>
        </section>
        ${options.sidebarExtra || ""}
        <section class="voucher-room-side-card voucher-room-security-card">
          <h4>Keamanan Transaksi</h4>
          <ul class="voucher-room-security-list">
            <li>Dana aman ditahan RekberWE.id hingga transaksi selesai.</li>
            <li>Jangan transfer di luar instruksi admin.</li>
            <li>Simpan bukti pembayaran hingga order selesai.</li>
            <li>Laporkan masalah melalui tombol sengketa jika diperlukan.</li>
          </ul>
        </section>
        <section class="voucher-room-side-card voucher-room-agent-card">
          <div class="voucher-room-agent-head">
            <img class="voucher-room-agent-avatar" src="${escapeHtml(adminAvatarUrl)}" alt="RekberWe Admin" loading="lazy" decoding="async" />
            <div>
              <strong>RekberWe.id</strong>
              <span class="voucher-room-online-badge ${escapeHtml(options.adminPresenceClass || "is-online")}">${escapeHtml(options.adminPresenceLabel || "ONLINE")}</span>
            </div>
          </div>
          <p class="mini-note">Admin RekberWE siap membantu proses order voucher/gametime Anda.</p>
        </section>
      </aside>
    `;
  }

  function buildRoomMarkup(order, options = {}) {
    if (!order) return "";
    const quantity = Math.max(1, Number(order.quantity || 1));
    const unitPrice = quantity ? Math.round(Number(order.price || 0) / quantity) : Number(order.price || 0);
    const statusClass = typeof options.statusClass === "function"
      ? options.statusClass(order.status)
      : "status-chip";
    const chatBoxId = options.chatBoxId || "voucher-chat-box";
    const buyerName = options.buyerLabel || order.user?.displayName || "Pembeli";
    const toolbarActions = options.toolbarActionsHtml || "";
    const bottomHtml = options.bottomHtml || "";
    const typingHtml = options.showTyping !== false
      ? `<p class="voucher-room-typing mini-note" id="${escapeHtml(options.typingId || "voucher-room-typing")}" hidden>${escapeHtml(options.typingLabel || "")}</p>`
      : "";

    return `
      <section class="voucher-room-shell ${escapeHtml(options.layoutMode || "workspace")}">
        ${options.toolbarHtml !== undefined ? options.toolbarHtml : `
          <div class="voucher-room-toolbar">
            ${options.backButton || ""}
            <div class="voucher-room-toolbar-actions">
              ${toolbarActions}
              <button type="button" class="ghost-btn voucher-room-sidebar-toggle" data-voucher-sidebar-open>Detail</button>
            </div>
          </div>
        `}
        <div class="voucher-room-grid">
          <div class="voucher-room-main">
            <header class="voucher-room-order-card">
              <div class="voucher-room-order-top">
                <span class="voucher-room-order-code">${escapeHtml(order.orderCode)}</span>
                <span class="${escapeHtml(statusClass)}">${escapeHtml(order.statusLabel || order.status)}</span>
              </div>
              <h3>${escapeHtml(order.product?.name || "Voucher")}</h3>
              <p class="voucher-room-order-price">${quantity} pcs × ${escapeHtml(formatCurrency(unitPrice))}</p>
              <p class="voucher-room-order-meta">${escapeHtml(formatDateTime(order.createdAt))} • ${escapeHtml(buyerName)}</p>
            </header>
            <div class="voucher-room-chat-panel">
              <div class="voucher-chat-box" id="${escapeHtml(chatBoxId)}">
                ${renderChatMessages(order.messages, {
                  viewerRole: options.viewerRole || "user",
                  order,
                  adminAvatarUrl: options.adminAvatarUrl || "/assets/rekberwe-logo-shield.png?v=7",
                  userAvatarUrl: order.user?.avatar || "",
                })}
              </div>
              ${options.accountsFormHtml || ""}
              ${options.replaceProofHtml || ""}
              ${typingHtml}
              ${bottomHtml}
            </div>
          </div>
          ${buildSidebar(order, options)}
        </div>
        <div class="voucher-room-sidebar-backdrop" data-voucher-sidebar-backdrop></div>
      </section>
    `;
  }

  const boundSidebarRoots = new WeakSet();

  function bindSidebarEvents(container = global.document) {
    if (!container || boundSidebarRoots.has(container)) return;
    boundSidebarRoots.add(container);
    container.addEventListener("click", (event) => {
      const shell = event.target.closest(".voucher-room-shell");
      if (!shell) return;
      if (event.target.closest("[data-voucher-sidebar-open]")) {
        shell.classList.add("sidebar-open");
        return;
      }
      if (event.target.closest("[data-voucher-sidebar-close], [data-voucher-sidebar-backdrop]")) {
        shell.classList.remove("sidebar-open");
        return;
      }
      if (event.target.closest("[data-voucher-scroll-accounts]")) {
        const form = shell.querySelector(".voucher-account-forms-card, .voucher-account-forms");
        form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  global.VoucherChatUI = {
    escapeHtml,
    formatDateTime,
    formatDateOnly,
    formatTimeOnly,
    formatCurrency,
    groupMessagesByDate,
    renderMessageBubble,
    renderChatMessages,
    buildComposeMarkup,
    buildSidebar,
    buildRoomMarkup,
    bindSidebarEvents,
  };
})(window);
