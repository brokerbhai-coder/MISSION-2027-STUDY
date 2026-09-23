/* ==========================================================
   notes.js  (नया)
   काम: "My Notes" — Digital Study Notebook।
   विषय → Chapter (data/subjects.json से) → Notes की categories।
   Data: data/notes/manifest.json + हर Chapter की अपनी Notes JSON फ़ाइल।
   सिर्फ़ वही categories दिखती हैं जो उस JSON में भरी हैं।
   Routes: #/notes   #/notes/<subject>   #/notes/<subject>/<chapter>
   Template: data/templates/notes-template.json
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var N = {};
  var ui = { only: false, cat: '', text: '' };
  function esc(s) { return M.App.esc(s); }

  // Notes की categories (क्रम यही रहेगा)
  var CATS = [
    { key: 'chapterNotes', icon: '📘', label: 'Chapter Notes' },
    { key: 'oneLiners', icon: '⚡', label: 'One-Liner Q&A' },
    { key: 'theory', icon: '📖', label: 'Topic-wise Theory' },
    { key: 'shortAnswers', icon: '✏️', label: 'Short Answer' },
    { key: 'longAnswers', icon: '📝', label: 'Long Answer' },
    { key: 'definitions', icon: '🔤', label: 'Important Definitions' },
    { key: 'formulas', icon: '🧮', label: 'Important Formulas' },
    { key: 'diagrams', icon: '🖼️', label: 'Diagrams / Graphs / Structures' },
    { key: 'revision', icon: '🔁', label: 'Revision Notes' },
    { key: 'interactive', icon: '🧊', label: '3D / Interactive' }
  ];

  /* ---------- एक आइटम की जाँच ---------- */
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function pointsOf(v) { return X.paras(v); }
  function media(it) {
    var m = null;
    var img = X.safeAsset(it.image);
    if (img) m = { type: 'image', src: img };
    else if (typeof it.svg === 'string' && /^\s*<svg[\s>]/i.test(it.svg) && it.svg.length < 200000) m = { type: 'svg', svg: it.svg };
    else {
      var emb = X.safeAsset(it.embed);
      if (emb) m = { type: 'embed', src: emb, height: Math.min(700, Math.max(200, parseInt(it.height, 10) || 320)) };
    }
    return m;
  }
  function clean(cat, it) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) return null;
    var o;
    switch (cat) {
      case 'chapterNotes':
      case 'theory':
        o = { title: str(it.heading) || str(it.title), content: X.paras(it.content), points: pointsOf(it.points) };
        return o.title && (o.content.length || o.points.length) ? o : null;
      case 'oneLiners':
      case 'shortAnswers':
      case 'longAnswers':
        o = { question: str(it.question), answer: X.paras(it.answer) };
        return o.question && o.answer.length ? o : null;
      case 'definitions':
        o = { term: str(it.term), definition: X.paras(it.definition) };
        return o.term && o.definition.length ? o : null;
      case 'formulas':
        o = { name: str(it.name), formula: str(it.formula), meaning: X.paras(it.meaning), unit: str(it.unit), examples: [] };
        // हर सूत्र के साथ हल किए हुए उदाहरण (वैकल्पिक): { question, solution, source }
        (Array.isArray(it.examples) ? it.examples : []).forEach(function (ex) {
          if (!ex || typeof ex !== 'object') return;
          var q = str(ex.question), sol = X.paras(ex.solution);
          if (q && sol.length) o.examples.push({ question: q, solution: sol, source: str(ex.source).slice(0, 24) });
        });
        return o.name && o.formula ? o : null;
      case 'diagrams':
        o = { title: str(it.title), caption: str(it.caption), media: media(it) };
        return o.title && o.media ? o : null;
      case 'revision':
        o = { title: str(it.title), content: X.paras(it.content), points: pointsOf(it.points) };
        return o.title && (o.content.length || o.points.length) ? o : null;
      case 'interactive':
        o = { title: str(it.title), caption: str(it.caption), media: media(it) };
        return o.title && o.media && o.media.type === 'embed' ? o : null;
      default: return null;
    }
  }

  /* ---------- एक Chapter की Notes JSON लोड + जाँच ---------- */
  N.load = function (entry) {
    return X.loadFile(entry.file).then(function (raw) {
      var r = { status: 'ok', cats: {}, count: 0, skipped: [], error: '', title: '' };
      if (raw && raw.__missing) { r.status = 'missing'; return r; }
      if (raw && raw.__error) { r.status = 'error'; r.error = raw.__error; return r; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.categories || typeof raw.categories !== 'object' || Array.isArray(raw.categories)) {
        r.status = 'error'; r.error = 'JSON में "categories" (object) नहीं मिला'; return r;
      }
      CATS.forEach(function (c) {
        var arr = raw.categories[c.key];
        if (arr === undefined || arr === null) return;
        if (!Array.isArray(arr)) { r.skipped.push(c.label + ': यह list नहीं है'); return; }
        var items = [];
        arr.forEach(function (it, i) {
          var v = clean(c.key, it);
          if (v) items.push(v); else r.skipped.push(c.label + ' #' + (i + 1) + ': आइटम अधूरा या गलत format में');
        });
        if (items.length) { r.cats[c.key] = items; r.count += items.length; }
      });
      Object.keys(raw.categories).forEach(function (k) {
        if (!CATS.some(function (c) { return c.key === k; })) r.skipped.push('अनजानी category "' + k + '" छोड़ी गई');
      });
      r.title = str(raw.title);
      if (!r.count) r.status = 'empty';
      return r;
    });
  };

  // एक Chapter के सारे भागों (कई फ़ाइलें) को जोड़कर एक नतीजा
  N.loadMany = function (entries) {
    return Promise.all(entries.map(function (e) { return N.load(e); })).then(function (loads) {
      var r = { status: 'ok', cats: {}, count: 0, skipped: [], error: '', title: '', file: entries[0].file };
      var okAny = false;
      loads.forEach(function (L, i) {
        var tag = entries.length > 1 ? 'भाग ' + (entries[i].part || (i + 1)) + ': ' : '';
        if (L.status === 'ok') {
          okAny = true;
          if (!r.title && L.title) r.title = L.title;
          CATS.forEach(function (c) { if (L.cats[c.key]) r.cats[c.key] = (r.cats[c.key] || []).concat(L.cats[c.key]); });
          r.count += L.count;
          L.skipped.forEach(function (x) { r.skipped.push(tag + x); });
        } else if (L.status === 'missing') r.skipped.push(tag + 'फ़ाइल नहीं मिली (' + entries[i].file + ')');
        else if (L.status === 'error') r.skipped.push(tag + 'फ़ाइल पढ़ी नहीं जा सकी: ' + L.error + ' (' + entries[i].file + ')');
        else r.skipped.push(tag + 'फ़ाइल में अभी कुछ नहीं है');
      });
      if (!okAny) {
        var bad = loads.filter(function (L) { return L.status === 'error'; })[0] || loads.filter(function (L) { return L.status === 'missing'; })[0];
        r.status = bad ? bad.status : 'empty';
        r.error = bad && bad.error ? bad.error : '';
        var idx = bad ? loads.indexOf(bad) : 0;
        r.file = entries[idx].file;
      }
      return r;
    });
  };

  /* ---------- Rendering ---------- */
  function paraHtml(list) { return list.map(function (t) { return '<p>' + X.rich(t) + '</p>'; }).join(''); }
  function pointsHtml(list) { return list.length ? '<ul>' + list.map(function (t) { return '<li>' + X.rich(t) + '</li>'; }).join('') + '</ul>' : ''; }
  // SVG Diagrams में अक्सर &pi; &deg; &cong; &sim; &rarr; जैसे HTML नाम वाले Entity होते हैं।
  // data:image/svg+xml को Browser सख़्त XML की तरह पढ़ता है, जहाँ सिर्फ़ &amp; &lt; &gt; &apos; &quot; ही मान्य हैं —
  // बाकी सब (&pi; वगैरह) से Image टूट जाती है (Broken Image दिखता है)। यहाँ उन्हें पहले असली अक्षर (जैसे π) में बदल देते हैं,
  // ताकि कोई भी Entity भविष्य में इस्तेमाल हो, Diagram कभी न टूटे।
  var entityBox = null;
  function decodeEntities(s) {
    if (s.indexOf('&') < 0) return s;
    if (!entityBox) entityBox = document.createElement('textarea');
    entityBox.innerHTML = s;
    return entityBox.value;
  }
  function mediaHtml(m, title) {
    if (m.type === 'image') return '<img class="nt-media" loading="lazy" src="' + esc(m.src) + '" alt="' + esc(title) + '">';
    if (m.type === 'svg') return '<img class="nt-media" alt="' + esc(title) + '" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(decodeEntities(m.svg)) + '">';
    return '<iframe class="nt-embed" loading="lazy" sandbox="allow-scripts" src="' + esc(m.src) + '" title="' + esc(title) + '" style="height:' + m.height + 'px"></iframe>';
  }
  function examplesHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="nt-examples"><h4>✍️ उदाहरण (' + list.length + ')</h4>' + list.map(function (ex, i) {
      return '<div class="nt-ex"><p class="nt-q">उदा. ' + (i + 1) + ': ' + X.rich(ex.question) + '</p><div class="nt-a">' + paraHtml(ex.solution) + '</div>' +
        (ex.source ? '<span class="chip tiny">स्रोत: ' + esc(ex.source) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function itemHtml(cat, it) {
    var inner;
    switch (cat) {
      case 'chapterNotes':
      case 'theory':
      case 'revision':
        inner = '<h3>' + esc(it.title) + '</h3>' + paraHtml(it.content) + pointsHtml(it.points); break;
      case 'oneLiners':
      case 'shortAnswers':
      case 'longAnswers':
        inner = '<p class="nt-q">प्र. ' + X.rich(it.question) + '</p><div class="nt-a">' + paraHtml(it.answer) + '</div>'; break;
      case 'definitions':
        inner = '<p><span class="nt-term">' + X.rich(it.term) + '</span></p>' + paraHtml(it.definition); break;
      case 'formulas':
        inner = '<h3>' + X.rich(it.name) + '</h3><div class="nt-formula">' + X.rich(it.formula) + '</div>' + paraHtml(it.meaning) + (it.unit ? '<p class="muted small">मात्रक / Unit: ' + X.rich(it.unit) + '</p>' : '') + examplesHtml(it.examples); break;
      case 'diagrams':
      case 'interactive':
        inner = '<h3>' + esc(it.title) + '</h3>' + mediaHtml(it.media, it.title) + (it.caption ? '<p class="nt-cap">' + esc(it.caption) + '</p>' : ''); break;
      default: inner = '';
    }
    return '<article class="nt-sheet nt-item">' + inner + '</article>';
  }

  /* ---------- विषय चुनो ---------- */
  function viewHome() {
    X.boot();
    return X.manifest('notes').then(function (mf) {
      var html = '<section class="page xs"><div class="banner info">📓 विषय चुनो, फिर Chapter — और Notes पढ़ो।</div>' + manifestNote(mf) + '<div class="grid-cards">';
      M.Subjects.list().forEach(function (s) {
        var n = X.notesChapters(mf, s.id).length;
        var total = s.chapters.length;
        var meta = n ? n + ' Chapter के Notes उपलब्ध' + (total ? ' (कुल ' + total + ')' : '') : (total ? 'Notes जल्द जोड़े जाएँगे' : 'Chapters और Notes जल्द जोड़े जाएँगे');
        html += X.subjectCard(s, meta, n ? 'उपलब्ध' : 'जल्द आ रहा है', n ? 'ok' : 'soon', '/notes/' + s.id);
      });
      html += '</div></section>';
      return X.view({ html: html, title: 'My Notes', sub: 'विषय चुनो', back: '/extras' });
    });
  }
  function manifestNote(mf) {
    return mf.status === 'error' ? '<div class="banner bad">⚠️ Notes manifest पढ़ने में गड़बड़ी: ' + esc(mf.error) + '</div>' : '';
  }

  /* ---------- Chapter list ---------- */
  function chapterListHtml(s, mf) {
    var have = {};
    X.entriesFor(mf, s.id).forEach(function (e) { have[e.chapter] = true; });
    var t = ui.text.trim().toLowerCase();
    var rows = s.chapters.filter(function (c) {
      if (ui.only && !have[c.number]) return false;
      if (t && (c.title + ' ' + c.number).toLowerCase().indexOf(t) < 0) return false;
      return true;
    });
    if (!rows.length) return '<div class="empty"><p>कोई Chapter नहीं मिला।</p></div>';
    return '<div class="x-list">' + rows.map(function (c) {
      var ok = !!have[c.number];
      return '<button class="x-row' + (ok ? '' : ' off') + '" data-action="nav" data-to="' + esc('/notes/' + s.id + '/' + c.number) + '"><span class="x-row-no">' + c.number + '</span>' +
        '<span class="x-row-main"><strong>' + esc(c.title) + '</strong><span class="cc-chips"><span class="chip tiny ' + (ok ? 'ok' : 'soon') + '">' + (ok ? '📓 Notes उपलब्ध' : 'Notes जल्द आएँगे') + '</span></span></span><span class="x-row-end">›</span></button>';
    }).join('') + '</div>';
  }
  function viewSubject(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    if (!s) return M.App.notFound('यह विषय नहीं मिला।');
    return X.manifest('notes').then(function (mf) {
      ui = { only: false, cat: '', text: '' };
      var html = '<section class="page xs">' + manifestNote(mf);
      if (!s.chapters.length) {
        html += X.emptyHtml('📓', s.nameHi + ' — Notes', 'इस विषय के Chapters अभी जोड़े नहीं गए हैं। ' + X.MSG_EMPTY_GENERIC, 'सारे विषय', '/notes');
      } else {
        html += '<input id="ntChapSearch" class="x-search" type="search" placeholder="Chapter खोजो…" autocomplete="off">' +
          '<div class="chips"><button class="chip-btn on" data-action="nt-only" data-v="0">सभी Chapters</button><button class="chip-btn" data-action="nt-only" data-v="1">सिर्फ़ Notes वाले</button></div>' +
          '<div id="ntChapList">' + chapterListHtml(s, mf) + '</div>';
      }
      html += '</section>';
      return X.view({ html: html, title: 'My Notes', sub: s.nameHi, back: '/notes' });
    });
  }

  /* ---------- Chapter के Notes ---------- */
  function viewChapter(p) {
    X.boot();
    var s = M.Subjects.get(p.subject);
    var no = parseInt(p.no, 10);
    var ch = s && M.Subjects.chapter(p.subject, no);
    if (!s || !ch) return M.App.notFound('यह Chapter नहीं मिला।');
    var back = '/notes/' + s.id;
    return X.manifest('notes').then(function (mf) {
      var ens = X.chapterEntries(mf, s.id, no);
      var label = M.Subjects.chapterLabel(s.id, no);
      function page(body) { return X.view({ html: '<section class="page xs">' + body + '</section>', title: 'अध्याय ' + no, sub: ch.title, back: back }); }
      if (!ens.length) return page(X.emptyHtml('📓', label, X.MSG_EMPTY, 'Chapter list', back));
      return N.loadMany(ens).then(function (L) {
        if (L.status === 'missing') return page(X.errorHtml('इस Chapter की Notes फ़ाइल नहीं मिली', 'manifest में नाम लिखा है, पर GitHub में फ़ाइल upload नहीं हुई या path गलत है।', L.file));
        if (L.status === 'error') return page(X.errorHtml('इस Chapter की Notes फ़ाइल पढ़ी नहीं जा सकी', L.error, L.file));
        if (L.status === 'empty') return page(X.emptyHtml('📓', label, X.MSG_EMPTY, 'Chapter list', back) + X.warnHtml(L.skipped, 'कुछ आइटम छोड़े गए'));
        return X.ensureMathFor(L.cats).then(function (mathOk) {
          // धीमे Network पर KaTeX अभी न आई हो, तो बाद में आने पर इसी Chapter को अपने-आप फिर से बना दो (अगर विद्यार्थी अभी भी यहीं है)
          if (!mathOk) {
            var here = '/notes/' + p.subject + '/' + p.no;
            X.onMathReady(function () { if (M.Router.currentPath === here) M.Router.refresh(true); });
          }
          return buildChapter(L);
        });
      });
      function buildChapter(L) {
        var keys = CATS.filter(function (c) { return L.cats[c.key]; });
        ui.cat = keys[0].key;
        ui.text = '';
        var html = '<div class="card nt-head"><span class="chip x-new">नया · Notes</span><h2>' + esc(label) + '</h2><p class="muted small">' + esc(L.title || s.nameHi) + ' · कुल ' + L.count + ' आइटम</p></div>';
        html += '<div class="chips scroll" id="ntChips">' + keys.map(function (c, i) {
          return '<button class="chip-btn' + (i === 0 ? ' on' : '') + '" data-action="nt-cat" data-cat="' + c.key + '">' + c.icon + ' ' + esc(c.label) + ' (' + L.cats[c.key].length + ')</button>';
        }).join('') + '</div>';
        html += '<input id="ntSearch" class="x-search" type="search" placeholder="इस Chapter के Notes में खोजो…" autocomplete="off">';
        html += '<div id="ntBody">' + keys.map(function (c, i) {
          return '<section class="nt-sec" data-cat="' + c.key + '"' + (i === 0 ? '' : ' hidden') + '><h2 class="sec-title">' + c.icon + ' ' + esc(c.label) + '</h2>' +
            L.cats[c.key].map(function (it) { return itemHtml(c.key, it); }).join('') + '</section>';
        }).join('') + '</div><p id="ntNone" class="empty" hidden>कुछ नहीं मिला।</p>';
        html += M.NotesGame ? M.NotesGame.readCardHtml(s.id, no) : '';
        html += X.warnHtml(L.skipped, 'कुछ आइटम छोड़े गए');
        return page(html);
      }
    });
  }

  /* ---------- Chapter के अंदर: category / search ---------- */
  function showCategory() {
    var secs = document.querySelectorAll('#ntBody .nt-sec');
    var t = ui.text.trim().toLowerCase();
    var any = false;
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i];
      var items = sec.querySelectorAll('.nt-item');
      var vis = 0;
      for (var j = 0; j < items.length; j++) {
        var ok = !t || items[j].textContent.toLowerCase().indexOf(t) >= 0;
        items[j].hidden = !ok;
        if (ok) vis += 1;
      }
      // search खाली हो तो चुनी हुई category; search में सारी categories के मिले हुए आइटम
      sec.hidden = t ? vis === 0 : sec.getAttribute('data-cat') !== ui.cat;
      if (!sec.hidden) any = true;
    }
    var none = document.getElementById('ntNone');
    if (none) none.hidden = any;
  }

  X.bindSearch('ntSearch', function (v) { ui.text = v; showCategory(); });
  X.bindSearch('ntChapSearch', function (v) {
    ui.text = v;
    refreshChapterList();
  });
  function refreshChapterList() {
    var box = document.getElementById('ntChapList');
    var m = /^\/notes\/([^/]+)$/.exec(M.Router.currentPath || '');
    if (!box || !m) return;
    var s = M.Subjects.get(decodeURIComponent(m[1]));
    if (!s) return;
    X.manifest('notes').then(function (mf) { box.innerHTML = chapterListHtml(s, mf); });
  }

  X.onReady(function (A) {
    A['nt-cat'] = function (el) {
      ui.cat = el.dataset.cat;
      var chips = document.querySelectorAll('#ntChips .chip-btn');
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i] === el);
      showCategory();
    };
    A['nt-only'] = function (el) {
      ui.only = el.dataset.v === '1';
      var chips = document.querySelectorAll('[data-action="nt-only"]');
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i] === el);
      refreshChapterList();
    };
  });

  if (M.Router && M.Router.add) {
    M.Router.add('/notes', viewHome);
    M.Router.add('/notes/:subject', viewSubject);
    M.Router.add('/notes/:subject/:no', viewChapter);
  }

  M.Notes = N;
})(window.M27 = window.M27 || {});
