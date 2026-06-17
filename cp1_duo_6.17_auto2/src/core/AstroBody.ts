import * as THREE from 'three';

export type BodyType = 'planet' | 'star';

export interface BodyConfig {
  id?: string;
  type: BodyType;
  mass: number;
  radius: number;
  color: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export class AstroBody {
  public id: string;
  public type: BodyType;
  public mass: number;
  public radius: number;
  public color: string;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public acceleration: THREE.Vector3;
  public mesh: THREE.Mesh;
  public glowMesh?: THREE.Mesh;
  public haloParticles?: THREE.Points;
  public userData: { isBody: boolean; body: AstroBody };

  private static bodyCount = 0;

  constructor(config: BodyConfig, scene: THREE.Scene) {
    this.id = config.id || `body_${Date.now()}_${AstroBody.bodyCount++}`;
    this.type = config.type;
    this.mass = config.mass;
    this.radius = config.radius;
    this.color = config.color;
    this.position = new THREE.Vector3(
      config.position.x,
      config.position.y,
      config.position.z
    );
    this.velocity = new THREE.Vector3(
      config.velocity.x,
      config.velocity.y,
      config.velocity.z
    );
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.userData = { isBody: true, body: this };

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.mesh.userData = this.userData;

    if (this.type === 'star') {
      this.createStarEffects();
    }

    scene.add(this.mesh);
    if (this.glowMesh) scene.add(this.glowMesh);
    if (this.haloParticles) scene.add(this.haloParticles);
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const colorObj = new THREE.Color(this.color);

    let material: THREE.Material;
    if (this.type === 'star') {
      material = new THREE.MeshBasicMaterial({
        color: colorObj,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: colorObj,
        roughness: 0.7,
        metalness: 0.3,
        emissive: colorObj,
        emissiveIntensity: 0.1,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createStarEffects(): void {
    const glowGeometry = new THREE.SphereGeometry(this.radius * 1.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.color),
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.copy(this.position);

    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.radius * (1.8 + Math.random() * 0.8);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(this.color),
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.haloParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.haloParticles.position.copy(this.position);
  }

  public applyForce(force: THREE.Vector3): void {
    this.acceleration.add(force.clone().divideScalar(this.mass));
  }

  public update(deltaTime: number): void {
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.mesh.position.copy(this.position);

    if (this.glowMesh) {
      this.glowMesh.position.copy(this.position);
      this.glowMesh.rotation.y += deltaTime * 0.1;
    }
    if (this.haloParticles) {
      this.haloParticles.position.copy(this.position);
      this.haloParticles.rotation.y += deltaTime * 0.05;
      this.haloParticles.rotation.x += deltaTime * 0.03;
    }

    if (this.type === 'planet') {
      this.mesh.rotation.y += deltaTime * 0.5;
    }

    this.acceleration.set(0, 0, 0);
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((m) => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }

    if (this.glowMesh) {
      scene.remove(this.glowMesh);
      this.glowMesh.geometry.dispose();
      (this.glowMesh.material as THREE.Material).dispose();
    }

    if (this.haloParticles) {
      scene.remove(this.haloParticles);
      this.haloParticles.geometry.dispose();
      (this.haloParticles.material as THREE.Material).dispose();
    }
  }

  public toConfig(): BodyConfig {
    return {
      id: this.id,
      type: this.type,
      mass: this.mass,
      radius: this.radius,
      color: this.color,
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
        z: this.velocity.z,
      },
    };
  }

  public getOrbitalRadius(center: THREE.Vector3): number {
    return this.position.distanceTo(center);
  }

  public getSpeed(): number {
    return this.velocity.length();
  }

  public getAccelerationMagnitude(): number {
    return this.acceleration.length();
  }
}

export function randomPlanetColor(): string {
  const colors = [
    '#FF6B6B', '#FF8E8E', '#FFB366', '#FFD93D',
    '#6BCB77', '#4ECDC4', '#45B7D1', '#96E6A1',
    '#DDA0DD', '#FFA07A', '#87CEEB', '#F0E68C'
  ];
  const t = Math.random();
  const idx1 = Math.floor(t * (colors.length - 1));
  const idx2 = Math.min(idx1 + 1, colors.length - 1);
  const localT = (t * (colors.length - 1)) - idx1;
  return mixColors(colors[idx1], colors[idx2], localT);
}

function mixColors(color1: string, color2: string, t: number): string {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const mixed = new THREE.Color().lerpColors(c1, c2, t);
  return '#' + mixed.getHexString();
}

export function mergeBodies(
  body1: AstroBody,
  body2: AstroBody,
  scene: THREE.Scene
): AstroBody {
  const totalMass = body1.mass + body2.mass;
  const newMass = totalMass;

  const newPosition = new THREE.Vector3()
    .addScaledVector(body1.position, body1.mass / totalMass)
    .addScaledVector(body2.position, body2.mass / totalMass);

  const newVelocity = new THREE.Vector3()
    .addScaledVector(body1.velocity, body1.mass / totalMass)
    .addScaledVector(body2.velocity, body2.mass / totalMass);

  const volumeRatio = (body1.radius ** 3 + body2.radius ** 3) / (2 * Math.max(body1.radius, body2.radius) ** 3);
  const newRadius = Math.max(body1.radius, body2.radius) * Math.cbrt(1 + volumeRatio);

  const newColor = mixColors(body1.color, body2.color, body2.mass / totalMass);

  const newType: BodyType = body1.type === 'star' || body2.type === 'star' ? 'star' : 'planet';

  return new AstroBody(
    {
      type: newType,
      mass: newMass,
      radius: Math.min(newRadius, 10),
      color: newColor,
      position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
      velocity: { x: newVelocity.x, y: newVelocity.y, z: newVelocity.z },
    },
    scene
  );
}
