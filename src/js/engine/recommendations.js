/**
 * TAILAM — engine/recommendations.js
 * Maintenance recommendation per primary (Duval Triangle 1) zone.
 * Texts unchanged from the original implementation.
 *
 * Plain script — publishes on window.TAILAM.engine.recommendations.
 */
(function () {
  'use strict';

  /**
   * Recommendation text for a Duval Triangle 1 zone.
   * @param {string} zone - Duval zone / fault code
   * @param {number} risk - risk score (reserved; kept for API compatibility)
   * @returns {string}
   */
  function getRecommendation(zone, risk) {
    const recs = {
      PD: 'Investigate insulation for gas voids or moisture ingress. Perform Power Factor/Tan-Delta test. Increase DGA monitoring to monthly.',
      D1: 'Electrical discharge detected. Inspect OLTC contacts and bushing connections. Perform oil dielectric strength test. Prepare for internal inspection.',
      D2: 'High energy discharge — potential power arc. Consider de-energizing for internal inspection. Perform complete electrical testing immediately.',
      DT: 'Mixed thermal and electrical fault. Reduce loading. Schedule internal inspection. Perform oil and winding tests.',
      T1: 'Low-temperature hotspot. Check cooling system efficiency. Review transformer loading. Increase DGA monitoring to 3-month intervals.',
      T2: 'Medium thermal fault (300–700°C). Inspect winding conductors and connections. Check current balance. Review cooling bank operation.',
      T3: 'High-temperature hotspot (>700°C). Risk of rapid failure. Reduce load immediately. Perform emergency inspection. Consider de-energizing.',
      C:  'Cellulose/paper insulation overheating. Measure CO/CO₂ ratio. Check winding insulation condition via FRA and capacitance tests. Assess insulation life.',
      N:  'No significant fault. Continue routine DGA monitoring per standard schedule. Review rate-of-gas-generation trend.',
      Normal: 'Transformer in normal condition. Maintain routine annual DGA sampling unless loading conditions change.',
      SG: 'Investigate H₂ source separately — likely stray/catalytic gassing rather than an internal fault.',
      'N/A': 'Insufficient gas data for analysis. Verify sample validity and re-submit for analysis.'
    };
    return recs[zone] || recs['N'];
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.recommendations = { getRecommendation };
})();
