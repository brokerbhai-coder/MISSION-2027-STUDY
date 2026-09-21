# CHANGELOG — नए Sections जोड़ना (21 सितंबर 2026)

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
