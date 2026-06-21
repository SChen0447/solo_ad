import * as THREE from 'three';

export type ObstacleType = 'circle' | 'rectangle' | 'triangle';
export type CollisionMode = 'bounce' | 'penetrate';

export interface BulletData {
  id: number;
  position: THREE.Vector2;
  velocity: THREE.Vector2;
  radius: number;
  trail: THREE.Vector2[];
  createdAt: number;
  lastCollisionTime: number;
}

export interface ObstacleData {
  type: ObstacleType;
  position: THREE.Vector2;
  rotation: number;
  size: THREE.Vector2;
  collisionMode: CollisionMode;
  hitMarks: HitMark[];
}

export interface HitMark {
  position: THREE.Vector2;
  normal: THREE.Vector2;
  createdAt: number;
  duration: number;
}

export interface CollisionEvent {
  type: 'bounce' | 'penetrate';
  position: THREE.Vector2;
  normal: THREE.Vector2;
  bulletId: number;
}

export interface ParticleEvent {
  position: THREE.Vector2;
  direction: THREE.Vector2;
  count: number;
}

export interface PhysicsConfig {
  gravity: number;
  bulletSpeed: number;
  bulletAngle: number;
  obstacleType: ObstacleType;
  collisionMode: CollisionMode;
}

export class PhysicsEngine {
  private bullets: BulletData[] = [];
  private obstacle: ObstacleData;
  private config: PhysicsConfig;
  private collisionListeners: ((event: CollisionEvent) => void)[] = [];
  private particleListeners: ((event: ParticleEvent) => void)[] = [];
  private nextBulletId = 0;
  private readonly MAX_BULLETS = 10;
  private readonly TRAIL_DURATION = 2;
  private readonly HIT_MARK_DURATION = 0.5;
  public readonly PLANE_WIDTH = 16;
  public readonly PLANE_HEIGHT = 9;

  constructor(config: PhysicsConfig) {
    this.config = config;
    this.obstacle = {
      type: config.obstacleType,
      position: new THREE.Vector2(0, 0),
      rotation: 0,
      size: new THREE.Vector2(2, 2),
      collisionMode: config.collisionMode,
      hitMarks: []
    };
  }

  public setConfig(config: Partial<PhysicsConfig>): void {
    Object.assign(this.config, config);
    if (config.obstacleType) {
      this.obstacle.type = config.obstacleType;
    }
    if (config.collisionMode) {
      this.obstacle.collisionMode = config.collisionMode;
    }
  }

  public getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  public getBullets(): BulletData[] {
    return this.bullets.map(b => ({
      ...b,
      position: b.position.clone(),
      velocity: b.velocity.clone(),
      trail: b.trail.map(t => t.clone())
    }));
  }

  public getObstacle(): ObstacleData {
    return {
      ...this.obstacle,
      position: this.obstacle.position.clone(),
      size: this.obstacle.size.clone(),
      hitMarks: this.obstacle.hitMarks.map(h => ({
        ...h,
        position: h.position.clone(),
        normal: h.normal.clone()
      }))
    };
  }

  public spawnBullet(position: THREE.Vector2): BulletData {
    const angleRad = THREE.MathUtils.degToRad(this.config.bulletAngle);
    const velocity = new THREE.Vector2(
      Math.cos(angleRad) * this.config.bulletSpeed,
      Math.sin(angleRad) * this.config.bulletSpeed
    );

    const bullet: BulletData = {
      id: this.nextBulletId++,
      position: position.clone(),
      velocity,
      radius: 0.08,
      trail: [position.clone()],
      createdAt: performance.now() / 1000,
      lastCollisionTime: 0
    };

    this.bullets.push(bullet);

    while (this.bullets.length > this.MAX_BULLETS) {
      this.bullets.shift();
    }

    return bullet;
  }

  public onCollision(listener: (event: CollisionEvent) => void): void {
    this.collisionListeners.push(listener);
  }

  public onParticle(listener: (event: ParticleEvent) => void): void {
    this.particleListeners.push(listener);
  }

  public reset(): void {
    this.bullets = [];
    this.obstacle.hitMarks = [];
    this.nextBulletId = 0;
  }

  public update(deltaTime: number): void {
    const now = performance.now() / 1000;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      bullet.velocity.y -= this.config.gravity * deltaTime;

      const oldPos = bullet.position.clone();
      bullet.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));

      const maxStep = 0.1;
      const dist = oldPos.distanceTo(bullet.position);
      const steps = Math.max(1, Math.ceil(dist / maxStep));

      for (let s = 0; s < steps; s++) {
        const checkPos = oldPos.clone().lerp(bullet.position, (s + 1) / steps);
        const collision = this.checkObstacleCollision(checkPos, bullet.radius);

        if (collision && now - bullet.lastCollisionTime > 0.05) {
          bullet.lastCollisionTime = now;

          if (this.obstacle.collisionMode === 'bounce') {
            this.handleBounce(bullet, collision.normal, collision.point);
            bullet.position.copy(collision.point);
            const event: CollisionEvent = {
              type: 'bounce',
              position: collision.point.clone(),
              normal: collision.normal.clone(),
              bulletId: bullet.id
            };
            this.collisionListeners.forEach(l => l(event));
            this.emitParticles(collision.point, collision.normal);
            break;
          } else {
            this.obstacle.hitMarks.push({
              position: collision.point.clone(),
              normal: collision.normal.clone(),
              createdAt: now,
              duration: this.HIT_MARK_DURATION
            });
            const event: CollisionEvent = {
              type: 'penetrate',
              position: collision.point.clone(),
              normal: collision.normal.clone(),
              bulletId: bullet.id
            };
            this.collisionListeners.forEach(l => l(event));
          }
        }
      }

      const trailPoint = bullet.position.clone();
      (trailPoint as any).timestamp = now;
      bullet.trail.push(trailPoint);

      const cutoffTime = now - this.TRAIL_DURATION;
      while (bullet.trail.length > 1) {
        const firstPoint = bullet.trail[0] as any;
        const trailAge = firstPoint.timestamp || 0;
        if (trailAge && trailAge < cutoffTime) {
          bullet.trail.shift();
        } else {
          break;
        }
      }

      const maxTrailPoints = 200;
      if (bullet.trail.length > maxTrailPoints) {
        bullet.trail.splice(0, bullet.trail.length - maxTrailPoints);
      }

      const halfW = this.PLANE_WIDTH / 2;
      const halfH = this.PLANE_HEIGHT / 2;
      if (
        bullet.position.x < -halfW - 2 ||
        bullet.position.x > halfW + 2 ||
        bullet.position.y < -halfH - 2 ||
        bullet.position.y > halfH + 2
      ) {
        this.bullets.splice(i, 1);
      }
    }

    this.obstacle.hitMarks = this.obstacle.hitMarks.filter(
      mark => now - mark.createdAt < mark.duration
    );
  }

  private handleBounce(bullet: BulletData, normal: THREE.Vector2, point: THREE.Vector2): void {
    const dot = bullet.velocity.dot(normal);
    bullet.velocity.sub(normal.clone().multiplyScalar(2 * dot));
    bullet.velocity.multiplyScalar(0.85);
    bullet.position.copy(point.clone().add(normal.clone().multiplyScalar(0.01)));
  }

  private emitParticles(position: THREE.Vector2, normal: THREE.Vector2): void {
    const event: ParticleEvent = {
      position: position.clone(),
      direction: normal.clone(),
      count: 10
    };
    this.particleListeners.forEach(l => l(event));
  }

  private checkObstacleCollision(
    pos: THREE.Vector2,
    radius: number
  ): { point: THREE.Vector2; normal: THREE.Vector2 } | null {
    switch (this.obstacle.type) {
      case 'circle':
        return this.checkCircleCollision(pos, radius);
      case 'rectangle':
        return this.checkRectangleCollision(pos, radius);
      case 'triangle':
        return this.checkTriangleCollision(pos, radius);
      default:
        return null;
    }
  }

  private checkCircleCollision(
    pos: THREE.Vector2,
    radius: number
  ): { point: THREE.Vector2; normal: THREE.Vector2 } | null {
    const dist = pos.distanceTo(this.obstacle.position);
    const obstacleRadius = this.obstacle.size.x / 2;

    if (dist < obstacleRadius + radius) {
      const normal = pos.clone().sub(this.obstacle.position).normalize();
      const point = this.obstacle.position.clone().add(
        normal.clone().multiplyScalar(obstacleRadius)
      );
      return { point, normal };
    }
    return null;
  }

  private checkRectangleCollision(
    pos: THREE.Vector2,
    radius: number
  ): { point: THREE.Vector2; normal: THREE.Vector2 } | null {
    const halfW = this.obstacle.size.x / 2;
    const halfH = this.obstacle.size.y / 2;
    const relPos = pos.clone().sub(this.obstacle.position);

    const c = Math.cos(-this.obstacle.rotation);
    const s = Math.sin(-this.obstacle.rotation);
    const localX = relPos.x * c - relPos.y * s;
    const localY = relPos.x * s + relPos.y * c;

    const closestX = THREE.MathUtils.clamp(localX, -halfW, halfW);
    const closestY = THREE.MathUtils.clamp(localY, -halfH, halfH);

    const dx = localX - closestX;
    const dy = localY - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      let localNormal: THREE.Vector2;
      if (dist > 0.0001) {
        localNormal = new THREE.Vector2(dx / dist, dy / dist);
      } else {
        const absX = Math.abs(localX);
        const absY = Math.abs(localY);
        if (absX > absY) {
          localNormal = new THREE.Vector2(Math.sign(localX), 0);
        } else {
          localNormal = new THREE.Vector2(0, Math.sign(localY));
        }
      }

      const c2 = Math.cos(this.obstacle.rotation);
      const s2 = Math.sin(this.obstacle.rotation);
      const normal = new THREE.Vector2(
        localNormal.x * c2 - localNormal.y * s2,
        localNormal.x * s2 + localNormal.y * c2
      ).normalize();

      const worldClosestX = closestX * c2 - closestY * s2 + this.obstacle.position.x;
      const worldClosestY = closestX * s2 + closestY * c2 + this.obstacle.position.y;
      const point = new THREE.Vector2(worldClosestX, worldClosestY);

      return { point, normal };
    }
    return null;
  }

  private checkTriangleCollision(
    pos: THREE.Vector2,
    radius: number
  ): { point: THREE.Vector2; normal: THREE.Vector2 } | null {
    const size = this.obstacle.size.x;
    const relPos = pos.clone().sub(this.obstacle.position);

    const c = Math.cos(-this.obstacle.rotation);
    const s = Math.sin(-this.obstacle.rotation);
    const localX = relPos.x * c - relPos.y * s;
    const localY = relPos.x * s + relPos.y * c;

    const h = size * 0.866;
    const v1 = new THREE.Vector2(0, h / 2);
    const v2 = new THREE.Vector2(-size / 2, -h / 2);
    const v3 = new THREE.Vector2(size / 2, -h / 2);
    const localPos = new THREE.Vector2(localX, localY);

    let minDist = Infinity;
    let closestPoint: THREE.Vector2 = v1.clone();
    let edgeNormal: THREE.Vector2 = new THREE.Vector2(0, 1);

    const edges = [
      { a: v1, b: v2 },
      { a: v2, b: v3 },
      { a: v3, b: v1 }
    ];

    for (const edge of edges) {
      const point = this.closestPointOnSegment(localPos, edge.a, edge.b);
      const dist = localPos.distanceTo(point);
      if (dist < minDist) {
        minDist = dist;
        closestPoint = point;
        const edgeDir = edge.b.clone().sub(edge.a).normalize();
        edgeNormal = new THREE.Vector2(-edgeDir.y, edgeDir.x);
        const toCenter = localPos.clone().sub(point);
        if (toCenter.dot(edgeNormal) < 0) {
          edgeNormal.negate();
        }
      }
    }

    const inside = this.pointInTriangle(localPos, v1, v2, v3);

    if (minDist < radius || inside) {
      const c2 = Math.cos(this.obstacle.rotation);
      const s2 = Math.sin(this.obstacle.rotation);
      const normal = new THREE.Vector2(
        edgeNormal.x * c2 - edgeNormal.y * s2,
        edgeNormal.x * s2 + edgeNormal.y * c2
      ).normalize();

      if (inside) {
        normal.negate();
      }

      const worldX = closestPoint.x * c2 - closestPoint.y * s2 + this.obstacle.position.x;
      const worldY = closestPoint.x * s2 + closestPoint.y * c2 + this.obstacle.position.y;
      const point = new THREE.Vector2(worldX, worldY);

      return { point, normal };
    }
    return null;
  }

  private closestPointOnSegment(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    const ab = b.clone().sub(a);
    const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.dot(ab)));
    return a.clone().add(ab.multiplyScalar(t));
  }

  private pointInTriangle(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2): boolean {
    const d1 = this.sign(p, a, b);
    const d2 = this.sign(p, b, c);
    const d3 = this.sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  private sign(p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }
}
