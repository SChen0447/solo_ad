import * as THREE from 'three';

interface BurstParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface TrailPoint {
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private burstParticles: BurstParticle[] = [];
  private maxBurstParticles = 200;
  private trailPoints: TrailPoint[] = [];
  private trailLine: THREE.Line;
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.LineBasicMaterial;
  private static MAX_TRAIL_POINTS = 300;
  private static TRAIL_LIFE = 3.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      linewidth: 1
    });
    this.trailLine = new THREE.Line(this.trailGeometry, this.trailMaterial);
    this.trailLine.frustumCulled = false;
    this.scene.add(this.trailLine);
  }

  public spawnBurst(position: THREE.Vector3, color: THREE.Color, count: number = 100): void {
    const availableSlots = this.maxBurstParticles - this.burstParticles.length;
    const actualCount = Math.min(count, Math.max(0, availableSlots + Math.floor(count * 0.3)));

    for (let i = 0; i < actualCount; i++) {
      if (this.burstParticles.length >= this.maxBurstParticles) {
        const oldest = this.burstParticles.shift();
        if (oldest) {
          this.scene.remove(oldest.mesh);
          (oldest.mesh.geometry as THREE.BufferGeometry).dispose();
          (oldest.mesh.material as THREE.Material).dispose();
        }
      }

      const size = 0.04 + Math.random() * 0.08;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const speed = 2.5 + Math.random() * 5;
      const velocity = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * speed,
        Math.abs(Math.cos(theta)) * speed * 0.8 + 1,
        Math.sin(theta) * Math.sin(phi) * speed
      );

      this.scene.add(mesh);
      this.burstParticles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 1.5 + Math.random() * 0.8
      });
    }
  }

  public addTrailPoint(position: THREE.Vector3, color: THREE.Color): void {
    const pos = position.clone();
    pos.y -= 0.15;
    this.trailPoints.push({
      position: pos,
      life: 0,
      maxLife: ParticleSystem.TRAIL_LIFE,
      color: color.clone()
    });
    if (this.trailPoints.length > ParticleSystem.MAX_TRAIL_POINTS) {
      this.trailPoints.shift();
    }
  }

  public update(delta: number): void {
    this.updateBurstParticles(delta);
    this.updateTrail(delta);
  }

  private updateBurstParticles(delta: number): void {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        (p.mesh.geometry as THREE.BufferGeometry).dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.burstParticles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 9.8 * delta * 0.5;
      p.velocity.multiplyScalar(1 - delta * 1.2);
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));

      const t = 1 - p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = t;
      const s = 0.6 + t * 0.4;
      p.mesh.scale.setScalar(s);
    }
  }

  private updateTrail(delta: number): void {
    for (const tp of this.trailPoints) {
      tp.life += delta;
    }
    while (this.trailPoints.length > 0 && this.trailPoints[0].life >= this.trailPoints[0].maxLife) {
      this.trailPoints.shift();
    }

    const count = this.trailPoints.length;
    if (count < 2) {
      this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
      this.trailGeometry.setIndex([]);
      return;
    }

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const tp = this.trailPoints[i];
      positions[i * 3] = tp.position.x;
      positions[i * 3 + 1] = tp.position.y;
      positions[i * 3 + 2] = tp.position.z;

      const t = 1 - tp.life / tp.maxLife;
      colors[i * 3] = tp.color.r * t;
      colors[i * 3 + 1] = tp.color.g * t;
      colors[i * 3 + 2] = tp.color.b * t;
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trailMaterial.vertexColors = true;
    this.trailMaterial.opacity = 0.9;
    this.trailMaterial.linewidth = 1;
  }

  public dispose(): void {
    for (const p of this.burstParticles) {
      this.scene.remove(p.mesh);
      (p.mesh.geometry as THREE.BufferGeometry).dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.burstParticles = [];
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.scene.remove(this.trailLine);
  }
}
