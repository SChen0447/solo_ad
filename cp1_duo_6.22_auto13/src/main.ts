import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoadNetwork } from './traffic/roadNetwork';
import { TrafficSimulation } from './traffic/trafficSimulation';
import { HeatmapRenderer } from './traffic/heatmap';
import { ControlPanel } from './ui/controlPanel';

class TrafficApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private clock!: THREE.Clock;

  private roadNetwork!: RoadNetwork;
  private trafficSimulation!: TrafficSimulation;
  private heatmapRenderer!: HeatmapRenderer;
  private controlPanel!: ControlPanel;

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private hemisphereLight!: THREE.HemisphereLight;

  private currentTimeOfDay: number = 8;
  private targetTimeOfDay: number = 8;
  private lightTransitionSpeed: number = 2;
  private lightTransitionProgress: number = 1;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private isMobile: boolean = false;

  private lastFrameTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  constructor() {
    this.checkMobile();
    this.initScene();
    this.initLights();
    this.initRoadNetwork();
    this.initTrafficSimulation();
    this.initHeatmap();
    this.initControlPanel();
    this.initControls();
    this.initEventListeners();

    this.clock = new THREE.Clock();
    this.animate();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 150, 400);

    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(100, 120, 150);
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x1a1a2e, 0.4);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(80, 100, 60);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -200;
    this.directionalLight.shadow.camera.right = 200;
    this.directionalLight.shadow.camera.top = 200;
    this.directionalLight.shadow.camera.bottom = -200;
    this.directionalLight.shadow.bias = -0.001;
    this.scene.add(this.directionalLight);
  }

  private initRoadNetwork(): void {
    this.roadNetwork = new RoadNetwork();
    this.scene.add(this.roadNetwork.getRoadGroup());
    this.scene.add(this.roadNetwork.getTrafficLightGroup());
  }

  private initTrafficSimulation(): void {
    this.trafficSimulation = new TrafficSimulation(this.scene, this.roadNetwork);
  }

  private initHeatmap(): void {
    this.heatmapRenderer = new HeatmapRenderer(this.scene, this.roadNetwork);
  }

  private initControlPanel(): void {
    this.controlPanel = new ControlPanel(
      this.roadNetwork,
      this.trafficSimulation,
      this.heatmapRenderer
    );

    this.controlPanel.onTimeChange((hour) => {
      this.setTimeOfDay(hour);
    });
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 300;
    this.controls.target.set(80, 0, 80);
    this.controls.update();
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('click', (e) => {
      this.onCanvasClick(e);
    });

    this.renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.onCanvasTouch(e.touches[0]);
      }
    }, { passive: true });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.checkMobile();
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkIntersectionClick();
  }

  private onCanvasTouch(touch: Touch): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkIntersectionClick();
  }

  private checkIntersectionClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectionGroup = this.roadNetwork.getIntersectionGroup();
    const intersects = this.raycaster.intersectObjects(intersectionGroup.children, true);

    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj) {
        if (obj.userData && obj.userData.intersectionId) {
          this.controlPanel.setSelectedIntersection(obj.userData.intersectionId);
          if (this.isMobile) {
            (this.controlPanel as any).closeMobileDrawer?.();
          }
          return;
        }
        obj = obj.parent;
      }
    }
  }

  private setTimeOfDay(hour: number): void {
    this.targetTimeOfDay = hour;
    this.lightTransitionProgress = 0;
  }

  private updateLighting(deltaTime: number): void {
    if (this.lightTransitionProgress < 1) {
      this.lightTransitionProgress += deltaTime / this.lightTransitionSpeed;
      if (this.lightTransitionProgress > 1) {
        this.lightTransitionProgress = 1;
      }

      const t = this.lightTransitionProgress;
      const smoothT = t * t * (3 - 2 * t);

      this.currentTimeOfDay = this.currentTimeOfDay + (this.targetTimeOfDay - this.currentTimeOfDay) * smoothT;
    } else {
      this.currentTimeOfDay = this.targetTimeOfDay;
    }

    this.updateLightingForTime(this.currentTimeOfDay);
  }

  private updateLightingForTime(hour: number): void {
    let ambientIntensity: number;
    let directionalIntensity: number;
    let skyColor: number;
    let groundColor: number;
    let bgColor: number;
    let fogColor: number;

    if (hour >= 6 && hour < 8) {
      const t = (hour - 6) / 2;
      ambientIntensity = 0.15 + t * 0.25;
      directionalIntensity = 0.2 + t * 0.6;
      skyColor = this.lerpColor(0x2d1b4e, 0xffa07a, t);
      groundColor = this.lerpColor(0x1a1a2e, 0x2d3748, t);
      bgColor = this.lerpColor(0x0d0d1a, 0x1a1a2e, t);
      fogColor = this.lerpColor(0x0d0d1a, 0x1a1a2e, t);
    } else if (hour >= 8 && hour < 17) {
      ambientIntensity = 0.4;
      directionalIntensity = 0.8;
      skyColor = 0x87ceeb;
      groundColor = 0x2d3748;
      bgColor = 0x87ceeb;
      fogColor = 0x87ceeb;
    } else if (hour >= 17 && hour < 20) {
      const t = (hour - 17) / 3;
      ambientIntensity = 0.4 - t * 0.25;
      directionalIntensity = 0.8 - t * 0.6;
      skyColor = this.lerpColor(0x87ceeb, 0xff6b6b, t * 0.5);
      skyColor = this.lerpColor(skyColor, 0x2d1b4e, Math.max(0, (t - 0.5) * 2));
      groundColor = this.lerpColor(0x2d3748, 0x1a1a2e, t);
      bgColor = this.lerpColor(0x87ceeb, 0x1a1a2e, t);
      fogColor = this.lerpColor(0x87ceeb, 0x1a1a2e, t);
    } else {
      ambientIntensity = 0.1;
      directionalIntensity = 0.1;
      skyColor = 0x0a0a1a;
      groundColor = 0x0d0d1a;
      bgColor = 0x0d0d1a;
      fogColor = 0x0d0d1a;
    }

    this.ambientLight.intensity = ambientIntensity;
    this.directionalLight.intensity = directionalIntensity;
    this.hemisphereLight.color.setHex(skyColor);
    this.hemisphereLight.groundColor.setHex(groundColor);

    if (this.scene.background) {
      (this.scene.background as THREE.Color).setHex(bgColor);
    }
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.setHex(fogColor);
    }

    const sunAngle = ((hour - 6) / 12) * Math.PI;
    this.directionalLight.position.set(
      Math.cos(sunAngle) * 80,
      Math.sin(sunAngle) * 100,
      60
    );
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.updateLighting(deltaTime);
    this.roadNetwork.update(deltaTime);
    this.trafficSimulation.update(deltaTime, this.currentTimeOfDay);

    const densityData = this.trafficSimulation.getDensityData();
    this.heatmapRenderer.update(deltaTime, densityData);

    this.updateStats();

    this.renderer.render(this.scene, this.camera);
  }

  private updateStats(): void {
    this.frameCount++;
    this.fpsUpdateTime += this.clock.getDelta();

    if (this.fpsUpdateTime >= 0.5) {
      this.fps = this.frameCount / this.fpsUpdateTime;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      const stats = this.trafficSimulation.getStats();
      stats.fps = this.fps;
      this.controlPanel.updateStats(stats);
    }
  }

  public getTrafficSimulation(): TrafficSimulation {
    return this.trafficSimulation;
  }

  public getRoadNetwork(): RoadNetwork {
    return this.roadNetwork;
  }

  public getHeatmapRenderer(): HeatmapRenderer {
    return this.heatmapRenderer;
  }

  public getControlPanel(): ControlPanel {
    return this.controlPanel;
  }
}

let app: TrafficApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new TrafficApp();
});

export { TrafficApp };
