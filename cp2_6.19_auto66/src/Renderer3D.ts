import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationEngine, PlanetData, ParticleData } from './SimulationEngine';

interface PlanetMeshGroup {
  id: string;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  selectionRing: THREE.Mesh;
  trail: THREE.Line;
  trailGeometry: THREE.BufferGeometry;
  trailMaterial: THREE.LineBasicMaterial;
  trailFading: boolean;
  trailFadeStartTime: number;
}

interface ParticleMesh {
  id: string;
  mesh: THREE.Mesh;
}

export class Renderer3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private engine: SimulationEngine;
  private clock: THREE.Clock;

  private starMesh!: THREE.Mesh;
  private starGlow!: THREE.Mesh;
  private starPulseTime: number = 0;

  private planetMeshes: Map<string, PlanetMeshGroup> = new Map();
  private particleMeshes: Map<string, ParticleMesh> = new Map();

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private onPlanetClickCallback: ((id: string) => void) | null = null;

  constructor(containerId: string, engine: SimulationEngine) {
    this.container = document.getElementById(containerId) || document.body;
    this.engine = engine;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 25, 45);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    this.setupLights();
    this.createStar();
    this.createInitialPlanets();
    this.setupEventListeners();
  }

  private setupBackground(): void {
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

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(starField);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 500);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);
  }

  private createStar(): void {
    const star = this.engine.getStar();

    const starGeometry = new THREE.SphereGeometry(star.radius, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: star.color,
      transparent: true,
      opacity: 1
    });
    this.starMesh = new THREE.Mesh(starGeometry, starMaterial);
    this.scene.add(this.starMesh);

    const glowGeometry = new THREE.SphereGeometry(star.radius * 1.5, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: star.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    this.starGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(this.starGlow);
  }

  private createInitialPlanets(): void {
    const planets = this.engine.getPlanets();
    for (const planet of planets) {
      this.createPlanetMesh(planet);
    }
  }

  private createPlanetMesh(planet: PlanetData): void {
    const geometry = new THREE.SphereGeometry(planet.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: planet.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: planet.color,
      emissiveIntensity: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { planetId: planet.id };
    mesh.position.copy(planet.position);
    this.scene.add(mesh);

    const glowGeometry = new THREE.SphereGeometry(planet.radius * 1.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: planet.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    const ringGeometry = new THREE.RingGeometry(
      planet.radius * 1.5,
      planet.radius * 1.8,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: planet.color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    selectionRing.rotation.x = -Math.PI / 2;
    mesh.add(selectionRing);

    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: planet.color,
      transparent: true,
      opacity: 0.8,
      linewidth: 1.5
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    this.scene.add(trail);

    this.planetMeshes.set(planet.id, {
      id: planet.id,
      mesh,
      glow,
      selectionRing,
      trail,
      trailGeometry,
      trailMaterial,
      trailFading: false,
      trailFadeStartTime: 0
    });
  }

  private removePlanetMesh(id: string): void {
    const group = this.planetMeshes.get(id);
    if (group) {
      this.scene.remove(group.mesh);
      this.scene.remove(group.trail);
      group.mesh.geometry.dispose();
      (group.mesh.material as THREE.Material).dispose();
      group.glow.geometry.dispose();
      (group.glow.material as THREE.Material).dispose();
      group.selectionRing.geometry.dispose();
      (group.selectionRing.material as THREE.Material).dispose();
      group.trailGeometry.dispose();
      group.trailMaterial.dispose();
      this.planetMeshes.delete(id);
    }
  }

  private createParticleMesh(particle: ParticleData): void {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: particle.color,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(particle.position);
    this.scene.add(mesh);
    this.particleMeshes.set(particle.id, { id: particle.id, mesh });
  }

  private removeParticleMesh(id: string): void {
    const particle = this.particleMeshes.get(id);
    if (particle) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
      this.particleMeshes.delete(id);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Mesh[] = [];
    for (const group of this.planetMeshes.values()) {
      meshes.push(group.mesh);
    }

    const intersects = this.raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const planetId = intersects[0].object.userData.planetId;
      if (planetId && this.onPlanetClickCallback) {
        this.onPlanetClickCallback(planetId);
      }
    }
  }

  public onPlanetClick(callback: (id: string) => void): void {
    this.onPlanetClickCallback = callback;
  }

  public animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    this.engine.update(deltaTime);

    this.updateStar();
    this.updatePlanets();
    this.updateParticles();
    this.updateInfoPanel();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private updateStar(): void {
    this.starPulseTime += 0.016;
    const pulseScale = 1 + 0.05 * Math.sin(this.starPulseTime * Math.PI);
    this.starGlow.scale.setScalar(pulseScale);
    const opacity = 0.2 + 0.1 * Math.sin(this.starPulseTime * Math.PI);
    (this.starGlow.material as THREE.MeshBasicMaterial).opacity = opacity;
  }

  private updatePlanets(): void {
    const currentPlanetIds = new Set<string>();
    const planets = this.engine.getPlanets();

    for (const planet of planets) {
      currentPlanetIds.add(planet.id);
      let group = this.planetMeshes.get(planet.id);

      if (!group) {
        this.createPlanetMesh(planet);
        group = this.planetMeshes.get(planet.id)!;
      }

      group.mesh.position.copy(planet.position);

      if (planet.selected) {
        (group.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.6;
        group.selectionRing.rotation.z += 0.02;
      } else {
        (group.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      this.updateTrail(group, planet);
    }

    for (const id of Array.from(this.planetMeshes.keys())) {
      if (!currentPlanetIds.has(id)) {
        this.removePlanetMesh(id);
      }
    }
  }

  private updateTrail(group: PlanetMeshGroup, planet: PlanetData): void {
    if (group.trailFading) {
      const elapsed = (performance.now() - group.trailFadeStartTime) / 1000;
      if (elapsed >= 0.3) {
        group.trailFading = false;
        planet.trail = [];
      } else {
        const opacity = 0.8 * (1 - elapsed / 0.3);
        group.trailMaterial.opacity = opacity;
      }
    } else {
      group.trailMaterial.opacity = 0.8;
    }

    const positions = new Float32Array(planet.trail.length * 3);
    const colors = new Float32Array(planet.trail.length * 3);

    for (let i = 0; i < planet.trail.length; i++) {
      const point = planet.trail[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const color = new THREE.Color(planet.color);
      const alpha = i / Math.max(planet.trail.length - 1, 1);
      colors[i * 3] = color.r * (0.2 + 0.6 * alpha);
      colors[i * 3 + 1] = color.g * (0.2 + 0.6 * alpha);
      colors[i * 3 + 2] = color.b * (0.2 + 0.6 * alpha);
    }

    group.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    group.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    group.trailGeometry.attributes.position.needsUpdate = true;
    if (group.trailGeometry.attributes.color) {
      group.trailGeometry.attributes.color.needsUpdate = true;
    }
    group.trailMaterial.vertexColors = planet.trail.length > 0;
    group.trailGeometry.computeBoundingSphere();
  }

  private updateParticles(): void {
    const currentParticleIds = new Set<string>();
    const particles = this.engine.getParticles();

    for (const particle of particles) {
      currentParticleIds.add(particle.id);
      let particleMesh = this.particleMeshes.get(particle.id);

      if (!particleMesh) {
        this.createParticleMesh(particle);
        particleMesh = this.particleMeshes.get(particle.id)!;
      }

      particleMesh.mesh.position.copy(particle.position);
      (particleMesh.mesh.material as THREE.MeshBasicMaterial).opacity =
        particle.life / particle.maxLife;
    }

    for (const id of Array.from(this.particleMeshes.keys())) {
      if (!currentParticleIds.has(id)) {
        this.removeParticleMesh(id);
      }
    }
  }

  private updateInfoPanel(): void {
    const selected = this.engine.getSelectedPlanet();
    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) return;

    if (selected) {
      infoPanel.classList.remove('hidden');
      const nameEl = document.getElementById('info-name');
      const massEl = document.getElementById('info-mass');
      const velocityEl = document.getElementById('info-velocity');
      const radiusEl = document.getElementById('info-radius');
      const periodEl = document.getElementById('info-period');

      if (nameEl) nameEl.textContent = selected.name;
      if (massEl) massEl.textContent = selected.mass.toFixed(3);
      if (velocityEl) velocityEl.textContent = selected.velocity.length().toFixed(3);
      if (radiusEl) radiusEl.textContent = selected.orbitalRadius.toFixed(3);
      if (periodEl) periodEl.textContent = selected.orbitalPeriod.toFixed(3) + ' s';
    } else {
      infoPanel.classList.add('hidden');
    }
  }

  public startFadeAllTrails(): void {
    for (const group of this.planetMeshes.values()) {
      group.trailFading = true;
      group.trailFadeStartTime = performance.now();
    }
    setTimeout(() => {
      this.engine.clearAllTrails();
    }, 300);
  }
}
