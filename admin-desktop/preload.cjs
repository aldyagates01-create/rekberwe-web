const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("RekberDesktop", {
  isDesktop: true,
  notify(payload = {}) {
    ipcRenderer.send("admin-desktop:notify", {
      title: String(payload.title || "RekberWE Admin"),
      body: String(payload.body || ""),
    });
  },
  setBadge(count = 0) {
    ipcRenderer.send("admin-desktop:set-badge", Number(count) || 0);
  },
  focusApp() {
    ipcRenderer.send("admin-desktop:focus");
  },
});
