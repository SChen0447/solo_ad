export type CellType = 0 | 1;

export interface Coin {
  gridX: number;
  gridY: number;
  collected: boolean;
  rotation: number;
  flashTimer: number;
}

export class Maze {
  public grid: CellType[][];
  public size: number;
  public cellSize: number = 0;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public startX: number = 0;
  public startY: number = 0;
  public endX: number = 0;
  public endY: number = 0;
  public coins: Coin[] = [];
  public corridorCells: Array<{ x: number; y: number }> = [];

  constructor(size: number) {
    this.size = size;
    this.grid = [];
    this.generate();
  }

  private generate(): void {
    this.grid = Array.from({ length: this.size }, () =>
      Array<CellType>(this.size).fill(1)
    );

    this.carvePassagesIterative();
    this.addDeadEnds();
    this.ensurePathExists();

    this.grid[1][1] = 0;
    this.grid[this.size - 2][this.size - 2] = 0;

    this.startX = 1;
    this.startY = 1;
    this.endX = this.size - 2;
    this.endY = this.size - 2;

    this.collectCorridorCells();
    this.generateCoins();
  }

  private carvePassagesIterative(): void {
    interface StackItem { x: number; y: number; visited: boolean; }
    const stack: StackItem[] = [{ x: 1, y: 1, visited: false }];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];

      if (!current.visited) {
        current.visited = true;
        this.grid[current.y][current.x] = 0;
      }

      const directions = [
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0]
      ];

      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }

      let carved = false;
      for (const [dx, dy] of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        if (
          nx > 0 && nx < this.size - 1 &&
          ny > 0 && ny < this.size - 1 &&
          this.grid[ny][nx] === 1
        ) {
          this.grid[current.y + dy / 2][current.x + dx / 2] = 0;
          this.grid[ny][nx] = 0;
          stack.push({ x: nx, y: ny, visited: false });
          carved = true;
          break;
        }
      }

      if (!carved) {
        if (Math.random() < 0.35) {
          this.tryBranch(current.x, current.y);
        }
        stack.pop();
      }
    }
  }

  private tryBranch(x: number, y: number): void {
    const directions = [
      [0, -2], [2, 0], [0, 2], [-2, 0]
    ];
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (
        nx > 0 && nx < this.size - 1 &&
        ny > 0 && ny < this.size - 1 &&
        this.grid[ny][nx] === 1
      ) {
        this.grid[y + dy / 2][x + dx / 2] = 0;
        this.grid[ny][nx] = 0;

        const extraSteps = 1 + Math.floor(Math.random() * 2);
        let cx = nx;
        let cy = ny;

        for (let s = 0; s < extraSteps; s++) {
          const subDirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
          let moved = false;
          for (let i = subDirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [subDirs[i], subDirs[j]] = [subDirs[j], subDirs[i]];
          }

          for (const [sdx, sdy] of subDirs) {
            const snx = cx + sdx;
            const sny = cy + sdy;
            if (
              snx > 0 && snx < this.size - 1 &&
              sny > 0 && sny < this.size - 1 &&
              this.grid[sny][snx] === 1
            ) {
              this.grid[cy + sdy / 2][cx + sdx / 2] = 0;
              this.grid[sny][snx] = 0;
              cx = snx;
              cy = sny;
              moved = true;
              break;
            }
          }
          if (!moved) break;
        }
        break;
      }
    }
  }

  private addDeadEnds(): void {
    const extraCarves = Math.floor(this.size * this.size * 0.03);
    for (let i = 0; i < extraCarves; i++) {
      const x = 1 + Math.floor(Math.random() * (this.size - 2));
      const y = 1 + Math.floor(Math.random() * (this.size - 2));
      if (this.grid[y][x] === 0) {
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (let d = dirs.length - 1; d > 0; d--) {
          const j = Math.floor(Math.random() * (d + 1));
          [dirs[d], dirs[j]] = [dirs[j], dirs[d]];
        }
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx > 0 && nx < this.size - 1 &&
            ny > 0 && ny < this.size - 1 &&
            this.grid[ny][nx] === 1
          ) {
            this.grid[ny][nx] = 0;
            break;
          }
        }
      }
    }
  }

  private ensurePathExists(): void {
    if (!this.hasPath(1, 1, this.size - 2, this.size - 2)) {
      for (let i = 1; i < this.size - 1; i++) {
        this.grid[i][1] = 0;
        this.grid[this.size - 2][i] = 0;
      }
    }
  }

  private hasPath(sx: number, sy: number, ex: number, ey: number): boolean {
    const visited = Array.from({ length: this.size }, () =>
      Array<boolean>(this.size).fill(false)
    );
    const queue: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
    visited[sy][sx] = true;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === ex && current.y === ey) return true;

      const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (
          nx >= 0 && nx < this.size &&
          ny >= 0 && ny < this.size &&
          !visited[ny][nx] &&
          this.grid[ny][nx] === 0
        ) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }

  private collectCorridorCells(): void {
    this.corridorCells = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] === 0 && !(x === this.startX && y === this.startY) && !(x === this.endX && y === this.endY)) {
          const neighbors = this.countCorridorNeighbors(x, y);
          if (neighbors <= 2) {
            this.corridorCells.push({ x, y });
          }
        }
      }
    }
  }

  private countCorridorNeighbors(x: number, y: number): number {
    let count = 0;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size && this.grid[ny][nx] === 0) {
        count++;
      }
    }
    return count;
  }

  private generateCoins(): void {
    this.coins = [];
    const coinCount = Math.max(5, Math.floor(this.corridorCells.length * 0.15));
    const shuffled = [...this.corridorCells].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(coinCount, shuffled.length); i++) {
      const cell = shuffled[i];
      this.coins.push({
        gridX: cell.x,
        gridY: cell.y,
        collected: false,
        rotation: 0,
        flashTimer: Math.random() * 0.5
      });
    }
  }

  public resize(canvasWidth: number, canvasHeight: number, padding: number = 60): void {
    const maxWidth = canvasWidth - padding * 2;
    const maxHeight = canvasHeight - padding * 2;
    this.cellSize = Math.floor(Math.min(maxWidth, maxHeight) / this.size);
    const totalSize = this.cellSize * this.size;
    this.offsetX = Math.floor((canvasWidth - totalSize) / 2);
    this.offsetY = Math.floor((canvasHeight - totalSize) / 2);
  }

  public isWall(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= this.size || gridY < 0 || gridY >= this.size) {
      return true;
    }
    return this.grid[gridY][gridX] === 1;
  }

  public checkWallCollision(px: number, py: number, radius: number): { x: number; y: number; collided: boolean } {
    const minGX = Math.floor((px - radius - this.offsetX) / this.cellSize);
    const maxGX = Math.floor((px + radius - this.offsetX) / this.cellSize);
    const minGY = Math.floor((py - radius - this.offsetY) / this.cellSize);
    const maxGY = Math.floor((py + radius - this.offsetY) / this.cellSize);

    let newX = px;
    let newY = py;
    let collided = false;

    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        if (this.isWall(gx, gy)) {
          const wallLeft = this.offsetX + gx * this.cellSize;
          const wallTop = this.offsetY + gy * this.cellSize;
          const wallRight = wallLeft + this.cellSize;
          const wallBottom = wallTop + this.cellSize;

          const closestX = Math.max(wallLeft, Math.min(px, wallRight));
          const closestY = Math.max(wallTop, Math.min(py, wallBottom));

          const dx = px - closestX;
          const dy = py - closestY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radius) {
            collided = true;
            if (dist === 0) {
              const overlapLeft = px - wallLeft;
              const overlapRight = wallRight - px;
              const overlapTop = py - wallTop;
              const overlapBottom = wallBottom - py;
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

              if (minOverlap === overlapLeft) newX = wallLeft - radius;
              else if (minOverlap === overlapRight) newX = wallRight + radius;
              else if (minOverlap === overlapTop) newY = wallTop - radius;
              else newY = wallBottom + radius;
            } else {
              const pushDist = radius - dist;
              newX = px + (dx / dist) * pushDist;
              newY = py + (dy / dist) * pushDist;
            }
          }
        }
      }
    }

    return { x: newX, y: newY, collided };
  }

  public gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.offsetX + gridX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gridY * this.cellSize + this.cellSize / 2
    };
  }

  public updateCoins(dt: number): void {
    for (const coin of this.coins) {
      if (!coin.collected) {
        coin.rotation += dt * 2;
        coin.flashTimer += dt;
        if (coin.flashTimer > 0.5) coin.flashTimer = 0;
      }
    }
  }

  public checkCoinCollision(px: number, py: number, radius: number): number {
    let score = 0;
    for (const coin of this.coins) {
      if (!coin.collected) {
        const pos = this.gridToPixel(coin.gridX, coin.gridY);
        const dx = px - pos.x;
        const dy = py - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius + this.cellSize * 0.25) {
          coin.collected = true;
          score += 10;
        }
      }
    }
    return score;
  }

  public checkEndReached(px: number, py: number, radius: number): boolean {
    const endPos = this.gridToPixel(this.endX, this.endY);
    const dx = px - endPos.x;
    const dy = py - endPos.y;
    return Math.sqrt(dx * dx + dy * dy) < radius + this.cellSize * 0.3;
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    const endPos = this.gridToPixel(this.endX, this.endY);
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    const neonPulse = 0.5 + 0.5 * Math.sin(time * Math.PI);
    const endRadius = this.cellSize * 0.35;

    const endGlow = ctx.createRadialGradient(endPos.x, endPos.y, 0, endPos.x, endPos.y, endRadius * 3);
    endGlow.addColorStop(0, `rgba(0, 255, 150, ${0.4 * pulse + 0.2})`);
    endGlow.addColorStop(1, 'rgba(0, 255, 150, 0)');
    ctx.fillStyle = endGlow;
    ctx.fillRect(
      endPos.x - endRadius * 3,
      endPos.y - endRadius * 3,
      endRadius * 6,
      endRadius * 6
    );

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;

        if (this.grid[y][x] === 1) {
          const grad = ctx.createLinearGradient(px, py, px + this.cellSize, py + this.cellSize);
          grad.addColorStop(0, '#2a2a3a');
          grad.addColorStop(0.5, '#3a3a4a');
          grad.addColorStop(1, '#1a1a2a');
          ctx.fillStyle = grad;
          ctx.fillRect(px, py, this.cellSize, this.cellSize);

          const neonIntensity = 0.25 + 0.35 * neonPulse;
          const glowSize = 3 + 3 * neonPulse;

          ctx.shadowColor = `rgba(80, 180, 255, ${neonIntensity})`;
          ctx.shadowBlur = glowSize;
          ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + 0.3 * neonPulse})`;
          ctx.lineWidth = 1.5 + 0.5 * neonPulse;
          ctx.strokeRect(px + 0.75, py + 0.75, this.cellSize - 1.5, this.cellSize - 1.5);
          ctx.shadowBlur = 0;

          const innerGlow = ctx.createLinearGradient(px, py, px + this.cellSize, py + this.cellSize);
          innerGlow.addColorStop(0, `rgba(60, 100, 160, ${0.08 + 0.05 * neonPulse})`);
          innerGlow.addColorStop(0.5, `rgba(40, 80, 140, ${0.04 + 0.03 * neonPulse})`);
          innerGlow.addColorStop(1, `rgba(20, 40, 80, ${0.08 + 0.05 * neonPulse})`);
          ctx.fillStyle = innerGlow;
          ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
        } else {
          ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
        }
      }
    }

    const startPos = this.gridToPixel(this.startX, this.startY);
    ctx.fillStyle = `rgba(100, 200, 255, ${0.3 + 0.15 * pulse})`;
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, this.cellSize * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(0, 255, 150, ${0.6 + 0.4 * pulse})`;
    ctx.beginPath();
    ctx.arc(endPos.x, endPos.y, endRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ffa0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(endPos.x, endPos.y, endRadius + 3, 0, Math.PI * 2);
    ctx.stroke();

    for (const coin of this.coins) {
      if (!coin.collected) {
        this.renderCoin(ctx, coin);
      }
    }
  }

  private renderCoin(ctx: CanvasRenderingContext2D, coin: Coin): void {
    const pos = this.gridToPixel(coin.gridX, coin.gridY);
    const size = this.cellSize * 0.3;
    const flash = coin.flashTimer < 0.25 ? 1 : 0.6;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(coin.rotation);

    ctx.shadowColor = `rgba(255, 220, 50, ${flash})`;
    ctx.shadowBlur = 15 * flash;

    ctx.fillStyle = `rgba(255, ${200 + 55 * flash}, 50, 1)`;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const outerX = Math.cos(outerAngle) * size;
      const outerY = Math.sin(outerAngle) * size;
      const innerX = Math.cos(innerAngle) * size * 0.45;
      const innerY = Math.sin(innerAngle) * size * 0.45;

      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
