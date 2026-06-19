import * as THREE from 'three';

export interface CollisionEvent {
  ghostId: string;
  catId: string;
  distance: number;
}

export class CollisionSystem {
  private ghostPositions: Map<string, THREE.Vector3> = new Map();
  private catPositions: Map<string, THREE.Vector3> = new Map();
  private collisionRadius: number = 1.0;
  private lastCollisionEvents: CollisionEvent[] = [];

  setCollisionRadius(radius: number): void {
    this.collisionRadius = radius;
  }

  setGhostPosition(id: string, position: THREE.Vector3): void {
    this.ghostPositions.set(id, position.clone());
  }

  setCatPosition(id: string, position: THREE.Vector3): void {
    this.catPositions.set(id, position.clone());
  }

  removeCat(id: string): void {
    this.catPositions.delete(id);
  }

  update(): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    for (const [ghostId, ghostPos] of this.ghostPositions) {
      for (const [catId, catPos] of this.catPositions) {
        const distance = ghostPos.distanceTo(catPos);
        if (distance < this.collisionRadius) {
          events.push({
            ghostId,
            catId,
            distance
          });
        }
      }
    }

    this.lastCollisionEvents = events;
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
    this.catPositions.clear();
    this.lastCollisionEvents = [];
  }
}
