const appConfig = {
  authCallbackParam: "authResult",
  providerLabels: {
    Telegram: "Telegram",
    Google: "Google",
    Facebook: "Facebook",
    Discord: "Discord",
  },
};

const state = {
  currentUser: null,
  transactions: [],
  activeTransaction: null,
  pendingJoinTransaction: null,
  transactionScreen: "list",
  providerConfig: null,
  currentMemberView: null,
  dashboard: {
    profile: null,
    linkedProviders: [],
    activeTransactions: [],
    completedTransactions: [],
    chatHistory: [],
  },
  supportThread: null,
  workspaceSection: "dashboard",
  mobileCreateOpen: false,
  historySelection: { type: "", code: "" },
  historyChatType: null,
  historyVoucherOrder: null,
};

const notificationState = {
  initialized: false,
  seenMessagesByCode: {},
  audioUnlocked: false,
  lastSoundAt: 0,
};

const PRESENCE_ONLINE_MS = 30000;
const PRESENCE_UI_TICK_MS = 5000;
const PRESENCE_HEARTBEAT_MS = 15000;
const TYPING_ACTIVE_MS = 5000;

const sellerBankUiState = {
  dirty: false,
  lastLoadedSnapshot: "",
};

const OTP_LOCK_MESSAGE = "Kode OTP belum masuk? Pastikan nomor WhatsApp aktif, tidak salah input, dan memiliki koneksi internet. Anda dapat mencoba lagi dalam 10 menit atau menghubungi admin untuk verifikasi manual.";
const OTP_SUPPORT_MESSAGE = "Saya mengalami kendala OTP WhatsApp tidak masuk setelah 3 kali percobaan. Mohon bantu verifikasi nomor saya.";

const whatsappOtpRuntime = {
  state: null,
  tickTimer: null,
  cooldownEndsAt: 0,
  lockEndsAt: 0,
};

const profileVerificationDraft = {
  legalName: "",
  ktp: "",
  whatsapp: "",
};

const elements = {
  homeNavButton: document.getElementById("home-nav-button"),
  openLogin: document.getElementById("open-login"),
  heroLoginButton: document.getElementById("hero-login-button"),
  heroLoginButtonAlt: document.getElementById("hero-login-button-alt"),
  loginModal: document.getElementById("login-modal"),
  closeLoginModal: document.getElementById("close-login-modal"),
  adminLink: document.getElementById("admin-link"),
  logoutButton: document.getElementById("logout-button"),
  transactionsNavButton: document.getElementById("transactions-nav-button"),
  profileNavButton: document.getElementById("profile-nav-button"),
  loginSectionHead: document.getElementById("login-section-head"),
  loginBox: document.getElementById("login-box"),
  providerList: document.getElementById("provider-list"),
  telegramDirectLogin: document.getElementById("telegram-direct-login"),
  googleDirectLogin: document.getElementById("google-direct-login"),
  facebookDirectLogin: document.getElementById("facebook-direct-login"),
  discordDirectLogin: document.getElementById("discord-direct-login"),
  telegramStatus: document.getElementById("telegram-status"),
  workspaceStatusToast: document.getElementById("workspace-status-toast"),
  currentUserCard: document.getElementById("current-user-card"),
  officeBox: document.getElementById("office-box"),
  officeAddressDisplay: document.getElementById("public-office-address"),
  workspaceOfficeBox: document.getElementById("workspace-office-box"),
  workspaceOfficeAddress: document.getElementById("workspace-office-address"),
  inlineTransactionPanel: document.getElementById("inline-transaction-panel"),
  transactionForm: document.getElementById("transaction-form"),
  workspaceTransactionForm: document.getElementById("workspace-transaction-form"),
  transactionResult: document.getElementById("transaction-result"),
  workspaceTransactionResult: document.getElementById("workspace-transaction-result"),
  transactionFeePreview: document.getElementById("transaction-fee-preview"),
  workspaceTransactionFeePreview: document.getElementById("workspace-transaction-fee-preview"),
  mobileDashboardSummary: document.getElementById("mobile-dashboard-summary"),
  mobileDashboardTransactions: document.getElementById("mobile-dashboard-transactions"),
  mobileUnifiedHistoryList: document.getElementById("mobile-unified-history-list"),
  mobileActiveTransactionsList: document.getElementById("mobile-active-transactions-list"),
  mobileDashboardLearnMore: document.getElementById("mobile-dashboard-learn-more"),
  mobileDashboardSeeAll: document.getElementById("mobile-dashboard-see-all"),
  mobileQuickCreate: document.getElementById("mobile-quick-create"),
  mobileQuickVoucher: document.getElementById("mobile-quick-voucher"),
  mobileQuickVerification: document.getElementById("mobile-quick-verification"),
  mobileQuickGuide: document.getElementById("mobile-quick-guide"),
  homeSidebarDashboard: document.getElementById("home-sidebar-dashboard"),
  mobileQuickSecurity: document.getElementById("mobile-quick-security"),
  mobileHeaderNotifications: document.getElementById("mobile-header-notifications"),
  mobileHeaderNotificationsBadge: document.getElementById("mobile-header-notifications-badge"),
  mobileHeaderProfile: document.getElementById("mobile-header-profile"),
  mobileHeaderProfileAvatar: document.getElementById("mobile-header-profile-avatar"),
  mobileHeaderLogout: document.getElementById("mobile-header-logout"),
  roomInfoExpanded: document.getElementById("room-info-expanded"),
  mobileChatHeader: document.getElementById("mobile-chat-header"),
  mobileChatBack: document.getElementById("mobile-chat-back"),
  mobileChatHeaderTitle: document.getElementById("mobile-chat-header-title"),
  mobileChatHeaderOnline: document.getElementById("mobile-chat-header-online"),
  mobileChatHeaderBadge: document.getElementById("mobile-chat-header-badge"),
  mobileChatHeaderMenu: document.getElementById("mobile-chat-header-menu"),
  mobileRoomStatusBadge: document.getElementById("mobile-room-status-badge"),
  mobileRoomPrice: document.getElementById("mobile-room-price"),
  mobileDetailBackdrop: document.getElementById("mobile-detail-backdrop"),
  mobileDetailClose: document.getElementById("mobile-detail-close"),
  sampleLink: document.getElementById("sample-link"),
  transactionRoomSection: document.getElementById("ruang-transaksi"),
  transactionRoom: document.getElementById("transaction-room"),
  transactionShell: document.getElementById("member-transactions-workspace"),
  roomCode: document.getElementById("room-code"),
  roomPaymentStatus: document.getElementById("room-payment-status"),
  roomBuyer: document.getElementById("room-buyer"),
  roomSeller: document.getElementById("room-seller"),
  roomBuyerState: document.getElementById("room-buyer-state"),
  roomSellerState: document.getElementById("room-seller-state"),
  roomAdminState: document.getElementById("room-admin-state"),
  chatTypingIndicator: document.getElementById("chat-typing-indicator"),
  roomBuyerAvatar: document.getElementById("room-buyer-avatar"),
  roomSellerAvatar: document.getElementById("room-seller-avatar"),
  roomProgressCreated: document.getElementById("room-progress-created"),
  roomProgressFunded: document.getElementById("room-progress-funded"),
  roomProgressReviewed: document.getElementById("room-progress-reviewed"),
  roomProgressComplete: document.getElementById("room-progress-complete"),
  roomProgressCreatedTime: document.getElementById("room-progress-created-time"),
  roomProgressFundedTime: document.getElementById("room-progress-funded-time"),
  roomProgressReviewedTime: document.getElementById("room-progress-reviewed-time"),
  roomProgressCompleteTime: document.getElementById("room-progress-complete-time"),
  roomSummary: document.getElementById("room-summary"),
  roomTimeline: document.getElementById("room-timeline"),
  roomGuideList: document.getElementById("room-guide-list"),
  proofUpload: document.getElementById("proof-upload"),
  pendingAttachments: document.getElementById("pending-attachments"),
  proofList: document.getElementById("proof-list"),
  uploadProgress: document.getElementById("upload-progress"),
  uploadProgressLabel: document.getElementById("upload-progress-label"),
  uploadProgressValue: document.getElementById("upload-progress-value"),
  uploadProgressDetail: document.getElementById("upload-progress-detail"),
  uploadProgressBar: document.getElementById("upload-progress-bar"),
  chatBox: document.getElementById("chat-box"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  joinCode: document.getElementById("join-code"),
  mobileJoinCode: document.getElementById("mobile-join-code"),
  mobileJoinTransaction: document.getElementById("mobile-join-transaction"),
  joinTransaction: document.getElementById("join-transaction"),
  joinRoleBox: document.getElementById("join-role-box"),
  joinRoleModal: document.getElementById("join-role-modal"),
  joinRoleNote: document.getElementById("join-role-note"),
  joinAsBuyer: document.getElementById("join-as-buyer"),
  joinAsSeller: document.getElementById("join-as-seller"),
  markPaid: document.getElementById("mark-paid"),
  accountDelivered: document.getElementById("account-delivered"),
  goodsReceived: document.getElementById("goods-received"),
  openDispute: document.getElementById("open-dispute"),
  cancelTransaction: document.getElementById("cancel-transaction"),
  profileCard: document.getElementById("profile-card"),
  profileLookup: document.getElementById("profile-lookup"),
  profileLookupWorkspace: document.getElementById("profile-lookup-workspace"),
  lookupProfile: document.getElementById("lookup-profile"),
  lookupResult: document.getElementById("lookup-result"),
  lookupResultWorkspace: document.getElementById("lookup-result-workspace"),
  homeArea: document.getElementById("home-area"),
  memberArea: document.getElementById("member-area"),
  activeRekberList: document.getElementById("active-rekber-list"),
  historyRekberList: document.getElementById("history-rekber-list"),
  historyChatList: document.getElementById("history-chat-list"),
  verificationModal: document.getElementById("verification-modal"),
  openProfileTab: document.getElementById("open-profile-tab"),
  closeVerificationModal: document.getElementById("close-verification-modal"),
  locationConsentModal: document.getElementById("location-consent-modal"),
  closeLocationConsentModal: document.getElementById("close-location-consent-modal"),
  approveLocationConsentModal: document.getElementById("approve-location-consent-modal"),
  confirmModal: document.getElementById("confirm-modal"),
  confirmModalTitle: document.getElementById("confirm-modal-title"),
  confirmModalText: document.getElementById("confirm-modal-text"),
  confirmModalApprove: document.getElementById("confirm-modal-approve"),
  confirmModalCancel: document.getElementById("confirm-modal-cancel"),
  promptModal: document.getElementById("prompt-modal"),
  promptModalEyebrow: document.getElementById("prompt-modal-eyebrow"),
  promptModalTitle: document.getElementById("prompt-modal-title"),
  promptModalLabel: document.getElementById("prompt-modal-label"),
  promptModalInput: document.getElementById("prompt-modal-input"),
  promptModalApprove: document.getElementById("prompt-modal-approve"),
  promptModalCancel: document.getElementById("prompt-modal-cancel"),
  mobileCreateChoiceModal: document.getElementById("mobile-create-choice-modal"),
  mobileCreateChoiceRekber: document.getElementById("mobile-create-choice-rekber"),
  mobileCreateChoiceVoucher: document.getElementById("mobile-create-choice-voucher"),
  mobileCreateChoiceCancel: document.getElementById("mobile-create-choice-cancel"),
  profilePanel: document.getElementById("profile-panel"),
  transactionsPanel: document.getElementById("transactions-panel"),
  transactionsIntroSection: document.getElementById("transactions-intro-section"),
  workspaceDashboardView: document.getElementById("workspace-dashboard-view"),
  workspaceProfileView: document.getElementById("workspace-profile-view"),
  workspaceVerificationView: document.getElementById("workspace-verification-view"),
  workspaceNotificationsView: document.getElementById("workspace-notifications-view"),
  workspaceMobileTransactionsView: document.getElementById("workspace-mobile-transactions-view"),
  profileCardWorkspace: document.getElementById("profile-card-workspace"),
  profileVerificationPageWorkspace: document.getElementById("profile-verification-page-workspace"),
  profileVerificationAsideWorkspace: document.getElementById("profile-verification-aside-workspace"),
  workspaceCreateTransactionButton: document.getElementById("workspace-create-transaction-button"),
  workspaceOpenTransactionsButton: document.getElementById("workspace-open-transactions-button"),
  activeRekberSection: document.getElementById("active-rekber-section"),
  voucherOrdersSidebarSection: document.getElementById("voucher-orders-sidebar-section"),
  historyRekberSection: document.getElementById("history-rekber-section"),
  backToTransactionList: document.getElementById("back-to-transaction-list"),
  historyRoomToolbar: document.getElementById("history-room-toolbar"),
  historyVoucherDisputeBtn: document.getElementById("history-voucher-dispute-btn"),
  roomPageTitle: document.getElementById("room-page-title"),
  roomPageSubtitle: document.getElementById("room-page-subtitle"),
  transactionRoomEmpty: document.getElementById("transaction-room-empty"),
  transactionUnifiedHistoryList: document.getElementById("transaction-unified-history-list"),
  voucherHistoryRoom: document.getElementById("voucher-history-room"),
  publicFeeList: document.getElementById("public-fee-list"),
  workspacePublicFeeList: document.getElementById("workspace-public-fee-list"),
  termsList: document.getElementById("terms-list"),
  workspaceTermsList: document.getElementById("workspace-terms-list"),
  supportWidget: document.getElementById("support-widget"),
  supportWidgetToggle: document.getElementById("support-widget-toggle"),
  supportWidgetHint: document.getElementById("support-widget-hint"),
  supportWidgetBadge: document.getElementById("support-widget-badge"),
  supportWidgetPanel: document.getElementById("support-widget-panel"),
  supportWidgetMessages: document.getElementById("support-widget-messages"),
  supportWidgetForm: document.getElementById("support-widget-form"),
  supportWidgetInput: document.getElementById("support-widget-input"),
  supportWidgetUpload: document.getElementById("support-widget-upload"),
  supportWidgetClose: document.getElementById("support-widget-close"),
  supportWidgetDrag: document.getElementById("support-widget-drag"),
  supportWidgetAdminState: document.getElementById("support-widget-admin-state"),
  supportWidgetTypingIndicator: document.getElementById("support-widget-typing-indicator"),
  createdTransactionModal: document.getElementById("created-transaction-modal"),
  createdTransactionLink: document.getElementById("created-transaction-link"),
  copyCreatedTransactionLink: document.getElementById("copy-created-transaction-link"),
  shareCreatedTransactionLink: document.getElementById("share-created-transaction-link"),
  openCreatedTransactionRoom: document.getElementById("open-created-transaction-room"),
  sellerBankForm: document.getElementById("seller-bank-form"),
  sellerBankName: document.getElementById("seller-bank-name"),
  sellerBankNumber: document.getElementById("seller-bank-number"),
  sellerBankHolder: document.getElementById("seller-bank-holder"),
  saveSellerBankDetails: document.getElementById("save-seller-bank-details"),
  userProfileModal: document.getElementById("user-profile-modal"),
  closeUserProfileModal: document.getElementById("close-user-profile-modal"),
  userProfileModalAvatar: document.getElementById("user-profile-modal-avatar"),
  userProfileModalRole: document.getElementById("user-profile-modal-role"),
  userProfileModalName: document.getElementById("user-profile-modal-name"),
  userProfileModalBadge: document.getElementById("user-profile-modal-badge"),
  userProfileModalGrid: document.getElementById("user-profile-modal-grid"),
  whatsappOtpModal: document.getElementById("whatsapp-otp-modal"),
  whatsappOtpInput: document.getElementById("whatsapp-otp-input"),
  whatsappOtpResendTimer: document.getElementById("whatsapp-otp-resend-timer"),
  whatsappOtpError: document.getElementById("whatsapp-otp-error"),
  whatsappOtpSuccess: document.getElementById("whatsapp-otp-success"),
  whatsappOtpVerifyBtn: document.getElementById("whatsapp-otp-verify-btn"),
  whatsappOtpResendBtn: document.getElementById("whatsapp-otp-resend-btn"),
  whatsappOtpEditNumberBtn: document.getElementById("whatsapp-otp-edit-number-btn"),
  whatsappOtpEditPanel: document.getElementById("whatsapp-otp-edit-panel"),
  whatsappOtpEditInput: document.getElementById("whatsapp-otp-edit-input"),
  whatsappOtpSaveNumberBtn: document.getElementById("whatsapp-otp-save-number-btn"),
  whatsappOtpLockoutHelp: document.getElementById("whatsapp-otp-lockout-help"),
  whatsappOtpLockoutText: document.getElementById("whatsapp-otp-lockout-text"),
  whatsappOtpLockTimer: document.getElementById("whatsapp-otp-lock-timer"),
  whatsappOtpLockChangeBtn: document.getElementById("whatsapp-otp-lock-change-btn"),
  whatsappOtpContactAdminBtn: document.getElementById("whatsapp-otp-contact-admin-btn"),
  whatsappOtpCloseBtn: document.getElementById("whatsapp-otp-close-btn"),
  sidebarHomeButton: document.getElementById("sidebar-home-button"),
  sidebarTransactionsButton: document.getElementById("sidebar-transactions-button"),
  sidebarProfileButton: document.getElementById("sidebar-profile-button"),
  sidebarNotificationsButton: document.getElementById("sidebar-notifications-button"),
  sidebarVerificationButton: document.getElementById("sidebar-verification-button"),
  sidebarSecurityGuideButton: document.getElementById("sidebar-security-guide-button"),
  sidebarCreateTransaction: document.getElementById("sidebar-create-transaction"),
  sidebarLiveChatButton: document.getElementById("sidebar-live-chat-button"),
  workspaceUserCard: document.getElementById("workspace-user-card"),
  notificationsList: document.getElementById("notifications-list"),
  homeLiveChatShortcut: document.getElementById("home-live-chat-shortcut"),
  homeLoginShortcut: document.getElementById("home-login-shortcut"),
  mobileBottomNav: document.getElementById("mobile-bottom-nav"),
  mobileNavDashboard: document.getElementById("mobile-nav-dashboard"),
  mobileNavTransactions: document.getElementById("mobile-nav-transactions"),
  mobileNavCreate: document.getElementById("mobile-nav-create"),
  mobileNavSupport: document.getElementById("mobile-nav-support"),
  mobileNavAccount: document.getElementById("mobile-nav-account"),
  mobileRoomDetailButton: document.getElementById("mobile-room-detail-button"),
  mobileRoomUploadButton: document.getElementById("mobile-room-upload-button"),
  mobileRoomGuideButton: document.getElementById("mobile-room-guide-button"),
  mobileRoomDisputeButton: document.getElementById("mobile-room-dispute-button"),
};

let roomRefreshTimer = null;
let roomChatScrollState = null;
let liveEventSource = null;
let userPresenceTimer = null;
let presenceTickTimer = null;
let typingStopTimer = null;
let confirmModalResolver = null;
let promptModalResolver = null;
let activeModalEscapeHandler = null;
let supportThreadTimer = null;
let supportTypingStopTimer = null;
let supportPresenceTickTimer = null;
let guestPresenceTimer = null;
let locationConsentResolver = null;
let supportHintTimer = null;
let supportHintShown = false;

const ALLOWED_WARRANTY_DAYS = new Set([0, 3, 7, 14, 30]);
const WARRANTY_VALIDATION_MESSAGE = "Masa garansi tidak valid. Hanya boleh angka 3, 7, 14, 30, atau kosongkan untuk tanpa garansi.";
const LOCATION_CONSENT_TEXT = "RekberWe meminta akses lokasi saat pendaftaran untuk keamanan transaksi, pencegahan penipuan, dan verifikasi risiko akun. Data lokasi tidak akan ditampilkan ke pengguna lain dan hanya dapat dilihat admin untuk keperluan investigasi sengketa.";


bindProviderButtons();
bindScrollButtons();
bindForms();
window.addEventListener("pointerdown", unlockUserNotificationAudio, { once: true });
window.addEventListener("keydown", unlockUserNotificationAudio, { once: true });
window.addEventListener("touchstart", unlockUserNotificationAudio, { once: true, passive: true });

bootstrap().catch((error) => {
  console.error(error);
  if (state.currentUser?.banned) {
    setAuthStatus(state.currentUser.bannedReason || "Akun Anda sedang diblokir admin.", true);
  } else {
    const message = error instanceof Error && error.message
      ? error.message
      : "Website belum bisa memuat data login. Silakan coba refresh halaman.";
    setAuthStatus(message, true);
  }
  renderAll();
});

async function bootstrap() {
  try {
    state.providerConfig = await fetchJson("/api/config");
  } catch (error) {
    throw new Error(error?.message || "Gagal memuat konfigurasi website.");
  }
  initResizableLayouts();
  initViewportListener();
  handleProviderAuthCallback();
  renderAll();
  updateProviderAvailability();
  try {
    await hydrateCurrentSession();
  } catch (error) {
    console.error("Gagal memuat sesi login:", error);
    state.currentUser = null;
  }
  renderAll();
  const routeParams = new URLSearchParams(window.location.search);
  const returnTo = routeParams.get("returnTo");
  if (state.currentUser && returnTo) {
    const profileReturn = returnTo === "profile" || returnTo === "/profil" || returnTo.startsWith("/profil");
    if (profileReturn) {
      routeParams.delete("returnTo");
      const cleanQuery = routeParams.toString();
      history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
      openWorkspaceSection("profile");
      return;
    }
    if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      routeParams.delete("returnTo");
      const cleanQuery = routeParams.toString();
      history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
      window.location.href = returnTo;
      return;
    }
  }
  const hasTransactionRoute = routeParams.has("trx");
  const hasVoucherRoute = routeParams.has("voucher");
  const hasSupportRoute = routeParams.get("support") === "1";
  if (hasTransactionRoute) {
    try {
      await handleInitialRoute();
    } catch (routeError) {
      handleInitialRouteError(routeError);
    }
  }
  const initialJobs = [refreshTransactions()];
  if (state.currentUser) {
    initialJobs.push(refreshDashboard());
  } else {
    initialJobs.push(refreshSupportThread());
  }
  const initialResults = await Promise.allSettled(initialJobs);
  const failedInitialJob = initialResults.find((item) => item.status === "rejected");
  if (failedInitialJob) {
    console.error("Gagal memuat data awal:", failedInitialJob.reason);
    if (!hasTransactionRoute && !hasVoucherRoute) {
      const reason = failedInitialJob.reason;
      const message = reason instanceof Error ? reason.message : "Gagal memuat data akun.";
      setAuthStatus(message, true);
    }
  }
  renderAll();
  if (hasSupportRoute) {
    try {
      await handleSupportRoute();
    } catch (supportRouteError) {
      console.warn("Gagal membuka live chat dari URL:", supportRouteError);
    }
  }
  if (hasVoucherRoute) {
    try {
      await handleVoucherRoute();
    } catch (voucherRouteError) {
      console.warn("Gagal membuka order voucher dari URL:", voucherRouteError);
    }
  }
  if (!hasTransactionRoute) {
    try {
      await handleInitialRoute();
    } catch (routeError) {
      handleInitialRouteError(routeError);
    }
  }
  startRoomRefresh();
  if (state.currentUser) {
    window.RekberPush?.ensurePushEnabled?.({ audience: "user" }).catch(() => {});
    window.fetchJson = fetchJson;
    window.setAuthStatus = setAuthStatus;
    window.openPromptModal = openPromptModal;
    window.syncHistoryVoucherOrder = (order) => {
      if (state.historyChatType === "voucher" && state.historyVoucherOrder?.orderCode === order?.orderCode) {
        state.historyVoucherOrder = order;
        if (elements.roomPageSubtitle) {
          elements.roomPageSubtitle.textContent = `${order.orderCode} • ${order.statusLabel || order.status}`;
        }
      }
    };
    window.markUserVoucherOrderSeen = markUserVoucherOrderSeen;
    window.refreshUserTransactionHistory = () => {
      renderUnifiedTransactionHistory();
      updateUserNotificationBadges();
      renderNotifications();
    };
    window.RekberVoucher?.init(state.currentUser);
    await window.RekberVoucher?.refresh?.({ skipActiveOrderView: true }).catch(() => {});
    await tryCompletePendingSellerJoin();
  }
}

async function openHistoryRekberRoom(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return;
  const payload = await fetchJson(`/api/transactions/${encodeURIComponent(normalized)}`).catch(() => null);
  const transaction = payload?.transaction
    || state.transactions.find((item) => item.code === normalized)
    || state.dashboard.activeTransactions?.find((item) => item.code === normalized)
    || state.dashboard.completedTransactions?.find((item) => item.code === normalized);
  if (!transaction) return;
  state.historySelection = { type: "rekber", code: normalized };
  state.historyChatType = "rekber";
  state.historyVoucherOrder = null;
  state.activeTransaction = transaction;
  state.transactionScreen = "room";
  openWorkspaceSection("transactions");
  renderRoom(transaction);
}

async function openHistoryVoucherRoom(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return;
  const payload = await fetchJson(`/api/voucher/orders/${encodeURIComponent(normalized)}`).catch(() => null);
  const order = payload?.order || window.RekberVoucher?.getOrders?.().find((item) => item.orderCode === normalized);
  if (!order) return;
  if (order.status === "awaiting_payment") {
    await window.RekberVoucher?.ensurePaymentSettings?.().catch(() => {});
  }
  state.historySelection = { type: "voucher", code: normalized };
  state.historyChatType = "voucher";
  state.historyVoucherOrder = order;
  state.activeTransaction = null;
  state.transactionScreen = "room";
  openWorkspaceSection("transactions");
  window.RekberVoucher?.renderHistoryRoom?.(order);
  markUserVoucherOrderSeen(order);
  renderTransactionScreen();
  elements.roomPageTitle.textContent = order.product?.name || order.orderCode;
  elements.roomPageSubtitle.textContent = `${order.orderCode} • ${order.statusLabel || order.status}`;
  enterRoomMode();
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
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(response.ok
        ? "Respons server tidak valid. Silakan refresh halaman."
        : `Server error (${response.status}). Silakan coba lagi.`);
    }
  }
  if (!response.ok) {
    throw new Error(payload.message || "Permintaan gagal.");
  }
  return payload;
}

async function fetchWhatsappJson(url, options = {}) {
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
  if (!response.ok) {
    const error = new Error(payload.message || "Permintaan gagal.");
    error.state = payload.state || null;
    throw error;
  }
  return payload;
}

function formatOtpTimer(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getProfileWhatsappInputValue() {
  const input = document.getElementById("profile-whatsapp-input");
  return String(input?.value || state.currentUser?.whatsapp || state.currentUser?.phoneNumber || "").trim();
}

function renderWhatsappVerifiedBadge() {
  return '<span class="verified-inline-badge is-verified whatsapp-verified-badge" aria-label="WhatsApp terverifikasi">✓</span>';
}

function isWhatsappOtpLocked() {
  return Boolean(state.currentUser?.phoneVerified);
}

function isIdentityVerificationLocked() {
  if (!state.currentUser) return true;
  const status = state.currentUser.verificationStatus;
  return status === "pending" || status === "verified";
}

function syncProfileWhatsappInput() {
  const input = document.getElementById("profile-whatsapp-input");
  if (!input || input === document.activeElement) return;
  if (profileVerificationDraft.whatsapp) return;
  const nextValue = state.currentUser?.whatsapp || state.currentUser?.phoneNumber || "";
  if (nextValue) input.value = nextValue;
}

function isProfileVerificationFormFocused() {
  const active = document.activeElement;
  return Boolean(active?.closest("#profile-verification-form"));
}

function captureProfileVerificationDraft() {
  const form = document.getElementById("profile-verification-form");
  if (!form) return;
  const legalName = form.querySelector('[name="legalName"]');
  const ktp = form.querySelector('[name="ktp"]');
  const whatsapp = form.querySelector('[name="whatsapp"], #profile-whatsapp-input');
  if (legalName && !legalName.disabled) profileVerificationDraft.legalName = String(legalName.value || "").trim();
  if (ktp && !ktp.disabled) profileVerificationDraft.ktp = String(ktp.value || "").trim();
  if (whatsapp && !whatsapp.disabled) profileVerificationDraft.whatsapp = String(whatsapp.value || "").trim();
}

function restoreProfileVerificationDraft() {
  const form = document.getElementById("profile-verification-form");
  if (!form) return;
  const legalName = form.querySelector('[name="legalName"]');
  const ktp = form.querySelector('[name="ktp"]');
  const whatsapp = form.querySelector('[name="whatsapp"], #profile-whatsapp-input');
  if (legalName && !legalName.disabled && profileVerificationDraft.legalName) {
    legalName.value = profileVerificationDraft.legalName;
  }
  if (ktp && !ktp.disabled && profileVerificationDraft.ktp) {
    ktp.value = profileVerificationDraft.ktp;
  }
  if (whatsapp && !whatsapp.disabled && profileVerificationDraft.whatsapp) {
    whatsapp.value = profileVerificationDraft.whatsapp;
  }
}

function bindProfileVerificationDraftTracking() {
  const form = document.getElementById("profile-verification-form");
  if (!form || form.dataset.draftBound === "true") return;
  form.dataset.draftBound = "true";
  form.addEventListener("input", captureProfileVerificationDraft);
  form.addEventListener("change", captureProfileVerificationDraft);
}

function clearProfileVerificationDraft() {
  profileVerificationDraft.legalName = "";
  profileVerificationDraft.ktp = "";
  profileVerificationDraft.whatsapp = "";
}

function applyWhatsappOtpPayload(payload) {
  if (payload?.user) state.currentUser = payload.user;
  if (payload?.state) {
    whatsappOtpRuntime.state = payload.state;
    whatsappOtpRuntime.cooldownEndsAt = payload.state.resendCooldownSeconds > 0
      ? Date.now() + (payload.state.resendCooldownSeconds * 1000)
      : 0;
    whatsappOtpRuntime.lockEndsAt = payload.state.lockedUntil
      ? new Date(payload.state.lockedUntil).getTime()
      : 0;
  }
  syncProfileWhatsappInput();
  renderWhatsappOtpModal();
}

function getWhatsappOtpResendCooldown() {
  if (whatsappOtpRuntime.cooldownEndsAt > Date.now()) {
    return Math.max(0, Math.ceil((whatsappOtpRuntime.cooldownEndsAt - Date.now()) / 1000));
  }
  return 0;
}

function getWhatsappOtpLockRemaining() {
  if (whatsappOtpRuntime.lockEndsAt > Date.now()) {
    return Math.max(0, Math.ceil((whatsappOtpRuntime.lockEndsAt - Date.now()) / 1000));
  }
  return 0;
}

function renderWhatsappOtpModal() {
  const otpState = whatsappOtpRuntime.state;
  if (!elements.whatsappOtpModal) return;

  const resendCooldown = getWhatsappOtpResendCooldown();
  const lockRemaining = getWhatsappOtpLockRemaining();
  const showLockout = Boolean(otpState?.maxResendReached) || lockRemaining > 0;

  if (elements.whatsappOtpResendTimer) {
    elements.whatsappOtpResendTimer.textContent = `Timer kirim ulang: ${formatOtpTimer(resendCooldown)}`;
  }
  if (elements.whatsappOtpResendBtn) {
    elements.whatsappOtpResendBtn.disabled = Boolean(
      !otpState
      || otpState.resendDisabled
      || resendCooldown > 0
      || lockRemaining > 0,
    );
  }
  if (elements.whatsappOtpVerifyBtn) {
    elements.whatsappOtpVerifyBtn.disabled = Boolean(
      !otpState?.canVerify
      || String(elements.whatsappOtpInput?.value || "").trim().length !== 6,
    );
  }
  if (elements.whatsappOtpLockoutHelp) {
    elements.whatsappOtpLockoutHelp.classList.toggle("hidden", !showLockout);
  }
  if (elements.whatsappOtpLockoutText) {
    elements.whatsappOtpLockoutText.textContent = OTP_LOCK_MESSAGE;
  }
  if (elements.whatsappOtpLockTimer) {
    elements.whatsappOtpLockTimer.classList.toggle("hidden", lockRemaining <= 0);
    if (lockRemaining > 0) {
      elements.whatsappOtpLockTimer.textContent = `Coba lagi dalam ${formatOtpTimer(lockRemaining)}`;
    }
  }
}

function startWhatsappOtpTick() {
  stopWhatsappOtpTick();
  whatsappOtpRuntime.tickTimer = window.setInterval(() => {
    renderWhatsappOtpModal();
  }, 1000);
}

function stopWhatsappOtpTick() {
  if (whatsappOtpRuntime.tickTimer) {
    window.clearInterval(whatsappOtpRuntime.tickTimer);
    whatsappOtpRuntime.tickTimer = null;
  }
}

function setWhatsappOtpMessage(errorMessage = "", successMessage = "") {
  if (elements.whatsappOtpError) {
    elements.whatsappOtpError.textContent = errorMessage;
    elements.whatsappOtpError.classList.toggle("hidden", !errorMessage);
  }
  if (elements.whatsappOtpSuccess) {
    elements.whatsappOtpSuccess.textContent = successMessage;
    elements.whatsappOtpSuccess.classList.toggle("hidden", !successMessage);
  }
}

function openWhatsappOtpModalShell() {
  if (!elements.whatsappOtpModal) return;
  elements.whatsappOtpModal.classList.remove("hidden");
  elements.whatsappOtpModal.setAttribute("aria-hidden", "false");
  if (elements.whatsappOtpEditPanel) elements.whatsappOtpEditPanel.classList.add("hidden");
  if (elements.whatsappOtpInput) elements.whatsappOtpInput.value = "";
  setWhatsappOtpMessage();
  renderWhatsappOtpModal();
  startWhatsappOtpTick();
  elements.whatsappOtpInput?.focus();
}

function closeWhatsappOtpModal() {
  if (!elements.whatsappOtpModal) return;
  elements.whatsappOtpModal.classList.add("hidden");
  elements.whatsappOtpModal.setAttribute("aria-hidden", "true");
  stopWhatsappOtpTick();
  if (elements.whatsappOtpEditPanel) elements.whatsappOtpEditPanel.classList.add("hidden");
}

async function refreshWhatsappOtpState() {
  if (!state.currentUser) return null;
  const payload = await fetchWhatsappJson("/api/me/whatsapp/status");
  applyWhatsappOtpPayload(payload);
  return payload;
}

async function openWhatsappOtpModal() {
  if (!state.currentUser || isWhatsappOtpLocked()) return;
  const phone = getProfileWhatsappInputValue();
  if (!phone) {
    window.alert("Isi nomor WhatsApp aktif terlebih dahulu.");
    document.getElementById("profile-whatsapp-input")?.focus();
    return;
  }
  openWhatsappOtpModalShell();
  setWhatsappOtpMessage("", "Mengirim kode OTP...");
  try {
    const payload = await fetchWhatsappJson("/api/me/whatsapp/send-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: phone }),
    });
    applyWhatsappOtpPayload(payload);
    setWhatsappOtpMessage("", payload.message || "Kode OTP telah dikirim ke WhatsApp Anda.");
  } catch (error) {
    if (error.state) whatsappOtpRuntime.state = error.state;
    renderWhatsappOtpModal();
    setWhatsappOtpMessage(error.message || "Gagal mengirim OTP.");
    if (error.state?.maxResendReached) {
      setWhatsappOtpMessage();
    }
  }
}

async function handleWhatsappOtpResend() {
  const phone = getProfileWhatsappInputValue();
  if (!phone) {
    setWhatsappOtpMessage("Isi nomor WhatsApp aktif terlebih dahulu.");
    return;
  }
  setWhatsappOtpMessage();
  try {
    const payload = await fetchWhatsappJson("/api/me/whatsapp/send-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: phone, forceResend: true }),
    });
    applyWhatsappOtpPayload(payload);
    if (elements.whatsappOtpInput) elements.whatsappOtpInput.value = "";
    setWhatsappOtpMessage("", payload.message || "Kode OTP telah dikirim ulang.");
  } catch (error) {
    if (error.state) whatsappOtpRuntime.state = error.state;
    renderWhatsappOtpModal();
    setWhatsappOtpMessage(error.message || "Gagal mengirim ulang OTP.");
  }
}

async function handleWhatsappOtpVerify() {
  const otp = String(elements.whatsappOtpInput?.value || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    setWhatsappOtpMessage("OTP harus 6 digit angka.");
    return;
  }
  setWhatsappOtpMessage();
  try {
    const payload = await fetchWhatsappJson("/api/me/whatsapp/verify-otp", {
      method: "POST",
      body: JSON.stringify({ otp }),
    });
    applyWhatsappOtpPayload(payload);
    setWhatsappOtpMessage("", payload.message || "Nomor WhatsApp berhasil diverifikasi.");
    renderAll();
    await refreshDashboard();
    if (payload.user?.phoneVerified) {
      state.currentUser = { ...state.currentUser, ...payload.user, phoneVerified: true };
    }
    renderAll();
    window.setTimeout(() => closeWhatsappOtpModal(), 1200);
  } catch (error) {
    setWhatsappOtpMessage(error.message || "Verifikasi OTP gagal.");
    try {
      await refreshWhatsappOtpState();
    } catch {
      // ignore refresh errors
    }
  }
}

function toggleWhatsappOtpEditPanel(show) {
  if (!elements.whatsappOtpEditPanel) return;
  elements.whatsappOtpEditPanel.classList.toggle("hidden", !show);
  if (show && elements.whatsappOtpEditInput) {
    elements.whatsappOtpEditInput.value = getProfileWhatsappInputValue();
    elements.whatsappOtpEditInput.focus();
  }
}

async function handleWhatsappOtpChangeNumber(rawPhone) {
  if (isWhatsappOtpLocked()) {
    setWhatsappOtpMessage("Nomor WhatsApp sudah terverifikasi dan tidak dapat diubah.");
    return;
  }
  const phone = String(rawPhone || "").trim();
  if (!phone) {
    setWhatsappOtpMessage("Nomor WhatsApp wajib diisi.");
    return;
  }
  setWhatsappOtpMessage();
  try {
    const payload = await fetchWhatsappJson("/api/me/whatsapp/change-number", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: phone }),
    });
    applyWhatsappOtpPayload(payload);
    toggleWhatsappOtpEditPanel(false);
    if (elements.whatsappOtpInput) elements.whatsappOtpInput.value = "";
    setWhatsappOtpMessage("", payload.message || "Nomor WhatsApp diperbarui. Silakan kirim OTP lagi.");
    renderProfile();
  } catch (error) {
    setWhatsappOtpMessage(error.message || "Gagal mengganti nomor WhatsApp.");
  }
}

function handleWhatsappOtpContactAdmin() {
  closeWhatsappOtpModal();
  const params = new URLSearchParams({
    support: "1",
    prefill: OTP_SUPPORT_MESSAGE,
  });
  window.location.href = `/?${params.toString()}`;
}

function bindWhatsappOtpModalControls() {
  if (elements.whatsappOtpModal?.dataset.bound === "true") return;
  if (elements.whatsappOtpModal) elements.whatsappOtpModal.dataset.bound = "true";

  elements.whatsappOtpCloseBtn?.addEventListener("click", closeWhatsappOtpModal);
  elements.whatsappOtpVerifyBtn?.addEventListener("click", handleWhatsappOtpVerify);
  elements.whatsappOtpResendBtn?.addEventListener("click", handleWhatsappOtpResend);
  elements.whatsappOtpEditNumberBtn?.addEventListener("click", () => toggleWhatsappOtpEditPanel(true));
  elements.whatsappOtpSaveNumberBtn?.addEventListener("click", () => {
    handleWhatsappOtpChangeNumber(elements.whatsappOtpEditInput?.value || "");
  });
  elements.whatsappOtpLockChangeBtn?.addEventListener("click", () => toggleWhatsappOtpEditPanel(true));
  elements.whatsappOtpContactAdminBtn?.addEventListener("click", handleWhatsappOtpContactAdmin);
  elements.whatsappOtpInput?.addEventListener("input", (event) => {
    event.currentTarget.value = String(event.currentTarget.value || "").replace(/\D/g, "").slice(0, 6);
    renderWhatsappOtpModal();
  });
  elements.whatsappOtpModal?.addEventListener("click", (event) => {
    if (event.target === elements.whatsappOtpModal) closeWhatsappOtpModal();
  });
}

function bindWhatsappOtpDelegation() {
  if (document.body.dataset.otpDelegationBound === "true") return;
  document.body.dataset.otpDelegationBound = "true";
  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-whatsapp-otp]");
    if (!trigger || trigger.disabled) return;
    if (!trigger.closest("#profile-verification-form")) return;
    event.preventDefault();
    openWhatsappOtpModal();
  });
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
      reject(new Error(payload.message || "Upload file gagal."));
    });

    xhr.addEventListener("error", () => reject(new Error("Koneksi upload terputus.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload dibatalkan.")));
    xhr.send(formData);
  });
}

function setUploadProgressState(message, percent = 0, stateName = "uploading", detail = "Menyiapkan file...") {
  if (!elements.uploadProgress) return;
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  elements.uploadProgress.classList.remove("hidden", "upload-progress-done", "upload-progress-error");
  if (stateName === "done") elements.uploadProgress.classList.add("upload-progress-done");
  if (stateName === "error") elements.uploadProgress.classList.add("upload-progress-error");
  elements.uploadProgressLabel.textContent = message;
  elements.uploadProgressValue.textContent = `${normalized}%`;
  if (elements.uploadProgressDetail) elements.uploadProgressDetail.textContent = detail;
  elements.uploadProgressBar.style.width = `${normalized}%`;
}

function hideUploadProgress() {
  if (!elements.uploadProgress) return;
  elements.uploadProgress.classList.add("hidden");
  elements.uploadProgress.classList.remove("upload-progress-done", "upload-progress-error");
  elements.uploadProgressLabel.textContent = "Sedang upload file...";
  elements.uploadProgressValue.textContent = "0%";
  if (elements.uploadProgressDetail) elements.uploadProgressDetail.textContent = "Menyiapkan file...";
  elements.uploadProgressBar.style.width = "0%";
}

function toggleChatFormBusy(isBusy) {
  const submitButton = elements.chatForm?.querySelector('button[type="submit"]');
  if (elements.chatInput) elements.chatInput.disabled = isBusy;
  if (elements.proofUpload) elements.proofUpload.disabled = isBusy;
  if (submitButton) {
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Uploading..." : "Kirim";
  }
}

async function hydrateCurrentSession() {
  const session = await fetchJson("/api/session");
  state.currentUser = session.user;
  if (state.currentUser?.banned) {
    setAuthStatus(state.currentUser.bannedReason || "Akun Anda sedang diblokir admin.", true);
  }
  if (state.currentUser && !state.currentMemberView) {
    try {
      const shouldOpenDashboard = sessionStorage.getItem("rekberwe-open-dashboard");
      const hasTransactionRoute = new URLSearchParams(window.location.search).has("trx");
      if (shouldOpenDashboard || !hasTransactionRoute) {
        state.currentMemberView = "transactions";
        sessionStorage.removeItem("rekberwe-open-dashboard");
      }
    } catch {
      state.currentMemberView = "transactions";
    }
  }
  setupLiveEvents();
}

async function refreshTransactions() {
  if (!state.currentUser) {
    state.transactions = [];
    return;
  }
  if (state.currentUser.banned) {
    state.transactions = [];
    return;
  }
  const payload = await fetchJson("/api/transactions");
  state.transactions = payload.transactions || [];
}

async function refreshDashboard() {
  if (!state.currentUser) {
    state.dashboard = {
      profile: null,
      linkedProviders: [],
      activeTransactions: [],
      completedTransactions: [],
      chatHistory: [],
    };
    state.supportThread = null;
    return;
  }
  if (state.currentUser.banned) {
    state.dashboard = {
      profile: state.currentUser,
      linkedProviders: [],
      activeTransactions: [],
      completedTransactions: [],
      chatHistory: [],
    };
    state.supportThread = null;
    return;
  }

  const payload = await fetchJson("/api/me/dashboard");
  state.dashboard = payload;
  state.currentUser = payload.profile;
  ensureUserNotificationState();
  refreshSupportThread();
}

function getUserNotificationStorageKey() {
  return state.currentUser ? `rekberwe_user_notifications_${state.currentUser.id}` : "";
}

function ensureUserNotificationState() {
  if (!state.currentUser) {
    notificationState.initialized = false;
    notificationState.seenMessagesByCode = {};
    return;
  }
  const storageKey = getUserNotificationStorageKey();
  if (!storageKey) return;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    notificationState.seenMessagesByCode = saved.seenMessagesByCode || {};
  } catch {
    notificationState.seenMessagesByCode = {};
  }
  if (!notificationState.initialized) {
    notificationState.initialized = true;
    saveUserNotificationState();
  }
}

function saveUserNotificationState() {
  const storageKey = getUserNotificationStorageKey();
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify({
    seenMessagesByCode: notificationState.seenMessagesByCode,
  }));
}

function getLatestTransactionMessageTime(transaction) {
  const lastMessage = transaction?.messages?.[transaction.messages.length - 1];
  return lastMessage?.time || "";
}

function markUserTransactionSeen(transaction) {
  if (!state.currentUser || !transaction?.code) return;
  const latestMessageTime = getLatestTransactionMessageTime(transaction);
  if (!latestMessageTime) return;
  notificationState.seenMessagesByCode[transaction.code] = latestMessageTime;
  saveUserNotificationState();
}

function getVoucherLatestMessageTime(order) {
  const lastMessage = order?.messages?.[order.messages.length - 1];
  return lastMessage?.time || order?.updatedAt || order?.createdAt || "";
}

function markUserVoucherOrderSeen(order) {
  if (!state.currentUser || !order?.orderCode) return;
  const latestMessageTime = getVoucherLatestMessageTime(order);
  if (!latestMessageTime) return;
  notificationState.seenMessagesByCode[order.orderCode] = latestMessageTime;
  saveUserNotificationState();
  updateUserNotificationBadges();
  renderUnifiedTransactionHistory();
}

function getVoucherUnreadCount(order) {
  if (!state.currentUser || !order?.messages?.length) return 0;
  const seenAt = notificationState.seenMessagesByCode[order.orderCode];
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
  return order.messages.filter((message) => {
    const messageTime = new Date(message.time).getTime();
    return message.senderRole === "admin" && messageTime > seenTime;
  }).length;
}

function getUserUnreadCount(transaction) {
  if (!state.currentUser || !transaction?.messages?.length) return 0;
  const seenAt = notificationState.seenMessagesByCode[transaction.code];
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
  return transaction.messages.filter((message) => {
    const messageTime = new Date(message.time).getTime();
    const isIncoming = message.senderUserId !== state.currentUser.id;
    return isIncoming && messageTime > seenTime;
  }).length;
}

function getTotalUserUnreadCount() {
  const allTransactions = [...(state.dashboard.activeTransactions || []), ...(state.dashboard.completedTransactions || [])];
  const rekberUnread = allTransactions.reduce((total, transaction) => total + getUserUnreadCount(transaction), 0);
  const voucherUnread = getVoucherOrdersForHistory().reduce((total, order) => total + getVoucherUnreadCount(order), 0);
  return rekberUnread + voucherUnread;
}

function setButtonBadge(button, count) {
  if (!button) return;
  const existing = button.querySelector(".notif-badge");
  if (!count) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.textContent = String(count);
    return;
  }
  button.insertAdjacentHTML("beforeend", `<span class="notif-badge">${count > 99 ? "99+" : count}</span>`);
}

function unlockUserNotificationAudio() {
  notificationState.audioUnlocked = true;
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  window.RekberPush?.ensurePushEnabled?.({ audience: "user" }).catch(() => {});
  window.removeEventListener("pointerdown", unlockUserNotificationAudio);
  window.removeEventListener("keydown", unlockUserNotificationAudio);
}

function playUserNotificationSound(kind = "chat") {
  if (!notificationState.audioUnlocked) return;
  const now = Date.now();
  if (now - notificationState.lastSoundAt < 1200) return;
  notificationState.lastSoundAt = now;
  if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
  const customSound = state.providerConfig?.notificationSounds?.user?.url || state.providerConfig?.notificationSounds?.admin?.url || "";
  if (customSound) {
    const audio = new Audio(customSound);
    audio.volume = kind === "transaction" ? 0.9 : 0.75;
    audio.play().catch(() => {});
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  context.resume?.().catch(() => {});
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = kind === "transaction" ? 920 : 740;
  gain.gain.value = 0.001;
  oscillator.connect(gain);
  gain.connect(context.destination);
  const start = context.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + (kind === "transaction" ? 0.32 : 0.24));
  oscillator.start(start);
  oscillator.stop(start + (kind === "transaction" ? 0.34 : 0.26));
  oscillator.onended = () => context.close().catch(() => {});
}

function isPresenceOnline(presence) {
  if (!presence?.lastSeenAt) return false;
  return Date.now() - new Date(presence.lastSeenAt).getTime() <= PRESENCE_ONLINE_MS;
}

function formatRelativeLastSeen(value) {
  const diffSeconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.floor(diffHours / 24)} hari lalu`;
}

function formatPresenceLabel(presence) {
  if (isPresenceOnline(presence)) return "Online";
  if (!presence?.lastSeenAt) return "Offline";
  return `Aktif ${formatRelativeLastSeen(presence.lastSeenAt)}`;
}

function getPresenceStateClass(presence, isTyping = false) {
  if (isTyping) return "typing";
  return isPresenceOnline(presence) ? "online" : "offline";
}

async function sendTypingState(code, isTyping) {
  if (!state.currentUser || !code) return;
  await fetchJson(`/api/transactions/${encodeURIComponent(code)}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  }).catch(() => {});
}

function getActiveSupportTyping(thread) {
  if (!thread?.typing) return {};
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(thread.typing).filter(([, value]) => now - new Date(value).getTime() <= TYPING_ACTIVE_MS),
  );
}

function getSupportSelfUserId() {
  return state.currentUser?.id || state.supportThread?.userId || "";
}

async function sendSupportTypingState(isTyping) {
  if (!state.supportThread?.id) return;
  const basePath = state.currentUser ? "/api/support-thread" : "/api/public-support-thread";
  await fetchJson(`${basePath}/typing`, {
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

function renderSupportWidgetPresence() {
  if (elements.supportWidgetAdminState) {
    elements.supportWidgetAdminState.textContent = "Online";
    elements.supportWidgetAdminState.className = "participant-state online";
  }
  const typingText = buildSupportTypingIndicatorText(state.supportThread, getSupportSelfUserId());
  if (elements.supportWidgetTypingIndicator) {
    elements.supportWidgetTypingIndicator.classList.toggle("hidden", !typingText);
    elements.supportWidgetTypingIndicator.textContent = typingText;
  }
}

function getUserHeartbeatBody() {
  const widgetOpen = elements.supportWidgetPanel && !elements.supportWidgetPanel.classList.contains("hidden");
  return {
    activeTransactionCode: state.activeTransaction?.code || "",
    activeSupportThreadId: widgetOpen && state.supportThread?.id ? state.supportThread.id : null,
  };
}

function sendGuestSupportPresenceHeartbeat() {
  if (state.currentUser) return;
  const widgetOpen = elements.supportWidgetPanel && !elements.supportWidgetPanel.classList.contains("hidden");
  if (!widgetOpen) return;
  fetchJson("/api/public-support-thread/presence", { method: "POST", body: "{}" }).catch(() => {});
}

function startSupportPresenceServices() {
  if (supportPresenceTickTimer) window.clearInterval(supportPresenceTickTimer);
  supportPresenceTickTimer = window.setInterval(() => {
    renderSupportWidgetPresence();
  }, 15000);
  if (guestPresenceTimer) window.clearInterval(guestPresenceTimer);
  if (!state.currentUser) {
    sendGuestSupportPresenceHeartbeat();
    guestPresenceTimer = window.setInterval(sendGuestSupportPresenceHeartbeat, 20000);
  }
}

function stopSupportPresenceServices() {
  if (supportPresenceTickTimer) {
    window.clearInterval(supportPresenceTickTimer);
    supportPresenceTickTimer = null;
  }
  if (guestPresenceTimer) {
    window.clearInterval(guestPresenceTimer);
    guestPresenceTimer = null;
  }
}

function applyPresenceToTransaction(transaction, userId, presence, adminPresence) {
  if (!transaction) return transaction;
  const next = { ...transaction };
  if (next.buyer?.id === userId) {
    next.buyer = { ...next.buyer, presence };
  }
  if (next.seller?.id === userId) {
    next.seller = { ...next.seller, presence };
  }
  if (adminPresence) {
    next.adminPresence = adminPresence;
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

function renderRoomPresence(transaction) {
  if (!transaction) return;
  const role = getCurrentUserTransactionRole(transaction);
  const counterparty = role === "buyer" ? transaction.seller : role === "seller" ? transaction.buyer : null;
  const typingText = buildTypingIndicatorText(transaction, state.currentUser?.id);

  if (elements.roomBuyerState) {
    elements.roomBuyerState.textContent = formatPresenceLabel(transaction.buyer?.presence);
    elements.roomBuyerState.className = `participant-state ${getPresenceStateClass(transaction.buyer?.presence)}`;
  }
  if (elements.roomSellerState) {
    elements.roomSellerState.textContent = formatPresenceLabel(transaction.seller?.presence);
    elements.roomSellerState.className = `participant-state ${getPresenceStateClass(transaction.seller?.presence)}`;
  }
  if (elements.roomAdminState) {
    elements.roomAdminState.textContent = formatPresenceLabel(transaction.adminPresence);
    elements.roomAdminState.className = `participant-state ${getPresenceStateClass(transaction.adminPresence)}`;
  }

  const headerLabel = formatPresenceLabel(counterparty?.presence);
  const headerOnline = isPresenceOnline(counterparty?.presence);
  if (elements.mobileChatHeaderOnline) {
    elements.mobileChatHeaderOnline.textContent = `● ${headerLabel}`;
    elements.mobileChatHeaderOnline.style.color = headerOnline ? "#22c55e" : "#93a4c3";
  }
  if (elements.chatTypingIndicator) {
    elements.chatTypingIndicator.classList.toggle("hidden", !typingText);
    elements.chatTypingIndicator.textContent = typingText;
  }
}

function startPresenceTick() {
  if (presenceTickTimer) window.clearInterval(presenceTickTimer);
  presenceTickTimer = window.setInterval(() => {
    if (state.activeTransaction) renderRoomPresence(state.activeTransaction);
  }, PRESENCE_UI_TICK_MS);
}

function sendUserPresenceAway() {
  if (!state.currentUser) return;
  const body = JSON.stringify({ ...getUserHeartbeatBody(), offline: true });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/presence/heartbeat", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/presence/heartbeat", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

window.addEventListener("pagehide", sendUserPresenceAway);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !state.currentUser) return;
  fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getUserHeartbeatBody()) }).catch(() => {});
  if (state.activeTransaction) renderRoomPresence(state.activeTransaction);
});

function bindProviderButtons() {
  document.querySelectorAll(".provider-btn[data-provider]").forEach((button) => {
    button.addEventListener("click", () => startProviderLogin(button.dataset.provider));
  });
}

function bindScrollButtons() {
  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.scrollTarget);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindBrandHomeNavigation() {
  document.querySelectorAll(".brand-block, .workspace-sidebar-brand, .mobile-workspace-brand").forEach((brand) => {
    if (brand.dataset.homeBound === "true") return;
    brand.dataset.homeBound = "true";
    brand.classList.add("brand-home-trigger");
    brand.setAttribute("role", "button");
    brand.setAttribute("tabindex", "0");
    brand.setAttribute("aria-label", "Kembali ke beranda");
    brand.addEventListener("click", handleBrandHomeClick);
    brand.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleBrandHomeClick();
    });
  });
}

function handleBrandHomeClick() {
  if (state.transactionScreen === "room") {
    exitRoomMode();
    state.transactionScreen = "list";
  }
  openHomeView();
}

function openJaminanRekberPage() {
  window.open("/jaminan-rekber", "_blank", "noopener,noreferrer");
}

function bindForms() {
  bindBrandHomeNavigation();
  elements.homeNavButton?.addEventListener("click", openHomeView);
  elements.openLogin?.addEventListener("click", openLoginModal);
  elements.heroLoginButton?.addEventListener("click", openLoginModal);
  elements.heroLoginButtonAlt?.addEventListener("click", openLoginModal);
  elements.homeLoginShortcut?.addEventListener("click", openLoginModal);
  elements.logoutButton?.addEventListener("click", handleLogout);
  elements.mobileHeaderLogout?.addEventListener("click", handleLogout);
  elements.mobileChatBack?.addEventListener("click", () => {
    openTransactionListView();
    openWorkspaceSection("transactions");
  });
  elements.transactionsNavButton?.addEventListener("click", () => {
    openTransactionListView();
    openWorkspaceSection("transactions");
  });
  elements.profileNavButton?.addEventListener("click", () => openWorkspaceSection("profile"));
  elements.sidebarHomeButton?.addEventListener("click", () => openWorkspaceSection("dashboard"));
  elements.sidebarTransactionsButton?.addEventListener("click", () => {
    openTransactionListView();
    openWorkspaceSection("transactions");
  });
  const handleUnifiedHistoryClick = async (event) => {
    const rekberButton = event.target.closest("[data-open-rekber-history]");
    if (rekberButton) {
      await openHistoryRekberRoom(rekberButton.dataset.openRekberHistory);
      return;
    }
    const voucherButton = event.target.closest("[data-open-voucher-order]");
    if (voucherButton) {
      await openHistoryVoucherRoom(voucherButton.dataset.openVoucherOrder);
    }
  };
  elements.transactionUnifiedHistoryList?.addEventListener("click", handleUnifiedHistoryClick);
  elements.mobileUnifiedHistoryList?.addEventListener("click", handleUnifiedHistoryClick);
  elements.mobileActiveTransactionsList?.addEventListener("click", handleUnifiedHistoryClick);
  document.getElementById("mobile-profile-verification-btn")?.addEventListener("click", () => openWorkspaceSection("verification"));
  document.getElementById("mobile-profile-guide-btn")?.addEventListener("click", () => {
    window.location.href = "/security-guide";
  });
  elements.sidebarProfileButton?.addEventListener("click", () => openWorkspaceSection("profile"));
  elements.sidebarNotificationsButton?.addEventListener("click", () => openWorkspaceSection("notifications"));
  elements.sidebarVerificationButton?.addEventListener("click", () => openWorkspaceSection("verification"));
  elements.sidebarCreateTransaction?.addEventListener("click", () => {
    if (isMobileViewport()) {
      openMobileCreateTransaction();
      return;
    }
    openWorkspaceSection("dashboard");
  });
  elements.workspaceCreateTransactionButton?.addEventListener("click", () => {
    openWorkspaceSection("dashboard");
  });
  elements.workspaceOpenTransactionsButton?.addEventListener("click", () => {
    state.transactionScreen = "list";
    openWorkspaceSection("transactions");
  });
  elements.sidebarSecurityGuideButton?.addEventListener("click", () => {
    window.location.href = "/security-guide";
  });
  elements.sidebarLiveChatButton?.addEventListener("click", openSupportWidgetIfClosed);
  elements.mobileQuickCreate?.addEventListener("click", () => {
    openMobileCreateTransaction();
  });
  elements.mobileQuickVoucher?.addEventListener("click", () => {
    openMobileVoucherWorkspace();
  });
  elements.mobileQuickVerification?.addEventListener("click", () => openWorkspaceSection("verification"));
  elements.mobileDashboardSeeAll?.addEventListener("click", () => {
    state.transactionScreen = "list";
    openWorkspaceSection("transactions");
  });
  elements.mobileQuickGuide?.addEventListener("click", openJaminanRekberPage);
  elements.homeSidebarDashboard?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  elements.mobileQuickSecurity?.addEventListener("click", () => {
    openMobileDashboardDetail("workspace-terms-list");
  });
  elements.mobileDashboardLearnMore?.addEventListener("click", () => {
    openMobileDashboardDetail("workspace-public-fee-list");
  });
  elements.mobileHeaderNotifications?.addEventListener("click", () => openWorkspaceSection("notifications"));
  elements.mobileHeaderProfile?.addEventListener("click", () => openWorkspaceSection("profile"));
  elements.mobileNavDashboard?.addEventListener("click", () => {
    state.mobileCreateOpen = false;
    openWorkspaceSection("dashboard");
  });
  elements.mobileNavTransactions?.addEventListener("click", () => {
    openTransactionListView();
    openWorkspaceSection("transactions");
  });
  elements.mobileNavCreate?.addEventListener("click", () => {
    openMobileCreateChoiceModal();
  });
  elements.mobileCreateChoiceRekber?.addEventListener("click", () => {
    closeMobileCreateChoiceModal();
    openMobileCreateTransaction();
  });
  elements.mobileCreateChoiceVoucher?.addEventListener("click", () => {
    closeMobileCreateChoiceModal();
    openMobileVoucherWorkspace();
  });
  elements.mobileCreateChoiceCancel?.addEventListener("click", closeMobileCreateChoiceModal);
  elements.mobileCreateChoiceModal?.addEventListener("click", (event) => {
    if (event.target === elements.mobileCreateChoiceModal) closeMobileCreateChoiceModal();
  });
  elements.mobileNavSupport?.addEventListener("click", openSupportWidgetIfClosed);
  elements.mobileNavAccount?.addEventListener("click", () => openWorkspaceSection("profile"));
  elements.mobileChatHeaderMenu?.addEventListener("click", () => toggleMobileDetailSheet());
  elements.mobileRoomDetailButton?.addEventListener("click", () => {
    if (isMobileViewport()) {
      toggleMobileDetailSheet();
      return;
    }
    document.querySelector(".room-summary-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.mobileDetailBackdrop?.addEventListener("click", () => toggleMobileDetailSheet(false));
  elements.mobileDetailClose?.addEventListener("click", () => toggleMobileDetailSheet(false));
  elements.mobileRoomUploadButton?.addEventListener("click", () => elements.proofUpload?.click());
  elements.mobileRoomGuideButton?.addEventListener("click", () => window.open("/security-guide", "_blank", "noopener"));
  elements.mobileRoomDisputeButton?.addEventListener("click", () => elements.openDispute?.click());
  elements.homeLiveChatShortcut?.addEventListener("click", openSupportWidgetIfClosed);
  elements.telegramDirectLogin.addEventListener("click", () => startProviderLogin("Telegram"));
  elements.googleDirectLogin.addEventListener("click", () => startProviderLogin("Google"));
  elements.facebookDirectLogin.addEventListener("click", () => startProviderLogin("Facebook"));
  elements.discordDirectLogin.addEventListener("click", () => startProviderLogin("Discord"));
  elements.transactionForm?.addEventListener("submit", handleCreateTransaction);
  elements.workspaceTransactionForm?.addEventListener("submit", handleCreateTransaction);
  [elements.transactionForm, elements.workspaceTransactionForm].forEach((form) => {
    form?.addEventListener("input", (event) => {
      handlePriceInputFormat(event);
      handleWarrantyInputFormat(event);
      updateTransactionFeePreview(form);
      toggleVerificationFieldsForForm(form);
    });
    form?.addEventListener("paste", (event) => {
      if (event.target?.name !== "warranty") return;
      event.preventDefault();
      const pasted = (event.clipboardData || window.clipboardData)?.getData("text") || "";
      event.target.value = sanitizeWarrantyDigits(pasted);
      validateWarrantyField(form);
    });
    form?.addEventListener("blur", (event) => {
      if (event.target?.name !== "warranty") return;
      validateWarrantyField(form);
    }, true);
  });
  elements.joinTransaction?.addEventListener("click", handleJoinTransaction);
  elements.mobileJoinTransaction?.addEventListener("click", handleJoinTransaction);
  elements.mobileJoinCode?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleJoinTransaction();
  });
  document.getElementById("profile-open-verification-link")?.addEventListener("click", () => openWorkspaceSection("verification"));
  elements.joinAsBuyer.addEventListener("click", () => handleRoleJoin("buyer"));
  elements.joinAsSeller.addEventListener("click", () => handleRoleJoin("seller"));
  elements.backToTransactionList?.addEventListener("click", handleWorkspaceBackNavigation);
  elements.chatForm.addEventListener("submit", handleSendMessage);
  elements.chatInput?.addEventListener("input", () => {
    if (!state.activeTransaction?.code) return;
    if (typingStopTimer) window.clearTimeout(typingStopTimer);
    const value = String(elements.chatInput?.value || "").trim();
    if (!value) {
      sendTypingState(state.activeTransaction.code, false);
      return;
    }
    sendTypingState(state.activeTransaction.code, true);
    typingStopTimer = window.setTimeout(() => {
      if (state.activeTransaction?.code) sendTypingState(state.activeTransaction.code, false);
    }, 1600);
  });
  elements.proofUpload?.addEventListener("change", renderPendingAttachments);
  elements.pendingAttachments?.addEventListener("click", handlePendingAttachmentRemove);
  elements.markPaid?.addEventListener("click", () => handleTransactionAction("mark_paid"));
  elements.accountDelivered?.addEventListener("click", () => handleTransactionAction("account_delivered"));
  elements.goodsReceived?.addEventListener("click", () => handleTransactionAction("goods_received"));
  elements.openDispute?.addEventListener("click", () => handleTransactionAction("open_dispute"));
  elements.cancelTransaction?.addEventListener("click", () => handleTransactionAction("cancel_transaction"));
  elements.lookupProfile?.addEventListener("click", handleProfileLookup);
  elements.lookupProfileWorkspace?.addEventListener("click", handleProfileLookup);
  document.getElementById("workspace-open-verification-link")?.addEventListener("click", () => openWorkspaceSection("verification"));
  elements.openProfileTab?.addEventListener("click", () => {
    openWorkspaceSection("verification");
    closeVerificationModal();
  });
  bindWhatsappOtpModalControls();
  bindWhatsappOtpDelegation();
  elements.closeVerificationModal.addEventListener("click", closeVerificationModal);
  elements.closeLocationConsentModal?.addEventListener("click", () => closeLocationConsentModal(false));
  elements.approveLocationConsentModal?.addEventListener("click", () => closeLocationConsentModal(true));
  elements.confirmModalCancel?.addEventListener("click", () => closeConfirmModal(false));
  elements.confirmModalApprove?.addEventListener("click", () => closeConfirmModal(true));
  elements.promptModalCancel?.addEventListener("click", () => closePromptModal(null));
  elements.promptModalApprove?.addEventListener("click", () => closePromptModal(elements.promptModalInput?.value || ""));
  elements.supportWidgetToggle?.addEventListener("click", toggleSupportWidget);
  elements.supportWidgetClose?.addEventListener("click", toggleSupportWidget);
  elements.supportWidgetForm?.addEventListener("submit", handleSupportMessageSubmit);
  elements.supportWidgetInput?.addEventListener("input", () => {
    if (!state.supportThread?.id) return;
    if (supportTypingStopTimer) window.clearTimeout(supportTypingStopTimer);
    const value = String(elements.supportWidgetInput?.value || "").trim();
    if (!value) {
      sendSupportTypingState(false);
      return;
    }
    sendSupportTypingState(true);
    supportTypingStopTimer = window.setTimeout(() => {
      sendSupportTypingState(false);
    }, 1600);
  });
  elements.copyCreatedTransactionLink?.addEventListener("click", copyCreatedTransactionLink);
  elements.shareCreatedTransactionLink?.addEventListener("click", shareCreatedTransactionLink);
  elements.openCreatedTransactionRoom?.addEventListener("click", openCreatedTransactionRoom);
  elements.closeLoginModal?.addEventListener("click", closeLoginModal);
  elements.closeUserProfileModal?.addEventListener("click", closeUserProfileModal);
  document.addEventListener("click", handleProfileTriggerClick);
  document.addEventListener("keydown", (event) => {
    const trigger = event.target.closest("[data-profile-trigger]");
    if (!trigger || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    const role = String(trigger.dataset.profileTrigger || "");
    if (role) openUserProfileModal(role);
  });
  initSupportWidgetDrag();
}

function updateProviderAvailability() {
  if (!state.providerConfig?.providers) return;
  const providerMap = new Map(state.providerConfig.providers.map((item) => [item.name, item]));
  document.querySelectorAll("[data-provider]").forEach((button) => {
    if (normalizeProviderName(button.dataset.provider) === "Facebook") {
      button.classList.add("hidden");
      button.disabled = true;
      button.setAttribute("aria-hidden", "true");
      return;
    }
    const provider = providerMap.get(normalizeProviderName(button.dataset.provider));
    if (!provider || provider.enabled) return;
    button.disabled = true;
    button.title = `Provider ${button.dataset.provider} belum diaktifkan di file .env backend.`;
  });
}

function startProviderLogin(providerName, mode = "login") {
  const normalized = normalizeProviderName(providerName);
  if (!normalized) return;
  if (normalized === "Facebook") {
    closeLoginModal();
    setAuthStatus("Login Facebook saat ini sedang pengembangan. Silakan login melalui Google, Discord, atau Telegram.", true);
    return;
  }
  closeLoginModal();
  setAuthStatus(`Mengarahkan ke login ${normalized}...`);
  const params = new URLSearchParams();
  if (mode === "link") params.set("mode", "link");
  params.set("returnTo", `${window.location.pathname}${window.location.search}`);
  window.location.href = `/auth/${normalized.toLowerCase()}?${params.toString()}`;
}

function handleProviderAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const authResult = params.get(appConfig.authCallbackParam);
  if (!authResult) return;

  const providerName = normalizeProviderName(params.get("provider"));
  const label = providerName || "provider";
  if (authResult === "success") {
    try {
      sessionStorage.setItem("rekberwe-open-dashboard", "1");
    } catch {}
    window.RekberAnalytics?.track?.("login_success");
    setAuthStatus(`Login atau penghubungan ${label} berhasil.`);
  } else {
    const message = params.get("message");
    window.RekberAnalytics?.track?.("login_failed");
    setAuthStatus(`Login ${label} gagal${message ? `: ${message}` : "."}`, true);
  }

  params.delete(appConfig.authCallbackParam);
  params.delete("provider");
  params.delete("message");
  const cleanQuery = params.toString();
  history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
}

function setAuthStatus(message, isError = false) {
  const inWorkspace = Boolean(state.currentUser && document.body.classList.contains("is-member-view"));
  const target = inWorkspace && elements.workspaceStatusToast
    ? elements.workspaceStatusToast
    : elements.telegramStatus;
  if (!target) return;
  target.textContent = message;
  target.classList.remove("hidden");
  target.style.background = isError ? "rgba(180, 58, 45, 0.1)" : "rgba(28, 125, 87, 0.1)";
  target.style.color = isError ? "#b43a2d" : "#1c7d57";
  target.style.borderColor = isError ? "rgba(180, 58, 45, 0.14)" : "rgba(28, 125, 87, 0.14)";
  if (inWorkspace && elements.workspaceStatusToast) {
    window.clearTimeout(setAuthStatus.hideTimer);
    setAuthStatus.hideTimer = window.setTimeout(() => {
      elements.workspaceStatusToast?.classList.add("hidden");
    }, 6000);
  }
}

async function handleLogout() {
  if (liveEventSource) {
    liveEventSource.close();
    liveEventSource = null;
  }
  if (userPresenceTimer) {
    window.clearInterval(userPresenceTimer);
    userPresenceTimer = null;
  }
  if (presenceTickTimer) {
    window.clearInterval(presenceTickTimer);
    presenceTickTimer = null;
  }
  await fetchJson("/api/logout", { method: "POST" });
  state.currentUser = null;
  state.activeTransaction = null;
  state.transactions = [];
  state.currentMemberView = null;
  state.supportThread = null;
  notificationState.initialized = false;
  notificationState.seenMessagesByCode = {};
  stopSupportThreadPolling();
  await refreshTransactions();
  await refreshDashboard();
  renderAll();
  setAuthStatus("Anda sudah logout.");
}

async function handleCreateTransaction(event) {
  event.preventDefault();
  if (!state.currentUser) {
    openLoginModal();
    return;
  }

  const form = event.currentTarget;
  const formData = new FormData(form);
  const role = String(formData.get("role") || "").trim();

  if (role === "seller" && state.currentUser.verificationStatus !== "verified") {
    openVerificationModal("Untuk membuat transaksi sebagai penjual, Anda wajib verifikasi KTP dulu di menu Verifikasi.");
    showResult(form, "Penjual wajib verifikasi KTP dulu di menu Verifikasi.", true);
    return;
  }

  window.RekberAnalytics?.track?.("create_transaction_click");

  const warrantyRaw = String(formData.get("warranty") || "").trim();
  const warrantyCheck = validateWarrantyValue(warrantyRaw);
  if (!warrantyCheck.valid) {
    setWarrantyFieldError(form, warrantyCheck.message);
    showResult(form, warrantyCheck.message, true);
    form.querySelector('select[name="warranty"], input[name="warranty"]')?.focus();
    return;
  }
  setWarrantyFieldError(form, "");

  const price = parseCurrencyInput(formData.get("price"));
  if (!Number.isFinite(price) || price <= 0) {
    showResult(form, "Harga transaksi harus lebih dari 0.", true);
    return;
  }

  try {
    const payload = await fetchJson("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        title: String(formData.get("title") || "").trim(),
        price,
        role,
        type: String(formData.get("type") || "").trim(),
        warranty: warrantyCheck.value,
        sellerPayoutAccount: String(formData.get("sellerPayoutAccount") || "").trim(),
        feePayer: String(formData.get("feePayer") || "").trim(),
      }),
    });

    await refreshTransactions();
    await refreshDashboard();

    window.RekberAnalytics?.track?.("create_transaction_success", { transactionCode: payload.transaction.code });

    const shareLink = buildTransactionLink(payload.transaction.code);
    state.activeTransaction = payload.transaction;
    state.transactionScreen = "room";
    state.currentMemberView = "transactions";
    state.workspaceSection = "transactions";
    state.mobileCreateOpen = false;
    showResult(form, `Transaksi ${payload.transaction.code} berhasil dibuat. Bagikan link ini ke lawan transaksi: ${shareLink}`, false);
    history.replaceState({}, "", `?trx=${payload.transaction.code}`);
    form.reset();
    setWarrantyFieldError(form, "");
    toggleVerificationFieldsForForm(form);
    updateTransactionFeePreview(form);
    if (isMobileViewport() && await openMobileTransactionChat(payload.transaction.code)) {
      await refreshTransactions();
      await refreshDashboard();
      return;
    }
    renderAll();
  } catch (error) {
    const message = error?.message || "Gagal membuat transaksi.";
    if (/garansi/i.test(message)) {
      setWarrantyFieldError(form, message);
    }
    showResult(form, message, true);
  }
}

function parseCurrencyInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return Number(digits || 0);
}

function formatCurrencyInputValue(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

function handlePriceInputFormat(event) {
  const input = event?.target;
  if (!input || input.name !== "price") return;
  input.value = formatCurrencyInputValue(input.value);
}

function sanitizeWarrantyDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function validateWarrantyValue(rawValue) {
  const raw = sanitizeWarrantyDigits(rawValue);
  if (!raw || raw === "0") {
    return { valid: true, days: 0, value: "" };
  }
  const days = Number(raw);
  if (!Number.isFinite(days) || !ALLOWED_WARRANTY_DAYS.has(days)) {
    return { valid: false, message: WARRANTY_VALIDATION_MESSAGE };
  }
  return { valid: true, days, value: String(days) };
}

function setWarrantyFieldError(form, message) {
  const input = form?.querySelector('select[name="warranty"], input[name="warranty"]');
  const errorEl = form?.querySelector(".warranty-field-error");
  if (!errorEl) return;
  if (!message) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    input?.classList.remove("field-invalid");
    return;
  }
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  input?.classList.add("field-invalid");
}

function validateWarrantyField(form) {
  const input = form?.querySelector('select[name="warranty"], input[name="warranty"]');
  if (!input) return { valid: true };
  const result = validateWarrantyValue(input.value);
  if (!result.valid) {
    setWarrantyFieldError(form, result.message);
    return result;
  }
  setWarrantyFieldError(form, "");
  return result;
}

function handleWarrantyInputFormat(event) {
  const input = event?.target;
  if (!input || input.name !== "warranty" || input.tagName === "SELECT") return;
  const sanitized = sanitizeWarrantyDigits(input.value);
  if (sanitized !== input.value) {
    input.value = sanitized;
  }
  validateWarrantyField(input.closest("form"));
}

function toggleVerificationFieldsForForm(form) {
  if (!form) return "buyer";
  const selectedRole = form.querySelector('select[name="role"]')?.value || "buyer";
  const sellerPayoutGroup = form.querySelector(".seller-payout-account-group");
  const sellerPayoutInput = form.querySelector('input[name="sellerPayoutAccount"]');
  if (sellerPayoutGroup) {
    sellerPayoutGroup.classList.toggle("hidden", selectedRole !== "seller");
  }
  if (sellerPayoutInput) {
    sellerPayoutInput.required = selectedRole === "seller";
  }
  return selectedRole;
}

function showResult(form, message, isError) {
  const resultBox = form?.id === "workspace-transaction-form"
    ? elements.workspaceTransactionResult
    : elements.transactionResult;
  if (!resultBox) return;
  resultBox.classList.remove("hidden");
  resultBox.style.background = isError ? "rgba(180, 58, 45, 0.1)" : "rgba(28, 125, 87, 0.1)";
  resultBox.style.borderColor = isError ? "rgba(180, 58, 45, 0.16)" : "rgba(28, 125, 87, 0.16)";
  resultBox.textContent = message;
}

function buildTransactionLink(code) {
  const path = `${window.location.origin}/?trx=${code}`;
  const sampleText = `${window.location.host || "contohnamasitus.com"}/t/${code}`;
  if (elements.sampleLink) {
    elements.sampleLink.textContent = sampleText;
  }
  const workspaceSampleLink = document.getElementById("workspace-sample-link");
  if (workspaceSampleLink) {
    workspaceSampleLink.textContent = sampleText;
  }
  return path;
}

function rememberPendingTransactionRoute(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return;
  try {
    sessionStorage.setItem("rekberwe-pending-trx", normalized);
  } catch {}
}

function consumePendingTransactionRoute() {
  try {
    const value = sessionStorage.getItem("rekberwe-pending-trx") || "";
    sessionStorage.removeItem("rekberwe-pending-trx");
    return value;
  } catch {
    return "";
  }
}

const PENDING_SELLER_JOIN_KEY = "rekberwe-pending-seller-join";

function rememberPendingSellerJoin(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return;
  try {
    sessionStorage.setItem(PENDING_SELLER_JOIN_KEY, normalized);
  } catch {}
}

function getPendingSellerJoinCode() {
  try {
    return String(sessionStorage.getItem(PENDING_SELLER_JOIN_KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

function clearPendingSellerJoin() {
  try {
    sessionStorage.removeItem(PENDING_SELLER_JOIN_KEY);
  } catch {}
}

function sellerMustVerifyBeforeJoin(allowedRole) {
  return allowedRole === "seller" && state.currentUser?.verificationStatus !== "verified";
}

async function notifySellerVerificationIntent(code) {
  return fetchJson(`/api/transactions/${encodeURIComponent(code)}/seller-verification-intent`, {
    method: "POST",
  });
}

function openSellerVerificationModal(code, message) {
  const text = document.getElementById("verification-modal-text");
  const title = elements.verificationModal?.querySelector("h3");
  if (title) title.textContent = "Verifikasi penjual diperlukan";
  if (text) {
    text.textContent = message || `Sebagai penjual untuk transaksi ${code}, Anda wajib verifikasi identitas terlebih dahulu. Setelah admin menyetujui, Anda akan langsung masuk ke ruang chat transaksi.`;
  }
  elements.verificationModal?.classList.remove("hidden");
}

async function beginUnverifiedSellerJoinFlow(transaction) {
  const code = String(transaction?.code || "").trim().toUpperCase();
  if (!code) return;
  rememberPendingSellerJoin(code);
  rememberPendingTransactionRoute(code);
  state.pendingJoinTransaction = transaction;
  closeJoinRoleModal();

  try {
    await notifySellerVerificationIntent(code);
  } catch (error) {
    console.warn("Gagal mengirim notifikasi verifikasi penjual:", error);
  }

  const status = state.currentUser?.verificationStatus;
  if (status === "pending") {
    openSellerVerificationModal(
      code,
      `Verifikasi identitas Anda sedang ditinjau admin untuk transaksi ${code}. Pembeli sudah diberi tahu untuk menunggu. Setelah disetujui, Anda akan langsung masuk ke ruang chat.`,
    );
    return;
  }

  if (status === "revision_required") {
    openSellerVerificationModal(
      code,
      `Admin meminta perbaikan verifikasi sebelum Anda bisa masuk sebagai penjual di transaksi ${code}. Silakan perbaiki data verifikasi.`,
    );
    openWorkspaceSection("verification");
    return;
  }

  openSellerVerificationModal(
    code,
    `Sebagai penjual untuk transaksi ${code}, Anda wajib verifikasi KTP dan WhatsApp terlebih dahulu. Pembeli sudah diberi tahu bahwa Anda sedang verifikasi. Setelah admin menyetujui, Anda akan langsung masuk ke ruang chat.`,
  );
  openWorkspaceSection("verification");
}

async function enterTransactionRoom(code, transaction) {
  const normalized = String(code || "").trim().toUpperCase();
  closeJoinRoleModal();
  closeVerificationModal();
  if (transaction) state.activeTransaction = transaction;
  if (isMobileViewport() && await openMobileTransactionChat(normalized)) {
    return;
  }
  state.activeTransaction = transaction;
  state.transactionScreen = "room";
  await refreshTransactions();
  await refreshDashboard();
  openWorkspaceSection("transactions");
  renderAll();
  history.replaceState({}, "", `?trx=${normalized}`);
  document.getElementById("ruang-transaksi")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function tryCompletePendingSellerJoin(preferredCode = "") {
  const code = String(preferredCode || getPendingSellerJoinCode() || "").trim().toUpperCase();
  if (!code || !state.currentUser || state.currentUser.verificationStatus !== "verified") {
    return false;
  }

  try {
    let transaction = null;
    try {
      const joined = await fetchJson(`/api/transactions/${encodeURIComponent(code)}/join`, {
        method: "POST",
        body: JSON.stringify({ role: "seller" }),
      });
      transaction = joined.transaction;
    } catch (joinError) {
      const current = await fetchJson(`/api/transactions/${encodeURIComponent(code)}`);
      transaction = current.transaction;
      if (transaction?.seller?.id !== state.currentUser.id) {
        throw joinError;
      }
    }

    clearPendingSellerJoin();
    state.pendingJoinTransaction = null;
    setAuthStatus(`Verifikasi disetujui. Anda sudah masuk ke ruang chat transaksi ${code}.`);
    await enterTransactionRoom(code, transaction);
    return true;
  } catch (error) {
    console.warn("Gagal menyelesaikan join penjual tertunda:", error);
    return false;
  }
}

function buildJoinRoleInstruction(allowedRole) {
  if (allowedRole === "seller" && state.currentUser?.verificationStatus !== "verified") {
    return "Untuk transaksi ini Anda hanya bisa masuk sebagai Penjual. Akun Anda belum terverifikasi, silakan verifikasi dulu di menu Verifikasi lalu buka kembali link transaksi ini.";
  }
  return `Untuk transaksi ini Anda hanya bisa masuk sebagai ${allowedRole === "buyer" ? "Pembeli" : "Penjual"}.`;
}

function getTransactionActionAvailability(transaction, action) {
  const currentRole = getCurrentUserTransactionRole(transaction);
  if (!transaction) return { enabled: false, reason: "Transaksi belum dipilih." };
  if (action === "account_delivered") {
    if (currentRole !== "seller") return { enabled: false, reason: "Hanya penjual yang bisa klik tombol ini." };
    if (!transaction.adminFundsReceived) return { enabled: false, reason: "Belum bisa dipakai karena admin belum menekan Dana sudah diterima." };
    if (transaction.paymentStatus === "Akun sudah diserahkan" || transaction.buyerConfirmedReceived || transaction.sellerPayoutSent) {
      return { enabled: false, reason: "Tombol ini sudah dipakai atau tahap transaksi sudah lewat." };
    }
    return { enabled: true, reason: "" };
  }
  if (action === "goods_received") {
    if (currentRole !== "buyer") return { enabled: false, reason: "Hanya pembeli yang bisa klik tombol ini." };
    if (!transaction.adminFundsReceived) return { enabled: false, reason: "Belum bisa dipakai karena admin belum menekan Dana sudah diterima." };
    if (transaction.paymentStatus !== "Akun sudah diserahkan" && !transaction.buyerConfirmedReceived && !transaction.sellerPayoutSent) {
      return { enabled: false, reason: "Belum bisa dipakai karena penjual belum menekan Data / Item Diserahkan." };
    }
    if (transaction.buyerConfirmedReceived || transaction.sellerPayoutSent) {
      return { enabled: false, reason: "Tombol ini sudah dipakai atau transaksi sudah lanjut ke tahap berikutnya." };
    }
    return { enabled: true, reason: "" };
  }
  if (action === "cancel_transaction") {
    if (transaction.paymentStatus === "Transaksi dibatalkan" || transaction.paymentStatus === "Selesai") {
      return { enabled: false, reason: "Transaksi ini sudah ditutup." };
    }
    return { enabled: true, reason: "" };
  }
  return { enabled: true, reason: "" };
}

async function handleJoinTransaction() {
  const code = String(
    elements.joinCode?.value
    || elements.mobileJoinCode?.value
    || "",
  ).trim().toUpperCase();
  if (!code) {
    setAuthStatus("Masukkan kode transaksi terlebih dahulu.", true);
    return;
  }

  if (!state.currentUser) {
    rememberPendingTransactionRoute(code);
    setAuthStatus("Silakan login terlebih dahulu. Jika Anda penjual, setelah login Anda akan diarahkan ke verifikasi identitas sebelum masuk ruang chat.", true);
    openLoginModal();
    return;
  }

  try {
  const localTransaction = state.transactions.find((item) => item.code === code);
  if (localTransaction) {
    const allowedRoleLocal = localTransaction.createdByRole === "buyer" ? "seller" : "buyer";
    const alreadyParticipantLocal = localTransaction.buyer?.id === state.currentUser.id || localTransaction.seller?.id === state.currentUser.id;

    if (alreadyParticipantLocal || (localTransaction.buyer && localTransaction.seller)) {
      closeJoinRoleModal();
      if (isMobileViewport() && await openMobileTransactionChat(code)) {
        return;
      }
      let latestTransaction = localTransaction;
      try {
        const current = await fetchJson(`/api/transactions/${code}`);
        latestTransaction = current.transaction || localTransaction;
      } catch (error) {
        console.warn("Gagal mengambil detail transaksi terbaru:", error);
      }
      state.activeTransaction = latestTransaction;
      state.transactionScreen = "room";
      openWorkspaceSection("transactions");
      renderAll();
      history.replaceState({}, "", `?trx=${code}`);
      return;
    }

    if (sellerMustVerifyBeforeJoin(allowedRoleLocal)) {
      await beginUnverifiedSellerJoinFlow(localTransaction);
      return;
    }

    state.pendingJoinTransaction = localTransaction;
    state.transactionScreen = "room";
    renderTransactionScreen();
    openJoinRoleModal();
    elements.joinRoleNote.textContent = buildJoinRoleInstruction(allowedRoleLocal);
    elements.joinAsBuyer.disabled = allowedRoleLocal !== "buyer";
    elements.joinAsSeller.disabled = allowedRoleLocal !== "seller";
    return;
  }

  const current = await fetchJson(`/api/transactions/${code}`);
  let transaction = current.transaction;
  const allowedRole = transaction.createdByRole === "buyer" ? "seller" : "buyer";
  const alreadyParticipant = transaction.buyer?.id === state.currentUser.id || transaction.seller?.id === state.currentUser.id;

  if (!alreadyParticipant && (!transaction.buyer || !transaction.seller)) {
    if (sellerMustVerifyBeforeJoin(allowedRole)) {
      await beginUnverifiedSellerJoinFlow(transaction);
      return;
    }
    state.pendingJoinTransaction = transaction;
    state.transactionScreen = "room";
    renderTransactionScreen();
    openJoinRoleModal();
    elements.joinRoleNote.textContent = buildJoinRoleInstruction(allowedRole);
    elements.joinAsBuyer.disabled = allowedRole !== "buyer";
    elements.joinAsSeller.disabled = allowedRole !== "seller";
    return;
  }

  elements.joinRoleBox.classList.add("hidden");
  closeJoinRoleModal();
  if (isMobileViewport() && await openMobileTransactionChat(code)) {
    return;
  }
  state.activeTransaction = transaction;
  state.transactionScreen = "room";
  await refreshTransactions();
  await refreshDashboard();
  openWorkspaceSection("transactions");
  renderAll();
  history.replaceState({}, "", `?trx=${code}`);
  document.getElementById("ruang-transaksi")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setAuthStatus(error?.message || "Gagal masuk transaksi.", true);
  }
}

async function handleRoleJoin(role) {
  if (!state.pendingJoinTransaction) return;
  const code = state.pendingJoinTransaction.code;
  if (role === "seller" && sellerMustVerifyBeforeJoin("seller")) {
    await beginUnverifiedSellerJoinFlow(state.pendingJoinTransaction);
    return;
  }
  try {
    const joined = await fetchJson(`/api/transactions/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    state.pendingJoinTransaction = null;
    closeJoinRoleModal();
    if (isMobileViewport() && await openMobileTransactionChat(code)) {
      return;
    }
    state.activeTransaction = joined.transaction;
    state.transactionScreen = "room";
    window.RekberAnalytics?.track?.("join_transaction", { transactionCode: code });
    await refreshTransactions();
    await refreshDashboard();
    openWorkspaceSection("transactions");
    renderAll();
    history.replaceState({}, "", `?trx=${code}`);
    document.getElementById("ruang-transaksi").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    elements.joinRoleNote.textContent = error.message || "Gagal masuk ke ruang transaksi.";
    if ((error.message || "").toLowerCase().includes("verifikasi")) {
      openVerificationModal(error.message);
    }
  }
}

function openCreatedTransactionModal(link) {
  if (!elements.createdTransactionModal) return;
  elements.createdTransactionLink.textContent = link;
  elements.createdTransactionModal.classList.remove("hidden");
  elements.createdTransactionModal.style.display = "flex";
  elements.createdTransactionModal.setAttribute("aria-hidden", "false");
}

function closeCreatedTransactionModal() {
  if (!elements.createdTransactionModal) return;
  elements.createdTransactionModal.classList.add("hidden");
  elements.createdTransactionModal.style.removeProperty("display");
  elements.createdTransactionModal.setAttribute("aria-hidden", "true");
}

async function copyCreatedTransactionLink() {
  const value = elements.createdTransactionLink?.textContent || "";
  if (!value) return;
  await navigator.clipboard.writeText(value);
  setAuthStatus("Link transaksi berhasil disalin.");
  if (elements.copyCreatedTransactionLink) {
    const originalText = elements.copyCreatedTransactionLink.textContent;
    elements.copyCreatedTransactionLink.textContent = "Sudah tercopy";
    window.setTimeout(() => {
      elements.copyCreatedTransactionLink.textContent = originalText;
    }, 1800);
  }
}

async function shareCreatedTransactionLink() {
  const value = elements.createdTransactionLink?.textContent || "";
  if (!value) return;
  const shareData = {
    title: "Link transaksi RekberWe",
    text: "Silakan buka link transaksi RekberWe ini dan pilih role sesuai posisi Anda.",
    url: value,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  await navigator.clipboard.writeText(value);
  setAuthStatus("Browser tidak mendukung menu bagikan. Link transaksi sudah disalin.");
}

function openCreatedTransactionRoom() {
  closeCreatedTransactionModal();
  state.transactionScreen = "room";
  openWorkspaceSection("transactions");
  if (state.activeTransaction) {
    renderRoom(state.activeTransaction);
  }
}

function openJoinRoleModal() {
  elements.joinRoleModal?.classList.remove("hidden");
}

function closeJoinRoleModal() {
  elements.joinRoleModal?.classList.add("hidden");
}

async function handleSendMessage(event) {
  event.preventDefault();
  if (!state.activeTransaction || !state.currentUser) {
    setAuthStatus("Buka transaksi dulu sebelum mengirim chat.", true);
    return;
  }
  const text = elements.chatInput.value.trim();
  const files = Array.from(elements.proofUpload.files || []);
  if (!text && !files.length) return;

  try {
    let latestTransaction = state.activeTransaction;
    if (text) {
      const payload = await fetchJson(`/api/transactions/${state.activeTransaction.code}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      latestTransaction = payload.transaction;
    }

    if (files.length) {
      const uploadDetail = describeSelectedFiles(files);
      setUploadProgressState("Sedang mengupload file...", 0, "uploading", uploadDetail);
      toggleChatFormBusy(true);
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("proofFiles", file));
        const uploadPayload = await uploadWithProgress(`/api/transactions/${state.activeTransaction.code}/uploads`, formData, (percent) => {
          setUploadProgressState("Sedang mengupload file...", percent, "uploading", uploadDetail);
        });
        latestTransaction = uploadPayload.transaction;
        setUploadProgressState("Upload selesai.", 100, "done", uploadDetail);
      } finally {
        toggleChatFormBusy(false);
        window.setTimeout(() => hideUploadProgress(), 1600);
      }
    }

    state.activeTransaction = latestTransaction;
    await sendTypingState(state.activeTransaction.code, false);
    roomChatScrollState = { wasNearBottom: true, distanceFromBottom: 0 };
    await refreshTransactions();
    await refreshDashboard();
    renderRoom(state.activeTransaction);
    renderProfile();
    elements.chatForm.reset();
    if (elements.proofUpload) elements.proofUpload.value = "";
    renderPendingAttachments();
    setAuthStatus("Pesan berhasil dikirim.");
  } catch (error) {
    console.error(error);
    setAuthStatus(error.message || "Chat gagal dikirim.", true);
  }
}

function renderPendingAttachments() {
  if (!elements.pendingAttachments || !elements.proofUpload) return;
  const files = Array.from(elements.proofUpload.files || []);
  if (!files.length) {
    elements.pendingAttachments.classList.add("hidden");
    elements.pendingAttachments.innerHTML = "";
    return;
  }

  elements.pendingAttachments.classList.remove("hidden");
  elements.pendingAttachments.innerHTML = files.map((file, index) => renderPendingAttachmentItem(file, index)).join("");
}

function handlePendingAttachmentRemove(event) {
  const button = event.target.closest("[data-remove-pending-file]");
  if (!button || !elements.proofUpload) return;
  const removeIndex = Number(button.dataset.removePendingFile);
  const files = Array.from(elements.proofUpload.files || []);
  const nextFiles = files.filter((_, index) => index !== removeIndex);
  const transfer = new DataTransfer();
  nextFiles.forEach((file) => transfer.items.add(file));
  elements.proofUpload.files = transfer.files;
  renderPendingAttachments();
}

function renderPendingAttachmentItem(file, index) {
  const mediaType = getPendingAttachmentType(file);
  const thumb = buildPendingAttachmentPreview(file, mediaType);
  return `
    <div class="pending-attachment">
      <div class="pending-attachment-thumb">${thumb}</div>
      <div class="pending-attachment-meta">
        <strong>${escapeHtml(file.name)}</strong>
        <span>${escapeHtml(formatBytes(file.size || 0))}</span>
      </div>
      <button type="button" class="pending-attachment-remove" data-remove-pending-file="${index}" aria-label="Hapus lampiran">Ã—</button>
    </div>
  `;
}

function getPendingAttachmentType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
}

function buildPendingAttachmentPreview(file, type) {
  if (type === "image") {
    const url = URL.createObjectURL(file);
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(file.name)}" />`;
  }
  return `<span>${type === "video" ? "VIDEO" : "FILE"}</span>`;
}

async function handleTransactionAction(action) {
  if (!state.activeTransaction) return;
  const confirmation = getTransactionActionConfirmation(action);
  if (confirmation && !await openConfirmModal("Konfirmasi aksi", confirmation)) return;
  try {
    const payload = await fetchJson(`/api/transactions/${state.activeTransaction.code}/actions`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    state.activeTransaction = payload.transaction;
    await refreshTransactions();
    await refreshDashboard();
    renderRoom(state.activeTransaction);
    renderHero();
    renderProfile();
    setAuthStatus(
      action === "account_delivered"
        ? "Konfirmasi akun diserahkan berhasil dikirim."
        : action === "goods_received"
          ? "Konfirmasi item diterima berhasil dikirim."
          : action === "open_dispute"
            ? "Sengketa berhasil diajukan."
            : action === "cancel_transaction"
              ? "Permintaan pembatalan transaksi berhasil dikirim."
              : "Status transaksi berhasil diperbarui.",
    );
  } catch (error) {
    setAuthStatus(error?.message || "Aksi transaksi gagal.", true);
  }
}

function handleProfileLookup() {
  const useWorkspaceSource = this?.id === "lookup-profile-workspace";
  const sourceInput = useWorkspaceSource ? elements.profileLookupWorkspace : elements.profileLookup;
  const targetResult = useWorkspaceSource ? elements.lookupResultWorkspace : elements.lookupResult;
  const code = String(sourceInput?.value || "").trim().toUpperCase();
  const transaction = state.transactions.find((item) => item.code === code);
  if (!transaction) {
    if (targetResult) {
      targetResult.innerHTML = "<p>Kode transaksi belum ditemukan.</p>";
    }
    return;
  }

  const people = [transaction.buyer, transaction.seller].filter(Boolean);
  if (targetResult) {
    targetResult.innerHTML = people.map(renderLookupCard).join("");
  }
}

function renderLookupCard(person) {
  return `
    <article>
      <strong>${escapeHtml(person.displayName)}</strong>
      <p>Username: ${escapeHtml(formatHandle(person.username))}</p>
      <p>Status verifikasi: ${escapeHtml(person.verificationStatus || (person.verified ? "verified" : "unverified"))}</p>
    </article>
  `;
}

function renderAll() {
  renderCurrentUser();
  renderHero();
  renderPublicFeeList();
  renderTermsAndConditions();
  renderProfile();
  renderNotifications();
  renderMobileWorkspaceChrome();
  renderMobileDashboard();
  toggleVerificationFields();
  renderAuthButtons();
  renderAccountSection();
  updateTransactionFeePreview(elements.transactionForm);
  updateTransactionFeePreview(elements.workspaceTransactionForm);
  renderMemberVisibility();
  renderHomeVisibility();
  enforceTransactionVerificationState();
  if (state.activeTransaction) {
    renderRoom(state.activeTransaction);
  }
  updateUserNotificationBadges();
  renderSupportWidget();
}

function renderPublicFeeList() {
  const settings = state.providerConfig?.publicFeeSettings;
  const feeTargets = [elements.publicFeeList, elements.workspacePublicFeeList].filter(Boolean);
  if (!feeTargets.length) return;
  if (!settings) {
    const markup = `
      <article class="fee-item">
        <strong>Fee belum tersedia</strong>
        <p>Pengaturan fee publik belum dimuat.</p>
      </article>
    `;
    feeTargets.forEach((target) => {
      target.innerHTML = markup;
    });
    return;
  }

  const tiers = Array.isArray(settings.accountFeeTiers) ? settings.accountFeeTiers : [];
  const rows = tiers.map((tier, index) => `
    <article class="fee-item">
      <strong>Rekber akun - Tier ${index + 1}</strong>
      <p>Nominal sampai ${formatCurrency(tier.maxAmount)} • Fee ${String(tier.feeType || "flat") === "percent" ? `${Number(tier.fee || 0)}%` : formatCurrency(tier.fee)}</p>
    </article>
  `).join("");

  const markup = `
    <article class="fee-item fee-item-highlight">
      <strong>Rekber gold</strong>
      <p>Fee tetap ${formatCurrency(settings.goldFlatFee || 0)}</p>
    </article>
    ${rows || `
      <article class="fee-item">
        <strong>Rekber akun</strong>
        <p>Fee akun belum diatur admin.</p>
      </article>
    `}
  `;
  feeTargets.forEach((target) => {
    target.innerHTML = markup;
  });
}

function updateTransactionFeePreview(form = elements.transactionForm) {
  if (!form) return;
  const preview = form.id === "workspace-transaction-form"
    ? elements.workspaceTransactionFeePreview
    : elements.transactionFeePreview;
  if (!preview) return;
  const formData = new FormData(form);
  const type = String(formData.get("type") || "akun").trim().toLowerCase();
  const price = parseCurrencyInput(formData.get("price"));
  const settings = state.providerConfig?.publicFeeSettings;
  if (!settings || !price) {
    preview.textContent = "Fee rekber akan otomatis dihitung setelah harga diisi.";
    return;
  }
  let fee = 0;
  if (type === "gold") {
    fee = Number(settings.goldFlatFee || 0);
  } else {
    const tiers = Array.isArray(settings.accountFeeTiers) ? settings.accountFeeTiers : [];
    const found = tiers.find((tier) => price <= Number(tier.maxAmount || 0));
    if (found) {
      fee = String(found.feeType || "flat") === "percent"
        ? Math.round(price * (Number(found.fee || 0) / 100))
        : Number(found.fee || 0);
    }
  }
  preview.textContent = `Estimasi fee rekber: ${formatCurrency(fee)} untuk nominal ${formatCurrency(price)}.`;
}

function renderTermsAndConditions() {
  const termTargets = [elements.termsList, elements.workspaceTermsList].filter(Boolean);
  if (!termTargets.length) return;
  const raw = String(state.providerConfig?.termsAndConditions || "").trim();
  const items = raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) return;
  const markup = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  termTargets.forEach((target) => {
    target.innerHTML = markup;
  });
}

function syncRoomModeBodyClass() {
  if (!document.body.classList.contains("in-room-mode")) {
    document.body.classList.remove("in-voucher-room");
    return;
  }
  const isVoucherRoom = state.historyChatType === "voucher" && state.transactionScreen === "room";
  document.body.classList.toggle("in-voucher-room", isVoucherRoom);
}

function enterRoomMode() {
  document.body.classList.add("in-room-mode");
  syncRoomModeBodyClass();
}

function exitRoomMode() {
  document.body.classList.remove("in-room-mode");
  document.body.classList.remove("in-voucher-room");
  toggleMobileDetailSheet(false);
}

function toggleMobileDetailSheet(open) {
  const shouldOpen = typeof open === "boolean" ? open : !document.body.classList.contains("mobile-detail-open");
  document.body.classList.toggle("mobile-detail-open", shouldOpen);
}

function renderAuthButtons() {
  elements.logoutButton?.classList.toggle("hidden", !state.currentUser);
  elements.mobileHeaderLogout?.classList.toggle("hidden", !state.currentUser);
  elements.openLogin?.classList.toggle("hidden", Boolean(state.currentUser));
  elements.heroLoginButton?.classList.toggle("hidden", Boolean(state.currentUser));
  elements.adminLink?.classList.toggle("hidden", !state.currentUser?.isAdmin);
  elements.homeNavButton?.classList.toggle("hidden", !state.currentUser);
  elements.transactionsNavButton?.classList.toggle("hidden", !state.currentUser);
  elements.profileNavButton?.classList.toggle("hidden", !state.currentUser);
  if (elements.profileNavButton) {
    if (state.currentUser) {
      elements.profileNavButton.innerHTML = state.currentUser.avatar
        ? `<img src="${state.currentUser.avatar}" alt="Profil" class="profile-nav-avatar" />`
        : `<span class="profile-nav-initial">${getInitials(state.currentUser.displayName)}</span>`;
    } else {
      elements.profileNavButton.innerHTML = "";
    }
  }
}

function renderAccountSection() {
  elements.currentUserCard.classList.toggle("hidden", false);
  elements.inlineTransactionPanel.classList.toggle("hidden", !state.currentUser);
  if (elements.heroLoginButton) {
    elements.heroLoginButton.textContent = state.currentUser ? "Buka Workspace" : "Masuk / Daftar";
  }
  if (elements.heroLoginButtonAlt) {
    elements.heroLoginButtonAlt.textContent = state.currentUser ? "Buka Workspace" : "Mulai Login";
  }
  if (elements.homeLoginShortcut) {
    elements.homeLoginShortcut.textContent = state.currentUser ? "Buka Workspace" : "Login / Daftar";
  }
  if (elements.officeBox) {
    const officeAddress = String(state.providerConfig?.officeAddress || "").trim();
    const officeMapUrl = officeAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officeAddress)}`
      : "#";
    elements.officeBox.classList.toggle("hidden", !officeAddress);
    if (elements.officeAddressDisplay) {
      elements.officeAddressDisplay.textContent = officeAddress || "Alamat kantor belum diatur admin.";
    }
    const officeMapLink = document.getElementById("office-map-link");
    if (officeMapLink) {
      officeMapLink.href = officeMapUrl;
      officeMapLink.classList.toggle("hidden", !officeAddress);
    }
    elements.workspaceOfficeBox?.classList.toggle("hidden", !officeAddress);
    if (elements.workspaceOfficeAddress) {
      elements.workspaceOfficeAddress.textContent = officeAddress || "Alamat kantor belum diatur admin.";
    }
    const workspaceOfficeMapLink = document.getElementById("workspace-office-map-link");
    if (workspaceOfficeMapLink) {
      workspaceOfficeMapLink.href = officeMapUrl;
      workspaceOfficeMapLink.classList.toggle("hidden", !officeAddress);
    }
  }
}

function openLoginModal() {
  if (state.currentUser) {
    openWorkspaceSection("dashboard");
    return;
  }
  openAccessibleModalShell(elements.loginModal);
  bindModalEscape(elements.loginModal, closeLoginModal);
  elements.telegramDirectLogin?.focus();
}

function closeLoginModal() {
  closeAccessibleModalShell(elements.loginModal);
}

function renderMemberVisibility() {
  const showMemberArea = Boolean(state.currentUser && state.currentMemberView);
  document.body.classList.toggle("is-member-view", showMemberArea);
  elements.memberArea.classList.toggle("hidden", !showMemberArea);
  elements.mobileBottomNav?.classList.toggle("hidden", !showMemberArea);
  elements.profilePanel.classList.remove("active");
  elements.transactionsPanel.classList.toggle("active", showMemberArea);
  elements.transactionsIntroSection.classList.add("hidden");
  renderTransactionScreen();
  updateWorkspaceMenuState();
}

function renderHomeVisibility() {
  const showHome = !state.currentUser || !state.currentMemberView;
  document.body.classList.toggle("is-public-view", showHome);
  elements.homeArea.classList.toggle("hidden", !showHome);
}

function renderCurrentUser() {
  if (!state.currentUser) {
    elements.currentUserCard.innerHTML = `
      <p class="mini-label">Belum login</p>
      <strong>Silakan login agar bisa membuat atau join transaksi.</strong>
      <p class="mini-note">Form transaksi akan muncul otomatis setelah Anda login.</p>
    `;
    if (elements.workspaceUserCard) {
      elements.workspaceUserCard.innerHTML = `
        <div class="workspace-user-identity">
          <div class="workspace-user-avatar">?</div>
          <div>
            <strong>Belum login</strong>
            <span>Silakan login dulu</span>
          </div>
        </div>
      `;
    }
    return;
  }

  elements.currentUserCard.innerHTML = `
    <p class="mini-label">Akun siap dipakai</p>
    <strong>${state.currentUser.banned ? "Akun sedang diblokir admin." : "Silakan lanjut ke form transaksi."}</strong>
    ${state.currentUser.verificationStatus === "revision_required" ? `<p class="warning-note">Admin meminta perbaikan verifikasi: ${escapeHtml(state.currentUser.verificationNote || "Silakan cek profil dan kirim ulang data.")}</p>` : ""}
    ${state.currentUser.banned ? `<p class="warning-note warning-note-danger">${escapeHtml(state.currentUser.bannedReason || "Hubungi admin untuk informasi lebih lanjut.")}</p>` : ""}
  `;
  if (elements.workspaceUserCard) {
    const verified = state.currentUser.verificationStatus === "verified";
    elements.workspaceUserCard.innerHTML = `
      <div class="workspace-user-identity">
        <div class="workspace-user-avatar">${state.currentUser.avatar ? `<img src="${escapeAttribute(state.currentUser.avatar)}" alt="Profil" />` : escapeHtml(getInitials(state.currentUser.displayName))}</div>
        <div>
          <strong>${escapeHtml(state.currentUser.displayName)}</strong>
          <span class="workspace-user-verified ${verified ? "is-verified" : "is-unverified"}">${verified ? "Verified ✓" : "Unverified"}</span>
        </div>
      </div>
      <div class="workspace-user-meta">
        <span>${escapeHtml(state.currentUser.provider || "Akun")}</span>
        <span>${escapeHtml(state.currentUser.email || "-")}</span>
      </div>
      <button type="button" class="workspace-logout-btn" id="workspace-sidebar-logout">Keluar</button>
    `;
    document.getElementById("workspace-sidebar-logout")?.addEventListener("click", handleLogout);
  }
}

function updateWorkspaceMenuState() {
  const mapping = [
    [elements.sidebarHomeButton, state.workspaceSection === "dashboard"],
    [elements.sidebarTransactionsButton, state.workspaceSection === "transactions"],
    [elements.sidebarProfileButton, state.workspaceSection === "profile"],
    [elements.sidebarNotificationsButton, state.workspaceSection === "notifications"],
    [elements.sidebarVerificationButton, state.workspaceSection === "verification"],
    [elements.mobileNavDashboard, state.workspaceSection === "dashboard"],
    [elements.mobileNavTransactions, state.workspaceSection === "transactions"],
    [elements.mobileNavAccount, state.workspaceSection === "profile"],
    [elements.mobileHeaderNotifications, state.workspaceSection === "notifications"],
  ];
  mapping.forEach(([button, active]) => {
    button?.classList.toggle("is-active", Boolean(active));
  });
  elements.mobileNavSupport?.classList.toggle("has-unread", getSupportUnreadCount() > 0);
}

function renderMobileWorkspaceChrome() {
  if (elements.mobileHeaderProfileAvatar) {
    if (state.currentUser?.avatar) {
      elements.mobileHeaderProfileAvatar.innerHTML = `<img src="${escapeAttribute(state.currentUser.avatar)}" alt="${escapeAttribute(state.currentUser.displayName || "Profil")}" />`;
    } else {
      elements.mobileHeaderProfileAvatar.textContent = getInitials(state.currentUser?.displayName || "R");
    }
  }
  if (elements.mobileHeaderNotificationsBadge) {
    const count = getTotalUserNotificationCount();
    if (count > 0) {
      elements.mobileHeaderNotificationsBadge.textContent = String(count > 99 ? "99+" : count);
      elements.mobileHeaderNotificationsBadge.classList.remove("hidden");
    } else {
      elements.mobileHeaderNotificationsBadge.classList.add("hidden");
    }
  }
}

function renderMobileDashboard() {
  if (!elements.mobileDashboardSummary || !elements.mobileDashboardTransactions) return;
  if (!state.currentUser) {
    elements.mobileDashboardSummary.innerHTML = `
      <div class="mobile-section-head"><h4>Ringkasan saya</h4></div>
      <div class="mobile-dashboard-summary-grid">
        <article><span>Total transaksi</span><strong>0</strong></article>
        <article><span>Transaksi selesai</span><strong>0</strong></article>
        <article><span>Dana diproses</span><strong>Rp 0</strong></article>
      </div>
    `;
    elements.mobileDashboardTransactions.innerHTML = `
      <article class="mobile-dashboard-transaction-item empty">
        <strong>Login dulu untuk melihat dashboard mobile.</strong>
      </article>
    `;
    return;
  }

  const activeTransactions = state.dashboard.activeTransactions || [];
  const completedTransactions = state.dashboard.completedTransactions || [];
  const totalTransactions = activeTransactions.length + completedTransactions.length;
  const activeFunds = activeTransactions.reduce((sum, item) => sum + Number(item.price || 0), 0);

  elements.mobileDashboardSummary.innerHTML = `
    <div class="mobile-section-head">
      <h4>Ringkasan saya</h4>
      <span>Saldo Rekber</span>
    </div>
    <div class="mobile-dashboard-summary-grid">
      <article><span>Total transaksi</span><strong>${totalTransactions}</strong></article>
      <article><span>Transaksi selesai</span><strong>${completedTransactions.length}</strong></article>
      <article><span>Dana diproses</span><strong>${formatCurrencyHtml(activeFunds)}</strong></article>
    </div>
  `;

  if (!activeTransactions.length) {
    elements.mobileDashboardTransactions.innerHTML = `
      <article class="mobile-dashboard-transaction-item empty">
        <strong>Belum ada transaksi aktif.</strong>
      </article>
    `;
    return;
  }

  elements.mobileDashboardTransactions.innerHTML = activeTransactions.slice(0, 4).map((transaction) => `
    <button type="button" class="mobile-dashboard-transaction-item mobile-transaction-card" data-transaction-code="${escapeAttribute(transaction.code)}">
      <div class="mobile-transaction-card-main">
        <div class="mobile-transaction-game-icon">${getInitials(transaction.title || transaction.code)}</div>
        <div class="mobile-transaction-copy">
          <div class="mobile-transaction-code-row">
            <strong>${escapeHtml(transaction.code)}</strong>
            <span class="summary-status-chip summary-status-chip-info">${escapeHtml(transaction.paymentStatus)}</span>
          </div>
          <span>${escapeHtml(transaction.title)}</span>
          <small>Penjual: ${escapeHtml(transaction.seller?.displayName || "Menunggu seller")}</small>
        </div>
        <div class="mobile-transaction-value">
          <strong>${formatCurrencyHtml(transaction.price)}</strong>
          <small>Dibuat: ${transaction.createdAt ? formatDate(new Date(transaction.createdAt)) : "-"}</small>
        </div>
      </div>
      ${buildMobileTransactionProgress(transaction)}
    </button>
  `).join("");

  elements.mobileDashboardTransactions.querySelectorAll("[data-transaction-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const opened = await openMobileTransactionChat(button.dataset.transactionCode);
      if (!opened) {
        setAuthStatus("Gagal membuka transaksi.", true);
      }
    });
  });
}

function buildMobileTransactionProgress(transaction) {
  const steps = [
    { label: "Pesanan Dibuat", done: true, icon: "▣" },
    { label: "Dana Diamankan", done: Boolean(transaction.adminFundsReceived), icon: "●" },
    {
      label: "Akun Diperiksa",
      done: transaction.paymentStatus === "Akun sudah diserahkan"
        || Boolean(transaction.buyerConfirmedReceived)
        || Boolean(transaction.sellerPayoutSent)
        || transaction.paymentStatus === "Selesai",
      icon: "⌕",
    },
    { label: "Selesai", done: transaction.paymentStatus === "Selesai" || Boolean(transaction.sellerPayoutSent), icon: "✓" },
  ];

  return `
    <div class="mobile-transaction-progress">
      ${steps.map((step) => `
        <span class="mobile-transaction-progress-step ${step.done ? "is-done" : ""}">
          <i>${step.icon}</i>
          <small>${step.label}</small>
        </span>
      `).join("")}
    </div>
  `;
}

function openMobileCreateChoiceModal() {
  if (!elements.mobileCreateChoiceModal) {
    openMobileCreateTransaction();
    return;
  }
  openAccessibleModalShell(elements.mobileCreateChoiceModal);
  bindModalEscape(elements.mobileCreateChoiceModal, closeMobileCreateChoiceModal);
  elements.mobileCreateChoiceRekber?.focus();
}

function closeMobileCreateChoiceModal() {
  closeAccessibleModalShell(elements.mobileCreateChoiceModal);
}

function openMobileCreateTransaction() {
  state.mobileCreateOpen = true;
  openWorkspaceSection("dashboard");
  window.RekberVoucher?.openService?.("rekber");
  renderTransactionScreen();
  const target = document.getElementById("workspace-inline-transaction-panel");
  target?.scrollIntoView({ behavior: window.innerWidth <= 768 ? "auto" : "smooth", block: "start" });
}

function openMobileDashboardDetail(targetId) {
  state.mobileCreateOpen = true;
  openWorkspaceSection("dashboard");
  renderTransactionScreen();
  document.getElementById(targetId)?.scrollIntoView({ behavior: window.innerWidth <= 768 ? "auto" : "smooth", block: "start" });
}

function renderHero() {
  return;
}

function renderProfile() {
  if (!state.currentUser) {
    const emptyProfileMarkup = `
      <p class="mini-label">Belum ada pengguna aktif</p>
      <strong>Login dulu untuk melihat data profil.</strong>
    `;
    if (elements.profileCard) {
      elements.profileCard.innerHTML = emptyProfileMarkup;
    }
    if (elements.profileCardWorkspace) {
      elements.profileCardWorkspace.innerHTML = emptyProfileMarkup;
    }
    if (elements.profileVerificationAsideWorkspace) {
      elements.profileVerificationAsideWorkspace.innerHTML = "";
    }
    return;
  }

  const linkedProviderRows = buildLinkedProviderRows();
  const isVerifiedLocked = state.currentUser.verificationStatus === "verified";
  const isVerificationLocked = state.currentUser.verificationStatus === "pending" || state.currentUser.verificationStatus === "verified";
  const verificationMarkup = buildProfileVerificationMarkup(isVerificationLocked);
  const profileMarkup = `
    <p class="mini-label">Profil pengguna</p>
    <h4>${state.currentUser.displayName} ${state.currentUser.verificationStatus === "verified" ? '<span class="verified-inline-badge">&#10003;</span>' : ""}</h4>
    <div class="profile-shell-grid">
      <div class="profile-main-stack">
    <div class="profile-list">
      <div class="profile-row"><span>Nama pengguna</span><strong>${state.currentUser.displayName}</strong></div>
      <div class="profile-row"><span>Nama sesuai KTP</span><strong>${state.currentUser.legalName || "-"}</strong></div>
      <div class="profile-row"><span>Provider utama</span><strong>${state.currentUser.provider}</strong></div>
      <div class="profile-row"><span>Email</span><strong>${state.currentUser.email || "-"}</strong></div>
      <div class="profile-row"><span>WhatsApp</span><strong>${state.currentUser.phoneVerified ? `${renderWhatsappVerifiedBadge()} ${escapeHtml(state.currentUser.whatsapp || state.currentUser.phoneNumber || "-")}` : escapeHtml(state.currentUser.whatsapp || "-")}</strong></div>
      <div class="profile-row"><span>Lokasi terverifikasi</span><strong>${state.currentUser.locationVerified ? "Ya" : "Tidak"}</strong></div>
      <div class="profile-row"><span>Status verifikasi</span><strong>${verificationStatusLabel(state.currentUser.verificationStatus, state.currentUser.verified)}</strong></div>
      ${state.currentUser.banned ? `<div class="profile-row"><span>Status akun</span><strong>Diblokir admin</strong></div>` : ""}
    </div>
    ${state.currentUser.verificationStatus === "revision_required" ? `<div class="warning-note">Admin meminta perbaikan verifikasi: ${escapeHtml(state.currentUser.verificationNote || "Silakan perbaiki data lalu kirim ulang verifikasi.")}</div>` : ""}
    ${state.currentUser.banned ? `<div class="warning-note warning-note-danger">Akun diblokir admin: ${escapeHtml(state.currentUser.bannedReason || "Hubungi admin untuk bantuan.")}</div>` : ""}
    <div class="profile-subsection">
      <h5>Atur profil pengguna</h5>
      <form id="profile-settings-form" class="profile-form">
        <label>
          Ubah foto profil
          <input type="file" name="avatar" accept="image/*" />
          ${state.currentUser.avatar ? `<a class="mini-link" href="${escapeHtml(state.currentUser.avatar)}" target="_blank" rel="noreferrer">Lihat foto profil sekarang</a>` : ""}
        </label>
        <button type="submit" class="primary-btn">Simpan Foto Profil</button>
      </form>
    </div>
      </div>
      <aside class="profile-side-stack">
    <div class="profile-subsection profile-side-card">
      <h5>Hubungkan social media lain</h5>
      <p class="mini-note">Hubungkan semua social media yang tersedia untuk meyakinkan pembeli bahwa Anda penjual terpercaya.</p>
      <div class="provider-list compact-provider-list">
        ${buildLinkProviderButtons()}
      </div>
      <div class="linked-provider-list">${linkedProviderRows}</div>
    </div>
      </aside>
    </div>
  `;
  const legacyProfileMarkup = `
    <p class="mini-label">Profil pengguna</p>
    <h4>${state.currentUser.displayName} ${state.currentUser.verificationStatus === "verified" ? '<span class="verified-inline-badge">&#10003;</span>' : ""}</h4>
    <div class="profile-list">
      <div class="profile-row"><span>Provider utama</span><strong>${state.currentUser.provider}</strong></div>
      <div class="profile-row"><span>Email</span><strong>${state.currentUser.email || "-"}</strong></div>
      <div class="profile-row"><span>WhatsApp</span><strong>${state.currentUser.phoneVerified ? `${renderWhatsappVerifiedBadge()} ${escapeHtml(state.currentUser.whatsapp || state.currentUser.phoneNumber || "-")}` : escapeHtml(state.currentUser.whatsapp || "-")}</strong></div>
      <div class="profile-row"><span>Lokasi terverifikasi</span><strong>${state.currentUser.locationVerified ? "Ya" : "Tidak"}</strong></div>
      <div class="profile-row"><span>Status verifikasi</span><strong>${verificationStatusLabel(state.currentUser.verificationStatus, state.currentUser.verified)}</strong></div>
    </div>
    <p class="mini-note">Gunakan menu <strong>Akun Saya</strong> di sidebar kiri untuk mengelola profil lengkap, verifikasi, dan social media.</p>
  `;
  if (elements.profileCard) {
    elements.profileCard.innerHTML = legacyProfileMarkup;
  }
  if (elements.profileCardWorkspace) {
    elements.profileCardWorkspace.innerHTML = profileMarkup;
  }
  captureProfileVerificationDraft();
  const verificationHost = elements.profileVerificationPageWorkspace || elements.profileVerificationAsideWorkspace;
  if (verificationHost) {
    if (!isProfileVerificationFormFocused()) {
      verificationHost.innerHTML = verificationMarkup;
      restoreProfileVerificationDraft();
      bindProfileVerificationDraftTracking();
    }
  }
  if (elements.profileVerificationAsideWorkspace && elements.profileVerificationPageWorkspace) {
    elements.profileVerificationAsideWorkspace.innerHTML = "";
  }

  bindLinkProviderButtons();
  bindOpenTransactionButtons();
  bindProfileForms();
  renderActivityTabs();
}

function buildProfileVerificationMarkup(isVerificationLocked) {
  if (!state.currentUser) return "";
  const identityLocked = isVerificationLocked || isIdentityVerificationLocked();
  const phoneLocked = isWhatsappOtpLocked() || identityLocked;
  const whatsappValue = escapeHtml(
    profileVerificationDraft.whatsapp || state.currentUser.whatsapp || state.currentUser.phoneNumber || "",
  );
  const legalNameValue = escapeHtml(profileVerificationDraft.legalName || state.currentUser.legalName || "");
  const ktpValue = escapeHtml(profileVerificationDraft.ktp || state.currentUser.ktp || "");
  const whatsappField = phoneLocked
    ? `
        <div class="whatsapp-field-row whatsapp-field-row-verified">
          <input type="text" name="whatsapp" id="profile-whatsapp-input" value="${whatsappValue}" placeholder="08xxxxxxxxxx" disabled />
          ${isWhatsappOtpLocked() ? renderWhatsappVerifiedBadge() : ""}
        </div>
      `
    : `
        <div class="whatsapp-field-row">
          <input type="text" name="whatsapp" id="profile-whatsapp-input" value="${whatsappValue}" placeholder="08xxxxxxxxxx" />
          <button type="button" class="ghost-btn whatsapp-otp-trigger-btn" data-open-whatsapp-otp>OTP</button>
        </div>
      `;
  return `
    <div class="profile-subsection profile-verification-panel">
      <h5>Verifikasi identitas penjual</h5>
      <form id="profile-verification-form" class="profile-form">
        <label>
          Nama sesuai KTP
          <input type="text" name="legalName" value="${legalNameValue}" placeholder="Nama lengkap sesuai KTP" ${identityLocked ? "disabled" : ""} />
        </label>
        <label>
          Nomor KTP
          <input type="text" name="ktp" value="${ktpValue}" placeholder="Nomor KTP aktif" ${identityLocked ? "disabled" : ""} />
        </label>
        <label>
          No. WhatsApp aktif
          ${whatsappField}
          ${phoneLocked
    ? `<p class="mini-note">${isWhatsappOtpLocked() ? "Nomor WhatsApp sudah terverifikasi dan tidak dapat diubah." : "Data identitas sedang dikunci selama proses review admin."}</p>`
    : `<p class="mini-note">${state.currentUser.verificationStatus === "unverified" ? "Verifikasi akun di-reset admin. Klik OTP untuk verifikasi ulang nomor WhatsApp." : "Klik tombol OTP untuk verifikasi nomor WhatsApp Anda."}</p>`}
        </label>
        <label>
          Foto KTP
          <input type="file" name="ktpPhoto" accept="image/*" ${identityLocked ? "disabled" : ""} />
          ${state.currentUser.ktpPhotoUrl ? `<a class="mini-link" href="${escapeHtml(state.currentUser.ktpPhotoUrl)}" target="_blank" rel="noreferrer">${escapeHtml(state.currentUser.ktpPhotoName || "Lihat foto KTP")}</a>` : ""}
        </label>
        <label>
          Video selfie memegang KTP
          <input type="file" name="ktpVideo" accept="video/*" ${identityLocked ? "disabled" : ""} />
          ${state.currentUser.ktpVideoUrl ? `<a class="mini-link" href="${escapeHtml(state.currentUser.ktpVideoUrl)}" target="_blank" rel="noreferrer">${escapeHtml(state.currentUser.ktpVideoName || "Lihat video selfie")}</a>` : ""}
        </label>
        <button type="submit" class="primary-btn" ${identityLocked ? "disabled" : ""}>${verificationActionLabel(state.currentUser.verificationStatus, state.currentUser.verified)}</button>
        <div class="upload-progress hidden" id="verification-upload-progress" aria-live="polite">
          <div class="upload-progress-top">
            <strong id="verification-upload-progress-label"><span class="upload-spinner"></span>Sedang upload verifikasi...</strong>
            <span id="verification-upload-progress-value">0%</span>
          </div>
          <p class="upload-progress-detail" id="verification-upload-progress-detail">Menyiapkan file verifikasi...</p>
          <div class="upload-progress-track">
            <span id="verification-upload-progress-bar"></span>
          </div>
        </div>
      </form>
      <p class="mini-note">${verificationHelpText(state.currentUser.verificationStatus, state.currentUser.verified)}</p>
    </div>
  `;
}

function buildLinkedProviderRows() {
  const providers = state.dashboard.linkedProviders || [];
  if (!providers.length) {
    return "<p class=\"muted-text\">Belum ada akun social lain yang terhubung.</p>";
  }
  return providers.map((item) => `
    <div class="profile-row">
      <span>${item.provider}</span>
      <strong>${formatHandle(item.username)}</strong>
    </div>
  `).join("");
}

function buildLinkProviderButtons() {
  const linked = new Set((state.dashboard.linkedProviders || []).map((item) => item.provider));
  return ["Telegram", "Google", "Facebook", "Discord"]
    .filter((provider) => provider !== state.currentUser.provider)
    .map((provider) => `
      <button type="button" class="provider-btn link-provider-btn" data-link-provider="${provider}" ${linked.has(provider) || provider === "Facebook" ? "disabled" : ""} title="${provider === "Facebook" ? "Sedang pengembangan" : ""}">
        ${renderProviderButtonLabel(provider, provider === "Facebook" ? "Facebook (Dev)" : `Hubungkan ${provider}`)}
      </button>
    `).join("");
}

function renderProviderButtonLabel(provider, text) {
  return `
    <span class="social-logo ${provider === "Google" ? "social-logo-image" : "social-logo-svg"}" aria-hidden="true">${renderProviderIcon(provider)}</span>
    <span>${escapeHtml(text)}</span>
  `;
}

function renderProviderIcon(provider) {
  if (provider === "Google") {
    return `<img src="assets/google-g-logo.svg?v=1" alt="" />`;
  }
  if (provider === "Telegram") {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 4.3c.6-.2 1.2.3 1 .9l-3 14.2c-.1.5-.7.8-1.2.5l-4.3-3.2-2.1 2.1c-.3.3-.9.1-.9-.4v-3.1l7.7-7.2-9.6 6.1-4-1.2c-.8-.2-.8-1.3 0-1.6z"/></svg>`;
  }
  if (provider === "Facebook") {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6H16l.4-3h-2.9V8.5c0-.9.3-1.5 1.6-1.5h1.5V4.3c-.3 0-1.2-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H8v3h2.2V21z"/></svg>`;
  }
  if (provider === "Discord") {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 5.3A15 15 0 0 0 15.2 4l-.2.4a10.2 10.2 0 0 1 3 1.5c-2.8-1.3-5.8-1.3-8 0a10.2 10.2 0 0 1 3-1.5L12.8 4a15 15 0 0 0-3.7 1.3C6.8 8.7 6.2 12 6.4 15.1A15 15 0 0 0 11 17l.6-1a9.2 9.2 0 0 1-1.9-.9l.5-.3c1.8.8 3.8.8 5.6 0l.5.3c-.6.4-1.2.7-1.9.9l.6 1a15 15 0 0 0 4.6-1.9c.3-3.6-.5-6.9-1.7-9.8M10.4 13.1c-.6 0-1.1-.6-1.1-1.3s.5-1.3 1.1-1.3 1.1.6 1.1 1.3-.5 1.3-1.1 1.3m3.2 0c-.6 0-1.1-.6-1.1-1.3s.5-1.3 1.1-1.3 1.1.6 1.1 1.3-.5 1.3-1.1 1.3"/></svg>`;
  }
  return escapeHtml(provider?.charAt(0) || "?");
}

function bindLinkProviderButtons() {
  document.querySelectorAll(".link-provider-btn").forEach((button) => {
    if (button.dataset.linkProvider === "Facebook") return;
    button.addEventListener("click", () => startProviderLogin(button.dataset.linkProvider, "link"));
  });
}

function handleProfileTriggerClick(event) {
  const trigger = event.target.closest("[data-profile-trigger]");
  if (!trigger) return;
  const role = String(trigger.dataset.profileTrigger || "");
  if (!role) return;
  openUserProfileModal(role);
}

function openUserProfileModal(role) {
  const transaction = state.activeTransaction;
  if (!transaction) return;
  const profile = buildTransactionProfileDetails(role, transaction);
  if (!profile || !elements.userProfileModal) return;
  elements.userProfileModalAvatar.innerHTML = renderProfileAvatar(profile);
  elements.userProfileModalRole.textContent = profile.title;
  elements.userProfileModalName.textContent = profile.displayName;
  elements.userProfileModalBadge.textContent = profile.verified ? "Verified ✓" : "Unverified ✕";
  elements.userProfileModalBadge.className = `mini-note ${profile.verified ? "chat-badge-verified" : "chat-badge-unverified"}`;
  elements.userProfileModalGrid.innerHTML = buildUserProfileModalGrid(profile, state.transactions);
  openAccessibleModalShell(elements.userProfileModal);
  bindModalEscape(elements.userProfileModal, closeUserProfileModal);
  elements.closeUserProfileModal?.focus();
}

function closeUserProfileModal() {
  closeAccessibleModalShell(elements.userProfileModal);
}

function buildTransactionProfileDetails(role, transaction) {
  if (!transaction) return null;
  if (role === "buyer" && transaction.buyer) return normalizeProfileDetails(transaction.buyer, "Pembeli");
  if (role === "seller" && transaction.seller) return normalizeProfileDetails(transaction.seller, "Penjual");
  if (role === "admin") {
    return normalizeProfileDetails({
      id: "admin",
      displayName: "RekberWE.id",
      avatar: state.providerConfig?.brandLogoUrl || "assets/rekberwe-logo-shield.png?v=7",
      verificationStatus: "verified",
      verified: true,
      provider: "Admin",
      linkedProviders: [],
      whatsapp: "",
      email: state.providerConfig?.customerCare?.gmail || "",
      telegramContact: state.providerConfig?.customerCare?.telegram || "",
      ktpPhotoUrl: "",
      ktpVideoUrl: "",
    }, "Admin");
  }
  return null;
}

function normalizeProfileDetails(user, title) {
  return {
    ...user,
    title,
    role: title === "Pembeli" ? "buyer" : title === "Penjual" ? "seller" : "admin",
    displayName: user.displayName || user.username || "Pengguna",
    verified: user.verificationStatus === "verified" || Boolean(user.verified),
  };
}

function resolveTransactionProfileForMessage(item, transaction) {
  const senderUserId = String(item.senderUserId || "").trim();
  if (senderUserId && transaction?.buyer?.id === senderUserId) {
    return normalizeProfileDetails(transaction.buyer, "Pembeli");
  }
  if (senderUserId && transaction?.seller?.id === senderUserId) {
    return normalizeProfileDetails(transaction.seller, "Penjual");
  }
  if (item.senderTitle === "Pembeli") return buildTransactionProfileDetails("buyer", transaction) || { role: "buyer", displayName: item.sender, title: "Pembeli", verified: item.senderVerified };
  if (item.senderTitle === "Penjual") return buildTransactionProfileDetails("seller", transaction) || { role: "seller", displayName: item.sender, title: "Penjual", verified: item.senderVerified };
  if (item.senderTitle === "Admin") return buildTransactionProfileDetails("admin", transaction) || { role: "admin", displayName: item.sender, title: "Admin", verified: true };
  return { role: "participant", displayName: item.sender, title: item.senderTitle || "Peserta", verified: item.senderVerified };
}

function renderProfileAvatar(profile) {
  if (profile?.avatar) {
    return `<img src="${escapeAttribute(profile.avatar)}" alt="${escapeAttribute(profile.displayName || "Profil")}" />`;
  }
  const initial = escapeHtml(String(profile?.displayName || profile?.title || "R").trim().charAt(0).toUpperCase() || "R");
  return `<span class="chat-avatar-fallback">${initial}</span>`;
}

function buildUserProfileModalGrid(profile, transactions) {
  const completedCount = countCompletedTransactionsForUser(profile.id, transactions);
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
    return `${stats}<div class="profile-stat-card" style="grid-column: 1 / -1;"><span>Kontak customer care</span><strong>Gmail: ${escapeHtml(profile.email || "-")}</strong><strong>Telegram: ${escapeHtml(profile.telegramContact || "-")}</strong></div>`;
  }
  const isVerifiedSeller = profile.verificationStatus === "verified" || Boolean(profile.verified);
  const connectedProviders = new Set([profile.provider, ...(profile.linkedProviders || []).map((item) => item.provider)].filter(Boolean));
  const statuses = [
    buildProfileStatusRow("facebook", "Facebook", connectedProviders.has("Facebook")),
    buildProfileStatusRow("discord", "Discord", connectedProviders.has("Discord")),
    buildProfileStatusRow("telegram", "Telegram", connectedProviders.has("Telegram")),
    buildProfileStatusRow("location", "Lokasi terverifikasi", isVerifiedSeller),
    buildProfileStatusRow("ktp", "Foto KTP", isVerifiedSeller),
    buildProfileStatusRow("video", "Video selfie KTP", isVerifiedSeller),
  ].join("");
  return `${stats}<div class="profile-stat-card" style="grid-column: 1 / -1;"><span>Status data terhubung</span><div class="profile-status-list">${statuses}</div></div>`;
}

function buildProfileStatusRow(type, label, done) {
  return `
    <div class="profile-status-row">
      <div class="profile-status-label">
        <span class="profile-status-icon ${type}">${renderProfileStatusIcon(type)}</span>
        <span>${label}</span>
      </div>
      <span class="profile-status-badge ${done ? "done" : "pending"}" aria-label="${done ? "Terverifikasi" : "Belum terhubung"}">${done ? "✓" : "✕"}</span>
    </div>
  `;
}

function renderProfileStatusIcon(type) {
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

function countCompletedTransactionsForUser(userId, transactions) {
  if (!userId) return 0;
  return (transactions || []).filter((item) => item.paymentStatus === "Selesai" && (item.buyer?.id === userId || item.seller?.id === userId)).length;
}

function bindProfileForms() {
  document.querySelectorAll("#profile-settings-form").forEach((settingsForm) => {
    if (settingsForm.dataset.bound === "true") return;
    settingsForm.dataset.bound = "true";
    settingsForm.addEventListener("submit", handleProfileSettingsSave);
  });
  document.querySelectorAll("#profile-verification-form").forEach((verificationForm) => {
    if (verificationForm.dataset.bound === "true") return;
    verificationForm.dataset.bound = "true";
    verificationForm.addEventListener("submit", handleProfileVerificationSave);
  });
  if (elements.sellerBankForm && elements.sellerBankForm.dataset.bound !== "true") {
    elements.sellerBankForm.dataset.bound = "true";
    elements.sellerBankForm.addEventListener("submit", handleSellerBankFormSubmit);
  }
  [elements.sellerBankName, elements.sellerBankNumber, elements.sellerBankHolder].forEach((input) => {
    if (!input || input.dataset.bound === "true") return;
    input.dataset.bound = "true";
    input?.addEventListener("input", () => {
      sellerBankUiState.dirty = true;
    });
    input?.addEventListener("change", () => {
      sellerBankUiState.dirty = true;
    });
  });
}

async function handleProfileSettingsSave(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const avatarFile = formData.get("avatar");

  if (!(avatarFile instanceof File) || avatarFile.size <= 0) {
    setAuthStatus("Pilih foto profil terlebih dahulu.", true);
    return;
  }

  const avatarForm = new FormData();
  avatarForm.append("avatar", avatarFile);
  const avatarPayload = await uploadWithProgress("/api/me/profile/avatar", avatarForm);
  state.currentUser = avatarPayload.user;
  await refreshDashboard();
  renderAll();
  setAuthStatus("Foto profil berhasil diperbarui.");
}

async function handleProfileVerificationSave(event) {
  event.preventDefault();
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  try {
    const formData = new FormData(event.currentTarget);
    const legalName = String(formData.get("legalName") || "").trim();
    const ktp = String(formData.get("ktp") || "").trim();
    let whatsapp = String(formData.get("whatsapp") || "").trim();
    if (!whatsapp) whatsapp = getProfileWhatsappInputValue();
    const payloadForm = new FormData();
    payloadForm.append("legalName", legalName);
    payloadForm.append("ktp", ktp);
    payloadForm.append("whatsapp", whatsapp);
    const ktpPhotoFile = formData.get("ktpPhoto");
    const ktpVideoFile = formData.get("ktpVideo");
    if (!legalName || !ktp || !whatsapp) {
      throw new Error("Nama sesuai KTP, nomor KTP, dan WhatsApp wajib diisi.");
    }
    if (!isWhatsappOtpLocked()) {
      throw new Error("Verifikasi WhatsApp via OTP wajib dilakukan terlebih dahulu.");
    }
    if (!(ktpPhotoFile instanceof File) || ktpPhotoFile.size <= 0 || !(ktpVideoFile instanceof File) || ktpVideoFile.size <= 0) {
      throw new Error("Foto KTP dan video selfie memegang KTP wajib diunggah.");
    }
    if (ktpPhotoFile instanceof File && ktpPhotoFile.size > 0) payloadForm.append("ktpPhoto", ktpPhotoFile);
    if (ktpVideoFile instanceof File && ktpVideoFile.size > 0) payloadForm.append("ktpVideo", ktpVideoFile);
    setAuthStatus("Meminta izin lokasi dan menyiapkan data verifikasi...");
    const locationData = await requestVerificationLocation();
    if (!locationData) {
      window.alert("Verifikasi penjual membutuhkan izin lokasi. Jika lokasi ditolak, verifikasi tidak bisa dikirim.");
      return;
    }
    payloadForm.append("latitude", String(locationData.latitude));
    payloadForm.append("longitude", String(locationData.longitude));
    payloadForm.append("accuracy", String(locationData.accuracy));
    payloadForm.append("locationTimestamp", String(locationData.locationTimestamp));
    payloadForm.append("consentText", LOCATION_CONSENT_TEXT);
    payloadForm.append("consentTime", String(locationData.consentTime));
    submitButton.disabled = true;
    const uploadDetail = describeSelectedFiles([ktpPhotoFile, ktpVideoFile].filter((file) => file instanceof File && file.size > 0));
    setVerificationUploadProgressState("Sedang upload verifikasi...", 0, "uploading", uploadDetail || "Menyiapkan file verifikasi...");
    const payload = await uploadWithProgress("/api/me/verification", payloadForm, (percent) => {
      setVerificationUploadProgressState("Sedang upload verifikasi...", percent, "uploading", uploadDetail || "Mengupload file verifikasi...");
    });
    setVerificationUploadProgressState("Upload verifikasi selesai.", 100, "done", uploadDetail || "File verifikasi berhasil diunggah.");
    state.currentUser = payload.user;
    clearProfileVerificationDraft();
    await refreshDashboard();
    renderAll();
    window.setTimeout(() => hideVerificationUploadProgress(), 1800);
    const verificationPendingMessage = "Data verifikasi sudah masuk ke admin. Silakan tunggu, admin sedang cek. Biasanya memakan waktu 2-5 menit.";
    setAuthStatus(verificationPendingMessage);
  } catch (error) {
    console.error(error);
    setVerificationUploadProgressState(error.message || "Upload verifikasi gagal.", 100, "error", "Silakan cek file, izin lokasi, lalu coba lagi.");
    window.setTimeout(() => hideVerificationUploadProgress(), 2200);
    setAuthStatus(error.message || "Verifikasi gagal dikirim.", true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function setVerificationUploadProgressState(message, percent = 0, stateName = "uploading", detail = "Menyiapkan file verifikasi...") {
  const container = document.getElementById("verification-upload-progress");
  const label = document.getElementById("verification-upload-progress-label");
  const value = document.getElementById("verification-upload-progress-value");
  const text = document.getElementById("verification-upload-progress-detail");
  const bar = document.getElementById("verification-upload-progress-bar");
  if (!container || !label || !value || !text || !bar) return;
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  container.classList.remove("hidden", "upload-progress-done", "upload-progress-error");
  if (stateName === "done") container.classList.add("upload-progress-done");
  if (stateName === "error") container.classList.add("upload-progress-error");
  label.textContent = message;
  value.textContent = `${normalized}%`;
  text.textContent = detail;
  bar.style.width = `${normalized}%`;
}

function hideVerificationUploadProgress() {
  const container = document.getElementById("verification-upload-progress");
  const label = document.getElementById("verification-upload-progress-label");
  const value = document.getElementById("verification-upload-progress-value");
  const text = document.getElementById("verification-upload-progress-detail");
  const bar = document.getElementById("verification-upload-progress-bar");
  if (!container || !label || !value || !text || !bar) return;
  container.classList.add("hidden");
  container.classList.remove("upload-progress-done", "upload-progress-error");
  label.textContent = "Sedang upload verifikasi...";
  value.textContent = "0%";
  text.textContent = "Menyiapkan file verifikasi...";
  bar.style.width = "0%";
}

async function requestVerificationLocation() {
  const approved = await openLocationConsentModal();
  if (!approved) return null;
  if (!("geolocation" in navigator)) {
    throw new Error("Browser ini tidak mendukung geolocation.");
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          locationTimestamp: new Date(position.timestamp || Date.now()).toISOString(),
          consentTime: new Date().toISOString(),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function openLocationConsentModal() {
  return new Promise((resolve) => {
    if (!elements.locationConsentModal) {
      resolve(true);
      return;
    }
    locationConsentResolver = resolve;
    elements.locationConsentModal.classList.remove("hidden");
  });
}

function closeLocationConsentModal(result) {
  elements.locationConsentModal?.classList.add("hidden");
  if (locationConsentResolver) {
    const resolver = locationConsentResolver;
    locationConsentResolver = null;
    resolver(Boolean(result));
  }
}

function buildTransactionList(transactions, active) {
  if (!transactions.length) {
    return `<p class="muted-text">${active ? "Belum ada rekber aktif." : "Belum ada riwayat rekber selesai."}</p>`;
  }
  return transactions.map((item) => `
    <article class="activity-item ${state.activeTransaction?.code === item.code ? "is-active" : ""}">
      <div class="transaction-list-card">
        <button type="button" class="ghost-btn open-transaction-btn transaction-title-btn" data-transaction-code="${item.code}">
          <div class="transaction-list-top">
            <strong class="transaction-list-title">${escapeHtml(item.title)}</strong>
            ${getUserUnreadCount(item) ? `<span class="notif-badge list-notif-badge">${getUserUnreadCount(item)}</span>` : ""}
            <span class="admin-tag ${item.hasDispute ? "admin-tag-danger" : ""}">${escapeHtml(item.paymentStatus)}</span>
          </div>
          <span class="transaction-list-code">${escapeHtml(item.code)}</span>
          <span class="transaction-list-meta">
            <span>${formatCurrencyHtml(item.price)}</span>
            <span>${capitalize(item.type)}</span>
            <span>${item.buyer && item.seller ? "Lengkap" : "Menunggu lawan transaksi"}</span>
          </span>
        </button>
      </div>
    </article>
  `).join("");
}

function buildChatHistoryRows(messages) {
  if (!messages.length) {
    return "<p class=\"muted-text\">Belum ada history chat rekber.</p>";
  }
  return messages.slice(0, 10).map((item) => `
    <article class="activity-item">
      <div class="activity-top">
        <strong>${escapeHtml(item.transactionTitle)}</strong>
        <span>${formatTime(new Date(item.time))}</span>
      </div>
      <p>${item.transactionCode}</p>
      <p><strong>${escapeHtml(item.sender)}</strong> &bull; ${escapeHtml(item.senderTitle || "Peserta")} &bull; ${item.senderVerified ? "Terverifikasi" : "Belum verifikasi"}</p>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function bindOpenTransactionButtons() {
  document.querySelectorAll(".open-transaction-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.dataset.transactionCode;
      if (isMobileViewport() && await openMobileTransactionChat(code)) {
        return;
      }
      elements.joinCode.value = code;
      handleJoinTransaction();
    });
  });
}

function scrollWorkspaceTarget(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: window.innerWidth <= 768 ? "auto" : "smooth", block: "start" });
}

function openMemberView(view) {
  state.currentMemberView = view;
  renderHomeVisibility();
  renderMemberVisibility();
  if (view === "transactions" && state.activeTransaction) {
    scrollWorkspaceTarget("ruang-transaksi");
    return;
  }
  scrollWorkspaceTarget("member-area");
}

function openWorkspaceSection(section) {
  if (section !== "transactions" || state.transactionScreen !== "room") {
    exitRoomMode();
  }
  if (section !== "transactions" && state.transactionScreen === "room") {
    state.transactionScreen = "list";
    state.historyChatType = null;
    state.historyVoucherOrder = null;
    state.historySelection = { type: "", code: "" };
    state.activeTransaction = null;
    window.RekberVoucher?.clearHistoryRoom?.();
  }
  if (section !== "dashboard") {
    state.mobileCreateOpen = false;
  }
  state.currentMemberView = "transactions";
  state.workspaceSection = section;
  renderHomeVisibility();
  renderMemberVisibility();
  if (section === "verification" || section === "profile") {
    renderProfile();
  }
  if (section === "notifications") {
    renderNotifications();
  }
  if (section === "transactions") {
    renderUnifiedTransactionHistory();
    Promise.all([
      refreshTransactions().catch(() => {}),
      refreshDashboard().catch(() => {}),
      window.RekberVoucher?.refresh?.().catch(() => {}),
    ]).then(() => {
      renderActivityTabs();
      renderUnifiedTransactionHistory();
    });
  }
  renderTransactionScreen();
  updateWorkspaceMenuState();
  scrollWorkspaceTarget("member-area");
}

function openHomeView() {
  if (state.currentUser) {
    state.currentMemberView = "transactions";
    state.workspaceSection = "dashboard";
    state.mobileCreateOpen = false;
    renderHomeVisibility();
    renderMemberVisibility();
    scrollWorkspaceTarget("member-area");
    return;
  }
  state.currentMemberView = null;
  renderHomeVisibility();
  renderMemberVisibility();
  scrollWorkspaceTarget("home-area");
}

function handleWorkspaceBackNavigation() {
  if (state.transactionScreen === "room") {
    openTransactionListView();
    return;
  }
  if (state.currentMemberView) {
    openWorkspaceSection("dashboard");
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  openHomeView();
}

function toggleVerificationFields() {
  [elements.transactionForm, elements.workspaceTransactionForm].forEach((form) => {
    toggleVerificationFieldsForForm(form);
  });
  return toggleVerificationFieldsForForm(elements.transactionForm || elements.workspaceTransactionForm);
}

function enforceTransactionVerificationState(showPopup = false) {
  const forms = [elements.transactionForm, elements.workspaceTransactionForm].filter(Boolean);
  forms.forEach((form) => {
    const selectedRole = toggleVerificationFieldsForForm(form);
    const blocked = selectedRole === "seller" && !(state.currentUser && state.currentUser.verificationStatus === "verified");
    const fields = form.querySelectorAll("input, select, button");
    fields.forEach((field) => {
      if (field.name === "role") return;
      field.disabled = blocked;
    });
    if (blocked && showPopup) {
      openVerificationModal("Role penjual membutuhkan verifikasi KTP dulu. Silakan lengkapi di menu Verifikasi.");
    }
  });
}

function openVerificationModal(message) {
  const text = document.getElementById("verification-modal-text");
  if (text) text.textContent = message;
  elements.verificationModal.classList.remove("hidden");
}

function closeVerificationModal() {
  elements.verificationModal.classList.add("hidden");
}

function isSupportWidgetOpen() {
  return Boolean(elements.supportWidgetPanel && !elements.supportWidgetPanel.classList.contains("hidden"));
}

function openSupportWidgetIfClosed() {
  if (!isSupportWidgetOpen()) toggleSupportWidget();
}

function bindModalEscape(modal, onEscape) {
  unbindModalEscape();
  if (!modal) return;
  activeModalEscapeHandler = (event) => {
    if (event.key !== "Escape") return;
    onEscape();
  };
  document.addEventListener("keydown", activeModalEscapeHandler);
}

function unbindModalEscape() {
  if (!activeModalEscapeHandler) return;
  document.removeEventListener("keydown", activeModalEscapeHandler);
  activeModalEscapeHandler = null;
}

function openAccessibleModalShell(modal) {
  modal?.classList.remove("hidden");
  modal?.setAttribute("aria-hidden", "false");
}

function closeAccessibleModalShell(modal) {
  modal?.classList.add("hidden");
  modal?.setAttribute("aria-hidden", "true");
  unbindModalEscape();
}

function openMobileVoucherWorkspace() {
  state.mobileCreateOpen = true;
  openWorkspaceSection("dashboard");
  window.RekberVoucher?.openService?.("voucher");
  renderTransactionScreen();
  document.getElementById("workspace-inline-transaction-panel")?.scrollIntoView({
    behavior: window.innerWidth <= 768 ? "auto" : "smooth",
    block: "start",
  });
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function initViewportListener() {
  const media = window.matchMedia("(max-width: 768px)");
  const handleViewportChange = () => {
    renderTransactionScreen();
    renderMemberVisibility();
    updateWorkspaceMenuState();
    if (state.currentMemberView === "transactions") {
      renderUnifiedTransactionHistory();
    }
    if (state.workspaceSection === "dashboard" && isMobileViewport()) {
      renderMobileDashboard();
    }
    if (state.transactionScreen === "room" && state.activeTransaction) {
      renderRoom(state.activeTransaction);
    }
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleViewportChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(handleViewportChange);
  }
}

async function openMobileTransactionChat(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return false;
  let transaction = state.transactions.find((item) => item.code === normalized)
    || state.dashboard.activeTransactions?.find((item) => item.code === normalized)
    || (state.activeTransaction?.code === normalized ? state.activeTransaction : null);
  if (!transaction) {
    try {
      const payload = await fetchJson(`/api/transactions/${encodeURIComponent(normalized)}`);
      transaction = payload.transaction;
    } catch {
      return false;
    }
  }
  if (!transaction) return false;
  markUserTransactionSeen(transaction);
  updateUserNotificationBadges();
  state.activeTransaction = transaction;
  state.transactionScreen = "room";
  state.historyChatType = null;
  state.historyVoucherOrder = null;
  state.mobileCreateOpen = false;
  openWorkspaceSection("transactions");
  renderRoom(transaction);
  history.replaceState({}, "", `?trx=${normalized}`);
  return true;
}

function renderRoom(transaction) {
  roomChatScrollState = captureScrollState(elements.chatBox);
  state.transactionScreen = "room";
  renderTransactionScreen();
  elements.joinRoleBox.classList.add("hidden");
  elements.transactionRoomEmpty.classList.add("hidden");
  elements.roomPageTitle.textContent = transaction.title;
  elements.roomPageSubtitle.innerHTML = `${escapeHtml(transaction.code)} | ${escapeHtml(capitalize(transaction.type))} | ${formatCurrencyHtml(transaction.price)}`;
  elements.roomCode.textContent = transaction.code;
  elements.roomPaymentStatus.textContent = transaction.paymentStatus;
  elements.roomBuyer.innerHTML = transaction.buyer
    ? renderParticipantNameWithBadge(transaction.buyer)
    : "Menunggu pembeli";
  elements.roomSeller.innerHTML = transaction.seller
    ? renderParticipantNameWithBadge(transaction.seller)
    : "Menunggu penjual";
  if (elements.mobileChatHeaderTitle) elements.mobileChatHeaderTitle.textContent = transaction.title || transaction.code;
  if (elements.mobileChatHeaderBadge) elements.mobileChatHeaderBadge.textContent = transaction.paymentStatus || "-";
  if (elements.mobileRoomStatusBadge) elements.mobileRoomStatusBadge.textContent = transaction.paymentStatus || "-";
  if (elements.mobileRoomPrice) elements.mobileRoomPrice.innerHTML = formatCurrencyHtml(transaction.price);
  enterRoomMode();
  renderRoomParticipantAvatars(transaction);
  renderRoomProgress(transaction);
  renderRoomPresence(transaction);
  elements.roomSummary.innerHTML = buildSummaryItems(transaction).map(renderSummaryItem).join("");
  if (elements.roomTimeline) {
    elements.roomTimeline.innerHTML = "";
  }
  if (elements.proofList) {
    elements.proofList.innerHTML = "";
  }
  const timeline = buildTransactionTimeline(transaction);
  elements.chatBox.innerHTML = timeline.map((item) => item.kind === "upload" ? renderChatUploadItem(item, transaction) : renderChatItem(item, transaction)).join("");
  restoreScrollState(elements.chatBox, roomChatScrollState);
  markUserTransactionSeen(transaction);
  updateRoomActionButtons(transaction);
  renderSellerBankForm(transaction);
  renderActivityTabs();
  updateUserNotificationBadges();
}

function renderRoomParticipantAvatars(transaction) {
  if (elements.roomBuyerAvatar) {
    elements.roomBuyerAvatar.innerHTML = transaction.buyer
      ? renderParticipantAvatarMini(transaction.buyer.displayName, transaction.buyer.avatar)
      : "B";
  }
  if (elements.roomSellerAvatar) {
    elements.roomSellerAvatar.innerHTML = transaction.seller
      ? renderParticipantAvatarMini(transaction.seller.displayName, transaction.seller.avatar)
      : "S";
  }
}

function renderParticipantAvatarMini(name, avatarUrl) {
  if (avatarUrl) {
    return `<img src="${escapeAttribute(avatarUrl)}" alt="${escapeAttribute(name || "Profil")}" />`;
  }
  const initial = escapeHtml(String(name || "R").trim().charAt(0).toUpperCase() || "R");
  return `<span>${initial}</span>`;
}

function isUserVerified(user) {
  return user?.verificationStatus === "verified" || Boolean(user?.verified);
}

function renderParticipantNameWithBadge(user) {
  const verified = isUserVerified(user);
  return `${escapeHtml(user.displayName || "Pengguna")} <span class="verified-inline-badge ${verified ? "is-verified" : "is-unverified"}" aria-label="${verified ? "Terverifikasi" : "Belum terverifikasi"}">${verified ? "✓" : "✕"}</span>`;
}

function renderRoomProgress(transaction) {
  const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : null;
  const fundedAt = transaction.adminFundsReceivedAt ? new Date(transaction.adminFundsReceivedAt) : (transaction.adminFundsReceived ? new Date() : null);
  const reviewedAt = transaction.accountDeliveredAt ? new Date(transaction.accountDeliveredAt) : (transaction.paymentStatus === "Akun sudah diserahkan" || transaction.buyerConfirmedReceived ? new Date() : null);
  const completeAt = transaction.completedAt ? new Date(transaction.completedAt) : (transaction.paymentStatus === "Selesai" ? new Date() : null);
  setProgressStepState(elements.roomProgressCreated, true);
  setProgressStepState(elements.roomProgressFunded, Boolean(transaction.adminFundsReceived));
  setProgressStepState(elements.roomProgressReviewed, transaction.paymentStatus === "Akun sudah diserahkan" || Boolean(transaction.buyerConfirmedReceived) || Boolean(transaction.sellerPayoutSent));
  setProgressStepState(elements.roomProgressComplete, transaction.paymentStatus === "Selesai" || Boolean(transaction.sellerPayoutSent));
  if (elements.roomProgressCreatedTime) elements.roomProgressCreatedTime.textContent = createdAt ? formatDateTime(createdAt) : "-";
  if (elements.roomProgressFundedTime) elements.roomProgressFundedTime.textContent = fundedAt ? formatDateTime(fundedAt) : "-";
  if (elements.roomProgressReviewedTime) elements.roomProgressReviewedTime.textContent = reviewedAt ? formatDateTime(reviewedAt) : "-";
  if (elements.roomProgressCompleteTime) elements.roomProgressCompleteTime.textContent = completeAt ? formatDateTime(completeAt) : "-";
}

function setProgressStepState(element, done) {
  if (!element) return;
  element.classList.toggle("is-active", done);
}

function buildTransactionStatusTimeline(transaction) {
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
      detail: `${transaction.title} dibuat dan menunggu proses transaksi berjalan.`,
      time: transaction.createdAt ? formatDateTime(new Date(transaction.createdAt)) : "-",
      done: true,
    },
    {
      title: "Dana Diamankan",
      detail: transaction.adminFundsReceived ? "Dana pembeli sudah masuk dan diamankan admin." : "Menunggu admin mengonfirmasi dana pembeli.",
      time: findTransactionEventTime(transaction, ["dana sudah diterima admin", "dana pembeli sudah masuk"]) || "-",
      done: Boolean(transaction.adminFundsReceived),
    },
    {
      title: "Data/Item diserahkan",
      detail: deliveredDone
        ? "Penjual sudah memberi konfirmasi bahwa data / item telah diserahkan."
        : "Menunggu penjual menyerahkan data / item ke pembeli.",
      time: findTransactionEventTime(transaction, ["data akun / item sudah diserahkan", "data / item sudah diserahkan"]) || "-",
      done: deliveredDone,
    },
    {
      title: "Data/Item Diperiksa",
      detail: checkedDone
        ? "Pembeli sudah mulai memeriksa data / item yang diterima."
        : "Pembeli belum memeriksa data / item dari penjual.",
      time: findTransactionEventTime(transaction, ["pembeli mengonfirmasi item diterima"]) || "-",
      done: checkedDone,
    },
    {
      title: "Data/Item diamankan",
      detail: securedDone
        ? "Pembeli mengonfirmasi data / item sudah diterima dan diamankan."
        : "Menunggu pembeli mengamankan data / item dan mengonfirmasi penerimaan.",
      time: findTransactionEventTime(transaction, ["pembeli mengonfirmasi item diterima"]) || "-",
      done: securedDone,
    },
    {
      title: "Selesai",
      detail: completedDone
        ? "Dana sudah diproses ke penjual dan transaksi selesai."
        : "Menunggu admin menyelesaikan transfer dana ke penjual.",
      time: findTransactionEventTime(transaction, ["Admin sudah meneruskan dana ke penjual", "transaksi dinyatakan selesai", "transfer ke penjual sudah selesai"]) || "-",
      done: completedDone,
    },
  ];
}

function findTransactionEventTime(transaction, snippets = []) {
  const lowered = snippets.map((item) => String(item || "").toLowerCase());
  const message = (transaction.messages || []).find((item) => {
    const text = String(item.text || "").toLowerCase();
    return lowered.some((snippet) => text.includes(snippet));
  });
  return message?.time ? formatDateTime(new Date(message.time)) : "";
}

function renderTimelineItem(item) {
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

function buildTransactionTimeline(transaction) {
  const messages = (transaction.messages || []).map((item) => ({ ...item, kind: "message" }));
  const uploads = (transaction.uploads || []).map((item) => ({ ...item, kind: "upload" }));
  return [...messages, ...uploads].sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime());
}

function renderSummaryItem(item) {
  const valueContent = item.htmlValue
    || (item.isMoney ? formatCurrencyHtml(item.value) : escapeHtml(item.value || "-"));
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

function renderChatUploadItem(item, transaction = state.activeTransaction) {
  const profile = resolveTransactionProfileForMessage(item, transaction);
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
        <button type="button" class="chat-avatar-btn" data-profile-trigger="${escapeAttribute(profile.role)}" title="Lihat profil ${escapeAttribute(item.sender)}">
          ${renderProfileAvatar(profile)}
        </button>
        <div class="chat-message-copy">
          <div class="chat-header">
            <div class="chat-author">
              <button type="button" class="chat-author-btn" data-profile-trigger="${escapeAttribute(profile.role)}"><strong>${escapeHtml(item.sender)}</strong></button>
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

function renderChatItem(item, transaction = state.activeTransaction) {
  const profile = resolveTransactionProfileForMessage(item, transaction);
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
        <button type="button" class="chat-avatar-btn" data-profile-trigger="${escapeAttribute(profile.role)}" title="Lihat profil ${escapeAttribute(item.sender)}">
          ${renderProfileAvatar(profile)}
        </button>
        <div class="chat-message-copy">
          <div class="chat-header">
            <div class="chat-author">
              <button type="button" class="chat-author-btn" data-profile-trigger="${escapeAttribute(profile.role)}"><strong>${escapeHtml(item.sender)}</strong></button>
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

function buildSummaryItems(transaction) {
  const warrantyText = transaction.warranty || "Tanpa garansi";
  const warrantyHint = transaction.warranty
    ? "Dana akan diteruskan admin setelah masa garansi selesai."
    : "Tanpa garansi, dana bisa langsung diproses admin sesuai alur transaksi.";
  return [
    { label: "ID TRANSAKSI", value: transaction.code, hint: transaction.title },
    { label: "STATUS", htmlValue: renderSummaryStatusChip(transaction.paymentStatus) },
    { label: "NILAI TRANSAKSI", value: transaction.price, isMoney: true },
    { label: "PEMBAYAR FEE", value: feePayerLabel(transaction.feePayer) },
    { label: "DIBUAT PADA", value: transaction.createdAt ? formatDateTime(new Date(transaction.createdAt)) : "-" },
    { label: "MASA GARANSI", value: warrantyText, hint: warrantyHint },
  ];
}

function renderSummaryStatusChip(status) {
  const normalized = String(status || "").toLowerCase();
  let modifier = "pending";
  if (normalized.includes("selesai")) modifier = "done";
  else if (normalized.includes("sengketa") || normalized.includes("dibatalkan")) modifier = "danger";
  else if (normalized.includes("antrian")) modifier = "info";
  return `<span class="summary-status-chip summary-status-chip-${modifier}">${escapeHtml(status || "-")}</span>`;
}

function updateRoomActionButtons(transaction) {
  const currentRole = getCurrentUserTransactionRole(transaction);
  const accountDeliveredState = getTransactionActionAvailability(transaction, "account_delivered");
  const goodsReceivedState = getTransactionActionAvailability(transaction, "goods_received");
  const cancelState = getTransactionActionAvailability(transaction, "cancel_transaction");
  elements.accountDelivered.classList.toggle("hidden", currentRole !== "seller");
  elements.goodsReceived.classList.toggle("hidden", currentRole !== "buyer");
  elements.cancelTransaction?.classList.remove("hidden");
  elements.accountDelivered.disabled = !accountDeliveredState.enabled;
  elements.goodsReceived.disabled = !goodsReceivedState.enabled;
  elements.accountDelivered.title = accountDeliveredState.reason || "Klik jika data / item sudah benar-benar dikirim ke pembeli.";
  elements.goodsReceived.title = goodsReceivedState.reason || "Klik jika akun / item sudah diterima dan diamankan.";
  if (elements.cancelTransaction) {
    elements.cancelTransaction.disabled = !cancelState.enabled;
    elements.cancelTransaction.title = cancelState.reason || "Batalkan transaksi jika memang harus ditutup.";
  }
}

function renderSellerBankForm(transaction) {
  if (!elements.sellerBankForm) return;
  const currentRole = getCurrentUserTransactionRole(transaction);
  const canShow = currentRole === "seller" && Boolean(transaction.buyerConfirmedReceived) && !Boolean(transaction.sellerPayoutSent) && transaction.paymentStatus !== "Selesai";
  elements.sellerBankForm.classList.toggle("hidden", !canShow);
  if (!canShow) return;
  const nextSnapshot = JSON.stringify({
    bankName: transaction.sellerBankName || "",
    bankNumber: transaction.sellerBankNumber || "",
    bankHolder: transaction.sellerBankHolder || "",
  });
  if (!sellerBankUiState.dirty || nextSnapshot !== sellerBankUiState.lastLoadedSnapshot) {
    if (elements.sellerBankName) elements.sellerBankName.value = transaction.sellerBankName || "";
    if (elements.sellerBankNumber) elements.sellerBankNumber.value = transaction.sellerBankNumber || "";
    if (elements.sellerBankHolder) elements.sellerBankHolder.value = transaction.sellerBankHolder || "";
    sellerBankUiState.lastLoadedSnapshot = nextSnapshot;
    if (transaction.sellerBankName || transaction.sellerBankNumber || transaction.sellerBankHolder) {
      sellerBankUiState.dirty = false;
    }
  }
  if (elements.saveSellerBankDetails) {
    elements.saveSellerBankDetails.textContent = (transaction.sellerBankName || transaction.sellerBankNumber || transaction.sellerBankHolder)
      ? "Perbarui data rekening ke admin"
      : "Kirim data rekening ke admin";
  }
}

async function handleSellerBankFormSubmit(event) {
  event.preventDefault();
  if (!state.activeTransaction) return;
  const bankName = String(elements.sellerBankName?.value || "").trim();
  const bankNumber = String(elements.sellerBankNumber?.value || "").trim();
  const bankHolder = String(elements.sellerBankHolder?.value || "").trim();
  if (!bankName || !bankNumber || !bankHolder) {
    setAuthStatus("Nama bank, nomor rekening, dan atas nama wajib diisi.", true);
    return;
  }
  const payload = await fetchJson(`/api/transactions/${state.activeTransaction.code}/seller-bank`, {
    method: "POST",
    body: JSON.stringify({ bankName, bankNumber, bankHolder }),
  });
  sellerBankUiState.dirty = false;
  sellerBankUiState.lastLoadedSnapshot = JSON.stringify({ bankName, bankNumber, bankHolder });
  state.activeTransaction = payload.transaction;
  await refreshTransactions();
  await refreshDashboard();
  renderRoom(state.activeTransaction);
  renderProfile();
  setAuthStatus("Data rekening penjual berhasil dikirim ke admin.");
}

function buildRoomGuideItems(transaction) {
  const currentRole = getCurrentUserTransactionRole(transaction);
  if (currentRole === "buyer") {
    return [
      { step: "1", title: "Tunggu admin", text: "Sesudah transfer, tunggu admin menekan Dana sudah diterima." },
      { step: "2", title: "Cek data / item", text: "Saat penjual kirim data, segera cek dan amankan akun / item Anda." },
      { step: "3", title: "Klik Item Diterima", text: "Tekan hanya jika data / item sudah benar-benar aman." },
    ];
  }
  if (currentRole === "seller") {
    return [
      { step: "1", title: "Tunggu dana aman", text: "Jangan kirim data / item sebelum admin menekan Dana sudah diterima." },
      { step: "2", title: "Klik Data / Item Diserahkan", text: "Tekan setelah data akun / item benar-benar terkirim." },
      { step: "3", title: "Kirim rekening", text: "Setelah buyer klik Item Diterima, kirim data rekening ke admin." },
    ];
  }
  return [
    { step: "1", title: "Ikuti urutan", text: "Gunakan tombol sesuai alur transaksi." },
    { step: "2", title: "Baca panduan", text: "Syarat ketentuan dan security guide ada di homepage." },
    { step: "3", title: "Pakai sengketa", text: "Jika ada masalah, buka sengketa atau live chat admin." },
  ];
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

function getCurrentUserTransactionRole(transaction) {
  if (!state.currentUser || !transaction) return "";
  if (transaction.buyer?.id === state.currentUser.id) return "buyer";
  if (transaction.seller?.id === state.currentUser.id) return "seller";
  return "";
}

function getTransactionActionConfirmation(action) {
  const confirmations = {
    mark_paid: "Yakin ingin menandai pembayaran sudah dilakukan? Pastikan transfer memang sudah dikirim.",
    account_delivered: "Yakin data / item sudah benar-benar diserahkan? Tindakan ini akan terlihat oleh semua pihak.",
    goods_received: "Yakin data / item sudah diterima dan diamankan dengan benar? Setelah ini admin bisa melanjutkan proses dana.",
    open_dispute: "Yakin ingin mengajukan sengketa? Gunakan ini jika memang ada masalah pada transaksi.",
    cancel_transaction: "Yakin ingin membatalkan transaksi ini?",
  };
  return confirmations[action] || "";
}

function openConfirmModal(title, text) {
  if (!elements.confirmModal) {
    return Promise.resolve(window.confirm(text || title));
  }
  elements.confirmModalTitle.textContent = title || "Konfirmasi";
  elements.confirmModalText.textContent = text || "Pastikan tindakan ini memang benar.";
  openAccessibleModalShell(elements.confirmModal);
  bindModalEscape(elements.confirmModal, () => closeConfirmModal(false));
  elements.confirmModalApprove?.focus();
  return new Promise((resolve) => {
    confirmModalResolver = resolve;
  });
}

function closeConfirmModal(approved) {
  closeAccessibleModalShell(elements.confirmModal);
  if (confirmModalResolver) {
    const resolve = confirmModalResolver;
    confirmModalResolver = null;
    resolve(Boolean(approved));
  }
}

function openPromptModal(title, options = {}) {
  if (!elements.promptModal) {
    const fallback = window.prompt(options.label || title || "Masukkan catatan:") || "";
    return Promise.resolve(fallback.trim() ? fallback : null);
  }
  elements.promptModalEyebrow.textContent = options.eyebrow || "Catatan";
  elements.promptModalTitle.textContent = title || "Masukkan informasi";
  elements.promptModalLabel.textContent = options.label || "Alasan";
  elements.promptModalInput.value = "";
  elements.promptModalInput.placeholder = options.placeholder || "Tulis alasan di sini...";
  openAccessibleModalShell(elements.promptModal);
  bindModalEscape(elements.promptModal, () => closePromptModal(null));
  elements.promptModalInput.focus();
  return new Promise((resolve) => {
    promptModalResolver = resolve;
  });
}

function closePromptModal(value) {
  const result = value === null ? null : String(elements.promptModalInput?.value || "").trim();
  closeAccessibleModalShell(elements.promptModal);
  if (promptModalResolver) {
    const resolve = promptModalResolver;
    promptModalResolver = null;
    resolve(result || null);
  }
}

async function refreshSupportThread() {
  try {
    const payload = await fetchJson(state.currentUser ? "/api/support-thread" : "/api/public-support-thread");
    state.supportThread = payload.thread || null;
    renderSupportWidget();
    startSupportThreadPolling();
    if (elements.supportWidgetPanel && !elements.supportWidgetPanel.classList.contains("hidden")) {
      startSupportPresenceServices();
    }
  } catch (error) {
    console.error("Gagal memuat live chat:", error);
  }
}

function renderSupportWidget() {
  if (!elements.supportWidget) return;
  const shouldShow = true;
  elements.supportWidget.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) return;
  const messages = state.supportThread?.messages || [];
  if (elements.supportWidgetHint) {
    elements.supportWidgetHint.textContent = state.currentUser
      ? "Klik di sini untuk menghubungi admin via live chat."
      : "Live chat admin bisa dipakai sebelum login. Klik di sini untuk mulai chat.";
    const shouldAutoShowHint = !supportHintShown && elements.supportWidgetPanel?.classList.contains("hidden") && !elements.homeArea?.classList.contains("hidden");
    if (shouldAutoShowHint) {
      supportHintShown = true;
      elements.supportWidgetHint.classList.remove("hidden");
      playUserNotificationSound("chat");
      clearTimeout(supportHintTimer);
      supportHintTimer = window.setTimeout(() => {
        elements.supportWidgetHint?.classList.add("hidden");
      }, 3000);
    } else if (!elements.supportWidgetPanel?.classList.contains("hidden")) {
      elements.supportWidgetHint.classList.add("hidden");
    }
  }
  updateSupportWidgetBadge();
  renderSupportWidgetPresence();
  elements.supportWidgetMessages.innerHTML = messages.length
    ? messages.map(renderSupportMessage).join("")
    : "<div class=\"upload-empty-state\">Belum ada pesan live chat.</div>";
  if (!elements.supportWidgetPanel?.classList.contains("hidden")) {
    elements.supportWidgetMessages.scrollTop = elements.supportWidgetMessages.scrollHeight;
  }
}

function renderSupportMessage(message) {
  const roleClass = message.senderRole === "admin" ? "chat-role-admin" : "chat-role-buyer";
  const messageClass = message.senderRole === "admin" ? "chat-other" : "chat-own";
  const attachment = renderSupportAttachment(message);
  return `
    <div class="chat-message ${roleClass} ${messageClass}">
      <div class="chat-message-body">
        <div class="chat-message-copy">
          <div class="chat-header">
            <div class="chat-author">
              <strong>${escapeHtml(message.sender)}</strong>
              <div class="chat-badges">
                <span class="chat-badge chat-badge-role">${escapeHtml(message.senderRole === "admin" ? "Admin" : "Pengguna")}</span>
              </div>
            </div>
            <span>${formatTime(new Date(message.time))}</span>
          </div>
          ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
          ${attachment}
        </div>
      </div>
    </div>
  `;
}

async function handleSupportMessageSubmit(event) {
  event.preventDefault();
  const text = elements.supportWidgetInput?.value.trim();
  const files = Array.from(elements.supportWidgetUpload?.files || []);
  if (!text && !files.length) return;
  await sendSupportTypingState(false);
  const basePath = state.currentUser ? "/api/support-thread" : "/api/public-support-thread";
  try {
    let payload = null;
    if (text) {
      payload = await fetchJson(`${basePath}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    }
    if (files.length) {
      const formData = new FormData();
      files.forEach((file) => formData.append("supportFiles", file));
      payload = await uploadWithProgress(`${basePath}/uploads`, formData);
    }
    if (!payload?.thread) {
      throw new Error("Live chat gagal diperbarui.");
    }
    state.supportThread = payload.thread;
    elements.supportWidgetForm.reset();
    if (elements.supportWidgetUpload) elements.supportWidgetUpload.value = "";
    markSupportThreadSeen();
    renderSupportWidget();
    setAuthStatus("Pesan live chat berhasil dikirim.");
  } catch (error) {
    console.error("Live chat gagal dikirim:", error);
    setAuthStatus(error.message || "Live chat gagal dikirim.", true);
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
  if (type.startsWith("video/")) {
    return `<a class="support-attachment support-attachment-file" href="${safeUrl}" target="_blank" rel="noreferrer">Video: ${safeName}</a>`;
  }
  return `<a class="support-attachment support-attachment-file" href="${safeUrl}" target="_blank" rel="noreferrer">${safeName}</a>`;
}

function toggleSupportWidget() {
  if (elements.supportWidgetToggle?.dataset.skipClick === "true") return;
  const wasHidden = elements.supportWidgetPanel?.classList.contains("hidden");
  elements.supportWidgetPanel?.classList.toggle("hidden");
  elements.supportWidgetHint?.classList.add("hidden");
  updateSupportWidgetBadge();
  if (!elements.supportWidgetPanel?.classList.contains("hidden")) {
    markSupportThreadSeen();
    elements.supportWidgetMessages.scrollTop = elements.supportWidgetMessages.scrollHeight;
    startSupportPresenceServices();
    if (state.currentUser) {
      fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getUserHeartbeatBody()) }).catch(() => {});
    } else {
      sendGuestSupportPresenceHeartbeat();
    }
  } else if (wasHidden === false) {
    stopSupportPresenceServices();
    if (state.currentUser) {
      fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getUserHeartbeatBody()) }).catch(() => {});
    }
  }
}

function startSupportThreadPolling() {
  if (supportThreadTimer) return;
  const poll = async () => {
    try {
      const payload = await fetchJson(state.currentUser ? "/api/support-thread" : "/api/public-support-thread");
      state.supportThread = payload.thread || null;
      renderSupportWidget();
    } catch {}
  };
  supportThreadTimer = window.setInterval(poll, state.currentUser ? 5000 : 2500);
}

function stopSupportThreadPolling() {
  if (supportThreadTimer) {
    clearInterval(supportThreadTimer);
    supportThreadTimer = null;
  }
}

function getSupportSeenStorageKey() {
  return state.currentUser ? `rekberwe_support_seen_${state.currentUser.id}` : "rekberwe_support_seen_guest";
}

function getLatestSupportMessageTime() {
  const messages = state.supportThread?.messages || [];
  return messages[messages.length - 1]?.time || "";
}

function markSupportThreadSeen() {
  const key = getSupportSeenStorageKey();
  const latest = getLatestSupportMessageTime();
  if (!key || !latest) return;
  localStorage.setItem(key, latest);
  updateSupportWidgetBadge();
}

function getSupportUnreadCount() {
  if (!state.supportThread?.messages?.length) return 0;
  const key = getSupportSeenStorageKey();
  const seenAt = key ? localStorage.getItem(key) : "";
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
  return state.supportThread.messages.filter((message) => {
    const isIncoming = message.senderRole === "admin";
    return isIncoming && new Date(message.time).getTime() > seenTime;
  }).length;
}

function updateSupportWidgetBadge() {
  const count = getSupportUnreadCount();
  if (!elements.supportWidgetBadge) return;
  elements.supportWidgetBadge.textContent = count > 99 ? "99+" : String(count);
  elements.supportWidgetBadge.classList.toggle("hidden", !count || !elements.supportWidgetPanel?.classList.contains("hidden"));
}

function initSupportWidgetDrag() {
  const widget = elements.supportWidget;
  const handles = [elements.supportWidgetDrag, elements.supportWidgetToggle].filter(Boolean);
  if (!widget || !handles.length) return;
  handles.forEach((dragHandle) => {
    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof dragHandle.setPointerCapture === "function") {
        try {
          dragHandle.setPointerCapture(event.pointerId);
        } catch {}
      }
      const rect = widget.getBoundingClientRect();
      const startX = event.clientX - rect.left;
      const startY = event.clientY - rect.top;
      const downX = event.clientX;
      const downY = event.clientY;
      let moved = false;
      widget.classList.add("is-dragging");
      document.body.classList.add("widget-dragging");
      widget.style.right = "auto";
      widget.style.bottom = "auto";
      widget.style.left = `${rect.left}px`;
      widget.style.top = `${rect.top}px`;
      const onMove = (moveEvent) => {
        moveEvent.preventDefault();
        if (Math.abs(moveEvent.clientX - downX) > 4 || Math.abs(moveEvent.clientY - downY) > 4) {
          moved = true;
        }
        const nextLeft = moveEvent.clientX - startX;
        const nextTop = moveEvent.clientY - startY;
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        widget.style.left = `${Math.min(Math.max(8, nextLeft), maxLeft)}px`;
        widget.style.top = `${Math.min(Math.max(8, nextTop), maxTop)}px`;
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);
        widget.classList.remove("is-dragging");
        document.body.classList.remove("widget-dragging");
        if (moved) {
          dragHandle.dataset.skipClick = "true";
          window.setTimeout(() => delete dragHandle.dataset.skipClick, 260);
        }
      };
      const onUp = () => cleanup();
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("pointercancel", onUp, { once: true });
      window.addEventListener("blur", onUp, { once: true });
    });
  });
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
  }).format(value);
}

function formatCurrencyHtml(value) {
  return `<span class="money-value">${escapeHtml(formatCurrency(value))}</span>`;
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

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function handleSupportRoute() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("support") !== "1") return;
  const prefill = String(params.get("prefill") || "").trim();
  if (!state.currentUser) {
    setAuthStatus("Silakan login terlebih dahulu untuk membuka live chat admin.");
    openLoginModal();
    return;
  }
  openWorkspaceSection("dashboard");
  if (elements.supportWidgetPanel?.classList.contains("hidden")) {
    toggleSupportWidget();
  }
  if (prefill && elements.supportWidgetInput) {
    elements.supportWidgetInput.value = prefill;
  }
  params.delete("support");
  params.delete("prefill");
  const cleanQuery = params.toString();
  history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
}

async function handleVoucherRoute() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("voucher");
  if (!code) return;
  if (!state.currentUser) {
    setAuthStatus("Silakan login terlebih dahulu untuk membuka order voucher dari link email.", true);
    openLoginModal();
    return;
  }
  params.delete("voucher");
  const cleanQuery = params.toString();
  history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
  await openHistoryVoucherRoom(code);
}

async function handleInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("trx") || consumePendingTransactionRoute();
  if (!code) return;
  if (!state.currentUser) {
    rememberPendingTransactionRoute(code);
    setAuthStatus("Silakan login / daftar dulu untuk membuka ruang transaksi dari link yang dibagikan. Jika Anda penjual, setelah login Anda akan diarahkan ke verifikasi identitas.", true);
    openLoginModal();
    return;
  }
  openWorkspaceSection("transactions");
  state.transactionScreen = "room";
  const normalizedCode = code.toUpperCase();
  if (elements.joinCode) elements.joinCode.value = normalizedCode;
  if (elements.mobileJoinCode) elements.mobileJoinCode.value = normalizedCode;
  await handleJoinTransaction();
}

function handleInitialRouteError(error) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("trx") || consumePendingTransactionRoute();
  const message = error instanceof Error ? error.message : "Gagal membuka link transaksi.";

  if (!state.currentUser && code) {
    rememberPendingTransactionRoute(code);
    setAuthStatus("Silakan login / daftar terlebih dahulu untuk masuk ke ruang transaksi.", true);
    openLoginModal();
    return;
  }

  console.error(error);
  setAuthStatus(message || "Gagal membuka link transaksi.", true);
}

function normalizeProviderName(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "telegram") return "Telegram";
  if (raw === "google" || raw === "gmail") return "Google";
  if (raw === "facebook") return "Facebook";
  if (raw === "discord") return "Discord";
  return "";
}

function formatHandle(username) {
  if (!username) return "-";
  if (username.includes("@") || username.includes("#")) return username;
  return `@${username}`;
}

function providerConnectionLabel(providerName) {
  return `${appConfig.providerLabels[providerName] || providerName} terhubung`;
}

function verificationStatusLabel(status, verified) {
  if (status === "pending") return "Menunggu admin meninjau (2-5 menit)";
  if (status === "revision_required") return "Perlu perbaikan";
  if (status === "verified") return "Terverifikasi";
  return "Belum verifikasi";
}

function verificationActionLabel(status, verified) {
  if (status === "pending") return "Menunggu Review Admin";
  if (status === "verified") return "Sudah Diverifikasi";
  if (status === "revision_required") return "Kirim Ulang Verifikasi";
  return "Kirim Verifikasi";
}

function verificationHelpText(status, verified) {
  if (status === "pending") {
    return "Admin sedang meninjau nama sesuai KTP, WhatsApp, foto KTP, dan video selfie Anda. Biasanya membutuhkan waktu sekitar 2-5 menit.";
  }
  if (status === "revision_required") {
    return `Admin meminta perbaikan data verifikasi: ${state.currentUser?.verificationNote || "Silakan perbaiki data lalu kirim ulang verifikasi."}`;
  }
  if (status === "verified") {
    return "Verifikasi sudah disetujui admin. Perubahan data hanya bisa dilakukan oleh admin atas permintaan pengguna.";
  }
  return "Unggah nama sesuai KTP, nomor KTP, WhatsApp aktif, foto KTP, dan video selfie memegang KTP. Setelah dikirim, data masuk ke antrian review admin sebelum akun bisa dipakai sebagai penjual.";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  if (!list.length) return "Menyiapkan file...";
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

function renderActivityTabs() {
  elements.activeRekberList.innerHTML = buildTransactionList(state.dashboard.activeTransactions, true);
  elements.historyRekberList.innerHTML = buildTransactionList(state.dashboard.completedTransactions, false);
  if (elements.historyChatList) {
    elements.historyChatList.innerHTML = buildChatHistoryRows(state.dashboard.chatHistory);
  }
  renderUnifiedTransactionHistory();
  bindOpenTransactionButtons();
  updateUserNotificationBadges();
}

const REKBER_HISTORY_LOGO = "/assets/rekberwe-logo-shield.png?v=7";

function getVoucherHistoryImage(order) {
  return order?.product?.displayImage || order?.product?.imageUrl || REKBER_HISTORY_LOGO;
}

function renderHistoryTransactionItem({
  isActive,
  imageUrl,
  imageAlt,
  badge,
  title,
  meta,
  dataAttr,
  dataValue,
  unreadCount = 0,
}) {
  return `
    <button
      type="button"
      class="history-transaction-item ${isActive ? "is-active" : ""}"
      data-${dataAttr}="${escapeAttribute(dataValue)}"
    >
      <span class="history-item-thumb">
        <img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(imageAlt)}" loading="lazy" />
      </span>
      <span class="history-item-copy">
        <span class="history-item-top">
          <span class="history-item-badge">${escapeHtml(badge)}</span>
          ${unreadCount ? `<span class="notif-badge list-notif-badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : ""}
        </span>
        <strong>${escapeHtml(title)}</strong>
        <span class="history-item-meta">${escapeHtml(meta)}</span>
      </span>
    </button>
  `;
}

function getVoucherOrdersForHistory() {
  return window.RekberVoucher?.getOrders?.() || [];
}

function isVoucherOrderActive(order) {
  return !["completed", "cancelled"].includes(String(order?.status || ""));
}

function renderUnifiedHistoryRow(row) {
  if (row.type === "voucher") {
    const order = row.order;
    const isActive = state.historySelection.type === "voucher" && state.historySelection.code === order.orderCode;
    return renderHistoryTransactionItem({
      isActive,
      imageUrl: getVoucherHistoryImage(order),
      imageAlt: order.product?.name || order.orderCode,
      badge: "Voucher",
      title: order.product?.name || order.orderCode,
      meta: `${order.orderCode} • ${order.statusLabel || order.status}`,
      dataAttr: "open-voucher-order",
      dataValue: order.orderCode,
      unreadCount: getVoucherUnreadCount(order),
    });
  }
  const transaction = row.transaction;
  const isActive = state.historySelection.type === "rekber" && state.historySelection.code === transaction.code;
  return renderHistoryTransactionItem({
    isActive,
    imageUrl: REKBER_HISTORY_LOGO,
    imageAlt: "RekberWE",
    badge: "Rekber",
    title: transaction.title,
    meta: `${transaction.code} • ${transaction.label}`,
    dataAttr: "open-rekber-history",
    dataValue: transaction.code,
    unreadCount: getUserUnreadCount(transaction),
  });
}

function sortHistoryRows(rows) {
  return [...rows].sort((a, b) => {
    const timeA = new Date(a.sortTime || 0).getTime();
    const timeB = new Date(b.sortTime || 0).getTime();
    return timeB - timeA;
  });
}

function renderUnifiedTransactionHistory() {
  const allRekber = Array.isArray(state.transactions) ? state.transactions : [];
  const activeRekber = allRekber.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return !["completed", "cancelled"].includes(status);
  });
  const completedRekber = allRekber.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return ["completed", "cancelled"].includes(status);
  });
  const voucherOrders = getVoucherOrdersForHistory();
  const activeVoucherRows = voucherOrders
    .filter((order) => isVoucherOrderActive(order))
    .map((order) => ({ type: "voucher", order, sortTime: order.updatedAt || order.createdAt || "" }));
  const historyVoucherRows = voucherOrders
    .filter((order) => !isVoucherOrderActive(order))
    .map((order) => ({ type: "voucher", order, sortTime: order.updatedAt || order.createdAt || "" }));
  const activeRekberRows = activeRekber.map((transaction) => ({
    type: "rekber",
    transaction: { ...transaction, label: "Aktif" },
    sortTime: transaction.updatedAt || transaction.createdAt || "",
  }));
  const historyRekberRows = completedRekber.map((transaction) => ({
    type: "rekber",
    transaction: { ...transaction, label: "Selesai" },
    sortTime: transaction.updatedAt || transaction.createdAt || "",
  }));
  const desktopRows = sortHistoryRows([
    ...activeRekberRows,
    ...historyRekberRows,
    ...activeVoucherRows,
    ...historyVoucherRows,
  ]);
  const mobileActiveRows = sortHistoryRows([...activeRekberRows, ...activeVoucherRows]);
  const mobileHistoryRows = sortHistoryRows([...historyRekberRows, ...historyVoucherRows]);

  const desktopHtml = desktopRows.map(renderUnifiedHistoryRow).join("")
    || "<p class='mini-note'>Belum ada riwayat transaksi Rekber/Voucher.</p>";
  const mobileActiveHtml = mobileActiveRows.map(renderUnifiedHistoryRow).join("")
    || "<p class='mini-note'>Belum ada transaksi aktif.</p>";
  const mobileHistoryHtml = mobileHistoryRows.map(renderUnifiedHistoryRow).join("")
    || "<p class='mini-note'>Belum ada riwayat transaksi selesai.</p>";

  if (elements.transactionUnifiedHistoryList) elements.transactionUnifiedHistoryList.innerHTML = desktopHtml;
  if (elements.mobileActiveTransactionsList) elements.mobileActiveTransactionsList.innerHTML = mobileActiveHtml;
  if (elements.mobileUnifiedHistoryList) elements.mobileUnifiedHistoryList.innerHTML = mobileHistoryHtml;
}

function updateUserNotificationBadges() {
  const unreadTransactions = getTotalUserUnreadCount();
  const totalNotifications = getTotalUserNotificationCount();
  const unreadSupport = getSupportUnreadCount();
  setButtonBadge(elements.transactionsNavButton, unreadTransactions);
  setButtonBadge(elements.sidebarTransactionsButton, unreadTransactions);
  setButtonBadge(elements.sidebarNotificationsButton, totalNotifications);
  setButtonBadge(elements.sidebarLiveChatButton, unreadSupport);
  setButtonBadge(elements.mobileNavTransactions, unreadTransactions);
  setButtonBadge(elements.mobileNavSupport, unreadSupport);
  if (elements.mobileHeaderNotificationsBadge) {
    const count = getTotalUserNotificationCount();
    if (count > 0) {
      elements.mobileHeaderNotificationsBadge.textContent = String(count > 99 ? "99+" : count);
      elements.mobileHeaderNotificationsBadge.classList.remove("hidden");
    } else {
      elements.mobileHeaderNotificationsBadge.classList.add("hidden");
    }
  }
}

function getTotalUserNotificationCount() {
  return buildUserNotifications().filter((item) => !item.read).length;
}

function buildUserNotifications() {
  const notifications = [];
  const activeTransactions = state.dashboard.activeTransactions || [];
  const completedTransactions = state.dashboard.completedTransactions || [];

  activeTransactions.forEach((transaction) => {
    const unreadCount = getUserUnreadCount(transaction);
    if (unreadCount > 0) {
      notifications.push({
        id: `msg-${transaction.code}`,
        title: `Pesan baru di ${transaction.title}`,
        text: `${unreadCount} pesan baru di transaksi ${transaction.code}.`,
        time: transaction.lastMessageAt || transaction.updatedAt || transaction.createdAt,
        type: "transaction",
        code: transaction.code,
        read: false,
      });
    }
  });

  getVoucherOrdersForHistory().forEach((order) => {
    const unreadCount = getVoucherUnreadCount(order);
    if (!unreadCount) return;
    notifications.push({
      id: `voucher-msg-${order.orderCode}`,
      title: `Update order ${order.product?.name || order.orderCode}`,
      text: `${unreadCount} pesan baru dari admin • ${order.orderCode}`,
      time: getVoucherLatestMessageTime(order),
      type: "voucher",
      code: order.orderCode,
      read: false,
    });
  });

  completedTransactions.slice(0, 8).forEach((transaction) => {
    notifications.push({
      id: `done-${transaction.code}`,
      title: "Transaksi selesai",
      text: `${transaction.title} (${transaction.code}) sudah selesai.`,
      time: transaction.completedAt || transaction.updatedAt || transaction.createdAt,
      type: "transaction",
      code: transaction.code,
      read: true,
    });
  });

  const supportUnread = getSupportUnreadCount();
  if (supportUnread > 0) {
    notifications.push({
      id: "support-unread",
      title: "Balasan baru dari admin",
      text: `${supportUnread} pesan baru di live chat support.`,
      time: getLatestSupportMessageTime(),
      type: "support",
      read: false,
    });
  }

  return notifications
    .filter((item) => item.time)
    .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
}

function renderNotifications() {
  if (!elements.notificationsList) return;
  const items = buildUserNotifications();
  elements.notificationsList.innerHTML = items.length
    ? items.map((item) => `
      <button type="button" class="notification-card ${item.read ? "" : "is-unread"}" data-notification-type="${escapeAttribute(item.type)}" data-transaction-code="${escapeAttribute(item.code || "")}">
        <div class="notification-card-top">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(formatDateTime(new Date(item.time)))}</span>
        </div>
        <p>${escapeHtml(item.text)}</p>
      </button>
    `).join("")
    : `
      <article class="notification-card">
        <strong>Belum ada notifikasi</strong>
        <p>Notifikasi transaksi, live chat, dan update status akan tampil di sini.</p>
      </article>
    `;

  document.querySelectorAll("[data-notification-type]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.notificationType === "support") {
        if (elements.supportWidgetPanel?.classList.contains("hidden")) {
          toggleSupportWidget();
        }
        return;
      }
      if (button.dataset.notificationType === "voucher") {
        await openHistoryVoucherRoom(button.dataset.transactionCode);
        return;
      }
      const code = String(button.dataset.transactionCode || "").trim().toUpperCase();
      if (!code) return;
      await openHistoryRekberRoom(code);
    });
  });
}

function renderTransactionScreen() {
  const inWorkspace = state.currentMemberView === "transactions";
  const section = state.workspaceSection || "dashboard";
  const showTransactionsSection = section === "transactions";
  const showDashboard = section === "dashboard";
  const showProfile = section === "profile";
  const showVerification = section === "verification";
  const showNotifications = section === "notifications";
  const showRekberRoom = inWorkspace && showTransactionsSection && state.transactionScreen === "room"
    && Boolean(state.activeTransaction) && state.historyChatType !== "voucher";
  const showVoucherRoom = inWorkspace && showTransactionsSection && state.transactionScreen === "room"
    && state.historyChatType === "voucher" && Boolean(state.historyVoucherOrder);
  const showRoom = showRekberRoom;
  const showAnyRoom = showRekberRoom || showVoucherRoom;
  const showTransactionEmpty = inWorkspace && showTransactionsSection && !showAnyRoom;
  const showMobileTransactionsView = isMobileViewport() && inWorkspace && showTransactionsSection && state.transactionScreen !== "room";

  const showSidebarLists = inWorkspace && !isMobileViewport() && showTransactionsSection && state.transactionScreen !== "room";

  elements.activeRekberSection?.classList.toggle("hidden", !showSidebarLists);
  elements.historyRekberSection?.classList.toggle("hidden", !showSidebarLists);
  elements.voucherOrdersSidebarSection?.classList.toggle("hidden", !showSidebarLists);
  elements.transactionRoomSection.classList.toggle("hidden", !inWorkspace);
  elements.workspaceDashboardView?.classList.toggle("hidden", !showDashboard);
  elements.workspaceDashboardView?.classList.toggle("mobile-create-open", Boolean(showDashboard && state.mobileCreateOpen));
  elements.workspaceProfileView?.classList.toggle("hidden", !showProfile);
  elements.workspaceVerificationView?.classList.toggle("hidden", !showVerification);
  elements.workspaceNotificationsView?.classList.toggle("hidden", !showNotifications);
  elements.workspaceMobileTransactionsView?.classList.toggle("hidden", !showMobileTransactionsView);
  elements.transactionRoom.classList.toggle("hidden", !showRekberRoom);
  elements.voucherHistoryRoom?.classList.toggle("hidden", !showVoucherRoom);
  elements.transactionRoomEmpty.classList.toggle("hidden", !showTransactionEmpty || showMobileTransactionsView);
  elements.joinRoleBox.classList.toggle("hidden", !showTransactionEmpty || !state.pendingJoinTransaction);
  elements.transactionShell?.classList.toggle("room-open", Boolean(showAnyRoom));
  elements.historyRoomToolbar?.classList.toggle("hidden", !showAnyRoom);
  if (elements.historyVoucherDisputeBtn) {
    const voucherOrder = showVoucherRoom ? state.historyVoucherOrder : null;
    const canDispute = voucherOrder
      && ["processing", "needs_verification", "completed"].includes(voucherOrder.status);
    elements.historyVoucherDisputeBtn.classList.toggle("hidden", !canDispute);
    elements.historyVoucherDisputeBtn.dataset.voucherDispute = canDispute
      ? voucherOrder.orderCode
      : "";
  }
  if (showTransactionEmpty) {
    renderUnifiedTransactionHistory();
  }

  if (showDashboard) {
    elements.roomPageTitle.textContent = "Dashboard";
    elements.roomPageSubtitle.textContent = isMobileViewport()
      ? "Gunakan aksi cepat atau tombol Buat untuk membuat transaksi dan beli voucher."
      : "Gunakan menu kiri untuk membuat transaksi, membuka ruang chat, dan mengelola akun Anda.";
  } else if (showProfile) {
    elements.roomPageTitle.textContent = "Akun Saya";
    elements.roomPageSubtitle.textContent = "Kelola profil dan social media tanpa meninggalkan workspace.";
  } else if (showVerification) {
    elements.roomPageTitle.textContent = "Verifikasi";
    elements.roomPageSubtitle.textContent = "Lengkapi verifikasi identitas penjual dan WhatsApp OTP di halaman ini.";
  } else if (showNotifications) {
    elements.roomPageTitle.textContent = "Notifikasi";
    elements.roomPageSubtitle.textContent = "Semua pemberitahuan transaksi dan live chat tampil di sini.";
  } else if (!showAnyRoom) {
    elements.roomPageTitle.textContent = "Riwayat Transaksi";
    elements.roomPageSubtitle.textContent = "Klik salah satu transaksi di bawah untuk masuk ke ruang chat.";
  }

  syncRoomModeBodyClass();
}

function openTransactionListView() {
  exitRoomMode();
  state.transactionScreen = "list";
  state.pendingJoinTransaction = null;
  state.historyChatType = null;
  state.historyVoucherOrder = null;
  state.historySelection = { type: "", code: "" };
  state.activeTransaction = null;
  window.RekberVoucher?.clearHistoryRoom?.();
  renderTransactionScreen();
  scrollWorkspaceTarget("transactions-panel");
}

function stopRoomRefresh() {
  if (roomRefreshTimer) {
    clearInterval(roomRefreshTimer);
    roomRefreshTimer = null;
  }
}

function startRoomRefresh() {
  stopRoomRefresh();
  roomRefreshTimer = setInterval(async () => {
    if (!state.currentUser || !state.activeTransaction || state.transactionScreen !== "room") return;
    try {
      const payload = await fetchJson(`/api/transactions/${state.activeTransaction.code}`);
      state.activeTransaction = payload.transaction;
      renderRoom(state.activeTransaction);
      await refreshTransactions();
      await refreshDashboard();
      renderActivityTabs();
    } catch (error) {
      console.error("Refresh room gagal:", error);
    }
  }, 1200);
}

function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function initResizableLayouts() {
  document.querySelectorAll(".panel-resizer[data-resizer]").forEach((handle) => {
    const container = document.getElementById(handle.dataset.resizer);
    if (!container) return;

    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = parseFloat(getComputedStyle(container).getPropertyValue("--sidebar-width")) || 400;

      const onMove = (moveEvent) => {
        const nextWidth = Math.min(680, Math.max(260, startWidth + (moveEvent.clientX - startX)));
        container.style.setProperty("--sidebar-width", `${nextWidth}px`);
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

function setupLiveEvents() {
  if (liveEventSource) {
    liveEventSource.close();
    liveEventSource = null;
  }
  if (userPresenceTimer) {
    window.clearInterval(userPresenceTimer);
    userPresenceTimer = null;
  }
  if (presenceTickTimer) {
    window.clearInterval(presenceTickTimer);
    presenceTickTimer = null;
  }
  if (!state.currentUser) return;

  liveEventSource = new EventSource("/api/events");
  fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getUserHeartbeatBody()) }).catch(() => {});
  userPresenceTimer = window.setInterval(() => {
    fetchJson("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(getUserHeartbeatBody()) }).catch(() => {});
  }, PRESENCE_HEARTBEAT_MS);
  startPresenceTick();
  liveEventSource.onmessage = async (event) => {
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
          renderRoomPresence(state.activeTransaction);
        }
      }

      if (payload.type === "presence_updated" && payload.userId) {
        state.transactions = state.transactions.map((item) => applyPresenceToTransaction(item, payload.userId, payload.presence, payload.adminPresence));
        if (state.activeTransaction) {
          state.activeTransaction = applyPresenceToTransaction(state.activeTransaction, payload.userId, payload.presence, payload.adminPresence);
          renderRoomPresence(state.activeTransaction);
        }
      }
      if (payload.type === "transaction_updated" && payload.transaction) {
        if (!previousTransaction) {
          shouldPlayTransactionSound = true;
        } else {
          const previousCount = previousTransaction.messages?.length || 0;
          const nextCount = payload.transaction.messages?.length || 0;
          const lastMessage = payload.transaction.messages?.[nextCount - 1];
          if (nextCount > previousCount && lastMessage && lastMessage.senderUserId !== state.currentUser.id) {
            shouldPlayChatSound = true;
          }
        }
      }

      if (payload.type === "support_updated" && payload.thread) {
        const previousCount = state.supportThread?.messages?.length || 0;
        const nextCount = payload.thread.messages?.length || 0;
        const lastMessage = payload.thread.messages?.[nextCount - 1];
        state.supportThread = payload.thread;
        renderSupportWidget();
        if (nextCount > previousCount && lastMessage?.senderRole === "admin") {
          playUserNotificationSound("chat");
        }
      }

      if (payload.type === "support_typing_updated" && payload.threadId) {
        if (state.supportThread?.id === payload.threadId) {
          state.supportThread = { ...state.supportThread, typing: payload.typing || {} };
          renderSupportWidgetPresence();
        }
      }

      if (payload.type === "voucher_order_updated") {
        if (payload.deleted) {
          const deletedCode = String(payload.orderCode || payload.code || "").trim().toUpperCase();
          if (deletedCode && state.historyVoucherOrder?.orderCode === deletedCode) {
            openTransactionListView();
          }
        }
        if (payload.order) {
          const previousOrder = getVoucherOrdersForHistory().find((item) => item.orderCode === payload.order.orderCode);
          const previousCount = previousOrder?.messages?.length || 0;
          const nextCount = payload.order.messages?.length || 0;
          const lastMessage = payload.order.messages?.[nextCount - 1];
          if (nextCount > previousCount && lastMessage?.senderRole === "admin") {
            shouldPlayChatSound = true;
          }
          if (previousOrder && previousOrder.status !== payload.order.status) {
            if (["needs_verification", "completed", "processing", "awaiting_confirmation"].includes(payload.order.status)) {
              shouldPlayChatSound = true;
            }
          }
        }
        window.RekberVoucher?.handleLiveEvent?.(payload);
      }

      if (payload.type === "verification_updated" && payload.user && payload.user.id === state.currentUser?.id) {
        const previousStatus = state.currentUser?.verificationStatus;
        const previousBanned = Boolean(state.currentUser?.banned);
        state.currentUser = payload.user;
        state.dashboard.profile = payload.user;
        renderProfile();
        renderCurrentUser();
        if (payload.user.verificationStatus === "verified" && previousStatus !== "verified") {
          playUserNotificationSound("transaction");
          const autoCodes = Array.isArray(payload.autoJoinedTransactionCodes) ? payload.autoJoinedTransactionCodes : [];
          const joined = await tryCompletePendingSellerJoin(autoCodes[0] || getPendingSellerJoinCode());
          if (!joined) {
            setAuthStatus("Verifikasi Anda sudah disetujui admin. Akun penjual sekarang aktif.");
          }
        }
        if (payload.user.verificationStatus === "revision_required" && previousStatus !== "revision_required") {
          playUserNotificationSound("chat");
          window.alert(`Admin meminta perbaikan verifikasi:\n\n${payload.user.verificationNote || "Silakan perbaiki data verifikasi Anda."}`);
        }
        if (payload.user.banned && !previousBanned) {
          window.alert(`Akun Anda diblokir admin.\n\nAlasan: ${payload.user.bannedReason || "Hubungi admin untuk informasi lebih lanjut."}`);
        }
      }

      if (payload.type === "transaction_deleted" && state.activeTransaction?.code === payload.code) {
        state.activeTransaction = null;
        state.transactionScreen = "list";
      }

      if (payload.type === "transaction_updated" && payload.transaction && state.activeTransaction?.code === payload.code) {
        state.activeTransaction = payload.transaction;
        if (state.transactionScreen === "room") {
          renderRoom(state.activeTransaction);
        }
      }

      await refreshTransactions();
      await refreshDashboard();
      renderActivityTabs();
      renderProfile();
      renderMemberVisibility();
      if (shouldPlayTransactionSound) {
        playUserNotificationSound("transaction");
      } else if (shouldPlayChatSound) {
        playUserNotificationSound("chat");
      }
    } catch (error) {
      console.error("Event stream user gagal:", error);
    }
  };
  liveEventSource.addEventListener("error", () => {
    if (userPresenceTimer) window.clearInterval(userPresenceTimer);
    userPresenceTimer = null;
  });
}

window.renderPublicFeeList = renderPublicFeeList;
window.renderTermsAndConditions = renderTermsAndConditions;
window.openHistoryVoucherRoom = openHistoryVoucherRoom;

