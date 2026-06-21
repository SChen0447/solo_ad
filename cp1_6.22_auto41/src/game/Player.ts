export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speedBoostTimer: number;
  hasShield: boolean;
  shieldRotation: number;
  glowAlpha: number;
  glowDirection: number;
  flameFrame: number;
  flameTimer: number;
}

export class Player {
  public state: PlayerState;
  private baseSpeed: number = 200;
  private canvasWidth: number;
  private canvasHeight: number;
  private keys: Set<string> = new Set();

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      x: 100,
      y: canvasHeight / 2,
      width: 16,
      height: 16,
      speedBoostTimer: 0,
      hasShield: false,
      shieldRotation: 0,
      glowAlpha: 0.5,
      glowDirection: 1,
      flameFrame: 0,
      flameTimer: 0
    };
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  public update(dt: number): void {
    const currentSpeed = this.state.speedBoostTimer > 0 ? this.baseSpeed * 1.5 : this.baseSpeed;
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy);
      dx *= invLen;
      dy *= invLen;
    }

    this.state.x += dx * currentSpeed * dt;
    this.state.y += dy * currentSpeed * dt;

    this.state.x = Math.max(0, Math.min(this.canvasWidth - this.state.width, this.state.x));
    this.state.y = Math.max(0, Math.min(this.canvasHeight - this.state.height, this.state.y));

    if (this.state.speedBoostTimer > 0) {
      this.state.speedBoostTimer -= dt;
      this.state.glowAlpha += this.state.glowDirection * dt * 2;
      if (this.state.glowAlpha > 0.8) {
        this.state.glowAlpha = 0.8;
        this.state.glowDirection = -1;
      } else if (this.state.glowAlpha < 0.2) {
        this.state.glowAlpha = 0.2;
        this.state.glowDirection = 1;
      }
    } else {
      this.state.glowAlpha = 0;
    }

    if (this.state.hasShield) {
      this.state.shieldRotation += dt * 3;
    }

    this.state.flameTimer += dt;
    if (this.state.flameTimer > 0.08) {
      this.state.flameTimer = 0;
      this.state.flameFrame = (this.state.flameFrame + 1) % 2;
    }
  }

  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    };
  }

  public activateSpeedBoost(): void {
    this.state.speedBoostTimer = 3;
  }

  public activateShield(): void {
    this.state.hasShield = true;
  }

  public consumeShield(): boolean {
    if (this.state.hasShield) {
      this.state.hasShield = false;
      return true;
    }
    return false;
  }

  public reset(): void {
    this.state.x = 100;
    this.state.y = this.canvasHeight / 2;
    this.state.speedBoostTimer = 0;
    this.state.hasShield = false;
    this.state.shieldRotation = 0;
    this.state.glowAlpha = 0;
    this.state.glowDirection = 1;
    this.state.flameFrame = 0;
    this.state.flameTimer = 0;
  }
}
