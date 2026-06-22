import type { GameState, Player, Enemy, DungeonData, RenderData } from '../types';
import { generateDungeon, getRoomAtPosition, isWalkable } from '../modules/dungeon-generator';
import { spawnEntities } from '../modules/entity-spawner';
import { updateAllEnemies } from '../modules/ai-patrol';
import { CanvasRenderer } from '../renderers/canvas-renderer';

const HIT_DURATION = 0.3;
const TRANSITION_DURATION = 0.3;
const KNOCKBACK_DISTANCE = 30;
const ENEMY_SPEED = 80;

export class GameEngine {
  private state: GameState;
  private renderer: CanvasRenderer;
  private keys: Set<string> = new Set();
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private seed: number = Date.now();
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new CanvasRenderer(canvas);

    const dungeon = generateDungeon(this.seed);
    const { player, enemies } = spawnEntities(dungeon, this.seed);

    this.state = {
      dungeon,
      player,
      enemies,
      isTransitioning: false,
      transitionAlpha: 0,
      transitionDirection: 'in',
      fps: 60
    };

    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());

      if (e.key.toLowerCase() === 'r' && !this.state.isTransitioning) {
        this.startRegeneration();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.fpsFrames++;
    if (currentTime - this.fpsTime >= 1000) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTime = currentTime;
    }

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  public update(deltaTime: number): void {
    if (this.state.isTransitioning) {
      this.updateTransition(deltaTime);
      return;
    }

    this.updatePlayer(deltaTime);
    this.state.enemies = this.updateEnemies(this.state.enemies, deltaTime);
    this.checkCollisions();
    this.updateCurrentRoom();
  }

  private updateTransition(deltaTime: number): void {
    const transitionSpeed = 1 / TRANSITION_DURATION;

    if (this.state.transitionDirection === 'out') {
      this.state.transitionAlpha += transitionSpeed * deltaTime;
      if (this.state.transitionAlpha >= 1) {
        this.state.transitionAlpha = 1;
        this.regenerateDungeon();
        this.state.transitionDirection = 'in';
      }
    } else {
      this.state.transitionAlpha -= transitionSpeed * deltaTime;
      if (this.state.transitionAlpha <= 0) {
        this.state.transitionAlpha = 0;
        this.state.isTransitioning = false;
      }
    }
  }

  private updatePlayer(deltaTime: number): void {
    const player = this.state.player;

    if (player.hitTimer > 0) {
      player.hitTimer -= deltaTime;
      if (player.hitTimer <= 0) {
        player.isHit = false;
      }
    }

    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    const moveDistance = player.speed * deltaTime;
    const newX = player.x + dx * moveDistance;
    const newY = player.y + dy * moveDistance;

    if (isWalkable(this.state.dungeon, newX, player.y, player.radius)) {
      player.x = newX;
    }
    if (isWalkable(this.state.dungeon, player.x, newY, player.radius)) {
      player.y = newY;
    }

    player.velocityX = dx;
    player.velocityY = dy;
  }

  public updateEnemies(enemies: Enemy[], deltaTime: number): Enemy[] {
    return updateAllEnemies(enemies, deltaTime, ENEMY_SPEED);
  }

  private checkCollisions(): void {
    const player = this.state.player;

    if (player.isHit) return;

    for (const enemy of this.state.enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.radius + enemy.size * 0.7) {
        this.onPlayerHit(enemy);
        break;
      }
    }
  }

  private onPlayerHit(enemy: Enemy): void {
    const player = this.state.player;
    player.isHit = true;
    player.hitTimer = HIT_DURATION;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const knockbackX = (dx / distance) * KNOCKBACK_DISTANCE;
      const knockbackY = (dy / distance) * KNOCKBACK_DISTANCE;

      const targetX = player.x + knockbackX;
      const targetY = player.y + knockbackY;

      if (isWalkable(this.state.dungeon, targetX, player.y, player.radius)) {
        player.x = targetX;
      }
      if (isWalkable(this.state.dungeon, player.x, targetY, player.radius)) {
        player.y = targetY;
      }
    }
  }

  private updateCurrentRoom(): void {
    const player = this.state.player;
    const room = getRoomAtPosition(this.state.dungeon, player.x, player.y);
    if (room) {
      player.currentRoomId = room.id;
    }
  }

  private startRegeneration(): void {
    this.state.isTransitioning = true;
    this.state.transitionDirection = 'out';
    this.state.transitionAlpha = 0;
  }

  private regenerateDungeon(): void {
    this.seed = Date.now();
    const dungeon = generateDungeon(this.seed);
    const { player, enemies } = spawnEntities(dungeon, this.seed);

    this.state.dungeon = dungeon;
    this.state.player = player;
    this.state.enemies = enemies;
  }

  public render(): void {
    const renderData: RenderData = {
      dungeon: this.state.dungeon,
      player: this.state.player,
      enemies: this.state.enemies,
      currentRoomId: this.state.player.currentRoomId,
      fps: this.currentFps,
      transitionAlpha: this.state.transitionAlpha
    };

    this.renderer.render(renderData);
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getDungeon(): DungeonData {
    return this.state.dungeon;
  }

  public getPlayer(): Player {
    return { ...this.state.player };
  }

  public getEnemies(): Enemy[] {
    return [...this.state.enemies];
  }
}
