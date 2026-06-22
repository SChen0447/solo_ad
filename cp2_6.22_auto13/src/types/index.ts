export interface Position {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  wallColor: string;
  floorColor: string;
  connections: string[];
}

export interface DungeonData {
  rooms: Room[];
  gridSize: number;
  roomWidth: number;
  roomHeight: number;
  padding: number;
  corridors: Corridor[];
}

export interface Corridor {
  from: string;
  to: string;
  path: Position[];
}

export interface Player {
  id: string;
  type: 'player';
  x: number;
  y: number;
  radius: number;
  speed: number;
  currentRoomId: string;
  isHit: boolean;
  hitTimer: number;
  velocityX: number;
  velocityY: number;
}

export interface Enemy {
  id: string;
  type: 'enemy';
  x: number;
  y: number;
  size: number;
  speed: number;
  patrolPath: Position[];
  currentPathIndex: number;
  waitTimer: number;
  isWaiting: boolean;
  startRoomId: string;
}

export type Entity = Player | Enemy;

export interface GameState {
  dungeon: DungeonData;
  player: Player;
  enemies: Enemy[];
  isTransitioning: boolean;
  transitionAlpha: number;
  transitionDirection: 'in' | 'out';
  fps: number;
}

export interface MoveCommand {
  entityId: string;
  dx: number;
  dy: number;
}

export interface RenderData {
  dungeon: DungeonData;
  player: Player;
  enemies: Enemy[];
  currentRoomId: string;
  fps: number;
  transitionAlpha: number;
}
