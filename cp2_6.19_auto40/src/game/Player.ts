export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingRight: boolean;
  onGround: boolean;
  isJumping: boolean;
  jumpHoldFrames: number;
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
  private lastSafeGroundX = 0;
  private lastSafeGroundY = 0;
  private safeGroundCooldown = 0;

  private readonly GRAVITY = 0.55;
  private readonly REDUCED_GRAVITY = 0.28;
  private readonly MAX_FALL = 12;
  private readonly MOVE_ACCEL = 0.8;
  private readonly MOVE_DECEL = 0.5;
  private readonly MAX_SPEED = 5;
  private readonly JUMP_INITIAL_VY = -6;
  private readonly JUMP_HOLD_FORCE = -0.85;
  private readonly JUMP_HOLD_MAX_FRAMES = 22;
  private readonly FRICTION = 0.85;
  private readonly SAFE_GROUND_COOLDOWN = 30;

  private isJumping = false;
  private jumpHoldFrames = 0;
  private jumpPressedThisFrame = false;

  readonly history: PlayerSnapshot[] = [];
  private readonly HISTORY_DURATION = 300;
  private readonly MAX_HISTORY_BYTES = 50 * 1024 * 1024;

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
    this.lastSafeGroundX = spawnX;
    this.lastSafeGroundY = spawnY;
  }

  getSnapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facingRight: this.facingRight,
      onGround: this.onGround,
      isJumping: this.isJumping,
      jumpHoldFrames: this.jumpHoldFrames,
    };
  }

  applySnapshot(snap: PlayerSnapshot): void {
    this.x = snap.x;
    this.y = snap.y;
    this.vx = snap.vx;
    this.vy = snap.vy;
    this.facingRight = snap.facingRight;
    this.onGround = snap.onGround;
    this.isJumping = snap.isJumping;
    this.jumpHoldFrames = snap.jumpHoldFrames;
  }

  recordFrame(): boolean {
    const snapSize = 8 * 8;
    if ((this.history.length + 1) * snapSize > this.MAX_HISTORY_BYTES) {
      return false;
    }
    this.history.push(this.getSnapshot());
    if (this.history.length > this.HISTORY_DURATION) {
      this.history.shift();
    }
    return true;
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  getHistoryMemoryBytes(): number {
    return this.history.length * 8 * 8;
  }

  update(left: boolean, right: boolean, jump: boolean, jumpPressed: boolean, jumpReleased: boolean, now: number): void {
    if (this.dying) {
      this.deathTimer++;
      return;
    }

    this.jumpPressedThisFrame = jumpPressed;

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
      this.vy = this.JUMP_INITIAL_VY;
      this.isJumping = true;
      this.jumpHoldFrames = 0;
      this.onGround = false;
    }

    if (this.isJumping && jump && this.jumpHoldFrames < this.JUMP_HOLD_MAX_FRAMES) {
      this.vy += this.JUMP_HOLD_FORCE;
      this.jumpHoldFrames++;
      this.vy = Math.min(this.vy, this.JUMP_INITIAL_VY + this.JUMP_HOLD_FORCE * this.JUMP_HOLD_MAX_FRAMES);
    }

    if (jumpReleased) {
      this.isJumping = false;
    }

    const effectiveGravity = (this.isJumping && jump && this.vy < 0) ? this.REDUCED_GRAVITY : this.GRAVITY;
    this.vy += effectiveGravity;
    if (this.vy > this.MAX_FALL) this.vy = this.MAX_FALL;

    if (this.safeGroundCooldown > 0) {
      this.safeGroundCooldown--;
    }

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
    if (this.onGround && this.safeGroundCooldown === 0) {
      this.lastSafeGroundX = this.x;
      this.lastSafeGroundY = this.y;
      this.safeX = this.x;
      this.safeY = this.y;
      this.safeGroundCooldown = this.SAFE_GROUND_COOLDOWN;
    }
  }

  die(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathTimer = 0;
    this.alive = false;
    this.isJumping = false;
    this.jumpHoldFrames = 0;
  }

  respawn(resetCollectibles: () => void): void {
    this.x = this.lastSafeGroundX;
    this.y = this.lastSafeGroundY;
    this.vx = 0;
    this.vy = 0;
    this.dying = false;
    this.alive = true;
    this.deathTimer = 0;
    this.isJumping = false;
    this.jumpHoldFrames = 0;
    this.onGround = false;
    this.ghostTrails = [];
    this.history.length = 0;
    resetCollectibles();
  }

  getSpawnX(): number { return this.spawnX; }
  getSpawnY(): number { return this.spawnY; }
  getSafeX(): number { return this.lastSafeGroundX; }
  getSafeY(): number { return this.lastSafeGroundY; }
}
