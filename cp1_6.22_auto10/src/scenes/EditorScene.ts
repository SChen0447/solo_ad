import Phaser from 'phaser';
import { TileType, TileData, LevelData, GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from '../types';

export class EditorScene extends Phaser.Scene {
  private grid: TileData[][] = [];
  private selectedTool: TileType | 'select' | 'eraser' = TileType.GROUND;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private toolbarButtons: Phaser.GameObjects.Container[] = [];
  private panelContainer!: Phaser.GameObjects.Container;
  private toolbarContainer!: Phaser.GameObjects.Container;
  private bottomContainer!: Phaser.GameObjects.Container;
  private saveTimeText!: Phaser.GameObjects.Text;
  private errorMessage!: Phaser.GameObjects.Text;
  private trapGlowValue: number = 0;
  private checkpointGlowValue: number = 0;
  private isDragging: boolean = false;
  private gridStartX: number = 60;
  private gridStartY: number = 20;

  constructor() {
    super('EditorScene');
  }

  preload(): void {
  }

  create(): void {
    this.initializeGrid();
    this.createGridGraphics();
    this.createTileGraphics();
    this.createToolbar();
    this.createRightPanel();
    this.createBottomPanel();
    this.setupInputHandlers();
    this.createPulseAnimations();
    this.loadLastSaved();
    this.handleResize();
    this.scale.on('resize', this.handleResize, this);
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid[y][x] = {
          type: TileType.EMPTY,
          x,
          y
        };
      }
    }
  }

  private createGridGraphics(): void {
    this.gridGraphics = this.add.graphics();
    this.drawGrid();
  }

  private createTileGraphics(): void {
    this.tileGraphics = this.add.graphics();
    this.refreshTiles();
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x444466, 0.3);
    
    for (let x = 0; x <= GRID_WIDTH; x++) {
      const px = this.gridStartX + x * TILE_SIZE;
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(px, this.gridStartY);
      this.gridGraphics.lineTo(px, this.gridStartY + GRID_HEIGHT * TILE_SIZE);
      this.gridGraphics.strokePath();
    }
    
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      const py = this.gridStartY + y * TILE_SIZE;
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(this.gridStartX, py);
      this.gridGraphics.lineTo(this.gridStartX + GRID_WIDTH * TILE_SIZE, py);
      this.gridGraphics.strokePath();
    }
  }

  private refreshTiles(): void {
    this.tileGraphics.clear();
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.drawTile(x, y, this.grid[y][x].type);
      }
    }
  }

  private drawTile(gridX: number, gridY: number, type: TileType): void {
    const px = this.gridStartX + gridX * TILE_SIZE;
    const py = this.gridStartY + gridY * TILE_SIZE;
    
    switch (type) {
      case TileType.GROUND:
        this.tileGraphics.fillStyle(0x8B4513, 1);
        this.tileGraphics.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        this.tileGraphics.lineStyle(2, 0xCD853F, 0.6);
        for (let i = 0; i < 6; i++) {
          const offset = i * 10 - 20;
          this.tileGraphics.beginPath();
          this.tileGraphics.moveTo(px + offset, py + TILE_SIZE);
          this.tileGraphics.lineTo(px + offset + 20, py);
          this.tileGraphics.strokePath();
        }
        break;
        
      case TileType.PLATFORM:
        this.tileGraphics.fillStyle(0x87CEEB, 0.8);
        this.tileGraphics.fillRect(px + 2, py + 10, TILE_SIZE - 4, TILE_SIZE - 20);
        this.tileGraphics.lineStyle(1, 0xADD8E6, 1);
        this.tileGraphics.strokeRect(px + 2, py + 10, TILE_SIZE - 4, TILE_SIZE - 20);
        break;
        
      case TileType.TRAP:
        const glow = 0.5 + this.trapGlowValue * 0.5;
        this.tileGraphics.lineStyle(3, 0xff0000, glow);
        this.tileGraphics.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        this.tileGraphics.lineStyle(1, 0xff6666, glow * 0.5);
        this.tileGraphics.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        break;
        
      case TileType.CHECKPOINT:
        const cpGlow = 0.6 + this.checkpointGlowValue * 0.4;
        this.tileGraphics.fillStyle(0x00ff00, cpGlow);
        this.tileGraphics.fillCircle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 12);
        this.tileGraphics.fillStyle(0x88ff88, cpGlow * 0.8);
        this.tileGraphics.fillCircle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 8);
        break;
    }
  }

  private createToolbar(): void {
    this.toolbarContainer = this.add.container(0, 0);
    
    const tools: { key: TileType | 'select' | 'eraser'; color: number; icon: string }[] = [
      { key: 'select', color: 0x666666, icon: '↖' },
      { key: TileType.GROUND, color: 0x8B4513, icon: '■' },
      { key: TileType.PLATFORM, color: 0x87CEEB, icon: '▬' },
      { key: TileType.TRAP, color: 0xff0000, icon: '◇' },
      { key: TileType.CHECKPOINT, color: 0x00ff00, icon: '●' },
      { key: 'eraser', color: 0x999999, icon: '✕' }
    ];
    
    tools.forEach((tool, index) => {
      const btn = this.createToolbarButton(tool.key, tool.color, tool.icon, index);
      this.toolbarContainer.add(btn);
      this.toolbarButtons.push(btn);
    });
    
    this.updateToolbarSelection();
  }

  private createToolbarButton(toolKey: TileType | 'select' | 'eraser', color: number, icon: string, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(30, 40 + index * 45);
    
    const bg = this.add.rectangle(0, 0, 30, 30, color, 0.8);
    bg.setStrokeStyle(2, 0xffffff, 0);
    
    const iconText = this.add.text(0, 0, icon, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    iconText.setOrigin(0.5);
    
    container.add([bg, iconText]);
    container.setSize(30, 30);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 200
      });
    });
    
    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200
      });
    });
    
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 100,
        yoyo: true
      });
      this.selectedTool = toolKey;
      this.updateToolbarSelection();
    });
    
    (container as any).toolKey = toolKey;
    (container as any).bg = bg;
    
    return container;
  }

  private updateToolbarSelection(): void {
    this.toolbarButtons.forEach(btn => {
      const bg = (btn as any).bg as Phaser.GameObjects.Rectangle;
      const toolKey = (btn as any).toolKey;
      if (toolKey === this.selectedTool) {
        bg.setStrokeStyle(2, 0xffffff, 1);
      } else {
        bg.setStrokeStyle(2, 0xffffff, 0);
      }
    });
  }

  private createRightPanel(): void {
    this.panelContainer = this.add.container(0, 0);
    
    const panelX = 660;
    const panelY = 20;
    const panelWidth = 120;
    const panelHeight = 560;
    
    const panelBg = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x3a3a4a, 0.7);
    panelBg.setStrokeStyle(1, 0x4fc3f7, 0.5);
    this.panelContainer.add(panelBg);
    
    const title = this.add.text(panelX + panelWidth / 2, panelY + 15, '属性面板', {
      fontSize: '14px',
      color: '#4fc3f7',
      fontFamily: 'Arial'
    });
    title.setOrigin(0.5);
    this.panelContainer.add(title);
    
    const scrollBg = this.add.rectangle(panelX + panelWidth / 2, panelY + 120, panelWidth - 20, 180, 0x2a2a3a, 0.8);
    this.panelContainer.add(scrollBg);
    
    const scrollBar = this.add.rectangle(panelX + panelWidth - 15, panelY + 120, 6, 160, 0x4fc3f7, 0.6);
    this.panelContainer.add(scrollBar);
    
    const scrollText = this.add.text(panelX + panelWidth / 2, panelY + 120, '网格预览\n(滚动查看)', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'Arial',
      align: 'center'
    });
    scrollText.setOrigin(0.5);
    this.panelContainer.add(scrollText);
    
    this.createPanelButton(panelX + 10, panelY + 250, '清空所有', 0xe74c3c, () => this.clearAll());
    this.createPanelButton(panelX + 10, panelY + 290, '随机关卡', 0x9b59b6, () => this.generateRandomLevel());
    this.createPanelButton(panelX + 10, panelY + 330, '测试关卡', 0x27ae60, () => this.startTestScene(), '▶');
    
    this.errorMessage = this.add.text(panelX + panelWidth / 2, panelY + 400, '', {
      fontSize: '12px',
      color: '#ff4444',
      fontFamily: 'Arial',
      align: 'center'
    });
    this.errorMessage.setOrigin(0.5);
    this.panelContainer.add(this.errorMessage);
  }

  private createPanelButton(x: number, y: number, text: string, color: number, callback: () => void, icon?: string): void {
    const btnBg = this.add.rectangle(x + 50, y + 15, 100, 30, color, 0.8);
    btnBg.setInteractive({ useHandCursor: true });
    
    const btnText = this.add.text(x + 50, y + 15, icon ? `${icon} ${text}` : text, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    btnText.setOrigin(0.5);
    
    btnBg.on('pointerover', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 1.1,
        duration: 200
      });
    });
    
    btnBg.on('pointerout', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 1,
        duration: 200
      });
    });
    
    btnBg.on('pointerdown', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 0.95,
        duration: 100,
        yoyo: true
      });
      callback();
    });
    
    this.panelContainer.add([btnBg, btnText]);
  }

  private createBottomPanel(): void {
    this.bottomContainer = this.add.container(0, 0);
    
    this.createPanelButton(250, 550, '保存关卡', 0x3498db, () => this.saveLevel());
    this.createPanelButton(370, 550, '加载关卡', 0xf39c12, () => this.loadLevel());
    
    this.saveTimeText = this.add.text(490, 565, '', {
      fontSize: '11px',
      color: '#888888',
      fontFamily: 'Arial'
    });
    this.bottomContainer.add(this.saveTimeText);
  }

  private setupInputHandlers(): void {
    const gridWidth = GRID_WIDTH * TILE_SIZE;
    const gridHeight = GRID_HEIGHT * TILE_SIZE;
    
    const hitArea = new Phaser.Geom.Rectangle(this.gridStartX, this.gridStartY, gridWidth, gridHeight);
    const gridZone = this.add.zone(this.gridStartX + gridWidth / 2, this.gridStartY + gridHeight / 2, gridWidth, gridHeight);
    gridZone.setInteractive({ hitArea, useHandCursor: true });
    
    gridZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.handleGridClick(pointer);
    });
    
    gridZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.selectedTool !== 'select') {
        this.handleGridClick(pointer);
      }
    });
    
    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private handleGridClick(pointer: Phaser.Input.Pointer): void {
    const gridX = Math.floor((pointer.x - this.gridStartX) / TILE_SIZE);
    const gridY = Math.floor((pointer.y - this.gridStartY) / TILE_SIZE);
    
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
      return;
    }
    
    if (this.selectedTool === 'select') {
      return;
    }
    
    if (this.selectedTool === 'eraser') {
      this.grid[gridY][gridX].type = TileType.EMPTY;
    } else {
      this.grid[gridY][gridX].type = this.selectedTool as TileType;
    }
    
    this.refreshTiles();
  }

  private createPulseAnimations(): void {
    this.tweens.add({
      targets: this,
      trapGlowValue: 1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        this.refreshTiles();
      }
    });
    
    this.tweens.add({
      targets: this,
      checkpointGlowValue: 1,
      duration: 600,
      yoyo: true,
      repeat: -1
    });
  }

  private clearAll(): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid[y][x].type = TileType.EMPTY;
      }
    }
    this.refreshTiles();
  }

  private generateRandomLevel(): void {
    this.clearAll();
    
    for (let x = 0; x < GRID_WIDTH; x++) {
      this.grid[GRID_HEIGHT - 1][x].type = TileType.GROUND;
    }
    
    let currentY = GRID_HEIGHT - 3;
    for (let x = 2; x < GRID_WIDTH - 2; x += 3) {
      const platformLength = Phaser.Math.Between(2, 4);
      currentY = Phaser.Math.Clamp(currentY + Phaser.Math.Between(-2, 2), 3, GRID_HEIGHT - 3);
      
      for (let px = 0; px < platformLength && x + px < GRID_WIDTH - 1; px++) {
        this.grid[currentY][x + px].type = TileType.PLATFORM;
      }
      
      if (Phaser.Math.Between(0, 100) > 60) {
        const trapX = x + Phaser.Math.Between(0, platformLength - 1);
        if (trapX < GRID_WIDTH && currentY + 1 < GRID_HEIGHT) {
          this.grid[currentY + 1][trapX].type = TileType.TRAP;
        }
      }
      
      if (Phaser.Math.Between(0, 100) > 70 && x > 5) {
        this.grid[currentY - 1][x].type = TileType.CHECKPOINT;
      }
    }
    
    this.grid[GRID_HEIGHT - 2][1].type = TileType.CHECKPOINT;
    
    this.refreshTiles();
  }

  private serializeLevel(): LevelData {
    const checkpoints: { x: number; y: number }[] = [];
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.grid[y][x].type === TileType.CHECKPOINT) {
          checkpoints.push({ x, y });
        }
      }
    }
    
    return {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      tiles: this.grid.map(row => row.map(tile => ({ ...tile }))),
      checkpoints,
      savedAt: Date.now()
    };
  }

  private deserializeLevel(data: LevelData): boolean {
    if (!data || !data.tiles || data.width !== GRID_WIDTH || data.height !== GRID_HEIGHT) {
      return false;
    }
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (data.tiles[y] && data.tiles[y][x]) {
          this.grid[y][x].type = data.tiles[y][x].type;
        }
      }
    }
    
    this.refreshTiles();
    return true;
  }

  private saveLevel(): void {
    const levelData = this.serializeLevel();
    const json = JSON.stringify(levelData);
    localStorage.setItem('lastLevel', json);
    this.updateSaveTime(levelData.savedAt!);
  }

  private loadLevel(): void {
    try {
      const json = localStorage.getItem('lastLevel');
      if (!json) {
        this.showError('没有找到保存的关卡数据');
        return;
      }
      
      const data = JSON.parse(json) as LevelData;
      if (!this.deserializeLevel(data)) {
        this.showError('关卡数据格式错误');
        return;
      }
      
      if (data.savedAt) {
        this.updateSaveTime(data.savedAt);
      }
      
      this.hideError();
    } catch (e) {
      this.showError('加载失败：数据解析错误');
    }
  }

  private loadLastSaved(): void {
    try {
      const json = localStorage.getItem('lastLevel');
      if (json) {
        const data = JSON.parse(json) as LevelData;
        this.deserializeLevel(data);
        if (data.savedAt) {
          this.updateSaveTime(data.savedAt);
        }
      }
    } catch (e) {
    }
  }

  private updateSaveTime(timestamp: number): void {
    const date = new Date(timestamp);
    this.saveTimeText.setText(`上次保存: ${date.toLocaleString()}`);
  }

  private showError(message: string): void {
    this.errorMessage.setText(message);
    this.errorMessage.setAlpha(1);
    
    this.time.delayedCall(2000, () => {
      this.hideError();
    });
  }

  private hideError(): void {
    this.tweens.add({
      targets: this.errorMessage,
      alpha: 0,
      duration: 300
    });
  }

  private startTestScene(): void {
    const levelData = this.serializeLevel();
    this.scene.start('TestScene', { levelData });
  }

  private handleResize = (): void => {
    const width = this.game.scale.width;
    
    if (width < 768) {
      this.panelContainer.setPosition(0, 450);
      this.gridStartX = 10;
      this.gridStartY = 10;
    } else {
      this.panelContainer.setPosition(0, 0);
      this.gridStartX = 60;
      this.gridStartY = 20;
    }
    
    this.drawGrid();
    this.refreshTiles();
  };

  update(): void {
  }
}
