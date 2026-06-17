import {
  Unit,
  TerrainHex,
  MovePath,
  TurnState,
  SimulationResult,
  AttackEvent,
  HexCoord,
  TerrainType,
  TERRAIN_MOVE_COST,
} from '../types';
import { hexDistance, coordKey } from '../utils/hexUtils';

interface BattleSimulatorOptions {
  units: Unit[];
  terrain: TerrainHex[];
  movePaths: MovePath[];
  maxTurns?: number;
}

export class BattleSimulator {
  private units: Unit[];
  private terrain: Map<string, TerrainType>;
  private movePaths: Map<string, HexCoord[]>;
  private maxTurns: number;
  private turnStates: TurnState[] = [];

  constructor(options: BattleSimulatorOptions) {
    this.units = JSON.parse(JSON.stringify(options.units));
    this.movePaths = new Map();
    this.maxTurns = options.maxTurns ?? 50;

    this.terrain = new Map();
    for (const hex of options.terrain) {
      this.terrain.set(coordKey(hex.q, hex.r), hex.terrain);
    }

    for (const path of options.movePaths) {
      this.movePaths.set(path.unitId, [...path.waypoints]);
    }
  }

  simulate(): SimulationResult {
    this.turnStates = [];

    const initialState: TurnState = {
      turn: 0,
      units: JSON.parse(JSON.stringify(this.units)),
      attacks: [],
      destroyedThisTurn: [],
    };
    this.turnStates.push(initialState);

    for (let turn = 1; turn <= this.maxTurns; turn++) {
      const turnResult = this.executeTurn(turn);
      this.turnStates.push(turnResult);

      const winner = this.checkWinner();
      if (winner !== null) {
        return {
          turns: this.turnStates,
          winner,
          totalTurns: turn,
        };
      }
    }

    return {
      turns: this.turnStates,
      winner: 'draw',
      totalTurns: this.maxTurns,
    };
  }

  private executeTurn(turnNumber: number): TurnState {
    const attacks: AttackEvent[] = [];
    const destroyedThisTurn: Unit[] = [];

    const aliveUnits = this.units.filter((u) => !u.isDestroyed);
    const blueUnits = aliveUnits.filter((u) => u.faction === 'blue');
    const redUnits = aliveUnits.filter((u) => u.faction === 'red');

    const allUnits = [...blueUnits, ...redUnits];

    for (const unit of allUnits) {
      if (unit.isDestroyed) continue;

      const path = this.movePaths.get(unit.id);
      if (path && path.length > 0) {
        this.moveUnit(unit, path);
      }
    }

    for (const unit of allUnits) {
      if (unit.isDestroyed) continue;

      const targets = this.findTargetsInRange(unit);
      for (const target of targets) {
        if (target.isDestroyed) continue;

        const damage = this.calculateDamage(unit, target);
        target.hp -= damage;

        attacks.push({
          attackerId: unit.id,
          targetId: target.id,
          damage,
          turn: turnNumber,
        });

        if (target.hp <= 0) {
          target.hp = 0;
          target.isDestroyed = true;
          destroyedThisTurn.push(JSON.parse(JSON.stringify(target)));
        }
      }
    }

    return {
      turn: turnNumber,
      units: JSON.parse(JSON.stringify(this.units)),
      attacks,
      destroyedThisTurn,
    };
  }

  private moveUnit(unit: Unit, path: HexCoord[]): void {
    let movePoints = unit.moveCost;

    while (movePoints > 0 && path.length > 0) {
      const nextWaypoint = path[0];
      const terrainKey = coordKey(nextWaypoint.q, nextWaypoint.r);
      const terrain = this.terrain.get(terrainKey) || 'plain';
      const moveCost = TERRAIN_MOVE_COST[terrain];

      if (movePoints >= moveCost) {
        unit.q = nextWaypoint.q;
        unit.r = nextWaypoint.r;
        movePoints -= moveCost;
        path.shift();
      } else {
        break;
      }
    }

    this.movePaths.set(unit.id, path);
  }

  private findTargetsInRange(unit: Unit): Unit[] {
    const targets: Unit[] = [];

    for (const other of this.units) {
      if (other.faction === unit.faction) continue;
      if (other.isDestroyed) continue;

      const dist = hexDistance(
        { q: unit.q, r: unit.r },
        { q: other.q, r: other.r }
      );

      if (dist <= unit.range) {
        targets.push(other);
      }
    }

    targets.sort((a, b) => a.hp - b.hp);

    return targets;
  }

  private calculateDamage(attacker: Unit, target: Unit): number {
    const baseDamage = attacker.attack;
    const terrainKey = coordKey(target.q, target.r);
    const terrain = this.terrain.get(terrainKey) || 'plain';

    let defenseBonus = 1.0;
    if (terrain === 'forest') defenseBonus = 0.8;
    if (terrain === 'hill') defenseBonus = 0.85;
    if (terrain === 'city') defenseBonus = 0.75;

    return Math.floor(baseDamage * defenseBonus);
  }

  private checkWinner(): 'blue' | 'red' | 'draw' | null {
    const blueAlive = this.units.filter(
      (u) => u.faction === 'blue' && !u.isDestroyed
    );
    const redAlive = this.units.filter(
      (u) => u.faction === 'red' && !u.isDestroyed
    );

    if (blueAlive.length === 0 && redAlive.length === 0) {
      return 'draw';
    }
    if (blueAlive.length === 0) {
      return 'red';
    }
    if (redAlive.length === 0) {
      return 'blue';
    }

    return null;
  }
}

export function runSimulation(
  units: Unit[],
  terrain: TerrainHex[],
  movePaths: MovePath[],
  maxTurns?: number
): SimulationResult {
  const simulator = new BattleSimulator({
    units,
    terrain,
    movePaths,
    maxTurns,
  });
  return simulator.simulate();
}
