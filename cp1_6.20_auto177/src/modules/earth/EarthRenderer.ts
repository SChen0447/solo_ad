import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CustomEarthMaterial } from './CustomEarthMaterial';

export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  timestamp: number;
}

export class EarthRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private earthGroup: THREE.Group;
  private earthMesh: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private customMaterial: CustomEarthMaterial | null = null;
  private clock: THREE.Clock;
  private markers: Map<string, THREE.Group>;
  private animationFrameId: number | null = null;
  private onAnimationFrame: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.markers = new Map();

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0d0d1a);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 12;
    this.controls.enablePan = false;

    this.earthGroup = new THREE.Group();
    this.scene.add(this.earthGroup);

    this.setupLighting();
    this.createStars();
    this.createEarth();

    window.addEventListener('resize', () => this.handleResize(container));
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(-5, -3, -5);
    this.scene.add(rimLight);
  }

  private createStars(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 30 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  private createEarth(): void {
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    this.customMaterial = new CustomEarthMaterial();

    this.earthMesh = new THREE.Mesh(earthGeometry, this.customMaterial);
    this.earthGroup.add(this.earthMesh);

    const atmosphereGeometry = new THREE.SphereGeometry(2.05, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.earthGroup.add(atmosphere);
  }

  public latLonToVector3(lat: number, lon: number, radius: number = 2): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  public addMarker(markerData: MarkerData, markerObject: any): void {
    const position = this.latLonToVector3(markerData.latitude, markerData.longitude);
    
    const group = new THREE.Group();
    group.position.copy(position);
    group.lookAt(new THREE.Vector3(0, 0, 0));
    group.userData = { markerData };
    
    group.add(markerObject);
    this.earthGroup.add(group);
    this.markers.set(markerData.id, group);
  }

  public removeMarker(markerId: string): void {
    const marker = this.markers.get(markerId);
    if (marker) {
      this.earthGroup.remove(marker);
      marker.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.markers.delete(markerId);
    }
  }

  public getMarker(markerId: string): THREE.Group | undefined {
    return this.markers.get(markerId);
  }

  public getAllMarkers(): Map<string, THREE.Group> {
    return this.markers;
  }

  public setOnAnimationFrame(callback: () => void): void {
    this.onAnimationFrame = callback;
  }

  public start(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      const delta = this.clock.getDelta();
      
      if (this.customMaterial) {
        this.customMaterial.update(delta);
      }

      if (this.onAnimationFrame) {
        this.onAnimationFrame();
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public dispose(): void {
    this.stop();
    
    this.markers.forEach((_, id) => this.removeMarker(id));
    
    if (this.earthMesh) {
      this.earthMesh.geometry.dispose();
      if (this.customMaterial) {
        this.customMaterial.dispose();
      }
    }

    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    
    window.removeEventListener('resize', () => this.handleResize);
  }
}
