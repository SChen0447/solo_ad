import type { Player } from '../entities/player';
import type { Enemy } from '../entities/enemy';

export interface CombatResult {
  damageDealt: number;
  damageReceived: number;
  enemyKilled: boolean;
}

export class CombatSystem {
  public static attackEnemy(
    player: Player,
    enemy: Enemy,
    currentTime: number
  ): number {
    const damage = Math.max(1, player.attack - enemy.data.defense);
    enemy.takeDamage(player.attack, currentTime);
    return damage;
  }

  public static attackPlayer(
    enemy: Enemy,
    player: Player,
    currentTime: number
  ): number {
    const damage = Math.max(1, enemy.data.attack - player.defense);
    player.takeDamage(enemy.data.attack, currentTime);
    return damage;
  }

  public static executeCombat(
    player: Player,
    enemy: Enemy,
    currentTime: number
  ): CombatResult {
    const damageDealt = this.attackEnemy(player, enemy, currentTime);
    let damageReceived = 0;
    let enemyKilled = false;

    if (enemy.isDead() || enemy.data.isDying) {
      enemyKilled = true;
    } else {
      damageReceived = this.attackPlayer(enemy, player, currentTime);
    }

    return {
      damageDealt,
      damageReceived,
      enemyKilled
    };
  }

  public static fireScrollDamage(
    player: Player,
    enemies: Enemy[],
    currentTime: number
  ): Enemy[] {
    const affected: Enemy[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = player.x + dx;
        const ty = player.y + dy;
        for (const enemy of enemies) {
          if (
            !enemy.isDead() &&
            !enemy.data.isDying &&
            enemy.data.x === tx &&
            enemy.data.y === ty
          ) {
            enemy.takeDamage(15, currentTime);
            affected.push(enemy);
          }
        }
      }
    }
    return affected;
  }
}
