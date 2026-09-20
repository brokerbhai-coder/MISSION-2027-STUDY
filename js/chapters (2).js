/* ==========================================================
   chapters.js
   काम: हर Chapter की JSON file लोड करना, प्रश्नों की जाँच (validation),
   Chapter lock/unlock, Chapter card और Chapter Dashboard।
   ========================================================== */
(function (M) {
  'use strict';

  var Ch = { cache: {} };
  var rawCache = {};
  var DEMO_FILE = 'data/demo/demo-quiz.json';
  function esc(s) { return M.App.esc(s); }
  function key(subject, no) { return subject + '-' + no; }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (res.status === 404) return { __missing: true };
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).catch(function (e) {
      return { __error: String((e && e.message) || e) };
    });
  }

  /* raw JSON को जाँचकर साफ़ प्रश्नों की list बनाता है */
  function process(subject, no, raw, seenIds, label) {
    var entry = { status: 'ok', questions: [], skipped: [], warnings: [], error: '' };
    if (!raw || raw.__missing) { entry.status = 'missing'; return entry; }
    if (raw.__error) { entry.status = 'error'; entry.error = raw.__error; return entry; }
    if (!Array.isArray(raw.questions)) {
      entry.status = 'error';
      entry.error = 'JSON में "questions" की list नहीं मिली';
      return entry;
    }
    raw.questions.forEach(function (q) {
      var r = M.Storage.cleanQuestion(q);
      if (!r.ok) { entry.skipped.push(r.error); return; }
      var qq = r.q;
      if (seenIds[qq.id]) { entry.skipped.push(qq.id + ': यह ID पहले ' + seenIds[qq.id] + ' में आ चुकी है (दोहराई हुई ID)'); return; }
      seenIds[qq.id] = label;
      if ((qq.subject && qq.subject !== subject) || (qq.chapter && qq.chapter !== no)) {
        entry.warnings.push(qq.id + ': subject/chapter file से मेल नहीं खाता — file के हिसाब से माना गया');
      }
      qq.subject = subject;
      qq.chapter = no;
      entry.questions.push(qq);
    });
    return entry;
  }

  /* सारी chapter files एक साथ मँगाकर, फिर config के क्रम में जाँचता है (duplicate ID पकड़ने के लिए) */
  Ch.preloadAll = function () {
    var jobs = [];
    M.Subjects.list().forEach(function (s) {
      s.chapters.forEach(function (c) {
        if (c.file) jobs.push({ subject: s.id, no: c.number, file: c.file, label: s.nameEn + ' अध्याय ' + c.number });
        else Ch.cache[key(s.id, c.number)] = { status: 'nofile', questions: [], skipped: [], warnings: [], error: '' };
      });
    });
    jobs.push({ subject: 'demo', no: 0, file: DEMO_FILE, label: 'Demo Quiz' });
    return Promise.all(jobs.map(function (j) {
      if (!rawCache[j.file]) rawCache[j.file] = fetchJson(j.file);
      return rawCache[j.file];
    })).then(function (raws) {
      var seen = {};
      jobs.forEach(function (j, i) {
        Ch.cache[key(j.subject, j.no)] = process(j.subject, j.no, raws[i], seen, j.label);
      });
    });
  };

  Ch.entry = function (subject, no) {
    return Ch.cache[key(subject, no)] || { status: 'unknown', questions: [], skipped: [], warnings: [], error: '' };
  };
  Ch.questions = function (subject, no) { return Ch.entry(subject, no).questions; };
  Ch.questionCount = function (subject, no) { return Ch.entry(subject, no).questions.length; };

  Ch.nextNumber = function (subject, no) {
    var list = M.Subjects.chapters(subject);
    for (var i = 0; i < list.length; i++) if (list[i].number > no) return list[i].number;
    return 0;
  };

  /* Lock/Unlock: "free" subjects में सब खुले; "sequential" में पिछला chapter पास करना पड़ता है */
  Ch.isUnlocked = function (subjectId, no) {
    var s = M.Subjects.get(subjectId);
    if (!s || s.progression !== 'sequential') return true;
    var list = s.chapters;
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].number === no) idx = i;
    if (idx <= 0) return true;
    var prev = list[idx - 1];
    // पिछले chapter में प्रश्न ही नहीं हैं तो वो रास्ता नहीं रोकता
    if (Ch.questionCount(subjectId, prev.number) === 0) return Ch.isUnlocked(subjectId, prev.number);
    return M.Progress.chapterRecord(subjectId, prev.number).completed;
  };

  Ch.effectiveSize = function (count) {
    var z = M.Storage.state.quizSize;
    return (z > 0 && z < count) ? z : count;
  };

  Ch.startQuiz = function (subject, no) {
    var c = M.Subjects.chapter(subject, no);
    var qs = Ch.questions(subject, no);
    if (!c || !qs.length) { M.App.toast('इस Chapter के प्रश्न अभी जोड़े नहीं गए हैं।', 'info'); return; }
    if (!Ch.isUnlocked(subject, no)) { M.App.toast('🔒 पहले पिछला Chapter पास करो।', 'warn'); return; }
    M.Quiz.start({
      mode: 'chapter', subject: subject, chapter: no,
      title: M.Subjects.chapterLabel(subject, no),
      questions: qs, size: Ch.effectiveSize(qs.length)
    });
  };

  Ch.startDemo = function () {
    var qs = Ch.questions('demo', 0);
    if (!qs.length) { M.App.toast('Demo Quiz की file नहीं मिली।', 'warn'); return; }
    M.Quiz.start({ mode: 'demo', subject: 'demo', chapter: 0, title: 'Demo Quiz', questions: qs, size: 0 });
  };

  /* Chapter की स्थिति (card पर chip के लिए) */
  Ch.status = function (subject, c) {
    var count = Ch.questionCount(subject, c.number);
    var entry = Ch.entry(subject, c.number);
    if (entry.status === 'error') return { key: 'error', label: 'डेटा लोड नहीं हुआ' };
    if (!c.file || count === 0) return { key: 'soon', label: 'Content Coming Soon' };
    if (!Ch.isUnlocked(subject, c.number)) return { key: 'locked', label: '🔒 बंद' };
    var r = M.Progress.chapterRecord(subject, c.number);
    if (r.completed) return { key: 'done', label: 'पूरा ✅' };
    if (r.attempts > 0) return { key: 'progress', label: 'जारी' };
    return { key: 'new', label: 'नया' };
  };

  /* ---------- Chapter card ---------- */
  Ch.cardHtml = function (subjectId, c) {
    var count = Ch.questionCount(subjectId, c.number);
    var st = Ch.status(subjectId, c);
    var r = M.Progress.chapterRecord(subjectId, c.number);
    var to = '/chapter/' + subjectId + '/' + c.number;
    var locked = st.key === 'locked';
    var html = '<article class="chapter-card st-' + st.key + '" role="link" tabindex="0" data-action="' + (locked ? 'locked' : 'nav') + '" data-to="' + esc(to) + '">' +
      '<div class="cc-head"><span class="cc-no">' + c.number + '</span>' +
      '<div class="cc-title"><strong>' + esc(c.title) + '</strong>' +
      '<span class="cc-chips">' +
      (c.notesReady ? '<span class="chip tiny">📄 नोट्स तैयार</span>' : '') +
      '<span class="chip tiny">' + (count ? count + ' प्रश्न' : 'प्रश्न: 0') + '</span>' +
      '<span class="chip tiny st-' + st.key + '">' + esc(st.label) + '</span></span></div></div>' +
      '<div class="cc-stats"><span>Quiz पूरे: <b>' + r.attempts + '</b></span>' +
      '<span>Accuracy: <b>' + (r.attempts ? r.lastAccuracy + '%' : '—') + '</b></span></div>';
    if (locked) {
      html += '<p class="muted small">पिछला Chapter ' + M.Subjects.passPercent(subjectId) + '%+ से पास करो।</p>';
    } else if (count > 0) {
      html += '<button class="btn small" data-action="quick-start" data-subject="' + esc(subjectId) + '" data-chapter="' + c.number + '">' +
        (r.attempts ? 'Continue — Quiz दो' : 'Start Quiz') + '</button>';
    } else {
      html += '<p class="muted small">' + (st.key === 'error' ? esc(Ch.entry(subjectId, c.number).error) : 'इस Chapter के प्रश्न अभी जोड़े नहीं गए हैं।') + '</p>';
    }
    return html + '</article>';
  };

  /* ---------- Chapter Dashboard ---------- */
  Ch.viewChapter = function (p) {
    var no = parseInt(p.no, 10);
    var s = M.Subjects.get(p.subject);
    var c = s && M.Subjects.chapter(p.subject, no);
    if (!c) return M.App.notFound('यह Chapter नहीं मिला।');
    var st = M.Storage.state;
    var entry = Ch.entry(p.subject, no);
    var count = entry.questions.length;
    var r = M.Progress.chapterRecord(p.subject, no);
    var stat = Ch.status(p.subject, c);
    var open = M.Mistakes.unresolvedCount(p.subject, no);
    var html = '<section class="page">';

    html += '<div class="card hero-sub" style="--accent:' + esc(s.color) + '"><div class="hs-top"><span class="cc-no big">' + no + '</span>' +
      '<div><h2>' + esc(c.title) + '</h2><p class="muted">' + esc(s.nameHi) + ' · ' + esc(s.nameEn) + '</p></div></div>' +
      '<div class="cc-chips"><span class="chip st-' + stat.key + '">' + esc(stat.label) + '</span>' +
      (c.notesReady ? '<span class="chip">📄 नोट्स तैयार</span>' : '') + '</div></div>';

    if (stat.key === 'locked') {
      html += '<div class="empty big"><div class="empty-ico">🔒</div><h3>यह Chapter अभी बंद है</h3>' +
        '<p>पिछला Chapter ' + M.Subjects.passPercent(p.subject) + '% या उससे ज़्यादा स्कोर से पास करो, तब यह खुलेगा।</p>' +
        '<button class="btn" data-action="nav" data-to="/subject/' + esc(p.subject) + '">Chapters देखो</button></div></section>';
      return { html: html, title: 'अध्याय ' + no, back: '/subject/' + p.subject, tab: 'subjects', ctx: 'chapter' };
    }

    html += '<div class="grid-2">' +
      '<div class="stat"><span class="stat-ico">❓</span><b>' + count + '</b><small>प्रश्न उपलब्ध</small></div>' +
      '<div class="stat"><span class="stat-ico">🧠</span><b>' + r.attempts + '</b><small>Quiz पूरे</small></div>' +
      '<div class="stat"><span class="stat-ico">📈</span><b>' + (r.attempts ? r.lastAccuracy + '%' : '—') + '</b><small>अंतिम स्कोर</small></div>' +
      '<div class="stat"><span class="stat-ico">🏅</span><b>' + (r.attempts ? r.bestAccuracy + '%' : '—') + '</b><small>सर्वश्रेष्ठ</small></div>' +
      '</div>';

    if (entry.status === 'error') {
      html += '<div class="banner bad">इस Chapter का data लोड नहीं हो पाया: ' + esc(entry.error) + '</div>';
    }

    if (count === 0) {
      html += '<div class="empty big"><div class="empty-ico">🚧</div><h3>Content Coming Soon</h3>' +
        '<p>इस Chapter के प्रश्न अभी जोड़े नहीं गए हैं।</p>' +
        '<p class="muted small">प्रश्न जोड़ने के लिए ' + (c.file ? '<code>' + esc(c.file) + '</code>' : 'data/subjects.json में इस chapter की file') + ' में questions डालो (README देखो)।</p></div>';
    } else {
      var sizes = [];
      [10, 20].forEach(function (n) { if (n < count) sizes.push(n); });
      sizes.push(0);
      var eff = Ch.effectiveSize(count);
      html += '<div class="card"><h3 class="card-title">Quiz शुरू करो</h3><div class="chips">' +
        sizes.map(function (n) {
          var val = n === 0 ? count : n;
          return '<button class="chip-btn' + (eff === val ? ' on' : '') + '" data-action="set-size" data-size="' + n + '">' + (n === 0 ? 'सभी ' + count : n) + ' प्रश्न</button>';
        }).join('') + '</div>' +
        '<button class="btn block" data-action="start-quiz" data-subject="' + esc(p.subject) + '" data-chapter="' + no + '">' + (r.attempts ? '🔁 फिर से Quiz दो' : '▶ Start Quiz') + '</button>' +
        '<p class="muted small">पास होने के लिए ' + M.Subjects.passPercent(p.subject) + '% चाहिए।</p></div>';
    }

    html += '<div class="btn-row wrap">' +
      '<button class="btn ghost" data-action="nav" data-to="' + esc('/mistakes?subject=' + p.subject + '&chapter=' + no) + '">📒 Review Mistakes' + (open ? ' (' + open + ')' : '') + '</button>' +
      (c.notesUrl ? '<a class="btn ghost" href="' + esc(c.notesUrl) + '" target="_blank" rel="noopener">📄 Notes खोलो</a>' : '') + '</div>';

    if (r.attempts > 0) {
      var pass = M.Subjects.passPercent(p.subject);
      html += '<div class="card advice"><strong>तुम्हारे लिए सलाह</strong><p>' + esc(M.Progress.advice(r.lastAccuracy, open, pass)) + '</p></div>';
      var hist = st.quizHistory.filter(function (h) { return h.mode === 'chapter' && h.subject === p.subject && h.chapter === no; }).slice(-3).reverse();
      html += '<h2 class="sec-title">पिछले Quiz</h2>' + M.Progress.historyListHtml(hist);
    }

    if (entry.skipped.length || entry.warnings.length) {
      html += '<details class="card"><summary>⚠️ Data check: ' + (entry.skipped.length + entry.warnings.length) + ' सूचना</summary><ul class="small">' +
        entry.skipped.map(function (x) { return '<li>छोड़ा गया: ' + esc(x) + '</li>'; }).join('') +
        entry.warnings.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
    }
    html += '</section>';
    return { html: html, title: 'अध्याय ' + no, sub: c.title, back: '/subject/' + p.subject, tab: 'subjects', ctx: 'chapter' };
  };

  M.Chapters = Ch;
})(window.M27 = window.M27 || {});
