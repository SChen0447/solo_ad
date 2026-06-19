import * as THREE from 'three';

export interface CollisionEvent {
  ghostId: string;
  catId: string;
  distance: number;
}

export const GHOST_FOV = Math.PI / 2;

export class CollisionSystem {
  private ghostPositions: Map<string, THREE.Vector3> = new Map();
  private ghostRotations: Map<string, THREE.Euler> = new Map();
  private catPositions: Map<string, THREE.Vector3> = new Map();
  private collisionRadius: number = 1.0;
  private fieldOfViewAngle: number = GHOST_FOV;
  private lastCollisionEvents: CollisionEvent[] = [];
  private accumulator: number = 0;
  private fixedDelta: number = 1 / 60;

  constructor() {
    this.fieldOfViewAngle = GHOST_FOV;
  }

  setCollisionRadius(radius: number): void {
    this.collisionRadius = radius;
  }

  setFieldOfView(angle: number): void {
    this.fieldOfViewAngle = angle;
  }

  setGhostPosition(id: string, position: THREE.Vector3): void {
    this.ghostPositions.set(id, position.clone());
  }

  setGhostRotation(id: string, rotation: THREE.Euler): void {
    this.ghostRotations.set(id, rotation.clone());
  }

  setCatPosition(id: string, position: THREE.Vector3): void {
    this.catPositions.set(id, position.clone());
  }

  removeCat(id: string): void {
    this.catPositions.delete(id);
  }

  updateWithFixedStep(deltaTime: number): CollisionEvent[] {
    this.accumulator += deltaTime;
    let allEvents: CollisionEvent[] = [];

    while (this.accumulator >= this.fixedDelta) {
      const stepEvents = this.checkCollisions();
      if (stepEvents.length > 0) {
        allEvents = allEvents.concat(stepEvents);
      }
      this.accumulator -= this.fixedDelta;
    }

    this.lastCollisionEvents = allEvents;
    return allEvents;
  }

  update(): CollisionEvent[] {
    const events = this.checkCollisions();
    this.lastCollisionEvents = events;
    return events;
  }

  private checkCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    for (const [ghostId, ghostPos] of this.ghostPositions) {
      const ghostRotation = this.ghostRotations.get(ghostId);
      if (!ghostRotation) continue;

      const ghostForward = new THREE.Vector3(
        -Math.sin(ghostRotation.y),
        0,
        -Math.cos(ghostRotation.y)
      ).normalize();

      for (const [catId, catPos] of this.catPositions) {
        const distance = ghostPos.distanceTo(catPos);
        if (distance < this.collisionRadius) {
          const toCat = new THREE.Vector3().subVectors(catPos, ghostPos).normalize();
          toCat.y = 0;
          if (toCat.length() > 0) {
            toCat.normalize();
          }

          const angle = ghostForward.angleTo(toCat);

          // 使用半角检测：GHOST_FOV / 2 确保总视野为90度
          if (angle < this.fieldOfViewAngle / 2) {
            events.push({
              ghostId,
              catId,
              distance
            });
          }
        }
      }
    }

    return events;
  }

  getLastCollisionEvents(): CollisionEvent[] {
    return [...this.lastCollisionEvents];
  }

  getCatCount(): number {
    return this.catPositions.size;
  }

  clear(): void {
    this.ghostPositions.clear();
    this.ghostRotations.clear();
    this.catPositions.clear();
    this.lastCollisionEvents = [];
    this.accumulator = 0;
  }
}
