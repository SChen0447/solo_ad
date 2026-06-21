import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WaveSource } from './WaveSource';
import { WavePropagator } from './WavePropagator';
import { WaveGUI } from './GUI';
import { AuxiliaryView } from './AuxiliaryView';

const BOUNDARY_RADIUS = 10;
const INITIAL_FREQUENCY = 500;
const INITIAL_PHASE = 0;
const INITIAL_WAVE_SPEED = 200;

class App {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  
  private waveSource1!: WaveSource;
  private waveSource2!: WaveSource;
  private wavePropagator!: WavePropagator;
  private gui!: WaveGUI;
  private auxiliaryView!: AuxiliaryView;
  
  private boundarySphere!: THREE.Mesh;
  
  private clock!: THREE.Clock;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.createBackground();
    this.createBoundary();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 10, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.enablePan = true;

    const source1Pos = new THREE.Vector3(-3, 0, 0);
    const source2Pos = new THREE.Vector3(3, 0, 0);

    this.waveSource1 = new WaveSource(
      {
        position: source1Pos,
        color: 0xff4444,
        radius: 0.4,
        boundaryRadius: BOUNDARY_RADIUS
      },
      this.camera,
      this.renderer.domElement
    );
    this.waveSource1.onPositionChange = (pos) => {
      this.wavePropagator.setSource1Position(pos);
      this.auxiliaryView.setSource1Position(pos);
    };
    this.scene.add(this.waveSource1.mesh);

    this.waveSource2 = new WaveSource(
      {
        position: source2Pos,
        color: 0x4488ff,
        radius: 0.4,
        boundaryRadius: BOUNDARY_RADIUS
      },
      this.camera,
      this.renderer.domElement
    );
    this.waveSource2.onPositionChange = (pos) => {
      this.wavePropagator.setSource2Position(pos);
      this.auxiliaryView.setSource2Position(pos);
    };
    this.scene.add(this.waveSource2.mesh);

    this.wavePropagator = new WavePropagator(
      source1Pos,
      source2Pos,
      0xff4444,
      0x4488ff,
      BOUNDARY_RADIUS,
      {
        frequency: INITIAL_FREQUENCY,
        phaseOffset: INITIAL_PHASE,
        waveSpeed: INITIAL_WAVE_SPEED
      }
    );
    this.scene.add(this.wavePropagator.getMesh());

    this.gui = new WaveGUI(
      this.container,
      {
        frequency: INITIAL_FREQUENCY,
        phaseOffset: INITIAL_PHASE,
        waveSpeed: INITIAL_WAVE_SPEED
      },
      {
        onFrequencyChange: (freq) => {
          this.wavePropagator.setFrequency(freq);
        },
        onPhaseChange: (phase) => {
          this.wavePropagator.setPhaseOffset(phase);
        },
        onWaveSpeedChange: (speed) => {
          this.wavePropagator.setWaveSpeed(speed);
        },
        onSnapshot: () => {
          return this.wavePropagator.captureInterferenceSnapshot();
        }
      }
    );

    this.auxiliaryView = new AuxiliaryView({
      container: this.container,
      boundaryRadius: BOUNDARY_RADIUS,
      sliceTexture: this.wavePropagator.getSliceTexture(),
      sizeRatio: 0.25
    });
    this.auxiliaryView.setSource1Position(source1Pos);
    this.auxiliaryView.setSource2Position(source2Pos);

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  private createBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#151030');
    gradient.addColorStop(1, '#0a0515');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private createBoundary(): void {
    const geometry = new THREE.SphereGeometry(BOUNDARY_RADIUS, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      wireframe: false
    });
    this.boundarySphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.boundarySphere);

    const wireframeGeometry = new THREE.SphereGeometry(BOUNDARY_RADIUS, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x6699cc,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    });
    const wireframeSphere = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    this.scene.add(wireframeSphere);
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    
    this.auxiliaryView.resize();
  };

  public start(): void {
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.waveSource1.update(deltaTime);
    this.waveSource2.update(deltaTime);

    this.wavePropagator.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
    
    this.auxiliaryView.render();
  };

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onResize);

    this.waveSource1.dispose();
    this.waveSource2.dispose();
    this.wavePropagator.dispose();
    this.gui.dispose();
    this.auxiliaryView.dispose();
    
    this.controls.dispose();
    this.renderer.dispose();
    this.boundarySphere.geometry.dispose();
    (this.boundarySphere.material as THREE.Material).dispose();
  }
}

const container = document.getElementById('app');
if (container) {
  const app = new App(container);
  app.start();
}
