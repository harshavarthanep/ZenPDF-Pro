/* =========================================================================
   ZENPDF PRO — NATIVE BRIDGE                       built by H24 Creationz
   =========================================================================
   Added to index.html at build time, before any of the app's code.  In a
   normal browser it does nothing at all (first check below), so the website
   behaves exactly as before.

   Inside the desktop app (Windows / Mac / Linux, Electron) or the phone app
   (Android / iOS, Capacitor) it handles what a browser does differently:
     1. tells ZenPDF Pro it is installed (no “Install app” prompts) and
        gives it the app version for update checks
     2. no service worker (the app already holds every file)
     3. desktop: PDFs opened with ZenPDF Pro (double-click, “Open with”)
     4. phone: links open in the phone's browser
     5. phone: downloads are saved to Documents/ZenPDF Pro, with Share
     6. phone: the Share button uses the phone's share sheet (with files)
   ========================================================================= */
(function () {
  'use strict';
  var desk = window.zenpdfDesktop;
  var C = window.Capacitor;
  var isCap = !!(C && (typeof C.isNativePlatform === 'function' ? C.isNativePlatform() : C.isNative));
  if (!desk && !isCap) return;                       // plain browser: change nothing

  var VERSION = __ZP_VERSION__, REPO = __ZP_REPO__;
  var platform = desk ? desk.platform : (C.getPlatform ? C.getPlatform() : 'mobile');
  var names = { win32: 'Windows', darwin: 'Mac', linux: 'Linux', android: 'Android', ios: 'iPhone & iPad' };
  var owner = REPO.split('/')[0], name = REPO.split('/')[1] || '';
  window.ZENPDF_NATIVE = {
    platform: platform, label: (names[platform] || platform) + ' app', version: VERSION, repo: REPO,
    download: 'https://' + owner.toLowerCase() + '.github.io/' + name + '/download.html'
  };
  document.documentElement.setAttribute('data-native', platform);

  /* ------------------------------------------- 1. it is installed */
  try { Object.defineProperty(navigator, 'standalone', { configurable: true, get: function () { return true; } }); } catch (e) {}
  if (window.matchMedia) {
    var realMatch = window.matchMedia.bind(window);
    window.matchMedia = function (q) {
      if (/display-mode\s*:\s*standalone/i.test(String(q))) {
        var r = realMatch(q);
        return { matches: true, media: r.media, onchange: null, addListener: function () {}, removeListener: function () {},
          addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
      }
      return realMatch(q);
    };
  }
  /* ------------------------------------------- 2. no service worker */
  try { delete Navigator.prototype.serviceWorker; } catch (e) {}
  try { if ('serviceWorker' in navigator) Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: function () { return undefined; } }); } catch (e) {}

  /* ------------------------------------------- 3. desktop: open with */
  if (desk) {
    window.__zpOpenQueue = window.__zpOpenQueue || [];
    desk.onOpenFiles(function (list) {
      var files = (list || []).map(function (f) { return new File([f.data], f.name, { type: /\.pdf$/i.test(f.name) ? 'application/pdf' : '' }); });
      if (!files.length) return;
      if (window.Z && typeof window.Z.openFiles === 'function') window.Z.openFiles(files);
      else window.__zpOpenQueue = window.__zpOpenQueue.concat(files);
    });
    if (desk.ready) desk.ready();
    return;                                          // everything below is phone-only
  }

  var P = C.Plugins || {};
  function toast(msg, actionLabel, action) {
    function show() {
      var t = document.createElement('div');
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);' +
        'z-index:2147483647;max-width:92vw;display:flex;gap:12px;align-items:center;background:#1d1d1f;color:#fff;' +
        'font:500 14px/1.35 Inter,system-ui,sans-serif;padding:12px 14px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.28)';
      var s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
      if (actionLabel && action) {
        var b = document.createElement('button'); b.textContent = actionLabel;
        b.style.cssText = 'background:#0a84ff;color:#fff;border:0;border-radius:9px;padding:7px 12px;font:600 13px Inter,system-ui,sans-serif';
        b.onclick = function () { action(); t.remove(); }; t.appendChild(b);
      }
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.remove(); }, 6500);
    }
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }

  /* ------------------------------------------- 4. links -> browser */
  var realOpen = window.open;
  window.open = function (url) {
    try {
      var u = new URL(url, location.href);
      if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) {
        if (P.Browser) P.Browser.open({ url: u.href }); else location.href = u.href;
        return { closed: false, close: function () {}, focus: function () {} };
      }
      if (u.protocol === 'blob:') { saveHref(u.href, 'ZenPDF Pro document.pdf'); return { closed: false, close: function () {}, focus: function () {} }; }
    } catch (e) {}
    return realOpen.apply(window, arguments);
  };

  /* ------------------------------------------- 5. downloads -> phone */
  var blobs = new Map(), realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
  URL.createObjectURL = function (obj) { var u = realCreate.call(URL, obj); if (obj instanceof Blob) blobs.set(u, obj); return u; };
  URL.revokeObjectURL = function (u) { setTimeout(function () { blobs.delete(u); try { realRevoke.call(URL, u); } catch (e) {} }, 180000); };
  function getBlob(href) { return blobs.has(href) ? Promise.resolve(blobs.get(href)) : fetch(href).then(function (r) { return r.blob(); }); }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); res(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function clean(n) { n = String(n || '').replace(/[\\/:*?"<>|]+/g, '_').trim(); return n || ('ZenPDF Pro ' + Date.now() + '.pdf'); }
  /* big PDFs are written in 3 MB pieces so the phone never runs out of memory */
  function writeBlob(blob, path, dir) {
    var CH = 3 * 1024 * 1024, pos = 0, first = true;
    function next() {
      if (pos >= blob.size && !first) return P.Filesystem.getUri({ path: path, directory: dir });
      var part = blob.slice(pos, pos + CH); pos += CH;
      return b64(part).then(function (data) {
        var op = first ? P.Filesystem.writeFile({ path: path, data: data, directory: dir, recursive: true })
                       : P.Filesystem.appendFile({ path: path, data: data, directory: dir });
        first = false;
        return op.then(next);
      });
    }
    return next();
  }
  function shareUris(uris, title) { return P.Share ? P.Share.share({ title: title, files: uris, dialogTitle: 'Send ' + title }) : Promise.resolve(); }
  function saveBlob(blob, rawName) {
    var name = clean(rawName);
    return writeBlob(blob, 'ZenPDF Pro/' + name, 'DOCUMENTS').then(function (res) {
      toast('Saved to Documents/ZenPDF Pro/' + name, 'Share', function () { shareUris([res.uri], name).catch(function () {}); });
    }, function () {
      return writeBlob(blob, name, 'CACHE').then(function (res) { return shareUris([res.uri], name); });
    }).catch(function (err) {
      var m = String((err && err.message) || err || '');
      if (!/cancel/i.test(m)) toast('Could not save the file: ' + m);
    });
  }
  function saveHref(href, name) { if (!P.Filesystem) return false; getBlob(href).then(function (b) { return saveBlob(b, name); }); return true; }
  function handleAnchor(a) {
    if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;
    var href = a.href || '';
    if (!/^(blob:|data:)/i.test(href)) return false;
    return saveHref(href, a.getAttribute('download') || a.download);
  }
  var realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (handleAnchor(this)) return; return realClick.apply(this, arguments); };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (a && handleAnchor(a)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ------------------------------------------- 6. share sheet, with files */
  if (P.Share && P.Filesystem) {
    var share = function (d) {
      d = d || {};
      var files = Array.prototype.slice.call(d.files || []);
      var go = files.length
        ? Promise.all(files.map(function (f, i) { return writeBlob(f, 'share/' + i + '-' + clean(f.name), 'CACHE').then(function (r) { return r.uri; }); }))
            .then(function (uris) { return P.Share.share({ title: d.title, text: d.text, files: uris, dialogTitle: d.title || 'Share' }); })
        : P.Share.share({ title: d.title, text: d.text, url: d.url });
      return go.then(function () {}, function (e) { throw new DOMException(String((e && e.message) || 'Share canceled'), 'AbortError'); });
    };
    try { Object.defineProperty(navigator, 'share', { configurable: true, value: share }); } catch (e) {}
    try { Object.defineProperty(navigator, 'canShare', { configurable: true, value: function () { return true; } }); } catch (e) {}
  }
})();
