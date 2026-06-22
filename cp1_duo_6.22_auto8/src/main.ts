import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Room } from './room/Room';
import { Sofa } from './furniture/Sofa';
import { UIControl } from './ui/UIControl';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private room: Room;
  private sofa: Sofa;
  private uiControl: UIControl;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private infoLabel: CSS2DObject | null = null;
  private labelDiv: HTMLDivElement | null = null;
  private animationId: number | null = null;
  private glossinessAnimation: {
    active: boolean;
    startValue: number;
    targetValue: number;
    startTime: number;
    duration: number;
  } | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';

    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.appendChild(this.renderer.domElement);
      appElement.appendChild(this.labelRenderer.domElement);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 1, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.room = new Room();
    this.sofa = new Sofa();

    this.uiControl = new UIControl({
      onFloorColorChange: (color: string) => this.handleFloorColorChange(color),
      onCushionColorChange: (color: string) => this.handleCushionColorChange(color),
      onFrameColorChange: (color: string) => this.handleFrameColorChange(color),
      onGlossinessChange: (value: number) => this.handleGlossinessChange(value),
      onReset: () => this.handleReset()
    });

    this.setupLights();
    this.setupScene();
    this.setupCamera();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    mainLight.shadow.camera.left = -8;
    mainLight.shadow.camera.right = 8;
    mainLight.shadow.camera.top = 8;
    mainLight.shadow.camera.bottom = -8;
    mainLight.shadow.bias = -0.0005;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 4, -3);
    this.scene.add(fillLight);

    const windowLight = new THREE.RectAreaLight(0x87ceeb, 2, 4, 3);
    windowLight.position.set(0, 3.5, -4.9);
    windowLight.lookAt(0, 3, 0);
    this.scene.add(windowLight);
  }

  private setupScene(): void {
    this.scene.add(this.room.group);
    this.scene.add(this.sofa.group);
    this.sofa.group.position.y = 0;
  }

  private setupCamera(): void {
    const distance = 7;
    const angle = Math.PI / 4;
    const heightAngle = Math.PI / 4;

    this.camera.position.set(
      distance * Math.sin(angle) * Math.cos(heightAngle),
      distance * Math.sin(heightAngle),
      distance * Math.cos(angle) * Math.cos(heightAngle)
    );

    this.camera.lookAt(0, 1, 0);
    this.controls.target.set(0, 1, 0);
    this.controls.update();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('click', (event) => this.handleClick(event));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const sofaParts = this.sofa.getAllParts();
    const intersects = this.raycaster.intersectObjects(sofaParts, false);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const clickedObject = intersection.object;
      this.sofa.highlightPart(clickedObject);
      this.showInfoLabel(clickedObject, intersection.point);
    } else {
      this.sofa.clearHighlight();
      this.hideInfoLabel();
    }
  }

  private createLabelDiv(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'css2d-label';

    const box = document.createElement('div');
    box.className = 'label-box';

    const title = document.createElement('div');
    title.className = 'label-title';

    const rgb = document.createElement('div');
    rgb.className = 'label-rgb';

    box.appendChild(title);
    box.appendChild(rgb);
    container.appendChild(box);

    return container;
  }

  private showInfoLabel(object: THREE.Object3D, _hitPoint: THREE.Vector3): void {
    const partInfo = this.sofa.getPartInfo(object);
    if (!partInfo) return;

    const partNames: Record<string, string> = {
      cushion: '坐垫',
      frame: '底座',
      backrest: '靠背',
      armrest: '扶手',
      leg: '椅腿'
    };

    if (this.infoLabel) {
      this.scene.remove(this.infoLabel);
      this.infoLabel = null;
    }

    if (!this.labelDiv) {
      this.labelDiv = this.createLabelDiv();
    }

    const titleEl = this.labelDiv.querySelector('.label-title') as HTMLElement;
    const rgbEl = this.labelDiv.querySelector('.label-rgb') as HTMLElement;
    const partName = partNames[partInfo.type] || partInfo.type;
    titleEl.textContent = `${partName} · ${partInfo.materialName}`;
    rgbEl.textContent = `RGB: ${this.hexToRgbString(partInfo.color)}`;

    this.infoLabel = new CSS2DObject(this.labelDiv);

    const mesh = object as THREE.Mesh;
    const labelPosition = new THREE.Vector3();
    mesh.getWorldPosition(labelPosition);

    const geometry = mesh.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      labelPosition.add(center);
      labelPosition.y += size.y / 2 + 0.05;
    }

    this.infoLabel.position.copy(labelPosition);
    this.scene.add(this.infoLabel);

    requestAnimationFrame(() => {
      this.labelDiv?.classList.add('visible');
    });
  }

  private hideInfoLabel(): void {
    if (this.labelDiv) {
      this.labelDiv.classList.remove('visible');
    }
    setTimeout(() => {
      if (this.infoLabel) {
        this.scene.remove(this.infoLabel);
        this.infoLabel = null;
      }
    }, 300);
  }

  private hexToRgbString(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `${r}, ${g}, ${b}`;
    }
    return '0, 0, 0';
  }

  private handleFloorColorChange(color: string): void {
    this.room.setFloorMaterial({ color });
  }

  private handleCushionColorChange(color: string): void {
    this.sofa.setMaterial({ cushionColor: color });
    this.updateActiveLabelIfNeeded();
  }

  private handleFrameColorChange(color: string): void {
    this.sofa.setMaterial({ frameColor: color });
    this.updateActiveLabelIfNeeded();
  }

  private handleGlossinessChange(value: number, animate: boolean = true): void {
    if (!animate) {
      this.sofa.setMaterial({ glossiness: value });
      this.uiControl.updateGlossinessDisplay(value);
      return;
    }

    const currentTime = performance.now();
    const duration = 300;

    if (this.glossinessAnimation && this.glossinessAnimation.active) {
      const remaining = Math.max(0, duration - (currentTime - this.glossinessAnimation.startTime));
      const startValue = this.sofa.getGlossiness();
      this.glossinessAnimation = {
        active: true,
        startValue,
        targetValue: value,
        startTime: currentTime,
        duration: Math.max(100, remaining * 0.8)
      };
    } else {
      const startValue = this.sofa.getGlossiness();
      this.glossinessAnimation = {
        active: true,
        startValue,
        targetValue: value,
        startTime: currentTime,
        duration
      };
    }
  }

  private updateGlossinessAnimation(currentTime: number): void {
    if (!this.glossinessAnimation || !this.glossinessAnimation.active) return;

    const { startValue, targetValue, startTime, duration } = this.glossinessAnimation;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const currentValue = startValue + (targetValue - startValue) * easedProgress;
    this.sofa.setMaterial({ glossiness: currentValue });
    this.uiControl.updateGlossinessDisplay(currentValue);

    if (progress >= 1) {
      this.sofa.setMaterial({ glossiness: targetValue });
      this.glossinessAnimation.active = false;
      this.glossinessAnimation = null;
    }
  }

  private updateActiveLabelIfNeeded(): void {
    const selectedPart = this.sofa.getSelectedPart();
    if (!selectedPart || !this.infoLabel) return;

    const partInfo = this.sofa.getPartInfo(selectedPart);
    if (!partInfo || !this.labelDiv) return;

    const rgbEl = this.labelDiv.querySelector('.label-rgb') as HTMLElement;
    if (rgbEl) {
      rgbEl.textContent = `RGB: ${this.hexToRgbString(partInfo.color)}`;
    }
  }

  private handleReset(): void {
    this.glossinessAnimation = null;
    this.room.reset();
    this.sofa.reset();
    this.hideInfoLabel();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const currentTime = performance.now();
    this.controls.update();
    this.updateGlossinessAnimation(currentTime);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.uiControl.destroy();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
