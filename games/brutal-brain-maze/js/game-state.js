export const GameState = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2,
    QUIZ_LOCKED: 3,
    LEVEL_COMPLETE: 4,
    GAME_OVER: 5
};

class StateManager {
    constructor() {
        this.current = GameState.PLAYING;
    }
    set(state) {
        this.current = state;
    }
    is(state) {
        return this.current === state;
    }
}
export const stateManager = new StateManager();
