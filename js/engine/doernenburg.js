/**
 * TAILAM — engine/doernenburg.js
 * Doernenburg ratio method (legacy IEEE). Pure function — no DOM access.
 * Denominators below the 5 ppm detection limit make a ratio unusable (null).
 * DO NOT alter thresholds.
 *
 * Plain script — publishes on window.TAILAM.engine.doernenburg.
 */
(function () {
  'use strict';

  /**
   * Run the Doernenburg method.
   * Ratios: R1 = CH₄/H₂ · R2 = C₂H₂/C₂H₄ · R3 = C₂H₂/CH₄ · R4 = C₂H₆/C₂H₂.
   * @param {object} g - gas set (ppm)
   * @returns {{R1:?number,R2:?number,R3:?number,R4:?number,fault:string,name:string,desc:string}}
   */
  function calcDoernenburg(g) {
    const safe = (a, b) => b < 5 ? null : a / b;
    const R1 = safe(g.ch4, g.h2), R2 = safe(g.c2h2, g.c2h4), R3 = safe(g.c2h2, g.ch4), R4 = safe(g.c2h6, g.c2h2);
    function vote(r1, r2, r3, r4) {
      const scores = { Thermal:0, Arcing:0, Corona:0 };
      if (r1 !== null) { if (r1 > 1.0) scores.Thermal++; else if (r1 < 0.1) scores.Corona++; else scores.Arcing++; }
      if (r2 !== null) { if (r2 < 0.75) scores.Thermal++; else scores.Arcing++; }
      if (r3 !== null) { if (r3 < 0.3) { scores.Thermal++; scores.Corona++; } else scores.Arcing++; }
      if (r4 !== null) { if (r4 > 0.4) { scores.Thermal++; scores.Corona++; } else scores.Arcing++; }
      const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
      const anyValid = r1 !== null || r2 !== null || r3 !== null || r4 !== null;
      return anyValid ? best[0] : 'Indeterminate';
    }
    const fault = vote(R1, R2, R3, R4);
    const names = { Thermal:'Thermal Decomposition', Arcing:'Electrical Arcing / Discharge', Corona:'Corona / Partial Discharge', Indeterminate:'Indeterminate — insufficient gas levels' };
    const descs = { Thermal:'Majority of Doernenburg ratios indicate thermal decomposition of oil. Hotspot or overloading suspected.',
      Arcing:'Majority of Doernenburg ratios indicate electrical arcing. High energy discharge or sparking in oil.',
      Corona:'Majority of Doernenburg ratios indicate partial discharge / corona activity. Inspect insulation for gas voids.',
      Indeterminate:'One or more denominator gases are below 5 ppm detection limit. Doernenburg method cannot be reliably applied.' };
    return { R1, R2, R3, R4, fault, name: names[fault], desc: descs[fault] };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.doernenburg = { calcDoernenburg };
})();
