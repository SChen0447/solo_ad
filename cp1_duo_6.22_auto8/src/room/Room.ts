import * as THREE from 'three';

export interface FloorMaterialParams {
  color: string;
  roughness?: number;
  metalness?: number;
}

export const FLOOR_COLORS: { name: string; value: string }[] = [
  { name: '深灰', value: '#4a4a4a' },
  { name: '橡木', value: '#a67c52' },
  { name: '胡桃木', value: '#5c4033' },
  { name: '米白', value: '#e8e0d5' },
  { name: '炭黑', value: '#2c2c2c' }
];

const DEFAULT_FLOOR_COLOR = '#4a4a4a';

export class Room {
  public group: THREE.Group;
  private floor: THREE.Mesh;
  private floorMaterial: THREE.MeshStandardMaterial;
  private walls: THREE.Group;
  private windows: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: DEFAULT_FLOOR_COLOR,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.FrontSide
    });

    this.floor = this.createFloor();
    this.walls = this.createWalls();
    this.windows = this.createWindows();

    this.group.add(this.floor);
    this.group.add(this.walls);
    this.group.add(this.windows);
  }

  private createFloor(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(12, 10);
    const floor = new THREE.Mesh(geometry, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = 'floor';
    return floor;
  }

  private createWalls(): THREE.Group {
    const walls = new THREE.Group();
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: '#f5f5f5',
      roughness: 0.9,
      metalness: 0.0
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6),
      wallMaterial
    );
    backWall.position.set(0, 3, -5);
    backWall.receiveShadow = true;
    backWall.name = 'backWall';

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      wallMaterial
    );
    leftWall.position.set(-6, 3, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.name = 'leftWall';

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      wallMaterial
    );
    rightWall.position.set(6, 3, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.name = 'rightWall';

    walls.add(backWall, leftWall, rightWall);
    return walls;
  }

  private createWindows(): THREE.Group {
    const windows = new THREE.Group();

    const windowFrameMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.5
    });

    const windowGlassMaterial = new THREE.MeshStandardMaterial({
      color: '#87ceeb',
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4
    });

    const windowWidth = 2.5;
    const windowHeight = 2;
    const frameThickness = 0.1;

    const createWindow = (x: number, y: number, z: number, rotY: number) => {
      const windowGroup = new THREE.Group();

      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(windowWidth, windowHeight),
        windowGlassMaterial
      );
      windowGroup.add(glass);

      const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameThickness),
        windowFrameMaterial
      );
      topFrame.position.y = windowHeight / 2;
      windowGroup.add(topFrame);

      const bottomFrame = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameThickness),
        windowFrameMaterial
      );
      bottomFrame.position.y = -windowHeight / 2;
      windowGroup.add(bottomFrame);

      const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, windowHeight, frameThickness),
        windowFrameMaterial
      );
      leftFrame.position.x = -windowWidth / 2;
      windowGroup.add(leftFrame);

      const rightFrame = new THREE.Mesh(
        new THREE.BoxGeometry(frameThickness, windowHeight, frameThickness),
        windowFrameMaterial
      );
      rightFrame.position.x = windowWidth / 2;
      windowGroup.add(rightFrame);

      windowGroup.position.set(x, y, z);
      windowGroup.rotation.y = rotY;
      return windowGroup;
    };

    windows.add(createWindow(-2.5, 3.5, -4.95, 0));
    windows.add(createWindow(2.5, 3.5, -4.95, 0));

    return windows;
  }

  public setFloorMaterial(params: FloorMaterialParams): void {
    const { color, roughness, metalness } = params;

    if (color !== undefined) {
      this.floorMaterial.color.set(color);
    }
    if (roughness !== undefined) {
      this.floorMaterial.roughness = roughness;
    }
    if (metalness !== undefined) {
      this.floorMaterial.metalness = metalness;
    }

    this.floorMaterial.needsUpdate = true;
  }

  public getFloorColor(): string {
    return '#' + this.floorMaterial.color.getHexString();
  }

  public getFloorMaterialName(): string {
    const hex = '#' + this.floorMaterial.color.getHexString();
    const found = FLOOR_COLORS.find(c => c.value.toLowerCase() === hex.toLowerCase());
    return found ? found.name : '自定义';
  }

  public reset(): void {
    this.setFloorMaterial({
      color: DEFAULT_FLOOR_COLOR,
      roughness: 0.7,
      metalness: 0.1
    });
  }
}
