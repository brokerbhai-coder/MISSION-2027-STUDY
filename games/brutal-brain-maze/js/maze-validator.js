export const MazeValidator = {
    // Validates logical grid using Breadth-First Search
    validate(grid, cols, rows) {
        const queue = [{c: 0, r: 0}];
        const visited = new Set();
        visited.add(`0,0`);

        while(queue.length > 0) {
            const curr = queue.shift();
            if (curr.c === cols - 1 && curr.r === rows - 1) {
                return true; // Reached Exit
            }
            
            const cell = grid[curr.r][curr.c];
            const neighbors = [
                { dir: 'n', c: curr.c, r: curr.r - 1 },
                { dir: 's', c: curr.c, r: curr.r + 1 },
                { dir: 'w', c: curr.c - 1, r: curr.r },
                { dir: 'e', c: curr.c + 1, r: curr.r }
            ];

            for (let n of neighbors) {
                if (!cell[n.dir] && n.c >= 0 && n.c < cols && n.r >= 0 && n.r < rows) {
                    const key = `${n.c},${n.r}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push(n);
                    }
                }
            }
        }
        return false;
    }
};
