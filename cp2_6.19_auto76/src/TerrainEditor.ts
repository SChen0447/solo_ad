import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UIDataManager, PRESET_COLORS, ToolMode, VoxelData } from './UIDataManager';
import { Renderer3D } from './Renderer3D';

const GRID_SIZE = 20;

export class TerrainEditor {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dataManager: UIDataManager;
  private renderer3D: Renderer3D;
  private container: HTMLElement;
  private groundPlane: THREE.Mesh;
  private isPointerDown: boolean = false;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private hoveredVoxel: { x: number; y: number; z: number } | null = null;
  private lastPlaceKey: string = '';
  private isDragging: boolean = false;
  private animFrameId: number = 0;
  private isModeAnimating: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.dataManager = new UIDataManager();
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2332);
    this.scene.fog = new THREE.FogExp2(0x1a2332, 0.008);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(25, 25, 25);
    this.camera.lookAt(10, 0, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.update();

    this.setupLights();
    this.setupGroundPlane();

    this.renderer3D = new Renderer3D(this.scene);
    this.renderer3D.rebuild(this.dataManager.getAllVoxels());

    this.setupUI();
    this.setupEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x607090, 0.8);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xb0d0ff, 0x203040, 0.6);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(15, 30, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.left = -30;
    dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30;
    dir.shadow.camera.bottom = -30;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 80;
    dir.shadow.bias = -0.001;
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0x90a0c0, 0.3);
    fill.position.set(-10, 15, -10);
    this.scene.add(fill);
  }

  private setupGroundPlane(): void {
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x222d3a,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.position.set(GRID_SIZE / 2, -0.001, GRID_SIZE / 2);
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = 'ground';
    this.scene.add(this.groundPlane);
  }

  private setupUI(): void {
    const colorPanel = document.getElementById('color-panel')!;
    colorPanel.innerHTML = '';

    const recentLabel = document.createElement('div');
    recentLabel.className = 'recent-label';
    recentLabel.textContent = '最近';
    recentLabel.id = 'recent-label';
    colorPanel.appendChild(recentLabel);

    const recentContainer = document.createElement('div');
    recentContainer.id = 'recent-colors';
    recentContainer.style.display = 'flex';
    recentContainer.style.gap = '6px';
    colorPanel.appendChild(recentContainer);

    const divider = document.createElement('div');
    divider.className = 'color-panel-divider';
    colorPanel.appendChild(divider);

    const presetsContainer = document.createElement('div');
    presetsContainer.id = 'preset-colors';
    presetsContainer.style.display = 'flex';
    presetsContainer.style.gap = '8px';
    presetsContainer.style.flexWrap = 'wrap';
    presetsContainer.style.justifyContent = 'center';
    colorPanel.appendChild(presetsContainer);

    PRESET_COLORS.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.dataset.type = 'preset';
      swatch.addEventListener('click', () => this.applyColor(color, swatch));
      presetsContainer.appendChild(swatch);
    });

    this.setActiveSwatchInitial();
    this.updateRecentColors();

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as ToolMode;
        this.setMode(mode);
      });
    });

    document.getElementById('undo-btn')!.addEventListener('click', () => this.performUndo());
    document.getElementById('redo-btn')!.addEventListener('click', () => this.performRedo());

    document.getElementById('export-btn')!.addEventListener('click', () => this.exportTerrain());
    document.getElementById('import-btn')!.addEventListener('click', () => {
      document.getElementById('file-input')!.click();
    });
    document.getElementById('file-input')!.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        this.importTerrain(input.files[0]);
        input.value = '';
      }
    });

    this.updateHistoryUI();
  }

  private setActiveSwatchInitial(): void {
    const currentColor = this.dataManager.getColor();
    const swatches = document.querySelectorAll<HTMLElement>('.color-swatch[data-type="preset"]');
    swatches.forEach(s => {
      if (s.dataset.color === currentColor) {
        s.classList.add('active');
      }
    });
  }

  private applyColor(color: string, sourceSwatch?: HTMLElement): void {
    this.dataManager.setColor(color);
    this.updateActiveSwatch(color, sourceSwatch);
    this.updateRecentColors();
  }

  private updateActiveSwatch(color: string, sourceSwatch?: HTMLElement): void {
    const allSwatches = document.querySelectorAll<HTMLElement>('.color-swatch');
    allSwatches.forEach(s => {
      if (s.classList.contains('active')) {
        s.classList.remove('active');
      }
    });

    if (sourceSwatch) {
      requestAnimationFrame(() => {
        sourceSwatch.classList.add('active');
      });
    } else {
      let matched: HTMLElement | null = null;
      allSwatches.forEach(s => {
        if (s.dataset.color && s.dataset.color.toLowerCase() === color.toLowerCase()) {
          matched = s;
        }
      });
      if (matched) {
        requestAnimationFrame(() => {
          matched!.classList.add('active');
        });
      }
    }
  }

  private updateRecentColors(): void {
    const container = document.getElementById('recent-colors');
    if (!container) return;
    container.innerHTML = '';

    const recent = this.dataManager.getRecentColors();
    for (let i = 0; i < 3; i++) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.opacity = recent[i] ? '1' : '0.25';
      swatch.style.backgroundColor = recent[i] || 'transparent';
      swatch.style.backgroundImage = recent[i] ? 'none'
        : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 2px, transparent 2px, transparent 5px)';
      if (recent[i]) {
        swatch.dataset.color = recent[i];
        swatch.dataset.type = 'recent';
        swatch.addEventListener('click', () => this.applyColor(recent[i], swatch));
      }
      container.appendChild(swatch);
    }

    const currentColor = this.dataManager.getColor();
    requestAnimationFrame(() => {
      const swatches = container.querySelectorAll<HTMLElement>('.color-swatch');
      swatches.forEach(s => {
        if (s.dataset.color && s.dataset.color.toLowerCase() === currentColor.toLowerCase()) {
          s.classList.add('active');
        }
      });
    });
  }

  private setMode(mode: ToolMode): void {
    const oldMode = this.dataManager.getMode();
    if (oldMode === mode || this.isModeAnimating) return;

    this.isModeAnimating = true;

    const oldBtn = document.querySelector<HTMLElement>(`.mode-btn[data-mode="${oldMode}"]`);
    const newBtn = document.querySelector<HTMLElement>(`.mode-btn[data-mode="${mode}"]`);

    const oldIcon = oldBtn?.querySelector<HTMLElement>('.icon-wrapper');
    const newIcon = newBtn?.querySelector<HTMLElement>('.icon-wrapper');

    const doSwitch = () => {
      this.dataManager.setMode(mode);
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === mode);
      });

      if (newIcon) {
        newIcon.classList.remove('fade-out');
        newIcon.classList.add('fade-in');
        setTimeout(() => newIcon.classList.remove('fade-in'), 400);
      }

      const canvas = this.renderer.domElement;
      switch (mode) {
        case 'add':
          canvas.style.cursor = 'crosshair';
          break;
        case 'remove':
          canvas.style.cursor = 'crosshair';
          break;
        case 'select':
          canvas.style.cursor = 'pointer';
          break;
      }

      setTimeout(() => {
        this.isModeAnimating = false;
      }, 350);
    };

    if (oldIcon && oldIcon !== newIcon) {
      oldIcon.classList.add('fade-out');
      setTimeout(doSwitch, 180);
    } else {
      doSwitch();
    }
  }

  private setupEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        this.isPointerDown = true;
        this.pointerDownPos = { x: e.clientX, y: e.clientY };
        this.lastPlaceKey = '';
        this.isDragging = false;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isPointerDown) {
        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.isDragging = true;
        }
      }

      this.updateHover();
    });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0 && this.isPointerDown && !this.isDragging) {
        this.handleClick();
      }
      this.isPointerDown = false;
      this.isDragging = false;
      this.lastPlaceKey = '';
    });

    canvas.addEventListener('pointerleave', () => {
      this.renderer3D.hideHighlight();
      this.hoveredVoxel = null;
    });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'a':
          this.setMode('add');
          break;
        case 'd':
          this.setMode('remove');
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            this.setMode('select');
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              this.performRedo();
            } else {
              this.performUndo();
            }
          }
          break;
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.dataManager.onChange(() => {
      this.renderer3D.rebuild(this.dataManager.getAllVoxels());
      this.updateHistoryUI();
    });
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const voxelMesh = this.renderer3D.getVoxelMesh();
    const intersects = this.raycaster.intersectObject(voxelMesh);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.instanceId !== undefined) {
        const allVoxels = this.dataManager.getAllVoxels();
        const idx = hit.instanceId;
        if (idx < allVoxels.length) {
          const v = allVoxels[idx];
          this.hoveredVoxel = { x: v.x, y: v.y, z: v.z };

          const mode = this.dataManager.getMode();
          if (mode === 'remove' || mode === 'select') {
            this.renderer3D.showHighlight(v.x, v.y, v.z);
          } else {
            const normal = hit.face!.normal.clone();
            const nx = v.x + Math.round(normal.x);
            const ny = v.y + Math.round(normal.y);
            const nz = v.z + Math.round(normal.z);
            if (ny >= 0 && nx >= 0 && nx < GRID_SIZE && nz >= 0 && nz < GRID_SIZE) {
              this.renderer3D.showHighlight(nx, ny, nz);
            } else {
              this.renderer3D.hideHighlight();
            }
          }
          return;
        }
      }
    }

    const groundHits = this.raycaster.intersectObject(this.groundPlane);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      const gx = Math.floor(pt.x);
      const gz = Math.floor(pt.z);
      if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE) {
        this.hoveredVoxel = { x: gx, y: 0, z: gz };
        if (this.dataManager.getMode() === 'add') {
          this.renderer3D.showHighlight(gx, 0, gz);
        }
        return;
      }
    }

    this.hoveredVoxel = null;
    this.renderer3D.hideHighlight();
  }

  private handleClick(): void {
    const mode = this.dataManager.getMode();

    if (mode === 'add') {
      this.handleAdd();
    } else if (mode === 'remove') {
      this.handleRemove();
    } else if (mode === 'select') {
      this.handleSelect();
    }
  }

  private handleAdd(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const voxelMesh = this.renderer3D.getVoxelMesh();
    const voxelHits = this.raycaster.intersectObject(voxelMesh);

    if (voxelHits.length > 0) {
      const hit = voxelHits[0];
      if (hit.instanceId !== undefined) {
        const allVoxels = this.dataManager.getAllVoxels();
        if (hit.instanceId < allVoxels.length) {
          const v = allVoxels[hit.instanceId];
          const normal = hit.face!.normal.clone();
          const nx = v.x + Math.round(normal.x);
          const ny = v.y + Math.round(normal.y);
          const nz = v.z + Math.round(normal.z);

          if (ny < 0 || nx < 0 || nx >= GRID_SIZE || nz < 0 || nz >= GRID_SIZE) return;

          const key = `${nx},${ny},${nz}`;
          if (this.lastPlaceKey === key) return;
          if (this.dataManager.hasVoxel(nx, ny, nz)) return;

          this.lastPlaceKey = key;
          const added = this.dataManager.addVoxel(nx, ny, nz, this.dataManager.getColor());
          if (added) {
            this.renderer3D.startAddAnimation(added);
          }
          return;
        }
      }
    }

    const groundHits = this.raycaster.intersectObject(this.groundPlane);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      const gx = Math.floor(pt.x);
      const gz = Math.floor(pt.z);

      if (gx < 0 || gx >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) return;

      const key = `${gx},0,${gz}`;
      if (this.lastPlaceKey === key) return;
      if (this.dataManager.hasVoxel(gx, 0, gz)) return;

      this.lastPlaceKey = key;
      const added = this.dataManager.addVoxel(gx, 0, gz, this.dataManager.getColor());
      if (added) {
        this.renderer3D.startAddAnimation(added);
      }
    }
  }

  private handleRemove(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const voxelMesh = this.renderer3D.getVoxelMesh();
    const hits = this.raycaster.intersectObject(voxelMesh);

    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const allVoxels = this.dataManager.getAllVoxels();
      if (hits[0].instanceId < allVoxels.length) {
        const v = allVoxels[hits[0].instanceId];
        const key = `${v.x},${v.y},${v.z}`;
        if (this.lastPlaceKey === key) return;
        this.lastPlaceKey = key;
        const removed = this.dataManager.removeVoxel(v.x, v.y, v.z);
        if (removed) {
          this.renderer3D.startRemoveAnimation(removed);
        }
      }
    }
  }

  private handleSelect(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const voxelMesh = this.renderer3D.getVoxelMesh();
    const hits = this.raycaster.intersectObject(voxelMesh);

    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const allVoxels = this.dataManager.getAllVoxels();
      if (hits[0].instanceId < allVoxels.length) {
        const v = allVoxels[hits[0].instanceId];
        this.applyColor(v.color);
        this.showToast(`已选取颜色: ${v.color}`);
      }
    }
  }

  private performUndo(): void {
    if (!this.dataManager.canUndo()) return;
    const action = this.dataManager.undo();
    if (action) {
      if (action.type === 'add') {
        this.renderer3D.startRemoveAnimation(action.voxel);
      } else {
        this.renderer3D.startAddAnimation(action.voxel);
      }
    }
  }

  private performRedo(): void {
    if (!this.dataManager.canRedo()) return;
    const action = this.dataManager.redo();
    if (action) {
      if (action.type === 'add') {
        this.renderer3D.startAddAnimation(action.voxel);
      } else {
        this.renderer3D.startRemoveAnimation(action.voxel);
      }
    }
  }

  private updateHistoryUI(): void {
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
    const undoCount = document.getElementById('undo-count')!;
    const redoCount = document.getElementById('redo-count')!;

    undoBtn.disabled = !this.dataManager.canUndo();
    redoBtn.disabled = !this.dataManager.canRedo();
    undoCount.textContent = String(this.dataManager.undoCount());
    redoCount.textContent = String(this.dataManager.redoCount());
  }

  private async exportTerrain(): Promise<void> {
    const btn = document.getElementById('export-btn')!;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> 导出中';
    (btn as HTMLButtonElement).disabled = true;

    await new Promise(r => setTimeout(r, 1000));

    const json = this.dataManager.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terrain.json';
    a.click();
    URL.revokeObjectURL(url);

    btn.innerHTML = '✅ 已导出';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      (btn as HTMLButtonElement).disabled = false;
    }, 1500);

    this.showToast('地形已导出为 JSON 文件');
  }

  private async importTerrain(file: File): Promise<void> {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (!parsed.voxels || !Array.isArray(parsed.voxels)) {
        this.showToast('导入失败：无效的 JSON 文件');
        return;
      }

      this.dataManager.clearAll();
      this.renderer3D.rebuild([]);

      const toImport: VoxelData[] = parsed.voxels.map((item: { position: number[]; color: string }) => ({
        x: item.position[0],
        y: item.position[1],
        z: item.position[2],
        color: item.color,
      }));

      const sorted = [...toImport].sort((a, b) => a.y - b.y);
      const layers = new Map<number, VoxelData[]>();
      for (const v of sorted) {
        if (!layers.has(v.y)) layers.set(v.y, []);
        layers.get(v.y)!.push(v);
      }

      const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0]);

      for (const [, layerVoxels] of sortedLayers) {
        this.dataManager.batch(() => {
          for (const v of layerVoxels) {
            this.dataManager.addVoxel(v.x, v.y, v.z, v.color, false);
          }
        });
        for (const v of layerVoxels) {
          this.renderer3D.startAddAnimation(v);
        }
        this.renderer3D.rebuild(this.dataManager.getAllVoxels());
        await new Promise(r => setTimeout(r, 20));
      }

      this.updateHistoryUI();
      this.showToast(`已导入 ${toImport.length} 个像素块`);
    } catch {
      this.showToast('导入失败：无效的 JSON 文件');
    }
  }

  private showToast(message: string): void {
    const container = document.getElementById('toast-container')!;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());

    this.controls.update();

    if (this.renderer3D.hasActiveAnimations()) {
      this.renderer3D.updateAnimations(this.dataManager.getAllVoxels());
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.renderer3D.dispose();
    this.renderer.dispose();
    this.controls.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
