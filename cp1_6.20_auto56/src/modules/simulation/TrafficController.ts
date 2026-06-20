export type SignalState = 'red' | 'yellow' | 'green';

export interface RoadSignal {
  roadId: string;
  state: SignalState;
  remainingTime: number;
}

export interface CarState {
  id: number;
  roadId: string;
  x: number;
  z: number;
  rotation: number;
  speed: number;
  progress: number;
  lane: number;
}

export interface RoadInfo {
  id: string;
  name: string;
  isHorizontal: boolean;
  index: number;
  startPos: number;
}

export interface IntersectionInfo {
  id: string;
  x: number;
  z: number;
  horizontalRoad: string;
  verticalRoad: string;
}

const GRID_SIZE = 16;
const BLOCK_SIZE = 6;
const ROAD_WIDTH = 4;
const TOTAL_SIZE = GRID_SIZE * BLOCK_SIZE + (GRID_SIZE + 1) * ROAD_WIDTH;
const HALF_TOTAL = TOTAL_SIZE / 2;
const STEP = BLOCK_SIZE + ROAD_WIDTH;
const FIRST_POS = -HALF_TOTAL + ROAD_WIDTH / 2;
const ROAD_LENGTH = TOTAL_SIZE;
const CAR_BASE_SPEED = 0.5;
const CAR_SLOW_SPEED = 0.2;
const CONGESTION_DISTANCE = 0.3;
const CONGESTION_THRESHOLD = 5;

export class TrafficController {
  private eventTarget: EventTarget;
  private roads: RoadInfo[] = [];
  private intersections: Map<string, IntersectionInfo> = new Map();
  private signalStates: Map<string, {
    phase: 'green' | 'yellow' | 'red';
    phaseTimer: number;
    greenDuration: number;
    yellowDuration: number;
    redDuration: number;
  }> = new Map();

  private cars: CarState[] = [];
  private carIdCounter = 0;
  private spawnTimer: Map<string, number> = new Map();
  private congestionCounts: Map<string, number> = new Map();

  constructor() {
    this.eventTarget = new EventTarget();
    this.initRoads();
    this.initIntersections();
    this.initSignals();
    this.initCars();
  }

  private initRoads(): void {
    for (let i = 0; i <= GRID_SIZE; i++) {
      const id = `H-${i}`;
      this.roads.push({
        id,
        name: `横向主街 ${i + 1}`,
        isHorizontal: true,
        index: i,
        startPos: FIRST_POS + i * STEP
      });
      this.spawnTimer.set(id, Math.random() * 2);
      this.congestionCounts.set(id, 0);
    }

    for (let i = 0; i <= GRID_SIZE; i++) {
      const id = `V-${i}`;
      this.roads.push({
        id,
        name: `纵向主街 ${i + 1}`,
        isHorizontal: false,
        index: i,
        startPos: FIRST_POS + i * STEP
      });
      this.spawnTimer.set(id, Math.random() * 2);
      this.congestionCounts.set(id, 0);
    }
  }

  private initIntersections(): void {
    for (let h = 0; h <= GRID_SIZE; h++) {
      for (let v = 0; v <= GRID_SIZE; v++) {
        const id = `INT-${h}-${v}`;
        const hPos = FIRST_POS + h * STEP;
        const vPos = FIRST_POS + v * STEP;
        this.intersections.set(id, {
          id,
          x: vPos,
          z: hPos,
          horizontalRoad: `H-${h}`,
          verticalRoad: `V-${v}`
        });
      }
    }
  }

  private initSignals(): void {
    const controlledRoads = [0, 4, 8, 12, 16];
    controlledRoads.forEach(i => {
      if (i <= GRID_SIZE) {
        this.initRoadSignal(`H-${i}`);
      }
      if (i <= GRID_SIZE) {
        this.initRoadSignal(`V-${i}`);
      }
    });

    this.roads.forEach(road => {
      if (!this.signalStates.has(road.id)) {
        this.initRoadSignal(road.id);
      }
    });
  }

  private initRoadSignal(roadId: string): void {
    const road = this.roads.find(r => r.id === roadId);
    if (!road) return;

    const offset = road.isHorizontal ? 0 : 20;
    const greenDuration = 30;
    const yellowDuration = 3;
    const redDuration = 30 + yellowDuration;

    this.signalStates.set(roadId, {
      phase: greenDuration > offset ? 'green' : 'red',
      phaseTimer: Math.max(0, greenDuration - offset),
      greenDuration,
      yellowDuration,
      redDuration
    });
  }

  private initCars(): void {
    for (let i = 0; i < 50; i++) {
      this.spawnRandomCar();
    }
  }

  private spawnRandomCar(): void {
    const road = this.roads[Math.floor(Math.random() * this.roads.length)];
    this.spawnCar(road.id);
  }

  private spawnCar(roadId: string): void {
    if (this.cars.length >= 180) return;

    const road = this.roads.find(r => r.id === roadId);
    if (!road) return;

    const lane = (Math.random() > 0.5 ? 1 : -1) * 0.8;
    const direction = Math.random() > 0.5 ? 1 : -1;

    let x: number, z: number, rotation: number;
    const startOffset = -HALF_TOTAL + Math.random() * ROAD_LENGTH * 0.3;

    if (road.isHorizontal) {
      x = -HALF_TOTAL + (direction > 0 ? startOffset : HALF_TOTAL - startOffset);
      z = road.startPos + lane;
      rotation = direction > 0 ? 0 : Math.PI;
    } else {
      x = road.startPos + lane;
      z = -HALF_TOTAL + (direction > 0 ? startOffset : HALF_TOTAL - startOffset);
      rotation = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    const progress = direction > 0
      ? ((road.isHorizontal ? x : z) + HALF_TOTAL) / ROAD_LENGTH
      : 1 - ((road.isHorizontal ? x : z) + HALF_TOTAL) / ROAD_LENGTH;

    this.cars.push({
      id: this.carIdCounter++,
      roadId: road.id,
      x,
      z,
      rotation,
      speed: CAR_BASE_SPEED,
      progress,
      lane
    });
  }

  getRoads(): RoadInfo[] {
    return this.roads.filter(r =>
      r.id === 'H-0' || r.id === 'H-4' || r.id === 'H-8' || r.id === 'H-12' || r.id === 'H-16' ||
      r.id === 'V-0' || r.id === 'V-4' || r.id === 'V-8' || r.id === 'V-12' || r.id === 'V-16'
    );
  }

  getIntersections(): Map<string, { x: number; z: number }> {
    const result = new Map<string, { x: number; z: number }>();
    const controlledRoads = new Set(['H-0', 'H-4', 'H-8', 'H-12', 'H-16', 'V-0', 'V-4', 'V-8', 'V-12', 'V-16']);
    this.intersections.forEach((info) => {
      if (controlledRoads.has(info.horizontalRoad) && controlledRoads.has(info.verticalRoad)) {
        result.set(info.id, { x: info.x, z: info.z });
      }
    });
    return result;
  }

  getRoadPosition(roadId: string): { x: number; z: number; isHorizontal: boolean } {
    const road = this.roads.find(r => r.id === roadId);
    if (!road) return { x: 0, z: 0, isHorizontal: true };
    if (road.isHorizontal) {
      return { x: 0, z: road.startPos, isHorizontal: true };
    } else {
      return { x: road.startPos, z: 0, isHorizontal: false };
    }
  }

  setGreenDuration(roadId: string, seconds: number): void {
    const signal = this.signalStates.get(roadId);
    if (!signal) return;

    seconds = Math.max(10, Math.min(60, seconds));
    const ratio = signal.greenDuration / (signal.greenDuration + signal.yellowDuration + signal.redDuration);
    const totalOther = signal.yellowDuration + signal.redDuration;
    signal.greenDuration = seconds;
    signal.redDuration = Math.max(10, Math.round((seconds / ratio) - seconds - signal.yellowDuration));

    this.dispatchSignalEvent();
  }

  getCarStates(): CarState[] {
    return this.cars;
  }

  update(dt: number, elapsed: number): void {
    this.updateSignals(dt);
    this.updateCongestion();
    this.dispatchCongestionEvent();
    this.autoSpawnCars(dt);
  }

  updateCars(dt: number): void {
    const carsByRoad = new Map<string, CarState[]>();
    this.cars.forEach(car => {
      if (!carsByRoad.has(car.roadId)) carsByRoad.set(car.roadId, []);
      carsByRoad.get(car.roadId)!.push(car);
    });

    carsByRoad.forEach((roadCars, roadId) => {
      const road = this.roads.find(r => r.id === roadId);
      if (!road) return;

      const signal = this.signalStates.get(roadId);
      const isGreen = signal ? signal.phase === 'green' : true;
      const direction = roadCars.length > 0 ? this.getDirection(roadCars[0]) : 1;

      roadCars.sort((a, b) => {
        const aProgress = this.getAbsoluteProgress(a, direction, road);
        const bProgress = this.getAbsoluteProgress(b, direction, road);
        return direction > 0 ? bProgress - aProgress : aProgress - bProgress;
      });

      roadCars.forEach((car, idx) => {
        let targetSpeed = isGreen ? CAR_BASE_SPEED : CAR_BASE_SPEED * 0.3;

        if (idx > 0) {
          const ahead = roadCars[idx - 1];
          const dist = this.getDistance(car, ahead, road);
          if (dist < CONGESTION_DISTANCE + 1.2) {
            targetSpeed = dist < CONGESTION_DISTANCE ? CAR_SLOW_SPEED : CAR_BASE_SPEED * 0.5;
          }
        }

        if (!isGreen) {
          const stopDist = this.getDistanceToNextIntersection(car, road, direction);
          if (stopDist !== null && stopDist < 4) {
            targetSpeed = stopDist < 0.5 ? 0 : targetSpeed * (stopDist / 4);
          }
        }

        car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 3);

        const moveDist = car.speed * dt * 60 * dt;
        if (road.isHorizontal) {
          car.x += Math.cos(car.rotation) * car.speed * dt * 10;
          car.x = Math.max(-HALF_TOTAL, Math.min(HALF_TOTAL, car.x));
        } else {
          car.z += Math.sin(car.rotation) * car.speed * dt * 10;
          car.z = Math.max(-HALF_TOTAL, Math.min(HALF_TOTAL, car.z));
        }

        const edgeDist = road.isHorizontal ? HALF_TOTAL - Math.abs(car.x) : HALF_TOTAL - Math.abs(car.z);
        if (edgeDist < 1) {
          this.recirculateCar(car, road);
        }
      });
    });
  }

  private getDirection(car: CarState): number {
    const cos = Math.cos(car.rotation);
    const sin = Math.sin(car.rotation);
    return Math.abs(cos) > Math.abs(sin) ? (cos >= 0 ? 1 : -1) : (sin >= 0 ? 1 : -1);
  }

  private getAbsoluteProgress(car: CarState, direction: number, road: RoadInfo): number {
    const pos = road.isHorizontal ? car.x : car.z;
    const norm = (pos + HALF_TOTAL) / ROAD_LENGTH;
    return direction > 0 ? norm : 1 - norm;
  }

  private getDistance(a: CarState, b: CarState, road: RoadInfo): number {
    return road.isHorizontal ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
  }

  private getDistanceToNextIntersection(car: CarState, road: RoadInfo, direction: number): number | null {
    let minDist = Infinity;
    this.intersections.forEach(inter => {
      let interPos: number;
      if (road.isHorizontal) {
        if (Math.abs(inter.z - road.startPos) > ROAD_WIDTH) return;
        interPos = inter.x;
      } else {
        if (Math.abs(inter.x - road.startPos) > ROAD_WIDTH) return;
        interPos = inter.z;
      }
      const carPos = road.isHorizontal ? car.x : car.z;
      const d = direction > 0 ? interPos - carPos : carPos - interPos;
      if (d > 0 && d < minDist) minDist = d;
    });
    return minDist === Infinity ? null : minDist;
  }

  private recirculateCar(car: CarState, road: RoadInfo): void {
    const direction = this.getDirection(car);
    if (direction > 0) {
      if (road.isHorizontal) car.x = -HALF_TOTAL + 0.5;
      else car.z = -HALF_TOTAL + 0.5;
    } else {
      if (road.isHorizontal) car.x = HALF_TOTAL - 0.5;
      else car.z = HALF_TOTAL - 0.5;
    }
  }

  private updateSignals(dt: number): void {
    let changed = false;

    this.signalStates.forEach((signal, roadId) => {
      signal.phaseTimer -= dt;

      if (signal.phaseTimer <= 0) {
        changed = true;
        if (signal.phase === 'green') {
          signal.phase = 'yellow';
          signal.phaseTimer = signal.yellowDuration;
        } else if (signal.phase === 'yellow') {
          signal.phase = 'red';
          signal.phaseTimer = signal.redDuration;
        } else {
          signal.phase = 'green';
          signal.phaseTimer = signal.greenDuration;
        }
      }
    });

    if (changed) {
      this.dispatchSignalEvent();
    }
  }

  private updateCongestion(): void {
    const carsByRoad = new Map<string, CarState[]>();
    this.cars.forEach(car => {
      if (!carsByRoad.has(car.roadId)) carsByRoad.set(car.roadId, []);
      carsByRoad.get(car.roadId)!.push(car);
    });

    carsByRoad.forEach((roadCars, roadId) => {
      const road = this.roads.find(r => r.id === roadId);
      if (!road) return;

      let slowCount = 0;
      for (let i = 0; i < roadCars.length; i++) {
        if (roadCars[i].speed <= CAR_SLOW_SPEED * 1.1) {
          slowCount++;
        }
      }

      let congestionCluster = 0;
      let maxCluster = 0;
      roadCars.forEach(car => {
        if (car.speed <= CAR_SLOW_SPEED * 1.1) {
          congestionCluster++;
          maxCluster = Math.max(maxCluster, congestionCluster);
        } else {
          maxCluster = Math.max(maxCluster, congestionCluster);
          congestionCluster = 0;
        }
      });

      this.congestionCounts.set(roadId, Math.max(slowCount > 10 ? slowCount / 2 : 0, maxCluster));
    });
  }

  private autoSpawnCars(dt: number): void {
    this.roads.forEach(road => {
      let t = this.spawnTimer.get(road.id) || 0;
      t -= dt;
      if (t <= 0) {
        const carsOnRoad = this.cars.filter(c => c.roadId === road.id).length;
        if (carsOnRoad < 25) {
          this.spawnCar(road.id);
        }
        t = 1 + Math.random() * 2;
      }
      this.spawnTimer.set(road.id, t);
    });
  }

  private dispatchSignalEvent(): void {
    const signals: RoadSignal[] = [];
    this.signalStates.forEach((signal, roadId) => {
      signals.push({
        roadId,
        state: signal.phase,
        remainingTime: Math.max(0, signal.phaseTimer)
      });
    });
    this.eventTarget.dispatchEvent(new CustomEvent('signalChanged', { detail: signals }));
  }

  private dispatchCongestionEvent(): void {
    const data: { roadId: string; congestion: number }[] = [];
    this.congestionCounts.forEach((count, roadId) => {
      data.push({ roadId, congestion: count });
    });
    this.eventTarget.dispatchEvent(new CustomEvent('congestionChanged', { detail: data }));
  }

  on(type: string, callback: EventListenerOrEventListenerObject): void {
    this.eventTarget.addEventListener(type, callback);
  }

  off(type: string, callback: EventListenerOrEventListenerObject): void {
    this.eventTarget.removeEventListener(type, callback);
  }
}
