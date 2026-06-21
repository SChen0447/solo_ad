import type { Player, Monster, Card, Position, WeaknessType, Chest } from './types';
import type { GameBoard } from './GameBoard';

const WEAKNESS_MULTIPLIER = 1.75;
const RESISTANCE_MULTIPLIER = 0.5;

export interface CombatResult {
  killedMonsters: Monster[];
  playerMoved: boolean;
  playerDied: boolean;
  allMonstersDead: boolean;
  chestOpened: Chest | null;
  logMessages: string[];
}

export type AttackType = 'physical' | 'fire' | 'ranged';

export class CombatSystem {
  gameBoard: GameBoard;
  player: Player;
  monsters: Monster[];
  turnCount: number;
  killCount: number;
  onCombatEvent?: (event: string) => void;

  constructor(gameBoard: GameBoard, player: Player, monsters: Monster[]) {
    this.gameBoard = gameBoard;
    this.player = player;
    this.monsters = monsters;
    this.turnCount = 0;
    this.killCount = 0;
  }

  cardToAttackType(card: Card): AttackType | null {
    switch (card.type) {
      case 'melee':
      case 'dash':
        return 'physical';
      case 'fire':
        return 'fire';
      case 'ranged':
        return 'ranged';
      default:
        return null;
    }
  }

  calculateDamage(baseDamage: number, attackType: AttackType, monster: Monster): { damage: number; isWeak: boolean; isResist: boolean } {
    let multiplier = 1;
    let isWeak = false;
    let isResist = false;
    if (monster.weakness === attackType) {
      multiplier *= WEAKNESS_MULTIPLIER;
      isWeak = true;
    }
    if (monster.resistance === attackType) {
      multiplier *= RESISTANCE_MULTIPLIER;
      isResist = true;
    }
    return {
      damage: Math.max(1, Math.round(baseDamage * multiplier)),
      isWeak,
      isResist,
    };
  }

  async executeCard(card: Card, target: Position | null): Promise<CombatResult> {
    const result: CombatResult = {
      killedMonsters: [],
      playerMoved: false,
      playerDied: false,
      allMonstersDead: false,
      chestOpened: null,
      logMessages: [],
    };

    switch (card.type) {
      case 'move':
        if (target) {
          this.doMove(target.x, target.y);
          result.playerMoved = true;
          result.logMessages.push(`玩家移动到 (${target.x}, ${target.y})`);
        }
        break;

      case 'dash': {
        if (target) {
          const monsterAtTarget = this.getMonsterAt(target.x, target.y);
          if (monsterAtTarget) {
            const landingSpot = this.findAdjacentEmpty(this.player.x, this.player.y, target.x, target.y);
            if (landingSpot) {
              this.doMove(landingSpot.x, landingSpot.y);
              result.playerMoved = true;
            }
            const atkType = this.cardToAttackType(card)!;
            const { damage, isWeak, isResist } = this.calculateDamage(card.damage, atkType, monsterAtTarget);
            this.applyDamageToMonster(monsterAtTarget, damage, target.x, target.y, isWeak, isResist);
            this.gameBoard.addEffect({
              type: 'slash',
              x: this.player.x,
              y: this.player.y,
              targetX: target.x,
              targetY: target.y,
              duration: 0.3,
            });
            result.logMessages.push(`冲锋撞击 ${monsterAtTarget.name}，造成 ${damage} 点伤害${isWeak ? '（弱点！）' : isResist ? '（抗性）' : ''}`);
            if (monsterAtTarget.isDead) {
              result.killedMonsters.push(monsterAtTarget);
              this.killCount++;
            }
          } else {
            this.doMove(target.x, target.y);
            result.playerMoved = true;
            result.logMessages.push(`冲锋移动到 (${target.x}, ${target.y})`);
          }
        }
        break;
      }

      case 'melee':
        if (target) {
          const m = this.getMonsterAt(target.x, target.y);
          if (m) {
            const atkType = this.cardToAttackType(card)!;
            const { damage, isWeak, isResist } = this.calculateDamage(card.damage, atkType, m);
            this.applyDamageToMonster(m, damage, target.x, target.y, isWeak, isResist);
            this.gameBoard.addEffect({
              type: 'slash',
              x: this.player.x,
              y: this.player.y,
              targetX: target.x,
              targetY: target.y,
              duration: 0.3,
            });
            result.logMessages.push(`斩击 ${m.name}，造成 ${damage} 点伤害${isWeak ? '（弱点！）' : isResist ? '（抗性）' : ''}`);
            if (m.isDead) {
              result.killedMonsters.push(m);
              this.killCount++;
            }
          }
        }
        break;

      case 'ranged':
        if (target) {
          const m = this.getMonsterAt(target.x, target.y);
          if (m) {
            const atkType = this.cardToAttackType(card)!;
            const { damage, isWeak, isResist } = this.calculateDamage(card.damage, atkType, m);
            this.applyDamageToMonster(m, damage, target.x, target.y, isWeak, isResist);
            this.gameBoard.addEffect({
              type: 'arrow',
              x: this.player.x,
              y: this.player.y,
              targetX: target.x,
              targetY: target.y,
              duration: 0.25,
            });
            result.logMessages.push(`射击 ${m.name}，造成 ${damage} 点伤害${isWeak ? '（弱点！）' : isResist ? '（抗性）' : ''}`);
            if (m.isDead) {
              result.killedMonsters.push(m);
              this.killCount++;
            }
          }
        }
        break;

      case 'fire':
        if (target) {
          this.gameBoard.addEffect({
            type: 'fireball',
            x: this.player.x,
            y: this.player.y,
            targetX: target.x,
            targetY: target.y,
            duration: 0.4,
          });
          await this.sleep(400);
          const blastRadius = card.blastRadius || 2;
          this.gameBoard.addEffect({
            type: 'explosion',
            x: target.x,
            y: target.y,
            duration: 0.5,
            data: { blastRadius },
          });
          const affected = this.getMonstersInRadius(target.x, target.y, blastRadius);
          for (const m of affected) {
            const dist = Math.abs(m.x - target.x) + Math.abs(m.y - target.y);
            const falloff = 1 - Math.min(dist / blastRadius, 0.6);
            const atkType = this.cardToAttackType(card)!;
            const { damage, isWeak, isResist } = this.calculateDamage(Math.round(card.damage * falloff), atkType, m);
            this.applyDamageToMonster(m, damage, m.x, m.y, isWeak, isResist);
            result.logMessages.push(`火球术波及 ${m.name}，造成 ${damage} 点伤害${isWeak ? '（弱点！）' : isResist ? '（抗性）' : ''}`);
            if (m.isDead) {
              result.killedMonsters.push(m);
              this.killCount++;
            }
          }
        }
        break;

      case 'heal':
        if (target) {
          const healAmount = Math.abs(card.damage);
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
          this.gameBoard.addEffect({
            type: 'heal',
            x: this.player.x,
            y: this.player.y,
            duration: 0.8,
          });
          this.gameBoard.addFloatingText({
            x: this.player.x,
            y: this.player.y,
            text: `+${healAmount}`,
            color: '#68d391',
            progress: 0,
            duration: 0.9,
          });
          result.logMessages.push(`治疗术恢复 ${healAmount} 点生命值`);
        }
        break;
    }

    const aliveCount = this.monsters.filter(m => !m.isDead).length;
    result.allMonstersDead = aliveCount === 0;
    if (result.allMonstersDead) {
      const chest = this.gameBoard.chests.find(c => !c.opened);
      if (chest) {
        chest.opened = true;
        this.gameBoard.triggerChestAnimation(chest);
        result.chestOpened = chest;
      }
    }

    return result;
  }

  doMove(targetX: number, targetY: number): void {
    const from = { x: this.player.x, y: this.player.y };
    const to = { x: targetX, y: targetY };
    this.player.moveAnimFrom = from;
    this.player.moveAnimTo = to;
    this.player.moveAnimProgress = 0;
    this.player.x = targetX;
    this.player.y = targetY;
    this.animateMove();
  }

  animateMove(): void {
    const animate = () => {
      if (this.player.moveAnimProgress === undefined) return;
      this.player.moveAnimProgress += 16 / 280;
      if (this.player.moveAnimProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.player.moveAnimProgress = 1;
      }
    };
    requestAnimationFrame(animate);
  }

  findAdjacentEmpty(fromX: number, fromY: number, targetX: number, targetY: number): Position | null {
    const dx = Math.sign(targetX - fromX);
    const dy = Math.sign(targetY - fromY);
    const candidates: Position[] = [];
    if (dx !== 0) candidates.push({ x: targetX - dx, y: targetY });
    if (dy !== 0) candidates.push({ x: targetX, y: targetY - dy });
    candidates.push({ x: targetX - Math.sign(dx), y: targetY });
    candidates.push({ x: targetX, y: targetY - Math.sign(dy) });
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [ddx, ddy] of dirs) {
      candidates.push({ x: targetX + ddx, y: targetY + ddy });
    }
    for (const c of candidates) {
      if (this.gameBoard.isPassable(c.x, c.y, this.monsters)) {
        return c;
      }
    }
    return null;
  }

  getMonsterAt(x: number, y: number): Monster | null {
    return this.monsters.find(m => !m.isDead && m.x === x && m.y === y) || null;
  }

  getMonstersInRadius(cx: number, cy: number, radius: number): Monster[] {
    return this.monsters.filter(m => {
      if (m.isDead) return false;
      const dist = Math.abs(m.x - cx) + Math.abs(m.y - cy);
      return dist <= radius;
    });
  }

  applyDamageToMonster(monster: Monster, damage: number, x: number, y: number, isWeak: boolean, isResist: boolean): void {
    monster.hp = Math.max(0, monster.hp - damage);
    monster.hitFlashTimer = 150;
    const color = isWeak ? '#ecc94b' : isResist ? '#a0aec0' : '#fc8181';
    const prefix = isWeak ? '弱点!' : isResist ? '抵抗' : '';
    this.gameBoard.addFloatingText({
      x, y,
      text: `${prefix} -${damage}`,
      color,
      progress: 0,
      duration: 0.9,
    });
    if (monster.hp <= 0) {
      monster.isDead = true;
      this.gameBoard.addFloatingText({
        x, y,
        text: '击杀!',
        color: '#68d391',
        progress: 0,
        duration: 1.2,
      });
    }
  }

  async monstersTurn(): Promise<void> {
    this.turnCount++;
    for (const monster of this.monsters) {
      if (monster.isDead) continue;
      await this.sleep(250);
      const dist = Math.abs(monster.x - this.player.x) + Math.abs(monster.y - this.player.y);
      if (dist === 1) {
        this.monsterAttack(monster);
      } else {
        this.moveMonsterTowardsPlayer(monster);
        const newDist = Math.abs(monster.x - this.player.x) + Math.abs(monster.y - this.player.y);
        if (newDist === 1) {
          await this.sleep(200);
          this.monsterAttack(monster);
        }
      }
    }
  }

  moveMonsterTowardsPlayer(monster: Monster): void {
    const from = { x: monster.x, y: monster.y };
    const dx = this.player.x - monster.x;
    const dy = this.player.y - monster.y;
    const tries: Position[] = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx !== 0) tries.push({ x: monster.x + Math.sign(dx), y: monster.y });
      if (dy !== 0) tries.push({ x: monster.x, y: monster.y + Math.sign(dy) });
    } else {
      if (dy !== 0) tries.push({ x: monster.x, y: monster.y + Math.sign(dy) });
      if (dx !== 0) tries.push({ x: monster.x + Math.sign(dx), y: monster.y });
    }
    tries.push({ x: monster.x + 1, y: monster.y });
    tries.push({ x: monster.x - 1, y: monster.y });
    tries.push({ x: monster.x, y: monster.y + 1 });
    tries.push({ x: monster.x, y: monster.y - 1 });

    for (const t of tries) {
      if (t.x === this.player.x && t.y === this.player.y) continue;
      if (this.gameBoard.isPassable(t.x, t.y, this.monsters)) {
        monster.x = t.x;
        monster.y = t.y;
        break;
      }
    }
  }

  monsterAttack(monster: Monster): void {
    const baseDamage = monster.attack;
    const variance = Math.floor(Math.random() * 3) - 1;
    const damage = Math.max(3, baseDamage + variance);
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.hitFlashTimer = 200;
    this.gameBoard.addEffect({
      type: 'slash',
      x: monster.x,
      y: monster.y,
      targetX: this.player.x,
      targetY: this.player.y,
      duration: 0.25,
    });
    this.gameBoard.addFloatingText({
      x: this.player.x,
      y: this.player.y,
      text: `-${damage}`,
      color: '#fc8181',
      progress: 0,
      duration: 0.9,
    });
    if (this.onCombatEvent) {
      this.onCombatEvent(`${monster.name} 攻击玩家，造成 ${damage} 点伤害`);
    }
  }

  isPlayerDead(): boolean {
    return this.player.hp <= 0;
  }

  allMonstersDefeated(): boolean {
    return this.monsters.every(m => m.isDead);
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
