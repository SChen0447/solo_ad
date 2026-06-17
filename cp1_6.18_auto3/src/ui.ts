interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export class UIManager {
  private score: number = 0;
  private lives: number = 3;
  private fuel: number = 100;
  private readonly MAX_FUEL: number = 100;
  private scorePopups: ScorePopup[] = [];
  private width: number;
  private height: number;
  private scale: number = 1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.updateScale();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.updateScale();
  }

  private updateScale(): void {
    this.scale = Math.min(this.width / 1280, this.height / 720, 1);
    if (this.scale < 0.5) this.scale = 0.5;
  }

  setScore(score: number): void {
    this.score = score;
  }

  setLives(lives: number): void {
    this.lives = Math.max(0, lives);
  }

  setFuel(fuel: number): void {
    this.fuel = Math.max(0, Math.min(this.MAX_FUEL, fuel));
  }

  addScore(x: number, y: number, points: number, color: string): void {
    this.score += points;
    this.scorePopups.push({
      x,
      y,
      text: `+${points}`,
      color,
      life: 1.2,
      maxLife: 1.2,
    });
  }

  addFuel(amount: number): void {
    this.fuel = Math.min(this.MAX_FUEL, this.fuel + amount);
  }

  consumeFuel(amount: number): void {
    this.fuel = Math.max(0, this.fuel - amount);
  }

  isFuelEmpty(): boolean {
    return this.fuel <= 0;
  }

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getFuel(): number {
    return this.fuel;
  }

  getMaxFuel(): number {
    return this.MAX_FUEL;
  }

  reset(): void {
    this.score = 0;
    this.lives = 3;
    this.fuel = 100;
    this.scorePopups = [];
  }

  update(dt: number): void {
    this.scorePopups = this.scorePopups.filter(p => {
      p.life -= dt;
      p.y -= 40 * dt;
      return p.life > 0;
    });
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const padding = 20 * this.scale;
    const barWidth = 200 * this.scale;
    const barHeight = 20 * this.scale;
    const fontSize = Math.max(12, 16 * this.scale);
    const smallFont = Math.max(10, 12 * this.scale);

    ctx.save();
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;

    let yOffset = padding;

    ctx.fillStyle = 'rgba(10, 14, 39, 0.7)';
    this.drawRoundedRect(ctx, padding - 8, yOffset - 8, barWidth + 100, 30 * this.scale + barHeight * 3 + 16, 12 * this.scale);
    ctx.fill();

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd54f';
    ctx.fillStyle = '#ffd54f';
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.fillText(`⭐ ${this.score}`, padding, yOffset + fontSize);
    yOffset += fontSize + 8 * this.scale;

    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ef5350';
    ctx.fillStyle = '#fff';
    ctx.font = `${smallFont}px 'Segoe UI', sans-serif`;
    ctx.fillText('生命', padding, yOffset + smallFont);

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const hx = padding + 55 * this.scale + i * (22 * this.scale);
      const hy = yOffset + smallFont / 2;
      const s = 8 * this.scale;
      ctx.moveTo(hx, hy - s * 0.3);
      ctx.bezierCurveTo(hx, hy - s, hx - s, hy - s, hx - s, hy - s * 0.3);
      ctx.bezierCurveTo(hx - s, hy + s * 0.3, hx, hy + s * 0.7, hx, hy + s);
      ctx.bezierCurveTo(hx, hy + s * 0.7, hx + s, hy + s * 0.3, hx + s, hy - s * 0.3);
      ctx.bezierCurveTo(hx + s, hy - s, hx, hy - s, hx, hy - s * 0.3);
      ctx.fillStyle = i < this.lives ? '#ef5350' : 'rgba(239, 83, 80, 0.2)';
      ctx.shadowBlur = i < this.lives ? 10 : 0;
      ctx.shadowColor = '#ef5350';
      ctx.fill();
    }
    yOffset += smallFont + 14 * this.scale;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.drawRoundedRect(ctx, padding, yOffset, barWidth, barHeight, 6 * this.scale);
    ctx.fill();

    const fuelPct = this.fuel / this.MAX_FUEL;
    const fuelGradient = ctx.createLinearGradient(padding, 0, padding + barWidth * fuelPct, 0);
    if (fuelPct > 0.5) {
      fuelGradient.addColorStop(0, '#66bb6a');
      fuelGradient.addColorStop(1, '#ffd54f');
    } else if (fuelPct > 0.25) {
      fuelGradient.addColorStop(0, '#ffa726');
      fuelGradient.addColorStop(1, '#ffd54f');
    } else {
      fuelGradient.addColorStop(0, '#ef5350');
      fuelGradient.addColorStop(1, '#ffa726');
    }
    ctx.fillStyle = fuelGradient;
    ctx.shadowBlur = 6;
    ctx.shadowColor = fuelPct > 0.25 ? '#66bb6a' : '#ef5350';
    this.drawRoundedRect(ctx, padding, yOffset, barWidth * fuelPct, barHeight, 6 * this.scale);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${smallFont}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`⛽ ${Math.round(this.fuel)}%`, padding + barWidth / 2, yOffset + barHeight - 5 * this.scale);
    ctx.textAlign = 'left';

    ctx.restore();

    for (const popup of this.scorePopups) {
      const alpha = popup.life / popup.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.max(14, 22 * this.scale)}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = popup.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = popup.color;
      ctx.textAlign = 'center';
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    }
  }
}
