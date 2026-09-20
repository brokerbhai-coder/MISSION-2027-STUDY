/* ==========================================================
   progress.js
   काम: Quiz पूरा होने पर सारा हिसाब (score, chapter status, XP, streak),
   accuracy, weak chapters, और "प्रोग्रेस" पेज।
   ========================================================== */
(function (M) {
  'use strict';

  var P = {};
  var STREAK_MIN_SECONDS = 300; // 5 मिनट पढ़ाई से भी दिन गिना जाता है
  var DAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

  function esc(s) { return M.App.esc(s); }

  /* ---------- Chapter records ---------- */
  P.chapterKey = function (subject, chapter) { return subject + '-' + chapter; };

  P.emptyChapter = function () {
    return {
      attempts: 0, bestAccuracy: 0, lastAccuracy: 0, lastTotal: 0, lastDate: null,
      completed: false, firstPassDate: null, totalCorrect: 0, totalAnswered: 0,
      completionBonus: false, passBonus: false
    };
  };

  P.chapterRecord = function (subject, chapter) {
    return M.Storage.state.chapters[P.chapterKey(subject, chapter)] || P.emptyChapter();
  };

  /* ---------- Streak ---------- */
  // आज को "पढ़ाई वाला दिन" चिह्नित करता है; बदलाव हुआ तो true
  P.markStudyDay = function () {
    var st = M.Storage.state;
    var t = M.Storage.todayStr();
    var sk = st.streak;
    st.lastStudyDate = t;
    if (sk.lastDate === t) return false;
    var diff = sk.lastDate ? M.Storage.dayDiff(t, sk.lastDate) : null;
    sk.current = diff === 1 ? sk.current + 1 : 1;
    sk.lastDate = t;
    if (sk.current > sk.best) sk.best = sk.current;
    return true;
  };

  // कल या आज पढ़े थे तो streak दिखेगा, वरना 0
  P.displayStreak = function () {
    var sk = M.Storage.state.streak;
    if (!sk.lastDate) return 0;
    return M.Storage.dayDiff(M.Storage.todayStr(), sk.lastDate) <= 1 ? sk.current : 0;
  };

  P.touchStreakFromStudy = function () {
    var st = M.Storage.state;
    var t = M.Storage.todayStr();
    if ((st.studyByDate[t] || 0) >= STREAK_MIN_SECONDS) {
      if (P.markStudyDay()) {
        M.Rewards.checkAchievements();
        if (M.App && M.App.refreshHeader) M.App.refreshHeader();
      }
    }
  };

  /* ---------- Quiz पूरा होने पर ---------- */
  P.entryTitle = function (h) {
    if (h.mode === 'retry') return 'गलतियाँ दोबारा हल';
    if (h.mode === 'demo') return 'Demo Quiz';
    return M.Subjects.chapterLabel(h.subject, h.chapter);
  };

  P.completeQuiz = function (aq) {
    var st = M.Storage.state;
    M.Storage.ensureToday();
    var today = M.Storage.todayStr();
    var total = aq.questions.length;
    var correct = 0;
    aq.answers.forEach(function (a) { if (a && a.correct) correct++; });
    var accuracy = total ? Math.round(correct * 100 / total) : 0;
    var pass = M.Subjects.passPercent(aq.subject);
    var passed = accuracy >= pass;
    var isRetry = aq.mode === 'retry';
    var key = P.chapterKey(aq.subject, aq.chapter);
    var rec = isRetry ? null : (st.chapters[key] || P.emptyChapter());
    var firstCompletion = rec ? rec.attempts === 0 : false;
    var firstPass = rec ? (passed && !rec.passBonus) : false;

    // अगला chapter पहले से unlock था या नहीं (सिर्फ़ sequential subjects के लिए मायने रखता है)
    var nextNo = isRetry ? 0 : M.Chapters.nextNumber(aq.subject, aq.chapter);
    var wasLocked = nextNo ? !M.Chapters.isUnlocked(aq.subject, nextNo) : false;

    var award = M.Rewards.awardQuiz({
      questions: aq.questions, answers: aq.answers, mode: aq.mode,
      firstCompletion: firstCompletion, firstPass: firstPass
    });

    if (rec) {
      rec.attempts += 1;
      rec.totalCorrect += correct;
      rec.totalAnswered += total;
      rec.lastAccuracy = accuracy;
      rec.lastTotal = total;
      rec.lastDate = today;
      rec.completionBonus = true;
      if (accuracy > rec.bestAccuracy) rec.bestAccuracy = accuracy;
      if (passed) {
        rec.completed = true;
        rec.passBonus = true;
        if (!rec.firstPassDate) rec.firstPassDate = today;
      }
      st.chapters[key] = rec;
      st.lastChapter = { subject: aq.subject, chapter: aq.chapter };
    }

    st.stats.correctTotal += correct;
    st.stats.answeredTotal += total;
    M.Rewards.updateChallenge(correct);
    P.markStudyDay();

    var entry = {
      id: 'h' + Date.now(),
      mode: aq.mode,
      subject: aq.subject,
      chapter: aq.chapter,
      title: aq.title || '',
      date: new Date().toISOString(),
      day: today,
      total: total,
      correct: correct,
      wrong: total - correct,
      accuracy: accuracy,
      seconds: aq.elapsed,
      xp: award.total,
      breakdown: award.items,
      passed: passed,
      passPercent: pass,
      unlockedChapter: (wasLocked && M.Chapters.isUnlocked(aq.subject, nextNo)) ? nextNo : 0,
      review: aq.questions.map(function (q, i) {
        return { q: q, chosen: aq.answers[i] ? aq.answers[i].chosen : '' };
      })
    };
    st.quizHistory.push(entry);
    if (st.quizHistory.length > 300) st.quizHistory.splice(0, st.quizHistory.length - 300);
    for (var i = 0; i < st.quizHistory.length - 5; i++) st.quizHistory[i].review = null;

    M.Rewards.checkAchievements();
    M.Storage.save();
    return entry;
  };

  /* ---------- Accuracy और stats ---------- */
  P.subjectStats = function (subjectId) {
    var st = M.Storage.state;
    var quizzes = 0, correct = 0, answered = 0, completed = 0;
    Object.keys(st.chapters).forEach(function (k) {
      if (k.indexOf(subjectId + '-') !== 0) return;
      var r = st.chapters[k];
      quizzes += r.attempts;
      correct += r.totalCorrect;
      answered += r.totalAnswered;
      if (r.completed) completed += 1;
    });
    return { quizzes: quizzes, correct: correct, answered: answered, completed: completed, accuracy: answered ? Math.round(correct * 100 / answered) : null };
  };

  P.overall = function () {
    var total = 0, done = 0, questions = 0;
    M.Subjects.list().forEach(function (s) {
      M.Subjects.chapters(s.id).forEach(function (c) {
        if (!c.file) return;
        total += 1;
        questions += M.Chapters.questionCount(s.id, c.number);
        if (P.chapterRecord(s.id, c.number).completed) done += 1;
      });
    });
    return { total: total, done: done, questions: questions, pct: total ? Math.round(done * 100 / total) : 0 };
  };

  P.advice = function (lastAcc, unresolved, pass) {
    var t;
    if (lastAcc < 40) t = 'इस Chapter में अभी तैयारी कमज़ोर है। पहले Notes ध्यान से पढ़ो, फिर छोटा Quiz दो।';
    else if (lastAcc < pass) t = 'इस Chapter में Accuracy कम है। पहले Notes Revise करो, फिर Quiz दो।';
    else if (lastAcc < 80) t = 'अच्छा चल रहा है! गलतियाँ Review करो और 80% का लक्ष्य रखो।';
    else t = 'बहुत बढ़िया! इस Chapter पर पकड़ मज़बूत है। बीच-बीच में Revise करते रहो।';
    if (unresolved > 0) t += ' अभी ' + unresolved + ' गलत प्रश्न बाकी हैं — Mistake Notebook में दोबारा हल करो।';
    return t;
  };

  // वो chapters जिनका आख़िरी Quiz पास-मार्क से नीचे रहा
  P.weakChapters = function () {
    var st = M.Storage.state;
    var out = [];
    Object.keys(st.chapters).forEach(function (k) {
      var m = /^(.+)-(\d+)$/.exec(k);
      if (!m || m[1] === 'demo') return;
      var r = st.chapters[k];
      var pass = M.Subjects.passPercent(m[1]);
      if (r.attempts > 0 && r.lastAccuracy < pass) {
        var no = parseInt(m[2], 10);
        var unresolved = M.Mistakes.unresolvedCount(m[1], no);
        out.push({
          subject: m[1], chapter: no, label: M.Subjects.chapterLabel(m[1], no),
          lastAccuracy: r.lastAccuracy, accuracy: r.totalAnswered ? Math.round(r.totalCorrect * 100 / r.totalAnswered) : 0,
          unresolved: unresolved, advice: P.advice(r.lastAccuracy, unresolved, pass)
        });
      }
    });
    out.sort(function (a, b) { return a.lastAccuracy - b.lastAccuracy; });
    return out;
  };

  /* ---------- Continue Learning ---------- */
  P.continueInfo = function () {
    var st = M.Storage.state;
    if (st.activeQuiz) {
      var done = st.activeQuiz.answers.filter(function (a) { return !!a; }).length;
      return { type: 'resume', title: st.activeQuiz.title, answered: done, total: st.activeQuiz.questions.length };
    }
    var subs = M.Subjects.list();
    var lc = st.lastChapter;
    if (lc && M.Chapters.questionCount(lc.subject, lc.chapter) > 0 && M.Chapters.isUnlocked(lc.subject, lc.chapter)
        && !P.chapterRecord(lc.subject, lc.chapter).completed) {
      return { type: 'chapter', subject: lc.subject, chapter: lc.chapter };
    }
    var i, n;
    for (i = 0; i < subs.length; i++) {
      n = M.Subjects.continueTarget(subs[i].id, true);
      if (n) return { type: 'chapter', subject: subs[i].id, chapter: n };
    }
    for (i = 0; i < subs.length; i++) {
      n = M.Subjects.continueTarget(subs[i].id, false);
      if (n) return { type: 'revise', subject: subs[i].id, chapter: n };
    }
    return { type: 'none' };
  };

  /* ---------- History list (Home + Progress दोनों में) ---------- */
  P.historyListHtml = function (list) {
    if (!list.length) return '';
    return '<div class="list">' + list.map(function (h) {
      var cls = h.passed ? 'ok' : 'bad';
      return '<button class="row-btn" data-action="nav" data-to="/result/' + esc(h.id) + '">' +
        '<span class="row-ico ' + cls + '">' + (h.passed ? '✓' : '✗') + '</span>' +
        '<span class="row-main"><strong>' + esc(P.entryTitle(h)) + '</strong>' +
        '<small>' + esc(M.App.fmtDate(h.day)) + ' · ' + h.correct + '/' + h.total + ' सही · ' + M.App.fmtTime(h.seconds) + '</small></span>' +
        '<span class="row-end"><b>' + h.accuracy + '%</b><small>+' + h.xp + ' XP</small></span></button>';
    }).join('') + '</div>';
  };

  P.recentHistory = function (n) {
    var h = M.Storage.state.quizHistory;
    return h.slice(Math.max(0, h.length - n)).reverse();
  };

  /* ---------- प्रोग्रेस पेज ---------- */
  function last7Html() {
    var st = M.Storage.state;
    var days = [];
    var i, d, key, sec;
    var max = st.dailyGoalMinutes;
    for (i = 6; i >= 0; i--) {
      d = new Date();
      d.setDate(d.getDate() - i);
      key = M.Storage.todayStr(d);
      sec = st.studyByDate[key] || 0;
      days.push({ label: DAYS_HI[d.getDay()], min: Math.round(sec / 60), sec: sec, today: i === 0 });
      if (Math.round(sec / 60) > max) max = Math.round(sec / 60);
    }
    return '<div class="bars">' + days.map(function (x) {
      var h = x.sec > 0 ? Math.max(6, Math.round(x.min * 100 / max)) : 2;
      return '<div class="bar-col"><span class="bar-val">' + (x.min || '') + '</span>' +
        '<div class="bar-track"><i style="height:' + h + '%"' + (x.today ? ' class="today"' : '') + '></i></div>' +
        '<span class="bar-lbl">' + x.label + '</span></div>';
    }).join('') + '</div><p class="muted small">हर दिन के मिनट (सिर्फ़ active पढ़ाई का समय)</p>';
  }

  P.viewProgress = function () {
    var st = M.Storage.state;
    var html = '<section class="page">';
    html += '<div class="grid-2">' +
      '<div class="stat"><span class="stat-ico">⭐</span><b>' + st.xp + '</b><small>कुल XP</small></div>' +
      '<div class="stat"><span class="stat-ico">🧠</span><b>' + st.quizHistory.length + '</b><small>पूरे Quiz</small></div>' +
      '<div class="stat"><span class="stat-ico">⏱️</span><b>' + esc(M.App.fmtStudy(st.totalStudySeconds)) + '</b><small>कुल पढ़ाई</small></div>' +
      '<div class="stat"><span class="stat-ico">🎯</span><b>' + (st.stats.answeredTotal ? Math.round(st.stats.correctTotal * 100 / st.stats.answeredTotal) + '%' : '—') + '</b><small>कुल Accuracy</small></div>' +
      '</div>';

    // विषय के अनुसार
    html += '<h2 class="sec-title">विषय के अनुसार Accuracy</h2><div class="card">';
    M.Subjects.list().forEach(function (s) {
      var ss = P.subjectStats(s.id);
      var trackable = M.Subjects.chapters(s.id).filter(function (c) { return c.file; }).length;
      html += '<div class="acc-row"><div class="acc-head"><span>' + esc(s.icon) + ' ' + esc(s.nameHi) + '</span>' +
        '<b>' + (ss.accuracy === null ? '—' : ss.accuracy + '%') + '</b></div>' +
        '<div class="progress"><span style="width:' + (ss.accuracy || 0) + '%;background:' + esc(s.color) + '"></span></div>' +
        '<small class="muted">' + (ss.answered ? ss.quizzes + ' Quiz · ' + ss.completed + '/' + trackable + ' Chapter पूरे' : 'अभी कोई Quiz attempt नहीं') + '</small></div>';
    });
    html += '</div>';

    // Chapter के अनुसार
    var rows = [];
    Object.keys(st.chapters).forEach(function (k) {
      var m = /^(.+)-(\d+)$/.exec(k);
      if (!m || m[1] === 'demo' || st.chapters[k].attempts === 0) return;
      rows.push({ subject: m[1], no: parseInt(m[2], 10), r: st.chapters[k] });
    });
    html += '<h2 class="sec-title">Chapter के अनुसार Accuracy</h2>';
    if (!rows.length) {
      html += '<div class="empty"><p>अभी किसी Chapter का Quiz पूरा नहीं हुआ है।</p><p class="muted">Quiz देने के बाद हर Chapter की Accuracy यहाँ दिखेगी।</p></div>';
    } else {
      html += '<div class="list">' + rows.map(function (x) {
        var cum = x.r.totalAnswered ? Math.round(x.r.totalCorrect * 100 / x.r.totalAnswered) : 0;
        return '<button class="row-btn" data-action="nav" data-to="/chapter/' + esc(x.subject) + '/' + x.no + '">' +
          '<span class="row-ico ' + (x.r.completed ? 'ok' : 'bad') + '">' + (x.r.completed ? '✓' : '•') + '</span>' +
          '<span class="row-main"><strong>' + esc(M.Subjects.chapterLabel(x.subject, x.no)) + '</strong>' +
          '<small>' + x.r.attempts + ' Quiz · अंतिम ' + x.r.lastAccuracy + '% · सर्वश्रेष्ठ ' + x.r.bestAccuracy + '%</small></span>' +
          '<span class="row-end"><b>' + cum + '%</b><small>कुल</small></span></button>';
      }).join('') + '</div>';
    }

    // कमज़ोर chapters
    html += '<h2 class="sec-title">कमज़ोर Chapters</h2>' + P.weakHtml();

    html += '<h2 class="sec-title">पिछले 7 दिन की पढ़ाई</h2><div class="card">' + last7Html() + '</div>';

    html += '<h2 class="sec-title">Quiz History</h2>';
    var hist = P.recentHistory(15);
    html += hist.length ? P.historyListHtml(hist) : '<div class="empty"><p>अभी कोई Quiz history नहीं है।</p></div>';
    html += '</section>';
    return { html: html, title: 'प्रोग्रेस', back: null, tab: 'progress', ctx: 'progress' };
  };

  // Weak chapters का HTML (Home और Progress दोनों use करते हैं)
  P.weakHtml = function () {
    var st = M.Storage.state;
    var nonDemo = st.quizHistory.filter(function (h) { return h.mode !== 'demo'; }).length;
    var weak = P.weakChapters();
    if (!nonDemo) {
      return '<div class="empty"><p>अभी Chapter Quiz नहीं दिया, इसलिए कमज़ोर Chapters नहीं दिख रहे।</p><p class="muted">Quiz देने के बाद असली Accuracy के हिसाब से सलाह मिलेगी।</p></div>';
    }
    if (!weak.length) {
      return '<div class="empty ok-box"><p>👏 अभी कोई Chapter कमज़ोर नहीं है। ऐसे ही चलते रहो!</p></div>';
    }
    return weak.map(function (w) {
      return '<div class="card weak"><div class="weak-head"><strong>' + esc(w.label) + '</strong><span class="chip bad">' + w.lastAccuracy + '%</span></div>' +
        '<p>' + esc(w.advice) + '</p>' +
        '<div class="btn-row"><button class="btn small" data-action="nav" data-to="/chapter/' + esc(w.subject) + '/' + w.chapter + '">Chapter खोलो</button>' +
        (w.unresolved ? '<button class="btn small ghost" data-action="nav" data-to="' + esc('/mistakes?subject=' + w.subject + '&chapter=' + w.chapter) + '">गलतियाँ देखो</button>' : '') +
        '</div></div>';
    }).join('');
  };

  M.Progress = P;
})(window.M27 = window.M27 || {});
