/**
 * ScoreManager - 得分与排行榜管理器
 *
 * 职责：
 *   - 维护玩家本地会话得分（用时/金币）
 *   - 上传到后端 /scores 并获取当前排名（带重试与离线降级）
 *   - 拉取全局排行榜 Top N
 *   - 缓存结果到 localStorage，减少请求
 *   - 提供事件订阅（update/coin/start/stop/submitted）
 *
 * 数据流向：
 *   GameScene(结算) → submitScore() → POST /api/scores → 返回 rank
 *   HUDPanel/结算面板 ← fetchLeaderboard() → GET /api/scores → 渲染排名
 *
 * 配置：
 *   API 地址从 src/config/AppConfig.ts 读取（Vite 环境变量 VITE_API_BASE_URL）
 */

import axios, { AxiosError } from 'axios';
import { AppConfig } from '../config/AppConfig';

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

export type ScoreEvent = 'start' | 'stop' | 'update' | 'coin' | 'submitted';
type EventHandler = (...args: any[]) => void;

const CACHE_KEY = 'maze_escape_scores_v1';
const CACHE_LIMIT = 500;

export class ScoreManager {
  private playerName: string = '匿名玩家';
  private startTime: number = 0;
  private endTime: number = 0;
  private running: boolean = false;
  private coinsCollected: number = 0;
  private currentSeed: number = 0;
  private events: Map<string, EventHandler[]> = new Map();
  private tickTimer: ReturnType<typeof setInterval> | null = null;

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
    this.playerName = (name || '').trim() || '匿名玩家';
  }

  getPlayerName(): string {
    return this.playerName;
  }

  on(event: ScoreEvent, handler: EventHandler): () => void {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: ScoreEvent, handler: EventHandler) {
    const list = this.events.get(event);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  }

  private emit(event: string, ...args: any[]) {
    const list = this.events.get(event);
    if (list && list.length) list.slice().forEach((h) => {
      try { h(...args); } catch (e) { console.error(e); }
    });
  }

  startTiming(seed: number) {
    this.currentSeed = seed;
    this.startTime = performance.now();
    this.endTime = 0;
    this.running = true;
    this.coinsCollected = 0;
    this.emit('start');
  }

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
    if (!isFinite(ms) || ms < 0) ms = 0;
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

  private async postWithRetry(url: string, body: any, tries: number): Promise<any> {
    let lastErr: any = null;
    const maxTries = Math.max(1, tries);
    for (let i = 0; i < maxTries; i++) {
      try {
        const resp = await axios.post(`${AppConfig.API_BASE_URL}${url}`, body, {
          timeout: AppConfig.REQUEST_TIMEOUT_MS,
        });
        return resp.data;
      } catch (err) {
        lastErr = err;
        if (i < maxTries - 1) {
          const ae = err as AxiosError;
          if (ae.code === 'ECONNABORTED' || !ae.response || ae.response.status >= 500) {
            const delay = 250 * Math.pow(2, i);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
        }
      }
    }
    throw lastErr;
  }

  async submitScore(finished: boolean): Promise<SubmitResult> {
    this.stopTiming();
    const body = {
      name: this.playerName,
      time_ms: Math.round(this.getElapsedMs()),
      coins: this.coinsCollected,
      seed: this.currentSeed,
      finished,
    };

    const tries = AppConfig.REQUEST_MAX_RETRIES + 1;
    try {
      const data = await this.postWithRetry('/scores', body, tries);
      const result = data as SubmitResult;
      if (result && typeof result.rank === 'number') {
        this.cacheScore(result.entry);
        this.emit('submitted', result);
        return result;
      }
      throw new Error('返回数据格式非法');
    } catch (err) {
      console.warn('[ScoreManager] 提交得分失败，使用本地模式', err);
      const local = this.buildLocalResult(body, finished);
      this.emit('submitted', local);
      return local;
    }
  }

  private buildLocalResult(body: any, finished: boolean): SubmitResult {
    const entry: ScoreEntry = {
      name: body.name,
      time_ms: Number(body.time_ms) || 0,
      coins: Number(body.coins) || 0,
      seed: Number(body.seed) || 0,
      finished: !!finished,
      timestamp: Date.now(),
    };
    const cached = this.getCachedScores();
    cached.push(entry);
    cached.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.time_ms !== b.time_ms) return a.time_ms - b.time_ms;
      return b.coins - a.coins;
    });
    const rank = cached.findIndex((e) => e === entry) + 1;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached.slice(0, CACHE_LIMIT)));
    } catch { /* ignore */ }
    return {
      rank: Math.max(1, rank),
      total_players: cached.length,
      entry,
      top10: cached.slice(0, 10),
    };
  }

  private cacheScore(entry: ScoreEntry) {
    try {
      const cached = this.getCachedScores();
      cached.push(entry);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached.slice(0, CACHE_LIMIT)));
    } catch { /* ignore */ }
  }

  private getCachedScores(): ScoreEntry[] {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter((e: any) => e && typeof e.time_ms === 'number');
    } catch {
      return [];
    }
  }

  async fetchLeaderboard(limit = 10): Promise<ScoreEntry[]> {
    const maxTries = Math.max(1, AppConfig.REQUEST_MAX_RETRIES + 1);
    for (let i = 0; i < maxTries; i++) {
      try {
        const resp = await axios.get(`${AppConfig.API_BASE_URL}/scores`, {
          params: { limit },
          timeout: AppConfig.REQUEST_TIMEOUT_MS,
        });
        const data = resp.data;
        if (Array.isArray(data)) {
          return data.slice(0, limit).map((e: any) => ({
            name: String(e.name || '匿名玩家'),
            time_ms: Number(e.time_ms) || 0,
            coins: Number(e.coins) || 0,
            seed: Number(e.seed) || 0,
            finished: !!e.finished,
            timestamp: Number(e.timestamp) || 0,
          }));
        }
      } catch (err) {
        if (i < maxTries - 1) {
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i)));
          continue;
        }
        console.warn('[ScoreManager] 拉取排行榜失败，使用本地缓存', err);
      }
    }
    return this.getCachedScores()
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        return a.time_ms - b.time_ms || b.coins - a.coins;
      })
      .slice(0, limit);
  }

  destroy() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.events.clear();
  }
}
