export const VOUCHER_ORDER_STATUSES = {
  awaiting_payment: "Menunggu Pembayaran",
  awaiting_confirmation: "Menunggu Konfirmasi Admin",
  manual_pending: "Manual - Menunggu Proses",
  processing: "Diproses",
  needs_verification: "Butuh Verifikasi",
  completed: "Selesai",
  dispute: "Sengketa",
  cancelled: "Dibatalkan",
};

export const MANUAL_VOUCHER_ORDER_SOURCE = "manual";

export const VOUCHER_CANCELLABLE_STATUSES = new Set([
  "awaiting_payment",
  "awaiting_confirmation",
  "processing",
]);

export const DEFAULT_VOUCHER_PRODUCT_IMAGE = "/assets/rekberwe-logo-shield.png?v=7";

export function formatVoucherAccountSubmissionMessage(accounts = [], quantity = 1, wasRevision = false) {
  const normalized = Array.isArray(accounts) ? accounts.slice(0, Math.max(1, Number(quantity || 1))) : [];
  const header = wasRevision
    ? `Data akun subscription (${Math.max(1, Number(quantity || 1))} pcs) telah diperbarui.`
    : `Data akun subscription (${Math.max(1, Number(quantity || 1))} pcs) telah dikirim.`;
  const details = normalized.map((item, index) => {
    const email = String(item?.email || "").trim();
    const password = String(item?.password || "").trim();
    return `Akun ${index + 1}\nEmail: ${email}\nPassword: ${password}`;
  }).join("\n\n");
  return details ? `${header}\n\n${details}` : header;
}

export function stripPublicVoucherProduct(product) {
  if (!product) return product;
  const { costPrice, ...publicProduct } = product;
  return publicProduct;
}

export function stripPublicVoucherProducts(products = []) {
  return products.map(stripPublicVoucherProduct);
}

export function stripPublicVoucherOrder(order) {
  if (!order) return order;
  const {
    costPrice,
    accountEmail,
    accountPassword,
    accountAccounts,
    ...publicOrder
  } = order;
  const requiresAccountLogin = Boolean(order.product?.requiresAccountLogin);
  const canRevealCredentials = requiresAccountLogin && [
    "awaiting_confirmation",
    "processing",
    "needs_verification",
    "dispute",
    "completed",
  ].includes(order.status);
  return {
    ...publicOrder,
    accountEmail: canRevealCredentials ? accountEmail : "",
    accountPassword: canRevealCredentials ? accountPassword : "",
    accountAccounts: canRevealCredentials
      ? (Array.isArray(accountAccounts) ? accountAccounts : [])
      : [],
    product: stripPublicVoucherProduct(order.product),
  };
}

export function voucherOrderForViewer(order, viewer = {}) {
  if (!order) return order;
  if (viewer.isAdmin) return order;
  return stripPublicVoucherOrder(order);
}

export function stripPublicVoucherOrders(orders = []) {
  return orders.map(stripPublicVoucherOrder);
}

export function stripVoucherOrderSummary(order) {
  const stripped = stripPublicVoucherOrder(order);
  return {
    ...stripped,
    accountEmail: "",
    accountPassword: "",
    accountAccounts: [],
  };
}

export function stripVoucherOrderSummaries(orders = []) {
  return orders.map(stripVoucherOrderSummary);
}

export function defaultVoucherPaymentSettings() {
  return {
    bankName: "",
    bankNumber: "",
    bankHolder: "",
    qrisUrl: "",
    instructions: [
      "Transfer sesuai nominal order.",
      "Upload bukti pembayaran setelah transfer.",
      "Order diproses setelah admin mengonfirmasi pembayaran.",
    ].join("\n"),
    termsAndConditions: [
      "Pembayaran voucher/gametime wajib sesuai nominal order.",
      "Proses order dimulai setelah admin mengonfirmasi bukti transfer.",
      "Data akun subscription wajib dikirim jika produk membutuhkan login akun.",
      "Sengketa diajukan melalui chat order sebelum status selesai.",
    ].join("\n"),
  };
}

function normalizeVoucherPaymentBank(bank = {}, index = 0) {
  const name = String(bank.name || bank.bankName || "").trim();
  const number = String(bank.number || bank.bankNumber || "").trim();
  const holder = String(bank.holder || bank.bankHolder || "").trim();
  const logoUrl = String(bank.logoUrl || bank.logo || "").trim();
  const id = String(bank.id || bank.bankId || "").trim() || `bank-${index + 1}`;
  return { id, name, number, holder, logoUrl };
}

export function normalizeVoucherPaymentSettings(input = {}) {
  const raw = input || {};
  let banks = Array.isArray(raw.banks)
    ? raw.banks.map((bank, index) => normalizeVoucherPaymentBank(bank, index)).filter((bank) => bank.name || bank.number)
    : [];
  if (!banks.length && (raw.bankName || raw.bankNumber)) {
    banks = [normalizeVoucherPaymentBank({
      id: "bank-1",
      name: raw.bankName,
      number: raw.bankNumber,
      holder: raw.bankHolder,
      logoUrl: raw.bankLogoUrl || "",
    }, 0)];
  }
  const primary = banks[0] || {};
  return {
    bankName: primary.name || String(raw.bankName || "").trim(),
    bankNumber: primary.number || String(raw.bankNumber || "").trim(),
    bankHolder: primary.holder || String(raw.bankHolder || "").trim(),
    banks,
    qrisUrl: String(raw.qrisUrl || "").trim(),
    instructions: String(raw.instructions || defaultVoucherPaymentSettings().instructions).trim()
      || defaultVoucherPaymentSettings().instructions,
    termsAndConditions: String(raw.termsAndConditions || defaultVoucherPaymentSettings().termsAndConditions).trim()
      || defaultVoucherPaymentSettings().termsAndConditions,
  };
}

export function getVoucherPaymentBanks(payment = {}) {
  const normalized = normalizeVoucherPaymentSettings(payment);
  if (normalized.banks.length) return normalized.banks;
  if (!normalized.bankName && !normalized.bankNumber) return [];
  return [{
    id: "bank-1",
    name: normalized.bankName,
    number: normalized.bankNumber,
    holder: normalized.bankHolder,
    logoUrl: "",
  }];
}

export function normalizeVoucherExpenseItem(item = {}, index = 0) {
  const expenseDate = String(item.expenseDate || item.date || "").trim().slice(0, 10);
  const amount = Math.max(0, Math.round(Number(item.amount || 0)));
  const description = String(item.description || item.note || "").trim();
  const id = String(item.id || `exp-${index + 1}`).trim();
  if (!expenseDate || amount <= 0) return null;
  return { id, expenseDate, amount, description };
}

export function normalizeVoucherExpenses(raw = []) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw
    .map((item, index) => normalizeVoucherExpenseItem(item, index))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.amount - a.amount);
}

export function filterVoucherExpensesByDateRange(expenses = [], fromDate = "", toDate = "") {
  const from = String(fromDate || "").trim();
  const to = String(toDate || "").trim();
  if (!from || !to) return [];
  return expenses.filter((item) => item.expenseDate >= from && item.expenseDate <= to);
}

export function createVoucherExpenseId() {
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getVoucherStatusLabel(status) {
  return VOUCHER_ORDER_STATUSES[status] || status || "-";
}

export function isManualVoucherOrder(order) {
  return String(order?.orderSource || "").trim() === MANUAL_VOUCHER_ORDER_SOURCE;
}

export function getVoucherBuyerDisplayName(order) {
  if (!order) return "-";
  if (isManualVoucherOrder(order)) {
    const telegram = String(order.buyerTelegram || "").trim().replace(/^@+/, "");
    if (telegram) return `@${telegram} (Manual)`;
    return "Manual";
  }
  return order.user?.displayName || "-";
}

export function buildManualVoucherCopyText(order) {
  const accounts = Array.isArray(order?.accountAccounts) ? order.accountAccounts : [];
  const email = String(order?.accountEmail || accounts[0]?.email || "-").trim();
  const password = String(order?.accountPassword || accounts[0]?.password || "-").trim();
  const productName = String(order?.product?.name || "-").trim();
  return `email : ${email}\npassword : ${password}\nvoucher yang dibeli : ${productName}`;
}

export function applyVoucherBestsellerFlags(products = [], salesByProductId = new Map()) {
  const counts = products.map((product) => Number(salesByProductId.get(Number(product.id)) || 0));
  const maxSales = counts.length ? Math.max(...counts) : 0;
  return products.map((product) => {
    const salesCount = Number(salesByProductId.get(Number(product.id)) || 0);
    return {
      ...product,
      salesCount,
      isBestseller: maxSales > 0 && salesCount === maxSales,
    };
  });
}

function parseTimeToMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getWibMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((item) => item.type === "hour")?.value || 0);
  const minute = Number(parts.find((item) => item.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function getWibYmd(date = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).split("-");
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

function buildWibDateTime(year, month, day, hour, minute) {
  const pad = (value) => String(value).padStart(2, "0");
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+07:00`);
}

export function getNextProductReadyAt(product, now = new Date()) {
  if (!product?.isActive || product.readyMode !== "schedule") return null;

  const start = parseTimeToMinutes(product.readyStart);
  const end = parseTimeToMinutes(product.readyEnd);
  if (start === null || end === null) return null;

  const current = getWibMinutes(now);
  const ready = start <= end
    ? current >= start && current <= end
    : current >= start || current <= end;
  if (ready) return null;

  const { year, month, day } = getWibYmd(now);
  const startHour = Math.floor(start / 60);
  const startMinute = start % 60;
  let dayOffset = 0;

  if (start <= end && current > end) {
    dayOffset = 1;
  }

  const target = buildWibDateTime(year, month, day, startHour, startMinute);
  if (dayOffset) {
    target.setTime(target.getTime() + (dayOffset * 24 * 60 * 60 * 1000));
  }
  return target.toISOString();
}

export function shouldRestoreVoucherProductStock(order) {
  if (!order) return false;
  const status = String(order.status || "");
  return status !== "completed" && status !== "cancelled";
}

export function getVoucherOrderStockQuantity(order) {
  return Math.max(1, Number(order?.quantity || 1));
}

export function getProductReadyState(product, now = new Date()) {
  if (!product?.isActive) {
    return {
      ready: false,
      label: "Nonaktif",
      scheduleLabel: "Produk nonaktif",
      canPurchase: false,
      nextReadyAt: null,
    };
  }

  if (Number(product.stock) === 0) {
    return {
      ready: false,
      label: "Stok Habis",
      scheduleLabel: "Stok habis",
      canPurchase: false,
      nextReadyAt: null,
    };
  }

  if (product.readyMode !== "schedule") {
    return {
      ready: true,
      label: "Ready 24 Jam",
      scheduleLabel: "Ready 24 Jam",
      canPurchase: true,
      nextReadyAt: null,
    };
  }

  const start = parseTimeToMinutes(product.readyStart);
  const end = parseTimeToMinutes(product.readyEnd);
  if (start === null || end === null) {
    return {
      ready: false,
      label: "Belum ready",
      scheduleLabel: "Jadwal ready belum diatur",
      canPurchase: false,
      nextReadyAt: null,
    };
  }

  const current = getWibMinutes(now);
  const scheduleLabel = `Ready jam ${product.readyStart} - ${product.readyEnd} WIB`;
  const ready = start <= end
    ? current >= start && current <= end
    : current >= start || current <= end;

  return {
    ready,
    label: ready ? "Ready sekarang" : "Belum ready",
    scheduleLabel,
    canPurchase: ready,
    nextReadyAt: ready ? null : getNextProductReadyAt(product, now),
  };
}

export function canCancelVoucherOrder(order, actorIsAdmin = false) {
  if (!order) return false;
  if (order.status === "completed") return false;
  if (order.status === "cancelled") return false;
  if (order.status === "dispute") return actorIsAdmin;
  return VOUCHER_CANCELLABLE_STATUSES.has(order.status);
}

export function canDisputeVoucherOrder(order) {
  if (!order) return false;
  return ["processing", "needs_verification", "completed"].includes(order.status);
}

export function generateVoucherOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `VGT-${suffix}`;
}

export function parseVoucherAccountAccounts(row = {}) {
  try {
    const parsed = JSON.parse(row.account_accounts || "[]");
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((item, index) => ({
        email: String(item?.email || item?.accountEmail || "").trim(),
        password: String(item?.password || item?.accountPassword || "").trim(),
        label: String(item?.label || `Akun ${index + 1}`).trim() || `Akun ${index + 1}`,
      }));
    }
  } catch {
    // fall through to legacy single-account fields
  }
  const email = String(row.account_email || row.accountEmail || "").trim();
  if (!email) return [];
  return [{
    email,
    password: String(row.account_password || row.accountPassword || "").trim(),
    label: "Akun 1",
  }];
}

export function hasCompleteVoucherAccountCredentials(order) {
  if (!order?.product?.requiresAccountLogin) return true;
  const quantity = Math.max(1, Number(order.quantity || 1));
  const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
  if (accounts.length < quantity) return false;
  return accounts.slice(0, quantity).every((item) => item.email && item.email.includes("@") && item.password);
}

export function normalizeVoucherAccountPayload(accounts = [], quantity = 1) {
  const list = Array.isArray(accounts) ? accounts : [];
  if (list.length !== quantity) {
    throw new Error(`Jumlah akun harus ${quantity} sesuai jumlah pembelian.`);
  }
  return list.map((item, index) => {
    const email = String(item?.email || item?.accountEmail || "").trim();
    const password = String(item?.password || item?.accountPassword || "").trim();
    if (!email || !email.includes("@")) {
      throw new Error(`Email akun ${index + 1} wajib diisi dengan format yang valid.`);
    }
    if (!password) {
      throw new Error(`Password akun ${index + 1} wajib diisi.`);
    }
    return {
      email,
      password,
      label: `Akun ${index + 1}`,
    };
  });
}

export function validateVoucherOrderAction(order, action, actorIsAdmin) {
  if (!order) return { ok: false, message: "Order tidak ditemukan." };
  switch (action) {
    case "submit_payment":
      if (order.status === "awaiting_payment") return { ok: true };
      if (order.status === "awaiting_confirmation" && order.proofRevisionRequested) return { ok: true };
      if (order.status === "awaiting_confirmation") {
        return { ok: false, message: "Ganti bukti transfer hanya bisa setelah admin meminta." };
      }
      return { ok: false, message: "Order tidak lagi menunggu pembayaran." };
    case "process":
      if (!actorIsAdmin) return { ok: false, message: "Hanya admin yang bisa memproses order." };
      if (!["awaiting_confirmation", "needs_verification"].includes(order.status)) {
        return { ok: false, message: "Order belum siap diproses." };
      }
      return { ok: true };
    case "manual_process":
      if (!actorIsAdmin) return { ok: false, message: "Hanya admin yang bisa memproses order manual." };
      if (!isManualVoucherOrder(order)) {
        return { ok: false, message: "Bukan order manual." };
      }
      if (order.status !== "manual_pending") {
        return { ok: false, message: "Order manual sudah diproses atau selesai." };
      }
      return { ok: true };
    case "needs_verification":
      if (!actorIsAdmin) return { ok: false, message: "Hanya admin yang bisa mengubah status ini." };
      if (!["processing", "awaiting_confirmation"].includes(order.status)) {
        return { ok: false, message: "Status order tidak valid untuk verifikasi." };
      }
      return { ok: true };
    case "request_account_revision":
      if (!actorIsAdmin) return { ok: false, message: "Hanya admin yang bisa meminta perbaikan data akun." };
      if (!order.product?.requiresAccountLogin) {
        return { ok: false, message: "Produk ini tidak membutuhkan data akun subscription." };
      }
      if (!["processing", "needs_verification", "dispute"].includes(order.status)) {
        return { ok: false, message: "Perbaikan data akun belum bisa diminta pada status ini." };
      }
      if (order.accountRevisionRequested) {
        return { ok: false, message: "Permintaan perbaikan data akun sudah aktif." };
      }
      {
        const quantity = Math.max(1, Number(order.quantity || 1));
        const accounts = Array.isArray(order.accountAccounts) ? order.accountAccounts : [];
        const accountsReady = accounts.length >= quantity
          && accounts.slice(0, quantity).every((item) => item.email && item.email.includes("@") && item.password);
        if (!accountsReady) {
          return { ok: false, message: "Pembeli belum mengirim data akun." };
        }
      }
      return { ok: true };
    case "request_proof_revision":
      if (!actorIsAdmin) return { ok: false, message: "Hanya admin yang bisa meminta ganti bukti transfer." };
      if (order.status !== "awaiting_confirmation") {
        return { ok: false, message: "Ganti bukti hanya bisa diminta saat menunggu konfirmasi admin." };
      }
      if (!order.paymentProofUrl) {
        return { ok: false, message: "Pembeli belum mengirim bukti pembayaran." };
      }
      if (order.proofRevisionRequested) {
        return { ok: false, message: "Permintaan ganti bukti transfer sudah aktif." };
      }
      return { ok: true };
    case "complete":
      if (!actorIsAdmin) return { ok: false, message: "Hanya admin yang bisa menyelesaikan order." };
      if (!["processing", "needs_verification", "dispute"].includes(order.status)) {
        return { ok: false, message: "Order belum bisa diselesaikan." };
      }
      if (!hasCompleteVoucherAccountCredentials(order)) {
        return { ok: false, message: "Data akun subscription belum lengkap. Pembeli harus mengisi email dan password terlebih dahulu." };
      }
      return { ok: true };
    case "dispute":
      if (actorIsAdmin) return { ok: false, message: "Admin tidak bisa mengajukan sengketa." };
      if (!canDisputeVoucherOrder(order)) {
        return { ok: false, message: "Order tidak bisa disengketakan pada status ini." };
      }
      return { ok: true };
    case "cancel":
      if (!canCancelVoucherOrder(order, actorIsAdmin)) {
        return { ok: false, message: "Order tidak bisa dibatalkan pada status ini." };
      }
      return { ok: true };
    default:
      return { ok: false, message: "Aksi order tidak dikenali." };
  }
}
