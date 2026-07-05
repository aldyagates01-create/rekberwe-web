import type { SessionUser, TimelineItem, Transaction, TransactionMessage } from "./types";

export function buildTimeline(transaction: Transaction): TimelineItem[] {
  const messages = (transaction.messages || []).map((item) => ({ ...item, kind: "message" as const }));
  const uploads = (transaction.uploads || []).map((item) => ({ ...item, kind: "upload" as const }));
  return [...messages, ...uploads].sort(
    (left, right) => new Date(left.time).getTime() - new Date(right.time).getTime(),
  );
}

export function getTransactionProgress(transaction: Transaction) {
  let current = 1;
  if (transaction.adminFundsReceived) current = 2;
  if (
    transaction.paymentStatus === "Akun sudah diserahkan"
    || transaction.buyerConfirmedReceived
    || transaction.sellerPayoutSent
  ) {
    current = Math.max(current, 3);
  }
  if (transaction.paymentStatus === "Selesai" || transaction.sellerPayoutSent) {
    current = 4;
  }
  return { current, total: 4 };
}

export function getShortStatus(transaction: Transaction) {
  if (transaction.adminFundsReceived && !transaction.buyerConfirmedReceived) {
    return "Dana Diamankan";
  }
  return transaction.paymentStatus;
}

export function getUserRole(transaction: Transaction, userId?: string | null) {
  if (!userId) return null;
  if (transaction.buyer?.id === userId) return "buyer";
  if (transaction.seller?.id === userId) return "seller";
  return null;
}

export function isSystemMessage(item: TransactionMessage) {
  const sender = String(item.sender || "").toLowerCase();
  return sender === "system";
}

export function getSystemMessageIcon(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("sengketa")) return "⚠️";
  if (normalized.includes("bukti") || normalized.includes("verifikasi")) return "📄";
  if (normalized.includes("dana") || normalized.includes("diamankan") || normalized.includes("diterima")) return "🔒";
  if (normalized.includes("selesai")) return "✅";
  return "ℹ️";
}

export type TransactionActionKey =
  | "mark_paid"
  | "account_delivered"
  | "goods_received"
  | "open_dispute"
  | "cancel_transaction";

export type TransactionActionButton = {
  action: TransactionActionKey;
  label: string;
  variant: "default" | "success" | "danger";
  disabled?: boolean;
  reason?: string;
};

export function getConfirmAction(transaction: Transaction, role: "buyer" | "seller" | null) {
  if (role === "buyer" && !transaction.adminFundsReceived) {
    return { action: "mark_paid", label: "Konfirmasi Bayar" };
  }
  if (role === "seller" && transaction.adminFundsReceived && !transaction.buyerConfirmedReceived) {
    return { action: "account_delivered", label: "Item Diserahkan" };
  }
  if (role === "buyer" && transaction.adminFundsReceived && !transaction.buyerConfirmedReceived) {
    return { action: "goods_received", label: "Item Diterima" };
  }
  return null;
}

export function getTransactionActions(transaction: Transaction, role: "buyer" | "seller" | null): TransactionActionButton[] {
  if (!role || transaction.paymentStatus === "Transaksi dibatalkan" || transaction.paymentStatus === "Selesai") {
    return [];
  }

  const actions: TransactionActionButton[] = [];

  if (role === "seller") {
    const enabled = transaction.adminFundsReceived
      && transaction.paymentStatus !== "Akun sudah diserahkan"
      && !transaction.buyerConfirmedReceived
      && !transaction.sellerPayoutSent;
    actions.push({
      action: "account_delivered",
      label: "Data / Item Diserahkan",
      variant: "success",
      disabled: !enabled,
      reason: enabled ? "" : "Belum bisa dipakai sampai dana diamankan admin atau tahap penyerahan belum valid.",
    });
  }

  if (role === "buyer") {
    const enabled = transaction.adminFundsReceived
      && (transaction.paymentStatus === "Akun sudah diserahkan" || transaction.buyerConfirmedReceived || transaction.sellerPayoutSent)
      && !transaction.buyerConfirmedReceived
      && !transaction.sellerPayoutSent;
    actions.push({
      action: "goods_received",
      label: "Data / Item Diterima",
      variant: "success",
      disabled: !enabled,
      reason: enabled ? "" : "Belum bisa dipakai karena penjual belum menekan Data / Item Diserahkan.",
    });
  }

  actions.push({ action: "open_dispute", label: "Ajukan Sengketa", variant: "danger" });
  actions.push({ action: "cancel_transaction", label: "Batalkan Transaksi", variant: "default" });
  return actions;
}

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error(payload.message || "Permintaan gagal.");
  }
  return payload as T;
}

export async function getSession() {
  return fetchJson<SessionResponse>("/api/session");
}

export async function getTransaction(code: string) {
  const payload = await fetchJson<{ transaction: Transaction }>(`/api/transactions/${encodeURIComponent(code)}`);
  return payload.transaction;
}

export async function sendMessage(code: string, text: string) {
  return fetchJson<{ transaction: Transaction }>(`/api/transactions/${encodeURIComponent(code)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function runAction(code: string, action: string) {
  return fetchJson<{ transaction: Transaction }>(`/api/transactions/${encodeURIComponent(code)}/actions`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function uploadProof(code: string, files: FileList | File[]) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("proofFiles", file));
  return fetchJson<{ transaction: Transaction }>(`/api/transactions/${encodeURIComponent(code)}/uploads`, {
    method: "POST",
    body: formData,
  });
}
