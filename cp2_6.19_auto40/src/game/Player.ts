export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingRight: boolean;
  onGround: boolean;
}

interface GhostTrail {
  x: number;
  y: number;
  alpha: number;
  born: number;
}

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  width = 20;
  height = 20;
  facingRight = true;
  onGround = false;
  alive = true;
  dying = false;
  deathTimer = 0;

  private spawnX = 0;
  private spawnY = 0;
  private safeX = 0;
  private safeY = 0;

  private readonly GRAVITY = 0.6;
  private readonly MAX_FALL = 12;
  private readonly MOVE_ACCEL = 0.8;
  private readonly MOVE_DECEL = 0.5;
  private readonly MAX_SPEED = 5;
  private readonly JUMP_MIN_VY = -7;
  private readonly JUMP_MAX_VY = -14;
  private readonly FRICTION = 0.85;

  private jumpHeld = false;
  private jumpHoldTime = 0;
  private readonly JUMP_HOLD_MAX = 12;

  readonly history: PlayerSnapshot[] = [];
  private readonly HISTORY_DURATION = 300;

  ghostTrails: GhostTrail[] = [];
  private ghostInterval = 0;

  score = 0;

  constructor(spawnX: number, spawnY: number) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.x = spawnX;
    this.y = spawnY;
    this.safeX = spawnX;
    this.safeY = spawnY;
  }

  getSnapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facingRight: this.facingRight,
      onGround: this.onGround,
    };
  }

  applySnapshot(snap: PlayerSnapshot): void {
    this.x = snap.x;
    this.y = snap.y;
    this.vx = snap.vx;
    this.vy = snap.vy;
    this.facingRight = snap.facingRight;
    this.onGround = snap.onGround;
  }

  recordFrame(): void {
    this.history.push(this.getSnapshot());
    if (this.history.length > this.HISTORY_DURATION) {
      this.history.shift();
    }
  }

  update(left: boolean, right: boolean, jump: boolean, jumpPressed: boolean, jumpReleased: boolean, now: number): void {
    if (this.dying) {
      this.deathTimer++;
      return;
    }

    if (left) {
      this.vx -= this.MOVE_ACCEL;
      this.facingRight = false;
    } else if (right) {
      this.vx += this.MOVE_ACCEL;
      this.facingRight = true;
    } else {
      if (Math.abs(this.vx) < this.MOVE_DECEL) {
        this.vx = 0;
      } else {
        this.vx -= Math.sign(this.vx) * this.MOVE_DECEL;
      }
    }

    if (this.onGround && !left && !right) {
      this.vx *= this.FRICTION;
    }

    if (this.vx > this.MAX_SPEED) this.vx = this.MAX_SPEED;
    if (this.vx < -this.MAX_SPEED) this.vx = -this.MAX_SPEED;

    if (jumpPressed && this.onGround) {
      this.vy = this.JUMP_MIN_VY;
      this.jumpHeld = true;
      this.jumpHoldTime = 0;
      this.onGround = false;
    }

    if (this.jumpHeld && jump) {
      this.jumpHoldTime++;
      if (this.jumpHoldTime < this.JUMP_HOLD_MAX) {
        const t = this.jumpHoldTime / this.JUMP_HOLD_MAX;
        const extraVy = this.JUMP_MIN_VY + (this.JUMP_MAX_VY - this.JUMP_MIN_VY) * t;
        this.vy = Math.min(this.vy, extraVy);
      }
    }

    if (jumpReleased || !jump) {
      this.jumpHeld = false;
    }

    this.vy += this.GRAVITY;
    if (this.vy > this.MAX_FALL) this.vy = this.MAX_FALL;

    this.ghostInterval++;
    if (this.ghostInterval >= 2 && (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5)) {
      this.ghostTrails.push({ x: this.x, y: this.y, alpha: 0.3, born: now });
      this.ghostInterval = 0;
    }

    this.ghostTrails = this.ghostTrails.filter((g) => now - g.born < 200);
  }

  updateGhostAlphas(now: number): void {
    for (const g of this.ghostTrails) {
      const age = now - g.born;
      g.alpha = 0.3 * (1 - age / 200);
    }
  }

  recordSafePosition(): void {
    if (this.onGround) {
      this.safeX = this.x;
      this.safeY = this.y;
    }
  }

  die(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathTimer = 0;
    this.alive = false;
  }

  respawn(resetCollectibles: () => void): void {
    this.x = this.safeX;
    this.y = this.safeY;
    this.vx = 0;
    this.vy = 0;
    this.dying = false;
    this.alive = true;
    this.deathTimer = 0;
    this.jumpHeld = false;
    this.onGround = false;
    this.ghostTrails = [];
    this.history.length = 0;
    resetCollectibles();
  }

  getSpawnX(): number { return this.spawnX; }
  getSpawnY(): number { return this.spawnY; }
  getSafeX(): number { return this.safeX; }
  getSafeY(): number { return this.safeY; }
}
