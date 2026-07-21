const path = require("node:path");
const { app, BrowserWindow, globalShortcut, ipcMain, Menu, screen } = require("electron");

let petWindow = null;
let dragStart = null;
let windowStart = null;
let volumeTimer = null;
let lastVolume = null;
let quitting = false;

function summonAtCursor() {
  if (!petWindow || petWindow.isDestroyed()) {
    console.warn("Pet window was missing; recreating it before summon.");
    createPetWindow();
    petWindow.webContents.once("did-finish-load", summonAtCursor);
    return;
  }
  const cursor = screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint(cursor).workArea;
  const bounds = petWindow.getBounds();
  const x = Math.max(area.x, Math.min(
    area.x + area.width - bounds.width,
    Math.round(cursor.x - bounds.width / 2)
  ));
  const y = Math.max(area.y, Math.min(
    area.y + area.height - bounds.height,
    Math.round(cursor.y - bounds.height / 2)
  ));
  petWindow.setPosition(x, y, false);
  petWindow.showInactive();
  petWindow.moveTop();
  console.log(`Pet summoned at ${x},${y}`);
}

function startGlobalHotkeys() {
  const summonRegistered = globalShortcut.register("Shift+Y", summonAtCursor);
  const hideRegistered = globalShortcut.register("Shift+J", () => petWindow?.hide());
  console.log(`Global shortcuts: summon=${summonRegistered}, hide=${hideRegistered}`);
}

function createPetWindow() {
  const area = screen.getPrimaryDisplay().workArea;

  petWindow = new BrowserWindow({
    width: 220,
    height: 240,
    x: area.x + area.width - 260,
    y: area.y + area.height - 280,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  petWindow.setAlwaysOnTop(true, "floating");
  petWindow.loadFile("index.html");
  petWindow.on("closed", () => { petWindow = null; });
}

function startVolumeWatcher() {
  let loudness;
  try {
    loudness = require("loudness");
  } catch {
    return;
  }

  volumeTimer = setInterval(async () => {
    try {
      const volume = await loudness.getVolume();
      if (lastVolume === null) {
        lastVolume = volume;
        return;
      }
      if (volume !== lastVolume) {
        lastVolume = volume;
        petWindow?.webContents.send("volume-changed", volume);
      }
    } catch {
      // Audio devices can disappear briefly; retry on the next interval.
    }
  }, 300);
}

app.whenReady().then(() => {
  createPetWindow();
  startVolumeWatcher();
  startGlobalHotkeys();
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  }
});

app.on("before-quit", () => {
  quitting = true;
  if (volumeTimer) clearInterval(volumeTimer);
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => app.quit());

ipcMain.on("drag:start", (_, point) => {
  if (!petWindow) return;
  dragStart = point;
  windowStart = petWindow.getBounds();
});

ipcMain.on("drag:move", (_, point) => {
  if (!petWindow || !dragStart || !windowStart) return;
  const x = windowStart.x + point.x - dragStart.x;
  const y = windowStart.y + point.y - dragStart.y;
  petWindow.setPosition(Math.round(x), Math.round(y), false);
});

ipcMain.on("drag:end", () => {
  dragStart = null;
  windowStart = null;
});

ipcMain.handle("pet:get-bounds", () => petWindow?.getBounds() ?? null);

ipcMain.handle("pet:get-work-area", () => {
  if (!petWindow) return screen.getPrimaryDisplay().workArea;
  return screen.getDisplayMatching(petWindow.getBounds()).workArea;
});

ipcMain.on("pet:move", (_, point) => {
  if (!petWindow) return;
  petWindow.setPosition(Math.round(point.x), Math.round(point.y), false);
});

ipcMain.on("mouse:set-ignore", (_, ignore) => {
  if (!petWindow) return;
  const shouldIgnore = Boolean(ignore);
  petWindow.setIgnoreMouseEvents(shouldIgnore, {
    forward: shouldIgnore
  });
});

ipcMain.on("context-menu", () => {
  if (!petWindow) return;

  const setScale = scale => {
    const width = Math.round(220 * scale);
    const height = Math.round(240 * scale);
    petWindow.setSize(width, height, false);
    petWindow.webContents.send("pet:set-scale", scale);
  };

  const menu = Menu.buildFromTemplate([
    {
      label: "始终置顶",
      type: "checkbox",
      checked: petWindow.isAlwaysOnTop(),
      click: item => petWindow?.setAlwaysOnTop(item.checked, "floating")
    },
    {
      label: "大小",
      submenu: [
        { label: "75%", click: () => setScale(0.75) },
        { label: "100%", click: () => setScale(1) },
        { label: "125%", click: () => setScale(1.25) }
      ]
    },
    {
      label: "回到主屏幕",
      click: () => {
        const area = screen.getPrimaryDisplay().workArea;
        const bounds = petWindow.getBounds();
        petWindow.setPosition(
          area.x + area.width - bounds.width - 40,
          area.y + area.height - bounds.height - 40,
          false
        );
      }
    },
    { label: "隐藏（Shift+J）", click: () => petWindow?.hide() },
    { type: "separator" },
    { label: "彻底退出 Sakku", click: () => app.quit() }
  ]);

  menu.popup({ window: petWindow });
});
