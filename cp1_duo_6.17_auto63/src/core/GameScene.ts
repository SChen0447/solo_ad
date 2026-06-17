/**
 * GameScene - Phaser 主游戏场景
 *
 * 职责：
 *   - 管理迷宫渲染（墙壁/地板）、玩家、金币、出口、AI巡逻者
 *   - 接收键盘/虚拟方向键输入，处理玩家移动（网格对齐）
 *   - 每帧执行碰撞检测（金币收集/AI碰撞/到达出口）
 *   - 根据收集金币数量动态生成AI（最多MAX_AI个）
 *   - AI: 固定巡逻路径 ↔ 偏移追逐路径（玩家CHASE_RANGE格内切换）
 *   - 多人模式通过Socket.IO同步玩家位置
 *   - 通过内部 EventEmitter 发射事件给 HUDPanel 更新
 *   - 调用 ScoreManager 记录/提交得分
 *
 * 事件系统（GameScene.events）：
 *   update:time(ms)       → HUDPanel 计时器
 *   update:coins(count)   → HUDPanel 金币计数
 *   update:rank(rank)     → HUDPanel 排名
 *   update:players(count) → HUDPanel 在线人数
 *   set:totalCoins(n)     → HUDPanel 金币总数
 *   show:result(...)      → 结算面板弹出
 *
 * 数据流向：
 *   用户输入 → 玩家网格移动 → 碰撞检测 → emit 事件 → HUD DOM 更新
 *                             → ScoreManager.addCoin/submitScore
 */

import Phaser from 'phaser';
import type { MazeData, CellPos } from '../core/MazeService';
import { MazeService } from '../core/MazeService';
import type { ScoreManager, SubmitResult } from '../api/ScoreManager';
import { AppConfig } from '../config/AppConfig';

export type GameSceneEventName =
  | 'update:time'
  | 'update:coins'
  | 'update:rank'
  | 'update:players'
  | 'set:totalCoins'
  | 'show:result';

const COLORS = {
  wall: 0x2d2d2d,
  floor: 0xe0e0e0,
  coin: 0xffd700,
  exit: 0x00ff88,
  ai: 0xff3355,
  player: 0x8a2be2,
  otherPlayers: [0x3498db, 0x2ecc71, 0xff6b9d, 0xf39c12, 0x9b59b6],
} as const;

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
  /** 玩家移动插值后的像素级位置（用于精确碰撞） */
  lastPxX: number;
  lastPxY: number;
}

interface CoinObj {
  pos: CellPos;
  collected: boolean;
  graphic: Phaser.GameObjects.Graphics;
  angle: number;
  /** 收集动画时间（ms），0 表示未触发 */
  pickupAnimT: number;
  /** 收集动画总时长 */
  pickupAnimDur: number;
  /** 收集动画起点像素坐标 */
  pickupFromX: number;
  pickupFromY: number;
}

/** 金币收集时的粒子数据 */
interface CoinBurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  totalLife: number;
  size: number;
  color: number;
  graphic: Phaser.GameObjects.Graphics;
}

/** 出口庆祝特效状态 */
interface VictoryFX {
  running: boolean;
  t: number;
  duration: number;
  haloGraphic: Phaser.GameObjects.Graphics | null;
  textObj: Phaser.GameObjects.Text | null;
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
  /** 追逐偏移量：-1/0/+1 用于避免所有AI走同一条线 */
  chaseOffset: number;
  graphic: Phaser.GameObjects.Graphics;
  pulse: number;
  moveCooldown: number;
  /** 每帧渲染时的像素级位置（用于精确碰撞） */
  lastPxX: number;
  lastPxY: number;
  /** 下次重算追逐路径的计时器 */
  nextChaseRecalc: number;
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

const MOVE_DURATION = 140;
const AI_MOVE_DURATION_BASE = 210;
const AI_MOVE_DURATION_CHASE = 140;

const COIN_PICKUP_DURATION = 300;
const COIN_BURST_DURATION = 300;
const COIN_BURST_PARTICLES = 14;
const VICTORY_DURATION = 1500;

export class GameScene extends Phaser.Scene {
  public readonly events: Phaser.Events.EventEmitter;

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

  private scoreMgr: ScoreManager;
  private running: boolean = false;
  private gameOver: boolean = false;

  private playerColor: number = COLORS.player;
  private playerName: string = '匿名玩家';
  private seed: number = 0;
  private pendingResult: SubmitResult | null = null;

  private totalCoins: number = 0;
  private lastFrameTime: number = 0;
  private frameBudgetWarned: boolean = false;

  private coinBurstParticles: CoinBurstParticle[] = [];
  private victoryFX: VictoryFX = {
    running: false,
    t: 0,
    duration: VICTORY_DURATION,
    haloGraphic: null,
    textObj: null,
  };

  constructor(scoreMgr: ScoreManager) {
    super({ key: 'GameScene' });
    this.scoreMgr = scoreMgr;
    this.events = new Phaser.Events.EventEmitter();
  }

  /** 订阅事件（快捷方式） */
  onEvent(event: GameSceneEventName, fn: (...args: any[]) => void, context?: any): this {
    this.events.on(event, fn, context);
    return this;
  }

  onceEvent(event: GameSceneEventName, fn: (...args: any[]) => void, context?: any): this {
    this.events.once(event, fn, context);
    return this;
  }

  offEvent(event: GameSceneEventName, fn?: (...args: any[]) => void, context?: any, once?: boolean): this {
    this.events.off(event, fn, context, once);
    return this;
  }

  private emitEvent(event: GameSceneEventName, ...args: any[]) {
    this.events.emit(event, ...args);
  }

  // ============== 生命周期 ==============

  preload() {}

  async initNewGame(playerName: string, seed?: number) {
    this.playerName = playerName || '匿名玩家';
    this.gameOver = false;
    this.running = false;
    this.pendingResult = null;

    this.coins.forEach((c) => c.graphic?.destroy());
    this.ais.forEach((a) => a.graphic?.destroy());
    this.remotePlayers.forEach((rp) => rp.graphic?.destroy());
    this.coinBurstParticles.forEach((p) => p.graphic?.destroy());
    if (this.victoryFX.haloGraphic) this.victoryFX.haloGraphic.destroy();
    if (this.victoryFX.textObj) this.victoryFX.textObj.destroy();
    this.coins = [];
    this.ais = [];
    this.remotePlayers.clear();
    this.coinBurstParticles = [];
    this.victoryFX = {
      running: false,
      t: 0,
      duration: VICTORY_DURATION,
      haloGraphic: null,
      textObj: null,
    };

    this.seed = seed ?? Math.floor(Math.random() * 0x7fffffff);

    try {
      this.maze = await MazeService.fetchMaze(this.seed, AppConfig.DEFAULT_MAZE_SIZE);
    } catch (e) {
      console.warn('[GameScene] fetchMaze 异常，使用本地生成', e);
      this.maze = MazeService.localGenerate(this.seed, AppConfig.DEFAULT_MAZE_SIZE);
    }

    this.totalCoins = this.maze.coins.length;
    this.emitEvent('set:totalCoins', this.totalCoins);
    this.emitEvent('update:coins', 0);
    this.emitEvent('update:time', 0);
    this.emitEvent('update:rank', '-');
    this.emitEvent('update:players', 1);

    if (this.scene.isActive()) {
      this.scene.restart();
    } else {
      this.game.scene.start('GameScene');
    }
  }

  create() {
    if (!this.maze) {
      const { width, height } = this.scale;
      this.add
        .text(width / 2, height / 2, '正在加载迷宫...', {
          color: '#fff',
          fontSize: '24px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
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
    this.lastFrameTime = performance.now();
    this.scoreMgr.startTiming(this.seed);

    this.emitEvent('update:time', 0);
    this.emitEvent('update:coins', 0);
    this.emitEvent('update:rank', '-');
  }

  // ============== 布局与渲染 ==============

  private computeLayout() {
    const { width, height } = this.scale;
    const m = this.maze!;
    const maxTileW = (width - 80) / m.size;
    const maxTileH = (height - 160) / m.size;
    this.tileSize = Math.max(20, Math.floor(Math.min(maxTileW, maxTileH)));
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

  // ============== 金币 ==============

  private spawnCoins() {
    const m = this.maze!;
    for (const pos of m.coins) {
      const g = this.add.graphics();
      g.setDepth(5);
      this.coins.push({
        pos,
        collected: false,
        graphic: g,
        angle: 0,
        pickupAnimT: 0,
        pickupAnimDur: COIN_PICKUP_DURATION,
        pickupFromX: 0,
        pickupFromY: 0,
      });
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

  /**
   * 触发金币收集动画（缩小+上飘+金白粒子爆发），时长 0.3s
   */
  private triggerCoinPickupFX(coin: CoinObj) {
    const { px, py } = this.gridToPx(coin.pos.x, coin.pos.y);
    coin.pickupFromX = px;
    coin.pickupFromY = py;
    coin.pickupAnimT = 0.001;
    coin.graphic.setDepth(20);
    this.spawnCoinBurst(px, py);
  }

  /**
   * 金白粒子爆发
   */
  private spawnCoinBurst(cx: number, cy: number) {
    const colors = [0xffd700, 0xfff176, 0xffffff, 0xffe45c, 0xffffff];
    for (let i = 0; i < COIN_BURST_PARTICLES; i++) {
      const angle = (i / COIN_BURST_PARTICLES) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 0.06 + Math.random() * 0.12;
      const life = COIN_BURST_DURATION * (0.7 + Math.random() * 0.4);
      const size = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const g = this.add.graphics();
      g.setDepth(21);
      this.coinBurstParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        totalLife: life,
        size,
        color,
        graphic: g,
      });
    }
  }

  private updateCoinBurstParticles(delta: number) {
    for (let i = this.coinBurstParticles.length - 1; i >= 0; i--) {
      const p = this.coinBurstParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        p.graphic.destroy();
        this.coinBurstParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 0.0003 * delta;
      const t = Phaser.Math.Clamp(p.life / p.totalLife, 0, 1);
      const alpha = Phaser.Math.Easing.Quadratic.Out(t);
      const r = p.size * (0.4 + 0.6 * t);
      p.graphic.clear();
      p.graphic.fillStyle(p.color, alpha);
      p.graphic.fillCircle(p.x, p.y, r);
    }
  }

  /**
   * 触发出口庆祝特效（光环+文字动画，1.5秒）
   * 完成后调用 onComplete 回调（用于延迟打开结算面板）
   */
  private triggerVictoryFX(onComplete: () => void) {
    if (this.victoryFX.running) {
      onComplete();
      return;
    }
    const { width, height } = this.scale;

    const halo = this.add.graphics();
    halo.setDepth(50);

    const fontSize = Math.max(32, Math.min(72, Math.floor(width / 10)));
    const text = this.add
      .text(width / 2, height / 2, '逃脱成功！', {
        fontFamily: '"Segoe UI", "PingFang SC", sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#8a2be2',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(55)
      .setAlpha(0);

    text.setShadow(0, 0, '#8a2be2', 20, true, true);

    this.victoryFX = {
      running: true,
      t: 0,
      duration: VICTORY_DURATION,
      haloGraphic: halo,
      textObj: text,
    };

    this.time.delayedCall(VICTORY_DURATION, () => {
      onComplete();
    });
  }

  private updateVictoryFX(delta: number) {
    if (!this.victoryFX.running) return;
    const v = this.victoryFX;
    v.t = Math.min(v.t + delta, v.duration);
    const tNorm = v.t / v.duration;

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.max(width, height) * 0.75;

    const halo = v.haloGraphic!;
    halo.clear();

    if (tNorm < 0.7) {
      const ht = tNorm / 0.7;
      const r = Phaser.Math.Easing.Quadratic.Out(ht) * maxR;
      const alpha = 1 - Phaser.Math.Easing.Quadratic.In(ht);

      for (let ring = 0; ring < 3; ring++) {
        const ringT = Phaser.Math.Clamp(ht - ring * 0.15, 0, 1);
        if (ringT <= 0) continue;
        const rr = Phaser.Math.Easing.Quadratic.Out(ringT) * r;
        const ringAlpha = alpha * (1 - ring * 0.25);
        const color = ring === 0 ? 0x8a2be2 : ring === 1 ? 0x4b6bff : 0xc77dff;
        halo.lineStyle(Math.max(4, 20 * (1 - ringT)), color, ringAlpha);
        halo.beginPath();
        halo.arc(cx, cy, rr, 0, Math.PI * 2);
        halo.strokePath();

        halo.fillStyle(color, ringAlpha * 0.08);
        halo.beginPath();
        halo.arc(cx, cy, rr, 0, Math.PI * 2);
        halo.fillPath();
      }
    }

    const txt = v.textObj!;
    if (tNorm < 0.35) {
      const at = tNorm / 0.35;
      const ease = Phaser.Math.Easing.Back.Out(at);
      txt.setAlpha(at);
      txt.setScale(0.4 + 0.6 * ease);
      txt.y = cy + 20 * (1 - ease);
    } else if (tNorm < 0.75) {
      txt.setAlpha(1);
      txt.setScale(1);
      txt.y = cy;
    } else {
      const at = (tNorm - 0.75) / 0.25;
      txt.setAlpha(1 - at);
      txt.setScale(1 + 0.15 * at);
      txt.y = cy - 30 * at;
    }
  }

  // ============== AI ==============

  private spawnInitialAIs() {
    const m = this.maze!;
    const spawns = m.aiSpawns.slice(0, 1);
    for (const sp of spawns) {
      this.createAI(sp.x, sp.y);
    }
  }

  private createAI(gridX: number, gridY: number): AIObj {
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
      chaseOffset: Math.floor(Math.random() * 3) - 1,
      graphic: g,
      pulse: Math.random() * Math.PI * 2,
      moveCooldown: 300 + Math.random() * 400,
      lastPxX: 0,
      lastPxY: 0,
      nextChaseRecalc: 0,
    };
    this.generatePatrol(ai);
    const { px, py } = this.gridToPx(gridX, gridY);
    ai.lastPxX = px;
    ai.lastPxY = py;
    this.ais.push(ai);
    return ai;
  }

  /** 生成随机巡逻路径 */
  private generatePatrol(ai: AIObj) {
    const m = this.maze!;
    const corridors: CellPos[] = [];
    for (let y = 0; y < m.size; y++) {
      for (let x = 0; x < m.size; x++) {
        const d = Math.abs(x - ai.gridX) + Math.abs(y - ai.gridY);
        if (m.grid[y][x] === 0 && d >= 2 && d <= m.size) {
          corridors.push({ x, y });
        }
      }
    }
    if (corridors.length === 0) {
      ai.patrolPath = [{ x: ai.gridX, y: ai.gridY }];
      ai.patrolIdx = 0;
      return;
    }
    const target = corridors[Math.floor(Math.random() * corridors.length)];
    ai.patrolPath = MazeService.findPath(m, { x: ai.gridX, y: ai.gridY }, target);
    ai.patrolIdx = Math.min(1, ai.patrolPath.length - 1);
  }

  /**
   * 计算偏移追逐目标：
   *   朝玩家方向追，但加上小偏移避免所有AI同路径
   */
  private getChaseTarget(ai: AIObj): CellPos {
    const m = this.maze!;
    let tx = this.player.gridX;
    let ty = this.player.gridY;

    if (ai.chaseOffset !== 0) {
      const alternatives: CellPos[] = [
        { x: tx + ai.chaseOffset, y: ty },
        { x: tx, y: ty + ai.chaseOffset },
        { x: tx - ai.chaseOffset, y: ty },
        { x: tx, y: ty - ai.chaseOffset },
      ].filter((p) => MazeService.isWalkable(m, p.x, p.y));
      if (alternatives.length > 0) {
        const pick = alternatives[Math.floor(Math.random() * alternatives.length)];
        tx = pick.x;
        ty = pick.y;
      }
    }
    return { x: tx, y: ty };
  }

  private drawAI(g: Phaser.GameObjects.Graphics, px: number, py: number, size: number, pulse: number, chasing: boolean) {
    g.clear();
    const s = size * 0.38;
    const scale = 1 + Math.sin(pulse) * 0.1;
    const r = s * scale;
    const glow = chasing ? 0.4 : 0.2;

    g.fillStyle(COLORS.ai, glow);
    g.fillTriangle(
      px,
      py - r * 1.6,
      px - r * 1.5,
      py + r * 1.1,
      px + r * 1.5,
      py + r * 1.1
    );
    g.fillStyle(COLORS.ai, chasing ? 0.95 : 0.8);
    g.fillTriangle(px, py - r, px - r * 0.95, py + r * 0.7, px + r * 0.95, py + r * 0.7);
    g.lineStyle(2, chasing ? 0xffff66 : 0xffcccc, 0.95);
    g.strokeTriangle(px, py - r, px - r * 0.95, py + r * 0.7, px + r * 0.95, py + r * 0.7);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(px, py + r * 0.1, r * 0.18);
  }

  // ============== 玩家 ==============

  private spawnPlayer() {
    const m = this.maze!;
    const start = m.start;
    const g = this.add.graphics();
    g.setDepth(10);
    const { px, py } = this.gridToPx(start.x, start.y);
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
      lastPxX: px,
      lastPxY: py,
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
    g.fillStyle(glowColor, 0.25);
    g.fillCircle(px, py, r * 1.8);
    g.fillStyle(glowColor, 0.45);
    g.fillCircle(px, py, r * 1.3);
    g.fillStyle(color, 1);
    g.fillCircle(px, py, r);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(px, py, r);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(px - r * 0.3, py - r * 0.3, r * 0.25);
  }

  // ============== 输入 ==============

  private setupInput() {
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (!this.running) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') this.inputDir.up = true;
      else if (k === 'arrowdown' || k === 's') this.inputDir.down = true;
      else if (k === 'arrowleft' || k === 'a') this.inputDir.left = true;
      else if (k === 'arrowright' || k === 'd') this.inputDir.right = true;
    });

    this.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') this.inputDir.up = false;
      else if (k === 'arrowdown' || k === 's') this.inputDir.down = false;
      else if (k === 'arrowleft' || k === 'a') this.inputDir.left = false;
      else if (k === 'arrowright' || k === 'd') this.inputDir.right = false;
    });

    this.scale.on('resize', () => {
      if (this.maze) {
        this.computeLayout();
        this.drawFloor();
        this.drawMaze();
        this.drawExit();
      }
    });
  }

  /** 由 HUDPanel 虚拟方向键调用 */
  setDirection(dir: 'up' | 'down' | 'left' | 'right' | null, pressed: boolean) {
    if (dir === null) {
      this.inputDir.up = this.inputDir.down = this.inputDir.left = this.inputDir.right = false;
      return;
    }
    this.inputDir[dir] = pressed;
  }

  // ============== 主循环 ==============

  update(_time: number, delta: number) {
    if (!this.maze) return;

    const frameStart = performance.now();

    if (this.running && !this.gameOver) {
      this.emitEvent('update:time', this.scoreMgr.getElapsedMs());

      this.updatePlayer(delta);
      this.updateCoins(delta);
      this.updateAIs(delta);
      this.updateRemotePlayers(delta);
      this.checkCollisions();
    } else {
      this.updateCoins(delta);
    }

    this.updateCoinBurstParticles(delta);
    this.updateVictoryFX(delta);

    const frameDur = performance.now() - frameStart;
    if (!this.frameBudgetWarned && frameDur > 2) {
      this.frameBudgetWarned = true;
      console.warn(`[GameScene] 单次update耗时 ${frameDur.toFixed(2)}ms 超过 2ms 预算`);
    }
  }

  // ============== 玩家更新 ==============

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
      p.lastPxX = px;
      p.lastPxY = py;
      if (p.sprite) this.drawPlayer(p.sprite, px, py, this.tileSize, this.playerColor, 0xdda0ff);
      if (t >= 1) {
        p.gridX = p.targetX;
        p.gridY = p.targetY;
        p.moving = false;
      }
      return;
    }

    let dx = 0;
    let dy = 0;
    if (this.inputDir.up) dy = -1;
    else if (this.inputDir.down) dy = 1;
    else if (this.inputDir.left) dx = -1;
    else if (this.inputDir.right) dx = 1;

    if (dx === 0 && dy === 0) {
      const { px, py } = this.gridToPx(p.gridX, p.gridY);
      p.lastPxX = px;
      p.lastPxY = py;
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
      p.lastPxX = px;
      p.lastPxY = py;
      if (p.sprite) this.drawPlayer(p.sprite, px, py, this.tileSize, this.playerColor, 0xdda0ff);
    }
  }

  // ============== 金币更新 ==============

  private updateCoins(delta: number) {
    for (const coin of this.coins) {
      if (coin.collected && coin.pickupAnimT <= 0) {
        coin.graphic.visible = false;
        continue;
      }

      if (coin.pickupAnimT > 0) {
        coin.pickupAnimT += delta;
        const dur = coin.pickupAnimDur;
        if (coin.pickupAnimT >= dur) {
          coin.pickupAnimT = 0;
          coin.graphic.visible = false;
          continue;
        }
        const t = Phaser.Math.Clamp(coin.pickupAnimT / dur, 0, 1);
        const ease = Phaser.Math.Easing.Cubic.Out(t);
        const scale = 1 - t;
        const dy = -ease * this.tileSize * 0.6;
        const alpha = 1 - Phaser.Math.Easing.Quadratic.In(t);
        const px = coin.pickupFromX;
        const py = coin.pickupFromY + dy;
        const sz = this.tileSize * scale;
        coin.graphic.setAlpha(alpha);
        coin.angle = (coin.angle + (delta / 200) * 360) % 360;
        this.drawCoin(coin.graphic, px, py, sz, coin.angle);
        continue;
      }

      coin.graphic.setAlpha(1);
      coin.angle = (coin.angle + (delta / 500) * 360) % 360;
      const { px, py } = this.gridToPx(coin.pos.x, coin.pos.y);
      this.drawCoin(coin.graphic, px, py, this.tileSize, coin.angle);
    }
  }

  // ============== AI 更新 ==============

  private updateAIs(delta: number) {
    const m = this.maze!;
    for (const ai of this.ais) {
      ai.pulse = (ai.pulse + delta / 500) % (Math.PI * 2);
      ai.nextChaseRecalc = Math.max(0, ai.nextChaseRecalc - delta);

      if (ai.moving) {
        const duration = ai.chasing ? AI_MOVE_DURATION_CHASE : AI_MOVE_DURATION_BASE;
        ai.moveT += delta;
        const t = Phaser.Math.Clamp(ai.moveT / duration, 0, 1);
        const ease = Phaser.Math.Easing.Sine.InOut(t);
        const gx = Phaser.Math.Linear(ai.fromX, ai.targetX, ease);
        const gy = Phaser.Math.Linear(ai.fromY, ai.targetY, ease);
        const { px, py } = this.gridToPx(gx, gy);
        ai.lastPxX = px;
        ai.lastPxY = py;
        this.drawAI(ai.graphic, px, py, this.tileSize, ai.pulse, ai.chasing);
        if (t >= 1) {
          ai.gridX = ai.targetX;
          ai.gridY = ai.targetY;
          ai.moving = false;
          ai.moveCooldown = ai.chasing ? 60 : 150;
        }
        continue;
      }

      if (ai.moveCooldown > 0) {
        ai.moveCooldown -= delta;
        const { px, py } = this.gridToPx(ai.gridX, ai.gridY);
        ai.lastPxX = px;
        ai.lastPxY = py;
        this.drawAI(ai.graphic, px, py, this.tileSize, ai.pulse, ai.chasing);
        continue;
      }

      const dist = Math.abs(ai.gridX - this.player.gridX) + Math.abs(ai.gridY - this.player.gridY);
      const wasChasing = ai.chasing;
      ai.chasing = dist <= AppConfig.AI_CHASE_RANGE;

      let needRecalc = false;
      if (ai.chasing) {
        if (!wasChasing || ai.patrolIdx >= ai.patrolPath.length || ai.nextChaseRecalc <= 0) {
          needRecalc = true;
        }
      } else if (ai.patrolIdx >= ai.patrolPath.length) {
        needRecalc = true;
      }

      if (needRecalc) {
        if (ai.chasing) {
          const target = this.getChaseTarget(ai);
          ai.patrolPath = MazeService.findPath(
            m,
            { x: ai.gridX, y: ai.gridY },
            target
          );
          ai.patrolIdx = 1;
          ai.nextChaseRecalc = 450 + Math.random() * 250;
        } else {
          this.generatePatrol(ai);
        }
      }

      const next = ai.patrolPath[ai.patrolIdx];
      if (next && MazeService.isWalkable(m, next.x, next.y)) {
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
        ai.lastPxX = px;
        ai.lastPxY = py;
        this.drawAI(ai.graphic, px, py, this.tileSize, ai.pulse, ai.chasing);
      }
    }
  }

  // ============== 远程玩家 ==============

  private updateRemotePlayers(_delta: number) {
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

  // ============== 碰撞检测 ==============

  /**
   * 检测三类碰撞：
   *   1. 玩家 ↔ 金币 → 收集 + AI数量增加
   *   2. 玩家 ↔ AI   → 游戏失败（像素级圆碰撞）
   *   3. 玩家 ↔ 出口 → 通关
   * 性能预算：< 2ms / 帧
   */
  private checkCollisions() {
    if (!this.maze || !this.player) return;
    const p = this.player;

    // ---- 金币（网格级） ----
    for (const coin of this.coins) {
      if (!coin.collected && coin.pos.x === p.gridX && coin.pos.y === p.gridY) {
        coin.collected = true;
        this.triggerCoinPickupFX(coin);
        this.scoreMgr.addCoin();
        const collected = this.scoreMgr.getCoins();
        this.emitEvent('update:coins', collected);
        this.spawnAIIfNeeded();
      }
    }

    // ---- AI（像素级圆碰撞，精度更高） ----
    const playerRadius = this.tileSize * 0.36;
    const aiRadius = this.tileSize * 0.34;
    const collideDist = (playerRadius + aiRadius) * 0.85;

    for (const ai of this.ais) {
      const dx = ai.lastPxX - p.lastPxX;
      const dy = ai.lastPxY - p.lastPxY;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < collideDist * collideDist) {
        this.triggerGameOver(false);
        return;
      }
    }

    // ---- 出口（网格级）：先播放庆祝特效再结算 ----
    const m = this.maze;
    if (p.gridX === m.exit.x && p.gridY === m.exit.y) {
      this.running = false;
      this.scoreMgr.stopTiming();
      this.triggerVictoryFX(() => {
        this.triggerGameOver(true);
      });
    }
  }

  /**
   * 每收集一枚金币增加一个AI（最多 MAX_AI），生成位置至少距离玩家4格
   */
  private spawnAIIfNeeded() {
    const collected = this.scoreMgr.getCoins();
    const desired = Math.min(AppConfig.MAX_AI, 1 + collected);
    while (this.ais.length < desired) {
      const m = this.maze!;
      const candidates: CellPos[] = [];
      for (let y = 0; y < m.size; y++) {
        for (let x = 0; x < m.size; x++) {
          const d = Math.abs(x - this.player.gridX) + Math.abs(y - this.player.gridY);
          if (
            m.grid[y][x] === 0 &&
            d >= 4 &&
            !this.ais.some((a) => a.gridX === x && a.gridY === y) &&
            !(x === 0 && y === 0) &&
            !(x === m.exit.x && y === m.exit.y)
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

  // ============== 结算 ==============

  private async triggerGameOver(finished: boolean) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.running = false;
    if (this.scoreMgr.isRunning()) {
      this.scoreMgr.stopTiming();
    }
    const timeMs = this.scoreMgr.getElapsedMs();
    const coins = this.scoreMgr.getCoins();

    let result: SubmitResult | null = null;
    try {
      result = await this.scoreMgr.submitScore(finished);
      this.emitEvent('update:rank', result.rank);
    } catch (e) {
      console.warn('[GameScene] submitScore 异常', e);
      result = null;
    }

    this.emitEvent('show:result', finished, timeMs, coins, result);
  }

  shutdown() {
    this.events.removeAllListeners();
  }
}
