import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParametricSculpture, SculptureParams } from './ParametricSculpture';
import { UIControls, ControlParams, DataSourceType } from './UIControls';
import './style.css';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(10, 5, 10);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

class SculptureApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private sculpture!: ParametricSculpture;
  private uiControls!: UIControls;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  private dataSequence: number[] = [];
  private interpolatedData: number[] = [];
  private dataIntervalId: number | null = null;
  private dataSource: DataSourceType = 'simulation';
  private jsonData: number[] = [];

  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsUpdateTime: number = 0;

  private performanceWarningEl: HTMLElement | null = null;
  private fpsDisplayEl: HTMLElement | null = null;
  private vertexCountEl: HTMLElement | null = null;
  private dataSourceEl: HTMLElement | null = null;
  private vertexInfoEl: HTMLElement | null = null;
  private vertexIndexEl: HTMLElement | null = null;
  private vertexValueEl: HTMLElement | null = null;

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetStartPosition: THREE.Vector3 = new THREE.Vector3();
  private resetStartTarget: THREE.Vector3 = new THREE.Vector3();

  private currentVertexCount: number = 2000;
  private performanceDegraded: boolean = false;

  private interpStartTime: number = 0;
  private interpDuration: number = 500;
  private oldDataValue: number = 0.5;
  private newDataValue: number = 0.5;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(INITIAL_CAMERA_POSITION);

    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 0.5 * 5;
    this.controls.maxDistance = 5 * 5;
    this.controls.target.copy(INITIAL_CAMERA_TARGET);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.dataSequence = new Array(100).fill(0.5);
    this.interpolatedData = new Array(100).fill(0.5);

    const initialSculptureParams: SculptureParams = {
      rotationSpeed: 1,
      distortionStrength: 2,
      colorOffset: 0.5,
      particleDensity: 100,
    };

    this.sculpture = new ParametricSculpture(2000, initialSculptureParams);
    this.scene.add(this.sculpture.mesh);

    this.addLights();
    this.initUI();
    this.bindEvents();
    this.startDataSimulation();
    this.updateInfoDisplay();

    this.oldDataValue = 0.5;
    this.newDataValue = 0.5;
    this.interpStartTime = performance.now();

    this.animate(0);
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffa500, 1, 50);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x1e90ff, 0.6, 50);
    pointLight2.position.set(-10, -5, -10);
    this.scene.add(pointLight2);
  }

  private initUI(): void {
    const initialControlParams: ControlParams = {
      rotationSpeed: 1,
      distortionStrength: 2,
      colorOffset: 0.5,
      particleDensity: 100,
    };

    this.uiControls = new UIControls('controls-container', initialControlParams, {
      onParamChange: (params) => this.handleParamChange(params),
      onDataSourceChange: (source, data) => this.handleDataSourceChange(source, data),
      onResetView: () => this.resetView(),
      onScreenshot: () => this.takeScreenshot(),
    });

    this.performanceWarningEl = document.getElementById('performance-warning');
    this.fpsDisplayEl = document.getElementById('fps-display');
    this.vertexCountEl = document.getElementById('vertex-count');
    this.dataSourceEl = document.getElementById('data-source');
    this.vertexInfoEl = document.getElementById('vertex-info');
    this.vertexIndexEl = document.getElementById('vertex-index');
    this.vertexValueEl = document.getElementById('vertex-value');
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.renderer.domElement.addEventListener('mouseleave', () => this.handleMouseLeave());
  }

  private handleParamChange(params: Partial<ControlParams>): void {
    const sculptureParams: Partial<SculptureParams> = {};
    
    if (params.rotationSpeed !== undefined) {
      sculptureParams.rotationSpeed = params.rotationSpeed;
    }
    if (params.distortionStrength !== undefined) {
      sculptureParams.distortionStrength = params.distortionStrength;
    }
    if (params.colorOffset !== undefined) {
      sculptureParams.colorOffset = params.colorOffset;
    }
    if (params.particleDensity !== undefined) {
      sculptureParams.particleDensity = params.particleDensity;
    }

    this.sculpture.updateParams(sculptureParams);
  }

  private handleDataSourceChange(source: DataSourceType, data?: number[]): void {
    this.dataSource = source;
    
    if (source === 'json' && data && data.length > 0) {
      this.jsonData = [...data];
      this.stopDataSimulation();
      this.dataSequence = [...data];
      this.interpolatedData = [...data];
      this.sculpture.updateData(this.interpolatedData);
    } else if (source === 'simulation') {
      this.startDataSimulation();
    }

    this.updateDataSourceDisplay();
  }

  private startDataSimulation(): void {
    this.stopDataSimulation();

    this.dataIntervalId = window.setInterval(() => {
      const newValue = Math.random();
      this.oldDataValue = this.dataSequence[this.dataSequence.length - 1] || 0.5;
      this.newDataValue = newValue;
      this.interpStartTime = performance.now();

      this.dataSequence.push(newValue);
      if (this.dataSequence.length > 100) {
        this.dataSequence.shift();
      }
    }, 1000 / 12);
  }

  private stopDataSimulation(): void {
    if (this.dataIntervalId !== null) {
      clearInterval(this.dataIntervalId);
      this.dataIntervalId = null;
    }
  }

  private updateInterpolatedData(currentTime: number): void {
    const elapsed = currentTime - this.interpStartTime;
    const t = Math.min(1, elapsed / this.interpDuration);
    const easeT = t;

    const currentValue = this.oldDataValue + (this.newDataValue - this.oldDataValue) * easeT;

    for (let i = 0; i < this.dataSequence.length - 1; i++) {
      this.interpolatedData[i] = this.dataSequence[i];
    }
    if (this.interpolatedData.length > 0) {
      this.interpolatedData[this.interpolatedData.length - 1] = currentValue;
    }

    this.sculpture.updateData(this.interpolatedData);
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkIntersection();
  }

  private handleMouseLeave(): void {
    this.sculpture.highlightVertex(-1);
    if (this.vertexInfoEl) {
      this.vertexInfoEl.classList.add('hidden');
    }
  }

  private checkIntersection(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.sculpture.mesh);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        this.sculpture.highlightVertex(index);
        this.showVertexInfo(index);
      }
    } else {
      this.sculpture.highlightVertex(-1);
      if (this.vertexInfoEl) {
        this.vertexInfoEl.classList.add('hidden');
      }
    }
  }

  private showVertexInfo(index: number): void {
    if (this.vertexInfoEl && this.vertexIndexEl && this.vertexValueEl) {
      this.vertexInfoEl.classList.remove('hidden');
      this.vertexIndexEl.textContent = String(index);
      
      const dataValue = this.sculpture.getVertexDataValue(index);
      this.vertexValueEl.textContent = dataValue.toFixed(3);
    }
  }

  private resetView(): void {
    if (this.isResetting) return;

    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartPosition.copy(this.camera.position);
    this.resetStartTarget.copy(this.controls.target);
  }

  private updateResetAnimation(currentTime: number): void {
    if (!this.isResetting) return;

    const duration = 500;
    const elapsed = currentTime - this.resetStartTime;
    const t = Math.min(1, elapsed / duration);

    const easeOut = 1 - Math.pow(1 - t, 3);

    this.camera.position.lerpVectors(this.resetStartPosition, INITIAL_CAMERA_POSITION, easeOut);
    this.controls.target.lerpVectors(this.resetStartTarget, INITIAL_CAMERA_TARGET, easeOut);
    this.controls.update();

    if (t >= 1) {
      this.isResetting = false;
    }
  }

  private takeScreenshot(): void {
    const width = 1920;
    const height = 1080;

    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    const originalPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `sculpture-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    this.renderer.setPixelRatio(originalPixelRatio);
    this.renderer.setSize(originalSize.x, originalSize.y, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 1) {
      this.fps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      if (this.fpsDisplayEl) {
        this.fpsDisplayEl.textContent = `FPS: ${this.fps}`;
      }

      this.checkPerformance();
    }
  }

  private checkPerformance(): void {
    if (this.fps < 40 && !this.performanceDegraded) {
      this.reduceQuality();
    } else if (this.fps >= 50 && this.performanceDegraded) {
      this.restoreQuality();
    }
  }

  private reduceQuality(): void {
    this.performanceDegraded = true;
    this.currentVertexCount = Math.max(500, Math.floor(this.currentVertexCount * 0.9));
    this.sculpture.setVertexCount(this.currentVertexCount);
    this.updateVertexCountDisplay();

    if (this.performanceWarningEl) {
      this.performanceWarningEl.classList.remove('hidden');
    }
  }

  private restoreQuality(): void {
    this.performanceDegraded = false;
    this.currentVertexCount = 2000;
    this.sculpture.setVertexCount(this.currentVertexCount);
    this.updateVertexCountDisplay();

    if (this.performanceWarningEl) {
      this.performanceWarningEl.classList.add('hidden');
    }
  }

  private updateInfoDisplay(): void {
    this.updateVertexCountDisplay();
    this.updateDataSourceDisplay();
  }

  private updateVertexCountDisplay(): void {
    if (this.vertexCountEl) {
      this.vertexCountEl.textContent = `顶点: ${this.currentVertexCount}`;
    }
  }

  private updateDataSourceDisplay(): void {
    if (this.dataSourceEl) {
      const sourceName = this.dataSource === 'simulation' ? '模拟' : 'JSON';
      this.dataSourceEl.textContent = `数据源: ${sourceName}`;
    }
  }

  private animate = (time: number): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    const deltaSeconds = deltaTime / 1000;

    if (this.dataSource === 'simulation') {
      this.updateInterpolatedData(time);
    }

    this.sculpture.update(deltaSeconds);

    if (!this.isResetting) {
      this.controls.update();
    } else {
      this.updateResetAnimation(time);
    }

    this.updateFPS(deltaSeconds);

    this.renderer.render(this.scene, this.camera);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new SculptureApp();
});
