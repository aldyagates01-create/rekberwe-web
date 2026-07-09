(function initRekberI18n(global) {
  const STORAGE_KEY = "rekberwe_locale";
  const DEFAULT_LOCALE = "id";

  const MESSAGES = {
    id: {
      "lang.label": "Bahasa",
      "lang.id": "Indonesia",
      "lang.en": "English",
      "lang.zh": "中文",
      "menu.label": "Menu",
      "menu.dashboard": "Dashboard",
      "menu.transactions": "Riwayat Transaksi",
      "menu.profile": "Akun Saya",
      "menu.notifications": "Notifikasi",
      "menu.verification": "Verifikasi",
      "menu.help": "Butuh bantuan?",
      "menu.live_chat": "Live Chat Support",
      "menu.user_guide": "Panduan Penggunaan",
      "menu.create_transaction": "Buat Transaksi",
      "menu.join_code": "Masukkan kode transaksi",
      "menu.join_button": "Masuk transaksi",
      "voucher.catalog_eyebrow": "Marketplace",
      "voucher.catalog_title": "Beli Voucher / Gametime",
      "voucher.catalog_note": "Pilih produk digital, transfer ke rekening admin, lalu upload bukti pembayaran.",
      "voucher.catalog_search": "Cari produk voucher / gametime...",
      "voucher.buy_now": "Beli Sekarang",
      "voucher.no_match": "Tidak ada produk yang cocok dengan pencarian.",
      "voucher.no_active": "Belum ada produk aktif.",
      "room.back_history": "Kembali ke Riwayat Transaksi",
      "room.dispute": "Laporkan Masalah / Ajukan Sengketa",
      "voucher.transfer_to": "Transfer ke rekening admin",
      "voucher.upload_proof": "Upload bukti transfer",
      "voucher.send": "Kirim",
      "voucher.copy": "Copy",
      "voucher.copied": "Sudah di copy",
      "voucher.open_qris": "Buka QRIS",
      "voucher.account_holder": "a.n",
      "chat.placeholder": "Tulis pesan ke admin...",
      "common.loading": "Memuat...",
      "common.logout": "Keluar",
    },
    en: {
      "lang.label": "Language",
      "lang.id": "Indonesia",
      "lang.en": "English",
      "lang.zh": "中文",
      "menu.label": "Menu",
      "menu.dashboard": "Dashboard",
      "menu.transactions": "Transaction History",
      "menu.profile": "My Account",
      "menu.notifications": "Notifications",
      "menu.verification": "Verification",
      "menu.help": "Need help?",
      "menu.live_chat": "Live Chat Support",
      "menu.user_guide": "User Guide",
      "menu.create_transaction": "Create Transaction",
      "menu.join_code": "Enter transaction code",
      "menu.join_button": "Open transaction",
      "voucher.catalog_eyebrow": "Marketplace",
      "voucher.catalog_title": "Buy Voucher / Gametime",
      "voucher.catalog_note": "Choose a digital product, transfer to the admin account, then upload your payment proof.",
      "voucher.catalog_search": "Search voucher / gametime products...",
      "voucher.buy_now": "Buy Now",
      "voucher.no_match": "No products match your search.",
      "voucher.no_active": "No active products yet.",
      "room.back_history": "Back to Transaction History",
      "room.dispute": "Report Issue / Open Dispute",
      "voucher.transfer_to": "Transfer to admin account",
      "voucher.upload_proof": "Upload payment proof",
      "voucher.send": "Send",
      "voucher.copy": "Copy",
      "voucher.copied": "Copied",
      "voucher.open_qris": "Open QRIS",
      "voucher.account_holder": "Account name",
      "chat.placeholder": "Write a message to admin...",
      "common.loading": "Loading...",
      "common.logout": "Log out",
    },
    zh: {
      "lang.label": "语言",
      "lang.id": "Indonesia",
      "lang.en": "English",
      "lang.zh": "中文",
      "menu.label": "菜单",
      "menu.dashboard": "仪表板",
      "menu.transactions": "交易记录",
      "menu.profile": "我的账户",
      "menu.notifications": "通知",
      "menu.verification": "验证",
      "menu.help": "需要帮助？",
      "menu.live_chat": "在线客服",
      "menu.user_guide": "使用指南",
      "menu.create_transaction": "创建交易",
      "menu.join_code": "输入交易代码",
      "menu.join_button": "进入交易",
      "voucher.catalog_eyebrow": "商城",
      "voucher.catalog_title": "购买点券 / 游戏时长",
      "voucher.catalog_note": "选择数字商品，转账到管理员账户，然后上传付款凭证。",
      "voucher.catalog_search": "搜索点券 / 游戏时长商品...",
      "voucher.buy_now": "立即购买",
      "voucher.no_match": "没有符合搜索条件的商品。",
      "voucher.no_active": "暂无上架商品。",
      "room.back_history": "返回交易记录",
      "room.dispute": "报告问题 / 申请争议",
      "voucher.transfer_to": "转账至管理员账户",
      "voucher.upload_proof": "上传付款凭证",
      "voucher.send": "发送",
      "voucher.copy": "复制",
      "voucher.copied": "已复制",
      "voucher.open_qris": "打开 QRIS",
      "voucher.account_holder": "户名",
      "chat.placeholder": "给管理员留言...",
      "common.loading": "加载中...",
      "common.logout": "退出登录",
    },
  };

  let currentLocale = DEFAULT_LOCALE;

  function normalizeLocale(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "en" || raw.startsWith("en")) return "en";
    if (raw === "zh" || raw.startsWith("zh")) return "zh";
    return "id";
  }

  function t(key, fallback = "") {
    const dict = MESSAGES[currentLocale] || MESSAGES[DEFAULT_LOCALE];
    return dict[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? fallback || key;
  }

  function getLocale() {
    return currentLocale;
  }

  function setLocale(locale, options = {}) {
    currentLocale = normalizeLocale(locale);
    try {
      localStorage.setItem(STORAGE_KEY, currentLocale);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = currentLocale === "zh" ? "zh-CN" : currentLocale;
    applyTranslations();
    document.querySelectorAll(".language-switcher").forEach((select) => {
      if (select.value !== currentLocale) select.value = currentLocale;
    });
    if (!options.silent) {
      global.dispatchEvent(new CustomEvent("rekber:locale-changed", { detail: { locale: currentLocale } }));
    }
  }

  function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      const value = t(key, node.textContent || "");
      if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
        if (node.hasAttribute("placeholder")) node.placeholder = value;
        else node.value = value;
      } else {
        node.textContent = value;
      }
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (key) node.placeholder = t(key, node.placeholder || "");
    });
    root.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria");
      if (key) node.setAttribute("aria-label", t(key, node.getAttribute("aria-label") || ""));
    });
  }

  function initI18n() {
    let saved = DEFAULT_LOCALE;
    try {
      saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE;
    } catch {
      saved = DEFAULT_LOCALE;
    }
    setLocale(saved, { silent: true });
    document.querySelectorAll(".language-switcher").forEach((select) => {
      select.addEventListener("change", () => setLocale(select.value));
    });
  }

  global.RekberI18n = {
    t,
    getLocale,
    setLocale,
    applyTranslations,
    initI18n,
  };
  global.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initI18n);
  } else {
    initI18n();
  }
})(window);
