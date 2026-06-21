import * as THREE from 'three';
import { TreeGenerator, TreeData, TreeParams, TreeType } from './treeGenerator';

export interface TreeInstance {
  data: TreeData;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
  nextData: TreeData | null;
  morphProgress: number;
  isMorphing: boolean;
  baseScale: number;
}

export class ForestScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private treeGenerator: TreeGenerator;
  private trees: TreeInstance[] = [];
  private treeCount: number = 40;
  private forestRadius: number = 30;
  
  private keys: Set<string> = new Set();
  private moveSpeed: number = 5;
  private baseMoveSpeed: number = 5;
  private yaw: number = 0;
  private pitch: number = 0;
  private isPointerLocked: boolean = false;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  
  private ground: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private currentSpeed: number = 0;
  
  private speedMultiplier: number = 1;
  private minSpeedMultiplier: number = 0.5;
  private maxSpeedMultiplier: number = 3;
  
  private container: HTMLElement;
  private onSpeedChange: ((speed: number) => void) | null = null;
  private onTreeCountChange: ((count: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.015);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 10);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    container.appendChild(this.renderer.domElement);
    
    this.treeGenerator = new TreeGenerator();
    
    this.setupLights();
    this.setupGround();
    this.setupEventListeners();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);
    
    this.sunLight = new THREE.DirectionalLight(0xffcc80, 1.0);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    
    this.directionalLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    this.directionalLight.position.set(-30, 40, -20);
    this.scene.add(this.directionalLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const positions = groundGeometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = (Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 
                 Math.sin(x * 0.05 + y * 0.05) * 0.3);
      positions.setZ(i, z);
    }
    
    groundGeometry.computeVertexNormals();
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d4a1c,
      roughness: 0.9,
      metalness: 0.1
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('wheel', this.onWheel.bind(this));
    
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
  }

  private onClick(): void {
    if (!this.isPointerLocked) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.speedMultiplier = Math.max(
      this.minSpeedMultiplier,
      Math.min(this.maxSpeedMultiplier, this.speedMultiplier + delta)
    );
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      this.yaw -= e.movementX * 0.002;
      this.pitch -= e.movementY * 0.002;
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
    } else if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.yaw -= deltaX * 0.005;
      this.pitch -= deltaY * 0.005;
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  generateForest(params: TreeParams): void {
    this.clearTrees();
    
    for (let i = 0; i < this.treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * this.forestRadius;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const treeData = this.treeGenerator.generateTree(params);
      const scale = 0.8 + Math.random() * 0.6;
      const rotation = Math.random() * Math.PI * 2;
      
      treeData.group.position.set(x, 0, z);
      treeData.group.rotation.y = rotation;
      treeData.group.scale.setScalar(scale);
      treeData.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      this.scene.add(treeData.group);
      
      this.trees.push({
        data: treeData,
        position: new THREE.Vector3(x, 0, z),
        rotation,
        scale,
        nextData: null,
        morphProgress: 1,
        isMorphing: false,
        baseScale: scale
      });
    }
    
    if (this.onTreeCountChange) {
      this.onTreeCountChange(this.treeCount);
    }
  }

  morphToNewType(newParams: TreeParams): void {
    this.trees.forEach((tree) => {
      if (tree.isMorphing && tree.nextData) {
        tree.data.group.visible = true;
        tree.data.group.scale.setScalar(tree.baseScale);
        this.scene.remove(tree.nextData.group);
        this.disposeTreeData(tree.nextData);
        tree.nextData = null;
      }
      
      const newTreeData = this.treeGenerator.generateTree(newParams);
      newTreeData.group.position.copy(tree.position);
      newTreeData.group.rotation.y = tree.rotation;
      newTreeData.group.scale.setScalar(0);
      newTreeData.group.visible = false;
      newTreeData.group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      this.scene.add(newTreeData.group);
      
      tree.nextData = newTreeData;
      tree.isMorphing = true;
      tree.morphProgress = 0;
    });
  }

  updateForestParams(params: TreeParams): void {
    this.morphToNewType(params);
  }

  private clearTrees(): void {
    this.trees.forEach(tree => {
      this.scene.remove(tree.data.group);
      this.disposeTreeData(tree.data);
      if (tree.nextData) {
        this.scene.remove(tree.nextData.group);
        this.disposeTreeData(tree.nextData);
      }
    });
    this.trees = [];
  }

  private disposeTreeData(treeData: TreeData): void {
    treeData.trunkGeometry.dispose();
    treeData.branchGeometry.dispose();
    treeData.crownGeometry.dispose();
    treeData.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  update(deltaTime: number, time: number): void {
    this.updateCamera(deltaTime);
    this.updateMorph(deltaTime);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(deltaTime: number): void {
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    let moveX = 0;
    let moveZ = 0;
    let moveY = 0;
    
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
    if (this.keys.has('Space')) moveY += 1;
    if (this.keys.has('ShiftLeft')) moveY -= 1;
    
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, -moveZ);
    moveDir.addScaledVector(right, moveX);
    moveDir.y = moveY;
    
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.velocity.lerp(moveDir.multiplyScalar(this.moveSpeed * this.speedMultiplier), 0.1);
    } else {
      this.velocity.multiplyScalar(0.9);
    }
    
    this.currentSpeed = this.velocity.length();
    
    if (this.onSpeedChange) {
      this.onSpeedChange(this.currentSpeed);
    }
    
    this.camera.position.addScaledVector(this.velocity, deltaTime);
    
    if (this.camera.position.y < 1.5) {
      this.camera.position.y = 1.5;
    }
    
    const dist = Math.sqrt(
      this.camera.position.x ** 2 + this.camera.position.z ** 2
    );
    if (dist > this.forestRadius - 5) {
      const scale = (this.forestRadius - 5) / dist;
      this.camera.position.x *= scale;
      this.camera.position.z *= scale;
    }
    
    const lookAt = this.camera.position.clone().add(forward);
    this.camera.lookAt(lookAt);
  }

  private updateMorph(deltaTime: number): void {
    const morphSpeed = 1 / 0.8;
    
    this.trees.forEach(tree => {
      if (!tree.isMorphing || !tree.nextData) return;
      
      tree.morphProgress += deltaTime * morphSpeed;
      
      if (tree.morphProgress >= 1) {
        this.scene.remove(tree.data.group);
        this.disposeTreeData(tree.data);
        
        tree.data = tree.nextData;
        tree.data.group.scale.setScalar(tree.baseScale);
        tree.nextData = null;
        tree.morphProgress = 1;
        tree.isMorphing = false;
        return;
      }
      
      const t = this.easeInOutCubic(tree.morphProgress);
      const halfT = 0.5;
      
      if (t < halfT) {
        const fadeOutT = t / halfT;
        const outScale = tree.baseScale * (1 - this.easeInCubic(fadeOutT));
        tree.data.group.scale.setScalar(Math.max(0, outScale));
      } else {
        if (!tree.nextData.group.visible) {
          tree.nextData.group.visible = true;
        }
        tree.data.group.scale.setScalar(0);
        
        const fadeInT = (t - halfT) / halfT;
        const inScale = tree.baseScale * this.easeOutCubic(fadeInT);
        tree.nextData.group.scale.setScalar(Math.min(tree.baseScale, inScale));
      }
    });
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getTreeCount(): number {
    return this.trees.length;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  setOnSpeedChange(callback: (speed: number) => void): void {
    this.onSpeedChange = callback;
  }

  setOnTreeCountChange(callback: (count: number) => void): void {
    this.onTreeCountChange = callback;
  }

  getSunLight(): THREE.DirectionalLight | null {
    return this.sunLight;
  }

  getAmbientLight(): THREE.AmbientLight | null {
    return this.ambientLight;
  }

  getTrees(): TreeInstance[] {
    return this.trees;
  }

  dispose(): void {
    this.clearTrees();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
