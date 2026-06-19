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
  public orbitLine: THREE.LineLoop | null = null;

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
        opacity: 0.6,
        depthWrite: false
      });
      this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
      this.ring.renderOrder = 1;
      this.ring.rotation.x = -Math.PI / 2.5;
      this.mesh.add(this.ring);
    }

    this.updatePosition(0);
  }

  private generateNoiseTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const color = new THREE.Color(this.color);
    const baseR = Math.floor(color.r * 255);
    const baseG = Math.floor(color.g * 255);
    const baseB = Math.floor(color.b * 255);

    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    const darkerColor = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.15));
    const lighterColor = new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + 0.15));
    const darkR = Math.floor(darkerColor.r * 255);
    const darkG = Math.floor(darkerColor.g * 255);
    const darkB = Math.floor(darkerColor.b * 255);
    const lightR = Math.floor(lighterColor.r * 255);
    const lightG = Math.floor(lighterColor.g * 255);
    const lightB = Math.floor(lighterColor.b * 255);

    const lowFreqNoise: number[][] = [];
    const lowSize = 32;
    for (let y = 0; y < lowSize; y++) {
      lowFreqNoise[y] = [];
      for (let x = 0; x < lowSize * 2; x++) {
        lowFreqNoise[y][x] = Math.random();
      }
    }

    const midFreqNoise: number[][] = [];
    const midSize = 64;
    for (let y = 0; y < midSize; y++) {
      midFreqNoise[y] = [];
      for (let x = 0; x < midSize * 2; x++) {
        midFreqNoise[y][x] = Math.random();
      }
    }

    function smoothNoise(noiseGrid: number[][], x: number, y: number): number {
      const gw = noiseGrid[0].length;
      const gh = noiseGrid.length;
      const xi = Math.floor(x) % gw;
      const yi = Math.floor(y) % gh;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const x2 = (xi + 1) % gw;
      const y2 = (yi + 1) % gh;
      const tl = noiseGrid[yi][xi];
      const tr = noiseGrid[yi][x2];
      const bl = noiseGrid[y2][xi];
      const br = noiseGrid[y2][x2];
      const top = tl + (tr - tl) * xf;
      const bot = bl + (br - bl) * xf;
      return top + (bot - top) * yf;
    }

    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 512; x++) {
        const latY = y / 256;
        const latFactor = Math.cos((latY - 0.5) * Math.PI);

        const lfx = (x / 512) * lowSize * 2;
        const lfy = (y / 256) * lowSize;
        const lowNoise = smoothNoise(lowFreqNoise, lfx, lfy);

        const mfx = (x / 512) * midSize * 2;
        const mfy = (y / 256) * midSize;
        const midNoise = smoothNoise(midFreqNoise, mfx, mfy);

        const highNoise = Math.random();

        const combinedNoise = lowNoise * 0.5 + midNoise * 0.35 + highNoise * 0.15;
        const noiseOffset = (combinedNoise - 0.5) * 90;

        let r = baseR + noiseOffset;
        let g = baseG + noiseOffset;
        let b = baseB + noiseOffset;

        if (lowNoise > 0.6) {
          r = r + (lightR - baseR) * 0.5;
          g = g + (lightG - baseG) * 0.5;
          b = b + (lightB - baseB) * 0.5;
        } else if (lowNoise < 0.4) {
          r = r + (darkR - baseR) * 0.5;
          g = g + (darkG - baseG) * 0.5;
          b = b + (darkB - baseB) * 0.5;
        }

        r = r * (0.85 + latFactor * 0.3);
        g = g * (0.85 + latFactor * 0.3);
        b = b * (0.85 + latFactor * 0.3);

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  public createOrbitLine(): THREE.LineLoop {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * this.orbitRadius,
        0,
        Math.sin(theta) * this.orbitRadius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitColor = new THREE.Color(this.color);
    const material = new THREE.LineBasicMaterial({
      color: orbitColor,
      transparent: true,
      opacity: 0.25,
      linewidth: 1
    });
    this.orbitLine = new THREE.LineLoop(geometry, material);
    return this.orbitLine;
  }

  public updateOrbitLine(): void {
    if (!this.orbitLine) return;
    const positions: number[] = [];
    const segments = 128;
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        Math.cos(theta) * this.orbitRadius,
        0,
        Math.sin(theta) * this.orbitRadius
      );
    }
    const geo = this.orbitLine.geometry as THREE.BufferGeometry;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.attributes.position.needsUpdate = true;
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
