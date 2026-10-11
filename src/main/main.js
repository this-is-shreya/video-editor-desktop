'use strict';
const { app, BrowserWindow, ipcMain, session, desktopCapturer, screen, protocol,
  globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { CursorTracker } = require('./tracker');
const nativeScreen = require("./Screencapture")
const auth = require('./auth');
const { autoUpdater } = require("electron-updater");

const RENDERER_DIR = path.join(__dirname, '..', 'renderer');
let PROJECTS_DIR;
let native = null;
let nativeSession = null;
let mainWindow = null;
let toolbarWindow = null;
let captureDisplayId = null;
let recordingDisplay = null;
let shortcutsOn = false;

if (!auth.initAuth({ getMainWindow: () => mainWindow })) return;
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
}]);

const tracker = new CursorTracker({ getPoint: () => screen.getCursorScreenPoint() });
tracker.on('toggle', (d) => toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.webContents.send('toolbar:tracking', d));

// ---------------------------------------------------------------- file serving (app://local/...)
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webm': 'video/webm', '.png': 'image/png', '.svg': 'image/svg+xml',
};
function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  return full === base || full.startsWith(base + path.sep) ? full : null;
}
function serveFile(req, filePath) {
  const stat = fs.statSync(filePath);
  const headers = { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
  if (stat.size === 0) return new Response(null, { status: 200, headers });
  const range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start, end;
      if (m[1] === '' && m[2] !== '') { start = Math.max(0, stat.size - parseInt(m[2], 10)); end = stat.size - 1; }
      else { start = m[1] ? parseInt(m[1], 10) : 0; end = m[2] ? parseInt(m[2], 10) : stat.size - 1; }
      end = Math.min(end, stat.size - 1);
      if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      headers['Content-Length'] = String(end - start + 1);
      return new Response(Readable.toWeb(fs.createReadStream(filePath, { start, end })), { status: 206, headers });
    }
  }
  headers['Content-Length'] = String(stat.size);
  return new Response(Readable.toWeb(fs.createReadStream(filePath)), { status: 200, headers });
}
function registerProtocol() {
  protocol.handle('app', (req) => {
    const parts = decodeURIComponent(new URL(req.url).pathname).split('/').filter(Boolean);
    const root = parts[0] === 'ui' ? RENDERER_DIR : parts[0] === 'media' ? PROJECTS_DIR : null;
    const filePath = root && safeJoin(root, parts.slice(1).join('/'));
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return new Response('Not found', { status: 404 });
    return serveFile(req, filePath);
  });
}
function setupAutoUpdates() {
  if (!app.isPackaged) {
    console.log("[updates] Skipping updates in development");
    return;
  }

  const log = require("electron-log");

  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = "debug";

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  log.info("[updates] App version:", app.getVersion());
  log.info("[updates] Platform:", process.platform);
  log.info("[updates] Packaged:", app.isPackaged);
  log.info("[updates] Log file:", log.transports.file.getFile().path);

  autoUpdater.on("checking-for-update", () => {
    log.info("[updates] Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("[updates] Update available:", info.version);
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("[updates] No update available. Latest:", info.version);
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info("[updates] Download progress:", Math.round(progress.percent) + "%");
  });

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    log.error("[updates] Check failed:", error);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("[updates] Update downloaded:", info.version);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updates:status", {
        state: "downloaded",
        version: info.version,
        message: `RookieClip ${info.version} is ready to install.`,
      });
    }
  });

  autoUpdater.on("error", (error) => {
    log.error("[updates] Error:", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("updates:status", {
        state: "error",
        message: "The update could not be downloaded. You can try again later.",
      });
    }
  });
}
// ---------------------------------------------------------------- windows
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 980, minHeight: 640,
    backgroundColor: '#14161b', title: 'RookieClip', autoHideMenuBar: true,
    icon: path.join(__dirname, "../../src/assets/favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false,            // keep recording smoothly while minimized
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // mainWindow.webContents.openDevTools();
  mainWindow.webContents.on("before-input-event", (event, input) => {
  const key = input.key.toLowerCase();

  if (
    input.type === "keyDown" &&
    (
      input.key === "F12" ||
      (input.control && input.shift && ["i", "j", "c"].includes(key))
    )
  ) {
    event.preventDefault();
  }
});

if (app.isPackaged) {
  mainWindow.webContents.on("devtools-opened", () => {
    mainWindow.webContents.closeDevTools();
  });
}
  console.log(path.join(__dirname, "../../src/assets/favicon.ico"))
  console.log("is packaged: ", app.isPackaged)
 if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(__dirname, "../../dist/index.html")
    );
    console.log("entered here for : ", path.join(__dirname, "../../dist/index.html"))
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }
  mainWindow.on('closed', () => { mainWindow = null; });
}

function showToolbar(display) {
  const w = 460, h = 64;
  const b = display.bounds;
  toolbarWindow = new BrowserWindow({
    width: w, height: h, x: Math.round(b.x + (b.width - w) / 2), y: Math.round(b.y + b.height - h - 56),
    frame: false, transparent: true, resizable: false, movable: true, skipTaskbar: true,
    alwaysOnTop: true, focusable: false, hasShadow: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
  toolbarWindow.setContentProtection(true);     // keeps the toolbar OUT of the recording (Windows 10 2004+)
  toolbarWindow.loadURL('app://local/ui/toolbar.html');
  return new Promise((resolve) => toolbarWindow.once('ready-to-show', () => { toolbarWindow.showInactive(); resolve(); }));
}
const sendToolbar = (ch, d) => toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.webContents.send(ch, d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function registerShortcuts() {
  if (shortcutsOn) return;
  shortcutsOn = true;
  globalShortcut.register('F9', () => tracker.toggleNow());
  globalShortcut.register('F10', () => mainWindow && mainWindow.webContents.send('rec:stop-request'));
}
function unregisterShortcuts() {
  globalShortcut.unregister('F9'); globalShortcut.unregister('F10'); shortcutsOn = false;
}

// ---------------------------------------------------------------- IPC: environment
const displayInfo = (d, i) => ({
  id: String(d.id),
  label: `Display ${i + 1}${d.id === screen.getPrimaryDisplay().id ? ' (primary)' : ''} - ${Math.round(d.size.width * d.scaleFactor)}x${Math.round(d.size.height * d.scaleFactor)}`,
  bounds: d.bounds, scaleFactor: d.scaleFactor,
  size: { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) },
  primary: d.id === screen.getPrimaryDisplay().id,
});
ipcMain.handle('screens:list', () => screen.getAllDisplays().map(displayInfo));
ipcMain.handle('tracking:support', () => ({
  clicks: !!native,
  nativeScreen: !!native,
  platform: process.platform
}));

// ---------------------------------------------------------------- IPC: projects
const projectDir = (id) => safeJoin(PROJECTS_DIR, String(id));
const readProject = (id) => JSON.parse(fs.readFileSync(path.join(projectDir(id), 'project.json'), 'utf8'));
ipcMain.handle("app:openRookieClip", async () => {
  await shell.openExternal("https://rookieclip.com");
});
ipcMain.handle("updates:install", () => {
  autoUpdater.quitAndInstall();
});
ipcMain.handle('project:create', () => {
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(path.join(PROJECTS_DIR, id), { recursive: true });
  return { id };
});
ipcMain.handle('project:save', (_e, id, data) => {
  fs.writeFileSync(path.join(projectDir(id), 'project.json'), JSON.stringify(data));
  return true;
});
ipcMain.handle('project:load', (_e, id) => readProject(id));
ipcMain.handle('projects:list', () => {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const out = [];
  for (const id of fs.readdirSync(PROJECTS_DIR)) {
    try {
      const p = readProject(id);
      out.push({ id, createdAt: p.createdAt, mode: p.mode, durationMs: p.durationMs, segments: (p.cursor?.segments || []).length });
    } catch { /* not a project */ }
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});
ipcMain.handle('project:saveStyle', (_e, id, style) => {
  const p = readProject(id); p.style = style;
  fs.writeFileSync(path.join(projectDir(id), 'project.json'), JSON.stringify(p));
  return true;
});
ipcMain.handle('project:delete', (_e, id) => { fs.rmSync(projectDir(id), { recursive: true, force: true }); return true; });
ipcMain.handle('project:reveal', (_e, id) => { shell.openPath(projectDir(id)); return true; });
ipcMain.handle('project:export', async (_e, id, buf) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'Export video', defaultPath: path.join(app.getPath('videos'), `cursor-studio-${id}.webm`),
    filters: [{ name: 'WebM video', extensions: ['webm'] }],
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, Buffer.from(buf));
  shell.showItemInFolder(r.filePath);
  return r.filePath;
});

// ---------------------------------------------------------------- IPC: streaming files
const streams = new Map();
let streamSeq = 0;
ipcMain.handle('stream:open', (_e, projectId, file) => {
  if (!['screen.webm', 'camera.webm'].includes(file)) throw new Error('bad file');
  const id = ++streamSeq;
  streams.set(id, fs.createWriteStream(path.join(projectDir(projectId), file)));
  return id;
});
ipcMain.handle('stream:write', (_e, id, buf) => { streams.get(id)?.write(Buffer.from(buf)); return true; });
ipcMain.handle('stream:close', (_e, id) => new Promise((resolve) => {
  const s = streams.get(id); streams.delete(id);
  if (!s) return resolve(true);
  s.end(() => resolve(true));
}));

// ---------------------------------------------------------------- IPC: recording orchestration
ipcMain.handle('rec:setSource', (_e, displayId) => { captureDisplayId = String(displayId); return true; });

ipcMain.handle('rec:prepare', async (_e, { withScreen, displayId }) => {
  const all = screen.getAllDisplays();
  recordingDisplay = all.find((d) => String(d.id) === String(displayId)) || screen.getPrimaryDisplay();
  await showToolbar(recordingDisplay);
  sendToolbar('toolbar:state', { phase: 'countdown', n: 3, withScreen });
  mainWindow && mainWindow.minimize();
  for (let n = 3; n >= 1; n--) { sendToolbar('toolbar:state', { phase: 'countdown', n, withScreen }); await sleep(1000); }
  return true;
});
// ipcMain.handle('rec:start', (_e, { withScreen }) => {
//   if (withScreen) {
//     const b = recordingDisplay.bounds;
//     tracker.start({ x: b.x, y: b.y, width: b.width, height: b.height });
//   }
//   registerShortcuts();
//   sendToolbar('toolbar:state', { phase: 'recording', startedAt: Date.now(), withScreen, canTrack: withScreen, clicks: !!native });
//   return { display: displayInfo(recordingDisplay, 0) };
// });
ipcMain.handle('rec:start', async (_e, { withScreen, nativeScreen: wantNative }) => {
  let startedAt = Date.now();
  let isNative = false;
  if (withScreen && wantNative) {
    // Cursor-less capture. Resolves once the first frame exists, so the cursor tracker can share its clock.
    const idx = Math.max(0, screen.getAllDisplays().findIndex((d) => d.id === recordingDisplay.id));
    nativeSession = new nativeScreen.NativeScreenRecorder({ displayIndex: idx, fps: 30 });
    try {
      ({ startedAt } = await nativeSession.start());
      isNative = true;
    } catch (e) {
      nativeSession.kill(); nativeSession.cleanup(); nativeSession = null;
      throw new Error('Could not start native screen capture: ' + e.message);
    }
  }
  if (withScreen) {
    const b = recordingDisplay.bounds;
    tracker.start({ x: b.x, y: b.y, width: b.width, height: b.height }, isNative ? { startedAt } : {});
  }
  registerShortcuts();
  sendToolbar('toolbar:state', { phase: 'recording', startedAt, withScreen, canTrack: withScreen, clicks: !!native });
  return { display: displayInfo(recordingDisplay, 0), native: isNative, startedAt };
});
ipcMain.handle('rec:stopNative', async (_e, { audio, audioOffsetMs } = {}) => {
  if (!nativeSession) return null;
  const s = nativeSession; nativeSession = null;
  try {
    const file = await s.stop({ audio: audio ? Buffer.from(audio) : null, audioOffsetMs: audioOffsetMs || 0 });
    return { bytes: fs.readFileSync(file), mime: 'video/mp4' };
  } finally { s.cleanup(); }
});
ipcMain.handle('rec:stopTracking', () => {
  const data = tracker.timer ? tracker.stop() : { events: [], segments: [], durationMs: 0 };
  return data;
});
ipcMain.handle('rec:finish', () => {
  unregisterShortcuts();
  if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.destroy();
  toolbarWindow = null;
  if (mainWindow) { mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  return true;
});
ipcMain.on('toolbar:stop', () => mainWindow && mainWindow.webContents.send('rec:stop-request'));
ipcMain.on('toolbar:toggle', () => tracker.timer && tracker.toggleNow());

// ---------------------------------------------------------------- boot
app.whenReady().then(async () => {
  auth.handleLaunchLink();
  PROJECTS_DIR = path.join(app.getPath('videos'), 'RookieClip');
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });

  if (process.platform === 'win32') {
    try { native = require('./native-win'); tracker.native = native; } catch (e) { console.warn('Native cursor bridge unavailable:', e.message); }
  }
  registerProtocol();

  const allowed = ['media', 'display-capture', 'fullscreen'];
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allowed.includes(perm));

  // getDisplayMedia() in the renderer lands here: hand it the display the user picked,
  // so no system picker dialog appears (and cannot end up in the recording).
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    const src = sources.find((s) => s.display_id === captureDisplayId) || sources[0];
    callback(src ? { video: src } : {});
  });

  createMainWindow();
  setupAutoUpdates();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createMainWindow(); });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
