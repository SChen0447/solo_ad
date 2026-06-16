import GUI from 'lil-gui';
import { SceneManager } from '../scene/SceneManager';
import { GeometryType, GeometryEntry } from '../geometry/GeometryManager';
import { BooleanMode } from '../engine/BooleanEngine';
import * as THREE from 'three';

export class UIManager {
  private gui: GUI;
  private sceneManager: SceneManager;
  private addType: GeometryType = 'sphere';
  private currentMode: BooleanMode = 'union';
  private selectedAId: string | null = null;
  private selectedBId: string | null = null;
  private geoFolder: GUI | null = null;
  private posFolder: GUI | null = null;
  private editingId: string | null = null;
  private posParams = { x: 0, y: 0, z: 0, size: 1 };
  private suppressChange = false;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.gui = new GUI({ title: '布尔运算控制面板', width: 280 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '12px';
    this.gui.domElement.style.right = '12px';
    this.gui.domElement.style.zIndex = '1000';

    const rootEl = this.gui.domElement.querySelector('.lil-gui') as HTMLElement
      || this.gui.domElement;
    rootEl.style.background = 'rgba(0,0,0,0.7)';
    rootEl.style.borderRadius = '8px';
    rootEl.style.padding = '12px';

    this.setupAddFolder();
    this.setupSelectFolder();
    this.setupModeFolder();
    this.setupGeometryEditFolder();
    this.setupActionsFolder();

    this.sceneManager.setOnUpdate(() => this.refreshUI());
  }

  private setupAddFolder(): void {
    const addFolder = this.gui.addFolder('添加几何体');
    addFolder.add(this, 'addType', { '球体': 'sphere', '立方体': 'cube', '圆柱体': 'cylinder' })
      .name('类型');
    addFolder.add({ add: () => this.addGeometry() }, 'add').name('添加');
    addFolder.open();
  }

  private setupSelectFolder(): void {
    const selFolder = this.gui.addFolder('选择运算对象');
    this.selectFolder = selFolder;
    this.refreshSelectDropdowns();
    selFolder.open();
  }

  private selectFolder: GUI | null = null;

  private refreshSelectDropdowns(): void {
    if (this.selectFolder) {
      const controllers = this.selectFolder.controllers;
      for (const c of controllers) c.destroy();
    }

    const entries = this.sceneManager.getAllEntries();
    const options: Record<string, string> = { '无': '' };
    for (const e of entries) {
      options[`${e.type} (${e.id})`] = e.id;
    }

    const currentA = this.sceneManager.getSelectedA() || '';
    const currentB = this.sceneManager.getSelectedB() || '';

    this.selectFolder!.add({ a: currentA }, 'a', options)
      .name('对象 A')
      .onChange((v: string) => {
        if (!this.suppressChange) {
          this.sceneManager.setSelectedA(v || null);
        }
      });

    this.selectFolder!.add({ b: currentB }, 'b', options)
      .name('对象 B')
      .onChange((v: string) => {
        if (!this.suppressChange) {
          this.sceneManager.setSelectedB(v || null);
        }
      });
  }

  private setupModeFolder(): void {
    const modeFolder = this.gui.addFolder('运算模式');
    modeFolder.add(this, 'currentMode', { '并集': 'union', '交集': 'intersect', '差集': 'subtract' })
      .name('模式')
      .onChange((v: BooleanMode) => {
        this.sceneManager.setBooleanMode(v);
      });
    modeFolder.open();
  }

  private setupGeometryEditFolder(): void {
    this.geoFolder = this.gui.addFolder('编辑几何体');
    this.posFolder = this.geoFolder.addFolder('位置与尺寸');

    this.posFolder.add(this.posParams, 'x', -5, 5, 0.1).name('X').onChange(() => this.onPosChange());
    this.posFolder.add(this.posParams, 'y', -5, 5, 0.1).name('Y').onChange(() => this.onPosChange());
    this.posFolder.add(this.posParams, 'z', -5, 5, 0.1).name('Z').onChange(() => this.onPosChange());
    this.posFolder.add(this.posParams, 'size', 0.5, 3, 0.1).name('尺寸').onChange(() => this.onPosChange());

    this.geoFolder.add({ remove: () => this.removeSelected() }, 'remove').name('删除选中');
    this.geoFolder.open();
    this.posFolder.open();
  }

  private setupActionsFolder(): void {
    const actionFolder = this.gui.addFolder('操作');
    actionFolder.add({ undo: () => this.undo() }, 'undo').name('回退上一步');
    actionFolder.add({ exportOBJ: () => this.exportOBJ() }, 'exportOBJ').name('导出OBJ');
    actionFolder.open();
  }

  private addGeometry(): void {
    const type = this.addType;
    this.sceneManager.addGeometry(type);
  }

  private onPosChange(): void {
    if (!this.editingId) return;
    const entry = this.sceneManager.getEntry(this.editingId);
    if (!entry) return;

    this.sceneManager.showGlow(new THREE.Vector3(this.posParams.x, this.posParams.y, this.posParams.z));
    this.sceneManager.updateGeometryPosition(
      this.editingId,
      this.posParams.x,
      this.posParams.y,
      this.posParams.z
    );
    this.sceneManager.updateGeometrySize(this.editingId, this.posParams.size);
  }

  private removeSelected(): void {
    if (!this.editingId) return;
    this.sceneManager.removeGeometry(this.editingId);
    this.editingId = null;
  }

  private undo(): void {
    this.sceneManager.undoLastOperation();
  }

  private exportOBJ(): void {
    const objString = this.sceneManager.exportResultAsOBJ();
    if (!objString) {
      console.warn('No result mesh to export');
      return;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `boolean_result_${timestamp}.obj`;

    const blob = new Blob([objString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  refreshUI(): void {
    this.suppressChange = true;
    this.refreshSelectDropdowns();
    this.refreshEditPanel();
    this.suppressChange = false;
  }

  private refreshEditPanel(): void {
    const selA = this.sceneManager.getSelectedA();
    if (selA) {
      this.editingId = selA;
      const entry = this.sceneManager.getEntry(selA);
      if (entry) {
        this.posParams.x = parseFloat(entry.position.x.toFixed(1));
        this.posParams.y = parseFloat(entry.position.y.toFixed(1));
        this.posParams.z = parseFloat(entry.position.z.toFixed(1));
        this.posParams.size = parseFloat(entry.size.toFixed(1));
        this.posFolder?.controllers.forEach(c => c.updateDisplay());
      }
    }
  }

  onMouseUp(): void {
    this.sceneManager.hideGlow();
  }

  dispose(): void {
    this.gui.destroy();
  }
}
