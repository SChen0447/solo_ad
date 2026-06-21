import * as THREE from 'three';
import { Orbit } from './Orbit';

export interface PlanetData {
  name: string;
  nameCn: string;
  diameter: string;
  period: string;
  distanceFromSun: string;
  description: string;
  color: number;
  radius: number;
  orbitSemiMajor: number;
  orbitEccentricity: number;
  orbitalPeriodDays: number;
  axialTilt?: number;
  hasRing?: boolean;
  ringColor?: number;
  textureColors?: number[];
}

export class Planet {
  public mesh: THREE.Mesh;
  public orbit: Orbit;
  public data: PlanetData;
  public group: THREE.Group;
  public isSelected: boolean = false;

  private angle: number;
  private angularSpeed: number;
  private flashSprite: THREE.Sprite | null = null;
  private flashTimer: number = 0;
  private selectionRing: THREE.Mesh | null = null;
  private selectionScale: number = 0;
  private selectionTargetScale: number = 0;
  private lastFullOrbit: number = 0;
  private orbitCount: number = 0;

  constructor(data: PlanetData, initialAngle: number = 0) {
    this.data = data;
    this.angle = initialAngle;
    this.angularSpeed = (2 * Math.PI) / (data.orbitalPeriodDays * 0.5);

    this.group = new THREE.Group();

    this.mesh = this.createMesh();
    this.group.add(this.mesh);

    if (data.hasRing) {
      this.createRing();
    }

    this.orbit = new Orbit({
      semiMajorAxis: data.orbitSemiMajor,
      eccentricity: data.orbitEccentricity,
      color: data.color,
      opacity: 0.2,
    });

    this.updatePosition(0);
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(
      Math.max(0.01, this.data.radius),
      32,
      24
    );

    const material = this.createMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { planetData: this.data, planet: this };

    if (this.data.axialTilt) {
      mesh.rotation.z = THREE.MathUtils.degToRad(this.data.axialTilt);
    }

    return mesh;
  }

  private createMaterial(): THREE.MeshStandardMaterial {
    const baseColor = new THREE.Color(this.data.color);

    if (this.data.textureColors && this.data.textureColors.length > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      const gradient = ctx.createLinearGradient(0, 0, 0, 128);
      const colors = this.data.textureColors;
      colors.forEach((c, i) => {
        gradient.addColorStop(i / (colors.length - 1), `#${c.toString(16).padStart(6, '0')}`);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 128);

      if (this.data.nameCn === '木星') {
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 8; i++) {
          const y = 10 + i * 14 + Math.random() * 6;
          ctx.fillStyle = i % 2 === 0 ? '#c4a35a' : '#a8863a';
          ctx.fillRect(0, y, 256, 4 + Math.random() * 4);
        }
        ctx.globalAlpha = 1.0;
      }

      if (this.data.nameCn === '地球') {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#2d5a1e';
        for (let i = 0; i < 5; i++) {
          const x = 30 + Math.random() * 190;
          const y = 20 + Math.random() * 80;
          ctx.beginPath();
          ctx.ellipse(x, y, 20 + Math.random() * 25, 10 + Math.random() * 15, Math.random(), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#e8e8f0';
        ctx.fillRect(0, 0, 256, 8);
        ctx.fillRect(0, 120, 256, 8);
        ctx.globalAlpha = 1.0;
      }

      if (this.data.nameCn === '火星') {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#8b3a1a';
        for (let i = 0; i < 6; i++) {
          const x = Math.random() * 256;
          const y = Math.random() * 128;
          ctx.beginPath();
          ctx.arc(x, y, 5 + Math.random() * 12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#e8ddd0';
        ctx.fillRect(0, 0, 256, 5);
        ctx.globalAlpha = 1.0;
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      metalness: 0.15,
    });
  }

  private createRing(): void {
    const innerRadius = Math.max(0.01, this.data.radius * 1.4);
    const outerRadius = Math.max(innerRadius + 0.01, this.data.radius * 2.2);
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'rgba(200, 180, 140, 0.0)');
    gradient.addColorStop(0.15, 'rgba(210, 190, 150, 0.6)');
    gradient.addColorStop(0.35, 'rgba(180, 160, 120, 0.8)');
    gradient.addColorStop(0.5, 'rgba(160, 140, 100, 0.3)');
    gradient.addColorStop(0.65, 'rgba(190, 170, 130, 0.7)');
    gradient.addColorStop(0.85, 'rgba(170, 150, 110, 0.5)');
    gradient.addColorStop(1, 'rgba(150, 130, 90, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshStandardMaterial({
      color: this.data.ringColor ?? 0xc8b478,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    const ringMesh = new THREE.Mesh(geometry, material);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.rotation.y = THREE.MathUtils.degToRad(26.7);
    this.group.add(ringMesh);
  }

  public updatePosition(deltaTime: number): void {
    this.angle += this.angularSpeed * deltaTime;
    if (this.angle >= Math.PI * 2) {
      this.angle -= Math.PI * 2;
      this.orbitCount++;
      this.triggerFlash();
    }

    const pos = this.orbit.getOrbitPosition(this.angle);
    this.group.position.copy(pos);

    this.mesh.rotation.y += deltaTime * 0.3;
  }

  private triggerFlash(): void {
    if (this.flashSprite) {
      this.group.remove(this.flashSprite);
      this.flashSprite.material.dispose();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 220, 1.0)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 180, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 150, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.flashSprite = new THREE.Sprite(spriteMaterial);
    this.flashSprite.scale.set(this.data.radius * 4, this.data.radius * 4, 1);
    this.flashSprite.position.y = this.data.radius * 1.5;
    this.group.add(this.flashSprite);
    this.flashTimer = 1.0;
  }

  public updateFlash(deltaTime: number): void {
    if (this.flashSprite && this.flashTimer > 0) {
      this.flashTimer -= deltaTime * 2;
      this.flashSprite.material.opacity = Math.max(0, this.flashTimer);
      if (this.flashTimer <= 0) {
        this.group.remove(this.flashSprite);
        this.flashSprite.material.dispose();
        this.flashSprite = null;
      }
    }
  }

  public select(): void {
    if (this.isSelected) return;
    this.isSelected = true;
    this.selectionTargetScale = 1;

    if (!this.selectionRing) {
      const ringRadius = Math.max(0.01, this.data.radius * 1.8);
      const geometry = new THREE.RingGeometry(ringRadius, ringRadius + 0.05, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8888ff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.selectionRing = new THREE.Mesh(geometry, material);
      this.selectionRing.rotation.x = -Math.PI / 2;
      this.group.add(this.selectionRing);
    }
    this.selectionScale = 0.01;
    this.selectionRing!.visible = true;
  }

  public deselect(): void {
    this.isSelected = false;
    this.selectionTargetScale = 0;
  }

  public updateSelection(deltaTime: number): void {
    if (!this.selectionRing) return;

    const speed = 3.0;
    if (this.selectionTargetScale > this.selectionScale) {
      this.selectionScale = Math.min(this.selectionTargetScale, this.selectionScale + deltaTime * speed);
    } else if (this.selectionTargetScale < this.selectionScale) {
      this.selectionScale = Math.max(this.selectionTargetScale, this.selectionScale - deltaTime * speed * 2);
    }

    this.selectionRing.scale.set(this.selectionScale, this.selectionScale, this.selectionScale);

    if (this.selectionScale <= 0.01 && this.selectionTargetScale === 0) {
      this.selectionRing.visible = false;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.orbit.dispose();
    if (this.selectionRing) {
      this.selectionRing.geometry.dispose();
      (this.selectionRing.material as THREE.Material).dispose();
    }
    if (this.flashSprite) {
      this.flashSprite.material.dispose();
    }
  }
}
