import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneBuilder, type Exhibit } from './sceneBuilder';
import { Recorder } from './recorder';
import { InteractionManager } from './interaction';
import { UIManager, type CameraMarkerData } from './ui';

interface CameraMarker {
  id: string;
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  markerMesh: THREE.Mesh;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private sceneBuilder: SceneBuilder;
  private recorder: Recorder;
  private interactionManager: InteractionManager;
  private uiManager: UIManager;

  private markers: CameraMarker[] = [];
  private maxMarkers: number = 6;
  private markerGroup: THREE.Group;

  private keys: { [key: string]: boolean } = {};
  private moveSpeed: number = 4;
  private smoothTime: number = 0.3;
  private targetMovePosition: THREE.Vector3;
  private cameraHeight: number = 1.6;

  private isFlying: boolean = false;
  private flyProgress: number = 0;
  private flyStartPosition: THREE.Vector3 = new THREE.Vector3();
  private flyStartTarget: THREE.Vector3 = new THREE.Vector3();
  private flyEndPosition: THREE.Vector3 = new THREE.Vector3();
  private flyEndTarget: THREE.Vector3 = new THREE.Vector3();
  private flyDuration: number = 0.6;

  private exhibits: Exhibit[] = [];

  constructor() {
    this.uiManager = new UIManager();

    const canvas = this.uiManager.getCanvas();
    const container = this.uiManager.getCanvasContainer();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 8);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 0.3 * 5;
    this.controls.maxDistance = 3 * 5;
    this.controls.target.set(0, 1.5, 0);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;

    this.targetMovePosition = new THREE.Vector3(0, 1.5, 0);

    this.clock = new THREE.Clock();
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);

    this.sceneBuilder = new SceneBuilder(this.scene);
    this.exhibits = this.sceneBuilder.build();

    this.recorder = new Recorder(canvas);

    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      container
    );
    this.interactionManager.setExhibits(this.exhibits);

    this.bindEvents();
    this.setupUIActions();
    this.uiManager.hideLoadingLogo();

    this.animate();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.interactionManager.handleMouseMove(e);
    });
  }

  private setupUIActions(): void {
    this.uiManager.setOnRecordClick(() => {
      if (this.recorder.getRecording()) {
        this.recorder.stop();
      } else {
        const started = this.recorder.start();
        if (started) {
          this.uiManager.updateRecordButton(true);
        }
      }
    });

    this.recorder.setOnTimeUpdate((time) => {
      this.uiManager.updateTimer(time);
    });

    this.recorder.setOnStop((url) => {
      this.uiManager.updateRecordButton(false);
      this.uiManager.showExportDialog(url);
    });

    this.uiManager.setOnDownloadClick(() => {
      this.recorder.download();
    });

    this.uiManager.setOnAddCameraClick(() => {
      this.addCameraMarker();
    });

    this.uiManager.setOnMarkerClick((id) => {
      this.flyToMarker(id);
    });

    this.uiManager.setOnMarkerDelete((id) => {
      this.deleteMarker(id);
    });

    this.uiManager.setOnMarkerReorder((fromIndex, toIndex) => {
      this.reorderMarkers(fromIndex, toIndex);
    });
  }

  private addCameraMarker(): void {
    if (this.markers.length >= this.maxMarkers) return;

    const id = `marker_${Date.now()}`;
    const index = this.markers.length + 1;
    const name = `视角 ${index}`;

    const position = this.camera.position.clone();
    const target = this.controls.target.clone();

    const markerGeometry = new THREE.ConeGeometry(0.15, 0.3, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.7
    });
    const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

    const markerPosition = new THREE.Vector3(
      position.x,
      0.15,
      position.z
    );
    markerMesh.position.copy(markerPosition);
    markerMesh.rotation.x = Math.PI;
    markerMesh.name = id;

    this.markerGroup.add(markerMesh);

    const marker: CameraMarker = {
      id,
      name,
      position,
      target,
      markerMesh
    };

    this.markers.push(marker);
    this.updateMarkerListUI();
  }

  private deleteMarker(id: string): void {
    const index = this.markers.findIndex(m => m.id === id);
    if (index === -1) return;

    const marker = this.markers[index];
    this.markerGroup.remove(marker.markerMesh);
    marker.markerMesh.geometry.dispose();
    (marker.markerMesh.material as THREE.Material).dispose();

    this.markers.splice(index, 1);

    this.markers.forEach((m, i) => {
      m.name = `视角 ${i + 1}`;
    });

    this.updateMarkerListUI();
  }

  private reorderMarkers(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.markers.length) return;
    if (toIndex < 0 || toIndex >= this.markers.length) return;

    const [removed] = this.markers.splice(fromIndex, 1);
    this.markers.splice(toIndex, 0, removed);

    this.markers.forEach((m, i) => {
      m.name = `视角 ${i + 1}`;
    });

    this.updateMarkerListUI();
  }

  private updateMarkerListUI(): void {
    const markerData: CameraMarkerData[] = this.markers.map((m, i) => ({
      id: m.id,
      name: m.name,
      index: i
    }));
    this.uiManager.updateCameraMarkers(markerData);
  }

  private flyToMarker(id: string): void {
    const marker = this.markers.find(m => m.id === id);
    if (!marker || this.isFlying) return;

    this.isFlying = true;
    this.flyProgress = 0;
    this.flyStartPosition.copy(this.camera.position);
    this.flyStartTarget.copy(this.controls.target);
    this.flyEndPosition.copy(marker.position);
    this.flyEndTarget.copy(marker.target);

    this.controls.enabled = false;
  }

  private updateFly(delta: number): void {
    if (!this.isFlying) return;

    this.flyProgress += delta / this.flyDuration;

    if (this.flyProgress >= 1) {
      this.flyProgress = 1;
      this.isFlying = false;
      this.controls.enabled = true;
      this.camera.position.copy(this.flyEndPosition);
      this.controls.target.copy(this.flyEndTarget);
      this.targetMovePosition.copy(this.flyEndTarget);
      return;
    }

    const t = this.easeInOutCubic(this.flyProgress);

    this.camera.position.lerpVectors(
      this.flyStartPosition,
      this.flyEndPosition,
      t
    );
    this.controls.target.lerpVectors(
      this.flyStartTarget,
      this.flyEndTarget,
      t
    );
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateMovement(delta: number): void {
    if (this.isFlying) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) {
      moveZ += 1;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      moveZ -= 1;
    }
    if (this.keys['a'] || this.keys['arrowleft']) {
      moveX -= 1;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      moveX += 1;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(forward, moveZ);
      moveDir.addScaledVector(right, moveX);
      moveDir.normalize();

      this.targetMovePosition.addScaledVector(moveDir, this.moveSpeed * delta);

      this.targetMovePosition.x = Math.max(-14, Math.min(14, this.targetMovePosition.x));
      this.targetMovePosition.z = Math.max(-14, Math.min(14, this.targetMovePosition.z));
    }

    const smoothFactor = 1 - Math.exp(-delta / this.smoothTime);
    this.controls.target.lerp(this.targetMovePosition, smoothFactor);
  }

  private updateMarkers(delta: number): void {
    this.markers.forEach(marker => {
      const baseY = 0.15;
      const offset = Math.sin(this.clock.elapsedTime * 2 + marker.position.x) * 0.05;
      marker.markerMesh.position.y = baseY + offset;
      marker.markerMesh.rotation.z += delta * 0.5;
    });
  }

  private onResize(): void {
    const container = this.uiManager.getCanvasContainer();
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updateMovement(delta);
    this.updateFly(delta);
    this.updateMarkers(delta);
    this.controls.update();
    this.interactionManager.updateLabelPositions();
    this.interactionManager.updateGlow(delta);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.recorder.dispose();
    this.interactionManager.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();

(window as any).app = app;
