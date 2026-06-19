import * as THREE from 'three';
import type { StarData, PlanetData, NebulaData } from '../data/CelestialData';

export interface PlanetMesh extends THREE.Mesh {
  userData: {
    planetData: PlanetData;
    angle: number;
    orbitRadius: number;
    orbitSpeed: number;
    orbitTilt: number;
    isHovered: boolean;
  };
}

interface RenderEngineOptions {
  canvas: HTMLCanvasElement;
}

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stars: THREE.Points | null = null;
  private planets: PlanetMesh[] = [];
  private nebulae: THREE.Points[] = [];
  private animationId: number = 0;
  private clock: THREE.Clock;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 150;
  private targetDistance: number = 150;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 3;
  private minDistance: number = 50;
  private maxDistance: number = 500;

  private timeScale: number = 1;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredPlanet: PlanetMesh | null = null;

  private initialTheta: number = 0;
  private initialPhi: number = Math.PI / 3;
  private initialDistance: number = 150;
  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 1000;
  private resetStartTheta: number = 0;
  private resetStartPhi: number = 0;
  private resetStartDistance: number = 0;

  private onPlanetClick: (planet: PlanetData) => void = () => {};
  private onPlanetHover: (planet: PlanetData | null) => void = () => {};
  private onCameraUpdate: () => void = () => {};

  constructor(options: RenderEngineOptions) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000010, 1);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupEventListeners(options.canvas);
    this.updateCameraPosition();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 500);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);
  }

  private setupEventListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging && !this.isResetting) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.targetTheta -= deltaX * 0.005;
      this.targetPhi -= deltaY * 0.005;

      this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.checkHover();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    if (this.isResetting) return;
    
    const zoomSpeed = 0.1;
    this.targetDistance += event.deltaY * zoomSpeed;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  private onClick(): void {
    if (this.hoveredPlanet) {
      this.onPlanetClick(this.hoveredPlanet.userData.planetData);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'r') {
      this.resetView();
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planets);

    if (intersects.length > 0) {
      const planet = intersects[0].object as PlanetMesh;
      if (this.hoveredPlanet !== planet) {
        if (this.hoveredPlanet) {
          this.setPlanetHighlight(this.hoveredPlanet, false);
        }
        this.hoveredPlanet = planet;
        this.setPlanetHighlight(planet, true);
        this.onPlanetHover(planet.userData.planetData);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredPlanet) {
        this.setPlanetHighlight(this.hoveredPlanet, false);
        this.hoveredPlanet = null;
        this.onPlanetHover(null);
        document.body.style.cursor = 'default';
      }
    }
  }

  private setPlanetHighlight(planet: PlanetMesh, highlighted: boolean): void {
    planet.userData.isHovered = highlighted;
    const material = planet.material as THREE.MeshPhongMaterial;
    if (material.emissive) {
      if (highlighted) {
        material.emissive.setHex(0x444444);
        material.emissiveIntensity = 0.5;
      } else {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      }
    }
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  resetView(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartTheta = this.targetTheta;
    this.resetStartPhi = this.targetPhi;
    this.resetStartDistance = this.targetDistance;
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  getCameraInfo() {
    return {
      theta: this.cameraTheta,
      phi: this.cameraPhi,
      distance: this.cameraDistance
    };
  }

  getPlanets(): PlanetMesh[] {
    return this.planets;
  }

  setOnPlanetClick(callback: (planet: PlanetData) => void): void {
    this.onPlanetClick = callback;
  }

  setOnPlanetHover(callback: (planet: PlanetData | null) => void): void {
    this.onPlanetHover = callback;
  }

  setOnCameraUpdate(callback: () => void): void {
    this.onCameraUpdate = callback;
  }

  createStars(starData: StarData[]): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starData.length * 3);
    const colors = new Float32Array(starData.length * 3);
    const sizes = new Float32Array(starData.length);
    const phases = new Float32Array(starData.length);

    starData.forEach((star, i) => {
      positions[i * 3] = star.x;
      positions[i * 3 + 1] = star.y;
      positions[i * 3 + 2] = star.z;

      const color = new THREE.Color(star.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = star.size;
      phases[i] = Math.random() * Math.PI * 2;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;

        void main() {
          vColor = color;
          vAlpha = 0.6 + 0.4 * sin(time * 2.0 + phase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  createPlanets(planetData: PlanetData[]): void {
    planetData.forEach((data) => {
      const geometry = new THREE.SphereGeometry(data.size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: data.color,
        shininess: 30,
        emissive: 0x000000,
        emissiveIntensity: 0
      });

      const planet = new THREE.Mesh(geometry, material) as unknown as PlanetMesh;
      planet.userData = {
        planetData: data,
        angle: Math.random() * Math.PI * 2,
        orbitRadius: data.orbitRadius,
        orbitSpeed: data.orbitSpeed,
        orbitTilt: data.orbitTilt,
        isHovered: false
      };

      planet.position.set(
        data.orbitRadius,
        0,
        0
      );

      this.planets.push(planet);
      this.scene.add(planet);
    });
  }

  createNebulae(nebulaData: NebulaData[]): void {
    nebulaData.forEach((nebula) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(nebula.particleCount * 3);
      const colors = new Float32Array(nebula.particleCount * 3);

      const baseColor = new THREE.Color(nebula.color);

      for (let i = 0; i < nebula.particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = nebula.radius * (0.5 + Math.random() * 0.5);

        positions[i * 3] = nebula.x + radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = nebula.y + radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = nebula.z + radius * Math.cos(phi);

        const colorVariation = 0.3 + Math.random() * 0.7;
        colors[i * 3] = baseColor.r * colorVariation;
        colors[i * 3 + 1] = baseColor.g * colorVariation;
        colors[i * 3 + 2] = baseColor.b * colorVariation;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const nebulaMesh = new THREE.Points(geometry, material);
      nebulaMesh.userData = {
        rotationSpeed: 0.0002 + Math.random() * 0.0003
      };
      this.nebulae.push(nebulaMesh);
      this.scene.add(nebulaMesh);
    });
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.isResetting) {
      const elapsed = performance.now() - this.resetStartTime;
      if (elapsed >= this.resetDuration) {
        this.isResetting = false;
        this.targetTheta = this.initialTheta;
        this.targetPhi = this.initialPhi;
        this.targetDistance = this.initialDistance;
      } else {
        const t = this.easeOutCubic(elapsed / this.resetDuration);
        this.targetTheta = this.resetStartTheta + (this.initialTheta - this.resetStartTheta) * t;
        this.targetPhi = this.resetStartPhi + (this.initialPhi - this.resetStartPhi) * t;
        this.targetDistance = this.resetStartDistance + (this.initialDistance - this.resetStartDistance) * t;
      }
    }

    const damping = 0.08;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * damping;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * damping;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * damping;

    this.updateCameraPosition();
    this.onCameraUpdate();

    this.planets.forEach((planet) => {
      const data = planet.userData;
      data.angle += data.orbitSpeed * this.timeScale * delta * 60;

      const x = data.orbitRadius * Math.cos(data.angle);
      const z = data.orbitRadius * Math.sin(data.angle);
      const y = Math.sin(data.angle) * data.orbitTilt * data.orbitRadius;

      planet.position.set(x, y, z);
      planet.rotation.y += 0.01 * this.timeScale;
    });

    this.nebulae.forEach((nebula) => {
      nebula.rotation.y += nebula.userData.rotationSpeed;
    });

    if (this.stars && this.stars.material instanceof THREE.ShaderMaterial) {
      this.stars.material.uniforms.time.value = time;
    }

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    this.animate();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
  }
}
