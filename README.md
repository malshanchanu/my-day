# මගේ දවස / My Day

A personal planner PWA — expenses, reminders, and birthdays — that runs entirely in your browser. No server, no account, no cost.

**Live demo:** `https://YOUR_USERNAME.github.io/my-day/`

---

## Features

- 💰 Expense tracker with categories, recurring expenses, and monthly report
- 🔔 Reminders with repeat rules (daily / weekly / monthly) and snooze
- 🎂 Birthday countdown with notifications
- 💾 Works fully offline (PWA, service worker)
- 🌐 Sinhala / English language switch
- 🌙 Auto / Light / Dark theme
- 🔒 Optional 4-6 digit PIN lock (screen lock only — data is not encrypted)
- 📤 Export and import your data as JSON (for backup and device migration)

---

## Data & Privacy

All data lives only in your browser's `localStorage`. Nothing is sent to any server.

> **⚠️ Important:** Browser storage is not permanent.
> - On iOS Safari, unused sites are cleared after 7 days (unless the app is installed to the home screen and opened regularly).
> - Clearing browser data / site data will erase everything.
> - **Back up regularly** using the Export button in Settings → Export Data (JSON).

The PIN lock is a screen-lock only. It does **not** encrypt the underlying data.

---

## Setup — GitHub Pages (free hosting)

### First time

1. **Create a GitHub account** at [github.com](https://github.com) (if you don't have one).
2. Create a **new repository** named `my-day` — set it **Private** first.
3. Clone or download this project into the repo.
4. Push to `main`:
   ```sh
   git init
   git add .
   git commit -m "Initial static PWA"
   git remote add origin https://github.com/YOUR_USERNAME/my-day.git
   git branch -M main
   git push -u origin main
   ```
5. **Make the repo public**: GitHub → Settings → General → Danger Zone → Change visibility → Public.
   _(GitHub Pages is free only for public repos. Only do this after verifying no secrets are in the code.)_
6. Enable Pages: GitHub → Settings → Pages → Source = **GitHub Actions**.
7. Push to `main` again (or just wait — the first push already triggered the workflow).
8. Your app is live at `https://YOUR_USERNAME.github.io/my-day/`

### Install on phone (PWA)

- **Android:** Open in Chrome → three-dot menu → "Add to Home Screen"
- **iOS:** Open in Safari → Share → "Add to Home Screen"

Once installed, the app works fully offline.

---

## Backup & Restore

### Export (backup)
Settings → **Export Data (JSON)** → saves a `.json` file with all your data.

### Import (restore / migrate)
Settings → **Import Data (JSON)** → choose a file → select **Replace** (wipe and restore) or **Merge** (keep both, prefer newer records).

Old format: PHP server exports (without a `version` field) are accepted automatically.

---

## Migrating from the old PHP version

1. Log in to the old PHP app.
2. Settings → Export Data (JSON) — save the file.
3. Open this static app.
4. Settings → Import Data → choose the saved file → Replace.

---

## Development

No build step needed. Edit the files and open `index.html` in a browser:

```sh
# Simple local server (Python):
python -m http.server 8080
# Then open http://localhost:8080/
```

The `__BUILD__` placeholder in `sw.js` and `index.html` defaults to the literal string `__BUILD__` when running locally — this is fine; it just means the SW cache is named `myday-__BUILD__`.

---

## Project structure

```
index.html          — Main app shell (static)
manifest.json       — PWA manifest
sw.js               — Service worker (offline + cache busting)
assets/
  app.js            — App logic (vanilla JS)
  app.css           — Styles (3-way light/dark/auto theme)
  i18n.js           — Translation dictionary (si + en)
  theme-init.js     — Tiny script: applies theme/lang before first paint
  icon-*.png        — App icons
.github/workflows/
  pages.yml         — GitHub Actions: deploy to GitHub Pages
```

---

## License

MIT
