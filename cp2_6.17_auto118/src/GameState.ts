import {
  INITIAL_RESOURCES,
  INITIAL_LIVES,
  TOTAL_WAVES,
  generateWave,
  EnemyType
} from './config';

export interface GameStateData {
  resources: number;
  score: number;
  wave: number;
  enemiesRemaining: number;
  lives: number;
  gameOver: boolean;
  victory: boolean;
  waveInProgress: boolean;
}

export class GameState {
  private resources: number;
  private score: number;
  private wave: number;
  private lives: number;
  private gameOver: boolean;
  private victory: boolean;
  private waveInProgress: boolean;
  private pendingEnemies: EnemyType[];
  private enemiesSpawned: number;
  private enemiesAlive: number;

  constructor() {
    this.resources = INITIAL_RESOURCES;
    this.score = 0;
    this.wave = 0;
    this.lives = INITIAL_LIVES;
    this.gameOver = false;
    this.victory = false;
    this.waveInProgress = false;
    this.pendingEnemies = [];
    this.enemiesSpawned = 0;
    this.enemiesAlive = 0;
  }

  getResources(): number { return this.resources; }
  getScore(): number { return this.score; }
  getWave(): number { return this.wave; }
  getLives(): number { return this.lives; }
  isGameOver(): boolean { return this.gameOver; }
  isVictory(): boolean { return this.victory; }
  isWaveInProgress(): boolean { return this.waveInProgress; }
  getEnemiesRemaining(): number { return this.enemiesAlive + (this.pendingEnemies.length - this.enemiesSpawned); }
  getPendingEnemies(): EnemyType[] { return this.pendingEnemies; }
  getTotalWaves(): number { return TOTAL_WAVES; }
  getEnemiesAlive(): number { return this.enemiesAlive; }
  setEnemiesAlive(n: number): void { this.enemiesAlive = n; }
  getEnemiesSpawned(): number { return this.enemiesSpawned; }
  incrementSpawned(): void { this.enemiesSpawned++; }

  canAfford(amount: number): boolean {
    return this.resources >= amount;
  }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.resources -= amount;
    return true;
  }

  addResources(amount: number): void {
    this.resources += amount;
  }

  addScore(amount: number): void {
    this.score += amount;
  }

  loseLife(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
    }
  }

  startNextWave(): boolean {
    if (this.waveInProgress || this.gameOver || this.victory) return false;
    if (this.wave >= TOTAL_WAVES) return false;

    this.wave++;
    this.waveInProgress = true;
    this.pendingEnemies = generateWave(this.wave);
    this.enemiesSpawned = 0;
    return true;
  }

  endWave(): void {
    this.waveInProgress = false;
    if (this.wave >= TOTAL_WAVES && this.enemiesAlive === 0 && this.pendingEnemies.length === 0) {
      this.victory = true;
    }
  }

  reset(): void {
    this.resources = INITIAL_RESOURCES;
    this.score = 0;
    this.wave = 0;
    this.lives = INITIAL_LIVES;
    this.gameOver = false;
    this.victory = false;
    this.waveInProgress = false;
    this.pendingEnemies = [];
    this.enemiesSpawned = 0;
    this.enemiesAlive = 0;
  }

  getData(): GameStateData {
    return {
      resources: this.resources,
      score: this.score,
      wave: this.wave,
      enemiesRemaining: this.getEnemiesRemaining(),
      lives: this.lives,
      gameOver: this.gameOver,
      victory: this.victory,
      waveInProgress: this.waveInProgress
    };
  }
}
