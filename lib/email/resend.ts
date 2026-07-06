import { Resend } from "resend";

let resendClient: Resend | null = null;

export function isEmailEnabled(): boolean {
  return Boolean(String(process.env.RESEND_API_KEY || "").trim());
}

export function getResendClient(): Resend | null {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getEmailFromAddress(): string {
  const address = String(process.env.EMAIL_FROM || "noreply@rekberwe.id").trim();
  const name = String(process.env.EMAIL_FROM_NAME || "RekberWe.id").trim();
  return `${name} <${address}>`;
}

export function getAdminEmailAddress(): string {
  return String(process.env.ADMIN_EMAIL || "admin@rekberwe.id").trim();
}
