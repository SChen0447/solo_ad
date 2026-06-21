import Phaser from 'phaser';
import { Debris } from '../entities/Debris';
import { Spacecraft } from '../entities/Spacecraft';

export type CollisionEvent =
  | { type: 'debris_debris'; debrisA: Debris; debrisB: Debris; point: Phaser.Types.Math.Vector2Like }
  | { type: 'fragment_ship'; fragment: Debris; ship: Spacecraft };

export class PhysicsManager {
  public scene: Phaser.Scene;
  public debrisGroup: Phaser.Physics.Arcade.Group;
  public fragmentGroup: Phaser.Physics.Arcade.Group;
  public ship: Spacecraft | null = null;

  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private collisionListeners: ((event: CollisionEvent) => void)[] = [];

  private debrisPool: Debris[] = [];
  private fragmentPool: Debris[] = [];
  private maxDebris = 80;
  private maxFragments = 40;

  private gravityFields: { x: number; y: number; radius: number; strength: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.debrisGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    this.fragmentGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    this.setupGravityFields();
  }

  private setupGravityFields(): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    this.gravityFields.push({
      x: w / 2,
      y: h / 2,
      radius: Math.max(w, h),
      strength: -3,
    });
  }

  public setShip(ship: Spacecraft): void {
    this.ship = ship;
    this.setupColliders();
  }

  private setupColliders(): void {
    this.colliders.forEach(c => c.destroy());
    this.colliders = [];

    if (!this.ship) return;

    const debrisCollider = this.scene.physics.add.collider(
      this.debrisGroup,
      this.debrisGroup,
      (objA, objB) => this.handleDebrisCollision(objA as any, objB as any),
      (objA, objB) => this.canDebrisCollide(objA as any, objB as any)
    );

    const fragmentShipCollider = this.scene.physics.add.collider(
      this.fragmentGroup,
      this.ship.sprite,
      (objFrag) => this.handleFragmentShipCollision(objFrag as any),
      (objFrag) => this.canFragmentShipCollide(objFrag as any)
    );

    this.colliders.push(debrisCollider, fragmentShipCollider);
  }

  private canDebrisCollide(objA: Debris, objB: Debris): boolean {
    if (!objA.canCollide() || !objB.canCollide()) return false;
    return true;
  }

  private canFragmentShipCollide(frag: Debris): boolean {
    if (!this.ship) return false;
    if (!frag.isActive()) return false;
    if (this.ship.invincible) return false;
    return true;
  }

  private handleDebrisCollision(objA: any, objB: any): void {
    const debrisA = this.findDebrisFromSprite(objA);
    const debrisB = this.findDebrisFromSprite(objB);
    if (!debrisA || !debrisB) return;

    if (debrisA.isFragment || debrisB.isFragment) return;

    const point = {
      x: (debrisA.sprite.x + debrisB.sprite.x) / 2,
      y: (debrisA.sprite.y + debrisB.sprite.y) / 2,
    };

    this.emitCollision({ type: 'debris_debris', debrisA, debrisB, point });

    const relVx = debrisA.sprite.body!.velocity.x - debrisB.sprite.body!.velocity.x;
    const relVy = debrisA.sprite.body!.velocity.y - debrisB.sprite.body!.velocity.y;
    const impactSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

    if (impactSpeed > 80) {
      const splitA = Math.random() < (impactSpeed / 300);
      const splitB = Math.random() < (impactSpeed / 350);

      if (splitA || splitB) {
        this.scene.time.delayedCall(50, () => {
          if (splitA && debrisA.canCollide()) {
            const fragsA = debrisA.splitIntoFragments();
            fragsA.forEach(f => this.addFragment(f));
          }
          if (splitB && debrisB.canCollide()) {
            const fragsB = debrisB.splitIntoFragments();
            fragsB.forEach(f => this.addFragment(f));
          }
        });
      }

      this.scene.tweens.add({
        targets: this.scene.cameras.main,
        x: { from: 0, to: (Math.random() - 0.5) * 4 },
        y: { from: 0, to: (Math.random() - 0.5) * 4 },
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.scene.cameras.main.x = 0;
          this.scene.cameras.main.y = 0;
        },
      });
    }

    const sparks = this.scene.add.particles(0, 0, null, {
      x: point.x,
      y: point.y,
      speed: { min: 50, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      lifespan: 350,
      quantity: Math.min(8, Math.floor(impactSpeed / 25)),
      tint: [0xffeb3b, 0xff9800, 0xff5722, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.scene.time.delayedCall(350, () => sparks.destroy());
  }

  private handleFragmentShipCollision(objFrag: any): void {
    const fragment = this.findFragmentFromSprite(objFrag);
    if (!fragment || !this.ship) return;

    this.emitCollision({ type: 'fragment_ship', fragment, ship: this.ship });

    if (this.ship.takeDamage(1)) {
      fragment.sprite.body!.enable = false;
      fragment.sprite.setVisible(false);
      fragment.sprite.setActive(false);
    }
  }

  private findDebrisFromSprite(sprite: Phaser.Physics.Arcade.Image): Debris | null {
    for (const d of this.debrisPool) {
      if (d.sprite === sprite) return d;
    }
    return null;
  }

  private findFragmentFromSprite(sprite: Phaser.Physics.Arcade.Image): Debris | null {
    for (const f of this.fragmentPool) {
      if (f.sprite === sprite) return f;
    }
    return null;
  }

  public addDebris(debris: Debris): boolean {
    if (this.debrisPool.length >= this.maxDebris) return false;
    this.debrisPool.push(debris);
    this.debrisGroup.add(debris.sprite);
    return true;
  }

  public addFragment(fragment: Debris): boolean {
    const activeCount = this.fragmentPool.filter(f => f.isActive()).length;
    if (activeCount >= this.maxFragments) {
      const stale = this.fragmentPool.find(f => !f.isActive());
      if (stale) this.removeFragment(stale);
      else return false;
    }
    this.fragmentPool.push(fragment);
    this.fragmentGroup.add(fragment.sprite);
    return true;
  }

  public removeDebris(debris: Debris): void {
    const idx = this.debrisPool.indexOf(debris);
    if (idx > -1) {
      this.debrisPool.splice(idx, 1);
      this.debrisGroup.remove(debris.sprite, true, true);
      debris.destroy();
    }
  }

  public removeFragment(fragment: Debris): void {
    const idx = this.fragmentPool.indexOf(fragment);
    if (idx > -1) {
      this.fragmentPool.splice(idx, 1);
      this.fragmentGroup.remove(fragment.sprite, true, true);
      fragment.destroy();
    }
  }

  public getActiveDebris(): Debris[] {
    return this.debrisPool.filter(d => d.isActive() && !d.isFragment);
  }

  public getActiveFragments(): Debris[] {
    return this.fragmentPool.filter(f => f.isActive());
  }

  public getDebrisCount(): number {
    return this.getActiveDebris().length;
  }

  public onCollision(listener: (event: CollisionEvent) => void): () => void {
    this.collisionListeners.push(listener);
    return () => {
      const idx = this.collisionListeners.indexOf(listener);
      if (idx > -1) this.collisionListeners.splice(idx, 1);
    };
  }

  private emitCollision(event: CollisionEvent): void {
    this.collisionListeners.forEach(l => l(event));
  }

  public update(delta: number, beamInfo?: ReturnType<any>): void {
    this.applyWeakGravity(delta);
    this.updateDebrisLifecycle(delta, beamInfo);
    this.cleanup();
  }

  private applyWeakGravity(delta: number): void {
    const dtSec = delta / 1000;
    for (const field of this.gravityFields) {
      this.getActiveDebris().forEach(d => {
        const dx = field.x - d.sprite.x;
        const dy = field.y - d.sprite.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < field.radius && dist > 1) {
          const force = (field.strength / Math.max(dist, 100)) * dtSec * 60;
          d.sprite.body!.velocity.x += (dx / dist) * force;
          d.sprite.body!.velocity.y += (dy / dist) * force;
        }
      });
    }
  }

  private updateDebrisLifecycle(delta: number, beamInfo?: ReturnType<any>): void {
    this.debrisPool.forEach(d => d.update(delta, beamInfo));
    this.fragmentPool.forEach(f => f.update(delta));
  }

  private cleanup(): void {
    for (let i = this.debrisPool.length - 1; i >= 0; i--) {
      const d = this.debrisPool[i];
      if (!d.isActive() && d.state === 'destroyed') {
        this.removeDebris(d);
      }
    }

    for (let i = this.fragmentPool.length - 1; i >= 0; i--) {
      const f = this.fragmentPool[i];
      if (!f.isActive()) {
        this.removeFragment(f);
      }
    }
  }

  public destroy(): void {
    this.colliders.forEach(c => c.destroy());
    [...this.debrisPool].forEach(d => this.removeDebris(d));
    [...this.fragmentPool].forEach(f => this.removeFragment(f));
    this.collisionListeners = [];
  }
}
