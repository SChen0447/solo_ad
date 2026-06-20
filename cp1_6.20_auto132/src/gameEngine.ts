import axios from 'axios';
import type { Position, Tower, LevelConfig } from './levelEditor';

export interface Enemy {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  reward: number;
  trail: Position[];
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  currentWave: number;
  totalWaves: number;
  health: number;
  maxHealth: number;
  gold: number;
  enemies: Enemy[];
  towers: Tower[];
  gameOver: boolean;
  victory: boolean;
}

export interface AttackEvent {
  towerId: string;
  enemyId: string;
  damage: number;
  timestamp: number;
}

export interface BattleFrame {
  timestamp: number;
  enemies: Enemy[];
  towers: Tower[];
  health: number;
  gold: number;
  attackEvents: AttackEvent[];
}

export interface ReplayData {
  levelId: string;
  frames: BattleFrame[];
  startTime: number;
  endTime: number;
}

type EventCallback = (...args: unknown[]) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }
}

const WAVE_SIZES = [3, 5, 8, 10, 12];
const WAVE_INTERVAL = 2000;
const ENEMY_SPEED = 0.5;
const TOWER_ATTACK_INTERVAL = 500;
const INITIAL_HEALTH = 20;
const INITIAL_GOLD = 0;
const ENEMY_REWARD = 10;
const ENEMY_MAX_HEALTH = 30;
const UPDATE_INTERVAL = 16;
const TRAIL_LENGTH = 5;

export class GameEngine extends EventEmitter {
  state: GameState;
  levelConfig: LevelConfig | null;
  private lastUpdateTime: number;
  private waveTimer: number;
  private waveSpawnedCount: number;
  private animationFrameId: number | null;
  private attackTimers: Map<string, number>;
  replayFrames: BattleFrame[];
  private startTime: number;
  private lastFrameTime: number;
  private pendingAttackEvents: AttackEvent[];

  constructor() {
    super();
    this.levelConfig = null;
    this.lastUpdateTime = 0;
    this.waveTimer = 0;
    this.waveSpawnedCount = 0;
    this.animationFrameId = null;
    this.attackTimers = new Map();
    this.replayFrames = [];
    this.startTime = 0;
    this.lastFrameTime = 0;
    this.pendingAttackEvents = [];

    this.state = {
      isRunning: false,
      isPaused: false,
      currentWave: 0,
      totalWaves: WAVE_SIZES.length,
      health: INITIAL_HEALTH,
      maxHealth: INITIAL_HEALTH,
      gold: INITIAL_GOLD,
      enemies: [],
      towers: [],
      gameOver: false,
      victory: false
    };
  }

  loadLevel(config: LevelConfig): void {
    this.levelConfig = config;
    this.reset();
    
    this.state.towers = config.towers.map(t => ({
      ...t,
      position: { ...t.position },
      lastAttackTime: 0,
      targetId: null
    }));

    this.state.towers.forEach(tower => {
      this.attackTimers.set(tower.id, 0);
    });
  }

  reset(): void {
    this.state = {
      isRunning: false,
      isPaused: false,
      currentWave: 0,
      totalWaves: WAVE_SIZES.length,
      health: INITIAL_HEALTH,
      maxHealth: INITIAL_HEALTH,
      gold: INITIAL_GOLD,
      enemies: [],
      towers: this.levelConfig ? [...this.levelConfig.towers] : [],
      gameOver: false,
      victory: false
    };
    this.waveTimer = 0;
    this.waveSpawnedCount = 0;
    this.replayFrames = [];
    this.pendingAttackEvents = [];
    this.attackTimers.clear();
    this.state.towers.forEach(tower => {
      this.attackTimers.set(tower.id, 0);
    });
  }

  start(): void {
    if (!this.levelConfig || this.levelConfig.path.length === 0) {
      throw new Error('No valid level loaded');
    }

    if (this.state.isRunning && !this.state.isPaused) return;

    if (this.state.isPaused) {
      this.resume();
      return;
    }

    this.reset();
    this.state.isRunning = true;
    this.startTime = performance.now();
    this.lastUpdateTime = this.startTime;
    this.lastFrameTime = this.startTime;
    this.emit('stateUpdate', { ...this.state });
    this.emit('gameStart');
    this.gameLoop();
  }

  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) return;
    this.state.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emit('stateUpdate', { ...this.state });
    this.emit('pause');
  }

  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) return;
    this.state.isPaused = false;
    this.lastUpdateTime = performance.now();
    this.emit('stateUpdate', { ...this.state });
    this.emit('resume');
    this.gameLoop();
  }

  stop(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emit('stateUpdate', { ...this.state });
  }

  private gameLoop(): void {
    if (!this.state.isRunning || this.state.isPaused) return;

    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;

    if (deltaTime >= UPDATE_INTERVAL) {
      this.update(deltaTime);
      this.lastUpdateTime = now;

      if (now - this.lastFrameTime >= UPDATE_INTERVAL) {
        this.recordFrame();
        this.lastFrameTime = now;
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (this.state.gameOver || this.state.victory) return;

    this.updateWaveSpawning(deltaTime);
    this.updateEnemies(deltaTime);
    this.updateTowers(performance.now());
    this.checkGameState();
    this.emit('stateUpdate', { ...this.state });
  }

  private updateWaveSpawning(deltaTime: number): void {
    if (this.state.currentWave >= WAVE_SIZES.length) return;

    this.waveTimer += deltaTime;

    if (this.waveTimer >= WAVE_INTERVAL) {
      this.waveTimer = 0;
      
      if (this.waveSpawnedCount < WAVE_SIZES[this.state.currentWave]) {
        this.spawnEnemy();
        this.waveSpawnedCount++;
      } else if (this.state.enemies.length === 0) {
        this.state.currentWave++;
        this.waveSpawnedCount = 0;
        
        if (this.state.currentWave < WAVE_SIZES.length) {
          this.emit('waveStarted', this.state.currentWave + 1);
        }
      }
    }
  }

  private spawnEnemy(): void {
    if (!this.levelConfig || this.levelConfig.path.length === 0) return;

    const startPos = this.levelConfig.path[0];
    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { x: startPos.x, y: startPos.y },
      health: ENEMY_MAX_HEALTH,
      maxHealth: ENEMY_MAX_HEALTH,
      speed: ENEMY_SPEED,
      pathIndex: 0,
      reward: ENEMY_REWARD,
      trail: []
    };

    this.state.enemies.push(enemy);
    this.emit('enemySpawned', enemy);
  }

  private updateEnemies(deltaTime: number): void {
    if (!this.levelConfig) return;

    const path = this.levelConfig.path;
    const deltaSeconds = deltaTime / 1000;

    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];

      enemy.trail.unshift({ ...enemy.position });
      if (enemy.trail.length > TRAIL_LENGTH) {
        enemy.trail.pop();
      }

      if (enemy.pathIndex >= path.length - 1) {
        this.state.health -= 1;
        this.state.enemies.splice(i, 1);
        this.emit('enemyReachedEnd', enemy);
        
        if (this.state.health <= 0) {
          this.state.health = 0;
          this.gameOver(false);
        }
        continue;
      }

      const targetPos = path[enemy.pathIndex + 1];
      const dx = targetPos.x - enemy.position.x;
      const dy = targetPos.y - enemy.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.01) {
        enemy.pathIndex++;
        enemy.position = { ...targetPos };
      } else {
        const moveDistance = enemy.speed * deltaSeconds;
        const ratio = Math.min(moveDistance / distance, 1);
        enemy.position.x += dx * ratio;
        enemy.position.y += dy * ratio;
      }
    }
  }

  private updateTowers(currentTime: number): void {
    for (const tower of this.state.towers) {
      const lastAttack = this.attackTimers.get(tower.id) || 0;
      
      if (currentTime - lastAttack >= TOWER_ATTACK_INTERVAL) {
        const target = this.findTarget(tower);
        
        if (target) {
          this.attackEnemy(tower, target);
          this.attackTimers.set(tower.id, currentTime);
          tower.lastAttackTime = currentTime;
          tower.targetId = target.id;
        } else {
          tower.targetId = null;
        }
      }
    }
  }

  private findTarget(tower: Tower): Enemy | null {
    let nearestEnemy: Enemy | null = null;
    let nearestDistance = Infinity;

    for (const enemy of this.state.enemies) {
      const dx = enemy.position.x - tower.position.x;
      const dy = enemy.position.y - tower.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= tower.range && distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    return nearestEnemy;
  }

  private attackEnemy(tower: Tower, enemy: Enemy): void {
    enemy.health -= tower.damage;

    const attackEvent: AttackEvent = {
      towerId: tower.id,
      enemyId: enemy.id,
      damage: tower.damage,
      timestamp: performance.now()
    };
    this.pendingAttackEvents.push(attackEvent);
    this.emit('towerAttacked', attackEvent);

    if (enemy.health <= 0) {
      this.state.gold += enemy.reward;
      const index = this.state.enemies.indexOf(enemy);
      if (index !== -1) {
        this.state.enemies.splice(index, 1);
      }
      this.emit('enemyKilled', enemy);
    }
  }

  private checkGameState(): void {
    if (this.state.currentWave >= WAVE_SIZES.length && 
        this.state.enemies.length === 0 && 
        !this.state.gameOver && 
        this.state.health > 0) {
      this.gameOver(true);
    }
  }

  private gameOver(victory: boolean): void {
    this.state.gameOver = true;
    this.state.victory = victory;
    this.state.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.recordFrame();

    if (victory) {
      this.emit('victory', { ...this.state });
    } else {
      this.emit('gameOver', { ...this.state });
    }
    
    this.emit('stateUpdate', { ...this.state });
  }

  private recordFrame(): void {
    const frame: BattleFrame = {
      timestamp: performance.now() - this.startTime,
      enemies: this.state.enemies.map(e => ({
        ...e,
        position: { ...e.position },
        trail: e.trail.map(t => ({ ...t }))
      })),
      towers: this.state.towers.map(t => ({
        ...t,
        position: { ...t.position }
      })),
      health: this.state.health,
      gold: this.state.gold,
      attackEvents: [...this.pendingAttackEvents]
    };
    
    this.replayFrames.push(frame);
    this.pendingAttackEvents = [];
  }

  async saveReplay(levelId: string): Promise<string> {
    const replayData: ReplayData = {
      levelId,
      frames: this.replayFrames,
      startTime: this.startTime,
      endTime: performance.now()
    };

    try {
      const response = await axios.post(`/api/replay/${levelId}`, replayData);
      if (response.data.success) {
        return response.data.replayId;
      }
      throw new Error(response.data.message || 'Failed to save replay');
    } catch (error) {
      console.error('Error saving replay:', error);
      throw error;
    }
  }

  async getReplay(replayId: string): Promise<ReplayData> {
    try {
      const response = await axios.get(`/api/replay/${replayId}`);
      return response.data;
    } catch (error) {
      console.error('Error loading replay:', error);
      throw error;
    }
  }

  getEnemyById(enemyId: string): Enemy | undefined {
    return this.state.enemies.find(e => e.id === enemyId);
  }

  getTowerById(towerId: string): Tower | undefined {
    return this.state.towers.find(t => t.id === towerId);
  }
}
