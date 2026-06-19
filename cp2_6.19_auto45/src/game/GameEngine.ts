import { Unit, UnitType, Team, UNIT_STATS } from './Unit';
import { Formation, FormationType, FORMATION_NAMES } from './Formation';

export interface CombatLog {
  id: number;
  message: string;
  timestamp: number;
  opacity: number;
}

export interface GameState {
  playerUnits: Unit[];
  enemyUnits: Unit[];
  selectedUnits: Unit[];
  currentFormation: FormationType;
  formationCenter: { x: number; y: number } | null;
  moveTarget: { x: number; y: number } | null;
  combatLogs: CombatLog[];
  elapsedTime: number;
  killCount: number;
  enemyPatrolPaths: Map<string, Array<{ x: number; y: number }>>;
}

export class GameEngine {
  private playerUnits: Unit[] = [];
  private enemyUnits: Unit[] = [];
  private selectedUnits: Set<string> = new Set();
  private currentFormation: FormationType = 'rect';
  private formationCenter: { x: number; y: number } | null = null;
  private moveTarget: { x: number; y: number } | null = null;
  private combatLogs: CombatLog[] = [];
  private logCounter = 0;
  private elapsedTime = 0;
  private killCount = 0;
  private enemyPatrolPaths: Map<string, Array<{ x: number; y: number }>> = new Map();
  private enemyPatrolProgress: Map<string, number> = new Map();
  private readonly COMBAT_RANGE = 60;
  private readonly MAX_LOGS = 20;
  private readonly MAX_PLAYER_UNITS = 20;
  private readonly MAX_ENEMY_UNITS = 10;
  private mapWidth: number;
  private mapHeight: number;

  constructor(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
  }

  public initializeDefaultUnits(): void {
    const types: UnitType[] = ['infantry', 'archer', 'cavalry', 'infantry', 'archer'];
    const startX = 150;
    const startY = this.mapHeight / 2;

    for (let i = 0; i < 8; i++) {
      const type = types[i % types.length];
      const x = startX + (i % 4) * 50;
      const y = startY + Math.floor(i / 4) * 50 - 25;
      this.addPlayerUnit(type, { x, y });
    }

    this.spawnDefaultEnemies();
  }

  private spawnDefaultEnemies(): void {
    const enemyCount = 5;
    for (let i = 0; i < enemyCount; i++) {
      const centerX = this.mapWidth * 0.5 + Math.random() * this.mapWidth * 0.3;
      const centerY = 100 + i * (this.mapHeight - 200) / enemyCount;
      this.spawnEnemyWithPatrol(centerX, centerY, 80);
    }
  }

  private spawnEnemyWithPatrol(centerX: number, centerY: number, radius: number): void {
    const points = [
      { x: centerX - radius, y: centerY },
      { x: centerX, y: centerY - radius },
      { x: centerX + radius, y: centerY },
      { x: centerX, y: centerY + radius },
    ];

    const enemy = new Unit('infantry', 'enemy', { x: points[0].x, y: points[0].y });
    enemy.color = '#ff4444';
    enemy.displayName = '敌方';
    enemy.name = `敌方${this.enemyUnits.length + 1}`;
    enemy.speed = 30;
    enemy.attackCooldown = 2;

    if (this.enemyUnits.length < this.MAX_ENEMY_UNITS) {
      this.enemyUnits.push(enemy);
      this.enemyPatrolPaths.set(enemy.id, points);
      this.enemyPatrolProgress.set(enemy.id, 0);
    }
  }

  public addPlayerUnit(type: UnitType, position: { x: number; y: number }): Unit | null {
    if (this.playerUnits.length >= this.MAX_PLAYER_UNITS) {
      return null;
    }
    const unit = new Unit(type, 'player', position);
    this.playerUnits.push(unit);
    return unit;
  }

  public removeUnit(unitId: string): void {
    this.playerUnits = this.playerUnits.filter(u => u.id !== unitId);
    this.enemyUnits = this.enemyUnits.filter(u => u.id !== unitId);
    this.selectedUnits.delete(unitId);
    this.enemyPatrolPaths.delete(unitId);
    this.enemyPatrolProgress.delete(unitId);
  }

  public selectUnit(unitId: string, additive: boolean = false): void {
    if (!additive) {
      this.selectedUnits.clear();
    }
    const unit = this.playerUnits.find(u => u.id === unitId);
    if (unit) {
      this.selectedUnits.add(unitId);
      unit.isSelected = true;
    }
  }

  public selectUnitsInRect(rect: { x: number; y: number; width: number; height: number }, additive: boolean = false): void {
    if (!additive) {
      this.clearSelection();
    }
    const minX = Math.min(rect.x, rect.x + rect.width);
    const maxX = Math.max(rect.x, rect.x + rect.width);
    const minY = Math.min(rect.y, rect.y + rect.height);
    const maxY = Math.max(rect.y, rect.y + rect.height);

    for (const unit of this.playerUnits) {
      if (unit.isAlive() &&
          unit.position.x >= minX && unit.position.x <= maxX &&
          unit.position.y >= minY && unit.position.y <= maxY) {
        this.selectedUnits.add(unit.id);
        unit.isSelected = true;
      }
    }
  }

  public clearSelection(): void {
    for (const id of this.selectedUnits) {
      const unit = this.playerUnits.find(u => u.id === id);
      if (unit) {
        unit.isSelected = false;
      }
    }
    this.selectedUnits.clear();
  }

  public getSelectedUnits(): Unit[] {
    return this.playerUnits.filter(u => this.selectedUnits.has(u.id) && u.isAlive());
  }

  public setFormation(type: FormationType): void {
    if (this.currentFormation === type) return;
    this.currentFormation = type;

    const selected = this.getSelectedUnits();
    if (selected.length > 0 && this.formationCenter) {
      this.applyFormationToUnits(selected, this.formationCenter);
    }
  }

  public getCurrentFormation(): FormationType {
    return this.currentFormation;
  }

  public getFormationName(): string {
    return FORMATION_NAMES[this.currentFormation];
  }

  public moveUnitsToTarget(target: { x: number; y: number }): void {
    const selected = this.getSelectedUnits();
    if (selected.length === 0) return;

    this.moveTarget = { ...target };
    this.formationCenter = { ...target };
    this.applyFormationToUnits(selected, target);
  }

  private applyFormationToUnits(units: Unit[], center: { x: number; y: number }): void {
    const offsets = Formation.computeFormation(this.currentFormation, units, center);
    units.forEach((unit, index) => {
      if (offsets[index]) {
        unit.setFormationOffset(offsets[index], true);
      }
    });
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    for (const log of this.combatLogs) {
      if (log.opacity < 1) {
        log.opacity = Math.min(1, log.opacity + deltaTime / 0.4);
      }
    }

    this.updateEnemyPatrol(deltaTime);
    this.checkCombat();
    this.processAttacks(deltaTime);
    this.updatePlayerUnits(deltaTime);
    this.cleanupDeadUnits();
  }

  private updateEnemyPatrol(deltaTime: number): void {
    for (const enemy of this.enemyUnits) {
      if (!enemy.isAlive() || enemy.isInCombat) continue;

      const path = this.enemyPatrolPaths.get(enemy.id);
      if (!path || path.length < 2) continue;

      let progress = this.enemyPatrolProgress.get(enemy.id) ?? 0;
      progress += deltaTime * 0.3;

      const totalSegments = path.length;
      const segmentProgress = (progress % totalSegments);
      const currentSegment = Math.floor(segmentProgress);
      const t = segmentProgress - currentSegment;

      const start = path[currentSegment];
      const end = path[(currentSegment + 1) % path.length];

      enemy.position.x = start.x + (end.x - start.x) * t;
      enemy.position.y = start.y + (end.y - start.y) * t;
      enemy.facingAngle = Math.atan2(end.y - start.y, end.x - start.x);

      this.enemyPatrolProgress.set(enemy.id, progress);
    }
  }

  private checkCombat(): void {
    for (const player of this.playerUnits) {
      if (!player.isAlive()) continue;

      let nearestEnemy: Unit | null = null;
      let nearestDistance = Infinity;

      for (const enemy of this.enemyUnits) {
        if (!enemy.isAlive()) continue;
        const dist = player.distanceTo(enemy.position);
        if (dist < this.COMBAT_RANGE && dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) {
        if (!player.isInCombat) {
          player.enterCombat();
        }
        player.faceTowards(nearestEnemy.position);
      } else {
        if (player.isInCombat) {
          player.exitCombat();
        }
      }
    }

    for (const enemy of this.enemyUnits) {
      if (!enemy.isAlive()) continue;

      let nearestPlayer: Unit | null = null;
      let nearestDistance = Infinity;

      for (const player of this.playerUnits) {
        if (!player.isAlive()) continue;
        const dist = enemy.distanceTo(player.position);
        if (dist < this.COMBAT_RANGE && dist < nearestDistance) {
          nearestDistance = dist;
          nearestPlayer = player;
        }
      }

      if (nearestPlayer) {
        if (!enemy.isInCombat) {
          enemy.enterCombat();
        }
        enemy.faceTowards(nearestPlayer.position);
      } else {
        if (enemy.isInCombat) {
          enemy.exitCombat();
        }
      }
    }
  }

  private processAttacks(deltaTime: number): void {
    for (const player of this.playerUnits) {
      if (!player.isAlive()) continue;
      player.attackTimer = Math.max(0, player.attackTimer - deltaTime);

      if (player.canAttack()) {
        const target = this.findNearestEnemy(player);
        if (target) {
          const damage = player.performAttack();
          const killed = target.takeDamage(damage);
          this.addCombatLog(`${player.displayName}${player.name.slice(-1)}对${target.name}造成${damage}点伤害`);
          if (killed) {
            this.killCount++;
            this.addCombatLog(`${target.name}被击败！`);
          }
        }
      }
    }

    for (const enemy of this.enemyUnits) {
      if (!enemy.isAlive()) continue;
      enemy.attackTimer = Math.max(0, enemy.attackTimer - deltaTime);

      if (enemy.canAttack()) {
        const target = this.findNearestPlayer(enemy);
        if (target) {
          const damage = enemy.performAttack();
          const killed = target.takeDamage(damage);
          this.addCombatLog(`${enemy.name}对${target.displayName}${target.name.slice(-1)}造成${damage}点伤害`);
          if (killed) {
            this.addCombatLog(`${target.displayName}${target.name.slice(-1)}阵亡！`);
          }
        }
      }
    }
  }

  private findNearestEnemy(unit: Unit): Unit | null {
    let nearest: Unit | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemyUnits) {
      if (!enemy.isAlive()) continue;
      const dist = unit.distanceTo(enemy.position);
      if (dist < this.COMBAT_RANGE && dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private findNearestPlayer(unit: Unit): Unit | null {
    let nearest: Unit | null = null;
    let nearestDist = Infinity;
    for (const player of this.playerUnits) {
      if (!player.isAlive()) continue;
      const dist = unit.distanceTo(player.position);
      if (dist < this.COMBAT_RANGE && dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }
    return nearest;
  }

  private updatePlayerUnits(deltaTime: number): void {
    for (const unit of this.playerUnits) {
      if (!unit.isAlive()) continue;
      unit.update(deltaTime, this.formationCenter ?? undefined);
    }
  }

  private cleanupDeadUnits(): void {
    const deadEnemyIds = this.enemyUnits.filter(u => !u.isAlive()).map(u => u.id);
    for (const id of deadEnemyIds) {
      this.removeUnit(id);
    }

    const deadPlayerIds = this.playerUnits.filter(u => !u.isAlive()).map(u => u.id);
    for (const id of deadPlayerIds) {
      this.removeUnit(id);
    }
  }

  private addCombatLog(message: string): void {
    this.combatLogs.unshift({
      id: this.logCounter++,
      message,
      timestamp: this.elapsedTime,
      opacity: 0,
    });

    if (this.combatLogs.length > this.MAX_LOGS) {
      this.combatLogs = this.combatLogs.slice(0, this.MAX_LOGS);
    }
  }

  public getState(): GameState {
    return {
      playerUnits: [...this.playerUnits],
      enemyUnits: [...this.enemyUnits],
      selectedUnits: this.getSelectedUnits(),
      currentFormation: this.currentFormation,
      formationCenter: this.formationCenter,
      moveTarget: this.moveTarget,
      combatLogs: [...this.combatLogs],
      elapsedTime: this.elapsedTime,
      killCount: this.killCount,
      enemyPatrolPaths: new Map(this.enemyPatrolPaths),
    };
  }

  public getEnemyPatrolPath(enemyId: string): Array<{ x: number; y: number }> | undefined {
    return this.enemyPatrolPaths.get(enemyId);
  }
}
