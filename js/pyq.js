/* ==========================================================
   pyq.js  (नया)
   काम: "PYQ" — पिछले साल के प्रश्न: विषय → साल → प्रश्न-पत्र / Set।
   Data: data/pyq/manifest.json  +  हर विषय-साल की अपनी JSON फ़ाइल
   Objective के साथ Short / Long प्रश्न भी रखे जा सकते हैं।
   Routes: #/pyq   #/pyq/<subject>   #/pyq/<subject>/<year>[?e=<entry>]
   Template: data/templates/pyq-template.json
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var Pq = {};
  var flt = { type: 'all', text: '' };
  function esc(s) { return M.App.esc(s); }

  var TYPE_LABEL = { objective: 'Objective', short: 'Short', long: 'Long', other: 'अन्य' };

  /* ---------- एक प्रश्न-पत्र की JSON लोड + जाँच ---------- */
  Pq.load = function (entry) {
    return X.loadFile(entry.file).then(function (raw) {
      var r = { status: 'ok', title: '', exam: '', questions: [], skipped: [], count: 0, objective: 0, error: '' };
      if (raw && raw.__missing) { r.status = 'missing'; return r; }
      if (raw && raw.__error) { r.status = 'error'; r.error = raw.__error; return r; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.questions)) {
        r.status = 'error'; r.error = 'JSON में "questions" की list नहीं मिली'; return r;
      }
      var c = X.cleanQuestions(raw.questions, true);
      r.questions = c.questions; r.skipped = c.skipped; r.count = c.questions.length;
      r.objective = c.questions.filter(function (q) { return q.type === 'objective'; }).length;
      r.title = typeof raw.title === 'string' ? raw.title.trim() : '';
      r.exam = typeof raw.examName === 'string' ? raw.examName.trim() : '';
      if (!r.count) r.status = 'empty';
      return r;
    });
  };
  function paperPath(en) { return '/pyq/' + en.subject + '/' + encodeURIComponent(en.year) + '?e=' + en.idx; }
  function yearCmp(a, b) {
    var na = parseInt(a, 10), nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return nb - na;
    return a < b ? 1 : a > b ? -1 : 0;
  }
  function manifestNote(mf) {
    return mf.status === 'error' ? '<div class="banner bad">⚠️ PYQ manifest पढ़ने में गड़बड़ी: ' + esc(mf.error) + '</div>' : '';
  }
  function activeBanner() {
    var a = M.ExtrasQuiz.activeInfo();
    if (!a) return '';
    return '<div class="banner info"><span>▶ अधूरा अभ्यास: ' + esc(a.title) + ' (' + a.done + '/' + a.total + ')</span>' +
      '<button class="btn small" data-action="nav" data-to="/xquiz">जारी रखो</button></div>';
  }

  /* ---------- विषय चुनो ---------- */
  function viewHome() {
    X.boot();
    return X.manifest('pyq').then(function (mf) {
      var html = '<section class="page xs"><div class="banner info">🗂️ पिछले साल के प्रश्न — विषय चुनो, फिर साल। यह Chapter Quiz से अलग है।</div>' + activeBanner() + manifestNote(mf) + '<div class="grid-cards">';
      M.Subjects.list().forEach(function (s) {
        var es = X.entriesFor(mf, s.id);
        var years = {};
        es.forEach(function (e) { years[e.year] = 1; });
        var ny = Object.keys(years).length;
        html += X.subjectCard(s, ny ? ny + ' साल के प्रश्न-पत्र' : 'Content जल्द जोड़ा जाएगा', ny ? 'उपलब्ध' : 'जल्द आ रहा है', ny ? 'ok' : 'soon', '/pyq/' + s.id);
      });
      html += '</div></section>';
      return X.view({ html: html, title: 'PYQ', sub: 'विषय चुनो', back: '/extras' });
    });
  }

  /* ---------- साल चुनो ---------- */
  function viewYears(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    return X.manifest('pyq').then(function (mf) {
      var es = X.entriesFor(mf, s.id);
      var byYear = {};
      es.forEach(function (e) { (byYear[e.year] = byYear[e.year] || []).push(e); });
      var years = Object.keys(byYear).sort(yearCmp);
      var html = '<section class="page xs">' + manifestNote(mf);
      if (!years.length) html += X.emptyHtml('🗂️', s.nameHi + ' — PYQ', X.MSG_EMPTY_GENERIC, 'सारे विषय', '/pyq');
      else {
        html += '<div class="x-list">';
        years.forEach(function (y) {
          html += '<button class="x-row" data-action="nav" data-to="' + esc('/pyq/' + s.id + '/' + encodeURIComponent(y)) + '"><span class="x-row-no" style="width:auto;padding:0 10px">' + esc(y) + '</span>' +
            '<span class="x-row-main"><strong>' + esc(s.nameHi) + ' — ' + esc(y) + '</strong><span class="x-meta">' + byYear[y].length + ' प्रश्न-पत्र / Set</span></span><span class="x-row-end">›</span></button>';
        });
        html += '</div>';
      }
      html += '</section>';
      return X.view({ html: html, title: 'PYQ', sub: s.nameHi + ' · साल चुनो', back: '/pyq' });
    });
  }

  /* ---------- साल का पेज: Set की list या सीधे प्रश्न-पत्र ---------- */
  function viewYear(p, query) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    return X.manifest('pyq').then(function (mf) {
      var es = X.entriesFor(mf, s.id).filter(function (e) { return e.year === p.year; });
      if (!es.length) {
        return X.view({ html: '<section class="page xs">' + X.emptyHtml('🗂️', s.nameHi + ' ' + p.year, 'इस साल का Content अभी उपलब्ध नहीं है। जल्द जोड़ा जाएगा।', 'साल की list', '/pyq/' + s.id) + '</section>', title: 'PYQ', sub: s.nameHi + ' · ' + p.year, back: '/pyq/' + s.id });
      }
      var pick = null;
      if (query && query.e !== undefined) pick = es.filter(function (e) { return e.idx === parseInt(query.e, 10); })[0] || null;
      if (!pick && es.length === 1) pick = es[0];
      if (pick) return paperView(s, pick, es.length > 1 ? '/pyq/' + s.id + '/' + encodeURIComponent(p.year) : '/pyq/' + s.id);
      return Promise.all(es.map(function (e) { return Pq.load(e); })).then(function (loads) {
        var html = '<section class="page xs"><div class="x-list">';
        es.forEach(function (e, i) {
          var L = loads[i];
          html += '<button class="x-row' + (L.status !== 'ok' ? ' off' : '') + '" data-action="nav" data-to="' + esc(paperPath(e)) + '"><span class="x-row-no">' + (i + 1) + '</span>' +
            '<span class="x-row-main"><strong>' + esc(e.label || L.title || 'Set ' + (i + 1)) + '</strong><span class="cc-chips">' +
            (L.status === 'ok' ? '<span class="chip tiny">' + L.count + ' प्रश्न</span>' : '<span class="chip tiny soon">' + (L.status === 'empty' ? 'अभी प्रश्न नहीं' : L.status === 'missing' ? 'फ़ाइल नहीं मिली' : 'गड़बड़ी') + '</span>') +
            '</span></span><span class="x-row-end">›</span></button>';
        });
        html += '</div></section>';
        return X.view({ html: html, title: 'PYQ', sub: s.nameHi + ' · ' + p.year, back: '/pyq/' + s.id });
      });
    });
  }

  function questionHtml(q, n, year, subject) {
    var h = '<article class="card pq-card" data-type="' + esc(q.type) + '"><div class="mk-head"><span class="chip">प्रश्न ' + n + '</span>' +
      '<span class="chip tiny">' + esc(year) + '</span>' +
      (q.chapter ? '<span class="chip tiny">' + esc(X.chapterName(subject, q.chapter)) + '</span>' : '') +
      (q.topic ? '<span class="chip tiny">' + esc(q.topic) + '</span>' : '') +
      (q.marks ? '<span class="chip tiny">' + q.marks + ' अंक</span>' : '') +
      '<span class="chip tiny">' + esc(TYPE_LABEL[q.type] || q.type) + '</span></div>' +
      '<p class="q-text">' + esc(q.question) + '</p>';
    if (q.type === 'objective') {
      h += '<div class="pq-opts">' + ['A', 'B', 'C', 'D'].map(function (L) {
        return '<div class="pq-opt" data-correct="' + (L === q.answer ? '1' : '0') + '"><b>' + L + '</b><span>' + esc(q.options[L]) + '</span></div>';
      }).join('') + '</div>';
    }
    h += '<button class="btn small ghost" data-action="pq-reveal">उत्तर देखो</button><div class="pq-ans" hidden>';
    if (q.type === 'objective') h += '<p><b>सही उत्तर: ' + q.answer + ') ' + esc(q.options[q.answer]) + '</b></p>';
    else h += '<p>' + (q.answer ? esc(q.answer) : 'इस प्रश्न का उत्तर अभी उपलब्ध नहीं है।') + '</p>';
    if (q.explanation) h += '<p class="expl">' + esc(q.explanation) + '</p>';
    return h + '</div></article>';
  }

  function paperView(s, en, back) {
    return Pq.load(en).then(function (L) {
      var title = en.label || L.title || (s.nameHi + ' ' + en.year);
      var html = '<section class="page xs">';
      if (L.status === 'missing') html += X.errorHtml('इस प्रश्न-पत्र की JSON फ़ाइल नहीं मिली', 'manifest में नाम लिखा है, पर GitHub में फ़ाइल upload नहीं हुई या path गलत है।', en.file);
      else if (L.status === 'error') html += X.errorHtml('इस प्रश्न-पत्र की फ़ाइल पढ़ी नहीं जा सकी', L.error, en.file);
      else if (L.status === 'empty') html += X.emptyHtml('🗂️', title, 'इस प्रश्न-पत्र में अभी प्रश्न नहीं हैं। जल्द जोड़े जाएँगे।', 'वापस जाओ', back);
      else {
        flt = { type: 'all', text: '' };
        var types = [];
        L.questions.forEach(function (q) { if (types.indexOf(q.type) < 0) types.push(q.type); });
        html += '<div class="card"><span class="chip x-new">नया · PYQ</span><h2 style="margin:8px 0 4px">' + esc(title) + '</h2>' +
          '<p class="muted small">' + esc(s.nameHi) + ' · ' + esc(en.year) + (L.exam ? ' · ' + esc(L.exam) : '') + '</p>' +
          '<div class="cc-chips"><span class="chip">' + L.count + ' प्रश्न</span>' + (L.objective ? '<span class="chip">' + L.objective + ' Objective</span>' : '') + '</div>' +
          (L.objective ? '<button class="btn block" data-action="pq-quiz" data-subject="' + esc(en.subject) + '" data-e="' + en.idx + '" data-year="' + esc(en.year) + '">▶ Objective प्रश्न Quiz Mode में हल करो (' + L.objective + ')</button>' : '') + '</div>';
        if (types.length > 1) {
          html += '<div class="chips scroll"><button class="chip-btn on" data-action="pq-type" data-t="all">सभी</button>' +
            types.map(function (t) { return '<button class="chip-btn" data-action="pq-type" data-t="' + esc(t) + '">' + esc(TYPE_LABEL[t] || t) + '</button>'; }).join('') + '</div>';
        }
        html += '<input id="pqSearch" class="x-search" type="search" placeholder="इस प्रश्न-पत्र में खोजो…" autocomplete="off">';
        html += '<div class="btn-row"><button class="btn small ghost" data-action="pq-all" data-show="1">👁 सारे उत्तर दिखाओ</button><button class="btn small ghost" data-action="pq-all" data-show="0">🙈 सारे उत्तर छिपाओ</button></div>';
        html += '<div id="pqList" class="x-list">' + L.questions.map(function (q, i) { return questionHtml(q, i + 1, en.year, en.subject); }).join('') + '</div>';
        html += '<p id="pqNone" class="empty" hidden>कोई प्रश्न नहीं मिला।</p>';
        html += X.warnHtml(L.skipped, 'कुछ प्रश्न गलत format की वजह से छोड़े गए');
      }
      html += '</section>';
      return X.view({ html: html, title: 'PYQ', sub: s.nameHi + ' · ' + en.year, back: back });
    });
  }

  function applyFilter() {
    var cards = document.querySelectorAll('#pqList .pq-card');
    var shown = 0;
    var t = flt.text.trim().toLowerCase();
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var ok = (flt.type === 'all' || c.getAttribute('data-type') === flt.type) && (!t || c.textContent.toLowerCase().indexOf(t) >= 0);
      c.hidden = !ok;
      if (ok) shown += 1;
    }
    var none = document.getElementById('pqNone');
    if (none) none.hidden = shown > 0;
  }
  function setReveal(card, show) {
    var ans = card.querySelector('.pq-ans');
    var btn = card.querySelector('[data-action="pq-reveal"]');
    if (!ans) return;
    ans.hidden = !show;
    var opts = card.querySelectorAll('.pq-opt');
    for (var i = 0; i < opts.length; i++) opts[i].classList.toggle('right', show && opts[i].getAttribute('data-correct') === '1');
    if (btn) btn.textContent = show ? 'उत्तर छिपाओ' : 'उत्तर देखो';
  }

  X.bindSearch('pqSearch', function (v) { flt.text = v; applyFilter(); });

  X.onReady(function (A) {
    A['pq-reveal'] = function (el) {
      var card = el.closest('.pq-card');
      if (!card) return;
      var ans = card.querySelector('.pq-ans');
      setReveal(card, ans ? ans.hidden : false);
    };
    A['pq-all'] = function (el) {
      var show = el.dataset.show === '1';
      var cards = document.querySelectorAll('#pqList .pq-card');
      for (var i = 0; i < cards.length; i++) setReveal(cards[i], show);
    };
    A['pq-type'] = function (el) {
      flt.type = el.dataset.t || 'all';
      var chips = document.querySelectorAll('[data-action="pq-type"]');
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i] === el);
      applyFilter();
    };
    A['pq-quiz'] = function (el) {
      var sid = el.dataset.subject, idx = parseInt(el.dataset.e, 10);
      X.manifest('pyq').then(function (mf) {
        var en = X.entriesFor(mf, sid).filter(function (e) { return e.idx === idx; })[0];
        if (!en) { M.App.toast('यह प्रश्न-पत्र नहीं मिला।', 'warn'); return; }
        return Pq.load(en).then(function (L) {
          var qs = L.questions.filter(function (q) { return q.type === 'objective'; });
          if (!qs.length) { M.App.toast('इसमें Objective प्रश्न नहीं हैं।', 'info'); return; }
          var name = M.Subjects.subjectName ? M.Subjects.subjectName(sid) : sid;
          var path = paperPath(en);
          return M.ExtrasQuiz.start({ kind: 'pyq', subject: sid, title: 'PYQ ' + en.year + ' · ' + name + (en.label ? ' · ' + en.label : ''), questions: qs, backPath: path, introPath: path, bestKey: en.file, limitMinutes: 0 });
        });
      });
    };
  });

  if (M.Router && M.Router.add) {
    M.Router.add('/pyq', viewHome);
    M.Router.add('/pyq/:subject', viewYears);
    M.Router.add('/pyq/:subject/:year', viewYear);
  }

  M.Pyq = Pq;
})(window.M27 = window.M27 || {});
