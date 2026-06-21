import type { BattleSnapshot, BattleShip, Team, Projectile } from '../../shared/types';
import { SHIP_TEMPLATES, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../shared/types';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface ScreenFlash {
  team: Team;
  startTime: number;
  duration: number;
}

const TEAM_COLORS: Record<Team, { fill: string; stroke: string; glow: string }> = {
  red: { fill: '#ff4545', stroke: '#ff6b6b', glow: '#ff4545' },
  blue: { fill: '#45aaff', stroke: '#6bc5ff', glow: '#45aaff' },
};

export class GameBoard {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private explosionParticles: ExplosionParticle[] = [];
  private screenFlashes: ScreenFlash[] = [];
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private currentTime: number = 0;
  private snapshot: BattleSnapshot | null = null;
  private yourTeam: Team = 'red';
  private processedEvents: Set<string> = new Set();
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    for (let i = 0; i < 400; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 1 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    this.updateScale(canvas);
    this.resizeHandler = this.resizeHandler.bind(this);
    canvas.addEventListener('resize', this.resizeHandler);
    window.addEventListener('resize', this.resizeHandler);

    this.lastTime = performance.now();
    this.startLoop();
  }

  private resizeHandler() {
    const canvas = this.ctx.canvas;
    this.updateScale(canvas);
  }

  private updateScale(canvas: HTMLCanvasElement) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    const viewportAspect = viewportWidth / viewportHeight;

    if (viewportAspect > canvasAspect) {
      this.scale = viewportHeight / CANVAS_HEIGHT;
      this.offsetX = (viewportWidth - CANVAS_WIDTH * this.scale) / 2;
      this.offsetY = 0;
    } else {
      this.scale = viewportWidth / CANVAS_WIDTH;
      this.offsetX = 0;
      this.offsetY = (viewportHeight - CANVAS_HEIGHT * this.scale) / 2;
    }

    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
  }

  private startLoop() {
    const loop = (time: number) => {
      this.currentTime = time;
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.ctx.save();
      this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

      this.drawBackground();
      this.drawStars(time);
      this.updateExplosionParticles(dt);
      this.drawExplosionParticles();

      if (this.snapshot) {
        this.processEvents(this.snapshot);
        this.drawProjectiles(this.snapshot.projectiles);
        this.drawShips(this.snapshot.ships);
        this.drawHUD(this.snapshot);
      }

      this.drawScreenFlashes(time);
      this.ctx.restore();

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  render(snapshot: BattleSnapshot, yourTeam: Team) {
    this.snapshot = snapshot;
    this.yourTeam = yourTeam;
  }

  addExplosion(x: number, y: number, team: Team) {
    const colors = team === 'red'
      ? ['#ff4545', '#ff6b6b', '#ff8888', '#ffaa44']
      : ['#45aaff', '#6bc5ff', '#88ddff', '#44aaff'];
    const count = 20 + Math.floor(Math.random() * 11);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      this.explosionParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.3,
        maxLife: 0.3,
        size: 1 + Math.random() * 3,
      });
    }
  }

  addScreenFlash(team: Team) {
    this.screenFlashes.push({
      team,
      startTime: performance.now(),
      duration: 500,
    });
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.resizeHandler);
    this.explosionParticles = [];
    this.screenFlashes = [];
    this.processedEvents.clear();
  }

  private drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0b1e');
    gradient.addColorStop(1, '#1a1b3e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawStars(time: number) {
    const cameraShiftX = this.snapshot ? 10 : 0;
    const cameraShiftY = this.snapshot ? 5 : 0;

    for (const star of this.stars) {
      const twinkle = Math.sin(time / 1000 * star.twinkleSpeed + star.twinkleOffset);
      const alpha = 0.3 + (twinkle * 0.5 + 0.5) * 0.7 * star.brightness;
      const drawX = ((star.x - cameraShiftX * star.size * 0.1) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      const drawY = ((star.y - cameraShiftY * star.size * 0.1) % CANVAS_HEIGHT + CANVAS_HEIGHT) % CANVAS_HEIGHT;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawProjectiles(projectiles: Projectile[]) {
    for (const proj of projectiles) {
      const colors = TEAM_COLORS[proj.team];

      this.ctx.save();
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = colors.glow;
      this.ctx.fillStyle = colors.fill;
      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawShips(ships: BattleShip[]) {
    for (const ship of ships) {
      const template = SHIP_TEMPLATES.find((t) => t.type === ship.type);
      const size = template ? template.size : 12;
      const colors = TEAM_COLORS[ship.team];

      this.ctx.save();
      this.ctx.translate(ship.x, ship.y);
      this.ctx.rotate(ship.angle);

      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = colors.glow;

      this.ctx.beginPath();
      this.ctx.moveTo(size, 0);
      this.ctx.lineTo(-size * 0.7, -size * 0.6);
      this.ctx.lineTo(-size * 0.4, 0);
      this.ctx.lineTo(-size * 0.7, size * 0.6);
      this.ctx.closePath();

      this.ctx.fillStyle = colors.fill;
      this.ctx.fill();
      this.ctx.strokeStyle = colors.stroke;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.restore();

      this.drawHPBar(ship);
      this.drawShipLabel(ship, size);
    }
  }

  private drawHPBar(ship: BattleShip) {
    const barWidth = 30;
    const barHeight = 4;
    const x = ship.x - barWidth / 2;
    const y = ship.y - 20;

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    const hpRatio = ship.hp / ship.maxHp;
    const r = Math.floor(34 + (239 - 34) * (1 - hpRatio));
    const g = Math.floor(197 * hpRatio + 68 * (1 - hpRatio));
    const b = Math.floor(94 * hpRatio + 68 * (1 - hpRatio));

    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
    this.ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
  }

  private drawShipLabel(ship: BattleShip, size: number) {
    const template = SHIP_TEMPLATES.find((t) => t.type === ship.type);
    const label = template ? template.name : ship.type;

    this.ctx.fillStyle = '#a0a0c0';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, ship.x, ship.y + size + 14);
  }

  private processEvents(snapshot: BattleSnapshot) {
    for (const event of snapshot.events) {
      const eventKey = `${event.type}-${event.shipId || ''}-${event.x || 0}-${event.y || 0}`;
      if (this.processedEvents.has(eventKey)) continue;
      this.processedEvents.add(eventKey);

      if (event.type === 'destroy' && event.x != null && event.y != null && event.team) {
        this.addExplosion(event.x, event.y, event.team);
        this.addScreenFlash(event.team);
      }

      if (event.type === 'hit' && event.x != null && event.y != null) {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 20 + Math.random() * 60;
          this.explosionParticles.push({
            x: event.x,
            y: event.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: '#ffffff',
            life: 0.15,
            maxLife: 0.15,
            size: 1 + Math.random() * 1.5,
          });
        }
      }
    }
  }

  private updateExplosionParticles(dt: number) {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.explosionParticles.splice(i, 1);
      }
    }
  }

  private drawExplosionParticles() {
    for (const p of this.explosionParticles) {
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawScreenFlashes(time: number) {
    for (let i = this.screenFlashes.length - 1; i >= 0; i--) {
      const flash = this.screenFlashes[i];
      const elapsed = time - flash.startTime;
      if (elapsed >= flash.duration) {
        this.screenFlashes.splice(i, 1);
        continue;
      }

      const progress = elapsed / flash.duration;
      const alpha = (1 - progress) * 0.3;
      const colors = TEAM_COLORS[flash.team];

      const gradient = this.ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      gradient.addColorStop(0, colors.fill);
      gradient.addColorStop(0.15, 'transparent');
      gradient.addColorStop(0.85, 'transparent');
      gradient.addColorStop(1, colors.fill);

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const gradientV = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradientV.addColorStop(0, colors.fill);
      gradientV.addColorStop(0.15, 'transparent');
      gradientV.addColorStop(0.85, 'transparent');
      gradientV.addColorStop(1, colors.fill);

      this.ctx.fillStyle = gradientV;
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      this.ctx.globalAlpha = 1;
    }
  }

  private drawHUD(snapshot: BattleSnapshot) {
    const minutes = Math.floor(snapshot.timeRemaining / 60);
    const seconds = Math.floor(snapshot.timeRemaining % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillText(timeStr, CANVAS_WIDTH / 2, 40);
    this.ctx.globalAlpha = 1;
  }
}
