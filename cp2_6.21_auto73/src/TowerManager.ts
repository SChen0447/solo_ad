import { Tower, Bullet, Unit, COLORS, CELL_SIZE } from './types';

/**
 * TowerManager - 炮塔管理模块
 * 
 * 职责：
 *  - 管理炮塔的放置、升级、出售（含淡出动画）
 *  - 每帧检查炮塔射程内的敌方单位，锁定最近目标
 *  - 按冷却时间发射子弹，追踪并命中目标
 *  - 维护选中炮塔状态和射程范围显示
 *  - 渲染炮塔（含升级金色外框）、射程圈、子弹
 * 
 * 关键参数：
 *  - 炮塔基础射程：3格（升级后4格）
 *  - 基础伤害：20点（升级后35点）
 *  - 射速：每1.2秒一发
 *  - 子弹速度：300px/秒
 *  - 碰撞检测：子弹半径3px + 单位半径12px = 15px命中阈值
 * 
 * 数据流向：
 *  - 输入：单位位置列表 <- GameEngine（来自UnitManager）
 *        : 放置/选中/升级/出售指令 <- GameEngine（来自UI事件）
 *  - 输出：命中结果列表 -> GameEngine（转发给UnitManager造成伤害）
 *        : 炮塔移除事件 -> GameEngine（释放格子占用）
 *        : 选中炮塔信息 -> GameEngine（驱动UI面板显示）
 *        : 渲染数据 -> GameEngine.render()
 * 
 * 调用者：GameEngine（update/render/placeTower/upgrade等）
 * 被调用：findTarget <- updateTower(); fireBullet <- updateTower()
 */
export class TowerManager {
  private static readonly BULLET_RADIUS = 3;
  private static readonly UNIT_RADIUS = 12;
  private towers: Tower[] = [];
  private bullets: Bullet[] = [];
  private nextTowerId: number = 0;
  private nextBulletId: number = 0;
  private selectedTower: Tower | null = null;
  private onTowerRemoved: ((tower: Tower) => void) | null = null;

  public setOnTowerRemoved(callback: (tower: Tower) => void): void {
    this.onTowerRemoved = callback;
  }

  public getTowers(): Tower[] {
    return this.towers.filter(t => !t.isRemoving);
  }

  public getBullets(): Bullet[] {
    return this.bullets;
  }

  public getSelectedTower(): Tower | null {
    return this.selectedTower;
  }

  public placeTower(gridX: number, gridY: number, worldX: number, worldY: number): Tower | null {
    if (this.getTowerAt(gridX, gridY)) return null;

    const tower: Tower = {
      id: this.nextTowerId++,
      gridX,
      gridY,
      x: worldX,
      y: worldY,
      range: 3 * CELL_SIZE,
      damage: 20,
      fireRate: 1.2,
      lastFireTime: 0,
      level: 1,
      isSelected: false,
      fadeOutTime: 0,
      isRemoving: false
    };

    this.towers.push(tower);
    return tower;
  }

  public getTowerAt(gridX: number, gridY: number): Tower | undefined {
    return this.towers.find(t => t.gridX === gridX && t.gridY === gridY && !t.isRemoving);
  }

  public selectTower(tower: Tower | null): void {
    if (this.selectedTower) {
      this.selectedTower.isSelected = false;
    }
    this.selectedTower = tower;
    if (tower) {
      tower.isSelected = true;
    }
  }

  public upgradeTower(tower: Tower): boolean {
    if (tower.level >= 2) return false;

    tower.level = 2;
    tower.damage = 35;
    tower.range = 4 * CELL_SIZE;
    return true;
  }

  public sellTower(tower: Tower): void {
    tower.isRemoving = true;
    tower.fadeOutTime = 0.3;
    tower.isSelected = false;

    if (this.selectedTower === tower) {
      this.selectedTower = null;
    }
  }

  public update(deltaTime: number, units: Unit[], currentTime: number): { hitUnitIds: number[]; damage: number }[] {
    const hits: { hitUnitIds: number[]; damage: number }[] = [];

    for (const tower of this.towers) {
      if (tower.isRemoving) continue;
      this.updateTower(tower, units, currentTime, hits);
    }

    this.updateBullets(deltaTime, units, hits);

    for (const tower of this.towers) {
      if (tower.isRemoving) {
        tower.fadeOutTime -= deltaTime;
        if (tower.fadeOutTime <= 0) {
          if (this.onTowerRemoved) {
            this.onTowerRemoved(tower);
          }
        }
      }
    }

    this.towers = this.towers.filter(t => !t.isRemoving || t.fadeOutTime > 0);

    return hits;
  }

  private updateTower(
    tower: Tower,
    units: Unit[],
    currentTime: number,
    _hits: { hitUnitIds: number[]; damage: number }[]
  ): void {
    if (currentTime - tower.lastFireTime < tower.fireRate) return;

    const target = this.findTarget(tower, units);
    if (!target) return;

    this.fireBullet(tower, target);
    tower.lastFireTime = currentTime;
  }

  private findTarget(tower: Tower, units: Unit[]): Unit | null {
    let closest: Unit | null = null;
    let closestDistance = Infinity;

    for (const unit of units) {
      if (unit.isDead || unit.reachedEnd) continue;

      const dx = unit.x - tower.x;
      const dy = unit.y - tower.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= tower.range && distance < closestDistance) {
        closest = unit;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private fireBullet(tower: Tower, target: Unit): void {
    const bullet: Bullet = {
      id: this.nextBulletId++,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      speed: 300,
      damage: tower.damage
    };
    this.bullets.push(bullet);
  }

  private updateBullets(
    deltaTime: number,
    units: Unit[],
    hits: { hitUnitIds: number[]; damage: number }[]
  ): void {
    const bulletsToRemove: number[] = [];

    for (const bullet of this.bullets) {
      const target = units.find(u => u.id === bullet.targetId);

      if (!target || target.isDead || target.reachedEnd) {
        bulletsToRemove.push(bullet.id);
        continue;
      }

      const dx = target.x - bullet.x;
      const dy = target.y - bullet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const hitThreshold = TowerManager.BULLET_RADIUS + TowerManager.UNIT_RADIUS;

      if (distance < hitThreshold) {
        hits.push({ hitUnitIds: [target.id], damage: bullet.damage });
        bulletsToRemove.push(bullet.id);
        continue;
      }

      const moveDistance = bullet.speed * deltaTime;
      bullet.x += (dx / distance) * moveDistance;
      bullet.y += (dy / distance) * moveDistance;
    }

    this.bullets = this.bullets.filter(b => !bulletsToRemove.includes(b.id));
  }

  public render(ctx: CanvasRenderingContext2D, showRanges: boolean = false): void {
    for (const tower of this.towers) {
      if (tower.isSelected || showRanges) {
        this.renderRange(ctx, tower);
      }
    }

    for (const tower of this.towers) {
      this.renderTower(ctx, tower);
    }

    for (const bullet of this.bullets) {
      this.renderBullet(ctx, bullet);
    }
  }

  private renderRange(ctx: CanvasRenderingContext2D, tower: Tower): void {
    ctx.fillStyle = tower.isSelected ? COLORS.towerRangeSelected : COLORS.towerRange;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.towerRangeSelected;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderTower(ctx: CanvasRenderingContext2D, tower: Tower): void {
    const radius = 18;

    if (tower.isRemoving) {
      const alpha = tower.fadeOutTime / 0.3;
      ctx.globalAlpha = alpha;
    }

    const outerColor = tower.level >= 2 ? COLORS.towerUpgraded : COLORS.towerOuter;
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(tower.x - 4, tower.y - 4, 0, tower.x, tower.y, radius);
    gradient.addColorStop(0, '#93C5FD');
    gradient.addColorStop(1, COLORS.towerInner);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, radius - 3, 0, Math.PI * 2);
    ctx.fill();

    if (tower.level >= 2) {
      ctx.fillStyle = COLORS.towerUpgraded;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', tower.x, tower.y);
    }

    ctx.globalAlpha = 1;
  }

  private renderBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, TowerManager.BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  public clear(): void {
    this.towers = [];
    this.bullets = [];
    this.selectedTower = null;
    this.nextTowerId = 0;
    this.nextBulletId = 0;
  }
}
