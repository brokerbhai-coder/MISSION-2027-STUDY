/* ==========================================================
   mistakes.js
   काम: गलत उत्तर याद रखना (Mistake Notebook), गलत प्रश्न दोबारा हल कराना।
   हर गलती में सेव होता है: प्रश्न ID, subject, chapter, तुम्हारा गलत उत्तर,
   सही उत्तर, explanation, कितनी बार गलत हुआ, आख़िरी तारीख।
   ========================================================== */
(function (M) {
  'use strict';

  var Mk = {};
  function esc(s) { return M.App.esc(s); }

  // गलत उत्तर दर्ज करो (Quiz में जवाब देते ही)
  Mk.record = function (q, chosen) {
    var st = M.Storage.state;
    var prev = st.mistakes[q.id];
    st.mistakes[q.id] = {
      id: q.id, subject: q.subject, chapter: q.chapter, question: q.question,
      options: q.options, answer: q.answer, explanation: q.explanation, source: q.source, type: q.type,
      wrong: chosen,
      count: (prev ? prev.count : 0) + 1,
      lastDate: M.Storage.todayStr(),
      resolved: false
    };
  };

  // बाद में वही प्रश्न सही हो गया तो "सुधारी हुई गलती" मानो
  Mk.resolve = function (q) {
    var st = M.Storage.state;
    var m = st.mistakes[q.id];
    if (m && !m.resolved) {
      m.resolved = true;
      m.lastDate = M.Storage.todayStr();
      st.stats.mistakesFixed += 1;
    }
  };

  Mk.list = function (filter) {
    filter = filter || {};
    var st = M.Storage.state;
    var out = Object.keys(st.mistakes).map(function (k) { return st.mistakes[k]; });
    if (filter.subject) out = out.filter(function (m) { return m.subject === filter.subject; });
    if (filter.chapter) out = out.filter(function (m) { return m.chapter === filter.chapter; });
    out.sort(function (a, b) {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return a.lastDate < b.lastDate ? 1 : (a.lastDate > b.lastDate ? -1 : 0);
    });
    return out;
  };

  Mk.unresolvedCount = function (subject, chapter) {
    return Mk.list({ subject: subject, chapter: chapter }).filter(function (m) { return !m.resolved; }).length;
  };

  // बाकी गलतियों से एक retry Quiz शुरू करो
  Mk.startRetry = function (filter) {
    filter = filter || {};
    var open = Mk.list(filter).filter(function (m) { return !m.resolved; });
    if (!open.length) { M.App.toast('अभी कोई बाकी गलती नहीं है 👏', 'info'); return; }
    var qs = open.slice(0, 200).map(function (m) {
      return { id: m.id, subject: m.subject, chapter: m.chapter, question: m.question, options: m.options,
        answer: m.answer, explanation: m.explanation, source: m.source, type: m.type };
    });
    M.Quiz.start({
      mode: 'retry',
      subject: filter.subject || 'mixed',
      chapter: filter.chapter || 0,
      title: 'गलतियाँ दोबारा हल करो',
      questions: qs,
      size: 10,
      backTo: '/mistakes'
    });
  };

  /* ---------- Mistake Notebook पेज ---------- */
  Mk.view = function (params, query) {
    var st = M.Storage.state;
    var f = { subject: query.subject || '', chapter: query.chapter ? parseInt(query.chapter, 10) || 0 : 0 };
    var all = Mk.list({});
    var shown = Mk.list(f);
    var open = shown.filter(function (m) { return !m.resolved; }).length;
    var html = '<section class="page">';

    if (!all.length) {
      html += '<div class="empty big"><div class="empty-ico">📒</div><h3>Mistake Notebook अभी खाली है</h3>' +
        '<p>Quiz में जो प्रश्न गलत होंगे, वो अपने-आप यहाँ जुड़ जाएँगे।</p>' +
        '<button class="btn" data-action="nav" data-to="/subjects">विषय चुनो</button></div></section>';
      return { html: html, title: 'Mistake Notebook', back: null, tab: 'mistakes', ctx: 'mistakes' };
    }

    var subs = {};
    all.forEach(function (m) { subs[m.subject] = true; });
    html += '<div class="chips scroll">' +
      '<button class="chip-btn' + (!f.subject ? ' on' : '') + '" data-action="nav" data-to="/mistakes">सभी (' + all.length + ')</button>';
    Object.keys(subs).forEach(function (sid) {
      var n = all.filter(function (m) { return m.subject === sid; }).length;
      html += '<button class="chip-btn' + (f.subject === sid ? ' on' : '') + '" data-action="nav" data-to="' + esc('/mistakes?subject=' + sid) + '">' + esc(M.Subjects.subjectName(sid)) + ' (' + n + ')</button>';
    });
    html += '</div>';
    if (f.chapter) {
      html += '<div class="banner info"><span>फ़िल्टर: ' + esc(M.Subjects.chapterLabel(f.subject, f.chapter)) + '</span>' +
        '<button class="btn small ghost" data-action="nav" data-to="' + esc('/mistakes' + (f.subject ? '?subject=' + f.subject : '')) + '">फ़िल्टर हटाओ</button></div>';
    }

    html += '<div class="card summary-row"><div><b>' + open + '</b><small>बाकी गलतियाँ</small></div>' +
      '<div><b>' + (shown.length - open) + '</b><small>सुधारी हुई</small></div>' +
      '<div><b>' + st.stats.mistakesFixed + '</b><small>कुल सुधार</small></div></div>';

    html += '<button class="btn block" data-action="retry-mistakes" data-subject="' + esc(f.subject) + '" data-chapter="' + f.chapter + '"' + (open ? '' : ' disabled') + '>' +
      '🔁 गलत प्रश्न दोबारा हल करो' + (open ? ' (' + open + ')' : '') + '</button>';
    if (!open) html += '<p class="muted small center">बाकी कोई गलती नहीं — शाबाश!</p>';

    html += '<h2 class="sec-title">सारी गलतियाँ</h2>';
    if (!shown.length) {
      html += '<div class="empty"><p>इस फ़िल्टर में कोई गलती नहीं है।</p></div>';
    }
    shown.slice(0, 100).forEach(function (m) {
      html += '<article class="card mistake' + (m.resolved ? ' resolved' : '') + '">' +
        '<div class="mk-head"><span class="chip">' + esc(M.Subjects.subjectName(m.subject)) + (m.chapter ? ' · अध्याय ' + m.chapter : '') + '</span>' +
        (m.resolved ? '<span class="chip ok">सुधारी ✓</span>' : '<span class="chip bad">बाकी</span>') + '</div>' +
        '<p class="q-text">' + esc(m.question) + '</p>' +
        '<p class="ans bad">❌ तुम्हारा उत्तर: ' + (m.wrong ? esc(m.wrong + ') ' + (m.options[m.wrong] || '')) : '—') + '</p>' +
        '<p class="ans ok">✅ सही उत्तर: ' + esc(m.answer + ') ' + m.options[m.answer]) + '</p>' +
        '<p class="expl">' + esc(m.explanation || 'व्याख्या उपलब्ध नहीं है।') + '</p>' +
        '<small class="muted">' + m.count + ' बार गलत · आख़िरी: ' + esc(M.App.fmtDate(m.lastDate)) + ' · ID: ' + esc(m.id) + '</small></article>';
    });
    if (shown.length > 100) html += '<p class="muted small center">सिर्फ़ पहली 100 गलतियाँ दिखाई गई हैं।</p>';
    html += '</section>';
    return { html: html, title: 'Mistake Notebook', back: null, tab: 'mistakes', ctx: 'mistakes' };
  };

  M.Mistakes = Mk;
})(window.M27 = window.M27 || {});
