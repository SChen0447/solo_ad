export interface CharacterCustomization {
  hairStyle: number;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  accessoryType: number;
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  customization: CharacterCustomization;
  isHost: boolean;
  isAlive: boolean;
  health: number;
  kills: number;
}

export interface GamePlayer {
  id: string;
  x: number;
  y: number;
  angle: number;
  health: number;
  isAlive: boolean;
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

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameState: string;
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
