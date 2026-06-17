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
  private compassGroup: THREE.Group;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('app')!;
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();

    this.terrain = new TerrainManager();
    this.scene.add(this.terrain.mesh);
    this.scene.add(this.terrain.wireframe);
    this.scene.add(this.terrain.ridgeLine);
    this.scene.add(this.terrain.faultLines);
    this.scene.add(this.terrain.shearPlane);

    this.compassGroup = this.createCompass();
    this.scene.add(this.compassGroup);

    this.setupLights();
    this.setupGrid();

    this.controlPanel = new ControlPanel({
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
    this.controls.keys = {
      LEFT: 'ShiftLeft',
      UP: 'ArrowUp',
      RIGHT: 'ShiftRight',
      BOTTOM: 'ArrowDown'
    };
    this.controls.enablePan = true;
  }

  private createCompass(): THREE.Group {
    const group = new THREE.Group();

    const ringGeo = new THREE.RingGeometry(1.8, 2, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    const northGeo = new THREE.ConeGeometry(0.25, 0.8, 8);
    const northMat = new THREE.MeshBasicMaterial({ color: 0xE53935 });
    const north = new THREE.Mesh(northGeo, northMat);
    north.position.set(0, 0, -1.4);
    north.rotation.x = Math.PI / 2;
    group.add(north);

    const southGeo = new THREE.ConeGeometry(0.2, 0.6, 8);
    const southMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const south = new THREE.Mesh(southGeo, southMat);
    south.position.set(0, 0, 1.4);
    south.rotation.x = -Math.PI / 2;
    group.add(south);

    const eastGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const eastMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const east = new THREE.Mesh(eastGeo, eastMat);
    east.position.set(1.4, 0, 0);
    group.add(east);

    const west = new THREE.Mesh(eastGeo, eastMat);
    west.position.set(-1.4, 0, 0);
    group.add(west);

    const centerGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xE0E0E0 });
    const center = new THREE.Mesh(centerGeo, centerMat);
    group.add(center);

    group.position.set(-14, 1, -14);
    group.scale.set(0.8, 0.8, 0.8);

    return group;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
    directionalLight.position.set(15, 25, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -40;
    directionalLight.shadow.camera.right = 40;
    directionalLight.shadow.camera.top = 40;
    directionalLight.shadow.camera.bottom = -40;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6688aa, 0.3);
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
    this.compassGroup.rotation.y = -angle;
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
