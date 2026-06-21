export interface Position {
  x: number;
  y: number;
}

export interface Room {
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  wallColor: string;
  connected: Position[];
}

export interface Corridor {
  from: Position;
  to: Position;
}

export interface RoomData {
  rooms: Room[];
  corridors: Corridor[];
  gridSize: number;
  cellWidth: number;
  cellHeight: number;
  padding: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  currentRoom: Position;
  isHit: boolean;
  hitTimer: number;
  knockback: Position | null;
  knockbackTimer: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  path: Position[];
  currentPathIndex: number;
  waitTimer: number;
  isWaiting: boolean;
}

export interface MoveCommand {
  enemyId: number;
  dx: number;
  dy: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface RenderData {
  roomData: RoomData;
  player: Player;
  enemies: Enemy[];
  currentRoomCoord: Position;
  enemyCount: number;
  fps: number;
  transitionAlpha: number;
  playerJitter: Position;
  enemyJitters: Position[];
}
