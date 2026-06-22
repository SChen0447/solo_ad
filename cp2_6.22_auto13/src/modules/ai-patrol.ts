import type { Enemy, Position, MoveCommand } from '../types';

const WAIT_DURATION = 0.5;
const ARRIVAL_THRESHOLD = 3;

export interface PatrolResult {
  moveCommand: MoveCommand | null;
  updatedEnemy: Enemy;
}

export function updatePatrol(enemy: Enemy, deltaTime: number): PatrolResult {
  let updatedEnemy = { ...enemy };
  
  if (updatedEnemy.isWaiting) {
    updatedEnemy.waitTimer -= deltaTime;
    if (updatedEnemy.waitTimer <= 0) {
      updatedEnemy.isWaiting = false;
      updatedEnemy.currentPathIndex = (updatedEnemy.currentPathIndex + 1) % updatedEnemy.patrolPath.length;
    }
    return {
      moveCommand: null,
      updatedEnemy
    };
  }
  
  const targetPoint = updatedEnemy.patrolPath[updatedEnemy.currentPathIndex];
  const dx = targetPoint.x - updatedEnemy.x;
  const dy = targetPoint.y - updatedEnemy.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < ARRIVAL_THRESHOLD) {
    updatedEnemy.isWaiting = true;
    updatedEnemy.waitTimer = WAIT_DURATION;
    return {
      moveCommand: null,
      updatedEnemy
    };
  }
  
  const moveDistance = updatedEnemy.speed * deltaTime;
  const ratio = Math.min(moveDistance / distance, 1);
  
  const moveDx = dx * ratio;
  const moveDy = dy * ratio;
  
  updatedEnemy.x += moveDx;
  updatedEnemy.y += moveDy;
  
  return {
    moveCommand: {
      entityId: enemy.id,
      dx: moveDx,
      dy: moveDy
    },
    updatedEnemy
  };
}

export function updateAllPatrols(enemies: Enemy[], deltaTime: number): {
  enemies: Enemy[];
  moveCommands: MoveCommand[];
} {
  const updatedEnemies: Enemy[] = [];
  const moveCommands: MoveCommand[] = [];
  
  for (const enemy of enemies) {
    const result = updatePatrol(enemy, deltaTime);
    updatedEnemies.push(result.updatedEnemy);
    if (result.moveCommand) {
      moveCommands.push(result.moveCommand);
    }
  }
  
  return { enemies: updatedEnemies, moveCommands };
}

export function getNextPathPoint(enemy: Enemy): Position {
  return enemy.patrolPath[enemy.currentPathIndex];
}

export function resetPatrol(enemy: Enemy): Enemy {
  return {
    ...enemy,
    currentPathIndex: 0,
    waitTimer: 0,
    isWaiting: false,
    x: enemy.patrolPath[0].x,
    y: enemy.patrolPath[0].y
  };
}
