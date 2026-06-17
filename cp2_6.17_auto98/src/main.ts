import { GameLoop } from './gameLoop';
import { Player, Bullet, Particle } from './player';
import { AIBehaviorTree } from './aiModule';
import { checkBulletShipCollision } from './collision';
import { Renderer, MenuButton } from './renderer';

const CANVAS_W = 900;
const CANVAS_H = 600;
const WIN_SCORE = 50;
const HIT_SCORE = 10;

enum GameState {
  MENU,
  DIFFICULTY_SELECT,
  COUNTDOWN,
  PLAYING,
  GAME_OVER,
}

class Game {
  private state = GameState.MENU;
  private renderer: Renderer;
  private gameLoop: GameLoop;
  private players: Player[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private ai: AIBehaviorTree | null = null;
  private isTwoPlayer = false;
  private difficulty: 'easy' | 'hard' = 'easy';
  private countdownTimer = 0;
  private gameOverTimer = 0;
  private winnerName = '';
  private menuTime = 0;
  private modalStartTime = 0;
  private currentButtons: MenuButton[] = [];
  private hoveredButton = -1;
  private keys = new Set<string>();
  private canvas: HTMLCanvasElement;
  private p1Name = '玩家1';
  private p2Name = 'AI';

  constructor() {
    const container = document.getElementById('game')!;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.canvas.style.cursor = 'pointer';
    container.appendChild(this.canvas);

    this.renderer = new Renderer(this.canvas);
    this.gameLoop = new GameLoop();

    this.setupInput();
    this.gameLoop.start((dt) => this.update(dt), (fps) => this.render(fps));
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Numpad1'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      this.hoveredButton = -1;
      for (let i = 0; i < this.currentButtons.length; i++) {
        const b = this.currentButtons[i];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          this.hoveredButton = i;
          break;
        }
      }
    });
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      for (let i = 0; i < this.currentButtons.length; i++) {
        const b = this.currentButtons[i];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          this.handleButtonClick(i);
          break;
        }
      }
    });
  }

  private handleButtonClick(index: number): void {
    if (this.state === GameState.MENU) {
      if (index === 0) {
        this.state = GameState.DIFFICULTY_SELECT;
        this.modalStartTime = this.menuTime;
      } else if (index === 1) {
        this.isTwoPlayer = true;
        this.p2Name = '玩家2';
        this.startCountdown();
      } else if (index === 2) {
        window.close();
      }
    } else if (this.state === GameState.DIFFICULTY_SELECT) {
      if (index === 0) {
        this.difficulty = 'easy';
        this.isTwoPlayer = false;
        this.p2Name = 'AI';
        this.startCountdown();
      } else if (index === 1) {
        this.difficulty = 'hard';
        this.isTwoPlayer = false;
        this.p2Name = 'AI';
        this.startCountdown();
      }
    } else if (this.state === GameState.GAME_OVER) {
      if (index === 0) {
        this.state = GameState.MENU;
        this.bullets = [];
        this.particles = [];
        this.players = [];
        this.ai = null;
      }
    }
  }

  private startCountdown(): void {
    this.state = GameState.COUNTDOWN;
    this.countdownTimer = 3;
    this.bullets = [];
    this.particles = [];
    this.initPlayers();
  }

  private initPlayers(): void {
    this.players = [
      new Player(CANVAS_W / 2, CANVAS_H - 80, '#00e5ff', 0, -Math.PI / 2),
      new Player(CANVAS_W / 2, 80, '#ff4444', 1, Math.PI / 2),
    ];
    if (!this.isTwoPlayer) {
      this.ai = new AIBehaviorTree(this.difficulty);
    }
  }

  private update(dt: number): void {
    this.menuTime += dt;
    this.renderer.updateStars(dt);

    switch (this.state) {
      case GameState.COUNTDOWN:
        this.updateCountdown(dt);
        break;
      case GameState.PLAYING:
        this.updatePlaying(dt);
        break;
      case GameState.GAME_OVER:
        this.gameOverTimer += dt;
        break;
    }
  }

  private updateCountdown(dt: number): void {
    this.countdownTimer -= dt;
    if (this.countdownTimer <= 0) {
      this.state = GameState.PLAYING;
    }
  }

  private updatePlaying(dt: number): void {
    if (this.players.length < 2) return;

    const p1 = this.players[0];
    const p2 = this.players[1];

    p1.faceToward(p2.x, p2.y);
    p2.faceToward(p1.x, p1.y);

    this.handlePlayer1Input(p1);
    if (this.isTwoPlayer) {
      this.handlePlayer2Input(p2);
    } else if (this.ai) {
      const shouldShoot = this.ai.update(p2, p1, this.bullets, dt, performance.now());
      if (shouldShoot) {
        const bullet = p2.shoot(400);
        if (bullet) this.bullets.push(bullet);
      }
    }

    for (const p of this.players) {
      p.update(dt, CANVAS_W, CANVAS_H);
    }

    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
        b.active = false;
      }
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }

    this.checkCollisions();

    this.bullets = this.bullets.filter(b => b.active);
    this.particles = this.particles.filter(p => p.active);

    for (const p of this.players) {
      if (p.score >= WIN_SCORE) {
        this.state = GameState.GAME_OVER;
        this.gameOverTimer = 0;
        this.winnerName = p.id === 0 ? this.p1Name : this.p2Name;
        break;
      }
    }
  }

  private handlePlayer1Input(p1: Player): void {
    p1.vx = 0;
    p1.vy = 0;
    if (this.keys.has('KeyW')) p1.vy = -p1.speed;
    if (this.keys.has('KeyS')) p1.vy = p1.speed;
    if (this.keys.has('KeyA')) p1.vx = -p1.speed;
    if (this.keys.has('KeyD')) p1.vx = p1.speed;
    if (p1.vx !== 0 && p1.vy !== 0) {
      const factor = 1 / Math.sqrt(2);
      p1.vx *= factor;
      p1.vy *= factor;
    }
    if (this.keys.has('Space')) {
      const bullet = p1.shoot();
      if (bullet) this.bullets.push(bullet);
    }
  }

  private handlePlayer2Input(p2: Player): void {
    p2.vx = 0;
    p2.vy = 0;
    if (this.keys.has('ArrowUp')) p2.vy = -p2.speed;
    if (this.keys.has('ArrowDown')) p2.vy = p2.speed;
    if (this.keys.has('ArrowLeft')) p2.vx = -p2.speed;
    if (this.keys.has('ArrowRight')) p2.vx = p2.speed;
    if (p2.vx !== 0 && p2.vy !== 0) {
      const factor = 1 / Math.sqrt(2);
      p2.vx *= factor;
      p2.vy *= factor;
    }
    if (this.keys.has('Numpad1')) {
      const bullet = p2.shoot();
      if (bullet) this.bullets.push(bullet);
    }
  }

  private checkCollisions(): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const p of this.players) {
        if (p.id === b.ownerId) continue;
        if (checkBulletShipCollision(b.x, b.y, b.radius, p.x, p.y, p.width, p.height)) {
          b.active = false;
          const scorer = this.players[b.ownerId];
          scorer.score += HIT_SCORE;
          this.spawnExplosion(b.x, b.y);
          break;
        }
      }
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        color: '#ff5722',
        size: 3 + Math.random() * 3,
        active: true,
      });
    }
  }

  private render(fps: number): void {
    const c = this.renderer.getContext();

    switch (this.state) {
      case GameState.MENU:
        this.currentButtons = this.renderer.drawMenu(c, this.menuTime, this.hoveredButton);
        this.renderer.present();
        break;

      case GameState.DIFFICULTY_SELECT: {
        const animProgress = this.menuTime - this.modalStartTime;
        this.currentButtons = this.renderer.drawDifficultyModal(c, animProgress, this.hoveredButton);
        this.renderer.present();
        break;
      }

      case GameState.COUNTDOWN: {
        this.renderer.drawGame(
          this.players, this.bullets, this.particles,
          this.p1Name, this.p2Name, fps
        );
        const count = Math.ceil(this.countdownTimer);
        const progress = this.countdownTimer - Math.floor(this.countdownTimer);
        if (count > 0 && count <= 3) {
          this.renderer.drawCountdown(this.renderer.getContext(), count, 1 - progress);
        }
        this.renderer.present();
        break;
      }

      case GameState.PLAYING:
        this.renderer.drawGame(
          this.players, this.bullets, this.particles,
          this.p1Name, this.p2Name, fps
        );
        break;

      case GameState.GAME_OVER: {
        this.renderer.drawGame(
          this.players, this.bullets, this.particles,
          this.p1Name, this.p2Name, fps
        );
        const overCtx = this.renderer.getContext();
        this.currentButtons = this.renderer.drawGameOver(
          overCtx,
          this.winnerName,
          this.players[0].score,
          this.players[1].score,
          this.p1Name,
          this.p2Name,
          this.gameOverTimer,
          this.hoveredButton
        );
        this.renderer.present();
        break;
      }
    }
  }
}

new Game();
