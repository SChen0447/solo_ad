import type {
  RoomData,
  Player,
  Enemy,
  InputState,
  RenderData,
  Position,
  MoveCommand,
  Room
} from '../types';
import AIPatrol from '../modules/ai-patrol';
import DungeonGenerator from '../modules/dungeon-generator';
import EntitySpawner from '../modules/entity-spawner';

const HIT_DURATION = 0.3;
const KNOCKBACK_DISTANCE = 40;
const TRANSITION_DURATION = 0.3;

interface EngineState {
  roomData: RoomData;
  player: Player;
  enemies: Enemy[];
  input: InputState;
  fps: number;
  frameCount: number;
  fpsTimer: number;
  lastTime: number;
  isTransitioning: boolean;
  transitionPhase: 'out' | 'in' | 'none';
  transitionTimer: number;
  pendingRegenerate: boolean;
  pendingSeed: number;
}

class GameEngine {
  private canvasWidth: number;
  private canvasHeight: number;
  private state: EngineState;
  private aiPatrol: AIPatrol;
  private onRender: (data: RenderData) => void;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    onRender: (data: RenderData) => void
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.onRender = onRender;
    this.aiPatrol = new AIPatrol();

    const initialSeed = Date.now();
    const dungeonGenerator = new DungeonGenerator(initialSeed);
    const roomData = dungeonGenerator.generate(canvasWidth, canvasHeight);
    const spawner = new EntitySpawner(initialSeed);
    const { player, enemies } = spawner.spawnAll(roomData);

    this.state = {
      roomData,
      player,
      enemies,
      input: { up: false, down: false, left: false, right: false },
      fps: 60,
      frameCount: 0,
      fpsTimer: 0,
      lastTime: performance.now(),
      isTransitioning: false,
      transitionPhase: 'none',
      transitionTimer: 0,
      pendingRegenerate: false,
      pendingSeed: 0
    };
  }

  setInput(input: Partial<InputState>): void {
    this.state.input = { ...this.state.input, ...input };
  }

  regenerate(): void {
    if (this.state.isTransitioning) return;

    this.state.isTransitioning = true;
    this.state.transitionPhase = 'out';
    this.state.transitionTimer = TRANSITION_DURATION;
    this.state.pendingRegenerate = true;
    this.state.pendingSeed = Date.now();
  }

  private doRegenerate(): void {
    const seed = this.state.pendingSeed;
    const dungeonGenerator = new DungeonGenerator(seed);
    const roomData = dungeonGenerator.generate(this.canvasWidth, this.canvasHeight);
    const spawner = new EntitySpawner(seed);
    const { player, enemies } = spawner.spawnAll(roomData);

    this.state.roomData = roomData;
    this.state.player = player;
    this.state.enemies = enemies;
    this.state.pendingRegenerate = false;
  }

  update(): void {
    const now = performance.now();
    const deltaTime = Math.min((now - this.state.lastTime) / 1000, 1 / 30);
    this.state.lastTime = now;

    this.state.frameCount++;
    this.state.fpsTimer += deltaTime;
    if (this.state.fpsTimer >= 1) {
      this.state.fps = Math.round(this.state.frameCount / this.state.fpsTimer);
      this.state.frameCount = 0;
      this.state.fpsTimer = 0;
    }

    if (this.state.isTransitioning) {
      this.state.transitionTimer -= deltaTime;
      if (this.state.transitionTimer <= 0) {
        if (this.state.transitionPhase === 'out') {
          if (this.state.pendingRegenerate) {
            this.doRegenerate();
          }
          this.state.transitionPhase = 'in';
          this.state.transitionTimer = TRANSITION_DURATION;
        } else {
          this.state.isTransitioning = false;
          this.state.transitionPhase = 'none';
          this.state.transitionTimer = 0;
        }
      }
    }

    if (!this.state.isTransitioning || this.state.transitionPhase === 'in') {
      this.updatePlayer(deltaTime);
      this.updateEnemies(deltaTime);
      this.checkCollisions();
      this.updatePlayerRoom();
    }

    this.render();
  }

  private updatePlayer(deltaTime: number): void {
    const player = this.state.player;

    if (player.hitTimer > 0) {
      player.hitTimer -= deltaTime;
      if (player.hitTimer <= 0) {
        player.isHit = false;
      }
    }

    if (player.knockback && player.knockbackTimer > 0) {
      player.knockbackTimer -= deltaTime;
      const knockbackSpeed = KNOCKBACK_DISTANCE / HIT_DURATION;
      const dx = player.knockback.x * knockbackSpeed * deltaTime;
      const dy = player.knockback.y * knockbackSpeed * deltaTime;

      const newX = player.x + dx;
      const newY = player.y + dy;

      if (!this.checkWallCollision(newX, player.y, player.radius)) {
        player.x = newX;
      }
      if (!this.checkWallCollision(player.x, newY, player.radius)) {
        player.y = newY;
      }

      if (player.knockbackTimer <= 0) {
        player.knockback = null;
      }
      return;
    }

    const input = this.state.input;
    let dx = 0;
    let dy = 0;

    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const moveDistance = player.speed * deltaTime;
    const newX = player.x + dx * moveDistance;
    const newY = player.y + dy * moveDistance;

    if (!this.checkWallCollision(newX, player.y, player.radius)) {
      player.x = newX;
    }
    if (!this.checkWallCollision(player.x, newY, player.radius)) {
      player.y = newY;
    }
  }

  private checkWallCollision(x: number, y: number, radius: number): boolean {
    const { rooms, corridors } = this.state.roomData;
    const statusBarHeight = 50;
    const padding = 20;

    const minX = padding;
    const maxX = this.canvasWidth - padding;
    const minY = statusBarHeight + padding;
    const maxY = this.canvasHeight - padding;

    if (x - radius < minX || x + radius > maxX || y - radius < minY || y + radius > maxY) {
      return true;
    }

    for (const room of rooms) {
      if (this.isInRoom(x, y, room)) {
        return false;
      }
    }

    for (const corridor of corridors) {
      if (this.isInCorridor(x, y, corridor, radius)) {
        return false;
      }
    }

    return true;
  }

  private isInRoom(x: number, y: number, room: Room): boolean {
    return (
      x >= room.x &&
      x <= room.x + room.width &&
      y >= room.y &&
      y <= room.y + room.height
    );
  }

  private isInCorridor(x: number, y: number, corridor: { from: Position; to: Position }, radius: number): boolean {
    const corridorWidth = 16;
    const minX = Math.min(corridor.from.x, corridor.to.x) - corridorWidth / 2 + radius;
    const maxX = Math.max(corridor.from.x, corridor.to.x) + corridorWidth / 2 - radius;
    const minY = Math.min(corridor.from.y, corridor.to.y) - corridorWidth / 2 + radius;
    const maxY = Math.max(corridor.from.y, corridor.to.y) + corridorWidth / 2 - radius;

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  private updateEnemies(deltaTime: number): void {
    const commands: MoveCommand[] = this.aiPatrol.updateAll(this.state.enemies, deltaTime);

    for (const command of commands) {
      const enemy = this.state.enemies.find(e => e.id === command.enemyId);
      if (enemy) {
        enemy.x += command.dx;
        enemy.y += command.dy;
      }
    }
  }

  private checkCollisions(): void {
    const player = this.state.player;

    for (const enemy of this.state.enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDistance = player.radius + enemy.size / 2;

      if (distance < collisionDistance && !player.isHit && !player.knockback) {
        player.isHit = true;
        player.hitTimer = HIT_DURATION;

        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        player.knockback = { x: dx / len, y: dy / len };
        player.knockbackTimer = HIT_DURATION;
      }
    }
  }

  private updatePlayerRoom(): void {
    const player = this.state.player;
    const { rooms } = this.state.roomData;

    for (const room of rooms) {
      if (this.isInRoom(player.x, player.y, room)) {
        player.currentRoom = { x: room.gridX, y: room.gridY };
        break;
      }
    }
  }

  private getJitter(): Position {
    return {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    };
  }

  private render(): void {
    const { roomData, player, enemies, fps, isTransitioning, transitionPhase, transitionTimer } = this.state;

    let transitionAlpha = 0;
    if (isTransitioning) {
      if (transitionPhase === 'out') {
        transitionAlpha = 1 - transitionTimer / TRANSITION_DURATION;
      } else {
        transitionAlpha = transitionTimer / TRANSITION_DURATION;
      }
    }

    const renderData: RenderData = {
      roomData,
      player,
      enemies,
      currentRoomCoord: player.currentRoom,
      enemyCount: enemies.length,
      fps,
      transitionAlpha,
      playerJitter: this.getJitter(),
      enemyJitters: enemies.map(() => this.getJitter())
    };

    this.onRender(renderData);
  }

  getRoomData(): RoomData {
    return this.state.roomData;
  }

  getPlayer(): Player {
    return this.state.player;
  }

  getEnemies(): Enemy[] {
    return this.state.enemies;
  }
}

export default GameEngine;
