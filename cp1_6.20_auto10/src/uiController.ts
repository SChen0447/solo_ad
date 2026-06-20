import type { Difficulty } from './beatEngine';

export type GameScreen = 'start' | 'game' | 'pause' | 'result';

export type JudgeType = 'perfect' | 'good' | 'miss';

export interface UICallbacks {
  onAudioUpload: (file: File) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onQuit: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export interface ResultStats {
  readonly score: number;
  readonly maxCombo: number;
  readonly hitRate: number;
  readonly perfectCount: number;
  readonly goodCount: number;
  readonly missCount: number;
}

export class UIController {
  private readonly elements: {
    startScreen: HTMLElement;
    gameScreen: HTMLElement;
    pauseScreen: HTMLElement;
    resultScreen: HTMLElement;
    audioUpload: HTMLInputElement;
    uploadText: HTMLElement;
    startBtn: HTMLButtonElement;
    pauseBtn: HTMLButtonElement;
    resumeBtn: HTMLButtonElement;
    quitBtn: HTMLButtonElement;
    retryBtn: HTMLButtonElement;
    homeBtn: HTMLButtonElement;
    diffCards: NodeListOf<HTMLElement>;
    scoreValue: HTMLElement;
    comboValue: HTMLElement;
    timeValue: HTMLElement;
    finalScore: HTMLElement;
    maxCombo: HTMLElement;
    hitRate: HTMLElement;
    judgeCount: HTMLElement;
    hitPopupLayer: HTMLElement;
  };

  private callbacks: UICallbacks;
  private audioContext: AudioContext | null = null;
  private currentDifficulty: Difficulty = 'normal';
  private audioFileName: string | null = null;
  private activeScoreAnim = 0;
  private activeComboAnim = 0;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.elements = {
      startScreen: document.getElementById('start-screen') as HTMLElement,
      gameScreen: document.getElementById('game-screen') as HTMLElement,
      pauseScreen: document.getElementById('pause-screen') as HTMLElement,
      resultScreen: document.getElementById('result-screen') as HTMLElement,
      audioUpload: document.getElementById('audio-upload') as HTMLInputElement,
      uploadText: document.getElementById('upload-text') as HTMLElement,
      startBtn: document.getElementById('start-btn') as HTMLButtonElement,
      pauseBtn: document.getElementById('pause-btn') as HTMLButtonElement,
      resumeBtn: document.getElementById('resume-btn') as HTMLButtonElement,
      quitBtn: document.getElementById('quit-btn') as HTMLButtonElement,
      retryBtn: document.getElementById('retry-btn') as HTMLButtonElement,
      homeBtn: document.getElementById('home-btn') as HTMLButtonElement,
      diffCards: document.querySelectorAll('.diff-card'),
      scoreValue: document.getElementById('score-value') as HTMLElement,
      comboValue: document.getElementById('combo-value') as HTMLElement,
      timeValue: document.getElementById('time-value') as HTMLElement,
      finalScore: document.getElementById('final-score') as HTMLElement,
      maxCombo: document.getElementById('max-combo') as HTMLElement,
      hitRate: document.getElementById('hit-rate') as HTMLElement,
      judgeCount: document.getElementById('judge-count') as HTMLElement,
      hitPopupLayer: document.getElementById('hit-popup-layer') as HTMLElement
    };
    this.validateElements();
    this.bindEvents();
  }

  private validateElements(): void {
    const required = this.elements as unknown as Record<string, unknown>;
    for (const key of Object.keys(required)) {
      if (!required[key]) {
        throw new Error(`Missing required DOM element: ${key}`);
      }
    }
  }

  private bindEvents(): void {
    this.elements.audioUpload.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0] ?? null;
      if (file) {
        this.audioFileName = file.name;
        this.updateUploadText(file.name);
        this.setStartButtonEnabled(true);
        this.callbacks.onAudioUpload(file);
      }
    });

    this.elements.diffCards.forEach((card) => {
      card.addEventListener('click', () => {
        const diff = card.getAttribute('data-difficulty') as Difficulty;
        if (diff) {
          this.setDifficulty(diff);
          this.callbacks.onDifficultyChange(diff);
        }
      });
    });

    this.elements.startBtn.addEventListener('click', () => {
      this.ensureAudioContext();
      this.callbacks.onStart();
    });

    this.elements.pauseBtn.addEventListener('click', () => {
      this.callbacks.onPause();
    });

    this.elements.resumeBtn.addEventListener('click', () => {
      this.callbacks.onResume();
    });

    this.elements.quitBtn.addEventListener('click', () => {
      this.callbacks.onQuit();
    });

    this.elements.retryBtn.addEventListener('click', () => {
      this.callbacks.onRetry();
    });

    this.elements.homeBtn.addEventListener('click', () => {
      this.callbacks.onHome();
    });
  }

  public setDifficulty(difficulty: Difficulty): void {
    this.currentDifficulty = difficulty;
    this.elements.diffCards.forEach((card) => {
      const d = card.getAttribute('data-difficulty') as Difficulty;
      card.classList.toggle('active', d === difficulty);
    });
  }

  public getDifficulty(): Difficulty {
    return this.currentDifficulty;
  }

  public setStartButtonEnabled(enabled: boolean): void {
    this.elements.startBtn.disabled = !enabled;
    if (enabled) {
      this.elements.startBtn.textContent = '开始游戏';
    } else {
      this.elements.startBtn.textContent = this.audioFileName ? '解析中...' : '请先上传音频';
    }
  }

  private updateUploadText(fileName: string): void {
    const maxLen = 28;
    const display = fileName.length > maxLen
      ? fileName.slice(0, maxLen - 3) + '...'
      : fileName;
    this.elements.uploadText.textContent = `✓ ${display}`;
  }

  public setScreen(screen: GameScreen): void {
    const { startScreen, gameScreen, pauseScreen, resultScreen } = this.elements;

    const screens: Array<{ el: HTMLElement; show: boolean }> = [
      { el: startScreen, show: screen === 'start' },
      { el: gameScreen, show: screen === 'game' || screen === 'pause' },
      { el: pauseScreen, show: screen === 'pause' },
      { el: resultScreen, show: screen === 'result' }
    ];

    for (const { el, show } of screens) {
      el.classList.toggle('visible', show);
    }
  }

  public updateScore(score: number): void {
    if (this.activeScoreAnim !== 0) {
      cancelAnimationFrame(this.activeScoreAnim);
    }

    const from = parseInt(this.elements.scoreValue.textContent ?? '0', 10);
    const to = score;
    if (from === to) return;

    const duration = 260;
    const startTime = performance.now();

    const animate = (now: number): void => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * ease);
      this.elements.scoreValue.textContent = current.toLocaleString();

      if (t < 1) {
        this.activeScoreAnim = requestAnimationFrame(animate);
      } else {
        this.activeScoreAnim = 0;
      }
    };
    this.activeScoreAnim = requestAnimationFrame(animate);
  }

  public updateCombo(combo: number): void {
    if (this.activeComboAnim !== 0) {
      cancelAnimationFrame(this.activeComboAnim);
    }

    const from = parseInt(this.elements.comboValue.textContent ?? '0', 10);
    const to = combo;
    if (from === to && combo === 0) {
      this.elements.comboValue.textContent = '0';
      return;
    }

    if (combo > from) {
      this.elements.comboValue.style.transform = 'scale(1.35)';
      this.elements.comboValue.style.transition = 'none';
      requestAnimationFrame(() => {
        this.elements.comboValue.style.transform = 'scale(1)';
        this.elements.comboValue.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
      });
    }

    const duration = 180;
    const startTime = performance.now();

    const animate = (now: number): void => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * ease);
      this.elements.comboValue.textContent = current.toString();

      if (t < 1) {
        this.activeComboAnim = requestAnimationFrame(animate);
      } else {
        this.activeComboAnim = 0;
      }
    };
    this.activeComboAnim = requestAnimationFrame(animate);
  }

  public updateTime(remainingSeconds: number): void {
    const secs = Math.max(0, Math.ceil(remainingSeconds));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.elements.timeValue.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  public showJudgePopup(
    type: JudgeType,
    x: number,
    y: number
  ): void {
    const popup = document.createElement('div');
    popup.className = `hit-popup ${type}`;

    let label: string;
    switch (type) {
      case 'perfect':
        label = 'PERFECT!';
        break;
      case 'good':
        label = 'GOOD';
        break;
      case 'miss':
        label = 'MISS';
        break;
    }
    popup.textContent = label;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    this.elements.hitPopupLayer.appendChild(popup);

    window.setTimeout(() => {
      popup.remove();
    }, 850);
  }

  public showResult(stats: ResultStats): void {
    this.elements.finalScore.textContent = stats.score.toLocaleString();
    this.elements.maxCombo.textContent = stats.maxCombo.toString();
    this.elements.hitRate.textContent = `${stats.hitRate.toFixed(1)}%`;
    this.elements.judgeCount.textContent = `${stats.perfectCount} / ${stats.goodCount} / ${stats.missCount}`;
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
  }

  public playHitSound(judge: Exclude<JudgeType, 'miss'>): void {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;
    const isPerfect = judge === 'perfect';

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = isPerfect ? 1320 : 990;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.04);

    const peakGain = isPerfect ? 0.28 : 0.2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isPerfect ? 0.18 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);

    if (isPerfect) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.003);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.15);
    }
  }

  public playMissSound(): void {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public dispose(): void {
    if (this.activeScoreAnim) cancelAnimationFrame(this.activeScoreAnim);
    if (this.activeComboAnim) cancelAnimationFrame(this.activeComboAnim);
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}
