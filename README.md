# ZenPDF Pro

**Every PDF tool — edit, sign, fill, merge, compress, convert — private and on your device.**
Designed and built by **H24 Creationz**.

- 🌐 Web app: `https://harshavrthanep.github.io/ZenPDF-Pro/`
- ⬇️ Download page: `https://harshavarthanep.github.io/ZenPDF-Pro/download.html`
- 💻 Apps: Windows (Intel & AMD, plus ARM) · Mac (Intel & Apple Silicon) · Linux · Android · iPhone/iPad (Home Screen)

---

## What's in this repository

| Path | What it is |
|---|---|
| `index.html` | The whole app. The website **and** every app are built from this one file. |
| `download.html` | Download page — detects the visitor's device and offers the right file. |
| `manifest.webmanifest`, `sw.js`, `zenpdf-*.png` | Web app install + offline support, icons. |
| `memory-packs/` | Optional country / profession packs people can import (India, United States, US healthcare). |
| `native/shared/` | The build step: bundles every engine and font into the apps so they work offline. |
| `native/desktop/` | Windows / Mac / Linux app (Electron). |
| `native/mobile/` | Android / iOS app (Capacitor). |
| `.github/workflows/build-apps.yml` | One button that builds every app and publishes them. |

---

## First-time setup (about 10 minutes, once)

1. **Create the repository** on GitHub named `ZenPDF-Pro` (Public).
2. **Upload everything** from this folder: *Add file → Upload files*, drag in all files **and folders** (including the hidden `.github` folder — see the tip below), then *Commit changes*.
3. **Turn on the website:** *Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.*
4. **Add the Android signing key** (from the separate PRIVATE zip — *never* upload that zip):
   *Settings → Secrets and variables → Actions → New repository secret*, and add the 4 secrets listed in `GITHUB-SECRETS-READ-ME.txt`.
5. **Build the apps:** *Actions → "Build ZenPDF Pro apps" → Run workflow →* version `1.0.0` *→ Run workflow.*
   After about 15–20 minutes a **Release** appears with all the downloads, and `download.html` starts working.

> **Tip — the `.github` folder:** Mac and Windows hide folders that start with a dot. If it didn't upload,
> create it on GitHub: *Add file → Create new file*, type the name `.github/workflows/build-apps.yml`,
> paste the contents of that file, and commit.

## Releasing an update

1. Replace `index.html` with the new version and commit.
2. *Actions → Build ZenPDF Pro apps → Run workflow*, with a **higher** version (e.g. `1.0.1`).

The website updates immediately. The installed apps show "ZenPDF Pro 1.0.1 is available" the next time they open
(and in *Settings → Check for updates*), and every link on the download page now serves the new version.

---

## Notes for each platform

- **Windows:** first run shows *"Windows protected your PC"* → *More info → Run anyway* (normal for apps without a paid
  code-signing certificate, ~US$100–300/year). Double-clicking a PDF can open it in ZenPDF Pro.
- **Mac:** first open → *System Settings → Privacy & Security → Open Anyway*. Removing that step needs an
  Apple Developer account (US$99/year) for signing and notarization.
- **Linux:** `.deb` for Ubuntu/Debian/Mint, `.AppImage` for everything else.
- **Android:** saved files go to *Documents/ZenPDF Pro* with a Share button. Keep the signing key safe — updates
  only install over the old version when they are signed with the same key.
- **iPhone/iPad:** Apple only allows apps from the App Store. People use the web app: Safari → Share → *Add to Home
  Screen* (full-screen, works offline). To publish on the App Store later you need an Apple Developer account and a Mac;
  `native/mobile` already contains the Capacitor setup (`npx cap add ios`, then open in Xcode).
- **OCR (reading text from scans)** downloads its language data the first time it is used; everything else in
  the apps works with no internet.
- **Google Drive sync** stays off in the apps — Google doesn't allow its sign-in inside installed apps.

## Form memory (optional, per device)

ZenPDF Pro has no country-specific checks by default. People can add them in *Settings → Form memory*:

- **Import a pack** — from `memory-packs/`, or one you make (see `memory-packs/README.md`).
- **Write rules** — e.g. `check! "Passport number" format A9999999` or `fill "Nationality" = Indian`.
  The editor has examples, a live tester and a full list of checks.
- **Learns as you go** — Autofill remembers every correction and fills the next form better.

## Building on your own computer (optional)

```bash
cd native/shared && npm install            # once — downloads the engines that get bundled
cd ../desktop && npm install
npm start                                  # run the desktop app
npm run build:win                          # or build:mac / build:linux → native/desktop/dist/
```

---

ZenPDF Pro · © H24 Creationz
