import Phaser from 'phaser';
import { GridData, NoteType, GridNote, LevelCodec } from '../utils/LevelCodec';

const GRID_SIZE_DESKTOP = 8;
const GRID_SIZE_TABLET = 6;
const CELL_SIZE = 60;

export class EditorScene extends Phaser.Scene {
  private gridSize: number = GRID_SIZE_DESKTOP;
  private cellSize: number = CELL_SIZE;
  private gridX: number = 0;
  private gridY: number = 0;
  private notes: Map<string, GridNote> = new Map();
  private selectedNoteType: NoteType = 0;
  private noteSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private bpm: number = 120;
  private levelName: string = '未命名关卡';
  private isTablet: boolean = false;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private toolbarContainer: Phaser.GameObjects.Container | null = null;
  private previewButton: Phaser.GameObjects.Text | null = null;
  private saveButton: Phaser.GameObjects.Text | null = null;
  private shareButton: Phaser.GameObjects.Text | null = null;
  private backButton: Phaser.GameObjects.Text | null = null;
  private bpmText: Phaser.GameObjects.Text | null = null;
  private bpmSlider: Phaser.GameObjects.Graphics | null = null;
  private bpmSliderHandle: Phaser.GameObjects.Rectangle | null = null;
  private isDraggingSlider: boolean = false;
  private glowTweens: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private sliderX: number = 0;
  private sliderY: number = 0;
  private sliderWidth: number = 200;
  private levelNameText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'EditorScene' });
  }

  init(data: { gridData?: GridData; levelName?: string }): void {
    if (data.gridData) {
      this.bpm = data.gridData.bpm;
      this.levelName = data.gridData.name || '未命名关卡';
      this.notes.clear();
      data.gridData.notes.forEach(note => {
        const key = `${note.row}-${note.col}`;
        this.notes.set(key, { ...note });
      });
      this.gridSize = data.gridData.rows;
    }
    if (data.levelName) {
      this.levelName = data.levelName;
    }
  }

  create(): void {
    this.checkScreenSize();
    this.createBackground();
    this.calculateGridPosition();
    this.createGrid();
    this.createToolbar();
    this.createControls();
    this.createNoteSprites();
    this.setupInput();
  }

  private checkScreenSize(): void {
    const width = this.scale.width;
    this.isTablet = width < 1024;
    if (this.isTablet) {
      this.gridSize = GRID_SIZE_TABLET;
      this.cellSize = 50;
    } else {
      this.gridSize = GRID_SIZE_DESKTOP;
      this.cellSize = CELL_SIZE;
    }
  }

  private calculateGridPosition(): void {
    const totalWidth = this.gridSize * this.cellSize;
    const totalHeight = this.gridSize * this.cellSize;
    this.gridX = (this.scale.width - totalWidth) / 2 + 40;
    this.gridY = (this.scale.height - totalHeight) / 2;
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    const color1 = Phaser.Display.Color.HexStringToColor('#0a0a23');
    const color2 = Phaser.Display.Color.HexStringToColor('#1a1a3e');

    for (let y = 0; y < this.scale.height; y++) {
      const t = y / this.scale.height;
      const r = Math.floor(color1.red + (color2.red - color1.red) * t);
      const g = Math.floor(color1.green + (color2.green - color1.green) * t);
      const b = Math.floor(color1.blue + (color2.blue - color1.blue) * t);
      gradient.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      gradient.fillRect(0, y, this.scale.width, 1);
    }
  }

  private createGrid(): void {
    if (this.gridGraphics) {
      this.gridGraphics.destroy();
    }

    this.gridGraphics = this.add.graphics();

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = this.gridX + col * this.cellSize;
        const y = this.gridY + row * this.cellSize;

        const isRefLine = row % 4 === 0 || col % 4 === 0;
        const lineColor = isRefLine ? 0x4444aa : 0x333366;
        const lineAlpha = isRefLine ? 0.8 : 0.4;

        this.gridGraphics.lineStyle(1, lineColor, lineAlpha);
        this.gridGraphics.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }

  private createToolbar(): void {
    if (this.toolbarContainer) {
      this.toolbarContainer.destroy();
    }

    this.toolbarContainer = this.add.container(0, 0);

    const toolbarX = this.gridX - 100;
    const toolbarY = this.gridY;

    const colors: NoteType[] = [0, 1, 2];
    const colorHex = [0xff4444, 0x4444ff, 0x44ff44];

    colors.forEach((type, index) => {
      const btnY = toolbarY + index * 70 + 30;

      const btnBg = this.add.rectangle(toolbarX, btnY, 50, 50, colorHex[type]);
      btnBg.setStrokeStyle(2, 0xffffff, 0.3);
      btnBg.setInteractive({ useHandCursor: true });

      const keyText = this.add.text(toolbarX, btnY, ['A', 'S', 'D'][index], {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const container = this.add.container(toolbarX, btnY, [btnBg, keyText]);
      container.setData('type', type);

      btnBg.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 200,
          ease: 'Cubic.Out'
        });
      });

      btnBg.on('pointerout', () => {
        if (this.selectedNoteType !== type) {
          this.tweens.add({
            targets: container,
            scale: 1,
            duration: 200,
            ease: 'Cubic.Out'
          });
        }
      });

      btnBg.on('pointerdown', () => {
        this.selectedNoteType = type;
        this.updateToolbarSelection();
      });

      this.toolbarContainer!.add(container);

      if (this.selectedNoteType === type) {
        container.setScale(1.1);
      }
    });
  }

  private updateToolbarSelection(): void {
    if (!this.toolbarContainer) return;

    this.toolbarContainer.each((item: any) => {
      if (item.getData) {
        const type = item.getData('type');
        if (type !== undefined) {
          const targetScale = type === this.selectedNoteType ? 1.1 : 1;
          this.tweens.add({
            targets: item,
            scale: targetScale,
            duration: 200,
            ease: 'Cubic.Out'
          });
        }
      }
    });
  }

  private createControls(): void {
    const titleY = 30;

    this.add.text(this.scale.width / 2, titleY, '关卡编辑器', {
      fontSize: '28px',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nameLabelY = 70;
    this.add.text(this.scale.width / 2, nameLabelY, '关卡名称:', {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    this.levelNameText = this.add.text(this.scale.width / 2, nameLabelY + 22, this.levelName, {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.levelNameText.on('pointerdown', () => {
      const newName = prompt('输入关卡名称:', this.levelName);
      if (newName && newName.trim()) {
        this.levelName = newName.trim();
        this.levelNameText!.setText(this.levelName);
      }
    });

    const bpmLabelY = this.gridY + this.gridSize * this.cellSize + 30;
    this.bpmText = this.add.text(this.gridX, bpmLabelY, `BPM: ${this.bpm}`, {
      fontSize: '16px',
      color: '#ffffff'
    });

    this.sliderX = this.gridX + 90;
    this.sliderY = bpmLabelY + 8;
    this.sliderWidth = 180;
    const sliderHeight = 6;

    this.bpmSlider = this.add.graphics();
    this.bpmSlider.fillStyle(0x333366, 1);
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, this.sliderWidth, sliderHeight, 3);
    this.bpmSlider.fillStyle(0x00ff88, 1);
    const fillWidth = ((this.bpm - 80) / 100) * this.sliderWidth;
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, fillWidth, sliderHeight, 3);

    this.bpmSliderHandle = this.add.rectangle(
      this.sliderX + fillWidth,
      this.sliderY + sliderHeight / 2,
      16,
      16,
      0x00ff88
    );
    this.bpmSliderHandle.setInteractive({ useHandCursor: true });

    this.bpmSliderHandle.on('pointerdown', () => {
      this.isDraggingSlider = true;
    });

    this.input.on('pointerup', () => {
      this.isDraggingSlider = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingSlider) {
        const minBpm = 80;
        const maxBpm = 180;
        const range = maxBpm - minBpm;
        let newBpm = ((pointer.x - this.sliderX) / this.sliderWidth) * range + minBpm;
        newBpm = Math.max(minBpm, Math.min(maxBpm, newBpm));
        newBpm = Math.round(newBpm / 5) * 5;
        this.bpm = newBpm;
        this.updateBpmSlider();
      }
    });

    const buttonY = this.gridY + this.gridSize * this.cellSize + 80;
    const buttonWidth = 90;
    const buttonHeight = 36;

    this.backButton = this.createButton(
      this.gridX,
      buttonY,
      buttonWidth,
      buttonHeight,
      '返回',
      0x666688
    );
    this.backButton.on('pointerdown', () => {
      this.scene.start('LevelSelectScene');
    });

    this.previewButton = this.createButton(
      this.gridX + 110,
      buttonY,
      buttonWidth,
      buttonHeight,
      '预览',
      0x00aa66
    );
    this.previewButton.on('pointerdown', () => {
      this.previewLevel();
    });

    this.saveButton = this.createButton(
      this.gridX + 220,
      buttonY,
      buttonWidth,
      buttonHeight,
      '保存',
      0x4466aa
    );
    this.saveButton.on('pointerdown', () => {
      this.saveLevel();
    });

    this.shareButton = this.createButton(
      this.gridX + 330,
      buttonY,
      buttonWidth,
      buttonHeight,
      '分享',
      0xaa6644
    );
    this.shareButton.on('pointerdown', () => {
      this.shareLevel();
    });
  }

  private updateBpmSlider(): void {
    if (!this.bpmSlider || !this.bpmSliderHandle || !this.bpmText) return;

    const sliderHeight = 6;
    const fillWidth = ((this.bpm - 80) / 100) * this.sliderWidth;

    this.bpmSlider.clear();
    this.bpmSlider.fillStyle(0x333366, 1);
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, this.sliderWidth, sliderHeight, 3);
    this.bpmSlider.fillStyle(0x00ff88, 1);
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, fillWidth, sliderHeight, 3);

    this.bpmSliderHandle.x = this.sliderX + fillWidth;
    this.bpmText.setText(`BPM: ${this.bpm}`);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: number
  ): Phaser.GameObjects.Text {
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x, y, width, height, 8);

    const btnText = this.add.text(x + width / 2, y + height / 2, text, {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btnText.setData('bg', bg);
    btnText.setInteractive(
      new Phaser.Geom.Rectangle(x, y, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    btnText.on('pointerover', () => {
      bg.setAlpha(0.85);
    });

    btnText.on('pointerout', () => {
      bg.setAlpha(1);
    });

    return btnText;
  }

  private createNoteSprites(): void {
    this.noteSprites.forEach(sprite => sprite.destroy());
    this.noteSprites.clear();
    this.glowTweens.forEach(glow => glow.destroy());
    this.glowTweens.clear();

    this.notes.forEach((note, key) => {
      this.createNoteSprite(note, key);
    });
  }

  private createNoteSprite(note: GridNote, key: string): void {
    const x = this.gridX + note.col * this.cellSize + this.cellSize / 2;
    const y = this.gridY + note.row * this.cellSize + this.cellSize / 2;
    const color = [0xff4444, 0x4444ff, 0x44ff44][note.type];
    const size = this.cellSize * 0.7;

    const container = this.add.container(x, y);
    container.setScale(0);

    const glow = this.add.graphics();
    glow.fillStyle(color, 0.5);
    glow.fillCircle(0, 0, size * 0.8);
    glow.setAlpha(0);
    container.add(glow);

    const noteCircle = this.add.circle(0, 0, size / 2, color);
    noteCircle.setStrokeStyle(2, 0xffffff, 0.5);
    container.add(noteCircle);

    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.tweens.add({
        targets: glow,
        alpha: 0.6,
        scale: 1.5,
        duration: 300,
        ease: 'Cubic.Out'
      });
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 1,
        duration: 300,
        ease: 'Cubic.Out'
      });
    });

    container.on('pointerdown', () => {
      this.removeNote(key);
    });

    this.tweens.add({
      targets: container,
      scale: 1.1,
      duration: 200,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 100,
          ease: 'Cubic.Out'
        });
      }
    });

    this.noteSprites.set(key, container);
    this.glowTweens.set(key, glow);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingSlider) return;

      const col = Math.floor((pointer.x - this.gridX) / this.cellSize);
      const row = Math.floor((pointer.y - this.gridY) / this.cellSize);

      if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
        const key = `${row}-${col}`;
        if (this.notes.has(key)) {
          this.removeNote(key);
        } else {
          this.addNote(row, col);
        }
      }
    });

    this.input.keyboard!.on('keydown-A', () => {
      this.selectedNoteType = 0;
      this.updateToolbarSelection();
    });
    this.input.keyboard!.on('keydown-S', () => {
      this.selectedNoteType = 1;
      this.updateToolbarSelection();
    });
    this.input.keyboard!.on('keydown-D', () => {
      this.selectedNoteType = 2;
      this.updateToolbarSelection();
    });
  }

  private addNote(row: number, col: number): void {
    const key = `${row}-${col}`;
    const note: GridNote = {
      type: this.selectedNoteType,
      row,
      col
    };
    this.notes.set(key, note);
    this.createNoteSprite(note, key);
  }

  private removeNote(key: string): void {
    const sprite = this.noteSprites.get(key);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.In',
        onComplete: () => {
          sprite.destroy();
          this.noteSprites.delete(key);
        }
      });
    }
    this.notes.delete(key);
    const glow = this.glowTweens.get(key);
    if (glow) {
      glow.destroy();
      this.glowTweens.delete(key);
    }
  }

  private getGridData(): GridData {
    return {
      rows: this.gridSize,
      cols: this.gridSize,
      bpm: this.bpm,
      name: this.levelName,
      notes: Array.from(this.notes.values())
    };
  }

  private previewLevel(): void {
    const gridData = this.getGridData();
    this.scene.start('GameScene', { gridData, isPreview: true });
  }

  private saveLevel(): void {
    const gridData = this.getGridData();
    const encoded = LevelCodec.encode(gridData);

    const savedLevels = this.getSavedLevels();
    const existingIndex = savedLevels.findIndex(l => l.name === this.levelName);
    const levelData = {
      name: this.levelName,
      data: encoded,
      createdAt: Date.now()
    };

    if (existingIndex >= 0) {
      savedLevels[existingIndex] = levelData;
    } else {
      savedLevels.push(levelData);
    }

    localStorage.setItem('rhythm_levels', JSON.stringify(savedLevels));
    this.showToast('关卡已保存!');
  }

  private getSavedLevels(): Array<{ name: string; data: string; createdAt: number }> {
    try {
      const saved = localStorage.getItem('rhythm_levels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private shareLevel(): void {
    const gridData = this.getGridData();
    const encoded = LevelCodec.encode(gridData);

    navigator.clipboard.writeText(encoded).then(
      () => {
        this.showToast('关卡编码已复制到剪贴板!');
      },
      () => {
        this.showToast('复制失败，请查看控制台');
        console.log('Level code:', encoded);
      }
    );
  }

  private showToast(message: string): void {
    const toast = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      message,
      {
        fontSize: '24px',
        color: '#00ff88',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);
    toast.setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: '-=50',
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          alpha: 0,
          delay: 1000,
          duration: 300,
          ease: 'Cubic.In',
          onComplete: () => {
            toast.destroy();
          }
        });
      }
    });
  }
}
