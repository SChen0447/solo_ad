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

interface HaloParticleData {
  baseRadius: number;
  theta: number;
  phi: number;
  rotationSpeed: number;
  orbitalSpeed: number;
  pulseAmplitude: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: THREE.Color;
  baseOpacity: number;
  size: number;
  bornTime: number;
  lifetime: number;
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

  private haloParticleData: HaloParticleData[] = [];
  private haloBasePositions: Float32Array | null = null;
  private haloColors: Float32Array | null = null;
  private haloPulsePhase: number = 0;
  private glowPulsePhase: number = 0;
  private elapsedTime: number = 0;

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

    this.haloPulsePhase = Math.random() * Math.PI * 2;
    this.glowPulsePhase = Math.random() * Math.PI * 2;

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
      material = new THREE.MeshStandardMaterial({
        color: colorObj,
        emissive: colorObj,
        emissiveIntensity: 1.5,
        roughness: 0.15,
        metalness: 0.05,
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

  private createHaloParticleData(): HaloParticleData {
    const baseColors = [
      new THREE.Color('#FFF4B8'),
      new THREE.Color('#FFE066'),
      new THREE.Color('#FFD93D'),
      new THREE.Color('#FFC857'),
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#FFEAA7'),
    ];

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const baseRadius = this.radius * (1.6 + Math.random() * 1.2);

    return {
      baseRadius,
      theta,
      phi,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      orbitalSpeed: 0.3 + Math.random() * 0.8,
      pulseAmplitude: 0.1 + Math.random() * 0.3,
      pulseSpeed: 1.0 + Math.random() * 2.5,
      pulsePhase: Math.random() * Math.PI * 2,
      color: baseColors[Math.floor(Math.random() * baseColors.length)].clone(),
      baseOpacity: 0.4 + Math.random() * 0.5,
      size: 0.05 + Math.random() * 0.15,
      bornTime: this.elapsedTime + Math.random() * 2,
      lifetime: 3 + Math.random() * 5,
    };
  }

  private createStarEffects(): void {
    const glowGeometry = new THREE.SphereGeometry(this.radius * 1.7, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.color),
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.copy(this.position);

    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    this.haloBasePositions = new Float32Array(particleCount * 3);
    this.haloColors = new Float32Array(particleCount * 3);
    this.haloParticleData = [];

    for (let i = 0; i < particleCount; i++) {
      const data = this.createHaloParticleData();
      this.haloParticleData.push(data);

      const x = data.baseRadius * Math.sin(data.phi) * Math.cos(data.theta);
      const y = data.baseRadius * Math.sin(data.phi) * Math.sin(data.theta);
      const z = data.baseRadius * Math.cos(data.phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.haloBasePositions[i * 3] = x;
      this.haloBasePositions[i * 3 + 1] = y;
      this.haloBasePositions[i * 3 + 2] = z;

      colors[i * 3] = data.color.r;
      colors[i * 3 + 1] = data.color.g;
      colors[i * 3 + 2] = data.color.b;

      this.haloColors[i * 3] = data.color.r;
      this.haloColors[i * 3 + 1] = data.color.g;
      this.haloColors[i * 3 + 2] = data.color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: true,
      depthWrite: false,
    });

    this.haloParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.haloParticles.position.copy(this.position);
  }

  private respawnHaloParticle(index: number): void {
    const data = this.createHaloParticleData();
    this.haloParticleData[index] = data;

    const x = data.baseRadius * Math.sin(data.phi) * Math.cos(data.theta);
    const y = data.baseRadius * Math.sin(data.phi) * Math.sin(data.theta);
    const z = data.baseRadius * Math.cos(data.phi);

    if (this.haloBasePositions) {
      this.haloBasePositions[index * 3] = x;
      this.haloBasePositions[index * 3 + 1] = y;
      this.haloBasePositions[index * 3 + 2] = z;
    }

    if (this.haloColors) {
      this.haloColors[index * 3] = data.color.r;
      this.haloColors[index * 3 + 1] = data.color.g;
      this.haloColors[index * 3 + 2] = data.color.b;
    }
  }

  public applyForce(force: THREE.Vector3): void {
    this.acceleration.add(force.clone().divideScalar(this.mass));
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.mesh.position.copy(this.position);

    if (this.glowMesh) {
      this.glowMesh.position.copy(this.position);
      this.glowMesh.rotation.y += deltaTime * 0.15;

      this.glowPulsePhase += deltaTime * 1.5;
      const glowScale = 1 + Math.sin(this.glowPulsePhase) * 0.2;
      this.glowMesh.scale.setScalar(glowScale);
      (this.glowMesh.material as THREE.MeshBasicMaterial).opacity =
        0.2 + Math.sin(this.glowPulsePhase * 0.7) * 0.2;
    }

    if (this.haloParticles && this.haloBasePositions && this.haloColors && this.haloParticleData.length > 0) {
      this.haloParticles.position.copy(this.position);
      this.haloParticles.rotation.y += deltaTime * 0.06;
      this.haloParticles.rotation.x += deltaTime * 0.03;

      this.haloPulsePhase += deltaTime;

      const positionAttr = this.haloParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = this.haloParticles.geometry.getAttribute('color') as THREE.BufferAttribute;
      const positions = positionAttr.array as Float32Array;
      const colors = colorAttr.array as Float32Array;
      const particleCount = this.haloParticleData.length;

      let avgSize = 0;

      for (let i = 0; i < particleCount; i++) {
        const data = this.haloParticleData[i];
        const age = this.elapsedTime - data.bornTime;
        const lifeT = (age % data.lifetime) / data.lifetime;

        data.theta += data.orbitalSpeed * deltaTime * 0.3;
        data.phi += data.rotationSpeed * deltaTime * 0.1;

        const pulse = 1 + Math.sin(this.haloPulsePhase * data.pulseSpeed + data.pulsePhase) * data.pulseAmplitude;
        const r = data.baseRadius * pulse;

        const idx = i * 3;
        positions[idx] = r * Math.sin(data.phi) * Math.cos(data.theta);
        positions[idx + 1] = r * Math.sin(data.phi) * Math.sin(data.theta);
        positions[idx + 2] = r * Math.cos(data.phi);

        const fadeInOut = lifeT < 0.2
          ? lifeT / 0.2
          : lifeT > 0.8
            ? (1 - lifeT) / 0.2
            : 1;

        const dim = 0.6 + 0.4 * Math.sin(this.haloPulsePhase * 1.5 + data.pulsePhase);
        colors[idx] = data.color.r * fadeInOut * dim;
        colors[idx + 1] = data.color.g * fadeInOut * dim;
        colors[idx + 2] = data.color.b * fadeInOut * dim;

        avgSize += data.size * (0.8 + 0.4 * Math.sin(this.haloPulsePhase * data.pulseSpeed * 0.5 + data.pulsePhase));
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      const mat = this.haloParticles.material as THREE.PointsMaterial;
      avgSize /= particleCount;
      mat.size = avgSize * (1 + Math.sin(this.haloPulsePhase * 0.5) * 0.25);
      mat.opacity = 0.65 + 0.25 * Math.sin(this.haloPulsePhase * 0.4);
    }

    if (this.type === 'planet') {
      this.mesh.rotation.y += deltaTime * 0.5;
    } else if (this.type === 'star') {
      this.mesh.rotation.y += deltaTime * 0.2;
      const starMat = this.mesh.material as THREE.MeshStandardMaterial;
      starMat.emissiveIntensity = 1.2 + Math.sin(this.glowPulsePhase * 0.5) * 0.4;
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
