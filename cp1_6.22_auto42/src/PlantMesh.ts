import * as THREE from 'three';
import type { BranchNode, PlantStructure } from './PlantSimulation';

export function createWoodTexture(baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(baseColor);
  const dark = base.clone().multiplyScalar(0.6);

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const noise = Math.sin(x * 0.05) * 0.5 + Math.sin(x * 0.12 + y * 0.03) * 0.3;
      const t = (noise + 1) * 0.5;
      const r = Math.floor(base.r * 255 * (1 - t * 0.5) + dark.r * 255 * t * 0.5);
      const g = Math.floor(base.g * 255 * (1 - t * 0.5) + dark.g * 255 * t * 0.5);
      const b = Math.floor(base.b * 255 * (1 - t * 0.5) + dark.b * 255 * t * 0.5);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

export function createLeafTexture(baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(baseColor);
  const light = base.clone().multiplyScalar(1.3);
  const vein = base.clone().multiplyScalar(0.7);

  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const dx = x - 64;
      const dy = y - 64;
      const dist = Math.sqrt((dx / 50) ** 2 + (dy / 30) ** 2);

      if (dist <= 1) {
        const veinDist = Math.abs(dy + Math.sin(x * 0.1) * 5);
        const t = dist * 0.6 + (veinDist < 3 ? 0.4 : 0);
        const r = Math.floor(light.r * 255 * (1 - t) + vein.r * 255 * t);
        const g = Math.floor(light.g * 255 * (1 - t) + vein.g * 255 * t);
        const b = Math.floor(light.b * 255 * (1 - t) + vein.b * 255 * t);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.8 - dist * 0.3})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createCheckerGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const lightGreen = '#98fb98';
  const darkGreen = '#2e7d32';
  const cellSize = 64;

  for (let y = 0; y < 512; y += cellSize) {
    for (let x = 0; x < 512; x += cellSize) {
      const isDark = ((x / cellSize) + (y / cellSize)) % 2 === 0;
      ctx.fillStyle = isDark ? darkGreen : lightGreen;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return texture;
}

export function createBranchMesh(
  node: BranchNode,
  woodTexture: THREE.Texture,
  trunkColor: string
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(node.endPos, node.startPos);
  let length = dir.length();

  if (length < 0.01) {
    length = 0.01;
  }

  const geometry = new THREE.CylinderGeometry(
    node.radius * 0.7,
    node.radius,
    length,
    8,
    1
  );

  const material = new THREE.MeshStandardMaterial({
    map: woodTexture,
    color: new THREE.Color(trunkColor),
    roughness: 0.85,
    metalness: 0.05
  });

  const mesh = new THREE.Mesh(geometry, material);

  const midPoint = new THREE.Vector3()
    .addVectors(node.startPos, node.endPos)
    .multiplyScalar(0.5);
  mesh.position.copy(midPoint);

  const up = new THREE.Vector3(0, 1, 0);
  const direction = dir.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
  mesh.quaternion.copy(quaternion);

  mesh.userData.nodeId = node.id;
  return mesh;
}

export function createLeafMesh(
  position: THREE.Vector3,
  leafTexture: THREE.Texture,
  leafColor: string
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.12, 8, 6);
  geometry.scale(1, 0.4, 1.4);

  const material = new THREE.MeshStandardMaterial({
    map: leafTexture,
    color: new THREE.Color(leafColor),
    transparent: true,
    opacity: 0.8,
    roughness: 0.6,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.rotation.x = (Math.random() - 0.5) * 0.5;

  return mesh;
}

export function createSeedMesh(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.3, 16, 12);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0.3, 0);
  return mesh;
}

export function createGroundMesh(): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(5, 48);
  const texture = createCheckerGroundTexture();
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  return mesh;
}

export function createSkyDome(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(50, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

export function updateBranchMesh(mesh: THREE.Mesh, node: BranchNode): void {
  const dir = new THREE.Vector3().subVectors(node.endPos, node.startPos);
  const length = dir.length();

  if (length < 0.01) return;

  mesh.scale.y = length / (mesh.geometry as THREE.CylinderGeometry).parameters.height;

  const midPoint = new THREE.Vector3()
    .addVectors(node.startPos, node.endPos)
    .multiplyScalar(0.5);
  mesh.position.copy(midPoint);

  const up = new THREE.Vector3(0, 1, 0);
  const direction = dir.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
  mesh.quaternion.copy(quaternion);
}

export function rebuildPlantMeshes(
  structure: PlantStructure,
  trunkColor: string,
  leafColor: string
): {
  branchGroup: THREE.Group;
  leafGroup: THREE.Group;
} {
  const woodTexture = createWoodTexture(trunkColor);
  const leafTexture = createLeafTexture(leafColor);

  const branchGroup = new THREE.Group();
  const leafGroup = new THREE.Group();

  structure.allNodes.forEach((node) => {
    if (node.depth > 0 || node.growthProgress > 0.01) {
      const branchMesh = createBranchMesh(node, woodTexture, trunkColor);
      branchGroup.add(branchMesh);
    }

    if (node.hasLeaves && node.growthProgress > 0.7) {
      node.leafPositions.forEach((pos) => {
        const leafMesh = createLeafMesh(pos, leafTexture, leafColor);
        leafGroup.add(leafMesh);
      });
    }
  });

  return { branchGroup, leafGroup };
}
