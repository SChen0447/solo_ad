import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public canvas: HTMLCanvasElement;
  
  private targetCameraPos: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private readonly lerpFactor = 0.1;
  
  private readonly initialCameraPos = new THREE.Vector3(0, 2, 6);
  private readonly initialLookAt = new THREE.Vector3(0, 0.5, 0);
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error(`Canvas with id ${canvasId} not found`);
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.initialCameraPos);
    
    this.targetCameraPos = this.initialCameraPos.clone();
    this.targetLookAt = this.initialLookAt.clone();
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.copy(this.initialLookAt);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.setupLighting();
    this.createRoom();
    this.setupResizeHandler();
  }
  
  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xfff4e6, 0.6);
    this.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.bias = -0.001;
    this.scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.4);
    fillLight.position.set(-4, 6, -3);
    this.scene.add(fillLight);
  }
  
  private createRoom(): void {
    const roomWidth = 16;
    const roomDepth = 12;
    const wallHeight = 4;
    
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.6,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    const floorLines = this.createMarbleLines(roomWidth, roomDepth);
    floorLines.rotation.x = -Math.PI / 2;
    floorLines.position.y = 0.001;
    this.scene.add(floorLines);
    
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e6,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, wallHeight),
      wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -roomDepth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, wallHeight),
      wallMaterial
    );
    frontWall.position.set(0, wallHeight / 2, roomDepth / 2);
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);
    
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomDepth, wallHeight),
      wallMaterial
    );
    leftWall.position.set(-roomWidth / 2, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomDepth, wallHeight),
      wallMaterial
    );
    rightWall.position.set(roomWidth / 2, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, roomDepth),
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    ceiling.position.y = wallHeight;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);
  }
  
  private createMarbleLines(width: number, depth: number): THREE.Group {
    const group = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xbfbfbf, transparent: true, opacity: 0.4 });
    
    for (let i = -width / 2; i <= width / 2; i += 2) {
      const points = [
        new THREE.Vector3(i, 0, -depth / 2),
        new THREE.Vector3(i + 0.3, 0, depth / 2)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      group.add(line);
    }
    
    return group;
  }
  
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  public updateMouse(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }
  
  public getIntersects(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }
  
  public resetView(): void {
    this.targetCameraPos.copy(this.initialCameraPos);
    this.targetLookAt.copy(this.initialLookAt);
    this.controls.target.copy(this.initialLookAt);
  }
  
  public update(): void {
    this.camera.position.lerp(this.targetCameraPos, this.lerpFactor);
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  public getCurrentCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }
}
