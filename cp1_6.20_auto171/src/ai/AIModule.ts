import type { Unit, Tile, HexCoord } from '../types';
import { hexDistance, hexKey } from '../utils/hexUtils';
import { getMoveRange, getAttackRange, findPath } from '../utils/pathfinding';

export interface AIAction {
  unitId: string;
  moveTo?: HexCoord;
  attackTargetId?: string;
}

export function calculateAIActions(
  aiUnits: Unit[],
  playerUnits: Unit[],
  tiles: Tile[],
  allUnits: Unit[]
): AIAction[] {
  const actions: AIAction[] = [];
  const remainingUnits = [...aiUnits].filter(u => u.currentHealth > 0);
  let currentUnitsState = [...allUnits];

  const playerBase = findPlayerBase(tiles);

  remainingUnits.sort((a, b) => {
    const aDistToNearestEnemy = getNearestEnemyDistance(a, playerUnits);
    const bDistToNearestEnemy = getNearestEnemyDistance(b, playerUnits);
    return aDistToNearestEnemy - bDistToNearestEnemy;
  });

  for (const unit of remainingUnits) {
    if (unit.hasAttacked) continue;

    const action = determineBestAction(
      unit,
      playerUnits,
      tiles,
      currentUnitsState,
      playerBase
    );

    if (action) {
      actions.push(action);
      
      if (action.moveTo) {
        const unitIndex = currentUnitsState.findIndex(u => u.id === unit.id);
        if (unitIndex !== -1) {
          currentUnitsState[unitIndex] = {
            ...currentUnitsState[unitIndex],
            position: action.moveTo,
            hasMoved: true,
          };
        }
      }
      
      if (action.attackTargetId) {
        const unitIndex = currentUnitsState.findIndex(u => u.id === unit.id);
        if (unitIndex !== -1) {
          currentUnitsState[unitIndex] = {
            ...currentUnitsState[unitIndex],
            hasAttacked: true,
          };
        }
      }
    }
  }

  return actions;
}

function determineBestAction(
  unit: Unit,
  playerUnits: Unit[],
  tiles: Tile[],
  allUnits: Unit[],
  playerBase: HexCoord | null
): AIAction | null {
  const moveRange = unit.hasMoved ? [unit.position] : getMoveRange(unit.position, unit.movement, tiles, allUnits);
  const allMoveTargets = [unit.position, ...moveRange];

  let bestAction: AIAction | null = null;
  let bestScore = -Infinity;

  for (const moveTarget of allMoveTargets) {
    const attackRange = getAttackRange(moveTarget, unit.range, tiles);
    const attackableEnemies = playerUnits.filter(enemy => 
      enemy.currentHealth > 0 &&
      attackRange.some(pos => pos.q === enemy.position.q && pos.r === enemy.position.r)
    );

    if (attackableEnemies.length > 0) {
      for (const enemy of attackableEnemies) {
        const damage = calculateDamage(unit, enemy);
        const killScore = enemy.currentHealth <= damage ? 100 : 0;
        const healthWeight = (enemy.maxHealth - enemy.currentHealth) / enemy.maxHealth * 20;
        const score = damage * 10 + killScore + healthWeight;

        if (score > bestScore) {
          bestScore = score;
          bestAction = {
            unitId: unit.id,
            moveTo: moveTarget.q !== unit.position.q || moveTarget.r !== unit.position.r 
              ? moveTarget 
              : undefined,
            attackTargetId: enemy.id,
          };
        }
      }
    } else {
      let targetPos: HexCoord | null = null;
      let minDist = Infinity;

      const aliveEnemies = playerUnits.filter(u => u.currentHealth > 0);
      if (aliveEnemies.length > 0) {
        for (const enemy of aliveEnemies) {
          const dist = hexDistance(moveTarget, enemy.position);
          if (dist < minDist) {
            minDist = dist;
            targetPos = enemy.position;
          }
        }
      } else if (playerBase) {
        minDist = hexDistance(moveTarget, playerBase);
        targetPos = playerBase;
      }

      if (targetPos) {
        const score = -minDist * 5;
        if (score > bestScore && (moveTarget.q !== unit.position.q || moveTarget.r !== unit.position.r)) {
          bestScore = score;
          bestAction = {
            unitId: unit.id,
            moveTo: moveTarget,
          };
        }
      }
    }
  }

  return bestAction;
}

function calculateDamage(attacker: Unit, defender: Unit): number {
  const baseDamage = attacker.attack;
  const defense = defender.defense;
  const damage = Math.max(1, baseDamage - Math.floor(defense / 2));
  return damage;
}

function getNearestEnemyDistance(unit: Unit, enemies: Unit[]): number {
  const aliveEnemies = enemies.filter(e => e.currentHealth > 0);
  if (aliveEnemies.length === 0) return 999;
  
  let minDist = Infinity;
  for (const enemy of aliveEnemies) {
    const dist = hexDistance(unit.position, enemy.position);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

function findPlayerBase(tiles: Tile[]): HexCoord | null {
  const base = tiles.find(t => t.terrain === 'base_player');
  return base ? base.coord : null;
}

export function executeAIActions(
  actions: AIAction[],
  units: Unit[],
  tiles: Tile[]
): { units: Unit[]; events: AIBattleEvent[] } {
  let updatedUnits = [...units];
  const events: AIBattleEvent[] = [];

  for (const action of actions) {
    const unitIndex = updatedUnits.findIndex(u => u.id === action.unitId);
    if (unitIndex === -1) continue;

    const unit = updatedUnits[unitIndex];

    if (action.moveTo) {
      updatedUnits[unitIndex] = {
        ...unit,
        position: action.moveTo,
        hasMoved: true,
      };
      events.push({
        type: 'move',
        unitId: action.unitId,
        from: unit.position,
        to: action.moveTo,
      });
    }

    if (action.attackTargetId) {
      const targetIndex = updatedUnits.findIndex(u => u.id === action.attackTargetId);
      if (targetIndex !== -1) {
        const target = updatedUnits[targetIndex];
        const currentUnit = updatedUnits[unitIndex];
        const damage = calculateDamage(currentUnit, target);
        const newHealth = Math.max(0, target.currentHealth - damage);
        
        updatedUnits[targetIndex] = {
          ...target,
          currentHealth: newHealth,
        };

        updatedUnits[unitIndex] = {
          ...updatedUnits[unitIndex],
          hasAttacked: true,
        };

        events.push({
          type: 'attack',
          attackerId: action.unitId,
          targetId: action.attackTargetId,
          damage,
          targetPosition: target.position,
          killed: newHealth <= 0,
        });

        if (newHealth <= 0) {
          events.push({
            type: 'death',
            unitId: action.attackTargetId,
            position: target.position,
          });
        }
      }
    }
  }

  return { units: updatedUnits, events };
}

export interface AIBattleEvent {
  type: 'move' | 'attack' | 'death';
  unitId?: string;
  attackerId?: string;
  targetId?: string;
  from?: HexCoord;
  to?: HexCoord;
  damage?: number;
  targetPosition?: HexCoord;
  position?: HexCoord;
  killed?: boolean;
}
