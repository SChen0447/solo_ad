import * as THREE from 'three';
import { Block } from './block';
import { UIController, Dimension, DIMENSION_LABELS } from './ui';

const GRID_SIZE = 10;
const SPACING = 1.1;
const ROTATION_SPEED = 0.3;
const ZOOM_MIN = 5;
const ZOOM_MAX = 30;
const PLAY_INTERVAL = 500;

interface BlockData {
  population: Float64Array;
  traffic: Float64Array;
  greenery: Float64Array;
}

function generateBlockData(index: number, row: number, col: number): BlockData {
  const population = new Float64Array(24);
  const traffic = new Float64Array(24);
  const greenery = new Float64Array(24);

  const distCenter = Math.sqrt(
    Math.pow(row - GRID_SIZE / 2, 2) + Math.pow(col - GRID_SIZE / 2, 2)
  );
  const centerFactor = Math.max(0, 1 - distCenter / (GRID_SIZE * 0.6));
  const seed = (row * 7 + col * 13 + index * 3) % 100;
  const randomBias = (seed / 100) * 0.3;

  for (let h = 0; h < 24; h++) {
    const t = h / 24;
    const popCurve =
      Math.exp(-Math.pow((t - 0.5) * 3, 2)) * 0.7 +
      Math.exp(-Math.pow((t - 0.7) * 4, 2)) * 0.3;
    population[h] = Math.min(
      1,
      Math.max(0, popCurve * (0.4 + centerFactor * 0.5) + randomBias)
    );

    const morningPeak = Math.exp(-Math.pow((t - 0.33) * 6, 2));
    const eveningPeak = Math.exp(-Math.pow((t - 0.71) * 6, 2));
    const trafficBase = morningPeak * 0.6 + eveningPeak * 0.5;
    traffic[h] = Math.min(
      1,
      Math.max(0, trafficBase * (0.5 + centerFactor * 0.4) + randomBias * 0.5)
    );

    const greenBase = 0.3 + (1 - centerFactor) * 0.4 + randomBias * 0.3;
    const dayVariation = Math.exp(-Math.pow((t - 0.5) * 3, 2)) * 0.1;
    greenery[h] = Math.min(1, Math.max(0, greenBase + dayVariation));
  }

  return { population, traffic, greenery };
}

class CityHeatmapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private blocks: Block[] = [];
  private blockData: BlockData[] = [];
  private ui: UIController;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredBlock: Block | null = null;
  private currentDimension: Dimension = 'population';
  private currentHour: number = 12;
  private isPlaying: boolean = false;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 4;
  private cameraRadius: number = 15;
  private viewMode: 'top' | 'angle' | 'free' = 'free';
  private targetTheta: number = Math.PI / 4;
  private targetPhi: number = Math.PI / 4;
  private targetRadius: number = 15;

  private tooltip: HTMLElement;
  private viewport: HTMLElement;
  private animationId: number = 0;

  constructor() {
    this.viewport = document.getElementById('viewport')!;
    this.tooltip = document.getElementById('tooltip')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0A0E17');
    this.scene.fog = new THREE.FogExp2('#0A0E17', 0.02);

    const aspect = this.viewport.clientWidth / this.viewport.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.viewport.clientWidth, this.viewport.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.viewport.insertBefore(this.renderer.domElement, this.viewport.firstChild);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.ui = new UIController('panel', {
      onDimensionChange: this.handleDimensionChange.bind(this),
      onTimeChange: this.handleTimeChange.bind(this),
      onPlayToggle: this.handlePlayToggle.bind(this),
      onViewChange: this.handleViewChange.bind(this),
    });

    this.addLights();
    this.addGround();
    this.createBlocks();
    this.setupEventListeners();
    this.applyDataToBlocks();

    this.animate(performance.now());
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight('#4a5568', 1.2);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.0);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#4488ff', 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);

    const pointLight = new THREE.PointLight('#FFD700', 0.5, 30);
    pointLight.position.set(0, 8, 0);
    this.scene.add(pointLight);
  }

  private addGround(): void {
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshPhongMaterial({
      color: '#0f1729',
      transparent: true,
      opacity: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(20, 20, '#1a2744', '#141e36');
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
  }

  private createBlocks(): void {
    let index = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const block = new Block(row, col, index);
        this.blocks.push(block);
        this.blockData.push(generateBlockData(index, row, col));
        this.scene.add(block.mesh);
        index++;
      }
    }
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging && this.viewMode === 'free') {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;
        this.cameraTheta -= deltaX * ROTATION_SPEED * 0.01;
        this.cameraPhi = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, this.cameraPhi + deltaY * ROTATION_SPEED * 0.01)
        );
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraRadius = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, this.cameraRadius + e.deltaY * 0.02)
      );
    }, { passive: false });

    window.addEventListener('resize', () => {
      const w = this.viewport.clientWidth;
      const h = this.viewport.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1 && this.viewMode === 'free') {
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
        this.cameraTheta -= deltaX * ROTATION_SPEED * 0.01;
        this.cameraPhi = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, this.cameraPhi + deltaY * ROTATION_SPEED * 0.01)
        );
        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private updateCameraPosition(): void {
    const x = this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private handleDimensionChange(dim: Dimension): void {
    this.currentDimension = dim;
    this.applyDataToBlocks();
  }

  private handleTimeChange(hour: number): void {
    this.currentHour = hour;
    this.applyDataToBlocks();
  }

  private handlePlayToggle(): void {
    this.isPlaying = this.ui.getIsPlaying();
    if (this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  private startPlayback(): void {
    this.stopPlayback();
    this.playTimer = setInterval(() => {
      this.currentHour = (this.currentHour + 1) % 24;
      this.ui.setTime(this.currentHour);
      this.applyDataToBlocks();
    }, PLAY_INTERVAL);
  }

  private stopPlayback(): void {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  private handleViewChange(view: 'top' | 'angle' | 'free'): void {
    this.viewMode = view;
    switch (view) {
      case 'top':
        this.targetPhi = 0.05;
        this.targetTheta = 0;
        this.targetRadius = 18;
        break;
      case 'angle':
        this.targetPhi = Math.PI / 4;
        this.targetTheta = Math.PI / 4;
        this.targetRadius = 15;
        break;
      case 'free':
        this.targetPhi = this.cameraPhi;
        this.targetTheta = this.cameraTheta;
        this.targetRadius = this.cameraRadius;
        break;
    }
  }

  private applyDataToBlocks(): void {
    const now = performance.now();
    const hour = this.currentHour;
    const dim = this.currentDimension;
    this.blocks.forEach((block, i) => {
      const data = this.blockData[i];
      const value = data[dim][hour];
      block.setData(value, now);
      block.updateLabel(value);
    });
  }

  private computePercentile(blockIndex: number): number {
    const dim = this.currentDimension;
    const hour = this.currentHour;
    const targetValue = this.blockData[blockIndex][dim][hour];
    let count = 0;
    for (let i = 0; i < this.blockData.length; i++) {
      if (this.blockData[i][dim][hour] <= targetValue) {
        count++;
      }
    }
    return (count / this.blockData.length) * 100;
  }

  private handleHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.blocks.map((b) => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    let newHovered: Block | null = null;
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const blockIdx = hitMesh.userData.blockIndex;
      if (blockIdx !== undefined) {
        newHovered = this.blocks[blockIdx];
      }
    }

    if (this.hoveredBlock && this.hoveredBlock !== newHovered) {
      this.hoveredBlock.setHovered(false);
    }

    if (newHovered) {
      newHovered.setHovered(true);
      const value = newHovered.getCurrentValue();
      const percentile = this.computePercentile(newHovered.index);

      this.tooltip.style.display = 'block';
      const rect = this.renderer.domElement.getBoundingClientRect();
      const projected = new THREE.Vector3();
      newHovered.mesh.getWorldPosition(projected);
      projected.y += newHovered.getCurrentHeight() / 2 + 0.5;
      projected.project(this.camera);

      const x = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;

      this.tooltip.style.left = `${x - 90}px`;
      this.tooltip.style.top = `${y - 130}px`;

      const row = newHovered.row;
      const col = newHovered.col;
      this.tooltip.innerHTML = `
        <div style="font-weight:600; margin-bottom:6px;">街区 #${row}-${col}</div>
        <div style="margin-bottom:3px;">${DIMENSION_LABELS[this.currentDimension]}: <strong>${value.toFixed(1)}</strong></div>
        <div>全城百分位: <strong>${percentile.toFixed(1)}%</strong></div>
      `;

      this.ui.updateInfoArea(
        `${row}-${col}`,
        value,
        percentile,
        this.currentDimension
      );
    } else {
      this.tooltip.style.display = 'none';
      this.ui.clearInfoArea();
    }

    this.hoveredBlock = newHovered;
  }

  private animate(timestamp: number): void {
    this.animationId = requestAnimationFrame((t) => this.animate(t));

    if (this.viewMode !== 'free') {
      this.cameraPhi += (this.targetPhi - this.cameraPhi) * 0.08;
      this.cameraTheta += (this.targetTheta - this.cameraTheta) * 0.08;
      this.cameraRadius += (this.targetRadius - this.cameraRadius) * 0.08;
    }

    this.updateCameraPosition();

    this.blocks.forEach((block) => block.update(timestamp));

    this.handleHover();

    this.renderer.render(this.scene, this.camera);
  }
}

new CityHeatmapApp();
