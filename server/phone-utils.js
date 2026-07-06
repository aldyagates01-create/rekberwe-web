import crypto from "node:crypto";

export function normalizePhoneNumber(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (!/^8\d{8,11}$/.test(digits)) {
    return null;
  }
  return `62${digits}`;
}

export function formatPhoneDisplay(normalized) {
  if (!normalized) return "";
  const digits = String(normalized).replace(/\D/g, "");
  if (digits.startsWith("62")) {
    return `+${digits}`;
  }
  return `+62${digits.replace(/^0/, "")}`;
}

export function phoneToFonnteTarget(normalizedPhone) {
  return phoneToLocalWhatsapp(normalizedPhone);
}

export function phoneToLocalWhatsapp(normalizedPhone) {
  const digits = String(normalizedPhone || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return String(normalizedPhone || "");
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtpCode(otp, userId) {
  const pepper = String(process.env.OTP_SECRET || process.env.SESSION_SECRET || "rekberwe-otp-pepper");
  return crypto.createHmac("sha256", pepper).update(`${userId}:${otp}`).digest("hex");
}
