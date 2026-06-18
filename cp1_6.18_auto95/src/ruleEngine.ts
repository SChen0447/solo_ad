import { Particle, ParticleType, Rule, PARTICLE_TYPES } from './particle';

export type RuleMatrix = Rule[][];

const INTERACTION_RADIUS = 110;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
const REPEL_RADIUS = 22;
const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
const FORCE_SCALE = 0.045;
const FOLLOW_SCALE = 0.02;
const GRID_CELL = INTERACTION_RADIUS;

export function createDefaultRuleMatrix(): RuleMatrix {
  const n = PARTICLE_TYPES.length;
  const m: RuleMatrix = [];
  for (let i = 0; i < n; i++) {
    m[i] = [];
    for (let j = 0; j < n; j++) m[i][j] = 'ignore';
  }
  return m;
}

export function cloneRuleMatrix(m: RuleMatrix): RuleMatrix {
  return m.map(row => row.slice());
}

export function typeToIndex(t: ParticleType): number {
  const i = PARTICLE_TYPES.indexOf(t);
  return i < 0 ? 0 : i;
}

export function indexToType(i: number): ParticleType {
  return PARTICLE_TYPES[Math.max(0, Math.min(PARTICLE_TYPES.length - 1, i))];
}

interface GridBucket {
  entries: Array<{ idx: number; typeIdx: number; x: number; y: number; vx: number; vy: number }>;
}

function _allocGrid(cols: number, rows: number): GridBucket[][] {
  const g: GridBucket[][] = new Array(cols);
  for (let cx = 0; cx < cols; cx++) {
    g[cx] = new Array(rows);
    for (let cy = 0; cy < rows; cy++) {
      g[cx][cy] = { entries: [] };
    }
  }
  return g;
}

export function computeForces(
  particles: Particle[],
  ruleMatrix: RuleMatrix,
  bounds: { w: number; h: number },
  followEnabled: boolean
): Array<{ fx: number; fy: number }> {
  const n = particles.length;
  const result: Array<{ fx: number; fy: number }> = new Array(n);
  for (let i = 0; i < n; i++) result[i] = { fx: 0, fy: 0 };
  if (n < 2) return result;

  const cols = Math.max(1, Math.ceil(bounds.w / GRID_CELL));
  const rows = Math.max(1, Math.ceil(bounds.h / GRID_CELL));

  const grid = _allocGrid(cols, rows);
  const typeIdxs = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    if (p.dying) { typeIdxs[i] = -1; continue; }
    const ti = typeToIndex(p.type);
    typeIdxs[i] = ti;
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(p.x / GRID_CELL)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor(p.y / GRID_CELL)));
    grid[cx][cy].entries.push({ idx: i, typeIdx: ti, x: p.x, y: p.y, vx: p.vx, vy: p.vy });
  }

  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const bucket = grid[cx][cy];
      if (bucket.entries.length === 0) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        if (nx < 0 || nx >= cols) continue;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= rows) continue;
          const other = grid[nx][ny];
          if (other.entries.length === 0) continue;
          _interactBuckets(bucket, other, cx === nx && cy === dy, ruleMatrix, followEnabled, result);
        }
      }
    }
  }

  return result;
}

function _interactBuckets(
  a: GridBucket,
  b: GridBucket,
  same: boolean,
  ruleMatrix: RuleMatrix,
  followEnabled: boolean,
  result: Array<{ fx: number; fy: number }>
): void {
  const alen = a.entries.length;
  const blen = b.entries.length;
  for (let i = 0; i < alen; i++) {
    const pi = a.entries[i];
    const ri = ruleMatrix[pi.typeIdx];
    const resi = result[pi.idx];
    const jStart = same ? i + 1 : 0;
    for (let j = jStart; j < blen; j++) {
      const pj = b.entries[j];
      const ddx = pj.x - pi.x;
      const ddy = pj.y - pi.y;
      const distSq = ddx * ddx + ddy * ddy;
      if (distSq > INTERACTION_RADIUS_SQ || distSq < 0.0001) continue;
      const rule_ij = ri[pj.typeIdx];
      const rule_ji = ruleMatrix[pj.typeIdx][pi.typeIdx];
      if (rule_ij === 'ignore' && rule_ji === 'ignore') continue;
      const dist = Math.sqrt(distSq);
      const invDist = 1 / dist;
      const nxDir = ddx * invDist;
      const nyDir = ddy * invDist;

      if (distSq < REPEL_RADIUS_SQ) {
        const t = 1 - distSq / REPEL_RADIUS_SQ;
        const f = t * t * 0.6;
        resi.fx -= nxDir * f;
        resi.fy -= nyDir * f;
        result[pj.idx].fx += nxDir * f;
        result[pj.idx].fy += nyDir * f;
        continue;
      }

      const rangeT = 1 - (dist - REPEL_RADIUS) / (INTERACTION_RADIUS - REPEL_RADIUS);
      const rangeTclamped = Math.max(0, Math.min(1, rangeT));

      if (rule_ij !== 'ignore') {
        const f = rangeTclamped * FORCE_SCALE;
        if (rule_ij === 'attract') {
          resi.fx += nxDir * f;
          resi.fy += nyDir * f;
        } else if (rule_ij === 'repel') {
          resi.fx -= nxDir * f * 1.3;
          resi.fy -= nyDir * f * 1.3;
        } else if (rule_ij === 'follow' && followEnabled) {
          const fs = rangeTclamped * FOLLOW_SCALE;
          resi.fx += pj.vx * fs;
          resi.fy += pj.vy * fs;
        }
      }

      if (rule_ji !== 'ignore') {
        const f = rangeTclamped * FORCE_SCALE;
        if (rule_ji === 'attract') {
          result[pj.idx].fx -= nxDir * f;
          result[pj.idx].fy -= nyDir * f;
        } else if (rule_ji === 'repel') {
          result[pj.idx].fx += nxDir * f * 1.3;
          result[pj.idx].fy += nyDir * f * 1.3;
        } else if (rule_ji === 'follow' && followEnabled) {
          const fs = rangeTclamped * FOLLOW_SCALE;
          result[pj.idx].fx += pi.vx * fs;
          result[pj.idx].fy += pi.vy * fs;
        }
      }
    }
  }
}
