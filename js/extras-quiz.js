/* ==========================================================
   extras-quiz.js  (नया)
   काम: Mixed Practice और PYQ के "Quiz Mode" के लिए अलग MCQ चलाने वाला हिस्सा।
   - पुराना quiz.js / progress.js / mistakes.js / storage.js इस्तेमाल या बदले नहीं जाते
   - Timer, सही/गलत feedback, Score, Result और Answer Review मिलते हैं
   - Data अलग key (mission2027_extras_v1) में सेव होता है — XP/Chapter progress नहीं बदलता
   Routes: #/xquiz   #/xresult/<id>   #/xreview/<id>
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var Q = {};
  var tickId = null;
  var tickCount = 0;
  function esc(s) { return M.App.esc(s); }

  function active() { return X.store().active; }
  function persist() { X.save(); }
  function allAnswered(a) { return a.answers.every(function (x) { return !!x; }); }
  function answeredCount(a) { return a.answers.filter(function (x) { return !!x; }).length; }
  function timerText(a) {
    if (a.limitSec > 0) {
      var left = Math.max(0, a.limitSec - a.elapsed);
      return '⏳ ' + M.App.fmtTime(left);
    }
    return '⏱ ' + M.App.fmtTime(a.elapsed);
  }

  /* ---------- शुरू ---------- */
  // o: { kind:'practice'|'pyq', subject, title, questions:[cleaned objective], backPath, introPath, bestKey, limitMinutes }
  Q.start = function (o) {
    if (!o || !o.questions || !o.questions.length) { M.App.toast('इस Quiz के लिए प्रश्न नहीं हैं।', 'info'); return Promise.resolve(); }
    function begin() {
      var qs = o.questions.map(function (q) { return JSON.parse(JSON.stringify(q)); });
      X.store().active = {
        id: 'x' + Date.now(), kind: o.kind, subject: o.subject, title: o.title,
        backPath: o.backPath || '/extras', introPath: o.introPath || o.backPath || '/extras', bestKey: o.bestKey || '',
        ng: o.ng || null, vault: o.vault || null, questions: qs, answers: qs.map(function () { return null; }), index: 0, elapsed: 0,
        limitSec: o.limitMinutes > 0 ? Math.round(o.limitMinutes * 60) : 0, timeUp: false,
        startedAt: new Date().toISOString()
      };
      persist();
      if (M.Sound) M.Sound.play('start');
      X.ensureMathFor(qs).then(function () { M.Router.go('/xquiz'); });
    }
    var cur = active();
    if (cur) {
      return M.App.dialog({
        title: 'एक अभ्यास अधूरा है',
        message: '"' + cur.title + '" अभी पूरा नहीं हुआ (' + answeredCount(cur) + '/' + cur.questions.length + ' जवाब दिए)। क्या करना है?',
        buttons: [
          { label: 'उसे जारी रखो', value: 'resume', cls: 'primary' },
          { label: 'नया शुरू करो (पुराना हटेगा)', value: 'new', cls: 'danger' },
          { label: 'रद्द', value: null, cls: 'ghost' }
        ]
      }).then(function (v) {
        if (v === 'resume') M.Router.go('/xquiz');
        else if (v === 'new') begin();
      });
    }
    begin();
    return Promise.resolve();
  };

  /* ---------- Quiz पेज ---------- */
  function bodyHtml() {
    var a = active();
    var i = a.index, q = a.questions[i], ans = a.answers[i], total = a.questions.length;
    var done = answeredCount(a);
    var html = '<div class="quiz-top"><span class="chip">प्रश्न ' + (i + 1) + ' / ' + total + '</span>' +
      (q.chapter ? '<span class="chip tiny">अध्याय ' + q.chapter + '</span>' : '') +
      '<span class="quiz-timer" id="xqTimer">' + timerText(a) + '</span></div>' +
      '<div class="progress"><span style="width:' + Math.round(done * 100 / total) + '%"></span></div>' +
      '<div class="card q-card"><p class="q-text">' + X.rich(q.question) + '</p></div><div class="options">';
    ['A', 'B', 'C', 'D'].forEach(function (L) {
      var cls = 'opt';
      if (ans) { if (L === q.answer) cls += ' right'; else if (L === ans.chosen) cls += ' wrong'; else cls += ' dim'; }
      html += '<button class="' + cls + '" data-action="xq-answer" data-opt="' + L + '"' + (ans ? ' disabled' : '') + '>' +
        '<span class="opt-key">' + L + '</span><span class="opt-text">' + X.rich(q.options[L]) + '</span></button>';
    });
    html += '</div>';
    if (ans) {
      html += '<div class="feedback ' + (ans.correct ? 'ok' : 'bad') + '" role="status"><strong>' + (ans.correct ? '✅ सही जवाब!' : '❌ गलत जवाब') + '</strong>' +
        (ans.correct ? '' : '<p>सही उत्तर: <b>' + q.answer + ') ' + X.rich(q.options[q.answer]) + '</b></p>') +
        '<p class="expl">' + X.rich(q.explanation || 'व्याख्या उपलब्ध नहीं है।') + '</p></div>';
    } else {
      html += '<p class="muted small center">एक विकल्प चुनो, फिर सही जवाब और explanation दिखेगा।</p>';
    }
    if (a.timeUp) html += '<div class="banner warn">⏰ तय समय पूरा हो गया। चाहो तो बाकी प्रश्न भी कर सकते हो, या Result देख सकते हो।</div>';
    html += '<div class="quiz-nav"><button class="btn ghost" data-action="xq-prev"' + (i === 0 ? ' disabled' : '') + '>‹ पिछला</button>';
    if (i < total - 1) html += '<button class="btn" data-action="xq-next">अगला ›</button>';
    else html += '<button class="btn success" data-action="xq-finish"' + (allAnswered(a) || a.timeUp ? '' : ' disabled') + '>Result देखो ✅</button>';
    html += '</div>';
    if (done > 0 && !allAnswered(a)) html += '<button class="link-btn" data-action="xq-finish-early">अभी Result दिखाओ (बचे प्रश्न छोड़कर)</button>';
    html += '<button class="link-btn" data-action="xq-discard">इस अभ्यास को रद्द करो</button>';
    return html;
  }
  function rerender() {
    var b = document.getElementById('xqBody');
    if (!b || !active()) return;
    b.innerHTML = bodyHtml();
    var fb = b.querySelector('.feedback');
    if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest' });
  }

  function tick() {
    var a = active();
    var el = document.getElementById('xqTimer');
    if (!a || !el) { clearInterval(tickId); tickId = null; return; }
    if (document.hidden) return;
    if (!allAnswered(a)) {
      a.elapsed += 1;
      tickCount += 1;
      if (a.limitSec > 0 && a.elapsed >= a.limitSec && !a.timeUp) {
        a.timeUp = true;
        persist();
        M.App.toast('⏰ तय समय पूरा हुआ।', 'warn');
        rerender();
        return;
      }
      if (tickCount % 10 === 0) persist();
    }
    el.textContent = timerText(a);
  }
  function ensureTicker() { if (!tickId) tickId = setInterval(tick, 1000); }

  function viewQuiz() {
    X.boot();
    var a = active();
    if (!a) {
      return X.view({ html: '<section class="page xs">' + X.emptyHtml('📝', 'अभी कोई अभ्यास चालू नहीं है', 'Mixed Practice या PYQ से शुरू करो।', 'नोट्स · PYQ · Practice', '/extras') + '</section>', title: 'अभ्यास', back: '/extras' });
    }
    return X.ensureMathFor(a.questions).then(function (mathOk) {
      if (!mathOk) X.onMathReady(function () { if (M.Router.currentPath === '/xquiz') M.Router.refresh(true); });
      return X.view({ html: '<section class="page xs"><div id="xqBody">' + bodyHtml() + '</div></section>', title: a.kind === 'pyq' ? 'PYQ Quiz' : a.kind === 'ngame' ? 'Notes Game' : a.kind === 'vault' ? 'Vault Challenge' : 'Mixed Practice', sub: a.title, backAction: 'xq-leave', after: ensureTicker });
    });
  }

  /* ---------- Actions ---------- */
  Q.answer = function (opt) {
    var a = active();
    if (!a || a.answers[a.index]) return;
    var q = a.questions[a.index];
    a.answers[a.index] = { chosen: opt, correct: opt === q.answer };
    persist();
    rerender();
  };
  Q.go = function (d) {
    var a = active();
    if (!a) return;
    var n = a.index + d;
    if (n < 0 || n >= a.questions.length) return;
    a.index = n;
    persist();
    rerender();
    window.scrollTo(0, 0);
  };
  Q.leave = function () {
    var a = active();
    if (!a) { M.Router.go('/extras'); return; }
    M.App.dialog({
      title: 'अभ्यास बीच में छोड़ें?',
      message: 'तुम्हारे जवाब सेव हैं। बाद में "नोट्स/PYQ" से इसे जारी रख सकते हो।',
      buttons: [{ label: 'अभ्यास जारी रखो', value: false, cls: 'primary' }, { label: 'बाद में करूँगा', value: true, cls: 'ghost' }]
    }).then(function (leave) { if (leave) M.Router.go(a.backPath); });
  };
  Q.discard = function () {
    var a = active();
    if (!a) return;
    M.App.dialog({
      title: 'अभ्यास रद्द करें?', message: 'यह अभ्यास हट जाएगा और इसका Result नहीं बनेगा।',
      buttons: [{ label: 'नहीं, जारी रखो', value: false, cls: 'primary' }, { label: 'हाँ, रद्द करो', value: true, cls: 'danger' }]
    }).then(function (yes) {
      if (!yes) return;
      var back = a.backPath;
      X.store().active = null;
      persist();
      M.Router.go(back);
    });
  };

  Q.finish = function () {
    var a = active();
    if (!a) return;
    var total = a.questions.length;
    var correct = 0, wrong = 0;
    var byCh = {};
    a.questions.forEach(function (q, i) {
      var r = a.answers[i];
      if (r && r.correct) correct += 1; else if (r) wrong += 1;
      if (q.chapter) {
        var c = byCh[q.chapter] || (byCh[q.chapter] = { chapter: q.chapter, total: 0, correct: 0 });
        c.total += 1;
        if (r && r.correct) c.correct += 1;
      }
    });
    var entry = {
      id: a.id, kind: a.kind, subject: a.subject, title: a.title, introPath: a.introPath,
      total: total, correct: correct, wrong: wrong, skipped: total - correct - wrong,
      accuracy: Math.round(correct * 100 / total), seconds: a.elapsed, date: new Date().toISOString(),
      byChapter: Object.keys(byCh).map(function (k) { return byCh[k]; }).sort(function (x, y) { return x.chapter - y.chapter; }),
      review: a.questions.map(function (q, i) { return { q: q, chosen: a.answers[i] ? a.answers[i].chosen : null }; })
    };
    var st = X.store();
    st.history.push(entry);
    st.history = st.history.slice(-30);
    // सिर्फ़ आख़िरी 5 की पूरी Review रखो (जगह बचाने के लिए)
    for (var i = 0; i < st.history.length - 5; i++) delete st.history[i].review;
    if (a.kind === 'ngame' && a.ng && M.NotesGame && M.NotesGame.onFinish) entry.ngame = M.NotesGame.onFinish(a, entry);
    if (a.kind === 'vault' && a.vault && M.Vault && M.Vault.onFinish) entry.vault = M.Vault.onFinish(a, entry);
    if (a.bestKey) {
      var b = st.best[a.bestKey] || { attempts: 0, best: 0 };
      b.attempts += 1;
      b.best = Math.max(b.best || 0, entry.accuracy);
      b.last = entry.accuracy;
      st.best[a.bestKey] = b;
    }
    st.active = null;
    persist();
    M.Router.go('/xresult/' + entry.id);
  };
  Q.finishEarly = function () {
    var a = active();
    if (!a) return;
    var left = a.answers.length - answeredCount(a);
    M.App.confirm('अभी Result देखें?', left + ' प्रश्न बिना जवाब के रह जाएँगे और सही नहीं गिने जाएँगे।', 'हाँ, Result दिखाओ').then(function (yes) { if (yes) Q.finish(); });
  };

  /* ---------- Result / Review ---------- */
  function findEntry(id) {
    var h = X.store().history;
    for (var i = 0; i < h.length; i++) if (h[i].id === id) return h[i];
    return null;
  }
  function viewResult(p) {
    X.boot();
    var h = findEntry(p.id);
    if (!h) return X.view({ html: '<section class="page xs">' + X.emptyHtml('🧭', 'यह Result नहीं मिला', '', 'नोट्स · PYQ · Practice', '/extras') + '</section>', title: 'Result', back: '/extras' });
    var msg = h.accuracy >= 80 ? '🎉 बहुत बढ़िया प्रदर्शन!' : h.accuracy >= 50 ? '👍 अच्छा प्रयास — गलतियाँ Review करो।' : 'कोई बात नहीं। Review करो और फिर से try करो — तुम कर सकते हो!';
    var html = '<section class="page xs">';
    html += '<div class="card result-hero ' + (h.accuracy >= 50 ? 'ok' : 'info') + '"><div class="ring" style="--p:' + h.accuracy + '"><span>' + h.accuracy + '%</span></div>' +
      '<h2>' + esc(h.title) + '</h2><p>' + esc(msg) + '</p></div>';
    if (h.ngame) {
      var g = h.ngame;
      var starTxt = g.stars ? ' ' + new Array(g.stars + 1).join('⭐') : '';
      html += g.levelUp ? '<div class="banner ok levelup"><span>🎉 <b>LEVEL UP!</b> अब तुम Level ' + g.level + ' पर हो।' + starTxt + '</span></div>'
        : g.cleared ? '<div class="banner info"><span>✅ Stage पास' + starTxt + ' — यह Stage पहले पूरा हो चुका था, इसलिए Level वही रहा (Level ' + g.level + ')।</span></div>'
        : '<div class="banner warn"><span>Level बढ़ाने के लिए कम से कम ' + g.pass + '% चाहिए। Notes दोबारा पढ़ो और फिर कोशिश करो।</span></div>';
    }
    if (h.vault) {
      var vg = h.vault;
      html += vg.pass
        ? '<div class="banner ok vault-open"><span>🔓 <b>Vault खुल गया!</b> ' + vg.minutes + ' मिनट का Timer अभी शुरू हो गया है।</span><div style="margin-top:8px"><button class="btn small" data-action="nav" data-to="/vault">🔓 Vault खोलो</button></div></div>'
        : '<div class="banner warn"><span>Vault खोलने के लिए ' + vg.total + ' में से कम से कम ' + vg.needCorrect + ' सही (' + vg.need + '%) चाहिए। तुम्हारे ' + vg.correct + ' सही रहे। Vault अभी बंद है।</span></div>';
    }
    html += '<div class="grid-3"><div class="stat"><b>' + h.total + '</b><small>कुल प्रश्न</small></div>' +
      '<div class="stat ok"><b>' + h.correct + '</b><small>सही</small></div>' +
      '<div class="stat bad"><b>' + h.wrong + '</b><small>गलत</small></div>' +
      '<div class="stat"><b>' + h.skipped + '</b><small>छोड़े</small></div>' +
      '<div class="stat"><b>' + h.accuracy + '%</b><small>Score</small></div>' +
      '<div class="stat"><b>' + M.App.fmtTime(h.seconds) + '</b><small>लिया गया समय</small></div></div>';
    if (h.byChapter && h.byChapter.length) {
      html += '<div class="card"><h3 class="card-title">Chapter-वार नतीजा</h3><div class="px-chap">' +
        h.byChapter.map(function (c) {
          return '<div class="kv"><span>' + esc(X.chapterName(h.subject, c.chapter)) + '</span><b>' + c.correct + ' / ' + c.total + '</b></div>';
        }).join('') + '</div></div>';
    }
    html += '<p class="x-note">ℹ️ यह अभ्यास XP, Chapter Quiz progress या Mistake Notebook में नहीं जुड़ता।</p>';
    html += '<div class="btn-stack"><button class="btn" data-action="nav" data-to="' + esc(h.introPath) + '">🔁 दोबारा करो</button>' +
      '<button class="btn ghost" data-action="nav" data-to="/xreview/' + esc(h.id) + '">📖 Review Answers</button>' +
      '<button class="btn ghost" data-action="nav" data-to="' + esc(h.introPath) + '">← वापस जाओ</button></div></section>';
    return X.view({ html: html, title: 'Result', sub: h.title, back: h.introPath });
  }
  function viewReview(p, query) {
    X.boot();
    var h = findEntry(p.id);
    var back = '/xresult/' + p.id;
    if (!h) return X.view({ html: '<section class="page xs">' + X.emptyHtml('🧭', 'यह Result नहीं मिला', '', 'नोट्स · PYQ · Practice', '/extras') + '</section>', title: 'Review', back: '/extras' });
    if (!h.review) {
      return X.view({ html: '<section class="page xs">' + X.emptyHtml('🗂️', 'इस अभ्यास की detail सेव नहीं है', 'सिर्फ़ आख़िरी 5 अभ्यास की पूरी Review सेव रहती है।') + '</section>', title: 'Review', back: back });
    }
    var onlyWrong = query && query.f === 'wrong';
    var here = '/xreview/' + p.id;
    return X.ensureMathFor(h.review).then(function (mathOk) {
      if (!mathOk) X.onMathReady(function () { if (M.Router.currentPath === here) M.Router.refresh(true); });
      return reviewPage(h, onlyWrong, back);
    });
  }
  function reviewPage(h, onlyWrong, back) {
    var html = '<section class="page xs"><div class="chips">' +
      '<button class="chip-btn' + (!onlyWrong ? ' on' : '') + '" data-action="nav" data-to="/xreview/' + esc(h.id) + '">सभी (' + h.review.length + ')</button>' +
      '<button class="chip-btn' + (onlyWrong ? ' on' : '') + '" data-action="nav" data-to="' + esc('/xreview/' + h.id + '?f=wrong') + '">सिर्फ़ गलत/छोड़े (' + (h.wrong + h.skipped) + ')</button></div>';
    var shown = 0;
    h.review.forEach(function (r, i) {
      var q = r.q;
      var ok = r.chosen === q.answer;
      if (onlyWrong && ok) return;
      shown += 1;
      html += '<article class="card review ' + (ok ? 'ok' : 'bad') + '"><div class="mk-head"><span class="chip">प्रश्न ' + (i + 1) + '</span>' +
        '<span class="chip ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'सही' : r.chosen ? 'गलत' : 'छोड़ा') + '</span></div>' +
        '<p class="q-text">' + X.rich(q.question) + '</p>' +
        '<p class="ans ' + (ok ? 'ok' : 'bad') + '">तुम्हारा उत्तर: ' + X.rich(r.chosen ? r.chosen + ') ' + q.options[r.chosen] : '—') + '</p>' +
        (ok ? '' : '<p class="ans ok">सही उत्तर: ' + X.rich(q.answer + ') ' + q.options[q.answer]) + '</p>') +
        '<p class="expl">' + X.rich(q.explanation || 'व्याख्या उपलब्ध नहीं है।') + '</p></article>';
    });
    if (!shown) html += '<div class="empty ok-box"><p>👏 कोई गलत जवाब नहीं — पूरा सही!</p></div>';
    html += '</section>';
    return X.view({ html: html, title: 'Review Answers', sub: h.title, back: back });
  }

  /* सबसे अच्छा score (Set की सूची में दिखाने के लिए) */
  Q.bestFor = function (key) { var b = X.store().best[key]; return b && typeof b.best === 'number' ? b : null; };
  Q.hasActive = function () { return !!active(); };
  Q.activeInfo = function () { var a = active(); return a ? { title: a.title, done: answeredCount(a), total: a.questions.length } : null; };

  X.onReady(function (A) {
    A['xq-answer'] = function (el) { Q.answer(el.dataset.opt); };
    A['xq-prev'] = function () { Q.go(-1); };
    A['xq-next'] = function () { Q.go(1); };
    A['xq-finish'] = function () { Q.finish(); };
    A['xq-finish-early'] = function () { Q.finishEarly(); };
    A['xq-leave'] = function () { Q.leave(); };
    A['xq-discard'] = function () { Q.discard(); };
  });

  if (M.Router && M.Router.add) {
    M.Router.add('/xquiz', viewQuiz);
    M.Router.add('/xresult/:id', viewResult);
    M.Router.add('/xreview/:id', viewReview);
  }

  M.ExtrasQuiz = Q;
})(window.M27 = window.M27 || {});
