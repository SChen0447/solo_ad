import Phaser from 'phaser';

type MenuView = 'main' | 'settings' | 'preview';

interface LevelData {
  name: string;
  thumbnail: string;
  timestamp: number;
  lines: number[][][];
  gravity: { x: number; y: number };
}

export default class MenuScene extends Phaser.Scene {
  private currentView: MenuView = 'main';
  private titleChars: Phaser.GameObjects.Text[] = [];
  private menuButtons: Phaser.GameObjects.Container[] = [];
  private previewCards: Phaser.GameObjects.Container[] = [];
  private settingsContainer: Phaser.GameObjects.Container | null = null;
  private backButton: Phaser.GameObjects.Container | null = null;
  private gravityAngle: number = 270;
  private gravityStrength: number = 1;
  private previewBall: Phaser.GameObjects.Graphics | null = null;
  private previewTrail: Phaser.GameObjects.Graphics | null = null;
  private savedLevels: LevelData[] = [];
  private angleValueText: Phaser.GameObjects.Text | null = null;
  private strengthValueText: Phaser.GameObjects.Text | null = null;
  private angleSliderFill: Phaser.GameObjects.Rectangle | null = null;
  private strengthSliderFill: Phaser.GameObjects.Rectangle | null = null;
  private angleKnob: Phaser.GameObjects.Arc | null = null;
  private strengthKnob: Phaser.GameObjects.Arc | null = null;
  private isDraggingAngle: boolean = false;
  private isDraggingStrength: boolean = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.loadSavedLevels();
    this.showMainMenu();
  }

  private loadSavedLevels(): void {
    try {
      const stored = localStorage.getItem('gravity_doodle_levels');
      if (stored) {
        this.savedLevels = JSON.parse(stored);
      }
    } catch {
      this.savedLevels = [];
    }
  }

  private showMainMenu(): void {
    this.clearAll();
    this.currentView = 'main';

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const bg = this.add.image(centerX, centerY, 'background');
    bg.setAlpha(0.4);
    bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    this.createAnimatedTitle(centerX, centerY - 200);
    this.createMenuButtons(centerX, centerY);
  }

  private clearAll(): void {
    this.children.each((child) => {
      if (child !== undefined) {
        child.destroy();
      }
    });
    this.titleChars = [];
    this.menuButtons = [];
    this.previewCards = [];
    this.settingsContainer = null;
    this.backButton = null;
    this.previewBall = null;
    this.previewTrail = null;
    this.angleValueText = null;
    this.strengthValueText = null;
    this.angleSliderFill = null;
    this.strengthSliderFill = null;
    this.angleKnob = null;
    this.strengthKnob = null;
    this.isDraggingAngle = false;
    this.isDraggingStrength = false;
  }

  private createAnimatedTitle(x: number, y: number): void {
    const titleText = '重力涂鸦';
    const chars = titleText.split('');
    const charSpacing = 70;
    const startX = x - ((chars.length - 1) * charSpacing) / 2;

    chars.forEach((char, index) => {
      const textObj = this.add.text(startX + index * charSpacing, y + 80, char, {
        fontFamily: '"Kaiti", "楷体", "STKaiti", cursive',
        fontSize: '88px',
        color: '#e94560',
        fontStyle: 'bold'
      });
      textObj.setOrigin(0.5);
      textObj.setAlpha(0);
      textObj.setScale(0.5);
      this.titleChars.push(textObj);

      this.time.delayedCall(index * 300, () => {
        this.tweens.add({
          targets: textObj,
          y: y,
          alpha: 1,
          scale: 1,
          duration: 600,
          ease: 'Back.Out'
        });
      });
    });

    const subtitle = this.add.text(x, y + 100, '绘制地形，引导小球到达终点', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '24px',
      color: 'rgba(255,255,255,0.6)'
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0);
    this.time.delayedCall(chars.length * 300 + 400, () => {
      this.tweens.add({
        targets: subtitle,
        alpha: 1,
        duration: 500,
        ease: 'Sine.Out'
      });
    });
  }

  private createMenuButtons(x: number, y: number): void {
    const buttonConfigs = [
      { text: '开始绘制', y: y, action: () => this.startGame() },
      { text: '关卡预览', y: y + 90, action: () => this.showPreview() },
      { text: '设置', y: y + 180, action: () => this.showSettings() }
    ];

    buttonConfigs.forEach((config, index) => {
      const btn = this.createButton(config.text, x, config.y, 280, 64, config.action);
      this.menuButtons.push(btn);
      btn.setAlpha(0);
      btn.y = config.y + 30;
      this.time.delayedCall(2000 + index * 150, () => {
        this.tweens.add({
          targets: btn,
          alpha: 1,
          y: config.y,
          duration: 400,
          ease: 'Back.Out'
        });
      });
    });
  }

  private createButton(text: string, x: number, y: number, width: number, height: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, 0xffffff, 0.1);
    bg.setStrokeStyle(2, 0xe94560, 0.8);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '28px',
      color: '#ffffff'
    });
    label.setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 200,
        ease: 'Sine.Out'
      });
      bg.setFillStyle(0x0f3460, 0.7);
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200,
        ease: 'Sine.Out'
      });
      bg.setFillStyle(0xffffff, 0.1);
    });

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Sine.InOut'
      });
    });

    bg.on('pointerup', () => {
      onClick();
    });

    return container;
  }

  private startGame(levelData?: LevelData): void {
    const storedGravity = localStorage.getItem('gravity_doodle_settings');
    if (storedGravity) {
      const settings = JSON.parse(storedGravity);
      this.gravityAngle = settings.angle ?? 270;
      this.gravityStrength = settings.strength ?? 1;
    }
    this.scene.start('GameScene', { levelData, gravityAngle: this.gravityAngle, gravityStrength: this.gravityStrength });
  }

  private showPreview(): void {
    this.clearAll();
    this.currentView = 'preview';

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const title = this.add.text(centerX, 120, '关卡预览', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '48px',
      color: '#e94560',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    this.backButton = this.createBackButton(100, 100, () => this.showMainMenu());

    if (this.savedLevels.length === 0) {
      const emptyText = this.add.text(centerX, centerY, '暂无保存的关卡', {
        fontFamily: '"Microsoft YaHei"',
        fontSize: '28px',
        color: 'rgba(255,255,255,0.5)'
      });
      emptyText.setOrigin(0.5);
    } else {
      this.renderLevelCards(centerX, centerY);
    }
  }

  private renderLevelCards(cx: number, cy: number): void {
    const cols = Math.min(this.savedLevels.length, 3);
    const startX = cx - ((cols - 1) * 300) / 2;
    const startY = cy - 80;

    this.savedLevels.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * 300;
      const y = startY + row * 280;
      const card = this.createLevelCard(level, x, y, index);
      this.previewCards.push(card);
    });
  }

  private createLevelCard(level: LevelData, x: number, y: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 260, 220, 0xffffff, 0.08);
    bg.setStrokeStyle(2, 0xe94560, 0.5);
    bg.setInteractive({ useHandCursor: true });

    if (level.thumbnail) {
      try {
        const img = this.add.image(0, -30, level.thumbnail);
        if (img) {
          img.setDisplaySize(220, 130);
          container.add(img);
        }
      } catch {
        const placeholder = this.add.rectangle(0, -30, 220, 130, 0x1a1a2e, 1);
        placeholder.setStrokeStyle(1, 0xffffff, 0.3);
        container.add(placeholder);
      }
    } else {
      const placeholder = this.add.rectangle(0, -30, 220, 130, 0x1a1a2e, 1);
      placeholder.setStrokeStyle(1, 0xffffff, 0.3);
      container.add(placeholder);
    }

    const nameText = this.add.text(0, 75, level.name, {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '22px',
      color: '#ffffff'
    });
    nameText.setOrigin(0.5);

    const dateText = this.add.text(0, 100, new Date(level.timestamp).toLocaleDateString(), {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '14px',
      color: 'rgba(255,255,255,0.5)'
    });
    dateText.setOrigin(0.5);

    const deleteBtn = this.add.text(95, -90, '删除', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '16px',
      color: '#ff6b6b'
    });
    deleteBtn.setOrigin(0.5);
    deleteBtn.setInteractive({ useHandCursor: true });
    deleteBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.stopPropagation();
      this.deleteLevel(index);
    });

    container.add([bg, nameText, dateText, deleteBtn]);

    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.05,
        duration: 200,
        ease: 'Sine.Out'
      });
      bg.setStrokeStyle(2, 0xffd700, 0.8);
    });
    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200,
        ease: 'Sine.Out'
      });
      bg.setStrokeStyle(2, 0xe94560, 0.5);
    });
    bg.on('pointerup', () => {
      this.startGame(level);
    });

    return container;
  }

  private deleteLevel(index: number): void {
    this.savedLevels.splice(index, 1);
    localStorage.setItem('gravity_doodle_levels', JSON.stringify(this.savedLevels));
    this.showPreview();
  }

  private createBackButton(x: number, y: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 120, 48, 0xffffff, 0.1);
    bg.setStrokeStyle(2, 0xe94560, 0.8);
    bg.setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, '返回', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '20px',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    container.add([bg, label]);

    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, scale: 1.1, duration: 200, ease: 'Sine.Out' });
      bg.setFillStyle(0x0f3460, 0.7);
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Sine.Out' });
      bg.setFillStyle(0xffffff, 0.1);
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: container, scale: 0.95, duration: 100, yoyo: true, ease: 'Sine.InOut' });
    });
    bg.on('pointerup', () => onClick());

    return container;
  }

  private showSettings(): void {
    this.clearAll();
    this.currentView = 'settings';

    const stored = localStorage.getItem('gravity_doodle_settings');
    if (stored) {
      const s = JSON.parse(stored);
      this.gravityAngle = s.angle ?? 270;
      this.gravityStrength = s.strength ?? 1;
    }

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const title = this.add.text(centerX, 120, '游戏设置', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '48px',
      color: '#e94560',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    this.backButton = this.createBackButton(100, 100, () => {
      this.saveSettings();
      this.showMainMenu();
    });

    this.settingsContainer = this.add.container(centerX, centerY);
    this.createSettingsPanel();
  }

  private createSettingsPanel(): void {
    if (this.settingsContainer === null) return;

    const panelWidth = 700;
    const panelHeight = 500;

    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0xffffff, 0.08);
    panelBg.setStrokeStyle(2, 0xe94560, 0.4);
    this.settingsContainer.add(panelBg);

    const angleLabel = this.add.text(-panelWidth / 2 + 60, -panelHeight / 2 + 80, '重力方向', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '28px',
      color: '#ffffff'
    });
    this.settingsContainer.add(angleLabel);

    this.createSlider(-60, -panelHeight / 2 + 150, 400, this.gravityAngle, 0, 360, '#e94560', (val: number) => {
      this.gravityAngle = val;
      if (this.angleValueText) {
        this.angleValueText.setText(`${Math.round(val)}°`);
      }
      this.updatePreviewTrail();
    }, 'angle');

    this.angleValueText = this.add.text(panelWidth / 2 - 80, -panelHeight / 2 + 150, `${Math.round(this.gravityAngle)}°`, {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '24px',
      color: '#ffd700'
    });
    this.angleValueText.setOrigin(0.5);
    this.settingsContainer.add(this.angleValueText);

    const strengthLabel = this.add.text(-panelWidth / 2 + 60, -panelHeight / 2 + 230, '重力强度', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '28px',
      color: '#ffffff'
    });
    this.settingsContainer.add(strengthLabel);

    this.createSlider(-60, -panelHeight / 2 + 300, 400, this.gravityStrength, -5, 5, '#00ff88', (val: number) => {
      this.gravityStrength = val;
      if (this.strengthValueText) {
        this.strengthValueText.setText(val.toFixed(1));
      }
      this.updatePreviewTrail();
    }, 'strength');

    this.strengthValueText = this.add.text(panelWidth / 2 - 80, -panelHeight / 2 + 300, this.gravityStrength.toFixed(1), {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '24px',
      color: '#ffd700'
    });
    this.strengthValueText.setOrigin(0.5);
    this.settingsContainer.add(this.strengthValueText);

    this.previewTrail = this.add.graphics();
    this.previewBall = this.add.graphics();
    this.settingsContainer.add([this.previewTrail, this.previewBall]);

    this.updatePreviewTrail();
  }

  private createSlider(
    x: number,
    y: number,
    width: number,
    value: number,
    min: number,
    max: number,
    color: string,
    onChange: (val: number) => void,
    type: 'angle' | 'strength'
  ): void {
    if (this.settingsContainer === null) return;
    const scene = this;

    const track = this.add.rectangle(x, y, width, 8, 0xffffff, 0.2);
    track.setStrokeStyle(1, 0xffffff, 0.4);
    this.settingsContainer.add(track);

    const fillRatio = (value - min) / (max - min);
    const fillWidth = fillRatio * width;
    const colorNum = parseInt(color.replace('#', '0x'), 16);
    const fill = this.add.rectangle(x - width / 2 + fillWidth / 2, y, fillWidth, 8, colorNum, 1);
    fill.setOrigin(0, 0.5);
    this.settingsContainer.add(fill);

    const knobX = x - width / 2 + fillRatio * width;
    const knob = this.add.circle(knobX, y, 14, colorNum, 1);
    knob.setStrokeStyle(3, 0xffffff, 0.8);
    knob.setInteractive({ useHandCursor: true, draggable: true });
    this.settingsContainer.add(knob);

    if (type === 'angle') {
      this.angleSliderFill = fill;
      this.angleKnob = knob;
    } else {
      this.strengthSliderFill = fill;
      this.strengthKnob = knob;
    }

    knob.on('pointerdown', () => {
      if (type === 'angle') { this.isDraggingAngle = true; }
      else { this.isDraggingStrength = true; }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const dragging = type === 'angle' ? this.isDraggingAngle : this.isDraggingStrength;
      if (!dragging || !scene.settingsContainer) return;

      const localX = pointer.x - scene.settingsContainer.x;
      const startX = x - width / 2;
      let ratio = (localX - startX) / width;
      ratio = Phaser.Math.Clamp(ratio, 0, 1);
      const newVal = min + ratio * (max - min);
      onChange(newVal);

      const newKnobX = startX + ratio * width;
      knob.x = newKnobX;
      fill.width = ratio * width;
      fill.x = startX + (ratio * width) / 2;
    });

    this.input.on('pointerup', () => {
      this.isDraggingAngle = false;
      this.isDraggingStrength = false;
    });
  }

  private updatePreviewTrail(): void {
    if (!this.previewTrail || !this.previewBall || !this.settingsContainer) return;

    this.previewTrail.clear();
    this.previewBall.clear();

    const startX = 0;
    const startY = 150;
    const rad = Phaser.Math.DegToRad(this.gravityAngle);
    const gx = Math.cos(rad) * this.gravityStrength * 50;
    const gy = Math.sin(rad) * this.gravityStrength * 50;

    this.previewTrail.lineStyle(2, 0xffd700, 0.6);
    this.previewTrail.setDashPattern([8, 6]);

    let px = startX;
    let py = startY;
    let vx = 0;
    let vy = 0;
    const steps = 60;
    const dt = 0.05;
    let started = false;

    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) {
        if (!started) {
          this.previewTrail.beginPath();
          this.previewTrail.moveTo(px, py);
          started = true;
        } else {
          this.previewTrail.lineTo(px, py);
        }
      }
      vx += gx * dt;
      vy += gy * dt;
      px += vx * dt * 60;
      py += vy * dt * 60;
    }
    if (started) {
      this.previewTrail.strokePath();
    }

    this.previewBall.fillStyle(0xe94560, 1);
    this.previewBall.fillCircle(startX, startY, 12);
    this.previewBall.fillStyle(0xffffff, 0.6);
    this.previewBall.fillCircle(startX - 4, startY - 4, 4);
  }

  private saveSettings(): void {
    localStorage.setItem('gravity_doodle_settings', JSON.stringify({
      angle: this.gravityAngle,
      strength: this.gravityStrength
    }));
  }
}
