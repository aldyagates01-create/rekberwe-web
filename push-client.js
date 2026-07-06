(function initRekberPushClient() {
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let index = 0; index < rawData.length; index += 1) {
      outputArray[index] = rawData.charCodeAt(index);
    }
    return outputArray;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Request gagal (${response.status})`);
    }
    return response.json();
  }

  async function getPublicKeyConfig() {
    return fetchJson("/api/push/public-key");
  }

  async function enablePush({ audience = "user" } = {}) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }
    const config = await getPublicKeyConfig();
    if (!config.enabled || !config.publicKey) {
      return "disabled";
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return "denied";
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
    }
    await fetchJson("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        audience,
        subscription: subscription.toJSON(),
      }),
    });
    localStorage.setItem(`rekber_push_${audience}`, "1");
    return "enabled";
  }

  async function disablePush({ audience = "user" } = {}) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    if (subscription) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint, audience }),
      }).catch(() => {});
      await subscription.unsubscribe().catch(() => {});
    }
    localStorage.removeItem(`rekber_push_${audience}`);
    return "disabled";
  }

  async function ensurePushEnabled({ audience = "user", force = false } = {}) {
    if (!force && localStorage.getItem(`rekber_push_${audience}`) === "1") {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) return "enabled";
      } catch {
        // continue to re-subscribe
      }
    }
    return enablePush({ audience });
  }

  window.RekberPush = {
    enablePush,
    disablePush,
    ensurePushEnabled,
  };
})();
