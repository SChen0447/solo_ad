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
  private cellColors: THREE.Color[] = [];
  
  private readonly HEIGHT_ANIMATION_DURATION = 0.5;
  private readonly COLOR_ANIMATION_DURATION = 1.0;
  private readonly ROTATION_SPEED = 0.002;
  private readonly ZOOM_SPEED = 0.0015;
  private readonly CAMERA_RESPONSE_TIME = 0.5;

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

        this.cellColors[index] = baseColor.clone();
        this.updateInstanceMatrix(index, row, col, baseHeight, false);
      }
    }

    (this.instancedMesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(totalCells * 3), 3
    );
    this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.updateInstanceColors();

    this.instancedMesh.userData = { isGridMesh: true };
    this.instancedBorders.userData = { isBorderMesh: true };

    this.scene.add(this.instancedMesh);
    this.scene.add(this.instancedBorders);
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

  private updateBorderOpacity(index: number, opacity: number): void {
    if (!this.instancedBorders) return;
    const material = this.instancedBorders.material as THREE.LineBasicMaterial;
    material.opacity = opacity;
    this.instancedBorders.visible = opacity > 0;
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
        this.hoveredCellIndex = instanceId;
        
        this.showTemperatureLabel(cell, event);
        return;
      }
    }

    this.hoveredCellIndex = null;
    this.hideTemperatureLabel();
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

        if (cell.isSelected && this.instancedBorders) {
          const borderMaterial = this.instancedBorders.material as THREE.LineBasicMaterial;
          borderMaterial.opacity = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 1.5);
          this.instancedBorders.visible = true;
        }
      }
    }

    if (needsColorUpdate) {
      this.updateInstanceColors();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    if (this.temperatureLabel) {
      this.temperatureLabel.remove();
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
