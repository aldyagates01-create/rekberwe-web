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
  knownVoucherOrderCodes: [],
  seenVoucherMessagesByCode: {},
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
let adminSessionKeepaliveTimer = null;
let adminLiveEventRetryTimer = null;
let settingsFormDirty = false;

const adminAppConfig = {
  authCallbackParam: "authResult",
};

let providerConfig = null;

const elements = {
  adminUserCard: document.getElementById("admin-user-card"),
  adminStatus: document.getElementById("admin-status"),
  adminSummary: document.getElementById("admin-summary"),
  adminProfitSummary: document.getElementById("admin-profit-summary"),
  adminProfitList: document.getElementById("admin-profit-list"),
  profitDateFrom: document.getElementById("profit-date-from"),
  profitDateTo: document.getElementById("profit-date-to"),
  analyticsDateFrom: document.getElementById("analytics-date-from"),
  analyticsDateTo: document.getElementById("analytics-date-to"),
  analyticsRefreshBtn: document.getElementById("analytics-refresh-btn"),
  adminAnalyticsSummary: document.getElementById("admin-analytics-summary"),
  adminAnalyticsFunnel: document.getElementById("admin-analytics-funnel"),
  adminAnalyticsReferrers: document.getElementById("admin-analytics-referrers"),
  adminAnalyticsPages: document.getElementById("admin-analytics-pages"),
  adminAnalyticsDaily: document.getElementById("admin-analytics-daily"),
  adminUserList: document.getElementById("admin-user-list"),
  adminVerificationList: document.getElementById("admin-verification-list"),
  adminUserSearch: document.getElementById("admin-user-search"),
  adminVerificationSearch: document.getElementById("admin-verification-search"),
  adminTransactionList: document.getElementById("admin-transaction-list"),
  adminLogout: document.getElementById("admin-logout"),
  voucherPaymentBanksList: document.getElementById("voucher-payment-banks-list"),
  voucherPaymentAddBank: document.getElementById("voucher-payment-add-bank"),
  voucherPaymentQrisUrl: document.getElementById("voucher-payment-qris-url"),
  voucherPaymentInstructions: document.getElementById("voucher-payment-instructions"),
  voucherPaymentTerms: document.getElementById("voucher-payment-terms"),
  adminFeeForm: document.getElementById("admin-fee-form"),
  maintenanceSettingsCard: document.getElementById("maintenance-settings-card"),
  maintenanceModeEnabled: document.getElementById("maintenance-mode-enabled"),
  maintenanceModeMessage: document.getElementById("maintenance-mode-message"),
  maintenanceModeStatus: document.getElementById("maintenance-mode-status"),
  saveMaintenanceSettingsBtn: document.getElementById("save-maintenance-settings-btn"),
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
  adminTestEmailTo: document.getElementById("admin-test-email-to"),
  adminSendTestEmail: document.getElementById("admin-send-test-email"),
  adminTestEmailStatus: document.getElementById("admin-test-email-status"),
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
  adminLoginGate: document.getElementById("admin-login-gate"),
  adminLoginGateText: document.getElementById("admin-login-gate-text"),
  adminHeaderLogin: document.getElementById("admin-header-login"),
  adminOpenLoginBtn: document.getElementById("admin-open-login-btn"),
  adminSwitchAccountBtn: document.getElementById("admin-switch-account-btn"),
  adminLoginModal: document.getElementById("admin-login-modal"),
  closeAdminLoginModal: document.getElementById("close-admin-login-modal"),
  adminProviderLoginButtons: Array.from(document.querySelectorAll("#admin-login-modal [data-provider]")),
  adminNotifBtn: document.getElementById("admin-notif-btn"),
  adminNotifBadge: document.getElementById("admin-notif-badge"),
  adminNotifPanel: document.getElementById("admin-notif-panel"),
  adminNotifList: document.getElementById("admin-notif-list"),
  adminNotifClose: document.getElementById("admin-notif-close"),
  adminNotifFloating: document.getElementById("admin-notif-floating"),
};

let adminNoteResolver = null;
let adminUserMenuDelegationBound = false;

function toAdminMenuKey(userId) {
  return String(userId || "user").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function bindAdminUserMenuDelegation() {
  if (adminUserMenuDelegationBound) return;
  adminUserMenuDelegationBound = true;
  document.addEventListener("click", (event) => {
    const menuItem = event.target.closest(".admin-user-menu-item");
    if (menuItem) {
      event.preventDefault();
      event.stopPropagation();
      menuItem.closest(".admin-user-menu")?.classList.add("hidden");
      handleUserMenuAction(menuItem.dataset.userId, menuItem.dataset.userAction);
      return;
    }
    const menuBtn = event.target.closest(".admin-user-menu-btn");
    if (menuBtn) {
      event.preventDefault();
      event.stopPropagation();
      const menu = document.getElementById(`admin-user-menu-${menuBtn.dataset.menuKey}`);
      document.querySelectorAll(".admin-user-menu").forEach((item) => {
        if (item !== menu) item.classList.add("hidden");
      });
      menu?.classList.toggle("hidden");
      return;
    }
    if (!event.target.closest(".admin-user-menu-wrap")) {
      document.querySelectorAll(".admin-user-menu").forEach((menu) => menu.classList.add("hidden"));
    }
  });
}

bootstrap().catch((error) => {
  console.error(error);
  showStatus(error.message || "Gagal membuka dashboard admin.", true);
});

elements.adminHeaderLogin?.addEventListener("click", openAdminLoginModal);
elements.adminOpenLoginBtn?.addEventListener("click", openAdminLoginModal);
elements.closeAdminLoginModal?.addEventListener("click", closeAdminLoginModal);
elements.adminSwitchAccountBtn?.addEventListener("click", async () => {
  await fetchJson("/api/logout", { method: "POST" });
  window.location.href = "/admin";
});
elements.adminProviderLoginButtons.forEach((button) => {
  button.addEventListener("click", () => startAdminProviderLogin(button.dataset.provider));
});
elements.adminLoginModal?.addEventListener("click", (event) => {
  if (event.target === elements.adminLoginModal) closeAdminLoginModal();
});

window.addEventListener("pointerdown", unlockAdminNotificationAudio, { once: true });
window.addEventListener("keydown", unlockAdminNotificationAudio, { once: true });

elements.adminLogout?.addEventListener("click", async () => {
  await fetchJson("/api/logout", { method: "POST" });
  window.location.href = "/";
});

elements.adminFeeForm?.addEventListener("submit", handleSaveFeeSettings);
document.addEventListener("click", (event) => {
  const addBankButton = event.target.closest("#voucher-payment-add-bank");
  if (!addBankButton) return;
  event.preventDefault();
  addVoucherPaymentBankRow();
});
elements.saveMaintenanceSettingsBtn?.addEventListener("click", handleSaveMaintenanceSettings);
bindSettingsFormProtection();
elements.adminSendTestEmail?.addEventListener("click", handleAdminSendTestEmail);
elements.adminChatForm?.addEventListener("submit", handleAdminSendMessage);
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
bindAdminUserMenuDelegation();
elements.closeAdminUserProfileModal?.addEventListener("click", closeAdminUserProfileModal);
document.addEventListener("click", handleAdminProfileTriggerClick);
elements.adminUserSearch?.addEventListener("input", () => {
  renderUsers(state.users);
});
elements.adminVerificationSearch?.addEventListener("input", () => {
  renderVerificationQueue(state.users);
});
elements.analyticsDateFrom?.addEventListener("input", () => loadAdminAnalytics());
elements.analyticsDateTo?.addEventListener("input", () => loadAdminAnalytics());
elements.analyticsRefreshBtn?.addEventListener("click", () => loadAdminAnalytics());
elements.adminNavButtons.forEach((button) => {
  button.addEventListener("click", () => openAdminPage(button.dataset.adminPage));
});
elements.adminNotifBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleAdminNotificationPanel();
});
elements.adminNotifClose?.addEventListener("click", () => closeAdminNotificationPanel());
document.addEventListener("click", (event) => {
  if (!elements.adminNotifFloating?.contains(event.target)) {
    closeAdminNotificationPanel();
  }
});
document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-transfer-account]");
  if (!copyButton) return;
  const value = String(copyButton.dataset.copyTransferAccount || "").trim();
  if (!value) return;
  await navigator.clipboard.writeText(value);
  showStatus("Data rekening penjual berhasil dicopy.");
});

function normalizeAdminProviderName(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "telegram") return "Telegram";
  if (raw === "google" || raw === "gmail") return "Google";
  if (raw === "facebook") return "Facebook";
  if (raw === "discord") return "Discord";
  return "";
}

function applyAdminProviderAvailability() {
  if (!providerConfig?.providers) return;
  const providerMap = new Map(providerConfig.providers.map((item) => [item.name, item]));
  elements.adminProviderLoginButtons.forEach((button) => {
    const provider = providerMap.get(normalizeAdminProviderName(button.dataset.provider));
    if (normalizeAdminProviderName(button.dataset.provider) === "Facebook") {
      button.title = "Login Facebook saat ini sedang pengembangan. Silakan gunakan social media lain.";
      return;
    }
    if (!provider || provider.enabled) return;
    button.disabled = true;
    button.title = `Provider ${button.dataset.provider} belum diaktifkan di backend.`;
  });
}

function openAdminLoginModal() {
  elements.adminLoginModal?.classList.remove("hidden");
}

function closeAdminLoginModal() {
  elements.adminLoginModal?.classList.add("hidden");
}

function startAdminProviderLogin(providerName) {
  const normalized = normalizeAdminProviderName(providerName);
  if (!normalized) return;
  if (normalized === "Facebook") {
    closeAdminLoginModal();
    showStatus("Login Facebook saat ini sedang pengembangan. Silakan login melalui Google, Discord, atau Telegram.", true);
    return;
  }
  closeAdminLoginModal();
  showStatus(`Mengarahkan ke login ${normalized}...`);
  const params = new URLSearchParams();
  params.set("returnTo", "/admin");
  window.location.href = `/auth/${normalized.toLowerCase()}?${params.toString()}`;
}

function handleAdminAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const authResult = params.get(adminAppConfig.authCallbackParam);
  if (!authResult) return;

  const providerName = normalizeAdminProviderName(params.get("provider"));
  const label = providerName || "provider";
  if (authResult === "success") {
    window.RekberAnalytics?.track?.("login_success");
    showStatus(`Login ${label} berhasil. Memuat dashboard admin...`);
  } else {
    const message = params.get("message");
    window.RekberAnalytics?.track?.("login_failed");
    showStatus(`Login ${label} gagal${message ? `: ${message}` : "."}`, true);
  }

  params.delete(adminAppConfig.authCallbackParam);
  params.delete("provider");
  params.delete("message");
  const cleanQuery = params.toString();
  history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
}

function showAdminLoginGate(message, options = {}) {
  document.body.classList.add("admin-locked");
  closeAdminNotificationPanel();
  elements.adminLoginGate?.classList.remove("hidden");
  elements.adminHeaderLogin?.classList.remove("hidden");
  if (elements.adminLoginGateText && message) {
    elements.adminLoginGateText.textContent = message;
  }
  elements.adminSwitchAccountBtn?.classList.toggle("hidden", !options.showSwitchAccount);
  if (elements.adminUserCard) {
    elements.adminUserCard.innerHTML = "<p class=\"mini-label\">Belum login sebagai admin</p>";
  }
  showStatus(message || "Login admin diperlukan.", true);
}

function hideAdminLoginGate() {
  document.body.classList.remove("admin-locked");
  elements.adminLoginGate?.classList.add("hidden");
  elements.adminHeaderLogin?.classList.add("hidden");
  closeAdminLoginModal();
}

async function bootstrap() {
  handleAdminAuthCallback();
  try {
    providerConfig = await fetchJson("/api/config");
    applyAdminProviderAvailability();
  } catch (error) {
    console.warn("Gagal memuat konfigurasi provider login admin:", error);
  }

  const session = await fetchJson("/api/session");
  if (!session.user) {
    showAdminLoginGate("Silakan login dengan akun admin untuk membuka dashboard RekberWE.id.");
    return;
  }

  if (!session.user.isAdmin) {
    showAdminLoginGate(
      `Akun ${session.user.displayName || "ini"} belum memiliki akses admin. Login dengan akun admin yang terdaftar, atau hubungi pemilik sistem.`,
      { showSwitchAccount: true },
    );
    return;
  }

  hideAdminLoginGate();

  state.currentUser = session.user;
  ensureAdminNotificationState();
  renderAdminUser(session.user);
  initResizableLayouts();
  setupAdminLiveEvents();
  startAdminSessionKeepalive();
  await refreshDashboardData();
  openAdminPage("overview");
  window.RekberAdminVoucher?.init();
  await window.RekberAdminVoucher?.refresh?.().catch(() => {});
  ensureAdminVoucherNotificationState();
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

  renderSummary(state.users);
  await loadAdminAnalytics();
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
  if (state.currentPage === "voucher-catalog" || state.currentPage === "voucher-orders") {
    await window.RekberAdminVoucher?.refresh?.();
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
    adminNotificationState.knownVoucherOrderCodes = [];
    adminNotificationState.seenVoucherMessagesByCode = {};
    return;
  }
  const storageKey = getAdminNotificationStorageKey();
  if (!storageKey) return;
  if (!adminNotificationState.initialized) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      adminNotificationState.knownTransactionCodes = Array.isArray(saved.knownTransactionCodes) ? saved.knownTransactionCodes : [];
      adminNotificationState.seenMessagesByCode = saved.seenMessagesByCode || {};
      adminNotificationState.knownVoucherOrderCodes = Array.isArray(saved.knownVoucherOrderCodes) ? saved.knownVoucherOrderCodes : [];
      adminNotificationState.seenVoucherMessagesByCode = saved.seenVoucherMessagesByCode || {};
    } catch {
      adminNotificationState.knownTransactionCodes = [];
      adminNotificationState.seenMessagesByCode = {};
      adminNotificationState.knownVoucherOrderCodes = [];
      adminNotificationState.seenVoucherMessagesByCode = {};
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
    knownVoucherOrderCodes: adminNotificationState.knownVoucherOrderCodes,
    seenVoucherMessagesByCode: adminNotificationState.seenVoucherMessagesByCode,
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

function getAdminVoucherOrders() {
  return window.RekberAdminVoucher?.getOrders?.() || [];
}

function ensureAdminVoucherNotificationState() {
  ensureAdminNotificationState();
  if (!adminNotificationState.knownVoucherOrderCodes.length) {
    const orders = getAdminVoucherOrders();
    if (orders.length) {
      adminNotificationState.knownVoucherOrderCodes = orders.map((order) => order.orderCode);
      saveAdminNotificationState();
    }
  }
}

function markVoucherOrdersAsKnown(codes) {
  let changed = false;
  codes.forEach((code) => {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return;
    if (!adminNotificationState.knownVoucherOrderCodes.includes(normalized)) {
      adminNotificationState.knownVoucherOrderCodes.push(normalized);
      changed = true;
    }
  });
  if (changed) saveAdminNotificationState();
}

function getAdminVoucherLatestMessageTime(order) {
  const lastMessage = order?.messages?.[order.messages.length - 1];
  return lastMessage?.time || order?.updatedAt || "";
}

function markAdminVoucherOrderSeen(order) {
  if (!order?.orderCode) return;
  markVoucherOrdersAsKnown([order.orderCode]);
  const latestMessageTime = getAdminVoucherLatestMessageTime(order);
  if (!latestMessageTime) return;
  adminNotificationState.seenVoucherMessagesByCode[order.orderCode] = latestMessageTime;
  saveAdminNotificationState();
  updateAdminNotificationBadges();
}

function getAdminVoucherUnreadCount(order) {
  if (!order?.messages?.length) return 0;
  const seenAt = adminNotificationState.seenVoucherMessagesByCode[order.orderCode];
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
  return order.messages.filter((message) => {
    const messageTime = new Date(message.time).getTime();
    return message.senderRole !== "admin" && messageTime > seenTime;
  }).length;
}

function isAdminVoucherOrderNew(order) {
  if (!order?.orderCode) return false;
  if (["cancelled", "completed"].includes(order.status)) return false;
  return !adminNotificationState.knownVoucherOrderCodes.includes(order.orderCode);
}

function getAdminVoucherNotificationCount() {
  return getAdminVoucherOrders().filter((order) => {
    if (["cancelled", "completed"].includes(order.status)) {
      return getAdminVoucherUnreadCount(order) > 0;
    }
    return isAdminVoucherOrderNew(order) || getAdminVoucherUnreadCount(order) > 0;
  }).length;
}

function buildAdminNotifications() {
  const items = [];
  getAdminVoucherOrders().forEach((order) => {
    const isNew = isAdminVoucherOrderNew(order);
    const unread = getAdminVoucherUnreadCount(order);
    if (isNew) {
      items.push({
        type: "voucher",
        code: order.orderCode,
        title: "Order GT / Voucher baru",
        text: `${order.product?.name || order.orderCode} • ${order.user?.displayName || "-"}`,
        time: order.createdAt,
      });
    } else if (unread > 0) {
      items.push({
        type: "voucher",
        code: order.orderCode,
        title: "Pesan baru order GT",
        text: `${unread} pesan belum dibaca • ${order.product?.name || order.orderCode}`,
        time: getAdminVoucherLatestMessageTime(order),
      });
    }
  });
  state.transactions.forEach((transaction) => {
    const isActiveFlow = transaction.paymentStatus !== "Selesai" && transaction.paymentStatus !== "Transaksi dibatalkan" && !transaction.hasDispute;
    if (!isActiveFlow) return;
    const isUnknown = !adminNotificationState.knownTransactionCodes.includes(transaction.code);
    const unread = getAdminUnreadCount(transaction);
    if (isUnknown) {
      items.push({
        type: "transaction",
        code: transaction.code,
        title: "Order Rekber baru",
        text: `${transaction.code} • ${transaction.title || "Transaksi baru"}`,
        time: transaction.createdAt,
      });
    } else if (unread > 0) {
      items.push({
        type: "transaction",
        code: transaction.code,
        title: "Pesan baru Rekber",
        text: `${unread} pesan belum dibaca • ${transaction.code}`,
        time: getAdminLatestMessageTime(transaction),
      });
    }
  });
  (state.supportThreads || []).forEach((thread) => {
    const unread = getAdminSupportUnreadCount(thread);
    if (!unread) return;
    const lastMessage = thread.messages?.[thread.messages.length - 1];
    items.push({
      type: "support",
      id: thread.id,
      title: "Live chat masuk",
      text: `${unread} pesan belum dibaca • ${thread.user?.displayName || "Guest"}`,
      time: lastMessage?.time || thread.updatedAt || thread.updated_at,
    });
  });
  return items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function getAdminDashboardNotificationCount() {
  return buildAdminNotifications().length;
}

function setAdminNotifBadge(count) {
  if (!elements.adminNotifBadge) return;
  elements.adminNotifBadge.classList.toggle("hidden", !count);
  elements.adminNotifBadge.textContent = String(count > 99 ? "99+" : count);
}

function renderAdminNotificationPanel() {
  if (!elements.adminNotifList) return;
  const items = buildAdminNotifications();
  setAdminNotifBadge(items.length);
  elements.adminNotifList.innerHTML = items.length
    ? items.map((item) => `
      <button type="button" class="notification-card is-unread admin-notif-item" data-admin-notif-type="${escapeAttribute(item.type)}" data-admin-notif-code="${escapeAttribute(item.code || "")}" data-admin-notif-id="${escapeAttribute(String(item.id || ""))}">
        <div class="notification-card-top">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.time ? formatDateTime(new Date(item.time)) : "")}</span>
        </div>
        <p>${escapeHtml(item.text)}</p>
      </button>
    `).join("")
    : `
      <article class="notification-card">
        <strong>Belum ada notifikasi</strong>
        <p>Notifikasi order GT, Rekber, dan live chat akan tampil di sini.</p>
      </article>
    `;
  elements.adminNotifList.querySelectorAll("[data-admin-notif-type]").forEach((button) => {
    button.addEventListener("click", () => handleAdminNotificationClick(button));
  });
}

function toggleAdminNotificationPanel() {
  if (!elements.adminNotifPanel || !elements.adminNotifBtn) return;
  const willOpen = elements.adminNotifPanel.classList.contains("hidden");
  elements.adminNotifPanel.classList.toggle("hidden", !willOpen);
  elements.adminNotifBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  if (willOpen) renderAdminNotificationPanel();
}

function closeAdminNotificationPanel() {
  elements.adminNotifPanel?.classList.add("hidden");
  elements.adminNotifBtn?.setAttribute("aria-expanded", "false");
}

async function handleAdminNotificationClick(button) {
  const type = button.dataset.adminNotifType;
  const code = button.dataset.adminNotifCode;
  const threadId = Number(button.dataset.adminNotifId || 0);
  closeAdminNotificationPanel();
  if (type === "voucher" && code) {
    openAdminPage("voucher-orders");
    await window.RekberAdminVoucher?.refresh?.();
    await window.RekberAdminVoucher?.openOrder?.(code);
    return;
  }
  if (type === "transaction" && code) {
    openAdminPage("transactions-new");
    const found = state.transactions.find((item) => item.code === code);
    if (found) {
      state.activeTransaction = found;
      markAdminTransactionSeen(found);
      updateActiveAdminTransactionCard();
      renderActiveTransaction();
    }
    updateAdminNotificationBadges();
    return;
  }
  if (type === "support" && threadId) {
    openAdminPage("support");
    state.activeSupportThreadId = threadId;
    renderSupportThreads();
    updateAdminNotificationBadges();
  }
}

window.getAdminVoucherUnreadCount = getAdminVoucherUnreadCount;
window.isAdminVoucherOrderNew = isAdminVoucherOrderNew;
window.markAdminVoucherOrderSeen = markAdminVoucherOrderSeen;
window.updateAdminNotificationBadges = updateAdminNotificationBadges;

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
  return (state.transactions || []).filter(isInTransferQueue).length;
}

function isTransferQueueExcluded(transaction) {
  if (!transaction) return true;
  if (transaction.paymentStatus === "Transaksi dibatalkan" || transaction.hasDispute) return true;
  if (transaction.sellerPayoutSent || transaction.paymentStatus === "Selesai") return true;
  return false;
}

function isTransferPrerequisiteMet(transaction) {
  if (!transaction) return false;
  return Boolean(
    transaction.adminFundsReceived
    && transaction.buyerConfirmedReceived
    && transaction.sellerBankName
    && transaction.sellerBankNumber
    && transaction.sellerBankHolder,
  );
}

function isWarrantyHoldTransaction(transaction) {
  if (isTransferQueueExcluded(transaction)) return false;
  if (!isTransferPrerequisiteMet(transaction)) return false;
  return isWarrantyStillActive(transaction);
}

function isTransferQueueProcessable(transaction) {
  if (isTransferQueueExcluded(transaction)) return false;
  return transaction.paymentStatus === "Antrian transfer" && !isWarrantyStillActive(transaction);
}

function isInTransferQueue(transaction) {
  return isWarrantyHoldTransaction(transaction) || isTransferQueueProcessable(transaction);
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

function playAdminNotificationSound(kind = "chat", meta = {}) {
  window.RekberDesktop?.notify?.({
    title: String(meta.title || (kind === "transaction" ? "Aktivitas baru — RekberWE Admin" : "Pesan baru — RekberWE Admin")),
    body: String(meta.body || (kind === "transaction"
      ? "Ada order, transaksi, atau aktivitas admin yang perlu dicek."
      : "Ada pesan chat baru masuk.")),
  });
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

  if (page === "overview") {
    loadAdminAnalytics();
  }

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

  if (page === "voucher-catalog" || page === "voucher-orders") {
    window.RekberAdminVoucher?.refresh?.().catch(() => {});
  }

  if (page === "voucher-orders") {
    markVoucherOrdersAsKnown(getAdminVoucherOrders().map((order) => order.orderCode));
    getAdminVoucherOrders().forEach((order) => markAdminVoucherOrderSeen(order));
    updateAdminNotificationBadges();
  }

  if (page === "voucher-data") {
    window.RekberAdminVoucher?.refresh?.().catch(() => {});
    window.RekberAdminVoucher?.refreshReport?.().catch(() => {});
  }
}

function getTransactionPageMeta() {
  if (state.currentPage === "transactions-completed") {
    return {
      title: "Selesai Rekber",
      eyebrow: "Rekber selesai",
      empty: "Belum ada transaksi Rekber selesai.",
      filter: (transaction) => transaction.paymentStatus === "Selesai",
    };
  }
  if (state.currentPage === "transactions-cancelled") {
    return {
      title: "Batal Rekber",
      eyebrow: "Rekber dibatalkan",
      empty: "Belum ada transaksi Rekber dibatalkan.",
      filter: (transaction) => transaction.paymentStatus === "Transaksi dibatalkan",
    };
  }
  if (state.currentPage === "transactions-transfer-queue") {
    return {
      title: "Antrian Transfer Rekber",
      eyebrow: "Transfer Rekber",
      empty: "Belum ada transaksi Rekber dalam antrian transfer atau masa garansi.",
      filter: isInTransferQueue,
    };
  }
  if (state.currentPage === "transactions-dispute") {
    return {
      title: "Sengketa Rekber",
      eyebrow: "Rekber sengketa",
      empty: "Belum ada transaksi Rekber sengketa.",
      filter: (transaction) => transaction.hasDispute,
    };
  }
  return {
    title: "Rekber masuk",
    eyebrow: "Rekber baru",
    empty: "Belum ada transaksi Rekber baru masuk.",
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

function renderSummary(users) {
  const interestedUsers = users.filter((user) => user.interestedInRekber).length;
  const waitingVerification = users.filter((user) => user.needsVerificationReview).length;
  const verifiedUsers = users.filter((user) => user.verified || user.verificationStatus === "verified").length;
  const bannedUsers = users.filter((user) => user.banned).length;

  elements.adminSummary.innerHTML = `
    <article><p class="mini-label">Total pengguna</p><strong>${users.length}</strong></article>
    <article><p class="mini-label">Pengguna tertarik rekber</p><strong>${interestedUsers}</strong></article>
    <article><p class="mini-label">Pengguna terverifikasi</p><strong>${verifiedUsers}</strong></article>
    <article><p class="mini-label">Menunggu verifikasi</p><strong>${waitingVerification}</strong></article>
    <article><p class="mini-label">Pengguna diblokir</p><strong>${bannedUsers}</strong></article>
  `;
}

function ensureAnalyticsDateDefaults() {
  if (!elements.analyticsDateTo?.value) {
    const today = new Date();
    elements.analyticsDateTo.value = today.toISOString().slice(0, 10);
  }
  if (!elements.analyticsDateFrom?.value) {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    elements.analyticsDateFrom.value = from.toISOString().slice(0, 10);
  }
}

const ANALYTICS_REFERRER_LABELS = {
  direct: "Langsung",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  google: "Google",
  facebook: "Facebook",
  other: "Lainnya",
};

const ANALYTICS_FUNNEL_LABELS = {
  pageview: "Kunjungan halaman",
  open_transaction_link: "Buka link transaksi",
  create_transaction_click: "Klik buat transaksi",
  create_transaction_success: "Transaksi dibuat",
  login_success: "Login berhasil",
  join_transaction: "Join ruang transaksi",
};

async function loadAdminAnalytics() {
  if (!elements.adminAnalyticsSummary) return;
  ensureAnalyticsDateDefaults();
  try {
    const params = new URLSearchParams();
    if (elements.analyticsDateFrom?.value) params.set("from", elements.analyticsDateFrom.value);
    if (elements.analyticsDateTo?.value) params.set("to", elements.analyticsDateTo.value);
    const payload = await fetchJson(`/api/admin/analytics?${params.toString()}`);
    renderAdminAnalytics(payload.analytics);
  } catch (error) {
    elements.adminAnalyticsSummary.innerHTML = `<p class="muted-text">${escapeHtml(error.message || "Gagal memuat analytics pengunjung.")}</p>`;
  }
}

function renderAdminAnalytics(analytics) {
  if (!analytics || !elements.adminAnalyticsSummary) return;
  const mobileVisitors = (analytics.devices || []).find((item) => item.device === "mobile")?.visitors || 0;
  const desktopVisitors = (analytics.devices || []).find((item) => item.device === "desktop")?.visitors || 0;

  elements.adminAnalyticsSummary.innerHTML = `
    <article><p class="mini-label">Pengunjung unik</p><strong>${analytics.uniqueVisitors || 0}</strong></article>
    <article><p class="mini-label">Total pageview</p><strong>${analytics.totalPageviews || 0}</strong></article>
    <article><p class="mini-label">Konversi login</p><strong>${analytics.conversion?.loginRate || 0}%</strong></article>
    <article><p class="mini-label">Konversi buat transaksi</p><strong>${analytics.conversion?.transactionRate || 0}%</strong></article>
    <article><p class="mini-label">Mobile / Desktop</p><strong>${mobileVisitors} / ${desktopVisitors}</strong></article>
    <article><p class="mini-label">Konversi join transaksi</p><strong>${analytics.conversion?.joinRate || 0}%</strong></article>
  `;

  if (elements.adminAnalyticsFunnel) {
    const funnelItems = Object.entries(analytics.funnel || {});
    const maxValue = Math.max(...funnelItems.map(([, value]) => Number(value || 0)), 1);
    elements.adminAnalyticsFunnel.innerHTML = `
      <p class="eyebrow">Funnel pengunjung</p>
      <div class="admin-analytics-funnel-list">
        ${funnelItems.map(([key, value]) => `
          <article class="admin-analytics-funnel-item">
            <div class="admin-analytics-funnel-top">
              <strong>${escapeHtml(ANALYTICS_FUNNEL_LABELS[key] || key)}</strong>
              <span>${Number(value || 0)} pengunjung</span>
            </div>
            <div class="admin-analytics-bar-track">
              <span style="width:${Math.max(8, (Number(value || 0) / maxValue) * 100)}%"></span>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  if (elements.adminAnalyticsReferrers) {
    elements.adminAnalyticsReferrers.innerHTML = `
      <p class="eyebrow">Sumber traffic</p>
      ${(analytics.referrers || []).length
        ? (analytics.referrers || []).map((item) => `
          <article class="admin-item">
            <div class="admin-item-top">
              <h4>${escapeHtml(ANALYTICS_REFERRER_LABELS[item.source] || item.source)}</h4>
              <span class="admin-tag">${Number(item.visitors || 0)} unik</span>
            </div>
            <p>${Number(item.count || 0)} pageview</p>
          </article>
        `).join("")
        : "<p class=\"muted-text\">Belum ada data sumber traffic.</p>"}
    `;
  }

  if (elements.adminAnalyticsPages) {
    elements.adminAnalyticsPages.innerHTML = `
      <p class="eyebrow">Halaman populer</p>
      ${(analytics.topPages || []).length
        ? (analytics.topPages || []).map((item) => `
          <article class="admin-item">
            <div class="admin-item-top">
              <h4>${escapeHtml(item.path || "/")}</h4>
              <span class="admin-tag">${Number(item.views || 0)} view</span>
            </div>
            <p>${Number(item.visitors || 0)} pengunjung unik</p>
          </article>
        `).join("")
        : "<p class=\"muted-text\">Belum ada data halaman populer.</p>"}
    `;
  }

  if (elements.adminAnalyticsDaily) {
    const daily = analytics.daily || [];
    const maxDaily = Math.max(...daily.map((item) => Number(item.visitors || 0)), 1);
    elements.adminAnalyticsDaily.innerHTML = `
      <p class="eyebrow">Tren harian (${escapeHtml(analytics.range?.from || "-")} s/d ${escapeHtml(analytics.range?.to || "-")})</p>
      ${daily.length
        ? `<div class="admin-analytics-daily-list">${daily.map((item) => `
          <article class="admin-analytics-daily-item">
            <div class="admin-analytics-funnel-top">
              <strong>${escapeHtml(item.date || "-")}</strong>
              <span>${Number(item.visitors || 0)} unik • ${Number(item.pageviews || 0)} view</span>
            </div>
            <div class="admin-analytics-bar-track">
              <span style="width:${Math.max(8, (Number(item.visitors || 0) / maxDaily) * 100)}%"></span>
            </div>
          </article>
        `).join("")}</div>`
        : "<p class=\"muted-text\">Belum ada tren harian pada rentang tanggal ini.</p>"}
    `;
  }
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
  const warrantyHold = filtered.filter(isWarrantyHoldTransaction);
  const readyTransfer = filtered.filter(isTransferQueueProcessable);
  const canceled = filtered.filter((transaction) => transaction.paymentStatus === "Transaksi dibatalkan");
  const totalProfit = completed.reduce((sum, transaction) => sum + Number(transaction.feeAmount || 0), 0);
  const warrantyHoldProfit = warrantyHold.reduce((sum, transaction) => sum + Number(transaction.feeAmount || 0), 0);

  elements.adminProfitSummary.innerHTML = `
    <article><p class="mini-label">Profit masuk</p><strong>${formatCurrency(totalProfit)}</strong></article>
    <article><p class="mini-label">Transaksi selesai</p><strong>${completed.length}</strong></article>
    <article><p class="mini-label">Hold masa garansi</p><strong>${warrantyHold.length} / ${formatCurrency(warrantyHoldProfit)}</strong></article>
    <article><p class="mini-label">Siap transfer</p><strong>${readyTransfer.length}</strong></article>
    <article><p class="mini-label">Dibatalkan</p><strong>${canceled.length}</strong></article>
  `;

  const warrantyListHtml = warrantyHold.length
    ? `
      <div class="profit-list-section">
        <p class="eyebrow">Masih masa garansi (belum masuk profit)</p>
        ${warrantyHold.map((transaction) => `
          <article class="admin-item">
            <div class="admin-item-top">
              <h4>${escapeHtml(transaction.title)}</h4>
              <span class="admin-tag admin-tag-warning">Hold garansi</span>
            </div>
            <p>${escapeHtml(transaction.code)} • Berakhir ${escapeHtml(formatDateTime(new Date(transaction.warrantyEndsAt)))}</p>
            <p>Fee tertahan: ${escapeHtml(formatCurrency(transaction.feeAmount || 0))}</p>
          </article>
        `).join("")}
      </div>
    `
    : "";

  const completedListHtml = completed.length
    ? `
      <div class="profit-list-section">
        <p class="eyebrow">Profit masuk (transaksi selesai)</p>
        ${completed.map((transaction) => `
          <article class="admin-item">
            <div class="admin-item-top">
              <h4>${escapeHtml(transaction.title)}</h4>
              <span class="admin-tag">Profit ${escapeHtml(formatCurrency(transaction.feeAmount || 0))}</span>
            </div>
            <p>${escapeHtml(transaction.code)} • ${escapeHtml(formatDate(transaction.createdAt || transaction.updatedAt))}</p>
            <p>Total transaksi: ${escapeHtml(formatCurrency(transaction.price || 0))}</p>
          </article>
        `).join("")}
      </div>
    `
    : "";

  elements.adminProfitList.innerHTML = warrantyListHtml || completedListHtml
    ? `${warrantyListHtml}${completedListHtml}`
    : "<p>Belum ada transaksi selesai atau hold garansi dalam rentang tanggal ini.</p>";
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
  const menuKey = toAdminMenuKey(user.id);
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
            <button type="button" class="ghost-btn admin-user-menu-btn" data-user-id="${escapeAttribute(user.id)}" data-menu-key="${escapeAttribute(menuKey)}" title="Kelola user" aria-label="Kelola user" aria-haspopup="menu">&#8942;</button>
            <div class="admin-user-menu hidden" id="admin-user-menu-${menuKey}" role="menu">
              <button type="button" class="admin-user-menu-item" role="menuitem" data-user-id="${escapeAttribute(user.id)}" data-user-action="ban">Ban akun</button>
              <button type="button" class="admin-user-menu-item" role="menuitem" data-user-id="${escapeAttribute(user.id)}" data-user-action="unban">Unban akun</button>
              <button type="button" class="admin-user-menu-item" role="menuitem" data-user-id="${escapeAttribute(user.id)}" data-user-action="unverify">Unverify akun</button>
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
  // Menu actions use document-level delegation via bindAdminUserMenuDelegation().
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
  const warrantyHold = state.transactions.filter(isWarrantyHoldTransaction);
  const readyTransfer = state.transactions.filter(isTransferQueueProcessable);
  const allQueue = [...warrantyHold, ...readyTransfer];
  if (elements.adminTransferQueueList) {
    const listParts = [];
    if (warrantyHold.length) {
      listParts.push(`
        <div class="queue-section-head">
          <p class="eyebrow">Masa garansi aktif</p>
          <h4>Menunggu masa garansi (${warrantyHold.length})</h4>
          <p class="mini-note">Rekening disembunyikan — admin belum bisa memproses transfer.</p>
        </div>
      `);
      listParts.push(...warrantyHold.map((transaction) => renderTransferQueueListItem(transaction, { warrantyHold: true })));
    }
    if (readyTransfer.length) {
      listParts.push(`
        <div class="queue-section-head">
          <p class="eyebrow">Siap diproses</p>
          <h4>Antrian transfer (${readyTransfer.length})</h4>
        </div>
      `);
      listParts.push(...readyTransfer.map((transaction) => renderTransferQueueListItem(transaction, { warrantyHold: false })));
    }
    elements.adminTransferQueueList.innerHTML = listParts.length
      ? listParts.join("")
      : `<p class="muted-text">${meta.empty}</p>`;
  }

  if (state.activeTransaction && !isInTransferQueue(state.activeTransaction)) {
    state.activeTransaction = null;
  }
  if (!state.activeTransaction && allQueue.length) {
    state.activeTransaction = allQueue[0];
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

function renderTransferQueueListItem(transaction, options = {}) {
  const warrantyHold = options.warrantyHold ?? isWarrantyHoldTransaction(transaction);
  const sellerAccount = warrantyHold
    ? "Rekening disembunyikan (masa garansi)"
    : [transaction.sellerBankName, transaction.sellerBankNumber].filter(Boolean).join(" • ") || "Menunggu rekening";
  const statusTag = warrantyHold
    ? `<span class="admin-tag admin-tag-warning">Masa garansi</span>`
    : `<span class="admin-tag">Antrian transfer</span>`;
  return `
    <article class="activity-item ${state.activeTransaction?.code === transaction.code ? "is-active" : ""} ${warrantyHold ? "queue-item-warranty" : ""}">
      <button type="button" class="ghost-btn admin-open-transfer-queue transaction-title-btn queue-title-btn" data-code="${escapeHtml(transaction.code)}">
        <div class="transaction-list-top">
          <strong class="transaction-list-title">${escapeHtml(transaction.title)}</strong>
          ${statusTag}
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
  if (!transaction || !isInTransferQueue(transaction)) {
    elements.adminTransferQueueDetail.classList.add("hidden");
    elements.adminTransferQueueEmpty.classList.remove("hidden");
    if (elements.adminTransferQueueTitle) elements.adminTransferQueueTitle.textContent = "Pilih transaksi";
    if (elements.adminTransferQueueSubtitle) elements.adminTransferQueueSubtitle.textContent = "Klik judul transaksi di panel kiri untuk melihat detail transfer.";
    if (elements.adminTransferQueueSummary) elements.adminTransferQueueSummary.innerHTML = "";
    if (elements.adminTransferQueueUploads) elements.adminTransferQueueUploads.innerHTML = "";
    setTransferQueueActionState(true);
    return;
  }

  const warrantyHold = isWarrantyHoldTransaction(transaction);
  elements.adminTransferQueueEmpty.classList.add("hidden");
  elements.adminTransferQueueDetail.classList.remove("hidden");
  if (elements.adminTransferQueueTitle) elements.adminTransferQueueTitle.textContent = transaction.title;
  if (elements.adminTransferQueueSubtitle) {
    const amount = formatCurrency(transaction.settlement?.sellerReceiveAmount || transaction.price);
    const detail = warrantyHold
      ? `Masa garansi aktif sampai ${formatDateTime(new Date(transaction.warrantyEndsAt))}`
      : `Masa garansi selesai • ${transaction.sellerBankName || "Bank belum diisi"}`;
    elements.adminTransferQueueSubtitle.textContent = `${transaction.code} | ${amount} | ${detail}`;
  }
  renderAdminTransferQueuePanel(transaction);
  if (elements.adminTransferQueueUploads) {
    elements.adminTransferQueueUploads.innerHTML = transaction.uploads.length
      ? transaction.uploads.map(renderUploadItem).join("")
      : "<div class=\"upload-empty-state\">Belum ada file transaksi.</div>";
  }
  setTransferQueueActionState(warrantyHold);
}

function setTransferQueueActionState(warrantyHold) {
  const proofForm = elements.adminTransferProofForm;
  const proofUpload = elements.adminTransferProofUpload;
  const proofSubmit = proofForm?.querySelector('button[type="submit"]');
  if (warrantyHold) {
    proofForm?.classList.add("is-disabled");
    if (proofUpload) proofUpload.disabled = true;
    if (proofSubmit) proofSubmit.disabled = true;
    if (elements.adminTransferCompleteInline) elements.adminTransferCompleteInline.disabled = true;
    return;
  }
  proofForm?.classList.remove("is-disabled");
  if (proofUpload) proofUpload.disabled = false;
  if (proofSubmit) proofSubmit.disabled = false;
  if (elements.adminTransferCompleteInline) elements.adminTransferCompleteInline.disabled = false;
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

function buildVoucherPaymentBankRowHtml(bank = {}, index = 0) {
  const id = String(bank.id || `bank-${index + 1}`);
  const logoUrl = String(bank.logoUrl || "").trim();
  return `
    <article class="voucher-payment-bank-row" data-bank-id="${escapeAttribute(id)}">
      <div class="voucher-payment-bank-row-head">
        <strong>Bank ${index + 1}</strong>
        <button type="button" class="ghost-btn voucher-bank-remove-btn">Hapus</button>
      </div>
      <div class="voucher-payment-bank-logo-field">
        <div class="voucher-payment-bank-logo-upload">
          <label class="file-upload-field">Logo bank
            <input type="file" class="voucher-bank-logo-input" accept="image/jpeg,image/png,image/webp" />
            <span class="file-upload-hint mini-note">${logoUrl ? "Logo sudah diupload" : "Belum ada logo dipilih"}</span>
          </label>
          <input type="hidden" class="voucher-bank-logo-url" value="${escapeAttribute(logoUrl)}" />
        </div>
        <div class="voucher-bank-logo-preview-wrap${logoUrl ? "" : " hidden"}">
          <img class="voucher-bank-logo-preview" src="${escapeAttribute(logoUrl)}" alt="Logo bank" width="48" height="48" style="width:48px;height:48px;max-width:48px;max-height:48px;object-fit:contain;display:block;" />
        </div>
      </div>
      <label>Nama bank<input type="text" class="voucher-bank-name" value="${escapeAttribute(bank.name || bank.bankName || "")}" placeholder="BCA" /></label>
      <label>Nomor rekening<input type="text" class="voucher-bank-number" value="${escapeAttribute(bank.number || bank.bankNumber || "")}" placeholder="1234567890" /></label>
      <label>Nama pemilik rekening<input type="text" class="voucher-bank-holder" value="${escapeAttribute(bank.holder || bank.bankHolder || "")}" placeholder="Qhead Gold" /></label>
    </article>
  `;
}

function bindVoucherPaymentBankRowEvents(container = document) {
  container.querySelectorAll(".voucher-bank-remove-btn").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const row = button.closest(".voucher-payment-bank-row");
      const list = elements.voucherPaymentBanksList;
      const rows = list?.querySelectorAll(".voucher-payment-bank-row") || [];
      if (rows.length <= 1) {
        showStatus("Minimal satu rekening bank harus tersedia.", true);
        return;
      }
      row?.remove();
      settingsFormDirty = true;
    });
  });
  container.querySelectorAll(".voucher-bank-logo-input").forEach((input) => {
    if (input.dataset.bound) return;
    input.dataset.bound = "1";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      const row = input.closest(".voucher-payment-bank-row");
      if (!file || !row) return;
      const formData = new FormData();
      formData.append("logo", file);
      try {
        const payload = await uploadWithProgress("/api/admin/settings/voucher-bank-logo", formData);
        const logoInput = row.querySelector(".voucher-bank-logo-url");
        const previewWrap = row.querySelector(".voucher-bank-logo-preview-wrap");
        const preview = row.querySelector(".voucher-bank-logo-preview");
        if (logoInput) logoInput.value = payload.logoUrl || "";
        if (preview) {
          preview.src = payload.logoUrl || "";
          preview.width = 48;
          preview.height = 48;
          preview.style.width = "48px";
          preview.style.height = "48px";
          preview.style.maxWidth = "48px";
          preview.style.maxHeight = "48px";
          preview.style.objectFit = "contain";
          preview.style.display = "block";
        }
        if (previewWrap) previewWrap.classList.toggle("hidden", !payload.logoUrl);
        const hint = row.querySelector(".file-upload-hint");
        if (hint) hint.textContent = "Logo sudah diupload";
        settingsFormDirty = true;
      } catch (error) {
        showStatus(error.message || "Gagal upload logo bank.", true);
      }
    });
  });
}

function addVoucherPaymentBankRow(bank = {}) {
  if (!elements.voucherPaymentBanksList) return;
  const index = elements.voucherPaymentBanksList.querySelectorAll(".voucher-payment-bank-row").length;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildVoucherPaymentBankRowHtml(bank, index);
  const row = wrapper.firstElementChild;
  if (!row) return;
  elements.voucherPaymentBanksList.appendChild(row);
  bindVoucherPaymentBankRowEvents(row);
  settingsFormDirty = true;
}

function collectVoucherPaymentBanksFromDom() {
  return Array.from(elements.voucherPaymentBanksList?.querySelectorAll(".voucher-payment-bank-row") || [])
    .map((row, index) => ({
      id: row.dataset.bankId || `bank-${index + 1}`,
      name: String(row.querySelector(".voucher-bank-name")?.value || "").trim(),
      number: String(row.querySelector(".voucher-bank-number")?.value || "").trim(),
      holder: String(row.querySelector(".voucher-bank-holder")?.value || "").trim(),
      logoUrl: String(row.querySelector(".voucher-bank-logo-url")?.value || "").trim(),
    }))
    .filter((bank) => bank.name || bank.number);
}

function renderVoucherPaymentBanksInSettings(payment = {}) {
  if (!elements.voucherPaymentBanksList) return;
  const banks = Array.isArray(payment.banks) && payment.banks.length
    ? payment.banks
    : (payment.bankName || payment.bankNumber
      ? [{
        id: "bank-1",
        name: payment.bankName,
        number: payment.bankNumber,
        holder: payment.bankHolder,
        logoUrl: payment.bankLogoUrl || "",
      }]
      : []);
  elements.voucherPaymentBanksList.innerHTML = banks.length
    ? banks.map((bank, index) => buildVoucherPaymentBankRowHtml(bank, index)).join("")
    : buildVoucherPaymentBankRowHtml({}, 0);
  bindVoucherPaymentBankRowEvents(elements.voucherPaymentBanksList);
  if (elements.voucherPaymentQrisUrl) elements.voucherPaymentQrisUrl.value = payment.qrisUrl || "";
  if (elements.voucherPaymentInstructions) elements.voucherPaymentInstructions.value = payment.instructions || "";
  if (elements.voucherPaymentTerms) elements.voucherPaymentTerms.value = payment.termsAndConditions || "";
}

window.renderVoucherPaymentSettingsPanel = renderVoucherPaymentBanksInSettings;
window.addVoucherPaymentBankRow = addVoucherPaymentBankRow;

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
  if (elements.maintenanceModeEnabled) {
    elements.maintenanceModeEnabled.checked = Boolean(settings?.maintenanceMode);
  }
  if (elements.maintenanceModeMessage) {
    elements.maintenanceModeMessage.value = settings?.maintenanceMessage || "";
  }
  renderMaintenanceSettingsState(settings);
  renderVoucherPaymentBanksInSettings(settings?.voucherPayment || {});
  for (let index = 0; index < 4; index += 1) {
    const tier = tiers[index] || { maxAmount: "", fee: "", feeType: "flat" };
    document.getElementById(`tier-${index + 1}-max`).value = tier.maxAmount ?? "";
    document.getElementById(`tier-${index + 1}-fee`).value = tier.fee ?? "";
  }
  renderFeeSettingsMeta(settings);
}

function renderMaintenanceSettingsState(settings) {
  const active = Boolean(settings?.maintenanceMode);
  elements.maintenanceSettingsCard?.classList.toggle("maintenance-settings-active", active);
  if (elements.maintenanceModeStatus) {
    elements.maintenanceModeStatus.textContent = active
      ? "Mode maintenance AKTIF. Pengunjung non-admin melihat halaman maintenance."
      : "Mode maintenance nonaktif. Website dapat diakses pengunjung biasa.";
  }
}

async function handleSaveMaintenanceSettings() {
  const maintenanceMode = Boolean(elements.maintenanceModeEnabled?.checked);
  const maintenanceMessage = String(elements.maintenanceModeMessage?.value || "").trim();
  if (maintenanceMode) {
    const confirmed = window.confirm(
      "Aktifkan mode maintenance?\n\nPengunjung non-admin tidak bisa membuka website sampai mode ini dimatikan.",
    );
    if (!confirmed) {
      if (elements.maintenanceModeEnabled) {
        elements.maintenanceModeEnabled.checked = false;
      }
      return;
    }
  }

  const button = elements.saveMaintenanceSettingsBtn;
  if (button) button.disabled = true;
  try {
    const payload = await fetchJson("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify({
        ...(state.settings || {}),
        maintenanceMode,
        maintenanceMessage,
      }),
    });
    state.settings = payload.settings;
    renderMaintenanceSettingsState(state.settings);
    showStatus(maintenanceMode ? "Mode maintenance diaktifkan." : "Mode maintenance dimatikan.");
  } catch (error) {
    showStatus(error.message || "Gagal menyimpan mode maintenance.", true);
  } finally {
    if (button) button.disabled = false;
  }
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
  syncAdminTransactionChatBox(elements.adminChatBox, transaction);
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
  elements.adminCompleteTransaction.disabled = transaction.paymentStatus !== "Antrian transfer" || isWarrantyStillActive(transaction);
  if (elements.adminCancelTransaction) {
    elements.adminCancelTransaction.disabled = transaction.paymentStatus === "Transaksi dibatalkan" || transaction.paymentStatus === "Selesai";
  }
  updateAdminNotificationBadges();
}

function renderAdminParticipantAvatars(transaction) {
  if (elements.adminRoomBuyerAvatar) {
    elements.adminRoomBuyerAvatar.innerHTML = transaction.buyer
      ? renderParticipantAvatarMini(transaction.buyer.displayName, transaction.buyer.avatar)
      : "B";
  }
  if (elements.adminRoomSellerAvatar) {
    elements.adminRoomSellerAvatar.innerHTML = transaction.seller
      ? renderParticipantAvatarMini(transaction.seller.displayName, transaction.seller.avatar)
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
      time: findAdminTransactionEventTime(transaction, ["Admin sudah meneruskan dana ke penjual", "transaksi dinyatakan selesai", "transfer ke penjual sudah selesai"]) || "-",
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

async function handleAdminSendTestEmail() {
  const email = String(elements.adminTestEmailTo?.value || "").trim();
  if (!email || !email.includes("@")) {
    if (elements.adminTestEmailStatus) {
      elements.adminTestEmailStatus.textContent = "Masukkan alamat email test yang valid.";
    }
    return;
  }
  const button = elements.adminSendTestEmail;
  if (button) button.disabled = true;
  if (elements.adminTestEmailStatus) {
    elements.adminTestEmailStatus.textContent = "Mengirim test email...";
  }
  try {
    const payload = await fetchJson("/api/admin/email/test", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (elements.adminTestEmailStatus) {
      elements.adminTestEmailStatus.textContent = payload.message || `Test email berhasil dikirim ke ${email}.`;
    }
  } catch (error) {
    if (elements.adminTestEmailStatus) {
      elements.adminTestEmailStatus.textContent = error.message || "Gagal mengirim test email.";
    }
  } finally {
    if (button) button.disabled = false;
  }
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
      maintenanceMode: Boolean(elements.maintenanceModeEnabled?.checked),
      maintenanceMessage: String(elements.maintenanceModeMessage?.value || "").trim(),
      voucherPayment: (() => {
        const banks = collectVoucherPaymentBanksFromDom();
        const primary = banks[0] || {};
        return {
          banks,
          bankName: primary.name || "",
          bankNumber: primary.number || "",
          bankHolder: primary.holder || "",
          qrisUrl: String(elements.voucherPaymentQrisUrl?.value || "").trim(),
          instructions: String(elements.voucherPaymentInstructions?.value || "").trim(),
          termsAndConditions: String(elements.voucherPaymentTerms?.value || "").trim(),
        };
      })(),
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
    state.transactions = state.transactions.map((item) => (
      item.code === latestTransaction.code ? latestTransaction : item
    ));
    await sendAdminTypingState(state.activeTransaction.code, false);
    syncAdminTransactionChatBox(elements.adminChatBox, state.activeTransaction);
    scheduleBackgroundAdminSync();
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
    if (action === "complete_transaction" && isWarrantyHoldTransaction(state.activeTransaction)) {
      showStatus(`Transfer belum bisa diselesaikan. Masa garansi aktif sampai ${formatDateTime(new Date(state.activeTransaction.warrantyEndsAt))}.`, true);
      return;
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
  const action = String(forcedAction || "").trim().toLowerCase();
  if (!userId || !["ban", "unban", "unverify"].includes(action)) return;
  let user = state.users.find((item) => item.id === userId);
  if (!user) {
    await refreshDashboardData();
    user = state.users.find((item) => item.id === userId);
  }
  if (!user) {
    showStatus("Data pengguna tidak ditemukan.", true);
    return;
  }
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
      avatar: "/assets/rekberwe-logo-shield.png?v=7",
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
  const onQueuePage = state.currentPage === "transactions-transfer-queue";
  if (!onQueuePage || !transaction || !isInTransferQueue(transaction)) {
    if (onQueuePage) elements.adminTransferQueueSummary.innerHTML = "";
    return;
  }
  const warrantyHold = isWarrantyHoldTransaction(transaction);
  const warrantyStatusStep = transaction.warrantyEndsAt
    ? `
      <article class="step-item queue-step-item ${warrantyHold ? "queue-step-locked" : ""}">
        <strong>!</strong>
        <div>
          <h4>Status garansi</h4>
          <p>${warrantyHold
      ? `Masa garansi masih aktif sampai ${formatDateTime(new Date(transaction.warrantyEndsAt))}. Transfer belum bisa diproses.`
      : "Masa garansi selesai — admin bisa memproses transfer ke penjual."}</p>
        </div>
      </article>
    `
    : "";
  const bankStep = warrantyHold
    ? `
      <article class="step-item queue-step-item queue-step-locked">
        <strong>C</strong>
        <div>
          <h4>No rekening tujuan</h4>
          <p class="muted-text">Disembunyikan selama masa garansi aktif agar admin tidak salah transfer.</p>
        </div>
      </article>
    `
    : `
      <article class="step-item queue-step-item">
        <strong>C</strong>
        <div>
          <h4>No rekening tujuan</h4>
          <p>${escapeHtml(transaction.sellerBankName || "-")} • ${escapeHtml(transaction.sellerBankNumber || "-")} • ${escapeHtml(transaction.sellerBankHolder || "-")}</p>
          <button type="button" class="ghost-btn" data-copy-transfer-account="${escapeAttribute(`${transaction.sellerBankName || ""} | ${transaction.sellerBankNumber || ""} | ${transaction.sellerBankHolder || ""}`)}">Copy rekening</button>
        </div>
      </article>
    `;
  const uploadStep = warrantyHold
    ? `
      <article class="step-item compact-guide-item queue-step-item queue-step-item-note queue-step-locked">
        <strong>D</strong>
        <div>
          <h4>Upload bukti transfer</h4>
          <p>Tersedia setelah masa garansi selesai.</p>
        </div>
      </article>
    `
    : `
      <article class="step-item compact-guide-item queue-step-item queue-step-item-note">
        <strong>D</strong>
        <div>
          <h4>Upload bukti transfer</h4>
          <p>Unggah bukti TF agar otomatis terkirim juga ke ruang transaksi.</p>
        </div>
      </article>
    `;
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
    ${warrantyStatusStep}
    ${bankStep}
    ${uploadStep}
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
    if (isWarrantyHoldTransaction(state.activeTransaction)) {
      showStatus(`Transfer belum bisa diproses. Masa garansi aktif sampai ${formatDateTime(new Date(state.activeTransaction.warrantyEndsAt))}.`, true);
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

function sanitizeExternalUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw.split(/[\s"'<>]/)[0];
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

function renderUploadItem(item) {
  const mediaType = getUploadType(item);
  const preview = buildUploadPreview(item, mediaType);
  const safeUrl = sanitizeExternalUrl(item.url);
  return `
    <div class="upload-item upload-item-${mediaType}">
      <div class="upload-preview-frame">${preview}</div>
      <div class="upload-item-body">
        <strong>${safeUrl ? `<a href="${escapeAttribute(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.name)}</a>` : escapeHtml(item.name)}</strong>
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
  const normalizedUrl = sanitizeExternalUrl(item.url);
  const safeUrl = escapeAttribute(normalizedUrl || "#");
  if (!normalizedUrl) {
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
let adminBackgroundSyncTimer = null;

function mergeAdminTransactionState(current, incoming) {
  if (!incoming) return current;
  if (!current || current.code !== incoming.code) return incoming;
  const currentMessages = Array.isArray(current.messages) ? current.messages : [];
  const incomingMessages = Array.isArray(incoming.messages) ? incoming.messages : [];
  const currentUploads = Array.isArray(current.uploads) ? current.uploads : [];
  const incomingUploads = Array.isArray(incoming.uploads) ? incoming.uploads : [];
  return {
    ...incoming,
    messages: incomingMessages.length >= currentMessages.length ? incomingMessages : currentMessages,
    uploads: incomingUploads.length >= currentUploads.length ? incomingUploads : currentUploads,
  };
}

function mergeAdminSupportThreadState(current, incoming) {
  if (!incoming) return current;
  if (!current || current.id !== incoming.id) return incoming;
  const currentMessages = Array.isArray(current.messages) ? current.messages : [];
  const incomingMessages = Array.isArray(incoming.messages) ? incoming.messages : [];
  return {
    ...incoming,
    messages: incomingMessages.length >= currentMessages.length ? incomingMessages : currentMessages,
  };
}

function scheduleBackgroundAdminSync() {
  if (adminBackgroundSyncTimer) window.clearTimeout(adminBackgroundSyncTimer);
  adminBackgroundSyncTimer = window.setTimeout(() => {
    refreshDashboardData().catch((error) => {
      console.error("Background admin sync gagal:", error);
    });
  }, 2000);
}

function syncAdminTransactionChatBox(container, transaction) {
  if (!container || !transaction) return;
  const code = String(transaction.code || "");
  if (container.dataset.transactionCode !== code) {
    container.dataset.transactionCode = code;
    container.dataset.timelineCount = "0";
  }
  const timeline = buildAdminTransactionTimeline(transaction);
  const prevCount = Number(container.dataset.timelineCount || 0);
  if (timeline.length === prevCount) return;
  const scrollState = captureScrollState(container);
  const renderItem = (item) => (
    item.kind === "upload" ? renderAdminChatUploadItem(item, transaction) : renderChatItem(item, transaction)
  );
  if (timeline.length < prevCount || prevCount === 0) {
    container.innerHTML = timeline.map(renderItem).join("");
  } else {
    container.insertAdjacentHTML("beforeend", timeline.slice(prevCount).map(renderItem).join(""));
    scrollState.wasNearBottom = true;
  }
  container.dataset.timelineCount = String(timeline.length);
  restoreScrollState(container, scrollState);
}

function syncAdminSupportMessagesBox(container, messages, renderFn) {
  if (!container) return;
  const list = Array.isArray(messages) ? messages : [];
  const prevCount = Number(container.dataset.messageCount || 0);
  if (list.length === prevCount) return;
  const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 48;
  container.innerHTML = list.length
    ? list.map(renderFn).join("")
    : "<div class=\"upload-empty-state\">Belum ada pesan live chat.</div>";
  container.dataset.messageCount = String(list.length);
  if (wasNearBottom) container.scrollTop = container.scrollHeight;
}

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
  const activeVoucherOrderCode = window.RekberAdminVoucher?.getActiveOrderCode?.() || "";
  return {
    activeTransactionCode: state.activeTransaction?.code || activeVoucherOrderCode || "",
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
  syncAdminSupportMessagesBox(
    elements.adminSupportMessages,
    active.messages,
    (message) => renderSupportAdminMessage(message, active.user),
  );
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
      avatar: "/assets/rekberwe-logo-shield.png?v=7",
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
    state.supportThreads = state.supportThreads.map((thread) => (
      thread.id === threadId ? mergeAdminSupportThreadState(thread, payload.thread) : thread
    ));
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

function startAdminSessionKeepalive() {
  if (adminSessionKeepaliveTimer) window.clearInterval(adminSessionKeepaliveTimer);
  adminSessionKeepaliveTimer = window.setInterval(async () => {
    try {
      const session = await fetchJson("/api/session");
      if (!session.user?.isAdmin) {
        showAdminLoginGate("Session admin berakhir. Silakan login ulang.");
        stopAdminSessionKeepalive();
        return;
      }
      state.currentUser = session.user;
    } catch {
      // Abaikan gangguan jaringan sementara; coba lagi interval berikutnya.
    }
  }, 3 * 60 * 1000);
}

function stopAdminSessionKeepalive() {
  if (adminSessionKeepaliveTimer) {
    window.clearInterval(adminSessionKeepaliveTimer);
    adminSessionKeepaliveTimer = null;
  }
}

function scheduleAdminLiveEventReconnect() {
  if (adminLiveEventRetryTimer || !state.currentUser?.isAdmin) return;
  adminLiveEventRetryTimer = window.setTimeout(() => {
    adminLiveEventRetryTimer = null;
    if (!state.currentUser?.isAdmin) return;
    setupAdminLiveEvents();
  }, 5000);
}

function setupAdminLiveEvents() {
  if (adminLiveEventRetryTimer) {
    window.clearTimeout(adminLiveEventRetryTimer);
    adminLiveEventRetryTimer = null;
  }
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
      let chatNotificationMeta = null;
      let transactionNotificationMeta = null;

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

      if (payload.type === "voucher_typing_updated") {
        window.RekberAdminVoucher?.handleTypingEvent?.(payload);
      }

      if (payload.type === "voucher_order_updated") {
        const previousOrders = getAdminVoucherOrders();
        const orderCode = String(payload.order?.orderCode || payload.orderCode || payload.code || "").toUpperCase();
        const previous = previousOrders.find((item) => item.orderCode === orderCode);
        if (!payload.deleted && payload.order) {
          if (!previous) {
            shouldPlayTransactionSound = true;
            transactionNotificationMeta = {
              title: "Order Voucher/GT baru",
              body: `${payload.order.product?.name || "Produk"} — ${orderCode}`,
            };
          } else {
            const previousMessageCount = previous.messages?.length || 0;
            const nextMessageCount = payload.order.messages?.length || 0;
            const lastMessage = payload.order.messages?.[nextMessageCount - 1];
            if (nextMessageCount > previousMessageCount && lastMessage?.senderRole !== "admin") {
              shouldPlayChatSound = true;
              chatNotificationMeta = {
                title: `Chat Voucher — ${orderCode}`,
                body: lastMessage?.text || "Pesan baru dari pembeli.",
              };
            }
            if (previous.status !== payload.order.status && payload.order.status === "awaiting_confirmation") {
              shouldPlayTransactionSound = true;
              transactionNotificationMeta = {
                title: "Bukti TF Voucher baru",
                body: `${payload.order.product?.name || "Produk"} — ${orderCode}`,
              };
            }
          }
        }
        await window.RekberAdminVoucher?.handleLiveEvent?.(payload);
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
        state.transactions = state.transactions.map((item) => (
          item.code === payload.code
            ? mergeAdminTransactionState(item, payload.transaction)
            : item
        ));
        if (state.activeTransaction?.code === payload.code) {
          state.activeTransaction = mergeAdminTransactionState(state.activeTransaction, payload.transaction);
          syncAdminTransactionChatBox(elements.adminChatBox, state.activeTransaction);
        }
      }

      if (payload.type === "support_updated" && payload.thread) {
        const previousThread = (state.supportThreads || []).find((thread) => thread.id === payload.thread.id);
        const previousCount = previousThread?.messages?.length || 0;
        const nextCount = payload.thread.messages?.length || 0;
        const lastMessage = payload.thread.messages?.[nextCount - 1];
        const mergedThread = mergeAdminSupportThreadState(previousThread, payload.thread);
        state.supportThreads = [...(state.supportThreads || []).filter((thread) => thread.id !== payload.thread.id), mergedThread]
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

      scheduleBackgroundAdminSync();
      updateAdminNotificationBadges();
      if (shouldPlayTransactionSound) {
        playAdminNotificationSound("transaction", transactionNotificationMeta || undefined);
      } else if (shouldPlayChatSound) {
        playAdminNotificationSound("chat", chatNotificationMeta || undefined);
      }
    } catch (error) {
      console.error("Event stream admin gagal:", error);
    }
  };
  adminEventSource.addEventListener("error", () => {
    if (adminPresenceTimer) window.clearInterval(adminPresenceTimer);
    adminPresenceTimer = null;
    adminEventSource?.close();
    adminEventSource = null;
    scheduleAdminLiveEventReconnect();
  });
}

function updateAdminNotificationBadges() {
  const newTransactionsButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-new");
  const transferQueueButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-transfer-queue");
  const cancelledButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-cancelled");
  const disputeButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "transactions-dispute");
  const supportButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "support");
  const verificationButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "verification");
  const voucherOrdersButton = elements.adminNavButtons.find((button) => button.dataset.adminPage === "voucher-orders");
  setAdminButtonBadge(newTransactionsButton, getAdminNewTransactionCount());
  setAdminButtonBadge(transferQueueButton, getAdminTransferQueueCount());
  setAdminButtonBadge(cancelledButton, getAdminCancelledCount());
  setAdminButtonBadge(disputeButton, getAdminDisputeCount());
  setAdminButtonBadge(supportButton, (state.supportThreads || []).reduce((total, thread) => total + getAdminSupportUnreadCount(thread), 0));
  setAdminButtonBadge(verificationButton, (state.users || []).filter((user) => user.needsVerificationReview).length);
  setAdminButtonBadge(voucherOrdersButton, getAdminVoucherNotificationCount());
  setAdminNotifBadge(getAdminDashboardNotificationCount());
  window.RekberDesktop?.setBadge?.(getAdminDashboardNotificationCount());
  if (elements.adminNotifPanel && !elements.adminNotifPanel.classList.contains("hidden")) {
    renderAdminNotificationPanel();
  }
}


