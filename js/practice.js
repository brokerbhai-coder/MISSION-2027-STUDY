/* ==========================================================
   practice.js  (नया)
   काम: "Mixed Practice" — हर विषय के अलग Practice Sets
   (एक Set में कई Chapters के Objective प्रश्न मिले होते हैं)।
   Data: data/practice/manifest.json  +  हर Set की अपनी JSON फ़ाइल
   Routes: #/practice   #/practice/<subject>   #/practice/<subject>/<set-id>
   Template: data/templates/mixed-practice-template.json
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var P = {};
  var sel = { key: '', shuffle: true, count: 0 };
  function esc(s) { return M.App.esc(s); }

  /* ---------- एक Set की JSON लोड + जाँच ---------- */
  P.load = function (entry) {
    return X.loadFile(entry.file).then(function (raw) {
      var r = { status: 'ok', title: '', description: '', limitMinutes: 0, questions: [], skipped: [], count: 0, error: '' };
      if (raw && raw.__missing) { r.status = 'missing'; return r; }
      if (raw && raw.__error) { r.status = 'error'; r.error = raw.__error; return r; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.questions)) {
        r.status = 'error'; r.error = 'JSON में "questions" की list नहीं मिली'; return r;
      }
      var c = X.cleanQuestions(raw.questions, false);
      r.questions = c.questions; r.skipped = c.skipped; r.count = c.questions.length;
      r.title = typeof raw.title === 'string' ? raw.title.trim() : '';
      r.description = typeof raw.description === 'string' ? raw.description.trim() : '';
      var lim = Number(raw.timeLimitMinutes);
      r.limitMinutes = lim > 0 && lim <= 600 ? lim : 0;
      if (!r.count) r.status = 'empty';
      return r;
    });
  };
  function setTitle(entry, load) { return entry.title || (load && load.title) || entry.id; }
  function activeBanner() {
    var a = M.ExtrasQuiz.activeInfo();
    if (!a) return '';
    return '<div class="banner info"><span>▶ अधूरा अभ्यास: ' + esc(a.title) + ' (' + a.done + '/' + a.total + ')</span>' +
      '<button class="btn small" data-action="nav" data-to="/xquiz">जारी रखो</button></div>';
  }
  function manifestNote(mf) {
    if (mf.status === 'error') return '<div class="banner bad">⚠️ Practice manifest पढ़ने में गड़बड़ी: ' + esc(mf.error) + '</div>';
    return '';
  }

  /* ---------- विषय चुनो ---------- */
  function viewHome() {
    X.boot();
    return X.manifest('practice').then(function (mf) {
      var html = '<section class="page xs"><div class="banner info">🎯 हर विषय के अलग Practice Sets। यह Chapter Quiz से अलग है।</div>' + activeBanner() + manifestNote(mf) + '<div class="grid-cards">';
      M.Subjects.list().forEach(function (s) {
        var n = X.entriesFor(mf, s.id).length;
        html += X.subjectCard(s, n ? n + ' Practice Set' : 'Content जल्द जोड़ा जाएगा', n ? 'उपलब्ध' : 'जल्द आ रहा है', n ? 'ok' : 'soon', '/practice/' + s.id);
      });
      html += '</div></section>';
      return X.view({ html: html, title: 'Mixed Practice', sub: 'विषय चुनो', back: '/extras' });
    });
  }

  /* ---------- किसी विषय के Sets ---------- */
  function viewSubject(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    return X.manifest('practice').then(function (mf) {
      var entries = X.entriesFor(mf, s.id);
      return Promise.all(entries.map(function (en) { return P.load(en); })).then(function (loads) {
        var html = '<section class="page xs">' + activeBanner() + manifestNote(mf);
        if (!entries.length) {
          html += X.emptyHtml('🎯', s.nameHi + ' — Practice Sets', X.MSG_EMPTY_GENERIC, 'सारे विषय', '/practice');
        } else {
          html += '<div class="x-list">';
          entries.forEach(function (en, i) {
            var L = loads[i];
            var best = M.ExtrasQuiz.bestFor(en.file);
            html += '<button class="x-row' + (L.status !== 'ok' ? ' off' : '') + '" data-action="nav" data-to="' + esc('/practice/' + s.id + '/' + en.id) + '">' +
              '<span class="x-row-no">' + (i + 1) + '</span><span class="x-row-main"><strong>' + esc(setTitle(en, L)) + '</strong><span class="cc-chips">' +
              (L.status === 'ok' ? '<span class="chip tiny">' + L.count + ' प्रश्न</span>' + (L.limitMinutes ? '<span class="chip tiny">⏳ ' + L.limitMinutes + ' मिनट</span>' : '') :
                '<span class="chip tiny soon">' + (L.status === 'empty' ? 'अभी प्रश्न नहीं' : L.status === 'missing' ? 'फ़ाइल नहीं मिली' : 'गड़बड़ी') + '</span>') +
              (best ? '<span class="chip tiny ok">सबसे अच्छा: ' + best.best + '%</span>' : '') + '</span></span><span class="x-row-end">›</span></button>';
          });
          html += '</div>';
        }
        html += '</section>';
        return X.view({ html: html, title: 'Mixed Practice', sub: s.nameHi, back: '/practice' });
      });
    });
  }

  /* ---------- Set की जानकारी + शुरू ---------- */
  function viewSet(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    return X.manifest('practice').then(function (mf) {
      var en = X.entriesFor(mf, s.id).filter(function (e) { return e.id === p.setid; })[0];
      var back = '/practice/' + s.id;
      if (!en) return X.view({ html: '<section class="page xs">' + X.emptyHtml('🎯', 'यह Practice Set नहीं मिला', 'manifest में इसकी entry नहीं है।', 'वापस जाओ', back) + '</section>', title: 'Mixed Practice', sub: s.nameHi, back: back });
      return P.load(en).then(function (L) {
        var key = s.id + '|' + en.id;
        if (sel.key !== key) { sel.key = key; sel.shuffle = true; sel.count = 0; }
        var title = setTitle(en, L);
        var html = '<section class="page xs">';
        if (L.status === 'missing') html += X.errorHtml('इस Set की JSON फ़ाइल नहीं मिली', 'manifest में नाम लिखा है, पर GitHub में फ़ाइल upload नहीं हुई या path गलत है।', en.file);
        else if (L.status === 'error') html += X.errorHtml('इस Set की फ़ाइल पढ़ी नहीं जा सकी', L.error, en.file);
        else if (L.status === 'empty') html += X.emptyHtml('🎯', title, 'इस Set में अभी प्रश्न नहीं हैं। जल्द जोड़े जाएँगे।', 'वापस जाओ', back);
        else {
          var chs = [];
          L.questions.forEach(function (q) { if (q.chapter && chs.indexOf(q.chapter) < 0) chs.push(q.chapter); });
          chs.sort(function (a, b) { return a - b; });
          var best = M.ExtrasQuiz.bestFor(en.file);
          html += '<div class="card"><span class="chip x-new">नया · Mixed Practice</span><h2 style="margin:8px 0 4px">' + esc(title) + '</h2>' +
            '<p class="muted small">' + esc(s.nameHi) + (L.description ? ' — ' + esc(L.description) : '') + '</p>' +
            '<div class="cc-chips"><span class="chip">' + L.count + ' प्रश्न</span>' + (L.limitMinutes ? '<span class="chip">⏳ ' + L.limitMinutes + ' मिनट</span>' : '') + '</div>' +
            (best ? '<p class="px-best" style="margin-top:8px">सबसे अच्छा score: ' + best.best + '% (' + best.attempts + ' बार किया)</p>' : '') + '</div>';
          if (chs.length) {
            html += '<div class="card"><h3 class="card-title">इस Set में ये Chapters मिले हैं</h3><div class="cc-chips">' +
              chs.map(function (c) { return '<span class="chip tiny">' + esc(X.chapterName(s.id, c)) + '</span>'; }).join('') + '</div></div>';
          }
          html += '<div class="card"><h3 class="card-title">सेटिंग</h3><p class="muted small">प्रश्नों का क्रम</p><div class="chips">' +
            '<button class="chip-btn' + (sel.shuffle ? ' on' : '') + '" data-action="xp-opt" data-k="shuffle" data-v="1">🔀 मिलाकर</button>' +
            '<button class="chip-btn' + (!sel.shuffle ? ' on' : '') + '" data-action="xp-opt" data-k="shuffle" data-v="0">📋 जैसा लिखा है</button></div>';
          if (L.count > 10) {
            var pStep = 10;
            while (Math.ceil(L.count / pStep) > 9) pStep += 10; // ज़्यादा से ज़्यादा ~9 Option, चाहे Set कितना भी बड़ा हो
            var pOpts = [];
            for (var pn = pStep; pn < L.count; pn += pStep) pOpts.push(pn);
            pOpts.push(L.count); // आख़िर में हमेशा पूरा Set
            html += '<p class="muted small" style="margin-top:10px">कितने प्रश्न</p><div class="chips">' +
              pOpts.map(function (n) {
                var on = sel.count === n || (sel.count === 0 && n === L.count);
                return '<button class="chip-btn' + (on ? ' on' : '') + '" data-action="xp-opt" data-k="count" data-v="' + n + '">' + (n === L.count ? 'सारे (' + L.count + ')' : n + ' प्रश्न') + '</button>';
              }).join('') + '</div>';
          }
          html += '</div>';
          html += '<button class="btn block" data-action="xp-start" data-subject="' + esc(s.id) + '" data-set="' + esc(en.id) + '">▶ अभ्यास शुरू करो</button>';
          html += '<p class="x-note">ℹ️ इसका XP, Chapter progress या Mistake Notebook पर असर नहीं पड़ता।</p>';
          html += X.warnHtml(L.skipped, 'कुछ प्रश्न गलत format की वजह से छोड़े गए');
        }
        html += '</section>';
        return X.view({ html: html, title: 'Mixed Practice', sub: s.nameHi + ' · ' + title, back: back });
      });
    });
  }

  X.onReady(function (A) {
    A['xp-opt'] = function (el) {
      if (el.dataset.k === 'shuffle') sel.shuffle = el.dataset.v === '1';
      else if (el.dataset.k === 'count') sel.count = parseInt(el.dataset.v, 10) || 0;
      M.Router.refresh(true);
    };
    A['xp-start'] = function (el) {
      var sid = el.dataset.subject, setId = el.dataset.set;
      X.manifest('practice').then(function (mf) {
        var en = X.entriesFor(mf, sid).filter(function (e) { return e.id === setId; })[0];
        if (!en) { M.App.toast('यह Set नहीं मिला।', 'warn'); return; }
        return P.load(en).then(function (L) {
          if (L.status !== 'ok') { M.App.toast('इस Set में अभी प्रश्न उपलब्ध नहीं हैं।', 'info'); return; }
          var qs = L.questions.slice();
          if (sel.shuffle) X.shuffle(qs);
          if (sel.count > 0 && sel.count < qs.length) qs = qs.slice(0, sel.count);
          return M.ExtrasQuiz.start({
            kind: 'practice', subject: sid, title: (M.Subjects.subjectName ? M.Subjects.subjectName(sid) : sid) + ' · ' + setTitle(en, L),
            questions: qs, backPath: '/practice/' + sid, introPath: '/practice/' + sid + '/' + en.id,
            bestKey: en.file, limitMinutes: L.limitMinutes ? (L.limitMinutes * qs.length / L.count) : 0
          });
        });
      });
    };
  });

  if (M.Router && M.Router.add) {
    M.Router.add('/practice', viewHome);
    M.Router.add('/practice/:subject', viewSubject);
    M.Router.add('/practice/:subject/:setid', viewSet);
  }

  M.Practice = P;
})(window.M27 = window.M27 || {});
