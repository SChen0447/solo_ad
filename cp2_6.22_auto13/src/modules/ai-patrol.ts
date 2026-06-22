import type { Enemy, Position } from '../types';

const ARRIVAL_THRESHOLD = 5;

export function calculateDirection(current: Position, target: Position): Position {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.001) {
    return { x: 0, y: 0 };
  }

  return {
    x: dx / distance,
    y: dy / distance
  };
}

export function updateEnemyPatrol(
  enemy: Enemy,
  deltaTime: number,
  speed: number
): Enemy {
  const updatedEnemy = { ...enemy };
  const targetPoint = updatedEnemy.patrolPath[updatedEnemy.currentPathIndex];

  const dx = targetPoint.x - updatedEnemy.x;
  const dy = targetPoint.y - updatedEnemy.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < ARRIVAL_THRESHOLD) {
    updatedEnemy.currentPathIndex = (updatedEnemy.currentPathIndex + 1) % updatedEnemy.patrolPath.length;
    return updatedEnemy;
  }

  const direction = calculateDirection(
    { x: updatedEnemy.x, y: updatedEnemy.y },
    targetPoint
  );

  const moveDistance = speed * deltaTime;
  const actualMove = Math.min(moveDistance, distance);

  updatedEnemy.x += direction.x * actualMove;
  updatedEnemy.y += direction.y * actualMove;

  return updatedEnemy;
}

export function updateAllEnemies(
  enemies: Enemy[],
  deltaTime: number,
  speed: number
): Enemy[] {
  return enemies.map(enemy => updateEnemyPatrol(enemy, deltaTime, speed));
}

export function getCurrentTarget(enemy: Enemy): Position {
  return enemy.patrolPath[enemy.currentPathIndex];
}

export function resetEnemyPatrol(enemy: Enemy): Enemy {
  return {
    ...enemy,
    currentPathIndex: 0,
    x: enemy.patrolPath[0].x,
    y: enemy.patrolPath[0].y
  };
}
