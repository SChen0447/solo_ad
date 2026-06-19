import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GeologyData, GeologyLayer, GeologyFault } from '../data/GeologyInterfaces';

const DEPTH_SCALE = 0.35;
const LAYER_GAP = 0.25;
const FAULT_COLOR = 0xFF4444;
const FAULT_OPACITY = 0.5;
const LAYER_OPACITY = 0.75;
const HIGHLIGHT_COLOR = 0xFFEB3B;
const HIGHLIGHT_INTERVAL = 0.6;

interface LayerMeshInfo {
  layer: GeologyLayer;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  originalEdgeColor: THREE.Color;
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private layerMeshes: LayerMeshInfo[] = [];
  private highlightedInfo: LayerMeshInfo | null = null;
  private highlightTimer = 0;
  private highlightState = false;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private onLayerClickCallback: ((layer: GeologyLayer, screenPos: { x: number; y: number }) => void) | null = null;
  private data: GeologyData | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A1A2E);
    this.scene.fog = new THREE.Fog(0x1A1A2E, 25, 70);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    this.setCameraDefaultPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.6;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, -6, 0);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupGroundGrid();
    this.setupEvents();
  }

  private setCameraDefaultPosition(): void {
    const r = 15;
    const theta = Math.PI / 4;
    const phi = Math.PI / 4;
    this.camera.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) + 4,
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  resetCamera(onComplete?: () => void): {
    startPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endPos: THREE.Vector3;
    endTarget: THREE.Vector3;
  } {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    const r = 15;
    const theta = Math.PI / 4;
    const phi = Math.PI / 4;
    const endPos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) + 4,
      r * Math.sin(phi) * Math.sin(theta)
    );
    const endTarget = new THREE.Vector3(0, -6, 0);

    if (onComplete) {
      setTimeout(onComplete, 1000);
    }

    return { startPos, startTarget, endPos, endTarget };
  }

  applyCameraState(pos: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(pos);
    this.controls.target.copy(target);
    this.controls.update();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dir1.position.set(10, 20, 8);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x8899FF, 0.3);
    dir2.position.set(-8, 12, -10);
    this.scene.add(dir2);
  }

  private setupGroundGrid(): void {
    const radius = 18;
    const segments = 64;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0.02, Math.sin(theta) * radius));
    }
    const ringGeom = new THREE.BufferGeometry().setFromPoints(points);
    const ringMat = new THREE.LineBasicMaterial({ color: 0x4A5068, transparent: true, opacity: 0.5 });
    this.scene.add(new THREE.Line(ringGeom, ringMat));

    const innerRing = new THREE.RingGeometry(8, 8.05, 64);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x4A5068, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const innerMesh = new THREE.Mesh(innerRing, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.01;
    this.scene.add(innerMesh);

    const crossPts1 = [
      new THREE.Vector3(-radius, 0.02, 0),
      new THREE.Vector3(radius, 0.02, 0)
    ];
    const crossPts2 = [
      new THREE.Vector3(0, 0.02, -radius),
      new THREE.Vector3(0, 0.02, radius)
    ];
    const crossMat = new THREE.LineBasicMaterial({ color: 0x4A5068, transparent: true, opacity: 0.35 });
    this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(crossPts1), crossMat));
    this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(crossPts2), crossMat));
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private pointerDownPos = { x: 0, y: 0, time: 0 };

  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY, time: performance.now() };
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const dx = Math.abs(e.clientX - this.pointerDownPos.x);
    const dy = Math.abs(e.clientY - this.pointerDownPos.y);
    const dt = performance.now() - this.pointerDownPos.time;
    if (dx < 5 && dy < 5 && dt < 400) {
      this.handleClick(e);
    }
  };

  private handleClick = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const meshes = this.layerMeshes.map(lm => lm.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const info = this.layerMeshes.find(lm => lm.mesh === hitMesh);
      if (info) {
        this.setHighlighted(info);
        if (this.onLayerClickCallback) {
          this.onLayerClickCallback(info.layer, { x: e.clientX, y: e.clientY });
        }
      }
    }
  };

  setOnLayerClick(cb: (layer: GeologyLayer, screenPos: { x: number; y: number }) => void): void {
    this.onLayerClickCallback = cb;
  }

  private setHighlighted(info: LayerMeshInfo | null): void {
    if (this.highlightedInfo && this.highlightedInfo !== info) {
      (this.highlightedInfo.edges.material as THREE.LineBasicMaterial).color.copy(this.highlightedInfo.originalEdgeColor);
      (this.highlightedInfo.edges.material as THREE.LineBasicMaterial).opacity = 0.9;
    }
    this.highlightedInfo = info;
    this.highlightTimer = 0;
    this.highlightState = false;
  }

  clearHighlight(): void {
    this.setHighlighted(null);
  }

  buildFromData(data: GeologyData): void {
    this.clearGeology();
    this.data = data;

    const size = data.groundSize;

    data.layers.forEach((layer) => {
      this.createLayerMesh(layer, size);
    });

    data.faults.forEach((fault) => {
      this.createFaultMesh(fault, size);
    });
  }

  private clearGeology(): void {
    this.layerMeshes.forEach(lm => {
      this.scene.remove(lm.mesh);
      this.scene.remove(lm.edges);
      lm.mesh.geometry.dispose();
      (lm.mesh.material as THREE.Material).dispose();
      lm.edges.geometry.dispose();
      (lm.edges.material as THREE.Material).dispose();
    });
    this.layerMeshes = [];
    this.highlightedInfo = null;

    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (obj.userData.isFault || obj.userData.isCrossSection) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach(obj => {
      this.scene.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) mat.dispose();
    });
  }

  private createLayerMesh(layer: GeologyLayer, size: number): void {
    const topY = -layer.topDepth * DEPTH_SCALE;
    const bottomY = -layer.bottomDepth * DEPTH_SCALE;
    const height = Math.abs(bottomY - topY) - LAYER_GAP;
    const centerY = (topY + bottomY) / 2 + LAYER_GAP / 2;

    const geom = new THREE.BoxGeometry(size, Math.max(height, 0.1), size, 1, 1, 1);
    const color = new THREE.Color(layer.color);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: LAYER_OPACITY,
      side: THREE.DoubleSide,
      shininess: 15,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, centerY, 0);
    mesh.userData.layerId = layer.id;
    this.scene.add(mesh);

    const edgeGeom = new THREE.EdgesGeometry(geom);
    const edgeColor = color.clone().multiplyScalar(0.55);
    const edgeMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.9
    });
    const edges = new THREE.LineSegments(edgeGeom, edgeMat);
    edges.position.copy(mesh.position);
    this.scene.add(edges);

    this.layerMeshes.push({
      layer,
      mesh,
      edges,
      originalEdgeColor: edgeColor.clone()
    });
  }

  private createFaultMesh(fault: GeologyFault, _size: number): void {
    const pts = fault.strikePoints;
    if (pts.length < 2) return;

    const topY = -fault.topDepth * DEPTH_SCALE;
    const bottomY = -fault.bottomDepth * DEPTH_SCALE;
    const midY = (topY + bottomY) / 2;
    const planeHeight = Math.abs(bottomY - topY) * 0.92;

    const dirX = pts[pts.length - 1].x - pts[0].x;
    const dirZ = pts[pts.length - 1].z - pts[0].z;
    const strikeLen = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (strikeLen < 0.001) return;

    const strikeAngle = Math.atan2(dirZ, dirX);
    const dipRad = (fault.dip * Math.PI) / 180;

    const planeWidth = strikeLen * 1.15;
    const planeGeom = new THREE.PlaneGeometry(planeWidth, planeHeight, Math.max(4, Math.floor(planeWidth)), 4);
    const planeMat = new THREE.MeshPhongMaterial({
      color: FAULT_COLOR,
      transparent: true,
      opacity: FAULT_OPACITY,
      side: THREE.DoubleSide,
      shininess: 20
    });
    const mesh = new THREE.Mesh(planeGeom, planeMat);
    mesh.userData.isFault = true;

    mesh.position.set(
      (pts[0].x + pts[pts.length - 1].x) / 2,
      midY,
      (pts[0].z + pts[pts.length - 1].z) / 2
    );

    const mx = new THREE.Matrix4().makeRotationY(-strikeAngle);
    const mz = new THREE.Matrix4().makeRotationZ(-dipRad);
    const mBack = new THREE.Matrix4().makeRotationY(strikeAngle);
    mesh.applyMatrix4(mx);
    mesh.applyMatrix4(mz);
    mesh.applyMatrix4(mBack);

    this.scene.add(mesh);

    const edgeGeom = new THREE.EdgesGeometry(planeGeom);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xFF7777,
      transparent: true,
      opacity: 0.7
    });
    const edges = new THREE.LineSegments(edgeGeom, edgeMat);
    edges.position.copy(mesh.position);
    edges.applyMatrix4(mx);
    edges.applyMatrix4(mz);
    edges.applyMatrix4(mBack);
    edges.userData.isFault = true;
    this.scene.add(edges);
  }

  addCrossSectionPlane(depth: number): THREE.Mesh {
    if (!this.data) throw new Error('数据尚未加载');
    this.removeCrossSectionPlane();

    const size = this.data.groundSize * 1.25;
    const y = -depth * DEPTH_SCALE;
    const geom = new THREE.PlaneGeometry(size, size, 1, 1);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xD0D0D8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geom, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, y, 0);
    plane.userData.isCrossSection = true;
    this.scene.add(plane);

    const frameGeom = new THREE.EdgesGeometry(geom);
    const frameMat = new THREE.LineBasicMaterial({
      color: 0x4A90D9,
      transparent: true,
      opacity: 0.85
    });
    const frame = new THREE.LineSegments(frameGeom, frameMat);
    frame.rotation.x = -Math.PI / 2;
    frame.position.set(0, y + 0.003, 0);
    frame.userData.isCrossSection = true;
    this.scene.add(frame);

    return plane;
  }

  removeCrossSectionPlane(): void {
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (obj.userData.isCrossSection) toRemove.push(obj);
    });
    toRemove.forEach(obj => {
      this.scene.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) mat.dispose();
    });
  }

  getLayerMeshes(): LayerMeshInfo[] {
    return this.layerMeshes;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  start(): void {
    const loop = (): void => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.controls.update();
      this.updateHighlight(dt);
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateHighlight(dt: number): void {
    if (!this.highlightedInfo) return;
    this.highlightTimer += dt;
    if (this.highlightTimer >= HIGHLIGHT_INTERVAL) {
      this.highlightTimer = 0;
      this.highlightState = !this.highlightState;
      const mat = this.highlightedInfo.edges.material as THREE.LineBasicMaterial;
      const color = new THREE.Color(HIGHLIGHT_COLOR);
      mat.color.copy(color);
      mat.opacity = this.highlightState ? 1.0 : 0.3;
      mat.needsUpdate = true;
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.clearGeology();
    this.removeCrossSectionPlane();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
