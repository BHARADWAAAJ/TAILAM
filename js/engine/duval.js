/**
 * TAILAM — engine/duval.js
 * Duval Triangle 1 (main tank, IEC 60599:2022 Figure B.3) and
 * Duval Triangle 4 (low-temperature supplementary triangle, Duval 2008).
 * Pure functions — no DOM access. Calculations are standard-verified;
 * DO NOT alter zone vertices or thresholds.
 *
 * Plain script — publishes on window.TAILAM.engine.duval.
 */
(function () {
  'use strict';

  /**
   * Classify a main-tank sample with Duval Triangle 1.
   * Gases used: CH₄ / C₂H₄ / C₂H₂ (percentages of their sum).
   * @param {{h2:number,ch4:number,c2h4:number,c2h2:number}} g - gas set (ppm)
   * @returns {{zone:string,name:string,desc:string,pCH4:number,pC2H4:number,pC2H2:number,total:number}}
   */
  function calcDuval(g) {
    const total = g.ch4 + g.c2h4 + g.c2h2;
    if (total === 0) return { zone:'N/A', name:'Insufficient Data', desc:'All three gases are zero.', pCH4:0, pC2H4:0, pC2H2:0, total:0 };
    if (g.h2 > 100 && total < 5) {
      return { zone:'SG', name:'Stray Gassing — Duval Not Applicable',
        desc:'H₂ is elevated ('+g.h2+' ppm) but CH₄+C₂H₄+C₂H₂ < 5 ppm. This is catalytic or stray gassing from tank metal surfaces, not an internal fault. Duval Triangle does not apply. Investigate H₂ source separately.',
        pCH4:0, pC2H4:0, pC2H2:0, total:total };
    }
    const pCH4  = (g.ch4  / total) * 100;
    const pC2H4 = (g.c2h4 / total) * 100;
    const pC2H2 = (g.c2h2 / total) * 100;
    const R3 = Math.sqrt(3) / 2;
    function ternToXY(ch4, c2h4, c2h2) { return [c2h4 + 0.5 * ch4, ch4 * R3]; }
    function pip(px, py, poly) {
      let inside = false, n = poly.length, j = n - 1;
      for (let i = 0; i < n; i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
        j = i;
      }
      return inside;
    }
    const ZONES = [
      { id:'PD', verts:[[98,2,0],[100,0,0],[98,0,2]] },
      { id:'D1', verts:[[0,0,100],[0,23,77],[64,23,13],[87,0,13]] },
      { id:'D2', verts:[[0,23,77],[0,71,29],[31,40,29],[47,40,13],[64,23,13]] },
      { id:'DT', verts:[[0,71,29],[0,85,15],[35,50,15],[46,50,4],[96,0,4],[87,0,13],[47,40,13],[31,40,29]] },
      { id:'T1', verts:[[76,20,4],[80,20,0],[98,2,0],[98,0,2],[96,0,4]] },
      { id:'T2', verts:[[46,50,4],[50,50,0],[80,20,0],[76,20,4]] },
      { id:'T3', verts:[[0,85,15],[0,100,0],[50,50,0],[35,50,15]] }
    ];
    const pt = ternToXY(pCH4, pC2H4, pC2H2);
    const polys = ZONES.map(z => ({ id: z.id, poly: z.verts.map(([ch4, c2h4, c2h2]) => ternToXY(ch4, c2h4, c2h2)) }));
    const zoneAt = (x, y) => { for (const z of polys) if (pip(x, y, z.poly)) return z.id; return null; };
    let zone = zoneAt(pt[0], pt[1]);
    if (!zone) {
      const C = ternToXY(100 / 3, 100 / 3, 100 / 3);
      for (const f of [1e-6, 1e-4, 1e-2]) {
        zone = zoneAt(pt[0] + (C[0] - pt[0]) * f, pt[1] + (C[1] - pt[1]) * f);
        if (zone) break;
      }
    }
    if (!zone) {
      let best = Infinity;
      for (const z of polys) {
        const cx = z.poly.reduce((s, p) => s + p[0], 0) / z.poly.length;
        const cy = z.poly.reduce((s, p) => s + p[1], 0) / z.poly.length;
        const d = (pt[0] - cx) ** 2 + (pt[1] - cy) ** 2;
        if (d < best) { best = d; zone = z.id; }
      }
    }
    const INFO = {
      PD: { name:'Partial Discharge',          desc:'Corona-type partial discharge in gas voids. High electric field stress on insulation.' },
      D1: { name:'Low Energy Discharge',       desc:'Low energy electrical discharge (sparking), flashover through oil.' },
      D2: { name:'High Energy Discharge',      desc:'High energy arc discharge. Significant arcing or sparking in oil.' },
      DT: { name:'Thermal + Electrical Fault', desc:'Mixed thermal and electrical fault. Combination of overheating and discharge activity.' },
      T1: { name:'Thermal Fault < 300 °C',    desc:'Low-temperature overheating. Possible insulation contact with hot metal parts.' },
      T2: { name:'Thermal Fault 300–700 °C',  desc:'Medium-temperature thermal fault. Conductor overheating or circulating currents.' },
      T3: { name:'Thermal Fault > 700 °C',    desc:'High-temperature thermal fault. Severe hotspot in core or conductor.' }
    };
    const { name, desc } = INFO[zone] || { name:'Unknown', desc:'' };
    return { zone, name, desc, pCH4, pC2H4, pC2H2, total };
  }

  /**
   * Classify a main-tank sample with Duval Triangle 4 (H₂ / CH₄ / C₂H₆).
   * Supplementary triangle — apply only when Triangle 1 returns PD, T1 or T2.
   * @param {{h2:number,ch4:number,c2h6:number}} g - gas set (ppm)
   * @returns {{zone:string,name:string,desc:string,h:number,m:number,e:number}}
   */
  function calcDuval4(g) {
    const total = g.h2 + g.ch4 + g.c2h6;
    if (total === 0) return { zone:'N/A', name:'No data', desc:'H₂, CH₄, C₂H₆ all zero.', h:0, m:0, e:0 };
    const h = 100 * g.h2  / total, m = 100 * g.ch4 / total, e = 100 * g.c2h6/ total;
    let zone, name, desc;
    if (e <= 1 && m >= 2 && m <= 15) {
      zone = 'PD'; name = 'Partial Discharge — Corona';
      desc = 'Corona-type discharge in gas-filled cavities. Very low C₂H₆, moderate CH₄. Confirms T1 PD diagnosis. Inspect oil condition and gas-filled voids. Monitor H₂ rate.';
    } else if (m >= 36 && e <= 24) {
      zone = 'C'; name = 'Thermal — Possible Paper Carbonization (> 300 °C)';
      desc = 'High CH₄ / low C₂H₆ thermal fault. Indicates possible carbonization of cellulose insulation at temperatures > 300 °C. Inspect core clamps, leads, and paper insulation. Furan analysis recommended.';
    } else if (h <= 9 && e >= 24) {
      zone = 'O'; name = 'Overheating < 250 °C — No Paper Carbonization';
      desc = 'Low-temperature overheating of oil or metal surfaces. High C₂H₆, very low H₂. No cellulose carbonization indicated. Monitor gas trend; investigate local hot spots.';
    } else {
      zone = 'S'; name = 'Stray Gassing of Mineral Oil (100–200 °C)';
      desc = 'Typical low-temperature oil decomposition — often a normal finding at elevated operating temperature. Not necessarily a fault. Compare against IEC TGC limits and monitor trend. No immediate action required if values are below TGC.';
    }
    return { zone, name, desc, h, m, e };
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.duval = { calcDuval, calcDuval4 };
})();
