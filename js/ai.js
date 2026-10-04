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
  var DEFAULT_MODEL = 'gemini-2.0-flash';
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
  AI.getModel = function () { return store().model; };

  AI.saveSettings = function (key, model) {
    var s = store();
    s.key = (key || '').trim();
    s.model = (model || '').trim() || DEFAULT_MODEL;
    X().save();
  };

  // AI के जवाब में Markdown (### Heading, * Bullet) होता है, जो X.rich() अकेले नहीं समझता (वो सिर्फ़
  // $...$ Formula और **bold** समझता है) — यहाँ पहले Heading/Bullet को उसी **bold**/• रूप में बदल देते हैं,
  // फिर बाकी काम (Formula + Bold + Line-break) X.rich() खुद कर देता है।
  // Markdown (### Heading, **Bold**, * Bullet) + $...$ Formula — दोनों एक-साथ, आसपास मिले होने पर भी सही बनें,
  // इसलिए पहले Formula वाले हिस्सों को पूरी तरह अलग निकाल लेते हैं (और उन्हें X.rich() से बनवाते हैं, जो इसी काम का
  // माहिर है), बाकी बचे सादे Text में अपना Markdown लगाते हैं — दोनों को आख़िर में जोड़ देते हैं।
  function mdToHtml(text) {
    var esc2 = M.App.esc;
    var s = esc2(text); // पहले सुरक्षित बनाओ (< > & वगैरह)
    s = s.replace(/^#{1,6}\s*(.+)$/gm, '<strong>$1</strong>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/^\s*[*-]\s+/gm, '• ');
    return s.replace(/\n/g, '<br>');
  }
  function aiRich(raw) {
    var s = String(raw == null ? '' : raw);
    var out = '', last = 0, m;
    var re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    while ((m = re.exec(s))) {
      out += mdToHtml(s.slice(last, m.index));
      out += X().rich(m[0]); // सिर्फ़ यही एक Formula, अलग से — कुछ और टकराएगा नहीं
      last = re.lastIndex;
    }
    return out + mdToHtml(s.slice(last));
  }

  /* ---------- असली API Call ---------- */
  var HISTORY_LIMIT = 16; // पुराना Chat ज़्यादा लंबा न हो जाए, इतने हाल के Message ही साथ भेजो
  // prompt: एक अकेला सवाल (string) भी दे सकते हो, या पिछली पूरी बातचीत (array of {role,text}) भी —
  // Array देने पर AI को पिछली बात याद रहती है (Chat वाले Page में यही इस्तेमाल होता है)
  AI.ask = function (prompt) {
    var s = store();
    if (!s.key) return Promise.reject(new Error('पहले Settings में अपनी API Key डालो।'));
    var history = Array.isArray(prompt) ? prompt.slice(-HISTORY_LIMIT) : [{ role: 'user', text: prompt }];
    var contents = history.map(function (m) { return { role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] }; });
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(s.model) + ':generateContent';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.key },
      body: JSON.stringify({ contents: contents })
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

  /* ---------- Text से Quiz JSON बनाने वाला Tool (सिर्फ़ आपके लिए, Students के लिए नहीं) ---------- */
  var makerOutput = '';
  var lastMk = { subject: '', chapter: '', text: '' };
  AI.makerView = function () {
    if (!store().key) return AI.view(); // पहले Key Setup करनी होगी
    var html = '<section class="page ai-page"><div class="card"><h3 class="card-title">📋 Text से Quiz बनाओ</h3>' +
      '<p class="muted small">कोई भी Text Paste करो (चाहे जैसा भी लिखा हो) — AI उसे सही JSON Format में बदल देगा। नीचे से Copy करके अपनी Chapter/Practice File में डाल दो।</p>' +
      '<label class="field"><span>Subject ID</span><input id="mkSubject" type="text" placeholder="जैसे: physics, history" value="' + esc(lastMk.subject) + '"></label>' +
      '<label class="field"><span>Chapter नंबर</span><input id="mkChapter" type="number" placeholder="जैसे: 5" value="' + esc(lastMk.chapter) + '"></label>' +
      '<label class="field"><span>Text Paste करो</span><textarea id="mkText" rows="8" placeholder="यहाँ सवाल/जानकारी Paste करो...">' + esc(lastMk.text) + '</textarea></label>' +
      '<button class="btn block" type="button" data-action="ai-make-quiz">AI से JSON बनाओ</button></div>';
    if (makerOutput) {
      html += '<div class="card"><h3 class="card-title">नतीजा</h3><textarea id="mkOutput" rows="14" readonly>' + esc(makerOutput) + '</textarea>' +
        '<button class="btn small ghost" type="button" data-action="ai-copy-quiz" style="margin-top:8px">📋 Copy करो</button></div>';
    }
    html += '</section>';
    return { html: html, title: '📋 Text से Quiz बनाओ', back: '/settings', tab: 'settings', ctx: 'ai' };
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
        '<label class="field"><span>Model का नाम</span><input id="aiModelInput" type="text" placeholder="' + esc(DEFAULT_MODEL) + '" value="' + esc(s.model) + '" autocomplete="off"></label>' +
        '<p class="muted small">Model का सही नाम नहीं पता तो खाली छोड़ दो, यही (' + esc(DEFAULT_MODEL) + ') चलेगा। आगे कभी Google कोई नया/बेहतर Model Free कर दे, तो यहीं बदल सकते हो — मुझसे Code बदलवाने की ज़रूरत नहीं।</p>' +
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
        // Formula ($...$) के लिए KaTeX पहले से लोड करवा दो (जवाब आने तक अक्सर तैयार हो जाती है)
        X().ensureMath().then(function (ok) {
          if (!ok) X().onMathReady(function () { if (M.Router.currentPath === '/ai') M.Router.refresh(true); });
        });
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
      return '<div class="ai-msg ai-' + m.role + '">' + (m.role === 'user' ? esc(m.text) : aiRich(m.text)) + '</div>';
    }).join('');
  }

  /* ---------- Actions (Shared Dispatcher में जुड़ते हैं — App तैयार होते ही) ---------- */
  X().onReady(function (A) {
    A['ai-save-key'] = function () {
      var v = (document.getElementById('aiKeyInput') || {}).value || '';
      var mv = (document.getElementById('aiModelInput') || {}).value || '';
      if (!v.trim()) { M.App.toast('Key डालना ज़रूरी है', 'error'); return; }
      AI.saveSettings(v, mv);
      M.App.toast('Save हो गया ✅', 'success');
      M.Router.refresh(true);
    };
    A['ai-make-quiz'] = function () {
      var subject = (document.getElementById('mkSubject').value || '').trim();
      var chapter = (document.getElementById('mkChapter').value || '').trim();
      var text = (document.getElementById('mkText').value || '').trim();
      if (!text) { M.App.toast('पहले Text Paste करो', 'error'); return; }
      lastMk = { subject: subject, chapter: chapter, text: text };
      var schemaPrompt = 'नीचे दिए Text से MISSION 2027 Website के लिए Objective Quiz Questions बनाओ। सिर्फ़ नीचे दिए JSON Format में जवाब दो — कोई अतिरिक्त बात, कोई Markdown Code-Fence (```),  कुछ और मत लिखो, सिर्फ़ Valid JSON:\n\n' +
        '{\n  "questions": [\n    { "id": "' + (subject || 'subject') + '-' + (chapter || '1') + '-q1", "subject": "' + (subject || 'subject-id') + '", "chapter": ' + (parseInt(chapter, 10) || 1) + ', "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "answer": "A", "explanation": "...", "source": "AI", "type": "objective" }\n  ]\n}\n\n' +
        'नियम:\n- सिर्फ़ उसी जानकारी से सवाल बनाओ जो नीचे Text में दी गई है, अपनी तरफ़ से नया Fact मत जोड़ो।\n- हर Question का "id" अलग-अलग हो (q1, q2, q3...)।\n- "answer" सिर्फ़ A/B/C/D में से एक अक्षर हो।\n- जितने भी अच्छे Objective Question बन सकें, सारे बनाओ।\n\nText:\n' + text;
      makerOutput = '…बन रहा है';
      M.Router.refresh(true);
      AI.ask(schemaPrompt).then(function (reply) {
        makerOutput = reply.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
        M.Router.refresh(true);
      }).catch(function (err) {
        makerOutput = '⚠️ Error: ' + (err && err.message ? err.message : 'कुछ गड़बड़ हुई');
        M.Router.refresh(true);
      });
    };
    A['ai-copy-quiz'] = function () {
      var ta = document.getElementById('mkOutput');
      if (!ta) return;
      ta.select();
      try { document.execCommand('copy'); M.App.toast('Copy हो गया ✅', 'success'); }
      catch (e) { M.App.toast('Copy नहीं हो पाया, खुद Select करके Copy करो', 'warn'); }
    };
    A['ai-send'] = function () {
      var inp = document.getElementById('aiInput');
      var text = (inp && inp.value || '').trim();
      if (!text) return;
      pendingPrompt = null;
      session.push({ role: 'user', text: text });
      if (inp) inp.value = '';
      var historySnapshot = session.slice(); // अभी तक की पूरी बातचीत (नया सवाल सहित) — ताकि AI पिछली बात याद रखे
      M.Router.refresh(true);
      session.push({ role: 'model', text: '…सोच रहा है' });
      var thinkingIdx = session.length - 1;
      M.Router.refresh(true);
      AI.ask(historySnapshot).then(function (reply) {
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
