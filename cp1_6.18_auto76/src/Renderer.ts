import { GameEngine } from './GameEngine';
import type { Tower, Enemy, Bullet, Particle } from './EntityManager';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private cellSize: number = 40;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.engine = engine;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);
    this.cellSize = this.engine.getGridCellSize();
  }

  render(): void {
    const ctx = this.ctx;
    const width = this.engine.getCanvasWidth();
    const height = this.engine.getCanvasHeight();

    ctx.clearRect(0, 0, width, height);

    this.drawBackground();
    this.drawGrid();
    this.drawPath();
    this.drawTowers();
    this.drawEnemies();
    this.drawBullets();
    this.drawParticles();

    if (this.engine.getState().isGameOver) {
      this.drawGameOverlay('GAME OVER', 'Press start to begin');
    } else if (this.engine.getState().isPaused) {
      this.drawGameOverlay('PAUSED', '');
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const width = this.engine.getCanvasWidth();
    const height = this.engine.getCanvasHeight();

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const width = this.engine.getCanvasWidth();
    const height = this.engine.getCanvasHeight();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawPath(): void {
    const ctx = this.ctx;
    const path = this.engine.getAISystem().getPath();

    if (path.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = this.cellSize * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawTowers(): void {
    const towers = this.engine.getEntityManager().towers;
    for (const tower of towers.values()) {
      this.drawTower(tower);
    }
  }

  private drawTower(tower: Tower): void {
    const ctx = this.ctx;
    const x = (tower.gridX + 0.5) * this.cellSize;
    const y = (tower.gridY + 0.5) * this.cellSize;
    const size = this.cellSize * 0.35;

    ctx.save();
    ctx.translate(x, y);

    switch (tower.type) {
      case 'arrow':
        this.drawArrowTower(ctx, size, tower.level);
        break;
      case 'cannon':
        this.drawCannonTower(ctx, size, tower.level);
        break;
      case 'frost':
        this.drawFrostTower(ctx, size, tower.level);
        break;
    }

    if (tower.level > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv${tower.level}`, 0, size + 12);
    }

    ctx.restore();
  }

  private drawArrowTower(ctx: CanvasRenderingContext2D, size: number, level: number): void {
    const brightness = 1 + (level - 1) * 0.15;
    ctx.fillStyle = `rgba(100, 180, 255, ${Math.min(brightness, 1)})`;
    ctx.strokeStyle = '#64b4ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.866, size * 0.5);
    ctx.lineTo(-size * 0.866, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCannonTower(ctx: CanvasRenderingContext2D, size: number, level: number): void {
    const brightness = 1 + (level - 1) * 0.15;
    ctx.fillStyle = `rgba(255, 82, 82, ${Math.min(brightness, 1)})`;
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;

    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeRect(-size, -size, size * 2, size * 2);

    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(-size * 0.2, -size * 1.2, size * 0.4, size * 0.6);
  }

  private drawFrostTower(ctx: CanvasRenderingContext2D, size: number, level: number): void {
    const brightness = 1 + (level - 1) * 0.15;
    ctx.strokeStyle = `rgba(0, 229, 255, ${Math.min(brightness, 1)})`;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    const time = Date.now() / 1000;
    const rotation = time * (1 + level * 0.2);
    ctx.save();
    ctx.rotate(rotation);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size * 0.8, Math.sin(angle) * size * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEnemies(): void {
    const enemies = this.engine.getEntityManager().enemies;
    for (const enemy of enemies.values()) {
      this.drawEnemy(enemy);
    }
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const config = this.engine.getEntityManager().getEnemyConfig(enemy.type);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.slowTimer > 0) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(0, 0, config.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    const healthPercent = enemy.health / enemy.maxHealth;
    const barWidth = config.size * 2;
    const barHeight = 4;
    const barY = -config.size - 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    const healthColor = healthPercent > 0.6 ? '#2ecc71' : healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = healthColor;
    ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

    ctx.restore();
  }

  private drawBullets(): void {
    const bullets = this.engine.getEntityManager().bullets;
    for (const bullet of bullets.values()) {
      this.drawBullet(bullet);
    }
  }

  private drawBullet(bullet: Bullet): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(bullet.x, bullet.y);

    switch (bullet.towerType) {
      case 'arrow':
        ctx.fillStyle = '#64b4ff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'cannon':
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'frost':
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  private drawParticles(): void {
    const particles = this.engine.getEntityManager().particles;
    for (const particle of particles.values()) {
      this.drawParticle(particle);
    }
  }

  private drawParticle(particle: Particle): void {
    const ctx = this.ctx;
    const alpha = particle.life / particle.maxLife;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGameOverlay(title: string, subtitle: string): void {
    const ctx = this.ctx;
    const width = this.engine.getCanvasWidth();
    const height = this.engine.getCanvasHeight();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, width / 2, height / 2 - 30);

    if (subtitle) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '20px Consolas, monospace';
      ctx.fillText(subtitle, width / 2, height / 2 + 20);
    }
  }
}
