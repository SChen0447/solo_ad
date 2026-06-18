import type { Boss, BossState, BossBehavior, BattleState, Skill } from '../types';

interface StateProbability {
  state: BossState;
  probability: number;
}

export class BossAI {
  private lastStateChange: number = 0;
  private stateCooldown: number = 1500;
  private summonCooldown: number = 0;

  private getHpPercentage(boss: Boss): number {
    return boss.currentHp / boss.maxHp;
  }

  private getStateProbabilities(boss: Boss, currentMinions: number): StateProbability[] {
    const hpPercent = this.getHpPercentage(boss);
    const probabilities: StateProbability[] = [];

    if (boss.stunDuration > 0) {
      return [{ state: 'idle', probability: 1 }];
    }

    if (hpPercent <= 0.2 && boss.state !== 'enrage') {
      return [{ state: 'enrage', probability: 1 }];
    }

    if (hpPercent > 0.7) {
      probabilities.push({ state: 'idle', probability: 0.3 });
      probabilities.push({ state: 'attack', probability: 0.7 });
    } else if (hpPercent > 0.3) {
      probabilities.push({ state: 'idle', probability: 0.15 });
      probabilities.push({ state: 'attack', probability: 0.45 });
      probabilities.push({ state: 'defend', probability: 0.3 });
      probabilities.push({ state: 'summon', probability: currentMinions < 2 ? 0.1 : 0 });
    } else {
      probabilities.push({ state: 'idle', probability: 0.05 });
      probabilities.push({ state: 'attack', probability: 0.45 });
      probabilities.push({ state: 'defend', probability: 0.15 });
      probabilities.push({ state: 'enrage', probability: 0.25 });
      probabilities.push({ state: 'summon', probability: currentMinions < 2 ? 0.1 : 0 });
    }

    const total = probabilities.reduce((sum, p) => sum + p.probability, 0);
    return probabilities.map(p => ({
      ...p,
      probability: p.probability / total
    }));
  }

  private selectNextState(boss: Boss, currentMinions: number): BossState {
    const probabilities = this.getStateProbabilities(boss, currentMinions);
    const rand = Math.random();
    let cumulative = 0;

    for (const p of probabilities) {
      cumulative += p.probability;
      if (rand <= cumulative) {
        return p.state;
      }
    }

    return 'idle';
  }

  private selectRandomSkill(boss: Boss): Skill | undefined {
    const availableSkills = boss.skills.filter(s => s.cooldown <= 0);
    if (availableSkills.length === 0) return undefined;
    return availableSkills[Math.floor(Math.random() * availableSkills.length)];
  }

  public shouldTransitionState(
    boss: Boss,
    currentTime: number,
    _currentMinions: number
  ): boolean {
    if (boss.isTransitioning) return false;
    if (boss.stunDuration > 0) return false;
    if (currentTime - this.lastStateChange < this.stateCooldown) return false;

    const hpPercent = this.getHpPercentage(boss);
    if (hpPercent <= 0.2 && boss.state !== 'enrage') return true;

    return Math.random() < 0.02;
  }

  public transitionState(
    boss: Boss,
    currentTime: number,
    currentMinions: number
  ): BossState | null {
    if (!this.shouldTransitionState(boss, currentTime, currentMinions)) {
      return null;
    }

    const newState = this.selectNextState(boss, currentMinions);
    if (newState === boss.state) return null;

    if (newState === 'summon') {
      if (currentMinions >= 2 || this.summonCooldown > currentTime) {
        return null;
      }
      this.summonCooldown = currentTime + 10000;
    }

    this.lastStateChange = currentTime;
    return newState;
  }

  public generateBehavior(
    battleState: BattleState,
    currentTime: number
  ): BossBehavior {
    const { boss, minions } = battleState;
    const aliveMinions = minions.filter(m => m.alive).length;

    const newState = this.transitionState(boss, currentTime, aliveMinions);
    const targetState = newState || boss.state;

    let action = 'idle';
    let targetSkill: Skill | undefined;

    switch (targetState) {
      case 'idle':
        action = 'standing_by';
        break;
      case 'attack':
        targetSkill = this.selectRandomSkill(boss);
        action = targetSkill ? `casting_${targetSkill.id}` : 'basic_attack';
        break;
      case 'defend':
        action = 'defending';
        break;
      case 'enrage':
        targetSkill = this.selectRandomSkill(boss);
        action = targetSkill ? `enraged_${targetSkill.id}` : 'enraged_attack';
        break;
      case 'summon':
        action = 'summoning';
        break;
    }

    return {
      state: targetState,
      action,
      targetSkill
    };
  }

  public getStateDisplayText(state: BossState): string {
    switch (state) {
      case 'idle': return '待机中';
      case 'attack': return '攻击中';
      case 'defend': return '防御姿态';
      case 'enrage': return '狂暴中';
      case 'summon': return '召唤中';
    }
  }

  public getStateColor(state: BossState): string {
    switch (state) {
      case 'idle': return '#ffffff';
      case 'attack': return '#ff4444';
      case 'defend': return '#4488ff';
      case 'enrage': return '#ff0000';
      case 'summon': return '#aa44ff';
    }
  }
}

export const bossAI = new BossAI();
