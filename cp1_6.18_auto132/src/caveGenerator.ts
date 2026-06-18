import * as THREE from 'three';
import type { CaveData, BranchNode, Stalactite, Stalagmite } from './stores/caveStore';

interface CaveParams {
  complexity: number;
  branchDensity: number;
  stalactiteDensity: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

function fbmNoise(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

function generateTunnelGeometry(
  path: THREE.Vector3[],
  radius: number,
  segments: number,
  radialSegments: number,
  rng: () => number
): THREE.BufferGeometry {
  if (path.length < 2) return new THREE.BufferGeometry();

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    let tangent: THREE.Vector3;
    if (i === 0) {
      tangent = path[1].clone().sub(path[0]).normalize();
    } else if (i === path.length - 1) {
      tangent = path[i].clone().sub(path[i - 1]).normalize();
    } else {
      tangent = path[i + 1].clone().sub(path[i - 1]).normalize();
    }

    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(tangent.dot(up)) > 0.99) {
      up = new THREE.Vector3(1, 0, 0);
    }
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    up = new THREE.Vector3().crossVectors(right, tangent).normalize();

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const noiseOffset = fbmNoise(
        Math.cos(theta) * 2 + i * 0.3,
        Math.sin(theta) * 2 + i * 0.3,
        3,
        42
      );
      const r = radius * (0.7 + 0.3 * noiseOffset);

      const nx = Math.cos(theta) * right.x + Math.sin(theta) * up.x;
      const ny = Math.cos(theta) * right.y + Math.sin(theta) * up.y;
      const nz = Math.cos(theta) * right.z + Math.sin(theta) * up.z;

      positions.push(
        point.x + nx * r,
        point.y + ny * r,
        point.z + nz * r
      );
      normals.push(nx, ny, nz);
      uvs.push(j / radialSegments, i / (path.length - 1));
    }
  }

  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (radialSegments + 1) + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function generateBranchPath(
  start: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  complexity: number,
  rng: () => number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [start.clone()];
  const segments = Math.max(4, Math.floor(length / 3));
  const segLength = length / segments;
  let currentDir = direction.clone().normalize();

  for (let i = 0; i < segments; i++) {
    const deviation = (rng() - 0.5) * complexity * 0.15;
    const yDeviation = (rng() - 0.5) * complexity * 0.08;

    const right = new THREE.Vector3(0, 1, 0).cross(currentDir).normalize();
    const up = new THREE.Vector3().crossVectors(currentDir, right).normalize();

    currentDir
      .add(right.multiplyScalar(deviation))
      .add(up.multiplyScalar(yDeviation))
      .normalize();

    const newPoint = points[points.length - 1].clone().add(
      currentDir.clone().multiplyScalar(segLength)
    );
    newPoint.y = Math.max(-20, Math.min(5, newPoint.y));
    points.push(newPoint);
  }
  return points;
}

export function generateCave(params: CaveParams): CaveData {
  const { complexity, branchDensity, stalactiteDensity } = params;
  const rng = seededRandom(42 + complexity * 100 + branchDensity * 10);
  const tunnelMeshes: THREE.BufferGeometry[] = [];
  const branchNodes: BranchNode[] = [];
  const stalactites: Stalactite[] = [];
  const stalagmites: Stalagmite[] = [];
  const tunnelPaths: THREE.Vector3[][] = [];

  const mainCount = 3 + Math.floor(complexity * 1.2);
  const baseDirections = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0.707, 0, 0.707),
    new THREE.Vector3(-0.707, 0, 0.707),
    new THREE.Vector3(0.707, 0, -0.707),
    new THREE.Vector3(-0.707, 0, -0.707),
  ];

  const origin = new THREE.Vector3(0, 0, 0);
  const mainPaths: THREE.Vector3[][] = [];

  for (let i = 0; i < mainCount; i++) {
    const dirIdx = i % baseDirections.length;
    const direction = baseDirections[dirIdx].clone();
    direction.y = -0.1 + rng() * 0.2;
    direction.normalize();

    const length = 40 + rng() * 40 * (complexity / 5);
    const path = generateBranchPath(origin, direction, length, complexity, rng);
    mainPaths.push(path);
    tunnelPaths.push(path);

    const geo = generateTunnelGeometry(path, 5 + rng() * 3, 16, 12, rng);
    tunnelMeshes.push(geo);

    const nodeInterval = Math.max(3, Math.floor(path.length / (2 + branchDensity * 0.5)));
    for (let j = nodeInterval; j < path.length - 1; j += nodeInterval) {
      const nodeId = `node_${branchNodes.length}`;
      branchNodes.push({
        position: path[j].clone(),
        id: nodeId,
        connections: [],
      });
    }
  }

  const subCount = Math.floor(mainCount * branchDensity * 0.6);
  for (let i = 0; i < subCount; i++) {
    const parentIdx = Math.floor(rng() * mainPaths.length);
    const parentPath = mainPaths[parentIdx];
    const startIdx = 1 + Math.floor(rng() * (parentPath.length - 2));
    const startPos = parentPath[startIdx].clone();

    const parentDir = parentPath[Math.min(startIdx + 1, parentPath.length - 1)]
      .clone()
      .sub(parentPath[Math.max(startIdx - 1, 0)])
      .normalize();

    const angle = (rng() - 0.5) * Math.PI * 0.8;
    const branchDir = new THREE.Vector3(
      parentDir.x * Math.cos(angle) - parentDir.z * Math.sin(angle),
      (rng() - 0.5) * 0.3,
      parentDir.x * Math.sin(angle) + parentDir.z * Math.cos(angle)
    ).normalize();

    const length = 15 + rng() * 30 * (complexity / 5);
    const subPath = generateBranchPath(startPos, branchDir, length, complexity * 0.8, rng);
    tunnelPaths.push(subPath);

    const radius = 3 + rng() * 2;
    const geo = generateTunnelGeometry(subPath, radius, 12, 10, rng);
    tunnelMeshes.push(geo);

    const isDeadEnd = rng() > 0.4;
    if (isDeadEnd) {
      const endNode = subPath[subPath.length - 1];
      branchNodes.push({
        position: endNode.clone(),
        id: `deadend_${i}`,
        connections: [],
      });
    } else {
      const midIdx = Math.floor(subPath.length * 0.5);
      const nodeId = `subnode_${i}`;
      branchNodes.push({
        position: subPath[midIdx].clone(),
        id: nodeId,
        connections: [],
      });
    }
  }

  for (const path of tunnelPaths) {
    for (let i = 0; i < path.length; i++) {
      if (rng() * 100 < stalactiteDensity) {
        const p = path[i].clone();
        p.y += 4 + rng() * 2;
        stalactites.push({
          position: p,
          length: 10 + rng() * 20,
          radius: 0.5 + rng() * 1.5,
        });
      }
      if (rng() * 100 < stalactiteDensity * 0.7) {
        const p = path[i].clone();
        p.y -= 4 + rng() * 1;
        stalagmites.push({
          position: p,
          height: 5 + rng() * 10,
          radius: 0.5 + rng() * 1.2,
        });
      }
    }
  }

  for (let i = 0; i < branchNodes.length; i++) {
    for (let j = i + 1; j < branchNodes.length; j++) {
      const dist = branchNodes[i].position.distanceTo(branchNodes[j].position);
      if (dist < 25) {
        branchNodes[i].connections.push(branchNodes[j].id);
        branchNodes[j].connections.push(branchNodes[i].id);
      }
    }
  }

  return {
    tunnelMeshes,
    branchNodes,
    stalactites,
    stalagmites,
    tunnelPaths,
  };
}
