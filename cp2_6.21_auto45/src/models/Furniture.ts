import * as THREE from 'three';

export type FurnitureType = 'sofa' | 'coffeeTable' | 'floorLamp' | 'bookshelf' | 'carpet';

export interface FurnitureConfig {
  type: FurnitureType;
  name: string;
  size: THREE.Vector3;
  color: string;
  iconColor: string;
}

export const FURNITURE_CONFIGS: Record<FurnitureType, FurnitureConfig> = {
  sofa: {
    type: 'sofa',
    name: '单人沙发',
    size: new THREE.Vector3(1.2, 0.8, 0.9),
    color: '#8B4513',
    iconColor: '#D32F2F'
  },
  coffeeTable: {
    type: 'coffeeTable',
    name: '茶几',
    size: new THREE.Vector3(1.0, 0.5, 0.5),
    color: '#5D4037',
    iconColor: '#5D4037'
  },
  floorLamp: {
    type: 'floorLamp',
    name: '落地灯',
    size: new THREE.Vector3(0.4, 1.6, 0.4),
    color: '#FFB300',
    iconColor: '#FFB300'
  },
  bookshelf: {
    type: 'bookshelf',
    name: '书架',
    size: new THREE.Vector3(0.8, 2.0, 0.3),
    color: '#4E342E',
    iconColor: '#4E342E'
  },
  carpet: {
    type: 'carpet',
    name: '地毯',
    size: new THREE.Vector3(1.5, 0.02, 1.0),
    color: '#0288D1',
    iconColor: '#0288D1'
  }
};

let furnitureId = 0;

export class Furniture {
  public id: number;
  public type: FurnitureType;
  public group: THREE.Group;
  public meshes: THREE.Object3D[] = [];
  public size: THREE.Vector3;
  public boundingBox: THREE.Box3;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public scale: THREE.Vector3;
  public config: FurnitureConfig;

  constructor(type: FurnitureType) {
    this.id = ++furnitureId;
    this.type = type;
    this.config = FURNITURE_CONFIGS[type];
    this.size = this.config.size.clone();
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.group = new THREE.Group();
    this.boundingBox = new THREE.Box3();

    this.buildGeometry();
  }

  private buildGeometry(): void {
    switch (this.type) {
      case 'sofa':
        this.buildSofa();
        break;
      case 'coffeeTable':
        this.buildCoffeeTable();
        break;
      case 'floorLamp':
        this.buildFloorLamp();
        break;
      case 'bookshelf':
        this.buildBookshelf();
        break;
      case 'carpet':
        this.buildCarpet();
        break;
    }

    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        (child as any).userData.furnitureRef = this;
        this.meshes.push(child);
      }
    });

    this.group.userData.furnitureRef = this;
    this.updateBoundingBox();
  }

  private buildSofa(): void {
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.85 });

    const baseWidth = 1.2, baseHeight = 0.3, baseDepth = 0.9;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
      darkMat
    );
    base.position.y = baseHeight / 2;
    this.group.add(base);

    const seatHeight = 0.2;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(baseWidth - 0.1, seatHeight, baseDepth - 0.05),
      cushionMat
    );
    seat.position.y = baseHeight + seatHeight / 2;
    this.group.add(seat);

    const backHeight = 0.5;
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(baseWidth - 0.05, backHeight, 0.15),
      cushionMat
    );
    back.position.set(0, baseHeight + seatHeight + backHeight / 2 - 0.05, -baseDepth / 2 + 0.075);
    this.group.add(back);

    const armHeight = 0.4;
    const armWidth = 0.12;
    const armLeft = new THREE.Mesh(
      new THREE.BoxGeometry(armWidth, armHeight, baseDepth - 0.05),
      cushionMat
    );
    armLeft.position.set(-baseWidth / 2 + armWidth / 2, baseHeight + seatHeight + armHeight / 2 - 0.05, 0);
    this.group.add(armLeft);

    const armRight = armLeft.clone();
    armRight.position.x = baseWidth / 2 - armWidth / 2;
    this.group.add(armRight);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.9 });
    const legSize = 0.08;
    const legPositions = [
      [-baseWidth / 2 + legSize, legSize / 2, -baseDepth / 2 + legSize / 2],
      [baseWidth / 2 - legSize, legSize / 2, -baseDepth / 2 + legSize / 2],
      [-baseWidth / 2 + legSize, legSize / 2, baseDepth / 2 - legSize / 2],
      [baseWidth / 2 - legSize, legSize / 2, baseDepth / 2 - legSize / 2]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legSize / 2, legSize / 2, baseHeight - 0.02, 8),
        legMat
      );
      leg.position.set(pos[0], (baseHeight - 0.02) / 2, pos[2]);
      this.group.add(leg);
    });
  }

  private buildCoffeeTable(): void {
    const topMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7, metalness: 0.05 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.8 });

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.05, 0.5),
      topMat
    );
    top.position.y = 0.45;
    this.group.add(top);

    const legRadius = 0.03;
    const legHeight = 0.45;
    const legPositions = [
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 12),
        legMat
      );
      leg.position.set(pos[0] * 1.0, legHeight / 2, pos[1] * 0.5);
      this.group.add(leg);
    });

    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.03, 0.4),
      topMat
    );
    shelf.position.y = 0.2;
    this.group.add(shelf);
  }

  private buildFloorLamp(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x424242, metalness: 0.6, roughness: 0.4 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x424242, metalness: 0.3, roughness: 0.5 });
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8E1,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.0,
      emissive: 0xfff8e1,
      emissiveIntensity: 0.2
    });

    const baseRadius = 0.15;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(baseRadius, baseRadius * 1.2, 0.04, 32),
      baseMat
    );
    base.position.y = 0.02;
    this.group.add(base);

    const poleRadius = 0.02;
    const poleHeight = 1.3;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 16),
      poleMat
    );
    pole.position.y = 0.04 + poleHeight / 2;
    this.group.add(pole);

    const armLength = 0.15;
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, armLength, 12),
      poleMat
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.set(armLength / 2 - 0.05, 0.04 + poleHeight, 0);
    this.group.add(arm);

    const shadeTop = 0.1;
    const shadeBottom = 0.18;
    const shadeHeight = 0.25;
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(shadeTop, shadeBottom, shadeHeight, 32, 1, true),
      shadeMat
    );
    shade.position.set(arm.position.x + armLength / 2 - 0.03, 0.04 + poleHeight - shadeHeight / 2 - 0.02, 0);
    this.group.add(shade);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe4b5,
      emissiveIntensity: 0.8
    });
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      bulbMat
    );
    bulb.position.set(shade.position.x, shade.position.y - 0.05, 0);
    this.group.add(bulb);
  }

  private buildBookshelf(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4E342E, roughness: 0.85 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.9 });
    const bookColors = [0xE53935, 0x1565C0, 0x2E7D32, 0xF9A825, 0x6A1B9A, 0x00838F, 0xAD1457, 0x4527A0];

    const shelfWidth = 0.8;
    const shelfHeight = 2.0;
    const shelfDepth = 0.3;
    const panelThickness = 0.02;

    const leftPanel = new THREE.Mesh(
      new THREE.BoxGeometry(panelThickness, shelfHeight, shelfDepth),
      woodMat
    );
    leftPanel.position.set(-shelfWidth / 2 + panelThickness / 2, shelfHeight / 2, 0);
    this.group.add(leftPanel);

    const rightPanel = leftPanel.clone();
    rightPanel.position.x = shelfWidth / 2 - panelThickness / 2;
    this.group.add(rightPanel);

    const numShelves = 5;
    for (let i = 0; i < numShelves; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(shelfWidth - panelThickness * 2, panelThickness, shelfDepth),
        woodMat
      );
      const y = (i + 1) * (shelfHeight / numShelves) - panelThickness / 2;
      shelf.position.y = y;
      this.group.add(shelf);
    }

    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(shelfWidth - panelThickness * 2, shelfHeight, panelThickness),
      backMat
    );
    backPanel.position.set(0, shelfHeight / 2, -shelfDepth / 2 + panelThickness / 2);
    this.group.add(backPanel);

    const bookHeight = 0.3;
    for (let i = 0; i < numShelves - 1; i++) {
      const shelfY = (i + 1) * (shelfHeight / numShelves) - panelThickness;
      const booksOnShelf = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < booksOnShelf; j++) {
        const bookW = 0.03 + Math.random() * 0.03;
        const bookH = bookHeight * (0.8 + Math.random() * 0.2);
        const bookD = shelfDepth * 0.8;

        const bookColor = bookColors[Math.floor(Math.random() * bookColors.length)];
        const bookMat = new THREE.MeshStandardMaterial({ color: bookColor, roughness: 0.9 });

        const book = new THREE.Mesh(
          new THREE.BoxGeometry(bookW, bookH, bookD),
          bookMat
        );
        book.position.set(
          -shelfWidth / 2 + panelThickness + 0.02 + (j + 0.5) * ((shelfWidth - panelThickness * 2 - 0.04) / booksOnShelf),
          shelfY + bookH / 2,
          0
        );
        this.group.add(book);
      }
    }
  }

  private buildCarpet(): void {
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x0288D1,
      roughness: 1.0,
      metalness: 0
    });

    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.02, 1.0),
      carpetMat
    );
    carpet.position.y = 0.01;
    this.group.add(carpet);

    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x01579B,
      roughness: 1.0
    });

    const borderThickness = 0.06;
    const borderY = 0.011;

    const borderFront = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.005, borderThickness),
      borderMat
    );
    borderFront.position.set(0, borderY, 0.5 - borderThickness / 2);
    this.group.add(borderFront);

    const borderBack = borderFront.clone();
    borderBack.position.z = -0.5 + borderThickness / 2;
    this.group.add(borderBack);

    const borderLeft = new THREE.Mesh(
      new THREE.BoxGeometry(borderThickness, 0.005, 1.0 - borderThickness * 2),
      borderMat
    );
    borderLeft.position.set(-0.75 + borderThickness / 2, borderY, 0);
    this.group.add(borderLeft);

    const borderRight = borderLeft.clone();
    borderRight.position.x = 0.75 - borderThickness / 2;
    this.group.add(borderRight);

    const patternMat = new THREE.MeshStandardMaterial({
      color: 0x81D4FA,
      roughness: 1.0
    });

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const pattern = new THREE.Mesh(
          new THREE.CircleGeometry(0.08, 16),
          patternMat
        );
        pattern.rotation.x = -Math.PI / 2;
        pattern.position.set(
          -0.5 + i * 0.5,
          0.012,
          -0.25 + j * 0.5
        );
        this.group.add(pattern);
      }
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.group.position.set(x, y, z);
    this.updateBoundingBox();
  }

  public setRotation(x: number, y: number, z: number): void {
    this.rotation.set(x, y, z);
    this.group.rotation.set(x, y, z);
    this.updateBoundingBox();
  }

  public setScale(x: number, y: number, z: number): void {
    this.scale.set(x, y, z);
    this.group.scale.set(x, y, z);
    this.size.set(this.config.size.x * x, this.config.size.y * y, this.config.size.z * z);
    this.updateBoundingBox();
  }

  public updateBoundingBox(): void {
    this.boundingBox.setFromObject(this.group);
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  public intersects(other: Furniture): boolean {
    this.updateBoundingBox();
    other.updateBoundingBox();
    return this.boundingBox.intersectsBox(other.boundingBox);
  }
}
