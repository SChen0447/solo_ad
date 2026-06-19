import { PlayerManager, GhostState, CatState } from './PlayerManager';
import { CollisionSystem, CollisionEvent } from './CollisionSystem';
import * as THREE from 'three';

export type GameState = 'menu' | 'playing' | 'paused' | 'ended';
export type Winner = 'ghost' | 'cats' | null;

export interface GameStats {
  ghostScore: number;
  catScore: number;
  catsCaught: number;
  totalCats: number;
  totalDisguises: number;
  winner: Winner;
  bestCatchFrame?: ImageData;
}

export class GameManager {
  private playerManager: PlayerManager;
  private collisionSystem: CollisionSystem;
  private gameState: GameState = 'menu';
  private gameDuration: number = 180;
  private remainingTime: number = 180;
  private winner: Winner = null;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private catCount: number = 3;
  private collisionAccumulator: number = 0;
  private collisionFixedDelta: number = 1 / 60;
  private onStateChange?: (state: GameState) => void;
  private onUpdate?: (delta: number) => void;
  private onCollision?: (events: CollisionEvent[]) => void;
  private onGameEnd?: (stats: GameStats) => void;
  private catchMoments: { time: number; catId: string }[] = [];
  private bestCatchMoment: { time: number; catId: string } | null = null;

  constructor() {
    this.playerManager = new PlayerManager();
    this.collisionSystem = new CollisionSystem();
    this.collisionSystem.setCollisionRadius(1.0);
  }

  getPlayerManager(): PlayerManager {
    return this.playerManager;
  }

  getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }

  getState(): GameState {
    return this.gameState;
  }

  getRemainingTime(): number {
    return this.remainingTime;
  }

  getWinner(): Winner {
    return this.winner;
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  setOnUpdate(callback: (delta: number) => void): void {
    this.onUpdate = callback;
  }

  setOnCollision(callback: (events: CollisionEvent[]) => void): void {
    this.onCollision = callback;
  }

  setOnGameEnd(callback: (stats: GameStats) => void): void {
    this.onGameEnd = callback;
  }

  startGame(): void {
    if (this.gameState === 'playing') return;

    this.playerManager.reset();
    this.playerManager.initCats(this.catCount);
    this.collisionSystem.clear();
    this.remainingTime = this.gameDuration;
    this.winner = null;
    this.catchMoments = [];
    this.bestCatchMoment = null;

    const cats = this.playerManager.getActiveCats();
    cats.forEach(cat => {
      this.collisionSystem.setCatPosition(cat.id, cat.position);
    });

    this.gameState = 'playing';
    this.lastTime = performance.now();

    if (this.onStateChange) {
      this.onStateChange('playing');
    }

    this.gameLoop();
  }

  pauseGame(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'paused';
    cancelAnimationFrame(this.animationFrameId);

    if (this.onStateChange) {
      this.onStateChange('paused');
    }
  }

  resumeGame(): void {
    if (this.gameState !== 'paused') return;
    this.gameState = 'playing';
    this.lastTime = performance.now();

    if (this.onStateChange) {
      this.onStateChange('playing');
    }

    this.gameLoop();
  }

  endGame(): void {
    if (this.gameState === 'ended') return;

    this.gameState = 'ended';
    cancelAnimationFrame(this.animationFrameId);

    const activeCats = this.playerManager.getActiveCats().filter(c => !c.isCaught);
    if (activeCats.length === 0) {
      this.winner = 'ghost';
    } else {
      this.winner = 'cats';
    }

    if (this.onStateChange) {
      this.onStateChange('ended');
    }

    if (this.onGameEnd) {
      this.onGameEnd(this.getStats());
    }
  }

  private gameLoop(): void {
    if (this.gameState !== 'playing') return;

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
  }

  private update(delta: number): void {
    this.remainingTime -= delta;
    if (this.remainingTime <= 0) {
      this.remainingTime = 0;
      this.endGame();
      return;
    }

    this.playerManager.update(delta);
    this.syncPositions();

    this.collisionAccumulator += delta;
    while (this.collisionAccumulator >= this.collisionFixedDelta) {
      const events = this.collisionSystem.update();
      if (events.length > 0) {
        this.handleCollisions(events);
      }
      this.collisionAccumulator -= this.collisionFixedDelta;
    }

    const activeCats = this.playerManager.getActiveCats().filter(c => !c.isCaught);
    if (activeCats.length === 0) {
      this.endGame();
      return;
    }

    if (this.onUpdate) {
      this.onUpdate(delta);
    }
  }

  private syncPositions(): void {
    const ghostPos = this.playerManager.getGhostPosition();
    this.collisionSystem.setGhostPosition('ghost-1', ghostPos);

    const cats = this.playerManager.getActiveCats();
    cats.forEach(cat => {
      if (!cat.isCaught) {
        this.collisionSystem.setCatPosition(cat.id, cat.position);
      }
    });
  }

  private handleCollisions(events: CollisionEvent[]): void {
    for (const event of events) {
      const cat = this.playerManager.getCat(event.catId);
      if (cat && !cat.isCaught) {
        this.playerManager.catchCat(event.catId);
        this.collisionSystem.removeCat(event.catId);

        const catchMoment = {
          time: this.gameDuration - this.remainingTime,
          catId: event.catId
        };
        this.catchMoments.push(catchMoment);

        if (!this.bestCatchMoment || catchMoment.time < this.bestCatchMoment.time) {
          this.bestCatchMoment = catchMoment;
        }
      }
    }

    if (this.onCollision && events.length > 0) {
      this.onCollision(events);
    }
  }

  getStats(): GameStats {
    return {
      ghostScore: this.playerManager.getGhostScore(),
      catScore: this.playerManager.getTotalCatScore(),
      catsCaught: this.playerManager.getGhost().catsCaught,
      totalCats: this.catCount,
      totalDisguises: this.playerManager.getTotalDisguiseCount(),
      winner: this.winner,
    };
  }

  getGhostState(): GhostState {
    return this.playerManager.getGhost();
  }

  getCatStates(): CatState[] {
    return this.playerManager.getCats();
  }

  setCatCount(count: number): void {
    this.catCount = Math.max(1, Math.min(10, count));
  }

  getCatCount(): number {
    return this.catCount;
  }

  moveGhost(direction: THREE.Vector3, delta: number): void {
    if (this.gameState !== 'playing') return;
    this.playerManager.moveGhost(direction, delta);
  }

  moveCat(id: string, direction: THREE.Vector3, delta: number): void {
    if (this.gameState !== 'playing') return;
    this.playerManager.moveCat(id, direction, delta);
  }

  setGhostRotation(rotation: THREE.Euler): void {
    this.playerManager.setGhostRotation(rotation);
  }

  togglePerspective(): void {
    if (this.gameState !== 'playing') return;
    this.playerManager.togglePerspectiveMode();
  }

  setPerspectiveMode(active: boolean): void {
    if (this.gameState !== 'playing') return;
    this.playerManager.setPerspectiveMode(active);
  }

  toggleDisguise(catId: string): void {
    if (this.gameState !== 'playing') return;
    this.playerManager.toggleDisguise(catId);
  }

  getBestCatchMoment(): { time: number; catId: string } | null {
    return this.bestCatchMoment;
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.collisionSystem.clear();
  }
}
