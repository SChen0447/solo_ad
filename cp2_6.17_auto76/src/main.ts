import * as THREE from 'three';
import { FluidSimulator, FluidParams } from './fluidSimulator';
import { ParticleSystem } from './particleSystem';

interface Preset {
  name: string;
  params: FluidParams;
  hue: number;
}

const presets: Record<string, Preset> = {
  water: {
    name: 'water',
    params: {
      viscosity: 1.0,
      density: 1.0,
      pressureStrength: 500,
      particleRadius: 0.1,
      velocityDamping: 0.98,
      boundaryForce: 0.5
    },
    hue: 0.55
  },
  honey: {
    name: 'honey',
    params: {
      viscosity: 8.0,
      density: 1.8,
      pressureStrength: 300,
      particleRadius: 0.12,
      velocityDamping: 0.95,
      boundaryForce: 0.3
    },
    hue: 0.1
  },
  smoke: {
    name: 'smoke',
    params: {
      viscosity: 0.3,
      density: 0.6,
      pressureStrength: 800,
      particleRadius: 0.08,
      velocityDamping: 0.995,
      boundaryForce: 0.8
    },
    hue: 0.7
  }
};

const PARTICLE_COUNT = 1500;
const ROTATION_SPEED = 0.5;
const PAN_SPEED = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const DEFAULT_DISTANCE = 8;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private fluidSimulator: FluidSimulator;
  private particleSystem: ParticleSystem;
  private currentParams: FluidParams;
  private isPaused: boolean;
  private lastTime: number;
  private frameCount: number;
  private fpsUpdateTime: number;
  private currentFps: number;

  private isRotating: boolean;
  private isPanning: boolean;
  private previousMousePosition: { x: number; y: number };
  private cameraDistance: number;
  private cameraTheta: number;
  private cameraPhi: number;
  private panOffset: THREE.Vector3;
  private target: THREE.Vector3;

  private fpsElement: HTMLElement;
  private pauseIndicator: HTMLElement;
  private particleCountElement: HTMLElement;
  private lastParticleCountUpdate: number;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.fpsElement = document.getElementById('fps-value')!;
    this.pauseIndicator = document.getElementById('pause-indicator')!;
    this.particleCountElement = document.getElementById('particle-count')!;
    this.lastParticleCountUpdate = 0;

    this.currentParams = { ...presets.water.params };
    this.isPaused = false;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsUpdateTime = this.lastTime;
    this.currentFps = 60;

    this.isRotating = false;
    this.isPanning = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.cameraDistance = DEFAULT_DISTANCE;
    this.cameraTheta = Math.PI / 4;
    this.cameraPhi = Math.PI / 3;
    this.panOffset = new THREE.Vector3();
    this.target = new THREE.Vector3(0, 0, 0);

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.fluidSimulator = new FluidSimulator(PARTICLE_COUNT, this.currentParams);
    this.particleSystem = new ParticleSystem(PARTICLE_COUNT, this.currentParams.particleRadius);

    this.scene.add(this.particleSystem.getMesh());
    this.addBoundary();

    this.setupEventListeners();
    this.updateCameraPosition();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 2, 2);
    gradient.addColorStop(0, '#0a0f28');
    gradient.addColorStop(1, '#1a1040');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 2);

    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
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
    renderer.setClearColor(0x0a0f28, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private addBoundary(): void {
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.05
    });
    const boundary = new THREE.Mesh(geometry, material);
    this.scene.add(boundary);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(
      x + this.panOffset.x,
      y + this.panOffset.y,
      z + this.panOffset.z
    );
    this.camera.lookAt(this.target.clone().add(this.panOffset));
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.setupControlPanel();
    this.setupPresetButtons();
  }

  private setupControlPanel(): void {
    const controls: Array<{ id: string; param: keyof FluidParams; decimals: number }> = [
      { id: 'viscosity', param: 'viscosity', decimals: 1 },
      { id: 'density', param: 'density', decimals: 2 },
      { id: 'pressure', param: 'pressureStrength', decimals: 0 },
      { id: 'radius', param: 'particleRadius', decimals: 2 },
      { id: 'damping', param: 'velocityDamping', decimals: 3 },
      { id: 'boundary', param: 'boundaryForce', decimals: 2 }
    ];

    controls.forEach(({ id, param, decimals }) => {
      const slider = document.getElementById(id) as HTMLInputElement;
      const input = document.getElementById(`${id}-input`) as HTMLInputElement;

      if (slider && input) {
        const min = parseFloat(input.dataset.min!);
        const max = parseFloat(input.dataset.max!);
        const step = parseFloat(input.dataset.step!);

        slider.addEventListener('input', () => {
          const value = parseFloat(slider.value);
          this.applyParam(param, value, decimals, slider, input);
        });

        input.addEventListener('input', () => {
          let raw = input.value.replace(/[^0-9.]/g, '');
          const dotIndex = raw.indexOf('.');
          if (dotIndex !== -1) {
            raw = raw.substring(0, dotIndex + 1) + raw.substring(dotIndex + 1).replace(/\./g, '');
          }
          input.value = raw;
        });

        input.addEventListener('blur', () => {
          let value = parseFloat(input.value);
          if (isNaN(value)) {
            value = parseFloat(slider.value);
          }
          value = Math.round(value / step) * step;
          value = Math.max(min, Math.min(max, value));
          this.applyParam(param, value, decimals, slider, input);
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
          }
        });
      }
    });
  }

  private applyParam(
    param: keyof FluidParams,
    value: number,
    decimals: number,
    slider: HTMLInputElement,
    input: HTMLInputElement
  ): void {
    this.currentParams[param] = value;
    this.fluidSimulator.setParams({ [param]: value });
    slider.value = value.toString();
    input.value = value.toFixed(decimals);

    if (param === 'particleRadius') {
      this.particleSystem.setParticleRadius(value);
    }
  }

  private setupPresetButtons(): void {
    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetName = (btn as HTMLElement).dataset.preset as string;
        const preset = presets[presetName];
        if (preset) {
          buttons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          this.fluidSimulator.startTransition(preset.params);
          this.particleSystem.setTargetColors(preset.hue);

          Object.assign(this.currentParams, preset.params);
          this.updateSliderValues(preset.params);
        }
      });
    });
  }

  private updateSliderValues(params: FluidParams): void {
    (document.getElementById('viscosity') as HTMLInputElement).value = params.viscosity.toString();
    (document.getElementById('viscosity-input') as HTMLInputElement).value = params.viscosity.toFixed(1);

    (document.getElementById('density') as HTMLInputElement).value = params.density.toString();
    (document.getElementById('density-input') as HTMLInputElement).value = params.density.toFixed(2);

    (document.getElementById('pressure') as HTMLInputElement).value = params.pressureStrength.toString();
    (document.getElementById('pressure-input') as HTMLInputElement).value = params.pressureStrength.toFixed(0);

    (document.getElementById('radius') as HTMLInputElement).value = params.particleRadius.toString();
    (document.getElementById('radius-input') as HTMLInputElement).value = params.particleRadius.toFixed(2);

    (document.getElementById('damping') as HTMLInputElement).value = params.velocityDamping.toString();
    (document.getElementById('damping-input') as HTMLInputElement).value = params.velocityDamping.toFixed(3);

    (document.getElementById('boundary') as HTMLInputElement).value = params.boundaryForce.toString();
    (document.getElementById('boundary-input') as HTMLInputElement).value = params.boundaryForce.toFixed(2);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.togglePause();
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.particleSystem.setPaused(this.isPaused);

    if (this.isPaused) {
      this.pauseIndicator.classList.add('visible');
    } else {
      this.pauseIndicator.classList.remove('visible');
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    if (e.button === 0) {
      this.isRotating = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    if (this.isRotating) {
      this.cameraTheta -= deltaX * ROTATION_SPEED * 0.01;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - deltaY * ROTATION_SPEED * 0.01));
      this.updateCameraPosition();
    }

    if (this.isPanning) {
      const up = new THREE.Vector3(0, 1, 0);
      const forward = new THREE.Vector3().subVectors(this.camera.position, this.target).normalize();
      const right = new THREE.Vector3().crossVectors(up, forward).normalize();

      const panAmount = PAN_SPEED * 0.01 * this.cameraDistance;
      this.panOffset.add(right.multiplyScalar(-deltaX * panAmount));
      this.panOffset.add(up.multiplyScalar(deltaY * panAmount));
      this.updateCameraPosition();
    }

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isRotating = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = 1 + e.deltaY * 0.001;
    this.cameraDistance = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.cameraDistance * zoomFactor));
    this.updateCameraPosition();
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      this.fpsElement.textContent = this.currentFps.toString();
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.updateFPS(currentTime);

    if (currentTime - this.lastParticleCountUpdate >= 1000) {
      this.particleCountElement.textContent = this.particleSystem.getActiveCount().toString();
      this.lastParticleCountUpdate = currentTime;
    }

    if (!this.isPaused) {
      const particleData = this.fluidSimulator.step(deltaTime);
      this.particleSystem.update(particleData, deltaTime);
    } else {
      const particleData = this.fluidSimulator.getParticles();
      this.particleSystem.update(particleData, deltaTime);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
