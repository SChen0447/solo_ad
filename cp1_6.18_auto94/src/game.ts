import {
  BallState,
  Cell,
  CellType,
  LevelData,
  Particle,
  RippleEffect
} from './types.js';

export class Ball implements BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  isAirborne: boolean;
  bounceCount: number;
  teleporting: boolean;
  teleportProgress: number;
  teleportFrom?: { x: number; y: number };
  teleportTo?: { x: number; y: number };
  lastCellCol: number = -1;
  lastCellRow: number = -1;
  platformEffectTimer: number = 0;
  bouncerEffectTimer: number = 0;
  deceleratorEffectTimer: number = 0;
  acceleratorEffectTimer: number = 0;
  height: number = 0;
  verticalVelocity: number = 0;

  constructor(x: number, y: number, radius: number = 14) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.rotation = 0;
    this.angularVelocity = 0;
    this.isAirborne = false;
    this.bounceCount = 0;
    this.teleporting = false;
    this.teleportProgress = 0;
  }
}

export class GameEngine {
  private level: LevelData;
  private ball: Ball;
  private particles: Particle[] = [];
  private gravity: number;
  private friction: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private onEdgeFlash?: () => void;
  private onGoalReached?: () => void;
  private steps: number = 0;
  private portalPairs: Map<string, { col: number; row: number }[]> = new Map();
  private platformStates: Map<string, { pathIndex: number; progress: number; offsetX: number; offsetY: number }> = new Map();
  private lastPlatformDirX: number = 0;
  private lastPlatformDirY: number = 0;

  constructor(
    level: LevelData,
    canvasWidth: number,
    canvasHeight: number,
    onEdgeFlash?: () => void,
    onGoalReached?: () => void
  ) {
    this.level = level;
    this.gravity = level.gravity;
    this.friction = level.friction;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.onEdgeFlash = onEdgeFlash;
    this.onGoalReached = onGoalReached;

    const startPos = this.findStartPosition();
    this.ball = new Ball(startPos.x, startPos.y);
    this.buildPortalPairs();
    this.initPlatformStates();
  }

  setGravity(g: number): void {
    this.gravity = g;
  }

  setFriction(f: number): void {
    this.friction = f;
  }

  setLevel(level: LevelData): void {
    this.level = level;
    this.gravity = level.gravity;
    this.friction = level.friction;
    const startPos = this.findStartPosition();
    this.ball = new Ball(startPos.x, startPos.y);
    this.steps = 0;
    this.particles = [];
    this.buildPortalPairs();
    this.initPlatformStates();
  }

  reset(): void {
    const startPos = this.findStartPosition();
    this.ball = new Ball(startPos.x, startPos.y);
    this.steps = 0;
    this.particles = [];
    this.initPlatformStates();
  }

  getBall(): Ball {
    return this.ball;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getSteps(): number {
    return this.steps;
  }

  getOffsetForPlatform(col: number, row: number): { x: number; y: number } {
    const key = `${col},${row}`;
    const state = this.platformStates.get(key);
    if (state) {
      return { x: state.offsetX, y: state.offsetY };
    }
    return { x: 0, y: 0 };
  }

  getLastPlatformDir(): { x: number; y: number } {
    return { x: this.lastPlatformDirX, y: this.lastPlatformDirY };
  }

  private findStartPosition(): { x: number; y: number } {
    const { grid, cellSize } = this.level;
    for (let row = 0; row < this.level.rows; row++) {
      for (let col = 0; col < this.level.cols; col++) {
        const cell = grid[row][col];
        if (cell && cell.type === CellType.Start) {
          return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2
          };
        }
      }
    }
    return { x: cellSize * 1.5, y: cellSize * 1.5 };
  }

  private buildPortalPairs(): void {
    this.portalPairs.clear();
    const { grid } = this.level;
    for (let row = 0; row < this.level.rows; row++) {
      for (let col = 0; col < this.level.cols; col++) {
        const cell = grid[row][col];
        if (cell && cell.type === CellType.Portal && cell.portalPairId) {
          if (!this.portalPairs.has(cell.portalPairId)) {
            this.portalPairs.set(cell.portalPairId, []);
          }
          this.portalPairs.get(cell.portalPairId)!.push({ col, row });
        }
      }
    }
  }

  private initPlatformStates(): void {
    this.platformStates.clear();
    const { grid } = this.level;
    for (let row = 0; row < this.level.rows; row++) {
      for (let col = 0; col < this.level.cols; col++) {
        const cell = grid[row][col];
        if (cell && cell.type === CellType.MovingPlatform && cell.platformPath && cell.platformPath.length > 0) {
          this.platformStates.set(`${col},${row}`, {
            pathIndex: 0,
            progress: 0,
            offsetX: 0,
            offsetY: 0
          });
        }
      }
    }
  }

  update(dt: number): void {
    if (dt > 0.05) dt = 0.05;

    this.updatePlatforms(dt);

    if (this.ball.teleporting) {
      this.updateTeleport(dt);
      this.updateParticles(dt);
      return;
    }

    this.applyPhysics(dt);
    this.handleCellEffects(dt);
    this.checkCollisions();
    this.updateParticles(dt);
    this.checkGoal();
    this.decrementTimers(dt);
  }

  private updatePlatforms(dt: number): void {
    const { grid, cellSize } = this.level;
    for (let row = 0; row < this.level.rows; row++) {
      for (let col = 0; col < this.level.cols; col++) {
        const cell = grid[row][col];
        if (cell && cell.type === CellType.MovingPlatform && cell.platformPath && cell.platformPath.length > 0) {
          const key = `${col},${row}`;
          const state = this.platformStates.get(key);
          if (!state) continue;

          const path = cell.platformPath;
          const speed = (cell.platformSpeed || 1) * dt;

          if (path.length === 1) continue;

          const currentIdx = state.pathIndex;
          const nextIdx = (state.pathIndex + 1) % path.length;
          const start = path[currentIdx];
          const end = path[nextIdx];

          const dx = (end.x - start.x) * cellSize;
          const dy = (end.y - start.y) * cellSize;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.001) {
            state.pathIndex = nextIdx;
            state.progress = 0;
            continue;
          }

          const inc = (speed * cellSize) / dist;
          state.progress += inc;

          if (state.progress >= 1) {
            state.progress = 0;
            state.pathIndex = nextIdx;
          }

          const t = state.progress;
          const prevOffsetX = state.offsetX;
          const prevOffsetY = state.offsetY;
          state.offsetX = start.x * cellSize + dx * t;
          state.offsetY = start.y * cellSize + dy * t;

          const moveDx = state.offsetX - prevOffsetX;
          const moveDy = state.offsetY - prevOffsetY;

          if (this.isBallOnCell(col, row)) {
            this.ball.x += moveDx;
            this.ball.y += moveDy;
            this.ball.platformEffectTimer = 0.2;
            if (Math.abs(moveDx) > 0.001 || Math.abs(moveDy) > 0.001) {
              const mag = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
              this.lastPlatformDirX = moveDx / mag;
              this.lastPlatformDirY = moveDy / mag;
            }
          }
        }
      }
    }
  }

  private isBallOnCell(col: number, row: number): boolean {
    const { cellSize } = this.level;
    const cellX = col * cellSize + cellSize / 2;
    const cellY = row * cellSize + cellSize / 2;
    const dx = this.ball.x - cellX;
    const dy = this.ball.y - cellY;
    return Math.sqrt(dx * dx + dy * dy) < cellSize * 0.6;
  }

  private applyPhysics(dt: number): void {
    const b = this.ball;

    b.vy += this.gravity * 120 * dt;

    if (b.height > 0 || b.verticalVelocity > 0) {
      b.verticalVelocity -= this.gravity * 400 * dt;
      b.height += b.verticalVelocity * dt;
      if (b.height <= 0) {
        b.height = 0;
        if (b.verticalVelocity < -80) {
          this.spawnBounceLandParticles();
        }
        b.verticalVelocity = 0;
        b.isAirborne = false;
      }
    }

    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (speed > 0.1) {
      const frictionForce = this.friction * 8 * dt;
      const newSpeed = Math.max(0, speed - frictionForce);
      const ratio = speed > 0 ? newSpeed / speed : 0;
      b.vx *= ratio;
      b.vy *= ratio;
    }

    const maxSpeed = 600;
    const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (currentSpeed > maxSpeed) {
      const ratio = maxSpeed / currentSpeed;
      b.vx *= ratio;
      b.vy *= ratio;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    b.rotation += b.angularVelocity * dt;
    b.angularVelocity *= Math.max(0, 1 - 3 * dt);

    if (currentSpeed > 5) {
      b.angularVelocity += (b.vx / b.radius) * 0.05;
    }
  }

  private handleCellEffects(dt: number): void {
    const { grid, cellSize } = this.level;
    const b = this.ball;

    const col = Math.floor(b.x / cellSize);
    const row = Math.floor(b.y / cellSize);

    if (col < 0 || col >= this.level.cols || row < 0 || row >= this.level.rows) {
      return;
    }

    const cell = grid[row][col];
    if (!cell) return;

    if (col !== b.lastCellCol || row !== b.lastCellRow) {
      this.steps++;
      b.lastCellCol = col;
      b.lastCellRow = row;
    }

    const intensity = cell.intensity || 1;

    switch (cell.type) {
      case CellType.Accelerator: {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > 1) {
          const accel = (intensity * 120) * dt;
          const ratio = accel / speed;
          b.vx += b.vx * ratio;
          b.vy += b.vy * ratio;
        } else {
          b.vy += intensity * 40 * dt;
        }
        b.acceleratorEffectTimer = 0.15;
        if (Math.random() < 0.6) {
          this.spawnAcceleratorParticle();
        }
        break;
      }
      case CellType.Decelerator: {
        const decelFactor = Math.max(0.2, 1 - intensity * 0.8 * dt * 8);
        b.vx *= decelFactor;
        b.vy *= decelFactor;
        b.deceleratorEffectTimer = 0.2;
        if (Math.random() < 0.4) {
          this.spawnDeceleratorParticle();
        }
        break;
      }
      case CellType.Bouncer: {
        if (b.height <= 0.5 && !b.isAirborne) {
          const angle = Math.atan2(b.vy, b.vx);
          const horizontalForce = 0.5;
          b.vx *= horizontalForce;
          b.vy *= horizontalForce;
          b.verticalVelocity = 150 + intensity * 150;
          b.isAirborne = true;
          b.bounceCount++;
          b.bouncerEffectTimer = 0.4;
          this.spawnBouncerParticles();
        }
        break;
      }
      case CellType.Portal: {
        if (cell.portalPairId && !b.teleporting) {
          const pair = this.portalPairs.get(cell.portalPairId);
          if (pair && pair.length >= 2) {
            const current = pair.find(p => p.col === col && p.row === row);
            const other = pair.find(p => p !== current);
            if (other) {
              b.teleporting = true;
              b.teleportProgress = 0;
              b.teleportFrom = { x: b.x, y: b.y };
              b.teleportTo = {
                x: other.col * cellSize + cellSize / 2,
                y: other.row * cellSize + cellSize / 2
              };
              this.spawnTeleportParticles(b.x, b.y, true);
            }
          }
        }
        break;
      }
    }
  }

  private updateTeleport(dt: number): void {
    const b = this.ball;
    b.teleportProgress += dt * 2;

    if (b.teleportFrom && b.teleportTo) {
      const t = Math.min(1, b.teleportProgress);
      if (t < 0.5) {
        const localT = t * 2;
        b.x = b.teleportFrom.x + (b.teleportTo.x - b.teleportFrom.x) * 0.5 * localT;
        b.y = b.teleportFrom.y + (b.teleportTo.y - b.teleportFrom.y) * 0.5 * localT;
      } else {
        const localT = (t - 0.5) * 2;
        b.x = b.teleportFrom.x + (b.teleportTo.x - b.teleportFrom.x) * (0.5 + 0.5 * localT);
        b.y = b.teleportFrom.y + (b.teleportTo.y - b.teleportFrom.y) * (0.5 + 0.5 * localT);
      }

      if (Math.random() < 0.8) {
        const px = t < 0.5
          ? b.teleportFrom.x + (b.teleportTo.x - b.teleportFrom.x) * t
          : b.x;
        const py = t < 0.5
          ? b.teleportFrom.y + (b.teleportTo.y - b.teleportFrom.y) * t
          : b.y;
        this.particles.push({
          x: px + (Math.random() - 0.5) * 20,
          y: py + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          life: 0.6,
          maxLife: 0.6,
          size: 3 + Math.random() * 4,
          color: this.getRandomPortalColor(),
          alpha: 1
        });
      }
    }

    if (b.teleportProgress >= 1) {
      b.teleporting = false;
      b.teleportProgress = 0;
      if (b.teleportTo) {
        b.x = b.teleportTo.x;
        b.y = b.teleportTo.y;
        this.spawnTeleportParticles(b.x, b.y, false);
      }
      b.teleportFrom = undefined;
      b.teleportTo = undefined;
    }
  }

  private getRandomPortalColor(): string {
    const colors = ['#b829f0', '#64ffda', '#ff64b8', '#ffd700', '#4a9eff', '#ff8c42'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private checkCollisions(): void {
    const { grid, cellSize } = this.level;
    const b = this.ball;

    const left = b.x - b.radius;
    const right = b.x + b.radius;
    const top = b.y - b.radius;
    const bottom = b.y + b.radius;

    const colStart = Math.max(0, Math.floor(left / cellSize));
    const colEnd = Math.min(this.level.cols - 1, Math.floor(right / cellSize));
    const rowStart = Math.max(0, Math.floor(top / cellSize));
    const rowEnd = Math.min(this.level.rows - 1, Math.floor(bottom / cellSize));

    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        const cell = grid[row][col];
        if (!cell || cell.type !== CellType.Wall) continue;

        const cellX = col * cellSize;
        const cellY = row * cellSize;
        this.resolveCircleAABBCollision(b, cellX, cellY, cellSize, cellSize);
      }
    }

    let flashed = false;
    if (b.x - b.radius < 0) {
      b.x = b.radius;
      b.vx = Math.abs(b.vx) * 0.7;
      flashed = true;
    }
    if (b.x + b.radius > this.canvasWidth) {
      b.x = this.canvasWidth - b.radius;
      b.vx = -Math.abs(b.vx) * 0.7;
      flashed = true;
    }
    if (b.y - b.radius < 0) {
      b.y = b.radius;
      b.vy = Math.abs(b.vy) * 0.7;
      flashed = true;
    }
    if (b.y + b.radius > this.canvasHeight) {
      b.y = this.canvasHeight - b.radius;
      b.vy = -Math.abs(b.vy) * 0.7;
      flashed = true;
    }

    if (flashed && this.onEdgeFlash) {
      this.onEdgeFlash();
    }
  }

  private resolveCircleAABBCollision(
    b: Ball,
    rectX: number,
    rectY: number,
    rectW: number,
    rectH: number
  ): void {
    const closestX = Math.max(rectX, Math.min(b.x, rectX + rectW));
    const closestY = Math.max(rectY, Math.min(b.y, rectY + rectH));

    const dx = b.x - closestX;
    const dy = b.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < b.radius * b.radius && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const overlap = b.radius - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      b.x += nx * overlap;
      b.y += ny * overlap;

      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + 0.6) * vn * nx;
        b.vy -= (1 + 0.6) * vn * ny;
        b.vx *= 0.85;
        b.vy *= 0.85;
      }

      if (this.onEdgeFlash) {
        this.onEdgeFlash();
      }
    }
  }

  private checkGoal(): void {
    const { grid, cellSize } = this.level;
    const b = this.ball;

    const col = Math.floor(b.x / cellSize);
    const row = Math.floor(b.y / cellSize);

    if (col < 0 || col >= this.level.cols || row < 0 || row >= this.level.rows) return;

    const cell = grid[row][col];
    if (cell && cell.type === CellType.Goal && !b.teleporting && b.height < 5) {
      this.spawnVictoryParticles();
      if (this.onGoalReached) {
        setTimeout(() => this.onGoalReached?.(), 100);
      }
    }
  }

  private decrementTimers(dt: number): void {
    const b = this.ball;
    if (b.acceleratorEffectTimer > 0) b.acceleratorEffectTimer -= dt;
    if (b.deceleratorEffectTimer > 0) b.deceleratorEffectTimer -= dt;
    if (b.bouncerEffectTimer > 0) b.bouncerEffectTimer -= dt;
    if (b.platformEffectTimer > 0) b.platformEffectTimer -= dt;
  }

  private spawnAcceleratorParticle(): void {
    const b = this.ball;
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (speed < 5) return;
    const nx = -b.vx / speed;
    const ny = -b.vy / speed;
    this.particles.push({
      x: b.x + nx * b.radius + (Math.random() - 0.5) * 6,
      y: b.y + ny * b.radius + (Math.random() - 0.5) * 6,
      vx: nx * (40 + Math.random() * 40) + (Math.random() - 0.5) * 20,
      vy: ny * (40 + Math.random() * 40) + (Math.random() - 0.5) * 20,
      life: 0.5 + Math.random() * 0.2,
      maxLife: 0.7,
      size: 2 + Math.random() * 4,
      color: `hsl(${200 + Math.random() * 40}, 90%, ${60 + Math.random() * 20}%)`,
      alpha: 1
    });
  }

  private spawnDeceleratorParticle(): void {
    const b = this.ball;
    const angle = Math.random() * Math.PI * 2;
    const dist = b.radius + Math.random() * 12;
    this.particles.push({
      x: b.x + Math.cos(angle) * dist,
      y: b.y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * (10 + Math.random() * 20),
      vy: Math.sin(angle) * (10 + Math.random() * 20),
      life: 0.4 + Math.random() * 0.2,
      maxLife: 0.6,
      size: 2 + Math.random() * 3,
      color: `hsl(${350 + Math.random() * 20}, 80%, ${55 + Math.random() * 20}%)`,
      alpha: 1
    });
  }

  private spawnBouncerParticles(): void {
    const b = this.ball;
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x: b.x,
        y: b.y + b.radius,
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed) - 20,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 2 + Math.random() * 5,
        color: `rgba(255, 255, 255, 0.9)`,
        alpha: 1
      });
    }
  }

  private spawnBounceLandParticles(): void {
    const b = this.ball;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI - Math.PI;
      const speed = 20 + Math.random() * 50;
      this.particles.push({
        x: b.x + (Math.random() - 0.5) * b.radius,
        y: b.y + b.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        color: `rgba(200, 200, 220, 0.8)`,
        alpha: 1
      });
    }
  }

  private spawnTeleportParticles(x: number, y: number, _isFrom: boolean): void {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 2 + Math.random() * 5,
        color: this.getRandomPortalColor(),
        alpha: 1
      });
    }
  }

  private spawnVictoryParticles(): void {
    const b = this.ball;
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      this.particles.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.8,
        maxLife: 1.6,
        size: 3 + Math.random() * 7,
        color: this.getRandomPortalColor(),
        alpha: 1
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += this.gravity * 20 * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticlesForRender(): Particle[] {
    return this.particles;
  }
}
