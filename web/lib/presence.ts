import type { PresenceInfo, Transaction } from "@/lib/types";

export const PRESENCE_ONLINE_MS = 30000;
export const PRESENCE_UI_TICK_MS = 5000;
export const PRESENCE_HEARTBEAT_MS = 15000;

export function isPresenceOnline(presence?: PresenceInfo | null, now = Date.now()) {
  if (!presence?.lastSeenAt) return false;
  return now - new Date(presence.lastSeenAt).getTime() <= PRESENCE_ONLINE_MS;
}

export function formatRelativeLastSeen(value: string, now = Date.now()) {
  const diffSeconds = Math.max(1, Math.floor((now - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.floor(diffHours / 24)} hari lalu`;
}

export function formatPresenceLabel(presence?: PresenceInfo | null, now = Date.now()) {
  if (isPresenceOnline(presence, now)) return "Online";
  if (!presence?.lastSeenAt) return "Offline";
  return `Aktif ${formatRelativeLastSeen(presence.lastSeenAt, now)}`;
}

export function getCounterpartyPresenceText(
  transaction: Transaction | null,
  role: "buyer" | "seller" | null,
  now = Date.now(),
) {
  if (!transaction || !role) return "Offline";
  const counterparty = role === "buyer" ? transaction.seller : role === "seller" ? transaction.buyer : null;
  if (!counterparty) return "Offline";
  return formatPresenceLabel(counterparty.presence, now);
}
