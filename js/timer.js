/* ==========================================================
   timer.js
   काम: पढ़ाई का असली (active) समय गिनना।
   नियम:
   - सिर्फ़ तब गिनता है जब tab सामने खुला हो
   - और तुम सच में screen use कर रहे हो (touch/scroll/click)
   - सिर्फ़ पढ़ाई वाले पेज (subject, chapter, quiz, result, review,
     mistakes, game) पर गिनता है; Home/Settings पर नहीं
   - 90 सेकंड (Quiz में 180 सेकंड) कुछ न करो तो "idle" मानकर रुक जाता है
   ========================================================== */
(function (M) {
  'use strict';

  var Timer = { context: null, idle: false };
  var STUDY_CONTEXTS = { subject: 1, chapter: 1, quiz: 1, result: 1, review: 1, mistakes: 1, game: 1 };
  var lastActivity = Date.now();
  var lastTouchStamp = 0;
  var dirty = false;
  var sinceSave = 0;

  function touch() { lastActivity = Date.now(); }
  function throttledTouch() {
    var now = Date.now();
    if (now - lastTouchStamp > 500) { lastTouchStamp = now; lastActivity = now; }
  }

  Timer.setContext = function (ctx) { Timer.context = ctx || null; touch(); };

  Timer.todaySeconds = function () {
    var st = M.Storage.state;
    return st ? (st.studyByDate[M.Storage.todayStr()] || 0) : 0;
  };

  function isCounting() {
    if (document.hidden) return false;
    if (!STUDY_CONTEXTS[Timer.context]) return false;
    var limit = Timer.context === 'quiz' ? 180 : 90;
    return (Date.now() - lastActivity) / 1000 < limit;
  }

  function updateUi() {
    var qt = document.getElementById('quizTimer');
    if (qt && M.Quiz && M.Quiz.active) {
      qt.textContent = (Timer.idle ? '⏸ ' : '⏱ ') + M.App.fmtTime(M.Quiz.active.elapsed);
    }
    var ts = document.getElementById('todayStudy');
    if (ts) ts.textContent = M.App.fmtStudy(Timer.todaySeconds());
    var tp = document.getElementById('todayStudyPct');
    if (tp) {
      var goal = M.Storage.state.dailyGoalMinutes * 60;
      tp.style.width = Math.min(100, Math.round(Timer.todaySeconds() * 100 / goal)) + '%';
    }
  }

  function flush() {
    if (!dirty || !M.Storage.state) return;
    dirty = false;
    sinceSave = 0;
    M.Progress.touchStreakFromStudy();
    M.Rewards.checkDailyGoal();
    M.Storage.save();
  }
  Timer.flush = flush;

  function tick() {
    var st = M.Storage.state;
    if (!st) return;
    var counting = isCounting();
    Timer.idle = !counting && !document.hidden && !!STUDY_CONTEXTS[Timer.context];
    if (counting) {
      M.Storage.ensureToday();
      var t = M.Storage.todayStr();
      st.totalStudySeconds += 1;
      st.studyByDate[t] = (st.studyByDate[t] || 0) + 1;
      st.lastStudyDate = t;
      if (Timer.context === 'quiz' && M.Quiz && M.Quiz.addElapsed) M.Quiz.addElapsed(1);
      dirty = true;
      sinceSave += 1;
    }
    updateUi();
    if (dirty && sinceSave >= 5) flush();
  }

  Timer.init = function () {
    ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'].forEach(function (ev) {
      window.addEventListener(ev, throttledTouch, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) flush(); else touch();
    });
    window.addEventListener('pagehide', flush);
    setInterval(tick, 1000);
  };

  M.Timer = Timer;
})(window.M27 = window.M27 || {});
