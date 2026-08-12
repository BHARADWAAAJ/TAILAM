/**
 * TAILAM — engine/confidence.js
 * Canonical mapping from method-agreement level to diagnostic confidence (%).
 * Values are unchanged from the original implementation.
 *
 * Plain script — publishes on window.TAILAM.engine.confidence.
 */
(function () {
  'use strict';

  /** Confidence percentage per agreement level. */
  const CONFIDENCE_BY_AGREEMENT = { High: 92, Moderate: 68, Low: 42 };

  /**
   * Confidence (%) for a given agreement level.
   * @param {'High'|'Moderate'|'Low'} agreeLevel
   * @returns {number}
   */
  function confidenceFor(agreeLevel) {
    return CONFIDENCE_BY_AGREEMENT[agreeLevel];
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.confidence = { CONFIDENCE_BY_AGREEMENT, confidenceFor };
})();
