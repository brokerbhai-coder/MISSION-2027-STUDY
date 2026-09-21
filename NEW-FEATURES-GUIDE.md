# नए Sections की गाइड — My Notes · PYQ · Mixed Practice · Notes Game · Fun Vault · Sound

ये sections पुरानी website में जोड़े गए हैं। ये **Chapter Quiz से बिल्कुल अलग** हैं: इनसे XP, Chapter lock, Mistake Notebook या पुराना progress नहीं बदलता।
Bottom menu में **📓 नोट्स·PYQ** बटन दबाने पर तीनों दिखते हैं।

**अभी तीनों खाली हैं** — मैंने कोई Notes, PYQ या प्रश्न अपनी तरफ़ से नहीं बनाए। जब तक तुम JSON फ़ाइल जोड़कर manifest में entry नहीं डालते, वहाँ लिखा दिखता है:
*"इस Chapter का Content अभी उपलब्ध नहीं है। जल्द जोड़ा जाएगा।"*

---

## 1. नई फ़ाइलें कहाँ हैं

| फ़ाइल / folder | काम |
|---|---|
| `js/extras-core.js` | manifest पढ़ना, JSON की जाँच, अपना storage, Hub पेज, Data Check |
| `js/extras-quiz.js` | Mixed Practice / PYQ Quiz चलाना (Timer, feedback, Result, Review) |
| `js/notes.js` · `js/pyq.js` · `js/practice.js` | Notes, PYQ, Mixed Practice |
| `js/notes-game.js` | Notes Game (Notes पढ़ो → Game खेलो → Level बढ़ाओ) |
| `js/vault.js` · `data/vault/` | Fun Vault (चुटकुले, सख़्त lock के साथ) |
| `js/sound.js` | पूरी website का Sound (🔊 बटन ऊपर) |
| `AI-PROMPTS.md` | AI से चुटकुले और Notes JSON बनवाने के तैयार prompt |
| `css/extras.css` | नए sections का design |
| `data/notes/manifest.json` | कौन-से Chapter के Notes हैं (अभी खाली list) |
| `data/pyq/manifest.json` | कौन-से विषय-साल की PYQ है (अभी खाली list) |
| `data/practice/manifest.json` | कौन-से Practice Sets हैं (अभी खाली list) |
| `data/templates/` | नमूने: `notes-template.json`, `pyq-template.json`, `mixed-practice-template.json`, `manifest-examples.json` (website इन्हें लोड नहीं करती) |

## 2. Manifest क्यों ज़रूरी है

GitHub Pages / Cloudflare Pages जैसी static hosting पर JavaScript किसी folder के अंदर की फ़ाइलों की list **नहीं** देख सकती। इसलिए हर नई JSON फ़ाइल के लिए manifest में **एक entry** डालनी पड़ती है। JavaScript में कुछ नहीं बदलना पड़ता।

Manifest में entry जोड़ने का तरीका: फ़ाइल खोलो → ✏️ (edit) → list के अंदर नई entry डालो → पिछली entry के बाद **कॉमा `,`** लगाना मत भूलो → Commit।

## 3. Notes जोड़ना

1. `data/templates/notes-template.json` की copy बनाओ। उसमें **सिर्फ़ वही categories रखो जो उस Chapter में काम की हैं**, बाकी पूरी हटा दो (जैसे Hindi में Formula नहीं चाहिए)।
2. फ़ाइल का नाम रखो: `data/notes/<विषय>/chapter-01.json` (विषय का नाम वही जो `data/subjects.json` के `"id"` में है, जैसे `physics`)।
3. `data/notes/manifest.json` में जोड़ो:
```json
{ "subject": "physics", "chapter": 1, "file": "data/notes/physics/chapter-01.json" }
```
`chapter` की संख्या `data/subjects.json` के उसी विषय के chapter से मिलनी चाहिए।

**Notes की categories** (जो भरी होंगी, वही दिखेंगी): `chapterNotes`, `oneLiners`, `theory`, `shortAnswers`, `longAnswers`, `definitions`, `formulas`, `diagrams`, `revision`, `interactive`।

- Text में `**ऐसे**` लिखने से शब्द मोटा दिखता है।
- **चित्र:** `"image": "notes-assets/physics/fig1.png"` (फ़ाइल GitHub पर उसी path पर डालो), या `"svg": "<svg ...>...</svg>"` सीधे JSON में।
- **3D / Interactive:** एक अलग `.html` फ़ाइल बनाकर `"embed": "notes-assets/physics/model.html"` लिखो। यह सुरक्षित सीमित box (sandbox) में खुलता है।
- सिर्फ़ website के अंदर के relative path या `https://` लिंक चलते हैं।

## 4. PYQ जोड़ना

1. `data/templates/pyq-template.json` की copy बनाओ।
2. फ़ाइल का नाम: `data/pyq/<विषय>/<साल>.json`
3. `data/pyq/manifest.json` में जोड़ो:
```json
{ "subject": "physics", "year": "2024", "file": "data/pyq/physics/2024.json" }
```
एक साल में कई Set हों तो हर Set की अलग entry और अलग `"label"` (जैसे `"Set A"`) लिखो।

प्रश्न का `type`: `objective` (चारों options + `answer` A/B/C/D), `short` या `long` (`answer` में text)। `chapter`, `topic`, `marks`, `explanation` वैकल्पिक हैं। Objective प्रश्न होने पर पेज पर **Quiz Mode** बटन अपने-आप आ जाता है।

## 5. Mixed Practice Set जोड़ना

1. `data/templates/mixed-practice-template.json` की copy बनाओ।
2. फ़ाइल का नाम: `data/practice/<विषय>/set-01.json`
3. `data/practice/manifest.json` में जोड़ो:
```json
{ "subject": "physics", "id": "set-01", "title": "Practice Set 1", "file": "data/practice/physics/set-01.json" }
```
`id` सिर्फ़ अक्षर, अंक, `-` या `_` से बनाओ (जैसे `set-01`)। हर प्रश्न में `"chapter": N` लिखने से Result में Chapter-वार नतीजा दिखता है। `timeLimitMinutes` लिखो तो उल्टी गिनती वाला Timer चलता है, नहीं तो सीधा (बढ़ता) Timer।

प्रश्न का format पुराने Chapter Quiz जैसा ही है (`id`, `question`, `options` A-D, `answer`, `explanation`), बस `source`/`subject` की ज़रूरत नहीं। हर `id` उस फ़ाइल में अलग होनी चाहिए।

## 6. AI से JSON बनवाते समय

AI को template फ़ाइल का पूरा text दो और साफ़ लिखो, जैसे:
> "इस template के **बिल्कुल इसी format** में JSON बनाओ। सिर्फ़ JSON दो, कोई और text नहीं। मेरे दिए material से बाहर कुछ मत जोड़ो। हर `id` अलग रखो। हर text `" "` में हो और आख़िरी item के बाद कॉमा न हो।"

फ़ाइल बनने के बाद **jsonlint.com** पर paste करके जाँचो, फिर GitHub पर डालो।

## 7. GitHub पर Updated Files डालना (मोबाइल से)

पहली बार का setup पुराना ही है (README का भाग 3)। अब बस ये फ़ाइलें डालो या बदलो:

1. **Root की फ़ाइलें** (पुरानी की जगह नई): `index.html`, `README.md`, और नई `NEW-FEATURES-GUIDE.md`, `CHANGELOG.md`, `TESTING-REPORT.md`।
   Repository में **Add file → Upload files** → Commit।
2. `css` folder में नई `extras.css`: `https://github.com/तुम्हारा-नाम/MISSION-2027-STUDY/upload/main/css`
3. `js` folder में **5 नई फ़ाइलें** (`extras-core.js`, `extras-quiz.js`, `notes.js`, `pyq.js`, `practice.js`): `.../upload/main/js`
4. Manifests: `.../upload/main/data/notes` में `manifest.json`, `.../upload/main/data/pyq` में `manifest.json`, `.../upload/main/data/practice` में `manifest.json`
5. Templates: `.../upload/main/data/templates` में चारों फ़ाइलें।
6. अगर कोई `upload/main/...` लिंक 404 दे तो तरीका B: **Add file → Create new file** → नाम वाले खाने में पूरा path लिखो (जैसे `js/notes.js`) → text paste → Commit।

> ⚠️ `index.html` **ज़रूर** बदलो, नहीं तो नए बटन और scripts नहीं जुड़ेंगे। बाकी पुरानी फ़ाइलें (quiz.js, chapters.js, data/...) वैसी ही रहने दो।

**नया Content डालना:** Add file → **Create new file** → नाम में `data/notes/physics/chapter-01.json` लिखो (folder अपने-आप बन जाता है) → JSON paste → Commit। फिर `data/notes/manifest.json` में entry जोड़ो।

## 8. जाँच और समस्या

**📓 नोट्स·PYQ → 🔍 Data Check → "अभी जाँचो"** — यहाँ हर manifest entry की स्थिति दिखती है: ✅ सही, ⚠️ चेतावनी (कुछ आइटम छोड़े गए), ❌ गड़बड़ी।

| समस्या | हल |
|---|---|
| Content जोड़ा पर "उपलब्ध नहीं" दिख रहा है | manifest में entry जोड़ी? `subject`/`chapter` सही हैं? |
| "फ़ाइल नहीं मिली" | manifest का `file` path और GitHub पर असली path बिल्कुल एक जैसे हैं? (छोटे अक्षर!) |
| "फ़ाइल सही JSON नहीं है" | कॉमा, कोट्स `" "` और `{ }` जाँचो; jsonlint.com पर देखो |
| कुछ आइटम "छोड़े गए" | पेज पर ⚠️ वाली list खोलो — उसमें कारण लिखा है (जैसे विकल्प D खाली) |
| नया upload दिख नहीं रहा | 1–2 मिनट रुको, फिर लिंक के आख़िर में `?v=2` जोड़ो |

## 9. ध्यान रखने की बातें

- नए sections का अपना data इसी browser की `localStorage` में **अलग key** (`mission2027_extras_v1`) में रहता है (अधूरा अभ्यास, पिछले 30 नतीजे, सबसे अच्छा score)। यह **सेटिंग → Backup** में शामिल नहीं है।
- Notes / PYQ / Practice के पेज पढ़ते समय तुम्हारा "आज की पढ़ाई" का समय गिनता है (पुराने Timer के नियम से)।
- सिर्फ़ आख़िरी 5 अभ्यास की पूरी Review सेव रहती है।

---

## 10. Notes Game — Notes पढ़ो, Game खेलो, Level बढ़ाओ

**नियम (विद्यार्थी के लिए):**
1. किसी Chapter के Notes पढ़ो और पेज के नीचे **"✅ मैंने ये Notes पढ़ लिए"** दबाओ।
2. **📓 नोट्स·PYQ → 🎮 Notes Game** में उस Chapter का **Stage** खुल जाता है। ▶ खेलो।
3. Stage में कम से कम **पास प्रतिशत** लाओ (अभी `data/subjects.json` का `passPercent`, यानी 60%) → **Level +1**।
4. वही Stage दोबारा खेलने पर Level नहीं बढ़ता, सिर्फ़ ⭐ (90%+ = 3, 75%+ = 2, बाकी 1) और Best बढ़ते हैं।

**अपने-आप क्या होता है:** तुम किसी Chapter का Notes JSON डालकर manifest में entry जोड़ते हो, बस। उसका नया Stage और उसके प्रश्न **अपने-आप** बन जाते हैं। Game का कोई code बदलना नहीं पड़ता।

**प्रश्न कहाँ से बनते हैं:** सिर्फ़ तुम्हारे Notes से — कुछ भी बाहर से नहीं जोड़ा जाता।
- `definitions` → "इसकी सही परिभाषा कौन-सी है?"
- `formulas` → "इसका सही सूत्र कौन-सा है?"
- `oneLiners` → तुम्हारा One-Liner प्रश्न
गलत विकल्प (options) उसी विषय के दूसरे Notes-आइटमों से बनते हैं।

**Stage बनने की शर्तें (नहीं तो Game list में साफ़ लिखा आता है):**
- उस Chapter के Notes में `definitions`, `formulas` या `oneLiners` भरे हों;
- **पूरे विषय के Notes में** हर तरह के कम से कम **4 आइटम** हों (गलत विकल्प बनाने के लिए), और उस Chapter से कुल कम से कम **4 प्रश्न** बन सकें।
- एक Stage में ज़्यादा से ज़्यादा 10 प्रश्न आते हैं (हर बार अलग मिले-जुले)।

इसलिए Notes बनवाते समय AI से इन तीन categories को ज़रूर भरवाओ।

**ध्यान दो:**
- Level सिर्फ़ Notes की file डालने से नहीं बढ़ता — विद्यार्थी को पढ़ना और Game जीतना पड़ता है।
- अगर "पढ़ लिए" का मार्क हटा दो, तो कमाया हुआ Level नहीं घटता, बस उस Stage को दोबारा खेलने के लिए फिर मार्क करना पड़ता है।
- यह Level पुराने **Match Master game, XP और Level** से अलग है। उन्हें कुछ नहीं बदलता।
- Data उसी अलग key (`mission2027_extras_v1`) में सेव होता है।

**इस बार GitHub पर क्या डालना है (पिछले upload के बाद):**
- नई: `js/notes-game.js`
- बदली हुई (पुरानी की जगह): `index.html`, `js/extras-core.js`, `js/extras-quiz.js`, `js/notes.js`, `README.md`, `NEW-FEATURES-GUIDE.md`, `CHANGELOG.md`, `TESTING-REPORT.md`

---

## 11. Fun Vault — कमाओ, फिर खेलो

**नियम:**
1. Chapter के Notes पढ़ो और "✅ पढ़ लिए" दबाओ।
2. **📓 नोट्स·PYQ → 🎁 Fun Vault** में उस Chapter का **▶ Challenge** खोलो: Notes से बने **50 प्रश्न**।
3. कम से कम **95%** सही (50 में से **48 सही**, यानी ज़्यादा से ज़्यादा 2 गलत)।
4. 95% पूरा होते ही Vault का अपना **10 मिनट का Timer** शुरू हो जाता है। यह पढ़ाई वाले Timer से अलग है, और Vault का पेज "आज की पढ़ाई" में नहीं गिना जाता।
5. 10 मिनट बाद Vault अपने-आप बंद। दोबारा खोलने के लिए फिर Challenge जीतो।
6. जिस Chapter से 50 से कम (49 या कम) प्रश्न बनते हैं, उससे Vault **नहीं** खुलता। Vault की सूची में लिखा आता है कि अभी कितने प्रश्न बने हैं।

50 प्रश्न बनने के लिए उस Chapter के Notes में `definitions` + `formulas` + `oneLiners` मिलाकर कम से कम 50 आइटम चाहिए (और पूरे विषय में हर तरह के कम से कम 4)। इसके लिए `AI-PROMPTS.md` का Prompt 2 इस्तेमाल करो।

**चुटकुले जोड़ना:**
1. `AI-PROMPTS.md` का **Prompt 1** AI में डालो (100-100 की फ़ाइलें, 500+ के लिए बार-बार)।
2. हर फ़ाइल को `data/vault/jokes-01.json`, `jokes-02.json` … नाम से सेव करो।
3. `data/vault/manifest.json` में हर फ़ाइल की entry जोड़ो:
```json
{ "vault": [
  { "id": "jokes-01", "file": "data/vault/jokes-01.json" },
  { "id": "jokes-02", "file": "data/vault/jokes-02.json" }
] }
```
नमूना: `data/templates/vault-jokes-template.json`। चुटकुले एक चक्र में दोहराए नहीं जाते (सारे दिख जाने के बाद ही फिर से आते हैं)।

**⚠️ lock की सीमा (साफ़ बात):** website के पास server नहीं है, इसलिए यह lock पक्की सुरक्षा नहीं, आत्म-अनुशासन का औज़ार है। इसमें ये उपाय लगे हैं:
- Vault का समय हस्ताक्षर (signature) के साथ सेव होता है — data हाथ से बदलने पर Vault बंद हो जाता है;
- फ़ोन की घड़ी पीछे करने पर Vault बंद हो जाता है;
- Vault खुला हो तो समय दो तरह की घड़ी से गिना जाता है।
पर जो विद्यार्थी browser का data मिटा दे, वह इसे तोड़ सकता है (हालाँकि तब उसका बाकी progress भी मिट जाता है)। **पूरी तरह पक्का lock** के लिए server और हर विद्यार्थी का login चाहिए (जैसे Cloudflare Pages Functions + KV) — यह अलग, बड़ा काम है।

## 12. Sound

ऊपर के 🔊 बटन को दबाओ:
- **Sound चालू/बंद** — कार्ड पलटना, सही/गलत जवाब, जोड़ी मिलना, Result, Level Up, Vault खुलना/बंद होना।
- **🎧 Focus आवाज़** — हल्की, लगातार चलने वाली शांत आवाज़, ताकि पढ़ते समय ध्यान न भटके। चालू करते समय एक नरम घंटी बजती है। Quiz / Challenge शुरू होने पर भी वही घंटी बजती है।

सारी आवाज़ें browser खुद बनाता है — कोई फ़ाइल नहीं, कोई download नहीं, कोई copyright नहीं। पसंद इसी फ़ोन में सेव रहती है।
पुरानी Quiz और Match Master पर भी sound बजता है, **उनकी फ़ाइलें बदले बिना**।
ध्यान रखो: फ़ोन silent mode में हो या volume कम हो तो आवाज़ नहीं आएगी; पहली बार आवाज़ स्क्रीन पर tap करने के बाद ही शुरू होती है।

**इस बार GitHub पर क्या डालना है (पिछले upload के बाद):**
- नई: `js/vault.js`, `js/sound.js`, `AI-PROMPTS.md`, `data/vault/manifest.json`, `data/templates/vault-jokes-template.json`
- पुरानी की जगह नई: `index.html`, `css/extras.css`, `js/extras-core.js`, `js/extras-quiz.js`, `js/notes-game.js`, `README.md`, `NEW-FEATURES-GUIDE.md`, `CHANGELOG.md`, `TESTING-REPORT.md`
