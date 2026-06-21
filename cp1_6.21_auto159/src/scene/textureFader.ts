import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import type { MaterialConfig } from '../types';
import { RenderSnapshot } from './renderSnapshot';

interface FadeState {
  mesh: THREE.Mesh;
  oldMaterial: THREE.MeshStandardMaterial;
  newMaterial: THREE.MeshStandardMaterial;
  currentMaterial: THREE.MeshStandardMaterial;
  progress: number;
}

export class TextureFader {
  private fadeStates: Map<string, FadeState> = new Map();
  private renderSnapshot: RenderSnapshot | null = null;
  private onFadeComplete: (areaId: string) => void;

  constructor(onFadeComplete: (areaId: string) => void) {
    this.onFadeComplete = onFadeComplete;
  }

  public setRenderSnapshot(snapshot: RenderSnapshot): void {
    this.renderSnapshot = snapshot;
  }

  public registerAreaMesh(areaId: string, mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    const newMaterial = material.clone();
    this.fadeStates.set(areaId, {
      mesh,
      oldMaterial: material.clone(),
      newMaterial,
      currentMaterial: material,
      progress: 1,
    });
  }

  public animateTextureFade(
    areaId: string,
    targetConfig: MaterialConfig,
    duration: number = 1000
  ): Promise<void> {
    return new Promise((resolve) => {
      const state = this.fadeStates.get(areaId);
      if (!state) {
        resolve();
        return;
      }

      const targetColor = new THREE.Color(targetConfig.color);
      const targetRoughness = targetConfig.roughness;
      const targetMetalness = targetConfig.metalness;
      const targetOpacity = targetConfig.opacity ?? 1.0;
      const targetTransparent = targetConfig.transparent ?? false;

      state.oldMaterial = state.currentMaterial.clone();

      state.newMaterial.color.copy(state.oldMaterial.color);
      state.newMaterial.color.set(targetColor);
      state.newMaterial.roughness = targetRoughness;
      state.newMaterial.metalness = targetMetalness;
      state.newMaterial.opacity = targetOpacity;
      state.newMaterial.transparent = targetTransparent;
      state.newMaterial.needsUpdate = true;

      const tweenData = { progress: 0 };

      new TWEEN.Tween(tweenData)
        .to({ progress: 1 }, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          this.interpolateMaterial(state, tweenData.progress);
        })
        .onComplete(() => {
          state.progress = 1;
          state.currentMaterial.color.copy(state.newMaterial.color);
          state.currentMaterial.roughness = state.newMaterial.roughness;
          state.currentMaterial.metalness = state.newMaterial.metalness;
          state.currentMaterial.opacity = state.newMaterial.opacity;
          state.currentMaterial.transparent = state.newMaterial.transparent;
          state.currentMaterial.needsUpdate = true;
          
          this.onFadeComplete(areaId);
          resolve();
        })
        .start();
    });
  }

  private interpolateMaterial(state: FadeState, progress: number): void {
    const mat = state.currentMaterial;
    
    mat.color.lerpColors(
      state.oldMaterial.color,
      state.newMaterial.color,
      progress
    );
    
    mat.roughness = state.oldMaterial.roughness + 
      (state.newMaterial.roughness - state.oldMaterial.roughness) * progress;
    
    mat.metalness = state.oldMaterial.metalness + 
      (state.newMaterial.metalness - state.oldMaterial.metalness) * progress;
    
    mat.opacity = state.oldMaterial.opacity + 
      (state.newMaterial.opacity - state.oldMaterial.opacity) * progress;
    
    mat.needsUpdate = true;
  }

  public fadeAllOut(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      const areas = Array.from(this.fadeStates.keys());
      let completed = 0;
      
      areas.forEach((areaId) => {
        const state = this.fadeStates.get(areaId);
        if (!state) return;
        
        const tweenData = { opacity: state.currentMaterial.opacity };
        
        new TWEEN.Tween(tweenData)
          .to({ opacity: 0 }, duration / 2)
          .easing(TWEEN.Easing.Cubic.Out)
          .onUpdate(() => {
            state.currentMaterial.opacity = tweenData.opacity;
            state.currentMaterial.transparent = true;
            state.currentMaterial.needsUpdate = true;
          })
          .onComplete(() => {
            completed++;
            if (completed === areas.length) {
              resolve();
            }
          })
          .start();
      });
    });
  }

  public fadeAllIn(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      const areas = Array.from(this.fadeStates.keys());
      let completed = 0;
      
      areas.forEach((areaId) => {
        const state = this.fadeStates.get(areaId);
        if (!state) return;
        
        const targetOpacity = state.newMaterial.opacity ?? 1.0;
        const tweenData = { opacity: 0 };
        
        new TWEEN.Tween(tweenData)
          .to({ opacity: targetOpacity }, duration / 2)
          .easing(TWEEN.Easing.Cubic.In)
          .onUpdate(() => {
            state.currentMaterial.opacity = tweenData.opacity;
            state.currentMaterial.needsUpdate = true;
          })
          .onComplete(() => {
            state.currentMaterial.transparent = state.newMaterial.transparent ?? false;
            state.currentMaterial.needsUpdate = true;
            completed++;
            if (completed === areas.length) {
              resolve();
            }
          })
          .start();
      });
    });
  }

  public captureBeforeSnapshot(): string | null {
    return this.renderSnapshot?.capture() ?? null;
  }

  public captureAfterSnapshot(): string | null {
    return this.renderSnapshot?.capture() ?? null;
  }

  public update(): void {
    TWEEN.update();
  }

  public dispose(): void {
    TWEEN.removeAll();
    this.fadeStates.clear();
  }
}
