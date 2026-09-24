/* ==========================================================
   lab.js  (नया)
   काम: "Virtual Physics Lab" — असली Lab जैसा Interactive Simulation।

   ज़रूरी सिद्धांत (सुरक्षा): कोई भी calculation JSON/AI से नहीं आता।
   सिर्फ़ 6 जाने-पहचाने "types" हैं, हर एक का सही भौतिकी-सूत्र नीचे
   L.TYPES में हाथ से लिखा और जाँचा गया है। experiment की JSON फ़ाइल
   सिर्फ़ शीर्षक, कदम (steps), parameter की range और छिपे हुए स्थिरांक
   (जैसे असली R) देती है — कभी कोई सूत्र-text नहीं। हर apparatus का
   चित्र भी यहीं (engine में) बना और animate होता है, JSON से SVG नहीं आता,
   ताकि हर experiment हमेशा सही और टूटा-न-हुआ दिखे।

   पुराना कुछ नहीं छुआ गया, सिर्फ़ 2 छोटे बदलाव — index.html में एक <script>
   line, और extras-core.js के Hub में एक card + KINDS.lab entry।

   Data: data/lab/manifest.json → { "lab": [ { subject, id, title, file } ] }
   Experiment JSON: data/lab/<subject>/<id>.json (नीचे schema देखो)
   State: mission2027_extras_v1 में ही "lab" भाग (localStorage) — पुराना कुछ नहीं छेड़ता
   Route: #/lab   #/lab/<subject>   #/lab/<subject>/<id>
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var L = {};
  function esc(s) { return M.App.esc(s); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function round(v, p) { var m = Math.pow(10, p || 2); return Math.round(v * m) / m; }
  function fmt(v, p) { return round(v, p == null ? 3 : p).toString(); }

  /* ==========================================================
     A. भौतिकी — 6 जाने-पहचाने experiment "types"
     हर type: calc(params, constants) → readings का object
     ========================================================== */
  L.TYPES = {

    'ohms-law': {
      label: 'ओम का नियम (V = IR)',
      calc: function (p, k) {
        var Rh = clamp(num(p.Rh, 0), 0, 1e9);
        var total = k.Rfixed + Rh + k.internalR;
        var I = total > 0 ? k.emf / total : 0; // Ampere
        var V = I * k.Rfixed; // Volt (Rfixed के आर-पार वोल्टमीटर)
        return { I: I, V: V };
      },
      // graph की ढाल से R निकालना है, इसलिए "result" हमेशा Rfixed होता है
      resultKey: 'Rfixed',
      resultLabel: 'R (Ω), ग्राफ़ की ढाल (slope) से',
      tableRow: function (p, k, r) { return [num(p.Rh, 0), r.V, r.I * 1000]; } // Rh, V, I(mA)
    },

    'meter-bridge': {
      label: 'मीटर ब्रिज (R₂ = R₁ × (100−l)/l)',
      calc: function (p, k) {
        var l = clamp(num(p.l, 50), 1, 99); // jockey की स्थिति (cm, 0-100 में से)
        var Rknown = clamp(num(p.Rknown, k.RknownDefault || 10), 0.1, 1e6);
        var l0 = (100 * k.Rx) / (Rknown + k.Rx); // सही संतुलन बिंदु
        var deflection = (l - l0) * 2; // galvanometer की सुई का झुकाव (आनुपातिक, प्रदर्शन के लिए)
        var Rcalc = Rknown * (100 - l) / l;
        return { l0: l0, deflection: deflection, balanced: Math.abs(l - l0) < 0.6, Rcalc: Rcalc, Rknown: Rknown };
      },
      resultKey: 'Rx',
      resultLabel: 'अज्ञात प्रतिरोध R₂ (Ω)',
      tableRow: function (p, k, r) { return [r.Rknown, num(p.l, 0), r.Rcalc]; } // R1, l, R2(calc)
    },

    'potentiometer-emf': {
      label: 'पोटेंशियोमीटर (E₁/E₂ = l₁/l₂)',
      calc: function (p, k) {
        var cell = p.cell === 2 ? 2 : 1;
        var l = clamp(num(p.l, 50), 1, 100);
        var trueE = cell === 1 ? k.E1 : k.E2;
        var l0 = trueE / k.gradient; // सही संतुलन लंबाई (cm)
        var deflection = (l - l0) * 3;
        return { l0: l0, deflection: deflection, balanced: Math.abs(l - l0) < 0.6, cell: cell };
      },
      resultKey: 'ratio', // E1/E2, अलग से जाँचा जाता है (दोनों l भरने के बाद)
      resultLabel: 'E₁ / E₂ का अनुपात',
      tableRow: function (p, k, r) { return [r.cell, num(p.l, 0), r.l0]; } // सेल, l, सही l0
    },

    'galvanometer-conversion': {
      label: 'गैल्वेनोमीटर से Ammeter/Voltmeter',
      calc: function (p, k) {
        var mode = p.mode === 'voltmeter' ? 'voltmeter' : 'ammeter';
        if (mode === 'ammeter') {
          var S = clamp(num(p.S, k.correctS), 0.001, 1e6);
          var Irange = k.Ig * (k.G + S) / S; // इतनी धारा पर पूरा deflection होगा
          return { mode: mode, Irange: Irange, needlePct: 1 };
        }
        var R = clamp(num(p.R, k.correctR), 0, 1e6);
        var Vrange = k.Ig * (k.G + R);
        return { mode: mode, Vrange: Vrange, needlePct: 1 };
      },
      resultKey: 'shuntOrSeries',
      resultLabel: 'सही Shunt/Series प्रतिरोध',
      tableRow: function (p, k, r) { return r.mode === 'ammeter' ? [num(p.S, 0), r.Irange * 1000] : [num(p.R, 0), r.Vrange]; }
    },

    'convex-lens-uv': {
      label: 'उत्तल लेंस — u-v विधि (1/f = 1/v + 1/u)',
      calc: function (p, k) {
        var u = clamp(num(p.u, k.f * 2), k.f * 1.05, 100); // u हमेशा f से थोड़ा ज़्यादा (नहीं तो असली प्रतिबिंब नहीं बनेगा)
        var v = (k.f * u) / (u - k.f);
        var m = -v / u; // आवर्धन (magnification)
        return { u: u, v: v, m: m, real: true };
      },
      resultKey: 'f',
      resultLabel: 'फ़ोकस दूरी f (cm)',
      tableRow: function (p, k, r) { return [r.u, r.v, (1 / r.v + 1 / r.u)]; } // u, v, 1/v+1/u
    },

    'diode-characteristic': {
      label: 'डायोड का अभिलाक्षणिक वक्र (V-I)',
      calc: function (p, k) {
        var V = clamp(num(p.V, 0), -2, 1.2);
        var Vt = 0.026, n = k.n || 1.8;
        var I; // mA में
        if (V >= 0) I = k.I0 * (Math.exp(V / (n * Vt)) - 1);
        else I = -k.Irev * (1 - Math.exp(V / 0.3)); // उल्टे बायस में बहुत छोटी, लगभग स्थिर धारा
        return { V: V, I: clamp(I, -0.05, 30) };
      },
      resultKey: 'Vknee',
      resultLabel: 'घुटना वोल्टता (knee voltage), लगभग (V)',
      tableRow: function (p, k, r) { return [r.V, r.I]; }
    }
  };

  // हर calc() को कुछ जाने-पहचाने मानों पर परखो (आँकड़े textbook जैसे) — पेज बनते ही एक बार चलता है
  L.selfTest = function () {
    var out = [];
    function chk(name, cond, detail) { out.push({ name: name, ok: !!cond, detail: detail }); }
    var o1 = L.TYPES['ohms-law'].calc({ Rh: 0 }, { emf: 6, internalR: 0.5, Rfixed: 10 });
    chk('ohms-law: Rh=0 पर I=6/10.5', Math.abs(o1.I - 6 / 10.5) < 1e-9, o1);
    chk('ohms-law: V = I × Rfixed', Math.abs(o1.V - o1.I * 10) < 1e-9, o1);
    var mb = L.TYPES['meter-bridge'].calc({ l: 40, Rknown: 10 }, { Rx: 15 });
    var expectedL0 = 100 * 15 / (10 + 15);
    chk('meter-bridge: l0 सही (60 के करीब)', Math.abs(mb.l0 - expectedL0) < 1e-9, mb);
    var pe = L.TYPES['potentiometer-emf'].calc({ cell: 1, l: 50 }, { E1: 1.5, E2: 1.1, gradient: 0.03 });
    chk('potentiometer: l0 = E/gradient', Math.abs(pe.l0 - 1.5 / 0.03) < 1e-9, pe);
    var ga = L.TYPES['galvanometer-conversion'].calc({ mode: 'ammeter', S: 1 }, { Ig: 0.001, G: 100, correctS: 1 });
    chk('galvanometer: Irange = Ig(G+S)/S', Math.abs(ga.Irange - 0.001 * 101 / 1) < 1e-9, ga);
    var ln = L.TYPES['convex-lens-uv'].calc({ u: 30 }, { f: 10 });
    chk('lens: 1/f = 1/v + 1/u (f=10,u=30 → v=15)', Math.abs(ln.v - 15) < 1e-6, ln);
    var dd = L.TYPES['diode-characteristic'].calc({ V: 0 }, { I0: 1e-6, n: 1.8, Irev: 0.001 });
    chk('diode: V=0 पर I≈0', Math.abs(dd.I) < 1e-6, dd);
    return out;
  };

  /* ==========================================================
     B. Apparatus का चित्र — हर type अपना खुद animate होने वाला SVG बनाता और अपडेट करता है
     ========================================================== */
  function needleTransform(cx, cy, len, deg) {
    var r = (deg - 90) * Math.PI / 180;
    var x2 = cx + len * Math.cos(r), y2 = cy + len * Math.sin(r);
    return { x2: x2, y2: y2 };
  }
  function setLine(svg, id, x2, y2) { var el = svg.querySelector('#' + id); if (el) { el.setAttribute('x2', x2); el.setAttribute('y2', y2); } }
  function setText(svg, id, t) { var el = svg.querySelector('#' + id); if (el) el.textContent = t; }
  function setAttr(svg, id, k, v) { var el = svg.querySelector('#' + id); if (el) el.setAttribute(k, v); }

  L.DRAW = {
    'ohms-law': {
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>" +
        "<rect x='16' y='16' width='368' height='228' rx='14' fill='none' stroke='#c8d0e0' stroke-width='1.5'/>" +
        "<line x1='60' y1='210' x2='340' y2='210' stroke='#334' stroke-width='3'/>" +
        "<line x1='60' y1='210' x2='60' y2='60' stroke='#334' stroke-width='3'/>" +
        "<line x1='60' y1='60' x2='340' y2='60' stroke='#334' stroke-width='3'/>" +
        "<line x1='340' y1='60' x2='340' y2='210' stroke='#334' stroke-width='3'/>" +
        "<rect x='40' y='95' width='40' height='24' fill='#fff' stroke='#334' stroke-width='2'/><text x='60' y='111' text-anchor='middle' font-family='sans-serif' font-size='12'>🔋</text>" +
        "<rect x='150' y='45' width='80' height='26' fill='#fde68a' stroke='#334' stroke-width='2'/><text x='190' y='63' text-anchor='middle' font-family='sans-serif' font-size='12'>R (स्थिर)</text>" +
        "<circle cx='300' cy='60' r='22' fill='#fff' stroke='#334' stroke-width='2'/><text x='300' y='40' text-anchor='middle' font-family='sans-serif' font-size='11'>A</text>" +
        "<line id='ohm-needleI' x1='300' y1='60' x2='300' y2='44' stroke='#dc2626' stroke-width='2'/>" +
        "<circle cx='190' cy='150' r='24' fill='#fff' stroke='#334' stroke-width='2'/><text x='190' y='188' text-anchor='middle' font-family='sans-serif' font-size='11'>V</text>" +
        "<line id='ohm-needleV' x1='190' y1='150' x2='190' y2='132' stroke='#2563eb' stroke-width='2'/>" +
        "<rect x='90' y='198' width='90' height='24' fill='#e5e7eb' stroke='#334' stroke-width='2'/><text x='135' y='214' text-anchor='middle' font-family='sans-serif' font-size='11'>Rheostat (Rh)</text>" +
        "<circle id='ohm-rheoKnob' cx='135' cy='198' r='5' fill='#dc2626'/>" +
        "<text id='ohm-txtI' x='300' y='96' text-anchor='middle' font-family='sans-serif' font-size='13' fill='#dc2626'>I = 0 mA</text>" +
        "<text id='ohm-txtV' x='190' y='198' text-anchor='middle' font-family='sans-serif' font-size='13' fill='#2563eb'>V = 0 V</text>" +
        "</svg>",
      update: function (svg, r, p, k) {
        var maxI = k.emf / (k.Rfixed + k.internalR) * 1.15;
        var degI = clamp(-55 + (r.I / maxI) * 110, -55, 55);
        var degV = clamp(-55 + (r.V / (k.emf * 0.9)) * 110, -55, 55);
        var nI = needleTransform(300, 60, 16, degI), nV = needleTransform(190, 150, 18, degV);
        setLine(svg, 'ohm-needleI', nI.x2, nI.y2);
        setLine(svg, 'ohm-needleV', nV.x2, nV.y2);
        setText(svg, 'ohm-txtI', 'I = ' + fmt(r.I * 1000, 1) + ' mA');
        setText(svg, 'ohm-txtV', 'V = ' + fmt(r.V, 2) + ' V');
        var kx = 90 + clamp(num(p.Rh, 0) / (k.RhMax || 20), 0, 1) * 90;
        setAttr(svg, 'ohm-rheoKnob', 'cx', kx);
      }
    },

    'meter-bridge': {
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 220'>" +
        "<line x1='40' y1='80' x2='360' y2='80' stroke='#8a5a2b' stroke-width='4'/>" +
        "<text x='40' y='72' font-family='sans-serif' font-size='11'>A(0)</text><text x='348' y='72' font-family='sans-serif' font-size='11'>B(100)</text>" +
        "<rect x='140' y='30' width='60' height='24' fill='#fde68a' stroke='#334' stroke-width='2'/><text x='170' y='47' text-anchor='middle' font-family='sans-serif' font-size='11'>R₁ ज्ञात</text>" +
        "<line x1='140' y1='54' x2='120' y2='80' stroke='#334' stroke-width='2'/><line x1='200' y1='54' x2='200' y2='80' stroke='#334' stroke-width='2'/>" +
        "<rect x='210' y='30' width='60' height='24' fill='#fecaca' stroke='#334' stroke-width='2'/><text x='240' y='47' text-anchor='middle' font-family='sans-serif' font-size='11'>R₂ अज्ञात</text>" +
        "<line x1='210' y1='54' x2='200' y2='80' stroke='#334' stroke-width='2'/><line x1='270' y1='54' x2='280' y2='80' stroke='#334' stroke-width='2'/>" +
        "<circle cx='200' cy='140' r='22' fill='#fff' stroke='#334' stroke-width='2'/><text x='200' y='125' text-anchor='middle' font-family='sans-serif' font-size='11'>G</text>" +
        "<line id='mb-needle' x1='200' y1='140' x2='200' y2='124' stroke='#dc2626' stroke-width='2'/>" +
        "<line x1='200' y1='118' x2='200' y2='80' stroke='#334' stroke-width='1.5' stroke-dasharray='3 2'/>" +
        "<line id='mb-jockey' x1='120' y1='80' x2='120' y2='96' stroke='#111' stroke-width='3'/>" +
        "<text id='mb-txt' x='200' y='185' text-anchor='middle' font-family='sans-serif' font-size='13'>l = 0 cm</text>" +
        "<text id='mb-bal' x='200' y='205' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#16a34a'></text>" +
        "</svg>",
      update: function (svg, r, p, k) {
        var l = clamp(num(p.l, 50), 1, 99);
        var x = 40 + (l / 100) * 320;
        setAttr(svg, 'mb-jockey', 'x1', x); setAttr(svg, 'mb-jockey', 'x2', x);
        var deg = clamp(r.deflection, -55, 55);
        var n = needleTransform(200, 140, 16, deg);
        setLine(svg, 'mb-needle', n.x2, n.y2);
        setText(svg, 'mb-txt', 'l = ' + fmt(l, 1) + ' cm');
        setText(svg, 'mb-bal', r.balanced ? '✅ संतुलित (Balanced)' : '');
      }
    },

    'potentiometer-emf': {
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'>" +
        "<line x1='40' y1='60' x2='360' y2='60' stroke='#8a5a2b' stroke-width='4'/>" +
        "<text x='40' y='50' font-family='sans-serif' font-size='11'>0 cm</text><text x='340' y='50' font-family='sans-serif' font-size='11'>100 cm</text>" +
        "<rect x='170' y='100' width='60' height='24' fill='#bfdbfe' stroke='#334' stroke-width='2'/><text id='pot-cellTxt' x='200' y='117' text-anchor='middle' font-family='sans-serif' font-size='11'>सेल 1</text>" +
        "<circle cx='200' cy='160' r='20' fill='#fff' stroke='#334' stroke-width='2'/><text x='200' y='146' text-anchor='middle' font-family='sans-serif' font-size='11'>G</text>" +
        "<line id='pot-needle' x1='200' y1='160' x2='200' y2='145' stroke='#dc2626' stroke-width='2'/>" +
        "<line id='pot-jockey' x1='200' y1='60' x2='200' y2='76' stroke='#111' stroke-width='3'/>" +
        "<text id='pot-txt' x='200' y='185' text-anchor='middle' font-family='sans-serif' font-size='12'>l = 0 cm</text>" +
        "</svg>",
      update: function (svg, r, p, k) {
        var l = clamp(num(p.l, 50), 1, 100);
        var x = 40 + (l / 100) * 320;
        setAttr(svg, 'pot-jockey', 'x1', x); setAttr(svg, 'pot-jockey', 'x2', x);
        var deg = clamp(r.deflection, -55, 55);
        var n = needleTransform(200, 160, 15, deg);
        setLine(svg, 'pot-needle', n.x2, n.y2);
        setText(svg, 'pot-txt', 'सेल ' + r.cell + ' · l = ' + fmt(l, 1) + ' cm' + (r.balanced ? ' ✅ संतुलित' : ''));
        setText(svg, 'pot-cellTxt', 'सेल ' + r.cell);
      }
    },

    'galvanometer-conversion': {
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'>" +
        "<circle cx='200' cy='90' r='40' fill='#fff' stroke='#334' stroke-width='2'/><text x='200' y='60' text-anchor='middle' font-family='sans-serif' font-size='12'>G</text>" +
        "<line id='gv-needle' x1='200' y1='90' x2='200' y2='58' stroke='#dc2626' stroke-width='2.5'/>" +
        "<text id='gv-mode' x='200' y='150' text-anchor='middle' font-family='sans-serif' font-size='13'></text>" +
        "<text id='gv-range' x='200' y='172' text-anchor='middle' font-family='sans-serif' font-size='13' font-weight='bold'></text>" +
        "</svg>",
      update: function (svg, r, p, k) {
        setText(svg, 'gv-mode', r.mode === 'ammeter' ? 'Ammeter मोड — Shunt (S) जोड़ा' : 'Voltmeter मोड — Series (R) जोड़ा');
        setText(svg, 'gv-range', r.mode === 'ammeter' ? 'पूरे scale की धारा ≈ ' + fmt(r.Irange * 1000, 2) + ' mA' : 'पूरे scale का वोल्टेज ≈ ' + fmt(r.Vrange, 2) + ' V');
        var n = needleTransform(200, 90, 32, 0);
        setLine(svg, 'gv-needle', n.x2, n.y2);
      }
    },

    'convex-lens-uv': {
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'>" +
        "<line x1='20' y1='100' x2='380' y2='100' stroke='#c8d0e0' stroke-width='1'/>" +
        "<line x1='200' y1='30' x2='200' y2='170' stroke='#2563eb' stroke-width='4'/><text x='200' y='24' text-anchor='middle' font-family='sans-serif' font-size='11'>उत्तल लेंस</text>" +
        "<line id='lens-obj' x1='150' y1='100' x2='150' y2='70' stroke='#111' stroke-width='2' marker-end='url(#lensArrow)'/>" +
        "<line id='lens-img' x1='250' y1='100' x2='250' y2='130' stroke='#16a34a' stroke-width='2' marker-end='url(#lensArrow2)'/>" +
        "<defs><marker id='lensArrow' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0,3 L3,0 L6,3' fill='none' stroke='#111'/></marker>" +
        "<marker id='lensArrow2' markerWidth='6' markerHeight='6' refX='3' refY='6' orient='auto'><path d='M0,3 L3,6 L6,3' fill='none' stroke='#16a34a'/></marker></defs>" +
        "<text id='lens-txt' x='200' y='190' text-anchor='middle' font-family='sans-serif' font-size='12'></text>" +
        "</svg>",
      update: function (svg, r, p, k) {
        var scale = 3.2;
        var ox = clamp(200 - r.u * scale, 25, 195), ix = clamp(200 + r.v * scale, 205, 375);
        setAttr(svg, 'lens-obj', 'x1', ox); setAttr(svg, 'lens-obj', 'x2', ox);
        setAttr(svg, 'lens-img', 'x1', ix); setAttr(svg, 'lens-img', 'x2', ix);
        setText(svg, 'lens-txt', 'u = ' + fmt(r.u, 1) + ' cm, v = ' + fmt(r.v, 1) + ' cm, आवर्धन m = ' + fmt(r.m, 2));
      }
    },

    'diode-characteristic': {
      svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 220'>" +
        "<line x1='60' y1='190' x2='380' y2='190' stroke='#334' stroke-width='1.5'/><text x='385' y='194' font-family='sans-serif' font-size='11'>V</text>" +
        "<line x1='220' y1='20' x2='220' y2='190' stroke='#334' stroke-width='1.5'/><text x='220' y='14' text-anchor='middle' font-family='sans-serif' font-size='11'>I (mA)</text>" +
        "<path id='diode-curve' d='' fill='none' stroke='#c8d0e0' stroke-width='2'/>" +
        "<circle id='diode-pt' cx='220' cy='190' r='5' fill='#dc2626'/>" +
        "<text id='diode-txt' x='300' y='40' font-family='sans-serif' font-size='12'></text>" +
        "</svg>",
      update: function (svg, r, p, k) {
        var pts = [], V;
        for (V = -2; V <= 1.2; V += 0.08) {
          var c = L.TYPES['diode-characteristic'].calc({ V: V }, k);
          var x = 220 + V * 130, y = 190 - c.I * 5;
          pts.push((pts.length ? 'L' : 'M') + fmt(x, 1) + ',' + fmt(clamp(y, 20, 190), 1));
        }
        var el = svg.querySelector('#diode-curve'); if (el) el.setAttribute('d', pts.join(' '));
        var px = 220 + r.V * 130, py = 190 - r.I * 5;
        setAttr(svg, 'diode-pt', 'cx', px); setAttr(svg, 'diode-pt', 'cy', clamp(py, 20, 190));
        setText(svg, 'diode-txt', 'V = ' + fmt(r.V, 2) + ' V, I = ' + fmt(r.I, 3) + ' mA');
      }
    }
  };

  /* ==========================================================
     C. Experiment JSON पढ़ना और जाँचना
     ========================================================== */
  var ALLOWED_TYPES = Object.keys(L.TYPES);
  L.load = function (entry) {
    return X.loadFile(entry.file).then(function (raw) {
      var r = { status: 'ok', data: null, error: '', count: 1, skipped: [] };
      if (raw && raw.__missing) { r.status = 'missing'; return r; }
      if (raw && raw.__error) { r.status = 'error'; r.error = raw.__error; return r; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { r.status = 'error'; r.error = 'JSON सही object नहीं है'; return r; }
      var type = typeof raw.type === 'string' ? raw.type.trim() : '';
      if (ALLOWED_TYPES.indexOf(type) < 0) { r.status = 'error'; r.error = '"type" "' + type + '" नहीं पहचाना गया (सिर्फ़ ' + ALLOWED_TYPES.join(', ') + ' चल सकते हैं)'; return r; }
      var title = typeof raw.title === 'string' ? raw.title.trim() : '';
      var aim = typeof raw.aim === 'string' ? raw.aim.trim() : '';
      if (!title || !aim) { r.status = 'error'; r.error = '"title" या "aim" खाली है'; return r; }
      var apparatus = Array.isArray(raw.apparatus) ? raw.apparatus.filter(function (a) { return typeof a === 'string' && a.trim(); }) : [];
      var steps = Array.isArray(raw.steps) ? raw.steps.map(function (s, i) {
        if (!s || typeof s.text !== 'string' || !s.text.trim()) return null;
        var o = { id: 's' + i, text: s.text.trim() };
        if (typeof s.param === 'string') o.param = s.param;
        if (typeof s.target === 'number') o.target = s.target;
        if (s.action === 'read') o.action = 'read';
        return o;
      }).filter(Boolean) : [];
      var params = Array.isArray(raw.params) ? raw.params.map(function (pp) {
        if (!pp || typeof pp.key !== 'string') return null;
        return {
          key: pp.key, label: typeof pp.label === 'string' ? pp.label : pp.key,
          unit: typeof pp.unit === 'string' ? pp.unit : '',
          min: num(pp.min, 0), max: num(pp.max, 100), step: num(pp.step, 1), def: num(pp.default, num(pp.min, 0))
        };
      }).filter(Boolean) : [];
      if (!params.length || !steps.length) { r.status = 'error'; r.error = '"params" या "steps" खाली है'; return r; }
      var constants = raw.constants && typeof raw.constants === 'object' ? raw.constants : {};
      var table = raw.table && Array.isArray(raw.table.columns) ? raw.table.columns.filter(function (c) { return typeof c === 'string'; }) : [];
      var resultHint = typeof raw.resultHint === 'string' ? raw.resultHint : '';
      var trueAnswer = L.TYPES[type].resultKey && typeof constants[L.TYPES[type].resultKey] === 'number' ? constants[L.TYPES[type].resultKey] : null;
      r.data = { type: type, title: title, aim: aim, apparatus: apparatus, steps: steps, params: params, constants: constants, table: table, resultHint: resultHint, trueAnswer: trueAnswer };
      return r;
    });
  };

  /* ==========================================================
     D. अपना छोटा state (mission2027_extras_v1 में "lab" भाग) — पुराना कुछ नहीं छूता
     ========================================================== */
  function store() { var s = X.store(); if (!s.lab) s.lab = {}; return s.lab; }
  function keyOf(subject, id) { return subject + '|' + id; }
  function getRun(subject, id) {
    var st = store(), k = keyOf(subject, id);
    if (!st[k]) st[k] = { values: {}, doneSteps: [], rows: [], solved: false };
    return st[k];
  }
  function saveRun() { X.save(); }

  /* ==========================================================
     E. पेज — विषय चुनो / Experiment चुनो / Experiment चलाओ
     ========================================================== */
  function labIcon(type) {
    return { 'ohms-law': '🔋', 'meter-bridge': '🌉', 'potentiometer-emf': '🪫', 'galvanometer-conversion': '🧲', 'convex-lens-uv': '🔍', 'diode-characteristic': '⚡' }[type] || '🧪';
  }
  function viewHome() {
    X.boot();
    return X.manifest('lab').then(function (mf) {
      var html = '<section class="page xs"><div class="banner info"><span>🧪 यह <b>असली Lab नहीं है</b> — समझने के लिए Simulation है। असली Lab ज़रूर करना।</span></div>';
      if (mf.status === 'error') html += '<div class="banner bad">⚠️ Lab manifest पढ़ने में गड़बड़ी: ' + esc(mf.error) + '</div>';
      var subs = M.Subjects.list().filter(function (s) { return X.entriesFor(mf, s.id).length; });
      if (!subs.length) html += X.emptyHtml('🧪', 'Virtual Lab अभी खाली है', 'Experiments जल्द जोड़े जाएँगे।', 'नोट्स · PYQ · Practice', '/extras');
      else {
        html += '<div class="grid-cards">';
        subs.forEach(function (s) {
          var n = X.entriesFor(mf, s.id).length;
          html += X.subjectCard(s, n + ' Experiment उपलब्ध', 'उपलब्ध', 'ok', '/lab/' + s.id);
        });
        html += '</div>';
      }
      html += '</section>';
      return X.view({ html: html, title: 'Virtual Lab', sub: 'विषय चुनो', back: '/extras' });
    });
  }
  function viewSubject(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    return X.manifest('lab').then(function (mf) {
      var entries = X.entriesFor(mf, s.id);
      return Promise.all(entries.map(function (en) { return L.load(en); })).then(function (loads) {
        var html = '<section class="page xs">';
        if (!entries.length) html += X.emptyHtml('🧪', s.nameHi + ' — Virtual Lab', X.MSG_EMPTY_GENERIC, 'सारे विषय', '/lab');
        else {
          html += '<div class="x-list">';
          entries.forEach(function (en, i) {
            var Ld = loads[i];
            var run = Ld.status === 'ok' ? getRun(s.id, en.id) : null;
            html += '<button class="x-row' + (Ld.status !== 'ok' ? ' off' : '') + '" data-action="nav" data-to="' + esc('/lab/' + s.id + '/' + en.id) + '">' +
              '<span class="x-row-no">' + labIcon(Ld.status === 'ok' ? Ld.data.type : '') + '</span>' +
              '<span class="x-row-main"><strong>' + esc(Ld.status === 'ok' ? Ld.data.title : (en.title || en.id)) + '</strong><span class="cc-chips">' +
              (Ld.status === 'ok' ? '<span class="chip tiny">' + esc(L.TYPES[Ld.data.type].label) + '</span>' + (run.solved ? '<span class="chip tiny ok">✅ पूरा हुआ</span>' : '') :
                '<span class="chip tiny soon">' + (Ld.status === 'empty' ? 'अभी उपलब्ध नहीं' : Ld.status === 'missing' ? 'फ़ाइल नहीं मिली' : 'गड़बड़ी') + '</span>') +
              '</span></span><span class="x-row-end">›</span></button>';
          });
          html += '</div>';
        }
        html += '</section>';
        return X.view({ html: html, title: 'Virtual Lab', sub: s.nameHi, back: '/lab' });
      });
    });
  }

  /* ---------- Experiment चलाना ---------- */
  var curCtx = null; // { subject, id, data, run }
  function stepDone(step, run) { return run.doneSteps.indexOf(step.id) >= 0; }
  function stepUnlocked(steps, run, i) {
    for (var j = 0; j < i; j++) { if (!stepDone(steps[j], run)) return false; }
    return true;
  }
  // आगे बढ़ते क्रम में जो step अभी पूरा माना जा सकता है, उसे स्थायी रूप से doneSteps में जोड़ो
  // (एक बार पूरा हुआ step बाद में slider हटाने से "अधूरा" नहीं बनता — असली Lab जैसा)
  function commitEligibleSteps() {
    var d = curCtx.data, run = curCtx.run;
    for (var i = 0; i < d.steps.length; i++) {
      var st = d.steps[i];
      if (stepDone(st, run)) continue;
      if (!stepUnlocked(d.steps, run, i)) break;
      if (st.action === 'read') break; // सिर्फ़ बटन दबाने से आगे बढ़ता है
      if (st.param) {
        if (Math.abs(num(run.values[st.param], NaN) - st.target) < 1e-6) { run.doneSteps.push(st.id); continue; }
        break;
      }
      run.doneSteps.push(st.id); // सादा निर्देश-वाला step, अपने-आप पूरा
    }
  }
  function computeReading() {
    var d = curCtx.data, T = L.TYPES[d.type];
    return T.calc(curCtx.run.values, d.constants);
  }
  function paramInputsHtml() {
    var d = curCtx.data, run = curCtx.run;
    return d.params.map(function (pp) {
      var v = run.values[pp.key] != null ? run.values[pp.key] : pp.def;
      return '<div class="lab-param"><label>' + esc(pp.label) + ' <b>' + fmt(v, 2) + ' ' + esc(pp.unit) + '</b></label>' +
        '<input type="range" min="' + pp.min + '" max="' + pp.max + '" step="' + pp.step + '" value="' + v + '" data-lab-param="' + esc(pp.key) + '"></div>';
    }).join('');
  }
  function stepsHtml() {
    var d = curCtx.data, run = curCtx.run;
    commitEligibleSteps();
    return '<div class="lab-steps">' + d.steps.map(function (st, i) {
      var unlocked = stepUnlocked(d.steps, run, i);
      var done = unlocked && stepDone(st, run);
      var cls = !unlocked ? 'locked' : done ? 'done' : 'active';
      var extra = '';
      if (unlocked && !done && st.action === 'read') extra = '<button class="btn small" data-action="lab-read" data-step="' + st.id + '">✅ यह रीडिंग लो</button>';
      return '<div class="lab-step ' + cls + '"><span class="lab-step-ico">' + (done ? '✅' : unlocked ? '▶' : '🔒') + '</span>' +
        '<span class="lab-step-text">' + X.rich(st.text) + '</span>' + extra + '</div>';
    }).join('') + '</div>';
  }
  function tableHtml() {
    var d = curCtx.data, run = curCtx.run;
    if (!d.table.length) return '';
    var rows = run.rows.map(function (row) { return '<tr>' + row.map(function (c) { return '<td>' + esc(fmt(c, 3)) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="card"><h3 class="card-title">📋 Observation Table</h3><div class="lab-table-wrap"><table class="lab-table"><thead><tr>' +
      d.table.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + d.table.length + '" class="muted">अभी कोई reading नहीं ली गई</td></tr>') + '</tbody></table></div></div>';
  }
  function resultHtml() {
    var d = curCtx.data, run = curCtx.run, T = L.TYPES[d.type];
    if (!T.resultLabel) return '';
    var box = '<div class="card"><h3 class="card-title">🎯 परिणाम निकालो</h3>' +
      (d.resultHint ? '<p class="muted small">' + X.rich(d.resultHint) + '</p>' : '') +
      '<div class="lab-result-row"><input type="number" step="any" id="labAnswer" placeholder="' + esc(T.resultLabel) + '" value="' + (run.answer != null ? run.answer : '') + '">' +
      '<button class="btn" data-action="lab-check">जाँचो</button></div>';
    if (run.solved) box += '<p class="ans ok">✅ सही! असली मान के बहुत करीब।</p>';
    else if (run.checked === false) box += '<p class="ans bad">❌ अभी नहीं मिला। कम से कम 3 readings लेकर, ग्राफ़/अनुपात से दोबारा निकालो।</p>';
    box += '</div>';
    return box;
  }
  function bodyHtml() {
    var d = curCtx.data;
    var html = '<div class="card"><span class="chip x-new">नया · Virtual Lab</span><h2 style="margin:8px 0 4px">' + esc(d.title) + '</h2>' +
      '<p class="muted small"><b>उद्देश्य:</b> ' + X.rich(d.aim) + '</p>' +
      (d.apparatus.length ? '<p class="muted small"><b>उपकरण:</b> ' + d.apparatus.map(esc).join(', ') + '</p>' : '') + '</div>';
    html += '<div class="card lab-appcard"><div class="lab-svg" id="labSvg">' + L.DRAW[d.type].svg + '</div>' + paramInputsHtml() + '</div>';
    html += '<div class="card"><h3 class="card-title">📝 करने का तरीका</h3>' + stepsHtml() + '</div>';
    html += tableHtml();
    html += resultHtml();
    html += '<p class="x-note">ℹ️ यह Lab XP, Chapter progress या Mistake Notebook में नहीं जुड़ता।</p>';
    return html;
  }
  function rerender(full) {
    var root = document.getElementById('labBody');
    if (!root || !curCtx) return;
    commitEligibleSteps();
    if (full) { root.innerHTML = bodyHtml(); }
    var svg = root.querySelector('#labSvg svg');
    if (svg) L.DRAW[curCtx.data.type].update(svg, computeReading(), curCtx.run.values, curCtx.data.constants);
    if (!full) {
      var steps = root.querySelector('.lab-steps');
      if (steps) steps.outerHTML = stepsHtml();
      var tbl = root.querySelector('.lab-table-wrap');
      if (tbl) tbl.parentNode.outerHTML = tableHtml() || '<div></div>';
      var res = root.querySelector('.lab-result-row');
      if (res) res.closest('.card').outerHTML = resultHtml() || '<div></div>';
    }
  }

  function viewExperiment(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    var back = '/lab/' + s.id;
    return X.manifest('lab').then(function (mf) {
      var en = X.entriesFor(mf, s.id).filter(function (e) { return e.id === p.id; })[0];
      if (!en) return X.view({ html: '<section class="page xs">' + X.emptyHtml('🧪', 'यह Experiment नहीं मिला', 'manifest में entry नहीं है।', 'वापस जाओ', back) + '</section>', title: 'Virtual Lab', sub: s.nameHi, back: back });
      return L.load(en).then(function (Ld) {
        if (Ld.status === 'missing') return X.view({ html: '<section class="page xs">' + X.errorHtml('इस Experiment की फ़ाइल नहीं मिली', 'manifest में नाम है, पर फ़ाइल upload नहीं हुई या path गलत है।', en.file) + '</section>', title: 'Virtual Lab', sub: s.nameHi, back: back });
        if (Ld.status === 'error') return X.view({ html: '<section class="page xs">' + X.errorHtml('इस Experiment की फ़ाइल पढ़ी नहीं जा सकी', Ld.error, en.file) + '</section>', title: 'Virtual Lab', sub: s.nameHi, back: back });
        var run = getRun(s.id, en.id);
        // params की शुरुआती value भरना (सिर्फ़ पहली बार)
        Ld.data.params.forEach(function (pp) { if (run.values[pp.key] == null) run.values[pp.key] = pp.def; });
        curCtx = { subject: s.id, id: en.id, data: Ld.data, run: run };
        return X.view({ html: '<section class="page xs"><div id="labBody">' + bodyHtml() + '</div></section>', title: 'Virtual Lab', sub: Ld.data.title, backAction: 'lab-leave', after: function () { rerender(false); } });
      });
    });
  }

  X.onReady(function (A) {
    A['lab-leave'] = function () { curCtx = null; M.Router.go(curCtx ? '/lab/' + curCtx.subject : '/lab'); };
    A['lab-read'] = function (el) {
      if (!curCtx) return;
      var stepId = el.dataset.step, d = curCtx.data, run = curCtx.run;
      if (run.doneSteps.indexOf(stepId) < 0) run.doneSteps.push(stepId);
      var r = computeReading();
      var T = L.TYPES[d.type];
      var row = T.tableRow ? T.tableRow(run.values, d.constants, r) : [];
      run.rows.push(row.map(function (v) { return num(v, 0); }));
      if (run.rows.length > 20) run.rows = run.rows.slice(-20);
      saveRun();
      if (M.Sound) M.Sound.play('correct');
      rerender(false);
    };
    A['lab-check'] = function () {
      if (!curCtx) return;
      var d = curCtx.data, run = curCtx.run, inp = document.getElementById('labAnswer');
      var ans = inp ? Number(inp.value) : NaN;
      run.answer = isFinite(ans) ? ans : null;
      var truth = d.trueAnswer;
      run.checked = truth != null && isFinite(ans) ? Math.abs(ans - truth) <= Math.abs(truth) * 0.08 + 0.05 : false;
      run.solved = run.checked === true;
      saveRun();
      if (M.Sound) M.Sound.play(run.solved ? 'win' : 'wrong');
      rerender(false);
      if (run.solved) M.App.toast('🎉 सही! Experiment पूरा हुआ।', 'ok');
    };
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.matches || !t.matches('[data-lab-param]') || !curCtx) return;
    curCtx.run.values[t.dataset.labParam] = Number(t.value);
    saveRun();
    rerender(false);
    var lbl = t.parentNode.querySelector('label b');
    if (lbl) { var pp = curCtx.data.params.filter(function (p) { return p.key === t.dataset.labParam; })[0]; if (pp) lbl.textContent = fmt(Number(t.value), 2) + ' ' + pp.unit; }
  });

  if (M.Router && M.Router.add) {
    M.Router.add('/lab', viewHome);
    M.Router.add('/lab/:subject', viewSubject);
    M.Router.add('/lab/:subject/:id', viewExperiment);
  }

  M.Lab = L;
})(window.M27 = window.M27 || {});

