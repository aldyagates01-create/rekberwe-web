self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "RekberWE.id",
    body: "Ada notifikasi baru.",
    url: "/",
    tag: "rekberwe",
  };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    // keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "RekberWE.id", {
      body: payload.body || "Ada notifikasi baru.",
      icon: "/assets/rekberwe-logo-mark.jpg?v=5",
      badge: "/assets/rekberwe-logo-mark.jpg?v=5",
      tag: payload.tag || "rekberwe",
      renotify: true,
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          const current = new URL(client.url);
          const target = new URL(targetUrl, current.origin);
          if (current.pathname === target.pathname || current.href.includes(target.pathname)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
