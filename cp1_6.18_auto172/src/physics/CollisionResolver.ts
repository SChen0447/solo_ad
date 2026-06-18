import { CollisionBody } from '../engine/GameStore';

export interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  depth: number;
}

const EPSILON = 0.001;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function normalize(x: number, y: number): [number, number] {
  const len = length(x, y);
  if (len < EPSILON) return [0, -1];
  return [x / len, y / len];
}

function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): [number, number] {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < EPSILON) return [ax, ay];
  const t = clamp(dot(px - ax, py - ay, dx, dy) / lenSq, 0, 1);
  return [ax + t * dx, ay + t * dy];
}

function circleVsRect(
  cx: number, cy: number, radius: number,
  rx: number, ry: number, rw: number, rh: number
): CollisionResult {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);

  const dx = cx - closestX;
  const dy = cy - closestY;
  const dist = length(dx, dy);

  if (dist < radius) {
    if (dist < EPSILON) {
      const distLeft = cx - rx;
      const distRight = (rx + rw) - cx;
      const distTop = cy - ry;
      const distBottom = (ry + rh) - cy;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      if (minDist === distLeft) return { collided: true, normalX: -1, normalY: 0, depth: distLeft + radius };
      if (minDist === distRight) return { collided: true, normalX: 1, normalY: 0, depth: distRight + radius };
      if (minDist === distTop) return { collided: true, normalX: 0, normalY: -1, depth: distTop + radius };
      return { collided: true, normalX: 0, normalY: 1, depth: distBottom + radius };
    }

    const [nx, ny] = normalize(dx, dy);
    return {
      collided: true,
      normalX: nx,
      normalY: ny,
      depth: radius - dist,
    };
  }

  return { collided: false, normalX: 0, normalY: 0, depth: 0 };
}

function getSlopeVertices(body: CollisionBody): [number, number][] {
  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  const hw = body.width / 2;
  const hh = body.height / 2;

  const rad = (body.rotation * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const localPoints: [number, number][] = [
    [-hw, hh],
    [0, -hh],
    [hw, hh],
  ];

  return localPoints.map(([lx, ly]) => [
    cx + lx * cosR - ly * sinR,
    cy + lx * sinR + ly * cosR,
  ]);
}

function pointInTriangle(
  px: number, py: number,
  v0: [number, number], v1: [number, number], v2: [number, number]
): boolean {
  const d00 = dot(v1[0] - v0[0], v1[1] - v0[1], v1[0] - v0[0], v1[1] - v0[1]);
  const d01 = dot(v1[0] - v0[0], v1[1] - v0[1], v2[0] - v0[0], v2[1] - v0[1]);
  const d02 = dot(v1[0] - v0[0], v1[1] - v0[1], px - v0[0], py - v0[1]);
  const d11 = dot(v2[0] - v0[0], v2[1] - v0[1], v2[0] - v0[0], v2[1] - v0[1]);
  const d12 = dot(v2[0] - v0[0], v2[1] - v0[1], px - v0[0], py - v0[1]);

  const inv = 1 / (d00 * d11 - d01 * d01);
  const u = (d11 * d02 - d01 * d12) * inv;
  const v = (d00 * d12 - d01 * d02) * inv;

  return u >= 0 && v >= 0 && u + v <= 1;
}

function circleVsTriangle(
  cx: number, cy: number, radius: number,
  vertices: [number, number][]
): CollisionResult {
  let minDist = Infinity;
  let bestNx = 0;
  let bestNy = 0;
  let found = false;

  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 0],
  ];

  for (const [i, j] of edges) {
    const [ax, ay] = vertices[i];
    const [bx, by] = vertices[j];
    const [cpx, cpy] = closestPointOnSegment(cx, cy, ax, ay, bx, by);

    const dx = cx - cpx;
    const dy = cy - cpy;
    const dist = length(dx, dy);

    if (dist < radius && dist < minDist) {
      minDist = dist;
      if (dist < EPSILON) {
        const edgeDx = bx - ax;
        const edgeDy = by - ay;
        const [enx, eny] = normalize(-edgeDy, edgeDx);
        const midX = (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3;
        const midY = (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3;
        if (dot(enx, eny, midX - cpx, midY - cpy) > 0) {
          bestNx = -enx;
          bestNy = -eny;
        } else {
          bestNx = enx;
          bestNy = eny;
        }
      } else {
        const [nx, ny] = normalize(dx, dy);
        bestNx = nx;
        bestNy = ny;
      }
      found = true;
    }
  }

  if (found) {
    return {
      collided: true,
      normalX: bestNx,
      normalY: bestNy,
      depth: radius - minDist,
    };
  }

  if (pointInTriangle(cx, cy, vertices[0], vertices[1], vertices[2])) {
    let minPen = Infinity;
    let bnx = 0;
    let bny = -1;

    for (const [i, j] of edges) {
      const [ax, ay] = vertices[i];
      const [bx, by] = vertices[j];
      const edgeDx = bx - ax;
      const edgeDy = by - ay;
      const [enx, eny] = normalize(-edgeDy, edgeDx);

      const midX = (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3;
      const midY = (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3;

      let outNx = enx;
      let outNy = eny;
      if (dot(enx, eny, midX - ax, midY - ay) > 0) {
        outNx = -enx;
        outNy = -eny;
      }

      const dist = dot(outNx, outNy, cx - ax, cy - ay);
      if (dist > 0 && dist < minPen) {
        minPen = dist;
        bnx = outNx;
        bny = outNy;
      }
    }

    return {
      collided: true,
      normalX: bnx,
      normalY: bny,
      depth: minPen + radius,
    };
  }

  return { collided: false, normalX: 0, normalY: 0, depth: 0 };
}

export function resolveCircleVsBody(
  cx: number, cy: number, radius: number,
  body: CollisionBody
): CollisionResult {
  switch (body.type) {
    case 'ground':
    case 'wall':
    case 'movingPlatform':
    case 'bouncePad':
      return circleVsRect(cx, cy, radius, body.x, body.y, body.width, body.height);

    case 'slope': {
      const vertices = getSlopeVertices(body);
      return circleVsTriangle(cx, cy, radius, vertices);
    }

    default:
      return { collided: false, normalX: 0, normalY: 0, depth: 0 };
  }
}

export function isLandingOnTop(
  normalY: number,
  bodyType: CollisionBody['type']
): boolean {
  return normalY < -0.5;
}

export function isWallCollision(normalX: number): boolean {
  return Math.abs(normalX) > 0.7;
}
