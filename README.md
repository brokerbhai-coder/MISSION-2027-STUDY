MISSION 2027 – STUDY ZONE
पढ़ाई को बनाओ अपना गेम! — Bihar Board Class 12 (2027) के लिए Chapter-wise Quiz, Progress और Rewards वाली study website।
यह एक static website है: सिर्फ़ HTML + CSS + JavaScript + JSON। कोई server, database, API key, login या paid service नहीं चाहिए। GitHub Pages पर मुफ़्त चलती है।
1. कौन-सी फ़ाइल क्या है
फ़ाइल / folder
काम
index.html
मुख्य Homepage — website यहीं से खुलती है
css/style.css, css/responsive.css
रंग और design
js/app.js
Home, Settings, बटनों का काम, शुरुआत
js/router.js
पेज बदलना (#/home, #/subject/physics ...)
js/subjects.js
विषयों की list और Subject Dashboard
js/chapters.js
Chapter की JSON पढ़ना, प्रश्नों की जाँच, Chapter lock/unlock
js/quiz.js
Quiz, Result, Review
js/progress.js
Score, accuracy, weak chapters, Progress पेज
js/rewards.js
XP, Level, Achievements, Daily Challenge
js/mistakes.js
Mistake Notebook
js/timer.js
पढ़ाई का असली समय
js/games.js
Brain Game (Unit Match)
js/storage.js
Progress सेव/लोड, Backup
data/subjects.json
6 विषय और Chapters की list (यहीं से Chapter जोड़ते हैं)
data/physics/chapter-01.json … chapter-08.json
Physics के प्रश्न यहाँ जाएँगे (अभी खाली)
data/chemistry/ mathematics/ biology/ hindi/ english/
बाकी विषयों के प्रश्न बाद में यहाँ आएँगे
data/demo/demo-quiz.json
सिर्फ़ जाँच के लिए 6 Demo सवाल (PDF वाले नहीं)
data/question-template.json
प्रश्न लिखने का नमूना (website इसे लोड नहीं करती)
2. अभी website में क्या है और क्या नहीं
✅ 6 विषय (Physics, Chemistry, Maths, Biology, Hindi, English) के Dashboard
✅ Physics के Chapter 1–8 जुड़े हुए हैं (नाम सही, notes "तैयार" चिह्नित)
✅ Quiz, Result, Review, Mistake Notebook, XP, Level, Streak, Achievements, Daily Challenge, Brain Game, Backup
⏳ Physics 1–8 की question banks अभी खाली हैं। वो तुम्हारे PDF से अलग से बनेंगी। तब तक chapter पर लिखा दिखता है: "इस Chapter के प्रश्न अभी जोड़े नहीं गए हैं।" और Content Coming Soon
⏳ बाकी 5 विषय: Content Coming Soon
🧪 Demo Quiz (Home पर) में 6 सामान्य सवाल हैं — सिर्फ़ यह जाँचने के लिए कि सब कुछ ठीक चल रहा है। ये PDF के असली प्रश्न नहीं हैं।
3. GitHub Pages पर Android से डालना
पहले ZIP को अपने फ़ोन में Extract करो (Files by Google → ZIP पर टैप → Extract)।
पहली बार: repository और Pages चालू करना
Chrome में github.com खोलो, login करो। Chrome के ⋮ मेन्यू में "Desktop site" ✔ करो (आसानी रहती है)।
New repository बनाओ (जैसे नाम: mission2027), Public रखो, Create।
Repository में Settings → Pages जाओ। Source में Deploy from a branch चुनो, Branch main, folder /(root) → Save।
1–2 मिनट बाद वहीं ऊपर तुम्हारी website का लिंक दिखेगा: https://तुम्हारा-नाम.github.io/mission2027/
फ़ाइलें upload करना (folder-वार) — तरीका A
GitHub की website फ़ोन से पूरा folder एक साथ upload नहीं करने देती, इसलिए folder-दर-folder डालो:
Repository में Add file → Upload files → Extract किए folder के root की फ़ाइलें चुनो: index.html और README.md → नीचे Commit changes।
फिर हर folder के लिए इस लिंक-पैटर्न से upload पेज खोलो (अपना नाम/repo बदलकर):
https://github.com/तुम्हारा-नाम/mission2027/upload/main/css → style.css, responsive.css चुनो → Commit
.../upload/main/js → js की सारी 11 फ़ाइलें चुनो → Commit
.../upload/main/data → subjects.json, question-template.json → Commit
.../upload/main/data/physics → chapter-01.json से chapter-08.json (8 फ़ाइलें) → Commit
.../upload/main/data/demo → demo-quiz.json
.../upload/main/data/chemistry, .../mathematics, .../biology, .../hindi, .../english → हर folder की README.txt
अगर कोई upload/main/... लिंक 404 दे, तो नीचे का तरीका B इस्तेमाल करो।
तरीका B (हर फ़ाइल हाथ से बनाना — पक्का काम करता है)
Repository में Add file → Create new file → नाम वाले खाने में पूरा path लिखो, जैसे css/style.css (स्लैश / लिखते ही folder अपने-आप बन जाता है) → फ़ाइल का पूरा text वहाँ paste करो → Commit new file। हर फ़ाइल के लिए यही दोहराओ।
⚠️ ध्यान: फ़ोल्डर/फ़ाइल के नाम बिल्कुल वैसे ही रखो (छोटे अक्षर, chapter-01.json जैसे)। GitHub पर Index.html और index.html अलग माने जाते हैं।
पुरानी website को नई से बदलना
वही नाम की फ़ाइल दोबारा upload करने पर पुरानी फ़ाइल अपने-आप बदल जाती है (Commit करना ज़रूरी)।
पुरानी बेकार फ़ाइलें हटानी हों: repository में फ़ाइल खोलो → ⋮ (तीन बिंदु) → Delete file → Commit।
ध्यान रखो कि index.html root में हो (किसी folder के अंदर नहीं)।
चेक करना कि website चल रही है
Pages का लिंक खोलो। (नया upload किया हो तो 1–2 मिनट रुको; पुराना पेज दिखे तो लिंक के आख़िर में ?v=2 जोड़ो या browser में refresh करो।)
Home पर छह Subject cards और "चलो Ankit, आज अपनी तैयारी शुरू करते हैं!" दिखना चाहिए।
Physics खोलो → 8 Chapters दिखें।
Home के नीचे Demo Quiz खेलो → Result में XP दिखे।
सेटिंग → 🔍 Data Check खोलो — यहाँ हर chapter के प्रश्नों की गिनती और कोई गलती दिखती है।
सफ़ेद/खाली पेज या "डेटा लोड नहीं हो पाया" दिखे तो नीचे समस्या हो तो देखो।
index.html को सीधे फ़ोन की फ़ाइल से (file://) खोलने पर data नहीं लोड होगा — यह website GitHub Pages के लिंक से चलने के लिए बनी है। (कंप्यूटर पर टेस्ट करना हो तो folder में python -m http.server चलाकर http://localhost:8000 खोलो।)
4. PDF के प्रश्न कहाँ और कैसे जोड़ें
हर chapter की अपनी फ़ाइल है, जैसे Physics Chapter 1 के लिए data/physics/chapter-01.json। उसमें "questions": [] की list खाली है। उसी में प्रश्न डालो।
एक प्रश्न का format
{
  "id": "PHY01Q001",
  "subject": "physics",
  "chapter": 1,
  "question": "प्रश्न यहाँ",
  "options": {
    "A": "विकल्प A",
    "B": "विकल्प B",
    "C": "विकल्प C",
    "D": "विकल्प D"
  },
  "answer": "A",
  "explanation": "उत्तर की आसान हिंदी में व्याख्या",
  "source": "PDF",
  "type": "objective"
}
कई प्रश्न हों तो उन्हें कॉमा , से अलग करके questions की list में रखो:
"questions": [
  { ...पहला प्रश्न... },
  { ...दूसरा प्रश्न... }
]
नियम (website खुद जाँचती है)
id हर प्रश्न की अलग होनी चाहिए (पूरी website में)। सुझाव: PHY01Q001, PHY01Q002 … (PHY = Physics, 01 = chapter, Q001 = प्रश्न-संख्या)
चारों विकल्प A, B, C, D ज़रूरी हैं। answer में सिर्फ़ A/B/C/D।
source में साफ़ लिखो: PDF (PDF से लिया), CONCEPT (अपना concept-based प्रश्न), PYQ (पिछले साल का प्रश्न)। Quiz में प्रश्न के ऊपर यही लेबल दिखता है। (PYQ तभी डालो जब सच में PYQ हो।)
गलत format वाला प्रश्न website छोड़ देती है और सेटिंग → Data Check में कारण बताती है (जैसे "दोहराई हुई ID")।
JSON में हर text " " में हो, और आख़िरी प्रश्न के बाद कॉमा न हो।
नमूना: data/question-template.json
5. नया Chapter कैसे जोड़ें
data/subjects.json खोलो, उस विषय के "chapters" list में एक नया block जोड़ो (Physics का Chapter 9 उदाहरण):
{ "number": 9, "title": "Chapter का नाम", "file": "data/physics/chapter-09.json", "notesReady": true, "notesUrl": null }
(पिछले block के बाद कॉमा , लगाना मत भूलना।) 2. data/physics/chapter-09.json नाम की नई फ़ाइल बनाओ (किसी पुरानी chapter फ़ाइल की copy करके):
{ "subject": "physics", "chapter": 9, "title": "Chapter का नाम", "questions": [] }
उसमें प्रश्न डालो (ऊपर वाला format)।
Physics के अध्याय 9–15 के लिए subjects.json में futureChapters लिखा है — अध्याय जुड़ने पर उसे हटा सकते हो।
दूसरे विषय का पहला Chapter: subjects.json में उस विषय की "status" को "coming_soon" से "available" कर दो, और "chapters" में ऊपर की तरह chapters जोड़ो।
Chapter lock/unlock: हर विषय में "progression":
"free" — सारे Chapters किसी भी क्रम में खुले (Physics अभी यही है)
"sequential" — अगला Chapter तब खुलेगा जब पिछला 60%+ से पास हो (पास-मार्क बदलना हो तो "settings": { "passPercent": 60 }, या किसी विषय में "passPercent": 70 जोड़ो)
Notes PDF का बटन (वैकल्पिक): PDF को notes/physics/chapter-01.pdf जैसे path पर upload करो और उस chapter में "notesUrl": "notes/physics/chapter-01.pdf" लिखो — Chapter पेज पर "Notes खोलो" बटन दिखने लगेगा।
6. XP और Rewards के नियम (rewards.js में बदल सकते हो)
कब
XP
नया सही उत्तर (हर प्रश्न का XP सिर्फ़ पहली बार सही करने पर)
10
Chapter का Quiz पहली बार पूरा
+20
पहली बार पास (60%+)
+50
Replay bonus (दिन में सिर्फ़ 3 बार)
5
Daily Challenge (आज 10 सवाल सही) — दिन में एक बार
+40
Daily study goal पूरा — दिन में एक बार
+30
Brain Game जीत (दिन में अधिकतम 20 XP)
10
Level = √(XP ÷ 50) + 1 (Lv 2 = 50 XP, Lv 3 = 200 XP, Lv 4 = 450 XP …)
Streak: जिस दिन 5 मिनट active पढ़ाई करो या कोई Quiz पूरा करो, वह दिन गिना जाता है। एक दिन छूटा तो streak फिर 1 से।
अधूरा/रद्द Quiz कभी "पूरा" नहीं गिना जाता और उसका XP नहीं मिलता। अधूरा Quiz सेव रहता है — Home पर "जारी रखो" दिखता है।
7. Progress, Backup और Reminder
Progress localStorage में सेव होता है — यानी सिर्फ़ इसी फ़ोन के इसी browser में। दूसरे फ़ोन/browser में अपने-आप नहीं जाता।
Browser का data/cache साफ़ करोगे तो progress मिट जाएगा। इसलिए सेटिंग → Backup file डाउनलोड करो (बीच-बीच में)। वापस लाने के लिए उसी पेज पर file चुनो या text paste करो। Import से पहले file की जाँच होती है।
सेटिंग → Reset से सब मिटता है (पुष्टि पूछकर)।
GitHub Pages असली notification नहीं भेज सकता। "कल छुट्टी मार ली थी क्या?" वाला reminder तभी दिखेगा जब तुम website खोलोगे।
पढ़ाई का समय सिर्फ़ तब गिना जाता है जब tab खुला हो, तुम पढ़ाई वाले पेज (Subject/Chapter/Quiz/Mistakes/Game) पर हो और 90 सेकंड (Quiz में 180 सेकंड) के अंदर screen छुई हो। Home और Settings पर समय नहीं गिनता।
8. समस्या हो तो
समस्या
हल
सफ़ेद/खाली पेज
index.html root में है? Pages चालू है? 1–2 मिनट रुककर refresh करो
"Website का data लोड नहीं हो पाया"
Pages के लिंक से खोलो (file:// से नहीं); data/subjects.json upload हुई है?
Chapter में "0 प्रश्न"
उस chapter की JSON में प्रश्न जोड़े? सेटिंग → Data Check देखो
प्रश्न नहीं दिख रहे
Data Check में लिखा कारण देखो (दोहराई ID, कोई option खाली, answer गलत)
नया upload दिख नहीं रहा
लिंक के आख़िर में ?v=2 जोड़ो, या browser में hard refresh
JSON में गड़बड़
कॉमा/कोट्स जाँचो; पूरी chapter-XX.json को jsonlint.com पर paste करके देखो
