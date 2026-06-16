import * as THREE from 'three';
import { ParticleSystem, ParticleParams } from './ParticleSystem';

export interface SceneManagerParams extends ParticleParams {}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;

  private animationId: number | null = null;
  private lastTime: number = 0;
  private params: SceneManagerParams;

  private isPlaying: boolean = false;
  private currentTime: number = 0;

  constructor(container: HTMLElement, params: SceneManagerParams) {
    this.container = container;
    this.params = { ...params };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(params.bgColor);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene, this.params);

    this.setupLights();
    this.setupResize();
    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);
  }

  private setupResize(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.resize();
  };

  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.particleSystem.update(deltaTime);

    this.camera.position.x = Math.sin(currentTime * 0.0001) * 0.5;
    this.camera.position.y = Math.cos(currentTime * 0.00015) * 0.3;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  triggerBeat(intensity: number): void {
    this.particleSystem.triggerBeat(intensity);
  }

  setParams(params: Partial<SceneManagerParams>): void {
    const oldBg = this.params.bgColor;
    this.params = { ...this.params, ...params };

    if (params.bgColor !== undefined && params.bgColor !== oldBg) {
      this.animateBackground(params.bgColor);
    }

    this.particleSystem.setParams(params);
  }

  private animateBackground(targetColor: string): void {
    const startColor = this.scene.background as THREE.Color;
    const endColor = new THREE.Color(targetColor);
    const duration = 200;
    const startTime = performance.now();

    const animateBg = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      const r = startColor.r + (endColor.r - startColor.r) * progress;
      const g = startColor.g + (endColor.g - startColor.g) * progress;
      const b = startColor.b + (endColor.b - startColor.b) * progress;

      (this.scene.background as THREE.Color).setRGB(r, g, b);

      if (progress < 1) {
        requestAnimationFrame(animateBg);
      }
    };

    animateBg();
  }

  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    window.removeEventListener('resize', this.handleResize);

    this.particleSystem.dispose();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
