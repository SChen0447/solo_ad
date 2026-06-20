import * as THREE from 'three';
import { EnemyFleet, Enemy } from './enemyFleet';

export type BulletPattern = 'fan' | 'spiral' | 'line';

export interface BulletParams {
  density: number;
  interval: number;
  spreadAngle: number;
}

interface Bullet {
  id: number;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  collisionSphere: THREE.LineSegments | null;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  trail: THREE.Line;
  trailPositions: THREE.Vector3[];
  age: number;
  jitterTimer: number;
  jitterInterval: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  position: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  startColor: THREE.Color;
  endColor: THREE.Color;
}

interface PendingExplosion {
  position: THREE.Vector3;
  delay: number;
  elapsed: number;
}

export interface CollisionEvent {
  enemy: Enemy;
  position: THREE.Vector3;
  bullet: Bullet;
}

export class BulletSystem {
  private scene: THREE.Scene;
  private enemyFleet: EnemyFleet;
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private pendingExplosions: PendingExplosion[] = [];
  private bulletIdCounter: number = 0;

  private bulletGeometry!: THREE.SphereGeometry;
  private bulletMaterial!: THREE.MeshStandardMaterial;
  private glowMaterial!: THREE.MeshBasicMaterial;
  private trailMaterial!: THREE.LineBasicMaterial;
  private particleMaterial!: THREE.MeshBasicMaterial;
  private particleGeometry!: THREE.BoxGeometry;

  private bulletPattern: BulletPattern = 'fan';
  private params: BulletParams = {
    density: 10,
    interval: 500,
    spreadAngle: 60
  };

  private showCollisionBoxes: boolean = false;
  private collisionScale: number = 1.0;
  private readonly BULLET_SPEED: number = 5;
  private readonly BULLET_RADIUS: number = 0.1;

  private lastFireTime: number = 0;
  private selectedEnemy: Enemy | null = null;
  private spiralAngle: number = 0;

  public onCollision: ((event: CollisionEvent) => void) | null = null;

  private tempVecA: THREE.Vector3 = new THREE.Vector3();
  private tempVecB: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, enemyFleet: EnemyFleet) {
    this.scene = scene;
    this.enemyFleet = enemyFleet;
    this.initGeometries();
  }

  private initGeometries(): void {
    this.bulletGeometry = new THREE.SphereGeometry(this.BULLET_RADIUS, 12, 12);

    this.bulletMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xff2222,
      emissiveIntensity: 1.2,
      metalness: 0.5,
      roughness: 0.3
    });

    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  public setPattern(pattern: BulletPattern): void {
    this.bulletPattern = pattern;
    this.spiralAngle = 0;
  }

  public setParams(params: Partial<BulletParams>): void {
    this.params = { ...this.params, ...params };
  }

  public getParams(): BulletParams {
    return { ...this.params };
  }

  public setSelectedEnemy(enemy: Enemy | null): void {
    this.selectedEnemy = enemy;
  }

  public setShowCollisionBoxes(show: boolean): void {
    this.showCollisionBoxes = show;
    for (const bullet of this.bullets) {
      if (show) {
        this.addCollisionSphere(bullet);
      } else {
        this.removeCollisionSphere(bullet);
      }
    }
  }

  public setCollisionScale(scale: number): void {
    this.collisionScale = scale;
    for (const bullet of this.bullets) {
      this.removeCollisionSphere(bullet);
      if (this.showCollisionBoxes) {
        this.addCollisionSphere(bullet);
      }
    }
  }

  private addCollisionSphere(bullet: Bullet): void {
    if (bullet.collisionSphere) return;

    const radius = this.BULLET_RADIUS * 2 * this.collisionScale;
    const sphereGeo = new THREE.IcosahedronGeometry(radius, 1);
    const edges = new THREE.EdgesGeometry(sphereGeo);
    const material = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const lineSegments = new THREE.LineSegments(edges, material);
    bullet.mesh.add(lineSegments);
    bullet.collisionSphere = lineSegments;
    sphereGeo.dispose();
    edges.dispose();
  }

  private removeCollisionSphere(bullet: Bullet): void {
    if (bullet.collisionSphere) {
      bullet.mesh.remove(bullet.collisionSphere);
      const geo = bullet.collisionSphere.geometry as THREE.BufferGeometry;
      const mat = bullet.collisionSphere.material as THREE.Material;
      geo.dispose();
      mat.dispose();
      bullet.collisionSphere = null;
    }
  }

  public fire(now: number): void {
    if (now - this.lastFireTime < this.params.interval) return;
    this.lastFireTime = now;

    const aliveEnemies = this.enemyFleet.getAliveEnemies();
    if (aliveEnemies.length === 0) return;

    const fireEnemies: Enemy[] = [];
    if (this.selectedEnemy && this.selectedEnemy.isAlive) {
      fireEnemies.push(this.selectedEnemy);
    } else {
      const limit = Math.min(3, aliveEnemies.length);
      for (let i = 0; i < limit; i++) {
        fireEnemies.push(aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]);
      }
    }

    for (const enemy of fireEnemies) {
      this.createBulletPattern(enemy);
    }
  }

  private createBulletPattern(enemy: Enemy): void {
    const origin = enemy.mesh.position.clone();

    switch (this.bulletPattern) {
      case 'fan':
        this.createFanPattern(origin);
        break;
      case 'spiral':
        this.createSpiralPattern(origin);
        break;
      case 'line':
        this.createLinePattern(origin);
        break;
    }
  }

  private createFanPattern(origin: THREE.Vector3): void {
    const count = this.params.density;
    const spreadRad = THREE.MathUtils.degToRad(this.params.spreadAngle);
    const startAngle = -spreadRad / 2;
    const step = spreadRad / Math.max(1, count - 1);

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * step;
      const velocity = new THREE.Vector3(
        Math.cos(angle),
        Math.sin(angle) * 0.7,
        Math.sin(angle * 0.5) * 0.3
      ).normalize().multiplyScalar(this.BULLET_SPEED);

      velocity.negate();
      this.createBullet(origin, velocity);
    }
  }

  private createSpiralPattern(origin: THREE.Vector3): void {
    const count = Math.min(this.params.density, 8);
    const spreadRad = THREE.MathUtils.degToRad(this.params.spreadAngle);

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2 + this.spiralAngle;
      const tiltAngle = Math.sin(baseAngle * 2) * spreadRad * 0.3;
      const velocity = new THREE.Vector3(
        Math.cos(baseAngle) * Math.cos(tiltAngle),
        Math.sin(tiltAngle),
        Math.sin(baseAngle) * Math.cos(tiltAngle)
      ).normalize().multiplyScalar(this.BULLET_SPEED);

      this.createBullet(origin, velocity);
    }
    this.spiralAngle += 0.4;
  }

  private createLinePattern(origin: THREE.Vector3): void {
    const count = this.params.density;
    const spreadRad = THREE.MathUtils.degToRad(this.params.spreadAngle * 0.3);

    for (let i = 0; i < count; i++) {
      const yOffset = (i - (count - 1) / 2) * 0.2;
      const zOffset = (i % 2 === 0 ? 1 : -1) * Math.floor(i / 2) * 0.15;
      const angle = spreadRad * (i / count - 0.5);

      const velocity = new THREE.Vector3(
        -Math.cos(angle),
        yOffset * 0.3,
        zOffset + Math.sin(angle) * 0.2
      ).normalize().multiplyScalar(this.BULLET_SPEED);

      this.createBullet(origin, velocity);
    }
  }

  private createBullet(origin: THREE.Vector3, velocity: THREE.Vector3): void {
    const id = this.bulletIdCounter++;

    const mesh = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial.clone());
    mesh.position.copy(origin);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(this.BULLET_RADIUS * 2, 8, 8),
      this.glowMaterial.clone()
    );
    mesh.add(glow);

    const trailPositions: THREE.Vector3[] = [origin.clone(), origin.clone()];
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPositions);
    const trail = new THREE.Line(trailGeo, this.trailMaterial.clone());
    trail.frustumCulled = false;

    this.scene.add(mesh);
    this.scene.add(trail);

    const bullet: Bullet = {
      id,
      mesh,
      glow,
      collisionSphere: null,
      position: origin.clone(),
      velocity: velocity.clone(),
      life: 6,
      maxLife: 6,
      trail,
      trailPositions,
      age: 0,
      jitterTimer: 0,
      jitterInterval: 0.02 + Math.random() * 0.06
    };

    if (this.showCollisionBoxes) {
      this.addCollisionSphere(bullet);
    }

    this.bullets.push(bullet);
  }

  private createExplosion(position: THREE.Vector3): void {
    const count = 10;
    const startColor = new THREE.Color(0xfde047);
    const endColor = new THREE.Color(0xf97316);

    for (let i = 0; i < count; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(2 + Math.random() * 3);

      const mat = this.particleMaterial.clone();
      mat.color.copy(startColor);
      const mesh = new THREE.Mesh(this.particleGeometry, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const hueJitter = (Math.random() - 0.5) * 0.05;
      const particleStart = startColor.clone();
      const particleEnd = endColor.clone();
      particleStart.offsetHSL(hueJitter, 0, 0);
      particleEnd.offsetHSL(hueJitter, 0, 0);

      this.particles.push({
        mesh,
        velocity,
        life: 0.3,
        maxLife: 0.3,
        position: position.clone(),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        startColor: particleStart,
        endColor: particleEnd
      });
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.fire(elapsedTime * 1000);

    const enemyCollisionRadius = this.enemyFleet.getEnemyCollisionRadius();
    const bulletCollisionRadius = this.BULLET_RADIUS * this.collisionScale;
    const totalCollisionRadius = enemyCollisionRadius + bulletCollisionRadius;
    const collisionRadiusSq = totalCollisionRadius * totalCollisionRadius;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      const oldPos = bullet.position.clone();
      this.tempVecA.copy(bullet.velocity).multiplyScalar(deltaTime);
      bullet.position.add(this.tempVecA);

      bullet.jitterTimer += deltaTime;
      if (bullet.jitterTimer >= bullet.jitterInterval) {
        bullet.jitterTimer = 0;
        bullet.jitterInterval = 0.02 + Math.random() * 0.06;
        const amplitude = 0.05;
        this.tempVecA.set(
          (Math.random() - 0.5) * 2 * amplitude,
          (Math.random() - 0.5) * 2 * amplitude,
          (Math.random() - 0.5) * 2 * amplitude
        );
        bullet.position.add(this.tempVecA);
      }

      bullet.mesh.position.copy(bullet.position);

      bullet.age += deltaTime;
      bullet.life -= deltaTime;

      this.updateBulletTrail(bullet, oldPos, bullet.position, deltaTime);

      const aliveEnemies = this.enemyFleet.getAliveEnemies();
      let hitEnemy: Enemy | null = null;
      for (const enemy of aliveEnemies) {
        const distSq = bullet.position.distanceToSquared(enemy.mesh.position);
        if (distSq < collisionRadiusSq) {
          hitEnemy = enemy;
          break;
        }
      }

      if (hitEnemy) {
        this.enemyFleet.triggerHit(hitEnemy);
        this.pendingExplosions.push({
          position: bullet.position.clone(),
          delay: 0.15,
          elapsed: 0
        });
        this.onCollision?.({
          enemy: hitEnemy,
          position: bullet.position.clone(),
          bullet
        });
        this.removeBullet(i);
        continue;
      }

      if (bullet.life <= 0 ||
          Math.abs(bullet.position.x) > 25 ||
          Math.abs(bullet.position.y) > 15 ||
          Math.abs(bullet.position.z) > 15) {
        this.removeBullet(i);
      }
    }

    for (let i = this.pendingExplosions.length - 1; i >= 0; i--) {
      const pe = this.pendingExplosions[i];
      pe.elapsed += deltaTime;
      if (pe.elapsed >= pe.delay) {
        this.createExplosion(pe.position);
        this.pendingExplosions.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      this.tempVecA.copy(p.velocity).multiplyScalar(deltaTime);
      p.position.add(this.tempVecA);
      p.mesh.position.copy(p.position);

      p.mesh.rotation.x += p.rotationSpeed.x * deltaTime;
      p.mesh.rotation.y += p.rotationSpeed.y * deltaTime;
      p.mesh.rotation.z += p.rotationSpeed.z * deltaTime;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const t = Math.max(0, p.life / p.maxLife);
      const fadeT = t * t;
      mat.opacity = fadeT;
      this.tempVecA.copy(p.startColor).lerp(p.endColor, 1 - t);
      mat.color.copy(this.tempVecA);
      const scale = fadeT;
      p.mesh.scale.setScalar(scale);

      if (p.life <= 0 || scale < 0.01) {
        p.mesh.visible = false;
        this.removeParticle(i);
      }
    }
  }

  private updateBulletTrail(
    bullet: Bullet,
    oldPos: THREE.Vector3,
    newPos: THREE.Vector3,
    delta: number
  ): void {
    const positions = bullet.trailPositions;
    const last = positions[positions.length - 1];
    const dist = last.distanceTo(newPos);

    if (dist > 0.05) {
      positions.push(newPos.clone());
      if (positions.length > 20) {
        positions.shift();
      }
    }

    if (positions.length >= 2) {
      const trailGeo = bullet.trail.geometry as THREE.BufferGeometry;
      trailGeo.setFromPoints(positions);
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.computeBoundingSphere();
    }

    const lifeRatio = Math.max(0, bullet.life / bullet.maxLife);
    const fadeAlpha = Math.min(1, bullet.age / 1.5);
    const mat = bullet.trail.material as THREE.LineBasicMaterial;
    mat.opacity = 0.5 * lifeRatio * fadeAlpha;
  }

  private removeBullet(index: number): void {
    const bullet = this.bullets[index];
    this.scene.remove(bullet.mesh);
    this.scene.remove(bullet.trail);
    this.removeCollisionSphere(bullet);

    const trailGeo = bullet.trail.geometry as THREE.BufferGeometry;
    trailGeo.dispose();
    const trailMat = bullet.trail.material as THREE.Material;
    trailMat.dispose();

    const bulletMat = bullet.mesh.material as THREE.Material;
    bulletMat.dispose();
    const glowMat = bullet.glow.material as THREE.Material;
    glowMat.dispose();
    bullet.glow.geometry.dispose();

    this.bullets.splice(index, 1);
  }

  private removeParticle(index: number): void {
    const p = this.particles[index];
    this.scene.remove(p.mesh);
    const mat = p.mesh.material as THREE.Material;
    mat.dispose();
    this.particles.splice(index, 1);
  }

  public clearBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.removeBullet(i);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.removeParticle(i);
    }
    this.lastFireTime = 0;
    this.spiralAngle = 0;
  }

  public getBulletCount(): number {
    return this.bullets.length;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public dispose(): void {
    this.clearBullets();
    this.bulletGeometry.dispose();
    this.bulletMaterial.dispose();
    this.glowMaterial.dispose();
    this.trailMaterial.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
