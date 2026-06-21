export type ElementType = 'rect' | 'circle' | 'text';

export interface PhysicsProps {
  enabled: boolean;
  gravity: number;
  bounciness: number;
  friction: number;
  vx: number;
  vy: number;
  isStatic: boolean;
}

export interface GameElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: string;
  rotation: number;
  physics: PhysicsProps;
  script: string;
  zIndex: number;
  textContent?: string;
  fontSize?: number;
}

export interface GameState {
  elements: GameElement[];
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  fps: number;
  selectedElementId: string | null;
}

export type EditorActionType =
  | 'ADD_ELEMENT'
  | 'REMOVE_ELEMENT'
  | 'UPDATE_ELEMENT'
  | 'SELECT_ELEMENT'
  | 'REORDER_ELEMENTS'
  | 'START_GAME'
  | 'PAUSE_GAME'
  | 'STOP_GAME'
  | 'UPDATE_SCORE'
  | 'LOAD_TEMPLATE';

export interface EditorAction {
  type: EditorActionType;
  payload: any;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type EventCallback = (data: any) => void;

export type TemplateType = 'parkour' | 'platformer' | 'shooter';
