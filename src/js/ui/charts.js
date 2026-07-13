/**
 * TAILAM — ui/charts.js
 * All canvas rendering: Duval Triangles 1, 2 and 4 and the risk gauge.
 * Rendering is theme-aware via TAILAM.theme.isDarkTheme(). Zone geometry
 * comes from the engine modules and must stay in sync with them.
 *
 * Plain script — publishes on window.TAILAM.ui.charts.
 * Depends on window.TAILAM.theme, window.TAILAM.engine.duval,
 * window.TAILAM.engine.duval2 (load those first).
 */
(function () {
  'use strict';

  const isDarkTheme = window.TAILAM.theme.isDarkTheme;
  const calcDuval4 = window.TAILAM.engine.duval.calcDuval4;
  const calcDuval2 = window.TAILAM.engine.duval2.calcDuval2;

  // Static zone geometry / color-lookup tables, hoisted to module scope.
  // These were previously re-allocated as fresh array/object literals on
  // every single canvas draw (every analysis, every theme toggle × 2
  // canvases, every modal open, every export image capture). The values
  // never change and never depend on function arguments, so building them
  // once at script-load time is behaviorally identical but avoids
  // needless allocation + GC churn on a function that can run many times
  // per session. Verified byte-identical to the literals they replace.
  const T1_ZONES = [
    { id:'PD', color:'rgba(255,242,204,0.92)', verts:[[98,2,0],[100,0,0],[98,0,2]] },
    { id:'D1', color:'rgba(207,226,243,0.92)', verts:[[0,0,100],[0,23,77],[64,23,13],[87,0,13]] },
    { id:'D2', color:'rgba(159,197,232,0.92)', verts:[[0,23,77],[0,71,29],[31,40,29],[47,40,13],[64,23,13]] },
    { id:'DT', color:'rgba(217,210,233,0.92)', verts:[[0,71,29],[0,85,15],[35,50,15],[46,50,4],[96,0,4],[87,0,13],[47,40,13],[31,40,29]] },
    { id:'T1', color:'rgba(217,234,211,0.92)', verts:[[76,20,4],[80,20,0],[98,2,0],[98,0,2],[96,0,4]] },
    { id:'T2', color:'rgba(182,215,168,0.92)', verts:[[46,50,4],[50,50,0],[80,20,0],[76,20,4]] },
    { id:'T3', color:'rgba(147,196,125,0.92)', verts:[[0,85,15],[0,100,0],[50,50,0],[35,50,15]] }
  ];
  const T1_LABEL_COLOR = { PD:'#92400e', D1:'#1e40af', D2:'#1e3a8a', DT:'#5b21b6', T1:'#166534', T2:'#15803d', T3:'#14532d' };
  const T1_MARKER_COLOR = { PD:'#d97706', D1:'#2563eb', D2:'#1d4ed8', DT:'#7c3aed', T1:'#16a34a', T2:'#15803d', T3:'#166534' };

  const T4_ZONES = [
    { id:'O', color:'rgba(217,234,211,0.92)', verts:[[9,67,24],[0,76,24],[0,0,100],[9,0,91]] },
    { id:'C', color:'rgba(255,229,153,0.92)', verts:[[64,36,0],[0,100,0],[0,76,24],[40,36,24]] },
    { id:'PD', color:'rgba(244,204,204,0.92)', verts:[[98,2,0],[85,15,0],[84,15,1],[97,2,1]] }
  ];
  const T4_LABEL_COLOR = { PD:'#7f1d1d', S:'#1e3a5f', O:'#14532d', C:'#713f12' };

  const T2_ZONES = [
    { id:'N',  color:'rgba(217,234,211,0.92)', verts:[[2,6,92],[19,6,75],[19,23,58],[2,23,75]] },
    { id:'D1', color:'rgba(207,226,243,0.92)', verts:[[0,0,100],[19,0,81],[19,6,75],[2,6,92],[2,23,75],[0,23,77]] },
    { id:'X1', color:'rgba(255,242,204,0.92)', verts:[[100,0,0],[19,0,81],[19,23,58],[77,23,0]] },
    { id:'X3', color:'rgba(249,203,156,0.92)', verts:[[62,23,15],[0,23,77],[0,85,15]] },
    { id:'T2', color:'rgba(182,215,168,0.92)', verts:[[77,23,0],[62,23,15],[35,50,15],[50,50,0]] },
    { id:'T3', color:'rgba(147,196,125,0.92)', verts:[[50,50,0],[35,50,15],[0,85,15],[0,100,0]] }
  ];
  // Hand-placed labels (D1 is concave — centroids unreliable)
  const T2_LABEL_COLOR = { N:'#166534', D1:'#1e40af', X1:'#92400e', X3:'#9a3412', T2:'#15803d', T3:'#14532d' };
  const T2_LABEL_POS   = { N:[10.5,14.5,75], D1:[8,2.5,89.5], X1:[55,10,35], X3:[20,42,38], T2:[56,36,8], T3:[20,72,8] };

  const RISK_GAUGE_SEGMENTS = [[0,25,'#22c55e'],[25,50,'#eab308'],[50,75,'#f97316'],[75,100,'#ef4444']];

  // Sprint: Duval legend. Triangle 2 / Triangle 4's sample marker was a
  // literal '#eab308' repeated in both draw functions — hoisted here so the
  // legend module can reuse the EXACT same value (single source of truth)
  // instead of a second hand-copied hex string. Purely a rendering constant,
  // same as the tables above; no zone boundary, geometry or diagnostic value
  // changes as a result.
  const T2_MARKER_COLOR = '#eab308';

  /**
   * Draw Duval Triangle 1 (main tank) with an optional sample marker.
   * @param {string} canvasId
   * @param {?object} marker - calcDuval() result (pCH4/pC2H4/pC2H2/zone/total)
   */
  function drawDuvalTriangle(canvasId, marker) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // Scale-based rendering: 520px is the on-screen canvas width (index.html's
    // duval-canvas), so scale === 1 there — identical to the previous fixed-
    // pixel look. ui/export.js's off-screen high-resolution PDF canvas is
    // wider, so scale grows with it and every font/lineWidth/radius/offset
    // below grows proportionally. Triangle geometry (pad, vertex/zone/marker
    // coordinates, bary2canvas) is completely untouched by this — only how
    // large things are drawn changes, never where.
    const scale = W / 520;
    const pad = 68, tW = W - pad * 2, tH = (Math.sqrt(3)/2)*tW;
    const Ax = W/2, Ay = pad, Bx = pad, By = pad + tH, Cx = W - pad, Cy = pad + tH;
    function bary2canvas(pCH4, pC2H4, pC2H2) {
      const a = pCH4/100, b = pC2H4/100, c = pC2H2/100;
      return { x: a*Ax+b*Cx+c*Bx, y: a*Ay+b*Cy+c*By };
    }
    const dark = isDarkTheme();
    const textColor = dark ? '#9aa3b8' : '#475569';
    const borderColor = dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
    const outlineColor = dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)';
    const gridColor = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)';
    const zones = T1_ZONES;
    zones.forEach(zone => {
      ctx.beginPath();
      const p0 = bary2canvas(...zone.verts[0]); ctx.moveTo(p0.x, p0.y);
      zone.verts.slice(1).forEach(v => { const p = bary2canvas(...v); ctx.lineTo(p.x, p.y); });
      ctx.closePath(); ctx.fillStyle = zone.color; ctx.fill();
      ctx.strokeStyle = borderColor; ctx.lineWidth = 0.8 * scale; ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(Ax,Ay); ctx.lineTo(Bx,By); ctx.lineTo(Cx,Cy); ctx.closePath();
    ctx.strokeStyle = outlineColor; ctx.lineWidth = 2 * scale; ctx.stroke();
    ctx.setLineDash([3 * scale, 4 * scale]); ctx.strokeStyle = gridColor; ctx.lineWidth = 0.8 * scale;
    [20,40,60,80].forEach(t => {
      const a1 = bary2canvas(t,0,100-t), a2 = bary2canvas(t,100-t,0);
      ctx.beginPath(); ctx.moveTo(a1.x,a1.y); ctx.lineTo(a2.x,a2.y); ctx.stroke();
      const b1 = bary2canvas(100-t,t,0), b2 = bary2canvas(0,t,100-t);
      ctx.beginPath(); ctx.moveTo(b1.x,b1.y); ctx.lineTo(b2.x,b2.y); ctx.stroke();
      const c1 = bary2canvas(0,100-t,t), c2 = bary2canvas(100-t,0,t);
      ctx.beginPath(); ctx.moveTo(c1.x,c1.y); ctx.lineTo(c2.x,c2.y); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font = `bold ${13 * scale}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    zones.forEach(zone => {
      const n = zone.verts.length;
      const cCH4 = zone.verts.reduce((s,v)=>s+v[0],0)/n, cC2H4 = zone.verts.reduce((s,v)=>s+v[1],0)/n, cC2H2 = zone.verts.reduce((s,v)=>s+v[2],0)/n;
      const pos = bary2canvas(cCH4,cC2H4,cC2H2);
      ctx.fillStyle = T1_LABEL_COLOR[zone.id] || textColor; ctx.fillText(zone.id, pos.x, pos.y);
    });
    ctx.font = `bold ${14 * scale}px sans-serif`; ctx.textAlign='center';
    ctx.fillStyle = '#78350f'; ctx.fillText('CH₄', Ax, Ay - 18 * scale);
    ctx.fillStyle = '#991b1b'; ctx.fillText('C₂H₂', Bx - 4 * scale, By + 20 * scale);
    ctx.fillStyle = '#1e40af'; ctx.fillText('C₂H₄', Cx + 4 * scale, Cy + 20 * scale);
    ctx.font = `${11 * scale}px sans-serif`; ctx.fillStyle = textColor;
    [20,40,60,80].forEach(pct => {
      const lp = bary2canvas(pct,0,100-pct); ctx.textAlign='right'; ctx.fillText(pct+'%', lp.x - 4 * scale, lp.y);
      const rp = bary2canvas(100-pct,pct,0); ctx.textAlign='left'; ctx.fillText(pct+'%', rp.x + 4 * scale, rp.y);
      const bp = bary2canvas(0,100-pct,pct); ctx.textAlign='center'; ctx.fillText(pct+'%', bp.x, bp.y + 12 * scale);
    });
    if (marker && marker.total > 0) {
      const pt = bary2canvas(marker.pCH4, marker.pC2H4, marker.pC2H2);
      const mc = T1_MARKER_COLOR[marker.zone] || '#ef4444';
      ctx.beginPath(); ctx.arc(pt.x,pt.y,14 * scale,0,Math.PI*2); ctx.strokeStyle=mc; ctx.globalAlpha=0.30; ctx.lineWidth=4 * scale; ctx.stroke(); ctx.globalAlpha=1.0;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,8 * scale,0,Math.PI*2); ctx.fillStyle=mc; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2 * scale; ctx.stroke();
      ctx.font=`bold ${11 * scale}px sans-serif`; ctx.fillStyle=mc; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(marker.zone, pt.x, pt.y - 12 * scale);
    }
  }

  /**
   * Draw Duval Triangle 4 (H₂ / CH₄ / C₂H₆, main-tank supplementary).
   * @param {string} canvasId
   * @param {object} g - gas set (ppm)
   */
  function drawDuvalTriangle4(canvasId, g) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // Scale-based rendering: 520px is the on-screen canvas width, so scale
    // === 1 there (identical to the previous fixed-pixel look). Geometry
    // (pad, vertex/zone/marker coordinates, b2c) is untouched — only how
    // large text/strokes/markers are drawn changes.
    const scale = W / 520;
    const pad = 68, tW = W - pad*2, tH = (Math.sqrt(3)/2)*tW;
    const Ax=W/2, Ay=pad, Bx=pad, By=pad+tH, Cx=W-pad, Cy=pad+tH;
    function b2c(ph,pm,pe) { const a=pm/100,b=pe/100,c=ph/100; return { x:a*Ax+b*Cx+c*Bx, y:a*Ay+b*Cy+c*By }; }
    const dark = isDarkTheme();
    const textColor = dark ? '#9aa3b8' : '#475569';
    const borderColor = dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
    const outlineColor = dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)';
    const gridColor = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.moveTo(Ax,Ay); ctx.lineTo(Bx,By); ctx.lineTo(Cx,Cy); ctx.closePath();
    ctx.fillStyle='rgba(207,226,243,0.92)'; ctx.fill();
    const zones4 = T4_ZONES;
    zones4.forEach(z => {
      ctx.beginPath();
      const p0=b2c(...z.verts[0]); ctx.moveTo(p0.x,p0.y);
      z.verts.slice(1).forEach(v => { const p=b2c(...v); ctx.lineTo(p.x,p.y); });
      ctx.closePath(); ctx.fillStyle=z.color; ctx.fill(); ctx.strokeStyle=borderColor; ctx.lineWidth=0.9 * scale; ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(Ax,Ay); ctx.lineTo(Bx,By); ctx.lineTo(Cx,Cy); ctx.closePath();
    ctx.strokeStyle=outlineColor; ctx.lineWidth=2 * scale; ctx.stroke();
    ctx.setLineDash([3 * scale, 4 * scale]); ctx.strokeStyle=gridColor; ctx.lineWidth=0.8 * scale;
    [20,40,60,80].forEach(pct => {
      const a1=b2c(100-pct,pct,0), a2=b2c(0,pct,100-pct); ctx.beginPath(); ctx.moveTo(a1.x,a1.y); ctx.lineTo(a2.x,a2.y); ctx.stroke();
      const b1=b2c(100-pct,0,pct), b2_=b2c(0,100-pct,pct); ctx.beginPath(); ctx.moveTo(b1.x,b1.y); ctx.lineTo(b2_.x,b2_.y); ctx.stroke();
      const c1=b2c(pct,100-pct,0), c2=b2c(pct,0,100-pct); ctx.beginPath(); ctx.moveTo(c1.x,c1.y); ctx.lineTo(c2.x,c2.y); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font=`bold ${13 * scale}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    const sPos = b2c(40,30,30); ctx.fillStyle=T4_LABEL_COLOR.S; ctx.fillText('S', sPos.x, sPos.y);
    zones4.forEach(z => {
      const n=z.verts.length;
      const ch=z.verts.reduce((s,v)=>s+v[0],0)/n, cm=z.verts.reduce((s,v)=>s+v[1],0)/n, ce=z.verts.reduce((s,v)=>s+v[2],0)/n;
      const pos=b2c(ch,cm,ce); ctx.fillStyle=T4_LABEL_COLOR[z.id]||textColor; ctx.fillText(z.id, pos.x, pos.y);
    });
    ctx.font=`bold ${12 * scale}px sans-serif`;
    ctx.fillStyle='#78350f'; ctx.textAlign='center'; ctx.fillText('CH₄', Ax, Ay - 18 * scale);
    ctx.fillStyle='#1e3a8a'; ctx.textAlign='right'; ctx.fillText('H₂', Bx - 4 * scale, By + 20 * scale);
    ctx.fillStyle='#166534'; ctx.textAlign='left'; ctx.fillText('C₂H₆', Cx + 4 * scale, Cy + 20 * scale);
    ctx.font=`${9 * scale}px sans-serif`; ctx.fillStyle=textColor;
    [20,40,60,80].forEach(pct => {
      const lp=b2c(100-pct,pct,0); ctx.textAlign='right'; ctx.fillText(pct+'%', lp.x - 4 * scale, lp.y);
      const rp=b2c(0,100-pct,pct); ctx.textAlign='left'; ctx.fillText(pct+'%', rp.x + 4 * scale, rp.y);
      const bp=b2c(pct,0,100-pct); ctx.textAlign='center'; ctx.fillText(pct+'%', bp.x, bp.y + 12 * scale);
    });
    const total = g.h2+g.ch4+g.c2h6;
    if (total === 0) return;
    const ph=100*g.h2/total, pm=100*g.ch4/total, pe=100*g.c2h6/total;
    const pt = b2c(ph,pm,pe);
    const grad = ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,18 * scale);
    grad.addColorStop(0,'rgba(234,179,8,0.5)'); grad.addColorStop(1,'rgba(234,179,8,0)');
    ctx.beginPath(); ctx.arc(pt.x,pt.y,18 * scale,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.arc(pt.x,pt.y,8 * scale,0,Math.PI*2); ctx.fillStyle=T2_MARKER_COLOR; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=1.5 * scale; ctx.stroke();
    const d4 = calcDuval4(g);
    ctx.font=`bold ${11 * scale}px sans-serif`; ctx.fillStyle='#111'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(d4.zone, pt.x, pt.y - 12 * scale);
  }

  /**
   * Draw Duval Triangle 2 (OLTC: CH₄ top, C₂H₂ bottom-left, C₂H₄ bottom-right).
   * Zone polygons per IEC 60599:2022 Fig. B.4 — verified against the standard.
   * @param {string} canvasId
   * @param {object} g - OLTC gas set (ppm)
   */
  function drawDuvalTriangle2(canvasId, g) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // Scale-based rendering: 520px is the on-screen canvas width, so scale
    // === 1 there (identical to the previous fixed-pixel look). Geometry
    // (pad, vertex/zone/marker coordinates, b2c) is untouched — only how
    // large text/strokes/markers are drawn changes.
    const scale = W / 520;
    const pad = 68, tW = W - pad*2, tH = (Math.sqrt(3)/2)*tW;
    const Ax=W/2, Ay=pad, Bx=pad, By=pad+tH, Cx=W-pad, Cy=pad+tH;   // CH₄ / C₂H₂ / C₂H₄
    function b2c(pm,pe4,pe2) { const a=pm/100,b=pe4/100,c=pe2/100; return { x:a*Ax+b*Cx+c*Bx, y:a*Ay+b*Cy+c*By }; }
    const dark = isDarkTheme();
    const textColor = dark ? '#9aa3b8' : '#475569';
    const borderColor = dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
    const outlineColor = dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)';
    const gridColor = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)';
    // Zones [%CH4, %C2H4, %C2H2] — N is an inner quadrilateral, D1 an L-shape at the C₂H₂ corner
    const zones2 = T2_ZONES;
    zones2.forEach(z => {
      ctx.beginPath();
      const p0=b2c(...z.verts[0]); ctx.moveTo(p0.x,p0.y);
      z.verts.slice(1).forEach(v => { const p=b2c(...v); ctx.lineTo(p.x,p.y); });
      ctx.closePath(); ctx.fillStyle=z.color; ctx.fill(); ctx.strokeStyle=borderColor; ctx.lineWidth=0.9 * scale; ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(Ax,Ay); ctx.lineTo(Bx,By); ctx.lineTo(Cx,Cy); ctx.closePath();
    ctx.strokeStyle=outlineColor; ctx.lineWidth=2 * scale; ctx.stroke();
    ctx.setLineDash([3 * scale, 4 * scale]); ctx.strokeStyle=gridColor; ctx.lineWidth=0.8 * scale;
    [20,40,60,80].forEach(pct => {
      const a1=b2c(pct,0,100-pct), a2=b2c(pct,100-pct,0); ctx.beginPath(); ctx.moveTo(a1.x,a1.y); ctx.lineTo(a2.x,a2.y); ctx.stroke();
      const b1=b2c(100-pct,pct,0), b2_=b2c(0,pct,100-pct); ctx.beginPath(); ctx.moveTo(b1.x,b1.y); ctx.lineTo(b2_.x,b2_.y); ctx.stroke();
      const c1=b2c(100-pct,0,pct), c2=b2c(0,100-pct,pct); ctx.beginPath(); ctx.moveTo(c1.x,c1.y); ctx.lineTo(c2.x,c2.y); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font=`bold ${13 * scale}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    zones2.forEach(z => { const pos=b2c(...T2_LABEL_POS[z.id]); ctx.fillStyle=T2_LABEL_COLOR[z.id]||textColor; ctx.fillText(z.id, pos.x, pos.y); });
    ctx.font=`bold ${12 * scale}px sans-serif`;
    ctx.fillStyle='#78350f'; ctx.textAlign='center'; ctx.fillText('CH₄', Ax, Ay - 18 * scale);
    ctx.fillStyle='#1e3a8a'; ctx.textAlign='right'; ctx.fillText('C₂H₂', Bx - 4 * scale, By + 20 * scale);
    ctx.fillStyle='#166534'; ctx.textAlign='left'; ctx.fillText('C₂H₄', Cx + 4 * scale, Cy + 20 * scale);
    ctx.font=`${9 * scale}px sans-serif`; ctx.fillStyle=textColor;
    [20,40,60,80].forEach(pct => {
      const lp=b2c(pct,0,100-pct); ctx.textAlign='right'; ctx.fillText(pct+'%', lp.x - 4 * scale, lp.y);
      const rp=b2c(100-pct,pct,0); ctx.textAlign='left'; ctx.fillText(pct+'%', rp.x + 4 * scale, rp.y);
      const bp=b2c(0,100-pct,pct); ctx.textAlign='center'; ctx.fillText(pct+'%', bp.x, bp.y + 12 * scale);
    });
    const total = g.ch4+g.c2h4+g.c2h2;
    if (total === 0) return;
    const pm=100*g.ch4/total, pe4=100*g.c2h4/total, pe2=100*g.c2h2/total;
    const pt = b2c(pm,pe4,pe2);
    const grad = ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,18 * scale);
    grad.addColorStop(0,'rgba(234,179,8,0.5)'); grad.addColorStop(1,'rgba(234,179,8,0)');
    ctx.beginPath(); ctx.arc(pt.x,pt.y,18 * scale,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.arc(pt.x,pt.y,8 * scale,0,Math.PI*2); ctx.fillStyle=T2_MARKER_COLOR; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=1.5 * scale; ctx.stroke();
    const d2 = calcDuval2(g);
    ctx.font=`bold ${11 * scale}px sans-serif`; ctx.fillStyle=dark?'#fff':'#111'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(d2.zone, pt.x, pt.y - 12 * scale);
  }

  /**
   * Draw the semicircular 0–100 risk gauge.
   * @param {number} score - risk score 0–100
   */
  function drawRiskGauge(score) {
    const canvas = document.getElementById('risk-canvas');
    if (!canvas) return; // defensive guard, consistent with the other draw* functions
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H - 14, r = 90;
    const start = Math.PI;
    const dark = isDarkTheme();
    ctx.lineWidth = 18; ctx.lineCap = 'round';
    RISK_GAUGE_SEGMENTS.forEach(([a,b,color]) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.arc(cx, cy, r, start + (a/100)*Math.PI, start + (b/100)*Math.PI);
      ctx.stroke();
    });
    const needleAngle = start + (score/100)*Math.PI;
    const nx = cx + Math.cos(needleAngle)*(r-6), ny = cy + Math.sin(needleAngle)*(r-6);
    const needleColor = dark ? '#e8ecf4' : '#161b2e';
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny); ctx.strokeStyle=needleColor; ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fillStyle=needleColor; ctx.fill();
    ctx.font='bold 26px sans-serif'; ctx.fillStyle=needleColor; ctx.textAlign='center';
    ctx.fillText(score, cx, cy-24);
    ctx.font='11px sans-serif'; ctx.fillStyle= dark ? '#7d84a0' : '#5c6280';
    ctx.fillText('/ 100 risk score', cx, cy-6);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.charts = {
    drawDuvalTriangle, drawDuvalTriangle4, drawDuvalTriangle2, drawRiskGauge,
    // Sprint: Duval legend — read-only references to the SAME zone/color
    // tables the draw functions above already use, so ui/duval-legend.js
    // can build its legend swatches from the single source of truth instead
    // of hand-copied colour literals. Nothing here is new data; every value
    // was already defined above this line.
    T1_ZONES, T1_LABEL_COLOR, T1_MARKER_COLOR,
    T2_ZONES, T2_LABEL_COLOR, T2_MARKER_COLOR
  };
})();
