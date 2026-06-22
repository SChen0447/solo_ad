import { GEOLOGICAL_PERIODS } from '../data/platesData.js';

type TimeUpdateCallback = (time: number) => void;
type PlayStateCallback = (playing: boolean) => void;

export class TimelineController {
  private currentTime: number = -250;
  private minTime: number = -250;
  private maxTime: number = 0;
  private isPlaying: boolean = false;
  private playInterval: number | null = null;
  private playSpeed: number = 10;
  private callbacks: TimeUpdateCallback[] = [];
  private playStateCallbacks: PlayStateCallback[] = [];
  private slider: HTMLInputElement | null = null;
  private playBtn: HTMLElement | null = null;
  private tickContainer: HTMLElement | null = null;

  constructor() {
    this.createUI();
  }

  private createUI(): void {
    const container = document.createElement('div');
    container.id = 'timeline-container';
    container.innerHTML = `
      <div class="timeline-ticks" id="timeline-ticks"></div>
      <div class="timeline-track">
        <input type="range" id="timeline-slider" 
          min="${this.minTime}" max="${this.maxTime}" value="${this.currentTime}" 
          step="0.1" class="timeline-slider" />
        <div class="timeline-thumb-shadow" id="thumb-shadow"></div>
      </div>
      <button class="play-btn" id="play-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" id="play-icon">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </button>
    `;
    document.body.appendChild(container);

    this.slider = document.getElementById('timeline-slider') as HTMLInputElement;
    this.playBtn = document.getElementById('play-btn');
    this.tickContainer = document.getElementById('timeline-ticks');

    this.createTicks();
    this.bindEvents();
    this.applyStyles();
  }

  private createTicks(): void {
    if (!this.tickContainer) return;
    const ticks = [
      { time: -250, label: '二叠纪末' },
      { time: -200, label: '三叠纪' },
      { time: -145, label: '侏罗纪' },
      { time: -66, label: '白垩纪' },
      { time: -23, label: '古近纪' },
      { time: -2.6, label: '第四纪' },
      { time: 0, label: '现代' },
    ];

    const range = this.maxTime - this.minTime;
    for (const tick of ticks) {
      const pct = ((tick.time - this.minTime) / range) * 100;
      const el = document.createElement('div');
      el.className = 'timeline-tick';
      el.style.left = `${pct}%`;
      el.innerHTML = `<span class="tick-line"></span><span class="tick-label">${tick.label}</span>`;
      this.tickContainer.appendChild(el);
    }
  }

  private bindEvents(): void {
    if (this.slider) {
      this.slider.addEventListener('input', () => {
        this.currentTime = parseFloat(this.slider!.value);
        this.emitUpdate();
      });
    }

    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.togglePlay();
      });
    }
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    this.isPlaying = true;
    this.updatePlayButton();
    this.emitPlayStateChange();

    if (this.currentTime >= this.maxTime) {
      this.currentTime = this.minTime;
      this.updateSlider();
    }

    let lastTime = performance.now();
    const step = () => {
      if (!this.isPlaying) return;
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const timeDelta = delta * this.playSpeed;
      this.currentTime = Math.min(this.currentTime + timeDelta, this.maxTime);

      this.updateSlider();
      this.emitUpdate();

      if (this.currentTime >= this.maxTime) {
        this.pause();
        return;
      }

      this.playInterval = requestAnimationFrame(step);
    };

    this.playInterval = requestAnimationFrame(step);
  }

  pause(): void {
    this.isPlaying = false;
    this.updatePlayButton();
    this.emitPlayStateChange();
    if (this.playInterval) {
      cancelAnimationFrame(this.playInterval);
      this.playInterval = null;
    }
  }

  private updatePlayButton(): void {
    const icon = document.getElementById('play-icon');
    if (!icon) return;

    if (this.isPlaying) {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />';
    } else {
      icon.innerHTML = '<polygon points="5,3 19,12 5,21" />';
    }
  }

  private updateSlider(): void {
    if (this.slider) {
      this.slider.value = this.currentTime.toString();
    }
    this.updateThumbShadow();
  }

  private updateThumbShadow(): void {
    const shadow = document.getElementById('thumb-shadow');
    if (!shadow || !this.slider) return;
    const range = this.maxTime - this.minTime;
    const pct = ((this.currentTime - this.minTime) / range) * 100;
    shadow.style.left = `${pct}%`;
  }

  private emitUpdate(): void {
    for (const cb of this.callbacks) {
      cb(this.currentTime);
    }
  }

  private emitPlayStateChange(): void {
    for (const cb of this.playStateCallbacks) {
      cb(this.isPlaying);
    }
  }

  onTimeUpdate(cb: TimeUpdateCallback): void {
    this.callbacks.push(cb);
  }

  onPlayStateChange(cb: PlayStateCallback): void {
    this.playStateCallbacks.push(cb);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getProgress(): number {
    const range = this.maxTime - this.minTime;
    if (range === 0) return 0;
    return (this.currentTime - this.minTime) / range;
  }

  getCurrentPeriod(): { nameCN: string; timeAgo: string } {
    const period = GEOLOGICAL_PERIODS.find(
      (p) => this.currentTime >= p.start && this.currentTime <= p.end
    ) || GEOLOGICAL_PERIODS[GEOLOGICAL_PERIODS.length - 1];

    const years = Math.abs(this.currentTime);
    let timeAgo: string;
    if (years < 1) {
      timeAgo = `距今${Math.round(years * 100)}万年`;
    } else {
      timeAgo = `距今${years.toFixed(2)}亿年`;
    }

    return { nameCN: period.nameCN, timeAgo };
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #timeline-container {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        width: min(80vw, 900px);
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 24px;
        background: linear-gradient(135deg, rgba(28,42,74,0.85), rgba(10,15,30,0.9));
        backdrop-filter: blur(12px);
        border: 1px solid rgba(224,230,255,0.1);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
        z-index: 100;
      }
      
      .timeline-ticks {
        position: absolute;
        top: -24px;
        left: 0;
        right: 0;
        height: 24px;
        pointer-events: none;
      }
      
      .timeline-tick {
        position: absolute;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .tick-line {
        width: 1px;
        height: 8px;
        background: rgba(224,230,255,0.3);
        display: block;
      }
      
      .tick-label {
        font-size: 10px;
        color: rgba(224,230,255,0.5);
        white-space: nowrap;
        margin-top: 2px;
        font-family: 'Segoe UI', sans-serif;
      }
      
      .timeline-track {
        flex: 1;
        position: relative;
        height: 6px;
      }
      
      .timeline-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, #1c2a4a, #2a3a6a);
        outline: none;
        position: relative;
        z-index: 2;
      }
      
      .timeline-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6a8fff, #4a6fd9);
        cursor: pointer;
        border: 2px solid rgba(224,230,255,0.4);
        box-shadow: 0 0 12px rgba(106,143,255,0.5), 0 0 4px rgba(106,143,255,0.3);
        transition: transform 0.1s ease, box-shadow 0.2s ease;
      }
      
      .timeline-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 20px rgba(106,143,255,0.7), 0 0 8px rgba(106,143,255,0.5);
      }
      
      .timeline-slider::-webkit-slider-thumb:active {
        transform: scale(1.05);
      }
      
      .timeline-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6a8fff, #4a6fd9);
        cursor: pointer;
        border: 2px solid rgba(224,230,255,0.4);
        box-shadow: 0 0 12px rgba(106,143,255,0.5);
      }
      
      #thumb-shadow {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(106,143,255,0.25) 0%, transparent 70%);
        pointer-events: none;
        z-index: 1;
        transition: left 0.05s ease;
      }
      
      .play-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(224,230,255,0.2);
        background: linear-gradient(135deg, rgba(106,143,255,0.3), rgba(74,111,217,0.2));
        color: #e0e6ff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease, background 0.2s ease;
        flex-shrink: 0;
      }
      
      .play-btn:hover {
        background: linear-gradient(135deg, rgba(106,143,255,0.5), rgba(74,111,217,0.4));
        transform: scale(1.08);
      }
      
      .play-btn:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
  }
}
