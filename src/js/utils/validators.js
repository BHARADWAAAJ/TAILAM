/**
 * TAILAM — utils/validators.js
 * Form reading + input validation. All DOM reads of user input funnel
 * through this module so parsing rules stay in one place.
 *
 * Plain script — publishes on window.TAILAM.utils.validators.
 */
(function () {
  'use strict';

  /**
   * Read a numeric input field; blank / invalid / negative → 0.
   * Gas concentrations (ppm) and tap counts are physically non-negative, so
   * negative typed values are clamped to 0 — the input's min="0" attribute
   * only blocks the spinner arrows, not keyboard entry.
   * @param {string} id - element id
   * @returns {number}
   */
  function readNumberField(id) {
    return Math.max(0, parseFloat(document.getElementById(id).value) || 0);
  }

  /**
   * Read the eight main-tank gas fields (ppm).
   * @returns {{h2:number,ch4:number,c2h6:number,c2h4:number,c2h2:number,co:number,co2:number,o2:number}}
   */
  function readMainTankGases() {
    const v = readNumberField;
    return { h2:v('g-h2'), ch4:v('g-ch4'), c2h6:v('g-c2h6'), c2h4:v('g-c2h4'), c2h2:v('g-c2h2'), co:v('g-co'), co2:v('g-co2'), o2:v('g-o2') };
  }

  /**
   * Read the seven OLTC gas fields (ppm).
   * @returns {{h2:number,ch4:number,c2h6:number,c2h4:number,c2h2:number,co:number,co2:number}}
   */
  function readOltcGases() {
    const v = readNumberField;
    return { h2:v('ot-h2'), ch4:v('ot-ch4'), c2h6:v('ot-c2h6'), c2h4:v('ot-c2h4'), c2h2:v('ot-c2h2'), co:v('ot-co'), co2:v('ot-co2') };
  }

  /**
   * Read the shared transformer information form.
   * @returns {{name:string,mva:string,voltage:string,location:string,date:string,oil:string}}
   */
  function readTransformerInfo() {
    return {
      name: document.getElementById('tf-name').value || 'Unnamed Transformer',
      mva: document.getElementById('tf-mva').value || '—',
      voltage: document.getElementById('tf-voltage').value || '—',
      location: document.getElementById('tf-location').value || '—',
      date: document.getElementById('tf-date').value || new Date().toISOString().split('T')[0],
      oil: document.getElementById('tf-oil').value
    };
  }

  /**
   * True when at least one of the seven combustible/carbon-oxide gases is non-zero.
   * @param {object} g - gas set
   * @returns {boolean}
   */
  function hasAnyGas(g) {
    return (g.h2 + g.ch4 + g.c2h6 + g.c2h4 + g.c2h2 + g.co + g.co2) !== 0;
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.utils = window.TAILAM.utils || {};
  window.TAILAM.utils.validators = { readNumberField, readMainTankGases, readOltcGases, readTransformerInfo, hasAnyGas };
})();
