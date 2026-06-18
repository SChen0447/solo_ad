export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  trail: Vector2[];
}

export interface PolygonObstacle {
  id: number;
  vertices: Vector2[];
  isSelected: boolean;
}

export interface Gravity {
  x: number;
  y: number;
}

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
export const RESTITUTION = 0.6;
export const MAX_PARTICLES = 120;
export const MAX_OBSTACLES = 20;
export const PARTICLE_LIFETIME = 60;
export const TRAIL_LENGTH = 8;
export const DEFAULT_GRAVITY: Gravity = { x: 0, y: 500 };

export function vec2(x: number, y: number): Vector2 {
  return { x, y };
}

export function vecAdd(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecScale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s };
}

export function vecDot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function vecLength(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vecNormalize(v: Vector2): Vector2 {
  const len = vecLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function closestPointOnSegment(
  p: Vector2,
  a: Vector2,
  b: Vector2
): Vector2 {
  const ab = vecSub(b, a);
  const t = Math.max(
    0,
    Math.min(1, vecDot(vecSub(p, a), ab) / vecDot(ab, ab))
  );
  return vecAdd(a, vecScale(ab, t));
}

export function pointInPolygon(p: Vector2, vertices: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;

    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface CollisionResult {
  collided: boolean;
  normal: Vector2;
  depth: number;
  closestPoint: Vector2;
}

export function circlePolygonCollision(
  circlePos: Vector2,
  radius: number,
  polygon: Vector2[]
): CollisionResult {
  let minDist = Infinity;
  let closestPoint: Vector2 = polygon[0];
  let edgeIndex = 0;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cp = closestPointOnSegment(circlePos, a, b);
    const dist = vecLength(vecSub(circlePos, cp));
    if (dist < minDist) {
      minDist = dist;
      closestPoint = cp;
      edgeIndex = i;
    }
  }

  const inside = pointInPolygon(circlePos, polygon);
  const collided = inside || minDist < radius;

  if (!collided) {
    return {
      collided: false,
      normal: { x: 0, y: 0 },
      depth: 0,
      closestPoint,
    };
  }

  let normal: Vector2;
  let depth: number;

  if (inside) {
    normal = vecNormalize(vecSub(closestPoint, circlePos));
    depth = radius + minDist;
  } else {
    normal = vecNormalize(vecSub(circlePos, closestPoint));
    depth = radius - minDist;
  }

  if (vecLength(normal) === 0) {
    const a = polygon[edgeIndex];
    const b = polygon[(edgeIndex + 1) % polygon.length];
    const edge = vecSub(b, a);
    normal = vecNormalize({ x: -edge.y, y: edge.x });
    if (inside) normal = vecScale(normal, -1);
  }

  return { collided: true, normal, depth, closestPoint };
}

export function resolveCirclePolygonCollision(
  particle: Particle,
  polygon: Vector2[]
): void {
  const result = circlePolygonCollision(particle.position, particle.radius, polygon);
  if (!result.collided) return;

  particle.position = vecAdd(
    particle.position,
    vecScale(result.normal, result.depth)
  );

  const velDotNormal = vecDot(particle.velocity, result.normal);
  if (velDotNormal < 0) {
    const rest = RESTITUTION;
    const jVel = -(1 + rest) * velDotNormal;
    particle.velocity = vecAdd(
      particle.velocity,
      vecScale(result.normal, jVel)
    );
  }
}

export function resolveBoundaryCollision(particle: Particle): void {
  if (particle.position.x - particle.radius < 0) {
    particle.position.x = particle.radius;
    if (particle.velocity.x < 0) particle.velocity.x *= -RESTITUTION;
  } else if (particle.position.x + particle.radius > CANVAS_WIDTH) {
    particle.position.x = CANVAS_WIDTH - particle.radius;
    if (particle.velocity.x > 0) particle.velocity.x *= -RESTITUTION;
  }

  if (particle.position.y - particle.radius < 0) {
    particle.position.y = particle.radius;
    if (particle.velocity.y < 0) particle.velocity.y *= -RESTITUTION;
  } else if (particle.position.y + particle.radius > CANVAS_HEIGHT) {
    particle.position.y = CANVAS_HEIGHT - particle.radius;
    if (particle.velocity.y > 0) particle.velocity.y *= -RESTITUTION;
  }
}

export function updatePhysics(
  particles: Particle[],
  obstacles: PolygonObstacle[],
  gravity: Gravity,
  dt: number
): Particle[] {
  const aliveParticles: Particle[] = [];

  for (const particle of particles) {
    particle.life -= dt;
    if (particle.life <= 0) continue;

    particle.trail.unshift({ ...particle.position });
    if (particle.trail.length > TRAIL_LENGTH) {
      particle.trail.pop();
    }

    particle.velocity = vecAdd(
      particle.velocity,
      vecScale(gravity, dt)
    );

    particle.position = vecAdd(
      particle.position,
      vecScale(particle.velocity, dt)
    );

    resolveBoundaryCollision(particle);

    for (const obstacle of obstacles) {
      if (obstacle.vertices.length < 3) continue;
      resolveCirclePolygonCollision(particle, obstacle.vertices);
    }

    aliveParticles.push(particle);
  }

  return aliveParticles;
}

let particleIdCounter = 0;

export function createParticle(
  position: Vector2,
  velocity: Vector2,
  color: string,
  radius: number
): Particle {
  return {
    id: particleIdCounter++,
    position: { ...position },
    velocity: { ...velocity },
    radius,
    color,
    life: PARTICLE_LIFETIME,
    maxLife: PARTICLE_LIFETIME,
    trail: [],
  };
}

let obstacleIdCounter = 0;

export function createObstacle(vertices: Vector2[]): PolygonObstacle {
  return {
    id: obstacleIdCounter++,
    vertices: [...vertices],
    isSelected: false,
  };
}

export function isPointInPolygon(
  point: Vector2,
  vertices: Vector2[]
): boolean {
  return pointInPolygon(point, vertices);
}
