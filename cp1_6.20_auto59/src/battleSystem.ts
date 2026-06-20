export type EnemyState = 'spawning' | 'idle' | 'hit' | 'attacking' | 'dead';

export interface Enemy {
  name: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  state: EnemyState;
  stateTimer: number;
  color: string;
}

export interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  isPlayer: boolean;
  isSkill: boolean;
}

export interface BattleState {
  enemy: Enemy;
  playerHp: number;
  playerMaxHp: number;
  damageNumbers: DamageNumber[];
  playerActionTimer: number;
  enemyActionTimer: number;
  lastPlayerAction: 'none' | 'attack' | 'skill';
  battleEnded: boolean;
  victory: boolean;
}

const ENEMY_NAMES = ['史莱姆', '哥布林', '骷髅兵', '蝙蝠', '小恶魔', '树精'];
const ENEMY_COLORS = ['#4ade80', '#a3e635', '#f87171', '#c084fc', '#fb923c', '#60a5fa'];

export class BattleSystem {
  private state: BattleState;
  private damageIdCounter = 0;

  constructor() {
    this.state = {
      enemy: this.generateEnemy(),
      playerHp: 100,
      playerMaxHp: 100,
      damageNumbers: [],
      playerActionTimer: 0,
      enemyActionTimer: 0,
      lastPlayerAction: 'none',
      battleEnded: false,
      victory: false
    };
  }

  private generateEnemy(): Enemy {
    const idx = Math.floor(Math.random() * ENEMY_NAMES.length);
    const hp = 50 + Math.floor(Math.random() * 50);
    return {
      name: ENEMY_NAMES[idx],
      maxHp: hp,
      currentHp: hp,
      attack: 5 + Math.floor(Math.random() * 8),
      state: 'spawning',
      stateTimer: 0,
      color: ENEMY_COLORS[idx]
    };
  }

  getState(): BattleState {
    return this.state;
  }

  triggerAttack(emotionStrength: number, now: number): void {
    if (this.state.battleEnded) return;
    if (this.state.playerActionTimer > now) return;
    if (this.state.enemy.state === 'dead') return;

    const damage = Math.floor(emotionStrength * 10 * (0.8 + Math.random() * 0.4));
    this.applyDamageToEnemy(damage, now, false);
    this.state.lastPlayerAction = 'attack';
    this.state.playerActionTimer = now + 500;
  }

  triggerSkill(emotionStrength: number, now: number): void {
    if (this.state.battleEnded) return;
    if (this.state.playerActionTimer > now) return;
    if (this.state.enemy.state === 'dead') return;

    const damage = Math.floor(emotionStrength * 20 * (0.8 + Math.random() * 0.4));
    this.applyDamageToEnemy(damage, now, true);
    this.state.lastPlayerAction = 'skill';
    this.state.playerActionTimer = now + 800;
  }

  private applyDamageToEnemy(damage: number, now: number, isSkill: boolean): void {
    this.state.enemy.currentHp = Math.max(0, this.state.enemy.currentHp - damage);
    this.state.enemy.state = 'hit';
    this.state.enemy.stateTimer = now + 300;

    this.state.damageNumbers.push({
      id: this.damageIdCounter++,
      value: damage,
      x: 0,
      y: 0,
      startTime: now,
      duration: 1000,
      isPlayer: false,
      isSkill
    });

    if (this.state.enemy.currentHp <= 0) {
      this.state.enemy.state = 'dead';
      this.state.enemy.stateTimer = now + 1000;
      this.state.battleEnded = true;
      this.state.victory = true;
    }
  }

  update(now: number): void {
    this.state.damageNumbers = this.state.damageNumbers.filter(
      d => now - d.startTime < d.duration
    );

    const enemy = this.state.enemy;

    if (enemy.state === 'spawning' && enemy.stateTimer <= now) {
      enemy.state = 'idle';
    } else if (enemy.state === 'hit' && enemy.stateTimer <= now && enemy.currentHp > 0) {
      enemy.state = 'idle';
    } else if (enemy.state === 'attacking' && enemy.stateTimer <= now) {
      enemy.state = 'idle';
    }

    if (!this.state.battleEnded && enemy.state === 'idle' && this.state.enemyActionTimer <= now) {
      this.enemyAttack(now);
    }
  }

  private enemyAttack(now: number): void {
    const enemy = this.state.enemy;
    enemy.state = 'attacking';
    enemy.stateTimer = now + 500;

    const damage = Math.floor(enemy.attack * (0.8 + Math.random() * 0.4));
    this.state.playerHp = Math.max(0, this.state.playerHp - damage);

    this.state.damageNumbers.push({
      id: this.damageIdCounter++,
      value: damage,
      x: 0,
      y: 0,
      startTime: now + 250,
      duration: 1000,
      isPlayer: true,
      isSkill: false
    });

    this.state.enemyActionTimer = now + 2000 + Math.random() * 2000;

    if (this.state.playerHp <= 0) {
      this.state.battleEnded = true;
      this.state.victory = false;
    }
  }

  resetBattle(): void {
    this.state = {
      enemy: this.generateEnemy(),
      playerHp: 100,
      playerMaxHp: 100,
      damageNumbers: [],
      playerActionTimer: 0,
      enemyActionTimer: 0,
      lastPlayerAction: 'none',
      battleEnded: false,
      victory: false
    };
  }
}
