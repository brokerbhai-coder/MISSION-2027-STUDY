/* ==========================================================
   ai.js (नया)
   काम: एक "AI से पूछो" Section — Doubt पूछना, किसी Chapter को आसान भाषा
   में समझाना, या किसी गलत हुए Question की Explanation विस्तार से लेना —
   तीनों इसी एक Chat Page से होते हैं।

   ज़रूरी बात — यह पूरी तरह Client-Side (Browser से सीधे) काम करता है:
   - API Key कभी किसी File/Code में नहीं है — विद्यार्थी खुद Settings में
     अपनी Key डालता है, वह सिर्फ़ उसी के Browser की localStorage में रहती है
     (mission2027_extras_v1 के "ai" हिस्से में), GitHub पर Public Code में कभी नहीं जाती।
   - हर विद्यार्थी को अपनी खुद की (मुफ़्त) Gemini API Key लेनी होगी:
     https://aistudio.google.com/apikey
   - Chat History सिर्फ़ इसी Browser-Session में रहती है (Page Reload पर खाली हो जाती है) —
     जान-बूझकर ऐसा रखा है ताकि localStorage बहुत बड़ी न हो जाए।
   ========================================================== */
(function (M) {
  'use strict';

  var AI = {};
  var DEFAULT_MODEL = 'gemini-3.8-flash';
  var session = []; // { role: 'user'|'model', text }
  var pendingPrompt = null; // Notes/Mistakes से "AI से समझाओ" दबाने पर यहाँ भर जाता है

  function esc(s) { return M.App.esc(s); }
  function X() { return M.Extras; }

  function store() {
    var s = X().store();
    if (!s.ai || typeof s.ai !== 'object') s.ai = { key: '', model: DEFAULT_MODEL };
    if (!s.ai.model) s.ai.model = DEFAULT_MODEL;
    return s.ai;
  }

  AI.hasKey = function () { return !!store().key; };

  AI.saveSettings = function (key, model) {
    var s = store();
    s.key = (key || '').trim();
    s.model = (model || '').trim() || DEFAULT_MODEL;
    X().save();
  };

  /* ---------- असली API Call ---------- */
  AI.ask = function (prompt) {
    var s = store();
    if (!s.key) return Promise.reject(new Error('पहले Settings में अपनी API Key डालो।'));
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(s.model) + ':generateContent';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg = (data && data.error && data.error.message) ? data.error.message : ('HTTP ' + res.status);
          throw new Error(msg);
        }
        var cand = data && data.candidates && data.candidates[0];
        var text = cand && cand.content && cand.content.parts && cand.content.parts.map(function (p) { return p.text || ''; }).join('');
        if (!text) throw new Error('AI से कोई जवाब नहीं मिला।');
        return text;
      });
    });
  };

  /* ---------- Notes/Mistakes से सीधे यहाँ भेजने के लिए ---------- */
  AI.askAbout = function (prompt) {
    pendingPrompt = prompt;
    M.Router.go('/ai');
  };

  /* ---------- Chat Page ---------- */
  AI.view = function () {
    var s = store();
    var html = '<section class="page ai-page">';

    if (!s.key) {
      html += '<div class="card"><h3 class="card-title">🤖 AI से पूछो — पहले Setup करो</h3>' +
        '<p class="muted small">यह Feature चलाने के लिए एक मुफ़्त Gemini API Key चाहिए। <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">यहाँ से बनाओ</a> (Google Account से 1 मिनट में बन जाती है), फिर नीचे Paste कर दो।</p>' +
        '<label class="field"><span>Gemini API Key</span><input id="aiKeyInput" type="password" placeholder="AIza..." autocomplete="off"></label>' +
        '<button class="btn block" type="button" data-action="ai-save-key">Save करके शुरू करो</button>' +
        '<p class="muted small" style="margin-top:8px">यह Key सिर्फ़ तुम्हारे इसी Phone/Browser में Save रहती है — कहीं और नहीं जाती।</p></div>';
      html += '</section>';
      return { html: html, title: '🤖 AI से पूछो', back: '/home', tab: 'home', ctx: 'ai' };
    }

    html += '<div id="aiChat" class="ai-chat">' + chatHtml() + '</div>';
    html += '<div class="ai-inputbar">' +
      '<input id="aiInput" type="text" placeholder="कुछ भी पूछो... (जैसे: यह समझाओ, यह सवाल हल करके बताओ)" autocomplete="off" value="' + esc(pendingPrompt || '') + '">' +
      '<button type="button" class="btn" data-action="ai-send">भेजो</button></div>';
    html += '</section>';

    return {
      html: html, title: '🤖 AI से पूछो', back: '/home', tab: 'home', ctx: 'ai',
      after: function () {
        var box = document.getElementById('aiChat');
        if (box) box.scrollTop = box.scrollHeight;
        var inp = document.getElementById('aiInput');
        if (inp) {
          if (pendingPrompt) inp.setSelectionRange(inp.value.length, inp.value.length);
          inp.focus();
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); var btn = document.querySelector('[data-action="ai-send"]'); if (btn) btn.click(); }
          });
        }
      }
    };
  };

  function chatHtml() {
    if (!session.length) {
      return '<div class="empty"><p>👋 कुछ भी पूछो — किसी Chapter को आसान भाषा में समझने को कहो, कोई Doubt पूछो, या कोई Question हल करने को कहो।</p></div>';
    }
    return session.map(function (m) {
      return '<div class="ai-msg ai-' + m.role + '">' + (m.role === 'user' ? esc(m.text) : X().rich(m.text)) + '</div>';
    }).join('');
  }

  /* ---------- Actions (Shared Dispatcher में जुड़ते हैं — App तैयार होते ही) ---------- */
  X().onReady(function (A) {
    A['ai-save-key'] = function () {
      var v = (document.getElementById('aiKeyInput') || {}).value || '';
      if (!v.trim()) { M.App.toast('Key डालना ज़रूरी है', 'error'); return; }
      AI.saveSettings(v, store().model);
      M.App.toast('Save हो गया ✅', 'success');
      M.Router.refresh(true);
    };
    A['ai-send'] = function () {
      var inp = document.getElementById('aiInput');
      var text = (inp && inp.value || '').trim();
      if (!text) return;
      pendingPrompt = null;
      session.push({ role: 'user', text: text });
      if (inp) inp.value = '';
      M.Router.refresh(true);
      session.push({ role: 'model', text: '…सोच रहा है' });
      var thinkingIdx = session.length - 1;
      M.Router.refresh(true);
      AI.ask(text).then(function (reply) {
        session[thinkingIdx] = { role: 'model', text: reply };
        M.Router.refresh(true);
      }).catch(function (err) {
        session[thinkingIdx] = { role: 'model', text: '⚠️ Error: ' + (err && err.message ? err.message : 'कुछ गड़बड़ हुई, दोबारा कोशिश करो।') };
        M.Router.refresh(true);
      });
    };
  });

  M.AI = AI;
})(window.M27 = window.M27 || {});
