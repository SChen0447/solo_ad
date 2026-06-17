import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { stateManager, SelectedRegion, MonthKey } from './stateManager';
import { latLonToVec3, vec3ToLatLon, RegionAnalysis } from './windDataService';

export interface InteractionCallbacks {
  onRegionAnalyzed: (analysis: RegionAnalysis, worldPoint: THREE.Vector3) => void;
  onClearSelection: () => void;
}

const EARTH_RADIUS = 1;
const SELECT_RADIUS_KM = 200;
const INDICATOR_RADIUS_KM = 60;

export class InteractionToolkit {
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private callbacks: InteractionCallbacks;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private earthMesh: THREE.Mesh | null = null;
  private indicatorMesh: THREE.Mesh | null = null;

  private isDragging = false;
  private isShiftDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDownTime = 0;

  private selectionBoxEl: HTMLDivElement | null = null;
  private animationFrameId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls,
    callbacks: InteractionCallbacks
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.controls = controls;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.bindEvents();
    this.setupUIControls();
    this.createSelectionBox();
  }

  setEarthMesh(mesh: THREE.Mesh): void {
    this.earthMesh = mesh;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('resize', this.onWindowResize);
  }

  private createSelectionBox(): void {
    this.selectionBoxEl = document.createElement('div');
    this.selectionBoxEl.style.position = 'absolute';
    this.selectionBoxEl.style.border = '2px dashed rgba(0, 191, 255, 0.8)';
    this.selectionBoxEl.style.background = 'rgba(0, 191, 255, 0.08)';
    this.selectionBoxEl.style.pointerEvents = 'none';
    this.selectionBoxEl.style.zIndex = '20';
    this.selectionBoxEl.style.borderRadius = '2px';
    this.selectionBoxEl.style.display = 'none';
    this.canvas.parentElement?.appendChild(this.selectionBoxEl);
  }

  private setupUIControls(): void {
    const monthButtons = document.querySelectorAll<HTMLButtonElement>('.month-btn');
    monthButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const month = btn.dataset.month as MonthKey;
        if (month && month !== stateManager.get('currentMonth')) {
          monthButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          stateManager.set('currentMonth', month);
        }
      });
    });

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement | null;
    const speedValue = document.getElementById('speed-value') as HTMLDivElement | null;
    if (speedSlider && speedValue) {
      const updateProgress = () => {
        const min = parseFloat(speedSlider.min);
        const max = parseFloat(speedSlider.max);
        const val = parseFloat(speedSlider.value);
        const progress = ((val - min) / (max - min)) * 100;
        speedSlider.style.setProperty('--progress', `${progress}%`);
      };

      updateProgress();

      speedSlider.addEventListener('input', () => {
        const val = parseFloat(speedSlider.value);
        stateManager.set('animationSpeed', val);
        speedValue.textContent = `${val.toFixed(1)}x`;
        updateProgress();
      });
    }

    const closeInfoBtn = document.getElementById('close-info-btn');
    if (closeInfoBtn) {
      closeInfoBtn.addEventListener('click', () => {
        this.clearSelection();
      });
    }
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    this.pointerDownTime = performance.now();
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    if (e.shiftKey) {
      this.isShiftDragging = true;
      this.controls.enabled = false;
      if (this.selectionBoxEl) {
        this.selectionBoxEl.style.display = 'block';
        this.selectionBoxEl.style.left = `${e.clientX}px`;
        this.selectionBoxEl.style.top = `${e.clientY}px`;
        this.selectionBoxEl.style.width = '0px';
        this.selectionBoxEl.style.height = '0px';
      }
    } else {
      this.isDragging = false;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = Math.abs(e.clientX - this.dragStartX);
    const dy = Math.abs(e.clientY - this.dragStartY);

    if (!this.isShiftDragging && !this.isDragging && (dx > 5 || dy > 5)) {
      this.isDragging = true;
    }

    if (this.isShiftDragging && this.selectionBoxEl) {
      const left = Math.min(this.dragStartX, e.clientX);
      const top = Math.min(this.dragStartY, e.clientY);
      const width = Math.abs(e.clientX - this.dragStartX);
      const height = Math.abs(e.clientY - this.dragStartY);
      this.selectionBoxEl.style.left = `${left}px`;
      this.selectionBoxEl.style.top = `${top}px`;
      this.selectionBoxEl.style.width = `${width}px`;
      this.selectionBoxEl.style.height = `${height}px`;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const upTime = performance.now();
    const elapsed = upTime - this.pointerDownTime;
    const dx = Math.abs(e.clientX - this.pointerDownX);
    const dy = Math.abs(e.clientY - this.pointerDownY);

    if (this.isShiftDragging) {
      const width = Math.abs(e.clientX - this.dragStartX);
      const height = Math.abs(e.clientY - this.dragStartY);
      if (width > 20 && height > 20) {
        this.handleBoxSelection(this.dragStartX, this.dragStartY, e.clientX, e.clientY);
      }
      this.isShiftDragging = false;
      this.controls.enabled = true;
      if (this.selectionBoxEl) {
        this.selectionBoxEl.style.display = 'none';
      }
      return;
    }

    const isClick = elapsed < 350 && dx < 6 && dy < 6 && !this.isDragging;
    this.isDragging = false;

    if (isClick && e.button === 0) {
      this.handleClick(e.clientX, e.clientY);
    }
  };

  private onPointerLeave = (_e: PointerEvent): void => {
    this.isDragging = false;
    if (this.isShiftDragging) {
      this.isShiftDragging = false;
      this.controls.enabled = true;
      if (this.selectionBoxEl) {
        this.selectionBoxEl.style.display = 'none';
      }
    }
  };

  private onWindowResize = (): void => {
    // handled by main
  };

  private updatePointer(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectEarth(clientX: number, clientY: number): THREE.Vector3 | null {
    if (!this.earthMesh) return null;

    this.updatePointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObject(this.earthMesh, false);
    if (intersects.length > 0 && intersects[0].point) {
      return intersects[0].point.clone();
    }

    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), EARTH_RADIUS * 1.01);
    const hitPoint = new THREE.Vector3();
    this.raycaster.ray.intersectSphere(sphere, hitPoint);
    if (hitPoint.lengthSq() > 0) {
      return hitPoint;
    }

    return null;
  }

  private handleClick(clientX: number, clientY: number): void {
    const hitPoint = this.intersectEarth(clientX, clientY);
    if (!hitPoint) return;

    const { lat, lon } = vec3ToLatLon(hitPoint);

    const region: SelectedRegion = {
      lat,
      lon,
      radiusKm: SELECT_RADIUS_KM,
    };

    stateManager.set('selectedRegion', region);

    this.showIndicator(hitPoint);

    this.canvas.dispatchEvent(new CustomEvent('regionSelected', {
      detail: { lat, lon, worldPoint: hitPoint, region }
    }));
  }

  private handleBoxSelection(x1: number, y1: number, x2: number, y2: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const leftScreen = Math.min(x1, x2);
    const rightScreen = Math.max(x1, x2);
    const topScreen = Math.min(y1, y2);
    const bottomScreen = Math.max(y1, y2);

    const cx = (leftScreen + rightScreen) / 2;
    const cy = (topScreen + bottomScreen) / 2;
    const centerPoint = this.intersectEarth(cx, cy);

    let zoomFactor = 1.0;
    const boxW = (rightScreen - leftScreen) / rect.width;
    const boxH = (bottomScreen - topScreen) / rect.height;
    const boxArea = boxW * boxH;

    if (boxArea < 0.01) {
      zoomFactor = 2.8;
    } else if (boxArea < 0.03) {
      zoomFactor = 2.2;
    } else if (boxArea < 0.08) {
      zoomFactor = 1.7;
    } else if (boxArea < 0.2) {
      zoomFactor = 1.3;
    } else {
      zoomFactor = 1.0;
    }

    if (centerPoint) {
      const startPos = this.camera.position.clone();
      const startTarget = this.controls.target.clone();
      const direction = centerPoint.clone().normalize();
      const currentDist = this.camera.position.length();
      const targetDist = currentDist / zoomFactor;
      const minDist = 0.5;
      const maxDist = 3.0;
      const finalDist = Math.max(minDist, Math.min(maxDist, targetDist));

      const endPos = direction.multiplyScalar(finalDist);
      const endTarget = centerPoint.clone().multiplyScalar(0.3);

      this.animateCamera(startPos, endPos, startTarget, endTarget, 600);
    } else {
      const currentDist = this.camera.position.length();
      const targetDist = currentDist / zoomFactor;
      const minDist = 0.5;
      const maxDist = 3.0;
      const finalDist = Math.max(minDist, Math.min(maxDist, targetDist));
      const startPos = this.camera.position.clone();
      const endPos = this.camera.position.clone().normalize().multiplyScalar(finalDist);
      const startTarget = this.controls.target.clone();

      this.animateCamera(startPos, endPos, startTarget, startTarget.clone(), 600);
    }
  }

  private animateCamera(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    startTarget: THREE.Vector3,
    endTarget: THREE.Vector3,
    durationMs: number
  ): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.controls.enabled = false;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, endPos, easeT);
      this.controls.target.lerpVectors(startTarget, endTarget, easeT);
      this.camera.lookAt(this.controls.target);
      this.controls.update();

      if (t < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
        this.controls.enabled = true;
      }
    };
    animate();
  }

  private showIndicator(worldPoint: THREE.Vector3): void {
    this.clearIndicator();

    const surfacePoint = worldPoint.clone().normalize();
    const group = new THREE.Group();

    const ringGeo = new THREE.RingGeometry(0.05, 0.075, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    const normal = surfacePoint.clone();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    ring.position.copy(surfacePoint.clone().multiplyScalar(EARTH_RADIUS * 1.005));
    ring.quaternion.copy(quaternion);

    const diskGeo = new THREE.CircleGeometry(0.01, 24);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.position.copy(surfacePoint.clone().multiplyScalar(EARTH_RADIUS * 1.006));
    disk.quaternion.copy(quaternion);

    group.add(ring);
    group.add(disk);
    group.userData.type = 'indicator';

    this.indicatorMesh = group as unknown as THREE.Mesh;
    this.scene.add(group);
    this.animateIndicatorPulse(group);
  }

  private animateIndicatorPulse(group: THREE.Group): void {
    const startTime = performance.now();
    const ring = group.children[0] as THREE.Mesh;
    const originalScale = ring.scale.clone();

    const animate = () => {
      if (!group.parent) return;
      if (this.indicatorMesh !== (group as unknown as THREE.Mesh)) return;

      const elapsed = (performance.now() - startTime) / 1000;
      const pulse = 1 + Math.sin(elapsed * 3) * 0.12;
      ring.scale.set(originalScale.x * pulse, originalScale.y * pulse, 1);

      requestAnimationFrame(animate);
    };
    animate();
  }

  clearIndicator(): void {
    if (this.indicatorMesh) {
      const obj = this.indicatorMesh as unknown as THREE.Object3D;
      this.scene.remove(obj);
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
      this.indicatorMesh = null;
    }
  }

  clearSelection(): void {
    this.clearIndicator();
    stateManager.set('selectedRegion', null);
    this.callbacks.onClearSelection();
    const infoCard = document.getElementById('info-card');
    if (infoCard) {
      infoCard.classList.add('hidden');
    }
  }

  showInfoCard(analysis: RegionAnalysis): void {
    const card = document.getElementById('info-card');
    if (!card) return;

    const latEl = document.getElementById('info-lat');
    const lonEl = document.getElementById('info-lon');
    const speedEl = document.getElementById('info-speed');
    const dirEl = document.getElementById('info-dir');

    if (latEl) latEl.textContent = `${analysis.centerLat.toFixed(2)}°`;
    if (lonEl) lonEl.textContent = `${analysis.centerLon.toFixed(2)}°`;
    if (speedEl) speedEl.textContent = `${analysis.avgSpeed.toFixed(1)} m/s`;
    if (dirEl) dirEl.textContent = analysis.dominantDirection;

    card.classList.remove('hidden');
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('resize', this.onWindowResize);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.clearIndicator();

    if (this.selectionBoxEl && this.selectionBoxEl.parentElement) {
      this.selectionBoxEl.parentElement.removeChild(this.selectionBoxEl);
    }
  }
}

export default InteractionToolkit;
