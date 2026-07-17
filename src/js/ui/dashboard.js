/**
 * TAILAM — ui/dashboard.js
 * Analysis orchestration + result rendering for both panels.
 * Holds the per-panel report state (Main Tank and OLTC are fully
 * independent). All engineering values come from engine/ modules.
 *
 * Plain script — publishes on window.TAILAM.ui.dashboard.
 * Depends on window.TAILAM.engine.*, window.TAILAM.ui.charts,
 * window.TAILAM.ui.cards, window.TAILAM.ui.dialogs, window.TAILAM.utils.*
 * (load those first).
 */
(function () {
  'use strict';

  const { calcDuval } = window.TAILAM.engine.duval;
  const { calcDuval2, applyBelowTypicalGate, calcOLTCAnalysis, calcCrossContam } = window.TAILAM.engine.duval2;
  const { calcRogers } = window.TAILAM.engine.rogers;
  const { calcIEC, calcPaperInvolvement, interpretO2 } = window.TAILAM.engine.iec;
  const { calcIEEE } = window.TAILAM.engine.ieee;
  const { calcKeyGas } = window.TAILAM.engine.keygas;
  const { calcDoernenburg } = window.TAILAM.engine.doernenburg;
  const { calcCIGRE } = window.TAILAM.engine.cigre;
  const { calcAgreement } = window.TAILAM.engine.consensus;
  const { calcRiskScore, healthCategoryFor } = window.TAILAM.engine.thi;
  const { getRecommendation } = window.TAILAM.engine.recommendations;
  const { drawDuvalTriangle, drawDuvalTriangle2, drawRiskGauge } = window.TAILAM.ui.charts;
  const { setText, setResultBox, flagHTML } = window.TAILAM.ui.cards;
  const { notify } = window.TAILAM.ui.dialogs;
  const { GAS_LABELS, fmtRatio, getResultClass, CONDITION_CLASS_MAP } = window.TAILAM.utils.helpers;
  const { readMainTankGases, readOltcGases, readTransformerInfo, readNumberField, hasAnyGas } = window.TAILAM.utils.validators;

  let mtReport = null; // last computed Main Tank result set
  let otReport = null; // last computed OLTC result set
  let mtExported = true; // false once a report exists that hasn't been exported yet
  let otExported = true;

  /** @returns {?object} last Main Tank report (null if none). */
  function getMtReport() { return mtReport; }
  /** @returns {?object} last OLTC report (null if none). */
  function getOtReport() { return otReport; }

  /** @returns {boolean} true when a Main Tank report exists and has not been exported. */
  function isMainDirty() { return !!mtReport && !mtExported; }
  /** @returns {boolean} true when an OLTC report exists and has not been exported. */
  function isOltcDirty() { return !!otReport && !otExported; }
  /** Mark the current Main Tank report as exported (called by ui/export.js). */
  function markMainExported() { mtExported = true; }
  /** Mark the current OLTC report as exported (called by ui/export.js). */
  function markOltcExported() { otExported = true; }

  /** Run the complete main-tank analysis from the current form values. */
  function analyzeMain() {
    const g = readMainTankGases();
    if (!hasAnyGas(g)) { notify('Please enter at least one main-tank gas value.'); return; }
    const info = readTransformerInfo();
    const duval  = calcDuval(g);
    const rogers = calcRogers(g);
    const iec    = calcIEC(g);
    const ieee   = calcIEEE(g);
    const keygas = calcKeyGas(g);
    const paper  = calcPaperInvolvement(g);
    const doern  = calcDoernenburg(g);
    const cigre  = calcCIGRE(g);
    const agree  = calcAgreement(duval, rogers, iec);
    const risk   = calcRiskScore(duval, rogers, iec, ieee, keygas);
    const rec    = getRecommendation(duval.zone, risk);
    const o2info = interpretO2(g.o2);

    mtReport = { g, info, duval, rogers, iec, ieee, keygas, paper, doern, cigre, agree, risk, rec, o2info };
    mtExported = false;
    document.getElementById('empty-main').style.display = 'none';
    const resultsMainEl = document.getElementById('results-main');
    resultsMainEl.style.display = 'block';
    // Bug fix — render (which draws duval-canvas) only AFTER the panel is
    // unhidden, never while results-main is still display:none. See the
    // matching comment in analyzeOltc() and the bug-fix report for the full
    // root-cause explanation; no drawing math or engineering value changed.
    renderMainTank(mtReport);
    // Design sprint — restart the CSS fade-in-up animation every run (class
    // toggle only; no engineering value touched, see base.css .reveal-in).
    resultsMainEl.classList.remove('reveal-in'); void resultsMainEl.offsetWidth; resultsMainEl.classList.add('reveal-in');
    resultsMainEl.scrollIntoView({ behavior:'smooth' });
    syncCrossContamDefaults();
  }

  /**
   * Render a main-tank report into the dashboard.
   * @param {object} rp - report from analyzeMain()
   */
  function renderMainTank(rp) {
    const { g, duval, rogers, iec, ieee, keygas, paper, doern, cigre, agree, risk, rec, o2info } = rp;

    drawRiskGauge(risk);
    const healthCat = healthCategoryFor(risk);
    setResultBox('risk-label', healthCat.label, healthCat.cls);
    setText('ov-confidence', agree.confidence + '%');
    setText('ov-agreement', agree.agreeLevel);
    setText('ov-rec', rec);

    drawDuvalTriangle('duval-canvas', duval);
    setResultBox('duval-zone-box', duval.zone, getResultClass(duval.zone));
    setText('duval-zone-name', duval.name);
    setText('duval-zone-desc', duval.desc);
    setText('dp-ch4', duval.total ? duval.pCH4.toFixed(1)+'%' : '—');
    setText('dp-c2h4', duval.total ? duval.pC2H4.toFixed(1)+'%' : '—');
    setText('dp-c2h2', duval.total ? duval.pC2H2.toFixed(1)+'%' : '—');

    setResultBox('rogers-zone-box', rogers.fault, getResultClass(rogers.fault));
    setText('rogers-name', rogers.name);
    setText('rogers-desc', rogers.desc);
    document.getElementById('rogers-body').innerHTML = [
      ['R1','CH₄/H₂',rogers.R1],['R2','C₂H₆/CH₄',rogers.R2],['R3','C₂H₄/C₂H₆',rogers.R3],['R4','C₂H₂/C₂H₄',rogers.R4]
    ].map(([n,f,v]) => `<tr><td><strong>${n}</strong></td><td style="color:var(--text2)">${f}</td><td>${fmtRatio(v)}</td></tr>`).join('');

    setResultBox('iec-zone-box', iec.fault, getResultClass(iec.fault));
    setText('iec-name', iec.name);
    setText('iec-desc', iec.desc);
    document.getElementById('iec-body').innerHTML = [
      ['C₂H₂/C₂H₄',iec.r1],['CH₄/H₂',iec.r2],['C₂H₄/C₂H₆',iec.r3]
    ].map(([f,v]) => `<tr><td colspan="2" style="color:var(--text2)">${f}</td><td>${fmtRatio(v)}</td></tr>`).join('');
    setText('paper-desc', paper.text);

    setResultBox('ieee-zone-box', 'C' + ieee.maxCond + ' — ' + ieee.condName.split('— ')[1], CONDITION_CLASS_MAP[ieee.maxCond]);
    setText('ieee-desc', ieee.desc);
    document.getElementById('ieee-body').innerHTML = ieee.rows.map(r => {
      const condCls = {1:'badge-green',2:'badge-yellow',3:'badge-orange',4:'badge-red'}[r.cond];
      return `<tr><td><strong>${GAS_LABELS[r.gas]}</strong></td><td>${r.val}</td><td style="color:var(--text3)">${r.lims[0]}</td><td style="color:var(--text3)">${r.lims[1]}</td><td style="color:var(--text3)">${r.lims[2]}</td><td><span class="badge ${condCls}">C${r.cond}</span></td></tr>`;
    }).join('');

    setResultBox('keygas-zone-box', keygas.fault, getResultClass(keygas.fault));
    setText('keygas-name', keygas.name);
    setText('keygas-desc', keygas.desc);
    setText('tdcg-value', keygas.TDCG.toFixed(0));
    setResultBox('tdcg-zone-box', keygas.tdcgName, CONDITION_CLASS_MAP[keygas.tdcgCond]);
    setText('tdcg-desc', keygas.tdcgDesc);

    setResultBox('doern-zone-box', doern.fault, (doern.fault === 'Indeterminate' ? 'result-attention' : 'result-warning'));
    setText('doern-desc', doern.desc);
    document.getElementById('doern-body').innerHTML = [
      ['R1','CH₄/H₂',doern.R1],['R2','C₂H₂/C₂H₄',doern.R2],['R3','C₂H₂/CH₄',doern.R3],['R4','C₂H₆/C₂H₂',doern.R4]
    ].map(([n,f,v]) => `<tr><td><strong>${n}</strong></td><td style="color:var(--text2)">${f}</td><td>${v===null?'N/A':v.toFixed(3)}</td></tr>`).join('');

    document.getElementById('cigre-flags').innerHTML = cigre.flags.map(f =>
      flagHTML(f.cls, f.name, `${f.detail} — ${f.verdict}`)
    ).join('');

    const o2card = document.getElementById('o2-card');
    if (o2info) {
      o2card.style.display = 'block';
      setResultBox('o2-box', o2info.label, o2info.cls);
      setText('o2-desc', o2info.desc);
    } else { o2card.style.display = 'none'; }

    // Sprint 03 — Engineering Workspace: populate the new status/assessment/
    // decision/action-plan/interpretation/evidence/diagnostic-table sections
    // from this same report object. Presentation only — see ui/workspace.js.
    if (window.TAILAM.ui.workspace) window.TAILAM.ui.workspace.renderMainWorkspace(rp);
  }

  /** Clear the main-tank inputs and hide its results. */
  function clearMain() {
    ['g-h2','g-ch4','g-c2h6','g-c2h4','g-c2h2','g-co','g-co2','g-o2'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('results-main').style.display = 'none';
    document.getElementById('empty-main').style.display = 'block';
    mtReport = null;
    mtExported = true;
  }

  /** Run the complete OLTC analysis from the current form values. */
  function analyzeOltc() {
    const og = readOltcGases();
    if (!hasAnyGas(og)) { notify('Please enter at least one OLTC gas value.'); return; }
    const taps = readNumberField('ot-taps');
    const duval2 = calcDuval2(og);
    const oltcRes = calcOLTCAnalysis(og, taps);
    // IEC 60599:2022 §9 gate: below typical values the zone is an early pattern, not a fault
    applyBelowTypicalGate(duval2, oltcRes.anyAboveTGC);
    const mtH2 = readNumberField('xc-mt-h2');
    const mtC2H2 = readNumberField('xc-mt-c2h2');
    const xcontam = calcCrossContam({ h2:mtH2, c2h2:mtC2H2 }, { c2h2: og.c2h2 });

    otReport = { og, taps, duval2, oltcRes, xcontam, info: readTransformerInfo() };
    otExported = false;
    document.getElementById('empty-oltc').style.display = 'none';
    const resultsOltcEl = document.getElementById('results-oltc');
    resultsOltcEl.style.display = 'block';
    // Bug fix — render (which draws duval2-canvas) only AFTER the panel is
    // unhidden, never while results-oltc is still display:none. Root cause:
    // .duval-hero-canvas-wrap is the only reveal-in target animated directly
    // (scaleIn, a transform) on the canvas's immediate parent; combined with
    // drawing into that canvas while its whole subtree was still hidden, the
    // browser could promote the wrapper to a fresh compositing layer AFTER
    // the bitmap was already painted, losing it once the animation settled.
    // Drawing after display:block removes the hidden-canvas/animation race —
    // same single draw call, same drawDuvalTriangle2()/engine values.
    renderOltc(otReport);
    // Design sprint — same reveal animation as Main Tank (presentation only).
    resultsOltcEl.classList.remove('reveal-in'); void resultsOltcEl.offsetWidth; resultsOltcEl.classList.add('reveal-in');
    resultsOltcEl.scrollIntoView({ behavior:'smooth' });
  }

  /**
   * Render an OLTC report into the dashboard.
   * @param {object} rp - report from analyzeOltc()
   */
  function renderOltc(rp) {
    const { og, duval2, oltcRes, xcontam } = rp;

    drawDuvalTriangle2('duval2-canvas', og);
    // Below-typical (§9): show the zone but in the healthy style — it is not an active fault
    setResultBox('d2-zone-box',
      duval2.belowTypical ? duval2.zone + ' (below typical — normal)' : duval2.zone,
      duval2.belowTypical ? 'result-healthy' : getResultClass(duval2.zone));
    setText('d2-zone-name', duval2.name);
    setText('d2-zone-desc', duval2.desc);
    setText('d2p-ch4', duval2.pCH4.toFixed(1)+'%');
    setText('d2p-c2h4', duval2.pC2H4.toFixed(1)+'%');
    setText('d2p-c2h2', duval2.pC2H2.toFixed(1)+'%');

    document.getElementById('oltc-tgc-body').innerHTML = ['h2','ch4','c2h6','c2h4','c2h2','co','co2'].map(k => {
      const r = oltcRes.tgc[k];
      return `<tr><td><strong>${GAS_LABELS[k]}</strong></td><td>${r.measured}</td><td style="color:var(--text3)">${r.limit}</td><td>${r.pct}%</td><td><span class="badge ${r.cls}">${r.status}</span></td></tr>`;
    }).join('');
    document.getElementById('oltc-ratios-body').innerHTML = oltcRes.ratios.map(r =>
      `<tr><td><strong>${r.name}</strong></td><td style="color:var(--text2)">${r.formula}</td><td>${r.value!==null?r.value.toFixed(3):'N/A'}</td><td style="font-size:12px;color:var(--text3)">${r.threshold}</td><td><span class="badge ${r.interp.cls}">${r.interp.label}</span></td></tr>`
    ).join('');
    const tapBox = document.getElementById('oltc-tap-box');
    if (oltcRes.tapResult) {
      tapBox.style.display = 'block';
      tapBox.innerHTML = `<div class="result-box ${oltcRes.tapResult.ok?'result-healthy':'result-warning'}" style="text-align:left">
        <strong>C₂H₂: ${oltcRes.tapResult.per1000} ppm / 1000 ops</strong> — ${oltcRes.tapResult.ok ? 'Within typical range (≤ 15 ppm/1000 ops)' : 'Above typical range — check contact wear'}</div>`;
    } else { tapBox.style.display = 'none'; }
    document.getElementById('oltc-xcontam-box').innerHTML = xcontam.map(f =>
      flagHTML(f.cls, f.title, f.detail)
    ).join('');

    // Sprint 03 — Engineering Workspace: populate the new status/assessment/
    // decision/action-plan/interpretation/evidence/diagnostic-table sections
    // from this same report object. Presentation only — see ui/workspace.js.
    if (window.TAILAM.ui.workspace) window.TAILAM.ui.workspace.renderOltcWorkspace(rp);
  }

  /** Clear the OLTC inputs and hide its results. */
  function clearOltc() {
    ['ot-h2','ot-ch4','ot-c2h6','ot-c2h4','ot-c2h2','ot-co','ot-co2','ot-taps','xc-mt-h2','xc-mt-c2h2'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('results-oltc').style.display = 'none';
    document.getElementById('empty-oltc').style.display = 'block';
    otReport = null;
    otExported = true;
  }

  /**
   * Pre-fill the cross-contamination reference inputs from the last
   * main-tank analysis (only when the fields are still empty).
   */
  function syncCrossContamDefaults() {
    if (!mtReport) return;
    const h2El = document.getElementById('xc-mt-h2'), c2h2El = document.getElementById('xc-mt-c2h2');
    if (h2El && !h2El.value) h2El.value = mtReport.g.h2 || '';
    if (c2h2El && !c2h2El.value) c2h2El.value = mtReport.g.c2h2 || '';
  }

  /**
   * Bug fix — "Duval Triangle vanishes after some time" report. Browsers
   * can reclaim a background/idle tab's canvas GPU layer to save memory;
   * when the tab is hidden for a while (switched away, minimised, screen
   * locked) and then shown again, a previously-drawn <canvas> can come
   * back blank even though nothing in this app touched it — the drawing
   * commands were never re-run, only the compositor's copy was discarded.
   * This redraws ONLY the canvases (never any text/table DOM, never an
   * engineering value) for whichever panel is currently showing results,
   * using the SAME unmodified draw functions against the SAME
   * already-computed report object already held in memory since the last
   * analysis — nothing is recomputed or altered.
   */
  function redrawVisibleCanvases() {
    const resultsMainEl = document.getElementById('results-main');
    if (mtReport && resultsMainEl && resultsMainEl.style.display !== 'none') {
      drawRiskGauge(mtReport.risk);
      drawDuvalTriangle('duval-canvas', mtReport.duval);
    }
    const resultsOltcEl = document.getElementById('results-oltc');
    if (otReport && resultsOltcEl && resultsOltcEl.style.display !== 'none') {
      drawDuvalTriangle2('duval2-canvas', otReport.og);
    }
  }

  // Tab returns to the foreground after being hidden ("some time" later).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') redrawVisibleCanvases();
  });
  // Page restored from the browser's back/forward cache (bfcache) — some
  // browsers discard canvas layers on this path even without a visibility
  // change, e.g. after using Back/Forward to leave and return to the tab.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) redrawVisibleCanvases();
  });
  // Canvas scrolled out of the viewport and back — the third path where a
  // browser can discard the canvas's compositor layer (reported on the
  // deployed GitHub Pages site: "triangle disappears once I scroll down
  // and come back up"). Repaint whenever a result canvas re-enters view;
  // redrawVisibleCanvases() is a no-op unless a report exists, and it
  // repaints from the stored report object — nothing is recomputed.
  if ('IntersectionObserver' in window) {
    const canvasIO = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) redrawVisibleCanvases();
    }, { threshold: 0.05 });
    ['duval-canvas', 'duval2-canvas', 'risk-canvas'].forEach((id) => {
      const c = document.getElementById(id);
      if (c) canvasIO.observe(c);
    });
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.dashboard = {
    getMtReport, getOtReport, isMainDirty, isOltcDirty, markMainExported, markOltcExported,
    analyzeMain, renderMainTank, clearMain, analyzeOltc, renderOltc, clearOltc, syncCrossContamDefaults,
    redrawVisibleCanvases
  };
})();
