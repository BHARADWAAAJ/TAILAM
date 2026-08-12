/**
 * TAILAM — engine/consensus.js
 * Cross-method agreement between Duval Triangle 1, Rogers and IEC results.
 * Pure function — no DOM access. Logic unchanged; the confidence values now
 * come from engine/confidence.js (same numbers as before).
 *
 * Plain script — publishes on window.TAILAM.engine.consensus.
 * Depends on window.TAILAM.engine.confidence (load confidence.js first).
 */
(function () {
  'use strict';

  const CONFIDENCE_BY_AGREEMENT = window.TAILAM.engine.confidence.CONFIDENCE_BY_AGREEMENT;

  /**
   * Determine how strongly the three primary methods agree.
   * @param {{zone:string}} duval  - Duval Triangle 1 result
   * @param {{fault:string}} rogers - Rogers result
   * @param {{fault:string}} iec    - IEC three-ratio result
   * @returns {{agreeLevel:'High'|'Moderate'|'Low',confidence:number}}
   */
  function calcAgreement(duval, rogers, iec) {
    const normalize = f => ['PD','D1','D2','DT','T1','T2','T3'].includes(f) ? f : (['Normal','N'].includes(f) ? 'Normal' : 'Other');
    const results = [normalize(duval.zone), normalize(rogers.fault), normalize(iec.fault)];
    const freq = {};
    results.forEach(r => { freq[r] = (freq[r]||0)+1; });
    const maxAgree = Math.max(...Object.values(freq));
    let agreeLevel;
    if (maxAgree === 3) agreeLevel = 'High';
    else if (maxAgree === 2) agreeLevel = 'Moderate';
    else agreeLevel = 'Low';
    return { agreeLevel, confidence: CONFIDENCE_BY_AGREEMENT[agreeLevel] };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.consensus = { calcAgreement };
})();
