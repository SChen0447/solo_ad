import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainManager } from './terrain';
import { ControlPanel } from './controls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: TerrainManager;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private compassNeedle: HTMLElement;

  constructor() {
    this.container = document.getElementById('app')!;
    this.compassNeedle = document.getElementById('compass-needle')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a2e');

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 12, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();

    this.terrain = new TerrainManager();
    this.scene.add(this.terrain.mesh);
    this.scene.add(this.terrain.wireframe);
    this.scene.add(this.terrain.ridgeLine);
    this.scene.add(this.terrain.faultLines);
    this.scene.add(this.terrain.shearPlane);

    this.setupLights();
    this.setupGrid();

    new ControlPanel({
      onParamsChange: (params) => this.terrain.setParams(params)
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.target.set(0, 0, 0);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.enablePan = true;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(15, 25, 15);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6688aa, 0.25);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(60, 60, 0x333344, 0x222233);
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCompass(): void {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const angle = Math.atan2(dir.x, -dir.z);
    const angleDeg = (angle * 180) / Math.PI;
    this.compassNeedle.style.transform = `rotate(${angleDeg}deg)`;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.terrain.update(delta);
    this.controls.update();
    this.updateCompass();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
