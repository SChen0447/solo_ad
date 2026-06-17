import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Neuron } from './neuron';
import { Synapse, SignalPhase } from './synapse';
import { GUIController, SimulationParams } from './gui';

class NeuralSynapseSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private senderNeuron!: Neuron;
  private receiverNeuron!: Neuron;
  private synapse!: Synapse;

  private backgroundParticles: THREE.Points | null = null;
  private particleVelocities: Float32Array | null = null;

  private guiController: GUIController;
  private params: SimulationParams;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private transmissionCount: number = 0;
  private successfulTransmissions: number = 0;

  private autoTriggerTimer: number = 0;
  private isRunning: boolean = false;

  private statusPhaseEl!: HTMLElement;
  private statusCountEl!: HTMLElement;
  private statusRateEl!: HTMLElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.guiController = new GUIController();
    this.params = this.guiController.params;

    const canvasContainer = document.getElementById('canvas-container')!;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.5, 7);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0d0221, 1);
    canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);

    this.setupLights();
    this.setupNeurons();
    this.setupSynapse();
    this.setupBackgroundParticles();
    this.setupEventListeners();
    this.setupGUIListeners();
    this.initStatusPanel();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 8, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);

    const purpleLight = new THREE.PointLight(0x8844ff, 0.5, 15);
    purpleLight.position.set(-3, 2, 3);
    this.scene.add(purpleLight);

    const blueLight = new THREE.PointLight(0x4488ff, 0.4, 15);
    blueLight.position.set(4, -2, 2);
    this.scene.add(blueLight);
  }

  private setupNeurons(): void {
    this.senderNeuron = new Neuron({
      position: new THREE.Vector3(-2.5, 0, 0),
      isSender: true
    });
    this.scene.add(this.senderNeuron.group);

    this.receiverNeuron = new Neuron({
      position: new THREE.Vector3(2.5, 0, 0),
      isSender: false
    });
    this.scene.add(this.receiverNeuron.group);
  }

  private setupSynapse(): void {
    this.synapse = new Synapse(this.senderNeuron, this.receiverNeuron);
    this.scene.add(this.synapse.group);
  }

  private setupBackgroundParticles(): void {
    this.createBackgroundParticles(this.params.backgroundParticleDensity);
  }

  private createBackgroundParticles(count: number): void {
    if (this.backgroundParticles) {
      this.scene.remove(this.backgroundParticles);
      this.backgroundParticles.geometry.dispose();
      (this.backgroundParticles.material as THREE.Material).dispose();
      this.backgroundParticles = null;
      this.particleVelocities = null;
    }

    const positions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.005;
      this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;

      const colorVariation = 0.5 + Math.random() * 0.5;
      colors[i * 3] = 0.3 * colorVariation;
      colors[i * 3 + 1] = 0.4 * colorVariation;
      colors[i * 3 + 2] = 0.8 * colorVariation + 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.backgroundParticles = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundParticles);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('click', (e) => this.onMouseClick(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startSimulation());
    }
  }

  private setupGUIListeners(): void {
    this.guiController.onTrigger(() => this.triggerSignal());

    this.guiController.onParamsChange((params: SimulationParams) => {
      this.params = { ...params };
      if (params.backgroundParticleDensity !== this.backgroundParticles?.geometry.attributes.position.count) {
        this.createBackgroundParticles(params.backgroundParticleDensity);
      }
    });
  }

  private initStatusPanel(): void {
    this.statusPhaseEl = document.getElementById('status-phase')!;
    this.statusCountEl = document.getElementById('status-count')!;
    this.statusRateEl = document.getElementById('status-rate')!;
  }

  private startSimulation(): void {
    const startScreen = document.getElementById('start-screen');
    const infoPanel = document.getElementById('info-panel');

    if (startScreen) {
      startScreen.classList.add('hidden');
      setTimeout(() => {
        startScreen.style.display = 'none';
      }, 800);
    }

    if (infoPanel) {
      infoPanel.style.display = 'block';
    }

    this.guiController.show();
    this.isRunning = true;
    this.animate();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.isRunning) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.senderNeuron.soma, false);

    if (intersects.length > 0) {
      this.triggerSignal();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.isRunning) return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.triggerSignal();
    }
  }

  private triggerSignal(): void {
    if (this.synapse.status.phase !== 'waiting' && this.synapse.status.phase !== 'complete') {
      return;
    }

    this.transmissionCount++;
    const success = this.synapse.triggerSignal(
      this.params.signalIntensity,
      this.params.signalSpeed
    );

    if (success) {
      this.successfulTransmissions++;
    }

    this.updateStatusUI();
  }

  private updateStatusUI(): void {
    const phaseTextMap: Record<SignalPhase, { text: string; class: string }> = {
      waiting: { text: '等待', class: 'status-info' },
      propagating: { text: '传播中', class: 'status-active' },
      releasing: { text: '释放中', class: 'status-warning' },
      receiving: { text: '接收中', class: 'status-active' },
      complete: { text: '完成', class: 'status-info' }
    };

    const phaseInfo = phaseTextMap[this.synapse.status.phase];
    this.statusPhaseEl.textContent = phaseInfo.text;
    this.statusPhaseEl.className = 'info-value ' + phaseInfo.class;

    this.statusCountEl.textContent = this.transmissionCount.toString();

    const rate = this.transmissionCount > 0
      ? Math.round((this.successfulTransmissions / this.transmissionCount) * 100)
      : 100;
    this.statusRateEl.textContent = rate + '%';
  }

  private updateBackgroundParticles(deltaTime: number): void {
    if (!this.backgroundParticles || !this.particleVelocities) return;

    const positions = this.backgroundParticles.geometry.attributes.position.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += this.particleVelocities[i * 3] * deltaTime * 60;
      positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * deltaTime * 60;
      positions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * deltaTime * 60;

      const distance = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );

      if (distance > 13) {
        const scale = 4 / distance;
        positions[i * 3] *= scale;
        positions[i * 3 + 1] *= scale;
        positions[i * 3 + 2] *= scale;
      }

      if (Math.random() < 0.001) {
        this.particleVelocities[i * 3] += (Math.random() - 0.5) * 0.003;
        this.particleVelocities[i * 3 + 1] += (Math.random() - 0.5) * 0.003;
        this.particleVelocities[i * 3 + 2] += (Math.random() - 0.5) * 0.003;
      }
    }

    (this.backgroundParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateAutoTrigger(deltaTime: number): void {
    if (this.params.randomTriggerInterval <= 0) return;

    this.autoTriggerTimer += deltaTime;
    if (this.autoTriggerTimer >= this.params.randomTriggerInterval) {
      this.autoTriggerTimer = 0;
      this.triggerSignal();
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();

    this.senderNeuron.update(deltaTime);
    this.receiverNeuron.update(deltaTime);
    this.synapse.setCameraPosition(this.camera.position);
    this.synapse.update(deltaTime);

    this.updateBackgroundParticles(deltaTime);
    this.updateAutoTrigger(deltaTime);
    this.updateStatusUI();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.isRunning = false;
    this.senderNeuron.dispose();
    this.receiverNeuron.dispose();
    this.synapse.dispose();

    if (this.backgroundParticles) {
      this.scene.remove(this.backgroundParticles);
      this.backgroundParticles.geometry.dispose();
      (this.backgroundParticles.material as THREE.Material).dispose();
    }

    this.guiController.destroy();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

let simulator: NeuralSynapseSimulator | null = null;

document.addEventListener('DOMContentLoaded', () => {
  simulator = new NeuralSynapseSimulator();
});

window.addEventListener('beforeunload', () => {
  if (simulator) {
    simulator.dispose();
  }
});
