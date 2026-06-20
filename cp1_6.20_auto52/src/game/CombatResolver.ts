import {
  Unit,
  UnitType,
  Owner,
  COUNTER_CHART,
  COUNTER_BONUS,
  MOUNTAIN_DEFENSE_BONUS,
  getTerrainAt,
  Terrain,
} from '../data/unitData';

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  damageToDefender: number;
  damageToAttacker: number;
  defenderDied: boolean;
  attackerDied: boolean;
  counterAttack: boolean;
}

export interface AIDecision {
  attackerId: string;
  targetId: string;
}

export function calculateDamage(attacker: Unit, defender: Unit): CombatResult {
  let atkPower = attacker.attack;
  let defPower = defender.defense;

  if (COUNTER_CHART[attacker.type] === defender.type) {
    atkPower += COUNTER_BONUS;
  }

  if (getTerrainAt(defender.x, defender.y) === Terrain.Mountain) {
    defPower += MOUNTAIN_DEFENSE_BONUS;
  }

  const baseDamage = Math.max(1, atkPower - defPower);
  const variance = Math.random() < 0.3 ? 1 : 0;
  const damageToDefender = baseDamage + variance;

  let damageToAttacker = 0;
  let counterAttack = false;

  if (COUNTER_CHART[defender.type] === attacker.type) {
    counterAttack = true;
    let counterAtkPower = defender.attack - 1;
    let counterDefPower = attacker.defense;
    if (getTerrainAt(attacker.x, attacker.y) === Terrain.Mountain) {
      counterDefPower += MOUNTAIN_DEFENSE_BONUS;
    }
    damageToAttacker = Math.max(1, counterAtkPower - counterDefPower);
  }

  const defenderHpAfter = defender.hp - damageToDefender;
  const attackerHpAfter = attacker.hp - damageToAttacker;

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    damageToDefender,
    damageToAttacker,
    defenderDied: defenderHpAfter <= 0,
    attackerDied: attackerHpAfter <= 0,
    counterAttack,
  };
}

export function applyCombatResult(units: Unit[], result: CombatResult): void {
  const attacker = units.find(u => u.id === result.attackerId);
  const defender = units.find(u => u.id === result.defenderId);

  if (attacker && attacker.alive) {
    attacker.hp = Math.max(0, attacker.hp - result.damageToAttacker);
    if (result.attackerDied) {
      attacker.alive = false;
    }
  }

  if (defender && defender.alive) {
    defender.hp = Math.max(0, defender.hp - result.damageToDefender);
    if (result.defenderDied) {
      defender.alive = false;
    }
  }
}

export function getAIAction(aiUnits: Unit[], playerUnits: Unit[]): AIDecision | null {
  const aliveAI = aiUnits.filter(u => u.alive);
  const alivePlayer = playerUnits.filter(u => u.alive);

  if (aliveAI.length === 0 || alivePlayer.length === 0) return null;

  const lowHpThreshold = 3;
  const lowHpTargets = alivePlayer.filter(u => u.hp <= lowHpThreshold);

  let target: Unit;
  if (lowHpTargets.length > 0) {
    target = lowHpTargets.reduce((a, b) => (a.hp < b.hp ? a : b));
  } else {
    target = findNearestTarget(aliveAI, alivePlayer);
  }

  const attacker = selectBestAttacker(aliveAI, target);

  return { attackerId: attacker.id, targetId: target.id };
}

function findNearestTarget(aiUnits: Unit[], playerUnits: Unit[]): Unit {
  let minDist = Infinity;
  let nearest = playerUnits[0];

  for (const pu of playerUnits) {
    for (const au of aiUnits) {
      const dist = manhattanDist(au, pu);
      if (dist < minDist) {
        minDist = dist;
        nearest = pu;
      }
    }
  }

  const sameDist = playerUnits.filter(pu => {
    for (const au of aiUnits) {
      if (manhattanDist(au, pu) === minDist) return true;
    }
    return false;
  });

  return sameDist[Math.floor(Math.random() * sameDist.length)] || nearest;
}

function selectBestAttacker(aiUnits: Unit[], target: Unit): Unit {
  let best: Unit = aiUnits[0];
  let bestScore = -Infinity;

  for (const u of aiUnits) {
    let score = u.attack;
    if (COUNTER_CHART[u.type] === target.type) {
      score += COUNTER_BONUS;
    }
    if (score > bestScore) {
      bestScore = score;
      best = u;
    }
  }

  return best;
}

function manhattanDist(a: Unit, b: Unit): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
