import { Point, TOWER_CONFIGS, TowerType } from './config';
import { Enemy, Particle } from './units/Enemy';
import { Tower, TowerSlot, Projectile } from './units/Tower';
import { UIManager } from './ui/UIManager';
import { WaveManager } from './map/WaveManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private path: Point[];
  private towerSlots: TowerSlot[];
  private towers: Tower[];
  private projectiles: Projectile[];
  private particles: Particle[];
  private enemies: Enemy[];

  private waveManager: WaveManager;
  public uiManager: UIManager;

  private lastTime: number;
  private running: boolean;
  private waveCooldown: number;
  private gameOver: boolean;

  private audioCtx: AudioContext | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    this.path = this.generatePath();
    this.towerSlots = this.generateTowerSlots();
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.enemies = [];

    this.waveManager = new WaveManager(this.path);
    this.uiManager = new UIManager(this.width, this.height);

    this.lastTime = performance.now();
    this.running = false;
    this.waveCooldown = 3000;
    this.gameOver = false;

    this.audioCtx = null;

    this.bindEvents();
    this.startFirstWave();
  }

  private generatePath(): Point[] {
    const h = this.height;
    return [
      { x: this.width + 40, y: h * 0.55 },
      { x: this.width * 0.82, y: h * 0.55 },
      { x: this.width * 0.72, y: h * 0.42 },
      { x: this.width * 0.58, y: h * 0.42 },
      { x: this.width * 0.48, y: h * 0.58 },
      { x: this.width * 0.34, y: h * 0.58 },
      { x: this.width * 0.24, y: h * 0.5 },
      { x: this.width * 0.12, y: h * 0.5 }
    ];
  }

  private generateTowerSlots(): TowerSlot[] {
    const h = this.height;
    return [
      { x: this.width * 0.28, y: h * 0.3, tower: null },
      { x: this.width * 0.42, y: h * 0.28, tower: null },
      { x: this.width * 0.58, y: h * 0.26, tower: null }
    ];
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getCanvasCoords(e);
      this.uiManager.handleMouseMove(x, y, this.towers, this.towerSlots);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.gameOver) return;
      const { x, y } = this.getCanvasCoords(e);
      this.uiManager.handleMouseDown(x, y, this.towers, this.towerSlots);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (this.gameOver) return;
      const { x, y } = this.getCanvasCoords(e);
      const result = this.uiManager.handleMouseUp(x, y);
      if (result) {
        this.handleUIAction(result);
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.gameOver || e.touches.length === 0) return;
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoords(touch);
      this.uiManager.handleMouseDown(x, y, this.towers, this.towerSlots);
      this.uiManager.handleMouseMove(x, y, this.towers, this.towerSlots);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoords(touch);
      this.uiManager.handleMouseMove(x, y, this.towers, this.towerSlots);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.gameOver) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const { x, y } = this.getCanvasCoords(touch);
      const result = this.uiManager.handleMouseUp(x, y);
      if (result) {
        this.handleUIAction(result);
      }
    }, { passive: false });

    window.addEventListener('resize', () => this.resize());
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleUIAction(result: { action: string; data?: any }): void {
    if (result.action === 'buyTower' && result.data) {
      const { type, slot } = result.data as { type: TowerType; slot: TowerSlot };
      this.buyTower(type, slot);
    } else if (result.action === 'upgradeTower' && result.data) {
      this.upgradeTower(result.data as Tower);
    }
  }

  private buyTower(type: TowerType, slot: TowerSlot): void {
    const config = TOWER_CONFIGS[type];
    if (this.uiManager.gold < config.cost) {
      this.uiManager.addToast('金币不足！', '#EF4444');
      this.playSound('error');
      return;
    }
    if (slot.tower) return;

    this.uiManager.gold -= config.cost;
    const tower = new Tower(slot.x, slot.y, type);
    slot.tower = tower;
    this.towers.push(tower);
    this.uiManager.showShop = false;
    this.uiManager.shopSlot = null;
    this.uiManager.markTowerNewlyAcquired(type);
    this.uiManager.addToast(`部署${type === 'archer' ? '弓箭手' : type === 'catapult' ? '投石机' : '魔法塔'}！`, '#FFD700');
    this.playSound('buy');
  }

  private upgradeTower(tower: Tower): void {
    if (tower.level >= tower.maxLevel) {
      this.uiManager.addToast('已达到最高等级！', '#EAB308');
      return;
    }
    const cost = tower.getUpgradeCost();
    if (this.uiManager.gold < cost) {
      this.uiManager.addToast('金币不足！', '#EF4444');
      this.playSound('error');
      return;
    }

    this.uiManager.gold -= cost;
    tower.upgrade();
    this.uiManager.addToast(`升级成功！攻击力 ${tower.damage}`, '#22C55E');
    this.playSound('upgrade');
  }

  private startFirstWave(): void {
    this.uiManager.wave = 1;
    this.waveManager.generateWave(1);
    this.uiManager.setWaveAnnouncement(this.waveManager.waveAnnouncement);
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const aspect = 16 / 9;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }

    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w * (window.devicePixelRatio || 1));
    this.canvas.height = Math.floor(h * (window.devicePixelRatio || 1));
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(w);
    this.canvas.height = Math.floor(h);
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.path = this.generatePath();
    this.towerSlots = this.generateTowerSlots();
    this.uiManager.resize(this.width, this.height);

    for (let i = 0; i < this.towerSlots.length; i++) {
      if (this.towers[i]) {
        this.towers[i].x = this.towerSlots[i].x;
        this.towers[i].y = this.towerSlots[i].y;
        this.towerSlots[i].tower = this.towers[i];
      }
    }

    this.waveManager = new WaveManager(this.path);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    this.running = false;
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    if (this.gameOver) {
      this.uiManager.update(dt);
      return;
    }

    this.uiManager.update(dt);

    const newEnemies = this.waveManager.update(dt);
    for (const e of newEnemies) {
      this.enemies.push(e);
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.path);
    }

    const currentTime = performance.now();
    for (const tower of this.towers) {
      const proj = tower.update(dt, this.enemies, currentTime);
      if (proj) {
        this.projectiles.push(proj);
        this.playSound('shoot');
      }
    }

    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.checkEnemyReachWall();
    this.removeDeadEnemies();

    if (this.waveManager.isWaveComplete()) {
      this.waveManager.waveInProgress = false;
      this.waveCooldown = 10000;
      this.uiManager.wallHP = Math.min(this.uiManager.wallMaxHP, this.uiManager.wallHP + 15);
    }

    if (!this.waveManager.waveInProgress && this.waveCooldown > 0) {
      this.waveCooldown -= dt;
      if (this.waveCooldown <= 0) {
        const nextWave = this.waveManager.currentWave + 1;
        this.uiManager.wave = nextWave;
        this.waveManager.generateWave(nextWave);
        this.uiManager.setWaveAnnouncement(this.waveManager.waveAnnouncement);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const proj of this.projectiles) {
      if (proj.dead) continue;

      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > 8) proj.trail.shift();

      if (proj.targetEnemy && !proj.targetEnemy.dead && !proj.targetEnemy.reachedWall) {
        proj.targetX = proj.targetEnemy.x;
        proj.targetY = proj.targetEnemy.y;
      }

      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = proj.speed * (dt / 16.67);

      if (dist < moveSpeed) {
        this.projectileHit(proj);
        proj.dead = true;
      } else {
        proj.x += (dx / dist) * moveSpeed;
        proj.y += (dy / dist) * moveSpeed;
      }
    }

    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  private projectileHit(proj: Projectile): void {
    if (proj.splash) {
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.reachedWall) continue;
        const dx = enemy.x - proj.targetX;
        const dy = enemy.y - proj.targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= proj.splash) {
          const dmgMult = 1 - (dist / proj.splash) * 0.5;
          if (enemy.takeDamage(proj.damage * dmgMult)) {
            this.onEnemyKilled(enemy);
          } else {
            this.particles.push(...enemy.createHitParticles());
          }
          if (proj.slow && proj.slowDuration) {
            enemy.applySlow(proj.slow, proj.slowDuration);
          }
        }
      }
      this.createExplosion(proj.targetX, proj.targetY, '#FF8C00', proj.splash);
      this.playSound('explosion');
    } else if (proj.targetEnemy && !proj.targetEnemy.dead) {
      if (proj.targetEnemy.takeDamage(proj.damage)) {
        this.onEnemyKilled(proj.targetEnemy);
      } else {
        this.particles.push(...proj.targetEnemy.createHitParticles());
      }
      if (proj.slow && proj.slowDuration) {
        proj.targetEnemy.applySlow(proj.slow, proj.slowDuration);
      }
      const color = proj.type === 'magic' ? '#9932CC' : proj.type === 'catapult' ? '#8B4513' : '#228B22';
      this.createExplosion(proj.targetX, proj.targetY, color, 20);
      this.playSound('hit');
    }
  }

  private createExplosion(x: number, y: number, color: string, radius: number): void {
    const count = Math.min(15, Math.floor(radius / 3));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1 + Math.random() * (radius / 20);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300 + Math.random() * 300,
        maxLife: 600,
        color,
        size: 2 + Math.random() * 4
      });
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.uiManager.gold += enemy.reward;
    this.particles.push(...enemy.createDeathParticles());
    this.playSound('kill');
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.vy += 0.08 * (dt / 16.67);
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private checkEnemyReachWall(): void {
    for (const enemy of this.enemies) {
      if (enemy.reachedWall && !enemy.dead) {
        this.uiManager.wallHP -= enemy.damage;
        enemy.dead = true;
        if (enemy.type === 'siege') {
          this.uiManager.addScreenShake(15);
        } else {
          this.uiManager.addScreenShake(5);
        }
        this.playSound('wallhit');
        if (this.uiManager.wallHP <= 0) {
          this.uiManager.wallHP = 0;
          this.gameOver = true;
        }
      }
    }
  }

  private removeDeadEnemies(): void {
    this.enemies = this.enemies.filter(e => !e.dead && !e.reachedWall);
    this.waveManager.clearDeadEnemies();
  }

  private playSound(type: string): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'shoot':
          osc.frequency.value = 800;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
          break;
        case 'hit':
          osc.frequency.value = 300;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
          break;
        case 'explosion':
          osc.frequency.value = 120;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
          break;
        case 'kill':
          osc.frequency.value = 600;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          break;
        case 'buy':
        case 'upgrade':
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'error':
          osc.frequency.value = 200;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'wallhit':
          osc.frequency.value = 80;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
      }
    } catch {
      // ignore audio errors
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawPath();
    this.drawWall();
    this.drawTowerSlots();

    for (const tower of this.towers) {
      tower.draw(
        this.ctx,
        this.uiManager.hoveredTower === tower,
        this.uiManager.selectedTower === tower || this.uiManager.upgradePanelTower === tower
      );
    }

    const sortedEnemies = [...this.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of sortedEnemies) {
      enemy.draw(this.ctx);
    }

    this.drawProjectiles();
    this.drawParticles();
    this.uiManager.draw(this.ctx);

    if (this.gameOver) {
      this.drawGameOver();
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#D2B48C');
    gradient.addColorStop(0.5, '#C4A77D');
    gradient.addColorStop(1, '#B8956E');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(139, 90, 43, 0.08)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.width;
      const y = (i * 89.3) % this.height;
      const r = 15 + (i % 5) * 8;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#A0826D';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height * 0.65);
    this.ctx.quadraticCurveTo(this.width * 0.15, this.height * 0.55, this.width * 0.3, this.height * 0.62);
    this.ctx.quadraticCurveTo(this.width * 0.5, this.height * 0.7, this.width * 0.7, this.height * 0.6);
    this.ctx.quadraticCurveTo(this.width * 0.85, this.height * 0.52, this.width, this.height * 0.58);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawPath(): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#8B7355';
    this.ctx.lineWidth = 40;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      this.ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = '#6B5344';
    this.ctx.lineWidth = 44;
    this.ctx.globalCompositeOperation = 'destination-over';
    this.ctx.stroke();
    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.fillStyle = 'rgba(107, 83, 68, 0.5)';
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const count = Math.floor(dist / 30);
      for (let j = 0; j < count; j++) {
        const t = j / count;
        const x = p1.x + (p2.x - p1.x) * t + (Math.sin(j * 1.7) * 8);
        const y = p1.y + (p2.y - p1.y) * t + (Math.cos(j * 2.3) * 6);
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2 + Math.random() * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  }

  private drawWall(): void {
    const wallX = this.width * 0.05;
    const wallTop = this.height * 0.3;
    const wallBottom = this.height * 0.72;
    const wallW = 45;

    this.ctx.save();

    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(wallX, wallTop, wallW, wallBottom - wallTop);

    this.ctx.strokeStyle = '#6B5344';
    this.ctx.lineWidth = 1;
    const brickH = 18;
    const brickW = 22;
    for (let y = wallTop; y < wallBottom; y += brickH) {
      const offset = ((y - wallTop) / brickH) % 2 === 0 ? 0 : brickW / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(wallX, y);
      this.ctx.lineTo(wallX + wallW, y);
      this.ctx.stroke();
      for (let x = wallX + offset; x < wallX + wallW; x += brickW) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + brickH);
        this.ctx.stroke();
      }
    }

    this.ctx.fillStyle = '#6B5344';
    const battlementsCount = 5;
    const bw = wallW / battlementsCount;
    for (let i = 0; i < battlementsCount; i++) {
      if (i % 2 === 0) {
        this.ctx.fillRect(wallX + i * bw, wallTop - 12, bw, 12);
      }
    }

    const damagePercent = 1 - (this.uiManager.wallHP / this.uiManager.wallMaxHP);
    if (damagePercent > 0.1) {
      this.ctx.strokeStyle = `rgba(60, 30, 15, ${damagePercent * 0.8})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(wallX + wallW * 0.3, wallTop + 30);
      this.ctx.lineTo(wallX + wallW * 0.6, wallTop + 80);
      this.ctx.lineTo(wallX + wallW * 0.4, wallTop + 130);
      this.ctx.lineTo(wallX + wallW * 0.7, wallTop + 180);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawTowerSlots(): void {
    for (const slot of this.towerSlots) {
      if (slot.tower) continue;

      this.ctx.save();
      const pulse = Math.sin(Date.now() / 500) * 0.2 + 0.5;
      this.ctx.globalAlpha = pulse;
      this.ctx.strokeStyle = '#DEB887';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([6, 4]);
      this.ctx.beginPath();
      this.ctx.arc(slot.x, slot.y, 30, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = 'rgba(222, 184, 135, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(slot.x, slot.y, 28, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#DEB887';
      this.ctx.font = 'bold 24px Georgia';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('+', slot.x, slot.y);
      this.ctx.restore();
    }
  }

  private drawProjectiles(): void {
    for (const proj of this.projectiles) {
      if (proj.trail.length > 1) {
        this.ctx.save();
        for (let i = 0; i < proj.trail.length - 1; i++) {
          const alpha = i / proj.trail.length;
          this.ctx.strokeStyle = this.getProjectileColor(proj, alpha * 0.6);
          this.ctx.lineWidth = (i / proj.trail.length) * 5;
          this.ctx.beginPath();
          this.ctx.moveTo(proj.trail[i].x, proj.trail[i].y);
          this.ctx.lineTo(proj.trail[i + 1].x, proj.trail[i + 1].y);
          this.ctx.stroke();
        }
        this.ctx.restore();
      }

      this.ctx.save();
      const color = this.getProjectileColor(proj, 1);
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;

      if (proj.type === 'archer') {
        const angle = Math.atan2(proj.targetY - proj.y, proj.targetX - proj.x);
        this.ctx.translate(proj.x, proj.y);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#5C4033';
        this.ctx.fillRect(-10, -1, 16, 2);
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.beginPath();
        this.ctx.moveTo(8, 0);
        this.ctx.lineTo(4, -3);
        this.ctx.lineTo(4, 3);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (proj.type === 'catapult') {
        this.ctx.beginPath();
        this.ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.arc(proj.x, proj.y, 7, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(proj.x - 2, proj.y - 2, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private getProjectileColor(proj: Projectile, alpha: number): string {
    const colors: Record<TowerType, [number, number, number]> = {
      archer: [139, 69, 19],
      catapult: [139, 90, 43],
      magic: [153, 50, 204]
    };
    const [r, g, b] = colors[proj.type];
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawGameOver(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#8B0000';
    this.ctx.font = `bold ${64 * this.uiManager.scale}px Georgia`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('城 池 陷 落', this.width / 2, this.height / 2 - 60);

    this.ctx.fillStyle = '#DEB887';
    this.ctx.font = `${28 * this.uiManager.scale}px Georgia`;
    this.ctx.fillText(`你坚守了 ${this.waveManager.currentWave} 波进攻`, this.width / 2, this.height / 2 + 10);
    this.ctx.fillText(`最终金币: ${this.uiManager.gold}`, this.width / 2, this.height / 2 + 50);

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `${20 * this.uiManager.scale}px Georgia`;
    this.ctx.fillText('刷新页面重新开始', this.width / 2, this.height / 2 + 110);
    this.ctx.restore();
  }
}
