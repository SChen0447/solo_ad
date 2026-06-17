import * as THREE from 'three';
import { CameraController } from './CameraController';
import { DataService, BuildingData, RoomData, FacilityData } from './DataService';

export interface AnnotationMarker {
  id: string;
  mesh: THREE.Mesh;
  data: FacilityData;
  isVisible: boolean;
  scale: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cameraController: CameraController;
  private dataService: DataService;
  
  private buildingGroup: THREE.Group = new THREE.Group();
  private annotationMarkers: AnnotationMarker[] = [];
  private particleSystem?: THREE.Points;
  
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredMarker: AnnotationMarker | null = null;
  
  private buildingData: BuildingData | null = null;
  private collisionBoxes: THREE.Box3[] = [];
  private floorHeights: Map<number, number> = new Map();
  
  private onFacilityHoverCallback?: (facility: FacilityData | null, screenPos?: { x: number; y: number }) => void;
  private onFacilityClickCallback?: (facility: FacilityData, screenPos: { x: number; y: number }) => void;
  private onLoadProgressCallback?: (progress: number) => void;
  
  private clock: THREE.Clock = new THREE.Clock();
  private animationTime: number = 0;
  
  private activeCategories: Set<string> = new Set(['fire', 'electrical', 'plumbing', 'hvac']);
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    cameraController: CameraController,
    dataService: DataService
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cameraController = cameraController;
    this.dataService = dataService;
    
    this.setupLights();
    this.setupParticles();
    
    this.scene.add(this.buildingGroup);
    
    this.setupEventListeners();
  }
  
  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    const pointLight1 = new THREE.PointLight(0x6688ff, 0.5, 30);
    pointLight1.position.set(0, 8, 0);
    this.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff8866, 0.3, 20);
    pointLight2.position.set(-10, 6, -5);
    this.scene.add(pointLight2);
    
    const hemiLight = new THREE.HemisphereLight(0x8899ff, 0x223344, 0.4);
    this.scene.add(hemiLight);
  }
  
  private setupParticles(): void {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      
      colors[i * 3] = 0.4 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }
  
  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      this.handleHover(e.clientX, e.clientY);
    });
    
    canvas.addEventListener('click', (e) => {
      this.handleClick(e.clientX, e.clientY);
    });
  }
  
  async loadBuilding(): Promise<void> {
    if (this.onLoadProgressCallback) {
      this.onLoadProgressCallback(0.1);
    }
    
    this.buildingData = await this.dataService.getBuilding();
    
    if (this.onLoadProgressCallback) {
      this.onLoadProgressCallback(0.3);
    }
    
    this.createBuildingGeometry();
    
    if (this.onLoadProgressCallback) {
      this.onLoadProgressCallback(0.7);
    }
    
    this.createAnnotations();
    
    if (this.onLoadProgressCallback) {
      this.onLoadProgressCallback(1.0);
    }
    
    this.cameraController.setCollisionBoxes(this.collisionBoxes);
    this.cameraController.setFloorHeights(this.floorHeights);
  }
  
  private createBuildingGeometry(): void {
    if (!this.buildingData) return;
    
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children[0];
      this.buildingGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    
    this.collisionBoxes = [];
    this.floorHeights.clear();
    
    for (const floor of this.buildingData.floors) {
      this.floorHeights.set(floor.level, floor.elevation);
      
      const floorGroup = new THREE.Group();
      floorGroup.position.y = floor.elevation;
      
      for (const room of floor.rooms) {
        this.createRoomGeometry(room, floorGroup, floor.elevation);
      }
      
      this.buildingGroup.add(floorGroup);
    }
    
    const groundGeo = new THREE.PlaneGeometry(50, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.buildingGroup.add(ground);
  }
  
  private createRoomGeometry(room: RoomData, parent: THREE.Group, floorElevation: number): void {
    const corners = room.corners;
    if (corners.length < 3) return;
    
    const shape = new THREE.Shape();
    shape.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < corners.length; i++) {
      shape.lineTo(corners[i][0], corners[i][1]);
    }
    shape.closePath();
    
    const floorGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshStandardMaterial({
      color: room.is_corridor ? 0x2a3a4b : this.hexToNumber(room.color),
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    parent.add(floorMesh);
    
    if (!room.is_corridor && !room.is_staircase) {
      const wallHeight = room.height;
      const wallThickness = 0.2;
      
      for (let i = 0; i < corners.length; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % corners.length];
        
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        
        const wallGeo = new THREE.BoxGeometry(length, wallHeight, wallThickness);
        const wallMat = new THREE.MeshStandardMaterial({
          color: 0x3a4a5b,
          roughness: 0.6,
          metalness: 0.2,
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        
        wall.position.set(
          (p1[0] + p2[0]) / 2,
          wallHeight / 2,
          (p1[1] + p2[1]) / 2
        );
        wall.rotation.y = -angle;
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        parent.add(wall);
        
        const wallBox = new THREE.Box3().setFromObject(wall);
        this.collisionBoxes.push(wallBox);
      }
      
      const ceilingGeo = new THREE.ShapeGeometry(shape);
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: 0x2a3a4a,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = wallHeight;
      parent.add(ceiling);
    }
    
    if (!room.is_corridor && !room.is_staircase) {
      const corners2d = corners.map(c => new THREE.Vector2(c[0], c[1]));
      let cx = 0, cy = 0;
      for (const c of corners2d) { cx += c.x; cy += c.y; }
      cx /= corners2d.length;
      cy /= corners2d.length;
      
      const lightColor = room.is_staircase ? 0x4488ff : 0xffffee;
      const roomLight = new THREE.PointLight(lightColor, 0.4, 15);
      roomLight.position.set(cx, room.height - 0.3, cy);
      parent.add(roomLight);
    }
  }
  
  private createAnnotations(): void {
    if (!this.buildingData) return;
    
    this.annotationMarkers = [];
    
    for (const floor of this.buildingData.floors) {
      for (const facility of floor.facilities) {
        const marker = this.createAnnotationMarker(facility, floor.elevation);
        this.annotationMarkers.push(marker);
        this.buildingGroup.add(marker.mesh);
      }
    }
  }
  
  private createAnnotationMarker(facility: FacilityData, floorElevation: number): AnnotationMarker {
    const color = this.getCategoryColor(facility.category);
    
    const innerGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    
    const outerGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const outerMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const outerSphere = new THREE.Mesh(outerGeo, outerMat);
    
    const group = new THREE.Group();
    group.add(innerSphere);
    group.add(outerSphere);
    
    group.position.set(
      facility.position[0],
      floorElevation + facility.position[1],
      facility.position[2]
    );
    
    group.userData = { facilityId: facility.id };
    
    return {
      id: facility.id,
      mesh: group as unknown as THREE.Mesh,
      data: facility,
      isVisible: true,
      scale: 1,
    };
  }
  
  private getCategoryColor(category: string): number {
    const colors: Record<string, number> = {
      fire: 0xe94560,
      electrical: 0xffd700,
      plumbing: 0x4fc3f7,
      hvac: 0x81c784,
    };
    return colors[category] || 0xffffff;
  }
  
  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
  
  private handleHover(clientX: number, clientY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.annotationMarkers
      .filter(m => m.isVisible)
      .map(m => m.mesh);
    
    const intersects = this.raycaster.intersectObjects(meshes, true);
    
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.facilityId) {
        obj = obj.parent;
      }
      
      if (obj) {
        const marker = this.annotationMarkers.find(m => m.id === obj!.userData.facilityId);
        if (marker && marker !== this.hoveredMarker) {
          this.hoveredMarker = marker;
          
          if (this.onFacilityHoverCallback) {
            const screenPos = this.worldToScreen(marker.mesh.position);
            this.onFacilityHoverCallback(marker.data, screenPos);
          }
        }
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredMarker) {
        this.hoveredMarker = null;
        if (this.onFacilityHoverCallback) {
          this.onFacilityHoverCallback(null);
        }
      }
      document.body.style.cursor = 'default';
    }
  }
  
  private handleClick(clientX: number, clientY: number): void {
    if (this.hoveredMarker && this.onFacilityClickCallback) {
      const screenPos = this.worldToScreen(this.hoveredMarker.mesh.position);
      this.onFacilityClickCallback(this.hoveredMarker.data, screenPos);
    }
  }
  
  private worldToScreen(worldPos: THREE.Vector3): { x: number; y: number } {
    const vector = worldPos.clone().project(this.camera);
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    return {
      x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top,
    };
  }
  
  setOnFacilityHover(callback: (facility: FacilityData | null, screenPos?: { x: number; y: number }) => void): void {
    this.onFacilityHoverCallback = callback;
  }
  
  setOnFacilityClick(callback: (facility: FacilityData, screenPos: { x: number; y: number }) => void): void {
    this.onFacilityClickCallback = callback;
  }
  
  setOnLoadProgress(callback: (progress: number) => void): void {
    this.onLoadProgressCallback = callback;
  }
  
  setActiveCategories(categories: string[]): void {
    this.activeCategories = new Set(categories);
    
    for (const marker of this.annotationMarkers) {
      const isActive = this.activeCategories.has(marker.data.category);
      marker.isVisible = isActive;
      marker.mesh.visible = isActive;
    }
  }
  
  getBuildingData(): BuildingData | null {
    return this.buildingData;
  }
  
  getAnnotationMarkers(): AnnotationMarker[] {
    return this.annotationMarkers;
  }
  
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    for (const marker of this.annotationMarkers) {
      if (!marker.isVisible) continue;
      
      const pulse = 1 + Math.sin(this.animationTime * 3 + marker.mesh.position.x) * 0.1;
      const targetScale = marker === this.hoveredMarker ? 1.5 : 1;
      const scale = THREE.MathUtils.lerp(marker.scale, targetScale * pulse, 0.1);
      marker.scale = scale;
      marker.mesh.scale.setScalar(scale);
      
      marker.mesh.position.y += Math.sin(this.animationTime * 2 + marker.mesh.position.z) * 0.001;
    }
    
    if (this.particleSystem) {
      const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(this.animationTime * 0.5 + positions[i]) * 0.002;
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    this.cameraController.update(deltaTime);
  }
  
  getBuildingCenter(): THREE.Vector3 {
    if (this.buildingData) {
      return new THREE.Vector3(
        this.buildingData.center[0],
        this.buildingData.center[1],
        this.buildingData.center[2]
      );
    }
    return new THREE.Vector3(0, 5, 0);
  }
  
  getBuildingHeight(): number {
    if (this.buildingData && this.buildingData.floors.length > 0) {
      const topFloor = this.buildingData.floors[this.buildingData.floors.length - 1];
      const topRoom = topFloor.rooms[0];
      return topFloor.elevation + (topRoom?.height || 3);
    }
    return 10;
  }
  
  getFloorElevation(floorLevel: number): number {
    return this.floorHeights.get(floorLevel) || 0;
  }
}
