/* ==========================================================
   quickcheck.js
   काम: पूरी Website पर हर ~10 मिनट Active Time पर (Background में,
   कहीं Timer नहीं दिखता) — विद्यार्थी उस वक़्त कहाँ है उसके हिसाब से:

   🅰 Notes पढ़ रहा हो        → छोटा 3-Question Quick Check
                                (सही जवाब पर 0.1 XP/सवाल, ≥1 सही पर 1 Motivational Quote, Skip कर सकते हैं)
   🅱 Quiz खेल रहा हो         → उसी वक़्त कुछ नहीं आता (टोकता नहीं); Quiz खत्म होने
                                के 2 मिनट बाद Card आता है
   🅲 न Notes, न Quiz        → ज़रूरी 10-Question Mistake-Test (Skip नहीं) — "गलतियाँ"
      (सिर्फ़ Idle/Games/...)  Notebook से (कम पड़े तो अनदेखे Chapters से, वो भी कम तो
                                Random से) — कम से कम 5/10 सही ज़रूरी, नहीं तो वही
                                10 सवाल फिर से; कोई XP नहीं (सिर्फ़ Revision)
                                (सिर्फ़ तभी जब कम से कम 1 "गलती" कभी दर्ज हुई हो —
                                बिल्कुल नए विद्यार्थी को यह Test नहीं आता)

   पुराना quiz.js / progress.js / XP / Fun Vault इस्तेमाल या बदले नहीं जाते —
   यह पूरी तरह अलग, छोटा सा System है।
   Data: mission2027_extras_v1 का "qc" भाग — { sec, xp, seen: [quote index...] }
   ========================================================== */
(function (M) {
  'use strict';

  var X = M.Extras;
  var QC = {};
  var THRESHOLD = 600;        // सेकंड (10 मिनट Active Time)
  var QUIZ_BUFFER = 120;      // Quiz खत्म होने के बाद इतने सेकंड (2 मिनट) रुककर Card आए
  var tickId = null;
  var pendingAfterQuiz = false;
  var bufferSec = 0;

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

  function esc(s) { return M.App.esc(s); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function store() {
    var s = X.store();
    if (!s.qc || typeof s.qc !== 'object') s.qc = { sec: 0, xp: 0, seen: [], streak: { current: 0, best: 0, lastDate: null } };
    if (!Array.isArray(s.qc.seen)) s.qc.seen = [];
    if (!s.qc.streak || typeof s.qc.streak !== 'object') s.qc.streak = { current: 0, best: 0, lastDate: null };
    return s.qc;
  }
  // "रोज़ का Check" Achievement के लिए — Notes वाला Quick Check किसी दिन पहली बार पूरा हो तभी दिन गिनो
  function bumpDailyStreak() {
    var s = store();
    var today = M.Storage.todayStr();
    if (s.streak.lastDate === today) return; // आज पहले ही गिन चुके
    var diff = s.streak.lastDate ? M.Storage.dayDiff(today, s.streak.lastDate) : null;
    s.streak.current = (diff === 1) ? s.streak.current + 1 : 1;
    if (s.streak.current > s.streak.best) s.streak.best = s.streak.current;
    s.streak.lastDate = today;
    X.save();
    if (M.Rewards && M.Rewards.checkAchievements) M.Rewards.checkAchievements();
  }
  function pickQuote() {
    var q = store();
    var pool = QUOTES.map(function (_, i) { return i; }).filter(function (i) { return q.seen.indexOf(i) < 0; });
    if (!pool.length) { q.seen = []; pool = QUOTES.map(function (_, i) { return i; }); }
    var idx = pool[Math.floor(Math.random() * pool.length)];
    q.seen.push(idx);
    return QUOTES[idx];
  }

  /* ---------- कहाँ है विद्यार्थी अभी ---------- */
  function path() { return (M.Router && M.Router.currentPath) || ''; }
  function notesChapterMatch() { return /^\/notes\/([^/]+)\/([^/]+)$/.exec(path()); }
  function isQuizPlaying() { var p = path(); return p === '/quiz' || p === '/xquiz'; }

  QC.notifyActive = function () { /* पहले इस्तेमाल होता था; अब Timer Route देखकर खुद तय करता है — कुछ करने की ज़रूरत नहीं */ };

  /* ---------- Global Timer — ऐप खुलते ही शुरू, कहीं दिखता नहीं ---------- */
  if (!tickId) tickId = setInterval(tick, 1000);
  function tick() {
    if (document.hidden || document.getElementById('qcCard')) return;
    if (pendingAfterQuiz) {
      if (isQuizPlaying()) return; // अभी भी Quiz चल रहा है, रुको
      bufferSec++;
      if (bufferSec >= QUIZ_BUFFER) { bufferSec = 0; pendingAfterQuiz = false; fire(); }
      return;
    }
    var s = store();
    s.sec = (s.sec || 0) + 1;
    if (s.sec >= THRESHOLD) {
      s.sec = 0; X.save();
      if (isQuizPlaying()) { pendingAfterQuiz = true; bufferSec = 0; }
      else fire();
    } else if (s.sec % 15 === 0) X.save();
  }

  function fire() {
    var m = notesChapterMatch();
    if (m) showReadingCard(m[1], m[2]);
    else showMistakeTest();
  }

  /* ==========================================================
     🅰 Notes पढ़ते वक़्त — 3-Question Quick Check
     ========================================================== */
  function showReadingCard(subject, chapter) {
    if (document.getElementById('qcCard') || !M.NotesGame) return;
    M.NotesGame.build(subject, chapter, { max: 3, need: 1 }).then(function (b) {
      var here = notesChapterMatch();
      if (!here || here[1] !== subject || here[2] !== chapter) return; // तब तक Chapter बदल गया
      if (!b.questions || !b.questions.length) return; // इतने कम Notes से Quiz नहीं बना, चुपचाप छोड़ो
      openCard({
        questions: b.questions.slice(0, 3),
        skip: true,
        xpPerCorrect: 0.1,
        quoteOnPass: true,
        passNeeded: 1,
        retryOnFail: false,
        countsForStreak: true
      });
    });
  }

  /* ==========================================================
     🅲 न Notes, न Quiz — 10-Question ज़रूरी Mistake-Test
     ========================================================== */
  function showMistakeTest() {
    if (document.getElementById('qcCard') || !M.Mistakes) return;
    var all = M.Mistakes.list({});
    if (!all.length) return; // कभी कोई गलती दर्ज ही नहीं हुई (बिल्कुल नया विद्यार्थी) — चुपचाप छोड़ो
    var qs = buildMistakeTestQuestions();
    if (qs.length < 3) return; // इतना कम Data है कि Test बनाना ठीक नहीं, छोड़ो
    openCard({
      questions: qs,
      skip: false,
      xpPerCorrect: 0,
      quoteOnPass: false,
      passNeeded: Math.ceil(qs.length / 2),
      retryOnFail: true,
      title: '📒 Revision Check'
    });
  }
  function buildMistakeTestQuestions() {
    var open = M.Mistakes.list({}).filter(function (m) { return !m.resolved; });
    var qs = open.slice(0, 10).map(function (m) {
      return { question: m.question, options: m.options, answer: m.answer };
    });
    if (qs.length < 10) {
      // बाकी सीटें उन Chapters के सवालों से भरो जो अभी तक Quiz नहीं हुए
      var fillers = [];
      M.Subjects.list().forEach(function (s) {
        s.chapters.forEach(function (c) {
          var key = s.id + '-' + c.number;
          var rec = M.Storage.state.chapters[key];
          if (rec && rec.attempts > 0) return; // पहले से Quiz हो चुका
          var pool = M.Chapters.questions(s.id, c.number);
          if (pool && pool.length) fillers.push(pool[Math.floor(Math.random() * pool.length)]);
        });
      });
      shuffle(fillers);
      while (qs.length < 10 && fillers.length) qs.push(fillers.pop());
    }
    if (qs.length < 10) {
      // सब Cover हो चुका है — पूरी तरह Random सवाल
      var allPool = [];
      M.Subjects.list().forEach(function (s) {
        s.chapters.forEach(function (c) { var pool = M.Chapters.questions(s.id, c.number); if (pool) allPool = allPool.concat(pool); });
      });
      shuffle(allPool);
      while (qs.length < 10 && allPool.length) qs.push(allPool.pop());
    }
    return qs;
  }

  /* ==========================================================
     साझा Card — दोनों तरह के Quick Check इसी से बनते हैं
     ========================================================== */
  function openCard(cfg) {
    var qs = cfg.questions;
    var idx = 0, correct = 0;
    var wrap = document.createElement('div');
    wrap.id = 'qcCard';
    wrap.className = 'qc-overlay';
    document.body.appendChild(wrap);

    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }

    function draw() {
      if (idx >= qs.length) return finish();
      var q = X.shuffleOptions(qs[idx]);
      wrap.innerHTML = '<div class="qc-card">' +
        '<div class="qc-head"><span class="qc-tag">' + (cfg.title || '⚡ Quick Check') + ' ' + (idx + 1) + '/' + qs.length + '</span>' +
        (cfg.skip ? '<button class="qc-skip" id="qcSkip" type="button">Skip ✕</button>' : '') + '</div>' +
        '<p class="qc-q">' + X.rich(q.question) + '</p><div class="qc-opts">' +
        ['A', 'B', 'C', 'D'].map(function (L) {
          return '<button class="qc-opt" data-l="' + L + '" type="button"><b>' + L + '</b> <span>' + X.rich(q.options[L]) + '</span></button>';
        }).join('') + '</div></div>';
      X.ensureMathFor(qs);
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
      var passed = correct >= cfg.passNeeded;
      if (cfg.countsForStreak) bumpDailyStreak(); // पूरा किया (Skip नहीं) — आज का दिन गिना
      if (cfg.xpPerCorrect) {
        var xp = Math.round(correct * cfg.xpPerCorrect * 10) / 10;
        var s = store();
        s.xp = Math.round(((s.xp || 0) + xp) * 10) / 10;
        X.save();
      }
      if (cfg.retryOnFail && !passed) {
        // कम से कम आधे सही होने तक यही सवाल फिर से
        wrap.innerHTML = '<div class="qc-card"><div class="qc-head"><span class="qc-tag">🔁 ' + correct + '/' + qs.length + ' — कम से कम ' + cfg.passNeeded + ' सही चाहिए, फिर से कोशिश करो</span></div></div>';
        setTimeout(function () { idx = 0; correct = 0; draw(); }, 1400);
        return;
      }
      var quoteHtml = '';
      if (cfg.quoteOnPass && correct >= 1) quoteHtml = '<div class="qc-quote">✨ ' + esc(pickQuote()) + '</div>';
      var xpLine = cfg.xpPerCorrect ? ' · +' + (Math.round(correct * cfg.xpPerCorrect * 10) / 10) + ' XP' : '';
      wrap.innerHTML = '<div class="qc-card"><div class="qc-head"><span class="qc-tag">' + (passed ? '✅' : '➖') + ' ' + correct + '/' + qs.length + ' सही' + xpLine + '</span></div>' +
        quoteHtml + '<button class="btn block" id="qcClose" type="button">📖 आगे बढ़ो</button></div>';
      var closeBtn = wrap.querySelector('#qcClose');
      if (closeBtn) closeBtn.onclick = close;
    }
    draw();
  }

  M.QuickCheck = QC;
})(window.M27 = window.M27 || {});
