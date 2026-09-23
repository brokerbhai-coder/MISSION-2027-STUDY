/* ==========================================================
   quickcheck.js  (नया)
   काम: "Quick Check" — Notes पढ़ते वक़्त हर ~10 मिनट Active Reading पर
   बीच में ही एक छोटा 3-सवाल का Quiz-Card अपने-आप आता है।
   - हर सही जवाब पर 0.1 XP (ज़्यादा से ज़्यादा 0.3 इस एक Check में)
   - कम से कम 1 सही जवाब आने पर 1 Motivational Quote/Shayari खुलती है
   - Skip किया जा सकता है — तब कोई XP/Quote नहीं, Timer फिर से 10 मिनट पर सेट
   - Timer सिर्फ़ तभी गिनता है जब विद्यार्थी सच में उसी Chapter के Notes पर हो
     (Tab बदलने/Screen Off पर रुक जाता है — quiz timer जैसा ही तरीका)

   पुराना quiz.js / progress.js / XP / Fun Vault इस्तेमाल या बदले नहीं जाते —
   यह पूरी तरह अलग, छोटा सा System है।
   Data: mission2027_extras_v1 का "qc" भाग — { sec, xp, seen: [quote index...] }
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var QC = {};
  var THRESHOLD = 600; // सेकंड (10 मिनट Active Reading)
  var tickId = null;
  var current = null; // { subject, chapter } — अभी किस Chapter के Notes खुले हैं

  // मौलिक (खुद लिखी) प्रेरणादायक पंक्तियाँ — पढ़ाई/परीक्षा की मेहनत के लिए
  var QUOTES = [
    'आज का एक घंटा पढ़ाई, कल के एक दिन की घबराहट बचा लेता है।',
    'रिज़ल्ट अच्छा तब आता है जब मेहनत किसी को दिखानी नहीं, बस करनी होती है।',
    'जो चैप्टर सबसे मुश्किल लगे, उसी को सबसे पहले हाथ लगाओ — बाकी सब आसान हो जाएगा।',
    'हर बार दोहराने से डर नहीं, याद पक्की होती है।',
    'आज थोड़ा थक गए तो ठीक है, बस कल फिर से बैठ जाना — यही आदत जीत दिलाती है।',
    'नंबर कम आएँ तो घबराओ मत, यह बताता है अगली बार कहाँ ज़्यादा मेहनत करनी है।',
    'जो लोग रोज़ थोड़ा-थोड़ा पढ़ते हैं, वही परीक्षा के आख़िरी हफ़्ते में सबसे शांत रहते हैं।',
    'खुद को दूसरों से नहीं, कल के अपने-आप से बेहतर बनाओ।',
    'एक अच्छी नींद, एक और घंटे की पढ़ाई से कम ज़रूरी नहीं है।',
    'जितनी बार गलत जवाब मिले, समझो उतनी बार सही जवाब पक्का हो रहा है।',
    'बड़ा सपना डरावना नहीं होता, बस उसे छोटे-छोटे Chapter में बाँट लो।',
    'आज जो Notes पढ़े, वही कल परीक्षा में हाथ पकड़ेंगे।',
    'हार मानने का सबसे बड़ा कारण होता है — बीच में रुक जाना, हारना नहीं।',
    'जो सवाल आज नहीं आता, वही सबसे अच्छा टीचर है — उसे हल करना सीख लो।',
    'खुद पर भरोसा रखना उतना ही ज़रूरी है जितना किताब पर।',
    'मेहनत कभी दिखती नहीं, बस रिज़ल्ट के दिन बोलती है।',
    'थोड़ा रुक जाना ठीक है, थम जाना नहीं।',
    'जो आज मुश्किल है, वही कल की सबसे बड़ी ताकत बनेगा।',
    'हर Revision के साथ डर थोड़ा कम, भरोसा थोड़ा ज़्यादा होता जाता है।',
    'खुद को समय दो — हर कोई अपनी रफ़्तार से आगे बढ़ता है।',
    'जितना पढ़ोगे, उतना ही परीक्षा हॉल में शांत महसूस करोगे।',
    'गलती से सीखना ही असली पढ़ाई है, सिर्फ़ सही जवाब रटना नहीं।',
    'आज की मेहनत किसी को नहीं दिखेगी, पर कल का रिज़ल्ट सबको दिखेगा।',
    'जो कठिन दिखे, बस उसे एक बार और पढ़ लो — यही फ़र्क डालता है।',
    'सफलता उन्हीं की होती है जो थककर भी एक Chapter और खोल लेते हैं।',
    'हर दिन थोड़ा पढ़ना, एक दिन में सब कुछ पढ़ने से बेहतर है।',
    'खुद से यह मत पूछो "कितना बचा है", यह पूछो "आज कितना किया"।',
    'डर लगना बुरा नहीं है, डर से भाग जाना बुरा है।',
    'जो आज याद कर लिया, वो कल किसी काम आएगा — यकीन रखो।',
    'तुलना दूसरों से नहीं, अपनी कल की मेहनत से करो।',
    'हर Formula, हर Definition — एक-एक ईंट है, जिससे रिज़ल्ट की दीवार बनती है।',
    'थकान असली है, पर हार मानना एक चुनाव है — दोनों में फ़र्क समझो।',
    'जो रोज़ थोड़ा पढ़ता है, वो परीक्षा से एक रात पहले चैन से सोता है।',
    'खुद को याद दिलाओ — तुम यहाँ किसी और के लिए नहीं, अपने लिए बैठे हो।',
    'सवाल कठिन है तो घबराओ मत, बस उसे छोटे हिस्सों में तोड़ लो।',
    'आज जो मेहनत लग रही है, वही कल का सबसे बड़ा सहारा बनेगी।',
    'रिज़ल्ट का दिन दूर है, पर आज की मेहनत का दिन आज ही है।',
    'हर बार गलत होकर सही सीखना, सीधे सही होने से ज़्यादा मज़बूत बनाता है।',
    'जितनी बार मन भटके, उतनी बार वापस किताब की तरफ़ लौट आना ही जीत है।',
    'खुद पर यकीन करना बंद मत करो, बाकी सब बाद में सही हो जाता है।',
    'जो आज लिखकर याद किया, वो कल पेपर में सबसे पहले याद आएगा।',
    'हर मुश्किल Chapter के बाद एक आसान Chapter ज़रूर आता है — बस डटे रहो।',
    'आराम भी पढ़ाई का हिस्सा है, बस उसकी सीमा खुद तय करो।',
    'जो लक्ष्य लिखकर रखा है, उसे रोज़ थोड़ा-थोड़ा करके ही पाया जाता है।',
    'खुद से किया वादा सबसे ज़रूरी वादा होता है — आज का पढ़ाई वाला वादा निभाओ।',
    'हर Revision के साथ तुम कल से बेहतर बन रहे हो, भले महसूस न हो।',
    'डर के बजाय तैयारी को बड़ा होने दो।',
    'जो मेहनत आज दिख नहीं रही, वो रिज़ल्ट के दिन ज़रूर दिखेगी।',
    'छोटी शुरुआत भी शुरुआत है — आज का एक Page भी कल का आधार है।',
    'खुद को कमज़ोर मत समझो, अभी सिर्फ़ अभ्यास कम हुआ है।',
    'जो आज की थकान से नहीं डरता, वही कल का रिज़ल्ट बदलता है।',
    'हर बार जब मन करे छोड़ने का, याद रखो — तुम यहाँ तक क्यों आए थे।'
  ];

  function store() {
    var s = X.store();
    if (!s.qc || typeof s.qc !== 'object') s.qc = { sec: 0, xp: 0, seen: [] };
    if (!Array.isArray(s.qc.seen)) s.qc.seen = [];
    return s.qc;
  }
  function pickQuote() {
    var q = store();
    var pool = QUOTES.map(function (_, i) { return i; }).filter(function (i) { return q.seen.indexOf(i) < 0; });
    if (!pool.length) { q.seen = []; pool = QUOTES.map(function (_, i) { return i; }); }
    var idx = pool[Math.floor(Math.random() * pool.length)];
    q.seen.push(idx);
    return QUOTES[idx];
  }

  /* ---------- Timer: सिर्फ़ उसी Chapter के Notes पर हो तभी गिनो ---------- */
  QC.notifyActive = function (subject, chapter) {
    current = { subject: subject, chapter: chapter };
    if (!tickId) tickId = setInterval(tick, 1000);
  };
  function tick() {
    if (!current) { clearInterval(tickId); tickId = null; return; }
    var here = '/notes/' + current.subject + '/' + current.chapter;
    if (!M.Router || M.Router.currentPath !== here) { current = null; clearInterval(tickId); tickId = null; return; }
    if (document.hidden || document.getElementById('qcCard')) return; // Screen बंद हो या Card पहले से खुला हो तो मत गिनो
    var s = store();
    s.sec = (s.sec || 0) + 1;
    if (s.sec >= THRESHOLD) { s.sec = 0; X.save(); showCard(); }
    else if (s.sec % 15 === 0) X.save();
  }

  /* ---------- Card दिखाना ---------- */
  function esc(s) { return M.App.esc(s); }
  function showCard() {
    if (!current || document.getElementById('qcCard')) return;
    var subject = current.subject, chapter = current.chapter;
    if (!M.NotesGame) return;
    M.NotesGame.build(subject, chapter, { max: 3, need: 1 }).then(function (b) {
      if (!current || !b.questions || !b.questions.length) return; // इतने कम Notes से Quiz नहीं बना, चुपचाप छोड़ो
      renderCard(b.questions.slice(0, 3));
    });
  }
  function renderCard(qs) {
    var idx = 0, correct = 0;
    var wrap = document.createElement('div');
    wrap.id = 'qcCard';
    wrap.className = 'qc-overlay';
    document.body.appendChild(wrap);

    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }

    function draw() {
      if (idx >= qs.length) return finish();
      var q = qs[idx];
      wrap.innerHTML = '<div class="qc-card">' +
        '<div class="qc-head"><span class="qc-tag">⚡ Quick Check ' + (idx + 1) + '/' + qs.length + '</span>' +
        '<button class="qc-skip" id="qcSkip" type="button">Skip ✕</button></div>' +
        '<p class="qc-q">' + X.rich(q.question) + '</p><div class="qc-opts">' +
        ['A', 'B', 'C', 'D'].map(function (L) {
          return '<button class="qc-opt" data-l="' + L + '" type="button"><b>' + L + '</b> <span>' + X.rich(q.options[L]) + '</span></button>';
        }).join('') + '</div></div>';
      X.ensureMathFor(qs); // देर से KaTeX आए तो अगला Card सही दिखेगा (अभी वाले पर असर नहीं, यह बस भविष्य के लिए तैयार करता है)
      var skipBtn = wrap.querySelector('#qcSkip');
      if (skipBtn) skipBtn.onclick = close;
      var opts = wrap.querySelectorAll('.qc-opt');
      for (var i = 0; i < opts.length; i++) {
        (function (btn) {
          btn.onclick = function () {
            var L = btn.dataset.l;
            if (L === q.answer) correct++;
            for (var j = 0; j < opts.length; j++) {
              opts[j].disabled = true;
              if (opts[j].dataset.l === q.answer) opts[j].classList.add('right');
              else if (opts[j] === btn) opts[j].classList.add('wrong');
            }
            setTimeout(function () { idx++; draw(); }, 900);
          };
        })(opts[i]);
      }
    }
    function finish() {
      var xp = Math.round(correct * 0.1 * 10) / 10;
      var s = store();
      s.xp = Math.round(((s.xp || 0) + xp) * 10) / 10;
      X.save();
      var quoteHtml = '';
      if (correct >= 1) quoteHtml = '<div class="qc-quote">✨ ' + esc(pickQuote()) + '</div>';
      wrap.innerHTML = '<div class="qc-card"><div class="qc-head"><span class="qc-tag">' + (correct ? '✅' : '➖') + ' ' + correct + '/' + qs.length + ' सही · +' + xp + ' XP</span></div>' +
        quoteHtml + '<button class="btn block" id="qcClose" type="button">📖 पढ़ना जारी रखो</button></div>';
      var closeBtn = wrap.querySelector('#qcClose');
      if (closeBtn) closeBtn.onclick = close;
    }
    draw();
  }

  M.QuickCheck = QC;
})(window.M27 = window.M27 || {});
