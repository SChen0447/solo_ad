import * as THREE from 'three';
import type { SoundSourceInstance, SoundSourceType } from './types';
import { SceneManager } from './sceneManager';
import { AudioManager } from './audioManager';
import { MOVEMENT_SPEED, MAX_SOURCES } from './presets';
import { SOUND_SOURCE_META } from './presets';

export class InteractionManager {
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  private selectedSource: SoundSourceInstance | null = null;
  private hoveredSource: SoundSourceInstance | null = null;
  private isDragging = false;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;

  private keys: Set<string> = new Set();
  private movementVector: THREE.Vector3 = new THREE.Vector3();

  private tooltipEl: HTMLElement | null = null;
  private tooltipNameEl: HTMLElement | null = null;
  private tooltipCoordEl: HTMLElement | null = null;
  private tooltipVolumeEl: HTMLElement | null = null;

  private onSourceCreatedCallback: ((source: SoundSourceInstance) => void) | null = null;
  private onSourceRemovedCallback: ((source: SoundSourceInstance) => void) | null = null;

  constructor(
    sceneManager: SceneManager,
    audioManager: AudioManager,
    container: HTMLElement
  ) {
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.camera = sceneManager.camera;
    this.domElement = sceneManager.getRendererDomElement();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();

    this.tooltipEl = document.getElementById('tooltip');
    this.tooltipNameEl = document.getElementById('tooltip-name');
    this.tooltipCoordEl = document.getElementById('tooltip-coord');
    this.tooltipVolumeEl = document.getElementById('tooltip-volume');

    this.setupEventListeners(container);
  }

  private setupEventListeners(container: HTMLElement): void {
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    const soundItems = document.querySelectorAll('.sound-item');
    soundItems.forEach(item => {
      item.addEventListener('dragstart', this.onDragStart.bind(this));
      item.addEventListener('dragend', this.onDragEnd.bind(this));
    });

    container.addEventListener('dragover', this.onDragOver.bind(this));
    container.addEventListener('drop', this.onDrop.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    if (this.isDragging && this.selectedSource) {
      this.handleDrag();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.sceneManager.getRaycastableObjects()
    );

    if (intersects.length > 0) {
      const object = intersects[0].object;
      const sourceId = object.userData.sourceId;
      const source = this.sceneManager.getSourceById(sourceId);
      
      if (source) {
        this.handleHover(source, event);
      } else {
        this.handleHover(null, event);
      }
    } else {
      this.handleHover(null, event);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.sceneManager.getRaycastableObjects()
    );

    if (intersects.length > 0) {
      const object = intersects[0].object;
      const sourceId = object.userData.sourceId;
      const source = this.sceneManager.getSourceById(sourceId);
      
      if (source) {
        this.selectSource(source);
        this.startDrag(source, intersects[0].point);
      } else {
        this.selectSource(null);
      }
    } else {
      this.selectSource(null);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.handleHover(null);
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const delta = event.deltaY * 0.01;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.camera.position.addScaledVector(direction, -delta * 2);
    
    const minDistance = 5;
    const maxDistance = 30;
    const currentDistance = this.camera.position.length();
    if (currentDistance < minDistance) {
      this.camera.position.normalize().multiplyScalar(minDistance);
    } else if (currentDistance > maxDistance) {
      this.camera.position.normalize().multiplyScalar(maxDistance);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key.toLowerCase());
    
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedSource) {
        this.removeSelectedSource();
      }
    }
    
    if (event.key === 'Escape') {
      this.selectSource(null);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }

  private onDragStart(event: DragEvent): void {
    const type = (event.target as HTMLElement).dataset.type as SoundSourceType;
    if (type) {
      event.dataTransfer?.setData('text/plain', type);
      (event.target as HTMLElement).style.opacity = '0.5';
    }
  }

  private onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).style.opacity = '1';
  }

  private onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    
    const type = event.dataTransfer?.getData('text/plain') as SoundSourceType;
    if (!type) return;

    if (this.sceneManager.getSourceCount() >= MAX_SOURCES) {
      alert(`最多只能放置 ${MAX_SOURCES} 个音源`);
      return;
    }

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
      const source = this.sceneManager.createSoundSource(type, intersectPoint);
      source.audioNodes = this.audioManager.createAudioNodes(type, 0.5);
      this.audioManager.updateSourcePosition(source, intersectPoint.x, intersectPoint.y, intersectPoint.z);
      
      if (this.onSourceCreatedCallback) {
        this.onSourceCreatedCallback(source);
      }
      
      this.selectSource(source);
    }
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleHover(source: SoundSourceInstance | null, event?: MouseEvent): void {
    if (source === this.hoveredSource) return;

    if (this.hoveredSource) {
      this.sceneManager.setSourceHovered(this.hoveredSource, false);
    }

    this.hoveredSource = source;

    if (source) {
      this.sceneManager.setSourceHovered(source, true);
      if (event) {
        this.showTooltip(source, event);
      }
    } else {
      this.hideTooltip();
    }
  }

  private showTooltip(source: SoundSourceInstance, event: MouseEvent): void {
    if (!this.tooltipEl || !this.tooltipNameEl || !this.tooltipCoordEl || !this.tooltipVolumeEl) return;

    const meta = SOUND_SOURCE_META[source.type];
    const pos = source.group.position;
    const volume = this.audioManager.getSourceVolume(source);

    this.tooltipNameEl.textContent = meta.name;
    this.tooltipNameEl.style.color = meta.color;
    this.tooltipCoordEl.textContent = `X: ${pos.x.toFixed(1)}  Y: ${pos.y.toFixed(1)}  Z: ${pos.z.toFixed(1)}`;
    this.tooltipVolumeEl.style.width = `${volume * 100}%`;

    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = `${event.clientX + 15}px`;
    this.tooltipEl.style.top = `${event.clientY + 15}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  public updateTooltip(): void {
    if (this.hoveredSource && this.tooltipVolumeEl) {
      const volume = this.audioManager.getSourceVolume(this.hoveredSource);
      this.tooltipVolumeEl.style.width = `${volume * 100}%`;
    }
  }

  private selectSource(source: SoundSourceInstance | null): void {
    this.selectedSource = source;
    this.sceneManager.selectSource(source);
  }

  private startDrag(source: SoundSourceInstance, intersectPoint: THREE.Vector3): void {
    this.isDragging = true;
    
    const planeNormal = new THREE.Vector3(0, 1, 0);
    this.dragPlane.setFromNormalAndCoplanarPoint(
      planeNormal,
      source.group.position
    );
    
    this.dragOffset.copy(source.group.position).sub(intersectPoint);
  }

  private handleDrag(): void {
    if (!this.selectedSource) return;

    const intersectPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
      const newPosition = intersectPoint.add(this.dragOffset);
      newPosition.y = Math.max(0.5, Math.min(10, newPosition.y));
      
      this.sceneManager.updateSourcePosition(this.selectedSource, newPosition);
      this.audioManager.updateSourcePosition(
        this.selectedSource,
        newPosition.x,
        newPosition.y,
        newPosition.z
      );
    }
  }

  private removeSelectedSource(): void {
    if (!this.selectedSource) return;
    
    this.audioManager.disposeSource(this.selectedSource);
    
    if (this.onSourceRemovedCallback) {
      this.onSourceRemovedCallback(this.selectedSource);
    }
    
    this.sceneManager.removeSource(this.selectedSource);
    this.selectedSource = null;
    this.hoveredSource = null;
    this.hideTooltip();
  }

  public getSelectedSource(): SoundSourceInstance | null {
    return this.selectedSource;
  }

  public update(deltaTime: number): void {
    if (!this.selectedSource || this.isDragging) return;

    this.movementVector.set(0, 0, 0);
    const speed = MOVEMENT_SPEED * deltaTime;

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this.movementVector.add(cameraDirection.clone().multiplyScalar(speed));
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this.movementVector.add(cameraDirection.clone().multiplyScalar(-speed));
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.movementVector.add(cameraRight.clone().multiplyScalar(-speed));
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.movementVector.add(cameraRight.clone().multiplyScalar(speed));
    }
    if (this.keys.has('q')) {
      this.movementVector.y -= speed;
    }
    if (this.keys.has('e')) {
      this.movementVector.y += speed;
    }

    if (this.movementVector.length() > 0) {
      const newPosition = this.selectedSource.group.position.clone().add(this.movementVector);
      newPosition.y = Math.max(0.5, Math.min(10, newPosition.y));
      newPosition.x = Math.max(-14, Math.min(14, newPosition.x));
      newPosition.z = Math.max(-14, Math.min(14, newPosition.z));
      
      this.sceneManager.updateSourcePosition(this.selectedSource, newPosition);
      this.audioManager.updateSourcePosition(
        this.selectedSource,
        newPosition.x,
        newPosition.y,
        newPosition.z
      );
    }
  }

  public onSourceCreated(callback: (source: SoundSourceInstance) => void): void {
    this.onSourceCreatedCallback = callback;
  }

  public onSourceRemoved(callback: (source: SoundSourceInstance) => void): void {
    this.onSourceRemovedCallback = callback;
  }

  public clearAllSources(): void {
    const sources = this.sceneManager.getSources();
    sources.forEach(source => {
      this.audioManager.disposeSource(source);
      this.sceneManager.removeSource(source);
    });
    this.selectedSource = null;
    this.hoveredSource = null;
    this.hideTooltip();
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
