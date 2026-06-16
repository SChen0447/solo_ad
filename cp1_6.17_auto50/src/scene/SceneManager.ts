import * as THREE from 'three';
import { GeometryManager, GeometryType, GeometryEntry } from '../geometry/GeometryManager';
import { BooleanEngine, BooleanMode } from '../engine/BooleanEngine';

interface HistoryEntry {
  selectedA: string | null;
  selectedB: string | null;
  mode: BooleanMode;
  resultMesh: THREE.Mesh | null;
}

export class SceneManager {
  private scene: THREE.Scene;
  private geometryManager: GeometryManager;
  private booleanEngine: BooleanEngine;
  private resultMesh: THREE.Mesh | null = null;
  private resultGroup: THREE.Group;
  private selectedA: string | null = null;
  private selectedB: string | null = null;
  private booleanMode: BooleanMode = 'union';
  private history: HistoryEntry[] = [];
  private maxHistory = 5;
  private ambientLight: THREE.AmbientLight;
  private glowLight: THREE.PointLight | null = null;
  private animating = false;
  private animStartTime = 0;
  private animDuration = 600;
  private onUpdateCallback: (() => void) | null = null;
  private pulseActive = false;
  private pulseStartTime = 0;
  private pulseDuration = 400;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometryManager = new GeometryManager();
    this.booleanEngine = new BooleanEngine();
    this.resultGroup = new THREE.Group();
    this.scene.add(this.resultGroup);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
  }

  setOnUpdate(cb: () => void): void {
    this.onUpdateCallback = cb;
  }

  addGeometry(type: GeometryType, position?: THREE.Vector3, size?: number): GeometryEntry {
    const entry = this.geometryManager.addGeometry(type, position, size);
    this.scene.add(entry.mesh);
    this.autoSelectPair();
    this.updateMaterialStyles();
    this.triggerUpdate();
    return entry;
  }

  removeGeometry(id: string): void {
    const entry = this.geometryManager.getEntry(id);
    if (!entry) return;
    this.scene.remove(entry.mesh);
    this.geometryManager.removeGeometry(id);
    if (this.selectedA === id) this.selectedA = null;
    if (this.selectedB === id) this.selectedB = null;
    this.autoSelectPair();
    this.updateMaterialStyles();
    this.triggerUpdate();
  }

  updateGeometryPosition(id: string, x: number, y: number, z: number): void {
    this.geometryManager.updatePosition(id, x, y, z);
    if (id === this.selectedA || id === this.selectedB) {
      this.executeBoolean();
    }
    this.triggerUpdate();
  }

  updateGeometrySize(id: string, size: number): void {
    this.geometryManager.updateSize(id, size);
    if (id === this.selectedA || id === this.selectedB) {
      this.executeBoolean();
    }
    this.triggerUpdate();
  }

  setSelectedA(id: string | null): void {
    this.selectedA = id;
    this.updateMaterialStyles();
    this.executeBoolean();
    this.triggerUpdate();
  }

  setSelectedB(id: string | null): void {
    this.selectedB = id;
    this.updateMaterialStyles();
    this.executeBoolean();
    this.triggerUpdate();
  }

  getSelectedA(): string | null {
    return this.selectedA;
  }

  getSelectedB(): string | null {
    return this.selectedB;
  }

  setBooleanMode(mode: BooleanMode): void {
    this.booleanMode = mode;
    this.executeBoolean();
    this.triggerUpdate();
  }

  getBooleanMode(): BooleanMode {
    return this.booleanMode;
  }

  getAllEntries(): GeometryEntry[] {
    return this.geometryManager.getAllEntries();
  }

  getEntry(id: string): GeometryEntry | undefined {
    return this.geometryManager.getEntry(id);
  }

  showGlow(position: THREE.Vector3): void {
    if (this.glowLight) {
      this.glowLight.position.copy(position);
      return;
    }
    this.glowLight = new THREE.PointLight(0xffffff, 2.0, 10);
    this.glowLight.position.copy(position);
    this.scene.add(this.glowLight);
  }

  hideGlow(): void {
    if (this.glowLight) {
      this.scene.remove(this.glowLight);
      this.glowLight.dispose();
      this.glowLight = null;
    }
  }

  undoLastOperation(): boolean {
    if (this.history.length === 0) return false;
    const last = this.history.pop()!;
    this.clearResultMesh();
    this.selectedA = last.selectedA;
    this.selectedB = last.selectedB;
    this.booleanMode = last.mode;
    this.updateMaterialStyles();
    this.triggerUpdate();
    return true;
  }

  getHistoryCount(): number {
    return this.history.length;
  }

  exportResultAsOBJ(): string | null {
    if (!this.resultMesh) return null;
    const geometry = this.resultMesh.geometry;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const index = geometry.getIndex();

    let output = '# Boolean CSG Result\n';
    output += `# Vertices: ${position.count}\n\n`;

    for (let i = 0; i < position.count; i++) {
      output += `v ${position.getX(i)} ${position.getY(i)} ${position.getZ(i)}\n`;
    }
    output += '\n';

    if (normal) {
      for (let i = 0; i < normal.count; i++) {
        output += `vn ${normal.getX(i)} ${normal.getY(i)} ${normal.getZ(i)}\n`;
      }
      output += '\n';
    }

    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        output += `vt ${uv.getX(i)} ${uv.getY(i)}\n`;
      }
      output += '\n';
    }

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i) + 1;
        const b = index.getX(i + 1) + 1;
        const c = index.getX(i + 2) + 1;
        if (normal && uv) {
          output += `f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}\n`;
        } else if (normal) {
          output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
        } else {
          output += `f ${a} ${b} ${c}\n`;
        }
      }
    } else {
      for (let i = 0; i < position.count; i += 3) {
        const a = i + 1;
        const b = i + 2;
        const c = i + 3;
        if (normal) {
          output += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
        } else {
          output += `f ${a} ${b} ${c}\n`;
        }
      }
    }

    return output;
  }

  hasResult(): boolean {
    return this.resultMesh !== null;
  }

  updateAnimation(delta: number): void {
    if (this.animating && this.resultMesh) {
      const elapsed = performance.now() - this.animStartTime;
      const t = Math.min(elapsed / this.animDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.resultMesh.scale.setScalar(eased);
      if (t >= 1) {
        this.animating = false;
        this.resultMesh.scale.setScalar(1);
      }
    }

    if (this.pulseActive) {
      const elapsed = performance.now() - this.pulseStartTime;
      const t = Math.min(elapsed / this.pulseDuration, 1);
      if (t < 0.3) {
        this.ambientLight.intensity = 0.5 + (1.5 - 0.5) * (t / 0.3);
      } else {
        this.ambientLight.intensity = 1.5 - (1.5 - 0.5) * ((t - 0.3) / 0.7);
      }
      if (t >= 1) {
        this.pulseActive = false;
        this.ambientLight.intensity = 0.5;
      }
    }
  }

  private executeBoolean(): void {
    if (!this.selectedA || !this.selectedB) {
      this.clearResultMesh();
      return;
    }

    const entryA = this.geometryManager.getEntry(this.selectedA);
    const entryB = this.geometryManager.getEntry(this.selectedB);
    if (!entryA || !entryB) {
      this.clearResultMesh();
      return;
    }

    entryA.mesh.updateMatrixWorld(true);
    entryB.mesh.updateMatrixWorld(true);

    const resultGeo = this.booleanEngine.evaluate(
      entryA.mesh.geometry,
      entryA.mesh.matrixWorld,
      entryB.mesh.geometry,
      entryB.mesh.matrixWorld,
      this.booleanMode
    );

    if (!resultGeo) {
      this.clearResultMesh();
      return;
    }

    this.saveHistory();

    this.clearResultMesh();

    const resultMaterial = new THREE.MeshPhongMaterial({
      color: 0xff8800,
      shininess: 30,
      side: THREE.DoubleSide,
    });

    this.resultMesh = new THREE.Mesh(resultGeo, resultMaterial);
    this.resultMesh.scale.setScalar(0);
    this.resultGroup.add(this.resultMesh);

    this.animating = true;
    this.animStartTime = performance.now();
    this.pulseActive = true;
    this.pulseStartTime = performance.now();
  }

  private clearResultMesh(): void {
    if (this.resultMesh) {
      this.resultGroup.remove(this.resultMesh);
      this.resultMesh.geometry.dispose();
      (this.resultMesh.material as THREE.Material).dispose();
      this.resultMesh = null;
    }
  }

  private saveHistory(): void {
    this.history.push({
      selectedA: this.selectedA,
      selectedB: this.selectedB,
      mode: this.booleanMode,
      resultMesh: null,
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  private autoSelectPair(): void {
    const entries = this.geometryManager.getAllEntries();
    if (entries.length < 2) {
      this.selectedA = entries.length > 0 ? entries[0].id : null;
      this.selectedB = null;
      return;
    }
    if (!this.selectedA || !this.geometryManager.getEntry(this.selectedA)) {
      this.selectedA = entries[0].id;
    }
    if (!this.selectedB || !this.geometryManager.getEntry(this.selectedB) || this.selectedB === this.selectedA) {
      this.selectedB = entries[1].id === this.selectedA && entries.length > 2
        ? entries[2].id
        : entries.find(e => e.id !== this.selectedA)?.id || null;
    }
  }

  private updateMaterialStyles(): void {
    const entries = this.geometryManager.getAllEntries();
    for (const entry of entries) {
      if (entry.id === this.selectedA || entry.id === this.selectedB) {
        this.geometryManager.setMaterialStyle(entry.id, 'selected');
      } else {
        this.geometryManager.setMaterialStyle(entry.id, 'unselected');
      }
    }
  }

  private triggerUpdate(): void {
    if (this.onUpdateCallback) this.onUpdateCallback();
  }

  dispose(): void {
    this.clearResultMesh();
    this.geometryManager.dispose();
    this.hideGlow();
  }
}
