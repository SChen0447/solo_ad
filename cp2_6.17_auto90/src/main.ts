import { GameLoop } from './gameLoop';
import { Player } from './player';
import { AIModule } from './aiModule';
import { CollisionDetector } from './collision';
import { Renderer } from './renderer';
import { MenuSystem } from './menu';
import { 
  InputState, Bullet, Particle, GameState, Difficulty,
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE, WIN_SCORE, HIT_SCORE
} from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameLoop: GameLoop;
  private renderer: Renderer;
  private menuSystem: MenuSystem;
  
  private players: Player[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  
  private inputStateP1: InputState = { up: false, down: false, left: false, right: false, shoot: false };
  private inputStateP2: InputState = { up: false, down: false, left: false, right: false, shoot: false };
  
  private aiModule: AIModule | null = null;
  private isDualMode: boolean = false;
  
  private state: GameState = {
    mode: 'menu',
    difficulty: 'easy',
    countdown: 3,
    winner: null,
    finalScore: [0, 0]
  };
  
  private countdownTimer: number = 0;
  private countdownAnimStart: number = 0;
  
  constructor() {
    const container = document.getElementById('game')!;
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.gameLoop = new GameLoop(this.ctx);
    this.renderer = new Renderer(this.canvas);
    this.menuSystem = new MenuSystem(container, this.canvas);
    
    this.setupMenuCallbacks();
    this.setupKeyboardListeners();
    this.setupGameLoop();
    
    this.menuSystem.showMainMenu();
    this.gameLoop.start();
  }
  
  private setupMenuCallbacks(): void {
    this.menuSystem.setCallbacks({
      onStartSingle: (difficulty: Difficulty) => {
        this.startSinglePlayer(difficulty);
      },
      onStartDual: () => {
        this.startDualPlayer();
      },
      onReturnToMenu: () => {
        this.returnToMenu();
      },
      onExit: () => {
        this.exitGame();
      }
    });
  }
  
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.handleKeyDown(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Digit1'].includes(e.code)) {
        e.preventDefault();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.code);
    });
  }
  
  private handleKeyDown(code: string): void {
    switch (code) {
      case 'KeyW': this.inputStateP1.up = true; break;
      case 'KeyS': this.inputStateP1.down = true; break;
      case 'KeyA': this.inputStateP1.left = true; break;
      case 'KeyD': this.inputStateP1.right = true; break;
      case 'Space': this.inputStateP1.shoot = true; break;
      
      case 'ArrowUp': this.inputStateP2.up = true; break;
      case 'ArrowDown': this.inputStateP2.down = true; break;
      case 'ArrowLeft': this.inputStateP2.left = true; break;
      case 'ArrowRight': this.inputStateP2.right = true; break;
      case 'Digit1': this.inputStateP2.shoot = true; break;
    }
  }
  
  private handleKeyUp(code: string): void {
    switch (code) {
      case 'KeyW': this.inputStateP1.up = false; break;
      case 'KeyS': this.inputStateP1.down = false; break;
      case 'KeyA': this.inputStateP1.left = false; break;
      case 'KeyD': this.inputStateP1.right = false; break;
      case 'Space': this.inputStateP1.shoot = false; break;
      
      case 'ArrowUp': this.inputStateP2.up = false; break;
      case 'ArrowDown': this.inputStateP2.down = false; break;
      case 'ArrowLeft': this.inputStateP2.left = false; break;
      case 'ArrowRight': this.inputStateP2.right = false; break;
      case 'Digit1': this.inputStateP2.shoot = false; break;
    }
  }
  
  private setupGameLoop(): void {
    this.gameLoop.addUpdateCallback((deltaTime) => this.update(deltaTime));
    this.gameLoop.addRenderCallback(() => this.render());
  }
  
  private startSinglePlayer(difficulty: Difficulty): void {
    this.isDualMode = false;
    this.state.difficulty = difficulty;
    this.aiModule = new AIModule(difficulty);
    
    this.players = [
      new Player(0, 150, CANVAS_HEIGHT / 2, false),
      new Player(1, CANVAS_WIDTH - 150, CANVAS_HEIGHT / 2, true)
    ];
    
    this.startCountdown();
  }
  
  private startDualPlayer(): void {
    this.isDualMode = true;
    this.aiModule = null;
    
    this.players = [
      new Player(0, 150, CANVAS_HEIGHT / 2, false),
      new Player(1, CANVAS_WIDTH - 150, CANVAS_HEIGHT / 2, false)
    ];
    
    this.startCountdown();
  }
  
  private startCountdown(): void {
    this.state.mode = 'countdown';
    this.state.countdown = 3;
    this.countdownTimer = 0;
    this.countdownAnimStart = performance.now();
    this.bullets = [];
    this.particles = [];
    
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].reset(
        i === 0 ? 150 : CANVAS_WIDTH - 150,
        CANVAS_HEIGHT / 2
      );
    }
    
    this.menuSystem.hideAll();
  }
  
  private returnToMenu(): void {
    this.state.mode = 'menu';
    this.bullets = [];
    this.particles = [];
    this.players = [];
    this.aiModule = null;
    this.menuSystem.showMainMenu();
  }
  
  private exitGame(): void {
    this.gameLoop.stop();
    this.menuSystem.destroy();
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  
  private update(deltaTime: number): void {
    this.renderer.updateStars(deltaTime);
    
    if (this.state.mode === 'countdown') {
      this.updateCountdown(deltaTime);
      return;
    }
    
    if (this.state.mode !== 'playing') {
      return;
    }
    
    const currentTime = performance.now();
    
    this.updatePlayers(deltaTime, currentTime);
    this.updateBullets(deltaTime);
    this.updateParticles(deltaTime);
    this.checkCollisions();
    this.checkWinCondition();
  }
  
  private updateCountdown(deltaTime: number): void {
    this.countdownTimer += deltaTime;
    
    if (this.countdownTimer >= 1000) {
      this.countdownTimer = 0;
      this.state.countdown--;
      this.countdownAnimStart = performance.now();
      
      if (this.state.countdown < 0) {
        this.state.mode = 'playing';
      }
    }
  }
  
  private updatePlayers(deltaTime: number, currentTime: number): void {
    this.players[0].update(deltaTime, this.inputStateP1, currentTime);
    
    if (this.inputStateP1.shoot) {
      const bullet = this.players[0].shoot(currentTime);
      if (bullet) this.bullets.push(bullet);
    }
    
    if (this.isDualMode) {
      this.players[1].update(deltaTime, this.inputStateP2, currentTime);
      if (this.inputStateP2.shoot) {
        const bullet = this.players[1].shoot(currentTime);
        if (bullet) this.bullets.push(bullet);
      }
    } else if (this.aiModule) {
      const aiInput = this.aiModule.update(
        this.players[1],
        this.players[0],
        this.bullets,
        currentTime
      );
      this.players[1].update(deltaTime, aiInput.input, currentTime);
      if (aiInput.shouldShoot) {
        const bullet = this.players[1].shoot(currentTime);
        if (bullet) this.bullets.push(bullet);
      }
    }
  }
  
  private updateBullets(deltaTime: number): void {
    this.bullets = this.bullets.filter(bullet => 
      bullet.update(deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT)
    );
  }
  
  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter(particle => particle.update(deltaTime));
  }
  
  private checkCollisions(): void {
    this.bullets = CollisionDetector.detectBulletPlayerCollisions(
      this.bullets,
      this.players,
      (bullet, player, particles) => {
        this.particles.push(...particles);
        const shooter = this.players.find(p => p.id === bullet.ownerId);
        if (shooter) {
          shooter.addScore(HIT_SCORE);
        }
      }
    );
  }
  
  private checkWinCondition(): void {
    for (const player of this.players) {
      if (player.score >= WIN_SCORE) {
        this.state.mode = 'gameover';
        this.state.winner = player.id;
        this.state.finalScore = [this.players[0].score, this.players[1].score];
        
        this.menuSystem.showGameOver(
          player.name,
          this.players[0].score,
          this.players[1].score
        );
        break;
      }
    }
  }
  
  private render(): void {
    if (this.state.mode === 'menu') {
      this.renderMenuBackground();
      return;
    }
    
    const countdownAnimProgress = this.state.mode === 'countdown' 
      ? Math.min(1, (performance.now() - this.countdownAnimStart) / 500)
      : 0;
    
    this.renderer.render(
      this.state,
      this.players,
      this.bullets,
      this.particles,
      this.gameLoop.getFps(),
      countdownAnimProgress
    );
  }
  
  private renderMenuBackground(): void {
    this.renderer.updateStars(16.67);
    this.renderer.render(
      this.state,
      [],
      [],
      [],
      this.gameLoop.getFps()
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
