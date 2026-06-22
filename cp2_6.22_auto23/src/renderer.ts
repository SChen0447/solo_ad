import { Grid, TileType } from './map';
import {
  EntityManager,
  Tower,
  TowerType,
  Monster,
  Projectile,
  ProjectileType,
  TOWER_CONFIGS
} from './entity';

const COLORS = {
  grass: '#2D5A27',
  path: '#C4A882',
  resource: '#FFD700',
  resourceDepleted: '#6B7280',
  base: '#8B4513',
  gridLine: 'rgba(0,0,0,0.1)',
  border: '#3E2723'
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particleTime: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.particleTime = 0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  render(grid: Grid, entityManager: EntityManager, deltaTime: number): void {
    this.clear();
    this.particleTime += deltaTime;

    this.renderMap(grid);
    this.renderTowers(entityManager.towers);
    this.renderMonsters(entityManager.monsters);
    this.renderProjectiles(entityManager.projectiles);
    this.renderMagicParticles(entityManager.towers);
  }

  private renderMap(grid: Grid): void {
    const tileSize = grid.tileSize;

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const tile = grid.tiles[row][col];
        const x = col * tileSize;
        const y = row * tileSize;

        this.ctx.fillStyle = COLORS.grass;
        this.ctx.fillRect(x, y, tileSize, tileSize);

        if (tile.type === TileType.PATH) {
          this.ctx.fillStyle = COLORS.path;
          this.ctx.fillRect(x, y, tileSize, tileSize);
          this.ctx.strokeStyle = 'rgba(139, 119, 80, 0.3)';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
        }

        if (tile.type === TileType.RESOURCE) {
          this.renderResourceTile(x, y, tileSize, tile);
        }

        if (tile.type === TileType.BASE) {
          this.renderBaseTile(x, y, tileSize);
        }
      }
    }

    this.ctx.strokeStyle = COLORS.gridLine;
    this.ctx.lineWidth = 0.5;
    for (let col = 0; col <= grid.cols; col++) {
      this.ctx.beginPath();
      this.ctx.moveTo(col * tileSize, 0);
      this.ctx.lineTo(col * tileSize, grid.rows * tileSize);
      this.ctx.stroke();
    }
    for (let row = 0; row <= grid.rows; row++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, row * tileSize);
      this.ctx.lineTo(grid.cols * tileSize, row * tileSize);
      this.ctx.stroke();
    }
  }

  private renderResourceTile(
    x: number,
    y: number,
    tileSize: number,
    tile: any
  ): void {
    const centerX = x + tileSize / 2;
    const centerY = y + tileSize / 2;
    const isDepleted = tile.resourceDepleted;

    let scale = 1;
    if (!isDepleted && tile.pulsePhase !== undefined) {
      scale = 1 + Math.sin(tile.pulsePhase) * 0.1;
    }

    const size = (tileSize * 0.6 * scale) / 2;
    const yOffset = isDepleted ? 15 : 0;

    this.ctx.save();
    this.ctx.translate(centerX, centerY + yOffset / 2);

    this.ctx.fillStyle = isDepleted ? COLORS.resourceDepleted : COLORS.resource;

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    if (!isDepleted) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.25, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderBaseTile(x: number, y: number, tileSize: number): void {
    this.ctx.fillStyle = COLORS.path;
    this.ctx.fillRect(x, y, tileSize, tileSize);

    this.ctx.fillStyle = '#5D4037';
    this.ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

    this.ctx.fillStyle = '#8D6E63';
    this.ctx.fillRect(x + 8, y + 6, tileSize - 16, tileSize - 14);

    this.ctx.fillStyle = '#3E2723';
    this.ctx.fillRect(x + tileSize / 2 - 4, y + tileSize / 2, 8, tileSize / 2 - 4);

    this.ctx.fillStyle = '#D97706';
    this.ctx.fillRect(x + tileSize / 2 - 2, y + 4, 4, 14);

    this.ctx.beginPath();
    this.ctx.moveTo(x + tileSize / 2 + 2, y + 4);
    this.ctx.lineTo(x + tileSize / 2 + 12, y + 8);
    this.ctx.lineTo(x + tileSize / 2 + 2, y + 12);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderTowers(towers: Tower[]): void {
    for (const tower of towers) {
      this.renderTower(tower);
    }
  }

  private renderTower(tower: Tower): void {
    const ctx = this.ctx;
    const config = tower.getConfig();
    const baseConfig = tower.getBaseConfig();

    let recoilOffset = 0;
    if (tower.recoilTime > 0) {
      recoilOffset = (tower.recoilTime / 100) * 3;
    }

    let flashAlpha = 0;
    if (tower.flashTime > 0) {
      flashAlpha = tower.flashTime / 100;
    }

    let upgradeFlash = 0;
    if (tower.upgradeFlashTime > 0) {
      upgradeFlash = Math.sin((tower.upgradeFlashTime / 500) * Math.PI * 10) * 0.5 + 0.5;
    }

    ctx.save();
    ctx.translate(tower.x, tower.y + recoilOffset);

    const baseSize = 18;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(-baseSize, baseSize - 4, baseSize * 2, 8);

    let towerHeight = 24;
    let towerWidth = 16;

    if (tower.type === TowerType.ARROW) {
      towerHeight = 24 + tower.level * 10;
      towerWidth = 14;
    } else if (tower.type === TowerType.CANNON) {
      towerWidth = 16 + tower.level * 5;
      towerHeight = 22;
    } else if (tower.type === TowerType.MAGIC) {
      towerHeight = 26 + tower.level * 6;
      towerWidth = 14;
    } else if (tower.type === TowerType.COLLECTOR) {
      towerHeight = 20 + tower.level * 4;
      towerWidth = 18;
    }

    const gradient = ctx.createLinearGradient(-towerWidth, 0, towerWidth, 0);
    gradient.addColorStop(0, baseConfig.color);
    gradient.addColorStop(0.5, this.lightenColor(baseConfig.color, 20));
    gradient.addColorStop(1, baseConfig.color);

    ctx.fillStyle = gradient;
    ctx.fillRect(-towerWidth, -towerHeight, towerWidth * 2, towerHeight + baseSize - 4);

    if (tower.type === TowerType.ARROW && tower.level >= 1) {
      ctx.fillStyle = baseConfig.color;
      ctx.beginPath();
      ctx.moveTo(0, -towerHeight - 10);
      ctx.lineTo(-towerWidth * 0.7, -towerHeight);
      ctx.lineTo(towerWidth * 0.7, -towerHeight);
      ctx.closePath();
      ctx.fill();
    }

    if (tower.type === TowerType.CANNON && tower.level >= 1) {
      ctx.fillStyle = '#B87333';
      ctx.fillRect(-6, -towerHeight + 4, 12, 8);

      const shineGradient = ctx.createLinearGradient(-6, -towerHeight + 4, 6, -towerHeight + 4);
      shineGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
      shineGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.8)');
      shineGradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
      ctx.fillStyle = shineGradient;
      ctx.fillRect(-4, -towerHeight + 5, 8, 2);
    }

    if (tower.type === TowerType.COLLECTOR) {
      ctx.fillStyle = '#DAA520';
      ctx.beginPath();
      ctx.arc(0, -towerHeight + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
      ctx.fillRect(-towerWidth, -towerHeight, towerWidth * 2, towerHeight + baseSize - 4);
    }

    if (upgradeFlash > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${upgradeFlash * 0.6})`;
      ctx.fillRect(-towerWidth - 2, -towerHeight - 2, towerWidth * 2 + 4, towerHeight + baseSize);
    }

    if (tower.level > 0) {
      ctx.fillStyle = '#FFD700';
      for (let i = 0; i < tower.level; i++) {
        ctx.beginPath();
        ctx.arc(-8 + i * 8, baseSize - 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private renderMagicParticles(towers: Tower[]): void {
    for (const tower of towers) {
      if (tower.type !== TowerType.MAGIC) continue;

      const particleRadius = 40;
      const particles = 6 + tower.level * 2;
      const rotationSpeed = 2 * Math.PI / 1000;
      const angleOffset = (this.particleTime * rotationSpeed) % (Math.PI * 2);

      for (let i = 0; i < particles; i++) {
        const angle = (i / particles) * Math.PI * 2 + angleOffset;
        const px = tower.x + Math.cos(angle) * particleRadius;
        const py = tower.y - 15 + Math.sin(angle) * (particleRadius * 0.6);

        this.ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + Math.sin(this.particleTime / 200 + i) * 0.2})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 3 + tower.level, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private renderMonsters(monsters: Monster[]): void {
    for (const monster of monsters) {
      this.renderMonster(monster);
    }
  }

  private renderMonster(monster: Monster): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(monster.x, monster.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, monster.radius * 0.8, monster.radius * 0.8, monster.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createRadialGradient(
      -monster.radius * 0.3,
      -monster.radius * 0.3,
      0,
      0,
      0,
      monster.radius
    );
    bodyGradient.addColorStop(0, '#8B0000');
    bodyGradient.addColorStop(0.7, '#5C0000');
    bodyGradient.addColorStop(1, '#3C0000');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, monster.radius, 0, Math.PI * 2);
    ctx.fill();

    if (monster.slowAmount > 0) {
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, monster.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(-5, -3, 4, 0, Math.PI * 2);
    ctx.arc(5, -3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4, -2, 2, 0, Math.PI * 2);
    ctx.arc(6, -2, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const healthBarWidth = 30;
    const healthBarHeight = 4;
    const healthBarY = monster.y - monster.radius - 10;

    ctx.fillStyle = '#D1D5DB';
    ctx.fillRect(
      monster.x - healthBarWidth / 2,
      healthBarY,
      healthBarWidth,
      healthBarHeight
    );

    const healthPercent = monster.health / monster.maxHealth;
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(
      monster.x - healthBarWidth / 2,
      healthBarY,
      healthBarWidth * healthPercent,
      healthBarHeight
    );
  }

  private renderProjectiles(projectiles: Projectile[]): void {
    for (const projectile of projectiles) {
      this.renderProjectile(projectile);
    }
  }

  private renderProjectile(projectile: Projectile): void {
    const ctx = this.ctx;
    const y = projectile.getY();

    if (projectile.type === ProjectileType.ARROW) {
      const dx = projectile.targetX - projectile.x;
      const dy = projectile.targetY - projectile.y;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(projectile.x, y);
      ctx.rotate(angle);

      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    } else if (projectile.type === ProjectileType.CANNON) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(projectile.x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(projectile.x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (projectile.type === ProjectileType.MAGIC) {
      const gradient = ctx.createRadialGradient(
        projectile.x, y, 0,
        projectile.x, y, 8
      );
      gradient.addColorStop(0, '#E9D5FF');
      gradient.addColorStop(0.3, '#A855F7');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(projectile.x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(projectile.x - 2, y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  drawTowerRange(x: number, y: number, range: number, color: string = 'rgba(255, 255, 255, 0.2)'): void {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, range, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }
}
