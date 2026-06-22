import * as THREE from 'three';
import { RoadNetwork } from './roadNetwork';
import type {
  Vehicle,
  VehicleType,
  VehicleDirection,
  TurnType,
  DensityData,
  TrafficConfig,
  SimulationStats,
  SpatialGrid,
  Vector3,
} from '../types';

export class TrafficSimulation {
  private scene: THREE.Scene;
  private roadNetwork: RoadNetwork;
  private vehicles: Vehicle[] = [];
  private vehiclePool: Vehicle[] = [];
  private activeVehicleCount: number = 0;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private dummy: THREE.Object3D = new THREE.Object3D();

  private config: TrafficConfig = {
    baseVehicleCount: 150,
    rushHourMultiplier: 3,
    morningRushStart: 7,
    morningRushEnd: 9,
    eveningRushStart: 17,
    eveningRushEnd: 19,
    leftTurnWaitTime: 2,
    vehicleSpawnInterval: 0.3,
    maxVehicleCount: 1000,
  };

  private currentTime: number = 8;
  private targetVehicleCount: number = 150;
  private spawnTimer: number = 0;
  private densityData: DensityData[] = [];
  private densityUpdateTimer: number = 0;

  private spatialGrid: SpatialGrid = {
    cells: new Map(),
    cellSize: 20,
    vehicleIndices: new Map(),
  };

  private performanceMode: 'high' | 'medium' | 'low' = 'high';
  private fpsHistory: number[] = [];
  private frameTimes: number[] = [];
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private degradationApplied: boolean = false;
  private originalBaseVehicleCount: number = 150;
  private consecutiveLowFpsFrames: number = 0;

  private vehicleColors: number[] = [
    0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
    0x1abc9c, 0xe67e22, 0x34495e, 0xe91e63, 0x00bcd4,
  ];

  private onVehicleCountChangeCallbacks: Array<(count: number) => void> = [];
  private onDensityUpdateCallbacks: Array<(data: DensityData[]) => void> = [];

  constructor(scene: THREE.Scene, roadNetwork: RoadNetwork) {
    this.scene = scene;
    this.roadNetwork = roadNetwork;
    this.originalBaseVehicleCount = this.config.baseVehicleCount;
    this.initVehiclePool();
    this.initInstancedMesh();
    this.initDensityData();
    this.updateTargetVehicleCount();
  }

  private initVehiclePool(): void {
    const poolSize = this.config.maxVehicleCount;
    for (let i = 0; i < poolSize; i++) {
      this.vehiclePool.push(this.createVehicle(i));
    }
  }

  private createVehicle(id: number): Vehicle {
    const types: VehicleType[] = ['car', 'car', 'car', 'car', 'truck', 'bus'];
    const type = types[Math.floor(Math.random() * types.length)];
    const color = this.vehicleColors[Math.floor(Math.random() * this.vehicleColors.length)];

    let length = 2.5;
    let width = 1.2;
    let maxSpeed = 15;
    let acceleration = 8;
    let deceleration = 12;

    if (type === 'truck') {
      length = 4;
      width = 1.6;
      maxSpeed = 10;
      acceleration = 5;
      deceleration = 8;
    } else if (type === 'bus') {
      length = 5;
      width = 1.8;
      maxSpeed = 12;
      acceleration = 4;
      deceleration = 7;
    }

    return {
      id,
      type,
      position: { x: 0, y: 0.5, z: 0 },
      direction: 'east',
      speed: 0,
      maxSpeed,
      acceleration,
      deceleration,
      color,
      length,
      width,
      segmentIndex: 0,
      pathProgress: 0,
      isStopped: false,
      stopTimer: 0,
      turnType: 'straight',
      turning: false,
      turnProgress: 0,
      turnCenter: null,
      turnRadius: 0,
      turnStartAngle: 0,
      turnEndAngle: 0,
      targetIntersection: null,
      pathId: '',
    };
  }

  private initInstancedMesh(): void {
    const carGeometry = new THREE.BoxGeometry(2.5, 0.8, 1.2);
    const carMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

    this.instancedMesh = new THREE.InstancedMesh(
      carGeometry,
      carMaterial,
      this.config.maxVehicleCount
    );
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;

    const colors = new Float32Array(this.config.maxVehicleCount * 3);
    for (let i = 0; i < this.config.maxVehicleCount; i++) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    this.scene.add(this.instancedMesh);
  }

  private initDensityData(): void {
    const segments = this.roadNetwork.getSegments();
    this.densityData = segments.map((segment) => ({
      segmentId: segment.id,
      density: 0,
      vehicleCount: 0,
    }));
  }

  update(deltaTime: number, currentTimeHour?: number): void {
    if (currentTimeHour !== undefined) {
      this.currentTime = currentTimeHour;
      this.updateTargetVehicleCount();
    }

    this.manageVehiclePopulation(deltaTime);
    this.updateDynamicSpatialGridSize();
    this.updateVehicles(deltaTime);
    this.updateSpatialGrid();
    this.updateInstancedMesh();

    this.densityUpdateTimer += deltaTime;
    if (this.densityUpdateTimer >= 0.1) {
      this.updateDensityData();
      this.densityUpdateTimer = 0;
    }

    this.lastFpsUpdate += deltaTime;
    if (this.lastFpsUpdate >= 1) {
      this.currentFps = this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        : 60;
      this.fpsHistory = [];
      this.lastFpsUpdate = 0;
      this.adjustPerformanceMode();
    }

    if (deltaTime > 0) {
      this.fpsHistory.push(1 / deltaTime);
      if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    }
  }

  private updateTargetVehicleCount(): void {
    const hour = this.currentTime;
    let multiplier = 1;

    if (hour >= this.config.morningRushStart && hour <= this.config.morningRushEnd) {
      const mid = (this.config.morningRushStart + this.config.morningRushEnd) / 2;
      const dist = Math.abs(hour - mid) / ((this.config.morningRushEnd - this.config.morningRushStart) / 2);
      multiplier = 1 + (this.config.rushHourMultiplier - 1) * (1 - dist);
    } else if (hour >= this.config.eveningRushStart && hour <= this.config.eveningRushEnd) {
      const mid = (this.config.eveningRushStart + this.config.eveningRushEnd) / 2;
      const dist = Math.abs(hour - mid) / ((this.config.eveningRushEnd - this.config.eveningRushStart) / 2);
      multiplier = 1 + (this.config.rushHourMultiplier - 1) * (1 - dist);
    } else if (hour > this.config.morningRushEnd && hour < this.config.eveningRushStart) {
      multiplier = 1 + (this.config.rushHourMultiplier - 1) * 0.3;
    } else {
      multiplier = 0.5;
    }

    this.targetVehicleCount = Math.min(
      Math.floor(this.config.baseVehicleCount * multiplier),
      this.config.maxVehicleCount
    );
  }

  private manageVehiclePopulation(deltaTime: number): void {
    if (this.activeVehicleCount < this.targetVehicleCount) {
      this.spawnTimer += deltaTime;
      const spawnInterval = this.config.vehicleSpawnInterval * (this.performanceMode === 'low' ? 2 : 1);

      if (this.spawnTimer >= spawnInterval) {
        this.spawnTimer = 0;
        this.spawnVehicle();
      }
    } else if (this.activeVehicleCount > this.targetVehicleCount) {
      const toRemove = this.activeVehicleCount - this.targetVehicleCount;
      for (let i = 0; i < Math.min(toRemove, 5); i++) {
        this.removeRandomVehicle();
      }
    }
  }

  private spawnVehicle(): void {
    if (this.activeVehicleCount >= this.vehiclePool.length) return;

    const vehicle = this.vehiclePool[this.activeVehicleCount];
    const segments = this.roadNetwork.getSegments();
    const validSegments = segments.filter((s) => s.length > 10);

    if (validSegments.length === 0) return;

    const segment = validSegments[Math.floor(Math.random() * validSegments.length)];
    const progress = Math.random();

    const pos = this.getPositionOnSegment(segment, progress);
    vehicle.position = pos;
    vehicle.pathProgress = progress;
    vehicle.segmentIndex = segments.indexOf(segment);
    vehicle.speed = vehicle.maxSpeed * (0.5 + Math.random() * 0.5);
    vehicle.isStopped = false;
    vehicle.stopTimer = 0;
    vehicle.turning = false;
    vehicle.turnProgress = 0;
    vehicle.pathId = segment.id;

    if (segment.direction === 'eastWest') {
      vehicle.direction = Math.random() > 0.5 ? 'east' : 'west';
    } else {
      vehicle.direction = Math.random() > 0.5 ? 'north' : 'south';
    }

    const turnTypes: TurnType[] = ['straight', 'straight', 'straight', 'left', 'right'];
    vehicle.turnType = turnTypes[Math.floor(Math.random() * turnTypes.length)];

    this.activeVehicleCount++;
    this.notifyVehicleCountChange();
  }

  private removeRandomVehicle(): void {
    if (this.activeVehicleCount <= 0) return;

    const index = Math.floor(Math.random() * this.activeVehicleCount);
    const vehicle = this.vehiclePool[index];
    const lastVehicle = this.vehiclePool[this.activeVehicleCount - 1];

    this.vehiclePool[index] = lastVehicle;
    this.vehiclePool[this.activeVehicleCount - 1] = vehicle;

    this.activeVehicleCount--;
    this.notifyVehicleCountChange();
  }

  private getPositionOnSegment(segment: any, progress: number): Vector3 {
    return {
      x: segment.start.x + (segment.end.x - segment.start.x) * progress,
      y: 0.5,
      z: segment.start.z + (segment.end.z - segment.start.z) * progress,
    };
  }

  private updateVehicles(deltaTime: number): void {
    const segments = this.roadNetwork.getSegments();

    for (let i = 0; i < this.activeVehicleCount; i++) {
      const vehicle = this.vehiclePool[i];
      const segment = segments[vehicle.segmentIndex];

      if (!segment) continue;

      if (vehicle.turning) {
        this.updateTurningVehicle(vehicle, deltaTime);
        continue;
      }

      const shouldStop = this.checkTrafficLight(vehicle, segment);

      if (shouldStop || vehicle.isStopped) {
        this.handleVehicleStop(vehicle, deltaTime, segment);
      } else {
        this.handleVehicleMove(vehicle, deltaTime, segment);
      }
    }
  }

  private checkTrafficLight(vehicle: Vehicle, segment: any): boolean {
    const distToEnd = segment.length * (1 - vehicle.pathProgress);

    if (distToEnd > 15) return false;

    const intersection = this.getNextIntersection(vehicle, segment);
    if (!intersection) return false;

    const lightColor = this.getAppropriateLightColor(vehicle, intersection.id);

    if (lightColor === 'green') return false;
    if (lightColor === 'yellow') {
      return distToEnd < 8;
    }

    return distToEnd < 12;
  }

  private getNextIntersection(vehicle: Vehicle, segment: any): any {
    const intersections = this.roadNetwork.getAllIntersections();

    let endPos;
    if (vehicle.direction === 'east' || vehicle.direction === 'north') {
      endPos = segment.end;
    } else {
      endPos = segment.start;
    }

    for (const int of intersections) {
      const dx = Math.abs(int.position.x - endPos.x);
      const dz = Math.abs(int.position.z - endPos.z);
      if (dx < 2 && dz < 2) {
        return int;
      }
    }

    return null;
  }

  private getAppropriateLightColor(vehicle: Vehicle, intersectionId: string): string {
    if (vehicle.turnType === 'left') {
      return this.roadNetwork.getLightColor(intersectionId, 'leftTurn');
    }

    if (vehicle.direction === 'east' || vehicle.direction === 'west') {
      return this.roadNetwork.getLightColor(intersectionId, 'eastWest');
    } else {
      return this.roadNetwork.getLightColor(intersectionId, 'northSouth');
    }
  }

  private handleVehicleStop(vehicle: Vehicle, deltaTime: number, segment: any): void {
    vehicle.speed = Math.max(0, vehicle.speed - vehicle.deceleration * deltaTime);

    if (vehicle.speed <= 0.1) {
      vehicle.speed = 0;
      vehicle.isStopped = true;
      vehicle.stopTimer += deltaTime;
    }

    this.moveVehicleAlongSegment(vehicle, deltaTime, segment);
  }

  private handleVehicleMove(vehicle: Vehicle, deltaTime: number, segment: any): void {
    if (vehicle.isStopped) {
      vehicle.isStopped = false;
      vehicle.stopTimer = 0;
    }

    const targetSpeed = vehicle.maxSpeed;
    if (vehicle.speed < targetSpeed) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + vehicle.acceleration * deltaTime);
    }

    const distToEnd = segment.length * (1 - vehicle.pathProgress);
    const stopDistance = (vehicle.speed * vehicle.speed) / (2 * vehicle.deceleration);

    if (distToEnd < stopDistance + 2 && vehicle.pathProgress > 0.7) {
      this.checkAndInitiateTurn(vehicle, segment);
    }

    this.moveVehicleAlongSegment(vehicle, deltaTime, segment);
  }

  private moveVehicleAlongSegment(vehicle: Vehicle, deltaTime: number, segment: any): void {
    const moveDistance = vehicle.speed * deltaTime;
    const progressDelta = moveDistance / segment.length;

    if (vehicle.direction === 'east' || vehicle.direction === 'north') {
      vehicle.pathProgress += progressDelta;

      if (vehicle.pathProgress >= 1) {
        this.moveToNextSegment(vehicle, segment);
        return;
      }
    } else {
      vehicle.pathProgress -= progressDelta;

      if (vehicle.pathProgress <= 0) {
        this.moveToNextSegment(vehicle, segment);
        return;
      }
    }

    const pos = this.getPositionOnSegment(segment, vehicle.pathProgress);
    vehicle.position = pos;
  }

  private moveToNextSegment(vehicle: Vehicle, currentSegment: any): void {
    const segments = this.roadNetwork.getSegments();
    const intersections = this.roadNetwork.getAllIntersections();

    let intersectionPos;
    if (vehicle.direction === 'east' || vehicle.direction === 'north') {
      intersectionPos = currentSegment.end;
    } else {
      intersectionPos = currentSegment.start;
    }

    let currentIntersection: any = null;
    for (const int of intersections) {
      const dx = Math.abs(int.position.x - intersectionPos.x);
      const dz = Math.abs(int.position.z - intersectionPos.z);
      if (dx < 2 && dz < 2) {
        currentIntersection = int;
        break;
      }
    }

    if (!currentIntersection) {
      this.respawnVehicle(vehicle);
      return;
    }

    if (vehicle.turnType === 'left' || vehicle.turnType === 'right') {
      this.initiateTurn(vehicle, currentIntersection);
      return;
    }

    const nextSegments = this.findConnectedSegments(
      currentIntersection,
      vehicle.direction,
      segments
    );

    if (nextSegments.length === 0) {
      this.respawnVehicle(vehicle);
      return;
    }

    const nextSegment = nextSegments[Math.floor(Math.random() * nextSegments.length)];
    vehicle.segmentIndex = segments.indexOf(nextSegment);

    if (vehicle.direction === 'east' || vehicle.direction === 'north') {
      vehicle.pathProgress = 0.05;
    } else {
      vehicle.pathProgress = 0.95;
    }

    const turnTypes: TurnType[] = ['straight', 'straight', 'straight', 'left', 'right'];
    vehicle.turnType = turnTypes[Math.floor(Math.random() * turnTypes.length)];
  }

  private findConnectedSegments(
    intersection: any,
    direction: VehicleDirection,
    segments: any[]
  ): any[] {
    const pos = intersection.position;
    const connected: any[] = [];

    for (const seg of segments) {
      const startsAtIntersection =
        Math.abs(seg.start.x - pos.x) < 2 && Math.abs(seg.start.z - pos.z) < 2;
      const endsAtIntersection =
        Math.abs(seg.end.x - pos.x) < 2 && Math.abs(seg.end.z - pos.z) < 2;

      if (!startsAtIntersection && !endsAtIntersection) continue;

      if (direction === 'east' && startsAtIntersection && seg.direction === 'eastWest') {
        connected.push(seg);
      } else if (direction === 'west' && endsAtIntersection && seg.direction === 'eastWest') {
        connected.push(seg);
      } else if (direction === 'north' && startsAtIntersection && seg.direction === 'northSouth') {
        connected.push(seg);
      } else if (direction === 'south' && endsAtIntersection && seg.direction === 'northSouth') {
        connected.push(seg);
      }
    }

    return connected;
  }

  private initiateTurn(vehicle: Vehicle, intersection: any): void {
    vehicle.turning = true;
    vehicle.turnProgress = 0;
    vehicle.turnCenter = { ...intersection.position, y: 0.5 };

    const turnRadius = 6;
    vehicle.turnRadius = turnRadius;

    let startAngle = 0;
    let endAngle = 0;

    if (vehicle.turnType === 'left') {
      vehicle.stopTimer = -1;

      switch (vehicle.direction) {
        case 'east':
          startAngle = Math.PI;
          endAngle = Math.PI / 2;
          vehicle.turnCenter = {
            x: intersection.position.x - turnRadius,
            y: 0.5,
            z: intersection.position.z + turnRadius,
          };
          break;
        case 'west':
          startAngle = 0;
          endAngle = -Math.PI / 2;
          vehicle.turnCenter = {
            x: intersection.position.x + turnRadius,
            y: 0.5,
            z: intersection.position.z - turnRadius,
          };
          break;
        case 'north':
          startAngle = -Math.PI / 2;
          endAngle = Math.PI;
          vehicle.turnCenter = {
            x: intersection.position.x - turnRadius,
            y: 0.5,
            z: intersection.position.z - turnRadius,
          };
          break;
        case 'south':
          startAngle = Math.PI / 2;
          endAngle = 0;
          vehicle.turnCenter = {
            x: intersection.position.x + turnRadius,
            y: 0.5,
            z: intersection.position.z + turnRadius,
          };
          break;
      }
    } else {
      switch (vehicle.direction) {
        case 'east':
          startAngle = Math.PI;
          endAngle = Math.PI / 2;
          vehicle.turnCenter = {
            x: intersection.position.x + turnRadius,
            y: 0.5,
            z: intersection.position.z + turnRadius,
          };
          break;
        case 'west':
          startAngle = 0;
          endAngle = -Math.PI / 2;
          vehicle.turnCenter = {
            x: intersection.position.x - turnRadius,
            y: 0.5,
            z: intersection.position.z - turnRadius,
          };
          break;
        case 'north':
          startAngle = -Math.PI / 2;
          endAngle = 0;
          vehicle.turnCenter = {
            x: intersection.position.x + turnRadius,
            y: 0.5,
            z: intersection.position.z - turnRadius,
          };
          break;
        case 'south':
          startAngle = Math.PI / 2;
          endAngle = Math.PI;
          vehicle.turnCenter = {
            x: intersection.position.x - turnRadius,
            y: 0.5,
            z: intersection.position.z + turnRadius,
          };
          break;
      }
    }

    vehicle.turnStartAngle = startAngle;
    vehicle.turnEndAngle = endAngle;

    if (vehicle.turnType === 'left') {
      vehicle.speed = vehicle.speed;
    } else {
      vehicle.speed = vehicle.maxSpeed * 0.4;
    }
  }

  private updateTurningVehicle(vehicle: Vehicle, deltaTime: number): void {
    if (vehicle.turnType === 'left') {
      if (vehicle.stopTimer === -1) {
        vehicle.speed = Math.max(0, vehicle.speed - vehicle.deceleration * 1.5 * deltaTime);

        if (vehicle.speed <= 0.05) {
          vehicle.speed = 0;
          vehicle.stopTimer = this.config.leftTurnWaitTime;
        }
        return;
      }

      if (vehicle.stopTimer > 0) {
        vehicle.stopTimer -= deltaTime;
        vehicle.speed = 0;
        return;
      }

      if (vehicle.speed < vehicle.maxSpeed * 0.3) {
        vehicle.speed = Math.min(
          vehicle.maxSpeed * 0.3,
          vehicle.speed + vehicle.acceleration * 0.5 * deltaTime
        );
      }
    } else {
      vehicle.speed = vehicle.maxSpeed * 0.4;
    }

    const turnSpeed = vehicle.speed / vehicle.turnRadius;

    const angleDiff = vehicle.turnEndAngle - vehicle.turnStartAngle;
    const totalAngle = Math.abs(angleDiff);
    if (totalAngle < 0.001) {
      this.finishTurn(vehicle);
      return;
    }
    const progressDelta = (turnSpeed * deltaTime) / totalAngle;

    if (angleDiff < 0) {
      vehicle.turnProgress -= progressDelta;
    } else {
      vehicle.turnProgress += progressDelta;
    }

    const absProgress = Math.abs(vehicle.turnProgress);

    if (absProgress >= 1) {
      this.finishTurn(vehicle);
      return;
    }

    const currentAngle = vehicle.turnStartAngle + angleDiff * absProgress;

    if (vehicle.turnCenter) {
      vehicle.position = {
        x: vehicle.turnCenter.x + Math.cos(currentAngle) * vehicle.turnRadius,
        y: 0.5,
        z: vehicle.turnCenter.z + Math.sin(currentAngle) * vehicle.turnRadius,
      };
    }
  }

  private finishTurn(vehicle: Vehicle): void {
    vehicle.turning = false;
    vehicle.turnProgress = 0;

    const dirMap: Record<string, Record<string, VehicleDirection>> = {
      left: {
        east: 'south',
        west: 'north',
        north: 'east',
        south: 'west',
      },
      right: {
        east: 'north',
        west: 'south',
        north: 'west',
        south: 'east',
      },
    };

    vehicle.direction = dirMap[vehicle.turnType][vehicle.direction];

    const segments = this.roadNetwork.getSegments();
    const pos = vehicle.position;

    let nearestSegment: any = null;
    let nearestDist = Infinity;
    let nearestProgress = 0;

    for (const seg of segments) {
      const dx = seg.end.x - seg.start.x;
      const dz = seg.end.z - seg.start.z;
      const len = Math.sqrt(dx * dx + dz * dz);

      const t = Math.max(
        0,
        Math.min(
          1,
          ((pos.x - seg.start.x) * dx + (pos.z - seg.start.z) * dz) / (len * len)
        )
      );

      const closestX = seg.start.x + t * dx;
      const closestZ = seg.start.z + t * dz;
      const dist = Math.sqrt((pos.x - closestX) ** 2 + (pos.z - closestZ) ** 2);

      if (dist < nearestDist && dist < 8) {
        nearestDist = dist;
        nearestSegment = seg;
        nearestProgress = t;
      }
    }

    if (nearestSegment) {
      vehicle.segmentIndex = segments.indexOf(nearestSegment);
      vehicle.pathProgress = nearestProgress;
      vehicle.pathId = nearestSegment.id;
    } else {
      this.respawnVehicle(vehicle);
    }

    const turnTypes: TurnType[] = ['straight', 'straight', 'straight', 'left', 'right'];
    vehicle.turnType = turnTypes[Math.floor(Math.random() * turnTypes.length)];
    vehicle.speed = vehicle.maxSpeed * 0.6;
  }

  private respawnVehicle(vehicle: Vehicle): void {
    const segments = this.roadNetwork.getSegments();
    const validSegments = segments.filter((s) => s.length > 10);
    if (validSegments.length === 0) return;

    const segment = validSegments[Math.floor(Math.random() * validSegments.length)];
    const progress = Math.random();

    const pos = this.getPositionOnSegment(segment, progress);
    vehicle.position = pos;
    vehicle.pathProgress = progress;
    vehicle.segmentIndex = segments.indexOf(segment);
    vehicle.pathId = segment.id;
    vehicle.speed = vehicle.maxSpeed * (0.5 + Math.random() * 0.5);
    vehicle.isStopped = false;
    vehicle.stopTimer = 0;
    vehicle.turning = false;
    vehicle.turnProgress = 0;

    if (segment.direction === 'eastWest') {
      vehicle.direction = Math.random() > 0.5 ? 'east' : 'west';
    } else {
      vehicle.direction = Math.random() > 0.5 ? 'north' : 'south';
    }

    const turnTypes: TurnType[] = ['straight', 'straight', 'straight', 'left', 'right'];
    vehicle.turnType = turnTypes[Math.floor(Math.random() * turnTypes.length)];
  }

  private checkAndInitiateTurn(vehicle: Vehicle, segment: any): void {
  }

  private updateDynamicSpatialGridSize(): void {
    const vehicleCount = this.activeVehicleCount;

    if (vehicleCount < 200) {
      this.spatialGrid.cellSize = 30;
    } else if (vehicleCount < 500) {
      this.spatialGrid.cellSize = 20;
    } else if (vehicleCount < 800) {
      this.spatialGrid.cellSize = 15;
    } else {
      this.spatialGrid.cellSize = 10;
    }

    if (this.performanceMode === 'low') {
      this.spatialGrid.cellSize = Math.max(this.spatialGrid.cellSize, 40);
    } else if (this.performanceMode === 'medium') {
      this.spatialGrid.cellSize = Math.max(this.spatialGrid.cellSize, 25);
    }
  }

  private updateSpatialGrid(): void {
    this.spatialGrid.cells.clear();
    this.spatialGrid.vehicleIndices.clear();

    for (let i = 0; i < this.activeVehicleCount; i++) {
      const vehicle = this.vehiclePool[i];
      const cellKey = this.getGridCellKey(vehicle.position);

      if (!this.spatialGrid.cells.has(cellKey)) {
        this.spatialGrid.cells.set(cellKey, { vehicles: [] });
      }

      this.spatialGrid.cells.get(cellKey)!.vehicles.push(i);
      this.spatialGrid.vehicleIndices.set(i, cellKey);
    }
  }

  private getGridCellKey(position: Vector3): string {
    const cellX = Math.floor(position.x / this.spatialGrid.cellSize);
    const cellZ = Math.floor(position.z / this.spatialGrid.cellSize);
    return `${cellX},${cellZ}`;
  }

  private updateInstancedMesh(): void {
    if (!this.instancedMesh) return;

    const colors = this.instancedMesh.instanceColor as THREE.InstancedBufferAttribute;
    const colorArray = colors.array as Float32Array;

    for (let i = 0; i < this.activeVehicleCount; i++) {
      const vehicle = this.vehiclePool[i];

      this.dummy.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);

      let rotation = 0;
      switch (vehicle.direction) {
        case 'east':
          rotation = -Math.PI / 2;
          break;
        case 'west':
          rotation = Math.PI / 2;
          break;
        case 'north':
          rotation = 0;
          break;
        case 'south':
          rotation = Math.PI;
          break;
      }

      if (vehicle.turning && vehicle.turnCenter) {
        const dx = vehicle.position.x - vehicle.turnCenter.x;
        const dz = vehicle.position.z - vehicle.turnCenter.z;
        const turnAngle = Math.atan2(dz, dx);

        if (vehicle.turnType === 'left') {
          rotation = -turnAngle - Math.PI / 2;
        } else {
          rotation = -turnAngle + Math.PI / 2;
        }
      }

      this.dummy.rotation.y = rotation;

      const scale = vehicle.type === 'car' ? 1 : vehicle.type === 'truck' ? 1.4 : 1.6;
      this.dummy.scale.set(scale, scale, scale);

      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      const color = new THREE.Color(vehicle.color);
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }

    this.instancedMesh.count = this.activeVehicleCount;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    colors.needsUpdate = true;
  }

  private updateDensityData(): void {
    const segments = this.roadNetwork.getSegments();

    this.densityData = segments.map((segment) => {
      const vehiclesOnSegment = this.getVehiclesOnSegment(segment.id);
      const maxVehiclesPerSegment = Math.floor(segment.length / 5) * 2;
      const density = maxVehiclesPerSegment > 0 ? vehiclesOnSegment / maxVehiclesPerSegment : 0;

      return {
        segmentId: segment.id,
        density: Math.min(1, density),
        vehicleCount: vehiclesOnSegment,
      };
    });

    this.notifyDensityUpdate();
  }

  private getVehiclesOnSegment(segmentId: string): number {
    let count = 0;
    for (let i = 0; i < this.activeVehicleCount; i++) {
      if (this.vehiclePool[i].pathId === segmentId) {
        count++;
      }
    }
    return count;
  }

  private notifyVehicleCountChange(): void {
    this.onVehicleCountChangeCallbacks.forEach((cb) => cb(this.activeVehicleCount));
  }

  private notifyDensityUpdate(): void {
    this.onDensityUpdateCallbacks.forEach((cb) => cb(this.densityData));
  }

  private adjustPerformanceMode(): void {
    const fps = this.currentFps;

    if (fps < 30) {
      this.consecutiveLowFpsFrames++;
    } else {
      this.consecutiveLowFpsFrames = Math.max(0, this.consecutiveLowFpsFrames - 1);
    }

    if (this.consecutiveLowFpsFrames >= 3 && this.performanceMode === 'high') {
      this.performanceMode = 'medium';
      this.degradationApplied = true;
      this.config.baseVehicleCount = Math.floor(this.originalBaseVehicleCount * 0.7);
      this.config.vehicleSpawnInterval = 0.5;
      this.densityUpdateTimer = 0;
      console.warn('[TrafficSim] Performance degraded to MEDIUM: reducing vehicle count and spawn rate');
    } else if (this.consecutiveLowFpsFrames >= 3 && this.performanceMode === 'medium') {
      this.performanceMode = 'low';
      this.degradationApplied = true;
      this.config.baseVehicleCount = Math.floor(this.originalBaseVehicleCount * 0.4);
      this.config.vehicleSpawnInterval = 0.8;
      this.densityUpdateTimer = 0;
      console.warn('[TrafficSim] Performance degraded to LOW: significantly reducing vehicles');
    } else if (fps > 50 && this.performanceMode === 'low') {
      this.performanceMode = 'medium';
      this.degradationApplied = true;
      this.config.baseVehicleCount = Math.floor(this.originalBaseVehicleCount * 0.7);
      this.config.vehicleSpawnInterval = 0.5;
      this.consecutiveLowFpsFrames = 0;
      console.info('[TrafficSim] Performance recovered to MEDIUM');
    } else if (fps > 55 && this.performanceMode === 'medium') {
      this.performanceMode = 'high';
      this.degradationApplied = false;
      this.config.baseVehicleCount = this.originalBaseVehicleCount;
      this.config.vehicleSpawnInterval = 0.3;
      this.consecutiveLowFpsFrames = 0;
      console.info('[TrafficSim] Performance recovered to HIGH');
    }

    this.updateTargetVehicleCount();
  }

  setTimeOfDay(hour: number): void {
    this.currentTime = hour;
    this.updateTargetVehicleCount();
  }

  getDensityData(): DensityData[] {
    return this.densityData;
  }

  getVehicleCount(): number {
    return this.activeVehicleCount;
  }

  getAverageSpeed(): number {
    if (this.activeVehicleCount === 0) return 0;

    let totalSpeed = 0;
    for (let i = 0; i < this.activeVehicleCount; i++) {
      totalSpeed += this.vehiclePool[i].speed;
    }

    return (totalSpeed / this.activeVehicleCount) * 3.6;
  }

  getCongestedSegmentCount(threshold: number = 0.8): number {
    return this.densityData.filter((d) => d.density >= threshold).length;
  }

  getStats(): SimulationStats {
    return {
      totalVehicles: this.activeVehicleCount,
      averageSpeed: this.getAverageSpeed(),
      congestedSegments: this.getCongestedSegmentCount(),
      fps: this.currentFps,
    };
  }

  setLeftTurnWaitTime(seconds: number): void {
    this.config.leftTurnWaitTime = Math.max(0, seconds);
  }

  getLeftTurnWaitTime(): number {
    return this.config.leftTurnWaitTime;
  }

  setConfig(config: Partial<TrafficConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateTargetVehicleCount();
  }

  getConfig(): TrafficConfig {
    return { ...this.config };
  }

  onVehicleCountChange(callback: (count: number) => void): void {
    this.onVehicleCountChangeCallbacks.push(callback);
  }

  onDensityUpdate(callback: (data: DensityData[]) => void): void {
    this.onDensityUpdateCallbacks.push(callback);
  }

  getVehicles(): Vehicle[] {
    return this.vehiclePool.slice(0, this.activeVehicleCount);
  }

  getPerformanceMode(): string {
    return this.performanceMode;
  }

  setMaxVehicleCount(count: number): void {
    this.config.maxVehicleCount = count;
  }
}
