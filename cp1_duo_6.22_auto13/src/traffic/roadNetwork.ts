import * as THREE from 'three';
import type {
  IntersectionConfig,
  IntersectionState,
  RoadSegment,
  Vector3,
  TrafficLightPhase,
  LightColor,
} from '../types';

export class RoadNetwork {
  private intersections: Map<string, IntersectionState> = new Map();
  private segments: RoadSegment[] = [];
  private intersectionGroup: THREE.Group = new THREE.Group();
  private roadGroup: THREE.Group = new THREE.Group();
  private trafficLightMeshes: Map<string, {
    eastWest: THREE.Mesh;
    northSouth: THREE.Mesh;
    leftTurn: THREE.Mesh;
    glowEastWest: THREE.Mesh;
    glowNorthSouth: THREE.Mesh;
    glowLeftTurn: THREE.Mesh;
  }> = new Map();

  private onPhaseChangeCallbacks: Array<(intersectionId: string, phase: TrafficLightPhase) => void> = [];

  constructor() {
    this.initDefaultNetwork();
  }

  private initDefaultNetwork(): void {
    const intersectionConfigs: IntersectionConfig[] = [
      {
        id: 'int_0_0',
        position: { x: 0, y: 0, z: 0 },
        eastWestGreenDuration: 8,
        northSouthGreenDuration: 6,
        leftTurnGreenDuration: 4,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_1_0',
        position: { x: 80, y: 0, z: 0 },
        eastWestGreenDuration: 8,
        northSouthGreenDuration: 6,
        leftTurnGreenDuration: 4,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_0_1',
        position: { x: 0, y: 0, z: 80 },
        eastWestGreenDuration: 8,
        northSouthGreenDuration: 6,
        leftTurnGreenDuration: 4,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_1_1',
        position: { x: 80, y: 0, z: 80 },
        eastWestGreenDuration: 8,
        northSouthGreenDuration: 6,
        leftTurnGreenDuration: 4,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_2_0',
        position: { x: 160, y: 0, z: 0 },
        eastWestGreenDuration: 10,
        northSouthGreenDuration: 5,
        leftTurnGreenDuration: 3,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_2_1',
        position: { x: 160, y: 0, z: 80 },
        eastWestGreenDuration: 10,
        northSouthGreenDuration: 5,
        leftTurnGreenDuration: 3,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_0_2',
        position: { x: 0, y: 0, z: 160 },
        eastWestGreenDuration: 7,
        northSouthGreenDuration: 7,
        leftTurnGreenDuration: 5,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_1_2',
        position: { x: 80, y: 0, z: 160 },
        eastWestGreenDuration: 7,
        northSouthGreenDuration: 7,
        leftTurnGreenDuration: 5,
        yellowDuration: 2,
        allRedDuration: 1,
      },
      {
        id: 'int_2_2',
        position: { x: 160, y: 0, z: 160 },
        eastWestGreenDuration: 9,
        northSouthGreenDuration: 6,
        leftTurnGreenDuration: 4,
        yellowDuration: 2,
        allRedDuration: 1,
      },
    ];

    intersectionConfigs.forEach((config) => {
      const state: IntersectionState = {
        id: config.id,
        position: config.position,
        currentPhase: 'eastWestStraight',
        phaseTimer: 0,
        eastWestColor: 'green',
        northSouthColor: 'red',
        leftTurnColor: 'red',
        config: { ...config },
      };
      this.intersections.set(config.id, state);
    });

    this.createRoadSegments();
    this.createRoadMeshes();
    this.createTrafficLightMeshes();
  }

  private createRoadSegments(): void {
    const intPositions = new Map<string, Vector3>();
    this.intersections.forEach((intState) => {
      intPositions.set(intState.id, intState.position);
    });

    const addSegment = (id: string, startId: string, endId: string, direction: 'eastWest' | 'northSouth') => {
      const start = intPositions.get(startId);
      const end = intPositions.get(endId);
      if (!start || !end) return;

      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.z - start.z, 2)
      );

      this.segments.push({
        id,
        start: { ...start },
        end: { ...end },
        length,
        lanes: 2,
        direction,
      });
    };

    addSegment('road_ew_0_0', 'int_0_0', 'int_1_0', 'eastWest');
    addSegment('road_ew_1_0', 'int_1_0', 'int_2_0', 'eastWest');
    addSegment('road_ew_0_1', 'int_0_1', 'int_1_1', 'eastWest');
    addSegment('road_ew_1_1', 'int_1_1', 'int_2_1', 'eastWest');
    addSegment('road_ew_0_2', 'int_0_2', 'int_1_2', 'eastWest');
    addSegment('road_ew_1_2', 'int_1_2', 'int_2_2', 'eastWest');

    addSegment('road_ns_0_0', 'int_0_0', 'int_0_1', 'northSouth');
    addSegment('road_ns_0_1', 'int_0_1', 'int_0_2', 'northSouth');
    addSegment('road_ns_1_0', 'int_1_0', 'int_1_1', 'northSouth');
    addSegment('road_ns_1_1', 'int_1_1', 'int_1_2', 'northSouth');
    addSegment('road_ns_2_0', 'int_2_0', 'int_2_1', 'northSouth');
    addSegment('road_ns_2_1', 'int_2_1', 'int_2_2', 'northSouth');
  }

  private createRoadMeshes(): void {
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333340 });
    const roadWidth = 8;

    this.segments.forEach((segment) => {
      const dx = segment.end.x - segment.start.x;
      const dz = segment.end.z - segment.start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const geometry = new THREE.PlaneGeometry(length, roadWidth);
      const road = new THREE.Mesh(geometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(
        (segment.start.x + segment.end.x) / 2,
        0.01,
        (segment.start.z + segment.end.z) / 2
      );
      road.rotation.y = -angle;
      road.receiveShadow = true;
      this.roadGroup.add(road);

      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const lineGeometry = new THREE.PlaneGeometry(length, 0.15);
      const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.set(
        (segment.start.x + segment.end.x) / 2,
        0.02,
        (segment.start.z + segment.end.z) / 2
      );
      centerLine.rotation.y = -angle;
      this.roadGroup.add(centerLine);
    });

    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.roadGroup.add(ground);

    this.buildings.forEach((building) => {
      const buildingGeo = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const buildingMat = new THREE.MeshLambertMaterial({ color: building.color });
      const buildingMesh = new THREE.Mesh(buildingGeo, buildingMat);
      buildingMesh.position.set(building.x, building.height / 2, building.z);
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      this.roadGroup.add(buildingMesh);
    });
  }

  private buildings = [
    { x: -30, z: -30, width: 20, height: 40, depth: 20, color: 0x4a5568 },
    { x: -30, z: 30, width: 25, height: 30, depth: 25, color: 0x2d3748 },
    { x: 40, z: -35, width: 30, height: 50, depth: 20, color: 0x374151 },
    { x: 120, z: -25, width: 22, height: 35, depth: 22, color: 0x4b5563 },
    { x: 200, z: -30, width: 28, height: 45, depth: 18, color: 0x374151 },
    { x: -35, z: 120, width: 24, height: 28, depth: 24, color: 0x4a5568 },
    { x: 40, z: 120, width: 18, height: 55, depth: 18, color: 0x2d3748 },
    { x: 120, z: 130, width: 26, height: 38, depth: 26, color: 0x374151 },
    { x: 200, z: 120, width: 20, height: 42, depth: 20, color: 0x4b5563 },
    { x: 40, z: 40, width: 15, height: 25, depth: 15, color: 0x6b7280 },
    { x: 120, z: 40, width: 20, height: 32, depth: 20, color: 0x4a5568 },
    { x: 200, z: 40, width: 22, height: 48, depth: 18, color: 0x374151 },
  ];

  private createTrafficLightMeshes(): void {
    this.intersections.forEach((intersection) => {
      const { x, z } = intersection.position;
      const offset = 6;

      const createLight = (px: number, pz: number) => {
        const group = new THREE.Group();

        const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 5, 8);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.5;
        group.add(pole);

        const housingGeo = new THREE.BoxGeometry(1.2, 2.5, 0.6);
        const housingMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
        const housing = new THREE.Mesh(housingGeo, housingMat);
        housing.position.y = 5;
        group.add(housing);

        return group;
      };

      const ewLight = createLight(x + offset, z + offset);
      ewLight.rotation.y = Math.PI / 2;
      this.intersectionGroup.add(ewLight);

      const nsLight = createLight(x - offset, z - offset);
      nsLight.rotation.y = 0;
      this.intersectionGroup.add(nsLight);

      const ltLight = createLight(x + offset, z - offset);
      ltLight.rotation.y = -Math.PI / 2;
      this.intersectionGroup.add(ltLight);

      const createGlowLight = (color: number, y: number) => {
        const geo = new THREE.SphereGeometry(0.25, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = y;
        return mesh;
      };

      const ewRed = createGlowLight(0xff0000, 5.8);
      const ewYellow = createGlowLight(0xffff00, 5);
      const ewGreen = createGlowLight(0x00ff00, 4.2);
      ewLight.add(ewRed, ewYellow, ewGreen);

      const nsRed = createGlowLight(0xff0000, 5.8);
      const nsYellow = createGlowLight(0xffff00, 5);
      const nsGreen = createGlowLight(0x00ff00, 4.2);
      nsLight.add(nsRed, nsYellow, nsGreen);

      const ltRed = createGlowLight(0xff0000, 5.8);
      const ltYellow = createGlowLight(0xffff00, 5);
      const ltGreen = createGlowLight(0x00ff00, 4.2);
      ltLight.add(ltRed, ltYellow, ltGreen);

      const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(x, 0.05, z);
      marker.name = `intersection_marker_${intersection.id}`;
      marker.userData.intersectionId = intersection.id;
      this.intersectionGroup.add(marker);

      this.trafficLightMeshes.set(intersection.id, {
        eastWest: ewLight as unknown as THREE.Mesh,
        northSouth: nsLight as unknown as THREE.Mesh,
        leftTurn: ltLight as unknown as THREE.Mesh,
        glowEastWest: ewLight as unknown as THREE.Mesh,
        glowNorthSouth: nsLight as unknown as THREE.Mesh,
        glowLeftTurn: ltLight as unknown as THREE.Mesh,
      });
    });

    this.updateAllLightVisuals();
  }

  private updateAllLightVisuals(): void {
    this.intersections.forEach((intersection) => {
      this.updateLightVisuals(intersection.id);
    });
  }

  private updateLightVisuals(intersectionId: string): void {
    const intersection = this.intersections.get(intersectionId);
    const meshes = this.trafficLightMeshes.get(intersectionId);
    if (!intersection || !meshes) return;

    const setLightColor = (lightGroup: THREE.Object3D, color: LightColor) => {
      const children = lightGroup.children.filter(
        (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry
      );
      children.forEach((child, index) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (index === 0) {
          mat.opacity = color === 'red' ? 1 : 0.15;
        } else if (index === 1) {
          mat.opacity = color === 'yellow' ? 1 : 0.15;
        } else if (index === 2) {
          mat.opacity = color === 'green' ? 1 : 0.15;
        }
      });
    };

    setLightColor(meshes.glowEastWest as unknown as THREE.Object3D, intersection.eastWestColor);
    setLightColor(meshes.glowNorthSouth as unknown as THREE.Object3D, intersection.northSouthColor);
    setLightColor(meshes.glowLeftTurn as unknown as THREE.Object3D, intersection.leftTurnColor);
  }

  update(deltaTime: number): void {
    this.intersections.forEach((intersection) => {
      intersection.phaseTimer += deltaTime;

      const phaseDuration = this.getPhaseDuration(intersection);

      if (intersection.phaseTimer >= phaseDuration) {
        intersection.phaseTimer = 0;
        this.advancePhase(intersection);
      }

      this.updateLightColors(intersection);
    });
  }

  private getPhaseDuration(intersection: IntersectionState): number {
    const { config, currentPhase } = intersection;
    switch (currentPhase) {
      case 'eastWestStraight':
        return config.eastWestGreenDuration;
      case 'northSouthStraight':
        return config.northSouthGreenDuration;
      case 'leftTurn':
        return config.leftTurnGreenDuration;
      case 'allRed':
        return config.allRedDuration;
      default:
        return config.eastWestGreenDuration;
    }
  }

  private advancePhase(intersection: IntersectionState): void {
    const phases: TrafficLightPhase[] = [
      'eastWestStraight',
      'leftTurn',
      'allRed',
      'northSouthStraight',
      'leftTurn',
      'allRed',
    ];

    const currentIndex = phases.indexOf(intersection.currentPhase);
    const nextIndex = (currentIndex + 1) % phases.length;
    intersection.currentPhase = phases[nextIndex];

    this.onPhaseChangeCallbacks.forEach((cb) => cb(intersection.id, intersection.currentPhase));
  }

  private updateLightColors(intersection: IntersectionState): void {
    const { currentPhase, phaseTimer, config } = intersection;
    const phaseDuration = this.getPhaseDuration(intersection);
    const yellowThreshold = phaseDuration - config.yellowDuration;

    const isInYellow = phaseTimer >= yellowThreshold && phaseTimer < phaseDuration;

    switch (currentPhase) {
      case 'eastWestStraight':
        intersection.eastWestColor = isInYellow ? 'yellow' : 'green';
        intersection.northSouthColor = 'red';
        intersection.leftTurnColor = 'red';
        break;
      case 'northSouthStraight':
        intersection.eastWestColor = 'red';
        intersection.northSouthColor = isInYellow ? 'yellow' : 'green';
        intersection.leftTurnColor = 'red';
        break;
      case 'leftTurn':
        intersection.eastWestColor = 'red';
        intersection.northSouthColor = 'red';
        intersection.leftTurnColor = isInYellow ? 'yellow' : 'green';
        break;
      case 'allRed':
        intersection.eastWestColor = 'red';
        intersection.northSouthColor = 'red';
        intersection.leftTurnColor = 'red';
        break;
    }

    this.updateLightVisuals(intersection.id);
  }

  getIntersection(id: string): IntersectionState | undefined {
    return this.intersections.get(id);
  }

  getAllIntersections(): IntersectionState[] {
    return Array.from(this.intersections.values());
  }

  getSegments(): RoadSegment[] {
    return this.segments;
  }

  getRoadGroup(): THREE.Group {
    return this.roadGroup;
  }

  getIntersectionGroup(): THREE.Group {
    return this.intersectionGroup;
  }

  getTrafficLightGroup(): THREE.Group {
    return this.intersectionGroup;
  }

  getLightColor(intersectionId: string, direction: 'eastWest' | 'northSouth' | 'leftTurn'): LightColor {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) return 'red';

    switch (direction) {
      case 'eastWest':
        return intersection.eastWestColor;
      case 'northSouth':
        return intersection.northSouthColor;
      case 'leftTurn':
        return intersection.leftTurnColor;
      default:
        return 'red';
    }
  }

  setIntersectionConfig(intersectionId: string, config: Partial<IntersectionConfig>): void {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) return;

    intersection.config = {
      ...intersection.config,
      ...config,
    };

    intersection.phaseTimer = 0;
    intersection.currentPhase = 'eastWestStraight';
    this.updateLightColors(intersection);
  }

  resetIntersectionPhase(intersectionId: string): void {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) return;

    intersection.phaseTimer = 0;
    intersection.currentPhase = 'eastWestStraight';
    this.updateLightColors(intersection);
  }

  onPhaseChange(callback: (intersectionId: string, phase: TrafficLightPhase) => void): void {
    this.onPhaseChangeCallbacks.push(callback);
  }

  getIntersectionIds(): string[] {
    return Array.from(this.intersections.keys());
  }

  findNearestIntersection(position: Vector3, maxDistance: number = 15): IntersectionState | null {
    let nearest: IntersectionState | null = null;
    let nearestDist = maxDistance;

    this.intersections.forEach((intersection) => {
      const dx = position.x - intersection.position.x;
      const dz = position.z - intersection.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = intersection;
      }
    });

    return nearest;
  }

  getSegmentById(id: string): RoadSegment | undefined {
    return this.segments.find((s) => s.id === id);
  }

  getConnectedSegments(intersectionId: string): RoadSegment[] {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) return [];

    const pos = intersection.position;
    return this.segments.filter(
      (s) =>
        (Math.abs(s.start.x - pos.x) < 1 && Math.abs(s.start.z - pos.z) < 1) ||
        (Math.abs(s.end.x - pos.x) < 1 && Math.abs(s.end.z - pos.z) < 1)
    );
  }
}
