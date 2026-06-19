export type PlayerState = 'running' | 'jumping' | 'sliding';

export interface PlayerStateData {
  x: number;
  y: number;
  width: number;
  height: number;
  baseHeight: number;
  state: PlayerState;
  rotation: number;
  runFrame: number;
  slideTrailActive: boolean;
  stateProgress: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export class Player {
  public x: number;
  public baseY: number;
  public width = 40;
  public baseHeight = 50;
  public state: PlayerState = 'running';

  private jumpDuration = 0.6;
  private jumpHeight = 140;
  private jumpElapsed = 0;
  private jumpStartY = 0;
  private jumpTargetRotation = Math.PI * 2;
  private lastJumpProgress = 0;

  private slideDuration = 0.4;
  private slideElapsed = 0;

  private runFrameTime = 0;
  private runFrameInterval = 0.08;
  public runFrame = 0;

  public rotation = 0;
  public slideTrailActive = false;

  constructor(x: number, groundY: number) {
    this.x = x;
    this.baseY = groundY - this.baseHeight;
  }

  public setGroundY(groundY: number): void {
    if (this.state === 'running') {
      this.baseY = groundY - this.baseHeight;
    }
  }

  public getY(): number {
    if (this.state === 'jumping') {
      const t = this.jumpElapsed / this.jumpDuration;
      const eased = easeOutCubic(t);
      const arc = Math.sin(t * Math.PI);
      return this.jumpStartY - this.jumpHeight * arc;
    }
    if (this.state === 'sliding') {
      return this.baseY + this.baseHeight * (2 / 3);
    }
    return this.baseY;
  }

  public getHeight(): number {
    if (this.state === 'sliding') {
      return this.baseHeight / 3;
    }
    return this.baseHeight;
  }

  public getWidth(): number {
    if (this.state === 'sliding') {
      return this.width * 1.3;
    }
    return this.width;
  }

  public getStateProgress(): number {
    if (this.state === 'jumping') return this.jumpElapsed / this.jumpDuration;
    if (this.state === 'sliding') return this.slideElapsed / this.slideDuration;
    return 0;
  }

  public getState(): PlayerStateData {
    return {
      x: this.x,
      y: this.getY(),
      width: this.getWidth(),
      height: this.getHeight(),
      baseHeight: this.baseHeight,
      state: this.state,
      rotation: this.rotation,
      runFrame: this.runFrame,
      slideTrailActive: this.slideTrailActive,
      stateProgress: this.getStateProgress()
    };
  }

  public jump(): boolean {
    if (this.state !== 'running') return false;
    this.state = 'jumping';
    this.jumpElapsed = 0;
    this.jumpStartY = this.baseY;
    this.rotation = 0;
    this.lastJumpProgress = 0;
    return true;
  }

  public slide(): boolean {
    if (this.state !== 'running') return false;
    this.state = 'sliding';
    this.slideElapsed = 0;
    this.slideTrailActive = true;
    return true;
  }

  public update(dt: number): void {
    this.runFrameTime += dt;
    if (this.runFrameTime >= this.runFrameInterval) {
      this.runFrameTime = 0;
      this.runFrame = (this.runFrame + 1) % 4;
    }

    if (this.state === 'jumping') {
      this.jumpElapsed += dt;
      const t = Math.min(1, this.jumpElapsed / this.jumpDuration);
      const easedTotal = easeInOutQuad(t) * this.jumpTargetRotation;
      const deltaRotation = easedTotal - this.lastJumpProgress;
      this.rotation += deltaRotation;
      this.lastJumpProgress = easedTotal;
      if (this.jumpElapsed >= this.jumpDuration) {
        this.state = 'running';
        this.rotation = 0;
        this.jumpElapsed = 0;
        this.lastJumpProgress = 0;
      }
    } else if (this.state === 'sliding') {
      this.slideElapsed += dt;
      this.slideTrailActive = this.slideElapsed < this.slideDuration;
      if (this.slideElapsed >= this.slideDuration) {
        this.state = 'running';
        this.slideElapsed = 0;
        this.slideTrailActive = false;
      }
    }
  }

  public getHitbox(): { x: number; y: number; w: number; h: number } {
    const padding = 6;
    return {
      x: this.x + padding,
      y: this.getY() + padding,
      w: this.getWidth() - padding * 2,
      h: this.getHeight() - padding * 2
    };
  }
}
