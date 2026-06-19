import * as THREE from 'three';
import type { VoxelData } from './UIDataManager';

class InstancedLineSegments extends THREE.InstancedMesh {
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    super(geometry, material, count);
  }
}

interface VoxelMeshData {
  mesh: THREE.InstancedMesh;
  edges: InstancedLineSegments;
  dummy: THREE.Object3D;
  color: THREE.Color;
  positions: Map<string, number>;
}

interface AnimationData {
  type: 'add' | 'remove';
  voxel: VoxelData;
  startTime: number;
  duration: number;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
}

export class Renderer3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private voxelGeometry: THREE.BoxGeometry;
  private edgeGeometry: THREE.EdgesGeometry;

  private voxelMeshes: Map<string, VoxelMeshData> = new Map();
  private instanceMaxCount = 2000;

  private animations: AnimationData[] = [];
  private highlightOutline: THREE.LineSegments | null = null;
  private groundGrid: THREE.GridHelper | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2332);
    this.scene.fog = new THREE.Fog(0x1a2332, 50, 150);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(30, 30, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.voxelGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.edgeGeometry = new THREE.EdgesGeometry(this.voxelGeometry);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.setupGroundGrid();
    this.setupResizeHandler();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.3);
    this.scene.add(hemisphereLight);
  }

  private setupGroundGrid(): void {
    this.groundGrid = new THREE.GridHelper(20, 20, 0xffffff30, 0xffffff30);
    this.groundGrid.position.y = -0.001;
    this.scene.add(this.groundGrid);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.name = 'ground';
    this.scene.add(ground);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  getMouse(): THREE.Vector2 {
    return this.mouse;
  }

  getVoxelMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.voxelMeshes.values()).map(data => data.mesh);
  }

  getGroundMeshes(): THREE.Mesh[] {
    const ground = this.scene.getObjectByName('ground');
    return ground ? [ground as THREE.Mesh] : [];
  }

  getVoxelPositions(color: string): Map<string, number> {
    const meshData = this.voxelMeshes.get(color);
    return meshData ? meshData.positions : new Map();
  }

  addVoxel(voxel: VoxelData, animate: boolean = true): void {
    if (animate) {
      this.playAddAnimation(voxel);
    }
    this.updateInstancedMesh(voxel, true);
  }

  removeVoxel(voxel: VoxelData, animate: boolean = true): void {
    if (animate) {
      this.playRemoveAnimation(voxel);
    }
    this.updateInstancedMesh(voxel, false);
  }

  private playAddAnimation(voxel: VoxelData): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(voxel.color),
      transparent: true,
      opacity: 0,
      metalness: 0.1,
      roughness: 0.5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
    mesh.scale.set(0.5, 0.5, 0.5);
    this.scene.add(mesh);

    const edgeGeo = new THREE.EdgesGeometry(geometry);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.copy(mesh.position);
    edges.scale.copy(mesh.scale);
    this.scene.add(edges);

    this.animations.push({
      type: 'add',
      voxel,
      startTime: performance.now(),
      duration: 200,
      mesh,
      edges
    });
  }

  private playRemoveAnimation(voxel: VoxelData): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(voxel.color),
      transparent: true,
      opacity: 1,
      metalness: 0.1,
      roughness: 0.5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
    this.scene.add(mesh);

    const edgeGeo = new THREE.EdgesGeometry(geometry);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.copy(mesh.position);
    this.scene.add(edges);

    this.animations.push({
      type: 'remove',
      voxel,
      startTime: performance.now(),
      duration: 150,
      mesh,
      edges
    });
  }

  private updateInstancedMesh(voxel: VoxelData, add: boolean): void {
    const color = voxel.color;
    let meshData = this.voxelMeshes.get(color);

    if (add) {
      if (!meshData) {
        meshData = this.createVoxelMeshData(color);
        this.voxelMeshes.set(color, meshData);
      }

      const key = `${voxel.x},${voxel.y},${voxel.z}`;
      if (!meshData.positions.has(key)) {
        const index = meshData.positions.size;
        meshData.positions.set(key, index);

        meshData.dummy.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
        meshData.dummy.updateMatrix();
        meshData.mesh.setMatrixAt(index, meshData.dummy.matrix);
        meshData.edges.setMatrixAt(index, meshData.dummy.matrix);

        meshData.mesh.count = Math.max(meshData.mesh.count, index + 1);
        meshData.edges.count = Math.max(meshData.edges.count, index + 1);

        meshData.mesh.instanceMatrix.needsUpdate = true;
        meshData.edges.instanceMatrix.needsUpdate = true;
      }
    } else {
      if (meshData) {
        const key = `${voxel.x},${voxel.y},${voxel.z}`;
        const removeIndex = meshData.positions.get(key);

        if (removeIndex !== undefined) {
          meshData.positions.delete(key);

          const lastIndex = meshData.positions.size;

          if (removeIndex < lastIndex) {
            let lastKey: string | undefined;
            for (const [k, idx] of meshData.positions.entries()) {
              if (idx === lastIndex) {
                lastKey = k;
                break;
              }
            }

            if (lastKey) {
              meshData.positions.set(lastKey, removeIndex);

              const matrix = new THREE.Matrix4();
              meshData.mesh.getMatrixAt(lastIndex, matrix);
              meshData.mesh.setMatrixAt(removeIndex, matrix);
              meshData.edges.setMatrixAt(removeIndex, matrix);
            }
          }

          meshData.mesh.count = Math.max(0, meshData.mesh.count - 1);
          meshData.edges.count = Math.max(0, meshData.edges.count - 1);

          meshData.mesh.instanceMatrix.needsUpdate = true;
          meshData.edges.instanceMatrix.needsUpdate = true;

          if (meshData.positions.size === 0) {
            this.scene.remove(meshData.mesh);
            this.scene.remove(meshData.edges);
            meshData.mesh.dispose();
            meshData.edges.dispose();
            this.voxelMeshes.delete(color);
          }
        }
      }
    }
  }

  private createVoxelMeshData(color: string): VoxelMeshData {
    const threeColor = new THREE.Color(color);

    const material = new THREE.MeshStandardMaterial({
      color: threeColor,
      metalness: 0.1,
      roughness: 0.5
    });

    const mesh = new THREE.InstancedMesh(
      this.voxelGeometry,
      material,
      this.instanceMaxCount
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.count = 0;
    this.scene.add(mesh);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5
    });

    const edges = new InstancedLineSegments(
      this.edgeGeometry,
      edgeMaterial,
      this.instanceMaxCount
    );
    edges.count = 0;
    this.scene.add(edges);

    return {
      mesh,
      edges,
      dummy: new THREE.Object3D(),
      color: threeColor,
      positions: new Map()
    };
  }

  highlightVoxel(x: number, y: number, z: number): void {
    this.removeHighlight();

    const geometry = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2
    });

    this.highlightOutline = new THREE.LineSegments(edges, material);
    this.highlightOutline.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(this.highlightOutline);
  }

  removeHighlight(): void {
    if (this.highlightOutline) {
      this.scene.remove(this.highlightOutline);
      this.highlightOutline.geometry.dispose();
      (this.highlightOutline.material as THREE.Material).dispose();
      this.highlightOutline = null;
    }
  }

  updateAnimations(): void {
    const now = performance.now();
    const completedAnimations: number[] = [];

    this.animations.forEach((anim, index) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (anim.type === 'add') {
        const elasticProgress = this.elasticOut(progress);
        const scale = 0.5 + elasticProgress * 0.5;
        const opacity = elasticProgress;

        anim.mesh.scale.set(scale, scale, scale);
        anim.edges.scale.set(scale, scale, scale);
        (anim.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
        (anim.edges.material as THREE.LineBasicMaterial).opacity = opacity * 0.5;
      } else {
        const scale = 1 - progress;
        const opacity = 1 - progress;

        anim.mesh.scale.set(scale, scale, scale);
        anim.edges.scale.set(scale, scale, scale);
        (anim.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
        (anim.edges.material as THREE.LineBasicMaterial).opacity = opacity * 0.5;
      }

      if (progress >= 1) {
        completedAnimations.push(index);
      }
    });

    for (let i = completedAnimations.length - 1; i >= 0; i--) {
      const idx = completedAnimations[i];
      const anim = this.animations[idx];

      this.scene.remove(anim.mesh);
      this.scene.remove(anim.edges);
      anim.mesh.geometry.dispose();
      (anim.mesh.material as THREE.Material).dispose();
      anim.edges.geometry.dispose();
      (anim.edges.material as THREE.Material).dispose();

      this.animations.splice(idx, 1);
    }
  }

  private elasticOut(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  render(): void {
    this.updateAnimations();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.voxelMeshes.forEach(meshData => {
      meshData.mesh.dispose();
      meshData.edges.dispose();
    });

    this.animations.forEach(anim => {
      anim.mesh.geometry.dispose();
      (anim.mesh.material as THREE.Material).dispose();
      anim.edges.geometry.dispose();
      (anim.edges.material as THREE.Material).dispose();
    });

    this.voxelGeometry.dispose();
    this.edgeGeometry.dispose();

    this.removeHighlight();
    this.renderer.dispose();
  }
}
