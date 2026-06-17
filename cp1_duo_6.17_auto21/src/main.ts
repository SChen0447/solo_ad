import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particleSystem';
import { ObjectManager } from './objectManager';
import { ControlPanel } from './controlPanel';
import { Recorder } from './recorder';
import { eventBus, defaultParams, SimulationParams } from './eventBus';

class AeroFlowApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private objectManager: ObjectManager;
  private controlPanel: ControlPanel;
  private recorder: Recorder;
  private params: SimulationParams;
  private clock: THREE.Clock;
  private emitterPlane: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private pressureLabel: HTMLDivElement | null = null;
  private animationId: number = 0;

  constructor() {
    this.params = { ...defaultParams };
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0C10);
    this.scene.fog = new THREE.FogExp2(0x0B0C10, 0.015);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.getElementById('canvas-container')!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;

    this.addLights();

    const emitterGeo = new THREE.PlaneGeometry(6, 6);
    const emitterMat = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    this.emitterPlane = new THREE.Mesh(emitterGeo, emitterMat);
    this.emitterPlane.position.set(-12, 0, 0);
    this.emitterPlane.rotation.y = Math.PI / 2;
    this.scene.add(this.emitterPlane);

    const gridHelper = new THREE.GridHelper(40, 40, 0x1a1a2e, 0x0d0d1a);
    gridHelper.position.y = -3;
    this.scene.add(gridHelper);

    this.objectManager = new ObjectManager(this.scene, this.params);
    this.particleSystem = new ParticleSystem(this.scene, this.params, this.objectManager);
    this.controlPanel = new ControlPanel(this.params);
    this.recorder = new Recorder(this.renderer.domElement);
    
    this.recorder.setGetParticleStateCallback(() => this.particleSystem.getParticleState());
    this.recorder.setParticleStateCallback((state) => this.particleSystem.setPlaybackState(state));

    this.setupEvents();
    this.controlPanel.loadPresetsFromBackend();
    this.animate();
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0x4a4a6a, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 10);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x45A29E, 0.3);
    backLight.position.set(-10, 5, -10);
    this.scene.add(backLight);
  }

  private setupEvents(): void {
    eventBus.on('windSpeedChange', (v: number) => {
      this.params.windSpeed = v;
      this.particleSystem.updateParams(this.params);
    });
    eventBus.on('particleDensityChange', (v: number) => {
      this.params.particleDensity = v;
      this.particleSystem.updateParams(this.params);
    });
    eventBus.on('rotationChange', (rx: number, ry: number, rz: number) => {
      this.params.rotationX = rx;
      this.params.rotationY = ry;
      this.params.rotationZ = rz;
      this.objectManager.updateRotation(rx, ry, rz);
    });
    eventBus.on('obstacleTypeChange', (type: string) => {
      this.params.obstacleType = type;
      this.objectManager.setObstacle(type);
      this.particleSystem.updateParams(this.params);
    });
    eventBus.on('displayModeChange', (mode: string) => {
      this.params.displayMode = mode as SimulationParams['displayMode'];
      this.particleSystem.setDisplayMode(this.params.displayMode);
      this.objectManager.setDisplayMode(this.params.displayMode);
    });
    eventBus.on('startRecording', () => this.recorder.start());
    eventBus.on('stopRecording', () => this.recorder.stop());
    eventBus.on('savePreset', (data: any) => this.savePreset(data));
    eventBus.on('loadPreset', (data: any) => {
      const mapped: SimulationParams = {
        obstacleType: data.obstacleType || data.params?.obstacleType || defaultParams.obstacleType,
        windSpeed: data.windSpeed ?? data.params?.windSpeed ?? defaultParams.windSpeed,
        particleDensity: data.particleDensity ?? data.params?.particleDensity ?? defaultParams.particleDensity,
        rotationX: data.rotationX ?? data.params?.rotationX ?? defaultParams.rotationX,
        rotationY: data.rotationY ?? data.params?.rotationY ?? defaultParams.rotationY,
        rotationZ: data.rotationZ ?? data.params?.rotationZ ?? defaultParams.rotationZ,
        displayMode: (data.displayMode || data.params?.displayMode || defaultParams.displayMode) as SimulationParams['displayMode']
      };
      Object.assign(this.params, mapped);
      this.objectManager.setObstacle(this.params.obstacleType);
      this.objectManager.updateRotation(this.params.rotationX, this.params.rotationY, this.params.rotationZ);
      this.particleSystem.updateParams(this.params);
      this.particleSystem.setDisplayMode(this.params.displayMode);
      this.objectManager.setDisplayMode(this.params.displayMode);
      this.controlPanel.updateUI(this.params);
    });
    eventBus.on('deletePreset', (id: any) => this.deletePreset(id));

    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const obstacleMesh = this.objectManager.getObstacleMesh();
    if (!obstacleMesh) return;

    const intersects = this.raycaster.intersectObject(obstacleMesh, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const cp = this.objectManager.getPressureAt(point);
      this.showPressureLabel(point, cp);
    } else {
      this.removePressureLabel();
    }
  }

  private showPressureLabel(worldPos: THREE.Vector3, cp: number): void {
    this.removePressureLabel();
    const label = document.createElement('div');
    label.className = 'pressure-label';
    const color = this.cpToColor(cp);
    label.innerHTML = `<span style="color:${color};font-family:Orbitron;font-size:14px;font-weight:700;">Cp = ${cp.toFixed(3)}</span>`;
    label.style.cssText = `
      position:fixed; z-index:100; pointer-events:none;
      background:rgba(30,40,60,0.9); backdrop-filter:blur(10px);
      border:1px solid ${color}; border-radius:8px;
      padding:6px 12px; transition:opacity 0.3s;
    `;
    document.body.appendChild(label);
    this.pressureLabel = label;
    this.updatePressureLabelPosition(worldPos);
  }

  private updatePressureLabelPosition(worldPos: THREE.Vector3): void {
    if (!this.pressureLabel) return;
    const vector = worldPos.clone().project(this.camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    this.pressureLabel.style.left = `${x + 15}px`;
    this.pressureLabel.style.top = `${y - 15}px`;
  }

  private removePressureLabel(): void {
    if (this.pressureLabel) {
      this.pressureLabel.remove();
      this.pressureLabel = null;
    }
  }

  private cpToColor(cp: number): string {
    const t = Math.max(0, Math.min(1, (cp + 1.5) / 3.0));
    const r = Math.round(t * 255);
    const b = Math.round((1 - t) * 255);
    const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 128);
    return `rgb(${r},${g},${b})`;
  }

  private async savePreset(data: any): Promise<void> {
    try {
      const response = await fetch('/api/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      eventBus.emit('presetSaved', result);
      this.controlPanel.loadPresetsFromBackend();
    } catch (e) {
      console.warn('Failed to save preset:', e);
    }
  }

  private async deletePreset(id: any): Promise<void> {
    try {
      await fetch(`/api/preset/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to delete preset:', e);
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.particleSystem.update(delta, elapsed);
    this.objectManager.update(elapsed);

    this.renderer.render(this.scene, this.camera);

    if (this.recorder.isRecording()) {
      const stats = this.particleSystem.getStats();
      this.recorder.onFrame(stats);
    }
  };
}

new AeroFlowApp();
