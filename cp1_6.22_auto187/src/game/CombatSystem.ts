import {
  Player,
  Enemy,
  Item,
  DamageEvent,
  AttackResult,
  DamageCallback,
  EnemyDeathCallback,
  Position,
  ItemType,
  EnemyType,
  PERFECT_DAMAGE_BONUS,
  RHYTHM_MISS_DAMAGE_PERCENT,
  TILE_SIZE
} from '../types';

export class CombatSystem {
  private damageCallbacks: Set<DamageCallback> = new Set();
  private enemyDeathCallbacks: Set<EnemyDeathCallback> = new Set();

  constructor() {}

  calculateDamage(
    attackerAttack: number,
    isPerfect: boolean = false,
    defenseMultiplier: number = 1
  ): number {
    let damage = attackerAttack * defenseMultiplier;
    if (isPerfect) {
      damage *= PERFECT_DAMAGE_BONUS;
    }
    return Math.floor(damage);
  }

  processPlayerAttack(
    player: Player,
    enemies: Enemy[],
    attackRange: number = TILE_SIZE * 1.5,
    isPerfect: boolean = false
  ): AttackResult[] {
    const results: AttackResult[] = [];
    const playerCenter = this.getCenterPosition(player.position);

    for (const enemy of enemies) {
      if (enemy.health <= 0) continue;

      const enemyCenter = this.getCenterPosition(enemy.position);
      const distance = this.getDistance(playerCenter, enemyCenter);

      if (distance <= attackRange) {
        const damage = this.calculateDamage(player.attack, isPerfect);
        const isKilled = this.applyDamage(enemy, damage);

        results.push({
          targetId: enemy.id,
          damage,
          isPerfect,
          isKilled
        });

        this.emitDamage({
          targetId: enemy.id,
          damage,
          source: 'player',
          position: { ...enemy.position }
        });

        if (isKilled) {
          this.emitEnemyDeath(enemy);
        }
      }
    }

    return results;
  }

  processEnemyAttack(
    enemy: Enemy,
    player: Player,
    attackRange: number = TILE_SIZE * 1.2
  ): number {
    const enemyCenter = this.getCenterPosition(enemy.position);
    const playerCenter = this.getCenterPosition(player.position);
    const distance = this.getDistance(enemyCenter, playerCenter);

    if (distance <= attackRange) {
      const damage = this.calculateDamage(enemy.attack);
      
      this.emitDamage({
        targetId: player.id,
        damage,
        source: 'enemy',
        position: { ...player.position }
      });

      return damage;
    }

    return 0;
  }

  processRhythmMiss(player: Player): number {
    const damage = Math.ceil(player.maxHealth * RHYTHM_MISS_DAMAGE_PERCENT);
    
    this.emitDamage({
      targetId: player.id,
      damage,
      source: 'rhythm_miss',
      position: { ...player.position }
    });

    return damage;
  }

  applyDamage(target: Player | Enemy, damage: number): boolean {
    target.health = Math.max(0, target.health - damage);
    return target.health <= 0;
  }

  healPlayer(player: Player, healPercent: number = 0.3): number {
    const healAmount = Math.ceil(player.maxHealth * healPercent);
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    return healAmount;
  }

  checkEnemyAttack(enemy: Enemy, beatsPerAttack: number = 4): boolean {
    return enemy.beatsSinceLastAttack >= beatsPerAttack;
  }

  resetEnemyAttackCounter(enemy: Enemy): void {
    enemy.beatsSinceLastAttack = 0;
  }

  incrementEnemyBeatCount(enemy: Enemy): void {
    enemy.beatsSinceLastAttack++;
  }

  spawnLoot(enemy: Enemy, dropChance: number = 0.4): Item | null {
    if (Math.random() > dropChance) return null;

    const itemTypes = [ItemType.ATTACK_BOOST, ItemType.SPEED_BOOST, ItemType.HEAL];
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: randomType,
      position: { ...enemy.position },
      isPickedUp: false,
      pickupAnimationProgress: 0
    };
  }

  applyItemEffect(player: Player, item: Item): { stat: string; value: number } {
    switch (item.type) {
      case ItemType.ATTACK_BOOST:
        const attackBoost = Math.ceil(player.attack * 0.1);
        player.attack += attackBoost;
        return { stat: 'attack', value: attackBoost };

      case ItemType.SPEED_BOOST:
        const speedBoost = Math.ceil(player.speed * 0.15);
        player.speed += speedBoost;
        return { stat: 'speed', value: speedBoost };

      case ItemType.HEAL:
        const healed = this.healPlayer(player, 0.3);
        return { stat: 'health', value: healed };

      default:
        return { stat: 'none', value: 0 };
    }
  }

  checkItemPickup(player: Player, item: Item, pickupRange: number = TILE_SIZE * 0.8): boolean {
    if (item.isPickedUp) return false;

    const playerCenter = this.getCenterPosition(player.position);
    const itemCenter = this.getCenterPosition(item.position);
    const distance = this.getDistance(playerCenter, itemCenter);

    return distance <= pickupRange;
  }

  spawnSpiderLings(parent: Enemy): Enemy[] {
    if (parent.type !== EnemyType.SPIDER) return [];

    const offset1 = { x: -TILE_SIZE * 0.3, y: -TILE_SIZE * 0.3 };
    const offset2 = { x: TILE_SIZE * 0.3, y: TILE_SIZE * 0.3 };

    const ling1: Enemy = {
      id: `spider_ling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: EnemyType.SPIDER_LING,
      position: {
        x: parent.position.x + offset1.x,
        y: parent.position.y + offset1.y
      },
      health: 15,
      maxHealth: 15,
      attack: 5,
      speed: parent.speed * 0.8,
      isFlashing: false,
      flashColor: '#a855f7',
      flashEndTime: 0,
      attackWarning: false,
      attackWarningEndTime: 0,
      moveDirection: { x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 },
      beatsSinceLastAttack: 0
    };

    const ling2: Enemy = {
      ...ling1,
      id: `spider_ling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: parent.position.x + offset2.x,
        y: parent.position.y + offset2.y
      }
    };

    return [ling1, ling2];
  }

  private getCenterPosition(pos: Position): Position {
    return {
      x: pos.x + TILE_SIZE / 2,
      y: pos.y + TILE_SIZE / 2
    };
  }

  private getDistance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  onDamage(callback: DamageCallback): () => void {
    this.damageCallbacks.add(callback);
    return () => this.damageCallbacks.delete(callback);
  }

  offDamage(callback: DamageCallback): void {
    this.damageCallbacks.delete(callback);
  }

  onEnemyDeath(callback: EnemyDeathCallback): () => void {
    this.enemyDeathCallbacks.add(callback);
    return () => this.enemyDeathCallbacks.delete(callback);
  }

  offEnemyDeath(callback: EnemyDeathCallback): void {
    this.enemyDeathCallbacks.delete(callback);
  }

  private emitDamage(event: DamageEvent): void {
    this.damageCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in damage callback:', error);
      }
    });
  }

  private emitEnemyDeath(enemy: Enemy): void {
    this.enemyDeathCallbacks.forEach(callback => {
      try {
        callback(enemy);
      } catch (error) {
        console.error('Error in enemy death callback:', error);
      }
    });
  }

  destroy(): void {
    this.damageCallbacks.clear();
    this.enemyDeathCallbacks.clear();
  }
}

export default CombatSystem;
