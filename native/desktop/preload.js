// ZenPDF Pro desktop — the only things the page can ask the app for:
// files opened with ZenPDF Pro, and which computer it is running on.
const { contextBridge, ipcRenderer } = require('electron');
let handler = null, early = [];
ipcRenderer.on('zenpdf:open-files', (e, list) => {
  const files = (list || []).map(f => ({ name: String(f.name), data: new Uint8Array(f.data) }));
  if (handler) handler(files); else early = early.concat(files);
});
contextBridge.exposeInMainWorld('zenpdfDesktop', {
  platform: process.platform,
  onOpenFiles(cb) { handler = cb; if (early.length) { const e = early; early = []; cb(e); } },
  ready() { ipcRenderer.send('zenpdf:ready'); },
});
