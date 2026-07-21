/**
 * TAILAM — ui/workspace.js
 * Sprint 03: Engineering Workspace presentation layer.
 *
 * IMPORTANT — presentation only. Every function here READS fields that are
 * already computed by src/js/engine/*.js (via the report object built in
 * ui/dashboard.js) and relabels / groups / aggregates them for display. No
 * new threshold, ratio, boundary or score is computed anywhere in this file.
 * Anywhere a genuine editorial choice was required to fill a Sprint 03
 * section that has no direct engine equivalent (e.g. "Operational Decision"
 * text, Action Plan priority tags), that choice is documented inline with a
 * "JUDGMENT:" comment so it is easy for an engineer reviewer to audit.
 *
 * Plain script — reads window.TAILAM.*, publishes window.TAILAM.ui.workspace.
 */
(function () {
  'use strict';

  const helpers = window.TAILAM.utils.helpers;
  const getResultClass = helpers.getResultClass;
  const esc = helpers.esc;
  const CONDITION_CLASS_MAP = helpers.CONDITION_CLASS_MAP;
  const thi = window.TAILAM.engine.thi;

  // Sprint 05: single canonical mapping from the engine's 4 THI bands to the
  // friendlier word used across the Snapshot, Status Banner and the THI
  // horizontal band. The engine (thi.js#healthCategoryFor) only distinguishes
  // 4 bands, so "Excellent" is never produced — it exists as a labelled but
  // unreachable segment on the band, disclosed here and in the completion
  // report rather than invented via a new, unaudited threshold split.
  const HEALTH_LABEL_MAP = { Healthy: 'Good', Attention: 'Monitor', Warning: 'Attention', Critical: 'Critical' };

  /**
   * Highlight the active segment of a THI horizontal health band.
   * @param {string} bandId - container element id (holds .thi-band-seg children)
   * @param {string} activeWord - the band word to mark active (e.g. "Monitor")
   */
  function setBandActive(bandId, activeWord) {
    const track = document.getElementById(bandId);
    if (!track) return;
    const segs = track.querySelectorAll('.thi-band-seg');
    segs.forEach((seg) => {
      seg.classList.toggle('active', seg.getAttribute('data-band') === activeWord);
    });
  }

  // ── small local helpers ──────────────────────────────────────────────

  /**
   * result-* class → display word (matches components.css / result-box color semantics).
   * @param {string} cls
   * @returns {string}
   */
  function sevWord(cls) {
    return { 'result-healthy': 'Healthy', 'result-attention': 'Attention',
             'result-warning': 'Warning', 'result-critical': 'Critical' }[cls] || 'Attention';
  }

  /**
   * Split recommendation prose into standalone sentences for the action-plan list.
   * @param {string} text
   * @returns {string[]}
   */
  function sentences(text) {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  }

  /**
   * First sentence of a prose string, or the whole string if it has none.
   * @param {string} text
   * @returns {string}
   */
  function firstSentence(text) {
    const s = sentences(text);
    return s.length ? s[0] : (text || '');
  }

  /**
   * Task 8 hard cap — defensive truncation to at most maxWords words.
   * @param {string} text
   * @param {number} maxWords
   * @returns {string}
   */
  function capWords(text, maxWords) {
    const words = (text || '').trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '…';
  }

  /** Set innerHTML by id (no-op if the element doesn't exist). */
  function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  /** Set textContent by id (no-op if the element doesn't exist). */
  function setTxt(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  /** Set className by id (no-op if the element doesn't exist). */
  function setCls(id, cls) { const el = document.getElementById(id); if (el) el.className = cls; }

  const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  // JUDGMENT: "Expected Time" has no engine equivalent — it is a standard
  // engineering-practice timeframe attached to the priority tag already
  // computed above (HIGH/MEDIUM/LOW), not a new calculation or threshold.
  const EXPECTED_TIME = { HIGH: 'Within 30 Days', MEDIUM: 'Next Maintenance', LOW: 'Routine Interval' };

  /**
   * Render the Immediate Action Plan card: sorts items by priority and
   * writes the compact action-item markup (Task 5's Priority/Source/
   * Expected Time layout).
   * @param {string} containerId
   * @param {Array<{text:string,priority:'HIGH'|'MEDIUM'|'LOW',source:string}>} items
   */
  function renderActionPlan(containerId, items) {
    if (!items.length) {
      setHTML(containerId, '<div class="action-empty">No immediate actions — continue routine monitoring.</div>');
      return;
    }
    const sorted = items.slice().sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    const html = sorted.map((it) => {
      return '<div class="action-item priority-' + it.priority.toLowerCase() + '">' +
        '<div class="action-priority">' + it.priority + '</div>' +
        '<div class="action-body">' +
        '<div class="action-text">' + esc(it.text) + '</div>' +
        '<div class="action-meta">' +
        '<span class="action-source"><span class="action-meta-label">Source</span>' + esc(it.source) + '</span>' +
        '<span class="action-time"><span class="action-meta-label">Expected Time</span>' + esc(EXPECTED_TIME[it.priority] || 'Routine Interval') + '</span>' +
        '</div></div></div>';
    }).join('');
    setHTML(containerId, html);
  }

  /**
   * Task 6 — Supporting Evidence as compact labelled blocks instead of prose
   * paragraphs. Purely a rendering helper; every value passed in is already
   * computed elsewhere (agree.agreeLevel/confidence, method availability
   * lists, static assumption strings).
   * @param {{confidence:string,consensus:string,available:string[],unavailable:string[],assumptions:string[]}} data
   * @returns {string} HTML
   */
  function renderEvidenceBlocks(data) {
    function block(label, contentHtml) {
      return '<div class="evidence-block"><div class="evidence-block-label">' + esc(label) + '</div>' + contentHtml + '</div>';
    }
    function tagList(items) {
      if (!items.length) return '<div class="evidence-block-value">None</div>';
      return '<div class="evidence-tags">' + items.map((i) => '<span class="evidence-tag">' + esc(i) + '</span>').join('') + '</div>';
    }
    function valueList(items) {
      if (!items.length) return '<div class="evidence-block-value">None</div>';
      return '<div class="evidence-block-value">' + items.map(esc).join('<br>') + '</div>';
    }
    return '<div class="evidence-blocks">' +
      block('Confidence', '<div class="evidence-block-value evidence-emphasis">' + esc(data.confidence) + '</div>') +
      block('Consensus', '<div class="evidence-block-value">' + esc(data.consensus) + '</div>') +
      block('Supporting Methods', tagList(data.available)) +
      block('Unavailable', tagList(data.unavailable)) +
      block('Assumptions', valueList(data.assumptions)) +
      '</div>';
  }

  /**
   * Presentation-only role tag: the Duval Triangle row is the leading visual
   * indicator (now the hero of the Assessment card), everything else already
   * functions as corroborating evidence — this restates that existing
   * relationship, it does not change which method drives any calculation.
   * @param {string} methodName
   * @returns {string}
   */
  function roleFor(methodName) {
    return /^Duval Triangle/.test(methodName) ? '⭐ Primary Diagnostic' : 'Supporting Method';
  }

  /**
   * Task 7 — Agreement column. Verbatim copy of engine/consensus.js's
   * internal normalize() step, used ONLY to label whether a method's raw
   * fault/zone code falls in the same category as Duval's for display
   * purposes. This does not alter, replace or feed into calcAgreement()'s
   * own agreeLevel/confidence output, which remains the sole authority.
   * @param {string} f - a zone/fault code
   * @returns {string}
   */
  function normalizeForConsensus(f) {
    return ['PD', 'D1', 'D2', 'DT', 'T1', 'T2', 'T3'].indexOf(f) > -1 ? f : (['Normal', 'N'].indexOf(f) > -1 ? 'Normal' : 'Other');
  }

  /**
   * Render the Diagnostic Methods table body (Method/Role/Diagnosis/
   * Severity/Agreement/Reference/Status + collapsible "Why?" row per method).
   * @param {string} tbodyId
   * @param {Array<object>} rows - see call sites for the row shape
   */
  function renderDiagnosticTable(tbodyId, rows) {
    const html = rows.map((r) => {
      const role = roleFor(r.method);
      return '<tr><td>' + esc(r.method) + '</td>' +
        '<td><span class="role-tag ' + (role.indexOf('Primary') > -1 ? 'role-primary' : 'role-supporting') + '">' + role + '</span></td>' +
        '<td>' + esc(r.diagnosis) + '</td>' +
        '<td><span class="sev-tag sev-' + r.sevCls.replace('result-', '') + '">' + r.sevWord + '</span></td>' +
        '<td><span class="agree-tag">' + esc(r.agreement || '—') + '</span></td>' +
        '<td>' + esc(r.reference) + '</td><td>' + esc(r.status) + '</td></tr>' +
        '<tr class="why-row"><td colspan="7"><details class="row-why"><summary>Why? <span class="chev">▼</span></summary>' +
        '<div class="why-body">' + esc(r.why || 'No further detail available.') + '</div></details></td></tr>';
    }).join('');
    setHTML(tbodyId, html);
  }

  // ── MAIN TANK ─────────────────────────────────────────────────────────

  /**
   * Populate every Engineering Workspace section for the Main Tank panel.
   * @param {object} rp - the Main Tank report object built in ui/dashboard.js#analyzeMain
   *   (fields: g, info, duval, rogers, iec, ieee, keygas, paper, doern, cigre, agree, risk, rec, o2info)
   */
  function renderMainWorkspace(rp) {
    const { duval, rogers, iec, ieee, keygas, paper, doern, cigre, agree, risk, rec, o2info } = rp;

    const health = thi.healthCategoryFor(risk); // {label, cls, color} — existing composite score, unchanged
    const statusWord = HEALTH_LABEL_MAP[health.label] || health.label;
    const faultLabel = duval.zone === 'N/A' ? 'Not determined (insufficient gas data)' : (duval.zone + ' — ' + duval.name);
    const agreeCountMap = { High: '3 of 3', Moderate: '2 of 3', Low: '1 of 3 or fewer' };
    const agreementLabel = (agreeCountMap[agree.agreeLevel] || agree.agreeLevel) + ' primary methods agree';
    const decisionMapEarly = { Healthy: 'Continue Operation', Attention: 'Increase Monitoring', Warning: 'Schedule Inspection', Critical: 'Immediate Investigation Required' };
    const decisionWord = decisionMapEarly[health.label] || 'Increase Monitoring';

    // ── 0. Engineering Snapshot (Task 1) — large, no paragraphs, first thing read ──
    setTxt('snapshot-condition-main', statusWord);
    setTxt('snapshot-fault-main', duval.zone === 'N/A' ? 'Not determined' : duval.zone + ' — ' + duval.name);
    setTxt('snapshot-decision-main', decisionWord);
    setTxt('snapshot-confidence-main', agree.confidence + '%');
    setTxt('snapshot-agreement-main', agree.agreeLevel);
    setCls('snapshot-condition-main', 'snapshot-value sev-badge-' + health.cls.replace('result-', ''));

    // ── 1. Engineering Status ──
    setTxt('status-word-main', statusWord);
    setTxt('status-condition-main', health.label);
    // Task 2 — max-2-line engineering summary combining fault + decision, both
    // already computed above; phrased per the Task 3 engineering language bank.
    setTxt('status-summary-main', faultLabel + ' identified. ' + decisionWord + ' is indicated.');
    const now = new Date();
    setTxt('status-date-main', now.toLocaleDateString());
    setTxt('status-time-main', now.toLocaleTimeString());
    setCls('status-banner-main', 'status-banner status-' + health.cls.replace('result-', ''));

    // ── 2. Engineering Assessment ──
    setTxt('assess-fault-main', faultLabel);
    setTxt('assess-confidence-main', agree.confidence + '% (' + agree.agreeLevel + ')');
    setTxt('assess-agreement-main', agreementLabel);
    setHTML('assess-why-main',
      '<table class="evidence-table"><tbody>' +
      '<tr><td>Duval Triangle 1</td><td>' + esc(duval.zone) + ' — ' + esc(duval.name) + '</td></tr>' +
      '<tr><td>Rogers Ratio</td><td>' + esc(rogers.name) + '</td></tr>' +
      '<tr><td>IEC 60599 (3-ratio)</td><td>' + esc(iec.name) + '</td></tr>' +
      '<tr><td>IEEE C57.104</td><td>' + esc(ieee.condName) + '</td></tr>' +
      '<tr><td>Key Gas</td><td>' + esc(keygas.name) + '</td></tr>' +
      '<tr><td>Doernenburg</td><td>' + esc(doern.name) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="why-note">Consensus: ' + esc(agree.agreeLevel) + ' &nbsp;·&nbsp; Confidence: ' + agree.confidence + '%</div>');

    // ── 3. Operational Decision ──
    // JUDGMENT: no discrete "decision" field exists in the engine. This maps
    // the existing 4-band THI classification to one of the 5 fixed decision
    // phrases in the spec's vocabulary (decisionWord, computed above and
    // reused here plus in the Snapshot and Assessment cards). "Remove From
    // Service" has no corresponding engine threshold and is intentionally
    // never selected — flagged as a candidate requiring an explicit
    // engineering-defined cutoff.
    setTxt('decision-value-main', decisionWord);
    setTxt('decision-reason-main', firstSentence(rec));
    setTxt('assess-decision-main', decisionWord);

    // ── Duval Triangle hero (Assessment card) — zone/fault/gas-% summary
    // beside the enlarged canvas. Reads the same rp.duval fields already
    // shown in Raw Calculations; getResultClass() is the same helper
    // dashboard.js uses for duval-zone-box, so colors always match.
    setCls('hero-duval-zone-main', 'result-box zs-zone ' + getResultClass(duval.zone));
    setTxt('hero-duval-zone-main', duval.zone);
    setTxt('hero-duval-name-main', duval.name);
    setTxt('hero-dp-ch4-main', duval.total ? duval.pCH4.toFixed(1) + '%' : '—');
    setTxt('hero-dp-c2h4-main', duval.total ? duval.pC2H4.toFixed(1) + '%' : '—');
    setTxt('hero-dp-c2h2-main', duval.total ? duval.pC2H2.toFixed(1) + '%' : '—');

    // ── Duval Triangle 1 legend — colour key + engineering note below the
    // hero triangle. Reads the SAME zone colours drawDuvalTriangle() paints
    // with (see ui/charts.js's export line) and the SAME duval.zone this
    // function already uses above; adds no new diagnostic value. ──
    if (window.TAILAM.ui.duvalLegend) {
      window.TAILAM.ui.duvalLegend.renderDuvalLegend({
        triangle: 'triangle1',
        container: 'duval-legend-main',
        currentZone: duval.zone,
        highlightTargetId: 'duval-svg-main'
      });
    }

    // ── 4. Immediate Action Plan ──
    // JUDGMENT: priority tags derived from the existing THI band the same
    // way the decision above is; source citations reuse the standard each
    // finding already comes from (no new text authored, only labelled).
    const basePriority = { Healthy: 'LOW', Attention: 'MEDIUM', Warning: 'HIGH', Critical: 'HIGH' }[health.label] || 'MEDIUM';
    const items = [];
    sentences(rec).forEach((s) => {
      items.push({ text: s, priority: basePriority, source: 'IEC 60599:2022 (Duval Triangle 1)', icon: '📘' });
    });
    if (keygas.tdcgCond >= 2) {
      items.push({ text: keygas.tdcgDesc, priority: keygas.tdcgCond >= 3 ? 'HIGH' : 'MEDIUM', source: 'IEEE C57.104 (TDCG)', icon: '📘' });
    }
    (cigre.flags || []).forEach((f) => {
      if (f.cls && f.cls !== 'ok') {
        items.push({ text: f.verdict || f.detail, priority: (f.cls === 'crit') ? 'HIGH' : (f.cls === 'warn' ? 'MEDIUM' : 'LOW'), source: 'CIGRE TB 771', icon: '📘' });
      }
    });
    if (o2info && o2info.cls && o2info.cls !== 'result-healthy') {
      items.push({ text: o2info.desc, priority: 'MEDIUM', source: 'IEC 60422', icon: '📘' });
    }
    if (!items.length) {
      items.push({ text: 'No corrective action required at this time — continue routine sampling interval.', priority: 'LOW', source: 'Engineering Best Practice', icon: '🔧' });
    }
    renderActionPlan('action-plan-main', items);

    // ── 5. Transformer Health Index (Task 4) — score text + horizontal band ──
    // Same risk score already passed to drawRiskGauge; this only adds a
    // text/DOM representation of the identical number for readability.
    setTxt('thi-score-main', risk + ' / 100');
    setBandActive('thi-band-main', statusWord);

    setHTML('thi-why-main',
      '<div class="why-row-item"><strong>Oil Condition:</strong> ' + esc(o2info ? (o2info.label + ' — ' + o2info.desc) : 'Not assessed (O₂ not entered).') + '</div>' +
      '<div class="why-row-item"><strong>Thermal Condition:</strong> ' + esc(ieee.condName) + '; TDCG ' + keygas.TDCG + ' ppm — ' + esc(keygas.tdcgName) + '</div>' +
      '<div class="why-row-item"><strong>Electrical Condition:</strong> Rogers — ' + esc(rogers.name) + '; IEC 60599 — ' + esc(iec.name) + '</div>' +
      '<div class="why-row-item"><strong>Paper Condition:</strong> ' + esc(paper.text) + '</div>' +
      '<div class="why-row-item"><strong>Confidence Contribution:</strong> ' + esc(agree.agreeLevel) + ' agreement (' + agree.confidence + '%) across Duval, Rogers and IEC 60599.</div>');

    // ── 6. Engineering Interpretation (Task 8) — professional, passive,
    // report-style wording built entirely from already-computed fields.
    // Approved phrase bank only: "Consistent with", "Evidence supports",
    // "Diagnostic agreement indicates", "Gas generation pattern is
    // characteristic of", "The analysis identifies". Capped at 120 words.
    const corrobText = agree.agreeLevel === 'High' ? 'Diagnostic agreement indicates high consensus among the Duval Triangle, Rogers Ratio and IEC 60599 methods.'
      : agree.agreeLevel === 'Moderate' ? 'Diagnostic agreement indicates moderate consensus among the primary methods; results should be corroborated by trend data.'
      : 'Diagnostic agreement indicates low consensus among the primary methods; results are to be interpreted with caution.';
    const interp = (duval.zone === 'N/A'
      ? 'The analysis identifies insufficient combustible-gas data for Duval Triangle 1 classification. '
      : ('The analysis identifies ' + duval.name + ' (Duval Triangle 1, Zone ' + duval.zone + ') as the most probable fault condition. Gas generation pattern is characteristic of this classification. '))
      + corrobText + ' '
      + 'Total dissolved combustible gas is ' + keygas.TDCG + ' ppm, consistent with ' + keygas.tdcgName + '. '
      + 'Evidence supports a composite health score of ' + risk + '/100, consistent with the ' + health.label + ' classification. '
      + firstSentence(rec);
    setTxt('interpretation-main', capWords(interp, 120));

    // ── 7. Supporting Evidence (Task 6) — compact evidence blocks, no paragraphs ──
    const available = [], unavailable = [];
    (duval.zone === 'N/A' ? unavailable : available).push('Duval');
    available.push('Rogers');
    (iec.fault === 'Indeterminate' ? unavailable : available).push('IEC');
    available.push('IEEE');
    available.push('Key Gas');
    (doern.fault === 'Indeterminate' ? unavailable : available).push('Doernenburg');
    available.push('CIGRE');
    (o2info ? available : unavailable).push('O₂');
    setHTML('evidence-main', renderEvidenceBlocks({
      confidence: agree.agreeLevel.toUpperCase(),
      consensus: agreementLabel,
      available,
      unavailable,
      assumptions: ['Oil type: ' + (rp.info && rp.info.oil ? rp.info.oil : 'mineral'), 'IEC 60599:2022 / IEEE C57.104-2019 thresholds']
    }));

    // ── 8. Diagnostic Methods table ──
    // Severity per row replicates the EXACT class expression already used
    // for that method's result box in ui/dashboard.js#renderMainTank, so
    // the compact table can never disagree with the detailed card below it.
    const ieeeSevCls = CONDITION_CLASS_MAP[ieee.maxCond] || 'result-attention';
    const tdcgSevCls = CONDITION_CLASS_MAP[keygas.tdcgCond] || 'result-attention';
    const doernSevCls = doern.fault === 'Indeterminate' ? 'result-attention' : 'result-warning';
    const cigreSevCls = (cigre.flags || []).some((f) => f.cls === 'crit') ? 'result-critical'
      : (cigre.flags || []).some((f) => f.cls === 'warn') ? 'result-warning'
      : (cigre.flags || []).some((f) => f.cls === 'att') ? 'result-attention' : 'result-healthy';

    const duvalCat = normalizeForConsensus(duval.zone);
    const NOT_IN_SCOPE = 'Not in Consensus Scope';
    const rows = [
      { method: 'Duval Triangle 1', diagnosis: duval.zone === 'N/A' ? 'Insufficient data' : (duval.zone + ' — ' + duval.name), sevCls: getResultClass(duval.zone), agreement: 'Primary Basis', reference: 'IEC 60599:2022', status: duval.zone === 'N/A' ? 'Insufficient Data' : 'Computed', why: duval.desc },
      { method: 'Rogers Ratio', diagnosis: rogers.name, sevCls: getResultClass(rogers.fault), agreement: normalizeForConsensus(rogers.fault) === duvalCat ? 'Agrees with Duval' : 'Differs from Duval', reference: 'Rogers Ratio Method', status: 'Computed', why: rogers.desc },
      { method: 'IEC 60599 (3-ratio)', diagnosis: iec.name, sevCls: getResultClass(iec.fault), agreement: normalizeForConsensus(iec.fault) === duvalCat ? 'Agrees with Duval' : 'Differs from Duval', reference: 'IEC 60599:2022', status: iec.fault === 'Indeterminate' ? 'Indeterminate' : 'Computed', why: iec.desc },
      { method: 'IEEE C57.104', diagnosis: ieee.condName, sevCls: ieeeSevCls, agreement: NOT_IN_SCOPE, reference: 'IEEE C57.104-2019', status: 'Computed', why: ieee.desc },
      { method: 'Key Gas', diagnosis: keygas.name, sevCls: getResultClass(keygas.fault), agreement: NOT_IN_SCOPE, reference: 'IEEE C57.104 (Key Gas)', status: 'Computed', why: keygas.desc },
      { method: 'TDCG', diagnosis: keygas.tdcgName, sevCls: tdcgSevCls, agreement: NOT_IN_SCOPE, reference: 'IEEE C57.104 (TDCG)', status: 'Computed', why: keygas.tdcgDesc },
      { method: 'Doernenburg', diagnosis: doern.name, sevCls: doernSevCls, agreement: NOT_IN_SCOPE, reference: 'Doernenburg Method', status: doern.fault === 'Indeterminate' ? 'Indeterminate' : 'Computed', why: doern.desc },
      { method: 'CIGRE 5-Key-Ratio', diagnosis: (cigre.flags || []).length + ' flag(s) evaluated', sevCls: cigreSevCls, agreement: NOT_IN_SCOPE, reference: 'CIGRE TB 771', status: 'Computed', why: (cigre.flags || []).map((f) => f.name + ': ' + (f.detail || f.verdict || '')).join(' · ') || 'No flags raised.' }
    ];
    if (o2info) {
      rows.push({ method: 'O₂ Interpretation', diagnosis: o2info.label, sevCls: o2info.cls, agreement: NOT_IN_SCOPE, reference: 'IEC 60422', status: 'Computed', why: o2info.desc });
    }
    rows.forEach((r) => { r.sevWord = sevWord(r.sevCls); });
    renderDiagnosticTable('diagnostic-table-main', rows);
  }

  // ── OLTC ─────────────────────────────────────────────────────────────

  /**
   * Populate every Engineering Workspace section for the OLTC panel.
   * @param {object} rp - the OLTC report object built in ui/dashboard.js#analyzeOltc
   *   (fields: og, taps, duval2, oltcRes, xcontam, info)
   */
  function renderOltcWorkspace(rp) {
    const { duval2, oltcRes, xcontam } = rp;

    // Existing severity expression, replicated verbatim from ui/dashboard.js#renderOltc.
    const d2SevCls = duval2.belowTypical ? 'result-healthy' : getResultClass(duval2.zone);
    const d2SevWord = sevWord(d2SevCls);
    // JUDGMENT: OLTC has no composite 0-100 score in the engine, so status
    // here is derived directly from the Duval Triangle 2 zone severity
    // (the same severity already used for the d2-zone-box color).
    const d2StatusWordMap = { 'result-healthy': 'Good', 'result-attention': 'Monitor', 'result-warning': 'Attention', 'result-critical': 'Critical' };
    const statusWord = d2StatusWordMap[d2SevCls] || 'Monitor';
    const faultLabel = duval2.belowTypical ? (duval2.zone + ' — below typical (normal)') : (duval2.zone + ' — ' + duval2.name);
    const decisionMap = { 'result-healthy': 'Continue Operation', 'result-attention': 'Increase Monitoring', 'result-warning': 'Schedule Inspection', 'result-critical': 'Immediate Investigation Required' };
    const decisionWord = decisionMap[d2SevCls] || 'Increase Monitoring';

    // ── 0. Engineering Snapshot (Task 1) ──
    setTxt('snapshot-condition-oltc', statusWord);
    setTxt('snapshot-fault-oltc', faultLabel);
    setTxt('snapshot-decision-oltc', decisionWord);
    setTxt('snapshot-confidence-oltc', 'N/A — single primary method');
    setTxt('snapshot-agreement-oltc', 'Cross-checked, not multi-method');
    setCls('snapshot-condition-oltc', 'snapshot-value sev-badge-' + d2SevCls.replace('result-', ''));

    // ── 1. Engineering Status ──
    setTxt('status-word-oltc', statusWord);
    setTxt('status-condition-oltc', d2SevWord);
    setTxt('status-summary-oltc', faultLabel + ' identified. ' + decisionWord + ' is indicated.');
    const now = new Date();
    setTxt('status-date-oltc', now.toLocaleDateString());
    setTxt('status-time-oltc', now.toLocaleTimeString());
    setCls('status-banner-oltc', 'status-banner status-' + d2SevCls.replace('result-', ''));

    // ── 2. Engineering Assessment ──
    setTxt('assess-fault-oltc', faultLabel);
    setTxt('assess-confidence-oltc', 'N/A — single primary method');
    setTxt('assess-agreement-oltc', 'Cross-checked by TGC comparison and 3 diagnostic ratios');
    setHTML('assess-why-oltc',
      '<table class="evidence-table"><tbody>' +
      '<tr><td>Duval Triangle 2</td><td>' + esc(duval2.zone) + ' — ' + esc(duval2.name) + '</td></tr>' +
      '<tr><td>TGC Comparison</td><td>' + esc(oltcRes.anyAboveTGC ? 'One or more gases above typical' : 'All gases within typical range') + '</td></tr>' +
      '</tbody></table>' +
      '<div class="why-note">OLTC diagnostics rely on Duval Triangle 2 as the primary indicator, corroborated by TGC comparison and diagnostic ratios (no multi-method consensus score exists for OLTC in the engine).</div>');

    // ── 3. Operational Decision ──
    // Consistency fix (PDF review): flags shared by the decision Reason here
    // and the Engineering Interpretation below. Pure presentation — the
    // ratio verdicts and TGC flags are unchanged engine outputs.
    const ratioConcern = (oltcRes.ratios || []).some((r) =>
      r.value !== null && r.interp && r.interp.cls && r.interp.cls !== 'badge-green');
    const elevatedEvidence = !duval2.belowTypical && (oltcRes.anyAboveTGC || ratioConcern);
    setTxt('decision-value-oltc', decisionWord);
    setTxt('decision-reason-oltc', (duval2.zone === 'N' && elevatedEvidence)
      ? 'Duval Triangle 2 indicates a normal switching pattern, but elevated gas indicators warrant a trend review at the next maintenance opportunity.'
      : firstSentence(duval2.desc));
    setTxt('assess-decision-oltc', decisionWord);

    // ── Duval Triangle 2 hero (Assessment card) ──
    setCls('hero-duval2-zone-oltc', 'result-box zs-zone ' + d2SevCls);
    setTxt('hero-duval2-zone-oltc', duval2.belowTypical ? duval2.zone + ' (below typical)' : duval2.zone);
    setTxt('hero-duval2-name-oltc', duval2.name);
    setTxt('hero-d2p-ch4-oltc', duval2.pCH4.toFixed(1) + '%');
    setTxt('hero-d2p-c2h4-oltc', duval2.pC2H4.toFixed(1) + '%');
    setTxt('hero-d2p-c2h2-oltc', duval2.pC2H2.toFixed(1) + '%');

    // ── Duval Triangle 2 legend — colour key + engineering note below the
    // hero triangle. Reads the SAME zone colours drawDuvalTriangle2() paints
    // with (see ui/charts.js's export line) and the SAME duval2.zone this
    // function already uses above; adds no new diagnostic value. ──
    if (window.TAILAM.ui.duvalLegend) {
      window.TAILAM.ui.duvalLegend.renderDuvalLegend({
        triangle: 'triangle2',
        container: 'duval-legend-oltc',
        currentZone: duval2.zone,
        highlightTargetId: 'duval-svg-oltc'
      });
    }

    // ── 4. Immediate Action Plan ──
    const basePriority = { 'result-healthy': 'LOW', 'result-attention': 'MEDIUM', 'result-warning': 'HIGH', 'result-critical': 'HIGH' }[d2SevCls] || 'MEDIUM';
    const items = [];
    sentences(duval2.desc).forEach((s) => {
      items.push({ text: s, priority: basePriority, source: 'IEC 60599:2022 (Duval Triangle 2)', icon: '📘' });
    });
    if (oltcRes.anyAboveTGC) {
      items.push({ text: 'One or more gases exceed the CIGRE TB 443 typical-gas-concentration limit for OLTCs.', priority: 'MEDIUM', source: 'CIGRE TB 443', icon: '📘' });
    }
    if (oltcRes.tapResult && !oltcRes.tapResult.ok) {
      items.push({ text: 'C₂H₂ generation of ' + oltcRes.tapResult.per1000 + ' ppm/1000 tap operations is above the typical range (≤ 15 ppm/1000 ops) — check contact wear.', priority: 'MEDIUM', source: 'CIGRE TB 443', icon: '📘' });
    }
    (xcontam || []).forEach((f) => {
      if (f.cls && f.cls !== 'ok') {
        items.push({ text: f.detail || f.title, priority: (f.cls === 'crit') ? 'HIGH' : (f.cls === 'warn' ? 'MEDIUM' : 'LOW'), source: 'IEC 60599:2022 §5.7', icon: '📘' });
      }
    });
    if (!items.length) {
      items.push({ text: 'No corrective action required at this time — continue routine sampling interval.', priority: 'LOW', source: 'Engineering Best Practice', icon: '🔧' });
    }
    renderActionPlan('action-plan-oltc', items);

    // ── 5. Transformer Health Index (OLTC condition badge + band) ──
    setTxt('oltc-condition-badge', d2SevWord);
    setCls('oltc-condition-badge', 'decision-value sev-badge-' + d2SevCls.replace('result-', ''));
    setBandActive('thi-band-oltc', statusWord);
    setHTML('thi-why-oltc',
      '<div class="why-row-item"><strong>Duval Triangle 2 Zone:</strong> ' + esc(duval2.zone) + ' — ' + esc(duval2.name) + '</div>' +
      '<div class="why-row-item"><strong>TGC Status:</strong> ' + esc(oltcRes.anyAboveTGC ? 'Above typical for one or more gases' : 'Within typical range') + '</div>' +
      '<div class="why-row-item"><strong>Tap-Change Result:</strong> ' + esc(oltcRes.tapResult ? (oltcRes.tapResult.per1000 + ' ppm C₂H₂ / 1000 ops — ' + (oltcRes.tapResult.ok ? 'within typical range' : 'above typical range')) : 'Not assessed (tap count not entered).') + '</div>');

    // ── 6. Engineering Interpretation (Task 8) — professional, passive,
    // approved phrase bank, capped at 120 words.
    // Consistency fix (PDF review): the conclusion sentence must not
    // contradict the evidence sentences. Previously a Zone-N result always
    // ended with "This is the normal gas pattern…" even when the very
    // previous sentence reported gases EXCEEDING the CIGRE TB 443 limits or
    // when supporting ratios flagged elevated arcing/thermal activity. The
    // zone, TGC flags and ratio verdicts are unchanged engine outputs —
    // only how the narrative combines them is fixed here (flags computed
    // in section 3 above, shared with the decision Reason).
    const interpEvidence =
      (duval2.belowTypical ? 'Gas concentrations remain below typical values, consistent with an early pattern rather than an active fault. ' : 'Gas generation pattern is characteristic of this classification. ')
      + (oltcRes.anyAboveTGC ? 'Evidence supports one or more gases exceeding the CIGRE TB 443 typical concentration limits for this OLTC design. ' : 'All gases remain consistent with CIGRE TB 443 typical concentration limits. ')
      + (ratioConcern && !duval2.belowTypical ? 'Supporting diagnostic ratios indicate elevated arcing or thermal activity relative to typical switching duty. ' : '');
    const interpConclusion = (duval2.zone === 'N' && elevatedEvidence)
      ? 'The switching pattern is consistent with normal tap-changer operation; however, the elevated indicators above warrant a repeat sample and trend review at the next maintenance opportunity.'
      : firstSentence(duval2.desc);
    const interp = 'The analysis identifies ' + duval2.name + ' (Duval Triangle 2, Zone ' + duval2.zone + ') as the primary indicator. '
      + interpEvidence + interpConclusion;
    setTxt('interpretation-oltc', capWords(interp, 120));

    // ── 7. Supporting Evidence (Task 6) — compact blocks ──
    const oltcAvailable = ['Duval Triangle 2', 'TGC Comparison', 'Diagnostic Ratios'];
    if (oltcRes.tapResult) oltcAvailable.push('Tap-Change Rate');
    const oltcUnavailable = oltcRes.tapResult ? [] : ['Tap-Change Rate (tap count not entered)'];
    setHTML('evidence-oltc', renderEvidenceBlocks({
      confidence: 'N/A — SINGLE METHOD',
      consensus: 'Single primary method, cross-checked by TGC and ratio analysis',
      available: oltcAvailable,
      unavailable: oltcUnavailable,
      assumptions: ['TGC limits: CIGRE TB 443 (90th percentile)', 'Zone geometry: IEC 60599:2022 Fig. B.4']
    }));

    // ── 8. Diagnostic Methods table ──
    const rows = [
      { method: 'Duval Triangle 2', diagnosis: duval2.belowTypical ? (duval2.zone + ' (below typical)') : (duval2.zone + ' — ' + duval2.name), sevCls: d2SevCls, agreement: 'Primary Basis', reference: 'IEC 60599:2022', status: 'Computed', why: duval2.desc },
      { method: 'TGC Comparison', diagnosis: oltcRes.anyAboveTGC ? 'One or more gases above typical' : 'All gases within typical range', sevCls: oltcRes.anyAboveTGC ? 'result-warning' : 'result-healthy', agreement: 'Corroborating', reference: 'CIGRE TB 443', status: 'Computed', why: 'Compares each measured gas against the CIGRE TB 443 90th-percentile typical concentration for OLTC compartments.' }
    ];
    (oltcRes.ratios || []).forEach((r) => {
      const rSev = { 'badge-green': 'result-healthy', 'badge-yellow': 'result-attention', 'badge-orange': 'result-warning', 'badge-red': 'result-critical' }[r.interp.cls] || 'result-attention';
      rows.push({ method: r.name + ' (' + r.formula + ')', diagnosis: r.interp.label, sevCls: rSev, agreement: 'Corroborating', reference: 'CIGRE TB 443', status: r.value === null ? 'Not Applicable' : 'Computed', why: 'Threshold: ' + r.threshold + '. Value: ' + (r.value !== null ? r.value.toFixed(3) : 'N/A') + '.' });
    });
    if (oltcRes.tapResult) {
      rows.push({ method: 'Tap-Change Rate (C₂H₂/1000 ops)', diagnosis: oltcRes.tapResult.ok ? 'Within expected range' : 'Above expected range', sevCls: oltcRes.tapResult.ok ? 'result-healthy' : 'result-warning', agreement: 'Corroborating', reference: 'CIGRE TB 443', status: 'Computed', why: oltcRes.tapResult.per1000 + ' ppm C₂H₂ per 1000 tap operations (threshold ≤ 15 ppm/1000 ops).' });
    }
    if (xcontam && xcontam.length) {
      const xcSev = xcontam.some((f) => f.cls === 'crit') ? 'result-critical'
        : xcontam.some((f) => f.cls === 'warn') ? 'result-warning'
        : xcontam.some((f) => f.cls === 'att') ? 'result-attention' : 'result-healthy';
      rows.push({ method: 'Cross-Contamination', diagnosis: xcontam.length + ' finding(s) evaluated', sevCls: xcSev, agreement: 'Corroborating', reference: 'IEC 60599:2022 §5.7', status: 'Computed', why: xcontam.map((f) => f.title + ': ' + f.detail).join(' · ') });
    }
    rows.forEach((r) => { r.sevWord = sevWord(r.sevCls); });
    renderDiagnosticTable('diagnostic-table-oltc', rows);
  }

  // ── Duval Triangle detail modal ─────────────────────────────────────
  // Interaction only: re-invokes the SAME unchanged drawDuvalTriangle /
  // drawDuvalTriangle2 functions against a second canvas and displays text
  // already computed elsewhere in this file (duval.desc, duval.name, gas
  // percentages). No new diagnostic, threshold or calculation is added.
  // window.TAILAM.ui.dashboard / window.TAILAM.ui.charts are read lazily
  // (inside the function body, not at IIFE top) because this file loads
  // before ui/dashboard.js in index.html's script order.

  /**
   * Open the Duval Triangle detail modal for the given panel.
   * @param {'main'|'oltc'} which
   */
  function openDuvalModal(which) {
    const dashboard = window.TAILAM.ui.dashboard;
    const charts = window.TAILAM.ui.charts;
    if (!dashboard || !charts) return;

    if (which === 'main') {
      const mt = dashboard.getMtReport();
      if (!mt) return;
      const duval = mt.duval;
      setTxt('duval-modal-title', 'Duval Triangle 1 — Main Tank');
      setTxt('duval-modal-subtitle', 'IEC 60599:2022 — CH₄ / C₂H₄ / C₂H₂');
      window.TAILAM.ui.duvalSvg.render({ container:'duval-svg-modal', triangle:'triangle1', marker:duval });
      setTxt('duval-modal-point', duval.total
        ? ('Zone ' + duval.zone + ' — CH₄ ' + duval.pCH4.toFixed(1) + '% · C₂H₄ ' + duval.pC2H4.toFixed(1) + '% · C₂H₂ ' + duval.pC2H2.toFixed(1) + '%')
        : 'No point plotted — insufficient gas data.');
      setTxt('duval-modal-explanation', duval.desc);
      setTxt('duval-modal-reference', 'IEC 60599:2022 — Figure B.3 (Duval Triangle 1)');
      setTxt('duval-modal-characteristics', duval.name);
      setTxt('duval-modal-notes', mt.rec);
      if (window.TAILAM.ui.duvalLegend) {
        window.TAILAM.ui.duvalLegend.renderDuvalLegend({
          triangle: 'triangle1',
          container: 'duval-legend-modal',
          currentZone: duval.zone,
          highlightTargetId: 'duval-svg-modal'
        });
      }
    } else {
      const ot = dashboard.getOtReport();
      if (!ot) return;
      const duval2 = ot.duval2;
      setTxt('duval-modal-title', 'Duval Triangle 2 — OLTC');
      setTxt('duval-modal-subtitle', 'IEC 60599:2022 Fig. B.4 — CH₄ / C₂H₄ / C₂H₂');
      window.TAILAM.ui.duvalSvg.render({ container:'duval-svg-modal', triangle:'triangle2', marker:duval2 });
      setTxt('duval-modal-point', 'Zone ' + duval2.zone + ' — CH₄ ' + duval2.pCH4.toFixed(1) + '% · C₂H₄ ' + duval2.pC2H4.toFixed(1) + '% · C₂H₂ ' + duval2.pC2H2.toFixed(1) + '%');
      setTxt('duval-modal-explanation', duval2.desc);
      setTxt('duval-modal-reference', 'IEC 60599:2022 — Figure B.4 (Duval Triangle 2, OLTC)');
      setTxt('duval-modal-characteristics', duval2.name);
      setTxt('duval-modal-notes', duval2.belowTypical
        ? 'All gas concentrations remain below typical values — this zone is an early pattern, not yet an active fault. Continue normal sampling and watch the trend.'
        : duval2.desc);
      if (window.TAILAM.ui.duvalLegend) {
        window.TAILAM.ui.duvalLegend.renderDuvalLegend({
          triangle: 'triangle2',
          container: 'duval-legend-modal',
          currentZone: duval2.zone,
          highlightTargetId: 'duval-svg-modal'
        });
      }
    }
    const overlay = document.getElementById('modal-duval');
    if (overlay) overlay.style.display = 'flex';
  }

  /** Close the Duval Triangle detail modal. */
  function closeDuvalModal() {
    const overlay = document.getElementById('modal-duval');
    if (overlay) overlay.style.display = 'none';
    // Bug fix — opening/closing the modal (backdrop-filter blur) forces a
    // recomposite that can drop a <canvas> bitmap in some browsers (same
    // root cause as the visibilitychange/pageshow redraws in dashboard.js).
    // The Duval triangles are SVG now and aren't affected; this call is only
    // still meaningful for the risk-gauge canvas — from the SAME
    // already-computed report object, nothing is recomputed.
    const dashboard = window.TAILAM.ui.dashboard;
    if (dashboard && dashboard.redrawVisibleCanvases) {
      requestAnimationFrame(() => dashboard.redrawVisibleCanvases());
    }
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.workspace = { renderMainWorkspace, renderOltcWorkspace, openDuvalModal, closeDuvalModal };
})();
