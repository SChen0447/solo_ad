import * as THREE from 'three';
import { HeatmapManager, GridCellData } from './heatmapManager';

export interface CellInfo {
  row: number;
  col: number;
  mesh: THREE.Mesh;
  border: THREE.LineSegments;
  baseHeight: number;
  targetHeight: number;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  isHovered: boolean;
  isSelected: boolean;
  regionId: string;
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
  private hoveredCell: CellInfo | null = null;
  private selectedCell: CellInfo | null = null;
  private tooltip: HTMLDivElement | null = null;
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
  private temperatureLabels: Map<string, HTMLDivElement> = new Map();

  constructor(container: HTMLElement, heatmapManager: HeatmapManager) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.heatmapManager = heatmapManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

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
    this.createTooltip();
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

    for (let row = 0; row < this.gridSize; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * (this.cellSize + this.gap) - offset;
        const z = row * (this.cellSize + this.gap) - offset;

        const geometry = new THREE.BoxGeometry(this.cellSize, 0.1, this.cellSize);
        const material = new THREE.MeshStandardMaterial({
          color: 0x333366,
          metalness: 0.1,
          roughness: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { row, col };

        const edges = new THREE.EdgesGeometry(geometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0 
        });
        const border = new THREE.LineSegments(edges, borderMaterial);
        border.position.copy(mesh.position);

        const regionId = this.getRegionId(row, col);
        const cellData = data[row][col];
        const baseHeight = this.getHeightFromTemperature(cellData.temperature);
        const baseColor = this.heatmapManager.getColorForTemperature(cellData.temperature);

        this.cells[row][col] = {
          row,
          col,
          mesh,
          border,
          baseHeight,
          targetHeight: baseHeight,
          baseColor: baseColor.clone(),
          targetColor: baseColor.clone(),
          isHovered: false,
          isSelected: false,
          regionId
        };

        mesh.scale.y = baseHeight / 0.1;
        mesh.position.y = baseHeight / 2;
        border.position.y = baseHeight / 2;
        (material as THREE.MeshStandardMaterial).color.copy(baseColor);

        this.scene.add(mesh);
        this.scene.add(border);
      }
    }
  }

  private getRegionId(row: number, col: number): string {
    const letter = String.fromCharCode(65 + row);
    return `${letter}-${col.toString().padStart(2, '0')}`;
  }

  private getHeightFromTemperature(temp: number): number {
    const minTemp = 20;
    const maxTemp = 45;
    const normalized = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
    return 0.1 + normalized * 0.3;
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
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
    `;
    document.body.appendChild(this.tooltip);
  }

  private setupEventListeners(container: HTMLElement): void {
    container.addEventListener('mousemove', (e) => this.onMouseMove(e, container));
    container.addEventListener('click', (e) => this.onClick(e, container));
    container.addEventListener('contextmenu', (e) => e.preventDefault());
    container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    container.addEventListener('mouseup', () => this.onMouseUp());
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
      
      this.targetCameraAngleX -= deltaX * 0.005 * 0.2;
      this.targetCameraAngleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, 
        this.targetCameraAngleY + deltaY * 0.005 * 0.2));
      
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    this.updateHover();
    this.updateTooltipPosition(event);
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.cells.flat().map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (this.hoveredCell && (!intersects.length || 
        intersects[0].object.userData.row !== this.hoveredCell.row ||
        intersects[0].object.userData.col !== this.hoveredCell.col)) {
      this.hoveredCell.isHovered = false;
      this.hideTooltip();
      this.hoveredCell = null;
    }

    if (intersects.length > 0) {
      const { row, col } = intersects[0].object.userData;
      const cell = this.cells[row][col];
      
      if (!cell.isHovered) {
        if (this.hoveredCell) {
          this.hoveredCell.isHovered = false;
        }
        cell.isHovered = true;
        this.hoveredCell = cell;
        this.showTooltip(cell);
      }
    }
  }

  private showTooltip(cell: CellInfo): void {
    if (!this.tooltip) return;
    const data = this.heatmapManager.getData()[cell.row][cell.col];
    this.tooltip.textContent = `${cell.regionId}: ${data.temperature.toFixed(1)}°C`;
    this.tooltip.style.opacity = '1';
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
    }
  }

  private updateTooltipPosition(event: MouseEvent): void {
    if (!this.tooltip || this.tooltip.style.opacity === '0') return;
    this.tooltip.style.left = `${event.clientX + 15}px`;
    this.tooltip.style.top = `${event.clientY + 15}px`;
  }

  private onClick(event: MouseEvent, container: HTMLElement): void {
    if (event.button !== 0) return;
    
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.cells.flat().map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const { row, col } = intersects[0].object.userData;
      this.selectCell(row, col);
    }
  }

  private selectCell(row: number, col: number): void {
    if (this.selectedCell) {
      this.selectedCell.isSelected = false;
      (this.selectedCell.border.material as THREE.LineBasicMaterial).opacity = 0;
    }

    const cell = this.cells[row][col];
    cell.isSelected = true;
    this.selectedCell = cell;

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

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.targetCameraDistance = Math.max(5, Math.min(30, 
      this.targetCameraDistance + event.deltaY * zoomSpeed * this.targetCameraDistance));
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
    this.camera.lookAt(0, 0.2, 0);
  }

  public updateHeatmap(timePeriod: string): void {
    const data = this.heatmapManager.switchTimePeriod(timePeriod);
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        const cellData = data[row][col];
        
        cell.baseColor = cell.targetColor.clone();
        cell.targetColor = this.heatmapManager.getColorForTemperature(cellData.temperature);
        
        cell.baseHeight = cell.targetHeight;
        cell.targetHeight = this.getHeightFromTemperature(cellData.temperature);
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
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    const smoothFactor = 1 - Math.pow(0.001, delta / 0.3);
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * smoothFactor;
    this.cameraAngleX += (this.targetCameraAngleX - this.cameraAngleX) * smoothFactor;
    this.cameraAngleY += (this.targetCameraAngleY - this.cameraAngleY) * smoothFactor;
    this.updateCameraPosition();

    const animationProgress = Math.min(1, delta / 1);
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cells[row][col];
        
        const material = cell.mesh.material as THREE.MeshStandardMaterial;
        const currentColor = material.color.clone();
        currentColor.lerpColors(cell.baseColor, cell.targetColor, animationProgress);
        material.color.copy(currentColor);

        const heightProgress = Math.min(1, delta / 0.5);
        const currentHeight = cell.baseHeight + (cell.targetHeight - cell.baseHeight) * heightProgress;
        cell.mesh.scale.y = Math.max(0.1, currentHeight / 0.1);
        cell.mesh.position.y = currentHeight / 2;
        cell.border.position.y = currentHeight / 2;

        if (cell.isHovered && !cell.isSelected) {
          const hoverHeight = cell.targetHeight + 0.1;
          cell.mesh.position.y = hoverHeight / 2 + 0.05;
          cell.border.position.y = hoverHeight / 2 + 0.05;
        }

        if (cell.isSelected) {
          const borderMaterial = cell.border.material as THREE.LineBasicMaterial;
          borderMaterial.opacity = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 1.5);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    if (this.tooltip) {
      this.tooltip.remove();
    }
    this.temperatureLabels.forEach(label => label.remove());
    this.temperatureLabels.clear();
    this.renderer.dispose();
  }
}
