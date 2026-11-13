// ZenPDF Pro for Windows, Mac and Linux — built by H24 Creationz.
// Loads the same index.html as the website, from inside the app, with every
// engine bundled, so it works fully offline.  PDFs can be opened with it
// (double-click, “Open with”, drag onto the icon).
const { app, BrowserWindow, Menu, shell, session, protocol, net, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const APP_ID = 'com.h24creationz.zenpdfpro';
const WWW = path.join(__dirname, 'www');
const ORIGIN = 'app://zenpdf';
const OPENABLE = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?|heic|heif|docx?|odt|rtf|xlsx?|ods|csv|pptx?|odp|txt|md|html?)$/i;

app.setAppUserModelId(APP_ID);
app.setName('ZenPDF Pro');

// A private, secure “app://” address: fast local loading, its own storage,
// and the same browser features the website gets.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
let rendererReady = false;
let pending = [];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream' };

function filesFromArgs(argv) {
  return (argv || []).slice(1).filter(a => a && !a.startsWith('-') && OPENABLE.test(a) && fs.existsSync(a));
}
function openPaths(paths) {
  paths = (paths || []).filter(Boolean);
  if (!paths.length) return;
  if (!win || !rendererReady) { pending = pending.concat(paths); return; }
  const list = [];
  for (const p of paths) {
    try {
      const st = fs.statSync(p);
      if (!st.isFile() || st.size > 1024 * 1024 * 1024) continue;
      list.push({ name: path.basename(p), data: fs.readFileSync(p) });
    } catch (e) { console.error('open', p, e); }
  }
  if (list.length) win.webContents.send('zenpdf:open-files', list);
  if (win.isMinimized()) win.restore();
  win.focus();
}

function isWebLink(url) { return /^(https?:|mailto:|tel:)/i.test(url); }

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 860, minWidth: 380, minHeight: 540,
    title: 'ZenPDF Pro',
    backgroundColor: '#f6f6f3',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true,
      plugins: true,   // built-in PDF viewer, used for printing
    },
  });
  if (process.platform !== 'darwin') win.removeMenu();
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebLink(url)) { shell.openExternal(url); return { action: 'deny' }; }
    if (/^(blob:|data:application\/pdf)/i.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { width: 1000, height: 800, autoHideMenuBar: true, title: 'ZenPDF Pro', webPreferences: { plugins: true, sandbox: true } } };
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith(ORIGIN)) return;
    e.preventDefault();
    if (isWebLink(url)) shell.openExternal(url);
  });
  win.webContents.on('did-start-loading', () => { rendererReady = false; });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta, wc = win.webContents;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    else if (ctrl && (input.key === '=' || input.key === '+')) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); event.preventDefault(); }
    else if (ctrl && input.key === '-') { wc.setZoomLevel(wc.getZoomLevel() - 0.5); event.preventDefault(); }
    else if (ctrl && input.key === '0') { wc.setZoomLevel(0); event.preventDefault(); }
    else if (ctrl && input.shift && input.key.toLowerCase() === 'i') { wc.toggleDevTools(); event.preventDefault(); }
    else if (input.key === 'F5' || (ctrl && input.key.toLowerCase() === 'r' && !input.shift)) { wc.reload(); event.preventDefault(); }
  });
  win.webContents.on('render-process-gone', (e, d) => {
    if (d.reason === 'clean-exit') return;
    const r = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Reload', 'Close'], message: 'ZenPDF Pro stopped unexpectedly', detail: 'Your files and edits are saved on this computer. Reload to continue.' });
    if (r === 0) win.reload(); else app.quit();
  });
  win.on('closed', () => { win = null; rendererReady = false; });
  win.loadURL(ORIGIN + '/index.html');
}

function macMenu() {
  const about = { label: 'About ZenPDF Pro', click: () => app.showAboutPanel() };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'ZenPDF Pro', submenu: [about, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'ZenPDF Pro on GitHub', click: () => shell.openExternal('https://github.com/harshavarthanep/ZenPDF-Pro') }] },
  ]));
}

ipcMain.on('zenpdf:ready', (e) => {
  if (!win || e.sender !== win.webContents) return;
  rendererReady = true;
  const p = pending; pending = [];
  openPaths(p);
});

app.on('second-instance', (e, argv) => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  openPaths(filesFromArgs(argv));
});
// Mac: files dropped on the Dock icon or opened from Finder
app.on('open-file', (e, p) => { e.preventDefault(); if (app.isReady()) { if (!win) createWindow(); openPaths([p]); } else pending.push(p); });

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW + path.sep) || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const type = MIME[path.extname(file).toLowerCase()];
    return type ? new Response(res.body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'no-cache' } }) : res;
  });
  // One person, one computer: allow what ZenPDF Pro asks for (clipboard,
  // notifications, folder access for “Bring in downloads”).
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm !== 'media' && perm !== 'geolocation'));
  app.setAboutPanelOptions({ applicationName: 'ZenPDF Pro', applicationVersion: app.getVersion(), copyright: 'Built by H24 Creationz', credits: 'Every PDF tool, private and on your device.' });
  if (process.platform === 'darwin') macMenu();
  pending = pending.concat(filesFromArgs(process.argv));
  createWindow();
});

app.on('activate', () => { if (!win) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
