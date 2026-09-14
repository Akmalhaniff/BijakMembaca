const CACHE_NAME = 'bijak-membaca-v1';

// Use relative paths for GitHub Pages subdirectory support
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './login.html',
  './parent.html',
  './css/style.css',
  './js/app.js',
  './js/admin.js',
  './js/data.js',
  './js/auth.js',
  './js/darkmode.js',
  './js/sample.js',
  './js/lib/papaparse.min.js',
  './data/students.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' }))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('SW install: some assets failed to cache', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;
  
  // Skip SheetDB API calls - always fetch fresh
  if (url.hostname === 'sheetdb.io') {
    e.respondWith(networkFirst(e.request));
    return;
  }
  
  // Cache-first for static assets
  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}