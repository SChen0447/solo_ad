/**
 * HUDPanel - 游戏HUD与结算面板控制器
 *
 * 职责：
 *   - 管理左上角HUD显示（时间/金币/名次/在线人数）
 *   - 管理结算面板（排名/用时/金币/排行榜）
 *   - 提供移动端虚拟方向键输入监听
 *   - 作为 DOM <-> GameScene 的桥梁
 *
 * 数据流向：
 *   GameScene事件(updateHUD / showResult / setPlayers) → HUDPanel → 操作DOM渲染
 *   HUDPanel虚拟键 / 重玩按钮 → 回调 → GameScene / main.ts 启动新局
 *
 * 调用关系：
 *   GameScene.ts → setHUDEventHandlers() 订阅事件；onDirection/onRestart/onStart 回调
 */

import type { ScoreEntry, SubmitResult } from '../api/ScoreManager';
import { ScoreManager } from '../api/ScoreManager';

export interface HUDCallbacks {
  onStart: (playerName: string) => void;
  onRestart: () => void;
  onDirection: (dir: 'up' | 'down' | 'left' | 'right' | null, pressed: boolean) => void;
}

export class HUDPanel {
  private hudPanel: HTMLElement;
  private timeEl: HTMLElement;
  private coinsEl: HTMLElement;
  private rankEl: HTMLElement;
  private playersEl: HTMLElement;

  private startScreen: HTMLElement;
  private nameInput: HTMLInputElement;
  private startBtn: HTMLButtonElement;

  private resultPanel: HTMLElement;
  private resultClose: HTMLButtonElement;
  private resultTitle: HTMLElement;
  private resultRank: HTMLElement;
  private resultTime: HTMLElement;
  private resultCoins: HTMLElement;
  private leaderboardList: HTMLElement;
  private restartBtn: HTMLButtonElement;

  private totalCoins: number = 0;
  private callbacks: HUDCallbacks;

  constructor(callbacks: HUDCallbacks) {
    this.callbacks = callbacks;

    this.hudPanel = document.getElementById('hud-panel')!;
    this.timeEl = document.getElementById('hud-time')!;
    this.coinsEl = document.getElementById('hud-coins')!;
    this.rankEl = document.getElementById('hud-rank')!;
    this.playersEl = document.getElementById('hud-players')!;

    this.startScreen = document.getElementById('start-screen')!;
    this.nameInput = document.getElementById('player-name') as HTMLInputElement;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;

    this.resultPanel = document.getElementById('result-panel')!;
    this.resultClose = document.getElementById('result-close') as HTMLButtonElement;
    this.resultTitle = document.getElementById('result-title')!;
    this.resultRank = document.getElementById('result-rank')!;
    this.resultTime = document.getElementById('result-time')!;
    this.resultCoins = document.getElementById('result-coins')!;
    this.leaderboardList = document.getElementById('leaderboard-list')!;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents() {
    const savedName = localStorage.getItem('maze_player_name') || '';
    if (savedName) this.nameInput.value = savedName;

    this.startBtn.addEventListener('click', () => {
      const name = this.nameInput.value.trim() || '匿名玩家';
      localStorage.setItem('maze_player_name', name);
      this.hideStartScreen();
      this.showHUD();
      this.callbacks.onStart(name);
    });

    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.startBtn.click();
    });

    this.resultClose.addEventListener('click', () => this.hideResult());
    this.restartBtn.addEventListener('click', () => {
      this.hideResult();
      this.callbacks.onRestart();
    });

    const dPad = document.querySelectorAll('.d-pad button');
    const handleDir = (btn: Element, pressed: boolean) => {
      const dir = btn.getAttribute('data-dir') as any;
      if (!dir) return;
      this.callbacks.onDirection(dir, pressed);
    };

    dPad.forEach((btn) => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDir(btn, true);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleDir(btn, false);
      });
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleDir(btn, true);
      });
      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        handleDir(btn, false);
      });
      btn.addEventListener('mouseleave', () => handleDir(btn, false));
    });
  }

  hideStartScreen() {
    this.startScreen.classList.add('hidden');
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
  }

  showHUD() {
    this.hudPanel.style.display = 'flex';
  }

  hideHUD() {
    this.hudPanel.style.display = 'none';
  }

  setTotalCoins(total: number) {
    this.totalCoins = total;
    this.updateCoins(0);
  }

  updateTime(ms: number) {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    this.timeEl.textContent = `${m}:${s}`;
  }

  updateCoins(collected: number) {
    this.coinsEl.textContent = `${collected} / ${this.totalCoins}`;
  }

  updateRank(rank: number | string) {
    this.rankEl.textContent = typeof rank === 'number' ? `#${rank}` : String(rank);
  }

  updatePlayers(count: number) {
    this.playersEl.textContent = String(count);
  }

  /**
   * 显示结算面板
   */
  async showResult(
    finished: boolean,
    timeMs: number,
    coins: number,
    submitResult: SubmitResult | null
  ) {
    this.resultTitle.textContent = finished ? '🎉 通关成功！' : '💥 被AI捕获！';
    this.resultRank.textContent = submitResult ? `#${submitResult.rank}` : '-';
    this.resultTime.textContent = ScoreManager.formatMs(timeMs);
    this.resultCoins.textContent = String(coins);

    let leaderboard: ScoreEntry[] = [];
    if (submitResult) {
      leaderboard = submitResult.top10 || [];
    }
    if (leaderboard.length === 0) {
      try {
        const sm = new ScoreManager();
        leaderboard = await sm.fetchLeaderboard(10);
        sm.destroy();
      } catch { /* ignore */ }
    }

    this.renderLeaderboard(leaderboard);

    requestAnimationFrame(() => {
      this.resultPanel.classList.add('visible');
    });
  }

  private renderLeaderboard(list: ScoreEntry[]) {
    this.leaderboardList.innerHTML = '';
    if (list.length === 0) {
      this.leaderboardList.innerHTML =
        '<div style="color:rgba(255,255,255,0.5); text-align:center; padding:16px; font-size:0.9rem;">暂无记录，快去冲刺第一！</div>';
      return;
    }

    list.slice(0, 10).forEach((entry, idx) => {
      const rank = idx + 1;
      const item = document.createElement('div');
      item.className = `leaderboard-item rank-${rank}`;
      item.innerHTML = `
        <span class="lb-rank">#${rank}</span>
        <span class="lb-name"></span>
        <span class="lb-time">${ScoreManager.formatMs(entry.time_ms)} · ⭐${entry.coins}</span>
      `;
      (item.querySelector('.lb-name') as HTMLElement).textContent = entry.name || '匿名玩家';
      this.leaderboardList.appendChild(item);
    });
  }

  hideResult() {
    this.resultPanel.classList.remove('visible');
  }
}
