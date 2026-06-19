import * as THREE from 'three';
import { CellScene, ORGANELLE_INFO, MARK_COLORS, MarkData, MoleculeData } from '../scene/CellScene';

interface CameraState {
  theta: number;
  phi: number;
  distance: number;
  target: THREE.Vector3;
}

interface ZoomAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  startCamera: CameraState;
  endCamera: CameraState;
  organelleKey: string | null;
}

export class CellController {
  private scene: CellScene;
  private domElement: HTMLElement;

  private cameraState: CameraState;
  private defaultCameraState: CameraState;

  private zoomAnimation: ZoomAnimation = {
    active: false,
    startTime: 0,
    duration: 1200,
    startCamera: { theta: 0, phi: 0, distance: 0, target: new THREE.Vector3() },
    endCamera: { theta: 0, phi: 0, distance: 0, target: new THREE.Vector3() },
    organelleKey: null
  };

  private isDragging = false;
  private isRightDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragButton = 0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private selectedOrganelle: string | null = null;
  private selectedMolecule: MoleculeData | null = null;
  private infoLabel: HTMLElement | null = null;

  private lastClickTime = 0;
  private lastClickPos = { x: 0, y: 0 };
  private doubleClickThreshold = 300;
  private doubleClickDistance = 10;

  private compassCanvas: HTMLCanvasElement | null = null;
  private compassCtx: CanvasRenderingContext2D | null = null;

  private markColorIndex = 0;

  private currentSidebarTab = 'info';

  constructor(scene: CellScene, container: HTMLElement) {
    this.scene = scene;
    this.domElement = scene.renderer.domElement;

    this.cameraState = {
      theta: 0,
      phi: Math.PI / 2,
      distance: 15,
      target: new THREE.Vector3(0, 0, 0)
    };
    this.defaultCameraState = JSON.parse(JSON.stringify(this.cameraState));

    this.updateCameraFromState();

    this.setupCanvasListeners();
    this.setupUIListeners();
    this.setupCompass();
  }

  private setupCanvasListeners(): void {
    const el = this.domElement;

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('pointerdown', this.onPointerDown.bind(this));
    el.addEventListener('pointermove', this.onPointerMove.bind(this));
    el.addEventListener('pointerup', this.onPointerUp.bind(this));
    el.addEventListener('pointercancel', this.onPointerUp.bind(this));
    el.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    document.addEventListener('pointerdown', this.onDocumentPointerDown.bind(this));
  }

  private setupUIListeners(): void {
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.dataset.tab!;
        this.switchSidebarTab(tabName);
      });
    });

    const mobileTabs = document.querySelectorAll('.mobile-tab');
    mobileTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.dataset.tab!;
        this.switchMobileTab(tabName);
      });
    });

    const transportBtn = document.getElementById('btnTransport');
    if (transportBtn) {
      transportBtn.addEventListener('click', () => {
        if (this.scene.isTransportActive()) {
          this.scene.stopTransport();
          transportBtn.classList.remove('active');
        } else {
          this.scene.startTransport();
          transportBtn.classList.add('active');
        }
      });
    }

    const fabBtn = document.getElementById('fabBtn');
    const fabSubmenu = document.getElementById('fabSubmenu');
    if (fabBtn && fabSubmenu) {
      fabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fabBtn.classList.toggle('open');
        fabSubmenu.classList.toggle('open');

        const ripple = document.getElementById('fabRipple');
        if (ripple) {
          ripple.classList.remove('animate');
          void ripple.offsetWidth;
          ripple.classList.add('animate');
        }
      });

      fabSubmenu.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const actionEl = target.closest('[data-action]') as HTMLElement | null;
        if (!actionEl) return;
        const action = actionEl.dataset.action;
        this.handleFabAction(action!);
        fabBtn.classList.remove('open');
        fabSubmenu.classList.remove('open');
      });
    }

    document.addEventListener('click', (e) => {
      const fabContainer = document.querySelector('.fab-container');
      if (fabContainer && !fabContainer.contains(e.target as Node)) {
        fabBtn?.classList.remove('open');
        fabSubmenu?.classList.remove('open');
      }
    });
  }

  private switchSidebarTab(tabName: string): void {
    const tabs = document.querySelectorAll('.sidebar-tab');
    const oldIndex = Array.from(tabs).findIndex(t => t.classList.contains('active'));
    const newIndex = Array.from(tabs).findIndex(t => (t as HTMLElement).dataset.tab === tabName);

    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.sidebar-tab[data-tab="${tabName}"]`);
    activeTab?.classList.add('active');

    const panels: HTMLElement[] = [
      document.getElementById('panel-info')!,
      document.getElementById('panel-marks')!,
      document.getElementById('panel-help')!
    ];

    const direction = newIndex > oldIndex ? 'right' : 'left';

    panels.forEach((p) => {
      p.style.display = 'none';
      p.style.transform = '';
    });

    const oldPanel = panels[oldIndex];
    const newPanel = panels[newIndex];

    if (oldIndex !== newIndex && oldPanel && newPanel) {
      oldPanel.style.display = 'block';
      oldPanel.style.transform = 'translateX(0)';

      newPanel.style.display = 'block';
      newPanel.style.transform = direction === 'right' ? 'translateX(100%)' : 'translateX(-100%)';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          oldPanel.style.transform = direction === 'right' ? 'translateX(-100%)' : 'translateX(100%)';
          newPanel.style.transform = 'translateX(0)';

          setTimeout(() => {
            oldPanel.style.display = 'none';
            oldPanel.style.transform = '';
          }, 300);
        });
      });
    }

    this.currentSidebarTab = tabName;
  }

  private switchMobileTab(tabName: string): void {
    const mobileTabs = document.querySelectorAll('.mobile-tab');
    mobileTabs.forEach(t => t.classList.remove('active'));
    const active = document.querySelector(`.mobile-tab[data-tab="${tabName}"]`);
    active?.classList.add('active');

    const panel = document.getElementById('mobilePanel');
    if (!panel) return;

    let content = '';
    switch (tabName) {
      case 'info':
        content = document.getElementById('panel-info')?.innerHTML || '';
        break;
      case 'marks':
        content = document.getElementById('panel-marks')?.innerHTML || '';
        break;
      case 'help':
        content = document.getElementById('panel-help')?.innerHTML || '';
        break;
    }

    panel.innerHTML = content;

    if (panel.classList.contains('open') && this.currentSidebarTab === tabName) {
      panel.classList.remove('open');
    } else {
      panel.classList.add('open');
    }

    this.currentSidebarTab = tabName;
    this.bindMobilePanelEvents();
  }

  private bindMobilePanelEvents(): void {
    const markBtn = document.querySelector('.mobile-panel .mark-btn');
    if (markBtn) {
      markBtn.addEventListener('click', () => this.addCurrentMark());
    }

    const markItems = document.querySelectorAll('.mobile-panel .mark-item');
    markItems.forEach((item, idx) => {
      item.addEventListener('click', () => {
        const marks = this.scene.marks;
        if (marks[idx]) this.focusOnMark(marks[idx]);
      });
    });
  }

  private handleFabAction(action: string): void {
    switch (action) {
      case 'reset':
        this.resetView();
        break;
      case 'clear-marks':
        this.clearAllMarks();
        break;
      case 'toggle-mode':
        this.toggleDisplayMode();
        break;
      case 'screenshot':
        this.takeScreenshot();
        break;
    }
  }

  private setupCompass(): void {
    this.compassCanvas = document.getElementById('compass') as HTMLCanvasElement | null;
    if (this.compassCanvas) {
      this.compassCtx = this.compassCanvas.getContext('2d');
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.zoomAnimation.active) return;

    this.dragButton = e.button;
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isRightDragging = true;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.zoomAnimation.active) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;

    if (this.isRightDragging) {
      const panSpeed = 0.01 * (this.cameraState.distance / 15);
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);

      const dir = new THREE.Vector3();
      dir.subVectors(this.cameraState.target, this.scene.camera.position).normalize();
      right.crossVectors(dir, up).normalize();

      this.cameraState.target.addScaledVector(right, -dx * panSpeed);
      this.cameraState.target.y += dy * panSpeed;

      this.updateCameraFromState();
    } else if (this.isDragging && Math.abs(dx) + Math.abs(dy) > 2) {
      this.cameraState.theta -= dx * 0.008;
      this.cameraState.phi -= dy * 0.008;

      this.cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraState.phi));

      this.updateCameraFromState();
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onPointerUp(e: PointerEvent): void {
    const wasDragging = this.isDragging;
    const wasRightDragging = this.isRightDragging;
    const moved = Math.abs(e.clientX - this.lastMouseX) + Math.abs(e.clientY - this.lastMouseY);

    this.isDragging = false;
    this.isRightDragging = false;

    if (wasDragging && e.button === 0 && moved < 5) {
      this.handleClick(e);
    }
  }

  private onDocumentPointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;

    if (!target.closest('.sidebar') &&
        !target.closest('.mobile-panel') &&
        !target.closest('.mobile-tab-bar') &&
        !target.closest('.toolbar') &&
        !target.closest('.fab-container') &&
        !target.closest('.info-label') &&
        target !== this.infoLabel) {
      this.hideInfoLabel();
    }
  }

  private handleClick(e: PointerEvent): void {
    const now = performance.now();
    const pos = { x: e.clientX, y: e.clientY };
    const isDoubleClick =
      now - this.lastClickTime < this.doubleClickThreshold &&
      Math.abs(pos.x - this.lastClickPos.x) + Math.abs(pos.y - this.lastClickPos.y) < this.doubleClickDistance;

    this.lastClickTime = now;
    this.lastClickPos = pos;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    const moleculeMeshes: THREE.Mesh[] = [];
    for (const mol of this.scene.molecules) {
      moleculeMeshes.push(mol.mesh);
    }

    const molIntersects = this.raycaster.intersectObjects(moleculeMeshes, false);
    if (molIntersects.length > 0) {
      const hitMesh = molIntersects[0].object as THREE.Mesh;
      const mol = this.scene.molecules.find(m => m.mesh === hitMesh);
      if (mol) {
        this.handleMoleculeClick(mol, e.clientX, e.clientY);
        return;
      }
    }

    const organelleObjects: THREE.Object3D[] = [];
    this.scene.organelles.forEach((obj) => {
      organelleObjects.push(obj);
    });

    const orgIntersects = this.raycaster.intersectObjects(organelleObjects, true);
    if (orgIntersects.length > 0) {
      let obj = orgIntersects[0].object;
      while (obj.parent && !obj.userData.organelleType) {
        obj = obj.parent;
      }
      if (obj.userData.organelleType) {
        const key = obj.name && this.scene.organelles.has(obj.name)
          ? obj.name
          : this.findOrganelleKey(obj);
        if (key) {
          if (isDoubleClick) {
            this.focusOnOrganelle(key);
          } else {
            this.selectOrganelle(key);
          }
          return;
        }
      }
    }
  }

  private findOrganelleKey(obj: THREE.Object3D): string | null {
    for (const [key, value] of this.scene.organelles) {
      if (value === obj || value.children.includes(obj) || value.parent === obj.parent) {
        if (value.userData.organelleType === obj.userData.organelleType) {
          return key;
        }
      }
      if (this.isDescendant(obj, value)) {
        return key;
      }
    }
    return null;
  }

  private isDescendant(child: THREE.Object3D, ancestor: THREE.Object3D): boolean {
    let node: THREE.Object3D | null = child;
    while (node) {
      if (node === ancestor) return true;
      node = node.parent;
    }
    return false;
  }

  private handleMoleculeClick(mol: MoleculeData, clientX: number, clientY: number): void {
    if (mol.state === 'paused') {
      mol.state = 'moving';
      this.hideInfoLabel();
      this.selectedMolecule = null;
    } else if (mol.state === 'moving') {
      mol.state = 'paused';
      this.selectedMolecule = mol;
      this.showInfoLabel(clientX, clientY, 'mRNA分子，正在向细胞膜方向运输，速度0.5单位/秒');
    }
  }

  private showInfoLabel(x: number, y: number, text: string): void {
    this.hideInfoLabel();

    const label = document.createElement('div');
    label.className = 'info-label';
    label.textContent = text;
    label.style.left = `${x}px`;
    label.style.top = `${y - 50}px`;
    label.style.transform = 'translateX(-50%)';
    document.getElementById('app')?.appendChild(label);
    this.infoLabel = label;
  }

  private hideInfoLabel(): void {
    if (this.infoLabel) {
      this.infoLabel.remove();
      this.infoLabel = null;
    }
  }

  private selectOrganelle(key: string): void {
    this.selectedOrganelle = key;
    this.updateOrganelleInfoPanel(key);
  }

  private updateOrganelleInfoPanel(key: string): void {
    const infoEl = document.getElementById('selectedOrganelleInfo');
    if (!infoEl) return;

    const type = this.getOrganelleType(key);
    const info = ORGANELLE_INFO[type];

    const isMarked = this.scene.marks.some(m => m.organelleName === key);

    infoEl.innerHTML = `
      <div class="info-title">${info?.name || key}</div>
      <div class="info-row"><strong>类型:</strong> ${info?.name || '细胞器'}</div>
      <div class="info-row"><strong>空间位置:</strong> ${this.formatPosition(key)}</div>
      <div class="info-desc">${info?.function || '详细功能描述加载中...'}</div>
      <button class="mark-btn" id="markOrganelleBtn" ${isMarked ? 'disabled' : ''}>
        ${isMarked ? '✓ 已添加标记' : '📍 点击标记'}
      </button>
    `;

    const btn = document.getElementById('markOrganelleBtn');
    if (btn && !isMarked) {
      btn.addEventListener('click', () => {
        this.addCurrentMark();
      });
    }

    const mobilePanel = document.querySelector('.mobile-panel');
    if (mobilePanel && mobilePanel.classList.contains('open') && this.currentSidebarTab === 'info') {
      const mobileInfo = mobilePanel.querySelector('#selectedOrganelleInfo');
      if (mobileInfo) mobileInfo.innerHTML = infoEl.innerHTML;
      const mobBtn = mobilePanel.querySelector('.mark-btn');
      mobBtn?.addEventListener('click', () => this.addCurrentMark());
    }
  }

  private addCurrentMark(): void {
    if (!this.selectedOrganelle) return;

    const color = MARK_COLORS[this.markColorIndex % MARK_COLORS.length];
    this.markColorIndex++;

    const mark = this.scene.addMark(this.selectedOrganelle, color);
    if (mark) {
      this.updateMarkList();
      this.updateOrganelleInfoPanel(this.selectedOrganelle);
    }
  }

  private updateMarkList(): void {
    const listEl = document.getElementById('markList');
    if (!listEl) return;

    if (this.scene.marks.length === 0) {
      listEl.innerHTML = '<div class="mark-empty">暂无标记，双击细胞器后点击"点击标记"按钮添加</div>';
      return;
    }

    listEl.innerHTML = '';
    this.scene.marks.forEach((mark, idx) => {
      const type = this.getOrganelleType(mark.organelleName);
      const info = ORGANELLE_INFO[type];
      const colorHex = '#' + mark.color.toString(16).padStart(6, '0');

      const item = document.createElement('div');
      item.className = 'mark-item';
      item.innerHTML = `
        <div class="mark-color" style="background: ${colorHex}; color: ${colorHex}"></div>
        <div class="mark-info">
          <div class="mark-name">${info?.name || mark.organelleName}</div>
        </div>
      `;
      item.addEventListener('click', () => this.focusOnMark(mark));
      listEl.appendChild(item);
    });

    const mobilePanel = document.querySelector('.mobile-panel');
    if (mobilePanel && mobilePanel.classList.contains('open') && this.currentSidebarTab === 'marks') {
      const mobileList = mobilePanel.querySelector('.mark-list');
      if (mobileList) {
        mobileList.innerHTML = listEl.innerHTML;
        const items = mobileList.querySelectorAll('.mark-item');
        items.forEach((it, i) => {
          it.addEventListener('click', () => {
            if (this.scene.marks[i]) this.focusOnMark(this.scene.marks[i]);
          });
        });
      }
    }
  }

  private focusOnMark(mark: MarkData): void {
    for (const [key, obj] of this.scene.organelles) {
      if (key === mark.organelleName) {
        this.focusOnOrganelle(key);
        return;
      }
    }

    const pos = mark.position;
    this.animateCameraTo(pos, 4, null);
  }

  private focusOnOrganelle(key: string): void {
    const obj = this.scene.organelles.get(key);
    if (!obj) return;

    this.selectOrganelle(key);

    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);

    const type = this.getOrganelleType(key);
    let camDistance = 8;
    if (type === 'nucleus') camDistance = 6;
    else if (type === 'membrane') camDistance = 14;
    else if (type === 'mitochondrion') camDistance = 4;
    else if (type === 'golgi') camDistance = 6;
    else if (type === 'er') camDistance = 9;

    this.animateCameraTo(worldPos, camDistance, key);
  }

  private animateCameraTo(targetPos: THREE.Vector3, distance: number, organelleKey: string | null): void {
    this.zoomAnimation.startTime = performance.now();
    this.zoomAnimation.duration = 1200;
    this.zoomAnimation.startCamera = {
      theta: this.cameraState.theta,
      phi: this.cameraState.phi,
      distance: this.cameraState.distance,
      target: this.cameraState.target.clone()
    };

    const toTarget = new THREE.Vector3().subVectors(this.scene.camera.position, targetPos);
    const endTheta = Math.atan2(toTarget.x, toTarget.z);
    const endPhi = Math.acos(toTarget.y / toTarget.length());

    this.zoomAnimation.endCamera = {
      theta: endTheta,
      phi: Math.max(0.2, Math.min(Math.PI - 0.2, endPhi)),
      distance: distance,
      target: targetPos.clone()
    };
    this.zoomAnimation.organelleKey = organelleKey;
    this.zoomAnimation.active = true;
  }

  private resetView(): void {
    this.zoomAnimation.startTime = performance.now();
    this.zoomAnimation.duration = 1200;
    this.zoomAnimation.startCamera = {
      theta: this.cameraState.theta,
      phi: this.cameraState.phi,
      distance: this.cameraState.distance,
      target: this.cameraState.target.clone()
    };
    this.zoomAnimation.endCamera = {
      theta: this.defaultCameraState.theta,
      phi: this.defaultCameraState.phi,
      distance: this.defaultCameraState.distance,
      target: this.defaultCameraState.target.clone()
    };
    this.zoomAnimation.organelleKey = null;
    this.zoomAnimation.active = true;

    this.selectedOrganelle = null;
    this.showDefaultInfo();
  }

  private showDefaultInfo(): void {
    const infoEl = document.getElementById('selectedOrganelleInfo');
    if (!infoEl) return;
    infoEl.innerHTML = `
      <div class="info-title">细胞整体概览</div>
      <div class="info-row"><strong>类型:</strong> 真核动物细胞</div>
      <div class="info-row"><strong>直径:</strong> ~16 单位</div>
      <div class="info-row"><strong>主要结构:</strong> 细胞膜、细胞核、线粒体、内质网、高尔基体</div>
      <div class="info-desc">真核细胞具有完整的细胞核和各种膜结构细胞器。各细胞器协同工作，执行细胞的各项生命活动。双击任意细胞器可查看详细信息。</div>
    `;
  }

  private clearAllMarks(): void {
    this.scene.removeAllMarks();
    this.updateMarkList();
    if (this.selectedOrganelle) {
      this.updateOrganelleInfoPanel(this.selectedOrganelle);
    }
  }

  private toggleDisplayMode(): void {
    const modes: Array<'solid' | 'wireframe' | 'translucent'> = ['solid', 'wireframe', 'translucent'];
    const current = this.scene.getDisplayMode();
    const idx = modes.indexOf(current as any);
    const next = modes[(idx + 1) % modes.length];
    this.scene.setDisplayMode(next);
  }

  private takeScreenshot(): void {
    const dataUrl = this.scene.takeScreenshot();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cell-visualization-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private getOrganelleType(key: string): string {
    if (key.startsWith('mitochondrion_')) return 'mitochondrion';
    return key;
  }

  private formatPosition(key: string): string {
    const obj = this.scene.organelles.get(key);
    if (!obj) return '-';
    const pos = new THREE.Vector3();
    obj.getWorldPosition(pos);
    return `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.zoomAnimation.active) return;

    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.cameraState.distance *= factor;
    this.cameraState.distance = Math.max(5, Math.min(25, this.cameraState.distance));

    this.updateCameraFromState();
  }

  private updateCameraFromState(): void {
    const { theta, phi, distance, target } = this.cameraState;

    const x = target.x + distance * Math.sin(phi) * Math.sin(theta);
    const y = target.y + distance * Math.cos(phi);
    const z = target.z + distance * Math.sin(phi) * Math.cos(theta);

    this.scene.camera.position.set(x, y, z);
    this.scene.camera.lookAt(target);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public update(): void {
    if (this.zoomAnimation.active) {
      const now = performance.now();
      const t = Math.min(1, (now - this.zoomAnimation.startTime) / this.zoomAnimation.duration);
      const ease = this.easeOutCubic(t);

      const { startCamera: s, endCamera: e } = this.zoomAnimation;

      this.cameraState.theta = s.theta + (e.theta - s.theta) * ease;
      this.cameraState.phi = s.phi + (e.phi - s.phi) * ease;
      this.cameraState.distance = s.distance + (e.distance - s.distance) * ease;
      this.cameraState.target.lerpVectors(s.target, e.target, ease);

      this.updateCameraFromState();

      if (t >= 1) {
        this.zoomAnimation.active = false;
      }
    }

    if (this.selectedMolecule && this.infoLabel) {
      const pos = this.selectedMolecule.mesh.position.clone();
      pos.project(this.scene.camera);

      const rect = this.domElement.getBoundingClientRect();
      const x = rect.left + (pos.x + 1) / 2 * rect.width;
      const y = rect.top + (1 - pos.y) / 2 * rect.height;

      this.infoLabel.style.left = `${x}px`;
      this.infoLabel.style.top = `${y - 50}px`;
    }

    this.updateCompass();
  }

  private updateCompass(): void {
    if (!this.compassCanvas || !this.compassCtx) return;

    const ctx = this.compassCtx;
    const w = this.compassCanvas.width;
    const h = this.compassCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 6;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 30, 50, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 181, 246, 0.3)';
    ctx.stroke();

    const theta = this.cameraState.theta;
    const phi = this.cameraState.phi;

    const nx = cx - r * 0.7 * Math.sin(phi) * Math.sin(theta);
    const ny = cy - r * 0.7 * Math.cos(phi);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f5576c';
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 9px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#f5576c';
    ctx.font = 'bold 10px Segoe UI, sans-serif';
    ctx.fillText('N', cx, cy - r + 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px Segoe UI, sans-serif';
    ctx.fillText('S', cx, cy + r - 10);
    ctx.fillText('W', cx - r + 10, cy);
    ctx.fillText('E', cx + r - 10, cy);
  }
}
