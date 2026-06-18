export type SchedulingStrategy = 'astar' | 'load_balance' | 'priority';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type DroneStatus = 'idle' | 'flying' | 'delivering' | 'returning';

export interface Drone {
  id: string;
  position: Vector3;
  color: string;
  path: Vector3[];
  currentPathIndex: number;
  speed: number;
  status: DroneStatus;
  carriedPackageId: string | null;
  homeCenterId: string;
  distanceTraveled: number;
  trailProgress: number;
}

export type PackageStatus = 'pending' | 'in_transit' | 'delivered';

export interface PackagePoint {
  id: string;
  position: Vector3;
  priority: number;
  status: PackageStatus;
  assignedDroneId: string | null;
}

export interface DeliveryCenter {
  id: string;
  position: Vector3;
  droneCount: number;
}

export interface Building {
  id: string;
  position: Vector3;
  width: number;
  depth: number;
  height: number;
}

export interface Particle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Statistics {
  activeDrones: number;
  deliveredPackages: number;
  totalDistance: number;
  simulationTime: number;
  totalSimulationTime: number;
}

export interface SimulationState {
  strategy: SchedulingStrategy;
  speedMultiplier: number;
  isRunning: boolean;
  drones: Drone[];
  packages: PackagePoint[];
  deliveryCenters: DeliveryCenter[];
  buildings: Building[];
  particles: Particle[];
  statistics: Statistics;
  cameraAngle: number;

  setStrategy: (strategy: SchedulingStrategy) => void;
  setSpeedMultiplier: (speed: number) => void;
  toggleRunning: () => void;
  generateNewTasks: (count: number) => void;
  updateSimulation: (deltaTime: number) => void;
  addParticleEffect: (position: Vector3, color: string) => void;
  setCameraAngle: (angle: number) => void;
}
