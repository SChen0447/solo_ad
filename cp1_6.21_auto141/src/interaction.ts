import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { Tree } from './tree';
import { Forest } from './forest';
import { MONTH_POEMS, MONTH_NAMES } from './season';

export interface InteractionConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  forest: Forest;
  container: HTMLElement;
  onMonthChange: (month: number) => void;
}

export class InteractionManager {
  public controls: OrbitControls;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public forest: Forest;
  public scene: THREE.Scene;
  public container: HTMLElement;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedTree: Tree | null = null;

  private timeline: HTMLInputElement;
  private monthLabel: HTMLDivElement;
  private poemLabel: HTMLDivElement;
  private infoPanel: HTMLDivElement;
  private treeNameEl: HTMLElement;
  private leafDensityEl: HTMLElement;
  private tempRangeEl: HTMLElement;
  private growthProgressEl: HTMLDivElement;
  private focusBtn: HTMLButtonElement;
  private closePanelBtn: HTMLButtonElement;
  private ticksContainer: HTMLDivElement;

  private onMonthChange: (month: number) => void;
  private isDragging: boolean = false;
  private downPos: { x: number; y: number } = { x: 0, y: 0 };

  private autoPlay: boolean = false;

  constructor(config: InteractionConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.renderer = config.renderer;
    this.forest = config.forest;
    this.container = config.container;
    this.onMonthChange = config.onMonthChange;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 55;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 2.5, 0);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    this.controls.update();

    this.timeline = document.getElementById('timeline') as HTMLInputElement;
    this.monthLabel = document.getElementById('month-label') as HTMLDivElement;
    this.poemLabel = document.getElementById('poem-label') as HTMLDivElement;
    this.infoPanel = document.getElementById('info-panel') as HTMLDivElement;
    this.treeNameEl = document.getElementById('tree-name') as HTMLElement;
    this.leafDensityEl = document.getElementById('leaf-density') as HTMLElement;
    this.tempRangeEl = document.getElementById('temp-range') as HTMLElement;
    this.growthProgressEl = document.getElementById('growth-progress') as HTMLDivElement;
    this.focusBtn = document.getElementById('focus-btn') as HTMLButtonElement;
    this.closePanelBtn = document.getElementById('close-panel') as HTMLButtonElement;
    this.ticksContainer = document.getElementById('timeline-ticks') as HTMLDivElement;

    this.createTicks();
    this.bindEvents();
    this.updateTimelineLabels(1);
  }

  private createTicks(): void {
    for (let i = 0; i <= 48; i++) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      this.ticksContainer.appendChild(tick);
    }
  }

  private bindEvents(): void {
    this.timeline.addEventListener('input', (e) => {
      const value = parseFloat(this.timeline.value);
      this.onMonthChange(value);
      this.updateTimelineLabels(value);
    });

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);

    this.focusBtn.addEventListener('click', () => {
      if (this.selectedTree) {
        this.focusOnTree(this.selectedTree);
      }
    });

    this.closePanelBtn.addEventListener('click', () => {
      this.hidePanel();
      this.forest.clearHighlights();
      this.selectedTree = null;
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hidePanel();
        this.forest.clearHighlights();
        this.selectedTree = null;
      }
      if (e.key === 'r' || e.key === 'R') {
        this.resetCamera();
      }
    });
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = false;
    this.downPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.downPos.x;
    const dy = e.clientY - this.downPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      this.isDragging = true;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.isDragging) return;
    if (e.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const interactables = this.forest.getAllInteractables();
    const hits = this.raycaster.intersectObjects(interactables, false);

    if (hits.length > 0) {
      const tree = this.forest.getTreeByObject(hits[0].object);
      if (tree) {
        this.selectTree(tree);
        return;
      }
    }

    this.forest.clearHighlights();
    this.hidePanel();
    this.selectedTree = null;
  };

  private selectTree(tree: Tree): void {
    this.forest.clearHighlights();
    tree.setHighlight(true);
    this.selectedTree = tree;
    this.showPanel(tree);
  }

  private showPanel(tree: Tree): void {
    this.treeNameEl.textContent = tree.getDisplayName();
    this.leafDensityEl.textContent = tree.getLeafDensityPercent().toString();
    this.tempRangeEl.textContent = tree.getOptimalTempRange();
    this.growthProgressEl.style.width = `${tree.getGrowthProgress()}%`;
    this.infoPanel.classList.add('visible');
  }

  private hidePanel(): void {
    this.infoPanel.classList.remove('visible');
  }

  private updateTimelineLabels(month: number): void {
    const m = Math.max(1, Math.min(12, Math.round(month)));
    this.monthLabel.textContent = MONTH_NAMES[m] || '一月 January';
    this.poemLabel.textContent = MONTH_POEMS[m] || '';
  }

  public focusOnTree(tree: Tree): void {
    const targetPos = tree.getFocusPosition();
    const focusDist = tree.getFocusDistance();

    const currentPos = this.camera.position.clone();
    const dir = new THREE.Vector3().subVectors(currentPos, this.controls.target).normalize();
    const desiredPos = targetPos.clone().add(dir.multiplyScalar(focusDist));

    const midHeight = Math.max(currentPos.y, desiredPos.y) + focusDist * 0.5;
    const midPoint = new THREE.Vector3(
      (currentPos.x + desiredPos.x) / 2,
      midHeight,
      (currentPos.z + desiredPos.z) / 2
    );

    const startPos = currentPos.clone();
    const startTarget = this.controls.target.clone();

    const coords = { t: 0 };

    new TWEEN.Tween(coords)
      .to({ t: 1 }, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        const t = coords.t;
        const mt = 1 - t;
        const newPos = new THREE.Vector3();
        newPos.x = mt * mt * startPos.x + 2 * mt * t * midPoint.x + t * t * desiredPos.x;
        newPos.y = mt * mt * startPos.y + 2 * mt * t * midPoint.y + t * t * desiredPos.y;
        newPos.z = mt * mt * startPos.z + 2 * mt * t * midPoint.z + t * t * desiredPos.z;
        this.camera.position.copy(newPos);

        const newTarget = new THREE.Vector3().lerpVectors(startTarget, targetPos, t);
        this.controls.target.copy(newTarget);
        this.controls.update();
      })
      .start();
  }

  public resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = new THREE.Vector3(18, 16, 18);
    const endTarget = new THREE.Vector3(0, 2.5, 0);

    const coords = { t: 0 };
    new TWEEN.Tween(coords)
      .to({ t: 1 }, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.lerpVectors(startPos, endPos, coords.t);
        this.controls.target.lerpVectors(startTarget, endTarget, coords.t);
        this.controls.update();
      })
      .start();
  }

  public updatePanelIfOpen(): void {
    if (this.selectedTree && this.infoPanel.classList.contains('visible')) {
      this.leafDensityEl.textContent = this.selectedTree.getLeafDensityPercent().toString();
      this.growthProgressEl.style.width = `${this.selectedTree.getGrowthProgress()}%`;
    }
  }

  public setAutoPlay(enabled: boolean): void {
    this.autoPlay = enabled;
  }

  public isAutoPlaying(): boolean {
    return this.autoPlay;
  }

  public setMonthValue(month: number): void {
    this.timeline.value = month.toString();
    this.updateTimelineLabels(month);
  }

  public update(delta: number): void {
    this.controls.update();
    TWEEN.update();
    this.updatePanelIfOpen();

    if (this.autoPlay) {
      let current = parseFloat(this.timeline.value);
      current += delta * 0.4;
      if (current > 12) current = 1;
      this.timeline.value = current.toString();
      this.onMonthChange(current);
      this.updateTimelineLabels(current);
    }
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
