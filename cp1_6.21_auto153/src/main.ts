import * as THREE from 'three';
import { SceneManager, SkylineParams } from './sceneManager';
import { MouseInteraction } from './mouseInteraction';
import { BuildingStyle } from './buildingFactory';
import dat from 'dat.gui';

class SkylineApp {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private sceneManager: SceneManager;
  private mouseInteraction: MouseInteraction;
  private clock: THREE.Clock;
  private params: SkylineParams;

  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(60, 40, 60);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    this.params = {
      density: 0.5,
      style: 'modern',
      skyColor: 0x0a0a2e,
    };

    this.sceneManager = new SceneManager(this.scene);

    this.mouseInteraction = new MouseInteraction(
      this.camera,
      this.renderer.domElement,
      this.sceneManager
    );

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.mouseInteraction.setFog(this.scene.fog);
    }

    this.clock = new THREE.Clock();

    this.setupGUI();
    this.setupResize();

    this.animate();
  }

  private setupGUI(): void {
    const gui = new dat.GUI({ width: 300 });

    const guiStyle = document.createElement('style');
    guiStyle.textContent = `
      .dg.ac {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
      }
      .dg.main {
        background: rgba(20, 20, 40, 0.6) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border-radius: 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        overflow: hidden !important;
      }
      .dg .cr {
        color: white !important;
      }
      .dg .c .slider {
        background: rgba(255, 255, 255, 0.15) !important;
      }
      .dg .c .slider:hover {
        background: rgba(255, 255, 255, 0.25) !important;
      }
      .dg li:not(.folder) {
        background: rgba(20, 20, 40, 0.4) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }
      .dg .title {
        color: white !important;
        background: rgba(20, 20, 40, 0.6) !important;
      }
      .dg .property-name {
        color: rgba(255, 255, 255, 0.85) !important;
      }
      .dg .c input[type=text] {
        color: white !important;
        background: rgba(255, 255, 255, 0.1) !important;
      }
      .dg .c select {
        color: white !important;
        background: rgba(20, 20, 40, 0.8) !important;
      }
      .dg .closed .title {
        background: rgba(20, 20, 40, 0.6) !important;
      }
      .dg .cr.number input[type=text] {
        color: white !important;
      }
      .dg .cr.function .property-name {
        color: rgba(200, 200, 255, 0.9) !important;
      }
      .dg .close-button {
        background: rgba(20, 20, 40, 0.6) !important;
        color: white !important;
      }
      .dg .close-button:hover {
        background: rgba(40, 40, 80, 0.8) !important;
      }
    `;
    document.head.appendChild(guiStyle);

    const guiParams = {
      density: this.params.density,
      style: this.params.style as string,
      skyColor: this.params.skyColor,
    };

    gui.add(guiParams, 'density', 0.2, 0.8, 0.1)
      .name('建筑密度')
      .onChange((value: number) => {
        this.params.density = value;
        this.sceneManager.update(this.params);
      });

    gui.add(guiParams, 'style', ['modern', 'vintage', 'cyber'])
      .name('建筑风格')
      .onChange((value: string) => {
        this.params.style = value as BuildingStyle;
        this.sceneManager.update(this.params);
      });

    gui.addColor(guiParams, 'skyColor')
      .name('天空颜色')
      .onChange((value: number) => {
        this.params.skyColor = value;
        this.sceneManager.update(this.params);
      });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.sceneManager.updateDelta(delta);
    this.mouseInteraction.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

new SkylineApp();
