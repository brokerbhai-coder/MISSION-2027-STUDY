/* ==========================================================
   games.js
   काम: पढ़ाई से जुड़ा Brain Game — "Match Master"।
   कार्ड पलटकर जोड़ी मिलाओ (जैसे राशि ↔ SI मात्रक, रचना ↔ रचनाकार)।

   - 4 तरह के Game: ⚛️ भौतिकी, 🧪 रसायन, 📖 हिंदी, 🎲 Mix
   - 3 स्तर: 🟢 आसान (6 जोड़ी), 🟡 मध्यम (8 जोड़ी), 🔴 कठिन (12 जोड़ी)
   - Timer, चाल, गलत जोड़ी, Combo, Hint, ⭐ Stars
   - हर Game + स्तर का अलग Best (कम चाल, फिर कम समय)
   - Quiz पूरा करने के बाद ही unlock होता है। जीत पर सीमित XP (दिन में अधिकतम 10 XP)।

   नई जोड़ियाँ जोड़नी हों तो नीचे POOLS में उसी विषय की list में एक लाइन बढ़ा दो:
   ['पहली तरफ़ का कार्ड', 'दूसरी तरफ़ का कार्ड']
   (ध्यान: एक ही text दो बार न आए, वरना कार्ड उलझेंगे।)
   ========================================================== */
(function (M) {
  'use strict';

  var G = {};
  var game = null;
  var flipTimer = null;
  var hintTimer = null;
  var clockId = null;
  function esc(s) { return M.App.esc(s); }

  /* ---------- जोड़ियों का भंडार ---------- */
  var POOLS = {
    physics: {
      icon: '⚛️', name: 'भौतिकी', title: 'राशि ↔ SI मात्रक',
      pairs: [
        ['विद्युत आवेश', 'कूलॉम (C)'],
        ['धारिता', 'फैराड (F)'],
        ['विभवान्तर', 'वोल्ट (V)'],
        ['वैद्युत धारा', 'ऐम्पियर (A)'],
        ['प्रतिरोध', 'ओम (Ω)'],
        ['चुम्बकीय फ्लक्स', 'वेबर (Wb)'],
        ['चुम्बकीय क्षेत्र (B)', 'टेस्ला (T)'],
        ['प्रेरकत्व', 'हेनरी (H)'],
        ['आवृत्ति', 'हर्ट्ज़ (Hz)'],
        ['शक्ति', 'वाट (W)'],
        ['विद्युत क्षेत्र की तीव्रता', 'न्यूटन/कूलॉम (N/C)'],
        ['विद्युत द्विध्रुव आघूर्ण', 'कूलॉम-मीटर (C·m)'],
        ['प्रतिरोधकता', 'ओम-मीटर (Ω·m)'],
        ['चुम्बकीय द्विध्रुव आघूर्ण', 'ऐम्पियर-मीटर² (A·m²)'],
        ['बल', 'न्यूटन (N)'],
        ['कार्य या ऊर्जा', 'जूल (J)'],
        ['विद्युत चालकता', 'सीमेन (S)'],
        ['विद्युत फ्लक्स', 'न्यूटन·मीटर²/कूलॉम (N·m²/C)'],
        ['चुम्बकशीलता (μ₀)', 'हेनरी/मीटर (H/m)'],
        ['विद्युतशीलता (ε₀)', 'फैराड/मीटर (F/m)'],
        ['धारा घनत्व', 'ऐम्पियर/मीटर² (A/m²)'],
        ['चुम्बकीय तीव्रता (H)', 'ऐम्पियर/मीटर (A/m)'],
        ['लेंस की क्षमता', 'डायोप्टर (D)'],
        ['रेडियोऐक्टिव सक्रियता', 'बेकरल (Bq)'],
        ['प्लांक नियतांक', 'जूल·सेकंड (J·s)'],
        ['अपवर्तनांक', 'कोई मात्रक नहीं'],
        ['तरंगदैर्घ्य', 'मीटर (m)'],
        ['प्रकाश की चाल', 'मीटर/सेकंड (m/s)']
      ]
    },
    chem: {
      icon: '🧪', name: 'रसायन', title: 'यौगिक-वर्ग / राशि ↔ सूत्र या मात्रक',
      pairs: [
        ['ऐल्कोहॉल', '–OH'],
        ['ऐल्डिहाइड', '–CHO'],
        ['कीटोन', '>C=O'],
        ['कार्बोक्सिलिक अम्ल', '–COOH'],
        ['ऐमीन', '–NH₂'],
        ['एस्टर', '–COOR'],
        ['ईथर', 'R–O–R′'],
        ['नाइट्रो यौगिक', '–NO₂'],
        ['अम्ल क्लोराइड', '–COCl'],
        ['ऐमाइड', '–CONH₂'],
        ['सायनाइड (नाइट्राइल)', '–C≡N'],
        ['फ़ीनॉल', 'C₆H₅OH'],
        ['ऐल्किल हैलाइड', 'R–X'],
        ['मोलरता (M)', 'mol/L'],
        ['मोललता (m)', 'mol/kg'],
        ['प्रथम कोटि का दर-स्थिरांक (k)', 's⁻¹'],
        ['शून्य कोटि का दर-स्थिरांक (k)', 'mol L⁻¹ s⁻¹'],
        ['मोलर चालकता (Λm)', 'S cm² mol⁻¹']
      ]
    },
    hindi: {
      icon: '📖', name: 'हिंदी', title: 'रचना ↔ रचनाकार',
      pairs: [
        ['बातचीत', 'बालकृष्ण भट्ट'],
        ['उसने कहा था', 'चंद्रधर शर्मा गुलेरी'],
        ['संपूर्ण क्रांति', 'जयप्रकाश नारायण'],
        ['अर्धनारीश्वर', 'रामधारी सिंह दिनकर'],
        ['रोज़', 'अज्ञेय'],
        ['एक लेख और एक पत्र', 'भगत सिंह'],
        ['ओ सदानीरा', 'जगदीशचंद्र माथुर'],
        ['सिपाही की माँ', 'मोहन राकेश'],
        ['प्रगीत और समाज', 'नामवर सिंह'],
        ['जूठन', 'ओमप्रकाश वाल्मीकि'],
        ['हँसते हुए मेरा अकेलापन', 'मलयज'],
        ['तिरिछ', 'उदय प्रकाश'],
        ['शिक्षा', 'जे. कृष्णमूर्ति'],
        ['कड़बक', 'मलिक मुहम्मद जायसी'],
        ['छप्पय', 'नाभादास'],
        ['कवित्त', 'घनानंद'],
        ['तुमुल कोलाहल कलह में', 'जयशंकर प्रसाद'],
        ['पुत्र वियोग', 'सुभद्राकुमारी चौहान'],
        ['उषा', 'शमशेर बहादुर सिंह'],
        ['जन-जन का चेहरा एक', 'गजानन माधव मुक्तिबोध'],
        ['अधिनायक', 'रघुवीर सहाय'],
        ['प्यारे नन्हें बेटे को', 'कुँवर नारायण'],
        ['हार-जीत', 'अशोक वाजपेयी'],
        ['गाँव का घर', 'ज्ञानेंद्रपति']
      ]
    }
  };
  var MODES = ['physics', 'chem', 'hindi', 'mix'];
  var MIX = { icon: '🎲', name: 'Mix', title: 'सब विषयों की मिली-जुली जोड़ियाँ' };

  var DIFFS = {
    easy:   { label: '🟢 आसान', pairs: 6,  cols: 3, xp: 5,  hints: 2 },
    medium: { label: '🟡 मध्यम', pairs: 8,  cols: 4, xp: 8,  hints: 2 },
    hard:   { label: '🔴 कठिन', pairs: 12, cols: 4, xp: 10, hints: 1 }
  };
  var DIFF_ORDER = ['easy', 'medium', 'hard'];

  G.POOLS = POOLS;
  G.DIFFS = DIFFS;

  /* ---------- थोड़ा extra design (style.css बदलने की ज़रूरत नहीं) ---------- */
  function injectCss() {
    if (document.getElementById('m27-game-css')) return;
    var s = document.createElement('style');
    s.id = 'm27-game-css';
    s.textContent =
      '.g-label{font-size:.78rem;color:var(--muted);margin:12px 0 6px;font-weight:600}' +
      '.g-chips{display:flex;flex-wrap:wrap;gap:8px}' +
      '.game-info{flex-wrap:wrap}' +
      '.game-tools{display:flex;justify-content:flex-end;margin:0 0 8px}' +
      '.game-board.dense .gcard{min-height:64px;font-size:.74rem;padding:4px;border-radius:12px}' +
      '.gcard.wrong{border-color:var(--red);background:rgba(251,113,133,.16);animation:gshake .35s}' +
      '.gcard.hint{border-color:var(--gold);background:rgba(245,196,81,.16)}' +
      '.gcard.hint span{color:var(--text)}' +
      '@keyframes gshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}';
    document.head.appendChild(s);
  }
  injectCss();

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function allPairs() {
    var out = [];
    ['physics', 'chem', 'hindi'].forEach(function (k) { POOLS[k].pairs.forEach(function (p) { out.push(p); }); });
    return out;
  }
  function modeInfo(mode) { return mode === 'mix' ? MIX : POOLS[mode]; }
  function fmt(sec) { var m = Math.floor(sec / 60), r = sec % 60; return m + ':' + (r < 10 ? '0' : '') + r; }

  /* ---------- चुना हुआ Game और स्तर (सेव रहता है) ---------- */
  function sel() {
    var l = (M.Storage.state.game && M.Storage.state.game.last) || {};
    return {
      mode: MODES.indexOf(l.mode) >= 0 ? l.mode : 'physics',
      diff: DIFFS[l.diff] ? l.diff : 'easy'
    };
  }

  function clearTimers() {
    if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
    stopClock();
  }

  function stopClock() { if (clockId) { clearInterval(clockId); clockId = null; } }
  function elapsed() { return game && game.startAt ? Math.floor((Date.now() - game.startAt) / 1000) : 0; }
  function startClock() {
    if (clockId) return;
    clockId = setInterval(function () {
      var el = document.getElementById('gameTime');
      if (!game || game.won || !game.started || !el) { stopClock(); return; }
      el.textContent = '⏱ ' + fmt(elapsed());
    }, 1000);
  }

  G.unlocked = function () { return M.Storage.state.quizHistory.length >= 1; };

  function newGame() {
    clearTimers();
    var s = sel();
    var d = DIFFS[s.diff];
    var source = s.mode === 'mix' ? allPairs() : POOLS[s.mode].pairs;
    var pool = shuffle(source.slice()).slice(0, Math.min(d.pairs, source.length));
    var cards = [];
    pool.forEach(function (p, i) {
      cards.push({ pair: i, text: p[0], kind: 'q' });
      cards.push({ pair: i, text: p[1], kind: 'a' });
    });
    shuffle(cards);
    game = {
      mode: s.mode, diff: s.diff, total: pool.length, cards: cards,
      open: [], matched: {}, matchedCount: 0, moves: 0, mistakes: 0, combo: 0, bestCombo: 0,
      hintsLeft: d.hints, hintUsed: 0, hintCards: [], wrong: [],
      busy: false, won: false, started: false, startAt: 0,
      seconds: 0, stars: 0, reward: 0, newBest: false
    };
  }

  G.setSel = function (mode, diff) {
    var st = M.Storage.state;
    var s = sel();
    if (mode && MODES.indexOf(mode) >= 0) s.mode = mode;
    if (diff && DIFFS[diff]) s.diff = diff;
    st.game.last = { mode: s.mode, diff: s.diff };
    M.Storage.save();
    newGame();
    M.Router.refresh(true);
  };

  function bestOf(mode, diff) {
    var b = M.Storage.state.game.best || {};
    return b[mode + '-' + diff] || null;
  }

  /* ---------- बोर्ड ---------- */
  function boardHtml() {
    var d = DIFFS[game.diff];
    var t = game.started ? elapsed() : game.seconds;
    var html = '<div class="game-info">' +
      '<span class="chip">चाल: ' + game.moves + '</span>' +
      '<span class="chip" id="gameTime">⏱ ' + fmt(game.won ? game.seconds : t) + '</span>' +
      '<span class="chip">जोड़ियाँ: ' + game.matchedCount + ' / ' + game.total + '</span>' +
      (game.combo >= 2 ? '<span class="chip ok">🔥 कॉम्बो ×' + game.combo + '</span>' : '') +
      '</div>';

    if (!game.won) {
      html += '<div class="game-tools"><button class="chip-btn" data-g="hint"' + (game.hintsLeft > 0 ? '' : ' disabled') + '>💡 Hint (' + game.hintsLeft + ')</button></div>';
    }

    html += '<div class="game-board' + (game.diff === 'easy' ? '' : ' dense') + '" style="grid-template-columns:repeat(' + d.cols + ',1fr)">';
    game.cards.forEach(function (c, i) {
      var isMatched = !!game.matched[c.pair];
      var isOpen = game.open.indexOf(i) >= 0;
      var isHint = game.hintCards.indexOf(i) >= 0;
      var isWrong = game.wrong.indexOf(i) >= 0;
      var show = isMatched || isOpen || isHint;
      var cls = 'gcard ' + c.kind + (isMatched ? ' matched' : '') + (isOpen ? ' open' : '') + (isHint ? ' hint' : '') + (isWrong ? ' wrong' : '');
      html += '<button class="' + cls + '" data-action="game-flip" data-idx="' + i + '"' + (isMatched ? ' disabled' : '') + ' aria-label="कार्ड ' + (i + 1) + '">' +
        (show ? '<span>' + esc(c.text) + '</span>' : '<span class="q">?</span>') + '</button>';
    });
    html += '</div>';

    if (game.won) {
      var stars = '';
      for (var k = 0; k < 3; k++) stars += (k < game.stars ? '⭐' : '☆');
      html += '<div class="banner ok"><strong>🎉 सारी ' + game.total + ' जोड़ियाँ मिल गईं!</strong> ' + stars + '<br>' +
        game.moves + ' चाल · ' + fmt(game.seconds) + ' · गलत जोड़ी ' + game.mistakes + ' · सबसे बड़ा कॉम्बो ×' + game.bestCombo + '<br>' +
        (game.newBest ? '🏆 नया Best रिकॉर्ड!<br>' : '') +
        (game.reward ? '+' + game.reward + ' XP मिला।' : 'आज का Game XP (' + M.Rewards.CONST.GAME_DAILY_CAP + ') पूरा हो चुका है, पर खेलना जारी रख सकते हो।') + '</div>';
    }
    return html;
  }

  function rerender() {
    var el = document.getElementById('gameArea');
    if (el && game) el.innerHTML = boardHtml();
  }

  G.newGame = function () { newGame(); rerender(); };

  G.flip = function (idx) {
    if (!game || game.busy || game.won) return;
    if (game.open.indexOf(idx) >= 0 || game.matched[game.cards[idx].pair]) return;
    var st = M.Storage.state;
    if (!game.started) {
      game.started = true;
      game.startAt = Date.now();
      st.game.plays += 1;
      M.Rewards.checkAchievements();
      M.Storage.save();
      startClock();
    }
    game.open.push(idx);
    if (game.open.length === 2) {
      game.moves += 1;
      var a = game.cards[game.open[0]];
      var b = game.cards[game.open[1]];
      if (a.pair === b.pair) {
        game.matched[a.pair] = true;
        game.matchedCount += 1;
        game.combo += 1;
        if (game.combo > game.bestCombo) game.bestCombo = game.combo;
        game.open = [];
        if (game.matchedCount === game.total) win();
      } else {
        game.mistakes += 1;
        game.combo = 0;
        game.wrong = game.open.slice();
        game.busy = true;
        rerender();
        flipTimer = setTimeout(function () {
          game.open = [];
          game.wrong = [];
          game.busy = false;
          flipTimer = null;
          rerender();
        }, 900);
        return;
      }
    }
    rerender();
  };

  /* Hint: एक जोड़ी 1.3 सेकंड के लिए दिखती है (⭐⭐⭐ के लिए Hint नहीं लेना) */
  G.hint = function () {
    if (!game || game.won || game.busy || game.hintsLeft <= 0) return;
    var pairId = -1;
    if (game.open.length === 1) {
      pairId = game.cards[game.open[0]].pair;
    } else {
      var left = [];
      for (var p = 0; p < game.total; p++) { if (!game.matched[p]) left.push(p); }
      if (!left.length) return;
      pairId = left[Math.floor(Math.random() * left.length)];
    }
    var idxs = [];
    game.cards.forEach(function (c, i) { if (c.pair === pairId) idxs.push(i); });
    game.hintCards = idxs;
    game.hintsLeft -= 1;
    game.hintUsed += 1;
    game.busy = true;
    rerender();
    hintTimer = setTimeout(function () {
      game.hintCards = [];
      game.busy = false;
      hintTimer = null;
      rerender();
    }, 1300);
  };

  function win() {
    stopClock();
    var st = M.Storage.state;
    var d = DIFFS[game.diff];
    game.won = true;
    game.seconds = Math.max(1, elapsed());
    st.game.wins += 1;

    // ⭐ Stars: कम चाल और बिना Hint = 3
    if (game.hintUsed === 0 && game.moves <= Math.ceil(game.total * 1.6)) game.stars = 3;
    else if (game.moves <= Math.ceil(game.total * 2.5)) game.stars = 2;
    else game.stars = 1;

    // Best: पहले कम चाल, बराबर हों तो कम समय
    var key = game.mode + '-' + game.diff;
    if (!st.game.best) st.game.best = {};
    var prev = st.game.best[key];
    if (!prev || game.moves < prev.moves || (game.moves === prev.moves && game.seconds < prev.seconds)) {
      st.game.best[key] = { moves: game.moves, seconds: game.seconds };
      game.newBest = !!prev;   // पहली जीत पर "नया रिकॉर्ड" नहीं दिखाते
    }

    game.reward = M.Rewards.awardGame(d.xp);
    M.Rewards.checkAchievements();
    M.Storage.save();
  }

  /* ---------- पेज ---------- */
  G.view = function () {
    var st = M.Storage.state;
    if (!G.unlocked()) {
      return {
        html: '<section class="page"><div class="empty big"><div class="empty-ico">🔒</div><h3>Brain Game अभी बंद है</h3>' +
          '<p>कम से कम एक Quiz पूरा करो, तब यह Game खुलेगा।</p>' +
          '<button class="btn" data-action="nav" data-to="/subjects">Quiz शुरू करो</button></div></section>',
        title: 'Brain Game', back: '/home', tab: 'home', ctx: 'game'
      };
    }
    var s = sel();
    if (!game || game.mode !== s.mode || game.diff !== s.diff) newGame();
    if (game.started && !game.won) startClock();

    var d = DIFFS[s.diff];
    var info = modeInfo(s.mode);
    var best = bestOf(s.mode, s.diff);

    var modeChips = MODES.map(function (m) {
      var mi = modeInfo(m);
      return '<button class="chip-btn' + (m === s.mode ? ' on' : '') + '" data-g="mode" data-v="' + m + '">' + mi.icon + ' ' + esc(mi.name) + '</button>';
    }).join('');
    var diffChips = DIFF_ORDER.map(function (k) {
      return '<button class="chip-btn' + (k === s.diff ? ' on' : '') + '" data-g="diff" data-v="' + k + '">' + DIFFS[k].label + '</button>';
    }).join('');

    var html = '<section class="page"><div class="card"><h3 class="card-title">🎮 Match Master</h3>' +
      '<p>कार्ड पलटकर जोड़ी मिलाओ — <b>' + esc(info.title) + '</b>। कम चाल और कम समय में सारी ' + d.pairs + ' जोड़ियाँ खोजो।</p>' +
      '<div class="g-label">कौन-सा Game</div><div class="g-chips">' + modeChips + '</div>' +
      '<div class="g-label">स्तर</div><div class="g-chips">' + diffChips + '</div>' +
      '<p class="muted small" style="margin-top:12px">Best: ' + (best ? best.moves + ' चाल · ' + fmt(best.seconds) : '—') +
      ' · जीत पर +' + d.xp + ' XP (दिन में अधिकतम ' + M.Rewards.CONST.GAME_DAILY_CAP + ' XP) · जीते: ' + st.game.wins + ' / खेले: ' + st.game.plays + '</p></div>' +
      '<div id="gameArea">' + boardHtml() + '</div>' +
      '<button class="btn ghost block" data-action="game-new">🔄 नया Game</button></section>';
    return { html: html, title: 'Brain Game', back: '/home', tab: 'home', ctx: 'game' };
  };

  /* Game / स्तर / Hint के बटन (app.js में बदलाव की ज़रूरत नहीं) */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-g]') : null;
    if (!t || t.disabled) return;
    var kind = t.getAttribute('data-g');
    var val = t.getAttribute('data-v');
    if (kind === 'mode') G.setSel(val, null);
    else if (kind === 'diff') G.setSel(null, val);
    else if (kind === 'hint') G.hint();
  });

  M.Games = G;
})(window.M27 = window.M27 || {});
