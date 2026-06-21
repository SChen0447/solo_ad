import Phaser from 'phaser';

export class TileScene3D extends Phaser.Scene {
  private tileTextureKey: string = 'tileTexture';
  private tiles: Phaser.GameObjects.Container | null = null;
  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private rotationY: number = 0;
  private rotationX: number = 30;
  private tileSize: number = 32;
  private gridSize: number = 16;
  private textureCanvas: HTMLCanvasElement | null = null;

  constructor() {
    super({ key: 'TileScene3D' });
  }

  preload(): void {}

  create(): void {
    const cam = this.cameras.main;
    cam.setZoom(0.6);
    cam.centerOn(0, 0);
    cam.setBackgroundColor('#0a0a14');

    this.createGrid();
    this.setupInput();

    if (this.textureCanvas) {
      this.updateTexture(this.textureCanvas);
    }
  }

  private createGrid(): void {
    if (this.tiles) {
      this.tiles.destroy();
    }

    this.tiles = this.add.container(0, 0);
    
    const totalWidth = this.gridSize * this.tileSize;
    const totalHeight = this.gridSize * this.tileSize;
    const offsetX = -totalWidth / 2 + this.tileSize / 2;
    const offsetY = -totalHeight / 2 + this.tileSize / 2;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.add.rectangle(
          offsetX + x * this.tileSize,
          offsetY + y * this.tileSize,
          this.tileSize,
          this.tileSize,
          0x3a3a3a
        );
        tile.setStrokeStyle(1, 0x222222, 0.5);
        this.tiles.add(tile);
      }
    }

    this.updateTilesTransform();
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = pointer.x - this.lastPointerX;
        const deltaY = pointer.y - this.lastPointerY;

        this.rotationY += deltaX * 0.5;
        this.rotationX = Math.max(0, Math.min(60, this.rotationX + deltaY * 0.3));

        this.rotationY = ((this.rotationY % 360) + 360) % 360;

        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;

        this.updateTilesTransform();
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    this.input.on('pointerupoutside', () => {
      this.isDragging = false;
    });
  }

  private updateTilesTransform(): void {
    if (!this.tiles) return;

    const radX = Phaser.Math.DegToRad(this.rotationX);
    const radY = Phaser.Math.DegToRad(this.rotationY);

    const totalWidth = this.gridSize * this.tileSize;
    const totalHeight = this.gridSize * this.tileSize;
    const offsetX = -totalWidth / 2 + this.tileSize / 2;
    const offsetY = -totalHeight / 2 + this.tileSize / 2;

    const tiles = this.tiles.getAll() as Phaser.GameObjects.Rectangle[];
    
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const idx = y * this.gridSize + x;
        const tile = tiles[idx];
        
        const localX = offsetX + x * this.tileSize;
        const localY = offsetY + y * this.tileSize;
        
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const rotatedX = localX * cosY - localY * sinY;
        const rotatedZ = localX * sinY + localY * cosY;
        
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const finalY = localY * cosX;
        const depth = rotatedZ * sinX;
        
        const scale = 1 + depth * 0.002;
        const yOffset = -rotatedZ * sinX * 0.5;
        
        tile.x = rotatedX;
        tile.y = finalY + yOffset;
        tile.setScale(scale);
        tile.setDepth(depth);
      }
    }
  }

  public updateTexture(canvas: HTMLCanvasElement): void {
    this.textureCanvas = canvas;

    if (!this.sys || !this.sys.game) return;

    if (this.textures.exists(this.tileTextureKey)) {
      this.textures.remove(this.tileTextureKey);
    }

    const texture = this.textures.addCanvas(this.tileTextureKey, canvas);
    if (texture) {
      texture.refresh();
    }

    if (this.tiles) {
      const tiles = this.tiles.getAll() as Phaser.GameObjects.Rectangle[];
      for (const tile of tiles) {
        tile.setTexture(this.tileTextureKey);
        tile.setFillStyle(0xffffff, 1);
      }
    }
  }

  public getRotationY(): number {
    return this.rotationY;
  }

  public getRotationX(): number {
    return this.rotationX;
  }

  public setRotation(rotationY: number, rotationX: number): void {
    this.rotationY = ((rotationY % 360) + 360) % 360;
    this.rotationX = Math.max(0, Math.min(60, rotationX));
    this.updateTilesTransform();
  }

  public destroy(): void {
    if (this.tiles) {
      this.tiles.destroy();
      this.tiles = null;
    }
    if (this.textures.exists(this.tileTextureKey)) {
      this.textures.remove(this.tileTextureKey);
    }
    super.destroy();
  }
}
