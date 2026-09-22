/* ==========================================================
   sound.js  (नया)
   काम: पूरी website के लिए Sound।

   - सारी आवाज़ें browser के अंदर ही बनती हैं (Web Audio) — कोई audio फ़ाइल नहीं,
     कोई download नहीं, कोई copyright नहीं।
   - ऊपर के 🔊 बटन से: Sound चालू/बंद, और "Focus आवाज़" (हल्की, लगातार चलने वाली शांत आवाज़)।
   - Focus आवाज़ और Sound की पसंद अलग key (mission2027_sound_v1) में सेव होती है।
   - सही/गलत जवाब, कार्ड पलटना, जोड़ी मिलना, Result, Level Up और Vault खुलना पर
     अपने-आप बजता है। पुरानी Quiz और Match Master की फ़ाइलें बदले बिना, पेज पर
     दिख रहे बदलाव देखकर (सिर्फ़ तुम्हारे टैप के तुरंत बाद) sound बजाया जाता है।
   ========================================================== */
(function (M) {
  'use strict';

  var S = { _log: [] };
  var KEY = 'mission2027_sound_v1';
  var cfg = { on: true, focus: true };   // Focus आवाज़ अब पहले से चालू (default ON)
  var ctx = null, master = null, amb = null;

  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') { cfg.on = p.on !== false; cfg.focus = p.focus === true; } }
  } catch (e) { /* ignore */ }
  function saveCfg() { try { window.localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }

  /* ---------- आवाज़ें बनाना ---------- */
  var N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5 };
  function osc(c, dest, f, t, d, type, v, glide) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.05);
  }
  // हर आवाज़: function(context, destination, startTime)
  S.defs = {
    flip: function (c, d, t) { osc(c, d, 620, t, 0.07, 'triangle', 0.10, 420); },
    correct: function (c, d, t) { osc(c, d, N.E5, t, 0.16, 'sine', 0.16); osc(c, d, N.A5, t + 0.09, 0.26, 'sine', 0.16); },
    match: function (c, d, t) { osc(c, d, N.E5, t, 0.14, 'sine', 0.15); osc(c, d, N.G5, t + 0.08, 0.14, 'sine', 0.15); osc(c, d, N.C6, t + 0.16, 0.30, 'sine', 0.15); },
    wrong: function (c, d, t) { osc(c, d, 210, t, 0.24, 'triangle', 0.16, 140); },
    win: function (c, d, t) { [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { osc(c, d, f, t + i * 0.11, 0.34, 'sine', 0.15); }); },
    levelup: function (c, d, t) { [N.C5, N.E5, N.G5, N.C6, N.E6].forEach(function (f, i) { osc(c, d, f, t + i * 0.09, 0.38, 'triangle', 0.14); }); osc(c, d, N.C6, t + 0.5, 0.6, 'sine', 0.10); },
    unlock: function (c, d, t) { osc(c, d, N.G4, t, 0.2, 'sine', 0.14); osc(c, d, N.C5, t + 0.12, 0.2, 'sine', 0.14); osc(c, d, N.E5, t + 0.24, 0.2, 'sine', 0.14); osc(c, d, N.G5, t + 0.36, 0.5, 'sine', 0.14); },
    lock: function (c, d, t) { osc(c, d, N.G5, t, 0.2, 'sine', 0.12); osc(c, d, N.C5, t + 0.16, 0.4, 'sine', 0.12); },
    // Focus की शुरुआत: नरम, धीमी घंटी — ध्यान खींचती है पर चौंकाती नहीं
    start: function (c, d, t) { osc(c, d, N.A4, t, 1.1, 'sine', 0.12); osc(c, d, N.E5, t + 0.22, 1.4, 'sine', 0.10); },
    done: function (c, d, t) { osc(c, d, N.A5, t, 0.3, 'sine', 0.10); }
  };

  /* ---------- AudioContext ---------- */
  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return ctx;
  }

  S.play = function (name) {
    if (!cfg.on || !S.defs[name]) return;
    S._log.push(name);
    if (S._log.length > 50) S._log.shift();
    var c = ensure();
    if (!c) return;
    try { S.defs[name](c, master, c.currentTime + 0.01); } catch (e) { /* ignore */ }
  };

  /* ---------- Focus आवाज़ (हल्का भूरा शोर, बहुत धीमा) — जब कोई अपना गाना न हो तब ---------- */
  function noiseBuffer(c) {
    var len = c.sampleRate * 6;
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0), last = 0, i;
    for (i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    var edge = Math.floor(c.sampleRate * 0.15);
    for (i = 0; i < edge; i++) { var k = i / edge; d[i] *= k; d[len - 1 - i] *= k; }
    return buf;
  }
  function startNoise() {
    var c = ensure();
    if (!c || amb) return;
    var src = c.createBufferSource(); src.buffer = noiseBuffer(c); src.loop = true;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.07, c.currentTime + 2.5);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start();
    amb = { kind: 'noise', src: src, g: g };
    S._log.push('focus-on');
  }

  /* ---------- Focus का अपना गाना (तुम्हारी अपनी mp3/ogg फ़ाइलें, copyright-free) ----------
     data/focus-music/manifest.json में गानों की सूची डालो; website उन्हें बारी-बारी
     (बिना तुरंत दोहराए) बजाती है, ताज़ा जोड़ी फ़ाइल अपने-आप पहचान लेती है — कोई code नहीं बदलना।
     फ़ाइल न मिले या manifest न हो तो चुपचाप ऊपर वाली हल्की आवाज़ (noise) पर वापस चली जाती है। */
  var MUSIC_URL = 'data/focus-music/manifest.json';
  var musicP = null, musicOrder = [], musicPos = 0, musicBroken = false, musicFails = 0;
  function safeAudioPath(p) {
    if (typeof p !== 'string') return null;
    p = p.trim();
    if (!p || /^[a-z][a-z0-9+.-]*:/i.test(p) || p.charAt(0) === '/' || p.charAt(0) === '\\' || p.indexOf('..') >= 0) return null;
    if (!/\.(mp3|ogg|wav|m4a|aac)$/i.test(p)) return null;
    return p;
  }
  function loadMusicManifest() {
    if (!musicP) {
      musicP = fetch(MUSIC_URL, { cache: 'no-cache' }).then(function (res) { return res.ok ? res.json() : null; })
        .then(function (raw) {
          var list = raw && Array.isArray(raw.tracks) ? raw.tracks : [];
          var out = [];
          list.forEach(function (t) {
            var file = t && safeAudioPath(t.file);
            if (file) out.push({ file: file, title: (t.title && String(t.title).trim()) || file.split('/').pop() });
          });
          return out;
        }).catch(function () { return []; });
    }
    return musicP;
  }
  function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function nextOrder(n) { musicOrder = shuffle(Array.from({ length: n }, function (_, i) { return i; })); musicPos = 0; }

  function playTrack(tracks, idx) {
    var c = ensure();
    if (!c) return;
    var el = new Audio();
    el.src = tracks[idx].file;
    el.crossOrigin = 'anonymous';
    el.loop = tracks.length === 1;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.35, c.currentTime + 2.5);
    var node;
    try { node = c.createMediaElementSource(el); node.connect(g); g.connect(master); } catch (e) { /* पुराना browser: सीधे तत्व चलाओ */ el.volume = 0.35; }
    amb = { kind: 'music', el: el, g: g, node: node, tracks: tracks, idx: idx };
    el.addEventListener('canplay', function () { musicFails = 0; }, { once: true });
    el.addEventListener('ended', function () { if (amb && amb.el === el) S.nextTrack(); });
    el.addEventListener('error', function () {
      if (!amb || amb.el !== el) return;
      amb = null;
      musicFails += 1;
      if (musicFails >= tracks.length) { musicBroken = true; startNoise(); } // सारे track बारी-बारी टूटे मिले, अब वापस मत कोशिश करो
      else advanceMusic(tracks);
    });
    var p = el.play();
    if (p && p.catch) p.catch(function () { /* अगला tap आने पर फिर कोशिश होगी */ });
    S._log.push('focus-on-music');
    renderUi();
  }
  function advanceMusic(tracks) {
    if (!musicOrder.length || musicPos >= musicOrder.length) nextOrder(tracks.length);
    var idx = musicOrder[musicPos]; musicPos += 1;
    playTrack(tracks, idx);
  }
  S.nextTrack = function () {
    if (!amb || amb.kind !== 'music') return;
    var tracks = amb.tracks;
    stopAmbient(true);
    advanceMusic(tracks);
  };

  function startAmbient() {
    if (amb || !cfg.on || !cfg.focus) return;
    if (musicBroken) { startNoise(); return; }
    loadMusicManifest().then(function (tracks) {
      if (!cfg.on || !cfg.focus || amb) return; // इस दौरान कोई बदलाव हो गया हो
      if (tracks.length) advanceMusic(tracks); else startNoise();
    });
  }
  function stopAmbient(keepPosition) {
    if (!amb) return;
    var a = amb; amb = null;
    try {
      a.g.gain.cancelScheduledValues(ctx.currentTime);
      a.g.gain.setValueAtTime(a.g.gain.value, ctx.currentTime);
      a.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + (keepPosition ? 0.3 : 0.8));
    } catch (e) { /* ignore */ }
    if (a.kind === 'noise') { try { a.src.stop(ctx.currentTime + 0.9); } catch (e) { /* ignore */ } }
    else { setTimeout(function () { try { a.el.pause(); if (a.node) a.node.disconnect(); } catch (e) { /* ignore */ } }, keepPosition ? 320 : 850); }
    if (!keepPosition) S._log.push('focus-off');
  }

  S.setOn = function (v) { cfg.on = !!v; saveCfg(); if (!cfg.on) stopAmbient(); else { if (cfg.focus) startAmbient(); S.play('done'); } renderUi(); };
  S.setFocus = function (v) {
    cfg.focus = !!v; saveCfg();
    if (cfg.focus && cfg.on) { startAmbient(); S.play('start'); } else stopAmbient();
    renderUi();
  };
  S.config = function () { return { on: cfg.on, focus: cfg.focus, playing: amb ? amb.kind : null, track: amb && amb.kind === 'music' ? amb.tracks[amb.idx].title : null }; };
  S._activeEl = function () { return amb && amb.kind === 'music' ? amb.el : null; }; // debugging/testing के लिए

  /* ---------- 🔊 बटन और छोटा panel ---------- */
  function renderUi() {
    var b = document.getElementById('soundBtn');
    if (b) b.textContent = cfg.on ? (cfg.focus ? '🎧' : '🔊') : '🔇';
    var p = document.getElementById('soundPanel');
    if (p) {
      var isMusic = amb && amb.kind === 'music';
      p.innerHTML = '<button class="chip-btn' + (cfg.on ? ' on' : '') + '" data-snd="on">' + (cfg.on ? '🔊 Sound चालू' : '🔇 Sound बंद') + '</button>' +
        '<button class="chip-btn' + (cfg.focus && cfg.on ? ' on' : '') + '" data-snd="focus"' + (cfg.on ? '' : ' disabled') + '>🎧 Focus ' + (isMusic ? 'गाना' : 'आवाज़') + ' ' + (cfg.focus ? 'चालू' : 'बंद') + '</button>' +
        (isMusic ? '<div class="sound-track"><span>🎵 ' + esc(amb.tracks[amb.idx].title) + '</span><button class="chip-btn" data-snd="next">⏭ अगला गाना</button></div>' : '') +
        '<small class="muted">Focus ' + (isMusic ? 'गाना तुम्हारी अपनी data/focus-music/ की फ़ाइलों से बजता है।' : 'आवाज़ हल्की और लगातार चलती है ताकि ध्यान न भटके।') + ' फ़ोन का volume और silent mode भी असर करते हैं।</small>';
    }
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function buildUi() {
    var pills = document.querySelector('#topbar .pills');
    if (!pills || document.getElementById('soundBtn')) return;
    var b = document.createElement('button');
    b.id = 'soundBtn'; b.className = 'pill sound-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Sound सेटिंग');
    pills.insertBefore(b, pills.firstChild);
    var p = document.createElement('div');
    p.id = 'soundPanel'; p.className = 'sound-panel'; p.hidden = true;
    document.body.appendChild(p);
    b.addEventListener('click', function (e) { e.stopPropagation(); p.hidden = !p.hidden; });
    p.addEventListener('click', function (e) {
      e.stopPropagation();
      var t = e.target.closest ? e.target.closest('[data-snd]') : null;
      if (!t || t.disabled) return;
      var k = t.getAttribute('data-snd');
      if (k === 'on') S.setOn(!cfg.on); else if (k === 'focus') S.setFocus(!cfg.focus); else if (k === 'next') S.nextTrack();
    });
    document.addEventListener('click', function () { p.hidden = true; });
    renderUi();
  }

  /* ---------- टैप के तुरंत बाद पेज के बदलाव से sound ---------- */
  var lastTap = { t: 0, kind: '' };
  var prev = { right: 0, wrong: 0, open: 0, matched: 0, gwrong: 0, heroOk: 0, hero: 0, level: 0, vault: 0, win: 0 };
  function snap(v) {
    return {
      right: v.querySelectorAll('.opt.right').length, wrong: v.querySelectorAll('.opt.wrong').length,
      open: v.querySelectorAll('.gcard.open').length, matched: v.querySelectorAll('.gcard.matched').length, gwrong: v.querySelectorAll('.gcard.wrong').length,
      hero: v.querySelectorAll('.result-hero').length, heroOk: v.querySelectorAll('.result-hero.ok').length,
      level: v.querySelectorAll('.levelup').length, vault: v.querySelectorAll('.vault-open').length, win: v.querySelectorAll('#gameArea .banner.ok').length
    };
  }
  var pending = false;
  function onChange() {
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || setTimeout)(function () {
      pending = false;
      var v = document.getElementById('view');
      if (!v) return;
      var s = snap(v);
      var fresh = Date.now() - lastTap.t < 1500;
      if (fresh) {
        if (s.vault > prev.vault) S.play('unlock');
        else if (s.level > prev.level) S.play('levelup');
        else if (s.win > prev.win) S.play('win');
        else if (s.hero > prev.hero) S.play(s.heroOk > prev.heroOk ? 'win' : 'done');
        else if (lastTap.kind === 'opt') { if (s.wrong > prev.wrong) S.play('wrong'); else if (s.right > prev.right) S.play('correct'); }
        else if (lastTap.kind === 'gcard') {
          if (s.matched > prev.matched) S.play('match');
          else if (s.gwrong > prev.gwrong) S.play('wrong');
          else if (s.open > prev.open) S.play('flip');
        }
      }
      prev = s;
    });
  }

  function boot() {
    buildUi();
    document.addEventListener('pointerdown', function (e) {
      var el = e.target && e.target.closest ? e.target : null;
      var kind = 'other';
      if (el) { if (el.closest('.opt')) kind = 'opt'; else if (el.closest('.gcard')) kind = 'gcard'; }
      lastTap = { t: Date.now(), kind: kind };
      if (cfg.on) { ensure(); if (cfg.focus) startAmbient(); }
    }, true);
    var v = document.getElementById('view');
    if (v && window.MutationObserver) {
      prev = snap(v);
      new MutationObserver(onChange).observe(v, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      try { if (document.hidden) ctx.suspend(); else if (cfg.on) ctx.resume(); } catch (e) { /* ignore */ }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  M.Sound = S;
})(window.M27 = window.M27 || {});
