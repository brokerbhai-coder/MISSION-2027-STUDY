# TESTING REPORT (21 सितंबर 2026)

**कैसे जाँचा:** असली Chromium browser (Playwright) में, local server पर, फ़ोन जैसी screen (360×740 और 320×640) में। नए sections की जाँच के लिए एक **अलग अस्थायी copy** में टेस्ट के नकली data (test fixtures) डाले गए। **ये टेस्ट data ZIP में नहीं हैं** — ZIP में तीनों manifests खाली हैं।

## ✅ वास्तव में जाँचा गया

**पुरानी website (असली ZIP की फ़ाइलों पर, नए code के साथ):**
- Home खुलता है; Subject, Progress, Mistakes, Settings, Game पेज खुलते हैं; खाली विषय (English) का पेज खुलता है
- Physics अध्याय 1 का Quiz चला → सारे प्रश्न हल → Result पेज आया
- Chapter Lock: पास करने से पहले अध्याय 2 बंद था, अध्याय 1 पास करते ही खुल गया
- नए पेज घूमने के बाद पुराना Quiz history, XP और Mistakes वैसे ही रहे; सिर्फ़ पढ़ाई के समय वाले fields बदल सकते हैं
- नए sections ने पुरानी storage key नहीं छुई; अपनी अलग key बनाई (और खाली manifests पर कुछ बनाया ही नहीं)

**नए sections, खाली manifests के साथ (जैसा ZIP आएगा):**
- Hub, Notes, PYQ, Practice के सारे पेज खुलते हैं, हर जगह 6 विषय दिखते हैं, कहीं crash नहीं
- खाली जगह पर सही संदेश दिखता है; अनजाना विषय/Chapter/Result खोलने पर "नहीं मिला" पेज आता है
- 5 नए scripts के कारण कोई JavaScript error नहीं आया

**नए sections, test data के साथ:**
- **Notes:** सिर्फ़ भरी हुई categories दिखीं; category बदलना, खोज (search), Chapter list का filter; HTML लिखने पर वह text की तरह दिखा (कोई code नहीं चला); `**मोटा**` सही दिखा; SVG चित्र सही खुला; `../` वाला image path रोका गया; embed वाला 3D/HTML पेज sandbox में खुला
- **PYQ:** सालों का क्रम (नया पहले); एक साल में कई Set; उत्तर दिखाना/छिपाना और सही option का highlight; Objective/Short/Long filter; खोज; दोहराई ID और अधूरे प्रश्न छोड़े गए और सूची में दिखे; Objective प्रश्नों का Quiz Mode
- **Mixed Practice:** Set की सूची, प्रश्नों की संख्या और क्रम चुनना, Timer चलना, सही/गलत feedback, **page reload के बाद अधूरा अभ्यास वापस मिला**, "बचे प्रश्न छोड़कर Result", Score और Chapter-वार नतीजा, Review (सभी / सिर्फ़ गलत), सबसे अच्छा score सेव होना, दोबारा करो, उल्टी गिनती वाला Timer और समय पूरा होने का संदेश, अधूरा अभ्यास होते हुए नया शुरू करने का dialog, रद्द करना
- **गलत data पर:** गायब फ़ाइल, टूटी JSON, खाली फ़ाइल, manifest में गलत विषय/chapter, `../` वाला path, गलत `id` — हर बार साफ़ संदेश आया, website crash नहीं हुई
- **Data Check** बटन ने सही, चेतावनी और गड़बड़ी वाली entries अलग-अलग बताईं
- **Cloudflare जैसा व्यवहार** (गायब फ़ाइल पर 404 की जगह `index.html` लौटना) नकली server से जाँचा: तब भी साफ़ "JSON सही नहीं है / फ़ाइल नहीं मिली" संदेश आया
- **Mobile layout:** 320px और 360px चौड़ाई पर हर नए पेज में साइड-स्क्रॉल नहीं आया; screenshot देखकर 2 गड़बड़ियाँ (Hub का banner टूटना, Quiz में लंबा chapter नाम) पाईं और ठीक कीं

**नतीजा:** 2 जाँच "फेल" दिखीं, दोनों कोड की गलती नहीं थीं: (1) मूल ZIP में भी मौजूद Demo Quiz की 404 (path गलत), (2) मेरे टेस्ट में एक संख्या गलत लिखी थी (सही व्यवहार जाँचकर पक्का किया)।

## ❌ जाँचा नहीं गया (इन्हें सच में टेस्ट हुआ न मानना)

- **असली फ़ोन** (Android Chrome, iPhone Safari) और असली GitHub Pages / Cloudflare Pages पर live जाँच
- **असली Notes / PYQ / Practice Content** — सिर्फ़ नकली test data से जाँचा
- पुरानी website के ये हिस्से: Review पेज, Mistake Notebook का retry, XP/Level/Achievements के हिसाब, Brain Game खेलना, Backup / Import / Reset, Settings का Data Check (सिर्फ़ पेज खुलना देखा)
- Demo Quiz (मूल path की गड़बड़ी के कारण चलता ही नहीं)
- बहुत बड़ी JSON फ़ाइलें (सैकड़ों प्रश्न) पर गति; बिना internet (offline) चलना
- नए sections के data का Backup में शामिल होना (शामिल है ही नहीं)
