import * as THREE from 'three';
import type { InstrumentType } from './AudioEngine';

export interface Instrument3DObject {
  id: string;
  type: InstrumentType;
  group: THREE.Group;
  sphere: THREE.Mesh;
  icon: THREE.Sprite;
  trail: THREE.Points;
  trailPositions: Float32Array;
  isDragging: boolean;
  isMoving: boolean;
  targetPosition: THREE.Vector3;
  moveStartTime: number;
  moveStartPosition: THREE.Vector3;
  moveControlPoint1: THREE.Vector3;
  moveControlPoint2: THREE.Vector3;
  moveDuration: number;
  onMoveComplete?: () => void;
}

export interface PresetLayout {
  name: string;
  description: string;
  positions: Record<string, THREE.Vector3>;
}

const STAGE_RADIUS = 8;
const HEATMAP_PARTICLE_COUNT = 500;
const TRAIL_LENGTH = 20;

const INSTRUMENT_ICONS: Record<InstrumentType, string> = {
  violin: '🎻',
  cello: '🎵',
  flute: '🎶',
  trumpet: '🎺',
  piano: '🎹',
  timpani: '🥁'
};

export class Scene3D {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  
  private stage: THREE.Mesh | null = null;
  private listenerPoint: THREE.Mesh | null = null;
  private listenerLight: THREE.PointLight | null = null;
  private listenerGlow: THREE.Mesh | null = null;
  
  private instruments: Map<string, Instrument3DObject> = new Map();
  private heatmapParticles: THREE.Points | null = null;
  private heatmapColors: Float32Array | null = null;
  private heatmapPositions: Float32Array | null = null;
  private heatmapAlphas: Float32Array | null = null;
  private heatmapTargetAlphas: Float32Array | null = null;
  
  private stagePlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  private isInitialized: boolean = false;
  private clock: THREE.Clock = new THREE.Clock();
  
  private listenerTargetPosition: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0);
  private listenerIsMoving: boolean = false;
  private listenerMoveStartTime: number = 0;
  private listenerMoveStartPosition: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0);
  
  init(container: HTMLElement): void {
    if (this.isInitialized) return;
    
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = this.createSunsetGradient();
    
    const aspect = (window.innerWidth - 280) / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 12, 15);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth - 280, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);
    
    this.createLights();
    this.createStage();
    this.createListenerPoint();
    this.createHeatmap();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.isInitialized = true;
  }
  
  private createSunsetGradient(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(256, 400, 0, 256, 256, 512);
    gradient.addColorStop(0, '#ff7e5f');
    gradient.addColorStop(0.3, '#feb47b');
    gradient.addColorStop(0.6, '#8e2de2');
    gradient.addColorStop(1, '#1a1a2e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  
  private createLights(): void {
    if (!this.scene) return;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    this.listenerLight = new THREE.PointLight(0xffd700, 1, 20);
    this.listenerLight.position.set(0, 0.5, 0);
    this.scene.add(this.listenerLight);
  }
  
  private createStage(): void {
    if (!this.scene) return;
    
    const stageGeometry = new THREE.CylinderGeometry(STAGE_RADIUS, STAGE_RADIUS, 0.2, 64);
    const stageMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    
    this.stage = new THREE.Mesh(stageGeometry, stageMaterial);
    this.stage.position.y = 0;
    this.stage.receiveShadow = true;
    this.scene.add(this.stage);
    
    const edgeGeometry = new THREE.TorusGeometry(STAGE_RADIUS, 0.05, 8, 64);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.11;
    this.scene.add(edge);
    
    const gridHelper = new THREE.GridHelper(STAGE_RADIUS * 2, 16, 0xffffff, 0xffffff);
    gridHelper.position.y = 0.101;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.1;
    this.scene.add(gridHelper);
  }
  
  private createListenerPoint(): void {
    if (!this.scene) return;
    
    const listenerGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const listenerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    
    this.listenerPoint = new THREE.Mesh(listenerGeometry, listenerMaterial);
    this.listenerPoint.position.set(0, 0.5, 0);
    this.listenerPoint.castShadow = true;
    this.scene.add(this.listenerPoint);
    
    const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    
    this.listenerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.listenerGlow.position.copy(this.listenerPoint.position);
    this.scene.add(this.listenerGlow);
  }
  
  private createHeatmap(): void {
    if (!this.scene) return;
    
    const geometry = new THREE.BufferGeometry();
    this.heatmapPositions = new Float32Array(HEATMAP_PARTICLE_COUNT * 3);
    this.heatmapColors = new Float32Array(HEATMAP_PARTICLE_COUNT * 3);
    this.heatmapAlphas = new Float32Array(HEATMAP_PARTICLE_COUNT);
    this.heatmapTargetAlphas = new Float32Array(HEATMAP_PARTICLE_COUNT);
    
    for (let i = 0; i < HEATMAP_PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * STAGE_RADIUS * 0.95;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 1 + Math.random() * 1;
      
      this.heatmapPositions[i * 3] = x;
      this.heatmapPositions[i * 3 + 1] = y;
      this.heatmapPositions[i * 3 + 2] = z;
      
      this.heatmapColors[i * 3] = 0;
      this.heatmapColors[i * 3 + 1] = 0;
      this.heatmapColors[i * 3 + 2] = 1;
      
      this.heatmapAlphas[i] = 0;
      this.heatmapTargetAlphas[i] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.heatmapPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.heatmapColors, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const particleTexture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture
    });
    
    this.heatmapParticles = new THREE.Points(geometry, material);
    this.scene.add(this.heatmapParticles);
  }
  
  addInstrument(id: string, type: InstrumentType, position: THREE.Vector3, color: number): void {
    if (!this.scene) return;
    
    const group = new THREE.Group();
    
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.5
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    group.add(sphere);
    
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 128;
    iconCanvas.height = 128;
    const iconCtx = iconCanvas.getContext('2d')!;
    iconCtx.font = 'bold 80px Arial';
    iconCtx.textAlign = 'center';
    iconCtx.textBaseline = 'middle';
    iconCtx.fillText(INSTRUMENT_ICONS[type], 64, 64);
    
    const iconTexture = new THREE.CanvasTexture(iconCanvas);
    const iconMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      transparent: true
    });
    const icon = new THREE.Sprite(iconMaterial);
    icon.scale.set(1.2, 1.2, 1);
    icon.position.y = 1;
    group.add(icon);
    
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trailPositions[i * 3] = position.x;
      trailPositions[i * 3 + 1] = position.y + 0.5;
      trailPositions[i * 3 + 2] = position.z;
    }
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    
    const trailColors = new Float32Array(TRAIL_LENGTH * 3);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const alpha = 1 - i / TRAIL_LENGTH;
      trailColors[i * 3] = 1 * alpha;
      trailColors[i * 3 + 1] = 1 * alpha;
      trailColors[i * 3 + 2] = 0;
    }
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    
    const trailSizes = new Float32Array(TRAIL_LENGTH);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trailSizes[i] = (1 - i / TRAIL_LENGTH) * 0.1;
    }
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
    
    const trailMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    this.scene.add(trail);
    
    group.position.copy(position);
    group.userData = { id, type };
    this.scene.add(group);
    
    const instrumentObj: Instrument3DObject = {
      id,
      type,
      group,
      sphere,
      icon,
      trail,
      trailPositions,
      isDragging: false,
      isMoving: false,
      targetPosition: position.clone(),
      moveStartTime: 0,
      moveStartPosition: position.clone(),
      moveControlPoint1: new THREE.Vector3(),
      moveControlPoint2: new THREE.Vector3(),
      moveDuration: 500
    };
    
    this.instruments.set(id, instrumentObj);
  }
  
  moveInstrument(id: string, position: THREE.Vector3, animate: boolean = false, delay: number = 0, onComplete?: () => void): void {
    const instrument = this.instruments.get(id);
    if (!instrument) return;
    
    const clampedPosition = this.clampToStage(position);
    
    if (animate) {
      instrument.isMoving = true;
      instrument.moveStartPosition.copy(instrument.group.position);
      instrument.targetPosition.copy(clampedPosition);
      instrument.moveStartTime = performance.now() + delay;
      instrument.onMoveComplete = onComplete;
      
      const midPoint = new THREE.Vector3().lerpVectors(
        instrument.moveStartPosition,
        instrument.targetPosition,
        0.5
      );
      midPoint.y += 2;
      
      instrument.moveControlPoint1.copy(instrument.moveStartPosition).lerp(midPoint, 0.5);
      instrument.moveControlPoint2.copy(instrument.targetPosition).lerp(midPoint, 0.5);
    } else {
      instrument.group.position.copy(clampedPosition);
      instrument.targetPosition.copy(clampedPosition);
      if (onComplete) onComplete();
    }
  }
  
  private clampToStage(position: THREE.Vector3): THREE.Vector3 {
    const result = position.clone();
    const distance = Math.sqrt(result.x * result.x + result.z * result.z);
    
    if (distance > STAGE_RADIUS - 0.5) {
      const scale = (STAGE_RADIUS - 0.5) / distance;
      result.x *= scale;
      result.z *= scale;
    }
    
    result.y = 0.5;
    return result;
  }
  
  moveListener(position: THREE.Vector3): void {
    const clampedPosition = this.clampToStage(position);
    this.listenerTargetPosition.copy(clampedPosition);
    this.listenerIsMoving = true;
    this.listenerMoveStartTime = performance.now();
    this.listenerMoveStartPosition.copy(this.listenerPoint?.position || new THREE.Vector3(0, 0.5, 0));
  }
  
  updateHeatmap(getVolumeAtPoint: (point: THREE.Vector3) => number): void {
    if (!this.heatmapColors || !this.heatmapPositions || !this.heatmapAlphas || !this.heatmapTargetAlphas) return;
    
    const tempPoint = new THREE.Vector3();
    
    for (let i = 0; i < HEATMAP_PARTICLE_COUNT; i++) {
      tempPoint.set(
        this.heatmapPositions[i * 3],
        0.5,
        this.heatmapPositions[i * 3 + 2]
      );
      
      const volumeDb = getVolumeAtPoint(tempPoint);
      const normalizedVolume = Math.max(0, Math.min(1, (volumeDb + 40) / 40));
      
      const color = this.getHeatmapColor(normalizedVolume);
      this.heatmapColors[i * 3] = color.r;
      this.heatmapColors[i * 3 + 1] = color.g;
      this.heatmapColors[i * 3 + 2] = color.b;
      
      this.heatmapTargetAlphas[i] = normalizedVolume > 0.05 ? normalizedVolume * 0.8 : 0;
      
      this.heatmapAlphas[i] += (this.heatmapTargetAlphas[i] - this.heatmapAlphas[i]) * 0.1;
    }
    
    if (this.heatmapParticles) {
      (this.heatmapParticles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (this.heatmapParticles.material as THREE.PointsMaterial).opacity = 1;
    }
  }
  
  private getHeatmapColor(t: number): { r: number; g: number; b: number } {
    const clampedT = Math.max(0, Math.min(1, t));
    
    if (clampedT < 0.5) {
      const localT = clampedT * 2;
      return {
        r: localT,
        g: localT,
        b: 1
      };
    } else {
      const localT = (clampedT - 0.5) * 2;
      return {
        r: 1,
        g: 1 - localT,
        b: 0
      };
    }
  }
  
  getStagePointFromScreen(screenX: number, screenY: number): THREE.Vector3 | null {
    if (!this.camera) return null;
    
    const ndcX = ((screenX) / (window.innerWidth - 280)) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    
    const point = new THREE.Vector3();
    const success = this.raycaster.ray.intersectPlane(this.stagePlane, point);
    
    if (success) {
      return this.clampToStage(point);
    }
    
    return null;
  }
  
  getInstrumentAtScreen(screenX: number, screenY: number): Instrument3DObject | null {
    if (!this.camera) return null;
    
    const ndcX = (screenX / (window.innerWidth - 280)) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    
    const spheres: THREE.Mesh[] = [];
    this.instruments.forEach(inst => spheres.push(inst.sphere));
    
    const intersects = this.raycaster.intersectObjects(spheres);
    
    if (intersects.length > 0) {
      const hitSphere = intersects[0].object as THREE.Mesh;
      for (const inst of this.instruments.values()) {
        if (inst.sphere === hitSphere) {
          return inst;
        }
      }
    }
    
    return null;
  }
  
  setInstrumentDragging(id: string, isDragging: boolean): void {
    const instrument = this.instruments.get(id);
    if (!instrument) return;
    
    instrument.isDragging = isDragging;
    (instrument.trail.material as THREE.PointsMaterial).opacity = isDragging ? 0.8 : 0;
  }
  
  updateTrail(id: string, position: THREE.Vector3): void {
    const instrument = this.instruments.get(id);
    if (!instrument) return;
    
    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      instrument.trailPositions[i * 3] = instrument.trailPositions[(i - 1) * 3];
      instrument.trailPositions[i * 3 + 1] = instrument.trailPositions[(i - 1) * 3 + 1];
      instrument.trailPositions[i * 3 + 2] = instrument.trailPositions[(i - 1) * 3 + 2];
    }
    
    instrument.trailPositions[0] = position.x;
    instrument.trailPositions[1] = position.y + 0.5;
    instrument.trailPositions[2] = position.z;
    
    (instrument.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
  
  clearHeatmap(): void {
    if (!this.heatmapColors || !this.heatmapAlphas || !this.heatmapTargetAlphas) return;
    
    for (let i = 0; i < HEATMAP_PARTICLE_COUNT; i++) {
      this.heatmapColors[i * 3] = 0;
      this.heatmapColors[i * 3 + 1] = 0;
      this.heatmapColors[i * 3 + 2] = 1;
      this.heatmapAlphas[i] = 0;
      this.heatmapTargetAlphas[i] = 0;
    }
    
    if (this.heatmapParticles) {
      (this.heatmapParticles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }
  
  render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();
    
    this.updateInstruments(delta);
    this.updateListener(delta);
    this.updateListenerAnimation(time);
    
    this.renderer.render(this.scene, this.camera);
  }
  
  private updateInstruments(_delta: number): void {
    for (const instrument of this.instruments.values()) {
      if (instrument.isMoving) {
        const now = performance.now();
        if (now < instrument.moveStartTime) continue;
        
        const elapsed = now - instrument.moveStartTime;
        const t = Math.min(elapsed / instrument.moveDuration, 1);
        const easedT = this.easeOutElastic(t);
        
        const pos = this.bezierInterpolate(
          instrument.moveStartPosition,
          instrument.moveControlPoint1,
          instrument.moveControlPoint2,
          instrument.targetPosition,
          easedT
        );
        
        instrument.group.position.copy(pos);
        
        if (t >= 1) {
          instrument.isMoving = false;
          instrument.group.position.copy(instrument.targetPosition);
          if (instrument.onMoveComplete) {
            instrument.onMoveComplete();
            instrument.onMoveComplete = undefined;
          }
        }
      }
      
      instrument.icon.material.rotation = -this.camera!.rotation.y;
      
      const scale = 1 + Math.sin(this.clock.getElapsedTime() * 3 + instrument.group.position.x) * 0.05;
      instrument.sphere.scale.setScalar(scale);
    }
  }
  
  private updateListener(_delta: number): void {
    if (!this.listenerPoint || !this.listenerGlow || !this.listenerLight) return;
    
    if (this.listenerIsMoving) {
      const elapsed = performance.now() - this.listenerMoveStartTime;
      const t = Math.min(elapsed / 500, 1);
      const easedT = this.easeInOutCubic(t);
      
      const pos = new THREE.Vector3().lerpVectors(
        this.listenerMoveStartPosition,
        this.listenerTargetPosition,
        easedT
      );
      
      this.listenerPoint.position.copy(pos);
      this.listenerGlow.position.copy(pos);
      this.listenerLight.position.copy(pos);
      
      if (t >= 1) {
        this.listenerIsMoving = false;
      }
    }
  }
  
  private updateListenerAnimation(time: number): void {
    if (!this.listenerPoint || !this.listenerGlow || !this.listenerLight) return;
    
    const pulse = 1 + Math.sin(time * 3) * 0.15;
    this.listenerPoint.scale.setScalar(pulse);
    this.listenerGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.3);
    
    const material = this.listenerPoint.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.6 + Math.sin(time * 3) * 0.3;
    
    this.listenerLight.intensity = 0.8 + Math.sin(time * 3) * 0.3;
  }
  
  private bezierInterpolate(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return new THREE.Vector3(
      mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
      mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
    );
  }
  
  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = (window.innerWidth - 280) / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth - 280, window.innerHeight);
  }
  
  getInstrumentPosition(id: string): THREE.Vector3 | null {
    const instrument = this.instruments.get(id);
    return instrument ? instrument.group.position.clone() : null;
  }
  
  getListenerPosition(): THREE.Vector3 {
    return this.listenerPoint ? this.listenerPoint.position.clone() : new THREE.Vector3(0, 0.5, 0);
  }
  
  isListenerMoving(): boolean {
    return this.listenerIsMoving;
  }
  
  getPresetLayouts(): PresetLayout[] {
    const layouts: PresetLayout[] = [
      {
        name: '圆形包围',
        description: '乐器围绕听者呈圆形排列',
        positions: {
          'violin': new THREE.Vector3(6, 0.5, 0),
          'cello': new THREE.Vector3(3, 0.5, 5.2),
          'flute': new THREE.Vector3(-3, 0.5, 5.2),
          'trumpet': new THREE.Vector3(-6, 0.5, 0),
          'piano': new THREE.Vector3(-3, 0.5, -5.2),
          'timpani': new THREE.Vector3(3, 0.5, -5.2)
        }
      },
      {
        name: '扇形展开',
        description: '经典交响乐团扇形布局',
        positions: {
          'violin': new THREE.Vector3(5, 0.5, 4),
          'cello': new THREE.Vector3(3, 0.5, 5),
          'flute': new THREE.Vector3(0, 0.5, 5.5),
          'trumpet': new THREE.Vector3(-3, 0.5, 5),
          'piano': new THREE.Vector3(-5, 0.5, 4),
          'timpani': new THREE.Vector3(0, 0.5, -3)
        }
      },
      {
        name: '一字排开',
        description: '乐器沿直线排列',
        positions: {
          'violin': new THREE.Vector3(6, 0.5, 2),
          'cello': new THREE.Vector3(3.6, 0.5, 2),
          'flute': new THREE.Vector3(1.2, 0.5, 2),
          'trumpet': new THREE.Vector3(-1.2, 0.5, 2),
          'piano': new THREE.Vector3(-3.6, 0.5, 2),
          'timpani': new THREE.Vector3(-6, 0.5, 2)
        }
      },
      {
        name: '左右声道',
        description: '乐器分置左右两侧',
        positions: {
          'violin': new THREE.Vector3(5, 0.5, 2),
          'cello': new THREE.Vector3(5, 0.5, -1),
          'flute': new THREE.Vector3(5, 0.5, -4),
          'trumpet': new THREE.Vector3(-5, 0.5, 2),
          'piano': new THREE.Vector3(-5, 0.5, -1),
          'timpani': new THREE.Vector3(-5, 0.5, -4)
        }
      },
      {
        name: '远近层次',
        description: '按音量大小前后排列',
        positions: {
          'violin': new THREE.Vector3(2, 0.5, 5),
          'flute': new THREE.Vector3(-2, 0.5, 5),
          'trumpet': new THREE.Vector3(4, 0.5, 2),
          'piano': new THREE.Vector3(-4, 0.5, 2),
          'cello': new THREE.Vector3(2, 0.5, -2),
          'timpani': new THREE.Vector3(-2, 0.5, -5)
        }
      }
    ];
    
    return layouts;
  }
  
  getRandomInstrumentPositions(): Record<string, THREE.Vector3> {
    const positions: Record<string, THREE.Vector3> = {};
    const types: InstrumentType[] = ['violin', 'cello', 'flute', 'trumpet', 'piano', 'timpani'];
    
    for (const type of types) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 5;
      positions[type] = new THREE.Vector3(
        Math.cos(angle) * radius,
        0.5,
        Math.sin(angle) * radius
      );
    }
    
    return positions;
  }
  
  getDomElement(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }
  
  destroy(): void {
    if (this.renderer && this.container) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
