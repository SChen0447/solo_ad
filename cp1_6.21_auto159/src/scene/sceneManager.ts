import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextureFader } from './textureFader';
import { RenderSnapshot } from './renderSnapshot';
import { getMaterialById, AREAS, DEFAULT_MATERIAL_MAP } from '../data/materials';
import type { AreaId, SnapshotData, MaterialConfig } from '../types';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private textureFader: TextureFader;
  private renderSnapshot: RenderSnapshot;
  private areaMeshes: Map<string, THREE.Mesh> = new Map();
  private currentMaterials: Map<string, string> = new Map();
  private onMaterialChange: ((snapshot: SnapshotData) => void) | null = null;
  private animationId: number = 0;
  private isAnimating: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0.5, 0);
    
    this.textureFader = new TextureFader(this.onFadeComplete.bind(this));
    this.renderSnapshot = new RenderSnapshot(this.renderer);
    this.textureFader.setRenderSnapshot(this.renderSnapshot);
    
    this.currentMaterials = new Map(Object.entries(DEFAULT_MATERIAL_MAP));
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  public buildScene(): void {
    this.setupLighting();
    this.createFloor();
    this.createWalls();
    this.createSofa();
    this.createCurtains();
    this.createCoffeeTable();
    
    this.camera.position.set(5, 4, 6);
    this.controls.update();
    
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffeecc, 0.2);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);
  }

  private createFloor(): void {
    const geometry = new THREE.PlaneGeometry(10, 10);
    const materialConfig = getMaterialById(DEFAULT_MATERIAL_MAP.floor)!;
    const material = new THREE.MeshStandardMaterial({
      color: materialConfig.color,
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
    });
    
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    
    this.scene.add(floor);
    this.areaMeshes.set('floor', floor);
    this.textureFader.registerAreaMesh('floor', floor);
  }

  private createWalls(): void {
    const wallHeight = 3.5;
    const wallWidth = 10;
    const materialConfig = getMaterialById(DEFAULT_MATERIAL_MAP.wall)!;
    
    const backWallGeo = new THREE.PlaneGeometry(wallWidth, wallHeight);
    const wallMat = new THREE.MeshStandardMaterial({
      color: materialConfig.color,
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
      side: THREE.DoubleSide,
    });
    
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, wallHeight / 2, -5);
    backWall.receiveShadow = true;
    backWall.name = 'wall';
    
    const leftWallGeo = new THREE.PlaneGeometry(wallWidth, wallHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat.clone());
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-5, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    
    this.scene.add(backWall);
    this.scene.add(leftWall);
    
    const wallGroup = new THREE.Group();
    wallGroup.name = 'wall_group';
    
    this.areaMeshes.set('wall', backWall);
    this.textureFader.registerAreaMesh('wall', backWall);
  }

  private createSofa(): void {
    const materialConfig = getMaterialById(DEFAULT_MATERIAL_MAP.sofa)!;
    const sofaMaterial = new THREE.MeshStandardMaterial({
      color: materialConfig.color,
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
    });
    
    const sofaGroup = new THREE.Group();
    sofaGroup.name = 'sofa';
    
    const baseWidth = 2.5;
    const baseDepth = 0.9;
    const baseHeight = 0.35;
    const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const base = new THREE.Mesh(baseGeo, sofaMaterial);
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    sofaGroup.add(base);
    
    const backHeight = 0.6;
    const backGeo = new THREE.BoxGeometry(baseWidth, backHeight, 0.15);
    const back = new THREE.Mesh(backGeo, sofaMaterial.clone());
    back.position.set(0, baseHeight + backHeight / 2 - 0.05, -baseDepth / 2 + 0.075);
    back.castShadow = true;
    back.receiveShadow = true;
    sofaGroup.add(back);
    
    const cushionGeo = new THREE.BoxGeometry(0.75, 0.15, 0.65);
    for (let i = -1; i <= 1; i++) {
      const cushion = new THREE.Mesh(cushionGeo, sofaMaterial.clone());
      cushion.position.set(i * 0.8, baseHeight + 0.075, 0.05);
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      sofaGroup.add(cushion);
    }
    
    const armGeo = new THREE.BoxGeometry(0.18, 0.5, baseDepth);
    const leftArm = new THREE.Mesh(armGeo, sofaMaterial.clone());
    leftArm.position.set(-baseWidth / 2 + 0.09, baseHeight + 0.25, 0);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    sofaGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, sofaMaterial.clone());
    rightArm.position.set(baseWidth / 2 - 0.09, baseHeight + 0.25, 0);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    sofaGroup.add(rightArm);
    
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 16);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.6 });
    const legPositions = [
      [-baseWidth / 2 + 0.12, 0.075, -baseDepth / 2 + 0.12],
      [baseWidth / 2 - 0.12, 0.075, -baseDepth / 2 + 0.12],
      [-baseWidth / 2 + 0.12, 0.075, baseDepth / 2 - 0.12],
      [baseWidth / 2 - 0.12, 0.075, baseDepth / 2 - 0.12],
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      sofaGroup.add(leg);
    });
    
    sofaGroup.position.set(0, 0, -3);
    this.scene.add(sofaGroup);
    
    this.areaMeshes.set('sofa', base);
    this.textureFader.registerAreaMesh('sofa', base);
    
    sofaGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== base) {
        child.material = base.material;
      }
    });
  }

  private createCurtains(): void {
    const materialConfig = getMaterialById(DEFAULT_MATERIAL_MAP.curtain)!;
    const curtainMaterial = new THREE.MeshStandardMaterial({
      color: materialConfig.color,
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
      side: THREE.DoubleSide,
    });
    
    const curtainGroup = new THREE.Group();
    curtainGroup.name = 'curtain';
    
    const curtainWidth = 1.2;
    const curtainHeight = 3.0;
    
    const curtainShape = new THREE.Shape();
    const segments = 10;
    const depth = 0.15;
    
    curtainShape.moveTo(-curtainWidth / 2, 0);
    
    for (let i = 0; i <= segments; i++) {
      const x = -curtainWidth / 2 + (curtainWidth * i) / segments;
      const y = Math.sin(i * 0.8) * depth * 0.5;
      curtainShape.lineTo(x, y);
    }
    
    const extrudeSettings = {
      steps: 1,
      depth: curtainHeight,
      bevelEnabled: false,
    };
    
    const curtainGeo = new THREE.ExtrudeGeometry(curtainShape, extrudeSettings);
    curtainGeo.rotateX(-Math.PI / 2);
    
    const leftCurtain = new THREE.Mesh(curtainGeo, curtainMaterial);
    leftCurtain.position.set(-4, 0.3, -4.9);
    leftCurtain.castShadow = true;
    leftCurtain.receiveShadow = true;
    curtainGroup.add(leftCurtain);
    
    const rightCurtain = new THREE.Mesh(curtainGeo, curtainMaterial.clone());
    rightCurtain.position.set(4, 0.3, -4.9);
    rightCurtain.castShadow = true;
    rightCurtain.receiveShadow = true;
    curtainGroup.add(rightCurtain);
    
    const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 7.5, 16);
    const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.5, metalness: 0.3 });
    const rod = new THREE.Mesh(rodGeo, rodMaterial);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 3.1, -4.9);
    curtainGroup.add(rod);
    
    this.scene.add(curtainGroup);
    
    this.areaMeshes.set('curtain', leftCurtain);
    this.textureFader.registerAreaMesh('curtain', leftCurtain);
  }

  private createCoffeeTable(): void {
    const materialConfig = getMaterialById(DEFAULT_MATERIAL_MAP.table)!;
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: materialConfig.color,
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
    });
    
    const tableGroup = new THREE.Group();
    tableGroup.name = 'table';
    
    const tableTopGeo = new THREE.BoxGeometry(1.5, 0.06, 0.8);
    const tableTop = new THREE.Mesh(tableTopGeo, tableMaterial);
    tableTop.position.y = 0.45;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);
    
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.42, 16);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.7 });
    
    const legPositions = [
      [-0.65, 0.24, -0.3],
      [0.65, 0.24, -0.3],
      [-0.65, 0.24, 0.3],
      [0.65, 0.24, 0.3],
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      tableGroup.add(leg);
    });
    
    tableGroup.position.set(0.5, 0, -1);
    this.scene.add(tableGroup);
    
    this.areaMeshes.set('table', tableTop);
    this.textureFader.registerAreaMesh('table', tableTop);
  }

  public async switchMaterial(areaId: AreaId, materialId: string): Promise<void> {
    if (this.isAnimating) return;
    
    const materialConfig = getMaterialById(materialId);
    if (!materialConfig) return;
    
    const areaConfig = AREAS.find(a => a.id === areaId);
    if (!areaConfig) return;
    
    const beforeSnapshot = this.renderSnapshot.capture();
    
    this.isAnimating = true;
    
    await this.textureFader.animateTextureFade(areaId, materialConfig, 1000);
    
    this.currentMaterials.set(areaId, materialId);
    
    const afterSnapshot = this.renderSnapshot.capture();
    
    const snapshotData: SnapshotData = {
      before: beforeSnapshot,
      after: afterSnapshot,
      areaId,
      materialId,
      areaName: areaConfig.name,
      materialName: materialConfig.name,
    };
    
    if (this.onMaterialChange) {
      this.onMaterialChange(snapshotData);
    }
    
    this.isAnimating = false;
  }

  private onFadeComplete(areaId: string): void {
    // 动画完成后的回调
  }

  public async resetAllMaterials(): Promise<void> {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const beforeSnapshot = this.renderSnapshot.capture();
    
    await this.textureFader.fadeAllOut(250);
    
    const defaultMaterial = getMaterialById('default-white')!;
    const resetPromises = AREAS.map(area => 
      this.textureFader.animateTextureFade(area.id as AreaId, defaultMaterial, 0)
    );
    await Promise.all(resetPromises);
    
    AREAS.forEach(area => {
      this.currentMaterials.set(area.id, 'default-white');
    });
    
    await this.textureFader.fadeAllIn(250);
    
    const afterSnapshot = this.renderSnapshot.capture();
    
    const snapshotData: SnapshotData = {
      before: beforeSnapshot,
      after: afterSnapshot,
      areaId: 'all',
      materialId: 'default-white',
      areaName: '全部区域',
      materialName: '默认哑光白',
    };
    
    if (this.onMaterialChange) {
      this.onMaterialChange(snapshotData);
    }
    
    this.isAnimating = false;
  }

  public setOnMaterialChange(callback: (snapshot: SnapshotData) => void): void {
    this.onMaterialChange = callback;
  }

  public getCurrentMaterial(areaId: string): string | undefined {
    return this.currentMaterials.get(areaId);
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.textureFader.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.controls.dispose();
    this.textureFader.dispose();
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
