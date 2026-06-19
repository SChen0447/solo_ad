import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PlanetData, CollisionEvent } from './SimulationEngine';

const MAX_TRAIL_POINTS = 200;
const PARTICLE_LIFETIME = 0.5;
const PARTICLE_MIN_SPEED = 0.5;
const PARTICLE_MAX_SPEED = 2.0;

interface PlanetMeshGroup {
  id: string;
  mesh: THREE.Mesh;
  selectionRing: THREE.Mesh;
  trail: THREE.Line;
  trailGeometry: THREE.BufferGeometry;
  trailMaterial: THREE.ShaderMaterial;
  trailPositions: Float32Array;
  color: string;
  colorRgb: THREE.Color;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Renderer3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private starMesh: THREE.Mesh | null = null;
  private starGlow: THREE.Mesh | null = null;
  private starGlowMaterial: THREE.ShaderMaterial | null = null;
  private starPulseTime: number = 0;
  private readonly STAR_PULSE_PERIOD = 2.0;
  private readonly STAR_PULSE_MIN = 1.0;
  private readonly STAR_PULSE_MAX = 1.1;

  private planetMeshes: Map<string, PlanetMeshGroup> = new Map();
  private particles: Particle[] = [];

  private selectedPlanetId: string | null = null;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private clickableMeshes: THREE.Mesh[] = [];

  private onPlanetClickCallbacks: ((planetId: string) => void)[] = [];
  private onSelectedPlanetDataCallbacks: ((planet: PlanetData | null) => void)[] = [];

  private trailFadeActive: boolean = false;
  private trailFadeTime: number = 0;
  private readonly TRAIL_FADE_DURATION = 0.3;

  private starField: THREE.Points | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 40, 60);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 300;

    this.setupLights();
    this.createStarField();
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
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffaa, 2.0, 500, 1);
    pointLight.position.set(0, 0, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 100;
    this.scene.add(pointLight);

    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.2);
    fillLight.position.set(50, 50, 50);
    this.scene.add(fillLight);
  }

  private createStarField(): void {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const colorShift = Math.random();
      colors[i * 3] = brightness * (colorShift > 0.7 ? 1 : 0.9);
      colors[i * 3 + 1] = brightness * (colorShift > 0.3 ? 1 : 0.85);
      colors[i * 3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private handleClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableMeshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      let foundId: string | null = null;

      for (const [id, group] of this.planetMeshes.entries()) {
        if (group.mesh === clickedMesh) {
          foundId = id;
          break;
        }
      }

      if (foundId === null) {
        if (this.starMesh === clickedMesh) {
          foundId = 'star';
        }
      }

      if (foundId) {
        this.onPlanetClickCallbacks.forEach((cb) => cb(foundId!));
      }
    }
  };

  onPlanetClick(callback: (planetId: string) => void): void {
    this.onPlanetClickCallbacks.push(callback);
  }

  onSelectedPlanetData(callback: (planet: PlanetData | null) => void): void {
    this.onSelectedPlanetDataCallbacks.push(callback);
  }

  private emitSelectedPlanetData(planet: PlanetData | null): void {
    this.onSelectedPlanetDataCallbacks.forEach((cb) => cb(planet));
  }

  setSelectedPlanet(planetId: string | null): void {
    const oldSelected = this.selectedPlanetId;
    this.selectedPlanetId = planetId;

    for (const [id, group] of this.planetMeshes.entries()) {
      if (group.selectionRing) {
        group.selectionRing.visible = id === planetId;
      }
    }

    if (oldSelected !== planetId) {
      if (planetId === null) {
        this.emitSelectedPlanetData(null);
      }
    }
  }

  createStar(starData: PlanetData): void {
    this.removeStar();

    const starGeometry = new THREE.SphereGeometry(starData.radius, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: starData.color,
    });
    this.starMesh = new THREE.Mesh(starGeometry, starMaterial);
    this.starMesh.position.set(starData.position.x, starData.position.y, starData.position.z);
    this.scene.add(this.starMesh);
    this.clickableMeshes.push(this.starMesh);

    this.starGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(starData.color) },
        pulseScale: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float pulseScale;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5));
          float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
          intensity = pow(intensity, 1.5) * pulseScale;
          gl_FragColor = vec4(glowColor, intensity * 0.6);
        }
      `,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    const glowGeometry = new THREE.PlaneGeometry(starData.radius * 7, starData.radius * 7);
    this.starGlow = new THREE.Mesh(glowGeometry, this.starGlowMaterial);
    this.starGlow.position.copy(this.starMesh.position);
    this.scene.add(this.starGlow);
  }

  private removeStar(): void {
    if (this.starMesh) {
      this.scene.remove(this.starMesh);
      this.starMesh.geometry.dispose();
      (this.starMesh.material as THREE.Material).dispose();
      const idx = this.clickableMeshes.indexOf(this.starMesh);
      if (idx !== -1) this.clickableMeshes.splice(idx, 1);
      this.starMesh = null;
    }
    if (this.starGlow) {
      this.scene.remove(this.starGlow);
      this.starGlow.geometry.dispose();
      (this.starGlow.material as THREE.Material).dispose();
      this.starGlow = null;
    }
    this.starGlowMaterial = null;
  }

  createPlanet(planetData: PlanetData): void {
    this.removePlanet(planetData.id);

    const geometry = new THREE.SphereGeometry(planetData.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: planetData.color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(planetData.color).multiplyScalar(0.1),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(planetData.position.x, planetData.position.y, planetData.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { planetId: planetData.id };
    this.scene.add(mesh);
    this.clickableMeshes.push(mesh);

    const ringGeometry = new THREE.RingGeometry(
      planetData.radius * 1.3,
      planetData.radius * 1.6,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: planetData.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.visible = false;
    mesh.add(selectionRing);

    const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const trailAlphas = new Float32Array(MAX_TRAIL_POINTS);

    for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
      const t = i / Math.max(1, MAX_TRAIL_POINTS - 1);
      trailAlphas[i] = 0.8 * (1 - t * 0.75);
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));
    trailGeometry.setDrawRange(0, 0);

    const planetColor = new THREE.Color(planetData.color);
    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: planetColor },
        fadeProgress: { value: 0.0 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        uniform float fadeProgress;
        void main() {
          vAlpha = alpha * (1.0 - fadeProgress);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(baseColor, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      linewidth: 1.5,
    });

    const trail = new THREE.Line(trailGeometry, trailMaterial);
    trail.frustumCulled = false;
    this.scene.add(trail);

    this.planetMeshes.set(planetData.id, {
      id: planetData.id,
      mesh,
      selectionRing,
      trail,
      trailGeometry,
      trailMaterial,
      trailPositions,
      color: planetData.color,
      colorRgb: planetColor,
    });
  }

  removePlanet(planetId: string): void {
    const group = this.planetMeshes.get(planetId);
    if (!group) return;

    this.scene.remove(group.mesh);
    group.mesh.geometry.dispose();
    (group.mesh.material as THREE.Material).dispose();

    const meshIdx = this.clickableMeshes.indexOf(group.mesh);
    if (meshIdx !== -1) this.clickableMeshes.splice(meshIdx, 1);

    this.scene.remove(group.trail);
    group.trailGeometry.dispose();
    group.trailMaterial.dispose();

    group.selectionRing.geometry.dispose();
    (group.selectionRing.material as THREE.Material).dispose();

    this.planetMeshes.delete(planetId);
  }

  updatePlanetVisuals(allPlanets: PlanetData[]): void {
    const currentIds = new Set(allPlanets.map((p) => p.id));
    const existingIds = new Set(this.planetMeshes.keys());

    const starData = allPlanets.find((p) => p.isStar);
    if (starData) {
      if (!this.starMesh) {
        this.createStar(starData);
      } else {
        this.starMesh.position.set(starData.position.x, starData.position.y, starData.position.z);
        if (this.starGlow) {
          this.starGlow.position.copy(this.starMesh.position);
        }
      }
    }

    for (const id of existingIds) {
      if (!currentIds.has(id) && id !== 'star') {
        this.removePlanet(id);
      }
    }

    allPlanets.forEach((planet) => {
      if (planet.isStar) return;

      let group = this.planetMeshes.get(planet.id);
      if (!group) {
        this.createPlanet(planet);
        group = this.planetMeshes.get(planet.id)!;
      }

      group.mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
      group.mesh.rotation.y += 0.01;

      if (group.selectionRing && group.selectionRing.visible) {
        const breathT = Date.now() * 0.001;
        const breathCycle = 0.5 + 0.5 * Math.sin(breathT * Math.PI * 2 / 1.8);
        group.selectionRing.rotation.z += 0.015 + 0.01 * breathCycle;
        const breathScale = 1.0 + 0.08 * breathCycle;
        group.selectionRing.scale.set(breathScale, breathScale, 1.0);
        (group.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.45 * breathCycle;
        const brightness = 0.5 + 0.5 * breathCycle;
        const ringColor = (group.selectionRing.material as THREE.MeshBasicMaterial).color;
        ringColor.copy(group.colorRgb).multiplyScalar(brightness);
      }

      this.updateTrail(group, planet.trail);
    });
  }

  private updateTrail(group: PlanetMeshGroup, trailPoints: { x: number; y: number; z: number }[]): void {
    const pointCount = trailPoints.length;
    if (pointCount === 0) {
      group.trailGeometry.setDrawRange(0, 0);
      return;
    }

    const positions = group.trailPositions;
    for (let i = 0; i < pointCount; i++) {
      positions[i * 3] = trailPoints[i].x;
      positions[i * 3 + 1] = trailPoints[i].y;
      positions[i * 3 + 2] = trailPoints[i].z;
    }

    group.trailGeometry.setDrawRange(0, pointCount);
    const posAttr = group.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    group.trailGeometry.computeBoundingSphere();
  }

  startTrailFade(): void {
    this.trailFadeActive = true;
    this.trailFadeTime = 0;
  }

  createCollisionParticles(event: CollisionEvent): void {
    const particleCount = 50;
    const totalMass = event.mass1 + event.mass2;
    const w1 = event.mass1 / totalMass;
    const w2 = event.mass2 / totalMass;

    const c1 = new THREE.Color(event.color1);
    const c2 = new THREE.Color(event.color2);
    const mixedColor = new THREE.Color(
      c1.r * w1 + c2.r * w2,
      c1.g * w1 + c2.g * w2,
      c1.b * w1 + c2.b * w2
    );

    for (let i = 0; i < particleCount; i++) {
      const size = 0.1 + Math.random() * 0.25;
      const geometry = new THREE.SphereGeometry(size, 8, 8);

      const particleColor = mixedColor.clone().offsetHSL(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.2
      );

      const material = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(event.position.x, event.position.y, event.position.z);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = PARTICLE_MIN_SPEED + Math.random() * (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED);
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
      });
    }
  }

  render(deltaTime: number, allPlanets: PlanetData[]): void {
    this.starPulseTime += deltaTime;
    const pulseT = (this.starPulseTime % this.STAR_PULSE_PERIOD) / this.STAR_PULSE_PERIOD;
    const pulse = this.STAR_PULSE_MIN + (this.STAR_PULSE_MAX - this.STAR_PULSE_MIN) * (0.5 + 0.5 * Math.sin(pulseT * Math.PI * 2));

    if (this.starGlowMaterial) {
      this.starGlowMaterial.uniforms.pulseScale.value = pulse;
    }
    if (this.starGlow) {
      this.starGlow.lookAt(this.camera.position);
    }

    if (this.starField) {
      this.starField.rotation.y += deltaTime * 0.005;
    }

    this.updatePlanetVisuals(allPlanets);

    if (this.trailFadeActive) {
      this.trailFadeTime += deltaTime;
      const progress = Math.min(1.0, this.trailFadeTime / this.TRAIL_FADE_DURATION);

      this.planetMeshes.forEach((group) => {
        group.trailMaterial.uniforms.fadeProgress.value = progress;
      });

      if (progress >= 1.0) {
        this.trailFadeActive = false;
        this.planetMeshes.forEach((group) => {
          group.trailMaterial.uniforms.fadeProgress.value = 0;
        });
      }
    }

    this.particles = this.particles.filter((particle) => {
      particle.life -= deltaTime;
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        return false;
      }

      particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
      particle.velocity.multiplyScalar(1 - deltaTime * 1.5);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = particle.life / particle.maxLife;
      return true;
    });

    if (this.selectedPlanetId) {
      const selected = allPlanets.find((p) => p.id === this.selectedPlanetId);
      if (selected) {
        this.emitSelectedPlanetData(selected);
      } else {
        this.setSelectedPlanet(null);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);

    this.removeStar();

    for (const id of Array.from(this.planetMeshes.keys())) {
      this.removePlanet(id);
    }

    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });

    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
    }

    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
