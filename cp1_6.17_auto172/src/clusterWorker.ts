import * as d3 from 'd3';
import type { ClusterResult, ClusterStat } from './main.js';

interface WorkerMessage {
  type: string;
  points?: Array<{ x: number; y: number; z: number }>;
  params?: {
    algorithm: 'kmeans' | 'dbscan';
    k?: number;
    epsilon?: number;
  };
  useBackend?: boolean;
  backendUrl?: string;
}

interface WorkerResponse {
  success: boolean;
  result?: ClusterResult;
  error?: string;
}

const ctx: Worker = self as unknown as Worker;

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function kmeansCluster(
  points: number[][],
  k: number,
  maxIter: number = 100
): { labels: number[]; centroids: number[][] } {
  const n = points.length;
  const dims = points[0].length;
  k = Math.min(k, n);

  const centroids: number[][] = [];
  const indicesUsed = new Set<number>();
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...points[firstIdx]]);
  indicesUsed.add(firstIdx);

  while (centroids.length < k) {
    const dists = new Float64Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      if (indicesUsed.has(i)) {
        dists[i] = 0;
        continue;
      }
      let minD = Infinity;
      for (const c of centroids) {
        const d = euclideanDist(points[i], c);
        if (d < minD) minD = d;
      }
      dists[i] = minD * minD;
      total += dists[i];
    }
    let r = Math.random() * total;
    let nextIdx = 0;
    for (let i = 0; i < n; i++) {
      if (indicesUsed.has(i)) continue;
      r -= dists[i];
      if (r <= 0) {
        nextIdx = i;
        break;
      }
      nextIdx = i;
    }
    centroids.push([...points[nextIdx]]);
    indicesUsed.add(nextIdx);
  }

  const labels = new Array(n).fill(0);
  let changed = true;
  let iter = 0;

  while (changed && iter < maxIter) {
    changed = false;
    iter++;

    for (let i = 0; i < n; i++) {
      let bestK = 0;
      let bestD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = euclideanDist(points[i], centroids[j]);
        if (d < bestD) {
          bestD = d;
          bestK = j;
        }
      }
      if (labels[i] !== bestK) {
        labels[i] = bestK;
        changed = true;
      }
    }

    const sums: number[][] = Array.from({ length: k }, () => new Array(dims).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      const lbl = labels[i];
      counts[lbl]++;
      for (let d = 0; d < dims; d++) {
        sums[lbl][d] += points[i][d];
      }
    }

    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[j][d] = sums[j][d] / counts[j];
        }
      }
    }
  }

  return { labels, centroids };
}

function dbscanCluster(
  points: number[][],
  epsilon: number,
  minPts: number = 4
): { labels: number[]; centroids: number[][] } {
  const n = points.length;
  const labels = new Array(n).fill(-1);
  let clusterId = 0;

  const distMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    distMatrix[i] = new Array(n);
    distMatrix[i][i] = 0;
    for (let j = i + 1; j < n; j++) {
      const d = euclideanDist(points[i], points[j]);
      distMatrix[i][j] = d;
      distMatrix[j][i] = d;
    }
  }

  const visited = new Set<number>();

  const regionQuery = (idx: number): number[] => {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (distMatrix[idx][i] <= epsilon) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  const expandCluster = (idx: number, neighbors: number[]): void => {
    labels[idx] = clusterId;
    const queue = [...neighbors];
    let head = 0;
    while (head < queue.length) {
      const p = queue[head++];
      if (!visited.has(p)) {
        visited.add(p);
        const pNeighbors = regionQuery(p);
        if (pNeighbors.length >= minPts) {
          for (const n of pNeighbors) {
            if (!queue.includes(n)) queue.push(n);
          }
        }
      }
      if (labels[p] === -1) {
        labels[p] = clusterId;
      }
    }
  };

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;
    visited.add(i);
    const neighbors = regionQuery(i);
    if (neighbors.length >= minPts) {
      expandCluster(i, neighbors);
      clusterId++;
    }
  }

  const dims = points[0].length;
  const centroids: number[][] = [];
  const clusterSums: number[][] = [];
  const clusterCounts: number[] = [];
  for (let i = 0; i < clusterId; i++) {
    clusterSums.push(new Array(dims).fill(0));
    clusterCounts.push(0);
  }
  for (let i = 0; i < n; i++) {
    const lbl = labels[i];
    if (lbl >= 0) {
      clusterCounts[lbl]++;
      for (let d = 0; d < dims; d++) {
        clusterSums[lbl][d] += points[i][d];
      }
    }
  }
  for (let i = 0; i < clusterId; i++) {
    if (clusterCounts[i] > 0) {
      centroids.push(clusterSums[i].map(v => v / clusterCounts[i]));
    } else {
      centroids.push(new Array(dims).fill(0));
    }
  }

  return { labels, centroids };
}

function computeStats(
  points: number[][],
  labels: number[],
  centroids: number[][]
): ClusterStat[] {
  const stats: ClusterStat[] = [];
  const labelGroups: Map<number, number[]> = new Map();

  for (let i = 0; i < labels.length; i++) {
    const lbl = labels[i];
    if (lbl < 0) continue;
    if (!labelGroups.has(lbl)) labelGroups.set(lbl, []);
    labelGroups.get(lbl)!.push(i);
  }

  const centroids3D: [number, number, number][] = centroids.map(c => {
    const dims = c.length;
    return [
      c[0] || 0,
      c[1] || 0,
      c[2] || 0
    ];
  });

  labelGroups.forEach((indices, label) => {
    if (label >= centroids.length) return;
    let totalDist = 0;
    for (const idx of indices) {
      totalDist += euclideanDist(points[idx], centroids[label]);
    }
    stats.push({
      label,
      count: indices.length,
      centroid: centroids3D[label],
      avgDistance: indices.length > 0 ? totalDist / indices.length : 0
    });
  });

  stats.sort((a, b) => a.label - b.label);
  return stats;
}

async function callBackend(
  points: number[][],
  params: WorkerMessage['params'],
  backendUrl: string
): Promise<ClusterResult> {
  const response = await fetch(`${backendUrl}/cluster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points,
      algorithm: params?.algorithm,
      k: params?.k,
      epsilon: params?.epsilon
    })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  const data = await response.json();
  return {
    labels: data.labels,
    centroids: data.centroids,
    stats: data.stats
  };
}

ctx.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;
  try {
    if (msg.type === 'compute' && msg.points && msg.params) {
      const pts = msg.points.map(p => [p.x, p.y, p.z]);

      let result: { labels: number[]; centroids: number[][] };

      if (msg.useBackend && msg.backendUrl) {
        try {
          const backendResult = await callBackend(pts, msg.params, msg.backendUrl);
          ctx.postMessage({
            success: true,
            result: backendResult
          } as WorkerResponse);
          return;
        } catch (e) {
          console.warn('Backend unavailable, falling back to client-side:', e);
        }
      }

      if (msg.params.algorithm === 'kmeans') {
        result = kmeansCluster(pts, msg.params.k || 3);
      } else {
        result = dbscanCluster(pts, msg.params.epsilon || 0.5);
      }

      const stats = computeStats(pts, result.labels, result.centroids);

      ctx.postMessage({
        success: true,
        result: {
          labels: result.labels,
          centroids: result.centroids,
          stats
        }
      } as WorkerResponse);
    }
  } catch (error) {
    ctx.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    } as WorkerResponse);
  }
});

export default {} as typeof Worker;
