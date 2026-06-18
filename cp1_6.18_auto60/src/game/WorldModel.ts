import {
  CellType,
  Vec2,
  Level,
  Guard,
  Pulse,
  Coin,
  AbilityType,
  CELL_SIZE,
  TIME_LIMIT,
} from './types';
import { getLevel } from './levels';

export class WorldModel {
  private levelId: number;
  private grid: CellType[][];
  private entrance: Vec2;
  private exit: Vec2;

  private playerPosition: Vec2;
  private playerInvisible: boolean = false;
  private playerInvisibleTimer: number = 0;

  private guards: Guard[] = [];
  private pulses: Pulse[] = [];
  private coins: Coin[] = [];
  private collectedCoins: number = 0;
  private totalCoinsCollected: number = 0;

  private timeRemaining: number = TIME_LIMIT;
  private abilityType: AbilityType | null = null;
  private abilityUsed: boolean = false;

  private pulseIdCounter: number = 0;
  private waveIdCounter: number = 0;

  constructor(levelId: number = 1) {
    this.levelId = levelId;
    const level = getLevel(levelId);
    this.grid = level.grid.map(row => [...row]);
    this.entrance = { ...level.entrance };
    this.exit = { ...level.exit };
    this.playerPosition = this.cellToPixel(this.entrance);
    this.initGuards(level);
    this.initCoins(level);
  }

  private cellToPixel(cell: Vec2): Vec2 {
    return {
      x: cell.x * CELL_SIZE + CELL_SIZE / 2,
      y: cell.y * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  private initGuards(level: Level): void {
    this.guards = level.guardPaths.map((pathPoints, idx) => {
      const pixelPoints = pathPoints.map(p => this.cellToPixel(p));
      const start = pixelPoints[0];
      const next = pixelPoints[1] || pixelPoints[0];
      const angle = Math.atan2(next.y - start.y, next.x - start.x);
      return {
        id: idx,
        position: { ...start },
        angle,
        state: 'PATROL' as const,
        path: {
          points: pixelPoints,
          currentIndex: 0,
          progress: 0,
          offset: 0,
        },
        alertTimer: 0,
        chaseTimer: 0,
        catchTimer: 0,
        lastPositions: [],
        blinkCount: 0,
      };
    });
  }

  private initCoins(level: Level): void {
    this.coins = level.coinPositions.map(p => ({
      position: this.cellToPixel(p),
      collected: false,
      collectAnimation: 0,
    }));
    this.collectedCoins = 0;
  }

  public loadLevel(levelId: number): void {
    this.levelId = levelId;
    const level = getLevel(levelId);
    this.grid = level.grid.map(row => [...row]);
    this.entrance = { ...level.entrance };
    this.exit = { ...level.exit };
    this.playerPosition = this.cellToPixel(this.entrance);
    this.playerInvisible = false;
    this.playerInvisibleTimer = 0;
    this.timeRemaining = TIME_LIMIT;
    this.abilityUsed = false;
    this.pulses = [];
    this.initGuards(level);
    this.initCoins(level);
  }

  public getLevelId(): number {
    return this.levelId;
  }

  public getGrid(): CellType[][] {
    return this.grid;
  }

  public isWall(x: number, y: number): boolean {
    const cx = Math.floor(x / CELL_SIZE);
    const cy = Math.floor(y / CELL_SIZE);
    if (cx < 0 || cx >= this.grid[0].length || cy < 0 || cy >= this.grid.length) {
      return true;
    }
    return this.grid[cy][cx] === 'WALL';
  }

  public getCellAt(px: number, py: number): CellType {
    const cx = Math.floor(px / CELL_SIZE);
    const cy = Math.floor(py / CELL_SIZE);
    if (cx < 0 || cx >= this.grid[0].length || cy < 0 || cy >= this.grid.length) {
      return 'WALL';
    }
    return this.grid[cy][cx];
  }

  public getPlayerPosition(): Vec2 {
    return { ...this.playerPosition };
  }

  public setPlayerPosition(pos: Vec2): void {
    this.playerPosition = { ...pos };
  }

  public getExitPosition(): Vec2 {
    return this.cellToPixel(this.exit);
  }

  public getEntrancePosition(): Vec2 {
    return this.cellToPixel(this.entrance);
  }

  public isAtExit(): boolean {
    const exit = this.getExitPosition();
    const dx = this.playerPosition.x - exit.x;
    const dy = this.playerPosition.y - exit.y;
    return Math.sqrt(dx * dx + dy * dy) < CELL_SIZE * 0.5;
  }

  public getGuards(): Guard[] {
    return this.guards;
  }

  public getPulses(): Pulse[] {
    return this.pulses;
  }

  public addPulse(pulse: Omit<Pulse, 'id' | 'waves' | 'alive'> & { waves?: Pulse['waves'] }): Pulse {
    if (this.pulses.length >= 8) {
      this.pulses.shift();
    }
    const newPulse: Pulse = {
      id: this.pulseIdCounter++,
      origin: pulse.origin,
      position: pulse.position,
      direction: pulse.direction,
      radius: pulse.radius,
      speed: pulse.speed,
      intensity: pulse.intensity,
      bouncesRemaining: pulse.bouncesRemaining,
      waves: pulse.waves || [],
      alive: true,
      maxRadius: pulse.maxRadius,
    };
    this.pulses.push(newPulse);
    return newPulse;
  }

  public removePulse(id: number): void {
    const idx = this.pulses.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.pulses.splice(idx, 1);
    }
  }

  public generateWaveId(): number {
    return this.waveIdCounter++;
  }

  public getCoins(): Coin[] {
    return this.coins;
  }

  public collectCoin(index: number): void {
    if (this.coins[index] && !this.coins[index].collected) {
      this.coins[index].collected = true;
      this.coins[index].collectAnimation = 1;
      this.collectedCoins++;
      this.totalCoinsCollected++;
    }
  }

  public getCollectedCoins(): number {
    return this.collectedCoins;
  }

  public getTotalCoinsCollected(): number {
    return this.totalCoinsCollected;
  }

  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  public updateTime(delta: number): void {
    this.timeRemaining = Math.max(0, this.timeRemaining - delta);
  }

  public isTimeUp(): boolean {
    return this.timeRemaining <= 0;
  }

  public setAbility(type: AbilityType): void {
    this.abilityType = type;
    this.abilityUsed = false;
  }

  public getAbilityType(): AbilityType | null {
    return this.abilityType;
  }

  public isAbilityUsed(): boolean {
    return this.abilityUsed;
  }

  public useAbility(): boolean {
    if (this.abilityUsed || this.abilityType === null) return false;
    this.abilityUsed = true;
    if (this.abilityType === 'INVISIBILITY_CLOAK') {
      this.playerInvisible = true;
      this.playerInvisibleTimer = 3;
    }
    return true;
  }

  public updateAbility(delta: number): void {
    if (this.playerInvisible) {
      this.playerInvisibleTimer -= delta;
      if (this.playerInvisibleTimer <= 0) {
        this.playerInvisible = false;
        this.playerInvisibleTimer = 0;
      }
    }
  }

  public isPlayerInvisible(): boolean {
    return this.playerInvisible;
  }

  public getInvisibilityProgress(): number {
    if (this.abilityType !== 'INVISIBILITY_CLOAK' || !this.playerInvisible) return 0;
    return this.playerInvisibleTimer / 3;
  }

  public distanceToExit(): number {
    const exit = this.getExitPosition();
    const dx = this.playerPosition.x - exit.x;
    const dy = this.playerPosition.y - exit.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getExitGlowIntensity(): number {
    const dist = this.distanceToExit();
    const maxDist = CELL_SIZE * 3;
    if (dist >= maxDist) return 0;
    return 1 - dist / maxDist;
  }
}
