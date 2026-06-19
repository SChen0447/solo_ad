import { Renderer, Particle, RenderState } from './Renderer';
import { AIController, BallState, PaddleState } from './AIController';

const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 8;
const WINNING_SCORE = 11;
const BOOST_DURATION = 5;
const BOOST_SPEED_MULTIPLIER = 2;
const MAX_DEFLECTION_ANGLE = (60 * Math.PI) / 180;
const SPEED_INCREASE_FACTOR = 1.05;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private aiController: AIController;

  private playerPaddle: PaddleState;
  private aiPaddle: PaddleState;
  private ball: BallState;

  private playerScore: number = 0;
  private aiScore: number = 0;
  private playerEnergy: number = 0;
  private aiEnergy: number = 0;
  private isPlayerBoost: boolean = false;
  private isAIBoost: boolean = false;
  private playerBoostTimer: number = 0;
  private aiBoostTimer: number = 0;
  private isPlayerServing: boolean = true;
  private gameWinner: 'player' | 'ai' | null = null;

  private particles: Particle[] = [];
  private mouseY: number = 0;
  private spacePressed: boolean = false;

  private lastFrameTime: number = 0;
  private fpsWindow: number[] = [];
  private currentFPS: number = 60;
  private time: number = 0;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.aiController = new AIController();

    this.playerPaddle = {
      x: 0,
      y: 0,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    };
    this.aiPaddle = {
      x: 0,
      y: 0,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    };
    this.ball = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS
    };

    this.resize();
    this.setupEventListeners();
    this.resetBall();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);

    this.playerPaddle.x = width - PADDLE_WIDTH - 30;
    this.playerPaddle.y = height / 2 - PADDLE_HEIGHT / 2;

    this.aiPaddle.x = 30;
    this.aiPaddle.y = height / 2 - PADDLE_HEIGHT / 2;

    if (this.gameWinner === null) {
      this.ball.x = width / 2;
      this.ball.y = height / 2;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseY = e.clientY - rect.top - PADDLE_HEIGHT / 2;
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.spacePressed) {
          this.spacePressed = true;
          this.handleSpacePress();
        }
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
      }
    });
  }

  private handleSpacePress(): void {
    if (this.gameWinner !== null) {
      this.resetGame();
      return;
    }

    if (this.playerEnergy >= 100 && !this.isPlayerBoost) {
      this.activatePlayerBoost();
    }
  }

  private resetGame(): void {
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerEnergy = 0;
    this.aiEnergy = 0;
    this.isPlayerBoost = false;
    this.isAIBoost = false;
    this.playerBoostTimer = 0;
    this.aiBoostTimer = 0;
    this.gameWinner = null;
    this.isPlayerServing = true;
    this.particles = [];
    this.aiController.setSpeedMultiplier(1);
    this.resetBall();
  }

  private resetBall(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ball.x = width / 2;
    this.ball.y = height / 2;

    const baseVx = 250 + Math.random() * 100;
    const baseVy = 200 + Math.random() * 100;

    this.ball.vx = this.isPlayerServing ? -baseVx : baseVx;
    this.ball.vy = (Math.random() > 0.5 ? 1 : -1) * baseVy;
  }

  private activatePlayerBoost(): void {
    this.isPlayerBoost = true;
    this.playerBoostTimer = BOOST_DURATION;
    this.playerEnergy = 0;
  }

  private activateAIBoost(): void {
    this.isAIBoost = true;
    this.aiBoostTimer = BOOST_DURATION;
    this.aiEnergy = 0;
    this.aiController.setSpeedMultiplier(1.5);
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 1 / 30);
    this.lastFrameTime = now;

    this.updateFPS(deltaTime);
    this.time += deltaTime;

    if (this.gameWinner === null) {
      this.update(deltaTime);
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(deltaTime: number): void {
    if (deltaTime > 0) {
      const fps = 1 / deltaTime;
      this.fpsWindow.push(fps);
      if (this.fpsWindow.length > 10) {
        this.fpsWindow.shift();
      }
      this.currentFPS = this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length;
    }
  }

  private update(deltaTime: number): void {
    this.updatePaddles(deltaTime);
    this.updateBall(deltaTime);
    this.updateBoost(deltaTime);
    this.updateParticles(deltaTime);
    this.checkAIBoostActivation();
  }

  private updatePaddles(deltaTime: number): void {
    const height = this.canvas.height;

    this.playerPaddle.y = this.mouseY;
    this.playerPaddle.y = Math.max(0, Math.min(height - PADDLE_HEIGHT, this.playerPaddle.y));

    this.aiPaddle.y = this.aiController.update(
      deltaTime,
      this.ball,
      this.aiPaddle,
      height
    );
    this.aiPaddle.y = Math.max(0, Math.min(height - PADDLE_HEIGHT, this.aiPaddle.y));
  }

  private updateBall(deltaTime: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    let speedMultiplier = 1;
    if (this.isPlayerBoost || this.isAIBoost) {
      speedMultiplier = BOOST_SPEED_MULTIPLIER;
    }

    this.ball.x += this.ball.vx * speedMultiplier * deltaTime;
    this.ball.y += this.ball.vy * speedMultiplier * deltaTime;

    if (this.isPlayerBoost || this.isAIBoost) {
      this.spawnTrailParticle();
    }

    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = Math.abs(this.ball.vy);
    } else if (this.ball.y + this.ball.radius >= height) {
      this.ball.y = height - this.ball.radius;
      this.ball.vy = -Math.abs(this.ball.vy);
    }

    this.checkPaddleCollision(this.playerPaddle, true);
    this.checkPaddleCollision(this.aiPaddle, false);

    if (this.ball.x - this.ball.radius <= 0) {
      this.playerScore++;
      this.isPlayerServing = false;
      this.checkWinCondition();
      if (this.gameWinner === null) {
        this.resetBall();
      }
    } else if (this.ball.x + this.ball.radius >= width) {
      this.aiScore++;
      this.isPlayerServing = true;
      this.checkWinCondition();
      if (this.gameWinner === null) {
        this.resetBall();
      }
    }
  }

  private checkPaddleCollision(paddle: PaddleState, isPlayer: boolean): void {
    const ballLeft = this.ball.x - this.ball.radius;
    const ballRight = this.ball.x + this.ball.radius;
    const ballTop = this.ball.y - this.ball.radius;
    const ballBottom = this.ball.y + this.ball.radius;

    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;

    if (
      ballRight >= paddleLeft &&
      ballLeft <= paddleRight &&
      ballBottom >= paddleTop &&
      ballTop <= paddleBottom
    ) {
      const wasMovingTowardsPaddle = isPlayer ? this.ball.vx > 0 : this.ball.vx < 0;

      if (wasMovingTowardsPaddle) {
        const hitPoint = (this.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        const clampedHitPoint = Math.max(-1, Math.min(1, hitPoint));
        const deflectionAngle = clampedHitPoint * MAX_DEFLECTION_ANGLE;

        const currentSpeed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
        const newSpeed = currentSpeed * SPEED_INCREASE_FACTOR;

        if (isPlayer) {
          this.ball.vx = -Math.abs(newSpeed * Math.cos(deflectionAngle));
          this.playerEnergy = Math.min(100, this.playerEnergy + 10);
        } else {
          this.ball.vx = Math.abs(newSpeed * Math.cos(deflectionAngle));
          this.aiEnergy = Math.min(100, this.aiEnergy + 10);
        }
        this.ball.vy = newSpeed * Math.sin(deflectionAngle);

        if (isPlayer) {
          this.ball.x = paddle.x - this.ball.radius - 0.1;
        } else {
          this.ball.x = paddle.x + paddle.width + this.ball.radius + 0.1;
        }
      }
    }
  }

  private updateBoost(deltaTime: number): void {
    if (this.isPlayerBoost) {
      this.playerBoostTimer -= deltaTime;
      if (this.playerBoostTimer <= 0) {
        this.isPlayerBoost = false;
        this.playerBoostTimer = 0;
      }
    }

    if (this.isAIBoost) {
      this.aiBoostTimer -= deltaTime;
      if (this.aiBoostTimer <= 0) {
        this.isAIBoost = false;
        this.aiBoostTimer = 0;
        this.aiController.setSpeedMultiplier(1);
      }
    }
  }

  private checkAIBoostActivation(): void {
    if (
      !this.isAIBoost &&
      this.aiEnergy >= 100 &&
      this.playerScore - this.aiScore >= 2
    ) {
      this.activateAIBoost();
    }
  }

  private spawnTrailParticle(): void {
    const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
    const particle: Particle = {
      x: this.ball.x,
      y: this.ball.y,
      vx: -(this.ball.vx / speed) * 50 + (Math.random() - 0.5) * 20,
      vy: -(this.ball.vy / speed) * 50 + (Math.random() - 0.5) * 20,
      radius: 2 + Math.random() * 2,
      life: 0.3,
      maxLife: 0.3
    };
    this.particles.push(particle);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private checkWinCondition(): void {
    if (this.playerScore >= WINNING_SCORE) {
      this.gameWinner = 'player';
    } else if (this.aiScore >= WINNING_SCORE) {
      this.gameWinner = 'ai';
    }
  }

  private render(): void {
    const state: RenderState = {
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      playerPaddle: { ...this.playerPaddle },
      aiPaddle: { ...this.aiPaddle },
      ball: { x: this.ball.x, y: this.ball.y, radius: this.ball.radius },
      playerScore: this.playerScore,
      aiScore: this.aiScore,
      playerEnergy: this.playerEnergy,
      aiEnergy: this.aiEnergy,
      isPlayerBoost: this.isPlayerBoost,
      isAIBoost: this.isAIBoost,
      fps: this.currentFPS,
      particles: [...this.particles],
      gameWinner: this.gameWinner,
      isPlayerServing: this.isPlayerServing,
      time: this.time
    };

    this.renderer.render(state);
  }
}
