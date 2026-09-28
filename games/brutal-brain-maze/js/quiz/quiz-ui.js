import { Storage } from '../storage.js';

export class QuizUI {
    constructor(quizLock, onCompleteCallback) {
        this.quizLock = quizLock;
        this.onComplete = onCompleteCallback;
        
        this.modal = document.getElementById('quiz-modal');
        this.progressEl = document.getElementById('quiz-progress');
        this.questionEl = document.getElementById('quiz-question');
        this.optionsContainer = document.getElementById('quiz-options');
        this.feedbackEl = document.getElementById('quiz-feedback');
        this.btnContinue = document.getElementById('btn-quiz-continue');

        this.btnContinue.addEventListener('click', () => {
            this.modal.classList.add('hidden');
            this.onComplete();
        });
    }

    open() {
        if (!this.quizLock.pool || this.quizLock.pool.length < 10) {
            // सवाल अभी Load नहीं हुए (या इतने कम हैं कि 10 का Quiz नहीं बन सकता) — चुपचाप छोड़ो, Game रोकना ठीक नहीं
            this.onComplete();
            return;
        }
        this.modal.classList.remove('hidden');
        this.btnContinue.classList.add('hidden');
        this.feedbackEl.innerText = "";
        this.quizLock.generateQuiz();
        this.renderCurrentQuestion();
    }

    renderCurrentQuestion() {
        const q = this.quizLock.getCurrentQuestion();
        const index = this.quizLock.currentIndex;
        
        this.progressEl.innerText = `${index + 1} / 10`;
        this.questionEl.innerText = q.q;
        
        this.optionsContainer.innerHTML = '';
        this.feedbackEl.innerText = "";

        q.shuffledOptions.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.innerText = opt.text;
            btn.onclick = () => this.handleAnswer(i);
            this.optionsContainer.appendChild(btn);
        });
    }

    handleAnswer(i) {
        const q = this.quizLock.getCurrentQuestion();
        const correctIndex = q.shuffledOptions.findIndex(o => o.isCorrect);
        const result = this.quizLock.submitAnswer(i);

        // हर Option को Disable करके सही वाले को हरा, गलत चुने हुए को लाल दिखाओ
        const btns = this.optionsContainer.querySelectorAll('.quiz-option-btn');
        btns.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === correctIndex) btn.classList.add('opt-correct');
            else if (idx === i) btn.classList.add('opt-wrong');
        });

        if (result.correct) {
            if (result.complete) {
                this.feedbackEl.className = 'quiz-feedback feedback-success';
                this.feedbackEl.innerText = "10/10 सही! गेम अनलॉक हो गया। (10/10 Correct! Game Unlocked.)";
                this.btnContinue.classList.remove('hidden');
            } else {
                setTimeout(() => this.renderCurrentQuestion(), 700); // सही होने पर भी थोड़ा रुककर हरा रंग दिखे
            }
        } else {
            // Background में चुपचाप XP कटता है — कोई Button/Choice नहीं, बस हर ग़लत जवाब पर
            const cut = Storage.penalizeWrong();
            this.feedbackEl.className = 'quiz-feedback feedback-error';
            this.feedbackEl.innerText = `❌ ग़लत! सही उत्तर था: ${q.shuffledOptions[correctIndex].text}` + (cut > 0 ? ` (−${cut} XP)` : '');
            setTimeout(() => {
                this.quizLock.restartSameQuiz(); // वही 10 Question फिर से — नए Random नहीं
                this.renderCurrentQuestion();
            }, 5000); // 5 सेकंड सही उत्तर दिखे, ताकि याद हो जाए
        }
    }
}
