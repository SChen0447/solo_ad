export type GateType = 'AND' | 'OR' | 'NOT';

export interface Position {
  x: number;
  y: number;
}

export interface Port {
  id: string;
  type: 'input' | 'output';
  position: Position;
  parentId: string;
  index: number;
}

export interface Gate {
  id: string;
  type: GateType;
  position: Position;
  isFixed?: boolean;
}

export interface Switch {
  id: string;
  position: Position;
  state: boolean;
  isFixed: boolean;
}

export interface Light {
  id: string;
  position: Position;
  isFixed: boolean;
}

export interface Wire {
  id: string;
  fromPort: string;
  toPort: string;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  switches: Switch[];
  lights: Light[];
  fixedGates: Gate[];
  availableGates: { type: GateType; count: number }[];
  gridSize: { width: number; height: number };
  cellSize: number;
}

export interface CircuitState {
  gates: Gate[];
  switches: Switch[];
  lights: Light[];
  wires: Wire[];
}
