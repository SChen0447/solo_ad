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
  age: number;
}

export interface PolygonObstacle {
  id: number;
  vertices: Vector2[];
  isSelected: boolean;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface Gravity {
  x: number;
  y: number;
}

export interface PerformanceStats {
  fps: number;
  frameTime: number;
  physicsTime: number;
  collisionChecks: number;
}

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
export const RESTITUTION = 0.6;
export const MAX_PARTICLES = 120;
export const MAX_OBSTACLES = 20;
export const PARTICLE_LIFETIME = 60;
export const TRAIL_LENGTH = 20;
export const TRAIL_LENGTH_HIGH_LOAD = 10;
export const HIGH_LOAD_THRESHOLD = 90;
export const SPAWN_DURATION = 0.2;
export const DEFAULT_GRAVITY: Gravity = { x: 0, y: 500 };
export const GRID_CELL_SIZE = 100;

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
  const abSq = vecDot(ab, ab);
  if (abSq === 0) return { ...a };
  const t = Math.max(0, Math.min(1, vecDot(vecSub(p, a), ab) / abSq));
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
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface CollisionResult {
  collided: boolean;
  normal: Vector2;
  depth: number;
  closestPoint: Vector2;
  isInside: boolean;
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

  const isInside = pointInPolygon(circlePos, polygon);
  const collided = isInside || minDist < radius;

  if (!collided) {
    return {
      collided: false,
      normal: { x: 0, y: 0 },
      depth: 0,
      closestPoint,
      isInside: false,
    };
  }

  let normal: Vector2;
  let depth: number;

  if (isInside) {
    normal = vecNormalize(vecSub(closestPoint, circlePos));
    depth = radius + minDist;
  } else {
    normal = vecNormalize(vecSub(circlePos, closestPoint));
    depth = radius - minDist;
  }

  if (vecLength(normal) === 0 || isNaN(normal.x) || isNaN(normal.y)) {
    const a = polygon[edgeIndex];
    const b = polygon[(edgeIndex + 1) % polygon.length];
    const edge = vecSub(b, a);
    normal = vecNormalize({ x: -edge.y, y: edge.x });
    if (isInside) normal = vecScale(normal, -1);
  }

  return { collided: true, normal, depth, closestPoint, isInside };
}

export function resolveCirclePolygonCollision(
  particle: Particle,
  polygon: Vector2[]
): boolean {
  const result = circlePolygonCollision(particle.position, particle.radius, polygon);
  if (!result.collided) return false;

  particle.position = vecAdd(
    particle.position,
    vecScale(result.normal, result.depth)
  );

  const velDotNormal = vecDot(particle.velocity, result.normal);
  if (result.isInside) {
    particle.velocity = vecAdd(
      particle.velocity,
      vecScale(result.normal, -2 * velDotNormal)
    );
    particle.velocity = vecScale(particle.velocity, RESTITUTION);
  } else if (velDotNormal < 0) {
    const jVel = -(1 + RESTITUTION) * velDotNormal;
    particle.velocity = vecAdd(
      particle.velocity,
      vecScale(result.normal, jVel)
    );
  }

  return true;
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

function computeBounds(vertices: Vector2[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  return { minX, maxX, minY, maxY };
}

function boundsIntersect(
  px: number, py: number, pr: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  return (
    px + pr >= bounds.minX &&
    px - pr <= bounds.maxX &&
    py + pr >= bounds.minY &&
    py - pr <= bounds.maxY
  );
}

interface SpatialGrid {
  cells: Map<string, number[]>;
  cellSize: number;
}

function buildSpatialGrid(particles: Particle[], cellSize: number): SpatialGrid {
  const cells = new Map<string, number[]>();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const cx = Math.floor(p.position.x / cellSize);
    const cy = Math.floor(p.position.y / cellSize);
    const key = `${cx},${cy}`;
    if (!cells.has(key)) {
      cells.set(key, []);
    }
    cells.get(key)!.push(i);
  }
  return { cells, cellSize };
}

function getNearbyObstacles(
  particle: Particle,
  obstacles: PolygonObstacle[]
): PolygonObstacle[] {
  const result: PolygonObstacle[] = [];
  for (const obs of obstacles) {
    if (boundsIntersect(
      particle.position.x, particle.position.y, particle.radius,
      obs.bounds
    )) {
      result.push(obs);
    }
  }
  return result;
}

export interface PhysicsWorld {
  particles: Particle[];
  obstacles: PolygonObstacle[];
  gravity: Gravity;
  stats: PerformanceStats;
}

export function createWorld(): PhysicsWorld {
  return {
    particles: [],
    obstacles: [],
    gravity: { ...DEFAULT_GRAVITY },
    stats: { fps: 0, frameTime: 0, physicsTime: 0, collisionChecks: 0 },
  };
}

export function addObstacle(
  world: PhysicsWorld,
  vertices: Vector2[]
): PolygonObstacle | null {
  if (world.obstacles.length >= MAX_OBSTACLES) return null;
  if (vertices.length < 3) return null;

  const obstacle: PolygonObstacle = {
    id: obstacleIdCounter++,
    vertices: [...vertices],
    isSelected: false,
    bounds: computeBounds(vertices),
  };
  world.obstacles.push(obstacle);
  return obstacle;
}

export function removeObstacle(world: PhysicsWorld, id: number): boolean {
  const index = world.obstacles.findIndex((o) => o.id === id);
  if (index >= 0) {
    world.obstacles.splice(index, 1);
    return true;
  }
  return false;
}

export function addParticle(
  world: PhysicsWorld,
  position: Vector2,
  velocity: Vector2,
  color: string,
  radius: number
): Particle | null {
  if (world.particles.length >= MAX_PARTICLES) return null;

  const particle: Particle = {
    id: particleIdCounter++,
    position: { ...position },
    velocity: { ...velocity },
    radius,
    color,
    life: PARTICLE_LIFETIME,
    maxLife: PARTICLE_LIFETIME,
    trail: [],
    age: 0,
  };
  world.particles.push(particle);
  return particle;
}

export function clearParticles(world: PhysicsWorld): void {
  world.particles = [];
}

export function clearAll(world: PhysicsWorld): void {
  world.particles = [];
  world.obstacles = [];
}

export function updatePhysics(
  world: PhysicsWorld,
  dt: number
): PerformanceStats {
  const startTime = performance.now();
  let collisionChecks = 0;

  const particleCount = world.particles.length;
  const maxTrail = particleCount >= HIGH_LOAD_THRESHOLD
    ? TRAIL_LENGTH_HIGH_LOAD
    : TRAIL_LENGTH;

  const aliveParticles: Particle[] = [];

  for (const particle of world.particles) {
    particle.life -= dt;
    if (particle.life <= 0) continue;

    particle.age += dt;

    particle.trail.push({ ...particle.position });
    while (particle.trail.length > maxTrail) {
      particle.trail.shift();
    }

    particle.velocity = vecAdd(
      particle.velocity,
      vecScale(world.gravity, dt)
    );

    particle.position = vecAdd(
      particle.position,
      vecScale(particle.velocity, dt)
    );

    resolveBoundaryCollision(particle);

    const nearbyObstacles = getNearbyObstacles(particle, world.obstacles);
    for (const obstacle of nearbyObstacles) {
      if (obstacle.vertices.length >= 3) {
        resolveCirclePolygonCollision(particle, obstacle.vertices);
        collisionChecks++;
      }
    }

    aliveParticles.push(particle);
  }

  world.particles = aliveParticles;

  const physicsTime = performance.now() - startTime;
  const frameTime = physicsTime;
  const fps = frameTime > 0 ? 1000 / frameTime : 60;

  world.stats = {
    fps: Math.min(fps, 60),
    frameTime,
    physicsTime,
    collisionChecks,
  };

  return world.stats;
}

let particleIdCounter = 0;
let obstacleIdCounter = 0;

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
    age: 0,
  };
}

export function createObstacle(vertices: Vector2[]): PolygonObstacle {
  return {
    id: obstacleIdCounter++,
    vertices: [...vertices],
    isSelected: false,
    bounds: computeBounds(vertices),
  };
}

export function isPointInPolygon(
  point: Vector2,
  vertices: Vector2[]
): boolean {
  return pointInPolygon(point, vertices);
}

export function recomputeObstacleBounds(obstacle: PolygonObstacle): void {
  obstacle.bounds = computeBounds(obstacle.vertices);
}
