import * as THREE from 'three';

export interface BuildingConfig {
  floors: number;
  floorHeight: number;
  width: number;
  depth: number;
  wallColor: number;
  roofColor: number;
  windowColor: number;
}

export const defaultBuildingConfig: BuildingConfig = {
  floors: 3,
  floorHeight: 2.5,
  width: 4,
  depth: 3,
  wallColor: 0x8B7355,
  roofColor: 0xaaaaaa,
  windowColor: 0x4488ff
};

function createWallMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.05
  });
}

function createRoofMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.05,
    transparent: true,
    opacity: 0.85
  });
}

function createWindowMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.05,
    metalness: 0.6,
    transparent: true,
    opacity: 0.7,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.15
  });
}

function applyShadowProperties(mesh: THREE.Mesh): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

function addEdgeOutline(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  color: number = 0x5C4033
): void {
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    linewidth: 1,
    transparent: true,
    opacity: 0.6
  });
  const lineSegments = new THREE.LineSegments(edges, lineMaterial);
  lineSegments.position.copy(position);
  group.add(lineSegments);
}

function addWindows(
  group: THREE.Group,
  floorIndex: number,
  config: BuildingConfig,
  windowMat: THREE.MeshStandardMaterial
): void {
  const windowWidth = 0.8;
  const windowHeight = 1.0;
  const windowOffset = 0.02;
  const windowsPerSide = Math.max(1, Math.floor(config.width / 2));

  const floorY = floorIndex * config.floorHeight + config.floorHeight * 0.55;

  for (let i = 0; i < windowsPerSide; i++) {
    const xSpacing = config.width / (windowsPerSide + 1);
    const xPos = -config.width / 2 + xSpacing * (i + 1);

    const frontWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowMat
    );
    frontWindow.position.set(xPos, floorY, config.depth / 2 + windowOffset);
    applyShadowProperties(frontWindow);
    group.add(frontWindow);

    const backWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowMat
    );
    backWindow.position.set(xPos, floorY, -config.depth / 2 - windowOffset);
    backWindow.rotation.y = Math.PI;
    applyShadowProperties(backWindow);
    group.add(backWindow);
  }

  const windowsPerDepth = Math.max(1, Math.floor(config.depth / 2));
  for (let i = 0; i < windowsPerDepth; i++) {
    const zSpacing = config.depth / (windowsPerDepth + 1);
    const zPos = -config.depth / 2 + zSpacing * (i + 1);

    const leftWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowMat
    );
    leftWindow.position.set(-config.width / 2 - windowOffset, floorY, zPos);
    leftWindow.rotation.y = -Math.PI / 2;
    applyShadowProperties(leftWindow);
    group.add(leftWindow);

    const rightWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowHeight),
      windowMat
    );
    rightWindow.position.set(config.width / 2 + windowOffset, floorY, zPos);
    rightWindow.rotation.y = Math.PI / 2;
    applyShadowProperties(rightWindow);
    group.add(rightWindow);
  }
}

function addGroundGrid(group: THREE.Group, config: BuildingConfig): void {
  const gridSize = 20;
  const gridDivisions = 20;
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xaaaaaa, 0xaaaaaa);
  const gridMaterial = gridHelper.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.3;
  gridHelper.position.y = -0.01;
  group.add(gridHelper);

  const circleRadius = Math.max(config.width, config.depth) * 1.2;
  const circleGeo = new THREE.RingGeometry(circleRadius - 0.05, circleRadius, 64);
  const circleMat = new THREE.MeshBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const circleMesh = new THREE.Mesh(circleGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = -0.01;
  group.add(circleMesh);
}

function addSurroundingObjects(group: THREE.Group, config: BuildingConfig, seed: number = 42): void {
  const pseudoRandom = (index: number): number => {
    const x = Math.sin(seed * 9301 + index * 49297 + 233280) * 49297;
    return x - Math.floor(x);
  };

  const count = 8;
  const minDist = Math.max(config.width, config.depth) * 0.9;
  const maxDist = Math.max(config.width, config.depth) * 2.5;

  const greenShades = [0x2d5a27, 0x3a7d32, 0x4a8c3f, 0x5a9b4e, 0x2e7d32, 0x388e3c, 0x43a047, 0x66bb6a];

  for (let i = 0; i < count; i++) {
    const angle = pseudoRandom(i) * Math.PI * 2;
    const dist = minDist + pseudoRandom(i + 100) * (maxDist - minDist);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const height = 0.5 + pseudoRandom(i + 200) * 1.5;
    const objectWidth = 0.4 + pseudoRandom(i + 300) * 0.6;
    const objectDepth = 0.4 + pseudoRandom(i + 400) * 0.6;
    const colorIndex = Math.floor(pseudoRandom(i + 500) * greenShades.length);
    const color = greenShades[colorIndex];

    const cubeGeo = new THREE.BoxGeometry(objectWidth, height, objectDepth);
    const cubeMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.02
    });
    const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    cubeMesh.position.set(x, height / 2, z);
    cubeMesh.castShadow = true;
    cubeMesh.receiveShadow = true;
    group.add(cubeMesh);
  }
}

export function generateBuilding(customConfig?: Partial<BuildingConfig>): THREE.Group {
  const config: BuildingConfig = { ...defaultBuildingConfig, ...customConfig };
  const buildingGroup = new THREE.Group();

  const wallMat = createWallMaterial(config.wallColor);
  const roofMat = createRoofMaterial(config.roofColor);
  const windowMat = createWindowMaterial(config.windowColor);

  const totalWallHeight = config.floors * config.floorHeight;

  const bodyGeometry = new THREE.BoxGeometry(config.width, totalWallHeight, config.depth);
  const bodyMesh = new THREE.Mesh(bodyGeometry, wallMat);
  bodyMesh.position.y = totalWallHeight / 2;
  applyShadowProperties(bodyMesh);
  buildingGroup.add(bodyMesh);

  addEdgeOutline(
    buildingGroup,
    bodyGeometry,
    new THREE.Vector3(0, totalWallHeight / 2, 0),
    0x5C4033
  );

  for (let i = 0; i < config.floors; i++) {
    addWindows(buildingGroup, i, config, windowMat);
  }

  const roofThickness = 0.15;
  const roofOverhang = 0.4;
  const roofGeo = new THREE.BoxGeometry(
    config.width + roofOverhang * 2,
    roofThickness,
    config.depth + roofOverhang * 2
  );
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.y = totalWallHeight + roofThickness / 2;
  applyShadowProperties(roofMesh);
  buildingGroup.add(roofMesh);

  addEdgeOutline(
    buildingGroup,
    roofGeo,
    new THREE.Vector3(0, totalWallHeight + roofThickness / 2, 0),
    0x666666
  );

  addGroundGrid(buildingGroup, config);

  addSurroundingObjects(buildingGroup, config);

  buildingGroup.position.y = 0;

  return buildingGroup;
}

export function generateBuildingCluster(config?: Partial<BuildingConfig>): THREE.Group {
  const clusterGroup = new THREE.Group();

  const mainBuilding = generateBuilding({
    ...defaultBuildingConfig,
    ...config
  });
  mainBuilding.position.set(0, 0, 0);
  clusterGroup.add(mainBuilding);

  const eastBuilding = generateBuilding({
    ...defaultBuildingConfig,
    floors: 2,
    width: 3.5,
    depth: 2.5,
    wallColor: 0x9B8365,
    ...config
  });
  eastBuilding.position.set(7, 0, -1.5);
  clusterGroup.add(eastBuilding);

  const southBuilding = generateBuilding({
    ...defaultBuildingConfig,
    floors: 2,
    floorHeight: 2.2,
    width: 3,
    depth: 2,
    wallColor: 0x7A6345,
    ...config
  });
  southBuilding.position.set(-2, 0, 6);
  clusterGroup.add(southBuilding);

  return clusterGroup;
}

export function createGround(size: number = 50): THREE.Mesh {
  const groundGeometry = new THREE.PlaneGeometry(size, size);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.95,
    metalness: 0.0
  });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.01;
  groundMesh.receiveShadow = true;
  return groundMesh;
}
