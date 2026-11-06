// sw.js — My Day service worker
// Cache name is derived from __BUILD__ placeholder, which is replaced with
// the git SHA at deploy time by GitHub Actions CI.
// When running locally, the literal string '__BUILD__' is used as cache name — still valid.
var VER   = '__BUILD__';
var CACHE = 'myday-' + VER;

var SHELL = [
  './',
  'assets/theme-init.js',
  'assets/app.css',
  'assets/app.js',
  'assets/i18n.js',
  'assets/icon-192.png',
  'manifest.json'
];

// Assets that should use network-first (JS/CSS/i18n/HTML) so deploys are picked up
var NETWORK_FIRST = /\.(js|css|html)([\?#]|$)|^\.\/$/;

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(SHELL); })
      .then(function()  {
        /* Notify existing clients that an update is available */
        return self.clients.matchAll({type:'window'}).then(function(clients) {
          clients.forEach(function(c) { c.postMessage({type:'SW_UPDATE'}); });
          return self.skipWaiting();
        });
      })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(
        ks.filter(function(k) { return k !== CACHE; })
          .map(function(k)    { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;

  if (r.mode === 'navigate' || NETWORK_FIRST.test(u.pathname) || u.pathname === '/') {
    // Network-first; cache the last good page so we can serve it offline.
    e.respondWith(
      fetch(r).then(function(res) {
        if (res.ok) {
          var c = res.clone();
          caches.open(CACHE).then(function(x) { x.put(r, c); });
        }
        return res;
      }).catch(function() {
        return caches.match(r, {ignoreSearch: true})
          .then(function(hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }

  // Static assets (icons, manifest): cache-first with background refresh
  e.respondWith(
    caches.match(r, {ignoreSearch: true}).then(function(hit) {
      var net = fetch(r).then(function(res) {
        if (res.ok) {
          var c = res.clone();
          caches.open(CACHE).then(function(x) { x.put(r, c); });
        }
        return res;
      });
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window'}).then(function(l) {
      return l.length ? l[0].focus() : self.clients.openWindow('./');
    })
  );
});
