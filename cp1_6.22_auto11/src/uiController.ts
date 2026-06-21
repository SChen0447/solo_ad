import { GameState } from './gameScene';
import { AudioManager } from './audioManager';

export interface GameController {
  togglePlay(): boolean;
  setSpeed(speed: number): void;
  setSong(songId: string): Promise<void>;
  getAudioManager(): AudioManager;
  setStateChangeCallback(callback: (state: GameState) => void): void;
}

export class UIController {
  private gameController: GameController;
  private playBtn: HTMLButtonElement;
  private songSelect: HTMLSelectElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLDivElement;
  private scoreDisplay: HTMLDivElement;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private audioManager: AudioManager;
  private animationFrameId: number | null = null;
  private isPlaying: boolean = false;
  private currentScore: number = 0;

  constructor(gameController: GameController) {
    this.gameController = gameController;
    this.audioManager = gameController.getAudioManager();
    
    const playBtn = document.getElementById('play-btn');
    const songSelect = document.getElementById('song-select');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const scoreDisplay = document.getElementById('score-display');
    const waveformCanvas = document.getElementById('waveform-canvas');
    
    if (!playBtn || !songSelect || !speedSlider || !speedValue || !scoreDisplay || !waveformCanvas) {
      throw new Error('Required UI elements not found');
    }
    
    this.playBtn = playBtn as HTMLButtonElement;
    this.songSelect = songSelect as HTMLSelectElement;
    this.speedSlider = speedSlider as HTMLInputElement;
    this.speedValue = speedValue as HTMLDivElement;
    this.scoreDisplay = scoreDisplay as HTMLDivElement;
    this.waveformCanvas = waveformCanvas as HTMLCanvasElement;
    
    const ctx = this.waveformCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get waveform canvas context');
    }
    this.waveformCtx = ctx;
    
    this.resizeWaveformCanvas();
    this.bindEvents();
    this.setupStateCallback();
    this.startWaveformAnimation();
    
    window.addEventListener('resize', () => this.resizeWaveformCanvas());
  }

  private resizeWaveformCanvas(): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.waveformCanvas.width = rect.width * dpr;
    this.waveformCanvas.height = rect.height * dpr;
    this.waveformCtx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    this.playBtn.addEventListener('click', () => {
      this.onPlayToggle();
    });
    
    this.songSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onSongChange(target.value);
    });
    
    this.speedSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const speed = parseFloat(target.value);
      this.onSpeedChange(speed);
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }
    });
  }

  private setupStateCallback(): void {
    this.gameController.setStateChangeCallback((state: GameState) => {
      this.updateState(state);
    });
  }

  private updateState(state: GameState): void {
    if (state.score !== this.currentScore) {
      this.animateScoreChange(state.score);
      this.currentScore = state.score;
    }
    
    if (state.isPlaying !== this.isPlaying) {
      this.isPlaying = state.isPlaying;
      this.updatePlayButton();
    }
  }

  private animateScoreChange(newScore: number): void {
    this.scoreDisplay.style.transform = 'scale(1.3)';
    this.scoreDisplay.style.color = '#00FF00';
    
    setTimeout(() => {
      this.scoreDisplay.textContent = newScore.toString();
    }, 100);
    
    setTimeout(() => {
      this.scoreDisplay.style.transform = 'scale(1)';
      this.scoreDisplay.style.color = '#ffd93d';
    }, 300);
  }

  private onPlayToggle(): void {
    const isPlaying = this.gameController.togglePlay();
    this.isPlaying = isPlaying;
    this.updatePlayButton();
  }

  private updatePlayButton(): void {
    if (this.isPlaying) {
      this.playBtn.classList.remove('paused');
      this.playBtn.classList.add('playing');
      this.playBtn.textContent = '⏸';
    } else {
      this.playBtn.classList.remove('playing');
      this.playBtn.classList.add('paused');
      this.playBtn.textContent = '▶';
    }
  }

  private async onSongChange(songId: string): Promise<void> {
    await this.gameController.setSong(songId);
  }

  private onSpeedChange(speed: number): void {
    this.gameController.setSpeed(speed);
    this.speedValue.textContent = `${speed.toFixed(1)}x`;
    
    this.speedValue.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    this.speedValue.style.transform = 'scale(1.2)';
    setTimeout(() => {
      this.speedValue.style.transform = 'scale(1)';
    }, 200);
  }

  private startWaveformAnimation(): void {
    const animate = () => {
      this.drawWaveform();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private drawWaveform(): void {
    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(116, 185, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(9, 132, 227, 0.6)');
    gradient.addColorStop(1, 'rgba(116, 185, 255, 0.3)');
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    const timeData = this.audioManager.getTimeDomainData();
    const freqData = this.audioManager.getFrequencyData();
    
    if (timeData.length === 0) {
      ctx.strokeStyle = 'rgba(116, 185, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }
    
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const sliceWidth = width / timeData.length;
    let x = 0;
    
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i]! / 128.0;
      const y = (v * height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
    
    ctx.shadowColor = 'rgba(116, 185, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    const barCount = 64;
    const barWidth = width / barCount - 2;
    const freqStep = Math.floor(freqData.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      const freqIndex = i * freqStep;
      const freqValue = freqData[freqIndex]! / 255;
      const barHeight = freqValue * height * 0.3;
      
      const barX = i * (barWidth + 2);
      const barY = height - barHeight - 5;
      
      const barGradient = ctx.createLinearGradient(barX, barY, barX, height - 5);
      barGradient.addColorStop(0, 'rgba(116, 185, 255, 0.8)');
      barGradient.addColorStop(1, 'rgba(116, 185, 255, 0.1)');
      
      ctx.fillStyle = barGradient;
      ctx.fillRect(barX, barY, barWidth, barHeight);
    }
    
    if (this.isPlaying) {
      const lowFreq = freqData.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
      const intensity = lowFreq / 255;
      
      if (intensity > 0.6) {
        this.waveformCanvas.style.boxShadow = `0 0 ${20 + intensity * 30}px rgba(116, 185, 255, ${intensity * 0.5})`;
      } else {
        this.waveformCanvas.style.boxShadow = 'none';
      }
    }
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', () => this.resizeWaveformCanvas());
  }
}
