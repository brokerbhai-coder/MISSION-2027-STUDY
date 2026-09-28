/* ==========================================================
   question-pool.js (नया)
   काम: Maze के Quiz-Lock के लिए सवाल अब अपने बनाए हुए (India GK) नहीं,
   बल्कि सीधे मुख्य Website के असली Content से आते हैं —
   1. Chapter Quiz (data/subjects.json में जितने भी Subject/Chapter हैं)
   2. PYQ (data/pyq/manifest.json में जो भी जुड़ा हो)
   3. Mixed Practice (data/practice/manifest.json में जो भी जुड़ा हो)

   यह Page games/brutal-brain-maze/ के अंदर है, इसलिए हर Path के आगे
   "../../" लगाकर असली Repo के Root तक पहुँचते हैं।

   हर Question इस रूप में लौटता है (quiz-lock.js जिस Format में चाहता है):
   { q: "सवाल", options: ["A","B","C","D"], ans: 0-3 }
   ========================================================== */

const ROOT = '../../';
const LETTERS = ['A', 'B', 'C', 'D'];

function getJson(path) {
    return fetch(ROOT + path, { cache: 'no-cache' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });
}

// Chapter/PYQ/Practice — तीनों की JSON Question एक जैसी बनावट (options A-D + answer) रखती हैं
function convert(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var q = raw.question;
    var o = raw.options;
    var ans = raw.answer;
    if (typeof q !== 'string' || !q.trim() || !o || typeof o !== 'object') return null;
    var opts = LETTERS.map(function (L) { return o[L]; });
    if (opts.some(function (t) { return typeof t !== 'string' || !t.trim(); })) return null;
    var ansIdx = LETTERS.indexOf(String(ans).trim().toUpperCase());
    if (ansIdx < 0) return null;
    return { q: q.trim(), options: opts, ans: ansIdx };
}

function fromQuestionsArray(raw, onlyObjective) {
    if (!raw || !Array.isArray(raw.questions)) return [];
    var out = [];
    raw.questions.forEach(function (item) {
        if (onlyObjective && item.type && item.type !== 'objective') return; // PYQ के short/long छोड़ो
        var c = convert(item);
        if (c) out.push(c);
    });
    return out;
}

function currentStream() {
    var w = window.M27;
    return (w && w.Storage && w.Storage.state && w.Storage.state.stream) || null; // null = अभी तय नहीं, तब सब Subject चलेंगे
}

function loadChapterQuizPool() {
    return getJson('data/subjects.json').then(function (data) {
        if (!data || !Array.isArray(data.subjects)) return [];
        var stream = currentStream();
        var jobs = [];
        data.subjects.forEach(function (s) {
            // Arts वाले को Science के Chapter नहीं, Science वाले को Arts के नहीं — Hindi/English ("common") हमेशा
            if (stream && s.stream && s.stream !== 'common' && s.stream !== stream) return;
            (s.chapters || []).forEach(function (c) {
                if (!c.file) return;
                jobs.push(getJson(c.file).then(function (raw) {
                    return fromQuestionsArray(raw, false);
                }));
            });
        });
        return Promise.all(jobs).then(function (lists) { return [].concat.apply([], lists); });
    });
}

function loadPyqPool() {
    return getJson('data/pyq/manifest.json').then(function (data) {
        if (!data || !Array.isArray(data.pyq)) return [];
        var jobs = data.pyq.filter(function (e) { return e && e.file; }).map(function (e) {
            return getJson(e.file).then(function (raw) { return fromQuestionsArray(raw, true); });
        });
        return Promise.all(jobs).then(function (lists) { return [].concat.apply([], lists); });
    });
}

function loadPracticePool() {
    return getJson('data/practice/manifest.json').then(function (data) {
        if (!data || !Array.isArray(data.practice)) return [];
        var jobs = data.practice.filter(function (e) { return e && e.file; }).map(function (e) {
            return getJson(e.file).then(function (raw) { return fromQuestionsArray(raw, false); });
        });
        return Promise.all(jobs).then(function (lists) { return [].concat.apply([], lists); });
    });
}

// तीनों जगह से मिलाकर एक बड़ा Pool — Maze शुरू होते ही एक बार Load होता है
export function loadQuestionPool() {
    return Promise.all([loadChapterQuizPool(), loadPyqPool(), loadPracticePool()])
        .then(function (parts) {
            var all = [].concat(parts[0], parts[1], parts[2]);
            console.log('[Brutal Brain Maze] कुल ' + all.length + ' सवाल मिले (Chapter Quiz: ' + parts[0].length + ', PYQ: ' + parts[1].length + ', Practice: ' + parts[2].length + ')');
            return all;
        });
}
