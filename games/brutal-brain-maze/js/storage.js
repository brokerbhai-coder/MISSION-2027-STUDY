/* ==========================================================
   storage.js (Bridge Version)
   पहले यह अपनी अलग localStorage ("brutalBrainMaze") में सब रखता था।
   अब यह सीधे मुख्य MISSION 2027 Website के असली Storage + Rewards System
   (window.M27.Storage / window.M27.Rewards, key: mission2027_progress_v1) से जुड़ा है —
   ताकि Level, Unlock और XP मुख्य Website के साथ एक ही जगह Save हों, और
   "बार-बार खेलने पर XP कम होता जाए" वाला नियम यहाँ भी वैसे ही लागू हो।

   ज़रूरी: इस Page (index.html) में मुख्य Website की js/storage.js और js/rewards.js
   एक साधारण <script> Tag से पहले से Load होनी चाहिए (Module Script से पहले),
   तभी window.M27.Storage/Rewards यहाँ उपलब्ध होंगे।
   ========================================================== */

// एक Level पूरा होने पर ज़्यादा से ज़्यादा कितना XP (पहली बार) — दोबारा उसी Level पर हर बार आधा होता जाएगा
const GAME_XP_PER_LEVEL = 10;
// Quiz को "Skip" करने की हर कोशिश पर इतना XP कटेगा
const SKIP_PENALTY = 2;

function M27() { return window.M27; }
function ready() { return !!(M27() && M27().Storage && M27().Storage.state); }

// पहली बार Load होते ही मुख्य Website का Storage शुरू कर दो (localStorage से पढ़कर)
if (M27() && M27().Storage && !M27().Storage.state) {
    try { M27().Storage.load(); } catch (e) { console.warn('मुख्य Storage Load नहीं हो पाया', e); }
}

export const Storage = {
    save(key, value) {
        if (!ready()) return;
        var st = M27().Storage.state;
        if (key === 'currentLevel') st.maze.current = value;
        else if (key === 'maxUnlocked') st.maze.unlocked = value;
        M27().Storage.save();
    },
    get(key, defaultValue = null) {
        if (!ready()) return defaultValue;
        var st = M27().Storage.state;
        if (key === 'currentLevel') return st.maze.current;
        if (key === 'maxUnlocked') return st.maze.unlocked;
        return defaultValue;
    },
    // एक Level पूरा होने पर XP — उसी Level को दोबारा पार करने पर हर बार आधा होते हुए (मुख्य Website के साझा नियम से)
    awardLevelXp(levelNumber) {
        if (!ready() || !M27().Rewards || !M27().Rewards.addXpDiminishing) return 0;
        var key = 'game:maze:level-' + (levelNumber || 0);
        return M27().Rewards.addXpDiminishing(key, GAME_XP_PER_LEVEL);
    },
    // Quiz Skip करने की हर कोशिश पर XP काटो (0 से नीचे नहीं जाएगा)
    penalizeSkip() {
        if (!ready()) return 0;
        var app = M27();
        var st = app.Storage.state;
        var before = st.xp;
        st.xp = Math.max(0, st.xp - SKIP_PENALTY);
        app.Storage.save();
        return before - st.xp;
    },
    getAll() { return ready() ? M27().Storage.state.maze : {}; },
    reset() { /* अब यह मुख्य Website के "Reset Progress" से ही होता है, यहाँ अलग से कुछ नहीं */ }
};
