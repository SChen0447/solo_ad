export interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation?: number;
}

export interface CityLayout {
  name: string;
  description: string;
  buildings: BuildingData[];
  sceneSize: number;
}

function generateCheckerboard(sceneSize: number): BuildingData[] {
  const buildings: BuildingData[] = [];
  const gridSize = 6;
  const cellSize = sceneSize / gridSize;
  const buildingSize = cellSize * 0.55;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if ((i + j) % 2 === 0) {
        const height = 15 + Math.random() * 45;
        buildings.push({
          x: (i - gridSize / 2 + 0.5) * cellSize,
          z: (j - gridSize / 2 + 0.5) * cellSize,
          width: buildingSize,
          depth: buildingSize,
          height: height,
        });
      }
    }
  }
  return buildings;
}

function generateRadial(sceneSize: number): BuildingData[] {
  const buildings: BuildingData[] = [];
  const rings = 5;

  for (let ring = 1; ring <= rings; ring++) {
    const radius = (ring / rings) * (sceneSize / 2) * 0.85;
    const buildingCount = ring * 4 + 4;
    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const jitterR = (Math.random() - 0.5) * (sceneSize / rings) * 0.2;
      const jitterA = (Math.random() - 0.5) * 0.15;
      const r = radius + jitterR;
      const a = angle + jitterA;
      const size = 5 + (rings - ring) * 1.5 + Math.random() * 4;
      const height = 10 + (rings - ring) * 12 + Math.random() * 25;
      buildings.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        width: size,
        depth: size,
        height: height,
        rotation: angle,
      });
    }
  }
  return buildings;
}

function generateSkyline(sceneSize: number): BuildingData[] {
  const buildings: BuildingData[] = [];
  const half = sceneSize / 2;

  buildings.push({ x: 0, z: 0, width: 18, depth: 18, height: 90 });

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 30;
    buildings.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      width: 10 + Math.random() * 6,
      depth: 10 + Math.random() * 6,
      height: 55 + Math.random() * 25,
    });
  }

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 + 0.1;
    const r = 55;
    buildings.push({
      x: Math.cos(angle) * r + (Math.random() - 0.5) * 8,
      z: Math.sin(angle) * r + (Math.random() - 0.5) * 8,
      width: 7 + Math.random() * 5,
      depth: 7 + Math.random() * 5,
      height: 25 + Math.random() * 30,
    });
  }

  for (let i = 0; i < 24; i++) {
    const x = (Math.random() - 0.5) * (half * 1.6);
    const z = (Math.random() - 0.5) * (half * 1.6);
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 70) {
      buildings.push({
        x,
        z,
        width: 5 + Math.random() * 4,
        depth: 5 + Math.random() * 4,
        height: 8 + Math.random() * 18,
      });
    }
  }

  return buildings;
}

function generateDense(sceneSize: number): BuildingData[] {
  const buildings: BuildingData[] = [];
  const gridSize = 10;
  const cellSize = sceneSize / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (Math.random() > 0.15) {
        const size = cellSize * (0.6 + Math.random() * 0.25);
        const height = 12 + Math.random() * 55;
        buildings.push({
          x: (i - gridSize / 2 + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.1,
          z: (j - gridSize / 2 + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.1,
          width: size,
          depth: size * (0.7 + Math.random() * 0.6),
          height: height,
          rotation: Math.random() * 0.3 - 0.15,
        });
      }
    }
  }
  return buildings;
}

function generatePark(sceneSize: number): BuildingData[] {
  const buildings: BuildingData[] = [];
  const half = sceneSize / 2;
  const parkRadius = 35;

  const perimeterCount = 20;
  for (let i = 0; i < perimeterCount; i++) {
    const angle = (i / perimeterCount) * Math.PI * 2;
    const r = parkRadius + 12;
    const size = 7 + Math.random() * 5;
    const height = 18 + Math.random() * 35;
    buildings.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      width: size,
      depth: size,
      height: height,
      rotation: angle + Math.PI / 2,
    });
  }

  const outerRing = 28;
  for (let i = 0; i < outerRing; i++) {
    const angle = (i / outerRing) * Math.PI * 2 + 0.05;
    const r = parkRadius + 35;
    if (Math.cos(angle) * r > -half + 10 && Math.cos(angle) * r < half - 10 &&
        Math.sin(angle) * r > -half + 10 && Math.sin(angle) * r < half - 10) {
      const size = 6 + Math.random() * 5;
      const height = 10 + Math.random() * 28;
      buildings.push({
        x: Math.cos(angle) * r + (Math.random() - 0.5) * 6,
        z: Math.sin(angle) * r + (Math.random() - 0.5) * 6,
        width: size,
        depth: size,
        height: height,
      });
    }
  }

  for (let corner = 0; corner < 4; corner++) {
    const angle = (corner / 4) * Math.PI * 2 + Math.PI / 4;
    const r = parkRadius + 50;
    buildings.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      width: 14,
      depth: 14,
      height: 45 + Math.random() * 30,
    });
  }

  return buildings;
}

const SCENE_SIZE = 160;

export const SAMPLE_LAYOUTS: CityLayout[] = [
  {
    name: '棋盘格布局',
    description: '规则网格状排列的城市街区',
    buildings: generateCheckerboard(SCENE_SIZE),
    sceneSize: SCENE_SIZE,
  },
  {
    name: '放射状布局',
    description: '从中心向外辐射的环形建筑布局',
    buildings: generateRadial(SCENE_SIZE),
    sceneSize: SCENE_SIZE,
  },
  {
    name: '高低错落',
    description: '中心高楼向外逐渐降低的天际线布局',
    buildings: generateSkyline(SCENE_SIZE),
    sceneSize: SCENE_SIZE,
  },
  {
    name: '密集城区',
    description: '高密度窄间距的城市中心区',
    buildings: generateDense(SCENE_SIZE),
    sceneSize: SCENE_SIZE,
  },
  {
    name: '中央公园',
    description: '环绕开阔公园空间的建筑群布局',
    buildings: generatePark(SCENE_SIZE),
    sceneSize: SCENE_SIZE,
  },
];

export function getLayoutByName(name: string): CityLayout | undefined {
  return SAMPLE_LAYOUTS.find((l) => l.name === name);
}
