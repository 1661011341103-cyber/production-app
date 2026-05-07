// ===== Service Worker — Offline Support =====
const CACHE_NAME = 'production-app-v1';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './export.js',
  './chart.js',
  './keyboard.js',
  './manifest.json',
];

// ── Install: cache all assets ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for assets, network-first for API ──
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Google Apps Script API → network only (no cache)
  if (url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // App assets → cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      // cache new assets dynamically
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
