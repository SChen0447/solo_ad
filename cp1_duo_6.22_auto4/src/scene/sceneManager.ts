import { Ship } from '../entities/ship';
import { Fleet } from '../entities/fleet';
import { CollisionDetector } from '../collision/collisionDetector';
import type { AttackEffect, Particle, LogEntry, GameStats, FormationType, ShipType, Team } from '../types';
import { SHIP_NAMES } from '../types';

let effectIdCounter = 0;
let particleIdCounter = 0;
let logIdCounter = 0;

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ships: Ship[];
  private fleets: Fleet[];
  private collisionDetector: CollisionDetector;
  private attackEffects: AttackEffect[];
  private particles: Particle[];
  private logs: LogEntry[];
  private stats: GameStats;
  private isRunning: boolean;
  private lastTime: number;
  private animationFrameId: number | null;
  private stars: Array<{ x: number; y: number; size: number; twinkle: number }>;
  private nebulaCanvas: HTMLCanvasElement;

  private isDragging: boolean;
  private dragStart: { x: number; y: number };
  private dragEnd: { x: number; y: number };
  private selectedShips: Ship[];

  private onStatsUpdate: ((stats: GameStats) => void) | null;
  private onLogUpdate: ((logs: LogEntry[]) => void) | null;
  private onGameOver: ((winner: Team) => void) | null;
  private gameOver: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ships = [];
    this.fleets = [];
    this.collisionDetector = new CollisionDetector(50);
    this.attackEffects = [];
    this.particles = [];
    this.logs = [];
    this.stats = {
      player: { totalHealth: 0, aliveUnits: 0, dps: 0 },
      enemy: { totalHealth: 0, aliveUnits: 0, dps: 0 },
      startTime: Date.now(),
      playerKills: 0,
      enemyKills: 0
    };
    this.isRunning = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.stars = [];
    this.nebulaCanvas = document.createElement('canvas');

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragEnd = { x: 0, y: 0 };
    this.selectedShips = [];

    this.onStatsUpdate = null;
    this.onLogUpdate = null;
    this.onGameOver = null;
    this.gameOver = false;

    this.resize();
    this.initBackground();
    this.setupEventListeners();
  }

  private initBackground(): void {
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2
      });
    }

    this.nebulaCanvas.width = this.canvas.width;
    this.nebulaCanvas.height = this.canvas.height;
    const nebulaCtx = this.nebulaCanvas.getContext('2d')!;

    const gradient1 = nebulaCtx.createRadialGradient(
      this.canvas.width * 0.2, this.canvas.height * 0.3, 0,
      this.canvas.width * 0.2, this.canvas.height * 0.3, 400
    );
    gradient1.addColorStop(0, 'rgba(74, 158, 255, 0.15)');
    gradient1.addColorStop(1, 'rgba(74, 158, 255, 0)');
    nebulaCtx.fillStyle = gradient1;
    nebulaCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient2 = nebulaCtx.createRadialGradient(
      this.canvas.width * 0.8, this.canvas.height * 0.7, 0,
      this.canvas.width * 0.8, this.canvas.height * 0.7, 500
    );
    gradient2.addColorStop(0, 'rgba(255, 74, 74, 0.1)');
    gradient2.addColorStop(1, 'rgba(255, 74, 74, 0)');
    nebulaCtx.fillStyle = gradient2;
    nebulaCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient3 = nebulaCtx.createRadialGradient(
      this.canvas.width * 0.5, this.canvas.height * 0.5, 0,
      this.canvas.width * 0.5, this.canvas.height * 0.5, 600
    );
    gradient3.addColorStop(0, 'rgba(150, 100, 255, 0.08)');
    gradient3.addColorStop(1, 'rgba(150, 100, 255, 0)');
    nebulaCtx.fillStyle = gradient3;
    nebulaCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.resize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.gameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0) {
      const clickedShip = this.collisionDetector.checkPointCollision(this.ships, x, y);
      if (clickedShip && clickedShip.team === 'player') {
        if (!e.shiftKey) {
          this.clearSelection();
        }
        this.selectShip(clickedShip);
      } else {
        if (!e.shiftKey) {
          this.clearSelection();
        }
        this.isDragging = true;
        this.dragStart = { x, y };
        this.dragEnd = { x, y };
      }
    } else if (e.button === 2) {
      this.moveSelectedTo(x, y);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    this.dragEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0 && this.isDragging) {
      this.isDragging = false;
      const dx = Math.abs(this.dragEnd.x - this.dragStart.x);
      const dy = Math.abs(this.dragEnd.y - this.dragStart.y);
      if (dx > 5 || dy > 5) {
        const ships = this.collisionDetector.checkRectCollision(
          this.ships,
          this.dragStart.x, this.dragStart.y,
          this.dragEnd.x, this.dragEnd.y
        );
        ships.forEach(ship => this.selectShip(ship));
      }
    }
  }

  private selectShip(ship: Ship): void {
    ship.isSelected = true;
    if (!this.selectedShips.includes(ship)) {
      this.selectedShips.push(ship);
    }
  }

  private clearSelection(): void {
    this.selectedShips.forEach(ship => ship.isSelected = false);
    this.selectedShips = [];
  }

  private moveSelectedTo(x: number, y: number): void {
    if (this.selectedShips.length === 0) return;

    let fleet = this.selectedShips[0].fleet;
    if (!fleet) {
      fleet = new Fleet('player', this.selectedShips);
      this.fleets.push(fleet);
    } else {
      this.selectedShips.forEach(ship => {
        if (!fleet!.ships.includes(ship)) {
          fleet!.addShip(ship);
        }
      });
    }

    fleet.setTarget(x, y);
    this.addLog('player', `编队移动到 (${Math.round(x)}, ${Math.round(y)})`);
  }

  createShip(type: ShipType, team: Team, x: number, y: number): Ship {
    const ship = new Ship({ type, team, x, y });
    this.ships.push(ship);
    this.addLog(team === 'player' ? 'player' : 'enemy',
      `${team === 'player' ? '己方' : '敌方'}创建了${SHIP_NAMES[type]}`);
    return ship;
  }

  createFleet(team: Team, ships: Ship[]): Fleet {
    const fleet = new Fleet(team, ships);
    this.fleets.push(fleet);
    return fleet;
  }

  setFleetFormation(formation: FormationType): void {
    const playerFleets = this.fleets.filter(f => f.team === 'player' && f.getAliveCount() > 0);
    playerFleets.forEach(fleet => {
      fleet.setFormation(formation);
    });
    this.addLog('system', `编队阵型切换为${formation === 'triangle' ? '三角形' : formation === 'wedge' ? '雁形' : '纵队'}`);
  }

  private addLog(team: Team | 'system', message: string): void {
    this.logs.push({
      id: `log_${++logIdCounter}`,
      timestamp: Date.now(),
      message,
      team
    });
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    if (this.onLogUpdate) {
      this.onLogUpdate([...this.logs]);
    }
  }

  private createAttackEffect(from: Ship, to: Ship): void {
    this.attackEffects.push({
      id: `effect_${++effectIdCounter}`,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      startTime: performance.now(),
      duration: 300,
      team: from.team,
      type: from.type === 'fighter' ? 'projectile' : 'laser'
    });
  }

  private createExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        id: `particle_${++particleIdCounter}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: Math.random() * 4 + 2
      });
    }
  }

  setOnStatsUpdate(callback: (stats: GameStats) => void): void {
    this.onStatsUpdate = callback;
  }

  setOnLogUpdate(callback: (logs: LogEntry[]) => void): void {
    this.onLogUpdate = callback;
  }

  setOnGameOver(callback: (winner: Team) => void): void {
    this.onGameOver = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt, currentTime);
    this.render(currentTime);

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number, currentTime: number): void {
    if (this.gameOver) return;

    this.ships.forEach(ship => ship.update(dt));
    this.fleets.forEach(fleet => fleet.update(dt));
    this.collisionDetector.detectCollisions(this.ships);

    this.updateCombat(currentTime);
    this.updateEffects();
    this.updateParticles(dt);
    this.updateStats();
    this.checkGameOver();
  }

  private updateCombat(currentTime: number): void {
    const playerShips = this.ships.filter(s => s.isAlive && s.team === 'player');
    const enemyShips = this.ships.filter(s => s.isAlive && s.team === 'enemy');

    playerShips.forEach(ship => {
      if (!ship.canAttack(currentTime)) return;
      const target = this.findNearestTarget(ship, enemyShips);
      if (target) {
        this.createAttackEffect(ship, target);
        const killed = ship.attack(target, currentTime);
        if (killed) {
          this.stats.playerKills++;
          this.createExplosion(target.x, target.y, '#ff4a4a');
          this.addLog('player', `${SHIP_NAMES[ship.type]} 击毁了敌方 ${SHIP_NAMES[target.type]}`);
          if (target.fleet) {
            target.fleet.notifyUnderAttack();
          }
        } else if (target.fleet && Math.random() < 0.2) {
          target.fleet.notifyUnderAttack();
        }
      }
    });

    enemyShips.forEach(ship => {
      if (!ship.canAttack(currentTime)) return;
      const target = this.findNearestTarget(ship, playerShips);
      if (target) {
        this.createAttackEffect(ship, target);
        const killed = ship.attack(target, currentTime);
        if (killed) {
          this.stats.enemyKills++;
          this.createExplosion(target.x, target.y, '#4a9eff');
          this.addLog('enemy', `敌方 ${SHIP_NAMES[ship.type]} 击毁了己方 ${SHIP_NAMES[target.type]}`);
          if (target.fleet) {
            target.fleet.notifyUnderAttack();
          }
        } else if (target.fleet && Math.random() < 0.2) {
          target.fleet.notifyUnderAttack();
        }
      }
    });
  }

  private findNearestTarget(ship: Ship, targets: Ship[]): Ship | null {
    let nearest: Ship | null = null;
    let minDist = Infinity;

    targets.forEach(target => {
      const dist = ship.getDistanceTo(target);
      if (dist <= ship.attackRange && dist < minDist) {
        minDist = dist;
        nearest = target;
      }
    });

    return nearest;
  }

  private updateEffects(): void {
    const now = performance.now();
    this.attackEffects = this.attackEffects.filter(effect => {
      return now - effect.startTime < effect.duration;
    });
  }

  private updateParticles(dt: number): void {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= dt;
      return particle.life > 0;
    });
  }

  private updateStats(): void {
    const playerShips = this.ships.filter(s => s.isAlive && s.team === 'player');
    const enemyShips = this.ships.filter(s => s.isAlive && s.team === 'enemy');

    const playerHealth = playerShips.reduce((sum, s) => sum + s.health, 0);
    const enemyHealth = enemyShips.reduce((sum, s) => sum + s.health, 0);

    const playerDPS = playerShips.reduce((sum, s) => sum + s.damage / s.attackSpeed, 0);
    const enemyDPS = enemyShips.reduce((sum, s) => sum + s.damage / s.attackSpeed, 0);

    this.stats.player = {
      totalHealth: playerHealth,
      aliveUnits: playerShips.length,
      dps: playerDPS
    };
    this.stats.enemy = {
      totalHealth: enemyHealth,
      aliveUnits: enemyShips.length,
      dps: enemyDPS
    };

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  private checkGameOver(): void {
    const playerAlive = this.ships.some(s => s.isAlive && s.team === 'player');
    const enemyAlive = this.ships.some(s => s.isAlive && s.team === 'enemy');

    if (!playerAlive || !enemyAlive) {
      this.gameOver = true;
      const winner: Team = playerAlive ? 'player' : 'enemy';
      this.addLog('system', `${winner === 'player' ? '己方' : '敌方'}获胜！`);
      if (this.onGameOver) {
        this.onGameOver(winner);
      }
    }
  }

  private render(currentTime: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.drawImage(this.nebulaCanvas, 0, 0);

    this.stars.forEach(star => {
      const twinkle = Math.sin(currentTime * 0.002 + star.twinkle) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + twinkle * 0.7})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.isDragging) {
      const x = Math.min(this.dragStart.x, this.dragEnd.x);
      const y = Math.min(this.dragStart.y, this.dragEnd.y);
      const w = Math.abs(this.dragEnd.x - this.dragStart.x);
      const h = Math.abs(this.dragEnd.y - this.dragStart.y);

      ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(74, 158, 255, 0.1)';
      ctx.fillRect(x, y, w, h);
    }

    this.fleets.forEach(fleet => fleet.render(ctx, currentTime));
    this.renderAttackEffects(currentTime);
    this.ships.forEach(ship => ship.render(ctx, currentTime));
    this.renderParticles();
  }

  private renderAttackEffects(currentTime: number): void {
    const ctx = this.ctx;

    this.attackEffects.forEach(effect => {
      const progress = (currentTime - effect.startTime) / effect.duration;
      const alpha = 1 - progress;

      if (effect.type === 'laser') {
        const gradient = ctx.createLinearGradient(
          effect.fromX, effect.fromY,
          effect.toX, effect.toY
        );
        const color = effect.team === 'player' ? '74, 158, 255' : '255, 74, 74';
        gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(${color}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.shadowColor = `rgba(${color}, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(effect.fromX, effect.fromY);
        ctx.lineTo(effect.toX, effect.toY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        const x = effect.fromX + (effect.toX - effect.fromX) * progress;
        const y = effect.fromY + (effect.toY - effect.fromY) * progress;
        const color = effect.team === 'player' ? '#4a9eff' : '#ff4a4a';

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    this.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getSelectedCount(): number {
    return this.selectedShips.length;
  }

  restart(): void {
    this.ships = [];
    this.fleets = [];
    this.attackEffects = [];
    this.particles = [];
    this.logs = [];
    this.selectedShips = [];
    this.gameOver = false;
    this.stats = {
      player: { totalHealth: 0, aliveUnits: 0, dps: 0 },
      enemy: { totalHealth: 0, aliveUnits: 0, dps: 0 },
      startTime: Date.now(),
      playerKills: 0,
      enemyKills: 0
    };
    this.initBackground();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getGameOver(): boolean {
    return this.gameOver;
  }
}
