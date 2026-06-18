import {
  GameState,
  Fireball,
  IceWall,
  Lightning,
  Explosion,
  Position,
  ELEMENT_COLORS
} from './types';
import { Player } from './Player';
import { EnemyManager } from './Enemy';
import { UIManager } from './UIManager';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemyManager: EnemyManager;
  private uiManager: UIManager;
  private state: GameState;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private explosionIdCounter = 0;
  private running: boolean = false;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;

    this.player = new Player(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    this.enemyManager = new EnemyManager();
    this.uiManager = new UIManager(ctx);

    this.state = {
      player: this.player.state,
      enemies: [],
      fragments: [],
      fireballs: [],
      iceWalls: [],
      lightnings: [],
      explosions: [],
      score: 0,
      kills: 0,
      gameTime: 0,
      enemySpawnTimer: 0,
      nextSpawnTime: 180,
      maxEnemies: 20,
      keys: new Set<string>(),
      leftPanelOpen: true,
      rightPanelOpen: true,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.state.keys.add(e.key);

      if (e.key === 'q' || e.key === 'Q') {
        this.player.switchForm();
      }
      if (e.key === 'j' || e.key === 'J') {
        const skill = this.player.useSkill();
        if (skill) {
          this.addSkill(skill);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.state.keys.delete(e.key);
    });

    window.addEventListener('resize', () => {
      this.state.screenWidth = window.innerWidth;
      this.state.screenHeight = window.innerHeight;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.uiManager.handleClick(x, y, this.state);
    });
  }

  private addSkill(skill: Fireball | IceWall | Lightning): void {
    if ('velocity' in skill) {
      this.state.fireballs.push(skill as Fireball);
    } else if ('duration' in skill && 'width' in skill && !('segments' in skill)) {
      this.state.iceWalls.push(skill as IceWall);
    } else if ('segments' in skill) {
      this.state.lightnings.push(skill as Lightning);
      this.checkLightningHit(skill as Lightning);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.state.gameTime += deltaTime;

    this.player.update(this.state.keys, deltaTime);
    this.enemyManager.update(this.player.getPosition(), deltaTime);

    this.updateFireballs();
    this.updateIceWalls();
    this.updateLightnings();
    this.updateExplosions();

    this.checkEnemyPlayerCollision();
    this.checkFragmentCollection();
    this.checkIceWallEnemyCollision();

    this.state.enemies = this.enemyManager.getEnemies();
    this.state.fragments = this.enemyManager.getFragments();
    this.state.enemySpawnTimer = this.enemyManager.getSpawnTimer();
    this.state.nextSpawnTime = this.enemyManager.getNextSpawnTime();
  }

  private updateFireballs(): void {
    const activeFireballs: Fireball[] = [];

    for (const fireball of this.state.fireballs) {
      fireball.position.x += fireball.velocity.x;
      fireball.position.y += fireball.velocity.y;
      fireball.traveled += Math.sqrt(
        fireball.velocity.x * fireball.velocity.x +
        fireball.velocity.y * fireball.velocity.y
      );

      if (fireball.traveled >= fireball.range ||
          fireball.position.x < -20 || fireball.position.x > ARENA_WIDTH + 20 ||
          fireball.position.y < -20 || fireball.position.y > ARENA_HEIGHT + 20) {
        continue;
      }

      let hit = false;
      for (const enemy of this.state.enemies) {
        if (!enemy.active || enemy.flashing) continue;

        const dx = fireball.position.x - enemy.position.x;
        const dy = fireball.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < fireball.radius + this.enemyManager.getEnemySize() / 2) {
          this.createExplosion(fireball.position);
          if (this.enemyManager.hitEnemy(enemy.id)) {
            this.state.kills++;
            this.state.score += 10;
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        activeFireballs.push(fireball);
      }
    }

    this.state.fireballs = activeFireballs;
  }

  private updateIceWalls(): void {
    const activeWalls: IceWall[] = [];

    for (const wall of this.state.iceWalls) {
      wall.duration--;
      if (wall.duration > 0) {
        activeWalls.push(wall);
      }
    }

    this.state.iceWalls = activeWalls;
  }

  private checkIceWallEnemyCollision(): void {
    for (const wall of this.state.iceWalls) {
      for (const enemy of this.state.enemies) {
        if (!enemy.active || enemy.frozen || enemy.flashing) continue;

        const dx = enemy.position.x - wall.position.x;
        const dy = enemy.position.y - wall.position.y;

        const rotatedX = dx * Math.cos(-wall.angle) - dy * Math.sin(-wall.angle);
        const rotatedY = dx * Math.sin(-wall.angle) + dy * Math.cos(-wall.angle);

        const halfW = wall.width / 2;
        const halfH = wall.height / 2;
        const enemyRadius = this.enemyManager.getEnemySize() / 2;

        if (Math.abs(rotatedX) < halfW + enemyRadius && Math.abs(rotatedY) < halfH + enemyRadius) {
          this.enemyManager.freezeEnemy(enemy.id);
        }
      }
    }
  }

  private updateLightnings(): void {
    const activeLightnings: Lightning[] = [];

    for (const lightning of this.state.lightnings) {
      lightning.duration--;
      if (lightning.duration > 0) {
        activeLightnings.push(lightning);
      }
    }

    this.state.lightnings = activeLightnings;
  }

  private checkLightningHit(lightning: Lightning): void {
    for (const enemy of this.state.enemies) {
      if (!enemy.active || enemy.flashing) continue;

      const dist = this.pointToLineDistance(
        enemy.position,
        lightning.start,
        lightning.end
      );

      if (dist < this.enemyManager.getEnemySize() / 2 + 10) {
        if (this.enemyManager.hitEnemy(enemy.id, true)) {
          this.state.kills++;
          this.state.score += 10;
        }
      }
    }
  }

  private pointToLineDistance(point: Position, lineStart: Position, lineEnd: Position): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private updateExplosions(): void {
    const activeExplosions: Explosion[] = [];

    for (const exp of this.state.explosions) {
      exp.duration--;
      if (exp.duration > 0) {
        activeExplosions.push(exp);
      }
    }

    this.state.explosions = activeExplosions;
  }

  private createExplosion(position: Position): void {
    this.state.explosions.push({
      id: this.explosionIdCounter++,
      position: { ...position },
      radius: 0,
      maxRadius: 25,
      duration: 15,
      maxDuration: 15
    });
  }

  private checkEnemyPlayerCollision(): void {
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getRadius();

    const hitEnemy = this.enemyManager.checkPlayerCollision(playerPos, playerRadius);
    if (hitEnemy) {
      this.player.takeDamage(10);
    }
  }

  private checkFragmentCollection(): void {
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getRadius();

    const fragment = this.enemyManager.checkFragmentCollection(playerPos, playerRadius);
    if (fragment) {
      this.player.collectFragment(fragment);
      this.state.score += 5;
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.uiManager.render(this.state);
  }

  getState(): GameState {
    return this.state;
  }

  getFPS(): number {
    return this.fps;
  }
}
