import { TILE_SIZE, LEVEL_PIXEL_HEIGHT } from './level';

export interface HistoryFrame {
  x: number;
  y: number;
  velX: number;
  velY: number;
  onGround: boolean;
  jumpsLeft: number;
  facingRight: boolean;
  timestamp: number;
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export class Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velX: number;
  velY: number;
  onGround: boolean;
  jumpsLeft: number;
  maxJumps: number;
  facingRight: boolean;
  color: string;

  moveSpeed: number;
  slowSpeed: number;
  jumpForce: number;
  gravity: number;

  history: HistoryFrame[] = [];
  maxHistoryFrames: number;
  historyInterval: number;
  lastHistoryTime: number = 0;

  particles: Particle[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE * 0.8;
    this.height = TILE_SIZE * 0.8;
    this.velX = 0;
    this.velY = 0;
    this.onGround = false;
    this.maxJumps = 2;
    this.jumpsLeft = this.maxJumps;
    this.facingRight = true;
    this.color = '#00ffcc';

    this.moveSpeed = 6 * TILE_SIZE;
    this.slowSpeed = 2 * TILE_SIZE;
    this.jumpForce = -8 * 60;
    this.gravity = 0.4 * 60 * 60;

    this.maxHistoryFrames = 300;
    this.historyInterval = 0.1;
  }

  update(dt: number, input: { left: boolean; right: boolean; jump: boolean; slow: boolean }, getGroundY: (x: number, width: number, prevBottom: number, currentBottom: number, velY: number) => number | null, checkWallCollision: (x: number, y: number, width: number, height: number, velX: number) => { left: boolean; right: boolean }, checkCeilingCollision: (x: number, y: number, width: number, height: number, velY: number) => boolean, pushBox?: { x: number; y: number; width: number; height: number; velX: number }) {
    const speed = input.slow ? this.slowSpeed : this.moveSpeed;

    if (input.left) {
      this.velX = -speed;
      this.facingRight = false;
    } else if (input.right) {
      this.velX = speed;
      this.facingRight = true;
    } else {
      this.velX = 0;
    }

    if (input.jump && this.jumpsLeft > 0) {
      this.velY = this.jumpForce;
      this.jumpsLeft--;
      this.onGround = false;
    }

    this.velY += this.gravity * dt;

    if (this.velY > 20 * 60) {
      this.velY = 20 * 60;
    }

    const prevBottom = this.y + this.height;
    this.y += this.velY * dt;
    const currentBottom = this.y + this.height;

    const groundY = getGroundY(this.x, this.width, prevBottom, currentBottom, this.velY);
    if (groundY !== null && this.velY >= 0) {
      this.y = groundY - this.height;
      this.velY = 0;
      this.onGround = true;
      this.jumpsLeft = this.maxJumps;
    } else {
      this.onGround = false;
    }

    if (checkCeilingCollision(this.x, this.y, this.width, this.height, this.velY) && this.velY < 0) {
      this.velY = 0;
    }

    const prevX = this.x;
    this.x += this.velX * dt;

    const wall = checkWallCollision(this.x, this.y, this.width, this.height, this.velX);
    if (wall.left) {
      this.x = Math.ceil(this.x / 1) * 1;
      this.x = prevX;
      while (checkWallCollision(this.x - 1, this.y, this.width, this.height, -1).left) {
        this.x++;
      }
      this.velX = 0;
    }
    if (wall.right) {
      this.x = prevX;
      while (checkWallCollision(this.x + 1, this.y, this.width, this.height, 1).right) {
        this.x--;
      }
      this.velX = 0;
    }

    if (pushBox && this.velX !== 0) {
      const touchingBox =
        this.x + this.width > pushBox.x &&
        this.x < pushBox.x + pushBox.width &&
        this.y + this.height > pushBox.y + 2 &&
        this.y < pushBox.y + pushBox.height - 2;

      if (touchingBox) {
        const boxVel = this.velX * 0.8;
        pushBox.velX = boxVel / 60;
      }
    }

    if (Math.abs(this.velX) > 10 && this.onGround) {
      this.addParticle();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  addParticle() {
    const size = 1 + Math.random() * 2;
    const px = this.facingRight
      ? this.x + this.width * 0.1
      : this.x + this.width * 0.9;
    const py = this.y + this.height - size;

    this.particles.push({
      x: px,
      y: py,
      size: size,
      alpha: 1,
      life: 0.5,
      maxLife: 0.5,
      color: this.color,
    });
  }

  recordHistory(timestamp: number) {
    if (timestamp - this.lastHistoryTime >= this.historyInterval) {
      this.history.push({
        x: this.x,
        y: this.y,
        velX: this.velX,
        velY: this.velY,
        onGround: this.onGround,
        jumpsLeft: this.jumpsLeft,
        facingRight: this.facingRight,
        timestamp: timestamp,
      });

      if (this.history.length > this.maxHistoryFrames) {
        this.history.shift();
      }

      this.lastHistoryTime = timestamp;
    }
  }

  rewindTo(targetTime: number): boolean {
    if (this.history.length === 0) return false;

    let targetFrame: HistoryFrame | null = null;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].timestamp <= targetTime) {
        targetFrame = this.history[i];
        break;
      }
    }

    if (!targetFrame) {
      if (this.history.length > 0) {
        targetFrame = this.history[0];
      } else {
        return false;
      }
    }

    this.x = targetFrame.x;
    this.y = targetFrame.y;
    this.velX = targetFrame.velX;
    this.velY = targetFrame.velY;
    this.onGround = targetFrame.onGround;
    this.jumpsLeft = targetFrame.jumpsLeft;
    this.facingRight = targetFrame.facingRight;

    const cutoffIndex = this.history.findIndex((f) => f.timestamp >= targetTime);
    if (cutoffIndex >= 0) {
      this.history = this.history.slice(0, cutoffIndex);
    }

    return true;
  }

  getHistoryDuration(): number {
    if (this.history.length < 2) return 0;
    return this.history[this.history.length - 1].timestamp - this.history[0].timestamp;
  }

  getLatestHistoryTime(): number {
    if (this.history.length === 0) return 0;
    return this.history[this.history.length - 1].timestamp;
  }

  isFallingOut(): boolean {
    return this.y > LEVEL_PIXEL_HEIGHT + 100;
  }

  reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.velX = 0;
    this.velY = 0;
    this.onGround = false;
    this.jumpsLeft = this.maxJumps;
    this.history = [];
    this.particles = [];
  }
}
