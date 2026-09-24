# CHANGELOG

## अपडेट 10 — Virtual Physics Lab (असली Lab जैसा Simulation)

**नई फ़ाइलें:** `js/lab.js` (engine: 6 जाने-पहचाने experiment types का सही, जाँचा हुआ physics-calculation + हर type का animate होने वाला SVG apparatus + step-gated procedure + Observation table + result-check), `css/lab.css`, `data/lab/manifest.json`, `data/lab/physics/ohms-law.json` (पहला, पूरा-तैयार experiment), `AI-PROMPT-PHYSICS-LAB.md`

**बदली हुई फ़ाइलें:**
| फ़ाइल | क्या बदला |
|---|---|
| `index.html` | `css/lab.css` की एक link, `js/lab.js` की एक `<script>` line |
| `js/extras-core.js` | `data/lab/manifest.json` के लिए KINDS entry; Hub में "🧪 Virtual Lab" card; Data Check में Lab; storage के `blank()`/parse में नया `lab` भाग (**ज़रूरी bug-fix**: बिना इसके Lab का progress पेज reload पर मिट जाता, जैसे पुराने Notes Game/Vault के "ng"/"read" भाग जोड़े गए थे वैसे ही) |

**पुरानी website की कोई और फ़ाइल नहीं छुई।**

## जाँच में मिली और ठीक की गई असली गड़बड़ियाँ (पहले वर्शन में)
1. Step-gate की logic में एक step पूरा होने के बाद भी अगला step "lock" वापस हो जाता था जब slider किसी और मान पर जाता — ठीक किया: अब एक बार पूरा हुआ step हमेशा के लिए पूरा दर्ज होता है (`doneSteps` में स्थायी entry), slider बाद में कहीं भी जाए।
2. Lab का data (readings, steps) page reload पर मिट जाता था — storage में `lab` भाग को बचाने का code नहीं था, अब जोड़ा गया।
3. Data Check में Lab experiment "undefined आइटम सही" दिखा रहा था — `count`/`skipped` field जोड़े।

---

## अपडेट 9 — Focus में अपना गाना (copyright-free music)

**नई फ़ाइलें:** `data/focus-music/manifest.json` (खाली list), `data/focus-music/README.txt`

**बदली हुई फ़ाइलें:**
| फ़ाइल | क्या बदला |
|---|---|
| `js/sound.js` | `data/focus-music/manifest.json` में गाने हों तो 🎧 Focus उन्हें बजाता है (बदल-बदल कर, बिना तुरंत दोहराए); पेज पर पहला tap होते ही शुरू; "⏭ अगला गाना" बटन; गाना/फ़ाइल टूटी या न मिले तो अपने-आप पुरानी background आवाज़ पर वापस — कभी टूटता नहीं। पुराना behaviour (गाना न जोड़ने पर) बिल्कुल पहले जैसा |
| `css/extras.css` | Sound panel में बज रहे गाने की पट्टी का design |
| `README.md`, `NEW-FEATURES-GUIDE.md` | नया भाग 15 |

**पुरानी website की कोई फ़ाइल नहीं छुई।**

---

## अपडेट 8 — LaTeX गणित सूत्र, सूत्र के 4 उदाहरण, Maths का prompt

**नई फ़ाइलें:** `AI-PROMPT-MATHS-NOTES.md` (हाथ-के-notes prompt + मास्टर नियम + Chapter prompt), `lib/katex/` folder (katex.min.js, katex.min.css, LICENSE, fonts/*.woff2 — KaTeX, MIT licence, गणित सूत्र दिखाने के लिए)

**बदली हुई फ़ाइलें:**
| फ़ाइल | क्या बदला |
|---|---|
| `js/extras-core.js` | `$...$` / `$$...$$` गणित को KaTeX से रेंडर करना (CDN → न मिले तो `lib/katex/` → वह भी न मिले तो सादा text); हर पुराना `esc()`/`**मोटा**` वाला text अब गणित भी समझता है |
| `js/notes.js` | हर सूत्र (`formulas`) के साथ वैकल्पिक `examples` (4 हल किए उदाहरण) दिखाना; Chapter Notes पेज गणित होने पर पहले KaTeX लोड करके तब बनता है |
| `js/extras-quiz.js` | Mixed Practice / PYQ / Notes Game / Vault Challenge के प्रश्न, विकल्प, व्याख्या और Review में भी गणित सही दिखना |
| `css/extras.css` | गणित और उदाहरण-कार्ड का design |
| `README.md`, `NEW-FEATURES-GUIDE.md` | नया भाग 14 |

**पुरानी website की कोई फ़ाइल नहीं छुई।** गणित न हो तो ये बदलाव पहले जैसे ही दिखते हैं (कोई असर नहीं)।

---

## अपडेट 7 — Biology का Notes prompt

**नई फ़ाइल:** `AI-PROMPT-BIOLOGY-NOTES.md` — मास्टर नियम + Chapter prompt; हर चित्र AI खुद SVG में बनाता है ("पेज पर देखो" का हवाला नहीं)। कोई code नहीं बदला।

---

## अपडेट 6 — Chemistry का Notes prompt

**नई फ़ाइल:** `AI-PROMPT-CHEMISTRY-NOTES.md` — दो prompt: (1) मास्टर नियम (पहले, अकेला), (2) Chapter prompt (किताब + Teacher के notes के साथ)। किताब और Teacher दोनों के notes मिलाकर, छूटे बिंदुओं की जाँच (audit) के साथ।
**बदली फ़ाइलें:** `README.md`, `NEW-FEATURES-GUIDE.md`। कोई code नहीं बदला।

---

## अपडेट 5 — सिर्फ़-Notes वाला Physics prompt

**नई फ़ाइल:** `AI-PROMPT-PHYSICS-NOTES.md` (सिर्फ़ Notes + चित्र)
**नाम बदला:** `AI-PROMPT-PHYSICS.md` → `AI-PROMPT-PHYSICS-FULL-LATER.md` (Practice प्रश्नों वाला, बाद के लिए रखा)
**बदली फ़ाइलें:** `README.md`, `NEW-FEATURES-GUIDE.md` (prompt की जानकारी)। कोई code नहीं बदला।

---

## अपडेट 4 — Notes कई भागों में + Physics का AI Prompt

**नई फ़ाइल:** `AI-PROMPT-PHYSICS.md` (बाद में नाम बदलकर `AI-PROMPT-PHYSICS-FULL-LATER.md` हुआ, अपडेट 5 देखो)

**बदली हुई फ़ाइलें (सब नए sections वाली):**
| फ़ाइल | क्या बदला |
|---|---|
| `js/extras-core.js` | एक Chapter के लिए कई Notes फ़ाइलें (भाग) मान्य; Hub में Chapters की सही गिनती; Data Check में भाग का नाम |
| `js/notes.js` | सारे भाग जोड़कर एक पेज; गायब/खराब भाग की चेतावनी |
| `js/notes-game.js` | Game सारे भागों के आइटम से बनता है; हर Chapter की एक ही पंक्ति |
| `js/vault.js` | हर Chapter की एक ही पंक्ति, सारे भागों के प्रश्न |
| `data/templates/manifest-examples.json`, `notes-template.json` | कई भाग का नमूना |
| `README.md`, `NEW-FEATURES-GUIDE.md` | नया भाग 13 |

**पुरानी website की कोई फ़ाइल नहीं छुई।**

---

## अपडेट 3 — Fun Vault और Sound

**नई फ़ाइलें:** `js/vault.js`, `js/sound.js`, `AI-PROMPTS.md`, `data/vault/manifest.json` (खाली), `data/templates/vault-jokes-template.json`

**बदली हुई फ़ाइलें (सब नए sections वाली):**
| फ़ाइल | क्या बदला |
|---|---|
| `js/extras-core.js` | Vault का manifest, Hub में "🎁 Fun Vault" कार्ड, Data Check में Vault, Hub का छोटा title |
| `js/extras-quiz.js` | Vault Challenge का Result (95% पर Vault खुलना), शुरुआत की घंटी |
| `js/notes-game.js` | Challenge के लिए 50 प्रश्न बनाने की सुविधा, "पढ़ लिए" पर हल्की आवाज़ |
| `css/extras.css` | Sound बटन/panel और Vault का design |
| `index.html` | दो और `<script>` lines (`vault.js`, `sound.js`) |
| `README.md`, `NEW-FEATURES-GUIDE.md` | नए भाग |

**पुरानी website की कोई फ़ाइल नहीं छुई** — पुराने Quiz और Match Master पर sound पेज के बदलाव देखकर बजता है, उनकी फ़ाइलों में बदलाव किए बिना।

---

## अपडेट 2 — Notes Game (Notes पढ़ो → Game खेलो → Level बढ़ाओ)

**नई फ़ाइल:** `js/notes-game.js`

**बदली हुई फ़ाइलें (सब नए sections वाली, यानी पिछली बार की नई फ़ाइलें):**
| फ़ाइल | क्या बदला |
|---|---|
| `js/extras-core.js` | अलग storage में `read` और `ng` भाग जोड़े; Hub में "🎮 Notes Game" कार्ड |
| `js/extras-quiz.js` | Game-Result पर LEVEL UP संदेश; Game खत्म होने पर Level का हिसाब |
| `js/notes.js` | Chapter के Notes पेज के नीचे "✅ मैंने ये Notes पढ़ लिए" कार्ड |
| `index.html` | एक और `<script src="js/notes-game.js">` line |
| `README.md`, `NEW-FEATURES-GUIDE.md` | Notes Game का भाग जोड़ा |

**पुरानी website की कोई फ़ाइल नहीं छुई** — `games.js` (Match Master), `rewards.js` (XP/Level), `quiz.js`, `storage.js` सब वैसे ही हैं।

---

## अपडेट 1 — Notes · PYQ · Mixed Practice


## पुरानी फ़ाइलें जो बदलीं (सिर्फ़ 2)

| फ़ाइल | क्या बदला | क्यों |
|---|---|---|
| `index.html` | (1) `css/extras.css` की एक link, (2) नीचे के menu में एक बटन **📓 नोट्स·PYQ** (और menu में `x6` class), (3) 5 नई `<script>` lines (`router.js` के बाद, `app.js` से पहले) | नए sections खुलने के लिए। बाकी कुछ नहीं बदला |
| `README.md` | आख़िर में "भाग 9" जोड़ा (नए sections का परिचय और guide का पता) | जानकारी के लिए। पुराना text नहीं छुआ |

**बाकी 69 पुरानी फ़ाइलें एक-एक byte वैसी ही हैं** (checksum से मिलाकर देखा): सारे पुराने JS (`app.js`, `router.js`, `quiz.js`, `chapters.js`, `subjects.js`, `storage.js`, `progress.js`, `rewards.js`, `mistakes.js`, `timer.js`, `games.js`), दोनों पुराने CSS, `data/subjects.json`, और सारी Hindi / Physics / Chemistry JSON फ़ाइलें। कोई फ़ाइल हटाई या rename नहीं की गई।

पुराने Quiz का JSON format, storage key (`mission2027_progress_v1`), Lock logic और Progress system में **कोई बदलाव नहीं**।

## नई फ़ाइलें (14)

- `js/extras-core.js`, `js/extras-quiz.js`, `js/notes.js`, `js/pyq.js`, `js/practice.js`
- `css/extras.css`
- `data/notes/manifest.json`, `data/pyq/manifest.json`, `data/practice/manifest.json` (तीनों में खाली list)
- `data/templates/notes-template.json`, `pyq-template.json`, `mixed-practice-template.json`, `manifest-examples.json`
- `NEW-FEATURES-GUIDE.md`, `CHANGELOG.md`, `TESTING-REPORT.md` (ये तीन गाइड फ़ाइलें भी नई हैं)

## नए Routes (पुराने routes वैसे ही)

`#/extras`, `#/notes[/<विषय>[/<अध्याय>]]`, `#/pyq[/<विषय>[/<साल>]]`, `#/practice[/<विषय>[/<set-id>]]`, `#/xquiz`, `#/xresult/<id>`, `#/xreview/<id>`

## जो चीज़ें मैंने जानबूझकर नहीं छुईं (तुम्हें बताने के लिए)

1. **खाली Chapters:** Hindi 9, 10, 12 (`questions: []`), Hindi 11 और 13 (फ़ाइल 1 byte की, यानी टूटी JSON), Chemistry के सारे 16 chapters (0 प्रश्न), English / Maths / Biology (0 chapters) — सब जैसे थे वैसे हैं।
2. **Demo Quiz का path:** `js/chapters.js` `data/demo/demo-quiz.json` ढूँढता है, पर फ़ाइल `data/demo-quiz.json` पर है, इसलिए Home पर Demo Quiz नहीं दिखता (मूल ZIP में भी यही है)। इसे ठीक करने के लिए फ़ाइल को `data/demo/` folder में डाल दो, या मुझसे कहो।
3. **README का पुराना हिस्सा:** भाग 1–8 में कुछ बातें पुरानी हैं (जैसे "Physics अभी खाली है", "Physics free है" — असल में Physics में प्रश्न हैं और वह sequential है)। मैंने पुराना text बदला नहीं।
4. **पास प्रतिशत:** `data/subjects.json` में अभी `"passPercent": 60` है। 70% चाहिए तो वहीं `60` को `70` कर दो। मैंने नहीं बदला।

## व्यवहार से जुड़े फ़ैसले (जो तुम बदलवा सकते हो)

- नए sections **XP, Mistake Notebook और Chapter progress में कुछ नहीं जोड़ते** (पुराना progress सुरक्षित रखने के लिए)। चाहो तो बाद में जोड़ा जा सकता है।
- Notes/PYQ/Practice के पेज "पढ़ाई वाले पेज" गिने जाते हैं, इसलिए वहाँ बिताया समय "आज की पढ़ाई" में जुड़ता है।
- नए sections का अपना data अलग key (`mission2027_extras_v1`) में है और पुराने Backup में शामिल नहीं है।
