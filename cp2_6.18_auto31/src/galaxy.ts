import * as THREE from 'three';
import { Config, ColorTheme, ColorThemes, GalaxyParams, DefaultGalaxyParams } from './config';

interface ParticleState {
  basePosition: THREE.Vector3;
  baseAngle: number;
  distanceRatio: number;
  initialColor: THREE.Color;
  rippleTarget: THREE.Vector3 | null;
  rippleStartTime: number;
  explosionStartTime: number;
  explosionActive: boolean;
  highlightStartTime: number;
  highlightActive: boolean;
}

interface ThemeColorCache {
  [key: string]: THREE.Color;
}

export class Galaxy {
  private scene: THREE.Scene;
  private params: GalaxyParams;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private particleStates: ParticleState[] = [];
  private particleTexture: THREE.Texture;

  private baseColorLookup: Float32Array | null = null;
  private hueLUT: Float32Array | null = null;
  private static readonly HUE_LUT_SIZE: number = 360;

  private onParamsChangeCallbacks: Array<() => void> = [];

  private static readonly tmpHueLutFactory(): Float32Array {
    const lut = new Float32Array(3 * 360);
    for (let i = 0; i < 360; i++) {
      const hue = i / 360;
      const color = new THREE.Color();
      color.setHSL(hue, 1.0, 0.6);
      lut[i * 3] = color.r;
      lut[i * 3 + 1] = color.g;
      lut[i * 3 + 2] = color.b;
    }
    return lut;
  }

  constructor(scene: THREE.Scene, params: Partial<GalaxyParams> = {}) {
    this.scene = scene;
    this.params = { ...DefaultGalaxyParams, ...params };
    this.particleTexture = this.createParticleTexture();
    this.hueLUT = Galaxy.tmpHueLutFactory();
    this.createGalaxy();
  }

  private createParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private hexToRgb(hex: string): THREE.Color {
    return new THREE.Color(hex);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private lerpColorArray(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): void {
    out.r = a.r + (b.r - a.r) * t;
    out.g = a.g + (b.g - a.g) * t;
    out.b = a.b + (b.b - a.b) * t;
  }

  private buildBaseColorLut(theme: ColorTheme): void {
    const themeColors = ColorThemes[theme];
    const centerColor = this.hexToRgb(themeColors.center);
    const edgeColor = this.hexToRgb(themeColors.edge);

    const steps = 256;
    this.baseColorLookup = new Float32Array(steps * 3);

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      this.baseColorLookup[i * 3] = centerColor.r + (edgeColor.r - centerColor.r) * t;
      this.baseColorLookup[i * 3 + 1] = centerColor.g + (edgeColor.g - centerColor.g) * t;
      this.baseColorLookup[i * 3 + 2] = centerColor.b + (edgeColor.b - centerColor.b) * t;
    }
  }

  private sampleBaseColor(distanceRatio: number, out: THREE.Color): void {
    if (!this.baseColorLookup) {
      out.set(1, 1, 1);
      return;
    }
    const steps = this.baseColorLookup.length / 3;
    const idx = Math.min(Math.max(Math.floor(distanceRatio * (steps - 1)), 0), steps - 1);
    out.r = this.baseColorLookup[idx * 3];
    out.g = this.baseColorLookup[idx * 3 + 1];
    out.b = this.baseColorLookup[idx * 3 + 2];
  }

  private sampleRainbowColor(distanceRatio: number, out: THREE.Color): void {
    if (!this.hueLUT) return;
    const hue = Math.floor((distanceRatio % 1) * 360);
    const idx = Math.min(Math.max(hue, 0), 359) * 3;
    out.r = this.hueLUT[idx];
    out.g = this.hueLUT[idx + 1];
    out.b = this.hueLUT[idx + 2];
  }

  private applyHueShift(color: THREE.Color, hueShift: number, out: THREE.Color): void {
    if (hueShift === 0) {
      out.copy(color);
      return;
    }
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + hueShift + 1) % 1;
    out.setHSL(hsl.h, hsl.s, hsl.l);
  }

  private getParticleSize(distanceRatio: number): number {
    return Config.PARTICLE_SIZE_CENTER + (Config.PARTICLE_SIZE_EDGE - Config.PARTICLE_SIZE_CENTER) * distanceRatio;
  }

  private createGalaxy(): void {
    this.dispose();

    this.buildBaseColorLut(this.params.colorTheme);

    const count = this.params.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.particleStates = new Array(count);

    const radius = Config.GALAXY_RADIUS;
    const arms = Config.GALAXY_ARMS;
    const twist = Config.GALAXY_TWIST;
    const thickness = Config.GALAXY_THICKNESS;

    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.7) * radius;
      const distanceRatio = r / radius;
      const armAngle = (i % arms) / arms * Math.PI * 2;
      const spiralAngle = r / radius * twist * Math.PI * 2;
      const angle = armAngle + spiralAngle + (Math.random() - 0.5) * 0.5 * (1 - distanceRatio * 0.5);

      const x = Math.cos(angle) * r + (Math.random() - 0.5) * (1 - distanceRatio * 0.3) * 8;
      const y = (Math.random() - 0.5) * thickness * (1 - distanceRatio * 0.7);
      const z = Math.sin(angle) * r + (Math.random() - 0.5) * (1 - distanceRatio * 0.3) * 8;

      const basePos = new THREE.Vector3(x, y, z);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const angularOffset = Config.ANGULAR_HUE_SHIFT * Math.sin(angle * 2);
      if (this.params.colorTheme === 'rainbow') {
        this.sampleRainbowColor(distanceRatio, tmpColor);
      } else {
        this.sampleBaseColor(distanceRatio, tmpColor);
      }
      this.applyHueShift(tmpColor, angularOffset, tmpColor);

      const initialColor = tmpColor.clone();

      colors[i * 3] = initialColor.r;
      colors[i * 3 + 1] = initialColor.g;
      colors[i * 3 + 2] = initialColor.b;

      sizes[i] = this.getParticleSize(distanceRatio);

      this.particleStates[i] = {
        basePosition: basePos.clone(),
        baseAngle: angle,
        distanceRatio: distanceRatio,
        initialColor: initialColor,
        rippleTarget: null,
        rippleStartTime: 0,
        explosionStartTime: 0,
        explosionActive: false,
        highlightStartTime: 0,
        highlightActive: false,
      };
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: this.particleTexture,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private computeHighlightT(startTime: number, currentTime: number): number {
    if (startTime <= 0) return 0;
    const elapsed = currentTime - startTime;
    const hold = Config.HIGHLIGHT_HOLD_DURATION;
    const fade = Config.HIGHLIGHT_FADE_DURATION;
    if (elapsed < hold) {
      return 1;
    } else if (elapsed < hold + fade) {
      return 1 - this.easeOutCubic((elapsed - hold) / fade);
    }
    return 0;
  }

  public update(delta: number, currentTime: number): void {
    if (!this.particles || !this.geometry) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    const count = this.params.particleCount;

    this.particles.rotation.y += delta * this.params.rotationSpeed * 0.1;

    const rippleRadius = Config.RIPPLE_RADIUS;
    const rippleDuration = Config.RIPPLE_DURATION;
    const expandDuration = Config.EXPLOSION_EXPAND_DURATION;
    const recoverDuration = Config.EXPLOSION_RECOVER_DURATION;
    const expandRatio = Config.EXPLOSION_EXPAND_RATIO;
    const holdDuration = Config.HIGHLIGHT_HOLD_DURATION;
    const fadeDuration = Config.HIGHLIGHT_FADE_DURATION;
    const highlightTotal = holdDuration + fadeDuration;

    const currentRotation = this.particles.rotation.y;
    const angularShift = Config.ANGULAR_HUE_SHIFT;
    const highlightColorVec = this.hexToRgb(Config.HIGHLIGHT_COLOR);
    const tmpColorA = new THREE.Color();
    const tmpColorB = new THREE.Color();

    const activeHighlights: { index: number; t: number }[] = [];
    for (let i = 0; i < count; i++) {
      const state = this.particleStates[i];
      if (!state) continue;

      if (state.highlightActive) {
        const elapsed = currentTime - state.highlightStartTime;
        let fadeT: number;
        if (elapsed < holdDuration) {
          fadeT = 1;
        } else if (elapsed < highlightTotal) {
          fadeT = 1 - this.easeOutCubic((elapsed - holdDuration) / fadeDuration);
        } else {
          state.highlightActive = false;
          fadeT = 0;
        }
        if (state.highlightActive) {
          activeHighlights.push({ index: i, t: fadeT });
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const state = this.particleStates[i];
      if (!state) continue;

      let pos = state.basePosition.clone();

      if (state.explosionActive) {
        const elapsed = currentTime - state.explosionStartTime;
        if (elapsed < expandDuration) {
          const t = elapsed / expandDuration;
          const currentRadius = 1 + (expandRatio - 1) * t;
          pos.multiplyScalar(currentRadius);
        } else if (elapsed < expandDuration + recoverDuration) {
          const t = (elapsed - expandDuration) / recoverDuration;
          const eased = this.easeOutCubic(t);
          const currentRadius = expandRatio - (expandRatio - 1) * eased;
          pos.multiplyScalar(currentRadius);
        } else {
          state.explosionActive = false;
        }
      }

      if (state.rippleTarget && state.rippleStartTime > 0) {
        const elapsed = currentTime - state.rippleStartTime;
        if (elapsed < rippleDuration) {
          const progress = elapsed / rippleDuration;
          let attractT: number;
          if (progress < 0.5) {
            const t = progress * 2;
            attractT = this.easeOutQuad(t);
          } else {
            const t = (progress - 0.5) * 2;
            attractT = this.easeInQuad(t);
          }
          const strength = this.params.attractStrength * attractT;
          pos.lerp(state.rippleTarget, strength * 0.3);
        } else {
          state.rippleTarget = null;
          state.rippleStartTime = 0;
        }
      }

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const effectiveAngle = state.baseAngle + currentRotation;
      const hueOffset = angularShift * Math.sin(effectiveAngle * 2);

      if (this.params.colorTheme === 'rainbow') {
        this.sampleRainbowColor(state.distanceRatio, tmpColorA);
      } else {
        this.sampleBaseColor(state.distanceRatio, tmpColorA);
      }
      this.applyHueShift(tmpColorA, hueOffset, tmpColorA);

      let baseSize = this.getParticleSize(state.distanceRatio);

      let highlightContrib: number = 0;
      tmpColorB.copy(tmpColorA);
      let sizeScale: number = 1;

      for (const h of activeHighlights) {
        const hState = this.particleStates[h.index];
        if (!hState) continue;
        if (h.index === i) {
          highlightContrib = Math.max(highlightContrib, h.t);
          sizeScale = Math.max(sizeScale, 1 + (Config.HIGHLIGHT_SCALE - 1) * h.t);
        } else {
          const dist = pos.distanceTo(hState.basePosition);
          if (dist < rippleRadius) {
            const rippleT = 1 - (dist / rippleRadius);
            sizeScale = Math.max(sizeScale, 1 + rippleT * 0.5 * h.t);
          }
        }
      }

      if (highlightContrib > 0) {
        this.lerpColor(tmpColorA, highlightColorVec, highlightContrib, tmpColorB);
      }

      sizes[i] = baseSize * sizeScale;
      colors[i * 3] = tmpColorB.r;
      colors[i * 3 + 1] = tmpColorB.g;
      colors[i * 3 + 2] = tmpColorB.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public highlightParticle(index: number, worldPoint: THREE.Vector3, currentTime: number): void {
    if (index < 0 || index >= this.params.particleCount) return;
    const state = this.particleStates[index];
    if (!state) return;

    state.highlightActive = true;
    state.highlightStartTime = currentTime;

    const localPoint = this.particles!.worldToLocal(worldPoint.clone());

    const count = this.params.particleCount;
    const rippleRadius = Config.RIPPLE_RADIUS;

    for (let i = 0; i < count; i++) {
      if (i === index) continue;
      const otherState = this.particleStates[i];
      const dist = otherState.basePosition.distanceTo(localPoint);
      if (dist < rippleRadius) {
        otherState.rippleTarget = localPoint.clone();
        otherState.rippleStartTime = currentTime;
      }
    }
  }

  public clearHighlight(): void {
  }

  public triggerExplosion(min: THREE.Vector2, max: THREE.Vector2, camera: THREE.Camera, currentTime: number): void {
    if (!this.particles || !this.geometry) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const count = this.params.particleCount;

    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );

      const worldPos = pos.clone().applyMatrix4(this.particles.matrixWorld);
      const projected = worldPos.clone().project(camera);

      const x = (projected.x + 1) / 2 * window.innerWidth;
      const y = (1 - (projected.y + 1) / 2) * window.innerHeight;

      if (x >= min.x && x <= max.x && y >= min.y && y <= max.y) {
        const state = this.particleStates[i];
        if (state) {
          state.explosionActive = true;
          state.explosionStartTime = currentTime;
        }
      }
    }
  }

  public onParamsChange(callback: () => void): void {
    this.onParamsChangeCallbacks.push(callback);
  }

  public updateParams(newParams: Partial<GalaxyParams>): void {
    const needsRebuild =
      newParams.particleCount !== undefined && newParams.particleCount !== this.params.particleCount ||
      newParams.colorTheme !== undefined && newParams.colorTheme !== this.params.colorTheme;

    this.params = { ...this.params, ...newParams };

    if (needsRebuild) {
      this.createGalaxy();
    }

    this.onParamsChangeCallbacks.forEach(cb => cb());
  }

  public getParams(): GalaxyParams {
    return { ...this.params };
  }

  public getParticles(): THREE.Points | null {
    return this.particles;
  }

  public getParticleCount(): number {
    return this.params.particleCount;
  }

  public getRotationSpeed(): number {
    return this.params.rotationSpeed;
  }

  public reset(): void {
    this.params = { ...DefaultGalaxyParams };
    this.createGalaxy();
    this.onParamsChangeCallbacks.forEach(cb => cb());
  }

  public dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.particleStates = [];
    this.baseColorLookup = null;
  }
}
