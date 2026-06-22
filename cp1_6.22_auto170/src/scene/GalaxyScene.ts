import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem, createBackgroundStars } from './ParticleSystem';

const GALAXY_PARTICLE_COUNT = 10000;
const BURST_PARTICLE_COUNT = 500;
const BACKGROUND_STAR_COUNT = 2000;
const INITIAL_DISTANCE = 50;
const COLLISION_THRESHOLD = 10;

export interface SimulationState {
  isColliding: boolean;
  isPaused: boolean;
  collisionProgress: number;
  totalParticles: number;
  gravityStrength: number;
  collisionSpeed: number;
  particleSize: number;
}

export class GalaxyScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  galaxy1: ParticleSystem;
  galaxy2: ParticleSystem;
  burstParticles: ParticleSystem;
  backgroundStars: THREE.Points;

  isColliding: boolean;
  isPaused: boolean;
  collisionProgress: number;
  gravityStrength: number;
  collisionSpeed: number;
  particleSize: number;

  private animationId: number | null;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private frameCount: number;
  private burstCreated: boolean;
  private onStateChange: ((state: SimulationState) => void) | null;
  private collisionComplete: boolean;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isColliding = false;
    this.isPaused = false;
    this.collisionProgress = 0;
    this.gravityStrength = 1.0;
    this.collisionSpeed = 1.0;
    this.particleSize = 1.5;
    this.animationId = null;
    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.burstCreated = false;
    this.collisionComplete = false;
    this.onStateChange = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 80);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 200;

    this.galaxy1 = new ParticleSystem(
      new THREE.Vector3(-INITIAL_DISTANCE, 0, 0),
      GALAXY_PARTICLE_COUNT
    );
    this.galaxy2 = new ParticleSystem(
      new THREE.Vector3(INITIAL_DISTANCE, 0, 0),
      GALAXY_PARTICLE_COUNT
    );

    this.burstParticles = new ParticleSystem(
      new THREE.Vector3(0, 0, 0),
      BURST_PARTICLE_COUNT,
      true
    );
    this.burstParticles.points.visible = false;

    this.backgroundStars = createBackgroundStars(BACKGROUND_STAR_COUNT);

    this.scene.add(this.galaxy1.points);
    this.scene.add(this.galaxy1.getTrailLines());
    this.scene.add(this.galaxy2.points);
    this.scene.add(this.galaxy2.getTrailLines());
    this.scene.add(this.burstParticles.points);
    this.scene.add(this.burstParticles.getTrailLines());
    this.scene.add(this.backgroundStars);

    window.addEventListener('resize', this.onResize);
  }

  setOnStateChange(callback: (state: SimulationState) => void): void {
    this.onStateChange = callback;
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  startCollision(): void {
    if (this.isColliding) return;
    this.isColliding = true;
    this.burstCreated = false;
    this.collisionComplete = false;
    this.collisionProgress = 0;

    this.galaxy1.startCollision(new THREE.Vector3(1, 0, 0), this.collisionSpeed * 5);
    this.galaxy2.startCollision(new THREE.Vector3(-1, 0, 0), this.collisionSpeed * 5);
  }

  reset(): void {
    this.isColliding = false;
    this.isPaused = false;
    this.collisionProgress = 0;
    this.burstCreated = false;
    this.collisionComplete = false;

    this.galaxy1.dispose();
    this.galaxy2.dispose();
    this.burstParticles.dispose();

    this.scene.remove(this.galaxy1.points);
    this.scene.remove(this.galaxy1.getTrailLines());
    this.scene.remove(this.galaxy2.points);
    this.scene.remove(this.galaxy2.getTrailLines());
    this.scene.remove(this.burstParticles.points);
    this.scene.remove(this.burstParticles.getTrailLines());

    this.galaxy1 = new ParticleSystem(
      new THREE.Vector3(-INITIAL_DISTANCE, 0, 0),
      GALAXY_PARTICLE_COUNT
    );
    this.galaxy2 = new ParticleSystem(
      new THREE.Vector3(INITIAL_DISTANCE, 0, 0),
      GALAXY_PARTICLE_COUNT
    );
    this.burstParticles = new ParticleSystem(
      new THREE.Vector3(0, 0, 0),
      BURST_PARTICLE_COUNT,
      true
    );
    this.burstParticles.points.visible = false;

    this.scene.add(this.galaxy1.points);
    this.scene.add(this.galaxy1.getTrailLines());
    this.scene.add(this.galaxy2.points);
    this.scene.add(this.galaxy2.getTrailLines());
    this.scene.add(this.burstParticles.points);
    this.scene.add(this.burstParticles.getTrailLines());

    this.emitState();
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
    this.emitState();
  }

  private emitState(): void {
    if (this.onStateChange) {
      const total = GALAXY_PARTICLE_COUNT * 2 +
        (this.burstParticles.points.visible ? BURST_PARTICLE_COUNT : 0) +
        BACKGROUND_STAR_COUNT;
      this.onStateChange({
        isColliding: this.isColliding,
        isPaused: this.isPaused,
        collisionProgress: this.collisionProgress,
        totalParticles: total,
        gravityStrength: this.gravityStrength,
        collisionSpeed: this.collisionSpeed,
        particleSize: this.particleSize,
      });
    }
  }

  animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPaused) {
      this.frameCount++;
      const totalParticles = GALAXY_PARTICLE_COUNT * 2 +
        (this.burstParticles.points.visible ? BURST_PARTICLE_COUNT : 0) +
        BACKGROUND_STAR_COUNT;
      const skipFrame = totalParticles > 25000 && this.frameCount % 2 !== 0;

      if (!skipFrame) {
        this.updateScene(delta);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateScene(delta: number): void {
    this.galaxy1.update(delta, this.particleSize);
    this.galaxy2.update(delta, this.particleSize);
    this.burstParticles.update(delta, this.particleSize);

    if (this.isColliding) {
      this.galaxy1.galaxyCenter.add(
        this.galaxy1.galaxyVelocity.clone().multiplyScalar(delta)
      );
      this.galaxy2.galaxyCenter.add(
        this.galaxy2.galaxyVelocity.clone().multiplyScalar(delta)
      );

      const distance = this.galaxy1.galaxyCenter.distanceTo(this.galaxy2.galaxyCenter);
      const initialTotalDist = INITIAL_DISTANCE * 2;
      const traveled = initialTotalDist - distance;
      this.collisionProgress = Math.min(Math.max((traveled / initialTotalDist) * 100, 0), 100);

      if (distance < COLLISION_THRESHOLD) {
        this.galaxy1.applyGravity(this.galaxy2.galaxyCenter, this.gravityStrength, delta);
        this.galaxy2.applyGravity(this.galaxy1.galaxyCenter, this.gravityStrength, delta);
        this.galaxy1.applyCollisionEffect(this.galaxy2.galaxyCenter);
        this.galaxy2.applyCollisionEffect(this.galaxy1.galaxyCenter);

        if (!this.burstCreated) {
          this.burstCreated = true;
          const mid = new THREE.Vector3()
            .addVectors(this.galaxy1.galaxyCenter, this.galaxy2.galaxyCenter)
            .multiplyScalar(0.5);
          this.burstParticles.createBurstParticles(mid, BURST_PARTICLE_COUNT);
          this.burstParticles.isBurst = true;
          this.burstParticles.points.visible = true;
          this.scene.add(this.burstParticles.points);
          this.scene.add(this.burstParticles.getTrailLines());
        }
      }

      if (this.collisionProgress >= 98 && !this.collisionComplete) {
        this.collisionComplete = true;
        this.collisionProgress = 100;
      }

      this.galaxy1.updateTrails();
      this.galaxy2.updateTrails();
      this.burstParticles.updateTrails();
    }

    this.emitState();
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.galaxy1.dispose();
    this.galaxy2.dispose();
    this.burstParticles.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
