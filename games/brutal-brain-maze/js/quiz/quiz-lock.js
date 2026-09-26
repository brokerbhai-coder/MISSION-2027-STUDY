export class QuizLock {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.pool = []; // main.js इसे loadQuestionPool() से भरता है
    }

    setPool(pool) {
        this.pool = Array.isArray(pool) ? pool : [];
    }

    generateQuiz() {
        this.currentIndex = 0;
        // Clone and Shuffle questions
        let pool = [...this.pool];
        pool.sort(() => Math.random() - 0.5);
        this.questions = pool.slice(0, 10);

        // Shuffle options and remap correct answer
        this.questions.forEach(q => {
            let optionsObj = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.ans }));
            optionsObj.sort(() => Math.random() - 0.5);
            q.shuffledOptions = optionsObj;
        });
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    submitAnswer(selectedIndex) {
        const q = this.getCurrentQuestion();
        if (q.shuffledOptions[selectedIndex].isCorrect) {
            this.currentIndex++;
            return { correct: true, complete: this.currentIndex >= 10 };
        } else {
            // Failed! Must restart the whole quiz sequence.
            return { correct: false, complete: false };
        }
    }
}
