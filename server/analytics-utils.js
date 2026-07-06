export const ANALYTICS_EVENT_TYPES = new Set([
  "pageview",
  "open_transaction_link",
  "create_transaction_click",
  "create_transaction_success",
  "login_success",
  "login_failed",
  "join_transaction",
]);

export function classifyReferrerSource(referrerUrl) {
  const ref = String(referrerUrl || "").trim().toLowerCase();
  if (!ref) return "direct";
  if (ref.includes("wa.me") || ref.includes("whatsapp.com") || ref.includes("api.whatsapp")) return "whatsapp";
  if (ref.includes("t.me") || ref.includes("telegram.me") || ref.includes("telegram.org")) return "telegram";
  if (ref.includes("google.")) return "google";
  if (ref.includes("facebook.com") || ref.includes("fb.com") || ref.includes("l.facebook.com")) return "facebook";
  return "other";
}

export function detectDeviceType(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|android|iphone/.test(ua)) return "mobile";
  return "desktop";
}

export function normalizeAnalyticsRange(fromInput, toInput) {
  const to = toInput ? new Date(`${toInput}T23:59:59.999`) : new Date();
  const from = fromInput
    ? new Date(`${fromInput}T00:00:00.000`)
    : new Date(to.getTime() - (30 * 24 * 60 * 60 * 1000));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const fallbackTo = new Date();
    const fallbackFrom = new Date(fallbackTo.getTime() - (30 * 24 * 60 * 60 * 1000));
    return {
      fromIso: fallbackFrom.toISOString(),
      toIso: fallbackTo.toISOString(),
      fromDate: fallbackFrom.toISOString().slice(0, 10),
      toDate: fallbackTo.toISOString().slice(0, 10),
    };
  }
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

export function isValidVisitorId(visitorId) {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(String(visitorId || "").trim());
}
