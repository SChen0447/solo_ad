import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private starField: THREE.Points | null = null;
  private animationId: number | null = null;
  private onAnimationFrame: (() => void) | null = null;
  private cameraAngle = 0;
  private cameraRadius = 15;
  private cameraHeight = 8;

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 30, 80);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 8, 15);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createStarField();
    this.setupResizeHandler();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6666ff, 1.5, 50);
    pointLight1.position.set(10, 15, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff66aa, 1, 40);
    pointLight2.position.set(-10, 5, -10);
    this.scene.add(pointLight2);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(0, 20, 0);
    this.scene.add(directionalLight);
  }

  private createStarField(): void {
    const starCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 30 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice > 0.7) {
        colors[i3] = 0.5 + Math.random() * 0.5;
        colors[i3 + 1] = 0.5 + Math.random() * 0.5;
        colors[i3 + 2] = 1;
      } else if (colorChoice > 0.4) {
        colors[i3] = 1;
        colors[i3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i3 + 2] = 0.8 + Math.random() * 0.2;
      } else {
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      }

      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    this.cameraAngle += 0.001;
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraRadius;
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraRadius;
    this.camera.position.y = this.cameraHeight + Math.sin(this.cameraAngle * 0.5) * 2;
    this.camera.lookAt(0, 2, 0);

    if (this.starField) {
      this.starField.rotation.y += 0.0003;
      const material = this.starField.material as THREE.PointsMaterial;
      material.opacity = 0.6 + Math.sin(Date.now() * 0.001) * 0.2;
    }

    if (this.onAnimationFrame) {
      this.onAnimationFrame();
    }

    this.renderer.render(this.scene, this.camera);
  };

  setAnimationCallback(callback: () => void): void {
    this.onAnimationFrame = callback;
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

  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
