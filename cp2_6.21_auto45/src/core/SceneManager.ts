import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LightManager } from './LightManager';
import { Room } from '../models/Room';
import { Furniture } from '../models/Furniture';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public lightManager: LightManager;
  public room: Room;
  public furnitureList: Furniture[] = [];
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;

  private container: HTMLElement;
  private animationId: number | null = null;
  private selectedFurniture: Furniture | null = null;
  private isDragging: boolean = false;
  private dragPlane: THREE.Plane;
  private gridHelper: THREE.GridHelper | null = null;
  private outlineMeshes: Map<Furniture, THREE.LineSegments> = new Map();
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(3, 2, 3);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 8;
    this.controls.maxPolarAngle = Math.PI / 180 * 80;
    this.controls.minPolarAngle = 0;
    this.controls.target.set(0, 0.5, 0);

    this.lightManager = new LightManager(this.scene);
    this.room = new Room(this.scene);

    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onPointerDown(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const allMeshes: THREE.Object3D[] = [];
    this.furnitureList.forEach(f => allMeshes.push(...f.meshes));

    const intersects = this.raycaster.intersectObjects(allMeshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent && !(obj as any).userData?.furnitureRef) {
        obj = obj.parent;
      }

      if (obj && (obj as any).userData?.furnitureRef) {
        this.selectedFurniture = (obj as any).userData.furnitureRef;
        this.isDragging = true;
        this.controls.enabled = false;
        this.showGridHelper();
      }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging && this.selectedFurniture) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

      if (intersection) {
        const halfW = this.room.width / 2;
        const halfD = this.room.depth / 2;
        const fHalfW = this.selectedFurniture.size.x / 2;
        const fHalfD = this.selectedFurniture.size.z / 2;

        let x = Math.max(-halfW + fHalfW + 0.05, Math.min(halfW - fHalfW - 0.05, intersection.x));
        let z = Math.max(-halfD + fHalfD + 0.05, Math.min(halfD - fHalfD - 0.05, intersection.z));

        this.selectedFurniture.setPosition(x, this.selectedFurniture.size.y / 2, z);
      }
    }
  }

  private onPointerUp(): void {
    if (this.isDragging && this.selectedFurniture) {
      const pos = this.selectedFurniture.group.position;
      const snap = 0.25;
      const newX = Math.round(pos.x / snap) * snap;
      const newZ = Math.round(pos.z / snap) * snap;

      this.selectedFurniture.setPosition(
        newX,
        this.selectedFurniture.size.y / 2,
        newZ
      );

      this.lightManager.updateFloorLampLight(this.furnitureList);
    }

    this.isDragging = false;
    this.selectedFurniture = null;
    this.controls.enabled = true;
    this.hideGridHelper();
  }

  private showGridHelper(): void {
    if (!this.gridHelper) {
      this.gridHelper = new THREE.GridHelper(5, 20, 0x8888ff, 0x8888ff);
      this.gridHelper.position.y = 0.01;
      (this.gridHelper.material as THREE.Material).transparent = true;
      (this.gridHelper.material as THREE.Material).opacity = 0.4;
      this.scene.add(this.gridHelper);
    }
    this.gridHelper.visible = true;
  }

  private hideGridHelper(): void {
    if (this.gridHelper) {
      this.gridHelper.visible = false;
    }
  }

  public addObject(furniture: Furniture): void {
    furniture.addToScene(this.scene);
    this.furnitureList.push(furniture);
    this.lightManager.updateFloorLampLight(this.furnitureList);
  }

  public removeObject(furniture: Furniture): void {
    furniture.removeFromScene(this.scene);
    const index = this.furnitureList.indexOf(furniture);
    if (index > -1) {
      this.furnitureList.splice(index, 1);
    }
    this.removeOutline(furniture);
    this.lightManager.updateFloorLampLight(this.furnitureList);
  }

  public addLight(light: THREE.Light): void {
    this.scene.add(light);
  }

  private checkCameraProximity(): void {
    const camPos = this.camera.position;
    const threshold = 0.5;

    this.furnitureList.forEach(furniture => {
      const fPos = furniture.group.position;
      const dist = camPos.distanceTo(fPos);

      if (dist < threshold + Math.max(furniture.size.x, furniture.size.y, furniture.size.z) / 2) {
        this.showOutline(furniture);
      } else {
        this.removeOutline(furniture);
      }
    });
  }

  private showOutline(furniture: Furniture): void {
    if (this.outlineMeshes.has(furniture)) return;

    const group = new THREE.Group();
    furniture.meshes.forEach(mesh => {
      if (mesh instanceof THREE.Mesh) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x4FC3F7, linewidth: 1 })
        );
        line.position.copy(mesh.position);
        line.rotation.copy(mesh.rotation);
        line.scale.copy(mesh.scale);
        group.add(line);
      }
    });

    furniture.group.add(group);
    this.outlineMeshes.set(furniture, group as unknown as THREE.LineSegments);
  }

  private removeOutline(furniture: Furniture): void {
    const outline = this.outlineMeshes.get(furniture);
    if (outline) {
      furniture.group.remove(outline);
      (outline as any).children?.forEach((child: any) => {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      });
      this.outlineMeshes.delete(furniture);
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      this.controls.update();
      this.checkCameraProximity();
      this.room.update(delta);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
