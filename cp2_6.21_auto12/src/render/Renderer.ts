import { eventBus } from '../EventBus';
import type { GameState, SoundData, Level, SoundPlatform, SoundDoor, PushableBlock } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private time: number = 0;
  private calibrationProgress: number = 0;
  private calibrationVolume: number = 0;
  private currentSoundData: SoundData;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.currentSoundData = {
      frequency: 0,
      volume: 0,
      waveform: new Float32Array(40)
    };

    this.setupEventListeners();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private setupEventListeners(): void {
    eventBus.on('game:update', (data: { state: GameState; soundData: SoundData }) => {
      this.currentSoundData = data.soundData;
    });

    eventBus.on('sound:data', (data: SoundData) => {
      this.currentSoundData = data;
      this.calibrationVolume = data.volume;
    });

    eventBus.on('sound:calibrationProgress', (progress: number) => {
      this.calibrationProgress = progress;
    });

    eventBus.on('sound:calibrationStart', () => {
      this.calibrationProgress = 0;
    });
  }

  resize(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / GAME_WIDTH;
    const scaleY = windowHeight / GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY, 1.2);

    const canvasWidth = GAME_WIDTH * this.scale;
    const canvasHeight = GAME_HEIGHT * this.scale;

    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    this.offsetX = (windowWidth - canvasWidth) / 2;
    this.offsetY = (windowHeight - canvasHeight) / 2;

    this.canvas.style.left = `${this.offsetX}px`;
    this.canvas.style.top = `${this.offsetY}px`;
    this.canvas.style.position = 'absolute';
  }

  render(state: GameState, dt: number): void {
    this.time += dt;
    this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawBackground();

    if (state.currentScreen === 'calibration') {
      this.drawCalibrationScreen();
    } else if (state.level && (state.currentScreen === 'playing' || state.currentScreen === 'complete')) {
      this.drawLevel(state.level);
      this.drawPlayer(state);
      this.drawGoal(state.level, this.time);
      this.drawWaveformVisualizer();
    }

    if (state.currentScreen === 'complete') {
      this.drawCompleteOverlay();
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, 0,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 2
    );
    gradient.addColorStop(0, '#1F2833');
    gradient.addColorStop(1, '#0B0C10');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private drawCalibrationScreen(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 400
    );
    gradient.addColorStop(0, '#1F2833');
    gradient.addColorStop(1, '#0B0C10');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const volumeBarWidth = 200;
    const volumeBarHeight = 20;
    const volumeBarX = centerX - volumeBarWidth / 2;
    const volumeBarY = centerY - 180;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(volumeBarX, volumeBarY, volumeBarWidth, volumeBarHeight);

    const volumeFillWidth = volumeBarWidth * this.calibrationVolume;
    const volumeGradient = this.ctx.createLinearGradient(volumeBarX, 0, volumeBarX + volumeBarWidth, 0);
    volumeGradient.addColorStop(0, '#45A29E');
    volumeGradient.addColorStop(1, '#66FCF1');
    this.ctx.fillStyle = volumeGradient;
    this.ctx.fillRect(volumeBarX, volumeBarY, volumeFillWidth, volumeBarHeight);

    this.ctx.strokeStyle = '#66FCF1';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(volumeBarX, volumeBarY, volumeBarWidth, volumeBarHeight);

    const baseRadius = 50;
    const maxRadius = 120;
    const pulseRadius = baseRadius + (maxRadius - baseRadius) * this.calibrationVolume;
    const displayRadius = baseRadius + (pulseRadius - baseRadius) * 0.2 +
      Math.sin(this.time * 3) * 5;

    const ringColor = this.lerpColor('#45A29E', '#FF6B6B', this.calibrationVolume);

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, displayRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = ringColor;
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    const progressAngle = this.calibrationProgress * Math.PI * 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, displayRadius + 20, -Math.PI / 2, -Math.PI / 2 + progressAngle);
    this.ctx.strokeStyle = '#66FCF1';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`频率: ${Math.round(this.currentSoundData.frequency)} Hz`, centerX, centerY + 10);
    this.ctx.fillText(`音量: ${Math.round(this.currentSoundData.volume * 100)}%`, centerX, centerY + 40);

    this.ctx.fillStyle = '#66FCF1';
    this.ctx.font = 'bold 48px "Segoe UI", sans-serif';
    this.ctx.fillText(`${Math.ceil(5 - this.calibrationProgress * 5)}`, centerX, centerY + 130);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '20px "Segoe UI", sans-serif';
    this.ctx.fillText('请持续发出"啊——"声5秒', centerX, centerY + 180);
  }

  private drawLevel(level: Level): void {
    level.walls.forEach(wall => {
      if (wall.height <= 0) return;
      this.ctx.fillStyle = '#2C2F33';
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      this.ctx.strokeStyle = '#45A29E';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });

    level.platforms.forEach(platform => {
      this.drawPlatform(platform);
    });

    level.doors.forEach(door => {
      this.drawDoor(door);
    });

    level.blocks.forEach(block => {
      this.drawBlock(block);
    });
  }

  private drawPlatform(platform: SoundPlatform): void {
    const gradient = this.ctx.createLinearGradient(
      platform.x, platform.y,
      platform.x, platform.y + platform.height
    );
    gradient.addColorStop(0, '#45A29E');
    gradient.addColorStop(1, '#66FCF1');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 4);
    this.ctx.fill();

    this.ctx.shadowColor = '#66FCF1';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = '#66FCF1';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    const [minFreq, maxFreq] = platform.activeFrequencyRange;
    this.ctx.fillStyle = '#0B0C10';
    this.ctx.font = 'bold 12px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${minFreq}-${maxFreq}Hz`, platform.x + platform.width / 2, platform.y + 14);
  }

  private drawDoor(door: SoundDoor): void {
    const renderX = door.x - door.openProgress * door.width;
    const effectiveWidth = door.width * (1 - door.openProgress);

    if (effectiveWidth < 1) return;

    const gradient = this.ctx.createLinearGradient(
      renderX, door.y,
      renderX + effectiveWidth, door.y
    );
    gradient.addColorStop(0, '#C5C6C7');
    gradient.addColorStop(1, '#8B0000');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(renderX, door.y, effectiveWidth, door.height, 3);
    this.ctx.fill();

    this.ctx.strokeStyle = '#C5C6C7';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (effectiveWidth > 15) {
      const [minFreq, maxFreq] = door.requiredFrequencyRange;
      this.ctx.save();
      this.ctx.translate(renderX + effectiveWidth / 2, door.y + door.height / 2);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 10px "Segoe UI", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${minFreq}-${maxFreq}Hz`, 0, 4);
      this.ctx.restore();
    }
  }

  private drawBlock(block: PushableBlock): void {
    const gradient = this.ctx.createLinearGradient(
      block.x, block.y,
      block.x + block.width, block.y + block.height
    );
    gradient.addColorStop(0, '#F3A183');
    gradient.addColorStop(1, '#EC6F66');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(block.x, block.y, block.width, block.height, 6);
    this.ctx.fill();

    this.ctx.strokeStyle = '#F3A183';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('W', block.x + block.width / 2, block.y + block.height / 2 + 5);
  }

  private drawPlayer(state: GameState): void {
    const player = state.player;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;

    const glowGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 25
    );
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    this.ctx.fill();

    const playerGradient = this.ctx.createRadialGradient(
      centerX - 3, centerY - 3, 0,
      centerX, centerY, player.width / 2
    );
    playerGradient.addColorStop(0, '#FFFF00');
    playerGradient.addColorStop(1, '#FFD700');

    this.ctx.fillStyle = playerGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, player.width / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#FFA500';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawGoal(level: Level, time: number): void {
    const goal = level.goal;
    const flash = Math.sin(time * 4) * 0.3 + 0.7;

    const glowGradient = this.ctx.createRadialGradient(
      goal.x, goal.y, 0,
      goal.x, goal.y, goal.radius * 2
    );
    glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.5 * flash})`);
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(goal.x, goal.y, goal.radius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.drawStar(goal.x, goal.y, 5, goal.radius * flash, goal.radius * 0.5 * flash);
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
    gradient.addColorStop(0, '#FFFF00');
    gradient.addColorStop(1, '#FFD700');

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();

    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    this.ctx.strokeStyle = '#FFA500';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawWaveformVisualizer(): void {
    const vizWidth = 200;
    const vizHeight = 80;
    const vizX = GAME_WIDTH - vizWidth - 20;
    const vizY = GAME_HEIGHT - vizHeight - 20;

    this.ctx.fillStyle = 'rgba(31, 40, 51, 0.8)';
    this.ctx.beginPath();
    this.ctx.roundRect(vizX, vizY, vizWidth, vizHeight, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(102, 252, 241, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    const waveform = this.currentSoundData.waveform;
    const centerY = vizY + vizHeight / 2;
    const sampleCount = waveform.length;

    const gradient = this.ctx.createLinearGradient(vizX, 0, vizX + vizWidth, 0);
    const freq = this.currentSoundData.frequency;
    if (freq < 300) {
      gradient.addColorStop(0, '#45A29E');
      gradient.addColorStop(1, '#66FCF1');
    } else if (freq < 600) {
      gradient.addColorStop(0, '#66FCF1');
      gradient.addColorStop(1, '#9D4EDD');
    } else {
      gradient.addColorStop(0, '#9D4EDD');
      gradient.addColorStop(1, '#7B2CBF');
    }

    this.ctx.beginPath();
    this.ctx.moveTo(vizX, centerY);

    for (let i = 0; i < sampleCount; i++) {
      const x = vizX + (i / (sampleCount - 1)) * vizWidth;
      const amplitude = waveform[i] * (vizHeight / 2 - 5) * Math.max(1, this.currentSoundData.volume * 3);
      const y = centerY + amplitude;
      this.ctx.lineTo(x, y);
    }

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#66FCF1';
    this.ctx.font = 'bold 10px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${Math.round(freq)}Hz`, vizX + 5, vizY + 15);
  }

  private drawCompleteOverlay(): void {
    this.ctx.fillStyle = 'rgba(11, 12, 16, 0.7)';
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.ctx.shadowColor = '#66FCF1';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#66FCF1';
    this.ctx.font = 'bold 48px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('恭喜通关！', centerX, centerY - 20);
    this.ctx.shadowBlur = 0;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
