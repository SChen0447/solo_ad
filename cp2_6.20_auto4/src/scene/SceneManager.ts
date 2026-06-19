import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GridHelper from './GridHelper';

export interface SceneManagerOptions {
  canvas: HTMLCanvasElement;
}

export interface MarkerData {
  id: number;
  position: THREE.Vector3;
  elevation: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private gridHelper: GridHelper;
  private particleSystem: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private terrain: THREE.Mesh | null = null;
  private markers: THREE.Mesh[] = [];
  private markerData: MarkerData[] = [];
  private infoLabels: HTMLDivElement[] = [];
  private clock: THREE.Clock;
  private animationFrameId: number = 0;
  private onFrameCallback: ((delta: number) => void) | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedMarker: number | null = null;

  constructor(options: SceneManagerOptions) {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(30, 20, 30);

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0a, 1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;
    this.controls.rotateSpeed = 0.003;
    this.controls.zoomSpeed = 0.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 1;

    this.gridHelper = new GridHelper(this.scene);

    this.setupLights();
    this.createTerrain();
    this.createMarkers();
    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0xd2b48c, 0.3);
    this.scene.add(hemisphereLight);
  }

  private createTerrain(): void {
    const size = 80;
    const segments = 20;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors: number[] = [];
    const colorLow = new THREE.Color(0xd2b48c);
    const colorHigh = new THREE.Color(0x8b4513);

    for (let i = 0; i < positions.count; i++) {
      const height = Math.random() * 5;
      positions.setY(i, height);

      const t = height / 5;
      const color = colorLow.clone().lerp(colorHigh, t);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  private createMarkers(): void {
    const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      const elevation = this.getTerrainHeight(x, z);

      const marker = new THREE.Mesh(markerGeometry.clone(), markerMaterial.clone());
      marker.position.set(x, elevation + 0.5, z);
      marker.userData = { id: i, baseScale: 1, isSelected: false };
      
      this.markers.push(marker);
      this.markerData.push({
        id: i,
        position: new THREE.Vector3(x, elevation, z),
        elevation: elevation
      });
      this.scene.add(marker);
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    let height = 0;
    let minDist = Infinity;

    const positions = this.terrain?.geometry.attributes.position;
    if (!positions) return 0;

    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i);
      const pz = positions.getZ(i);
      const dist = Math.sqrt((px - x) ** 2 + (pz - z) ** 2);
      if (dist < minDist) {
        minDist = dist;
        height = positions.getY(i);
      }
    }

    return height;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onClick(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.markers, true);

    if (intersects.length > 0) {
      let clickedObject = intersects[0].object as THREE.Mesh;
      while (clickedObject.parent && !clickedObject.userData.hasOwnProperty('id')) {
        clickedObject = clickedObject.parent as THREE.Mesh;
      }

      if (clickedObject.userData.hasOwnProperty('id')) {
        const markerId = clickedObject.userData.id;
        event.preventDefault();
        event.stopPropagation();
        this.selectMarker(markerId);
        return;
      }
    }

    this.deselectAllMarkers();
  }

  private selectMarker(id: number): void {
    if (id < 0 || id >= this.markers.length) return;

    this.deselectAllMarkers();
    this.selectedMarker = id;

    const marker = this.markers[id];
    marker.userData.isSelected = true;
    marker.scale.setScalar(1.5);

    this.animateMarkerFlash(marker, 2);
    this.showInfoLabel(id);
  }

  private deselectAllMarkers(): void {
    this.selectedMarker = null;
    this.markers.forEach((marker) => {
      marker.userData.isSelected = false;
      marker.scale.setScalar(1);
    });
    this.hideAllInfoLabels();
  }

  private animateMarkerFlash(marker: THREE.Mesh, times: number): void {
    const material = marker.material as THREE.MeshBasicMaterial;
    const flashDuration = 0.2;
    const totalDuration = flashDuration * times * 2;
    let elapsed = 0;
    const startTime = this.clock.getElapsedTime();

    const flash = () => {
      const now = this.clock.getElapsedTime();
      elapsed = now - startTime;

      if (elapsed < totalDuration) {
        const cycleTime = elapsed % (flashDuration * 2);
        const t = cycleTime / flashDuration;
        const easeT = t < 1 ? this.easeOutQuad(t) : this.easeOutQuad(2 - t);
        material.opacity = 0.3 + easeT * 0.6;

        requestAnimationFrame(flash);
      } else {
        material.opacity = 0.9;
      }
    };

    flash();
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  private showInfoLabel(markerId: number): void {
    this.hideAllInfoLabels();

    const data = this.markerData[markerId];
    const label = document.createElement('div');
    label.className = 'info-label';
    label.textContent = `海拔: ${data.elevation.toFixed(1)}`;
    label.style.opacity = '0';
    label.style.transition = 'opacity 0.2s ease-out';

    document.body.appendChild(label);
    this.infoLabels.push(label);

    requestAnimationFrame(() => {
      label.style.opacity = '1';
    });

    this.updateInfoLabelPosition(markerId);
  }

  private updateInfoLabelPosition(markerId: number): void {
    if (this.infoLabels.length === 0) return;

    const marker = this.markers[markerId];
    const label = this.infoLabels[0];
    const vector = marker.position.clone();
    vector.y += 2;
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    label.style.left = `${x - label.offsetWidth / 2}px`;
    label.style.top = `${y - label.offsetHeight}px`;
  }

  private hideAllInfoLabels(): void {
    this.infoLabels.forEach((label) => {
      label.style.opacity = '0';
      setTimeout(() => {
        if (label.parentNode) {
          label.parentNode.removeChild(label);
        }
      }, 200);
    });
    this.infoLabels = [];
  }

  public createParticleSystem(count: number): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleGeometry?.dispose();
      this.particleMaterial?.dispose();
    }

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      sizes[i] = 2 + Math.random() * 2;

      const t = Math.random();
      const color = new THREE.Color();
      color.setHSL(0.08 + t * 0.05, 0.8, 0.5 + t * 0.2);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
  }

  public updateParticlePositions(positions: Float32Array): void {
    if (!this.particleGeometry) return;

    const positionAttr = this.particleGeometry.attributes.position;
    const posArray = positionAttr.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      posArray[i] = positions[i];
    }
    
    positionAttr.needsUpdate = true;
  }

  public updateParticleColors(colors: Float32Array): void {
    if (!this.particleGeometry) return;

    const colorAttr = this.particleGeometry.attributes.color;
    const colorArray = colorAttr.array as Float32Array;
    
    for (let i = 0; i < colors.length; i++) {
      colorArray[i] = colors[i];
    }
    
    colorAttr.needsUpdate = true;
  }

  public setOnFrameCallback(callback: (delta: number) => void): void {
    this.onFrameCallback = callback;
  }

  public startAnimation(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const delta = this.clock.getDelta();
      this.controls.update();

      if (this.onFrameCallback) {
        this.onFrameCallback(delta);
      }

      this.updateMarkers();
      this.updateSelectedLabel();

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private updateMarkers(): void {
    const time = this.clock.getElapsedTime();
    
    this.markers.forEach((marker, index) => {
      const material = marker.material as THREE.MeshBasicMaterial;
      const pulse = 0.8 + Math.sin(time * 2 + index) * 0.2;
      material.opacity = marker.userData.isSelected ? 0.9 : 0.7 * pulse;

      marker.rotation.y += 0.01;
    });
  }

  private updateSelectedLabel(): void {
    if (this.selectedMarker !== null) {
      this.updateInfoLabelPosition(this.selectedMarker);
    }
  }

  public resetCamera(): void {
    this.controls.reset();
    this.camera.position.set(30, 20, 30);
    this.controls.update();
  }

  public getTerrainMesh(): THREE.Mesh | null {
    return this.terrain;
  }

  public getMarkers(): THREE.Mesh[] {
    return this.markers;
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));
    this.gridHelper.dispose();
    this.renderer.dispose();
  }
}

export default SceneManager;
