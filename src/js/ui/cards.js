/**
 * TAILAM — ui/cards.js
 * Tiny DOM helpers for the recurring result-card patterns. Markup produced
 * is byte-identical to the previous inline strings.
 *
 * Plain script — publishes on window.TAILAM.ui.cards.
 */
(function () {
  'use strict';

  /**
   * Set an element's text content by id.
   * @param {string} id @param {string} text
   */
  function setText(id, text) {
    document.getElementById(id).textContent = text;
  }

  /**
   * Fill a result box: text plus severity class.
   * @param {string} id - element id
   * @param {string} text - box text
   * @param {string} cls - result-* severity class
   */
  function setResultBox(id, text, cls) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'result-box ' + cls;
  }

  /**
   * HTML for one finding flag (CIGRE / cross-contamination style).
   * @param {string} cls - crit | warn | att | ok
   * @param {string} title @param {string} body
   * @returns {string}
   */
  function flagHTML(cls, title, body) {
    return `<div class="flag ${cls}"><div class="t">${title}</div><div class="d">${body}</div></div>`;
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.cards = { setText, setResultBox, flagHTML };
})();
