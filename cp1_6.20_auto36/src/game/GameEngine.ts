import { Player } from './Player';
import { ObstacleManager, type Obstacle } from './ObstacleManager';
import { EnergyManager, type EnergyBall } from './EnergyManager';
import type { GravityDirection } from '../utils/InputHandler';

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  energyBalls: EnergyBall[];
  score: number;
  displayScore: number;
  scrollSpeed: number;
  difficultyMultiplier: number;
  gameOver: boolean;
  gravityDirection: GravityDirection;
  getObstacleFadeAlpha: (obs: Obstacle) => number;
  getEnergyPulseScale: (ball: EnergyBall) => number;
  getPlayerSquishScale: () => { scaleX: number; scaleY: number };
}

export class GameEngine {
  private player: Player;
  private obstacleManager: ObstacleManager;
  private energyManager: EnergyManager;
  private score = 0;
  private displayScore = 0;
  private baseScrollSpeed = 3;
  private scrollSpeed = 3;
  private difficultyMultiplier = 1;
  private gameOver = false;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.player = new Player(canvasWidth, canvasHeight);
    this.obstacleManager = new ObstacleManager(canvasWidth, canvasHeight);
    this.energyManager = new EnergyManager(canvasWidth, canvasHeight);
  }

  public setGravityDirection(direction: GravityDirection): void {
    if (!this.gameOver) {
      this.player.setGravityDirection(direction);
    }
  }

  public update(deltaTime: number): void {
    if (this.gameOver) {
      if (this.displayScore < this.score) {
        this.displayScore = Math.min(this.score, this.displayScore + Math.ceil((this.score - this.displayScore) * 0.1));
      }
      return;
    }

    this.difficultyMultiplier = 1 + Math.floor(this.score / 200) * 0.15;
    this.scrollSpeed = this.baseScrollSpeed * this.difficultyMultiplier;

    this.player.update(deltaTime, this.scrollSpeed);
    this.obstacleManager.update(deltaTime, this.scrollSpeed, this.difficultyMultiplier);
    this.energyManager.update(deltaTime, this.scrollSpeed, this.player.state.gravityDirection);

    const playerAABB = this.player.getAABB();

    const collected = this.energyManager.checkCollision(playerAABB);
    if (collected > 0) {
      this.score += collected * 10;
    }

    for (const obs of this.obstacleManager.obstacles) {
      const obsAABB = this.obstacleManager.getObstacleAABB(obs);
      if (
        playerAABB.minX < obsAABB.maxX &&
        playerAABB.maxX > obsAABB.minX &&
        playerAABB.minY < obsAABB.maxY &&
        playerAABB.maxY > obsAABB.minY
      ) {
        this.gameOver = true;
        break;
      }
    }

    if (this.displayScore < this.score) {
      this.displayScore = Math.min(this.score, this.displayScore + Math.ceil((this.score - this.displayScore) * 0.15));
    }
  }

  public getState(): GameState {
    return {
      player: this.player,
      obstacles: this.obstacleManager.obstacles,
      energyBalls: this.energyManager.energyBalls,
      score: this.score,
      displayScore: this.displayScore,
      scrollSpeed: this.scrollSpeed,
      difficultyMultiplier: this.difficultyMultiplier,
      gameOver: this.gameOver,
      gravityDirection: this.player.state.gravityDirection,
      getObstacleFadeAlpha: (obs: Obstacle) => this.obstacleManager.getFadeAlpha(obs),
      getEnergyPulseScale: (ball: EnergyBall) => this.energyManager.getPulseScale(ball),
      getPlayerSquishScale: () => this.player.getSquishScale()
    };
  }

  public restart(): void {
    this.player = new Player(this.canvasWidth, this.canvasHeight);
    this.obstacleManager.reset();
    this.energyManager.reset();
    this.score = 0;
    this.displayScore = 0;
    this.scrollSpeed = this.baseScrollSpeed;
    this.difficultyMultiplier = 1;
    this.gameOver = false;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.player.resize(width, height);
    this.obstacleManager.resize(width, height);
    this.energyManager.resize(width, height);
  }
}
