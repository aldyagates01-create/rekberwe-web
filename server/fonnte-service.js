import { phoneToFonnteTarget } from "./phone-utils.js";

export function buildOtpWhatsAppMessage(otp) {
  return `🔐 RekberWe.id

Kode Verifikasi Anda:

${otp}

Kode berlaku selama 5 menit.

Jangan berikan kode ini kepada siapa pun, termasuk admin RekberWe.`;
}

export async function sendFonnteWhatsApp(normalizedPhone, message) {
  const token = String(process.env.FONNTE_TOKEN || "").trim();
  if (!token) {
    throw new Error("FONNTE_TOKEN belum dikonfigurasi di server.");
  }

  const body = new URLSearchParams();
  body.set("target", phoneToFonnteTarget(normalizedPhone));
  body.set("message", message);
  body.set("countryCode", "62");

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.status === false) {
    const reason = payload.reason || payload.message || `Fonnte HTTP ${response.status}`;
    throw new Error(reason);
  }

  return payload;
}
