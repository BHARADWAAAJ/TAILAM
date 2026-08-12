/**
 * TAILAM — sw.js (service worker)
 *
 * Enables full offline use, matching the app's own "runs 100% in your
 * browser, no upload" positioning: every calculation, the Engineering
 * Workbook, and PDF/Excel/CSV export already work with zero network access
 * (verified throughout this project's own test suite) — the only thing
 * that ever needed a network was the FIRST page load itself. This worker
 * precaches that same-origin app shell (index.html, every src/css and
 * src/js file, the manifest, and the icons) so subsequent loads work fully
 * offline, including a cold start with no connectivity at all.
 *
 * Scope is deliberately narrow: only same-origin GET requests are served
 * from cache. Cross-origin requests (Google Fonts, the ExcelJS CDN script,
 * Google Analytics, Microsoft Clarity) are left to the network untouched —
 * the app already degrades gracefully without them (system font fallback,
 * automatic CSV export fallback when ExcelJS didn't load, and every
 * analytics call is guarded by a `typeof window.gtag === 'function'`-style
 * check) so there is nothing for this worker to cache or fix there.
 *
 * Zero engineering logic lives here — this only affects what loads from
 * cache vs. network, never what any calculation returns.
 */
'use strict';

// Bump this whenever a precached file changes, so the next visit picks up
// the new version instead of serving a stale cached copy indefinitely.
const CACHE_NAME = 'tailam-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './src/css/variables.css',
  './src/css/base.css',
  './src/css/layout.css',
  './src/css/components.css',
  './src/css/dashboard.css',
  './src/css/flow.css',
  './src/css/detailed.css',
  './src/css/duval.css',
  './src/css/print.css',
  './src/js/utils/helpers.js',
  './src/js/utils/validators.js',
  './src/js/engine/confidence.js',
  './src/js/engine/duval.js',
  './src/js/engine/duval2.js',
  './src/js/engine/rogers.js',
  './src/js/engine/iec.js',
  './src/js/engine/ieee.js',
  './src/js/engine/keygas.js',
  './src/js/engine/doernenburg.js',
  './src/js/engine/cigre.js',
  './src/js/engine/consensus.js',
  './src/js/engine/thi.js',
  './src/js/engine/recommendations.js',
  './src/js/ui/icons.js',
  './src/js/theme.js',
  './src/js/ui/cards.js',
  './src/js/ui/charts.js',
  './src/js/ui/duval-legend.js',
  './src/js/ui/duval-svg.js',
  './src/js/ui/dialogs.js',
  './src/js/ui/modals.js',
  './src/js/ui/workspace.js',
  './src/js/ui/detailed-calcs.js',
  './src/js/ui/dashboard.js',
  './src/js/ui/export.js',
  './src/js/ui/loading.js',
  './src/js/ui/feedback.js',
  './src/js/ui/motion.js',
  './src/js/navigation.js',
  './src/js/analytics.js',
  './src/js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only same-origin GETs are ever served from cache — everything else
  // (cross-origin CDNs/analytics, non-GET requests) goes straight to the
  // network untouched, exactly as it would with no service worker at all.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache a copy of any other same-origin file fetched later (e.g. a
        // future asset not in APP_SHELL yet) so it's available offline too.
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached); // offline and not cached: nothing more we can do
    })
  );
});
