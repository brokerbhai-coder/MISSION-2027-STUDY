/* ==========================================================
   subjects.js
   काम: data/subjects.json पढ़ना, विषयों की list और Subject Dashboard दिखाना।
   नया Chapter/Subject जोड़ना हो तो data/subjects.json बदलो (README देखो)।
   ========================================================== */
(function (M) {
  'use strict';

  var Sub = { config: null, warnings: [] };
  function esc(s) { return M.App.esc(s); }

  /* ---------- Config load ---------- */
  Sub.load = function () {
    return fetch('data/subjects.json', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('data/subjects.json नहीं मिली (HTTP ' + res.status + ')');
      return res.json();
    }).then(function (cfg) {
      if (!cfg || !Array.isArray(cfg.subjects)) throw new Error('subjects.json में "subjects" list नहीं मिली');
      var settings = cfg.settings || {};
      var out = { settings: { passPercent: Number(settings.passPercent) || 70 }, subjects: [] };
      var seen = {};
      cfg.subjects.forEach(function (s) {
        if (!s || typeof s.id !== 'string' || !s.id || seen[s.id] || s.id === 'demo' || s.id === 'mixed') {
          Sub.warnings.push('एक subject छोड़ा गया (id गलत या दोहराई हुई है)');
          return;
        }
        seen[s.id] = true;
        var chapters = [];
        var nums = {};
        (Array.isArray(s.chapters) ? s.chapters : []).forEach(function (c) {
          var n = parseInt(c && c.number, 10);
          if (!c || !n || n < 1 || nums[n] || typeof c.title !== 'string') {
            Sub.warnings.push(s.id + ': एक chapter छोड़ा गया (number/title गलत या दोहराया हुआ)');
            return;
          }
          nums[n] = true;
          chapters.push({
            number: n,
            title: c.title,
            file: typeof c.file === 'string' && c.file ? c.file : null,
            notesReady: c.notesReady === true,
            notesUrl: typeof c.notesUrl === 'string' && c.notesUrl ? c.notesUrl : null
          });
        });
        chapters.sort(function (a, b) { return a.number - b.number; });
        out.subjects.push({
          id: s.id,
          nameHi: String(s.nameHi || s.id),
          nameEn: String(s.nameEn || ''),
          icon: String(s.icon || '📘'),
          color: /^#[0-9a-f]{3,8}$/i.test(s.color || '') ? s.color : '#4f8cff',
          status: s.status === 'available' ? 'available' : 'coming_soon',
          progression: s.progression === 'sequential' ? 'sequential' : 'free',
          passPercent: Number(s.passPercent) || 0,
          futureChapters: (s.futureChapters && s.futureChapters.from && s.futureChapters.to) ? { from: +s.futureChapters.from, to: +s.futureChapters.to } : null,
          chapters: chapters
        });
      });
      Sub.config = out;
    });
  };

  /* ---------- Lookup helpers ---------- */
  Sub.list = function () { return Sub.config ? Sub.config.subjects : []; };
  Sub.get = function (id) {
    var l = Sub.list();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  Sub.chapters = function (id) { var s = Sub.get(id); return s ? s.chapters : []; };
  Sub.chapter = function (id, no) {
    var l = Sub.chapters(id);
    for (var i = 0; i < l.length; i++) if (l[i].number === no) return l[i];
    return null;
  };
  Sub.passPercent = function (id) {
    var s = Sub.get(id);
    return (s && s.passPercent) || (Sub.config && Sub.config.settings.passPercent) || 70;
  };
  Sub.subjectName = function (id) {
    if (id === 'demo') return 'डेमो';
    if (id === 'mixed') return 'सभी विषय';
    var s = Sub.get(id);
    return s ? s.nameHi : id;
  };
  Sub.chapterLabel = function (id, no) {
    if (id === 'demo') return 'Demo Quiz';
    if (id === 'mixed') return 'मिश्रित गलतियाँ';
    var s = Sub.get(id);
    var c = s && Sub.chapter(id, no);
    if (!s) return id + ' अध्याय ' + no;
    return (s.nameEn || s.nameHi) + ' अध्याय ' + no + (c ? ' – ' + c.title : '');
  };

  /* आगे कौन-सा chapter पढ़ना चाहिए (Continue Learning के लिए) */
  Sub.continueTarget = function (id, incompleteOnly) {
    var list = Sub.chapters(id);
    var lc = M.Storage.state.lastChapter;
    function ok(c) {
      if (M.Chapters.questionCount(id, c.number) < 1) return false;
      if (!M.Chapters.isUnlocked(id, c.number)) return false;
      if (incompleteOnly && M.Progress.chapterRecord(id, c.number).completed) return false;
      return true;
    }
    if (lc && lc.subject === id) {
      var lcc = Sub.chapter(id, lc.chapter);
      if (lcc && ok(lcc)) return lcc.number;
    }
    for (var i = 0; i < list.length; i++) if (ok(list[i])) return list[i].number;
    return null;
  };

  Sub.summary = function (id) {
    var chapters = Sub.chapters(id);
    var trackable = chapters.filter(function (c) { return c.file; }).length;
    var questions = 0;
    chapters.forEach(function (c) { questions += M.Chapters.questionCount(id, c.number); });
    var ss = M.Progress.subjectStats(id);
    return { chapters: chapters.length, trackable: trackable, questions: questions, completed: ss.completed, quizzes: ss.quizzes, accuracy: ss.accuracy };
  };

  /* ---------- Subject card (Home और Subjects पेज दोनों में) ---------- */
  Sub.cardHtml = function (s) {
    var sm = Sub.summary(s.id);
    var pct = sm.trackable ? Math.round(sm.completed * 100 / sm.trackable) : 0;
    var avail = s.status === 'available';
    return '<button class="subject-card" style="--accent:' + esc(s.color) + '" data-action="nav" data-to="/subject/' + esc(s.id) + '">' +
      '<span class="sc-top"><span class="sc-ico">' + esc(s.icon) + '</span>' +
      '<span class="sc-name"><strong>' + esc(s.nameHi) + '</strong><small>' + esc(s.nameEn) + '</small></span></span>' +
      '<span class="chip ' + (avail ? 'ok' : 'soon') + '">' + (avail ? 'उपलब्ध' : 'जल्द आ रहा है') + '</span>' +
      '<span class="progress"><span style="width:' + pct + '%"></span></span>' +
      '<span class="sc-meta">' + (sm.chapters ? sm.chapters + ' अध्याय · ' + sm.completed + ' पूरे' : 'Content Coming Soon') +
      (sm.chapters ? ' · ' + sm.questions + ' प्रश्न' : '') + '</span></button>';
  };

  /* ---------- Subjects list पेज ---------- */
  Sub.viewList = function () {
    var html = '<section class="page"><p class="muted">अपना विषय चुनो और Chapter के हिसाब से तैयारी शुरू करो।</p><div class="grid-cards">';
    Sub.list().forEach(function (s) { html += Sub.cardHtml(s); });
    html += '</div></section>';
    return { html: html, title: 'सभी विषय', back: null, tab: 'subjects', ctx: 'subject' };
  };

  /* ---------- Subject Dashboard ---------- */
  Sub.viewSubject = function (p) {
    var s = Sub.get(p.id);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    var sm = Sub.summary(s.id);
    var pct = sm.trackable ? Math.round(sm.completed * 100 / sm.trackable) : 0;
    var avail = s.status === 'available';
    var target = Sub.continueTarget(s.id, true) || Sub.continueTarget(s.id, false);
    var html = '<section class="page">';
    html += '<div class="card hero-sub" style="--accent:' + esc(s.color) + '">' +
      '<div class="hs-top"><span class="sc-ico big">' + esc(s.icon) + '</span><div><h2>' + esc(s.nameHi) + '</h2><p class="muted">' + esc(s.nameEn) + ' · Bihar Board Class 12</p></div>' +
      '<span class="chip ' + (avail ? 'ok' : 'soon') + '">' + (avail ? 'उपलब्ध' : 'जल्द आ रहा है') + '</span></div>' +
      '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
      '<p class="muted small">' + (sm.trackable ? sm.completed + ' / ' + sm.trackable + ' Chapter पूरे (' + pct + '%)' : 'अभी कोई Chapter जोड़ा नहीं गया') + '</p></div>';

    html += '<div class="grid-2">' +
      '<div class="stat"><span class="stat-ico">📖</span><b>' + sm.chapters + '</b><small>Chapters</small></div>' +
      '<div class="stat"><span class="stat-ico">❓</span><b>' + sm.questions + '</b><small>प्रश्न उपलब्ध</small></div>' +
      '<div class="stat"><span class="stat-ico">🧠</span><b>' + sm.quizzes + '</b><small>Quiz पूरे</small></div>' +
      '<div class="stat"><span class="stat-ico">🎯</span><b>' + (sm.accuracy === null ? '—' : sm.accuracy + '%') + '</b><small>Accuracy</small></div>' +
      '</div>';

    if (target) {
      html += '<button class="btn block" data-action="nav" data-to="/chapter/' + esc(s.id) + '/' + target + '">▶ Continue Learning — अध्याय ' + target + '</button>';
    } else {
      html += '<button class="btn block" disabled>▶ Continue Learning (प्रश्न जुड़ने के बाद शुरू होगा)</button>';
    }

    html += '<h2 class="sec-title">Chapters</h2>';
    if (!s.chapters.length) {
      html += '<div class="empty big"><div class="empty-ico">🚧</div><h3>Content Coming Soon</h3>' +
        '<p>इस विषय के Chapters और प्रश्न अभी जोड़े नहीं गए हैं।</p></div>';
    } else {
      html += '<div class="chapter-list">';
      s.chapters.forEach(function (c) { html += M.Chapters.cardHtml(s.id, c); });
      html += '</div>';
    }
    if (s.futureChapters) {
      html += '<div class="card soon-card"><strong>अध्याय ' + s.futureChapters.from + ' – ' + s.futureChapters.to + '</strong>' +
        '<p class="muted">Content Coming Soon — इन्हें बाद में data/subjects.json में जोड़ा जाएगा।</p></div>';
    }
    if (s.progression === 'sequential') {
      html += '<p class="muted small">🔒 इस विषय में अगला Chapter तब खुलेगा जब पिछला Chapter ' + Sub.passPercent(s.id) + '% या ज़्यादा से पास करो।</p>';
    } else {
      html += '<p class="muted small">✅ इस विषय के सभी Chapters किसी भी क्रम में पढ़ सकते हो।</p>';
    }
    html += '</section>';
    return { html: html, title: s.nameHi, sub: s.nameEn, back: '/subjects', tab: 'subjects', ctx: 'subject' };
  };

  M.Subjects = Sub;
})(window.M27 = window.M27 || {});
