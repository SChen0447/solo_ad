import { MazeGenerator } from './MazeGenerator';
import { PlayerController } from './PlayerController';
import { CollisionSystem } from './CollisionSystem';
import { Renderer, RenderState } from './Renderer';
import { Fragment } from './Fragment';
import { Particle, Position, CONFIG } from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private mazeGenerator: MazeGenerator;
  private playerController: PlayerController;
  private collisionSystem: CollisionSystem;
  private renderer: Renderer;

  private fragments: Fragment[] = [];
  private particles: Particle[] = [];

  private level: number = 1;
  private collectedCount: number = 0;
  private elapsedTime: number = 0;
  private fps: number = 60;
  private resetAnimation: number = 0;
  private exitOpen: boolean = false;
  private buttonHovered: boolean = false;

  private cellSize: number = CONFIG.CELL_SIZE;
  private mazeOffsetX: number = 0;
  private mazeOffsetY: number = 0;
  private mazeWidth: number = 0;
  private mazeHeight: number = 0;

  private lastTime: number = 0;
  private fpsTimer: number = 0;
  private fpsFrameCount: number = 0;
  private animationFrameId: number = 0;

  private keys: Set<string> = new Set();
  private prevPosition: Position = { x: 0, y: 0 };

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;

    this.mazeGenerator = new MazeGenerator();
    this.playerController = new PlayerController(0, 0);
    this.collisionSystem = new CollisionSystem();
    this.renderer = new Renderer(canvas);

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.generateLevel();
    this.setupEventListeners();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private resizeCanvas(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);

    const mazeSize = CONFIG.MAZE_SIZE;
    const maxMazeWidth = width * 0.7;
    const maxMazeHeight = height * 0.6;
    this.cellSize = Math.floor(Math.min(maxMazeWidth / mazeSize, maxMazeHeight / mazeSize));

    this.mazeWidth = this.cellSize * mazeSize;
    this.mazeHeight = this.cellSize * mazeSize;
    this.mazeOffsetX = (width - this.mazeWidth) / 2;
    this.mazeOffsetY = (height - this.mazeHeight) / 2;
  }

  private generateLevel(): void {
    this.mazeGenerator.generate();
    const startPos = this.mazeGenerator.getStartPosition();

    const playerX = this.mazeOffsetX + startPos.x * this.cellSize + this.cellSize / 2;
    const playerY = this.mazeOffsetY + startPos.y * this.cellSize + this.cellSize / 2;
    this.playerController.setPosition(playerX, playerY);
    this.prevPosition = { x: playerX, y: playerY };

    const fragmentPositions = this.mazeGenerator.getRandomFragmentPositions(CONFIG.TOTAL_FRAGMENTS);

    this.fragments = [];
    fragmentPositions.forEach((pos, index) => {
      this.fragments.push(new Fragment(index, pos.x, pos.y));
    });

    this.particles = [];
    this.collectedCount = 0;
    this.elapsedTime = 0;
    this.exitOpen = false;
  }

  private resetGame(): void {
    this.resetAnimation = 0.1;
    this.level = 1;
    this.generateLevel();
  }

  private nextLevel(): void {
    this.level++;
    this.generateLevel();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      this.updatePlayerDirection();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.updatePlayerDirection();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.buttonHovered = this.renderer.isPointInButton(x, y, this.canvas.width, this.canvas.height);
      this.canvas.style.cursor = this.buttonHovered ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.renderer.isPointInButton(x, y, this.canvas.width, this.canvas.height)) {
        this.resetGame();
      }
    });
  }

  private updatePlayerDirection(): void {
    this.playerController.setDirection({
      up: this.keys.has('w') || this.keys.has('arrowup'),
      down: this.keys.has('s') || this.keys.has('arrowdown'),
      left: this.keys.has('a') || this.keys.has('arrowleft'),
      right: this.keys.has('d') || this.keys.has('arrowright'),
    });
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.fpsTimer += deltaTime;
    this.fpsFrameCount++;
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsFrameCount / this.fpsTimer;
      this.fpsTimer = 0;
      this.fpsFrameCount = 0;
    }

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    if (this.resetAnimation > 0) {
      this.resetAnimation -= deltaTime;
      if (this.resetAnimation < 0) this.resetAnimation = 0;
    }

    const isMoving = this.playerController.isMoving();
    this.prevPosition = { ...this.playerController.getPosition() };
    this.playerController.update(deltaTime, isMoving);

    const currentPos = this.playerController.getPosition();
    const grid = this.mazeGenerator.getGrid();

    const resolution = this.collisionSystem.resolveWallCollision(
      currentPos,
      this.prevPosition,
      grid,
      this.cellSize,
      this.mazeOffsetX,
      this.mazeOffsetY
    );

    if (resolution.stopX) this.playerController.stopX();
    if (resolution.stopY) this.playerController.stopY();
    this.playerController.adjustPosition(
      resolution.x - currentPos.x,
      resolution.y - currentPos.y
    );

    const collisionResult = this.collisionSystem.checkCollision(
      this.playerController.getPosition(),
      grid,
      this.fragments,
      this.cellSize,
      this.mazeOffsetX,
      this.mazeOffsetY
    );

    if (collisionResult.collectedFragment) {
      const fragment = this.fragments.find(f => f.getState().id === collisionResult.collectedFragment!.id);
      if (fragment && !fragment.isCollected() && !fragment.isDisappearing()) {
        fragment.collect();
        this.collectedCount++;
        this.renderer.playCollectSound();

        if (this.collectedCount >= CONFIG.TOTAL_FRAGMENTS) {
          this.exitOpen = true;
        }
      }
    }

    for (const fragment of this.fragments) {
      const newParticle = fragment.update(deltaTime, this.cellSize, this.mazeOffsetX, this.mazeOffsetY);
      if (newParticle && this.particles.length < CONFIG.PARTICLE_MAX_COUNT) {
        this.particles.push(newParticle);
      }
    }

    this.updateParticles(deltaTime);

    if (this.exitOpen) {
      this.checkExitReached();
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private checkExitReached(): void {
    const endPos = this.mazeGenerator.getEndPosition();
    const playerPos = this.playerController.getPosition();
    const exitX = this.mazeOffsetX + endPos.x * this.cellSize + this.cellSize / 2;
    const exitY = this.mazeOffsetY + endPos.y * this.cellSize + this.cellSize / 2;

    const dx = playerPos.x - exitX;
    const dy = playerPos.y - exitY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.cellSize / 2) {
      this.nextLevel();
    }
  }

  private render(): void {
    const playerPos = this.playerController.getPosition();
    const grid = this.mazeGenerator.getGrid();

    const renderState: RenderState = {
      grid,
      playerX: playerPos.x,
      playerY: playerPos.y,
      fragments: this.fragments,
      particles: this.particles,
      level: this.level,
      collectedCount: this.collectedCount,
      totalFragments: CONFIG.TOTAL_FRAGMENTS,
      elapsedTime: this.elapsedTime,
      fps: this.fps,
      resetAnimation: this.resetAnimation,
      exitOpen: this.exitOpen,
      cellSize: this.cellSize,
      mazeOffsetX: this.mazeOffsetX,
      mazeOffsetY: this.mazeOffsetY,
      mazeWidth: this.mazeWidth,
      mazeHeight: this.mazeHeight,
      buttonHovered: this.buttonHovered,
    };

    this.renderer.render(renderState);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

new Game();
