import { useBattleStore } from '../store/battleStore';
import { bossAI } from './bossAI';
import { generateBoss, generateMinion, getResistByElement } from './bossGenerator';
import type { PlayerAction, ElementType, Skill, Player } from '../types';

const PLAYER_SKILLS: Skill[] = [
  { id: 'fireball', name: '火球术', element: 'fire', baseDamage: 60, cooldown: 3000, description: '发射火球' },
  { id: 'ice_spike', name: '冰锥术', element: 'ice', baseDamage: 55, cooldown: 2500, description: '发射冰锥' },
  { id: 'lightning_bolt', name: '闪电箭', element: 'lightning', baseDamage: 65, cooldown: 2800, description: '发射闪电' }
];

export class BattleManager {
  private bossActionTimer: number = 0;
  private balanceMessageTimer: number = 0;

  public calculateDamage(
    attackerAttack: number,
    defenderDefense: number,
    elementResist: number,
    skill?: Skill,
    isEnraged: boolean = false
  ): { damage: number; isCrit: boolean; stunned: boolean } {
    let baseDamage = skill ? skill.baseDamage : attackerAttack * 0.8;
    const attackMultiplier = isEnraged ? 2 : 1;
    baseDamage *= attackMultiplier;

    const defenseReduction = defenderDefense / (defenderDefense + 100);
    const resistReduction = elementResist / 100;

    const randomFactor = 0.9 + Math.random() * 0.2;
    const isCrit = Math.random() < 0.15;
    const critMultiplier = isCrit ? 1.5 : 1;

    const damage = Math.floor(
      baseDamage *
      (1 - defenseReduction) *
      (1 - resistReduction) *
      randomFactor *
      critMultiplier
    );

    const stunned = elementResist > 50 && Math.random() < 0.3;

    return { damage: Math.max(1, damage), isCrit, stunned };
  }

  public handlePlayerAction(action: PlayerAction): void {
    const state = useBattleStore.getState();
    const { player, isPlayerTurn, battleResult } = state;

    if (battleResult !== null) return;
    if (!isPlayerTurn || player.actionCooldown > 0) return;

    useBattleStore.getState().handlePlayerAction(action);

    switch (action.type) {
      case 'attack':
        this.executePlayerAttack();
        break;
      case 'dodge':
        this.executePlayerDodge();
        break;
      case 'skill':
        if (action.skillId) {
          this.executePlayerSkill(action.skillId);
        }
        break;
    }

    this.checkBattleEnd();
    if (useBattleStore.getState().battleResult === null) {
      useBattleStore.getState().setIsPlayerTurn(false);
      this.bossActionTimer = 1500;
    }
  }

  private executePlayerAttack(): void {
    const state = useBattleStore.getState();
    const { player, boss } = state;

    const resist = getResistByElement(boss, 'fire');
    const { damage, isCrit, stunned } = this.calculateDamage(
      player.attack,
      boss.state === 'defend' ? boss.defense * 2 : boss.defense,
      resist * 0.5
    );

    useBattleStore.getState().updateBossHp(damage);
    useBattleStore.getState().addDamageNumber({
      value: damage,
      x: boss.position.x,
      y: boss.position.y - 50,
      opacity: 1,
      isCrit
    });
    useBattleStore.getState().setScreenShake(isCrit ? 15 : 8);
    useBattleStore.getState().addBattleLog({
      message: `你对 ${boss.name} 造成了 ${damage} 点物理伤害`,
      type: 'damage'
    });

    if (stunned && boss.stunDuration <= 0) {
      useBattleStore.getState().setBossStun(2000);
      useBattleStore.getState().addBattleLog({
        message: `${boss.name} 被眩晕了！`,
        type: 'state'
      });
    }
  }

  private executePlayerDodge(): void {
    const state = useBattleStore.getState();
    if (state.player.dodgeCooldown > 0) return;

    useBattleStore.setState((prev) => ({
      player: { ...prev.player, dodgeCooldown: 5000 }
    }));
    useBattleStore.getState().addBattleLog({
      message: '你进入闪避姿态，下次伤害减半',
      type: 'state'
    });
  }

  private executePlayerSkill(skillId: string): void {
    const state = useBattleStore.getState();
    const { player, boss } = state;

    const skill = PLAYER_SKILLS.find(s => s.id === skillId);
    if (!skill) return;
    if (player.skillCooldowns[skillId] > 0) return;

    useBattleStore.setState((prev) => ({
      player: {
        ...prev.player,
        skillCooldowns: {
          ...prev.player.skillCooldowns,
          [skillId]: skill.cooldown
        }
      }
    }));

    const resist = getResistByElement(boss, skill.element);
    const { damage, isCrit, stunned } = this.calculateDamage(
      player.attack,
      boss.state === 'defend' ? boss.defense * 2 : boss.defense,
      resist,
      skill
    );

    useBattleStore.getState().updateBossHp(damage);
    useBattleStore.getState().addSkillEffect({
      type: skill.element,
      x: boss.position.x,
      y: boss.position.y,
      duration: 1000,
      maxDuration: 1000
    });
    useBattleStore.getState().addDamageNumber({
      value: damage,
      x: boss.position.x,
      y: boss.position.y - 60,
      opacity: 1,
      isCrit,
      element: skill.element
    });
    useBattleStore.getState().setScreenShake(isCrit ? 20 : 12);
    useBattleStore.getState().addBattleLog({
      message: `你使用 ${skill.name} 对 ${boss.name} 造成了 ${damage} 点${this.getElementName(skill.element)}伤害`,
      type: 'damage'
    });

    if (stunned && boss.stunDuration <= 0) {
      useBattleStore.getState().setBossStun(2000);
      useBattleStore.getState().addBattleLog({
        message: `${boss.name} 被${this.getElementName(skill.element)}眩晕了！`,
        type: 'state'
      });
    }
  }

  private getElementName(element: ElementType): string {
    switch (element) {
      case 'fire': return '火焰';
      case 'ice': return '冰霜';
      case 'lightning': return '雷电';
    }
  }

  private executeBossTurn(): void {
    const state = useBattleStore.getState();
    const { boss } = state;

    if (boss.stunDuration > 0) {
      useBattleStore.getState().addBattleLog({
        message: `${boss.name} 处于眩晕状态，无法行动`,
        type: 'state'
      });
      useBattleStore.getState().setIsPlayerTurn(true);
      return;
    }

    const behavior = bossAI.generateBehavior(state, Date.now());

    if (behavior.state !== boss.state) {
      useBattleStore.getState().setBossTransitioning(true);
      useBattleStore.getState().updateBossState(behavior);
      useBattleStore.getState().addBattleLog({
        message: `${boss.name} 进入 ${bossAI.getStateDisplayText(behavior.state)} 状态`,
        type: 'state'
      });
      setTimeout(() => {
        useBattleStore.getState().setBossTransitioning(false);
      }, 1500);
    }

    setTimeout(() => {
      this.executeBossAction(behavior);
      this.checkBattleEnd();
      if (useBattleStore.getState().battleResult === null) {
        useBattleStore.getState().setIsPlayerTurn(true);
      }
    }, 800);
  }

  private executeBossAction(behavior: ReturnType<typeof bossAI.generateBehavior>): void {
    const state = useBattleStore.getState();
    const { boss, player } = state;

    const isEnraged = boss.state === 'enrage';
    const defenseMultiplier = player.dodgeCooldown > 4000 ? 2 : 1;

    switch (behavior.state) {
      case 'attack':
      case 'enrage': {
        const skill = behavior.targetSkill;
        const playerResist = 30;

        const { damage, isCrit } = this.calculateDamage(
          boss.attack,
          player.defense * defenseMultiplier,
          playerResist,
          skill,
          isEnraged
        );

        if (skill) {
          useBattleStore.getState().addSkillEffect({
            type: skill.element,
            x: player.position.x,
            y: player.position.y,
            duration: 1000,
            maxDuration: 1000
          });
        }

        useBattleStore.getState().updatePlayerHp(damage);
        useBattleStore.getState().addDamageNumber({
          value: damage,
          x: player.position.x,
          y: player.position.y - 40,
          opacity: 1,
          isCrit,
          element: skill?.element
        });
        useBattleStore.getState().setScreenShake(isCrit ? 18 : 10);
        useBattleStore.getState().addBattleLog({
          message: `${boss.name} ${isEnraged ? '狂暴地' : ''}使用 ${skill?.name || '普通攻击'} 对你造成了 ${damage} 点伤害`,
          type: 'damage'
        });
        break;
      }
      case 'defend': {
        const healAmount = Math.floor(boss.maxHp * 0.03);
        useBattleStore.getState().updatePlayerHp(-healAmount, true);
        useBattleStore.getState().addDamageNumber({
          value: -healAmount,
          x: boss.position.x,
          y: boss.position.y - 40,
          opacity: 1,
          isCrit: false
        });
        useBattleStore.getState().addBattleLog({
          message: `${boss.name} 进入防御姿态，恢复了 ${healAmount} 点生命值`,
          type: 'heal'
        });
        break;
      }
      case 'summon': {
        const aliveMinions = state.minions.filter(m => m.alive).length;
        if (aliveMinions < 2) {
          const angle1 = Math.PI * 0.75;
          const angle2 = Math.PI * 1.25;
          const distance = 100;

          if (aliveMinions === 0) {
            const minion1 = generateMinion(boss, {
              x: boss.position.x + Math.cos(angle1) * distance,
              y: boss.position.y + Math.sin(angle1) * distance
            });
            useBattleStore.getState().addMinion(minion1);
          }

          const minion2 = generateMinion(boss, {
            x: boss.position.x + Math.cos(angle2) * distance,
            y: boss.position.y + Math.sin(angle2) * distance
          });
          useBattleStore.getState().addMinion(minion2);

          useBattleStore.getState().addBattleLog({
            message: `${boss.name} 召唤了小怪助战！`,
            type: 'state'
          });
        }
        break;
      }
      case 'idle':
        useBattleStore.getState().addBattleLog({
          message: `${boss.name} 正在观察你的动作`,
          type: 'state'
        });
        break;
    }

    state.minions.filter(m => m.alive).forEach(minion => {
      const minionDamage = Math.floor(minion.attack * (0.8 + Math.random() * 0.4) / defenseMultiplier);
      useBattleStore.getState().updatePlayerHp(minionDamage);
      useBattleStore.getState().addDamageNumber({
        value: minionDamage,
        x: player.position.x + (Math.random() - 0.5) * 30,
        y: player.position.y - 30,
        opacity: 1,
        isCrit: false
      });
      useBattleStore.getState().addBattleLog({
        message: `小怪对你造成了 ${minionDamage} 点伤害`,
        type: 'damage'
      });
    });
  }

  private checkBattleEnd(): void {
    const state = useBattleStore.getState();
    const { player, boss } = state;

    if (boss.currentHp <= 0 && state.battleResult === null) {
      useBattleStore.getState().setBattleResult('victory');
      useBattleStore.getState().incrementConsecutiveWins();
      useBattleStore.getState().addBattleLog({
        message: `战斗胜利！你击败了 ${boss.name}！`,
        type: 'system'
      });
      this.adjustDifficulty();
    } else if (player.currentHp <= 0 && state.battleResult === null) {
      useBattleStore.getState().setBattleResult('defeat');
      useBattleStore.getState().incrementConsecutiveLosses();
      useBattleStore.getState().addBattleLog({
        message: '战斗失败...你被击败了',
        type: 'system'
      });
      this.adjustDifficulty();
    }
  }

  private adjustDifficulty(): void {
    const state = useBattleStore.getState();

    if (state.consecutiveLosses >= 3) {
      const newModifier = state.difficultyModifier * 0.85;
      useBattleStore.getState().setDifficultyModifier(newModifier);
      useBattleStore.getState().setBalanceAdjustmentMessage('战斗平衡已调整：Boss属性降低15%');
      this.balanceMessageTimer = 5000;
      useBattleStore.getState().resetConsecutiveCounts();
    } else if (state.consecutiveWins >= 2) {
      const newModifier = state.difficultyModifier * 1.1;
      useBattleStore.getState().setDifficultyModifier(newModifier);
      useBattleStore.getState().setBalanceAdjustmentMessage('战斗平衡已调整：Boss属性提升10%');
      this.balanceMessageTimer = 5000;
      useBattleStore.getState().resetConsecutiveCounts();
    }
  }

  public startNewBattle(): void {
    const state = useBattleStore.getState();
    const playerLevel = state.player.level;
    const equipmentScore = state.player.equipmentScore;

    const newPlayer: Player = {
      ...state.player,
      currentHp: state.player.maxHp,
      actionCooldown: 0,
      dodgeCooldown: 0,
      skillCooldowns: {
        fireball: 0,
        ice_spike: 0,
        lightning_bolt: 0
      }
    };

    const bossPosition = { x: 600, y: 350 };
    const newBoss = generateBoss(playerLevel, equipmentScore, bossPosition, state.difficultyModifier);

    useBattleStore.getState().resetBattle(newPlayer, newBoss);
    useBattleStore.getState().addBattleLog({
      message: `${newBoss.name} 出现了！准备战斗！`,
      type: 'system'
    });
  }

  public update(deltaTime: number): void {
    const state = useBattleStore.getState();

    if (state.battleResult !== null) return;

    useBattleStore.getState().updatePlayerCooldowns(deltaTime);
    useBattleStore.getState().updateBossStun(deltaTime);
    useBattleStore.getState().updateDamageNumbers(deltaTime);
    useBattleStore.getState().updateSkillEffects(deltaTime);
    useBattleStore.getState().updateScreenShake(deltaTime);
    useBattleStore.getState().updateTurnTimer(deltaTime);

    if (this.balanceMessageTimer > 0) {
      this.balanceMessageTimer -= deltaTime;
      if (this.balanceMessageTimer <= 0) {
        useBattleStore.getState().setBalanceAdjustmentMessage(null);
      }
    }

    if (state.boss.isTransitioning) {
      useBattleStore.setState((prev) => ({
        boss: {
          ...prev.boss,
          stateTransitionTime: Math.max(0, prev.boss.stateTransitionTime - deltaTime),
          isTransitioning: prev.boss.stateTransitionTime - deltaTime > 0
        }
      }));
    }

    if (!state.isPlayerTurn) {
      this.bossActionTimer -= deltaTime;
      if (this.bossActionTimer <= 0) {
        this.executeBossTurn();
        this.bossActionTimer = 999999;
      }
    }
  }
}

export const battleManager = new BattleManager();
export { PLAYER_SKILLS };
