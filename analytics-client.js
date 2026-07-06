(function initRekberAnalytics() {
  const STORAGE_KEY = "rekberwe_vid";

  function createVisitorId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    }
    return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }

  function getVisitorId() {
    try {
      const existing = String(localStorage.getItem(STORAGE_KEY) || "").trim();
      if (/^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
        return existing;
      }
      const next = createVisitorId();
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    } catch {
      return createVisitorId();
    }
  }

  function getCurrentPath() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function getTransactionCodeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const queryCode = String(params.get("trx") || "").trim().toUpperCase();
    if (queryCode) return queryCode;
    const match = window.location.pathname.match(/^\/transaksi\/([^/]+)/i);
    return match ? String(match[1]).trim().toUpperCase() : "";
  }

  async function track(eventType, extra = {}) {
    if (!eventType) return;
    try {
      await fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          visitorId: getVisitorId(),
          eventType,
          path: extra.path || getCurrentPath(),
          referrer: extra.referrer ?? document.referrer ?? "",
          transactionCode: extra.transactionCode || "",
        }),
      });
    } catch {
      // ignore analytics transport errors
    }
  }

  window.RekberAnalytics = {
    getVisitorId,
    track,
    trackPageview(extra) {
      return track("pageview", extra);
    },
  };

  if (window.location.pathname.startsWith("/admin")) {
    return;
  }

  window.RekberAnalytics.trackPageview();

  const transactionCode = getTransactionCodeFromLocation();
  if (transactionCode) {
    window.RekberAnalytics.track("open_transaction_link", { transactionCode });
  }
})();
