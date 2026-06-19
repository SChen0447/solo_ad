import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SimulationEngine, Planet, Particle, Vec3 } from './SimulationEngine';

interface PlanetMeshData {
  mesh: THREE.Mesh;
  selectionRing: THREE.Mesh;
  trajectoryLine: THREE.Line;
  trajectoryGeometry: THREE.BufferGeometry;
  trajectoryPositions: Float32Array;
  trajectoryColors: Float32Array;
  lastTrajectoryUpdate: number;
}

interface ParticleMeshData {
  mesh: THREE.Mesh;
}

export class Renderer3D {
  private container: HTMLElement;
  private engine: SimulationEngine;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private starMesh!: THREE.Mesh;
  private starGlowMesh!: THREE.Mesh;
  private starHalo!: THREE.Mesh;

  private planetMeshes: Map<number, PlanetMeshData> = new Map();
  private particleMeshes: Map<number, ParticleMeshData> = new Map();

  private infoPanel: HTMLElement;
  private infoName: HTMLElement;
  private infoMass: HTMLElement;
  private infoSpeed: HTMLElement;
  private infoRadius: HTMLElement;
  private infoPeriod: HTMLElement;

  private onPlanetClickCallback: ((planetId: number) => void) | null = null;

  private trajectoryFadeAlpha: Map<number, number> = new Map();
  private fadeActive: boolean = false;
  private fadeStartTime: number = 0;

  private starsBackground!: THREE.Points;

  constructor(containerId: string, engine: SimulationEngine) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;
    this.engine = engine;

    this.infoPanel = document.getElementById('info-panel')!;
    this.infoName = document.getElementById('info-name')!;
    this.infoMass = document.getElementById('info-mass')!;
    this.infoSpeed = document.getElementById('info-speed')!;
    this.infoRadius = document.getElementById('info-radius')!;
    this.infoPeriod = document.getElementById('info-period')!;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.camera.position.set(0, 25, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.createStar();
    this.createBackgroundStars();
    this.createPlanetMeshes();

    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
  }

  private createGradientBackground(): THREE.Color {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    return new THREE.Color('#0a0a2e');
  }

  private createBackgroundStars(): void {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 200 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = Math.random() * 1.5 + 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85
    });
    this.starsBackground = new THREE.Points(geometry, material);
    this.scene.add(this.starsBackground);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x333355, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffff88, 3, 0, 0.5);
    pointLight.position.set(0, 0, 0);
    pointLight.castShadow = true;
    this.scene.add(pointLight);

    const hemiLight = new THREE.HemisphereLight(0x444477, 0x111133, 0.3);
    this.scene.add(hemiLight);
  }

  private createStar(): void {
    const star = this.engine.star;

    const starGeometry = new THREE.SphereGeometry(star.radius, 48, 48);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(star.color),
      transparent: true
    });
    this.starMesh = new THREE.Mesh(starGeometry, starMaterial);
    this.starMesh.position.set(star.position.x, star.position.y, star.position.z);
    this.scene.add(this.starMesh);

    const glowGeometry = new THREE.SphereGeometry(star.radius * 1.3, 48, 48);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffaa00'),
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    this.starGlowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(this.starGlowMesh);

    const haloGeometry = new THREE.SphereGeometry(star.radius * 1.8, 48, 48);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffee88'),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    this.starHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.scene.add(this.starHalo);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 1, b: 1 };
  }

  private createPlanetMeshes(): void {
    for (const planet of this.engine.planets) {
      this.createPlanetMesh(planet);
    }
  }

  private createPlanetMesh(planet: Planet): PlanetMeshData {
    const geometry = new THREE.SphereGeometry(planet.radius, 32, 32);
    const rgb = this.hexToRgb(planet.color);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rgb.r, rgb.g, rgb.b),
      metalness: 0.3,
      roughness: 0.7,
      emissive: new THREE.Color(rgb.r * 0.15, rgb.g * 0.15, rgb.b * 0.15)
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { planetId: planet.id, isPlanet: true };
    this.scene.add(mesh);

    const ringGeometry = new THREE.RingGeometry(planet.radius * 1.5, planet.radius * 1.8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(rgb.r, rgb.g, rgb.b),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    selectionRing.position.set(planet.position.x, planet.position.y, planet.position.z);
    selectionRing.lookAt(new THREE.Vector3(0, 1, 0).add(selectionRing.position));
    this.scene.add(selectionRing);

    const MAX_TRAJECTORY = 200;
    const trajectoryPositions = new Float32Array(MAX_TRAJECTORY * 3);
    const trajectoryColors = new Float32Array(MAX_TRAJECTORY * 3);

    for (let i = 0; i < MAX_TRAJECTORY; i++) {
      const alpha = 0.8 - (0.6 * i / MAX_TRAJECTORY);
      trajectoryColors[i * 3] = rgb.r;
      trajectoryColors[i * 3 + 1] = rgb.g;
      trajectoryColors[i * 3 + 2] = rgb.b;
    }

    const trajectoryGeometry = new THREE.BufferGeometry();
    trajectoryGeometry.setAttribute('position', new THREE.BufferAttribute(trajectoryPositions, 3));
    trajectoryGeometry.setAttribute('color', new THREE.BufferAttribute(trajectoryColors, 3));
    trajectoryGeometry.setDrawRange(0, 0);

    const trajectoryMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      linewidth: 1.5
    });

    const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    this.scene.add(trajectoryLine);

    const meshData: PlanetMeshData = {
      mesh,
      selectionRing,
      trajectoryLine,
      trajectoryGeometry,
      trajectoryPositions,
      trajectoryColors,
      lastTrajectoryUpdate: 0
    };
    this.planetMeshes.set(planet.id, meshData);
    return meshData;
  }

  private removePlanetMesh(planetId: number): void {
    const meshData = this.planetMeshes.get(planetId);
    if (meshData) {
      this.scene.remove(meshData.mesh);
      this.scene.remove(meshData.selectionRing);
      this.scene.remove(meshData.trajectoryLine);
      meshData.mesh.geometry.dispose();
      (meshData.mesh.material as THREE.Material).dispose();
      meshData.selectionRing.geometry.dispose();
      (meshData.selectionRing.material as THREE.Material).dispose();
      meshData.trajectoryGeometry.dispose();
      (meshData.trajectoryLine.material as THREE.Material).dispose();
      this.planetMeshes.delete(planetId);
      this.trajectoryFadeAlpha.delete(planetId);
    }
  }

  private createParticleMesh(particle: Particle): ParticleMeshData {
    const rgb = this.hexToRgb(particle.color);
    const geometry = new THREE.SphereGeometry(particle.size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(rgb.r, rgb.g, rgb.b),
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(particle.position.x, particle.position.y, particle.position.z);
    this.scene.add(mesh);
    const data = { mesh };
    this.particleMeshes.set(particle.id, data);
    return data;
  }

  private removeParticleMesh(particleId: number): void {
    const meshData = this.particleMeshes.get(particleId);
    if (meshData) {
      this.scene.remove(meshData.mesh);
      meshData.mesh.geometry.dispose();
      (meshData.mesh.material as THREE.Material).dispose();
      this.particleMeshes.delete(particleId);
    }
  }

  public setOnPlanetClick(callback: (planetId: number) => void): void {
    this.onPlanetClickCallback = callback;
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onCanvasClick = (event: MouseEvent): void => {
    if (event.target !== this.renderer.domElement) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planetMeshes: THREE.Mesh[] = [];
    this.planetMeshes.forEach(data => planetMeshes.push(data.mesh));

    const intersects = this.raycaster.intersectObjects(planetMeshes, false);

    if (intersects.length > 0) {
      const planetId = intersects[0].object.userData.planetId as number;
      if (this.onPlanetClickCallback) {
        this.onPlanetClickCallback(planetId);
      }
    }
  };

  public startTrajectoryFade(): void {
    this.fadeActive = true;
    this.fadeStartTime = performance.now();
    this.planetMeshes.forEach((data, id) => {
      this.trajectoryFadeAlpha.set(id, 1.0);
    });
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.engine.update(deltaTime);

    this.updateStar(elapsedTime);
    this.updatePlanets(deltaTime, elapsedTime);
    this.updateParticles();
    this.updateTrajectories(deltaTime);
    this.updateInfoPanel();
    this.handleMergeEvents();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private updateStar(elapsedTime: number): void {
    const pulseScale = 1.0 + 0.05 * Math.sin(elapsedTime * Math.PI);
    this.starMesh.scale.setScalar(pulseScale);
    this.starGlowMesh.scale.setScalar(pulseScale * 1.1);
    this.starHalo.scale.setScalar(pulseScale * 1.2);

    this.starMesh.rotation.y += 0.1 * (1 / 60);
  }

  private updatePlanets(deltaTime: number, elapsedTime: number): void {
    const activePlanetIds = new Set<number>();

    for (const planet of this.engine.planets) {
      activePlanetIds.add(planet.id);
      let meshData = this.planetMeshes.get(planet.id);
      if (!meshData) {
        meshData = this.createPlanetMesh(planet);
      }

      meshData.mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
      meshData.selectionRing.position.set(planet.position.x, planet.position.y, planet.position.z);

      meshData.selectionRing.lookAt(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z
      );
      meshData.selectionRing.rotateZ(elapsedTime * 0.5);

      const ringMaterial = meshData.selectionRing.material as THREE.MeshBasicMaterial;
      if (planet.selected) {
        ringMaterial.opacity = Math.min(ringMaterial.opacity + deltaTime * 3, 0.7);
      } else {
        ringMaterial.opacity = Math.max(ringMaterial.opacity - deltaTime * 3, 0.0);
      }

      meshData.mesh.rotation.y += deltaTime * 0.3;
    }

    for (const [id] of this.planetMeshes) {
      if (!activePlanetIds.has(id)) {
        this.removePlanetMesh(id);
      }
    }
  }

  private updateTrajectories(deltaTime: number): void {
    if (this.fadeActive) {
      const elapsed = (performance.now() - this.fadeStartTime) / 1000;
      const fadeDuration = 0.3;
      const t = Math.min(elapsed / fadeDuration, 1.0);
      const alpha = 1.0 - t;

      let allDone = true;
      this.planetMeshes.forEach((data, id) => {
        const mat = data.trajectoryLine.material as THREE.LineBasicMaterial;
        mat.opacity = alpha;
        if (alpha > 0.001) allDone = false;
      });

      if (allDone) {
        this.fadeActive = false;
        this.engine.clearTrajectories();
        this.planetMeshes.forEach(data => {
          (data.trajectoryLine.material as THREE.LineBasicMaterial).opacity = 1.0;
          data.trajectoryGeometry.setDrawRange(0, 0);
        });
      }
      return;
    }

    for (const planet of this.engine.planets) {
      const meshData = this.planetMeshes.get(planet.id);
      if (!meshData) continue;

      const trajectory = planet.trajectory;
      const count = Math.min(trajectory.length, 200);
      const startIdx = trajectory.length - count;

      for (let i = 0; i < count; i++) {
        const point = trajectory[startIdx + i];
        meshData.trajectoryPositions[i * 3] = point.x;
        meshData.trajectoryPositions[i * 3 + 1] = point.y;
        meshData.trajectoryPositions[i * 3 + 2] = point.z;

        const alphaT = i / Math.max(count - 1, 1);
        const alpha = 0.2 + 0.6 * alphaT;
        const rgb = this.hexToRgb(planet.color);
        meshData.trajectoryColors[i * 3] = rgb.r * alpha;
        meshData.trajectoryColors[i * 3 + 1] = rgb.g * alpha;
        meshData.trajectoryColors[i * 3 + 2] = rgb.b * alpha;
      }

      meshData.trajectoryGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(meshData.trajectoryPositions, 3)
      );
      meshData.trajectoryGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(meshData.trajectoryColors, 3)
      );
      meshData.trajectoryGeometry.setDrawRange(0, count);
      meshData.trajectoryGeometry.attributes.position.needsUpdate = true;
      meshData.trajectoryGeometry.attributes.color.needsUpdate = true;
    }
  }

  private updateParticles(): void {
    const activeParticleIds = new Set<number>();
    for (const particle of this.engine.particles) {
      activeParticleIds.add(particle.id);
      let meshData = this.particleMeshes.get(particle.id);
      if (!meshData) {
        meshData = this.createParticleMesh(particle);
      }
      meshData.mesh.position.set(particle.position.x, particle.position.y, particle.position.z);
      const mat = meshData.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = particle.life / particle.maxLife;
      const scale = 0.5 + 0.5 * mat.opacity;
      meshData.mesh.scale.setScalar(scale);
    }
    for (const [id] of this.particleMeshes) {
      if (!activeParticleIds.has(id)) {
        this.removeParticleMesh(id);
      }
    }
  }

  private handleMergeEvents(): void {
    const events = this.engine.consumeMergeEvents();
    for (const event of events) {
      this.removePlanetMesh(event.planetAId);
      this.removePlanetMesh(event.planetBId);
    }
  }

  private updateInfoPanel(): void {
    const selected = this.engine.getSelectedPlanet();
    if (selected) {
      this.infoPanel.classList.remove('empty');
      this.infoName.textContent = selected.name;
      this.infoMass.textContent = selected.mass.toFixed(3);
      const speed = Math.sqrt(
        selected.velocity.x ** 2 +
        selected.velocity.y ** 2 +
        selected.velocity.z ** 2
      );
      this.infoSpeed.textContent = speed.toFixed(3);
      this.infoRadius.textContent = selected.orbitalRadius.toFixed(3);
      this.infoPeriod.textContent = selected.orbitalPeriod === Infinity
        ? '∞'
        : selected.orbitalPeriod.toFixed(2);
    } else {
      this.infoPanel.classList.add('empty');
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
