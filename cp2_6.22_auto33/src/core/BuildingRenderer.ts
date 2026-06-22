import * as THREE from 'three';
import { BuildingData } from './CityGenerator';

interface BuildingAnimationState {
  x: number;
  z: number;
  width: number;
  depth: number;
  targetHeight: number;
  currentHeight: number;
  startTime: number;
  duration: number;
}

export class BuildingRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private buildingsMesh: THREE.InstancedMesh | null = null;
  private dummy: THREE.Object3D;
  private animationStates: BuildingAnimationState[] = [];
  private totalElapsed: number = 0;

  private cityCenter: THREE.Vector3 = new THREE.Vector3(200, 0, 200);

  private currentTheta: number = Math.PI / 4;
  private currentPhi: number = Math.PI / 3;
  private currentRadius: number = 180;

  private targetTheta: number = Math.PI / 4;
  private targetPhi: number = Math.PI / 3;
  private targetRadius: number = 180;

  private cameraLerpAlpha: number = 0;
  private cameraLerpDuration: number = 0.3;
  private isCameraTransitioning: boolean = false;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private rotationSpeed: number = 0.4;

  private minRadius: number = 10;
  private maxRadius: number = 300;

  private startTheta: number = 0;
  private startPhi: number = 0;
  private startRadius: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.dummy = new THREE.Object3D();

    this.setupEventListeners();
    this.updateCameraPositionImmediate();
  }

  private setupEventListeners(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    domElement.addEventListener('wheel', this.onWheel.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
      this.previousMouseX = event.clientX;
      this.previousMouseY = event.clientY;
      this.isCameraTransitioning = false;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouseX;
    const deltaY = event.clientY - this.previousMouseY;

    this.targetTheta -= deltaX * 0.01 * this.rotationSpeed;
    this.targetPhi -= deltaY * 0.01 * this.rotationSpeed;

    this.targetPhi = Math.max(0.05, Math.min(Math.PI - 0.05, this.targetPhi));

    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
    this.targetRadius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetRadius * zoomFactor)
    );

    this.startCameraTransition(0.3);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === '1') {
      this.switchToOverheadView();
    } else if (event.key === '2') {
      this.switchToStreetView();
    }
  }

  private switchToOverheadView(): void {
    this.targetTheta = this.currentTheta;
    this.targetPhi = (60 * Math.PI) / 180;
    this.targetRadius = this.calculateRadiusForHeight(150, this.targetPhi);
    this.startCameraTransition(0.8);
  }

  private switchToStreetView(): void {
    this.targetTheta = this.currentTheta;
    this.targetPhi = Math.PI / 2 - Math.atan2(10, 200);
    this.targetRadius = Math.sqrt(200 * 200 + 200 * 200 + 10 * 10);
    this.startCameraTransition(0.8);
  }

  private calculateRadiusForHeight(height: number, phi: number): number {
    const y = height - this.cityCenter.y;
    return y / Math.cos(phi);
  }

  private startCameraTransition(duration: number): void {
    this.startTheta = this.currentTheta;
    this.startPhi = this.currentPhi;
    this.startRadius = this.currentRadius;
    this.cameraLerpAlpha = 0;
    this.cameraLerpDuration = duration;
    this.isCameraTransitioning = true;
  }

  updateBuildings(buildings: BuildingData[]): void {
    if (this.buildingsMesh) {
      this.scene.remove(this.buildingsMesh);
      this.buildingsMesh.geometry.dispose();
      if (Array.isArray(this.buildingsMesh.material)) {
        this.buildingsMesh.material.forEach((m) => m.dispose());
      } else {
        this.buildingsMesh.material.dispose();
      }
      this.buildingsMesh = null;
    }

    if (buildings.length === 0) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: false,
      metalness: 0.3,
      roughness: 0.7,
    });

    this.buildingsMesh = new THREE.InstancedMesh(geometry, material, buildings.length);
    this.buildingsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    if (this.buildingsMesh.instanceColor) {
      this.buildingsMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    this.animationStates = [];
    const color = new THREE.Color();

    for (let i = 0; i < buildings.length; i++) {
      const building = buildings[i];
      const delay = Math.random() * 0.3;

      this.animationStates.push({
        x: building.x,
        z: building.z,
        width: building.width,
        depth: building.depth,
        targetHeight: building.height,
        currentHeight: 0,
        startTime: this.totalElapsed + delay,
        duration: 0.5,
      });

      color.set(building.color);
      this.buildingsMesh.setColorAt(i, color);
    }

    if (this.buildingsMesh.instanceColor) {
      this.buildingsMesh.instanceColor.needsUpdate = true;
    }

    this.scene.add(this.buildingsMesh);
    this.updateBuildingMatrices();
  }

  private updateBuildingMatrices(): void {
    if (!this.buildingsMesh || this.animationStates.length === 0) return;

    const mesh = this.buildingsMesh;

    for (let i = 0; i < this.animationStates.length; i++) {
      const state = this.animationStates[i];
      const height = Math.max(0.01, state.currentHeight);

      this.dummy.position.set(
        state.x + state.width / 2,
        height / 2,
        state.z + state.depth / 2
      );
      this.dummy.scale.set(state.width, height, state.depth);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }

  tick(delta: number): void {
    this.totalElapsed += delta;

    let hasActiveAnimation = false;
    for (const state of this.animationStates) {
      if (this.totalElapsed >= state.startTime) {
        const rawT = (this.totalElapsed - state.startTime) / state.duration;
        if (rawT < 1) {
          hasActiveAnimation = true;
          const t = Math.max(0, Math.min(1, rawT));
          const easedT = 1 - Math.pow(1 - t, 3);
          state.currentHeight = state.targetHeight * easedT;
        } else {
          state.currentHeight = state.targetHeight;
        }
      }
    }

    if (hasActiveAnimation || this.buildingsNeedsUpdate()) {
      this.updateBuildingMatrices();
    }

    this.updateCamera(delta);
  }

  private buildingsNeedsUpdate(): boolean {
    for (const state of this.animationStates) {
      if (state.currentHeight !== state.targetHeight) {
        return true;
      }
    }
    return false;
  }

  private updateCamera(delta: number): void {
    if (this.isCameraTransitioning) {
      this.cameraLerpAlpha += delta / this.cameraLerpDuration;
      if (this.cameraLerpAlpha >= 1) {
        this.cameraLerpAlpha = 1;
        this.isCameraTransitioning = false;
      }

      const t = this.cameraLerpAlpha;
      this.currentTheta = this.lerpAngle(this.startTheta, this.targetTheta, t);
      this.currentPhi = this.lerpAngle(this.startPhi, this.targetPhi, t);
      this.currentRadius = this.startRadius + (this.targetRadius - this.startRadius) * t;
    } else if (!this.isDragging) {
      const lerpFactor = Math.min(1, delta / 0.1);
      this.currentTheta += (this.targetTheta - this.currentTheta) * lerpFactor;
      this.currentPhi += (this.targetPhi - this.currentPhi) * lerpFactor;
      this.currentRadius += (this.targetRadius - this.currentRadius) * lerpFactor;
    } else {
      this.currentTheta = this.targetTheta;
      this.currentPhi = this.targetPhi;
      this.currentRadius = this.targetRadius;
    }

    this.updateCameraPositionImmediate();
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private updateCameraPositionImmediate(): void {
    const sinPhi = Math.sin(this.currentPhi);
    const x = this.cityCenter.x + this.currentRadius * sinPhi * Math.cos(this.currentTheta);
    const y = this.cityCenter.y + this.currentRadius * Math.cos(this.currentPhi);
    const z = this.cityCenter.z + this.currentRadius * sinPhi * Math.sin(this.currentTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cityCenter);
  }

  public dispose(): void {
    const domElement = this.renderer.domElement;
    domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    domElement.removeEventListener('wheel', this.onWheel.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));

    if (this.buildingsMesh) {
      this.scene.remove(this.buildingsMesh);
      this.buildingsMesh.geometry.dispose();
      if (Array.isArray(this.buildingsMesh.material)) {
        this.buildingsMesh.material.forEach((m) => m.dispose());
      } else {
        this.buildingsMesh.material.dispose();
      }
    }
  }
}
