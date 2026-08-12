/**
 * TAILAM — engine/iec.js
 * IEC 60599:2022 three-ratio method (Table 1) plus the closely related
 * IEC oil-chemistry interpretations: CO₂/CO paper involvement (§5.5) and
 * dissolved-O₂ interpretation. Pure functions — no DOM access.
 * DO NOT alter ratio limits.
 *
 * Plain script — publishes on window.TAILAM.engine.iec.
 */
(function () {
  'use strict';

  /**
   * Run the IEC 60599 three-ratio method.
   * Ratios: r1 = C₂H₂/C₂H₄ · r2 = CH₄/H₂ · r3 = C₂H₄/C₂H₆.
   * @param {object} g - gas set (ppm)
   * @returns {{r1:number,r2:number,r3:number,code:string,fault:string,name:string,desc:string}}
   */
  function calcIEC(g) {
    if (g.h2 + g.ch4 + g.c2h6 + g.c2h4 + g.c2h2 === 0)
      return { r1:0, r2:0, r3:0, code:'—', fault:'Indeterminate', name:'Indeterminate', desc:'No combustible gas detected — IEC ratios are undefined.' };
    const safe = (a, b) => b === 0 ? (a === 0 ? 0 : 9999) : a / b;
    const r1 = safe(g.c2h2, g.c2h4), r2 = safe(g.ch4, g.h2), r3 = safe(g.c2h4, g.c2h6);
    const c1 = r1 < 0.1 ? 0 : (r1 <= 3 ? 1 : 2);
    const c2 = r2 < 0.1 ? 1 : (r2 <= 1 ? 0 : 2);
    const c3 = r3 < 1   ? 0 : (r3 <= 4 ? 1 : 2);
    const code = `${c1}${c2}${c3}`;
    let fault;
    if (r2 < 0.1 && r3 < 0.2) fault = 'PD';
    else if (r1 > 1 && r2 >= 0.1 && r2 <= 0.5 && r3 > 1) fault = 'D1';
    else if (r1 >= 0.6 && r1 <= 2.5 && r2 >= 0.1 && r2 <= 1 && r3 > 2) fault = 'D2';
    else if (r2 > 1 && r3 < 1) fault = 'T1';
    else if (r1 < 0.1 && r2 > 1 && r3 >= 1 && r3 <= 4) fault = 'T2';
    else if (r1 < 0.2 && r2 > 1 && r3 > 4) fault = 'T3';
    else fault = 'Indeterminate';
    const names = { PD:'Partial Discharge', D1:'Low Energy Discharge', D2:'High Energy Discharge', T1:'Thermal < 300°C', T2:'Thermal 300–700°C', T3:'Thermal > 700°C', Indeterminate:'Indeterminate' };
    const descs = { PD:'Partial discharge in gas-filled voids. Inspect insulation for tracking.',
      D1:'Low energy electrical discharge. Flashover or sparking suspected.',
      D2:'High energy electrical discharge. Significant arcing in oil.',
      T1:'Thermal fault below 300°C. Insulation contact or circulating currents.',
      T2:'Thermal fault 300–700°C. Winding conductor hotspot.',
      T3:'Thermal fault above 700°C. Critical hotspot — inspect immediately.',
      Indeterminate:'Ratio combination falls outside defined IEC codes. Use Duval Triangle.' };
    return { r1, r2, r3, code, fault, name: names[fault], desc: descs[fault] };
  }

  /**
   * CO₂/CO paper involvement assessment (IEC 60599 §5.5).
   * @param {object} g - gas set (ppm)
   * @returns {{coRatio:?number,text:string}}
   */
  function calcPaperInvolvement(g) {
    const coRatio = (g.co > 0 && g.co2 > 0) ? g.co2 / g.co : null;
    const flags = [];
    if (coRatio !== null) {
      if (coRatio < 3 && g.co > 1000) flags.push('Active cellulose degradation by electrical fault (CO₂/CO < 3 and CO > 1000 ppm). Paper insulation is decomposing due to electrical stress.');
      if (coRatio > 10 && g.co2 > 10000) flags.push('Mild thermal overheating of paper insulation (CO₂/CO > 10 and CO₂ > 10000 ppm). Sustained heat is slowly oxidising cellulose.');
    }
    if (!flags.length && g.co > 500 && g.co2 === 0) flags.push('CO is elevated (> 500 ppm). Enter CO₂ value to complete paper involvement assessment.');
    if (!flags.length) flags.push('CO₂/CO ratio within acceptable range. No active cellulose degradation detected.');
    return { coRatio, text: flags.join(' ') };
  }

  /**
   * Interpret the dissolved-oxygen level of a sealed mineral-oil transformer.
   * @param {number} o2 - dissolved O₂ (ppm); 0 or less → null (no data entered)
   * @returns {?{label:string,desc:string,cls:string}}
   */
  function interpretO2(o2) {
    if (o2 <= 0) return null;
    if (o2 < 1000) return { label:'Very Low', desc:'O₂ < 1000 ppm — possible active oxidation of oil/paper. Check acidity and oxygen content.', cls:'result-warning' };
    if (o2 < 5000) return { label:'Low / Normal (Sealed Tank)', desc:'O₂ 1000–5000 ppm — typical for sealed mineral oil transformer. No air ingress evident.', cls:'result-healthy' };
    if (o2 < 15000) return { label:'Normal–Elevated', desc:'O₂ 5000–15000 ppm — on the higher end. Monitor for seal integrity.', cls:'result-attention' };
    return { label:'High — Possible Air Ingress', desc:'O₂ > 15000 ppm — likely air ingress through gaskets, conservator seals, or valves. Check for leaks.', cls:'result-warning' };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.iec = { calcIEC, calcPaperInvolvement, interpretO2 };
})();
