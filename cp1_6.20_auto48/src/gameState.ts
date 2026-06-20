export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SongInfo {
  name: string;
  artist?: string;
  bpm: number;
  file?: File;
}

export class GameState {
  private static instance: GameState;
  private status: GameStatus = 'menu';
  private score: number = 0;
  private combo: number = 0;
  private difficulty: Difficulty = 'normal';
  private currentSong: SongInfo | null = null;
  private gameSpeed: number = 1;
  private elapsedTime: number = 0;
  private listeners: Map<string, Set<(data?: unknown) => void>> = new Map();

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data?: unknown) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  getStatus(): GameStatus {
    return this.status;
  }

  setStatus(status: GameStatus): void {
    this.status = status;
    this.emit('statusChange', status);
    
    if (status === 'playing') {
      this.emit('gameStart');
    } else if (status === 'paused') {
      this.emit('gamePause');
    } else if (status === 'gameover') {
      this.emit('gameOver', this.score);
    }
  }

  getScore(): number {
    return this.score;
  }

  addScore(points: number): void {
    this.combo++;
    let finalPoints = points;
    
    if (this.combo >= 10) {
      finalPoints += 5;
    }
    
    this.score += finalPoints;
    this.emit('scoreChange', { score: this.score, combo: this.combo, points: finalPoints });
  }

  getCombo(): number {
    return this.combo;
  }

  resetCombo(): void {
    this.combo = 0;
    this.emit('comboReset');
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.emit('difficultyChange', difficulty);
  }

  getCurrentSong(): SongInfo | null {
    return this.currentSong;
  }

  setCurrentSong(song: SongInfo | null): void {
    this.currentSong = song;
    this.emit('songChange', song);
  }

  getGameSpeed(): number {
    return this.gameSpeed;
  }

  updateGameSpeed(deltaTime: number): void {
    if (this.status !== 'playing') return;
    
    this.elapsedTime += deltaTime;
    
    const baseSpeed = this.getBaseSpeed();
    const speedIncrease = Math.floor(this.elapsedTime / 30) * 0.05;
    this.gameSpeed = Math.min(baseSpeed + speedIncrease, this.getMaxSpeed());
    
    this.emit('speedChange', this.gameSpeed);
  }

  private getBaseSpeed(): number {
    switch (this.difficulty) {
      case 'easy': return 0.8;
      case 'normal': return 1;
      case 'hard': return 1.3;
      default: return 1;
    }
  }

  private getMaxSpeed(): number {
    switch (this.difficulty) {
      case 'easy': return 1.5;
      case 'normal': return 2;
      case 'hard': return 2.5;
      default: return 2;
    }
  }

  getObstacleInterval(): number {
    const baseInterval = 4;
    const reduction = Math.floor(this.elapsedTime / 30) * 0.3;
    const minInterval = 1.5;
    return Math.max(baseInterval - reduction, minInterval) / this.gameSpeed;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.gameSpeed = this.getBaseSpeed();
    this.elapsedTime = 0;
    this.emit('reset');
  }

  triggerCollision(): void {
    this.emit('collision');
    this.setStatus('gameover');
  }
}
