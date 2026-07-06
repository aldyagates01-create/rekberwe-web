import type { SessionUser } from "@/lib/types";

export type WhatsappOtpState = {
  phoneNumber: string;
  phoneDisplay: string;
  phoneVerified: boolean;
  phoneVerifiedAt: string;
  pending: boolean;
  sendCount: number;
  attemptCount: number;
  resendCooldownSeconds: number;
  lockedUntil: string;
  lockRemainingSeconds: number;
  canResend: boolean;
  canVerify: boolean;
  resendDisabled: boolean;
  maxResendReached: boolean;
};

export type WhatsappStatusResponse = {
  user: SessionUser;
  state: WhatsappOtpState;
};

async function fetchWhatsappJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(payload.message || "Permintaan gagal.") as Error & { state?: WhatsappOtpState };
    error.state = payload.state;
    throw error;
  }
  return payload as T;
}

export async function getWhatsappStatus() {
  return fetchWhatsappJson<WhatsappStatusResponse>("/api/me/whatsapp/status");
}

export async function sendWhatsappOtp(phoneNumber: string) {
  return fetchWhatsappJson<WhatsappStatusResponse & { message: string }>("/api/me/whatsapp/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyWhatsappOtp(otp: string) {
  return fetchWhatsappJson<WhatsappStatusResponse & { message: string }>("/api/me/whatsapp/verify-otp", {
    method: "POST",
    body: JSON.stringify({ otp }),
  });
}

export async function changeWhatsappNumber(phoneNumber: string) {
  return fetchWhatsappJson<WhatsappStatusResponse & { message: string }>("/api/me/whatsapp/change-number", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export const OTP_LOCK_MESSAGE = "Kode OTP belum masuk? Pastikan nomor WhatsApp aktif, tidak salah input, dan memiliki koneksi internet. Anda dapat mencoba lagi dalam 10 menit atau menghubungi admin untuk verifikasi manual.";

export const OTP_SUPPORT_MESSAGE = "Saya mengalami kendala OTP WhatsApp tidak masuk setelah 3 kali percobaan. Mohon bantu verifikasi nomor saya.";
