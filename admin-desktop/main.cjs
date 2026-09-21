const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  shell,
  session,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const CONFIG_PATH = path.join(__dirname, "config.json");
const FALLBACK_ICON = path.join(__dirname, "..", "assets", "rekberwe-favicon.png");
const APP_ICON = path.join(__dirname, "assets", "icon.png");

/** User-Agent mirip Chrome — Google sering menolak OAuth jika UA mengandung "Electron". */
const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SESSION_PARTITION = "persist:rekberwe-admin";

let mainWindow = null;
let tray = null;
let isQuitting = false;
let appConfig = loadConfig();
let recoveryTimer = null;
let recoveryAttempts = 0;

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
  const raw = fromEnv || String(appConfig.adminUrl || "").trim() || "https://rekberwe.id/admin";
  // Hindari URL ganda seperti https://rekberwe.id/https://rekberwe.id/admin
  const cleaned = raw.replace(/^(https?:\/\/[^/]+)\/https?:\/\/[^/]+/i, "$1");
  const parsed = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);
  return {
    adminUrl: `${parsed.origin}/admin`,
    origin: parsed.origin,
  };
}

function isOAuthHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "accounts.google.com"
    || host.endsWith(".google.com")
    || host === "oauth.telegram.org"
    || host.endsWith(".telegram.org")
    || host === "discord.com"
    || host.endsWith(".discord.com")
    || host.endsWith(".discordapp.com")
    || host === "facebook.com"
    || host.endsWith(".facebook.com")
  );
}

function isAllowedNavigation(url) {
  const { origin } = resolveAdminTarget();
  try {
    const parsed = new URL(url);
    if (parsed.origin === origin) return true;
    if (isOAuthHost(parsed.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Perbaiki URL rusak / homepage → selalu ke /admin (kecuali sedang OAuth).
 */
function normalizeToAdminUrl(url) {
  const { origin, adminUrl } = resolveAdminTarget();
  try {
    const parsed = new URL(url);
    if (parsed.origin !== origin) return null;

    const pathName = parsed.pathname || "/";
    // Path seperti /https://rekberwe.id/ — URL ganda
    if (/^\/https?:\/\//i.test(pathName)) {
      return adminUrl;
    }
    const cleanPath = pathName.replace(/\/$/, "") || "/";
    if (cleanPath === "/" || cleanPath === "") {
      const next = new URL(adminUrl);
      parsed.searchParams.forEach((value, key) => next.searchParams.set(key, value));
      return next.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function loadAppIcon() {
  const iconPath = fs.existsSync(APP_ICON) ? APP_ICON : FALLBACK_ICON;
  if (!fs.existsSync(iconPath)) return undefined;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
}

function clearRecoveryTimer() {
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
}

function navigateInApp(url) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadURL(url);
}

function reloadAdminDashboard({ bustCache = true } = {}) {
  clearRecoveryTimer();
  const { adminUrl } = resolveAdminTarget();
  const target = bustCache
    ? `${adminUrl}${adminUrl.includes("?") ? "&" : "?"}desktop_reload=${Date.now()}`
    : adminUrl;
  navigateInApp(target);
}

function scheduleAdminRecovery(reason = "") {
  if (recoveryAttempts >= 8) return;
  if (recoveryTimer) return;
  recoveryAttempts += 1;
  const delayMs = Math.min(2500 * recoveryAttempts, 15000);
  recoveryTimer = setTimeout(() => {
    recoveryTimer = null;
    reloadAdminDashboard({ bustCache: true });
  }, delayMs);
  if (reason) {
    console.log(`[admin-desktop] recovery: ${reason} (attempt ${recoveryAttempts})`);
  }
}

async function detectRailwayErrorPage() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  try {
    const result = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const text = String(document.body?.innerText || "").toLowerCase();
        const title = String(document.title || "").toLowerCase();
        const isRailway =
          text.includes("the train has not arrived")
          || text.includes("go to railway")
          || (title.includes("not found") && text.includes("railway"));
        const looksLikeAdmin =
          Boolean(document.getElementById("admin-app")
            || document.getElementById("admin-login-modal")
            || document.querySelector("[data-admin-root]")
            || document.querySelector(".admin-shell")
            || document.querySelector("#admin-logout"));
        return { isRailway, looksLikeAdmin, href: location.href };
      })()
    `, true);
    return result;
  } catch {
    return null;
  }
}

async function recoverIfStuckOnRailway() {
  const info = await detectRailwayErrorPage();
  if (!info) return;
  if (info.isRailway && !info.looksLikeAdmin) {
    scheduleAdminRecovery("railway-not-found-page");
    showRecoveryScreen();
  } else if (info.looksLikeAdmin) {
    recoveryAttempts = 0;
    clearRecoveryTimer();
  }
}

function showRecoveryScreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { adminUrl } = resolveAdminTarget();
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>RekberWE Admin</title>
        <style>
          body { margin:0; min-height:100vh; display:grid; place-items:center;
            font-family:Segoe UI,sans-serif; background:#0b1220; color:#e8eefc; }
          .card { max-width:440px; padding:28px; border-radius:16px;
            border:1px solid rgba(148,163,184,.25); background:#111827; text-align:center; }
          button { margin-top:16px; padding:10px 18px; border:0; border-radius:10px;
            background:#4f6ef7; color:#fff; font-weight:600; cursor:pointer; }
          p { color:#9db0d0; line-height:1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Server baru aktif kembali</h2>
          <p>Aplikasi masih membuka halaman Railway lama. Klik tombol di bawah untuk masuk dashboard admin.</p>
          <button id="retry">Buka Dashboard Admin</button>
        </div>
        <script>
          document.getElementById("retry").onclick = function () {
            location.replace(${JSON.stringify(adminUrl)});
          };
          setTimeout(function () { location.replace(${JSON.stringify(adminUrl)}); }, 1200);
        </script>
      </body>
    </html>
  `)}`);
}

function createMainWindow() {
  const icon = loadAppIcon();
  const ses = session.fromPartition(SESSION_PARTITION);

  ses.setUserAgent(CHROME_USER_AGENT);

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
      partition: SESSION_PARTITION,
    },
  });

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      navigateInApp(url);
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    const forced = normalizeToAdminUrl(url);
    if (forced && forced !== url) {
      event.preventDefault();
      navigateInApp(forced);
    }
  });

  mainWindow.webContents.on("will-redirect", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    // Perbaiki URL ganda tanpa membatalkan redirect OAuth normal.
    if (/\/https?:\/\//i.test(url)) {
      event.preventDefault();
      reloadAdminDashboard({ bustCache: false });
    }
  });

  mainWindow.webContents.on("did-navigate", (_event, url) => {
    const forced = normalizeToAdminUrl(url);
    if (forced) navigateInApp(forced);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    recoverIfStuckOnRailway();
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const safeMessage = String(errorDescription || "Gagal memuat halaman").replace(/</g, "");
    const { adminUrl } = resolveAdminTarget();
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>RekberWE Admin</title>
          <style>
            body { margin:0; min-height:100vh; display:grid; place-items:center;
              font-family:Segoe UI,sans-serif; background:#0b1220; color:#e8eefc; }
            .card { max-width:420px; padding:28px; border-radius:16px;
              border:1px solid rgba(148,163,184,.25); background:#111827; text-align:center; }
            button { margin-top:16px; padding:10px 18px; border:0; border-radius:10px;
              background:#4f6ef7; color:#fff; font-weight:600; cursor:pointer; }
            p { color:#9db0d0; line-height:1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Koneksi gagal</h2>
            <p>${safeMessage}</p>
            <button id="retry">Coba lagi ke Dashboard Admin</button>
          </div>
          <script>
            document.getElementById("retry").onclick = function () {
              location.replace(${JSON.stringify(adminUrl)});
            };
          </script>
        </body>
      </html>
    `)}`);
    scheduleAdminRecovery("did-fail-load");
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

  reloadAdminDashboard({ bustCache: true });
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
    {
      label: "Muat ulang Dashboard",
      click: () => {
        recoveryAttempts = 0;
        reloadAdminDashboard({ bustCache: true });
        showMainWindow();
      },
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
  app.on("second-instance", () => {
    recoveryAttempts = 0;
    reloadAdminDashboard({ bustCache: true });
    showMainWindow();
  });

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
      if (mainWindow && !mainWindow.isDestroyed() && safeCount > 0 && process.platform === "win32") {
        mainWindow.flashFrame(true);
      }
    });
    ipcMain.on("admin-desktop:focus", () => showMainWindow());
  });

  app.on("before-quit", () => {
    isQuitting = true;
    clearRecoveryTimer();
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
