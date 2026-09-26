import { MazeValidator } from './maze-validator.js';

// Deterministic Pseudo-Random
function Mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export const MazeGenerator = {
    generate(cols, rows, seed, cellSize) {
        let rng = Mulberry32(seed);
        let grid = [];
        for (let r = 0; r < rows; r++) {
            let row = [];
            for (let c = 0; c < cols; c++) {
                row.push({ x: c, y: r, n: 1, s: 1, e: 1, w: 1, visited: false });
            }
            grid.push(row);
        }

        // Recursive Backtracker
        let stack = [];
        let curr = grid[0][0];
        curr.visited = true;

        let unvisitedCount = cols * rows - 1;
        
        while (unvisitedCount > 0) {
            let neighbors = [];
            let {x, y} = curr;
            
            if (y > 0 && !grid[y-1][x].visited) neighbors.push({cell: grid[y-1][x], dir: 'n', opp: 's'});
            if (y < rows-1 && !grid[y+1][x].visited) neighbors.push({cell: grid[y+1][x], dir: 's', opp: 'n'});
            if (x > 0 && !grid[y][x-1].visited) neighbors.push({cell: grid[y][x-1], dir: 'w', opp: 'e'});
            if (x < cols-1 && !grid[y][x+1].visited) neighbors.push({cell: grid[y][x+1], dir: 'e', opp: 'w'});

            if (neighbors.length > 0) {
                let next = neighbors[Math.floor(rng() * neighbors.length)];
                curr[next.dir] = 0;
                next.cell[next.opp] = 0;
                stack.push(curr);
                curr = next.cell;
                curr.visited = true;
                unvisitedCount--;
            } else if (stack.length > 0) {
                curr = stack.pop();
            }
        }

        // Validation - Never output unplayable maze
        if (!MazeValidator.validate(grid, cols, rows)) {
            console.warn("Maze invalid, regenerating...");
            return this.generate(cols, rows, seed + 1, cellSize);
        }

        // Extract Line Segments (Continuous Wall Geometry)
        let lines = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let px = c * cellSize;
                let py = r * cellSize;
                if (grid[r][c].s) lines.push({x1: px, y1: py+cellSize, x2: px+cellSize, y2: py+cellSize});
                if (grid[r][c].e) lines.push({x1: px+cellSize, y1: py, x2: px+cellSize, y2: py+cellSize});
                // Borders
                if (r === 0 && grid[r][c].n) lines.push({x1: px, y1: py, x2: px+cellSize, y2: py});
                if (c === 0 && grid[r][c].w) lines.push({x1: px, y1: py, x2: px, y2: py+cellSize});
            }
        }

        return {
            lines,
            logicalWidth: cols * cellSize,
            logicalHeight: rows * cellSize,
            startZone: { x: 0, y: 0, w: cellSize, h: cellSize },
            exitZone: { x: (cols-1)*cellSize, y: (rows-1)*cellSize, w: cellSize, h: cellSize }
        };
    }
};
