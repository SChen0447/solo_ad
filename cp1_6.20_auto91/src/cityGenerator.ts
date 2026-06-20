import * as THREE from 'three';

export interface BuildingData {
  mesh: THREE.Mesh;
  height: number;
  windows: THREE.Mesh[];
  windowOpacityTargets: number[];
}

export interface CityGroup {
  group: THREE.Group;
  ground: THREE.Mesh;
  buildings: BuildingData[];
}

const BUILDING_COLORS = [0xb0b0b0, 0xe8e0d0, 0xa0c4e0];
const GRID_SIZE = 20;
const CELL_SIZE = 2;
const GROUND_COLOR = 0x3a3a3a;
const WINDOW_COLOR = 0xffdd44;
const WINDOW_SIZE = 0.2;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

function createGround(): THREE.Mesh {
  const size = GRID_SIZE * CELL_SIZE;
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshStandardMaterial({
    color: GROUND_COLOR,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

function createBuilding(
  x: number,
  z: number,
  height: number,
  colorIndex: number
): { building: THREE.Mesh; windows: THREE.Mesh[] } {
  const buildingWidth = CELL_SIZE * 0.7;
  const geometry = new THREE.BoxGeometry(buildingWidth, height, buildingWidth);
  const material = new THREE.MeshStandardMaterial({
    color: BUILDING_COLORS[colorIndex],
    roughness: 0.7,
    metalness: 0.2,
  });
  const building = new THREE.Mesh(geometry, material);
  building.position.set(x, height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;

  const windows: THREE.Mesh[] = [];
  const windowCount = Math.floor(height / 2);
  const windowsPerFloor = 2;
  const floors = Math.max(1, Math.floor(windowCount / windowsPerFloor));

  for (let floor = 0; floor < floors; floor++) {
    for (let i = 0; i < windowsPerFloor; i++) {
      const windowGeom = new THREE.PlaneGeometry(WINDOW_SIZE, WINDOW_SIZE * 1.5);
      const windowMat = new THREE.MeshBasicMaterial({
        color: WINDOW_COLOR,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const windowMesh = new THREE.Mesh(windowGeom, windowMat);

      const yPos = (floor + 0.5) * (height / floors) + WINDOW_SIZE;
      const offset = (i - 0.5) * buildingWidth * 0.5;

      const side = Math.random() > 0.5 ? 1 : -1;
      const axis = Math.random() > 0.5 ? 'x' : 'z';

      if (axis === 'x') {
        windowMesh.position.set(x + offset, yPos, z + (side * buildingWidth) / 2 + 0.01);
        windowMesh.rotation.y = side > 0 ? 0 : Math.PI;
      } else {
        windowMesh.position.set(x + (side * buildingWidth) / 2 + 0.01, yPos, z + offset);
        windowMesh.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      windows.push(windowMesh);
    }
  }

  return { building, windows };
}

function createRoofDecoration(
  x: number,
  y: number,
  z: number,
  colorIndex: number
): THREE.Mesh {
  const usePyramid = Math.random() > 0.5;
  const size = CELL_SIZE * 0.3;

  if (usePyramid) {
    const geometry = new THREE.ConeGeometry(size, size * 1.2, 4);
    const material = new THREE.MeshStandardMaterial({
      color: BUILDING_COLORS[colorIndex],
      roughness: 0.6,
      metalness: 0.3,
    });
    const pyramid = new THREE.Mesh(geometry, material);
    pyramid.position.set(x, y + size * 0.6, z);
    pyramid.rotation.y = Math.PI / 4;
    pyramid.castShadow = true;
    return pyramid;
  } else {
    const geometry = new THREE.BoxGeometry(size, size * 0.6, size);
    const material = new THREE.MeshStandardMaterial({
      color: BUILDING_COLORS[colorIndex],
      roughness: 0.6,
      metalness: 0.3,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y + size * 0.3, z);
    cube.castShadow = true;
    return cube;
  }
}

export function generateCity(): CityGroup {
  const group = new THREE.Group();
  const buildings: BuildingData[] = [];

  const ground = createGround();
  group.add(ground);

  const halfGrid = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE;

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (Math.random() > 0.6 && buildings.length < 80) {
        const x = -halfGrid + i * CELL_SIZE;
        const z = -halfGrid + j * CELL_SIZE;

        const height = randomRange(3, 12);
        const colorIndex = randomInt(0, BUILDING_COLORS.length - 1);

        const { building, windows } = createBuilding(x, z, height, colorIndex);
        group.add(building);

        windows.forEach((w) => group.add(w));

        const roofDeco = createRoofDecoration(x, height, z, colorIndex);
        group.add(roofDeco);

        const windowOpacityTargets = windows.map(() => Math.random() > 0.3 ? 1 : 0);

        buildings.push({
          mesh: building,
          height,
          windows,
          windowOpacityTargets,
        });
      }
    }
  }

  return { group, ground, buildings };
}

export function setWindowOpacity(building: BuildingData, targetOpacity: number, duration: number = 1): void {
  building.windows.forEach((windowMesh, index) => {
    const mat = windowMesh.material as THREE.MeshBasicMaterial;
    const target = building.windowOpacityTargets[index] * targetOpacity;
    mat.opacity = target;
  });
}
