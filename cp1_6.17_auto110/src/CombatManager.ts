import { SkillTier, DiceType } from './DiceEngine';

export type SkillType = 'heal' | 'empower' | 'weaken';
export type GamePhase = 'select' | 'rolling' | 'resolving' | 'enemy_turn' | 'game_over';
export type CombatSide = 'player' | 'enemy';

export interface SkillState {
  type: SkillType;
  name: string;
  cooldownRemaining: number;
  cooldownMax: number;
  tier: SkillTier;
  active: boolean;
}

export interface BuffState {
  empowerRemaining: number;
  weakenRemaining: number;
  empowerMultiplier: number;
  weakenMultiplier: number;
}

export interface CharacterState {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  energy: number;
  maxEnergy: number;
  weaponCoef: number;
  armorCoef: number;
}

export interface CombatStats {
  startTime: number;
  totalTurns: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
}

export interface TurnResult {
  playerAttackRoll: number;
  playerDefenseRoll: number;
  playerSkillRoll: number;
  playerAttackDamage: number;
  playerDamageReduced: number;
  playerIsCritical: boolean;
  enemyAttackRolls: number[];
  enemyDefenseRoll: number;
  enemyAttackDamage: number;
  enemyDamageReduced: number;
  triggeredSkill: SkillType | null;
  skillTier: SkillTier;
  summaryText: string;
}

export class CombatManager {
  public player: CharacterState;
  public enemy: CharacterState;
  public currentPhase: GamePhase;
  public currentTurn: number;
  public skills: SkillState[];
  public buffs: BuffState;
  public stats: CombatStats;
  public selectedSkill: SkillType | null;
  public turnResult: TurnResult | null;
  public winner: CombatSide | null;

  private static readonly INITIAL_PLAYER_HP = 100;
  private static readonly INITIAL_ENEMY_HP = 80;
  private static readonly SKILL_COOLDOWN = 2;
  private static readonly ENERGY_MAX = 100;

  constructor() {
    this.player = this.createPlayer();
    this.enemy = this.createEnemy();
    this.currentPhase = 'select';
    this.currentTurn = 1;
    this.skills = this.createSkills();
    this.buffs = this.createEmptyBuffs();
    this.stats = this.createEmptyStats();
    this.selectedSkill = null;
    this.turnResult = null;
    this.winner = null;
  }

  private createPlayer(): CharacterState {
    return {
      name: '勇者',
      hp: CombatManager.INITIAL_PLAYER_HP,
      maxHp: CombatManager.INITIAL_PLAYER_HP,
      attack: 10,
      defense: 5,
      energy: 0,
      maxEnergy: CombatManager.ENERGY_MAX,
      weaponCoef: 1.0,
      armorCoef: 0.5
    };
  }

  private createEnemy(): CharacterState {
    return {
      name: '暗影魔',
      hp: CombatManager.INITIAL_ENEMY_HP,
      maxHp: CombatManager.INITIAL_ENEMY_HP,
      attack: 8,
      defense: 4,
      energy: 0,
      maxEnergy: CombatManager.ENERGY_MAX,
      weaponCoef: 1.0,
      armorCoef: 0.5
    };
  }

  private createSkills(): SkillState[] {
    return [
      { type: 'heal', name: '治疗术', cooldownRemaining: 0, cooldownMax: CombatManager.SKILL_COOLDOWN, tier: null, active: false },
      { type: 'empower', name: '力量强化', cooldownRemaining: 0, cooldownMax: CombatManager.SKILL_COOLDOWN, tier: null, active: false },
      { type: 'weaken', name: '破甲削弱', cooldownRemaining: 0, cooldownMax: CombatManager.SKILL_COOLDOWN, tier: null, active: false }
    ];
  }

  private createEmptyBuffs(): BuffState {
    return {
      empowerRemaining: 0,
      weakenRemaining: 0,
      empowerMultiplier: 1.5,
      weakenMultiplier: 0.5
    };
  }

  private createEmptyStats(): CombatStats {
    return {
      startTime: performance.now(),
      totalTurns: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0
    };
  }

  public reset(): void {
    this.player = this.createPlayer();
    this.enemy = this.createEnemy();
    this.currentPhase = 'select';
    this.currentTurn = 1;
    this.skills = this.createSkills();
    this.buffs = this.createEmptyBuffs();
    this.stats = this.createEmptyStats();
    this.selectedSkill = null;
    this.turnResult = null;
    this.winner = null;
  }

  public setPhase(phase: GamePhase): void {
    this.currentPhase = phase;
  }

  public canSelectSkill(type: SkillType): boolean {
    if (this.currentTurn < 3) return false;
    const skill = this.skills.find(s => s.type === type);
    if (!skill) return false;
    return skill.cooldownRemaining === 0;
  }

  public selectSkill(type: SkillType | null): boolean {
    if (type === null) {
      this.selectedSkill = null;
      return true;
    }
    if (!this.canSelectSkill(type)) return false;
    this.selectedSkill = type;
    return true;
  }

  public getAvailableSkillsByTier(tier: SkillTier): SkillState[] {
    if (tier === null) return [];
    const tierOrder: SkillTier[] = ['small', 'medium', 'large'];
    const tierIndex = tierOrder.indexOf(tier);

    const skillTierMap: Record<SkillType, SkillTier> = {
      heal: 'small',
      empower: 'medium',
      weaken: 'large'
    };

    return this.skills.filter(s => {
      if (s.cooldownRemaining > 0) return false;
      const skillTierIndex = tierOrder.indexOf(skillTierMap[s.type]);
      return skillTierIndex <= tierIndex;
    });
  }

  public resolveTurn(
    playerAttackRoll: number,
    playerDefenseRoll: number,
    playerSkillRoll: number,
    enemyAttackRolls: number[],
    enemyDefenseRoll: number,
    skillTier: SkillTier
  ): TurnResult {
    const playerAttackMultiplier = this.buffs.empowerRemaining > 0 ? this.buffs.empowerMultiplier : 1.0;
    const enemyDefenseMultiplier = this.buffs.weakenRemaining > 0 ? this.buffs.weakenMultiplier : 1.0;

    const enemyDefenseValue = this.enemy.defense * enemyDefenseMultiplier;
    const playerRawAttack = this.player.attack * playerAttackMultiplier * playerAttackRoll;
    const playerDamageToEnemy = Math.max(0, playerRawAttack - enemyDefenseValue * enemyDefenseRoll * this.enemy.armorCoef);

    const enemyRawAttack = enemyAttackRolls.reduce((sum, roll) => sum + this.enemy.attack * roll, 0);
    const playerDefenseValue = this.player.defense * this.player.armorCoef * playerDefenseRoll;
    const enemyDamageToPlayer = Math.max(0, enemyRawAttack - playerDefenseValue);

    let triggeredSkill: SkillType | null = null;
    let skillHealAmount = 0;

    if (skillTier !== null && this.selectedSkill !== null) {
      const skill = this.skills.find(s => s.type === this.selectedSkill);
      if (skill && skill.cooldownRemaining === 0) {
        triggeredSkill = this.selectedSkill;
        skill.cooldownRemaining = skill.cooldownMax + 1;

        switch (skill.type) {
          case 'heal':
            skillHealAmount = Math.floor(this.player.maxHp * 0.2);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + skillHealAmount);
            break;
          case 'empower':
            this.buffs.empowerRemaining = 1;
            break;
          case 'weaken':
            this.buffs.weakenRemaining = 1;
            break;
        }
      }
    }

    const finalDamageToEnemy = Math.floor(playerDamageToEnemy);
    const finalDamageToPlayer = Math.floor(enemyDamageToPlayer);

    this.enemy.hp = Math.max(0, this.enemy.hp - finalDamageToEnemy);
    this.player.hp = Math.max(0, this.player.hp - finalDamageToPlayer);

    if (playerAttackRoll > 0) this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 10);
    if (playerDefenseRoll > 0) this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 10);
    if (triggeredSkill) this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 10);

    this.stats.totalTurns = this.currentTurn;
    this.stats.totalDamageDealt += finalDamageToEnemy;
    this.stats.totalDamageTaken += finalDamageToPlayer;

    const summaryParts: string[] = [];
    summaryParts.push(`${this.player.name}造成${finalDamageToEnemy}点伤害`);
    if (playerAttackRoll > 5) summaryParts.push(`暴击!`);
    summaryParts.push(`${this.enemy.name}造成${finalDamageToPlayer}点伤害`);
    if (triggeredSkill === 'heal') summaryParts.push(`${this.player.name}回复${skillHealAmount}生命`);
    if (triggeredSkill === 'empower') summaryParts.push(`力量强化激活`);
    if (triggeredSkill === 'weaken') summaryParts.push(`破甲削弱生效`);
    if (finalDamageToEnemy > finalDamageToPlayer && finalDamageToEnemy > 0) summaryParts.push(`${this.player.name}占据上风！`);
    if (finalDamageToPlayer > finalDamageToEnemy && finalDamageToPlayer > 0) summaryParts.push(`小心！敌方攻势凶猛`);

    this.turnResult = {
      playerAttackRoll,
      playerDefenseRoll,
      playerSkillRoll,
      playerAttackDamage: finalDamageToEnemy,
      playerDamageReduced: Math.min(enemyRawAttack, playerDefenseValue),
      playerIsCritical: playerAttackRoll > 5,
      enemyAttackRolls,
      enemyDefenseRoll,
      enemyAttackDamage: finalDamageToPlayer,
      enemyDamageReduced: Math.min(playerRawAttack, enemyDefenseValue * enemyDefenseRoll * this.enemy.armorCoef),
      triggeredSkill,
      skillTier,
      summaryText: summaryParts.join(' ｜ ')
    };

    this.selectedSkill = null;

    this.checkGameOver();

    return this.turnResult;
  }

  public endTurn(): void {
    this.skills.forEach(s => {
      if (s.cooldownRemaining > 0) s.cooldownRemaining--;
    });

    if (this.buffs.empowerRemaining > 0) this.buffs.empowerRemaining--;
    if (this.buffs.weakenRemaining > 0) this.buffs.weakenRemaining--;

    this.currentTurn++;
  }

  private checkGameOver(): void {
    if (this.enemy.hp <= 0) {
      this.winner = 'player';
      this.currentPhase = 'game_over';
    } else if (this.player.hp <= 0) {
      this.winner = 'enemy';
      this.currentPhase = 'game_over';
    }
  }

  public getCombatDuration(): number {
    return Math.floor((performance.now() - this.stats.startTime) / 1000);
  }

  public getEnemyDiceTypes(): DiceType[] {
    return ['attack', 'attack', 'defense'];
  }

  public isPlayerHpLow(): boolean {
    return this.player.hp / this.player.maxHp <= 0.3;
  }
}
