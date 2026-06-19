export interface PlayerState {
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  baseHeight: number;
  isJumping: boolean;
  isSliding: boolean;
  rotation: number;
  jumpProgress: number;
  slideProgress: number;
  legPhase: number;
  slideParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>;
}

export class Player {
  private state: PlayerState;
  private jumpDuration = 0.6;
  private slideDuration = 0.4;
  private jumpHeight = 180;
  private jumpStartTime = 0;
  private slideStartTime = 0;
  private groundY: number;

  constructor(canvasHeight: number, canvasWidth: number) {
    this.groundY = canvasHeight * 0.75;
    const size = Math.min(canvasHeight, canvasWidth) * 0.06;
    this.state = {
      x: canvasWidth * 0.2,
      y: this.groundY - size,
      baseY: this.groundY - size,
      width: size,
      height: size,
      baseHeight: size,
      isJumping: false,
      isSliding: false,
      rotation: 0,
      jumpProgress: 0,
      slideProgress: 0,
      legPhase: 0,
      slideParticles: [],
    };
  }

  jump(currentTime: number): boolean {
    if (this.state.isJumping || this.state.isSliding) return false;
    this.state.isJumping = true;
    this.jumpStartTime = currentTime;
    return true;
  }

  slide(currentTime: number): boolean {
    if (this.state.isSliding || this.state.isJumping) return false;
    this.state.isSliding = true;
    this.slideStartTime = currentTime;
    return true;
  }

  update(currentTime: number, dt: number): void {
    if (this.state.isJumping) {
      const elapsed = currentTime - this.jumpStartTime;
      this.state.jumpProgress = Math.min(elapsed / this.jumpDuration, 1);
      const t = this.state.jumpProgress;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.state.y = this.state.baseY - this.jumpHeight * Math.sin(eased * Math.PI);
      this.state.rotation = this.state.jumpProgress * Math.PI * 2;
      if (this.state.jumpProgress >= 1) {
        this.state.isJumping = false;
        this.state.y = this.state.baseY;
        this.state.rotation = 0;
        this.state.jumpProgress = 0;
      }
    }

    if (this.state.isSliding) {
      const elapsed = currentTime - this.slideStartTime;
      this.state.slideProgress = Math.min(elapsed / this.slideDuration, 1);
      const t = this.state.slideProgress;
      const compressEase = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
      this.state.height = this.state.baseHeight * (1 - compressEase * 0.67);
      this.state.y = this.groundY - this.state.height;

      if (compressEase > 0.3) {
        for (let i = 0; i < 2; i++) {
          this.state.slideParticles.push({
            x: this.state.x + this.state.width * 0.3,
            y: this.groundY,
            vx: -Math.random() * 60 - 20,
            vy: -Math.random() * 30 - 10,
            life: 0.3,
          });
        }
      }

      if (this.state.slideProgress >= 1) {
        this.state.isSliding = false;
        this.state.height = this.state.baseHeight;
        this.state.y = this.state.baseY;
        this.state.slideProgress = 0;
      }
    }

    this.state.slideParticles = this.state.slideParticles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });

    if (!this.state.isJumping && !this.state.isSliding) {
      this.state.legPhase += dt * 12;
    }
  }

  getCollisionBox(): { x: number; y: number; width: number; height: number } {
    if (this.state.isSliding) {
      return {
        x: this.state.x + 2,
        y: this.state.y + 2,
        width: this.state.width - 4,
        height: this.state.height - 4,
      };
    }
    if (this.state.isJumping) {
      return {
        x: this.state.x + 4,
        y: this.state.y + 4,
        width: this.state.width - 8,
        height: this.state.height - 8,
      };
    }
    return {
      x: this.state.x + 2,
      y: this.state.y + 2,
      width: this.state.width - 4,
      height: this.state.height - 4,
    };
  }

  getState(): PlayerState {
    return this.state;
  }

  getGroundY(): number {
    return this.groundY;
  }

  resize(canvasHeight: number, canvasWidth: number): void {
    this.groundY = canvasHeight * 0.75;
    const size = Math.min(canvasHeight, canvasWidth) * 0.06;
    this.state.x = canvasWidth * 0.2;
    this.state.baseY = this.groundY - size;
    this.state.width = size;
    this.state.baseHeight = size;
    if (!this.state.isJumping && !this.state.isSliding) {
      this.state.height = size;
      this.state.y = this.state.baseY;
    }
  }

  isInvulnerable(): boolean {
    return this.state.isJumping;
  }
}
