import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EcosystemSimulator } from './EcosystemSimulator';
import { EnvironmentController } from './EnvironmentController';
import { EnvironmentParams, EcosystemMetrics } from './types';

class ForestBreathingApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;

  private simulator: EcosystemSimulator;
  private controller: EnvironmentController;

  private lastMetricsUpdate = 0;
  private readonly METRICS_UPDATE_INTERVAL = 0.15;

  private fadeOverlay: HTMLElement | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.ambientLight = this.createAmbientLight();
    this.hemisphereLight = this.createHemisphereLight();
    this.directionalLight = this.createDirectionalLight();

    this.scene.add(this.ambientLight);
    this.scene.add(this.hemisphereLight);
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    this.controls = this.createControls();

    this.simulator = new EcosystemSimulator(this.scene, this.directionalLight);
    this.controller = new EnvironmentController(
      document.body,
      (params: EnvironmentParams) => this.handleParamsChange(params)
    );

    this.setupEventListeners();
    this.hideLoadingOverlay();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D1B2A);
    scene.fog = new THREE.FogExp2(0x0D1B2A, 0.018);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    camera.position.set(22, 16, 22);
    camera.lookAt(0, 2, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createAmbientLight(): THREE.AmbientLight {
    const light = new THREE.AmbientLight(0x88A080, 0.4);
    return light;
  }

  private createHemisphereLight(): THREE.HemisphereLight {
    const light = new THREE.HemisphereLight(0x87CEEB, 0x2d4a2d, 0.35);
    return light;
  }

  private createDirectionalLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xFFFFFF, 0.9);
    light.position.set(15, 25, 10);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 100;
    light.shadow.camera.left = -40;
    light.shadow.camera.right = 40;
    light.shadow.camera.top = 40;
    light.shadow.camera.bottom = -40;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    return light;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.panSpeed = 0.6;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 6;
    controls.maxDistance = 70;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.target.set(0, 1.5, 0);
    controls.update();
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.clock.getDelta();
      }
    });
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private handleParamsChange(params: EnvironmentParams): void {
    this.simulator.setEnvironmentParams(params);
    this.updateSceneFog(params);
    this.updateAmbientLight(params);
    this.updateHemisphereLight(params);
  }

  private updateSceneFog(params: EnvironmentParams): void {
    const fogBase = 0.018;
    const rainFactor = params.rain / 100;
    const fogDensity = fogBase + rainFactor * 0.015;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, fogDensity, 0.05);

      const tempNorm = THREE.MathUtils.clamp((params.temp + 10) / 50, 0, 1);
      const coldFog = new THREE.Color(0x4A5568);
      const warmFog = new THREE.Color(0x2D3748);
      const rainFog = new THREE.Color(0x374151);
      const fogColor = coldFog.clone().lerp(warmFog, tempNorm).lerp(rainFog, rainFactor * 0.5);
      (this.scene.fog as THREE.FogExp2).color.lerp(fogColor, 0.05);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(fogColor, 0.03);
      }
    }
  }

  private updateAmbientLight(params: EnvironmentParams): void {
    const targetIntensity = 0.25 + (params.light / 100) * 0.45;
    this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, targetIntensity, 0.05);

    const tempNorm = THREE.MathUtils.clamp((params.temp + 10) / 50, 0, 1);
    const cold = new THREE.Color(0x708090);
    const warm = new THREE.Color(0xF5DEB3);
    const target = cold.clone().lerp(warm, tempNorm);
    this.ambientLight.color.lerp(target, 0.05);
  }

  private updateHemisphereLight(params: EnvironmentParams): void {
    const tempNorm = THREE.MathUtils.clamp((params.temp + 10) / 50, 0, 1);
    const skyCold = new THREE.Color(0x4A6B8A);
    const skyWarm = new THREE.Color(0x87CEEB);
    const sky = skyCold.clone().lerp(skyWarm, tempNorm);
    this.hemisphereLight.color.lerp(sky, 0.05);

    const rainFactor = params.rain / 100;
    const groundDry = new THREE.Color(0x3E2723);
    const groundWet = new THREE.Color(0x1B3A1B);
    const ground = groundDry.clone().lerp(groundWet, rainFactor);
    this.hemisphereLight.groundColor.lerp(ground, 0.05);
  }

  private hideLoadingOverlay(): void {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      window.setTimeout(() => {
        overlay.classList.add('hidden');
        window.setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 1100);
      }, 600);
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.controls.update();

    const metrics: EcosystemMetrics = this.simulator.updateScene(deltaTime);

    this.lastMetricsUpdate += deltaTime;
    if (this.lastMetricsUpdate >= this.METRICS_UPDATE_INTERVAL) {
      this.lastMetricsUpdate = 0;
      this.controller.updateMetrics(metrics);
    }

    const orbitSpeed = 0.008;
    const autoOrbitRadius = 30;
    const autoAngle = elapsed * orbitSpeed;
    if (!this.controls.enabled) {
      this.camera.position.x = Math.cos(autoAngle) * autoOrbitRadius;
      this.camera.position.z = Math.sin(autoAngle) * autoOrbitRadius;
    }

    this.renderer.render(this.scene, this.camera);
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ForestBreathingApp();
  });
} else {
  new ForestBreathingApp();
}
