import type { BandEnergy } from './audioEngine';
import type { GameState } from './rhythmRunner';

export interface UIConfig {
  rhythmBarIds: {
    low: string;
    mid: string;
    high: string;
  };
  thresholdIds: {
    low: string;
    mid: string;
    high: string;
  };
  scoreId: string;
  livesId: string;
  startOverlayId: string;
  gameOverOverlayId: string;
  finalScoreId: string;
  startBtnId: string;
  restartBtnId: string;
  toggleControlsId: string;
  controlsInfoId: string;
  statusPausedId: string;
  rhythmPanelId: string;
}

export const DEFAULT_UI_IDS: UIConfig = {
  rhythmBarIds: { low: 'barLow', mid: 'barMid', high: 'barHigh' },
  thresholdIds: { low: 'threshLow', mid: 'threshMid', high: 'threshHigh' },
  scoreId: 'scoreValue',
  livesId: 'livesHearts',
  startOverlayId: 'startOverlay',
  gameOverOverlayId: 'gameOverOverlay',
  finalScoreId: 'finalScore',
  startBtnId: 'startBtn',
  restartBtnId: 'restartBtn',
  toggleControlsId: 'toggleControls',
  controlsInfoId: 'controlsInfo',
  statusPausedId: 'statusPaused',
  rhythmPanelId: 'rhythmPanel'
};

type UIEventListener = (event: string, data?: unknown) => void;

export class UIOverlay {
  private config: UIConfig;
  private elements: Map<string, HTMLElement> = new Map();
  private listeners: Map<string, UIEventListener[]> = new Map();
  private animatedScore: number = 0;
  private targetScore: number = 0;
  private barHighlights: Map<keyof BandEnergy, number> = new Map();

  constructor(config: Partial<UIConfig> = {}) {
    this.config = { ...DEFAULT_UI_IDS, ...config };
    this.barHighlights.set('low', 0);
    this.barHighlights.set('mid', 0);
    this.barHighlights.set('high', 0);
    this.cacheElements();
    this.bindEvents();
  }

  private cacheElements(): void {
    const allIds: string[] = [
      this.config.rhythmBarIds.low,
      this.config.rhythmBarIds.mid,
      this.config.rhythmBarIds.high,
      this.config.thresholdIds.low,
      this.config.thresholdIds.mid,
      this.config.thresholdIds.high,
      this.config.scoreId,
      this.config.livesId,
      this.config.startOverlayId,
      this.config.gameOverOverlayId,
      this.config.finalScoreId,
      this.config.startBtnId,
      this.config.restartBtnId,
      this.config.toggleControlsId,
      this.config.controlsInfoId,
      this.config.statusPausedId,
      this.config.rhythmPanelId
    ];

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) this.elements.set(id, el);
    });

    this.updateLivesDisplay(3, 3);
  }

  private bindEvents(): void {
    const startBtn = this.elements.get(this.config.startBtnId);
    const restartBtn = this.elements.get(this.config.restartBtnId);
    const toggleBtn = this.elements.get(this.config.toggleControlsId);
    const controlsInfo = this.elements.get(this.config.controlsInfoId);

    if (startBtn) {
      startBtn.addEventListener('click', () => this.emit('startRequest'));
    }
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.emit('restartRequest'));
    }
    if (toggleBtn && controlsInfo) {
      toggleBtn.addEventListener('click', () => {
        controlsInfo.classList.toggle('expanded');
      });
    }
  }

  public on(event: string, listener: UIEventListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: string, data?: unknown): void {
    const list = this.listeners.get(event);
    list?.forEach((cb) => cb(event, data));
  }

  public updateRhythmBars(energy: BandEnergy, thresholds: BandEnergy): void {
    (Object.keys(energy) as (keyof BandEnergy)[]).forEach((band) => {
      const barEl = this.elements.get(this.config.rhythmBarIds[band]);
      const thresholdEl = this.elements.get(this.config.thresholdIds[band]);

      if (barEl) {
        const pct = Math.min(100, Math.max(0, energy[band] * 100));
        barEl.style.height = `${pct}%`;

        const threshPct = thresholds[band] * 100;
        if (thresholdEl) {
          thresholdEl.style.bottom = `${threshPct}%`;
        }

        const highlight = energy[band] >= thresholds[band];
        if (highlight) {
          this.barHighlights.set(band, 1);
          barEl.style.filter = 'brightness(1.6) saturate(1.3)';
          barEl.style.transform = 'scaleX(1.08)';
        } else {
          const prev = this.barHighlights.get(band) ?? 0;
          const newVal = Math.max(0, prev - 0.08);
          this.barHighlights.set(band, newVal);
          if (newVal <= 0) {
            barEl.style.filter = '';
            barEl.style.transform = '';
          }
        }
      }
    });
  }

  public updateScore(score: number, immediate: boolean = false): void {
    this.targetScore = score;
    if (immediate) {
      this.animatedScore = score;
      this.renderScore();
    }
  }

  public updateLives(lives: number, maxLives: number): void {
    this.updateLivesDisplay(lives, maxLives);
  }

  private updateLivesDisplay(lives: number, maxLives: number): void {
    const container = this.elements.get(this.config.livesId);
    if (!container) return;

    const hearts = container.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
      if (i < lives) {
        h.classList.remove('lost');
      } else {
        if (!h.classList.contains('lost')) {
          h.classList.add('lost');
          h.animate(
            [
              { transform: 'scale(1)' },
              { transform: 'scale(1.4)', offset: 0.3 },
              { transform: 'scale(0.8)' }
            ],
            { duration: 400, easing: 'ease-out' }
          );
        }
      }
    });

    while (hearts.length < maxLives) {
      const span = document.createElement('span');
      span.className = 'heart';
      span.textContent = '💙';
      container.appendChild(span);
    }
    while (hearts.length > maxLives) {
      container.removeChild(container.lastChild!);
    }
  }

  private renderScore(): void {
    const el = this.elements.get(this.config.scoreId);
    if (el) el.textContent = Math.floor(this.animatedScore).toLocaleString();
  }

  public showStartOverlay(show: boolean): void {
    const el = this.elements.get(this.config.startOverlayId);
    if (el) el.style.display = show ? 'block' : 'none';
  }

  public showGameOverOverlay(show: boolean, finalScore: number = 0): void {
    const el = this.elements.get(this.config.gameOverOverlayId);
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
    if (show) {
      const finalEl = this.elements.get(this.config.finalScoreId);
      if (finalEl) finalEl.textContent = finalScore.toLocaleString();
    }
  }

  public showPaused(show: boolean): void {
    const el = this.elements.get(this.config.statusPausedId);
    if (el) el.style.display = show ? 'block' : 'none';
  }

  public showRhythmPanel(show: boolean): void {
    const el = this.elements.get(this.config.rhythmPanelId);
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  public tickAnimation(dt: number): void {
    this.animatedScore += (this.targetScore - this.animatedScore) * Math.min(1, dt * 6);
    if (Math.abs(this.targetScore - this.animatedScore) > 0.5) {
      this.renderScore();
    } else if (this.animatedScore !== this.targetScore) {
      this.animatedScore = this.targetScore;
      this.renderScore();
    }
  }

  public triggerBandFlash(band: keyof BandEnergy): void {
    const barEl = this.elements.get(this.config.rhythmBarIds[band]);
    if (!barEl) return;

    barEl.animate(
      [
        { filter: 'brightness(2.5) saturate(1.8)', transform: 'scaleX(1.15)' },
        { filter: '', transform: 'scaleX(1)' }
      ],
      { duration: 300, easing: 'ease-out' }
    );
  }

  public updateFromGameState(state: GameState): void {
    this.updateScore(state.score);
    this.updateLives(state.lives, state.maxLives);
  }

  public hideAllOverlays(): void {
    this.showStartOverlay(false);
    this.showGameOverOverlay(false);
    this.showPaused(false);
  }

  public setStartButtonText(text: string): void {
    const el = this.elements.get(this.config.startBtnId);
    if (el) el.textContent = text;
  }
}
