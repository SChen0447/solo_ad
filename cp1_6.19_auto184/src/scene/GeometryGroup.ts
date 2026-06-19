import * as THREE from 'three';

export type VisualizerMode = 'bars' | 'particles' | 'wave';

export type ColorTheme = 'cyberpunk' | 'aurora' | 'sunset';

export interface ColorThemeConfig {
  name: ColorTheme;
  hLow: number;
  hHigh: number;
  saturation: number;
  lightness: number;
}

export const colorThemes: Record<ColorTheme, ColorThemeConfig> = {
  cyberpunk: {
    name: 'cyberpunk',
    hLow: 200,
    hHigh: 340,
    saturation: 100,
    lightness: 50
  },
  aurora: {
    name: 'aurora',
    hLow: 160,
    hHigh: 280,
    saturation: 80,
    lightness: 55
  },
  sunset: {
    name: 'sunset',
    hLow: 0,
    hHigh: 60,
    saturation: 90,
    lightness: 55
  }
};

export interface GeometryUpdateData {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  averageVolume: number;
  bassVolume: number;
  midVolume: number;
  trebleVolume: number;
  time: number;
}

export interface IGeometryGroup {
  getObject(): THREE.Object3D;
  update(data: GeometryUpdateData): void;
  setColorTheme(theme: ColorTheme): void;
  dispose(): void;
}

class BarGeometryGroup implements IGeometryGroup {
  private group: THREE.Group;
  private bars: THREE.Mesh[] = [];
  private barCount = 32;
  private radius = 5;
  private maxHeight = 10;
  private colorTheme: ColorTheme = 'cyberpunk';
  private targetColors: THREE.Color[] = [];
  private currentColors: THREE.Color[] = [];
  private colorTransitionProgress = 1;

  constructor() {
    this.group = new THREE.Group();
    this.createBars();
  }

  private createBars(): void {
    const geometry = new THREE.BoxGeometry(0.3, 1, 0.3);
    
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI - Math.PI / 2;
      const material = new THREE.MeshStandardMaterial({
        color: 0x0066ff,
        metalness: 0.3,
        roughness: 0.5,
        emissive: 0x002244,
        emissiveIntensity: 0.3
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = Math.cos(angle) * this.radius;
      bar.position.z = Math.sin(angle) * this.radius;
      bar.position.y = 0;
      bar.scale.y = 0.1;
      bar.rotation.y = -angle + Math.PI / 2;

      this.bars.push(bar);
      this.group.add(bar);

      const color = new THREE.Color();
      this.targetColors.push(color);
      this.currentColors.push(color.clone());
    }

    this.updateColors();
  }

  private updateColors(): void {
    const theme = colorThemes[this.colorTheme];
    for (let i = 0; i < this.barCount; i++) {
      const t = i / (this.barCount - 1);
      const hue = theme.hLow + (theme.hHigh - theme.hLow) * t;
      this.targetColors[i].setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100);
    }
  }

  getObject(): THREE.Group {
    return this.group;
  }

  update(data: GeometryUpdateData): void {
    const freqData = data.frequencyData;
    const step = Math.floor(freqData.length / this.barCount);

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + 0.02);
      for (let i = 0; i < this.barCount; i++) {
        this.currentColors[i].lerpColors(
          this.currentColors[i],
          this.targetColors[i],
          0.05
        );
        const material = this.bars[i].material as THREE.MeshStandardMaterial;
        material.color.copy(this.currentColors[i]);
        material.emissive.copy(this.currentColors[i]);
        material.emissiveIntensity = 0.2;
      }
    }

    for (let i = 0; i < this.barCount; i++) {
      const freqIndex = i * step;
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += freqData[freqIndex + j] || 0;
      }
      const value = sum / step / 255;

      const bar = this.bars[i];
      const targetHeight = Math.max(0.1, value * this.maxHeight);
      bar.scale.y += (targetHeight - bar.scale.y) * 0.15;
      bar.position.y = bar.scale.y / 2;

      const material = bar.material as THREE.MeshStandardMaterial;
      if (this.colorTransitionProgress >= 1) {
        const theme = colorThemes[this.colorTheme];
        const hue = theme.hLow + (theme.hHigh - theme.hLow) * value;
        material.color.setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100);
        material.emissive.setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100 * 0.5);
        material.emissiveIntensity = 0.3 + value * 0.5;
      }
    }
  }

  setColorTheme(theme: ColorTheme): void {
    this.colorTheme = theme;
    this.colorTransitionProgress = 0;
    this.updateColors();
  }

  dispose(): void {
    this.bars.forEach(bar => {
      bar.geometry.dispose();
      (bar.material as THREE.Material).dispose();
    });
    this.group.clear();
  }
}

class ParticleGeometryGroup implements IGeometryGroup {
  private group: THREE.Group;
  private particles: THREE.Points;
  private particleCount = 300;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private basePositions: { radius: number; angle: number; height: number; speed: number }[] = [];
  private colorTheme: ColorTheme = 'cyberpunk';

  constructor() {
    this.group = new THREE.Group();
    
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const radius = 2 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 8 - 2;
      const speed = 0.5 + Math.random() * 1.5;
      
      this.basePositions.push({ radius, angle, height, speed });
      this.sizes[i] = 0.1 + Math.random() * 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
    this.updateColors();
  }

  private updateColors(): void {
    const theme = colorThemes[this.colorTheme];
    for (let i = 0; i < this.particleCount; i++) {
      const t = (this.basePositions[i].height + 2) / 10;
      const hue = theme.hLow + (theme.hHigh - theme.hLow) * t;
      const color = new THREE.Color().setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
  }

  getObject(): THREE.Group {
    return this.group;
  }

  update(data: GeometryUpdateData): void {
    const { time, frequencyData, bassVolume, midVolume, trebleVolume } = data;
    const theme = colorThemes[this.colorTheme];

    for (let i = 0; i < this.particleCount; i++) {
      const base = this.basePositions[i];
      const freqIndex = Math.floor((i / this.particleCount) * frequencyData.length);
      const freqValue = (frequencyData[freqIndex] || 0) / 255;
      
      const angle = base.angle + time * base.speed * 0.5;
      const radius = base.radius + Math.sin(time * 0.5 + i * 0.1) * 0.5 + freqValue * 2;
      const heightOffset = freqValue * 3 + Math.sin(time + i * 0.05) * 0.5;
      
      const i3 = i * 3;
      this.positions[i3] = Math.cos(angle) * radius;
      this.positions[i3 + 1] = base.height + heightOffset;
      this.positions[i3 + 2] = Math.sin(angle) * radius;

      const heightT = Math.max(0, Math.min(1, (base.height + heightOffset + 2) / 12));
      const hue = theme.hLow + (theme.hHigh - theme.hLow) * heightT;
      const color = new THREE.Color().setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.sizes[i] = 0.1 + freqValue * 0.3 + bassVolume * 0.2;
    }

    const positionAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.particles.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particles.geometry.getAttribute('size') as THREE.BufferAttribute;
    
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  setColorTheme(theme: ColorTheme): void {
    this.colorTheme = theme;
    this.updateColors();
  }

  dispose(): void {
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.group.clear();
  }
}

class WaveGeometryGroup implements IGeometryGroup {
  private group: THREE.Group;
  private mesh: THREE.Mesh;
  private gridSize = 32;
  private geometry: THREE.PlaneGeometry;
  private colorTheme: ColorTheme = 'cyberpunk';
  private baseHeights: number[][] = [];

  constructor() {
    this.group = new THREE.Group();
    
    this.geometry = new THREE.PlaneGeometry(12, 12, this.gridSize - 1, this.gridSize - 1);
    this.geometry.rotateX(-Math.PI / 2);

    for (let i = 0; i < this.gridSize; i++) {
      this.baseHeights[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        this.baseHeights[i][j] = 0;
      }
    }

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.3,
      roughness: 0.4,
      side: THREE.DoubleSide,
      wireframe: false
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.position.y = 0;
    this.group.add(this.mesh);
    
    this.updateVertexColors();
  }

  private updateVertexColors(): void {
    const theme = colorThemes[this.colorTheme];
    const positions = this.geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 2) / 6;
      const hue = theme.hLow + (theme.hHigh - theme.hLow) * Math.max(0, Math.min(1, t));
      const color = new THREE.Color().setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  getObject(): THREE.Group {
    return this.group;
  }

  update(data: GeometryUpdateData): void {
    const { waveformData, frequencyData, time, averageVolume } = data;
    const positions = this.geometry.attributes.position;
    const theme = colorThemes[this.colorTheme];

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const index = i * this.gridSize + j;
        
        const waveIndex = Math.floor((j / this.gridSize) * waveformData.length);
        const waveValue = (waveformData[waveIndex] - 128) / 128;
        
        const freqIndex = Math.floor((i / this.gridSize) * frequencyData.length);
        const freqValue = (frequencyData[freqIndex] || 0) / 255;
        
        const waveOffset = Math.sin(i * 0.5 + time * 2) * 0.3 + Math.cos(j * 0.3 + time * 1.5) * 0.3;
        const height = waveValue * 2 + freqValue * 3 + waveOffset + averageVolume * 1.5;
        
        this.baseHeights[i][j] += (height - this.baseHeights[i][j]) * 0.1;
        positions.setY(index, this.baseHeights[i][j]);
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();

    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 1) / 7;
      const hue = theme.hLow + (theme.hHigh - theme.hLow) * Math.max(0, Math.min(1, t));
      const color = new THREE.Color().setHSL(hue / 360, theme.saturation / 100, theme.lightness / 100);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
  }

  setColorTheme(theme: ColorTheme): void {
    this.colorTheme = theme;
    this.updateVertexColors();
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.group.clear();
  }
}

export class GeometryGroup {
  private mode: VisualizerMode;
  private currentGroup: IGeometryGroup;
  private barGroup: BarGeometryGroup;
  private particleGroup: ParticleGeometryGroup;
  private waveGroup: WaveGeometryGroup;
  private colorTheme: ColorTheme;

  constructor(initialMode: VisualizerMode = 'bars', initialTheme: ColorTheme = 'cyberpunk') {
    this.mode = initialMode;
    this.colorTheme = initialTheme;
    
    this.barGroup = new BarGeometryGroup();
    this.particleGroup = new ParticleGeometryGroup();
    this.waveGroup = new WaveGeometryGroup();

    this.barGroup.setColorTheme(initialTheme);
    this.particleGroup.setColorTheme(initialTheme);
    this.waveGroup.setColorTheme(initialTheme);

    this.currentGroup = this.getCurrentGroup();
  }

  private getCurrentGroup(): IGeometryGroup {
    switch (this.mode) {
      case 'bars':
        return this.barGroup;
      case 'particles':
        return this.particleGroup;
      case 'wave':
        return this.waveGroup;
      default:
        return this.barGroup;
    }
  }

  getMode(): VisualizerMode {
    return this.mode;
  }

  setMode(mode: VisualizerMode): void {
    this.mode = mode;
    this.currentGroup = this.getCurrentGroup();
  }

  getObject(): THREE.Object3D {
    return this.currentGroup.getObject();
  }

  update(data: GeometryUpdateData): void {
    this.currentGroup.update(data);
  }

  setColorTheme(theme: ColorTheme): void {
    this.colorTheme = theme;
    this.barGroup.setColorTheme(theme);
    this.particleGroup.setColorTheme(theme);
    this.waveGroup.setColorTheme(theme);
  }

  getColorTheme(): ColorTheme {
    return this.colorTheme;
  }

  dispose(): void {
    this.barGroup.dispose();
    this.particleGroup.dispose();
    this.waveGroup.dispose();
  }
}
