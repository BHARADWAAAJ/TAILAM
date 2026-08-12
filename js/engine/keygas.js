/**
 * TAILAM — engine/keygas.js
 * Key Gas method + TDCG (Total Dissolved Combustible Gas) condition bands
 * per IEEE C57.104. Pure function — no DOM access.
 * DO NOT alter thresholds.
 *
 * Plain script — publishes on window.TAILAM.engine.keygas.
 */
(function () {
  'use strict';

  /**
   * Identify the dominant key gas pattern and the TDCG condition.
   * TDCG = H₂ + CH₄ + C₂H₆ + C₂H₄ + C₂H₂ + CO.
   * @param {object} g - gas set (ppm)
   * @returns {{fault:string,name:string,desc:string,TDCG:number,tdcgCond:number,tdcgName:string,tdcgDesc:string,dominant:Array}}
   */
  function calcKeyGas(g) {
    const TDCG = g.h2 + g.ch4 + g.c2h6 + g.c2h4 + g.c2h2 + g.co;
    const combustible = { H2: g.h2, CH4: g.ch4, C2H6: g.c2h6, C2H4: g.c2h4, C2H2: g.c2h2, CO: g.co };
    const dominant = Object.entries(combustible).sort((a,b) => b[1]-a[1]);
    const topGas = dominant[0][0];
    let fault, name, desc;
    const highC2H2 = g.c2h2 > 5, highC2H4 = g.c2h4 > g.ch4 && g.c2h4 > g.c2h6, highCO = g.co > 350;
    if (g.c2h2 > g.h2 && g.c2h2 > g.ch4) { fault='D2'; name='High Energy Discharge'; desc='C₂H₂ is the dominant combustible gas. Significant arcing or power arc in oil.'; }
    else if (highC2H2 && g.h2 > 50) { fault='D1'; name='Low Energy Discharge'; desc='H₂ and C₂H₂ are both elevated. Electrical discharge — flashover or sparking.'; }
    else if (g.h2 > 100 && g.c2h2 < 5 && g.c2h4 < 50 && g.ch4 < 100) { fault='PD'; name='Partial Discharge'; desc='H₂ is the dominant combustible gas with minimal hydrocarbons. Partial discharge in voids.'; }
    else if (highC2H4 && g.c2h2 < 5) { fault='T3'; name='Thermal Fault > 700°C'; desc='C₂H₄ dominates with low acetylene. High-temperature thermal fault.'; }
    else if ((topGas === 'CH4' || topGas === 'C2H6') && g.c2h4 < g.ch4 && g.c2h2 < 5) { fault='T1'; name='Thermal Fault < 300°C'; desc='CH₄ and C₂H₆ dominant. Low-temperature overheating.'; }
    else if (highCO) { fault='C'; name='Cellulose Degradation'; desc='CO is elevated. Paper or pressboard insulation overheating detected.'; }
    else { fault='N'; name='Normal / Inconclusive'; desc='No dominant key gas pattern. Gas levels within expected range or insufficient data.'; }
    let tdcgCond, tdcgName, tdcgDesc;
    if (TDCG < 720) { tdcgCond=1; tdcgName='Condition 1 — Normal'; tdcgDesc='TDCG within normal range. Continue routine sampling.'; }
    else if (TDCG < 1920) { tdcgCond=2; tdcgName='Condition 2 — Caution'; tdcgDesc='TDCG elevated. Sample every 3 months. Trend analysis recommended.'; }
    else if (TDCG < 4630) { tdcgCond=3; tdcgName='Condition 3 — High'; tdcgDesc='TDCG significantly elevated. Sample frequently and exercise caution on loading.'; }
    else { tdcgCond=4; tdcgName='Condition 4 — Critical'; tdcgDesc='TDCG critical. Immediate inspection and possible de-energization required.'; }
    return { fault, name, desc, TDCG, tdcgCond, tdcgName, tdcgDesc, dominant };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.keygas = { calcKeyGas };
})();
