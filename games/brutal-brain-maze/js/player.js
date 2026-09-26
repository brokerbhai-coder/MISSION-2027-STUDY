import { Collision } from './collision.js';

export class Player {
    constructor(startX, startY, cellSize) {
        this.radius = cellSize * 0.35; 
        this.x = startX + cellSize / 2;
        this.y = startY + cellSize / 2;
        this.vx = 0;
        this.vy = 0;
        this.speed = cellSize * 5.0; // Slightly faster base speed for responsive feel
        this.moveDistance = 0;
        this.moveCount = 0;
        this.cellSize = cellSize;
    }

    update(dt, inputDir, lines) {
        if (dt > 0.1) dt = 0.1; // Clamp huge delta times

        // 1. Framerate-Independent Velocity Smoothing (Fast & Responsive)
        let targetVx = inputDir.x * this.speed;
        let targetVy = inputDir.y * this.speed;

        // High response factor ensures movement is 90% direct control, 10% micro-smoothness
        const responseFactor = 30; 
        this.vx += (targetVx - this.vx) * (1 - Math.exp(-responseFactor * dt));
        this.vy += (targetVy - this.vy) * (1 - Math.exp(-responseFactor * dt));

        // Eliminate microscopic drift
        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vy) < 0.01) this.vy = 0;

        let startX = this.x;
        let startY = this.y;

        // 2. Apply Movement
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 3. Resolve Collisions & Wall Slides
        this.resolveCollisions(lines);

        // 4. Accumulate distance to calculate MOVES properly
        let dx = this.x - startX;
        let dy = this.y - startY;
        this.moveDistance += Math.sqrt(dx * dx + dy * dy);
        
        if (this.moveDistance > this.cellSize) {
            this.moveCount++;
            this.moveDistance -= this.cellSize;
        }
    }

    resolveCollisions(lines) {
        // Multi-pass resolution guarantees corners don't get stuck
        for (let pass = 0; pass < 3; pass++) {
            let hitAny = false;
            for (let line of lines) {
                let res = Collision.resolveCircleLine(this.x, this.y, this.radius, line.x1, line.y1, line.x2, line.y2);
                if (res.hit) {
                    // Positional Out-Push (Prevents passing through walls)
                    this.x += res.pushX;
                    this.y += res.pushY;
                    
                    // VELOCITY WALL SLIDING:
                    // Calculate if player velocity is pushing *into* this specific wall
                    let dot = this.vx * res.nx + this.vy * res.ny;
                    
                    if (dot < 0) { 
                        // Remove only the velocity pushing into the wall, keep parallel sliding momentum
                        this.vx -= dot * res.nx;
                        this.vy -= dot * res.ny;
                    }
                    hitAny = true;
                }
            }
            if (!hitAny) break;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
