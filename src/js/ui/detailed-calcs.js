/**
 * TAILAM — ui/detailed-calcs.js
 * "Detailed Engineering Calculations" — the Engineering Workbook view.
 *
 * PHASE 3 — teaching workbook format. Every method is presented as a
 * numbered sequence of steps (formula → substitution → arithmetic →
 * threshold comparison → interpretation) so a reader with only basic
 * mathematics can reproduce every answer with a calculator, without
 * reading source code.
 *
 * ENGINEERING SAFETY — presentation only, same rule as every earlier phase:
 * every number shown is READ from the report object built in
 * ui/dashboard.js (itself built entirely from src/js/engine/*.js output),
 * from thi.js#calcRiskScoreBreakdown() (the one pre-approved engine
 * exposure, added in Phase 2), or from window.TAILAM.ui.charts' exported
 * zone-geometry tables. Nothing here computes a new threshold, ratio,
 * boundary, weight or score.
 *
 * The only arithmetic actually PERFORMED in this file (not just displayed)
 * is teaching-only re-expression of values the engine already returned:
 *   - showing a ÷ b for a ratio the engine already computed as `value`
 *     (the displayed division is the SAME arithmetic already done inside
 *     rogers.js/iec.js/etc.; nothing here feeds back into any decision),
 *   - summing already-computed percentages/gas values/THI contributions to
 *     show a running total or a "sums to 100%" check.
 * These are pedagogical restatements of already-frozen arithmetic, not new
 * engineering logic — the same category of content already reviewed and
 * approved in Phase 2 (decision-table transcription, verbatim-copy display
 * helpers) applied consistently here.
 *
 * Plain script — publishes on window.TAILAM.ui.detailedCalcs.
 * Depends on window.TAILAM.utils.helpers, window.TAILAM.engine.thi,
 * window.TAILAM.ui.charts (load those first).
 */
(function () {
  'use strict';

  const { esc } = window.TAILAM.utils.helpers;

  // ── formatting helpers ──────────────────────────────────────────────────

  function fmt(v, dp) {
    if (v === null || v === undefined) return 'N/A';
    if (v === 9999) return '∞';
    return typeof v === 'number' ? v.toFixed(dp == null ? 3 : dp) : String(v);
  }
  function pct(v) { return (v == null) ? '—' : v.toFixed(1) + '%'; }

  // ── workbook navigation state ────────────────────────────────────────────
  // Chapter/step ids, the Table of Contents entries, and the step sequence
  // used for Previous/Next are all assigned here at BUILD time (not derived
  // from DOM later) and reset at the start of every buildMainChapters() /
  // buildOltcChapters() call. Prefixed by panel ('main'/'oltc') so the two
  // panels' ids never collide even though both live in the DOM at once
  // (one hidden). Purely presentational bookkeeping — no engineering value.
  let _idPrefix = 'main';
  let _chapterSeq = 0;
  let _stepSeq = 0;
  let _tocEntries = [];
  function resetWorkbookCounters(prefix) {
    _idPrefix = prefix; _chapterSeq = 0; _stepSeq = 0; _tocEntries = [];
  }

  // ── workbook building blocks ────────────────────────────────────────────

  /**
   * One numbered step: collapsible "Step N — title" header (default
   * expanded) + free-form body + Previous/Next buttons. The header is a
   * clickable/keyboard-operable toggle (app.js wires the click/keydown
   * behaviour via the data-action attribute); Previous/Next just point at
   * the adjacent step's id and no-op harmlessly at either end of the
   * workbook (see app.js's jump-to handler).
   */
  function step(n, title, bodyHtml) {
    _stepSeq++;
    const seq = _stepSeq;
    const idBase = 'wb-step-' + _idPrefix + '-' + seq;
    const prevId = 'wb-step-' + _idPrefix + '-' + (seq - 1);
    const nextId = 'wb-step-' + _idPrefix + '-' + (seq + 1);
    return '<div class="wb-step" id="' + idBase + '">' +
      '<div class="wb-step-head" data-action="toggle-step" role="button" tabindex="0" aria-expanded="true">' +
      '<span class="wb-step-badge">Step ' + n + '</span><span class="wb-step-title">' + esc(title) + '</span>' +
      '<span class="wb-step-chevron" aria-hidden="true">▾</span>' +
      '</div>' +
      '<div class="wb-step-body">' + bodyHtml + '</div>' +
      '<div class="wb-step-nav">' +
      '<button type="button" class="wb-step-nav-btn" data-action="jump-to" data-target="' + prevId + '">← Previous</button>' +
      '<button type="button" class="wb-step-nav-btn" data-action="jump-to" data-target="' + nextId + '">Next →</button>' +
      '</div>' +
      '</div>';
  }
  /** A formula/equation, shown large and monospaced. */
  function eq(text) { return '<div class="wb-eq">' + esc(text) + '</div>'; }
  /** Substituted-value lines (one per line). */
  function sub(lines) { return '<div class="wb-sub">' + lines.map(esc).join('<br>') + '</div>'; }
  /** The arithmetic line itself: "120 ÷ 80" = "1.500", answer highlighted. */
  function arith(expr, answer) {
    return '<div class="wb-arith"><span class="wb-arith-expr">' + esc(expr) + '</span>' +
      '<span class="wb-arith-eq">=</span><span class="wb-arith-answer">' + esc(answer) + '</span></div>';
  }
  /** A short plain-English "Why?" explanation box. */
  function why(text) { return '<div class="wb-why"><span class="wb-why-label">Why?</span><p>' + esc(text) + '</p></div>'; }
  /** Threshold comparison: a row of range chips, the matching one highlighted. */
  function compare(bands, activeIdx) {
    return '<div class="wb-compare">' + bands.map((b, i) =>
      '<div class="wb-band' + (i === activeIdx ? ' active' : '') + '"><span class="wb-band-range">' + esc(b.range) + '</span><span class="wb-band-label">' + esc(b.label) + '</span></div>'
    ).join('') + '</div>';
  }
  /** A highlighted final-value box. */
  function answerBox(label, value) {
    return '<div class="wb-answer"><span class="wb-answer-label">' + esc(label) + '</span><span class="wb-answer-value">' + esc(value) + '</span></div>';
  }
  /** A compact reference table (headers + rows), reused for lookup/decision tables. Wrapped so a wide table scrolls horizontally on its own rather than forcing the whole modal to. */
  function table(headers, rows) {
    return '<div class="wb-table-wrap"><table class="wb-table"><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  /** Wrap a method's step sequence into a titled, identifiable workbook chapter card, register it in the TOC, and (when reference metadata exists for the title) prepend its Engineering Reference block. */
  function chapter(title, ref, stepsHtml, wide) {
    _chapterSeq++;
    const id = 'wb-ch-' + _idPrefix + '-' + _chapterSeq;
    _tocEntries.push({ id, title });
    const refInfo = REFERENCE_INFO[title];
    return '<div class="wb-method' + (wide ? ' workbook-card-wide' : '') + '" id="' + id + '">' +
      '<div class="wb-method-head"><span class="wb-method-title">' + esc(title) + '</span>' +
      (ref ? '<span class="wb-method-ref">' + esc(ref) + '</span>' : '') + '</div>' +
      (refInfo ? engineeringReference(title, refInfo) : '') +
      stepsHtml.join('') + '</div>';
  }

  /** Table of Contents panel — built from the chapters registered by chapter() above, in the order they were added. */
  function buildToc() {
    return '<div class="wb-toc">' +
      '<div class="wb-toc-head">' +
      '<span class="wb-toc-title">Contents</span>' +
      '<div class="wb-toc-actions">' +
      '<button type="button" class="wb-toc-action-btn" data-action="expand-all">Expand All</button>' +
      '<button type="button" class="wb-toc-action-btn" data-action="collapse-all">Collapse All</button>' +
      '</div></div>' +
      '<ol class="wb-toc-list">' +
      _tocEntries.map((e, i) => '<li><a href="#' + e.id + '" class="wb-toc-link" data-action="jump-to" data-target="' + e.id + '">' + (i + 1) + '. ' + esc(e.title) + '</a></li>').join('') +
      '</ol></div>';
  }

  // ── "Textbook worked example" sub-blocks ──────────────────────────────
  // Every step in the Duval Triangle 1 chapter is built from these labeled,
  // visually separated blocks (Purpose / Formula / Substitute Values /
  // Perform Arithmetic / Final Result / Why?) rather than one flowing
  // paragraph, so a reader with only basic mathematics can find and follow
  // each part of the reasoning independently.
  function block(icon, label, contentHtml) {
    // "Engineering Insight" blocks get a distinct callout treatment (a
    // consistent "engineering note" panel, per the reviewed design) —
    // content/wording is untouched, this only adds one extra CSS hook.
    const variant = label === 'Engineering Insight' ? ' wb-block-insight' : '';
    return '<div class="wb-block' + variant + '"><div class="wb-block-label"><span class="wb-block-icon" aria-hidden="true">' + icon + '</span>' + esc(label) + '</div>' + contentHtml + '</div>';
  }
  function p(text) { return '<p class="wb-p">' + esc(text) + '</p>'; }
  /** Green "✓ VERIFIED" badge (or a neutral flag if the check genuinely fails). */
  function verifiedBadge(ok) { return '<span class="wb-verified' + (ok ? '' : ' fail') + '">' + (ok ? '✓ VERIFIED' : '⚠ CHECK') + '</span>'; }
  /** Pass/fail checklist across every zone — ✅ only for the engine's own reported zone, never re-derived. */
  function zoneChecklist(zones, activeZone) {
    return '<div class="wb-zonecheck">' + zones.map((z) => {
      const isMatch = z.id === activeZone;
      return '<div class="wb-zonecheck-item' + (isMatch ? ' match' : '') + '">' +
        '<span class="wb-zonecheck-code">' + esc(z.id) + '</span>' +
        '<span class="wb-zonecheck-status">' + (isMatch ? '✅ Point inside this region' : '❌ Not inside') + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }
  /**
   * Chapter-closing executive summary — a labeled-row card restating the
   * already-established facts above (nothing new computed).
   * @param {string} title
   * @param {Array<{label:string, value:string}>} rows
   */
  function summaryPanel(title, rows) {
    return '<div class="wb-summary"><div class="wb-summary-title">' + esc(title) + '</div>' +
      rows.map((r) => '<div class="wb-summary-row"><span class="wb-summary-check" aria-hidden="true">✔</span>' +
        '<span class="wb-summary-label">' + esc(r.label) + '</span><span class="wb-summary-value">' + esc(r.value) + '</span></div>').join('') +
      '</div>';
  }

  // ── Reference-standard / handbook helpers (educational content only) ────
  // All of the text below is authored/paraphrased general engineering
  // context that identifies WHERE each method comes from, why it exists,
  // when to use it and its limitations. It does NOT reproduce or quote any
  // copyrighted standard text, and it reads/derives nothing from the engine
  // — it is fixed reference metadata attached to a method by its title.

  /** A simple unordered list. */
  function bulletList(items) {
    return '<ul class="wb-bullets">' + items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>';
  }
  /** "Engineering Reference" handbook panel shown at the top of a method chapter. */
  function engineeringReference(methodName, info) {
    function refRow(label, contentHtml) {
      return '<div class="wb-ref-row"><span class="wb-ref-label">' + esc(label) + '</span><div class="wb-ref-value">' + contentHtml + '</div></div>';
    }
    const inputs = (info.inputs && info.inputs.length)
      ? '<div class="wb-ref-chips">' + info.inputs.map((x) => '<span class="wb-ref-chip">' + esc(x) + '</span>').join('') + '</div>'
      : p('—');
    return '<div class="wb-ref">' +
      '<div class="wb-ref-title"><span class="wb-ref-icon" aria-hidden="true">📖</span>Engineering Reference</div>' +
      refRow('Method', p(methodName)) +
      refRow('Standard', p(info.standard)) +
      refRow('Purpose', p(info.purpose)) +
      refRow('Primary Inputs', inputs) +
      refRow('Typical Use', p(info.typicalUse)) +
      refRow('Limitations', p(info.limitations)) +
      '</div>';
  }
  /** "Engineering Note" callout — a distinct information panel for teaching notes (normalisation, rounding, categorical-not-statistical, etc.). */
  function note(subject, paragraphs) {
    return '<div class="wb-note">' +
      '<div class="wb-note-label"><span class="wb-note-icon" aria-hidden="true">📝</span>Engineering Note</div>' +
      (subject ? '<div class="wb-note-subject">' + esc(subject) + '</div>' : '') +
      paragraphs.map(p).join('') +
      '</div>';
  }
  /** Chapter-closing "Limitations of this Method" panel. */
  function limitationsPanel(intro, items) {
    return '<div class="wb-limitations">' +
      '<div class="wb-limitations-title"><span class="wb-limitations-icon" aria-hidden="true">⚠</span>Limitations of this Method</div>' +
      p(intro) + bulletList(items) +
      '</div>';
  }
  /** The workbook-closing "Engineering References" chapter — sources only, no standard text reproduced. */
  function referencesChapter() {
    const rows = WORKBOOK_REFERENCES.map((r) =>
      '<div class="wb-reflist-item"><span class="wb-reflist-name">' + esc(r.name) + '</span><span class="wb-reflist-note">' + esc(r.note) + '</span></div>'
    ).join('');
    const body = '<div class="wb-reflist">' + rows + '</div>' +
      note(null, ['These entries identify the engineering source of each method only. No copyrighted standard text is reproduced here — consult the published standards themselves for their full requirements.']);
    return chapter('Engineering References', 'Sources', [body], true);
  }

  // ── Standardised step / diagnosis builders ──────────────────────────────
  // These give every method the SAME labeled-block structure the Duval
  // Triangle 1 chapter established (Purpose / Formula / Substitute Values /
  // Perform Arithmetic / Result / Why? / Engineering Insight), so no chapter
  // reads as "short" next to Duval. Each field is optional; a method that
  // has no formula (e.g. a lookup table) simply omits it. Every value passed
  // in is already computed by the frozen engine — these helpers only lay it
  // out, they never compute anything diagnostic.

  /**
   * One fully-structured teaching step.
   * @param {number} n
   * @param {string} title
   * @param {object} o - { purpose, formula, subs:[], arith:[[expr,ans]],
   *   extra, extraLabel, extraIcon, result (string html | {label,value}),
   *   resultLabel, why, insight }
   */
  function calcStep(n, title, o) {
    let b = '';
    if (o.purpose) b += block('✓', 'Purpose', p(o.purpose));
    if (o.formula) b += block('📐', 'Formula', eq(o.formula));
    if (o.subs && o.subs.length) b += block('🔢', 'Substitute Values', sub(o.subs));
    if (o.arith && o.arith.length) b += block('🧮', 'Perform Arithmetic', o.arith.map((a) => arith(a[0], a[1])).join(''));
    if (o.extra) b += block(o.extraIcon || '📊', o.extraLabel || 'Detail', o.extra);
    if (o.result != null) b += block('✅', o.resultLabel || 'Result', (typeof o.result === 'object') ? answerBox(o.result.label, o.result.value) : o.result);
    if (o.why) b += block('💡', 'Why?', p(o.why));
    if (o.insight) b += block('💡', 'Engineering Insight', p(o.insight));
    return step(n, title, b);
  }

  /**
   * Expanded final-diagnosis step (Diagnosis / Engineering Meaning / Typical
   * Causes / Typical Follow-up Actions). Causes & follow-up come from the
   * fixed FAULT_DETAIL educational map by code where available; a method
   * that reports something other than a fault code (a condition level, a
   * score) passes causes/followup directly.
   * @param {number} n
   * @param {object} o - { title, diagnosisLabel, diagnosis, meaning,
   *   code (for FAULT_DETAIL lookup), causes:[], followup:[] }
   */
  function diagnosisStep(n, o) {
    const det = o.code != null ? (FAULT_DETAIL[o.code] || null) : null;
    const causes = o.causes || (det ? det.causes : null);
    const followup = o.followup || (det ? det.followup : null);
    let b = block('✅', o.diagnosisLabel || 'Diagnosis', answerBox(o.diagnosisLabel || 'Diagnosis', o.diagnosis));
    if (o.meaning) b += block('💡', 'Engineering Meaning', p(o.meaning));
    if (causes && causes.length) b += block('🔍', 'Typical Causes', bulletList(causes));
    if (followup && followup.length) b += block('🛠', 'Typical Follow-up Actions', bulletList(followup));
    return step(n, o.title || 'Final Engineering Diagnosis', b);
  }

  /** "What We Learned" executive summary (alias of summaryPanel for readability at call sites). */
  function whatWeLearned(rows) { return summaryPanel('What We Learned', rows); }

  /**
   * One gas ratio as a single fully-structured labeled step (Purpose /
   * Formula / Substitute Values / Perform Arithmetic / Compare With the
   * Standard / Result / Engineering Insight) — the same block structure the
   * Duval percentage steps use. Every value is already computed by the
   * engine; the division shown is the SAME arithmetic re-expressed.
   * @param {number} n - this step's number
   * @param {object} o - {label, formula, explain, numLabel, numVal, denLabel,
   *   denVal, unit, value, zeroRule, bands, activeIdx, meaning}
   * @returns {string}
   */
  function ratioSteps(n, o) {
    const arithLine = o.denVal === 0
      ? [o.numVal + ' ÷ 0', fmt(o.value)]
      : (o.value === null ? [o.numVal + ' ÷ ' + o.denVal, 'N/A'] : [o.numVal + ' ÷ ' + o.denVal, fmt(o.value)]);
    return calcStep(n, 'Calculate ' + o.label + ' (' + o.numLabel + ' ÷ ' + o.denLabel + ')', {
      purpose: o.explain,
      formula: o.formula,
      subs: [o.numLabel + ' = ' + o.numVal + ' ' + o.unit, o.denLabel + ' = ' + o.denVal + ' ' + o.unit],
      arith: [arithLine],
      extra: compare(o.bands, o.activeIdx),
      extraLabel: 'Compare With the Standard',
      extraIcon: '📊',
      result: { label: o.label, value: fmt(o.value) },
      why: (o.denVal === 0 || o.value === null) ? o.zeroRule : null,
      insight: o.meaning
    });
  }

  /** Verbatim copy of engine/consensus.js's normalize() step — display only, see chapter Confidence Assessment. */
  function normalizeForConsensus(f) {
    return ['PD', 'D1', 'D2', 'DT', 'T1', 'T2', 'T3'].indexOf(f) > -1 ? f : (['Normal', 'N'].indexOf(f) > -1 ? 'Normal' : 'Other');
  }

  const GAS_MEANING = {
    h2: 'Hydrogen — produced by almost every fault type; often the first gas to appear and a general indicator of electrical or thermal stress.',
    ch4: 'Methane — associated with low-to-medium temperature thermal faults and can also accompany partial discharge.',
    c2h6: 'Ethane — a thermal decomposition product, typically from moderate oil overheating.',
    c2h4: 'Ethylene — strongly associated with higher-temperature thermal faults such as hot metal or core problems.',
    c2h2: 'Acetylene — produced almost exclusively by high-temperature arcing or very high-energy discharge; even small amounts are significant.',
    co: 'Carbon Monoxide — produced when cellulose (paper) insulation is thermally stressed.',
    co2: 'Carbon Dioxide — also from cellulose degradation, generally from lower-temperature, longer-term aging.',
    o2: 'Oxygen — not a fault gas. Indicates whether air has entered a sealed system, or reflects a normal air-breathing design.'
  };

  // Engineering-Reference metadata per method, keyed by chapter title.
  // Educational context only (source, purpose, inputs, use, limitations) —
  // no standard text is reproduced, no engine value is read.
  const REFERENCE_INFO = {
    'Gas Concentrations': {
      standard: 'IEC 60567 · IEEE C57.104 (sampling & measurement)',
      purpose: 'The dissolved-gas-in-oil concentrations measured from the sample. Every diagnostic method in this workbook is built on these values.',
      inputs: ['H₂', 'CH₄', 'C₂H₆', 'C₂H₄', 'C₂H₂', 'CO', 'CO₂', 'O₂'],
      typicalUse: 'The starting point of every dissolved gas analysis (DGA) interpretation.',
      limitations: 'Raw ppm values alone do not diagnose a fault — they must be interpreted by the methods below.'
    },
    'IEC 60599 Three-Ratio Method': {
      standard: 'IEC 60599',
      purpose: 'Identify the likely fault type from three characteristic gas ratios classified into coded ranges.',
      inputs: ['C₂H₂/C₂H₄', 'CH₄/H₂', 'C₂H₄/C₂H₆'],
      typicalUse: 'Fault-type classification after DGA.',
      limitations: 'Some ratio combinations are indeterminate; best used alongside the Duval Triangle.'
    },
    'Rogers Ratio Method': {
      standard: 'Rogers ratio method (aligned with IEC 60599)',
      purpose: 'Classify the fault type from four gas ratios encoded as a four-digit code.',
      inputs: ['CH₄/H₂', 'C₂H₆/CH₄', 'C₂H₄/C₂H₆', 'C₂H₂/C₂H₄'],
      typicalUse: 'A cross-check on the Duval / IEC diagnosis.',
      limitations: 'Many code combinations are undefined (indeterminate); treat as a supporting method.'
    },
    'Duval Triangle 1': {
      standard: 'IEC 60599',
      purpose: 'Identify likely transformer fault types using the relative proportions of methane, ethylene and acetylene.',
      inputs: ['CH₄', 'C₂H₄', 'C₂H₂'],
      typicalUse: 'Fault diagnosis after dissolved gas analysis.',
      limitations: 'Should not be used as the sole diagnostic method. Best interpreted together with gas trends, operating history and other diagnostic techniques.'
    },
    'Key Gas Method': {
      standard: 'IEEE C57.104',
      purpose: 'Identify the fault type from the single dominant combustible gas and its characteristic pattern.',
      inputs: ['Raw ppm of each combustible gas'],
      typicalUse: 'Quick screening of the most likely fault family.',
      limitations: 'Pattern-based and less precise than the ratio methods; use as a first-look screen.'
    },
    'TDCG (Total Dissolved Combustible Gas)': {
      standard: 'IEEE C57.104',
      purpose: 'Gauge the overall severity of gassing by summing the combustible gases into one number and banding it.',
      inputs: ['H₂', 'CH₄', 'C₂H₆', 'C₂H₄', 'C₂H₂', 'CO'],
      typicalUse: 'Overall condition banding and setting the sampling interval.',
      limitations: 'Indicates severity only, not the fault type.'
    },
    'CO₂/CO Paper Involvement': {
      standard: 'IEC 60599',
      purpose: 'Assess whether cellulose (paper) insulation is involved, from the ratio of carbon dioxide to carbon monoxide.',
      inputs: ['CO₂', 'CO'],
      typicalUse: 'Detect paper degradation accompanying a fault.',
      limitations: 'The ratio is sensitive at low CO levels and should be read alongside the trend.'
    },
    'IEEE C57.104 Individual Gas Evaluation': {
      standard: 'IEEE C57.104',
      purpose: 'Assign a condition level (1–4) to each individual gas against published limits; the worst gas sets the overall condition.',
      inputs: ['Individual gas ppm vs. condition limits'],
      typicalUse: 'Condition assessment and sampling-frequency guidance.',
      limitations: 'Reports condition severity per gas, not the fault type.'
    },
    'Doernenburg Method': {
      standard: 'Doernenburg ratio method (legacy IEEE)',
      purpose: 'Classify the fault as thermal, arcing or corona from four gas ratios that each cast a vote.',
      inputs: ['CH₄/H₂', 'C₂H₂/C₂H₄', 'C₂H₂/CH₄', 'C₂H₆/C₂H₂'],
      typicalUse: 'A legacy cross-check on the primary methods.',
      limitations: 'Requires gases above the detection limit; superseded by Duval / IEC for many cases.'
    },
    'CIGRE Five-Key-Ratio Method': {
      standard: 'CIGRE Technical Brochures',
      purpose: 'Raise specific fault-pattern flags from five key gas ratios.',
      inputs: ['C₂H₂/C₂H₆', 'H₂/CH₄', 'C₂H₄/C₂H₆', 'CO₂/CO', 'C₂H₂/H₂'],
      typicalUse: 'Screening flags that draw attention to specific fault patterns.',
      limitations: 'Flags patterns rather than producing a single fault diagnosis.'
    },
    'Dissolved Oxygen Assessment': {
      standard: 'IEC 60422',
      purpose: 'Assess air ingress and oxidation risk from the dissolved-oxygen level.',
      inputs: ['O₂'],
      typicalUse: 'Checking seal integrity of a sealed transformer.',
      limitations: 'Interpretation depends on the tank design (sealed vs. air-breathing).'
    },
    'Transformer Health Index': {
      standard: 'TAILAM composite indicator (not a published standard)',
      purpose: 'Combine the individual method results into a single weighted 0–100 score.',
      inputs: ['Method results + fixed weights'],
      typicalUse: 'At-a-glance prioritisation across a fleet.',
      limitations: 'Uses an internal weighting; supportive only, never a substitute for the underlying methods.'
    },
    'Confidence Assessment': {
      standard: 'TAILAM cross-method agreement',
      purpose: 'Gauge how strongly the primary methods agree with one another.',
      inputs: ['Duval', 'Rogers', 'IEC 60599 results'],
      typicalUse: 'A trust indicator on the headline diagnosis.',
      limitations: 'Agreement is not the same as correctness — all methods can share a blind spot.'
    },
    'Recommendation Logic': {
      standard: 'Engineering best practice',
      purpose: 'Map the primary fault zone to a suggested next action.',
      inputs: ['Duval Triangle 1 zone'],
      typicalUse: 'Next-step guidance for the engineer.',
      limitations: 'Generic guidance; never a substitute for engineering judgement and site knowledge.'
    },
    // ── OLTC ──
    'Duval Triangle 2': {
      standard: 'IEC 60599:2022 (Figure B.4)',
      purpose: 'Identify likely on-load tap-changer fault types from the same three gases used for the main tank.',
      inputs: ['CH₄', 'C₂H₄', 'C₂H₂'],
      typicalUse: 'OLTC fault diagnosis after DGA of the OLTC oil compartment.',
      limitations: 'OLTC-model dependent; compare against the unit’s own history and identical designs.'
    },
    'Typical Gas Concentration (TGC) Comparison': {
      standard: 'CIGRE TB 443',
      purpose: 'Compare each measured OLTC gas against typical (90th-percentile) concentrations for OLTCs.',
      inputs: ['Measured OLTC gases vs. TGC limits'],
      typicalUse: 'Severity screening for the OLTC compartment.',
      limitations: 'Typical values vary by OLTC design; treat as guidance, not a hard limit.'
    },
    'Arcing Ratio': {
      standard: 'CIGRE TB 443',
      purpose: 'Indicate arcing activity in the OLTC from the C₂H₂/H₂ ratio.',
      inputs: ['C₂H₂', 'H₂'],
      typicalUse: 'Corroborate the OLTC Duval diagnosis.',
      limitations: 'A single supporting ratio; interpret with the other OLTC indicators.'
    },
    'Thermal Ratio': {
      standard: 'CIGRE TB 443',
      purpose: 'Indicate contact/lead overheating in the OLTC from the C₂H₄/C₂H₆ ratio.',
      inputs: ['C₂H₄', 'C₂H₆'],
      typicalUse: 'Corroborate the OLTC Duval diagnosis.',
      limitations: 'A single supporting ratio; interpret with the other OLTC indicators.'
    },
    'Discharge Ratio': {
      standard: 'CIGRE TB 443',
      purpose: 'Indicate excessive discharge activity in the OLTC from C₂H₂ vs. (C₂H₄ + C₂H₆).',
      inputs: ['C₂H₂', 'C₂H₄', 'C₂H₆'],
      typicalUse: 'Corroborate the OLTC Duval diagnosis.',
      limitations: 'A single supporting ratio; interpret with the other OLTC indicators.'
    },
    'Tap-Count Normalization': {
      standard: 'CIGRE TB 443',
      purpose: 'Express acetylene generation per 1000 tap operations so contact wear rate can be judged.',
      inputs: ['C₂H₂', 'Tap-change count'],
      typicalUse: 'Estimating contact-wear rate over the OLTC’s duty.',
      limitations: 'Requires an accurate operation count since the last oil change.'
    },
    'Cross-Contamination Check': {
      standard: 'IEC 60599:2022 §5.7',
      purpose: 'Detect OLTC oil (rich in acetylene) leaking into the main tank.',
      inputs: ['Main tank H₂ / C₂H₂', 'OLTC C₂H₂'],
      typicalUse: 'Screening for a failed diverter seal / oil mixing.',
      limitations: 'Needs main-tank reference values; inconclusive without them.'
    },
    'IEC "Below Typical" Evaluation': {
      standard: 'IEC 60599:2022 §9',
      purpose: 'Treat a fault-pattern zone as an early pattern rather than an active fault when no gas exceeds its typical value.',
      inputs: ['Duval Triangle 2 zone', 'TGC status'],
      typicalUse: 'Avoid over-diagnosing an OLTC that is still within typical gas levels.',
      limitations: 'A deliberately conservative gate; continue trending to confirm.'
    }
  };

  // "Typical Causes" and "Typical Follow-up Actions" per fault code, for the
  // expanded final-diagnosis cards across every fault-classification method.
  // General engineering knowledge about each fault family, authored fresh
  // for education — not read from the engine (each method's own name/desc
  // remain the engine's own words). Covers the Duval/Rogers/IEC/Key-Gas
  // codes plus Doernenburg's Thermal/Arcing/Corona vocabulary.
  const FAULT_DETAIL = {
    PD: { causes: ['Gas voids or cavities in the insulation', 'High local electric-field stress', 'Moisture or contamination in the insulation'], followup: ['Review gas trends over time', 'Perform power-factor / tan-delta testing', 'Increase DGA sampling frequency'] },
    D1: { causes: ['Sparking', 'Poor electrical contacts', 'Intermittent discharge'], followup: ['Review gas trends', 'Inspect historical DGA', 'Consider complementary diagnostic tests'] },
    D2: { causes: ['High-energy arcing', 'Severe sparking in oil', 'Winding or lead-connection faults'], followup: ['Consider removing the unit from service', 'Perform full electrical testing', 'Plan an internal inspection'] },
    DT: { causes: ['Combined overheating and electrical discharge', 'A localised hot spot with associated arcing'], followup: ['Reduce loading', 'Schedule an internal inspection', 'Perform oil and winding tests'] },
    T1: { causes: ['Low-temperature overheating (below 300 °C)', 'Insulation in contact with a hot metal part', 'Circulating currents'], followup: ['Check cooling-system performance', 'Review loading history', 'Increase DGA monitoring'] },
    T2: { causes: ['Conductor hot spot (300–700 °C)', 'Poor joints or connections', 'Circulating currents'], followup: ['Inspect winding conductors and connections', 'Check current balance', 'Review cooling-bank operation'] },
    T3: { causes: ['Severe hot spot (above 700 °C) in core or conductor', 'Heavy localised overheating'], followup: ['Reduce load promptly', 'Arrange an urgent inspection', 'Consider removing the unit from service'] },
    C: { causes: ['Overheating of cellulose (paper / pressboard) insulation', 'Sustained thermal ageing of the solid insulation'], followup: ['Measure the CO/CO₂ ratio', 'Assess insulation condition (FRA, capacitance)', 'Consider furan analysis'] },
    SG: { causes: ['Catalytic or stray gassing from metal surfaces', 'Not an internal fault'], followup: ['Investigate the hydrogen source separately', 'Monitor the H₂ trend'] },
    N: { causes: ['Normal thermal ageing', 'No significant fault indicated'], followup: ['Continue routine DGA sampling', 'Review the rate-of-gas-generation trend'] },
    Normal: { causes: ['Normal thermal ageing', 'No significant fault indicated'], followup: ['Continue routine DGA sampling', 'Review the rate-of-gas-generation trend'] },
    Thermal: { causes: ['Overheating of oil or metal', 'Hot spot or overloading'], followup: ['Check cooling-system performance', 'Review loading history', 'Inspect connections'] },
    Arcing: { causes: ['High-energy electrical discharge', 'Sparking or arcing in oil'], followup: ['Perform electrical testing', 'Plan an internal inspection'] },
    Corona: { causes: ['Partial discharge in gas-filled voids', 'High local field stress'], followup: ['Perform tan-delta testing', 'Inspect insulation for voids', 'Increase monitoring'] },
    Indeterminate: { causes: ['Gas pattern falls outside the method’s defined codes', 'Insufficient or ambiguous gas levels'], followup: ['Apply the other diagnostic methods', 'Re-sample and review the trend'] },
    'N/A': { causes: ['Insufficient combustible-gas data to classify'], followup: ['Verify the sample validity and re-test'] }
  };

  // Workbook-closing source list — identifies the origin of each method
  // only. Deliberately no standard text is quoted or reproduced.
  const WORKBOOK_REFERENCES = [
    { name: 'IEC 60599', note: 'Interpretation of dissolved and free gases in mineral-oil-filled equipment (Duval Triangles, three-ratio method, paper involvement).' },
    { name: 'IEEE C57.104', note: 'Interpretation of gases generated in oil-immersed transformers (Key Gas, TDCG, individual-gas conditions).' },
    { name: 'IEC 60567', note: 'Sampling of gases and of oil, and analysis of free and dissolved gases.' },
    { name: 'IEC 60422', note: 'Supervision and maintenance of mineral insulating oils (dissolved-oxygen context).' },
    { name: 'Michel Duval', note: 'Originator of the Duval Triangle and Pentagon dissolved-gas interpretation methods.' },
    { name: 'CIGRE Technical Brochures', note: 'Including TB 443 (OLTC typical gas concentrations) and TB 771 (transformer condition assessment).' }
  ];

  // ══════════════════════════════════════════════════════════════════════
  // MAIN TANK
  // ══════════════════════════════════════════════════════════════════════

  function buildMainChapters(rp) {
    resetWorkbookCounters('main');
    const { g, duval, rogers, iec, ieee, keygas, paper, doern, cigre, agree, risk, rec, o2info } = rp;
    const charts = window.TAILAM.ui.charts;
    const ch = [];

    // ── Gas Concentrations ──
    ch.push(chapter('Gas Concentrations', 'As entered', [
      table(['Gas', 'Measured', 'Unit', 'What it indicates'], [
        ['H₂ — Hydrogen', g.h2, 'ppm', GAS_MEANING.h2],
        ['CH₄ — Methane', g.ch4, 'ppm', GAS_MEANING.ch4],
        ['C₂H₆ — Ethane', g.c2h6, 'ppm', GAS_MEANING.c2h6],
        ['C₂H₄ — Ethylene', g.c2h4, 'ppm', GAS_MEANING.c2h4],
        ['C₂H₂ — Acetylene', g.c2h2, 'ppm', GAS_MEANING.c2h2],
        ['CO — Carbon Monoxide', g.co, 'ppm', GAS_MEANING.co],
        ['CO₂ — Carbon Dioxide', g.co2, 'ppm', GAS_MEANING.co2],
        ['O₂ — Oxygen', g.o2 > 0 ? g.o2 : 'Not entered', g.o2 > 0 ? 'ppm' : '', GAS_MEANING.o2]
      ])
    ], true));

    // ── Gas Ratios — quick-reference index; full step-by-step derivation of
    // each ratio lives inside its owning method chapter below, so a reader
    // never has to flip pages to see a ratio taught in full. ──
    ch.push(chapter('Gas Ratios — Quick Reference', 'Index — see each method chapter below for the full derivation', [
      table(['Method', 'Ratio', 'Formula', 'Value'], [
        ['Rogers', 'R1', 'CH₄ ÷ H₂', fmt(rogers.R1)], ['Rogers', 'R2', 'C₂H₆ ÷ CH₄', fmt(rogers.R2)],
        ['Rogers', 'R3', 'C₂H₄ ÷ C₂H₆', fmt(rogers.R3)], ['Rogers', 'R4', 'C₂H₂ ÷ C₂H₄', fmt(rogers.R4)],
        ['IEC 60599', 'r1', 'C₂H₂ ÷ C₂H₄', fmt(iec.r1)], ['IEC 60599', 'r2', 'CH₄ ÷ H₂', fmt(iec.r2)], ['IEC 60599', 'r3', 'C₂H₄ ÷ C₂H₆', fmt(iec.r3)],
        ['Doernenburg', 'R1', 'CH₄ ÷ H₂', fmt(doern.R1)], ['Doernenburg', 'R2', 'C₂H₂ ÷ C₂H₄', fmt(doern.R2)],
        ['Doernenburg', 'R3', 'C₂H₂ ÷ CH₄', fmt(doern.R3)], ['Doernenburg', 'R4', 'C₂H₆ ÷ C₂H₂', fmt(doern.R4)],
        ['CIGRE', 'K1', 'C₂H₂ ÷ C₂H₆', fmt(cigre.k1)], ['CIGRE', 'K2', 'H₂ ÷ CH₄', fmt(cigre.k2)],
        ['CIGRE', 'R1', 'C₂H₄ ÷ C₂H₆', fmt(cigre.r1)], ['CIGRE', 'R2', 'CO₂ ÷ CO', fmt(cigre.r2, 2)], ['CIGRE', 'R3', 'C₂H₂ ÷ H₂', fmt(cigre.r3)]
      ])
    ], true));

    // ── IEC 60599 Three-Ratio Method ──
    {
      const s = [];
      s.push(note('Why three ratios?', [
        'A single gas ratio can be ambiguous. IEC 60599 combines three ratios that respond differently to electrical vs. thermal faults, so together they separate fault types that any one ratio alone could confuse.'
      ]));
      s.push(calcStep(1, 'Calculate r1 (C₂H₂ ÷ C₂H₄)', {
        purpose: 'r1 compares acetylene (a strong arcing indicator) against ethylene (a thermal indicator), so it responds mainly to electrical discharge.',
        formula: 'r1 = C₂H₂ ÷ C₂H₄',
        subs: ['C₂H₂ = ' + g.c2h2 + ' ppm', 'C₂H₄ = ' + g.c2h4 + ' ppm'],
        arith: [[g.c2h4 === 0 ? g.c2h2 + ' ÷ 0' : g.c2h2 + ' ÷ ' + g.c2h4, fmt(iec.r1)]],
        result: { label: 'r1', value: fmt(iec.r1) }
      }));
      s.push(calcStep(2, 'Calculate r2 (CH₄ ÷ H₂)', {
        purpose: 'r2 compares methane against hydrogen, distinguishing low-temperature and partial-discharge patterns.',
        formula: 'r2 = CH₄ ÷ H₂',
        subs: ['CH₄ = ' + g.ch4 + ' ppm', 'H₂ = ' + g.h2 + ' ppm'],
        arith: [[g.h2 === 0 ? g.ch4 + ' ÷ 0' : g.ch4 + ' ÷ ' + g.h2, fmt(iec.r2)]],
        result: { label: 'r2', value: fmt(iec.r2) }
      }));
      s.push(calcStep(3, 'Calculate r3 (C₂H₄ ÷ C₂H₆)', {
        purpose: 'r3 compares ethylene against ethane, rising with the temperature of a thermal fault.',
        formula: 'r3 = C₂H₄ ÷ C₂H₆',
        subs: ['C₂H₄ = ' + g.c2h4 + ' ppm', 'C₂H₆ = ' + g.c2h6 + ' ppm'],
        arith: [[g.c2h6 === 0 ? g.c2h4 + ' ÷ 0' : g.c2h4 + ' ÷ ' + g.c2h6, fmt(iec.r3)]],
        result: { label: 'r3', value: fmt(iec.r3) },
        why: 'If a denominator is 0, IEC treats a zero numerator as ratio 0; any other numerator is reported as ∞ (an unbounded ratio).'
      }));
      s.push(calcStep(4, 'Classify Each Ratio Into a Coded Range', {
        purpose: 'Each ratio is placed into a coded band (0/1/2) — a compact way of describing "low / typical / high" for that ratio.',
        extra: table(['Ratio', 'Coded Range (IEC 60599 Table 1)', 'This Value'], [
          ['r1', '< 0.1 → code 0 · 0.1–3 → code 1 · > 3 → code 2', fmt(iec.r1)],
          ['r2', '< 0.1 → code 1 · 0.1–1 → code 0 · > 1 → code 2', fmt(iec.r2)],
          ['r3', '< 1 → code 0 · 1–4 → code 1 · > 4 → code 2', fmt(iec.r3)]
        ]),
        extraLabel: 'Coded Ranges',
        result: { label: 'Combined code', value: iec.code },
        insight: 'The coded ranges give a quick "shape" of the sample; the actual diagnosis in Step 5 reads the raw ratio values directly.'
      }));
      s.push(calcStep(5, 'Apply the Decision Table', {
        purpose: 'The ratios are checked against a fixed set of fault conditions, top to bottom; the first condition that is fully satisfied sets the fault.',
        extra: table(['Condition (checked in order)', 'Fault', 'Matched?'], [
          ['r2 < 0.1 and r3 < 0.2', 'PD', (iec.r2 < 0.1 && iec.r3 < 0.2) ? '✓ Yes' : 'No'],
          ['r1 > 1 and 0.1 ≤ r2 ≤ 0.5 and r3 > 1', 'D1', (iec.r1 > 1 && iec.r2 >= 0.1 && iec.r2 <= 0.5 && iec.r3 > 1) ? '✓ Yes' : 'No'],
          ['0.6 ≤ r1 ≤ 2.5 and 0.1 ≤ r2 ≤ 1 and r3 > 2', 'D2', (iec.r1 >= 0.6 && iec.r1 <= 2.5 && iec.r2 >= 0.1 && iec.r2 <= 1 && iec.r3 > 2) ? '✓ Yes' : 'No'],
          ['r2 > 1 and r3 < 1', 'T1', (iec.r2 > 1 && iec.r3 < 1) ? '✓ Yes' : 'No'],
          ['r1 < 0.1 and r2 > 1 and 1 ≤ r3 ≤ 4', 'T2', (iec.r1 < 0.1 && iec.r2 > 1 && iec.r3 >= 1 && iec.r3 <= 4) ? '✓ Yes' : 'No'],
          ['r1 < 0.2 and r2 > 1 and r3 > 4', 'T3', (iec.r1 < 0.2 && iec.r2 > 1 && iec.r3 > 4) ? '✓ Yes' : 'No'],
          ['none of the above', 'Indeterminate', iec.fault === 'Indeterminate' ? '✓ Yes' : 'No']
        ]),
        extraLabel: 'Decision Table',
        why: 'Only one row is marked "✓ Yes" — the fault it names is this sample’s IEC diagnosis.',
        insight: 'Some samples match no row and are reported as Indeterminate; that is an honest "this method cannot decide", not an error — the Duval Triangle is then the primary reference.'
      }));
      s.push(diagnosisStep(6, {
        diagnosisLabel: 'IEC 60599 Diagnosis', diagnosis: iec.fault + ' — ' + iec.name,
        meaning: iec.desc, code: iec.fault
      }));
      s.push(limitationsPanel('The IEC three-ratio method can return "Indeterminate" for valid samples and should be read alongside:',
        ['The Duval Triangle', 'Rogers Ratio', 'Gas trends over time', 'Key Gas / TDCG severity']));
      s.push(whatWeLearned([
        { label: 'Inputs', value: 'C₂H₂ ' + g.c2h2 + ' · C₂H₄ ' + g.c2h4 + ' · CH₄ ' + g.ch4 + ' · H₂ ' + g.h2 + ' · C₂H₆ ' + g.c2h6 + ' ppm' },
        { label: 'Ratios', value: 'r1 ' + fmt(iec.r1) + ' · r2 ' + fmt(iec.r2) + ' · r3 ' + fmt(iec.r3) },
        { label: 'Code', value: iec.code },
        { label: 'Diagnosis', value: iec.fault + ' — ' + iec.name },
        { label: 'Engineering Conclusion', value: iec.desc }
      ]));
      ch.push(chapter('IEC 60599 Three-Ratio Method', 'IEC 60599:2022 Table 1', s, true));
    }

    // ── Rogers Ratio Method ──
    {
      const s = [];
      const knownCode = Object.prototype.hasOwnProperty.call({ '0000': 1, '0100': 1, '1000': 1, '1100': 1, '0010': 1, '0001': 1, '0011': 1, '1201': 1, '0201': 1, '1211': 1, '0211': 1, '2000': 1, '2100': 1, '2110': 1, '2210': 1, '2120': 1, '2220': 1, '2121': 1, '2221': 1 }, rogers.code);
      s.push(note('How does Rogers reach a diagnosis?', [
        'Rogers turns four gas ratios into a four-digit code, then looks that code up in a fixed table of fault types. Each ratio is first banded into a single digit (0, 1 or 2); the four digits together form the code.'
      ]));
      s.push(ratioSteps(1, {
        label: 'R1', formula: 'R1 = CH₄ ÷ H₂', explain: 'Compares methane (a lower-temperature thermal indicator) against hydrogen (produced by nearly every fault type).',
        numLabel: 'CH₄', numVal: g.ch4, denLabel: 'H₂', denVal: g.h2, unit: 'ppm', value: rogers.R1,
        zeroRule: 'If H₂ is 0: R1 is defined as 0 when CH₄ is also 0, otherwise reported as ∞.',
        bands: [{ range: '< 0.1', label: 'code 0' }, { range: '0.1 – 1', label: 'code 1' }, { range: '> 1', label: 'code 2' }],
        activeIdx: rogers.R1 < 0.1 ? 0 : (rogers.R1 <= 1 ? 1 : 2),
        meaning: 'The highlighted band becomes the first digit of the Rogers code combined in Step 5.'
      }));
      s.push(ratioSteps(2, {
        label: 'R2', formula: 'R2 = C₂H₆ ÷ CH₄', explain: 'Compares ethane against methane — both thermal decomposition products at different temperature ranges.',
        numLabel: 'C₂H₆', numVal: g.c2h6, denLabel: 'CH₄', denVal: g.ch4, unit: 'ppm', value: rogers.R2,
        zeroRule: 'If CH₄ is 0: R2 is defined as 0 when C₂H₆ is also 0, otherwise reported as ∞.',
        bands: [{ range: '< 1', label: 'code 0' }, { range: '1 – 3', label: 'code 1' }, { range: '> 3', label: 'code 2' }],
        activeIdx: rogers.R2 < 1 ? 0 : (rogers.R2 <= 3 ? 1 : 2),
        meaning: 'The highlighted band becomes the second digit of the Rogers code.'
      }));
      s.push(ratioSteps(3, {
        label: 'R3', formula: 'R3 = C₂H₄ ÷ C₂H₆', explain: 'Compares ethylene (higher-temperature thermal indicator) against ethane.',
        numLabel: 'C₂H₄', numVal: g.c2h4, denLabel: 'C₂H₆', denVal: g.c2h6, unit: 'ppm', value: rogers.R3,
        zeroRule: 'If C₂H₆ is 0: R3 is defined as 0 when C₂H₄ is also 0, otherwise reported as ∞.',
        bands: [{ range: '< 1', label: 'code 0' }, { range: '1 – 3', label: 'code 1' }, { range: '> 3', label: 'code 2' }],
        activeIdx: rogers.R3 < 1 ? 0 : (rogers.R3 <= 3 ? 1 : 2),
        meaning: 'The highlighted band becomes the third digit of the Rogers code.'
      }));
      s.push(ratioSteps(4, {
        label: 'R4', formula: 'R4 = C₂H₂ ÷ C₂H₄', explain: 'Compares acetylene (a high-energy arcing indicator) against ethylene.',
        numLabel: 'C₂H₂', numVal: g.c2h2, denLabel: 'C₂H₄', denVal: g.c2h4, unit: 'ppm', value: rogers.R4,
        zeroRule: 'If C₂H₄ is 0: R4 is defined as 0 when C₂H₂ is also 0, otherwise reported as ∞.',
        bands: [{ range: '< 0.5', label: 'code 0' }, { range: '0.5 – 3', label: 'code 1' }, { range: '> 3', label: 'code 2' }],
        activeIdx: rogers.R4 < 0.5 ? 0 : (rogers.R4 <= 3 ? 1 : 2),
        meaning: 'The highlighted band becomes the fourth digit of the Rogers code.'
      }));
      s.push(calcStep(5, 'Combine Into the Rogers Code', {
        purpose: 'The four banded digits are read in order (R1 R2 R3 R4) to form the code that the fault table is keyed on.',
        formula: 'Code = digit(R1) digit(R2) digit(R3) digit(R4)',
        result: { label: 'Code', value: rogers.code },
        why: 'Each ratio contributed one digit from its "Compare With the Standard" band above.'
      }));
      s.push(calcStep(6, 'Look Up the Code in the Rogers Table', {
        purpose: 'The code is matched against the fixed Rogers fault table; a code not in the table is Indeterminate.',
        extra: table(['Code(s)', 'Fault'], [
          ['0000, 0100', 'PD'], ['1000, 1100', 'Normal'], ['0010, 0001, 0011', 'D1'],
          ['1201, 0201, 1211, 0211', 'D2'], ['2000, 2100', 'T1'], ['2110, 2210', 'T2'], ['2120, 2220, 2121, 2221', 'T3']
        ]),
        extraLabel: 'Fault Lookup Table',
        why: 'Code ' + rogers.code + (knownCode ? ' matches a row above.' : ' does not match any row above, so the result is Indeterminate.')
      }));
      s.push(diagnosisStep(7, {
        diagnosisLabel: 'Rogers Diagnosis', diagnosis: rogers.fault + ' — ' + rogers.name,
        meaning: rogers.desc, code: rogers.fault
      }));
      s.push(limitationsPanel('The Rogers method leaves many code combinations undefined and should be treated as a supporting cross-check on:',
        ['The Duval Triangle', 'IEC 60599 ratios', 'Gas trends over time']));
      s.push(whatWeLearned([
        { label: 'Ratios', value: 'R1 ' + fmt(rogers.R1) + ' · R2 ' + fmt(rogers.R2) + ' · R3 ' + fmt(rogers.R3) + ' · R4 ' + fmt(rogers.R4) },
        { label: 'Code', value: rogers.code },
        { label: 'Diagnosis', value: rogers.fault + ' — ' + rogers.name },
        { label: 'Engineering Conclusion', value: rogers.desc }
      ]));
      ch.push(chapter('Rogers Ratio Method', 'Rogers 4-ratio', s, true));
    }

    // ── Duval Triangle 1 — engineering textbook worked example ──
    // Every step is built from labeled, visually separated sub-blocks
    // (Purpose / Formula / Substitute Values / Perform Arithmetic / Final
    // Result / Why?) rather than one flowing paragraph. Every number is
    // read from rp.g / rp.duval (already computed by the frozen
    // engine/duval.js) or from window.TAILAM.ui.charts.T1_ZONES (the same
    // frozen boundary table the on-screen SVG draws from). The two
    // arithmetic sub-steps per gas (division, then multiplication by 100)
    // are the SAME single computation duval.js already performs
    // ((gas/total)*100) split into two visible lines for teaching — cross-
    // checked below to equal duval.p* exactly. Step 8's pass/fail checklist
    // marks ✅ only for the zone the engine already reported (duval.zone);
    // it does not re-run the point-in-polygon test itself.
    {
      const total = duval.total || 0;
      const s = [];

      s.push(step(1, 'Select the Gases Used',
        block('✓', 'Purpose', p('Before any calculation can begin, we must identify exactly which gases this method uses — using the wrong gases would produce a meaningless result.')) +
        block('🔢', 'Measured Values', table(['Symbol', 'Gas', 'Measured Value'], [
          ['CH₄', 'Methane', g.ch4 + ' ppm'], ['C₂H₄', 'Ethylene', g.c2h4 + ' ppm'], ['C₂H₂', 'Acetylene', g.c2h2 + ' ppm']
        ])) +
        block('💡', 'Why?', p('These three gases are used because the Duval Triangle was developed using only their relative proportions. Other gases such as H₂, CO, CO₂ and C₂H₆ are ignored by this particular diagnostic method — they are used by other methods instead (Rogers, IEC 60599, Key Gas, TDCG).'))));

      s.push(step(2, 'Calculate the Total',
        block('✓', 'Purpose', p('The Duval Triangle compares proportions rather than absolute gas concentrations. The total is required so each gas can be converted into a percentage.')) +
        block('📐', 'Formula', eq('Total = CH₄ + C₂H₄ + C₂H₂')) +
        block('🔢', 'Substitute Values', sub(['CH₄ = ' + g.ch4 + ' ppm', 'C₂H₄ = ' + g.c2h4 + ' ppm', 'C₂H₂ = ' + g.c2h2 + ' ppm'])) +
        block('🧮', 'Perform Arithmetic', arith(g.ch4 + ' + ' + g.c2h4 + ' + ' + g.c2h2, total + ' ppm')) +
        block('✅', 'Final Result', answerBox('Total', total + ' ppm')) +
        block('💡', 'Why?', p('The Duval Triangle compares proportions rather than absolute gas concentrations. The total is required so each gas can be converted into a percentage — every calculation in Steps 3–5 depends on this number.'))));

      if (total === 0) {
        s.push(step(3, 'Result', block('💡', 'Why?', p('The total is zero, so no percentages can be calculated and Duval Triangle 1 does not apply to this sample.'))));
        ch.push(chapter('Duval Triangle 1', 'IEC 60599:2022 Fig. B.3 — not redrawn here; see Primary Diagnosis', s, true));
      } else {
        // Which of the three gases has the largest share — used only to
        // phrase the Engineering Insight text below (a plain comparison of
        // three already-known numbers for narrative purposes; duval.zone
        // remains the sole authority on the actual diagnosis).
        const domSorted = [
          ['CH₄', 'methane', 'lower-temperature thermal', duval.pCH4],
          ['C₂H₄', 'ethylene', 'higher-temperature thermal', duval.pC2H4],
          ['C₂H₂', 'acetylene', 'electrical-discharge', duval.pC2H2]
        ].slice().sort((a, b) => b[3] - a[3]);
        const domName = domSorted[0][1];

        /**
         * One gas's percentage as a fully expanded, labeled worked example:
         * Purpose, Formula, Substitute Values, Perform Arithmetic (division
         * shown alone, then the ×100 multiplication shown alone), Final
         * Result (rounded), Why?, Engineering Insight. quotient*100 is
         * mathematically identical to duval.p* (the SAME (gas/total)*100
         * expression duval.js already computed) — split into two display
         * lines only; nothing here is recalculated independently.
         */
        function percentStep(n, symbol, gasName, familyName, gasVal, resultPct, purpose, meaning) {
          const quotient = gasVal / total;
          const rawPct = quotient * 100;
          const isDominant = domSorted[0][0] === symbol;
          const insight = isDominant
            ? gasName + ' contributes approximately ' + Math.round(resultPct) + '% of the gases used by the Duval Triangle. Because ' + gasName.toLowerCase() + ' is the dominant gas, the plotted point moves towards the ' + gasName.toLowerCase() + ' corner of the triangle — the region associated with ' + familyName + ' faults. This influences the final fault diagnosis.'
            : gasName + ' contributes approximately ' + Math.round(resultPct) + '% of the gases used by the Duval Triangle. This pulls the plotted point somewhat toward the ' + gasName.toLowerCase() + ' corner, though ' + domName + ' has the larger share here and therefore more influence on the final fault diagnosis.';
          return step(n, 'Calculate the ' + gasName + ' Percentage',
            block('✓', 'Purpose', p(purpose)) +
            block('📐', 'Formula', eq(symbol + '% = (' + symbol + ' ÷ Total) × 100')) +
            block('🔢', 'Substitute Values', sub([symbol + ' = ' + gasVal + ' ppm', 'Total = ' + total + ' ppm']) + eq(symbol + '% = (' + gasVal + ' ÷ ' + total + ') × 100')) +
            block('🧮', 'Perform Arithmetic', arith(gasVal + ' ÷ ' + total, quotient.toFixed(5)) + arith(quotient.toFixed(5) + ' × 100', rawPct.toFixed(3) + '%')) +
            block('✅', 'Final Result (Rounded)', answerBox('%' + symbol, pct(resultPct))) +
            block('💡', 'Why?', p(meaning)) +
            block('💡', 'Engineering Insight', p(insight)));
        }
        // Engineering Notes immediately before the percentage calculations.
        s.push(note('Why percentages instead of ppm?', [
          'Two transformers may have very different absolute gas concentrations.',
          'By converting the gases into percentages, both transformers can be compared on the same Duval Triangle — the triangle reads the relative proportions of the three gases, not their raw amounts.'
        ]));
        s.push(note('A note on rounding', [
          'Internal calculations use full precision.',
          'Values shown in the workbook are rounded for readability. This may cause totals such as 99.9% or 100.1% rather than exactly 100%.'
        ]));

        s.push(percentStep(3, 'CH₄', 'Methane', 'lower-temperature thermal', g.ch4, duval.pCH4,
          'We need to know what share of the three Duval gases is methane, since the triangle plots proportions, not raw ppm values.',
          'This means methane represents approximately ' + Math.round(duval.pCH4) + '% of the three gases used by the Duval Triangle. It does NOT mean methane represents ' + Math.round(duval.pCH4) + '% of all gases inside the transformer.'));
        s.push(percentStep(4, 'C₂H₄', 'Ethylene', 'higher-temperature thermal', g.c2h4, duval.pC2H4,
          'We need to know what share of the three Duval gases is ethylene, for the same reason as methane above.',
          'This means ethylene represents approximately ' + Math.round(duval.pC2H4) + '% of the three gases used by the Duval Triangle. It does NOT mean ethylene represents ' + Math.round(duval.pC2H4) + '% of all gases inside the transformer.'));
        s.push(percentStep(5, 'C₂H₂', 'Acetylene', 'electrical-discharge', g.c2h2, duval.pC2H2,
          'We need to know what share of the three Duval gases is acetylene — even a small share of acetylene is diagnostically significant.',
          'This means acetylene represents approximately ' + Math.round(duval.pC2H2) + '% of the three gases used by the Duval Triangle. It does NOT mean acetylene represents ' + Math.round(duval.pC2H2) + '% of all gases inside the transformer.'));

        const rawSum = duval.pCH4 + duval.pC2H4 + duval.pC2H2;
        const roundedSum = Number(duval.pCH4.toFixed(1)) + Number(duval.pC2H4.toFixed(1)) + Number(duval.pC2H2.toFixed(1));
        const verified = Math.abs(roundedSum - 100) < 0.5;
        s.push(step(6, 'Verify the Percentages',
          block('✓', 'Purpose', p('A genuine Duval Triangle point can only exist if the three percentages add up to 100% — this step proves that they do before the result is trusted.')) +
          block('🧮', 'Perform Arithmetic', arith(duval.pCH4.toFixed(1) + '% + ' + duval.pC2H4.toFixed(1) + '% + ' + duval.pC2H2.toFixed(1) + '%', roundedSum.toFixed(1) + '%')) +
          block('✅', 'Final Result', answerBox('Total', roundedSum.toFixed(1) + '%') + verifiedBadge(verified)) +
          block('💡', 'Why?', p('A valid Duval Triangle requires the three percentages to total 100%. Small differences such as 99.9% or 100.1% occur because displayed values are rounded. Internally, before rounding, the exact values are ' +
            (g.ch4 / total * 100).toFixed(6) + '%, ' + (g.c2h4 / total * 100).toFixed(6) + '%, and ' + (g.c2h2 / total * 100).toFixed(6) + '%, which sum to exactly ' + rawSum.toFixed(6) + '%.')) +
          block('💡', 'Engineering Insight', p('The percentages must total approximately 100%. This confirms that the normalisation process has been performed correctly. Small differences such as 99.9% or 100.1% are caused by rounding.'))));

        s.push(step(7, 'Create the Duval Coordinates',
          block('✓', 'Purpose', p('These percentages are not just descriptive numbers — they become the exact coordinates used to plot this sample as a single point inside the triangle.')) +
          block('✅', 'Coordinates', table(['Gas', 'Percentage'], [['CH₄', pct(duval.pCH4)], ['C₂H₄', pct(duval.pC2H4)], ['C₂H₂', pct(duval.pC2H2)]])) +
          block('💡', 'Why?', p('These three percentages always total 100%. Because of this, they uniquely define a single point inside the triangle — once any two of them are known, the third is fixed, so there is only one place on the triangle where all three values are satisfied at once.')) +
          block('💡', 'Engineering Insight', p('The percentages are used as the location of the point inside the Duval Triangle. Every unique combination of percentages produces one unique point.'))));

        s.push(step(8, 'Locate the Point',
          block('✓', 'Purpose', p('Knowing the coordinates is not enough on its own — we must determine which of the triangle’s fault regions actually contains this point.')) +
          block('🧮', 'Compare Against Every Region', p('The calculated point was compared with every IEC 60599 fault region:') + zoneChecklist(charts.T1_ZONES || [], duval.zone)) +
          block('💡', 'Why?', p('The calculated point lies inside the ' + duval.zone + ' boundary. Therefore the Duval diagnosis is ' + duval.zone + '.')) +
          block('💡', 'Engineering Insight', p('Because only the ' + duval.zone + ' region contains the calculated point, the Duval diagnosis is ' + duval.zone + '.'))));

        s.push(note('Categorical, not statistical', [
          'The Duval Triangle does not calculate a probability.',
          'It simply determines which IEC fault region contains the calculated point. The diagnosis is therefore categorical (which region) rather than statistical (how likely).'
        ]));

        // Expanded final-diagnosis card. duval.zone / duval.name / duval.desc
        // are the engine's own outputs; Typical Causes / Follow-up are fixed
        // educational context from FAULT_DETAIL — nothing is recomputed.
        const zd = FAULT_DETAIL[duval.zone] || { causes: [], followup: [] };
        s.push(step(9, 'Final Engineering Diagnosis',
          block('✅', 'Calculated Zone', answerBox('Zone', duval.zone)) +
          block('🏷', 'Fault Name', p(duval.name)) +
          block('💡', 'Engineering Meaning', p(duval.desc)) +
          (zd.causes.length ? block('🔍', 'Typical Causes', bulletList(zd.causes)) : '') +
          (zd.followup.length ? block('🛠', 'Typical Follow-up Actions', bulletList(zd.followup)) : '')));

        s.push(summaryPanel('What We Learned', [
          { label: 'Total Gas', value: total + ' ppm (CH₄ ' + g.ch4 + ' + C₂H₄ ' + g.c2h4 + ' + C₂H₂ ' + g.c2h2 + ')' },
          { label: 'Percentages', value: 'CH₄ ' + pct(duval.pCH4) + ' · C₂H₄ ' + pct(duval.pC2H4) + ' · C₂H₂ ' + pct(duval.pC2H2) },
          { label: 'Coordinates', value: '(' + duval.pCH4.toFixed(1) + ', ' + duval.pC2H4.toFixed(1) + ', ' + duval.pC2H2.toFixed(1) + ')' },
          { label: 'Zone', value: duval.zone },
          { label: 'Fault Type', value: duval.name },
          { label: 'Engineering Conclusion', value: 'The calculated point falls inside the ' + duval.zone + ' region defined by IEC 60599. ' + duval.desc }
        ]));

        s.push(limitationsPanel(
          'The Duval Triangle should not be used in isolation. Its diagnosis should always be interpreted together with:',
          ['Gas trends over time', 'IEEE interpretation', 'IEC ratio methods', 'Maintenance history', 'Loading history', 'Visual inspection']
        ));

        ch.push(chapter('Duval Triangle 1', 'IEC 60599:2022 Fig. B.3 — not redrawn here; see Primary Diagnosis', s, true));
      }
    }

    // ── Key Gas Method ──
    {
      const dom = keygas.dominant || [];
      const s = [];
      s.push(note('Why is one gas "dominant"?', [
        'Different faults release different gases most strongly — arcing produces acetylene, hot spots produce ethylene, partial discharge produces hydrogen. So the single gas present in the largest amount points toward the fault family that produced it.'
      ]));
      s.push(calcStep(1, 'Rank the Combustible Gases by ppm', {
        purpose: 'Key Gas works on raw ppm dominance, not percentages — the gas with the highest measured value is examined first.',
        extra: table(['Rank', 'Gas', 'Value'], dom.map((d, i) => [String(i + 1), d[0], d[1] + ' ppm'])),
        extraLabel: 'Gas Ranking',
        result: { label: 'Dominant Gas', value: dom[0] ? dom[0][0] + ' (' + dom[0][1] + ' ppm)' : '—' }
      }));
      s.push(calcStep(2, 'Apply the Decision Rule', {
        purpose: 'The dominant gas (and a few supporting checks) are matched against a fixed set of patterns, top to bottom.',
        extra: table(['Rule (checked in order)', 'Fault if matched'], [
          ['C₂H₂ dominant, higher than both H₂ and CH₄', 'D2 — High Energy Discharge'],
          ['H₂ and C₂H₂ (> 5 ppm) both elevated', 'D1 — Low Energy Discharge'],
          ['H₂ dominant with low hydrocarbons', 'PD — Partial Discharge'],
          ['C₂H₄ dominant, C₂H₂ < 5 ppm', 'T3 — Thermal > 700 °C'],
          ['CH₄ or C₂H₆ dominant, C₂H₄ below CH₄, C₂H₂ < 5 ppm', 'T1 — Thermal < 300 °C'],
          ['CO > 350 ppm (none of the above matched)', 'C — Cellulose Degradation'],
          ['none of the above', 'N — Normal / Inconclusive']
        ]),
        extraLabel: 'Decision Rules',
        why: 'This sample’s dominant gas is ' + (dom[0] ? dom[0][0] : '—') + ' — matched against these rules in order to reach the diagnosis below.'
      }));
      s.push(diagnosisStep(3, {
        diagnosisLabel: 'Key Gas Diagnosis', diagnosis: keygas.fault + ' — ' + keygas.name,
        meaning: keygas.desc, code: keygas.fault
      }));
      s.push(limitationsPanel('The Key Gas method is a fast pattern screen and is less precise than the ratio methods; confirm with:',
        ['The Duval Triangle', 'IEC 60599 / Rogers ratios', 'Gas trends over time']));
      s.push(whatWeLearned([
        { label: 'Dominant Gas', value: dom[0] ? dom[0][0] + ' (' + dom[0][1] + ' ppm)' : '—' },
        { label: 'Diagnosis', value: keygas.fault + ' — ' + keygas.name },
        { label: 'Engineering Conclusion', value: keygas.desc }
      ]));
      ch.push(chapter('Key Gas Method', 'IEEE C57.104 — dominant-gas pattern', s, true));
    }

    // ── TDCG ──
    {
      const parts = [['H₂', g.h2], ['CH₄', g.ch4], ['C₂H₆', g.c2h6], ['C₂H₄', g.c2h4], ['C₂H₂', g.c2h2], ['CO', g.co]];
      let running = 0;
      const rows = parts.map(([label, val]) => { running += val; return [label, val + ' ppm', running.toFixed(0) + ' ppm']; });
      const tdcgFollowup = { 1: ['Continue the normal sampling interval', 'Review the rate-of-gas-generation trend'], 2: ['Sample every 3 months', 'Perform trend analysis'], 3: ['Sample frequently', 'Exercise caution on loading', 'Plan a detailed inspection'], 4: ['Immediate inspection', 'Consider de-energizing the unit'] }[keygas.tdcgCond] || [];
      const s = [];
      s.push(note('What does TDCG tell us?', [
        'TDCG measures the overall amount of combustible gas, i.e. how much gassing is happening in total — a severity measure. It does not identify the fault type; the ratio and triangle methods do that.'
      ]));
      s.push(calcStep(1, 'Sum the Combustible Gases', {
        purpose: 'Total Dissolved Combustible Gas adds up every combustible gas to gauge overall gassing severity.',
        formula: 'TDCG = H₂ + CH₄ + C₂H₆ + C₂H₄ + C₂H₂ + CO',
        extra: table(['Gas', 'Value', 'Running Total'], rows),
        extraLabel: 'Addition (Running Total)',
        result: { label: 'TDCG', value: keygas.TDCG + ' ppm' },
        insight: 'CO₂ is deliberately excluded — it is not a combustible gas.'
      }));
      s.push(calcStep(2, 'Compare With IEEE C57.104 Condition Bands', {
        purpose: 'The total is placed into one of four severity bands that guide the sampling interval and level of concern.',
        extra: compare([{ range: '< 720', label: 'Condition 1 — Normal' }, { range: '720 – 1919', label: 'Condition 2 — Caution' }, { range: '1920 – 4629', label: 'Condition 3 — High' }, { range: '≥ 4630', label: 'Condition 4 — Critical' }], keygas.tdcgCond - 1),
        extraLabel: 'Condition Bands',
        result: { label: 'Condition', value: keygas.tdcgName },
        why: keygas.tdcgDesc
      }));
      s.push(step(3, 'Condition Meaning & Follow-up',
        block('💡', 'Engineering Meaning', p(keygas.tdcgDesc)) +
        (tdcgFollowup.length ? block('🛠', 'Typical Follow-up Actions', bulletList(tdcgFollowup)) : '')));
      s.push(limitationsPanel('TDCG measures severity only, not the fault type. Always pair it with:',
        ['The Duval Triangle', 'IEC 60599 / Rogers ratios', 'Individual-gas (IEEE) conditions']));
      s.push(whatWeLearned([
        { label: 'TDCG', value: keygas.TDCG + ' ppm' },
        { label: 'Condition', value: keygas.tdcgName },
        { label: 'Engineering Conclusion', value: keygas.tdcgDesc }
      ]));
      ch.push(chapter('TDCG (Total Dissolved Combustible Gas)', 'IEEE C57.104', s, true));
    }

    // ── CO₂ / CO Paper Involvement ──
    if (paper && paper.coRatio !== null) {
      const s = [];
      s.push(note('Why the CO₂/CO ratio?', [
        'Both CO₂ and CO come from the cellulose (paper) insulation. Their ratio distinguishes slow thermal ageing (high ratio) from more aggressive, often electrically-driven paper degradation (low ratio).'
      ]));
      s.push(calcStep(1, 'Calculate the CO₂/CO Ratio', {
        purpose: 'The ratio of carbon dioxide to carbon monoxide indicates whether the paper insulation is being thermally or electrically stressed.',
        formula: 'CO₂/CO = CO₂ ÷ CO',
        subs: ['CO₂ = ' + g.co2 + ' ppm', 'CO = ' + g.co + ' ppm'],
        arith: [[g.co2 + ' ÷ ' + g.co, paper.coRatio.toFixed(2)]],
        result: { label: 'CO₂/CO', value: paper.coRatio.toFixed(2) }
      }));
      s.push(step(2, 'Interpretation', block('💡', 'Engineering Meaning', p(paper.text))));
      s.push(limitationsPanel('This ratio only addresses paper involvement, and is sensitive at low CO levels. Read it alongside:',
        ['The fault-type methods (Duval, ratios)', 'CO / CO₂ trends over time']));
      s.push(whatWeLearned([
        { label: 'CO₂/CO', value: paper.coRatio.toFixed(2) },
        { label: 'Engineering Conclusion', value: paper.text }
      ]));
      ch.push(chapter('CO₂/CO Paper Involvement', 'IEC 60599 §5.5', s));
    }

    // ── IEEE C57.104 Individual Gas Evaluation ──
    {
      const worst = ieee.rows.filter((r) => r.cond === ieee.maxCond).map((r) => r.gas.toUpperCase()).join(', ');
      const ieeeFollowup = { 1: ['Continue routine sampling per schedule'], 2: ['Increase sampling frequency', 'Investigate the trend'], 3: ['Reduce loading if possible', 'Plan a detailed inspection'], 4: ['Immediate action required', 'Consider de-energizing and inspection'] }[ieee.maxCond] || [];
      const s = [];
      s.push(note('Why check each gas separately?', [
        'A fault may push just one gas to a dangerous level while the others stay low. Checking every gas against its own limits catches that, and the worst single gas sets the overall condition.'
      ]));
      s.push(calcStep(1, 'Compare Each Gas Against Its Three Limits', {
        purpose: 'Every gas is checked against three published limits, assigning it a condition from 1 (normal) to 4 (critical).',
        extra: table(['Gas', 'Value', 'C1 max', 'C2 max', 'C3 max', 'Condition'], ieee.rows.map((r) => [r.gas.toUpperCase(), r.val, r.lims[0], r.lims[1], r.lims[2], 'C' + r.cond])),
        extraLabel: 'Per-Gas Conditions',
        why: 'At or below C1 max = Condition 1; above C1 up to C2 max = Condition 2; above C2 up to C3 max = Condition 3; above C3 max = Condition 4.'
      }));
      s.push(step(2, 'The Worst Gas Sets the Overall Condition',
        block('✅', 'Overall Condition', answerBox('Condition', ieee.condName)) +
        block('💡', 'Engineering Meaning', p('Condition ' + ieee.maxCond + ' was set by: ' + worst + '. ' + ieee.desc)) +
        (ieeeFollowup.length ? block('🛠', 'Typical Follow-up Actions', bulletList(ieeeFollowup)) : '')));
      s.push(limitationsPanel('Individual-gas conditions report severity, not the fault type. Combine with:',
        ['The Duval Triangle', 'IEC 60599 / Rogers ratios', 'TDCG severity']));
      s.push(whatWeLearned([
        { label: 'Worst Gas', value: worst || '—' },
        { label: 'Overall Condition', value: ieee.condName },
        { label: 'Engineering Conclusion', value: ieee.desc }
      ]));
      ch.push(chapter('IEEE C57.104 Individual Gas Evaluation', 'IEEE C57.104 Table 1', s, true));
    }

    // ── Doernenburg Method ──
    {
      const s = [];
      const rr = [
        { l: 'R1', f: 'CH₄ ÷ H₂', a: g.ch4, b: g.h2, v: doern.R1 },
        { l: 'R2', f: 'C₂H₂ ÷ C₂H₄', a: g.c2h2, b: g.c2h4, v: doern.R2 },
        { l: 'R3', f: 'C₂H₂ ÷ CH₄', a: g.c2h2, b: g.ch4, v: doern.R3 },
        { l: 'R4', f: 'C₂H₆ ÷ C₂H₂', a: g.c2h6, b: g.c2h2, v: doern.R4 }
      ];
      s.push(note('How does Doernenburg decide?', [
        'Each of the four ratios "votes" for Thermal, Arcing or Corona based on where it falls. The category with the most votes wins — a majority-vote approach rather than a single lookup.'
      ]));
      s.push(calcStep(1, 'Calculate the Four Ratios', {
        purpose: 'Four gas ratios are computed; each will cast a vote in the next step.',
        extra: table(['Ratio', 'Formula', 'Substitution', 'Value'], rr.map((r) => [r.l, r.f, r.a + ' ÷ ' + r.b, fmt(r.v)])),
        extraLabel: 'The Four Ratios',
        why: 'If the denominator gas is below the 5 ppm detection limit, the ratio cannot be reliably measured and is reported as N/A (it casts no vote).'
      }));
      s.push(calcStep(2, 'Each Valid Ratio Casts a Vote', {
        purpose: 'Each ratio is compared against fixed thresholds and votes for a fault category; the majority wins.',
        why: 'R1 > 1.0 votes Thermal, R1 < 0.1 votes Corona, else Arcing. R2 < 0.75 votes Thermal, else Arcing. R3 < 0.3 votes Thermal + Corona, else Arcing. R4 > 0.4 votes Thermal + Corona, else Arcing. If every ratio is N/A the result is Indeterminate.'
      }));
      s.push(diagnosisStep(3, {
        diagnosisLabel: 'Doernenburg Diagnosis', diagnosis: doern.fault + ' — ' + doern.name,
        meaning: doern.desc, code: doern.fault
      }));
      s.push(limitationsPanel('Doernenburg needs gases above the detection limit and is largely superseded; treat as a legacy cross-check on:',
        ['The Duval Triangle', 'IEC 60599 ratios']));
      s.push(whatWeLearned([
        { label: 'Ratios', value: 'R1 ' + fmt(doern.R1) + ' · R2 ' + fmt(doern.R2) + ' · R3 ' + fmt(doern.R3) + ' · R4 ' + fmt(doern.R4) },
        { label: 'Diagnosis', value: doern.fault + ' — ' + doern.name },
        { label: 'Engineering Conclusion', value: doern.desc }
      ]));
      ch.push(chapter('Doernenburg Method', 'Legacy IEEE ratio method', s, true));
    }

    // ── CIGRE Five-Key-Ratio Method ──
    {
      const s = [];
      const rr = [
        { l: 'K1', f: 'C₂H₂ ÷ C₂H₆', a: g.c2h2, b: g.c2h6, v: cigre.k1 },
        { l: 'K2', f: 'H₂ ÷ CH₄', a: g.h2, b: g.ch4, v: cigre.k2 },
        { l: 'R1', f: 'C₂H₄ ÷ C₂H₆', a: g.c2h4, b: g.c2h6, v: cigre.r1 },
        { l: 'R2', f: 'CO₂ ÷ CO', a: g.co2, b: g.co, v: cigre.r2 },
        { l: 'R3', f: 'C₂H₂ ÷ H₂', a: g.c2h2, b: g.h2, v: cigre.r3 }
      ];
      const flagCount = (cigre.flags || []).filter((f) => f.cls && f.cls !== 'ok').length;
      s.push(note('How is CIGRE different?', [
        'Instead of producing one diagnosis, CIGRE raises independent flags. Each ratio is checked against a threshold, and any that trips draws attention to a specific fault pattern. A sample can raise several flags, or none.'
      ]));
      s.push(calcStep(1, 'Calculate the Five Ratios', {
        purpose: 'Five key ratios are computed; each will be checked against its own flag threshold next.',
        extra: table(['Ratio', 'Formula', 'Substitution', 'Value'], rr.map((r) => [r.l, r.f, r.a + ' ÷ ' + r.b, fmt(r.v, r.l === 'R2' ? 2 : 3)])),
        extraLabel: 'The Five Ratios',
        why: 'If the denominator gas is 0 ppm, that ratio is undefined and reported as N/A.'
      }));
      s.push(calcStep(2, 'Check Each Flag Threshold', {
        purpose: 'Every ratio is compared against its trigger; a "✓ Yes" means that fault-pattern flag has been raised.',
        extra: table(['Flag', 'Trigger', 'Triggered?'], [
          ['K1 — Electrical Discharge', 'K1 > 1', cigre.k1 !== null && cigre.k1 > 1 ? '✓ Yes' : 'No'],
          ['K2 — Partial Discharge', 'K2 > 10', cigre.k2 !== null && cigre.k2 > 10 ? '✓ Yes' : 'No'],
          ['R1 — Thermal Fault', 'R1 > 1', cigre.r1 !== null && cigre.r1 > 1 ? '✓ Yes' : 'No'],
          ['R2 — Paper Overheating', 'R2 > 10', cigre.r2 !== null && cigre.r2 > 10 ? '✓ Yes' : 'No'],
          ['R2 — Electrical Fault on Paper', 'R2 < 3', cigre.r2 !== null && cigre.r2 < 3 ? '✓ Yes' : 'No'],
          ['R3 — OLTC Contamination', 'R3 > 2 and C₂H₂ > 30 ppm', (cigre.r3 !== null && cigre.r3 > 2 && g.c2h2 > 30) ? '✓ Yes' : 'No']
        ]),
        extraLabel: 'Flag Thresholds'
      }));
      s.push(step(3, 'Flags Raised',
        block('✅', 'Result', answerBox('Flags raised', flagCount + ' fault-pattern flag(s)')) +
        block('💡', 'Engineering Meaning', (cigre.flags || []).length
          ? table(['Flag', 'Detail', 'Verdict'], cigre.flags.map((f) => [f.name, f.detail, f.verdict]))
          : p('No CIGRE flag triggered — every ratio is within its normal range.'))));
      s.push(limitationsPanel('CIGRE flags patterns rather than giving a single diagnosis. Use the flags as pointers alongside:',
        ['The Duval Triangle', 'IEC 60599 / Rogers ratios', 'The specific gas trends the flag concerns']));
      s.push(whatWeLearned([
        { label: 'Ratios', value: 'K1 ' + fmt(cigre.k1) + ' · K2 ' + fmt(cigre.k2) + ' · R1 ' + fmt(cigre.r1) + ' · R2 ' + fmt(cigre.r2, 2) + ' · R3 ' + fmt(cigre.r3) },
        { label: 'Flags Raised', value: flagCount + ' fault-pattern flag(s)' },
        { label: 'Engineering Conclusion', value: (cigre.flags || []).map((f) => f.name).join(' · ') || 'No significant fault pattern flagged.' }
      ]));
      ch.push(chapter('CIGRE Five-Key-Ratio Method', 'CIGRE TB 771', s, true));
    }

    // ── Dissolved Oxygen ──
    if (o2info) {
      const s = [];
      s.push(note('Is oxygen a fault gas?', [
        'No. Oxygen is not produced by internal faults — its level shows whether air has entered the system. In a sealed transformer a high O₂ level points to a leak (gasket, conservator seal or valve).'
      ]));
      s.push(calcStep(1, 'Read the Measured Oxygen', {
        purpose: 'The dissolved-oxygen concentration is taken directly from the sample.',
        result: { label: 'O₂', value: g.o2 + ' ppm' }
      }));
      s.push(calcStep(2, 'Compare With the Standard', {
        purpose: 'The measured value is placed into one of four bands describing likely air ingress / oxidation state.',
        extra: compare([{ range: '< 1000', label: 'Very Low' }, { range: '1000 – 4999', label: 'Low/Normal (sealed tank)' }, { range: '5000 – 14999', label: 'Normal–Elevated' }, { range: '≥ 15000', label: 'High — possible air ingress' }], g.o2 < 1000 ? 0 : (g.o2 < 5000 ? 1 : (g.o2 < 15000 ? 2 : 3))),
        extraLabel: 'Oxygen Bands',
        result: { label: 'Result', value: o2info.label },
        why: o2info.desc
      }));
      s.push(limitationsPanel('Interpretation depends on the tank design (sealed vs. air-breathing). Read alongside:',
        ['Oil acidity / moisture results', 'Seal and gasket inspection', 'The unit’s design type']));
      s.push(whatWeLearned([
        { label: 'O₂', value: g.o2 + ' ppm' },
        { label: 'Assessment', value: o2info.label },
        { label: 'Engineering Conclusion', value: o2info.desc }
      ]));
      ch.push(chapter('Dissolved Oxygen Assessment', 'IEC 60422', s));
    }

    // ── Transformer Health Index — accounting-ledger style ──
    {
      const thi = window.TAILAM.engine.thi.calcRiskScoreBreakdown(duval, rogers, iec, ieee, keygas);
      const health = window.TAILAM.engine.thi.healthCategoryFor(thi.score);
      const s = [];
      s.push(note('Why weight the methods?', [
        'Each method sees a different part of the picture. The THI combines them into one 0–100 score, giving the strongest indicators (like the Duval Triangle) more weight, so a single number can prioritise a unit at a glance.'
      ]));
      let running = 0;
      thi.components.forEach((c, i) => {
        running += c.weighted;
        s.push(calcStep(i + 1, c.label + ' Contribution', {
          purpose: 'This method’s result maps to a component score, which is multiplied by its fixed weight and added to the running total.',
          formula: c.componentScore + ' × ' + c.weight + ' = ' + c.weighted.toFixed(2),
          subs: ['Input: ' + c.input, 'Component score: ' + c.componentScore, 'Weight: ' + c.weight],
          result: { label: 'Running Total', value: running.toFixed(2) }
        }));
      });
      s.push(calcStep(thi.components.length + 1, 'Final THI', {
        purpose: 'The weighted contributions are summed and rounded to give the final 0–100 health index.',
        formula: 'THI = round(' + thi.components.map((c) => c.weighted.toFixed(2)).join(' + ') + ')',
        arith: [[thi.rawSum.toFixed(3), String(thi.score)]],
        result: { label: 'Final THI', value: thi.score + ' / 100' },
        insight: 'A lower score is healthier. This sample falls in the "' + health.label + '" band.'
      }));
      s.push(limitationsPanel('The THI is an internal composite, not a published standard, and is only as good as the methods feeding it. It supports — never replaces — the individual diagnoses above.',
        ['Read the underlying methods, not just the score', 'Track the score’s trend over time', 'Apply engineering judgement']));
      s.push(whatWeLearned([
        { label: 'Contributions', value: thi.components.map((c) => c.label + ' ' + c.weighted.toFixed(2)).join(' · ') },
        { label: 'Final THI', value: thi.score + ' / 100' },
        { label: 'Health Band', value: health.label }
      ]));
      ch.push(chapter('Transformer Health Index', 'Weighted composite, 0–100', s, true));
    }

    // ── Confidence Assessment ──
    {
      const dCat = normalizeForConsensus(duval.zone), rCat = normalizeForConsensus(rogers.fault), iCat = normalizeForConsensus(iec.fault);
      const agreeing = [rCat === dCat, iCat === dCat].filter(Boolean).length;
      const s = [];
      s.push(note('What is confidence measuring?', [
        'Confidence measures how strongly the primary methods agree, not whether the diagnosis is correct. When independent methods reach the same fault family, the result is more trustworthy.'
      ]));
      s.push(calcStep(1, 'Categorize Each Method’s Result', {
        purpose: 'The three primary methods are grouped into fault families so codes that look different but mean the same thing can be compared.',
        extra: table(['Method', 'Raw Result', 'Category'], [['Duval Triangle 1 (reference)', duval.zone, dCat], ['Rogers Ratio', rogers.fault, rCat], ['IEC 60599', iec.fault, iCat]]),
        extraLabel: 'Normalised Categories',
        why: 'Grouping into families (PD/D1/D2/DT/T1/T2/T3, "Normal", or "Other") lets differently-worded results be compared fairly.'
      }));
      s.push(calcStep(2, 'Count Agreement With Duval', {
        purpose: 'Each supporting method is checked against the Duval reference; the agreements are counted.',
        extra: table(['Method', 'Agrees With Duval?'], [['Rogers Ratio', rCat === dCat ? 'Yes' : 'No'], ['IEC 60599', iCat === dCat ? 'Yes' : 'No']]),
        extraLabel: 'Agreement Count',
        result: { label: 'Methods agreeing (of 2 supporting)', value: String(agreeing) }
      }));
      s.push(calcStep(3, 'Determine the Agreement Level', {
        purpose: 'The number of agreeing methods maps to a High / Moderate / Low agreement level.',
        extra: compare([{ range: '3 of 3 match', label: 'High' }, { range: '2 of 3 match', label: 'Moderate' }, { range: '≤ 1 of 3 match', label: 'Low' }], agree.agreeLevel === 'High' ? 0 : (agree.agreeLevel === 'Moderate' ? 1 : 2)),
        extraLabel: 'Agreement Level',
        result: { label: 'Agreement', value: agree.agreeLevel }
      }));
      s.push(calcStep(4, 'Convert to a Confidence Percentage', {
        purpose: 'The agreement level maps to a fixed confidence percentage — a lookup, not a formula.',
        extra: table(['Agreement', 'Confidence'], [['High', '92%'], ['Moderate', '68%'], ['Low', '42%']]),
        extraLabel: 'Confidence Lookup',
        result: { label: 'Confidence', value: agree.agreeLevel + ' — ' + agree.confidence + '%' },
        insight: 'High agreement raises confidence; it never proves the diagnosis, since all methods can share a blind spot.'
      }));
      s.push(limitationsPanel('Agreement is not the same as correctness. Interpret confidence alongside:',
        ['Gas trends over time', 'Operating and maintenance history', 'Any single method that strongly disagrees']));
      s.push(whatWeLearned([
        { label: 'Methods Agreeing', value: agreeing + ' of 2 supporting' },
        { label: 'Agreement Level', value: agree.agreeLevel },
        { label: 'Confidence', value: agree.confidence + '%' }
      ]));
      ch.push(chapter('Confidence Assessment', 'Duval × Rogers × IEC 60599', s));
    }

    // ── Recommendation Logic ──
    {
      const s = [];
      s.push(note('Where does the recommendation come from?', [
        'Each Duval fault zone has one pre-written maintenance recommendation, authored by engineering judgement for that specific fault type. The workbook looks up the zone and returns its recommendation — it does not generate new advice.'
      ]));
      s.push(calcStep(1, 'Take the Primary Diagnosis as Input', {
        purpose: 'The recommendation is keyed on the primary (Duval Triangle 1) fault zone.',
        result: { label: 'Duval Triangle 1 Zone', value: duval.zone }
      }));
      s.push(calcStep(2, 'Apply the Zone-Keyed Lookup', {
        purpose: 'The zone selects one fixed recommendation from a lookup table — a direct 1:1 mapping.',
        why: 'There is exactly one pre-written recommendation per zone. The Transformer Health Index score is accepted for interface compatibility but does not change which recommendation is selected.'
      }));
      s.push(step(3, 'Final Recommendation',
        block('✅', 'Recommendation', p(rec))));
      s.push(limitationsPanel('This is generic per-zone guidance, not a substitute for engineering judgement and site knowledge. Weigh it against:',
        ['The unit’s maintenance and loading history', 'The confidence in the diagnosis', 'Local operating constraints']));
      s.push(whatWeLearned([
        { label: 'Input Zone', value: duval.zone },
        { label: 'Recommendation', value: rec }
      ]));
      ch.push(chapter('Recommendation Logic', 'Zone-keyed lookup', s, true));
    }

    ch.push(referencesChapter());
    return [buildToc()].concat(ch);
  }

  function renderMainDetailed(rp) {
    const el = document.getElementById('detailed-main');
    if (!el) return;
    el.innerHTML = buildMainChapters(rp).join('');
  }

  // ══════════════════════════════════════════════════════════════════════
  // OLTC
  // ══════════════════════════════════════════════════════════════════════

  function buildOltcChapters(rp) {
    resetWorkbookCounters('oltc');
    const { og, taps, duval2, oltcRes, xcontam } = rp;
    const charts = window.TAILAM.ui.charts;
    const ch = [];

    ch.push(chapter('Gas Concentrations', 'As entered', [
      table(['Gas', 'Measured', 'Unit', 'What it indicates'], [
        ['H₂', og.h2, 'ppm', GAS_MEANING.h2], ['CH₄', og.ch4, 'ppm', GAS_MEANING.ch4], ['C₂H₆', og.c2h6, 'ppm', GAS_MEANING.c2h6],
        ['C₂H₄', og.c2h4, 'ppm', GAS_MEANING.c2h4], ['C₂H₂', og.c2h2, 'ppm', GAS_MEANING.c2h2], ['CO', og.co, 'ppm', GAS_MEANING.co], ['CO₂', og.co2, 'ppm', GAS_MEANING.co2],
        ['Tap Change Count', taps > 0 ? taps : 'Not entered', taps > 0 ? 'ops' : '', 'Number of tap-changer operations since the last oil change — used to normalize C₂H₂ generation.']
      ])
    ], true));

    {
      const total = duval2.total || 0;
      const s = [];
      s.push(note('Same triangle, different compartment', [
        'Duval Triangle 2 uses the same three gases and the same percentage method as the main-tank triangle, but with boundaries drawn for on-load tap-changer duty (IEC 60599:2022 Fig. B.4), where routine switching normally produces some arcing.'
      ]));
      s.push(calcStep(1, 'Add the Three Gases', {
        purpose: 'The triangle plots proportions, so the total of the three gases is needed first.',
        formula: 'Total = CH₄ + C₂H₄ + C₂H₂',
        subs: ['CH₄ = ' + og.ch4 + ' ppm', 'C₂H₄ = ' + og.c2h4 + ' ppm', 'C₂H₂ = ' + og.c2h2 + ' ppm'],
        arith: [[og.ch4 + ' + ' + og.c2h4 + ' + ' + og.c2h2, total + ' ppm']],
        result: { label: 'Total', value: total + ' ppm' }
      }));
      if (total === 0) {
        s.push(step(2, 'Result', block('💡', 'Why?', p('The total is zero, so Duval Triangle 2 does not apply to this sample.'))));
        ch.push(chapter('Duval Triangle 2', 'IEC 60599:2022 Fig. B.4 — not redrawn here; see Primary Diagnosis', s, true));
      } else {
        s.push(calcStep(2, 'Calculate CH₄ %', {
          formula: '%CH₄ = (CH₄ ÷ Total) × 100', subs: ['CH₄ = ' + og.ch4 + ' ppm', 'Total = ' + total + ' ppm'],
          arith: [[og.ch4 + ' ÷ ' + total + ' × 100', pct(duval2.pCH4)]], result: { label: '%CH₄', value: pct(duval2.pCH4) }
        }));
        s.push(calcStep(3, 'Calculate C₂H₄ %', {
          formula: '%C₂H₄ = (C₂H₄ ÷ Total) × 100', subs: ['C₂H₄ = ' + og.c2h4 + ' ppm', 'Total = ' + total + ' ppm'],
          arith: [[og.c2h4 + ' ÷ ' + total + ' × 100', pct(duval2.pC2H4)]], result: { label: '%C₂H₄', value: pct(duval2.pC2H4) }
        }));
        s.push(calcStep(4, 'Calculate C₂H₂ %', {
          formula: '%C₂H₂ = (C₂H₂ ÷ Total) × 100', subs: ['C₂H₂ = ' + og.c2h2 + ' ppm', 'Total = ' + total + ' ppm'],
          arith: [[og.c2h2 + ' ÷ ' + total + ' × 100', pct(duval2.pC2H2)]], result: { label: '%C₂H₂', value: pct(duval2.pC2H2) }
        }));
        s.push(calcStep(5, 'Verify the Percentages', {
          purpose: 'The three percentages must total 100% for a valid point.',
          arith: [[duval2.pCH4.toFixed(1) + '% + ' + duval2.pC2H4.toFixed(1) + '% + ' + duval2.pC2H2.toFixed(1) + '%', (duval2.pCH4 + duval2.pC2H4 + duval2.pC2H2).toFixed(1) + '%']],
          why: 'Each is a share of the same total, so they always sum to 100% (small ±0.1% differences above come only from independent rounding).'
        }));
        s.push(calcStep(6, 'Create the Coordinates', {
          purpose: 'The three percentages are the plotting coordinates — no separate calculation is needed.',
          result: { label: 'Point (%CH₄, %C₂H₄, %C₂H₂)', value: '(' + duval2.pCH4.toFixed(1) + ', ' + duval2.pC2H4.toFixed(1) + ', ' + duval2.pC2H2.toFixed(1) + ')' }
        }));
        s.push(calcStep(7, 'Locate the Point', {
          purpose: 'The coordinates are compared against every OLTC fault region defined by IEC 60599:2022 Fig. B.4.',
          extra: zoneChecklist(charts.T2_ZONES || [], duval2.zone),
          extraLabel: 'Compare Against Every Region',
          extraIcon: '🧮',
          why: 'The calculated point lies inside the ' + duval2.zone + ' region.' + (duval2.belowTypical ? ' All gas amounts are still below their typical values, so this is flagged as an early pattern, not yet an active fault (see the "Below Typical" chapter below).' : '')
        }));
        s.push(diagnosisStep(8, {
          diagnosisLabel: 'Duval Triangle 2 Zone', diagnosis: duval2.zone + (duval2.belowTypical ? ' (below typical)' : ''),
          meaning: duval2.desc, code: duval2.zone
        }));
        s.push(limitationsPanel('Some OLTC designs normally plot in a fault zone during healthy switching. Interpret Triangle 2 together with:',
          ['This unit’s own history and identical designs', 'The TGC comparison', 'The diagnostic ratios below']));
        s.push(whatWeLearned([
          { label: 'Total Gas', value: total + ' ppm' },
          { label: 'Percentages', value: 'CH₄ ' + pct(duval2.pCH4) + ' · C₂H₄ ' + pct(duval2.pC2H4) + ' · C₂H₂ ' + pct(duval2.pC2H2) },
          { label: 'Zone', value: duval2.zone + (duval2.belowTypical ? ' (below typical)' : '') },
          { label: 'Engineering Conclusion', value: duval2.desc }
        ]));
        ch.push(chapter('Duval Triangle 2', 'IEC 60599:2022 Fig. B.4 — not redrawn here; see Primary Diagnosis', s, true));
      }
    }

    {
      const s = [];
      s.push(note('Why compare against typical values?', [
        'IEC gives no fixed OLTC gas limits, so CIGRE TB 443 typical (90th-percentile) values are used instead. Expressing each gas as a percentage of its typical value shows at a glance whether that gas is unusually high for an OLTC.'
      ]));
      s.push(calcStep(1, 'Express Each Gas as a % of Its Typical Value', {
        purpose: 'Every measured gas is divided by its CIGRE TB 443 typical value and expressed as a percentage.',
        formula: '% of Limit = (Measured ÷ TGC Limit) × 100',
        extra: table(['Gas', 'Measured', 'TGC Limit', 'Calculation', '% of Limit', 'Status'],
          ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'].map((k) => { const r = oltcRes.tgc[k]; return [k.toUpperCase(), r.measured, r.limit, r.measured + ' ÷ ' + r.limit + ' × 100', r.pct + '%', r.status]; })),
        extraLabel: 'Per-Gas Comparison',
        why: 'A value near or above 100% means that gas is at or above the typical level for OLTCs.'
      }));
      s.push(calcStep(2, 'Overall TGC Result', {
        purpose: 'The comparison shows whether any gas has exceeded its typical value.',
        result: { label: 'Any gas above typical?', value: oltcRes.anyAboveTGC ? 'Yes — one or more gases above typical' : 'No — all gases within typical range' }
      }));
      s.push(limitationsPanel('Typical values vary by OLTC design; treat them as guidance, not hard limits. Read alongside:',
        ['Duval Triangle 2', 'The diagnostic ratios', 'This unit’s history']));
      s.push(whatWeLearned([
        { label: 'Above Typical?', value: oltcRes.anyAboveTGC ? 'Yes' : 'No' },
        { label: 'Engineering Conclusion', value: oltcRes.anyAboveTGC ? 'At least one gas exceeds its typical OLTC value.' : 'All gases are within typical OLTC values.' }
      ]));
      ch.push(chapter('Typical Gas Concentration (TGC) Comparison', 'CIGRE TB 443, 90th percentile', s, true));
    }

    [
      {
        key: 'R_arc', title: 'Arcing Ratio', numLabel: 'C₂H₂', denLabel: 'H₂', a: og.c2h2, b: og.h2,
        explain: 'C₂H₂ ÷ H₂ rises with arcing activity in the tap changer relative to general gassing.',
        bands: [{ range: '< 3', label: 'Normal switching' }, { range: '3 – 10', label: 'Watch — increasing' }, { range: '> 10', label: 'Abnormal — check contacts' }],
        activeIdx: function (v) { return v === null ? -1 : (v < 3 ? 0 : (v < 10 ? 1 : 2)); }
      },
      {
        key: 'R_therm', title: 'Thermal Ratio', numLabel: 'C₂H₄', denLabel: 'C₂H₆', a: og.c2h4, b: og.c2h6,
        explain: 'C₂H₄ ÷ C₂H₆ rises with contact or lead overheating in the tap changer.',
        bands: [{ range: '≤ 1', label: 'No overheating' }, { range: '> 1', label: 'Overheating' }],
        activeIdx: function (v) { return v === null ? -1 : (v <= 1 ? 0 : 1); }
      },
      {
        key: 'R_disc', title: 'Discharge Ratio', numLabel: 'C₂H₂', denLabel: '(C₂H₄ + C₂H₆)', a: og.c2h2, b: og.c2h4 + og.c2h6,
        explain: 'C₂H₂ ÷ (C₂H₄ + C₂H₆) flags excessive discharge gas relative to the thermal gases.',
        bands: [{ range: '≤ 2', label: 'Normal' }, { range: '> 2', label: 'High discharge gas' }],
        activeIdx: function (v) { return v === null ? -1 : (v <= 2 ? 0 : 1); }
      }
    ].forEach((r) => {
      const ratio = (oltcRes.ratios || []).find((x) => x.name === r.key);
      if (!ratio) return;
      const s = [];
      s.push(calcStep(1, 'Calculate ' + r.key + ' (' + r.numLabel + ' ÷ ' + r.denLabel + ')', {
        purpose: r.explain,
        formula: r.key + ' = ' + r.numLabel + ' ÷ ' + r.denLabel,
        subs: [r.numLabel + ' = ' + r.a + ' ppm', r.denLabel + ' = ' + r.b + ' ppm'],
        arith: [ratio.value === null ? [r.a + ' ÷ ' + r.b, 'N/A'] : [r.a + ' ÷ ' + r.b, ratio.value.toFixed(3)]],
        extra: compare(r.bands, r.activeIdx(ratio.value)),
        extraLabel: 'Compare With the Standard', extraIcon: '📊',
        result: { label: r.key, value: ratio.value === null ? 'N/A' : ratio.value.toFixed(3) },
        insight: ratio.interp.label
      }));
      s.push(limitationsPanel('This is one supporting ratio for the OLTC. Read it together with:',
        ['Duval Triangle 2', 'The TGC comparison', 'The other OLTC ratios']));
      s.push(whatWeLearned([
        { label: r.key, value: ratio.value === null ? 'N/A' : ratio.value.toFixed(3) },
        { label: 'Interpretation', value: ratio.interp.label }
      ]));
      ch.push(chapter(r.title, 'CIGRE TB 443', s));
    });

    if (oltcRes.tapResult) {
      const s = [];
      s.push(note('Why normalise by tap count?', [
        'An OLTC that switches more often naturally makes more acetylene. Dividing C₂H₂ by the number of operations gives a per-operation wear rate that can be compared fairly between units of different duty.'
      ]));
      s.push(calcStep(1, 'Normalise Acetylene per 1000 Operations', {
        purpose: 'Acetylene is expressed per 1000 tap operations so contact wear rate can be judged.',
        formula: 'C₂H₂ per 1000 ops = (C₂H₂ ÷ taps) × 1000',
        subs: ['C₂H₂ = ' + og.c2h2 + ' ppm', 'Tap Count = ' + taps + ' ops'],
        arith: [[og.c2h2 + ' ÷ ' + taps + ' × 1000', oltcRes.tapResult.per1000 + ' ppm/1000 ops']],
        extra: compare([{ range: '≤ 15', label: 'Within typical range' }, { range: '> 15', label: 'Above typical — check contact wear' }], oltcRes.tapResult.ok ? 0 : 1),
        extraLabel: 'Compare With the Standard', extraIcon: '📊',
        result: { label: 'C₂H₂ / 1000 ops', value: oltcRes.tapResult.per1000 + ' ppm' },
        insight: oltcRes.tapResult.ok ? 'Within the typical range for OLTC contact wear.' : 'Above the typical range — inspect for contact wear.'
      }));
      s.push(limitationsPanel('Requires an accurate operation count since the last oil change. Read alongside:',
        ['Duval Triangle 2', 'The arcing ratio', 'Contact-resistance measurements']));
      s.push(whatWeLearned([
        { label: 'C₂H₂ / 1000 ops', value: oltcRes.tapResult.per1000 + ' ppm' },
        { label: 'Result', value: oltcRes.tapResult.ok ? 'Within typical range' : 'Above typical range' }
      ]));
      ch.push(chapter('Tap-Count Normalization', 'CIGRE TB 443', s));
    }

    {
      const s = [];
      s.push(note('Why check for cross-contamination?', [
        'The OLTC oil is normally rich in acetylene from switching. If its seal fails, that acetylene can migrate into the main tank and mimic a serious main-tank fault. This check compares the two compartments to catch that.'
      ]));
      s.push(calcStep(1, 'Gather the Reference Values', {
        purpose: 'The check compares main-tank and OLTC acetylene levels, so both are needed.',
        extra: table(['Value', 'Source'], [
          ['Main Tank H₂', 'user-entered / auto-filled from Main Tank analysis'],
          ['Main Tank C₂H₂', 'user-entered / auto-filled from Main Tank analysis'],
          ['OLTC C₂H₂', og.c2h2 + ' ppm (this analysis)']
        ]),
        extraLabel: 'Reference Values'
      }));
      s.push(calcStep(2, 'Check Each Contamination Rule', {
        purpose: 'The measured values are checked against fixed contamination criteria.',
        extra: table(['Rule', 'Trigger'], [
          ['OLTC leaking into main tank', 'main tank C₂H₂ > 30 ppm AND C₂H₂/H₂ > 2'],
          ['Possible oil mixing', 'main tank C₂H₂ ÷ OLTC C₂H₂ > 0.5'],
          ['Monitor (inconclusive)', 'main tank H₂ > 150 ppm AND C₂H₂ > 10 ppm, no stronger rule matched']
        ]),
        extraLabel: 'Contamination Rules'
      }));
      s.push(step(3, 'Findings',
        block('✅', 'Result', answerBox('Findings', (xcontam || []).length + ' finding(s)')) +
        block('💡', 'Engineering Meaning', (xcontam || []).length
          ? table(['Finding', 'Detail'], xcontam.map((f) => [f.title, f.detail]))
          : p('No main tank reference values entered — enter them (or run Main Tank Analysis first) to complete this check.'))));
      s.push(limitationsPanel('Needs main-tank reference values; it is inconclusive without them. Read alongside:',
        ['Main-tank Duval / ratio diagnoses', 'OLTC diverter and seal inspection']));
      s.push(whatWeLearned([
        { label: 'OLTC C₂H₂', value: og.c2h2 + ' ppm' },
        { label: 'Findings', value: (xcontam || []).length + ' finding(s)' }
      ]));
      ch.push(chapter('Cross-Contamination Check', 'IEC 60599:2022 §5.7', s, true));
    }

    {
      const s = [];
      s.push(note('Why a "below typical" gate?', [
        'A tap changer can plot in a fault zone while all its gases are still low. IEC 60599:2022 §9 says a fault zone only counts as an active fault once at least one gas exceeds its typical value — otherwise it is just an early pattern to watch.'
      ]));
      s.push(calcStep(1, 'Check Whether Any Gas Exceeds Its Typical Value', {
        purpose: 'The gate depends on whether any measured gas is above its CIGRE TB 443 typical value.',
        result: { label: 'Any gas above typical?', value: oltcRes.anyAboveTGC ? 'Yes' : 'No' }
      }));
      s.push(calcStep(2, 'Apply the Gate', {
        purpose: 'If no gas is above typical and the zone is a fault zone, it is downgraded to an early pattern.',
        result: { label: 'Gate applied?', value: duval2.belowTypical ? 'Yes — zone flagged below-typical (early pattern, not active fault)' : 'No — gate not triggered for this result' },
        why: duval2.belowTypical ? 'All gases are below typical, so the fault zone is treated as an early pattern — continue normal sampling and watch the trend.' : 'Either a gas is above typical, or the zone is Normal, so the gate does not apply.'
      }));
      s.push(limitationsPanel('This is a deliberately conservative gate; keep trending to confirm. Read alongside:',
        ['Duval Triangle 2', 'The TGC comparison', 'Repeat sampling over time']));
      s.push(whatWeLearned([
        { label: 'Above Typical?', value: oltcRes.anyAboveTGC ? 'Yes' : 'No' },
        { label: 'Gate Applied?', value: duval2.belowTypical ? 'Yes' : 'No' }
      ]));
      ch.push(chapter('IEC "Below Typical" Evaluation', 'IEC 60599:2022 §9', s));
    }

    ch.push(referencesChapter());
    return [buildToc()].concat(ch);
  }

  function renderOltcDetailed(rp) {
    const el = document.getElementById('detailed-oltc');
    if (!el) return;
    el.innerHTML = buildOltcChapters(rp).join('');
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.detailedCalcs = { renderMainDetailed, renderOltcDetailed };
})();
