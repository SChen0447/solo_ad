import * as THREE from 'three';
import { DisplayMode, ModelManager, AtomMeshUserData } from './ModelManager';

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface HoverCallbackData {
  atomIndex: number;
  element: string;
  position: THREE.Vector3;
  screenX: number;
  screenY: number;
}

export interface ClickCallbackData {
  atomIndex: number;
  element: string;
  position: THREE.Vector3;
  neighborCount: number;
}

type HoverCallback = (data: HoverCallbackData | null) => void;
type ClickCallback = (data: ClickCallbackData) => void;

export class Renderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private modelManager: ModelManager;
  private currentModel: THREE.Group | null;
  private displayMode: DisplayMode;

  private isDragging: boolean;
  private previousMouse: { x: number; y: number };
  private spherical: { radius: number; theta: number; phi: number };
  private initialCameraState: CameraState;
  private targetCameraState: CameraState | null;
  private cameraAnimationTime: number;
  private cameraAnimationDuration: number;
  private startCameraState: CameraState | null;

  private scaleAnimationTime: number;
  private scaleAnimationDuration: number;
  private scaleStart: number;
  private scaleTarget: number;

  private hoveredAtom: THREE.Mesh | null;
  private hoverCallback: HoverCallback | null;
  private clickCallback: ClickCallback | null;

  private animationId: number;
  private atomNeighborMap: Map<number, number>;

  constructor(container: HTMLElement) {
    this.container = container;
    this.modelManager = new ModelManager();
    this.currentModel = null;
    this.displayMode = 'ballstick';

    this.isDragging = false;
    this.previousMouse = { x: 0, y: 0 };
    this.spherical = { radius: 10, theta: Math.PI / 4, phi: Math.PI / 3 };
    this.initialCameraState = {
      position: new THREE.Vector3(),
      target: new THREE.Vector3(0, 0, 0)
    };
    this.targetCameraState = null;
    this.cameraAnimationTime = 0;
    this.cameraAnimationDuration = 0;
    this.startCameraState = null;

    this.scaleAnimationTime = 0;
    this.scaleAnimationDuration = 0;
    this.scaleStart = 1;
    this.scaleTarget = 1;

    this.hoveredAtom = null;
    this.hoverCallback = null;
    this.clickCallback = null;
    this.animationId = 0;
    this.atomNeighborMap = new Map();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupEventListeners();
    this.updateCameraPosition();
    this.updateInitialCameraState();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 7);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -3, -5);
    this.scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x88aaff, 0.3, 50);
    pointLight.position.set(0, 5, 10);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', this.onMouseDown);
    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('mouseleave', this.onMouseLeave);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('click', this.handleCanvasClick);

    dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    dom.addEventListener('touchmove', this.onTouchMove, { passive: false });
    dom.addEventListener('touchend', this.onTouchEnd);

    window.addEventListener('resize', this.onResize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.targetCameraState = null;
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMouse(e.clientX, e.clientY);

    if (this.isDragging) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;

      this.spherical.theta -= dx * 0.01;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.01));

      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.updateCameraPosition();
      this.updateInitialCameraState();
    }

    this.checkHover(e.clientX, e.clientY);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onMouseLeave = (): void => {
    this.isDragging = false;
    this.clearHover();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    this.spherical.radius = Math.max(2, Math.min(50, this.spherical.radius + delta));
    this.updateCameraPosition();
    this.updateInitialCameraState();
    this.targetCameraState = null;
  };

  private handleCanvasClick = (e: MouseEvent): void => {
    this.updateMouse(e.clientX, e.clientY);
    const atom = this.pickAtom();
    if (atom && this.clickCallback) {
      const userData = atom.userData as AtomMeshUserData;
      this.clickCallback({
        atomIndex: userData.atomIndex,
        element: userData.element,
        position: atom.position.clone(),
        neighborCount: this.atomNeighborMap.get(userData.atomIndex) || 0
      });
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.targetCameraState = null;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - this.previousMouse.x;
      const dy = touch.clientY - this.previousMouse.y;

      this.spherical.theta -= dx * 0.01;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.01));

      this.previousMouse = { x: touch.clientX, y: touch.clientY };
      this.updateCameraPosition();
      this.updateInitialCameraState();
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateCameraPosition(): void {
    const { radius, theta, phi } = this.spherical;
    this.camera.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(0, 0, 0);
  }

  private updateInitialCameraState(): void {
    this.initialCameraState.position.copy(this.camera.position);
  }

  private pickAtom(): THREE.Mesh | null {
    if (!this.currentModel) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const atomGroup = this.currentModel.getObjectByName('atoms');
    if (!atomGroup) return null;

    const intersects = this.raycaster.intersectObjects(atomGroup.children, false);
    if (intersects.length > 0) {
      return intersects[0].object as THREE.Mesh;
    }
    return null;
  }

  private checkHover(clientX: number, clientY: number): void {
    const atom = this.pickAtom();

    if (atom !== this.hoveredAtom) {
      if (this.hoveredAtom) {
        this.modelManager.setAtomHighlight(this.hoveredAtom, false);
      }

      this.hoveredAtom = atom;

      if (atom && this.hoverCallback) {
        this.modelManager.setAtomHighlight(atom, true);
        const userData = atom.userData as AtomMeshUserData;
        this.hoverCallback({
          atomIndex: userData.atomIndex,
          element: userData.element,
          position: atom.position.clone(),
          screenX: clientX,
          screenY: clientY
        });
      } else if (this.hoverCallback) {
        this.hoverCallback(null);
      }
    } else if (atom && this.hoverCallback) {
      const userData = atom.userData as AtomMeshUserData;
      this.hoverCallback({
        atomIndex: userData.atomIndex,
        element: userData.element,
        position: atom.position.clone(),
        screenX: clientX,
        screenY: clientY
      });
    }
  }

  private clearHover(): void {
    if (this.hoveredAtom) {
      this.modelManager.setAtomHighlight(this.hoveredAtom, false);
      this.hoveredAtom = null;
    }
    if (this.hoverCallback) {
      this.hoverCallback(null);
    }
  }

  public addModel(
    group: THREE.Group,
    atomNeighborMap: Map<number, number>,
    animate: boolean = true
  ): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    this.currentModel = group;
    this.atomNeighborMap = atomNeighborMap;

    if (animate) {
      this.scaleStart = 0.3;
      this.scaleTarget = 1;
      this.scaleAnimationTime = 0;
      this.scaleAnimationDuration = 500;
      group.scale.setScalar(this.scaleStart);
    } else {
      group.scale.setScalar(1);
    }

    this.scene.add(group);

    this.fitCameraToModel();
  }

  private fitCameraToModel(): void {
    if (!this.currentModel) return;

    const box = new THREE.Box3().setFromObject(this.currentModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = (maxDim / 2) / Math.tan(fov / 2);
    distance *= 1.8;

    this.spherical.radius = Math.max(distance, 5);
    this.spherical.theta = Math.PI / 4;
    this.spherical.phi = Math.PI / 3;
    this.updateCameraPosition();
    this.updateInitialCameraState();
  }

  public setMode(mode: DisplayMode): void {
    if (this.displayMode === mode) return;
    this.displayMode = mode;
    if (this.currentModel) {
      this.modelManager.updateMode(this.currentModel, mode);
    }
  }

  public resetView(): void {
    this.startCameraState = {
      position: this.camera.position.clone(),
      target: new THREE.Vector3(0, 0, 0)
    };
    this.targetCameraState = {
      position: this.initialCameraState.position.clone(),
      target: new THREE.Vector3(0, 0, 0)
    };
    this.cameraAnimationTime = 0;
    this.cameraAnimationDuration = 1000;
  }

  public onHover(callback: HoverCallback): void {
    this.hoverCallback = callback;
  }

  public onClick(callback: ClickCallback): void {
    this.clickCallback = callback;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = 16;

    if (this.scaleAnimationTime < this.scaleAnimationDuration && this.currentModel) {
      this.scaleAnimationTime += delta;
      const t = Math.min(1, this.scaleAnimationTime / this.scaleAnimationDuration);
      const eased = this.easeOutCubic(t);
      const scale = this.scaleStart + (this.scaleTarget - this.scaleStart) * eased;
      this.currentModel.scale.setScalar(scale);
    }

    if (this.targetCameraState && this.startCameraState && this.cameraAnimationTime < this.cameraAnimationDuration) {
      this.cameraAnimationTime += delta;
      const t = Math.min(1, this.cameraAnimationTime / this.cameraAnimationDuration);
      const eased = this.easeOutCubic(t);

      this.camera.position.lerpVectors(
        this.startCameraState.position,
        this.targetCameraState.position,
        eased
      );
      this.camera.lookAt(0, 0, 0);

      if (t >= 1) {
        const dx = this.targetCameraState.position.x;
        const dy = this.targetCameraState.position.y;
        const dz = this.targetCameraState.position.z;
        this.spherical.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        this.spherical.phi = Math.acos(dy / this.spherical.radius);
        this.spherical.theta = Math.atan2(dz, dx);
        this.targetCameraState = null;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);

    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.onMouseDown);
    dom.removeEventListener('mousemove', this.onMouseMove);
    dom.removeEventListener('mouseup', this.onMouseUp);
    dom.removeEventListener('mouseleave', this.onMouseLeave);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('click', this.handleCanvasClick);
    dom.removeEventListener('touchstart', this.onTouchStart);
    dom.removeEventListener('touchmove', this.onTouchMove);
    dom.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);

    this.renderer.dispose();
    if (dom.parentNode) {
      dom.parentNode.removeChild(dom);
    }
  }
}
