/* ==========================================================
   games.js
   काम: पढ़ाई से जुड़ा छोटा Brain Game — "Unit Match".
   हर कार्ड जोड़ी में एक राशि (जैसे धारिता) और उसका SI मात्रक (जैसे फैराड) होता है।
   Quiz पूरा करने के बाद ही unlock होता है। जीतने पर सीमित XP (दिन में 20 तक)।
   नई जोड़ियाँ जोड़नी हों तो नीचे PAIRS में एक लाइन बढ़ा दो।
   ========================================================== */
(function (M) {
  'use strict';

  var G = {};
  var game = null;
  var timerId = null;
  function esc(s) { return M.App.esc(s); }

  var PAIRS = [
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
    ['चुम्बकीय द्विध्रुव आघूर्ण', 'ऐम्पियर-मीटर² (A·m²)']
  ];

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  G.unlocked = function () { return M.Storage.state.quizHistory.length >= 1; };

  function newGame() {
    if (timerId) { clearTimeout(timerId); timerId = null; }
    var pool = shuffle(PAIRS.slice()).slice(0, 6);
    var cards = [];
    pool.forEach(function (p, i) {
      cards.push({ pair: i, text: p[0], kind: 'q' });
      cards.push({ pair: i, text: p[1], kind: 'a' });
    });
    shuffle(cards);
    game = { cards: cards, open: [], matched: {}, moves: 0, busy: false, won: false, reward: 0, started: false };
  }

  function boardHtml() {
    var html = '<div class="game-info"><span class="chip">चाल: ' + game.moves + '</span><span class="chip">जोड़ियाँ: ' + Object.keys(game.matched).length + ' / 6</span></div><div class="game-board">';
    game.cards.forEach(function (c, i) {
      var isMatched = !!game.matched[c.pair];
      var isOpen = game.open.indexOf(i) >= 0;
      var cls = 'gcard ' + c.kind + (isMatched ? ' matched' : '') + (isOpen ? ' open' : '');
      html += '<button class="' + cls + '" data-action="game-flip" data-idx="' + i + '"' + (isMatched ? ' disabled' : '') + ' aria-label="कार्ड ' + (i + 1) + '">' +
        ((isMatched || isOpen) ? '<span>' + esc(c.text) + '</span>' : '<span class="q">?</span>') + '</button>';
    });
    html += '</div>';
    if (game.won) {
      html += '<div class="banner ok"><strong>🎉 सब जोड़ियाँ मिल गईं — ' + game.moves + ' चाल में!</strong><br>' +
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
    if (!game.started) { game.started = true; st.game.plays += 1; M.Rewards.checkAchievements(); M.Storage.save(); }
    game.open.push(idx);
    if (game.open.length === 2) {
      game.moves += 1;
      var a = game.cards[game.open[0]];
      var b = game.cards[game.open[1]];
      if (a.pair === b.pair) {
        game.matched[a.pair] = true;
        game.open = [];
        if (Object.keys(game.matched).length === 6) win();
      } else {
        game.busy = true;
        rerender();
        timerId = setTimeout(function () {
          game.open = [];
          game.busy = false;
          timerId = null;
          rerender();
        }, 900);
        return;
      }
    }
    rerender();
  };

  function win() {
    var st = M.Storage.state;
    game.won = true;
    st.game.wins += 1;
    if (st.game.bestMoves === null || game.moves < st.game.bestMoves) st.game.bestMoves = game.moves;
    game.reward = M.Rewards.awardGame();
    M.Rewards.checkAchievements();
    M.Storage.save();
  }

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
    if (!game) newGame();
    var html = '<section class="page"><div class="card"><h3 class="card-title">🎮 Unit Match</h3>' +
      '<p>कार्ड पलटकर <b>राशि</b> और उसका सही <b>SI मात्रक</b> जोड़ी में मिलाओ। कम से कम चाल में सारी 6 जोड़ियाँ खोजो।</p>' +
      '<p class="muted small">Best: ' + (st.game.bestMoves === null ? '—' : st.game.bestMoves + ' चाल') + ' · जीत पर +' + M.Rewards.CONST.GAME_XP + ' XP (दिन में अधिकतम ' + M.Rewards.CONST.GAME_DAILY_CAP + ' XP)</p></div>' +
      '<div id="gameArea">' + boardHtml() + '</div>' +
      '<button class="btn ghost block" data-action="game-new">🔄 नया Game</button></section>';
    return { html: html, title: 'Brain Game', back: '/home', tab: 'home', ctx: 'game' };
  };

  M.Games = G;
})(window.M27 = window.M27 || {});
