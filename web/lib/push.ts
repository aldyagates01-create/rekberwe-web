function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

async function fetchJson<T>(url: string, options: RequestInit = {}) {
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
  return response.json() as Promise<T>;
}

export async function ensureWebPushEnabled(audience: "user" | "admin" = "user") {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

  const storageKey = `rekber_push_${audience}`;
  if (localStorage.getItem(storageKey) === "1") {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) return "enabled";
    } catch {
      // continue to re-subscribe
    }
  }

  const config = await fetchJson<{ enabled: boolean; publicKey: string }>("/api/push/public-key");
  if (!config.enabled || !config.publicKey) return "disabled";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

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

  localStorage.setItem(storageKey, "1");
  return "enabled";
}
