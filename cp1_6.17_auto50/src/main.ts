import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './scene/SceneManager';
import { UIManager } from './ui/UIManager';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private sceneManager: SceneManager;
  private uiManager: UIManager;
  private clock: THREE.Clock;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientTexture();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 4, 7);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.panSpeed = 0.5;
    this.controls.zoomSpeed = 1.0;

    this.addLights();
    this.addHelpers();

    this.sceneManager = new SceneManager(this.scene);
    this.uiManager = new UIManager(this.sceneManager);

    this.clock = new THREE.Clock();

    this.addDefaultGeometry();

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mouseup', () => this.uiManager.onMouseUp());

    this.animate();
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private addLights(): void {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 8, 5);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-3, 4, -5);
    this.scene.add(dirLight2);
  }

  private addHelpers(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    this.scene.add(gridHelper);

    const axisLen = 3;
    const axisX = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      axisLen, 0xff0000, 0.3, 0.15
    );
    const axisY = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      axisLen, 0x00ff00, 0.3, 0.15
    );
    const axisZ = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      axisLen, 0x0000ff, 0.3, 0.15
    );
    this.scene.add(axisX, axisY, axisZ);
  }

  private addDefaultGeometry(): void {
    this.sceneManager.addGeometry('sphere', new THREE.Vector3(-1.5, 0, 0), 1);
    this.sceneManager.addGeometry('cube', new THREE.Vector3(1.5, 0, 0), 1.5);
    this.sceneManager.setBooleanMode('union');
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.controls.update();
    this.sceneManager.updateAnimation(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
