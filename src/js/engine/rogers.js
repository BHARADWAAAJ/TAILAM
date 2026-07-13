/**
 * TAILAM — engine/rogers.js
 * Rogers four-ratio method. Pure function — no DOM access.
 * Ratio codings and the fault lookup table are standard values;
 * DO NOT alter thresholds.
 *
 * Plain script — publishes on window.TAILAM.engine.rogers.
 */
(function () {
  'use strict';

  /**
   * Run the Rogers Ratio method on a main-tank gas set.
   * Ratios: R1 = CH₄/H₂ · R2 = C₂H₆/CH₄ · R3 = C₂H₄/C₂H₆ · R4 = C₂H₂/C₂H₄.
   * A zero denominator with a non-zero numerator yields the sentinel 9999 (∞).
   * @param {object} g - gas set (ppm)
   * @returns {{R1:number,R2:number,R3:number,R4:number,code:string,fault:string,name:string,desc:string}}
   */
  function calcRogers(g) {
    const safe = (a, b) => b === 0 ? (a === 0 ? 0 : 9999) : a / b;
    const R1 = safe(g.ch4, g.h2), R2 = safe(g.c2h6, g.ch4), R3 = safe(g.c2h4, g.c2h6), R4 = safe(g.c2h2, g.c2h4);
    function c1(v) { return v < 0.1 ? 0 : (v <= 1 ? 1 : 2); }
    function c2(v) { return v < 1 ? 0 : (v < 3 ? 1 : 2); }
    function c3(v) { return v < 1 ? 0 : (v < 3 ? 1 : 2); }
    function c4(v) { return v < 0.5 ? 0 : (v < 3 ? 1 : 2); }
    const code = `${c1(R1)}${c2(R2)}${c3(R3)}${c4(R4)}`;
    const table = { '0000':'PD','0100':'PD','1000':'Normal','1100':'Normal','0010':'D1','0001':'D1','0011':'D1',
      '1201':'D2','0201':'D2','1211':'D2','0211':'D2','2000':'T1','2100':'T1','2110':'T2','2210':'T2',
      '2120':'T3','2220':'T3','2121':'T3','2221':'T3' };
    const faultNames = { Normal:'Normal Ageing', PD:'Partial Discharge', D1:'Low Energy Discharge', D2:'High Energy Discharge',
      T1:'Thermal < 300°C', T2:'Thermal 300–700°C', T3:'Thermal > 700°C' };
    const faultDescs = { Normal:'No significant fault. Gas levels consistent with normal thermal ageing.',
      PD:'Partial discharge activity detected. Inspect for gas voids and high-field regions.',
      D1:'Low energy electrical discharge. Risk of flashover through oil.',
      D2:'High energy electrical discharge. Significant arcing event detected.',
      T1:'Low temperature thermal fault (<300°C). Possible hot metal contact.',
      T2:'Medium thermal fault (300–700°C). Check winding conductors and cooling.',
      T3:'High temperature thermal fault (>700°C). Severe hotspot — urgent action needed.' };
    const faultClass = table[code] || 'Indeterminate';
    return { R1, R2, R3, R4, code, fault: faultClass, name: faultNames[faultClass] || 'Indeterminate — see individual ratios',
      desc: faultDescs[faultClass] || 'Code combination is indeterminate. Apply Duval Triangle and IEC ratios.' };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.rogers = { calcRogers };
})();
