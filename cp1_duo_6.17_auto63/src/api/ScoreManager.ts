/**
 * ScoreManager - 得分与排行榜管理器
 *
 * 职责：
 *   - 维护玩家本地会话得分（用时/金币）
 *   - 上传到后端 /api/scores 并获取当前排名
 *   - 拉取全局排行榜 Top N
 *   - 缓存结果到 localStorage，减少请求
 *
 * 数据流向：
 *   GameScene(结算) → submitScore() → POST /api/scores → 返回 rank
 *   HUDPanel/结算面板 ← getLeaderboard() → GET /api/scores → 渲染排名
 *
 * 调用关系：
 *   GameScene.ts   → startTiming() / stopTiming() / addCoin() / submitScore()
 *   HUDPanel.ts    → 监听 ScoreManager.events 更新HUD显示
 *   结算面板       → fetchLeaderboard() 获取Top10渲染
 */

import axios from 'axios';

export interface ScoreEntry {
  name: string;
  time_ms: number;
  coins: number;
  seed: number;
  finished: boolean;
  timestamp: number;
}

export interface SubmitResult {
  rank: number;
  total_players: number;
  entry: ScoreEntry;
  top10: ScoreEntry[];
}

type EventHandler = (...args: any[]) => void;

const API_BASE = '/api';
const CACHE_KEY = 'maze_escape_scores_v1';

export class ScoreManager {
  private playerName: string = '匿名玩家';
  private startTime: number = 0;
  private endTime: number = 0;
  private running: boolean = false;
  private coinsCollected: number = 0;
  private currentSeed: number = 0;
  private events: Map<string, EventHandler[]> = new Map();
  private tickTimer: any = null;

  constructor() {
    this.tickLoop();
  }

  private tickLoop() {
    const interval = 100;
    this.tickTimer = setInterval(() => {
      if (this.running) {
        this.emit('update', this.getElapsedMs(), this.coinsCollected);
      }
    }, interval);
  }

  setPlayerName(name: string) {
    this.playerName = name.trim() || '匿名玩家';
  }

  getPlayerName(): string {
    return this.playerName;
  }

  on(event: string, handler: EventHandler) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    const list = this.events.get(event);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  }

  private emit(event: string, ...args: any[]) {
    const list = this.events.get(event);
    if (list) list.forEach((h) => h(...args));
  }

  /** 启动计时器（游戏开始） */
  startTiming(seed: number) {
    this.currentSeed = seed;
    this.startTime = performance.now();
    this.endTime = 0;
    this.running = true;
    this.coinsCollected = 0;
    this.emit('start');
  }

  /** 停止计时器（游戏结束） */
  stopTiming(): number {
    if (!this.running) return this.endTime - this.startTime;
    this.endTime = performance.now();
    this.running = false;
    this.emit('stop', this.getElapsedMs());
    return this.getElapsedMs();
  }

  isRunning(): boolean {
    return this.running;
  }

  getElapsedMs(): number {
    if (this.running) return performance.now() - this.startTime;
    return Math.max(0, this.endTime - this.startTime);
  }

  getElapsedFormatted(): string {
    const total = Math.floor(this.getElapsedMs() / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  static formatMs(ms: number): string {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${m}:${s}.${cs}`;
  }

  getCoins(): number {
    return this.coinsCollected;
  }

  addCoin(): number {
    this.coinsCollected += 1;
    this.emit('coin', this.coinsCollected);
    this.emit('update', this.getElapsedMs(), this.coinsCollected);
    return this.coinsCollected;
  }

  getCurrentSeed(): number {
    return this.currentSeed;
  }

  /** 提交得分到后端 */
  async submitScore(finished: boolean): Promise<SubmitResult> {
    this.stopTiming();
    const body = {
      name: this.playerName,
      time_ms: Math.round(this.getElapsedMs()),
      coins: this.coinsCollected,
      seed: this.currentSeed,
      finished,
    };

    try {
      const resp = await axios.post(`${API_BASE}/scores`, body, { timeout: 5000 });
      const result = resp.data as SubmitResult;
      this.cacheScore(result.entry);
      this.emit('submitted', result);
      return result;
    } catch (err) {
      console.warn('[ScoreManager] 提交得分失败', err);
      const local = this.buildLocalResult(body, finished);
      this.emit('submitted', local);
      return local;
    }
  }

  private buildLocalResult(body: any, finished: boolean): SubmitResult {
    const entry: ScoreEntry = { ...body, timestamp: Date.now(), finished };
    const cached = this.getCachedScores();
    cached.push(entry);
    cached.sort((a, b) => a.time_ms - b.time_ms || b.coins - a.coins);
    const rank = cached.findIndex((e) => e === entry) + 1;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached.slice(0, 500)));
    return {
      rank: Math.max(1, rank),
      total_players: cached.length,
      entry,
      top10: cached.slice(0, 10),
    };
  }

  private cacheScore(entry: ScoreEntry) {
    const cached = this.getCachedScores();
    cached.push(entry);
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached.slice(0, 500)));
  }

  private getCachedScores(): ScoreEntry[] {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
    } catch {
      return [];
    }
  }

  /** 拉取排行榜（优先后端，失败降级本地） */
  async fetchLeaderboard(limit = 10): Promise<ScoreEntry[]> {
    try {
      const resp = await axios.get(`${API_BASE}/scores`, {
        params: { limit },
        timeout: 3000,
      });
      return (resp.data as ScoreEntry[]).slice(0, limit);
    } catch {
      return this.getCachedScores()
        .sort((a, b) => a.time_ms - b.time_ms || b.coins - a.coins)
        .slice(0, limit);
    }
  }

  destroy() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.events.clear();
  }
}
