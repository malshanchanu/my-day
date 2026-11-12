// sw.js — My Day service worker
// Bump VER on every release (it also versions the ?v= query strings in index.html).
//  • App shell is precached → the app opens instantly and works fully offline.
//  • HTML / JS / CSS: network-first (3s timeout) so a deploy is picked up immediately, cache as fallback.
//  • Icons / manifest: stale-while-revalidate.
//  • Google Fonts: cached at runtime so Sinhala text keeps its font offline.
//  • A new worker WAITS; the page shows an "Update" bar and sends SKIP_WAITING (no surprise mid-session reloads).
var VER = '20261110g';
var CACHE = 'myday-' + VER;
var FONTS = 'myday-fonts-v1';

var SHELL = [
  './',
  'index.html?v=' + VER,
  'assets/theme-init.js?v=' + VER,
  'assets/app.css?v=' + VER,
  'assets/i18n.js?v=' + VER,
  'assets/assistant.js?v=' + VER,
  'assets/app.js?v=' + VER,
  'assets/icon-192-v2.png',
  'assets/icon-512-v2.png',
  'assets/favicon-32.png?v=' + VER,
  'assets/apple-touch-icon.png?v=' + VER,
  'manifest.json?v=' + VER
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache:'reload' bypasses the HTTP cache so we never precache a stale file
      return Promise.all(SHELL.map(function (u) {
        return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return c.put(u, r); });
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function networkFirst(req, fallbackKey) {
  return new Promise(function (resolve) {
    var settled = false;
    var timer = setTimeout(function () {                       // slow network → serve cache, keep fetching in background
      caches.match(req, { ignoreSearch: true }).then(function (hit) { if (hit && !settled) { settled = true; resolve(hit); } });
    }, 3000);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      if (!settled) { settled = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      if (settled) return;
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match(fallbackKey || './');
      }).then(function (hit) { settled = true; resolve(hit || Response.error()); });
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req, { ignoreSearch: cacheName === CACHE }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);

  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(r, FONTS));
    return;
  }
  if (u.origin !== location.origin) return;

  if (r.mode === 'navigate') {
    e.respondWith(networkFirst(r, './'));
    return;
  }
  if (/\.(js|css|html)$/.test(u.pathname) || u.pathname.slice(-1) === '/') {
    e.respondWith(networkFirst(r));
    return;
  }
  e.respondWith(staleWhileRevalidate(r, CACHE));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
      return self.clients.openWindow('./');
    })
  );
});
