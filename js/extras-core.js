/* ==========================================================
   extras-core.js  (नया)
   काम: नए sections (Notes, PYQ, Mixed Practice) की साझा चीज़ें —
   - manifest (index) फ़ाइलें पढ़ना
   - JSON फ़ाइलें सुरक्षित तरीके से लोड करना (missing / गलत JSON पर crash नहीं)
   - अपना अलग localStorage (पुराने progress से बिल्कुल अलग)
   - प्रश्नों की जाँच (validation)
   - "नोट्स/PYQ" Hub पेज और Data Check

   पुरानी website के किसी data/storage key को यह file नहीं छूती।
   अपना storage key: mission2027_extras_v1
   ========================================================== */
(function (M) {
  'use strict';

  var X = { _mf: {}, _files: {}, _inits: [], _searchers: {}, _booted: false };
  var STORE_KEY = 'mission2027_extras_v1';

  X.MSG_EMPTY = 'इस Chapter का Content अभी उपलब्ध नहीं है। जल्द जोड़ा जाएगा।';
  X.MSG_EMPTY_GENERIC = 'इस विषय का Content अभी उपलब्ध नहीं है। जल्द जोड़ा जाएगा।';

  function esc(s) { return M.App.esc(s); }
  X.esc = esc;

  /* ---------- मैनिफ़ेस्ट: कौन-सी फ़ाइल किस kind की है ---------- */
  var KINDS = {
    notes: { url: 'data/notes/manifest.json', listKey: 'notes' },
    pyq: { url: 'data/pyq/manifest.json', listKey: 'pyq' },
    practice: { url: 'data/practice/manifest.json', listKey: 'practice' },
    vault: { url: 'data/vault/manifest.json', listKey: 'vault' },
    lab: { url: 'data/lab/manifest.json', listKey: 'lab' }
  };
  X.KINDS = KINDS;

  /* ---------- छोटे helpers ---------- */
  X.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  // सुरक्षित relative path (manifest की "file") — बाहर की site या ".." नहीं
  X.safeJsonPath = function (p) {
    if (typeof p !== 'string') return null;
    p = p.trim();
    if (!p || !/\.json$/i.test(p)) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(p) || p.charAt(0) === '/' || p.charAt(0) === '\\' || p.indexOf('..') >= 0) return null;
    return p;
  };

  // Notes में image / embed के लिए: relative path या https link
  X.safeAsset = function (p) {
    if (typeof p !== 'string') return null;
    p = p.trim();
    if (!p) return null;
    if (/^https:\/\//i.test(p)) return p;
    if (/^[a-z][a-z0-9+.-]*:/i.test(p) || p.charAt(0) === '/' || p.charAt(0) === '\\' || p.indexOf('..') >= 0) return null;
    return p;
  };

  /* ---------- गणित (LaTeX) का समर्थन ----------
     text में  $...$  (line के अंदर) या  $$...$$  (अलग पंक्ति में बड़ा) लिखो, जैसे
       $\frac{a}{b}$   या   $$\int_0^1 x\,dx = \frac{1}{2}$$
     KaTeX (MIT licence) से सुंदर सूत्र बनते हैं। KaTeX पहले इंटरनेट (CDN) से आता है;
     न आए तो अपनी लाइब्रेरी lib/katex/ से; वह भी न हो तो सूत्र सादे code-text में दिखता है (कुछ टूटता नहीं)।
     $ चिह्न सचमुच लिखना हो तो \$ लिखो। */
  var KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/';
  var KATEX_LOCAL = 'lib/katex/';
  var mathP = null;
  function loadKatexFrom(base) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(v); } }
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = base + 'katex.min.css';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = base + 'katex.min.js';
      js.onload = function () { fin(!!window.katex); };
      js.onerror = function () { try { css.remove(); js.remove(); } catch (e) { /* ignore */ } fin(false); };
      setTimeout(function () { fin(!!window.katex); }, 7000);
      document.head.appendChild(js);
    });
  }
  // गणित दिखाने से पहले बुलाओ; हमेशा resolve होता है (true = KaTeX मिला)
  X.ensureMath = function () {
    if (window.katex) return Promise.resolve(true);
    if (!mathP) {
      mathP = loadKatexFrom(KATEX_CDN).then(function (ok) { return ok ? true : loadKatexFrom(KATEX_LOCAL); }).then(function (ok) { if (!ok) mathP = null; return ok; });
    }
    return mathP;
  };
  // किसी भी data (list/object) में गणित ($) है तो ही KaTeX लोड करो
  X.ensureMathFor = function (data) {
    var has = false;
    try { has = JSON.stringify(data).indexOf('$') >= 0; } catch (e) { has = false; }
    return has ? X.ensureMath() : Promise.resolve(true);
  };
  function plainHtml(t) {
    return esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  function mathHtml(tex, display) {
    if (window.katex) {
      try { return window.katex.renderToString(tex.trim(), { throwOnError: false, displayMode: display, strict: 'ignore', trust: false }); } catch (e) { /* नीचे सादा text */ }
    }
    return '<code class="x-tex">' + esc((display ? '$$' : '$') + tex + (display ? '$$' : '$')) + '</code>';
  }
  // "**मोटा**", नई line और $गणित$ को सुरक्षित HTML में बदलना
  X.rich = function (text) {
    var s = String(text == null ? '' : text);
    if (s.indexOf('$') < 0) return plainHtml(s);
    s = s.replace(/\\\$/g, '\u0001');
    var out = '', last = 0, m, re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    function plain(t) { return plainHtml(t).replace(/\u0001/g, '$'); }
    while ((m = re.exec(s))) {
      out += plain(s.slice(last, m.index));
      out += mathHtml((m[1] !== undefined ? m[1] : m[2]).replace(/\u0001/g, '$'), m[1] !== undefined);
      last = re.lastIndex;
    }
    return out + plain(s.slice(last));
  };
  // string या string की list → paragraphs की list
  X.paras = function (v) {
    var out = [];
    if (typeof v === 'string') { if (v.trim()) out.push(v.trim()); }
    else if (Array.isArray(v)) v.forEach(function (x) { if (typeof x === 'string' && x.trim()) out.push(x.trim()); else if (typeof x === 'number') out.push(String(x)); });
    else if (typeof v === 'number') out.push(String(v));
    return out;
  };

  /* ---------- JSON फ़ाइल लोड (cache के साथ) ---------- */
  X.fetchJson = function (url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (res.status === 404) return { __missing: true };
      if (!res.ok) return { __error: 'HTTP ' + res.status };
      return res.text().then(function (t) {
        try { return JSON.parse(t); } catch (e) {
          return { __error: 'फ़ाइल सही JSON नहीं है (कॉमा / कोट्स जाँचो), या फ़ाइल मिली ही नहीं' };
        }
      });
    }).catch(function (e) {
      return { __error: String((e && e.message) || e) };
    });
  };
  X.loadFile = function (url) {
    if (!X._files[url]) X._files[url] = X.fetchJson(url);
    return X._files[url];
  };

  /* ---------- Manifest ---------- */
  function normalize(kind, raw) {
    var out = { status: 'ok', entries: [], warnings: [], error: '' };
    var key = KINDS[kind].listKey;
    if (!raw || raw.__missing) { out.status = 'missing'; return out; }
    if (raw.__error) { out.status = 'error'; out.error = raw.__error; return out; }
    var list = Array.isArray(raw) ? raw : raw[key];
    if (!Array.isArray(list)) { out.status = 'error'; out.error = 'manifest में "' + key + '" की list नहीं मिली'; return out; }
    var seen = {};
    list.forEach(function (e, i) {
      var tag = 'Entry ' + (i + 1);
      function warn(msg) { out.warnings.push(tag + ': ' + msg); }
      if (!e || typeof e !== 'object') { warn('format गलत है'); return; }
      if (kind === 'vault') {
        var vid = typeof e.id === 'string' ? e.id.trim() : '';
        var vfile = X.safeJsonPath(e.file);
        if (!/^[A-Za-z0-9_-]{1,40}$/.test(vid)) { warn('"id" सिर्फ़ अक्षर, अंक, - या _ से बनी होनी चाहिए'); return; }
        if (!vfile) { warn('"file" का path सही नहीं है (relative और .json होना चाहिए)'); return; }
        if (seen[vid]) { warn('id "' + vid + '" दोबारा है'); return; }
        seen[vid] = true;
        out.entries.push({ idx: i, id: vid, file: vfile });
        return;
      }
      var sid = typeof e.subject === 'string' ? e.subject.trim() : '';
      if (!sid || !M.Subjects.get(sid)) { warn('subject "' + sid + '" data/subjects.json में नहीं है'); return; }
      var file = X.safeJsonPath(e.file);
      if (!file) { warn('"file" का path सही नहीं है (relative और .json होना चाहिए)'); return; }
      var en = { idx: i, subject: sid, file: file };
      if (kind === 'notes') {
        var ch = parseInt(e.chapter, 10);
        if (!ch || !M.Subjects.chapter(sid, ch)) { warn(sid + ' का chapter ' + e.chapter + ' subjects.json में नहीं है'); return; }
        // एक Chapter के Notes कई भागों (अलग-अलग फ़ाइलों) में हो सकते हैं — सब जुड़कर दिखते हैं
        var k = sid + '|' + ch + '|' + file;
        if (seen[k]) { warn(sid + ' अध्याय ' + ch + ' की यही फ़ाइल दोबारा लिखी है'); return; }
        seen[k] = true;
        en.chapter = ch;
        en.part = typeof e.part === 'string' ? e.part.trim() : '';
      } else if (kind === 'pyq') {
        var yr = (typeof e.year === 'string' || typeof e.year === 'number') ? String(e.year).trim() : '';
        if (!yr || yr.length > 30) { warn('"year" नहीं लिखा या बहुत लंबा है'); return; }
        en.year = yr;
        en.label = typeof e.label === 'string' ? e.label.trim() : '';
      } else {
        var id = typeof e.id === 'string' ? e.id.trim() : '';
        if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) { warn('"id" सिर्फ़ अक्षर, अंक, - या _ से बनी होनी चाहिए (जैसे set-01)'); return; }
        var k2 = sid + '|' + id;
        if (seen[k2]) { warn(sid + ' में id "' + id + '" दोबारा है'); return; }
        seen[k2] = true;
        en.id = id;
        en.title = typeof e.title === 'string' ? e.title.trim() : '';
      }
      out.entries.push(en);
    });
    return out;
  }
  X.manifest = function (kind) {
    if (!X._mf[kind]) {
      X._mf[kind] = X.fetchJson(KINDS[kind].url).then(function (raw) {
        try { return normalize(kind, raw); } catch (err) { return { status: 'error', entries: [], warnings: [], error: String(err && err.message || err) }; }
      });
    }
    return X._mf[kind];
  };
  X.entriesFor = function (mf, subject) {
    return mf.entries.filter(function (e) { return e.subject === subject; });
  };
  // Notes: किसी विषय के अलग-अलग Chapter नंबर (छोटे से बड़ा), भले ही Notes कई भागों में हों
  X.notesChapters = function (mf, subject) {
    var seen = {}, out = [];
    X.entriesFor(mf, subject).forEach(function (e) { if (e.chapter && !seen[e.chapter]) { seen[e.chapter] = 1; out.push(e.chapter); } });
    return out.sort(function (a, b) { return a - b; });
  };
  X.chapterEntries = function (mf, subject, chapter) {
    return X.entriesFor(mf, subject).filter(function (e) { return e.chapter === chapter; });
  };

  /* ---------- अपना Storage (पुराने progress से अलग) ---------- */
  var store = null;
  function blank() { return { v: 1, best: {}, history: [], active: null, read: {}, ng: {}, lab: {} }; }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function validActive(a) {
    if (!a || typeof a !== 'object' || !Array.isArray(a.questions) || !Array.isArray(a.answers)) return false;
    if (!a.questions.length || a.questions.length !== a.answers.length) return false;
    return a.questions.every(function (q) {
      return q && typeof q.id === 'string' && typeof q.question === 'string' && q.options && typeof q.options === 'object' && /^[ABCD]$/.test(q.answer);
    });
  }
  X.store = function () {
    if (store) return store;
    var d = blank();
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          if (p.best && typeof p.best === 'object' && !Array.isArray(p.best)) d.best = p.best;
          if (isObj(p.read)) d.read = p.read;
          if (isObj(p.ng)) d.ng = p.ng;
          if (isObj(p.lab)) d.lab = p.lab;
          if (Array.isArray(p.history)) d.history = p.history.filter(function (h) { return h && typeof h.id === 'string' && typeof h.total === 'number'; }).slice(-30);
          if (validActive(p.active)) d.active = p.active;
        }
      }
    } catch (e) {
      try { if (raw) window.localStorage.setItem(STORE_KEY + '_corrupt_backup', raw); } catch (e2) { /* ignore */ }
    }
    store = d;
    return d;
  };
  var warnedSave = false;
  X.save = function () {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(X.store())); }
    catch (e) {
      if (!warnedSave) { warnedSave = true; M.App.toast('⚠️ नए sections का data सेव नहीं हो पा रहा (Private mode?)।', 'warn'); }
    }
  };

  /* ---------- प्रश्न की जाँच ---------- */
  // allowText = true हो तो short/long (बिना options वाले) प्रश्न भी मान्य (PYQ के लिए)
  X.cleanQuestion = function (q, allowText) {
    if (!q || typeof q !== 'object' || Array.isArray(q)) return { ok: false, error: 'प्रश्न का format गलत है' };
    var id = (typeof q.id === 'string' || typeof q.id === 'number') ? String(q.id).trim() : '';
    if (!id) return { ok: false, error: 'बिना "id" वाला प्रश्न' };
    var text = typeof q.question === 'string' ? q.question.trim() : '';
    if (!text) return { ok: false, error: id + ': "question" खाली है' };
    var out = { id: id, question: text, explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '' };
    var ch = parseInt(q.chapter, 10);
    if (ch > 0) out.chapter = ch;
    if (typeof q.topic === 'string' && q.topic.trim()) out.topic = q.topic.trim();
    var type = typeof q.type === 'string' ? q.type.trim().toLowerCase() : '';
    var hasOpts = q.options && typeof q.options === 'object' && !Array.isArray(q.options);
    if (type === 'objective' || (!type && hasOpts)) {
      if (!hasOpts) return { ok: false, error: id + ': objective प्रश्न में "options" नहीं हैं' };
      var opts = {};
      var bad = false;
      ['A', 'B', 'C', 'D'].forEach(function (L) {
        var v = q.options[L];
        if (typeof v === 'number') v = String(v);
        if (typeof v !== 'string' || !v.trim()) bad = true; else opts[L] = v.trim();
      });
      if (bad) return { ok: false, error: id + ': A, B, C, D चारों विकल्प भरे होने चाहिए' };
      var ans = typeof q.answer === 'string' ? q.answer.trim().toUpperCase() : '';
      if (!/^[ABCD]$/.test(ans)) return { ok: false, error: id + ': "answer" सिर्फ़ A, B, C या D होना चाहिए' };
      out.type = 'objective';
      out.options = opts;
      out.answer = ans;
      return { ok: true, q: out };
    }
    if (!allowText) return { ok: false, error: id + ': यहाँ सिर्फ़ objective (A-D) प्रश्न चलते हैं' };
    out.type = (type === 'short' || type === 'long') ? type : 'other';
    out.answer = X.paras(q.answer).join('\n');
    if (typeof q.marks === 'number' && q.marks > 0) out.marks = q.marks;
    return { ok: true, q: out };
  };

  // list के प्रश्न जाँचकर साफ list + skipped कारण देता है (दोहराई ID भी छोड़ता है)
  X.cleanQuestions = function (list, allowText) {
    var res = { questions: [], skipped: [] };
    if (!Array.isArray(list)) return res;
    var seen = {};
    list.forEach(function (raw) {
      var r = X.cleanQuestion(raw, allowText);
      if (!r.ok) { res.skipped.push(r.error); return; }
      if (seen[r.q.id]) { res.skipped.push(r.q.id + ': दोहराई हुई ID'); return; }
      seen[r.q.id] = true;
      res.questions.push(r.q);
    });
    return res;
  };

  /* ---------- UI helpers ---------- */
  X.chapterName = function (subject, no) {
    if (no && M.Subjects.chapter(subject, no)) return M.Subjects.chapterLabel(subject, no);
    return no ? 'अध्याय ' + no : '';
  };
  X.emptyHtml = function (icon, title, msg, btnLabel, btnTo) {
    return '<div class="empty big"><div class="empty-ico">' + icon + '</div><h3>' + esc(title) + '</h3>' +
      (msg ? '<p class="muted">' + esc(msg) + '</p>' : '') +
      (btnLabel ? '<button class="btn" data-action="nav" data-to="' + esc(btnTo) + '">' + esc(btnLabel) + '</button>' : '') + '</div>';
  };
  X.errorHtml = function (title, detail, path) {
    return '<div class="empty big"><div class="empty-ico">⚠️</div><h3>' + esc(title) + '</h3>' +
      '<p class="muted small">' + esc(detail || '') + '</p>' +
      (path ? '<p class="muted small">फ़ाइल: <code>' + esc(path) + '</code></p>' : '') + '</div>';
  };
  X.warnHtml = function (list, title) {
    if (!list || !list.length) return '';
    return '<details class="card"><summary>⚠️ ' + esc(title || 'कुछ चीज़ें छोड़ी गईं') + ' (' + list.length + ')</summary><ul class="small info-list">' +
      list.slice(0, 30).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') +
      (list.length > 30 ? '<li>… और ' + (list.length - 30) + '</li>' : '') + '</ul></details>';
  };
  X.subjectCard = function (s, meta, chipText, chipCls, to) {
    return '<button class="subject-card" style="--accent:' + esc(s.color) + '" data-action="nav" data-to="' + esc(to) + '">' +
      '<span class="sc-top"><span class="sc-ico">' + esc(s.icon) + '</span>' +
      '<span class="sc-name"><strong>' + esc(s.nameHi) + '</strong><small>' + esc(s.nameEn) + '</small></span></span>' +
      '<span class="chip ' + esc(chipCls) + '">' + esc(chipText) + '</span>' +
      '<span class="sc-meta">' + esc(meta) + '</span></button>';
  };
  X.loadingThen = function (isCached, msg) {
    if (!isCached) M.App.showLoading(msg || 'लोड हो रहा है…');
  };
  X.view = function (o) {
    o.tab = 'extras';
    if (!o.ctx) o.ctx = 'chapter'; // पढ़ाई का समय गिनने के लिए (timer.js का मौजूदा नियम); Vault अलग ctx देता है
    return o;
  };

  /* ---------- search box का साझा listener ---------- */
  X.bindSearch = function (id, fn) { X._searchers[id] = fn; };
  function onInput(e) {
    var t = e.target;
    if (!t || !t.id) return;
    var fn = X._searchers[t.id];
    if (fn) { try { fn(t.value || ''); } catch (err) { if (window.console) console.error(err); } }
  }

  /* ---------- Boot: actions जोड़ना (app.js बनने के बाद) ---------- */
  X.onReady = function (fn) { X._inits.push(fn); if (X._booted) fn(M.App.actions); };
  X.boot = function () {
    if (X._booted || !M.App || !M.App.actions) return;
    X._booted = true;
    X._inits.forEach(function (fn) { fn(M.App.actions); });
    document.addEventListener('input', onInput);
  };

  /* ==========================================================
     HUB पेज  (#/extras)
     ========================================================== */
  function viewHub() {
    X.boot();
    return Promise.all([X.manifest('notes'), X.manifest('pyq'), X.manifest('practice')]).then(function (ms) {
      var n = ms[0], p = ms[1], m = ms[2];
      function cnt(mf, what) {
        if (mf.status === 'error') return 'manifest में गड़बड़ी — Data Check देखो';
        var num = mf.entries.length;
        if (mf === n) { var seenC = {}; mf.entries.forEach(function (e) { seenC[e.subject + '|' + e.chapter] = 1; }); num = Object.keys(seenC).length; }
        return num ? num + ' ' + what + ' उपलब्ध' : 'Content जल्द जोड़ा जाएगा';
      }
      var html = '<section class="page xs">';
      html += '<div class="banner info"><span>📌 ये सारे sections <b>Chapter Quiz से अलग</b> हैं। इनमें XP, chapter lock या पुराना progress नहीं बदलता।</span></div>';
      html += '<button class="x-hub-card" style="--accent:#4f8cff" data-action="nav" data-to="/notes"><span class="x-hub-top"><span class="x-hub-ico">📓</span>' +
        '<span><strong>My Notes</strong><br><span class="x-meta">विषय → Chapter → Notes</span></span></span>' +
        '<span class="x-meta">' + esc(cnt(n, 'Chapter के Notes')) + '</span></button>';
      html += '<button class="x-hub-card" style="--accent:#f5c451" data-action="nav" data-to="/pyq"><span class="x-hub-top"><span class="x-hub-ico">🗂️</span>' +
        '<span><strong>PYQ</strong><br><span class="x-meta">विषय → साल → पिछले साल के प्रश्न</span></span></span>' +
        '<span class="x-meta">' + esc(cnt(p, 'प्रश्न-पत्र / Set')) + '</span></button>';
      html += '<button class="x-hub-card" style="--accent:#34d399" data-action="nav" data-to="/practice"><span class="x-hub-top"><span class="x-hub-ico">🎯</span>' +
        '<span><strong>Mixed Practice</strong><br><span class="x-meta">विषय के अनुसार कई Chapters मिले Objective Sets</span></span></span>' +
        '<span class="x-meta">' + esc(cnt(m, 'Practice Set')) + '</span></button>';
      var ngm = M.NotesGame ? 'Level ' + M.NotesGame.level() + ' · ' + M.NotesGame.clearedCount() + ' Stage पूरे' : 'Notes पढ़ो, Game खेलो, Level बढ़ाओ';
      html += '<button class="x-hub-card" style="--accent:#f472b6" data-action="nav" data-to="/ngame"><span class="x-hub-top"><span class="x-hub-ico">🎮</span>' +
        '<span><strong>Notes Game</strong><br><span class="x-meta">Notes पढ़ो → Game खेलो → Level बढ़ाओ</span></span></span>' +
        '<span class="x-meta">' + esc(ngm) + '</span></button>';
      var vs = M.Vault ? M.Vault.state() : { open: false };
      html += '<button class="x-hub-card" style="--accent:#a78bfa" data-action="nav" data-to="/vault"><span class="x-hub-top"><span class="x-hub-ico">🎁</span>' +
        '<span><strong>Fun Vault</strong><br><span class="x-meta">Chapter Challenge में ' + (M.Vault ? M.Vault.PASS : 95) + '%+ लाओ → चुटकुले खुलते हैं</span></span></span>' +
        '<span class="x-meta">' + (vs.open ? '🔓 खुला है — ' + M.App.fmtTime(Math.ceil(vs.left / 1000)) + ' बचे' : '🔒 अभी बंद') + '</span></button>';
      html += '<button class="x-hub-card" style="--accent:#22d3ee" data-action="nav" data-to="/lab"><span class="x-hub-top"><span class="x-hub-ico">🧪</span>' +
        '<span><strong>Virtual Lab</strong><br><span class="x-meta">Physics के Experiments — असली Lab जैसा Simulation</span></span></span>' +
        '<span class="x-meta">Experiments उपलब्ध</span></button>';
      html +=
              '<div class="card"><h3 class="card-title">🔍 Data Check</h3>' +
        '<p class="muted small">नई JSON फ़ाइलें GitHub पर डालने के बाद यहाँ जाँचो कि वे सही से पढ़ी जा रही हैं या नहीं।</p>' +
        '<button class="btn small ghost" data-action="x-check">अभी जाँचो</button><div id="xCheckOut" class="x-check-out" style="margin-top:10px"></div></div>';
      html += '</section>';
      return X.view({ html: html, title: 'नोट्स · PYQ', sub: 'Practice · Game · Vault', back: null });
    });
  }

  /* ---------- Data Check ---------- */
  var STATUS_TXT = { missing: 'फ़ाइल नहीं मिली', error: 'गड़बड़ी', empty: 'फ़ाइल में अभी कुछ नहीं है' };
  X.checkAll = function () {
    var kinds = ['notes', 'pyq', 'practice', 'vault', 'lab'];
    var names = { notes: 'Notes', pyq: 'PYQ', practice: 'Practice', vault: 'Vault', lab: 'Lab' };
    return Promise.all(kinds.map(function (k) { return X.manifest(k); })).then(function (ms) {
      var jobs = [];
      var lines = [];
      ms.forEach(function (mf, i) {
        var k = kinds[i];
        if (mf.status === 'missing') lines.push({ cls: 'warn', t: names[k] + ': manifest फ़ाइल (' + KINDS[k].url + ') नहीं मिली' });
        else if (mf.status === 'error') lines.push({ cls: 'bad', t: names[k] + ' manifest: ' + mf.error });
        else if (!mf.entries.length) lines.push({ cls: 'ok', t: names[k] + ': manifest सही है, अभी कोई entry नहीं (खाली)' });
        mf.warnings.forEach(function (w) { lines.push({ cls: 'warn', t: names[k] + ' manifest — ' + w }); });
        mf.entries.forEach(function (en) {
          var loader = k === 'notes' ? M.Notes && M.Notes.load : k === 'pyq' ? M.Pyq && M.Pyq.load : k === 'vault' ? M.Vault && M.Vault.load : k === 'lab' ? M.Lab && M.Lab.load : M.Practice && M.Practice.load;
          if (!loader) return;
          var tag = names[k] + ' · ' + (en.subject || en.id) + (en.chapter ? ' · अध्याय ' + en.chapter + (en.part ? ' (' + en.part + ')' : '') : '') + (en.year ? ' · ' + en.year : '') + (en.id ? ' · ' + en.id : '');
          jobs.push(loader(en).then(function (r) {
            if (r.status === 'ok') {
              lines.push({ cls: r.skipped && r.skipped.length ? 'warn' : 'ok', t: tag + ' — ' + r.count + ' आइटम सही' + (r.skipped && r.skipped.length ? ', ' + r.skipped.length + ' छोड़े गए: ' + r.skipped.slice(0, 3).join('; ') : '') });
            } else {
              lines.push({ cls: r.status === 'empty' ? 'warn' : 'bad', t: tag + ' — ' + (STATUS_TXT[r.status] || r.status) + (r.error ? ': ' + r.error : '') + ' (' + en.file + ')' });
            }
          }));
        });
      });
      return Promise.all(jobs).then(function () { return lines; });
    });
  };

  X.onReady(function (A) {
    A['x-check'] = function () {
      var out = document.getElementById('xCheckOut');
      if (!out) return;
      out.innerHTML = '<div class="ln">जाँच चल रही है…</div>';
      // पुराना cache छोड़कर ताज़ा फ़ाइलें पढ़ो
      X._mf = {}; X._files = {};
      X.checkAll().then(function (lines) {
        var box = document.getElementById('xCheckOut');
        if (!box) return;
        box.innerHTML = lines.length ? lines.map(function (l) { return '<div class="ln ' + l.cls + '">' + (l.cls === 'ok' ? '✅ ' : l.cls === 'bad' ? '❌ ' : '⚠️ ') + esc(l.t) + '</div>'; }).join('') : '<div class="ln ok">✅ सब ठीक है।</div>';
      });
    };
  });

  /* ---------- Routes (app.js से पहले जोड़ना ठीक है) ---------- */
  if (M.Router && M.Router.add) M.Router.add('/extras', viewHub);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', X.boot);
  else X.boot();

  M.Extras = X;
})(window.M27 = window.M27 || {});
