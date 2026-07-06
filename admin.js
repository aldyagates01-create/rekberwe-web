const state = {
  currentUser: null,
  transactions: [],
  users: [],
  settings: null,
  activeTransaction: null,
  currentPage: "overview",
  supportThreads: [],
  activeSupportThreadId: null,
};

const adminNotificationState = {
  initialized: false,
  knownTransactionCodes: [],
  seenMessagesByCode: {},
  audioUnlocked: false,
  lastSoundAt: 0,
};

let adminRoomRefreshTimer = null;
let adminChatScrollState = null;
let adminEventSource = null;
let adminPresenceTimer = null;
let adminPresenceTickTimer = null;
let adminTypingStopTimer = null;
let adminSupportTypingStopTimer = null;
let adminSupportPresenceTickTimer = null;
let adminRoomPresenceTickTimer = null;
let settingsFormDirty = false;

const elements = {
  adminUserCard: document.getElementById("admin-user-card"),
  adminStatus: document.getElementById("admin-status"),
  adminSummary: document.getElementById("admin-summary"),
  adminProfitSummary: document.getElementById("admin-profit-summary"),
  adminProfitList: document.getElementById("admin-profit-list"),
  profitDateFrom: document.getElementById("profit-date-from"),
  profitDateTo: document.getElementById("profit-date-to"),
  adminUserList: document.getElementById("admin-user-list"),
  adminVerificationList: document.getElementById("admin-verification-list"),
  adminUserSearch: document.getElementById("admin-user-search"),
  adminVerificationSearch: document.getElementById("admin-verification-search"),
  adminTransactionList: document.getElementById("admin-transaction-list"),
  adminLogout: document.getElementById("admin-logout"),
  adminFeeForm: document.getElementById("admin-fee-form"),
  adminPayoutAccount: document.getElementById("admin-payout-account"),
  customerCareTelegram: document.getElementById("customer-care-telegram"),
  customerCareGmail: document.getElementById("customer-care-gmail"),
  officeAddress: document.getElementById("admin-office-address"),
  goldFlatFee: document.getElementById("gold-flat-fee"),
  termsAndConditions: document.getElementById("terms-and-conditions"),
  accountSecurityGuide: document.getElementById("account-security-guide"),
  adminStorageInfo: document.getElementById("admin-storage-info"),
  userNotificationSound: document.getElementById("user-notification-sound"),
  adminNotificationSound: document.getElementById("admin-notification-sound"),
  notificationSoundStatus: document.getElementById("notification-sound-status"),
  adminTransactionRoom: document.getElementById("admin-transaction-room"),
  adminTransactionEmpty: document.getElementById("admin-transaction-empty"),
  adminRoomTitle: document.getElementById("admin-room-title"),
  adminRoomSubtitle: document.getElementById("admin-room-subtitle"),
  adminRoomStatusTitle: document.getElementById("admin-room-status-title"),
  adminRoomStatus: document.getElementById("admin-room-status"),
  adminRoomBuyerName: document.getElementById("admin-room-buyer-name"),
  adminRoomSellerName: document.getElementById("admin-room-seller-name"),
  adminRoomBuyerState: document.getElementById("admin-room-buyer-state"),
  adminRoomSellerState: document.getElementById("admin-room-seller-state"),
  adminRoomBuyerAvatar: document.getElementById("admin-room-buyer-avatar"),
  adminRoomSellerAvatar: document.getElementById("admin-room-seller-avatar"),
  adminProgressCreated: document.getElementById("admin-progress-created"),
  adminProgressFunded: document.getElementById("admin-progress-funded"),
  adminProgressReviewed: document.getElementById("admin-progress-reviewed"),
  adminProgressComplete: document.getElementById("admin-progress-complete"),
  adminProgressCreatedTime: document.getElementById("admin-progress-created-time"),
  adminProgressFundedTime: document.getElementById("admin-progress-funded-time"),
  adminProgressReviewedTime: document.getElementById("admin-progress-reviewed-time"),
  adminProgressCompleteTime: document.getElementById("admin-progress-complete-time"),
  adminRoomSummary: document.getElementById("admin-room-summary"),
  adminRoomTimeline: document.getElementById("admin-room-timeline"),
  adminTransferQueuePanel: document.getElementById("admin-transfer-queue-panel"),
  adminTransferQueueSummary: document.getElementById("admin-transfer-queue-summary"),
  adminTransferProofForm: document.getElementById("admin-transfer-proof-form"),
  adminTransferProofUpload: document.getElementById("admin-transfer-proof-upload"),
  adminTransferProofPending: document.getElementById("admin-transfer-proof-pending"),
  adminTransferProofProgress: document.getElementById("admin-transfer-proof-progress"),
  adminTransferProofProgressLabel: document.getElementById("admin-transfer-proof-progress-label"),
  adminTransferProofProgressValue: document.getElementById("admin-transfer-proof-progress-value"),
  adminTransferProofProgressDetail: document.getElementById("admin-transfer-proof-progress-detail"),
  adminTransferProofProgressBar: document.getElementById("admin-transfer-proof-progress-bar"),
  adminTransferCompleteInline: document.getElementById("admin-transfer-complete-inline"),
  adminTransferQueueList: document.getElementById("admin-transfer-queue-list"),
  adminTransferQueueEmpty: document.getElementById("admin-transfer-queue-empty"),
  adminTransferQueueDetail: document.getElementById("admin-transfer-queue-detail"),
  adminTransferQueueTitle: document.getElementById("admin-transfer-queue-title"),
  adminTransferQueueSubtitle: document.getElementById("admin-transfer-queue-subtitle"),
  adminTransferQueueUploads: document.getElementById("admin-transfer-queue-uploads"),
  adminProofList: document.getElementById("admin-proof-list"),
  adminChatBox: document.getElementById("admin-chat-box"),
  adminChatTypingIndicator: document.getElementById("admin-chat-typing-indicator"),
  adminChatForm: document.getElementById("admin-chat-form"),
  adminChatInput: document.getElementById("admin-chat-input"),
  adminProofUpload: document.getElementById("admin-proof-upload"),
  adminPendingAttachments: document.getElementById("admin-pending-attachments"),
  adminUploadProgress: document.getElementById("admin-upload-progress"),
  adminUploadProgressLabel: document.getElementById("admin-upload-progress-label"),
  adminUploadProgressValue: document.getElementById("admin-upload-progress-value"),
  adminUploadProgressDetail: document.getElementById("admin-upload-progress-detail"),
  adminUploadProgressBar: document.getElementById("admin-upload-progress-bar"),
  adminRequestPayment: document.getElementById("admin-request-payment"),
  adminFundsReceived: document.getElementById("admin-funds-received"),
  adminSendPayout: document.getElementById("admin-send-payout"),
  adminCompleteTransaction: document.getElementById("admin-complete-transaction"),
  adminCancelTransaction: document.getElementById("admin-cancel-transaction"),
  adminNavButtons: Array.from(document.querySelectorAll(".admin-nav-btn")),
  adminPages: Array.from(document.querySelectorAll("[data-admin-page-content]")),
  adminPageTitle: document.getElementById("admin-page-title"),
  adminPageEyebrow: document.getElementById("admin-page-eyebrow"),
  adminSidebarTitle: document.getElementById("admin-sidebar-title"),
  adminSupportList: document.getElementById("admin-support-list"),
  adminSupportMessages: document.getElementById("admin-support-messages"),
  adminSupportForm: document.getElementById("admin-support-form"),
  adminSupportInput: document.getElementById("admin-support-input"),
  adminSupportUpload: document.getElementById("admin-support-upload"),
  adminSupportRoomTitle: document.getElementById("admin-support-room-title"),
  adminSupportRoomSubtitle: document.getElementById("admin-support-room-subtitle"),
  adminSupportRoomStatus: document.getElementById("admin-support-room-status"),
  adminSupportUserState: document.getElementById("admin-support-user-state"),
  adminSupportTypingIndicator: document.getElementById("admin-support-typing-indicator"),
  adminNoteModal: document.getElementById("admin-note-modal"),
  adminNoteEyebrow: document.getElementById("admin-note-eyebrow"),
  adminNoteTitle: document.getElementById("admin-note-title"),
  adminNoteInput: document.getElementById("admin-note-input"),
  adminNoteCancel: document.getElementById("admin-note-cancel"),
  adminNoteConfirm: document.getElementById("admin-note-confirm"),
  adminUserProfileModal: document.getElementById("admin-user-profile-modal"),
  closeAdminUserProfileModal: document.getElementById("close-admin-user-profile-modal"),
  adminUserProfileModalAvatar: document.getElementById("admin-user-profile-modal-avatar"),
  adminUserProfileModalRole: document.getElementById("admin-user-profile-modal-role"),
  adminUserProfileModalName: document.getElementById("admin-user-profile-modal-name"),
  adminUserProfileModalBadge: document.getElementById("admin-user-profile-modal-badge"),
  adminUserProfileModalGrid: document.getElementById("admin-user-profile-modal-grid"),
};

let adminNoteResolver = null;

bootstrap().catch((error) => {
  console.error(error);
  showStatus(error.message || "Gagal membuka dashboard admin.", true);
});

window.addEventListener("pointerdown", unlockAdminNotificationAudio, { once: true });
window.addEventListener("keydown", unlockAdminNotificationAudio, { once: true });

elements.adminLogout?.addEventListener("click", async () => {
  await fetchJson("/api/logout", { method: "POST" });
  window.location.href = "/";
});

elements.adminFeeForm.addEventListener("submit", handleSaveFeeSettings);
bindSettingsFormProtection();
elements.adminChatForm.addEventListener("submit", handleAdminSendMessage);
elements.adminChatInput?.addEventListener("input", () => {
  if (!state.activeTransaction?.code) return;
  if (adminTypingStopTimer) window.clearTimeout(adminTypingStopTimer);
  const value = String(elements.adminChatInput?.value || "").trim();
  if (!value) {
    sendAdminTypingState(state.activeTransaction.code, false);
    return;
  }
  sendAdminTypingState(state.activeTransaction.code, true);
  adminTypingStopTimer = window.setTimeout(() => {
    if (state.activeTransaction?.code) sendAdminTypingState(state.activeTransaction.code, false);
  }, 1600);
});
elements.adminProofUpload?.addEventListener("change", renderAdminPendingAttachments);
elements.adminPendingAttachments?.addEventListener("click", handleAdminPendingAttachmentRemove);
elements.adminTransferProofUpload?.addEventListener("change", renderAdminTransferProofPendingAttachments);
elements.adminTransferProofPending?.addEventListener("click", handleAdminTransferProofPendingAttachmentRemove);
elements.adminRequestPayment?.addEventListener("click", () => handleAdminAction("request_buyer_payment"));
elements.adminFundsReceived.addEventListener("click", () => handleAdminAction("funds_received"));
elements.adminSendPayout.addEventListener("click", () => handleAdminAction("send_payout"));
elements.adminCompleteTransaction?.addEventListener("click", () => handleAdminAction("complete_transaction"));
elements.adminCancelTransaction?.addEventListener("click", () => handleAdminAction("cancel_transaction"));
elements.adminSupportForm?.addEventListener("submit", handleAdminSupportMessageSubmit);
elements.adminSupportInput?.addEventListener("input", () => {
  if (!state.activeSupportThreadId) return;
  if (adminSupportTypingStopTimer) window.clearTimeout(adminSupportTypingStopTimer);
  const value = String(elements.adminSupportInput?.value || "").trim();
  if (!value) {
    sendAdminSupportTypingState(false);
    return;
  }
  sendAdminSupportTypingState(true);
  adminSupportTypingStopTimer = window.setTimeout(() => {
    sendAdminSupportTypingState(false);
  }, 1600);
});
elements.adminTransferProofForm?.addEventListener("submit", handleAdminTransferProofSubmit);
elements.adminTransferCompleteInline?.addEventListener("click", () => handleAdminAction("complete_transaction"));
elements.adminNoteCancel?.addEventListener("click", () => closeAdminNoteModal(null));
elements.adminNoteConfirm?.addEventListener("click", () => closeAdminNoteModal(String(elements.adminNoteInput?.value || "").trim()));
elements.closeAdminUserProfileModal?.addEventListener("click", closeAdminUserProfileModal);
document.addEventListener("click", handleAdminProfileTriggerClick);
elements.adminUserSearch?.addEventListener("input", () => {
  renderUsers(state.users);
});
elements.adminVerificationSearch?.addEventListener("input", () => {
  renderVerificationQueue(state.users);
});
elements.profitDateFrom?.addEventListener("input", () => renderSummary(state.users, state.transactions));
elements.profitDateTo?.addEventListener("input", () => renderSummary(state.users, state.transactions));
elements.adminNavButtons.forEach((button) => {
  button.addEventListener("click", () => openAdminPage(button.dataset.adminPage));
});
document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-transfer-account]");
  if (!copyButton) return;
  const value = String(copyButton.dataset.copyTransferAccount || "").trim();
  if (!value) return;
  await navigator.clipboard.writeText(value);
  showStatus("Data rekening penjual berhasil dicopy.");
});

async function bootstrap() {
  const session = await fetchJson("/api/session");
  if (!session.user || !session.user.isAdmin) {
    showStatus("Akses admin diperlukan. Login dengan akun admin terlebih dahulu.", true);
    elements.adminUserCard.innerHTML = "<strong>Akun ini belum memiliki akses admin.</strong>";
    return;
  }

  state.currentUser = session.user;
  ensureAdminNotificationState();
  renderAdminUser(session.user);
  initResizableLayouts();
  setupAdminLiveEvents();
  await refreshDashboardData();
  openAdminPage("overview");
  startAdminRoomRefresh();
  if (adminPresenceTickTimer) window.clearInterval(adminPresenceTickTimer);
  adminPresenceTickTimer = window.setInterval(() => {
    renderUsers(state.users);
    renderVerificationQueue(state.users);
  }, 15000);
  window.RekberPush?.ensurePushEnabled?.({ audience: "admin" }).catch(() => {});
}

async function refreshDashboardData() {
  const [usersPayload, transactionsPayload, settingsPayload, supportPayload] = await Promise.all([
    fetchJson("/api/admin/users"),
    fetchJson("/api/admin/transactions"),
    fetchJson("/api/admin/settings"),
    fetchJson("/api/admin/support-threads"),
  ]);

  state.users = usersPayload.users || [];
  state.transactions = transactionsPayload.transactions || [];
  state.settings = settingsPayload.settings;
  state.supportThreads = supportPayload.threads || [];
  ensureAdminNotificationState();

  if (state.activeTransaction) {
    state.activeTransaction = state.transactions.find((item) => item.code === state.activeTransaction.code) || null;
  }

  renderSummary(state.users, state.transactions);
  renderUsers(state.users);
  renderVerificationQueue(state.users);
  if (isSettingsFormProtected()) {
    renderFeeSettingsMeta(state.settings);
  } else {
    renderFeeSettings(state.settings);
  }
  if (state.currentPage === "transactions-transfer-queue") {
    renderTransferQueuePage();
  } else {
    renderTransactionsPage();
    renderActiveTransaction();
  }
  renderSupportThreads();
  updateAdminNotificationBadges();
}

function getAdminNotificationStorageKey() {
  return state.currentUser ? `rekberwe_admin_notifications_${state.currentUser.id}` : "";
}

function ensureAdminNotificationState() {
  if (!state.currentUser) {
    adminNotificationState.initialized = false;
    adminNotificationState.knownTransactionCodes = [];
    adminNotificationState.seenMessagesByCode = {};
    return;
  }
  const storageKey = getAdminNotificationStorageKey();
  if (!storageKey) return;
  if (!adminNotificationState.initialized) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      adminNotificationState.knownTransactionCodes = Array.isArray(saved.knownTransactionCodes) ? saved.knownTransactionCodes : [];
      adminNotificationState.seenMessagesByCode = saved.seenMessagesByCode || {};
    } catch {
      adminNotificationState.knownTransactionCodes = [];
      adminNotificationState.seenMessagesByCode = {};
    }
    if (!adminNotificationState.knownTransactionCodes.length && state.transactions.length) {
      adminNotificationState.knownTransactionCodes = state.transactions.map((transaction) => transaction.code);
    }
    adminNotificationState.initialized = true;
    saveAdminNotificationState();
  }
}

function saveAdminNotificationState() {
  const storageKey = getAdminNotificationStorageKey();
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify({
    knownTransactionCodes: adminNotificationState.knownTransactionCodes,
    seenMessagesByCode: adminNotificationState.seenMessagesByCode,
  }));
}

function markTransactionsAsKnown(codes) {
  let changed = false;
  codes.forEach((code) => {
    if (!adminNotificationState.knownTransactionCodes.includes(code)) {
      adminNotificationState.knownTransactionCodes.push(code);
      changed = true;
    }
  });
  if (changed) saveAdminNotificationState();
}

function getAdminLatestMessageTime(transaction) {
  const lastMessage = transaction?.messages?.[transaction.messages.length - 1];
  return lastMessage?.time || "";
}

function markAdminTransactionSeen(transaction) {
  if (!transaction?.code) return;
  markTransactionsAsKnown([transaction.code]);
  const latestMessageTime = getAdminLatestMessageTime(transaction);
  if (!latestMessageTime) return;
  adminNotificationState.seenMessagesByCode[transaction.code] = latestMessageTime;
  saveAdminNotificationState();
}

function getAdminUnreadCount(transaction) {
  if (!transaction?.messages?.length) return 0;
  const seenAt = adminNotificationState.seenMessagesByCode[transaction.code];
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
  return transaction.messages.filter((message) => {
    const messageTime = new Date(message.time).getTime();
    const isIncoming = message.senderTitle !== "Admin";
    return isIncoming && messageTime > seenTime;
  }).length;
}

function getAdminNewTransactionCount() {
  return state.transactions.filter((transaction) => {
    const isActiveFlow = transaction.paymentStatus !== "Selesai" && transaction.paymentStatus !== "Transaksi dibatalkan" && !transaction.hasDispute;
    if (!isActiveFlow) return false;
    const isUnknown = !adminNotificationState.knownTransactionCodes.includes(transaction.code);
    const hasUnreadIncoming = getAdminUnreadCount(transaction) > 0;
    return isUnknown || hasUnreadIncoming;
  }).length;
}

function getAdminCancelledCount() {
  return (state.transactions || []).filter((transaction) => transaction.paymentStatus === "Transaksi dibatalkan").length;
}

function getAdminDisputeCount() {
  return (state.transactions || []).filter((transaction) => transaction.hasDispute).length;
}

function getAdminTransferQueueCount() {
  return (state.transactions || []).filter((transaction) => transaction.paymentStatus === "Antrian transfer").length;
}

function setAdminButtonBadge(button, count) {
  if (!button) return;
  const existing = button.querySelector(".notif-badge");
  if (!count) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.textContent = String(count > 99 ? "99+" : count);
    return;
  }
  button.insertAdjacentHTML("beforeend", `<span class="notif-badge">${count > 99 ? "99+" : count}</span>`);
}

function unlockAdminNotificationAudio() {
  adminNotificationState.audioUnlocked = true;
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  window.RekberPush?.ensurePushEnabled?.({ audience: "admin" }).catch(() => {});
  window.removeEventListener("pointerdown", unlockAdminNotificationAudio);
  window.removeEventListener("keydown", unlockAdminNotificationAudio);
}

function playAdminNotificationSound(kind = "chat") {
  if (!adminNotificationState.audioUnlocked) return;
  const now = Date.now();
  if (now - adminNotificationState.lastSoundAt < 1200) return;
  adminNotificationState.lastSoundAt = now;
  const customSound = state.settings?.notificationSounds?.admin?.url || state.settings?.notificationSounds?.user?.url || "";
  if (customSound) {
    const audio = new Audio(customSound);
    audio.volume = kind === "transaction" ? 0.9 : 0.75;
    audio.play().catch(() => {});
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = kind === "transaction" ? 980 : 760;
  gain.gain.value = 0.001;
  oscillator.connect(gain);
  gain.connect(context.destination);
  const start = context.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.09, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + (kind === "transaction" ? 0.34 : 0.24));
  oscillator.start(start);
  oscillator.stop(start + (kind === "transaction" ? 0.36 : 0.26));
  oscillator.onended = () => context.close().catch(() => {});
}

async function fetchJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    headers,
    ...options,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.message || "Permintaan admin gagal.");
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
      const text = xhr.responseText || "";
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(payload);
        return;
      }
      reject(new Error(payload.message || "Upload file admin gagal."));
    });

    xhr.addEventListener("error", () => reject(new Error("Koneksi upload admin terputus.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload admin dibatalkan.")));
    xhr.send(formData);
  });
}

function setAdminUploadProgressState(message, percent = 0, stateName = "uploading", detail = "Menyiapkan file admin...") {
  if (!elements.adminUploadProgress) return;
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  elements.adminUploadProgress.classList.remove("hidden", "upload-progress-done", "upload-progress-error");
  if (stateName === "done") elements.adminUploadProgress.classList.add("upload-progress-done");
  if (stateName === "error") elements.adminUploadProgress.classList.add("upload-progress-error");
  elements.adminUploadProgressLabel.textContent = message;
  elements.adminUploadProgressValue.textContent = `${normalized}%`;
  if (elements.adminUploadProgressDetail) elements.adminUploadProgressDetail.textContent = detail;
  elements.adminUploadProgressBar.style.width = `${normalized}%`;
}

function hideAdminUploadProgress() {
  if (!elements.adminUploadProgress) return;
  elements.adminUploadProgress.classList.add("hidden");
  elements.adminUploadProgress.classList.remove("upload-progress-done", "upload-progress-error");
  elements.adminUploadProgressLabel.textContent = "Sedang upload file...";
  elements.adminUploadProgressValue.textContent = "0%";
  if (elements.adminUploadProgressDetail) elements.adminUploadProgressDetail.textContent = "Menyiapkan file admin...";
  elements.adminUploadProgressBar.style.width = "0%";
}

function setAdminTransferProofProgressState(message, percent = 0, stateName = "uploading", detail = "Menyiapkan file transfer...") {
  if (!elements.adminTransferProofProgress) return;
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  elements.adminTransferProofProgress.classList.remove("hidden", "upload-progress-done", "upload-progress-error");
  if (stateName === "done") elements.adminTransferProofProgress.classList.add("upload-progress-done");
  if (stateName === "error") elements.adminTransferProofProgress.classList.add("upload-progress-error");
  elements.adminTransferProofProgressLabel.textContent = message;
  elements.adminTransferProofProgressValue.textContent = `${normalized}%`;
  if (elements.adminTransferProofProgressDetail) elements.adminTransferProofProgressDetail.textContent = detail;
  elements.adminTransferProofProgressBar.style.width = `${normalized}%`;
}

function hideAdminTransferProofProgress() {
  if (!elements.adminTransferProofProgress) return;
  elements.adminTransferProofProgress.classList.add("hidden");
  elements.adminTransferProofProgress.classList.remove("upload-progress-done", "upload-progress-error");
  elements.adminTransferProofProgressLabel.textContent = "Sedang upload bukti transfer...";
  elements.adminTransferProofProgressValue.textContent = "0%";
  if (elements.adminTransferProofProgressDetail) elements.adminTransferProofProgressDetail.textContent = "Menyiapkan file transfer...";
  elements.adminTransferProofProgressBar.style.width = "0%";
}

function toggleAdminChatFormBusy(isBusy) {
  const submitButton = elements.adminChatForm?.querySelector('button[type="submit"]');
  if (elements.adminChatInput) elements.adminChatInput.disabled = isBusy;
  if (elements.adminProofUpload) elements.adminProofUpload.disabled = isBusy;
  if (submitButton) {
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Uploading..." : "Kirim Chat Admin";
  }
}

function toggleAdminTransferProofFormBusy(isBusy) {
  const submitButton = elements.adminTransferProofForm?.querySelector('button[type="submit"]');
  if (elements.adminTransferProofUpload) elements.adminTransferProofUpload.disabled = isBusy;
  if (submitButton) {
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Uploading..." : "Upload bukti TF";
  }
}

function openAdminPage(page) {
  state.currentPage = page;
  const pageKey = page === "transactions-transfer-queue"
    ? "transfer-queue"
    : page.startsWith("transactions-")
      ? "transactions"
      : page;

  elements.adminNavButtons.forEach((button) => {
    button.classList.toggle("active-admin-nav", button.dataset.adminPage === page);
  });
  elements.adminPages.forEach((section) => {
    section.classList.toggle("active-admin-page", section.dataset.adminPageContent === pageKey);
  });

  if (page.startsWith("transactions-")) {
    if (page === "transactions-new") {
      markTransactionsAsKnown(state.transactions.filter(getTransactionPageMeta().filter).map((transaction) => transaction.code));
    }
    if (page === "transactions-transfer-queue") {
      renderTransferQueuePage();
    } else {
      renderTransactionsPage();
      renderActiveTransaction();
    }
    updateAdminNotificationBadges();
  }

  if (page === "settings" && !settingsFormDirty) {
    renderFeeSettings(state.settings);
  }

  if (page === "support") {
    renderSupportThreads();
    fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getAdminHeartbeatBody()) }).catch(() => {});
  }
}

function getTransactionPageMeta() {
  if (state.currentPage === "transactions-completed") {
    return {
      title: "Transaksi Selesai",
      eyebrow: "Transaksi selesai",
      empty: "Belum ada transaksi selesai.",
      filter: (transaction) => transaction.paymentStatus === "Selesai",
    };
  }
  if (state.currentPage === "transactions-cancelled") {
    return {
      title: "Transaksi Dibatalkan",
      eyebrow: "Transaksi dibatalkan",
      empty: "Belum ada transaksi dibatalkan.",
      filter: (transaction) => transaction.paymentStatus === "Transaksi dibatalkan",
    };
  }
  if (state.currentPage === "transactions-transfer-queue") {
    return {
      title: "Antrian Transfer",
      eyebrow: "Transfer ke penjual",
      empty: "Belum ada transaksi dalam antrian transfer.",
      filter: (transaction) => transaction.paymentStatus === "Antrian transfer",
    };
  }
  if (state.currentPage === "transactions-dispute") {
    return {
      title: "Transaksi Sengketa",
      eyebrow: "Transaksi sengketa",
      empty: "Belum ada transaksi sengketa.",
      filter: (transaction) => transaction.hasDispute,
    };
  }
  return {
    title: "Transaksi Baru Masuk",
    eyebrow: "Transaksi baru",
    empty: "Belum ada transaksi baru masuk.",
    filter: (transaction) => transaction.paymentStatus !== "Selesai" && transaction.paymentStatus !== "Transaksi dibatalkan" && !transaction.hasDispute,
  };
}

function renderAdminUser(user) {
  elements.adminUserCard.innerHTML = `
    <p class="mini-label">Admin aktif</p>
    <strong>${escapeHtml(user.displayName)}</strong>
    <p>${escapeHtml(user.provider)} ID: ${escapeHtml(user.socialId)}</p>
    <p>${escapeHtml(user.email || "-")}</p>
    <div class="admin-user-actions">
      <button type="button" class="workspace-back-btn admin-home-shortcut" id="admin-home-shortcut">
        <span aria-hidden="true">←</span>
        <span>Kembali ke website</span>
      </button>
      <button type="button" class="workspace-logout-btn" id="admin-sidebar-logout">Keluar</button>
    </div>
  `;
  document.getElementById("admin-home-shortcut")?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/";
  });
  document.getElementById("admin-sidebar-logout")?.addEventListener("click", async () => {
    await fetchJson("/api/logout", { method: "POST" });
    window.location.href = "/";
  });
}

function renderSummary(users, transactions) {
  const interestedUsers = users.filter((user) => user.interestedInRekber).length;
  const disputes = transactions.filter((transaction) => transaction.hasDispute).length;
  const completed = transactions.filter((transaction) => transaction.paymentStatus === "Selesai").length;
  const waitingVerification = users.filter((user) => user.needsVerificationReview).length;

  elements.adminSummary.innerHTML = `
    <article><p class="mini-label">Total pengguna</p><strong>${users.length}</strong></article>
    <article><p class="mini-label">Pengguna tertarik rekber</p><strong>${interestedUsers}</strong></article>
    <article><p class="mini-label">Total transaksi</p><strong>${transactions.length}</strong></article>
    <article><p class="mini-label">Sengketa aktif</p><strong>${disputes}</strong></article>
    <article><p class="mini-label">Menunggu verifikasi</p><strong>${waitingVerification}</strong></article>
    <article><p class="mini-label">Transaksi selesai</p><strong>${completed}</strong></article>
  `;
  renderProfitSummary(transactions);
}

function renderProfitSummary(transactions) {
  if (!elements.adminProfitSummary || !elements.adminProfitList) return;
  const from = elements.profitDateFrom?.value ? new Date(`${elements.profitDateFrom.value}T00:00:00`) : null;
  const to = elements.profitDateTo?.value ? new Date(`${elements.profitDateTo.value}T23:59:59`) : null;
  const filtered = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.createdAt || transaction.updatedAt || Date.now());
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    return true;
  });
  const completed = filtered.filter((transaction) => transaction.paymentStatus === "Selesai");
  const hold = filtered.filter((transaction) => transaction.adminFundsReceived && !transaction.sellerPayoutSent);
  const canceled = filtered.filter((transaction) => transaction.paymentStatus === "Transaksi dibatalkan");
  const totalProfit = completed.reduce((sum, transaction) => sum + Number(transaction.feeAmount || 0), 0);
  const holdProfit = hold.reduce((sum, transaction) => sum + Number(transaction.feeAmount || 0), 0);

  elements.adminProfitSummary.innerHTML = `
    <article><p class="mini-label">Profit masuk</p><strong>${formatCurrency(totalProfit)}</strong></article>
    <article><p class="mini-label">Transaksi selesai</p><strong>${completed.length}</strong></article>
    <article><p class="mini-label">Hold garansi</p><strong>${hold.length} / ${formatCurrency(holdProfit)}</strong></article>
    <article><p class="mini-label">Dibatalkan</p><strong>${canceled.length}</strong></article>
  `;

  elements.adminProfitList.innerHTML = completed.length
    ? completed.map((transaction) => `
      <article class="admin-item">
        <div class="admin-item-top">
          <h4>${escapeHtml(transaction.title)}</h4>
          <span class="admin-tag">Profit ${escapeHtml(formatCurrency(transaction.feeAmount || 0))}</span>
        </div>
        <p>${escapeHtml(transaction.code)} • ${escapeHtml(formatDate(transaction.createdAt || transaction.updatedAt))}</p>
        <p>Total transaksi: ${escapeHtml(formatCurrency(transaction.price || 0))}</p>
      </article>
    `).join("")
    : "<p>Belum ada transaksi selesai dalam rentang tanggal ini.</p>";
}

function renderUsers(users) {
  const keyword = String(elements.adminUserSearch?.value || "").trim().toLowerCase();
  const filtered = users.filter((user) => matchesUserSearch(user, keyword));
  elements.adminUserList.innerHTML = filtered.length
    ? filtered.map(renderUserCard).join("")
    : "<p>Belum ada pengguna login.</p>";
  bindVerificationReviewButtons();
  bindUserMenuButtons();
}

function renderVerificationQueue(users) {
  const keyword = String(elements.adminVerificationSearch?.value || "").trim().toLowerCase();
  const filtered = users.filter((user) => user.needsVerificationReview && matchesUserSearch(user, keyword));
  elements.adminVerificationList.innerHTML = filtered.length
    ? filtered.map(renderUserCard).join("")
    : "<p>Belum ada pengguna yang menunggu verifikasi.</p>";
  bindVerificationReviewButtons();
  bindUserMenuButtons();
}

function renderUserCard(user) {
  const presence = formatPresenceLabel(user.presence);
  const locationRow = user.locationVerified
    ? `
      <p>Lokasi terverifikasi: Ya</p>
      <p><a href="https://www.google.com/maps?q=${encodeURIComponent(`${user.location?.latitude || 0},${user.location?.longitude || 0}`)}" target="_blank" rel="noreferrer">Lihat di Google Maps</a></p>
      <p class="mini-note">Akurasi: ${escapeHtml(String(user.location?.accuracy || 0))} m</p>
      <p class="mini-note">IP: ${escapeHtml(user.location?.ipAddress || "-")}</p>
      <p class="mini-note">Waktu verifikasi: ${escapeHtml(user.location?.consentTime || user.location?.locationTimestamp || "-")}</p>
    `
    : "<p>Lokasi terverifikasi: Tidak</p>";
  return `
    <article class="admin-item">
      <div class="admin-item-top">
        <h4>${escapeHtml(user.displayName)}</h4>
        <div class="admin-item-actions">
          <span class="admin-tag ${isPresenceOnline(user.presence) ? "" : "admin-tag-muted"}">${escapeHtml(presence)}</span>
          <span class="admin-tag ${user.interestedInRekber ? "" : "admin-tag-muted"}">${user.interestedInRekber ? "Calon pengguna rekber" : "Belum transaksi"}</span>
          <div class="admin-user-menu-wrap">
            <button type="button" class="ghost-btn admin-user-menu-btn" data-user-id="${escapeHtml(user.id)}" title="Kelola user">â‹¯</button>
            <div class="admin-user-menu hidden" id="admin-user-menu-${escapeHtml(user.id)}">
              <button type="button" class="admin-user-menu-item" data-user-id="${escapeHtml(user.id)}" data-user-action="ban">Ban akun</button>
              <button type="button" class="admin-user-menu-item" data-user-id="${escapeHtml(user.id)}" data-user-action="unban">Unban akun</button>
              <button type="button" class="admin-user-menu-item" data-user-id="${escapeHtml(user.id)}" data-user-action="unverify">Unverify akun</button>
            </div>
          </div>
        </div>
      </div>
      <p>${escapeHtml(user.provider)}: ${escapeHtml(user.socialId)}</p>
      <p>Email: ${escapeHtml(user.email || "-")}</p>
      <p>WhatsApp: ${escapeHtml(user.whatsapp || "-")}</p>
      <p>Status aktivitas: ${escapeHtml(presence)}</p>
      ${locationRow}
      <p>Status verifikasi: ${verificationStatusLabel(user.verificationStatus, user.verified)}</p>
      ${user.banned ? `<p class="danger-text">Status akun: Diblokir admin${user.bannedReason ? ` - ${escapeHtml(user.bannedReason)}` : ""}</p>` : ""}
      ${user.verificationNote ? `<p class="warning-text">Catatan admin: ${escapeHtml(user.verificationNote)}</p>` : ""}
      ${user.ktpPhotoUrl ? `<p><a href="${escapeAttribute(user.ktpPhotoUrl)}" target="_blank" rel="noreferrer">Lihat foto KTP</a></p>` : ""}
      ${user.ktpVideoUrl ? `<p><a href="${escapeAttribute(user.ktpVideoUrl)}" target="_blank" rel="noreferrer">Lihat video selfie KTP</a></p>` : ""}
      <p>Total transaksi: ${user.transactionCount}</p>
      ${user.needsVerificationReview ? `
        <div class="action-row">
          <button type="button" class="primary-btn admin-verify-user" data-user-id="${escapeHtml(user.id)}" data-action="approve">Setujui Verifikasi</button>
          <button type="button" class="ghost-btn admin-verify-user" data-user-id="${escapeHtml(user.id)}" data-action="reject">Minta Perbaikan</button>
        </div>
      ` : ""}
    </article>
  `;
}

function bindVerificationReviewButtons() {
  document.querySelectorAll(".admin-verify-user").forEach((button) => {
    button.onclick = () => handleUserVerificationReview(button.dataset.userId, button.dataset.action);
  });
}

function bindUserMenuButtons() {
  document.querySelectorAll(".admin-user-menu-btn").forEach((button) => {
    button.onclick = () => {
      const target = document.getElementById(`admin-user-menu-${button.dataset.userId}`);
      document.querySelectorAll(".admin-user-menu").forEach((menu) => {
        if (menu !== target) menu.classList.add("hidden");
      });
      target?.classList.toggle("hidden");
    };
  });
  document.querySelectorAll(".admin-user-menu-item").forEach((button) => {
    button.onclick = () => {
      document.getElementById(`admin-user-menu-${button.dataset.userId}`)?.classList.add("hidden");
      handleUserMenuAction(button.dataset.userId, button.dataset.userAction);
    };
  });
}

function matchesUserSearch(user, keyword) {
  if (!keyword) return true;
  const haystack = [
    user.displayName,
    user.legalName,
    user.email,
    user.whatsapp,
    user.provider,
    user.socialId,
    user.username,
  ].join(" ").toLowerCase();
  return haystack.includes(keyword);
}

function renderTransactionsPage() {
  if (state.currentPage === "transactions-transfer-queue") return;
  const meta = getTransactionPageMeta();
  const filtered = state.transactions.filter(meta.filter);
  elements.adminPageTitle.textContent = meta.title;
  elements.adminPageEyebrow.textContent = meta.eyebrow;
  elements.adminSidebarTitle.textContent = meta.title;

  elements.adminTransactionList.innerHTML = filtered.length
    ? filtered.map(renderTransactionListItem).join("")
    : `<p class="muted-text">${meta.empty}</p>`;

  document.querySelectorAll(".admin-open-transaction").forEach((button) => {
    button.onclick = () => {
      const found = state.transactions.find((item) => item.code === button.dataset.code);
      state.activeTransaction = found || null;
      if (state.activeTransaction) markAdminTransactionSeen(state.activeTransaction);
      updateActiveAdminTransactionCard();
      renderActiveTransaction();
      updateAdminNotificationBadges();
    };
  });

  document.querySelectorAll(".admin-delete-transaction-btn").forEach((button) => {
    button.onclick = async () => {
      const code = button.dataset.code;
      if (!code) return;
      if (!window.confirm(`Hapus transaksi ${code}? Ini akan membersihkan data testing.`)) return;
      await fetchJson(`/api/admin/transactions/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (state.activeTransaction?.code === code) {
        state.activeTransaction = null;
      }
      await refreshDashboardData();
      showStatus(`Transaksi ${code} berhasil dihapus.`);
    };
  });
}

function renderTransferQueuePage() {
  const meta = getTransactionPageMeta();
  const filtered = state.transactions.filter(meta.filter);
  if (elements.adminTransferQueueList) {
    elements.adminTransferQueueList.innerHTML = filtered.length
      ? filtered.map(renderTransferQueueListItem).join("")
      : `<p class="muted-text">${meta.empty}</p>`;
  }

  if (state.activeTransaction && state.activeTransaction.paymentStatus !== "Antrian transfer") {
    state.activeTransaction = null;
  }
  if (!state.activeTransaction && filtered.length) {
    state.activeTransaction = filtered[0];
  }

  document.querySelectorAll(".admin-open-transfer-queue").forEach((button) => {
    button.onclick = () => {
      const found = state.transactions.find((item) => item.code === button.dataset.code);
      state.activeTransaction = found || null;
      if (state.activeTransaction) markAdminTransactionSeen(state.activeTransaction);
      renderTransferQueuePage();
      updateAdminNotificationBadges();
    };
  });

  renderTransferQueueDetail(state.activeTransaction);
}

function renderTransferQueueListItem(transaction) {
  const sellerAccount = [transaction.sellerBankName, transaction.sellerBankNumber]
    .filter(Boolean)
    .join(" • ") || "Menunggu rekening";
  return `
    <article class="activity-item ${state.activeTransaction?.code === transaction.code ? "is-active" : ""}">
      <button type="button" class="ghost-btn admin-open-transfer-queue transaction-title-btn queue-title-btn" data-code="${escapeHtml(transaction.code)}">
        <div class="transaction-list-top">
          <strong class="transaction-list-title">${escapeHtml(transaction.title)}</strong>
          <span class="admin-tag">Antrian transfer</span>
        </div>
        <span class="transaction-list-code">${escapeHtml(transaction.code)}</span>
        <span class="transaction-list-meta">
          <span>${formatCurrency(transaction.settlement?.sellerReceiveAmount || transaction.price)}</span>
          <span>${escapeHtml(sellerAccount)}</span>
        </span>
      </button>
    </article>
  `;
}

function renderTransferQueueDetail(transaction) {
  if (!elements.adminTransferQueueDetail || !elements.adminTransferQueueEmpty) return;
  if (!transaction || transaction.paymentStatus !== "Antrian transfer") {
    elements.adminTransferQueueDetail.classList.add("hidden");
    elements.adminTransferQueueEmpty.classList.remove("hidden");
    if (elements.adminTransferQueueTitle) elements.adminTransferQueueTitle.textContent = "Pilih transaksi";
    if (elements.adminTransferQueueSubtitle) elements.adminTransferQueueSubtitle.textContent = "Klik judul transaksi di panel kiri untuk melihat detail transfer.";
    if (elements.adminTransferQueueSummary) elements.adminTransferQueueSummary.innerHTML = "";
    if (elements.adminTransferQueueUploads) elements.adminTransferQueueUploads.innerHTML = "";
    return;
  }

  elements.adminTransferQueueEmpty.classList.add("hidden");
  elements.adminTransferQueueDetail.classList.remove("hidden");
  if (elements.adminTransferQueueTitle) elements.adminTransferQueueTitle.textContent = transaction.title;
  if (elements.adminTransferQueueSubtitle) {
    elements.adminTransferQueueSubtitle.textContent = `${transaction.code} | ${formatCurrency(transaction.settlement?.sellerReceiveAmount || transaction.price)} | ${escapeHtml(transaction.sellerBankName || "Bank belum diisi")}`;
  }
  renderAdminTransferQueuePanel(transaction);
  if (elements.adminTransferQueueUploads) {
    elements.adminTransferQueueUploads.innerHTML = transaction.uploads.length
      ? transaction.uploads.map(renderUploadItem).join("")
      : "<div class=\"upload-empty-state\">Belum ada file transaksi.</div>";
  }
  if (elements.adminTransferCompleteInline) {
    elements.adminTransferCompleteInline.disabled = false;
  }
}

function renderTransactionListItem(transaction) {
  return `
    <article class="activity-item ${state.activeTransaction?.code === transaction.code ? "is-active" : ""}">
      <div class="transaction-list-card">
        <button type="button" class="ghost-btn admin-open-transaction transaction-title-btn" data-code="${escapeHtml(transaction.code)}">
          <div class="transaction-list-top">
            <strong class="transaction-list-title">${escapeHtml(transaction.title)}</strong>
            ${getAdminUnreadCount(transaction) ? `<span class="notif-badge list-notif-badge">${getAdminUnreadCount(transaction)}</span>` : ""}
            <span class="admin-tag ${transaction.hasDispute ? "admin-tag-danger" : ""}">${escapeHtml(transaction.paymentStatus)}</span>
          </div>
          <span class="transaction-list-code">${escapeHtml(transaction.code)}</span>
          <span class="transaction-list-meta">
            <span>${formatCurrency(transaction.price)}</span>
            <span>${escapeHtml(transaction.buyer ? transaction.buyer.displayName : "Belum ada pembeli")}</span>
            <span>${escapeHtml(transaction.seller ? transaction.seller.displayName : "Belum ada penjual")}</span>
          </span>
        </button>
        <div class="transaction-list-actions">
          <button type="button" class="ghost-btn admin-delete-transaction-btn" data-code="${escapeHtml(transaction.code)}">Hapus transaksi</button>
        </div>
      </div>
    </article>
  `;
}

function bindSettingsFormProtection() {
  if (!elements.adminFeeForm) return;
  elements.adminFeeForm.addEventListener("input", () => {
    settingsFormDirty = true;
  });
  elements.adminFeeForm.addEventListener("change", () => {
    settingsFormDirty = true;
  });
}

function isSettingsFormProtected() {
  if (settingsFormDirty) return true;
  if (state.currentPage === "settings") return true;
  const active = document.activeElement;
  return Boolean(active && elements.adminFeeForm?.contains(active));
}

function renderFeeSettingsMeta(settings) {
  if (elements.notificationSoundStatus) {
    const userSound = settings?.notificationSounds?.user;
    const adminSound = settings?.notificationSounds?.admin;
    elements.notificationSoundStatus.innerHTML = `
      ${userSound?.url ? `<span>Suara notif pengguna: <a href="${escapeAttribute(userSound.url)}" target="_blank" rel="noreferrer">${escapeHtml(userSound.name || "Preview audio")}</a></span>` : "<span>Suara notif pengguna: default bawaan</span>"}
      ${adminSound?.url ? `<span>Suara notif admin: <a href="${escapeAttribute(adminSound.url)}" target="_blank" rel="noreferrer">${escapeHtml(adminSound.name || "Preview audio")}</a></span>` : "<span>Suara notif admin: default bawaan</span>"}
    `;
  }
  renderStorageInfo(settings?.storageInfo);
}

function renderFeeSettings(settings) {
  const tiers = settings?.accountFeeTiers || [];
  elements.adminPayoutAccount.value = settings?.adminPayoutAccount || "";
  if (elements.customerCareTelegram) elements.customerCareTelegram.value = settings?.customerCareTelegram || "";
  if (elements.customerCareGmail) elements.customerCareGmail.value = settings?.customerCareGmail || "";
  if (elements.officeAddress) elements.officeAddress.value = settings?.officeAddress || "";
  elements.goldFlatFee.value = settings?.goldFlatFee || 0;
  if (elements.termsAndConditions) {
    elements.termsAndConditions.value = settings?.termsAndConditions || "";
  }
  if (elements.accountSecurityGuide) {
    elements.accountSecurityGuide.value = settings?.accountSecurityGuide || "";
  }
  for (let index = 0; index < 4; index += 1) {
    const tier = tiers[index] || { maxAmount: "", fee: "", feeType: "flat" };
    document.getElementById(`tier-${index + 1}-max`).value = tier.maxAmount ?? "";
    document.getElementById(`tier-${index + 1}-fee`).value = tier.fee ?? "";
  }
  renderFeeSettingsMeta(settings);
}

function renderStorageInfo(storageInfo) {
  if (!elements.adminStorageInfo || !storageInfo) return;
  const metricRows = (storageInfo.metrics || []).map((metric) => `
    <div class="storage-meter">
      <div class="storage-meter-top">
        <strong>${escapeHtml(metric.label || "-")}</strong>
        <span>${escapeHtml(metric.usedLabel || "0")} / ${escapeHtml(metric.limitLabel || "-")}</span>
      </div>
      <div class="storage-meter-bar">
        <span style="width:${Math.max(0, Math.min(100, Number(metric.percent || 0)))}%"></span>
      </div>
      <p>${escapeHtml(metric.source || "")} • ${escapeHtml(String(metric.percent || 0))}% terpakai</p>
    </div>
  `).join("");
  elements.adminStorageInfo.innerHTML = `
    <p class="eyebrow">Monitoring storage</p>
    <h4>Provider file aktif: ${escapeHtml(storageInfo.uploadsProvider || "-")}</h4>
    <p>${escapeHtml(storageInfo.note || "")}</p>
    <div class="storage-meter-list">${metricRows}</div>
    <div class="storage-link-list">
      ${storageInfo.cloudinaryEnabled ? `<a href="${escapeAttribute(storageInfo.cloudinaryConsoleUrl)}" target="_blank" rel="noreferrer">Buka Cloudinary Console</a>` : ""}
      ${storageInfo.cloudinaryEnabled ? `<a href="${escapeAttribute(storageInfo.cloudinaryBillingUrl)}" target="_blank" rel="noreferrer">Atur pembayaran Cloudinary</a>` : ""}
      <a href="${escapeAttribute(storageInfo.railwayConsoleUrl)}" target="_blank" rel="noreferrer">Buka Railway Dashboard</a>
      <a href="${escapeAttribute(storageInfo.railwayBillingUrl)}" target="_blank" rel="noreferrer">Atur pembayaran Railway</a>
    </div>
  `;
}

function renderActiveTransaction() {
  if (!state.activeTransaction) {
    elements.adminTransactionRoom.classList.add("hidden");
    elements.adminTransactionEmpty.classList.remove("hidden");
    elements.adminRoomTitle.textContent = "Pilih transaksi";
    elements.adminRoomSubtitle.textContent = "Klik transaksi di panel kiri untuk membuka ruang chat dan kontrol admin.";
    return;
  }

  const transaction = state.activeTransaction;
  adminChatScrollState = captureScrollState(elements.adminChatBox);
  elements.adminTransactionEmpty.classList.add("hidden");
  elements.adminTransactionRoom.classList.remove("hidden");
  elements.adminRoomTitle.textContent = transaction.title;
  elements.adminRoomSubtitle.textContent = `${transaction.code} | ${capitalize(transaction.type)} | ${formatCurrency(transaction.price)}`;
  elements.adminRoomStatusTitle.textContent = transaction.code;
  elements.adminRoomStatus.textContent = transaction.paymentStatus;
  if (elements.adminRoomBuyerName) elements.adminRoomBuyerName.textContent = transaction.buyer?.displayName || "Menunggu pembeli";
  if (elements.adminRoomSellerName) elements.adminRoomSellerName.textContent = transaction.seller?.displayName || "Menunggu penjual";
  renderAdminParticipantAvatars(transaction);
  renderAdminRoomProgress(transaction);
  renderAdminRoomPresence(transaction);
  elements.adminRoomSummary.innerHTML = buildSummaryItems(transaction).map(renderSummaryItem).join("");
  if (elements.adminRoomTimeline) {
    elements.adminRoomTimeline.innerHTML = buildAdminTransactionStatusTimeline(transaction).map(renderAdminTimelineItem).join("");
  }
  renderAdminTransferQueuePanel(transaction);
  if (elements.adminProofList) {
    elements.adminProofList.innerHTML = "";
  }
  const timeline = buildAdminTransactionTimeline(transaction);
  elements.adminChatBox.innerHTML = timeline.map((item) => item.kind === "upload" ? renderAdminChatUploadItem(item, transaction) : renderChatItem(item, transaction)).join("");
  restoreScrollState(elements.adminChatBox, adminChatScrollState);
  markAdminTransactionSeen(transaction);

  const payoutBlockReason = getAdminSendPayoutBlockReason(transaction);
  elements.adminRequestPayment.disabled = !transaction.adminPayoutAccount || Boolean(transaction.adminFundsReceived);
  elements.adminFundsReceived.disabled = Boolean(transaction.adminFundsReceived);
  elements.adminSendPayout.disabled = transaction.paymentStatus === "Antrian transfer"
    || Boolean(transaction.sellerPayoutSent)
    || transaction.paymentStatus === "Selesai"
    || transaction.paymentStatus === "Transaksi dibatalkan";
  elements.adminSendPayout.title = payoutBlockReason || "Masukkan transaksi ke antrian transfer penjual.";
  elements.adminSendPayout.textContent = transaction.paymentStatus === "Antrian transfer"
    ? "Sudah di antrian"
    : payoutBlockReason
      ? "Cek syarat transfer"
      : "Segera di transfer";
  elements.adminCompleteTransaction.disabled = transaction.paymentStatus !== "Antrian transfer";
  if (elements.adminCancelTransaction) {
    elements.adminCancelTransaction.disabled = transaction.paymentStatus === "Transaksi dibatalkan" || transaction.paymentStatus === "Selesai";
  }
  updateAdminNotificationBadges();
}

function renderAdminParticipantAvatars(transaction) {
  if (elements.adminRoomBuyerAvatar) {
    elements.adminRoomBuyerAvatar.innerHTML = transaction.buyer
      ? renderParticipantAvatarMini(transaction.buyer.displayName, transaction.buyer.avatarUrl)
      : "B";
  }
  if (elements.adminRoomSellerAvatar) {
    elements.adminRoomSellerAvatar.innerHTML = transaction.seller
      ? renderParticipantAvatarMini(transaction.seller.displayName, transaction.seller.avatarUrl)
      : "S";
  }
}

function renderParticipantAvatarMini(name, avatarUrl) {
  if (avatarUrl) {
    return `<img src="${escapeAttribute(avatarUrl)}" alt="${escapeAttribute(name || "Profil")}" />`;
  }
  return `<span>${escapeHtml(String(name || "R").trim().charAt(0).toUpperCase() || "R")}</span>`;
}

function renderAdminRoomProgress(transaction) {
  const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : null;
  const fundedAt = transaction.adminFundsReceivedAt ? new Date(transaction.adminFundsReceivedAt) : (transaction.adminFundsReceived ? new Date() : null);
  const reviewedAt = transaction.accountDeliveredAt ? new Date(transaction.accountDeliveredAt) : (transaction.paymentStatus === "Akun sudah diserahkan" || transaction.buyerConfirmedReceived ? new Date() : null);
  const completeAt = transaction.completedAt ? new Date(transaction.completedAt) : (transaction.paymentStatus === "Selesai" ? new Date() : null);
  setAdminProgressStepState(elements.adminProgressCreated, true);
  setAdminProgressStepState(elements.adminProgressFunded, Boolean(transaction.adminFundsReceived));
  setAdminProgressStepState(elements.adminProgressReviewed, transaction.paymentStatus === "Akun sudah diserahkan" || Boolean(transaction.buyerConfirmedReceived) || Boolean(transaction.sellerPayoutSent));
  setAdminProgressStepState(elements.adminProgressComplete, transaction.paymentStatus === "Selesai" || Boolean(transaction.sellerPayoutSent));
  if (elements.adminProgressCreatedTime) elements.adminProgressCreatedTime.textContent = createdAt ? formatDateTime(createdAt) : "-";
  if (elements.adminProgressFundedTime) elements.adminProgressFundedTime.textContent = fundedAt ? formatDateTime(fundedAt) : "-";
  if (elements.adminProgressReviewedTime) elements.adminProgressReviewedTime.textContent = reviewedAt ? formatDateTime(reviewedAt) : "-";
  if (elements.adminProgressCompleteTime) elements.adminProgressCompleteTime.textContent = completeAt ? formatDateTime(completeAt) : "-";
}

function setAdminProgressStepState(element, done) {
  if (!element) return;
  element.classList.toggle("is-active", done);
}

function buildAdminTransactionStatusTimeline(transaction) {
  const deliveredDone = transaction.paymentStatus === "Akun sudah diserahkan"
    || Boolean(transaction.buyerConfirmedReceived)
    || Boolean(transaction.sellerPayoutSent)
    || transaction.paymentStatus === "Antrian transfer"
    || transaction.paymentStatus === "Selesai";
  const checkedDone = Boolean(transaction.buyerConfirmedReceived)
    || Boolean(transaction.sellerPayoutSent)
    || transaction.paymentStatus === "Antrian transfer"
    || transaction.paymentStatus === "Selesai";
  const securedDone = Boolean(transaction.buyerConfirmedReceived)
    || Boolean(transaction.sellerPayoutSent)
    || transaction.paymentStatus === "Selesai";
  const completedDone = Boolean(transaction.sellerPayoutSent) || transaction.paymentStatus === "Selesai";
  return [
    {
      title: "Pesanan dibuat",
      detail: `${transaction.title} dibuat dan siap dipantau admin.`,
      time: transaction.createdAt ? formatDateTime(new Date(transaction.createdAt)) : "-",
      done: true,
    },
    {
      title: "Dana Diamankan",
      detail: transaction.adminFundsReceived ? "Dana pembeli sudah masuk dan diamankan admin." : "Menunggu konfirmasi dana pembeli.",
      time: findAdminTransactionEventTime(transaction, ["dana sudah diterima admin", "dana pembeli sudah masuk"]) || "-",
      done: Boolean(transaction.adminFundsReceived),
    },
    {
      title: "Data/Item diserahkan",
      detail: deliveredDone
        ? "Penjual sudah menyerahkan data / item ke pembeli."
        : "Menunggu penjual menyerahkan data / item.",
      time: findAdminTransactionEventTime(transaction, ["data akun / item sudah diserahkan", "data / item sudah diserahkan"]) || "-",
      done: deliveredDone,
    },
    {
      title: "Data/Item Diperiksa",
      detail: checkedDone
        ? "Pembeli sudah memeriksa data / item yang diterima."
        : "Menunggu pembeli memeriksa data / item.",
      time: findAdminTransactionEventTime(transaction, ["pembeli mengonfirmasi item diterima"]) || "-",
      done: checkedDone,
    },
    {
      title: "Data/Item diamankan",
      detail: securedDone
        ? "Pembeli mengonfirmasi data / item sudah diamankan."
        : "Menunggu pembeli mengamankan data / item dan mengirim konfirmasi.",
      time: findAdminTransactionEventTime(transaction, ["pembeli mengonfirmasi item diterima"]) || "-",
      done: securedDone,
    },
    {
      title: "Selesai",
      detail: completedDone
        ? "Dana sudah diproses ke penjual dan transaksi selesai."
        : "Menunggu admin menyelesaikan transfer dana ke penjual.",
      time: findAdminTransactionEventTime(transaction, ["transaksi dinyatakan selesai", "transfer ke penjual sudah selesai"]) || "-",
      done: completedDone,
    },
  ];
}

function findAdminTransactionEventTime(transaction, snippets = []) {
  const lowered = snippets.map((item) => String(item || "").toLowerCase());
  const message = (transaction.messages || []).find((item) => {
    const text = String(item.text || "").toLowerCase();
    return lowered.some((snippet) => text.includes(snippet));
  });
  return message?.time ? formatDateTime(new Date(message.time)) : "";
}

function renderAdminTimelineItem(item) {
  return `
    <article class="timeline-card-item ${item.done ? "done" : "pending"}">
      <strong>${item.done ? "✓" : "○"}</strong>
      <div>
        <h6>${escapeHtml(item.title)}</h6>
        <p>${escapeHtml(item.detail)}</p>
        <span>${escapeHtml(item.time)}</span>
      </div>
    </article>
  `;
}

function buildAdminTransactionTimeline(transaction) {
  const messages = (transaction.messages || []).map((item) => ({ ...item, kind: "message" }));
  const uploads = (transaction.uploads || []).map((item) => ({ ...item, kind: "upload" }));
  return [...messages, ...uploads].sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime());
}

function renderAdminChatUploadItem(item, transaction = state.activeTransaction) {
  const profile = resolveAdminTransactionProfileForMessage(item, transaction);
  const roleClass = item.senderTitle === "Admin"
    ? "chat-role-admin"
    : item.senderTitle === "Penjual"
      ? "chat-role-seller"
      : item.senderTitle === "Pembeli"
        ? "chat-role-buyer"
        : "chat-role-participant";
  const messageClass = item.senderTitle === "Admin"
    ? "chat-admin"
    : item.sender === state.currentUser?.displayName
      ? "chat-own"
      : "chat-other";
  return `
    <div class="chat-message ${messageClass} ${roleClass}">
      <div class="chat-message-body">
        <button type="button" class="chat-avatar-btn" data-admin-profile-trigger="${escapeAttribute(profile.role)}" title="Lihat profil ${escapeAttribute(item.sender)}">
          ${renderAdminProfileAvatar(profile)}
        </button>
        <div class="chat-message-copy">
          <div class="chat-header">
            <div class="chat-author">
              <button type="button" class="chat-author-btn" data-admin-profile-trigger="${escapeAttribute(profile.role)}"><strong>${escapeHtml(item.sender)}</strong></button>
              <div class="chat-badges">
                <span class="chat-badge chat-badge-role">${escapeHtml(item.senderTitle || "Peserta")}</span>
                <span class="chat-badge ${item.senderVerified ? "chat-badge-verified" : "chat-badge-unverified"}">${item.senderVerified ? "Verified ✓" : "Unverified ✕"}</span>
              </div>
            </div>
            <span>${formatTime(new Date(item.time))}</span>
          </div>
          <div class="chat-upload-block">
            ${renderUploadItem(item)}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function handleSaveFeeSettings(event) {
  event.preventDefault();
  const accountFeeTiers = [];
  for (let index = 0; index < 4; index += 1) {
    const maxAmount = Number(document.getElementById(`tier-${index + 1}-max`).value || 0);
    const fee = Number(document.getElementById(`tier-${index + 1}-fee`).value || 0);
    if (maxAmount > 0) {
      accountFeeTiers.push({ maxAmount, fee, feeType: index === 3 ? "percent" : "flat" });
    }
  }

  const payload = await fetchJson("/api/admin/settings", {
    method: "POST",
    body: JSON.stringify({
      adminPayoutAccount: String(elements.adminPayoutAccount.value || "").trim(),
      customerCareTelegram: String(elements.customerCareTelegram?.value || "").trim(),
      customerCareGmail: String(elements.customerCareGmail?.value || "").trim(),
      officeAddress: String(elements.officeAddress?.value || "").trim(),
      goldFlatFee: Number(elements.goldFlatFee.value || 0),
      accountFeeTiers,
      termsAndConditions: String(elements.termsAndConditions?.value || "").trim(),
      accountSecurityGuide: String(elements.accountSecurityGuide?.value || "").trim(),
    }),
  });

  state.settings = payload.settings;
  const userSoundFile = elements.userNotificationSound?.files?.[0];
  const adminSoundFile = elements.adminNotificationSound?.files?.[0];
  if (userSoundFile || adminSoundFile) {
    const soundForm = new FormData();
    if (userSoundFile) soundForm.append("userNotificationSound", userSoundFile);
    if (adminSoundFile) soundForm.append("adminNotificationSound", adminSoundFile);
    const soundPayload = await uploadWithProgress("/api/admin/settings/notification-sounds", soundForm);
    state.settings = soundPayload.settings;
    if (elements.userNotificationSound) elements.userNotificationSound.value = "";
    if (elements.adminNotificationSound) elements.adminNotificationSound.value = "";
  }
  settingsFormDirty = false;
  renderFeeSettings(state.settings);
  showStatus("Pengaturan berhasil disimpan.");
}

async function handleAdminSendMessage(event) {
  event.preventDefault();
  try {
    if (!state.activeTransaction) {
      showStatus("Pilih transaksi dulu sebelum kirim chat admin.", true);
      return;
    }
    const text = elements.adminChatInput.value.trim();
    const files = Array.from(elements.adminProofUpload.files || []);
    if (!text && !files.length) {
      showStatus("Pesan atau file admin wajib diisi.", true);
      return;
    }

    let latestTransaction = state.activeTransaction;
    if (text) {
      const payload = await fetchJson(`/api/admin/transactions/${state.activeTransaction.code}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      latestTransaction = payload.transaction;
    }

    if (files.length) {
      const uploadDetail = describeSelectedFiles(files);
      setAdminUploadProgressState("Sedang mengupload file admin...", 0, "uploading", uploadDetail);
      toggleAdminChatFormBusy(true);
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("proofFiles", file));
        const uploadPayload = await uploadWithProgress(`/api/admin/transactions/${state.activeTransaction.code}/uploads`, formData, (percent) => {
          setAdminUploadProgressState("Sedang mengupload file admin...", percent, "uploading", uploadDetail);
        });
        latestTransaction = uploadPayload.transaction;
        setAdminUploadProgressState("Upload file admin selesai.", 100, "done", uploadDetail);
      } catch (error) {
        setAdminUploadProgressState(error.message || "Upload file admin gagal.", 100, "error", uploadDetail);
        throw error;
      } finally {
        toggleAdminChatFormBusy(false);
        window.setTimeout(() => hideAdminUploadProgress(), 1600);
      }
    }

    state.activeTransaction = latestTransaction;
    await sendAdminTypingState(state.activeTransaction.code, false);
    adminChatScrollState = { wasNearBottom: true, distanceFromBottom: 0 };
    await refreshDashboardData();
    elements.adminChatForm.reset();
    elements.adminProofUpload.value = "";
    renderAdminPendingAttachments();
    showStatus("Chat admin berhasil dikirim.");
  } catch (error) {
    showStatus(error.message || "Chat admin gagal dikirim.", true);
  }
}

function renderAdminPendingAttachments() {
  if (!elements.adminPendingAttachments || !elements.adminProofUpload) return;
  const files = Array.from(elements.adminProofUpload.files || []);
  if (!files.length) {
    elements.adminPendingAttachments.classList.add("hidden");
    elements.adminPendingAttachments.innerHTML = "";
    return;
  }

  elements.adminPendingAttachments.classList.remove("hidden");
  elements.adminPendingAttachments.innerHTML = files.map((file, index) => renderAdminPendingAttachmentItem(file, index)).join("");
}

function renderAdminTransferProofPendingAttachments() {
  if (!elements.adminTransferProofPending || !elements.adminTransferProofUpload) return;
  const files = Array.from(elements.adminTransferProofUpload.files || []);
  if (!files.length) {
    elements.adminTransferProofPending.classList.add("hidden");
    elements.adminTransferProofPending.innerHTML = "";
    return;
  }

  elements.adminTransferProofPending.classList.remove("hidden");
  elements.adminTransferProofPending.innerHTML = files.map((file, index) => renderAdminPendingAttachmentItem(file, index, "queue")).join("");
}

function handleAdminPendingAttachmentRemove(event) {
  const button = event.target.closest("[data-remove-admin-pending-file]");
  if (!button || !elements.adminProofUpload) return;
  const removeIndex = Number(button.dataset.removeAdminPendingFile);
  const files = Array.from(elements.adminProofUpload.files || []);
  const nextFiles = files.filter((_, index) => index !== removeIndex);
  const transfer = new DataTransfer();
  nextFiles.forEach((file) => transfer.items.add(file));
  elements.adminProofUpload.files = transfer.files;
  renderAdminPendingAttachments();
}

function handleAdminTransferProofPendingAttachmentRemove(event) {
  const button = event.target.closest("[data-remove-admin-transfer-pending-file]");
  if (!button || !elements.adminTransferProofUpload) return;
  const removeIndex = Number(button.dataset.removeAdminTransferPendingFile);
  const files = Array.from(elements.adminTransferProofUpload.files || []);
  const nextFiles = files.filter((_, index) => index !== removeIndex);
  const transfer = new DataTransfer();
  nextFiles.forEach((file) => transfer.items.add(file));
  elements.adminTransferProofUpload.files = transfer.files;
  renderAdminTransferProofPendingAttachments();
}

function renderAdminPendingAttachmentItem(file, index, variant = "chat") {
  const mediaType = getAdminPendingAttachmentType(file);
  const thumb = buildAdminPendingAttachmentPreview(file, mediaType);
  const removeAttr = variant === "queue"
    ? `data-remove-admin-transfer-pending-file="${index}" aria-label="Hapus bukti transfer"`
    : `data-remove-admin-pending-file="${index}" aria-label="Hapus lampiran admin"`;
  return `
    <div class="pending-attachment ${variant === "queue" ? "pending-attachment-queue" : ""}">
      <div class="pending-attachment-thumb">${thumb}</div>
      <div class="pending-attachment-meta">
        <strong>${escapeHtml(file.name)}</strong>
        <span>${escapeHtml(formatBytes(file.size || 0))}</span>
      </div>
      <button type="button" class="pending-attachment-remove" ${removeAttr}>×</button>
    </div>
  `;
}

function getAdminPendingAttachmentType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
}

function buildAdminPendingAttachmentPreview(file, type) {
  if (type === "image") {
    const url = URL.createObjectURL(file);
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(file.name)}" />`;
  }
  return `<span>${type === "video" ? "VIDEO" : "FILE"}</span>`;
}

async function handleAdminAction(action) {
  try {
    if (!state.activeTransaction) {
      showStatus("Pilih transaksi dulu sebelum menjalankan aksi admin.", true);
      return;
    }
    if (action === "send_payout") {
      const payoutBlockReason = getAdminSendPayoutBlockReason(state.activeTransaction);
      if (payoutBlockReason) {
        showStatus(payoutBlockReason, true);
        return;
      }
    }
    const confirmation = getAdminActionConfirmation(action);
    if (confirmation && !window.confirm(confirmation)) return;
    const body = action === "request_buyer_payment"
      ? {
        action,
        account: state.activeTransaction.adminPayoutAccount || "",
        buyerAmount: formatCurrency(state.activeTransaction.settlement?.buyerTransferAmount || state.activeTransaction.price || 0),
      }
      : action === "complete_transaction"
        ? { action }
      : { action };
    const payload = await fetchJson(`/api/admin/transactions/${state.activeTransaction.code}/actions`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    state.activeTransaction = payload.transaction;
    await refreshDashboardData();
    if (action === "complete_transaction") {
      await fetchJson(`/api/admin/transactions/${state.activeTransaction.code}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: "Terima kasih sudah bertransaksi menggunakan RekberWE.id. Semoga transaksi Anda aman dan lancar. Sampai jumpa di transaksi berikutnya." }),
      });
      await refreshDashboardData();
    }
    showStatus(
      action === "request_buyer_payment"
        ? "Instruksi transfer ke admin berhasil dikirim."
        : action === "funds_received"
          ? "Status dana diterima admin sudah diperbarui."
          : action === "complete_transaction"
            ? "Transaksi ditandai selesai."
            : action === "cancel_transaction"
              ? "Transaksi dibatalkan oleh admin."
              : "Transaksi masuk ke antrian transfer penjual.",
    );
  } catch (error) {
    showStatus(error.message || "Aksi admin gagal dijalankan.", true);
  }
}

async function handleUserVerificationReview(userId, action) {
  try {
    const note = action === "reject"
      ? await openAdminNoteModal("Verifikasi", "Tulis alasan minta perbaikan untuk pengguna ini:")
      : "";
    if (action === "reject" && !note) {
      showStatus("Alasan minta perbaikan wajib diisi.", true);
      return;
    }
    await fetchJson(`/api/admin/users/${encodeURIComponent(userId)}/verification`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    });
    await refreshDashboardData();
    showStatus(action === "approve" ? "Verifikasi pengguna disetujui." : "Pengguna diminta memperbaiki data verifikasi.");
  } catch (error) {
    showStatus(error.message || "Review verifikasi gagal.", true);
  }
}

async function handleUserMenuAction(userId, forcedAction = "") {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return;
  const action = String(forcedAction || "").trim().toLowerCase();
  if (!["ban", "unban", "unverify"].includes(action)) return;
  let reason = "";
  if (action === "ban" || action === "unverify") {
    reason = await openAdminNoteModal("Status akun", `Tulis alasan untuk aksi ${action}:`, action === "ban" ? "Melanggar aturan platform." : "Verifikasi perlu diulang.");
    if (!reason) {
      showStatus("Alasan wajib diisi.", true);
      return;
    }
  }
  try {
    await fetchJson(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
    await refreshDashboardData();
    showStatus(
      action === "ban"
        ? "Akun pengguna berhasil diblokir."
        : action === "unban"
          ? "Akun pengguna berhasil dibuka blokirnya."
          : "Status verifikasi pengguna berhasil direset.",
    );
  } catch (error) {
    showStatus(error.message || "Aksi user gagal dijalankan.", true);
  }
}

function buildSummaryItems(transaction) {
  const warrantyText = transaction.warranty || "Tanpa garansi";
  const warrantyHint = transaction.warranty
    ? "Dana diteruskan admin setelah masa garansi selesai."
    : "Tanpa garansi, admin bisa langsung memproses transfer setelah alur selesai.";
  return [
    { label: "ID TRANSAKSI", value: transaction.code, hint: transaction.title },
    { label: "STATUS", htmlValue: renderSummaryStatusChip(transaction.paymentStatus) },
    { label: "NILAI TRANSAKSI", value: formatCurrency(transaction.price) },
    { label: "PEMBAYAR FEE", value: feePayerLabel(transaction.feePayer) },
    { label: "DIBUAT PADA", value: transaction.createdAt ? formatDateTime(new Date(transaction.createdAt)) : "-" },
    { label: "MASA GARANSI", value: warrantyText, hint: warrantyHint },
  ];
}

function renderSummaryItem(item) {
  const valueContent = item.htmlValue || escapeHtml(item.value || "-");
  const hintContent = item.hint ? `<small>${escapeHtml(item.hint)}</small>` : "";
  return `
    <div class="summary-item">
      <span>${escapeHtml(item.label)}</span>
      <div class="summary-item-stack">
        <strong>${valueContent}</strong>
        ${hintContent}
      </div>
    </div>
  `;
}

function renderSummaryStatusChip(status) {
  const normalized = String(status || "").toLowerCase();
  let modifier = "pending";
  if (normalized.includes("selesai")) modifier = "done";
  else if (normalized.includes("sengketa") || normalized.includes("dibatalkan")) modifier = "danger";
  else if (normalized.includes("antrian")) modifier = "info";
  return `<span class="summary-status-chip summary-status-chip-${modifier}">${escapeHtml(status || "-")}</span>`;
}

function renderChatItem(item, transaction = state.activeTransaction) {
  const profile = resolveAdminTransactionProfileForMessage(item, transaction);
  const roleClass = item.senderTitle === "Admin"
    ? "chat-role-admin"
    : item.senderTitle === "Penjual"
      ? "chat-role-seller"
      : item.senderTitle === "Pembeli"
        ? "chat-role-buyer"
        : "chat-role-participant";
  const messageClass = item.senderTitle === "Admin"
    ? "chat-admin"
    : item.sender === state.currentUser?.displayName
      ? "chat-own"
      : "chat-other";
  return `
    <div class="chat-message ${messageClass} ${roleClass}">
      <div class="chat-message-body">
        <button type="button" class="chat-avatar-btn" data-admin-profile-trigger="${escapeAttribute(profile.role)}" title="Lihat profil ${escapeAttribute(item.sender)}">
          ${renderAdminProfileAvatar(profile)}
        </button>
        <div class="chat-message-copy">
          <div class="chat-header">
            <div class="chat-author">
              <button type="button" class="chat-author-btn" data-admin-profile-trigger="${escapeAttribute(profile.role)}"><strong>${escapeHtml(item.sender)}</strong></button>
              <div class="chat-badges">
                <span class="chat-badge chat-badge-role">${escapeHtml(item.senderTitle || "Peserta")}</span>
                <span class="chat-badge ${item.senderVerified ? "chat-badge-verified" : "chat-badge-unverified"}">${item.senderVerified ? "Verified ✓" : "Unverified ✕"}</span>
              </div>
            </div>
            <span>${formatTime(new Date(item.time))}</span>
          </div>
          <p>${formatMessageText(item.text)}</p>
        </div>
      </div>
    </div>
  `;
}

function handleAdminProfileTriggerClick(event) {
  const trigger = event.target.closest("[data-admin-profile-trigger]");
  if (!trigger) return;
  openAdminUserProfileModal(String(trigger.dataset.adminProfileTrigger || ""));
}

function openAdminUserProfileModal(role) {
  const profile = buildAdminTransactionProfileDetails(role, state.activeTransaction);
  if (!profile || !elements.adminUserProfileModal) return;
  elements.adminUserProfileModalAvatar.innerHTML = renderAdminProfileAvatar(profile);
  elements.adminUserProfileModalRole.textContent = profile.title;
  elements.adminUserProfileModalName.textContent = profile.displayName;
  elements.adminUserProfileModalBadge.textContent = profile.verified ? "Verified ✓" : "Unverified ✕";
  elements.adminUserProfileModalBadge.className = `mini-note ${profile.verified ? "chat-badge-verified" : "chat-badge-unverified"}`;
  elements.adminUserProfileModalGrid.innerHTML = buildAdminProfileModalGrid(profile);
  elements.adminUserProfileModal.classList.remove("hidden");
}

function closeAdminUserProfileModal() {
  elements.adminUserProfileModal?.classList.add("hidden");
}

function buildAdminTransactionProfileDetails(role, transaction) {
  if (!transaction) return null;
  if (role === "buyer" && transaction.buyer) return normalizeAdminProfileDetails(transaction.buyer, "Pembeli");
  if (role === "seller" && transaction.seller) return normalizeAdminProfileDetails(transaction.seller, "Penjual");
  if (role === "admin") {
    return normalizeAdminProfileDetails({
      id: state.currentUser?.id || "admin",
      displayName: "RekberWE.id",
      avatar: "/assets/rekberwe-logo-mark.jpg?v=5",
      verificationStatus: "verified",
      verified: true,
      provider: "Admin",
      linkedProviders: [],
      whatsapp: "",
      ktpPhotoUrl: "",
      ktpVideoUrl: "",
    }, "Admin");
  }
  return null;
}

function renderAdminTransferQueuePanel(transaction) {
  if (!elements.adminTransferQueueSummary) return;
  const isQueue = transaction?.paymentStatus === "Antrian transfer";
  if (!isQueue) {
    elements.adminTransferQueueSummary.innerHTML = "";
    return;
  }
  if (elements.adminTransferCompleteInline) {
    elements.adminTransferCompleteInline.disabled = false;
  }
  elements.adminTransferQueueSummary.innerHTML = `
    <article class="step-item queue-step-item">
      <strong>A</strong>
      <div>
        <h4>Dana diterima</h4>
        <p>${escapeHtml(transaction.title)} • ${formatCurrency(transaction.settlement?.buyerTransferAmount || transaction.price)}</p>
      </div>
    </article>
    <article class="step-item queue-step-item">
      <strong>B</strong>
      <div>
        <h4>Dana yang harus dikirim</h4>
        <p>${formatCurrency(transaction.settlement?.sellerReceiveAmount || transaction.price)}</p>
      </div>
    </article>
    <article class="step-item queue-step-item">
      <strong>C</strong>
      <div>
        <h4>No rekening tujuan</h4>
        <p>${escapeHtml(transaction.sellerBankName || "-")} • ${escapeHtml(transaction.sellerBankNumber || "-")} • ${escapeHtml(transaction.sellerBankHolder || "-")}</p>
        <button type="button" class="ghost-btn" data-copy-transfer-account="${escapeAttribute(`${transaction.sellerBankName || ""} | ${transaction.sellerBankNumber || ""} | ${transaction.sellerBankHolder || ""}`)}">Copy rekening</button>
      </div>
    </article>
    <article class="step-item compact-guide-item queue-step-item queue-step-item-note">
      <strong>D</strong>
      <div>
        <h4>Upload bukti transfer</h4>
        <p>Unggah bukti TF agar otomatis terkirim juga ke ruang transaksi.</p>
      </div>
    </article>
  `;
}

async function handleAdminTransferProofSubmit(event) {
  event.preventDefault();
  const transferUploadInput = elements.adminTransferProofUpload;
  try {
    if (!state.activeTransaction) {
      showStatus("Pilih antrian transfer dulu.", true);
      return;
    }
    if (!transferUploadInput?.files?.length) {
      showStatus("Pilih file bukti transfer dulu.", true);
      return;
    }

    const files = Array.from(transferUploadInput.files || []);
    const uploadDetail = describeSelectedFiles(files);
    setAdminTransferProofProgressState("Sedang upload bukti transfer...", 0, "uploading", uploadDetail);
    toggleAdminTransferProofFormBusy(true);

    const formData = new FormData();
    files.forEach((file) => formData.append("proofFiles", file));
    const uploadPayload = await uploadWithProgress(`/api/admin/transactions/${state.activeTransaction.code}/uploads`, formData, (percent) => {
      setAdminTransferProofProgressState("Sedang upload bukti transfer...", percent, "uploading", uploadDetail);
    });
    await fetchJson(`/api/admin/transactions/${state.activeTransaction.code}/messages`, {
      method: "POST",
      body: JSON.stringify({ text: "Admin mengirim bukti transfer dana ke penjual. Silakan cek lampiran pada file transaksi." }),
    });

    state.activeTransaction = uploadPayload.transaction;
    setAdminTransferProofProgressState("Upload bukti transfer selesai.", 100, "done", uploadDetail);
    await refreshDashboardData();
    if (transferUploadInput) transferUploadInput.value = "";
    renderAdminTransferProofPendingAttachments();
    showStatus("Bukti transfer berhasil diunggah dan dikirim ke chat transaksi.");
  } catch (error) {
    setAdminTransferProofProgressState(error.message || "Upload bukti transfer gagal.", 100, "error", "Silakan cek file dan coba lagi.");
    showStatus(error.message || "Upload bukti transfer gagal.", true);
  } finally {
    toggleAdminTransferProofFormBusy(false);
    window.setTimeout(() => hideAdminTransferProofProgress(), 1800);
  }
}

function normalizeAdminProfileDetails(user, title) {
  return {
    ...user,
    title,
    role: title === "Pembeli" ? "buyer" : title === "Penjual" ? "seller" : "admin",
    displayName: user.displayName || user.username || "Pengguna",
    verified: user.verificationStatus === "verified" || Boolean(user.verified),
  };
}

function resolveAdminTransactionProfileForMessage(item, transaction) {
  const senderUserId = String(item.senderUserId || "").trim();
  if (senderUserId && transaction?.buyer?.id === senderUserId) {
    return normalizeAdminProfileDetails(transaction.buyer, "Pembeli");
  }
  if (senderUserId && transaction?.seller?.id === senderUserId) {
    return normalizeAdminProfileDetails(transaction.seller, "Penjual");
  }
  if (item.senderTitle === "Pembeli") return buildAdminTransactionProfileDetails("buyer", transaction) || { role: "buyer", displayName: item.sender, title: "Pembeli", verified: item.senderVerified };
  if (item.senderTitle === "Penjual") return buildAdminTransactionProfileDetails("seller", transaction) || { role: "seller", displayName: item.sender, title: "Penjual", verified: item.senderVerified };
  if (item.senderTitle === "Admin") return buildAdminTransactionProfileDetails("admin", transaction) || { role: "admin", displayName: item.sender, title: "Admin", verified: true };
  return { role: "participant", displayName: item.sender, title: item.senderTitle || "Peserta", verified: item.senderVerified };
}

function renderAdminProfileAvatar(profile) {
  if (profile?.avatar) {
    return `<img src="${escapeAttribute(profile.avatar)}" alt="${escapeAttribute(profile.displayName || "Profil")}" />`;
  }
  const initial = escapeHtml(String(profile?.displayName || profile?.title || "R").trim().charAt(0).toUpperCase() || "R");
  return `<span class="chat-avatar-fallback">${initial}</span>`;
}

function buildAdminProfileModalGrid(profile) {
  const completedCount = countAdminCompletedTransactionsForUser(profile.id);
  const stats = `
    <div class="profile-stat-card">
      <span>Status akun</span>
      <strong>${profile.verified ? "Verified ✓" : "Unverified ✕"}</strong>
    </div>
    <div class="profile-stat-card">
      <span>Transaksi selesai</span>
      <strong>${completedCount} transaksi</strong>
    </div>
    <div class="profile-stat-card">
      <span>Provider utama</span>
      <strong>${escapeHtml(profile.provider || profile.title || "-")}</strong>
    </div>
    <div class="profile-stat-card">
      <span>Judul di transaksi</span>
      <strong>${escapeHtml(profile.title || "-")}</strong>
    </div>
  `;
  if (profile.role === "admin") {
    return `${stats}<div class="profile-stat-card" style="grid-column: 1 / -1;"><span>Kontak customer care</span><strong>Gmail: ${escapeHtml(state.settings?.customerCareGmail || "-")}</strong><strong>Telegram: ${escapeHtml(state.settings?.customerCareTelegram || "-")}</strong></div>`;
  }
  const connectedProviders = new Set([profile.provider, ...(profile.linkedProviders || []).map((item) => item.provider)].filter(Boolean));
  const statuses = [
    buildAdminProfileStatusRow("google", "Google / Gmail", connectedProviders.has("Google")),
    buildAdminProfileStatusRow("facebook", "Facebook", connectedProviders.has("Facebook")),
    buildAdminProfileStatusRow("discord", "Discord", connectedProviders.has("Discord")),
    buildAdminProfileStatusRow("telegram", "Telegram", connectedProviders.has("Telegram")),
    buildAdminProfileStatusRow("whatsapp", "WhatsApp", Boolean(profile.whatsapp)),
    buildAdminProfileStatusRow("location", "Lokasi terverifikasi", Boolean(profile.locationVerified)),
    buildAdminProfileStatusRow("ktp", "Foto KTP", Boolean(profile.ktpPhotoUrl)),
    buildAdminProfileStatusRow("video", "Video selfie KTP", Boolean(profile.ktpVideoUrl)),
  ].join("");
  return `${stats}<div class="profile-stat-card" style="grid-column: 1 / -1;"><span>Status data terhubung</span><div class="profile-status-list">${statuses}</div></div>`;
}

function buildAdminProfileStatusRow(type, label, done) {
  return `
    <div class="profile-status-row">
      <div class="profile-status-label">
        <span class="profile-status-icon ${type}">${renderAdminProfileStatusIcon(type)}</span>
        <span>${label}</span>
      </div>
      <span class="profile-status-badge ${done ? "done" : "pending"}" aria-label="${done ? "Terverifikasi" : "Belum terhubung"}">${done ? "✓" : "✕"}</span>
    </div>
  `;
}

function renderAdminProfileStatusIcon(type) {
  if (type === "google") {
    return `<img src="assets/google-g-logo.svg?v=1" alt="" />`;
  }
  const svgMap = {
    facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.6H16l.4-3h-2.9V8.5c0-.9.3-1.5 1.6-1.5h1.5V4.3c-.3 0-1.2-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H8v3h2.2V21z"/></svg>`,
    discord: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 5.3A15 15 0 0 0 15.2 4l-.2.4a10.2 10.2 0 0 1 3 1.5c-2.8-1.3-5.8-1.3-8 0a10.2 10.2 0 0 1 3-1.5L12.8 4a15 15 0 0 0-3.7 1.3C6.8 8.7 6.2 12 6.4 15.1A15 15 0 0 0 11 17l.6-1a9.2 9.2 0 0 1-1.9-.9l.5-.3c1.8.8 3.8.8 5.6 0l.5.3c-.6.4-1.2.7-1.9.9l.6 1a15 15 0 0 0 4.6-1.9c.3-3.6-.5-6.9-1.7-9.8M10.4 13.1c-.6 0-1.1-.6-1.1-1.3s.5-1.3 1.1-1.3 1.1.6 1.1 1.3-.5 1.3-1.1 1.3m3.2 0c-.6 0-1.1-.6-1.1-1.3s.5-1.3 1.1-1.3 1.1.6 1.1 1.3-.5 1.3-1.1 1.3"/></svg>`,
    telegram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 4.3c.6-.2 1.2.3 1 .9l-3 14.2c-.1.5-.7.8-1.2.5l-4.3-3.2-2.1 2.1c-.3.3-.9.1-.9-.4v-3.1l7.7-7.2-9.6 6.1-4-1.2c-.8-.2-.8-1.3 0-1.6z"/></svg>`,
  };
  if (svgMap[type]) return svgMap[type];
  const labelMap = { whatsapp: "WA", location: "LOC", ktp: "ID", video: "VID" };
  return `<span>${escapeHtml(labelMap[type] || "•")}</span>`;
}

function countAdminCompletedTransactionsForUser(userId) {
  if (!userId) return 0;
  return (state.transactions || []).filter((item) => item.paymentStatus === "Selesai" && (item.buyer?.id === userId || item.seller?.id === userId)).length;
}

function renderUploadItem(item) {
  const mediaType = getUploadType(item);
  const preview = buildUploadPreview(item, mediaType);
  return `
    <div class="upload-item upload-item-${mediaType}">
      <div class="upload-preview-frame">${preview}</div>
      <div class="upload-item-body">
        <strong>${item.url ? `<a href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(item.name)}</a>` : escapeHtml(item.name)}</strong>
        <span>Dikirim oleh ${escapeHtml(item.senderTitle || "Peserta")}: ${escapeHtml(item.sender)} • ${formatTime(new Date(item.time))}</span>
      </div>
    </div>
  `;
}

function getUploadType(item) {
  const source = String(item.name || item.url || "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(source)) return "image";
  if (/\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(source)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(source)) return "audio";
  return "file";
}

function buildUploadPreview(item, type) {
  const safeName = escapeHtml(item.name || "File");
  const safeUrl = escapeAttribute(item.url || "#");
  if (!item.url) {
    return `<div class="upload-file-fallback"><span>FILE</span><strong>${safeName}</strong></div>`;
  }
  if (type === "image") {
    return `<a href="${safeUrl}" target="_blank" rel="noreferrer"><img src="${safeUrl}" alt="${safeName}" loading="lazy" /></a>`;
  }
  if (type === "video") {
    return `<a class="upload-video-link" href="${safeUrl}" target="_blank" rel="noreferrer"><div class="upload-video-thumb"><span>â–¶</span><strong>${safeName}</strong></div></a>`;
  }
  if (type === "audio") {
    return `<audio controls preload="metadata" src="${safeUrl}"></audio>`;
  }
  return `<a class="upload-file-fallback" href="${safeUrl}" target="_blank" rel="noreferrer"><span>FILE</span><strong>${safeName}</strong></a>`;
}

function showStatus(message, isError = false) {
  elements.adminStatus.textContent = message;
  elements.adminStatus.classList.remove("hidden");
  elements.adminStatus.style.background = isError ? "rgba(180, 58, 45, 0.1)" : "rgba(28, 125, 87, 0.1)";
  elements.adminStatus.style.color = isError ? "#b43a2d" : "#1c7d57";
}

function feePayerLabel(value) {
  if (value === "buyer") return "Pembeli";
  if (value === "seller") return "Penjual";
  return "Bagi dua";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTime(date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function capitalize(text) {
  return String(text || "").charAt(0).toUpperCase() + String(text || "").slice(1);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function formatMessageText(value) {
  const raw = escapeHtml(value).replaceAll("\n", "<br>");
  return raw.replace(/((https?:\/\/|\/)([^\s<]+))/g, (match) => {
    const href = match.startsWith("/") ? `${window.location.origin}${match}` : match;
    return `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${match}</a>`;
  });
}

function describeSelectedFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return "Menyiapkan file admin...";
  const first = list[0];
  const totalBytes = list.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const firstPart = list.length === 1
    ? `File: ${first.name}`
    : `File utama: ${first.name} + ${list.length - 1} file lain`;
  return `${firstPart} • Total ukuran ${formatBytes(totalBytes)}`;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

function verificationStatusLabel(status, verified) {
  if (status === "pending") return "Menunggu review admin";
  if (status === "revision_required") return "Perlu perbaikan";
  if (status === "verified" || verified) return "Terverifikasi";
  return "Belum verifikasi";
}

function formatPresenceLabel(presence) {
  if (isPresenceOnline(presence)) return "Online";
  if (!presence?.lastSeenAt) return "Offline";
  return `Aktif ${formatRelativeTime(presence.lastSeenAt)}`;
}

function isPresenceOnline(presence) {
  if (!presence?.lastSeenAt) return false;
  return Date.now() - new Date(presence.lastSeenAt).getTime() <= 30000;
}

function getAdminPresenceStateClass(presence, isTyping = false) {
  if (isTyping) return "typing";
  return isPresenceOnline(presence) ? "online" : "offline";
}

async function sendAdminTypingState(code, isTyping) {
  if (!state.currentUser || !code) return;
  await fetchJson(`/api/transactions/${encodeURIComponent(code)}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  }).catch(() => {});
}

const TYPING_ACTIVE_MS = 5000;

function getActiveSupportTyping(thread) {
  if (!thread?.typing) return {};
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(thread.typing).filter(([, value]) => now - new Date(value).getTime() <= TYPING_ACTIVE_MS),
  );
}

async function sendAdminSupportTypingState(isTyping) {
  const threadId = Number(state.activeSupportThreadId || 0);
  if (!threadId) return;
  await fetchJson(`/api/admin/support-threads/${threadId}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  }).catch(() => {});
}

function buildSupportTypingIndicatorText(thread, excludeUserId) {
  const typing = getActiveSupportTyping(thread);
  const labels = Object.keys(typing)
    .filter((userId) => userId !== excludeUserId)
    .map((userId) => {
      if (thread?.user?.id === userId) return thread.user.displayName || "Pengguna";
      if (String(userId).startsWith("guest:")) return "Guest";
      return "Admin";
    });
  if (!labels.length) return "";
  if (labels.length === 1) return `${labels[0]} sedang mengetik...`;
  if (labels.length === 2) return `${labels[0]} & ${labels[1]} sedang mengetik...`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]} sedang mengetik...`;
}

function getActiveSupportThread() {
  return (state.supportThreads || []).find((item) => item.id === state.activeSupportThreadId) || null;
}

function renderAdminSupportPresence(thread = getActiveSupportThread()) {
  if (!thread) {
    if (elements.adminSupportUserState) {
      elements.adminSupportUserState.textContent = "Offline";
      elements.adminSupportUserState.className = "participant-state offline";
    }
    if (elements.adminSupportTypingIndicator) {
      elements.adminSupportTypingIndicator.classList.add("hidden");
      elements.adminSupportTypingIndicator.textContent = "";
    }
    return;
  }
  const userPresence = thread.user?.presence;
  if (elements.adminSupportUserState) {
    elements.adminSupportUserState.textContent = formatPresenceLabel(userPresence);
    elements.adminSupportUserState.className = `participant-state ${getAdminPresenceStateClass(userPresence)}`;
  }
  const typingText = buildSupportTypingIndicatorText(thread, state.currentUser?.id);
  if (elements.adminSupportTypingIndicator) {
    elements.adminSupportTypingIndicator.classList.toggle("hidden", !typingText);
    elements.adminSupportTypingIndicator.textContent = typingText;
  }
}

function getAdminHeartbeatBody() {
  return {
    activeTransactionCode: state.activeTransaction?.code || "",
    activeSupportThreadId: state.currentPage === "support" && state.activeSupportThreadId ? state.activeSupportThreadId : null,
  };
}

function startAdminSupportPresenceTick() {
  if (adminSupportPresenceTickTimer) window.clearInterval(adminSupportPresenceTickTimer);
  adminSupportPresenceTickTimer = window.setInterval(() => {
    if (state.currentPage === "support") renderAdminSupportPresence();
  }, 5000);
}

function applyAdminPresenceToTransaction(transaction, userId, presence) {
  if (!transaction) return transaction;
  const next = { ...transaction };
  if (next.buyer?.id === userId) {
    next.buyer = { ...next.buyer, presence };
  }
  if (next.seller?.id === userId) {
    next.seller = { ...next.seller, presence };
  }
  return next;
}

function buildTypingIndicatorText(transaction, excludeUserId) {
  if (!transaction?.typing) return "";
  const labels = Object.keys(transaction.typing)
    .filter((userId) => userId !== excludeUserId)
    .map((userId) => {
      if (transaction.buyer?.id === userId) return transaction.buyer.displayName || "Pembeli";
      if (transaction.seller?.id === userId) return transaction.seller.displayName || "Penjual";
      return "Admin";
    });
  if (!labels.length) return "";
  if (labels.length === 1) return `${labels[0]} sedang mengetik...`;
  if (labels.length === 2) return `${labels[0]} & ${labels[1]} sedang mengetik...`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]} sedang mengetik...`;
}

function renderAdminRoomPresence(transaction) {
  if (!transaction) return;
  const typingText = buildTypingIndicatorText(transaction, state.currentUser?.id);

  if (elements.adminRoomBuyerState) {
    elements.adminRoomBuyerState.textContent = formatPresenceLabel(transaction.buyer?.presence);
    elements.adminRoomBuyerState.className = `participant-state ${getAdminPresenceStateClass(transaction.buyer?.presence)}`;
  }
  if (elements.adminRoomSellerState) {
    elements.adminRoomSellerState.textContent = formatPresenceLabel(transaction.seller?.presence);
    elements.adminRoomSellerState.className = `participant-state ${getAdminPresenceStateClass(transaction.seller?.presence)}`;
  }
  if (elements.adminChatTypingIndicator) {
    elements.adminChatTypingIndicator.classList.toggle("hidden", !typingText);
    elements.adminChatTypingIndicator.textContent = typingText;
  }
}

function startAdminRoomPresenceTick() {
  if (adminRoomPresenceTickTimer) window.clearInterval(adminRoomPresenceTickTimer);
  adminRoomPresenceTickTimer = window.setInterval(() => {
    if (state.activeTransaction) renderAdminRoomPresence(state.activeTransaction);
  }, 5000);
}

function formatRelativeTime(value) {
  const diffSeconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.floor(diffHours / 24)} hari lalu`;
}

function getAdminActionConfirmation(action) {
  const confirmations = {
    request_buyer_payment: "Kirim instruksi transfer ke pembeli menggunakan rekening admin yang tersimpan?",
    funds_received: "Yakin dana dari pembeli benar-benar sudah diterima admin? Status ini akan terlihat di ruang transaksi.",
    send_payout: "Masukkan transaksi ini ke antrian transfer? Sistem akan mengirim info rekening penjual ke ruang chat.",
    complete_transaction: "Tandai transaksi ini sebagai selesai?",
    cancel_transaction: "Batalkan transaksi ini dari sisi admin?",
  };
  return confirmations[action] || "";
}

function updateActiveAdminTransactionCard() {
  document.querySelectorAll(".admin-open-transaction").forEach((button) => {
    const article = button.closest(".activity-item");
    if (!article) return;
    article.classList.toggle("is-active", button.dataset.code === state.activeTransaction?.code);
  });
}

function renderSupportThreads() {
  if (!elements.adminSupportList || !elements.adminSupportMessages) return;
  const threads = state.supportThreads || [];
  if (!threads.length) {
    elements.adminSupportList.innerHTML = "<div class=\"upload-empty-state\">Belum ada live chat dari pengguna.</div>";
    elements.adminSupportMessages.innerHTML = "<div class=\"upload-empty-state\">Pilih live chat untuk mulai membalas.</div>";
    if (elements.adminSupportRoomTitle) elements.adminSupportRoomTitle.textContent = "Belum ada live chat";
    if (elements.adminSupportRoomSubtitle) elements.adminSupportRoomSubtitle.textContent = "Percakapan baru dari pengguna akan tampil di sini.";
    if (elements.adminSupportRoomStatus) elements.adminSupportRoomStatus.textContent = "idle";
    return;
  }
  if (!state.activeSupportThreadId) {
    state.activeSupportThreadId = threads[0].id;
  }
  elements.adminSupportList.innerHTML = threads.map((thread) => `
    <article class="activity-item ${thread.id === state.activeSupportThreadId ? "is-active" : ""}">
      <button type="button" class="ghost-btn admin-open-support transaction-title-btn" data-thread-id="${thread.id}">
        <div class="transaction-list-top">
          <strong class="transaction-list-title">${escapeHtml(thread.user?.displayName || thread.messages?.[0]?.sender || "Guest")}</strong>
          ${getAdminSupportUnreadCount(thread) ? `<span class="notif-badge list-notif-badge">${getAdminSupportUnreadCount(thread)}</span>` : ""}
          <span class="admin-tag">${escapeHtml(thread.status || "open")}</span>
        </div>
        <span class="transaction-list-code">Live chat #${thread.id}</span>
      </button>
    </article>
  `).join("");
  document.querySelectorAll(".admin-open-support").forEach((button) => {
    button.onclick = () => {
      state.activeSupportThreadId = Number(button.dataset.threadId);
      renderSupportThreads();
      fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getAdminHeartbeatBody()) }).catch(() => {});
    };
  });
  if (state.currentPage !== "support") {
    updateAdminNotificationBadges();
    return;
  }
  if (!state.activeSupportThreadId) {
    state.activeSupportThreadId = threads[0].id;
  }
  const active = threads.find((item) => item.id === state.activeSupportThreadId) || threads[0];
  if (!active) {
    elements.adminSupportMessages.innerHTML = "<div class=\"upload-empty-state\">Pilih live chat untuk mulai membalas.</div>";
    updateAdminNotificationBadges();
    return;
  }
  if (elements.adminSupportRoomTitle) {
    elements.adminSupportRoomTitle.textContent = active.user?.displayName || active.messages?.[0]?.sender || `Live chat #${active.id}`;
  }
  if (elements.adminSupportRoomSubtitle) {
    elements.adminSupportRoomSubtitle.textContent = `Live chat #${active.id} • ${getAdminSupportUnreadCount(active) ? `${getAdminSupportUnreadCount(active)} pesan belum dibaca` : "Semua pesan sudah dibaca"}`;
  }
  if (elements.adminSupportRoomStatus) {
    elements.adminSupportRoomStatus.textContent = String(active.status || "open");
  }
  markAdminSupportThreadSeen(active);
  elements.adminSupportMessages.innerHTML = active.messages.length
    ? active.messages.map((message) => renderSupportAdminMessage(message, active.user)).join("")
    : "<div class=\"upload-empty-state\">Belum ada pesan live chat.</div>";
  elements.adminSupportMessages.scrollTop = elements.adminSupportMessages.scrollHeight;
  renderAdminSupportPresence(active);
  updateAdminNotificationBadges();
}

function renderSupportAdminMessage(message, threadUser = null) {
  const isAdmin = message.senderRole === "admin";
  const roleClass = isAdmin ? "chat-role-admin" : "chat-role-buyer";
  const messageClass = isAdmin ? "chat-admin" : "chat-other";
  const profile = isAdmin
    ? normalizeAdminProfileDetails({
      displayName: message.sender || "RekberWE.id",
      avatar: "/assets/rekberwe-logo-mark.jpg?v=5",
      verificationStatus: "verified",
      verified: true,
    }, "Admin")
    : normalizeAdminProfileDetails({
      ...(threadUser || {}),
      displayName: message.sender || threadUser?.displayName || "Pengguna",
      avatar: threadUser?.avatar || "",
      verificationStatus: threadUser?.verificationStatus,
      verified: threadUser?.verified,
    }, "Pengguna");

  return `
    <div class="chat-message ${messageClass} ${roleClass}">
      <div class="chat-message-body">
        <div class="chat-avatar-btn" aria-hidden="true">
          ${renderAdminProfileAvatar(profile)}
        </div>
        <div class="chat-message-copy">
          <div class="chat-header">
            <div class="chat-author">
              <strong>${escapeHtml(message.sender)}</strong>
              <div class="chat-badges">
                <span class="chat-badge chat-badge-role">${escapeHtml(isAdmin ? "Admin" : "Pengguna")}</span>
                ${!isAdmin ? `<span class="chat-badge ${profile.verified ? "chat-badge-verified" : "chat-badge-unverified"}">${profile.verified ? "Verified ✓" : "Unverified ✕"}</span>` : ""}
              </div>
            </div>
            <span>${formatTime(new Date(message.time))}</span>
          </div>
          ${message.text ? `<p>${formatMessageText(message.text)}</p>` : ""}
          ${renderSupportAttachment(message)}
        </div>
      </div>
    </div>
  `;
}

async function handleAdminSupportMessageSubmit(event) {
  event.preventDefault();
  const threadId = Number(state.activeSupportThreadId || 0);
  const text = elements.adminSupportInput?.value.trim();
  const files = Array.from(elements.adminSupportUpload?.files || []);
  if (!threadId || (!text && !files.length)) return;
  await sendAdminSupportTypingState(false);
  try {
    let payload = null;
    if (text) {
      payload = await fetchJson(`/api/admin/support-threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    }
    if (files.length) {
      const formData = new FormData();
      files.forEach((file) => formData.append("supportFiles", file));
      payload = await uploadWithProgress(`/api/admin/support-threads/${threadId}/uploads`, formData);
    }
    if (!payload?.thread) {
      throw new Error("Live chat admin gagal diperbarui.");
    }
    state.supportThreads = state.supportThreads.map((thread) => thread.id === threadId ? payload.thread : thread);
    elements.adminSupportForm.reset();
    if (elements.adminSupportUpload) elements.adminSupportUpload.value = "";
    markAdminSupportThreadSeen(payload.thread);
    renderSupportThreads();
    showStatus("Balasan live chat berhasil dikirim.");
  } catch (error) {
    console.error("Live chat admin gagal dikirim:", error);
    showStatus(error.message || "Live chat admin gagal dikirim.", true);
  }
}

function openAdminNoteModal(eyebrow, title, defaultValue = "") {
  if (!elements.adminNoteModal) return Promise.resolve(window.prompt(title, defaultValue) || "");
  elements.adminNoteEyebrow.textContent = eyebrow || "Aksi admin";
  elements.adminNoteTitle.textContent = title || "Masukkan catatan";
  elements.adminNoteInput.value = defaultValue || "";
  elements.adminNoteModal.classList.remove("hidden");
  return new Promise((resolve) => {
    adminNoteResolver = resolve;
  });
}

function closeAdminNoteModal(value) {
  elements.adminNoteModal?.classList.add("hidden");
  if (adminNoteResolver) {
    const resolve = adminNoteResolver;
    adminNoteResolver = null;
    resolve(value);
  }
}

function renderSupportAttachment(message) {
  if (!message.attachmentUrl) return "";
  const safeUrl = escapeAttribute(message.attachmentUrl);
  const safeName = escapeHtml(message.attachmentName || "Lampiran");
  const type = String(message.attachmentType || "").toLowerCase();
  if (type.startsWith("image/")) {
    return `<a class="support-attachment" href="${safeUrl}" target="_blank" rel="noreferrer"><img src="${safeUrl}" alt="${safeName}" loading="lazy" /></a>`;
  }
  return `<a class="support-attachment support-attachment-file" href="${safeUrl}" target="_blank" rel="noreferrer">${safeName}</a>`;
}

function isWarrantyStillActive(transaction) {
  if (!transaction?.warrantyEndsAt) return false;
  return new Date(transaction.warrantyEndsAt).getTime() > Date.now();
}

function getAdminSendPayoutBlockReason(transaction) {
  if (!transaction) return "Pilih transaksi dulu sebelum menjalankan transfer.";
  if (transaction.paymentStatus === "Transaksi dibatalkan") return "Transaksi sudah dibatalkan, dana tidak bisa dimasukkan ke antrian transfer.";
  if (transaction.paymentStatus === "Sengketa dibuka") return "Transaksi masih dalam sengketa. Selesaikan sengketa dulu sebelum transfer ke penjual.";
  if (transaction.paymentStatus === "Antrian transfer") return "Transaksi ini sudah masuk antrian transfer.";
  if (transaction.sellerPayoutSent || transaction.paymentStatus === "Selesai") return "Transfer penjual sudah selesai, tombol edit/transfer tidak bisa dipakai lagi.";
  if (!transaction.adminFundsReceived) return "Dana pembeli belum dikonfirmasi diterima admin.";
  if (!transaction.buyerConfirmedReceived) return "Pembeli belum menekan tombol item diterima.";
  if (!transaction.sellerBankName || !transaction.sellerBankNumber || !transaction.sellerBankHolder) {
    return "Penjual belum mengirim data rekening lengkap.";
  }
  if (isWarrantyStillActive(transaction)) {
    return `Masa garansi masih aktif sampai ${formatDateTime(new Date(transaction.warrantyEndsAt))}. Dana belum bisa masuk antrian transfer.`;
  }
  return "";
}

function getAdminSupportStorageKey() {
  return state.currentUser ? `rekberwe_admin_support_seen_${state.currentUser.id}` : "";
}

function getAdminSupportSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(getAdminSupportStorageKey()) || "{}");
  } catch {
    return {};
  }
}

function saveAdminSupportSeenMap(map) {
  const key = getAdminSupportStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(map));
}

function markAdminSupportThreadSeen(thread) {
  if (!thread?.id || !thread.messages?.length) return;
  const map = getAdminSupportSeenMap();
  map[thread.id] = thread.messages[thread.messages.length - 1].time;
  saveAdminSupportSeenMap(map);
}

function getAdminSupportUnreadCount(thread) {
  if (!thread?.messages?.length) return 0;
  const map = getAdminSupportSeenMap();
  const seenTime = map[thread.id] ? new Date(map[thread.id]).getTime() : 0;
  return thread.messages.filter((message) => {
    const isIncoming = message.senderRole !== "admin";
    return isIncoming && new Date(message.time).getTime() > seenTime;
  }).length;
}

function captureScrollState(container) {
  if (!container) return null;
  const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
  return {
    wasNearBottom: distanceFromBottom <= 36,
    distanceFromBottom,
  };
}

function restoreScrollState(container, snapshot) {
  if (!container) return;
  if (!snapshot || snapshot.wasNearBottom) {
    container.scrollTop = container.scrollHeight;
    return;
  }
  container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight - snapshot.distanceFromBottom);
}

function startAdminRoomRefresh() {
  if (adminRoomRefreshTimer) clearInterval(adminRoomRefreshTimer);
  adminRoomRefreshTimer = setInterval(async () => {
    if (!state.currentUser || !state.activeTransaction) return;
    try {
      const transactionsPayload = await fetchJson("/api/admin/transactions");
      state.transactions = transactionsPayload.transactions || [];
      state.activeTransaction = state.transactions.find((item) => item.code === state.activeTransaction.code) || null;
      renderTransactionsPage();
      renderActiveTransaction();
    } catch (error) {
      console.error("Refresh room admin gagal:", error);
    }
  }, 1200);
}

function initResizableLayouts() {
  document.querySelectorAll(".panel-resizer[data-resizer]").forEach((handle) => {
    const containerId = handle.dataset.resizer;
    const container = document.getElementById(containerId);
    if (!container) return;

    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = parseFloat(getComputedStyle(container).getPropertyValue("--sidebar-width")) || 400;

      const onMove = (moveEvent) => {
        const next = Math.min(680, Math.max(260, startWidth + (moveEvent.clientX - startX)));
        container.style.setProperty("--sidebar-width", `${next}px`);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });
}

function setupAdminLiveEvents() {
  if (adminEventSource) {
    adminEventSource.close();
    adminEventSource = null;
  }
  if (adminPresenceTimer) {
    window.clearInterval(adminPresenceTimer);
    adminPresenceTimer = null;
  }
  adminEventSource = new EventSource("/api/events");
  fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getAdminHeartbeatBody()) }).catch(() => {});
  adminPresenceTimer = window.setInterval(() => {
    fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getAdminHeartbeatBody()) }).catch(() => {});
  }, 15000);
  startAdminRoomPresenceTick();
  startAdminSupportPresenceTick();
  adminEventSource.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      if (!payload.type || payload.type === "connected") return;
      const previousTransactions = state.transactions || [];
      const previousTransaction = previousTransactions.find((item) => item.code === payload.code);
      let shouldPlayChatSound = false;
      let shouldPlayTransactionSound = false;

      if (payload.type === "typing_updated" && payload.code) {
        state.transactions = state.transactions.map((item) => (
          item.code === payload.code ? { ...item, typing: payload.typing || {} } : item
        ));
        if (state.activeTransaction?.code === payload.code) {
          state.activeTransaction = { ...state.activeTransaction, typing: payload.typing || {} };
          renderAdminRoomPresence(state.activeTransaction);
        }
      }

      if (payload.type === "presence_updated" && payload.userId) {
        state.users = (state.users || []).map((user) => user.id === payload.userId ? { ...user, presence: payload.presence } : user);
        state.transactions = state.transactions.map((item) => applyAdminPresenceToTransaction(item, payload.userId, payload.presence));
        state.supportThreads = (state.supportThreads || []).map((thread) => {
          if (thread.user?.id !== payload.userId && thread.userId !== payload.userId) return thread;
          const nextUser = thread.user
            ? { ...thread.user, presence: payload.presence }
            : { id: payload.userId, displayName: "Guest", presence: payload.presence };
          return { ...thread, user: nextUser };
        });
        if (state.activeTransaction) {
          state.activeTransaction = applyAdminPresenceToTransaction(state.activeTransaction, payload.userId, payload.presence);
          renderAdminRoomPresence(state.activeTransaction);
        }
        renderUsers(state.users);
        renderVerificationQueue(state.users);
        if (state.currentPage === "support") renderAdminSupportPresence();
      }

      if (payload.type === "transaction_updated" && payload.transaction) {
        if (!previousTransaction) {
          shouldPlayTransactionSound = true;
        } else {
          const previousMessageCount = previousTransaction.messages?.length || 0;
          const nextMessageCount = payload.transaction.messages?.length || 0;
          const previousUploadCount = previousTransaction.uploads?.length || 0;
          const nextUploadCount = payload.transaction.uploads?.length || 0;
          const lastMessage = payload.transaction.messages?.[nextMessageCount - 1];
          const lastUpload = payload.transaction.uploads?.[nextUploadCount - 1];
          if (nextMessageCount > previousMessageCount && lastMessage && lastMessage.senderTitle !== "Admin") {
            shouldPlayChatSound = true;
          }
          if (nextUploadCount > previousUploadCount && lastUpload && lastUpload.senderTitle !== "Admin") {
            shouldPlayChatSound = true;
          }
        }
      }

      if (payload.type === "support_updated" && payload.thread) {
        const previousThread = (state.supportThreads || []).find((thread) => thread.id === payload.thread.id);
        const previousCount = previousThread?.messages?.length || 0;
        const nextCount = payload.thread.messages?.length || 0;
        const lastMessage = payload.thread.messages?.[nextCount - 1];
        state.supportThreads = [...(state.supportThreads || []).filter((thread) => thread.id !== payload.thread.id), payload.thread]
          .sort((a, b) => new Date(b.updatedAt || b.updated_at || 0) - new Date(a.updatedAt || a.updated_at || 0));
        renderSupportThreads();
        if (!previousThread && nextCount > 0) {
          shouldPlayTransactionSound = true;
        }
        if (nextCount > previousCount && lastMessage?.senderRole !== "admin") {
          shouldPlayChatSound = true;
        }
      }

      if (payload.type === "support_typing_updated" && payload.threadId) {
        state.supportThreads = (state.supportThreads || []).map((thread) => (
          thread.id === payload.threadId ? { ...thread, typing: payload.typing || {} } : thread
        ));
        if (state.currentPage === "support" && state.activeSupportThreadId === payload.threadId) {
          renderAdminSupportPresence();
        }
      }

      if (payload.type === "verification_updated" && payload.user) {
        const previousUser = (state.users || []).find((user) => user.id === payload.user.id);
        state.users = (state.users || []).map((user) => user.id === payload.user.id ? { ...user, ...payload.user, needsVerificationReview: payload.user.verificationStatus === "pending" } : user);
        renderUsers(state.users);
        renderVerificationQueue(state.users);
        if (payload.user.verificationStatus === "pending" && previousUser?.verificationStatus !== "pending") {
          shouldPlayTransactionSound = true;
        }
      }

      if (payload.type === "transaction_deleted" && state.activeTransaction?.code === payload.code) {
        state.activeTransaction = null;
      }

      if (payload.type === "transaction_updated" && payload.transaction && state.activeTransaction?.code === payload.code) {
        state.activeTransaction = payload.transaction;
        renderActiveTransaction();
      }

      await refreshDashboardData();
      updateAdminNotificationBadges();
      if (shouldPlayTransactionSound) {
        playAdminNotificationSound("transaction");
      } else if (shouldPlayChatSound) {
        playAdminNotificationSound("chat");
      }
    } catch (error) {
      console.error("Event stream admin gagal:", error);
    }
  };
  adminEventSource.addEventListener("error", () => {
    if (adminPresenceTimer) window.clearInterval(adminPresenceTimer);
    adminPresenceTimer = null;
  });
}

function updateAdminNotificationBadges() {
  const newTransactionsButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-new");
  const transferQueueButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-transfer-queue");
  const cancelledButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-cancelled");
  const disputeButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-dispute");
  const supportButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "support");
  const verificationButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "verification");
  setAdminButtonBadge(newTransactionsButton, getAdminNewTransactionCount());
  setAdminButtonBadge(transferQueueButton, getAdminTransferQueueCount());
  setAdminButtonBadge(cancelledButton, getAdminCancelledCount());
  setAdminButtonBadge(disputeButton, getAdminDisputeCount());
  setAdminButtonBadge(supportButton, (state.supportThreads || []).reduce((total, thread) => total + getAdminSupportUnreadCount(thread), 0));
  setAdminButtonBadge(verificationButton, (state.users || []).filter((user) => user.needsVerificationReview).length);
}


