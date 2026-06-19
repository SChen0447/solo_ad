import * as THREE from 'three';
import { eventBus } from './EventBus';
import { RELICS, getRelicById } from '../config/relics';
import type { Relic, RelicObject, ViewMode, GeometryConfig } from '../types';
import { hslToRgb, lerp } from '../utils/animation';

export class SceneManager {
  public scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private relicObjects: Map<string, RelicObject> = new Map();
  private particleSystem: THREE.Points | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private mainLight: THREE.DirectionalLight | null = null;
  private backLight: THREE.DirectionalLight | null = null;
  private haloRing: THREE.Mesh | null = null;
  private currentRelicId: string = RELICS[0].id;
  private viewMode: ViewMode = 'free';
  private haloHue: number = 0;
  private fog: THREE.Fog | null = null;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.setupScene();
    this.setupLights();
    this.setupParticles();
    this.setupGround();
    this.setupFog();
    this.createAllRelics();
    this.setupEventListeners();
    this.updateRelicPositions();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x1a2332);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(this.ambientLight);

    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.mainLight.position.set(5, 10, 7);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 50;
    this.mainLight.shadow.camera.left = -10;
    this.mainLight.shadow.camera.right = 10;
    this.mainLight.shadow.camera.top = 10;
    this.mainLight.shadow.camera.bottom = -10;
    this.scene.add(this.mainLight);

    this.backLight = new THREE.DirectionalLight(0xb39ddb, 0.4);
    this.backLight.position.set(-5, 5, -7);
    this.scene.add(this.backLight);

    const fillLight = new THREE.DirectionalLight(0xcba86a, 0.3);
    fillLight.position.set(0, 3, 5);
    this.scene.add(fillLight);
  }

  private setupParticles(): void {
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 50 + 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.67;
        colors[i3 + 2] = 0.42;
      } else if (colorChoice < 0.66) {
        colors[i3] = 0.7;
        colors[i3 + 1] = 0.62;
        colors[i3 + 2] = 0.86;
      } else {
        colors[i3] = 0.5;
        colors[i3 + 1] = 0.7;
        colors[i3 + 2] = 0.9;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(30, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f1620,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const haloGeometry = new THREE.RingGeometry(1.5, 2, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xcba86a,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    this.haloRing = new THREE.Mesh(haloGeometry, haloMaterial);
    this.haloRing.rotation.x = -Math.PI / 2;
    this.haloRing.position.y = -1.9;
    this.scene.add(this.haloRing);
  }

  private setupFog(): void {
    this.fog = new THREE.Fog(0x1a2332, 20, 60);
    this.scene.fog = this.fog;
  }

  private createGeometry(config: GeometryConfig): THREE.BufferGeometry {
    const { type, params } = config;
    switch (type) {
      case 'box':
        return new THREE.BoxGeometry(params.width, params.height, params.depth);
      case 'cylinder':
        return new THREE.CylinderGeometry(
          params.radiusTop,
          params.radiusBottom,
          params.height,
          params.radialSegments || 32,
          params.heightSegments || 1
        );
      case 'sphere':
        return new THREE.SphereGeometry(
          params.radius,
          params.radialSegments || 32,
          params.heightSegments || 16
        );
      case 'torus':
        return new THREE.TorusGeometry(
          params.radius,
          params.tube,
          params.radialSegments || 16,
          params.tubularSegments || 100,
          params.arc || Math.PI * 2
        );
      case 'cone':
        return new THREE.ConeGeometry(
          params.radius,
          params.height,
          params.radialSegments || 32
        );
      case 'extrude':
        const shape = new THREE.Shape();
        const w = (params.width || 1) / 2;
        const h = (params.height || 1) / 2;
        shape.moveTo(-w, -h);
        shape.lineTo(w, -h);
        shape.lineTo(w, h);
        shape.lineTo(-w, h);
        shape.lineTo(-w, -h);
        const extrudeSettings = {
          depth: params.depth || 0.1,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.02,
          bevelSegments: 3
        };
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  private createMaterial(config: GeometryConfig['material']): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      metalness: config.metalness,
      roughness: config.roughness
    });
  }

  private createRelic(relic: Relic): RelicObject {
    const group = new THREE.Group();
    
    const geometry = this.createGeometry(relic.geometry);
    const material = this.createMaterial(relic.geometry.material);
    const mainMesh = new THREE.Mesh(geometry, material);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    const parts: THREE.Mesh[] = [];
    if (relic.explosionParts) {
      relic.explosionParts.forEach(part => {
        const partGeometry = this.createGeometry(part.geometry);
        const partMaterial = this.createMaterial(part.geometry.material);
        const partMesh = new THREE.Mesh(partGeometry, partMaterial);
        partMesh.castShadow = true;
        partMesh.receiveShadow = true;
        partMesh.userData.originalPosition = { ...part.offset };
        partMesh.userData.explosionOffset = part.offset;
        partMesh.visible = false;
        parts.push(partMesh);
        group.add(partMesh);
      });
    }

    const annotationMarkers: THREE.Mesh[] = [];
    relic.annotations.forEach(annotation => {
      const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xcba86a,
        transparent: true,
        opacity: 0.9
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(annotation.position.x, annotation.position.y, annotation.position.z);
      marker.userData.annotationId = annotation.id;
      marker.userData.baseScale = 1;
      annotationMarkers.push(marker);
      group.add(marker);

      const ringGeometry = new THREE.RingGeometry(0.1, 0.15, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xcba86a,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(marker.position);
      ring.lookAt(this.camera.position);
      ring.userData.isRing = true;
      ring.userData.parentMarker = marker;
      annotationMarkers.push(ring);
      group.add(ring);
    });

    const haloGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xcba86a,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -1.5;
    halo.visible = false;
    group.add(halo);

    group.userData.relicId = relic.id;
    
    return {
      group,
      mainMesh,
      parts,
      halo,
      annotationMarkers
    };
  }

  private createAllRelics(): void {
    RELICS.forEach((relic, index) => {
      const relicObject = this.createRelic(relic);
      this.relicObjects.set(relic.id, relicObject);
      this.scene.add(relicObject.group);
      
      const angle = (index / RELICS.length) * Math.PI * 2;
      const radius = 8;
      relicObject.group.position.x = Math.cos(angle) * radius;
      relicObject.group.position.z = Math.sin(angle) * radius;
      
      const opacity = relic.id === this.currentRelicId ? 1 : 0.2;
      this.setRelicOpacity(relicObject, opacity);
    });

    eventBus.emit('LOAD_PROGRESS', { progress: 50 });
  }

  private setRelicOpacity(relicObject: RelicObject, opacity: number): void {
    const setMeshOpacity = (mesh: THREE.Mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = opacity;
    };

    setMeshOpacity(relicObject.mainMesh);
    relicObject.parts.forEach(setMeshOpacity);
  }

  private updateRelicPositions(): void {
    this.relicObjects.forEach((relicObject, id) => {
      if (id === this.currentRelicId) {
        relicObject.group.position.set(0, 0, 0);
        relicObject.halo.visible = true;
        this.setRelicOpacity(relicObject, 1);
        relicObject.annotationMarkers.forEach(marker => {
          marker.visible = this.viewMode !== 'free';
        });
      } else {
        const index = RELICS.findIndex(r => r.id === id);
        const angle = (index / RELICS.length) * Math.PI * 2;
        const radius = this.viewMode === 'focus' ? 15 : 8;
        relicObject.group.position.x = Math.cos(angle) * radius;
        relicObject.group.position.z = Math.sin(angle) * radius;
        relicObject.halo.visible = false;
        
        const targetOpacity = this.viewMode === 'focus' || this.viewMode === 'explosion' ? 0.2 : 0.3;
        this.setRelicOpacity(relicObject, targetOpacity);
        relicObject.annotationMarkers.forEach(marker => {
          marker.visible = false;
        });
      }
    });

    if (this.haloRing) {
      this.haloRing.visible = true;
    }

    if (this.fog) {
      this.fog.far = this.viewMode === 'focus' ? 30 : 60;
    }
  }

  private setupEventListeners(): void {
    eventBus.on('RELIC_SELECTED', ({ relicId }) => {
      this.currentRelicId = relicId;
      this.updateRelicPositions();
      this.animateRelicSwitch(relicId);
    });

    eventBus.on('VIEW_MODE_CHANGED', ({ mode }) => {
      this.viewMode = mode;
      this.handleViewModeChange(mode);
    });

    eventBus.on('ANNOTATION_HOVER', ({ annotationId }) => {
      this.highlightAnnotation(annotationId, true);
    });

    eventBus.on('CAMERA_POSITION_UPDATED', () => {
      this.updateAnnotationOrientations();
    });
  }

  private animateRelicSwitch(relicId: string): void {
    const relicObject = this.relicObjects.get(relicId);
    if (!relicObject) return;

    const startY = relicObject.group.position.y;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      relicObject.group.position.y = startY + Math.sin(progress * Math.PI) * 0.5;
      relicObject.group.rotation.y = eased * Math.PI * 2;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        relicObject.group.position.y = 0;
        relicObject.group.rotation.y = 0;
      }
    };

    requestAnimationFrame(animate);
  }

  private handleViewModeChange(mode: ViewMode): void {
    this.updateRelicPositions();
    
    const currentRelicObject = this.relicObjects.get(this.currentRelicId);
    if (!currentRelicObject) return;

    if (mode === 'explosion' && currentRelicObject.parts.length > 0) {
      currentRelicObject.mainMesh.visible = false;
      currentRelicObject.parts.forEach((part, index) => {
        part.visible = true;
        const offset = part.userData.explosionOffset;
        const animatePart = () => {
          const startPos = { x: 0, y: 0, z: 0 };
          const duration = 600 + index * 100;
          const startTime = performance.now();
          
          const tick = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            part.position.x = lerp(startPos.x, offset.x, eased);
            part.position.y = lerp(startPos.y, offset.y, eased);
            part.position.z = lerp(startPos.z, offset.z, eased);
            
            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };
          
          requestAnimationFrame(tick);
        };
        animatePart();
      });
    } else {
      currentRelicObject.mainMesh.visible = true;
      currentRelicObject.parts.forEach(part => {
        part.visible = false;
        part.position.set(0, 0, 0);
      });
    }
  }

  private highlightAnnotation(annotationId: string, isHovered: boolean): void {
    this.relicObjects.forEach(relicObject => {
      relicObject.annotationMarkers.forEach(marker => {
        if (marker.userData.annotationId === annotationId) {
          const targetScale = isHovered ? 1.5 : 1;
          const targetOpacity = isHovered ? 1 : 0.9;
          
          const material = marker.material as THREE.MeshBasicMaterial;
          const startScale = marker.userData.baseScale || 1;
          const startOpacity = material.opacity;
          const duration = 200;
          const startTime = performance.now();
          
          const tick = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            marker.scale.setScalar(lerp(startScale, targetScale, eased));
            material.opacity = lerp(startOpacity, targetOpacity, eased);
            
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              marker.userData.baseScale = targetScale;
            }
          };
          
          requestAnimationFrame(tick);
        }
      });
    });
  }

  private updateAnnotationOrientations(): void {
    this.relicObjects.forEach(relicObject => {
      relicObject.annotationMarkers.forEach(marker => {
        if (marker.userData.isRing) {
          marker.lookAt(this.camera.position);
        }
      });
    });
  }

  public update(deltaTime: number): void {
    if (this.particleSystem) {
      this.particleSystem.rotation.y += deltaTime * 0.02;
      this.particleSystem.rotation.x += deltaTime * 0.01;
    }

    this.haloHue += deltaTime * 0.05;
    if (this.haloHue > 1) this.haloHue = 0;
    
    const hue = (this.haloHue * 0.15) + 0.08;
    const color = new THREE.Color(hslToRgb(hue, 0.6, 0.5));
    
    if (this.haloRing) {
      (this.haloRing.material as THREE.MeshBasicMaterial).color = color;
    }

    const currentRelic = this.relicObjects.get(this.currentRelicId);
    if (currentRelic && currentRelic.halo) {
      (currentRelic.halo.material as THREE.MeshBasicMaterial).color = color;
      currentRelic.halo.rotation.z += deltaTime * 0.5;
    }

    this.relicObjects.forEach(relicObject => {
      if (relicObject.group.userData.relicId !== this.currentRelicId) {
        relicObject.group.rotation.y += deltaTime * 0.1;
      }
    });

    this.relicObjects.forEach(relicObject => {
      relicObject.annotationMarkers.forEach(marker => {
        if (!marker.userData.isRing && marker.visible) {
          const time = performance.now() * 0.002;
          marker.position.y += Math.sin(time + marker.position.x) * 0.002;
        }
      });
    });
  }

  public getCurrentRelic(): Relic | undefined {
    return getRelicById(this.currentRelicId);
  }

  public getCurrentRelicObject(): RelicObject | undefined {
    return this.relicObjects.get(this.currentRelicId);
  }

  public getRelicObjects(): Map<string, RelicObject> {
    return this.relicObjects;
  }

  public dispose(): void {
    this.relicObjects.forEach(relicObject => {
      relicObject.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.scene.remove(relicObject.group);
    });
    
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.scene.remove(this.particleSystem);
    }
  }
}
