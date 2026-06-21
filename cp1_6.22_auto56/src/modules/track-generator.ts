import * as THREE from 'three';

export type TrackType = 'circle' | 'figure8' | 'mountain';

export interface TrackParams {
  radius: number;
  turns: number;
  width: number;
  trackType: TrackType;
}

export interface TrackData {
  centerline: THREE.Vector3[];
  leftEdge: THREE.Vector3[];
  rightEdge: THREE.Vector3[];
  geometry: THREE.BufferGeometry;
  startPosition: THREE.Vector3;
  startRotation: number;
}

function sampleCircle(radius: number, segments: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  return points;
}

function sampleFigure8(radius: number, segments: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.sin(t) * radius;
    const z = Math.sin(t * 2) * (radius * 0.5);
    points.push(new THREE.Vector3(x, 0, z));
  }
  return points;
}

function sampleMountain(radius: number, turns: number, segments: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r = radius + Math.sin(t * turns) * (radius * 0.3);
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;
    const y = Math.sin(t * 3) * 8 + Math.cos(t * 5) * 4;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function generateCenterline(params: TrackParams): THREE.Vector3[] {
  const segments = params.turns * 40;
  switch (params.trackType) {
    case 'circle':
      return sampleCircle(params.radius, segments);
    case 'figure8':
      return sampleFigure8(params.radius, segments);
    case 'mountain':
      return sampleMountain(params.radius, params.turns, segments);
  }
}

function computeEdges(
  centerline: THREE.Vector3[],
  width: number
): { leftEdge: THREE.Vector3[]; rightEdge: THREE.Vector3[] } {
  const leftEdge: THREE.Vector3[] = [];
  const rightEdge: THREE.Vector3[] = [];
  const halfWidth = width / 2;

  for (let i = 0; i < centerline.length; i++) {
    const p = centerline[i];
    const prev = centerline[(i - 1 + centerline.length) % centerline.length];
    const next = centerline[(i + 1) % centerline.length];

    const dir = new THREE.Vector3().subVectors(next, prev).normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    leftEdge.push(new THREE.Vector3().copy(p).addScaledVector(right, -halfWidth));
    rightEdge.push(new THREE.Vector3().copy(p).addScaledVector(right, halfWidth));
  }

  return { leftEdge, rightEdge };
}

function buildTrackGeometry(
  leftEdge: THREE.Vector3[],
  rightEdge: THREE.Vector3[],
  centerline: THREE.Vector3[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const segments = centerline.length - 1;
  let vertexIndex = 0;

  for (let i = 0; i < segments; i++) {
    const l0 = leftEdge[i];
    const r0 = rightEdge[i];
    const l1 = leftEdge[i + 1];
    const r1 = rightEdge[i + 1];

    positions.push(l0.x, l0.y, l0.z, r0.x, r0.y, r0.z, l1.x, l1.y, l1.z, r1.x, r1.y, r1.z);

    const n0 = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < 4; k++) {
      normals.push(n0.x, n0.y, n0.z);
    }

    uvs.push(0, i / segments, 1, i / segments, 0, (i + 1) / segments, 1, (i + 1) / segments);

    const base = vertexIndex;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);

    vertexIndex += 4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function generateTrack(params: TrackParams): TrackData {
  const centerline = generateCenterline(params);
  const { leftEdge, rightEdge } = computeEdges(centerline, params.width);
  const geometry = buildTrackGeometry(leftEdge, rightEdge, centerline);

  const startPosition = centerline[0].clone();
  const dir = new THREE.Vector3().subVectors(centerline[1], centerline[0]).normalize();
  const startRotation = Math.atan2(dir.x, dir.z);

  return {
    centerline,
    leftEdge,
    rightEdge,
    geometry,
    startPosition,
    startRotation
  };
}
