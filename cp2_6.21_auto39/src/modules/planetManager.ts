import * as THREE from 'three';
import { eventBus } from '@/utils/eventBus';

export interface PlanetData {
  name: string;
  nameCN: string;
  color: number;
  orbitRadius: number;
  diameter: number;
  orbitSpeed: number;
  rotationSpeed: number;
  axialTilt: number;
  hasRings?: boolean;
  textureType?: 'gas' | 'rocky' | 'ice';
}

export interface PlanetObject {
  data: PlanetData;
  group: THREE.Group;
  mesh: THREE.Mesh;
  ring?: THREE.Mesh;
  label: THREE.Sprite;
  hoverRing: THREE.Mesh;
  orbitLine: THREE.Line;
  angle: number;
  originalPosition: THREE.Vector3;
  realisticMaterial: THREE.MeshStandardMaterial;
  cartoonMaterial: THREE.MeshStandardMaterial;
  wireframeMaterial: THREE.MeshBasicMaterial;
  currentMaterial: THREE.Material;
  normalMap?: THREE.Texture;
}

const CARTOON_COLORS = [
  0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4,
  0xFFEAA7, 0xDDA0DD, 0x98D8C8, 0xF7DC6F,
];

export class PlanetManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private planets: Map<string, PlanetObject> = new Map();
  private planetList: PlanetData[] = [];
  private selectedPlanets: string[] = [];
  private textureStyle: 'realistic' | 'cartoon' | 'wireframe' = 'realistic';
  private isCompareMode: boolean = false;
  private textureTransitionProgress: number = 1;
  private textureTransitionDuration: number = 0.4;
  private isTransitioning: boolean = false;
  private orbitSpeedTarget: number = 1;
  private orbitSpeedCurrent: number = 1;
  private orbitSpeedStart: number = 1;
  private rotationSpeedTarget: number = 1;
  private rotationSpeedCurrent: number = 1;
  private rotationSpeedStart: number = 1;
  private speedTransitionDuration: number = 0.2;
  private speedTransitionProgress: number = 1;
  private isSpeedTransitioning: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.initPlanetData();
    this.createPlanets();
    this.setupEventListeners();
  }

  private initPlanetData(): void {
    const minDiameter = 0.2;
    const maxDiameter = 2;

    const realDiameters: Record<string, number> = {
      mercury: 0.38,
      venus: 0.95,
      earth: 1,
      mars: 0.53,
      jupiter: 11.2,
      saturn: 9.45,
      uranus: 4.01,
      neptune: 3.88,
    };

    const maxRealDiameter = Math.max(...Object.values(realDiameters));
    const minRealDiameter = Math.min(...Object.values(realDiameters));

    const scaleDiameter = (real: number): number => {
      const normalized = (real - minRealDiameter) / (maxRealDiameter - minRealDiameter);
      return minDiameter + normalized * (maxDiameter - minDiameter);
    };

    this.planetList = [
      {
        name: 'mercury',
        nameCN: '水星',
        color: 0xB5B5B5,
        orbitRadius: 5,
        diameter: scaleDiameter(realDiameters.mercury),
        orbitSpeed: 0.8,
        rotationSpeed: 0.02,
        axialTilt: 0.03,
        textureType: 'rocky',
      },
      {
        name: 'venus',
        nameCN: '金星',
        color: 0xE6C87A,
        orbitRadius: 9,
        diameter: scaleDiameter(realDiameters.venus),
        orbitSpeed: 0.6,
        rotationSpeed: 0.01,
        axialTilt: 3.09,
        textureType: 'rocky',
      },
      {
        name: 'earth',
        nameCN: '地球',
        color: 0x6B93D6,
        orbitRadius: 13,
        diameter: scaleDiameter(realDiameters.earth),
        orbitSpeed: 0.5,
        rotationSpeed: 0.1,
        axialTilt: 23.44,
        textureType: 'rocky',
      },
      {
        name: 'mars',
        nameCN: '火星',
        color: 0xC1440E,
        orbitRadius: 17,
        diameter: scaleDiameter(realDiameters.mars),
        orbitSpeed: 0.4,
        rotationSpeed: 0.09,
        axialTilt: 25.19,
        textureType: 'rocky',
      },
      {
        name: 'jupiter',
        nameCN: '木星',
        color: 0xD8CA9D,
        orbitRadius: 22,
        diameter: scaleDiameter(realDiameters.jupiter),
        orbitSpeed: 0.2,
        rotationSpeed: 0.3,
        axialTilt: 3.13,
        textureType: 'gas',
      },
      {
        name: 'saturn',
        nameCN: '土星',
        color: 0xF4D59E,
        orbitRadius: 26,
        diameter: scaleDiameter(realDiameters.saturn),
        orbitSpeed: 0.15,
        rotationSpeed: 0.25,
        axialTilt: 26.73,
        hasRings: true,
        textureType: 'gas',
      },
      {
        name: 'uranus',
        nameCN: '天王星',
        color: 0xD1E7E7,
        orbitRadius: 28,
        diameter: scaleDiameter(realDiameters.uranus),
        orbitSpeed: 0.1,
        rotationSpeed: 0.15,
        axialTilt: 97.77,
        textureType: 'ice',
      },
      {
        name: 'neptune',
        nameCN: '海王星',
        color: 0x5B5DDF,
        orbitRadius: 30,
        diameter: scaleDiameter(realDiameters.neptune),
        orbitSpeed: 0.08,
        rotationSpeed: 0.14,
        axialTilt: 28.32,
        textureType: 'ice',
      },
    ];
  }

  private generateProceduralTexture(data: PlanetData): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    if (data.textureType === 'gas') {
      this.generateGasGiantTexture(ctx, canvas.width, canvas.height, data.color);
    } else if (data.textureType === 'ice') {
      this.generateIceGiantTexture(ctx, canvas.width, canvas.height, data.color);
    } else {
      this.generateRockyTexture(ctx, canvas.width, canvas.height, data.color);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private generateNormalMap(data: PlanetData): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const noise = this.generateNoise(canvas.width, canvas.height, 6);

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const n = noise[y][x] * 255;
        imageData.data[idx] = 128 + n * 0.5;
        imageData.data[idx + 1] = 128 + n * 0.5;
        imageData.data[idx + 2] = 255;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private generateNoise(width: number, height: number, octaves: number): number[][] {
    const noise: number[][] = [];
    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const baseNoise: number[][] = [];
    for (let y = 0; y < height; y++) {
      baseNoise[y] = [];
      for (let x = 0; x < width; x++) {
        baseNoise[y][x] = random() * 2 - 1;
      }
    }

    for (let y = 0; y < height; y++) {
      noise[y] = [];
      for (let x = 0; x < width; x++) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let o = 0; o < octaves; o++) {
          const sx = Math.floor((x * frequency) % width);
          const sy = Math.floor((y * frequency) % height);
          value += baseNoise[sy][sx] * amplitude;
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        noise[y][x] = value / maxValue;
      }
    }
    return noise;
  }

  private generateGasGiantTexture(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    baseColor: number
  ): void {
    const r = ((baseColor >> 16) & 255) / 255;
    const g = ((baseColor >> 8) & 255) / 255;
    const b = (baseColor & 255) / 255;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const bands = 12;
    for (let i = 0; i <= bands; i++) {
      const t = i / bands;
      const variation = Math.sin(t * Math.PI * 3 + 1) * 0.15 + Math.sin(t * Math.PI * 7 + 2) * 0.08;
      const factor = 0.7 + variation;
      const cr = Math.min(1, Math.max(0, r * factor));
      const cg = Math.min(1, Math.max(0, g * factor));
      const cb = Math.min(1, Math.max(0, b * factor));
      gradient.addColorStop(t, `rgb(${Math.floor(cr * 255)}, ${Math.floor(cg * 255)}, ${Math.floor(cb * 255)})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const noise = this.generateNoise(width, height, 4);
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const n = noise[y][x] * 30;
        imageData.data[idx] = Math.min(255, Math.max(0, imageData.data[idx] + n));
        imageData.data[idx + 1] = Math.min(255, Math.max(0, imageData.data[idx + 1] + n));
        imageData.data[idx + 2] = Math.min(255, Math.max(0, imageData.data[idx + 2] + n));
      }
    }
    ctx.putImageData(imageData, 0, 0);

    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 5 + Math.random() * 30;
      const alpha = 0.05 + Math.random() * 0.1;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private generateRockyTexture(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    baseColor: number
  ): void {
    const r = ((baseColor >> 16) & 255) / 255;
    const g = ((baseColor >> 8) & 255) / 255;
    const b = (baseColor & 255) / 255;

    ctx.fillStyle = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
    ctx.fillRect(0, 0, width, height);

    const noise = this.generateNoise(width, height, 6);
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const n = noise[y][x] * 60;
        imageData.data[idx] = Math.min(255, Math.max(0, imageData.data[idx] + n));
        imageData.data[idx + 1] = Math.min(255, Math.max(0, imageData.data[idx + 1] + n));
        imageData.data[idx + 2] = Math.min(255, Math.max(0, imageData.data[idx + 2] + n));
      }
    }
    ctx.putImageData(imageData, 0, 0);

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 2 + Math.random() * 8;
      const darkness = 0.3 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private generateIceGiantTexture(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    baseColor: number
  ): void {
    const r = ((baseColor >> 16) & 255) / 255;
    const g = ((baseColor >> 8) & 255) / 255;
    const b = (baseColor & 255) / 255;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const bands = 8;
    for (let i = 0; i <= bands; i++) {
      const t = i / bands;
      const variation = Math.sin(t * Math.PI * 2) * 0.1;
      const factor = 0.85 + variation;
      const cr = Math.min(1, Math.max(0, r * factor));
      const cg = Math.min(1, Math.max(0, g * factor));
      const cb = Math.min(1, Math.max(0, b * factor));
      gradient.addColorStop(t, `rgb(${Math.floor(cr * 255)}, ${Math.floor(cg * 255)}, ${Math.floor(cb * 255)})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const noise = this.generateNoise(width, height, 5);
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const n = noise[y][x] * 20;
        imageData.data[idx] = Math.min(255, Math.max(0, imageData.data[idx] + n));
        imageData.data[idx + 1] = Math.min(255, Math.max(0, imageData.data[idx + 1] + n));
        imageData.data[idx + 2] = Math.min(255, Math.max(0, imageData.data[idx + 2] + n));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, 128, 32);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }

  private createOrbitLine(radius: number): THREE.Line {
    const segments = 128;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.15,
    });

    return new THREE.Line(geometry, material);
  }

  private createHoverRing(diameter: number): THREE.Mesh {
    const ringGeometry = new THREE.RingGeometry(
      diameter / 2 + 0.3,
      diameter / 2 + 0.3 + 0.08,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.targetOpacity = 0;
    return ring;
  }

  private createSaturnRings(diameter: number): THREE.Mesh {
    const innerRadius = diameter / 2 + 0.15;
    const outerRadius = diameter / 2 + 0.6;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const gray = 0.5 + Math.sin(t * Math.PI * 5) * 0.3;
      gradient.addColorStop(t, `rgba(${Math.floor(gray * 255)}, ${Math.floor(gray * 240)}, ${Math.floor(gray * 200)}, 0.8)`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);

    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
    const ringMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.5;
    return ring;
  }

  private darkenColor(hex: number, amount: number): number {
    const r = Math.max(0, ((hex >> 16) & 255) * (1 - amount));
    const g = Math.max(0, ((hex >> 8) & 255) * (1 - amount));
    const b = Math.max(0, (hex & 255) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private createPlanets(): void {
    this.planetList.forEach((data, index) => {
      const group = new THREE.Group();
      group.userData.isPlanet = true;
      group.userData.planetData = data;

      const realisticTexture = this.generateProceduralTexture(data);
      const normalMap = this.generateNormalMap(data);

      const geometry = new THREE.SphereGeometry(data.diameter / 2, 48, 32);

      const realisticMaterial = new THREE.MeshStandardMaterial({
        map: realisticTexture,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.7,
        metalness: 0.1,
      });

      const cartoonColor = CARTOON_COLORS[index % CARTOON_COLORS.length];
      const cartoonMaterial = new THREE.MeshStandardMaterial({
        color: cartoonColor,
        emissive: this.darkenColor(cartoonColor, 0.7),
        emissiveIntensity: 0.3,
        roughness: 0.5,
        metalness: 0.2,
      });

      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF88,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, realisticMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.isPlanetMesh = true;
      group.add(mesh);

      if (data.hasRings) {
        const ring = this.createSaturnRings(data.diameter);
        group.add(ring);
      }

      const orbitLine = this.createOrbitLine(data.orbitRadius);
      this.scene.add(orbitLine);

      const label = this.createLabel(data.nameCN);
      label.position.y = data.diameter / 2 + 0.8;
      group.add(label);

      const hoverRing = this.createHoverRing(data.diameter);
      hoverRing.position.y = 0.01;
      group.add(hoverRing);

      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * data.orbitRadius;
      const z = Math.sin(angle) * data.orbitRadius;

      group.position.set(x, 0, z);
      group.rotation.z = (data.axialTilt * Math.PI) / 180;

      const planetObj: PlanetObject = {
        data,
        group,
        mesh,
        label,
        hoverRing,
        orbitLine,
        angle,
        originalPosition: new THREE.Vector3(x, 0, z),
        realisticMaterial,
        cartoonMaterial,
        wireframeMaterial,
        currentMaterial: realisticMaterial,
        normalMap,
      };

      if (data.hasRings) {
        planetObj.ring = group.children.find(
          (c) => c instanceof THREE.Mesh && c !== mesh && c !== hoverRing
        ) as THREE.Mesh;
      }

      this.planets.set(data.name, planetObj);
      this.scene.add(group);
    });
  }

  private setupEventListeners(): void {
    eventBus.on('beforeRender', (deltaTime: number) => {
      this.update(deltaTime);
    });

    eventBus.on('orbitSpeedChange', (speed: number) => {
      this.orbitSpeedStart = this.orbitSpeedCurrent;
      this.orbitSpeedTarget = speed;
      this.isSpeedTransitioning = true;
      this.speedTransitionProgress = 0;
    });

    eventBus.on('rotationSpeedChange', (speed: number) => {
      this.rotationSpeedStart = this.rotationSpeedCurrent;
      this.rotationSpeedTarget = speed;
      this.isSpeedTransitioning = true;
      this.speedTransitionProgress = 0;
    });

    eventBus.on('planetSelected', (planetName: string) => {
      this.selectPlanet(planetName);
    });

    eventBus.on('planetDeselected', (planetName: string) => {
      this.deselectPlanet(planetName);
    });

    eventBus.on('textureStyleChange', (style: 'realistic' | 'cartoon' | 'wireframe') => {
      this.changeTextureStyle(style);
    });

    eventBus.on('enterCompareMode', () => {
      this.enterCompareMode();
    });

    eventBus.on('exitCompareMode', () => {
      this.exitCompareMode();
    });

    eventBus.on('planetHover', (planetData: PlanetData) => {
      this.showHoverRing(planetData.name);
    });

    eventBus.on('planetHoverOut', (planetData: PlanetData) => {
      this.hideHoverRing(planetData.name);
    });

    eventBus.on('planetClicked', (planetData: PlanetData) => {
      this.highlightPlanet(planetData.name);
    });

    eventBus.on('cameraFlightComplete', () => {
      this.enhanceDetailView();
    });
  }

  private update(deltaTime: number): void {
    this.updateSpeedTransition(deltaTime);

    const orbitSpeed = this.orbitSpeedCurrent;
    const rotationSpeed = this.rotationSpeedCurrent;

    this.planets.forEach((planet) => {
      if (!this.isCompareMode) {
        planet.angle += planet.data.orbitSpeed * orbitSpeed * deltaTime;
        const x = Math.cos(planet.angle) * planet.data.orbitRadius;
        const z = Math.sin(planet.angle) * planet.data.orbitRadius;
        planet.group.position.x = x;
        planet.group.position.z = z;
        planet.originalPosition.set(x, 0, z);
      }

      planet.mesh.rotation.y += planet.data.rotationSpeed * rotationSpeed * deltaTime;

      const hoverMat = planet.hoverRing.material as THREE.MeshBasicMaterial;
      const targetOpacity = planet.hoverRing.userData.targetOpacity || 0;
      hoverMat.opacity += (targetOpacity - hoverMat.opacity) * deltaTime * 3;
    });

    this.updateTextureTransition(deltaTime);
  }

  private updateSpeedTransition(deltaTime: number): void {
    if (!this.isSpeedTransitioning) return;

    this.speedTransitionProgress += deltaTime / this.speedTransitionDuration;

    if (this.speedTransitionProgress >= 1) {
      this.speedTransitionProgress = 1;
      this.isSpeedTransitioning = false;
      this.orbitSpeedCurrent = this.orbitSpeedTarget;
      this.rotationSpeedCurrent = this.rotationSpeedTarget;
      return;
    }

    const t = this.speedTransitionProgress;
    this.orbitSpeedCurrent = this.lerp(this.orbitSpeedStart, this.orbitSpeedTarget, t);
    this.rotationSpeedCurrent = this.lerp(this.rotationSpeedStart, this.rotationSpeedTarget, t);
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private updateTextureTransition(deltaTime: number): void {
    if (!this.isTransitioning) return;

    this.textureTransitionProgress += deltaTime / this.textureTransitionDuration;

    if (this.textureTransitionProgress >= 1) {
      this.isTransitioning = false;
      this.textureTransitionProgress = 1;
      this.finishTextureTransition();
      return;
    }

    const t = this.textureTransitionProgress;
    const fadeOut = t < 0.5 ? t * 2 : 2 - t * 2;

    this.planets.forEach((planet) => {
      const mat = planet.currentMaterial as THREE.MeshStandardMaterial;
      if (mat.opacity !== undefined) {
        mat.opacity = fadeOut;
        mat.transparent = true;
      }
    });
  }

  private finishTextureTransition(): void {
    this.planets.forEach((planet) => {
      let newMaterial: THREE.Material;

      switch (this.textureStyle) {
        case 'cartoon':
          newMaterial = planet.cartoonMaterial;
          break;
        case 'wireframe':
          newMaterial = planet.wireframeMaterial;
          break;
        default:
          newMaterial = planet.realisticMaterial;
      }

      planet.mesh.material = newMaterial;
      planet.currentMaterial = newMaterial;

      const stdMat = newMaterial as THREE.MeshStandardMaterial;
      if (stdMat.opacity !== undefined) {
        stdMat.opacity = 1;
        stdMat.transparent = false;
      }
    });
  }

  private changeTextureStyle(style: 'realistic' | 'cartoon' | 'wireframe'): void {
    if (this.textureStyle === style) return;

    this.textureStyle = style;
    this.textureTransitionProgress = 0;
    this.isTransitioning = true;

    setTimeout(() => {
      this.planets.forEach((planet) => {
        let newMaterial: THREE.Material;

        switch (style) {
          case 'cartoon':
            newMaterial = planet.cartoonMaterial;
            break;
          case 'wireframe':
            newMaterial = planet.wireframeMaterial;
            break;
          default:
            newMaterial = planet.realisticMaterial;
        }

        planet.mesh.material = newMaterial;
        planet.currentMaterial = newMaterial;
      });
    }, this.textureTransitionDuration * 500);
  }

  private selectPlanet(planetName: string): void {
    if (this.selectedPlanets.includes(planetName)) return;

    if (this.selectedPlanets.length < 2) {
      this.selectedPlanets.push(planetName);
    }

    const planet = this.planets.get(planetName);
    if (planet) {
      planet.orbitLine.material = new THREE.LineBasicMaterial({
        color: 0x00FF88,
        transparent: true,
        opacity: 0.4,
      });
    }

    this.updateCompareButtonState();
    this.updateInfoPanel();
  }

  private deselectPlanet(planetName: string): void {
    const idx = this.selectedPlanets.indexOf(planetName);
    if (idx > -1) {
      this.selectedPlanets.splice(idx, 1);
    }

    const planet = this.planets.get(planetName);
    if (planet) {
      planet.orbitLine.material = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.15,
      });
    }

    this.updateCompareButtonState();
    this.updateInfoPanel();
  }

  private highlightPlanet(planetName: string): void {
    eventBus.emit('planetSelected', planetName);
  }

  private showHoverRing(planetName: string): void {
    const planet = this.planets.get(planetName);
    if (planet) {
      planet.hoverRing.userData.targetOpacity = 0.4;
    }
  }

  private hideHoverRing(planetName: string): void {
    const planet = this.planets.get(planetName);
    if (planet) {
      planet.hoverRing.userData.targetOpacity = 0;
    }
  }

  private enhanceDetailView(): void {
    this.planets.forEach((planet) => {
      if (planet.realisticMaterial.normalScale) {
        planet.realisticMaterial.normalScale.set(1.5, 1.5);
      }
    });
  }

  private enterCompareMode(): void {
    if (this.selectedPlanets.length !== 2) return;

    this.isCompareMode = true;

    this.planets.forEach((planet) => {
      planet.orbitLine.visible = false;
    });

    const [name1, name2] = this.selectedPlanets;
    const planet1 = this.planets.get(name1)!;
    const planet2 = this.planets.get(name2)!;

    planet1.group.position.set(-1.5, 0, 0);
    planet2.group.position.set(1.5, 0, 0);

    this.planets.forEach((planet) => {
      if (planet !== planet1 && planet !== planet2) {
        planet.group.visible = false;
      }
    });

    eventBus.emit('compareDataReady', this.getCompareData());
  }

  private exitCompareMode(): void {
    this.isCompareMode = false;

    this.planets.forEach((planet) => {
      planet.orbitLine.visible = true;
      planet.group.visible = true;
      planet.group.position.copy(planet.originalPosition);
    });
  }

  private updateCompareButtonState(): void {
    eventBus.emit('compareButtonState', this.selectedPlanets.length === 2);
  }

  private updateInfoPanel(): void {
    if (this.selectedPlanets.length === 0) {
      eventBus.emit('infoPanelUpdate', null);
    } else if (this.selectedPlanets.length === 1) {
      const planet = this.planets.get(this.selectedPlanets[0]);
      if (planet) {
        eventBus.emit('infoPanelUpdate', planet.data);
      }
    }
  }

  public getCompareData(): { planet1: PlanetData; planet2: PlanetData; ratios: any } | null {
    if (this.selectedPlanets.length !== 2) return null;

    const p1 = this.planets.get(this.selectedPlanets[0])!.data;
    const p2 = this.planets.get(this.selectedPlanets[1])!.data;

    return {
      planet1: p1,
      planet2: p2,
      ratios: {
        diameter: p1.diameter / p2.diameter,
        orbitPeriod: p2.orbitSpeed / p1.orbitSpeed,
        axialTiltDiff: Math.abs(p1.axialTilt - p2.axialTilt),
      },
    };
  }

  public getPlanetList(): PlanetData[] {
    return [...this.planetList];
  }

  public getPlanetMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.planets.forEach((planet) => {
      meshes.push(planet.mesh);
    });
    return meshes;
  }

  public getSelectedPlanets(): string[] {
    return [...this.selectedPlanets];
  }

  public getPlanetByName(name: string): PlanetObject | undefined {
    return this.planets.get(name);
  }

  public dispose(): void {
    this.planets.forEach((planet) => {
      this.scene.remove(planet.group);
      this.scene.remove(planet.orbitLine);
      planet.mesh.geometry.dispose();
      (planet.mesh.material as THREE.Material).dispose();
      planet.realisticMaterial.dispose();
      planet.cartoonMaterial.dispose();
      planet.wireframeMaterial.dispose();
      if (planet.realisticMaterial.map) planet.realisticMaterial.map.dispose();
      if (planet.normalMap) planet.normalMap.dispose();
      planet.orbitLine.geometry.dispose();
      (planet.orbitLine.material as THREE.Material).dispose();
    });
    this.planets.clear();
  }
}

export default PlanetManager;
