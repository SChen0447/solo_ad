import { RenderEngine } from '@/modules/renderEngine';
import { PlanetManager } from '@/modules/planetManager';
import { UIController } from '@/modules/uiController';
import { eventBus } from '@/utils/eventBus';
import * as THREE from 'three';

class SolarSystemApp {
  private renderEngine: RenderEngine;
  private planetManager: PlanetManager;
  private uiController: UIController;
  private orbitSpeed: number = 1;
  private rotationSpeed: number = 1;

  constructor() {
    this.renderEngine = new RenderEngine('canvas-container');
    this.planetManager = new PlanetManager(
      this.renderEngine.scene,
      this.renderEngine.camera
    );
    this.uiController = new UIController();

    this.uiController.setPlanetList(this.planetManager.getPlanetList());

    this.setupEventHandlers();
    this.setupRenderLoop();
  }

  private setupEventHandlers(): void {
    eventBus.on('orbitSpeedChange', (speed: number) => {
      this.orbitSpeed = speed;
    });

    eventBus.on('rotationSpeedChange', (speed: number) => {
      this.rotationSpeed = speed;
    });

    eventBus.on('planetClicked', (planetData: any) => {
      const planetObj = this.planetManager.getPlanetByName(planetData.name);
      if (planetObj) {
        const fovRad = (this.renderEngine.camera.fov * Math.PI) / 180;
        const targetScreenRatio = 0.4;
        const distance = planetData.diameter / (2 * Math.tan(fovRad / 2) * targetScreenRatio);
        eventBus.emit('flyToPlanet', planetObj.group, distance);
      }
    });

    eventBus.on('enterCompareMode', () => {
      const compareData = this.planetManager.getCompareData();
      if (compareData) {
        const maxDiameter = Math.max(compareData.planet1.diameter, compareData.planet2.diameter);
        const fovRad = (this.renderEngine.camera.fov * Math.PI) / 180;
        const cameraDistance = (maxDiameter * 2.5) / (2 * Math.tan(fovRad / 2));

        this.renderEngine.camera.position.set(0, 0, cameraDistance);
        this.renderEngine.controls.target.set(0, 0, 0);
      }
    });
  }

  private setupRenderLoop(): void {
    eventBus.on('beforeRender', (deltaTime: number) => {
      this.update(deltaTime);
    });

    this.renderEngine.start();

    const sun = this.createSun();
    this.renderEngine.scene.add(sun);

    const starfield = this.createStarfield();
    this.renderEngine.scene.add(starfield);
  }

  private createSun(): THREE.Group {
    const group = new THREE.Group();

    const sunGeometry = new THREE.SphereGeometry(1.5, 48, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    group.add(sunMesh);

    const glowGeometry = new THREE.SphereGeometry(2, 32, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFA500,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glowMesh);

    return group;
  }

  private createStarfield(): THREE.Points {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    return new THREE.Points(starsGeometry, starsMaterial);
  }

  private update(deltaTime: number): void {
    this.renderEngine.checkHover(this.planetManager.getPlanetMeshes());
  }

  public start(): void {
    this.renderEngine.start();
  }

  public stop(): void {
    this.renderEngine.stop();
  }

  public dispose(): void {
    this.renderEngine.dispose();
    this.planetManager.dispose();
    this.uiController.dispose();
  }
}

let app: SolarSystemApp | null = null;

function initApp(): void {
  app = new SolarSystemApp();
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export default SolarSystemApp;
