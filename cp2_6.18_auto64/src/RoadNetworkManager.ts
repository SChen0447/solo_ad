import * as THREE from 'three';
import {
  RoadSegment,
  Intersection,
  GRID_SIZE,
  ROAD_WIDTH,
  ROAD_LENGTH,
  INTERSECTION_SIZE,
  HEATMAP_COLORS,
  DENSITY_RANGE,
  LODLevel,
  LOD_PATH_DISTANCE
} from './types';

export class RoadNetworkManager {
  private scene: THREE.Scene;
  private roads: Map<string, RoadSegment> = new Map();
  private intersections: Map<string, Intersection> = new Map();
  private roadGroup: THREE.Group;
  private intersectionGroup: THREE.Group;
  private mergedRoadMesh: THREE.Mesh | null = null;
  private hoveredRoadId: string | null = null;
  private originalColors: Map<string, THREE.Color> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.roadGroup = new THREE.Group();
    this.intersectionGroup = new THREE.Group();
    
    this.scene.add(this.roadGroup);
    this.scene.add(this.intersectionGroup);

    this.buildNetwork();
  }

  private buildNetwork(): void {
    const gridSpacing = ROAD_LENGTH + INTERSECTION_SIZE;
    const totalSize = (GRID_SIZE - 1) * gridSpacing;
    const offset = -totalSize / 2;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = offset + j * gridSpacing;
        const z = offset + i * gridSpacing;

        if (j < GRID_SIZE - 1) {
          const roadId = `h-${i}-${j}`;
          this.createRoadSegment(
            roadId,
            'horizontal',
            { x: x + INTERSECTION_SIZE / 2, y: z },
            { x: x + gridSpacing - INTERSECTION_SIZE / 2, y: z },
            [roadId, `h-${i}-${j + 1}`]
          );
        }

        if (i < GRID_SIZE - 1) {
          const roadId = `v-${i}-${j}`;
          this.createRoadSegment(
            roadId,
            'vertical',
            { x: x, y: z + INTERSECTION_SIZE / 2 },
            { x: x, y: z + gridSpacing - INTERSECTION_SIZE / 2 },
            [roadId, `v-${i + 1}-${j}`]
          );
        }

        const intersectionId = `int-${i}-${j}`;
        const connectedRoads: string[] = [];
        if (j > 0) connectedRoads.push(`h-${i}-${j - 1}`);
        if (j < GRID_SIZE - 1) connectedRoads.push(`h-${i}-${j}`);
        if (i > 0) connectedRoads.push(`v-${i - 1}-${j}`);
        if (i < GRID_SIZE - 1) connectedRoads.push(`v-${i}-${j}`);

        this.createIntersection(intersectionId, { x, y: z }, connectedRoads);
      }
    }
  }

  private createRoadSegment(
    id: string,
    type: 'horizontal' | 'vertical',
    start: { x: number; y: number },
    end: { x: number; y: number },
    _connectedRoads: string[]
  ): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const centerX = (start.x + end.x) / 2;
    const centerZ = (start.y + end.y) / 2;

    const geometry = new THREE.PlaneGeometry(length, ROAD_WIDTH, 10, 1);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(centerX, 0.01, centerZ);

    if (type === 'vertical') {
      geometry.rotateY(Math.PI / 2);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.roadId = id;
    mesh.userData.type = 'road';
    mesh.receiveShadow = true;

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      linewidth: 0.5
    });
    const edgeMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial);

    const pathGeometry = new THREE.BufferGeometry();
    const pathPoints: THREE.Vector3[] = [];
    const laneOffset = ROAD_WIDTH / 4;
    
    if (type === 'horizontal') {
      pathPoints.push(new THREE.Vector3(start.x, 0.02, start.y + laneOffset));
      pathPoints.push(new THREE.Vector3(end.x, 0.02, end.y + laneOffset));
      pathPoints.push(new THREE.Vector3(start.x, 0.02, start.y - laneOffset));
      pathPoints.push(new THREE.Vector3(end.x, 0.02, end.y - laneOffset));
    } else {
      pathPoints.push(new THREE.Vector3(start.x + laneOffset, 0.02, start.y));
      pathPoints.push(new THREE.Vector3(end.x + laneOffset, 0.02, end.y));
      pathPoints.push(new THREE.Vector3(start.x - laneOffset, 0.02, start.y));
      pathPoints.push(new THREE.Vector3(end.x - laneOffset, 0.02, end.y));
    }
    
    pathGeometry.setFromPoints(pathPoints);
    const pathMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      linewidth: 0.5,
      dashSize: 1,
      gapSize: 0.5
    });
    const pathLine = new THREE.LineSegments(pathGeometry, pathMaterial);
    pathLine.computeLineDistances();
    pathLine.visible = false;

    this.roadGroup.add(mesh);
    this.roadGroup.add(edgeMesh);
    this.roadGroup.add(pathLine);

    this.roads.set(id, {
      id,
      type,
      start,
      end,
      width: ROAD_WIDTH,
      length,
      lanes: 2,
      trafficDensity: 0,
      mesh,
      edgeMesh,
      pathLine
    });

    this.originalColors.set(id, new THREE.Color(0x333333));
  }

  private createIntersection(
    id: string,
    position: { x: number; y: number },
    connectedRoads: string[]
  ): void {
    const geometry = new THREE.PlaneGeometry(INTERSECTION_SIZE, INTERSECTION_SIZE);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(position.x, 0.015, position.y);

    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.type = 'intersection';
    mesh.receiveShadow = true;

    const haloGeometry = new THREE.CircleGeometry(10, 32);
    haloGeometry.rotateX(-Math.PI / 2);
    haloGeometry.translate(position.x, 0.005, position.y);
    
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);

    this.intersectionGroup.add(mesh);
    this.intersectionGroup.add(haloMesh);

    this.intersections.set(id, {
      id,
      position,
      size: INTERSECTION_SIZE,
      connectedRoads,
      mesh,
      haloMesh
    });
  }

  public getHeatmapColor(density: number): THREE.Color {
    const normalized = (density - DENSITY_RANGE.MIN) / (DENSITY_RANGE.MAX - DENSITY_RANGE.MIN);
    const clamped = Math.max(0, Math.min(1, normalized));

    const lowColor = new THREE.Color(HEATMAP_COLORS.LOW);
    const mediumColor = new THREE.Color(HEATMAP_COLORS.MEDIUM);
    const highColor = new THREE.Color(HEATMAP_COLORS.HIGH);

    if (clamped < 0.5) {
      const t = clamped * 2;
      return lowColor.clone().lerp(mediumColor, t);
    } else {
      const t = (clamped - 0.5) * 2;
      return mediumColor.clone().lerp(highColor, t);
    }
  }

  public setTrafficDensity(roadDensities: Map<string, number>): void {
    for (const [roadId, density] of roadDensities) {
      const road = this.roads.get(roadId);
      if (road && road.mesh) {
        road.trafficDensity = density;
        const color = this.getHeatmapColor(density);
        
        const material = road.mesh.material as THREE.MeshStandardMaterial;
        if (roadId !== this.hoveredRoadId) {
          material.color.copy(color);
        }
        this.originalColors.set(roadId, color.clone());
      }
    }

    for (const [, intersection] of this.intersections) {
      if (intersection.mesh) {
        let totalDensity = 0;
        let count = 0;
        for (const roadId of intersection.connectedRoads) {
          const road = this.roads.get(roadId);
          if (road) {
            totalDensity += road.trafficDensity;
            count++;
          }
        }
        if (count > 0) {
          const avgDensity = totalDensity / count;
          const color = this.getHeatmapColor(avgDensity);
          const material = intersection.mesh.material as THREE.MeshStandardMaterial;
          material.color.copy(color);
        }
      }
    }
  }

  public updateLOD(level: LODLevel, cameraDistance: number): void {
    if (level === 'near') {
      this.roadGroup.visible = true;
      this.intersectionGroup.visible = true;
      
      for (const [, road] of this.roads) {
        if (road.mesh) road.mesh.visible = true;
        if (road.edgeMesh) road.edgeMesh.visible = true;
        if (road.pathLine) {
          road.pathLine.visible = cameraDistance < LOD_PATH_DISTANCE;
        }
      }
      
      if (this.mergedRoadMesh) {
        this.mergedRoadMesh.visible = false;
      }
    } else if (level === 'mid') {
      this.roadGroup.visible = true;
      this.intersectionGroup.visible = true;
      
      for (const [, road] of this.roads) {
        if (road.mesh) road.mesh.visible = true;
        if (road.edgeMesh) road.edgeMesh.visible = true;
        if (road.pathLine) road.pathLine.visible = false;
      }
    } else {
      this.roadGroup.visible = false;
      this.intersectionGroup.visible = true;
      
      for (const [, intersection] of this.intersections) {
        if (intersection.mesh) {
          intersection.mesh.scale.setScalar(1.2);
        }
      }
    }
  }

  public handleMouseMove(event: MouseEvent, container: HTMLElement): string | null {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const roadMeshes: THREE.Object3D[] = [];
    for (const [, road] of this.roads) {
      if (road.mesh) roadMeshes.push(road.mesh);
    }
    
    const intersects = this.raycaster.intersectObjects(roadMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const roadId = hit.object.userData.roadId;
      
      if (roadId && roadId !== this.hoveredRoadId) {
        this.setHoveredRoad(roadId);
      }
      
      return roadId || null;
    } else {
      if (this.hoveredRoadId) {
        this.clearHoveredRoad();
      }
      return null;
    }
  }

  private setHoveredRoad(roadId: string): void {
    if (this.hoveredRoadId) {
      this.clearHoveredRoad();
    }

    this.hoveredRoadId = roadId;
    const road = this.roads.get(roadId);

    if (road && road.mesh) {
      const material = road.mesh.material as THREE.MeshStandardMaterial;
      const originalColor = this.originalColors.get(roadId);
      
      if (originalColor) {
        const highlightedColor = originalColor.clone();
        highlightedColor.r = Math.min(1, highlightedColor.r * 1.3);
        highlightedColor.g = Math.min(1, highlightedColor.g * 1.3);
        highlightedColor.b = Math.min(1, highlightedColor.b * 1.3);
        material.color.copy(highlightedColor);
      }

      if (road.edgeMesh) {
        const edgeMaterial = road.edgeMesh.material as THREE.LineBasicMaterial;
        edgeMaterial.opacity = 1;
        edgeMaterial.color.setHex(0xffffff);
      }
    }
  }

  private clearHoveredRoad(): void {
    if (!this.hoveredRoadId) return;

    const road = this.roads.get(this.hoveredRoadId);
    if (road && road.mesh) {
      const material = road.mesh.material as THREE.MeshStandardMaterial;
      const originalColor = this.originalColors.get(this.hoveredRoadId);
      if (originalColor) {
        material.color.copy(originalColor);
      }

      if (road.edgeMesh) {
        const edgeMaterial = road.edgeMesh.material as THREE.LineBasicMaterial;
        edgeMaterial.opacity = 0.2;
      }
    }

    this.hoveredRoadId = null;
  }

  public getRoadDensity(roadId: string): number | null {
    const road = this.roads.get(roadId);
    return road ? road.trafficDensity : null;
  }

  public getRoads(): Map<string, RoadSegment> {
    return this.roads;
  }

  public getIntersections(): Map<string, Intersection> {
    return this.intersections;
  }

  public getHoveredRoadId(): string | null {
    return this.hoveredRoadId;
  }

  public getRoadMeshObjects(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    for (const [, road] of this.roads) {
      if (road.mesh) meshes.push(road.mesh);
    }
    return meshes;
  }

  public dispose(): void {
    for (const [, road] of this.roads) {
      if (road.mesh) {
        road.mesh.geometry.dispose();
        (road.mesh.material as THREE.Material).dispose();
      }
      if (road.edgeMesh) {
        road.edgeMesh.geometry.dispose();
        (road.edgeMesh.material as THREE.Material).dispose();
      }
      if (road.pathLine) {
        road.pathLine.geometry.dispose();
        (road.pathLine.material as THREE.Material).dispose();
      }
    }

    for (const [, intersection] of this.intersections) {
      if (intersection.mesh) {
        intersection.mesh.geometry.dispose();
        (intersection.mesh.material as THREE.Material).dispose();
      }
      if (intersection.haloMesh) {
        intersection.haloMesh.geometry.dispose();
        (intersection.haloMesh.material as THREE.Material).dispose();
      }
    }

    this.scene.remove(this.roadGroup);
    this.scene.remove(this.intersectionGroup);
  }
}
