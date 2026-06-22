import {
  GamePhase,
  Player,
  Enemy,
  Room,
  DungeonMap,
  RoomType,
  EnemyType,
  TileType,
  Position,
  BeatEvent,
  GameStats,
  Rating,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  GRID_WIDTH,
  GRID_HEIGHT
} from '../types';
import { PlayerController } from '../game/PlayerController';
import { CombatSystem } from '../game/CombatSystem';
import { BeatEngine } from './BeatEngine';
import { AudioLoader } from '../audio/AudioLoader';

interface GameState {
  phase: GamePhase;
  player: Player;
  dungeonMap: DungeonMap;
  stats: GameStats;
  currentRoom: Room | null;
  transitionProgress: number;
  isTransitioning: boolean;
  transitionDirection: Position | null;
}

export class GameManager {
  private state: GameState;
  private playerController: PlayerController;
  private combatSystem: CombatSystem;
  private beatEngine: BeatEngine;
  private audioLoader: AudioLoader;
  private beatUnsubscribe: (() => void) | null = null;
  private damageUnsubscribe: (() => void) | null = null;
  private enemyDeathUnsubscribe: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private beatFlashTimers: Map<string, number> = new Map();
  private attackWarningTimers: Map<string, number> = new Map();
  private onStateChangeCallback: ((state: GameState) => void) | null = null;

  constructor(beatEngine: BeatEngine, audioLoader: AudioLoader) {
    this.beatEngine = beatEngine;
    this.audioLoader = audioLoader;
    this.combatSystem = new CombatSystem();

    const initialPlayer: Player = {
      id: 'player_1',
      position: { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
      health: 100,
      maxHealth: 100,
      attack: 20,
      speed: 100,
      isStunned: false,
      stunEndTime: 0,
      facing: 'right'
    };

    this.playerController = new PlayerController(initialPlayer, this.combatSystem);

    this.state = {
      phase: GamePhase.MENU,
      player: initialPlayer,
      dungeonMap: {
        rooms: [],
        currentRoom: { x: 0, y: 0 },
        layoutSize: { width: 3, height: 3 }
      },
      stats: {
        score: 0,
        kills: 0,
        perfectHits: 0,
        totalHits: 0,
        levelStartTime: 0,
        currentLevel: 1,
        rating: Rating.C
      },
      currentRoom: null,
      transitionProgress: 0,
      isTransitioning: false,
      transitionDirection: null
    };

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.playerController.setOnRhythmMissCallback((damage) => {
      console.log(`Rhythm miss! Took ${damage} damage`);
    });

    this.playerController.setOnAttackCallback((isPerfect) => {
      this.handlePlayerAttack(isPerfect);
    });

    this.playerController.setOnMoveCallback((_position, _isPerfect) => {
      this.checkRoomTransition();
      this.checkItemPickup();
    });

    this.damageUnsubscribe = this.combatSystem.onDamage((event) => {
      if (event.targetId === this.state.player.id) {
        this.state.player.health = Math.max(0, this.state.player.health - event.damage);
        if (this.state.player.health <= 0) {
          this.gameOver();
        }
      }
    });

    this.enemyDeathUnsubscribe = this.combatSystem.onEnemyDeath((enemy) => {
      this.handleEnemyDeath(enemy);
    });
  }

  async startNewGame(trackId: string, musicPath: string, bpm: number = 120): Promise<void> {
    await this.beatEngine.loadTrack(trackId, musicPath, 'Level 1', bpm);
    this.beatEngine.setTrack(trackId);

    this.state.dungeonMap = this.generateDungeon(3, 3, 1);
    this.state.currentRoom = this.getCurrentRoom();
    this.state.stats = {
      score: 0,
      kills: 0,
      perfectHits: 0,
      totalHits: 0,
      levelStartTime: performance.now(),
      currentLevel: 1,
      rating: Rating.C
    };

    this.state.player.position = { x: TILE_SIZE * 7, y: TILE_SIZE * 6 };
    this.state.player.health = this.state.player.maxHealth;
    this.state.player.isStunned = false;

    this.playerController.setGrid(this.state.currentRoom.grid);

    this.beatUnsubscribe = this.beatEngine.onBeat((event) => {
      this.handleBeat(event);
    });

    this.audioLoader.play(trackId, true);
    this.beatEngine.start();

    this.state.phase = GamePhase.PLAYING;
    this.startGameLoop();
    this.notifyStateChange();
  }

  private generateDungeon(width: number, height: number, level: number): DungeonMap {
    const rooms: Room[][] = [];
    const roomTypes: RoomType[] = [
      RoomType.COMBAT,
      RoomType.COMBAT,
      RoomType.COMBAT,
      RoomType.TREASURE,
      RoomType.REST
    ];

    for (let y = 0; y < height; y++) {
      rooms[y] = [];
      for (let x = 0; x < width; x++) {
        let type: RoomType;
        if (x === 0 && y === 0) {
          type = RoomType.START;
        } else if (x === width - 1 && y === height - 1) {
          type = RoomType.BOSS;
        } else {
          type = roomTypes[Math.floor(Math.random() * roomTypes.length)];
        }

        rooms[y][x] = this.generateRoom(x, y, type, level);
      }
    }

    return {
      rooms,
      currentRoom: { x: 0, y: 0 },
      layoutSize: { width, height }
    };
  }

  private generateRoom(x: number, y: number, type: RoomType, level: number): Room {
    const grid: number[][] = [];
    const enemies: Enemy[] = [];
    const doors: Position[] = [];

    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      grid[gy] = [];
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        if (gx === 0 || gx === GRID_WIDTH - 1 || gy === 0 || gy === GRID_HEIGHT - 1) {
          grid[gy][gx] = TileType.WALL;
        } else if (Math.random() < 0.05 && gx > 2 && gx < GRID_WIDTH - 3 && gy > 2 && gy < GRID_HEIGHT - 3) {
          grid[gy][gx] = TileType.WALL;
        } else {
          grid[gy][gx] = TileType.FLOOR;
        }
      }
    }

    if (x > 0) {
      const doorY = Math.floor(GRID_HEIGHT / 2);
      grid[doorY][0] = TileType.DOOR;
      doors.push({ x: 0, y: doorY * TILE_SIZE });
    }
    if (x < this.state.dungeonMap.layoutSize.width - 1) {
      const doorY = Math.floor(GRID_HEIGHT / 2);
      grid[doorY][GRID_WIDTH - 1] = TileType.DOOR;
      doors.push({ x: (GRID_WIDTH - 1) * TILE_SIZE, y: doorY * TILE_SIZE });
    }
    if (y > 0) {
      const doorX = Math.floor(GRID_WIDTH / 2);
      grid[0][doorX] = TileType.DOOR;
      doors.push({ x: doorX * TILE_SIZE, y: 0 });
    }
    if (y < this.state.dungeonMap.layoutSize.height - 1) {
      const doorX = Math.floor(GRID_WIDTH / 2);
      grid[GRID_HEIGHT - 1][doorX] = TileType.DOOR;
      doors.push({ x: doorX * TILE_SIZE, y: (GRID_HEIGHT - 1) * TILE_SIZE });
    }

    if (type === RoomType.COMBAT || type === RoomType.BOSS) {
      const enemyCount = type === RoomType.BOSS ? 3 + level : 1 + Math.floor(level / 2);
      for (let i = 0; i < enemyCount; i++) {
        const enemyType = Math.random() > 0.5 ? EnemyType.SENTINEL : EnemyType.SPIDER;
        const enemy = this.createEnemy(
          enemyType,
          {
            x: TILE_SIZE * (3 + Math.floor(Math.random() * (GRID_WIDTH - 6))),
            y: TILE_SIZE * (3 + Math.floor(Math.random() * (GRID_HEIGHT - 6)))
          },
          level
        );
        enemies.push(enemy);
      }
    }

    return {
      id: `room_${x}_${y}`,
      type,
      grid,
      enemies,
      items: [],
      doors,
      isCleared: type === RoomType.START,
      position: { x, y }
    };
  }

  private createEnemy(type: EnemyType, position: Position, level: number): Enemy {
    const baseStats = {
      [EnemyType.SENTINEL]: { health: 60, attack: 15, speed: 80, color: '#ef4444' },
      [EnemyType.SPIDER]: { health: 40, attack: 10, speed: 120, color: '#a855f7' },
      [EnemyType.SPIDER_LING]: { health: 15, attack: 5, speed: 100, color: '#c084fc' }
    };

    const stats = baseStats[type];
    const levelMultiplier = 1 + (level - 1) * 0.2;

    return {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      health: Math.floor(stats.health * levelMultiplier),
      maxHealth: Math.floor(stats.health * levelMultiplier),
      attack: Math.floor(stats.attack * levelMultiplier),
      speed: stats.speed,
      isFlashing: false,
      flashColor: stats.color,
      flashEndTime: 0,
      attackWarning: false,
      attackWarningEndTime: 0,
      moveDirection: { x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 },
      beatsSinceLastAttack: 0
    };
  }

  private getCurrentRoom(): Room {
    const { x, y } = this.state.dungeonMap.currentRoom;
    return this.state.dungeonMap.rooms[y][x];
  }

  private handleBeat(event: BeatEvent): void {
    this.playerController.onBeat(event);

    const room = this.getCurrentRoom();
    const bpm = this.beatEngine.getCurrentBPM();

    for (const enemy of room.enemies) {
      if (enemy.health <= 0) continue;

      enemy.isFlashing = true;
      enemy.flashEndTime = performance.now() + 300;

      if (enemy.type === EnemyType.SENTINEL) {
        this.combatSystem.incrementEnemyBeatCount(enemy);

        if (this.combatSystem.checkEnemyAttack(enemy, 4)) {
          enemy.attackWarning = true;
          enemy.attackWarningEndTime = performance.now() + 500;
          
          setTimeout(() => {
            if (enemy.health > 0) {
              this.combatSystem.processEnemyAttack(enemy, this.state.player);
              this.combatSystem.resetEnemyAttackCounter(enemy);
              enemy.attackWarning = false;
            }
          }, 500);
        }

        this.moveSentinel(enemy, bpm);
      } else if (enemy.type === EnemyType.SPIDER || enemy.type === EnemyType.SPIDER_LING) {
        this.moveSpider(enemy);
      }
    }

    this.notifyStateChange();
  }

  private moveSentinel(enemy: Enemy, bpm: number): void {
    const player = this.state.player;
    const dx = player.position.x - enemy.position.x;
    const dy = player.position.y - enemy.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > TILE_SIZE * 0.5) {
      const speed = (bpm / 60) * (enemy.speed / 100);
      const moveX = (dx / distance) * TILE_SIZE * 0.5 * speed;
      const moveY = (dy / distance) * TILE_SIZE * 0.5 * speed;

      const newX = Math.max(TILE_SIZE, Math.min(MAP_WIDTH - TILE_SIZE * 2, enemy.position.x + moveX));
      const newY = Math.max(TILE_SIZE, Math.min(MAP_HEIGHT - TILE_SIZE * 2, enemy.position.y + moveY));

      enemy.position.x = newX;
      enemy.position.y = newY;
    }
  }

  private moveSpider(enemy: Enemy): void {
    const room = this.getCurrentRoom();
    let newX = enemy.position.x + enemy.moveDirection.x * TILE_SIZE * 0.5;
    let newY = enemy.position.y + enemy.moveDirection.y * TILE_SIZE * 0.5;

    const gridX = Math.floor(newX / TILE_SIZE);
    const gridY = Math.floor(newY / TILE_SIZE);

    if (
      gridX <= 1 ||
      gridX >= GRID_WIDTH - 2 ||
      gridY <= 1 ||
      gridY >= GRID_HEIGHT - 2 ||
      room.grid[gridY]?.[gridX] === TileType.WALL
    ) {
      enemy.moveDirection = {
        x: Math.random() > 0.5 ? 1 : -1,
        y: Math.random() > 0.5 ? 1 : -1
      };
    } else {
      enemy.position.x = newX;
      enemy.position.y = newY;
    }
  }

  private handlePlayerAttack(isPerfect: boolean): void {
    const room = this.getCurrentRoom();
    const results = this.combatSystem.processPlayerAttack(
      this.state.player,
      room.enemies,
      TILE_SIZE * 1.5,
      isPerfect
    );

    this.state.stats.totalHits++;
    if (isPerfect) {
      this.state.stats.perfectHits++;
      this.state.stats.score += 50;
    }

    for (const result of results) {
      this.state.stats.score += result.damage * 2;
      if (result.isKilled) {
        this.state.stats.kills++;
        this.state.stats.score += 100;
      }
    }

    this.checkRoomCleared();
    this.notifyStateChange();
  }

  private handleEnemyDeath(enemy: Enemy): void {
    const room = this.getCurrentRoom();
    const index = room.enemies.findIndex(e => e.id === enemy.id);
    
    if (index !== -1) {
      const item = this.combatSystem.spawnLoot(enemy);
      if (item) {
        room.items.push(item);
      }

      if (enemy.type === EnemyType.SPIDER) {
        const lings = this.combatSystem.spawnSpiderLings(enemy);
        room.enemies.push(...lings);
      }

      room.enemies.splice(index, 1);
    }

    this.checkRoomCleared();
  }

  private checkRoomCleared(): void {
    const room = this.getCurrentRoom();
    if (room.type === RoomType.COMBAT || room.type === RoomType.BOSS) {
      if (room.enemies.length === 0 && !room.isCleared) {
        room.isCleared = true;
        this.state.stats.score += 500;
      }
    }
  }

  private checkRoomTransition(): void {
    const room = this.getCurrentRoom();
    if (!room.isCleared) return;

    const playerX = this.state.player.position.x;
    const playerY = this.state.player.position.y;

    let direction: Position | null = null;

    if (playerX <= 0 && this.state.dungeonMap.currentRoom.x > 0) {
      direction = { x: -1, y: 0 };
    } else if (playerX >= MAP_WIDTH - TILE_SIZE && this.state.dungeonMap.currentRoom.x < this.state.dungeonMap.layoutSize.width - 1) {
      direction = { x: 1, y: 0 };
    } else if (playerY <= 0 && this.state.dungeonMap.currentRoom.y > 0) {
      direction = { x: 0, y: -1 };
    } else if (playerY >= MAP_HEIGHT - TILE_SIZE && this.state.dungeonMap.currentRoom.y < this.state.dungeonMap.layoutSize.height - 1) {
      direction = { x: 0, y: 1 };
    }

    if (direction) {
      this.startRoomTransition(direction);
    }
  }

  private startRoomTransition(direction: Position): void {
    this.state.isTransitioning = true;
    this.state.transitionDirection = direction;
    this.state.transitionProgress = 0;
    this.state.phase = GamePhase.ROOM_TRANSITION;
    this.notifyStateChange();
  }

  private completeRoomTransition(): void {
    if (!this.state.transitionDirection) return;

    this.state.dungeonMap.currentRoom.x += this.state.transitionDirection.x;
    this.state.dungeonMap.currentRoom.y += this.state.transitionDirection.y;

    const newRoom = this.getCurrentRoom();
    this.state.currentRoom = newRoom;
    this.playerController.setGrid(newRoom.grid);

    if (this.state.transitionDirection.x > 0) {
      this.state.player.position.x = TILE_SIZE;
    } else if (this.state.transitionDirection.x < 0) {
      this.state.player.position.x = MAP_WIDTH - TILE_SIZE * 2;
    } else if (this.state.transitionDirection.y > 0) {
      this.state.player.position.y = TILE_SIZE;
    } else if (this.state.transitionDirection.y < 0) {
      this.state.player.position.y = MAP_HEIGHT - TILE_SIZE * 2;
    }

    if (newRoom.type === RoomType.REST) {
      this.combatSystem.healPlayer(this.state.player, 0.3);
    }

    if (this.checkLevelComplete()) {
      this.completeLevel();
    } else {
      this.state.isTransitioning = false;
      this.state.transitionDirection = null;
      this.state.transitionProgress = 0;
      this.state.phase = GamePhase.PLAYING;
    }

    this.notifyStateChange();
  }

  private checkLevelComplete(): boolean {
    const { x, y } = this.state.dungeonMap.currentRoom;
    const room = this.state.dungeonMap.rooms[y][x];
    return room.type === RoomType.BOSS && room.isCleared;
  }

  private completeLevel(): void {
    const levelTime = (performance.now() - this.state.stats.levelStartTime) / 1000;
    const perfectRatio = this.state.stats.totalHits > 0 
      ? this.state.stats.perfectHits / this.state.stats.totalHits 
      : 0;

    let rating = Rating.C;
    if (perfectRatio >= 0.8 && levelTime < 120) {
      rating = Rating.S;
    } else if (perfectRatio >= 0.6 && levelTime < 180) {
      rating = Rating.A;
    } else if (perfectRatio >= 0.4) {
      rating = Rating.B;
    }

    this.state.stats.rating = rating;
    this.state.phase = GamePhase.LEVEL_COMPLETE;
    this.beatEngine.stop();
  }

  private checkItemPickup(): void {
    const room = this.getCurrentRoom();
    
    for (const item of room.items) {
      if (!item.isPickedUp && this.combatSystem.checkItemPickup(this.state.player, item)) {
        item.isPickedUp = true;
        const effect = this.combatSystem.applyItemEffect(this.state.player, item);
        this.state.stats.score += 50;
        console.log(`Picked up ${item.type}! +${effect.value} ${effect.stat}`);
      }
    }

    room.items = room.items.filter(item => !item.isPickedUp);
  }

  private gameOver(): void {
    this.state.phase = GamePhase.GAME_OVER;
    this.beatEngine.stop();
    this.audioLoader.stop();
    this.notifyStateChange();
  }

  private startGameLoop(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    if (this.state.phase === GamePhase.PLAYING) {
      this.playerController.update(currentTime);

      const room = this.getCurrentRoom();
      for (const enemy of room.enemies) {
        if (enemy.isFlashing && currentTime >= enemy.flashEndTime) {
          enemy.isFlashing = false;
        }
        if (enemy.attackWarning && currentTime >= enemy.attackWarningEndTime) {
          enemy.attackWarning = false;
        }
      }

      for (const item of room.items) {
        if (item.isPickedUp && item.pickupAnimationProgress < 1) {
          item.pickupAnimationProgress = Math.min(1, item.pickupAnimationProgress + deltaTime / 200);
        }
      }
    } else if (this.state.phase === GamePhase.ROOM_TRANSITION) {
      this.state.transitionProgress += deltaTime / 500;
      if (this.state.transitionProgress >= 1) {
        this.completeRoomTransition();
      }
    }

    this.notifyStateChange();

    if (this.state.phase !== GamePhase.GAME_OVER && this.state.phase !== GamePhase.LEVEL_COMPLETE) {
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  };

  handleKeyDown(key: string): void {
    if (this.state.phase === GamePhase.PLAYING) {
      this.playerController.handleKeyDown(key);
    }
  }

  handleKeyUp(key: string): void {
    this.playerController.handleKeyUp(key);
  }

  pause(): void {
    if (this.state.phase === GamePhase.PLAYING) {
      this.state.phase = GamePhase.PAUSED;
      this.beatEngine.stop();
      this.audioLoader.pause();
      this.notifyStateChange();
    }
  }

  resume(): void {
    if (this.state.phase === GamePhase.PAUSED) {
      this.state.phase = GamePhase.PLAYING;
      this.beatEngine.start();
      this.audioLoader.resume();
      this.notifyStateChange();
    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  getBeatProgress(): number {
    return this.beatEngine.getProgressToNextBeat();
  }

  getTimeUntilNextBeat(): number {
    return this.beatEngine.getTimeUntilNextBeat();
  }

  setOnStateChangeCallback(callback: (state: GameState) => void): void {
    this.onStateChangeCallback = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.beatUnsubscribe) {
      this.beatUnsubscribe();
    }
    if (this.damageUnsubscribe) {
      this.damageUnsubscribe();
    }
    if (this.enemyDeathUnsubscribe) {
      this.enemyDeathUnsubscribe();
    }
    this.beatEngine.destroy();
    this.combatSystem.destroy();
    this.playerController.destroy();
    this.audioLoader.unloadAll();
  }
}

export default GameManager;
