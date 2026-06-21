import * as THREE from 'three';

export type FloorMaterialType = 'wood' | 'tile' | 'carpet';

export class Room {
  public width: number = 5;
  public depth: number = 4;
  public height: number = 3;

  private scene: THREE.Scene;

  public floorMesh!: THREE.Mesh;
  public ceilingMesh!: THREE.Mesh;
  public walls: THREE.Mesh[] = [];

  private targetWallColor: THREE.Color = new THREE.Color(0xe0e0e0);
  private currentWallColor: THREE.Color = new THREE.Color(0xe0e0e0);
  private colorTransitionSpeed: number = 3.3;
  private isTransitioning: boolean = false;

  private wallMaterials: THREE.MeshStandardMaterial[] = [];
  private currentFloorType: FloorMaterialType = 'wood';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createFloor();
    this.createCeiling();
    this.createWalls();
  }

  private createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 30; i++) {
      const y = (i * 512) / 30;
      ctx.fillStyle = `rgba(${120 + Math.random() * 30}, ${90 + Math.random() * 30}, ${30 + Math.random() * 20}, 0.3)`;
      ctx.fillRect(0, y, 512, 17);

      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 2);
      }
      ctx.strokeStyle = `rgba(60, 40, 10, 0.4)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = `rgba(${90 + Math.random() * 40}, ${60 + Math.random() * 30}, ${20 + Math.random() * 20}, 0.2)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 20 + Math.random() * 30, 3 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 3);
    return texture;
  }

  private createTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const tileSize = 128;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = x * tileSize;
        const py = y * tileSize;
        const shade = 200 + Math.random() * 40;
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(px, py, tileSize, tileSize);

        ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, tileSize, tileSize);

        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = `rgba(180, 180, 180, ${0.1 + Math.random() * 0.2})`;
          ctx.beginPath();
          ctx.arc(px + Math.random() * tileSize, py + Math.random() * tileSize, 1 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 3);
    return texture;
  }

  private createCarpetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#A0522D';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 50000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 140 + Math.random() * 40;
      const g = 70 + Math.random() * 40;
      const b = 30 + Math.random() * 30;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
      ctx.fillRect(x, y, 1, 1);
    }

    const patternSize = 64;
    for (let y = 0; y < 512; y += patternSize) {
      for (let x = 0; x < 512; x += patternSize) {
        ctx.strokeStyle = 'rgba(80, 40, 20, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + patternSize / 2);
        ctx.lineTo(x + patternSize / 2, y);
        ctx.lineTo(x + patternSize, y + patternSize / 2);
        ctx.lineTo(x + patternSize / 2, y + patternSize);
        ctx.closePath();
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 3);
    return texture;
  }

  private createFloor(): void {
    const geometry = new THREE.PlaneGeometry(this.width, this.depth);
    const texture = this.createWoodTexture();
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.floorMesh = new THREE.Mesh(geometry, material);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);
  }

  private createCeiling(): void {
    const geometry = new THREE.PlaneGeometry(this.width, this.depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.9
    });

    this.ceilingMesh = new THREE.Mesh(geometry, material);
    this.ceilingMesh.rotation.x = Math.PI / 2;
    this.ceilingMesh.position.y = this.height;
    this.ceilingMesh.receiveShadow = true;
    this.scene.add(this.ceilingMesh);
  }

  private createWalls(): void {
    const halfW = this.width / 2;
    const halfD = this.depth / 2;

    const wallConfigs = [
      { width: this.width, height: this.height, pos: new THREE.Vector3(0, this.height / 2, -halfD), rot: 0 },
      { width: this.width, height: this.height, pos: new THREE.Vector3(0, this.height / 2, halfD), rot: Math.PI },
      { width: this.depth, height: this.height, pos: new THREE.Vector3(-halfW, this.height / 2, 0), rot: Math.PI / 2 },
      { width: this.depth, height: this.height, pos: new THREE.Vector3(halfW, this.height / 2, 0), rot: -Math.PI / 2 }
    ];

    wallConfigs.forEach((config, index) => {
      const geometry = new THREE.PlaneGeometry(config.width, config.height);
      const material = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0.05
      });
      this.wallMaterials.push(material);

      const wall = new THREE.Mesh(geometry, material);
      wall.position.copy(config.pos);
      wall.rotation.y = config.rot;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.wallIndex = index;
      this.walls.push(wall);
      this.scene.add(wall);
    });
  }

  public setWallColor(colorHex: string): void {
    this.targetWallColor = new THREE.Color(colorHex);
    this.isTransitioning = true;
  }

  public setFloorMaterial(type: FloorMaterialType): void {
    if (this.currentFloorType === type) return;
    this.currentFloorType = type;

    let texture: THREE.CanvasTexture;
    let roughness = 0.8;
    let metalness = 0.05;

    switch (type) {
      case 'wood':
        texture = this.createWoodTexture();
        roughness = 0.8;
        break;
      case 'tile':
        texture = this.createTileTexture();
        roughness = 0.3;
        metalness = 0.1;
        break;
      case 'carpet':
        texture = this.createCarpetTexture();
        roughness = 1.0;
        break;
    }

    const material = this.floorMesh.material as THREE.MeshStandardMaterial;
    if (material.map) {
      material.map.dispose();
    }
    material.map = texture;
    material.roughness = roughness;
    material.metalness = metalness;
    material.needsUpdate = true;
  }

  public getFloorMaterialType(): FloorMaterialType {
    return this.currentFloorType;
  }

  public getWallColor(): string {
    return '#' + this.currentWallColor.getHexString();
  }

  public update(delta: number): void {
    if (this.isTransitioning) {
      const step = this.colorTransitionSpeed * delta;
      let allDone = true;

      this.wallMaterials.forEach(mat => {
        const diff = new THREE.Color().subVectors(this.targetWallColor, this.currentWallColor);
        const diffMagnitude = Math.abs(diff.r) + Math.abs(diff.g) + Math.abs(diff.b);

        if (diffMagnitude > 0.001) {
          allDone = false;
          this.currentWallColor.lerp(this.targetWallColor, Math.min(step / diffMagnitude, 1));
          mat.color.copy(this.currentWallColor);
        } else {
          mat.color.copy(this.targetWallColor);
        }
      });

      this.currentWallColor.copy(this.targetWallColor);
      if (allDone) {
        this.isTransitioning = false;
      }
    }
  }
}
