/**
 * TAILAM — engine/duval2.js
 * Duval Triangle 2 for OLTCs (IEC 60599:2022 Figure B.4, ref. A.7.2)
 * plus the OLTC-specific assessments that belong to the same compartment:
 * TGC comparison, diagnostic ratios, tap-count normalisation and
 * main-tank cross-contamination checks.
 * Pure functions — no DOM access. Zone limits verified against the
 * official standard; DO NOT alter boundary values.
 *
 * Boundary lines: CH₄ = 2 and 19 · C₂H₄ = 6, 23 and 50 · C₂H₂ = 15
 *
 * Plain script — publishes on window.TAILAM.engine.duval2.
 */
(function () {
  'use strict';

  /** Typical 90th-percentile gas values for in-tank OLTCs (CIGRE TB 443), ppm. */
  const OLTC_TGC = { h2:3000, ch4:1000, c2h6:200, c2h4:1000, c2h2:6000, co:800, co2:10000 };

  /**
   * Classify an OLTC oil sample with Duval Triangle 2.
   * Gases used: CH₄ / C₂H₄ / C₂H₂ (percentages of their sum).
   * @param {{ch4:number,c2h4:number,c2h2:number}} g - gas set (ppm)
   * @returns {{zone:string,name:string,desc:string,pCH4:number,pC2H4:number,pC2H2:number,total:number}}
   */
  function calcDuval2(g) {
    const total = g.ch4 + g.c2h4 + g.c2h2;
    if (total === 0) return { zone:'N/A', name:'Insufficient Data', desc:'CH₄, C₂H₄ and C₂H₂ are all zero — Triangle 2 cannot be applied.', pCH4:0, pC2H4:0, pC2H2:0, total:0 };
    const pCH4  = (g.ch4  / total) * 100;
    const pC2H4 = (g.c2h4 / total) * 100;
    const pC2H2 = (g.c2h2 / total) * 100;

    let zone;
    if (pC2H4 > 50 && pC2H2 <= 15)      zone = 'T3';
    else if (pC2H4 > 23 && pC2H2 <= 15) zone = 'T2';
    else if (pC2H4 > 23)                zone = 'X3';
    else if (pCH4 > 19)                 zone = 'X1';
    else if (pCH4 >= 2 && pC2H4 >= 6)   zone = 'N';
    else                                zone = 'D1';

    const INFO = {
      N:  { name:'Normal Operation',                    desc:'This is the normal gas pattern for tap changer switching. No problem. Continue normal sampling. Note: some OLTC models make less gas — if possible, compare with identical units.' },
      D1: { name:'Abnormal Arcing (D1)',                desc:'More arcing than normal switching. The contacts may be worn or not aligned well. Check the diverter contacts at the next service.' },
      X1: { name:'Overheating < 300 °C (X1)',           desc:'Possible mild overheating (below 300 °C) inside the tap changer. Take oil samples more often and watch the trend.' },
      X3: { name:'Coking in Progress or Abnormal Arcing D2 (X3)', desc:'Carbon may be forming on the contacts, or there is heavy arcing. Plan an internal inspection. NOTE: some OLTC models show X3 in NORMAL operation — if this unit always plots here and the point has not moved much, it is likely normal (IEC 60599:2022 A.7.4).' },
      T2: { name:'Severe Coking of Contacts > 300 °C (T2)', desc:'The contacts are overheating and carbon is forming on them. Check the contact resistance. Plan an OLTC overhaul. NOTE: a few OLTC models show T2 in normal operation — compare with this unit’s history (IEC 60599:2022 A.7.4).' },
      T3: { name:'Severe Coking of Contacts > 700 °C (T3)', desc:'The contacts are very hot with heavy carbon. This is serious. Take the tap changer out of service and inspect it soon. NOTE: a few OLTC models show T3 in normal operation — compare with this unit’s history (IEC 60599:2022 A.7.4).' }
    };
    const { name, desc } = INFO[zone];
    return { zone, name, desc, pCH4, pC2H4, pC2H2, total };
  }

  /**
   * IEC 60599:2022 clause 9 gate. When no gas exceeds its typical value the
   * Triangle 2 zone is an early pattern, not an active fault: flags the result
   * and appends the plain-language advisory (mutates `duval2`, same as before).
   * @param {object} duval2 - result of calcDuval2
   * @param {boolean} anyAboveTGC - from calcOLTCAnalysis
   * @returns {object} the same duval2 object
   */
  function applyBelowTypicalGate(duval2, anyAboveTGC) {
    if (!anyAboveTGC && !['N','N/A'].includes(duval2.zone)) {
      duval2.belowTypical = true;
      duval2.desc += ' ⚠ IMPORTANT: All gas amounts are still LOW (below typical values). So this zone is only an early pattern — it is NOT a real fault yet. The condition is normal. Continue normal sampling and watch the trend.';
    }
    return duval2;
  }

  /**
   * OLTC compartment assessment: TGC comparison vs CIGRE TB 443 typical values,
   * the three diagnostic ratios, and C₂H₂-per-1000-operations normalisation.
   * @param {object} g - OLTC gas set (ppm)
   * @param {number} taps - tap operations since last oil change (0 = unknown)
   * @returns {{tgc:object,ratios:Array,tapResult:?object,anyAboveTGC:boolean}}
   */
  function calcOLTCAnalysis(g, taps) {
    const tgc = {};
    for (const k of Object.keys(OLTC_TGC)) {
      const pct = OLTC_TGC[k] > 0 ? (g[k] / OLTC_TGC[k]) * 100 : 0;
      let status, cls;
      if (pct <= 75) { status='Normal'; cls='badge-green'; }
      else if (pct <= 100) { status='Near Limit'; cls='badge-yellow'; }
      else if (pct <= 150) { status='Above TGC'; cls='badge-orange'; }
      else { status='High'; cls='badge-red'; }
      tgc[k] = { measured:g[k], limit:OLTC_TGC[k], pct:pct.toFixed(1), status, cls };
    }
    // IEC 60599:2022 §9 gate — a fault zone counts as a real fault only when at
    // least one gas is above typical values; below typical → normal condition.
    const anyAboveTGC = Object.keys(OLTC_TGC).some(k => (g[k] / OLTC_TGC[k]) * 100 > 100);
    const r_arc = g.h2 > 0 ? g.c2h2 / g.h2 : null;
    const r_therm = g.c2h6 > 0 ? g.c2h4 / g.c2h6 : null;
    const r_disc = (g.c2h4 + g.c2h6) > 0 ? g.c2h2 / (g.c2h4 + g.c2h6) : null;
    const arcInterp = r_arc === null ? { label:'N/A (H₂ = 0)', cls:'badge-green' }
      : r_arc < 3 ? { label:'Normal switching arc', cls:'badge-green' }
      : r_arc < 10 ? { label:'Watch — arcing is increasing', cls:'badge-yellow' }
      : { label:'Too much arcing — check contacts', cls:'badge-red' };
    const thermInterp = r_therm === null ? { label:'N/A (C₂H₆ = 0)', cls:'badge-green' }
      : r_therm <= 1 ? { label:'No overheating', cls:'badge-green' }
      : { label:'Overheating — check contacts and leads', cls:'badge-orange' };
    const discInterp = r_disc === null ? { label:'N/A', cls:'badge-green' }
      : r_disc <= 2 ? { label:'Normal', cls:'badge-green' }
      : { label:'High discharge gas — watch the trend', cls:'badge-orange' };
    const ratios = [
      { name:'R_arc', formula:'C₂H₂ / H₂', value:r_arc, threshold:'< 3 normal · 3–10 monitor · > 10 abnormal', interp:arcInterp },
      { name:'R_therm', formula:'C₂H₄ / C₂H₆', value:r_therm, threshold:'≤ 1 OK · > 1 thermal fault', interp:thermInterp },
      { name:'R_disc', formula:'C₂H₂ / (C₂H₄ + C₂H₆)', value:r_disc, threshold:'≤ 2 OK · > 2 excessive discharge', interp:discInterp }
    ];
    let tapResult = null;
    if (taps > 0 && g.c2h2 > 0) {
      const per1000 = (g.c2h2 / taps) * 1000;
      tapResult = { per1000: per1000.toFixed(2), ok: per1000 <= 15 };
    }
    return { tgc, ratios, tapResult, anyAboveTGC };
  }

  /**
   * OLTC → main-tank cross-contamination checks (IEC 60599:2022 §5.7 criteria).
   * @param {{h2:number,c2h2:number}} mt - main tank reference values (ppm)
   * @param {{c2h2:number}} ot - OLTC values (ppm)
   * @returns {Array<{cls:string,title:string,detail:string}>} finding flags
   */
  function calcCrossContam(mt, ot) {
    const flags = [];
    const mt_c2h2_h2 = mt.h2 > 0 ? mt.c2h2 / mt.h2 : null;
    if (mt.c2h2 > 30 && mt_c2h2_h2 !== null && mt_c2h2_h2 > 2)
      flags.push({ cls:'crit', title:'⚠ OLTC Leaking into Main Tank', detail:`Main tank C₂H₂ = ${mt.c2h2} ppm, C₂H₂/H₂ = ${mt_c2h2_h2.toFixed(2)} — both IEC contamination thresholds exceeded. Inspect OLTC diverter contacts and barrier seal immediately.` });
    if (ot.c2h2 > 0 && mt.c2h2 > 0) {
      const ratio = mt.c2h2 / ot.c2h2;
      if (ratio > 0.5) flags.push({ cls:'crit', title:'⚠ Possible Oil Mixing — Failed Diverter Seal', detail:`Main tank C₂H₂ (${mt.c2h2} ppm) is ${(ratio*100).toFixed(0)}% of OLTC C₂H₂ (${ot.c2h2} ppm). This degree of migration is abnormal and suggests diverter compartment seal failure.` });
    }
    if (mt.h2 > 150 && mt.c2h2 > 10 && !flags.length)
      flags.push({ cls:'att', title:'H₂ and C₂H₂ Both Elevated in Main Tank — Monitor', detail:`Main tank H₂ = ${mt.h2} ppm, C₂H₂ = ${mt.c2h2} ppm. Not conclusive for OLTC contamination yet, but monitor trend.` });
    if (!mt.h2 && !mt.c2h2) {
      flags.push({ cls:'att', title:'No Main Tank Reference Values Entered', detail:'Enter main tank H₂ and C₂H₂ above (or run Main Tank Analysis first) to check for OLTC-to-main-tank oil contamination.' });
      return flags;
    }
    if (!flags.length) flags.push({ cls:'ok', title:'✓ No Cross-Contamination Detected', detail:`Main tank C₂H₂ = ${mt.c2h2} ppm · C₂H₂/H₂ = ${mt_c2h2_h2 !== null ? mt_c2h2_h2.toFixed(2) : 'N/A'} — below IEC contamination thresholds.` });
    return flags;
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.duval2 = { calcDuval2, applyBelowTypicalGate, calcOLTCAnalysis, calcCrossContam };
})();
