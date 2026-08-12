/**
 * TAILAM — analytics.js
 * Google Analytics 4 (GA4) integration.
 *
 * The gtag.js loader tag itself lives in index.html's <head> (loads async,
 * and its `gtag('config', ...)` call fires GA's own automatic page_view for
 * the initial page load). TAILAM has no real router — Home / Main Tank /
 * OLTC / Help / About / Feedback / Engineering Workbook / Results are all
 * shown by toggling existing DOM (no URL change, no page reload), so GA
 * cannot see any of that navigation on its own. This module adds exactly one
 * thing on top of the tag: a small helper, called from app.js at each real
 * navigation point, that reports a manual GA4 "page_view" event for the
 * virtual page the user just landed on.
 *
 * Every call is defensive — if gtag isn't available (ad-blocker, privacy
 * extension, offline dev, a CDN hiccup on GitHub Pages) this module silently
 * does nothing. Analytics can never throw, and can never affect application
 * behaviour, so no engineering feature depends on it in any way.
 *
 * Plain script — publishes on window.TAILAM.analytics.
 */
(function () {
  'use strict';

  let _lastPath = null; // last virtual page tracked — guards back-to-back duplicates

  /**
   * Record a virtual page view for in-app navigation that doesn't change the
   * real URL. Skips silently if this is an exact repeat of the immediately
   * preceding call (e.g. a handler firing twice for one click) so GA never
   * receives duplicate page_view events for the same navigation.
   * @param {string} path - a virtual path identifying the view, e.g. '/main-tank'
   * @param {string} title - a human-readable title for the GA report
   */
  function trackPageView(path, title) {
    if (!path || path === _lastPath) return;
    _lastPath = path;
    if (typeof window.gtag !== 'function') return; // GA blocked/unavailable — no-op
    try {
      window.gtag('event', 'page_view', {
        page_title: title,
        page_location: window.location.origin + window.location.pathname + '#' + path,
        page_path: path
      });
    } catch (e) { /* analytics must never break the app */ }
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.analytics = { trackPageView };
})();
