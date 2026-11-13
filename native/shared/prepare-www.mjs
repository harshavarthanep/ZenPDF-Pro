// Builds the app folder (www/) for the Windows / Mac / Linux / Android / iOS
// apps from index.html in the repository root:
//
//   1. copies index.html, the icons and the memory packs
//   2. puts every engine and font the website downloads from the internet
//      (pdf-lib, pdf.js, Excel/Word/PowerPoint, encryption, fonts) INSIDE the
//      app, so the installed app works with no internet at all
//   3. adds native-bridge.js (saving files, sharing, updates, “open with”)
//
// Run from native/desktop or native/mobile:   node ../shared/prepare-www.mjs www
// Your website file is never changed — only the copy inside www/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const dest = path.resolve(process.cwd(), process.argv[2] || 'www');
const nm = path.join(here, 'node_modules');
const src = process.env.ZENPDF_HTML ? path.resolve(process.env.ZENPDF_HTML) : path.join(repoRoot, 'index.html');
const warn = (m) => console.log((process.env.GITHUB_ACTIONS ? '::warning::' : 'WARNING: ') + m);

if (!fs.existsSync(src)) { console.error('Cannot find ' + src + ' — put ZenPDF Pro index.html in the repository root.'); process.exit(1); }
if (!fs.existsSync(nm)) { console.error('Run "npm install" in native/shared first (it downloads the engines that get bundled).'); process.exit(1); }

// version + repository, shown in Settings and used for update checks
let version = process.env.APP_VERSION || '';
if (!version) { try { version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version; } catch (_) {} }
const repo = process.env.GITHUB_REPOSITORY || process.env.ZENPDF_REPO || 'harshavarthanep/ZenPDF-Pro';

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.join(dest, 'lib'), { recursive: true });
let html = fs.readFileSync(src, 'utf8');

const copy = (from, to) => { const a = path.join(nm, from), b = path.join(dest, 'lib', to); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.cpSync(a, b, { recursive: true }); };
const abs = (p) => "new URL('./lib/" + p + "', document.baseURI).href";
let missed = 0;
const swap = (from, to, what) => {
  if (!html.includes(from)) { missed++; warn('index.html no longer contains the link for ' + what + ' — the app will download it from the internet instead.'); return; }
  html = html.split(from).join(to);
};

// ---- engines loaded by <script> tags at startup
const tags = [
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'pdf-lib/dist/pdf-lib.min.js', 'pdf-lib.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js', 'pdfjs-dist/build/pdf.min.js', 'pdf.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'jszip/dist/jszip.min.js', 'jszip.min.js'],
];
for (const [url, from, to] of tags) { copy(from, to); swap('"' + url + '"', '"./lib/' + to + '"', to); }

// ---- engines loaded on demand (strings inside the app's code)
const lazy = [
  ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx/dist/xlsx.full.min.js', 'xlsx.full.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf/dist/jspdf.umd.min.js', 'jspdf.umd.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js', 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js', 'jspdf.plugin.autotable.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth/mammoth.browser.min.js', 'mammoth.browser.min.js'],
  ['https://unpkg.com/docx@8.5.0/build/index.umd.js', 'docx/build/index.umd.js', 'docx.umd.js'],
  ['https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', 'pptxgenjs/dist/pptxgen.bundle.js', 'pptxgen.bundle.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js', 'pdfjs-dist/build/pdf.worker.min.js', 'pdf.worker.min.js'],
  ['https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js', '@pdf-lib/fontkit/dist/fontkit.umd.min.js', 'fontkit.umd.min.js'],
  ['https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf', 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf', 'DejaVuSans.ttf'],
];
for (const [url, from, to] of lazy) { copy(from, to); swap("'" + url + "'", abs(to), to); }

// pdf.js font data + character maps (folders)
copy('pdfjs-dist/standard_fonts', 'standard_fonts');
copy('pdfjs-dist/cmaps', 'cmaps');
swap("'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/standard_fonts/'", abs('standard_fonts/'), 'pdf.js fonts');
swap("'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/cmaps/'", abs('cmaps/'), 'pdf.js character maps');

// AES-256 encryption engine (WebAssembly)
for (const f of ['qpdf.mjs', 'qpdf.js', 'qpdf.wasm', 'browser.js']) copy('@jspawn/qpdf-wasm/' + f, 'qpdf/' + f);
swap("'https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/'", abs('qpdf/'), 'encryption engine');

// the 15 extra document fonts (regular, bold, italic, bold italic)
const XF = ['arimo', 'tinos', 'cousine', 'roboto', 'open-sans', 'lato', 'montserrat', 'poppins', 'noto-sans', 'source-sans-pro', 'inter', 'merriweather', 'eb-garamond', 'playfair-display', 'roboto-mono'];
for (const fam of XF) {
  const dir = path.join(nm, '@expo-google-fonts', fam);
  for (const f of fs.readdirSync(dir)) if (/_(400Regular|700Bold|400Regular_Italic|700Bold_Italic)\.ttf$/.test(f)) copy('@expo-google-fonts/' + fam + '/' + f, 'xfonts/' + fam + '/' + f);
}
swap("'https://cdn.jsdelivr.net/npm/@expo-google-fonts/' + x[1] + '@0.2.3/' + file", "new URL('./lib/xfonts/' + x[1] + '/' + file, document.baseURI).href", 'document fonts');

// interface + handwriting-signature fonts (replaces Google Fonts)
const UI = [['inter', [400, 500, 600, 700, 800]], ['great-vibes', [400]], ['dancing-script', [600]], ['homemade-apple', [400]], ['caveat', [600]],
  ['mrs-saint-delafield', [400]], ['herr-von-muellerhoff', [400]], ['la-belle-aurore', [400]], ['sacramento', [400]], ['allura', [400]],
  ['alex-brush', [400]], ['meddon', [400]], ['kristi', [400]], ['reenie-beanie', [400]], ['yellowtail', [400]]];
let css = '/* ZenPDF Pro — interface and signature fonts, bundled for offline use (SIL Open Font License) */\n';
fs.mkdirSync(path.join(dest, 'lib', 'fonts', 'files'), { recursive: true });
for (const [fam, weights] of UI) {
  for (const w of weights) {
    let c = fs.readFileSync(path.join(nm, '@fontsource', fam, w + '.css'), 'utf8');
    c = c.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, '');
    c = c.replace(/url\(\.\/files\/([^)]+\.woff2)\)/g, (_, f) => { fs.copyFileSync(path.join(nm, '@fontsource', fam, 'files', f), path.join(dest, 'lib', 'fonts', 'files', f)); return 'url(files/' + f + ')'; });
    css += c + '\n';
  }
}
fs.writeFileSync(path.join(dest, 'lib', 'fonts', 'fonts.css'), css);
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/, () => '<link href="./lib/fonts/fonts.css" rel="stylesheet">');
html = html.replace(/<link rel="preconnect"[^>]*>\n?/g, '');

// ---- the bridge, before any of the app's code
const bridge = fs.readFileSync(path.join(here, 'native-bridge.js'), 'utf8')
  .replace('__ZP_VERSION__', JSON.stringify(version || '1.0.0'))
  .replace('__ZP_REPO__', JSON.stringify(repo));
const marker = '<!-- zenpdf-native-bridge -->';
let injected = false;
html = html.replace(/<meta charset="UTF-8">/i, (m) => { injected = true; return m + '\n' + marker + '\n<script>\n' + bridge + '\n</script>'; });
if (!injected) { console.error('Could not find <meta charset="UTF-8"> in index.html'); process.exit(1); }
// the installed app is the app: no web manifest, no service worker
html = html.replace(/<link\s+rel=["']manifest["'][^>]*>/i, '');

fs.writeFileSync(path.join(dest, 'index.html'), html);
for (const f of ['zenpdf-icon-192.png', 'zenpdf-icon-512.png', 'zenpdf-apple-touch-icon.png']) {
  const p = path.join(repoRoot, f); if (fs.existsSync(p)) fs.copyFileSync(p, path.join(dest, f));
}
const packs = path.join(repoRoot, 'memory-packs');
if (fs.existsSync(packs)) fs.cpSync(packs, path.join(dest, 'memory-packs'), { recursive: true });

const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log('Prepared ' + path.relative(process.cwd(), dest) + '/ — ' + Math.round(size(dest) / 1048576) + ' MB, version ' + version + ', repo ' + repo + (missed ? ', ' + missed + ' link(s) left online' : ', every engine bundled'));
