export type GameScreen = 'start' | 'calibration' | 'levelSelect' | 'playing' | 'complete';

export interface SoundData {
  frequency: number;
  volume: number;
  waveform: Float32Array;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
}

export type MechanismType = 'platform' | 'door' | 'block';

export interface Mechanism {
  id: string;
  type: MechanismType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SoundPlatform extends Mechanism {
  type: 'platform';
  baseY: number;
  targetY: number;
  minY: number;
  maxY: number;
  speed: number;
  activeFrequencyRange: [number, number];
}

export interface SoundDoor extends Mechanism {
  type: 'door';
  isOpen: boolean;
  openProgress: number;
  requiredVolume: number;
  requiredFrequencyRange: [number, number];
}

export interface PushableBlock extends Mechanism {
  type: 'block';
  vx: number;
}

export interface Level {
  id: number;
  name: string;
  playerStart: { x: number; y: number };
  goal: { x: number; y: number; radius: number };
  platforms: SoundPlatform[];
  doors: SoundDoor[];
  blocks: PushableBlock[];
  walls: { x: number; y: number; width: number; height: number }[];
}

export interface GameState {
  currentScreen: GameScreen;
  currentLevel: number;
  unlockedLevels: number[];
  player: Player;
  level: Level | null;
  isPaused: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GRAVITY = 500;
export const PLAYER_SPEED = 150;
export const JUMP_FORCE = 300;
export const PLATFORM_SPEED = 100;
export const MAX_PUSH_SPEED = 200;
