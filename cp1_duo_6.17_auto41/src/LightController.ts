import * as THREE from 'three';

export type EnvPreset = 'clearSky' | 'sunset' | 'cloudy';

interface EnvConfig {
  background: THREE.Color;
  ambientIntensity: number;
  directionalIntensity: number;
  fogColor: THREE.Color;
  fogDensity: number;
}

export class LightController {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private sunAzimuth: number = 45;
  private sunAltitude: number = 45;
  private currentEnv: EnvPreset = 'clearSky';
  private envTextures: Map<EnvPreset, THREE.Texture | null> = new Map();
  private envConfigs: Record<EnvPreset, EnvConfig>;
  private transitionActive: boolean = false;
  private transitionProgress: number = 0;
  private transitionStart: number = 0;
  private fromConfig: EnvConfig | null = null;
  private toConfig: EnvConfig | null = null;
  private fromEnv: EnvPreset = 'clearSky';
  private toEnv: EnvPreset = 'clearSky';
  private tempColor: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.envConfigs = {
      clearSky: {
        background: new THREE.Color(0x87ceeb),
        ambientIntensity: 0.5,
        directionalIntensity: 1.2,
        fogColor: new THREE.Color(0xbfe3f5),
        fogDensity: 0.005
      },
      sunset: {
        background: new THREE.Color(0xff7e5f),
        ambientIntensity: 0.35,
        directionalIntensity: 0.9,
        fogColor: new THREE.Color(0xfeb47b),
        fogDensity: 0.008
      },
      cloudy: {
        background: new THREE.Color(0x5a6c7d),
        ambientIntensity: 0.6,
        directionalIntensity: 0.5,
        fogColor: new THREE.Color(0x8a9ba8),
        fogDensity: 0.012
      }
    };

    this.ambientLight = new THREE.AmbientLight(0xffffff, this.envConfigs.clearSky.ambientIntensity);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, this.envConfigs.clearSky.directionalIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -15;
    this.sunLight.shadow.camera.right = 15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    this.scene.add(this.sunLight);

    this.generateProceduralEnvMaps();
    this.updateSunPosition();
    this.applyEnvConfig(this.envConfigs.clearSky);
  }

  private generateProceduralEnvMaps(): void {
    const presets: EnvPreset[] = ['clearSky', 'sunset', 'cloudy'];

    for (const preset of presets) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

      if (preset === 'clearSky') {
        gradient.addColorStop(0, '#1e90ff');
        gradient.addColorStop(0.5, '#87ceeb');
        gradient.addColorStop(0.8, '#e0f6ff');
        gradient.addColorStop(1, '#f0f8ff');
      } else if (preset === 'sunset') {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.3, '#ff6b6b');
        gradient.addColorStop(0.5, '#ff7e5f');
        gradient.addColorStop(0.7, '#feb47b');
        gradient.addColorStop(0.85, '#ffd89b');
        gradient.addColorStop(1, '#ffecbc');
      } else {
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(0.5, '#5a6c7d');
        gradient.addColorStop(0.8, '#95a5a6');
        gradient.addColorStop(1, '#bdc3c7');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (preset === 'clearSky') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.drawCloud(ctx, 100, 60, 50);
        this.drawCloud(ctx, 350, 80, 40);
        this.drawCloud(ctx, 250, 120, 35);
      }

      if (preset === 'sunset') {
        const sunGradient = ctx.createRadialGradient(380, 140, 0, 380, 140, 60);
        sunGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        sunGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
        sunGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        ctx.fillStyle = sunGradient;
        ctx.fillRect(250, 40, 260, 200);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.envTextures.set(preset, texture);
    }

    this.scene.environment = this.envTextures.get('clearSky') || null;
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y - r * 0.1, r * 0.4, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y, r * 0.45, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y + r * 0.2, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  private updateSunPosition(): void {
    const azimuthRad = (this.sunAzimuth * Math.PI) / 180;
    const altitudeRad = (this.sunAltitude * Math.PI) / 180;

    const distance = 20;
    const x = Math.cos(altitudeRad) * Math.sin(azimuthRad) * distance;
    const y = Math.sin(altitudeRad) * distance;
    const z = Math.cos(altitudeRad) * Math.cos(azimuthRad) * distance;

    this.sunLight.position.set(x, y, z);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.target.updateMatrixWorld();

    const sunColor = new THREE.Color();
    if (this.sunAltitude < 15) {
      sunColor.setHex(0xff8c42);
    } else if (this.sunAltitude < 30) {
      sunColor.setHex(0xffd89b);
    } else {
      sunColor.setHex(0xffffff);
    }
    this.sunLight.color.copy(sunColor);
  }

  public setSunAngle(azimuth: number, altitude: number): void {
    this.sunAzimuth = ((azimuth % 360) + 360) % 360;
    this.sunAltitude = Math.max(0, Math.min(90, altitude));
    this.updateSunPosition();
  }

  public getSunAngle(): { azimuth: number; altitude: number } {
    return {
      azimuth: this.sunAzimuth,
      altitude: this.sunAltitude
    };
  }

  public setEnvMap(preset: EnvPreset, animate: boolean = true): void {
    if (preset === this.currentEnv && !this.transitionActive) return;

    this.fromEnv = this.currentEnv;
    this.toEnv = preset;
    this.fromConfig = { ...this.envConfigs[this.fromEnv] };
    this.toConfig = { ...this.envConfigs[this.toEnv] };

    if (animate) {
      this.transitionActive = true;
      this.transitionProgress = 0;
      this.transitionStart = performance.now();
    } else {
      this.applyEnvConfig(this.toConfig);
      this.scene.environment = this.envTextures.get(this.toEnv) || null;
      this.currentEnv = preset;
    }
  }

  public getCurrentEnv(): EnvPreset {
    return this.currentEnv;
  }

  private applyEnvConfig(config: EnvConfig): void {
    this.scene.background = config.background.clone();
    this.ambientLight.intensity = config.ambientIntensity;
    this.sunLight.intensity = config.directionalIntensity;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(config.fogColor);
      this.scene.fog.density = config.fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(config.fogColor.getHex(), config.fogDensity);
    }
  }

  public updateTransitions(): void {
    if (!this.transitionActive || !this.fromConfig || !this.toConfig) return;

    const now = performance.now();
    const elapsed = now - this.transitionStart;
    const duration = 1000;
    this.transitionProgress = Math.min(elapsed / duration, 1);

    const t = this.transitionProgress;
    const easeT = 1 - Math.pow(1 - t, 3);

    this.tempColor.setRGB(
      this.fromConfig.background.r + (this.toConfig.background.r - this.fromConfig.background.r) * easeT,
      this.fromConfig.background.g + (this.toConfig.background.g - this.fromConfig.background.g) * easeT,
      this.fromConfig.background.b + (this.toConfig.background.b - this.fromConfig.background.b) * easeT
    );
    this.scene.background = this.tempColor.clone();

    this.ambientLight.intensity =
      this.fromConfig.ambientIntensity +
      (this.toConfig.ambientIntensity - this.fromConfig.ambientIntensity) * easeT;

    this.sunLight.intensity =
      this.fromConfig.directionalIntensity +
      (this.toConfig.directionalIntensity - this.fromConfig.directionalIntensity) * easeT;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setRGB(
        this.fromConfig.fogColor.r + (this.toConfig.fogColor.r - this.fromConfig.fogColor.r) * easeT,
        this.fromConfig.fogColor.g + (this.toConfig.fogColor.g - this.fromConfig.fogColor.g) * easeT,
        this.fromConfig.fogColor.b + (this.toConfig.fogColor.b - this.fromConfig.fogColor.b) * easeT
      );
      this.scene.fog.density =
        this.fromConfig.fogDensity + (this.toConfig.fogDensity - this.fromConfig.fogDensity) * easeT;
    }

    if (t >= 0.5 && this.scene.environment !== this.envTextures.get(this.toEnv)) {
      this.scene.environment = this.envTextures.get(this.toEnv) || null;
    }

    if (this.transitionProgress >= 1) {
      this.transitionActive = false;
      this.currentEnv = this.toEnv;
      this.applyEnvConfig(this.toConfig);
    }
  }

  public getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  public getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  public getEnvTexture(preset: EnvPreset): THREE.Texture | null {
    return this.envTextures.get(preset) || null;
  }

  public dispose(): void {
    this.envTextures.forEach((texture) => {
      if (texture) texture.dispose();
    });
  }
}
