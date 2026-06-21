import * as THREE from 'three';
import { ForestScene } from './forestScene';
import { AnimationController } from './animationController';
import { TreeParams, TreeRuleType } from './treeGenerator';

class FractalForestApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private forestScene!: ForestScene;
  private animationController!: AnimationController;

  private fpsValueEl!: HTMLElement;
  private treeCountEl!: HTMLElement;
  private speedValueEl!: HTMLElement;
  private vignetteEl!: HTMLElement;

  private ruleSelectEl!: HTMLSelectElement;
  private densitySlider!: HTMLInputElement;
  private layersSlider!: HTMLInputElement;
  private variationSlider!: HTMLInputElement;
  private densityValueEl!: HTMLElement;
  private layersValueEl!: HTMLElement;
  private variationValueEl!: HTMLElement;

  private lastTime = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;
  private currentFps = 0;

  private currentParams: TreeParams = {
    ruleType: 'l-system',
    canopyDensity: 60,
    branchLayers: 5,
    variation: 0.3
  };

  constructor() {
    this.init();
  }

  private init(): void {
    this.initThree();
    this.initUI();
    this.initForest();
    this.animate(0);
  }

  private initThree(): void {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.7, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.insertBefore(this.renderer.domElement, container.firstChild);

    window.addEventListener('resize', () => this.onResize());
  }

  private initUI(): void {
    this.fpsValueEl = document.getElementById('fps-value')!;
    this.treeCountEl = document.getElementById('tree-count')!;
    this.speedValueEl = document.getElementById('speed-value')!;
    this.vignetteEl = document.getElementById('vignette')!;

    this.ruleSelectEl = document.getElementById('rule-select') as HTMLSelectElement;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.layersSlider = document.getElementById('layers-slider') as HTMLInputElement;
    this.variationSlider = document.getElementById('variation-slider') as HTMLInputElement;
    this.densityValueEl = document.getElementById('density-value')!;
    this.layersValueEl = document.getElementById('layers-value')!;
    this.variationValueEl = document.getElementById('variation-value')!;

    this.ruleSelectEl.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as TreeRuleType;
      this.currentParams.ruleType = value;
      this.forestScene.updateRuleType(value);
    });

    this.densitySlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.densityValueEl.textContent = value.toString();
      this.currentParams.canopyDensity = value;
    });

    this.densitySlider.addEventListener('change', () => {
      this.forestScene.updateParams({ canopyDensity: this.currentParams.canopyDensity });
    });

    this.layersSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.layersValueEl.textContent = value.toString();
      this.currentParams.branchLayers = value;
    });

    this.layersSlider.addEventListener('change', () => {
      this.forestScene.updateParams({ branchLayers: this.currentParams.branchLayers });
    });

    this.variationSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.variationValueEl.textContent = value.toFixed(2);
      this.currentParams.variation = value;
    });

    this.variationSlider.addEventListener('change', () => {
      this.forestScene.updateParams({ variation: this.currentParams.variation });
    });
  }

  private initForest(): void {
    this.forestScene = new ForestScene(
      this.scene,
      this.camera,
      this.renderer,
      this.currentParams,
      { treeCount: 50, forestRadius: 25 }
    );

    this.animationController = new AnimationController(this.forestScene);

    this.forestScene.onSpeedChange((speedRatio) => {
      this.updateVignette(speedRatio);
    });

    this.forestScene.onTreeCountChange((count) => {
      this.treeCountEl.textContent = count.toString();
    });

    this.treeCountEl.textContent = this.forestScene.getTreeCount().toString();
  }

  private updateVignette(speedRatio: number): void {
    const opacity = 0.1 + speedRatio * 0.3;
    const pixelRadius = 150 * (1 - speedRatio * 0.5);
    this.vignetteEl.style.boxShadow = `inset 0 0 ${pixelRadius}px rgba(0,0,0,${opacity})`;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.updateFPS(deltaTime);

    this.animationController.update(deltaTime);
    this.forestScene.update(deltaTime, time / 1000);

    this.speedValueEl.textContent = this.forestScene.getCameraSpeed().toFixed(1) + 'x';

    this.renderer.render(this.scene, this.camera);
  };

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.fpsValueEl.textContent = this.currentFps.toString();
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      if (this.currentFps < 45) {
        this.fpsValueEl.style.color = '#FF5722';
      } else {
        this.fpsValueEl.style.color = '#8BC34A';
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FractalForestApp();
});
