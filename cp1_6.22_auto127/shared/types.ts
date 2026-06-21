export type ShipType = 'scout' | 'frigate' | 'flagship';
export type Team = 'red' | 'blue';
export type ShipState = 'idle' | 'moving' | 'attacking' | 'retreating';
export type CommandType = 'advance' | 'focus' | 'retreat' | 'stop';

export interface ShipTemplate {
  type: ShipType;
  name: string;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  powerMultiplier: number;
  hp: number;
  maxCooldown: number;
  size: number;
}

export interface BattleShip {
  id: string;
  type: ShipType;
  team: Team;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  cooldown: number;
  maxCooldown: number;
  targetId: string | null;
  state: ShipState;
  angle: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  team: Team;
  ttl: number;
}

export interface BattleEvent {
  type: 'destroy' | 'hit';
  shipId?: string;
  team?: Team;
  x?: number;
  y?: number;
}

export interface BattleSnapshot {
  ships: BattleShip[];
  projectiles: Projectile[];
  events: BattleEvent[];
  timeRemaining: number;
}

export interface CommandPayload {
  type: CommandType;
  targetId?: string;
}

export interface FleetConfig {
  fleetId: string;
  playerId: string;
  ships: ShipType[];
  power: number;
}

export interface QueueEntry {
  playerId: string;
  fleetId: string;
  power: number;
  ships: ShipType[];
  socketId: string;
  joinedAt: number;
}

export interface BattleRoom {
  roomId: string;
  players: { playerId: string; socketId: string; team: Team; ships: ShipType[] }[];
  ships: BattleShip[];
  projectiles: Projectile[];
  startTime: number;
  duration: number;
  intervalId: ReturnType<typeof setInterval> | null;
  ended: boolean;
}

export interface MatchFoundPayload {
  roomId: string;
  opponent: { playerId: string; ships: ShipType[]; power: number };
}

export interface BattleStartPayload {
  ships: BattleShip[];
  yourTeam: Team;
}

export interface BattleEndPayload {
  winner: Team;
  rewards: number;
  yourTeam: Team;
}

export const SHIP_TEMPLATES: ShipTemplate[] = [
  {
    type: 'scout',
    name: '侦察舰',
    attack: 15,
    defense: 20,
    speed: 90,
    range: 200,
    powerMultiplier: 1.0,
    hp: 80,
    maxCooldown: 0.8,
    size: 12,
  },
  {
    type: 'frigate',
    name: '护卫舰',
    attack: 40,
    defense: 50,
    speed: 50,
    range: 300,
    powerMultiplier: 2.0,
    hp: 200,
    maxCooldown: 1.2,
    size: 18,
  },
  {
    type: 'flagship',
    name: '旗舰',
    attack: 80,
    defense: 100,
    speed: 30,
    range: 400,
    powerMultiplier: 4.0,
    hp: 500,
    maxCooldown: 2.0,
    size: 28,
  },
];

export function calculatePower(ships: ShipType[]): number {
  return ships.reduce((sum, type) => {
    const t = SHIP_TEMPLATES.find((s) => s.type === type);
    if (!t) return sum;
    return sum + (t.attack + t.defense) * t.powerMultiplier;
  }, 0);
}

export const BATTLE_DURATION = 5 * 60;
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const PROJECTILE_SPEED = 600;
export const BROADCAST_HZ = 20;
export const MATCH_POWER_TOLERANCE = 0.1;
export const MAX_FLEET_SIZE = 6;
