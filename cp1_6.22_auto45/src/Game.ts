import { Player } from './Player';
import { Terrain } from './Terrain';
import { ItemManager } from './Item';
import { HUD } from './HUD';

interface BgLayer {
  speed: number;
  color: string;
  objects: { x: number; y: number; width: number; height: number }[];
  spawnTimer: number;
  spawnInterval: number;
}

type GameState = 'start' | 'playing' | 'gameover';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private player: Player;
  private terrain: Terrain;
  private itemManager: ItemManager;
  private hud: HUD;

  private gameState: GameState = 'start';
  private scrollSpeed: number = 160;
  private totalDistance: number = 0;

  private lastTime: number = 0;
  private animationId: number = 0;

  private bgNear: BgLayer;
  private bgFar: BgLayer;

  private fixedTimeStep: number = 1 / 60;
  private accumulator: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    this.terrain = new Terrain(this.height);
    this.itemManager = new ItemManager();
    this.hud = new HUD();

    const playerX = this.width / 3 - 8;
    const groundY = this.height - 120;
    this.player = new Player(playerX, groundY - 16);

    this.bgNear = {
      speed: this.scrollSpeed * 0.3,
      color: '#5a3d2b',
      objects: [],
      spawnTimer: 0,
      spawnInterval: 2
    };

    this.bgFar = {
      speed: this.scrollSpeed * 0.15,
      color: '#4a5568',
      objects: [],
      spawnTimer: 0,
      spawnInterval: 3
    };

    this.initBackground();
    this.bindEvents();
  }

  private initBackground(): void {
    for (let i = 0; i < 5; i++) {
      this.bgFar.objects.push({
        x: i * 200 + Math.random() * 100,
        y: this.height - 200 - Math.random() * 50,
        width: 150 + Math.random() * 100,
        height: 120 + Math.random() * 60
      });
    }

    for (let i = 0; i < 6; i++) {
      this.bgNear.objects.push({
        x: i * 150 + Math.random() * 50,
        y: this.height - 150 - Math.random() * 30,
        width: 80 + Math.random() * 60,
        height: 60 + Math.random() * 40
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleInput();
      }
      if (e.code === 'KeyR') {
        e.preventDefault();
        this.handleRestart();
      }
    });

    this.canvas.addEventListener('click', () => {
      this.handleInput();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleInput();
    });
  }

  private handleInput(): void {
    if (this.gameState === 'start') {
      this.startGame();
    } else if (this.gameState === 'playing') {
      this.player.jump();
    } else if (this.gameState === 'gameover' && this.hud.canRestart()) {
      this.restartGame();
    }
  }

  private handleRestart(): void {
    if (this.gameState === 'gameover' && this.hud.canRestart()) {
      this.restartGame();
    }
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.hud.setGameStarted(true);
  }

  private restartGame(): void {
    this.terrain.reset();
    this.itemManager.reset();
    this.hud.reset();

    const groundY = this.height - 120;
    this.player = new Player(this.width / 3 - 8, groundY - 16);

    this.totalDistance = 0;
    this.gameState = 'playing';
    this.hud.setGameStarted(true);

    this.bgFar.objects = [];
    this.bgNear.objects = [];
    this.initBackground();
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.hud.setGameOver(true);
  }

  private updateBackground(deltaTime: number): void {
    for (const obj of this.bgFar.objects) {
      obj.x -= this.bgFar.speed * deltaTime;
    }
    this.bgFar.objects = this.bgFar.objects.filter(o => o.x + o.width > -50);

    this.bgFar.spawnTimer += deltaTime;
    if (this.bgFar.spawnTimer >= this.bgFar.spawnInterval) {
      this.bgFar.spawnTimer = 0;
      this.bgFar.objects.push({
        x: this.width + 50,
        y: this.height - 200 - Math.random() * 50,
        width: 150 + Math.random() * 100,
        height: 120 + Math.random() * 60
      });
    }

    for (const obj of this.bgNear.objects) {
      obj.x -= this.bgNear.speed * deltaTime;
    }
    this.bgNear.objects = this.bgNear.objects.filter(o => o.x + o.width > -50);

    this.bgNear.spawnTimer += deltaTime;
    if (this.bgNear.spawnTimer >= this.bgNear.spawnInterval) {
      this.bgNear.spawnTimer = 0;
      this.bgNear.objects.push({
        x: this.width + 50,
        y: this.height - 150 - Math.random() * 30,
        width: 80 + Math.random() * 60,
        height: 60 + Math.random() * 40
      });
    }
  }

  private update(deltaTime: number): void {
    if (this.gameState !== 'playing') {
      this.hud.update(deltaTime);
      return;
    }

    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedTimeStep) {
      this.fixedUpdate(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
    }

    this.hud.update(deltaTime);
  }

  private fixedUpdate(dt: number): void {
    this.totalDistance += this.scrollSpeed * dt;
    this.hud.updateDistance(this.totalDistance);

    this.terrain.update(dt, this.scrollSpeed);

    const groundTiles = this.terrain.tiles.map(t => ({
      x: t.x,
      y: t.y,
      type: t.type,
      width: t.width
    }));
    this.itemManager.update(dt, this.scrollSpeed, groundTiles);

    this.updateBackground(dt);

    const groundCheck = this.terrain.isOnSolidGround(this.player.x, this.player.width);

    if (!groundCheck.onGround && this.player.y > this.height - 50) {
      this.player.isOnGround = false;
    }

    const playerBottom = this.player.y + this.player.height;

    if (groundCheck.onGround) {
      if (playerBottom >= groundCheck.groundY) {
        if (!this.player.isOnGround && this.player.velocityY > 0) {
          this.player.spawnDustParticles(groundCheck.groundY);
        }
        this.player.y = groundCheck.groundY - this.player.height;
        this.player.velocityY = 0;
        this.player.isOnGround = true;
        this.player.isJumping = false;
      } else {
        this.player.isOnGround = false;
      }
    } else {
      this.player.isOnGround = false;
    }

    if (!this.player.isOnGround) {
      this.player.velocityY += this.player.gravity * dt;
      this.player.y += this.player.velocityY * dt;
    }

    if (this.player.y > this.height + 50) {
      this.gameOver();
      return;
    }

    if (groundCheck.onGround) {
      const playerCenterX = this.player.x + this.player.width / 2;
      const tileBelow = this.terrain.tiles.find(t =>
        playerCenterX >= t.x && playerCenterX < t.x + t.width
      );
      if (tileBelow && tileBelow.type === 'pit') {
        this.player.isOnGround = false;
      }
    }

    this.player.animTimer += dt;
    if (this.player.animTimer >= this.player.animFrameDuration) {
      this.player.animTimer = 0;
      this.player.animFrame = (this.player.animFrame + 1) % 2;
    }

    for (let i = this.player.particles.length - 1; i >= 0; i--) {
      const p = this.player.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.player.particles.splice(i, 1);
      }
    }

    const playerBounds = this.player.getBounds();
    if (this.itemManager.checkStarCollision(playerBounds)) {
      this.hud.addScore(10);
    }

    if (this.itemManager.checkSpikeCollision(playerBounds)) {
      this.gameOver();
      return;
    }

    const leftGround = this.terrain.isOnSolidGround(this.player.x + 2, 2);
    const rightGround = this.terrain.isOnSolidGround(this.player.x + this.player.width - 2, 2);

    if (!leftGround.onGround || !rightGround.onGround) {
      if (this.player.y + this.player.height >= this.height - 100) {
        if (this.player.velocityY >= 0) {
        }
      }
    }
  }

  private renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a202c');
    gradient.addColorStop(1, '#2d3748');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#4a5568';
    for (const obj of this.bgFar.objects) {
      const x = Math.floor(obj.x);
      const y = Math.floor(obj.y);
      const w = Math.floor(obj.width);
      const h = Math.floor(obj.height);

      this.ctx.beginPath();
      this.ctx.moveTo(x, y + h);
      this.ctx.lineTo(x + w * 0.3, y + h * 0.3);
      this.ctx.lineTo(x + w * 0.5, y);
      this.ctx.lineTo(x + w * 0.7, y + h * 0.4);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#5a3d2b';
    for (const obj of this.bgNear.objects) {
      const x = Math.floor(obj.x);
      const y = Math.floor(obj.y);
      const w = Math.floor(obj.width);
      const h = Math.floor(obj.height);

      this.ctx.beginPath();
      this.ctx.moveTo(x, y + h);
      this.ctx.lineTo(x + w * 0.25, y + h * 0.5);
      this.ctx.lineTo(x + w * 0.5, y);
      this.ctx.lineTo(x + w * 0.75, y + h * 0.6);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#6b4a35';
      this.ctx.fillRect(x + w * 0.3, y + h * 0.2, 4, h * 0.3);
      this.ctx.fillRect(x + w * 0.6, y + h * 0.3, 3, h * 0.25);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.renderBackground();

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, this.height - 20, this.width, 20);

    this.terrain.render(this.ctx);

    this.itemManager.render(this.ctx);

    this.player.render(this.ctx);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, this.height - 10, this.width, 10);

    this.hud.render(this.ctx, this.width, this.height);
  }

  private gameLoop(currentTime: number): void {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (deltaTime > 0.1) {
      deltaTime = 0.1;
    }

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  start(): void {
    this.lastTime = 0;
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
