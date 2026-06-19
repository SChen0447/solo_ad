import { v4 as uuidv4 } from 'uuid';
import type { Ship, HexCoord, AttackEvent, RoundResult, Faction } from '../types';
import { fleetManager } from './FleetManager';

export class BattleEngine {
  private playerFleet: Ship[];
  private enemyFleet: Ship[];
  private roundResults: RoundResult[] = [];
  private currentRound: number = 0;

  constructor(initialPlayerFleet: Ship[], initialEnemyFleet: Ship[]) {
    this.playerFleet = fleetManager.cloneFleet(initialPlayerFleet);
    this.enemyFleet = fleetManager.cloneFleet(initialEnemyFleet);
  }

  static getHexDistance(a: HexCoord, b: HexCoord): number {
    return (
      Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)
    ) / 2;
  }

  static findNearestTarget(attacker: Ship, targets: Ship[]): Ship | null {
    if (!attacker.position) return null;
    
    const aliveTargets = targets.filter(t => t.isAlive && t.position);
    if (aliveTargets.length === 0) return null;

    let nearestTarget: Ship | null = null;
    let minDistance = Infinity;

    for (const target of aliveTargets) {
      if (!target.position) continue;
      
      const distance = BattleEngine.getHexDistance(attacker.position, target.position);
      
      if (distance <= attacker.range && distance < minDistance) {
        minDistance = distance;
        nearestTarget = target;
      }
    }

    return nearestTarget;
  }

  simulateRound(): RoundResult {
    this.currentRound++;
    const events: AttackEvent[] = [];
    
    const allShips = [
      ...this.playerFleet.filter(s => s.isAlive && s.position),
      ...this.enemyFleet.filter(s => s.isAlive && s.position)
    ].sort(() => Math.random() - 0.5);

    for (const attacker of allShips) {
      if (!attacker.isAlive || !attacker.position) continue;

      const targets = attacker.faction === 'player' ? this.enemyFleet : this.playerFleet;
      const target = BattleEngine.findNearestTarget(attacker, targets);

      if (target && target.position) {
        const damageVariance = Math.floor(Math.random() * 5) - 2;
        const damage = Math.max(1, attacker.attack + damageVariance);
        
        const { isDead } = fleetManager.applyDamage(target, damage);

        const event: AttackEvent = {
          id: uuidv4(),
          round: this.currentRound,
          attackerId: attacker.id,
          attackerName: attacker.name,
          attackerFaction: attacker.faction,
          targetId: target.id,
          targetName: target.name,
          damage,
          isKill: isDead,
          timestamp: Date.now()
        };
        
        events.push(event);

        if (fleetManager.isFleetDestroyed(this.playerFleet) || 
            fleetManager.isFleetDestroyed(this.enemyFleet)) {
          break;
        }
      }
    }

    const isGameOver = fleetManager.isFleetDestroyed(this.playerFleet) || 
                       fleetManager.isFleetDestroyed(this.enemyFleet);
    
    let winner: Faction | null = null;
    if (isGameOver) {
      winner = fleetManager.isFleetDestroyed(this.enemyFleet) ? 'player' : 'enemy';
    }

    const result: RoundResult = {
      round: this.currentRound,
      events,
      playerFleet: fleetManager.cloneFleet(this.playerFleet),
      enemyFleet: fleetManager.cloneFleet(this.enemyFleet),
      isGameOver,
      winner
    };

    this.roundResults.push(result);
    return result;
  }

  simulateAllRounds(maxRounds: number = 50): RoundResult[] {
    while (this.currentRound < maxRounds) {
      const result = this.simulateRound();
      if (result.isGameOver) break;
    }
    return this.roundResults;
  }

  getFullBattleLog(): AttackEvent[] {
    return this.roundResults.flatMap(r => r.events);
  }

  getAllRoundResults(): RoundResult[] {
    return [...this.roundResults];
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getFleets(): { playerFleet: Ship[]; enemyFleet: Ship[] } {
    return {
      playerFleet: fleetManager.cloneFleet(this.playerFleet),
      enemyFleet: fleetManager.cloneFleet(this.enemyFleet)
    };
  }

  reset(): void {
    this.currentRound = 0;
    this.roundResults = [];
  }
}
