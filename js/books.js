/* ==========================================================
   books.js  (नया)
   काम: "Book Reading" — किताबों के सार (Atomic Habits, Deep Work जैसी)।

   🔒 LOCK के बारे में ज़रूरी सच्चाई:
   यह website static (GitHub Pages) है, इसके पास कोई server नहीं है।
   इसका मतलब है कि यह "lock" पक्की सुरक्षा नहीं है — कोई भी व्यक्ति जो
   Browser का "View Source" / "Inspect" खोलना जानता है, वह नीचे लिखा
   PASSCODE सीधे इस फ़ाइल में पढ़ सकता है। यह सिर्फ़ आम विद्यार्थियों को
   रोकने के लिए एक साधारण गेट (friction lock) है, बैंक जैसा लॉक नहीं।

   PASSCODE बदलना हो तो सिर्फ़ नीचे की एक लाइन बदलो — कहीं और कुछ नहीं।
   ========================================================== */
(function (M) {
  'use strict';

  var PASSCODE = 'Ankit@2009$03#14kumar&hello'; // ← यहाँ बदलो, बस यही एक जगह

  var X = M.Extras;
  var B = {};
  var KEY = 'mission2027_books_v1';
  function esc(s) { return M.App.esc(s); }

  /* ---------- Unlock की स्थिति (अलग, छोटा storage) ---------- */
  function state() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') return p; }
    } catch (e) { /* ignore */ }
    return { unlocked: false };
  }
  function saveState(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  B.isUnlocked = function () { return state().unlocked === true; };

  /* ---------- मैनिफ़ेस्ट (किताबों की सूची) ---------- */
  var MANIFEST_URL = 'data/books/manifest.json';
  var mfP = null;
  function safePath(p) {
    if (typeof p !== 'string') return null;
    p = p.trim();
    if (!p || /^[a-z][a-z0-9+.-]*:/i.test(p) || p.charAt(0) === '/' || p.charAt(0) === '\\' || p.indexOf('..') >= 0 || !/\.json$/i.test(p)) return null;
    return p;
  }
  function loadManifest() {
    if (!mfP) {
      mfP = X.fetchJson(MANIFEST_URL).then(function (raw) {
        var out = { status: 'ok', entries: [], warnings: [] };
        if (!raw || raw.__missing) { out.status = 'missing'; return out; }
        if (raw.__error) { out.status = 'error'; out.error = raw.__error; return out; }
        var list = Array.isArray(raw.books) ? raw.books : [];
        var seen = {};
        list.forEach(function (b, i) {
          var id = typeof b.id === 'string' ? b.id.trim() : '';
          var file = safePath(b && b.file);
          if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) { out.warnings.push('Entry ' + (i + 1) + ': "id" सिर्फ़ अक्षर/अंक/-/_ से'); return; }
          if (!file) { out.warnings.push('Entry ' + (i + 1) + ': "file" का path सही नहीं'); return; }
          if (seen[id]) { out.warnings.push('id "' + id + '" दोबारा है'); return; }
          seen[id] = 1;
          out.entries.push({ idx: i, id: id, file: file, title: typeof b.title === 'string' ? b.title.trim() : id, author: typeof b.author === 'string' ? b.author.trim() : '' });
        });
        return out;
      });
    }
    return mfP;
  }

  /* ---------- एक किताब की content फ़ाइल ---------- */
  B.load = function (entry) {
    return X.loadFile(entry.file).then(function (raw) {
      var r = { status: 'ok', title: '', author: '', chapters: [], skipped: [], count: 0, error: '' };
      if (raw && raw.__missing) { r.status = 'missing'; return r; }
      if (raw && raw.__error) { r.status = 'error'; r.error = raw.__error; return r; }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.chapters)) { r.status = 'error'; r.error = 'JSON में "chapters" की list नहीं मिली'; return r; }
      r.title = typeof raw.title === 'string' ? raw.title.trim() : entry.title;
      r.author = typeof raw.author === 'string' ? raw.author.trim() : entry.author;
      raw.chapters.forEach(function (c, i) {
        if (!c || typeof c.heading !== 'string' || !c.heading.trim()) { r.skipped.push('Chapter ' + (i + 1) + ': "heading" खाली'); return; }
        var points = Array.isArray(c.points) ? c.points.filter(function (p) { return typeof p === 'string' && p.trim(); }) : [];
        var quote = typeof c.quote === 'string' ? c.quote.trim() : '';
        var action = typeof c.action === 'string' ? c.action.trim() : '';
        r.chapters.push({ heading: c.heading.trim(), summary: typeof c.summary === 'string' ? c.summary.trim() : '', points: points, quote: quote, action: action });
      });
      r.count = r.chapters.length;
      if (!r.count) r.status = 'empty';
      return r;
    });
  };

  /* ---------- Lock पेज ---------- */
  function lockHtml(wrong) {
    return '<section class="page xs"><div class="card bk-lock"><div class="bk-lock-ico">🔒</div>' +
      '<h2>Book Reading — बंद है</h2>' +
      '<p class="muted small">यह हिस्सा एक code से बंद है। सही code डालने पर ही खुलता है।</p>' +
      '<input type="text" id="bkCode" class="x-search" placeholder="Code डालो…" autocomplete="off">' +
      (wrong ? '<p class="ans bad">❌ Code सही नहीं है।</p>' : '') +
      '<button class="btn block" data-action="bk-unlock">🔓 खोलो</button></div></section>';
  }

  var wrongAttempt = false;
  function viewHome() {
    X.boot();
    if (!B.isUnlocked()) {
      var html = lockHtml(wrongAttempt);
      wrongAttempt = false;
      return X.view({ html: html, title: 'Book Reading', sub: '🔒 बंद', back: '/extras' });
    }
    return loadManifest().then(function (mf) {
      var html = '<section class="page xs"><div class="banner info"><span>📚 आत्म-विकास (self-help) किताबों के सार — आसान हिंदी में।</span></div>';
      if (mf.status === 'error') html += '<div class="banner bad">⚠️ Books manifest पढ़ने में गड़बड़ी: ' + esc(mf.error) + '</div>';
      if (!mf.entries.length) html += X.emptyHtml('📚', 'अभी कोई किताब नहीं जुड़ी', 'जल्द जोड़ी जाएँगी।', 'नोट्स · PYQ · Practice', '/extras');
      else {
        html += '<div class="x-list">';
        mf.entries.forEach(function (en) {
          html += '<button class="x-row" data-action="nav" data-to="' + esc('/books/' + en.id) + '"><span class="x-row-no">📘</span>' +
            '<span class="x-row-main"><strong>' + esc(en.title) + '</strong>' + (en.author ? '<span class="x-meta">' + esc(en.author) + '</span>' : '') + '</span><span class="x-row-end">›</span></button>';
        });
        html += '</div>';
      }
      html += '<button class="link-btn" data-action="bk-lock-again">🔒 फिर से बंद करो</button></section>';
      return X.view({ html: html, title: 'Book Reading', sub: '🔓 खुला', back: '/extras' });
    });
  }

  function chapterHtml(c, i) {
    return '<article class="card bk-chapter"><h3>' + (i + 1) + '. ' + esc(c.heading) + '</h3>' +
      (c.summary ? '<p>' + X.rich(c.summary) + '</p>' : '') +
      (c.points.length ? '<ul>' + c.points.map(function (p) { return '<li>' + X.rich(p) + '</li>'; }).join('') + '</ul>' : '') +
      (c.quote ? '<blockquote class="bk-quote">"' + X.rich(c.quote) + '"</blockquote>' : '') +
      (c.action ? '<p class="bk-action">✅ <b>करने लायक:</b> ' + X.rich(c.action) + '</p>' : '') +
      '</article>';
  }

  function viewBook(p) {
    X.boot();
    if (!B.isUnlocked()) return X.view({ html: lockHtml(false), title: 'Book Reading', sub: '🔒 बंद', back: '/books' });
    return loadManifest().then(function (mf) {
      var en = mf.entries.filter(function (e) { return e.id === p.id; })[0];
      var back = '/books';
      if (!en) return X.view({ html: '<section class="page xs">' + X.emptyHtml('📚', 'यह किताब नहीं मिली', '', 'वापस जाओ', back) + '</section>', title: 'Book Reading', back: back });
      return B.load(en).then(function (L) {
        var html = '<section class="page xs">';
        if (L.status === 'missing') html += X.errorHtml('इस किताब की फ़ाइल नहीं मिली', 'manifest में नाम है, पर फ़ाइल upload नहीं हुई या path गलत है।', en.file);
        else if (L.status === 'error') html += X.errorHtml('इस किताब की फ़ाइल पढ़ी नहीं जा सकी', L.error, en.file);
        else if (L.status === 'empty') html += X.emptyHtml('📘', L.title, 'इस किताब का सार अभी उपलब्ध नहीं है।', 'वापस जाओ', back);
        else {
          html += '<div class="card"><span class="chip x-new">नया · Book Reading</span><h2 style="margin:8px 0 4px">' + esc(L.title) + '</h2>' +
            (L.author ? '<p class="muted small">— ' + esc(L.author) + '</p>' : '') + '</div>';
          html += L.chapters.map(chapterHtml).join('');
          html += X.warnHtml(L.skipped, 'कुछ हिस्से छोड़े गए');
        }
        html += '</section>';
        return X.view({ html: html, title: 'Book Reading', sub: L.title || en.title, back: back });
      });
    });
  }

  X.onReady(function (A) {
    A['bk-unlock'] = function () {
      var el = document.getElementById('bkCode');
      var val = el ? el.value : '';
      if (val === PASSCODE) {
        saveState({ unlocked: true });
        if (M.Sound) M.Sound.play('unlock');
      } else {
        wrongAttempt = true;
        if (M.Sound) M.Sound.play('wrong');
      }
      M.Router.refresh(true);
    };
    A['bk-lock-again'] = function () {
      saveState({ unlocked: false });
      M.Router.go('/extras');
    };
  });

  if (M.Router && M.Router.add) {
    M.Router.add('/books', viewHome);
    M.Router.add('/books/:id', viewBook);
  }

  M.Books = B;
})(window.M27 = window.M27 || {});
