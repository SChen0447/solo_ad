import { v4 as uuidv4 } from 'uuid';

export type PlayerId = string;
export type UnitId = string;
export type HexCoord = { q: number; r: number };

export type UnitType = 'base' | 'miner' | 'tower';
export type MineState = 'idle' | 'traveling_to_mine' | 'mining' | 'returning';

export interface Player {
  id: PlayerId;
  name: string;
  gold: number;
  color: string;
}

export interface Base {
  id: UnitId;
  playerId: PlayerId;
  position: HexCoord;
  level: number;
  hp: number;
  maxHp: number;
}

export interface Miner {
  id: UnitId;
  playerId: PlayerId;
  position: HexCoord;
  targetMineId: UnitId | null;
  state: MineState;
  carryingGold: number;
  hp: number;
  maxHp: number;
}

export interface Tower {
  id: UnitId;
  playerId: PlayerId;
  position: HexCoord;
  hp: number;
  maxHp: number;
  damage: number;
  lastAttackTime: number;
}

export interface GoldMine {
  id: UnitId;
  position: HexCoord;
  ownerId: PlayerId | null;
  occupationStart: number | null;
  goldPerSecond: number;
}

export interface Projectile {
  id: UnitId;
  from: HexCoord;
  to: HexCoord;
  damage: number;
  targetId: UnitId;
  targetPlayerId: PlayerId;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'combat' | 'build' | 'victory';
}

export interface GameState {
  roomId: string;
  players: Record<PlayerId, Player>;
  bases: Record<UnitId, Base>;
  miners: Record<UnitId, Miner>;
  towers: Record<UnitId, Tower>;
  mines: Record<UnitId, GoldMine>;
  projectiles: Record<UnitId, Projectile>;
  logs: LogEntry[];
  status: 'waiting' | 'playing' | 'finished';
  winner: PlayerId | null;
  gridSize: number;
  lastUpdate: number;
}

export const COSTS = {
  BASE_UPGRADE: 200,
  MINER: 150,
  TOWER: 100,
};

export const STATS = {
  BASE_HP: 500,
  MINER_HP: 50,
  TOWER_HP: 150,
  TOWER_DAMAGE: 50,
  TOWER_RANGE: 2,
  TOWER_ATTACK_INTERVAL: 1000,
  MINER_CARRY_CAPACITY: 5,
  MINE_GOLD_PER_SECOND: 10,
  MINING_TIME: 2000,
  MINER_SPEED: 0.002,
  OCCUPATION_TIME: 30000,
};

const PLAYER_COLORS = ['#FFD700', '#00CED1', '#FF6B6B', '#4ECDC4', '#45B7D1'];

function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

function getAdjacentHexes(hex: HexCoord): HexCoord[] {
  const directions = [
    { q: 1, r: 0 }, { q: -1, r: 0 },
    { q: 0, r: 1 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: -1, r: 1 },
  ];
  return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

function isValidHex(hex: HexCoord, gridSize: number): boolean {
  return Math.abs(hex.q) < gridSize && Math.abs(hex.r) < gridSize && Math.abs(hex.q + hex.r) < gridSize;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class GameEngine {
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();

  constructor(roomId: string) {
    this.state = {
      roomId,
      players: {},
      bases: {},
      miners: {},
      towers: {},
      mines: {},
      projectiles: {},
      logs: [],
      status: 'waiting',
      winner: null,
      gridSize: 2,
      lastUpdate: Date.now(),
    };
    this.generateMines();
  }

  getState(): GameState {
    return { ...this.state };
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.state));
  }

  private addLog(message: string, type: LogEntry['type'] = 'info'): void {
    this.state.logs.unshift({
      id: uuidv4(),
      timestamp: Date.now(),
      message,
      type,
    });
    if (this.state.logs.length > 100) {
      this.state.logs.pop();
    }
  }

  private generateMines(): void {
    const usedPositions: Set<string> = new Set();
    const candidates: HexCoord[] = [];
    
    for (let q = -this.state.gridSize; q <= this.state.gridSize; q++) {
      for (let r = -this.state.gridSize; r <= this.state.gridSize; r++) {
        if (Math.abs(q + r) <= this.state.gridSize && !(q === 0 && r === 0)) {
          candidates.push({ q, r });
        }
      }
    }

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    let count = 0;
    
    for (const pos of shuffled) {
      if (count >= 3) break;
      const key = `${pos.q},${pos.r}`;
      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        const mineId = uuidv4();
        this.state.mines[mineId] = {
          id: mineId,
          position: pos,
          ownerId: null,
          occupationStart: null,
          goldPerSecond: STATS.MINE_GOLD_PER_SECOND,
        };
        count++;
      }
    }
  }

  addPlayer(playerId: PlayerId, name: string): boolean {
    if (Object.keys(this.state.players).length >= 2) return false;
    if (this.state.players[playerId]) return false;

    const colorIndex = Object.keys(this.state.players).length;
    this.state.players[playerId] = {
      id: playerId,
      name,
      gold: 100,
      color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
    };

    const basePositions = [
      { q: -this.state.gridSize, r: this.state.gridSize },
      { q: this.state.gridSize, r: -this.state.gridSize },
    ];
    const pos = basePositions[colorIndex % basePositions.length];
    const baseId = uuidv4();
    
    this.state.bases[baseId] = {
      id: baseId,
      playerId,
      position: pos,
      level: 1,
      hp: STATS.BASE_HP,
      maxHp: STATS.BASE_HP,
    };

    const minerId = uuidv4();
    this.state.miners[minerId] = {
      id: minerId,
      playerId,
      position: { ...pos },
      targetMineId: null,
      state: 'idle',
      carryingGold: 0,
      hp: STATS.MINER_HP,
      maxHp: STATS.MINER_HP,
    };

    this.addLog(`${name} 加入了游戏`, 'info');

    if (Object.keys(this.state.players).length === 2) {
      this.state.status = 'playing';
      this.addLog('游戏开始！', 'info');
    }

    this.notify();
    return true;
  }

  removePlayer(playerId: PlayerId): void {
    delete this.state.players[playerId];
    
    Object.values(this.state.bases).forEach(b => {
      if (b.playerId === playerId) delete this.state.bases[b.id];
    });
    Object.values(this.state.miners).forEach(m => {
      if (m.playerId === playerId) delete this.state.miners[m.id];
    });
    Object.values(this.state.towers).forEach(t => {
      if (t.playerId === playerId) delete this.state.towers[t.id];
    });

    if (Object.keys(this.state.players).length === 0) {
      this.state.status = 'waiting';
      this.state.winner = null;
    }
    
    this.notify();
  }

  private getPlayerBase(playerId: PlayerId): Base | null {
    return Object.values(this.state.bases).find(b => b.playerId === playerId) || null;
  }

  private findEmptyAdjacent(position: HexCoord): HexCoord | null {
    const adjacent = getAdjacentHexes(position);
    const occupied = new Set<string>();
    
    Object.values(this.state.bases).forEach(b => occupied.add(`${b.position.q},${b.position.r}`));
    Object.values(this.state.towers).forEach(t => occupied.add(`${t.position.q},${t.position.r}`));
    
    for (const hex of adjacent) {
      if (isValidHex(hex, this.state.gridSize + 1) && !occupied.has(`${hex.q},${hex.r}`)) {
        return hex;
      }
    }
    return null;
  }

  buildMiner(playerId: PlayerId): boolean {
    const player = this.state.players[playerId];
    if (!player || player.gold < COSTS.MINER) return false;

    const base = this.getPlayerBase(playerId);
    if (!base) return false;

    const position = this.findEmptyAdjacent(base.position) || { ...base.position };
    
    player.gold -= COSTS.MINER;
    const minerId = uuidv4();
    this.state.miners[minerId] = {
      id: minerId,
      playerId,
      position,
      targetMineId: null,
      state: 'idle',
      carryingGold: 0,
      hp: STATS.MINER_HP,
      maxHp: STATS.MINER_HP,
    };

    this.addLog(`${player.name} 建造了采矿船`, 'build');
    this.notify();
    return true;
  }

  buildTower(playerId: PlayerId): boolean {
    const player = this.state.players[playerId];
    if (!player || player.gold < COSTS.TOWER) return false;

    const base = this.getPlayerBase(playerId);
    if (!base) return false;

    const position = this.findEmptyAdjacent(base.position);
    if (!position) return false;

    player.gold -= COSTS.TOWER;
    const towerId = uuidv4();
    this.state.towers[towerId] = {
      id: towerId,
      playerId,
      position,
      hp: STATS.TOWER_HP,
      maxHp: STATS.TOWER_HP,
      damage: STATS.TOWER_DAMAGE,
      lastAttackTime: 0,
    };

    this.addLog(`${player.name} 建造了防御塔`, 'build');
    this.notify();
    return true;
  }

  upgradeBase(playerId: PlayerId): boolean {
    const player = this.state.players[playerId];
    if (!player || player.gold < COSTS.BASE_UPGRADE) return false;

    const base = this.getPlayerBase(playerId);
    if (!base) return false;

    player.gold -= COSTS.BASE_UPGRADE;
    base.level += 1;
    base.maxHp += 200;
    base.hp = Math.min(base.hp + 200, base.maxHp);

    this.addLog(`${player.name} 升级了基地到 Lv.${base.level}`, 'build');
    this.notify();
    return true;
  }

  private findNearestMine(miner: Miner): GoldMine | null {
    let nearest: GoldMine | null = null;
    let minDist = Infinity;

    for (const mine of Object.values(this.state.mines)) {
      const dist = hexDistance(miner.position, mine.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = mine;
      }
    }
    return nearest;
  }

  private moveMiners(deltaTime: number): void {
    for (const miner of Object.values(this.state.miners)) {
      const player = this.state.players[miner.playerId];
      if (!player) continue;

      const base = this.getPlayerBase(miner.playerId);
      if (!base) continue;

      if (miner.state === 'idle') {
        const mine = this.findNearestMine(miner);
        if (mine) {
          miner.targetMineId = mine.id;
          miner.state = 'traveling_to_mine';
        }
      } else if (miner.state === 'traveling_to_mine') {
        const mine = this.state.mines[miner.targetMineId!];
        if (!mine) {
          miner.state = 'idle';
          continue;
        }
        
        const dist = hexDistance(miner.position, mine.position);
        if (dist < 0.1) {
          miner.position = { ...mine.position };
          miner.state = 'mining';
          (miner as unknown as { mineStartTime: number }).mineStartTime = Date.now();
        } else {
          const step = Math.min(STATS.MINER_SPEED * deltaTime, 1);
          miner.position = {
            q: lerp(miner.position.q, mine.position.q, step),
            r: lerp(miner.position.r, mine.position.r, step),
          };
        }
      } else if (miner.state === 'mining') {
        const mineStartTime = (miner as unknown as { mineStartTime?: number }).mineStartTime || Date.now();
        if (Date.now() - mineStartTime >= STATS.MINING_TIME) {
          miner.carryingGold = STATS.MINER_CARRY_CAPACITY;
          miner.state = 'returning';
        }
        
        const mine = this.state.mines[miner.targetMineId!];
        if (mine) {
          if (mine.ownerId !== miner.playerId) {
            mine.ownerId = miner.playerId;
            mine.occupationStart = Date.now();
          }
        }
      } else if (miner.state === 'returning') {
        const dist = hexDistance(miner.position, base.position);
        if (dist < 0.1) {
          player.gold += miner.carryingGold;
          miner.carryingGold = 0;
          miner.state = 'idle';
          miner.targetMineId = null;
        } else {
          const step = Math.min(STATS.MINER_SPEED * deltaTime, 1);
          miner.position = {
            q: lerp(miner.position.q, base.position.q, step),
            r: lerp(miner.position.r, base.position.r, step),
          };
        }
      }
    }
  }

  private updateTowerAttacks(): void {
    const now = Date.now();

    for (const tower of Object.values(this.state.towers)) {
      if (now - tower.lastAttackTime < STATS.TOWER_ATTACK_INTERVAL) continue;

      let target: { id: UnitId; type: 'miner' | 'base' } | null = null;
      let minDist = Infinity;

      for (const miner of Object.values(this.state.miners)) {
        if (miner.playerId === tower.playerId) continue;
        const dist = hexDistance(tower.position, miner.position);
        if (dist <= STATS.TOWER_RANGE && dist < minDist) {
          minDist = dist;
          target = { id: miner.id, type: 'miner' };
        }
      }

      for (const base of Object.values(this.state.bases)) {
        if (base.playerId === tower.playerId) continue;
        const dist = hexDistance(tower.position, base.position);
        if (dist <= STATS.TOWER_RANGE && dist < minDist) {
          minDist = dist;
          target = { id: base.id, type: 'base' };
        }
      }

      if (target) {
        tower.lastAttackTime = now;
        const targetUnit = target.type === 'miner' 
          ? this.state.miners[target.id] 
          : this.state.bases[target.id];

        if (targetUnit) {
          const projId = uuidv4();
          this.state.projectiles[projId] = {
            id: projId,
            from: { ...tower.position },
            to: { ...targetUnit.position },
            damage: tower.damage,
            targetId: target.id,
            targetPlayerId: targetUnit.playerId,
            createdAt: now,
          };

          setTimeout(() => {
            if (target!.type === 'miner') {
              const miner = this.state.miners[target!.id];
              if (miner) {
                miner.hp -= tower.damage;
                if (miner.hp <= 0) {
                  delete this.state.miners[miner.id];
                  this.addLog(`一艘采矿船被摧毁`, 'combat');
                }
              }
            } else {
              const base = this.state.bases[target!.id];
              if (base) {
                base.hp -= tower.damage;
                if (base.hp <= 0) {
                  delete this.state.bases[base.id];
                  const winner = Object.values(this.state.players).find(p => p.id !== base.playerId);
                  if (winner) {
                    this.state.status = 'finished';
                    this.state.winner = winner.id;
                    this.addLog(`${winner.name} 赢得了胜利！`, 'victory');
                  }
                }
              }
            }
            delete this.state.projectiles[projId];
            this.notify();
          }, 300);
        }
      }
    }
  }

  private updateMineOwnership(): void {
    const now = Date.now();
    
    for (const mine of Object.values(this.state.mines)) {
      if (mine.ownerId && mine.occupationStart) {
        const player = this.state.players[mine.ownerId];
        if (player && now - mine.occupationStart >= STATS.OCCUPATION_TIME) {
          const allOccupied = Object.values(this.state.mines).every(m => m.ownerId === mine.ownerId);
          if (allOccupied) {
            this.state.status = 'finished';
            this.state.winner = mine.ownerId;
            this.addLog(`${player.name} 占领了所有金矿，赢得胜利！`, 'victory');
          }
        }
      }
    }
  }

  update(): void {
    if (this.state.status !== 'playing') return;

    const now = Date.now();
    const deltaTime = now - this.state.lastUpdate;
    this.state.lastUpdate = now;

    this.moveMiners(deltaTime);
    this.updateTowerAttacks();
    this.updateMineOwnership();

    this.notify();
  }
}
