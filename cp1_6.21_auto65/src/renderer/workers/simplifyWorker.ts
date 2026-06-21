interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | null;
  vertexCount: number;
  faceCount: number;
}

interface SimplifyRequest {
  type: 'simplify';
  algorithm: 'edge-collapse' | 'vertex-clustering' | 'quadric-collapse';
  targetPercent: number;
  geometry: GeometryData;
  requestId: string;
}

interface SimplifyProgress {
  type: 'progress';
  requestId: string;
  progress: number;
}

interface SimplifyResponse {
  type: 'complete';
  requestId: string;
  geometry: GeometryData;
  elapsedMs: number;
}

interface WorkerMessage {
  data: SimplifyRequest;
}

class Vector3 {
  x: number; y: number; z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  add(v: Vector3): Vector3 {
    this.x += v.x; this.y += v.y; this.z += v.z; return this;
  }
  sub(v: Vector3): Vector3 {
    this.x -= v.x; this.y -= v.y; this.z -= v.z; return this;
  }
  multiplyScalar(s: number): Vector3 {
    this.x *= s; this.y *= s; this.z *= s; return this;
  }
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  length(): number {
    return Math.sqrt(this.lengthSq());
  }
  normalize(): Vector3 {
    const l = this.length() || 1;
    this.x /= l; this.y /= l; this.z /= l;
    return this;
  }
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
}

function getVertex(geom: GeometryData, idx: number): Vector3 {
  const i3 = idx * 3;
  return new Vector3(
    geom.positions[i3],
    geom.positions[i3 + 1],
    geom.positions[i3 + 2]
  );
}

function computeFaceNormal(
  geom: GeometryData,
  ia: number, ib: number, ic: number
): Vector3 {
  const va = getVertex(geom, ia);
  const vb = getVertex(geom, ib);
  const vc = getVertex(geom, ic);
  const ab = vb.clone().sub(va);
  const ac = vc.clone().sub(va);
  const n = new Vector3(
    ab.y * ac.z - ab.z * ac.y,
    ab.z * ac.x - ab.x * ac.z,
    ab.x * ac.y - ab.y * ac.x
  ).normalize();
  return n;
}

function simplifyEdgeCollapse(
  geom: GeometryData,
  targetPercent: number,
  onProgress: (p: number) => void
): GeometryData {
  const startTime = performance.now();
  const { positions, normals, indices } = geom;
  const vertexCount = geom.vertexCount;
  const faceCount = indices ? indices.length / 3 : vertexCount / 3;
  const targetFaceCount = Math.max(4, Math.floor(faceCount * (targetPercent / 100)));

  let faceList: number[][] = [];
  if (indices) {
    for (let f = 0; f < faceCount; f++) {
      faceList.push([indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]]);
    }
  } else {
    for (let f = 0; f < faceCount; f++) {
      faceList.push([f * 3, f * 3 + 1, f * 3 + 2]);
    }
  }

  const vertexFaces: Set<number>[] = Array.from(
    { length: vertexCount }, () => new Set()
  );
  for (let fi = 0; fi < faceList.length; fi++) {
    const [a, b, c] = faceList[fi];
    vertexFaces[a].add(fi);
    vertexFaces[b].add(fi);
    vertexFaces[c].add(fi);
  }

  const edgeSet = new Map<string, { v1: number; v2: number; cost: number }>();
  function addEdge(v1: number, v2: number, faces: number[]) {
    const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
    if (edgeSet.has(key)) return;
    let minCost = Infinity;
    for (const fi of faces) {
      if (fi === -1) continue;
      const [fa, fb, fc] = faceList[fi];
      const other = (fa === v1 || fa === v2) ? 0 : (fb === v1 || fb === v2) ? 1 : 2;
      let otherV = -1;
      if (other === 0) otherV = fa;
      else if (other === 1) otherV = fb;
      else otherV = fc;
      if (otherV === v1 || otherV === v2) {
        const n1 = computeFaceNormal(geom, faceList[fi][0], faceList[fi][1], faceList[fi][2]);
        for (const fi2 of faces) {
          if (fi2 === fi || fi2 === -1) continue;
          const n2 = computeFaceNormal(geom, faceList[fi2][0], faceList[fi2][1], faceList[fi2][2]);
          const dot = 1 - Math.abs(n1.dot(n2));
          if (dot < minCost) minCost = dot;
        }
      }
    }
    if (minCost === Infinity) {
      const va = getVertex(geom, v1);
      const vb = getVertex(geom, v2);
      minCost = va.clone().sub(vb).length() * 0.1;
    }
    edgeSet.set(key, { v1, v2, cost: minCost });
  }

  for (let fi = 0; fi < faceList.length; fi++) {
    const [a, b, c] = faceList[fi];
    const sharedFaces = Array.from(vertexFaces[a])
      .filter(x => vertexFaces[b].has(x));
    addEdge(a, b, sharedFaces.length > 0 ? sharedFaces : [-1]);
    const sharedFaces2 = Array.from(vertexFaces[b])
      .filter(x => vertexFaces[c].has(x));
    addEdge(b, c, sharedFaces2.length > 0 ? sharedFaces2 : [-1]);
    const sharedFaces3 = Array.from(vertexFaces[a])
      .filter(x => vertexFaces[c].has(x));
    addEdge(a, c, sharedFaces3.length > 0 ? sharedFaces3 : [-1]);
  }

  const removedFaces = new Set<number>();
  const removedVertices = new Set<number>();
  const vertexMap: Map<number, number> = new Map();

  let lastProgress = 0;
  let iterations = 0;

  while (
    (faceList.length - removedFaces.size) > targetFaceCount &&
    edgeSet.size > 0 &&
    iterations < 50000
  ) {
    iterations++;
    let minEdge: { key: string; v1: number; v2: number } | null = null;
    let minCost = Infinity;
    for (const [key, edge] of edgeSet) {
      if (removedVertices.has(edge.v1) || removedVertices.has(edge.v2)) continue;
      if (edge.cost < minCost) {
        minCost = edge.cost;
        minEdge = { key, v1: edge.v1, v2: edge.v2 };
      }
    }
    if (!minEdge) break;

    const { key, v1, v2 } = minEdge;
    edgeSet.delete(key);

    const va = getVertex(geom, v1);
    const vb = getVertex(geom, v2);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const midIdx = v1;

    const posIdx = midIdx * 3;
    positions[posIdx] = mid.x;
    positions[posIdx + 1] = mid.y;
    positions[posIdx + 2] = mid.z;

    removedVertices.add(v2);
    vertexMap.set(v2, midIdx);

    const facesA = Array.from(vertexFaces[v1]);
    const facesB = Array.from(vertexFaces[v2]);
    for (const fi of [...facesA, ...facesB]) {
      if (removedFaces.has(fi)) continue;
      let [fa, fb, fc] = faceList[fi];
      let hasV1 = fa === v1 || fb === v1 || fc === v1;
      let hasV2 = fa === v2 || fb === v2 || fc === v2;

      if (hasV2) {
        if (fa === v2) fa = midIdx;
        else if (fb === v2) fb = midIdx;
        else if (fc === v2) fc = midIdx;
        faceList[fi] = [fa, fb, fc];
        hasV2 = false;
        hasV1 = true;
      }

      if (fa === fb || fb === fc || fa === fc) {
        removedFaces.add(fi);
        vertexFaces[v1].delete(fi);
        vertexFaces[v2] && vertexFaces[v2].delete(fi);
      } else {
        if (!hasV1) {
          vertexFaces[v1].add(fi);
        }
      }
    }

    for (const fi of facesB) {
      if (removedFaces.has(fi)) continue;
      vertexFaces[v2].delete(fi);
    }

    for (const key of Array.from(edgeSet.keys())) {
      const e = edgeSet.get(key)!;
      if (removedVertices.has(e.v1) || removedVertices.has(e.v2)) {
        edgeSet.delete(key);
      }
    }

    const progress = 1 - (faceList.length - removedFaces.size - targetFaceCount) /
      Math.max(1, faceCount - targetFaceCount);
    const clampedProgress = Math.min(1, Math.max(0, progress));
    if (clampedProgress - lastProgress > 0.05 || clampedProgress === 1) {
      onProgress(clampedProgress);
      lastProgress = clampedProgress;
    }
  }

  const validFaces: number[] = [];
  const newIndices: number[] = [];
  const newVertexMap: Map<number, number> = new Map();
  let newVIdx = 0;

  for (let fi = 0; fi < faceList.length; fi++) {
    if (removedFaces.has(fi)) continue;
    let [fa, fb, fc] = faceList[fi];

    while (vertexMap.has(fa)) fa = vertexMap.get(fa)!;
    while (vertexMap.has(fb)) fb = vertexMap.get(fb)!;
    while (vertexMap.has(fc)) fc = vertexMap.get(fc)!;

    if (fa === fb || fb === fc || fa === fc) continue;

    if (!newVertexMap.has(fa)) {
      newVertexMap.set(fa, newVIdx++);
    }
    if (!newVertexMap.has(fb)) {
      newVertexMap.set(fb, newVIdx++);
    }
    if (!newVertexMap.has(fc)) {
      newVertexMap.set(fc, newVIdx++);
    }

    newIndices.push(newVertexMap.get(fa)!);
    newIndices.push(newVertexMap.get(fb)!);
    newIndices.push(newVertexMap.get(fc)!);
    validFaces.push(fi);
  }

  const newPositions = new Float32Array(newVIdx * 3);
  const newNormals = new Float32Array(newVIdx * 3);

  for (const [oldIdx, newIdx] of newVertexMap) {
    const src = oldIdx * 3;
    const dst = newIdx * 3;
    newPositions[dst] = positions[src];
    newPositions[dst + 1] = positions[src + 1];
    newPositions[dst + 2] = positions[src + 2];

    newNormals[dst] = normals[src];
    newNormals[dst + 1] = normals[src + 1];
    newNormals[dst + 2] = normals[src + 2];
  }

  const newFaceCount = newIndices.length / 3;
  for (let fi = 0; fi < newFaceCount; fi++) {
    const [ia, ib, ic] = [newIndices[fi * 3], newIndices[fi * 3 + 1], newIndices[fi * 3 + 2]];
    const va = new Vector3(newPositions[ia * 3], newPositions[ia * 3 + 1], newPositions[ia * 3 + 2]);
    const vb = new Vector3(newPositions[ib * 3], newPositions[ib * 3 + 1], newPositions[ib * 3 + 2]);
    const vc = new Vector3(newPositions[ic * 3], newPositions[ic * 3 + 1], newPositions[ic * 3 + 2]);
    const ab = vb.clone().sub(va);
    const ac = vc.clone().sub(va);
    const nx = ab.y * ac.z - ab.z * ac.y;
    const ny = ab.z * ac.x - ab.x * ac.z;
    const nz = ab.x * ac.y - ab.y * ac.x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const nxN = nx / len, nyN = ny / len, nzN = nz / len;

    for (const vidx of [ia, ib, ic]) {
      const dst = vidx * 3;
      newNormals[dst] = (newNormals[dst] + nxN) / 2;
      newNormals[dst + 1] = (newNormals[dst + 1] + nyN) / 2;
      newNormals[dst + 2] = (newNormals[dst + 2] + nzN) / 2;
    }
  }

  for (let i = 0; i < newVIdx; i++) {
    const dst = i * 3;
    const nl = Math.sqrt(
      newNormals[dst] ** 2 + newNormals[dst + 1] ** 2 + newNormals[dst + 2] ** 2
    ) || 1;
    newNormals[dst] /= nl;
    newNormals[dst + 1] /= nl;
    newNormals[dst + 2] /= nl;
  }

  onProgress(1);

  return {
    positions: newPositions,
    normals: newNormals,
    indices: new Uint32Array(newIndices),
    vertexCount: newVIdx,
    faceCount: newIndices.length / 3
  };
}

function simplifyVertexClustering(
  geom: GeometryData,
  targetPercent: number,
  onProgress: (p: number) => void
): GeometryData {
  const { positions, normals, indices } = geom;
  const vertexCount = geom.vertexCount;
  const faceCount = indices ? indices.length / 3 : vertexCount / 3;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    minX = Math.min(minX, positions[i3]);
    minY = Math.min(minY, positions[i3 + 1]);
    minZ = Math.min(minZ, positions[i3 + 2]);
    maxX = Math.max(maxX, positions[i3]);
    maxY = Math.max(maxY, positions[i3 + 1]);
    maxZ = Math.max(maxZ, positions[i3 + 2]);
  }

  const sizeX = maxX - minX || 1;
  const sizeY = maxY - minY || 1;
  const sizeZ = maxZ - minZ || 1;
  const targetVertexCount = Math.max(4, Math.floor(vertexCount * (targetPercent / 100)));
  const cellCount = Math.ceil(Math.pow(targetVertexCount, 1 / 3));

  const cellSizeX = sizeX / cellCount;
  const cellSizeY = sizeY / cellCount;
  const cellSizeZ = sizeZ / cellCount;

  const cellMap = new Map<string, {
    verts: number[];
    avgPos: Vector3;
    avgNormal: Vector3;
  }>();

  const cellForVertex: (string | null)[] = new Array(vertexCount).fill(null);

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    const cx = Math.min(cellCount - 1, Math.floor((positions[i3] - minX) / cellSizeX));
    const cy = Math.min(cellCount - 1, Math.floor((positions[i3 + 1] - minY) / cellSizeY));
    const cz = Math.min(cellCount - 1, Math.floor((positions[i3 + 2] - minZ) / cellSizeZ));
    const key = `${cx},${cy},${cz}`;

    cellForVertex[i] = key;

    if (!cellMap.has(key)) {
      cellMap.set(key, {
        verts: [],
        avgPos: new Vector3(0, 0, 0),
        avgNormal: new Vector3(0, 0, 0)
      });
    }
    const cell = cellMap.get(key)!;
    cell.verts.push(i);
    cell.avgPos.x += positions[i3];
    cell.avgPos.y += positions[i3 + 1];
    cell.avgPos.z += positions[i3 + 2];
    cell.avgNormal.x += normals[i3];
    cell.avgNormal.y += normals[i3 + 1];
    cell.avgNormal.z += normals[i3 + 2];

    if (i % Math.ceil(vertexCount / 20) === 0) {
      onProgress(0.3 * (i / vertexCount));
    }
  }

  const cellIndexMap = new Map<string, number>();
  let newVIdx = 0;
  const cells = Array.from(cellMap.values());
  const newPositions = new Float32Array(cells.length * 3);
  const newNormals = new Float32Array(cells.length * 3);

  for (const [key, cell] of cellMap) {
    const vCount = cell.verts.length;
    cell.avgPos.multiplyScalar(1 / vCount);
    cell.avgNormal.multiplyScalar(1 / vCount);
    const nl = cell.avgNormal.length() || 1;
    cell.avgNormal.multiplyScalar(1 / nl);

    const dst = newVIdx * 3;
    newPositions[dst] = cell.avgPos.x;
    newPositions[dst + 1] = cell.avgPos.y;
    newPositions[dst + 2] = cell.avgPos.z;
    newNormals[dst] = cell.avgNormal.x;
    newNormals[dst + 1] = cell.avgNormal.y;
    newNormals[dst + 2] = cell.avgNormal.z;

    cellIndexMap.set(key, newVIdx);
    newVIdx++;
  }

  onProgress(0.6);

  const newIndices: number[] = [];
  const seenFaces = new Set<string>();
  const totalFaces = indices ? indices.length / 3 : vertexCount / 3;

  for (let fi = 0; fi < totalFaces; fi++) {
    let ia, ib, ic;
    if (indices) {
      ia = indices[fi * 3];
      ib = indices[fi * 3 + 1];
      ic = indices[fi * 3 + 2];
    } else {
      ia = fi * 3;
      ib = fi * 3 + 1;
      ic = fi * 3 + 2;
    }

    const na = cellIndexMap.get(cellForVertex[ia] ?? '');
    const nb = cellIndexMap.get(cellForVertex[ib] ?? '');
    const nc = cellIndexMap.get(cellForVertex[ic] ?? '');

    if (na === undefined || nb === undefined || nc === undefined) continue;
    if (na === nb || nb === nc || na === nc) continue;

    const sorted = [na, nb, nc].sort((a, b) => a - b);
    const faceKey = `${sorted[0]},${sorted[1]},${sorted[2]}`;
    if (seenFaces.has(faceKey)) continue;
    seenFaces.add(faceKey);

    newIndices.push(na, nb, nc);

    if (fi % Math.ceil(totalFaces / 20) === 0) {
      onProgress(0.6 + 0.4 * (fi / totalFaces));
    }
  }

  onProgress(1);

  return {
    positions: newPositions,
    normals: newNormals,
    indices: new Uint32Array(newIndices),
    vertexCount: newVIdx,
    faceCount: newIndices.length / 3
  };
}

function simplifyQuadricCollapse(
  geom: GeometryData,
  targetPercent: number,
  onProgress: (p: number) => void
): GeometryData {
  const { positions, normals, indices } = geom;
  const vertexCount = geom.vertexCount;
  const faceCount = indices ? indices.length / 3 : vertexCount / 3;
  const targetFaceCount = Math.max(4, Math.floor(faceCount * (targetPercent / 100)));

  type Mat4 = number[];
  function zeroMat(): Mat4 {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  function addMat(a: Mat4, b: Mat4): Mat4 {
    const r = new Array(16);
    for (let i = 0; i < 16; i++) r[i] = a[i] + b[i];
    return r;
  }
  function computeError(q: Mat4, v: Vector3): number {
    const [a1, b1, c1, d1, b2, a2, c2, d2, c3, b3, a3, d3, d4, d5, d6, a4] = q;
    const x = v.x, y = v.y, z = v.z, w = 1;
    return (
      x * (a1 * x + b1 * y + c1 * z + d1 * w) +
      y * (b2 * x + a2 * y + c2 * z + d2 * w) +
      z * (c3 * x + b3 * y + a3 * z + d3 * w) +
      w * (d4 * x + d5 * y + d6 * z + a4 * w)
    );
  }

  const Q: Mat4[] = Array.from({ length: vertexCount }, zeroMat);

  for (let fi = 0; fi < faceCount; fi++) {
    let ia, ib, ic;
    if (indices) {
      ia = indices[fi * 3];
      ib = indices[fi * 3 + 1];
      ic = indices[fi * 3 + 2];
    } else {
      ia = fi * 3;
      ib = fi * 3 + 1;
      ic = fi * 3 + 2;
    }
    const n = computeFaceNormal(geom, ia, ib, ic);
    const va = getVertex(geom, ia);
    const a = n.x, b = n.y, c = n.z;
    const d = -(a * va.x + b * va.y + c * va.z);

    const kp: Mat4 = [
      a * a, a * b, a * c, a * d,
      b * a, b * b, b * c, b * d,
      c * a, c * b, c * c, c * d,
      d * a, d * b, d * c, d * d
    ];

    Q[ia] = addMat(Q[ia], kp);
    Q[ib] = addMat(Q[ib], kp);
    Q[ic] = addMat(Q[ic], kp);

    if (fi % Math.ceil(faceCount / 20) === 0) {
      onProgress(0.2 * (fi / faceCount));
    }
  }

  onProgress(0.25);

  let faceList: number[][] = [];
  if (indices) {
    for (let f = 0; f < faceCount; f++) {
      faceList.push([indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]]);
    }
  } else {
    for (let f = 0; f < faceCount; f++) {
      faceList.push([f * 3, f * 3 + 1, f * 3 + 2]);
    }
  }

  const edges: { v1: number; v2: number; cost: number; target: Vector3 }[] = [];
  const edgeMap = new Set<string>();

  for (let fi = 0; fi < faceList.length; fi++) {
    const [a, b, c] = faceList[fi];
    const pairs = [[a, b], [b, c], [a, c]];
    for (const [v1, v2] of pairs) {
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (edgeMap.has(key)) continue;
      edgeMap.add(key);

      const va = getVertex(geom, v1);
      const vb = getVertex(geom, v2);
      const mid = va.clone().add(vb).multiplyScalar(0.5);
      const q = addMat(Q[v1], Q[v2]);
      const cost = computeError(q, mid);

      edges.push({ v1, v2, cost, target: mid });
    }

    if (fi % Math.ceil(faceList.length / 20) === 0) {
      onProgress(0.25 + 0.25 * (fi / faceList.length));
    }
  }

  onProgress(0.5);

  const removedFaces = new Set<number>();
  const removedVertices = new Set<number>();

  let iterations = 0;
  let lastProgress = 0;

  while ((faceList.length - removedFaces.size) > targetFaceCount && iterations < 50000) {
    iterations++;

    let minEdge: typeof edges[0] | null = null;
    let minIdx = -1;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (removedVertices.has(e.v1) || removedVertices.has(e.v2)) continue;
      if (!minEdge || e.cost < minEdge.cost) {
        minEdge = e;
        minIdx = i;
      }
    }
    if (!minEdge) break;

    edges.splice(minIdx, 1);

    const { v1, v2, target } = minEdge;
    removedVertices.add(v2);

    const posIdx = v1 * 3;
    positions[posIdx] = target.x;
    positions[posIdx + 1] = target.y;
    positions[posIdx + 2] = target.z;
    Q[v1] = addMat(Q[v1], Q[v2]);

    for (let fi = 0; fi < faceList.length; fi++) {
      if (removedFaces.has(fi)) continue;
      let [fa, fb, fc] = faceList[fi];
      let hasV2 = fa === v2 || fb === v2 || fc === v2;

      if (hasV2) {
        if (fa === v2) fa = v1;
        else if (fb === v2) fb = v1;
        else if (fc === v2) fc = v1;
        faceList[fi] = [fa, fb, fc];
      }

      if (fa === fb || fb === fc || fa === fc) {
        removedFaces.add(fi);
      }
    }

    for (let i = edges.length - 1; i >= 0; i--) {
      const e = edges[i];
      if (removedVertices.has(e.v1) || removedVertices.has(e.v2)) {
        edges.splice(i, 1);
        continue;
      }
      if (e.v1 === v2) e.v1 = v1;
      if (e.v2 === v2) e.v2 = v1;
      if (e.v1 === e.v2) {
        edges.splice(i, 1);
        continue;
      }
      if (e.v1 > e.v2) {
        [e.v1, e.v2] = [e.v2, e.v1];
      }
    }

    const progress = 0.5 + 0.5 * (
      1 - (faceList.length - removedFaces.size - targetFaceCount) /
      Math.max(1, faceCount - targetFaceCount)
    );
    const clampedProgress = Math.min(1, Math.max(0, progress));
    if (clampedProgress - lastProgress > 0.05 || clampedProgress === 1) {
      onProgress(clampedProgress);
      lastProgress = clampedProgress;
    }
  }

  const newIndices: number[] = [];
  const newVertexMap: Map<number, number> = new Map();
  let newVIdx = 0;

  for (let fi = 0; fi < faceList.length; fi++) {
    if (removedFaces.has(fi)) continue;
    let [fa, fb, fc] = faceList[fi];
    if (fa === fb || fb === fc || fa === fc) continue;

    for (const oldV of [fa, fb, fc]) {
      if (!newVertexMap.has(oldV)) {
        newVertexMap.set(oldV, newVIdx++);
      }
    }

    newIndices.push(newVertexMap.get(fa)!);
    newIndices.push(newVertexMap.get(fb)!);
    newIndices.push(newVertexMap.get(fc)!);
  }

  const newPositions = new Float32Array(newVIdx * 3);
  const newNormals = new Float32Array(newVIdx * 3);

  for (const [oldIdx, newIdx] of newVertexMap) {
    const src = oldIdx * 3;
    const dst = newIdx * 3;
    newPositions[dst] = positions[src];
    newPositions[dst + 1] = positions[src + 1];
    newPositions[dst + 2] = positions[src + 2];

    newNormals[dst] = normals[src];
    newNormals[dst + 1] = normals[src + 1];
    newNormals[dst + 2] = normals[src + 2];
  }

  const newFaceCount = newIndices.length / 3;
  for (let fi = 0; fi < newFaceCount; fi++) {
    const [ia, ib, ic] = [
      newIndices[fi * 3], newIndices[fi * 3 + 1], newIndices[fi * 3 + 2]
    ];
    const va = new Vector3(newPositions[ia * 3], newPositions[ia * 3 + 1], newPositions[ia * 3 + 2]);
    const vb = new Vector3(newPositions[ib * 3], newPositions[ib * 3 + 1], newPositions[ib * 3 + 2]);
    const vc = new Vector3(newPositions[ic * 3], newPositions[ic * 3 + 1], newPositions[ic * 3 + 2]);
    const ab = vb.clone().sub(va);
    const ac = vc.clone().sub(va);
    const nx = ab.y * ac.z - ab.z * ac.y;
    const ny = ab.z * ac.x - ab.x * ac.z;
    const nz = ab.x * ac.y - ab.y * ac.x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const nxN = nx / len, nyN = ny / len, nzN = nz / len;
    for (const vidx of [ia, ib, ic]) {
      const dst = vidx * 3;
      newNormals[dst] = (newNormals[dst] + nxN) / 2;
      newNormals[dst + 1] = (newNormals[dst + 1] + nyN) / 2;
      newNormals[dst + 2] = (newNormals[dst + 2] + nzN) / 2;
    }
  }

  for (let i = 0; i < newVIdx; i++) {
    const dst = i * 3;
    const nl = Math.sqrt(
      newNormals[dst] ** 2 + newNormals[dst + 1] ** 2 + newNormals[dst + 2] ** 2
    ) || 1;
    newNormals[dst] /= nl;
    newNormals[dst + 1] /= nl;
    newNormals[dst + 2] /= nl;
  }

  onProgress(1);

  return {
    positions: newPositions,
    normals: newNormals,
    indices: new Uint32Array(newIndices),
    vertexCount: newVIdx,
    faceCount: newIndices.length / 3
  };
}

self.addEventListener('message', (event: WorkerMessage) => {
  const msg = event.data;
  if (msg.type !== 'simplify') return;

  const { algorithm, targetPercent, geometry, requestId } = msg;
  const startTime = performance.now();

  const progressCb = (progress: number) => {
    const progMsg: SimplifyProgress = {
      type: 'progress',
      requestId,
      progress
    };
    (self as unknown as Worker).postMessage(progMsg);
  };

  try {
    let result: GeometryData;
    switch (algorithm) {
      case 'edge-collapse':
        result = simplifyEdgeCollapse({ ...geometry,
          positions: new Float32Array(geometry.positions),
          normals: new Float32Array(geometry.normals),
          indices: geometry.indices ? new Uint32Array(geometry.indices) : null
        }, targetPercent, progressCb);
        break;
      case 'vertex-clustering':
        result = simplifyVertexClustering({ ...geometry,
          positions: new Float32Array(geometry.positions),
          normals: new Float32Array(geometry.normals),
          indices: geometry.indices ? new Uint32Array(geometry.indices) : null
        }, targetPercent, progressCb);
        break;
      case 'quadric-collapse':
        result = simplifyQuadricCollapse({ ...geometry,
          positions: new Float32Array(geometry.positions),
          normals: new Float32Array(geometry.normals),
          indices: geometry.indices ? new Uint32Array(geometry.indices) : null
        }, targetPercent, progressCb);
        break;
      default:
        result = simplifyEdgeCollapse({ ...geometry,
          positions: new Float32Array(geometry.positions),
          normals: new Float32Array(geometry.normals),
          indices: geometry.indices ? new Uint32Array(geometry.indices) : null
        }, targetPercent, progressCb);
    }

    const elapsed = performance.now() - startTime;
    const resp: SimplifyResponse = {
      type: 'complete',
      requestId,
      geometry: result,
      elapsedMs: elapsed
    };
    (self as unknown as Worker).postMessage(resp, [
      result.positions.buffer,
      result.normals.buffer,
      ...(result.indices ? [result.indices.buffer] : [])
    ]);
  } catch (err) {
    console.error('Simplification error:', err);
  }
});
