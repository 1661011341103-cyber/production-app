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

// ── Fetch: network-first สำหรับ JS/CSS, cache-first สำหรับอื่น ──
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Google Apps Script API → network only
  if (url.includes('script.google.com')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"error":"offline"}', {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // JS, CSS, HTML → network-first (ได้ไฟล์ใหม่เสมอ ถ้าออนไลน์)
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (['js', 'css', 'html'].includes(ext)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request)) // fallback cache ถ้าออฟไลน์
    );
    return;
  }

  // อื่นๆ (รูป, font) → cache-first
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
    )
  );
});

// ── รับคำสั่ง SKIP_WAITING → activate ทันที ─────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
