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

  // Fault-code → component score and condition-number → component score
  // lookup tables. Hoisted to module scope (values unchanged from the
  // previous per-call locals) so calcRiskScoreBreakdown() and calcRiskScore()
  // share one copy instead of two.
  const FAULT_SCORE = { Normal:5, N:5, PD:35, D1:60, D2:80, DT:65, T1:30, T2:50, T3:70, C:40, SG:25, Indeterminate:30, 'N/A':0 };
  const COND_SCORE = { 1:10, 2:35, 3:65, 4:90 };

  /**
   * Full weighted-sum breakdown behind the Transformer Health Index —
   * exposes the SAME intermediate values calcRiskScore() has always computed
   * internally, as read-only metadata for the Detailed Engineering
   * Calculations view. Added for that purpose only: no threshold, weight,
   * fault-score, or rounding rule differs from calcRiskScore(), and
   * calcRiskScore() below is now a thin wrapper around this function so the
   * two can never drift apart.
   * @returns {{score:number, rawSum:number, components:Array<{key:string,label:string,input:string,componentScore:number,weight:number,weighted:number}>}}
   */
  function calcRiskScoreBreakdown(duval, rogers, iec, ieee, keygas) {
    const d = FAULT_SCORE[duval.zone] ?? 30, r = FAULT_SCORE[rogers.fault] ?? 30, i = FAULT_SCORE[iec.fault] ?? 30, k = FAULT_SCORE[keygas.fault] ?? 30;
    const ieeeS = COND_SCORE[ieee.maxCond], tdcgS = COND_SCORE[keygas.tdcgCond];
    // Identical expression/operand order to the original calcRiskScore body —
    // preserved verbatim so floating-point summation is byte-identical.
    const rawSum = d*0.25 + r*0.15 + i*0.15 + k*0.10 + ieeeS*0.20 + tdcgS*0.15;
    const score = Math.min(100, Math.max(0, Math.round(rawSum)));
    const components = [
      { key:'duval',  label:'Duval Triangle 1', input: duval.zone,                     componentScore: d,     weight:0.25, weighted: d*0.25 },
      { key:'rogers', label:'Rogers Ratio',      input: rogers.fault,                   componentScore: r,     weight:0.15, weighted: r*0.15 },
      { key:'iec',    label:'IEC 60599',         input: iec.fault,                      componentScore: i,     weight:0.15, weighted: i*0.15 },
      { key:'keygas', label:'Key Gas',           input: keygas.fault,                   componentScore: k,     weight:0.10, weighted: k*0.10 },
      { key:'ieee',   label:'IEEE C57.104',      input: 'Condition ' + ieee.maxCond,    componentScore: ieeeS, weight:0.20, weighted: ieeeS*0.20 },
      { key:'tdcg',   label:'TDCG',              input: 'Condition ' + keygas.tdcgCond, componentScore: tdcgS, weight:0.15, weighted: tdcgS*0.15 }
    ];
    return { score, rawSum, components };
  }

  /**
   * Weighted risk score (0–100) from the five main-tank methods.
   * Weights: Duval 0.25 · Rogers 0.15 · IEC 0.15 · Key Gas 0.10 ·
   * IEEE condition 0.20 · TDCG condition 0.15.
   * @returns {number} integer 0–100
   */
  function calcRiskScore(duval, rogers, iec, ieee, keygas) {
    return calcRiskScoreBreakdown(duval, rogers, iec, ieee, keygas).score;
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
  window.TAILAM.engine.thi = { calcRiskScore, calcRiskScoreBreakdown, healthCategoryFor };
})();
