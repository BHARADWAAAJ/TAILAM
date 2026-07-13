/**
 * TAILAM — ui/duval-legend.js
 * Reusable Duval Triangle colour-key legend. One function,
 * renderDuvalLegend({ triangle, container, currentZone, highlightTargetId }),
 * renders the correct legend for Duval Triangle 1 (Main Tank) or Duval
 * Triangle 2 (OLTC) into any container — Engineering Workspace hero, the
 * shared detail modal, or (via getLegendData(), consumed by ui/export.js)
 * the PDF report.
 *
 * Presentation only:
 *  - Zone codes and swatch colours are read live from window.TAILAM.ui.charts'
 *    exported T1_ZONES / T2_ZONES / T1_MARKER_COLOR / T2_MARKER_COLOR — the
 *    SAME tables drawDuvalTriangle()/drawDuvalTriangle2() already use to
 *    paint the triangle. No colour is redefined here.
 *  - Zone name/description text is copied verbatim from the zone INFO maps
 *    already defined in engine/duval.js and engine/duval2.js (the exact text
 *    already surfaced today in the Duval detail modal via duval.desc /
 *    duval2.desc). Nothing is re-authored or invented.
 *  - The hover highlight and click tooltip are informational only; they
 *    never call an engine function, never redraw the base triangle canvas,
 *    and never alter marker/zone/gas data in any way.
 *
 * Plain script — publishes on window.TAILAM.ui.duvalLegend.
 * Depends on window.TAILAM.utils.helpers, window.TAILAM.ui.charts (load
 * those first).
 */
(function () {
  'use strict';

  const esc = window.TAILAM.utils.helpers.esc;
  const charts = window.TAILAM.ui.charts;

  /**
   * Legend display text per triangle. `label` is the short row text;
   * `desc` is the full engineering description used in the click tooltip.
   * Triangle 1's label wording matches the spec's requested display text
   * exactly. Triangle 2's zone ids/names/descriptions are copied verbatim
   * from engine/duval2.js's own zone INFO map — never invented — so the
   * legend can never disagree with what the app already tells the engineer
   * in the Duval detail modal.
   */
  const LEGEND_TEXT = {
    triangle1: {
      standard: 'IEC 60599',
      zones: [
        { id: 'PD', label: 'Partial Discharge',
          desc: 'Corona-type partial discharge in gas voids. High electric field stress on insulation.' },
        { id: 'D1', label: 'Discharges of Low Energy (Sparking)',
          desc: 'Low energy electrical discharge (sparking), flashover through oil.' },
        { id: 'D2', label: 'Discharges of High Energy (Arcing)',
          desc: 'High energy arc discharge. Significant arcing or sparking in oil.' },
        { id: 'DT', label: 'Mixed Electrical & Thermal Fault',
          desc: 'Mixed thermal and electrical fault. Combination of overheating and discharge activity.' },
        { id: 'T1', label: 'Thermal Fault, T < 300 °C',
          desc: 'Low-temperature overheating. Possible insulation contact with hot metal parts.' },
        { id: 'T2', label: 'Thermal Fault, 300 °C ≤ T < 700 °C',
          desc: 'Medium-temperature thermal fault. Conductor overheating or circulating currents.' },
        { id: 'T3', label: 'Thermal Fault, T ≥ 700 °C',
          desc: 'High-temperature thermal fault. Severe hotspot in core or conductor.' }
      ]
    },
    triangle2: {
      standard: 'IEC 60599:2022 Fig. B.4',
      zones: [
        { id: 'N', label: 'Normal Operation',
          desc: 'This is the normal gas pattern for tap changer switching. No problem. Continue normal sampling. Note: some OLTC models make less gas — if possible, compare with identical units.' },
        { id: 'D1', label: 'Abnormal Arcing (D1)',
          desc: 'More arcing than normal switching. The contacts may be worn or not aligned well. Check the diverter contacts at the next service.' },
        { id: 'X1', label: 'Overheating < 300 °C (X1)',
          desc: 'Possible mild overheating (below 300 °C) inside the tap changer. Take oil samples more often and watch the trend.' },
        { id: 'X3', label: 'Coking in Progress or Abnormal Arcing D2 (X3)',
          desc: 'Carbon may be forming on the contacts, or there is heavy arcing. Plan an internal inspection. Note: some OLTC models show X3 in normal operation — if this unit always plots here and the point has not moved much, it is likely normal (IEC 60599:2022 A.7.4).' },
        { id: 'T2', label: 'Severe Coking of Contacts > 300 °C (T2)',
          desc: 'The contacts are overheating and carbon is forming on them. Check the contact resistance. Plan an OLTC overhaul. Note: a few OLTC models show T2 in normal operation — compare with this unit’s history (IEC 60599:2022 A.7.4).' },
        { id: 'T3', label: 'Severe Coking of Contacts > 700 °C (T3)',
          desc: 'The contacts are very hot with heavy carbon. This is serious. Take the tap changer out of service and inspect it soon. Note: a few OLTC models show T3 in normal operation — compare with this unit’s history (IEC 60599:2022 A.7.4).' }
      ]
    }
  };

  const CURRENT_SAMPLE_DESC = 'The highlighted point indicates the current analysed transformer oil sample.';
  const ENGINEERING_NOTE = 'The Duval Triangle is an internationally recognised diagnostic method defined in IEC 60599. ' +
    'The coloured regions represent fault classifications based on the relative percentages of CH₄, C₂H₄ and C₂H₂ dissolved gases. ' +
    CURRENT_SAMPLE_DESC;

  /** Zone fill colour, read live from charts.js's exported T1_ZONES/T2_ZONES — never duplicated as a literal. */
  function colorFor(triangleKey, zoneId) {
    const zones = triangleKey === 'triangle2' ? charts.T2_ZONES : charts.T1_ZONES;
    const z = (zones || []).find((zz) => zz.id === zoneId);
    return z ? z.color : '#94a3b8';
  }

  /** Current-sample marker colour, read live from charts.js's exported marker colour tables. */
  function markerColorFor(triangleKey, zoneId) {
    if (triangleKey === 'triangle2') return charts.T2_MARKER_COLOR || '#eab308';
    return (charts.T1_MARKER_COLOR && charts.T1_MARKER_COLOR[zoneId]) || '#ef4444';
  }

  /** Accessible label, spelling out units so screen readers don't stumble on symbols. */
  function ariaLabelFor(id, label) {
    return (id + ' ' + label)
      .replace(/°C/g, ' degrees Celsius')
      .replace(/≤/g, 'less than or equal to')
      .replace(/≥/g, 'greater than or equal to')
      .replace(/</g, 'below ')
      .replace(/>/g, 'above ');
  }

  /**
   * Build the plain-data legend model for one triangle — used both by the
   * interactive DOM renderer below and by ui/export.js to build the PDF's
   * static legend markup, so both stay driven from this single source.
   * @param {'triangle1'|'triangle2'} triangleKey
   * @param {?string} [currentZone] - current diagnosed zone code, if any,
   *   used only to colour the Current Sample swatch to match the live
   *   on-canvas marker for that exact zone.
   * @returns {?{standard:string, zones:Array, currentSample:object}}
   */
  function getLegendData(triangleKey, currentZone) {
    const cfg = LEGEND_TEXT[triangleKey];
    if (!cfg) return null;
    const zones = cfg.zones.map((z) => ({
      id: z.id,
      label: z.label,
      desc: z.desc,
      color: colorFor(triangleKey, z.id),
      ariaLabel: ariaLabelFor(z.id, z.label)
    }));
    return {
      standard: cfg.standard,
      zones,
      currentSample: {
        label: 'Current Sample',
        desc: CURRENT_SAMPLE_DESC,
        color: markerColorFor(triangleKey, currentZone),
        ariaLabel: 'Current analysed transformer oil sample.'
      }
    };
  }

  // ── Hover-highlight overlay (desktop only, very subtle, read-only) ─────
  // Draws a soft highlight of one zone's boundary on a transparent overlay
  // canvas placed over the base triangle canvas. Never touches the base
  // canvas itself, so the live diagnostic marker is always preserved
  // untouched. Uses the SAME zone vertex data + the SAME simple screen-
  // placement formula (pad=68, equilateral layout) already used identically
  // three times inside ui/charts.js — no zone boundary or diagnostic value
  // is computed or altered here.

  const HIGHLIGHT_FILL = 'rgba(37,99,235,0.10)';
  const HIGHLIGHT_STROKE = 'rgba(37,99,235,0.85)';

  function triangleVertices(W, H) {
    const pad = 68, tW = W - pad * 2, tH = (Math.sqrt(3) / 2) * tW;
    return { Ax: W / 2, Ay: pad, Bx: pad, By: pad + tH, Cx: W - pad, Cy: pad + tH };
  }

  function zoneVerts(triangleKey, zoneId) {
    const zones = triangleKey === 'triangle2' ? charts.T2_ZONES : charts.T1_ZONES;
    const z = (zones || []).find((zz) => zz.id === zoneId);
    return z ? z.verts : null;
  }

  function getOverlay(canvasId) {
    const base = document.getElementById(canvasId);
    if (!base || !base.parentElement) return null;
    const wrap = base.parentElement;
    let overlay = wrap.querySelector('.duval-legend-highlight-overlay[data-for="' + canvasId + '"]');
    if (!overlay) {
      overlay = document.createElement('canvas');
      overlay.className = 'duval-legend-highlight-overlay';
      overlay.setAttribute('data-for', canvasId);
      overlay.setAttribute('aria-hidden', 'true');
      const cs = window.getComputedStyle(wrap);
      if (cs.position === 'static') wrap.style.position = 'relative';
      wrap.appendChild(overlay);
    }
    if (overlay.width !== base.width || overlay.height !== base.height) {
      overlay.width = base.width; overlay.height = base.height;
    }
    return overlay;
  }

  /** Draw a subtle highlight of `zoneId`'s boundary over `canvasId`. No-op off desktop-pointer devices. */
  function highlightZone(canvasId, triangleKey, zoneId) {
    if (!zoneId) return;
    const overlay = getOverlay(canvasId);
    const verts = zoneVerts(triangleKey, zoneId);
    if (!overlay || !verts) return;
    const ctx = overlay.getContext('2d');
    const W = overlay.width, H = overlay.height;
    ctx.clearRect(0, 0, W, H);
    const { Ax, Ay, Bx, By, Cx, Cy } = triangleVertices(W, H);
    function b2c(v) {
      const a = v[0] / 100, b = v[1] / 100, c = v[2] / 100;
      return { x: a * Ax + b * Cx + c * Bx, y: a * Ay + b * Cy + c * By };
    }
    ctx.beginPath();
    const p0 = b2c(verts[0]);
    ctx.moveTo(p0.x, p0.y);
    verts.slice(1).forEach((v) => { const p = b2c(v); ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.fillStyle = HIGHLIGHT_FILL; ctx.fill();
    ctx.strokeStyle = HIGHLIGHT_STROKE; ctx.lineWidth = Math.max(2, 2.5 * (W / 520)); ctx.stroke();
  }

  /** Clear any highlight drawn on `canvasId`'s overlay. */
  function clearHighlight(canvasId) {
    const base = document.getElementById(canvasId);
    if (!base || !base.parentElement) return;
    const overlay = base.parentElement.querySelector('.duval-legend-highlight-overlay[data-for="' + canvasId + '"]');
    if (overlay) overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
  }

  // Single, module-scope "click outside closes the open tooltip" listener —
  // registered once at script load, not once per render, so repeated
  // analyses/re-renders never accumulate duplicate document listeners.
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.duval-legend-item')) return;
    document.querySelectorAll('.duval-legend-tooltip:not([hidden])').forEach((t) => { t.hidden = true; t.innerHTML = ''; });
    document.querySelectorAll('.duval-legend-item[aria-expanded="true"]').forEach((it) => it.setAttribute('aria-expanded', 'false'));
  });

  /**
   * Inline SVG colour swatch (square) — used instead of a CSS
   * background-color so the legend's colours are vector fills, not styling
   * that a browser/print engine can choose to suppress. Many browsers omit
   * CSS background colours by default when printing unless the page opts
   * in with print-color-adjust:exact; an SVG <rect fill> has no such
   * opt-out, so the legend colours always print. Same colour value the
   * triangle itself paints with — nothing new is defined here.
   * @param {string} color
   * @returns {string}
   */
  function svgSwatch(color) {
    return '<svg class="duval-legend-swatch" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">' +
      '<rect x="0.5" y="0.5" width="13" height="13" rx="3" fill="' + color + '" stroke="rgba(0,0,0,0.22)" stroke-width="1"/>' +
      '</svg>';
  }

  /** Inline SVG colour swatch (ring + dot) for the Current Sample marker — same print-safety rationale as svgSwatch(). */
  function svgMarker(color) {
    return '<svg class="duval-legend-marker" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">' +
      '<circle cx="7" cy="7" r="6" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>' +
      '<circle cx="7" cy="7" r="4.5" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>' +
      '</svg>';
  }

  /**
   * Render the Duval Triangle legend into `container`.
   * @param {object} opts
   * @param {'triangle1'|'triangle2'} opts.triangle
   * @param {string|Element} opts.container - element or element id to render into
   * @param {?string} [opts.currentZone] - current diagnosed zone code (colours the Current Sample swatch)
   * @param {?string} [opts.highlightTargetId] - id of the on-screen <canvas> to subtly highlight on hover/focus
   */
  function renderDuvalLegend(opts) {
    opts = opts || {};
    const containerEl = typeof opts.container === 'string' ? document.getElementById(opts.container) : opts.container;
    if (!containerEl) return;
    const data = getLegendData(opts.triangle, opts.currentZone);
    if (!data) { containerEl.innerHTML = ''; return; }

    const rowsHtml = data.zones.map((z) =>
      '<button type="button" class="duval-legend-item" data-zone="' + esc(z.id) + '" aria-expanded="false" aria-label="' + esc(z.ariaLabel) + '">' +
        svgSwatch(z.color) +
        '<span class="duval-legend-text"><strong>' + esc(z.id) + '</strong><span>' + esc(z.label) + '</span></span>' +
      '</button>'
    ).join('');

    const sampleHtml =
      '<button type="button" class="duval-legend-item duval-legend-item-sample" data-zone="" aria-expanded="false" aria-label="' + esc(data.currentSample.ariaLabel) + '">' +
        svgMarker(data.currentSample.color) +
        '<span class="duval-legend-text"><strong>●</strong><span>' + esc(data.currentSample.label) + '</span></span>' +
      '</button>';

    containerEl.innerHTML =
      '<div class="duval-legend">' +
        '<div class="duval-legend-grid">' + rowsHtml + sampleHtml + '</div>' +
        '<div class="duval-legend-tooltip" role="status" aria-live="polite" hidden></div>' +
        '<div class="duval-legend-note"><strong>Engineering Note:</strong> ' + esc(ENGINEERING_NOTE) + '</div>' +
      '</div>';

    wireInteractions(containerEl, data, opts.triangle, opts.highlightTargetId);
  }

  function wireInteractions(containerEl, data, triangleKey, highlightTargetId) {
    const items = Array.from(containerEl.querySelectorAll('.duval-legend-item'));
    const tooltip = containerEl.querySelector('.duval-legend-tooltip');
    const allRows = data.zones.concat([{ id: '●', label: data.currentSample.label, desc: data.currentSample.desc }]);
    let isDesktopPointer = false;
    try { isDesktopPointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches); } catch (e) { /* ignore */ }

    function closeTooltip() {
      if (!tooltip) return;
      tooltip.hidden = true; tooltip.innerHTML = '';
      items.forEach((it) => it.setAttribute('aria-expanded', 'false'));
    }
    function openTooltip(item, idx) {
      if (!tooltip) return;
      const row = allRows[idx];
      if (!row) return;
      tooltip.innerHTML = '<div class="duval-legend-tooltip-title">' + esc(row.id) + (row.label ? ' — ' + esc(row.label) : '') + '</div>' +
        '<div class="duval-legend-tooltip-body">' + esc(row.desc || '') + '</div>';
      tooltip.hidden = false;
      items.forEach((it, i) => it.setAttribute('aria-expanded', i === idx ? 'true' : 'false'));
    }

    items.forEach((item, idx) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = item.getAttribute('aria-expanded') === 'true';
        closeTooltip();
        if (!isOpen) openTooltip(item, idx);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTooltip();
      });
      if (isDesktopPointer && highlightTargetId) {
        const zoneId = item.getAttribute('data-zone');
        if (zoneId) {
          item.addEventListener('mouseenter', () => highlightZone(highlightTargetId, triangleKey, zoneId));
          item.addEventListener('mouseleave', () => clearHighlight(highlightTargetId));
          item.addEventListener('focus', () => highlightZone(highlightTargetId, triangleKey, zoneId));
          item.addEventListener('blur', () => clearHighlight(highlightTargetId));
        }
      }
    });
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.duvalLegend = { renderDuvalLegend, getLegendData };
})();
