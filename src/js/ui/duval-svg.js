/**
 * TAILAM — ui/duval-svg.js
 * Reusable on-screen Duval Triangle component (SVG).
 *
 * ENGINEERING SAFETY — this module renders the EXISTING frozen geometry as
 * vector graphics. It reads the SAME zone vertex tables the canvas renderer
 * uses (window.TAILAM.ui.charts.T1_ZONES / T2_ZONES / T2_LABEL_POS) and the
 * SAME barycentric→cartesian transform (pad = 68, equilateral layout in a
 * 520×480 space — identical to ui/charts.js). No vertex, boundary,
 * proportion, label position, marker position or engineering meaning is
 * altered here. Zone colours come from the fault-type design tokens in
 * variables.css (presentation only). Canvas rendering in ui/charts.js is
 * retained unchanged for off-screen PDF/Excel export.
 *
 * Plain script — publishes on window.TAILAM.ui.duvalSvg.
 * Depends on window.TAILAM.ui.charts, window.TAILAM.ui.duvalLegend,
 * window.TAILAM.utils.helpers (load those first).
 */
(function () {
  'use strict';

  const charts = window.TAILAM.ui.charts;
  const esc = window.TAILAM.utils.helpers.esc;

  const NS = 'http://www.w3.org/2000/svg';
  const W = 520, H = 480, PAD = 68;
  const tW = W - PAD * 2;
  const tH = (Math.sqrt(3) / 2) * tW;
  const Ax = W / 2, Ay = PAD;          // CH₄ apex
  const Bx = PAD, By = PAD + tH;       // C₂H₂ (bottom-left)
  const Cx = W - PAD, Cy = PAD + tH;   // C₂H₄ (bottom-right)

  /**
   * Barycentric [%CH₄, %C2H4, %C2H2] → cartesian {x,y}. Byte-identical to the
   * bary2canvas()/b2c() used three times in ui/charts.js.
   */
  function b2c(ch4, c2h4, c2h2) {
    const a = ch4 / 100, b = c2h4 / 100, c = c2h2 / 100;
    return { x: a * Ax + b * Cx + c * Bx, y: a * Ay + b * Cy + c * By };
  }
  function r2(n) { return Math.round(n * 100) / 100; }
  function ptStr(ch4, c2h4, c2h2) { const p = b2c(ch4, c2h4, c2h2); return r2(p.x) + ',' + r2(p.y); }

  /** Zone id → fault-type CSS token name (single map for BOTH triangles). */
  const ZONE_TOKEN = {
    PD: '--fault-partial-discharge',
    D1: '--fault-discharge-low-energy',
    D2: '--fault-discharge-high-energy',
    DT: '--fault-thermal-electrical',
    N:  '--fault-normal',
    X1: '--fault-thermal-low',
    X3: '--fault-thermal-electrical',
    T1: '--fault-thermal-low',
    T2: '--fault-thermal-medium',
    T3: '--fault-thermal-high'
  };

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  /** Centroid of a vertex list in barycentric space (used for Triangle 1 labels). */
  function centroid(verts) {
    const n = verts.length;
    return [
      verts.reduce((s, v) => s + v[0], 0) / n,
      verts.reduce((s, v) => s + v[1], 0) / n,
      verts.reduce((s, v) => s + v[2], 0) / n
    ];
  }

  /**
   * Build the full SVG element for one triangle.
   * @param {'triangle1'|'triangle2'} triangleKey
   * @param {?object} marker - {pCH4,pC2H4,pC2H2,zone,total}
   * @param {?string} currentZone - zone id to emphasize
   */
  function buildSvg(triangleKey, marker, currentZone) {
    const isT2 = triangleKey === 'triangle2';
    const zones = isT2 ? charts.T2_ZONES : charts.T1_ZONES;
    const labelPos = isT2 ? charts.T2_LABEL_POS : null;

    const svg = el('svg', {
      class: 'duval-svg', viewBox: '0 0 ' + W + ' ' + H,
      role: 'img', 'aria-label': (isT2 ? 'Duval Triangle 2 (OLTC)' : 'Duval Triangle 1') + ' diagnostic plot'
    });

    // ── Zone polygons ──
    const gZones = el('g', { class: 'duval-zones' });
    zones.forEach((z) => {
      const poly = el('polygon', {
        class: 'fz fz-' + z.id + (z.id === currentZone ? ' active' : ''),
        points: z.verts.map((v) => ptStr(v[0], v[1], v[2])).join(' '),
        'data-zone': z.id
      });
      gZones.appendChild(poly);
    });
    svg.appendChild(gZones);

    // ── Outer outline ──
    svg.appendChild(el('polygon', {
      class: 'duval-outline',
      points: r2(Ax) + ',' + r2(Ay) + ' ' + r2(Bx) + ',' + r2(By) + ' ' + r2(Cx) + ',' + r2(Cy)
    }));

    // ── Grid (20/40/60/80) — same three constant-gas lines as the canvas ──
    const gGrid = el('g', { class: 'duval-grid' });
    [20, 40, 60, 80].forEach((t) => {
      const lines = [
        [[t, 0, 100 - t], [t, 100 - t, 0]],
        [[100 - t, t, 0], [0, t, 100 - t]],
        [[100 - t, 0, t], [0, 100 - t, t]]
      ];
      lines.forEach((seg) => {
        const p1 = b2c(seg[0][0], seg[0][1], seg[0][2]);
        const p2 = b2c(seg[1][0], seg[1][1], seg[1][2]);
        gGrid.appendChild(el('line', { x1: r2(p1.x), y1: r2(p1.y), x2: r2(p2.x), y2: r2(p2.y) }));
      });
    });
    svg.appendChild(gGrid);

    // ── Axis labels ──
    const gAxis = el('g', { class: 'duval-axis-labels' });
    function axisText(x, y, anchor, txt) {
      const t = el('text', { x: r2(x), y: r2(y), 'text-anchor': anchor });
      t.textContent = txt; gAxis.appendChild(t);
    }
    axisText(Ax, Ay - 20, 'middle', 'CH₄');
    axisText(Bx - 6, By + 22, 'end', 'C₂H₂');
    axisText(Cx + 6, Cy + 22, 'start', 'C₂H₄');
    svg.appendChild(gAxis);

    // ── Tick % labels ──
    const gTicks = el('g', { class: 'duval-ticks' });
    function tickText(x, y, anchor, txt) {
      const t = el('text', { x: r2(x), y: r2(y), 'text-anchor': anchor });
      t.textContent = txt; gTicks.appendChild(t);
    }
    [20, 40, 60, 80].forEach((pct) => {
      const lp = b2c(pct, 0, 100 - pct); tickText(lp.x - 5, lp.y + 3, 'end', pct + '%');
      const rp = b2c(100 - pct, pct, 0); tickText(rp.x + 5, rp.y + 3, 'start', pct + '%');
      const bp = b2c(0, 100 - pct, pct); tickText(bp.x, bp.y + 14, 'middle', pct + '%');
    });
    svg.appendChild(gTicks);

    // ── Zone id labels ──
    const gLabels = el('g', { class: 'duval-zone-labels' });
    zones.forEach((z) => {
      const bpos = isT2 ? (labelPos[z.id] || centroid(z.verts)) : centroid(z.verts);
      const p = b2c(bpos[0], bpos[1], bpos[2]);
      const t = el('text', { x: r2(p.x), y: r2(p.y), 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = z.id; gLabels.appendChild(t);
    });
    svg.appendChild(gLabels);

    // ── Result marker (white core + fault-hue ring), same barycentric spot ──
    if (marker && marker.total > 0) {
      const p = b2c(marker.pCH4, marker.pC2H4, marker.pC2H2);
      const token = ZONE_TOKEN[marker.zone];
      const hue = token ? 'var(' + token + ')' : 'var(--text)';
      const gM = el('g', { class: 'duval-marker' });
      gM.appendChild(el('circle', { class: 'duval-marker-halo', cx: r2(p.x), cy: r2(p.y), r: 15, style: 'fill:' + hue }));
      gM.appendChild(el('circle', { class: 'duval-marker-core', cx: r2(p.x), cy: r2(p.y), r: 7, style: 'stroke:' + hue }));
      const lbl = el('text', { class: 'duval-marker-label', x: r2(p.x), y: r2(p.y) - 15, 'text-anchor': 'middle', style: 'fill:' + hue });
      lbl.textContent = marker.zone;
      gM.appendChild(lbl);
      svg.appendChild(gM);
    }

    return svg;
  }

  /** Tooltip metadata (zone id → {label, standard}) from the legend's single source. */
  function tooltipMeta(triangleKey) {
    const legend = window.TAILAM.ui.duvalLegend;
    const data = legend && legend.getLegendData ? legend.getLegendData(triangleKey) : null;
    const map = {};
    if (data) data.zones.forEach((z) => { map[z.id] = { label: z.label, standard: data.standard }; });
    return { map: map, standard: data ? data.standard : 'IEC 60599' };
  }

  /** Wire compact hover tooltips (desktop pointer only — no-op on touch). */
  function wireTooltips(container, svg, triangleKey) {
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
    const meta = tooltipMeta(triangleKey);
    let tip = container.querySelector('.duval-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'duval-tooltip';
      tip.setAttribute('aria-hidden', 'true');
      tip.hidden = true;
      container.appendChild(tip);
    }
    svg.querySelectorAll('.fz').forEach((poly) => {
      const id = poly.getAttribute('data-zone');
      const info = meta.map[id];
      if (!info) return;
      poly.addEventListener('mouseenter', () => {
        tip.innerHTML = '<span class="duval-tooltip-zone">' + esc(id) + '</span>' +
          '<span class="duval-tooltip-name">' + esc(info.label) + '</span>' +
          '<span class="duval-tooltip-std">' + esc(info.standard) + '</span>';
        tip.hidden = false;
      });
      poly.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        let x = e.clientX - rect.left + 12, y = e.clientY - rect.top + 12;
        x = Math.min(x, container.clientWidth - tip.offsetWidth - 6);
        tip.style.left = Math.max(6, x) + 'px';
        tip.style.top = Math.max(6, y) + 'px';
      });
      poly.addEventListener('mouseleave', () => { tip.hidden = true; });
    });
  }

  /**
   * Render a Duval Triangle into a container.
   * @param {object} opts
   * @param {string} opts.container - host element id
   * @param {'triangle1'|'triangle2'} opts.triangle
   * @param {object} opts.marker - {pCH4,pC2H4,pC2H2,zone,total}
   * @param {?string} [opts.currentZone] - zone to emphasize (defaults to marker.zone)
   * @param {boolean} [opts.interactive=true] - enable hover tooltips
   */
  function render(opts) {
    const container = document.getElementById(opts.container);
    if (!container) return;
    const currentZone = opts.currentZone || (opts.marker && opts.marker.zone) || null;
    const svg = buildSvg(opts.triangle, opts.marker || null, currentZone);
    const tip = container.querySelector('.duval-tooltip');
    container.innerHTML = '';
    if (tip) container.appendChild(tip);
    container.appendChild(svg);
    if (opts.interactive !== false) wireTooltips(container, svg, opts.triangle);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.duvalSvg = { render };
})();
