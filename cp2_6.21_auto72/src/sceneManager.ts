import * as THREE from 'three';
import type { SpectrumData } from './audioAnalyzer';

export interface ColorTheme {
  lowColor: string;
  highColor: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { lowColor: '#FF3366', highColor: '#33FFFF' },
  { lowColor: '#FFD700', highColor: '#FF4500' },
  { lowColor: '#00FF7F', highColor: '#1E90FF' }
];

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public ambientLight: THREE.AmbientLight;
  public pointLights: THREE.PointLight[];
  public starField: THREE.Points | null = null;
  public reflectionPlane: THREE.Mesh | null = null;
  public container: HTMLElement;
  public spectrumGroup: THREE.Group;
  public particleGroup: THREE.Group;
  public currentTheme: ColorTheme = COLOR_THEMES[0];
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraRotation: { x: number; y: number } = { x: 0.5, y: 0 };
  private cameraDistance: number = 25;
  private cameraTarget: THREE.Vector3;
  private spectrumRadius: number = 7.5;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0A0A);
    this.scene.fog = new THREE.FogExp2(0x0A0A0A, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.cameraTarget = new THREE.Vector3(0, 3, 0);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.pointLights = [
      this.createPointLight('#FF6B6B', new THREE.Vector3(0, 12, 0)),
      this.createPointLight('#4ECDC4', new THREE.Vector3(-12, 5, 0)),
      this.createPointLight('#FFE66D', new THREE.Vector3(12, 5, 0))
    ];
    this.pointLights.forEach(light => this.scene.add(light));

    this.spectrumGroup = new THREE.Group();
    this.scene.add(this.spectrumGroup);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.createStarField();
    this.createReflectionPlane();
    this.setupEventListeners();
    this.handleResize();
  }

  private createPointLight(color: string, position: THREE.Vector3): THREE.PointLight {
    const light = new THREE.PointLight(color, 1, 50, 2);
    light.position.copy(position);
    light.castShadow = true;
    return light;
  }

  private createStarField(): void {
    const starCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 40 + Math.random() * 30;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private createReflectionPlane(): void {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.3,
      metalness: 0.9,
      roughness: 0.1,
      reflectivity: 1
    });

    this.reflectionPlane = new THREE.Mesh(geometry, material);
    this.reflectionPlane.rotation.x = -Math.PI / 2;
    this.reflectionPlane.position.y = -1;
    this.scene.add(this.reflectionPlane);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraRotation.y += deltaX * 0.005;
      this.cameraRotation.x += deltaY * 0.005;
      this.cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraRotation.x));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.updateCameraPosition();
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.03;
      this.cameraDistance = Math.max(10, Math.min(50, this.cameraDistance));
      this.updateCameraPosition();
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.cameraRotation.y += deltaX * 0.005;
      this.cameraRotation.x += deltaY * 0.005;
      this.cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraRotation.x));

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCameraPosition();
    });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private updateCameraPosition(): void {
    this.camera.position.x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
    this.camera.position.y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraRotation.x);
    this.camera.position.z = this.cameraTarget.z + this.cameraDistance * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
    this.camera.lookAt(this.cameraTarget);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    if (width > 1200) {
      this.spectrumRadius = 7.5;
    } else if (width < 768) {
      this.spectrumRadius = 5;
    } else {
      this.spectrumRadius = 6.25;
    }
  }

  getSpectrumRadius(): number {
    return this.spectrumRadius;
  }

  setColorTheme(theme: ColorTheme): void {
    this.currentTheme = theme;
  }

  update(spectrumData: SpectrumData): void {
    const avgAmplitude = spectrumData.reduce((a, b) => a + b, 0) / spectrumData.length;

    this.pointLights.forEach((light, index) => {
      const pulseIntensity = 0.5 + avgAmplitude;
      light.intensity = pulseIntensity * (1 + Math.sin(Date.now() * 0.003 + index) * 0.3);
    });

    this.spectrumGroup.rotation.y += 0.02;

    if (this.starField) {
      this.starField.rotation.y += 0.0003;
      this.starField.rotation.x += 0.0001;
    }

    this.renderer.render(this.scene, this.camera);
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
