import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private updateCallbacks: Array<(delta: number) => void> = [];
  private clock: THREE.Clock;
  private cameraAngle: number = 0;
  private cameraDistance: number = 14;
  private cameraHeight: number = 14;
  private cameraTarget: THREE.Vector3;
  private targetCameraAngle: number = 0;
  private targetCameraPosition: THREE.Vector2;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.clock = new THREE.Clock();
    this.cameraTarget = new THREE.Vector3(4.5, 0, 4.5);
    this.targetCameraPosition = new THREE.Vector2(4.5, 4.5);
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 2;
    gradientCanvas.height = 512;
    const gctx = gradientCanvas.getContext('2d')!;
    const gradient = gctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#2d1b4e');
    gctx.fillStyle = gradient;
    gctx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(gradientCanvas);
    this.scene.background = bgTexture;

    this.canvas.width = canvas.clientWidth;
    this.canvas.height = canvas.clientHeight;
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.updateCameraPosition();
    this.camera.lookAt(this.cameraTarget);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x8b5cf6, 0.4, 30);
    pointLight.position.set(5, 10, 5);
    this.scene.add(pointLight);

    this.startRenderLoop();
  }

  private updateCameraPosition(): void {
    const angleRad = (this.cameraAngle * Math.PI) / 180;
    const x = this.targetCameraPosition.x + Math.sin(angleRad) * this.cameraDistance;
    const z = this.targetCameraPosition.y + Math.cos(angleRad) * this.cameraDistance;
    this.camera.position.set(x, this.cameraHeight, z);
    this.cameraTarget.set(this.targetCameraPosition.x, 0, this.targetCameraPosition.y);
    this.camera.lookAt(this.cameraTarget);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  onResize(): void {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  rotateCamera(deltaAngle: number): void {
    this.targetCameraAngle += deltaAngle;
  }

  panCamera(dx: number, dz: number): void {
    const angleRad = (this.cameraAngle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    this.targetCameraPosition.x += dx * cos + dz * sin;
    this.targetCameraPosition.y += -dx * sin + dz * cos;
    this.targetCameraPosition.x = Math.max(-5, Math.min(14, this.targetCameraPosition.x));
    this.targetCameraPosition.y = Math.max(-5, Math.min(14, this.targetCameraPosition.y));
  }

  onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  offUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      this.cameraAngle += (this.targetCameraAngle - this.cameraAngle) * Math.min(delta * 5, 1);
      this.updateCameraPosition();

      for (const callback of this.updateCallbacks) {
        callback(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}
