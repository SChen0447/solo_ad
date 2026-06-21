import { Unit, Point, COLORS } from './types';

/**
 * UnitManager - 敌方单位管理模块
 * 
 * 职责：
 *  - 管理敌方单位的生成、生命周期和移除
 *  - 控制单位沿PathManager提供的路径点序列移动
 *  - 维护单位生命值、受击闪烁状态、死亡状态
 *  - 渲染单位本体、生命值条
 *  - 触发单位到达终点和单位死亡的回调
 * 
 * 数据流向：
 *  - 输入：路径点队列 <- PathManager.getPathWorldPoints()
 *        : 伤害指令 <- GameEngine（来自TowerManager命中结果）
 *  - 输出：单位位置列表 -> TowerManager（炮塔锁定目标）
 *        : 到达终点事件 -> GameEngine（扣除生命值）
 *        : 单位死亡事件 -> GameEngine（加分、粒子效果）
 *        : 渲染数据 -> GameEngine.render()
 * 
 * 调用者：GameEngine（update/render/spawnWave/damageUnit）
 * 被调用：setPath <- GameEngine.init(); spawnUnit <- setTimeout队列
 */
export class UnitManager {
  private units: Unit[] = [];
  private pathPoints: Point[] = [];
  private nextUnitId: number = 0;
  private onUnitReachedEnd: ((unit: Unit) => void) | null = null;
  private onUnitKilled: ((unit: Unit) => void) | null = null;
  private onUnitSpawned: (() => void) | null = null;

  public setPath(pathPoints: Point[]): void {
    this.pathPoints = pathPoints;
  }

  public setOnUnitReachedEnd(callback: (unit: Unit) => void): void {
    this.onUnitReachedEnd = callback;
  }

  public setOnUnitKilled(callback: (unit: Unit) => void): void {
    this.onUnitKilled = callback;
  }

  public setOnUnitSpawned(callback: () => void): void {
    this.onUnitSpawned = callback;
  }

  public spawnUnit(startPos: Point, wave: number = 1): Unit {
    const baseHealth = 30;
    const healthPerWave = 10;
    const maxHealth = baseHealth + (wave - 1) * healthPerWave;
    const speed = 40;

    const unit: Unit = {
      id: this.nextUnitId++,
      x: startPos.x,
      y: startPos.y,
      health: maxHealth,
      maxHealth,
      speed,
      pathIndex: 0,
      isDead: false,
      reachedEnd: false,
      hitFlashTime: 0,
      colorTween: 0
    };
    this.units.push(unit);
    if (this.onUnitSpawned) {
      this.onUnitSpawned();
    }
    return unit;
  }

  public spawnUnitWithCallback(startPos: Point, wave: number = 1): Unit {
    return this.spawnUnit(startPos, wave);
  }

  public static calculateUnitCount(wave: number): number {
    const baseCount = 5;
    const perWaveIncrease = 3;
    const maxCount = 32;
    const count = baseCount + (wave - 1) * perWaveIncrease;
    return Math.min(count, maxCount);
  }

  public spawnWave(count: number, startPos: Point, spawnInterval: number = 0.8): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!this.pathPoints.length) return;
        this.spawnUnit(startPos);
      }, i * spawnInterval * 1000);
    }
  }

  public getUnits(): Unit[] {
    return this.units.filter(u => !u.isDead && !u.reachedEnd);
  }

  public getAliveCount(): number {
    return this.units.filter(u => !u.isDead && !u.reachedEnd).length;
  }

  public getUnitById(id: number): Unit | undefined {
    return this.units.find(u => u.id === id);
  }

  public damageUnit(unitId: number, damage: number): boolean {
    const unit = this.getUnitById(unitId);
    if (!unit || unit.isDead) return false;

    unit.health -= damage;
    unit.hitFlashTime = 0.1;
    unit.colorTween = 0.2;

    if (unit.health <= 0) {
      unit.health = 0;
      unit.isDead = true;
      if (this.onUnitKilled) {
        this.onUnitKilled(unit);
      }
      return true;
    }
    return false;
  }

  public update(deltaTime: number): void {
    for (const unit of this.units) {
      if (unit.hitFlashTime > 0) {
        unit.hitFlashTime -= deltaTime;
        if (unit.hitFlashTime < 0) unit.hitFlashTime = 0;
      }

      if (unit.colorTween > 0) {
        unit.colorTween -= deltaTime;
        if (unit.colorTween < 0) unit.colorTween = 0;
      }

      if (unit.isDead || unit.reachedEnd) continue;

      this.moveUnit(unit, deltaTime);
    }

    this.units = this.units.filter(u => !u.isDead || u.hitFlashTime > 0);
  }

  private moveUnit(unit: Unit, deltaTime: number): void {
    if (this.pathPoints.length < 2) return;
    if (unit.pathIndex >= this.pathPoints.length - 1) {
      unit.reachedEnd = true;
      if (this.onUnitReachedEnd) {
        this.onUnitReachedEnd(unit);
      }
      return;
    }

    const target = this.pathPoints[unit.pathIndex + 1];
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      unit.pathIndex++;
      return;
    }

    const moveDistance = unit.speed * deltaTime;

    if (moveDistance >= distance) {
      unit.x = target.x;
      unit.y = target.y;
      unit.pathIndex++;
    } else {
      unit.x += (dx / distance) * moveDistance;
      unit.y += (dy / distance) * moveDistance;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const unit of this.units) {
      if (unit.isDead && unit.hitFlashTime <= 0) continue;
      if (unit.reachedEnd) continue;

      this.renderUnit(ctx, unit);
      this.renderHealthBar(ctx, unit);
    }
  }

  private renderUnit(ctx: CanvasRenderingContext2D, unit: Unit): void {
    const radius = 12;

    if (unit.hitFlashTime > 0) {
      ctx.fillStyle = '#FFFFFF';
    } else if (unit.colorTween > 0) {
      const t = unit.colorTween / 0.2;
      ctx.fillStyle = this.lerpColor('#FFFFFF', COLORS.unit, 1 - t);
    } else {
      ctx.fillStyle = COLORS.unit;
    }

    ctx.beginPath();
    ctx.arc(unit.x, unit.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D, unit: Unit): void {
    const barWidth = 30;
    const barHeight = 4;
    const barX = unit.x - barWidth / 2;
    const barY = unit.y - 20;

    ctx.fillStyle = COLORS.unitHealthBg;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthPercent = unit.health / unit.maxHealth;
    const healthWidth = barWidth * healthPercent;

    const healthColor = this.getHealthColor(healthPercent);
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, healthWidth, barHeight);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  private getHealthColor(percent: number): string {
    if (percent >= 0.6) {
      return COLORS.unitHealthGreen;
    } else if (percent >= 0.3) {
      return '#F59E0B';
    } else {
      return COLORS.unitHealthRed;
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  public clear(): void {
    this.units = [];
    this.nextUnitId = 0;
  }
}
