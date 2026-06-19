import * as THREE from 'three';

export interface PlanetConfig {
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  radius: number;
  hasRing?: boolean;
  initialAngle?: number;
}

export class Planet {
  public name: string;
  public orbitRadius: number;
  public orbitSpeed: number;
  public color: string;
  public radius: number;
  public angle: number;
  public mesh: THREE.Mesh;
  public ring: THREE.Mesh | null = null;
  public orbitLine: THREE.Line | null = null;

  private baseOrbitRadius: number;
  private baseOrbitSpeed: number;

  constructor(config: PlanetConfig) {
    this.name = config.name;
    this.orbitRadius = config.orbitRadius;
    this.orbitSpeed = config.orbitSpeed;
    this.color = config.color;
    this.radius = config.radius;
    this.angle = config.initialAngle ?? Math.random() * Math.PI * 2;
    this.baseOrbitRadius = config.orbitRadius;
    this.baseOrbitSpeed = config.orbitSpeed;

    const texture = this.generateNoiseTexture();
    const geometry = new THREE.SphereGeometry(this.radius, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      map: texture,
      roughness: 0.8,
      metalness: 0.1
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData = { planet: this };

    if (config.hasRing) {
      const ringGeometry = new THREE.RingGeometry(this.radius * 1.4, this.radius * 2.2, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xd4c4a8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
      this.ring.rotation.x = -Math.PI / 2.5;
      this.mesh.add(this.ring);
    }

    this.updatePosition(0);
  }

  private generateNoiseTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const color = new THREE.Color(this.color);
    const baseR = Math.floor(color.r * 255);
    const baseG = Math.floor(color.g * 255);
    const baseB = Math.floor(color.b * 255);

    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const noise = (Math.random() - 0.5) * 40;
        const r = Math.max(0, Math.min(255, baseR + noise));
        const g = Math.max(0, Math.min(255, baseG + noise));
        const b = Math.max(0, Math.min(255, baseB + noise));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public createOrbitLine(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * this.orbitRadius,
        0,
        Math.sin(theta) * this.orbitRadius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5
    });
    this.orbitLine = new THREE.Line(geometry, material);
    return this.orbitLine;
  }

  public updateOrbitLine(): void {
    if (!this.orbitLine) return;
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * this.orbitRadius,
        0,
        Math.sin(theta) * this.orbitRadius
      ));
    }
    (this.orbitLine.geometry as THREE.BufferGeometry).setFromPoints(points);
  }

  public updatePosition(deltaTime: number): void {
    this.angle += this.orbitSpeed * deltaTime;
    const x = Math.cos(this.angle) * this.orbitRadius;
    const z = Math.sin(this.angle) * this.orbitRadius;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y += deltaTime * 0.5;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public setOrbitRadiusMultiplier(multiplier: number): void {
    this.orbitRadius = this.baseOrbitRadius * multiplier;
    this.updateOrbitLine();
  }

  public setOrbitSpeedMultiplier(multiplier: number): void {
    this.orbitSpeed = this.baseOrbitSpeed * multiplier;
  }

  public getOrbitRadiusMultiplier(): number {
    return this.orbitRadius / this.baseOrbitRadius;
  }

  public getOrbitSpeedMultiplier(): number {
    return this.orbitSpeed / this.baseOrbitSpeed;
  }

  public getBaseOrbitRadius(): number {
    return this.baseOrbitRadius;
  }

  public getBaseOrbitSpeed(): number {
    return this.baseOrbitSpeed;
  }
}
