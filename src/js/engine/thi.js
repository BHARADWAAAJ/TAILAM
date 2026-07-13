/**
 * TAILAM — engine/thi.js
 * Transformer Health Index: the weighted 0–100 risk score combining the
 * individual method results, plus the shared health-category mapping.
 * Pure functions — no DOM access. Weights and bands unchanged.
 *
 * Plain script — publishes on window.TAILAM.engine.thi.
 */
(function () {
  'use strict';

  /**
   * Weighted risk score (0–100) from the five main-tank methods.
   * Weights: Duval 0.25 · Rogers 0.15 · IEC 0.15 · Key Gas 0.10 ·
   * IEEE condition 0.20 · TDCG condition 0.15.
   * @returns {number} integer 0–100
   */
  function calcRiskScore(duval, rogers, iec, ieee, keygas) {
    const faultScore = { Normal:5, N:5, PD:35, D1:60, D2:80, DT:65, T1:30, T2:50, T3:70, C:40, SG:25, Indeterminate:30, 'N/A':0 };
    const condScore = { 1:10, 2:35, 3:65, 4:90 };
    const d = faultScore[duval.zone] ?? 30, r = faultScore[rogers.fault] ?? 30, i = faultScore[iec.fault] ?? 30, k = faultScore[keygas.fault] ?? 30;
    const ieeeS = condScore[ieee.maxCond], tdcgS = condScore[keygas.tdcgCond];
    const score = Math.round(d*0.25 + r*0.15 + i*0.15 + k*0.10 + ieeeS*0.20 + tdcgS*0.15);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Health category for a risk score. Single source of truth for the bands
   * that were previously duplicated in the dashboard and both exporters.
   * @param {number} risk - 0–100
   * @returns {{label:string,cls:string,color:string}} label, result-box CSS class, print color
   */
  function healthCategoryFor(risk) {
    if (risk <= 25) return { label:'Healthy',   cls:'result-healthy',   color:'#16a34a' };
    if (risk <= 50) return { label:'Attention', cls:'result-attention', color:'#ca8a04' };
    if (risk <= 75) return { label:'Warning',   cls:'result-warning',   color:'#ea580c' };
    return             { label:'Critical',  cls:'result-critical',  color:'#dc2626' };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.thi = { calcRiskScore, healthCategoryFor };
})();
