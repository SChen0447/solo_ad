import * as THREE from 'three';

export interface ShelfItem {
  mesh: THREE.Mesh;
  originalColor: number;
  shelfLevel: number;
  shelfIndex: number;
  isGrabbed: boolean;
  originalPosition: THREE.Vector3;
  glowMesh?: THREE.Mesh;
}

export interface ShelfConfig {
  width: number;
  depth: number;
  height: number;
  levels: number;
  levelHeight: number;
  itemsPerLevel: number;
}

const ITEM_COLORS = [0xff4444, 0x4488ff, 0x44cc44, 0xffdd44, 0xaa44ff];

export class Shelf {
  public group: THREE.Group;
  public items: ShelfItem[] = [];
  public helperLines: THREE.Line[] = [];
  public config: ShelfConfig;
  
  private woodMaterial: THREE.MeshStandardMaterial;
  private itemGeometry: THREE.BoxGeometry;
  private storageArea!: THREE.Mesh;

  constructor(config: Partial<ShelfConfig> = {}) {
    this.config = {
      width: 200,
      depth: 40,
      height: 180,
      levels: 5,
      levelHeight: 30,
      itemsPerLevel: 4,
      ...config
    };

    this.group = new THREE.Group();
    
    this.woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      metalness: 0.1,
      map: this.createWoodTexture()
    });

    this.itemGeometry = new THREE.BoxGeometry(15, 15, 15);
    
    this.createShelfStructure();
    this.createStorageArea();
    this.createHelperLines();
    this.populateItems();
  }

  private createWoodTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, 256, 256);
    
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(${180 + Math.random() * 40}, ${140 + Math.random() * 40}, ${100 + Math.random() * 40}, ${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);
      for (let x = 0; x < 256; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * 0.1) * 3);
      }
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createShelfStructure(): void {
    const { width, depth, height, levels, levelHeight } = this.config;
    const panelThickness = 3;

    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, panelThickness),
      this.woodMaterial
    );
    backPanel.position.set(0, height / 2, -depth / 2 + panelThickness / 2);
    backPanel.castShadow = true;
    backPanel.receiveShadow = true;
    this.group.add(backPanel);

    const leftPanel = new THREE.Mesh(
      new THREE.BoxGeometry(panelThickness, height, depth),
      this.woodMaterial
    );
    leftPanel.position.set(-width / 2 + panelThickness / 2, height / 2, 0);
    leftPanel.castShadow = true;
    leftPanel.receiveShadow = true;
    this.group.add(leftPanel);

    const rightPanel = new THREE.Mesh(
      new THREE.BoxGeometry(panelThickness, height, depth),
      this.woodMaterial
    );
    rightPanel.position.set(width / 2 - panelThickness / 2, height / 2, 0);
    rightPanel.castShadow = true;
    rightPanel.receiveShadow = true;
    this.group.add(rightPanel);

    const bottomPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width, panelThickness, depth),
      this.woodMaterial
    );
    bottomPanel.position.set(0, panelThickness / 2, 0);
    bottomPanel.castShadow = true;
    bottomPanel.receiveShadow = true;
    this.group.add(bottomPanel);

    for (let i = 0; i < levels; i++) {
      const shelfY = levelHeight * i + panelThickness;
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(width - panelThickness * 2, panelThickness, depth - panelThickness),
        this.woodMaterial
      );
      shelf.position.set(0, shelfY, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      this.group.add(shelf);
    }
  }

  private createStorageArea(): void {
    const storageGeometry = new THREE.BoxGeometry(60, 60, 40);
    const storageMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3
    });
    this.storageArea = new THREE.Mesh(storageGeometry, storageMaterial);
    this.storageArea.position.set(150, 30, 0);
    this.group.add(this.storageArea);

    const edgeGeometry = new THREE.EdgesGeometry(storageGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.storageArea.add(edges);
  }

  private createHelperLines(): void {
    const { width, levels, levelHeight } = this.config;
    const panelThickness = 3;

    for (let i = 0; i < levels; i++) {
      const y = levelHeight * i + panelThickness;
      const points = [
        new THREE.Vector3(-width / 2 + 5, y, -25),
        new THREE.Vector3(width / 2 - 5, y, -25)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 5,
        gapSize: 3,
        transparent: true,
        opacity: 0.7
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.helperLines.push(line);
      this.group.add(line);
    }
  }

  private populateItems(): void {
    const { levels, itemsPerLevel, width, levelHeight, depth } = this.config;
    const panelThickness = 3;

    for (let level = 0; level < levels; level++) {
      for (let index = 0; index < itemsPerLevel; index++) {
        const color = ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)];
        const material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.3,
          metalness: 0.5,
          emissive: color,
          emissiveIntensity: 0.1
        });

        const itemMesh = new THREE.Mesh(this.itemGeometry.clone(), material);
        itemMesh.castShadow = true;
        itemMesh.receiveShadow = true;

        const spacing = (width - panelThickness * 4) / (itemsPerLevel + 1);
        const x = -width / 2 + panelThickness * 2 + spacing * (index + 1);
        const y = levelHeight * level + panelThickness * 2;
        const z = (Math.random() - 0.5) * (depth - 30);

        itemMesh.position.set(x, y, z);
        itemMesh.userData = { type: 'shelfItem', level, index };

        const glowGeometry = new THREE.BoxGeometry(17, 17, 17);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        itemMesh.add(glowMesh);

        const item: ShelfItem = {
          mesh: itemMesh,
          originalColor: color,
          shelfLevel: level,
          shelfIndex: index,
          isGrabbed: false,
          originalPosition: new THREE.Vector3(x, y, z),
          glowMesh
        };

        this.items.push(item);
        this.group.add(itemMesh);
      }
    }
  }

  public resetItemPositions(): void {
    this.items.forEach(item => {
      if (item.isGrabbed) {
        item.mesh.position.copy(item.originalPosition);
        item.isGrabbed = false;
        item.mesh.rotation.set(0, 0, 0);
      }
      item.originalPosition.set(
        item.originalPosition.x + (Math.random() - 0.5) * 10,
        item.originalPosition.y,
        item.originalPosition.z + (Math.random() - 0.5) * 10
      );
    });
  }

  public getItemAtPosition(position: THREE.Vector3): ShelfItem | null {
    for (const item of this.items) {
      if (item.mesh.position.distanceTo(position) < 20) {
        return item;
      }
    }
    return null;
  }

  public getAllItems(): THREE.Mesh[] {
    return this.items.map(item => item.mesh);
  }

  public setItemHovered(mesh: THREE.Mesh, hovered: boolean): void {
    const item = this.items.find(i => i.mesh === mesh);
    if (item && item.glowMesh) {
      const glowMaterial = item.glowMesh.material as THREE.MeshBasicMaterial;
      if (hovered) {
        item.mesh.scale.setScalar(1.05);
        glowMaterial.opacity = 0.3;
      } else {
        item.mesh.scale.setScalar(1);
        glowMaterial.opacity = 0;
      }
    }
  }

  public flashItemUnreachable(mesh: THREE.Mesh): void {
    const item = this.items.find(i => i.mesh === mesh);
    if (!item) return;

    const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
    let flashCount = 0;
    const flashInterval = setInterval(() => {
      if (flashCount % 2 === 0) {
        originalMaterial.emissive.setHex(0xff0000);
        originalMaterial.emissiveIntensity = 0.8;
      } else {
        originalMaterial.emissive.setHex(item.originalColor);
        originalMaterial.emissiveIntensity = 0.1;
      }
      flashCount++;
      if (flashCount >= 6) {
        clearInterval(flashInterval);
        originalMaterial.emissive.setHex(item.originalColor);
        originalMaterial.emissiveIntensity = 0.1;
      }
    }, 166);
  }

  public grabItem(mesh: THREE.Mesh, parent: THREE.Object3D): void {
    const item = this.items.find(i => i.mesh === mesh);
    if (item) {
      item.isGrabbed = true;
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      parent.attach(mesh);
      mesh.position.set(0, 0, 0);
    }
  }

  public moveItemToStorage(mesh: THREE.Mesh): void {
    const item = this.items.find(i => i.mesh === mesh);
    if (item) {
      this.group.attach(mesh);
      mesh.position.copy(this.storageArea.position);
      mesh.position.y += 20;
      mesh.position.x += (Math.random() - 0.5) * 30;
      mesh.position.z += (Math.random() - 0.5) * 20;
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
    }
  }

  public getStoragePosition(): THREE.Vector3 {
    return this.storageArea.position.clone();
  }

  public setHelpersVisible(visible: boolean): void {
    this.helperLines.forEach(line => {
      line.visible = visible;
    });
  }

  public dispose(): void {
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
    this.itemGeometry.dispose();
    this.woodMaterial.dispose();
  }
}
