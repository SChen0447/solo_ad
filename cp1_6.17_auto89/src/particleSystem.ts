import * as THREE from 'three';

export interface ParticleParameters {
  particleCount: number;
  rotationSpeed: number;
  colorOffset: number;
  noiseStrength: number;
  spreadRadius: number;
  backgroundColor?: string;
  spiralArms?: number;
  spiralTightness?: number;
  ringThickness?: number;
  ringRadius?: number;
  cloudDensity?: number;
  pulseSpeed?: number;
  pulseIntensity?: number;
  type?: 'spiral' | 'ring' | 'diffuse' | 'custom';
}

const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float life;
  attribute float alpha;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = customColor;
    vAlpha = alpha;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 1.5);
    
    vec3 finalColor = vColor * (1.0 + glow * 0.5);
    float finalAlpha = glow * vAlpha;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export class ParticleSystem {
  private scene: THREE.Scene;
  private parameters: ParticleParameters;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private alphas: Float32Array | null = null;
  private lifetimes: Float32Array | null = null;
  private velocities: Float32Array | null = null;
  private initialPositions: Float32Array | null = null;
  
  private time: number = 0;
  private isTransitioning: boolean = false;
  private maxParticles: number = 50000;
  private currentParticleCount: number = 20000;
  
  private baseHue: number = 0.6;
  
  constructor(scene: THREE.Scene, parameters: ParticleParameters) {
    this.scene = scene;
    this.parameters = { ...parameters };
    this.baseHue = parameters.colorOffset / 360;
    
    this.init();
  }
  
  private init(): void {
    this.geometry = new THREE.BufferGeometry();
    
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.alphas = new Float32Array(this.maxParticles);
    this.lifetimes = new Float32Array(this.maxParticles);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.initialPositions = new Float32Array(this.maxParticles * 3);
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.generateParticles();
    this.updateGeometryAttributes();
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }
  
  private generateParticles(): void {
    const count = this.parameters.particleCount;
    const type = this.parameters.type || 'spiral';
    
    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      
      if (i < count) {
        let x: number, y: number, z: number;
        
        switch (type) {
          case 'spiral':
            const spiralResult = this.generateSpiralParticle(i, count);
            x = spiralResult.x;
            y = spiralResult.y;
            z = spiralResult.z;
            break;
          case 'ring':
            const ringResult = this.generateRingParticle(i, count);
            x = ringResult.x;
            y = ringResult.y;
            z = ringResult.z;
            break;
          case 'diffuse':
          default:
            const diffuseResult = this.generateDiffuseParticle(i, count);
            x = diffuseResult.x;
            y = diffuseResult.y;
            z = diffuseResult.z;
            break;
        }
        
        this.positions![i3] = x;
        this.positions![i3 + 1] = y;
        this.positions![i3 + 2] = z;
        
        this.initialPositions![i3] = x;
        this.initialPositions![i3 + 1] = y;
        this.initialPositions![i3 + 2] = z;
        
        this.velocities![i3] = (Math.random() - 0.5) * 0.01;
        this.velocities![i3 + 1] = (Math.random() - 0.5) * 0.01;
        this.velocities![i3 + 2] = (Math.random() - 0.5) * 0.01;
        
        const hue = this.getParticleHue(i, count);
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        this.colors![i3] = color.r;
        this.colors![i3 + 1] = color.g;
        this.colors![i3 + 2] = color.b;
        
        this.sizes![i] = Math.random() * 2 + 1;
        this.alphas![i] = Math.random() * 0.5 + 0.5;
        this.lifetimes![i] = Math.random();
      } else {
        this.positions![i3] = 0;
        this.positions![i3 + 1] = 0;
        this.positions![i3 + 2] = 0;
        this.initialPositions![i3] = 0;
        this.initialPositions![i3 + 1] = 0;
        this.initialPositions![i3 + 2] = 0;
        this.colors![i3] = 0;
        this.colors![i3 + 1] = 0;
        this.colors![i3 + 2] = 0;
        this.sizes![i] = 0;
        this.alphas![i] = 0;
        this.lifetimes![i] = 0;
      }
    }
    
    this.currentParticleCount = count;
  }
  
  private generateSpiralParticle(index: number, total: number): { x: number; y: number; z: number } {
    const arms = this.parameters.spiralArms || 4;
    const tightness = this.parameters.spiralTightness || 0.8;
    const radius = this.parameters.spreadRadius;
    
    const t = index / total;
    const arm = Math.floor(Math.random() * arms) / arms;
    const angle = (t + arm) * Math.PI * 2 * tightness * 3;
    const r = t * radius + (Math.random() - 0.5) * radius * 0.3;
    
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (Math.random() - 0.5) * radius * 0.2 + Math.sin(angle * 2) * 0.5;
    
    return { x, y, z };
  }
  
  private generateRingParticle(_index: number, _total: number): { x: number; y: number; z: number } {
    const ringRadius = this.parameters.ringRadius || 5;
    const thickness = this.parameters.ringThickness || 0.3;
    const spread = this.parameters.spreadRadius;
    
    const angle = Math.random() * Math.PI * 2;
    const r = ringRadius + (Math.random() - 0.5) * spread * thickness;
    
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (Math.random() - 0.5) * spread * thickness * 0.5;
    
    return { x, y, z };
  }
  
  private generateDiffuseParticle(_index: number, _total: number): { x: number; y: number; z: number } {
    const density = this.parameters.cloudDensity || 0.6;
    const radius = this.parameters.spreadRadius;
    
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const r = Math.pow(Math.random(), 1 / density) * radius;
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    return { x, y, z };
  }
  
  private getParticleHue(index: number, total: number): number {
    const baseHue = this.parameters.colorOffset / 360;
    const variation = (index / total) * 0.3 - 0.15;
    return (baseHue + variation + 1) % 1;
  }
  
  private updateGeometryAttributes(): void {
    if (!this.geometry) return;
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions!, 3));
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors!, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes!, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas!, 1));
    this.geometry.setAttribute('life', new THREE.BufferAttribute(this.lifetimes!, 1));
    
    this.geometry.setDrawRange(0, this.currentParticleCount);
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.customColor.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
  }
  
  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    const count = this.currentParticleCount;
    const rotationSpeed = this.parameters.rotationSpeed;
    const noiseStrength = this.parameters.noiseStrength;
    const pulseSpeed = this.parameters.pulseSpeed || 0.5;
    const pulseIntensity = this.parameters.pulseIntensity || 0.2;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      let x = this.positions![i3];
      let y = this.positions![i3 + 1];
      let z = this.positions![i3 + 2];
      
      const angle = rotationSpeed * deltaTime * 0.1;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      const newX = x * cosA - z * sinA;
      const newZ = x * sinA + z * cosA;
      
      x = newX;
      z = newZ;
      
      if (noiseStrength > 0) {
        const noiseX = Math.sin(this.time * 2 + i * 0.1) * noiseStrength * 0.3;
        const noiseY = Math.cos(this.time * 1.5 + i * 0.15) * noiseStrength * 0.2;
        const noiseZ = Math.sin(this.time * 2.5 + i * 0.2) * noiseStrength * 0.3;
        
        x += noiseX * deltaTime;
        y += noiseY * deltaTime;
        z += noiseZ * deltaTime;
      }
      
      const pulse = Math.sin(this.time * pulseSpeed + i * 0.01) * pulseIntensity;
      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      const pulseFactor = 1 + pulse * 0.1;
      
      if (distFromCenter > 0) {
        x = (x / distFromCenter) * distFromCenter * pulseFactor;
        y = (y / distFromCenter) * distFromCenter * pulseFactor;
        z = (z / distFromCenter) * distFromCenter * pulseFactor;
      }
      
      this.lifetimes![i] += deltaTime * 0.1;
      if (this.lifetimes![i] > 1) {
        this.lifetimes![i] = 0;
      }
      
      const life = this.lifetimes![i];
      const sizeFactor = life < 0.3 ? (life / 0.3) : (1 - (life - 0.3) / 0.7);
      const alphaFactor = life < 0.2 ? (life / 0.2) : (1 - (life - 0.2) / 0.8);
      
      this.sizes![i] = (Math.sin(i * 0.5) * 0.5 + 1.5) * Math.max(0.1, sizeFactor);
      this.alphas![i] = Math.max(0, Math.min(1, alphaFactor * (0.5 + Math.sin(i + this.time) * 0.2)));
      
      this.positions![i3] = x;
      this.positions![i3 + 1] = y;
      this.positions![i3 + 2] = z;
    }
    
    if (this.geometry) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.size.needsUpdate = true;
      this.geometry.attributes.alpha.needsUpdate = true;
    }
  }
  
  public updateParameters(newParams: Partial<ParticleParameters>): void {
    if (newParams.particleCount !== undefined) {
      this.animateParticleCount(newParams.particleCount);
    }
    
    if (newParams.colorOffset !== undefined) {
      this.animateColorOffset(newParams.colorOffset);
    }
    
    this.parameters = { ...this.parameters, ...newParams };
    
    if (newParams.noiseStrength !== undefined || 
        newParams.spreadRadius !== undefined ||
        newParams.rotationSpeed !== undefined) {
      this.regenerateBasePositions();
    }
  }
  
  private animateParticleCount(targetCount: number): void {
    const startCount = this.currentParticleCount;
    const diff = targetCount - startCount;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutQuad(progress);
      
      const currentCount = Math.floor(startCount + diff * eased);
      
      if (diff > 0) {
        for (let i = startCount; i < currentCount; i++) {
          this.activateParticle(i);
        }
      } else {
        for (let i = currentCount; i < startCount; i++) {
          this.deactivateParticle(i);
        }
      }
      
      this.currentParticleCount = currentCount;
      if (this.geometry) {
        this.geometry.setDrawRange(0, currentCount);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  private activateParticle(index: number): void {
    const i3 = index * 3;
    
    const angle = Math.random() * Math.PI * 2;
    const r = 0.1 + Math.random() * 0.5;
    this.positions![i3] = Math.cos(angle) * r;
    this.positions![i3 + 1] = (Math.random() - 0.5) * r;
    this.positions![i3 + 2] = Math.sin(angle) * r;
    
    const hue = this.getParticleHue(index, this.parameters.particleCount);
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
    this.colors![i3] = color.r;
    this.colors![i3 + 1] = color.g;
    this.colors![i3 + 2] = color.b;
    
    this.sizes![index] = 3;
    this.alphas![index] = 0;
    this.lifetimes![index] = 0;
    
    setTimeout(() => {
      this.alphas![index] = 0.8;
    }, 50);
  }
  
  private deactivateParticle(index: number): void {
    this.alphas![index] = 0;
    this.sizes![index] = 0;
  }
  
  private animateColorOffset(targetOffset: number): void {
    const startHue = this.baseHue;
    const endHue = targetOffset / 360;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutQuad(progress);
      
      let hueDiff = endHue - startHue;
      if (hueDiff > 0.5) hueDiff -= 1;
      if (hueDiff < -0.5) hueDiff += 1;
      
      const currentHue = (startHue + hueDiff * eased + 1) % 1;
      this.baseHue = currentHue;
      
      this.updateParticleColors(currentHue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  private updateParticleColors(hue: number): void {
    const count = this.currentParticleCount;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const variation = (i / count) * 0.3 - 0.15;
      const particleHue = (hue + variation + 1) % 1;
      
      const flicker = 0.9 + Math.sin(this.time * 3 + i * 0.1) * 0.1;
      const color = new THREE.Color().setHSL(particleHue, 0.8, 0.5 + flicker * 0.1);
      
      this.colors![i3] = color.r;
      this.colors![i3 + 1] = color.g;
      this.colors![i3 + 2] = color.b;
    }
    
    if (this.geometry) {
      this.geometry.attributes.customColor.needsUpdate = true;
    }
  }
  
  private regenerateBasePositions(): void {
    const count = Math.min(this.currentParticleCount, this.parameters.particleCount);
    const type = this.parameters.type || 'spiral';
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      let x: number, y: number, z: number;
      
      switch (type) {
        case 'spiral':
          const spiralResult = this.generateSpiralParticle(i, count);
          x = spiralResult.x;
          y = spiralResult.y;
          z = spiralResult.z;
          break;
        case 'ring':
          const ringResult = this.generateRingParticle(i, count);
          x = ringResult.x;
          y = ringResult.y;
          z = ringResult.z;
          break;
        case 'diffuse':
        default:
          const diffuseResult = this.generateDiffuseParticle(i, count);
          x = diffuseResult.x;
          y = diffuseResult.y;
          z = diffuseResult.z;
          break;
      }
      
      this.initialPositions![i3] = x;
      this.initialPositions![i3 + 1] = y;
      this.initialPositions![i3 + 2] = z;
    }
  }
  
  public transitionToPreset(targetParams: ParticleParameters, duration: number = 1500): Promise<void> {
    return new Promise((resolve) => {
      this.isTransitioning = true;
      
      const startParams = { ...this.parameters };
      const startTime = performance.now();
      
      const startPositions = new Float32Array(this.positions!);
      const startColors = new Float32Array(this.colors!);
      
      const tempSystem = new ParticleSystem(this.scene, { ...targetParams, particleCount: this.currentParticleCount });
      const endPositions = new Float32Array(tempSystem.positions!);
      const endColors = new Float32Array(tempSystem.colors!);
      tempSystem.dispose();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutQuad(progress);
        
        const count = this.currentParticleCount;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          
          this.positions![i3] = startPositions[i3] + (endPositions[i3] - startPositions[i3]) * eased;
          this.positions![i3 + 1] = startPositions[i3 + 1] + (endPositions[i3 + 1] - startPositions[i3 + 1]) * eased;
          this.positions![i3 + 2] = startPositions[i3 + 2] + (endPositions[i3 + 2] - startPositions[i3 + 2]) * eased;
          
          this.colors![i3] = startColors[i3] + (endColors[i3] - startColors[i3]) * eased;
          this.colors![i3 + 1] = startColors[i3 + 1] + (endColors[i3 + 1] - startColors[i3 + 1]) * eased;
          this.colors![i3 + 2] = startColors[i3 + 2] + (endColors[i3 + 2] - startColors[i3 + 2]) * eased;
        }
        
        this.parameters.rotationSpeed = startParams.rotationSpeed + (targetParams.rotationSpeed - startParams.rotationSpeed) * eased;
        this.parameters.noiseStrength = startParams.noiseStrength + (targetParams.noiseStrength - startParams.noiseStrength) * eased;
        this.parameters.spreadRadius = startParams.spreadRadius + (targetParams.spreadRadius - startParams.spreadRadius) * eased;
        
        if (this.geometry) {
          this.geometry.attributes.position.needsUpdate = true;
          this.geometry.attributes.customColor.needsUpdate = true;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.parameters = { ...targetParams };
          this.baseHue = targetParams.colorOffset / 360;
          this.isTransitioning = false;
          this.regenerateBasePositions();
          resolve();
        }
      };
      
      animate();
    });
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  public getIsTransitioning(): boolean {
    return this.isTransitioning;
  }
  
  public getParameters(): ParticleParameters {
    return { ...this.parameters };
  }
  
  public dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
  }
}
