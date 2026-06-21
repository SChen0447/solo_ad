import { Particle, COLORS, CONFIG } from './types';
import { Fragment } from './Fragment';

export interface RenderState {
  grid: number[][];
  playerX: number;
  playerY: number;
  fragments: Fragment[];
  particles: Particle[];
  level: number;
  collectedCount: number;
  totalFragments: number;
  elapsedTime: number;
  fps: number;
  resetAnimation: number;
  exitOpen: boolean;
  cellSize: number;
  mazeOffsetX: number;
  mazeOffsetY: number;
  mazeWidth: number;
  mazeHeight: number;
  buttonHovered: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private collectSound: AudioBuffer | null = null;
  private audioContext: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.initAudio();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.generateCollectSound();
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  private generateCollectSound(): void {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 880 + 440 * (1 - t / duration);
      const envelope = Math.exp(-t * 20);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }

    this.collectSound = buffer;
  }

  public playCollectSound(): void {
    if (!this.audioContext || !this.collectSound) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.collectSound;
    source.connect(this.audioContext.destination);
    source.start();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public render(state: RenderState): void {
    const { width, height } = this.canvas;

    this.ctx.save();

    if (state.resetAnimation > 0) {
      const scale = 1 - Math.sin((1 - state.resetAnimation / 0.1) * Math.PI) * 0.02;
      this.ctx.translate(width / 2, height / 2);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-width / 2, -height / 2);
    }

    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, width, height);

    this.drawMazeBorder(state);
    this.drawMaze(state);
    this.drawExit(state);
    this.drawFragments(state);
    this.drawPlayer(state);
    this.drawParticles(state);
    this.drawLightingMask(state);
    this.drawProgressBar(state);
    this.drawUI(state);

    this.ctx.restore();
  }

  private drawMazeBorder(state: RenderState): void {
    const { mazeOffsetX, mazeOffsetY, mazeWidth, mazeHeight } = state;
    const borderSize = 20;

    const gradient = this.ctx.createLinearGradient(
      mazeOffsetX - borderSize,
      mazeOffsetY - borderSize,
      mazeOffsetX + mazeWidth + borderSize,
      mazeOffsetY + mazeHeight + borderSize
    );
    gradient.addColorStop(0, 'rgba(26, 54, 93, 0.8)');
    gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.9)');
    gradient.addColorStop(1, 'rgba(26, 54, 93, 0.8)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      mazeOffsetX - borderSize,
      mazeOffsetY - borderSize,
      mazeWidth + borderSize * 2,
      mazeHeight + borderSize * 2
    );

    this.ctx.strokeStyle = 'rgba(56, 178, 172, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      mazeOffsetX - borderSize,
      mazeOffsetY - borderSize,
      mazeWidth + borderSize * 2,
      mazeHeight + borderSize * 2
    );
  }

  private drawMaze(state: RenderState): void {
    const { grid, cellSize, mazeOffsetX, mazeOffsetY } = state;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const px = mazeOffsetX + x * cellSize;
        const py = mazeOffsetY + y * cellSize;

        if (grid[y][x] === 1) {
          this.ctx.fillStyle = COLORS.WALL;
          this.ctx.fillRect(px, py, cellSize, cellSize);

          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          this.ctx.fillRect(px, py, cellSize, 3);
          this.ctx.fillRect(px, py, 3, cellSize);

          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          this.ctx.fillRect(px, py + cellSize - 3, cellSize, 3);
          this.ctx.fillRect(px + cellSize - 3, py, 3, cellSize);
        } else {
          this.ctx.fillStyle = 'rgba(226, 232, 240, 0.03)';
          this.ctx.fillRect(px, py, cellSize, cellSize);

          this.ctx.strokeStyle = 'rgba(226, 232, 240, 0.15)';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(px, py, cellSize, cellSize);
        }
      }
    }
  }

  private drawExit(state: RenderState): void {
    if (!state.exitOpen) return;

    const { mazeOffsetX, mazeOffsetY, cellSize, grid } = state;
    let exitX = 0;
    let exitY = 0;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (x === grid.length - 2 && y === grid.length - 2) {
          exitX = x;
          exitY = y;
        }
      }
    }

    const px = mazeOffsetX + exitX * cellSize;
    const py = mazeOffsetY + exitY * cellSize;

    const gradient = this.ctx.createRadialGradient(
      px + cellSize / 2,
      py + cellSize / 2,
      0,
      px + cellSize / 2,
      py + cellSize / 2,
      cellSize
    );
    gradient.addColorStop(0, 'rgba(56, 178, 172, 0.8)');
    gradient.addColorStop(0.5, 'rgba(56, 178, 172, 0.3)');
    gradient.addColorStop(1, 'rgba(56, 178, 172, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(px - cellSize / 2, py - cellSize / 2, cellSize * 2, cellSize * 2);

    this.ctx.fillStyle = 'rgba(56, 178, 172, 0.6)';
    this.ctx.fillRect(px + 5, py + 5, cellSize - 10, cellSize - 10);
  }

  private drawFragments(state: RenderState): void {
    for (const fragment of state.fragments) {
      fragment.draw(this.ctx, state.cellSize, state.mazeOffsetX, state.mazeOffsetY);
    }
  }

  private drawPlayer(state: RenderState): void {
    const { playerX, playerY } = state;
    const radius = CONFIG.PLAYER_RADIUS;

    const glowGradient = this.ctx.createRadialGradient(
      playerX, playerY, 0,
      playerX, playerY, radius * 2
    );
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(playerX, playerY, radius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    const playerGradient = this.ctx.createRadialGradient(
      playerX, playerY, 0,
      playerX, playerY, radius
    );
    playerGradient.addColorStop(0, COLORS.PLAYER_CENTER);
    playerGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
    playerGradient.addColorStop(1, COLORS.PLAYER_EDGE);

    this.ctx.fillStyle = playerGradient;
    this.ctx.beginPath();
    this.ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawParticles(state: RenderState): void {
    for (const particle of state.particles) {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha * 0.8;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawLightingMask(state: RenderState): void {
    const { playerX, playerY, mazeOffsetX, mazeOffsetY, mazeWidth, mazeHeight } = state;
    const lightRadius = CONFIG.LIGHT_RADIUS;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    tempCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    tempCtx.globalCompositeOperation = 'destination-out';

    const gradient = tempCtx.createRadialGradient(
      playerX, playerY, 0,
      playerX, playerY, lightRadius * 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    tempCtx.fillStyle = gradient;
    tempCtx.beginPath();
    tempCtx.arc(playerX, playerY, lightRadius * 2, 0, Math.PI * 2);
    tempCtx.fill();

    tempCtx.globalCompositeOperation = 'source-over';

    this.ctx.drawImage(
      tempCanvas,
      mazeOffsetX - 50,
      mazeOffsetY - 50,
      mazeWidth + 100,
      mazeHeight + 100,
      mazeOffsetX - 50,
      mazeOffsetY - 50,
      mazeWidth + 100,
      mazeHeight + 100
    );
  }

  private drawProgressBar(state: RenderState): void {
    const { playerY, collectedCount, totalFragments, mazeWidth, mazeOffsetX } = state;

    const barWidth = mazeWidth;
    const barHeight = 6;
    const barX = mazeOffsetX;
    const barY = playerY - CONFIG.PLAYER_RADIUS - 20;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    const progress = collectedCount / totalFragments;
    const gradient = this.ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, COLORS.PROGRESS_START);
    gradient.addColorStop(1, COLORS.PROGRESS_END);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    this.ctx.fillStyle = COLORS.UI_TEXT;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `${collectedCount}/${totalFragments}`,
      barX + barWidth / 2,
      barY - 5
    );
  }

  private drawUI(state: RenderState): void {
    const { width, height } = this.canvas;
    const { level, elapsedTime, collectedCount, totalFragments, fps } = state;

    this.ctx.fillStyle = COLORS.UI_TEXT;
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';

    const timeStr = elapsedTime.toFixed(1);
    this.ctx.fillText(`关卡 ${level} | 时间: ${timeStr}s`, 20, 35);

    this.ctx.textAlign = 'right';
    this.ctx.fillText(`收集: ${collectedCount}/${totalFragments}`, width - 20, 35);

    this.ctx.textAlign = 'left';
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = COLORS.FPS_TEXT;
    this.ctx.fillText(`粒子: ${state.particles.length}`, 20, height - 20);

    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${fps.toFixed(0)}`, width - 20, height - 20);

    this.drawResetButton(state);
  }

  private drawResetButton(state: RenderState): void {
    const { width, height } = this.canvas;
    const { buttonHovered } = state;

    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonX = (width - buttonWidth) / 2;
    const buttonY = height - 70;

    this.ctx.fillStyle = buttonHovered ? COLORS.BUTTON_HOVER : COLORS.BUTTON_BG;
    this.ctx.beginPath();
    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(56, 178, 172, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = COLORS.UI_TEXT;
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('重新开始', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    this.ctx.textBaseline = 'alphabetic';
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  public isPointInButton(px: number, py: number, width: number, height: number): boolean {
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonX = (width - buttonWidth) / 2;
    const buttonY = height - 70;

    return px >= buttonX && px <= buttonX + buttonWidth &&
           py >= buttonY && py <= buttonY + buttonHeight;
  }
}
