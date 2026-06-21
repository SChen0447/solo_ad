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
  const twists = Math.round(params.twist);
  const segmentsU = 160;
  const segmentsV = 28;
  const R = 2.0;
  const w = 0.55;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function mobiusPoint(u: number, v: number): THREE.Vector3 {
    const phi = twists * u / 2;
    const r = R + v * Math.cos(phi);
    return new THREE.Vector3(
      r * Math.cos(u),
      r * Math.sin(u),
      v * Math.sin(phi)
    );
  }

  for (let i = 0; i <= segmentsU; i++) {
    const u = (i / segmentsU) * Math.PI * 2;
    for (let j = 0; j <= segmentsV; j++) {
      const v = (j / segmentsV - 0.5) * w * 2;
      const p = mobiusPoint(u, v);
      positions.push(p.x, p.y, p.z);
      uvs.push(i / segmentsU, j / segmentsV);

      const eps = 1e-5;
      const pu = mobiusPoint(u + eps, v);
      const pv = mobiusPoint(u, v + eps);
      const du = new THREE.Vector3().subVectors(pu, p).normalize();
      const dv = new THREE.Vector3().subVectors(pv, p).normalize();
      const n = new THREE.Vector3().crossVectors(du, dv).normalize();
      normals.push(n.x, n.y, n.z);
    }
  }

  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const i1 = i;
      const i2 = i + 1;

      let j1a = j;
      let j2a = j + 1;
      let j1b = j;
      let j2b = j + 1;

      if (i === segmentsU - 1 && (twists % 2 === 1)) {
        j1b = segmentsV - j;
        j2b = segmentsV - j - 1;
      }

      const a = i1 * (segmentsV + 1) + j1a;
      const b = i2 * (segmentsV + 1) + j1b;
      const c = i1 * (segmentsV + 1) + j2a;
      const d = i2 * (segmentsV + 1) + j2b;

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
  const segmentsV = Math.max(8, Math.round(segments * 0.75));

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function kleinPoint(u: number, v: number): THREE.Vector3 {
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);

    let x: number, y: number, z: number;
    const s = 2 * (1 - cosU / 2);

    if (u < Math.PI) {
      x = 3 * cosU * (1 + sinU) + s * cosU * cosV;
      y = -8 * sinU - s * sinU * cosV;
    } else {
      x = 3 * cosU * (1 + sinU) + s * cosV;
      y = -8 * sinU;
    }
    z = -s * sinV;

    return new THREE.Vector3(x * 0.22, y * 0.22, z * 0.22);
  }

  for (let i = 0; i <= segmentsU; i++) {
    const u = (i / segmentsU) * Math.PI * 2;
    for (let j = 0; j <= segmentsV; j++) {
      const v = (j / segmentsV) * Math.PI * 2;
      const p = kleinPoint(u, v);
      positions.push(p.x, p.y, p.z);
      uvs.push(i / segmentsU, j / segmentsV);

      const eps = 1e-5;
      const pu = kleinPoint(u + eps, v);
      const pv = kleinPoint(u, v + eps);
      const du = new THREE.Vector3().subVectors(pu, p).normalize();
      const dv = new THREE.Vector3().subVectors(pv, p).normalize();
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

export function createHyperbolicGeometry(params: StructureParams): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  updateHyperbolicGeometry(geometry, params);
  return geometry;
}

interface HyperTriangle {
  v: [THREE.Vector2, THREE.Vector2, THREE.Vector2];
  depth: number;
  faceId: number;
}

function kleinToPoincare(p: THREE.Vector2): THREE.Vector2 {
  const r2 = p.x * p.x + p.y * p.y;
  if (r2 > 0.999) {
    const s = 0.999 / Math.sqrt(r2);
    return new THREE.Vector2(p.x * s, p.y * s);
  }
  const factor = 1 / (1 + Math.sqrt(1 - r2));
  return new THREE.Vector2(p.x * factor, p.y * factor);
}

function poincareToKlein(p: THREE.Vector2): THREE.Vector2 {
  const r2 = p.x * p.x + p.y * p.y;
  const factor = 2 / (1 + r2);
  return new THREE.Vector2(p.x * factor, p.y * factor);
}

function reflectKlein(p: THREE.Vector2, lineNormal: THREE.Vector2, lineDist: number): THREE.Vector2 {
  const num = lineNormal.x * p.x + lineNormal.y * p.y - lineDist;
  const den = lineNormal.x * lineNormal.x + lineNormal.y * lineNormal.y;
  const t = -2 * num / den;
  return new THREE.Vector2(
    p.x + t * lineNormal.x,
    p.y + t * lineNormal.y
  );
}

function getGeodesicCircle(p1: THREE.Vector2, p2: THREE.Vector2): { center: THREE.Vector2; radius: number; isDiameter: boolean } {
  const r1 = p1.length();
  const r2 = p2.length();

  if (r1 < 0.01 || r2 < 0.01) {
    return { center: new THREE.Vector2(0, 0), radius: 1, isDiameter: true };
  }

  const ra2 = r1 * r1;
  const rb2 = r2 * r2;

  const denom = p1.x * p2.y - p1.y * p2.x;
  if (Math.abs(denom) < 1e-8) {
    return { center: new THREE.Vector2(0, 0), radius: 1, isDiameter: true };
  }

  const cx = (p2.y * (ra2 + 1) / 2 - p1.y * (rb2 + 1) / 2) / denom;
  const cy = (p1.x * (rb2 + 1) / 2 - p2.x * (ra2 + 1) / 2) / denom;

  const center = new THREE.Vector2(cx, cy);
  const radius = center.distanceTo(p1);

  return { center, radius, isDiameter: false };
}

function reflectPoincare(p: THREE.Vector2, geo: { center: THREE.Vector2; radius: number; isDiameter: boolean }): THREE.Vector2 {
  if (geo.isDiameter) {
    const ang = Math.atan2(p.y, p.x);
    const lineAng = Math.atan2(geo.center.y, geo.center.x);
    if (geo.center.length() < 0.01) {
      const perp = new THREE.Vector2(-p.y, p.x);
      return p.clone();
    }
    const reflectAng = 2 * Math.atan2(geo.center.y, geo.center.x) - ang;
    const r = p.length();
    return new THREE.Vector2(r * Math.cos(reflectAng), r * Math.sin(reflectAng));
  }

  const dx = p.x - geo.center.x;
  const dy = p.y - geo.center.y;
  const distSq = dx * dx + dy * dy;
  if (distSq < 1e-10) return p.clone();

  const k = geo.radius * geo.radius / distSq;
  return new THREE.Vector2(
    geo.center.x + dx * k,
    geo.center.y + dy * k
  );
}

function edgeKey(a: THREE.Vector2, b: THREE.Vector2): string {
  const aStr = a.x.toFixed(5) + ',' + a.y.toFixed(5);
  const bStr = b.x.toFixed(5) + ',' + b.y.toFixed(5);
  return aStr < bStr ? aStr + '|' + bStr : bStr + '|' + aStr;
}

export function updateHyperbolicGeometry(geometry: THREE.BufferGeometry, params: StructureParams): void {
  const p = 7;
  const q = 3;
  const alpha = Math.PI / p;
  const beta = Math.PI / q;
  const gamma = Math.PI / 2;

  const cosh_c = (Math.cos(alpha) * Math.cos(beta)) / (Math.sin(alpha) * Math.sin(beta));
  const c_hyp = Math.acosh(cosh_c);
  const r_v_poincare = Math.tanh(c_hyp / 2);

  const cosh_b = Math.cos(beta) / Math.sin(alpha);
  const b_hyp = Math.acosh(cosh_b);
  const r_e_poincare = Math.tanh(b_hyp / 2);

  const vF = new THREE.Vector2(0, 0);
  const vV = new THREE.Vector2(r_v_poincare, 0);
  const vE = new THREE.Vector2(
    r_e_poincare * Math.cos(alpha),
    r_e_poincare * Math.sin(alpha)
  );

  const curvature = params.curvature;
  const diskRadius = 3.2 * curvature;
  const maxDepth = Math.max(2, Math.floor(4 + curvature * 2));

  const triangles: HyperTriangle[] = [];
  const queue: HyperTriangle[] = [];
  const seenEdges = new Set<string>();
  let faceCounter = 0;

  const initial: HyperTriangle = {
    v: [vF.clone(), vV.clone(), vE.clone()],
    depth: 0,
    faceId: 0,
  };
  queue.push(initial);

  while (queue.length > 0) {
    const tri = queue.shift()!;
    triangles.push(tri);

    for (let e = 0; e < 3; e++) {
      const e1 = e;
      const e2 = (e + 1) % 3;
      const vOther = (e + 2) % 3;

      const a = tri.v[e1];
      const b = tri.v[e2];
      const ek = edgeKey(a, b);

      if (seenEdges.has(ek)) continue;
      seenEdges.add(ek);

      if (tri.depth >= maxDepth) continue;

      const geo = getGeodesicCircle(a, b);
      const reflected = reflectPoincare(tri.v[vOther], geo);

      if (reflected.length() >= 0.98) continue;

      const newTri: HyperTriangle = {
        v: [
          a.clone(),
          b.clone(),
          reflected.clone(),
        ],
        depth: tri.depth + 1,
        faceId: ++faceCounter,
      };
      queue.push(newTri);
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  let vertIdx = 0;

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    let allInside = true;
    for (let k = 0; k < 3; k++) {
      if (tri.v[k].length() >= 0.99) {
        allInside = false;
        break;
      }
    }
    if (!allInside) continue;

    const depthGroup = tri.depth % 3;
    const hue = 0.65 + depthGroup * 0.08 + (tri.faceId % 7) * 0.01;
    const lightness = 0.28 + (tri.depth / maxDepth) * 0.3;
    const col = new THREE.Color().setHSL(hue, 0.6, lightness);

    for (let k = 0; k < 3; k++) {
      positions.push(tri.v[k].x * diskRadius, tri.v[k].y * diskRadius, 0);
      normals.push(0, 0, 1);
      uvs.push((tri.v[k].x + 1) * 0.5, (tri.v[k].y + 1) * 0.5);
      colors.push(col.r, col.g, col.b);
    }
    indices.push(vertIdx, vertIdx + 1, vertIdx + 2);
    vertIdx += 3;
  }

  const ringVerts = 160;
  const ringStartIdx = vertIdx;
  for (let i = 0; i <= ringVerts; i++) {
    const angle = (i / ringVerts) * Math.PI * 2;
    const rx = Math.cos(angle);
    const ry = Math.sin(angle);
    positions.push(rx * diskRadius, ry * diskRadius, 0.02);
    normals.push(0, 0, 1);
    uvs.push((rx + 1) * 0.5, (ry + 1) * 0.5);
    colors.push(0.45, 0.4, 1.0);
    vertIdx++;
  }
  for (let i = 0; i < ringVerts; i++) {
    indices.push(ringStartIdx + i, ringStartIdx + i + 1, ringStartIdx);
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
  geometry.computeVertexNormals();
}

export function getDefaultParams(): StructureParams {
  return { ...DEFAULT_PARAMS };
}

export function getVertexCount(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute('position');
  return pos ? pos.count : 0;
}

export function sampleGeodesicPath(
  type: StructureType,
  params: StructureParams,
  startU: number,
  startV: number,
  steps: number = 160
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];

  if (type === 'mobius') {
    const R = 2.0;
    const w = 0.55;
    const twists = Math.round(params.twist);

    const v0 = startV * w;

    const totalU = Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = startU * Math.PI * 2 + t * totalU;
      const phi = twists * u / 2;
      const r = R + v0 * Math.cos(phi);
      const x = r * Math.cos(u);
      const y = r * Math.sin(u);
      const z = v0 * Math.sin(phi);
      path.push(new THREE.Vector3(x, y, z));
    }
  } else if (type === 'klein') {
    const u0 = startU * Math.PI * 2;
    const v0 = startV * Math.PI * 2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = u0 + t * Math.PI * 2;
      const v = v0 + Math.sin(t * Math.PI) * 0.6;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);
      const s = 2 * (1 - cosU / 2);

      let x: number, y: number, z: number;
      if (u < Math.PI) {
        x = 3 * cosU * (1 + sinU) + s * cosU * cosV;
        y = -8 * sinU - s * sinU * cosV;
      } else {
        x = 3 * cosU * (1 + sinU) + s * cosV;
        y = -8 * sinU;
      }
      z = -s * sinV;
      path.push(new THREE.Vector3(x * 0.22, y * 0.22, z * 0.22));
    }
  } else {
    const diskRadius = 3.2 * params.curvature;

    const startAngle = startU * Math.PI * 2 - Math.PI / 2;
    const startR = 0.1 + Math.abs(startV) * 0.8;

    const endAngle = startAngle + Math.PI * 1.5;

    const midAngle = (startAngle + endAngle) / 2;
    const midR = 0.7 + Math.abs(startV) * 0.2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + (endAngle - startAngle) * t;
      const r = startR + (midR - startR) * Math.sin(t * Math.PI);

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const len = Math.sqrt(x * x + y * y);
      if (len >= 0.99) {
        const scale = 0.99 / len;
        path.push(new THREE.Vector3(x * scale * diskRadius, y * scale * diskRadius, 0.02));
      } else {
        path.push(new THREE.Vector3(x * diskRadius, y * diskRadius, 0.02));
      }
    }
  }

  return path;
}

export function getHyperbolicGeodesicPoints(
  start: THREE.Vector2,
  end: THREE.Vector2,
  steps: number = 120
): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];

  const r1 = start.length();
  const r2 = end.length();
  const th1 = Math.atan2(start.y, start.x);
  const th2 = Math.atan2(end.y, end.x);

  if (r1 < 0.02 || r2 < 0.02 || Math.abs(th1 - th2) < 0.01 || Math.abs(Math.abs(th1 - th2) - Math.PI) < 0.01) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new THREE.Vector2(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t
      ));
    }
    return points;
  }

  const invStart = new THREE.Vector2(start.x / (r1 * r1), start.y / (r1 * r1));
  const invEnd = new THREE.Vector2(end.x / (r2 * r2), end.y / (r2 * r2));

  const center = new THREE.Vector2();
  const denom = (start.x - invEnd.x) * (start.y - invStart.y) - (start.y - invEnd.y) * (start.x - invStart.x);

  if (Math.abs(denom) < 1e-6) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new THREE.Vector2(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t
      ));
    }
    return points;
  }

  const mx = (start.x + invStart.x) / 2;
  const my = (start.y + invStart.y) / 2;
  const dx1 = invStart.y - start.y;
  const dy1 = start.x - invStart.x;

  const mx2 = (end.x + invEnd.x) / 2;
  const my2 = (end.y + invEnd.y) / 2;
  const dx2 = invEnd.y - end.y;
  const dy2 = end.x - invEnd.x;

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-6) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new THREE.Vector2(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t
      ));
    }
    return points;
  }

  const t = ((mx2 - mx) * dy2 - (my2 - my) * dx2) / det;
  center.x = mx + t * dx1;
  center.y = my + t * dy1;

  const radius = center.distanceTo(start);

  const a1 = Math.atan2(start.y - center.y, start.x - center.x);
  const a2 = Math.atan2(end.y - center.y, end.x - center.x);

  let delta = a2 - a1;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = a1 + delta * t;
    const px = center.x + radius * Math.cos(angle);
    const py = center.y + radius * Math.sin(angle);
    const pl = Math.sqrt(px * px + py * py);
    if (pl > 0.99) {
      const scale = 0.99 / pl;
      points.push(new THREE.Vector2(px * scale, py * scale));
    } else {
      points.push(new THREE.Vector2(px, py));
    }
  }

  return points;
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
        'x(u,v) = (R + v·cos(tw·u/2))·cos(u)',
        'y(u,v) = (R + v·cos(tw·u/2))·sin(u)',
        'z(u,v) = v·sin(tw·u/2)',
        `u ∈ [0, 2π], v ∈ [−w, w]`,
        `tw = ${Math.round(params.twist)} (half-twists)`,
      ];
    case 'klein':
      return [
        'Klein bottle (Figure-8 immersion)',
        `u < π:`,
        `  x = 3cos(u)(1+sin(u)) + s·cos(u)cos(v)`,
        `  y = −8sin(u) − s·sin(u)cos(v)`,
        `u ≥ π:`,
        `  x = 3cos(u)(1+sin(u)) + s·cos(v)`,
        `  y = −8sin(u)`,
        `z = −s·sin(v), s = 2(1−cos(u)/2)`,
        `segments = ${Math.round(params.density)}`,
      ];
    case 'hyperbolic':
      return [
        'Poincaré disk: {7,3} tiling',
        'd(P,Q) = arcosh(1 + 2|P−Q|² /',
        '           ((1−|P|²)(1−|Q|²)))',
        'Geodesics: ⟂ circular arcs / diam.',
        `p = 7, q = 3`,
        `scale = ${params.curvature.toFixed(2)}`,
      ];
  }
}
