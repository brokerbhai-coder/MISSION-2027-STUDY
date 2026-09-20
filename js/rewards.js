/* ==========================================================
   rewards.js
   काम: XP, Level, Achievements, Daily Challenge, Daily Goal reward।
   सारे reward असली activity से ही मिलते हैं।

   XP के नियम (बदलना हो तो नीचे की संख्याएँ बदल दो):
   - नया सही उत्तर: हर प्रश्न पर 10 XP  (एक प्रश्न का XP सिर्फ़ पहली बार सही करने पर)
   - पहली बार chapter Quiz पूरा: +20 XP
   - पहली बार पास (60%+): +50 XP
   - Replay bonus: 5 XP, दिन में सिर्फ़ 3 बार
   - Daily Challenge (10 सही उत्तर): +20 XP, दिन में एक बार
   - Daily study goal पूरा: +15 XP, दिन में एक बार
   - Game जीत: आसान 5 / मध्यम 8 / कठिन 10 XP, दिन में ज़्यादा से ज़्यादा 10 XP

   LEVEL का नियम (धीमा और बढ़ता हुआ):
   - कुल 50 Level हैं। Level 50 तब मिलता है जब XP_FOR_MAX_LEVEL XP हो जाए।
   - XP_FOR_MAX_LEVEL = पूरे syllabus का लगभग 95% XP।
     हिसाब: हर Chapter का XP ≈ (प्रश्न × 10) + 70।  जैसे 50 Chapter × 28 प्रश्न ≈ 17,500 XP → 95% ≈ 16,600।
     Maths / Biology / English के Chapters जुड़ने पर नीचे की संख्या बढ़ा दो।
   - जैसे-जैसे Level बढ़ता है, अगले Level के लिए XP थोड़ा-थोड़ा ज़्यादा लगता है (CURVE से तय)।
   ========================================================== */
(function (M) {
  'use strict';

  var R = {};
  var XP_CORRECT = 10;
  var XP_FIRST_COMPLETE = 20;
  var XP_FIRST_PASS = 50;
  var XP_REPLAY = 5;
  var REPLAY_DAILY_CAP = 3;
  var CHALLENGE_TARGET = 10;
  var CHALLENGE_XP = 20;
  var GOAL_XP = 15;
  var GAME_XP = 10;          // सबसे कठिन Game की जीत का XP (Games.js में आसान 5, मध्यम 8)
  var GAME_DAILY_CAP = 10;

  R.CONST = { CHALLENGE_TARGET: CHALLENGE_TARGET, CHALLENGE_XP: CHALLENGE_XP, GOAL_XP: GOAL_XP, GAME_XP: GAME_XP, GAME_DAILY_CAP: GAME_DAILY_CAP, REPLAY_DAILY_CAP: REPLAY_DAILY_CAP };

  /* ---------- Level ---------- */
  var MAX_LEVEL = 50;
  var XP_FOR_MAX_LEVEL = 16500;   // ← Level 50 के लिए कुल XP (ऊपर हिसाब देखो)
  var CURVE = 1.2;                // 1 = हर Level बराबर XP, ज़्यादा = ऊपर के Level और महँगे

  // (कम से कम Level, नाम)
  var TITLE_STEPS = [
    [1, 'नया खिलाड़ी'], [2, 'जिज्ञासु'], [6, 'मेहनती'], [13, 'तेज़ दिमाग़'],
    [23, 'बोर्ड वॉरियर'], [34, 'टॉपर'], [45, 'लीजेंड']
  ];

  // THRESH[i] = Level (i+1) पर पहुँचने के लिए कुल XP
  var THRESH = [];
  (function () {
    for (var i = 0; i < MAX_LEVEL; i++) {
      THRESH.push(Math.round(XP_FOR_MAX_LEVEL * Math.pow(i / (MAX_LEVEL - 1), CURVE) / 10) * 10);
    }
  })();

  function levelOf(xp) {
    var lv = 1;
    for (var i = 1; i < THRESH.length; i++) { if (xp >= THRESH[i]) lv = i + 1; else break; }
    return lv;
  }

  function titleOf(lv) {
    var t = TITLE_STEPS[0][1];
    TITLE_STEPS.forEach(function (s) { if (lv >= s[0]) t = s[1]; });
    return t;
  }

  R.levelInfo = function (xp) {
    var lv = levelOf(xp);
    var cur = THRESH[lv - 1];
    if (lv >= MAX_LEVEL) {
      var extra = Math.max(1, xp - cur);
      return { level: lv, title: titleOf(lv), into: extra, need: extra, pct: 100, toNext: 0, max: true };
    }
    var next = THRESH[lv];
    return {
      level: lv,
      title: titleOf(lv),
      into: xp - cur,
      need: next - cur,
      pct: Math.round((xp - cur) * 100 / (next - cur)),
      toNext: next - xp,
      max: false
    };
  };

  R.addXp = function (n) {
    if (!n || n < 0) return;
    var st = M.Storage.state;
    var before = levelOf(st.xp);
    st.xp += n;
    var after = levelOf(st.xp);
    if (after > before) {
      M.App.toast('🎉 Level ' + after + ' — ' + R.levelInfo(st.xp).title + '!', 'success');
    }
    if (M.App.refreshHeader) M.App.refreshHeader();
  };

  /* ---------- Quiz XP ---------- */
  R.awardQuiz = function (ctx) {
    var st = M.Storage.state;
    M.Storage.ensureToday();
    var items = [];
    var total = 0;
    var correct = 0, fresh = 0;
    ctx.questions.forEach(function (q, i) {
      var a = ctx.answers[i];
      if (a && a.correct) {
        correct += 1;
        if (!st.awardedQuestions[q.id]) { st.awardedQuestions[q.id] = true; fresh += 1; }
      }
    });
    if (fresh > 0) items.push({ label: 'नए सही उत्तर × ' + fresh, xp: fresh * XP_CORRECT });
    if (correct - fresh > 0) items.push({ label: 'पहले सही किए प्रश्न × ' + (correct - fresh) + ' (दोबारा XP नहीं)', xp: 0 });

    var bonusGiven = false;
    if (ctx.mode !== 'retry') {
      if (ctx.firstCompletion) { items.push({ label: 'पहली बार Quiz पूरा किया', xp: XP_FIRST_COMPLETE }); bonusGiven = true; }
      if (ctx.firstPass) { items.push({ label: 'पहली बार पास हुए 🎯', xp: XP_FIRST_PASS }); bonusGiven = true; }
    }
    if (!bonusGiven) {
      if (st.daily.replayCount < REPLAY_DAILY_CAP) {
        st.daily.replayCount += 1;
        items.push({ label: 'Replay bonus (आज ' + st.daily.replayCount + '/' + REPLAY_DAILY_CAP + ')', xp: XP_REPLAY });
      } else {
        items.push({ label: 'आज का Replay bonus पूरा हो चुका', xp: 0 });
      }
    }
    items.forEach(function (it) { total += it.xp; });
    R.addXp(total);
    return { total: total, items: items };
  };

  /* ---------- Daily Challenge ---------- */
  R.challenge = function () {
    M.Storage.ensureToday();
    var d = M.Storage.state.daily;
    return { target: CHALLENGE_TARGET, done: Math.min(d.correct, CHALLENGE_TARGET), claimed: d.challengeClaimed, xp: CHALLENGE_XP };
  };

  R.updateChallenge = function (correctCount) {
    var st = M.Storage.state;
    M.Storage.ensureToday();
    st.daily.correct += correctCount;
    if (!st.daily.challengeClaimed && st.daily.correct >= CHALLENGE_TARGET) {
      st.daily.challengeClaimed = true;
      st.stats.challengeDays += 1;
      R.addXp(CHALLENGE_XP);
      M.App.toast('🔥 Daily Challenge पूरा! +' + CHALLENGE_XP + ' XP', 'success');
    }
  };

  /* ---------- Daily study goal ---------- */
  R.checkDailyGoal = function () {
    var st = M.Storage.state;
    M.Storage.ensureToday();
    if (st.daily.goalClaimed) return;
    if (M.Timer.todaySeconds() >= st.dailyGoalMinutes * 60) {
      st.daily.goalClaimed = true;
      st.stats.goalDays += 1;
      R.addXp(GOAL_XP);
      M.App.toast('🎯 आज का study goal पूरा! +' + GOAL_XP + ' XP', 'success');
      R.checkAchievements();
    }
  };

  /* ---------- Game XP (सीमित) ---------- */
  R.awardGame = function (amount) {
    var st = M.Storage.state;
    M.Storage.ensureToday();
    var want = (typeof amount === 'number' && amount > 0) ? Math.floor(amount) : GAME_XP;
    var left = GAME_DAILY_CAP - st.daily.gameXp;
    if (left <= 0) return 0;
    var give = Math.min(want, left);
    st.daily.gameXp += give;
    R.addXp(give);
    return give;
  };

  /* ---------- Achievements ---------- */
  function hasChapterPass(s) {
    return Object.keys(s.chapters).some(function (k) { return k.indexOf('demo-') !== 0 && s.chapters[k].completed; });
  }
  function countHistory(s, fn) { return s.quizHistory.filter(fn).length; }

  var LIST = [
    { id: 'first_quiz', icon: '🚀', title: 'पहला कदम', desc: 'पहला Quiz पूरा करो', test: function (s) { return s.quizHistory.length >= 1; } },
    { id: 'quizzes_5', icon: '📘', title: 'पाँच का पंजा', desc: '5 Quiz पूरे करो', test: function (s) { return s.quizHistory.length >= 5; } },
    { id: 'quizzes_20', icon: '📚', title: 'Quiz मशीन', desc: '20 Quiz पूरे करो', test: function (s) { return s.quizHistory.length >= 20; } },
    { id: 'perfect', icon: '💯', title: 'परफ़ेक्ट स्कोर', desc: '5+ प्रश्नों के Quiz में 100% लाओ', test: function (s) { return countHistory(s, function (h) { return h.accuracy === 100 && h.total >= 5; }) >= 1; } },
    { id: 'chapter_pass', icon: '✅', title: 'Chapter फ़तह', desc: 'कोई असली Chapter पास करो', test: hasChapterPass },
    { id: 'streak_3', icon: '🔥', title: '3 दिन की आग', desc: '3 दिन लगातार पढ़ो', test: function (s) { return s.streak.best >= 3; } },
    { id: 'streak_7', icon: '🌋', title: '7 दिन का तूफ़ान', desc: '7 दिन लगातार पढ़ो', test: function (s) { return s.streak.best >= 7; } },
    { id: 'xp_100', icon: '⭐', title: '100 XP क्लब', desc: 'कुल 100 XP कमाओ', test: function (s) { return s.xp >= 100; } },
    { id: 'xp_500', icon: '🌟', title: '500 XP क्लब', desc: 'कुल 500 XP कमाओ', test: function (s) { return s.xp >= 500; } },
    { id: 'study_hour', icon: '⏳', title: 'एक घंटा', desc: 'कुल 1 घंटा active पढ़ाई करो', test: function (s) { return s.totalStudySeconds >= 3600; } },
    { id: 'goal_day', icon: '🎯', title: 'Goal पूरा', desc: 'किसी दिन Daily study goal पूरा करो', test: function (s) { return s.stats.goalDays >= 1; } },
    { id: 'challenge_day', icon: '⚡', title: 'Challenge जीता', desc: 'Daily Challenge पूरा करो', test: function (s) { return s.stats.challengeDays >= 1; } },
    { id: 'fixer_5', icon: '🛠️', title: 'गलती सुधारक', desc: '5 गलतियाँ सुधारो', test: function (s) { return s.stats.mistakesFixed >= 5; } },
    { id: 'game_first', icon: '🎮', title: 'Brain Gamer', desc: 'Brain Game एक बार खेलो', test: function (s) { return s.game.plays >= 1; } },
    { id: 'game_hard', icon: '🧩', title: 'कठिन Game विजेता', desc: 'Brain Game का कठिन स्तर जीतो', test: function (s) { return Object.keys(s.game.best || {}).some(function (k) { return /-hard$/.test(k); }); } },
    { id: 'game_wins_10', icon: '🕹️', title: 'Game का उस्ताद', desc: 'Brain Game 10 बार जीतो', test: function (s) { return s.game.wins >= 10; } }
  ];

  R.achievements = function () {
    var st = M.Storage.state;
    return LIST.map(function (a) {
      return { id: a.id, icon: a.icon, title: a.title, desc: a.desc, date: st.achievements[a.id] || null };
    });
  };

  R.checkAchievements = function () {
    var st = M.Storage.state;
    var today = M.Storage.todayStr();
    var fresh = [];
    LIST.forEach(function (a) {
      if (!st.achievements[a.id] && a.test(st)) {
        st.achievements[a.id] = today;
        fresh.push(a);
      }
    });
    fresh.forEach(function (a) { M.App.toast('🏆 Achievement: ' + a.title, 'success'); });
    return fresh;
  };

  M.Rewards = R;
})(window.M27 = window.M27 || {});
