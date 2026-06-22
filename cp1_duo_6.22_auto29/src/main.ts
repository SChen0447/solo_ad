import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { ModelLoader } from './ModelLoader';
import { AnnotationSystem } from './AnnotationSystem';
import { UIOverlay } from './UIOverlay';

class ModelViewerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private canvas: HTMLCanvasElement;

  private modelLoader: ModelLoader;
  private annotationSystem: AnnotationSystem;
  private uiOverlay: UIOverlay;

  private modelGroup: THREE.Group | null = null;
  private initialCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private initialTarget: THREE.Vector3 = new THREE.Vector3();

  private autoRotate: boolean = false;
  private autoRotateSpeed: number = 0.1;

  private isAnimatingReset: boolean = false;
  private resetStartTime: number = 0;
  private resetStartPosition: THREE.Vector3 = new THREE.Vector3();
  private resetStartTarget: THREE.Vector3 = new THREE.Vector3();

  private isMouseDown: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPosition: { x: number; y: number } = { x: 0, y: 0 };
  private isDraggingAnnotation: boolean = false;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor() {
    this.canvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.camera.position.set(3, 2, 3);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 10;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 10;

    this.modelLoader = new ModelLoader();
    this.annotationSystem = new AnnotationSystem(this.scene, this.camera);

    this.uiOverlay = new UIOverlay({
      canvas: this.canvas,
      annotationSystem: this.annotationSystem,
      modelLoader: this.modelLoader,
      onModelLoaded: (model) => this.handleModelLoaded(model),
      onAutoRotateToggle: (enabled) => this.setAutoRotate(enabled),
      onResetView: () => this.resetView(),
      onScreenshot: () => this.takeScreenshot(),
    });

    this.setupLights();
    this.setupGrid();
    this.setupEventListeners();
    this.storeInitialCameraState();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x333333);
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

    this.controls.addEventListener('start', () => {
      if (this.autoRotate) {
        this.autoRotate = false;
        this.uiOverlay.setAutoRotateEnabled(false);
      }
    });
  }

  private onMouseDown(event: MouseEvent): void {
    this.isMouseDown = true;
    this.mouseDownTime = performance.now();
    this.mouseDownPosition = { x: event.clientX, y: event.clientY };

    if (event.button === 0) {
      const isDragging = this.annotationSystem.startDrag(event, this.canvas);
      if (isDragging) {
        this.isDraggingAnnotation = true;
        this.controls.enabled = false;
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDraggingAnnotation) {
      this.annotationSystem.handleDrag(event, this.canvas);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.isMouseDown = false;

    if (this.isDraggingAnnotation) {
      this.annotationSystem.endDrag();
      this.isDraggingAnnotation = false;
      this.controls.enabled = true;
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.isDraggingAnnotation) return;

    const moveDistance = Math.sqrt(
      Math.pow(event.clientX - this.mouseDownPosition.x, 2) +
        Math.pow(event.clientY - this.mouseDownPosition.y, 2)
    );
    const clickDuration = performance.now() - this.mouseDownTime;

    if (moveDistance < 5 && clickDuration < 300) {
      const hit = this.annotationSystem.handleClick(event, this.canvas);
      if (hit && this.annotationSystem.hasTemporaryMarker()) {
        this.uiOverlay.showAnnotationInput();
      }
    }
  }

  private onDoubleClick(event: MouseEvent): void {
    const hit = this.annotationSystem.handleDoubleClick(event, this.canvas);
    if (hit) {
      const selected = this.annotationSystem.getSelectedAnnotation();
      if (selected) {
        const newText = prompt('编辑批注:', selected.text);
        if (newText !== null && newText.trim()) {
          this.annotationSystem.editAnnotation(selected.id, newText.trim());
        }
      }
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
      });
      this.onMouseDown(mouseEvent);
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isDraggingAnnotation) {
      event.preventDefault();
      const touch = event.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      this.onMouseMove(mouseEvent);
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      event.preventDefault();
      const touch = event.changedTouches[0];
      const mouseEvent = new MouseEvent('mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
      });
      this.onMouseUp(mouseEvent);

      const clickEvent = new MouseEvent('click', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
      });
      this.onClick(clickEvent);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleModelLoaded(model: THREE.Group): void {
    if (this.modelGroup) {
      this.scene.remove(this.modelGroup);
    }

    this.modelGroup = model;
    (window as any).__modelGroup = model;

    this.scene.add(model);

    this.modelLoader.centerAndScaleModel(model, this.camera, 0.8);

    const meshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    this.annotationSystem.setModelMeshes(meshes);

    this.storeInitialCameraState();
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialTarget);
    this.controls.update();
  }

  private storeInitialCameraState(): void {
    if (this.modelGroup) {
      const box = new THREE.Box3().setFromObject(this.modelGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 1.5 / Math.tan((this.camera.fov * Math.PI) / 360);

      const angle = (45 * Math.PI) / 180;
      const x = Math.sin(angle) * distance;
      const y = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;

      this.initialCameraPosition.set(center.x + x, center.y + y, center.z + z);
      this.initialTarget.copy(center);
    } else {
      this.initialCameraPosition.copy(this.camera.position);
      this.initialTarget.copy(this.controls.target);
    }
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  resetView(): void {
    if (this.isAnimatingReset) return;

    this.isAnimatingReset = true;
    this.resetStartTime = performance.now();
    this.resetStartPosition.copy(this.camera.position);
    this.resetStartTarget.copy(this.controls.target);
  }

  private updateResetAnimation(): void {
    if (!this.isAnimatingReset) return;

    const duration = 1000;
    const elapsed = performance.now() - this.resetStartTime;
    const progress = Math.min(elapsed / duration, 1);

    const eased = this.easeOutCubic(progress);

    this.camera.position.lerpVectors(
      this.resetStartPosition,
      this.initialCameraPosition,
      eased
    );
    this.controls.target.lerpVectors(this.resetStartTarget, this.initialTarget, eased);
    this.controls.update();

    if (progress >= 1) {
      this.isAnimatingReset = false;
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  takeScreenshot(): void {
    this.renderer.render(this.scene, this.camera);

    const renderCanvas = this.canvas;

    const width = 1920;
    const height = 1080;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const ctx = outCanvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const aspect = renderCanvas.width / renderCanvas.height;
    const targetAspect = width / height;

    let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

    if (aspect > targetAspect) {
      drawHeight = height;
      drawWidth = height * aspect;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = width;
      drawHeight = width / aspect;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(renderCanvas, offsetX, offsetY, drawWidth, drawHeight);

    const annotations = this.annotationSystem.getAnnotations();
    if (annotations.length > 0) {
      const sidebarWidth = 280;
      const sidebarX = width - sidebarWidth - 20;
      const sidebarY = 20;

      ctx.fillStyle = 'rgba(15, 52, 96, 0.9)';
      this.roundRect(ctx, sidebarX, sidebarY, sidebarWidth, 400, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`批注列表 (${annotations.length})`, sidebarX + 16, sidebarY + 36);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(sidebarX + 16, sidebarY + 52);
      ctx.lineTo(sidebarX + sidebarWidth - 16, sidebarY + 52);
      ctx.stroke();

      let y = sidebarY + 76;
      annotations.forEach((annotation, index) => {
        if (y > sidebarY + 380) return;

        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(sidebarX + 24, y - 4, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`批注 ${index + 1}`, sidebarX + 40, y);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '13px sans-serif';
        const text = annotation.text;
        const maxChars = 28;
        const displayText = text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
        ctx.fillText(displayText, sidebarX + 40, y + 20);

        y += 48;
      });
    }

    const dataUrl = outCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `screenshot_${this.getTimestamp()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    if (this.autoRotate && this.modelGroup) {
      this.modelGroup.rotation.y += (this.autoRotateSpeed * Math.PI) / 180;
    }

    if (this.isAnimatingReset) {
      this.updateResetAnimation();
    }

    this.controls.update();
    this.annotationSystem.update();

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ModelViewerApp();
});
