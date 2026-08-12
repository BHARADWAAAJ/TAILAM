/**
 * TAILAM — engine/cigre.js
 * CIGRE 5-key-ratio screening method. Pure function — no DOM access.
 * DO NOT alter thresholds.
 *
 * Plain script — publishes on window.TAILAM.engine.cigre.
 */
(function () {
  'use strict';

  /**
   * Evaluate the five CIGRE screening ratios and return triggered flags.
   * K1 = C₂H₂/C₂H₆ · K2 = H₂/CH₄ · R1 = C₂H₄/C₂H₆ · R2 = CO₂/CO · R3 = C₂H₂/H₂.
   * @param {object} g - gas set (ppm)
   * @returns {{k1:?number,k2:?number,r1:?number,r2:?number,r3:?number,flags:Array}}
   */
  function calcCIGRE(g) {
    const safe = (a, b) => b === 0 ? null : a / b;
    const k1 = safe(g.c2h2, g.c2h6), k2 = safe(g.h2, g.ch4), r1 = safe(g.c2h4, g.c2h6), r2 = safe(g.co2, g.co), r3 = safe(g.c2h2, g.h2);
    const flags = [];
    if (k1 !== null && k1 > 1) flags.push({ name:'K1 — Electrical Discharge', detail:`C₂H₂/C₂H₆ = ${k1.toFixed(3)} > 1`, verdict:'Arcing or high-energy discharge in oil.', cls:'crit' });
    if (k2 !== null && k2 > 10) flags.push({ name:'K2 — Partial Discharge', detail:`H₂/CH₄ = ${k2.toFixed(3)} > 10`, verdict:'Partial discharge (corona) activity.', cls:'att' });
    if (r1 !== null && r1 > 1) flags.push({ name:'R1 — Thermal Fault', detail:`C₂H₄/C₂H₆ = ${r1.toFixed(3)} > 1`, verdict:'Thermal decomposition of oil.', cls:'warn' });
    if (r2 !== null) {
      if (r2 > 10) flags.push({ name:'R2 — Paper Overheating', detail:`CO₂/CO = ${r2.toFixed(2)} > 10`, verdict:'Cellulose insulation overheating (mild/sustained thermal).', cls:'att' });
      else if (r2 < 3) flags.push({ name:'R2 — Electrical Fault on Paper', detail:`CO₂/CO = ${r2.toFixed(2)} < 3`, verdict:'Electrical fault with paper involvement.', cls:'crit' });
    }
    if (r3 !== null && r3 > 2 && g.c2h2 > 30) flags.push({ name:'R3 — OLTC Contamination', detail:`C₂H₂/H₂ = ${r3.toFixed(3)} > 2 AND C₂H₂ = ${g.c2h2} ppm > 30`, verdict:'OLTC oil contaminating main tank. OLTC maintenance required.', cls:'crit' });
    if (!flags.length) flags.push({ name:'No CIGRE flag triggered', detail:'All five ratios within normal range', verdict:'No significant fault pattern detected by CIGRE method.', cls:'ok' });
    return { k1, k2, r1, r2, r3, flags };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.cigre = { calcCIGRE };
})();
