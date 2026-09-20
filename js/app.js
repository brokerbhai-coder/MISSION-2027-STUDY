/* ==========================================================
   app.js
   काम: पूरी website को शुरू करना, Home dashboard, Settings/Backup,
   toast/dialog जैसे छोटे helpers, और सारे बटनों (data-action) का काम।
   ========================================================== */
(function (M) {
  'use strict';

  var App = { actions: {} };
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  App.esc = esc;

  /* ---------- फ़ॉर्मेट helpers ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  App.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  };
  App.fmtStudy = function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    if (sec < 60) return sec + ' सेकंड';
    var m = Math.floor(sec / 60);
    if (m < 60) return m + ' मिनट';
    return Math.floor(m / 60) + ' घंटा ' + (m % 60) + ' मिनट';
  };
  App.fmtDate = function (day) {
    if (!day || !M.Storage.isDateStr(day)) return '—';
    var p = day.split('-');
    return p[2] + '/' + p[1];
  };

  /* ---------- Toast ---------- */
  App.toast = function (msg, type) {
    var host = $('toastHost');
    if (!host) return;
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = msg;
    host.appendChild(t);
    while (host.children.length > 3) host.removeChild(host.firstChild);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 3400);
  };

  /* ---------- Dialog (confirm जैसा, पर सुंदर) ---------- */
  App.dialog = function (o) {
    return new Promise(function (resolve) {
      var host = $('modalHost');
      var prev = document.activeElement;
      var btns = o.buttons || [{ label: 'ठीक है', value: true, cls: 'primary' }];
      var cancel = o.cancelValue === undefined ? null : o.cancelValue;
      host.innerHTML = '<div class="modal-backdrop" id="modalBackdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">' +
        '<h3 id="mTitle">' + esc(o.title) + '</h3><p>' + esc(o.message || '') + '</p>' + (o.html || '') +
        '<div class="modal-actions">' + btns.map(function (b, i) {
          return '<button class="btn ' + esc(b.cls || '') + '" data-mi="' + i + '">' + esc(b.label) + '</button>';
        }).join('') + '</div></div></div>';
      function close(v) {
        host.innerHTML = '';
        document.removeEventListener('keydown', onKey);
        if (prev && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        resolve(v);
      }
      function onKey(e) { if (e.key === 'Escape') close(cancel); }
      host.querySelector('#modalBackdrop').addEventListener('click', function (e) {
        var b = e.target.closest('[data-mi]');
        if (b) close(btns[parseInt(b.dataset.mi, 10)].value);
        else if (e.target.id === 'modalBackdrop') close(cancel);
      });
      document.addEventListener('keydown', onKey);
      var first = host.querySelector('[data-mi]');
      if (first) first.focus();
    });
  };
  App.confirm = function (title, message, okLabel, danger) {
    return App.dialog({
      title: title, message: message,
      buttons: [{ label: 'रद्द', value: false, cls: 'ghost' }, { label: okLabel || 'ठीक है', value: true, cls: danger ? 'danger' : 'primary' }],
      cancelValue: false
    });
  };

  /* ---------- खाली/गलती वाले views ---------- */
  App.notFound = function (msg) {
    return {
      html: '<section class="page"><div class="empty big"><div class="empty-ico">🧭</div><h3>' + esc(msg || 'पेज नहीं मिला') + '</h3>' +
        '<button class="btn" data-action="nav" data-to="/home">Home पर जाओ</button></div></section>',
      title: 'नहीं मिला', back: '/home', tab: 'home', ctx: null
    };
  };
  App.errorView = function (err) {
    if (window.console && console.error) console.error(err);
    return {
      html: '<section class="page"><div class="empty big"><div class="empty-ico">⚠️</div><h3>कुछ गड़बड़ हो गई</h3>' +
        '<p class="muted small">' + esc(err && err.message ? err.message : err) + '</p>' +
        '<button class="btn" data-action="nav" data-to="/home">Home पर जाओ</button></div></section>',
      title: 'Error', back: '/home', tab: 'home', ctx: null
    };
  };

  /* ---------- Header / view लगाना ---------- */
  App.refreshHeader = function () {
    var st = M.Storage.state;
    if (!st) return;
    var x = $('pillXp'), s = $('pillStreak');
    if (x) x.textContent = '⭐ ' + st.xp + ' XP';
    if (s) s.textContent = '🔥 ' + M.Progress.displayStreak();
  };

  App.applyView = function (v, opts) {
    opts = opts || {};
    $('pageTitle').textContent = v.title || 'MISSION 2027';
    $('pageSub').textContent = v.sub || '';
    var back = $('backBtn');
    if (v.backAction) { back.hidden = false; back.dataset.action = v.backAction; back.removeAttribute('data-to'); }
    else if (v.back) { back.hidden = false; back.dataset.action = 'nav'; back.dataset.to = v.back; }
    else { back.hidden = true; }
    var tabs = document.querySelectorAll('#bottomNav [data-tab]');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === v.tab;
      tabs[i].classList.toggle('active', on);
      if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current');
    }
    App.ctx = v.ctx || null;
    M.Timer.setContext(v.ctx);
    $('view').innerHTML = v.html;
    if (!opts.keepScroll) window.scrollTo(0, 0);
    if (v.after) v.after();
    App.refreshHeader();
  };

  App.showLoading = function (msg) {
    $('view').innerHTML = '<div class="loading"><div class="spinner"></div><p>' + esc(msg) + '</p></div>';
  };

  App.showFatal = function (err) {
    var isFile = location.protocol === 'file:';
    $('view').innerHTML = '<section class="page"><div class="empty big"><div class="empty-ico">⚠️</div><h3>Website का data लोड नहीं हो पाया</h3>' +
      '<p class="small">' + esc(err && err.message ? err.message : err) + '</p>' +
      (isFile
        ? '<p>यह website सीधे फ़ोन/कंप्यूटर की फ़ाइल (file://) से नहीं चलती, क्योंकि browser JSON फ़ाइलें पढ़ने नहीं देता। इसे <b>GitHub Pages</b> के लिंक से खोलो।</p>'
        : '<p>Internet जाँचो और पेज दोबारा खोलो। अगर GitHub पर अभी upload किया है तो 1-2 मिनट रुककर refresh करो।</p>') +
      '<button class="btn" data-action="reload">दोबारा कोशिश करो</button></div></section>';
  };

  /* ==========================================================
     HOME DASHBOARD
     ========================================================== */
  function reminderHtml() {
    var st = M.Storage.state;
    var last = st.lastStudyDate;
    if (!last) return '';
    var today = M.Storage.todayStr();
    var diff = M.Storage.dayDiff(today, last);
    var name = esc(st.student.name);
    if (diff >= 2) {
      var when = diff === 2 ? 'कल' : 'पिछले ' + (diff - 1) + ' दिन';
      return '<div class="banner warn">अरे ' + name + ' भाई! ' + when + ' पढ़ाई से छुट्टी मार ली थी क्या? 😄 कोई बात नहीं, आज फिर शुरुआत करते हैं!</div>';
    }
    if (diff === 1 && M.Timer.todaySeconds() < 60) {
      return '<div class="banner info">कल तुमने पढ़ाई की थी 👏 आज भी थोड़ी पढ़ाई करके अपनी streak बचा लो!</div>';
    }
    return '';
  }

  function continueHtml() {
    var info = M.Progress.continueInfo();
    var html = '<h2 class="sec-title">Continue Learning</h2><div class="card continue">';
    if (info.type === 'resume') {
      html += '<p><strong>अधूरा Quiz तुम्हारा इंतज़ार कर रहा है</strong></p><p class="muted">' + esc(info.title) + ' — ' + info.answered + '/' + info.total + ' जवाब दिए</p>' +
        '<div class="btn-row"><button class="btn" data-action="resume-quiz">▶ Quiz जारी रखो</button>' +
        '<button class="btn ghost" data-action="discard-active">रद्द करो</button></div>';
    } else if (info.type === 'chapter' || info.type === 'revise') {
      html += '<p><strong>' + esc(M.Subjects.chapterLabel(info.subject, info.chapter)) + '</strong></p>' +
        '<p class="muted">' + (info.type === 'revise' ? 'सारे Chapters पास कर लिए! Revise करके पकड़ मज़बूत करो।' : 'यहीं से आगे बढ़ो।') + '</p>' +
        '<button class="btn" data-action="nav" data-to="/chapter/' + esc(info.subject) + '/' + info.chapter + '">▶ Chapter खोलो</button>';
    } else {
      html += '<p><strong>अभी कोई Chapter Quiz तैयार नहीं है</strong></p>' +
        '<p class="muted">Physics के Chapters 1–8 जुड़े हुए हैं, बस उनके प्रश्न (PDF से) जोड़ना बाकी है। तब तक Demo Quiz से देख सकते हो कि सब कैसे चलता है।</p>' +
        '<button class="btn" data-action="start-demo">🧪 Demo Quiz खेलो</button>';
    }
    return html + '</div>';
  }

  function viewHome() {
    var st = M.Storage.state;
    M.Storage.ensureToday();
    var name = esc(st.student.name);
    var lv = M.Rewards.levelInfo(st.xp);
    var streak = M.Progress.displayStreak();
    var todaySec = M.Timer.todaySeconds();
    var goalSec = st.dailyGoalMinutes * 60;
    var goalPct = Math.min(100, Math.round(todaySec * 100 / goalSec));
    var ov = M.Progress.overall();
    var isNew = st.quizHistory.length === 0 && st.totalStudySeconds < 60;
    var ch = M.Rewards.challenge();
    var demoCount = M.Chapters.questionCount('demo', 0);
    var html = '<section class="page home">';

    html += '<div class="hero"><div class="hero-text"><h1>नमस्ते, ' + name + '! 👋</h1><p class="tagline">पढ़ाई को बनाओ अपना गेम!</p>' +
      (isNew ? '<p class="hero-msg">चलो ' + name + ', आज अपनी तैयारी शुरू करते हैं!</p>' : '<p class="hero-msg">Level ' + lv.level + ' · ' + esc(lv.title) + '</p>') +
      '</div><div class="hero-level"><div class="ring" style="--p:' + lv.pct + '"><span>Lv ' + lv.level + '</span></div></div></div>';
    html += '<div class="xpbar"><div class="progress"><span style="width:' + lv.pct + '%"></span></div><small>' + lv.into + ' / ' + lv.need + ' XP · अगले Level के लिए ' + lv.toNext + ' XP बाकी</small></div>';

    html += reminderHtml();

    html += '<div class="grid-3">' +
      '<div class="stat"><span class="stat-ico">⭐</span><b>' + st.xp + '</b><small>कुल XP</small></div>' +
      '<div class="stat"><span class="stat-ico">🏆</span><b>Lv ' + lv.level + '</b><small>' + esc(lv.title) + '</small></div>' +
      '<div class="stat"><span class="stat-ico">🔥</span><b>' + streak + '</b><small>दिन की streak</small></div>' +
      '<div class="stat"><span class="stat-ico">🧠</span><b>' + st.quizHistory.length + '</b><small>Quiz पूरे</small></div>' +
      '<div class="stat"><span class="stat-ico">⏱️</span><b id="todayStudy">' + esc(M.App.fmtStudy(todaySec)) + '</b><small>आज की पढ़ाई</small></div>' +
      '<div class="stat"><span class="stat-ico">📈</span><b>' + ov.pct + '%</b><small>तैयारी</small></div></div>';

    html += '<div class="card"><div class="kv"><span>🎯 आज का study goal</span><b>' + st.dailyGoalMinutes + ' मिनट</b></div>' +
      '<div class="progress"><span id="todayStudyPct" style="width:' + goalPct + '%"></span></div>' +
      '<small class="muted">' + (st.daily.goalClaimed ? 'आज का goal पूरा हुआ ✅ (+' + M.Rewards.CONST.GOAL_XP + ' XP मिल चुका)' : 'goal पूरा होने पर +' + M.Rewards.CONST.GOAL_XP + ' XP') + '</small></div>';

    html += '<div class="card"><div class="kv"><span>📚 पूरी तैयारी</span><b>' + ov.done + ' / ' + ov.total + ' Chapter पूरे</b></div>' +
      '<div class="progress"><span style="width:' + ov.pct + '%"></span></div>' +
      '<small class="muted">' + (ov.questions ? ov.questions + ' प्रश्न उपलब्ध हैं' : 'अभी प्रश्न जोड़े जाने बाकी हैं — जुड़ते ही यहाँ progress बढ़ेगा') + '</small></div>';

    html += continueHtml();

    html += '<h2 class="sec-title">विषय चुनो</h2><div class="grid-cards">' +
      M.Subjects.list().map(function (s) { return M.Subjects.cardHtml(s); }).join('') + '</div>';

    html += '<h2 class="sec-title">Daily Challenge</h2><div class="card challenge' + (ch.claimed ? ' done' : '') + '">' +
      '<div class="kv"><span>⚡ आज ' + ch.target + ' सवाल सही करो</span><b>' + ch.done + ' / ' + ch.target + '</b></div>' +
      '<div class="progress"><span style="width:' + Math.round(ch.done * 100 / ch.target) + '%"></span></div>' +
      '<small class="muted">' + (ch.claimed ? 'Challenge पूरा ✅ (+' + ch.xp + ' XP मिला) — कल फिर आना!' : 'पूरा करने पर +' + ch.xp + ' XP (दिन में एक बार)') + '</small>' +
      (ch.claimed ? '' : '<button class="btn small" data-action="go-continue">Quiz खेलो</button>') + '</div>';

    var unlocked = M.Games.unlocked();
    html += '<div class="card game-card' + (unlocked ? '' : ' locked') + '"><div class="kv"><span>🎮 Brain Game — Unit Match</span><b>' + (unlocked ? 'खुला' : '🔒') + '</b></div>' +
      '<p class="muted small">' + (unlocked ? 'राशि और उसका SI मात्रक मिलाओ, थोड़ा XP कमाओ।' : 'एक Quiz पूरा करो, तब यह Game खुलेगा।') + '</p>' +
      '<button class="btn small ' + (unlocked ? '' : 'ghost') + '" data-action="open-game">' + (unlocked ? 'Game खेलो' : 'कैसे खुलेगा?') + '</button></div>';

    html += '<h2 class="sec-title">कमज़ोर Topics</h2>' + M.Progress.weakHtml();

    var ach = M.Rewards.achievements();
    var got = ach.filter(function (a) { return a.date; }).length;
    html += '<h2 class="sec-title">Achievements <small class="muted">' + got + ' / ' + ach.length + '</small></h2><div class="badges">' +
      ach.map(function (a) {
        return '<div class="badge ' + (a.date ? 'on' : 'off') + '"><span class="b-ico">' + (a.date ? a.icon : '🔒') + '</span><b>' + esc(a.title) + '</b><small>' + esc(a.desc) + '</small></div>';
      }).join('') + '</div>';

    html += '<h2 class="sec-title">हाल के Quiz</h2>';
    var recent = M.Progress.recentHistory(5);
    html += recent.length ? M.Progress.historyListHtml(recent) + '<button class="btn ghost block" data-action="nav" data-to="/progress">पूरा Progress देखो</button>' :
      '<div class="empty"><p>अभी कोई Quiz पूरा नहीं हुआ।</p><p class="muted">पहला Quiz पूरा करते ही यहाँ history दिखेगी।</p></div>';

    if (demoCount) {
      html += '<div class="card demo"><strong>🧪 Demo Quiz</strong><p class="muted small">सिर्फ़ यह जाँचने के लिए कि Quiz, XP और Result ठीक चल रहे हैं। इसमें ' + demoCount + ' सामान्य सवाल हैं — ये PDF वाले असली प्रश्न नहीं हैं।</p>' +
        '<button class="btn small ghost" data-action="start-demo">Demo Quiz खेलो</button></div>';
    }
    html += '</section>';
    return { html: html, title: 'MISSION 2027', sub: 'STUDY ZONE', back: null, tab: 'home', ctx: 'home' };
  }

  /* ==========================================================
     SETTINGS
     ========================================================== */
  function dataCheckHtml() {
    var rows = '';
    M.Subjects.list().forEach(function (s) {
      s.chapters.forEach(function (c) {
        var e = M.Chapters.entry(s.id, c.number);
        var label = !c.file ? 'file जुड़ी नहीं' : (e.status === 'ok' ? e.questions.length + ' प्रश्न' : (e.status === 'missing' ? 'file नहीं मिली' : 'गड़बड़: ' + e.error));
        rows += '<li>' + esc(s.nameEn) + ' अध्याय ' + c.number + ': <b>' + esc(label) + '</b>' +
          (e.skipped.length ? ' <span class="chip bad tiny">' + e.skipped.length + ' छोड़े गए</span>' : '') + '</li>';
        e.skipped.forEach(function (x) { rows += '<li class="sub">↳ ' + esc(x) + '</li>'; });
        e.warnings.forEach(function (x) { rows += '<li class="sub">↳ ' + esc(x) + '</li>'; });
      });
    });
    M.Subjects.warnings.forEach(function (w) { rows += '<li>⚠️ ' + esc(w) + '</li>'; });
    return '<details class="card"><summary>🔍 Data Check (प्रश्न कितने जुड़े हैं)</summary><ul class="small datacheck">' + (rows || '<li>कोई chapter जुड़ा नहीं है।</li>') + '</ul></details>';
  }

  function viewSettings() {
    var st = M.Storage.state;
    var html = '<section class="page">';
    html += '<div class="card"><h3 class="card-title">👤 प्रोफ़ाइल</h3><label class="field"><span>नाम</span>' +
      '<input id="nameInput" type="text" maxlength="30" value="' + esc(st.student.name) + '"></label>' +
      '<label class="field"><span>रोज़ का study goal</span><select id="goalSelect">' +
      [30, 45, 60, 90, 120, 180].map(function (m) { return '<option value="' + m + '"' + (m === st.dailyGoalMinutes ? ' selected' : '') + '>' + m + ' मिनट</option>'; }).join('') +
      '</select></label><button class="btn" data-action="save-profile">सेव करो</button></div>';

    html += '<div class="card"><h3 class="card-title">💾 Backup (Export / Import)</h3>' +
      '<p class="muted small">तुम्हारा progress सिर्फ़ इसी phone के इसी browser में सेव है। यह अपने-आप दूसरे फ़ोन/browser में नहीं जाता। इसलिए बीच-बीच में Backup ले लो।</p>' +
      '<div class="btn-stack"><button class="btn" data-action="export-backup">⬇️ Backup file डाउनलोड करो</button>' +
      '<button class="btn ghost" data-action="copy-backup">📋 Backup text कॉपी करो</button></div>' +
      '<textarea id="backupText" class="code-area" readonly hidden></textarea>' +
      '<hr><label class="field"><span>Backup file से वापस लाओ</span><input id="importFile" type="file" accept=".json,application/json"></label>' +
      '<label class="field"><span>या Backup text यहाँ paste करो</span><textarea id="importText" class="code-area" placeholder="{ ... }"></textarea></label>' +
      '<button class="btn ghost" data-action="import-paste">Paste किया text लागू करो</button></div>';

    html += '<div class="card danger-zone"><h3 class="card-title">⚠️ Reset</h3><p class="muted small">सारा progress (XP, Quiz history, गलतियाँ, streak) हमेशा के लिए मिट जाएगा। पहले Backup ले लो।</p>' +
      '<button class="btn danger" data-action="reset-progress">सारा Progress Reset करो</button></div>';

    html += dataCheckHtml();

    html += '<div class="card"><h3 class="card-title">ℹ️ जानकारी</h3><ul class="small info-list">' +
      '<li>Progress <b>localStorage</b> में सेव होता है — सिर्फ़ इसी browser/device पर।</li>' +
      '<li>Browser का data (cache/site data) साफ़ करोगे तो progress भी मिट जाएगा — Backup रखो।</li>' +
      '<li>GitHub Pages से असली notification नहीं भेजी जा सकती। Reminder तभी दिखेगा जब तुम website खोलोगे।</li>' +
      '<li>पढ़ाई का समय सिर्फ़ तब गिना जाता है जब तुम पढ़ाई वाले पेज पर सच में active हो।</li></ul></div>';
    html += '</section>';
    return { html: html, title: 'सेटिंग', back: null, tab: 'settings', ctx: 'settings' };
  }

  /* ==========================================================
     ACTIONS (बटन क्लिक)
     ========================================================== */
  var A = App.actions;
  A.nav = function (el) { M.Router.go(el.getAttribute('data-to')); };
  A.reload = function () { location.reload(); };
  A.locked = function () { M.App.toast('🔒 पहले पिछला Chapter पास करो, तब यह खुलेगा।', 'warn'); };
  A['quick-start'] = function (el) { M.Chapters.startQuiz(el.dataset.subject, parseInt(el.dataset.chapter, 10)); };
  A['start-quiz'] = A['quick-start'];
  A['set-size'] = function (el) {
    M.Storage.state.quizSize = parseInt(el.dataset.size, 10) || 0;
    M.Storage.save();
    M.Router.refresh(true);
  };
  A.answer = function (el) { M.Quiz.answer(el.dataset.opt); };
  A['quiz-prev'] = function () { M.Quiz.go(-1); };
  A['quiz-next'] = function () { M.Quiz.go(1); };
  A['quiz-finish'] = function () { M.Quiz.finish(); };
  A['quiz-leave'] = function () { M.Quiz.leave(); };
  A['quiz-discard'] = function () { M.Quiz.discard(); };
  A['result-retry'] = function (el) { M.Quiz.retryFromResult(el.dataset.id); };
  A['retry-mistakes'] = function (el) {
    M.Mistakes.startRetry({ subject: el.dataset.subject || '', chapter: parseInt(el.dataset.chapter, 10) || 0 });
  };
  A['resume-quiz'] = function () { M.Router.go('/quiz'); };
  A['discard-active'] = function () {
    App.confirm('Quiz रद्द करें?', 'अधूरा Quiz हट जाएगा। इसका कोई XP/score नहीं मिलेगा।', 'हाँ, रद्द करो', true).then(function (yes) {
      if (!yes) return;
      M.Quiz.active = null;
      M.Storage.state.activeQuiz = null;
      M.Storage.save();
      M.Router.refresh(true);
    });
  };
  A['start-demo'] = function () { M.Chapters.startDemo(); };
  A['go-continue'] = function () {
    var info = M.Progress.continueInfo();
    if (info.type === 'resume') M.Router.go('/quiz');
    else if (info.type === 'chapter' || info.type === 'revise') M.Router.go('/chapter/' + info.subject + '/' + info.chapter);
    else { M.App.toast('अभी Chapter Quiz उपलब्ध नहीं है — Demo Quiz खेलकर देखो।', 'info'); }
  };
  A['open-game'] = function () {
    if (M.Games.unlocked()) M.Router.go('/game');
    else M.App.toast('🔒 कम से कम एक Quiz पूरा करो, तब Game खुलेगा।', 'info');
  };
  A['game-flip'] = function (el) { M.Games.flip(parseInt(el.dataset.idx, 10)); };
  A['game-new'] = function () { M.Games.newGame(); };

  A['save-profile'] = function () {
    var st = M.Storage.state;
    var n = ($('nameInput').value || '').trim().slice(0, 30);
    st.student.name = n || 'Ankit';
    st.dailyGoalMinutes = parseInt($('goalSelect').value, 10) || 60;
    M.Storage.save();
    M.App.toast('सेव हो गया ✅', 'success');
    M.Router.refresh(true);
  };

  A['export-backup'] = function () {
    try {
      var blob = new Blob([M.Storage.exportJson()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mission2027-backup-' + M.Storage.todayStr() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      M.App.toast('Backup file डाउनलोड हो रही है 💾', 'success');
    } catch (e) {
      M.App.toast('डाउनलोड नहीं हो पाया। "Backup text कॉपी करो" वाला तरीका आज़माओ।', 'warn');
    }
  };

  A['copy-backup'] = function () {
    var text = M.Storage.exportJson();
    var ta = $('backupText');
    function fallback() {
      ta.hidden = false;
      ta.value = text;
      ta.focus();
      ta.select();
      M.App.toast('नीचे का text लंबा दबाकर "Copy" करो।', 'info');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        M.App.toast('Backup text कॉपी हो गया 📋', 'success');
      }).catch(fallback);
    } else {
      fallback();
    }
  };

  function applyImportText(text) {
    var r = M.Storage.validateImport(text);
    if (!r.ok) { M.App.toast('❌ ' + r.error, 'warn'); return; }
    var s = r.state;
    App.confirm('Backup लागू करें?',
      'इस backup में: ' + s.xp + ' XP, ' + s.quizHistory.length + ' Quiz, ' + Object.keys(s.mistakes).length + ' गलतियाँ। अभी का सारा progress इससे बदल जाएगा।',
      'हाँ, लागू करो', true).then(function (yes) {
      if (!yes) return;
      M.Storage.applyImport(s);
      M.Quiz.restore();
      M.App.toast('Backup वापस आ गया ✅', 'success');
      M.Router.go('/home');
      M.Router.refresh();
    });
  }
  A['import-paste'] = function () {
    var t = $('importText').value.trim();
    if (!t) { M.App.toast('पहले backup text paste करो।', 'info'); return; }
    applyImportText(t);
  };

  A['reset-progress'] = function () {
    App.confirm('सच में सब मिटाना है?', 'XP, Quiz history, गलतियाँ, streak — सब हमेशा के लिए मिट जाएगा। यह वापस नहीं आएगा।', 'हाँ, सब मिटाओ', true).then(function (yes) {
      if (!yes) return;
      M.Storage.reset();
      M.Quiz.restore();
      M.App.toast('Progress Reset हो गया।', 'info');
      M.Router.go('/home');
      M.Router.refresh();
    });
  };

  /* ==========================================================
     START
     ========================================================== */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      var fn = A[el.getAttribute('data-action')];
      if (!fn) return;
      e.preventDefault();
      fn(el, e);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var el = e.target;
      if (el && el.getAttribute && el.getAttribute('role') === 'link' && el.hasAttribute('data-action')) {
        e.preventDefault();
        el.click();
      }
    });
    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'importFile' && e.target.files && e.target.files[0]) {
        var f = e.target.files[0];
        if (f.size > 5 * 1024 * 1024) { M.App.toast('File बहुत बड़ी है।', 'warn'); return; }
        var reader = new FileReader();
        reader.onload = function () { applyImportText(String(reader.result)); e.target.value = ''; };
        reader.onerror = function () { M.App.toast('File पढ़ी नहीं जा सकी।', 'warn'); };
        reader.readAsText(f);
      }
    });
    // अधूरा Quiz हो तो पेज बंद करने से पहले चेतावनी
    window.addEventListener('beforeunload', function (e) {
      if (App.ctx === 'quiz' && M.Quiz.hasUnfinished()) {
        M.Timer.flush();
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  function setupRoutes() {
    var R = M.Router;
    R.add('/home', viewHome);
    R.add('/subjects', M.Subjects.viewList);
    R.add('/subject/:id', M.Subjects.viewSubject);
    R.add('/chapter/:subject/:no', M.Chapters.viewChapter);
    R.add('/quiz', M.Quiz.view);
    R.add('/result/:id', M.Quiz.viewResult);
    R.add('/review/:id', M.Quiz.viewReview);
    R.add('/mistakes', M.Mistakes.view);
    R.add('/progress', M.Progress.viewProgress);
    R.add('/game', M.Games.view);
    R.add('/settings', viewSettings);
  }

  function missedDayToast() {
    var st = M.Storage.state;
    if (!st.lastStudyDate) return;
    var diff = M.Storage.dayDiff(M.Storage.todayStr(), st.lastStudyDate);
    if (diff < 2) return;
    try {
      if (window.sessionStorage.getItem('m27_reminded')) return;
      window.sessionStorage.setItem('m27_reminded', '1');
    } catch (e) { /* ignore */ }
    M.App.toast('अरे ' + st.student.name + ' भाई! पढ़ाई से छुट्टी मार ली थी क्या? 😄 चलो आज फिर शुरू करते हैं!', 'info');
  }

  function init() {
    M.Storage.load();
    if (M.Storage.loadNote === 'corrupt') {
      M.App.toast('पुराना saved data खराब था, इसलिए नया शुरू किया गया (पुराना copy सुरक्षित रखा है)।', 'warn');
    }
    M.Quiz.restore();
    M.Timer.init();
    bindEvents();
    setupRoutes();
    App.refreshHeader();
    App.showLoading('तैयारी हो रही है…');
    M.Subjects.load().then(function () {
      return M.Chapters.preloadAll();
    }).then(function () {
      M.Router.start();
      missedDayToast();
    }).catch(function (err) {
      App.showFatal(err);
    });
  }

  M.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.M27 = window.M27 || {});
