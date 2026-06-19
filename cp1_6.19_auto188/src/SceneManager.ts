import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import crystalData from './CrystalData.json';

interface CrystalInfo {
  id: string;
  name: string;
  formula: string;
  hardness: number;
  formation: string;
  description: string;
  geometry: {
    type: string;
    radius?: number;
    height?: number;
    segments?: number;
    size?: number;
  };
  color: string;
  opacity: number;
  refraction: number;
  emissive: string;
}

interface CrystalObject {
  mesh: THREE.Mesh;
  data: CrystalInfo;
  pulseRing?: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalScale: THREE.Vector3;
  targetScale: number;
  targetY: number;
  isSelected: boolean;
  fadeInProgress: boolean;
  fadeOutProgress: boolean;
  fadeAlpha: number;
}

interface ClusterPreset {
  crystals: {
    crystalId: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    colorTint: string;
  }[];
}

const CLUSTER_PRESETS: ClusterPreset[] = [
  {
    crystals: [
      { crystalId: 'quartz', position: [0, 0.2, 0], rotation: [0, 0, 0], scale: 1.2, colorTint: '#9b87ff' },
      { crystalId: 'galena', position: [0.8, -0.3, 0.5], rotation: [0.3, 0.5, 0], scale: 0.9, colorTint: '#6b7fb8' },
      { crystalId: 'garnet', position: [-0.7, 0.1, -0.4], rotation: [0.2, -0.3, 0.1], scale: 0.8, colorTint: '#c77dff' },
      { crystalId: 'calcite', position: [0.3, -0.5, -0.7], rotation: [-0.2, 0.4, 0.1], scale: 0.7, colorTint: '#7dd3fc' },
    ],
  },
  {
    crystals: [
      { crystalId: 'fluorite', position: [0, 0, 0], rotation: [0.1, 0.2, 0], scale: 1.3, colorTint: '#a78bfa' },
      { crystalId: 'quartz', position: [-0.9, 0.3, 0.3], rotation: [0, -0.4, 0.2], scale: 1.0, colorTint: '#c4b5fd' },
      { crystalId: 'garnet', position: [0.7, -0.2, -0.6], rotation: [0.3, 0.3, -0.1], scale: 0.9, colorTint: '#e879f9' },
      { crystalId: 'calcite', position: [0.5, 0.4, 0.7], rotation: [-0.3, 0.1, 0.2], scale: 0.75, colorTint: '#67e8f9' },
      { crystalId: 'galena', position: [-0.5, -0.5, -0.3], rotation: [0.1, -0.2, 0.3], scale: 0.7, colorTint: '#818cf8' },
    ],
  },
  {
    crystals: [
      { crystalId: 'galena', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.1, colorTint: '#818cf8' },
      { crystalId: 'fluorite', position: [0.8, 0.4, 0.4], rotation: [0.2, 0.3, 0.1], scale: 0.85, colorTint: '#a78bfa' },
      { crystalId: 'quartz', position: [-0.6, -0.3, 0.6], rotation: [-0.1, 0.2, 0], scale: 0.95, colorTint: '#9b87ff' },
      { crystalId: 'garnet', position: [-0.3, 0.5, -0.5], rotation: [0.4, -0.2, 0.3], scale: 0.7, colorTint: '#c77dff' },
    ],
  },
  {
    crystals: [
      { crystalId: 'calcite', position: [0.2, 0.1, 0], rotation: [0.1, 0.3, 0], scale: 1.15, colorTint: '#7dd3fc' },
      { crystalId: 'quartz', position: [-0.8, -0.2, -0.3], rotation: [0, -0.3, 0.1], scale: 1.0, colorTint: '#a5b4fc' },
      { crystalId: 'fluorite', position: [0.7, -0.4, 0.5], rotation: [-0.2, 0.4, 0.2], scale: 0.9, colorTint: '#c4b5fd' },
      { crystalId: 'garnet', position: [-0.2, 0.4, -0.7], rotation: [0.3, 0.1, -0.2], scale: 0.75, colorTint: '#e879f9' },
      { crystalId: 'galena', position: [0.4, -0.6, -0.2], rotation: [0, -0.1, 0.3], scale: 0.65, colorTint: '#6b7fb8' },
    ],
  },
  {
    crystals: [
      { crystalId: 'garnet', position: [0, 0, 0], rotation: [0.2, 0.1, 0], scale: 1.1, colorTint: '#c77dff' },
      { crystalId: 'fluorite', position: [0.9, 0.2, -0.2], rotation: [0, 0.4, 0.1], scale: 0.95, colorTint: '#a78bfa' },
      { crystalId: 'calcite', position: [-0.7, -0.3, 0.4], rotation: [-0.3, -0.2, 0.3], scale: 0.85, colorTint: '#67e8f9' },
      { crystalId: 'quartz', position: [0.3, 0.5, 0.7], rotation: [0.1, -0.4, 0], scale: 0.8, colorTint: '#9b87ff' },
    ],
  },
];

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private crystals: CrystalObject[] = [];
  private stars: THREE.Points;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedCrystal: CrystalObject | null = null;
  private autoRotate: boolean = false;
  private autoRotateSpeed: number = 0.5;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngle: { theta: number; phi: number } = { theta: 0.5, phi: Math.PI / 4 };
  private cameraDistance: number = 5;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private initialCameraAngle: { theta: number; phi: number } = { theta: 0.5, phi: Math.PI / 4 };
  private initialCameraDistance: number = 5;
  private animationFrameId: number | null = null;
  private onCrystalSelect: ((crystalInfo: CrystalInfo | null) => void) | null = null;
  private currentPresetIndex: number = 0;
  private isTransitioning: boolean = false;
  private clock: THREE.Clock;

  constructor(container: HTMLElement, onCrystalSelect?: (crystalInfo: CrystalInfo | null) => void) {
    this.container = container;
    this.onCrystalSelect = onCrystalSelect || null;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.setupLights();
    this.createCrystalCluster(0);
    this.updateCameraPosition();
    this.setupEventListeners();
    this.animate();
  }

  private createStars(): THREE.Points {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = Math.random() * 2 + 0.5;

      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.9) {
        colors[i * 3] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.3;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    fillLight.position.set(-5, 2, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xaa88ff, 0.6);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x9b87ff, 0.8, 10);
    pointLight1.position.set(2, 2, 2);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x7dd3fc, 0.6, 10);
    pointLight2.position.set(-2, 1, -2);
    this.scene.add(pointLight2);
  }

  private createCrystalGeometry(crystalInfo: CrystalInfo): THREE.BufferGeometry {
    const { geometry } = crystalInfo;

    switch (geometry.type) {
      case 'hexagonalPrism': {
        const radius = geometry.radius || 0.4;
        const height = geometry.height || 1.8;
        const segments = geometry.segments || 6;
        const prismGeom = new THREE.CylinderGeometry(radius, radius, height, segments, 1);
        
        const topCone = new THREE.ConeGeometry(radius * 1.05, height * 0.3, segments);
        topCone.translate(0, height * 0.5 + height * 0.15, 0);
        
        const bottomCone = new THREE.ConeGeometry(radius * 1.05, height * 0.3, segments);
        bottomCone.rotateX(Math.PI);
        bottomCone.translate(0, -height * 0.5 - height * 0.15, 0);

        const merged = this.mergeGeometries([prismGeom, topCone, bottomCone]);
        return merged;
      }
      case 'cube': {
        const size = geometry.size || 0.9;
        return new THREE.BoxGeometry(size, size, size);
      }
      case 'dodecahedron': {
        const size = geometry.size || 0.7;
        return new THREE.DodecahedronGeometry(size, 0);
      }
      case 'octahedron': {
        const size = geometry.size || 0.8;
        return new THREE.OctahedronGeometry(size, 0);
      }
      default:
        return new THREE.SphereGeometry(0.5, 32, 32);
    }
  }

  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const mergedGeom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    geometries.forEach((geom) => {
      const posAttr = geom.getAttribute('position');
      const normAttr = geom.getAttribute('normal');
      const uvAttr = geom.getAttribute('uv');

      for (let i = 0; i < posAttr.count; i++) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        if (normAttr) {
          normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
        }
        if (uvAttr) {
          uvs.push(uvAttr.getX(i), uvAttr.getY(i));
        }
      }
    });

    mergedGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length > 0) {
      mergedGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    if (uvs.length > 0) {
      mergedGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
    mergedGeom.computeVertexNormals();

    return mergedGeom;
  }

  private createCrystalMaterial(crystalInfo: CrystalInfo, colorTint: string): THREE.MeshPhysicalMaterial {
    const baseColor = new THREE.Color(colorTint || crystalInfo.color);
    
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      transparent: true,
      opacity: crystalInfo.opacity,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.3,
      thickness: 0.5,
      ior: crystalInfo.refraction,
      emissive: new THREE.Color(crystalInfo.emissive),
      emissiveIntensity: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });
  }

  private createPulseRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.8, 0.85, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    return ring;
  }

  public createCrystalCluster(presetIndex: number): void {
    if (presetIndex < 0 || presetIndex >= CLUSTER_PRESETS.length) return;
    this.currentPresetIndex = presetIndex;

    const preset = CLUSTER_PRESETS[presetIndex];
    const crystalInfoMap = new Map(crystalData.map((c) => [c.id, c]));

    preset.crystals.forEach((crystalConfig) => {
      const data = crystalInfoMap.get(crystalConfig.crystalId);
      if (!data) return;

      const geometry = this.createCrystalGeometry(data);
      const material = this.createCrystalMaterial(data, crystalConfig.colorTint);
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        crystalConfig.position[0],
        crystalConfig.position[1],
        crystalConfig.position[2]
      );
      mesh.rotation.set(
        crystalConfig.rotation[0],
        crystalConfig.rotation[1],
        crystalConfig.rotation[2]
      );
      mesh.scale.setScalar(crystalConfig.scale);
      mesh.userData.crystalId = uuidv4();

      const pulseRing = this.createPulseRing();
      pulseRing.position.copy(mesh.position);
      pulseRing.position.y -= 0.5;
      mesh.add(pulseRing);

      const crystalObj: CrystalObject = {
        mesh,
        data: { ...data },
        pulseRing,
        originalPosition: mesh.position.clone(),
        originalScale: mesh.scale.clone(),
        targetScale: crystalConfig.scale,
        targetY: crystalConfig.position[1],
        isSelected: false,
        fadeInProgress: true,
        fadeOutProgress: false,
        fadeAlpha: 0,
      };

      material.opacity = 0;
      material.emissiveIntensity = 0;

      this.crystals.push(crystalObj);
      this.scene.add(mesh);
    });
  }

  private clearCrystalCluster(): void {
    this.crystals.forEach((crystal) => {
      this.scene.remove(crystal.mesh);
      crystal.mesh.geometry.dispose();
      if (Array.isArray(crystal.mesh.material)) {
        crystal.mesh.material.forEach((m) => m.dispose());
      } else {
        crystal.mesh.material.dispose();
      }
    });
    this.crystals = [];
    this.selectedCrystal = null;
  }

  public randomizeCluster(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.selectedCrystal) {
      this.deselectCrystal();
    }

    this.crystals.forEach((crystal) => {
      crystal.fadeOutProgress = true;
      crystal.fadeInProgress = false;
    });

    setTimeout(() => {
      this.clearCrystalCluster();
      let newIndex = Math.floor(Math.random() * CLUSTER_PRESETS.length);
      while (newIndex === this.currentPresetIndex && CLUSTER_PRESETS.length > 1) {
        newIndex = Math.floor(Math.random() * CLUSTER_PRESETS.length);
      }
      this.createCrystalCluster(newIndex);
      this.isTransitioning = false;
    }, 500);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.cameraAngle.theta -= deltaX * 0.01;
      this.cameraAngle.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi + deltaY * 0.01)
      );

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.updateCameraPosition();
    }

    this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.container.clientHeight) * 2 + 1;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.cameraDistance = Math.max(
      2,
      Math.min(15, this.cameraDistance + event.deltaY * zoomSpeed)
    );
    this.updateCameraPosition();
  }

  private onClick(_event: MouseEvent): void {
    if (this.isDragging || this.isTransitioning) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.crystals.map((c) => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const clickedCrystal = this.crystals.find((c) => c.mesh === clickedMesh);

      if (clickedCrystal) {
        if (this.selectedCrystal === clickedCrystal) {
          this.deselectCrystal();
        } else {
          this.selectCrystal(clickedCrystal);
        }
      }
    } else {
      this.deselectCrystal();
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isDragging && event.touches.length === 1) {
      const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

      this.cameraAngle.theta -= deltaX * 0.01;
      this.cameraAngle.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi + deltaY * 0.01)
      );

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      this.updateCameraPosition();
    }
  }

  private onTouchEnd(_event: TouchEvent): void {
    this.isDragging = false;
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private selectCrystal(crystal: CrystalObject): void {
    if (this.selectedCrystal) {
      this.deselectCrystal();
    }

    this.selectedCrystal = crystal;
    crystal.isSelected = true;
    crystal.targetScale = crystal.originalScale.x * 1.2;
    crystal.targetY = crystal.originalPosition.y + 0.5;

    if (crystal.pulseRing) {
      crystal.pulseRing.visible = true;
    }

    if (this.onCrystalSelect) {
      this.onCrystalSelect(crystal.data);
    }
  }

  private deselectCrystal(): void {
    if (!this.selectedCrystal) return;

    this.selectedCrystal.isSelected = false;
    this.selectedCrystal.targetScale = this.selectedCrystal.originalScale.x;
    this.selectedCrystal.targetY = this.selectedCrystal.originalPosition.y;

    if (this.selectedCrystal.pulseRing) {
      this.selectedCrystal.pulseRing.visible = false;
      const ringMaterial = this.selectedCrystal.pulseRing.material as THREE.MeshBasicMaterial;
      ringMaterial.opacity = 0;
    }

    this.selectedCrystal = null;

    if (this.onCrystalSelect) {
      this.onCrystalSelect(null);
    }
  }

  public setAutoRotate(value: boolean): void {
    this.autoRotate = value;
  }

  public resetCamera(): void {
    const startTheta = this.cameraAngle.theta;
    const startPhi = this.cameraAngle.phi;
    const startDistance = this.cameraDistance;
    const endTheta = this.initialCameraAngle.theta;
    const endPhi = this.initialCameraAngle.phi;
    const endDistance = this.initialCameraDistance;
    const duration = 1000;
    const startTime = performance.now();

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateReset = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      this.cameraAngle.theta = startTheta + (endTheta - startTheta) * eased;
      this.cameraAngle.phi = startPhi + (endPhi - startPhi) * eased;
      this.cameraDistance = startDistance + (endDistance - startDistance) * eased;
      this.updateCameraPosition();

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      }
    };

    animateReset();
  }

  private updateCameraPosition(): void {
    const x =
      this.cameraTarget.x +
      this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z =
      this.cameraTarget.z +
      this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.autoRotate && !this.isDragging) {
      this.cameraAngle.theta += (this.autoRotateSpeed * Math.PI / 180) * delta;
      this.updateCameraPosition();
    }

    this.stars.rotation.y += 0.0002;
    this.stars.rotation.x += 0.0001;

    this.crystals.forEach((crystal) => {
      const material = crystal.mesh.material as THREE.MeshPhysicalMaterial;

      if (crystal.fadeInProgress) {
        crystal.fadeAlpha = Math.min(crystal.fadeAlpha + delta * 2, 1);
        material.opacity = crystal.data.opacity * crystal.fadeAlpha;
        material.emissiveIntensity = 0.15 * crystal.fadeAlpha;
        if (crystal.fadeAlpha >= 1) {
          crystal.fadeInProgress = false;
        }
      }

      if (crystal.fadeOutProgress) {
        crystal.fadeAlpha = Math.max(crystal.fadeAlpha - delta * 2, 0);
        material.opacity = crystal.data.opacity * crystal.fadeAlpha;
        material.emissiveIntensity = 0.15 * crystal.fadeAlpha;
      }

      const targetScaleVec = new THREE.Vector3(
        crystal.targetScale,
        crystal.targetScale,
        crystal.targetScale
      );
      crystal.mesh.scale.lerp(targetScaleVec, delta * 4);

      const targetY = crystal.targetY;
      crystal.mesh.position.y += (targetY - crystal.mesh.position.y) * delta * 4;

      if (crystal.isSelected) {
        crystal.mesh.rotation.y += delta * 0.3;
      }

      if (crystal.pulseRing && crystal.pulseRing.visible) {
        const ringMaterial = crystal.pulseRing.material as THREE.MeshBasicMaterial;
        const pulseScale = 1 + Math.sin(time * 3) * 0.1;
        crystal.pulseRing.scale.setScalar(pulseScale);
        ringMaterial.opacity = 0.4 + Math.sin(time * 3) * 0.2;
      }

      material.emissiveIntensity = 0.15 + Math.sin(time * 2 + crystal.mesh.position.x) * 0.05;
    });

    this.renderer.render(this.scene, this.camera);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onResize.bind(this));

    this.clearCrystalCluster();

    if (this.stars.geometry) {
      this.stars.geometry.dispose();
    }
    if (this.stars.material) {
      (this.stars.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
