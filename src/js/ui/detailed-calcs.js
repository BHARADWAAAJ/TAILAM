/**
 * TAILAM — ui/detailed-calcs.js
 * "Show Detailed Calculations" feature — the Engineering Workbook view.
 *
 * PHASE 2 — full content. Presentation only, same rule as ui/workspace.js:
 * every value shown here is READ from the report object already built in
 * ui/dashboard.js (itself built entirely from src/js/engine/*.js output) or
 * from window.TAILAM.ui.charts' exported zone-geometry tables (the SAME
 * frozen tables the on-screen SVG and the export canvas already draw from).
 * Nothing here computes a new threshold, ratio, boundary, weight or score.
 *
 * Two narrow exceptions, both display-only and both already used elsewhere
 * in the codebase for the identical purpose:
 *  1. Threshold/decision tables for Rogers and IEC (the c1..c4 banding and
 *     the code→fault lookup) are not returned as data by rogers.js/iec.js —
 *     only the final numbers (R1..R4, code, fault) are. Those tables are
 *     transcribed here verbatim from the frozen source as static reference
 *     text, the same category of content as engine/*.js's own JSDoc.
 *  2. normalizeForConsensus() below is a verbatim copy of
 *     engine/consensus.js's internal normalize() step — the SAME copy
 *     ui/workspace.js already carries (see its Task 7 comment) — used only
 *     to label whether a method's raw code falls in Duval's category for
 *     display. It never feeds into or replaces agree.agreeLevel/confidence.
 *
 * Plain script — publishes on window.TAILAM.ui.detailedCalcs.
 * Depends on window.TAILAM.utils.helpers, window.TAILAM.ui.charts,
 * window.TAILAM.ui.duvalLegend (load those first).
 */
(function () {
  'use strict';

  const { esc } = window.TAILAM.utils.helpers;

  // ── tiny render helpers ────────────────────────────────────────────────

  function fmt(v, dp) {
    if (v === null || v === undefined) return 'N/A';
    if (v === 9999) return '∞';
    return typeof v === 'number' ? v.toFixed(dp == null ? 3 : dp) : String(v);
  }
  function pct(v) { return (v == null) ? '—' : v.toFixed(1) + '%'; }

  /** One labelled row inside a calc-card: label above, content below. */
  function row(label, html) {
    return '<div class="calc-row"><span class="calc-label">' + esc(label) + '</span>' + html + '</div>';
  }
  function formula(text) { return '<div class="calc-formula">' + esc(text) + '</div>'; }
  function substitution(lines) {
    return '<div class="calc-substitution">' + lines.map(esc).join('<br>') + '</div>';
  }
  function resultLine(value, note) {
    return '<div class="calc-result-line"><span class="calc-result-value">' + esc(value) + '</span>' +
      (note ? '<span class="calc-threshold-note">' + esc(note) + '</span>' : '') + '</div>';
  }
  function interp(text) { return '<div class="calc-interp">' + esc(text) + '</div>'; }
  function miniTable(headers, rows2) {
    return '<table class="calc-table"><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows2.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  /**
   * One workbook card: title (+ optional standard reference), then an
   * arbitrary list of pre-built row HTML blocks.
   * @param {string} title
   * @param {?string} ref - standard/method reference shown beside the title
   * @param {string[]} rowsHtml
   * @param {boolean} [wide] - span the full grid width (for wide tables)
   */
  function card(title, ref, rowsHtml, wide) {
    return '<div class="calc-card' + (wide ? ' workbook-card-wide' : '') + '">' +
      '<div class="calc-card-title"><span>' + esc(title) + '</span>' +
      (ref ? '<span class="calc-card-ref">' + esc(ref) + '</span>' : '') + '</div>' +
      rowsHtml.join('') + '</div>';
  }

  /**
   * Verbatim copy of engine/consensus.js's internal normalize() step (same
   * copy already carried by ui/workspace.js#normalizeForConsensus). Used
   * ONLY to label agreement for display; never replaces or feeds into
   * calcAgreement()'s own agreeLevel/confidence.
   * @param {string} f
   * @returns {string}
   */
  function normalizeForConsensus(f) {
    return ['PD', 'D1', 'D2', 'DT', 'T1', 'T2', 'T3'].indexOf(f) > -1 ? f : (['Normal', 'N'].indexOf(f) > -1 ? 'Normal' : 'Other');
  }

  /** Render zone boundary vertices from the live, already-exposed charts.js tables — no geometry recomputed. */
  function zoneBoundaryRows(zonesTable) {
    return (zonesTable || []).map((z) => [
      z.id,
      z.verts.map((v) => '[' + v.join(',') + ']').join(' → ')
    ]);
  }

  // ══════════════════════════════════════════════════════════════════════
  // MAIN TANK
  // ══════════════════════════════════════════════════════════════════════

  function buildMainCards(rp) {
    const { g, duval, rogers, iec, ieee, keygas, paper, doern, cigre, agree, risk, rec, o2info } = rp;
    const charts = window.TAILAM.ui.charts;
    const cards = [];

    // ── Gas Concentrations ──
    cards.push(card('Gas Concentrations', 'As entered', [
      miniTable(['Gas', 'Measured', 'Unit'], [
        ['H₂ — Hydrogen', g.h2, 'ppm'],
        ['CH₄ — Methane', g.ch4, 'ppm'],
        ['C₂H₆ — Ethane', g.c2h6, 'ppm'],
        ['C₂H₄ — Ethylene', g.c2h4, 'ppm'],
        ['C₂H₂ — Acetylene', g.c2h2, 'ppm'],
        ['CO — Carbon Monoxide', g.co, 'ppm'],
        ['CO₂ — Carbon Dioxide', g.co2, 'ppm'],
        ['O₂ — Oxygen', g.o2 > 0 ? g.o2 : 'Not entered', g.o2 > 0 ? 'ppm' : '']
      ])
    ], true));

    // ── Gas Ratios — every ratio computed across every ratio-based method ──
    cards.push(card('Gas Ratios', 'All ratio-based methods', [
      miniTable(['Method', 'Ratio', 'Formula', 'Value'], [
        ['Rogers', 'R1', 'CH₄ / H₂', fmt(rogers.R1)],
        ['Rogers', 'R2', 'C₂H₆ / CH₄', fmt(rogers.R2)],
        ['Rogers', 'R3', 'C₂H₄ / C₂H₆', fmt(rogers.R3)],
        ['Rogers', 'R4', 'C₂H₂ / C₂H₄', fmt(rogers.R4)],
        ['IEC 60599', 'r1', 'C₂H₂ / C₂H₄', fmt(iec.r1)],
        ['IEC 60599', 'r2', 'CH₄ / H₂', fmt(iec.r2)],
        ['IEC 60599', 'r3', 'C₂H₄ / C₂H₆', fmt(iec.r3)],
        ['Doernenburg', 'R1', 'CH₄ / H₂', fmt(doern.R1)],
        ['Doernenburg', 'R2', 'C₂H₂ / C₂H₄', fmt(doern.R2)],
        ['Doernenburg', 'R3', 'C₂H₂ / CH₄', fmt(doern.R3)],
        ['Doernenburg', 'R4', 'C₂H₆ / C₂H₂', fmt(doern.R4)],
        ['CIGRE', 'K1', 'C₂H₂ / C₂H₆', fmt(cigre.k1)],
        ['CIGRE', 'K2', 'H₂ / CH₄', fmt(cigre.k2)],
        ['CIGRE', 'R1', 'C₂H₄ / C₂H₆', fmt(cigre.r1)],
        ['CIGRE', 'R2', 'CO₂ / CO', fmt(cigre.r2, 2)],
        ['CIGRE', 'R3', 'C₂H₂ / H₂', fmt(cigre.r3)]
      ])
    ], true));

    // ── IEC 60599 Three-Ratio Method ──
    cards.push(card('IEC 60599 Three-Ratio Method', 'IEC 60599:2022 Table 1', [
      row('Input Ratios', miniTable(['Ratio', 'Formula', 'Value'], [
        ['r1', 'C₂H₂/C₂H₄', fmt(iec.r1)], ['r2', 'CH₄/H₂', fmt(iec.r2)], ['r3', 'C₂H₄/C₂H₆', fmt(iec.r3)]
      ])),
      row('Coding Thresholds (frozen)', miniTable(['Ratio', 'Coding'], [
        ['r1', '< 0.1 → 0 · 0.1–3 → 1 · > 3 → 2'],
        ['r2', '< 0.1 → 1 · 0.1–1 → 0 · > 1 → 2'],
        ['r3', '< 1 → 0 · 1–4 → 1 · > 4 → 2']
      ])),
      row('Resulting Code', resultLine(iec.code)),
      row('Decision Path (frozen pattern match on r1/r2/r3)', miniTable(['Condition', 'Fault'], [
        ['r2 < 0.1 and r3 < 0.2', 'PD'],
        ['r1 > 1 and 0.1 ≤ r2 ≤ 0.5 and r3 > 1', 'D1'],
        ['0.6 ≤ r1 ≤ 2.5 and 0.1 ≤ r2 ≤ 1 and r3 > 2', 'D2'],
        ['r2 > 1 and r3 < 1', 'T1'],
        ['r1 < 0.1 and r2 > 1 and 1 ≤ r3 ≤ 4', 'T2'],
        ['r1 < 0.2 and r2 > 1 and r3 > 4', 'T3'],
        ['none of the above', 'Indeterminate']
      ])),
      row('Final Diagnosis', resultLine(iec.fault + ' — ' + iec.name)),
      row('Engineering Interpretation', interp(iec.desc))
    ]));

    // ── Rogers Ratio Method ──
    cards.push(card('Rogers Ratio Method', 'Rogers 4-ratio', [
      row('Input Ratios', miniTable(['Ratio', 'Formula', 'Value'], [
        ['R1', 'CH₄/H₂', fmt(rogers.R1)], ['R2', 'C₂H₆/CH₄', fmt(rogers.R2)],
        ['R3', 'C₂H₄/C₂H₆', fmt(rogers.R3)], ['R4', 'C₂H₂/C₂H₄', fmt(rogers.R4)]
      ])),
      row('Coding Thresholds (frozen)', miniTable(['Ratio', 'Coding'], [
        ['R1', '< 0.1 → 0 · 0.1–1 → 1 · > 1 → 2'],
        ['R2', '< 1 → 0 · 1–3 → 1 · > 3 → 2'],
        ['R3', '< 1 → 0 · 1–3 → 1 · > 3 → 2'],
        ['R4', '< 0.5 → 0 · 0.5–3 → 1 · > 3 → 2']
      ])),
      row('Resulting Code (R1R2R3R4)', resultLine(rogers.code)),
      row('Code → Fault Lookup (frozen table, matching code shown)', miniTable(['Code(s)', 'Fault'], [
        ['0000, 0100', 'PD'], ['1000, 1100', 'Normal'], ['0010, 0001, 0011', 'D1'],
        ['1201, 0201, 1211, 0211', 'D2'], ['2000, 2100', 'T1'], ['2110, 2210', 'T2'],
        ['2120, 2220, 2121, 2221', 'T3']
      ])),
      row('Final Diagnosis', resultLine(rogers.fault + ' — ' + rogers.name)),
      row('Engineering Interpretation', interp(rogers.desc))
    ]));

    // ── Duval Triangle 1 ──
    const dTotal = duval.total || 0;
    const zones = charts.T1_ZONES || [];
    cards.push(card('Duval Triangle 1', 'IEC 60599:2022 Fig. B.3 — not redrawn here; see Primary Diagnosis', [
      row('Raw Gas Values Used', miniTable(['Gas', 'ppm'], [['CH₄', g.ch4], ['C₂H₄', g.c2h4], ['C₂H₂', g.c2h2]])),
      row('Sum (CH₄ + C₂H₄ + C₂H₂)', resultLine(dTotal + ' ppm')),
      row('Normalised Percentage Calculation', dTotal > 0 ? substitution([
        '%CH₄  = ' + g.ch4 + ' / ' + dTotal + ' × 100 = ' + pct(duval.pCH4),
        '%C₂H₄ = ' + g.c2h4 + ' / ' + dTotal + ' × 100 = ' + pct(duval.pC2H4),
        '%C₂H₂ = ' + g.c2h2 + ' / ' + dTotal + ' × 100 = ' + pct(duval.pC2H2)
      ]) : interp('Sum is zero — percentages undefined, Duval Triangle 1 not applicable.')),
      row('Barycentric Coordinates', dTotal > 0
        ? interp('(%CH₄, %C₂H₄, %C₂H₂) = (' + duval.pCH4.toFixed(1) + ', ' + duval.pC2H4.toFixed(1) + ', ' + duval.pC2H2.toFixed(1) + ') — the three normalised percentages ARE the ternary/barycentric coordinate of the plotted point (they sum to 100).')
        : interp('Not applicable — no point to plot.')),
      row('Zone Boundaries (frozen geometry, %CH₄/%C₂H₄/%C₂H₂ vertices)', miniTable(['Zone', 'Vertices'], zoneBoundaryRows(zones))),
      row('Final Zone', resultLine(duval.zone + ' — ' + duval.name)),
      row('Why This Zone', interp(duval.desc))
    ], true));

    // ── Key Gas Method & TDCG ──
    const dominantRows = (keygas.dominant || []).map((d, idx) => [String(idx + 1), d[0], d[1] + ' ppm']);
    cards.push(card('Key Gas Method', 'IEEE C57.104 — dominant-gas pattern', [
      row('Gas Dominance Ranking (highest ppm first)', miniTable(['Rank', 'Gas', 'Value'], dominantRows)),
      row('Dominant Gas', resultLine(keygas.dominant && keygas.dominant[0] ? keygas.dominant[0][0] : '—')),
      row('Decision Logic (frozen thresholds on raw ppm — not percentages)', interp(
        'Evaluated in order: C₂H₂ dominant over H₂ and CH₄ → D2. Else H₂ and C₂H₂ (>5 ppm) both elevated → D1. ' +
        'Else H₂ dominant with low hydrocarbons → PD. Else C₂H₄ dominant with C₂H₂ < 5 ppm → T3. ' +
        'Else CH₄/C₂H₆ dominant with C₂H₄ below CH₄ and C₂H₂ < 5 ppm → T1. Else CO > 350 ppm → C (cellulose). Else → N.'
      )),
      row('Final Diagnosis', resultLine(keygas.fault + ' — ' + keygas.name)),
      row('Engineering Interpretation', interp(keygas.desc)),
      row('TDCG (Total Dissolved Combustible Gas)', substitution([
        'TDCG = H₂ + CH₄ + C₂H₆ + C₂H₄ + C₂H₂ + CO',
        '     = ' + g.h2 + ' + ' + g.ch4 + ' + ' + g.c2h6 + ' + ' + g.c2h4 + ' + ' + g.c2h2 + ' + ' + g.co + ' = ' + keygas.TDCG + ' ppm'
      ])),
      row('TDCG Condition Bands (frozen, IEEE C57.104)', miniTable(['Condition', 'TDCG Range (ppm)'], [
        ['1 — Normal', '< 720'], ['2 — Caution', '720 – 1919'], ['3 — High', '1920 – 4629'], ['4 — Critical', '≥ 4630']
      ])),
      row('TDCG Result', resultLine(keygas.tdcgName)),
      row('TDCG Interpretation', interp(keygas.tdcgDesc))
    ], true));

    // ── Supplementary ratio-based methods (IEEE, Doernenburg, CIGRE, O₂) —
    // same "reuse existing values" discipline, compact per-method cards ──
    cards.push(card('IEEE C57.104 Individual Gas Evaluation', 'IEEE C57.104 Table 1', [
      row('Per-Gas Condition (worst gas sets the overall condition)', miniTable(
        ['Gas', 'Value', 'C1 max', 'C2 max', 'C3 max', 'Condition'],
        ieee.rows.map((r) => [r.gas, r.val, r.lims[0], r.lims[1], r.lims[2], 'C' + r.cond])
      )),
      row('Overall Condition (max across gases)', resultLine(ieee.condName)),
      row('Engineering Interpretation', interp(ieee.desc))
    ], true));

    cards.push(card('Doernenburg Method', 'Legacy IEEE ratio method', [
      row('Ratios (denominator < 5 ppm ⇒ N/A)', miniTable(['Ratio', 'Formula', 'Value'], [
        ['R1', 'CH₄/H₂', fmt(doern.R1)], ['R2', 'C₂H₂/C₂H₄', fmt(doern.R2)],
        ['R3', 'C₂H₂/CH₄', fmt(doern.R3)], ['R4', 'C₂H₆/C₂H₂', fmt(doern.R4)]
      ])),
      row('Decision Logic (frozen vote-by-ratio)', interp('Each valid ratio casts a vote for Thermal, Arcing, or Corona per fixed bands; the category with the most votes wins. All-N/A ⇒ Indeterminate.')),
      row('Final Diagnosis', resultLine(doern.fault + ' — ' + doern.name)),
      row('Engineering Interpretation', interp(doern.desc))
    ]));

    cards.push(card('CIGRE Five-Key-Ratio Method', 'CIGRE TB 771', [
      row('Ratios', miniTable(['Ratio', 'Formula', 'Value'], [
        ['K1', 'C₂H₂/C₂H₆', fmt(cigre.k1)], ['K2', 'H₂/CH₄', fmt(cigre.k2)], ['R1', 'C₂H₄/C₂H₆', fmt(cigre.r1)],
        ['R2', 'CO₂/CO', fmt(cigre.r2, 2)], ['R3', 'C₂H₂/H₂', fmt(cigre.r3)]
      ])),
      row('Flag Thresholds (frozen)', miniTable(['Flag', 'Trigger'], [
        ['K1 — Electrical Discharge', 'K1 > 1'], ['K2 — Partial Discharge', 'K2 > 10'],
        ['R1 — Thermal Fault', 'R1 > 1'], ['R2 — Paper Overheating', 'R2 > 10'],
        ['R2 — Electrical Fault on Paper', 'R2 < 3'], ['R3 — OLTC Contamination', 'R3 > 2 and C₂H₂ > 30 ppm']
      ])),
      row('Flags Raised', (cigre.flags || []).length
        ? miniTable(['Flag', 'Detail', 'Verdict'], cigre.flags.map((f) => [f.name, f.detail, f.verdict]))
        : interp('No CIGRE flag triggered.'))
    ], true));

    if (o2info) {
      cards.push(card('Dissolved Oxygen Assessment', 'IEC 60422', [
        row('Measured O₂', resultLine(g.o2 + ' ppm')),
        row('Bands (frozen)', miniTable(['Range (ppm)', 'Interpretation'], [
          ['< 1000', 'Very Low — possible active oxidation'], ['1000 – 4999', 'Low/Normal — typical sealed tank'],
          ['5000 – 14999', 'Normal–Elevated — monitor seals'], ['≥ 15000', 'High — possible air ingress']
        ])),
        row('Result', resultLine(o2info.label)),
        row('Engineering Interpretation', interp(o2info.desc))
      ]));
    }
    if (paper && paper.coRatio !== null) {
      cards.push(card('CO₂/CO Paper Involvement', 'IEC 60599 §5.5', [
        row('CO₂/CO Ratio', substitution(['CO₂/CO = ' + g.co2 + ' / ' + g.co + ' = ' + paper.coRatio.toFixed(2)])),
        row('Interpretation', interp(paper.text))
      ]));
    }

    // ── Transformer Health Index — full weighted equation ──
    const thi = window.TAILAM.engine.thi.calcRiskScoreBreakdown(duval, rogers, iec, ieee, keygas);
    const eqTerms = thi.components.map((c) => c.componentScore + '×' + c.weight);
    cards.push(card('Transformer Health Index', 'Weighted composite, 0–100', [
      row('Component Scores, Weights & Contributions', miniTable(
        ['Method', 'Input', 'Score', 'Weight', 'Weighted'],
        thi.components.map((c) => [c.label, c.input, c.componentScore, c.weight, c.weighted.toFixed(2)])
      )),
      row('Complete Equation', substitution([
        'THI = round(' + eqTerms.join(' + ') + ')',
        '    = round(' + thi.rawSum.toFixed(3) + ') = ' + thi.score,
        thi.score !== risk ? '(clamped to 0–100 range)' : ''
      ].filter(Boolean))),
      row('Final Score', resultLine(risk + ' / 100'))
    ], true));

    // ── Confidence Assessment ──
    const dCat = normalizeForConsensus(duval.zone), rCat = normalizeForConsensus(rogers.fault), iCat = normalizeForConsensus(iec.fault);
    cards.push(card('Confidence Assessment', 'Duval × Rogers × IEC 60599', [
      row('Per-Method Category (for cross-comparison only)', miniTable(['Method', 'Raw Result', 'Category', 'Agrees with Duval?'], [
        ['Duval Triangle 1', duval.zone, dCat, '— (reference)'],
        ['Rogers Ratio', rogers.fault, rCat, rCat === dCat ? 'Yes' : 'No'],
        ['IEC 60599', iec.fault, iCat, iCat === dCat ? 'Yes' : 'No']
      ])),
      row('Agreement Level → Confidence (frozen mapping)', miniTable(['Agreement', 'Confidence'], [
        ['High (3 of 3 match)', '92%'], ['Moderate (2 of 3 match)', '68%'], ['Low (≤1 of 3 match)', '42%']
      ])),
      row('Result', resultLine(agree.agreeLevel + ' — ' + agree.confidence + '%'))
    ]));

    // ── Recommendation Logic ──
    cards.push(card('Recommendation Logic', 'Zone-keyed lookup', [
      row('Input', resultLine('Duval Triangle 1 zone = ' + duval.zone)),
      row('Rule', interp('getRecommendation(zone) is a direct 1:1 lookup table keyed only by the Duval Triangle 1 zone. The risk-score parameter is accepted for interface compatibility but is not used by the lookup.')),
      row('Output', interp(rec))
    ], true));

    return cards;
  }

  /**
   * Populate the Main Tank Detailed Calculations container.
   * @param {object} rp - Main Tank report object from ui/dashboard.js#analyzeMain
   */
  function renderMainDetailed(rp) {
    const el = document.getElementById('detailed-main');
    if (!el) return;
    el.innerHTML = buildMainCards(rp).join('');
  }

  // ══════════════════════════════════════════════════════════════════════
  // OLTC
  // ══════════════════════════════════════════════════════════════════════

  function buildOltcCards(rp) {
    const { og, taps, duval2, oltcRes, xcontam } = rp;
    const charts = window.TAILAM.ui.charts;
    const cards = [];

    cards.push(card('Gas Concentrations', 'As entered', [
      miniTable(['Gas', 'Measured', 'Unit'], [
        ['H₂', og.h2, 'ppm'], ['CH₄', og.ch4, 'ppm'], ['C₂H₆', og.c2h6, 'ppm'], ['C₂H₄', og.c2h4, 'ppm'],
        ['C₂H₂', og.c2h2, 'ppm'], ['CO', og.co, 'ppm'], ['CO₂', og.co2, 'ppm'],
        ['Tap Change Count', taps > 0 ? taps : 'Not entered', taps > 0 ? 'ops' : '']
      ])
    ], true));

    const d2Total = duval2.total || 0;
    cards.push(card('Duval Triangle 2', 'IEC 60599:2022 Fig. B.4 — not redrawn here; see Primary Diagnosis', [
      row('Raw Gas Values Used', miniTable(['Gas', 'ppm'], [['CH₄', og.ch4], ['C₂H₄', og.c2h4], ['C₂H₂', og.c2h2]])),
      row('Sum (CH₄ + C₂H₄ + C₂H₂)', resultLine(d2Total + ' ppm')),
      row('Normalised Percentage Calculation', d2Total > 0 ? substitution([
        '%CH₄  = ' + og.ch4 + ' / ' + d2Total + ' × 100 = ' + pct(duval2.pCH4),
        '%C₂H₄ = ' + og.c2h4 + ' / ' + d2Total + ' × 100 = ' + pct(duval2.pC2H4),
        '%C₂H₂ = ' + og.c2h2 + ' / ' + d2Total + ' × 100 = ' + pct(duval2.pC2H2)
      ]) : interp('Sum is zero — Duval Triangle 2 not applicable.')),
      row('Barycentric Coordinates', d2Total > 0
        ? interp('(%CH₄, %C₂H₄, %C₂H₂) = (' + duval2.pCH4.toFixed(1) + ', ' + duval2.pC2H4.toFixed(1) + ', ' + duval2.pC2H2.toFixed(1) + ')')
        : interp('Not applicable.')),
      row('Zone Boundaries (frozen geometry)', miniTable(['Zone', 'Vertices'], zoneBoundaryRows(charts.T2_ZONES))),
      row('Final Zone', resultLine(duval2.zone + (duval2.belowTypical ? ' (below typical)' : '') + ' — ' + duval2.name)),
      row('Why This Zone', interp(duval2.desc))
    ], true));

    cards.push(card('Typical Gas Concentration (TGC)', 'CIGRE TB 443, 90th percentile', [
      miniTable(['Gas', 'Measured', 'TGC Limit', '% of Limit', 'Status'],
        ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'].map((k) => {
          const r = oltcRes.tgc[k];
          return [k.toUpperCase(), r.measured, r.limit, r.pct + '%', r.status];
        }))
    ], true));

    ['R_arc', 'R_therm', 'R_disc'].forEach((key) => {
      const r = (oltcRes.ratios || []).find((x) => x.name === key);
      if (!r) return;
      const titles = { R_arc: 'Arcing Ratio', R_therm: 'Thermal Ratio', R_disc: 'Discharge Ratio' };
      cards.push(card(titles[key], 'CIGRE TB 443', [
        row('Formula', formula(r.name + ' = ' + r.formula)),
        row('Value', resultLine(r.value !== null ? r.value.toFixed(3) : 'N/A (denominator zero)')),
        row('Threshold', interp(r.threshold)),
        row('Interpretation', interp(r.interp.label))
      ]));
    });

    if (oltcRes.tapResult) {
      cards.push(card('Tap-Count Normalization', 'CIGRE TB 443', [
        row('Formula', formula('C₂H₂ per 1000 ops = C₂H₂ / taps × 1000')),
        row('Substitution', substitution(['= ' + og.c2h2 + ' / ' + taps + ' × 1000 = ' + oltcRes.tapResult.per1000 + ' ppm/1000 ops'])),
        row('Threshold', interp('≤ 15 ppm/1000 ops = within typical range')),
        row('Result', resultLine(oltcRes.tapResult.ok ? 'Within typical range' : 'Above typical range'))
      ]));
    }

    cards.push(card('Cross-Contamination Check', 'IEC 60599:2022 §5.7', [
      row('Reference Values', miniTable(['Value', 'Source'], [
        ['Main Tank H₂', 'user-entered / auto-filled from Main Tank analysis'],
        ['Main Tank C₂H₂', 'user-entered / auto-filled from Main Tank analysis'],
        ['OLTC C₂H₂', og.c2h2 + ' ppm (this analysis)']
      ])),
      row('Thresholds (frozen)', miniTable(['Rule', 'Trigger'], [
        ['OLTC leaking into main tank', 'main tank C₂H₂ > 30 ppm AND C₂H₂/H₂ > 2'],
        ['Possible oil mixing', 'main tank C₂H₂ / OLTC C₂H₂ > 0.5'],
        ['Monitor (inconclusive)', 'main tank H₂ > 150 ppm AND C₂H₂ > 10 ppm, no stronger flag raised']
      ])),
      row('Findings', (xcontam || []).length
        ? miniTable(['Finding', 'Detail'], xcontam.map((f) => [f.title, f.detail]))
        : interp('No main tank reference values entered.'))
    ], true));

    cards.push(card('IEC "Below Typical" Evaluation', 'IEC 60599:2022 §9', [
      row('Rule', interp('When no gas exceeds its CIGRE TB 443 typical value, a fault-pattern zone (anything other than N) is treated as an early pattern, not an active fault.')),
      row('Any Gas Above TGC?', resultLine(oltcRes.anyAboveTGC ? 'Yes' : 'No')),
      row('Gate Applied?', resultLine(duval2.belowTypical ? 'Yes — zone flagged below-typical' : 'No — gate not triggered for this result'))
    ]))

    return cards;
  }

  /**
   * Populate the OLTC Detailed Calculations container.
   * @param {object} rp - OLTC report object from ui/dashboard.js#analyzeOltc
   */
  function renderOltcDetailed(rp) {
    const el = document.getElementById('detailed-oltc');
    if (!el) return;
    el.innerHTML = buildOltcCards(rp).join('');
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.detailedCalcs = { renderMainDetailed, renderOltcDetailed };
})();
