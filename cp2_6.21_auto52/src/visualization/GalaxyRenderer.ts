import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

  private autoRotate: boolean = false;
  private readonly AUTO_ROTATE_SPEED = 0.002;

  private glowSprite: THREE.Sprite | null = null;
  private glowMaterial: THREE.SpriteMaterial | null = null;

  private animationId: number = 0;
  private isRunning: boolean = false;

  private readonly MIN_DISTANCE = 5;
  private readonly MAX_DISTANCE = 200;
  private readonly ROTATE_SPEED = 0.5;

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

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.configureControls();

    this.particleEngine = new ParticleEngine(8000);
    this.scene.add(this.particleEngine.getPoints());

    this.createAmbientStars();
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

  private createGlowEffect(): void {
    if (this.glowSprite) return;

    const texture = this.particleEngine.getGlowSpriteTexture();
    this.glowMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.glowSprite = new THREE.Sprite(this.glowMaterial);
    this.glowSprite.scale.set(80, 80, 1);
    this.glowSprite.position.set(0, 0, 0);
    this.scene.add(this.glowSprite);
  }

  private removeGlowEffect(): void {
    if (this.glowSprite) {
      this.scene.remove(this.glowSprite);
      this.glowSprite.material.dispose();
      (this.glowSprite.material as THREE.Material).dispose();
      this.glowSprite = null;
      this.glowMaterial = null;
    }
  }

  private updateGlowEffect(): void {
    const gravity = this.particleEngine.getGravity();

    if (gravity > 2) {
      if (!this.glowSprite) {
        this.createGlowEffect();
      }
      if (this.glowMaterial) {
        const glowIntensity = 0.2 + Math.min(0.4, (gravity - 2) / 3 * 0.4);
        this.glowMaterial.opacity = glowIntensity;
        const scale = 60 + (gravity - 2) / 3 * 60;
        this.glowSprite!.scale.set(scale, scale, 1);
      }
    } else {
      if (this.glowSprite) {
        this.removeGlowEffect();
      }
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
  };

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.particleEngine.update(delta);

    this.updateGlowEffect();

    this.controls.update();

    if (this.autoRotate && !this.controls.autoRotate) {
      const angle = this.AUTO_ROTATE_SPEED * delta * 60;
      const x = this.camera.position.x;
      const z = this.camera.position.z;
      this.camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      this.camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      this.camera.lookAt(0, 0, 0);
    }

    this.renderer.render(this.scene, this.camera);
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
    this.removeGlowEffect();

    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
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
