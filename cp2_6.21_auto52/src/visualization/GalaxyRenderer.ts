import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ParticleEngine } from '@/core/ParticleEngine';
import { eventBus, EVENTS } from '@/utils/EventBus';

export class GalaxyRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleEngine: ParticleEngine;
  private clock: THREE.Clock;

  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private renderPass: RenderPass;

  private autoRotate: boolean = false;
  private readonly AUTO_ROTATE_SPEED = 0.002;

  private animationId: number = 0;
  private isRunning: boolean = false;

  private readonly MIN_DISTANCE = 5;
  private readonly MAX_DISTANCE = 200;
  private readonly ROTATE_SPEED = 0.5;

  private readonly BLOOM_INTENSITY_HIGH = 0.3;
  private readonly BLOOM_INTENSITY_LOW = 0;
  private readonly BLOOM_PARTICLE_THRESHOLD = 15000;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 50, 150);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.configureControls();

    this.particleEngine = new ParticleEngine(8000);
    this.scene.add(this.particleEngine.getPoints());

    this.createAmbientStars();

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      this.BLOOM_INTENSITY_LOW,
      0.6,
      0.2
    );
    this.composer.addPass(this.bloomPass);

    this.setupEventListeners();

    window.addEventListener('resize', this.onWindowResize);
  }

  private configureControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = this.ROTATE_SPEED;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = this.MIN_DISTANCE;
    this.controls.maxDistance = this.MAX_DISTANCE;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
  }

  private createAmbientStars(): void {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 400 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.5;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: false,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private updateBloomEffect(): void {
    const gravity = this.particleEngine.getGravity();
    const count = this.particleEngine.getCount();
    const countScale = count > this.BLOOM_PARTICLE_THRESHOLD
      ? Math.max(0.3, 1 - (count - this.BLOOM_PARTICLE_THRESHOLD) / 25000)
      : 1;

    if (gravity > 2) {
      const t = Math.min(1, (gravity - 2) / 3);
      this.bloomPass.strength = (this.BLOOM_INTENSITY_LOW + (this.BLOOM_INTENSITY_HIGH - this.BLOOM_INTENSITY_LOW) * t) * countScale;
      this.bloomPass.radius = count > this.BLOOM_PARTICLE_THRESHOLD
        ? 0.3
        : 0.4 + t * 0.4;
      this.renderer.toneMappingExposure = 1.0 + t * 0.3 * countScale;
    } else {
      this.bloomPass.strength = this.BLOOM_INTENSITY_LOW;
      this.bloomPass.radius = 0.4;
      this.renderer.toneMappingExposure = 1.0;
    }

    const targetPixelRatio = count > this.BLOOM_PARTICLE_THRESHOLD
      ? Math.min(window.devicePixelRatio, 1.5)
      : Math.min(window.devicePixelRatio, 2);
    if (this.renderer.getPixelRatio() !== targetPixelRatio) {
      this.renderer.setPixelRatio(targetPixelRatio);
    }
  }

  private setupEventListeners(): void {
    eventBus.on(EVENTS.AUTO_ROTATE_CHANGED, (enabled: boolean) => {
      this.autoRotate = enabled;
      this.controls.autoRotate = enabled;
      this.controls.autoRotateSpeed = this.AUTO_ROTATE_SPEED * 60;
    });
  }

  private onWindowResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  };

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.particleEngine.update(delta);

    this.updateBloomEffect();

    this.controls.update();

    if (this.autoRotate && !this.controls.autoRotate) {
      const angle = this.AUTO_ROTATE_SPEED * delta * 60;
      const x = this.camera.position.x;
      const z = this.camera.position.z;
      this.camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      this.camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      this.camera.lookAt(0, 0, 0);
    }

    this.composer.render();
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    eventBus.emit(EVENTS.RENDER_READY);
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    this.clock.stop();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);

    this.particleEngine.dispose();

    this.controls.dispose();
    this.renderer.dispose();

    this.bloomPass.dispose();
    this.composer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        const mesh = object as THREE.Mesh | THREE.Points;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
  }

  getParticleEngine(): ParticleEngine {
    return this.particleEngine;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}
