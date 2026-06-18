import type { TrailPoint } from './input';

export interface Ball {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startTime: number;
  duration: number;
  radius: number;
  color: string;
  requiredDirection: string;
  sliced: boolean;
  sliceTime: number;
  sliceDirection?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface MissEffect {
  x: number;
  y: number;
  time: number;
}

export interface ScorePopup {
  x: number;
  y: number;
  score: number;
  time: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private cachedBackground: ImageData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.cachedBackground = null;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(pulseIntensity: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (!this.cachedBackground) {
      this.offscreenCtx.clearRect(0, 0, width, height);
      const gradient = this.offscreenCtx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0a0a2e');
      gradient.addColorStop(0.5, '#1a0a3e');
      gradient.addColorStop(1, '#1a0a2e');
      this.offscreenCtx.fillStyle = gradient;
      this.offscreenCtx.fillRect(0, 0, width, height);

      for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2 + 0.5;
        this.offscreenCtx.beginPath();
        this.offscreenCtx.arc(x, y, size, 0, Math.PI * 2);
        this.offscreenCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
        this.offscreenCtx.fill();
      }

      this.cachedBackground = this.offscreenCtx.getImageData(0, 0, width, height);
    }

    this.ctx.putImageData(this.cachedBackground, 0, 0);

    if (pulseIntensity > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity * 0.15})`;
      this.ctx.fillRect(0, 0, width, height);
    }

    const gridGradient = this.ctx.createLinearGradient(0, height * 0.3, 0, height);
    gridGradient.addColorStop(0, 'rgba(138, 43, 226, 0)');
    gridGradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.1)');
    gridGradient.addColorStop(1, 'rgba(0, 212, 255, 0.2)');
    this.ctx.strokeStyle = gridGradient;
    this.ctx.lineWidth = 1;

    const gridSize = 80;
    for (let x = 0; x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, height * 0.3);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = height * 0.3; y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  drawBall(ball: Ball, currentTime: number): void {
    const progress = (currentTime - ball.startTime) / ball.duration;
    const remaining = 1 - progress;

    if (ball.sliced) {
      const sliceProgress = (currentTime - ball.sliceTime) / 500;
      if (sliceProgress >= 1) return;

      const offset = sliceProgress * 60;
      const alpha = 1 - sliceProgress;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y - offset, ball.radius * 0.8, Math.PI, 0);
      this.ctx.fillStyle = ball.color;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y + offset, ball.radius * 0.8, 0, Math.PI);
      this.ctx.fillStyle = ball.color;
      this.ctx.fill();

      this.ctx.restore();
      return;
    }

    let currentRadius = ball.radius;
    let vibration = 0;

    if (remaining < 0.3) {
      const closeProgress = (0.3 - remaining) / 0.3;
      currentRadius = ball.radius * (1 + closeProgress * 0.3);
      vibration = Math.sin(currentTime * 0.05) * 3 * closeProgress;
    }

    const x = ball.x + vibration;
    const y = ball.y + vibration;

    this.ctx.save();

    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, currentRadius * 2.5);
    glowGradient.addColorStop(0, ball.color + 'cc');
    glowGradient.addColorStop(0.3, ball.color + '66');
    glowGradient.addColorStop(0.6, ball.color + '22');
    glowGradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    const ballGradient = this.ctx.createRadialGradient(
      x - currentRadius * 0.3, y - currentRadius * 0.3, 0,
      x, y, currentRadius
    );
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(0.2, ball.color);
    ballGradient.addColorStop(1, this.darkenColor(ball.color, 0.5));
    this.ctx.fillStyle = ballGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x - currentRadius * 0.3, y - currentRadius * 0.3, currentRadius * 0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fill();

    this.drawDirectionIndicator(x, y, currentRadius, ball.requiredDirection, ball.color);

    this.ctx.restore();
  }

  private drawDirectionIndicator(x: number, y: number, radius: number, direction: string, _color: string): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const arrowLength = radius * 0.6;
    const arrowWidth = radius * 0.3;

    this.ctx.translate(x, y);

    switch (direction) {
      case 'right':
        this.ctx.rotate(0);
        break;
      case 'left':
        this.ctx.rotate(Math.PI);
        break;
      case 'down':
        this.ctx.rotate(Math.PI / 2);
        break;
      case 'up':
        this.ctx.rotate(-Math.PI / 2);
        break;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(-arrowLength, 0);
    this.ctx.lineTo(arrowLength, 0);
    this.ctx.lineTo(arrowLength - arrowWidth, -arrowWidth);
    this.ctx.moveTo(arrowLength, 0);
    this.ctx.lineTo(arrowLength - arrowWidth, arrowWidth);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawSword(trailPoints: TrailPoint[], direction: string): void {
    if (trailPoints.length < 2) return;

    const swordColor = this.getDirectionColor(direction);

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 1; i < trailPoints.length; i++) {
      const prev = trailPoints[i - 1];
      const curr = trailPoints[i];
      const progress = i / trailPoints.length;
      const alpha = progress * 0.8;
      const width = 4 + progress * 12;

      const gradient = this.ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
      gradient.addColorStop(0, swordColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, '#ffffff' + Math.floor(alpha * 255).toString(16).padStart(2, '0'));

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = width;
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      this.ctx.stroke();

      this.ctx.shadowColor = swordColor;
      this.ctx.shadowBlur = 20 * progress;
      this.ctx.strokeStyle = swordColor + Math.floor(alpha * 128).toString(16).padStart(2, '0');
      this.ctx.lineWidth = width * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    const lastPoint = trailPoints[trailPoints.length - 1];
    const glowGradient = this.ctx.createRadialGradient(
      lastPoint.x, lastPoint.y, 0,
      lastPoint.x, lastPoint.y, 25
    );
    glowGradient.addColorStop(0, '#ffffff');
    glowGradient.addColorStop(0.3, swordColor + 'cc');
    glowGradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(lastPoint.x, lastPoint.y, 25, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private getDirectionColor(direction: string): string {
    switch (direction) {
      case 'right': return '#ff3366';
      case 'left': return '#3399ff';
      case 'up': return '#ffee33';
      case 'down': return '#33ff66';
      default: return '#00d4ff';
    }
  }

  drawParticles(particles: Particle[]): void {
    this.ctx.save();

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      const size = particle.size * alpha;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 10;

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawUI(score: number, combo: number, missCount: number, scoreAnimation: number, comboAnimation: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.save();

    const scoreScale = 1 + scoreAnimation * 0.3;
    this.ctx.font = `bold ${Math.floor(48 * scoreScale)}px 'Orbitron', sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const scoreText = score.toString().padStart(6, '0');
    const scoreX = 30;
    const scoreY = 20;

    this.ctx.shadowColor = '#00ff88';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#00ff88';
    this.ctx.fillText(scoreText, scoreX, scoreY);

    this.ctx.shadowBlur = 0;
    this.ctx.font = '16px "Orbitron", sans-serif';
    this.ctx.fillStyle = 'rgba(0, 255, 136, 0.7)';
    this.ctx.fillText('SCORE', scoreX, scoreY + 55 * scoreScale);

    if (combo > 0) {
      const comboScale = 1 + comboAnimation * 0.4;
      const isGolden = combo >= 10;
      const comboSize = isGolden ? 56 : 42;

      this.ctx.font = `bold ${Math.floor(comboSize * comboScale)}px 'Orbitron', sans-serif`;
      this.ctx.textAlign = 'right';

      const comboX = width - 30;
      const comboY = 20;

      if (isGolden) {
        const flicker = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
        this.ctx.shadowColor = '#ffd700';
        this.ctx.shadowBlur = 30 * flicker;
        this.ctx.fillStyle = `rgba(255, 215, 0, ${flicker})`;
      } else {
        this.ctx.shadowColor = '#ff6b9d';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#ff6b9d';
      }

      this.ctx.fillText(`${combo}x`, comboX, comboY);

      this.ctx.shadowBlur = 0;
      this.ctx.font = '16px "Orbitron", sans-serif';
      this.ctx.fillStyle = isGolden ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 107, 157, 0.7)';
      this.ctx.fillText('COMBO', comboX, comboY + (comboSize + 5) * comboScale);
    }

    this.ctx.textAlign = 'center';
    this.ctx.font = '20px "Orbitron", sans-serif';
    for (let i = 0; i < 5; i++) {
      const heartX = width / 2 - 80 + i * 40;
      const heartY = height - 40;
      const isMissed = i < missCount;

      if (isMissed) {
        this.ctx.fillStyle = '#ff3366';
        this.ctx.shadowColor = '#ff3366';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('✕', heartX, heartY);
      } else {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText('♡', heartX, heartY);
      }
    }

    this.ctx.restore();
  }

  drawMissEffects(missEffects: MissEffect[], currentTime: number): void {
    this.ctx.save();

    for (const effect of missEffects) {
      const progress = (currentTime - effect.time) / 800;
      if (progress >= 1) continue;

      const alpha = 1 - progress;
      const scale = 1 + progress * 0.5;

      this.ctx.globalAlpha = alpha;
      this.ctx.font = `bold ${Math.floor(60 * scale)}px 'Orbitron', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ff3366';
      this.ctx.shadowColor = '#ff3366';
      this.ctx.shadowBlur = 20;
      this.ctx.fillText('✕', effect.x, effect.y);
    }

    this.ctx.restore();
  }

  drawScorePopups(popups: ScorePopup[], currentTime: number): void {
    this.ctx.save();

    for (const popup of popups) {
      const progress = (currentTime - popup.time) / 1000;
      if (progress >= 1) continue;

      const alpha = 1 - progress;
      const offsetY = progress * 60;
      const scale = 1 + progress * 0.3;

      this.ctx.globalAlpha = alpha;
      this.ctx.font = `bold ${Math.floor(32 * scale)}px 'Orbitron', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#00ff88';
      this.ctx.shadowColor = '#00ff88';
      this.ctx.shadowBlur = 15;
      this.ctx.fillText(`+${popup.score}`, popup.x, popup.y - offsetY);
    }

    this.ctx.restore();
  }

  drawMenu(titleProgress: number, subtitleProgress: number, isButtonHovered: boolean, buttonClickProgress: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const currentTime = Date.now();

    this.ctx.save();

    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(currentTime * 0.0005 + i) * 0.5 + 0.5) * width;
      const y = (Math.cos(currentTime * 0.0003 + i * 1.5) * 0.5 + 0.5) * height;
      const size = Math.sin(currentTime * 0.002 + i) * 1.5 + 2;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 212, 255, ${Math.sin(currentTime * 0.003 + i) * 0.3 + 0.4})`;
      this.ctx.fill();
    }

    if (titleProgress > 0) {
      const title = '节奏光剑';
      const fontSize = Math.min(120, width * 0.12);
      
      this.ctx.font = `900 ${fontSize}px 'Orbitron', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const gradient = this.ctx.createLinearGradient(
        width / 2 - 200, height * 0.35,
        width / 2 + 200, height * 0.35
      );
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.3, '#ffee33');
      gradient.addColorStop(0.7, '#ffd700');
      gradient.addColorStop(1, '#ff8c00');

      this.ctx.shadowColor = '#ffd700';
      this.ctx.shadowBlur = 30;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(title, width / 2, height * 0.35);

      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = titleProgress;
      this.ctx.fillText(title, width / 2, height * 0.35);
      this.ctx.globalAlpha = 1;
      this.ctx.shadowBlur = 0;
    }

    if (subtitleProgress > 0) {
      const subtitle = '跟随节拍，释放你的速度';
      const visibleChars = Math.floor(subtitle.length * subtitleProgress);
      const visibleText = subtitle.substring(0, visibleChars);
      
      this.ctx.font = '28px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#00d4ff';
      this.ctx.shadowColor = '#00d4ff';
      this.ctx.shadowBlur = 15;
      this.ctx.fillText(visibleText, width / 2, height * 0.48);
      this.ctx.shadowBlur = 0;
    }

    const buttonWidth = 280;
    const buttonHeight = 70;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = height * 0.6;
    const buttonScale = 1 + (isButtonHovered ? 0.05 : 0) - buttonClickProgress * 0.1;

    this.ctx.translate(width / 2, height * 0.6 + buttonHeight / 2);
    this.ctx.scale(buttonScale, buttonScale);
    this.ctx.translate(-width / 2, -(height * 0.6 + buttonHeight / 2));

    const borderRadius = 35;
    this.ctx.beginPath();
    this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, borderRadius);

    const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGradient.addColorStop(0, isButtonHovered ? 'rgba(138, 43, 226, 0.6)' : 'rgba(138, 43, 226, 0.3)');
    buttonGradient.addColorStop(1, isButtonHovered ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.3)');
    this.ctx.fillStyle = buttonGradient;
    this.ctx.fill();

    this.ctx.strokeStyle = isButtonHovered ? '#00d4ff' : 'rgba(0, 212, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = isButtonHovered ? 25 : 10;
    this.ctx.stroke();

    if (isButtonHovered) {
      const rippleProgress = (currentTime % 1000) / 1000;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, borderRadius);
      this.ctx.clip();
      
      const rippleGradient = this.ctx.createRadialGradient(
        width / 2, buttonY + buttonHeight / 2, 0,
        width / 2, buttonY + buttonHeight / 2, buttonWidth * rippleProgress
      );
      rippleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      rippleGradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = rippleGradient;
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      this.ctx.restore();
    }

    this.ctx.shadowBlur = 0;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    this.ctx.font = 'bold 26px "Orbitron", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('开始游戏', width / 2, height * 0.6 + buttonHeight / 2);
    this.ctx.shadowBlur = 0;

    this.ctx.font = '18px "Orbitron", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('选择音频文件开始游戏', width / 2, height * 0.6 + buttonHeight + 40);

    this.ctx.restore();
  }

  drawGameOver(finalScore: number, animationProgress: number, buttonHoverStates: { retry: boolean; newSong: boolean }): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const currentTime = Date.now();

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, width, height);

    const panelWidth = Math.min(500, width * 0.8);
    const panelHeight = 450;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;
    const panelAlpha = Math.min(1, animationProgress * 2);

    this.ctx.globalAlpha = panelAlpha;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 20);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(138, 43, 226, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#8a2be2';
    this.ctx.shadowBlur = 30;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.ctx.font = 'bold 48px "Orbitron", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#ff6b9d';
    this.ctx.shadowColor = '#ff6b9d';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('游戏结束', width / 2, panelY + 60);
    this.ctx.shadowBlur = 0;

    this.ctx.font = '24px "Orbitron", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('最终得分', width / 2, panelY + 120);

    const scoreProgress = Math.min(1, Math.max(0, (animationProgress - 0.3) / 0.7));
    const displayedScore = Math.floor(finalScore * scoreProgress);
    const scoreStr = displayedScore.toString().padStart(6, '0');

    this.ctx.font = 'bold 64px "Orbitron", sans-serif';
    this.ctx.fillStyle = '#00ff88';
    this.ctx.shadowColor = '#00ff88';
    this.ctx.shadowBlur = 25;
    this.ctx.fillText(scoreStr, width / 2, panelY + 190);
    this.ctx.shadowBlur = 0;

    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonSpacing = 30;
    const buttonsStartX = width / 2 - buttonWidth - buttonSpacing / 2;
    const buttonY = panelY + 280;

    const buttons = [
      { text: '再来一次', x: buttonsStartX, hovered: buttonHoverStates.retry, id: 'retry' },
      { text: '选择新曲', x: buttonsStartX + buttonWidth + buttonSpacing, hovered: buttonHoverStates.newSong, id: 'newSong' }
    ];

    for (const btn of buttons) {
      const scale = btn.hovered ? 1.05 : 1;
      
      this.ctx.save();
      this.ctx.translate(btn.x + buttonWidth / 2, buttonY + buttonHeight / 2);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-(btn.x + buttonWidth / 2), -(buttonY + buttonHeight / 2));

      this.ctx.beginPath();
      this.ctx.roundRect(btn.x, buttonY, buttonWidth, buttonHeight, 30);

      const btnGradient = this.ctx.createLinearGradient(btn.x, buttonY, btn.x, buttonY + buttonHeight);
      if (btn.id === 'retry') {
        btnGradient.addColorStop(0, btn.hovered ? 'rgba(0, 255, 136, 0.6)' : 'rgba(0, 255, 136, 0.3)');
        btnGradient.addColorStop(1, btn.hovered ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.3)');
      } else {
        btnGradient.addColorStop(0, btn.hovered ? 'rgba(255, 107, 157, 0.6)' : 'rgba(255, 107, 157, 0.3)');
        btnGradient.addColorStop(1, btn.hovered ? 'rgba(138, 43, 226, 0.6)' : 'rgba(138, 43, 226, 0.3)');
      }
      this.ctx.fillStyle = btnGradient;
      this.ctx.fill();

      this.ctx.strokeStyle = btn.id === 'retry' ? '#00ff88' : '#ff6b9d';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = btn.id === 'retry' ? '#00ff88' : '#ff6b9d';
      this.ctx.shadowBlur = btn.hovered ? 20 : 10;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);

      this.ctx.font = 'bold 20px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 8;
      this.ctx.fillText(btn.text, btn.x + buttonWidth / 2, buttonY + buttonHeight / 2);
      this.ctx.shadowBlur = 0;

      this.ctx.restore();
    }

    for (let i = 0; i < 20; i++) {
      const x = panelX + Math.random() * panelWidth;
      const y = panelY + Math.random() * panelHeight;
      const size = Math.sin(currentTime * 0.005 + i) * 1 + 2;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${Math.sin(currentTime * 0.003 + i) * 0.3 + 0.3})`;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawLoading(progress: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.font = 'bold 36px "Orbitron", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('正在分析音频...', width / 2, height / 2 - 60);

    const barWidth = 400;
    const barHeight = 8;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    this.ctx.fill();

    const fillGradient = this.ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    fillGradient.addColorStop(0, '#00d4ff');
    fillGradient.addColorStop(1, '#8a2be2');
    this.ctx.fillStyle = fillGradient;
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.font = '18px "Orbitron", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText(`${Math.floor(progress * 100)}%`, width / 2, barY + 35);

    this.ctx.restore();
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substring(0, 2), 16) * amount);
    const g = Math.floor(parseInt(hex.substring(2, 4), 16) * amount);
    const b = Math.floor(parseInt(hex.substring(4, 6), 16) * amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  getMenuButtonBounds(): { x: number; y: number; width: number; height: number } {
    const width = this.canvas.width;
    const height = this.canvas.height;
    return {
      x: width / 2 - 140,
      y: height * 0.6,
      width: 280,
      height: 70
    };
  }

  getGameOverButtonBounds(): { retry: { x: number; y: number; width: number; height: number }; newSong: { x: number; y: number; width: number; height: number } } {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const panelWidth = Math.min(500, width * 0.8);
    const panelHeight = 450;
    const panelY = (height - panelHeight) / 2;

    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonSpacing = 30;
    const buttonsStartX = width / 2 - buttonWidth - buttonSpacing / 2;
    const buttonY = panelY + 280;

    return {
      retry: {
        x: buttonsStartX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      },
      newSong: {
        x: buttonsStartX + buttonWidth + buttonSpacing,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      }
    };
  }
}
