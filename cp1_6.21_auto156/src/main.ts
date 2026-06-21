import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { PhysicsEngine, type PhysicsConfig } from './physicsEngine';
import { RenderModule } from './renderModule';
import { ControlPanel } from './controlPanel';

class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number };
  private spherical: { radius: number; theta: number; phi: number };
  private minRadius: number = 5;
  private maxRadius: number = 40;
  private minPhi: number = 0.1;
  private maxPhi: number = Math.PI / 2 - 0.05;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 0, 0);
    this.previousMouse = { x: 0, y: 0 };

    const offset = new THREE.Vector3().subVectors(camera.position, this.target);
    this.spherical = {
      radius: offset.length(),
      theta: Math.atan2(offset.x, offset.z),
      phi: Math.acos(THREE.MathUtils.clamp(offset.y / offset.length(), -1, 1))
    };

    this.updateCameraPosition();
  }

  public onMouseDown(x: number, y: number): void {
    this.isDragging = true;
    this.previousMouse = { x, y };
  }

  public onMouseMove(x: number, y: number): void {
    if (!this.isDragging) return;

    const deltaX = x - this.previousMouse.x;
    const deltaY = y - this.previousMouse.y;

    this.spherical.theta -= deltaX * 0.01;
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi + deltaY * 0.01,
      this.minPhi,
      this.maxPhi
    );

    this.updateCameraPosition();
    this.previousMouse = { x, y };
  }

  public onMouseUp(): void {
    this.isDragging = false;
  }

  public onWheel(delta: number): void {
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius * (1 + delta * 0.001),
      this.minRadius,
      this.maxRadius
    );
    this.updateCameraPosition();
  }

  public reset(): void {
    this.spherical = {
      radius: 21.21,
      theta: 0,
      phi: Math.PI / 4
    };
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const sinPhiRadius = this.spherical.radius * Math.sin(this.spherical.phi);
    this.camera.position.x = this.target.x + sinPhiRadius * Math.sin(this.spherical.theta);
    this.camera.position.y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.target.z + sinPhiRadius * Math.cos(this.spherical.theta);
    this.camera.lookAt(this.target);
  }
}

class Application {
  private container: HTMLElement;
  private renderModule: RenderModule;
  private physicsEngine: PhysicsEngine;
  private controlPanel: ControlPanel;
  private cameraController: CameraController;
  private clock: THREE.Clock;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    const defaultConfig: PhysicsConfig = {
      gravity: 9.8,
      bulletSpeed: 10,
      bulletAngle: 0,
      obstacleType: 'circle',
      collisionMode: 'bounce'
    };

    this.physicsEngine = new PhysicsEngine(defaultConfig);
    this.renderModule = new RenderModule(this.container);
    this.controlPanel = new ControlPanel(this.physicsEngine, this.renderModule);
    this.cameraController = new CameraController(this.renderModule.camera);

    this.setupEventListeners();
    this.setupPhysicsCallbacks();
    this.renderModule.updateObstacle(this.physicsEngine.getObstacle());

    this.hideLoading();
    this.animate();
  }

  private setupEventListeners(): void {
    const canvas = this.renderModule.getDomElement();

    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let hasMoved = false;
    const dragThreshold = 5;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      hasMoved = false;
      dragStartPos = { x: e.clientX, y: e.clientY };
      this.cameraController.onMouseDown(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = Math.abs(e.clientX - dragStartPos.x);
      const dy = Math.abs(e.clientY - dragStartPos.y);
      if (dx > dragThreshold || dy > dragThreshold) {
        hasMoved = true;
      }
      this.cameraController.onMouseMove(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseup', (e) => {
      this.cameraController.onMouseUp();
      if (isDragging && !hasMoved) {
        this.handleClick(e.clientX, e.clientY);
      }
      isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.cameraController.onMouseUp();
      isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraController.onWheel(e.deltaY);
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private setupPhysicsCallbacks(): void {
    this.physicsEngine.onParticle((event) => {
      this.renderModule.spawnParticles(event);
    });
  }

  private handleClick(clientX: number, clientY: number): void {
    const worldPos = this.renderModule.screenToWorld(clientX, clientY, this.container);
    if (worldPos) {
      this.physicsEngine.spawnBullet(worldPos);
    }
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => {
        loading.style.display = 'none';
      }, 500);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    TWEEN.update();

    this.physicsEngine.update(deltaTime);
    this.renderModule.updateParticles(deltaTime);
    this.renderModule.updateBullets(this.physicsEngine.getBullets());
    this.renderModule.updateObstacle(this.physicsEngine.getObstacle());
    this.controlPanel.update();

    this.renderModule.render();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderModule.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
