import { Renderer, type ToolType, type Tile, type Enemy, type Collectible, type LevelData, type Player, type Particle, type TerrainType } from './renderer';
import { LevelEditor } from './editor';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const TILE_SIZE = 40;
const EDITOR_OFFSET_X = 0;
const EDITOR_OFFSET_Y = 0;
const GRAVITY = 0.5;
const JUMP_VELOCITY = -8;
const MOVE_SPEED = 3;
const TRANSITION_DURATION = 0.3;
const DEATH_DURATION = 0.5;
const COLLECT_ANIM_DURATION = 0.3;

type GameMode = 'editor' | 'game';

interface GameState {
  mode: GameMode;
  level: LevelData;
  player: Player;
  score: number;
  particles: Particle[];
  hoverTile: { x: number; y: number } | null;
  currentTool: ToolType;
  transitionAlpha: number;
  isTransitioning: boolean;
  targetMode: GameMode;
  transitionTimer: number;
  keys: Set<string>;
  particleMaxCount: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private editor: LevelEditor;
  private state: GameState;
  private lastTime: number = 0;
  private animationId: number = 0;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private scoreDisplay: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private btnEdit: HTMLElement | null = null;
  private btnPlay: HTMLElement | null = null;
  private hintText: HTMLElement | null = null;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);

    const initialLevel = this.createDefaultLevel();

    this.state = {
      mode: 'editor',
      level: initialLevel,
      player: this.createPlayer(initialLevel),
      score: 0,
      particles: [],
      hoverTile: null,
      currentTool: 'brick',
      transitionAlpha: 0,
      isTransitioning: false,
      targetMode: 'editor',
      transitionTimer: 0,
      keys: new Set(),
      particleMaxCount: 10,
    };

    this.editor = new LevelEditor(
      canvas,
      GRID_WIDTH,
      GRID_HEIGHT,
      TILE_SIZE,
      {
        onLevelChange: (level) => this.handleLevelChange(level),
        onHoverChange: (tile) => this.handleHoverChange(tile),
        onToolChange: (tool) => this.handleToolChange(tool),
      },
      EDITOR_OFFSET_X,
      EDITOR_OFFSET_Y
    );
  }

  private createDefaultLevel(): LevelData {
    const tiles: Tile[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      tiles.push({ x, y: GRID_HEIGHT - 1, type: 'grass' });
      tiles.push({ x, y: GRID_HEIGHT - 2, type: 'brick' });
    }
    tiles.push({ x: 5, y: GRID_HEIGHT - 5, type: 'platform' });
    tiles.push({ x: 6, y: GRID_HEIGHT - 5, type: 'platform' });
    tiles.push({ x: 7, y: GRID_HEIGHT - 5, type: 'platform' });
    tiles.push({ x: 10, y: GRID_HEIGHT - 7, type: 'platform' });
    tiles.push({ x: 11, y: GRID_HEIGHT - 7, type: 'platform' });
    tiles.push({ x: 14, y: GRID_HEIGHT - 3, type: 'spike' });
    tiles.push({ x: 15, y: GRID_HEIGHT - 3, type: 'spike' });

    return {
      tiles,
      enemies: [
        {
          x: 8,
          y: GRID_HEIGHT - 2,
          patrolLeft: 7,
          patrolRight: 11,
          speed: 0.02,
          direction: 1,
          initialX: 8,
        },
      ],
      collectibles: [
        { x: 6, y: GRID_HEIGHT - 6, collected: false, rotation: 0, collectAnim: 0 },
        { x: 11, y: GRID_HEIGHT - 8, collected: false, rotation: 0, collectAnim: 0 },
        { x: 16, y: GRID_HEIGHT - 5, collected: false, rotation: 0, collectAnim: 0 },
      ],
      spawnPoint: { x: 2, y: GRID_HEIGHT - 3 },
    };
  }

  private createPlayer(level: LevelData): Player {
    return {
      x: level.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2 - 8,
      y: level.spawnPoint.y * TILE_SIZE,
      vx: 0,
      vy: 0,
      width: 16,
      height: 32,
      isDead: false,
      deathTimer: 0,
      onGround: false,
      facing: 1,
      animFrame: 0,
    };
  }

  init(): void {
    this.editor.initToolbar('terrain-tools', 'entity-tools', 'utility-tools');

    this.scoreDisplay = document.getElementById('score-display');
    this.toolbar = document.getElementById('editor-toolbar');
    this.btnEdit = document.getElementById('btn-edit');
    this.btnPlay = document.getElementById('btn-play');
    this.hintText = document.getElementById('hint-text');

    this.btnEdit?.addEventListener('click', () => this.switchMode('editor'));
    this.btnPlay?.addEventListener('click', () => this.switchMode('game'));

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.updateUI();
    this.start();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.state.keys.add(e.key.toLowerCase());

    if (e.key === '1' && !this.state.isTransitioning) {
      this.switchMode('editor');
    } else if (e.key === '2' && !this.state.isTransitioning) {
      this.switchMode('game');
    }

    if ((e.key === 'w' || e.key === 'W' || e.key === ' ') && this.state.mode === 'game') {
      if (this.state.player.onGround && !this.state.player.isDead) {
        this.state.player.vy = JUMP_VELOCITY;
        this.state.player.onGround = false;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.state.keys.delete(e.key.toLowerCase());
  };

  private handleLevelChange(level: LevelData): void {
    this.state.level = level;
  }

  private handleHoverChange(tile: { x: number; y: number } | null): void {
    this.state.hoverTile = tile;
  }

  private handleToolChange(tool: ToolType): void {
    this.state.currentTool = tool;
  }

  switchMode(target: GameMode): void {
    if (this.state.isTransitioning || this.state.mode === target) return;

    this.state.isTransitioning = true;
    this.state.targetMode = target;
    this.state.transitionTimer = 0;
    this.state.transitionAlpha = 0;

    if (target === 'game') {
      this.resetPlayer();
    }
  }

  private resetPlayer(): void {
    const level = this.editor.getLevel();
    this.state.level = level;
    this.state.level.collectibles.forEach((c) => {
      c.collected = false;
      c.collectAnim = 0;
      c.rotation = 0;
    });
    this.state.level.enemies.forEach((e) => {
      e.x = e.initialX;
      e.direction = 1;
    });
    this.state.player = this.createPlayer(level);
    this.state.score = 0;
    this.state.particles = [];
    this.updateScoreUI();
  }

  private updateUI(): void {
    const isEditor = this.state.mode === 'editor';
    this.btnEdit?.classList.toggle('active', isEditor);
    this.btnPlay?.classList.toggle('active', !isEditor);

    if (this.toolbar) {
      this.toolbar.style.display = isEditor ? 'flex' : 'none';
    }
    if (this.scoreDisplay) {
      this.scoreDisplay.style.display = isEditor ? 'none' : 'block';
    }
    if (this.hintText) {
      this.hintText.textContent = isEditor
        ? '快捷键: 1=编辑 2=游玩 | 左键放置 右键擦除 | 可拖拽连续绘制'
        : '快捷键: 1=编辑 2=游玩 | A/D=移动 W/空格=跳跃 | 收集星星 避开尖刺';
    }
  }

  private updateScoreUI(): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = `分数: ${this.state.score}`;
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (currentTime: number): void => {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.updateFPS(dt);
    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private updateFPS(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;

    if (this.fpsTime >= 1) {
      this.currentFps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      if (this.state.mode === 'game') {
        if (this.currentFps < 50 && this.state.particleMaxCount > 5) {
          this.state.particleMaxCount = 5;
        } else if (this.currentFps >= 58 && this.state.particleMaxCount < 10) {
          this.state.particleMaxCount = 10;
        }
      }
    }
  }

  private update(dt: number): void {
    if (this.state.isTransitioning) {
      this.updateTransition(dt);
      return;
    }

    if (this.state.mode === 'game') {
      this.updateGame(dt);
    } else {
      this.updateEditor(dt);
    }
  }

  private updateTransition(dt: number): void {
    this.state.transitionTimer += dt;
    const progress = this.state.transitionTimer / TRANSITION_DURATION;

    if (progress < 0.5) {
      this.state.transitionAlpha = progress * 2;
    } else {
      if (this.state.mode !== this.state.targetMode) {
        this.state.mode = this.state.targetMode;
        this.editor.setLevel(this.state.level);
        this.updateUI();
      }
      this.state.transitionAlpha = 1 - (progress - 0.5) * 2;
    }

    if (progress >= 1) {
      this.state.isTransitioning = false;
      this.state.transitionAlpha = 0;
      this.state.transitionTimer = 0;
    }
  }

  private updateGame(dt: number): void {
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
  }

  private updatePlayer(dt: number): void {
    const player = this.state.player;

    if (player.isDead) {
      player.deathTimer -= dt;
      if (player.deathTimer <= 0) {
        this.respawnPlayer();
      }
      return;
    }

    let moveX = 0;
    if (this.state.keys.has('a') || this.state.keys.has('arrowleft')) {
      moveX -= MOVE_SPEED;
      player.facing = -1;
    }
    if (this.state.keys.has('d') || this.state.keys.has('arrowright')) {
      moveX += MOVE_SPEED;
      player.facing = 1;
    }

    player.vx = moveX;
    player.vy += GRAVITY;

    if (player.vy > 12) player.vy = 12;

    const newX = player.x + player.vx;
    const newY = player.y + player.vy;

    player.onGround = false;

    player.x = newX;
    this.resolveHorizontalCollision(player);

    player.y = newY;
    this.resolveVerticalCollision(player);

    const levelWidth = GRID_WIDTH * TILE_SIZE;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;

    if (player.y > GRID_HEIGHT * TILE_SIZE) {
      this.killPlayer();
    }

    this.checkEnemyCollision();
    this.checkSpikeCollision();
    this.checkCollectibleCollision();
  }

  private resolveHorizontalCollision(player: Player): void {
    const tiles = this.state.level.tiles.filter(
      (t) => t.type !== 'spike' && this.isSolidTile(t.type)
    );

    for (const tile of tiles) {
      const tileX = tile.x * TILE_SIZE;
      const tileY = tile.y * TILE_SIZE;

      if (
        player.x < tileX + TILE_SIZE &&
        player.x + player.width > tileX &&
        player.y < tileY + TILE_SIZE &&
        player.y + player.height > tileY
      ) {
        if (player.vx > 0) {
          player.x = tileX - player.width;
        } else if (player.vx < 0) {
          player.x = tileX + TILE_SIZE;
        }
        player.vx = 0;
      }
    }
  }

  private resolveVerticalCollision(player: Player): void {
    const tiles = this.state.level.tiles.filter(
      (t) => t.type !== 'spike' && this.isSolidTile(t.type)
    );

    for (const tile of tiles) {
      const tileX = tile.x * TILE_SIZE;
      const tileY = tile.y * TILE_SIZE;

      if (
        player.x < tileX + TILE_SIZE &&
        player.x + player.width > tileX &&
        player.y < tileY + TILE_SIZE &&
        player.y + player.height > tileY
      ) {
        if (player.vy > 0) {
          player.y = tileY - player.height;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = tileY + TILE_SIZE;
          player.vy = 0;
        }
      }
    }
  }

  private isSolidTile(type: TerrainType): boolean {
    return type === 'brick' || type === 'grass' || type === 'platform';
  }

  private checkEnemyCollision(): void {
    const player = this.state.player;

    for (const enemy of this.state.level.enemies) {
      const ex = enemy.x * TILE_SIZE + TILE_SIZE * 0.1;
      const ey = enemy.y * TILE_SIZE + TILE_SIZE * 0.2;
      const ew = TILE_SIZE * 0.8;
      const eh = TILE_SIZE * 0.75;

      if (
        player.x < ex + ew &&
        player.x + player.width > ex &&
        player.y < ey + eh &&
        player.y + player.height > ey
      ) {
        this.killPlayer();
        return;
      }
    }
  }

  private checkSpikeCollision(): void {
    const player = this.state.player;

    for (const tile of this.state.level.tiles) {
      if (tile.type !== 'spike') continue;

      const tileX = tile.x * TILE_SIZE + TILE_SIZE * 0.15;
      const tileY = tile.y * TILE_SIZE + TILE_SIZE * 0.3;
      const tileW = TILE_SIZE * 0.7;
      const tileH = TILE_SIZE * 0.65;

      if (
        player.x < tileX + tileW &&
        player.x + player.width > tileX &&
        player.y < tileY + tileH &&
        player.y + player.height > tileY
      ) {
        this.killPlayer();
        return;
      }
    }
  }

  private checkCollectibleCollision(): void {
    const player = this.state.player;

    for (const collectible of this.state.level.collectibles) {
      if (collectible.collected && collectible.collectAnim <= 0) continue;

      const cx = collectible.x * TILE_SIZE + TILE_SIZE * 0.25;
      const cy = collectible.y * TILE_SIZE + TILE_SIZE * 0.25;
      const cw = TILE_SIZE * 0.5;
      const ch = TILE_SIZE * 0.5;

      if (
        !collectible.collected &&
        player.x < cx + cw &&
        player.x + player.width > cx &&
        player.y < cy + ch &&
        player.y + player.height > cy
      ) {
        collectible.collected = true;
        collectible.collectAnim = COLLECT_ANIM_DURATION;
        this.state.score += 100;
        this.updateScoreUI();
        this.spawnCollectParticles(cx + cw / 2, cy + ch / 2);
      }
    }
  }

  private spawnCollectParticles(x: number, y: number): void {
    const count = Math.min(8, this.state.particleMaxCount);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0.5,
        maxLife: 0.5,
        color: '#FFD700',
        size: 3 + Math.random() * 2,
      });
    }

    while (this.state.particles.length > this.state.particleMaxCount * 3) {
      this.state.particles.shift();
    }
  }

  private killPlayer(): void {
    if (this.state.player.isDead) return;
    this.state.player.isDead = true;
    this.state.player.deathTimer = DEATH_DURATION;
    this.state.player.vx = 0;
    this.state.player.vy = -3;
  }

  private respawnPlayer(): void {
    const level = this.editor.getLevel();
    this.state.player = this.createPlayer(level);
    this.state.level.collectibles.forEach((c) => {
      if (!c.collected) return;
    });
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.state.level.enemies) {
      enemy.x += enemy.speed * enemy.direction * dt * 60;

      if (enemy.x <= enemy.patrolLeft) {
        enemy.x = enemy.patrolLeft;
        enemy.direction = 1;
      } else if (enemy.x >= enemy.patrolRight) {
        enemy.x = enemy.patrolRight;
        enemy.direction = -1;
      }
    }
  }

  private updateCollectibles(dt: number): void {
    for (const c of this.state.level.collectibles) {
      if (!c.collected) {
        c.rotation += dt * 2;
      }
      if (c.collectAnim > 0) {
        c.collectAnim -= dt;
        if (c.collectAnim < 0) c.collectAnim = 0;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY * 0.3;
      p.life -= dt;

      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private updateEditor(dt: number): void {
    for (const c of this.state.level.collectibles) {
      if (!c.collected) {
        c.rotation += dt * 2;
      }
    }
  }

  private render(): void {
    this.renderer.clear();

    const offsetX = this.state.mode === 'editor' ? EDITOR_OFFSET_X : 0;
    const offsetY = this.state.mode === 'editor' ? EDITOR_OFFSET_Y : 0;

    this.renderer.render({
      mode: this.state.mode,
      level: this.state.level,
      player: this.state.player,
      score: this.state.score,
      particles: this.state.particles,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      tileSize: TILE_SIZE,
      hoverTile: this.state.mode === 'editor' ? this.state.hoverTile : null,
      currentTool: this.state.currentTool,
      transitionAlpha: this.state.transitionAlpha,
      offsetX,
      offsetY,
    });
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.editor.destroy();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

const game = new Game();

window.addEventListener('DOMContentLoaded', () => {
  game.init();
});

export { game };
