import * as THREE from 'three';
import { emit, on, off, type PlanetInfo, type CompareData } from '@/utils/eventBus';

export interface PlanetData {
  name: string;
  englishName: string;
  orbitRadius: number;
  diameter: number;
  color: string;
  baseOrbitSpeed: number;
  baseRotationSpeed: number;
  axialTilt: number;
  orbitPeriod: number;
  hasRing: boolean;
  textureType: 'gasGiant' | 'iceGiant' | 'rocky';
  palette: number[][];
}

export interface PlanetObject {
  data: PlanetData;
  mesh: THREE.Mesh;
  orbitGroup: THREE.Group;
  label: THREE.Object3D;
  ringMesh?: THREE.Mesh;
  originalPosition: THREE.Vector3;
  orbitAngle: number;
  rotationAngle: number;
  normalMap: THREE.Texture | null;
  textures: {
    realistic: THREE.Texture;
    cartoon: THREE.Texture;
  };
  currentMaterial: THREE.MeshStandardMaterial;
  wireframeMaterial: THREE.MeshStandardMaterial;
  cartoonMaterial: THREE.MeshStandardMaterial;
  isTransitioning: boolean;
  transitionProgress: number;
  pendingTextureStyle: 'realistic' | 'cartoon' | 'wireframe' | null;
  currentStyle: 'realistic' | 'cartoon' | 'wireframe';
  hoverRing: THREE.Mesh | null;
  hoverRingOpacity: number;
  isHovered: boolean;
}

const PLANET_DATAS: PlanetData[] = [
  {
    name: '水星', englishName: 'Mercury', orbitRadius: 5, diameter: 0.2,
    color: '#A0A0A0', baseOrbitSpeed: 4.15, baseRotationSpeed: 0.017,
    axialTilt: 0.034, orbitPeriod: 88, hasRing: false, textureType: 'rocky',
    palette: [[160,140,120],[120,110,100],[90,80,70],[180,170,160]]
  },
  {
    name: '金星', englishName: 'Venus', orbitRadius: 7, diameter: 0.4,
    color: '#E8C56D', baseOrbitSpeed: 1.62, baseRotationSpeed: -0.004,
    axialTilt: 177.4, orbitPeriod: 225, hasRing: false, textureType: 'rocky',
    palette: [[230,195,105],[200,170,90],[180,150,70],[245,220,140]]
  },
  {
    name: '地球', englishName: 'Earth', orbitRadius: 9, diameter: 0.4,
    color: '#4A90D9', baseOrbitSpeed: 1.0, baseRotationSpeed: 1.0,
    axialTilt: 23.4, orbitPeriod: 365, hasRing: false, textureType: 'rocky',
    palette: [[40,100,180],[30,130,60],[50,140,200],[240,240,230]]
  },
  {
    name: '火星', englishName: 'Mars', orbitRadius: 11, diameter: 0.3,
    color: '#C1440E', baseOrbitSpeed: 0.53, baseRotationSpeed: 0.97,
    axialTilt: 25.2, orbitPeriod: 687, hasRing: false, textureType: 'rocky',
    palette: [[193,68,14],[160,50,10],[210,120,60],[140,40,10]]
  },
  {
    name: '木星', englishName: 'Jupiter', orbitRadius: 16, diameter: 2.0,
    color: '#C88B3A', baseOrbitSpeed: 0.084, baseRotationSpeed: 2.44,
    axialTilt: 3.1, orbitPeriod: 4333, hasRing: false, textureType: 'gasGiant',
    palette: [[200,139,58],[180,120,40],[220,180,100],[160,100,50],[240,210,160]]
  },
  {
    name: '土星', englishName: 'Saturn', orbitRadius: 21, diameter: 1.7,
    color: '#E8D5A3', baseOrbitSpeed: 0.034, baseRotationSpeed: 2.25,
    axialTilt: 26.7, orbitPeriod: 10759, hasRing: true, textureType: 'gasGiant',
    palette: [[232,213,163],[210,190,140],[190,170,120],[250,235,190],[170,150,100]]
  },
  {
    name: '天王星', englishName: 'Uranus', orbitRadius: 26, diameter: 1.0,
    color: '#7EC8E3', baseOrbitSpeed: 0.012, baseRotationSpeed: -1.39,
    axialTilt: 97.8, orbitPeriod: 30687, hasRing: false, textureType: 'iceGiant',
    palette: [[126,200,227],[100,180,210],[80,160,200],[150,220,240]]
  },
  {
    name: '海王星', englishName: 'Neptune', orbitRadius: 30, diameter: 1.0,
    color: '#3D5FC4', baseOrbitSpeed: 0.006, baseRotationSpeed: 1.49,
    axialTilt: 28.3, orbitPeriod: 60190, hasRing: false, textureType: 'iceGiant',
    palette: [[61,95,196],[40,70,170],[80,120,210],[30,60,150]]
  }
];

const CARTOON_PALETTE = [
  [255,107,107],[78,205,196],[69,183,209],[150,206,180],
  [255,234,167],[221,160,221],[152,216,200],[247,220,111]
];

function hash(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

function minkowskiDistance(x1: number, y1: number, x2: number, y2: number, p: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return Math.pow(Math.pow(dx, p) + Math.pow(dy, p), 1 / p);
}

function minkowskiNoise(x: number, y: number, p: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    const ix = Math.floor(x * frequency);
    const iy = Math.floor(y * frequency);
    const fx = x * frequency - ix;
    const fy = y * frequency - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const h00 = hash(ix, iy);
    const h10 = hash(ix + 1, iy);
    const h01 = hash(ix, iy + 1);
    const h11 = hash(ix + 1, iy + 1);
    const top = h00 * (1 - sx) + h10 * sx;
    const bottom = h01 * (1 - sx) + h11 * sx;
    value += (top * (1 - sy) + bottom * sy) * amplitude;
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxVal;
}

function sineWaveBands(u: number, v: number, frequencies: number[], amplitudes: number[]): number {
  let val = 0;
  for (let i = 0; i < frequencies.length; i++) {
    val += amplitudes[i] * Math.sin(v * frequencies[i] + u * frequencies[i] * 0.3);
  }
  return val;
}

function lerpColor(c1: number[], c2: number[], t: number): number[] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ];
}

function generateGasGiantTexture(
  width: number, height: number, palette: number[][], seed: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const minkP = 3.0 + (seed % 5) * 0.5;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const bandVal = sineWaveBands(
        u * 6.28 * 4 + seed, v,
        [8, 16, 24, 32], [1.0, 0.6, 0.3, 0.15]
      );
      const noiseVal = minkowskiNoise(
        u * 8 + seed * 0.1, v * 4 + seed * 0.2, minkP, 6
      );
      const turbulence = minkowskiNoise(
        u * 16 + seed * 0.3, v * 8 + seed * 0.1, minkP, 4
      ) * 0.3;
      const combined = (bandVal + noiseVal * 0.8 + turbulence) * 0.5 + 0.5;
      const clamped = Math.max(0, Math.min(1, combined));
      const palIdx = clamped * (palette.length - 1);
      const idx1 = Math.floor(palIdx);
      const idx2 = Math.min(idx1 + 1, palette.length - 1);
      const frac = palIdx - idx1;
      const color = lerpColor(palette[idx1], palette[idx2], frac);
      const pixIdx = (y * width + x) * 4;
      data[pixIdx] = color[0];
      data[pixIdx + 1] = color[1];
      data[pixIdx + 2] = color[2];
      data[pixIdx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function generateIceGiantTexture(
  width: number, height: number, palette: number[][], seed: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const minkP = 2.5;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const bandVal = sineWaveBands(
        u * 6.28 * 2 + seed, v,
        [4, 8, 12], [0.8, 0.4, 0.2]
      );
      const noiseVal = minkowskiNoise(
        u * 6 + seed * 0.2, v * 3 + seed * 0.15, minkP, 5
      );
      const stormVal = minkowskiNoise(
        u * 20 + seed, v * 10 + seed, minkP, 3
      ) * 0.15;
      const combined = (bandVal * 0.5 + noiseVal * 0.6 + stormVal) * 0.5 + 0.5;
      const clamped = Math.max(0, Math.min(1, combined));
      const palIdx = clamped * (palette.length - 1);
      const idx1 = Math.floor(palIdx);
      const idx2 = Math.min(idx1 + 1, palette.length - 1);
      const frac = palIdx - idx1;
      const color = lerpColor(palette[idx1], palette[idx2], frac);
      const pixIdx = (y * width + x) * 4;
      data[pixIdx] = color[0];
      data[pixIdx + 1] = color[1];
      data[pixIdx + 2] = color[2];
      data[pixIdx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function generateRockyTexture(
  width: number, height: number, palette: number[][], seed: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const minkP = 2.0 + (seed % 3) * 0.5;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const baseNoise = minkowskiNoise(
        u * 10 + seed * 0.1, v * 5 + seed * 0.2, minkP, 6
      );
      const detailNoise = minkowskiNoise(
        u * 20 + seed * 0.3, v * 10 + seed * 0.1, minkP, 4
      );
      const craterNoise = minkowskiNoise(
        u * 30 + seed * 0.5, v * 15 + seed * 0.3, minkP, 3
      );
      const combined = (baseNoise * 0.6 + detailNoise * 0.3 + craterNoise * 0.1);
      const clamped = Math.max(0, Math.min(1, combined));
      const palIdx = clamped * (palette.length - 1);
      const idx1 = Math.floor(palIdx);
      const idx2 = Math.min(idx1 + 1, palette.length - 1);
      const frac = palIdx - idx1;
      const color = lerpColor(palette[idx1], palette[idx2], frac);
      const pixIdx = (y * width + x) * 4;
      data[pixIdx] = color[0];
      data[pixIdx + 1] = color[1];
      data[pixIdx + 2] = color[2];
      data[pixIdx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function generateNormalMap(
  textureCanvas: HTMLCanvasElement, strength: number
): HTMLCanvasElement {
  const width = textureCanvas.width;
  const height = textureCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const srcCtx = textureCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, width, height).data;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  function getGray(px: number, py: number): number {
    const cx = ((px % width) + width) % width;
    const cy = ((py % height) + height) % height;
    const idx = (cy * width + cx) * 4;
    return (srcData[idx] + srcData[idx + 1] + srcData[idx + 2]) / (3 * 255);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = getGray(x - 1, y);
      const right = getGray(x + 1, y);
      const top = getGray(x, y - 1);
      const bottom = getGray(x, y + 1);
      const dx = (left - right) * strength;
      const dy = (top - bottom) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const pixIdx = (y * width + x) * 4;
      data[pixIdx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      data[pixIdx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      data[pixIdx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      data[pixIdx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function generateCartoonTexture(colorArr: number[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `rgb(${colorArr[0]},${colorArr[1]},${colorArr[2]})`;
  ctx.fillRect(0, 0, 64, 32);
  return canvas;
}

function darkenColor(colorArr: number[], factor: number): number[] {
  return [
    Math.round(colorArr[0] * factor),
    Math.round(colorArr[1] * factor),
    Math.round(colorArr[2] * factor)
  ];
}

export class PlanetManager {
  private planets: Map<string, PlanetObject> = new Map();
  private planetOrder: string[] = [];
  private orbitSpeedMultiplier: number = 1.0;
  private rotationSpeedMultiplier: number = 1.0;
  private currentOrbitSpeed: number = 1.0;
  private currentRotationSpeed: number = 1.0;
  private targetOrbitSpeed: number = 1.0;
  private targetRotationSpeed: number = 1.0;
  private speedLerpProgress: number = 1.0;
  private compareMode: boolean = false;
  private comparePlanets: string[] = [];
  private scene: THREE.Scene | null = null;
  private selectedPlanets: Set<string> = new Set();
  private triangleBudget: number = 500000;
  private totalTriangles: number = 0;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    on('speed:orbit', (payload) => {
      this.targetOrbitSpeed = payload.speed;
      this.speedLerpProgress = 0;
    });
    on('speed:rotation', (payload) => {
      this.targetRotationSpeed = payload.speed;
      this.speedLerpProgress = 0;
    });
    on('texture:change', (payload) => {
      this.switchTextureStyle(payload.style);
    });
    on('planet:select', (payload) => {
      this.selectPlanet(payload.name);
    });
    on('planet:deselect', (payload) => {
      this.deselectPlanet(payload.name);
    });
    on('planets:compare', (payload) => {
      this.enterCompareMode(payload.names);
    });
    on('planets:compareExit', () => {
      this.exitCompareMode();
    });
    on('planet:hover', (payload) => {
      this.setHover(payload.name, true);
    });
    on('planet:unhover', () => {
      this.planets.forEach((p) => this.setHover(p.data.name, false));
    });
    on('mode:reset', () => {
      this.exitCompareMode();
      this.selectedPlanets.clear();
    });
  }

  init(scene: THREE.Scene): void {
    this.scene = scene;
    this.calculateTriangleBudget();

    for (let i = 0; i < PLANET_DATAS.length; i++) {
      const pData = PLANET_DATAS[i];
      this.createPlanet(pData, i, scene);
      this.planetOrder.push(pData.name);
    }
  }

  private calculateTriangleBudget(): void {
    const budgetPerPlanet = Math.floor(this.triangleBudget / 8);
    this.triangleBudget = budgetPerPlanet;
  }

  private getSegmentCount(diameter: number): [number, number] {
    const maxTris = this.triangleBudget;
    let widthSeg = 32;
    let heightSeg = 24;
    if (diameter < 0.4) {
      widthSeg = 16;
      heightSeg = 12;
    } else if (diameter < 1.0) {
      widthSeg = 24;
      heightSeg = 18;
    }
    const tris = widthSeg * heightSeg * 2;
    if (tris > maxTris) {
      const scale = Math.sqrt(maxTris / tris);
      widthSeg = Math.max(8, Math.floor(widthSeg * scale));
      heightSeg = Math.max(6, Math.floor(heightSeg * scale));
    }
    return [widthSeg, heightSeg];
  }

  private createPlanet(data: PlanetData, index: number, scene: THREE.Scene): void {
    const [wSeg, hSeg] = this.getSegmentCount(data.diameter);
    const geometry = new THREE.SphereGeometry(
      Math.max(0.01, data.diameter / 2), wSeg, hSeg
    );
    this.totalTriangles += wSeg * hSeg * 2;

    const realisticCanvas = this.generateRealisticTexture(data, index);
    const realisticTexture = new THREE.CanvasTexture(realisticCanvas);
    realisticTexture.wrapS = THREE.RepeatWrapping;
    realisticTexture.wrapT = THREE.ClampToEdgeWrapping;

    const normalCanvas = generateNormalMap(realisticCanvas, 1.5);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.ClampToEdgeWrapping;

    const cartoonColor = CARTOON_PALETTE[index % CARTOON_PALETTE.length];
    const cartoonCanvas = generateCartoonTexture(cartoonColor);
    const cartoonTexture = new THREE.CanvasTexture(cartoonCanvas);

    const realisticMaterial = new THREE.MeshStandardMaterial({
      map: realisticTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughness: 0.7,
      metalness: 0.1,
    });

    const outlineColor = darkenColor(cartoonColor, 0.7);
    const cartoonMaterial = new THREE.MeshStandardMaterial({
      map: cartoonTexture,
      roughness: 0.9,
      metalness: 0.0,
    });

    const wireframeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00FF88'),
      wireframe: true,
      transparent: true,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(geometry, realisticMaterial);
    mesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
    mesh.userData = { planetName: data.name };

    const orbitGroup = new THREE.Group();
    mesh.position.set(data.orbitRadius, 0, 0);
    orbitGroup.add(mesh);

    const startAngle = (index / 8) * Math.PI * 2;
    orbitGroup.rotation.y = startAngle;

    scene.add(orbitGroup);

    let ringMesh: THREE.Mesh | undefined;
    if (data.hasRing) {
      const ringGeo = new THREE.RingGeometry(
        data.diameter / 2 + 0.15,
        data.diameter / 2 + 0.6,
        64
      );
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(data.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        roughness: 0.8,
      });
      ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.copy(mesh.position);
      orbitGroup.add(ringMesh);
      this.totalTriangles += 64 * 2;
    }

    const hoverRingGeo = new THREE.TorusGeometry(
      data.diameter / 2 + 0.3, 0.08, 8, 64
    );
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#FFD700'),
      transparent: true,
      opacity: 0,
    });
    const hoverRing = new THREE.Mesh(hoverRingGeo, hoverRingMat);
    hoverRing.visible = false;
    hoverRing.position.copy(mesh.position);
    orbitGroup.add(hoverRing);
    this.totalTriangles += 8 * 64 * 2;

    const planetObj: PlanetObject = {
      data,
      mesh,
      orbitGroup,
      label: new THREE.Object3D(),
      ringMesh,
      originalPosition: new THREE.Vector3(data.orbitRadius, 0, 0),
      orbitAngle: startAngle,
      rotationAngle: 0,
      normalMap: normalTexture,
      textures: { realistic: realisticTexture, cartoon: cartoonTexture },
      currentMaterial: realisticMaterial,
      wireframeMaterial,
      cartoonMaterial,
      isTransitioning: false,
      transitionProgress: 0,
      pendingTextureStyle: null,
      currentStyle: 'realistic',
      hoverRing,
      hoverRingOpacity: 0,
      isHovered: false,
    };

    this.planets.set(data.name, planetObj);
  }

  private generateRealisticTexture(data: PlanetData, seed: number): HTMLCanvasElement {
    const texWidth = 512;
    const texHeight = 256;
    switch (data.textureType) {
      case 'gasGiant':
        return generateGasGiantTexture(texWidth, texHeight, data.palette, seed);
      case 'iceGiant':
        return generateIceGiantTexture(texWidth, texHeight, data.palette, seed);
      case 'rocky':
      default:
        return generateRockyTexture(texWidth, texHeight, data.palette, seed);
    }
  }

  private selectPlanet(name: string): void {
    this.selectedPlanets.add(name);
    const planet = this.planets.get(name);
    if (planet) {
      emit('planet:highlighted', { name, highlighted: true });
    }
  }

  private deselectPlanet(name: string): void {
    this.selectedPlanets.delete(name);
    const planet = this.planets.get(name);
    if (planet) {
      emit('planet:highlighted', { name, highlighted: false });
    }
  }

  private setHover(name: string, hovered: boolean): void {
    const planet = this.planets.get(name);
    if (planet) {
      planet.isHovered = hovered;
      if (hovered) {
        planet.hoverRing.visible = true;
      }
    }
  }

  private switchTextureStyle(style: 'realistic' | 'cartoon' | 'wireframe'): void {
    this.planets.forEach((planet) => {
      if (planet.currentStyle !== style) {
        planet.isTransitioning = true;
        planet.transitionProgress = 0;
        planet.pendingTextureStyle = style;
      }
    });
  }

  private enterCompareMode(names: [string, string]): void {
    if (this.compareMode) return;
    this.compareMode = true;
    this.comparePlanets = names;
    const pA = this.planets.get(names[0]);
    const pB = this.planets.get(names[1]);
    if (!pA || !pB) return;

    const compareData: CompareData = {
      planetA: this.toPlanetInfo(pA.data),
      planetB: this.toPlanetInfo(pB.data),
      radiusRatio: Math.max(pA.data.diameter, pB.data.diameter) /
                   Math.min(pA.data.diameter, pB.data.diameter),
      orbitPeriodRatio: Math.max(pA.data.orbitPeriod, pB.data.orbitPeriod) /
                        Math.min(pA.data.orbitPeriod, pB.data.orbitPeriod),
      axialTiltDiff: Math.abs(pA.data.axialTilt - pB.data.axialTilt),
    };
    emit('planets:compared', compareData);
  }

  private exitCompareMode(): void {
    if (!this.compareMode) return;
    this.compareMode = false;
    this.comparePlanets = [];
  }

  private toPlanetInfo(data: PlanetData): PlanetInfo {
    return {
      name: data.name,
      englishName: data.englishName,
      diameter: data.diameter,
      orbitRadius: data.orbitRadius,
      orbitPeriod: data.orbitPeriod,
      axialTilt: data.axialTilt,
      rotationSpeed: data.baseRotationSpeed,
      orbitSpeed: data.baseOrbitSpeed,
      color: data.color,
      hasRing: data.hasRing,
    };
  }

  getPlanetList(): PlanetInfo[] {
    return PLANET_DATAS.map((d) => this.toPlanetInfo(d));
  }

  getPlanetMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    this.planets.forEach((p) => meshes.push(p.mesh));
    return meshes;
  }

  getPlanetByName(name: string): PlanetObject | undefined {
    return this.planets.get(name);
  }

  getSelectedPlanets(): string[] {
    return Array.from(this.selectedPlanets);
  }

  getTotalTriangles(): number {
    return this.totalTriangles;
  }

  isCompareMode(): boolean {
    return this.compareMode;
  }

  update(delta: number, camera: THREE.Camera): void {
    if (this.speedLerpProgress < 1) {
      this.speedLerpProgress = Math.min(1, this.speedLerpProgress + delta / 0.2);
      const t = this.speedLerpProgress;
      this.currentOrbitSpeed = this.currentOrbitSpeed +
        (this.targetOrbitSpeed - this.currentOrbitSpeed) * t;
      this.currentRotationSpeed = this.currentRotationSpeed +
        (this.targetRotationSpeed - this.currentRotationSpeed) * t;
      emit('speed:orbit:updated', { currentSpeed: this.currentOrbitSpeed });
      emit('speed:rotation:updated', { currentSpeed: this.currentRotationSpeed });
    } else {
      this.currentOrbitSpeed = this.targetOrbitSpeed;
      this.currentRotationSpeed = this.targetRotationSpeed;
    }

    this.planets.forEach((planet, name) => {
      if (planet.isTransitioning) {
        planet.transitionProgress += delta / 0.4;
        if (planet.transitionProgress <= 0.5) {
          const t = planet.transitionProgress / 0.5;
          planet.currentMaterial.opacity = 1 - t;
          planet.currentMaterial.transparent = true;
        } else if (planet.transitionProgress <= 1.0) {
          if (planet.pendingTextureStyle && planet.transitionProgress >= 0.5) {
            this.applyTextureStyle(planet, planet.pendingTextureStyle);
            planet.pendingTextureStyle = null;
          }
          const t = (planet.transitionProgress - 0.5) / 0.5;
          planet.currentMaterial.opacity = t;
          planet.currentMaterial.transparent = t < 1;
        } else {
          planet.currentMaterial.opacity = 1;
          planet.currentMaterial.transparent = false;
          planet.isTransitioning = false;
          planet.transitionProgress = 0;
          emit('texture:transition:complete');
        }
      }

      if (!this.compareMode || !this.comparePlanets.includes(name)) {
        planet.orbitAngle += delta * planet.data.baseOrbitSpeed * this.currentOrbitSpeed * 0.1;
        planet.orbitGroup.rotation.y = planet.orbitAngle;
      }

      planet.mesh.rotation.y += delta * planet.data.baseRotationSpeed * this.currentRotationSpeed * 0.5;

      if (planet.isHovered && planet.hoverRing) {
        planet.hoverRingOpacity = Math.min(0.4, planet.hoverRingOpacity + delta * 0.4);
        (planet.hoverRing.material as THREE.MeshBasicMaterial).opacity = planet.hoverRingOpacity;
        planet.hoverRing.lookAt(camera.position);
      } else if (planet.hoverRing) {
        planet.hoverRingOpacity = Math.max(0, planet.hoverRingOpacity - delta * 0.8);
        (planet.hoverRing.material as THREE.MeshBasicMaterial).opacity = planet.hoverRingOpacity;
        if (planet.hoverRingOpacity <= 0) {
          planet.hoverRing.visible = false;
        }
      }

      if (this.compareMode && this.comparePlanets.includes(name)) {
        const idx = this.comparePlanets.indexOf(name);
        const camPos = camera.position.clone();
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const targetX = (idx - 0.5) * 3;
        const targetPos = new THREE.Vector3(
          camPos.x + camDir.x * 5 + targetX * camDir.z,
          camPos.y + camDir.y * 0,
          camPos.z + camDir.z * 5 - targetX * camDir.x
        );
        planet.mesh.position.lerp(targetPos, delta * 3);
        if (planet.ringMesh) {
          planet.ringMesh.position.copy(planet.mesh.position);
        }
        if (planet.hoverRing) {
          planet.hoverRing.position.copy(planet.mesh.position);
        }
      } else if (this.compareMode && !this.comparePlanets.includes(name)) {
        planet.mesh.position.lerp(planet.originalPosition, delta * 2);
        if (planet.ringMesh) {
          planet.ringMesh.position.copy(planet.mesh.position);
        }
        if (planet.hoverRing) {
          planet.hoverRing.position.copy(planet.mesh.position);
        }
      }
    });
  }

  private applyTextureStyle(planet: PlanetObject, style: 'realistic' | 'cartoon' | 'wireframe'): void {
    switch (style) {
      case 'realistic':
        planet.currentMaterial.map = planet.textures.realistic;
        planet.currentMaterial.normalMap = planet.normalMap;
        planet.currentMaterial.normalScale = new THREE.Vector2(1.5, 1.5);
        planet.currentMaterial.color.set(0xffffff);
        planet.currentMaterial.wireframe = false;
        planet.currentMaterial.roughness = 0.7;
        planet.currentMaterial.metalness = 0.1;
        break;
      case 'cartoon':
        planet.currentMaterial.map = planet.textures.cartoon;
        planet.currentMaterial.normalMap = null;
        planet.currentMaterial.color.set(0xffffff);
        planet.currentMaterial.wireframe = false;
        planet.currentMaterial.roughness = 0.9;
        planet.currentMaterial.metalness = 0.0;
        break;
      case 'wireframe':
        planet.mesh.material = planet.wireframeMaterial;
        planet.currentMaterial = planet.wireframeMaterial;
        planet.currentMaterial.color.set('#00FF88');
        planet.currentMaterial.wireframe = true;
        break;
    }
    planet.currentStyle = style;
    planet.currentMaterial.needsUpdate = true;
  }
}
