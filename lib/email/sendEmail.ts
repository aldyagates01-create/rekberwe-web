import { getAdminEmailAddress, getEmailFromAddress, getResendClient, isEmailEnabled } from "./resend.ts";
import {
  buildAdminVerifiedEmail,
  buildDisputeOpenedEmail,
  buildFundsReleasedEmail,
  buildFundsSecuredEmail,
  buildItemDeliveredEmail,
  buildRegistrationSuccessEmail,
  buildSellerFundsReceivedEmail,
  buildTestEmail,
  buildTransactionCreatedEmail,
  buildVoucherAccountRevisionEmail,
  buildVoucherOrderCompletedEmail,
  buildVoucherOrderProcessingEmail,
  buildVoucherVerificationCodeEmail,
} from "./templates.ts";

export type EmailUserLike = {
  email?: string | null;
  displayName?: string | null;
  linkedProviders?: Array<{ email?: string | null; provider?: string | null }> | null;
};

export type EmailTransactionLike = {
  code: string;
  title?: string | null;
  price?: number | null;
  buyer?: EmailUserLike | null;
  seller?: EmailUserLike | null;
};

export type EmailVoucherOrderLike = {
  orderCode: string;
  price?: number | null;
  quantity?: number | null;
  product?: { name?: string | null } | null;
  user?: EmailUserLike | null;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  event: string;
};

function logEmailResult(to: string, event: string, status: "sent" | "skipped" | "failed", detail = "") {
  const timestamp = formatDateWib(new Date());
  const suffix = detail ? ` detail=${detail}` : "";
  console.log(`[email] ${timestamp} event=${event} to=${to} status=${status}${suffix}`);
}

function formatDateWib(value: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(new Date(value));
}

function resolveRecipient(user?: EmailUserLike | null) {
  if (!user) return null;
  const candidates = [
    user.email,
    ...(user.linkedProviders || []).map((item) => item?.email),
  ];
  for (const raw of candidates) {
    const email = String(raw || "").trim();
    if (!email || !email.includes("@")) continue;
    return {
      email,
      name: String(user.displayName || "Pengguna").trim() || "Pengguna",
    };
  }
  return null;
}

function normalizeBaseUrl(baseUrl?: string) {
  return String(baseUrl || process.env.APP_BASE_URL || "https://rekberwe.id").replace(/\/$/, "");
}

function buildTransactionUrl(baseUrl: string, code: string) {
  return `${normalizeBaseUrl(baseUrl)}/?trx=${encodeURIComponent(code)}`;
}

function buildVoucherOrderUrl(baseUrl: string, code: string) {
  return `${normalizeBaseUrl(baseUrl)}/?voucher=${encodeURIComponent(code)}`;
}

function buildProfileUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/profil`;
}

function buildHomeUrl(baseUrl: string) {
  return normalizeBaseUrl(baseUrl);
}

function buildTransactionPayload(transaction: EmailTransactionLike) {
  return {
    code: String(transaction.code || "").trim(),
    title: String(transaction.title || transaction.code || "Transaksi").trim(),
    price: Number(transaction.price || 0),
  };
}

function buildVoucherOrderPayload(order: EmailVoucherOrderLike) {
  return {
    code: String(order.orderCode || "").trim(),
    productName: String(order.product?.name || "Voucher / Gametime").trim(),
    price: Number(order.price || 0),
    quantity: Math.max(1, Number(order.quantity || 1)),
  };
}

async function sendUniqueEmails(
  recipients: Array<{ email: string; name: string }>,
  event: string,
  buildMessage: (name: string) => { subject: string; html: string },
) {
  if (!recipients.length) {
    logEmailResult("-", event, "skipped", "no_recipients");
    return;
  }
  const seen = new Set<string>();
  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const message = buildMessage(recipient.name);
    await sendEmail({
      to: recipient.email,
      subject: message.subject,
      html: message.html,
      event,
    });
  }
}

export async function sendEmail({ to, subject, html, event }: SendEmailInput) {
  const recipient = String(to || "").trim();
  if (!recipient || !recipient.includes("@")) {
    logEmailResult(recipient || "-", event, "skipped", "invalid_recipient");
    return { ok: false, skipped: true };
  }

  if (!isEmailEnabled()) {
    logEmailResult(recipient, event, "skipped", "resend_not_configured");
    return { ok: false, skipped: true };
  }

  const client = getResendClient();
  if (!client) {
    logEmailResult(recipient, event, "skipped", "client_unavailable");
    return { ok: false, skipped: true };
  }

  try {
    const result = await client.emails.send({
      from: getEmailFromAddress(),
      to: recipient,
      subject,
      html,
    });
    logEmailResult(recipient, event, "sent");
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logEmailResult(recipient, event, "failed", message);
    throw error;
  }
}

export async function sendRegistrationSuccessEmail(user: EmailUserLike, baseUrl?: string) {
  const recipient = resolveRecipient(user);
  if (!recipient) {
    logEmailResult("-", "registration_success", "skipped", "missing_user_email");
    return;
  }
  const message = buildRegistrationSuccessEmail(recipient.name, buildHomeUrl(baseUrl));
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    event: "registration_success",
  });
}

export async function sendTransactionCreatedEmail(
  transaction: EmailTransactionLike,
  buyer?: EmailUserLike | null,
  seller?: EmailUserLike | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [resolveRecipient(buyer ?? transaction.buyer), resolveRecipient(seller ?? transaction.seller)]
    .filter(Boolean) as Array<{ email: string; name: string }>;

  await sendUniqueEmails(recipients, "transaction_created", (name) => (
    buildTransactionCreatedEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendAdminVerifiedEmail(user: EmailUserLike, baseUrl?: string) {
  const recipient = resolveRecipient(user);
  if (!recipient) {
    logEmailResult("-", "admin_verified", "skipped", "missing_user_email");
    return;
  }
  const message = buildAdminVerifiedEmail(recipient.name, buildProfileUrl(baseUrl));
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    event: "admin_verified",
  });
}

export async function sendFundsSecuredEmail(
  transaction: EmailTransactionLike,
  buyer?: EmailUserLike | null,
  seller?: EmailUserLike | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [resolveRecipient(buyer ?? transaction.buyer), resolveRecipient(seller ?? transaction.seller)]
    .filter(Boolean) as Array<{ email: string; name: string }>;

  await sendUniqueEmails(recipients, "funds_secured", (name) => (
    buildFundsSecuredEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendBuyerFundsSecuredEmail(
  transaction: EmailTransactionLike,
  buyer?: EmailUserLike | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [resolveRecipient(buyer ?? transaction.buyer)].filter(Boolean) as Array<{ email: string; name: string }>;
  await sendUniqueEmails(recipients, "funds_secured_buyer", (name) => (
    buildFundsSecuredEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendSellerFundsReceivedEmail(
  transaction: EmailTransactionLike,
  seller?: EmailUserLike | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [resolveRecipient(seller ?? transaction.seller)].filter(Boolean) as Array<{ email: string; name: string }>;
  await sendUniqueEmails(recipients, "seller_funds_received", (name) => (
    buildSellerFundsReceivedEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendItemDeliveredEmail(
  transaction: EmailTransactionLike,
  buyer?: EmailUserLike | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [resolveRecipient(buyer ?? transaction.buyer)].filter(Boolean) as Array<{ email: string; name: string }>;
  await sendUniqueEmails(recipients, "item_delivered", (name) => (
    buildItemDeliveredEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendFundsReleasedEmail(
  transaction: EmailTransactionLike,
  buyer?: EmailUserLike | null,
  seller?: EmailUserLike | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [resolveRecipient(buyer ?? transaction.buyer), resolveRecipient(seller ?? transaction.seller)]
    .filter(Boolean) as Array<{ email: string; name: string }>;

  await sendUniqueEmails(recipients, "funds_released", (name) => (
    buildFundsReleasedEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendDisputeOpenedEmail(
  transaction: EmailTransactionLike,
  buyer?: EmailUserLike | null,
  seller?: EmailUserLike | null,
  adminEmail?: string | null,
  baseUrl?: string,
) {
  const payload = buildTransactionPayload(transaction);
  const recipients = [
    resolveRecipient(buyer ?? transaction.buyer),
    resolveRecipient(seller ?? transaction.seller),
    { email: String(adminEmail || getAdminEmailAddress()).trim(), name: "Admin RekberWe.id" },
  ].filter((item) => item && item.email.includes("@")) as Array<{ email: string; name: string }>;

  await sendUniqueEmails(recipients, "dispute_opened", (name) => (
    buildDisputeOpenedEmail(name, payload, buildTransactionUrl(baseUrl || "", payload.code))
  ));
}

export async function sendTestEmail(to: string) {
  const message = buildTestEmail();
  await sendEmail({
    to,
    subject: message.subject,
    html: message.html,
    event: "test_email",
  });
}

export async function sendVoucherOrderProcessingEmail(order: EmailVoucherOrderLike, baseUrl?: string) {
  const recipient = resolveRecipient(order.user);
  if (!recipient) {
    logEmailResult("-", "voucher_order_processing", "skipped", "missing_user_email");
    return;
  }
  const payload = buildVoucherOrderPayload(order);
  const message = buildVoucherOrderProcessingEmail(
    recipient.name,
    payload,
    buildVoucherOrderUrl(baseUrl || "", payload.code),
  );
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    event: "voucher_order_processing",
  });
}

export async function sendVoucherVerificationRequestEmail(order: EmailVoucherOrderLike, baseUrl?: string) {
  const recipient = resolveRecipient(order.user);
  if (!recipient) {
    logEmailResult("-", "voucher_verification_request", "skipped", "missing_user_email");
    return;
  }
  const payload = buildVoucherOrderPayload(order);
  const message = buildVoucherVerificationCodeEmail(
    recipient.name,
    payload,
    buildVoucherOrderUrl(baseUrl || "", payload.code),
  );
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    event: "voucher_verification_request",
  });
}

export async function sendVoucherAccountRevisionEmail(order: EmailVoucherOrderLike, baseUrl?: string) {
  const recipient = resolveRecipient(order.user);
  if (!recipient) {
    logEmailResult("-", "voucher_account_revision", "skipped", "missing_user_email");
    return;
  }
  const payload = buildVoucherOrderPayload(order);
  const message = buildVoucherAccountRevisionEmail(
    recipient.name,
    payload,
    buildVoucherOrderUrl(baseUrl || "", payload.code),
  );
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    event: "voucher_account_revision",
  });
}

export async function sendVoucherOrderCompletedEmail(order: EmailVoucherOrderLike, baseUrl?: string) {
  const recipient = resolveRecipient(order.user);
  if (!recipient) {
    logEmailResult("-", "voucher_order_completed", "skipped", "missing_user_email");
    return;
  }
  const payload = buildVoucherOrderPayload(order);
  const message = buildVoucherOrderCompletedEmail(
    recipient.name,
    payload,
    buildVoucherOrderUrl(baseUrl || "", payload.code),
  );
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: message.html,
    event: "voucher_order_completed",
  });
}

export function dispatchEmail(task: () => Promise<void>) {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[email] dispatch failed: ${message}`);
    });
}
