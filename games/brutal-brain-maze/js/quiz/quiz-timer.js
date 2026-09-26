export class QuizTimer {
    constructor(thresholdSeconds = 30) {
        this.thresholdMs = thresholdSeconds * 1000;
        this.activeTimeMs = 0;
    }

    update(dt) {
        this.activeTimeMs += dt;
        return this.activeTimeMs >= this.thresholdMs;
    }

    reset() {
        this.activeTimeMs = 0;
    }
}
