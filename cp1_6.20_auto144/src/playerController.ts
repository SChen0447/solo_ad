import { PlayerState, PLAYER_RADIUS, INITIAL_LIVES, PLAYER_SPEED, CELL_SIZE, Obstacle, EnergyCore, OBSTACLE_RADIUS, CORE_RADIUS, MazeData, EventEmitter } from './types';
import { MazeGenerator } from './mazeGenerator';

export class PlayerController extends EventEmitter {
  private state: PlayerState;
  private keys: Set<string> = new Set();
  private touchStart: { x: number; y: number } | null = null;
  private touchCurrent: { x: number; y: number } | null = null;
  private mazeGenerator: MazeGenerator;
  private mazeData: MazeData | null = null;

  constructor() {
    super();
    this.mazeGenerator = new MazeGenerator();
    this.state = {
      position: { x: 0, z: 0 },
      lives: INITIAL_LIVES,
      radius: PLAYER_RADIUS,
      isHit: false,
      hitTimer: 0,
      invincibleTimer: 0
    };
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') {
      this.emit('pauseToggle');
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.touchStart = { x: touch.clientX, y: touch.clientY };
      this.touchCurrent = { x: touch.clientX, y: touch.clientY };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.touchCurrent = { x: touch.clientX, y: touch.clientY };
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.touchStart = null;
    this.touchCurrent = null;
  }

  setMazeData(mazeData: MazeData): void {
    this.mazeData = mazeData;
  }

  reset(position: { x: number; z: number }): void {
    this.state.position = { ...position };
    this.state.lives = INITIAL_LIVES;
    this.state.isHit = false;
    this.state.hitTimer = 0;
    this.state.invincibleTimer = 0;
    this.emit('livesChange', this.state.lives);
  }

  resetPosition(position: { x: number; z: number }): void {
    this.state.position = { ...position };
    this.state.isHit = false;
    this.state.hitTimer = 0;
    this.state.invincibleTimer = 1.5;
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  getPosition(): { x: number; z: number } {
    return { ...this.state.position };
  }

  getLives(): number {
    return this.state.lives;
  }

  loseLife(): boolean {
    if (this.state.invincibleTimer > 0) return false;
    
    this.state.lives--;
    this.state.isHit = true;
    this.state.hitTimer = 0.3;
    this.state.invincibleTimer = 1.5;
    this.emit('hit');
    this.emit('livesChange', this.state.lives);
    
    if (this.state.lives <= 0) {
      this.emit('dead');
      return true;
    }
    return false;
  }

  addLife(): void {
    this.state.lives = Math.min(this.state.lives + 1, 5);
    this.emit('livesChange', this.state.lives);
  }

  update(dt: number): void {
    if (this.state.hitTimer > 0) {
      this.state.hitTimer -= dt;
      if (this.state.hitTimer <= 0) {
        this.state.isHit = false;
      }
    }

    if (this.state.invincibleTimer > 0) {
      this.state.invincibleTimer -= dt;
    }

    let dx = 0;
    let dz = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (this.touchStart && this.touchCurrent) {
      const tdx = this.touchCurrent.x - this.touchStart.x;
      const tdz = this.touchCurrent.y - this.touchStart.y;
      const threshold = 10;
      
      if (Math.abs(tdx) > threshold || Math.abs(tdz) > threshold) {
        const max = Math.max(Math.abs(tdx), Math.abs(tdz));
        dx = tdx / max;
        dz = tdz / max;
      }
    }

    const length = Math.sqrt(dx * dx + dz * dz);
    if (length > 0) {
      dx /= length;
      dz /= length;

      const speed = PLAYER_SPEED * dt;
      const newX = this.state.position.x + dx * speed;
      const newZ = this.state.position.z + dz * speed;

      if (this.mazeData) {
        const canMoveX = !this.checkWallCollision(newX, this.state.position.z);
        const canMoveZ = !this.checkWallCollision(this.state.position.x, newZ);

        if (canMoveX) {
          this.state.position.x = newX;
        }
        if (canMoveZ) {
          this.state.position.z = newZ;
        }
        if (canMoveX || canMoveZ) {
          if (!canMoveX || !canMoveZ) {
            this.emit('wallHit');
          }
        }
      } else {
        this.state.position.x = newX;
        this.state.position.z = newZ;
      }
    }

    this.emit('positionUpdate', this.state.position);
  }

  private checkWallCollision(x: number, z: number): boolean {
    if (!this.mazeData) return false;

    const margin = this.state.radius * 0.8;
    
    const checkPoints = [
      { x: x - margin, z: z - margin },
      { x: x + margin, z: z - margin },
      { x: x - margin, z: z + margin },
      { x: x + margin, z: z + margin }
    ];

    for (const point of checkPoints) {
      if (this.mazeGenerator.isWall(point.x, point.z, this.mazeData)) {
        return true;
      }
    }
    return false;
  }

  checkObstacleCollision(obstacles: Obstacle[]): Obstacle | null {
    if (this.state.invincibleTimer > 0) return null;

    for (const obs of obstacles) {
      const dx = this.state.position.x - obs.position.x;
      const dz = this.state.position.z - obs.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = this.state.radius + obs.radius;

      if (dist < minDist) {
        return obs;
      }
    }
    return null;
  }

  checkCoreCollision(cores: EnergyCore[]): EnergyCore | null {
    for (const core of cores) {
      if (core.collected) continue;

      const dx = this.state.position.x - core.position.x;
      const dz = this.state.position.z - core.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = this.state.radius + CORE_RADIUS;

      if (dist < minDist) {
        return core;
      }
    }
    return null;
  }

  isFlashing(): boolean {
    return this.state.isHit || (this.state.invincibleTimer > 0 && Math.floor(this.state.invincibleTimer * 10) % 2 === 0);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('touchstart', this.onTouchStart.bind(this));
    window.removeEventListener('touchmove', this.onTouchMove.bind(this));
    window.removeEventListener('touchend', this.onTouchEnd.bind(this));
    this.removeAllListeners();
  }
}
