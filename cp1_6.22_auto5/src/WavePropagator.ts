import * as THREE from 'three';

export interface WaveParameters {
  frequency: number;
  phaseOffset: number;
  waveSpeed: number;
}

interface SmoothParams {
  targetFrequency: number;
  currentFrequency: number;
  targetPhaseOffset: number;
  currentPhaseOffset: number;
  targetWaveSpeed: number;
  currentWaveSpeed: number;
  transitionProgress: number;
  transitionDuration: number;
}

export class WavePropagator {
  public scene: THREE.Scene;
  private waveMesh: THREE.Mesh;
  private waveGeometry: THREE.SphereGeometry;
  private waveMaterial: THREE.ShaderMaterial;
  
  private sliceTexture!: THREE.DataTexture;
  private sliceResolution: number = 256;
  
  private source1: THREE.Vector3;
  private source2: THREE.Vector3;
  private color1: THREE.Color;
  private color2: THREE.Color;
  
  private params: SmoothParams;
  private time: number = 0;
  
  private boundaryRadius: number;
  private maxWaves: number = 10;
  private waveRingThickness: number = 0.15;

  constructor(
    source1Pos: THREE.Vector3,
    source2Pos: THREE.Vector3,
    color1: number,
    color2: number,
    boundaryRadius: number,
    initialParams: WaveParameters
  ) {
    this.source1 = source1Pos.clone();
    this.source2 = source2Pos.clone();
    this.color1 = new THREE.Color(color1);
    this.color2 = new THREE.Color(color2);
    this.boundaryRadius = boundaryRadius;

    this.params = {
      targetFrequency: initialParams.frequency,
      currentFrequency: initialParams.frequency,
      targetPhaseOffset: initialParams.phaseOffset,
      currentPhaseOffset: initialParams.phaseOffset,
      targetWaveSpeed: initialParams.waveSpeed,
      currentWaveSpeed: initialParams.waveSpeed,
      transitionProgress: 1,
      transitionDuration: 0.8
    };

    this.scene = new THREE.Scene();
    
    this.waveGeometry = new THREE.SphereGeometry(this.boundaryRadius, 128, 128);
    
    this.waveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        source1Pos: { value: this.source1 },
        source2Pos: { value: this.source2 },
        color1: { value: this.color1 },
        color2: { value: this.color2 },
        time: { value: 0 },
        frequency: { value: initialParams.frequency },
        phaseOffset: { value: initialParams.phaseOffset },
        waveSpeed: { value: initialParams.waveSpeed },
        boundaryRadius: { value: this.boundaryRadius },
        waveRingThickness: { value: this.waveRingThickness },
        maxWaves: { value: this.maxWaves }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 source1Pos;
        uniform vec3 source2Pos;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        uniform float frequency;
        uniform float phaseOffset;
        uniform float waveSpeed;
        uniform float boundaryRadius;
        uniform float waveRingThickness;
        uniform float maxWaves;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        float waveAtPoint(vec3 pos, vec3 source, float freq, float speed, float phase, float t) {
          float dist = distance(pos, source);
          float wavelength = speed / freq;
          float k = 6.28318 / wavelength;
          float omega = 6.28318 * freq;
          float amplitude = exp(-dist * 0.05);
          float wave = sin(k * dist - omega * t + phase) * amplitude;
          return wave;
        }
        
        float waveRing(float dist, float speed, float t, float thickness) {
          float waveRadius = mod(t * speed, boundaryRadius * 2.0);
          float ring = 1.0 - abs(dist - waveRadius) / thickness;
          ring = max(0.0, ring);
          return ring;
        }
        
        vec3 amplitudeToColor(float amplitude) {
          float absAmp = abs(amplitude);
          vec3 blue = vec3(0.0, 0.4, 1.0);
          vec3 green = vec3(0.0, 1.0, 0.4);
          vec3 yellow = vec3(1.0, 0.9, 0.0);
          vec3 red = vec3(1.0, 0.2, 0.0);
          
          if (absAmp < 0.33) {
            float t = absAmp / 0.33;
            return mix(blue, green, t);
          } else if (absAmp < 0.66) {
            float t = (absAmp - 0.33) / 0.33;
            return mix(green, yellow, t);
          } else {
            float t = (absAmp - 0.66) / 0.34;
            return mix(yellow, red, t);
          }
        }
        
        void main() {
          float dist1 = distance(vPosition, source1Pos);
          float dist2 = distance(vPosition, source2Pos);
          
          float wavelength = waveSpeed / frequency;
          float k = 6.28318 / wavelength;
          float omega = 6.28318 * frequency;
          
          float amp1 = 1.0 / (1.0 + dist1 * 0.08);
          float amp2 = 1.0 / (1.0 + dist2 * 0.08);
          
          float wave1 = sin(k * dist1 - omega * time) * amp1;
          float wave2 = sin(k * dist2 - omega * time + phaseOffset) * amp2;
          
          float totalAmplitude = wave1 + wave2;
          float absAmplitude = abs(totalAmplitude);
          
          vec3 interferenceColor = amplitudeToColor(absAmplitude / 2.0);
          
          float brightness = 0.5 + absAmplitude * 0.5;
          float alpha = 0.1 + absAmplitude * 0.5;
          
          float ring1 = waveRing(dist1, waveSpeed, time, waveRingThickness) * amp1;
          float ring2 = waveRing(dist2, waveSpeed, time, waveRingThickness) * amp2;
          
          vec3 ringColor1 = color1 * ring1;
          vec3 ringColor2 = color2 * ring2;
          
          float constructive = max(0.0, totalAmplitude) * 0.5;
          float destructive = max(0.0, -totalAmplitude) * 0.5;
          
          vec3 finalColor = interferenceColor * (0.3 + absAmplitude * 0.7);
          finalColor += ringColor1 * 0.5;
          finalColor += ringColor2 * 0.5;
          
          float finalAlpha = alpha * 0.6;
          finalAlpha += ring1 * 0.3;
          finalAlpha += ring2 * 0.3;
          
          float edgeFade = 1.0 - smoothstep(boundaryRadius * 0.8, boundaryRadius, dist1);
          edgeFade = min(edgeFade, 1.0 - smoothstep(boundaryRadius * 0.8, boundaryRadius, dist2));
          finalAlpha *= edgeFade;
          
          gl_FragColor = vec4(finalColor * brightness, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.waveMesh = new THREE.Mesh(this.waveGeometry, this.waveMaterial);
    this.scene.add(this.waveMesh);
    
    this.createSliceTexture();
  }

  private createSliceTexture(): void {
    const data = new Uint8Array(this.sliceResolution * this.sliceResolution * 4);
    this.sliceTexture = new THREE.DataTexture(
      data,
      this.sliceResolution,
      this.sliceResolution,
      THREE.RGBAFormat
    );
    this.sliceTexture.needsUpdate = true;
  }

  public setSource1Position(pos: THREE.Vector3): void {
    this.source1.copy(pos);
    this.waveMaterial.uniforms.source1Pos.value.copy(pos);
  }

  public setSource2Position(pos: THREE.Vector3): void {
    this.source2.copy(pos);
    this.waveMaterial.uniforms.source2Pos.value.copy(pos);
  }

  public setFrequency(freq: number): void {
    this.params.targetFrequency = freq;
    this.params.transitionProgress = 0;
  }

  public setPhaseOffset(phase: number): void {
    this.params.targetPhaseOffset = phase * Math.PI / 180;
    this.params.transitionProgress = 0;
  }

  public setWaveSpeed(speed: number): void {
    this.params.targetWaveSpeed = speed;
    this.params.transitionProgress = 0;
  }

  public setParameters(params: Partial<WaveParameters>): void {
    if (params.frequency !== undefined) {
      this.params.targetFrequency = params.frequency;
    }
    if (params.phaseOffset !== undefined) {
      this.params.targetPhaseOffset = params.phaseOffset * Math.PI / 180;
    }
    if (params.waveSpeed !== undefined) {
      this.params.targetWaveSpeed = params.waveSpeed;
    }
    this.params.transitionProgress = 0;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    if (this.params.transitionProgress < 1) {
      this.params.transitionProgress = Math.min(
        1,
        this.params.transitionProgress + deltaTime / this.params.transitionDuration
      );
      
      const t = this.easeInOutCubic(this.params.transitionProgress);
      
      this.params.currentFrequency = THREE.MathUtils.lerp(
        this.params.currentFrequency,
        this.params.targetFrequency,
        t * deltaTime / this.params.transitionDuration
      );
      this.params.currentPhaseOffset = THREE.MathUtils.lerp(
        this.params.currentPhaseOffset,
        this.params.targetPhaseOffset,
        t * deltaTime / this.params.transitionDuration
      );
      this.params.currentWaveSpeed = THREE.MathUtils.lerp(
        this.params.currentWaveSpeed,
        this.params.targetWaveSpeed,
        t * deltaTime / this.params.transitionDuration
      );
    } else {
      this.params.currentFrequency = this.params.targetFrequency;
      this.params.currentPhaseOffset = this.params.targetPhaseOffset;
      this.params.currentWaveSpeed = this.params.targetWaveSpeed;
    }

    this.waveMaterial.uniforms.time.value = this.time;
    this.waveMaterial.uniforms.frequency.value = this.params.currentFrequency;
    this.waveMaterial.uniforms.phaseOffset.value = this.params.currentPhaseOffset;
    this.waveMaterial.uniforms.waveSpeed.value = this.params.currentWaveSpeed;
    
    this.updateSliceTexture();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateSliceTexture(): void {
    const data = this.sliceTexture.image.data as unknown as Uint8Array;
    const half = this.boundaryRadius;
    
    const freq = this.params.currentFrequency;
    const speed = this.params.currentWaveSpeed;
    const phase = this.params.currentPhaseOffset;
    const wavelength = speed / freq;
    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * freq;

    for (let y = 0; y < this.sliceResolution; y++) {
      for (let x = 0; x < this.sliceResolution; x++) {
        const worldX = (x / this.sliceResolution - 0.5) * 2 * half;
        const worldZ = (y / this.sliceResolution - 0.5) * 2 * half;
        const worldY = 0;

        const point = new THREE.Vector3(worldX, worldY, worldZ);
        const dist1 = point.distanceTo(this.source1);
        const dist2 = point.distanceTo(this.source2);

        const amp1 = 1 / (1 + dist1 * 0.08);
        const amp2 = 1 / (1 + dist2 * 0.08);

        const wave1 = Math.sin(k * dist1 - omega * this.time) * amp1;
        const wave2 = Math.sin(k * dist2 - omega * this.time + phase) * amp2;
        
        const totalAmplitude = wave1 + wave2;
        const absAmplitude = Math.abs(totalAmplitude) / 2;

        const color = this.amplitudeToColorRGB(absAmplitude);

        const idx = (y * this.sliceResolution + x) * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = Math.floor(255 * Math.min(1, 0.2 + absAmplitude * 0.8));
      }
    }
    
    this.sliceTexture.needsUpdate = true;
  }

  private amplitudeToColorRGB(amplitude: number): { r: number; g: number; b: number } {
    const absAmp = Math.min(1, Math.abs(amplitude));
    
    if (absAmp < 0.33) {
      const t = absAmp / 0.33;
      return {
        r: Math.floor(255 * (0 + t * 0)),
        g: Math.floor(255 * (0.4 + t * 0.6)),
        b: Math.floor(255 * (1 - t * 0.6))
      };
    } else if (absAmp < 0.66) {
      const t = (absAmp - 0.33) / 0.33;
      return {
        r: Math.floor(255 * (0 + t * 1)),
        g: Math.floor(255 * (1 - t * 0.1)),
        b: Math.floor(255 * (0.4 - t * 0.4))
      };
    } else {
      const t = (absAmp - 0.66) / 0.34;
      return {
        r: 255,
        g: Math.floor(255 * (0.9 - t * 0.7)),
        b: 0
      };
    }
  }

  public getSliceTexture(): THREE.DataTexture {
    return this.sliceTexture;
  }

  public getMesh(): THREE.Mesh {
    return this.waveMesh;
  }

  public getCurrentParams(): WaveParameters {
    return {
      frequency: this.params.currentFrequency,
      phaseOffset: (this.params.currentPhaseOffset * 180) / Math.PI,
      waveSpeed: this.params.currentWaveSpeed
    };
  }

  public captureInterferenceSnapshot(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.sliceResolution;
    canvas.height = this.sliceResolution;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(this.sliceResolution, this.sliceResolution);
    const data = this.sliceTexture.image.data as unknown as Uint8Array;
    
    for (let i = 0; i < data.length; i++) {
      imageData.data[i] = data[i];
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  public dispose(): void {
    this.waveGeometry.dispose();
    this.waveMaterial.dispose();
    this.sliceTexture.dispose();
  }
}
