import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import {
  createGalaxy,
  createStarfield,
  defaultGalaxyConfig,
  GalaxyConfig
} from './galaxy';

import { createInteractionController, InteractionController } from './interaction';

class GalaxyRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private container: HTMLElement;

  private interactionController: InteractionController;

  private galaxy: {
    group: THREE.Group;
    stars: THREE.Points;
    dust: THREE.Points;
    update: (delta: number) => void;
    getTotalParticles: () => number;
  };

  private starfield: {
    points: THREE.Points;
    update: (delta: number) => void;
  };

  private clock: THREE.Clock;
  private fpsCounter: HTMLElement;
  private performanceModeElement: HTMLElement;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  private performanceMode: boolean = false;
  private lowFpsFrameCount: number = 0;
  private highFpsFrameCount: number = 0;

  private galaxyConfig: GalaxyConfig;

  constructor() {
    this.galaxyConfig = { ...defaultGalaxyConfig };

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    this.container = container;

    const fpsElement = document.getElementById('fps-counter');
    if (!fpsElement) {
      throw new Error('FPS counter element not found');
    }
    this.fpsCounter = fpsElement;

    const perfElement = document.getElementById('performance-mode');
    if (!perfElement) {
      throw new Error('Performance mode element not found');
    }
    this.performanceModeElement = perfElement;

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011);
    this.container.appendChild(this.renderer.domElement);

    this.composer = this.createComposer();

    this.interactionController = createInteractionController(
      this.camera,
      this.renderer.domElement,
      {
        rotateDamping: 0.1,
        rotateSpeed: 0.3,
        zoomMin: 2,
        zoomMax: 20,
        zoomEaseDuration: 0.5,
        resetDuration: 1.0
      }
    );

    this.galaxy = createGalaxy(this.galaxyConfig, false);
    this.scene.add(this.galaxy.group);

    this.starfield = createStarfield(3000, 50);
    this.scene.add(this.starfield.points);

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate = this.animate.bind(this);
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,
      0.4,
      0.1
    );
    composer.addPass(bloomPass);

    return composer;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      this.checkPerformance();
    }
  }

  private checkPerformance(): void {
    if (this.currentFps < 30) {
      this.lowFpsFrameCount++;
      this.highFpsFrameCount = 0;

      if (this.lowFpsFrameCount >= 2 && !this.performanceMode) {
        this.enablePerformanceMode();
      }
    } else if (this.currentFps > 50) {
      this.highFpsFrameCount++;

      if (this.highFpsFrameCount >= 5 && this.performanceMode) {
        this.disablePerformanceMode();
      }
    } else {
      this.lowFpsFrameCount = 0;
    }
  }

  private enablePerformanceMode(): void {
    this.performanceMode = true;
    this.performanceModeElement.style.display = 'block';

    this.scene.remove(this.galaxy.group);
    this.galaxy = createGalaxy(this.galaxyConfig, true);
    this.scene.add(this.galaxy.group);
  }

  private disablePerformanceMode(): void {
    this.performanceMode = false;
    this.performanceModeElement.style.display = 'none';
    this.highFpsFrameCount = 0;

    this.scene.remove(this.galaxy.group);
    this.galaxy = createGalaxy(this.galaxyConfig, false);
    this.scene.add(this.galaxy.group);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.interactionController.update(delta);
    this.galaxy.update(delta);
    this.starfield.update(delta);

    this.composer.render();

    this.updateFps();
  }

  start(): void {
    this.lastFpsUpdate = performance.now();
    this.animate();
  }

  getPerformanceMode(): boolean {
    return this.performanceMode;
  }

  getFps(): number {
    return this.currentFps;
  }

  dispose(): void {
    this.renderer.dispose();
    this.interactionController.dispose();
  }
}

let renderer: GalaxyRenderer | null = null;

function init(): void {
  renderer = new GalaxyRenderer();
  renderer.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { GalaxyRenderer };
