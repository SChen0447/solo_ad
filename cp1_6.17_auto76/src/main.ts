import * as THREE from 'three';
import { DataService } from './DataService';
import { CameraController } from './CameraController';
import { SceneManager } from './SceneManager';
import { UIOverlay } from './UIOverlay';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dataService: DataService;
  private cameraController: CameraController;
  private sceneManager: SceneManager;
  private uiOverlay: UIOverlay;
  
  private clock: THREE.Clock = new THREE.Clock();
  private isLoaded: boolean = false;
  private isIntroPlaying: boolean = true;
  
  constructor() {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.dataService = new DataService();
    this.cameraController = new CameraController(this.camera, this.scene, canvas);
    this.sceneManager = new SceneManager(
      this.scene,
      this.camera,
      this.renderer,
      this.cameraController,
      this.dataService
    );
    this.uiOverlay = new UIOverlay();
    
    this.setupEventListeners();
    this.setupUIEvents();
    
    this.init();
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  private setupUIEvents(): void {
    this.sceneManager.setOnFacilityHover((facility, screenPos) => {
      if (facility && screenPos) {
        this.uiOverlay.showAnnotationBubble(facility, screenPos.x, screenPos.y);
      } else {
        this.uiOverlay.hideAnnotationBubble();
      }
    });
    
    this.sceneManager.setOnFacilityClick((facility, screenPos) => {
      this.uiOverlay.showFacilityCard(facility, screenPos.x, screenPos.y);
    });
    
    this.sceneManager.setOnLoadProgress((progress) => {
      this.uiOverlay.setLoadingProgress(progress);
    });
    
    this.cameraController.setOnCollisionCallback(() => {
      this.uiOverlay.showCollisionEffect();
    });
    
    this.cameraController.setOnPositionChangeCallback((position, floor) => {
      this.uiOverlay.setCurrentFloor(floor);
      this.uiOverlay.setCurrentPosition(position.x, position.y, position.z);
    });
    
    this.uiOverlay.setOnFilterChange((categories) => {
      this.sceneManager.setActiveCategories(categories);
    });
    
    this.uiOverlay.setOnFloorChange(async (floor) => {
      await this.switchFloor(floor);
    });
    
    this.uiOverlay.setOnMinimapRoomClick(async (roomId) => {
      await this.teleportToRoom(roomId);
    });
    
    document.getElementById('view-switch-btn')?.addEventListener('click', () => {
      this.cameraController.toggleMode();
    });
  }
  
  private async init(): Promise<void> {
    try {
      await this.sceneManager.loadBuilding();
      
      const buildingData = this.sceneManager.getBuildingData();
      if (buildingData) {
        this.uiOverlay.setFloorData(buildingData.floors);
      }
      
      this.uiOverlay.setLoadingProgress(1);
      
      await this.playIntro();
      
      this.isLoaded = true;
      this.uiOverlay.showLoading(false);
      
      this.cameraController.setPosition(new THREE.Vector3(0, 1.7, -12));
      this.uiOverlay.setCurrentFloor(1);
      
      this.animate();
      
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.uiOverlay.setLoadingProgress(1);
    }
  }
  
  private async playIntro(): Promise<void> {
    this.isIntroPlaying = true;
    
    const center = this.sceneManager.getBuildingCenter();
    const height = this.sceneManager.getBuildingHeight();
    
    await this.cameraController.playIntroAnimation(center, height);
    
    this.isIntroPlaying = false;
  }
  
  private async switchFloor(floorLevel: number): Promise<void> {
    const floorElevation = this.sceneManager.getFloorElevation(floorLevel);
    const targetPos = new THREE.Vector3(0, floorElevation + 1.7, -8);
    
    await this.cameraController.moveToPosition(targetPos, 1200);
    this.uiOverlay.setCurrentFloor(floorLevel);
  }
  
  private async teleportToRoom(roomId: string): Promise<void> {
    const entry = await this.dataService.getRoomEntry(roomId);
    if (entry) {
      const targetPos = new THREE.Vector3(
        entry.position[0],
        entry.position[1],
        entry.position[2]
      );
      await this.cameraController.teleportTo(targetPos, 500);
      this.uiOverlay.setCurrentFloor(entry.floor);
    }
  }
  
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
    if (this.isLoaded && !this.isIntroPlaying) {
      this.sceneManager.update(deltaTime);
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
