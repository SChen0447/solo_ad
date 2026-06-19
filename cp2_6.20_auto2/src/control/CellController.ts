import * as THREE from 'three';
import { CellScene, Organelle, MRNA, Mark, DisplayMode } from '../scene/CellScene';

interface CameraState {
  spherical: THREE.Spherical;
  target: THREE.Vector3;
}

export class CellController {
  private scene: CellScene;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private isRightDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private cameraState: CameraState;
  private minZoom: number = 5;
  private maxZoom: number = 25;

  private focusAnimation: {
    active: boolean;
    startTime: number;
    duration: number;
    fromSpherical: THREE.Spherical;
    toSpherical: THREE.Spherical;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null = null;

  private selectedMRNA: MRNA | null = null;
  private focusedOrganelle: Organelle | null = null;

  private lastClickTime: number = 0;
  private doubleClickDelay: number = 300;

  private compassCanvas: HTMLCanvasElement;
  private compassCtx: CanvasRenderingContext2D;

  private onMarksChange: (() => void) | null = null;
  private onFocusChange: ((organelle: Organelle | null) => void) | null = null;

  constructor(scene: CellScene, container: HTMLElement) {
    this.scene = scene;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const camera = scene.camera;
    this.cameraState = {
      spherical: new THREE.Spherical().setFromVector3(camera.position),
      target: new THREE.Vector3(0, 0, 0)
    };

    this.compassCanvas = document.getElementById('compass') as HTMLCanvasElement;
    this.compassCtx = this.compassCanvas.getContext('2d')!;
    this.resizeCompass();

    this.bindEvents();
    this.updateCompass();
  }

  private resizeCompass(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.compassCanvas.getBoundingClientRect();
    this.compassCanvas.width = rect.width * dpr;
    this.compassCanvas.height = rect.height * dpr;
    this.compassCtx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    const canvas = this.scene.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);

    window.addEventListener('resize', () => {
      this.resizeCompass();
      this.updateCompass();
    });
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      const now = Date.now();
      if (now - this.lastClickTime < this.doubleClickDelay) {
        this.handleDoubleClick(e);
        this.lastClickTime = 0;
      } else {
        this.lastClickTime = now;
      }
    } else if (e.button === 2) {
      this.isRightDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.focusAnimation?.active) return;

    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.cameraState.spherical.theta -= deltaX * 0.005;

      let newPhi = this.cameraState.spherical.phi - deltaY * 0.005;
      newPhi = Math.max(0.05, Math.min(Math.PI - 0.05, newPhi));
      this.cameraState.spherical.phi = newPhi;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCameraFromSpherical();
      this.updateCompass();
    } else if (this.isRightDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      const panSpeed = this.cameraState.spherical.radius * 0.001;
      const camera = this.scene.camera;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());

      this.cameraState.target.add(right.multiplyScalar(-deltaX * panSpeed));
      this.cameraState.target.add(up.multiplyScalar(deltaY * panSpeed));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCameraFromSpherical();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      if (this.isDragging && Math.abs(e.clientX - this.lastMouseX) < 3 && Math.abs(e.clientY - this.lastMouseY) < 3) {
        this.handleClick(e);
      }
      this.isDragging = false;
    } else if (e.button === 2) {
      this.isRightDragging = false;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.focusAnimation?.active) return;

    const zoomSpeed = 0.001;
    let newRadius = this.cameraState.spherical.radius + e.deltaY * zoomSpeed * this.cameraState.spherical.radius;
    newRadius = Math.max(this.minZoom, Math.min(this.maxZoom, newRadius));
    this.cameraState.spherical.radius = newRadius;
    this.updateCameraFromSpherical();
    this.updateCompass();
  };

  private touchStartDist: number = 0;
  private touchStartRadius: number = 0;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.focusAnimation?.active) return;

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
      this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartRadius = this.cameraState.spherical.radius;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.focusAnimation?.active) return;

    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.lastTouchX;
      const deltaY = e.touches[0].clientY - this.lastTouchY;

      this.cameraState.spherical.theta -= deltaX * 0.005;
      let newPhi = this.cameraState.spherical.phi - deltaY * 0.005;
      newPhi = Math.max(0.05, Math.min(Math.PI - 0.05, newPhi));
      this.cameraState.spherical.phi = newPhi;

      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
      this.updateCameraFromSpherical();
      this.updateCompass();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = this.touchStartDist / dist;
      let newRadius = this.touchStartRadius * scale;
      newRadius = Math.max(this.minZoom, Math.min(this.maxZoom, newRadius));
      this.cameraState.spherical.radius = newRadius;
      this.updateCameraFromSpherical();
      this.updateCompass();
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging) {
      const now = Date.now();
      const dx = this.lastTouchX - this.touchStartPos.x;
      const dy = this.lastTouchY - this.touchStartPos.y;
      const moveDist = Math.sqrt(dx * dx + dy * dy);

      if (now - this.touchStartTime < 300 && moveDist < 10) {
        const fakeEvent = {
          clientX: this.lastTouchX,
          clientY: this.lastTouchY
        } as MouseEvent;
        this.handleClick(fakeEvent);
      }
    }
    this.isDragging = false;
  };

  private updateCameraFromSpherical(): void {
    const camera = this.scene.camera;
    const offset = new THREE.Vector3().setFromSpherical(this.cameraState.spherical);
    camera.position.copy(this.cameraState.target).add(offset);
    camera.lookAt(this.cameraState.target);
  }

  private updateMouseNDC(e: { clientX: number; clientY: number }): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(e: { clientX: number; clientY: number }): void {
    this.updateMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    for (const mrna of this.scene.mRNAParticles) {
      const intersects = this.raycaster.intersectObject(mrna.mesh, false);
      if (intersects.length > 0) {
        this.selectMRNA(mrna, e);
        return;
      }
    }

    this.hideMRNALabel();
  }

  private handleDoubleClick(e: { clientX: number; clientY: number }): void {
    this.updateMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    for (const organelle of this.scene.organelles) {
      const intersects = this.raycaster.intersectObject(organelle.mesh, true);
      if (intersects.length > 0) {
        this.focusOrganelle(organelle);
        return;
      }
    }
  }

  private selectMRNA(mrna: MRNA, e: { clientX: number; clientY: number }): void {
    if (this.selectedMRNA === mrna) {
      mrna.paused = false;
      this.hideMRNALabel();
      this.selectedMRNA = null;
      return;
    }

    if (this.selectedMRNA) {
      this.selectedMRNA.paused = false;
    }

    mrna.paused = true;
    this.selectedMRNA = mrna;
    this.showMRNALabel(e.clientX, e.clientY, mrna);
  }

  private showMRNALabel(x: number, y: number, mrna: MRNA): void {
    const label = document.getElementById('particle-label')!;
    const text = mrna.bound
      ? 'mRNA分子，已与核糖体结合，正在翻译蛋白质'
      : 'mRNA分子，正在向细胞膜方向运输，速度0.5单位/秒';
    label.textContent = text;
    label.style.display = 'block';
    label.style.left = (x + 15) + 'px';
    label.style.top = (y - 10) + 'px';
  }

  public hideMRNALabel(): void {
    const label = document.getElementById('particle-label');
    if (label) {
      label.style.display = 'none';
    }
  }

  public focusOrganelle(organelle: Organelle): void {
    this.focusedOrganelle = organelle;

    const offsetDir = organelle.mesh.position.clone().normalize();
    const targetPos = organelle.mesh.position.clone();

    const targetSpherical = new THREE.Spherical(
      8,
      this.cameraState.spherical.phi,
      this.cameraState.spherical.theta
    );

    const fromOffset = new THREE.Vector3().setFromSpherical(this.cameraState.spherical);
    const fromPos = this.cameraState.target.clone().add(fromOffset);
    const fromSpherical = new THREE.Spherical().setFromVector3(
      fromPos.clone().sub(targetPos)
    );

    this.focusAnimation = {
      active: true,
      startTime: performance.now(),
      duration: 1200,
      fromSpherical: fromSpherical,
      toSpherical: targetSpherical,
      fromTarget: this.cameraState.target.clone(),
      toTarget: targetPos
    };

    if (this.onFocusChange) {
      this.onFocusChange(organelle);
    }
  }

  public focusMark(mark: Mark): void {
    this.focusOrganelle(mark.organelle);
  }

  public setOnFocusChange(callback: (organelle: Organelle | null) => void): void {
    this.onFocusChange = callback;
  }

  public setOnMarksChange(callback: () => void): void {
    this.onMarksChange = callback;
  }

  public getFocusedOrganelle(): Organelle | null {
    return this.focusedOrganelle;
  }

  public markFocusedOrganelle(): Mark | null {
    if (!this.focusedOrganelle) return null;
    const mark = this.scene.addMark(this.focusedOrganelle);
    if (mark && this.onMarksChange) {
      this.onMarksChange();
    }
    return mark;
  }

  public removeMark(mark: Mark): void {
    this.scene.removeMark(mark);
    if (this.onMarksChange) {
      this.onMarksChange();
    }
  }

  public clearAllMarks(): void {
    this.scene.clearAllMarks();
    if (this.onMarksChange) {
      this.onMarksChange();
    }
  }

  public getMarks(): Mark[] {
    return this.scene.marks;
  }

  public resetView(): void {
    this.focusedOrganelle = null;
    this.focusAnimation = {
      active: true,
      startTime: performance.now(),
      duration: 800,
      fromSpherical: this.cameraState.spherical.clone(),
      toSpherical: new THREE.Spherical(18, Math.PI / 2, 0),
      fromTarget: this.cameraState.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0)
    };
    if (this.onFocusChange) {
      this.onFocusChange(null);
    }
  }

  public toggleDisplayMode(): void {
    const modes: DisplayMode[] = ['solid', 'wireframe', 'transparent'];
    const currentIdx = modes.indexOf(this.scene.getDisplayMode());
    const nextMode = modes[(currentIdx + 1) % modes.length];
    this.scene.setDisplayMode(nextMode);
  }

  public getDisplayMode(): DisplayMode {
    return this.scene.getDisplayMode();
  }

  public screenshot(): void {
    const dataUrl = this.scene.getScreenshotDataURL();
    const link = document.createElement('a');
    link.download = `cell-visualization-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  public toggleTransport(active: boolean): void {
    this.scene.setTransportActive(active);
  }

  public isTransportActive(): boolean {
    return this.scene.isTransportActive();
  }

  public easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public getSelectedMRNA(): MRNA | null {
    return this.selectedMRNA;
  }

  public setSelectedMRNA(mrna: MRNA | null): void {
    if (this.selectedMRNA) {
      this.selectedMRNA.paused = false;
    }
    this.selectedMRNA = mrna;
    if (mrna) {
      mrna.paused = true;
    }
  }

  private lerpSpherical(a: THREE.Spherical, b: THREE.Spherical, t: number): THREE.Spherical {
    return new THREE.Spherical(
      a.radius + (b.radius - a.radius) * t,
      a.phi + (b.phi - a.phi) * t,
      a.theta + (b.theta - a.theta) * t
    );
  }

  public update(): void {
    if (this.focusAnimation?.active) {
      const elapsed = performance.now() - this.focusAnimation.startTime;
      const t = Math.min(elapsed / this.focusAnimation.duration, 1);
      const eased = this.easeOutCubic(t);

      const newSpherical = this.lerpSpherical(
        this.focusAnimation.fromSpherical,
        this.focusAnimation.toSpherical,
        eased
      );
      const newTarget = new THREE.Vector3().lerpVectors(
        this.focusAnimation.fromTarget,
        this.focusAnimation.toTarget,
        eased
      );

      this.cameraState.spherical = newSpherical;
      this.cameraState.target = newTarget;
      this.updateCameraFromSpherical();
      this.updateCompass();

      if (t >= 1) {
        this.focusAnimation.active = false;
      }
    }

    if (this.selectedMRNA && this.selectedMRNA.paused) {
      const vector = this.selectedMRNA.mesh.position.clone().project(this.scene.camera);
      const rect = this.container.getBoundingClientRect();
      const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;
      const label = document.getElementById('particle-label');
      if (label && label.style.display !== 'none') {
        label.style.left = (x + 15) + 'px';
        label.style.top = (y - 10) + 'px';
      }
    }
  }

  private updateCompass(): void {
    const ctx = this.compassCtx;
    const rect = this.compassCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 6;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const theta = this.cameraState.spherical.theta;
    const phi = this.cameraState.spherical.phi;

    const dirX = -Math.sin(theta) * Math.sin(phi);
    const dirY = Math.cos(phi);
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
    const arrowLen = radius * 0.7;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + (dirX / dirLen) * arrowLen,
      cy - (dirY / dirLen) * arrowLen
    );
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    const tipAngle = Math.atan2(-dirY, dirX);
    const tipLen = 8;
    ctx.beginPath();
    ctx.moveTo(
      cx + (dirX / dirLen) * arrowLen,
      cy - (dirY / dirLen) * arrowLen
    );
    ctx.lineTo(
      cx + (dirX / dirLen) * arrowLen - tipLen * Math.cos(tipAngle - Math.PI / 6),
      cy - (dirY / dirLen) * arrowLen - tipLen * Math.sin(tipAngle - Math.PI / 6)
    );
    ctx.lineTo(
      cx + (dirX / dirLen) * arrowLen - tipLen * Math.cos(tipAngle + Math.PI / 6),
      cy - (dirY / dirLen) * arrowLen - tipLen * Math.sin(tipAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = '#7c3aed';
    ctx.fill();

    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - radius + 10);
    ctx.fillText('S', cx, cy + radius - 10);
    ctx.fillText('E', cx + radius - 10, cy);
    ctx.fillText('W', cx - radius + 10, cy);
  }
}
