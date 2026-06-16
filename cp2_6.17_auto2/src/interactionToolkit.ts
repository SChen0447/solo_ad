import * as THREE from 'three';
import { stateManager, type SelectedRegion } from './stateManager';

interface InteractionToolkitOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  earthRadius: number;
  onRegionSelect?: (lat: number, lon: number) => void;
}

class InteractionToolkit {
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private earthRadius: number;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onRegionSelect?: (lat: number, lon: number) => void;

  private isDragging: boolean = false;
  private isShiftDragging: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private selectionBox: HTMLDivElement | null = null;

  private hasMoved: boolean = false;
  private moveThreshold: number = 5;

  constructor(options: InteractionToolkitOptions) {
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.earthRadius = options.earthRadius;
    this.onRegionSelect = options.onRegionSelect;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.createSelectionBox();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private createSelectionBox(): void {
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.position = 'fixed';
    this.selectionBox.style.border = '2px dashed #ffffff';
    this.selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.selectionBox.style.pointerEvents = 'none';
    this.selectionBox.style.display = 'none';
    this.selectionBox.style.zIndex = '1000';
    document.body.appendChild(this.selectionBox);
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.isDragging = true;
    this.hasMoved = false;
    this.dragStart = { x: event.clientX, y: event.clientY };

    if (event.shiftKey) {
      this.isShiftDragging = true;
      if (this.selectionBox) {
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = `${event.clientX}px`;
        this.selectionBox.style.top = `${event.clientY}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const dx = Math.abs(event.clientX - this.dragStart.x);
    const dy = Math.abs(event.clientY - this.dragStart.y);
    if (dx > this.moveThreshold || dy > this.moveThreshold) {
      this.hasMoved = true;
    }

    if (this.isShiftDragging && this.selectionBox) {
      const left = Math.min(this.dragStart.x, event.clientX);
      const top = Math.min(this.dragStart.y, event.clientY);
      const width = Math.abs(event.clientX - this.dragStart.x);
      const height = Math.abs(event.clientY - this.dragStart.y);

      this.selectionBox.style.left = `${left}px`;
      this.selectionBox.style.top = `${top}px`;
      this.selectionBox.style.width = `${width}px`;
      this.selectionBox.style.height = `${height}px`;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;

    if (this.isShiftDragging && this.selectionBox) {
      const width = Math.abs(event.clientX - this.dragStart.x);
      const height = Math.abs(event.clientY - this.dragStart.y);

      if (width > 10 && height > 10) {
        this.handleBoxZoom(this.dragStart.x, this.dragStart.y, event.clientX, event.clientY);
      }

      this.selectionBox.style.display = 'none';
      this.isShiftDragging = false;
    } else if (!this.hasMoved) {
      this.handleClick(event.clientX, event.clientY);
    }

    this.isDragging = false;
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), this.earthRadius);
    const intersectPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectSphere(sphere, intersectPoint);

    if (hit) {
      const { lat, lon } = this.vec3ToLatLon(intersectPoint);

      const selectedRegion: SelectedRegion = {
        lat,
        lon,
        radiusKm: 200,
      };
      stateManager.set('selectedRegion', selectedRegion);

      if (this.onRegionSelect) {
        this.onRegionSelect(lat, lon);
      }
    }
  }

  private handleBoxZoom(x1: number, y1: number, x2: number, y2: number): void {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((centerX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((centerY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), this.earthRadius);
    const intersectPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectSphere(sphere, intersectPoint);

    if (hit) {
      const boxWidth = Math.abs(x2 - x1);
      const zoomFactor = rect.width / boxWidth;
      const newZoom = Math.max(0.5, Math.min(3, stateManager.get('zoomLevel') * zoomFactor));
      stateManager.set('zoomLevel', newZoom);
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const currentZoom = stateManager.get('zoomLevel');
    const newZoom = Math.max(0.5, Math.min(3, currentZoom * delta));
    stateManager.set('zoomLevel', newZoom);
  }

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      this.isDragging = true;
      this.hasMoved = false;
      this.dragStart = { x: touch.clientX, y: touch.clientY };
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isDragging) {
      event.preventDefault();
      const touch = event.touches[0];
      const dx = Math.abs(touch.clientX - this.dragStart.x);
      const dy = Math.abs(touch.clientY - this.dragStart.y);
      if (dx > this.moveThreshold || dy > this.moveThreshold) {
        this.hasMoved = true;
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1 && !this.hasMoved) {
      event.preventDefault();
      const touch = event.changedTouches[0];
      this.handleClick(touch.clientX, touch.clientY);
    }
    this.isDragging = false;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      stateManager.set('selectedRegion', null);
      stateManager.set('zoomLevel', 1);
    }
  }

  private vec3ToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
    const normalized = vec.clone().normalize();
    const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
    let lon = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;
    return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));

    if (this.selectionBox) {
      document.body.removeChild(this.selectionBox);
      this.selectionBox = null;
    }
  }
}

export { InteractionToolkit };
