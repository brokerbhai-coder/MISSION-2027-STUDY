/* ==========================================================
   notes-game.js  (नया)
   काम: "Notes Game" — Notes पढ़ो → Game खेलो → Level बढ़ाओ।

   नियम:
   1. किसी Chapter के Notes पढ़ने के बाद Notes पेज पर "✅ मैंने ये Notes पढ़ लिए" दबाओ।
   2. तब उस Chapter का Game (Stage) खुलता है। Game के प्रश्न तुम्हारे ही Notes से
      अपने-आप बनते हैं (Definitions, Formulas, One-Liner Q&A) — कुछ भी बाहर से नहीं जोड़ा जाता।
   3. Stage में कम से कम पास प्रतिशत (subjects.json के passPercent) लाओ → Level +1।
      एक Stage से Level सिर्फ़ पहली बार बढ़ता है (दोबारा खेलकर सिर्फ़ ⭐ और Best बढ़ते हैं)।

   नया Notes जुड़ते ही (manifest में entry डालते ही) नया Stage अपने-आप बन जाता है।
   पुराना games.js / rewards.js / XP इस्तेमाल या बदले नहीं जाते।
   Data: mission2027_extras_v1 (अलग key) — "read" और "ng" भाग।
   Route: #/ngame
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var N = M.Notes;
  var NG = {};
  var ROUND_MAX = 10;   // एक Stage में ज़्यादा से ज़्यादा प्रश्न
  var NEED_MIN = 4;     // Stage बनने के लिए कम से कम प्रश्न
  function esc(s) { return M.App.esc(s); }
  function key(s, n) { return s + '|' + n; }
  function norm(t) { return String(t).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function joinp(a) { return a.join(' '); }

  /* ---------- Level ---------- */
  NG.clearedCount = function () {
    var ng = X.store().ng;
    return Object.keys(ng).filter(function (k) { return ng[k] && ng[k].cleared; }).length;
  };
  NG.level = function () { return 1 + NG.clearedCount(); };
  NG.isRead = function (s, n) { return !!X.store().read[key(s, n)]; };

  /* ---------- Notes से तथ्य (facts) निकालना ---------- */
  NG.facts = function (load) {
    var f = { defs: [], forms: [], ones: [] };
    var c = (load && load.cats) || {};
    (c.definitions || []).forEach(function (it) {
      f.defs.push({ prompt: 'इसकी सही परिभाषा कौन-सी है? — ' + it.term, answer: joinp(it.definition), explain: it.term + ': ' + joinp(it.definition) });
    });
    (c.formulas || []).forEach(function (it) {
      f.forms.push({ prompt: 'इसका सही सूत्र कौन-सा है? — ' + it.name, answer: it.formula, explain: it.name + ': ' + it.formula + (it.meaning.length ? ' — ' + joinp(it.meaning) : '') });
    });
    (c.oneLiners || []).forEach(function (it) {
      f.ones.push({ prompt: it.question, answer: joinp(it.answer), explain: 'उत्तर: ' + joinp(it.answer) });
    });
    return f;
  };

  /* ---------- एक Stage के प्रश्न बनाना ---------- */
  // वापसी: { status: 'ok'|'few'|'none'|'missing'|'error', questions:[...], count }
  NG.build = function (subject, chapterNo, opts) {
    var maxQ = (opts && opts.max) || ROUND_MAX;
    var needQ = (opts && opts.need) || NEED_MIN;
    return X.manifest('notes').then(function (mf) {
      var entries = X.entriesFor(mf, subject);
      var target = entries.filter(function (e) { return e.chapter === chapterNo; })[0];
      if (!target) return { status: 'none', questions: [], count: 0 };
      return Promise.all(entries.map(function (e) { return N.load(e).then(function (r) { return { e: e, r: r }; }); })).then(function (all) {
        var tr = all.filter(function (x) { return x.e === target; })[0].r;
        if (tr.status === 'missing' || tr.status === 'error') return { status: tr.status, error: tr.error, questions: [], count: 0 };
        var mine = NG.facts(tr);
        var pools = { defs: [], forms: [], ones: [] };
        all.forEach(function (x) {
          if (x.r.status !== 'ok') return;
          var f = NG.facts(x.r);
          Object.keys(pools).forEach(function (t) { f[t].forEach(function (fa) { pools[t].push(fa.answer); }); });
        });
        var uniq = {};
        Object.keys(pools).forEach(function (t) {
          var seen = {};
          uniq[t] = pools[t].filter(function (a) { var k = norm(a); if (seen[k]) return false; seen[k] = 1; return true; });
        });
        var qs = [];
        Object.keys(mine).forEach(function (t) {
          mine[t].forEach(function (fa, i) {
            var cn = norm(fa.answer);
            var d = uniq[t].filter(function (a) { return norm(a) !== cn; });
            if (d.length < 3) return; // गलत विकल्प बनाने के लिए इस तरह के और आइटम चाहिए
            d = X.shuffle(d.slice()).slice(0, 3);
            var opts = X.shuffle([fa.answer].concat(d));
            var L = ['A', 'B', 'C', 'D'], o = {}, ans = '';
            opts.forEach(function (v, k) { o[L[k]] = v; if (!ans && v === fa.answer) ans = L[k]; });
            qs.push({ id: 'ng-' + chapterNo + '-' + t + '-' + i, type: 'objective', question: fa.prompt, options: o, answer: ans, explanation: fa.explain, chapter: chapterNo });
          });
        });
        X.shuffle(qs);
        var total = qs.length;
        qs = qs.slice(0, maxQ);
        return { status: total >= needQ ? 'ok' : 'few', questions: qs, count: total };
      });
    });
  };

  /* ---------- Notes पेज का "पढ़ लिए" कार्ड ---------- */
  NG.readCardHtml = function (subject, no) {
    var read = NG.isRead(subject, no);
    var inner = read
      ? '<h3 class="card-title">✅ तुमने ये Notes पढ़ लिए हैं</h3><p class="muted small">अब इस Chapter का Notes Game खुला है। जीतने पर Level बढ़ेगा।</p>' +
        '<div class="btn-stack"><button class="btn" data-action="nav" data-to="/ngame">🎮 Notes Game खेलो</button>' +
        '<button class="link-btn" data-action="ng-read" data-subject="' + esc(subject) + '" data-ch="' + no + '">मार्क हटाओ</button></div>'
      : '<h3 class="card-title">📖 Notes पढ़ लिए?</h3><p class="muted small">पूरे Notes पढ़ने के बाद नीचे का बटन दबाओ। तब इस Chapter का Notes Game खुलेगा और उसे जीतने पर तुम्हारा Level बढ़ेगा।</p>' +
        '<button class="btn success block" data-action="ng-read" data-subject="' + esc(subject) + '" data-ch="' + no + '">✅ मैंने ये Notes पढ़ लिए</button>';
    return '<div class="card" id="ntReadCard">' + inner + '</div>';
  };

  /* ---------- Game पूरा होने पर (extras-quiz.js बुलाता है) ---------- */
  NG.onFinish = function (a, entry) {
    var ng = a.ng;
    if (!ng) return null;
    var st = X.store();
    var k = key(ng.subject, ng.chapter);
    var pass = M.Subjects.passPercent(ng.subject);
    var rec = st.ng[k] || { cleared: false, best: 0, stars: 0, attempts: 0 };
    var cleared = entry.accuracy >= pass;
    var stars = !cleared ? 0 : entry.accuracy >= 90 ? 3 : entry.accuracy >= 75 ? 2 : 1;
    var levelUp = cleared && !rec.cleared;
    rec.attempts = (rec.attempts || 0) + 1;
    rec.best = Math.max(rec.best || 0, entry.accuracy);
    rec.stars = Math.max(rec.stars || 0, stars);
    if (cleared) rec.cleared = true;
    rec.last = new Date().toISOString();
    st.ng[k] = rec;
    return { subject: ng.subject, chapter: ng.chapter, pass: pass, cleared: cleared, stars: stars, levelUp: levelUp, level: NG.level() };
  };

  /* ---------- Game का मुख्य पेज (#/ngame) ---------- */
  function stars(n) { return n ? new Array(n + 1).join('⭐') : ''; }
  function viewHome() {
    X.boot();
    return X.manifest('notes').then(function (mf) {
      var subs = M.Subjects.list().filter(function (s) { return X.entriesFor(mf, s.id).length; });
      var back = '/extras';
      if (!subs.length) {
        return X.view({
          html: '<section class="page xs"><div class="card nt-head"><span class="chip x-new">नया · Notes Game</span><h2>Level ' + NG.level() + '</h2></div>' +
            X.emptyHtml('🎮', 'Game के Levels अभी बंद हैं', 'अभी किसी Chapter के Notes नहीं जुड़े हैं। Notes जुड़ते ही उनके Levels अपने-आप खुल जाएँगे।', 'My Notes', '/notes') + '</section>',
          title: 'Notes Game', sub: 'Level ' + NG.level(), back: back
        });
      }
      var jobs = [];
      subs.forEach(function (s) {
        X.entriesFor(mf, s.id).sort(function (a, b) { return a.chapter - b.chapter; }).forEach(function (en) {
          jobs.push(NG.build(s.id, en.chapter).then(function (b) { return { s: s, en: en, b: b }; }));
        });
      });
      return Promise.all(jobs).then(function (rows) {
        var st = X.store();
        var hint = '';
        var firstPlay = null, firstUnread = null;
        rows.forEach(function (r) {
          var rec = st.ng[key(r.s.id, r.en.chapter)];
          r.cleared = !!(rec && rec.cleared);
          r.rec = rec;
          r.read = NG.isRead(r.s.id, r.en.chapter);
          if (!r.cleared && r.b.status === 'ok') {
            if (r.read && !firstPlay) firstPlay = r;
            if (!r.read && !firstUnread) firstUnread = r;
          }
        });
        if (firstPlay) hint = 'अगला Level: ' + firstPlay.s.nameHi + ' अध्याय ' + firstPlay.en.chapter + ' का Game जीतो (कम से कम ' + M.Subjects.passPercent(firstPlay.s.id) + '%)।';
        else if (firstUnread) hint = 'अगला Level खोलने के लिए ' + firstUnread.s.nameHi + ' अध्याय ' + firstUnread.en.chapter + ' के Notes पढ़ो और "पढ़ लिए" दबाओ।';
        else hint = '🎉 अभी के सारे Stages पूरे हैं। नए Notes जुड़ते ही नए Levels खुलेंगे।';
        var playable = rows.filter(function (r) { return r.b.status === 'ok'; });
        var done = playable.filter(function (r) { return r.cleared; }).length;
        var pct = playable.length ? Math.round(done * 100 / playable.length) : 0;

        var html = '<section class="page xs"><div class="card nt-head"><span class="chip x-new">नया · Notes Game</span><h2>Level ' + NG.level() + '</h2>' +
          '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
          '<p class="muted small">' + done + ' / ' + playable.length + ' Stage पूरे</p><p>' + esc(hint) + '</p></div>';
        html += '<div class="card"><h3 class="card-title">कैसे खेलें</h3><ol class="small info-list"><li>Chapter के Notes पढ़ो और "✅ पढ़ लिए" दबाओ।</li>' +
          '<li>उस Chapter का Game खेलो — प्रश्न तुम्हारे Notes से ही बनते हैं।</li><li>पास प्रतिशत लाओ → Level +1।</li></ol></div>';
        subs.forEach(function (s) {
          html += '<h3 class="sec-title">' + esc(s.icon) + ' ' + esc(s.nameHi) + ' <small class="muted">(पास: ' + M.Subjects.passPercent(s.id) + '%)</small></h3><div class="x-list">';
          rows.filter(function (r) { return r.s === s; }).forEach(function (r) {
            var ch = M.Subjects.chapter(s.id, r.en.chapter);
            var state, btn;
            if (r.b.status === 'missing' || r.b.status === 'error') {
              state = '<span class="chip tiny soon">Notes फ़ाइल में गड़बड़ी</span>'; btn = '';
            } else if (r.b.status === 'few' || r.b.status === 'none') {
              state = '<span class="chip tiny soon">Game के लिए Notes में आइटम कम हैं</span><span class="x-meta">Definitions / Formulas / One-Liner में से हर तरह के कम से कम 4 आइटम (पूरे विषय में) और कुल ' + NEED_MIN + ' प्रश्न चाहिए। अभी ' + r.b.count + ' बन पाए।</span>'; btn = '';
            } else if (!r.read) {
              state = (r.cleared ? '<span class="chip tiny ok">पास ' + stars(r.rec.stars) + '</span>' : '') + '<span class="chip tiny">' + (r.cleared ? 'फिर खेलने के लिए Notes पढ़ो' : '🔒 पहले Notes पढ़ो') + '</span>';
              btn = '<button class="btn small ghost" data-action="nav" data-to="' + esc('/notes/' + s.id + '/' + r.en.chapter) + '">📓 Notes खोलो</button>';
            } else {
              state = r.cleared ? '<span class="chip tiny ok">पास ' + stars(r.rec.stars) + '</span><span class="x-meta">Best ' + r.rec.best + '%</span>' : '<span class="chip tiny">खेलने के लिए तैयार</span>' + (r.rec ? '<span class="x-meta">Best ' + r.rec.best + '%</span>' : '');
              btn = '<button class="btn small" data-action="ng-start" data-subject="' + esc(s.id) + '" data-ch="' + r.en.chapter + '">' + (r.cleared ? '🔁 फिर खेलो' : '▶ खेलो') + '</button>';
            }
            html += '<div class="x-row' + (r.b.status !== 'ok' || !r.read ? ' off' : '') + '"><span class="x-row-no">' + r.en.chapter + '</span><span class="x-row-main"><strong>' + esc(ch ? ch.title : 'अध्याय ' + r.en.chapter) + '</strong><span class="cc-chips">' + state + '</span></span>' + btn + '</div>';
          });
          html += '</div>';
        });
        html += '<p class="x-note">ℹ️ Notes Game का XP, Match Master या Chapter Quiz progress से कोई लेना-देना नहीं है।</p></section>';
        return X.view({ html: html, title: 'Notes Game', sub: 'Level ' + NG.level(), back: back });
      });
    });
  }

  X.onReady(function (A) {
    A['ng-read'] = function (el) {
      var s = el.dataset.subject, n = parseInt(el.dataset.ch, 10);
      var st = X.store();
      var k = key(s, n);
      if (st.read[k]) { delete st.read[k]; }
      else { st.read[k] = { at: new Date().toISOString() }; M.App.toast('✅ मार्क हो गया! अब Notes Game खेल सकते हो।', 'ok'); if (M.Sound) M.Sound.play('done'); }
      X.save();
      var card = document.getElementById('ntReadCard');
      if (card) card.outerHTML = NG.readCardHtml(s, n);
    };
    A['ng-start'] = function (el) {
      var s = el.dataset.subject, n = parseInt(el.dataset.ch, 10);
      if (!NG.isRead(s, n)) { M.App.toast('पहले इस Chapter के Notes पढ़कर "पढ़ लिए" दबाओ।', 'info'); M.Router.go('/notes/' + s + '/' + n); return; }
      NG.build(s, n).then(function (b) {
        if (b.status !== 'ok') { M.App.toast('इस Chapter के Notes से अभी Game नहीं बन सकता।', 'info'); return; }
        var name = M.Subjects.subjectName ? M.Subjects.subjectName(s) : s;
        return M.ExtrasQuiz.start({ kind: 'ngame', subject: s, title: 'Notes Game · ' + name + ' अध्याय ' + n, questions: b.questions, backPath: '/ngame', introPath: '/ngame', bestKey: '', limitMinutes: 0, ng: { subject: s, chapter: n } });
      });
    };
  });

  if (M.Router && M.Router.add) M.Router.add('/ngame', viewHome);

  M.NotesGame = NG;
})(window.M27 = window.M27 || {});
