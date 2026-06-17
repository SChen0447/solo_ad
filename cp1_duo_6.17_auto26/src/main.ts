import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FieldRenderer } from './renderers/FieldRenderer';
import { GlyphRenderer } from './renderers/GlyphRenderer';
import { ProbeTool, type ProbeData } from './tools/ProbeTool';
import { UIManager } from './UIManager';
import type { ScalarDataset, VectorDataset } from './types';
import { clamp } from './utils/interpolation';

import './styles.css';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private fieldRenderer: FieldRenderer;
  private glyphRenderer: GlyphRenderer;
  private probeTool: ProbeTool;
  private uiManager: UIManager;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private animationId: number | null = null;

  constructor() {
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 10, 12);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b0e17, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.target.set(0, 0, 0);

    this.addSceneElements();

    this.fieldRenderer = new FieldRenderer(this.scene, this.camera);
    this.glyphRenderer = new GlyphRenderer(this.scene);
    this.probeTool = new ProbeTool(this.scene, this.camera, this.renderer);

    this.uiManager = new UIManager({
      onTemperatureToggle: (enabled) => this.fieldRenderer.setTemperatureVisible(enabled),
      onVelocityToggle: (enabled) => this.glyphRenderer.setVisible(enabled),
      onPressureToggle: (enabled) => this.fieldRenderer.setPressureVisible(enabled),
      onProbeToggle: (enabled) => {
        this.probeTool.setEnabled(enabled);
        this.probeTool.setVisible(enabled);
      },
      onTemperatureOpacity: (value) => this.fieldRenderer.setTemperatureOpacity(value),
      onVelocityOpacity: (value) => this.glyphRenderer.setOpacity(value),
      onPressureOpacity: (value) => this.fieldRenderer.setPressureOpacity(value),
      onGlyphScale: (value) => this.glyphRenderer.setGlyphScale(value),
      onViewChange: (view) => this.animateToView(view)
    });

    this.probeTool.setOnProbeUpdate((data: ProbeData | null) => {
      this.uiManager.updateProbeData(data);
    });

    window.addEventListener('resize', this.onResize.bind(this));

    this.loadDatasets();

    this.animate();
  }

  private addSceneElements(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x2a3a5a, 0x1a2a3a);
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(6);
    this.scene.add(axesHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);
  }

  private async loadDatasets(): Promise<void> {
    const datasets = {
      temperature: { url: '/data1_temperature.json', type: 'temperature' as const },
      velocity: { url: '/data2_velocity.json', type: 'velocity' as const },
      pressure: { url: '/data3_pressure.json', type: 'pressure' as const }
    };

    const loadPromises = Object.entries(datasets).map(async ([key, { url, type }]) => {
      this.uiManager.updateDataStatus(type, 'loading');
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        this.uiManager.updateDataStatus(type, 'success');
        return { type, data };
      } catch (error) {
        this.uiManager.updateDataStatus(type, 'error', error instanceof Error ? error.message : 'Unknown error');
        return { type, data: null };
      }
    });

    const results = await Promise.all(loadPromises);

    for (const result of results) {
      if (result.data) {
        if (result.type === 'temperature') {
          this.fieldRenderer.loadTemperature(result.data as ScalarDataset);
          this.probeTool.setTemperatureData(result.data as ScalarDataset);
        } else if (result.type === 'velocity') {
          this.glyphRenderer.loadData(result.data as VectorDataset);
          this.probeTool.setVelocityData(result.data as VectorDataset);
        } else if (result.type === 'pressure') {
          this.fieldRenderer.loadPressure(result.data as ScalarDataset);
          this.probeTool.setPressureData(result.data as ScalarDataset);
        }
      }
    }
  }

  private animateToView(view: 'front' | 'top' | 'iso'): void {
    let targetPosition: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    switch (view) {
      case 'front':
        targetPosition = new THREE.Vector3(0, 0, 15);
        targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
      case 'top':
        targetPosition = new THREE.Vector3(0, 15, 0.01);
        targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
      case 'iso':
        targetPosition = new THREE.Vector3(10.6, 10.6, 10.6);
        targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
    }

    this.controls.enabled = false;

    const startPosition = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 1500;

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const t = clamp(elapsed / duration, 0, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      this.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.controls.target.lerpVectors(startLookAt, targetLookAt, eased);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        this.controls.enabled = true;
      }
    };

    animateCamera();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    this.controls.update();
    this.fieldRenderer.update();
    this.probeTool.update();

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = this.frameCount * 1000 / (now - this.lastFpsUpdate);
      if (fps < 50) {
        console.warn(`Low FPS: ${fps.toFixed(1)}`);
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
