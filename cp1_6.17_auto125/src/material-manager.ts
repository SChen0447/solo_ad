import * as THREE from 'three';

export type MaterialType = 'metal' | 'plastic' | 'glass' | 'emissive';
export type TextureType = 'none' | 'wood' | 'marble' | 'brushed' | 'fabric';

export interface MaterialPreset {
  color: THREE.ColorRepresentation;
  metalness: number;
  roughness: number;
  opacity: number;
  transparent: boolean;
  emissive: THREE.ColorRepresentation;
  emissiveIntensity: number;
  envMapIntensity: number;
}

const MATERIAL_PRESETS: Record<MaterialType, MaterialPreset> = {
  metal: {
    color: 0xc0c0c0,
    metalness: 1.0,
    roughness: 0.15,
    opacity: 1.0,
    transparent: false,
    emissive: 0x000000,
    emissiveIntensity: 0,
    envMapIntensity: 1.5,
  },
  plastic: {
    color: 0xe8e8e8,
    metalness: 0.0,
    roughness: 0.75,
    opacity: 1.0,
    transparent: false,
    emissive: 0x000000,
    emissiveIntensity: 0,
    envMapIntensity: 0.8,
  },
  glass: {
    color: 0xf0f8ff,
    metalness: 0.0,
    roughness: 0.05,
    opacity: 0.35,
    transparent: true,
    emissive: 0x000000,
    emissiveIntensity: 0,
    envMapIntensity: 2.0,
  },
  emissive: {
    color: 0xff6600,
    metalness: 0.3,
    roughness: 0.3,
    opacity: 1.0,
    transparent: false,
    emissive: 0xff8800,
    emissiveIntensity: 1.2,
    envMapIntensity: 0.5,
  },
};

const TEXTURE_SIZE = 512;

export class MaterialManager {
  private textureCache: Map<string, THREE.CanvasTexture> = new Map();
  private currentMaterial: THREE.MeshStandardMaterial | null = null;
  private transitionAnimation: TransitionAnimation | null = null;

  public createInitialMaterial(): THREE.MeshStandardMaterial {
    const preset = MATERIAL_PRESETS.metal;
    const material = new THREE.MeshStandardMaterial({
      color: preset.color,
      metalness: preset.metalness,
      roughness: preset.roughness,
      opacity: preset.opacity,
      transparent: preset.transparent,
      emissive: preset.emissive,
      emissiveIntensity: preset.emissiveIntensity,
      envMapIntensity: preset.envMapIntensity,
      side: THREE.DoubleSide,
    });
    this.currentMaterial = material;
    return material;
  }

  public switchMaterial(
    material: THREE.MeshStandardMaterial,
    targetType: MaterialType,
    textureType: TextureType,
    duration: number = 300
  ): void {
    this.currentMaterial = material;
    const targetPreset = { ...MATERIAL_PRESETS[targetType] };
    const texture = textureType !== 'none' ? this.getTexture(textureType) : null;

    if (this.transitionAnimation) {
      this.transitionAnimation.cancel();
    }

    this.transitionAnimation = new TransitionAnimation(
      material,
      targetPreset,
      texture,
      duration,
      () => {
        this.transitionAnimation = null;
      }
    );
    this.transitionAnimation.start();
  }

  public applyTexture(
    material: THREE.MeshStandardMaterial,
    textureType: TextureType
  ): void {
    this.currentMaterial = material;
    if (textureType === 'none') {
      material.map = null;
    } else {
      material.map = this.getTexture(textureType);
    }
    material.needsUpdate = true;
  }

  private getTexture(type: TextureType): THREE.CanvasTexture {
    if (this.textureCache.has(type)) {
      const cached = this.textureCache.get(type)!;
      cached.needsUpdate = true;
      return cached;
    }

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'wood':
        this.generateWoodTexture(ctx);
        break;
      case 'marble':
        this.generateMarbleTexture(ctx);
        break;
      case 'brushed':
        this.generateBrushedTexture(ctx);
        break;
      case 'fabric':
        this.generateFabricTexture(ctx);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    this.textureCache.set(type, texture);
    return texture;
  }

  private generateWoodTexture(ctx: CanvasRenderingContext2D): void {
    const w = TEXTURE_SIZE;
    const h = TEXTURE_SIZE;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#8b5a2b');
    gradient.addColorStop(0.3, '#a0693a');
    gradient.addColorStop(0.6, '#7a4a20');
    gradient.addColorStop(1, '#6b3d18');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(60, 30, 10, ${0.08 + Math.random() * 0.15})`;
      ctx.lineWidth = 0.5 + Math.random() * 2.5;
      ctx.beginPath();
      const startY = Math.random() * h;
      ctx.moveTo(0, startY);
      for (let x = 0; x <= w; x += 20) {
        const y = startY
          + Math.sin(x * 0.015 + Math.random() * 3) * (10 + Math.random() * 25)
          + (Math.random() - 0.5) * 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 15 + Math.random() * 40;
      ctx.strokeStyle = `rgba(50, 25, 5, ${0.15 + Math.random() * 0.15})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r - j * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const noise = ctx.createImageData(w, h);
    for (let i = 0; i < noise.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      noise.data[i] = Math.min(255, Math.max(0, noise.data[i] + n));
      noise.data[i + 1] = Math.min(255, Math.max(0, noise.data[i + 1] + n));
      noise.data[i + 2] = Math.min(255, Math.max(0, noise.data[i + 2] + n));
      noise.data[i + 3] = 255;
    }
    ctx.putImageData(noise, 0, 0);
  }

  private generateMarbleTexture(ctx: CanvasRenderingContext2D): void {
    const w = TEXTURE_SIZE;
    const h = TEXTURE_SIZE;
    ctx.fillStyle = '#f0ede6';
    ctx.fillRect(0, 0, w, h);

    for (let layer = 0; layer < 5; layer++) {
      const scale = 0.005 + layer * 0.003;
      const alpha = 0.08 + layer * 0.04;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const n = this.perlinLikeNoise(x * scale, y * scale, layer);
          if (n > 0.55) {
            const intensity = (n - 0.55) * 2.2;
            const gray = Math.floor(120 + intensity * 90);
            ctx.fillStyle = `rgba(${gray}, ${gray - 10}, ${gray - 20}, ${alpha})`;
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }
    }

    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(90, 85, 80, ${0.12 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 80; j++) {
        x += (Math.random() - 0.5) * 20;
        y += (Math.random() - 0.5) * 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(180, 170, 160, 0.08)';
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private generateBrushedTexture(ctx: CanvasRenderingContext2D): void {
    const w = TEXTURE_SIZE;
    const h = TEXTURE_SIZE;
    const baseGradient = ctx.createLinearGradient(0, 0, w, h);
    baseGradient.addColorStop(0, '#a8a8a8');
    baseGradient.addColorStop(0.5, '#d0d0d0');
    baseGradient.addColorStop(1, '#909090');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      const brightness = 110 + Math.sin(y * 0.08) * 15 + (Math.random() - 0.5) * 20;
      ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness + 3}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 1.5);
      ctx.stroke();
    }

    for (let i = 0; i < 25; i++) {
      const y = Math.random() * h;
      const alpha = 0.06 + Math.random() * 0.12;
      const width = 3 + Math.random() * 12;
      ctx.strokeStyle = `rgba(70, 70, 70, ${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 30) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * width);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 15000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const n = Math.random();
      let r: number, g: number, b: number;
      if (n > 0.92) {
        r = 220; g = 220; b = 225;
      } else if (n < 0.08) {
        r = 60; g = 60; b = 65;
      } else {
        continue;
      }
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  private generateFabricTexture(ctx: CanvasRenderingContext2D): void {
    const w = TEXTURE_SIZE;
    const h = TEXTURE_SIZE;
    ctx.fillStyle = '#4a6a8a';
    ctx.fillRect(0, 0, w, h);

    const threadSize = 4;
    for (let y = 0; y < h; y += threadSize) {
      for (let x = 0; x < w; x += threadSize) {
        const isWarp = ((x / threadSize) + (y / threadSize)) % 2 === 0;
        if (isWarp) {
          const variation = Math.sin(x * 0.05) * 10 + Math.cos(y * 0.05) * 8;
          ctx.fillStyle = `rgb(${74 + variation}, ${106 + variation}, ${138 + variation})`;
        } else {
          const variation = Math.sin(x * 0.04 + 1) * 12 + Math.cos(y * 0.06 + 2) * 6;
          ctx.fillStyle = `rgb(${54 + variation}, ${86 + variation}, ${118 + variation})`;
        }
        ctx.fillRect(x, y, threadSize, threadSize);
      }
    }

    ctx.strokeStyle = 'rgba(20, 40, 60, 0.25)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += threadSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += threadSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const n = Math.random();
      let alpha: number;
      if (n > 0.5) {
        alpha = 0.08 + Math.random() * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      } else {
        alpha = 0.08 + Math.random() * 0.12;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      }
      ctx.fillRect(x, y, 1, 1);
    }

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 2 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  private perlinLikeNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    const n2 = Math.sin(x * 4.1234 + y * 9.5678 + seed * 23.456) * 12345.6789;
    const v1 = n - Math.floor(n);
    const v2 = n2 - Math.floor(n2);
    return (v1 + v2) * 0.5;
  }

  public update(deltaTime: number): void {
    if (this.transitionAnimation) {
      this.transitionAnimation.update(deltaTime);
    }
  }

  public dispose(): void {
    this.textureCache.forEach((t) => t.dispose());
    this.textureCache.clear();
    if (this.transitionAnimation) {
      this.transitionAnimation.cancel();
      this.transitionAnimation = null;
    }
  }
}

class TransitionAnimation {
  private startTime: number = 0;
  private running: boolean = false;
  private animationId: number | null = null;
  private startValues: {
    color: THREE.Color;
    metalness: number;
    roughness: number;
    opacity: number;
    emissive: THREE.Color;
    emissiveIntensity: number;
    envMapIntensity: number;
  };

  constructor(
    private material: THREE.MeshStandardMaterial,
    private targetPreset: MaterialPreset,
    private targetTexture: THREE.CanvasTexture | null,
    private duration: number,
    private onComplete: () => void
  ) {
    this.startValues = {
      color: material.color.clone(),
      metalness: material.metalness,
      roughness: material.roughness,
      opacity: material.opacity,
      emissive: material.emissive.clone(),
      emissiveIntensity: material.emissiveIntensity,
      envMapIntensity: material.envMapIntensity,
    };
  }

  public start(): void {
    this.running = true;
    this.startTime = performance.now();
    this.tick();
  }

  private tick = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const elapsed = now - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);
    const eased = this.easeInOutCubic(t);
    this.applyInterpolation(eased);
    if (t >= 1) {
      this.running = false;
      if (this.targetTexture !== null) {
        this.material.map = this.targetTexture;
      }
      this.material.transparent = this.targetPreset.transparent;
      this.material.needsUpdate = true;
      this.onComplete();
    } else {
      this.animationId = requestAnimationFrame(this.tick);
    }
  };

  private applyInterpolation(t: number): void {
    const targetColor = new THREE.Color(this.targetPreset.color);
    const targetEmissive = new THREE.Color(this.targetPreset.emissive);

    this.material.color.lerpColors(this.startValues.color, targetColor, t);
    this.material.metalness = this.lerp(this.startValues.metalness, this.targetPreset.metalness, t);
    this.material.roughness = this.lerp(this.startValues.roughness, this.targetPreset.roughness, t);
    this.material.opacity = this.lerp(this.startValues.opacity, this.targetPreset.opacity, t);
    this.material.emissive.lerpColors(this.startValues.emissive, targetEmissive, t);
    this.material.emissiveIntensity = this.lerp(
      this.startValues.emissiveIntensity,
      this.targetPreset.emissiveIntensity,
      t
    );
    this.material.envMapIntensity = this.lerp(
      this.startValues.envMapIntensity,
      this.targetPreset.envMapIntensity,
      t
    );
    this.material.needsUpdate = true;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update(_deltaTime: number): void {
  }

  public cancel(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export const materialManager = new MaterialManager();
