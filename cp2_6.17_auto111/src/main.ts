import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateBuildingCluster, createGround, defaultBuildingConfig } from './buildingGenerator';
import { SunlightSimulator } from './sunlightSimulator';
import { UIController, getControlElements } from './uiController';

class Application {
  private mainScene: THREE.Scene;
  private mainCamera: THREE.PerspectiveCamera;
  private mainRenderer: THREE.WebGLRenderer;
  private mainControls: OrbitControls;

  private minimapCamera: THREE.OrthographicCamera;
  private minimapRenderer: THREE.WebGLRenderer;

  private sunlightSimulator: SunlightSimulator;

  private readonly MAIN_CLEAR_COLOR = 0x1a1a2e;
  private readonly MINIMAP_CLEAR_COLOR = 0x16213e;
  private readonly GROUND_SIZE = 50;
  private readonly CAMERA_FOV = 60;
  private readonly MINIMAP_SIZE = 200;
  private readonly MINIMAP_HEIGHT = 200;

  constructor() {
    this.mainScene = new THREE.Scene();
    this.mainScene.background = new THREE.Color(this.MAIN_CLEAR_COLOR);
    this.mainScene.fog = new THREE.Fog(this.MAIN_CLEAR_COLOR, 80, 150);

    this.mainCamera = this.createMainCamera();
    this.mainRenderer = this.createMainRenderer();
    this.mainControls = this.createOrbitControls(this.mainCamera, this.mainRenderer.domElement);

    this.minimapCamera = this.createMinimapCamera();
    this.minimapRenderer = this.createMinimapRenderer();

    this.addGround();
    this.buildSceneContent();

    this.sunlightSimulator = new SunlightSimulator(this.mainScene);

    const controlElements = getControlElements();
    new UIController(controlElements, this.sunlightSimulator);

    this.addCompass();
    this.setupWindowResizeHandler();
    this.animate();
  }

  private createMainCamera(): THREE.PerspectiveCamera {
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const camera = new THREE.PerspectiveCamera(
      this.CAMERA_FOV,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      500
    );
    camera.position.set(28, 22, 30);
    camera.lookAt(0, 8, 0);
    return camera;
  }

  private createMainRenderer(): THREE.WebGLRenderer {
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return renderer;
  }

  private createOrbitControls(camera: THREE.Camera, domElement: HTMLElement): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 6, 0);
    controls.minDistance = 8;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minPolarAngle = 0.15;
    controls.screenSpacePanning = false;
    return controls;
  }

  private createMinimapCamera(): THREE.OrthographicCamera {
    const aspect = 1;
    const viewSize = 32;
    const halfView = viewSize / 2;
    const camera = new THREE.OrthographicCamera(
      -halfView * aspect,
      halfView * aspect,
      halfView,
      -halfView,
      0.1,
      500
    );
    camera.position.set(0, this.MINIMAP_HEIGHT, 0);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createMinimapRenderer(): THREE.WebGLRenderer {
    const canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.MINIMAP_SIZE, this.MINIMAP_SIZE, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(this.MINIMAP_CLEAR_COLOR, 1);
    return renderer;
  }

  private addGround(): void {
    const ground = createGround(this.GROUND_SIZE);
    this.mainScene.add(ground);

    const gridHelper = new THREE.GridHelper(this.GROUND_SIZE, 50, 0x533483, 0x0f3460);
    (gridHelper.material as THREE.Material).opacity = 0.35;
    (gridHelper.material as THREE.Material).transparent = true;
    this.mainScene.add(gridHelper);
  }

  private buildSceneContent(): void {
    const buildingCluster = generateBuildingCluster({
      floors: defaultBuildingConfig.floors,
      floorHeight: defaultBuildingConfig.floorHeight,
      width: defaultBuildingConfig.width,
      depth: defaultBuildingConfig.depth,
      wallColor: defaultBuildingConfig.wallColor,
      roofColor: defaultBuildingConfig.roofColor,
      windowColor: defaultBuildingConfig.windowColor
    });
    this.mainScene.add(buildingCluster);
  }

  private addCompass(): void {
    const compassGroup = new THREE.Group();

    const northArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(-this.GROUND_SIZE / 2 + 2, 0.02, -this.GROUND_SIZE / 2 + 2),
      4,
      0xe94560,
      1.2,
      0.6
    );
    compassGroup.add(northArrow);

    const northLabel = this.createTextSprite('N', 0xe94560);
    northLabel.position.set(-this.GROUND_SIZE / 2 + 2, 4.8, -this.GROUND_SIZE / 2 + 2);
    compassGroup.add(northLabel);

    this.mainScene.add(compassGroup);
  }

  private createTextSprite(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 72px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.shadowColor = 'rgba(233, 69, 96, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 3, 1);
    return sprite;
  }

  private setupWindowResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.onResize();
    });
  }

  private onResize(): void {
    const canvas = this.mainRenderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.mainCamera.aspect = width / height;
    this.mainCamera.updateProjectionMatrix();
    this.mainRenderer.setSize(width, height, false);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.mainControls.update();

    this.mainRenderer.setClearColor(this.MAIN_CLEAR_COLOR, 1);
    this.mainRenderer.render(this.mainScene, this.mainCamera);

    this.minimapRenderer.setViewport(0, 0, this.MINIMAP_SIZE, this.MINIMAP_SIZE);
    this.minimapRenderer.setScissor(0, 0, this.MINIMAP_SIZE, this.MINIMAP_SIZE);
    this.minimapRenderer.setScissorTest(true);
    this.minimapRenderer.setClearColor(this.MINIMAP_CLEAR_COLOR, 1);
    this.minimapRenderer.render(this.mainScene, this.minimapCamera);
    this.minimapRenderer.setScissorTest(false);
  }
}

function init(): void {
  try {
    new Application();
  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
