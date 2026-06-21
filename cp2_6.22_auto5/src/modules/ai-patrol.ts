import type { Enemy, MoveCommand } from '../types';

const WAIT_DURATION = 0.5;
const ARRIVAL_THRESHOLD = 3;

class AIPatrol {
  update(enemy: Enemy, deltaTime: number): MoveCommand {
    if (enemy.isWaiting) {
      enemy.waitTimer -= deltaTime;
      if (enemy.waitTimer <= 0) {
        enemy.isWaiting = false;
        enemy.currentPathIndex = (enemy.currentPathIndex + 1) % enemy.path.length;
      }
      return { enemyId: enemy.id, dx: 0, dy: 0 };
    }

    const target = enemy.path[enemy.currentPathIndex];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ARRIVAL_THRESHOLD) {
      enemy.isWaiting = true;
      enemy.waitTimer = WAIT_DURATION;
      enemy.x = target.x;
      enemy.y = target.y;
      return { enemyId: enemy.id, dx: 0, dy: 0 };
    }

    const moveDistance = enemy.speed * deltaTime;
    const moveX = (dx / distance) * moveDistance;
    const moveY = (dy / distance) * moveDistance;

    return { enemyId: enemy.id, dx: moveX, dy: moveY };
  }

  updateAll(enemies: Enemy[], deltaTime: number): MoveCommand[] {
    return enemies.map(enemy => this.update(enemy, deltaTime));
  }
}

export default AIPatrol;
