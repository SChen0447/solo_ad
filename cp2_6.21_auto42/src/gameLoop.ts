import * as THREE from 'three';
import { Player, AABB } from './player';
import { Level, PlatformType } from './level';
import { TimeRewind } from './timeRewind';
import { GameRenderer } from './renderer';

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isWon: boolean;
  time: number;
  stars: number;
}

export class GameLoop {
  private scene: THREE.Scene;
  private player: Player;
  private level: Level;
  private timeRewind: TimeRewind;
  private gameRenderer: GameRenderer;

  private keys: Set<string> = new Set();
  private gameState: GameState = {
    isPlaying: true,
    isPaused: false,
    isWon: false,
    time: 0,
    stars: 0
  };

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private targetFPS: number = 60;
  private frameTime: number = 1 / 60;
  private accumulator: number = 0;

  constructor(
    scene: THREE.Scene,
    player: Player,
    level: Level,
    timeRewind: TimeRewind,
    gameRenderer: GameRenderer
  ) {
    this.scene = scene;
    this.player = player;
    this.level = level;
    this.timeRewind = timeRewind;
    this.gameRenderer = gameRenderer;

    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      if (e.code === 'KeyR' && !e.repeat) {
        if (!this.timeRewind.getIsRewinding()) {
          this.timeRewind.startRewind();
        }
      }

      if (e.code === 'Space' && !e.repeat) {
        if (!this.timeRewind.getIsRewinding()) {
          this.player.jump();
        }
        e.preventDefault();
      }

      if (e.code === 'KeyR' && e.repeat) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  public start(): void {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private loop(currentTime: number): void {
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const clampedDelta = Math.min(deltaTime, 0.1);

    this.accumulator += clampedDelta;

    while (this.accumulator >= this.frameTime) {
      this.update(this.frameTime);
      this.accumulator -= this.frameTime;
    }

    this.gameRenderer.updateUIPositions();
  }

  private update(dt: number): void {
    if (this.gameState.isPaused || this.gameState.isWon) {
      return;
    }

    const isRewinding = this.timeRewind.getIsRewinding();

    if (!isRewinding) {
      this.gameState.time += dt;
      this.handleInput(dt);
      this.updatePlayerPhysics(dt);
      this.checkCollisions();
      this.updateLevel(dt);
      this.checkGoal();
    }

    this.timeRewind.update(dt, this.player, this.level, this.scene);
    this.player.updateDustParticles(dt, this.scene);

    this.gameRenderer.updateTint(this.timeRewind.getTintProgress());
    this.gameRenderer.updateRewindUI(
      this.timeRewind.getRewindUses(),
      this.timeRewind.getMaxRewindUses()
    );
    this.gameRenderer.updateTimerUI(this.gameState.time);
    this.gameRenderer.updateStarsUI(this.gameState.stars);
    this.gameRenderer.updatePositionUI(this.player.x, this.player.y);
  }

  private handleInput(dt: number): void {
    let moveX = 0;

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      moveX -= 1;
      this.player.facingRight = false;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      moveX += 1;
      this.player.facingRight = true;
    }

    this.player.vx = moveX * this.player.moveSpeed;
  }

  private updatePlayerPhysics(dt: number): void {
    this.player.vy -= this.player.gravity * dt;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    this.player.updateMesh();
  }

  private checkCollisions(): void {
    const playerAABB = this.player.getAABB();
    const activePlatforms = this.level.getActivePlatforms();

    let isOnPlatform = false;
    let standingPlatformId = -1;

    for (const platform of activePlatforms) {
      const platformAABB = platform.getAABB();

      if (!Player.aabbOverlap(playerAABB, platformAABB)) {
        continue;
      }

      const overlapLeft = playerAABB.maxX - platformAABB.minX;
      const overlapRight = platformAABB.maxX - playerAABB.minX;
      const overlapBottom = playerAABB.maxY - platformAABB.minY;
      const overlapTop = platformAABB.maxY - playerAABB.minY;

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapBottom, overlapTop);

      if (minOverlapY < minOverlapX) {
        if (overlapBottom < overlapTop && this.player.vy <= 0) {
          this.player.y = platformAABB.minY + this.player.height / 2;
          this.player.vy = 0;
          this.player.isGrounded = true;
          isOnPlatform = true;
          standingPlatformId = platform.id;

          if (platform.type === PlatformType.MOVING) {
            if (platform.moveAxis === 'x') {
              this.player.x += platform.moveSpeed * platform.moveDirection * (1 / 60);
            } else {
              this.player.y += platform.moveSpeed * platform.moveDirection * (1 / 60);
            }
          }
        } else if (overlapTop < overlapBottom && this.player.vy > 0) {
          this.player.y = platformAABB.maxY - this.player.height / 2;
          this.player.vy = 0;
        }
      } else {
        if (overlapLeft < overlapRight) {
          this.player.x = platformAABB.minX - this.player.width / 2;
        } else {
          this.player.x = platformAABB.maxX + this.player.width / 2;
        }
        this.player.vx = 0;
      }

      this.player.updateMesh();
    }

    if (!isOnPlatform) {
      if (this.player.isGrounded && this.player.vy < 0) {
        this.player.isGrounded = false;
      }
    }

    this.checkLevelBounds();

    for (const platform of this.level.platforms) {
      const playerOnPlatform = platform.id === standingPlatformId;
      platform.update(0, playerOnPlatform);
    }
  }

  private checkLevelBounds(): void {
    const bounds = this.level.bounds;
    const halfWidth = this.player.width / 2;
    const halfHeight = this.player.height / 2;

    if (this.player.x - halfWidth < bounds.minX) {
      this.player.x = bounds.minX + halfWidth;
      this.player.vx = 0;
    }
    if (this.player.x + halfWidth > bounds.maxX) {
      this.player.x = bounds.maxX - halfWidth;
      this.player.vx = 0;
    }

    if (this.player.y - halfHeight < bounds.minY) {
      this.player.y = bounds.minY + halfHeight;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.spawnDustParticles(false);
    }

    if (this.player.y + halfHeight > bounds.maxY) {
      this.player.y = bounds.maxY - halfHeight;
      this.player.vy = 0;
    }

    this.player.updateMesh();
  }

  private updateLevel(dt: number): void {
    const playerAABB = this.player.getAABB();
    const activePlatforms = this.level.getActivePlatforms();

    for (const platform of this.level.platforms) {
      let playerOnPlatform = false;

      if (platform.active && platform.visible) {
        const platformAABB = platform.getAABB();

        const feetY = playerAABB.minY;
        const platformTop = platformAABB.maxY;

        if (
          this.player.isGrounded &&
          feetY >= platformTop - 2 &&
          feetY <= platformTop + 2 &&
          playerAABB.maxX > platformAABB.minX &&
          playerAABB.minX < platformAABB.maxX
        ) {
          playerOnPlatform = true;
        }
      }

      platform.update(dt, playerOnPlatform);
    }
  }

  private checkGoal(): void {
    if (this.level.checkGoal(this.player.x, this.player.y)) {
      this.gameState.isWon = true;
      this.calculateStars();
    }
  }

  private calculateStars(): void {
    const time = this.gameState.time;
    let stars = 1;

    if (time < 30) {
      stars = 3;
    } else if (time < 60) {
      stars = 2;
    }

    this.gameState.stars = stars;
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public resetGame(): void {
    this.player.x = 0;
    this.player.y = -150;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = false;
    this.player.facingRight = true;
    this.player.updateMesh();
    this.player.clearAfterimages(this.scene);
    this.player.clearDustParticles(this.scene);

    this.level.platforms.forEach(p => {
      if (p.type === PlatformType.DISAPPEARING) {
        p.respawn();
      }
      if (p.type === PlatformType.TRIGGER) {
        p.resetTrigger();
      }
    });

    this.timeRewind.reset();

    this.gameState = {
      isPlaying: true,
      isPaused: false,
      isWon: false,
      time: 0,
      stars: 0
    };
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('keydown', () => {});
    window.removeEventListener('keyup', () => {});
  }
}
