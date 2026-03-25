// ═══════════════════════════════════════════════════════════════
//  PULS. — ELECTRON (Windows)
//  Lance l'app dans une fenêtre, reste dans le systray si fermée
//  Notifications Windows via ntfy.sh (gratuit, sans CB)
// ═══════════════════════════════════════════════════════════════

const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell } = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs");

// ► Mets ici l'URL de ton app déployée (Vercel/Netlify — voir GUIDE.md)
const APP_URL = "https://TON_URL_ICI.vercel.app";

// ► Mets ici les mêmes topics ntfy que dans config.js
// L'app va écouter ces topics pour afficher des notifs Windows natives
const NTFY_BASE   = "https://ntfy.sh";
const NTFY_TOPICS = {
  live:     "REMPLACE_puls_live",
  video:    "REMPLACE_puls_video",
  short:    "REMPLACE_puls_short",
  event:    "REMPLACE_puls_event",
  game:     "REMPLACE_puls_game",
  creation: "REMPLACE_puls_creation",
  invite:   "REMPLACE_puls_invite",
  other:    "REMPLACE_puls_other",
};

// Fichier de config des préférences utilisateur (persisté localement)
const CONFIG_PATH = path.join(app.getPath("userData"), "puls-config.json");

let mainWindow  = null;
let tray        = null;
let isQuitting  = false;
let ntfyStreams  = [];

// ── Charge les prefs sauvegardées ──
function loadPrefs() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch(e) {}
  return { prefs: Object.keys(NTFY_TOPICS) }; // Par défaut : tous les thèmes
}

// ── Écoute ntfy.sh en SSE (Server-Sent Events) pour un topic ──
function subscribeNtfyTopic(topic) {
  const url = `${NTFY_BASE}/${topic}/sse`;

  const req = https.get(url, { headers: { "Accept": "text/event-stream" } }, (res) => {
    res.on("data", (chunk) => {
      const text = chunk.toString();
      // Parse les events SSE
      const lines = text.split("\n");
      let eventData = null;
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            eventData = JSON.parse(line.slice(5).trim());
          } catch(e) {}
        }
      }
      if (eventData && eventData.event === "message") {
        showWindowsNotification(eventData.title || "puls.", eventData.message || "");
      }
    });

    res.on("error", () => {
      // Reconnexion après 5 secondes si erreur
      setTimeout(() => subscribeNtfyTopic(topic), 5000);
    });
    res.on("close", () => {
      setTimeout(() => subscribeNtfyTopic(topic), 3000);
    });
  });

  req.on("error", () => {
    setTimeout(() => subscribeNtfyTopic(topic), 5000);
  });

  ntfyStreams.push(req);
  return req;
}

// ── Affiche une notification Windows native ──
function showWindowsNotification(title, body) {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title,
      body,
      icon: path.join(__dirname, "icon.ico"),
    });
    notif.show();
    notif.on("click", () => {
      if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
  }
}

// ── Démarre l'écoute ntfy selon les prefs ──
function startNtfyListeners() {
  // Arrête les anciens streams
  ntfyStreams.forEach(req => { try { req.destroy(); } catch(e) {} });
  ntfyStreams = [];

  const config = loadPrefs();
  const prefs = config.prefs || [];

  prefs.forEach(pref => {
    if (NTFY_TOPICS[pref]) {
      subscribeNtfyTopic(NTFY_TOPICS[pref]);
    }
  });
}

// ── Création de la fenêtre ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 780,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: "#0d0d0f",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: "puls.",
  });

  mainWindow.loadURL(APP_URL);

  // Ouvre les liens externes dans le navigateur
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Sync des prefs depuis l'app web vers Electron (pour savoir quels topics écouter)
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(`
      (() => {
        const prefs = JSON.parse(localStorage.getItem('puls_prefs') || '[]');
        return prefs;
      })()
    `).then(prefs => {
      if (prefs && prefs.length > 0) {
        const config = { prefs };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
        // Redémarre les listeners ntfy avec les nouvelles prefs
      }
    }).catch(() => {});
  });

  // Cache dans systray au lieu de fermer
  mainWindow.on("close", e => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray && process.platform === "win32") {
        tray.displayBalloon({
          title: "puls.",
          content: "puls. tourne en arrière-plan. Les notifications restent actives.",
          iconType: "info",
        });
      }
    }
  });
}

// ── Systray ──
function createTray() {
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(path.join(__dirname, "icon.ico"));
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip("puls.");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Ouvrir puls.",
      click: () => { mainWindow.show(); mainWindow.focus(); },
    },
    { type: "separator" },
    {
      label: "Quitter",
      click: () => { isQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow.isVisible()) mainWindow.focus();
    else mainWindow.show();
  });
}

// ── Boot ──
app.whenReady().then(() => {
  createWindow();
  createTray();
  startNtfyListeners();
});

app.on("window-all-closed", e => {
  if (process.platform !== "darwin") e.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
  ntfyStreams.forEach(req => { try { req.destroy(); } catch(e) {} });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});