# AI Prompt — Physics Virtual Lab (कक्षा 12, बिहार बोर्ड): असली lab जैसा Interactive Experiment

⚠️ **यह prompt इसी website की बातचीत में नहीं, एक अलग/नई chat में चलाना है** (जैसा तुमने कहा)। वहाँ इस website की **असली ZIP** भी attach करनी है, ताकि वही coding style और design आगे भी वैसा ही रहे।

## यह कैसे बनेगा (ज़रूरी समझ)

Notes में AI सिर्फ़ text/JSON बनाता है — गलती हो तो एक गलत line होती है। पर Lab का "calculation" कोड में होता है — अगर AI ने formula खुद ग़लत लिख दिया, तो simulation **हर बार ग़लत जवाब देगा, और किसी को पता भी नहीं चलेगा**। इसलिए यहाँ दो अलग चीज़ें हैं:

1. **Engine (एक बार, सावधानी से बनता है):** `js/lab.js` — इसमें 6 जाने-पहचाने experiment "types" का **सही physics formula पहले से fix** होता है (नीचे सूची में)। यह हिस्सा Master Prompt बनवाता है।
2. **हर experiment का Data (जितनी बार चाहो, आसानी से):** apparatus का चित्र, steps, parameter की range — यह Experiment Prompt बनवाता है, तुम्हारे Sir के असली practical notes से। इसमें कोई नया calculation-code नहीं लिखा जाता, इसलिए यह हिस्सा सुरक्षित है।

## इस्तेमाल का तरीका
1. **नई chat** खोलो, इस website की **असली, updated ZIP attach करो**।
2. **Prompt 1 (Master)** भेजो। AI पूरा `js/lab.js` engine + पहला experiment बनाएगा, **अपने-आप Playwright से टेस्ट करेगा** (जैसे इस website के बाकी features बने), और सिर्फ़ नई/बदली फ़ाइलें देगा — पूरी ZIP नहीं।
3. हर अगले experiment के लिए **Prompt 2** भेजो, उस experiment के तुम्हारे Sir के असली notes (फ़ोटो/PDF) attach करके।
4. मिली फ़ाइलें अपनी website में GitHub पर डालो, जैसे बाकी features डाले।

---

## PROMPT 1 — Master (Engine बनाना, सिर्फ़ पहली बार)

~~~~
तुम एक सावधान Senior Frontend Developer हो। मैंने अपनी study website की पूरी ZIP attach की है। इसे पहले पूरी तरह समझो — खासकर `js/extras-core.js`, `js/vault.js`, `js/notes-game.js` (design pattern के लिए), `css/extras.css`, `index.html`, और `data/subjects.json`।

## काम: एक नया "Virtual Physics Lab" section बनाओ
इसका मकसद: विद्यार्थी असली प्रयोगशाला (lab) जैसा अनुभव ले — पहले "क्या करना है" पढ़े, फिर उपकरण पर parameter set करे (slider/input से), और चित्र **उसी हिसाब से बदले** (जैसे meter जो सुई घुमाए, resistance box का घुंडी, bulb की रोशनी)। **यह असली नहीं, visual/समझने के लिए है** — शुरुआत में साफ़ लिखा हो: "यह एक Virtual Simulation है, असली Lab जैसा दिखने के लिए बनाया गया है।"

## A. सबसे ज़रूरी नियम — गलत Physics कभी नहीं
1. **कभी भी कोई नया calculation खुद मत गढ़ना।** सिर्फ़ नीचे दिए 6 "experiment types" का calculation लिखना है, हर एक की जाँच किताब के मानक सूत्र से करके।
2. **कभी `eval()` या `new Function()` से किसी text को कोड की तरह मत चलाना।** हर experiment का calculation सीधे, hand-written JavaScript function के रूप में `js/lab.js` के अंदर हो, experiment के JSON data से सिर्फ़ संख्याएँ (values, ranges) आएँ — कोई सूत्र-text नहीं।
3. हर calculation को **किताब के जाने-पहचाने उदाहरण से जाँचो** (जैसे Ohm's law में R=V/I के 2-3 मानक मान डालकर सही उत्तर आता है या नहीं) — यह जाँच परीक्षण (test) में दिखे।
4. Values एकदम सीधी रेखा जैसी (बिना किसी natural जैसे उतार-चढ़ाव के) मत रखना — थोड़ा सा (±1-2%) natural जैसा उतार-चढ़ाव (deterministic seeded random, हर बार अलग नहीं बल्कि उसी parameter पर लगभग वही) ठीक है, जैसे असली मीटर में होता है, ताकि "graph के बिंदु बिल्कुल एक सीधी रेखा पर" जैसा नकली न लगे।

## B. Experiment के 6 जाने-पहचाने "types" (सिर्फ़ इन्हीं का calculation लिखना; इनके अलावा कुछ मिले तो engine मत बनाना, सिर्फ़ रिपोर्ट में बताना)
1. **ohms-law** — Resistance Box + Ammeter + Voltmeter; V = IR; student R बदले, I दिखे, V-I graph बने।
2. **meter-bridge** — अज्ञात प्रतिरोध; R = R_known × (100−l)/l, जहाँ l balance point की लंबाई (cm) है; student balance point खिसकाए (jockey), galvanometer की सुई शून्य पर आए तो "balanced" दिखे।
3. **potentiometer-emf** — दो सेलों के EMF की तुलना; E1/E2 = l1/l2 (balancing length का अनुपात)।
4. **galvanometer-conversion** — Galvanometer को Ammeter (shunt, S = Ig·G/(I−Ig)) या Voltmeter (series resistance, R = V/Ig − G) में बदलना।
5. **convex-lens-uv** — 1/f = 1/v − 1/u (चिह्न-परंपरा किताब जैसी); student u बदले, ray-diagram से v दिखे, f निकले।
6. **diode-characteristic** — p-n junction diode; forward bias में I = I₀(e^(V/ηV_T) − 1) जैसा सरल approximation (threshold ~0.7V के आसपास curve ऊपर जाए) और reverse bias में लगभग सीधी, बहुत छोटी धारा — student V बदले, I का graph बने।

## C. Engine का ढाँचा (नई फ़ाइलें; पुरानी कोई फ़ाइल मत छूना — सिर्फ़ नीचे बताए दो छोटे बदलाव)
- `js/lab.js` — मुख्य engine: routes (`#/lab`, `#/lab/:subject`, `#/lab/:subject/:id`), manifest पढ़ना (`data/lab/manifest.json`, इसी पुराने website के manifest pattern जैसा — सुरक्षित path जाँच, missing/error/empty states, कभी crash नहीं), हर experiment JSON पढ़कर render करना, ऊपर के 6 types के calculation functions।
- `css/lab.css` — design, मौजूदा `:root` के CSS variables (`--surface`, `--line`, `--accent` आदि) इस्तेमाल करना, मौजूदा जैसे `.card`, `.chip`, `.btn` classes का ढाँचा मानना।
- `data/lab/manifest.json` — experiments की सूची (जैसे बाकी manifest फ़ाइलें: `{ "lab": [ { "subject": "physics", "id": "ohms-law", "type": "ohms-law", "title": "…", "file": "data/lab/physics/ohms-law.json" } ] }`)।
- `data/lab/physics/<id>.json` — हर experiment का data: aim, apparatus की सूची, steps (क्रमांकित text), slider/input की परिभाषा (min, max, step, unit, शुरुआती मान), observation table के columns, result का सूत्र-नाम (ऊपर के 6 types में से एक)।
- **मौजूदा फ़ाइलों में सिर्फ़ 2 छोटे, साफ़ बदलाव करने हैं** (जैसे Vault/Notes Game जोड़ते समय हुए थे): (1) `index.html` में एक और `<script src="js/lab.js"></script>` line; (2) `js/extras-core.js` के Hub पेज में एक "🧪 Virtual Lab" card जोड़ना (उसी तरीके से जैसे वहाँ Notes/PYQ/Practice/Vault card जुड़े हैं — `M.Router.add('/extras', viewHub)` वाले पेज में)।

## D. Apparatus का चित्र — Engine खुद बनाता है, JSON से नहीं आता
हर experiment "type" (ऊपर के 6) का अपना **तैयार, animate होने वाला SVG** सीधे `js/lab.js` के अंदर (JavaScript से) बनाओ — experiment के JSON में कोई "svg" field नहीं होगी। ऐसा इसलिए ताकि हर experiment हमेशा एक जैसा सही, टूटा-न-हुआ चित्र दिखाए, भले ही उसका data कोई भी बनाए।
- हर type के लिए `L.DRAW[type] = { svg: "<svg …>तय ids वाला template</svg>", update: function(svgEl, reading, params, constants) { /* attribute बदलकर animate करना, जैसे सुई का rotate */ } }` जैसा ढाँचा रखो।
- `svg` में हर बदलने वाले हिस्से का एक साफ़ `id` हो (जैसे `id="needleI"`); `update()` सिर्फ़ उन्हीं ids के attribute बदले (transform, x2/y2, text) — पूरा SVG दोबारा मत बनाना (धीमा और flicker करता है)।
- viewBox `0 0 400 260` जैसा रखो, गहरे रंग की रेखाएँ, सफ़ेद background मानकर बनाओ, कोई script/style/बाहरी image नहीं।
- नया 6वाँ से अलग "type" चाहिए हो (जैसे किसी नए experiment के लिए) तो उसका SVG+calculation भी यहीं, कोड में जोड़ना है — सिर्फ़ experiment JSON से नहीं बन सकता (Prompt 2 का काम सिर्फ़ मौजूदा types का data भरना है)।

## E. Interaction और UI के नियम
- Procedure **step-by-step खुलता जाए**: पहला step दिखे, उसमें जो कहा गया है वह करने पर ("resistance 2Ω पर सेट करो") अगला step खुले। हर step में साफ़, hindi में instruction ("यह लो, इतना पैरामीटर सेट करो, यह temperature रखो" जैसे)।
- Apparatus का SVG **DOM में सीधे attribute बदलकर animate हो** (जैसे सुई का `transform="rotate(...)"`, बल्ब की `fill-opacity`) — कभी पूरा SVG दोबारा string से नहीं बनाना हर छोटे बदलाव पर (धीमा और flicker करता है)।
- Slider/input बदलते ही (debounce ~100ms) reading और चित्र दोनों अपडेट हों।
- Observation table में हर reading अपने-आप जुड़े (student के लिए "✅ यह reading लो" बटन से, न कि अपने-आप बिना कुछ किए)।
- आख़िर में result निकालना (जैसे ढलान से R निकालना) विद्यार्थी खुद करे — answer input में डाले, सही/ग़लत बताया जाए (tolerance ±5%)।
- शुरुआत में साफ़ चेतावनी: यह असली Lab नहीं, समझने के लिए Simulation है, असली Lab ज़रूर करना।

## F. Data फ़ाइल का ढाँचा (नमूना, कोई "svg" field नहीं)
```json
{
  "schemaVersion": 1,
  "subject": "physics",
  "id": "ohms-law",
  "type": "ohms-law",
  "title": "ओम के नियम का सत्यापन",
  "aim": "किसी प्रतिरोधक के लिए धारा और विभवांतर के बीच संबंध ज्ञात करना।",
  "apparatus": ["बैटरी", "Resistance Box", "Ammeter", "Voltmeter", "Rheostat", "Key"],
  "steps": [
    { "text": "परिपथ को चित्र के अनुसार जोड़ो और Key को बंद रखो।" },
    { "text": "Resistance Box में 2Ω सेट करो।", "param": "R", "target": 2 },
    { "text": "Key बंद करो और Ammeter व Voltmeter की रीडिंग लो।", "action": "read" }
  ],
  "params": [ { "key": "R", "label": "प्रतिरोध (R)", "unit": "Ω", "min": 1, "max": 20, "step": 1, "default": 2 } ],
  "constants": { "emf": 6, "internalR": 0.5 },
  "table": { "columns": ["R (Ω)", "V (Volt)", "I (Ampere)"] },
  "resultHint": "V/I का ग्राफ़ बनाकर ढाल (slope) से R निकालो।"
}
```

## G. जाँच (Test) — देने से पहले ज़रूर करना
1. `bash_tool` से एक local server चलाओ, Playwright से (जैसे इस website के बाकी features में हुआ) असली Chromium में खोलकर जाँचो: पेज बिना error खुलता है, slider हिलाने पर चित्र और reading दोनों बदलते हैं, हर 6 types में से जो टाइप इस्तेमाल हुआ उसका calculation किताब के मानक उदाहरण से मिलता है (कम से कम 3 जाँची हुई values), 320px मोबाइल पर side-scroll नहीं आता, पुराने पेज (Quiz, Notes, आदि) अब भी वैसे ही काम करते हैं।
2. एक Testing Report दो: क्या-क्या टेस्ट किया, कौन-सी values जाँचीं, क्या नहीं टेस्ट किया।

## H. आउटपुट नियम
1. **पूरी ZIP मत देना** — सिर्फ़ नई/बदली फ़ाइलें (`js/lab.js`, `css/lab.css`, `data/lab/manifest.json`, पहले experiment (Ohm's law) का data file, और `index.html`+`js/extras-core.js` के बदले हुए हिस्से)।
2. एक Changelog दो: कौन-सी फ़ाइलें नई हैं, कौन-सी बदलीं और क्यों।
3. `data/lab/manifest.json` में सिर्फ़ वह experiment डालो जो तुमने बनाया (Ohm's law) — बाकी types का सिर्फ़ calculation-code तैयार रखो, बाकी experiments का data बाद में Prompt 2 से जुड़ेगा।

शुरू करो: पहले बताओ कि तुमने website की ZIP समझ ली और ऊपर के नियम साफ़ हैं, फिर Engine + Ohm's law experiment बनाओ।
~~~~

---

## PROMPT 2 — नया Experiment जोड़ना (हर experiment के लिए, Master के बाद)

~~~~
इस बार का experiment: [यहाँ भरो, जैसे: Meter Bridge से अज्ञात प्रतिरोध ज्ञात करना]
Type (ऊपर के 6 में से): [जैसे: meter-bridge]

मैंने अपने Sir के असली Lab-manual/notes (फ़ोटो/PDF) attach किए हैं। इसी में जो Aim, Apparatus, Procedure के step, और सावधानियाँ (precautions) लिखी हैं, वही इस्तेमाल करो — अपनी तरफ़ से नए step या नई सावधानी मत जोड़ना।

काम: सिर्फ़ `data/lab/physics/[id].json` बनाओ (ऊपर मास्टर प्रॉम्प्ट के format F के अनुसार), जिसमें:
- मेरे Sir के notes के अनुसार Aim, Apparatus, हर Procedure step
- इस experiment के लिए सही params (range असली उपकरण जैसी हो, जैसे Resistance Box 0-100Ω)
- `data/lab/manifest.json` में जोड़ने की एक पंक्ति
(चित्र नहीं बनाना — वह इंजन में उसी "type" के लिए पहले से बना है)

**कोई नया calculation-code मत लिखना** — सिर्फ़ Type चुनो, engine खुद calculation करेगा। अगर यह experiment किसी मौजूदा Type में फिट नहीं बैठता, तो मुझे साफ़ बता दो कि नया Type चाहिए (और उसका formula क्या होगा) — मैं वह इंजन में जुड़वाकर बाद में बताऊँगा।

भेजने से पहले जाँचो: JSON सही है, params की range असली उपकरण जैसी है, SVG के tag बंद हैं।
~~~~

---

## ध्यान रखने की बातें
- यह website की **असली, latest ZIP** attach करना ज़रूरी है — तभी design और conventions सही मिलेंगे।
- Engine (Prompt 1) सिर्फ़ **एक बार** बनता है। उसके बाद हर experiment के लिए सिर्फ़ Prompt 2 चलाना है (हर बार नई chat या उसी में आगे)।
- Chemistry और Biology के लिए यह पैटर्न बाद में अलग engine (अलग "types": रंग-बदलाव, titration, labeled-diagram) से बनेगा — पहले Physics को अच्छी तरह चला कर देख लो।
