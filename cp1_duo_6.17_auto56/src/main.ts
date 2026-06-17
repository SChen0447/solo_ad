import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import {
  DataService,
  MoleculeData,
  MoleculeListItem,
  SavedMarker,
  ELEMENT_COLORS
} from './service/DataService.js';
import { MolecularModel, AtomMeshInfo } from './viewer/MolecularModel.js';
import { MeasurementTool, MeasurementResult } from './viewer/MeasurementTool.js';

interface CameraSnapshot {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
}

class MoleculeViewerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private dataService: DataService;
  private model: MolecularModel;
  private measurement: MeasurementTool | null = null;

  private container: HTMLElement;
  private appDiv: HTMLElement;
  private startScreen: HTMLElement;
  private moleculeSelect: HTMLSelectElement;
  private atomInfoCard: HTMLElement;
  private measureBtn: HTMLElement;
  private cameraBtn: HTMLElement;
  private snapshotList: HTMLElement;
  private snapshotCount: HTMLElement;
  private measurementInfo: HTMLElement;
  private measurementHint: HTMLElement;
  private measurementResults: HTMLElement;

  private molecules: MoleculeListItem[] = [];
  private currentMoleculeId: string = '';
  private snapshots: CameraSnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 5;

  private autoRotate: boolean = true;
  private isInteracting: boolean = false;
  private interactionEndTime: number = 0;
  private readonly RESUME_DELAY = 500;
  private readonly ROTATION_SPEED = (5 * Math.PI / 180);

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredAtom: AtomMeshInfo | null = null;

  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private bgPhase: number = 0;
  private bgAnimating: boolean = false;

  constructor() {
    this.dataService = new DataService();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.container = document.getElementById('canvas-container')!;
    this.appDiv = document.getElementById('app')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.moleculeSelect = document.getElementById('molecule-select') as HTMLSelectElement;
    this.atomInfoCard = document.getElementById('atom-info')!;
    this.measureBtn = document.getElementById('measure-btn')!;
    this.cameraBtn = document.getElementById('camera-btn')!;
    this.snapshotList = document.getElementById('snapshot-list')!;
    this.snapshotCount = document.getElementById('snapshot-count')!;
    this.measurementInfo = document.getElementById('measurement-info')!;
    this.measurementHint = document.getElementById('measurement-hint')!;
    this.measurementResults = document.getElementById('measurement-results')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0d17);
    this.scene.fog = new THREE.Fog(0x0b0d17, 10, 40);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 5;

    this.model = new MolecularModel(this.dataService);
    this.scene.add(this.model.getGroup());

    this.setupLights();
    this.setupEvents();
    this.init();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6a8cff, 0.4);
    fillLight.position.set(-6, -3, 4);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa78bfa, 0.3);
    rimLight.position.set(0, -5, -8);
    this.scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x4a6cf7, 0.8, 20);
    pointLight.position.set(0, 3, 6);
    this.scene.add(pointLight);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize);

    document.getElementById('start-btn')!.addEventListener('click', () => {
      this.startScreen.classList.add('hidden');
    });

    this.moleculeSelect.addEventListener('change', (e) => {
      const id = (e.target as HTMLSelectElement).value;
      if (id && id !== this.currentMoleculeId) {
        this.loadMolecule(id);
      }
    });

    this.measureBtn.addEventListener('click', () => {
      this.toggleMeasurementMode();
    });

    this.cameraBtn.addEventListener('click', () => {
      this.saveSnapshot();
    });

    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.clearHover();
    });

    this.controls.addEventListener('start', () => {
      this.isInteracting = true;
      this.autoRotate = false;
    });

    this.controls.addEventListener('end', () => {
      this.isInteracting = false;
      this.interactionEndTime = performance.now();
    });

    const panel = document.getElementById('panel')!;
    let panelExpanded = false;
    panel.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if ((e.target as HTMLElement).closest('.tool-btn') ||
            (e.target as HTMLElement).closest('.molecule-select') ||
            (e.target as HTMLElement).closest('.snapshot-item')) {
          return;
        }
        panelExpanded = !panelExpanded;
        if (panelExpanded) panel.classList.add('expanded');
        else panel.classList.remove('expanded');
      }
    });
  }

  private async init(): Promise<void> {
    try {
      this.molecules = await this.dataService.getMoleculesList();
      this.populateMoleculeList();

      if (this.molecules.length > 0) {
        this.currentMoleculeId = this.molecules[0].id;
        this.moleculeSelect.value = this.currentMoleculeId;
        await this.loadMolecule(this.currentMoleculeId);
      }

      this.measurement = new MeasurementTool(
        this.scene,
        this.camera,
        this.model,
        this.container
      );
      this.measurement.setCallbacks(
        this.onMeasurementUpdate,
        this.onMeasurementExit
      );

      this.isRunning = true;
      this.animate();
    } catch (err) {
      console.error('初始化失败:', err);
    }
  }

  private populateMoleculeList(): void {
    this.moleculeSelect.innerHTML = '';
    this.molecules.forEach(mol => {
      const opt = document.createElement('option');
      opt.value = mol.id;
      opt.textContent = `${mol.name} (${mol.atom_count}原子)`;
      this.moleculeSelect.appendChild(opt);
    });
  }

  private async loadMolecule(id: string): Promise<void> {
    const data = await this.dataService.getMolecule(id);
    if (!data) return;

    this.currentMoleculeId = id;
    this.animateBackgroundTransition();
    this.measurement?.clearMeasurement();
    this.measurement?.deactivate();
    this.measureBtn.classList.remove('active');
    this.hideMeasurementInfo();

    this.model.loadMolecule(data, () => {
    });
  }

  private animateBackgroundTransition(): void {
    const colorStages = [
      { r: 0x0b / 255, g: 0x0d / 255, b: 0x17 / 255 },
      { r: 0x2a / 255, g: 0x1e / 255, b: 0x55 / 255 },
      { r: 0x0b / 255, g: 0x0d / 255, b: 0x17 / 255 }
    ];

    const state = { stage: 0, t: 0 };

    new TWEEN.Tween(state)
      .to({ t: 1 }, 250)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        const r = colorStages[0].r + (colorStages[1].r - colorStages[0].r) * state.t;
        const g = colorStages[0].g + (colorStages[1].g - colorStages[0].g) * state.t;
        const b = colorStages[0].b + (colorStages[1].b - colorStages[0].b) * state.t;
        this.updateAppBackground(r, g, b);
      })
      .chain(
        new TWEEN.Tween(state)
          .to({ t: 1 }, 250)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(() => {
            const r = colorStages[1].r + (colorStages[2].r - colorStages[1].r) * state.t;
            const g = colorStages[1].g + (colorStages[2].g - colorStages[1].g) * state.t;
            const b = colorStages[1].b + (colorStages[2].b - colorStages[1].b) * state.t;
            this.updateAppBackground(r, g, b);
          })
      )
      .start();
  }

  private updateBackgroundTransition(delta: number): void {
  }

  private updateAppBackground(r: number, g: number, b: number): void {
    const rgbStr = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    const bgColor1 = rgbStr;
    const g2 = Math.min(1, g + 0.05);
    const b2 = Math.min(1, b + 0.1);
    const bgColor2 = `rgb(${Math.round(r * 255)}, ${Math.round(g2 * 255)}, ${Math.round(b2 * 255)})`;
    this.appDiv.style.background = `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)`;
  }

  private onMouseMove = (event: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();
  };

  private checkHover(): void {
    if (!this.model.getCurrentData()) {
      this.clearHover();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const atomMeshes = this.model.getAtomInfos().map(info => info.mesh);
    const intersects = this.raycaster.intersectObjects(atomMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const info = this.model.getAtomByMesh(mesh);
      if (info) {
        if (this.hoveredAtom !== info) {
          if (this.hoveredAtom) {
            this.model.removeHalo(this.hoveredAtom);
          }
          this.hoveredAtom = info;
          this.model.createHaloForAtom(info);
          this.showAtomInfo(info);
        }
        this.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }

    this.clearHover();
  }

  private clearHover(): void {
    if (this.hoveredAtom) {
      this.model.removeHalo(this.hoveredAtom);
      this.hoveredAtom = null;
    }
    this.hideAtomInfo();
    this.renderer.domElement.style.cursor = 'grab';
  }

  private showAtomInfo(info: AtomMeshInfo): void {
    const element = info.atom.element;
    const colorHex = ELEMENT_COLORS[element] || 0x888888;
    const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
    const contrastColor = this.getContrastColor(colorHex);
    const name = this.dataService.getElementName(element);
    const localPos = this.model.getAtomLocalPosition(info.index);

    this.atomInfoCard.classList.remove('empty');
    this.atomInfoCard.innerHTML = `
      <div style="margin-bottom:10px;">
        <span class="element-badge" style="background:${colorStr};color:${contrastColor}">${element}</span>
        <span style="font-size:15px;font-weight:600;">${name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">索引</span>
        <span class="info-value">#${info.index + 1}</span>
      </div>
      <div class="info-row">
        <span class="info-label">X 坐标</span>
        <span class="info-value">${localPos ? localPos.x.toFixed(3) : '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Y 坐标</span>
        <span class="info-value">${localPos ? localPos.y.toFixed(3) : '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Z 坐标</span>
        <span class="info-value">${localPos ? localPos.z.toFixed(3) : '-'}</span>
      </div>
    `;
  }

  private getContrastColor(hex: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }

  private hideAtomInfo(): void {
    this.atomInfoCard.classList.add('empty');
    this.atomInfoCard.innerHTML = '悬停原子查看详情';
  }

  private toggleMeasurementMode(): void {
    if (!this.measurement) return;

    if (this.measurement.getIsActive()) {
      this.measurement.deactivate();
      this.measureBtn.classList.remove('active');
      this.hideMeasurementInfo();
    } else {
      this.measurement.activate();
      this.measureBtn.classList.add('active');
      this.showMeasurementInfo();
    }
  }

  private onMeasurementUpdate = (result: MeasurementResult, hint: string): void => {
    this.measurementHint.textContent = hint;

    let html = '';
    if (result.distance1 !== null) {
      html += `<div class="result-row"><span class="result-label">距离 1-2</span><span class="result-value dist-1">${result.distance1.toFixed(2)} Å</span></div>`;
    }
    if (result.distance2 !== null) {
      html += `<div class="result-row"><span class="result-label">距离 2-3</span><span class="result-value dist-2">${result.distance2.toFixed(2)} Å</span></div>`;
    }
    if (result.angle !== null) {
      html += `<div class="result-row"><span class="result-label">键角 1-2-3</span><span class="result-value angle-val">${result.angle.toFixed(1)}°</span></div>`;
    }
    this.measurementResults.innerHTML = html;
  };

  private onMeasurementExit = (): void => {
    this.measureBtn.classList.remove('active');
    this.hideMeasurementInfo();
  };

  private showMeasurementInfo(): void {
    this.measurementInfo.classList.add('visible');
  }

  private hideMeasurementInfo(): void {
    this.measurementInfo.classList.remove('visible');
  }

  private saveSnapshot(): void {
    if (this.snapshots.length >= this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    const snapshot: CameraSnapshot = {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      },
      zoom: this.camera.zoom
    };

    this.snapshots.push(snapshot);
    this.refreshSnapshotUI();

    this.dataService.saveMarker({
      moleculeId: this.currentMoleculeId,
      cameraPosition: snapshot.position,
      cameraRotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z
      },
      zoom: snapshot.zoom
    }).catch(() => {});
  }

  private refreshSnapshotUI(): void {
    this.snapshotCount.textContent = `(${this.snapshots.length}/${this.MAX_SNAPSHOTS})`;
    this.snapshotList.innerHTML = '';

    this.snapshots.forEach((snap, idx) => {
      const item = document.createElement('div');
      item.className = 'snapshot-item';
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex:1;pointer-events:none;">
          <span class="snapshot-index">${idx + 1}</span>
          <span>视角 #${idx + 1}</span>
        </div>
        <span class="snapshot-clear" data-idx="${idx}">✕</span>
      `;
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.idx !== undefined) {
          e.stopPropagation();
          const removeIdx = parseInt(target.dataset.idx);
          this.snapshots.splice(removeIdx, 1);
          this.refreshSnapshotUI();
        } else {
          this.restoreSnapshot(snap);
        }
      });
      this.snapshotList.appendChild(item);
    });
  }

  private restoreSnapshot(snapshot: CameraSnapshot): void {
    this.autoRotate = false;

    const fromPos = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
    const toPos = snapshot.position;

    const fromTarget = {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z
    };
    const toTarget = snapshot.target;

    const fromZoom = this.camera.zoom;
    const toZoom = snapshot.zoom || 1;

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 600)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        const t = obj.t;
        this.camera.position.x = fromPos.x + (toPos.x - fromPos.x) * t;
        this.camera.position.y = fromPos.y + (toPos.y - fromPos.y) * t;
        this.camera.position.z = fromPos.z + (toPos.z - fromPos.z) * t;

        this.controls.target.x = fromTarget.x + (toTarget.x - fromTarget.x) * t;
        this.controls.target.y = fromTarget.y + (toTarget.y - fromTarget.y) * t;
        this.controls.target.z = fromTarget.z + (toTarget.z - fromTarget.z) * t;

        this.camera.zoom = fromZoom + (toZoom - fromZoom) * t;
        this.camera.updateProjectionMatrix();

        this.controls.update();
      })
      .onComplete(() => {
        this.camera.zoom = toZoom;
        this.camera.updateProjectionMatrix();
        this.interactionEndTime = performance.now();
      })
      .start();
  }

  private onResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = (): void => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    TWEEN.update();

    this.updateAutoRotation(delta);

    this.model.update(delta);

    this.measurement?.update();

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  };

  private updateAutoRotation(delta: number): void {
    if (!this.model.getCurrentData()) return;

    if (this.isInteracting) {
      return;
    }

    const now = performance.now();
    if (now - this.interactionEndTime > this.RESUME_DELAY) {
      if (!this.autoRotate) {
        this.autoRotate = true;
      }
    }

    if (this.autoRotate) {
      this.model.getGroup().rotation.y += this.ROTATION_SPEED * delta;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MoleculeViewerApp();
});
