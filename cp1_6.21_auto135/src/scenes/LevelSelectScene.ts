import Phaser from 'phaser';
import { GridData, LevelCodec } from '../utils/LevelCodec';

interface SavedLevel {
  name: string;
  data: string;
  createdAt: number;
}

interface LevelCard extends SavedLevel {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
}

export class LevelSelectScene extends Phaser.Scene {
  private cards: LevelCard[] = [];
  private cardContainers: Map<string, LevelCard> = new Map();
  private isCtrlPressed: boolean = false;
  private newLevelButton: Phaser.GameObjects.Text | null = null;
  private importButton: Phaser.GameObjects.Text | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private subtitleText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createButtons();
    this.loadLevels();
    this.createLevelCards();
    this.setupInput();
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

  private createTitle(): void {
    this.titleText = this.add.text(this.scale.width / 2, 60, '节奏关卡编辑器', {
      fontSize: '36px',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(this.scale.width / 2, 100, '选择关卡或创建新关卡', {
      fontSize: '16px',
      color: '#8888aa'
    }).setOrigin(0.5);
  }

  private createButtons(): void {
    const buttonY = 140;
    const buttonWidth = 120;
    const buttonHeight = 40;

    this.newLevelButton = this.createButton(
      this.scale.width / 2 - buttonWidth - 10,
      buttonY,
      buttonWidth,
      buttonHeight,
      '新建关卡',
      0x00aa66
    );
    this.newLevelButton.on('pointerdown', () => {
      this.createNewLevel();
    });

    this.importButton = this.createButton(
      this.scale.width / 2 + 10,
      buttonY,
      buttonWidth,
      buttonHeight,
      '导入关卡',
      0x4466aa
    );
    this.importButton.on('pointerdown', () => {
      this.importLevel();
    });
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
      fontSize: '16px',
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
      this.tweens.add({
        targets: [bg, btnText],
        y: '-=2',
        duration: 150,
        ease: 'Cubic.Out'
      });
    });

    btnText.on('pointerout', () => {
      bg.setAlpha(1);
      this.tweens.add({
        targets: [bg, btnText],
        y: y,
        duration: 150,
        ease: 'Cubic.Out'
      });
    });

    return btnText;
  }

  private loadLevels(): SavedLevel[] {
    try {
      const saved = localStorage.getItem('rhythm_levels');
      if (saved) {
        const levels: SavedLevel[] = JSON.parse(saved);
        return levels;
      }
    } catch (e) {
      console.error('Failed to load levels:', e);
    }
    return [];
  }

  private createLevelCards(): void {
    this.cards.forEach(card => {
      if (card.container) {
        card.container.destroy();
      }
    });
    this.cards = [];
    this.cardContainers.clear();

    const levels = this.loadLevels();
    const cardWidth = 200;
    const cardHeight = 150;
    const cardPadding = 30;
    const cardsPerRow = Math.floor((this.scale.width - 100) / (cardWidth + cardPadding));
    const startY = 220;

    levels.forEach((level, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const totalWidth = cardsPerRow * (cardWidth + cardPadding) - cardPadding;
      const startX = (this.scale.width - totalWidth) / 2;

      const x = startX + col * (cardWidth + cardPadding);
      const y = startY + row * (cardHeight + cardPadding);

      const card = this.createCard(x, y, cardWidth, cardHeight, level);
      this.cards.push(card);
      this.cardContainers.set(level.name, card);
    });

    if (levels.length === 0) {
      this.add.text(this.scale.width / 2, startY + 50, '暂无关卡，点击"新建关卡"开始创作', {
        fontSize: '18px',
        color: '#666688'
      }).setOrigin(0.5);
    }
  }

  private createCard(
    x: number,
    y: number,
    width: number,
    height: number,
    level: { name: string; data: string; createdAt: number }
  ): LevelCard {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const gradient = this.add.graphics();

    bg.fillStyle(0x1a1a3e, 1);
    bg.fillRoundedRect(0, 0, width, height, 12);

    const color1 = Phaser.Display.Color.HexStringToColor('#2a1a4e');
    const color2 = Phaser.Display.Color.HexStringToColor('#1a0a2e');
    for (let i = 0; i < height; i++) {
      const t = i / height;
      const r = Math.floor(color1.red + (color2.red - color1.red) * t);
      const g = Math.floor(color1.green + (color2.green - color1.green) * t);
      const b = Math.floor(color1.blue + (color2.blue - color1.blue) * t);
      gradient.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 0.8);
      gradient.fillRect(2, 2 + i, width - 4, 1);
    }

    bg.lineStyle(2, 0x00ff88, 0.2);
    bg.strokeRoundedRect(0, 0, width, height, 12);

    container.add([bg, gradient]);

    const nameText = this.add.text(15, 15, level.name, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: width - 30 }
    });
    container.add(nameText);

    const noteIcon = this.add.circle(width / 2, height / 2 + 10, 20, 0x00ff88);
    noteIcon.setAlpha(0.3);
    container.add(noteIcon);

    const noteIcon2 = this.add.circle(width / 2, height / 2 + 10, 12, 0x00ff88);
    noteIcon2.setAlpha(0.6);
    container.add(noteIcon2);

    const date = new Date(level.createdAt);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    const dateText = this.add.text(width - 15, height - 15, dateStr, {
      fontSize: '12px',
      color: '#666688'
    }).setOrigin(1, 1);
    container.add(dateText);

    container.setSize(width, height);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains);

    let lastClickTime = 0;

    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        y: y - 3,
        duration: 200,
        ease: 'Cubic.Out'
      });
      bg.clear();
      bg.fillStyle(0x2a2a5e, 1);
      bg.fillRoundedRect(0, 0, width, height, 12);
      bg.lineStyle(2, 0x00ff88, 0.4);
      bg.strokeRoundedRect(0, 0, width, height, 12);
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        y: y,
        duration: 200,
        ease: 'Cubic.Out'
      });
      bg.clear();
      bg.fillStyle(0x1a1a3e, 1);
      bg.fillRoundedRect(0, 0, width, height, 12);
      bg.lineStyle(2, 0x00ff88, 0.2);
      bg.strokeRoundedRect(0, 0, width, height, 12);
    });

    container.on('pointerdown', () => {
      const now = this.time.now;

      if (this.isCtrlPressed) {
        this.deleteLevel(level.name, container);
        return;
      }

      if (now - lastClickTime < 300) {
        this.playLevel(level.data);
      } else {
        lastClickTime = now;
        this.time.delayedCall(250, () => {
          if (this.time.now - lastClickTime >= 250) {
            this.editLevel(level.data, level.name);
          }
        });
      }
    });

    return {
      name: level.name,
      data: level.data,
      createdAt: level.createdAt,
      container,
      bg
    };
  }

  private deleteLevel(name: string, container: Phaser.GameObjects.Container): void {
    if (!confirm(`确定要删除关卡 "${name}" 吗？`)) {
      return;
    }

    this.tweens.add({
      targets: container,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.In',
      onComplete: () => {
        container.destroy();

        const levels = this.loadLevels();
        const filtered = levels.filter(l => l.name !== name);
        localStorage.setItem('rhythm_levels', JSON.stringify(filtered));

        this.cardContainers.delete(name);
        this.cards = this.cards.filter(c => c.name !== name);
        this.createLevelCards();
      }
    });
  }

  private createNewLevel(): void {
    const newGridData: GridData = {
      rows: 8,
      cols: 8,
      bpm: 120,
      name: '新关卡',
      notes: []
    };

    this.scene.start('EditorScene', { gridData: newGridData });
  }

  private editLevel(data: string, name: string): void {
    try {
      const gridData = LevelCodec.decode(data);
      this.scene.start('EditorScene', { gridData, levelName: name });
    } catch (e) {
      console.error('Failed to decode level:', e);
      alert('关卡数据损坏');
    }
  }

  private playLevel(data: string): void {
    try {
      const gridData = LevelCodec.decode(data);
      this.scene.start('GameScene', { gridData, isPreview: false });
    } catch (e) {
      console.error('Failed to decode level:', e);
      alert('关卡数据损坏');
    }
  }

  private importLevel(): void {
    const code = prompt('请粘贴关卡编码:');
    if (!code || !code.trim()) return;

    try {
      if (!LevelCodec.validate(code.trim())) {
        alert('无效的关卡编码');
        return;
      }

      const gridData = LevelCodec.decode(code.trim());
      const levels = this.loadLevels();

      const existingIndex = levels.findIndex(l => l.name === gridData.name);
      const levelData = {
        name: gridData.name,
        data: code.trim(),
        createdAt: Date.now()
      };

      if (existingIndex >= 0) {
        if (confirm(`关卡 "${gridData.name}" 已存在，是否覆盖？`)) {
          levels[existingIndex] = levelData;
        } else {
          return;
        }
      } else {
        levels.push(levelData);
      }

      localStorage.setItem('rhythm_levels', JSON.stringify(levels));
      this.createLevelCards();
      alert('关卡导入成功！');
    } catch (e) {
      console.error('Failed to import level:', e);
      alert('导入失败，请检查编码是否正确');
    }
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-CTRL', () => {
      this.isCtrlPressed = true;
    });
    this.input.keyboard!.on('keyup-CTRL', () => {
      this.isCtrlPressed = false;
    });
  }
}
