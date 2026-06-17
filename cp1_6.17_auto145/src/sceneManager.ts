import * as THREE from 'three';
import type { SoundSourceType, SoundSourceInstance } from './types';
import { SOUND_SOURCE_META, TRAIL_LENGTH } from './presets';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: any;

  private listenerPosition: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
  private listenerMesh: THREE.Group | null = null;
  private listenerHalo: THREE.Mesh | null = null;
  private ground: THREE.GridHelper | null = null;
  private sources: Map<string, SoundSourceInstance> = new Map();
  private sphereGeometry: THREE.SphereGeometry;
  private sourceCounter = 0;

  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private minimapFrameCount = 0;

  private animationTime = 0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 15, 40);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    const minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d')!;

    this.setupLighting();
    this.createGround();
    this.createListener();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x4cc9f0, 0x1a1a2e, 0.4);
    this.scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  private createGround(): void {
    this.ground = new THREE.GridHelper(30, 30, 0x4cc9f0, 0x2a2a4e);
    this.ground.position.y = 0;
    (this.ground.material as THREE.Material).opacity = 0.3;
    (this.ground.material as THREE.Material).transparent = true;
    this.scene.add(this.ground);

    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshBasicMaterial({ 
        color: 0x16213e, 
        transparent: true, 
        opacity: 0.5,
        side: THREE.DoubleSide
      })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.01;
    this.scene.add(groundPlane);
  }

  private createListener(): void {
    this.listenerMesh = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xa8dadc,
      transparent: true,
      opacity: 0.4,
      emissive: 0x4cc9f0,
      emissiveIntensity: 0.2
    });

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      bodyMaterial
    );
    head.position.y = 1.6;
    this.listenerMesh.add(head);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.8, 8, 16),
      bodyMaterial
    );
    body.position.y = 0.9;
    this.listenerMesh.add(body);

    const haloGeometry = new THREE.RingGeometry(2, 2.2, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.listenerHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.listenerHalo.rotation.x = -Math.PI / 2;
    this.listenerHalo.position.y = 0.05;
    this.listenerMesh.add(this.listenerHalo);

    this.listenerMesh.position.copy(this.listenerPosition);
    this.scene.add(this.listenerMesh);
  }

  public createSoundSource(type: SoundSourceType, position: THREE.Vector3): SoundSourceInstance {
    const meta = SOUND_SOURCE_META[type];
    const id = `source_${++this.sourceCounter}`;

    const group = new THREE.Group();
    group.position.copy(position);

    const material = new THREE.MeshStandardMaterial({
      color: meta.color,
      emissive: meta.color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7
    });

    const sphere = new THREE.Mesh(this.sphereGeometry, material);
    sphere.castShadow = true;
    sphere.userData.sourceId = id;
    group.add(sphere);

    const light = new THREE.PointLight(meta.color, 1, 5);
    light.position.set(0, 0, 0);
    group.add(light);

    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      1,
      meta.color,
      0.3,
      0.15
    );
    group.add(arrow);

    const trail = this.createTrail(meta.color);
    group.add(trail);

    const source: SoundSourceInstance = {
      id,
      type,
      group,
      sphere,
      light,
      arrow,
      selectionRing: null,
      trail,
      trailPositions: [position.clone()],
      isSelected: false,
      isHovered: false,
      audioNodes: null
    };

    this.sources.set(id, source);
    this.scene.add(group);

    return source;
  }

  private createTrail(color: string): THREE.Line {
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 3);
    const alpha = new Float32Array(TRAIL_LENGTH);

    const colorObj = new THREE.Color(color);
    
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
      
      alpha[i] = 1 - i / TRAIL_LENGTH;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    return line;
  }

  public updateSourcePosition(source: SoundSourceInstance, position: THREE.Vector3): void {
    source.group.position.copy(position);

    source.trailPositions.unshift(position.clone());
    if (source.trailPositions.length > TRAIL_LENGTH) {
      source.trailPositions.pop();
    }

    const positions = source.trail.geometry.attributes.position.array as Float32Array;
    const sourcePos = source.group.position;
    
    for (let i = 0; i < source.trailPositions.length; i++) {
      const pos = source.trailPositions[i];
      positions[i * 3] = pos.x - sourcePos.x;
      positions[i * 3 + 1] = pos.y - sourcePos.y;
      positions[i * 3 + 2] = pos.z - sourcePos.z;
    }
    
    for (let i = source.trailPositions.length; i < TRAIL_LENGTH; i++) {
      const lastPos = source.trailPositions[source.trailPositions.length - 1] || sourcePos;
      positions[i * 3] = lastPos.x - sourcePos.x;
      positions[i * 3 + 1] = lastPos.y - sourcePos.y;
      positions[i * 3 + 2] = lastPos.z - sourcePos.z;
    }
    
    source.trail.geometry.attributes.position.needsUpdate = true;
  }

  public selectSource(source: SoundSourceInstance | null): void {
    this.sources.forEach(s => {
      s.isSelected = false;
      if (s.selectionRing) {
        s.group.remove(s.selectionRing);
        s.selectionRing.geometry.dispose();
        (s.selectionRing.material as THREE.Material).dispose();
        s.selectionRing = null;
      }
    });

    if (source) {
      source.isSelected = true;
      
      const ringGeometry = new THREE.TorusGeometry(1.2, 0.02, 8, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.8
      });
      source.selectionRing = new THREE.LineSegments(
        new THREE.EdgesGeometry(ringGeometry),
        ringMaterial
      );
      source.selectionRing.rotation.x = Math.PI / 2;
      source.group.add(source.selectionRing);
      
      ringGeometry.dispose();
    }
  }

  public setSourceHovered(source: SoundSourceInstance | null, hovered: boolean): void {
    this.sources.forEach(s => {
      if (s !== source && s.isHovered && !s.isSelected) {
        s.sphere.scale.set(1, 1, 1);
        s.isHovered = false;
      }
    });

    if (source) {
      source.isHovered = hovered;
      if (hovered && !source.isSelected) {
        source.sphere.scale.set(1.1, 1.1, 1.1);
      } else if (!hovered && !source.isSelected) {
        source.sphere.scale.set(1, 1, 1);
      }
    }
  }

  public removeSource(source: SoundSourceInstance): void {
    this.scene.remove(source.group);
    this.sources.delete(source.id);
    
    (source.sphere.material as THREE.Material).dispose();
    if (source.selectionRing) {
      source.selectionRing.geometry.dispose();
      (source.selectionRing.material as THREE.Material).dispose();
    }
    if (source.trail) {
      source.trail.geometry.dispose();
      (source.trail.material as THREE.Material).dispose();
    }
  }

  public getSourceById(id: string): SoundSourceInstance | undefined {
    return this.sources.get(id);
  }

  public getSources(): SoundSourceInstance[] {
    return Array.from(this.sources.values());
  }

  public getSourceCount(): number {
    return this.sources.size;
  }

  public getListenerPosition(): THREE.Vector3 {
    return this.listenerPosition.clone();
  }

  public getRaycastableObjects(): THREE.Object3D[] {
    return Array.from(this.sources.values()).map(s => s.sphere);
  }

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;

    this.sources.forEach(source => {
      const meta = SOUND_SOURCE_META[source.type];
      const pulsePhase = this.animationTime * meta.pulseFrequency;
      const pulseIntensity = 0.5 + Math.sin(pulsePhase) * 0.3;
      
      const material = source.sphere.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = pulseIntensity;
      source.light.intensity = 0.5 + pulseIntensity * 0.5;

      if (source.selectionRing) {
        source.selectionRing.rotation.z += deltaTime * 2;
      }

      if (source.trailPositions.length > 1) {
        const lastPos = source.trailPositions[0];
        const prevPos = source.trailPositions[1];
        const direction = new THREE.Vector3().subVectors(lastPos, prevPos).normalize();
        if (direction.length() > 0.1) {
          source.arrow.setDirection(direction);
        }
      }
    });

    if (this.listenerHalo) {
      const haloPulse = 0.2 + Math.sin(this.animationTime * 1.5) * 0.1;
      (this.listenerHalo.material as THREE.MeshBasicMaterial).opacity = haloPulse;
    }

    this.minimapFrameCount++;
    if (this.minimapFrameCount % 2 === 0) {
      this.updateMinimap();
    }
  }

  private updateMinimap(): void {
    const ctx = this.minimapCtx;
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;
    const scale = width / 30;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(76, 201, 240, 0.2)';
    ctx.lineWidth = 1;
    for (let i = -15; i <= 15; i += 5) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * scale, 0);
      ctx.lineTo(centerX + i * scale, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, centerY + i * scale);
      ctx.lineTo(width, centerY + i * scale);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4cc9f0';
    ctx.fill();
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.stroke();

    this.sources.forEach(source => {
      const meta = SOUND_SOURCE_META[source.type];
      const x = centerX + source.group.position.x * scale;
      const y = centerY - source.group.position.z * scale;

      ctx.beginPath();
      ctx.arc(x, y, source.isSelected ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = meta.color;
      ctx.fill();

      if (source.isSelected) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public getRendererDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public dispose(): void {
    this.sphereGeometry.dispose();
    this.sources.forEach(source => this.removeSource(source));
    this.renderer.dispose();
  }
}
