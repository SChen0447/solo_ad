import type { Ship, Projectile, Particle, FormationType, ShipType } from './ShipManager';

const FORMATION_NAMES: Record<FormationType, string> = {
  arrow: '箭形阵型',
  line: '线形横排',
  circle: '圆形防御'
};

const SHIP_TYPE_NAMES: Record<ShipType, string> = {
  destroyer: '驱逐舰',
  cruiser: '巡洋舰',
  battleship: '战列舰'
};

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function hpToColor(ratio: number): string {
  const GREEN: [number, number, number] = [46, 204, 113];
  const YELLOW: [number, number, number] = [241, 196, 15];
  const RED: [number, number, number] = [231, 76, 60];
  if (ratio >= 0.7) {
    const t = (ratio - 0.7) / 0.3;
    return lerpColor(YELLOW, GREEN, t);
  } else if (ratio >= 0.4) {
    const t = (ratio - 0.4) / 0.3;
    return lerpColor(RED, YELLOW, t);
  } else {
    return lerpColor(RED, RED, 1);
  }
}

interface RenderState {
  formation: FormationType;
  isFocusFire: boolean;
  focusFireTimer: number;
  killCount: number;
  elapsedTime: number;
  totalEnemyCount: number;
  destroyedPlayerShipIds: string[];
  playerHp: { current: number; max: number };
  waveTime: number;
  shatterFlash: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  render(
    ships: Ship[],
    projectiles: Projectile[],
    particles: Particle[],
    state: RenderState
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    this.drawOcean(w, h, state.waveTime);
    this.drawGrid(w, h, state.waveTime);

    const activeParticles = particles.filter(p => p.type === 'wake');
    this.drawParticles(activeParticles);

    ships.filter(s => s.team === 'enemy').forEach(s => this.drawShip(s));
    ships.filter(s => s.team === 'player').forEach(s => this.drawShip(s));

    this.drawProjectiles(projectiles);

    const explosionParticles = particles.filter(p => p.type === 'explosion' || p.type === 'shatter');
    this.drawParticles(explosionParticles);

    if (state.shatterFlash > 0) {
      this.drawShatterFlash(w, h, state.shatterFlash);
    }

    this.drawHpBar(w, state.playerHp);
    this.drawLeftTopPanel(ships, state.destroyedPlayerShipIds);
    this.drawLeftBottomPanel(state.formation, state.isFocusFire, state.focusFireTimer);
    this.drawRightTopPanel(state.killCount, state.totalEnemyCount, state.elapsedTime);
  }

  private drawOcean(w: number, h: number, t: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.5, '#0d1e36');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#3a6aaa';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const baseY = (i / 12) * h + Math.sin(t * 0.0008 + i) * 10;
      for (let x = 0; x <= w; x += 8) {
        const y = baseY + Math.sin(x * 0.02 + t * 0.001 + i * 0.7) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGrid(w: number, h: number, t: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#4a7aaa';
    ctx.lineWidth = 0.5;
    const gridSize = 50;
    const offset = (t * 0.02) % gridSize;
    for (let x = -offset; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < h; y += 20) {
        const wobble = Math.sin(y * 0.02 + t * 0.001) * 2;
        ctx.lineTo(x + wobble, y);
      }
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 20) {
        const wobble = Math.sin(x * 0.02 + t * 0.0012) * 2;
        ctx.lineTo(x, y + wobble);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawShip(ship: Ship): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);

    if (ship.isSinking) {
      const sp = ship.sinkProgress;
      ctx.globalAlpha = 1 - sp;
      ctx.scale(1 - sp * 0.8, 1 - sp * 0.8);
      ctx.translate(0, sp * 15);
    }

    const dim = ship.team === 'player' ? false : false;

    if (ship.type === 'destroyer') {
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fillStyle = dim ? '#887722' : '#ffd93d';
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (ship.type === 'cruiser') {
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(0, -11);
      ctx.lineTo(-14, 0);
      ctx.lineTo(0, 11);
      ctx.closePath();
      ctx.fillStyle = dim ? '#224466' : '#4a9eff';
      ctx.fill();
      ctx.strokeStyle = '#1e60b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(-16, -10, 32, 20);
      ctx.fillStyle = dim ? '#662222' : '#e74c3c';
      ctx.fill();
      ctx.strokeStyle = '#a02020';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(22, 0);
      ctx.strokeStyle = '#a02020';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();

    if (ship.isAlive && !ship.isSinking) {
      this.drawShipHpBar(ship);
    }
  }

  private drawShipHpBar(ship: Ship): void {
    const ctx = this.ctx;
    const barW = 30;
    const barH = 4;
    const x = ship.x - barW / 2;
    const y = ship.y - (ship.type === 'battleship' ? 22 : ship.type === 'cruiser' ? 18 : 16);
    const ratio = Math.max(0, ship.hp / ship.maxHp);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = ship.team === 'enemy' ? '#e74c3c' : hpToColor(ratio);
    ctx.fillRect(x, y, barW * ratio, barH);
    ctx.restore();
  }

  private drawProjectiles(projectiles: Projectile[]): void {
    const ctx = this.ctx;
    projectiles.forEach(p => {
      if (p.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < p.trail.length - 1; i++) {
          const alpha = (1 - i / p.trail.length) * 0.6;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = p.isFocusFire ? '#ff4444' : '#ffffff';
          ctx.lineWidth = (1 - i / p.trail.length) * 3;
          ctx.beginPath();
          ctx.moveTo(p.trail[i].x, p.trail[i].y);
          ctx.lineTo(p.trail[i + 1].x, p.trail[i + 1].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.isFocusFire ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p.isFocusFire ? '#ff5555' : '#ffffff';
      ctx.shadowColor = p.isFocusFire ? '#ff2222' : '#88ccff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    });
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    particles.forEach(p => {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'wake') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'explosion') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
      } else if (p.type === 'shatter') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 0.01);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    });
  }

  private drawShatterFlash(w: number, h: number, intensity: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = intensity * 0.4;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    grad.addColorStop(0, 'rgba(200,30,30,0.6)');
    grad.addColorStop(1, 'rgba(200,30,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = `rgba(255,50,50,${intensity})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + intensity * 5;
      const len = 100 + intensity * 200;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(angle) * len, h / 2 + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHpBar(w: number, hp: { current: number; max: number }): void {
    const ctx = this.ctx;
    const barH = 12;
    const padding = 10;
    const barW = w - padding * 2;
    const ratio = Math.max(0, Math.min(1, hp.current / hp.max));
    const color = hpToColor(ratio);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(padding - 2, 6, barW + 4, barH + 4);
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(padding, 8, barW, barH);
    ctx.fillStyle = color;
    ctx.fillRect(padding, 8, barW * ratio, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, 8, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`舰队生命: ${Math.round(hp.current)} / ${hp.max}`, w / 2, 8 + barH / 2);
    ctx.restore();
  }

  private drawLeftTopPanel(ships: Ship[], destroyedIds: string[]): void {
    const ctx = this.ctx;
    const playerShips = ships.filter(s => s.team === 'player');
    const panelW = 130;
    const panelH = 30 + playerShips.length * 26;
    const x = 10;
    const y = 28;

    ctx.save();
    ctx.fillStyle = 'rgba(26,42,74,0.7)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, panelW, panelH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#aaccee';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('我方舰队', x + 10, y + 8);

    playerShips.forEach((ship, i) => {
      const sy = y + 28 + i * 26;
      const isDestroyed = destroyedIds.includes(ship.id);
      this.drawShipIcon(x + 12, sy + 10, ship.type, isDestroyed);
      ctx.fillStyle = isDestroyed ? '#666' : '#ddeeff';
      ctx.font = '11px sans-serif';
      ctx.fillText(SHIP_TYPE_NAMES[ship.type], x + 38, sy + 5);

      if (isDestroyed) {
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 8, sy + 2);
        ctx.lineTo(x + 30, sy + 20);
        ctx.moveTo(x + 30, sy + 2);
        ctx.lineTo(x + 8, sy + 20);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  private drawShipIcon(cx: number, cy: number, type: ShipType, grayed: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    if (grayed) ctx.globalAlpha = 0.35;

    if (type === 'destroyer') {
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fillStyle = grayed ? '#666' : '#ffd93d';
      ctx.fill();
    } else if (type === 'cruiser') {
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(-8, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fillStyle = grayed ? '#666' : '#4a9eff';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.rect(-8, -6, 16, 12);
      ctx.fillStyle = grayed ? '#666' : '#e74c3c';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLeftBottomPanel(formation: FormationType, isFocus: boolean, focusTimer: number): void {
    const ctx = this.ctx;
    const h = this.canvas.height;
    const panelW = 180;
    const panelH = 62;
    const x = 10;
    const y = h - panelH - 10;

    ctx.save();
    ctx.fillStyle = 'rgba(26,42,74,0.7)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, panelW, panelH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#aaccee';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`阵型: ${FORMATION_NAMES[formation]}`, x + 10, y + 10);

    if (isFocus) {
      const seconds = Math.ceil(focusTimer / 1000);
      ctx.fillStyle = '#ff6666';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`集火攻击中 (${seconds}s)`, x + 10, y + 32);
    } else {
      ctx.fillStyle = '#7799bb';
      ctx.font = '11px sans-serif';
      ctx.fillText('按 1/2/3 切换阵型，空格集火', x + 10, y + 34);
    }
    ctx.restore();
  }

  private drawRightTopPanel(kills: number, totalEnemies: number, elapsedMs: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const panelW = 160;
    const panelH = 60;
    const x = w - panelW - 10;
    const y = 28;

    ctx.save();
    ctx.fillStyle = 'rgba(26,42,74,0.7)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, panelW, panelH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#aaccee';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`击沉敌舰: ${kills} / ${totalEnemies}`, x + 10, y + 10);

    const totalSec = Math.floor(elapsedMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    ctx.fillStyle = '#ddeeff';
    ctx.font = '12px monospace';
    ctx.fillText(`总耗时: ${mm}:${ss}`, x + 10, y + 32);
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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
}
