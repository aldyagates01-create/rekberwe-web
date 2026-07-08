import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

import {
  DEFAULT_VOUCHER_PRODUCT_IMAGE,
  generateVoucherOrderCode,
  getProductReadyState,
  getVoucherBuyerDisplayName,
  getVoucherOrderStockQuantity,
  getVoucherStatusLabel,
  normalizeVoucherAccountPayload,
  normalizeVoucherPaymentSettings,
  parseVoucherAccountAccounts,
  applyVoucherBestsellerFlags,
  shouldRestoreVoucherProductStock,
} from "./voucher-utils.js";

import {
  decryptVoucherCredentialFields,
  encryptVoucherCredentialFields,
  migratePlaintextVoucherCredentials,
} from "./voucher-credentials-crypto.js";

import { phoneToLocalWhatsapp } from "./phone-utils.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "rekberwe.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    social_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    legal_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    profile_url TEXT DEFAULT '',
    verified_provider INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'unverified',
    verification_submitted_at TEXT DEFAULT '',
    verified_at TEXT DEFAULT '',
    ktp TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    verification_note TEXT DEFAULT '',
    banned INTEGER DEFAULT 0,
    banned_reason TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS linked_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    social_id TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT DEFAULT '',
    linked_at TEXT NOT NULL,
    UNIQUE(provider, social_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    code TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    type TEXT NOT NULL,
    warranty TEXT NOT NULL,
    seller_payout_account TEXT DEFAULT '',
    seller_payout_bank_name TEXT DEFAULT '',
    seller_payout_bank_number TEXT DEFAULT '',
    seller_payout_bank_holder TEXT DEFAULT '',
    fee_payer TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    created_by_role TEXT NOT NULL,
    buyer_user_id TEXT DEFAULT NULL,
    seller_user_id TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transaction_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_user_id TEXT DEFAULT NULL,
    message_text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transaction_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code TEXT NOT NULL,
    file_name TEXT NOT NULL,
    stored_name TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    sender_name TEXT NOT NULL,
    sender_user_id TEXT DEFAULT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_locations (
    user_id TEXT PRIMARY KEY,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL DEFAULT 0,
    location_timestamp TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    consent_text TEXT DEFAULT '',
    consent_time TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS support_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    sender_user_id TEXT DEFAULT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message_text TEXT NOT NULL,
    attachment_name TEXT DEFAULT '',
    attachment_url TEXT DEFAULT '',
    attachment_type TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_social ON users(provider, social_id);
  CREATE INDEX IF NOT EXISTS idx_linked_user ON linked_providers(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_transaction ON transaction_messages(transaction_code, id);
  CREATE INDEX IF NOT EXISTS idx_uploads_transaction ON transaction_uploads(transaction_code, id);
  CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id, id);
  CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'user',
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, audience);

  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    path TEXT DEFAULT '',
    referrer_source TEXT DEFAULT '',
    referrer_url TEXT DEFAULT '',
    transaction_code TEXT DEFAULT '',
    user_id TEXT DEFAULT NULL,
    device_type TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
`);

ensureColumn("users", "legal_name", "TEXT DEFAULT ''");
ensureColumn("transaction_uploads", "stored_name", "TEXT DEFAULT ''");
ensureColumn("transaction_uploads", "file_url", "TEXT DEFAULT ''");
ensureColumn("transactions", "fee_amount", "INTEGER DEFAULT 0");
ensureColumn("transactions", "admin_funds_received", "INTEGER DEFAULT 0");
ensureColumn("transactions", "buyer_confirmed_received", "INTEGER DEFAULT 0");
ensureColumn("transactions", "seller_payout_sent", "INTEGER DEFAULT 0");
ensureColumn("transactions", "seller_payout_account", "TEXT DEFAULT ''");
ensureColumn("transactions", "seller_payout_bank_name", "TEXT DEFAULT ''");
ensureColumn("transactions", "seller_payout_bank_number", "TEXT DEFAULT ''");
ensureColumn("transactions", "seller_payout_bank_holder", "TEXT DEFAULT ''");
ensureColumn("users", "verification_status", "TEXT DEFAULT 'unverified'");
ensureColumn("users", "verification_submitted_at", "TEXT DEFAULT ''");
ensureColumn("users", "verified_at", "TEXT DEFAULT ''");
ensureColumn("users", "ktp_photo_url", "TEXT DEFAULT ''");
ensureColumn("users", "ktp_video_url", "TEXT DEFAULT ''");
ensureColumn("users", "ktp_photo_name", "TEXT DEFAULT ''");
ensureColumn("users", "ktp_video_name", "TEXT DEFAULT ''");
ensureColumn("users", "verification_note", "TEXT DEFAULT ''");
ensureColumn("support_messages", "attachment_name", "TEXT DEFAULT ''");
ensureColumn("support_messages", "attachment_url", "TEXT DEFAULT ''");
ensureColumn("support_messages", "attachment_type", "TEXT DEFAULT ''");
ensureColumn("support_threads", "guest_key", "TEXT DEFAULT ''");
ensureColumn("users", "banned", "INTEGER DEFAULT 0");
ensureColumn("users", "banned_reason", "TEXT DEFAULT ''");
ensureColumn("users", "phone_number", "TEXT DEFAULT ''");
ensureColumn("users", "phone_verified", "INTEGER DEFAULT 0");
ensureColumn("users", "phone_verified_at", "TEXT DEFAULT ''");

db.exec(`
  CREATE TABLE IF NOT EXISTS otp_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    phone_number TEXT NOT NULL,
    otp_code_hash TEXT NOT NULL,
    expired_at TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    send_count INTEGER DEFAULT 1,
    last_sent_at TEXT NOT NULL,
    locked_until TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_verification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_otp_verifications_user ON otp_verifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_otp_logs_user ON otp_verification_logs(user_id, created_at);

  CREATE TABLE IF NOT EXISTS pending_seller_joins (
    user_id TEXT NOT NULL,
    transaction_code TEXT NOT NULL,
    admin_notified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, transaction_code)
  );

  CREATE TABLE IF NOT EXISTS voucher_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price INTEGER NOT NULL,
    image_url TEXT DEFAULT '',
    image_name TEXT DEFAULT '',
    ready_mode TEXT DEFAULT '24h',
    ready_start TEXT DEFAULT '',
    ready_end TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    stock INTEGER DEFAULT -1,
    sort_order INTEGER DEFAULT 0,
    requires_account_login INTEGER DEFAULT 0,
    cost_price INTEGER DEFAULT 0,
    cost_currency TEXT DEFAULT 'IDR',
    cost_amount_original REAL DEFAULT 0,
    cost_fx_rate REAL DEFAULT 1,
    cost_fx_fetched_at TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS voucher_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE NOT NULL,
    product_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost_price INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    status TEXT NOT NULL,
    payment_proof_url TEXT DEFAULT '',
    payment_proof_name TEXT DEFAULT '',
    account_email TEXT DEFAULT '',
    account_password TEXT DEFAULT '',
    account_accounts TEXT DEFAULT '[]',
    account_revision_requested INTEGER DEFAULT 0,
    order_source TEXT DEFAULT 'platform',
    buyer_telegram TEXT DEFAULT '',
    dispute_reason TEXT DEFAULT '',
    cancel_reason TEXT DEFAULT '',
    completed_at TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS voucher_order_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT NOT NULL,
    sender_user_id TEXT,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message_text TEXT DEFAULT '',
    attachment_name TEXT DEFAULT '',
    attachment_url TEXT DEFAULT '',
    attachment_type TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_voucher_orders_user ON voucher_orders(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_voucher_orders_status ON voucher_orders(status, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_voucher_order_messages_code ON voucher_order_messages(order_code, id);
`);

ensureColumn("voucher_products", "requires_account_login", "INTEGER DEFAULT 0");
ensureColumn("voucher_products", "cost_price", "INTEGER DEFAULT 0");
ensureColumn("voucher_products", "cost_currency", "TEXT DEFAULT 'IDR'");
ensureColumn("voucher_products", "cost_amount_original", "REAL DEFAULT 0");
ensureColumn("voucher_products", "cost_fx_rate", "REAL DEFAULT 1");
ensureColumn("voucher_products", "cost_fx_fetched_at", "TEXT DEFAULT ''");
ensureColumn("voucher_orders", "account_email", "TEXT DEFAULT ''");
ensureColumn("voucher_orders", "account_password", "TEXT DEFAULT ''");
ensureColumn("voucher_orders", "cost_price", "INTEGER DEFAULT 0");
ensureColumn("voucher_orders", "quantity", "INTEGER DEFAULT 1");
ensureColumn("voucher_orders", "account_accounts", "TEXT DEFAULT '[]'");
ensureColumn("voucher_orders", "account_revision_requested", "INTEGER DEFAULT 0");
ensureColumn("voucher_orders", "order_source", "TEXT DEFAULT 'platform'");
ensureColumn("voucher_orders", "buyer_telegram", "TEXT DEFAULT ''");
ensureColumn("voucher_orders", "completed_at", "TEXT DEFAULT ''");

function restoreVoucherProductStock(productId, quantity) {
  const productRow = db.prepare("SELECT stock FROM voucher_products WHERE id = ?").get(productId);
  const stock = Number(productRow?.stock ?? -1);
  if (stock < 0) return;
  const now = new Date().toISOString();
  db.prepare("UPDATE voucher_products SET stock = stock + ?, updated_at = ? WHERE id = ?")
    .run(quantity, now, productId);
}

const statements = {
  getUserById: db.prepare("SELECT * FROM users WHERE id = ?"),
  getUserBySocial: db.prepare("SELECT * FROM users WHERE provider = ? AND social_id = ?"),
  getAllUsers: db.prepare("SELECT * FROM users ORDER BY updated_at DESC"),
  submitVerification: db.prepare(`
    UPDATE users
    SET verified = 0,
        verification_status = 'pending',
        legal_name = @legal_name,
        ktp = @ktp,
        whatsapp = @whatsapp,
        ktp_photo_url = @ktp_photo_url,
        ktp_video_url = @ktp_video_url,
        ktp_photo_name = @ktp_photo_name,
        ktp_video_name = @ktp_video_name,
        verification_submitted_at = @verification_submitted_at,
        updated_at = @updated_at
    WHERE id = @id
  `),
  reviewVerification: db.prepare(`
    UPDATE users
    SET verified = @verified,
        verification_status = @verification_status,
        verified_at = @verified_at,
        verification_note = @verification_note,
        updated_at = @updated_at
    WHERE id = @id
  `),
  updateUserAdminStatus: db.prepare(`
    UPDATE users
    SET verified = @verified,
        verification_status = @verification_status,
        verified_at = @verified_at,
        verification_note = @verification_note,
        banned = @banned,
        banned_reason = @banned_reason,
        updated_at = @updated_at
    WHERE id = @id
  `),
  updateProfile: db.prepare(`
    UPDATE users
    SET display_name = @display_name,
        legal_name = @legal_name,
        whatsapp = @whatsapp,
        updated_at = @updated_at
    WHERE id = @id
  `),
  upsertUser: db.prepare(`
    INSERT INTO users (
      id, provider, social_id, username, display_name, legal_name, email, avatar, profile_url,
      verified_provider, verified, ktp, whatsapp, verification_note, banned, banned_reason,
      ktp_photo_url, ktp_video_url, ktp_photo_name, ktp_video_name, created_at, updated_at
    ) VALUES (
      @id, @provider, @social_id, @username, @display_name, @legal_name, @email, @avatar, @profile_url,
      @verified_provider, @verified, @ktp, @whatsapp, @verification_note, @banned, @banned_reason,
      @ktp_photo_url, @ktp_video_url, @ktp_photo_name, @ktp_video_name, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      provider = excluded.provider,
      social_id = excluded.social_id,
      username = excluded.username,
      display_name = excluded.display_name,
      legal_name = CASE WHEN users.legal_name = '' THEN excluded.legal_name ELSE users.legal_name END,
      email = excluded.email,
      avatar = excluded.avatar,
      profile_url = excluded.profile_url,
      verified_provider = excluded.verified_provider,
      verified = excluded.verified,
      ktp = excluded.ktp,
      whatsapp = excluded.whatsapp,
      verification_note = excluded.verification_note,
      banned = excluded.banned,
      banned_reason = excluded.banned_reason,
      ktp_photo_url = excluded.ktp_photo_url,
      ktp_video_url = excluded.ktp_video_url,
      ktp_photo_name = excluded.ktp_photo_name,
      ktp_video_name = excluded.ktp_video_name,
      updated_at = excluded.updated_at
  `),
  upsertLinkedProvider: db.prepare(`
    INSERT INTO linked_providers (user_id, provider, social_id, username, email, linked_at)
    VALUES (@user_id, @provider, @social_id, @username, @email, @linked_at)
    ON CONFLICT(provider, social_id) DO UPDATE SET
      user_id = excluded.user_id,
      username = excluded.username,
      email = excluded.email
  `),
  getLinkedProviderBySocial: db.prepare("SELECT * FROM linked_providers WHERE provider = ? AND social_id = ?"),
  getLinkedProvidersByUserId: db.prepare("SELECT * FROM linked_providers WHERE user_id = ? ORDER BY provider ASC"),
  getSetting: db.prepare("SELECT * FROM app_settings WHERE setting_key = ?"),
  upsertSetting: db.prepare(`
    INSERT INTO app_settings (setting_key, setting_value, updated_at)
    VALUES (@setting_key, @setting_value, @updated_at)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      updated_at = excluded.updated_at
  `),
  upsertUserLocation: db.prepare(`
    INSERT INTO user_locations (
      user_id, latitude, longitude, accuracy, location_timestamp, ip_address, user_agent, consent_text, consent_time, created_at, updated_at
    ) VALUES (
      @user_id, @latitude, @longitude, @accuracy, @location_timestamp, @ip_address, @user_agent, @consent_text, @consent_time, @created_at, @updated_at
    )
    ON CONFLICT(user_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      accuracy = excluded.accuracy,
      location_timestamp = excluded.location_timestamp,
      ip_address = excluded.ip_address,
      user_agent = excluded.user_agent,
      consent_text = excluded.consent_text,
      consent_time = excluded.consent_time,
      updated_at = excluded.updated_at
  `),
  getUserLocationByUserId: db.prepare("SELECT * FROM user_locations WHERE user_id = ?"),
  createTransaction: db.prepare(`
    INSERT INTO transactions (
      code, title, price, type, warranty, seller_payout_account, seller_payout_bank_name, seller_payout_bank_number, seller_payout_bank_holder, fee_payer, payment_status, created_by_role,
      buyer_user_id, seller_user_id, fee_amount, admin_funds_received,
      buyer_confirmed_received, seller_payout_sent, created_at, updated_at
    ) VALUES (
      @code, @title, @price, @type, @warranty, @seller_payout_account, @seller_payout_bank_name, @seller_payout_bank_number, @seller_payout_bank_holder, @fee_payer, @payment_status, @created_by_role,
      @buyer_user_id, @seller_user_id, @fee_amount, @admin_funds_received,
      @buyer_confirmed_received, @seller_payout_sent, @created_at, @updated_at
    )
  `),
  getTransaction: db.prepare("SELECT * FROM transactions WHERE code = ?"),
  getAllTransactions: db.prepare("SELECT * FROM transactions ORDER BY created_at DESC"),
  getTransactionsByUserId: db.prepare(`
    SELECT * FROM transactions
    WHERE buyer_user_id = @user_id OR seller_user_id = @user_id
    ORDER BY updated_at DESC
  `),
  joinTransaction: db.prepare(`
    UPDATE transactions
    SET buyer_user_id = COALESCE(@buyer_user_id, buyer_user_id),
        seller_user_id = COALESCE(@seller_user_id, seller_user_id),
        updated_at = @updated_at
    WHERE code = @code
  `),
  updateTransactionStatus: db.prepare(`
    UPDATE transactions
    SET payment_status = @payment_status,
        updated_at = @updated_at
    WHERE code = @code
  `),
  updateTransactionWorkflow: db.prepare(`
    UPDATE transactions
    SET payment_status = @payment_status,
        admin_funds_received = @admin_funds_received,
        buyer_confirmed_received = @buyer_confirmed_received,
        seller_payout_sent = @seller_payout_sent,
        seller_payout_account = @seller_payout_account,
        seller_payout_bank_name = @seller_payout_bank_name,
        seller_payout_bank_number = @seller_payout_bank_number,
        seller_payout_bank_holder = @seller_payout_bank_holder,
        updated_at = @updated_at
    WHERE code = @code
  `),
  updateSellerPayoutDetails: db.prepare(`
    UPDATE transactions
    SET seller_payout_account = @seller_payout_account,
        seller_payout_bank_name = @seller_payout_bank_name,
        seller_payout_bank_number = @seller_payout_bank_number,
        seller_payout_bank_holder = @seller_payout_bank_holder,
        updated_at = @updated_at
    WHERE code = @code
  `),
  addMessage: db.prepare(`
    INSERT INTO transaction_messages (
      transaction_code, sender_name, sender_user_id, message_text, created_at
    ) VALUES (
      @transaction_code, @sender_name, @sender_user_id, @message_text, @created_at
    )
  `),
  addUpload: db.prepare(`
    INSERT INTO transaction_uploads (
      transaction_code, file_name, stored_name, file_url, sender_name, sender_user_id, created_at
    ) VALUES (
      @transaction_code, @file_name, @stored_name, @file_url, @sender_name, @sender_user_id, @created_at
    )
  `),
  getMessages: db.prepare("SELECT * FROM transaction_messages WHERE transaction_code = ? ORDER BY id ASC"),
  getUploads: db.prepare("SELECT * FROM transaction_uploads WHERE transaction_code = ? ORDER BY id ASC"),
  deleteTransactionMessages: db.prepare("DELETE FROM transaction_messages WHERE transaction_code = ?"),
  deleteTransactionUploads: db.prepare("DELETE FROM transaction_uploads WHERE transaction_code = ?"),
  deleteTransaction: db.prepare("DELETE FROM transactions WHERE code = ?"),
  getSupportThreadByUserId: db.prepare("SELECT * FROM support_threads WHERE user_id = ?"),
  getSupportThreadByGuestKey: db.prepare("SELECT * FROM support_threads WHERE guest_key = ?"),
  getSupportThreadById: db.prepare("SELECT * FROM support_threads WHERE id = ?"),
  getAllSupportThreads: db.prepare("SELECT * FROM support_threads ORDER BY updated_at DESC"),
  createSupportThread: db.prepare(`
    INSERT INTO support_threads (user_id, guest_key, status, created_at, updated_at)
    VALUES (@user_id, @guest_key, 'open', @created_at, @updated_at)
  `),
  touchSupportThread: db.prepare(`
    UPDATE support_threads
    SET status = @status,
        updated_at = @updated_at
    WHERE id = @id
  `),
  addSupportMessage: db.prepare(`
    INSERT INTO support_messages (thread_id, sender_user_id, sender_name, sender_role, message_text, attachment_name, attachment_url, attachment_type, created_at)
    VALUES (@thread_id, @sender_user_id, @sender_name, @sender_role, @message_text, @attachment_name, @attachment_url, @attachment_type, @created_at)
  `),
  getSupportMessages: db.prepare("SELECT * FROM support_messages WHERE thread_id = ? ORDER BY id ASC"),
};

export function upsertUser(user) {
  const now = new Date().toISOString();
  const existing = statements.getUserById.get(user.id);
  statements.upsertUser.run({
    id: user.id,
    provider: user.provider,
    social_id: user.socialId,
    username: user.username,
    display_name: user.displayName,
    legal_name: existing?.legal_name || user.legalName || user.displayName,
    email: user.email || "",
    avatar: user.avatar || "",
    profile_url: user.profileUrl || "",
    verified_provider: user.verifiedProvider ? 1 : 0,
    verified: existing?.verified || user.verified ? 1 : 0,
    ktp: existing?.ktp || user.ktp || "",
    whatsapp: existing?.whatsapp || user.whatsapp || "",
    verification_note: existing?.verification_note || user.verificationNote || "",
    banned: existing?.banned || user.banned ? 1 : 0,
    banned_reason: existing?.banned_reason || user.bannedReason || "",
    ktp_photo_url: existing?.ktp_photo_url || user.ktpPhotoUrl || "",
    ktp_video_url: existing?.ktp_video_url || user.ktpVideoUrl || "",
    ktp_photo_name: existing?.ktp_photo_name || user.ktpPhotoName || "",
    ktp_video_name: existing?.ktp_video_name || user.ktpVideoName || "",
    created_at: existing?.created_at || now,
    updated_at: now,
  });

  linkProviderToUser(user.id, user.provider, user.socialId, user.username, user.email || "");
  return getUserById(user.id);
}

export function getUserById(id) {
  const row = statements.getUserById.get(id);
  return row ? mapUser(row) : null;
}

export function getAllUsers() {
  return statements.getAllUsers.all().map((row) => mapUser(row));
}

export function getUserByProviderSocial(provider, socialId) {
  const linked = statements.getLinkedProviderBySocial.get(provider, socialId);
  if (linked) {
    return getUserById(linked.user_id);
  }
  const direct = statements.getUserBySocial.get(provider, socialId);
  return direct ? mapUser(direct) : null;
}

export function updateUserVerification(id, legalName, ktp, whatsapp, attachments = {}) {
  statements.submitVerification.run({
    id,
    legal_name: legalName,
    ktp,
    whatsapp,
    ktp_photo_url: attachments.ktpPhotoUrl || "",
    ktp_video_url: attachments.ktpVideoUrl || "",
    ktp_photo_name: attachments.ktpPhotoName || "",
    ktp_video_name: attachments.ktpVideoName || "",
    verification_submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return getUserById(id);
}

export function reviewUserVerification(id, action, note = "") {
  const current = getUserById(id);
  if (!current) return null;

  const approved = action === "approve";
  statements.reviewVerification.run({
    id,
    verified: approved ? 1 : 0,
    verification_status: approved ? "verified" : "revision_required",
    verified_at: approved ? new Date().toISOString() : "",
    verification_note: approved ? "" : String(note || "").trim(),
    updated_at: new Date().toISOString(),
  });
  return getUserById(id);
}

export function updateUserAdminStatus(id, action, reason = "") {
  const current = getUserById(id);
  if (!current) return null;
  const updated = {
    id,
    verified: current.verified ? 1 : 0,
    verification_status: current.verificationStatus || "unverified",
    verified_at: current.verifiedAt || "",
    verification_note: current.verificationNote || "",
    banned: current.banned ? 1 : 0,
    banned_reason: current.bannedReason || "",
    updated_at: new Date().toISOString(),
  };
  if (action === "ban") {
    updated.banned = 1;
    updated.banned_reason = String(reason || "").trim();
  } else if (action === "unban") {
    updated.banned = 0;
    updated.banned_reason = "";
  } else if (action === "unverify") {
    updated.verified = 0;
    updated.verification_status = "unverified";
    updated.verified_at = "";
    updated.verification_note = String(reason || "").trim();
  }
  statements.updateUserAdminStatus.run(updated);
  if (action === "unverify") {
    resetUserPhoneVerification(id, "Admin unverify akun");
  }
  return getUserById(id);
}

export function updateUserVerificationFiles(id, attachments = {}) {
  const current = getUserById(id);
  if (!current) return null;
  statements.upsertUser.run({
    id: current.id,
    provider: current.provider,
    social_id: current.socialId,
    username: current.username,
    display_name: current.displayName,
    legal_name: current.legalName || "",
    email: current.email || "",
    avatar: current.avatar || "",
    profile_url: current.profileUrl || "",
    verified_provider: current.verifiedProvider ? 1 : 0,
    verified: current.verified ? 1 : 0,
    ktp: current.ktp || "",
    whatsapp: current.whatsapp || "",
    ktp_photo_url: attachments.ktpPhotoUrl || current.ktpPhotoUrl || "",
    ktp_video_url: attachments.ktpVideoUrl || current.ktpVideoUrl || "",
    ktp_photo_name: attachments.ktpPhotoName || current.ktpPhotoName || "",
    ktp_video_name: attachments.ktpVideoName || current.ktpVideoName || "",
    created_at: current.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return getUserById(id);
}

export function updateUserProfile(id, displayName, legalName, whatsapp) {
  const current = getUserById(id);
  const locked = current?.verificationStatus === "verified";
  const phoneLocked = Boolean(current?.phoneVerified);
  statements.updateProfile.run({
    id,
    display_name: displayName,
    legal_name: locked ? current.legalName : legalName,
    whatsapp: locked || phoneLocked ? current.whatsapp : whatsapp,
    updated_at: new Date().toISOString(),
  });
  return getUserById(id);
}

export function linkProviderToUser(userId, provider, socialId, username, email) {
  statements.upsertLinkedProvider.run({
    user_id: userId,
    provider,
    social_id: socialId,
    username,
    email: email || "",
    linked_at: new Date().toISOString(),
  });
}

export function getLinkedProvidersForUser(userId) {
  return statements.getLinkedProvidersByUserId.all(userId).map((row) => ({
    provider: row.provider,
    socialId: row.social_id,
    username: row.username,
    email: row.email,
    linkedAt: row.linked_at,
  }));
}

export function createTransaction(input) {
  const now = new Date().toISOString();
  statements.createTransaction.run({
    code: input.code,
    title: input.title,
    price: input.price,
    type: input.type,
    warranty: input.warranty,
    seller_payout_account: input.sellerPayoutAccount || "",
    seller_payout_bank_name: input.sellerBankName || "",
    seller_payout_bank_number: input.sellerBankNumber || "",
    seller_payout_bank_holder: input.sellerBankHolder || "",
    fee_payer: input.feePayer,
    payment_status: input.paymentStatus,
    created_by_role: input.createdByRole,
    buyer_user_id: input.buyerUserId || null,
    seller_user_id: input.sellerUserId || null,
    fee_amount: input.feeAmount || 0,
    admin_funds_received: 0,
    buyer_confirmed_received: 0,
    seller_payout_sent: 0,
    created_at: now,
    updated_at: now,
  });
  statements.addMessage.run({
    transaction_code: input.code,
    sender_name: "RekberWE.id",
    sender_user_id: null,
    message_text: `Transaksi ${input.code} berhasil dibuat.\n\nBagikan link ini ke lawan transaksi agar mereka bisa masuk dan memilih role:\n${input.shareLink || `/?trx=${input.code}`}\n\nWajib baca syarat & ketentuan: /terms dan panduan pengamanan akun: /security-guide`,
    created_at: now,
  });
  return getTransactionByCode(input.code);
}

export function getAllTransactions() {
  return statements.getAllTransactions.all().map((row) => hydrateTransaction(row));
}

export function getTransactionsForUser(userId) {
  return statements.getTransactionsByUserId.all({ user_id: userId }).map((row) => hydrateTransaction(row));
}

export function getTransactionByCode(code) {
  const row = statements.getTransaction.get(code);
  return row ? hydrateTransaction(row) : null;
}

export function joinTransaction(code, userId, role) {
  statements.joinTransaction.run({
    code,
    buyer_user_id: role === "buyer" ? userId : null,
    seller_user_id: role === "seller" ? userId : null,
    updated_at: new Date().toISOString(),
  });
  const joined = getTransactionByCode(code);
  const user = getUserById(userId);
  if (joined && user) {
    statements.addMessage.run({
      transaction_code: code,
      sender_name: "System",
      sender_user_id: null,
      message_text: `${user.displayName} bergabung sebagai ${role === "buyer" ? "pembeli" : "penjual"}. Mohon baca syarat & ketentuan: /terms dan panduan pengamanan akun: /security-guide`,
      created_at: new Date().toISOString(),
    });
  }
  return getTransactionByCode(code);
}

export function addTransactionMessage(code, senderUserId, senderName, messageText) {
  statements.addMessage.run({
    transaction_code: code,
    sender_name: senderName,
    sender_user_id: senderUserId,
    message_text: messageText,
    created_at: new Date().toISOString(),
  });
  return getTransactionByCode(code);
}

export function addStoredTransactionUpload(code, senderUserId, senderName, fileName, storedName, fileUrl) {
  statements.addUpload.run({
    transaction_code: code,
    file_name: fileName,
    stored_name: storedName,
    file_url: fileUrl,
    sender_name: senderName,
    sender_user_id: senderUserId,
    created_at: new Date().toISOString(),
  });
  return getTransactionByCode(code);
}

export function updateTransactionStatus(code, paymentStatus, systemMessage) {
  const now = new Date().toISOString();
  statements.updateTransactionStatus.run({
    code,
    payment_status: paymentStatus,
    updated_at: now,
  });
  if (systemMessage) {
    statements.addMessage.run({
      transaction_code: code,
      sender_name: "System",
      sender_user_id: null,
      message_text: systemMessage,
      created_at: now,
    });
  }
  return getTransactionByCode(code);
}

export function updateTransactionWorkflow(code, workflow) {
  const current = getTransactionByCode(code);
  if (!current) return null;

  statements.updateTransactionWorkflow.run({
    code,
    payment_status: workflow.paymentStatus || current.paymentStatus,
    admin_funds_received: workflow.adminFundsReceived ?? Number(current.adminFundsReceived),
    buyer_confirmed_received: workflow.buyerConfirmedReceived ?? Number(current.buyerConfirmedReceived),
    seller_payout_sent: workflow.sellerPayoutSent ?? Number(current.sellerPayoutSent),
    seller_payout_account: workflow.sellerPayoutAccount ?? current.sellerPayoutAccount ?? "",
    seller_payout_bank_name: workflow.sellerBankName ?? current.sellerBankName ?? "",
    seller_payout_bank_number: workflow.sellerBankNumber ?? current.sellerBankNumber ?? "",
    seller_payout_bank_holder: workflow.sellerBankHolder ?? current.sellerBankHolder ?? "",
    updated_at: new Date().toISOString(),
  });

  if (workflow.systemMessage) {
    statements.addMessage.run({
      transaction_code: code,
      sender_name: "RekberWE.id",
      sender_user_id: null,
      message_text: workflow.systemMessage,
      created_at: new Date().toISOString(),
    });
  }

  return getTransactionByCode(code);
}

export function deleteTransactionByCode(code) {
  const transaction = getTransactionByCode(code);
  if (!transaction) return null;
  statements.deleteTransactionMessages.run(code);
  statements.deleteTransactionUploads.run(code);
  statements.deleteTransaction.run(code);
  return transaction;
}

export function addAdminTransactionMessage(code, messageText) {
  statements.addMessage.run({
    transaction_code: code,
    sender_name: "RekberWE.id",
    sender_user_id: null,
    message_text: messageText,
    created_at: new Date().toISOString(),
  });
  return getTransactionByCode(code);
}

export function updateSellerPayoutDetails(code, details) {
  const current = getTransactionByCode(code);
  if (!current) return null;
  const account = `${String(details.bankName || "").trim()} ${String(details.bankNumber || "").trim()} a.n ${String(details.bankHolder || "").trim()}`.trim();
  statements.updateSellerPayoutDetails.run({
    code,
    seller_payout_account: account,
    seller_payout_bank_name: details.bankName || "",
    seller_payout_bank_number: details.bankNumber || "",
    seller_payout_bank_holder: details.bankHolder || "",
    updated_at: new Date().toISOString(),
  });
  statements.addMessage.run({
    transaction_code: code,
    sender_name: "RekberWE.id",
    sender_user_id: null,
    message_text: `Penjual sudah mengirim data rekening penerimaan dana:\nBank: ${details.bankName}\nNo Rekening: ${details.bankNumber}\nAtas Nama: ${details.bankHolder}`,
    created_at: new Date().toISOString(),
  });
  return getTransactionByCode(code);
}

export function getAdminFeeSettings() {
  const adminPayoutSetting = statements.getSetting.get("admin_payout_account");
  const row = statements.getSetting.get("fee_settings");
  const fallbackAccount = adminPayoutSetting?.setting_value || "";
  if (!row) {
    return {
      ...defaultFeeSettings(),
      adminPayoutAccount: fallbackAccount,
    };
  }

  try {
    const parsed = JSON.parse(row.setting_value);
    return {
      ...normalizeFeeSettings(parsed),
      adminPayoutAccount: fallbackAccount || String(parsed?.adminPayoutAccount || "").trim(),
    };
  } catch {
    return {
      ...defaultFeeSettings(),
      adminPayoutAccount: fallbackAccount,
    };
  }
}

export function saveAdminFeeSettings(input) {
  const current = getAdminFeeSettings();
  const normalized = normalizeFeeSettings({
    ...current,
    ...input,
  });
  statements.upsertSetting.run({
    setting_key: "fee_settings",
    setting_value: JSON.stringify(normalized),
    updated_at: new Date().toISOString(),
  });
  statements.upsertSetting.run({
    setting_key: "admin_payout_account",
    setting_value: normalized.adminPayoutAccount || "",
    updated_at: new Date().toISOString(),
  });
  return normalized;
}

export function saveUserLocation(userId, location) {
  const now = new Date().toISOString();
  statements.upsertUserLocation.run({
    user_id: userId,
    latitude: Number(location.latitude || 0),
    longitude: Number(location.longitude || 0),
    accuracy: Number(location.accuracy || 0),
    location_timestamp: String(location.locationTimestamp || "").trim(),
    ip_address: String(location.ipAddress || "").trim(),
    user_agent: String(location.userAgent || "").trim(),
    consent_text: String(location.consentText || "").trim(),
    consent_time: String(location.consentTime || "").trim(),
    created_at: now,
    updated_at: now,
  });
  return getUserLocationByUserId(userId);
}

export function getUserLocationByUserId(userId) {
  const row = statements.getUserLocationByUserId.get(userId);
  if (!row) return null;
  return {
    userId: row.user_id,
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    accuracy: Number(row.accuracy || 0),
    locationTimestamp: row.location_timestamp || "",
    ipAddress: row.ip_address || "",
    userAgent: row.user_agent || "",
    consentText: row.consent_text || "",
    consentTime: row.consent_time || "",
    updatedAt: row.updated_at || "",
  };
}

export function getSupportThreadForUser(userId) {
  const existing = statements.getSupportThreadByUserId.get(userId);
  if (existing) return hydrateSupportThread(existing);
  const now = new Date().toISOString();
  statements.createSupportThread.run({
    user_id: userId,
    guest_key: "",
    created_at: now,
    updated_at: now,
  });
  return hydrateSupportThread(statements.getSupportThreadByUserId.get(userId));
}

export function getSupportThreadForGuest(guestKey) {
  const key = String(guestKey || "").trim();
  if (!key) return null;
  return getSupportThreadForUser(`guest:${key}`);
}

export function getAllSupportThreads() {
  return statements.getAllSupportThreads.all().map((row) => hydrateSupportThread(row));
}

export function addSupportThreadMessage(threadId, senderUserId, senderName, senderRole, messageText, attachment = {}) {
  const current = statements.getSupportThreadById.get(threadId);
  if (!current) return null;
  const now = new Date().toISOString();
  statements.addSupportMessage.run({
    thread_id: threadId,
    sender_user_id: senderUserId || null,
    sender_name: senderName,
    sender_role: senderRole,
    message_text: messageText,
    attachment_name: attachment.attachmentName || "",
    attachment_url: attachment.attachmentUrl || "",
    attachment_type: attachment.attachmentType || "",
    created_at: now,
  });
  statements.touchSupportThread.run({
    id: threadId,
    status: "open",
    updated_at: now,
  });
  return hydrateSupportThread(statements.getSupportThreadById.get(threadId));
}

export function updateSupportThreadStatus(threadId, status) {
  const current = statements.getSupportThreadById.get(threadId);
  if (!current) return null;
  statements.touchSupportThread.run({
    id: threadId,
    status: status || current.status || "open",
    updated_at: new Date().toISOString(),
  });
  return hydrateSupportThread(statements.getSupportThreadById.get(threadId));
}

function hydrateTransaction(row) {
  const buyer = row.buyer_user_id ? getUserById(row.buyer_user_id) : null;
  const seller = row.seller_user_id ? getUserById(row.seller_user_id) : null;
  const participants = { buyer, seller };
  const feeSettings = getAdminFeeSettings();

  return {
    code: row.code,
    title: row.title,
    price: row.price,
    type: row.type,
    warranty: row.warranty,
    sellerPayoutAccount: row.seller_payout_account || "",
    sellerBankName: row.seller_payout_bank_name || "",
    sellerBankNumber: row.seller_payout_bank_number || "",
    sellerBankHolder: row.seller_payout_bank_holder || "",
    feePayer: row.fee_payer,
    paymentStatus: row.payment_status,
    createdByRole: row.created_by_role,
    feeAmount: Number(row.fee_amount || 0),
    adminFundsReceived: Boolean(row.admin_funds_received),
    buyerConfirmedReceived: Boolean(row.buyer_confirmed_received),
    sellerPayoutSent: Boolean(row.seller_payout_sent),
    createdAt: row.created_at,
    warrantyDays: parseWarrantyDays(row.warranty),
    warrantyEndsAt: buildWarrantyEndsAt(row.created_at, row.warranty),
    adminPayoutAccount: feeSettings.adminPayoutAccount || "",
    buyer,
    seller,
    settlement: buildSettlementSummary(row.price, row.fee_payer, Number(row.fee_amount || 0)),
    uploads: statements.getUploads.all(row.code).map((item) => {
      const meta = resolveSenderMeta(item.sender_name, item.sender_user_id, participants);
      return {
        id: item.id,
        name: item.file_name,
        storedName: item.stored_name || "",
        url: item.file_url || "",
        sender: meta.name,
        senderUserId: item.sender_user_id,
        senderTitle: meta.title,
        senderVerified: meta.verified,
        time: item.created_at,
      };
    }),
    messages: statements.getMessages.all(row.code).map((item) => {
      const meta = resolveSenderMeta(item.sender_name, item.sender_user_id, participants);
      return {
        id: item.id,
        sender: meta.name,
        senderUserId: item.sender_user_id,
        senderTitle: meta.title,
        senderVerified: meta.verified,
        text: item.message_text,
        time: item.created_at,
      };
    }),
  };
}

function hydrateSupportThread(row) {
  const user = row.user_id ? getUserById(row.user_id) : null;
  const messages = statements.getSupportMessages.all(row.id).map((item) => ({
    id: item.id,
    senderUserId: item.sender_user_id,
    sender: item.sender_name,
    senderRole: item.sender_role,
    text: item.message_text,
    attachmentName: item.attachment_name || "",
    attachmentUrl: item.attachment_url || "",
    attachmentType: item.attachment_type || "",
    time: item.created_at,
  }));
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status || "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user,
    messages,
  };
}

function parseWarrantyDays(warranty) {
  const raw = String(warranty || "").trim().toLowerCase();
  if (!raw) return 0;
  const matched = raw.match(/(\d+)/);
  return matched ? Number(matched[1] || 0) : 0;
}

function buildWarrantyEndsAt(createdAt, warranty) {
  const days = parseWarrantyDays(warranty);
  if (!days) return "";
  const created = new Date(createdAt);
  created.setDate(created.getDate() + days);
  return created.toISOString();
}

function buildSettlementSummary(price, feePayer, feeAmount) {
  const totalFee = Number(feeAmount || 0);
  if (feePayer === "seller") {
    return {
      feeAmount: totalFee,
      buyerTransferAmount: price,
      sellerReceiveAmount: Math.max(0, price - totalFee),
      buyerFeeShare: 0,
      sellerFeeShare: totalFee,
    };
  }

  if (feePayer === "split") {
    const buyerShare = Math.ceil(totalFee / 2);
    const sellerShare = totalFee - buyerShare;
    return {
      feeAmount: totalFee,
      buyerTransferAmount: price + buyerShare,
      sellerReceiveAmount: Math.max(0, price - sellerShare),
      buyerFeeShare: buyerShare,
      sellerFeeShare: sellerShare,
    };
  }

  return {
    feeAmount: totalFee,
    buyerTransferAmount: price + totalFee,
    sellerReceiveAmount: price,
    buyerFeeShare: totalFee,
    sellerFeeShare: 0,
  };
}

function resolveSenderMeta(senderName, senderUserId, participants) {
  if (!senderUserId) {
    return {
      name: "RekberWE.id",
      title: "Admin",
      verified: true,
    };
  }

  if (participants.buyer?.id === senderUserId) {
    return {
      name: participants.buyer.displayName,
      title: "Pembeli",
      verified: participants.buyer.verified,
    };
  }

  if (participants.seller?.id === senderUserId) {
    return {
      name: participants.seller.displayName,
      title: "Penjual",
      verified: participants.seller.verified,
    };
  }

  const user = getUserById(senderUserId);
  return {
    name: user?.displayName || senderName || "Pengguna",
    title: "Peserta",
    verified: Boolean(user?.verified),
  };
}

function mapUser(row) {
  const location = getUserLocationByUserId(row.id);
  const user = {
    id: row.id,
    provider: row.provider,
    socialId: row.social_id,
    username: row.username,
    displayName: row.display_name,
    legalName: row.legal_name || row.display_name,
    email: row.email,
    avatar: row.avatar,
    profileUrl: row.profile_url,
    verifiedProvider: Boolean(row.verified_provider),
    verified: Boolean(row.verified),
    verificationStatus: row.verification_status || (row.verified ? "verified" : "unverified"),
    verificationSubmittedAt: row.verification_submitted_at || "",
    verifiedAt: row.verified_at || "",
    ktp: row.ktp,
    whatsapp: row.whatsapp,
    phoneNumber: row.phone_number || row.whatsapp || "",
    phoneVerified: Boolean(row.phone_verified),
    phoneVerifiedAt: row.phone_verified_at || "",
    verificationNote: row.verification_note || "",
    banned: Boolean(row.banned),
    bannedReason: row.banned_reason || "",
    ktpPhotoUrl: row.ktp_photo_url || "",
    ktpVideoUrl: row.ktp_video_url || "",
    ktpPhotoName: row.ktp_photo_name || "",
    ktpVideoName: row.ktp_video_name || "",
    locationVerified: Boolean(location),
    location: location,
  };
  user.linkedProviders = getLinkedProvidersForUser(user.id);
  return user;
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function defaultFeeSettings() {
  return {
    adminPayoutAccount: "",
    customerCareTelegram: "",
    customerCareGmail: "",
    officeAddress: "",
    goldFlatFee: 10000,
    accountFeeTiers: [
      { maxAmount: 500000, fee: 25000, feeType: "flat" },
      { maxAmount: 1000000, fee: 50000, feeType: "flat" },
      { maxAmount: 5000000, fee: 100000, feeType: "flat" },
      { maxAmount: 999999999999, fee: 1, feeType: "percent" },
    ],
    termsAndConditions: defaultTermsAndConditions(),
    accountSecurityGuide: defaultAccountSecurityGuide(),
    notificationSounds: {
      user: { url: "", name: "" },
      admin: { url: "", name: "" },
    },
    maintenanceMode: false,
    maintenanceMessage: defaultMaintenanceMessage(),
    voucherPayment: normalizeVoucherPaymentSettings(),
  };
}

function defaultMaintenanceMessage() {
  return [
    "RekberWE.id sedang dalam pemeliharaan sistem.",
    "Kami melakukan peningkatan untuk pengalaman transaksi yang lebih aman.",
    "Silakan kembali beberapa saat lagi.",
  ].join("\n");
}

function defaultTermsAndConditions() {
  return [
    "Untuk transaksi gold, gametime, topup, dan sejenisnya, fee rekber tetap 10.000 dengan nominal transaksi berapapun.",
    "Bank selain BCA kena fee 2.500.",
    "Khusus penjual wajib verifikasi identitas di profil dengan foto KTP dan video selfie memegang KTP. NIK disarankan di-blur.",
    "Jika ada data akun yang tidak bisa di-remove / diganti, buyer berhak membatalkan transaksi.",
    "Garansi adalah kesepakatan personal antara seller dan buyer. Admin tidak bertanggung jawab setelah transaksi selesai.",
    "Jika terjadi hackback oleh penjual, buyer berhak meminta identitas penjual dan semua kontak social media melalui admin, ajukan sengketa, atau live chat.",
  ].join("\n");
}

function defaultAccountSecurityGuide() {
  return [
    "Gunakan email dan nomor WhatsApp yang masih aktif.",
    "Pastikan semua data recovery akun bisa diganti atau dihapus sebelum transaksi selesai.",
    "Gunakan password baru setelah akun diterima.",
    "Aktifkan autentikasi tambahan setelah proses serah terima akun selesai.",
    "Untuk rekber gold, pastikan nominal, server, dan karakter sudah cocok sebelum admin meneruskan dana.",
  ].join("\n");
}

function normalizeFeeSettings(input) {
  const raw = input || {};
  const tiers = Array.isArray(raw.accountFeeTiers)
    ? raw.accountFeeTiers
      .map((item) => ({
        maxAmount: Number(item.maxAmount || 0),
        fee: Number(item.fee || 0),
        feeType: String(item.feeType || "flat").toLowerCase() === "percent" ? "percent" : "flat",
      }))
      .filter((item) => item.maxAmount > 0 && item.fee >= 0)
      .sort((a, b) => a.maxAmount - b.maxAmount)
    : defaultFeeSettings().accountFeeTiers;

  return {
    adminPayoutAccount: String(raw.adminPayoutAccount || "").trim(),
    customerCareTelegram: String(raw.customerCareTelegram || "").trim(),
    customerCareGmail: String(raw.customerCareGmail || "").trim(),
    officeAddress: String(raw.officeAddress || "").trim(),
    goldFlatFee: Math.max(0, Number(raw.goldFlatFee || defaultFeeSettings().goldFlatFee)),
    accountFeeTiers: tiers.length ? tiers : defaultFeeSettings().accountFeeTiers,
    termsAndConditions: String(raw.termsAndConditions || defaultTermsAndConditions()).trim() || defaultTermsAndConditions(),
    accountSecurityGuide: String(raw.accountSecurityGuide || defaultAccountSecurityGuide()).trim() || defaultAccountSecurityGuide(),
    notificationSounds: {
      user: {
        url: String(raw.notificationSounds?.user?.url || "").trim(),
        name: String(raw.notificationSounds?.user?.name || "").trim(),
      },
      admin: {
        url: String(raw.notificationSounds?.admin?.url || "").trim(),
        name: String(raw.notificationSounds?.admin?.name || "").trim(),
      },
    },
    maintenanceMode: Boolean(raw.maintenanceMode),
    maintenanceMessage: String(raw.maintenanceMessage || defaultMaintenanceMessage()).trim() || defaultMaintenanceMessage(),
    voucherPayment: normalizeVoucherPaymentSettings(raw.voucherPayment),
  };
}

function normalizePushSubscriptionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    audience: row.audience || "user",
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function upsertPushSubscription(userId, audience, subscription, userAgent = "") {
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();
  if (!userId || !endpoint || !p256dh || !auth) return null;
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(endpoint);
  if (existing) {
    db.prepare(`
      UPDATE push_subscriptions
      SET user_id = ?, audience = ?, p256dh = ?, auth = ?, user_agent = ?, updated_at = ?
      WHERE endpoint = ?
    `).run(userId, audience || "user", p256dh, auth, userAgent, now, endpoint);
  } else {
    db.prepare(`
      INSERT INTO push_subscriptions (user_id, audience, endpoint, p256dh, auth, user_agent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, audience || "user", endpoint, p256dh, auth, userAgent, now, now);
  }
  return normalizePushSubscriptionRow(db.prepare("SELECT * FROM push_subscriptions WHERE endpoint = ?").get(endpoint));
}

export function removePushSubscription(userId, endpoint) {
  const target = String(endpoint || "").trim();
  if (!userId || !target) return false;
  const result = db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?").run(userId, target);
  return result.changes > 0;
}

export function removePushSubscriptionByEndpoint(endpoint) {
  const target = String(endpoint || "").trim();
  if (!target) return false;
  const result = db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(target);
  return result.changes > 0;
}

export function getPushSubscriptionsForUser(userId, audience = "user") {
  const rows = db.prepare("SELECT * FROM push_subscriptions WHERE user_id = ? AND audience = ?").all(userId, audience || "user");
  return rows.map(normalizePushSubscriptionRow);
}

export function getAdminPushSubscriptions(adminUserIds = []) {
  const ids = Array.from(adminUserIds || []).filter(Boolean);
  if (!ids.length) {
    return db.prepare("SELECT * FROM push_subscriptions WHERE audience = 'admin'").all().map(normalizePushSubscriptionRow);
  }
  const placeholders = ids.map(() => "?").join(", ");
  return db.prepare(`SELECT * FROM push_subscriptions WHERE audience = 'admin' AND user_id IN (${placeholders})`).all(...ids).map(normalizePushSubscriptionRow);
}

export function recordAnalyticsEvent(input) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO analytics_events (
      visitor_id, event_type, path, referrer_source, referrer_url, transaction_code, user_id, device_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(input.visitorId || "").trim(),
    String(input.eventType || "").trim(),
    String(input.path || "").slice(0, 500),
    String(input.referrerSource || "direct").slice(0, 40),
    String(input.referrerUrl || "").slice(0, 500),
    String(input.transactionCode || "").slice(0, 40).toUpperCase(),
    input.userId ? String(input.userId) : null,
    String(input.deviceType || "").slice(0, 20),
    now,
  );
}

export function getAnalyticsSummary(fromInput, toInput) {
  const from = fromInput ? new Date(`${fromInput}T00:00:00.000`) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  const to = toInput ? new Date(`${toInput}T23:59:59.999`) : new Date();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const uniqueVisitors = Number(db.prepare(`
    SELECT COUNT(DISTINCT visitor_id) AS count
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ? AND event_type = 'pageview'
  `).get(fromIso, toIso)?.count || 0);

  const totalPageviews = Number(db.prepare(`
    SELECT COUNT(*) AS count
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ? AND event_type = 'pageview'
  `).get(fromIso, toIso)?.count || 0);

  const daily = db.prepare(`
    SELECT substr(created_at, 1, 10) AS day,
      COUNT(DISTINCT visitor_id) AS visitors,
      SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) AS pageviews
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY day
    ORDER BY day ASC
  `).all(fromIso, toIso).map((row) => ({
    date: row.day,
    visitors: Number(row.visitors || 0),
    pageviews: Number(row.pageviews || 0),
  }));

  const referrers = db.prepare(`
    SELECT referrer_source AS source,
      COUNT(*) AS count,
      COUNT(DISTINCT visitor_id) AS visitors
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ? AND event_type = 'pageview'
    GROUP BY referrer_source
    ORDER BY count DESC
  `).all(fromIso, toIso).map((row) => ({
    source: row.source || "direct",
    count: Number(row.count || 0),
    visitors: Number(row.visitors || 0),
  }));

  const topPages = db.prepare(`
    SELECT path,
      COUNT(*) AS views,
      COUNT(DISTINCT visitor_id) AS visitors
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ? AND event_type = 'pageview'
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10
  `).all(fromIso, toIso).map((row) => ({
    path: row.path || "/",
    views: Number(row.views || 0),
    visitors: Number(row.visitors || 0),
  }));

  const devices = db.prepare(`
    SELECT device_type AS device,
      COUNT(DISTINCT visitor_id) AS visitors
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ? AND event_type = 'pageview'
    GROUP BY device_type
    ORDER BY visitors DESC
  `).all(fromIso, toIso).map((row) => ({
    device: row.device || "desktop",
    visitors: Number(row.visitors || 0),
  }));

  const funnelTypes = [
    "pageview",
    "open_transaction_link",
    "create_transaction_click",
    "create_transaction_success",
    "login_success",
    "join_transaction",
  ];
  const funnel = {};
  funnelTypes.forEach((eventType) => {
    funnel[eventType] = Number(db.prepare(`
      SELECT COUNT(DISTINCT visitor_id) AS count
      FROM analytics_events
      WHERE created_at >= ? AND created_at <= ? AND event_type = ?
    `).get(fromIso, toIso, eventType)?.count || 0);
  });

  const pageviewBase = funnel.pageview || 0;
  return {
    range: {
      from: fromIso.slice(0, 10),
      to: toIso.slice(0, 10),
    },
    uniqueVisitors,
    totalPageviews,
    daily,
    referrers,
    topPages,
    devices,
    funnel,
    conversion: {
      loginRate: pageviewBase ? Number(((funnel.login_success / pageviewBase) * 100).toFixed(1)) : 0,
      transactionRate: pageviewBase ? Number(((funnel.create_transaction_success / pageviewBase) * 100).toFixed(1)) : 0,
      joinRate: pageviewBase ? Number(((funnel.join_transaction / pageviewBase) * 100).toFixed(1)) : 0,
    },
  };
}

function normalizeOtpVerificationRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: row.user_id,
    phoneNumber: row.phone_number,
    otpCodeHash: row.otp_code_hash,
    expiredAt: row.expired_at,
    attemptCount: Number(row.attempt_count || 0),
    sendCount: Number(row.send_count || 0),
    lastSentAt: row.last_sent_at,
    lockedUntil: row.locked_until || "",
    createdAt: row.created_at,
  };
}

export function logOtpVerificationAction(userId, phoneNumber, action, detail = "") {
  db.prepare(`
    INSERT INTO otp_verification_logs (user_id, phone_number, action, detail, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, phoneNumber, action, String(detail || "").slice(0, 500), new Date().toISOString());
}

export function getOtpVerificationByUserId(userId) {
  const row = db.prepare("SELECT * FROM otp_verifications WHERE user_id = ?").get(userId);
  return normalizeOtpVerificationRow(row);
}

export function upsertOtpVerification(input) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO otp_verifications (
      user_id, phone_number, otp_code_hash, expired_at, attempt_count, send_count, last_sent_at, locked_until, created_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      phone_number = excluded.phone_number,
      otp_code_hash = excluded.otp_code_hash,
      expired_at = excluded.expired_at,
      attempt_count = 0,
      send_count = excluded.send_count,
      last_sent_at = excluded.last_sent_at,
      locked_until = excluded.locked_until
  `).run(
    input.userId,
    input.phoneNumber,
    input.otpCodeHash,
    input.expiredAt,
    input.sendCount,
    input.lastSentAt,
    input.lockedUntil || "",
    now,
  );
  return getOtpVerificationByUserId(input.userId);
}

export function incrementOtpVerificationAttempt(userId) {
  db.prepare(`
    UPDATE otp_verifications
    SET attempt_count = attempt_count + 1
    WHERE user_id = ?
  `).run(userId);
  return getOtpVerificationByUserId(userId);
}

export function setOtpVerificationLock(userId, lockedUntil) {
  db.prepare(`
    UPDATE otp_verifications
    SET locked_until = ?
    WHERE user_id = ?
  `).run(lockedUntil, userId);
  return getOtpVerificationByUserId(userId);
}

export function clearOtpVerification(userId) {
  db.prepare("DELETE FROM otp_verifications WHERE user_id = ?").run(userId);
}

export function resetUserPhoneVerification(userId, detail = "Phone verification reset") {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET phone_verified = 0,
        phone_verified_at = '',
        updated_at = ?
    WHERE id = ?
  `).run(now, userId);
  clearOtpVerification(userId);
  logOtpVerificationAction(userId, "", "admin_reset", String(detail || "Phone verification reset").slice(0, 500));
  return getUserById(userId);
}

export function reconcileStalePhoneVerification(user) {
  // OTP-verified users stay unverified until KTP admin review — that is expected.
  // Phone reset on admin unverify is handled in updateUserAdminStatus("unverify").
  return user;
}

export function markUserPhoneVerified(userId, phoneNumber) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET phone_number = ?,
        phone_verified = 1,
        phone_verified_at = ?,
        whatsapp = ?,
        updated_at = ?
    WHERE id = ?
  `).run(phoneNumber, now, phoneToLocalWhatsapp(phoneNumber), now, userId);
  clearOtpVerification(userId);
  return getUserById(userId);
}

export function updateUserPhoneNumberDraft(userId, phoneNumber) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET phone_number = ?,
        updated_at = ?
    WHERE id = ?
  `).run(phoneNumber, now, userId);
  return getUserById(userId);
}

export function getLocalUploadAccessContext(uploadPath) {
  const avatarOwners = db.prepare(`
    SELECT id FROM users WHERE avatar = ?
  `).all(uploadPath);
  const ktpOwners = db.prepare(`
    SELECT id FROM users WHERE ktp_photo_url = ? OR ktp_video_url = ?
  `).all(uploadPath, uploadPath);
  const transactionRows = db.prepare(`
    SELECT DISTINCT transaction_code AS code FROM transaction_uploads WHERE file_url = ?
  `).all(uploadPath);
  const supportRows = db.prepare(`
    SELECT DISTINCT thread_id FROM support_messages WHERE attachment_url = ?
  `).all(uploadPath);
  const voucherRows = db.prepare(`
    SELECT DISTINCT order_code AS code FROM voucher_order_messages WHERE attachment_url = ?
  `).all(uploadPath);
  const voucherProofRows = db.prepare(`
    SELECT order_code AS code FROM voucher_orders WHERE payment_proof_url = ?
  `).all(uploadPath);
  const ownerUserIds = [...new Set([
    ...avatarOwners.map((row) => row.id),
    ...ktpOwners.map((row) => row.id),
  ])];
  return {
    ownerUserIds,
    avatarOwnerUserIds: avatarOwners.map((row) => row.id),
    ktpOwnerUserIds: ktpOwners.map((row) => row.id),
    transactionCodes: transactionRows.map((row) => row.code),
    supportThreadIds: supportRows.map((row) => row.thread_id),
    voucherOrderCodes: [...new Set([
      ...voucherRows.map((row) => row.code),
      ...voucherProofRows.map((row) => row.code),
    ])],
  };
}

export function usersShareAnyTransaction(userIdA, userIdB) {
  if (!userIdA || !userIdB || userIdA === userIdB) return false;
  const row = db.prepare(`
    SELECT 1 AS ok FROM transactions
    WHERE (buyer_user_id = ? AND seller_user_id = ?)
       OR (buyer_user_id = ? AND seller_user_id = ?)
    LIMIT 1
  `).get(userIdA, userIdB, userIdB, userIdA);
  return Boolean(row);
}

export function upsertPendingSellerJoin(userId, transactionCode) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pending_seller_joins (user_id, transaction_code, admin_notified, created_at)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(user_id, transaction_code) DO UPDATE SET created_at = excluded.created_at
  `).run(userId, transactionCode, now);
  return db.prepare(`
    SELECT user_id AS userId, transaction_code AS transactionCode, admin_notified AS adminNotified, created_at AS createdAt
    FROM pending_seller_joins WHERE user_id = ? AND transaction_code = ?
  `).get(userId, transactionCode);
}

export function markPendingSellerJoinNotified(userId, transactionCode) {
  db.prepare(`
    UPDATE pending_seller_joins SET admin_notified = 1 WHERE user_id = ? AND transaction_code = ?
  `).run(userId, transactionCode);
}

export function deletePendingSellerJoin(userId, transactionCode) {
  db.prepare(`DELETE FROM pending_seller_joins WHERE user_id = ? AND transaction_code = ?`).run(userId, transactionCode);
}

export function completePendingSellerJoinsForUser(userId) {
  const rows = db.prepare(`
    SELECT transaction_code AS transactionCode FROM pending_seller_joins WHERE user_id = ?
  `).all(userId);
  const joined = [];
  const user = getUserById(userId);
  if (!user || user.verificationStatus !== "verified") return joined;

  for (const row of rows) {
    const code = row.transactionCode;
    const transaction = getTransactionByCode(code);
    if (!transaction) {
      deletePendingSellerJoin(userId, code);
      continue;
    }
    if (transaction.seller || transaction.createdByRole !== "buyer") {
      deletePendingSellerJoin(userId, code);
      continue;
    }
    if (transaction.buyer?.id === userId || transaction.seller?.id === userId) {
      deletePendingSellerJoin(userId, code);
      continue;
    }
    const updated = joinTransaction(code, userId, "seller");
    if (updated) {
      joined.push(updated);
      deletePendingSellerJoin(userId, code);
    }
  }
  return joined;
}

function normalizeVoucherProductRow(row) {
  if (!row) return null;
  const product = {
    id: row.id,
    name: row.name,
    description: row.description || "",
    price: Number(row.price || 0),
    costPrice: Number(row.cost_price || 0),
    costCurrency: String(row.cost_currency || "IDR").toUpperCase(),
    costAmountOriginal: Number(row.cost_amount_original ?? row.cost_price ?? 0),
    costFxRate: Number(row.cost_fx_rate || 1),
    costFxFetchedAt: row.cost_fx_fetched_at || "",
    imageUrl: row.image_url || "",
    imageName: row.image_name || "",
    readyMode: row.ready_mode === "schedule" ? "schedule" : "24h",
    readyStart: row.ready_start || "",
    readyEnd: row.ready_end || "",
    isActive: Boolean(row.is_active),
    stock: Number(row.stock ?? -1),
    sortOrder: Number(row.sort_order || 0),
    requiresAccountLogin: Boolean(row.requires_account_login),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  product.readyState = getProductReadyState(product);
  product.displayImage = product.imageUrl || DEFAULT_VOUCHER_PRODUCT_IMAGE;
  return product;
}

function hydrateVoucherOrder(row) {
  if (!row) return null;
  const credentials = decryptVoucherCredentialFields(row);
  const credentialRow = {
    ...row,
    account_email: credentials.accountEmail,
    account_password: credentials.accountPassword,
    account_accounts: credentials.accountAccountsJson,
  };
  const product = normalizeVoucherProductRow(
    db.prepare("SELECT * FROM voucher_products WHERE id = ?").get(row.product_id),
  );
  const user = getUserById(row.user_id);
  const messages = db.prepare(`
    SELECT * FROM voucher_order_messages WHERE order_code = ? ORDER BY id ASC
  `).all(row.order_code).map((item) => ({
    id: item.id,
    senderUserId: item.sender_user_id || null,
    senderName: item.sender_name,
    senderRole: item.sender_role,
    text: item.message_text || "",
    attachmentName: item.attachment_name || "",
    attachmentUrl: item.attachment_url || "",
    attachmentType: item.attachment_type || "",
    time: item.created_at,
  }));

  return {
    id: row.id,
    orderCode: row.order_code,
    productId: row.product_id,
    userId: row.user_id,
    price: Number(row.price || 0),
    costPrice: Number(row.cost_price || 0),
    status: row.status,
    statusLabel: getVoucherStatusLabel(row.status),
    paymentProofUrl: row.payment_proof_url || "",
    paymentProofName: row.payment_proof_name || "",
    disputeReason: row.dispute_reason || "",
    cancelReason: row.cancel_reason || "",
    accountEmail: credentials.accountEmail,
    accountPassword: credentials.accountPassword,
    quantity: Math.max(1, Number(row.quantity || 1)),
    accountAccounts: parseVoucherAccountAccounts(credentialRow),
    accountRevisionRequested: Boolean(row.account_revision_requested),
    orderSource: row.order_source || "platform",
    buyerTelegram: row.buyer_telegram || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || "",
    product,
    user: user ? {
      id: user.id,
      displayName: user.displayName,
      email: user.email || "",
      avatar: user.avatar || "",
      verified: Boolean(user.verified),
    } : null,
    messages,
  };
}

export function getActiveVoucherProducts() {
  const salesRows = db.prepare(`
    SELECT product_id, COUNT(*) AS sales_count
    FROM voucher_orders
    WHERE status = 'completed'
    GROUP BY product_id
  `).all();
  const salesByProductId = new Map(
    salesRows.map((row) => [Number(row.product_id), Number(row.sales_count || 0)]),
  );
  const products = db.prepare(`
    SELECT * FROM voucher_products
    WHERE is_active = 1
    ORDER BY sort_order ASC, id DESC
  `).all().map((row) => normalizeVoucherProductRow(row));
  return applyVoucherBestsellerFlags(products, salesByProductId);
}

export function getAllVoucherProducts() {
  return db.prepare(`
    SELECT * FROM voucher_products ORDER BY sort_order ASC, id DESC
  `).all().map((row) => normalizeVoucherProductRow(row));
}

export function getVoucherProductById(productId) {
  return normalizeVoucherProductRow(
    db.prepare("SELECT * FROM voucher_products WHERE id = ?").get(productId),
  );
}

export function isVoucherProductCatalogImage(uploadPath) {
  const row = db.prepare(`
    SELECT 1 AS ok FROM voucher_products
    WHERE image_url = ? AND is_active = 1
    LIMIT 1
  `).get(String(uploadPath || "").trim());
  return Boolean(row);
}

export function createVoucherProduct(input = {}) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO voucher_products (
      name, description, price, cost_price, cost_currency, cost_amount_original, cost_fx_rate, cost_fx_fetched_at,
      image_url, image_name, ready_mode, ready_start, ready_end,
      is_active, stock, sort_order, requires_account_login, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(input.name || "").trim(),
    String(input.description || "").trim(),
    Math.max(0, Number(input.price || 0)),
    Math.max(0, Number(input.costPrice || 0)),
    String(input.costCurrency || "IDR").toUpperCase(),
    Number(input.costAmountOriginal ?? input.costPrice ?? 0),
    Number(input.costFxRate || 1),
    String(input.costFxFetchedAt || "").trim(),
    String(input.imageUrl || "").trim(),
    String(input.imageName || "").trim(),
    input.readyMode === "schedule" ? "schedule" : "24h",
    String(input.readyStart || "").trim(),
    String(input.readyEnd || "").trim(),
    input.isActive === false ? 0 : 1,
    Number.isFinite(Number(input.stock)) ? Number(input.stock) : -1,
    Number(input.sortOrder || 0),
    input.requiresAccountLogin ? 1 : 0,
    now,
    now,
  );
  return getVoucherProductById(result.lastInsertRowid);
}

export function updateVoucherProduct(productId, input = {}) {
  const current = getVoucherProductById(productId);
  if (!current) return null;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE voucher_products
    SET name = ?, description = ?, price = ?, cost_price = ?, cost_currency = ?, cost_amount_original = ?,
        cost_fx_rate = ?, cost_fx_fetched_at = ?, image_url = ?, image_name = ?,
        ready_mode = ?, ready_start = ?, ready_end = ?, is_active = ?, stock = ?,
        sort_order = ?, requires_account_login = ?, updated_at = ?
    WHERE id = ?
  `).run(
    String(input.name ?? current.name).trim(),
    String(input.description ?? current.description).trim(),
    Math.max(0, Number(input.price ?? current.price)),
    Math.max(0, Number(input.costPrice ?? current.costPrice)),
    String(input.costCurrency ?? current.costCurrency ?? "IDR").toUpperCase(),
    Number(input.costAmountOriginal ?? current.costAmountOriginal ?? input.costPrice ?? current.costPrice ?? 0),
    Number(input.costFxRate ?? current.costFxRate ?? 1),
    String(input.costFxFetchedAt ?? current.costFxFetchedAt ?? "").trim(),
    String(input.imageUrl ?? current.imageUrl).trim(),
    String(input.imageName ?? current.imageName).trim(),
    (input.readyMode ?? current.readyMode) === "schedule" ? "schedule" : "24h",
    String(input.readyStart ?? current.readyStart).trim(),
    String(input.readyEnd ?? current.readyEnd).trim(),
    (input.isActive ?? current.isActive) ? 1 : 0,
    Number.isFinite(Number(input.stock ?? current.stock)) ? Number(input.stock ?? current.stock) : -1,
    Number(input.sortOrder ?? current.sortOrder),
    (input.requiresAccountLogin ?? current.requiresAccountLogin) ? 1 : 0,
    now,
    productId,
  );
  return getVoucherProductById(productId);
}

export function deleteVoucherProduct(productId) {
  const current = getVoucherProductById(productId);
  if (!current) return false;
  db.prepare("DELETE FROM voucher_products WHERE id = ?").run(productId);
  return true;
}

export function deleteVoucherOrder(orderCode) {
  const normalized = String(orderCode || "").trim().toUpperCase();
  if (!normalized) return false;
  const current = getVoucherOrderByCode(normalized);
  if (!current) return false;
  if (shouldRestoreVoucherProductStock(current)) {
    restoreVoucherProductStock(current.productId, getVoucherOrderStockQuantity(current));
  }
  db.prepare("DELETE FROM voucher_order_messages WHERE order_code = ?").run(normalized);
  db.prepare("DELETE FROM voucher_orders WHERE order_code = ?").run(normalized);
  return true;
}

export function createVoucherOrder(userId, productId, options = {}) {
  const product = getVoucherProductById(productId);
  if (!product || !product.isActive) {
    throw new Error("Produk tidak ditemukan atau tidak aktif.");
  }
  if (!product.readyState?.canPurchase) {
    throw new Error(product.readyState?.scheduleLabel
      ? `Produk belum ready. ${product.readyState.scheduleLabel}.`
      : "Produk belum tersedia untuk dibeli.");
  }

  const quantity = Math.max(1, Math.min(20, Number(options.quantity || 1)));
  const unitPrice = Number(product.price || 0);
  const unitCost = Number(product.costPrice || 0);
  const totalPrice = unitPrice * quantity;
  const totalCost = unitCost * quantity;

  const createOrderTransaction = db.transaction(() => {
    const freshRow = db.prepare("SELECT * FROM voucher_products WHERE id = ?").get(productId);
    if (!freshRow || !freshRow.is_active) {
      throw new Error("Produk tidak ditemukan atau tidak aktif.");
    }
    const stock = Number(freshRow.stock ?? -1);
    if (stock === 0) {
      throw new Error("Stok produk habis.");
    }
    if (stock > 0 && stock < quantity) {
      throw new Error(`Stok produk hanya tersedia ${stock} pcs.`);
    }

    const now = new Date().toISOString();
    if (stock > 0) {
      const stockUpdate = db.prepare(
        "UPDATE voucher_products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?",
      ).run(quantity, now, productId, quantity);
      if (stockUpdate.changes === 0) {
        throw new Error("Stok produk tidak mencukupi. Silakan coba lagi.");
      }
    }

    let orderCode = generateVoucherOrderCode();
    while (db.prepare("SELECT 1 FROM voucher_orders WHERE order_code = ?").get(orderCode)) {
      orderCode = generateVoucherOrderCode();
    }

    db.prepare(`
      INSERT INTO voucher_orders (
        order_code, product_id, user_id, price, cost_price, quantity, status,
        account_email, account_password, account_accounts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'awaiting_payment', '', '', '[]', ?, ?)
    `).run(orderCode, productId, userId, totalPrice, totalCost, quantity, now, now);

    db.prepare(`
      INSERT INTO voucher_order_messages (
        order_code, sender_user_id, sender_name, sender_role, message_text, created_at
      ) VALUES (?, NULL, 'Admin', 'admin', ?, ?)
    `).run(
      orderCode,
      `Order voucher ${product.name} (${quantity} pcs) dibuat. Silakan transfer sesuai total harga lalu upload bukti pembayaran.`,
      now,
    );

    return orderCode;
  });

  const orderCode = createOrderTransaction();
  return hydrateVoucherOrder(db.prepare("SELECT * FROM voucher_orders WHERE order_code = ?").get(orderCode));
}

export function createManualVoucherOrder(adminUserId, payload = {}) {
  const productId = Number(payload.productId || 0);
  const product = getVoucherProductById(productId);
  if (!product || !product.isActive) {
    throw new Error("Produk tidak ditemukan atau tidak aktif.");
  }

  const buyerTelegram = String(payload.buyerTelegram || "").trim().replace(/^@+/, "");
  if (!buyerTelegram) {
    throw new Error("Username Telegram pembeli wajib diisi.");
  }

  const accountEmail = String(payload.accountEmail || "").trim();
  const accountPassword = String(payload.accountPassword || "").trim();
  if (!accountEmail || !accountEmail.includes("@")) {
    throw new Error("Email akun wajib diisi dengan format yang benar.");
  }
  if (!accountPassword) {
    throw new Error("Password akun wajib diisi.");
  }

  const quantity = 1;
  const totalPrice = Number(product.price || 0) * quantity;
  const totalCost = Number(product.costPrice || 0) * quantity;
  const accounts = [{ email: accountEmail, password: accountPassword, label: "Akun 1" }];
  const encrypted = encryptVoucherCredentialFields({
    accountEmail,
    accountPassword,
    accountAccounts: accounts,
  });

  const createManualTransaction = db.transaction(() => {
    const freshRow = db.prepare("SELECT * FROM voucher_products WHERE id = ?").get(productId);
    if (!freshRow || !freshRow.is_active) {
      throw new Error("Produk tidak ditemukan atau tidak aktif.");
    }
    const stock = Number(freshRow.stock ?? -1);
    if (stock === 0) {
      throw new Error("Stok produk habis.");
    }
    if (stock > 0 && stock < quantity) {
      throw new Error(`Stok produk hanya tersedia ${stock} pcs.`);
    }

    const now = new Date().toISOString();
    if (stock > 0) {
      const stockUpdate = db.prepare(
        "UPDATE voucher_products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?",
      ).run(quantity, now, productId, quantity);
      if (stockUpdate.changes === 0) {
        throw new Error("Stok produk tidak mencukupi. Silakan coba lagi.");
      }
    }

    let orderCode = generateVoucherOrderCode();
    while (db.prepare("SELECT 1 FROM voucher_orders WHERE order_code = ?").get(orderCode)) {
      orderCode = generateVoucherOrderCode();
    }

    db.prepare(`
      INSERT INTO voucher_orders (
        order_code, product_id, user_id, price, cost_price, quantity, status,
        account_email, account_password, account_accounts, order_source, buyer_telegram,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'manual_pending', ?, ?, ?, 'manual', ?, ?, ?)
    `).run(
      orderCode,
      productId,
      adminUserId,
      totalPrice,
      totalCost,
      quantity,
      encrypted.account_email,
      encrypted.account_password,
      encrypted.account_accounts,
      buyerTelegram,
      now,
      now,
    );

    db.prepare(`
      INSERT INTO voucher_order_messages (
        order_code, sender_user_id, sender_name, sender_role, message_text, created_at
      ) VALUES (?, NULL, 'Admin', 'admin', ?, ?)
    `).run(
      orderCode,
      `Order manual @${buyerTelegram} — ${product.name}. Menunggu proses admin.`,
      now,
    );

    return orderCode;
  });

  const orderCode = createManualTransaction();
  return hydrateVoucherOrder(db.prepare("SELECT * FROM voucher_orders WHERE order_code = ?").get(orderCode));
}

export function updateVoucherOrderAccounts(orderCode, accounts = []) {
  const current = getVoucherOrderByCode(orderCode);
  if (!current) return null;
  if (!current.product?.requiresAccountLogin) {
    throw new Error("Produk ini tidak membutuhkan data akun subscription.");
  }
  const normalized = normalizeVoucherAccountPayload(accounts, Math.max(1, Number(current.quantity || 1)));
  const now = new Date().toISOString();
  const first = normalized[0] || { email: "", password: "" };
  const encrypted = encryptVoucherCredentialFields({
    accountEmail: first.email,
    accountPassword: first.password,
    accountAccounts: normalized,
  });
  db.prepare(`
    UPDATE voucher_orders
    SET account_accounts = ?, account_email = ?, account_password = ?, account_revision_requested = 0, updated_at = ?
    WHERE order_code = ?
  `).run(encrypted.account_accounts, encrypted.account_email, encrypted.account_password, now, orderCode);
  return getVoucherOrderByCode(orderCode);
}

export function getVoucherOrderByCode(orderCode) {
  return hydrateVoucherOrder(
    db.prepare("SELECT * FROM voucher_orders WHERE order_code = ?").get(String(orderCode || "").toUpperCase()),
  );
}

export function getVoucherOrdersByUserId(userId) {
  return db.prepare(`
    SELECT * FROM voucher_orders
    WHERE user_id = ?
      AND COALESCE(order_source, 'platform') != 'manual'
    ORDER BY created_at DESC
  `).all(userId).map((row) => hydrateVoucherOrder(row));
}

export function getAllVoucherOrders() {
  return db.prepare(`
    SELECT * FROM voucher_orders ORDER BY created_at DESC
  `).all().map((row) => hydrateVoucherOrder(row));
}

export function updateVoucherOrderFields(orderCode, fields = {}) {
  const current = getVoucherOrderByCode(orderCode);
  if (!current) return null;
  const now = new Date().toISOString();
  const nextStatus = fields.status ?? current.status;
  if (nextStatus === "cancelled" && current.status !== "cancelled" && shouldRestoreVoucherProductStock(current)) {
    restoreVoucherProductStock(current.productId, getVoucherOrderStockQuantity(current));
  }
  db.prepare(`
    UPDATE voucher_orders
    SET status = ?, payment_proof_url = ?, payment_proof_name = ?,
        dispute_reason = ?, cancel_reason = ?, account_revision_requested = ?,
        completed_at = ?, updated_at = ?
    WHERE order_code = ?
  `).run(
    nextStatus,
    fields.paymentProofUrl ?? current.paymentProofUrl,
    fields.paymentProofName ?? current.paymentProofName,
    fields.disputeReason ?? current.disputeReason,
    fields.cancelReason ?? current.cancelReason,
    fields.accountRevisionRequested !== undefined
      ? (fields.accountRevisionRequested ? 1 : 0)
      : (current.accountRevisionRequested ? 1 : 0),
    fields.completedAt !== undefined ? fields.completedAt : (current.completedAt || ""),
    now,
    orderCode,
  );
  return getVoucherOrderByCode(orderCode);
}

export function addVoucherOrderMessage(orderCode, senderUserId, senderName, senderRole, messageText, attachment = {}) {
  const current = getVoucherOrderByCode(orderCode);
  if (!current) return null;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO voucher_order_messages (
      order_code, sender_user_id, sender_name, sender_role, message_text,
      attachment_name, attachment_url, attachment_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderCode,
    senderUserId || null,
    senderName,
    senderRole,
    messageText || "",
    attachment.attachmentName || "",
    attachment.attachmentUrl || "",
    attachment.attachmentType || "",
    now,
  );
  db.prepare("UPDATE voucher_orders SET updated_at = ? WHERE order_code = ?").run(now, orderCode);
  return getVoucherOrderByCode(orderCode);
}

export function getVoucherOrderOwnerUserId(orderCode) {
  const row = db.prepare("SELECT user_id FROM voucher_orders WHERE order_code = ?").get(orderCode);
  return row?.user_id || null;
}

export function getVoucherSalesReport(fromDate = "", toDate = "") {
  const from = String(fromDate || "").trim();
  const to = String(toDate || "").trim();
  if (!from || !to) {
    throw new Error("Rentang tanggal wajib diisi.");
  }
  const rows = db.prepare(`
    SELECT * FROM voucher_orders
    WHERE status = 'completed'
      AND date(COALESCE(NULLIF(completed_at, ''), updated_at)) >= date(?)
      AND date(COALESCE(NULLIF(completed_at, ''), updated_at)) <= date(?)
    ORDER BY COALESCE(NULLIF(completed_at, ''), updated_at) DESC
  `).all(from, to);
  const productMap = new Map();
  let summary = { totalOrders: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
  rows.forEach((row) => {
    const order = hydrateVoucherOrder(row);
    const sellPrice = Number(order.price || 0);
    const costPrice = Number(order.costPrice || order.product?.costPrice || 0);
    const profit = sellPrice - costPrice;
    const key = order.productId;
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: order.productId,
        productName: order.product?.name || `Produk #${order.productId}`,
        imageUrl: order.product?.displayImage || "",
        orderCount: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        orders: [],
      });
    }
    const group = productMap.get(key);
    group.orderCount += 1;
    group.totalRevenue += sellPrice;
    group.totalCost += costPrice;
    group.totalProfit += profit;
    group.orders.push({
      orderCode: order.orderCode,
      userName: getVoucherBuyerDisplayName(order),
      orderSource: order.orderSource || "platform",
      paymentProofUrl: order.paymentProofUrl || "",
      paymentProofName: order.paymentProofName || "",
      sellPrice,
      costPrice,
      profit,
      completedAt: order.completedAt || order.updatedAt,
    });
    summary = {
      totalOrders: summary.totalOrders + 1,
      totalRevenue: summary.totalRevenue + sellPrice,
      totalCost: summary.totalCost + costPrice,
      totalProfit: summary.totalProfit + profit,
    };
  });
  return {
    fromDate: from,
    toDate: to,
    summary,
    products: Array.from(productMap.values()).sort((a, b) => b.totalProfit - a.totalProfit),
  };
}

migratePlaintextVoucherCredentials(
  async (orderCode, encrypted) => {
    db.prepare(`
      UPDATE voucher_orders
      SET account_email = ?, account_password = ?, account_accounts = ?
      WHERE order_code = ?
    `).run(encrypted.account_email, encrypted.account_password, encrypted.account_accounts, orderCode);
  },
  async () => db.prepare(`
    SELECT order_code, account_email, account_password, account_accounts
    FROM voucher_orders
    WHERE account_email != '' OR account_password != '' OR account_accounts NOT IN ('', '[]')
  `).all(),
).then((count) => {
  if (count > 0) {
    console.log(`[voucher-crypto] ${count} order voucher — kredensial dienkripsi.`);
  }
}).catch((error) => {
  console.error("[voucher-crypto] Migrasi enkripsi gagal:", error.message);
  if (process.env.NODE_ENV === "production") {
    throw error;
  }
});
