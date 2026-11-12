// theme-init.js — runs before first paint (external file: CSP forbids inline scripts).
// Applies saved theme, language and PIN-lock state so nothing flashes.
(function () {
  try {
    var el = document.documentElement;
    var th = localStorage.getItem('myday:theme');
    if (th === 'dark' || th === 'light') el.dataset.theme = th;

    var lg = localStorage.getItem('myday:lang');
    // English is the default; Sinhala only when the user chose it.
    el.lang = lg === 'si' ? 'si' : 'en';
    document.title = lg === 'si' ? 'මගේ දවස' : 'My Day';

    // If a PIN exists the app starts locked — content stays hidden until unlocked.
    if (localStorage.getItem('myday:pin')) el.dataset.locked = '1';

    el.dataset.tab = 'today';

    var dark = th === 'dark' || (th !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme:dark)').matches);
    var mc = document.getElementById('themeColor');
    if (mc) mc.setAttribute('content', dark ? '#0A3D38' : '#0A4F49');
  } catch (e) {}
  // Failsafe: never let the preloader trap the user if something goes wrong.
  setTimeout(function () { var p = document.getElementById('preloader'); if (p) p.className += ' done'; }, 6000);
})();
