import { BattleState, BattleEngine, BattleEvent } from './BattleEngine';
import { ShipEntity, Projectile, Particle, Explosion } from './AIController';

export interface Star {
  x: number; y: number; z: number; size: number; color: string; twinkle: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: Star[] = [];
  private nebulaGrad: CanvasGradient;
  private t = 0;
  private fps = 60;
  private fpsSmooth = 60;
  private fpsLast = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not available');
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.nebulaGrad = this.createNebulaGradient();
    this.initStars();
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.nebulaGrad = this.createNebulaGradient();
  }

  private createNebulaGradient(): CanvasGradient {
    const g = this.ctx.createRadialGradient(
      this.width * 0.3, this.height * 0.4, 50,
      this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height)
    );
    g.addColorStop(0, 'rgba(40, 30, 100, 0.4)');
    g.addColorStop(0.4, 'rgba(20, 30, 80, 0.25)');
    g.addColorStop(1, 'rgba(5, 8, 24, 0)');
    return g;
  }

  private initStars(): void {
    this.stars = [];
    const colors = ['#ffffff', '#ccddff', '#ffddaa', '#aaccff', '#ffeecc'];
    const count = Math.floor((this.width * this.height) / 3600);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.8 + 0.2,
        size: Math.random() * 1.6 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  render(state: BattleState, dt: number): void {
    this.t += dt;
    if (this.fpsLast === 0) this.fpsLast = performance.now();
    const now = performance.now();
    if (now - this.fpsLast >= 200) {
      this.fps = dt > 0 ? Math.round(1 / dt) : 60;
      this.fpsSmooth = this.fpsSmooth * 0.8 + this.fps * 0.2;
      this.fpsLast = now;
    }

    this.ctx.fillStyle = '#050818';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = this.nebulaGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawParallaxStars(dt);

    this.drawBoundaryLine();

    this.drawExplosions(state.explosions);

    this.drawProjectiles(state.projectiles);

    this.drawShips(state.ships);

    this.drawParticles(state.particles);

    this.drawFPS();
  }

  private drawParallaxStars(dt: number): void {
    for (const s of this.stars) {
      const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * 1.6 + s.twinkle));
      this.ctx.globalAlpha = Math.min(1, alpha * s.z);
      this.ctx.fillStyle = s.color;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size * s.z, 0, Math.PI * 2);
      this.ctx.fill();
      s.x -= 6 * s.z * dt;
      if (s.x < -2) { s.x = this.width + 2; s.y = Math.random() * this.height; }
    }
    this.ctx.globalAlpha = 1;
  }

  private drawBoundaryLine(): void {
    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.5, 20);
    this.ctx.lineTo(this.width * 0.5, this.height - 20);
    this.ctx.stroke();
  }

  private drawShips(ships: ShipEntity[]): void {
    for (const ship of ships) {
      if (!ship.alive) continue;
      this.ctx.save();
      this.ctx.translate(ship.x, ship.y);
      this.ctx.rotate(ship.heading);

      this.ctx.shadowColor = ship.color;
      this.ctx.shadowBlur = 16;

      this.ctx.fillStyle = ship.color;
      this.ctx.strokeStyle = ship.accentColor;
      this.ctx.lineWidth = 1.5;

      this.drawShipBody(ship);

      this.ctx.shadowBlur = 0;
      this.ctx.restore();

      this.drawShield(ship);
      this.drawHealthBar(ship);
    }
  }

  private drawShipBody(ship: ShipEntity): void {
    const s = ship.size;
    this.ctx.beginPath();
    switch (ship.type) {
      case 'frigate':
        this.ctx.moveTo(s, 0);
        this.ctx.lineTo(-s * 0.7, -s * 0.55);
        this.ctx.lineTo(-s * 0.5, 0);
        this.ctx.lineTo(-s * 0.7, s * 0.55);
        this.ctx.closePath();
        break;
      case 'destroyer':
        this.ctx.moveTo(s * 1.1, 0);
        this.ctx.lineTo(s * 0.3, -s * 0.55);
        this.ctx.lineTo(-s * 0.9, -s * 0.7);
        this.ctx.lineTo(-s * 0.6, 0);
        this.ctx.lineTo(-s * 0.9, s * 0.7);
        this.ctx.lineTo(s * 0.3, s * 0.55);
        this.ctx.closePath();
        break;
      case 'cruiser':
        this.ctx.moveTo(s * 1.15, 0);
        this.ctx.lineTo(s * 0.5, -s * 0.35);
        this.ctx.lineTo(s * 0.1, -s * 0.7);
        this.ctx.lineTo(-s * 0.9, -s * 0.85);
        this.ctx.lineTo(-s * 1.1, -s * 0.4);
        this.ctx.lineTo(-s * 0.75, 0);
        this.ctx.lineTo(-s * 1.1, s * 0.4);
        this.ctx.lineTo(-s * 0.9, s * 0.85);
        this.ctx.lineTo(s * 0.1, s * 0.7);
        this.ctx.lineTo(s * 0.5, s * 0.35);
        this.ctx.closePath();
        break;
      case 'battleship':
        this.ctx.moveTo(s * 1.2, 0);
        this.ctx.lineTo(s * 0.7, -s * 0.35);
        this.ctx.lineTo(s * 0.3, -s * 0.55);
        this.ctx.lineTo(-s * 0.4, -s * 0.95);
        this.ctx.lineTo(-s * 1.0, -s * 0.75);
        this.ctx.lineTo(-s * 1.25, -s * 0.35);
        this.ctx.lineTo(-s * 0.9, 0);
        this.ctx.lineTo(-s * 1.25, s * 0.35);
        this.ctx.lineTo(-s * 1.0, s * 0.75);
        this.ctx.lineTo(-s * 0.4, s * 0.95);
        this.ctx.lineTo(s * 0.3, s * 0.55);
        this.ctx.lineTo(s * 0.7, s * 0.35);
        this.ctx.closePath();
        break;
      case 'carrier':
        this.ctx.moveTo(s * 0.9, -s * 0.25);
        this.ctx.lineTo(s * 0.9, s * 0.25);
        this.ctx.lineTo(s * 0.4, s * 0.5);
        this.ctx.lineTo(-s * 1.2, s * 0.95);
        this.ctx.lineTo(-s * 1.45, s * 0.55);
        this.ctx.lineTo(-s * 1.45, -s * 0.55);
        this.ctx.lineTo(-s * 1.2, -s * 0.95);
        this.ctx.lineTo(s * 0.4, -s * 0.5);
        this.ctx.closePath();
        break;
      default:
        this.ctx.moveTo(s, 0);
        this.ctx.lineTo(-s * 0.7, -s * 0.6);
        this.ctx.lineTo(-s * 0.7, s * 0.6);
        this.ctx.closePath();
    }
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = ship.accentColor;
    this.ctx.globalAlpha = 0.85;
    const cs = Math.max(3, s * 0.22);
    this.ctx.beginPath();
    this.ctx.arc(s * 0.15, 0, cs, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.arc(s * 0.15, 0, cs * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    if (ship.team === 'enemy') {
      this.ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(-s * 0.9, 0);
      this.ctx.lineTo(-s * 1.4, 0);
      this.ctx.stroke();
    }
  }

  private drawShield(ship: ShipEntity): void {
    if (ship.shield <= 0) return;
    const ratio = ship.shield / ship.maxShield;
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(0, 212, 255, ${0.2 + 0.55 * ratio})`;
    this.ctx.lineWidth = 1.5 + 1.5 * ratio;
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 8 * ratio;
    this.ctx.beginPath();
    this.ctx.arc(ship.x, ship.y, ship.size * 1.55, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawHealthBar(ship: ShipEntity): void {
    const s = ship.size;
    const w = Math.max(22, s * 2.2);
    const h = 4;
    const x = ship.x - w / 2;
    const y = ship.y - s - 12;
    const ratio = Math.max(0, ship.hp / ship.maxHp);

    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.ctx.fillStyle = 'rgba(60,10,10,0.7)';
    this.ctx.fillRect(x, y, w, h);

    const color = this.hpGradientColor(ratio);
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 3;
    this.ctx.fillRect(x, y, w * ratio, h);
    this.ctx.shadowBlur = 0;

    if (ship.maxShield > 0) {
      const sy = y - 4;
      const sr = Math.max(0, ship.shield / ship.maxShield);
      this.ctx.fillStyle = 'rgba(0, 60, 100, 0.7)';
      this.ctx.fillRect(x, sy, w, 2);
      this.ctx.fillStyle = '#00d4ff';
      this.ctx.fillRect(x, sy, w * sr, 2);
    }
  }

  private hpGradientColor(ratio: number): string {
    const stops: { pos: number; r: number; g: number; b: number }[] = [
      { pos: 0.0, r: 240, g: 60,  b: 60 },
      { pos: 0.5, r: 255, g: 220, b: 60 },
      { pos: 1.0, r: 90,  g: 240, b: 120 }
    ];
    let i = 0;
    for (; i < stops.length - 1; i++) {
      if (ratio <= stops[i + 1].pos) break;
    }
    const a = stops[i];
    const b = stops[Math.min(stops.length - 1, i + 1)];
    const t = b.pos === a.pos ? 0 : (ratio - a.pos) / (b.pos - a.pos);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
  }

  private drawProjectiles(projectiles: Projectile[]): void {
    for (const p of projectiles) {
      this.ctx.save();
      const dx = p.vx, dy = p.vy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const tailLen = Math.min(28, len * 0.05);
      const tx = p.x - ux * tailLen;
      const ty = p.y - uy * tailLen;

      const grad = this.ctx.createLinearGradient(tx, ty, p.x, p.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, p.color + 'aa');
      grad.addColorStop(1, '#ffffff');
      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      if (p.life <= 0) continue;
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      this.ctx.globalAlpha = a;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 4;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
  }

  private drawExplosions(explosions: Explosion[]): void {
    for (const e of explosions) {
      if (e.life <= 0) continue;
      const t = 1 - e.life / e.maxLife;
      const alpha = Math.max(0, 1 - t * t);
      this.ctx.save();

      if (t < 0.55) {
        const gt = t / 0.55;
        const grad = this.ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        grad.addColorStop(0, `rgba(255,255,220,${0.95 * (1 - gt * 0.6)})`);
        grad.addColorStop(0.35, `rgba(255,180,80,${0.7 * (1 - gt * 0.5)})`);
        grad.addColorStop(0.7, `rgba(255,80,40,${0.4 * (1 - gt)})`);
        grad.addColorStop(1, `rgba(120,20,0,0)`);
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.strokeStyle = `rgba(255, 200, 120, ${alpha * 0.85})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      for (const f of e.fragments) {
        const fa = alpha * 0.9;
        this.ctx.save();
        this.ctx.translate(f.x, f.y);
        this.ctx.rotate(f.rot);
        this.ctx.fillStyle = e.color;
        this.ctx.globalAlpha = fa;
        this.ctx.shadowColor = '#ffa040';
        this.ctx.shadowBlur = 6;
        this.ctx.fillRect(-f.size * 0.5, -f.size * 0.25, f.size, f.size * 0.5);
        this.ctx.restore();
      }
      this.ctx.restore();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
  }

  private drawFPS(): void {
    this.ctx.font = '12px Orbitron, monospace';
    this.ctx.fillStyle = this.fpsSmooth >= 30 ? 'rgba(122, 255, 154, 0.75)' : 'rgba(255, 120, 120, 0.85)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('FPS: ' + Math.round(this.fpsSmooth), 14, this.height - 14);
  }

  renderBattleOverlay(state: BattleState, container: HTMLElement, onPause: () => void, onSpeed: (s: number) => void, onBack: () => void): void {
    const existing = container.querySelectorAll('.hud-layer');
    existing.forEach(n => n.remove());

    const hud = document.createElement('div');
    hud.className = 'hud-layer';
    hud.style.cssText = 'position:absolute;inset:0;pointer-events:none;';

    const playerPanel = document.createElement('div');
    playerPanel.className = 'panel';
    playerPanel.style.cssText = `
      position:absolute;top:16px;left:16px;width:240px;padding:12px;
      animation: slideInDown 0.3s ease-out;pointer-events:auto;
    `;
    const pTitle = document.createElement('div');
    pTitle.style.cssText = 'color:#7aff9a;font-family:Orbitron,sans-serif;font-size:13px;letter-spacing:2px;margin-bottom:8px;display:flex;justify-content:space-between;';
    pTitle.innerHTML = `<span>◉ 己方舰队</span><span id="p-count">${this.countAlive(state.ships, 'player')}</span>`;
    playerPanel.appendChild(pTitle);
    const pList = document.createElement('div');
    pList.id = 'p-list';
    this.renderShipStatusList(pList, state.ships.filter(s => s.team === 'player'));
    playerPanel.appendChild(pList);
    hud.appendChild(playerPanel);

    const enemyPanel = document.createElement('div');
    enemyPanel.className = 'panel';
    enemyPanel.style.cssText = `
      position:absolute;top:16px;right:16px;width:240px;padding:12px;
      animation: slideInDown 0.3s ease-out;pointer-events:auto;
    `;
    const eTitle = document.createElement('div');
    eTitle.style.cssText = 'color:#ff6e6e;font-family:Orbitron,sans-serif;font-size:13px;letter-spacing:2px;margin-bottom:8px;display:flex;justify-content:space-between;';
    eTitle.innerHTML = `<span id="e-count">${this.countAlive(state.ships, 'enemy')}</span><span>敌方舰队 ◎</span>`;
    enemyPanel.appendChild(eTitle);
    const eList = document.createElement('div');
    eList.id = 'e-list';
    eList.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;';
    this.renderShipStatusList(eList, state.ships.filter(s => s.team === 'enemy'), true);
    enemyPanel.appendChild(eList);
    hud.appendChild(enemyPanel);

    const controlBar = document.createElement('div');
    controlBar.className = 'panel';
    controlBar.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      padding:10px 18px;display:flex;align-items:center;gap:12px;
      animation: slideInUp 0.3s ease-out;pointer-events:auto;
    `;
    const timeLabel = document.createElement('div');
    timeLabel.id = 'time-label';
    timeLabel.style.cssText = 'font-family:Orbitron,monospace;font-size:14px;color:#00d4ff;min-width:60px;text-align:center;letter-spacing:1px;';
    timeLabel.textContent = this.formatTime(state.time);

    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'pause-btn';
    pauseBtn.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    pauseBtn.onclick = () => onPause();

    const s1x = document.createElement('button');
    s1x.textContent = '1x';
    const s2x = document.createElement('button');
    s2x.textContent = '2x';
    const s4x = document.createElement('button');
    s4x.textContent = '4x';
    const highlight = (s: number) => {
      [s1x, s2x, s4x].forEach((b, i) => {
        const target = [1, 2, 4][i];
        if (target === s) {
          b.style.background = 'rgba(0,212,255,0.3)';
          b.style.borderColor = '#00d4ff';
          b.style.boxShadow = '0 0 10px rgba(0,212,255,0.5)';
        } else {
          b.style.background = '';
          b.style.borderColor = '';
          b.style.boxShadow = '';
        }
      });
    };
    highlight(state.speed);
    s1x.onclick = () => { onSpeed(1); highlight(1); };
    s2x.onclick = () => { onSpeed(2); highlight(2); };
    s4x.onclick = () => { onSpeed(4); highlight(4); };

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 编队';
    backBtn.style.cssText = 'border-color:rgba(255,160,160,0.5);';
    backBtn.onclick = () => { if (confirm('确认返回编队界面？')) onBack(); };

    controlBar.appendChild(timeLabel);
    controlBar.appendChild(pauseBtn);
    controlBar.appendChild(s1x);
    controlBar.appendChild(s2x);
    controlBar.appendChild(s4x);
    controlBar.appendChild(backBtn);
    hud.appendChild(controlBar);

    const banner = document.createElement('div');
    banner.id = 'battle-banner';
    banner.style.cssText = `
      position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);
      font-family:Orbitron,sans-serif;font-size:42px;letter-spacing:8px;
      color:#00d4ff;text-shadow:0 0 30px rgba(0,212,255,0.8);
      pointer-events:none;opacity:0;transition:opacity 0.4s ease-out;
    `;
    banner.textContent = '⚔ 开始交战 ⚔';
    hud.appendChild(banner);
    setTimeout(() => { banner.style.opacity = '1'; }, 50);
    setTimeout(() => { banner.style.opacity = '0'; }, 2200);

    container.appendChild(hud);
  }

  updateBattleOverlay(state: BattleState): void {
    const pCountEl = document.getElementById('p-count');
    const eCountEl = document.getElementById('e-count');
    const tLabel = document.getElementById('time-label');
    const pList = document.getElementById('p-list');
    const eList = document.getElementById('e-list');
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement | null;
    if (pCountEl) pCountEl.textContent = String(this.countAlive(state.ships, 'player'));
    if (eCountEl) eCountEl.textContent = String(this.countAlive(state.ships, 'enemy'));
    if (tLabel) tLabel.textContent = this.formatTime(state.time);
    if (pauseBtn) pauseBtn.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    if (pList) this.renderShipStatusList(pList, state.ships.filter(s => s.team === 'player'));
    if (eList) {
      eList.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;';
      this.renderShipStatusList(eList, state.ships.filter(s => s.team === 'enemy'), true);
    }
    if (state.ended) {
      const banner = document.getElementById('battle-banner');
      if (banner && banner.style.opacity !== '1') {
        const txt = state.winner === 'player' ? '✦ 胜利 ✦' : (state.winner === 'enemy' ? '✗ 失败 ✗' : '— 平局 —');
        const col = state.winner === 'player' ? '#7aff9a' : (state.winner === 'enemy' ? '#ff7a7a' : '#ffd166');
        banner.textContent = txt;
        banner.style.color = col;
        banner.style.textShadow = `0 0 30px ${col}`;
        banner.style.opacity = '1';
      }
    }
  }

  private countAlive(ships: ShipEntity[], team: 'player' | 'enemy'): string {
    const a = ships.filter(s => s.team === team && s.alive).length;
    const t = ships.filter(s => s.team === team).length;
    return `${a}/${t}`;
  }

  private renderShipStatusList(container: HTMLElement, ships: ShipEntity[], reverse = false): void {
    if (container.childElementCount === ships.length) {
      ships.forEach((s, i) => {
        const el = container.children[i] as HTMLElement;
        if (!el) return;
        const ratio = Math.max(0, s.hp / s.maxHp);
        const sRatio = s.maxShield > 0 ? Math.max(0, s.shield / s.maxShield) : 0;
        const name = el.querySelector('.hp-name') as HTMLElement;
        const hpFill = el.querySelector('.hp-fill') as HTMLElement;
        const shFill = el.querySelector('.sh-fill') as HTMLElement;
        const hpText = el.querySelector('.hp-text') as HTMLElement;
        if (name) name.style.opacity = s.alive ? '1' : '0.35';
        if (name) name.style.textDecoration = s.alive ? 'none' : 'line-through';
        if (hpFill) {
          hpFill.style.width = `${ratio * 100}%`;
          hpFill.style.background = this.hpGradientColor(ratio);
        }
        if (shFill) shFill.style.width = `${sRatio * 100}%`;
        if (hpText) hpText.textContent = `${Math.max(0, Math.round(s.hp))}/${s.maxHp}`;
      });
      return;
    }
    container.innerHTML = '';
    ships.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = `
        margin-bottom:6px;padding:5px 8px;border-radius:3px;
        background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);
        width:210px;
      `;
      const top = document.createElement('div');
      top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;';
      const nm = document.createElement('span');
      nm.className = 'hp-name';
      nm.style.cssText = `font-size:11px;color:${s.color};font-family:Orbitron,sans-serif;letter-spacing:1px;opacity:${s.alive ? 1 : 0.35};text-decoration:${s.alive ? 'none' : 'line-through'};`;
      nm.textContent = s.name;
      const tx = document.createElement('span');
      tx.className = 'hp-text';
      tx.style.cssText = 'font-size:10px;color:#aac;font-family:Rajdhani,sans-serif;';
      tx.textContent = `${Math.max(0, Math.round(s.hp))}/${s.maxHp}`;
      top.appendChild(nm); top.appendChild(tx);

      const hpBg = document.createElement('div');
      hpBg.style.cssText = 'height:4px;background:rgba(60,10,10,0.6);border-radius:2px;overflow:hidden;';
      const hpFill = document.createElement('div');
      hpFill.className = 'hp-fill';
      const ratio = Math.max(0, s.hp / s.maxHp);
      hpFill.style.cssText = `height:100%;width:${ratio * 100}%;background:${this.hpGradientColor(ratio)};transition:width 0.15s, background 0.15s;`;
      hpBg.appendChild(hpFill);

      const shBg = document.createElement('div');
      shBg.style.cssText = 'height:2px;margin-top:2px;background:rgba(0,60,100,0.5);border-radius:1px;overflow:hidden;';
      const shFill = document.createElement('div');
      shFill.className = 'sh-fill';
      const sRatio = s.maxShield > 0 ? Math.max(0, s.shield / s.maxShield) : 0;
      shFill.style.cssText = `height:100%;width:${sRatio * 100}%;background:#00d4ff;transition:width 0.15s;`;
      shBg.appendChild(shFill);

      row.appendChild(top); row.appendChild(hpBg); row.appendChild(shBg);
      container.appendChild(row);
    });
  }

  private formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}
