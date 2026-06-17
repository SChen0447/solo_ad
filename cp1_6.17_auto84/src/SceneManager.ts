import * as THREE from 'three';
import type { RockLayerMeshData, OreBodyMeshData, RockLayerData, OreBodyData } from './types';

export interface SceneManagerCallbacks {
  onLayerVisibilityChange?: (id: string, visible: boolean) => void;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public initialCameraPos: THREE.Vector3;
  public initialCameraTarget: THREE.Vector3;

  private layerMeshes: Map<string, THREE.Mesh> = new Map();
  private layerMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();
  private oreMesh: THREE.Mesh | null = null;
  private oreMaterial: THREE.MeshStandardMaterial | null = null;
  private clipPlane: THREE.PlaneHelper | null = null;
  private clippingPlane: THREE.Plane | null = null;
  private isClippingEnabled: boolean = false;
  private pickableObjects: THREE.Object3D[] = [];

  private callbacks: SceneManagerCallbacks = {};

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();
    this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.02);

    const { clientWidth, clientHeight } = canvas.parentElement || document.body;
    this.camera = new THREE.PerspectiveCamera(55, clientWidth / clientHeight, 0.5, 2000);
    this.initialCameraPos = new THREE.Vector3(260, -160, 280);
    this.initialCameraTarget = new THREE.Vector3(0, -150, 0);
    this.camera.position.copy(this.initialCameraPos);
    this.camera.lookAt(this.initialCameraTarget);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.setupLights();

    window.addEventListener('resize', () => this.onResize());
  }

  private createGradientBackground(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(1, '#1a1f3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404868, 0.7);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x88aaff, 0x1a1f3a, 0.45);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(120, -60, 150);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.camera.left = -250;
    dirLight.shadow.camera.right = 250;
    dirLight.shadow.camera.top = 250;
    dirLight.shadow.camera.bottom = -400;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x66aaff, 0.35);
    fillLight.position.set(-150, -100, -120);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.25);
    rimLight.position.set(0, 50, -200);
    this.scene.add(rimLight);
  }

  public buildLayers(layerDataList: RockLayerMeshData[]): void {
    layerDataList.forEach((layerData, index) => {
      setTimeout(() => {
        const mesh = this.createLayerMesh(layerData);
        this.layerMeshes.set(layerData.id, mesh);
        this.scene.add(mesh);
        this.pickableObjects.push(mesh);
        this.animateIn(mesh, index * 0.08);
      }, index * 40);
    });
  }

  private createLayerMesh(layerData: RockLayerMeshData): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(layerData.vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(layerData.colors, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(layerData.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(layerData.indices, 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: layerData.data.opacity,
      side: THREE.DoubleSide,
      roughness: 0.78,
      metalness: 0.05,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: layerData.data.baseDepth * 0.01,
      polygonOffsetUnits: 1
    });

    this.layerMaterials.set(layerData.id, material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      type: 'rockLayer',
      id: layerData.id,
      data: layerData.data,
      originalOpacity: layerData.data.opacity
    };
    mesh.renderOrder = 1000 + layerData.data.baseDepth;
    return mesh;
  }

  public buildOreBody(oreData: OreBodyMeshData): void {
    setTimeout(() => {
      const mesh = this.createOreMesh(oreData);
      this.oreMesh = mesh;
      this.scene.add(mesh);
      this.pickableObjects.push(mesh);
      this.animateIn(mesh, 0.5);
    }, 300);
  }

  private createOreMesh(oreData: OreBodyMeshData): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(oreData.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(oreData.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(oreData.indices, 1));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(oreData.data.color),
      metalness: oreData.data.metalness,
      roughness: oreData.data.roughness,
      envMapIntensity: 1.5,
      emissive: new THREE.Color(0x332200),
      emissiveIntensity: 0.15,
      side: THREE.FrontSide,
      transparent: false,
      depthWrite: true
    });

    this.oreMaterial = material;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      type: 'oreBody',
      id: oreData.id,
      data: oreData.data
    };
    mesh.renderOrder = 999;
    return mesh;
  }

  private animateIn(mesh: THREE.Mesh, delay: number): void {
    if (mesh.material instanceof THREE.Material && 'opacity' in mesh.material) {
      const originalOpacity = mesh.userData.type === 'rockLayer'
        ? mesh.userData.originalOpacity
        : 1;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0;
      mesh.scale.setScalar(0.9);
      mesh.visible = true;

      const start = performance.now() + delay * 1000;
      const duration = 350;
      const animate = () => {
        const now = performance.now();
        const t = Math.min(Math.max((now - start) / duration, 0), 1);
        const ease = 1 - Math.pow(1 - t, 3);
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = originalOpacity * ease;
          mesh.material.needsUpdate = true;
        }
        mesh.scale.setScalar(0.9 + 0.1 * ease);
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  public setAllLayersOpacity(opacity: number): void {
    this.layerMaterials.forEach((mat) => {
      const targetOpacity = Math.max(0.05, Math.min(1, opacity));
      mat.opacity = targetOpacity;
      mat.transparent = targetOpacity < 0.999;
      mat.needsUpdate = true;
    });
  }

  public setLayerVisibility(id: string, visible: boolean): void {
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      const targetOpacity = visible ? (mesh.userData.originalOpacity || 0.7) : 0;
      this.animateOpacity(mesh, targetOpacity, visible);
      if (!visible) {
        const idx = this.pickableObjects.indexOf(mesh);
        if (idx >= 0) this.pickableObjects.splice(idx, 1);
      } else {
        if (!this.pickableObjects.includes(mesh)) {
          this.pickableObjects.push(mesh);
        }
      }
      this.callbacks.onLayerVisibilityChange?.(id, visible);
    }
  }

  private animateOpacity(mesh: THREE.Mesh, target: number, endVisible: boolean): void {
    if (mesh.material instanceof THREE.MeshStandardMaterial) {
      const start = mesh.material.opacity;
      const duration = 300;
      const startTime = performance.now();
      const animate = () => {
        const now = performance.now();
        const t = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = start + (target - start) * ease;
        mat.transparent = mat.opacity < 0.999;
        mat.needsUpdate = true;
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          mesh.visible = endVisible || mat.opacity > 0.01;
        }
      };
      requestAnimationFrame(animate);
    }
  }

  public getLayer(id: string): { mesh: THREE.Mesh; data: RockLayerData } | null {
    const mesh = this.layerMeshes.get(id);
    if (!mesh) return null;
    return { mesh, data: mesh.userData.data as RockLayerData };
  }

  public getOreBody(): { mesh: THREE.Mesh; data: OreBodyData } | null {
    if (!this.oreMesh) return null;
    return { mesh: this.oreMesh, data: this.oreMesh.userData.data as OreBodyData };
  }

  public getPickableObjects(): THREE.Object3D[] {
    return this.pickableObjects;
  }

  public resetCamera(controls: { target: THREE.Vector3; update: () => void; enableDamping?: boolean }): void {
    const startPos = this.camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = this.initialCameraPos.clone();
    const endTarget = this.initialCameraTarget.clone();
    const duration = 500;
    const startTime = performance.now();

    const animate = () => {
      const now = performance.now();
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(startPos, endPos, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      this.camera.lookAt(controls.target);
      controls.update();
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  public flashOreBody(): void {
    if (!this.oreMesh || !this.oreMaterial) return;
    const originalEmissive = this.oreMaterial.emissive.clone();
    const originalIntensity = this.oreMaterial.emissiveIntensity;
    const flashColor = new THREE.Color(0xffffff);
    let flashes = 0;
    const maxFlashes = 3;
    const period = 1000;

    const flashStep = () => {
      if (flashes >= maxFlashes) {
        this.oreMaterial!.emissive.copy(originalEmissive);
        this.oreMaterial!.emissiveIntensity = originalIntensity;
        this.oreMaterial!.needsUpdate = true;
        return;
      }
      const startTime = performance.now();
      const pulse = () => {
        const t = (performance.now() - startTime) / period;
        if (t >= 1) {
          flashes++;
          flashStep();
          return;
        }
        const intensity = Math.abs(Math.sin(t * Math.PI));
        this.oreMaterial!.emissive.lerpColors(originalEmissive, flashColor, intensity);
        this.oreMaterial!.emissiveIntensity = originalIntensity + intensity * 1.5;
        this.oreMaterial!.needsUpdate = true;
        requestAnimationFrame(pulse);
      };
      requestAnimationFrame(pulse);
    };
    flashStep();
  }

  public enableClipping(enabled: boolean): void {
    this.isClippingEnabled = enabled;
    this.renderer.localClippingEnabled = enabled;

    if (enabled) {
      if (!this.clippingPlane) {
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      }
      this.layerMaterials.forEach(mat => {
        mat.clippingPlanes = [this.clippingPlane!];
        mat.needsUpdate = true;
      });
      if (this.oreMaterial) {
        this.oreMaterial.clippingPlanes = [this.clippingPlane!];
        this.oreMaterial.needsUpdate = true;
      }
      this.createClipPlaneHelper();
    } else {
      this.layerMaterials.forEach(mat => {
        mat.clippingPlanes = [];
        mat.needsUpdate = true;
      });
      if (this.oreMaterial) {
        this.oreMaterial.clippingPlanes = [];
        this.oreMaterial.needsUpdate = true;
      }
      this.removeClipPlaneHelper();
    }
  }

  private createClipPlaneHelper(): void {
    this.removeClipPlaneHelper();
    const size = 240;
    const geom = new THREE.PlaneGeometry(size, size, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geom, mat);
    plane.rotation.x = -Math.PI / 2;

    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.LineSegments(edges, lineMat);
    line.rotation.x = -Math.PI / 2;

    const grid = new THREE.GridHelper(size, 12, 0x00e5ff, 0x0088aa);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;

    const group = new THREE.Group();
    group.add(plane);
    group.add(line);
    group.add(grid);
    group.userData = { isClipPlane: true };
    this.clipPlane = group as unknown as THREE.PlaneHelper;
    this.scene.add(this.clipPlane as unknown as THREE.Object3D);
    this.updateClipPlaneY(-150);
  }

  private removeClipPlaneHelper(): void {
    if (this.clipPlane) {
      this.scene.remove(this.clipPlane as unknown as THREE.Object3D);
      this.clipPlane = null;
    }
  }

  public updateClipPlaneY(yWorld: number): void {
    if (this.clippingPlane) {
      this.clippingPlane.constant = -yWorld;
    }
    if (this.clipPlane) {
      this.clipPlane.position.set(0, yWorld, 0);
    }
  }

  public getClipPlaneY(): number {
    if (!this.clippingPlane) return 0;
    return -this.clippingPlane.constant;
  }

  public isClippingOn(): boolean {
    return this.isClippingEnabled;
  }

  public onResize(): void {
    const parent = this.renderer.domElement.parentElement || document.body;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.layerMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) mesh.material.dispose();
    });
    if (this.oreMesh) {
      this.oreMesh.geometry.dispose();
      if (this.oreMesh.material instanceof THREE.Material) this.oreMesh.material.dispose();
    }
    this.renderer.dispose();
  }
}
