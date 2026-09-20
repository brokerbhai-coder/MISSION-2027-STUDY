/* ==========================================================
   storage.js
   काम: पूरा progress (XP, quiz history, mistakes, streak...) को
   इसी phone/browser की localStorage में सेव और लोड करना।
   Backup Export / Import और Reset भी यहीं हैं।
   ========================================================== */
(function (M) {
  'use strict';

  var KEY = 'mission2027_progress_v1';
  var APP_ID = 'mission2027';
  var VERSION = 1;
  var LETTERS = ['A', 'B', 'C', 'D'];
  var MODES = ['chapter', 'retry', 'demo'];

  var Storage = { state: null, available: true, warned: false, loadNote: null };

  /* ---------- छोटे helper functions ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dayNumber(s) {
    var p = String(s).split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }
  function dayDiff(a, b) { return dayNumber(a) - dayNumber(b); } // a − b (दिनों में)
  function isDateStr(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function num(v, def, min, max) {
    v = Number(v);
    if (!isFinite(v)) return def;
    if (min !== undefined && v < min) return min;
    if (max !== undefined && v > max) return max;
    return v;
  }
  function int(v, def, min, max) { return Math.floor(num(v, def, min, max)); }
  function str(v, def, max) { return typeof v === 'string' ? v.slice(0, max || 500) : def; }

  function newDaily() {
    return { date: todayStr(), correct: 0, challengeClaimed: false, goalClaimed: false, replayCount: 0, gameXp: 0 };
  }

  function defaultState() {
    return {
      app: APP_ID,
      version: VERSION,
      createdAt: new Date().toISOString(),
      student: { name: 'Ankit' },
      xp: 0,
      dailyGoalMinutes: 60,
      quizSize: 10,
      totalStudySeconds: 0,
      studyByDate: {},
      lastStudyDate: null,
      streak: { current: 0, best: 0, lastDate: null },
      quizHistory: [],
      chapters: {},
      mistakes: {},
      awardedQuestions: {},
      achievements: {},
      daily: newDaily(),
      stats: { mistakesFixed: 0, goalDays: 0, challengeDays: 0, correctTotal: 0, answeredTotal: 0 },
      game: { plays: 0, wins: 0, bestMoves: null },
      lastChapter: null,
      activeQuiz: null
    };
  }

  /* ---------- Question validation (chapter JSON और saved data दोनों के लिए) ---------- */
  function cleanQuestion(q) {
    if (!isObj(q)) return { ok: false, error: 'प्रश्न सही format में नहीं है' };
    var id = typeof q.id === 'string' ? q.id.trim() : '';
    if (!id) return { ok: false, error: 'किसी प्रश्न में id नहीं है' };
    var text = typeof q.question === 'string' ? q.question.trim() : '';
    if (!text) return { ok: false, error: id + ': question खाली है' };
    if (!isObj(q.options)) return { ok: false, error: id + ': options नहीं हैं' };
    var opts = {};
    for (var i = 0; i < LETTERS.length; i++) {
      var v = q.options[LETTERS[i]];
      opts[LETTERS[i]] = (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : '';
      if (!opts[LETTERS[i]]) return { ok: false, error: id + ': विकल्प ' + LETTERS[i] + ' खाली है (चारों A,B,C,D चाहिए)' };
    }
    var ans = typeof q.answer === 'string' ? q.answer.trim().toUpperCase() : '';
    if (LETTERS.indexOf(ans) < 0) return { ok: false, error: id + ': answer A/B/C/D में से एक होना चाहिए' };
    return {
      ok: true,
      q: {
        id: id.slice(0, 40),
        subject: str(q.subject, '', 40),
        chapter: int(q.chapter, 0, 0, 999),
        question: text.slice(0, 3000),
        options: opts,
        answer: ans,
        explanation: str(q.explanation, '', 3000),
        source: str(q.source, 'PDF', 20).toUpperCase(),
        type: str(q.type, 'objective', 20)
      }
    };
  }

  function cleanActiveQuiz(a) {
    if (!isObj(a) || !Array.isArray(a.questions) || !a.questions.length) return null;
    var qs = [];
    for (var i = 0; i < a.questions.length && i < 200; i++) {
      var c = cleanQuestion(a.questions[i]);
      if (!c.ok) return null;
      qs.push(c.q);
    }
    var answers = [];
    for (var j = 0; j < qs.length; j++) {
      var x = Array.isArray(a.answers) ? a.answers[j] : null;
      if (isObj(x) && LETTERS.indexOf(x.chosen) >= 0) {
        answers.push({ chosen: x.chosen, correct: x.chosen === qs[j].answer });
      } else {
        answers.push(null);
      }
    }
    return {
      id: str(a.id, 'q' + Date.now(), 40),
      mode: MODES.indexOf(a.mode) >= 0 ? a.mode : 'chapter',
      subject: str(a.subject, '', 40),
      chapter: int(a.chapter, 0, 0, 999),
      title: str(a.title, '', 120),
      questions: qs,
      answers: answers,
      index: int(a.index, 0, 0, qs.length - 1),
      elapsed: int(a.elapsed, 0, 0, 86400),
      startedAt: str(a.startedAt, new Date().toISOString(), 40)
    };
  }

  /* raw data को साफ़ करके एक नया valid state बनाता है (गलत/खराब data अंदर नहीं आता) */
  function sanitize(raw, allowActive) {
    if (!isObj(raw) || typeof raw.xp !== 'number') return null;
    var d = defaultState();
    d.createdAt = str(raw.createdAt, d.createdAt, 40);
    if (isObj(raw.student)) d.student.name = str(raw.student.name, 'Ankit', 30).trim() || 'Ankit';
    d.xp = int(raw.xp, 0, 0, 1e9);
    d.dailyGoalMinutes = int(raw.dailyGoalMinutes, 60, 10, 600);
    d.quizSize = int(raw.quizSize, 10, 0, 100);
    d.totalStudySeconds = int(raw.totalStudySeconds, 0, 0, 1e9);
    d.lastStudyDate = isDateStr(raw.lastStudyDate) ? raw.lastStudyDate : null;

    if (isObj(raw.studyByDate)) {
      Object.keys(raw.studyByDate).forEach(function (k) {
        if (isDateStr(k)) d.studyByDate[k] = int(raw.studyByDate[k], 0, 0, 86400);
      });
    }
    if (isObj(raw.streak)) {
      d.streak.current = int(raw.streak.current, 0, 0, 100000);
      d.streak.best = int(raw.streak.best, 0, 0, 100000);
      d.streak.lastDate = isDateStr(raw.streak.lastDate) ? raw.streak.lastDate : null;
    }

    if (Array.isArray(raw.quizHistory)) {
      raw.quizHistory.slice(-300).forEach(function (h) {
        if (!isObj(h) || !h.id) return;
        var e = {
          id: str(h.id, '', 40),
          mode: MODES.indexOf(h.mode) >= 0 ? h.mode : 'chapter',
          subject: str(h.subject, '', 40),
          chapter: int(h.chapter, 0, 0, 999),
          title: str(h.title, '', 120),
          date: str(h.date, '', 40),
          day: isDateStr(h.day) ? h.day : todayStr(),
          total: int(h.total, 0, 0, 500),
          correct: int(h.correct, 0, 0, 500),
          wrong: int(h.wrong, 0, 0, 500),
          accuracy: int(h.accuracy, 0, 0, 100),
          seconds: int(h.seconds, 0, 0, 86400),
          xp: int(h.xp, 0, 0, 100000),
          passed: h.passed === true,
          passPercent: int(h.passPercent, 60, 0, 100),
          unlockedChapter: int(h.unlockedChapter, 0, 0, 999),
          breakdown: [],
          review: null
        };
        if (Array.isArray(h.breakdown)) {
          h.breakdown.slice(0, 12).forEach(function (b) {
            if (isObj(b)) e.breakdown.push({ label: str(b.label, '', 120), xp: int(b.xp, 0, 0, 100000) });
          });
        }
        if (Array.isArray(h.review)) {
          var rv = [];
          h.review.slice(0, 200).forEach(function (r) {
            if (!isObj(r)) return;
            var c = cleanQuestion(r.q);
            if (c.ok) rv.push({ q: c.q, chosen: LETTERS.indexOf(r.chosen) >= 0 ? r.chosen : '' });
          });
          if (rv.length) e.review = rv;
        }
        if (e.id) d.quizHistory.push(e);
      });
      // सिर्फ़ आख़िरी 5 attempts की review detail रखते हैं (storage बचाने के लिए)
      for (var i = 0; i < d.quizHistory.length - 5; i++) d.quizHistory[i].review = null;
    }

    if (isObj(raw.chapters)) {
      Object.keys(raw.chapters).forEach(function (k) {
        var r = raw.chapters[k];
        if (!/^[a-z0-9_]{1,40}-\d{1,3}$/i.test(k) || !isObj(r)) return;
        d.chapters[k] = {
          attempts: int(r.attempts, 0, 0, 100000),
          bestAccuracy: int(r.bestAccuracy, 0, 0, 100),
          lastAccuracy: int(r.lastAccuracy, 0, 0, 100),
          lastTotal: int(r.lastTotal, 0, 0, 500),
          lastDate: isDateStr(r.lastDate) ? r.lastDate : null,
          completed: r.completed === true,
          firstPassDate: isDateStr(r.firstPassDate) ? r.firstPassDate : null,
          totalCorrect: int(r.totalCorrect, 0, 0, 1e7),
          totalAnswered: int(r.totalAnswered, 0, 0, 1e7),
          completionBonus: r.completionBonus === true,
          passBonus: r.passBonus === true
        };
      });
    }

    if (isObj(raw.mistakes)) {
      Object.keys(raw.mistakes).slice(0, 5000).forEach(function (k) {
        var m = raw.mistakes[k];
        if (!isObj(m)) return;
        var c = cleanQuestion(m);
        if (!c.ok) return;
        var q = c.q;
        q.wrong = LETTERS.indexOf(m.wrong) >= 0 ? m.wrong : '';
        q.count = int(m.count, 1, 1, 100000);
        q.lastDate = isDateStr(m.lastDate) ? m.lastDate : todayStr();
        q.resolved = m.resolved === true;
        d.mistakes[q.id] = q;
      });
    }

    if (isObj(raw.awardedQuestions)) {
      Object.keys(raw.awardedQuestions).slice(0, 50000).forEach(function (k) {
        if (raw.awardedQuestions[k] === true) d.awardedQuestions[k.slice(0, 40)] = true;
      });
    }
    if (isObj(raw.achievements)) {
      Object.keys(raw.achievements).forEach(function (k) {
        if (isDateStr(raw.achievements[k])) d.achievements[k.slice(0, 40)] = raw.achievements[k];
      });
    }
    if (isObj(raw.daily) && isDateStr(raw.daily.date)) {
      d.daily = {
        date: raw.daily.date,
        correct: int(raw.daily.correct, 0, 0, 100000),
        challengeClaimed: raw.daily.challengeClaimed === true,
        goalClaimed: raw.daily.goalClaimed === true,
        replayCount: int(raw.daily.replayCount, 0, 0, 1000),
        gameXp: int(raw.daily.gameXp, 0, 0, 100000)
      };
    }
    if (isObj(raw.stats)) {
      Object.keys(d.stats).forEach(function (k) { d.stats[k] = int(raw.stats[k], 0, 0, 1e9); });
    }
    if (isObj(raw.game)) {
      d.game.plays = int(raw.game.plays, 0, 0, 1e6);
      d.game.wins = int(raw.game.wins, 0, 0, 1e6);
      d.game.bestMoves = raw.game.bestMoves === null || raw.game.bestMoves === undefined ? null : int(raw.game.bestMoves, 0, 1, 10000);
    }
    if (isObj(raw.lastChapter) && typeof raw.lastChapter.subject === 'string') {
      d.lastChapter = { subject: str(raw.lastChapter.subject, '', 40), chapter: int(raw.lastChapter.chapter, 0, 0, 999) };
    }
    d.activeQuiz = allowActive ? cleanActiveQuiz(raw.activeQuiz) : null;
    return d;
  }

  /* ---------- Public API ---------- */
  Storage.todayStr = todayStr;
  Storage.dayDiff = dayDiff;
  Storage.isDateStr = isDateStr;
  Storage.cleanQuestion = cleanQuestion;

  Storage.load = function () {
    var raw = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch (e) {
      Storage.available = false;
    }
    var st = null;
    if (raw) {
      try {
        st = sanitize(JSON.parse(raw), true);
        if (!st) throw new Error('bad data');
      } catch (e) {
        try { window.localStorage.setItem(KEY + '_corrupt_backup', raw); } catch (e2) { /* ignore */ }
        Storage.loadNote = 'corrupt';
        st = null;
      }
    }
    Storage.state = st || defaultState();
    Storage.ensureToday();
    return Storage.state;
  };

  Storage.save = function () {
    if (!Storage.state) return false;
    var tryWrite = function () {
      window.localStorage.setItem(KEY, JSON.stringify(Storage.state));
    };
    try {
      tryWrite();
      return true;
    } catch (e) {
      // जगह कम पड़े तो पुरानी review details हटाकर एक बार और कोशिश
      try {
        Storage.state.quizHistory.forEach(function (h) { h.review = null; });
        tryWrite();
        return true;
      } catch (e2) {
        Storage.available = false;
        if (!Storage.warned) {
          Storage.warned = true;
          if (M.App && M.App.toast) M.App.toast('⚠️ Progress सेव नहीं हो पा रहा। Browser की storage बंद हो सकती है (Private mode?)।', 'warn');
        }
        return false;
      }
    }
  };

  /* नया दिन शुरू होने पर आज के daily counters reset */
  Storage.ensureToday = function () {
    var st = Storage.state;
    if (!st) return;
    if (!st.daily || st.daily.date !== todayStr()) st.daily = newDaily();
  };

  Storage.exportJson = function () {
    var copy = JSON.parse(JSON.stringify(Storage.state));
    copy.activeQuiz = null;
    return JSON.stringify({ app: APP_ID, version: VERSION, exportedAt: new Date().toISOString(), data: copy }, null, 2);
  };

  /* import की हुई file पहले जाँची जाती है; सही हो तभी लागू होती है */
  Storage.validateImport = function (text) {
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'यह सही JSON backup file नहीं है।' }; }
    if (!isObj(parsed) || parsed.app !== APP_ID) return { ok: false, error: 'यह Mission 2027 की backup file नहीं लगती।' };
    if (typeof parsed.version !== 'number' || parsed.version > VERSION) return { ok: false, error: 'यह backup किसी नए version की है, इसे यहाँ नहीं खोल सकते।' };
    var st = sanitize(parsed.data, false);
    if (!st) return { ok: false, error: 'Backup के अंदर का data सही नहीं है।' };
    return { ok: true, state: st };
  };

  Storage.applyImport = function (st) {
    Storage.state = st;
    Storage.ensureToday();
    return Storage.save();
  };

  Storage.reset = function () {
    Storage.state = defaultState();
    Storage.save();
  };

  M.Storage = Storage;
})(window.M27 = window.M27 || {});
