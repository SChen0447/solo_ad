import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Character, CharacterParams } from './character';
import { Shelf } from './shelf';
import { InteractionManager, InteractionState } from './interaction';
import { UIManager } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private character: Character;
  private shelf: Shelf;
  private interactionManager: InteractionManager;
  private uiManager: UIManager;
  private container: HTMLElement;
  private lastTime: number = 0;
  private frameCount: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8e8e8);
    this.scene.fog = new THREE.Fog(0xe8e8e8, 300, 600);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(250, 150, 300);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 500;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI * 2 / 3;
    this.controls.target.set(0, 80, 0);

    this.setupLighting();
    this.createGround();

    const initialParams: CharacterParams = {
      height: 170,
      armLength: 75,
      shoulderWidth: 45
    };

    this.character = new Character(initialParams);
    this.character.group.position.set(-120, 0, 0);
    this.scene.add(this.character.group);

    this.shelf = new Shelf();
    this.shelf.group.position.set(0, 0, 0);
    this.scene.add(this.shelf.group);

    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.character,
      this.shelf
    );

    this.uiManager = new UIManager({
      onParamsChange: this.onCharacterParamsChange.bind(this),
      onResetItems: this.onResetItems.bind(this),
      onHelpersToggle: this.onHelpersToggle.bind(this)
    });

    this.interactionManager.setOnStateChange(this.onInteractionStateChange.bind(this));

    this.setupControlsListeners();
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.bias = -0.001;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, 100, -100);
    this.scene.add(fillLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.4);
    this.scene.add(hemisphereLight);
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(800, 800);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(800, 40, 0xaaaaaa, 0xcccccc);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private setupControlsListeners(): void {
    this.controls.addEventListener('start', () => {
      this.uiManager.setVignetteActive(true);
    });

    this.controls.addEventListener('end', () => {
      this.uiManager.setVignetteActive(false);
    });
  }

  private onCharacterParamsChange(params: Partial<CharacterParams>): void {
    this.character.updateParams(params);
  }

  private onResetItems(): void {
    this.shelf.resetItemPositions();
  }

  private onHelpersToggle(show: boolean): void {
    this.character.setHelpersVisible(show);
    this.shelf.setHelpersVisible(show);
  }

  private onInteractionStateChange(state: InteractionState): void {
    this.uiManager.updateInteractionState(state);
  }

  private updateHeightLabel(): void {
    const headPosition = this.character.getHeadPosition();
    const screenPosition = headPosition.clone().project(this.camera);
    const x = (screenPosition.x + 1) / 2 * window.innerWidth;
    const y = (-screenPosition.y + 1) / 2 * window.innerHeight - 30;
    
    if (screenPosition.z < 1) {
      this.uiManager.showHeightLabel();
      this.uiManager.updateHeightLabel(x, y, this.character.params.height);
    } else {
      this.uiManager.hideHeightLabel();
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastTime >= 1000) {
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  private animate(): void {
    requestAnimationFrame((time) => {
      this.animate();
      
      this.updateFPS(time);
      this.controls.update();
      this.interactionManager.update();
      this.updateHeightLabel();
      
      this.renderer.render(this.scene, this.camera);
    });
  }

  public dispose(): void {
    this.character.dispose();
    this.shelf.dispose();
    this.interactionManager.dispose();
    this.uiManager.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.container.removeChild(this.renderer.domElement);
  }
}

const app = new App();
window.addEventListener('beforeunload', () => {
  app.dispose();
});
