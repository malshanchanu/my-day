# My Day v3.6 — deploy notes

## Deploy
- **Static only (no AI):** drag the `my-day-site` folder onto Netlify. Everything works, the assistant answers on-device.
- **With Smart AI:** deploy through Git or `netlify deploy --prod` so `netlify/functions/chat.js` is built.
  Netlify → Site settings → Environment variables:
  - `ANTHROPIC_API_KEY` (required)
  - `CHAT_ACCESS_CODE`  (recommended — then enter the same code in the app: Settings → Assistant)
  - `ANTHROPIC_MODEL`   (optional, default `claude-haiku-5-5`)

## Notes
- PHP is not supported on Netlify, so the project stays HTML/CSS/JS. Bootstrap was not added: the app has its own lightweight design system, and Bootstrap would add weight and clash with the offline/CSP setup.
- Bump `VER` in `sw.js`, `BUILD` in `assets/app.js` and the `?v=` strings in `index.html` on every release.

- v3.6.1: the AI assistant is paused ("coming soon"). Flip `AI_COMING_SOON` to `false` in `assets/app.js` to re-enable it.
- v3.6.2: Study tab has a to-do list; the branded preloader flashes on navigation clicks (`CLICK_PRELOADER` in `assets/app.js`).
- v3.6.3: "Powered By Chanuka Malshan" credit on the start-up preloader and at the bottom of Settings.
- v3.6.4: Spend tab has a PDF report (month or custom range) using the browser's print dialog (no libraries, Sinhala-safe).
- v3.6.5: data safety (IndexedDB mirror + auto-restore, in-app browser / iPhone / backup notices) and notification status + test button.
