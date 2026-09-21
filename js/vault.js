/* ==========================================================
   vault.js  (नया)
   काम: "Fun Vault" — चुटकुले / पहेलियाँ, सख़्त नियम के साथ।

   नियम:
   1. किसी Chapter के Notes पढ़कर "✅ पढ़ लिए" मार्क करो।
   2. उस Chapter का "Vault Challenge" खेलो: Notes से बने 50 प्रश्न।
      Chapter में 50 से कम प्रश्न बन पाएँ (49 या कम) तो उस Chapter से Vault नहीं खुलेगा।
   3. कम से कम 95% सही (50 में से 48, यानी ज़्यादा से ज़्यादा 2 गलत) → Vault खुलता है।
   4. 95% पूरा होते ही Vault का अपना Timer शुरू होता है — सिर्फ़ 10 मिनट।
      (यह पढ़ाई वाले Timer से अलग है, और Vault का पेज "पढ़ाई का समय" में नहीं गिना जाता।)
   5. 10 मिनट बाद Vault फिर बंद। दोबारा खोलने के लिए फिर Challenge जीतो।

   चुटकुलों का Data: data/vault/manifest.json + हर फ़ाइल (नमूना: data/templates/vault-jokes-template.json)

   ⚠️ सीमा (साफ़ बात): यह website static है और उसके पास server नहीं है, इसलिए यह lock
   पक्की सुरक्षा नहीं, आत्म-अनुशासन का औज़ार है। नीचे के उपाय आम छेड़छाड़ (data बदलना,
   फ़ोन की घड़ी आगे-पीछे करना) को पकड़ते या मुश्किल बनाते हैं। पूरी तरह पक्का lock सिर्फ़
   server + login से बन सकता है।
   Route: #/vault
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var NG = M.NotesGame;
  var V = {};
  var NEED = 50;        // Challenge में प्रश्न (और Chapter में कम से कम इतने बनने चाहिए)
  var PASS = 95;        // कम से कम सही %
  var MINUTES = 10;     // Vault खुला रहने का समय
  var LIMIT = MINUTES * 60000;
  var SECRET = 'm27-vault-a1';
  var VKEY = 'mission2027_vault_v1';
  V.PASS = PASS; V.NEED = NEED; V.MINUTES = MINUTES;
  function esc(s) { return M.App.esc(s); }
  function fmt(sec) { return M.App.fmtTime(Math.max(0, Math.ceil(sec))); }

  /* ---------- अपना छोटा storage ---------- */
  var vs = null;
  function vload() {
    if (vs) return vs;
    var d = { until: 0, at: 0, lastSeen: 0, sig: '', why: '', seen: [], best: {} };
    try {
      var raw = window.localStorage.getItem(VKEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          d.until = Number(p.until) || 0; d.at = Number(p.at) || 0; d.lastSeen = Number(p.lastSeen) || 0;
          d.sig = typeof p.sig === 'string' ? p.sig : ''; d.why = typeof p.why === 'string' ? p.why : '';
          if (Array.isArray(p.seen)) d.seen = p.seen.filter(function (x) { return typeof x === 'string'; }).slice(-1500);
          if (p.best && typeof p.best === 'object' && !Array.isArray(p.best)) d.best = p.best;
        }
      }
    } catch (e) { /* ignore */ }
    vs = d;
    return d;
  }
  function vsave() { try { window.localStorage.setItem(VKEY, JSON.stringify(vload())); } catch (e) { /* ignore */ } }

  // हल्का हस्ताक्षर: data हाथ से बदलने पर पकड़ में आ जाता है (पक्की सुरक्षा नहीं)
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, ch;
    for (i = 0; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function sign(v) { return hash(v.until + '|' + v.at + '|' + SECRET); }
  function lock(why) {
    var v = vload();
    v.until = 0; v.at = 0; v.sig = ''; v.why = why; v.lastSeen = Date.now();
    vsave();
  }

  /* ---------- Vault की स्थिति ---------- */
  // वापसी: { open:true, left:ms }  या  { open:false, why:'expired'|'clock'|'tampered'|'' }
  V.state = function () {
    var v = vload(), now = Date.now();
    if (!v.until) return { open: false, why: v.why || '' };
    if (v.sig !== sign(v)) { lock('tampered'); return { open: false, why: 'tampered' }; }
    if (now < v.lastSeen - 60000) { lock('clock'); return { open: false, why: 'clock' }; }          // घड़ी पीछे की गई
    if (v.until - now > LIMIT + 5000) { lock('clock'); return { open: false, why: 'clock' }; }      // घड़ी पीछे/समय बढ़ाया गया
    if (now >= v.until) { lock('expired'); return { open: false, why: 'expired' }; }
    return { open: true, left: v.until - now };
  };
  function touch() { var v = vload(), now = Date.now(); if (now > v.lastSeen) v.lastSeen = now; vsave(); }
  var WHY = {
    expired: '⏰ 10 मिनट पूरे हो गए, Vault फिर बंद हो गया।',
    clock: '⚠️ फ़ोन की घड़ी में गड़बड़ी मिली, इसलिए Vault बंद कर दिया गया।',
    tampered: '⚠️ Vault का data बदला हुआ मिला, इसलिए Vault बंद कर दिया गया।'
  };

  /* ---------- चुटकुलों की फ़ाइलें ---------- */
  V.load = function (entry) {
    return X.loadFile(entry.file).then(function (raw) {
      var r = { status: 'ok', items: [], skipped: [], count: 0, error: '' };
      if (raw && raw.__missing) { r.status = 'missing'; return r; }
      if (raw && raw.__error) { r.status = 'error'; r.error = raw.__error; return r; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.items)) {
        r.status = 'error'; r.error = 'JSON में "items" की list नहीं मिली'; return r;
      }
      var seen = {};
      raw.items.forEach(function (it, i) {
        if (!it || typeof it !== 'object') { r.skipped.push('#' + (i + 1) + ': format गलत'); return; }
        var id = (typeof it.id === 'string' || typeof it.id === 'number') ? String(it.id).trim() : '';
        var text = typeof it.text === 'string' ? it.text.trim() : '';
        if (!id || !text) { r.skipped.push('#' + (i + 1) + ': "id" या "text" खाली'); return; }
        if (seen[id]) { r.skipped.push(id + ': दोहराई हुई id'); return; }
        var type = it.type === 'paheli' ? 'paheli' : 'joke';
        var answer = typeof it.answer === 'string' ? it.answer.trim() : '';
        if (type === 'paheli' && !answer) { r.skipped.push(id + ': पहेली में "answer" नहीं है'); return; }
        seen[id] = true;
        r.items.push({ id: id, type: type, text: text, answer: answer });
      });
      r.count = r.items.length;
      if (!r.count) r.status = 'empty';
      return r;
    });
  };
  function allItems() {
    return X.manifest('vault').then(function (mf) {
      return Promise.all(mf.entries.map(function (e) { return V.load(e); })).then(function (loads) {
        var seen = {}, items = [];
        loads.forEach(function (l) { l.items.forEach(function (it) { if (!seen[it.id]) { seen[it.id] = 1; items.push(it); } }); });
        return { items: items, mf: mf };
      });
    });
  }
  var cur = null;
  function pick(items) {
    var v = vload();
    var fresh = items.filter(function (it) { return v.seen.indexOf(it.id) < 0; });
    if (!fresh.length) { v.seen = []; fresh = items; }
    var it = fresh[Math.floor(Math.random() * fresh.length)];
    v.seen.push(it.id);
    vsave();
    return it;
  }
  function itemHtml(it) {
    return '<p class="vt-text">' + X.rich(it.text) + '</p>' +
      (it.type === 'paheli' ? '<button class="btn small ghost" data-action="vt-ans">💡 उत्तर देखो</button><p class="vt-answer" hidden>' + X.rich(it.answer) + '</p>' : '');
  }

  /* ---------- Challenge पूरा होने पर (extras-quiz.js बुलाता है) ---------- */
  V.onFinish = function (a, entry) {
    var ref = a.vault;
    if (!ref) return null;
    var v = vload();
    var k = ref.subject + '|' + ref.chapter;
    var pass = entry.total >= NEED && entry.correct * 100 / entry.total >= PASS;
    var b = v.best[k] || { best: 0, attempts: 0, passes: 0 };
    b.attempts += 1; b.best = Math.max(b.best || 0, entry.accuracy); if (pass) b.passes += 1;
    v.best[k] = b;
    if (pass) {   // 95% पूरा होते ही Vault का Timer शुरू
      var now = Date.now();
      v.until = now + LIMIT; v.at = now; v.lastSeen = now; v.why = '';
      v.sig = sign(v);
    }
    vsave();
    return { pass: pass, need: PASS, minutes: MINUTES, correct: entry.correct, total: entry.total, needCorrect: Math.ceil(entry.total * PASS / 100) };
  };

  /* ---------- पेज (#/vault) ---------- */
  var tid = null, mono = null, ticks = 0;
  function ticker() {
    var el = document.getElementById('vtLeft');
    if (!el || !mono) { clearInterval(tid); tid = null; return; }
    var st = V.state();
    var monoLeft = mono.left0 - (performance.now() - mono.t0);
    var left = st.open ? Math.min(st.left, monoLeft) : 0;
    if (left <= 0) {
      clearInterval(tid); tid = null;
      if (st.open) lock('expired');
      if (M.Sound) M.Sound.play('lock');
      M.Router.refresh(true);
      return;
    }
    el.textContent = fmt(left / 1000);
    ticks += 1;
    if (ticks % 10 === 0) touch();
  }

  function viewVault() {
    X.boot();
    var st = V.state();
    if (st.open) {
      return allItems().then(function (all) {
        var body;
        if (!all.items.length) body = '<p class="muted">Vault में अभी चुटकुले नहीं जुड़े हैं। जल्द जोड़े जाएँगे।</p>';
        else { cur = pick(all.items); body = itemHtml(cur); }
        var html = '<section class="page xs"><div class="card vt-open-card"><span class="chip x-new">🔓 Vault खुला है</span>' +
          '<div class="vt-clock" id="vtLeft">' + fmt(st.left / 1000) + '</div><p class="muted small">Vault बंद होने में बचा समय (यह पढ़ाई का Timer नहीं है)</p></div>' +
          '<div class="card vt-card" id="vtCard">' + body + '</div>' +
          (all.items.length ? '<button class="btn block" data-action="vt-next">😂 अगला</button>' : '') +
          '<p class="x-note">ℹ️ समय पूरा होते ही Vault अपने-आप बंद हो जाएगा। तब तक मज़े लो, फिर वापस पढ़ाई!</p></section>';
        return X.view({ html: html, title: 'Vault', sub: '🔓 खुला', back: '/extras', ctx: 'vault', after: function () {
          mono = { t0: performance.now(), left0: st.left }; ticks = 0;
          if (!tid) tid = setInterval(ticker, 1000);
        } });
      });
    }
    // ----- बंद: नियम + Chapters की सूची -----
    return X.manifest('notes').then(function (mf) {
      var subs = M.Subjects.list().filter(function (s) { return X.entriesFor(mf, s.id).length; });
      var jobs = [];
      subs.forEach(function (s) {
        X.entriesFor(mf, s.id).sort(function (a, b) { return a.chapter - b.chapter; }).forEach(function (en) {
          jobs.push(NG.build(s.id, en.chapter, { max: NEED, need: NEED }).then(function (b) { return { s: s, en: en, b: b }; }));
        });
      });
      return Promise.all(jobs).then(function (rows) {
        var v = vload();
        var html = '<section class="page xs">';
        if (st.why && WHY[st.why]) html += '<div class="banner warn"><span>' + esc(WHY[st.why]) + '</span></div>';
        html += '<div class="card nt-head"><span class="chip x-new">🔒 Fun Vault</span><h2>अभी बंद है</h2>' +
          '<ol class="small info-list"><li>Chapter के Notes पढ़ो और "✅ पढ़ लिए" दबाओ।</li>' +
          '<li><b>Vault Challenge</b> खेलो: उसी Chapter के <b>' + NEED + ' प्रश्न</b>।</li>' +
          '<li>कम से कम <b>' + PASS + '%</b> सही लाओ (' + NEED + ' में से ' + Math.ceil(NEED * PASS / 100) + ' सही, यानी ज़्यादा से ज़्यादा ' + (NEED - Math.ceil(NEED * PASS / 100)) + ' गलत)।</li>' +
          '<li>' + PASS + '% पूरा होते ही Vault का Timer शुरू होता है और Vault <b>सिर्फ़ ' + MINUTES + ' मिनट</b> खुला रहता है।</li>' +
          '<li>' + NEED + ' से कम प्रश्न (49 या कम) वाले Chapter से Vault नहीं खुलता।</li></ol></div>';
        if (!subs.length) {
          html += X.emptyHtml('🎁', 'Challenge अभी बंद हैं', 'अभी किसी Chapter के Notes नहीं जुड़े हैं। Notes जुड़ते ही यहाँ Challenge खुल जाएँगे।', 'My Notes', '/notes');
        } else {
          subs.forEach(function (s) {
            html += '<h3 class="sec-title">' + esc(s.icon) + ' ' + esc(s.nameHi) + '</h3><div class="x-list">';
            rows.filter(function (r) { return r.s === s; }).forEach(function (r) {
              var ch = M.Subjects.chapter(s.id, r.en.chapter);
              var read = NG.isRead(s.id, r.en.chapter);
              var best = v.best[s.id + '|' + r.en.chapter];
              var state, btn = '';
              if (r.b.status === 'missing' || r.b.status === 'error') state = '<span class="chip tiny soon">Notes फ़ाइल में गड़बड़ी</span>';
              else if (r.b.status !== 'ok') state = '<span class="chip tiny soon">अभी ' + r.b.count + ' प्रश्न बने — ' + NEED + ' चाहिए</span><span class="x-meta">Notes में Definitions / Formulas / One-Liner और जोड़ो।</span>';
              else if (!read) { state = '<span class="chip tiny">🔒 पहले Notes पढ़ो</span>'; btn = '<button class="btn small ghost" data-action="nav" data-to="' + esc('/notes/' + s.id + '/' + r.en.chapter) + '">📓 Notes खोलो</button>'; }
              else { state = '<span class="chip tiny">तैयार · ' + r.b.count + ' प्रश्न उपलब्ध</span>' + (best ? '<span class="x-meta">Best ' + best.best + '%</span>' : ''); btn = '<button class="btn small" data-action="vt-start" data-subject="' + esc(s.id) + '" data-ch="' + r.en.chapter + '">▶ Challenge</button>'; }
              html += '<div class="x-row' + (r.b.status === 'ok' && read ? '' : ' off') + '"><span class="x-row-no">' + r.en.chapter + '</span><span class="x-row-main"><strong>' + esc(ch ? ch.title : 'अध्याय ' + r.en.chapter) + '</strong><span class="cc-chips">' + state + '</span></span>' + btn + '</div>';
            });
            html += '</div>';
          });
        }
        html += '<p class="x-note">ℹ️ Vault का Timer, XP और पढ़ाई के Timer से अलग है।</p></section>';
        return X.view({ html: html, title: 'Vault', sub: '🔒 बंद', back: '/extras', ctx: 'vault' });
      });
    });
  }

  X.onReady(function (A) {
    A['vt-next'] = function () {
      var card = document.getElementById('vtCard');
      if (!card || !V.state().open) return;
      allItems().then(function (all) { if (all.items.length && card) { cur = pick(all.items); card.innerHTML = itemHtml(cur); } });
    };
    A['vt-ans'] = function (el) {
      var ans = el.parentNode.querySelector('.vt-answer');
      if (ans) { ans.hidden = false; el.hidden = true; }
    };
    A['vt-start'] = function (el) {
      var s = el.dataset.subject, n = parseInt(el.dataset.ch, 10);
      if (!NG.isRead(s, n)) { M.App.toast('पहले इस Chapter के Notes पढ़कर "पढ़ लिए" दबाओ।', 'info'); M.Router.go('/notes/' + s + '/' + n); return; }
      NG.build(s, n, { max: NEED, need: NEED }).then(function (b) {
        if (b.status !== 'ok' || b.questions.length < NEED) { M.App.toast('इस Chapter से अभी ' + NEED + ' प्रश्न नहीं बन पाए।', 'info'); return; }
        var name = M.Subjects.subjectName ? M.Subjects.subjectName(s) : s;
        return M.ExtrasQuiz.start({ kind: 'vault', subject: s, title: 'Vault Challenge · ' + name + ' अध्याय ' + n, questions: b.questions, backPath: '/vault', introPath: '/vault', bestKey: '', limitMinutes: 0, vault: { subject: s, chapter: n } });
      });
    };
  });

  if (M.Router && M.Router.add) M.Router.add('/vault', viewVault);

  M.Vault = V;
})(window.M27 = window.M27 || {});
