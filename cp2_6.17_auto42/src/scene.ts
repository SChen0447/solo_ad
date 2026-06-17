import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Star {
  id: string;
  position: { x: number; y: number; z: number };
  brightness: number;
  color: { r: number; g: number; b: number };
  spectralType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  size: number;
}

export interface StarGenerationParams {
  count: number;
  distribution: 'sphere' | 'disk';
  seed: number;
}

export interface ConstellationLine {
  id: string;
  startStarId: string;
  endStarId: string;
}

export interface PlanetOrbit {
  id: string;
  centerStarId: string;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  speed: number;
  planetRadius: number;
  planetColor: string;
}

interface PlanetData {
  orbit: PlanetOrbit;
  mesh: THREE.Mesh;
  line: THREE.Line;
  trail: THREE.Points;
  trailPositions: THREE.Vector3[];
  trailAlphas: Float32Array;
  angle: number;
  centerStar: THREE.Vector3;
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
}

const spectralColors: Record<string, { r: number; g: number; b: number }> = {
  O: { r: 155, g: 176, b: 255 }, B: { r: 170, g: 191, b: 255 },
  A: { r: 213, g: 224, b: 255 }, F: { r: 255, g: 248, b: 220 },
  G: { r: 255, g: 230, b: 150 }, K: { r: 255, g: 180, b: 80 },
  M: { r: 255, g: 100, b: 50 },
};

const spectralTypes: Array<'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'> = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const spectralWeights = [0.00003, 0.13, 0.6, 3, 7, 12, 76];

function generateSpectralType(random: SeededRandom): 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' {
  const totalWeight = spectralWeights.reduce((a, b) => a + b, 0);
  let rand = random.next() * totalWeight;
  for (let i = 0; i < spectralTypes.length; i++) {
    rand -= spectralWeights[i];
    if (rand <= 0) return spectralTypes[i];
  }
  return 'M';
}

function poissonDiskSampling3D(
  count: number, radius: number, minDistance: number,
  random: SeededRandom, distribution: 'sphere' | 'disk'
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const maxAttempts = 30;

  function getRandomPoint(): { x: number; y: number; z: number } {
    if (distribution === 'sphere') {
      const theta = random.range(0, Math.PI * 2);
      const phi = Math.acos(random.range(-1, 1));
      const r = Math.cbrt(random.next()) * radius;
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      };
    } else {
      const theta = random.range(0, Math.PI * 2);
      const r = Math.sqrt(random.next()) * radius;
      const y = random.range(-radius * 0.15, radius * 0.15);
      return { x: r * Math.cos(theta), y, z: r * Math.sin(theta) };
    }
  }

  function isFarEnough(point: { x: number; y: number; z: number }): boolean {
    for (const existing of points) {
      const dx = point.x - existing.x, dy = point.y - existing.y, dz = point.z - existing.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < minDistance) return false;
    }
    return true;
  }

  while (points.length < count) {
    for (let attempt = 0; attempt < maxAttempts && points.length < count; attempt++) {
      const point = getRandomPoint();
      if (isFarEnough(point)) points.push(point);
    }
  }
  return points;
}

export async function generateStars(params: StarGenerationParams): Promise<Star[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const { count, distribution, seed } = params;
  const random = new SeededRandom(seed);
  const radius = 100;
  const minDistance = distribution === 'sphere' ? 8 : 6;
  const positions = poissonDiskSampling3D(count, radius, minDistance, random, distribution);

  return positions.map((pos, index) => {
    const spectralType = generateSpectralType(random);
    const color = spectralColors[spectralType];
    const brightness = random.range(0.3, 1.0);
    const size = random.range(0.8, 2.5) * brightness;
    return {
      id: `star-${index}-${Date.now()}`,
      position: pos,
      brightness,
      color: { r: color.r / 255, g: color.g / 255, b: color.b / 255 },
      spectralType,
      size,
    };
  });
}

export class StarScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private stars: Star[] = [];
  private starPoints: THREE.Points | null = null;
  private starGeometry: THREE.BufferGeometry | null = null;
  private starMaterial: THREE.PointsMaterial | null = null;

  private selectedStarId: string | null = null;
  private selectedStarIndex: number = -1;
  private hoveredStarId: string | null = null;
  private selectedStarMesh: THREE.Mesh | null = null;
  private hoverIndicator: THREE.LineSegments | null = null;

  private constellationLines: Map<string, THREE.Line> = new Map();
  private previewLine: THREE.Line | null = null;
  private connectionStartId: string | null = null;

  private planets: Map<string, PlanetData> = new Map();

  private flickerPeriods: Float32Array = new Float32Array(0);
  private flickerPhases: Float32Array = new Float32Array(0);
  private baseColors: Float32Array = new Float32Array(0);
  private flickerTime: number = 0;

  private onStarClickCallback: ((starId: string) => void) | null = null;
  private onStarHoverCallback: ((starId: string | null) => void) | null = null;
  private onLineRightClickCallback: ((lineId: string) => void) | null = null;

  private animationFrameId: number | null = null;
  private isAnimating = false;

  private defaultCameraPos = new THREE.Vector3(0, 50, 150);
  private defaultTarget = new THREE.Vector3(0, 0, 0);
  private isTransitioning = false;
  private transitionStart = 0;
  private transitionDuration = 1500;
  private transitionStartPos = new THREE.Vector3();
  private transitionEndPos = new THREE.Vector3();
  private transitionStartTarget = new THREE.Vector3();
  private transitionEndTarget = new THREE.Vector3();
  private transitionStartFov = 60;
  private transitionEndFov = 60;

  private lastTime = 0;
  private selectedPulseTime = 0;
  private selectedPulsePeriod = 800;

  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();

    this.init();
  }

  private init(): void {
    this.scene.background = new THREE.Color(0x0a0a20);
    this.scene.fog = new THREE.FogExp2(0x0a0a20, 0.002);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultTarget);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 500;

    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 500);
    pointLight.position.set(50, 50, 50);
    this.scene.add(pointLight);

    this.createNebulaBackground();

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('contextmenu', this.handleRightClick);

    this.startAnimation();
  }

  private createNebulaBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
    gradient.addColorStop(0, 'rgba(30, 20, 80, 0.3)');
    gradient.addColorStop(0.3, 'rgba(20, 10, 50, 0.2)');
    gradient.addColorStop(0.7, 'rgba(10, 5, 30, 0.1)');
    gradient.addColorStop(1, 'rgba(5, 5, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.SphereGeometry(800, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
    });
    const nebula = new THREE.Mesh(geometry, material);
    this.scene.add(nebula);
  }

  private createDashedCircleGeometry(radius: number, dashSize: number, gapSize: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const circumference = 2 * Math.PI * radius;
    const segments = Math.ceil(circumference / (dashSize + gapSize));
    
    for (let i = 0; i < segments; i++) {
      const startAngle = (i / segments) * Math.PI * 2;
      const endAngle = ((i + 0.5) / segments) * Math.PI * 2;
      
      const start = new THREE.Vector3(
        Math.cos(startAngle) * radius,
        Math.sin(startAngle) * radius,
        0
      );
      const end = new THREE.Vector3(
        Math.cos(endAngle) * radius,
        Math.sin(endAngle) * radius,
        0
      );
      
      points.push(start, end);
    }
    
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  setStars(stars: Star[]): void {
    this.stars = stars;
    this.selectedStarIndex = -1;

    if (this.starPoints) {
      this.scene.remove(this.starPoints);
      this.starGeometry?.dispose();
      this.starMaterial?.dispose();
    }

    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    this.flickerPeriods = new Float32Array(count);
    this.flickerPhases = new Float32Array(count);
    this.baseColors = new Float32Array(count * 3);

    stars.forEach((star, i) => {
      positions[i * 3] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;

      const br = star.brightness;
      const r = star.color.r * br;
      const g = star.color.g * br;
      const b = star.color.b * br;

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      this.baseColors[i * 3] = r;
      this.baseColors[i * 3 + 1] = g;
      this.baseColors[i * 3 + 2] = b;

      sizes[i] = star.size;

      this.flickerPeriods[i] = 1 + Math.random() * 2;
      this.flickerPhases[i] = Math.random() * Math.PI * 2;
    });

    this.starGeometry = new THREE.BufferGeometry();
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.starMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.starPoints = new THREE.Points(this.starGeometry, this.starMaterial);
    this.starPoints.frustumCulled = true;
    this.scene.add(this.starPoints);
  }

  private getStarPosition(starId: string): THREE.Vector3 | null {
    const star = this.stars.find(s => s.id === starId);
    if (!star) return null;
    return new THREE.Vector3(star.position.x, star.position.y, star.position.z);
  }

  addConstellationLine(line: ConstellationLine): void {
    const startPos = this.getStarPosition(line.startStarId);
    const endPos = this.getStarPosition(line.endStarId);
    if (!startPos || !endPos) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
    const material = new THREE.LineBasicMaterial({
      color: 0x80DEEA,
      transparent: true,
      opacity: 0.8,
      linewidth: 1.5,
    });

    const lineMesh = new THREE.Line(geometry, material);
    lineMesh.userData.lineId = line.id;
    this.scene.add(lineMesh);
    this.constellationLines.set(line.id, lineMesh);
  }

  removeConstellationLine(lineId: string): void {
    const line = this.constellationLines.get(lineId);
    if (line) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      this.constellationLines.delete(lineId);
    }
  }

  addPlanetOrbit(orbit: PlanetOrbit): void {
    const centerPos = this.getStarPosition(orbit.centerStarId);
    if (!centerPos) return;

    const orbitPoints: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = orbit.semiMajorAxis * (1 - orbit.eccentricity * orbit.eccentricity) / (1 + orbit.eccentricity * Math.cos(angle));
      const x = centerPos.x + r * Math.cos(angle) * Math.cos(orbit.inclination);
      const y = centerPos.y + r * Math.sin(angle) * Math.sin(orbit.inclination);
      const z = centerPos.z + r * Math.sin(angle);
      orbitPoints.push(new THREE.Vector3(x, y, z));
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x4FC3F7,
      transparent: true,
      opacity: 0.5,
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    this.scene.add(orbitLine);

    const planetGeometry = new THREE.SphereGeometry(orbit.planetRadius, 16, 16);
    const planetMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(orbit.planetColor),
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    this.scene.add(planet);

    const trailPositions: THREE.Vector3[] = [];
    const trailGeometry = new THREE.BufferGeometry();
    const trailColors = new Float32Array(10 * 3);
    const trailSizes = new Float32Array(10);
    const trailAlphas = new Float32Array(10);
    const color = new THREE.Color(orbit.planetColor);

    for (let i = 0; i < 10; i++) {
      trailPositions.push(new THREE.Vector3());
      const alpha = 0.1 + (i / 10) * 0.7;
      trailAlphas[i] = alpha;
      trailColors[i * 3] = color.r * alpha;
      trailColors[i * 3 + 1] = color.g * alpha;
      trailColors[i * 3 + 2] = color.b * alpha;
      trailSizes[i] = orbit.planetRadius * 0.3 * (0.3 + (i / 10) * 0.7);
    }

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    this.scene.add(trail);

    this.planets.set(orbit.id, {
      orbit,
      mesh: planet,
      line: orbitLine,
      trail,
      trailPositions,
      trailAlphas,
      angle: Math.random() * Math.PI * 2,
      centerStar: centerPos.clone(),
    });
  }

  removePlanetOrbit(orbitId: string): void {
    const planet = this.planets.get(orbitId);
    if (planet) {
      this.scene.remove(planet.mesh);
      this.scene.remove(planet.line);
      this.scene.remove(planet.trail);
      planet.mesh.geometry.dispose();
      (planet.mesh.material as THREE.Material).dispose();
      planet.line.geometry.dispose();
      (planet.line.material as THREE.Material).dispose();
      planet.trail.geometry.dispose();
      (planet.trail.material as THREE.Material).dispose();
      this.planets.delete(orbitId);
    }
  }

  setSelectedStar(starId: string | null): void {
    if (this.selectedStarMesh) {
      this.scene.remove(this.selectedStarMesh);
      this.selectedStarMesh.geometry.dispose();
      (this.selectedStarMesh.material as THREE.Material).dispose();
      this.selectedStarMesh = null;
    }

    this.selectedStarId = starId;
    this.selectedPulseTime = 0;

    if (starId) {
      this.selectedStarIndex = this.stars.findIndex(s => s.id === starId);
      const pos = this.getStarPosition(starId);
      if (pos) {
        const geometry = new THREE.SphereGeometry(5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0xFFD54F,
          transparent: true,
          opacity: 0.4,
        });
        this.selectedStarMesh = new THREE.Mesh(geometry, material);
        this.selectedStarMesh.position.copy(pos);
        this.scene.add(this.selectedStarMesh);
      }
    } else {
      this.selectedStarIndex = -1;
    }
  }

  setHoveredStar(starId: string | null): void {
    if (this.hoverIndicator) {
      this.scene.remove(this.hoverIndicator);
      this.hoverIndicator.geometry.dispose();
      (this.hoverIndicator.material as THREE.Material).dispose();
      this.hoverIndicator = null;
    }

    this.hoveredStarId = starId;

    if (starId && starId !== this.connectionStartId) {
      const pos = this.getStarPosition(starId);
      if (pos) {
        const geometry = this.createDashedCircleGeometry(15, 4, 4);
        const material = new THREE.LineBasicMaterial({
          color: 0x4FC3F7,
          transparent: true,
          opacity: 0.6,
        });
        this.hoverIndicator = new THREE.LineSegments(geometry, material);
        this.hoverIndicator.position.copy(pos);
        this.hoverIndicator.lookAt(this.camera.position);
        this.scene.add(this.hoverIndicator);
      }
    }
  }

  private updatePreviewLine(mouseWorldPos: THREE.Vector3): void {
    if (!this.connectionStartId) {
      if (this.previewLine) {
        this.scene.remove(this.previewLine);
        this.previewLine.geometry.dispose();
        (this.previewLine.material as THREE.Material).dispose();
        this.previewLine = null;
      }
      return;
    }

    const startPos = this.getStarPosition(this.connectionStartId);
    if (!startPos) return;

    if (this.previewLine) {
      const positions = new Float32Array([
        startPos.x, startPos.y, startPos.z,
        mouseWorldPos.x, mouseWorldPos.y, mouseWorldPos.z,
      ]);
      this.previewLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.previewLine.geometry.attributes.position.needsUpdate = true;
    } else {
      const geometry = new THREE.BufferGeometry().setFromPoints([startPos, mouseWorldPos]);
      const material = new THREE.LineBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 0.9,
      });
      this.previewLine = new THREE.Line(geometry, material);
      this.scene.add(this.previewLine);
    }
  }

  startConnection(starId: string): void {
    this.connectionStartId = starId;
  }

  completeConnection(endStarId: string): ConstellationLine | null {
    if (!this.connectionStartId || this.connectionStartId === endStarId) {
      this.cancelConnection();
      return null;
    }

    const line: ConstellationLine = {
      id: `line-${Date.now()}`,
      startStarId: this.connectionStartId,
      endStarId,
    };

    this.connectionStartId = null;
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }

    return line;
  }

  cancelConnection(): void {
    this.connectionStartId = null;
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
  }

  moveToGalacticTopView(): void {
    this.transitionStartPos.copy(this.camera.position);
    this.transitionEndPos.set(0, 200, 0.01);
    this.transitionStartTarget.copy(this.controls.target);
    this.transitionEndTarget.set(0, 0, 0);
    this.transitionStartFov = this.camera.fov;
    this.transitionEndFov = 30;
    this.startTransition();
  }

  resetToDefaultView(): void {
    this.transitionStartPos.copy(this.camera.position);
    this.transitionEndPos.copy(this.defaultCameraPos);
    this.transitionStartTarget.copy(this.controls.target);
    this.transitionEndTarget.copy(this.defaultTarget);
    this.transitionStartFov = this.camera.fov;
    this.transitionEndFov = 60;
    this.startTransition();
  }

  private startTransition(): void {
    this.isTransitioning = true;
    this.transitionStart = performance.now();
    this.controls.enabled = false;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  onStarClick(callback: (starId: string) => void): void {
    this.onStarClickCallback = callback;
  }

  onStarHover(callback: (starId: string | null) => void): void {
    this.onStarHoverCallback = callback;
  }

  onLineRightClick(callback: (lineId: string) => void): void {
    this.onLineRightClickCallback = callback;
  }

  private handleResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private getIntersectedStar(event: MouseEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.starPoints) {
      const intersects = this.raycaster.intersectObject(this.starPoints);
      if (intersects.length > 0) {
        const index = intersects[0].index;
        if (index !== undefined && this.stars[index]) {
          return this.stars[index].id;
        }
      }
    }

    return null;
  }

  private getIntersectedLine(event: MouseEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const lines = Array.from(this.constellationLines.values());
    const intersects = this.raycaster.intersectObjects(lines, false);
    if (intersects.length > 0) {
      return intersects[0].object.userData.lineId;
    }

    return null;
  }

  private handleClick = (event: MouseEvent): void => {
    if (event.button !== 0) return;

    const starId = this.getIntersectedStar(event);
    
    if (this.connectionStartId) {
      if (starId && starId !== this.connectionStartId) {
        const line = this.completeConnection(starId);
        if (line) {
          this.addConstellationLine(line);
        }
      } else {
        this.cancelConnection();
      }
    } else if (starId) {
      this.onStarClickCallback?.(starId);
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    const starId = this.getIntersectedStar(event);
    
    if (starId !== this.hoveredStarId) {
      this.setHoveredStar(starId);
      this.onStarHoverCallback?.(starId);
    }

    if (this.connectionStartId) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.y / dir.y;
      const mouseWorldPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

      this.updatePreviewLine(mouseWorldPos);
    }

    if (this.hoverIndicator) {
      this.hoverIndicator.lookAt(this.camera.position);
    }
  };

  private handleRightClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.connectionStartId) {
      this.cancelConnection();
      return;
    }

    const lineId = this.getIntersectedLine(event);
    if (lineId) {
      this.onLineRightClickCallback?.(lineId);
    }
  };

  private startAnimation(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  private updateFrustum(): void {
    this.camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.updateFrustum();

    if (this.isTransitioning) {
      const elapsed = now - this.transitionStart;
      if (elapsed >= this.transitionDuration) {
        this.camera.position.copy(this.transitionEndPos);
        this.controls.target.copy(this.transitionEndTarget);
        this.camera.fov = this.transitionEndFov;
        this.camera.updateProjectionMatrix();
        this.isTransitioning = false;
        this.controls.enabled = true;
      } else {
        const t = this.easeInOut(elapsed / this.transitionDuration);
        this.camera.position.lerpVectors(this.transitionStartPos, this.transitionEndPos, t);
        this.controls.target.lerpVectors(this.transitionStartTarget, this.transitionEndTarget, t);
        this.camera.fov = this.transitionStartFov + (this.transitionEndFov - this.transitionStartFov) * t;
        this.camera.updateProjectionMatrix();
      }
    }

    if (this.selectedStarMesh) {
      this.selectedPulseTime += delta * 1000;
      const pulsePhase = (this.selectedPulseTime % this.selectedPulsePeriod) / this.selectedPulsePeriod;
      const pulseRadius = 5 + (12 - 5) * (0.5 - 0.5 * Math.cos(pulsePhase * Math.PI * 2));
      this.selectedStarMesh.scale.setScalar(pulseRadius / 5);
      const material = this.selectedStarMesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + 0.3 * (0.5 - 0.5 * Math.cos(pulsePhase * Math.PI * 2));
    }

    if (this.starGeometry && this.stars.length > 0) {
      this.flickerTime += delta;
      const colorAttr = this.starGeometry.attributes.color;
      const colors = colorAttr.array as Float32Array;
      const count = this.stars.length;
      const time = this.flickerTime;

      for (let i = 0; i < count; i++) {
        if (i === this.selectedStarIndex) continue;

        const flicker = 1 + 0.15 * Math.sin(time / this.flickerPeriods[i] * Math.PI * 2 + this.flickerPhases[i]);
        const i3 = i * 3;
        colors[i3] = this.baseColors[i3] * flicker;
        colors[i3 + 1] = this.baseColors[i3 + 1] * flicker;
        colors[i3 + 2] = this.baseColors[i3 + 2] * flicker;
      }

      colorAttr.needsUpdate = true;
    }

    this.planets.forEach((planetData) => {
      planetData.angle += planetData.orbit.speed * delta;
      
      const r = planetData.orbit.semiMajorAxis * (1 - planetData.orbit.eccentricity * planetData.orbit.eccentricity) / 
                (1 + planetData.orbit.eccentricity * Math.cos(planetData.angle));
      const x = planetData.centerStar.x + r * Math.cos(planetData.angle) * Math.cos(planetData.orbit.inclination);
      const y = planetData.centerStar.y + r * Math.sin(planetData.angle) * Math.sin(planetData.orbit.inclination);
      const z = planetData.centerStar.z + r * Math.sin(planetData.angle);

      planetData.mesh.position.set(x, y, z);

      for (let i = 9; i > 0; i--) {
        planetData.trailPositions[i].copy(planetData.trailPositions[i - 1]);
      }
      planetData.trailPositions[0].set(x, y, z);

      const positions = planetData.trail.geometry.attributes.position.array as Float32Array;
      const colors = planetData.trail.geometry.attributes.color.array as Float32Array;
      const color = new THREE.Color(planetData.orbit.planetColor);
      
      for (let i = 0; i < 10; i++) {
        positions[i * 3] = planetData.trailPositions[i].x;
        positions[i * 3 + 1] = planetData.trailPositions[i].y;
        positions[i * 3 + 2] = planetData.trailPositions[i].z;
        
        const alpha = 0.1 + (i / 10) * 0.7;
        colors[i * 3] = color.r * alpha;
        colors[i * 3 + 1] = color.g * alpha;
        colors[i * 3 + 2] = color.b * alpha;
      }
      
      planetData.trail.geometry.attributes.position.needsUpdate = true;
      planetData.trail.geometry.attributes.color.needsUpdate = true;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  getStarById(starId: string): Star | undefined {
    return this.stars.find(s => s.id === starId);
  }

  projectToScreen(position: { x: number; y: number; z: number }): { x: number; y: number } {
    const vector = new THREE.Vector3(position.x, position.y, position.z);
    vector.project(this.camera);
    return {
      x: (vector.x + 1) / 2 * this.container.clientWidth,
      y: (-vector.y + 1) / 2 * this.container.clientHeight,
    };
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleRightClick);

    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
