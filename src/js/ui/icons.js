/**
 * TAILAM — ui/icons.js
 * Final Visual Design Sprint — one consistent icon family for the whole
 * application (replaces every emoji: 🌙 ☀️ 💧 ✕ ▶ ▼). Hand-drawn as a single
 * coherent line-icon set: 24x24 viewBox, 1.75px stroke, currentColor,
 * rounded joins — no external icon font/library, so there is zero
 * performance cost beyond inline SVG markup already used elsewhere in
 * this codebase (see ui/duval-legend.js's inline swatch SVGs).
 *
 * Plain script — publishes on window.TAILAM.ui.icons. Pure presentation:
 * no engineering value is read, computed, or displayed by this file.
 */
(function () {
  'use strict';

  const S = 'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"';

  /** @type {Object<string,string>} icon name → inner SVG markup (24x24 viewBox) */
  const PATHS = {
    // Power transformer — tank, HV bushings, windings
    transformer: `<rect x="5" y="9" width="14" height="11" rx="1.4" ${S}/>
      <path d="M8 9V6.6a1.6 1.6 0 0 1 1.6-1.6h.1a1.6 1.6 0 0 1 1.6 1.6V9M13.7 9V6.6a1.6 1.6 0 0 1 1.6-1.6h.1a1.6 1.6 0 0 1 1.6 1.6V9" ${S}/>
      <path d="M8.5 13h3M8.5 15.7h5" ${S}/>
      <circle cx="15.5" cy="14.5" r="1.9" ${S}/>`,
    // Laboratory flask
    lab: `<path d="M10 3.5h4M10.6 3.5v5.2L6.3 17a1.7 1.7 0 0 0 1.5 2.5h8.4a1.7 1.7 0 0 0 1.5-2.5l-4.3-8.3V3.5" ${S}/>
      <path d="M8.4 14.5h7.2" ${S}/>`,
    // Oil droplet
    oil: `<path d="M12 3.8s5.4 6.4 5.4 10.4a5.4 5.4 0 1 1-10.8 0C6.6 10.2 12 3.8 12 3.8Z" ${S}/>
      <path d="M9.6 15.2a2.4 2.4 0 0 0 2.4 2.4" ${S}/>`,
    // Dissolved gas bubbles
    gas: `<circle cx="8.2" cy="15.4" r="2.3" ${S}/>
      <circle cx="14.6" cy="9.4" r="3" ${S}/>
      <circle cx="17.6" cy="16.4" r="1.5" ${S}/>`,
    // Lightning / electrical
    lightning: `<path d="M13 3 6 13.2h5.1L11 21l7-10.4h-5.1L13 3Z" ${S} stroke-linejoin="round"/>`,
    // Health / pulse
    health: `<path d="M12 20.2s-7.4-4.5-9-9.5C1.9 6.9 4.4 4 7.4 4c1.9 0 3.5 1 4.6 2.6C13.1 5 14.7 4 16.6 4c3 0 5.5 2.9 4.4 6.7-1.6 5-9 9.5-9 9.5Z" ${S}/>
      <path d="M6.4 12h2.4l1.4-2.6 1.7 4.6 1.3-2h2.7" ${S}/>`,
    // Warning triangle
    warning: `<path d="M12 4.4 21 19H3L12 4.4Z" ${S} stroke-linejoin="round"/>
      <path d="M12 10.4v4M12 17.1v.1" ${S}/>`,
    // Download
    download: `<path d="M12 4v11.4M7.8 11.4 12 15.6l4.2-4.2" ${S}/>
      <path d="M5 18.6h14" ${S}/>`,
    // Export (document with up-arrow)
    export: `<path d="M7 3.6h7.4L18 7.2V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1Z" ${S}/>
      <path d="M14.2 3.6V7.2H18" ${S}/>
      <path d="M12 10.4v6M9.6 12.6 12 10.2l2.4 2.4" ${S}/>`,
    // Standards / certified document
    standards: `<path d="M6.5 3.6h9L19 7v13.4a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1Z" ${S}/>
      <path d="M14.5 3.6V7H19" ${S}/>
      <path d="M8.6 12.8l2 2 4-4.4" ${S}/>`,
    // Settings gear
    settings: `<circle cx="12" cy="12" r="2.7" ${S}/>
      <path d="M12 4.4v2M12 17.6v2M19.6 12h-2M6.4 12h-2M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4M17.5 17.5l-1.4-1.4M7.9 7.9 6.5 6.5" ${S}/>`,
    // Help / question
    help: `<circle cx="12" cy="12" r="8.6" ${S}/>
      <path d="M9.6 9.6a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.1.9-1.1 1.9" ${S}/>
      <path d="M12 16.9v.1" ${S}/>`,
    // Sun (light theme)
    sun: `<circle cx="12" cy="12" r="3.6" ${S}/>
      <path d="M12 3.4v2M12 18.6v2M20.6 12h-2M5.4 12h-2M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4M17.5 17.5l-1.4-1.4M7.9 7.9 6.5 6.5" ${S}/>`,
    // Moon (dark theme)
    moon: `<path d="M20 14.2A8.4 8.4 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" ${S} stroke-linejoin="round"/>`,
    // Close
    close: `<path d="M6 6l12 12M18 6 6 18" ${S}/>`,
    // Chevron down
    chevronDown: `<path d="M5.6 8.6 12 15l6.4-6.4" ${S}/>`,
    // Chevron right (breadcrumb separator)
    chevronRight: `<path d="M9 5.6 15.4 12 9 18.4" ${S}/>`,
    // Play (run analysis)
    play: `<path d="M7 4.6v14.8l13-7.4-13-7.4Z" ${S} stroke-linejoin="round"/>`,
    // Home
    home: `<path d="M4 11.4 12 4l8 7.4" ${S}/>
      <path d="M6 10.2V19a1 1 0 0 0 1 1h3.4v-5.4h3.2V20H17a1 1 0 0 0 1-1v-8.8" ${S}/>`,
    // Check (used for loading-sequence completed steps)
    check: `<path d="M5.4 12.6 9.6 17 18.8 7" ${S}/>`,
  };

  /**
   * Return inline SVG markup for a named icon.
   * @param {string} name - key in PATHS
   * @param {{size?:number, className?:string}} [opts]
   * @returns {string} SVG markup, or '' if the name is unknown
   */
  function svg(name, opts) {
    const inner = PATHS[name];
    if (!inner) return '';
    const size = (opts && opts.size) || 20;
    const cls = (opts && opts.className) ? ` class="${opts.className}"` : '';
    return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.icons = { svg, names: Object.keys(PATHS) };
})();
