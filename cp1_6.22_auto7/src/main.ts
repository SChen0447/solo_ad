import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { ArtifactController } from './scene/ArtifactController';
import { TimelineManager } from './timeline/TimelineManager';
import { ParticleEffects } from './effects/ParticleEffects';
import { artifactData, formatYear } from './data/artifactData';

class MuseumApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private artifactController: ArtifactController;
  private timelineManager: TimelineManager;
  private particleEffects: ParticleEffects;
  private clock: THREE.Clock;
  private infoCard: HTMLElement;
  private cardTitle: HTMLElement;
  private cardEra: HTMLElement;
  private cardDesc: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.infoCard = document.getElementById('info-card')!;
    this.cardTitle = document.getElementById('card-title')!;
    this.cardEra = document.getElementById('card-era')!;
    this.cardDesc = document.getElementById('card-desc')!;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.setupLights();
    this.setupGround();

    this.particleEffects = new ParticleEffects(this.scene);
    this.artifactController = new ArtifactController(this.scene, this.particleEffects);
    this.artifactController.showFirstArtifact();

    this.timelineManager = new TimelineManager({
      containerId: 'timeline-container',
      onNodeSelect: (index) => this.handleArtifactSwitch(index)
    });

    this.setupEventListeners();
    this.animateCameraToArtifact(0);

    this.onWindowResize();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(4, 2, 4);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById('canvas-container')!;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0, 0);
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    directionalLight.position.set(-3, 5, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffd700, 0.2);
    fillLight.position.set(3, 2, -3);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(8, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1208,
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('#info-card') &&
        !target.closest('#canvas-container') &&
        !target.closest('#timeline-container')
      ) {
        this.hideInfoCard();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        this.timelineManager.nextNode();
      } else if (e.key === 'ArrowLeft') {
        this.timelineManager.prevNode();
      }
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const currentArtifactData = this.artifactController.getCurrentArtifactData();
    const artifactGroup = this.scene.children.find(
      child => child instanceof THREE.Group && child.visible
    );

    if (artifactGroup) {
      const intersects = this.raycaster.intersectObjects(artifactGroup.children, true);
      if (intersects.length > 0) {
        this.showInfoCard(event.clientX, event.clientY, currentArtifactData);
        return;
      }
    }

    this.hideInfoCard();
  }

  private showInfoCard(x: number, y: number, data: typeof artifactData[0]): void {
    this.cardTitle.textContent = data.name;
    this.cardEra.textContent = formatYear(data.year);
    this.cardDesc.textContent = data.description;

    this.infoCard.style.left = `${x + 15}px`;
    this.infoCard.style.top = `${y - 50}px`;

    this.infoCard.classList.add('visible');

    const cardRect = this.infoCard.getBoundingClientRect();
    if (cardRect.right > window.innerWidth - 20) {
      this.infoCard.style.left = `${x - cardRect.width - 15}px`;
    }
    if (cardRect.top < 80) {
      this.infoCard.style.top = `${80}px`;
    }
  }

  private hideInfoCard(): void {
    this.infoCard.classList.remove('visible');
  }

  private handleArtifactSwitch(index: number): void {
    this.artifactController.switchToArtifact(index, () => {
      this.animateCameraToArtifact(index);
    });

    const data = artifactData[index];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2.5;
    this.showInfoCard(centerX, centerY, data);
  }

  private animateCameraToArtifact(index: number): void {
    const data = artifactData[index];
    const distance = 4;
    const elevationAngle = Math.PI / 6;
    const azimuthAngle = data.cameraAngle;

    const targetPosition = new THREE.Vector3(
      distance * Math.cos(elevationAngle) * Math.sin(azimuthAngle),
      distance * Math.sin(elevationAngle),
      distance * Math.cos(elevationAngle) * Math.cos(azimuthAngle)
    );

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);

    const tweenData = { t: 0 };

    this.controls.enabled = false;

    new TWEEN.Tween(tweenData)
      .to({ t: 1 }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        const t = tweenData.t;
        this.camera.position.lerpVectors(startPosition, targetPosition, t);
        this.controls.target.lerpVectors(startTarget, endTarget, t);
        this.controls.update();
      })
      .onComplete(() => {
        this.controls.enabled = true;
      })
      .start();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    TWEEN.update();

    this.artifactController.update(delta);
    this.particleEffects.update(delta);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.artifactController.dispose();
    this.timelineManager.dispose();
    this.particleEffects.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MuseumApp();
});
