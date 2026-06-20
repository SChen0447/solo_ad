import * as THREE from 'three';
import { HeatmapManager, GridCellData } from './heatmapManager';

export interface CellInfo {
  row: number;
  col: number;
  baseHeight: number;
  targetHeight: number;
  currentHeight: number;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  isHovered: boolean;
  isSelected: boolean;
  regionId: string;
  x: number;
  z: number;
  heightAnimationTime: number;
  colorAnimationTime: number;
}

interface HoverEffects {
  glowMesh: THREE.Mesh;
  glowMaterial: THREE.MeshBasicMaterial;
  particles: THREE.Points;
  particleGeometry: THREE.BufferGeometry;
  particlePositions: Float32Array;
  particleSizes: Float32Array;
  particleAngles: number[];
  particleRadii: number[];
  particleSpeeds: number[];
  active: boolean;
}

interface SelectedEffects {
  borderMesh: THREE.LineSegments;
  borderMaterial: THREE.LineBasicMaterial;
  active: boolean;
}

export class CityGrid {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gridSize: number = 20;
  private cellSize: number = 1;
  private gap: number = 0.05;
  private cells: CellInfo[][] = [];
  private heatmapManager: HeatmapManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredCellIndex: number | null = null;
  private selectedCellIndex: number | null = null;
  private animationId: number = 0;
  private clock: THREE.Clock;
  private isRotating: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 15;
  private cameraAngleX: number = 0.5;
  private cameraAngleY: number = 0.8;
  private targetCameraDistance: number = 15;
  private targetCameraAngleX: number = 0.5;
  private targetCameraAngleY: number = 0.8;
  private onCellClick: ((cellData: GridCellData, row: number, col: number) => void) | null = null;
  private temperatureLabel: HTMLDivElement | null = null;
  private container: HTMLElement;
  
  private instancedMesh: THREE.InstancedMesh | null = null;
  private instancedBorders: THREE.InstancedMesh | null = null;
  private dummy: THREE.Object3D;
  private borderDummy: THREE.Object3D;
  
  private hoverEffects: HoverEffects | null = null;
  private selectedEffects: SelectedEffects | null = null;
  
  private readonly HEIGHT_ANIMATION_DURATION = 0.5;
  private readonly COLOR_ANIMATION_DURATION = 1.0;
  private readonly ROTATION_SPEED = 0.002;
  private readonly ZOOM_SPEED = 0.0015;
  private readonly CAMERA_RESPONSE_TIME = 0.5;
  
  private readonly GLOW_CYCLE = 1.2;
  private readonly PARTICLE_COUNT_MIN = 8;
  private readonly PARTICLE_COUNT_MAX = 12;
  private readonly BREATH_CYCLE = 0.8;

  constructor(container: HTMLElement, heatmapManager: HeatmapManager) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.heatmapManager = heatmapManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.dummy = new THREE.Object3D();
    this.borderDummy = new THREE.Object3D();

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.createGrid();
    this.createHoverEffects();
    this.createSelectedEffects();
    this.createTemperatureLabel();
    this.setupEventListeners(container);
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x00d2ff, 0x3a7bd5, 0.3);
    this.scene.add(hemisphereLight);
  }

  private createGrid(): void {
    const totalWidth = this.gridSize * this.cellSize + (this.gridSize - 1) * this.gap;
    const offset = totalWidth / 2 - this.cellSize / 2;
    const data = this.heatmapManager.getData();
    const totalCells = this.gridSize * this.gridSize;

    const geometry = new THREE.BoxGeometry(this.cellSize, 1, this.cellSize);
    const material = new THREE.MeshStandardMaterial({
      metalness: 0.1,
      roughness: 0.8,
      vertexColors: false
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, totalCells);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const borderGeometry = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    this.instancedBorders = new THREE.InstancedMesh(borderGeometry, borderMaterial, totalCells);
    this.instancedBorders.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let row = 0; row < this.gridSize; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * (this.cellSize + this.gap) - offset;
        const z = row * (this.cellSize + this.gap) - offset;
        const index = row * this.gridSize + col;

        const regionId = this.getRegionId(row, col);
        const cellData = data[row][col];
        const baseHeight = this.getHeightFromTemperature(cellData.temperature);
        const baseColor = this.heatmapManager.getColorForTemperature(cellData.temperature);

        this.cells[row][col] = {
          row,
          col,
          baseHeight,
          targetHeight: baseHeight,
          currentHeight: baseHeight,
          baseColor: baseColor.clone(),
          targetColor: baseColor.clone(),
          currentColor: baseColor.clone(),
          isHovered: false,
          isSelected: false,
          regionId,
          x,
          z,
          heightAnimationTime: this.HEIGHT_ANIMATION_DURATION,
          colorAnimationTime: this.COLOR_ANIMATION_DURATION
        };

        this.updateInstanceMatrix(index, row, col, baseHeight, false);
      }
    }

    (this.instancedMesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(totalCells * 3), 3
    );
    this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.updateInstanceColors();

    this.scene.add(this.instancedMesh);
    this.scene.add(this.instancedBorders);
  }

  private createHoverEffects(): void {
    const glowGeometry = new THREE.PlaneGeometry(
      this.cellSize * 1.05,
      this.cellSize * 1.05
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.visible = false;
    this.scene.add(glowMesh);

    const particleCount = Math.floor(
      Math.random() * (this.PARTICLE_COUNT_MAX - this.PARTICLE_COUNT_MIN + 1)
    ) + this.PARTICLE_COUNT_MIN;

    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleAngles: number[] = [];
    const particleRadii: number[] = [];
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particleAngles.push(Math.random() * Math.PI * 2);
      particleRadii.push(this.cellSize * 0.45 + Math.random() * this.cellSize * 0.1);
      particleSpeeds.push(0.5 + Math.random() * 1.0);
      particleSizes[i] = 0.02 + Math.random() * 0.03;
      particlePositions[i * 3] = 0;
      particlePositions[i * 3 + 1] = 0;
      particlePositions[i * 3 + 2] = 0;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.visible = false;
    this.scene.add(particles);

    this.hoverEffects = {
      glowMesh,
      glowMaterial,
      particles,
      particleGeometry,
      particlePositions,
      particleSizes,
      particleAngles,
      particleRadii,
      particleSpeeds,
      active: false
    };
  }

  private createSelectedEffects(): void {
    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(this.cellSize * 1.02, 1.02, this.cellSize * 1.02)
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    const borderMesh = new THREE.LineSegments(geometry, material);
    borderMesh.visible = false;
    this.scene.add(borderMesh);

    this.selectedEffects = {
      borderMesh,
      borderMaterial: material,
      active: false
    };
  }

  private updateHoverEffectsPosition(cell: CellInfo, cellHeight: number): void {
    if (!this.hoverEffects) return;

    const hoverOffset = 0.1;
    const topY = cellHeight + hoverOffset + 0.001;

    this.hoverEffects.glowMesh.position.set(cell.x, topY, cell.z);
    this.hoverEffects.glowMesh.visible = true;
    this.hoverEffects.glowMaterial.color.copy(cell.currentColor);

    this.hoverEffects.particles.position.set(cell.x, topY + 0.02, cell.z);
    this.hoverEffects.particles.visible = true;
    (this.hoverEffects.particles.material as THREE.PointsMaterial).opacity = 1;

    this.hoverEffects.active = true;
  }

  private hideHoverEffects(): void {
    if (!this.hoverEffects) return;

    this.hoverEffects.glowMesh.visible = false;
    this.hoverEffects.glowMaterial.opacity = 0;
    this.hoverEffects.particles.visible = false;
    (this.hoverEffects.particles.material as THREE.PointsMaterial).opacity = 0;
    this.hoverEffects.active = false;
  }

  private updateSelectedEffectsPosition(cell: CellInfo, cellHeight: number): void {
    if (!this.selectedEffects) return;

    const actualHeight = Math.max(0.001, cellHeight);
    this.selectedEffects.borderMesh.position.set(cell.x, actualHeight / 2, cell.z);
    const scaleY = actualHeight;
    this.selectedEffects.borderMesh.scale.set(1, scaleY, 1);
    this.selectedEffects.borderMesh.visible = true;
    this.selectedEffects.active = true;
  }

  private hideSelectedEffects(): void {
    if (!this.selectedEffects) return;

    this.selectedEffects.borderMesh.visible = false;
    this.selectedEffects.borderMaterial.opacity = 0;
    this.selectedEffects.active = false;
  }

  private updateInstanceMatrix(
    index: number, 
    row: number, 
    col: number, 
    height: number, 
    isHovered: boolean
  ): void {
    if (!this.instancedMesh || !this.instancedBorders) return;

    const cell = this.cells[row][col];
    const hoverOffset = isHovered ? 0.1 : 0;
    const actualHeight = Math.max(0.001, height);

    this.dummy.position.set(cell.x, actualHeight / 2 + hoverOffset, cell.z);
    this.dummy.scale.set(1, actualHeight, 1);
    this.dummy.updateMatrix();
    this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    this.borderDummy.position.set(cell.x, actualHeight / 2 + hoverOffset, cell.z);
    this.borderDummy.scale.set(1, actualHeight, 1);
    this.borderDummy.updateMatrix();
    this.instancedBorders.setMatrixAt(index, this.borderDummy.matrix);
    this.instancedBorders.instanceMatrix.needsUpdate = true;
  }

  private updateInstanceColors(): void {
    if (!this.instancedMesh) return;
    
    const colors = this.instancedMesh.instanceColor;
    if (!colors) return;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const index = row * this.gridSize + col;
        const color = this.cells[row][col].currentColor;
        colors.setXYZ(index, color.r, color.g, color.b);
      }
    }
    colors.needsUpdate = true;
  }

  private getRegionId(row: number, col: number): string {
    const letter = String.fromCharCode(65 + row);
    return `${letter}-${col.toString().padStart(2, '0')}`;
  }

  private getHeightFromTemperature(temp: number): number {
    const minTemp = 20;
    const maxTemp = 45;
    const normalized = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
    return normalized * 0.3;
  }

  private createTemperatureLabel(): void {
    this.temperatureLabel = document.createElement('div');
    this.temperatureLabel.style.cssText = `
      position: fixed;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 14px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    `;
    document.body.appendChild(this.temperatureLabel);
  }

  private setupEventListeners(container: HTMLElement): void {
    container.addEventListener('mousemove', (e) => this.onMouseMove(e, container));
    container.addEventListener('click', (e) => this.onClick(e, container));
    container.addEventListener('contextmenu', (e) => e.preventDefault());
    container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    container.addEventListener('mouseup', () => this.onMouseUp());
    container.addEventListener('mouseleave', () => this.onMouseLeave());
    container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('resize', () => this.onResize(container));
  }

  private onMouseMove(event: MouseEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isRotating) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      
      this.targetCameraAngleX -= deltaX * this.ROTATION_SPEED * (this.CAMERA_RESPONSE_TIME / 0.5);
      this.targetCameraAngleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, 
        this.targetCameraAngleY + deltaY * this.ROTATION_SPEED * (this.CAMERA_RESPONSE_TIME / 0.5)));
      
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    this.updateHover(event);
  }

  private updateHover(event: MouseEvent): void {
    if (!this.instancedMesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedMesh);

    let newHoveredIndex: number | null = null;

    if (this.hoveredCellIndex !== null) {
      const prevRow = Math.floor(this.hoveredCellIndex / this.gridSize);
      const prevCol = this.hoveredCellIndex % this.gridSize;
      this.cells[prevRow][prevCol].isHovered = false;
    }

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        const row = Math.floor(instanceId / this.gridSize);
        const col = instanceId % this.gridSize;
        const cell = this.cells[row][col];
        
        cell.isHovered = true;
        newHoveredIndex = instanceId;
        
        this.updateHoverEffectsPosition(cell, cell.currentHeight);
        
        this.showTemperatureLabel(cell, event);
      }
    }

    if (newHoveredIndex === null && this.hoveredCellIndex !== null) {
      this.hideHoverEffects();
      this.hideTemperatureLabel();
    }

    this.hoveredCellIndex = newHoveredIndex;
  }

  private showTemperatureLabel(cell: CellInfo, event: MouseEvent): void {
    if (!this.temperatureLabel) return;
    const data = this.heatmapManager.getData()[cell.row][cell.col];
    this.temperatureLabel.textContent = `${cell.regionId}: ${data.temperature.toFixed(1)}°C`;
    this.temperatureLabel.style.opacity = '1';
    this.temperatureLabel.style.left = `${event.clientX + 15}px`;
    this.temperatureLabel.style.top = `${event.clientY + 15}px`;
  }

  private hideTemperatureLabel(): void {
    if (this.temperatureLabel) {
      this.temperatureLabel.style.opacity = '0';
    }
  }

  private onClick(event: MouseEvent, container: HTMLElement): void {
    if (event.button !== 0 || !this.instancedMesh) return;
    
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedMesh);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      const instanceId = intersects[0].instanceId;
      const row = Math.floor(instanceId / this.gridSize);
      const col = instanceId % this.gridSize;
      this.selectCell(row, col);
    }
  }

  private selectCell(row: number, col: number): void {
    if (this.selectedCellIndex !== null) {
      const prevRow = Math.floor(this.selectedCellIndex / this.gridSize);
      const prevCol = this.selectedCellIndex % this.gridSize;
      this.cells[prevRow][prevCol].isSelected = false;
    }

    const index = row * this.gridSize + col;
    const cell = this.cells[row][col];
    cell.isSelected = true;
    this.selectedCellIndex = index;

    this.updateSelectedEffectsPosition(cell, cell.currentHeight);

    const data = this.heatmapManager.getData()[row][col];
    if (this.onCellClick) {
      this.onCellClick(data, row, col);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 2) {
      this.isRotating = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseUp(): void {
    this.isRotating = false;
  }

  private onMouseLeave(): void {
    this.isRotating = false;
    if (this.hoveredCellIndex !== null) {
      const row = Math.floor(this.hoveredCellIndex / this.gridSize);
      const col = this.hoveredCellIndex % this.gridSize;
      this.cells[row][col].isHovered = false;
      this.hoveredCellIndex = null;
    }
    this.hideHoverEffects();
    this.hideTemperatureLabel();
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.targetCameraDistance = Math.max(5, Math.min(30, 
      this.targetCameraDistance + event.deltaY * this.ZOOM_SPEED * this.targetCameraDistance));
  }

  private onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = this.cameraDistance * Math.sin(this.cameraAngleY);
    const z = this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0.15, 0);
  }

  public updateHeatmap(timePeriod: string): void {
    const data = this.heatmapManager.switchTimePeriod(timePeriod);
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        const cellData = data[row][col];
        
        cell.baseColor = cell.currentColor.clone();
        cell.targetColor = this.heatmapManager.getColorForTemperature(cellData.temperature);
        cell.colorAnimationTime = 0;
        
        cell.baseHeight = cell.currentHeight;
        cell.targetHeight = this.getHeightFromTemperature(cellData.temperature);
        cell.heightAnimationTime = 0;
      }
    }
  }

  public setOnCellClick(callback: (cellData: GridCellData, row: number, col: number) => void): void {
    this.onCellClick = callback;
  }

  public getCellRegionId(row: number, col: number): string {
    return this.cells[row]?.[col]?.regionId || '';
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    const smoothFactor = 1 - Math.pow(0.001, delta / this.CAMERA_RESPONSE_TIME);
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * smoothFactor;
    this.cameraAngleX += (this.targetCameraAngleX - this.cameraAngleX) * smoothFactor;
    this.cameraAngleY += (this.targetCameraAngleY - this.cameraAngleY) * smoothFactor;
    this.updateCameraPosition();

    let needsColorUpdate = false;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        const index = row * this.gridSize + col;

        if (cell.colorAnimationTime < this.COLOR_ANIMATION_DURATION) {
          cell.colorAnimationTime += delta;
          const t = Math.min(1, cell.colorAnimationTime / this.COLOR_ANIMATION_DURATION);
          cell.currentColor.lerpColors(cell.baseColor, cell.targetColor, t);
          needsColorUpdate = true;
        }

        if (cell.heightAnimationTime < this.HEIGHT_ANIMATION_DURATION) {
          cell.heightAnimationTime += delta;
          const t = Math.min(1, cell.heightAnimationTime / this.HEIGHT_ANIMATION_DURATION);
          const easeT = 1 - Math.pow(1 - t, 3);
          cell.currentHeight = cell.baseHeight + (cell.targetHeight - cell.baseHeight) * easeT;
        }

        this.updateInstanceMatrix(index, row, col, cell.currentHeight, cell.isHovered);

        if (cell.isSelected && this.selectedCellIndex === index) {
          this.updateSelectedEffectsPosition(cell, cell.currentHeight);
        }

        if (cell.isHovered && this.hoveredCellIndex === index) {
          this.updateHoverEffectsPosition(cell, cell.currentHeight);
        }
      }
    }

    if (needsColorUpdate) {
      this.updateInstanceColors();
    }

    this.updateSpecialEffects(time, delta);

    this.renderer.render(this.scene, this.camera);
  }

  private updateSpecialEffects(time: number, _delta: number): void {
    if (this.hoverEffects && this.hoverEffects.active) {
      const glowPhase = (Math.sin(time * Math.PI * 2 / this.GLOW_CYCLE) + 1) / 2;
      this.hoverEffects.glowMaterial.opacity = 0.1 + glowPhase * 0.2;

      const positions = this.hoverEffects.particlePositions;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        this.hoverEffects.particleAngles[i] += this.hoverEffects.particleSpeeds[i] * _delta;
        const angle = this.hoverEffects.particleAngles[i];
        const radius = this.hoverEffects.particleRadii[i];
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        positions[i * 3 + 1] = 0.02 + Math.sin(time * 2 + i * 0.7) * 0.01;
      }
      (this.hoverEffects.particleGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      
      if (this.hoveredCellIndex !== null) {
        const row = Math.floor(this.hoveredCellIndex / this.gridSize);
        const col = this.hoveredCellIndex % this.gridSize;
        this.hoverEffects.glowMaterial.color.copy(this.cells[row][col].currentColor);
      }
    }

    if (this.selectedEffects && this.selectedEffects.active) {
      const breathPhase = (Math.sin(time * Math.PI * 2 / this.BREATH_CYCLE) + 1) / 2;
      const smoothBreath = 0.5 + 0.5 * (breathPhase * breathPhase * (3 - 2 * breathPhase));
      this.selectedEffects.borderMaterial.opacity = 0.5 + smoothBreath * 0.5;
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    if (this.temperatureLabel) {
      this.temperatureLabel.remove();
    }
    if (this.hoverEffects) {
      this.hoverEffects.glowMesh.geometry.dispose();
      this.hoverEffects.glowMaterial.dispose();
      this.hoverEffects.particleGeometry.dispose();
      (this.hoverEffects.particles.material as THREE.Material).dispose();
    }
    if (this.selectedEffects) {
      this.selectedEffects.borderMesh.geometry.dispose();
      this.selectedEffects.borderMaterial.dispose();
    }
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
    }
    if (this.instancedBorders) {
      this.instancedBorders.geometry.dispose();
      (this.instancedBorders.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}
