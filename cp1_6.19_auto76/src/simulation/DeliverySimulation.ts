import { v4 as uuidv4 } from 'uuid';
import type {
  Vector3,
  Drone,
  PackagePoint,
  DeliveryCenter,
  Building,
  Particle,
  SchedulingStrategy,
  Statistics,
} from '../types';

const GRID_SIZE = 100;
const DRONE_SPEED = 15;
const DRONE_ALTITUDE = 5;
const MAX_PARTICLE_EFFECTS = 3;
const PARTICLES_PER_EFFECT = 40;
const PARTICLE_LIFETIME = 1.2;

const DRONE_COLORS = ['#ff4d4d', '#4dff4d', '#4d4dff'];

function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface AStarNode {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function findPathAStar(
  start: Vector3,
  end: Vector3,
  buildings: Building[]
): Vector3[] {
  const gridResolution = 2;
  const gridSize = Math.floor(GRID_SIZE / gridResolution);

  const isBlocked = (gx: number, gz: number): boolean => {
    const wx = gx * gridResolution - GRID_SIZE / 2 + gridResolution / 2;
    const wz = gz * gridResolution - GRID_SIZE / 2 + gridResolution / 2;

    for (const b of buildings) {
      const halfW = b.width / 2 + 0.5;
      const halfD = b.depth / 2 + 0.5;
      if (
        wx >= b.position.x - halfW &&
        wx <= b.position.x + halfW &&
        wz >= b.position.z - halfD &&
        wz <= b.position.z + halfD
      ) {
        return true;
      }
    }
    return false;
  };

  const startGx = Math.floor((start.x + GRID_SIZE / 2) / gridResolution);
  const startGz = Math.floor((start.z + GRID_SIZE / 2) / gridResolution);
  const endGx = Math.floor((end.x + GRID_SIZE / 2) / gridResolution);
  const endGz = Math.floor((end.z + GRID_SIZE / 2) / gridResolution);

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    x: startGx,
    z: startGz,
    g: 0,
    h: Math.abs(endGx - startGx) + Math.abs(endGz - startGz),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  const key = (x: number, z: number) => `${x},${z}`;

  while (openSet.length > 0) {
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) {
        lowestIdx = i;
      }
    }

    const current = openSet.splice(lowestIdx, 1)[0];

    if (current.x === endGx && current.z === endGz) {
      const path: Vector3[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.push({
          x: node.x * gridResolution - GRID_SIZE / 2 + gridResolution / 2,
          y: DRONE_ALTITUDE,
          z: node.z * gridResolution - GRID_SIZE / 2 + gridResolution / 2,
        });
        node = node.parent;
      }
      path.reverse();

      if (path.length > 0) {
        path[0].y = start.y;
        path[path.length - 1].y = end.y;
      }

      return simplifyPath(path);
    }

    closedSet.add(key(current.x, current.z));

    const neighbors = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];

    for (const [dx, dz] of neighbors) {
      const nx = current.x + dx;
      const nz = current.z + dz;

      if (nx < 0 || nx >= gridSize || nz < 0 || nz >= gridSize) continue;
      if (closedSet.has(key(nx, nz))) continue;
      if (isBlocked(nx, nz)) continue;

      const moveCost = dx !== 0 && dz !== 0 ? 1.414 : 1;
      const g = current.g + moveCost;
      const h = Math.abs(endGx - nx) + Math.abs(endGz - nz);
      const f = g + h;

      const existing = openSet.find((n) => n.x === nx && n.z === nz);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
      } else {
        openSet.push({
          x: nx,
          z: nz,
          g,
          h,
          f,
          parent: current,
        });
      }
    }

    if (openSet.length > 5000) break;
  }

  return [
    { x: start.x, y: start.y, z: start.z },
    { x: start.x, y: DRONE_ALTITUDE, z: start.z },
    { x: end.x, y: DRONE_ALTITUDE, z: end.z },
    { x: end.x, y: end.y, z: end.z },
  ];
}

function simplifyPath(path: Vector3[]): Vector3[] {
  if (path.length <= 2) return path;

  const result: Vector3[] = [path[0]];
  let lastDir: Vector3 | null = null;

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    const dir1 = {
      x: curr.x - prev.x,
      y: curr.y - prev.y,
      z: curr.z - prev.z,
    };
    const dir2 = {
      x: next.x - curr.x,
      y: next.y - curr.y,
      z: next.z - curr.z,
    };

    const dot = dir1.x * dir2.x + dir1.y * dir2.y + dir1.z * dir2.z;
    const mag1 = Math.sqrt(dir1.x * dir1.x + dir1.y * dir1.y + dir1.z * dir1.z);
    const mag2 = Math.sqrt(dir2.x * dir2.x + dir2.y * dir2.y + dir2.z * dir2.z);

    if (mag1 === 0 || mag2 === 0) continue;

    const cosAngle = dot / (mag1 * mag2);

    if (Math.abs(cosAngle - 1) > 0.05) {
      result.push(curr);
    }

    lastDir = dir2;
  }

  result.push(path[path.length - 1]);
  return result;
}

export class DeliverySimulation {
  private drones: Drone[] = [];
  private packages: PackagePoint[] = [];
  private deliveryCenters: DeliveryCenter[] = [];
  private buildings: Building[] = [];
  private particles: Particle[] = [];
  private statistics: Statistics;
  private strategy: SchedulingStrategy = 'astar';
  private speedMultiplier: number = 1;
  private activeParticleEffects: number = 0;

  constructor() {
    this.statistics = {
      activeDrones: 0,
      deliveredPackages: 0,
      totalDistance: 0,
      simulationTime: 0,
      totalSimulationTime: 600,
    };
    this.initializeCity();
  }

  private initializeCity(): void {
    this.buildings = this.generateBuildings();
    this.deliveryCenters = this.generateDeliveryCenters();
    this.packages = this.generatePackages(10);
    this.drones = this.generateDrones(9);
    this.updateStatistics();
  }

  private generateBuildings(): Building[] {
    const buildings: Building[] = [];
    const spacing = 12;
    const offset = GRID_SIZE / 2 - spacing / 2;

    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        if (Math.abs(gx) < 1 && Math.abs(gz) < 1) continue;

        const width = 4 + Math.random() * 4;
        const depth = 4 + Math.random() * 4;
        const height = 2 + Math.random() * 6;

        buildings.push({
          id: uuidv4(),
          position: {
            x: gx * spacing,
            y: height / 2,
            z: gz * spacing,
          },
          width,
          depth,
          height,
        });
      }
    }

    return buildings;
  }

  private generateDeliveryCenters(): DeliveryCenter[] {
    const positions = [
      { x: -35, z: -35 },
      { x: 35, z: -35 },
      { x: 0, z: 35 },
    ];

    return positions.map((pos, i) => ({
      id: `center-${i}`,
      position: { x: pos.x, y: 0.25, z: pos.z },
      droneCount: 3,
    }));
  }

  private generatePackages(count: number): PackagePoint[] {
    const packages: PackagePoint[] = [];

    for (let i = 0; i < count; i++) {
      packages.push(this.createRandomPackage());
    }

    return packages;
  }

  private createRandomPackage(): PackagePoint {
    let x: number, z: number;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 50) {
      x = (Math.random() - 0.5) * (GRID_SIZE - 10);
      z = (Math.random() - 0.5) * (GRID_SIZE - 10);
      valid = true;

      for (const b of this.buildings) {
        const dist = Math.sqrt(
          Math.pow(x - b.position.x, 2) + Math.pow(z - b.position.z, 2)
        );
        if (dist < 5) {
          valid = false;
          break;
        }
      }

      for (const c of this.deliveryCenters) {
        const dist = Math.sqrt(
          Math.pow(x - c.position.x, 2) + Math.pow(z - c.position.z, 2)
        );
        if (dist < 8) {
          valid = false;
          break;
        }
      }

      attempts++;
    }

    return {
      id: uuidv4(),
      position: { x: x!, y: 0.15, z: z! },
      priority: Math.floor(Math.random() * 5) + 1,
      status: 'pending',
      assignedDroneId: null,
    };
  }

  private generateDrones(count: number): Drone[] {
    const drones: Drone[] = [];
    let colorIndex = 0;

    for (const center of this.deliveryCenters) {
      for (let i = 0; i < center.droneCount; i++) {
        const angle = (i / center.droneCount) * Math.PI * 2;
        const radius = 3;

        drones.push({
          id: uuidv4(),
          position: {
            x: center.position.x + Math.cos(angle) * radius,
            y: 0.5,
            z: center.position.z + Math.sin(angle) * radius,
          },
          color: DRONE_COLORS[colorIndex % DRONE_COLORS.length],
          path: [],
          currentPathIndex: 0,
          speed: DRONE_SPEED,
          status: 'idle',
          carriedPackageId: null,
          homeCenterId: center.id,
          distanceTraveled: 0,
          trailProgress: 0,
        });

        colorIndex++;
      }
    }

    return drones;
  }

  getDrones(): Drone[] {
    return this.drones;
  }

  getPackages(): PackagePoint[] {
    return this.packages;
  }

  getDeliveryCenters(): DeliveryCenter[] {
    return this.deliveryCenters;
  }

  getBuildings(): Building[] {
    return this.buildings;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getStatistics(): Statistics {
    return { ...this.statistics };
  }

  setStrategy(strategy: SchedulingStrategy): void {
    this.strategy = strategy;
    this.replanAllDrones();
  }

  setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = clamp(speed, 0.5, 5);
  }

  generateNewTasks(count: number): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const pkg = this.createRandomPackage();
        this.packages.push(pkg);
        this.assignPackages();
      }, i * 2000);
    }
  }

  private replanAllDrones(): void {
    for (const drone of this.drones) {
      if (drone.status === 'flying' || drone.status === 'delivering') {
        if (drone.carriedPackageId) {
          const pkg = this.packages.find((p) => p.id === drone.carriedPackageId);
          if (pkg) {
            const newPath = findPathAStar(drone.position, pkg.position, this.buildings);
            drone.path = newPath;
            drone.currentPathIndex = 0;
            drone.trailProgress = 0;
          }
        } else if (drone.status === 'flying') {
          const target = drone.path[drone.path.length - 1];
          if (target) {
            const newPath = findPathAStar(drone.position, target, this.buildings);
            drone.path = newPath;
            drone.currentPathIndex = 0;
            drone.trailProgress = 0;
          }
        }
      }
    }
  }

  private assignPackages(): void {
    const pendingPackages = this.packages.filter((p) => p.status === 'pending');
    const idleDrones = this.drones.filter((d) => d.status === 'idle');

    if (this.strategy === 'priority') {
      pendingPackages.sort((a, b) => b.priority - a.priority);
    }

    for (const pkg of pendingPackages) {
      if (idleDrones.length === 0) break;

      let selectedDrone: Drone | null = null;

      if (this.strategy === 'load_balance') {
        const centerLoads = new Map<string, number>();
        for (const center of this.deliveryCenters) {
          const centerDrones = this.drones.filter(
            (d) => d.homeCenterId === center.id && d.status !== 'idle'
          );
          centerLoads.set(center.id, centerDrones.length);
        }

        let minLoad = Infinity;
        let bestCenter: string | null = null;
        for (const [centerId, load] of centerLoads) {
          const hasIdle = idleDrones.some((d) => d.homeCenterId === centerId);
          if (hasIdle && load < minLoad) {
            minLoad = load;
            bestCenter = centerId;
          }
        }

        if (bestCenter) {
          selectedDrone =
            idleDrones.find((d) => d.homeCenterId === bestCenter) || null;
        }
      } else {
        let minDist = Infinity;
        for (const drone of idleDrones) {
          const dist = distance(drone.position, pkg.position);
          if (dist < minDist) {
            minDist = dist;
            selectedDrone = drone;
          }
        }
      }

      if (selectedDrone) {
        const center = this.deliveryCenters.find(
          (c) => c.id === selectedDrone!.homeCenterId
        );
        if (center) {
          const pathToPackage = findPathAStar(
            center.position,
            pkg.position,
            this.buildings
          );

          selectedDrone.path = pathToPackage;
          selectedDrone.currentPathIndex = 0;
          selectedDrone.status = 'flying';
          selectedDrone.carriedPackageId = pkg.id;
          selectedDrone.trailProgress = 0;

          pkg.status = 'in_transit';
          pkg.assignedDroneId = selectedDrone.id;

          const idx = idleDrones.indexOf(selectedDrone);
          if (idx > -1) idleDrones.splice(idx, 1);
        }
      }
    }

    this.updateStatistics();
  }

  update(deltaTime: number): void {
    const dt = deltaTime * this.speedMultiplier;
    this.statistics.simulationTime += dt;

    for (const drone of this.drones) {
      this.updateDrone(drone, dt);
    }

    this.updateParticles(dt);
    this.updateStatistics();
  }

  private updateDrone(drone: Drone, dt: number): void {
    if (drone.status === 'idle') return;

    if (drone.path.length === 0 || drone.currentPathIndex >= drone.path.length) {
      this.handleDroneArrival(drone);
      return;
    }

    const target = drone.path[drone.currentPathIndex];
    const dist = distance(drone.position, target);
    const moveDistance = drone.speed * dt;

    if (dist <= moveDistance) {
      drone.position = { ...target };
      drone.currentPathIndex++;
      drone.trailProgress = drone.currentPathIndex;
    } else {
      const t = moveDistance / dist;
      drone.position = lerpVec3(drone.position, target, t);
      drone.distanceTraveled += moveDistance;

      const progressPerSegment = 1 / Math.max(dist, 0.1);
      drone.trailProgress += moveDistance * progressPerSegment;
    }
  }

  private handleDroneArrival(drone: Drone): void {
    if (drone.status === 'flying' && drone.carriedPackageId) {
      const pkg = this.packages.find((p) => p.id === drone.carriedPackageId);
      if (pkg) {
        pkg.status = 'delivered';
        this.statistics.deliveredPackages++;
        this.addParticleEffect(pkg.position, drone.color);
      }
      drone.carriedPackageId = null;
      drone.status = 'returning';

      const center = this.deliveryCenters.find(
        (c) => c.id === drone.homeCenterId
      );
      if (center) {
        drone.path = findPathAStar(drone.position, center.position, this.buildings);
        drone.currentPathIndex = 0;
        drone.trailProgress = 0;
      }
    } else if (drone.status === 'returning') {
      drone.status = 'idle';
      drone.path = [];
      drone.currentPathIndex = 0;
      drone.trailProgress = 0;

      const center = this.deliveryCenters.find(
        (c) => c.id === drone.homeCenterId
      );
      if (center) {
        drone.position = { ...center.position, y: 0.5 };
      }

      this.assignPackages();
    }
  }

  addParticleEffect(position: Vector3, color: string): void {
    if (this.activeParticleEffects >= MAX_PARTICLE_EFFECTS) return;

    this.activeParticleEffects++;

    for (let i = 0; i < PARTICLES_PER_EFFECT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const verticalSpeed = 3 + Math.random() * 5;

      this.particles.push({
        id: uuidv4(),
        position: { ...position, y: position.y + 0.5 },
        velocity: {
          x: Math.cos(angle) * speed,
          y: verticalSpeed,
          z: Math.sin(angle) * speed,
        },
        color,
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
        size: 0.1 + Math.random() * 0.15,
      });
    }

    setTimeout(() => {
      this.activeParticleEffects--;
    }, PARTICLE_LIFETIME * 1000);
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 5 * dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
    }
  }

  private updateStatistics(): void {
    this.statistics.activeDrones = this.drones.filter(
      (d) => d.status !== 'idle'
    ).length;
    this.statistics.totalDistance = this.drones.reduce(
      (sum, d) => sum + d.distanceTraveled,
      0
    );
  }

  startInitialAssignments(): void {
    this.assignPackages();
  }
}
