import * as THREE from 'three';

export type StructureType = 'mobius' | 'klein' | 'hyperbolic';

export interface StructureParams {
  twist: number;
  density: number;
  curvature: number;
}

const DEFAULT_PARAMS: StructureParams = {
  twist: 1,
  density: 48,
  curvature: 1.0,
};

export function createMobiusGeometry(params: StructureParams): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  updateMobiusGeometry(geometry, params);
  return geometry;
}

export function updateMobiusGeometry(geometry: THREE.BufferGeometry, params: StructureParams): void {
  const twists = params.twist;
  const segmentsU = 128;
  const segmentsV = 24;
  const R = 2.0;
  const w = 0.6;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentsU; i++) {
    const u = (i / segmentsU) * Math.PI * 2;
    for (let j = 0; j <= segmentsV; j++) {
      const v = (j / segmentsV - 0.5) * w * 2;

      const halfTwist = twists * u / 2;
      const x = (R + v * Math.cos(halfTwist)) * Math.cos(u);
      const y = (R + v * Math.cos(halfTwist)) * Math.sin(u);
      const z = v * Math.sin(halfTwist);

      positions.push(x, y, z);
      uvs.push(i / segmentsU, j / segmentsV);

      const eps = 0.001;
      const u2 = u + eps;
      const v2 = v + eps;

      const ht2 = twists * u2 / 2;
      const x2 = (R + v * Math.cos(ht2)) * Math.cos(u2);
      const y2 = (R + v * Math.cos(ht2)) * Math.sin(u2);
      const z2 = v * Math.sin(ht2);

      const ht3 = twists * u / 2;
      const x3 = (R + v2 * Math.cos(ht3)) * Math.cos(u);
      const y3 = (R + v2 * Math.cos(ht3)) * Math.sin(u);
      const z3 = v2 * Math.sin(ht3);

      const du = new THREE.Vector3(x2 - x, y2 - y, z2 - z).normalize();
      const dv = new THREE.Vector3(x3 - x, y3 - y, z3 - z).normalize();
      const n = new THREE.Vector3().crossVectors(du, dv).normalize();
      normals.push(n.x, n.y, n.z);
    }
  }

  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const a = i * (segmentsV + 1) + j;
      const b = a + segmentsV + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}

export function createKleinGeometry(params: StructureParams): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  updateKleinGeometry(geometry, params);
  return geometry;
}

export function updateKleinGeometry(geometry: THREE.BufferGeometry, params: StructureParams): void {
  const segments = Math.round(params.density);
  const segmentsU = segments;
  const segmentsV = segments;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const a = 3.0;

  for (let i = 0; i <= segmentsU; i++) {
    const u = (i / segmentsU) * Math.PI * 2;
    for (let j = 0; j <= segmentsV; j++) {
      const v = (j / segmentsV) * Math.PI * 2;

      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      let x: number, y: number, z: number;

      if (u < Math.PI) {
        x = 3 * cosU * (1 + sinU) + (2 * (1 - cosU / 2)) * cosU * cosV;
        y = -8 * sinU - 2 * (1 - cosU / 2) * sinU * cosV;
      } else {
        x = 3 * cosU * (1 + sinU) + (2 * (1 - cosU / 2)) * cosV;
        y = -8 * sinU;
      }
      z = -2 * (1 - cosU / 2) * sinV;

      positions.push(x * 0.25, y * 0.25, z * 0.25);
      uvs.push(i / segmentsU, j / segmentsV);

      const eps = 0.001;
      const u2 = u + eps;
      const v2 = v + eps;

      const cosU2 = Math.cos(u2);
      const sinU2 = Math.sin(u2);

      let x2: number, y2: number, z2: number;
      if (u2 < Math.PI) {
        x2 = 3 * cosU2 * (1 + sinU2) + (2 * (1 - cosU2 / 2)) * cosU2 * Math.cos(v);
        y2 = -8 * sinU2 - 2 * (1 - cosU2 / 2) * sinU2 * Math.cos(v);
      } else {
        x2 = 3 * cosU2 * (1 + sinU2) + (2 * (1 - cosU2 / 2)) * Math.cos(v);
        y2 = -8 * sinU2;
      }
      z2 = -2 * (1 - cosU2 / 2) * Math.sin(v);

      let x3: number, y3: number, z3: number;
      if (u < Math.PI) {
        x3 = 3 * cosU * (1 + sinU) + (2 * (1 - cosU / 2)) * cosU * Math.cos(v2);
        y3 = -8 * sinU - 2 * (1 - cosU / 2) * sinU * Math.cos(v2);
      } else {
        x3 = 3 * cosU * (1 + sinU) + (2 * (1 - cosU / 2)) * Math.cos(v2);
        y3 = -8 * sinU;
      }
      z3 = -2 * (1 - cosU / 2) * Math.sin(v2);

      const du = new THREE.Vector3(
        (x2 - x) * 0.25, (y2 - y) * 0.25, (z2 - z) * 0.25
      ).normalize();
      const dv = new THREE.Vector3(
        (x3 - x) * 0.25, (y3 - y) * 0.25, (z3 - z) * 0.25
      ).normalize();
      const n = new THREE.Vector3().crossVectors(du, dv).normalize();
      normals.push(n.x, n.y, n.z);
    }
  }

  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const idx = i * (segmentsV + 1) + j;
      const idx2 = idx + segmentsV + 1;
      indices.push(idx, idx2, idx + 1);
      indices.push(idx + 1, idx2, idx2 + 1);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}

export function createHyperbolicGeometry(params: StructureParams): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  updateHyperbolicGeometry(geometry, params);
  return geometry;
}

export function updateHyperbolicGeometry(geometry: THREE.BufferGeometry, params: StructureParams): void {
  const curvature = params.curvature;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const p = 7;
  const q = 3;
  const maxDepth = 3;

  const cosAlpha = Math.cos(Math.PI / p);
  const sinAlpha = Math.sin(Math.PI / p);
  const cosBeta = Math.cos(Math.PI / q);
  const sinBeta = Math.sin(Math.PI / q);

  const s = Math.sqrt(
    (Math.cos(Math.PI / p + Math.PI / q) * Math.cos(Math.PI / p + Math.PI / q)) /
    (Math.sin(Math.PI / p) * Math.sin(Math.PI / p) * Math.sin(Math.PI / q) * Math.sin(Math.PI / q) -
     Math.cos(Math.PI / p + Math.PI / q) * Math.cos(Math.PI / p + Math.PI / q))
  );

  const r0 = s * sinBeta;
  const d0 = s * cosBeta;

  const diskRadius = 3.5 * curvature;

  const vertices: THREE.Vector2[] = [];

  function toPoincareDisk(v: THREE.Vector2): THREE.Vector2 {
    const len = v.length();
    if (len < 0.0001) return new THREE.Vector2(0, 0);
    const poincareLen = len / (1 + len);
    return v.clone().normalize().multiplyScalar(poincareLen * diskRadius);
  }

  function addTriangle(v0: THREE.Vector2, v1: THREE.Vector2, v2: THREE.Vector2, depth: number): void {
    const p0 = toPoincareDisk(v0);
    const p1 = toPoincareDisk(v1);
    const p2 = toPoincareDisk(v2);

    const baseIdx = vertices.length / 2;
    vertices.push(p0, p1, p2);

    const h = (depth % 3) / 3;
    const c = new THREE.Color().setHSL(0.6 + h * 0.3, 0.7, 0.35 + depth * 0.08);

    for (let k = 0; k < 3; k++) {
      colors.push(c.r, c.g, c.b);
      normals.push(0, 0, 1);
      uvs.push(0, 0);
    }

    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
  }

  function reflectPoint(point: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return point.clone();
    const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2;
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return new THREE.Vector2(2 * projX - point.x, 2 * projY - point.y);
  }

  function generateTiling(center: THREE.Vector2, vertices_local: THREE.Vector2[], depth: number, visited: Set<string>): void {
    if (depth > maxDepth) return;

    for (let i = 0; i < vertices_local.length; i++) {
      for (let j = i + 1; j < vertices_local.length; j++) {
        if (Math.abs(i - j) !== 1 && Math.abs(i - j) !== vertices_local.length - 1) continue;

        const edgeKey = [vertices_local[i].x.toFixed(3), vertices_local[i].y.toFixed(3),
          vertices_local[j].x.toFixed(3), vertices_local[j].y.toFixed(3)].sort().join('|');
        if (visited.has(edgeKey)) continue;
        visited.add(edgeKey);

        const reflected = reflectPoint(center, vertices_local[i], vertices_local[j]);

        const newVerts: THREE.Vector2[] = [];
        for (let k = 0; k < vertices_local.length; k++) {
          if (k === i || k === j) {
            newVerts.push(vertices_local[k].clone());
          } else {
            newVerts.push(reflectPoint(vertices_local[k], vertices_local[i], vertices_local[j]));
          }
        }

        addTriangle(reflected, vertices_local[i], vertices_local[j], depth);
        generateTiling(reflected, newVerts, depth + 1, visited);
      }
    }
  }

  const centerVerts: THREE.Vector2[] = [];
  for (let i = 0; i < p; i++) {
    const angle = (2 * Math.PI * i) / p;
    centerVerts.push(new THREE.Vector2(r0 * Math.cos(angle), r0 * Math.sin(angle)));
  }

  const origin = new THREE.Vector2(d0, 0);
  for (let i = 0; i < p; i++) {
    const next = (i + 1) % p;
    addTriangle(origin, centerVerts[i], centerVerts[next], 0);
  }

  const visited = new Set<string>();
  generateTiling(origin, centerVerts, 1, visited);

  for (let i = 0; i < vertices.length; i++) {
    positions.push(vertices[i].x, vertices[i].y, 0);
  }

  const ringPositions: number[] = [];
  const ringNormals: number[] = [];
  const ringUvs: number[] = [];
  const ringIndices: number[] = [];
  const ringSegments = 128;

  for (let i = 0; i <= ringSegments; i++) {
    const angle = (i / ringSegments) * Math.PI * 2;
    ringPositions.push(Math.cos(angle) * diskRadius, Math.sin(angle) * diskRadius, 0);
    ringNormals.push(0, 0, 1);
    ringUvs.push(i / ringSegments, 0);
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

export function createStructure(
  type: StructureType,
  params: StructureParams
): THREE.BufferGeometry {
  switch (type) {
    case 'mobius':
      return createMobiusGeometry(params);
    case 'klein':
      return createKleinGeometry(params);
    case 'hyperbolic':
      return createHyperbolicGeometry(params);
  }
}

export function updateStructure(
  geometry: THREE.BufferGeometry,
  type: StructureType,
  params: StructureParams
): void {
  switch (type) {
    case 'mobius':
      updateMobiusGeometry(geometry, params);
      break;
    case 'klein':
      updateKleinGeometry(geometry, params);
      break;
    case 'hyperbolic':
      updateHyperbolicGeometry(geometry, params);
      break;
  }
}

export function getDefaultParams(): StructureParams {
  return { ...DEFAULT_PARAMS };
}

export function getVertexCount(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute('position');
  return pos ? pos.count : 0;
}

export function sampleGeodesicPath(
  geometry: THREE.BufferGeometry,
  type: StructureType,
  params: StructureParams,
  startU: number,
  startV: number,
  steps: number = 80
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];

  if (type === 'mobius') {
    const R = 2.0;
    const w = 0.6;
    const twists = params.twist;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = startU + t * Math.PI * 2;
      const v = startV + Math.sin(t * Math.PI * 4) * 0.15;
      const halfTwist = twists * u / 2;
      const x = (R + v * Math.cos(halfTwist)) * Math.cos(u);
      const y = (R + v * Math.cos(halfTwist)) * Math.sin(u);
      const z = v * Math.sin(halfTwist);
      path.push(new THREE.Vector3(x, y, z));
    }
  } else if (type === 'klein') {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = startU * Math.PI * 2 + t * Math.PI * 1.5;
      const v = startV * Math.PI * 2 + Math.sin(t * Math.PI * 3) * 0.5;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);
      let x: number, y: number, z: number;
      if (u < Math.PI) {
        x = 3 * cosU * (1 + sinU) + (2 * (1 - cosU / 2)) * cosU * cosV;
        y = -8 * sinU - 2 * (1 - cosU / 2) * sinU * cosV;
      } else {
        x = 3 * cosU * (1 + sinU) + (2 * (1 - cosU / 2)) * cosV;
        y = -8 * sinU;
      }
      z = -2 * (1 - cosU / 2) * sinV;
      path.push(new THREE.Vector3(x * 0.25, y * 0.25, z * 0.25));
    }
  } else {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startU * Math.PI * 2 + t * Math.PI * 2;
      const radius = 0.2 + t * 0.8;
      const diskR = 3.5 * params.curvature;
      const poincareR = (radius / (1 + radius)) * diskR;
      path.push(new THREE.Vector3(
        Math.cos(angle) * poincareR,
        Math.sin(angle) * poincareR,
        0
      ));
    }
  }

  return path;
}

export function morphGeometries(
  source: THREE.BufferGeometry,
  target: THREE.BufferGeometry,
  t: number
): THREE.BufferGeometry {
  const result = new THREE.BufferGeometry();
  const srcPos = source.getAttribute('position') as THREE.BufferAttribute;
  const tgtPos = target.getAttribute('position') as THREE.BufferAttribute;
  const srcNorm = source.getAttribute('normal') as THREE.BufferAttribute;
  const tgtNorm = target.getAttribute('normal') as THREE.BufferAttribute;

  const maxCount = Math.max(srcPos.count, tgtPos.count);
  const positions = new Float32Array(maxCount * 3);
  const normals = new Float32Array(maxCount * 3);
  const uvs = new Float32Array(maxCount * 2);

  for (let i = 0; i < maxCount; i++) {
    for (let j = 0; j < 3; j++) {
      const sv = i < srcPos.count ? srcPos.array[i * 3 + j] : 0;
      const tv = i < tgtPos.count ? tgtPos.array[i * 3 + j] : 0;
      positions[i * 3 + j] = sv + (tv - sv) * t;

      const sn = i < srcNorm.count ? srcNorm.array[i * 3 + j] : 0;
      const tn = i < tgtNorm.count ? tgtNorm.array[i * 3 + j] : 0;
      normals[i * 3 + j] = sn + (tn - sn) * t;
    }
    uvs[i * 2] = i < srcPos.count ? (source.getAttribute('uv') as THREE.BufferAttribute).array[i * 2] : 0;
    uvs[i * 2 + 1] = i < srcPos.count ? (source.getAttribute('uv') as THREE.BufferAttribute).array[i * 2 + 1] : 0;
  }

  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  result.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  const srcIdx = source.getIndex();
  if (srcIdx) {
    result.setIndex(srcIdx.clone());
  }

  return result;
}

export function getEquations(type: StructureType, params: StructureParams): string[] {
  switch (type) {
    case 'mobius':
      return [
        `x = (R + v·cos(${params.twist}u/2))·cos(u)`,
        `y = (R + v·cos(${params.twist}u/2))·sin(u)`,
        `z = v·sin(${params.twist}u/2)`,
        `u ∈ [0, 2π], v ∈ [-w, w]`,
        `twists = ${params.twist}`,
      ];
    case 'klein':
      return [
        `u < π:`,
        `  x = 3cos(u)(1+sin(u)) + 2(1-cos(u)/2)cos(u)cos(v)`,
        `  y = -8sin(u) - 2(1-cos(u)/2)sin(u)cos(v)`,
        `u ≥ π:`,
        `  x = 3cos(u)(1+sin(u)) + 2(1-cos(u)/2)cos(v)`,
        `  y = -8sin(u)`,
        `z = -2(1-cos(u)/2)sin(v)`,
        `segments = ${Math.round(params.density)}`,
      ];
    case 'hyperbolic':
      return [
        `Poincaré disk: {7,3} tiling`,
        `d(P,Q) = arcosh(1 + 2|P-Q|²/((1-|P|²)(1-|Q|²)))`,
        `p = 7, q = 3`,
        `curvature scale = ${params.curvature.toFixed(2)}`,
      ];
  }
}
