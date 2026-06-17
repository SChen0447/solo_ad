import * as THREE from 'three';
import type { ScalarDataset, VectorDataset } from '../types';
import { trilinearInterpolateScalar, trilinearInterpolateVector, isInBounds, clamp } from '../utils/interpolation';

export interface ProbeData {
  position: [number, number, number];
  temperature: number | null;
  velocity: [number, number, number] | null;
  pressure: number | null;
}

export class ProbeTool {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private probeMesh: THREE.Mesh;
  private probeGroup: THREE.Group;
  private raycaster: THREE.Raycaster;
  private temperatureData: ScalarDataset | null = null;
  private velocityData: VectorDataset | null = null;
  private pressureData: ScalarDataset | null = null;
  private isDragging: boolean = false;
  private enabled: boolean = true;
  private visible: boolean = true;
  private probeData: ProbeData | null = null;
  private boundsMesh: THREE.Mesh;

  private onProbeUpdate: ((data: ProbeData | null) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();

    this.probeGroup = new THREE.Group();
    this.scene.add(this.probeGroup);

    const probeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const probeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    this.probeMesh = new THREE.Mesh(probeGeometry, probeMaterial);
    this.probeMesh.visible = false;
    this.probeGroup.add(this.probeMesh);

    const boundsGeometry = new THREE.BoxGeometry(10, 10, 10);
    const boundsMaterial = new THREE.MeshBasicMaterial({
      color: 0x4c9aff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.boundsMesh = new THREE.Mesh(boundsGeometry, boundsMaterial);
    this.boundsMesh.position.set(0, 0, 0);
    this.boundsMesh.visible = false;
    this.probeGroup.add(this.boundsMesh);

    this.setupEventListeners();
  }

  setOnProbeUpdate(callback: (data: ProbeData | null) => void): void {
    this.onProbeUpdate = callback;
  }

  setTemperatureData(data: ScalarDataset): void {
    this.temperatureData = data;
    this.updateBoundsMesh(data);
  }

  setVelocityData(data: VectorDataset): void {
    this.velocityData = data;
    this.updateBoundsMesh(data);
  }

  setPressureData(data: ScalarDataset): void {
    this.pressureData = data;
    this.updateBoundsMesh(data);
  }

  private updateBoundsMesh(data: { bounds: { min: [number, number, number]; max: [number, number, number] } }): void {
    const width = data.bounds.max[0] - data.bounds.min[0];
    const height = data.bounds.max[1] - data.bounds.min[1];
    const depth = data.bounds.max[2] - data.bounds.min[2];
    const centerX = (data.bounds.min[0] + data.bounds.max[0]) / 2;
    const centerY = (data.bounds.min[1] + data.bounds.max[1]) / 2;
    const centerZ = (data.bounds.min[2] + data.bounds.max[2]) / 2;

    this.boundsMesh.geometry.dispose();
    this.boundsMesh.geometry = new THREE.BoxGeometry(width, height, depth);
    this.boundsMesh.position.set(centerX, centerY, centerZ);
    this.boundsMesh.visible = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.probeMesh.visible = false;
      this.probeData = null;
      if (this.onProbeUpdate) this.onProbeUpdate(null);
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.probeMesh.visible = visible && this.enabled && this.probeData !== null;
    if (!visible && this.onProbeUpdate) {
      this.onProbeUpdate(null);
    }
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.enabled) {
        this.isDragging = true;
        this.handleMouseMove(e);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.enabled) {
        this.handleMouseMove(e);
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.enabled || !this.visible) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const intersects = this.raycaster.intersectObject(this.boundsMesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.updateProbe(point);
    }
  }

  private updateProbe(point: THREE.Vector3): void {
    const startTime = performance.now();

    const pos: [number, number, number] = [point.x, point.y, point.z];

    let temperature: number | null = null;
    let velocity: [number, number, number] | null = null;
    let pressure: number | null = null;

    if (this.temperatureData && isInBounds(pos, this.temperatureData.bounds)) {
      temperature = trilinearInterpolateScalar(pos, this.temperatureData);
    }

    if (this.velocityData && isInBounds(pos, this.velocityData.bounds)) {
      velocity = trilinearInterpolateVector(pos, this.velocityData);
    }

    if (this.pressureData && isInBounds(pos, this.pressureData.bounds)) {
      pressure = trilinearInterpolateScalar(pos, this.pressureData);
    }

    this.probeData = { position: pos, temperature, velocity, pressure };

    this.probeMesh.position.copy(point);
    this.probeMesh.visible = true;

    const elapsed = performance.now() - startTime;
    if (elapsed > 15) {
      console.warn(`Probe interpolation took ${elapsed.toFixed(2)}ms, exceeds 15ms target`);
    }

    if (this.onProbeUpdate && this.visible) {
      this.onProbeUpdate(this.probeData);
    }
  }

  update(): void {
  }
}
