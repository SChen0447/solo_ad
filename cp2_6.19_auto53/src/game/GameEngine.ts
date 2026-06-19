import { Unit, type UnitType, type Position, type Team } from './Unit';
import { Formation, type FormationType } from './Formation';

export interface CombatLogEntry {
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
  combatLogs: CombatLogEntry[];
  killCount: number;
  gameTime: number;
  moveTarget: Position | null;
}

export class GameEngine {
  private playerUnits: Unit[] = [];
  private enemyUnits: Unit[] = [];
  private selectedUnits: Unit[] = [];
  private currentFormation: FormationType = 'rect';
  private combatLogs: CombatLogEntry[] = [];
  private logIdCounter: number = 0;
  private killCount: number = 0;
  private gameTime: number = 0;
  private moveTarget: Position | null = null;
  private mapWidth: number;
  private mapHeight: number;

  private readonly MAX_PLAYER_UNITS = 20;
  private readonly MAX_ENEMY_UNITS = 10;
  private readonly MAX_LOG_ENTRIES = 20;
  private readonly COMBAT_RANGE = 60;
  private readonly ENEMY_ATTACK_COOLDOWN = 2;

  constructor(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
  }

  public update(deltaTime: number): void {
    this.gameTime += deltaTime;

    this.updateUnits(deltaTime);
    this.checkCombat();
    this.processAttacks(deltaTime);
    this.cleanupDeadUnits();
    this.updateLogOpacity(deltaTime);
  }

  private updateUnits(deltaTime: number): void {
    for (const unit of [...this.playerUnits, ...this.enemyUnits]) {
      unit.update(deltaTime);
    }
  }

  private checkCombat(): void {
    for (const playerUnit of this.playerUnits) {
      if (playerUnit.isDead()) continue;

      let nearestEnemy: Unit | null = null;
      let nearestDist = Infinity;

      for (const enemyUnit of this.enemyUnits) {
        if (enemyUnit.isDead()) continue;
        const dist = playerUnit.distanceTo(enemyUnit);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemyUnit;
        }
      }

      if (nearestEnemy && nearestDist <= this.COMBAT_RANGE) {
        playerUnit.isInCombat = true;
        playerUnit.isMoving = false;
        const dx = nearestEnemy.position.x - playerUnit.position.x;
        const dy = nearestEnemy.position.y - playerUnit.position.y;
        playerUnit.facingAngle = Math.atan2(dy, dx);
      } else {
        if (playerUnit.finalTargetPosition) {
          playerUnit.isInCombat = false;
        }
      }
    }

    for (const enemyUnit of this.enemyUnits) {
      if (enemyUnit.isDead()) continue;

      let nearestPlayer: Unit | null = null;
      let nearestDist = Infinity;

      for (const playerUnit of this.playerUnits) {
        if (playerUnit.isDead()) continue;
        const dist = enemyUnit.distanceTo(playerUnit);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPlayer = playerUnit;
        }
      }

      if (nearestPlayer && nearestDist <= this.COMBAT_RANGE) {
        enemyUnit.isInCombat = true;
        enemyUnit.isMoving = false;
        const dx = nearestPlayer.position.x - enemyUnit.position.x;
        const dy = nearestPlayer.position.y - enemyUnit.position.y;
        enemyUnit.facingAngle = Math.atan2(dy, dx);
      } else {
        if (enemyUnit.patrolPath.length > 0) {
          enemyUnit.isInCombat = false;
        }
      }
    }
  }

  private processAttacks(deltaTime: number): void {
    for (const playerUnit of this.playerUnits) {
      if (playerUnit.isDead() || !playerUnit.isInCombat || !playerUnit.canAttack()) continue;

      let nearestEnemy: Unit | null = null;
      let nearestDist = Infinity;

      for (const enemyUnit of this.enemyUnits) {
        if (enemyUnit.isDead()) continue;
        const dist = playerUnit.distanceTo(enemyUnit);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemyUnit;
        }
      }

      if (nearestEnemy && nearestDist <= this.COMBAT_RANGE) {
        const damage = playerUnit.attack(nearestEnemy);
        this.addCombatLog(`${playerUnit.name}对${nearestEnemy.name}造成${damage}点伤害`);

        if (nearestEnemy.isDead()) {
          this.killCount++;
          this.addCombatLog(`${nearestEnemy.name}被消灭！`);
        }
      }
    }

    for (const enemyUnit of this.enemyUnits) {
      if (enemyUnit.isDead() || !enemyUnit.isInCombat) continue;

      enemyUnit.lastAttackTime += deltaTime;
      if (enemyUnit.lastAttackTime < this.ENEMY_ATTACK_COOLDOWN) continue;

      let nearestPlayer: Unit | null = null;
      let nearestDist = Infinity;

      for (const playerUnit of this.playerUnits) {
        if (playerUnit.isDead()) continue;
        const dist = enemyUnit.distanceTo(playerUnit);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPlayer = playerUnit;
        }
      }

      if (nearestPlayer && nearestDist <= this.COMBAT_RANGE) {
        const damage = Math.floor(3 + Math.random() * 4);
        nearestPlayer.takeDamage(damage);
        enemyUnit.lastAttackTime = 0;
        this.addCombatLog(`${enemyUnit.name}对${nearestPlayer.name}造成${damage}点伤害`);

        if (nearestPlayer.isDead()) {
          this.addCombatLog(`${nearestPlayer.name}阵亡！`);
          this.removeFromSelection(nearestPlayer);
        }
      }
    }
  }

  private cleanupDeadUnits(): void {
    this.playerUnits = this.playerUnits.filter(u => !u.isDead());
    this.enemyUnits = this.enemyUnits.filter(u => !u.isDead());
    this.selectedUnits = this.selectedUnits.filter(u => !u.isDead());
  }

  private addCombatLog(message: string): void {
    const entry: CombatLogEntry = {
      id: ++this.logIdCounter,
      message,
      timestamp: this.gameTime,
      opacity: 0
    };
    this.combatLogs.push(entry);

    if (this.combatLogs.length > this.MAX_LOG_ENTRIES) {
      this.combatLogs.shift();
    }
  }

  private updateLogOpacity(_deltaTime: number): void {
    const fadeInDuration = 0.4;
    for (const log of this.combatLogs) {
      const age = this.gameTime - log.timestamp;
      if (age < fadeInDuration) {
        log.opacity = age / fadeInDuration;
      } else {
        log.opacity = 1;
      }
    }
  }

  public addUnit(type: UnitType, team: Team, position: Position): Unit | null {
    if (team === 'player' && this.playerUnits.length >= this.MAX_PLAYER_UNITS) {
      return null;
    }
    if (team === 'enemy' && this.enemyUnits.length >= this.MAX_ENEMY_UNITS) {
      return null;
    }

    const unit = new Unit(type, team, position);

    if (team === 'player') {
      this.playerUnits.push(unit);
    } else {
      this.enemyUnits.push(unit);
    }

    return unit;
  }

  public removeUnit(unit: Unit): void {
    const removeFromArray = (arr: Unit[]) => {
      const idx = arr.indexOf(unit);
      if (idx !== -1) arr.splice(idx, 1);
    };

    removeFromArray(this.playerUnits);
    removeFromArray(this.enemyUnits);
    removeFromArray(this.selectedUnits);
  }

  public selectUnitsInRect(startX: number, startY: number, endX: number, endY: number): void {
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);

    this.clearSelection();

    for (const unit of this.playerUnits) {
      if (unit.isDead()) continue;
      const { x, y } = unit.position;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        unit.isSelected = true;
        this.selectedUnits.push(unit);
      }
    }
  }

  public selectSingleUnit(unit: Unit): void {
    this.clearSelection();
    if (unit.team === 'player' && !unit.isDead()) {
      unit.isSelected = true;
      this.selectedUnits.push(unit);
    }
  }

  public clearSelection(): void {
    for (const unit of this.selectedUnits) {
      unit.isSelected = false;
    }
    this.selectedUnits = [];
  }

  private removeFromSelection(unit: Unit): void {
    const idx = this.selectedUnits.indexOf(unit);
    if (idx !== -1) {
      this.selectedUnits.splice(idx, 1);
      unit.isSelected = false;
    }
  }

  public moveUnitsToTarget(targetX: number, targetY: number): void {
    if (this.selectedUnits.length === 0) return;

    const center: Position = { x: targetX, y: targetY };
    const offsets = Formation.computeFormation(this.currentFormation, this.selectedUnits, center);

    this.moveTarget = { ...center };

    for (let i = 0; i < this.selectedUnits.length; i++) {
      const unit = this.selectedUnits[i];
      const offset = offsets[i] || { x: 0, y: 0 };
      unit.setMoveTarget(center, offset);
    }
  }

  public changeFormation(type: FormationType): void {
    if (this.currentFormation === type) return;
    this.currentFormation = type;

    if (this.selectedUnits.length === 0 || !this.moveTarget) return;

    const offsets = Formation.computeFormation(type, this.selectedUnits, this.moveTarget);

    for (let i = 0; i < this.selectedUnits.length; i++) {
      const unit = this.selectedUnits[i];
      const offset = offsets[i] || { x: 0, y: 0 };
      unit.setFormationOffset(offset, true);
    }
  }

  public setEnemyPatrolPath(enemyUnit: Unit, path: Position[]): void {
    enemyUnit.patrolPath = path;
    if (path.length > 0) {
      enemyUnit.position = { ...path[0] };
      enemyUnit.patrolIndex = 0;
    }
  }

  public generateEnemyPatrolPaths(mapWidth: number, mapHeight: number): void {
    for (const enemy of this.enemyUnits) {
      const centerX = enemy.position.x;
      const centerY = enemy.position.y;
      const radius = 50 + Math.random() * 50;

      const path: Position[] = [];
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        path.push({
          x: Math.max(50, Math.min(mapWidth - 50, centerX + Math.cos(angle) * radius)),
          y: Math.max(50, Math.min(mapHeight - 50, centerY + Math.sin(angle) * radius))
        });
      }
      this.setEnemyPatrolPath(enemy, path);
    }
  }

  public getState(): GameState {
    return {
      playerUnits: [...this.playerUnits],
      enemyUnits: [...this.enemyUnits],
      selectedUnits: [...this.selectedUnits],
      currentFormation: this.currentFormation,
      combatLogs: [...this.combatLogs],
      killCount: this.killCount,
      gameTime: this.gameTime,
      moveTarget: this.moveTarget ? { ...this.moveTarget } : null
    };
  }

  public getPlayerUnits(): Unit[] {
    return this.playerUnits;
  }

  public getEnemyUnits(): Unit[] {
    return this.enemyUnits;
  }

  public getSelectedUnits(): Unit[] {
    return this.selectedUnits;
  }

  public getCurrentFormation(): FormationType {
    return this.currentFormation;
  }

  public getMapSize(): { width: number; height: number } {
    return { width: this.mapWidth, height: this.mapHeight };
  }

  public setMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
  }
}
