import * as THREE from 'three';
import { GalaxyGenerator } from './GalaxyGenerator';
import { HUD } from './HUD';

class StarExplorer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private galaxyGenerator: GalaxyGenerator;
  private hud: HUD;
  private container: HTMLElement;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private theta: number = Math.PI / 4;
  private phi: number = Math.PI / 3;
  private targetTheta: number = Math.PI / 4;
  private targetPhi: number = Math.PI / 3;

  private angularVelocityX: number = 0;
  private angularVelocityY: number = 0;
  private readonly INERTIA_FRICTION: number = 0.92;
  private readonly MIN_ANGULAR_VELOCITY: number = 0.0001;

  private radius: number = 150;
  private targetRadius: number = 150;
  private readonly MIN_RADIUS: number = 15;
  private readonly MAX_RADIUS: number = 600;

  private isZoomAnimating: boolean = false;
  private zoomStartRadius: number = 0;
  private zoomTargetRadius: number = 0;
  private zoomStartTime: number = 0;
  private readonly ZOOM_DURATION: number = 300;

  private lastFrameTime: number = 0;
  private fps: number = 60;
  private readonly FPS_SMOOTHING: number = 0.9;
  private lastTheta: number = Math.PI / 4;
  private lastPhi: number = Math.PI / 3;
  private lastRadius: number = 150;
  private cameraVelocity: THREE.Vector3 = new THREE.Vector3();

  private animationId: number | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.updateCameraPosition();
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.container.appendChild(this.renderer.domElement);
    
    this.galaxyGenerator = new GalaxyGenerator(this.scene, 1500);
    this.galaxyGenerator.generate();
    
    this.hud = new HUD();
    
    this.setupEventListeners();
  }

  private static cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  private easeInOutCubic(t: number): number {
    return StarExplorer.cubicBezier(t, 0, 0.42, 0.58, 1);
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.phi);
    this.camera.position.x = this.radius * sinPhi * Math.cos(this.theta);
    this.camera.position.y = this.radius * Math.cos(this.phi);
    this.camera.position.z = this.radius * sinPhi * Math.sin(this.theta);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.angularVelocityX = 0;
    this.angularVelocityY = 0;
    event.preventDefault();
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    
    const sensitivity = 0.005;
    this.angularVelocityX = deltaX * sensitivity;
    this.angularVelocityY = deltaY * sensitivity;
    
    this.targetTheta -= deltaX * sensitivity;
    this.targetPhi -= deltaY * sensitivity;
    this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    
    event.preventDefault();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = event.touches[0].clientX;
      this.lastMouseY = event.touches[0].clientY;
      this.angularVelocityX = 0;
      this.angularVelocityY = 0;
    }
    event.preventDefault();
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    
    const deltaX = event.touches[0].clientX - this.lastMouseX;
    const deltaY = event.touches[0].clientY - this.lastMouseY;
    
    const sensitivity = 0.005;
    this.angularVelocityX = deltaX * sensitivity;
    this.angularVelocityY = deltaY * sensitivity;
    
    this.targetTheta -= deltaX * sensitivity;
    this.targetPhi -= deltaY * sensitivity;
    this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));
    
    this.lastMouseX = event.touches[0].clientX;
    this.lastMouseY = event.touches[0].clientY;
    
    event.preventDefault();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 1.15 : 0.87;
    const newTargetRadius = Math.max(
      this.MIN_RADIUS,
      Math.min(this.MAX_RADIUS, this.targetRadius * zoomFactor)
    );
    
    if (newTargetRadius !== this.targetRadius) {
      this.startZoomAnimation(newTargetRadius);
    }
  }

  private startZoomAnimation(targetRadius: number): void {
    this.zoomStartRadius = this.radius;
    this.zoomTargetRadius = targetRadius;
    this.zoomStartTime = performance.now();
    this.isZoomAnimating = true;
    this.targetRadius = targetRadius;
  }

  private updateZoomAnimation(currentTime: number): void {
    if (!this.isZoomAnimating) return;
    
    const elapsed = currentTime - this.zoomStartTime;
    const progress = Math.min(1, elapsed / this.ZOOM_DURATION);
    
    const easedProgress = this.easeInOutCubic(progress);
    
    this.radius = this.zoomStartRadius + (this.zoomTargetRadius - this.zoomStartRadius) * easedProgress;
    
    if (progress >= 1) {
      this.radius = this.zoomTargetRadius;
      this.isZoomAnimating = false;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateRotationWithInertia(deltaTime: number): void {
    if (!this.isDragging) {
      if (Math.abs(this.angularVelocityX) > this.MIN_ANGULAR_VELOCITY ||
          Math.abs(this.angularVelocityY) > this.MIN_ANGULAR_VELOCITY) {
        
        this.targetTheta -= this.angularVelocityX * deltaTime * 60;
        this.targetPhi -= this.angularVelocityY * deltaTime * 60;
        this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));
        
        this.angularVelocityX *= this.INERTIA_FRICTION;
        this.angularVelocityY *= this.INERTIA_FRICTION;
      }
    }
    
    const rotationSmoothness = 0.08;
    this.theta += (this.targetTheta - this.theta) * rotationSmoothness;
    this.phi += (this.targetPhi - this.phi) * rotationSmoothness;
  }

  private animate(currentTime: number): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = this.lastFrameTime > 0 
      ? Math.min((currentTime - this.lastFrameTime) / 1000, 0.1)
      : 0.016;
    this.lastFrameTime = currentTime;
    
    const instantFps = 1 / deltaTime;
    this.fps = this.fps * this.FPS_SMOOTHING + instantFps * (1 - this.FPS_SMOOTHING);
    
    this.updateRotationWithInertia(deltaTime);
    this.updateZoomAnimation(currentTime);
    this.updateCameraPosition();
    
    const thetaDelta = Math.abs(this.theta - this.lastTheta);
    const phiDelta = Math.abs(this.phi - this.lastPhi);
    const radiusDelta = Math.abs(this.radius - this.lastRadius);
    const angularSpeed = (thetaDelta + phiDelta + radiusDelta * 0.002) / deltaTime;
    
    this.lastTheta = this.theta;
    this.lastPhi = this.phi;
    this.lastRadius = this.radius;
    
    const time = currentTime * 0.001;
    this.galaxyGenerator.updateStars(time, this.camera, {
      velocity: this.cameraVelocity,
      angularSpeed: angularSpeed
    }, deltaTime);
    
    this.hud.update(
      { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      this.galaxyGenerator.getStarCount(),
      this.fps,
      deltaTime,
      this.theta
    );
    
    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.animate(this.lastFrameTime);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

const explorer = new StarExplorer('app');
explorer.start();
