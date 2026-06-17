import * as THREE from 'three';

export interface BuildingData {
  id: string;
  gridX: number;
  gridZ: number;
  floors: number;
  color: string;
  windowLights: boolean[];
}

const FLOOR_HEIGHT = 1;
const BUILDING_SIZE = 0.9;

const colorDarkenMap: Record<string, string[]> = {
  '#f0e68c': ['#f0e68c', '#e0d67c', '#d0c66c', '#c0b65c', '#b0a64c'],
  '#87ceeb': ['#87ceeb', '#77bedb', '#67aecb', '#579ebb', '#478eab'],
  '#dda0dd': ['#dda0dd', '#cd90cd', '#bd80bd', '#ad70ad', '#9d609d'],
};

export function getBuildingColor(baseColor: string, level: number): string {
  const shades = colorDarkenMap[baseColor] || [baseColor];
  const index = Math.min(level, shades.length - 1);
  return shades[index];
}

export function getColorLevel(floors: number): number {
  if (floors <= 6) return 0;
  if (floors <= 9) return 1;
  if (floors <= 12) return 2;
  return 3;
}

export function createBuildingMesh(floors: number, color: string): THREE.Group {
  const buildingGroup = new THREE.Group();
  buildingGroup.userData.floors = floors;
  buildingGroup.userData.baseColor = color;

  const level = getColorLevel(floors);
  const floorColor = getBuildingColor(color, level);

  for (let i = 0; i < floors; i++) {
    const floorGeo = new THREE.BoxGeometry(BUILDING_SIZE, FLOOR_HEIGHT * 0.95, BUILDING_SIZE);
    const floorMat = new THREE.MeshLambertMaterial({ color: floorColor });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = i * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;
    floorMesh.userData.floorIndex = i;
    floorMesh.userData.isFloor = true;
    buildingGroup.add(floorMesh);

    if (i < floors - 1) {
      const lineGeo = new THREE.BoxGeometry(BUILDING_SIZE * 1.01, 0.05, BUILDING_SIZE * 1.01);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.y = (i + 1) * FLOOR_HEIGHT;
      buildingGroup.add(lineMesh);
    }
  }

  const windows = createWindows(floors);
  windows.name = 'windows';
  buildingGroup.add(windows);

  buildingGroup.userData.totalHeight = floors * FLOOR_HEIGHT;

  return buildingGroup;
}

function createWindows(floors: number): THREE.Group {
  const windowsGroup = new THREE.Group();
  const windowLights: boolean[] = [];

  const windowSize = 0.15;
  const windowsPerFloor = 2;
  const gap = BUILDING_SIZE / (windowsPerFloor + 1);

  for (let floor = 0; floor < floors; floor++) {
    const y = floor * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;

    for (let side = 0; side < 4; side++) {
      for (let w = 0; w < windowsPerFloor; w++) {
        const isLit = Math.random() < 0.3;
        windowLights.push(isLit);

        const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 0.8);
        const windowMat = new THREE.MeshBasicMaterial({
          color: isLit ? 0xffd700 : 0x222222,
          side: THREE.DoubleSide,
        });
        const windowMesh = new THREE.Mesh(windowGeo, windowMat);
        windowMesh.userData.isWindow = true;
        windowMesh.userData.isLit = isLit;

        const offset = (w + 1) * gap - BUILDING_SIZE / 2;
        const halfSize = BUILDING_SIZE / 2 + 0.001;

        switch (side) {
          case 0:
            windowMesh.position.set(offset, y, halfSize);
            break;
          case 1:
            windowMesh.position.set(offset, y, -halfSize);
            windowMesh.rotation.y = Math.PI;
            break;
          case 2:
            windowMesh.position.set(halfSize, y, offset);
            windowMesh.rotation.y = Math.PI / 2;
            break;
          case 3:
            windowMesh.position.set(-halfSize, y, offset);
            windowMesh.rotation.y = -Math.PI / 2;
            break;
        }

        windowsGroup.add(windowMesh);
      }
    }
  }

  windowsGroup.userData.windowLights = windowLights;
  return windowsGroup;
}

export function setWindowsLit(buildingGroup: THREE.Group, isNight: boolean): void {
  const windowsGroup = buildingGroup.getObjectByName('windows');
  if (!windowsGroup) return;

  windowsGroup.children.forEach((windowMesh) => {
    if (windowMesh instanceof THREE.Mesh && windowMesh.userData.isWindow) {
      const mat = windowMesh.material as THREE.MeshBasicMaterial;
      if (isNight) {
        mat.color.setHex(windowMesh.userData.isLit ? 0xffd700 : 0x222222);
      } else {
        mat.color.setHex(0x333333);
      }
    }
  });
}

export function randomBaseColor(): string {
  const colors = ['#f0e68c', '#87ceeb', '#dda0dd'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function randomFloors(min: number = 3, max: number = 6): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
