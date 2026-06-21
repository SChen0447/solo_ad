import {
  GRAVITY,
  JUMP_FORCE,
  MOVE_SPEED,
  MAX_FALL_SPEED,
  PLAYER_SIZE,
  PLAYER_START_X,
  PLAYER_START_Y,
  COLORS
} from './constants';
import { LevelManager } from './level';

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  isGrounded: boolean;
  isAlive: boolean;
  reachedGoal: boolean;
}

export class Player {
  private state: PlayerState;
  private keys: Set<string> = new Set();

  constructor() {
    this.state = {
      x: PLAYER_START_X,
      y: PLAYER_START_Y,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      velocityX: 0,
      velocityY: 0,
      isGrounded: false,
      isAlive: true,
      reachedGoal: false
    };
  }

  public getState(): Readonly<PlayerState> {
    return this.state;
  }

  public reset(): void {
    this.state.x = PLAYER_START_X;
    this.state.y = PLAYER_START_Y;
    this.state.velocityX = 0;
    this.state.velocityY = 0;
    this.state.isGrounded = false;
    this.state.isAlive = true;
    this.state.reachedGoal = false;
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  public update(levelManager: LevelManager): void {
    if (!this.state.isAlive || this.state.reachedGoal) {
      return;
    }

    this.state.velocityX = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.state.velocityX = -MOVE_SPEED;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.state.velocityX = MOVE_SPEED;
    }

    if (
      (this.keys.has('w') || this.keys.has('arrowup') || this.keys.has(' ')) &&
      this.state.isGrounded
    ) {
      this.state.velocityY = JUMP_FORCE;
      this.state.isGrounded = false;
    }

    this.state.velocityY = Math.min(
      this.state.velocityY + GRAVITY,
      MAX_FALL_SPEED
    );

    this.moveX(levelManager);
    this.moveY(levelManager);

    if (levelManager.checkGoalReached(
      this.state.x,
      this.state.y,
      this.state.width,
      this.state.height
    )) {
      this.state.reachedGoal = true;
    }

    if (levelManager.isOutOfBounds(
      this.state.x,
      this.state.y,
      this.state.width,
      this.state.height
    )) {
      this.state.isAlive = false;
    }
  }

  private moveX(levelManager: LevelManager): void {
    this.state.x += this.state.velocityX;
    const collision = levelManager.checkCollision(
      this.state.x,
      this.state.y,
      this.state.width,
      this.state.height
    );
    if (collision) {
      if (this.state.velocityX > 0) {
        this.state.x = collision.x - this.state.width;
      } else if (this.state.velocityX < 0) {
        this.state.x = collision.x + collision.width;
      }
      this.state.velocityX = 0;
    }
  }

  private moveY(levelManager: LevelManager): void {
    this.state.y += this.state.velocityY;
    this.state.isGrounded = false;
    const collision = levelManager.checkCollision(
      this.state.x,
      this.state.y,
      this.state.width,
      this.state.height
    );
    if (collision) {
      if (this.state.velocityY > 0) {
        this.state.y = collision.y - this.state.height;
        this.state.isGrounded = true;
      } else if (this.state.velocityY < 0) {
        this.state.y = collision.y + collision.height;
      }
      this.state.velocityY = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.PLAYER;
    ctx.fillRect(
      this.state.x,
      this.state.y,
      this.state.width,
      this.state.height
    );
  }
}
