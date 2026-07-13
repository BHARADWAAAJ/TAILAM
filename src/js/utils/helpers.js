/**
 * TAILAM — utils/helpers.js
 * Small shared utilities used across engine, UI and export layers.
 * No engineering logic lives here.
 *
 * Plain script (no ES modules — file:// and GitHub Pages both work without
 * a server). Loaded first; publishes its API on window.TAILAM.utils.helpers.
 */
(function () {
  'use strict';

  /** Display labels for the seven fault gases, keyed by internal gas key. */
  const GAS_LABELS = { h2:'H₂', ch4:'CH₄', c2h6:'C₂H₆', c2h4:'C₂H₄', c2h2:'C₂H₂', co:'CO', co2:'CO₂' };

  /**
   * Escape a value for safe interpolation into HTML.
   * @param {*} s - any value; null/undefined become ''.
   * @returns {string} HTML-escaped string.
   */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Format a diagnostic ratio for display.
   * null → 'N/A' (denominator unusable), 9999 → '∞' (division by zero sentinel).
   * @param {?number} v
   * @returns {string}
   */
  function fmtRatio(v) {
    return v === null ? 'N/A' : (v === 9999 ? '∞' : v.toFixed(3));
  }

  /**
   * Map a diagnostic zone / fault code to its result-box severity CSS class.
   * Covers Duval Triangle 1 (PD…T3, SG), Triangle 2 (N, D1, X1, X3, T2, T3),
   * Triangle 4 (S, O, C, PD) and ratio-method outputs.
   * @param {string} zone
   * @returns {string} one of result-healthy | result-attention | result-warning | result-critical
   */
  function getResultClass(zone) {
    if (['Normal','N','N/A'].includes(zone)) return 'result-healthy';
    if (['PD','SG','T1','O','X1'].includes(zone)) return 'result-attention';
    if (['T2','C','S'].includes(zone)) return 'result-warning';
    if (['D1','D2','DT','T3','X3','Indeterminate'].includes(zone)) return 'result-critical';
    return 'result-attention';
  }

  /**
   * Shared 1–4 condition-number → result-box severity class map. Used for
   * any method that reports a numbered condition (IEEE C57.104 individual
   * gas condition, TDCG condition) rather than a lettered zone/fault code.
   * Single source of truth for a mapping that was previously duplicated
   * verbatim in ui/dashboard.js (x2) and ui/workspace.js (x2) — values are
   * unchanged, this only removes the duplication.
   * @type {{1:string,2:string,3:string,4:string}}
   */
  const CONDITION_CLASS_MAP = { 1:'result-healthy', 2:'result-attention', 3:'result-warning', 4:'result-critical' };

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.utils = window.TAILAM.utils || {};
  window.TAILAM.utils.helpers = { GAS_LABELS, esc, fmtRatio, getResultClass, CONDITION_CLASS_MAP };
})();
