/* ==========================================================
   reference.js (नया)
   काम: "Quick Reference" — हर Subject के सारे Chapter का ज़रूरी हिस्सा
   एक ही Page पर इकट्ठा दिखाना (Last-Minute Revision के लिए):
   - Physics / Chemistry / Mathematics → सभी Chapter के "Important Formulas"
     (हर Formula के साथ पहले से मौजूद "मात्रक/Unit" भी दिखता है — Chemistry की
     Reaction/IUPAC Name भी यहीं, अगर Notes में "formulas" के तौर पर दर्ज हों)
   - Hindi / English → सभी Chapter का "लेखक/कवि परिचय" (नई Category, notes.js में जोड़ी)

   कोई नया Content यह File खुद नहीं बनाती — जो Notes में पहले से डला है,
   बस उसे एक जगह जोड़कर दिखाती है। Route: #/reference और #/reference/:subject
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var Ref = {};
  function esc(s) { return M.App.esc(s); }

  // किस Subject में कौन-सी Notes Category इकट्ठा करनी है
  var MAP = {
    physics: { cat: 'formulas', label: 'Important Formulas', icon: '🧮' },
    chemistry: { cat: 'formulas', label: 'Important Formulas / Reactions', icon: '🧮' },
    mathematics: { cat: 'formulas', label: 'Important Formulas', icon: '🧮' },
    hindi: { cat: 'authorIntro', label: 'लेखक/कवि परिचय', icon: '✍️' },
    english: { cat: 'authorIntro', label: 'Author Intro', icon: '✍️' }
  };

  /* ---------- हब: कौन-कौन से Subject में Reference उपलब्ध है ---------- */
  Ref.viewHub = function () {
    var subs = M.Subjects.list().filter(function (s) { return MAP[s.id]; });
    var html = '<section class="page"><div class="card"><h2 class="card-title">📑 Quick Reference</h2>' +
      '<p class="muted small">हर Subject के सभी Chapter का ज़रूरी हिस्सा (Formula / लेखक-परिचय) एक ही जगह — Last-Minute Revision के लिए।</p></div>';
    if (!subs.length) {
      html += '<div class="empty big"><div class="empty-ico">📭</div><h3>अभी कोई Subject यहाँ उपलब्ध नहीं</h3></div>';
    } else {
      subs.forEach(function (s) {
        var m = MAP[s.id];
        html += '<button class="card" type="button" data-action="nav" data-to="/reference/' + esc(s.id) + '" style="display:block;width:100%;text-align:left">' +
          '<div class="kv"><span>' + m.icon + ' ' + esc(s.nameHi) + '</span></div><p class="muted small">' + esc(m.label) + '</p></button>';
      });
    }
    html += '</section>';
    return { html: html, title: '📑 Quick Reference', back: '/home', tab: 'home', ctx: 'reference' };
  };

  /* ---------- किसी एक Subject का पूरा Reference ---------- */
  Ref.view = function (p) {
    var s = M.Subjects.get(p.subject);
    var m = MAP[p.subject];
    if (!s || !m) {
      return { html: '<section class="page"><div class="empty big"><div class="empty-ico">❓</div><h3>यह Subject यहाँ उपलब्ध नहीं</h3><button class="btn" data-action="nav" data-to="/reference">वापस जाओ</button></div></section>', title: 'Quick Reference', back: '/reference', tab: 'home', ctx: 'reference' };
    }
    return X.manifest('notes').then(function (mf) {
      var chapters = X.notesChapters(mf, p.subject);
      var jobs = chapters.map(function (no) {
        return M.Notes.loadMany(X.chapterEntries(mf, p.subject, no)).then(function (L) {
          return { no: no, title: L.title, items: (L.cats && L.cats[m.cat]) || [] };
        });
      });
      return Promise.all(jobs).then(function (chapList) {
        var withContent = chapList.filter(function (c) { return c.items.length; });
        var html = '<div class="card"><h2 class="card-title">' + m.icon + ' ' + esc(s.nameHi) + ' — ' + esc(m.label) + '</h2>' +
          '<p class="muted small">कुल ' + withContent.length + ' Chapter में मिला</p></div>';
        if (!withContent.length) {
          var out1 = html + '<div class="empty big"><div class="empty-ico">📭</div><h3>अभी कुछ उपलब्ध नहीं</h3><p class="muted small">जैसे-जैसे Notes में ' + esc(m.label) + ' जुड़ेगा, यहाँ अपने-आप दिखने लगेगा।</p></div>';
          return { html: '<section class="page">' + out1 + '</section>', title: m.label, sub: s.nameHi, back: '/reference', tab: 'home', ctx: 'reference' };
        }
        var allItems = [];
        withContent.forEach(function (c) { allItems = allItems.concat(c.items); });
        return X.ensureMathFor(allItems).then(function (mathOk) {
          withContent.forEach(function (c) {
            html += '<h3 class="sec-title">अध्याय ' + c.no + (c.title ? ' — ' + esc(c.title) : '') + '</h3><div class="nt-sheet">';
            c.items.forEach(function (it) { html += '<div class="nt-item">' + M.Notes.itemHtml(m.cat, it) + '</div>'; });
            html += '</div>';
          });
          var meta = { title: m.label, sub: s.nameHi, back: '/reference', tab: 'home', ctx: 'reference' };
          if (!mathOk) X.onMathReady(function () { if (M.Router.currentPath === '/reference/' + p.subject) M.Router.refresh(true); });
          meta.html = '<section class="page">' + html + '</section>';
          return meta;
        });
      });
    });
  };

  M.Reference = Ref;
})(window.M27 = window.M27 || {});
