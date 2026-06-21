import { RenderData } from './system';
import { Weapon } from './weapons';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const WEAPON_COLORS = ['#00AAFF', '#FF6600', '#FF3344'];
const WEAPON_LABELS = ['1:能量枪', '2:导弹', '3:霰弹'];

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
  }

  render(data: RenderData, mouseX: number, mouseY: number): void {
    this.drawBackground();
    this.drawAimLine(data.mechaX, data.mechaY, mouseX, mouseY);
    this.drawProjectiles(data);
    this.drawEnemies(data);
    this.drawExplosions(data);
    this.drawMecha(data);
    this.drawUI(data, mouseX, mouseY);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#16213E');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }
  }

  private drawMecha(data: RenderData): void {
    const ctx = this.ctx;
    const { mechaX, mechaY, mechaAngle } = data;

    ctx.save();

    ctx.beginPath();
    ctx.arc(mechaX, mechaY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#0F3460';
    ctx.fill();
    ctx.strokeStyle = '#1A5276';
    ctx.lineWidth = 2;
    ctx.stroke();

    const glowGrad = ctx.createRadialGradient(mechaX, mechaY, 15, mechaX, mechaY, 25);
    glowGrad.addColorStop(0, 'rgba(0,255,170,0.1)');
    glowGrad.addColorStop(1, 'rgba(0,255,170,0)');
    ctx.beginPath();
    ctx.arc(mechaX, mechaY, 25, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    ctx.translate(mechaX, mechaY);
    ctx.rotate(mechaAngle);

    ctx.fillStyle = '#1A5276';
    ctx.fillRect(0, -5, 30, 10);
    ctx.fillStyle = '#0F3460';
    ctx.fillRect(25, -3, 8, 6);

    ctx.restore();
  }

  private drawAimLine(mechaX: number, mechaY: number, mouseX: number, mouseY: number): void {
    const ctx = this.ctx;
    const angle = Math.atan2(mouseY - mechaY, mouseX - mechaX);
    const length = 60;
    const endX = mechaX + Math.cos(angle) * length;
    const endY = mechaY + Math.sin(angle) * length;

    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(0,255,170,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mechaX + Math.cos(angle) * 25, mechaY + Math.sin(angle) * 25);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawProjectiles(data: RenderData): void {
    const ctx = this.ctx;

    for (const p of data.projectiles) {
      if (p.type === 'beam') {
        const alpha = 1 - (p.lifetime / p.maxLifetime);
        const angle = Math.atan2(
          this.mechaDirectionY(data),
          this.mechaDirectionX(data)
        );
        const endX = p.startX + Math.cos(angle) * 800;
        const endY = p.startY + Math.sin(angle) * 800;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#00AAFF';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#00CCFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(200,240,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'missile') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        ctx.fillStyle = '#888';
        ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = '#FF4400';
        ctx.fillRect(-8, -3, 5, 6);

        ctx.shadowColor = '#FF6600';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FFAA00';
        ctx.fillRect(-12, -2, 5, 4);
        ctx.shadowBlur = 0;

        ctx.restore();
      } else if (p.type === 'pellet') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        ctx.shadowColor = '#FF3344';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FF8888';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private mechaDirectionX(data: RenderData): number {
    return Math.cos(data.mechaAngle);
  }

  private mechaDirectionY(data: RenderData): number {
    return Math.sin(data.mechaAngle);
  }

  private drawEnemies(data: RenderData): void {
    const ctx = this.ctx;

    for (const e of data.enemies) {
      if (e.dead) {
        for (const f of e.fragments) {
          const alpha = 1 - (f.lifetime / f.maxLifetime);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = f.color;
          ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
          ctx.restore();
        }
        continue;
      }

      const ecx = e.x + e.width / 2;
      const ecy = e.y + e.height / 2;

      if (ecx < -e.width || ecx > CANVAS_WIDTH + e.width ||
          ecy < -e.height || ecy > CANVAS_HEIGHT + e.height) {
        continue;
      }

      ctx.save();

      if (e.flashTimer > 0) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = e.color;
      }

      ctx.fillRect(e.x, e.y, e.width, e.height);

      ctx.strokeStyle = 'rgba(0,255,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(e.x, e.y, e.width, e.height);

      const hpRatio = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(255,0,0,0.6)';
      ctx.fillRect(e.x, e.y - 6, e.width, 4);
      ctx.fillStyle = 'rgba(0,255,0,0.8)';
      ctx.fillRect(e.x, e.y - 6, e.width * hpRatio, 4);

      ctx.restore();
    }
  }

  private drawExplosions(data: RenderData): void {
    const ctx = this.ctx;

    for (const p of data.explosionParticles) {
      const alpha = 1 - (p.lifetime / p.maxLifetime);
      const scale = 1 + p.lifetime * 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * scale * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawUI(data: RenderData, mouseX: number, mouseY: number): void {
    const ctx = this.ctx;

    this.drawWeaponPanel(data, mouseX, mouseY);
    this.drawTopHUD(data);
  }

  private drawWeaponPanel(data: RenderData, mouseX: number, mouseY: number): void {
    const ctx = this.ctx;
    const panelX = 15;
    const panelY = CANVAS_HEIGHT - 115;
    const panelWidth = 270;
    const panelHeight = 100;

    ctx.save();

    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const itemWidth = 80;
    const itemHeight = 60;
    const startX = panelX + 10;
    const startY = panelY + 20;

    for (let i = 0; i < data.weapons.length; i++) {
      const weapon = data.weapons[i];
      const ix = startX + i * (itemWidth + 5);
      const iy = startY;

      const isHovered = mouseX >= ix && mouseX <= ix + itemWidth &&
                        mouseY >= iy && mouseY <= iy + itemHeight;
      const isSelected = i === data.currentWeaponIndex;

      let scale = 1;
      if (isSelected && data.switchAnimProgress < 1) {
        scale = data.switchAnimProgress;
      }

      ctx.save();
      const centerX = ix + itemWidth / 2;
      const centerY = iy + itemHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      ctx.beginPath();
      this.roundRect(ctx, ix, iy, itemWidth, itemHeight, 8);

      if (isHovered && !isSelected) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
      } else {
        ctx.fillStyle = 'rgba(30,30,50,0.6)';
      }
      ctx.fill();

      if (isSelected) {
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#00FFAA';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = '#4A4A6A';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = isSelected ? WEAPON_COLORS[i] : '#8888AA';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(WEAPON_LABELS[i], ix + itemWidth / 2, iy + 20);

      const ammoText = weapon.ammo === Infinity ? '∞' : String(weapon.ammo);
      ctx.fillStyle = isSelected ? '#00FFAA' : '#6A6A8A';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(ammoText, ix + itemWidth / 2, iy + 42);

      ctx.restore();
    }

    ctx.restore();
  }

  private drawTopHUD(data: RenderData): void {
    const ctx = this.ctx;
    const weapon = data.weapons[data.currentWeaponIndex];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '20px monospace';

    const ammoText = weapon.ammo === Infinity ? '∞' : String(weapon.ammo);
    const cooldownText = weapon.cooldownTimer > 0
      ? `  冷却: ${weapon.cooldownTimer.toFixed(1)}s`
      : '';
    const text = `${weapon.name} | 弹药: ${ammoText}${cooldownText}`;

    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#00FFAA';
    ctx.fillText(text, CANVAS_WIDTH / 2, 35);
    ctx.shadowBlur = 0;

    if (weapon.cooldownTimer > 0) {
      const barWidth = 120;
      const barHeight = 4;
      const barX = CANVAS_WIDTH / 2 - barWidth / 2;
      const barY = 44;
      const progress = 1 - (weapon.cooldownTimer / weapon.cooldown);

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#00FFAA';
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
