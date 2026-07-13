/**
 * TAILAM — engine/ieee.js
 * IEEE C57.104 four-condition individual gas assessment.
 * Pure function — no DOM access. Limits are the classic 1991/2008
 * Table 1 values; DO NOT alter them.
 *
 * Plain script — publishes on window.TAILAM.engine.ieee.
 */
(function () {
  'use strict';

  /** IEEE C57.104 condition limits per gas: [C1 max, C2 max, C3 max] in ppm. */
  const IEEE_LIMITS = { h2:[100,700,1800], ch4:[120,400,1000], c2h6:[65,200,500], c2h4:[50,200,500], c2h2:[35,170,400], co:[350,1050,2600], co2:[2500,10000,25000] };

  /**
   * Assess each gas against the IEEE condition limits; the worst gas sets
   * the overall condition (1 = normal … 4 = critical).
   * @param {object} g - gas set (ppm)
   * @returns {{maxCond:number,condName:string,desc:string,rows:Array}}
   */
  function calcIEEE(g) {
    let maxCond = 1; const rows = [];
    Object.entries(IEEE_LIMITS).forEach(([gas, lims]) => {
      const val = g[gas]; let cond = 1;
      if (val > lims[2]) cond = 4; else if (val > lims[1]) cond = 3; else if (val > lims[0]) cond = 2;
      if (cond > maxCond) maxCond = cond;
      rows.push({ gas, val, cond, lims });
    });
    const condNames = { 1:'Condition 1 — Normal', 2:'Condition 2 — Caution', 3:'Condition 3 — High', 4:'Condition 4 — Critical' };
    const condDescs = { 1:'All gas concentrations within normal limits. Continue routine sampling per IEEE schedule.',
      2:'One or more gases above Condition 1 limit. Increase sampling frequency. Investigate trend.',
      3:'Gases significantly elevated. Reduce loading if possible. Plan detailed inspection.',
      4:'Critical gas levels. Immediate action required. Consider de-energizing and inspection.' };
    return { maxCond, condName: condNames[maxCond], desc: condDescs[maxCond], rows };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.ieee = { calcIEEE };
})();
