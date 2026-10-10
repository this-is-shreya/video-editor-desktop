'use strict';
// Desktop login: system browser -> one-time code -> rookieclip://auth?code=... -> token (stored encrypted).
// Nothing sensitive ever travels in the link: the code is single-use, expires in 2 minutes and is useless
// without the PKCE verifier, which stays in this process.
const { app, ipcMain, shell, safeStorage } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PROTOCOL = 'rookieclip';
const SERVER = () => process.env.ROOKIECLIP_SERVER_URL || "https://video-editor-server-production.up.railway.app";   // where /auth/* lives
const WEB = () => process.env.ROOKIECLIP_WEB_URL || "https://rookieclip.com";          // where /desktop-login lives
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;
// The server route that understands `Authorization: Bearer <token>` (the one using getEmail(req)).
// Yours is statusDesktop -> /auth/status-desktop. Override with ROOKIECLIP_STATUS_PATH if that changes.
const STATUS_PATH = () => '/auth/status-desktop';
const log = (...a) => console.log('[auth]', ...a);   // never logs codes or tokens

let pending = null;      // { verifier, at }  - the login this app instance started
let memToken = null;
let getWindow = () => null;

// ---- token storage (Windows DPAPI via safeStorage) ------------------------------------------------
const tokenFile = () => path.join(app.getPath('userData'), 'auth.bin');
function saveToken(t) {
  memToken = t;
  try { if (safeStorage.isEncryptionAvailable()) fs.writeFileSync(tokenFile(), safeStorage.encryptString(t)); } catch { /* memory only */ }
}
function loadToken() {
  if (memToken) return memToken;
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    memToken = safeStorage.decryptString(fs.readFileSync(tokenFile()));
    return memToken;
  } catch { return null; }
}
function clearToken() { memToken = null; try { fs.unlinkSync(tokenFile()); } catch { /* none */ } }

const notify = (payload) => {
  const w = getWindow();
  const delivered = !!(w && !w.isDestroyed());
  log('-> renderer:', payload.loggedIn ? 'loggedIn' : `error (${payload.error})`, '| window available:', delivered);
  if (delivered) w.webContents.send('auth:changed', payload);
};
const focusWindow = () => { const w = getWindow(); if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } };

// ---- actions ----------------------------------------------------------------------------------------
// Prefer Google Chrome (set ROOKIECLIP_BROWSER=default to always use the system default browser).
// chrome.exe <url> opens a tab in the running Chrome, or starts it. Falls back to the default browser.
function findChrome() {
  if (process.platform !== 'win32') return null;
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  for (const root of roots) {
    const exe = path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}
async function openInBrowser(url) {
  const want = (process.env.ROOKIECLIP_BROWSER || 'chrome').toLowerCase();
  const chrome = want === 'chrome' ? findChrome() : null;
  if (chrome) {
    try {
      const child = cp.spawn(chrome, [url], { detached: true, stdio: 'ignore' });
      child.once('error', () => shell.openExternal(url));              // e.g. blocked / deleted: use the default browser
      child.unref();
      return;
    } catch { /* fall through */ }
  }
  await shell.openExternal(url);
}

async function login() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  pending = { verifier, at: Date.now() };
  log('login started');
  await openInBrowser(`${WEB()}/desktop-login?challenge=${challenge}`);
  return true;
}

async function status() {
  const token = loadToken();
  if (!token) return { loggedIn: false };
  try {
    const r = await fetch(`${SERVER()}${STATUS_PATH()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { log('status: server answered', r.status); return { loggedIn: false, error: 'server' }; }   // transient: keep the token
    const data = await r.json();
    if (!data.loggedIn) { log(`status: ${STATUS_PATH()} says not logged in -> token cleared (does that route read the Bearer token?)`); clearToken(); }
    return data;
  } catch { return { loggedIn: false, offline: true }; }            // offline: keep the token
}

async function handleDeepLink(url) {
  let u;
  try { u = new URL(url); } catch { return; }
  if (u.protocol !== `${PROTOCOL}:` || u.hostname !== 'auth') return;
  log('deep link received; login in progress:', !!pending);
  focusWindow();
  const code = u.searchParams.get('code');
  if (!code || !pending || Date.now() - pending.at > LOGIN_TIMEOUT_MS) {
    pending = null;
    return notify({ error: 'Login expired. Please try again.' });
  }
  const { verifier } = pending;
  pending = null;                                                      // one attempt per login
  try {
    const r = await fetch(`${SERVER()}/auth/desktop/exchange`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, verifier }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.token) { log('exchange failed:', r.status, data.error || ''); return notify({ error: data.error || 'Login failed. Please try again.' }); }
    saveToken(data.token);
    log('login complete; user isPaid =', !!(data.user && data.user.isPaid));
    notify({ loggedIn: true, user: data.user });
  } catch (e) {
    log('exchange error:', e.message, '(is ROOKIECLIP_SERVER_URL set?', SERVER() + ')');
    notify({ error: 'Could not reach the server.' });
  }
}

// ---- wiring --------------------------------------------------------------------------------------------
/** Call once, BEFORE app.whenReady(). Returns false if this is a second instance (it quits itself). */
function initAuth({ getMainWindow }) {
  getWindow = getMainWindow;
  if (!app.requestSingleInstanceLock()) { app.quit(); return false; }

  // Windows: clicking the link starts a 2nd instance whose argv holds the url -> forward it to the running one.
  app.on('second-instance', (_e, argv) => {
    const link = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
    if (link) handleDeepLink(link); else focusWindow();
  });
  app.on('open-url', (e, url) => { e.preventDefault(); handleDeepLink(url); });   // macOS

  try {
    if (process.defaultApp && process.argv.length >= 2) {            // `electron .` in development
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL);
    }
  } catch (e) { console.warn('Could not register rookieclip:// :', e.message); }

  ipcMain.handle('auth:login', login);
  ipcMain.handle('auth:status', status);
  ipcMain.handle('auth:logout', () => { clearToken(); return true; });
  ipcMain.handle('auth:token', () => loadToken());                     // optional: for renderer API calls (Bearer)
  return true;
}

/** The app was launched BY the link (not already running): call after the main window exists. */
function handleLaunchLink() {
  const link = process.argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  if (link) handleDeepLink(link);
}

module.exports = { initAuth, handleLaunchLink, handleDeepLink, status, login, openInBrowser, findChrome };