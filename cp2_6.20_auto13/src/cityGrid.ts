import * as THREE from 'three';

export interface GridCell {
  mesh: THREE.Mesh;
  edge: THREE.LineSegments;
  row: number;
  col: number;
  baseHeight: number;
  targetHeight: number;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  colorTransitionProgress: number;
  colorTransitionDuration: number;
  isHovered: boolean;
  isSelected: boolean;
  hoverOffset: number;
  targetHoverOffset: number;
  hoverTransitionProgress: number;
  hoverTransitionStartValue: number;
  hoverTransitionTargetValue: number;
  hoverTransitionDuration: number;
}

export interface CityGridOptions {
  gridSize: number;
  cellSize: number;
  gap: number;
  container: HTMLElement;
}

export class CityGrid {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gridCells: GridCell[][] = [];
  private gridSize: number;
  private cellSize: number;
  private gap: number;
  private container: HTMLElement;

  private isRightMouseDown = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 3 };
  private cameraDistance = 18;
  private targetCameraDistance = 18;
  private minDistance = 5;
  private maxDistance = 30;
  private rotationSpeed = 0.2;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredCell: GridCell | null = null;
  private selectedCell: GridCell | null = null;

  private animationId: number | null = null;
  private clock: THREE.Clock;

  private onCellClickCallback: ((cell: GridCell) => void) | null = null;
  private onCellHoverCallback: ((cell: GridCell | null, event: MouseEvent) => void) | null = null;

  constructor(options: CityGridOptions) {
    this.gridSize = options.gridSize;
    this.cellSize = options.cellSize;
    this.gap = options.gap;
    this.container = options.container;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createGrid();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
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

    const pointLight1 = new THREE.PointLight(0x00d2ff, 0.3, 30);
    pointLight1.position.set(-10, 10, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x3a7bd5, 0.3, 30);
    pointLight2.position.set(10, 10, 10);
    this.scene.add(pointLight2);
  }

  private createGrid(): void {
    const totalWidth = this.gridSize * (this.cellSize + this.gap) - this.gap;
    const offset = -totalWidth / 2 + this.cellSize / 2;

    const geometry = new THREE.BoxGeometry(this.cellSize, 0.1, this.cellSize);
    const edgeGeometry = new THREE.EdgesGeometry(geometry);

    for (let row = 0; row < this.gridSize; row++) {
      this.gridCells[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const material = new THREE.MeshStandardMaterial({
          color: 0x3a7bd5,
          roughness: 0.7,
          metalness: 0.1
        });

        const mesh = new THREE.Mesh(geometry.clone(), material);
        mesh.position.set(
          offset + col * (this.cellSize + this.gap),
          0.05,
          offset + row * (this.cellSize + this.gap)
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { row, col, type: 'cell' };

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0
        });
        const edge = new THREE.LineSegments(edgeGeometry.clone(), edgeMaterial);
        edge.position.copy(mesh.position);
        edge.userData = { row, col, type: 'edge' };

        this.scene.add(mesh);
        this.scene.add(edge);

        this.gridCells[row][col] = {
          mesh,
          edge,
          row,
          col,
          baseHeight: 0.05,
          targetHeight: 0.05,
          baseColor: new THREE.Color(0x3a7bd5),
          targetColor: new THREE.Color(0x3a7bd5),
          colorTransitionProgress: 1,
          colorTransitionDuration: 0.5,
          isHovered: false,
          isSelected: false,
          hoverOffset: 0,
          targetHoverOffset: 0,
          hoverTransitionProgress: 1,
          hoverTransitionStartValue: 0,
          hoverTransitionTargetValue: 0,
          hoverTransitionDuration: 0.2
        };
      }
    }

    const groundGeometry = new THREE.PlaneGeometry(totalWidth + 4, totalWidth + 4);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f1a,
      roughness: 0.9,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(totalWidth + 2, 20, 0x2a2a4a, 0x1a1a3a);
    gridHelper.position.y = 0.001;
    this.scene.add(gridHelper);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);
    const y = this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 1, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isRightMouseDown) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.cameraAngle.theta += deltaX * 0.005 * this.rotationSpeed;
        this.cameraAngle.phi = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, this.cameraAngle.phi + deltaY * 0.005 * this.rotationSpeed)
        );

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      this.handleMouseMove(e);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      this.targetCameraDistance += e.deltaY * zoomSpeed * this.cameraDistance;
      this.targetCameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetCameraDistance));
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      this.handleClick(e);
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });

    canvas.addEventListener('mouseleave', () => {
      if (this.hoveredCell) {
        this.startHoverTransition(this.hoveredCell, 0);
        this.hoveredCell.isHovered = false;
        this.hoveredCell = null;
      }
      if (this.onCellHoverCallback) {
        this.onCellHoverCallback(null, new MouseEvent('mouseleave'));
      }
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.gridCells.flat().map(cell => cell.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const { row, col } = intersectedMesh.userData;
      const cell = this.gridCells[row][col];

      if (this.hoveredCell !== cell) {
        if (this.hoveredCell) {
          this.startHoverTransition(this.hoveredCell, 0);
          this.hoveredCell.isHovered = false;
        }
        this.startHoverTransition(cell, 0.1);
        cell.isHovered = true;
        this.hoveredCell = cell;
      }

      if (this.onCellHoverCallback) {
        this.onCellHoverCallback(cell, event);
      }
    } else {
      if (this.hoveredCell) {
        this.startHoverTransition(this.hoveredCell, 0);
        this.hoveredCell.isHovered = false;
        this.hoveredCell = null;
      }
      if (this.onCellHoverCallback) {
        this.onCellHoverCallback(null, event);
      }
    }
  }

  private startHoverTransition(cell: GridCell, targetValue: number): void {
    if (cell.hoverTransitionTargetValue === targetValue && cell.hoverTransitionProgress >= 1) {
      return;
    }
    cell.hoverTransitionStartValue = cell.hoverOffset;
    cell.hoverTransitionTargetValue = targetValue;
    cell.hoverTransitionProgress = 0;
    cell.targetHoverOffset = targetValue;
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.gridCells.flat().map(cell => cell.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const { row, col } = intersectedMesh.userData;
      const cell = this.gridCells[row][col];

      if (this.selectedCell && this.selectedCell !== cell) {
        this.selectedCell.isSelected = false;
      }

      cell.isSelected = !cell.isSelected;
      this.selectedCell = cell.isSelected ? cell : null;

      if (this.onCellClickCallback && cell.isSelected) {
        this.onCellClickCallback(cell);
      }
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * delta * 3;
    this.updateCameraPosition();

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.gridCells[row][col];

        cell.baseHeight += (cell.targetHeight - cell.baseHeight) * delta * 2;

        if (cell.hoverTransitionProgress < 1) {
          cell.hoverTransitionProgress = Math.min(1, cell.hoverTransitionProgress + delta / cell.hoverTransitionDuration);
          let easedProgress: number;
          if (cell.hoverTransitionTargetValue > cell.hoverTransitionStartValue) {
            easedProgress = this.easeOutBack(cell.hoverTransitionProgress);
          } else {
            easedProgress = this.easeInCubic(cell.hoverTransitionProgress);
          }
          cell.hoverOffset = cell.hoverTransitionStartValue +
            (cell.hoverTransitionTargetValue - cell.hoverTransitionStartValue) * easedProgress;
        }

        const totalHeight = cell.baseHeight + cell.hoverOffset;
        cell.mesh.position.y = totalHeight;
        cell.mesh.scale.y = totalHeight / 0.05;
        cell.edge.position.y = totalHeight;
        cell.edge.scale.y = totalHeight / 0.05;

        if (cell.colorTransitionProgress < 1) {
          cell.colorTransitionProgress = Math.min(1, cell.colorTransitionProgress + delta / cell.colorTransitionDuration);
          const easedProgress = this.easeInOutCubic(cell.colorTransitionProgress);

          const material = cell.mesh.material as THREE.MeshStandardMaterial;
          material.color.lerpColors(cell.baseColor, cell.targetColor, easedProgress);
        }

        const edgeMaterial = cell.edge.material as THREE.LineBasicMaterial;
        if (cell.isSelected) {
          edgeMaterial.opacity = 0.5 + 0.5 * Math.sin(time * 4);
        } else if (cell.isHovered) {
          edgeMaterial.opacity = 0.6;
        } else {
          edgeMaterial.opacity = 0;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public setCellData(row: number, col: number, color: THREE.Color, height: number): void {
    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      const cell = this.gridCells[row][col];

      const currentColor = (cell.mesh.material as THREE.MeshStandardMaterial).color;
      cell.baseColor.copy(currentColor);
      cell.targetColor = color.clone();
      cell.colorTransitionProgress = 0;

      cell.targetHeight = 0.05 + height;
    }
  }

  public setCellDataSmooth(row: number, col: number, color: THREE.Color, height: number): void {
    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      const cell = this.gridCells[row][col];

      const currentColor = (cell.mesh.material as THREE.MeshStandardMaterial).color;
      cell.baseColor.copy(currentColor);
      cell.targetColor = color.clone();
      cell.colorTransitionProgress = 0;

      cell.baseHeight = cell.targetHeight;
      cell.targetHeight = 0.05 + height;
    }
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getCell(row: number, col: number): GridCell | null {
    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      return this.gridCells[row][col];
    }
    return null;
  }

  public getSelectedCell(): GridCell | null {
    return this.selectedCell;
  }

  public clearSelection(): void {
    if (this.selectedCell) {
      this.selectedCell.isSelected = false;
      this.selectedCell = null;
    }
  }

  public onCellClick(callback: (cell: GridCell) => void): void {
    this.onCellClickCallback = callback;
  }

  public onCellHover(callback: (cell: GridCell | null, event: MouseEvent) => void): void {
    this.onCellHoverCallback = callback;
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
