import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FrequencyData } from './audioEngine';

export type ColorMode = 'frequency' | 'rainbow';

export interface WaveRendererOptions {
  container: HTMLElement;
  maxHistorySize?: number;
}

export interface HitResult {
  time: number;
  low: number;
  mid: number;
  high: number;
}

type WaveClickCallback = (result: HitResult) => void;

interface HistoryPoint extends FrequencyData {
  z: number;
}

const vertexShader = `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vIntensity;
  
  void main() {
    vColor = color;
    vNormal = normal;
    vPosition = position;
    vIntensity = position.y;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vIntensity;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vPosition);
    
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
    
    vec3 emissive = vColor * (0.8 + fresnel * 0.8);
    vec3 diffuse = vColor * 0.3;
    
    float glow = smoothstep(0.0, 1.0, vIntensity * 0.02);
    vec3 finalColor = emissive + diffuse + vColor * glow * 0.5;
    
    float alpha = 0.85 + fresnel * 0.15;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

class WaveBandGeometry extends THREE.BufferGeometry {
  private numPoints: number;
  private radialSegments: number;
  private positions: Float32Array;
  private normals: Float32Array;
  private colors: Float32Array;
  private indices: Uint32Array;

  constructor(numPoints: number, radialSegments: number = 16) {
    super();
    
    this.numPoints = numPoints;
    this.radialSegments = radialSegments;
    
    const vertexCount = numPoints * (radialSegments + 1) * 2;
    const indexCount = (numPoints - 1) * radialSegments * 6;
    
    this.positions = new Float32Array(vertexCount * 3);
    this.normals = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);
    this.indices = new Uint32Array(indexCount);
    
    this.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.setIndex(new THREE.BufferAttribute(this.indices, 1));
    
    this.generateIndices();
  }

  private generateIndices(): void {
    let index = 0;
    
    for (let i = 0; i < this.numPoints - 1; i++) {
      for (let j = 0; j < this.radialSegments; j++) {
        const a = i * (this.radialSegments + 1) * 2 + j;
        const b = a + 1;
        const c = a + (this.radialSegments + 1) * 2;
        const d = c + 1;
        
        this.indices[index++] = a;
        this.indices[index++] = c;
        this.indices[index++] = b;
        
        this.indices[index++] = b;
        this.indices[index++] = c;
        this.indices[index++] = d;
      }
    }
    
    this.index!.needsUpdate = true;
  }

  updateGeometry(
    history: HistoryPoint[],
    colorMode: ColorMode,
    totalDuration: number
  ): void {
    const color = new THREE.Color();
    const positionAttr = this.attributes.position as THREE.BufferAttribute;
    const normalAttr = this.attributes.normal as THREE.BufferAttribute;
    const colorAttr = this.attributes.color as THREE.BufferAttribute;
    
    const dataLength = history.length;
    
    for (let i = 0; i < this.numPoints; i++) {
      const dataIndex = Math.min(i, dataLength - 1);
      const data = history[dataIndex] || { timestamp: 0, low: 0, mid: 0, high: 0, z: -i * 0.15 };
      
      const height = (data.low / 255) * 4 + 0.3;
      const width = (data.mid / 255) * 1.5 + 0.3;
      const z = data.z;
      
      let r: number, g: number, bl: number;
      
      if (colorMode === 'rainbow') {
        const t = totalDuration > 0 ? data.timestamp / totalDuration : 0;
        color.setHSL(t * 0.8 + 0.6, 0.9, 0.6);
        r = color.r;
        g = color.g;
        bl = color.b;
      } else {
        const highNorm = data.high / 255;
        r = 0.1 + highNorm * 0.9;
        g = 0.2 + (1 - Math.abs(highNorm - 0.5) * 2) * 0.6;
        bl = 0.9 - highNorm * 0.8;
      }
      
      for (let j = 0; j <= this.radialSegments; j++) {
        const angle = (j / this.radialSegments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const x = cos * width;
        const y = sin * height;
        
        const idx = i * (this.radialSegments + 1) * 2 + j;
        
        positionAttr.setXYZ(idx, x, y + height * 0.5, z);
        normalAttr.setXYZ(idx, cos * 0.8, sin * 0.8, 0.1);
        colorAttr.setXYZ(idx, r, g, bl);
        
        const idx2 = idx + this.radialSegments + 1;
        positionAttr.setXYZ(idx2, x * 0.3, -y * 0.2 + height * 0.3, z);
        normalAttr.setXYZ(idx2, cos * 0.5, sin * 0.5, -0.3);
        colorAttr.setXYZ(idx2, r * 0.7, g * 0.7, bl * 0.7);
      }
    }
    
    positionAttr.needsUpdate = true;
    normalAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    
    this.computeVertexNormals();
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }

  getPointAtZ(z: number): HistoryPoint | null {
    const index = Math.round(-z / 0.15);
    return null;
  }
}

export class WaveRenderer {
  private container: HTMLElement;
  private maxHistorySize: number;
  
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private waveMesh: THREE.Mesh | null = null;
  private waveGeometry: WaveBandGeometry | null = null;
  private waveMaterial: THREE.ShaderMaterial | null = null;
  
  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;
  private glowMesh: THREE.Mesh | null = null;
  
  private history: HistoryPoint[] = [];
  private currentZ: number = 0;
  private colorMode: ColorMode = 'frequency';
  private totalDuration: number = 0;
  
  private clickCallbacks: WaveClickCallback[] = [];
  private isDragging: boolean = false;
  private lastMouseDown: number = 0;
  
  private animationTime: number = 0;

  constructor(options: WaveRendererOptions) {
    this.container = options.container;
    this.maxHistorySize = options.maxHistorySize || 500;
    
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.02);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 12);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
    this.controls.target.set(0, 1, 0);
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this.ambientLight);
    
    this.pointLight = new THREE.PointLight(0x00d4ff, 2, 30);
    this.pointLight.position.set(0, 5, 5);
    this.scene.add(this.pointLight);
    
    const pointLight2 = new THREE.PointLight(0xff0080, 1.5, 25);
    pointLight2.position.set(-5, 3, -5);
    this.scene.add(pointLight2);
    
    this.createWaveform();
    this.createStarfield();
    this.setupEventListeners();
  }

  private createWaveform(): void {
    this.waveGeometry = new WaveBandGeometry(this.maxHistorySize, 20);
    
    this.waveMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.waveMesh = new THREE.Mesh(this.waveGeometry, this.waveMaterial);
    this.waveMesh.position.z = 5;
    this.scene.add(this.waveMesh);
    
    const glowGeometry = new THREE.TorusGeometry(2, 0.02, 16, 100);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.6
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.rotation.x = Math.PI / 2;
    this.glowMesh.position.z = 5;
    this.scene.add(this.glowMesh);
  }

  private createStarfield(): void {
    const geometry = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const radius = 80 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      const color = new THREE.Color();
      color.setHSL(0.6 + Math.random() * 0.2, 0.5, 0.7 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this), { passive: true });
    
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', () => {
      this.isDragging = false;
      this.lastMouseDown = performance.now();
    }, { passive: true });
    
    canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) {
        this.isDragging = true;
      }
    }, { passive: true });
    
    canvas.addEventListener('mouseup', (e) => {
      const delta = performance.now() - this.lastMouseDown;
      if (!this.isDragging && delta < 200) {
        this.onClick(e);
      }
    });
    
    canvas.addEventListener('touchstart', () => {
      this.isDragging = false;
      this.lastMouseDown = performance.now();
    }, { passive: true });
    
    canvas.addEventListener('touchmove', () => {
      this.isDragging = true;
    }, { passive: true });
    
    canvas.addEventListener('touchend', (e) => {
      const delta = performance.now() - this.lastMouseDown;
      if (!this.isDragging && delta < 200) {
        const touch = e.changedTouches[0];
        this.onClick({ 
          clientX: touch.clientX, 
          clientY: touch.clientY 
        } as MouseEvent);
      }
    });
  }

  private onClick(event: MouseEvent): void {
    if (!this.waveMesh || this.history.length === 0) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(this.waveMesh);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const localZ = point.z - (this.waveMesh.position.z || 0);
      const index = Math.round(-localZ / 0.15);
      
      if (index >= 0 && index < this.history.length) {
        const data = this.history[index];
        this.notifyClick({
          time: data.timestamp,
          low: data.low,
          mid: data.mid,
          high: data.high
        });
      }
    }
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  addFrequencyData(data: FrequencyData): void {
    const point: HistoryPoint = {
      ...data,
      z: this.currentZ
    };
    
    this.history.unshift(point);
    
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
    
    this.currentZ -= 0.15;
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    if (this.waveGeometry && this.waveMesh) {
      this.waveGeometry.updateGeometry(this.history, this.colorMode, this.totalDuration);
      
      const targetZ = Math.max(5, -this.currentZ * 0.3 + 5);
      this.waveMesh.position.z += (targetZ - this.waveMesh.position.z) * 0.05;
    }
    
    if (this.glowMesh) {
      const latestData = this.history[0];
      if (latestData) {
        const scale = 1 + (latestData.low / 255) * 0.5;
        this.glowMesh.scale.set(scale, scale, 1);
        
        const color = new THREE.Color();
        if (this.colorMode === 'rainbow') {
          const t = this.totalDuration > 0 ? latestData.timestamp / this.totalDuration : 0;
          color.setHSL(t * 0.8 + 0.6, 0.9, 0.6);
        } else {
          const highNorm = latestData.high / 255;
          color.setRGB(
            0.1 + highNorm * 0.9,
            0.2 + (1 - Math.abs(highNorm - 0.5) * 2) * 0.6,
            0.9 - highNorm * 0.8
          );
        }
        (this.glowMesh.material as THREE.MeshBasicMaterial).color = color;
      }
      this.glowMesh.rotation.z += deltaTime * 0.5;
    }
    
    this.pointLight.position.x = Math.sin(this.animationTime * 0.5) * 3;
    this.pointLight.position.z = Math.cos(this.animationTime * 0.3) * 3 + 5;
    
    this.controls.update();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
  }

  setTotalDuration(duration: number): void {
    this.totalDuration = duration;
  }

  onWaveClick(callback: WaveClickCallback): void {
    this.clickCallbacks.push(callback);
  }

  clearHistory(): void {
    this.history = [];
    this.currentZ = 0;
  }

  resize(): void {
    this.onResize();
  }

  private notifyClick(result: HitResult): void {
    this.clickCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (e) {
        console.error('Wave click callback error:', e);
      }
    });
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    
    if (this.waveGeometry) {
      this.waveGeometry.dispose();
    }
    if (this.waveMaterial) {
      this.waveMaterial.dispose();
    }
    if (this.waveMesh) {
      this.scene.remove(this.waveMesh);
    }
    if (this.glowMesh) {
      this.scene.remove(this.glowMesh);
      if (this.glowMesh.geometry) {
        this.glowMesh.geometry.dispose();
      }
      if (this.glowMesh.material) {
        (this.glowMesh.material as THREE.Material).dispose();
      }
    }
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    
    this.clickCallbacks = [];
  }
}
