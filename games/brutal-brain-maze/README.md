# Brutal Brain Maze

"Can Your Brain Escape?"

A standalone HTML5 continuous line-wall maze puzzle, built heavily for mobile logic and progressive brutal difficulty. Features an active-gameplay timer that locks the game every 30 seconds to administer a mandatory Indian GK quiz.

## Features
- **400 Level Architecture**: Smoothly generates solvable, continuous geometric line-mazes up to level 400.
- **Mobile First**: Fits perfectly on all phone screens (320px to 430px widths) without horizontal scrolling. Responsive UI and drag-to-move mechanics.
- **Radius-Based Collision**: Precise smooth continuous sliding collision along lines prevents wall tunneling.
- **Active Gameplay Lock**: Monitors exact play time (excluding background tabs and pauses). Exactly every 30 seconds, throws a locked Hindi GK quiz. No skip, no bypass. Requires 10/10 to unlock.
- **Local Storage**: Auto-saves progression, XP, and highest unlocked level.

## Controls
- **Mobile**: Touch anywhere and swipe/drag. Continuous velocity mapping.
- **Desktop**: WASD or Arrow Keys.

## Running Locally
Because it uses standard ES Modules, it requires a simple HTTP server (cannot just open `index.html` via `file://`).
Using Python:
```bash
python3 -m http.server 8000
