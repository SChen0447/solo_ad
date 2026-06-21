import * as THREE from 'three';
import { Artwork } from './types';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public raycaster: THREE.Raycaster;
  public pointer: THREE.Vector2;
  
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLights: THREE.PointLight[] = [];
  private interactiveObjects: THREE.Object3D[] = [];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.6, 3);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.setupLights();
    this.setupRoom();
    this.setupResizeHandler(container);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    const lightPositions = [
      new THREE.Vector3(-3, 3, -3),
      new THREE.Vector3(3, 3, -3),
      new THREE.Vector3(-3, 3, 3),
      new THREE.Vector3(3, 3, 3)
    ];

    lightPositions.forEach((pos) => {
      const pointLight = new THREE.PointLight(0xfff5e6, 0.8, 15);
      pointLight.position.copy(pos);
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 1024;
      pointLight.shadow.mapSize.height = 1024;
      pointLight.shadow.camera.near = 0.5;
      pointLight.shadow.camera.far = 15;
      pointLight.shadow.bias = -0.001;
      this.scene.add(pointLight);
      this.pointLights.push(pointLight);
    });
  }

  private setupRoom(): void {
    const roomSize = 10;
    const wallHeight = 4;

    const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a9a9a,
      roughness: 0.7,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e6,
      roughness: 0.9,
      metalness: 0.0
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, wallHeight),
      wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -roomSize / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, wallHeight),
      wallMaterial
    );
    frontWall.position.set(0, wallHeight / 2, roomSize / 2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, wallHeight),
      wallMaterial
    );
    leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, wallHeight),
      wallMaterial
    );
    rightWall.position.set(roomSize / 2, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.9,
      metalness: 0.0
    });
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, roomSize),
      ceilingMaterial
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    this.scene.add(ceiling);
  }

  private setupResizeHandler(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  public registerInteractiveObject(object: THREE.Object3D): void {
    this.interactiveObjects.push(object);
  }

  public registerArtworks(artworks: Artwork[]): void {
    artworks.forEach((artwork) => {
      this.scene.add(artwork.mesh);
      this.registerInteractiveObject(artwork.mesh);
    });
  }

  public updatePointer(clientX: number, clientY: number, container: HTMLElement): void {
    this.pointer.x = (clientX / container.clientWidth) * 2 - 1;
    this.pointer.y = -(clientY / container.clientHeight) * 2 + 1;
  }

  public getIntersectedObjects(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.interactiveObjects, true);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
