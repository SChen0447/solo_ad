import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import {
  createBuildingMesh,
  randomBaseColor,
  randomFloors,
  setWindowsLit,
  BuildingData,
} from './buildingFactory';

const GRID_SIZE = 15;
const CELL_SIZE = 1;
const MAX_FLOORS = 15;

export interface BuildingInfo {
  id: string;
  gridX: number;
  gridZ: number;
  floors: number;
  height: number;
  area: number;
  distanceFromCenter: number;
  color: string;
}

interface GrowthAnimation {
  mesh: THREE.Group;
  targetHeight: number;
  startTime: number;
  duration: number;
  startY: number;
}

interface OutlineMesh {
  outline: THREE.LineSegments;
  glow: THREE.Mesh;
}

interface OutlineConfig {
  outlineColor: number;
  glowColor: number;
  outlineOpacity: number;
  glowOpacity: number;
  lineWidth: number;
  scale: number;
  glowScale: number;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  gridCells: THREE.Mesh[][] = [];
  buildings: Map<string, { mesh: THREE.Group; data: BuildingData }> = new Map();
  buildingGrid: (BuildingData | null)[][] = [];
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
  growthAnimations: GrowthAnimation[] = [];
  isNight: boolean = false;
  hoveredBuilding: THREE.Group | null = null;
  selectedBuilding: THREE.Group | null = null;
  hoverOutline: THREE.LineSegments | null = null;
  hoverGlow: THREE.Mesh | null = null;
  selectedOutline: THREE.LineSegments | null = null;
  selectedGlow: THREE.Mesh | null = null;
  pulseTime: number = 0;
  onBuildingHover?: (info: BuildingInfo | null) => void;
  onBuildingSelect?: (info: BuildingInfo | null) => void;
  onBuildingCountChange?: (count: number, density: number) => void;
  growthTimer: number | null = null;
  growthStartTime: number = 0;
  growthElapsed: number = 0;
  bfsQueue: { x: number; z: number }[] = [];
  visited: boolean[][] = [];
  isGrowing: boolean = false;
  onGrowthTimeUpdate?: (seconds: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(GRID_SIZE, GRID_SIZE * 1.2, GRID_SIZE);
    this.camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    this.ambientLight = new THREE.AmbientLight(0xffeedd, 1.0);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);

    this.initGrid();
    this.initBuildingGrid();
    this.initHoverOutline();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  initGrid() {
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(GRID_SIZE / 2, -0.01, GRID_SIZE / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (let z = 0; z < GRID_SIZE; z++) {
      this.gridCells[z] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const cellGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
        const cellMat = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.rotation.x = -Math.PI / 2;
        cell.position.set(x + 0.5, 0.001, z + 0.5);
        cell.userData.gridX = x;
        cell.userData.gridZ = z;
        cell.userData.isCell = true;
        cell.receiveShadow = true;
        this.scene.add(cell);
        this.gridCells[z][x] = cell;
      }
    }

    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0xb0c4de, 0xb0c4de);
    gridHelper.position.set(GRID_SIZE / 2, 0.002, GRID_SIZE / 2);
    this.scene.add(gridHelper);
  }

  initBuildingGrid() {
    for (let z = 0; z < GRID_SIZE; z++) {
      this.buildingGrid[z] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.buildingGrid[z][x] = null;
      }
    }
  }

  initHoverOutline() {
    const hoverBox = new THREE.BoxGeometry(1.08, 1, 1.08);
    const hoverOutlineGeo = new THREE.EdgesGeometry(hoverBox);
    const hoverOutlineMat = new THREE.LineBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    this.hoverOutline = new THREE.LineSegments(hoverOutlineGeo, hoverOutlineMat);
    this.hoverOutline.visible = false;
    this.scene.add(this.hoverOutline);

    const hoverGlowGeo = new THREE.BoxGeometry(1.12, 1, 1.12);
    const hoverGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    this.hoverGlow = new THREE.Mesh(hoverGlowGeo, hoverGlowMat);
    this.hoverGlow.visible = false;
    this.scene.add(this.hoverGlow);

    const selectedBox = new THREE.BoxGeometry(1.12, 1, 1.12);
    const selectedOutlineGeo = new THREE.EdgesGeometry(selectedBox);
    const selectedOutlineMat = new THREE.LineBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 1.0,
      linewidth: 3,
    });
    this.selectedOutline = new THREE.LineSegments(selectedOutlineGeo, selectedOutlineMat);
    this.selectedOutline.visible = false;
    this.scene.add(this.selectedOutline);

    const selectedGlowGeo = new THREE.BoxGeometry(1.18, 1, 1.18);
    const selectedGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    this.selectedGlow = new THREE.Mesh(selectedGlowGeo, selectedGlowMat);
    this.selectedGlow.visible = false;
    this.scene.add(this.selectedGlow);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  handleClick(intersects: THREE.Intersection[]) {
    let clickedBuilding: THREE.Group | null = null;
    let clickedCell: { gridX: number; gridZ: number } | null = null;

    for (const intersect of intersects) {
      const obj = intersect.object;
      if (obj.userData.isCell && !clickedCell) {
        const gridX = obj.userData.gridX;
        const gridZ = obj.userData.gridZ;
        if (!this.buildingGrid[gridZ][gridX]) {
          clickedCell = { gridX, gridZ };
        }
      }
      if (obj.userData.isFloor) {
        const buildingGroup = obj.parent as THREE.Group;
        if (buildingGroup && buildingGroup.userData.id && !clickedBuilding) {
          clickedBuilding = buildingGroup;
        }
      }
      const parent = obj.parent;
      if (parent && parent.userData && parent.userData.id && !clickedBuilding) {
        const grandParent = parent.parent;
        if (grandParent && grandParent.userData && grandParent.userData.id) {
          clickedBuilding = grandParent as THREE.Group;
        } else {
          clickedBuilding = parent as THREE.Group;
        }
      }
    }

    if (clickedBuilding) {
      if (this.selectedBuilding && this.selectedBuilding.userData.id === clickedBuilding.userData.id) {
        this.upgradeBuilding(clickedBuilding.userData.id);
      } else {
        this.setSelectedBuilding(clickedBuilding);
        this.upgradeBuilding(clickedBuilding.userData.id);
      }
      return;
    }

    this.clearSelection();

    if (clickedCell) {
      this.addBuilding(clickedCell.gridX, clickedCell.gridZ);
      return;
    }
  }

  setSelectedBuilding(building: THREE.Group | null) {
    this.selectedBuilding = building;
    this.updateSelectedOutline();

    if (this.onBuildingSelect) {
      if (building) {
        const data = this.buildings.get(building.userData.id)?.data;
        if (data) {
          this.onBuildingSelect(this.getBuildingInfo(data));
        }
      } else {
        this.onBuildingSelect(null);
      }
    }
  }

  clearSelection() {
    this.setSelectedBuilding(null);
  }

  handleHover(intersects: THREE.Intersection[]) {
    let foundBuilding: THREE.Group | null = null;

    for (const intersect of intersects) {
      const obj = intersect.object;
      if (obj.userData.isFloor) {
        const buildingGroup = obj.parent as THREE.Group;
        if (buildingGroup && buildingGroup.userData.id) {
          foundBuilding = buildingGroup;
          break;
        }
      }
      const parent = obj.parent;
      if (parent && parent.userData && parent.userData.id) {
        const grandParent = parent.parent;
        if (grandParent && grandParent.userData && grandParent.userData.id) {
          foundBuilding = grandParent as THREE.Group;
          break;
        }
        foundBuilding = parent as THREE.Group;
        break;
      }
    }

    if (foundBuilding !== this.hoveredBuilding) {
      this.hoveredBuilding = foundBuilding;
      this.updateHoverOutline();

      if (this.onBuildingHover) {
        if (foundBuilding) {
          const data = this.buildings.get(foundBuilding.userData.id)?.data;
          if (data) {
            this.onBuildingHover(this.getBuildingInfo(data));
          }
        } else {
          this.onBuildingHover(null);
        }
      }
    }
  }

  updateHoverOutline() {
    const shouldShowHover = !!this.hoveredBuilding &&
      (!this.selectedBuilding || this.hoveredBuilding.userData.id !== this.selectedBuilding.userData.id);

    if (!this.hoverOutline || !this.hoverGlow) return;

    if (!shouldShowHover) {
      this.hoverOutline.visible = false;
      this.hoverGlow.visible = false;
    } else {
      const data = this.buildings.get(this.hoveredBuilding!.userData.id)?.data;
      if (!data) {
        this.hoverOutline.visible = false;
        this.hoverGlow.visible = false;
        return;
      }

      const height = this.hoveredBuilding!.userData.totalHeight || data.floors;
      this.hoverOutline.scale.set(1, height, 1);
      this.hoverOutline.position.set(
        data.gridX + 0.5,
        height / 2,
        data.gridZ + 0.5
      );
      this.hoverOutline.visible = true;

      this.hoverGlow.scale.set(1, height, 1);
      this.hoverGlow.position.set(
        data.gridX + 0.5,
        height / 2,
        data.gridZ + 0.5
      );
      this.hoverGlow.visible = true;
    }
  }

  updateSelectedOutline() {
    if (!this.selectedOutline || !this.selectedGlow) return;

    if (!this.selectedBuilding) {
      this.selectedOutline.visible = false;
      this.selectedGlow.visible = false;
      return;
    }

    const data = this.buildings.get(this.selectedBuilding.userData.id)?.data;
    if (!data) {
      this.selectedOutline.visible = false;
      this.selectedGlow.visible = false;
      return;
    }

    const height = this.selectedBuilding.userData.totalHeight || data.floors;
    this.selectedOutline.scale.set(1, height, 1);
    this.selectedOutline.position.set(
      data.gridX + 0.5,
      height / 2,
      data.gridZ + 0.5
    );
    this.selectedOutline.visible = true;

    this.selectedGlow.scale.set(1, height, 1);
    this.selectedGlow.position.set(
      data.gridX + 0.5,
      height / 2,
      data.gridZ + 0.5
    );
    this.selectedGlow.visible = true;
  }

  getBuildingInfo(data: BuildingData): BuildingInfo {
    const centerX = (GRID_SIZE - 1) / 2;
    const centerZ = (GRID_SIZE - 1) / 2;
    const dx = data.gridX - centerX;
    const dz = data.gridZ - centerZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return {
      id: data.id,
      gridX: data.gridX,
      gridZ: data.gridZ,
      floors: data.floors,
      height: data.floors * 3,
      area: 100,
      distanceFromCenter: Math.round(distance * 10) / 10,
      color: data.color,
    };
  }

  addBuilding(gridX: number, gridZ: number, floors?: number, color?: string): BuildingData | null {
    if (this.buildingGrid[gridZ][gridX]) return null;

    const buildingFloors = floors ?? randomFloors(3, 6);
    const buildingColor = color ?? randomBaseColor();

    const mesh = createBuildingMesh(buildingFloors, buildingColor);
    mesh.position.set(gridX + 0.5, 0, gridZ + 0.5);
    mesh.userData.id = uuidv4();

    const data: BuildingData = {
      id: mesh.userData.id,
      gridX,
      gridZ,
      floors: buildingFloors,
      color: buildingColor,
      windowLights: [],
    };

    const windowsGroup = mesh.getObjectByName('windows');
    if (windowsGroup) {
      data.windowLights = windowsGroup.userData.windowLights || [];
    }

    setWindowsLit(mesh, this.isNight);

    this.scene.add(mesh);
    this.buildings.set(data.id, { mesh, data });
    this.buildingGrid[gridZ][gridX] = data;

    const cell = this.gridCells[gridZ][gridX];
    if (cell) {
      (cell.material as THREE.MeshLambertMaterial).color.setHex(0x70b070);
    }

    this.notifyBuildingCount();
    return data;
  }

  upgradeBuilding(id: string): BuildingData | null {
    const building = this.buildings.get(id);
    if (!building) return null;

    const { mesh, data } = building;
    if (data.floors >= MAX_FLOORS) return null;

    const increase = Math.floor(Math.random() * 3) + 2;
    const newFloors = Math.min(data.floors + increase, MAX_FLOORS);

    this.scene.remove(mesh);

    const newMesh = createBuildingMesh(newFloors, data.color);
    newMesh.position.set(data.gridX + 0.5, 0, data.gridZ + 0.5);
    newMesh.userData.id = data.id;

    setWindowsLit(newMesh, this.isNight);

    this.scene.add(newMesh);

    data.floors = newFloors;
    const windowsGroup = newMesh.getObjectByName('windows');
    if (windowsGroup) {
      data.windowLights = windowsGroup.userData.windowLights || [];
    }

    this.buildings.set(data.id, { mesh: newMesh, data });

    if (this.hoveredBuilding && this.hoveredBuilding.userData.id === id) {
      this.hoveredBuilding = newMesh;
      this.updateHoverOutline();
    }

    if (this.selectedBuilding && this.selectedBuilding.userData.id === id) {
      this.selectedBuilding = newMesh;
      this.updateSelectedOutline();
      if (this.onBuildingSelect) {
        this.onBuildingSelect(this.getBuildingInfo(data));
      }
    }

    return data;
  }

  removeBuilding(id: string): boolean {
    const building = this.buildings.get(id);
    if (!building) return false;

    const { mesh, data } = building;
    this.scene.remove(mesh);
    this.buildings.delete(id);
    this.buildingGrid[data.gridZ][data.gridX] = null;

    const cell = this.gridCells[data.gridZ][data.gridX];
    if (cell) {
      (cell.material as THREE.MeshLambertMaterial).color.setHex(0x90ee90);
    }

    if (this.hoveredBuilding && this.hoveredBuilding.userData.id === id) {
      this.hoveredBuilding = null;
      this.updateHoverOutline();
      if (this.onBuildingHover) {
        this.onBuildingHover(null);
      }
    }

    if (this.selectedBuilding && this.selectedBuilding.userData.id === id) {
      this.selectedBuilding = null;
      this.updateSelectedOutline();
      if (this.onBuildingSelect) {
        this.onBuildingSelect(null);
      }
    }

    this.notifyBuildingCount();
    return true;
  }

  notifyBuildingCount() {
    if (this.onBuildingCountChange) {
      const count = this.buildings.size;
      const total = GRID_SIZE * GRID_SIZE;
      const density = Math.round((count / total) * 100);
      this.onBuildingCountChange(count, density);
    }
  }

  setDayNight(hour: number) {
    const isNight = hour >= 18 || hour < 6;

    if (isNight !== this.isNight) {
      this.isNight = isNight;

      this.buildings.forEach(({ mesh }) => {
        setWindowsLit(mesh, isNight);
      });

      if (isNight) {
        this.ambientLight.color.setHex(0x334466);
        this.ambientLight.intensity = 0.2;
      } else {
        this.ambientLight.color.setHex(0xffeedd);
        this.ambientLight.intensity = 1.0;
      }
    }
  }

  startGrowth() {
    if (this.isGrowing) return;

    this.isGrowing = true;
    this.bfsQueue = [];
    this.visited = [];
    this.growthStartTime = Date.now();
    this.growthElapsed = 0;

    for (let z = 0; z < GRID_SIZE; z++) {
      this.visited[z] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.visited[z][x] = false;
      }
    }

    const center = Math.floor(GRID_SIZE / 2);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = center + dx;
        const z = center + dz;
        if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
          if (!this.buildingGrid[z][x]) {
            this.bfsQueue.push({ x, z });
            this.visited[z][x] = true;
          }
        }
      }
    }

    this.growthStep();
  }

  growthStep() {
    if (!this.isGrowing) return;

    this.growthElapsed = (Date.now() - this.growthStartTime) / 1000;
    if (this.onGrowthTimeUpdate) {
      this.onGrowthTimeUpdate(Math.floor(this.growthElapsed));
    }

    const newBuildings: { x: number; z: number }[] = [];
    const nextQueue: { x: number; z: number }[] = [];

    while (this.bfsQueue.length > 0) {
      const current = this.bfsQueue.shift()!;

      if (!this.buildingGrid[current.z][current.x]) {
        this.addBuilding(current.x, current.z);
        newBuildings.push(current);

        const neighbors = [
          { x: current.x - 1, z: current.z },
          { x: current.x + 1, z: current.z },
          { x: current.x, z: current.z - 1 },
          { x: current.x, z: current.z + 1 },
        ];

        for (const neighbor of neighbors) {
          if (
            neighbor.x >= 0 &&
            neighbor.x < GRID_SIZE &&
            neighbor.z >= 0 &&
            neighbor.z < GRID_SIZE &&
            !this.visited[neighbor.z][neighbor.x] &&
            !this.buildingGrid[neighbor.z][neighbor.x]
          ) {
            this.visited[neighbor.z][neighbor.x] = true;
            nextQueue.push(neighbor);
          }
        }
      }
    }

    this.bfsQueue = nextQueue;

    if (this.bfsQueue.length > 0) {
      this.growthTimer = window.setTimeout(() => this.growthStep(), 1000);
    } else {
      this.stopGrowth();
    }
  }

  stopGrowth() {
    this.isGrowing = false;
    if (this.growthTimer) {
      clearTimeout(this.growthTimer);
      this.growthTimer = null;
    }
  }

  reset() {
    this.stopGrowth();

    this.buildings.forEach(({ mesh, data }) => {
      this.scene.remove(mesh);
      const cell = this.gridCells[data.gridZ][data.gridX];
      if (cell) {
        (cell.material as THREE.MeshLambertMaterial).color.setHex(0x90ee90);
      }
    });

    this.buildings.clear();
    this.initBuildingGrid();
    this.hoveredBuilding = null;
    this.selectedBuilding = null;
    this.updateHoverOutline();
    this.updateSelectedOutline();

    if (this.onBuildingHover) {
      this.onBuildingHover(null);
    }

    if (this.onBuildingSelect) {
      this.onBuildingSelect(null);
    }

    this.notifyBuildingCount();
    this.growthElapsed = 0;
    if (this.onGrowthTimeUpdate) {
      this.onGrowthTimeUpdate(0);
    }
  }

  randomize(count: number = 20) {
    const emptyCells: { x: number; z: number }[] = [];
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!this.buildingGrid[z][x]) {
          emptyCells.push({ x, z });
        }
      }
    }

    const numBuild = Math.min(count, emptyCells.length);
    for (let i = 0; i < numBuild; i++) {
      const idx = Math.floor(Math.random() * emptyCells.length);
      const cell = emptyCells.splice(idx, 1)[0];
      const floors = randomFloors(2, 10);
      this.addBuilding(cell.x, cell.z, floors);
    }
  }

  exportScene(): BuildingData[] {
    const data: BuildingData[] = [];
    this.buildings.forEach(({ data: buildingData }) => {
      data.push({ ...buildingData });
    });
    return data;
  }

  update(_deltaTime: number) {
    for (let i = this.growthAnimations.length - 1; i >= 0; i--) {
      const anim = this.growthAnimations[i];
      const elapsed = (Date.now() - anim.startTime) / 1000;

      if (elapsed >= anim.duration) {
        anim.mesh.position.y = anim.startY + anim.targetHeight;
        this.growthAnimations.splice(i, 1);
      } else {
        const t = elapsed / anim.duration;
        const height = anim.targetHeight * t;
        anim.mesh.position.y = anim.startY + height;
        anim.mesh.scale.y = t;
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
