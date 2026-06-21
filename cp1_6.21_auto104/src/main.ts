import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantManager } from './PlantManager';
import { UIHandler } from './UIHandler';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private plantManager: PlantManager;
  private uiHandler: UIHandler;

  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private groundMesh: THREE.Mesh;
  private windowLight: THREE.Mesh;

  private clock: THREE.Clock;
  private lightIntensity: number = 50;

  private isMouseDown: boolean = false;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A1A1A);
    this.scene.fog = new THREE.Fog(0x1A1A1A, 10, 30);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(5, 4, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0.5, 0);

    this.clock = new THREE.Clock();

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(-5, 5, 0);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 20;
    this.directionalLight.shadow.camera.left = -8;
    this.directionalLight.shadow.camera.right = 8;
    this.directionalLight.shadow.camera.top = 8;
    this.directionalLight.shadow.camera.bottom = -8;
    this.scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);

    this.groundMesh = this.createGround();
    this.scene.add(this.groundMesh);

    this.createRoom();

    this.windowLight = this.createWindowLight();
    this.scene.add(this.windowLight);

    this.plantManager = new PlantManager(this.scene);
    this.plantManager.setGround(this.groundMesh);
    this.plantManager.setWindowPosition(new THREE.Vector3(-4.9, 2, 0));
    this.plantManager.createGhostCircle();

    this.uiHandler = new UIHandler();

    this.bindEvents();
    this.updateLighting(this.lightIntensity);
    this.animate();
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(10, 10);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.fillStyle = '#BCAAA4';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(0, i * 13 + Math.random() * 3, 256, 1);
    }
    
    ctx.fillStyle = '#A1887F';
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillRect(x, y, 2 + Math.random() * 3, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    const material = new THREE.MeshLambertMaterial({
      map: texture,
      color: 0xEFEBE9,
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    return ground;
  }

  private createRoom(): void {
    const wallMaterial = new THREE.MeshLambertMaterial({
      color: 0xEEEEEE,
      side: THREE.DoubleSide,
    });

    const backWallGeometry = new THREE.PlaneGeometry(10, 5);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 2.5, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWallGeometry = new THREE.PlaneGeometry(10, 5);
    const leftWallMaterial = new THREE.MeshLambertMaterial({
      color: 0xF5F5F5,
      side: THREE.DoubleSide,
    });
    const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
    leftWall.position.set(-5, 2.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const windowFrameMaterial = new THREE.MeshLambertMaterial({
      color: 0x616161,
    });

    const windowFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.1, 0.1),
      windowFrameMaterial
    );
    windowFrameTop.position.set(-5, 3.5, 0);
    this.scene.add(windowFrameTop);

    const windowFrameBottom = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.1, 0.1),
      windowFrameMaterial
    );
    windowFrameBottom.position.set(-5, 1, 0);
    this.scene.add(windowFrameBottom);

    const windowFrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.5, 0.1),
      windowFrameMaterial
    );
    windowFrameLeft.position.set(-5, 2.25, -1.2);
    this.scene.add(windowFrameLeft);

    const windowFrameRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.5, 0.1),
      windowFrameMaterial
    );
    windowFrameRight.position.set(-5, 2.25, 1.2);
    this.scene.add(windowFrameRight);

    const windowCrossbar = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.5, 0.05),
      windowFrameMaterial
    );
    windowCrossbar.position.set(-5, 2.25, 0);
    this.scene.add(windowCrossbar);

    const windowCrossbar2 = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.05, 0.05),
      windowFrameMaterial
    );
    windowCrossbar2.position.set(-5, 2.25, 0);
    this.scene.add(windowCrossbar2);
  }

  private createWindowLight(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2.3, 2.3);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFFE0,
      transparent: true,
      opacity: 0.8,
    });
    const windowLight = new THREE.Mesh(geometry, material);
    windowLight.position.set(-4.95, 2.25, 0);
    windowLight.rotation.y = Math.PI / 2;
    return windowLight;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.mouseDownPos.x = e.clientX;
      this.mouseDownPos.y = e.clientY;
    });

    canvas.addEventListener('mouseup', (e) => {
      const dx = Math.abs(e.clientX - this.mouseDownPos.x);
      const dy = Math.abs(e.clientY - this.mouseDownPos.y);
      
      if (dx < 5 && dy < 5) {
        this.handleClick(e);
      }
      
      this.isMouseDown = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) {
        this.plantManager.updateGhostPosition(
          e.clientX,
          e.clientY,
          this.camera,
          this.renderer.domElement
        );
      }
    });

    this.uiHandler.onLightChange((value) => {
      this.lightIntensity = value;
      this.updateLighting(value);
    });

    this.uiHandler.onPlantSelect((species) => {
      this.plantManager.setSelectedSpecies(species);
      this.plantManager.setPlacingMode(true);
      this.uiHandler.updateInfoPanel(null);
    });
  }

  private handleClick(e: MouseEvent): void {
    const selectedPlant = this.plantManager.selectPlant(
      e.clientX,
      e.clientY,
      this.camera,
      this.renderer.domElement
    );

    if (selectedPlant) {
      this.plantManager.setPlacingMode(false);
      this.uiHandler.updateInfoPanel(selectedPlant);
      const ghost = this.plantManager.getGhostCircle();
      if (ghost) ghost.visible = false;
    } else if (this.plantManager.isPlacing()) {
      const newPlant = this.plantManager.placePlant(
        e.clientX,
        e.clientY,
        this.camera,
        this.renderer.domElement
      );
      if (newPlant) {
        this.uiHandler.createPlantLabel(newPlant);
        this.uiHandler.updateInfoPanel(newPlant);
      }
    } else {
      this.plantManager.setPlacingMode(true);
      this.uiHandler.updateInfoPanel(null);
    }
  }

  private updateLighting(intensityPercent: number): void {
    const intensity = intensityPercent / 100;

    this.directionalLight.intensity = 0.3 + intensity * 1.2;
    
    const angle = (1 - intensity) * Math.PI * 0.4;
    const lightX = -5;
    const lightY = 2 + intensity * 4;
    const lightZ = Math.sin(angle) * 3;
    this.directionalLight.position.set(lightX, lightY, lightZ);

    this.ambientLight.intensity = 0.2 + intensity * 0.4;

    const windowMaterial = this.windowLight.material as THREE.MeshBasicMaterial;
    windowMaterial.opacity = 0.3 + intensity * 0.6;
    
    const warmColor = new THREE.Color(0xFFE0B2);
    const coolColor = new THREE.Color(0xE3F2FD);
    windowMaterial.color.copy(coolColor).lerp(warmColor, intensity);

    this.scene.background = new THREE.Color().setHSL(0, 0, 0.05 + intensity * 0.05);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color = new THREE.Color().setHSL(0, 0, 0.05 + intensity * 0.05);
    }
  }

  private updatePlantLabels(): void {
    const plants = this.plantManager.getPlants();
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    for (const plant of plants) {
      const label = plant.labelElement;
      if (!label) continue;

      const topPos = new THREE.Vector3(
        plant.position.x,
        plant.getHeight() + 0.3,
        plant.position.z
      );

      const screenPos = topPos.clone().project(this.camera);
      const x = (screenPos.x * 0.5 + 0.5) * rect.width;
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height;

      if (screenPos.z < 1) {
        label.style.display = 'block';
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        label.textContent = `${plant.currentState.receivedLight} Lux`;

        const lux = plant.currentState.receivedLight;
        if (lux < 50) {
          label.style.backgroundColor = 'rgba(244, 67, 54, 0.85)';
        } else if (lux < 100) {
          label.style.backgroundColor = 'rgba(255, 152, 0, 0.85)';
        } else if (lux < 200) {
          label.style.backgroundColor = 'rgba(139, 195, 74, 0.85)';
        } else {
          label.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
        }
      } else {
        label.style.display = 'none';
      }
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.plantManager.updateAllPlants(
      this.lightIntensity,
      deltaTime,
      elapsedTime
    );

    const selectedPlant = this.plantManager.getSelectedPlant();
    if (selectedPlant) {
      this.uiHandler.updateInfoPanel(selectedPlant);
    }

    this.updatePlantLabels();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
