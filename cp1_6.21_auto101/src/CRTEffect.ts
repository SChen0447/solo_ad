import Phaser from 'phaser';

export interface CRTEffectOptions {
  scanlineOpacity: number;
  rgbOffset: number;
  waterWaveIntensity: number;
  enabled: boolean;
}

export class CRTEffect {
  private scene: Phaser.Scene;
  private renderTexture: Phaser.GameObjects.RenderTexture;
  private crtShaderPipeline!: Phaser.Renderer.WebGL.WebGLPipeline;
  private options: CRTEffectOptions;
  private targetOptions: CRTEffectOptions;
  private transitionProgress: number = 1;
  private isTransitioning: boolean = false;
  private transitionDuration: number = 0.3;
  private idleTime: number = 0;
  private idleThreshold: number = 5;
  private waterWaveEaseInDuration: number = 2;
  private waterWaveEaseOutDuration: number = 0.8;
  private waterWaveIdleTarget: number = 1.5;
  private manualWaterWaveIntensity: number = 0;
  private useManualWaterWave: boolean = false;
  private time: number = 0;
  private shaderEnabled: boolean = true;
  private scaleFactor: number = 0.8;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
    this.options = {
      scanlineOpacity: 0.4,
      rgbOffset: 1.5,
      waterWaveIntensity: 0,
      enabled: true,
    };
    this.targetOptions = { ...this.options };

    const rtWidth = Math.floor(width * this.scaleFactor);
    const rtHeight = Math.floor(height * this.scaleFactor);
    this.renderTexture = scene.add.renderTexture(0, 0, rtWidth, rtHeight);
    this.renderTexture.setOrigin(0, 0);
    this.renderTexture.setDisplaySize(width, height);
    this.renderTexture.setDepth(9999);
    this.renderTexture.setVisible(false);

    this.initShaderPipeline(width, height);
  }

  private initShaderPipeline(width: number, height: number): void {
    const renderer = this.scene.game.renderer;
    if (renderer.type !== Phaser.WEBGL) {
      return;
    }

    const webglRenderer = renderer as Phaser.Renderer.WebGL.WebGLRenderer;

    const vertShader = `
      attribute vec2 inPosition;
      attribute vec2 inTexCoord;
      attribute float inTexId;
      attribute float inTintEffect;
      attribute vec4 inTint;
      uniform mat4 uProjectionMatrix;
      varying vec2 vTextureCoord;
      varying vec4 vTint;
      void main() {
        vTextureCoord = inTexCoord;
        vTint = inTint;
        gl_Position = uProjectionMatrix * vec4(inPosition, 0.0, 1.0);
      }
    `;

    const fragShader = `
      precision mediump float;
      varying vec2 vTextureCoord;
      varying vec4 vTint;
      uniform sampler2D uMainSampler;
      uniform float uTime;
      uniform float uScanlineOpacity;
      uniform float uRgbOffset;
      uniform float uWaterWaveIntensity;
      uniform float uEnabled;
      uniform vec2 uResolution;

      vec3 applyScanlines(vec3 color, vec2 uv) {
        float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
        float linePattern = step(0.5, fract(uv.y * uResolution.y / 2.0));
        scanline = mix(scanline, linePattern, 0.6);
        float opacity = uScanlineOpacity * uEnabled;
        return color * (1.0 - opacity * 0.4) + color * scanline * opacity * 0.6;
      }

      vec3 applyChromaticAberration(vec2 uv) {
        float offset = uRgbOffset * uEnabled / uResolution.x;
        vec2 redOffset = vec2(offset, 0.0);
        vec2 blueOffset = vec2(-offset, 0.0);
        float r = texture2D(uMainSampler, uv + redOffset).r;
        float g = texture2D(uMainSampler, uv).g;
        float b = texture2D(uMainSampler, uv + blueOffset).b;
        return vec3(r, g, b);
      }

      vec2 applyWaterWave(vec2 uv) {
        float intensity = uWaterWaveIntensity * uEnabled / uResolution.x;
        float waveX = sin(uv.y * 20.0 + uTime * 2.5) * intensity;
        float waveY = cos(uv.x * 18.0 + uTime * 2.0) * intensity * 0.8;
        float ripple = sin(length(uv - 0.5) * 30.0 - uTime * 4.0) * intensity * 0.3;
        return uv + vec2(waveX + ripple, waveY + ripple * 0.5);
      }

      void main() {
        vec2 uv = vTextureCoord;
        vec2 distortedUV = applyWaterWave(uv);
        vec3 color = applyChromaticAberration(distortedUV);
        color = applyScanlines(color, distortedUV);
        float vignette = 1.0 - length((uv - 0.5) * 1.2) * 0.4 * uEnabled;
        color *= vignette;
        float noise = fract(sin(dot(uv * uResolution + uTime, vec2(12.9898, 78.233))) * 43758.5453);
        color += (noise - 0.5) * 0.02 * uEnabled;
        gl_FragColor = vec4(color, texture2D(uMainSampler, uv).a) * vTint;
      }
    `;

    const pipelineConfig = {
      game: this.scene.game,
      renderer: webglRenderer,
      name: 'CRTEffectPipeline',
      vertShader,
      fragShader,
      uniforms: ['uProjectionMatrix', 'uMainSampler', 'uTime', 'uScanlineOpacity', 'uRgbOffset', 'uWaterWaveIntensity', 'uEnabled', 'uResolution'],
    } as unknown as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig;

    try {
      this.crtShaderPipeline = webglRenderer.pipelines.add('CRTEffectPipeline', new (Phaser.Renderer.WebGL.Pipelines.MultiPipeline as any)(pipelineConfig));
    } catch (e) {
      console.warn('Failed to create CRT shader pipeline:', e);
    }
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.time += dt;

    if (this.isTransitioning) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / this.transitionDuration);
      const t = this.easeInOutCubic(this.transitionProgress);
      this.options.scanlineOpacity = Phaser.Math.Linear(this.options.scanlineOpacity, this.targetOptions.scanlineOpacity, t);
      this.options.rgbOffset = Phaser.Math.Linear(this.options.rgbOffset, this.targetOptions.rgbOffset, t);
      this.options.waterWaveIntensity = Phaser.Math.Linear(this.options.waterWaveIntensity, this.targetOptions.waterWaveIntensity, t);
      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
      }
    }

    if (!this.useManualWaterWave && this.shaderEnabled) {
      this.idleTime += dt;
      if (this.idleTime >= this.idleThreshold) {
        const overTime = this.idleTime - this.idleThreshold;
        const t = Math.min(1, overTime / this.waterWaveEaseInDuration);
        const easedT = this.easeInOutSine(t);
        const target = Phaser.Math.Linear(0, this.waterWaveIdleTarget, easedT);
        this.options.waterWaveIntensity = Phaser.Math.Linear(this.options.waterWaveIntensity, target, 0.05);
      } else {
        const t = Math.min(1, dt / this.waterWaveEaseOutDuration);
        this.options.waterWaveIntensity = Phaser.Math.Linear(this.options.waterWaveIntensity, 0, t);
      }
    }
  }

  resetIdleTimer(): void {
    this.idleTime = 0;
  }

  beginRender(): void {
    const renderer = this.scene.game.renderer;
    if (renderer.type === Phaser.WEBGL && this.crtShaderPipeline) {
      this.crtShaderPipeline.set1f('uTime', this.time);
      this.crtShaderPipeline.set1f('uScanlineOpacity', this.options.scanlineOpacity);
      this.crtShaderPipeline.set1f('uRgbOffset', this.options.rgbOffset);
      this.crtShaderPipeline.set1f('uWaterWaveIntensity', this.options.waterWaveIntensity);
      this.crtShaderPipeline.set1f('uEnabled', this.options.enabled ? 1.0 : 0.0);
      const width = this.scene.scale.width;
      const height = this.scene.scale.height;
      this.crtShaderPipeline.set2f('uResolution', width, height);
    }
  }

  applyToGameObject(gameObject: Phaser.GameObjects.Components.Pipeline): void {
    if (this.scene.game.renderer.type === Phaser.WEBGL && this.crtShaderPipeline) {
      gameObject.setPipeline(this.crtShaderPipeline);
    }
  }

  toggleEffects(): void {
    this.shaderEnabled = !this.shaderEnabled;
    this.targetOptions.enabled = this.shaderEnabled;
    this.targetOptions.scanlineOpacity = this.shaderEnabled ? 0.4 : 0;
    this.targetOptions.rgbOffset = this.shaderEnabled ? 1.5 : 0;
    if (!this.shaderEnabled) {
      this.targetOptions.waterWaveIntensity = 0;
    }
    this.startTransition();
  }

  private startTransition(): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  setManualWaterWaveIntensity(value: number): void {
    this.manualWaterWaveIntensity = Phaser.Math.Clamp(value, 0, 3);
    this.options.waterWaveIntensity = this.manualWaterWaveIntensity;
  }

  setManualMode(enabled: boolean): void {
    this.useManualWaterWave = enabled;
    if (!enabled) {
      this.idleTime = 0;
    }
  }

  isManualMode(): boolean {
    return this.useManualWaterWave;
  }

  getWaterWaveIntensity(): number {
    return this.options.waterWaveIntensity;
  }

  isEnabled(): boolean {
    return this.shaderEnabled;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  getRenderTexture(): Phaser.GameObjects.RenderTexture {
    return this.renderTexture;
  }

  destroy(): void {
    if (this.renderTexture) {
      this.renderTexture.destroy();
    }
  }
}
