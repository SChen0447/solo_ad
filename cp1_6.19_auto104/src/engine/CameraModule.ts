import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from './EventBus';
import type { ViewMode } from '../types';
import { lerp, easeInOutCubic } from '../utils/animation';

interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class CameraModule {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private viewMode: ViewMode = 'free';
  private targetPosition: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private animationDuration: number = 1000;
  private startPosition: THREE.Vector3;
  private startLookAt: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.startPosition = new THREE.Vector3();
    this.startLookAt = new THREE.Vector3();

    this.setupInitialPosition();
    this.setupEventListeners();
  }

  private setupInitialPosition(): void {
    this.camera.position.set(0, 3, 8);
    this.controls.target.set(0, 0, 0);
    this.targetPosition.copy(this.camera.position);
    this.targetLookAt.copy(this.controls.target);
  }

  private setupEventListeners(): void {
    eventBus.on('RELIC_SELECTED', () => {
      if (this.viewMode === 'free') {
        this.animateToPreset('panoramic');
      } else if (this.viewMode === 'focus') {
        this.animateToPreset('focus');
      }
    });

    eventBus.on('VIEW_MODE_CHANGED', ({ mode }) => {
      this.viewMode = mode;
      this.animateToPreset(mode);
    });
  }

  private getPresetPosition(mode: ViewMode | 'panoramic'): CameraPreset {
    switch (mode) {
      case 'panoramic':
        return {
          position: new THREE.Vector3(0, 3, 8),
          target: new THREE.Vector3(0, 0, 0)
        };
      case 'focus':
        return {
          position: new THREE.Vector3(0, 1.5, 4),
          target: new THREE.Vector3(0, 0, 0)
        };
      case 'explosion':
        return {
          position: new THREE.Vector3(0, 4, 10),
          target: new THREE.Vector3(0, 0, 0)
        };
      case 'free':
      default:
        return {
          position: this.camera.position.clone(),
          target: this.controls.target.clone()
        };
    }
  }

  public animateToPreset(mode: ViewMode | 'panoramic'): void {
    const preset = this.getPresetPosition(mode);
    
    this.startPosition.copy(this.camera.position);
    this.startLookAt.copy(this.controls.target);
    this.targetPosition.copy(preset.position);
    this.targetLookAt.copy(preset.target);
    
    this.isAnimating = true;
    this.animationProgress = 0;
    
    this.controls.enabled = false;
  }

  public update(deltaTime: number): void {
    if (this.isAnimating) {
      this.animationProgress += deltaTime * 1000;
      const progress = Math.min(this.animationProgress / this.animationDuration, 1);
      const eased = easeInOutCubic(progress);

      this.camera.position.x = lerp(this.startPosition.x, this.targetPosition.x, eased);
      this.camera.position.y = lerp(this.startPosition.y, this.targetPosition.y, eased);
      this.camera.position.z = lerp(this.startPosition.z, this.targetPosition.z, eased);

      this.controls.target.x = lerp(this.startLookAt.x, this.targetLookAt.x, eased);
      this.controls.target.y = lerp(this.startLookAt.y, this.targetLookAt.y, eased);
      this.controls.target.z = lerp(this.startLookAt.z, this.targetLookAt.z, eased);

      if (progress >= 1) {
        this.isAnimating = false;
        this.controls.enabled = true;
        this.camera.position.copy(this.targetPosition);
        this.controls.target.copy(this.targetLookAt);
      }
    }
  }

  public setMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.animateToPreset(mode);
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public getLookAtTarget(): THREE.Vector3 {
    return this.controls.target.clone();
  }

  public reset(): void {
    this.viewMode = 'free';
    this.animateToPreset('panoramic');
  }

  public isTransitioning(): boolean {
    return this.isAnimating;
  }

  public dispose(): void {
  }
}
