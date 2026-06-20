import * as THREE from 'three';
import { Ecosystem } from '@/core/ecosystem';
import { ParticleSystem } from '@/core/particle';
import { Renderer } from '@/visualizer/renderer';
import { EnvironmentUI } from '@/visualizer/ui';
import { Controls } from '@/visualizer/controls';
import './styles.css';

const DEFAULT_FISH_COUNT = 80;
const DEFAULT_CURRENT_SPEED = 1.0;
const BOUNDS = new THREE.Vector3(60, 30, 60);
const PARTICLE_COUNT = 600;

class OceanSimulation {
  private renderer: Renderer;
  private ecosystem: Ecosystem;
  private particleSystem: ParticleSystem;
  private envUI: EnvironmentUI;
  private controls: Controls;
  private clock = new THREE.Clock();
  private frameCount = 0;
  private fpsTime = 0;
  private fpsValue = 0;

  constructor() {
    const canvas = document.getElementById('ocean-canvas') as HTMLCanvasElement;

    this.ecosystem = new Ecosystem({
      fishCount: DEFAULT_FISH_COUNT,
      currentSpeed: DEFAULT_CURRENT_SPEED,
      bounds: BOUNDS,
    });

    this.particleSystem = new ParticleSystem(PARTICLE_COUNT, DEFAULT_CURRENT_SPEED, BOUNDS);

    this.renderer = new Renderer(canvas);
    this.renderer.createFishMesh(this.ecosystem);
    this.renderer.createParticlePoints(this.particleSystem);

    this.envUI = new EnvironmentUI(this.ecosystem);

    this.controls = new Controls({
      onFishDensityChange: (val) => this.onFishDensityChange(val),
      onCurrentSpeedChange: (val) => this.onCurrentSpeedChange(val),
      onReset: () => this.onReset(),
    });

    this.updateStats();
    this.animate();
  }

  private onFishDensityChange(count: number) {
    this.ecosystem.setFishCount(count);
    this.updateStats();
  }

  private onCurrentSpeedChange(speed: number) {
    this.ecosystem.setCurrentSpeed(speed);
    this.particleSystem.setCurrentSpeed(speed);
  }

  private onReset() {
    this.ecosystem.reset();
    this.particleSystem.reset();
    this.renderer.createFishMesh(this.ecosystem);
    this.renderer.createParticlePoints(this.particleSystem);
    this.envUI.setEcosystem(this.ecosystem);
    this.updateStats();
  }

  private updateStats() {
    document.getElementById('fish-count')!.textContent = String(this.ecosystem.fishes.length);
    document.getElementById('particle-count')!.textContent = String(this.particleSystem.data.count);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1.0) {
      this.fpsValue = Math.round(this.frameCount / this.fpsTime);
      document.getElementById('fps-value')!.textContent = String(this.fpsValue);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.ecosystem.update(dt);
    this.particleSystem.update(dt);

    this.renderer.updateFishMesh(this.ecosystem);
    this.renderer.updateParticlePoints(this.particleSystem);
    this.renderer.render();

    this.updateStats();
  }
}

new OceanSimulation();
