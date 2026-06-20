import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Ecosystem } from '@/core/ecosystem';
import type { ParticleSystem } from '@/core/particle';

export class Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private fishInstancedMesh: THREE.InstancedMesh | null = null;
  private particlePoints: THREE.Points | null = null;
  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();
  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1628);
    this.scene.fog = new THREE.FogExp2(0x0a1628, 0.015);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 25, 40);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 80;
    this.controls.minDistance = 10;
    this.controls.maxPolarAngle = Math.PI * 0.85;

    this.setupLights();
    this.setupBackground();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0x1a3a5c, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x4a9eff, 0.8);
    dirLight.position.set(10, 30, 10);
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x00d4aa, 0.8, 50);
    pointLight1.position.set(-15, 10, -15);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xc850c0, 0.4, 50);
    pointLight2.position.set(15, -5, 15);
    this.scene.add(pointLight2);

    const causticLight = new THREE.PointLight(0x6ec6ff, 0.5, 60);
    causticLight.position.set(0, 25, 0);
    this.scene.add(causticLight);
  }

  private setupBackground() {
    const geo = new THREE.PlaneGeometry(200, 200, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x081020,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -15;
    this.scene.add(floor);
  }

  createFishMesh(ecosystem: Ecosystem) {
    if (this.fishInstancedMesh) {
      this.scene.remove(this.fishInstancedMesh);
      this.fishInstancedMesh.geometry.dispose();
      (this.fishInstancedMesh.material as THREE.Material).dispose();
    }

    const fishGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
    fishGeo.rotateX(Math.PI / 2);

    const fishMat = new THREE.MeshPhongMaterial({
      vertexColors: false,
      shininess: 80,
      transparent: true,
      opacity: 0.9,
    });

    const maxCount = 200;
    this.fishInstancedMesh = new THREE.InstancedMesh(fishGeo, fishMat, maxCount);
    this.fishInstancedMesh.count = ecosystem.fishes.length;
    this.scene.add(this.fishInstancedMesh);

    for (let i = 0; i < ecosystem.fishes.length; i++) {
      const t = i / Math.max(1, ecosystem.fishes.length - 1);
      this.tempColor.setHSL(0.45 + t * 0.35, 0.8, 0.55);
      this.fishInstancedMesh.setColorAt(i, this.tempColor);
    }
    if (this.fishInstancedMesh.instanceColor) {
      this.fishInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  updateFishMesh(ecosystem: Ecosystem) {
    if (!this.fishInstancedMesh) return;

    this.fishInstancedMesh.count = ecosystem.fishes.length;

    for (let i = 0; i < ecosystem.fishes.length; i++) {
      const fish = ecosystem.fishes[i];
      this.dummy.position.copy(fish.position);

      const dir = fish.velocity.clone().normalize();
      if (dir.length() > 0.01) {
        this.dummy.lookAt(fish.position.clone().add(dir));
      }

      const t = i / Math.max(1, ecosystem.fishes.length - 1);
      this.dummy.scale.setScalar(0.8 + Math.sin(i * 1.5) * 0.2);
      this.dummy.updateMatrix();
      this.fishInstancedMesh.setMatrixAt(i, this.dummy.matrix);

      this.tempColor.setHSL(0.45 + t * 0.35, 0.8, 0.55);
      this.fishInstancedMesh.setColorAt(i, this.tempColor);
    }

    this.fishInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.fishInstancedMesh.instanceColor) {
      this.fishInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  createParticlePoints(particleSystem: ParticleSystem) {
    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
      this.particlePoints.geometry.dispose();
      (this.particlePoints.material as THREE.Material).dispose();
    }

    const d = particleSystem.data;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(d.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particlePoints = new THREE.Points(geometry, material);
    this.scene.add(this.particlePoints);
  }

  updateParticlePoints(particleSystem: ParticleSystem) {
    if (!this.particlePoints) return;

    const d = particleSystem.data;
    const posAttr = this.particlePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particlePoints.geometry.getAttribute('color') as THREE.BufferAttribute;

    posAttr.array.set(d.positions);
    colAttr.array.set(d.colors);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
