import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainManager, SamplePoint } from './terrainManager';
import { ProfileController } from './profileController';
import { WaveformView } from './waveformView';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: TerrainManager;
  private profileController: ProfileController;
  private waveformView: WaveformView;
  private sunLight: THREE.DirectionalLight;
  private sunMarker: THREE.Mesh;
  private sunDragging: boolean = false;
  private sunRaycaster: THREE.Raycaster;
  private sunPlane: THREE.Plane;
  private clock: THREE.Clock;

  constructor() {
    this.clock = new THREE.Clock();
    this.sunRaycaster = new THREE.Raycaster();
    this.sunPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.initThree();
    this.initTerrain();
    this.initSun();
    this.initSkybox();
    this.initWaveform();
    this.initProfile();
    this.initUI();
    this.animate();
    window.addEventListener('resize', () => this.onResize());
  }

  private initThree() {
    const container = document.getElementById('scene-container')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(18, 20, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 0, 0);
  }

  private initTerrain() {
    this.terrain = new TerrainManager(20, 20);
    this.scene.add(this.terrain.mesh);
    this.scene.add(this.terrain.contourLines);

    const gridHelper = new THREE.GridHelper(20, 20, 0x334455, 0x223344);
    gridHelper.position.y = -0.02;
    this.scene.add(gridHelper);

    this.terrain.on('heightChanged', () => {
      if (this.profileController.hasProfile()) {
        const samples = this.profileController.resample();
        this.waveformView.setSamples(samples);
      }
    });
  }

  private initSun() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(10, 15, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -15;
    this.sunLight.shadow.camera.right = 15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    this.scene.add(this.sunLight);

    const ambient = new THREE.AmbientLight(0x6688aa, 0.5);
    this.scene.add(ambient);

    const sunGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.95
    });
    this.sunMarker = new THREE.Mesh(sunGeo, sunMat);
    this.sunMarker.position.copy(this.sunLight.position);
    this.scene.add(this.sunMarker);

    const sunHalation = new THREE.PointLight(0xffdd88, 0.6, 10);
    sunHalation.position.copy(this.sunMarker.position);
    this.scene.add(sunHalation);

    this.bindSunDrag();
  }

  private bindSunDrag() {
    const dom = this.renderer.domElement;
    const pointer = new THREE.Vector2();

    dom.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.sunRaycaster.setFromCamera(pointer, this.camera);
      const hits = this.sunRaycaster.intersectObject(this.sunMarker, false);
      if (hits.length > 0) {
        this.sunDragging = true;
        this.controls.enabled = false;
      }
    });

    dom.addEventListener('mousemove', (e) => {
      if (!this.sunDragging) return;
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.sunRaycaster.setFromCamera(pointer, this.camera);
      const intersect = new THREE.Vector3();
      this.sunPlane.constant = -this.sunMarker.position.y;
      this.sunRaycaster.ray.intersectPlane(this.sunPlane, intersect);
      if (intersect) {
        intersect.y = Math.max(3, Math.min(25, intersect.y + this.sunMarker.position.y));
        const maxDist = 25;
        if (intersect.length() > maxDist) {
          intersect.normalize().multiplyScalar(maxDist);
          intersect.y = Math.max(3, intersect.y);
        }
        this.sunMarker.position.copy(intersect);
        this.sunLight.position.copy(intersect);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.sunDragging) {
        this.sunDragging = false;
        this.controls.enabled = true;
      }
    });
  }

  private initSkybox() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(0.6, '#a8d8ea');
    gradient.addColorStop(1, '#d6eaf8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const skyTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = skyTexture;
    this.scene.fog = new THREE.Fog(0xa8d8ea, 40, 80);
  }

  private initWaveform() {
    const canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.waveformView = new WaveformView(canvas, {
      onPointDrag: (index: number, newHeight: number) => {
        this.handleWaveformPointDrag(index, newHeight);
      }
    });
  }

  private handleWaveformPointDrag(index: number, newHeight: number) {
    const samples = this.waveformView.getSamples();
    if (index < 0 || index >= samples.length) return;
    const sample = samples[index];
    const vertexIdx = this.terrain.getVertexIndicesAt(sample.x, sample.z);
    if (vertexIdx) {
      this.terrain.updateVertexHeight(vertexIdx.col, vertexIdx.row, newHeight, 2);
    }
  }

  private initProfile() {
    this.profileController = new ProfileController(
      this.scene,
      this.camera,
      this.renderer,
      this.terrain
    );
    this.profileController.setOnProfileComplete((samples: SamplePoint[]) => {
      this.waveformView.setSamples(samples);
    });
  }

  private initUI() {
    const btnRedraw = document.getElementById('btn-redraw')!;
    btnRedraw.addEventListener('click', () => {
      this.profileController.clearProfile();
      this.waveformView.setSamples([]);
    });

    const btnExport = document.getElementById('btn-export')!;
    btnExport.addEventListener('click', () => {
      const data = this.waveformView.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'waveform-profile.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  private onResize() {
    const container = document.getElementById('scene-container')!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
