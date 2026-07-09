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
      "voucher.terms_title": "Syarat dan ketentuan pembelian voucher / gametime",
      "voucher.terms_empty": "Syarat voucher belum diatur admin.",
      "voucher.step_order_created": "Order Dibuat",
      "voucher.step_awaiting_payment": "Menunggu Pembayaran",
      "voucher.step_awaiting_confirmation": "Menunggu Konfirmasi",
      "voucher.step_processing": "Sedang Diproses",
      "voucher.step_completed": "Selesai",
      "voucher.order_detail": "Detail Pesanan",
      "voucher.make_payment": "Lakukan Pembayaran",
      "voucher.transfer_note": "Transfer sesuai nominal ke rekening admin berikut",
      "voucher.select_bank": "Pilih bank",
      "voucher.total_transfer": "Total yang harus ditransfer",
      "voucher.exact_amount_note": "Pastikan nominal transfer sama persis",
      "voucher.upload_proof_title": "Upload Bukti Pembayaran",
      "voucher.upload_dropzone": "Klik atau drag file ke sini",
      "voucher.upload_hint": "PNG, JPG, JPEG, Max 5MB",
      "voucher.privacy_note": "Bukti pembayaran hanya dapat dilihat oleh admin.",
      "voucher.cancel_order": "Batalkan transaksi",
      "voucher.upload_submit": "Upload & Kirim Bukti",
      "voucher.back_catalog": "Kembali ke Katalog",
      "voucher.account_data": "Data akun",
      "voucher.account_fix": "Perbaiki data akun",
      "voucher.account_submit": "Kirim data akun",
      "voucher.account_submit_fix": "Kirim perbaikan data akun",
      "voucher.account_guide_title": "Langkah wajib berikutnya",
      "voucher.account_guide_body": "Isi email dan password akun di formulir di bawah ini agar admin dapat memproses order Anda.",
      "voucher.account_email_placeholder": "Email akun",
      "voucher.account_password_placeholder": "Password",
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
      "voucher.terms_title": "Voucher / gametime purchase terms",
      "voucher.terms_empty": "Voucher terms have not been configured by admin.",
      "voucher.step_order_created": "Order Created",
      "voucher.step_awaiting_payment": "Awaiting Payment",
      "voucher.step_awaiting_confirmation": "Awaiting Confirmation",
      "voucher.step_processing": "Processing",
      "voucher.step_completed": "Completed",
      "voucher.order_detail": "Order Detail",
      "voucher.make_payment": "Make Payment",
      "voucher.transfer_note": "Transfer the exact amount to the admin account below",
      "voucher.select_bank": "Select bank",
      "voucher.total_transfer": "Total amount to transfer",
      "voucher.exact_amount_note": "Make sure the transfer amount is exact",
      "voucher.upload_proof_title": "Upload Payment Proof",
      "voucher.upload_dropzone": "Click or drag file here",
      "voucher.upload_hint": "PNG, JPG, JPEG, Max 5MB",
      "voucher.privacy_note": "Payment proof can only be viewed by admin.",
      "voucher.cancel_order": "Cancel transaction",
      "voucher.upload_submit": "Upload & Send Proof",
      "voucher.back_catalog": "Back to Catalog",
      "voucher.account_data": "Account data",
      "voucher.account_fix": "Fix account data",
      "voucher.account_submit": "Submit account data",
      "voucher.account_submit_fix": "Submit account correction",
      "voucher.account_guide_title": "Required next step",
      "voucher.account_guide_body": "Fill in the account email and password in the form below so admin can process your order.",
      "voucher.account_email_placeholder": "Account email",
      "voucher.account_password_placeholder": "Password",
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
      "voucher.terms_title": "点券 / 游戏时长购买条款",
      "voucher.terms_empty": "管理员尚未设置点券条款。",
      "voucher.step_order_created": "订单已创建",
      "voucher.step_awaiting_payment": "等待付款",
      "voucher.step_awaiting_confirmation": "等待确认",
      "voucher.step_processing": "处理中",
      "voucher.step_completed": "已完成",
      "voucher.order_detail": "订单详情",
      "voucher.make_payment": "进行付款",
      "voucher.transfer_note": "请按订单金额转账到以下管理员账户",
      "voucher.select_bank": "选择银行",
      "voucher.total_transfer": "应转账总额",
      "voucher.exact_amount_note": "请确保转账金额完全一致",
      "voucher.upload_proof_title": "上传付款凭证",
      "voucher.upload_dropzone": "点击或拖拽文件到此处",
      "voucher.upload_hint": "PNG, JPG, JPEG, 最大 5MB",
      "voucher.privacy_note": "付款凭证仅管理员可见。",
      "voucher.cancel_order": "取消交易",
      "voucher.upload_submit": "上传并发送凭证",
      "voucher.back_catalog": "返回目录",
      "voucher.account_data": "账户数据",
      "voucher.account_fix": "修正账户数据",
      "voucher.account_submit": "提交账户数据",
      "voucher.account_submit_fix": "提交修正数据",
      "voucher.account_guide_title": "必填下一步",
      "voucher.account_guide_body": "请在下方表单填写账户邮箱和密码，以便管理员处理您的订单。",
      "voucher.account_email_placeholder": "账户邮箱",
      "voucher.account_password_placeholder": "密码",
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
    return dict[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? (fallback || key);
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

  let languageSwitchBound = false;

  function bindLanguageSwitchers() {
    if (languageSwitchBound) return;
    languageSwitchBound = true;
    document.addEventListener("change", (event) => {
      const select = event.target.closest(".language-switcher");
      if (!select) return;
      setLocale(select.value);
    });
  }

  function initI18n() {
    let saved = DEFAULT_LOCALE;
    try {
      saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE;
    } catch {
      saved = DEFAULT_LOCALE;
    }
    bindLanguageSwitchers();
    setLocale(saved, { silent: true });
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
