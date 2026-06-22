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

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.4,
      metalness: 0.6
    });

    const windowGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#a8d4e6',
      roughness: 0.05,
      metalness: 0.0,
      transparent: true,
      opacity: 0.35,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.45,
      envMapIntensity: 1.0
    });

    const windowSillMaterial = new THREE.MeshStandardMaterial({
      color: '#f0f0f0',
      roughness: 0.3,
      metalness: 0.5
    });

    const windowWidth = 2.5;
    const windowHeight = 2;
    const outerFrameThickness = 0.15;
    const innerMullionThickness = 0.08;
    const glassThickness = 0.02;

    const createWindow = (x: number, y: number, z: number, rotY: number) => {
      const windowGroup = new THREE.Group();

      const glassGroup = new THREE.Group();

      const outerTop = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth + outerFrameThickness * 2, outerFrameThickness, outerFrameThickness),
        frameMaterial
      );
      outerTop.position.y = windowHeight / 2 + outerFrameThickness / 2;
      outerTop.castShadow = true;
      glassGroup.add(outerTop);

      const outerBottom = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth + outerFrameThickness * 2, outerFrameThickness, outerFrameThickness),
        frameMaterial
      );
      outerBottom.position.y = -windowHeight / 2 - outerFrameThickness / 2;
      outerBottom.castShadow = true;
      glassGroup.add(outerBottom);

      const outerLeft = new THREE.Mesh(
        new THREE.BoxGeometry(outerFrameThickness, windowHeight + outerFrameThickness * 2, outerFrameThickness),
        frameMaterial
      );
      outerLeft.position.x = -windowWidth / 2 - outerFrameThickness / 2;
      outerLeft.castShadow = true;
      glassGroup.add(outerLeft);

      const outerRight = new THREE.Mesh(
        new THREE.BoxGeometry(outerFrameThickness, windowHeight + outerFrameThickness * 2, outerFrameThickness),
        frameMaterial
      );
      outerRight.position.x = windowWidth / 2 + outerFrameThickness / 2;
      outerRight.castShadow = true;
      glassGroup.add(outerRight);

      const mullionV = new THREE.Mesh(
        new THREE.BoxGeometry(innerMullionThickness, windowHeight, outerFrameThickness),
        frameMaterial
      );
      mullionV.position.x = 0;
      mullionV.position.z = outerFrameThickness / 2 - 0.01;
      mullionV.castShadow = true;
      glassGroup.add(mullionV);

      const mullionH = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, innerMullionThickness, outerFrameThickness),
        frameMaterial
      );
      mullionH.position.y = 0;
      mullionH.position.z = outerFrameThickness / 2 - 0.01;
      mullionH.castShadow = true;
      glassGroup.add(mullionH);

      for (let quadrant = 0; quadrant < 4; quadrant++) {
        const quadX = quadrant % 2 === 0 ? -windowWidth / 4 : windowWidth / 4;
        const quadY = quadrant < 2 ? windowHeight / 4 : -windowHeight / 4;

        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(windowWidth / 2 - innerMullionThickness, windowHeight / 2 - innerMullionThickness, glassThickness),
          windowGlassMaterial
        );
        glassPane.position.set(quadX, quadY, 0);
        glassGroup.add(glassPane);
      }

      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth + outerFrameThickness * 2 + 0.2, 0.1, 0.4),
        windowSillMaterial
      );
      sill.position.set(0, -windowHeight / 2 - outerFrameThickness - 0.05, 0.2);
      sill.castShadow = true;
      sill.receiveShadow = true;
      windowGroup.add(sill);

      const sillFront = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth + outerFrameThickness * 2 + 0.2, 0.05, 0.05),
        frameMaterial
      );
      sillFront.position.set(0, -windowHeight / 2 - outerFrameThickness - 0.125, 0.425);
      sillFront.castShadow = true;
      windowGroup.add(sillFront);

      windowGroup.add(glassGroup);

      windowGroup.position.set(x, y, z);
      windowGroup.rotation.y = rotY;
      return windowGroup;
    };

    windows.add(createWindow(-2.5, 3.5, -4.9, 0));
    windows.add(createWindow(2.5, 3.5, -4.9, 0));

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
