import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

import Database from "better-sqlite3";

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
      verified_provider, verified, ktp, whatsapp, ktp_photo_url, ktp_video_url, ktp_photo_name, ktp_video_name, created_at, updated_at
    ) VALUES (
      @id, @provider, @social_id, @username, @display_name, @legal_name, @email, @avatar, @profile_url,
      @verified_provider, @verified, @ktp, @whatsapp, @ktp_photo_url, @ktp_video_url, @ktp_photo_name, @ktp_video_name, @created_at, @updated_at
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
  statements.updateProfile.run({
    id,
    display_name: displayName,
    legal_name: locked ? current.legalName : legalName,
    whatsapp: locked ? current.whatsapp : whatsapp,
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
    sender_name: "System",
    sender_user_id: null,
    message_text: `Transaksi dibuat. Bagikan link kepada lawan transaksi untuk bergabung. Wajib baca syarat & ketentuan: /terms dan panduan pengamanan akun: /security-guide`,
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
  };
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
  };
}
