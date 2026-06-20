import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Terrain, TerrainData } from './Terrain.js';
import { SimulationModule } from '../simulation/index.js';
import { HeatmapRenderer } from '../rendering/Heatmap.js';
import { TrafficController, RoadSignal, CarState } from '../simulation/TrafficController.js';

interface BlockMapping {
  mesh: THREE.InstancedMesh;
  positions: Map<string, THREE.Vector3>;
}

class CityApp {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass!: UnrealBloomPass;

  private terrain: Terrain | null = null;
  private terrainData: TerrainData | null = null;
  private simulation: SimulationModule | null = null;
  private heatmap: HeatmapRenderer | null = null;
  private trafficController: TrafficController | null = null;

  private pedestrianData: number[][] = [];

  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private cameraSpherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 80 };
  private sphericalVelocity = { theta: 0, phi: 0, radius: 0 };
  private readonly DAMPING = 0.92;

  private clock: THREE.Clock;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;

  private signalMeshes: Map<string, {
    group: THREE.Group;
    red: THREE.Mesh;
    yellow: THREE.Mesh;
    green: THREE.Mesh;
  }> = new Map();

  private carMesh: THREE.InstancedMesh | null = null;
  private carDummy: THREE.Object3D = new THREE.Object3D();
  private cars: CarState[] = [];
  private maxCars = 150;
  private tailLights: THREE.PointLight[] = [];

  private congestionZones: Map<string, THREE.Mesh> = new Map();
  private roadMarkers: THREE.InstancedMesh | null = null;
  private roadMarkerDummy: THREE.Object3D = new THREE.Object3D();

  private simTime = { hour: 12, minute: 0, second: 0 };
  private simTimeSpeed = 60;

  constructor() {
    this.canvas = document.getElementById('canvas-container') as HTMLCanvasElement;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.composer = this.createComposer();

    this.initLights();
    this.createSkybox();
    this.initTerrain();
    this.initSimulation();
    this.initHeatmap();
    this.initTraffic();
    this.initCars();
    this.initUI();
    this.initControls();
    this.initRoadMarkers();

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 100, 300);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
    return camera;
  }

  private updateCameraPosition(): void {
    const { theta, phi, radius } = this.cameraSpherical;
    this.camera.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(0, 0, 0);
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return renderer;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,
      0.5,
      0.85
    );
    composer.addPass(this.bloomPass);

    return composer;
  }

  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    this.scene.add(dirLight);
  }

  private createSkybox(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#f5f5f5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        skyTexture: { value: texture }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D skyTexture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(skyTexture, vec2(0.0, 1.0 - vUv.y));
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    const skyGeo = new THREE.SphereGeometry(400, 32, 15);
    const sky = new THREE.Mesh(skyGeo, material);
    this.scene.add(sky);
  }

  private initTerrain(): void {
    this.terrain = new Terrain(this.scene);
    this.terrainData = this.terrain.generate();
  }

  private initSimulation(): void {
    this.simulation = new SimulationModule();
    this.simulation.on('dataUpdated', ((data: Event) => {
      this.pedestrianData = (data as CustomEvent).detail;
      if (this.heatmap) {
        this.heatmap.updateData(this.pedestrianData);
      }
    }) as EventListener);
    this.simulation.start();
  }

  private initHeatmap(): void {
    if (!this.terrainData) return;
    this.heatmap = new HeatmapRenderer(this.scene, this.terrainData);
    for (let i = 0; i < 16; i++) {
      this.pedestrianData[i] = [];
      for (let j = 0; j < 16; j++) {
        this.pedestrianData[i][j] = 50;
      }
    }
    this.heatmap.updateData(this.pedestrianData);
  }

  private initTraffic(): void {
    this.trafficController = new TrafficController();
    this.trafficController.on('signalChanged', ((e: Event) => {
      this.updateSignalVisuals((e as CustomEvent).detail);
    }) as EventListener);
    this.trafficController.on('congestionChanged', ((e: Event) => {
      this.updateCongestionZones((e as CustomEvent).detail);
    }) as EventListener);
    this.createSignalModels();
  }

  private createSignalModels(): void {
    const intersections = this.trafficController!.getIntersections();
    intersections.forEach((pos, id) => {
      const group = new THREE.Group();
      const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, 2, 0);
      group.add(pole);

      const colors = [0xff0000, 0xffff00, 0x00ff00];
      const names = ['red', 'yellow', 'green'];
      const meshes: Record<string, THREE.Mesh> = {};

      for (let i = 0; i < 3; i++) {
        const geo = new THREE.SphereGeometry(0.4, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: colors[i],
          emissive: colors[i],
          emissiveIntensity: 0.3
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, 4 + i * 1.0, 0);
        group.add(mesh);
        meshes[names[i]] = mesh;
      }

      group.position.set(pos.x, 0, pos.z);
      this.scene.add(group);
      this.signalMeshes.set(id, {
        group,
        red: meshes['red'] as THREE.Mesh,
        yellow: meshes['yellow'] as THREE.Mesh,
        green: meshes['green'] as THREE.Mesh
      });

      this.setSignalEmissive(id, 'red', true);
    });
  }

  private setSignalEmissive(signalId: string, light: 'red' | 'yellow' | 'green', on: boolean): void {
    const signal = this.signalMeshes.get(signalId);
    if (!signal) return;

    const allLights: ('red' | 'yellow' | 'green')[] = ['red', 'yellow', 'green'];
    allLights.forEach(l => {
      const mesh = signal[l];
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (l === light) {
        mat.emissiveIntensity = on ? 1.2 : 0.1;
      } else {
        mat.emissiveIntensity = 0.1;
      }
    });
  }

  private updateSignalVisuals(signals: RoadSignal[]): void {
    signals.forEach(sig => {
      const keys = this.signalMeshes.keys();
      for (const key of keys) {
        if (key.includes(sig.roadId)) {
          let activeLight: 'red' | 'yellow' | 'green' = 'red';
          if (sig.state === 'green') activeLight = 'green';
          else if (sig.state === 'yellow') activeLight = 'yellow';
          this.setSignalEmissive(key, activeLight, true);
        }
      }
    });
  }

  private updateCongestionZones(data: { roadId: string; congestion: number }[]): void {
    data.forEach(item => {
      if (item.congestion >= 5) {
        if (!this.congestionZones.has(item.roadId)) {
          const geo = new THREE.PlaneGeometry(4, 64);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;
          const roadPos = this.trafficController!.getRoadPosition(item.roadId);
          mesh.position.set(roadPos.x, 0.05, roadPos.z);
          if (roadPos.isHorizontal) {
            mesh.rotation.z = Math.PI / 2;
          }
          this.scene.add(mesh);
          this.congestionZones.set(item.roadId, mesh);
        }
      } else {
        const zone = this.congestionZones.get(item.roadId);
        if (zone) {
          this.scene.remove(zone);
          zone.geometry.dispose();
          (zone.material as THREE.Material).dispose();
          this.congestionZones.delete(item.roadId);
        }
      }
    });
  }

  private initCars(): void {
    const carGeo = new THREE.BoxGeometry(1.2, 0.4, 0.6);
    const colors = new Float32Array(this.maxCars * 3);
    const colorPallete = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0x34495e];

    for (let i = 0; i < this.maxCars; i++) {
      const c = new THREE.Color(colorPallete[Math.floor(Math.random() * colorPallete.length)]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    carGeo.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));
    const carMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.3,
      roughness: 0.7
    });

    this.carMesh = new THREE.InstancedMesh(carGeo, carMat, this.maxCars);
    this.carMesh.castShadow = true;
    this.carMesh.count = 0;
    this.scene.add(this.carMesh);
  }

  private initRoadMarkers(): void {
    if (!this.terrainData) return;
    const roadPositions = this.terrainData.roadMarkerPositions;
    const markerGeo = new THREE.PlaneGeometry(0.8, 0.15);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    this.roadMarkers = new THREE.InstancedMesh(markerGeo, markerMat, roadPositions.length);
    this.roadMarkers.count = roadPositions.length;

    roadPositions.forEach((pos, i) => {
      this.roadMarkerDummy.position.set(pos.x, 0.03, pos.z);
      this.roadMarkerDummy.rotation.x = -Math.PI / 2;
      if (pos.isHorizontal) {
        this.roadMarkerDummy.rotation.z = Math.PI / 2;
      }
      this.roadMarkerDummy.updateMatrix();
      this.roadMarkers!.setMatrixAt(i, this.roadMarkerDummy.matrix);
    });

    this.roadMarkers.instanceMatrix.needsUpdate = true;
    this.scene.add(this.roadMarkers);
  }

  private initUI(): void {
    const roadSelect = document.getElementById('road-select') as HTMLSelectElement;
    const greenSlider = document.getElementById('green-duration') as HTMLInputElement;
    const greenValue = document.getElementById('green-value') as HTMLElement;
    const applyBtn = document.getElementById('apply-btn') as HTMLButtonElement;

    const roads = this.trafficController!.getRoads();
    roads.forEach(road => {
      const opt = document.createElement('option');
      opt.value = road.id;
      opt.textContent = road.name;
      roadSelect.appendChild(opt);
    });

    greenSlider.addEventListener('input', () => {
      greenValue.textContent = greenSlider.value + '秒';
    });

    applyBtn.addEventListener('click', () => {
      const roadId = roadSelect.value;
      const duration = parseInt(greenSlider.value);
      this.trafficController!.setGreenDuration(roadId, duration);
    });
  }

  private initControls(): void {
    const el = this.canvas;

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.sphericalVelocity.theta -= dx * 0.005;
      this.sphericalVelocity.phi -= dy * 0.005;
      this.sphericalVelocity.phi = Math.max(0.15, Math.min(Math.PI / 2.1, this.sphericalVelocity.phi));
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.sphericalVelocity.radius += this.cameraSpherical.radius * (zoomFactor - 1) * 0.5;
    }, { passive: false });

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouse.x = e.touches[0].clientX;
        this.previousMouse.y = e.touches[0].clientY;
      }
    });

    el.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    el.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;
      this.sphericalVelocity.theta -= dx * 0.005;
      this.sphericalVelocity.phi -= dy * 0.005;
      this.sphericalVelocity.phi = Math.max(0.15, Math.min(Math.PI / 2.1, this.sphericalVelocity.phi));
      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCars(dt: number): void {
    if (!this.trafficController || !this.carMesh) return;

    const carStates = this.trafficController.getCarStates();
    this.cars = carStates.slice(0, this.maxCars);
    this.carMesh.count = this.cars.length;

    this.cars.forEach((car, i) => {
      this.carDummy.position.set(car.x, 0.2, car.z);
      this.carDummy.rotation.y = car.rotation;
      this.carDummy.updateMatrix();
      this.carMesh!.setMatrixAt(i, this.carDummy.matrix);
    });

    this.carMesh.instanceMatrix.needsUpdate = true;
    this.trafficController.updateCars(dt);
  }

  private updateSimTime(dt: number): void {
    this.simTime.second += dt * this.simTimeSpeed;
    while (this.simTime.second >= 60) {
      this.simTime.second -= 60;
      this.simTime.minute += 1;
    }
    while (this.simTime.minute >= 60) {
      this.simTime.minute -= 60;
      this.simTime.hour = (this.simTime.hour + 1) % 24;
    }

    const timeStr = `${String(this.simTime.hour).padStart(2, '0')}:${String(this.simTime.minute).padStart(2, '0')}`;
    const el = document.getElementById('sim-time');
    if (el) el.textContent = timeStr;

    if (this.simulation) {
      this.simulation.setSimulatedHour(this.simTime.hour + this.simTime.minute / 60);
    }
  }

  private updateRoadMarkers(time: number): void {
    if (!this.roadMarkers) return;
    const mat = this.roadMarkers.material as THREE.MeshBasicMaterial;
    const cycle = 1.5;
    const phase = (time % cycle) / cycle;
    mat.opacity = 0.4 + 0.5 * Math.sin(phase * Math.PI * 2);
  }

  private updateCongestionAnim(time: number): void {
    const cycle = 0.8;
    const phase = (time % cycle) / cycle;
    const opacity = 0.1 + 0.15 * Math.abs(Math.sin(phase * Math.PI * 2));
    this.congestionZones.forEach(zone => {
      (zone.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
  }

  private updateFps(elapsed: number): void {
    this.frameCount++;
    if (elapsed - this.lastFpsUpdate >= 0.5) {
      this.currentFps = Math.round(this.frameCount / (elapsed - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = elapsed;

      const fpsEl = document.getElementById('fps-display');
      const instanceEl = document.getElementById('instance-count');
      const heatResEl = document.getElementById('heat-resolution');

      if (fpsEl) fpsEl.textContent = String(this.currentFps);
      if (instanceEl) instanceEl.textContent = String(this.getTotalInstanceCount());
      if (heatResEl && this.heatmap) heatResEl.textContent = this.heatmap.getResolutionLabel();

      if (this.heatmap) {
        this.heatmap.setLowPerformanceMode(this.currentFps < 25);
      }
    }
  }

  private getTotalInstanceCount(): number {
    let count = 0;
    this.scene.traverse(obj => {
      if (obj instanceof THREE.InstancedMesh) {
        count += obj.count;
      }
    });
    return count;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.cameraSpherical.theta += this.sphericalVelocity.theta;
    this.cameraSpherical.phi += this.sphericalVelocity.phi;
    this.cameraSpherical.radius += this.sphericalVelocity.radius;

    this.cameraSpherical.radius = Math.max(80 * 0.3, Math.min(80 * 5, this.cameraSpherical.radius));
    this.sphericalVelocity.theta *= this.DAMPING;
    this.sphericalVelocity.phi *= this.DAMPING;
    this.sphericalVelocity.radius *= this.DAMPING;

    this.updateCameraPosition();

    this.updateSimTime(dt);
    this.updateCars(dt);
    this.updateRoadMarkers(elapsed);
    this.updateCongestionAnim(elapsed);

    if (this.heatmap) {
      this.heatmap.update(elapsed);
    }

    if (this.trafficController) {
      this.trafficController.update(dt, elapsed);
    }

    this.updateFps(elapsed);
    this.composer.render();
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new CityApp();
});
