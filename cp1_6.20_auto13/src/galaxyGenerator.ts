import * as THREE from 'three';

export interface StarData {
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  brightness: number;
  name: string;
  spectralType: string;
  temperature: number;
  radius: number;
  luminosity: number;
}

export interface GalaxyData {
  stars: StarData[];
  backgroundStars: THREE.Vector3[];
}

const STAR_PREFIXES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Nova', 'Sirius', 'Vega', 'Altair', 'Rigel', 'Betel', 'Antares', 'Spica',
  'Deneb', 'Polaris', 'Canopus', 'Arcturus', 'Procyon', 'Bellatrix',
  'Regulus', 'Aldebaran', 'Castor', 'Pollux', 'Fomalhaut', 'Mimosa',
  'Achernar', 'Hadar', 'Rigil', 'Capella', 'Elnath', 'Mirfak', 'Sargas'
];

const STAR_SUFFIXES = [
  'Major', 'Minor', 'Prime', 'Secundus', 'Tertius', 'IV', 'V', 'VI',
  'VII', 'IX', 'X', 'Centauri', 'Crucis', 'Cygni', 'Lyrae', 'Orionis',
  'Tauri', 'Leonis', 'Pegasi', 'Draconis', 'Aquilae', 'Scorpii',
  'Sagittarii', 'Carinae', 'Velorum', 'Ceti', 'Eridani', 'Persei'
];

const SPECTRAL_TYPES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

export class GalaxyGenerator {
  private starCount: number;
  private backgroundStarCount: number;
  private galaxyRadius: number;
  private galaxyThickness: number;
  private armCount: number;
  private armTightness: number;

  constructor(
    starCount: number = 2000,
    backgroundStarCount: number = 5000,
    galaxyRadius: number = 500,
    galaxyThickness: number = 50
  ) {
    this.starCount = starCount;
    this.backgroundStarCount = backgroundStarCount;
    this.galaxyRadius = galaxyRadius;
    this.galaxyThickness = galaxyThickness;
    this.armCount = 4;
    this.armTightness = 0.6;
  }

  public generate(): GalaxyData {
    const stars: StarData[] = [];
    const backgroundStars: THREE.Vector3[] = [];

    for (let i = 0; i < this.starCount; i++) {
      stars.push(this.generateStar(i));
    }

    for (let i = 0; i < this.backgroundStarCount; i++) {
      backgroundStars.push(this.generateBackgroundStar());
    }

    return { stars, backgroundStars };
  }

  private generateStar(index: number): StarData {
    const position = this.generateSpiralPosition(index);
    const brightness = Math.random();
    const size = 0.5 + brightness * 2.0;
    const color = this.brightnessToColor(brightness);
    const name = this.generateStarName();
    const spectralType = this.brightnessToSpectralType(brightness);
    const temperature = 3000 + brightness * 27000;
    const radius = 0.3 + brightness * 2.2;
    const luminosity = Math.pow(brightness, 2.5) * 1000;

    return {
      position,
      color,
      size,
      brightness,
      name,
      spectralType,
      temperature,
      radius,
      luminosity
    };
  }

  private generateSpiralPosition(_index: number): THREE.Vector3 {
    const arm = Math.floor(Math.random() * this.armCount);
    const armAngle = (arm / this.armCount) * Math.PI * 2;

    const radiusFactor = Math.pow(Math.random(), 0.5);
    const radius = radiusFactor * this.galaxyRadius;

    const spiralAngle = armAngle + radius * this.armTightness * 0.01;

    const scatterRadius = radius * 0.15 + 5;
    const scatterAngle = Math.random() * Math.PI * 2;
    const scatterX = Math.cos(scatterAngle) * scatterRadius * Math.random();
    const scatterY = Math.sin(scatterAngle) * scatterRadius * Math.random();

    const x = Math.cos(spiralAngle) * radius + scatterX;
    const z = Math.sin(spiralAngle) * radius + scatterY;

    const thicknessFactor = Math.exp(-Math.pow(radius / this.galaxyRadius * 2, 2));
    const y = (Math.random() - 0.5) * this.galaxyThickness * thicknessFactor;

    return new THREE.Vector3(x, y, z);
  }

  private brightnessToColor(brightness: number): THREE.Color {
    const hue = (1.0 - brightness) * 0.65;
    const saturation = 0.5 + brightness * 0.3;
    const lightness = 0.4 + brightness * 0.4;
    return new THREE.Color().setHSL(hue, saturation, lightness);
  }

  private brightnessToSpectralType(brightness: number): string {
    const typeIndex = Math.floor((1.0 - brightness) * (SPECTRAL_TYPES.length - 1));
    const subClass = Math.floor(Math.random() * 10);
    return SPECTRAL_TYPES[Math.max(0, Math.min(SPECTRAL_TYPES.length - 1, typeIndex))] + subClass;
  }

  private generateStarName(): string {
    const prefix = STAR_PREFIXES[Math.floor(Math.random() * STAR_PREFIXES.length)];
    const suffix = STAR_SUFFIXES[Math.floor(Math.random() * STAR_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
  }

  private generateBackgroundStar(): THREE.Vector3 {
    const distance = this.galaxyRadius * 1.5 + Math.random() * this.galaxyRadius * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.sin(phi) * Math.sin(theta);
    const z = distance * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  public createStarTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
