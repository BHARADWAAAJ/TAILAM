/**
 * TAILAM — ui/export.js
 * Report exports — 100% client-side and strictly separated per analysis:
 *   exportPDF('main'|'oltc')    → professional print-ready engineering report
 *                                 (only that analysis)
 *   exportExcelX('main'|'oltc') → styled .xlsx via ExcelJS with the Duval
 *                                 triangle PNG embedded
 *   exportCSV('main'|'oltc')    → plain CSV fallback when ExcelJS is absent
 *
 * Plain script — publishes on window.TAILAM.ui.export.
 * Depends on window.TAILAM.utils.*, window.TAILAM.engine.thi,
 * window.TAILAM.theme, window.TAILAM.ui.charts, window.TAILAM.ui.dashboard,
 * window.TAILAM.ui.dialogs (load those first).
 *
 * PDF report sprint note: exportPDF() below reads two kinds of data —
 * (a) the report object (rp) that ui/dashboard.js already computed, exactly
 * as exportExcelX() does, and (b) the ALREADY-RENDERED text of the live
 * Engineering Workspace DOM (populated by ui/workspace.js before export can
 * ever be clicked). Reading (b) rather than re-deriving Snapshot/Status/
 * Assessment/Action-Plan/Interpretation text a second time means the PDF can
 * never drift out of sync with what the engineer is looking at on screen,
 * and this file never needs to duplicate ui/workspace.js's JUDGMENT-documented
 * presentation logic. No engineering value is computed in this file — every
 * number ultimately traces back to engine/* via rp or the workspace DOM.
 */
(function () {
  'use strict';

  const { esc, GAS_LABELS } = window.TAILAM.utils.helpers;
  const { readTransformerInfo } = window.TAILAM.utils.validators;
  const { healthCategoryFor } = window.TAILAM.engine.thi;
  const { setForceLightCanvas } = window.TAILAM.theme;
  // Redesign sprint — drawRiskGauge added so the PDF's Transformer Health
  // Index section can embed the SAME already-implemented risk gauge the
  // Engineering Workspace already draws (charts.js#drawRiskGauge, called
  // exactly as ui/dashboard.js already calls it). No gauge/scale/threshold
  // logic is added or duplicated — this only lets export.js reuse it.
  const { drawDuvalTriangle, drawDuvalTriangle2, drawRiskGauge } = window.TAILAM.ui.charts;
  const { getMtReport, getOtReport, markMainExported, markOltcExported } = window.TAILAM.ui.dashboard;
  const { notify } = window.TAILAM.ui.dialogs;

  /** Version metadata embedded in every PDF report (Task 14). Mirrors VERSION.json. */
  const REPORT_META = { product: 'TAILAM', version: '1.0.0', edition: 'Community Edition', build: '2026.07' };

  /**
   * Re-render a triangle in light colors (readable on white), capture it as a
   * PNG data-URL, then restore the on-screen themed rendering.
   * @param {string} canvasId @param {Function} redraw
   * @returns {string} PNG data URL
   */
  function canvasPngLight(canvasId, redraw) {
    setForceLightCanvas(true);
    try { redraw(); return document.getElementById(canvasId).toDataURL('image/png'); }
    finally { setForceLightCanvas(false); redraw(); }
  }

  // ── PDF-only helpers (do not affect Excel/CSV export below) ────────────

  /** Trimmed textContent of a DOM element by id, or '' if missing/empty. */
  function domText(id) {
    const el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  }

  /**
   * Text of an action-item meta span (`.action-source` / `.action-time`)
   * with its leading `.action-meta-label` stripped out, so "SourceIEC 60599…"
   * becomes "IEC 60599…". Works on a detached clone — never touches the live DOM.
   * @param {Element} el
   * @returns {string}
   */
  function metaValue(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    const label = clone.querySelector('.action-meta-label');
    if (label) label.remove();
    return clone.textContent.trim();
  }

  /**
   * Read the already-rendered Immediate Action Plan card
   * (ui/workspace.js#renderActionPlan output) into plain row objects.
   * @param {string} containerId - 'action-plan-main' | 'action-plan-oltc'
   * @returns {Array<{priority:string, text:string, source:string, time:string}>}
   */
  function extractActionPlan(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.action-item')).map((item) => ({
      priority: domTextOf(item, '.action-priority'),
      text: domTextOf(item, '.action-text'),
      source: metaValue(item.querySelector('.action-source')),
      time: metaValue(item.querySelector('.action-time'))
    }));
  }

  /** textContent of the first `selector` match inside `el`, trimmed. */
  function domTextOf(el, selector) {
    const found = el.querySelector(selector);
    return found ? found.textContent.trim() : '';
  }

  /**
   * Read the already-rendered Diagnostic Methods table
   * (ui/workspace.js#renderDiagnosticTable output) into plain row objects.
   * Skips the collapsible "Why?" detail rows and the Severity column. The
   * PDF's Diagnostic Methods table (buildDiagnosticTable()) renders Method /
   * Role / Diagnosis / Agreement / Reference — Status is still read into
   * `status` here (harmless) but no longer rendered as of the final polish
   * sprint, since every row read the same uninformative "Computed" text.
   * @param {string} tbodyId - 'diagnostic-table-main' | 'diagnostic-table-oltc'
   * @returns {Array<{method:string, role:string, diagnosis:string, agreement:string, reference:string, status:string}>}
   */
  function extractDiagnosticRows(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll('tr')).filter((tr) => !tr.classList.contains('why-row')).map((tr) => {
      const cells = tr.querySelectorAll('td');
      return {
        method: cells[0] ? cells[0].textContent.trim() : '',
        role: cells[1] ? cells[1].textContent.trim() : '',
        diagnosis: cells[2] ? cells[2].textContent.trim() : '',
        agreement: cells[4] ? cells[4].textContent.trim() : '',
        reference: cells[5] ? cells[5].textContent.trim() : '',
        status: cells[6] ? cells[6].textContent.trim() : ''
      };
    });
  }

  /**
   * Render one Duval Triangle at high resolution on a temporary, off-screen
   * canvas (never inserted into the visible page), in light theme colors for
   * a white print background, and return it as a PNG data URL. Uses the
   * SAME unmodified draw function the on-screen canvas uses — no chart
   * geometry, color, or threshold logic is duplicated or altered.
   * @param {string} sourceCanvasId - the on-screen canvas to match aspect ratio with
   * @param {Function} drawFn - (canvasId, data) => void — drawDuvalTriangle or drawDuvalTriangle2
   * @param {*} data - the marker/gas object drawFn expects
   * @param {number} [scale=3] - resolution multiplier over the on-screen canvas
   * @returns {string} PNG data URL
   */
  function hiResDuvalPng(sourceCanvasId, drawFn, data, scale) {
    scale = scale || 3;
    const source = document.getElementById(sourceCanvasId);
    const w = (source ? source.width : 520) * scale;
    const h = (source ? source.height : 480) * scale;
    const tempId = 'pdf-hires-' + sourceCanvasId + '-' + Date.now();
    const temp = document.createElement('canvas');
    temp.id = tempId;
    temp.width = w;
    temp.height = h;
    // Positioned off-screen (not display:none — some browsers skip layout/
    // rendering for display:none canvases) so it never becomes visible and
    // never affects the live workspace layout.
    temp.style.position = 'fixed';
    temp.style.left = '-99999px';
    temp.style.top = '0';
    document.body.appendChild(temp);
    try {
      return canvasPngLight(tempId, () => drawFn(tempId, data));
    } finally {
      document.body.removeChild(temp);
    }
  }

  /** Generate a report reference number (not a database id — no backend exists). */
  function buildReportNumber(isOLTC) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `TAILAM-${isOLTC ? 'OT' : 'MT'}-${stamp}`;
  }

  /** One Transformer Information cell, or '' if the value is empty (Task 3 — hide empty fields). */
  function infoCell(label, value) {
    const v = (value == null ? '' : String(value)).trim();
    if (!v || v === '—') return '';
    return `<div class="info-cell"><span class="info-label">${esc(label)}</span><span class="info-value">${esc(v)}</span></div>`;
  }

  /** One Report Information row (always shown — these fields are never user-optional). */
  function metaRow(label, value) {
    return `<div class="meta-cell"><span class="meta-label">${esc(label)}</span><span class="meta-value">${esc(value)}</span></div>`;
  }

  /**
   * Compaction sprint — which of the 5 standards TAILAM implements actually
   * apply to a given analysis, hoisted to its own function (previously
   * inlined only inside buildReferences) so the ⑫ Engineering References
   * list and the merged Final Recommendation card's "Applicable Standards"
   * field read from exactly the same filtering rule instead of two copies
   * of it. Names/descriptions unchanged from the original References list.
   * @param {boolean} isOLTC
   * @param {boolean} hasO2 - whether IEC 60422 (dissolved-O₂) actually ran
   * @returns {Array<{name:string, desc:string}>}
   */
  function applicableStandards(isOLTC, hasO2) {
    const ALL = [
      { name: 'IEC 60599', desc: 'Mineral oil-filled electrical equipment — interpretation of dissolved gases.', used: true },
      { name: 'IEEE C57.104', desc: 'Guide for gases generated in transformer oil.', used: !isOLTC },
      { name: 'IEC 60567', desc: 'Oil sampling and gas analysis.', used: true },
      { name: 'IEC 60422', desc: 'Mineral insulating oil supervision.', used: !isOLTC && hasO2 },
      { name: 'CIGRE TB 771', desc: 'Transformer condition assessment.', used: true }
    ];
    return ALL.filter((r) => r.used);
  }

  /**
   * Engineering References list (Task 9). Descriptions match the Engineering
   * Workspace's own References section verbatim (src/js/... does not own
   * this text — it lives in index.html — reproduced here only, not altered
   * there). Now sourced from applicableStandards() above.
   * @param {boolean} isOLTC
   * @param {boolean} hasO2 - whether IEC 60422 (dissolved-O₂) actually ran
   */
  function buildReferences(isOLTC, hasO2) {
    const rows = applicableStandards(isOLTC, hasO2).map((r) =>
      `<li><span class="ref-name">${esc(r.name)}</span><span class="ref-desc">${esc(r.desc)}</span></li>`
    ).join('');
    return rows || '<li><span class="ref-desc">No supporting standards reference applies to this analysis.</span></li>';
  }

  /**
   * Compaction sprint — comma-joined standard names for the merged Final
   * Recommendation card's "Applicable Standards" field. Reuses
   * applicableStandards() so the card can never list a standard the
   * References section itself doesn't also list.
   * @param {boolean} isOLTC
   * @param {boolean} hasO2
   * @returns {string}
   */
  function standardsSummary(isOLTC, hasO2) {
    const names = applicableStandards(isOLTC, hasO2).map((r) => r.name);
    return names.length ? names.join(', ') : '—';
  }

  /**
   * PDF polish sprint — condense the Immediate Action Plan to at most
   * `maxItems` rows. Presentation only: no priority, text, source or time is
   * altered, computed, or reworded.
   *  - Duplicates: rows whose recommendation text is identical once trimmed
   *    and lower-cased are the same engineering meaning restated (e.g. the
   *    same sentence surfacing from more than one method) — only the first
   *    occurrence is kept; nothing is merged into a new hybrid sentence.
   *  - Sort: re-asserts HIGH → MEDIUM → LOW. The DOM this was extracted from
   *    is already sorted this way by ui/workspace.js#renderActionPlan, so
   *    this is a defensive guarantee, not a new rule.
   *  - Cap: keeps only the top `maxItems` after dedup + sort — the highest-
   *    priority actions, never an arbitrary subset.
   * @param {Array<{priority:string,text:string,source:string,time:string}>} rows
   * @param {number} [maxItems=5]
   * @returns {Array}
   */
  function condenseActionRows(rows, maxItems) {
    maxItems = maxItems || 5;
    const PRIORITY_ORDER_PDF = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const seen = new Set();
    const deduped = [];
    rows.forEach((r) => {
      const key = (r.text || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(r);
    });
    const sorted = deduped.slice().sort((a, b) =>
      (PRIORITY_ORDER_PDF[(a.priority || '').toUpperCase()] ?? 1) - (PRIORITY_ORDER_PDF[(b.priority || '').toUpperCase()] ?? 1));
    return sorted.slice(0, maxItems);
  }

  /**
   * Build the Immediate Action Plan HTML table from extracted (and, per the
   * final polish sprint, already-condensed via condenseActionRows()) rows.
   * Sort order matches ui/workspace.js#renderActionPlan (HIGH → MEDIUM → LOW),
   * inherited automatically since the input is already sorted that way.
   */
  function buildActionPlanTable(rows) {
    if (!rows.length) {
      return '<p class="empty-note">No immediate actions — continue routine monitoring.</p>';
    }
    // Redesign sprint — column order changed to Priority / Recommendation /
    // Expected Time / Reference (Recommendation widest, per spec) and the
    // "Engineering Source" header relabelled "Reference"; the underlying
    // value in every cell is unchanged (r.priority/r.text/r.time/r.source).
    const body = rows.map((r) =>
      `<tr><td><span class="priority-tag priority-${esc(r.priority.toLowerCase())}">${esc(r.priority)}</span></td>` +
      `<td>${esc(r.text)}</td><td>${esc(r.time)}</td><td>${esc(r.source)}</td></tr>`
    ).join('');
    return `<table class="report-table action-table"><colgroup><col class="col-priority"><col class="col-recommendation"><col class="col-time"><col class="col-reference"></colgroup><thead><tr><th>Priority</th><th>Recommendation</th><th>Expected Time</th><th>Reference</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  /**
   * Build the Diagnostic Methods HTML table from extracted rows. Rows whose
   * scraped Role text is the workspace's own "Primary Diagnostic" tag
   * (ui/workspace.js#roleFor) get a distinguishing class — tinted
   * background, left border, bold — everything else is styled as a
   * Supporting Method (with alternating shading — polish sprint). This is a
   * pure CSS/markup distinction of data the engine already produced; it
   * does not change any row's method, diagnosis, or classification.
   * Final polish sprint: the Status column (every row read "Computed", no
   * information carried) is no longer rendered — see extractDiagnosticRows()
   * for where that field is still read (harmlessly unused) and the .col-*
   * width comments below for how its space was redistributed.
   */
  function buildDiagnosticTable(rows) {
    if (!rows.length) return '<p class="empty-note">No diagnostic method data available.</p>';
    // Polish sprint — Status column removed (every row read "Computed"; no
    // information carried). Freed width redistributed to Diagnosis and
    // Agreement (see .diagnostic-table-pdf col widths in <style> below).
    // Supporting rows alternate shading for readability; the Primary
    // Diagnostic row keeps its own distinct tinted/bordered treatment.
    const body = rows.map((r, i) => {
      const isPrimary = /Primary/i.test(r.role);
      const altCls = (!isPrimary && i % 2 === 1) ? ' diag-row-alt' : '';
      return `<tr class="${isPrimary ? 'diag-row-primary' : 'diag-row-supporting'}${altCls}"><td>${esc(r.method)}</td><td>${esc(r.role)}</td><td>${esc(r.diagnosis)}</td>` +
        `<td>${esc(r.agreement)}</td><td>${esc(r.reference)}</td></tr>`;
    }).join('');
    return `<table class="report-table diagnostic-table-pdf"><colgroup><col class="col-method"><col class="col-role"><col class="col-diagnosis"><col class="col-agreement"><col class="col-reference"></colgroup><thead><tr><th>Method</th><th>Role</th><th>Diagnosis</th><th>Agreement</th><th>Reference</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  /**
   * Split the already-composed Engineering Interpretation text (built once
   * by ui/workspace.js from the approved phrase bank, capped at 120 words)
   * into Summary / Evidence / Engineering Conclusion groups, using ONLY the
   * sentence boundaries already present in that text. No word is added,
   * removed, or reworded — this is a readability regrouping of the exact
   * same sentences, not a rewrite. Falls back to a single Summary block if
   * the text doesn't contain enough sentence breaks to split meaningfully
   * (e.g. very short interpretations).
   * @param {string} text
   * @returns {{summary:string, evidence:string[], conclusion:string}}
   */
  function splitInterpretation(text) {
    const raw = (text || '').trim();
    // Split on ". " (period + space) while keeping the period on each piece;
    // also treat a trailing "…" (capWords' truncation marker) as its own
    // final sentence rather than losing it.
    const parts = raw.split(/(?<=[.…])\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) return { summary: raw, evidence: [], conclusion: '' };
    return {
      summary: parts[0],
      evidence: parts.slice(1, parts.length - 1),
      conclusion: parts[parts.length - 1]
    };
  }

  /**
   * Build the structured Engineering Interpretation block (Task 5 of the PDF
   * polish sprint) — Summary / Evidence / Engineering Conclusion — from the
   * same interpretation text exportPDF has always read from the live
   * workspace DOM. Meaning is unchanged; only the visual grouping is new.
   * @param {string} text
   */
  function buildInterpretationHTML(text) {
    const { summary, evidence, conclusion } = splitInterpretation(text);
    if (!evidence.length && !conclusion) {
      return `<div class="interp-block"><h3 class="interp-label">Summary</h3><p class="interpretation-pdf">${esc(summary)}</p></div>`;
    }
    const evidenceHTML = evidence.length
      ? `<div class="interp-block"><h3 class="interp-label">Evidence</h3><p class="interpretation-pdf">${esc(evidence.join(' '))}</p></div>`
      : '';
    const conclusionHTML = conclusion
      ? `<div class="interp-block"><h3 class="interp-label">Engineering Conclusion</h3><p class="interpretation-pdf">${esc(conclusion)}</p></div>`
      : '';
    return `<div class="interp-block"><h3 class="interp-label">Summary</h3><p class="interpretation-pdf">${esc(summary)}</p></div>${evidenceHTML}${conclusionHTML}`;
  }

  /**
   * Build the PDF's static Duval Triangle legend markup — mandatory in every
   * report per the legend sprint — from the SAME shared zone metadata
   * window.TAILAM.ui.duvalLegend already exposes to the Engineering
   * Workspace hero and the Duval detail modal (see ui/duval-legend.js).
   * Colours, zone names and descriptions are never re-defined here, only
   * laid out for print; a missing legend module degrades to '' rather than
   * throwing, so a report can never fail to generate because of this.
   * @param {'triangle1'|'triangle2'} triangleKey
   * @param {?string} currentZone - current diagnosed zone, colours the Current Sample swatch
   * @returns {string} HTML
   */
  function buildDuvalLegendHTML(triangleKey, currentZone) {
    const legendApi = window.TAILAM.ui.duvalLegend;
    if (!legendApi) return '';
    const data = legendApi.getLegendData(triangleKey, currentZone);
    if (!data) return '';
    // Inline SVG fills, not a CSS background-color — a printed page can
    // (and by default in several browsers, does) omit CSS background
    // colours; an SVG <rect>/<circle> fill has no such print opt-out, so
    // the legend colours are guaranteed to appear on paper every time.
    const rows = data.zones.map((z) =>
      `<div class="pdf-legend-item"><svg class="pdf-legend-swatch" width="11" height="11" viewBox="0 0 11 11"><rect x="0.5" y="0.5" width="10" height="10" rx="2" fill="${z.color}" stroke="rgba(0,0,0,0.25)" stroke-width="1"/></svg>` +
      `<span class="pdf-legend-text"><strong>${esc(z.id)}</strong> ${esc(z.label)}</span></div>`
    ).join('');
    const sample = `<div class="pdf-legend-item"><svg class="pdf-legend-marker" width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="5" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="1"/><circle cx="5.5" cy="5.5" r="3.5" fill="${data.currentSample.color}" stroke="#fff" stroke-width="1"/></svg>` +
      `<span class="pdf-legend-text"><strong>●</strong> ${esc(data.currentSample.label)}</span></div>`;
    return `<div class="pdf-legend">` +
      `<div class="pdf-legend-grid">${rows}${sample}</div>` +
      `<div class="pdf-legend-note"><strong>Engineering Note:</strong> The Duval Triangle is an internationally recognised diagnostic method defined in IEC 60599. The coloured regions represent fault classifications based on the relative percentages of CH₄, C₂H₄ and C₂H₂ dissolved gases. The highlighted point indicates the current analysed transformer oil sample.</div>` +
      `</div>`;
  }

  /**
   * Redesign sprint — Executive Engineering Summary: the SAME already-
   * composed Engineering Interpretation text ui/workspace.js built from its
   * approved phrase bank (already capped at 120 words), capped further here
   * to at most 5 sentences using the identical sentence-boundary regex
   * splitInterpretation() already uses. No sentence is added, removed from
   * the source text, or reworded — this only decides how many of the
   * already-written sentences appear in the page-1 executive summary card;
   * the full text still appears in full later, in the Engineering
   * Interpretation section.
   * @param {string} text
   * @returns {string} HTML
   */
  function buildExecutiveSummaryHTML(text) {
    const raw = (text || '').trim();
    if (!raw) return '<p class="exec-summary-pdf empty-note">No interpretation available.</p>';
    const parts = raw.split(/(?<=[.…])\s+/).map((s) => s.trim()).filter(Boolean);
    return `<p class="exec-summary-pdf">${esc(parts.slice(0, 5).join(' '))}</p>`;
  }

  /**
   * Redesign sprint — read the already-rendered THI horizontal health band
   * (ui/workspace.js#setBandActive output: 5 fixed segments, one already
   * marked .active) so the PDF can show the same band instead of a bare
   * score. No new band, threshold or segment is introduced; this is a
   * read-only copy of DOM state that already exists on screen.
   * @param {string} bandId - 'thi-band-main' | 'thi-band-oltc'
   * @returns {string} HTML, or '' if the band isn't present
   */
  function buildBandHTML(bandId) {
    const track = document.getElementById(bandId);
    if (!track) return '';
    const segs = Array.from(track.querySelectorAll('.thi-band-seg'));
    if (!segs.length) return '';
    const cells = segs.map((s) =>
      `<div class="thi-band-seg-pdf${s.classList.contains('active') ? ' active' : ''}">${esc(s.getAttribute('data-band') || s.textContent.trim())}</div>`
    ).join('');
    return `<div class="thi-band-pdf">${cells}</div>`;
  }

  /**
   * Redesign sprint — Supporting Evidence section. Clones the already-
   * rendered evidence-blocks markup ui/workspace.js#renderEvidenceBlocks
   * built for the on-screen Engineering Workspace (same DOM-read principle
   * every other PDF section already uses — see domText()/extractActionPlan()
   * above). No evidence value is recomputed; matching PDF-scale CSS for the
   * same .evidence-block* classes is defined in the report's <style> block.
   * @param {string} containerId - 'evidence-main' | 'evidence-oltc'
   * @returns {string} HTML
   */
  function buildEvidenceHTML(containerId) {
    const el = document.getElementById(containerId);
    const inner = el ? el.innerHTML.trim() : '';
    return inner ? `<div class="evidence-pdf-wrap">${inner}</div>` : '<p class="empty-note">No supporting evidence available.</p>';
  }

  /**
   * PDF polish sprint — Engineering Assessment section, moved onto Page 1
   * per this sprint's requested flow. Clones the already-rendered method/
   * zone breakdown table (ui/workspace.js#renderMainWorkspace /
   * renderOltcWorkspace write this into #assess-why-main / #assess-why-oltc:
   * each primary method's zone/classification plus the Consensus/Confidence
   * note) — same DOM-read principle as buildEvidenceHTML() above. No value
   * is recomputed here.
   * @param {string} containerId - 'assess-why-main' | 'assess-why-oltc'
   * @returns {string} HTML
   */
  function buildAssessmentHTML(containerId) {
    const el = document.getElementById(containerId);
    const inner = el ? el.innerHTML.trim() : '';
    return inner ? `<div class="assessment-pdf-wrap">${inner}</div>` : '<p class="empty-note">No assessment evidence available.</p>';
  }

  /**
   * Compaction sprint — Final Engineering Recommendation. Previously its own
   * dedicated page-⑫ section; now a highlighted card merged directly under
   * ⑩ Engineering Interpretation per this sprint's explicit instruction not
   * to give one recommendation an entire page. Every field is a reuse of a
   * value some other part of the report already computed — nothing new is
   * authored here:
   *   Recommended Action / Reason → decision-value-ID / decision-reason-ID
   *     (the same Operational Decision text already shown on screen and in the
   *     ③ Engineering Snapshot card).
   *   Priority                    → the top row of the SAME already
   *     HIGH→MEDIUM→LOW-sorted Immediate Action Plan table shown in ⑦;
   *     omitted (no badge) rather than invented if the plan is empty.
   *   Expected Outcome            → the Engineering Conclusion sentence
   *     splitInterpretation() already isolates from the same interpretation
   *     text used in ⑩ — the last sentence, not new wording.
   *   Applicable Standards        → standardsSummary(), the exact same
   *     standards list shown in ⑫ Engineering References.
   * @param {string} idSuffix - 'main' | 'oltc'
   * @param {string} topPriority - top Action Plan row's priority, or ''
   * @param {string} expectedOutcome - Engineering Conclusion sentence, or ''
   * @param {string} standardsText - comma-joined applicable standards
   * @returns {string} HTML
   */
  function buildFinalRecommendationHTML(idSuffix, topPriority, expectedOutcome, standardsText) {
    const decision = domText('decision-value-' + idSuffix) || '—';
    const reason = domText('decision-reason-' + idSuffix) || '—';
    const priorityBadge = topPriority
      ? `<span class="priority-tag priority-${esc(topPriority.toLowerCase())}">${esc(topPriority)}</span>`
      : '';
    return `<div class="final-rec-pdf">
      <div class="final-rec-head">
        <span class="final-rec-label">Final Engineering Recommendation</span>
        ${priorityBadge}
      </div>
      <div class="final-rec-decision">${esc(decision)}</div>
      <div class="final-rec-grid">
        <div class="final-rec-field"><span class="final-rec-field-label">Reason</span><span class="final-rec-field-value">${esc(reason)}</span></div>
        <div class="final-rec-field"><span class="final-rec-field-label">Expected Outcome</span><span class="final-rec-field-value">${esc(expectedOutcome || '—')}</span></div>
        <div class="final-rec-field"><span class="final-rec-field-label">Applicable Standards</span><span class="final-rec-field-value">${esc(standardsText || '—')}</span></div>
      </div>
    </div>`;
  }

  /**
   * Open a professional, print-ready engineering report window for ONE
   * analysis type. Presentation only — every value comes from the already-
   * computed report object or the already-rendered Engineering Workspace;
   * no engineering calculation is performed in this function.
   * @param {'main'|'oltc'} type
   */
  function exportPDF(type) {
    // Completely separate reports: 'main' prints ONLY the main tank analysis,
    // 'oltc' prints ONLY the OLTC analysis.
    const isOLTC = type === 'oltc';
    const mtReport = getMtReport(), otReport = getOtReport();
    const rp = isOLTC ? otReport : mtReport;
    if (!rp) { notify(isOLTC ? 'Run the OLTC analysis first.' : 'Run the main tank analysis first.'); return; }
    const info = rp.info || readTransformerInfo();

    const idSuffix = isOLTC ? 'oltc' : 'main';
    const now = new Date();
    const reportNumber = buildReportNumber(isOLTC);
    const moduleLabel = isOLTC ? 'OLTC Analysis' : 'Main Tank Analysis';
    const hasO2 = !!(!isOLTC && rp.o2info);

    // ── Document Information — final polish sprint: moved off Page 1
    // entirely (administrative metadata must never interrupt the
    // engineering flow) and placed as a compact card near the end of the
    // report, after Engineering References and before the Disclaimer/
    // footer (see .doc-info-strip in the body markup / CSS below). Field
    // list, labels and values are completely unchanged — only its position
    // and visual weight changed; no field was removed. ──
    const documentInfoHTML = [
      metaRow('Report Number', reportNumber),
      metaRow('Generation Date', now.toLocaleDateString()),
      metaRow('Generation Time', now.toLocaleTimeString()),
      metaRow('Generated By', 'TAILAM Automated Analysis Engine'),
      metaRow('Engineered By', 'Bharadwaj Muppala — linkedin.com/in/bharadwajmuppala'),
      metaRow('Software Version', REPORT_META.version),
      metaRow('Analysis Module', moduleLabel)
    ].join('');

    // ── Transformer Information — Page-1 polish sprint: trimmed to exactly
    // the 3 fields this sprint specifies (Name / Oil Sample Date / Oil Type)
    // so it reads compactly immediately under the header, per the requested
    // Page-1 flow. No field is deleted from the app or its data model —
    // this only narrows what the PDF's Page-1 identity block shows;
    // infoCell() still hides any of the 3 if left empty. ──
    const transformerInfoHTML = [
      infoCell('Transformer Name', info.name),
      infoCell('Oil Sample Date', info.date),
      infoCell('Oil Type', info.oil)
    ].join('');

    // ── Gas Values (ppm) — raw lab-report input data, sourced directly from
    // the same rp.g / rp.og fields exportExcelX() already reads. Polish
    // sprint: equal-width columns via an explicit colgroup, centred values
    // and a solid professional-blue header (see .gas-table in <style>
    // below) — same values, improved table only. ──
    const gasKeys = isOLTC ? ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'] : ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2', 'o2'];
    const gasVals = isOLTC ? rp.og : rp.g;
    const gasColWidth = (100 / gasKeys.length).toFixed(3) + '%';
    const gasValuesHTML = `<table class="report-table gas-table">
      <colgroup>${gasKeys.map(() => `<col style="width:${gasColWidth}">`).join('')}</colgroup>
      <thead><tr>${gasKeys.map((k) => `<th>${esc(GAS_LABELS[k] || k.toUpperCase())}</th>`).join('')}</tr></thead>
      <tbody><tr>${gasKeys.map((k) => `<td>${esc(gasVals && gasVals[k] != null ? gasVals[k] : '—')}</td>`).join('')}</tr></tbody>
    </table>`;

    // ── ③ Engineering Snapshot — redesign sprint: 5 cards (Overall Condition /
    // Primary Fault / Operational Decision / Confidence / Transformer Health
    // Index), now the very first engineering content in the report. Every
    // value is read from the same already-rendered Engineering Workspace DOM
    // exportPDF has always read from; domSevBadge() additionally reads the
    // severity CLASS ui/workspace.js already assigned that element (the same
    // health.cls computed once in renderMainWorkspace/renderOltcWorkspace)
    // so the Overall Condition card can be colour-coded consistently with
    // the rest of the app, without recomputing anything. ──
    function domSevBadge(id) {
      const el = document.getElementById(id);
      const m = el && /sev-badge-(\w+)/.exec(el.className || '');
      return m ? m[1] : 'attention';
    }
    const thiSnapshotValue = !isOLTC
      ? (domText('thi-score-main') || (rp.risk + ' / 100'))
      : (domText('oltc-condition-badge') || '—');
    const snapshotHTML = `
      <div class="snapshot-grid-pdf">
        <div class="snapshot-cell-pdf snapshot-cell-primary sev-pdf-${esc(domSevBadge('snapshot-condition-' + idSuffix))}">
          <span class="snapshot-label-pdf">Overall Condition</span>
          <span class="snapshot-value-pdf">${esc(domText('snapshot-condition-' + idSuffix) || '—')}</span>
        </div>
        <div class="snapshot-cell-pdf">
          <span class="snapshot-label-pdf">Primary Fault</span>
          <span class="snapshot-value-pdf">${esc(domText('snapshot-fault-' + idSuffix) || '—')}</span>
        </div>
        <div class="snapshot-cell-pdf">
          <span class="snapshot-label-pdf">Operational Decision</span>
          <span class="snapshot-value-pdf">${esc(domText('snapshot-decision-' + idSuffix) || '—')}</span>
        </div>
        <div class="snapshot-cell-pdf">
          <span class="snapshot-label-pdf">Confidence</span>
          <span class="snapshot-value-pdf">${esc(domText('snapshot-confidence-' + idSuffix) || '—')}</span>
        </div>
        <div class="snapshot-cell-pdf">
          <span class="snapshot-label-pdf">Transformer Health Index</span>
          <span class="snapshot-value-pdf">${esc(thiSnapshotValue)}</span>
        </div>
      </div>`;

    // ── ④ Current Status — at most 5 of the already-composed Engineering
    // Interpretation sentences (see buildExecutiveSummaryHTML). ──
    const execSummaryHTML = buildExecutiveSummaryHTML(domText('interpretation-' + idSuffix));

    // ── ⑥ Diagnostic Analysis (Duval Triangle) — the visual centrepiece.
    // Same high-resolution capture and same underlying zone/gas-% values as
    // before; only spacing, centring and caption typography change (CSS
    // below). ──
    const duval = isOLTC ? rp.duval2 : rp.duval;
    const duvalTitle = isOLTC ? 'Duval Triangle 2' : 'Duval Triangle 1';
    const duvalImg = isOLTC
      ? hiResDuvalPng('duval2-canvas', drawDuvalTriangle2, rp.og, 3)
      : hiResDuvalPng('duval-canvas', drawDuvalTriangle, duval, 3);
    const gasPct = duval && duval.total
      ? `%CH₄ = ${duval.pCH4.toFixed(1)} · %C₂H₄ = ${duval.pC2H4.toFixed(1)} · %C₂H₂ = ${duval.pC2H2.toFixed(1)}`
      : 'Insufficient gas data to plot a point.';
    const duvalHTML = `
      <figure class="duval-figure">
        <img src="${duvalImg}" alt="${esc(duvalTitle)} plot">
        <figcaption>
          <div class="duval-figure-number">Figure 1</div>
          <div class="duval-caption-title">${esc(duvalTitle)} Diagnostic Plot</div>
          <div class="duval-caption-kicker">Current Diagnostic Zone</div>
          <div class="duval-caption-zone">${esc(duval ? duval.zone : '—')}</div>
          <div class="duval-caption-fault">${esc(duval ? duval.name : '—')}</div>
          <div class="duval-caption-gas">${esc(gasPct)}</div>
          <div class="duval-caption-standard">IEC 60599</div>
        </figcaption>
      </figure>
      ${buildDuvalLegendHTML(isOLTC ? 'triangle2' : 'triangle1', duval ? duval.zone : null)}`;

    // ── Immediate Action Plan — rows are kept (not just the built HTML) so
    // the merged Final Recommendation card below can reuse the top row's
    // already-computed Priority instead of inventing an urgency level.
    // Polish sprint — condensed to at most 5 rows via condenseActionRows()
    // (dedupe + re-sort HIGH→MEDIUM→LOW; see its doc comment). ──
    const actionRows = condenseActionRows(extractActionPlan('action-plan-' + idSuffix));
    const actionPlanHTML = buildActionPlanTable(actionRows);
    const topPriority = actionRows.length ? actionRows[0].priority : '';

    // ── Engineering Assessment — Page-1 polish sprint: the method/zone
    // breakdown table + Consensus/Confidence note, cloned from the same
    // already-rendered Engineering Assessment card the Workspace shows. ──
    const assessmentHTML = buildAssessmentHTML('assess-why-' + idSuffix);

    // ── ⑧ Diagnostic Methods table ──
    const diagnosticHTML = buildDiagnosticTable(extractDiagnosticRows('diagnostic-table-' + idSuffix));

    // ── ⑨ Transformer Health Index — score, category, band and (Main Tank
    // only) the same risk gauge already drawn on screen, captured exactly
    // as the Duval Triangle image is (canvasPngLight, unmodified draw
    // function). OLTC has no composite score in the engine, so it keeps the
    // existing honest disclosure instead of a gauge. ──
    let thiHTML;
    if (!isOLTC) {
      const health = healthCategoryFor(rp.risk);
      const scoreText = domText('thi-score-main') || (rp.risk + ' / 100');
      const gaugeImg = canvasPngLight('risk-canvas', () => drawRiskGauge(rp.risk));
      thiHTML = `<div class="thi-hero-pdf">
        <img class="thi-gauge-pdf" src="${gaugeImg}" alt="Transformer Health Index gauge">
        <div class="thi-score-value">${esc(scoreText)}</div>
        <div class="thi-category-row"><span class="thi-category-label">Health Category</span><span class="thi-category-word thi-${esc(health.cls.replace('result-', ''))}">${esc(health.label)}</span></div>
        ${buildBandHTML('thi-band-main')}
      </div>`;
    } else {
      thiHTML = `<p class="thi-oltc-note-pdf">OLTC diagnostics do not produce a composite 0–100 index (that score is Main-Tank-only). Classification below reflects Duval Triangle 2 zone severity.</p>
      <div class="thi-hero-pdf"><div class="thi-category-row"><span class="thi-category-label">Condition</span><span class="thi-category-word">${esc(domText('oltc-condition-badge') || '—')}</span></div>
      ${buildBandHTML('thi-band-oltc')}</div>`;
    }

    // ── ⑩ Engineering Interpretation — Summary / Evidence / Engineering
    // Conclusion, same sentences as always, just regrouped. Text is kept
    // (not just the built HTML) so the merged Final Recommendation card
    // below can reuse the same Engineering Conclusion sentence as its
    // Expected Outcome field, instead of authoring new wording. ──
    const interpText = domText('interpretation-' + idSuffix);
    const interpretationHTML = buildInterpretationHTML(interpText);
    let expectedOutcome = splitInterpretation(interpText).conclusion;
    // Consistency fix (PDF review): Reason and Expected Outcome previously
    // printed the IDENTICAL sentence when the conclusion also served as the
    // decision reason. When they match, state the outcome as an outcome.
    const reasonText = domText('decision-reason-' + idSuffix);
    if (expectedOutcome && reasonText && expectedOutcome.trim() === reasonText.trim()) {
      expectedOutcome = isOLTC
        ? 'Continued normal switching behaviour, confirmed at the next routine oil sample.'
        : 'Condition maintained under the routine sampling programme.';
    }

    // ── Final Engineering Recommendation — compaction sprint: merged
    // directly under ⑩ Engineering Interpretation as a highlighted card
    // instead of its own page-⑫ section (see buildFinalRecommendationHTML
    // doc comment for where every field's value is reused from). ──
    const finalRecHTML = buildFinalRecommendationHTML(idSuffix, topPriority, expectedOutcome, standardsSummary(isOLTC, hasO2));

    // ── ⑪ Supporting Evidence — cloned from the already-rendered evidence
    // blocks (see buildEvidenceHTML). ──
    const evidenceHTML = buildEvidenceHTML('evidence-' + idSuffix);

    // ── ⑫ Engineering References ──
    const referencesHTML = `<ul class="report-references">${buildReferences(isOLTC, hasO2)}</ul>`;

    // ── Footer — layout fix (PDF review): the old position:fixed
    // .pdf-footer div was anchored inside the CONTENT area, so on a full
    // page it printed on top of the last lines of body text. The footer
    // line now lives in the @page @bottom-center margin box — the same
    // mechanism that already renders "Page X of Y" at @bottom-right — so
    // it is typeset in the page MARGIN and physically cannot collide with
    // report content. Same single line, same wording. Browsers without
    // margin-box support render nothing (same graceful fallback as the
    // page counter). ──
    const footerLine = 'TAILAM · ' + REPORT_META.edition +
      ' · Engineering Decision Support Report · Version ' + REPORT_META.version +
      ' · Generated ' + now.toLocaleDateString();
    const footerHTML = '';

    const reportTitle = isOLTC ? 'OLTC Analysis Report' : 'Main Tank Analysis Report';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <meta name="generator" content="${esc(REPORT_META.product)} ${esc(REPORT_META.version)} (${esc(REPORT_META.edition)})">
    <meta name="tailam-build" content="${esc(REPORT_META.build)}">
    <meta name="tailam-report-number" content="${esc(reportNumber)}">
    <title>TAILAM ${esc(reportTitle)} — ${esc(info.name || 'Transformer')}</title>
    <style>
      /* Compaction sprint — @page margins tightened (was 20/14/26/14mm) so
         each page carries more usable content, and the bottom margin now
         matches the SHRUNK single-line footer band exactly (12mm reserved,
         footer sits at 4mm from the edge with a 1-line height) — the old
         26mm bottom margin combined with a fixed-position footer is what
         let report content and footer collide on some pages; matching the
         two numbers is the permanent fix. Real per-page numbering via the
         CSS-correct @page margin box — a body-level counter(page) always
         evaluates to 0 outside this mechanism. Browsers that don't support
         @page margin boxes render nothing here — a silent, graceful
         fallback rather than a wrong number. */
      @page { margin: 14mm 12mm 15mm 12mm; }
      @page {
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          font-size: 8.5pt;
          color: #8a8f9f;
        }
        @bottom-center {
          content: "${footerLine}";
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          font-size: 8.5pt;
          color: #8a8f9f;
          white-space: nowrap;
        }
      }
      * { box-sizing: border-box; }

      /* ── Restrained 5-colour engineering palette (blue / orange / green /
         red / grey), unchanged from the previous sprint — kept exactly so
         no colour meaning shifts. ── */
      :root{
        --pdf-blue:#2d3a8c; --pdf-blue-bg:#eef1fc;
        --pdf-green:#15803d; --pdf-green-bg:#dcfce7;
        --pdf-orange:#c2410c; --pdf-orange-bg:#ffedd5;
        --pdf-red:#b91c1c; --pdf-red-bg:#fee2e2;
        --pdf-grey:#5b6072; --pdf-grey-bg:#f1f2f7; --pdf-grey-line:#d7dae8;
      }

      /* ── Typography scale (unchanged targets): section headings 18-20px,
         table headers 15-16px, body 14-15px, captions/notes 13-14px. Line
         spacing kept generous for readability even as outer whitespace is
         compacted. ── */
      body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#161b2e;margin:0;padding:0 0 13mm 0;font-size:14.5px;line-height:1.55;}
      h1,h2,h3{margin:0;}

      /* ── Cover header — compact padding/margin so Page 1 has maximum room
         for Transformer Information / Gas Values / Engineering Snapshot /
         Current Status / Engineering Assessment / Duval Triangle, all of
         which now flow onto Page 1 with no forced break between them. Same
         premium coloured masthead, same fields. ── */
      /* Data-first header (branding sprint): slim, unbranded, reads as a
         document title block rather than a product advertisement. */
      .report-header{padding:0 0 10px 0;border-bottom:2.5px solid var(--pdf-blue);margin-bottom:14px;}
      .report-doctype{font-size:19px;font-weight:800;color:#161b2e;letter-spacing:0.2px;}
      .report-header-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:9px;}
      .report-header-meta-cell{overflow-wrap:break-word;word-break:break-word;}
      .report-header-meta-label{display:block;font-size:10px;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;}
      .report-header-meta-value{display:block;font-size:13px;font-weight:700;color:#161b2e;}

      /* ── Numbered engineering sections. Final polish sprint: no section
         forces a page break anymore — every forced .page-break-before was
         removed so pagination follows content naturally (avoids isolated
         headings and large blank gaps that a fixed break position creates
         once Transformer Info / Gas Values moved to Page 1). Each section
         still keeps page-break-inside:avoid so a heading is never stranded
         alone at the bottom of a page; .page-break-before is kept defined,
         unused, only in case a future section genuinely needs one. ── */
      .section{margin:0 0 13px 0;page-break-inside:avoid;}
      .section h2{font-size:18.5px;font-weight:700;color:var(--pdf-blue);border-bottom:2px solid var(--pdf-grey-line);padding-bottom:4px;margin-bottom:8px;page-break-after:avoid;display:flex;align-items:baseline;gap:7px;}
      .section h2 .sec-num{font-size:16px;color:var(--pdf-blue);}
      .section h2 + *{page-break-before:avoid;}
      .page-break-before{page-break-before:always;}

      .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
      .meta-cell,.info-cell{border:1px solid var(--pdf-grey-line);border-radius:6px;padding:8px 10px;overflow-wrap:break-word;word-break:break-word;}
      .meta-label,.info-label{display:block;font-size:10px;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;}
      .meta-value,.info-value{font-size:13px;font-weight:600;color:#161b2e;overflow-wrap:break-word;word-break:break-word;}

      /* ── Compact Document Information card — final polish sprint: moved
         to the LAST page, after Engineering References and before the
         Disclaimer/footer, so administrative metadata never interrupts the
         engineering flow. Deliberately smaller/quieter than a numbered
         section (no circled digit, no section-heading styling), since it's
         traceability information, not an engineering finding. Reuses
         metaRow()'s existing .meta-cell markup in a tight 3-column grid. ── */
      .doc-info-strip{border:1px solid var(--pdf-grey-line);border-radius:8px;padding:8px 10px;background:var(--pdf-grey-bg);margin-top:13px;margin-bottom:13px;page-break-inside:avoid;}
      /* Page-1 polish sprint — the 3-field Transformer Information block
         (Name / Oil Sample Date / Oil Type) sits directly under the header,
         so it gets a tighter single-row grid instead of the general
         3-column/multi-row .info-grid used when more fields are present. */
      .info-grid-compact{grid-template-columns:repeat(3,1fr);}
      .doc-info-strip-title{font-size:9.5px;font-weight:700;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}
      .doc-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px 8px;}
      .doc-info-grid .meta-cell{border:none;background:transparent;padding:0;}
      .doc-info-grid .meta-label{font-size:9px;margin-bottom:1px;}
      .doc-info-grid .meta-value{font-size:11.5px;}

      /* ③ Engineering Snapshot — large cards, colour-coded Overall
         Condition card. Gaps/padding trimmed slightly for Page-1 density. */
      .snapshot-grid-pdf{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}
      .snapshot-cell-pdf{border:1px solid var(--pdf-grey-line);border-radius:8px;padding:9px 8px;text-align:center;background:var(--pdf-grey-bg);}
      .snapshot-cell-primary{border-width:2px;}
      .snapshot-label-pdf{display:block;font-size:9.5px;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px;}
      .snapshot-value-pdf{display:block;font-size:14px;font-weight:800;color:#161b2e;overflow-wrap:break-word;word-break:break-word;}
      .sev-pdf-healthy{background:var(--pdf-green-bg);border-color:var(--pdf-green);} .sev-pdf-healthy .snapshot-value-pdf{color:var(--pdf-green);}
      .sev-pdf-attention{background:var(--pdf-orange-bg);border-color:var(--pdf-orange);} .sev-pdf-attention .snapshot-value-pdf{color:var(--pdf-orange);}
      .sev-pdf-warning{background:var(--pdf-orange-bg);border-color:var(--pdf-orange);} .sev-pdf-warning .snapshot-value-pdf{color:var(--pdf-orange);}
      .sev-pdf-critical{background:var(--pdf-red-bg);border-color:var(--pdf-red);} .sev-pdf-critical .snapshot-value-pdf{color:var(--pdf-red);}

      /* ④ Current Status (Executive Engineering Summary text) */
      .exec-summary-pdf{font-size:14px;line-height:1.65;color:#222;text-align:justify;margin:0;padding:10px 13px;background:var(--pdf-grey-bg);border-left:4px solid var(--pdf-blue);border-radius:4px;}

      /* ⑥ Diagnostic Analysis (Duval Triangle) — the visual centrepiece.
         Size is UNCHANGED (max-width 430/400px) per this sprint's explicit
         "do not reduce the triangle" instruction; only the margins around
         it are tightened so it doesn't push extra pages. */
      .duval-figure{margin:4px auto 6px auto;text-align:center;page-break-inside:avoid;max-width:100%;}
      .duval-figure img{display:block;margin:0 auto;width:100%;max-width:430px;height:auto;object-fit:contain;}
      .duval-figure-number{font-size:10px;font-weight:700;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.6px;margin-top:10px;}
      .duval-caption-title{font-size:14.5px;font-weight:700;color:var(--pdf-blue);margin-top:2px;}
      .duval-caption-kicker{font-size:10px;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.3px;margin-top:7px;}
      .duval-caption-zone{font-size:20px;font-weight:800;color:#161b2e;margin-top:3px;}
      .duval-caption-fault{font-size:13px;color:#333;margin-top:2px;}
      .duval-caption-gas{font-size:11.5px;color:#555;margin-top:4px;}
      .duval-caption-standard{font-size:10.5px;color:var(--pdf-grey);margin-top:3px;font-style:italic;}

      /* Duval legend — inline SVG swatches (never a CSS background-colour)
         so the colours always print. Legend stays immediately below the
         triangle, Engineering Note immediately below the legend, both kept
         together and never split. */
      .pdf-legend{margin:9px auto 0 auto;max-width:480px;page-break-inside:avoid;}
      .pdf-legend-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5px 14px;}
      .pdf-legend-item{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#333;}
      .pdf-legend-swatch,.pdf-legend-marker{flex:0 0 auto;display:block;}
      .pdf-legend-text strong{color:#161b2e;margin-right:4px;}
      .pdf-legend-note{margin-top:7px;font-size:10.5px;color:var(--pdf-grey);line-height:1.5;text-align:center;}

      /* ── Tables — generous cell padding for readability, but outer
         margins trimmed so several tables fit per page. Diagnosis and
         Recommendation columns get the most width; Reference is narrow so
         it wraps before Diagnosis ever needs to. ── */
      table.report-table{width:100%;border-collapse:collapse;margin-bottom:4px;page-break-inside:avoid;}
      table.report-table th,table.report-table td{border:1px solid var(--pdf-grey-line);padding:8px 11px;text-align:left;font-size:13px;line-height:1.4;overflow-wrap:break-word;word-break:break-word;}
      table.report-table th{background:var(--pdf-blue-bg);color:var(--pdf-blue);font-weight:700;font-size:15px;}
      table.report-table tbody tr{page-break-inside:avoid;}

      .action-table .col-priority{width:10%;} .action-table .col-recommendation{width:48%;}
      .action-table .col-time{width:18%;} .action-table .col-reference{width:24%;}
      /* Polish sprint — Status column removed (every row read "Computed",
         no information carried); freed width redistributed to Diagnosis
         and Agreement so both read with less wrapping. */
      .diagnostic-table-pdf .col-method{width:12%;} .diagnostic-table-pdf .col-role{width:9%;}
      .diagnostic-table-pdf .col-diagnosis{width:38%;} .diagnostic-table-pdf .col-agreement{width:26%;}
      .diagnostic-table-pdf .col-reference{width:15%;}
      .diagnostic-table-pdf th,.diagnostic-table-pdf td{padding:9px 11px;line-height:1.45;}

      /* Primary Diagnostic vs Supporting Method — tinted row, bold method
         name, left border on the primary row only. Presentational only.
         Supporting rows alternate a faint tint (diag-row-alt) for
         readability across a longer table. */
      tr.diag-row-primary td{background:var(--pdf-blue-bg);font-weight:700;border-left:4px solid var(--pdf-blue);}
      tr.diag-row-primary td:first-child{padding-left:8px;}
      tr.diag-row-supporting td:first-child{border-left:4px solid transparent;}
      tr.diag-row-alt td{background:#f7f8fc;}

      /* ② Gas Values — solid professional-blue header (distinct from the
         lighter tinted headers on other tables, per this sprint's "Gas
         Values should always appear on Page 1, professional blue table
         header" requirement), centred values, compact row height. Equal
         column widths come from the explicit <colgroup> built in JS. A
         single sample row has no meaningful zebra pattern to alternate. */
      .gas-table th{background:var(--pdf-blue);color:#fff;text-align:center;}
      .gas-table th,.gas-table td{padding:7px 6px;font-size:13px;text-align:center;}
      .gas-table td{font-weight:700;color:#161b2e;}

      /* ⑤ Engineering Assessment — cloned from the already-rendered method/
         zone breakdown table (assess-why-*): same values as the Diagnostic
         Methods table below, presented as a compact evidence list. */
      .assessment-pdf-wrap .evidence-table{width:100%;border-collapse:collapse;margin-bottom:8px;}
      .assessment-pdf-wrap .evidence-table td{padding:6px 9px;font-size:13px;border-bottom:1px solid var(--pdf-grey-line);}
      .assessment-pdf-wrap .evidence-table td:first-child{font-weight:700;color:var(--pdf-grey);width:38%;}
      .assessment-pdf-wrap .why-note{font-size:12px;color:var(--pdf-grey);margin-top:2px;}

      .priority-tag{display:inline-block;padding:2px 9px;border-radius:12px;font-size:10.5px;font-weight:700;color:#fff;white-space:nowrap;}
      .priority-high{background:var(--pdf-red);} .priority-medium{background:var(--pdf-orange);} .priority-low{background:var(--pdf-green);}

      /* Status badges — easier to recognise than plain text; the status
         STRING is unchanged, only its visual treatment. */
      .status-badge{display:inline-block;padding:2px 9px;border-radius:12px;font-size:10.5px;font-weight:700;white-space:nowrap;}
      .status-badge-computed{background:var(--pdf-green-bg);color:var(--pdf-green);}
      .status-badge-neutral{background:var(--pdf-grey-bg);color:var(--pdf-grey);}

      /* ⑨ Transformer Health Index — score, category, band and (Main Tank)
         gauge. Padding/gauge size/margins kept compact so it shares a page
         naturally with neighbouring sections instead of occupying one on
         its own, while keeping every element (score, gauge, category,
         band). */
      .thi-hero-pdf{border:1px solid var(--pdf-grey-line);border-radius:8px;padding:12px;text-align:center;background:var(--pdf-grey-bg);}
      .thi-gauge-pdf{display:block;margin:0 auto 5px auto;max-width:140px;height:auto;}
      .thi-score-value{font-size:26px;font-weight:800;color:#161b2e;line-height:1.1;}
      .thi-category-row{margin-top:7px;font-size:12px;}
      .thi-category-label{color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.4px;margin-right:7px;}
      .thi-category-word{font-weight:700;font-size:13px;padding:2px 10px;border-radius:12px;}
      .thi-healthy{background:var(--pdf-green-bg);color:var(--pdf-green);} .thi-attention{background:var(--pdf-orange-bg);color:var(--pdf-orange);}
      .thi-warning{background:var(--pdf-orange-bg);color:var(--pdf-orange);} .thi-critical{background:var(--pdf-red-bg);color:var(--pdf-red);}
      .thi-oltc-note-pdf{font-size:11.5px;color:var(--pdf-grey);font-style:italic;margin-bottom:6px;}
      .thi-band-pdf{display:flex;margin-top:10px;border-radius:6px;overflow:hidden;border:1px solid var(--pdf-grey-line);}
      .thi-band-seg-pdf{flex:1;padding:5px 3px;text-align:center;font-size:10px;font-weight:700;color:var(--pdf-grey);background:#fff;border-right:1px solid var(--pdf-grey-line);}
      .thi-band-seg-pdf:last-child{border-right:none;}
      .thi-band-seg-pdf.active{background:var(--pdf-blue);color:#fff;}

      /* ⑩ Engineering Interpretation — Summary / Evidence / Engineering
         Conclusion, same sentences, tightened spacing so it and the merged
         Final Recommendation card below fit together on Page 4. */
      .interp-block{margin-bottom:9px;}
      .interp-block:last-child{margin-bottom:0;}
      .interp-label{font-size:12.5px;font-weight:700;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;}
      .interpretation-pdf{font-size:13.5px;line-height:1.6;color:#222;text-align:justify;margin:0;}

      /* Final Engineering Recommendation card — compaction sprint: merged
         directly under ⑩ Engineering Interpretation instead of its own
         page-⑫ section. Highlighted, kept together, never split; shows
         Recommended Action (headline), Priority (badge), and a 3-column
         Reason / Expected Outcome / Applicable Standards grid. */
      .final-rec-pdf{background:var(--pdf-blue);color:#fff;border-radius:8px;padding:13px 16px;page-break-inside:avoid;margin-top:11px;}
      .final-rec-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}
      .final-rec-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#dbe1f7;}
      .final-rec-decision{font-size:18px;font-weight:800;letter-spacing:0.2px;margin-bottom:9px;}
      .final-rec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;border-top:1px solid rgba(255,255,255,0.25);padding-top:9px;}
      .final-rec-field-label{display:block;font-size:9.5px;color:#c3cbf0;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px;}
      .final-rec-field-value{display:block;font-size:12px;font-weight:600;line-height:1.4;overflow-wrap:break-word;word-break:break-word;}

      /* ⑪ Supporting Evidence — compact evidence blocks, cloned from the
         same DOM ui/workspace.js#renderEvidenceBlocks already rendered. */
      .evidence-pdf-wrap .evidence-blocks{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;}
      .evidence-pdf-wrap .evidence-block{background:var(--pdf-grey-bg);border:1px solid var(--pdf-grey-line);border-radius:8px;padding:9px 11px;}
      .evidence-pdf-wrap .evidence-block-label{font-size:10.5px;color:var(--pdf-grey);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:5px;}
      .evidence-pdf-wrap .evidence-block-value{font-size:13px;font-weight:600;color:#161b2e;line-height:1.45;}
      .evidence-pdf-wrap .evidence-emphasis{font-size:15px;font-weight:800;color:var(--pdf-blue);}
      .evidence-pdf-wrap .evidence-tags{display:flex;flex-wrap:wrap;gap:5px;}
      .evidence-pdf-wrap .evidence-tag{display:inline-block;padding:2px 9px;border-radius:8px;font-size:11px;font-weight:600;background:#fff;color:#333;border:1px solid var(--pdf-grey-line);}

      /* ⑫ Engineering References — one line per standard, no dedicated page. */
      .report-references{list-style:none;margin:0;padding:0;}
      .report-references li{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #eceef7;padding:6px 3px;font-size:12.5px;}
      .ref-name{font-weight:700;color:var(--pdf-blue);white-space:nowrap;}
      .ref-desc{color:#555;text-align:right;}

      .empty-note{font-size:13px;color:var(--pdf-grey);font-style:italic;}

      .disclaimer{font-size:11.5px;color:var(--pdf-grey);border-top:1px solid var(--pdf-grey-line);padding-top:8px;margin-top:4px;}

      /* Branding end-note — small, quiet, last thing in the report. */
      .brand-endnote{margin-top:14px;padding-top:8px;border-top:1px solid var(--pdf-grey-line);text-align:center;font-size:9.5px;color:var(--pdf-grey);line-height:1.7;page-break-inside:avoid;}
      .brand-endnote-name{font-size:11px;font-weight:800;letter-spacing:0.6px;color:#3b415c;}
      .brand-endnote .tm{font-size:7px;vertical-align:super;}

      /* Footer — now rendered entirely by the @page @bottom-center margin
         box above (same mechanism as the Page X of Y counter), typeset in
         the page margin where it can never collide with report content.
         The old position:fixed .pdf-footer element was removed: fixed
         elements anchor inside the CONTENT area when printed, which is what
         let the footer print over the last lines of full pages. */

      @media print{
        .duval-figure img{max-width:400px;}
      }
    </style></head><body>

    <!-- Data-first header (branding sprint): no product branding on Page 1 —
         just the document title and the identifying data the reader needs.
         Full TAILAM branding now lives in the small end-note on the last
         page, after all engineering content. -->
    <header class="report-header">
      <div class="report-doctype">${esc(moduleLabel)} Report</div>
      <div class="report-header-meta">
        <div class="report-header-meta-cell"><span class="report-header-meta-label">Transformer Name</span><span class="report-header-meta-value">${esc(info.name || 'Unnamed Transformer')}</span></div>
        <div class="report-header-meta-cell"><span class="report-header-meta-label">Analysis Module</span><span class="report-header-meta-value">${esc(moduleLabel)}</span></div>
        <div class="report-header-meta-cell"><span class="report-header-meta-label">Date</span><span class="report-header-meta-value">${esc(now.toLocaleDateString())}</span></div>
        <div class="report-header-meta-cell"><span class="report-header-meta-label">Report Number</span><span class="report-header-meta-value">${esc(reportNumber)}</span></div>
      </div>
    </header>

    <div class="section">
      <h2><span class="sec-num">①</span> Transformer Information</h2>
      ${transformerInfoHTML ? `<div class="info-grid info-grid-compact">${transformerInfoHTML}</div>` : '<p class="empty-note">No transformer information entered.</p>'}
    </div>

    <div class="section">
      <h2><span class="sec-num">②</span> Gas Values (ppm)</h2>
      ${gasValuesHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">③</span> Engineering Snapshot</h2>
      ${snapshotHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">④</span> Current Status</h2>
      ${execSummaryHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑤</span> Engineering Assessment</h2>
      ${assessmentHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑥</span> Diagnostic Analysis</h2>
      ${duvalHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑦</span> Immediate Action Plan</h2>
      ${actionPlanHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑧</span> Diagnostic Methods</h2>
      ${diagnosticHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑨</span> Transformer Health Index</h2>
      ${thiHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑩</span> Engineering Interpretation</h2>
      ${interpretationHTML}
      ${finalRecHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑪</span> Supporting Evidence</h2>
      ${evidenceHTML}
    </div>

    <div class="section">
      <h2><span class="sec-num">⑫</span> Engineering References</h2>
      ${referencesHTML}
    </div>

    <div class="doc-info-strip">
      <div class="doc-info-strip-title">Document Information</div>
      <div class="doc-info-grid">${documentInfoHTML}</div>
    </div>

    <div class="section disclaimer">
      For engineering guidance only — not a substitute for the judgement of a qualified transformer engineer. Report ${esc(reportNumber)}.
    </div>

    <!-- Branding end-note (branding sprint): all product identity moved
         here, after every engineering section, in small type. -->
    <div class="brand-endnote">
      <div class="brand-endnote-name">TAILAM</div>
      <div>Transformer Assessment for Insulating Liquid Analysis &amp; Monitoring</div>
      <div>Version ${esc(REPORT_META.version)} · ${esc(REPORT_META.edition)} · Static Browser Edition · Build ${esc(REPORT_META.build)} · Rule-Based Engineering Intelligence</div>
      <div>bharadwaaaj.github.io/TAILAM · Designed by Bharadwaj Muppala · linkedin.com/in/bharadwajmuppala</div>
    </div>

    ${footerHTML}

    <script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { notify('Your browser blocked the report window. Please allow pop-ups for this page and try again.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    if (isOLTC) markOltcExported(); else markMainExported();
  }

  /**
   * Export ONE analysis as a professionally formatted .xlsx workbook with the
   * Duval triangle embedded as a PNG. Falls back to CSV when ExcelJS is absent.
   * @param {'main'|'oltc'} type
   */
  async function exportExcelX(type) {
    const isOLTC = type === 'oltc';
    const rp = isOLTC ? getOtReport() : getMtReport();
    if (!rp) { notify(isOLTC ? 'Run the OLTC analysis first.' : 'Run the main tank analysis first.'); return; }
    if (typeof ExcelJS === 'undefined') { exportCSV(type); return; }   // offline fallback → plain CSV
    const info = rp.info || readTransformerInfo();

    const HDR   = isOLTC ? 'FFF97316' : 'FF0EA583';   // orange for OLTC, signal teal for main tank
    const TITLE = isOLTC ? 'OLTC ANALYSIS REPORT' : 'MAIN TANK ANALYSIS REPORT';
    const FILLS = { 'badge-green':'FFDCFCE7', 'badge-yellow':'FFFEF9C3', 'badge-orange':'FFFFEDD5', 'badge-red':'FFFEE2E2',
                    'result-healthy':'FFDCFCE7', 'result-attention':'FFFEF9C3', 'result-warning':'FFFFEDD5', 'result-critical':'FFFEE2E2' };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'TAILAM'; wb.created = new Date();
    const ws = wb.addWorksheet(isOLTC ? 'OLTC Analysis' : 'Main Tank Analysis', { views:[{ showGridLines:false }] });
    ws.columns = [{width:24},{width:16},{width:16},{width:16},{width:26},{width:14},{width:14},{width:2},{width:14}];

    const title = ws.addRow([`TAILAM — ${TITLE}`]);
    ws.mergeCells(`A${title.number}:G${title.number}`);
    title.font = { bold:true, size:15, color:{argb:HDR} };
    ws.addRow([`Generated ${new Date().toLocaleString()} · ${isOLTC ? 'OLTC oil compartment only' : 'Main tank only'} · IEC 60599:2022`]).font = { size:10, color:{argb:'FF777777'} };
    ws.addRow([]);

    const sectionRow = (txt) => { const r = ws.addRow([txt]); r.font = { bold:true, size:12 };
      r.eachCell(c => c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF1F9'} }); return r; };
    const headerRow = (cells) => { const r = ws.addRow(cells);
      r.eachCell(c => { c.font = { bold:true, color:{argb:'FFFFFFFF'} };
        c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:HDR} };
        c.alignment = { horizontal:'center' }; }); return r; };
    const statusCell = (row, colIdx, cls) => { const c = row.getCell(colIdx);
      if (FILLS[cls]) c.fill = { type:'pattern', pattern:'solid', fgColor:{argb:FILLS[cls]} };
      c.alignment = { horizontal:'center' }; c.font = { bold:true }; };

    // ── Transformer info ──
    sectionRow('TRANSFORMER INFORMATION');
    [['Name', info.name], ['Rating (MVA)', info.mva], ['Voltage', info.voltage],
     ['Location', info.location], ['Sample Date', info.date], ['Oil Type', info.oil]].forEach(([l,v]) => {
      const r = ws.addRow([l, v || '—']); r.getCell(1).font = { bold:true, color:{argb:'FF555555'} };
    });
    ws.addRow([]);

    // ── Summary of key findings ──
    sectionRow('SUMMARY — KEY FINDINGS');
    headerRow(['Item', 'Result', 'Meaning']);
    if (!isOLTC) {
      const { duval, rogers, iec, ieee, keygas, agree, risk, rec } = rp;
      const health = healthCategoryFor(risk);
      const healthCls = { Healthy:'badge-green', Attention:'badge-yellow', Warning:'badge-orange', Critical:'badge-red' }[health.label];
      let r;
      r = ws.addRow(['Risk Score', `${risk}/100`, health.label]); statusCell(r, 3, healthCls);
      r = ws.addRow(['Duval Triangle 1', duval.zone, duval.name]); statusCell(r, 2, 'badge-yellow');
      ws.addRow(['Rogers Ratio', rogers.fault, rogers.name]);
      ws.addRow(['IEC 60599 Ratios', iec.fault, iec.name || '—']);
      ws.addRow(['IEEE C57.104', 'C' + ieee.maxCond, ieee.condName]);
      ws.addRow(['TDCG', keygas.TDCG.toFixed(0) + ' ppm', keygas.tdcgName]);
      ws.addRow(['Method Agreement', agree.agreeLevel, agree.confidence + '% confidence']);
      const rr = ws.addRow(['Recommendation', '', '']);
      ws.mergeCells(`B${rr.number}:G${rr.number}`); rr.getCell(2).value = rec;
      rr.getCell(2).alignment = { wrapText:true }; rr.getCell(1).font = { bold:true };
    } else {
      const { duval2, oltcRes } = rp;
      let worst = { k:'—', pct:0 };
      Object.entries(oltcRes.tgc).forEach(([k,v]) => { if (parseFloat(v.pct) > worst.pct) worst = { k, pct:parseFloat(v.pct) }; });
      let r;
      r = ws.addRow(['Duval Triangle 2 Zone', duval2.zone + (duval2.belowTypical ? ' (below typical — normal)' : ''), duval2.name]);
      statusCell(r, 2, duval2.belowTypical ? 'badge-green' : (['N'].includes(duval2.zone) ? 'badge-green' : ['X1'].includes(duval2.zone) ? 'badge-yellow' : ['D1'].includes(duval2.zone) ? 'badge-orange' : 'badge-red'));
      oltcRes.ratios.forEach(rt => { const row = ws.addRow([rt.name + '  (' + rt.formula + ')', rt.value !== null ? rt.value.toFixed(3) : 'N/A', rt.interp.label]); statusCell(row, 3, rt.interp.cls); });
      ws.addRow(['Worst Gas vs TGC', GAS_LABELS[worst.k] || worst.k, worst.pct.toFixed(1) + '% of typical value']);
      if (oltcRes.tapResult) ws.addRow(['C₂H₂ per 1000 tap operations', oltcRes.tapResult.per1000 + ' ppm', oltcRes.tapResult.ok ? 'Within typical range (≤15)' : 'Above typical — check contact wear']);
    }
    ws.addRow([]);

    // ── Gas values ──
    sectionRow('GAS VALUES (ppm)');
    const gasKeys = isOLTC ? ['h2','ch4','c2h6','c2h4','c2h2','co','co2'] : ['h2','ch4','c2h6','c2h4','c2h2','co','co2','o2'];
    headerRow(gasKeys.map(k => (GAS_LABELS[k] || k.toUpperCase())));
    const g = isOLTC ? rp.og : rp.g;
    const gr = ws.addRow(gasKeys.map(k => g[k] || 0));
    gr.eachCell(c => c.alignment = { horizontal:'center' });
    ws.addRow([]);

    // ── Detail table ──
    if (isOLTC) {
      sectionRow('TGC COMPARISON — CIGRE TB 443 (90th percentile)');
      headerRow(['Gas', 'Measured (ppm)', 'Typical (ppm)', '% of Typical', 'Status']);
      ['h2','ch4','c2h6','c2h4','c2h2','co','co2'].forEach(k => {
        const t = rp.oltcRes.tgc[k];
        const row = ws.addRow([GAS_LABELS[k], t.measured, t.limit, t.pct + '%', t.status]);
        statusCell(row, 5, t.cls);
        [2,3,4].forEach(i => row.getCell(i).alignment = { horizontal:'center' });
      });
      ws.addRow([]);
      sectionRow('CROSS-CONTAMINATION CHECK');
      headerRow(['Finding', 'Detail']);
      rp.xcontam.forEach(f => { const row = ws.addRow([f.title, f.detail]); row.getCell(2).alignment = { wrapText:true };
        ws.mergeCells(`B${row.number}:G${row.number}`); });
    } else {
      sectionRow('DIAGNOSTIC METHODS DETAIL');
      headerRow(['Method', 'Result', 'Classification']);
      const { duval, rogers, iec, ieee, keygas, doern } = rp;
      [['Duval Triangle 1', duval.zone, duval.name], ['Rogers Ratio', rogers.fault, rogers.name],
       ['IEC 60599', iec.fault, iec.name || '—'], ['Key Gas', keygas.fault, keygas.name],
       ['IEEE C57.104', 'C' + ieee.maxCond, ieee.condName], ['TDCG', keygas.TDCG.toFixed(0) + ' ppm', keygas.tdcgName],
       ['Doernenburg', doern.fault, doern.name]].forEach(x => {
        const row = ws.addRow(x); row.getCell(2).alignment = { horizontal:'center' }; row.getCell(2).font = { bold:true };
      });
      ws.addRow([]);
      sectionRow('CO₂/CO PAPER INVOLVEMENT');
      const pr = ws.addRow([rp.paper.text]); ws.mergeCells(`A${pr.number}:G${pr.number}`);
      pr.getCell(1).alignment = { wrapText:true };
    }

    // ── Duval triangle image — embedded PNG, re-rendered in light colors ──
    ws.addRow([]);
    sectionRow(isOLTC ? 'DUVAL TRIANGLE 2 — OLTC (IEC 60599:2022 Fig. B.4)' : 'DUVAL TRIANGLE 1 — MAIN TANK (IEC 60599:2022 Fig. B.3)');
    const zoneInfo = isOLTC ? rp.duval2 : rp.duval;
    ws.addRow([`Zone ${zoneInfo.zone} — ${zoneInfo.name}`]).font = { bold:true };
    const imgRowStart = ws.lastRow.number + 1;
    const png = isOLTC
      ? canvasPngLight('duval2-canvas', () => drawDuvalTriangle2('duval2-canvas', rp.og))
      : canvasPngLight('duval-canvas',  () => drawDuvalTriangle('duval-canvas', rp.duval));
    const imgId = wb.addImage({ base64: png, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0, row: imgRowStart }, ext: { width: 420, height: 400 } });
    for (let i = 0; i < 21; i++) ws.addRow([]);   // reserve rows under the image
    ws.addRow([`%CH₄ = ${zoneInfo.pCH4?.toFixed(1) ?? '—'} · %C₂H₄ = ${zoneInfo.pC2H4?.toFixed(1) ?? '—'} · %C₂H₂ = ${zoneInfo.pC2H2?.toFixed(1) ?? '—'}`]).font = { size:10, color:{argb:'FF555555'} };
    ws.addRow([zoneInfo.desc]).getCell(1).alignment = { wrapText:true };
    ws.mergeCells(`A${ws.lastRow.number}:G${ws.lastRow.number}`);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DGA_${isOLTC ? 'OLTC' : 'MainTank'}_${(info.name || 'transformer').replace(/\s+/g,'_')}_${info.date}.xlsx`;
    a.click();
    if (isOLTC) markOltcExported(); else markMainExported();
  }

  /**
   * Plain CSV fallback (used only if the ExcelJS library could not load).
   * @param {'main'|'oltc'} type
   */
  function exportCSV(type) {
    const isOLTC = type === 'oltc';
    const mtReport = getMtReport(), otReport = getOtReport();
    const rp = isOLTC ? otReport : mtReport;
    if (!rp) { notify('Run the analysis first.'); return; }
    const info = rp.info || readTransformerInfo();
    const rows = [
      [`TAILAM — ${isOLTC ? 'OLTC' : 'Main Tank'} Analysis Report`],
      ['Generated', new Date().toLocaleString()],
      [],
      ['TRANSFORMER INFORMATION'],
      ['Name', info.name], ['Rating (MVA)', info.mva], ['Voltage', info.voltage],
      ['Location', info.location], ['Sample Date', info.date], ['Oil Type', info.oil],
    ];
    if (!isOLTC && mtReport) {
      const { g, duval, rogers, iec, ieee, keygas, doern, agree, risk, rec } = mtReport;
      const healthCat = healthCategoryFor(risk).label;
      rows.push(
        [], ['MAIN TANK — GAS VALUES (ppm)'],
        ['H2','CH4','C2H6','C2H4','C2H2','CO','CO2','O2'],
        [g.h2, g.ch4, g.c2h6, g.c2h4, g.c2h2, g.co, g.co2, g.o2],
        [], ['MAIN TANK — DIAGNOSTIC RESULTS'],
        ['Method','Result','Classification'],
        ['Duval Triangle 1', duval.zone, duval.name],
        ['Rogers Ratio', rogers.fault, rogers.name],
        ['IEC 60599', iec.fault, iec.name||'—'],
        ['Key Gas', keygas.fault, keygas.name],
        ['IEEE Condition', 'C'+ieee.maxCond, ieee.condName],
        ['TDCG', keygas.TDCG.toFixed(0)+' ppm', keygas.tdcgName],
        ['Doernenburg', doern.fault, doern.name],
        [], ['MAIN TANK — RISK & CONFIDENCE'],
        ['Risk Score', risk+'/100'],
        ['Health Category', healthCat],
        ['Confidence', agree.confidence+'%'],
        ['Method Agreement', agree.agreeLevel],
        [], ['MAIN TANK — RECOMMENDATION'],
        [rec]
      );
    }
    if (isOLTC && otReport) {
      const { og, duval2, oltcRes } = otReport;
      rows.push(
        [], ['OLTC — GAS VALUES (ppm)'],
        ['H2','CH4','C2H6','C2H4','C2H2','CO','CO2'],
        [og.h2, og.ch4, og.c2h6, og.c2h4, og.c2h2, og.co, og.co2],
        [], ['OLTC — DUVAL TRIANGLE 2 (IEC 60599:2022)'],
        ['Zone', duval2.zone, duval2.name],
        [], ['OLTC — DIAGNOSTIC RATIOS'],
        ['Ratio','Formula','Value','Interpretation'],
        ...oltcRes.ratios.map(r => [r.name, r.formula, r.value!==null?r.value.toFixed(3):'N/A', r.interp.label])
      );
    }
    const csv = rows.map(r => r.map(c => `"${String(c==null?'':c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DGA_${isOLTC ? 'OLTC' : 'MainTank'}_${(info.name||'transformer').replace(/\s+/g,'_')}_${info.date}.csv`;
    a.click();
    if (isOLTC) markOltcExported(); else markMainExported();
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.export = { exportPDF, exportExcelX, exportCSV };
})();
