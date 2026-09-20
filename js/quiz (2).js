/* ==========================================================
   quiz.js
   काम: Quiz चलाना (एक-एक प्रश्न), जवाब की जाँच, Result और Review पेज।
   ज़रूरी नियम:
   - Quiz तभी "पूरा" गिना जाता है जब सारे प्रश्नों के जवाब दिए और Result देखा
   - अधूरा Quiz हर जवाब के बाद सेव होता है — refresh/बंद करने पर भी वापस मिलता है
   - XP सिर्फ़ Quiz पूरा होने पर मिलता है (rewards.js के नियमों से)
   ========================================================== */
(function (M) {
  'use strict';

  var Q = { active: null };
  var finishing = false;
  function esc(s) { return M.App.esc(s); }

  Q.restore = function () { Q.active = M.Storage.state.activeQuiz || null; };

  function persist() {
    M.Storage.state.activeQuiz = Q.active;
    M.Storage.save();
  }
  function allAnswered(a) { return a.answers.every(function (x) { return !!x; }); }
  function answeredCount(a) { return a.answers.filter(function (x) { return !!x; }).length; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  Q.backPath = function (a) {
    if (a.mode === 'chapter') return '/chapter/' + a.subject + '/' + a.chapter;
    if (a.mode === 'retry') return '/mistakes';
    return '/home';
  };

  // Timer.js हर सेकंड बुलाता है (सिर्फ़ जब Quiz पेज पर active हो)
  Q.addElapsed = function (n) {
    var a = Q.active;
    if (!a || allAnswered(a)) return;
    a.elapsed += n;
  };

  /* ---------- Quiz शुरू ---------- */
  Q.start = function (o) {
    if (!o.questions || !o.questions.length) { M.App.toast('इस Quiz के लिए प्रश्न नहीं हैं।', 'info'); return Promise.resolve(); }
    var begin = function () {
      var qs = shuffle(o.questions.slice());
      var size = o.size > 0 ? Math.min(o.size, qs.length) : qs.length;
      qs = qs.slice(0, size).map(function (q) { return JSON.parse(JSON.stringify(q)); });
      Q.active = {
        id: 'q' + Date.now(), mode: o.mode, subject: o.subject, chapter: o.chapter, title: o.title,
        questions: qs, answers: qs.map(function () { return null; }), index: 0, elapsed: 0,
        startedAt: new Date().toISOString()
      };
      persist();
      M.Router.go('/quiz');
    };
    if (Q.active) {
      return M.App.dialog({
        title: 'एक Quiz अधूरा है',
        message: '"' + Q.active.title + '" अभी पूरा नहीं हुआ (' + answeredCount(Q.active) + '/' + Q.active.questions.length + ' जवाब दिए)। क्या करना है?',
        buttons: [
          { label: 'उसे जारी रखो', value: 'resume', cls: 'primary' },
          { label: 'नया शुरू करो (पुराना हटेगा)', value: 'new', cls: 'danger' },
          { label: 'रद्द', value: null, cls: 'ghost' }
        ]
      }).then(function (v) {
        if (v === 'resume') M.Router.go('/quiz');
        else if (v === 'new') begin();
      });
    }
    begin();
    return Promise.resolve();
  };

  /* ---------- Quiz पेज ---------- */
  function bodyHtml() {
    var a = Q.active;
    var i = a.index;
    var q = a.questions[i];
    var ans = a.answers[i];
    var total = a.questions.length;
    var done = answeredCount(a);
    var html = '<div class="quiz-top"><span class="chip">प्रश्न ' + (i + 1) + ' / ' + total + '</span>' +
      '<span class="chip src src-' + esc(q.source.toLowerCase()) + '">' + esc(q.source) + '</span>' +
      '<span class="quiz-timer" id="quizTimer">⏱ ' + M.App.fmtTime(a.elapsed) + '</span></div>' +
      '<div class="progress"><span style="width:' + Math.round(done * 100 / total) + '%"></span></div>' +
      '<div class="card q-card"><p class="q-text">' + esc(q.question) + '</p></div><div class="options">';
    ['A', 'B', 'C', 'D'].forEach(function (L) {
      var cls = 'opt';
      if (ans) {
        if (L === q.answer) cls += ' right';
        else if (L === ans.chosen) cls += ' wrong';
        else cls += ' dim';
      }
      html += '<button class="' + cls + '" data-action="answer" data-opt="' + L + '"' + (ans ? ' disabled' : '') + '>' +
        '<span class="opt-key">' + L + '</span><span class="opt-text">' + esc(q.options[L]) + '</span></button>';
    });
    html += '</div>';
    if (ans) {
      html += '<div class="feedback ' + (ans.correct ? 'ok' : 'bad') + '" role="status">' +
        '<strong>' + (ans.correct ? '✅ सही जवाब!' : '❌ गलत जवाब') + '</strong>' +
        (ans.correct ? '' : '<p>सही उत्तर: <b>' + q.answer + ') ' + esc(q.options[q.answer]) + '</b></p>') +
        '<p class="expl">' + esc(q.explanation || 'व्याख्या उपलब्ध नहीं है।') + '</p></div>';
    } else {
      html += '<p class="muted small center">एक विकल्प चुनो, फिर सही जवाब और explanation दिखेगा।</p>';
    }
    html += '<div class="quiz-nav">' +
      '<button class="btn ghost" data-action="quiz-prev"' + (i === 0 ? ' disabled' : '') + '>‹ पिछला</button>';
    if (i < total - 1) {
      html += '<button class="btn" data-action="quiz-next"' + (ans ? '' : ' disabled') + '>अगला ›</button>';
    } else {
      html += '<button class="btn success" data-action="quiz-finish"' + (allAnswered(a) ? '' : ' disabled') + '>Result देखो ✅</button>';
    }
    html += '</div><button class="link-btn" data-action="quiz-discard">इस Quiz को रद्द करो</button>';
    return html;
  }

  function rerender() {
    var b = document.getElementById('quizBody');
    if (!b || !Q.active) return;
    b.innerHTML = bodyHtml();
    var fb = b.querySelector('.feedback');
    if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest' });
  }

  Q.view = function () {
    var a = Q.active;
    if (!a) {
      return {
        html: '<section class="page"><div class="empty big"><div class="empty-ico">📝</div><h3>अभी कोई Quiz चालू नहीं है</h3>' +
          '<p>किसी Chapter में जाकर Quiz शुरू करो।</p><button class="btn" data-action="nav" data-to="/subjects">विषय चुनो</button></div></section>',
        title: 'Quiz', back: '/home', tab: 'subjects', ctx: 'quiz'
      };
    }
    return {
      html: '<section class="page"><div id="quizBody">' + bodyHtml() + '</div></section>',
      title: 'Quiz', sub: a.title, backAction: 'quiz-leave', tab: 'subjects', ctx: 'quiz'
    };
  };

  /* ---------- Quiz की actions ---------- */
  Q.answer = function (opt) {
    var a = Q.active;
    if (!a) return;
    var i = a.index;
    if (a.answers[i]) return;
    var q = a.questions[i];
    var correct = opt === q.answer;
    a.answers[i] = { chosen: opt, correct: correct };
    if (correct) M.Mistakes.resolve(q); else M.Mistakes.record(q, opt);
    persist();
    rerender();
  };

  Q.go = function (delta) {
    var a = Q.active;
    if (!a) return;
    var n = a.index + delta;
    if (n < 0 || n >= a.questions.length) return;
    if (delta > 0 && !a.answers[a.index]) return;
    a.index = n;
    persist();
    rerender();
    window.scrollTo(0, 0);
  };

  Q.finish = function () {
    var a = Q.active;
    if (!a || finishing) return;
    if (!allAnswered(a)) { M.App.toast('पहले सभी प्रश्नों के जवाब दो।', 'warn'); return; }
    finishing = true;
    // Quiz को पहले active से हटाओ, ताकि दोबारा गिना न जा सके
    Q.active = null;
    M.Storage.state.activeQuiz = null;
    var entry;
    try {
      entry = M.Progress.completeQuiz(a);
    } finally {
      finishing = false;
    }
    M.App.refreshHeader();
    M.Router.go('/result/' + entry.id);
  };

  Q.leave = function () {
    var a = Q.active;
    if (!a) { M.Router.go('/home'); return; }
    M.App.dialog({
      title: 'Quiz बीच में छोड़ें?',
      message: 'तुम्हारे जवाब सेव हैं। बाद में Home से Quiz जारी रख सकते हो। अभी यह Quiz "पूरा" नहीं गिना जाएगा।',
      buttons: [
        { label: 'Quiz जारी रखो', value: false, cls: 'primary' },
        { label: 'बाद में करूँगा', value: true, cls: 'ghost' }
      ]
    }).then(function (leave) { if (leave) M.Router.go(Q.backPath(a)); });
  };

  Q.discard = function () {
    var a = Q.active;
    if (!a) return;
    M.App.dialog({
      title: 'Quiz रद्द करें?',
      message: 'यह Quiz हट जाएगा और इसका कोई XP/score नहीं मिलेगा। (गलत जवाब Mistake Notebook में सेव रहेंगे।)',
      buttons: [
        { label: 'नहीं, जारी रखो', value: false, cls: 'primary' },
        { label: 'हाँ, रद्द करो', value: true, cls: 'danger' }
      ]
    }).then(function (yes) {
      if (!yes) return;
      var back = Q.backPath(a);
      Q.active = null;
      M.Storage.state.activeQuiz = null;
      M.Storage.save();
      M.Router.go(back);
    });
  };

  Q.hasUnfinished = function () { return !!(Q.active && answeredCount(Q.active) > 0); };

  /* ---------- Result पेज ---------- */
  function findEntry(id) {
    var h = M.Storage.state.quizHistory;
    for (var i = 0; i < h.length; i++) if (h[i].id === id) return h[i];
    return null;
  }

  Q.viewResult = function (p) {
    var h = findEntry(p.id);
    if (!h) return M.App.notFound('यह Result नहीं मिला।');
    var rec = M.Progress.chapterRecord(h.subject, h.chapter);
    var title = M.Progress.entryTitle(h);
    var msg, cls;
    if (h.mode === 'demo') { msg = 'Demo Quiz पूरा! सिस्टम सही चल रहा है ✅ (यह असली Chapter का हिस्सा नहीं है)'; cls = 'info'; }
    else if (h.mode === 'retry') { msg = h.accuracy >= 60 ? '👏 गलतियाँ दोबारा हल करना बढ़िया रहा!' : 'कोई बात नहीं, इन प्रश्नों को फिर से देखो और दोबारा try करो।'; cls = h.accuracy >= 60 ? 'ok' : 'info'; }
    else if (h.passed) { msg = '🎉 शानदार! तुम Chapter में पास हुए।'; cls = 'ok'; }
    else { msg = 'इस बार ' + h.passPercent + '% नहीं आ पाया। Review करो और दोबारा try करो — तुम कर सकते हो!'; cls = 'bad'; }

    var html = '<section class="page">';
    html += '<div class="card result-hero ' + cls + '"><div class="ring" style="--p:' + h.accuracy + '"><span>' + h.accuracy + '%</span></div>' +
      '<h2>' + esc(title) + '</h2><p>' + esc(msg) + '</p></div>';

    html += '<div class="grid-3">' +
      '<div class="stat"><b>' + h.total + '</b><small>कुल प्रश्न</small></div>' +
      '<div class="stat ok"><b>' + h.correct + '</b><small>सही</small></div>' +
      '<div class="stat bad"><b>' + h.wrong + '</b><small>गलत</small></div>' +
      '<div class="stat"><b>' + h.accuracy + '%</b><small>Accuracy</small></div>' +
      '<div class="stat"><b>' + M.App.fmtTime(h.seconds) + '</b><small>लिया गया समय</small></div>' +
      '<div class="stat gold"><b>+' + h.xp + '</b><small>XP मिला</small></div></div>';

    var status;
    if (h.mode === 'chapter') status = rec.completed ? 'पूरा ✅ (पास)' : 'अभी पूरा नहीं — ' + h.passPercent + '% चाहिए';
    else status = 'लागू नहीं (' + (h.mode === 'demo' ? 'Demo' : 'गलतियाँ Quiz') + ')';
    html += '<div class="card"><div class="kv"><span>Chapter status</span><b>' + esc(status) + '</b></div>';
    if (h.unlockedChapter) html += '<div class="banner ok">🔓 अगला Chapter (अध्याय ' + h.unlockedChapter + ') खुल गया!</div>';
    html += '</div>';

    html += '<div class="card"><h3 class="card-title">XP का हिसाब</h3><ul class="xp-list">' +
      h.breakdown.map(function (b) { return '<li><span>' + esc(b.label) + '</span><b>' + (b.xp ? '+' + b.xp : '0') + '</b></li>'; }).join('') +
      '</ul><p class="muted small">एक प्रश्न का XP सिर्फ़ पहली बार सही करने पर मिलता है, इसलिए दोबारा खेलने पर XP कम/सीमित रहता है।</p></div>';

    if (h.mode === 'chapter') {
      html += '<div class="card advice"><strong>सलाह</strong><p>' + esc(M.Progress.advice(h.accuracy, M.Mistakes.unresolvedCount(h.subject, h.chapter), h.passPercent)) + '</p></div>';
    }

    html += '<div class="btn-stack">' +
      '<button class="btn" data-action="result-retry" data-id="' + esc(h.id) + '">🔁 Retry Quiz</button>' +
      '<button class="btn ghost" data-action="nav" data-to="/review/' + esc(h.id) + '">📖 Review Answers</button>' +
      (h.wrong ? '<button class="btn ghost" data-action="nav" data-to="/mistakes">📒 Mistake Notebook</button>' : '') +
      '<button class="btn ghost" data-action="nav" data-to="' + esc(h.mode === 'chapter' ? '/chapter/' + h.subject + '/' + h.chapter : (h.mode === 'retry' ? '/mistakes' : '/home')) + '">← वापस जाओ</button>' +
      '</div></section>';
    return { html: html, title: 'Result', back: h.mode === 'chapter' ? '/chapter/' + h.subject + '/' + h.chapter : '/home', tab: 'subjects', ctx: 'result' };
  };

  Q.retryFromResult = function (id) {
    var h = findEntry(id);
    if (!h) return;
    if (h.mode === 'chapter') M.Chapters.startQuiz(h.subject, h.chapter);
    else if (h.mode === 'demo') M.Chapters.startDemo();
    else M.Mistakes.startRetry({ subject: h.subject === 'mixed' ? '' : h.subject, chapter: h.chapter });
  };

  /* ---------- Review पेज ---------- */
  Q.viewReview = function (p, query) {
    var h = findEntry(p.id);
    if (!h) return M.App.notFound('यह Result नहीं मिला।');
    var back = '/result/' + h.id;
    if (!h.review) {
      return { html: '<section class="page"><div class="empty big"><div class="empty-ico">🗂️</div><h3>इस Quiz की detail सेव नहीं है</h3>' +
        '<p>सिर्फ़ आख़िरी 5 Quiz की पूरी Review सेव रहती है। गलतियाँ Mistake Notebook में मिलेंगी।</p>' +
        '<button class="btn" data-action="nav" data-to="/mistakes">Mistake Notebook</button></div></section>', title: 'Review', back: back, tab: 'subjects', ctx: 'review' };
    }
    var onlyWrong = query.f === 'wrong';
    var html = '<section class="page"><div class="chips">' +
      '<button class="chip-btn' + (!onlyWrong ? ' on' : '') + '" data-action="nav" data-to="/review/' + esc(h.id) + '">सभी (' + h.review.length + ')</button>' +
      '<button class="chip-btn' + (onlyWrong ? ' on' : '') + '" data-action="nav" data-to="' + esc('/review/' + h.id + '?f=wrong') + '">सिर्फ़ गलत (' + h.wrong + ')</button></div>';
    var shown = 0;
    h.review.forEach(function (r, i) {
      var q = r.q;
      var ok = r.chosen === q.answer;
      if (onlyWrong && ok) return;
      shown += 1;
      html += '<article class="card review ' + (ok ? 'ok' : 'bad') + '"><div class="mk-head"><span class="chip">प्रश्न ' + (i + 1) + '</span>' +
        '<span class="chip ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'सही' : 'गलत') + '</span></div>' +
        '<p class="q-text">' + esc(q.question) + '</p>' +
        '<p class="ans ' + (ok ? 'ok' : 'bad') + '">तुम्हारा उत्तर: ' + esc(r.chosen ? r.chosen + ') ' + q.options[r.chosen] : '—') + '</p>' +
        (ok ? '' : '<p class="ans ok">सही उत्तर: ' + esc(q.answer + ') ' + q.options[q.answer]) + '</p>') +
        '<p class="expl">' + esc(q.explanation || 'व्याख्या उपलब्ध नहीं है।') + '</p></article>';
    });
    if (!shown) html += '<div class="empty ok-box"><p>👏 कोई गलत जवाब नहीं — पूरा सही!</p></div>';
    html += '</section>';
    return { html: html, title: 'Review Answers', sub: M.Progress.entryTitle(h), back: back, tab: 'subjects', ctx: 'review' };
  };

  M.Quiz = Q;
})(window.M27 = window.M27 || {});
