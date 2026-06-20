import { Character, Skill, Equipment, Rarity, createRandomEquipment, EquipmentSlot } from './character';

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  critRate: number;
  isAlive: boolean;
  sprite: string;
  isBoss?: boolean;
}

export interface BattleState {
  isActive: boolean;
  turn: 'player' | 'enemy';
  currentCharacterIndex: number;
  playerParty: Character[];
  enemies: Enemy[];
  selectedSkill: Skill | null;
  selectedCharacter: Character | null;
  isAnimating: boolean;
  battleLog: string[];
}

export interface LootItem {
  item: Equipment;
  quantity: number;
}

export class BattleManager {
  private state: BattleState;
  private onBattleEnd: ((victory: boolean, loot: LootItem[]) => void) | null = null;
  private onUpdate: (() => void) | null = null;
  private onSkillAnimation: ((skill: Skill, caster: Character | Enemy, target: Character | Enemy) => void) | null = null;

  constructor() {
    this.state = {
      isActive: false,
      turn: 'player',
      currentCharacterIndex: 0,
      playerParty: [],
      enemies: [],
      selectedSkill: null,
      selectedCharacter: null,
      isAnimating: false,
      battleLog: []
    };
  }

  public setOnBattleEnd(callback: (victory: boolean, loot: LootItem[]) => void): void {
    this.onBattleEnd = callback;
  }

  public setOnUpdate(callback: () => void): void {
    this.onUpdate = callback;
  }

  public setOnSkillAnimation(callback: (skill: Skill, caster: Character | Enemy, target: Character | Enemy) => void): void {
    this.onSkillAnimation = callback;
  }

  public getState(): BattleState {
    return this.state;
  }

  public startBattle(playerParty: Character[], enemyCount: number = 3, isBoss: boolean = false): void {
    this.state.isActive = true;
    this.state.turn = 'player';
    this.state.currentCharacterIndex = 0;
    this.state.playerParty = playerParty.filter(c => c.isAlive);
    this.state.enemies = this.generateEnemies(enemyCount, isBoss);
    this.state.selectedSkill = null;
    this.state.selectedCharacter = null;
    this.state.isAnimating = false;
    this.state.battleLog = ['战斗开始！'];

    for (const char of this.state.playerParty) {
      for (const skill of char.skills) {
        skill.currentCooldown = 0;
      }
    }

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  private generateEnemies(count: number, isBoss: boolean): Enemy[] {
    const enemies: Enemy[] = [];
    
    if (isBoss) {
      enemies.push({
        id: `boss_${Date.now()}`,
        name: '地牢领主',
        maxHp: 500,
        currentHp: 500,
        attack: 35,
        defense: 20,
        critRate: 0.15,
        isAlive: true,
        sprite: 'boss',
        isBoss: true
      });
      
      for (let i = 0; i < 2; i++) {
        enemies.push({
          id: `enemy_${Date.now()}_${i}`,
          name: '精英护卫',
          maxHp: 100,
          currentHp: 100,
          attack: 20,
          defense: 10,
          critRate: 0.1,
          isAlive: true,
          sprite: 'elite'
        });
      }
    } else {
      const enemyTypes = [
        { name: '哥布林', hp: 60, atk: 15, def: 5, crit: 0.05, sprite: 'goblin' },
        { name: '骷髅兵', hp: 80, atk: 18, def: 8, crit: 0.08, sprite: 'skeleton' },
        { name: '史莱姆', hp: 50, atk: 10, def: 3, crit: 0.02, sprite: 'slime' },
        { name: '蝙蝠', hp: 40, atk: 12, def: 2, crit: 0.15, sprite: 'bat' }
      ];

      for (let i = 0; i < count; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        enemies.push({
          id: `enemy_${Date.now()}_${i}`,
          name: type.name,
          maxHp: type.hp,
          currentHp: type.hp,
          attack: type.atk,
          defense: type.def,
          critRate: type.crit,
          isAlive: true,
          sprite: type.sprite
        });
      }
    }

    return enemies;
  }

  public selectSkill(skill: Skill, character: Character): void {
    if (this.state.turn !== 'player' || this.state.isAnimating) return;
    if (!character.canUseSkill(skill.id)) return;

    this.state.selectedSkill = skill;
    this.state.selectedCharacter = character;

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  public useSkillOnTarget(target: Enemy | Character): void {
    if (!this.state.selectedSkill || !this.state.selectedCharacter) return;
    if (this.state.isAnimating) return;

    const skill = this.state.selectedSkill;
    const caster = this.state.selectedCharacter;

    if (!caster.useMana(skill.manaCost)) {
      this.addLog(`法力不足，无法使用 ${skill.name}`);
      return;
    }

    this.state.isAnimating = true;

    if (skill.target === 'all') {
      if (skill.type === 'attack') {
        for (const enemy of this.state.enemies.filter(e => e.isAlive)) {
          this.executeAttack(skill, caster, enemy);
        }
      } else if (skill.type === 'heal') {
        for (const ally of this.state.playerParty.filter(c => c.isAlive)) {
          this.executeHeal(skill, caster, ally);
        }
      }
    } else if (skill.target === 'single') {
      if (skill.type === 'attack' || skill.type === 'debuff') {
        this.executeAttack(skill, caster, target as Enemy);
      } else if (skill.type === 'heal' || skill.type === 'buff') {
        this.executeHeal(skill, caster, target as Character);
      }
    } else if (skill.target === 'self') {
      this.executeHeal(skill, caster, caster);
    }

    for (const s of caster.skills) {
      if (s.id === skill.id && s.cooldown > 0) {
        s.currentCooldown = s.cooldown;
      }
    }

    if (this.onSkillAnimation) {
      this.onSkillAnimation(skill, caster, target);
    }

    setTimeout(() => {
      this.state.isAnimating = false;
      this.state.selectedSkill = null;
      this.state.selectedCharacter = null;
      this.checkBattleEnd();

      if (this.state.isActive && this.state.turn === 'player') {
        this.nextPlayerTurn();
      }

      if (this.onUpdate) {
        this.onUpdate();
      }
    }, 600);
  }

  private executeAttack(skill: Skill, attacker: Character | Enemy, target: Enemy | Character): void {
    const baseDamage = 'attack' in attacker ? attacker.attack * skill.damage : 0;
    const isCrit = Math.random() < (attacker as Character).critRate;
    const critMultiplier = isCrit ? 1.5 : 1;
    const finalDamage = Math.floor(baseDamage * critMultiplier);

    const actualDamage = 'takeDamage' in target 
      ? (target as Character).takeDamage(finalDamage) 
      : this.damageEnemy(target as Enemy, finalDamage);

    const critText = isCrit ? '【暴击！】' : '';
    this.addLog(`${attacker.name} 使用 ${skill.name} 对 ${target.name} 造成 ${actualDamage} 点伤害${critText}`);
  }

  private executeHeal(skill: Skill, caster: Character, target: Character): void {
    const healAmount = Math.floor(Math.abs(skill.damage) * caster.attack);
    const actualHeal = target.heal(healAmount);
    this.addLog(`${caster.name} 使用 ${skill.name} 为 ${target.name} 恢复 ${actualHeal} 点生命`);
  }

  private damageEnemy(enemy: Enemy, damage: number): number {
    const actualDamage = Math.max(1, damage - enemy.defense);
    enemy.currentHp = Math.max(0, enemy.currentHp - actualDamage);
    if (enemy.currentHp <= 0) {
      enemy.isAlive = false;
      this.addLog(`${enemy.name} 被击败了！`);
    }
    return actualDamage;
  }

  private nextPlayerTurn(): void {
    let nextIndex = this.state.currentCharacterIndex + 1;
    
    while (nextIndex < this.state.playerParty.length) {
      if (this.state.playerParty[nextIndex].isAlive) {
        this.state.currentCharacterIndex = nextIndex;
        return;
      }
      nextIndex++;
    }

    this.state.turn = 'enemy';
    this.state.currentCharacterIndex = 0;
    
    setTimeout(() => {
      this.executeEnemyTurn();
    }, 500);
  }

  private executeEnemyTurn(): void {
    const aliveEnemies = this.state.enemies.filter(e => e.isAlive);
    
    if (aliveEnemies.length === 0) {
      this.endBattle(true);
      return;
    }

    let enemyIndex = 0;

    const executeNextEnemy = () => {
      if (enemyIndex >= aliveEnemies.length) {
        for (const char of this.state.playerParty) {
          char.reduceCooldowns();
        }
        
        this.state.turn = 'player';
        this.state.currentCharacterIndex = 0;
        
        while (this.state.currentCharacterIndex < this.state.playerParty.length &&
               !this.state.playerParty[this.state.currentCharacterIndex].isAlive) {
          this.state.currentCharacterIndex++;
        }
        
        if (this.onUpdate) {
          this.onUpdate();
        }
        return;
      }

      const enemy = aliveEnemies[enemyIndex];
      const alivePlayers = this.state.playerParty.filter(c => c.isAlive);
      
      if (alivePlayers.length > 0) {
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const isCrit = Math.random() < enemy.critRate;
        const baseDamage = enemy.attack * (isCrit ? 1.5 : 1);
        const actualDamage = target.takeDamage(Math.floor(baseDamage));
        
        const critText = isCrit ? '【暴击！】' : '';
        this.addLog(`${enemy.name} 攻击 ${target.name}，造成 ${actualDamage} 点伤害${critText}`);
        
        if (!target.isAlive) {
          this.addLog(`${target.name} 倒下了！`);
        }
      }

      enemyIndex++;
      
      if (this.onUpdate) {
        this.onUpdate();
      }
      
      this.checkBattleEnd();
      
      if (this.state.isActive) {
        setTimeout(executeNextEnemy, 600);
      }
    };

    executeNextEnemy();
  }

  private checkBattleEnd(): void {
    const aliveEnemies = this.state.enemies.filter(e => e.isAlive);
    const alivePlayers = this.state.playerParty.filter(c => c.isAlive);

    if (aliveEnemies.length === 0) {
      this.endBattle(true);
    } else if (alivePlayers.length === 0) {
      this.endBattle(false);
    }
  }

  private endBattle(victory: boolean): void {
    this.state.isActive = false;
    
    let loot: LootItem[] = [];
    
    if (victory) {
      this.addLog('战斗胜利！');
      loot = this.generateLoot();
    } else {
      this.addLog('战斗失败...');
    }

    if (this.onBattleEnd) {
      this.onBattleEnd(victory, loot);
    }

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  private generateLoot(): LootItem[] {
    const loot: LootItem[] = [];
    const hasBoss = this.state.enemies.some(e => e.isBoss);
    
    const itemCount = hasBoss ? 3 : 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < itemCount; i++) {
      const slots = [EquipmentSlot.WEAPON, EquipmentSlot.ARMOR, EquipmentSlot.ACCESSORY];
      const slot = slots[Math.floor(Math.random() * slots.length)];
      const minRarity = hasBoss ? Rarity.RARE : Rarity.COMMON;
      const equipment = createRandomEquipment(slot, minRarity);
      
      loot.push({
        item: equipment,
        quantity: 1
      });
    }

    return loot;
  }

  public addLog(message: string): void {
    this.state.battleLog.push(message);
    if (this.state.battleLog.length > 50) {
      this.state.battleLog.shift();
    }
  }

  public isPlayerTurn(): boolean {
    return this.state.turn === 'player' && !this.state.isAnimating && this.state.isActive;
  }

  public getCurrentPlayerCharacter(): Character | null {
    if (this.state.turn !== 'player') return null;
    if (this.state.currentCharacterIndex >= this.state.playerParty.length) return null;
    return this.state.playerParty[this.state.currentCharacterIndex] || null;
  }
}
