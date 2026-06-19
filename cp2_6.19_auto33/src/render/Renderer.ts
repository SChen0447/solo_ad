import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Visualizer } from './Visualizer';
import { ThemeManager, ThemeColors } from './ThemeManager';
import { SpectrumAnalyzer } from '../audio/SpectrumAnalyzer';

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private visualizer: Visualizer;
  private themeManager: ThemeManager;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private spectrumData: number[] = new Array(64).fill(0);

  constructor(container: HTMLElement) {
    this.container = container;
    this.themeManager = new ThemeManager();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 15);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a1a2e, 1);
    container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    this.visualizer = new Visualizer(this.scene, this.themeManager);
    
    this.setupLights();
    this.setupEventListeners();
    
    this.themeManager.setOnThemeChangeCallback((colors) => {
      this.onThemeChange(colors);
    });
    
    this.onThemeChange(this.themeManager.getCurrentColors());
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private onThemeChange(colors: ThemeColors): void {
    this.scene.background = new THREE.Color(colors.background);
    this.renderer.setClearColor(colors.background, 1);
  }

  setSpectrumData(spectrum: number[]): void {
    this.spectrumData = spectrum;
  }

  setSpectrumAnalyzer(analyzer: SpectrumAnalyzer | null): void {
    this.visualizer.setSpectrumAnalyzer(analyzer);
  }

  switchTheme(theme: 'neon' | 'aurora' | 'lava'): void {
    this.themeManager.switchTheme(theme);
  }

  getThemeManager(): ThemeManager {
    return this.themeManager;
  }

  start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.themeManager.update(deltaTime);
    this.visualizer.update(this.spectrumData, deltaTime);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.visualizer.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
