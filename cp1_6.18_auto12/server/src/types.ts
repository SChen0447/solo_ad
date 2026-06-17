export interface CharacterCustomization {
  hairStyle: number;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  accessoryType: number;
}

export interface Player {
  id: string;
  socketId: string;
  nickname: string;
  customization: CharacterCustomization;
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  kills: number;
  isAlive: boolean;
  isHost: boolean;
  velocityX: number;
  velocityY: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Map<string, Player>;
  bullets: Bullet[];
  maxPlayers: number;
  gameState: 'waiting' | 'playing' | 'ended';
  winnerId: string | null;
  createdAt: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameState: string;
}

export interface HitEvent {
  bulletId: string;
  targetId: string;
  shooterId: string;
  damage: number;
}

export interface GameEndData {
  winnerId: string;
  winnerName: string;
  stats: {
    playerId: string;
    nickname: string;
    kills: number;
    survived: boolean;
  }[];
}
