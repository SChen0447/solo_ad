import * as THREE from 'three';
import { Config, ColorTheme, ColorThemes, GalaxyParams, DefaultGalaxyParams } from './config';

interface ParticleState {
  basePosition: THREE.Vector3;
  rippleTarget: THREE.Vector3 | null;
  rippleStartTime: number;
  highlightStartTime: number;
  explosionStartTime: number;
  explosionActive: boolean;
}

export class Galaxy {
  private scene: THREE.Scene;
  private params: GalaxyParams;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private particleStates: ParticleState[] = [];
  private highlightedIndex: number = -1;
  private highlightedTimer: number = 0;
  private particleTexture: THREE.Texture;

  constructor(scene: THREE.Scene, params: Partial<GalaxyParams> = {}) {
    this.scene = scene;
    this.params = { ...DefaultGalaxyParams, ...params };
    this.particleTexture = this.createParticleTexture();
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

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    const result = color1.clone();
    result.lerp(color2, t);
    return result;
  }

  private getRainbowColor(t: number): THREE.Color {
    const hue = t % 1;
    const color = new THREE.Color();
    color.setHSL(hue, 1.0, 0.6);
    return color;
  }

  private getParticleColor(distanceRatio: number, theme: ColorTheme): THREE.Color {
    const themeColors = ColorThemes[theme];
    if (theme === 'rainbow') {
      return this.getRainbowColor(distanceRatio);
    }
    const centerColor = this.hexToRgb(themeColors.center);
    const edgeColor = this.hexToRgb(themeColors.edge);
    return this.lerpColor(centerColor, edgeColor, distanceRatio);
  }

  private getParticleSize(distanceRatio: number): number {
    return Config.PARTICLE_SIZE_CENTER + (Config.PARTICLE_SIZE_EDGE - Config.PARTICLE_SIZE_CENTER) * distanceRatio;
  }

  private createGalaxy(): void {
    this.dispose();

    const count = this.params.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.particleStates = new Array(count);

    const radius = Config.GALAXY_RADIUS;
    const arms = Config.GALAXY_ARMS;
    const twist = Config.GALAXY_TWIST;
    const thickness = Config.GALAXY_THICKNESS;

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

      const color = this.getParticleColor(distanceRatio, this.params.colorTheme);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = this.getParticleSize(distanceRatio);

      this.particleStates[i] = {
        basePosition: basePos.clone(),
        rippleTarget: null,
        rippleStartTime: 0,
        highlightStartTime: 0,
        explosionStartTime: 0,
        explosionActive: false,
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

    let anyHighlightActive = false;

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
          const eased = 1 - Math.pow(1 - t, 3);
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
            attractT = progress * 2;
          } else {
            attractT = (1 - progress) * 2;
          }
          attractT = Math.sin(attractT * Math.PI);
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

      const distanceRatio = state.basePosition.length() / Config.GALAXY_RADIUS;
      let baseSize = this.getParticleSize(distanceRatio);
      let color = this.getParticleColor(distanceRatio, this.params.colorTheme);

      if (this.highlightedIndex >= 0) {
        const highlightState = this.particleStates[this.highlightedIndex];
        if (highlightState) {
          const highlightPos = highlightState.basePosition;
          const distToHighlight = pos.distanceTo(highlightPos);

          if (i === this.highlightedIndex) {
            baseSize *= Config.HIGHLIGHT_SCALE;
            color = this.hexToRgb(Config.HIGHLIGHT_COLOR);
            anyHighlightActive = true;
          } else if (distToHighlight < rippleRadius) {
            const rippleT = 1 - (distToHighlight / rippleRadius);
            baseSize *= 1 + rippleT * 0.5;
          }
        }
      }

      sizes[i] = baseSize;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    if (!anyHighlightActive && this.highlightedIndex >= 0) {
      this.highlightedIndex = -1;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public highlightParticle(index: number, worldPoint: THREE.Vector3, currentTime: number): void {
    if (index < 0 || index >= this.params.particleCount) return;
    this.highlightedIndex = index;

    const localPoint = this.particles!.worldToLocal(worldPoint.clone());

    const count = this.params.particleCount;
    const rippleRadius = Config.RIPPLE_RADIUS;

    for (let i = 0; i < count; i++) {
      if (i === index) continue;
      const state = this.particleStates[i];
      const dist = state.basePosition.distanceTo(localPoint);
      if (dist < rippleRadius) {
        const state_i = this.particleStates[i];
        state_i.rippleTarget = localPoint.clone();
        state_i.rippleStartTime = currentTime;
      }
    }
  }

  public clearHighlight(): void {
    this.highlightedIndex = -1;
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

  public updateParams(newParams: Partial<GalaxyParams>): void {
    const needsRebuild =
      newParams.particleCount !== undefined && newParams.particleCount !== this.params.particleCount ||
      newParams.colorTheme !== undefined && newParams.colorTheme !== this.params.colorTheme;

    this.params = { ...this.params, ...newParams };

    if (needsRebuild) {
      this.createGalaxy();
    }
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
  }
}
