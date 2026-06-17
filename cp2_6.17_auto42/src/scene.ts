import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Star, ConstellationLine, PlanetOrbit } from './types';

interface PlanetData {
  orbit: PlanetOrbit;
  mesh: THREE.Mesh;
  line: THREE.Line;
  trail: THREE.Points;
  trailPositions: THREE.Vector3[];
  angle: number;
  centerStar: THREE.Vector3;
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
  private hoveredStarId: string | null = null;
  private selectedStarMesh: THREE.Mesh | null = null;
  private hoverIndicator: THREE.Mesh | null = null;

  private constellationLines: Map<string, THREE.Line> = new Map();
  private previewLine: THREE.Line | null = null;
  private connectionStartId: string | null = null;

  private planets: Map<string, PlanetData> = new Map();

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

  private pulseTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

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
    const geometry = new THREE.SphereGeometry(800, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
    });
    const nebula = new THREE.Mesh(geometry, material);
    this.scene.add(nebula);
  }

  setStars(stars: Star[]): void {
    this.stars = stars;

    if (this.starPoints) {
      this.scene.remove(this.starPoints);
      this.starGeometry?.dispose();
      this.starMaterial?.dispose();
    }

    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    const sizes = new Float32Array(stars.length);

    stars.forEach((star, i) => {
      positions[i * 3] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;

      colors[i * 3] = star.color.r * star.brightness;
      colors[i * 3 + 1] = star.color.g * star.brightness;
      colors[i * 3 + 2] = star.color.b * star.brightness;

      sizes[i] = star.size;
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
    const color = new THREE.Color(orbit.planetColor);

    for (let i = 0; i < 10; i++) {
      trailPositions.push(new THREE.Vector3());
      const alpha = i / 10;
      trailColors[i * 3] = color.r * alpha;
      trailColors[i * 3 + 1] = color.g * alpha;
      trailColors[i * 3 + 2] = color.b * alpha;
      trailSizes[i] = orbit.planetRadius * 0.5 * (i / 10);
    }

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
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

    if (starId) {
      const pos = this.getStarPosition(starId);
      if (pos) {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0xFFD54F,
          transparent: true,
          opacity: 0.3,
        });
        this.selectedStarMesh = new THREE.Mesh(geometry, material);
        this.selectedStarMesh.position.copy(pos);
        this.scene.add(this.selectedStarMesh);
      }
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
        const geometry = new THREE.RingGeometry(12, 15, 48);
        const material = new THREE.MeshBasicMaterial({
          color: 0x4FC3F7,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        this.hoverIndicator = new THREE.Mesh(geometry, material);
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

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - (this.pulseTime || now)) / 1000, 0.1);
    this.pulseTime = now;

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
        const t = this.easeInOutCubic(elapsed / this.transitionDuration);
        this.camera.position.lerpVectors(this.transitionStartPos, this.transitionEndPos, t);
        this.controls.target.lerpVectors(this.transitionStartTarget, this.transitionEndTarget, t);
        this.camera.fov = this.transitionStartFov + (this.transitionEndFov - this.transitionStartFov) * t;
        this.camera.updateProjectionMatrix();
      }
    }

    if (this.selectedStarMesh) {
      const pulseScale = 1 + Math.sin(now * 0.005) * 0.3;
      this.selectedStarMesh.scale.setScalar(pulseScale);
      const material = this.selectedStarMesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(now * 0.005) * 0.15;
    }

    this.planets.forEach((planetData) => {
      planetData.angle += planetData.orbit.speed * delta;
      
      const r = planetData.orbit.semiMajorAxis * (1 - planetData.orbit.eccentricity * planetData.orbit.eccentricity) / 
                (1 + planetData.orbit.eccentricity * Math.cos(planetData.angle));
      const x = planetData.centerStar.x + r * Math.cos(planetData.angle) * Math.cos(planetData.orbit.inclination);
      const y = planetData.centerStar.y + r * Math.sin(planetData.angle) * Math.sin(planetData.orbit.inclination);
      const z = planetData.centerStar.z + r * Math.sin(planetData.angle);

      planetData.mesh.position.set(x, y, z);

      planetData.trailPositions.pop();
      planetData.trailPositions.unshift(new THREE.Vector3(x, y, z));

      const positions = planetData.trail.geometry.attributes.position.array as Float32Array;
      planetData.trailPositions.forEach((pos, i) => {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      });
      planetData.trail.geometry.attributes.position.needsUpdate = true;
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
