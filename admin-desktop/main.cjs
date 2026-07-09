const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  shell,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const CONFIG_PATH = path.join(__dirname, "config.json");
const FALLBACK_ICON = path.join(__dirname, "..", "assets", "rekberwe-favicon.png");
const APP_ICON = path.join(__dirname, "assets", "icon.png");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let appConfig = loadConfig();

function loadConfig() {
  const defaults = {
    adminUrl: "https://rekberwe.id/admin",
    openAtLogin: false,
    minimizeToTray: true,
  };
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...defaults, ...raw };
  } catch {
    return defaults;
  }
}

function resolveAdminTarget() {
  const fromEnv = String(process.env.REKBER_ADMIN_URL || "").trim();
  const adminUrl = fromEnv || String(appConfig.adminUrl || "").trim() || "https://rekberwe.id/admin";
  const parsed = new URL(adminUrl);
  return {
    adminUrl: parsed.toString().replace(/\/$/, ""),
    origin: parsed.origin,
  };
}

function isAllowedNavigation(url) {
  const { origin } = resolveAdminTarget();
  if (url.startsWith(origin)) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "accounts.google.com" || host.endsWith(".google.com")) return true;
    if (host === "oauth.telegram.org" || host.endsWith(".telegram.org")) return true;
    if (host === "discord.com" || host.endsWith(".discord.com") || host.endsWith(".discordapp.com")) return true;
    if (host === "facebook.com" || host.endsWith(".facebook.com")) return true;
    return false;
  } catch {
    return false;
  }
}

function shouldOpenExternally(url) {
  return !isAllowedNavigation(url);
}

function loadAppIcon() {
  const iconPath = fs.existsSync(APP_ICON) ? APP_ICON : FALLBACK_ICON;
  if (!fs.existsSync(iconPath)) return undefined;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
}

function createMainWindow() {
  const icon = loadAppIcon();
  const { adminUrl } = resolveAdminTarget();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: "RekberWE Admin",
    icon,
    backgroundColor: "#0b1220",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
      partition: "persist:rekberwe-admin",
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (shouldOpenExternally(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting && appConfig.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow.setTitle("RekberWE Admin");
  });

  mainWindow.loadURL(adminUrl);
}

function createTray() {
  const icon = loadAppIcon();
  if (!icon) return;

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("RekberWE Admin");
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Tampilkan Dashboard",
      click: () => showMainWindow(),
    },
    { type: "separator" },
    {
      label: "Keluar",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on("double-click", () => showMainWindow());
  tray.on("click", () => showMainWindow());
}

function showMainWindow() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function showDesktopNotification({ title, body }) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: title || "RekberWE Admin",
    body: body || "Ada aktivitas baru.",
    icon: loadAppIcon(),
    silent: false,
  });
  notification.on("click", () => showMainWindow());
  notification.show();
}

function updateTrayBadge(count) {
  if (!tray) return;
  const safeCount = Math.max(0, Number(count) || 0);
  tray.setToolTip(safeCount > 0 ? `RekberWE Admin (${safeCount} belum dibaca)` : "RekberWE Admin");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => showMainWindow());

  app.whenReady().then(() => {
    appConfig = loadConfig();
    if (appConfig.openAtLogin) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
      });
    }

    createMainWindow();
    createTray();

    const { ipcMain } = require("electron");
    ipcMain.on("admin-desktop:notify", (_event, payload) => {
      showDesktopNotification(payload || {});
      if (!mainWindow?.isFocused()) {
        mainWindow?.flashFrame(true);
      }
    });
    ipcMain.on("admin-desktop:set-badge", (_event, count) => {
      updateTrayBadge(count);
      const safeCount = Math.max(0, Number(count) || 0);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOverlayIcon(null, "");
        if (safeCount > 0 && process.platform === "win32") {
          // Keep taskbar attention without custom badge asset.
          mainWindow.flashFrame(true);
        }
      }
    });
    ipcMain.on("admin-desktop:focus", () => showMainWindow());
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && isQuitting) {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      showMainWindow();
    }
  });
}
