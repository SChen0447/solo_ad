/**
 * GameScene - Phaser 主游戏场景
 *
 * 职责：
 *   - 管理迷宫渲染（墙壁/地板）、玩家、金币、出口、AI巡逻者
 *   - 接收键盘/虚拟方向键输入，处理玩家移动（网格对齐）
 *   - 每帧执行碰撞检测（金币收集/AI碰撞/到达出口）
 *   - 根据收集金币数量动态生成AI（最多5个）
 *   - AI从巡逻路径动态切换为追逐路径（玩家3格内）
 *   - 多人模式通过Socket.IO同步玩家位置
 *   - 事件发射给 HUDPanel 更新HUD，调用 ScoreManager 提交得分
 *
 * 数据流向：
 *   用户输入 → 玩家网格移动 → 碰撞检测 → 更新状态
 *     → 触发 ScoreManager.addCoin() / stopTiming()
 *     → 触发 HUDPanel.updateXxx() DOM 更新
 *   MazeService.fetchMaze() → 返回迷宫数据 → 本场景渲染
 *
 * 调用关系：
 *   调用 MazeService.fetchMaze() 获取迷宫
 *   调用 ScoreManager 记录/提交得分
 *   通过 onHUD 回调更新 HUDPanel
 */

import Phaser from 'phaser';
import type { MazeData, CellPos } from '../core/MazeService';
import { MazeService } from '../core/MazeService';
import type { ScoreManager, SubmitResult } from '../api/ScoreManager';

export interface GameSceneEvents {
  onUpdateTime: (ms: number) => void;
  onUpdateCoins: (count: number) => void;
  onUpdateRank: (rank: number | string) => void;
  onUpdatePlayers: (count: number) => void;
  onSetTotalCoins: (total: number) => void;
  onShowResult: (
    finished: boolean,
    timeMs: number,
    coins: number,
    submitResult: SubmitResult | null
  ) => void;
}

const COLORS = {
  wall: 0x2d2d2d,
  floor: 0xe0e0e0,
  coin: 0xffd700,
  exit: 0x00ff88,
  ai: 0xff3355,
  player: 0x8a2be2,
  otherPlayers: [0x3498db, 0x2ecc71, 0xff6b9d, 0x9b59b6],
};

interface PlayerState {
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  moveT: number;
  fromX: number;
  fromY: number;
  sprite: Phaser.GameObjects.Graphics | null;
}

interface CoinObj {
  pos: CellPos;
  collected: boolean;
  graphic: Phaser.GameObjects.Graphics;
  angle: number;
}

interface AIObj {
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  moveT: number;
  fromX: number;
  fromY: number;
  patrolPath: CellPos[];
  patrolIdx: number;
  chasing: boolean;
  graphic: Phaser.GameObjects.Graphics;
  pulse: number;
  moveCooldown: number;
}

interface RemotePlayer {
  id: string;
  name: string;
  color: number;
  gridX: number;
  gridY: number;
  graphic: Phaser.GameObjects.Graphics;
  lastSeen: number;
}

const MOVE_DURATION = 140; // ms per tile
const AI_MOVE_DURATION = 200;
const MAX_AI = 5;
const CHASE_RANGE = 3;

export class GameScene extends Phaser.Scene {
  private maze: MazeData | null = null;
  private tileSize: number = 48;
  private mazeOffset: { x: number; y: number } = { x: 0, y: 0 };

  private mazeLayer: Phaser.GameObjects.Graphics | null = null;
  private floorLayer: Phaser.GameObjects.Graphics | null = null;
  private exitGraphic: Phaser.GameObjects.Graphics | null = null;

  private player!: PlayerState;
  private coins: CoinObj[] = [];
  private ais: AIObj[] = [];
  private remotePlayers: Map<string, RemotePlayer> = new Map();

  private inputDir: { up: boolean; down: boolean; left: boolean; right: boolean } = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private events_: GameSceneEvents;
  private scoreMgr: ScoreManager;
  private running: boolean = false;
  private gameOver: boolean = false;

  private playerColor: number = COLORS.player;
  private playerName: string = '匿名玩家';
  private seed: number = 0;
  private mobileDpad: any = null;
  private pendingResult: SubmitResult | null = null;

  constructor(events: GameSceneEvents, scoreMgr: ScoreManager) {
    super({ key: 'GameScene' });
    this.events_ = events;
    this.scoreMgr = scoreMgr;
  }

  preload() {}

  async initNewGame(playerName: string, seed?: number) {
    this.playerName = playerName || '匿名玩家';
    this.gameOver = false;
    this.running = false;
    this.coins = [];
    this.ais = [];
    this.remotePlayers.forEach((rp) => rp.graphic.destroy());
    this.remotePlayers.clear();
    this.pendingResult = null;

    this.seed = seed ?? Math.floor(Math.random() * 0x7fffffff);

    try {
      this.maze = await MazeService.fetchMaze(this.seed, 10);
    } catch {
      this.maze = MazeService.localGenerate(this.seed, 10);
    }

    this.events_.onSetTotalCoins(this.maze.coins.length);
    this.events_.onUpdatePlayers(1 + this.remotePlayers.size);

    this.scene.restart();
  }

  create() {
    if (!this.maze) {
      this.add.text(400, 300, '加载中...', { color: '#fff', fontSize: '24px' }).setOrigin(0.5);
      return;
    }

    this.computeLayout();
    this.drawFloor();
    this.drawMaze();
    this.drawExit();
    this.spawnCoins();
    this.spawnInitialAIs();
    this.spawnPlayer();
    this.setupInput();

    this.running = true;
    this.gameOver = false;
    this.scoreMgr.startTiming(this.seed);
    this.events_.onUpdateTime(0);
    this.events_.onUpdateCoins(0);
    this.events_.onUpdateRank('-');
  }

  private computeLayout() {
    const { width, height } = this.scale;
    const m = this.maze!;
    const maxTileW = (width - 80) / m.size;
    const maxTileH = (height - 160) / m.size;
    this.tileSize = Math.max(24, Math.floor(Math.min(maxTileW, maxTileH)));
    const totalW = this.tileSize * m.size;
    const totalH = this.tileSize * m.size;
    this.mazeOffset.x = (width - totalW) / 2;
    this.mazeOffset.y = (height - totalH) / 2 + 20;
  }

  private gridToPx(x: number, y: number): { px: number; py: number } {
    return {
      px: this.mazeOffset.x + x * this.tileSize + this.tileSize / 2,
      py: this.mazeOffset.y + y * this.tileSize + this.tileSize / 2,
    };
  }

  private drawFloor() {
    if (this.floorLayer) this.floorLayer.destroy();
    const g = this.add.graphics();
    const m = this.maze!;
    const s = this.tileSize;
    for (let y = 0; y < m.size; y++) {
      for (let x = 0; x < m.size; x++) {
        if (m.grid[y][x] === 0) {
          const { px, py } = this.gridToPx(x, y);
          g.fillStyle(COLORS.floor, 1);
          g.fillRect(px - s / 2, py - s / 2, s, s);
        }
      }
    }
    g.setDepth(-2);
    this.floorLayer = g;
  }

  private drawMaze() {
    if (this.mazeLayer) this.mazeLayer.destroy();
    const g = this.add.graphics();
    const m = this.maze!;
    const s = this.tileSize;
    for (let y = 0; y < m.size; y++) {
      for (let x = 0; x < m.size; x++) {
        if (m.grid[y][x] === 1) {
          const { px, py } = this.gridToPx(x, y);
          g.fillStyle(COLORS.wall, 1);
          g.fillRect(px - s / 2, py - s / 2, s, s);
          g.lineStyle(1, 0x000000, 0.3);
          g.strokeRect(px - s / 2 + 0.5, py - s / 2 + 0.5, s - 1, s - 1);
        }
      }
    }
    g.setDepth(-1);
    this.mazeLayer = g;
  }

  private drawExit() {
    if (this.exitGraphic) this.exitGraphic.destroy();
    const g = this.add.graphics();
    const m = this.maze!;
    const { px, py } = this.gridToPx(m.exit.x, m.exit.y);
    const s = this.tileSize * 0.78;
    const draw = (offset: number, alpha: number) => {
      g.fillStyle(COLORS.exit, alpha);
      g.fillRoundedRect(px - s / 2 + offset, py - s / 2 + offset, s - offset * 2, s - offset * 2, 6);
    };
    draw(0, 0.25);
    draw(4, 0.85);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRoundedRect(px - s / 2 + 4, py - s / 2 + 4, s - 8, s - 8, 6);
    g.setDepth(0);
    this.exitGraphic = g;
  }

  private spawnCoins() {
    this.coins.forEach((c) => c.graphic.destroy());
    this.coins = [];
    const m = this.maze!;
    for (const pos of m.coins) {
      const g = this.add.graphics();
      g.setDepth(5);
      this.coins.push({ pos, collected: false, graphic: g, angle: 0 });
    }
  }

  private drawCoin(g: Phaser.GameObjects.Graphics, px: number, py: number, size: number, angle: number) {
    g.clear();
    const points: Phaser.Math.Vector2[] = [];
    const spikes = 5;
    const outer = size * 0.42;
    const inner = size * 0.2;
    const rad = angle * (Math.PI / 180);
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = rad + (i * Math.PI) / spikes - Math.PI / 2;
      points.push(new Phaser.Math.Vector2(px + Math.cos(a) * r, py + Math.sin(a) * r));
    }
    g.fillStyle(0xfff8b0, 0.9);
    g.fillPoints(points, true);
    g.fillStyle(COLORS.coin, 1);
    const points2 = points.map((p) => {
      const dx = p.x - px;
      const dy = p.y - py;
      return new Phaser.Math.Vector2(px + dx * 0.82, py + dy * 0.82);
    });
    g.fillPoints(points2, true);
    g.lineStyle(1.5, 0xffffff, 0.8);
    g.strokePoints(points2, true);
  }

  private spawnInitialAIs() {
    this.ais.forEach((a) => a.graphic.destroy());
    this.ais = [];
    const m = this.maze!;
    const spawns = m.aiSpawns.slice(0, 1);
    for (const sp of spawns) {
      this.createAI(sp.x, sp.y);
    }
  }

  private createAI(gridX: number, gridY: number) {
    const g = this.add.graphics();
    g.setDepth(7);
    const ai: AIObj = {
      gridX,
      gridY,
      targetX: gridX,
      targetY: gridY,
      moving: false,
      moveT: 0,
      fromX: gridX,
      fromY: gridY,
      patrolPath: [],
      patrolIdx: 0,
      chasing: false,
      graphic: g,
      pulse: Math.random() * Math.PI * 2,
      moveCooldown: 300 + Math.random() * 400,
    };
    this.generatePatrol(ai);
    this.ais.push(ai);
    return ai;
  }

  private generatePatrol(ai: AIObj) {
    const m = this.maze!;
    const corridors: CellPos[] = [];
    for (let y = 0; y < m.size; y++) {
      for (let x = 0; x < m.size; x++) {
        if (m.grid[y][x] === 0 && (Math.abs(x - ai.gridX) + Math.abs(y - ai.gridY) >= 2)) {
          corridors.push({ x, y });
        }
      }
    }
    if (corridors.length === 0) {
      ai.patrolPath = [{ x: ai.gridX, y: ai.gridY }];
      return;
    }
    const target = corridors[Math.floor(Math.random() * corridors.length)];
    ai.patrolPath = MazeService.findPath(m, { x: ai.gridX, y: ai.gridY }, target);
    ai.patrolIdx = 1;
  }

  private spawnPlayer() {
    const m = this.maze!;
    const start = m.start;
    const g = this.add.graphics();
    g.setDepth(10);
    this.player = {
      gridX: start.x,
      gridY: start.y,
      targetX: start.x,
      targetY: start.y,
      moving: false,
      moveT: 0,
      fromX: start.x,
      fromY: start.y,
      sprite: g,
    };
  }

  private drawPlayer(
    g: Phaser.GameObjects.Graphics,
    px: number,
    py: number,
    size: number,
    color: number,
    glowColor: number
  ) {
    g.clear();
    const r = size * 0.36;
    g.fillStyle(glowColor, 0.3);
    g.fillCircle(px, py, r * 1.7);
    g.fillStyle(glowColor, 0.5);
    g.fillCircle(px, py, r * 1.3);
    g.fillStyle(color, 1);
    g.fillCircle(px, py, r);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(px, py, r);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(px - r * 0.3, py - r * 0.3, r * 0.25);
  }

  private drawAI(g: Phaser.GameObjects.Graphics, px: number, py: number, size: number, pulse: number) {
    g.clear();
    const s = size * 0.38;
    const scale = 1 + Math.sin(pulse) * 0.1;
    const r = s * scale;

    g.fillStyle(COLORS.ai, 0.2);
    g.fillTriangle(
      px,
      py - r * 1.6,
      px - r * 1.5,
      py + r * 1.1,
      px + r * 1.5,
      py + r * 1.1
    );
    g.fillStyle(COLORS.ai, 0.8);
    g.fillTriangle(px, py - r, px - r * 0.95, py + r * 0.7, px + r * 0.95, py + r * 0.7);
    g.lineStyle(2, 0xffcccc, 0.95);
    g.strokeTriangle(px, py - r, px - r * 0.95, py + r * 0.7, px + r * 0.95, py + r * 0.7);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(px, py + r * 0.1, r * 0.18);
  }

  private setupInput() {
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (!this.running) return;
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          this.inputDir.up = true;
          break;
        case 'arrowdown':
        case 's':
          this.inputDir.down = true;
          break;
        case 'arrowleft':
        case 'a':
          this.inputDir.left = true;
          break;
        case 'arrowright':
        case 'd':
          this.inputDir.right = true;
          break;
      }
    });

    this.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          this.inputDir.up = false;
          break;
        case 'arrowdown':
        case 's':
          this.inputDir.down = false;
          break;
        case 'arrowleft':
        case 'a':
          this.inputDir.left = false;
          break;
        case 'arrowright':
        case 'd':
          this.inputDir.right = false;
          break;
      }
    });

    this.scale.on('resize', () => {
      if (this.maze) this.computeLayout();
    });
  }

  setDirection(dir: 'up' | 'down' | 'left' | 'right' | null, pressed: boolean) {
    if (dir === null) {
      this.inputDir.up = this.inputDir.down = this.inputDir.left = this.inputDir.right = false;
      return;
    }
    this.inputDir[dir] = pressed;
  }

  update(_time: number, delta: number) {
    if (!this.running || this.gameOver || !this.maze) return;

    this.events_.onUpdateTime(this.scoreMgr.getElapsedMs());

    this.updatePlayer(delta);
    this.updateCoins(delta);
    this.updateAIs(delta);
    this.updateRemotePlayers(delta);
    this.checkCollisions();
  }

  private updatePlayer(delta: number) {
    const m = this.maze!;
    const p = this.player;

    if (p.moving) {
      p.moveT += delta;
      const t = Phaser.Math.Clamp(p.moveT / MOVE_DURATION, 0, 1);
      const ease = Phaser.Math.Easing.Sine.InOut(t);
      const gx = Phaser.Math.Linear(p.fromX, p.targetX, ease);
      const gy = Phaser.Math.Linear(p.fromY, p.targetY, ease);
      const { px, py } = this.gridToPx(gx, gy);
      if (p.sprite) this.drawPlayer(p.sprite, px, py, this.tileSize, this.playerColor, 0xdda0ff);
      if (t >= 1) {
        p.gridX = p.targetX;
        p.gridY = p.targetY;
        p.moving = false;
      }
      return;
    }

    let dx = 0,
      dy = 0;
    if (this.inputDir.up) dy = -1;
    else if (this.inputDir.down) dy = 1;
    else if (this.inputDir.left) dx = -1;
    else if (this.inputDir.right) dx = 1;

    if (dx === 0 && dy === 0) {
      const { px, py } = this.gridToPx(p.gridX, p.gridY);
      if (p.sprite) this.drawPlayer(p.sprite, px, py, this.tileSize, this.playerColor, 0xdda0ff);
      return;
    }

    const nx = p.gridX + dx;
    const ny = p.gridY + dy;
    if (MazeService.isWalkable(m, nx, ny)) {
      p.fromX = p.gridX;
      p.fromY = p.gridY;
      p.targetX = nx;
      p.targetY = ny;
      p.moving = true;
      p.moveT = 0;
    } else {
      const { px, py } = this.gridToPx(p.gridX, p.gridY);
      if (p.sprite) this.drawPlayer(p.sprite, px, py, this.tileSize, this.playerColor, 0xdda0ff);
    }
  }

  private updateCoins(delta: number) {
    for (const coin of this.coins) {
      if (coin.collected) {
        coin.graphic.visible = false;
        continue;
      }
      coin.angle = (coin.angle + (delta / 500) * 360) % 360;
      const { px, py } = this.gridToPx(coin.pos.x, coin.pos.y);
      this.drawCoin(coin.graphic, px, py, this.tileSize, coin.angle);
    }
  }

  private updateAIs(delta: number) {
    const m = this.maze!;
    for (const ai of this.ais) {
      ai.pulse = (ai.pulse + delta / 500) % (Math.PI * 2);

      if (ai.moving) {
        ai.moveT += delta;
        const t = Phaser.Math.Clamp(ai.moveT / AI_MOVE_DURATION, 0, 1);
        const ease = Phaser.Math.Easing.Sine.InOut(t);
        const gx = Phaser.Math.Linear(ai.fromX, ai.targetX, ease);
        const gy = Phaser.Math.Linear(ai.fromY, ai.targetY, ease);
        const { px, py } = this.gridToPx(gx, gy);
        this.drawAI(ai.graphic, px, py, this.tileSize, ai.pulse);
        if (t >= 1) {
          ai.gridX = ai.targetX;
          ai.gridY = ai.targetY;
          ai.moving = false;
          ai.moveCooldown = ai.chasing ? 80 : 180;
        }
        continue;
      }

      if (ai.moveCooldown > 0) {
        ai.moveCooldown -= delta;
        const { px, py } = this.gridToPx(ai.gridX, ai.gridY);
        this.drawAI(ai.graphic, px, py, this.tileSize, ai.pulse);
        continue;
      }

      const dist = Math.abs(ai.gridX - this.player.gridX) + Math.abs(ai.gridY - this.player.gridY);
      const wasChasing = ai.chasing;
      ai.chasing = dist <= CHASE_RANGE;

      if (ai.chasing) {
        if (!wasChasing || ai.patrolPath.length === 0) {
          ai.patrolPath = MazeService.findPath(
            m,
            { x: ai.gridX, y: ai.gridY },
            { x: this.player.gridX, y: this.player.gridY }
          );
          ai.patrolIdx = 1;
        }
      } else if (ai.patrolIdx >= ai.patrolPath.length) {
        this.generatePatrol(ai);
      }

      const next = ai.patrolPath[ai.patrolIdx];
      if (next) {
        ai.fromX = ai.gridX;
        ai.fromY = ai.gridY;
        ai.targetX = next.x;
        ai.targetY = next.y;
        ai.moving = true;
        ai.moveT = 0;
        ai.patrolIdx++;
      } else {
        this.generatePatrol(ai);
        const { px, py } = this.gridToPx(ai.gridX, ai.gridY);
        this.drawAI(ai.graphic, px, py, this.tileSize, ai.pulse);
      }
    }
  }

  private updateRemotePlayers(delta: number) {
    const now = performance.now();
    const toRemove: string[] = [];
    for (const [id, rp] of this.remotePlayers) {
      const { px, py } = this.gridToPx(rp.gridX, rp.gridY);
      this.drawPlayer(rp.graphic, px, py, this.tileSize, rp.color, rp.color);
      if (now - rp.lastSeen > 15000) toRemove.push(id);
    }
    for (const id of toRemove) {
      const rp = this.remotePlayers.get(id);
      if (rp) rp.graphic.destroy();
      this.remotePlayers.delete(id);
    }
  }

  private checkCollisions() {
    if (!this.maze || !this.player) return;
    const p = this.player;

    for (const coin of this.coins) {
      if (!coin.collected && coin.pos.x === p.gridX && coin.pos.y === p.gridY) {
        coin.collected = true;
        this.scoreMgr.addCoin();
        this.events_.onUpdateCoins(this.scoreMgr.getCoins());
        this.spawnAIIfNeeded();
      }
    }

    for (const ai of this.ais) {
      const aiX = ai.moving
        ? Phaser.Math.Linear(ai.fromX, ai.targetX, Phaser.Math.Clamp(ai.moveT / AI_MOVE_DURATION, 0, 1))
        : ai.gridX;
      const aiY = ai.moving
        ? Phaser.Math.Linear(ai.fromY, ai.targetY, Phaser.Math.Clamp(ai.moveT / AI_MOVE_DURATION, 0, 1))
        : ai.gridY;
      const dx = aiX - p.gridX;
      const dy = aiY - p.gridY;
      if (Math.abs(dx) < 0.55 && Math.abs(dy) < 0.55) {
        this.triggerGameOver(false);
        return;
      }
    }

    const m = this.maze;
    if (p.gridX === m.exit.x && p.gridY === m.exit.y) {
      this.triggerGameOver(true);
    }
  }

  private spawnAIIfNeeded() {
    const collected = this.scoreMgr.getCoins();
    const desired = Math.min(MAX_AI, 1 + collected);
    while (this.ais.length < desired) {
      const m = this.maze!;
      const candidates: CellPos[] = [];
      for (let y = 0; y < m.size; y++) {
        for (let x = 0; x < m.size; x++) {
          if (
            m.grid[y][x] === 0 &&
            (Math.abs(x - this.player.gridX) + Math.abs(y - this.player.gridY) >= 4) &&
            !this.ais.some((a) => a.gridX === x && a.gridY === y)
          ) {
            candidates.push({ x, y });
          }
        }
      }
      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.createAI(pick.x, pick.y);
    }
  }

  private async triggerGameOver(finished: boolean) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.running = false;
    const timeMs = this.scoreMgr.stopTiming();
    const coins = this.scoreMgr.getCoins();

    let result: SubmitResult | null = null;
    try {
      result = await this.scoreMgr.submitScore(finished);
      this.events_.onUpdateRank(result.rank);
    } catch {
      result = null;
    }

    this.events_.onShowResult(finished, timeMs, coins, result);
  }
}
