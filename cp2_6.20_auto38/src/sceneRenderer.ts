import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneRendererOptions {
  container: HTMLElement;
}

export interface ViewState {
  isPlaying: boolean;
  speed: number;
  time: number;
  showCollision: boolean;
  collisionScale: number;
  flightSpeed: number;
}

export class SceneRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public container: HTMLElement;

  private zoomMin: number = 1;
  private zoomMax: number = 10;

  private starsGeometry!: THREE.BufferGeometry;
  private starsMaterial!: THREE.PointsMaterial;
  private stars!: THREE.Points;

  private gridHelper!: THREE.GridHelper;

  private _clock: THREE.Clock;
  private _lastFrameTime: number = 0;

  private animFrameId: number | null = null;
  private renderCallbacks: Array<(delta: number, elapsed: number) => void> = [];

  constructor(options: SceneRendererOptions) {
    this.container = options.container;
    this._clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x0a0a1a, 15, 50);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = this.zoomMin;
    this.controls.maxDistance = this.zoomMax;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.setupLights();
    this.setupEnvironment();
    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x6366f1, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 1.2, 30);
    blueLight.position.set(-8, 4, -5);
    this.scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 1.0, 30);
    purpleLight.position.set(8, 4, 5);
    this.scene.add(purpleLight);
  }

  private setupEnvironment(): void {
    const starsCount = 1500;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);
    const sizes = new Float32Array(starsCount);

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      const radius = 30 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i3] = 1.0; colors[i3 + 1] = 1.0; colors[i3 + 2] = 1.0;
      } else if (colorChoice < 0.8) {
        colors[i3] = 0.5; colors[i3 + 1] = 0.7; colors[i3 + 2] = 1.0;
      } else {
        colors[i3] = 0.9; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1.0;
      }

      sizes[i] = 0.05 + Math.random() * 0.12;
    }

    this.starsGeometry = new THREE.BufferGeometry();
    this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.starsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(this.starsGeometry, this.starsMaterial);
    this.scene.add(this.stars);

    this.gridHelper = new THREE.GridHelper(40, 40, 0x1e3a5f, 0x0f1f3a);
    this.gridHelper.position.y = -0.5;
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(this.gridHelper);

    const pathGroup = new THREE.Group();
    const axisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-20, 0, 0),
        new THREE.Vector3(20, 0, 0)
      ]),
      new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.4
      })
    );
    pathGroup.add(axisLine);
    this.scene.add(pathGroup);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize);

    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';

    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  public onRender(callback: (delta: number, elapsed: number) => void): void {
    this.renderCallbacks.push(callback);
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = this._clock.getDelta();
    const elapsed = this._clock.elapsedTime;

    this.stars.rotation.y += delta * 0.005;

    for (const cb of this.renderCallbacks) {
      cb(delta, elapsed);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    if (this.animFrameId === null) {
      this._clock.start();
      this.animate();
    }
  }

  public stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('wheel', this.onWheel);

    this.starsGeometry.dispose();
    this.starsMaterial.dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public createTrailMaterial(
    color: number = 0x3b82f6,
    opacity: number = 0.5
  ): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }
}
