import * as THREE from 'three';

const GRID_SIZE = 40;
const HEIGHT_AMPLITUDE = 0.3;
const CAUSTIC_COUNT = 30;
const CAUSTIC_SPEED = 0.5;
const CAUSTIC_MIN_SIZE = 0.2;
const CAUSTIC_MAX_SIZE = 0.5;
const CAUSTIC_MIN_OPACITY = 0.4;
const CAUSTIC_MAX_OPACITY = 0.8;

export interface TerrainResult {
  mesh: THREE.Mesh;
  updateCaustics: (time: number, intensity: number) => void;
  getHeightAt: (x: number, z: number) => number;
}

function createTerrainGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    positions.setY(i, y + (Math.random() - 0.5) * HEIGHT_AMPLITUDE * 2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createTerrainMaterial(): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: 0x8B7D6B,
    shininess: 10,
    flatShading: false,
  });
}

function createCaustics(): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < CAUSTIC_COUNT; i++) {
    const size = CAUSTIC_MIN_SIZE + Math.random() * (CAUSTIC_MAX_SIZE - CAUSTIC_MIN_SIZE);
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x88CCFF,
      transparent: true,
      opacity: CAUSTIC_MIN_OPACITY + Math.random() * (CAUSTIC_MAX_OPACITY - CAUSTIC_MIN_OPACITY),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * GRID_SIZE,
      0.05 + Math.random() * 0.1,
      (Math.random() - 0.5) * GRID_SIZE,
    );
    mesh.userData = {
      baseX: mesh.position.x,
      baseZ: mesh.position.z,
      phaseX: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      speedX: 0.3 + Math.random() * 0.7,
      speedZ: 0.3 + Math.random() * 0.7,
      baseOpacity: material.opacity,
    };
    group.add(mesh);
  }
  return group;
}

export function createTerrain(): TerrainResult {
  const geometry = createTerrainGeometry();
  const material = createTerrainMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  const causticsGroup = createCaustics();
  mesh.add(causticsGroup);

  const heightData = new Float32Array(GRID_SIZE * GRID_SIZE);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    heightData[i] = positions.getY(i);
  }

  function getHeightAt(x: number, z: number): number {
    const halfSize = GRID_SIZE / 2;
    const col = Math.floor((x + halfSize) / GRID_SIZE * (GRID_SIZE - 1));
    const row = Math.floor((z + halfSize) / GRID_SIZE * (GRID_SIZE - 1));
    const clampedCol = Math.max(0, Math.min(GRID_SIZE - 1, col));
    const clampedRow = Math.max(0, Math.min(GRID_SIZE - 1, row));
    const index = clampedRow * GRID_SIZE + clampedCol;
    if (index >= 0 && index < heightData.length) {
      return heightData[index];
    }
    return 0;
  }

  function updateCaustics(time: number, intensity: number): void {
    causticsGroup.children.forEach((child, index) => {
      const data = child.userData;
      const t = time * CAUSTIC_SPEED;
      child.position.x = data.baseX + Math.sin(t * data.speedX + data.phaseX) * 2.0;
      child.position.z = data.baseZ + Math.cos(t * data.speedZ + data.phaseZ) * 2.0;
      const opacity = 0.4 + 0.4 * (Math.sin(time * 2 + index) * 0.5 + 0.5);
      (child as THREE.Mesh).material.opacity = opacity * intensity;
    });
    causticsGroup.visible = intensity > 0.01;
  }

  return { mesh, updateCaustics, getHeightAt };
}
