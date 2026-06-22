import { TerrainGenerator, Platform, Obstacle } from './TerrainGenerator';

export interface CharacterAttributes {
  speed: number;
  jump: number;
  stamina: number;
}

export interface GameState {
  score: number;
  isGameOver: boolean;
  scrollSpeed: number;
  isRunning: boolean;
}

interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isOnGround: boolean;
  currentPlatformId: number | null;
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private terrainGenerator: TerrainGenerator;
  private platforms: Platform[] = [];
  private obstacles: Obstacle[] = [];
  private player: PlayerState;
  private attributes: CharacterAttributes;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  private readonly gameWidth: number = 320;
  private readonly gameHeight: number = 480;
  private readonly baseScrollSpeed: number = 2;
  private readonly maxScrollSpeed: number = 6;
  private readonly gravity: number = 0.6;
  private readonly jumpVelocity: number = -10;
  private readonly collisionTolerance: number = 2;

  private score: number = 0;
  private obstaclesPassed: number = 0;
  private isGameOver: boolean = false;
  private scrollSpeed: number = 2;
  private isRunning: boolean = false;
  private keys: Set<string> = new Set();

  private onStateChange: ((state: GameState) => void) | null = null;
  private onGameOver: ((finalScore: number) => void) | null = null;

  private characterAppearance: {
    body: number;
    hair: number;
    top: number;
    bottom: number;
    shoes: number;
  } = { body: 0, hair: 0, top: 0, bottom: 0, shoes: 0 };

  private readonly bodyColors: string[] = ['#ffcc99', '#d4a373', '#8d5524', '#6f4e37'];
  private readonly hairColors: string[] = ['#000000', '#8b4513', '#ffd700', '#ff0000', '#00ffff'];
  private readonly topColors: string[] = ['#0066cc', '#ff3366', '#33cc33', '#ff9900', '#9900ff'];
  private readonly bottomColors: string[] = ['#333366', '#006666', '#660033', '#336600'];
  private readonly shoeColors: string[] = ['#ffffff', '#000000', '#ff0000', '#00ffff'];

  constructor(canvas: HTMLCanvasElement, attributes: CharacterAttributes) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.terrainGenerator = new TerrainGenerator();
    this.attributes = attributes;

    this.player = {
      x: 60,
      y: 340,
      width: 24,
      height: 36,
      velocityY: 0,
      isOnGround: false,
      currentPlatformId: null,
    };

    this.setupInput();
  }

  public setAppearance(appearance: { body: number; hair: number; top: number; bottom: number; shoes: number }): void {
    this.characterAppearance = appearance;
  }

  public setAttributes(attributes: CharacterAttributes): void {
    this.attributes = attributes;
    this.scrollSpeed = this.baseScrollSpeed + (attributes.speed - 33) * 0.02;
  }

  public setCallbacks(
    onStateChange: (state: GameState) => void,
    onGameOver: (finalScore: number) => void
  ): void {
    this.onStateChange = onStateChange;
    this.onGameOver = onGameOver;
  }

  private setupInput(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if ((e.code === 'Space' || e.code === 'ArrowUp') && this.isRunning && this.player.isOnGround) {
      const jumpMultiplier = 0.7 + (this.attributes.jump / 100) * 0.8;
      this.player.velocityY = this.jumpVelocity * jumpMultiplier;
      this.player.isOnGround = false;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  public start(): void {
    if (this.isRunning) return;

    const terrain = this.terrainGenerator.generateInitialTerrain();
    this.platforms = terrain.platforms;
    this.obstacles = terrain.obstacles;

    this.score = 0;
    this.obstaclesPassed = 0;
    this.isGameOver = false;
    this.scrollSpeed = this.baseScrollSpeed + (this.attributes.speed - 33) * 0.02;
    this.isRunning = true;

    const firstPlatform = this.platforms[0];
    this.player = {
      x: 60,
      y: firstPlatform.y - this.player.height,
      width: 24,
      height: 36,
      velocityY: 0,
      isOnGround: true,
      currentPlatformId: firstPlatform.id,
    };

    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 16.667;
    this.lastTime = now;

    this.update(delta);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(delta: number): void {
    if (this.isGameOver) return;

    const effectiveDelta = Math.min(delta, 2);

    this.player.velocityY += this.gravity * effectiveDelta;
    this.player.y += this.player.velocityY * effectiveDelta;

    let currentSpeed = this.scrollSpeed + (this.attributes.speed - 33) * 0.015;
    currentSpeed = Math.min(currentSpeed, this.maxScrollSpeed);

    for (const platform of this.platforms) {
      platform.x -= currentSpeed * effectiveDelta;
    }
    for (const obstacle of this.obstacles) {
      obstacle.x -= currentSpeed * effectiveDelta;
    }

    this.cleanupOffscreen();
    this.generateNewTerrain();
    this.checkPlatformCollisions();
    this.checkObstacleCollisions();
    this.checkFalling();
    this.checkPassedObstacles();
  }

  private cleanupOffscreen(): void {
    this.platforms = this.platforms.filter((p) => p.x + p.width > -50);
    this.obstacles = this.obstacles.filter((o) => o.x + o.width > -50);
  }

  private generateNewTerrain(): void {
    if (this.platforms.length === 0) return;

    const rightmost = this.platforms.reduce(
      (max, p) => (p.x + p.width > max.x + max.width ? p : max),
      this.platforms[0]
    );

    while (rightmost.x + rightmost.width < this.gameWidth + 400) {
      const gap = 60 + Math.random() * 40;
      const { platform, obstacle } = this.terrainGenerator.generateNextPlatform(
        rightmost.x + rightmost.width + gap
      );
      this.platforms.push(platform);
      if (obstacle) this.obstacles.push(obstacle);

      Object.assign(rightmost, platform);
    }
  }

  private checkPlatformCollisions(): void {
    this.player.isOnGround = false;
    this.player.currentPlatformId = null;

    for (const platform of this.platforms) {
      const playerBottom = this.player.y + this.player.height;
      const playerLeft = this.player.x + this.collisionTolerance;
      const playerRight = this.player.x + this.player.width - this.collisionTolerance;

      const platformTop = platform.y;
      const platformLeft = platform.x;
      const platformRight = platform.x + platform.width;

      const horizontalOverlap = playerRight > platformLeft && playerLeft < platformRight;
      const verticalLanding =
        playerBottom >= platformTop &&
        playerBottom <= platformTop + 20 &&
        this.player.velocityY >= 0;

      if (horizontalOverlap && verticalLanding) {
        this.player.y = platformTop - this.player.height;
        this.player.velocityY = 0;
        this.player.isOnGround = true;
        this.player.currentPlatformId = platform.id;
        break;
      }
    }
  }

  private checkObstacleCollisions(): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.passed) continue;

      const playerLeft = this.player.x + this.collisionTolerance;
      const playerRight = this.player.x + this.player.width - this.collisionTolerance;
      const playerTop = this.player.y + this.collisionTolerance;
      const playerBottom = this.player.y + this.player.height - this.collisionTolerance;

      const obsLeft = obstacle.x;
      const obsRight = obstacle.x + obstacle.width;
      const obsTop = obstacle.y;
      const obsBottom = obstacle.y + obstacle.height;

      if (
        playerRight > obsLeft &&
        playerLeft < obsRight &&
        playerBottom > obsTop &&
        playerTop < obsBottom
      ) {
        this.gameOver();
        return;
      }
    }
  }

  private checkFalling(): void {
    if (this.player.y > this.gameHeight + 50) {
      this.resetToSafePlatform();
      this.score = Math.max(0, this.score - 5);
      this.emitState();
    }
  }

  private resetToSafePlatform(): void {
    const safePlatforms = this.platforms.filter(
      (p) => p.x + p.width > this.player.x - 100 && p.x < this.gameWidth
    );

    let targetPlatform: Platform | null = null;
    if (safePlatforms.length > 0) {
      targetPlatform = safePlatforms.reduce((closest, p) => {
        const pDist = Math.abs(p.x - this.player.x);
        const cDist = Math.abs(closest.x - this.player.x);
        return pDist < cDist ? p : closest;
      });
    } else if (this.platforms.length > 0) {
      targetPlatform = this.platforms[0];
    }

    if (targetPlatform) {
      this.player.x = Math.max(targetPlatform.x + 10, 30);
      this.player.y = targetPlatform.y - this.player.height;
      this.player.velocityY = 0;
      this.player.isOnGround = true;
      this.player.currentPlatformId = targetPlatform.id;
    }
  }

  private checkPassedObstacles(): void {
    for (const obstacle of this.obstacles) {
      if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
        obstacle.passed = true;
        this.score += 10;
        this.obstaclesPassed++;

        if (this.obstaclesPassed % 5 === 0) {
          this.scrollSpeed = Math.min(this.scrollSpeed + 0.5, this.maxScrollSpeed);
        }

        this.emitState();
      }
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.isRunning = false;
    this.emitState();
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        isGameOver: this.isGameOver,
        scrollSpeed: this.scrollSpeed,
        isRunning: this.isRunning,
      });
    }
  }

  public render(): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.gameHeight);
    gradient.addColorStop(0, '#0a0a23');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

    this.renderParticles();

    for (const platform of this.platforms) {
      this.renderPlatform(platform);
    }

    for (const obstacle of this.obstacles) {
      this.renderObstacle(obstacle);
    }

    this.renderPlayer();
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(136, 204, 255, 0.6)';
    const time = performance.now() * 0.0005;
    for (let i = 0; i < 15; i++) {
      const x = ((i * 37 + time * 200) % (this.gameWidth + 50)) - 25;
      const y = ((i * 53 + Math.sin(time + i) * 30) % this.gameHeight);
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
    }
  }

  private renderPlatform(platform: Platform): void {
    const ctx = this.ctx;

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(platform.x + 4, platform.y + 4, platform.width - 8, 2);
  }

  private renderObstacle(obstacle: Obstacle): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#ff4500';
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 6;

    if (obstacle.type === 'spike') {
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.fillStyle = '#cc3300';
      ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.width - 8, obstacle.height - 8);
    }
    ctx.shadowBlur = 0;
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    const w = this.player.width;
    const h = this.player.height;

    const bodyColor = this.bodyColors[this.characterAppearance.body % this.bodyColors.length];
    const hairColor = this.hairColors[this.characterAppearance.hair % this.hairColors.length];
    const topColor = this.topColors[this.characterAppearance.top % this.topColors.length];
    const bottomColor = this.bottomColors[this.characterAppearance.bottom % this.bottomColors.length];
    const shoeColor = this.shoeColors[this.characterAppearance.shoes % this.shoeColors.length];

    const headSize = 8;
    const headX = px + (w - headSize) / 2;
    const headY = py;

    ctx.fillStyle = hairColor;
    ctx.fillRect(headX, headY, headSize, 3);
    ctx.fillRect(headX - 1, headY + 1, 1, 3);
    ctx.fillRect(headX + headSize, headY + 1, 1, 3);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(headX, headY + 3, headSize, headSize - 3);

    ctx.fillStyle = '#000000';
    ctx.fillRect(headX + 2, headY + 5, 1, 1);
    ctx.fillRect(headX + 5, headY + 5, 1, 1);

    const bodyY = py + headSize;
    const bodyHeight = 14;
    ctx.fillStyle = topColor;
    ctx.fillRect(px + 3, bodyY, w - 6, bodyHeight);

    ctx.fillRect(px, bodyY + 2, 3, 8);
    ctx.fillRect(px + w - 3, bodyY + 2, 3, 8);

    const legY = bodyY + bodyHeight;
    const legHeight = h - legY - 4;
    ctx.fillStyle = bottomColor;
    ctx.fillRect(px + 4, legY, 6, legHeight);
    ctx.fillRect(px + w - 10, legY, 6, legHeight);

    ctx.fillStyle = shoeColor;
    ctx.fillRect(px + 3, h - 4, 8, 4);
    ctx.fillRect(px + w - 11, h - 4, 8, 4);
  }
}
