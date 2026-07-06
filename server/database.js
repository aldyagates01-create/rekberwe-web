import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import Database from "better-sqlite3";
import pg from "pg";

import * as sqliteDb from "./database.sqlite.js";
import { phoneToLocalWhatsapp } from "./phone-utils.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "").trim();
const postgresEnabled = Boolean(databaseUrl);
const postgresSsl = String(process.env.DATABASE_SSL || "true").trim().toLowerCase() !== "false";
const sqliteImportEnabled = String(process.env.MIGRATE_SQLITE_ON_BOOT || "").trim().toLowerCase() === "true";
const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const sqliteImportPath = path.resolve(process.env.SQLITE_IMPORT_PATH || path.join(dataDir, "rekberwe.sqlite"));

const pool = postgresEnabled
  ? new Pool({
    connectionString: databaseUrl,
    ssl: postgresSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
  })
  : null;

let readyPromise = null;

export async function upsertUser(user) {
  if (!postgresEnabled) return sqliteDb.upsertUser(user);
  await ensureReady();
  const now = new Date().toISOString();
  const existing = await getUserRowById(user.id);
  await query(
    `
      INSERT INTO users (
        id, provider, social_id, username, display_name, legal_name, email, avatar, profile_url,
      verified_provider, verified, verification_status, verification_submitted_at, verified_at,
      ktp, whatsapp, verification_note, banned, banned_reason, ktp_photo_url, ktp_video_url, ktp_photo_name, ktp_video_name, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (id) DO UPDATE SET
        provider = EXCLUDED.provider,
        social_id = EXCLUDED.social_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        legal_name = CASE WHEN users.legal_name = '' THEN EXCLUDED.legal_name ELSE users.legal_name END,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        profile_url = EXCLUDED.profile_url,
        verified_provider = EXCLUDED.verified_provider,
        verified = EXCLUDED.verified,
        ktp = EXCLUDED.ktp,
        whatsapp = EXCLUDED.whatsapp,
        verification_note = EXCLUDED.verification_note,
        banned = EXCLUDED.banned,
        banned_reason = EXCLUDED.banned_reason,
        ktp_photo_url = EXCLUDED.ktp_photo_url,
        ktp_video_url = EXCLUDED.ktp_video_url,
        ktp_photo_name = EXCLUDED.ktp_photo_name,
        ktp_video_name = EXCLUDED.ktp_video_name,
        updated_at = EXCLUDED.updated_at
    `,
    [
      user.id,
      user.provider,
      user.socialId,
      user.username,
      user.displayName,
      existing?.legal_name || user.legalName || user.displayName,
      user.email || "",
      user.avatar || "",
      user.profileUrl || "",
      Boolean(user.verifiedProvider),
      Boolean(existing?.verified || user.verified),
      existing?.verification_status || (existing?.verified || user.verified ? "verified" : "unverified"),
      existing?.verification_submitted_at || null,
      existing?.verified_at || null,
      existing?.ktp || user.ktp || "",
      existing?.whatsapp || user.whatsapp || "",
      existing?.verification_note || user.verificationNote || "",
      Boolean(existing?.banned || user.banned),
      existing?.banned_reason || user.bannedReason || "",
      existing?.ktp_photo_url || user.ktpPhotoUrl || "",
      existing?.ktp_video_url || user.ktpVideoUrl || "",
      existing?.ktp_photo_name || user.ktpPhotoName || "",
      existing?.ktp_video_name || user.ktpVideoName || "",
      existing?.created_at || now,
      now,
    ],
  );
  await linkProviderToUser(user.id, user.provider, user.socialId, user.username, user.email || "");
  return getUserById(user.id);
}

export async function getUserById(id) {
  if (!postgresEnabled) return sqliteDb.getUserById(id);
  await ensureReady();
  const row = await getUserRowById(id);
  return row ? mapUser(row) : null;
}

export async function getAllUsers() {
  if (!postgresEnabled) return sqliteDb.getAllUsers();
  await ensureReady();
  const rows = await queryRows("SELECT * FROM users ORDER BY updated_at DESC");
  return Promise.all(rows.map((row) => mapUser(row)));
}

export async function getUserByProviderSocial(provider, socialId) {
  if (!postgresEnabled) return sqliteDb.getUserByProviderSocial(provider, socialId);
  await ensureReady();
  const linked = await queryOne("SELECT * FROM linked_providers WHERE provider = $1 AND social_id = $2", [provider, socialId]);
  if (linked) return getUserById(linked.user_id);
  const direct = await queryOne("SELECT * FROM users WHERE provider = $1 AND social_id = $2", [provider, socialId]);
  return direct ? mapUser(direct) : null;
}

export async function updateUserVerification(id, legalName, ktp, whatsapp, attachments = {}) {
  if (!postgresEnabled) return sqliteDb.updateUserVerification(id, legalName, ktp, whatsapp, attachments);
  await ensureReady();
  await query(
    `
      UPDATE users
      SET verified = FALSE,
          verification_status = 'pending',
          legal_name = $2,
          ktp = $3,
          whatsapp = $4,
          ktp_photo_url = $5,
          ktp_video_url = $6,
          ktp_photo_name = $7,
          ktp_video_name = $8,
          verification_submitted_at = $9,
          updated_at = $9
      WHERE id = $1
    `,
    [
      id,
      legalName,
      ktp,
      whatsapp,
      attachments.ktpPhotoUrl || "",
      attachments.ktpVideoUrl || "",
      attachments.ktpPhotoName || "",
      attachments.ktpVideoName || "",
      new Date().toISOString(),
    ],
  );
  return getUserById(id);
}

export async function reviewUserVerification(id, action, note = "") {
  if (!postgresEnabled) return sqliteDb.reviewUserVerification(id, action, note);
  await ensureReady();
  const current = await getUserById(id);
  if (!current) return null;
  const approved = action === "approve";
  await query(
    `
      UPDATE users
      SET verified = $2,
          verification_status = $3,
          verified_at = $4,
          verification_note = $5,
          updated_at = $6
      WHERE id = $1
    `,
    [id, approved, approved ? "verified" : "revision_required", approved ? new Date().toISOString() : null, approved ? "" : String(note || "").trim(), new Date().toISOString()],
  );
  return getUserById(id);
}

export async function updateUserProfile(id, displayName, legalName, whatsapp) {
  if (!postgresEnabled) return sqliteDb.updateUserProfile(id, displayName, legalName, whatsapp);
  await ensureReady();
  const current = await getUserById(id);
  const locked = current?.verificationStatus === "verified";
  const phoneLocked = Boolean(current?.phoneVerified);
  await query(
    `
      UPDATE users
      SET display_name = $2,
          legal_name = $3,
          whatsapp = $4,
          updated_at = $5
      WHERE id = $1
    `,
    [id, displayName, locked ? current.legalName : legalName, locked || phoneLocked ? current.whatsapp : whatsapp, new Date().toISOString()],
  );
  return getUserById(id);
}

export async function updateUserVerificationFiles(id, attachments = {}) {
  if (!postgresEnabled) return sqliteDb.updateUserVerificationFiles(id, attachments);
  await ensureReady();
  await query(
    `
      UPDATE users
      SET ktp_photo_url = COALESCE(NULLIF($2, ''), ktp_photo_url),
          ktp_video_url = COALESCE(NULLIF($3, ''), ktp_video_url),
          ktp_photo_name = COALESCE(NULLIF($4, ''), ktp_photo_name),
          ktp_video_name = COALESCE(NULLIF($5, ''), ktp_video_name),
          updated_at = $6
      WHERE id = $1
    `,
    [
      id,
      attachments.ktpPhotoUrl || "",
      attachments.ktpVideoUrl || "",
      attachments.ktpPhotoName || "",
      attachments.ktpVideoName || "",
      new Date().toISOString(),
    ],
  );
  return getUserById(id);
}

export async function saveUserLocation(userId, location) {
  if (!postgresEnabled) return sqliteDb.saveUserLocation(userId, location);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    `
      INSERT INTO user_locations (
        user_id, latitude, longitude, accuracy, location_timestamp, ip_address, user_agent, consent_text, consent_time, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10
      )
      ON CONFLICT (user_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy = EXCLUDED.accuracy,
        location_timestamp = EXCLUDED.location_timestamp,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        consent_text = EXCLUDED.consent_text,
        consent_time = EXCLUDED.consent_time,
        updated_at = EXCLUDED.updated_at
    `,
    [
      userId,
      Number(location.latitude || 0),
      Number(location.longitude || 0),
      Number(location.accuracy || 0),
      String(location.locationTimestamp || "").trim(),
      String(location.ipAddress || "").trim(),
      String(location.userAgent || "").trim(),
      String(location.consentText || "").trim(),
      String(location.consentTime || "").trim(),
      now,
    ],
  );
  return getUserLocationByUserId(userId);
}

export async function getUserLocationByUserId(userId) {
  if (!postgresEnabled) return sqliteDb.getUserLocationByUserId(userId);
  await ensureReady();
  const row = await queryOne("SELECT * FROM user_locations WHERE user_id = $1", [userId]);
  if (!row) return null;
  return {
    userId: row.user_id,
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    accuracy: Number(row.accuracy || 0),
    locationTimestamp: toIsoString(row.location_timestamp),
    ipAddress: row.ip_address || "",
    userAgent: row.user_agent || "",
    consentText: row.consent_text || "",
    consentTime: toIsoString(row.consent_time),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function updateUserAdminStatus(id, action, reason = "") {
  if (!postgresEnabled) return sqliteDb.updateUserAdminStatus(id, action, reason);
  await ensureReady();
  const current = await getUserById(id);
  if (!current) return null;
  const next = {
    verified: Boolean(current.verified),
    verificationStatus: current.verificationStatus || "unverified",
    verifiedAt: current.verifiedAt || null,
    verificationNote: current.verificationNote || "",
    banned: Boolean(current.banned),
    bannedReason: current.bannedReason || "",
  };
  if (action === "ban") {
    next.banned = true;
    next.bannedReason = String(reason || "").trim();
  } else if (action === "unban") {
    next.banned = false;
    next.bannedReason = "";
  } else if (action === "unverify") {
    next.verified = false;
    next.verificationStatus = "unverified";
    next.verifiedAt = null;
    next.verificationNote = String(reason || "").trim();
  }
  await query(
    `
      UPDATE users
      SET verified = $2,
          verification_status = $3,
          verified_at = $4,
          verification_note = $5,
          banned = $6,
          banned_reason = $7,
          updated_at = $8
      WHERE id = $1
    `,
    [id, next.verified, next.verificationStatus, next.verifiedAt, next.verificationNote, next.banned, next.bannedReason, new Date().toISOString()],
  );
  if (action === "unverify") {
    return resetUserPhoneVerification(id, "Admin unverify akun");
  }
  return getUserById(id);
}

export async function linkProviderToUser(userId, provider, socialId, username, email) {
  if (!postgresEnabled) return sqliteDb.linkProviderToUser(userId, provider, socialId, username, email);
  await ensureReady();
  await query(
    `
      INSERT INTO linked_providers (user_id, provider, social_id, username, email, linked_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (provider, social_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        username = EXCLUDED.username,
        email = EXCLUDED.email
    `,
    [userId, provider, socialId, username, email || "", new Date().toISOString()],
  );
}

export async function getLinkedProvidersForUser(userId) {
  if (!postgresEnabled) return sqliteDb.getLinkedProvidersForUser(userId);
  await ensureReady();
  const rows = await queryRows("SELECT * FROM linked_providers WHERE user_id = $1 ORDER BY provider ASC", [userId]);
  return rows.map((row) => ({
    provider: row.provider,
    socialId: row.social_id,
    username: row.username,
    email: row.email,
    linkedAt: toIsoString(row.linked_at),
  }));
}

export async function createTransaction(input) {
  if (!postgresEnabled) return sqliteDb.createTransaction(input);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    `
      INSERT INTO transactions (
        code, title, price, type, warranty, seller_payout_account, seller_payout_bank_name, seller_payout_bank_number, seller_payout_bank_holder, fee_payer, payment_status, created_by_role,
        buyer_user_id, seller_user_id, fee_amount, admin_funds_received, buyer_confirmed_received,
        seller_payout_sent, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, FALSE, FALSE,
        FALSE, $16, $16
      )
    `,
    [
      input.code,
      input.title,
      input.price,
      input.type,
      input.warranty,
      input.sellerPayoutAccount || "",
      input.sellerBankName || "",
      input.sellerBankNumber || "",
      input.sellerBankHolder || "",
      input.feePayer,
      input.paymentStatus,
      input.createdByRole,
      input.buyerUserId || null,
      input.sellerUserId || null,
      input.feeAmount || 0,
      now,
    ],
  );
  await query(
    `
      INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
      VALUES ($1, 'RekberWE.id', NULL, $2, $3)
    `,
    [
      input.code,
      `Transaksi ${input.code} berhasil dibuat.\n\nBagikan link ini ke lawan transaksi agar mereka bisa masuk dan memilih role:\n${input.shareLink || `/?trx=${input.code}`}\n\nWajib baca syarat & ketentuan: /terms dan panduan pengamanan akun: /security-guide`,
      now,
    ],
  );
  return getTransactionByCode(input.code);
}

export async function getAllTransactions() {
  if (!postgresEnabled) return sqliteDb.getAllTransactions();
  await ensureReady();
  const rows = await queryRows("SELECT * FROM transactions ORDER BY created_at DESC");
  return hydrateTransactions(rows);
}

export async function getTransactionsForUser(userId) {
  if (!postgresEnabled) return sqliteDb.getTransactionsForUser(userId);
  await ensureReady();
  const rows = await queryRows(
    `
      SELECT * FROM transactions
      WHERE buyer_user_id = $1 OR seller_user_id = $1
      ORDER BY updated_at DESC
    `,
    [userId],
  );
  return hydrateTransactions(rows);
}

export async function getTransactionByCode(code) {
  if (!postgresEnabled) return sqliteDb.getTransactionByCode(code);
  await ensureReady();
  const row = await queryOne("SELECT * FROM transactions WHERE code = $1", [code]);
  if (!row) return null;
  const items = await hydrateTransactions([row]);
  return items[0] || null;
}

export async function joinTransaction(code, userId, role) {
  if (!postgresEnabled) return sqliteDb.joinTransaction(code, userId, role);
  await ensureReady();
  await query(
    `
      UPDATE transactions
      SET buyer_user_id = COALESCE($2, buyer_user_id),
          seller_user_id = COALESCE($3, seller_user_id),
          updated_at = $4
      WHERE code = $1
    `,
    [code, role === "buyer" ? userId : null, role === "seller" ? userId : null, new Date().toISOString()],
  );
  const joined = await getTransactionByCode(code);
  const user = await getUserById(userId);
  if (joined && user) {
    await query(
      `
        INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
        VALUES ($1, 'System', NULL, $2, $3)
      `,
      [code, `${user.displayName} bergabung sebagai ${role === "buyer" ? "pembeli" : "penjual"}. Mohon baca syarat & ketentuan: /terms dan panduan pengamanan akun: /security-guide`, new Date().toISOString()],
    );
  }
  return getTransactionByCode(code);
}

export async function addTransactionMessage(code, senderUserId, senderName, messageText) {
  if (!postgresEnabled) return sqliteDb.addTransactionMessage(code, senderUserId, senderName, messageText);
  await ensureReady();
  await query(
    `
      INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [code, senderName, senderUserId, messageText, new Date().toISOString()],
  );
  return getTransactionByCode(code);
}

export async function addStoredTransactionUpload(code, senderUserId, senderName, fileName, storedName, fileUrl) {
  if (!postgresEnabled) return sqliteDb.addStoredTransactionUpload(code, senderUserId, senderName, fileName, storedName, fileUrl);
  await ensureReady();
  await query(
    `
      INSERT INTO transaction_uploads (transaction_code, file_name, stored_name, file_url, sender_name, sender_user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [code, fileName, storedName, fileUrl, senderName, senderUserId, new Date().toISOString()],
  );
  return getTransactionByCode(code);
}

export async function updateTransactionStatus(code, paymentStatus, systemMessage) {
  if (!postgresEnabled) return sqliteDb.updateTransactionStatus(code, paymentStatus, systemMessage);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    "UPDATE transactions SET payment_status = $2, updated_at = $3 WHERE code = $1",
    [code, paymentStatus, now],
  );
  if (systemMessage) {
    await query(
      `
        INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
        VALUES ($1, 'System', NULL, $2, $3)
      `,
      [code, systemMessage, now],
    );
  }
  return getTransactionByCode(code);
}

export async function updateTransactionWorkflow(code, workflow) {
  if (!postgresEnabled) return sqliteDb.updateTransactionWorkflow(code, workflow);
  await ensureReady();
  const current = await getTransactionByCode(code);
  if (!current) return null;
  await query(
    `
      UPDATE transactions
      SET payment_status = $2,
          admin_funds_received = $3,
          buyer_confirmed_received = $4,
          seller_payout_sent = $5,
          seller_payout_account = $6,
          seller_payout_bank_name = $7,
          seller_payout_bank_number = $8,
          seller_payout_bank_holder = $9,
          updated_at = $10
      WHERE code = $1
    `,
    [
      code,
      workflow.paymentStatus || current.paymentStatus,
      workflow.adminFundsReceived ?? Boolean(current.adminFundsReceived),
      workflow.buyerConfirmedReceived ?? Boolean(current.buyerConfirmedReceived),
      workflow.sellerPayoutSent ?? Boolean(current.sellerPayoutSent),
      workflow.sellerPayoutAccount ?? current.sellerPayoutAccount ?? "",
      workflow.sellerBankName ?? current.sellerBankName ?? "",
      workflow.sellerBankNumber ?? current.sellerBankNumber ?? "",
      workflow.sellerBankHolder ?? current.sellerBankHolder ?? "",
      new Date().toISOString(),
    ],
  );
  if (workflow.systemMessage) {
    await query(
      `
        INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
        VALUES ($1, 'RekberWE.id', NULL, $2, $3)
      `,
      [code, workflow.systemMessage, new Date().toISOString()],
    );
  }
  return getTransactionByCode(code);
}

export async function deleteTransactionByCode(code) {
  if (!postgresEnabled) return sqliteDb.deleteTransactionByCode(code);
  await ensureReady();
  const transaction = await getTransactionByCode(code);
  if (!transaction) return null;
  await query("DELETE FROM transaction_messages WHERE transaction_code = $1", [code]);
  await query("DELETE FROM transaction_uploads WHERE transaction_code = $1", [code]);
  await query("DELETE FROM transactions WHERE code = $1", [code]);
  return transaction;
}

export async function addAdminTransactionMessage(code, messageText) {
  if (!postgresEnabled) return sqliteDb.addAdminTransactionMessage(code, messageText);
  await ensureReady();
  await query(
    `
      INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
      VALUES ($1, 'RekberWE.id', NULL, $2, $3)
    `,
    [code, messageText, new Date().toISOString()],
  );
  return getTransactionByCode(code);
}

export async function updateSellerPayoutDetails(code, details) {
  if (!postgresEnabled) return sqliteDb.updateSellerPayoutDetails(code, details);
  await ensureReady();
  const current = await getTransactionByCode(code);
  if (!current) return null;
  const account = `${String(details.bankName || "").trim()} ${String(details.bankNumber || "").trim()} a.n ${String(details.bankHolder || "").trim()}`.trim();
  await query(
    `
      UPDATE transactions
      SET seller_payout_account = $2,
          seller_payout_bank_name = $3,
          seller_payout_bank_number = $4,
          seller_payout_bank_holder = $5,
          updated_at = $6
      WHERE code = $1
    `,
    [code, account, details.bankName || "", details.bankNumber || "", details.bankHolder || "", new Date().toISOString()],
  );
  await query(
    `
      INSERT INTO transaction_messages (transaction_code, sender_name, sender_user_id, message_text, created_at)
      VALUES ($1, 'RekberWE.id', NULL, $2, $3)
    `,
    [code, `Penjual sudah mengirim data rekening penerimaan dana:\nBank: ${details.bankName}\nNo Rekening: ${details.bankNumber}\nAtas Nama: ${details.bankHolder}`, new Date().toISOString()],
  );
  return getTransactionByCode(code);
}

export async function getAdminFeeSettings() {
  if (!postgresEnabled) return sqliteDb.getAdminFeeSettings();
  await ensureReady();
  const adminPayoutSetting = await queryOne("SELECT * FROM app_settings WHERE setting_key = 'admin_payout_account'");
  const row = await queryOne("SELECT * FROM app_settings WHERE setting_key = 'fee_settings'");
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

export async function saveAdminFeeSettings(input) {
  if (!postgresEnabled) return sqliteDb.saveAdminFeeSettings(input);
  await ensureReady();
  const current = await getAdminFeeSettings();
  const normalized = normalizeFeeSettings({ ...current, ...(input || {}) });
  const updatedAt = new Date().toISOString();
  await query(
    `
      INSERT INTO app_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = EXCLUDED.updated_at
    `,
    ["fee_settings", JSON.stringify(normalized), updatedAt],
  );
  await query(
    `
      INSERT INTO app_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = EXCLUDED.updated_at
    `,
    ["admin_payout_account", normalized.adminPayoutAccount || "", updatedAt],
  );
  return normalized;
}

export async function getSupportThreadForUser(userId) {
  if (!postgresEnabled) return sqliteDb.getSupportThreadForUser(userId);
  await ensureReady();
  let row = await queryOne("SELECT * FROM support_threads WHERE user_id = $1", [userId]);
  if (!row) {
    const now = new Date().toISOString();
    await query(
      "INSERT INTO support_threads (user_id, status, created_at, updated_at) VALUES ($1, 'open', $2, $2)",
      [userId, now],
    );
    row = await queryOne("SELECT * FROM support_threads WHERE user_id = $1", [userId]);
  }
  return hydrateSupportThread(row);
}

export async function getSupportThreadForGuest(guestKey) {
  const key = String(guestKey || "").trim();
  if (!key) return null;
  return getSupportThreadForUser(`guest:${key}`);
}

export async function getAllSupportThreads() {
  if (!postgresEnabled) return sqliteDb.getAllSupportThreads();
  await ensureReady();
  const rows = await queryRows("SELECT * FROM support_threads ORDER BY updated_at DESC");
  return Promise.all(rows.map((row) => hydrateSupportThread(row)));
}

export async function addSupportThreadMessage(threadId, senderUserId, senderName, senderRole, messageText, attachment = {}) {
  if (!postgresEnabled) return sqliteDb.addSupportThreadMessage(threadId, senderUserId, senderName, senderRole, messageText, attachment);
  await ensureReady();
  const current = await queryOne("SELECT * FROM support_threads WHERE id = $1", [threadId]);
  if (!current) return null;
  const now = new Date().toISOString();
  await query(
    "INSERT INTO support_messages (thread_id, sender_user_id, sender_name, sender_role, message_text, attachment_name, attachment_url, attachment_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [threadId, senderUserId || null, senderName, senderRole, messageText, attachment.attachmentName || '', attachment.attachmentUrl || '', attachment.attachmentType || '', now],
  );
  await query("UPDATE support_threads SET status = 'open', updated_at = $2 WHERE id = $1", [threadId, now]);
  return hydrateSupportThread(await queryOne("SELECT * FROM support_threads WHERE id = $1", [threadId]));
}

export async function updateSupportThreadStatus(threadId, status) {
  if (!postgresEnabled) return sqliteDb.updateSupportThreadStatus(threadId, status);
  await ensureReady();
  const current = await queryOne("SELECT * FROM support_threads WHERE id = $1", [threadId]);
  if (!current) return null;
  await query("UPDATE support_threads SET status = $2, updated_at = $3 WHERE id = $1", [threadId, status || current.status || "open", new Date().toISOString()]);
  return hydrateSupportThread(await queryOne("SELECT * FROM support_threads WHERE id = $1", [threadId]));
}

async function ensureReady() {
  if (!postgresEnabled) return;
  if (!readyPromise) {
    readyPromise = initializePostgres();
  }
  await readyPromise;
}

async function initializePostgres() {
  await query(`
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
      verified_provider BOOLEAN DEFAULT FALSE,
      verified BOOLEAN DEFAULT FALSE,
      verification_status TEXT DEFAULT 'unverified',
      verification_submitted_at TIMESTAMPTZ NULL,
      verified_at TIMESTAMPTZ NULL,
      ktp TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      verification_note TEXT DEFAULT '',
      banned BOOLEAN DEFAULT FALSE,
      banned_reason TEXT DEFAULT '',
      ktp_photo_url TEXT DEFAULT '',
      ktp_video_url TEXT DEFAULT '',
      ktp_photo_name TEXT DEFAULT '',
      ktp_video_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS linked_providers (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      social_id TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT DEFAULT '',
      linked_at TIMESTAMPTZ NOT NULL,
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
      buyer_user_id TEXT NULL,
      seller_user_id TEXT NULL,
      fee_amount INTEGER DEFAULT 0,
      admin_funds_received BOOLEAN DEFAULT FALSE,
      buyer_confirmed_received BOOLEAN DEFAULT FALSE,
      seller_payout_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_messages (
      id BIGSERIAL PRIMARY KEY,
      transaction_code TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_user_id TEXT NULL,
      message_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_uploads (
      id BIGSERIAL PRIMARY KEY,
      transaction_code TEXT NOT NULL,
      file_name TEXT NOT NULL,
      stored_name TEXT DEFAULT '',
      file_url TEXT DEFAULT '',
      sender_name TEXT NOT NULL,
      sender_user_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_locations (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION DEFAULT 0,
      location_timestamp TIMESTAMPTZ NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      consent_text TEXT DEFAULT '',
      consent_time TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_threads (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id BIGSERIAL PRIMARY KEY,
      thread_id BIGINT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
      sender_user_id TEXT DEFAULT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message_text TEXT NOT NULL,
      attachment_name TEXT DEFAULT '',
      attachment_url TEXT DEFAULT '',
      attachment_type TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'user',
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      path TEXT DEFAULT '',
      referrer_source TEXT DEFAULT '',
      referrer_url TEXT DEFAULT '',
      transaction_code TEXT DEFAULT '',
      user_id TEXT DEFAULT NULL,
      device_type TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_social ON users(provider, social_id);
    CREATE INDEX IF NOT EXISTS idx_linked_user ON linked_providers(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_transaction ON transaction_messages(transaction_code, id);
    CREATE INDEX IF NOT EXISTS idx_uploads_transaction ON transaction_uploads(transaction_code, id);
    CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id, id);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, audience);
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_photo_url TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_video_url TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_photo_name TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_video_name TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_note TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ NULL;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_payout_bank_name TEXT DEFAULT '';
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_payout_bank_number TEXT DEFAULT '';
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_payout_bank_holder TEXT DEFAULT '';
    ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT '';
    ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT '';
    ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT DEFAULT '';
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      phone_number TEXT NOT NULL,
      otp_code_hash TEXT NOT NULL,
      expired_at TIMESTAMPTZ NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      send_count INTEGER DEFAULT 1,
      last_sent_at TIMESTAMPTZ NOT NULL,
      locked_until TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_verification_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_otp_verifications_user ON otp_verifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_otp_logs_user ON otp_verification_logs(user_id, created_at);
  `);

  if (sqliteImportEnabled) {
    await migrateFromSqliteIfNeeded();
  }
}

async function migrateFromSqliteIfNeeded() {
  if (!fs.existsSync(sqliteImportPath)) return;
  const existingUserCount = await queryValue("SELECT COUNT(*)::int AS count FROM users");
  if (Number(existingUserCount || 0) > 0) return;

  const sqlite = new Database(sqliteImportPath, { readonly: true });
  try {
    const users = sqlite.prepare("SELECT * FROM users").all();
    const linkedProviders = sqlite.prepare("SELECT * FROM linked_providers").all();
    const transactions = sqlite.prepare("SELECT * FROM transactions").all();
    const messages = sqlite.prepare("SELECT * FROM transaction_messages").all();
    const uploads = sqlite.prepare("SELECT * FROM transaction_uploads").all();
    const settings = sqlite.prepare("SELECT * FROM app_settings").all();

    for (const row of users) {
      await query(
        `
          INSERT INTO users (
            id, provider, social_id, username, display_name, legal_name, email, avatar, profile_url,
            verified_provider, verified, verification_status, verification_submitted_at, verified_at,
            ktp, whatsapp, verification_note, banned, banned_reason, ktp_photo_url, ktp_video_url, ktp_photo_name, ktp_video_name, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,
            $10,$11,$12,$13,$14,
            $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
          )
          ON CONFLICT (id) DO NOTHING
        `,
        [
          row.id,
          row.provider,
          row.social_id,
          row.username,
          row.display_name,
          row.legal_name || "",
          row.email || "",
          row.avatar || "",
          row.profile_url || "",
          Boolean(row.verified_provider),
          Boolean(row.verified),
          row.verification_status || (row.verified ? "verified" : "unverified"),
          row.verification_submitted_at || null,
          row.verified_at || null,
          row.ktp || "",
          row.whatsapp || "",
          row.verification_note || "",
          Boolean(row.banned),
          row.banned_reason || "",
          row.ktp_photo_url || "",
          row.ktp_video_url || "",
          row.ktp_photo_name || "",
          row.ktp_video_name || "",
          row.created_at,
          row.updated_at,
        ],
      );
    }

    for (const row of linkedProviders) {
      await query(
        `
          INSERT INTO linked_providers (id, user_id, provider, social_id, username, email, linked_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (provider, social_id) DO NOTHING
        `,
        [row.id, row.user_id, row.provider, row.social_id, row.username, row.email || "", row.linked_at],
      );
    }

    for (const row of transactions) {
      await query(
        `
          INSERT INTO transactions (
            code, title, price, type, warranty, seller_payout_account, fee_payer, payment_status,
            created_by_role, buyer_user_id, seller_user_id, fee_amount, admin_funds_received,
            buyer_confirmed_received, seller_payout_sent, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
          )
          ON CONFLICT (code) DO NOTHING
        `,
        [
          row.code,
          row.title,
          row.price,
          row.type,
          row.warranty,
          row.seller_payout_account || "",
          row.fee_payer,
          row.payment_status,
          row.created_by_role,
          row.buyer_user_id || null,
          row.seller_user_id || null,
          Number(row.fee_amount || 0),
          Boolean(row.admin_funds_received),
          Boolean(row.buyer_confirmed_received),
          Boolean(row.seller_payout_sent),
          row.created_at,
          row.updated_at,
        ],
      );
    }

    for (const row of messages) {
      await query(
        `
          INSERT INTO transaction_messages (id, transaction_code, sender_name, sender_user_id, message_text, created_at)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT DO NOTHING
        `,
        [row.id, row.transaction_code, row.sender_name, row.sender_user_id || null, row.message_text, row.created_at],
      );
    }

    for (const row of uploads) {
      await query(
        `
          INSERT INTO transaction_uploads (id, transaction_code, file_name, stored_name, file_url, sender_name, sender_user_id, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT DO NOTHING
        `,
        [
          row.id,
          row.transaction_code,
          row.file_name,
          row.stored_name || "",
          row.file_url || "",
          row.sender_name,
          row.sender_user_id || null,
          row.created_at,
        ],
      );
    }

    for (const row of settings) {
      await query(
        `
          INSERT INTO app_settings (setting_key, setting_value, updated_at)
          VALUES ($1,$2,$3)
          ON CONFLICT (setting_key) DO NOTHING
        `,
        [row.setting_key, row.setting_value, row.updated_at],
      );
    }

    await query(`
      SELECT setval(pg_get_serial_sequence('linked_providers', 'id'), COALESCE((SELECT MAX(id) FROM linked_providers), 1), true);
      SELECT setval(pg_get_serial_sequence('transaction_messages', 'id'), COALESCE((SELECT MAX(id) FROM transaction_messages), 1), true);
      SELECT setval(pg_get_serial_sequence('transaction_uploads', 'id'), COALESCE((SELECT MAX(id) FROM transaction_uploads), 1), true);
    `);
  } finally {
    sqlite.close();
  }
}

async function hydrateTransactions(rows) {
  if (!rows.length) return [];
  const userIds = new Set();
  rows.forEach((row) => {
    if (row.buyer_user_id) userIds.add(row.buyer_user_id);
    if (row.seller_user_id) userIds.add(row.seller_user_id);
  });

  const users = await getUsersMap([...userIds]);
  const feeSettings = await getAdminFeeSettings();
  const codes = rows.map((row) => row.code);
  const messagesRows = await queryRows(
    "SELECT * FROM transaction_messages WHERE transaction_code = ANY($1::text[]) ORDER BY id ASC",
    [codes],
  );
  const uploadsRows = await queryRows(
    "SELECT * FROM transaction_uploads WHERE transaction_code = ANY($1::text[]) ORDER BY id ASC",
    [codes],
  );

  const messagesByCode = new Map();
  const uploadsByCode = new Map();
  messagesRows.forEach((row) => {
    const list = messagesByCode.get(row.transaction_code) || [];
    list.push(row);
    messagesByCode.set(row.transaction_code, list);
  });
  uploadsRows.forEach((row) => {
    const list = uploadsByCode.get(row.transaction_code) || [];
    list.push(row);
    uploadsByCode.set(row.transaction_code, list);
  });

  const result = [];
  for (const row of rows) {
    const buyer = row.buyer_user_id ? users.get(row.buyer_user_id) || null : null;
    const seller = row.seller_user_id ? users.get(row.seller_user_id) || null : null;
    const participants = { buyer, seller };
    const uploads = [];
    for (const item of uploadsByCode.get(row.code) || []) {
      const meta = await resolveSenderMeta(item.sender_name, item.sender_user_id, participants);
      uploads.push({
        id: item.id,
        name: item.file_name,
        storedName: item.stored_name || "",
        url: item.file_url || "",
        sender: meta.name,
        senderUserId: item.sender_user_id,
        senderTitle: meta.title,
        senderVerified: meta.verified,
        time: toIsoString(item.created_at),
      });
    }
    const messages = [];
    for (const item of messagesByCode.get(row.code) || []) {
      const meta = await resolveSenderMeta(item.sender_name, item.sender_user_id, participants);
      messages.push({
        id: item.id,
        sender: meta.name,
        senderUserId: item.sender_user_id,
        senderTitle: meta.title,
        senderVerified: meta.verified,
        text: item.message_text,
        time: toIsoString(item.created_at),
      });
    }

    result.push({
      code: row.code,
      title: row.title,
      price: Number(row.price),
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
      createdAt: toIsoString(row.created_at),
      warrantyDays: parseWarrantyDays(row.warranty),
      warrantyEndsAt: buildWarrantyEndsAt(toIsoString(row.created_at), row.warranty),
      adminPayoutAccount: feeSettings.adminPayoutAccount || "",
      buyer,
      seller,
      settlement: buildSettlementSummary(Number(row.price), row.fee_payer, Number(row.fee_amount || 0)),
      uploads,
      messages,
    });
  }
  return result;
}

async function hydrateSupportThread(row) {
  if (!row) return null;
  const user = row.user_id ? await getUserById(row.user_id) : null;
  const messageRows = await queryRows("SELECT * FROM support_messages WHERE thread_id = $1 ORDER BY id ASC", [row.id]);
  return {
    id: Number(row.id),
    userId: row.user_id,
    status: row.status || "open",
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    user,
    messages: messageRows.map((item) => ({
      id: Number(item.id),
      senderUserId: item.sender_user_id,
      sender: item.sender_name,
      senderRole: item.sender_role,
      text: item.message_text,
      attachmentName: item.attachment_name || "",
      attachmentUrl: item.attachment_url || "",
      attachmentType: item.attachment_type || "",
      time: toIsoString(item.created_at),
    })),
  };
}

async function resolveSenderMeta(senderName, senderUserId, participants) {
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
  const user = await getUserById(senderUserId);
  return {
    name: user?.displayName || senderName || "Pengguna",
    title: "Peserta",
    verified: Boolean(user?.verified),
  };
}

async function getUsersMap(ids) {
  const filtered = ids.filter(Boolean);
  if (!filtered.length) return new Map();
  const rows = await queryRows("SELECT * FROM users WHERE id = ANY($1::text[])", [filtered]);
  const mapped = await Promise.all(rows.map((row) => mapUser(row)));
  return new Map(mapped.map((user) => [user.id, user]));
}

async function getUserRowById(id) {
  return queryOne("SELECT * FROM users WHERE id = $1", [id]);
}

async function mapUser(row) {
  const location = await getUserLocationByUserId(row.id);
  const user = {
    id: row.id,
    provider: row.provider,
    socialId: row.social_id,
    username: row.username,
    displayName: row.display_name,
    legalName: row.legal_name || row.display_name,
    email: row.email || "",
    avatar: row.avatar || "",
    profileUrl: row.profile_url || "",
    verifiedProvider: Boolean(row.verified_provider),
    verified: Boolean(row.verified),
    verificationStatus: row.verification_status || (row.verified ? "verified" : "unverified"),
    verificationSubmittedAt: toIsoString(row.verification_submitted_at),
    verifiedAt: toIsoString(row.verified_at),
    ktp: row.ktp || "",
    whatsapp: row.whatsapp || "",
    phoneNumber: row.phone_number || row.whatsapp || "",
    phoneVerified: Boolean(row.phone_verified),
    phoneVerifiedAt: toIsoString(row.phone_verified_at),
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
  user.linkedProviders = await getLinkedProvidersForUser(user.id);
  return user;
}

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

async function queryRows(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryRows(sql, params);
  return rows[0] || null;
}

async function queryValue(sql, params = []) {
  const row = await queryOne(sql, params);
  if (!row) return null;
  return row[Object.keys(row)[0]];
}

function toIsoString(value) {
  if (!value) return "";
  return new Date(value).toISOString();
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

function normalizePushSubscriptionRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: row.user_id,
    audience: row.audience || "user",
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent || "",
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function upsertPushSubscription(userId, audience, subscription, userAgent = "") {
  if (!postgresEnabled) return sqliteDb.upsertPushSubscription(userId, audience, subscription, userAgent);
  await ensureReady();
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();
  if (!userId || !endpoint || !p256dh || !auth) return null;
  const now = new Date().toISOString();
  await query(
    `
      INSERT INTO push_subscriptions (user_id, audience, endpoint, p256dh, auth, user_agent, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        audience = EXCLUDED.audience,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        updated_at = EXCLUDED.updated_at
    `,
    [userId, audience || "user", endpoint, p256dh, auth, userAgent, now],
  );
  return normalizePushSubscriptionRow(await queryOne("SELECT * FROM push_subscriptions WHERE endpoint = $1", [endpoint]));
}

export async function removePushSubscription(userId, endpoint) {
  if (!postgresEnabled) return sqliteDb.removePushSubscription(userId, endpoint);
  await ensureReady();
  const result = await query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [userId, endpoint]);
  return (result.rowCount || 0) > 0;
}

export async function removePushSubscriptionByEndpoint(endpoint) {
  if (!postgresEnabled) return sqliteDb.removePushSubscriptionByEndpoint(endpoint);
  await ensureReady();
  const result = await query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
  return (result.rowCount || 0) > 0;
}

export async function getPushSubscriptionsForUser(userId, audience = "user") {
  if (!postgresEnabled) return sqliteDb.getPushSubscriptionsForUser(userId, audience);
  await ensureReady();
  const rows = await queryRows("SELECT * FROM push_subscriptions WHERE user_id = $1 AND audience = $2", [userId, audience || "user"]);
  return rows.map(normalizePushSubscriptionRow);
}

export async function getAdminPushSubscriptions(adminUserIds = []) {
  if (!postgresEnabled) return sqliteDb.getAdminPushSubscriptions(adminUserIds);
  await ensureReady();
  const ids = Array.from(adminUserIds || []).filter(Boolean);
  if (!ids.length) {
    const rows = await queryRows("SELECT * FROM push_subscriptions WHERE audience = 'admin'");
    return rows.map(normalizePushSubscriptionRow);
  }
  const rows = await queryRows(
    "SELECT * FROM push_subscriptions WHERE audience = 'admin' AND user_id = ANY($1::text[])",
    [ids],
  );
  return rows.map(normalizePushSubscriptionRow);
}

export async function recordAnalyticsEvent(input) {
  if (!postgresEnabled) return sqliteDb.recordAnalyticsEvent(input);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    `
      INSERT INTO analytics_events (
        visitor_id, event_type, path, referrer_source, referrer_url, transaction_code, user_id, device_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      String(input.visitorId || "").trim(),
      String(input.eventType || "").trim(),
      String(input.path || "").slice(0, 500),
      String(input.referrerSource || "direct").slice(0, 40),
      String(input.referrerUrl || "").slice(0, 500),
      String(input.transactionCode || "").slice(0, 40).toUpperCase(),
      input.userId ? String(input.userId) : null,
      String(input.deviceType || "").slice(0, 20),
      now,
    ],
  );
}

export async function getAnalyticsSummary(fromInput, toInput) {
  if (!postgresEnabled) return sqliteDb.getAnalyticsSummary(fromInput, toInput);
  await ensureReady();
  const from = fromInput ? new Date(`${fromInput}T00:00:00.000`) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  const to = toInput ? new Date(`${toInput}T23:59:59.999`) : new Date();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const uniqueVisitors = Number((await queryOne(`
    SELECT COUNT(DISTINCT visitor_id) AS count
    FROM analytics_events
    WHERE created_at >= $1 AND created_at <= $2 AND event_type = 'pageview'
  `, [fromIso, toIso]))?.count || 0);

  const totalPageviews = Number((await queryOne(`
    SELECT COUNT(*) AS count
    FROM analytics_events
    WHERE created_at >= $1 AND created_at <= $2 AND event_type = 'pageview'
  `, [fromIso, toIso]))?.count || 0);

  const dailyRows = await queryRows(`
    SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
      COUNT(DISTINCT visitor_id) AS visitors,
      SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END) AS pageviews
    FROM analytics_events
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY day
    ORDER BY day ASC
  `, [fromIso, toIso]);

  const referrerRows = await queryRows(`
    SELECT referrer_source AS source,
      COUNT(*) AS count,
      COUNT(DISTINCT visitor_id) AS visitors
    FROM analytics_events
    WHERE created_at >= $1 AND created_at <= $2 AND event_type = 'pageview'
    GROUP BY referrer_source
    ORDER BY count DESC
  `, [fromIso, toIso]);

  const topPageRows = await queryRows(`
    SELECT path,
      COUNT(*) AS views,
      COUNT(DISTINCT visitor_id) AS visitors
    FROM analytics_events
    WHERE created_at >= $1 AND created_at <= $2 AND event_type = 'pageview'
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10
  `, [fromIso, toIso]);

  const deviceRows = await queryRows(`
    SELECT device_type AS device,
      COUNT(DISTINCT visitor_id) AS visitors
    FROM analytics_events
    WHERE created_at >= $1 AND created_at <= $2 AND event_type = 'pageview'
    GROUP BY device_type
    ORDER BY visitors DESC
  `, [fromIso, toIso]);

  const funnelTypes = [
    "pageview",
    "open_transaction_link",
    "create_transaction_click",
    "create_transaction_success",
    "login_success",
    "join_transaction",
  ];
  const funnel = {};
  for (const eventType of funnelTypes) {
    funnel[eventType] = Number((await queryOne(`
      SELECT COUNT(DISTINCT visitor_id) AS count
      FROM analytics_events
      WHERE created_at >= $1 AND created_at <= $2 AND event_type = $3
    `, [fromIso, toIso, eventType]))?.count || 0);
  }

  const pageviewBase = funnel.pageview || 0;
  return {
    range: {
      from: fromIso.slice(0, 10),
      to: toIso.slice(0, 10),
    },
    uniqueVisitors,
    totalPageviews,
    daily: dailyRows.map((row) => ({
      date: row.day,
      visitors: Number(row.visitors || 0),
      pageviews: Number(row.pageviews || 0),
    })),
    referrers: referrerRows.map((row) => ({
      source: row.source || "direct",
      count: Number(row.count || 0),
      visitors: Number(row.visitors || 0),
    })),
    topPages: topPageRows.map((row) => ({
      path: row.path || "/",
      views: Number(row.views || 0),
      visitors: Number(row.visitors || 0),
    })),
    devices: deviceRows.map((row) => ({
      device: row.device || "desktop",
      visitors: Number(row.visitors || 0),
    })),
    funnel,
    conversion: {
      loginRate: pageviewBase ? Number(((funnel.login_success / pageviewBase) * 100).toFixed(1)) : 0,
      transactionRate: pageviewBase ? Number(((funnel.create_transaction_success / pageviewBase) * 100).toFixed(1)) : 0,
      joinRate: pageviewBase ? Number(((funnel.join_transaction / pageviewBase) * 100).toFixed(1)) : 0,
    },
  };
}

export async function logOtpVerificationAction(userId, phoneNumber, action, detail = "") {
  if (!postgresEnabled) return sqliteDb.logOtpVerificationAction(userId, phoneNumber, action, detail);
  await ensureReady();
  await query(
    "INSERT INTO otp_verification_logs (user_id, phone_number, action, detail, created_at) VALUES ($1, $2, $3, $4, $5)",
    [userId, phoneNumber, action, String(detail || "").slice(0, 500), new Date().toISOString()],
  );
}

export async function getOtpVerificationByUserId(userId) {
  if (!postgresEnabled) return sqliteDb.getOtpVerificationByUserId(userId);
  await ensureReady();
  const row = await queryOne("SELECT * FROM otp_verifications WHERE user_id = $1", [userId]);
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: row.user_id,
    phoneNumber: row.phone_number,
    otpCodeHash: row.otp_code_hash,
    expiredAt: toIsoString(row.expired_at),
    attemptCount: Number(row.attempt_count || 0),
    sendCount: Number(row.send_count || 0),
    lastSentAt: toIsoString(row.last_sent_at),
    lockedUntil: toIsoString(row.locked_until),
    createdAt: toIsoString(row.created_at),
  };
}

export async function upsertOtpVerification(input) {
  if (!postgresEnabled) return sqliteDb.upsertOtpVerification(input);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    `
      INSERT INTO otp_verifications (
        user_id, phone_number, otp_code_hash, expired_at, attempt_count, send_count, last_sent_at, locked_until, created_at
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        otp_code_hash = EXCLUDED.otp_code_hash,
        expired_at = EXCLUDED.expired_at,
        attempt_count = 0,
        send_count = EXCLUDED.send_count,
        last_sent_at = EXCLUDED.last_sent_at,
        locked_until = EXCLUDED.locked_until
    `,
    [
      input.userId,
      input.phoneNumber,
      input.otpCodeHash,
      input.expiredAt,
      input.sendCount,
      input.lastSentAt,
      input.lockedUntil || null,
      now,
    ],
  );
  return getOtpVerificationByUserId(input.userId);
}

export async function incrementOtpVerificationAttempt(userId) {
  if (!postgresEnabled) return sqliteDb.incrementOtpVerificationAttempt(userId);
  await ensureReady();
  await query("UPDATE otp_verifications SET attempt_count = attempt_count + 1 WHERE user_id = $1", [userId]);
  return getOtpVerificationByUserId(userId);
}

export async function setOtpVerificationLock(userId, lockedUntil) {
  if (!postgresEnabled) return sqliteDb.setOtpVerificationLock(userId, lockedUntil);
  await ensureReady();
  await query("UPDATE otp_verifications SET locked_until = $1 WHERE user_id = $2", [lockedUntil, userId]);
  return getOtpVerificationByUserId(userId);
}

export async function clearOtpVerification(userId) {
  if (!postgresEnabled) return sqliteDb.clearOtpVerification(userId);
  await ensureReady();
  await query("DELETE FROM otp_verifications WHERE user_id = $1", [userId]);
}

export async function resetUserPhoneVerification(userId, detail = "Phone verification reset") {
  if (!postgresEnabled) return sqliteDb.resetUserPhoneVerification(userId, detail);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    `
      UPDATE users
      SET phone_verified = FALSE,
          phone_verified_at = NULL,
          updated_at = $2
      WHERE id = $1
    `,
    [userId, now],
  );
  await clearOtpVerification(userId);
  await logOtpVerificationAction(userId, "", "admin_reset", String(detail || "Phone verification reset").slice(0, 500));
  return getUserById(userId);
}

export async function reconcileStalePhoneVerification(user) {
  if (!postgresEnabled) return sqliteDb.reconcileStalePhoneVerification(user);
  return user;
}

export async function markUserPhoneVerified(userId, phoneNumber) {
  if (!postgresEnabled) return sqliteDb.markUserPhoneVerified(userId, phoneNumber);
  await ensureReady();
  const now = new Date().toISOString();
  await query(
    `
      UPDATE users
      SET phone_number = $2,
          phone_verified = TRUE,
          phone_verified_at = $3,
          whatsapp = $4,
          updated_at = $3
      WHERE id = $1
    `,
    [userId, phoneNumber, now, phoneToLocalWhatsapp(phoneNumber)],
  );
  await clearOtpVerification(userId);
  return getUserById(userId);
}

export async function updateUserPhoneNumberDraft(userId, phoneNumber) {
  if (!postgresEnabled) return sqliteDb.updateUserPhoneNumberDraft(userId, phoneNumber);
  await ensureReady();
  const now = new Date().toISOString();
  await query("UPDATE users SET phone_number = $2, updated_at = $3 WHERE id = $1", [userId, phoneNumber, now]);
  return getUserById(userId);
}
