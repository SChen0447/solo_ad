import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateCity, CityParams } from './cityGenerator';
import { UIController } from './uiController';

class CityGeneratorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private uiController: UIController;
  private cityObjects: THREE.Object3D[] = [];
  private cityGroup: THREE.Group;
  
  private isAutoMode: boolean = false;
  private autoPath: THREE.Vector3[] = [];
  private autoLookAtPath: THREE.Vector3[] = [];
  private autoProgress: number = 0;
  private readonly AUTO_LOOP_DURATION = 60;
  private readonly TRANSITION_DURATION = 1000;
  
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionStartPos: THREE.Vector3 = new THREE.Vector3();
  private transitionEndPos: THREE.Vector3 = new THREE.Vector3();
  private transitionStartTarget: THREE.Vector3 = new THREE.Vector3();
  private transitionEndTarget: THREE.Vector3 = new THREE.Vector3();
  
  private fpsCounter: number = 0;
  private fpsTime: number = 0;
  private lastTime: number = 0;
  private fpsElement: HTMLElement;
  private cameraInfoElement: HTMLElement;
  
  private frameId: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.003);
    
    const container = document.getElementById('app')!;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(150, 100, 150);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.target.set(0, 20, 0);
    
    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);
    
    this.setupLighting();
    
    this.fpsElement = document.getElementById('fps-counter')!;
    this.cameraInfoElement = document.getElementById('camera-info')!;
    
    this.uiController = new UIController({
      onParamsChange: (params) => this.updateCity(params),
      onToggleCameraMode: () => this.toggleCameraMode()
    });
    
    this.updateCity(this.uiController.getParams());
    
    window.addEventListener('resize', this.onResize.bind(this));
    
    this.generateAutoPath();
    
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(200, 300, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.bias = -0.0001;
    this.scene.add(directionalLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1f, 0.4);
    this.scene.add(hemisphereLight);
  }

  private generateAutoPath(): void {
    const gridSize = this.uiController.getParams().gridSize;
    const blockSize = 40;
    const roadWidth = this.uiController.getParams().roadWidth;
    const totalSize = gridSize * (blockSize + roadWidth);
    
    const height = 80;
    const radius = totalSize * 0.6;
    const centerX = 0;
    const centerZ = 0;
    
    this.autoPath = [];
    this.autoLookAtPath = [];
    
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      
      const wobble = Math.sin(angle * 4) * 20;
      const h = height + wobble;
      
      this.autoPath.push(new THREE.Vector3(x, h, z));
      
      const lookAngle = angle + Math.PI * 0.5;
      const lookRadius = radius * 0.3;
      this.autoLookAtPath.push(new THREE.Vector3(
        centerX + Math.cos(lookAngle) * lookRadius,
        30,
        centerZ + Math.sin(lookAngle) * lookRadius
      ));
    }
  }

  private bezierEase(t: number): number {
    const p0 = 0, p1 = 0.25, p2 = 0.25, p3 = 1;
    const mt = 1 - t;
    return p0 * mt * mt * mt + 3 * p1 * t * mt * mt + 3 * p2 * t * t * mt + p3 * t * t * t;
  }

  private getPositionOnPath(path: THREE.Vector3[], progress: number): THREE.Vector3 {
    const index = Math.floor(progress * (path.length - 1));
    const nextIndex = Math.min(index + 1, path.length - 1);
    const localT = (progress * (path.length - 1)) - index;
    
    const p0 = path[index];
    const p1 = path[nextIndex];
    
    return new THREE.Vector3(
      p0.x + (p1.x - p0.x) * localT,
      p0.y + (p1.y - p0.y) * localT,
      p0.z + (p1.z - p0.z) * localT
    );
  }

  private toggleCameraMode(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.transitionProgress = 0;
    
    this.transitionStartPos.copy(this.camera.position);
    this.transitionStartTarget.copy(this.controls.target);
    
    if (this.isAutoMode) {
      this.transitionEndPos.set(150, 100, 150);
      this.transitionEndTarget.set(0, 20, 0);
      this.controls.enabled = false;
    } else {
      const currentPos = this.getPositionOnPath(this.autoPath, this.autoProgress);
      const currentTarget = this.getPositionOnPath(this.autoLookAtPath, this.autoProgress);
      this.transitionEndPos.copy(currentPos);
      this.transitionEndTarget.copy(currentTarget);
      this.controls.enabled = true;
    }
  }

  private updateTransition(deltaTime: number): void {
    if (!this.isTransitioning) return;
    
    this.transitionProgress += deltaTime / this.TRANSITION_DURATION;
    
    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;
      this.isAutoMode = !this.isAutoMode;
      
      if (this.isAutoMode) {
        this.controls.enabled = false;
      } else {
        this.controls.enabled = true;
        this.controls.target.copy(this.transitionEndTarget);
      }
    }
    
    const t = this.bezierEase(this.transitionProgress);
    
    this.camera.position.lerpVectors(
      this.transitionStartPos,
      this.transitionEndPos,
      t
    );
    
    const currentTarget = new THREE.Vector3().lerpVectors(
      this.transitionStartTarget,
      this.transitionEndTarget,
      t
    );
    
    this.camera.lookAt(currentTarget);
  }

  private updateAutoCamera(deltaTime: number): void {
    if (!this.isAutoMode || this.isTransitioning) return;
    
    this.autoProgress += deltaTime / (this.AUTO_LOOP_DURATION * 1000);
    if (this.autoProgress >= 1) {
      this.autoProgress -= 1;
    }
    
    const position = this.getPositionOnPath(this.autoPath, this.autoProgress);
    const lookAt = this.getPositionOnPath(this.autoLookAtPath, this.autoProgress);
    
    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
  }

  private updateCity(params: CityParams): void {
    for (const obj of this.cityObjects) {
      this.cityGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    
    this.cityObjects = [];
    
    this.cityObjects = generateCity(params);
    for (const obj of this.cityObjects) {
      this.cityGroup.add(obj);
    }
    
    this.generateAutoPath();
  }

  private updateFPS(deltaTime: number): void {
    this.fpsCounter++;
    this.fpsTime += deltaTime;
    
    if (this.fpsTime >= 1000) {
      const fps = Math.round((this.fpsCounter * 1000) / this.fpsTime);
      this.fpsElement.textContent = `FPS: ${fps}`;
      this.fpsCounter = 0;
      this.fpsTime = 0;
    }
  }

  private updateCameraInfo(): void {
    const pos = this.camera.position;
    
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    this.cameraInfoElement.innerHTML = `
      <div>位置: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}</div>
      <div>朝向: ${normalizedAngle.toFixed(2)}°</div>
      <div style="margin-top: 5px; opacity: 0.7;">模式: ${this.isAutoMode ? '自动漫游' : '自由轨道'}</div>
    `;
  }

  private animate(time: number): void {
    this.frameId = requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    
    if (this.isTransitioning) {
      this.updateTransition(deltaTime);
    } else if (this.isAutoMode) {
      this.updateAutoCamera(deltaTime);
    } else {
      this.controls.update();
    }
    
    this.updateFPS(deltaTime);
    this.updateCameraInfo();
    
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  public destroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    
    this.uiController.destroy();
    
    window.removeEventListener('resize', this.onResize.bind(this));
    
    this.renderer.dispose();
  }
}

const app = new CityGeneratorApp();

window.addEventListener('beforeunload', () => {
  app.destroy();
});
