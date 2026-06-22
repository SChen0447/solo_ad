export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type TrafficLightPhase = 'eastWestStraight' | 'northSouthStraight' | 'leftTurn' | 'allRed';

export type LightColor = 'red' | 'yellow' | 'green';

export interface IntersectionConfig {
  id: string;
  position: Vector3;
  eastWestGreenDuration: number;
  northSouthGreenDuration: number;
  leftTurnGreenDuration: number;
  yellowDuration: number;
  allRedDuration: number;
}

export interface IntersectionState {
  id: string;
  position: Vector3;
  currentPhase: TrafficLightPhase;
  phaseTimer: number;
  eastWestColor: LightColor;
  northSouthColor: LightColor;
  leftTurnColor: LightColor;
  config: IntersectionConfig;
}

export interface RoadSegment {
  id: string;
  start: Vector3;
  end: Vector3;
  length: number;
  lanes: number;
  direction: 'eastWest' | 'northSouth';
}

export type VehicleType = 'car' | 'truck' | 'bus';

export type VehicleDirection = 'east' | 'west' | 'north' | 'south';

export type TurnType = 'straight' | 'left' | 'right';

export interface Vehicle {
  id: number;
  type: VehicleType;
  position: Vector3;
  direction: VehicleDirection;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  color: number;
  length: number;
  width: number;
  segmentIndex: number;
  pathProgress: number;
  isStopped: boolean;
  stopTimer: number;
  turnType: TurnType;
  turning: boolean;
  turnProgress: number;
  turnCenter: Vector3 | null;
  turnRadius: number;
  turnStartAngle: number;
  turnEndAngle: number;
  targetIntersection: string | null;
  pathId: string;
}

export interface VehiclePool {
  vehicles: Vehicle[];
  activeCount: number;
  instanceMesh: any;
}

export interface DensityData {
  segmentId: string;
  density: number;
  vehicleCount: number;
}

export interface HeatmapConfig {
  minDensityThreshold: number;
  maxDensityThreshold: number;
  updateInterval: number;
  maxUpdateTime: number;
}

export interface TrafficConfig {
  baseVehicleCount: number;
  rushHourMultiplier: number;
  morningRushStart: number;
  morningRushEnd: number;
  eveningRushStart: number;
  eveningRushEnd: number;
  leftTurnWaitTime: number;
  vehicleSpawnInterval: number;
  maxVehicleCount: number;
}

export interface SimulationStats {
  totalVehicles: number;
  averageSpeed: number;
  congestedSegments: number;
  fps: number;
}

export interface TimeOfDay {
  hour: number;
}

export interface SpatialGridCell {
  vehicles: number[];
}

export interface SpatialGrid {
  cells: Map<string, SpatialGridCell>;
  cellSize: number;
  vehicleIndices: Map<number, string>;
}
