import { useBattleStore } from '../store/battleStore';
import { bossAI } from './bossAI';
import type { ElementType } from '../types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private stars: Array<{ x: number; y: number; size: number; twinkleSpeed: number; phase: number }> = [];
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.resize();
    this.generateStars();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.6,
        size: Math.random() * 2 + 0.5,
        twinkleSpeed: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a0a3e');
    gradient.addColorStop(1, '#2d0a4e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.stars.forEach(star => {
      const brightness = (Math.sin(this.time * star.twinkleSpeed + star.phase) + 1) / 2;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + brightness * 0.7})`;
      this.ctx.fill();
    });
  }

  private drawIsometricFloor(): void {
    const floorY = this.height * 0.65;
    const tileWidth = 80;
    const tileHeight = 40;
    const rows = 8;
    const cols = 12;

    this.ctx.save();
    this.ctx.translate(this.width / 2, floorY);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = (col - cols / 2) * tileWidth + (row % 2) * (tileWidth / 2);
        const offsetY = row * tileHeight - 100;

        this.ctx.beginPath();
        this.ctx.moveTo(offsetX, offsetY);
        this.ctx.lineTo(offsetX + tileWidth / 2, offsetY + tileHeight / 2);
        this.ctx.lineTo(offsetX, offsetY + tileHeight);
        this.ctx.lineTo(offsetX - tileWidth / 2, offsetY + tileHeight / 2);
        this.ctx.closePath();

        const shade = 0.3 + (row / rows) * 0.3 + Math.random() * 0.1;
        this.ctx.fillStyle = `rgb(${Math.floor(80 * shade)}, ${Math.floor(80 * shade)}, ${Math.floor(90 * shade)})`;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  private getScreenPosition(worldX: number, worldY: number): { x: number; y: number } {
    const centerX = this.width / 2;
    const floorY = this.height * 0.65;
    const isoX = (worldX - 500) * 0.8;
    const isoY = (worldY - 400) * 0.4;
    return {
      x: centerX + isoX,
      y: floorY + isoY
    };
  }

  private drawPlayer(x: number, y: number): void {
    const pos = this.getScreenPosition(x, y);

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(100, 150, 255, 0.5)';
    this.ctx.shadowBlur = 15;

    this.ctx.fillStyle = '#4488ff';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y, 25, 12, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#6699ff';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - 35, 20, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#88bbff';
    this.ctx.fillRect(pos.x - 12, pos.y - 55, 24, 30);

    this.ctx.fillStyle = '#ffdd99';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - 65, 12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffcc66';
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - 10, pos.y - 70);
    this.ctx.lineTo(pos.x + 10, pos.y - 70);
    this.ctx.lineTo(pos.x, pos.y - 85);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawBoss(x: number, y: number, state: string, isTransitioning: boolean, _hpPercent: number): void {
    const pos = this.getScreenPosition(x, y);
    const stateColor = bossAI.getStateColor(state as any);

    this.ctx.save();

    if (isTransitioning) {
      const flashIntensity = Math.sin(this.time * 15) * 0.5 + 0.5;
      this.ctx.shadowColor = stateColor;
      this.ctx.shadowBlur = 30 + flashIntensity * 20;
    } else if (state === 'enrage') {
      this.ctx.shadowColor = '#ff0000';
      this.ctx.shadowBlur = 25;
    } else {
      this.ctx.shadowColor = 'rgba(150, 50, 200, 0.4)';
      this.ctx.shadowBlur = 15;
    }

    this.ctx.fillStyle = state === 'defend' ? '#446688' : '#663388';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y, 45, 20, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = state === 'defend' ? '#5577aa' : '#8844aa';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - 55, 35, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = state === 'defend' ? '#6688bb' : '#9955bb';
    this.ctx.fillRect(pos.x - 22, pos.y - 90, 44, 50);

    this.ctx.fillStyle = '#aa66cc';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - 100, 18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - 7, pos.y - 102, 4, 0, Math.PI * 2);
    this.ctx.arc(pos.x + 7, pos.y - 102, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#552277';
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - 20, pos.y - 110);
    this.ctx.lineTo(pos.x - 30, pos.y - 140);
    this.ctx.lineTo(pos.x - 10, pos.y - 120);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(pos.x + 20, pos.y - 110);
    this.ctx.lineTo(pos.x + 30, pos.y - 140);
    this.ctx.lineTo(pos.x + 10, pos.y - 120);
    this.ctx.closePath();
    this.ctx.fill();

    if (state === 'enrage') {
      this.ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(this.time * 10) * 0.2})`;
      this.ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + this.time * 2;
        const radius = 50 + Math.sin(this.time * 5 + i) * 10;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y - 55);
        this.ctx.lineTo(
          pos.x + Math.cos(angle) * radius,
          pos.y - 55 + Math.sin(angle) * radius
        );
        this.ctx.stroke();
      }
    }

    if (state === 'defend') {
      this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y - 55, 60, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawMinion(x: number, y: number): void {
    const pos = this.getScreenPosition(x, y);

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(255, 100, 100, 0.4)';
    this.ctx.shadowBlur = 10;

    this.ctx.fillStyle = '#aa4444';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y, 15, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#cc6666';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - 20, 12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - 4, pos.y - 22, 2, 0, Math.PI * 2);
    this.ctx.arc(pos.x + 4, pos.y - 22, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawSkillEffect(effect: { type: ElementType; x: number; y: number; duration: number; maxDuration: number }): void {
    const pos = this.getScreenPosition(effect.x, effect.y);
    const progress = 1 - effect.duration / effect.maxDuration;

    this.ctx.save();

    switch (effect.type) {
      case 'fire':
        this.drawFireEffect(pos.x, pos.y, progress);
        break;
      case 'ice':
        this.drawIceEffect(pos.x, pos.y, progress);
        break;
      case 'lightning':
        this.drawLightningEffect(pos.x, pos.y, progress);
        break;
    }

    this.ctx.restore();
  }

  private drawFireEffect(x: number, y: number, progress: number): void {
    const size = 50 + progress * 30;
    const alpha = 1 - progress;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + progress * 3;
      const dist = size * (0.5 + Math.random() * 0.5);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist - progress * 40;
      const psize = 10 + Math.random() * 10;

      const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, psize);
      gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 100, 20, ${alpha * 0.8})`);
      gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(px, py, psize, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const mainGradient = this.ctx.createRadialGradient(x, y - 20, 0, x, y - 20, size * 0.8);
    mainGradient.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.8})`);
    mainGradient.addColorStop(0.3, `rgba(255, 150, 50, ${alpha * 0.6})`);
    mainGradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
    this.ctx.fillStyle = mainGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y - 20, size * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawIceEffect(x: number, y: number, progress: number): void {
    const size = 40 + progress * 20;
    const alpha = 1 - progress;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const height = size + Math.random() * 20;
      const tipX = x + Math.cos(angle) * 15;
      const tipY = y - height;
      const baseWidth = 15 + Math.random() * 10;

      this.ctx.fillStyle = `rgba(150, 220, 255, ${alpha * 0.8})`;
      this.ctx.beginPath();
      this.ctx.moveTo(tipX - baseWidth / 2, y);
      this.ctx.lineTo(tipX, tipY);
      this.ctx.lineTo(tipX + baseWidth / 2, y);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = `rgba(200, 240, 255, ${alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const sx = x + (Math.random() - 0.5) * size * 2;
      const sy = y - Math.random() * size * 1.5;
      const ss = 2 + Math.random() * 3;

      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, ss, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawLightningEffect(x: number, y: number, progress: number): void {
    const alpha = 1 - progress;
    const segments = 6;

    for (let bolt = 0; bolt < 3; bolt++) {
      this.ctx.strokeStyle = bolt === 0
        ? `rgba(255, 255, 255, ${alpha})`
        : `rgba(150, 200, 255, ${alpha * 0.6})`;
      this.ctx.lineWidth = bolt === 0 ? 4 : 8;

      this.ctx.beginPath();
      let currentX = x + (bolt - 1) * 20;
      let currentY = y - 80;
      this.ctx.moveTo(currentX, currentY);

      for (let i = 0; i < segments; i++) {
        const t = (i + 1) / segments;
        currentX += (Math.random() - 0.5) * 40;
        currentY = y - 80 + t * 80;
        this.ctx.lineTo(currentX, currentY);
      }
      this.ctx.stroke();
    }

    const glowGradient = this.ctx.createRadialGradient(x, y - 40, 0, x, y - 40, 60);
    glowGradient.addColorStop(0, `rgba(200, 230, 255, ${alpha * 0.5})`);
    glowGradient.addColorStop(1, `rgba(100, 150, 255, 0)`);
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y - 40, 60, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawDamageNumber(damage: { value: number; x: number; y: number; opacity: number; isCrit: boolean; element?: ElementType }): void {
    const pos = this.getScreenPosition(damage.x, damage.y);

    this.ctx.save();
    this.ctx.globalAlpha = damage.opacity;

    let color = '#ffffff';
    if (damage.element === 'fire') color = '#ff6644';
    else if (damage.element === 'ice') color = '#66ccff';
    else if (damage.element === 'lightning') color = '#ffff66';

    if (damage.value < 0) {
      color = '#44ff44';
    }

    const fontSize = damage.isCrit ? 36 : 24;
    this.ctx.font = `bold ${fontSize}px 'Segoe UI', 'Microsoft YaHei', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = damage.isCrit ? 15 : 8;

    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    const displayText = damage.value < 0 ? `+${Math.abs(damage.value)}` : damage.value.toString();
    this.ctx.strokeText(displayText, pos.x, pos.y);

    this.ctx.fillStyle = color;
    this.ctx.fillText(displayText, pos.x, pos.y);

    if (damage.isCrit) {
      this.ctx.font = 'bold 16px sans-serif';
      this.ctx.fillStyle = '#ffcc00';
      this.ctx.fillText('暴击!', pos.x, pos.y + 25);
    }

    this.ctx.restore();
  }

  public render(): void {
    this.time += 1 / 60;

    const state = useBattleStore.getState();
    const { player, boss, minions, damageNumbers, skillEffects, screenShake } = state;

    this.ctx.save();

    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      this.ctx.translate(shakeX, shakeY);
    }

    this.drawBackground();
    this.drawIsometricFloor();

    minions.filter(m => m.alive).forEach(minion => {
      this.drawMinion(minion.position.x, minion.position.y);
    });

    this.drawPlayer(player.position.x, player.position.y);
    this.drawBoss(boss.position.x, boss.position.y, boss.state, boss.isTransitioning, boss.currentHp / boss.maxHp);

    skillEffects.forEach(effect => this.drawSkillEffect(effect));
    damageNumbers.forEach(damage => this.drawDamageNumber(damage));

    this.ctx.restore();
  }

  public startRenderLoop(callback: () => void): void {
    const loop = (_currentTime: number) => {
      callback();
      this.render();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
