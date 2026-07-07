import {
  clearOtpVerification,
  getOtpVerificationByUserId,
  getUserById,
  incrementOtpVerificationAttempt,
  logOtpVerificationAction,
  markUserPhoneVerified,
  setOtpVerificationLock,
  updateUserPhoneNumberDraft,
  upsertOtpVerification,
} from "./database.js";
import { buildOtpWhatsAppMessage, sendFonnteWhatsApp } from "./fonnte-service.js";
import {
  formatPhoneDisplay,
  generateOtpCode,
  hashOtpCode,
  normalizePhoneNumber,
} from "./phone-utils.js";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESEND_COUNT = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function buildOtpState(user, record) {
  const phoneNumber = user.phoneNumber || user.whatsapp || "";
  const base = {
    phoneNumber,
    phoneDisplay: formatPhoneDisplay(phoneNumber || normalizePhoneNumber(phoneNumber)),
    phoneVerified: Boolean(user.phoneVerified),
    phoneVerifiedAt: user.phoneVerifiedAt || "",
    pending: false,
    sendCount: 0,
    attemptCount: 0,
    resendCooldownSeconds: 0,
    lockedUntil: "",
    lockRemainingSeconds: 0,
    canResend: false,
    canVerify: false,
    resendDisabled: false,
    maxResendReached: false,
  };

  if (user.phoneVerified) {
    return base;
  }

  if (!record) {
    return {
      ...base,
      canResend: true,
    };
  }

  const lockedUntilMs = record.lockedUntil ? new Date(record.lockedUntil).getTime() : 0;
  const lastSentMs = record.lastSentAt ? new Date(record.lastSentAt).getTime() : 0;
  const lockRemainingSeconds = lockedUntilMs > nowMs() ? Math.ceil((lockedUntilMs - nowMs()) / 1000) : 0;
  const resendCooldownSeconds = lastSentMs > 0
    ? Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - (nowMs() - lastSentMs)) / 1000))
    : 0;
  const maxResendReached = Number(record.sendCount || 0) >= MAX_RESEND_COUNT;
  const isLocked = lockRemainingSeconds > 0;
  const active = isOtpRecordActive(record);

  return {
    ...base,
    phoneNumber: record.phoneNumber || phoneNumber,
    phoneDisplay: formatPhoneDisplay(record.phoneNumber || phoneNumber),
    pending: active,
    sendCount: Number(record.sendCount || 0),
    attemptCount: Number(record.attemptCount || 0),
    resendCooldownSeconds,
    lockedUntil: record.lockedUntil || "",
    lockRemainingSeconds,
    canResend: !isLocked && !maxResendReached && resendCooldownSeconds <= 0,
    canVerify: active && !isLocked && Number(record.attemptCount || 0) < MAX_VERIFY_ATTEMPTS,
    resendDisabled: isLocked || maxResendReached || resendCooldownSeconds > 0,
    maxResendReached: maxResendReached && isLocked,
  };
}

export async function getWhatsappOtpStatus(userId) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("Pengguna tidak ditemukan.");
  }
  const record = await getOtpVerificationByUserId(userId);
  return {
    user,
    state: buildOtpState(user, record),
  };
}

function isOtpRecordActive(record) {
  if (!record) return false;
  if (record.lockedUntil && new Date(record.lockedUntil).getTime() > nowMs()) return false;
  return new Date(record.expiredAt).getTime() > nowMs();
}

export async function sendWhatsappOtp(userId, rawPhone, options = {}) {
  const forceResend = Boolean(options.forceResend);
  const user = await getUserById(userId);
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  if (user.phoneVerified) {
    throw new Error("Nomor WhatsApp sudah terverifikasi.");
  }

  const normalized = normalizePhoneNumber(rawPhone || user.phoneNumber || user.whatsapp);
  if (!normalized) {
    throw new Error("Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx.");
  }

  const existing = await getOtpVerificationByUserId(userId);
  const phoneChanged = existing && existing.phoneNumber !== normalized;
  let sendCount = phoneChanged ? 0 : Number(existing?.sendCount || 0);
  let lockedUntil = phoneChanged ? "" : (existing?.lockedUntil || "");

  if (lockedUntil && new Date(lockedUntil).getTime() > nowMs()) {
    const error = new Error("Pengiriman OTP terkunci sementara. Coba lagi nanti atau hubungi admin.");
    error.code = "OTP_LOCKED";
    error.state = buildOtpState(user, existing);
    throw error;
  }

  if (!phoneChanged && existing && sendCount >= MAX_RESEND_COUNT) {
    const lockUntilIso = new Date(nowMs() + LOCK_DURATION_MS).toISOString();
    await setOtpVerificationLock(userId, lockUntilIso);
    await logOtpVerificationAction(userId, normalized, "lockout", "Maksimal 3 kali kirim ulang OTP.");
    const lockedRecord = await getOtpVerificationByUserId(userId);
    const error = new Error("Kode OTP belum masuk setelah 3 kali percobaan. Coba lagi dalam 10 menit atau hubungi admin.");
    error.code = "OTP_MAX_RESEND";
    error.state = buildOtpState(user, lockedRecord);
    throw error;
  }

  if (!forceResend && existing && !phoneChanged && isOtpRecordActive(existing)) {
    return {
      user,
      state: buildOtpState(user, existing),
      message: "Kode OTP masih aktif. Gunakan kode dari pesan WhatsApp terbaru.",
    };
  }

  if (existing && !phoneChanged) {
    const lastSentMs = new Date(existing.lastSentAt).getTime();
    const cooldownLeft = RESEND_COOLDOWN_MS - (nowMs() - lastSentMs);
    if (forceResend && cooldownLeft > 0) {
      const error = new Error(`Tunggu ${Math.ceil(cooldownLeft / 1000)} detik sebelum kirim ulang OTP.`);
      error.code = "OTP_COOLDOWN";
      error.state = buildOtpState(user, existing);
      throw error;
    }
  }

  const otp = generateOtpCode();
  const expiredAt = new Date(nowMs() + OTP_EXPIRY_MS).toISOString();
  const lastSentAt = new Date().toISOString();
  sendCount += 1;

  await updateUserPhoneNumberDraft(userId, normalized);

  try {
    await sendFonnteWhatsApp(normalized, buildOtpWhatsAppMessage(otp));
  } catch (error) {
    await logOtpVerificationAction(userId, normalized, "send_failed", String(error.message || "send_failed").slice(0, 500));
    throw error;
  }

  const record = await upsertOtpVerification({
    userId,
    phoneNumber: normalized,
    otpCodeHash: hashOtpCode(otp, userId),
    expiredAt,
    sendCount,
    lastSentAt,
    lockedUntil: phoneChanged ? "" : lockedUntil,
  });

  await logOtpVerificationAction(userId, normalized, "send", `send_count=${sendCount}`);

  const refreshedUser = await getUserById(userId);
  return {
    user: refreshedUser,
    state: buildOtpState(refreshedUser, record),
    message: "Kode OTP telah dikirim ke WhatsApp Anda.",
  };
}

export async function verifyWhatsappOtp(userId, rawOtp) {
  const user = await getUserById(userId);
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  if (user.phoneVerified) {
    throw new Error("Nomor WhatsApp sudah terverifikasi.");
  }

  const otp = String(rawOtp || "").trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new Error("OTP harus 6 digit angka.");
  }

  const record = await getOtpVerificationByUserId(userId);
  if (!record) {
    throw new Error("Tidak ada OTP aktif. Silakan kirim OTP terlebih dahulu.");
  }

  if (record.lockedUntil && new Date(record.lockedUntil).getTime() > nowMs()) {
    const error = new Error("Verifikasi OTP terkunci sementara. Coba lagi nanti atau hubungi admin.");
    error.code = "OTP_LOCKED";
    error.state = buildOtpState(user, record);
    throw error;
  }

  if (new Date(record.expiredAt).getTime() <= nowMs()) {
    throw new Error("OTP sudah kedaluwarsa. Silakan kirim ulang OTP.");
  }

  if (Number(record.attemptCount || 0) >= MAX_VERIFY_ATTEMPTS) {
    throw new Error("Percobaan OTP melebihi batas. Silakan kirim ulang OTP.");
  }

  const expectedHash = hashOtpCode(otp, userId);
  if (expectedHash !== record.otpCodeHash) {
    const updated = await incrementOtpVerificationAttempt(userId);
    const attemptCount = Number(updated?.attemptCount || 0);
    if (attemptCount >= MAX_VERIFY_ATTEMPTS) {
      const lockUntilIso = new Date(nowMs() + LOCK_DURATION_MS).toISOString();
      await setOtpVerificationLock(userId, lockUntilIso);
      await logOtpVerificationAction(userId, record.phoneNumber, "lockout", `verify_attempts=${attemptCount}`);
      const lockedRecord = await getOtpVerificationByUserId(userId);
      const error = new Error("Percobaan OTP melebihi batas. Verifikasi terkunci 10 menit. Silakan kirim ulang OTP nanti.");
      error.code = "OTP_LOCKED";
      error.state = buildOtpState(user, lockedRecord);
      throw error;
    }
    await logOtpVerificationAction(userId, record.phoneNumber, "verify_failed", `attempt=${attemptCount}`);
    const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - attemptCount);
    throw new Error(`OTP salah. Gunakan kode dari pesan WhatsApp paling baru. Sisa percobaan: ${remaining}.`);
  }

  const verifiedUser = await markUserPhoneVerified(userId, record.phoneNumber);
  await logOtpVerificationAction(userId, record.phoneNumber, "verify_success", "phone_verified");
  return {
    user: verifiedUser,
    state: buildOtpState(verifiedUser, null),
    message: "Nomor WhatsApp berhasil diverifikasi.",
  };
}

export async function resetWhatsappOtpPhone(userId, rawPhone) {
  const user = await getUserById(userId);
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  if (user.phoneVerified) {
    throw new Error("Nomor WhatsApp sudah terverifikasi.");
  }
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }
  await clearOtpVerification(userId);
  const updated = await updateUserPhoneNumberDraft(userId, normalized);
  await logOtpVerificationAction(userId, normalized, "change_number", "User mengganti nomor WhatsApp.");
  return {
    user: updated,
    state: buildOtpState(updated, null),
    message: "Nomor WhatsApp diperbarui. Silakan kirim OTP lagi.",
  };
}
