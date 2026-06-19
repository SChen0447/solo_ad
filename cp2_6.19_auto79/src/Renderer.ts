import { Ship, ShipType, Particle, Projectile, ShipManager, FormationType, getFormationName } from './ShipManager';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time: number = 0;
  private crackAlpha: number = 0;
  private crackActive: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  triggerCrackEffect(): void {
    this.crackActive = true;
    this.crackAlpha = 1.0;
  }

  render(sm: ShipManager, elapsedTime: number, dt: number): void {
    this.time += dt;
    const ctx = this.ctx;

    this.drawSeaBackground(ctx);

    this.drawWaveGrid(ctx);

    this.drawRippleLayer(ctx);

    this.drawSwellLayer(ctx);

    for (const ship of sm.playerShips) {
      this.drawTrail(ctx, ship.trail);
    }
    for (const ship of sm.enemyShips) {
      this.drawTrail(ctx, ship.trail);
    }

    for (const ship of sm.playerShips) {
      if (!ship.isDead) this.drawShip(ctx, ship);
    }
    for (const ship of sm.enemyShips) {
      if (!ship.isDead) this.drawShip(ctx, ship);
      if (!ship.isDead && !ship.isSinking) {
        this.drawHealthBar(ctx, ship);
      }
    }

    for (const p of sm.projectiles) {
      this.drawProjectile(ctx, p);
    }

    this.drawExplosions(ctx, sm.explosions);

    if (this.crackActive) {
      this.drawCrackEffect(ctx);
      this.crackAlpha -= dt / 0.4;
      if (this.crackAlpha <= 0) {
        this.crackAlpha = 0;
        this.crackActive = false;
      }
    }

    this.drawUI(ctx, sm, elapsedTime);
  }

  private drawSeaBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    gradient.addColorStop(0, '#0e1f3d');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const y = this.height * 0.3 + Math.sin(this.time * 0.3 + i * 1.2) * 40;
      ctx.moveTo(0, y);
      for (let x = 0; x <= this.width; x += 20) {
        ctx.lineTo(x, y + Math.sin(this.time * 0.5 + x * 0.01 + i) * 15);
      }
      ctx.strokeStyle = '#4488aa';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawWaveGrid(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#3366aa';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      for (let y = 0; y <= this.height; y += 5) {
        const offset = Math.sin(this.time * 0.8 + y * 0.02 + x * 0.01) * 3;
        if (y === 0) ctx.moveTo(x + offset, y);
        else ctx.lineTo(x + offset, y);
      }
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 5) {
        const offset = Math.sin(this.time * 0.6 + x * 0.02 + y * 0.01) * 3;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private getWaveDirection(): { dx: number; dy: number } {
    const cycle = 30;
    const phase = ((this.time % cycle) / cycle) * Math.PI * 2;
    const angle = Math.sin(phase) * Math.PI * 0.75 + Math.cos(phase * 0.5) * Math.PI * 0.25;
    return { dx: Math.cos(angle), dy: Math.sin(angle) };
  }

  private drawRippleLayer(ctx: CanvasRenderingContext2D): void {
    const dir = this.getWaveDirection();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#1a3a5a';
    ctx.lineWidth = 0.8;
    const spacing = 18;
    const freq = 0.06;
    const amp = 4;
    const speed = 1.8;
    const lineCount = Math.ceil(this.height / spacing) + 4;
    for (let i = -2; i < lineCount; i++) {
      ctx.beginPath();
      const baseY = i * spacing;
      for (let x = 0; x <= this.width; x += 4) {
        const projected = x * dir.dx + baseY * dir.dy;
        const wave = Math.sin(projected * freq + this.time * speed + i * 0.8) * amp;
        const wave2 = Math.sin(projected * freq * 1.7 + this.time * speed * 0.6 + i * 1.2) * amp * 0.5;
        const py = baseY + wave + wave2 + dir.dy * Math.sin(this.time * 0.3 + i) * 8;
        const px = x + dir.dx * Math.sin(this.time * 0.3 + i) * 4;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawSwellLayer(ctx: CanvasRenderingContext2D): void {
    const dir = this.getWaveDirection();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#0d2a4a';
    ctx.lineWidth = 1.5;
    const spacing = 35;
    const freq = 0.018;
    const amp = 10;
    const speed = 0.7;
    const lineCount = Math.ceil(this.height / spacing) + 4;
    for (let i = -2; i < lineCount; i++) {
      ctx.beginPath();
      const baseY = i * spacing;
      for (let x = 0; x <= this.width; x += 5) {
        const projected = x * dir.dx + baseY * dir.dy;
        const wave = Math.sin(projected * freq + this.time * speed + i * 1.5) * amp;
        const wave2 = Math.sin(projected * freq * 0.6 + this.time * speed * 0.4 + i * 0.9) * amp * 0.6;
        const py = baseY + wave + wave2 + dir.dy * Math.sin(this.time * 0.2 + i * 0.7) * 15;
        const px = x + dir.dx * Math.sin(this.time * 0.15 + i * 0.5) * 10;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawTrail(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color + alpha.toFixed(2) + ')';
      ctx.fill();
    }
  }

  private drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
    ctx.save();
    ctx.translate(ship.x + (ship.renderOffsetX || 0), ship.y + (ship.renderOffsetY || 0));
    ctx.rotate(ship.angle);

    let scale = 1;
    let alpha = 1;
    if (ship.isSinking) {
      const t = 1 - ship.sinkTimer / 0.5;
      scale = 1 - t;
      alpha = 1 - t;
    }
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const size = ship.type === ShipType.Battleship ? 24 : ship.type === ShipType.Cruiser ? 18 : 14;

    if (ship.type === ShipType.Destroyer) {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(-size * 0.6, size * 0.6);
      ctx.lineTo(size * 0.6, size * 0.6);
      ctx.closePath();
      ctx.fillStyle = ship.isPlayer ? '#ffcc00' : '#cc9900';
      ctx.fill();
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (ship.type === ShipType.Cruiser) {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fillStyle = ship.isPlayer ? '#4488ff' : '#2266cc';
      ctx.fill();
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (ship.type === ShipType.Battleship) {
      ctx.fillStyle = ship.isPlayer ? '#ff4444' : '#cc2222';
      ctx.fillRect(-size * 0.5, -size * 0.8, size, size * 1.6);
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 1;
      ctx.strokeRect(-size * 0.5, -size * 0.8, size, size * 1.6);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, ship: Ship): void {
    const barWidth = 30;
    const barHeight = 4;
    const ox = ship.renderOffsetX || 0;
    const oy = ship.renderOffsetY || 0;
    const x = ship.x + ox - barWidth / 2;
    const y = ship.y + oy - (ship.type === ShipType.Battleship ? 30 : ship.type === ShipType.Cruiser ? 24 : 20);

    ctx.fillStyle = '#333';
    ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

    const ratio = ship.health / ship.maxHealth;
    const color = ratio > 0.7 ? '#44ff44' : ratio > 0.4 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * ratio, barHeight);
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile): void {
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const alpha = t.life / t.maxLife;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = t.color + alpha.toFixed(2) + ')';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.isFocusFire ? '#ff3333' : '#ffdd66';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = p.isFocusFire ? 'rgba(255,50,50,0.3)' : 'rgba(255,220,100,0.3)';
    ctx.fill();
  }

  private drawExplosions(ctx: CanvasRenderingContext2D, explosions: Particle[]): void {
    for (const e of explosions) {
      const alpha = e.life / e.maxLife;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * (1 + (1 - alpha)), 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawCrackEffect(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.crackAlpha * 0.6;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    const cx = this.width / 2;
    const cy = this.height / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      const len = 60 + Math.random() * 80;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let x = cx;
      let y = cy;
      for (let s = 0; s < 5; s++) {
        x += Math.cos(angle + (Math.random() - 0.5) * 0.8) * (len / 5);
        y += Math.sin(angle + (Math.random() - 0.5) * 0.8) * (len / 5);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawUI(ctx: CanvasRenderingContext2D, sm: ShipManager, elapsedTime: number): void {
    this.drawLeftPanel(ctx, sm);
    this.drawRightPanel(ctx, sm, elapsedTime);
    this.drawTopBar(ctx, sm);
    this.drawShipList(ctx, sm);
  }

  private drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = 'rgba(26,42,74,0.7)';
    ctx.beginPath();
    const r = 6;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,138,170,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawLeftPanel(ctx: CanvasRenderingContext2D, sm: ShipManager): void {
    this.drawPanel(ctx, 8, this.height - 90, 200, 82);

    ctx.fillStyle = '#aaccee';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText('阵型: ' + getFormationName(sm.formation), 20, this.height - 66);

    const focusText = sm.focusFireActive
      ? '集火: 激活中 (' + sm.focusFireTimer.toFixed(1) + 's)'
      : '集火: 未激活';
    ctx.fillStyle = sm.focusFireActive ? '#ff6644' : '#aaccee';
    ctx.fillText(focusText, 20, this.height - 42);

    ctx.fillStyle = '#667799';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText('[1]箭形 [2]线形 [3]圆形 [空格]集火', 20, this.height - 18);
  }

  private drawRightPanel(ctx: CanvasRenderingContext2D, sm: ShipManager, elapsedTime: number): void {
    this.drawPanel(ctx, this.width - 168, 8, 160, 72);

    ctx.fillStyle = '#aaccee';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText('击沉敌舰: ' + sm.getSunkenEnemyCount() + ' / ' + sm.enemyShips.length, this.width - 155, 34);

    const mins = Math.floor(elapsedTime / 60);
    const secs = Math.floor(elapsedTime % 60);
    ctx.fillText('耗时: ' + mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0'), this.width - 155, 58);
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, sm: ShipManager): void {
    const barX = 150;
    const barY = 10;
    const barW = this.width - 300;
    const barH = 16;

    ctx.fillStyle = 'rgba(26,42,74,0.7)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const ratio = sm.getPlayerTotalHealth() / Math.max(1, sm.getPlayerMaxHealth());
    let barColor: string;
    if (ratio > 0.7) {
      const t = (ratio - 0.7) / 0.3;
      barColor = this.lerpColor('#ffaa00', '#44ff44', t);
    } else if (ratio > 0.4) {
      const t = (ratio - 0.4) / 0.3;
      barColor = this.lerpColor('#ff3333', '#ffaa00', t);
    } else {
      barColor = '#ff3333';
    }

    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      '编队生命值 ' + Math.round(ratio * 100) + '%',
      barX + barW / 2,
      barY + 12
    );
    ctx.textAlign = 'left';
  }

  private drawShipList(ctx: CanvasRenderingContext2D, sm: ShipManager): void {
    this.drawPanel(ctx, 8, 8, 130, sm.playerShips.length * 28 + 10);

    const typeNames: Record<ShipType, string> = {
      [ShipType.Destroyer]: '驱逐舰',
      [ShipType.Cruiser]: '巡洋舰',
      [ShipType.Battleship]: '战列舰'
    };

    const typeColors: Record<ShipType, string> = {
      [ShipType.Destroyer]: '#ffcc00',
      [ShipType.Cruiser]: '#4488ff',
      [ShipType.Battleship]: '#ff4444'
    };

    for (let i = 0; i < sm.playerShips.length; i++) {
      const ship = sm.playerShips[i];
      const y = 26 + i * 28;

      if (ship.isDead) {
        ctx.globalAlpha = 0.4;
      }

      ctx.fillStyle = ship.isDead ? '#555' : typeColors[ship.type];
      if (ship.type === ShipType.Destroyer) {
        ctx.beginPath();
        ctx.moveTo(20, y - 6);
        ctx.lineTo(14, y + 4);
        ctx.lineTo(26, y + 4);
        ctx.closePath();
        ctx.fill();
      } else if (ship.type === ShipType.Cruiser) {
        ctx.beginPath();
        ctx.moveTo(20, y - 6);
        ctx.lineTo(26, y);
        ctx.lineTo(20, y + 6);
        ctx.lineTo(14, y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(14, y - 5, 12, 10);
      }

      ctx.fillStyle = ship.isDead ? '#555' : '#ccccdd';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText(typeNames[ship.type], 34, y + 4);

      if (ship.isDead) {
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, y - 7);
        ctx.lineTo(28, y + 7);
        ctx.moveTo(28, y - 7);
        ctx.lineTo(12, y + 7);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.substr(1, 2), 16);
    const g1 = parseInt(c1.substr(3, 2), 16);
    const b1 = parseInt(c1.substr(5, 2), 16);
    const r2 = parseInt(c2.substr(1, 2), 16);
    const g2 = parseInt(c2.substr(3, 2), 16);
    const b2 = parseInt(c2.substr(5, 2), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
