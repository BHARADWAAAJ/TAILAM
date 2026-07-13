/**
 * TAILAM — theme.js
 * Dark/light theme state, persistence, and the force-light override used
 * when capturing canvases for white-background exports.
 *
 * Plain script — publishes on window.TAILAM.theme.
 */
(function () {
  'use strict';

  let _forceLightCanvas = false;
  let _redrawCallback = null;

  /**
   * True when the UI (or a canvas render) should use dark colors.
   * Returns false while the force-light export override is active.
   * @returns {boolean}
   */
  function isDarkTheme() {
    return !_forceLightCanvas && document.documentElement.getAttribute('data-theme') !== 'light';
  }

  /**
   * Enable/disable the force-light canvas override (export capture only).
   * @param {boolean} on
   */
  function setForceLightCanvas(on) { _forceLightCanvas = !!on; }

  /**
   * Apply and persist a theme.
   * @param {'dark'|'light'} mode
   */
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    const btn = document.getElementById('theme-btn');
    // Design sprint — SVG icon (sun/moon) from the shared icon family instead
    // of an emoji glyph, for visual consistency with the rest of the UI.
    if (btn) {
      const icons = window.TAILAM.ui.icons;
      btn.innerHTML = icons ? icons.svg(mode === 'light' ? 'sun' : 'moon', { size: 18 }) : '';
      btn.setAttribute('aria-label', mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
    try { localStorage.setItem('dga-theme', mode); } catch { /* localStorage unavailable (private mode, etc.) — theme still applies for this session */ }
  }

  /**
   * Register the callback that re-renders visible canvases after a theme
   * change (wired by app.js to avoid a circular import with the dashboard).
   * @param {Function} fn
   */
  function registerThemeRedraw(fn) { _redrawCallback = fn; }

  /** Toggle between dark and light, then redraw visible canvases. */
  function toggleTheme() {
    applyTheme(isDarkTheme() ? 'light' : 'dark');
    if (_redrawCallback) _redrawCallback();
  }

  /** Initialise theme from localStorage or the OS preference. */
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('dga-theme'); } catch { /* localStorage unavailable — fall through to OS preference */ }
    if (!saved) saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    applyTheme(saved);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.theme = { isDarkTheme, setForceLightCanvas, applyTheme, registerThemeRedraw, toggleTheme, initTheme };
})();
