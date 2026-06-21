import * as THREE from 'three';

export interface AuxiliaryViewOptions {
  container: HTMLElement;
  boundaryRadius: number;
  sliceTexture: THREE.DataTexture;
  sizeRatio?: number;
}

export class AuxiliaryView {
  private container: HTMLElement;
  private viewContainer!: HTMLDivElement;
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  
  private slicePlane!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;
  private source1Marker!: THREE.Mesh;
  private source2Marker!: THREE.Mesh;
  
  private boundaryRadius: number;
  private sizeRatio: number;
  
  private sliceTexture: THREE.DataTexture;

  constructor(options: AuxiliaryViewOptions) {
    this.container = options.container;
    this.boundaryRadius = options.boundaryRadius;
    this.sliceTexture = options.sliceTexture;
    this.sizeRatio = options.sizeRatio || 0.25;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.viewContainer = document.createElement('div');
    this.viewContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      border: 2px solid rgba(100, 180, 255, 0.5);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      pointer-events: none;
    `;

    this.canvas = document.createElement('canvas');
    this.viewContainer.appendChild(this.canvas);
    this.container.appendChild(this.viewContainer);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const aspect = 1;
    const viewSize = this.boundaryRadius * 1.2;
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000
    );
    this.camera.position.set(0, 30, 0);
    this.camera.lookAt(0, 0, 0);

    this.createSlicePlane();
    this.createGrid();
    this.createSourceMarkers();
    
    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  private createSlicePlane(): void {
    const planeGeometry = new THREE.PlaneGeometry(
      this.boundaryRadius * 2,
      this.boundaryRadius * 2,
      1,
      1
    );
    
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: this.sliceTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    this.slicePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.slicePlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.slicePlane);
  }

  private createGrid(): void {
    const gridSize = this.boundaryRadius * 2;
    const divisions = 20;
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x64b4ff, 0x2a3a5a);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(this.gridHelper);
  }

  private createSourceMarkers(): void {
    const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    
    const marker1Material = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    this.source1Marker = new THREE.Mesh(markerGeometry, marker1Material);
    this.source1Marker.position.y = 0.5;
    this.scene.add(this.source1Marker);
    
    const marker2Material = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    this.source2Marker = new THREE.Mesh(markerGeometry, marker2Material);
    this.source2Marker.position.y = 0.5;
    this.scene.add(this.source2Marker);
  }

  public setSource1Position(pos: THREE.Vector3): void {
    this.source1Marker.position.set(pos.x, 0.5, pos.z);
  }

  public setSource2Position(pos: THREE.Vector3): void {
    this.source2Marker.position.set(pos.x, 0.5, pos.z);
  }

  public updateSliceTexture(texture: THREE.DataTexture): void {
    this.sliceTexture = texture;
    (this.slicePlane.material as THREE.MeshBasicMaterial).map = texture;
    (this.slicePlane.material as THREE.MeshBasicMaterial).needsUpdate = true;
  }

  private onResize = (): void => {
    this.resize();
  };

  public resize(): void {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    
    const viewSize = Math.min(containerWidth, containerHeight) * this.sizeRatio;
    
    this.viewContainer.style.width = `${viewSize}px`;
    this.viewContainer.style.height = `${viewSize}px`;
    
    this.renderer.setSize(viewSize, viewSize);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    
    this.slicePlane.geometry.dispose();
    (this.slicePlane.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    this.source1Marker.geometry.dispose();
    (this.source1Marker.material as THREE.Material).dispose();
    this.source2Marker.geometry.dispose();
    (this.source2Marker.material as THREE.Material).dispose();
    
    this.renderer.dispose();
    this.viewContainer.remove();
  }
}
