import * as THREE from 'three';
import { TerrainManager, SamplePoint } from './terrainManager';

export class ProfileController {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private terrain: TerrainManager;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private isDrawing: boolean = false;
  private ctrlPressed: boolean = false;
  private currentPoints: THREE.Vector3[] = [];
  private previewLine: THREE.Line | null = null;
  private fixedLine: THREE.Line | null = null;
  private fixedPoints: THREE.Vector3[] = [];
  private onProfileComplete: ((samples: SamplePoint[]) => void) | null = null;
  private minPointDistance: number = 0.2;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    terrain: TerrainManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.terrain = terrain;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindEvents();
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Control' || e.key === 'Ctrl') {
        this.ctrlPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Control' || e.key === 'Ctrl') {
        this.ctrlPressed = false;
      }
    });

    dom.addEventListener('mousedown', (e) => {
      if (this.ctrlPressed && e.button === 0) {
        this.startDrawing(e);
      }
    });

    dom.addEventListener('mousemove', (e) => {
      if (this.isDrawing) {
        this.updateDrawing(e);
      }
    });

    dom.addEventListener('mouseup', (e) => {
      if (this.isDrawing && e.button === 0) {
        this.finishDrawing();
      }
    });

    dom.addEventListener('mouseleave', () => {
      if (this.isDrawing) {
        this.finishDrawing();
      }
    });
  }

  private getIntersection(e: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh, false);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  private startDrawing(e: MouseEvent) {
    const point = this.getIntersection(e);
    if (!point) return;

    this.isDrawing = true;
    this.currentPoints = [point];
    this.clearFixedLine();
    this.createPreviewLine();
  }

  private updateDrawing(e: MouseEvent) {
    const point = this.getIntersection(e);
    if (!point) return;

    const lastPoint = this.currentPoints[this.currentPoints.length - 1];
    if (lastPoint.distanceTo(point) >= this.minPointDistance) {
      this.currentPoints.push(point);
      this.updatePreviewLine();
    }
  }

  private finishDrawing() {
    if (this.currentPoints.length < 2) {
      this.clearPreviewLine();
      this.currentPoints = [];
      this.isDrawing = false;
      return;
    }

    this.isDrawing = false;
    this.fixedPoints = [...this.currentPoints];
    this.currentPoints = [];
    this.createFixedLine();
    this.clearPreviewLine();
    this.emitProfile();
  }

  private createPreviewLine() {
    this.clearPreviewLine();
    const material = new THREE.LineBasicMaterial({
      color: 0xff2244,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    const positions = new Float32Array(this.currentPoints.length * 3);
    this.currentPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.1;
      positions[i * 3 + 2] = p.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.previewLine = new THREE.Line(geometry, material);
    this.scene.add(this.previewLine);
  }

  private updatePreviewLine() {
    if (!this.previewLine) return;
    const positions = new Float32Array(this.currentPoints.length * 3);
    this.currentPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.1;
      positions[i * 3 + 2] = p.z;
    });
    (this.previewLine.geometry as THREE.BufferGeometry).setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    (this.previewLine.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
  }

  private clearPreviewLine() {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
  }

  private createFixedLine() {
    this.clearFixedLine();
    const material = new THREE.LineBasicMaterial({
      color: 0xff4466,
      linewidth: 2
    });
    const positions = new Float32Array(this.fixedPoints.length * 3);
    this.fixedPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.08;
      positions[i * 3 + 2] = p.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fixedLine = new THREE.Line(geometry, material);
    this.scene.add(this.fixedLine);
  }

  private clearFixedLine() {
    if (this.fixedLine) {
      this.scene.remove(this.fixedLine);
      this.fixedLine.geometry.dispose();
      (this.fixedLine.material as THREE.Material).dispose();
      this.fixedLine = null;
    }
    this.fixedPoints = [];
  }

  private emitProfile() {
    if (this.fixedPoints.length >= 2 && this.onProfileComplete) {
      const samples = this.terrain.sampleProfile(this.fixedPoints, 0.5);
      this.onProfileComplete(samples);
    }
  }

  public setOnProfileComplete(callback: (samples: SamplePoint[]) => void) {
    this.onProfileComplete = callback;
  }

  public clearProfile() {
    this.clearFixedLine();
    this.clearPreviewLine();
    this.currentPoints = [];
    this.fixedPoints = [];
  }

  public hasProfile(): boolean {
    return this.fixedPoints.length >= 2;
  }

  public resample(): SamplePoint[] {
    if (this.fixedPoints.length < 2) return [];
    return this.terrain.sampleProfile(this.fixedPoints, 0.5);
  }

  public getFixedPoints(): THREE.Vector3[] {
    return this.fixedPoints;
  }
}
