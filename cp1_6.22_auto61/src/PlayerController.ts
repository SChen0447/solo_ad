import { PlayerState, Position, CONFIG } from './types';

export class PlayerController {
  private state: PlayerState;
  private speed: number;
  private inertiaTime: number;
  private maxInertiaTime: number;

  constructor(startX: number, startY: number) {
    this.speed = CONFIG.PLAYER_SPEED;
    this.maxInertiaTime = CONFIG.INERTIA_TIME;
    this.inertiaTime = 0;
    this.state = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      direction: {
        up: false,
        down: false,
        left: false,
        right: false,
      },
      inertiaTime: 0,
    };
  }

  public update(deltaTime: number, isMoving: boolean): void {
    let targetVx = 0;
    let targetVy = 0;

    if (this.state.direction.up) targetVy -= this.speed;
    if (this.state.direction.down) targetVy += this.speed;
    if (this.state.direction.left) targetVx -= this.speed;
    if (this.state.direction.right) targetVx += this.speed;

    if (targetVx !== 0 && targetVy !== 0) {
      const factor = 1 / Math.sqrt(2);
      targetVx *= factor;
      targetVy *= factor;
    }

    if (isMoving) {
      this.state.vx = targetVx;
      this.state.vy = targetVy;
      this.inertiaTime = this.maxInertiaTime;
    } else if (this.inertiaTime > 0) {
      this.inertiaTime -= deltaTime;
      const inertiaFactor = Math.max(0, this.inertiaTime / this.maxInertiaTime);
      this.state.vx *= inertiaFactor;
      this.state.vy *= inertiaFactor;
    } else {
      this.state.vx = 0;
      this.state.vy = 0;
    }

    this.state.x += this.state.vx * deltaTime;
    this.state.y += this.state.vy * deltaTime;
  }

  public getPosition(): Position {
    return { x: this.state.x, y: this.state.y };
  }

  public getState(): PlayerState {
    return { ...this.state };
  }

  public setPosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
    this.state.vx = 0;
    this.state.vy = 0;
    this.inertiaTime = 0;
  }

  public setDirection(direction: Partial<PlayerState['direction']>): void {
    this.state.direction = { ...this.state.direction, ...direction };
  }

  public isMoving(): boolean {
    return (
      this.state.direction.up ||
      this.state.direction.down ||
      this.state.direction.left ||
      this.state.direction.right
    );
  }

  public adjustPosition(dx: number, dy: number): void {
    this.state.x += dx;
    this.state.y += dy;
  }

  public stopX(): void {
    this.state.vx = 0;
  }

  public stopY(): void {
    this.state.vy = 0;
  }
}
