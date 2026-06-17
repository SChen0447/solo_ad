export type Direction = 'up' | 'down' | 'left' | 'right';
export type LightColor = 'red' | 'green' | 'blue';
export type MirrorOrientation = '/' | '\\';
export type ToolType = 'mirror' | 'prism' | null;

export interface Position {
  x: number;
  y: number;
}

export interface Wall extends Position {}

export interface LightSource extends Position {
  direction: Direction;
  color: LightColor;
}

export interface Target extends Position {
  color: LightColor;
  activated: boolean;
}

export interface Box extends Position {}

export interface PlacedMirror extends Position {
  orientation: MirrorOrientation;
}

export interface PlacedPrism extends Position {}

export interface PlayerState extends Position {
  lives: number;
}

export interface LevelData {
  id: number;
  name: string;
  size: number;
  walls: Wall[];
  lightSources: LightSource[];
  targets: Target[];
  boxes: Box[];
  player: Position;
  mirrors: number;
  prisms: number;
}

export interface LaserSegment {
  from: Position;
  to: Position;
  color: LightColor;
}

export interface GameState {
  levelId: number;
  gridSize: number;
  walls: Wall[];
  lightSources: LightSource[];
  targets: Target[];
  boxes: Box[];
  placedMirrors: PlacedMirror[];
  placedPrisms: PlacedPrism[];
  player: PlayerState;
  inventoryMirrors: number;
  inventoryPrisms: number;
  selectedTool: ToolType;
  selectedMirrorOrientation: MirrorOrientation;
  laserPaths: LaserSegment[];
  isWin: boolean;
  isGameOver: boolean;
  hitFlash: boolean;
  footprints: Array<Position & { time: number }>;
  placedHighlight: Position | null;
}

export type GameAction =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'SELECT_TOOL'; tool: ToolType }
  | { type: 'ROTATE_MIRROR' }
  | { type: 'PLACE_TOOL'; position: Position }
  | { type: 'REMOVE_TOOL'; position: Position }
  | { type: 'RESET_LEVEL' }
  | { type: 'LOAD_LEVEL'; level: LevelData };
