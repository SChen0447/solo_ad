import Phaser from 'phaser';
import LineTerrain from '../objects/LineTerrain';

type EditMode = 'draw' | 'edit' | 'erase';

interface LevelData {
  name: string;
  thumbnail: string;
  timestamp: number;
  lines: number[][][];
  gravity: { x: number; y: number };
}

interface GameInitData {
  levelData?: LevelData;
  gravityAngle?: number;
  gravityStrength?: number;
}

export default class GameScene extends Phaser.Scene {
  private lineTerrain: LineTerrain | null = null;
  private editMode: EditMode = 'draw';
  private ball: Phaser.Physics.Matter.Image | null = null;
  private goal: Phaser.GameObjects.Sprite | null = null;
  private spikes: Phaser.Physics.Matter.Image[] = [];
  private startPoint: { x: number; y: number } = { x: 150, y: 150 };
  private goalPoint: { x: number; y: number } = { x: 0, y: 0 };
  private gravityAngle: number = 270;
  private gravityStrength: number = 1;
  private gravityCompass: Phaser.GameObjects.Container | null = null;
  private compassNeedle: Phaser.GameObjects.Graphics | null = null;
  private isDraggingCompass: boolean = false;
  private modeButtons: { [key in EditMode]?: Phaser.GameObjects.Container } = {};
  private toolbar: Phaser.GameObjects.Container | null = null;
  private collisionCount: number = 0;
  private startTime: number = 0;
  private isSimulating: boolean = false;
  private hasWon: boolean = false;
  private explosionParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private cursorGraphics: Phaser.GameObjects.Graphics | null = null;
  private topBar: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('GameScene');
  }

  init(data: GameInitData): void {
    if (data.gravityAngle !== undefined) this.gravityAngle = data.gravityAngle;
    if (data.gravityStrength !== undefined) this.gravityStrength = data.gravityStrength;

    const stored = localStorage.getItem('gravity_doodle_settings');
    if (stored) {
      const s = JSON.parse(stored);
      if (data.gravityAngle === undefined) this.gravityAngle = s.angle ?? 270;
      if (data.gravityStrength === undefined) this.gravityStrength = s.strength ?? 1;
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.goalPoint = { x: w - 150, y: h - 150 };

    const bg = this.add.image(w / 2, h / 2, 'background');
    bg.setAlpha(0.3);
    bg.setDisplaySize(w, h);

    this.lineTerrain = new LineTerrain(this);
    this.setupToolbar();
    this.setupTopBar();
    this.setupCompass();
    this.setupSpikes();
    this.setupGoal();
    this.setupBall();
    this.setupInputHandlers();
    this.setupCursor();
    this.setGravity();

    const initData = this.scene.settings.data as GameInitData | undefined;
    if (initData?.levelData?.lines) {
      this.lineTerrain.loadLinesData(initData.levelData.lines);
    }
  }

  private setupToolbar(): void {
    this.toolbar = this.add.container(0, 0);

    const toolbarBg = this.add.rectangle(110, this.cameras.main.height / 2, 180, this.cameras.main.height - 160, 0xffffff, 0.06);
    toolbarBg.setStrokeStyle(1, 0xe94560, 0.25);
    this.toolbar.add(toolbarBg);

    const title = this.add.text(110, 100, '工具栏', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '22px',
      color: '#e94560',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.toolbar.add(title);

    const modes: { key: EditMode; label: string; y: number }[] = [
      { key: 'draw', label: '绘制模式', y: 180 },
      { key: 'edit', label: '编辑模式', y: 250 },
      { key: 'erase', label: '擦除模式', y: 320 }
    ];

    modes.forEach(mode => {
      const btn = this.createModeButton(mode.key, mode.label, 110, mode.y);
      this.modeButtons[mode.key] = btn;
      this.toolbar.add(btn);
    });
    this.updateModeButtons();

    const undoBtn = this.createSmallButton('撤销 (Ctrl+Z)', 110, 400, () => this.undoAction());
    this.toolbar.add(undoBtn);

    const clearBtn = this.createSmallButton('清空画布', 110, 460, () => this.clearCanvas());
    this.toolbar.add(clearBtn);

    const resetBtn = this.createSmallButton('重置 (R)', 110, 520, () => this.resetSimulation());
    this.toolbar.add(resetBtn);

    const startBtn = this.createActionButton('释放小球', 110, 600, () => this.startSimulation(), '#ffd700');
    this.toolbar.add(startBtn);

    const saveBtn = this.createSmallButton('保存关卡', 110, 680, () => this.saveLevel());
    this.toolbar.add(saveBtn);

    const menuBtn = this.createSmallButton('返回菜单', 110, 740, () => this.backToMenu());
    this.toolbar.add(menuBtn);
  }

  private setupTopBar(): void {
    this.topBar = this.add.container(0, 0);
    const w = this.cameras.main.width;

    const barBg = this.add.rectangle(w / 2, 40, w, 70, 0x000000, 0.3);
    this.topBar.add(barBg);

    const title = this.add.text(w / 2, 40, '重力涂鸦 - 关卡编辑器', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.topBar.add(title);

    this.scoreText = this.add.text(w - 30, 40, '', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '18px',
      color: '#ffd700'
    });
    this.scoreText.setOrigin(1, 0.5);
    this.topBar.add(this.scoreText);
  }

  private createModeButton(mode: EditMode, label: string, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 150, 50, 0xffffff, 0.08);
    bg.setStrokeStyle(2, 0xffffff, 0.2);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '18px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Sine.Out' });
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Sine.Out' });
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: container, scale: 0.95, duration: 100, yoyo: true, ease: 'Sine.InOut' });
      this.setEditMode(mode);
    });

    return container;
  }

  private createSmallButton(label: string, x: number, y: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 150, 44, 0xffffff, 0.06);
    bg.setStrokeStyle(1, 0xe94560, 0.4);
    bg.setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '15px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);
    container.add([bg, text]);

    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Sine.Out' });
      bg.setFillStyle(0x0f3460, 0.7);
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Sine.Out' });
      bg.setFillStyle(0xffffff, 0.06);
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: container, scale: 0.95, duration: 100, yoyo: true, ease: 'Sine.InOut' });
    });
    bg.on('pointerup', () => onClick());

    return container;
  }

  private createActionButton(label: string, x: number, y: number, onClick: () => void, colorHex: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const color = parseInt(colorHex.replace('#', '0x'), 16);
    const bg = this.add.rectangle(0, 0, 150, 56, color, 0.85);
    bg.setStrokeStyle(2, 0xffffff, 0.6);
    bg.setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '20px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);
    container.add([bg, text]);

    bg.on('pointerover', () => {
      this.tweens.add({ targets: container, scale: 1.08, duration: 200, ease: 'Sine.Out' });
      bg.setAlpha(1);
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Sine.Out' });
      bg.setAlpha(0.85);
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: container, scale: 0.95, duration: 100, yoyo: true, ease: 'Sine.InOut' });
    });
    bg.on('pointerup', () => onClick());

    return container;
  }

  private setupCompass(): void {
    if (!this.toolbar) return;

    this.gravityCompass = this.add.container(110, this.cameras.main.height - 120);

    const compassBg = this.add.circle(0, 0, 55, 0xffffff, 0.06);
    compassBg.setStrokeStyle(2, 0xe94560, 0.6);
    compassBg.setInteractive({ useHandCursor: true });
    this.gravityCompass.add(compassBg);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r1 = i % 3 === 0 ? 48 : 50;
      const r2 = 55;
      const tick = this.add.line(
        0, 0,
        Math.cos(angle) * r1, Math.sin(angle) * r1,
        Math.cos(angle) * r2, Math.sin(angle) * r2,
        0xe94560, 0.6
      );
      this.gravityCompass.add(tick);
    }

    const dirLabels = [
      { text: 'N', angle: -Math.PI / 2 },
      { text: 'E', angle: 0 },
      { text: 'S', angle: Math.PI / 2 },
      { text: 'W', angle: Math.PI }
    ];
    dirLabels.forEach(dl => {
      const t = this.add.text(Math.cos(dl.angle) * 36, Math.sin(dl.angle) * 36, dl.text, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.6)'
      });
      t.setOrigin(0.5);
      this.gravityCompass.add(t);
    });

    this.compassNeedle = this.add.graphics();
    this.gravityCompass.add(this.compassNeedle);
    this.updateCompassNeedle();

    const label = this.add.text(0, 75, '重力方向', {
      fontFamily: '"Microsoft YaHei"',
      fontSize: '14px',
      color: 'rgba(255,255,255,0.7)'
    });
    label.setOrigin(0.5);
    this.gravityCompass.add(label);

    this.toolbar.add(this.gravityCompass);

    compassBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDraggingCompass = true;
      this.updateGravityFromPointer(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingCompass) {
        this.updateGravityFromPointer(pointer);
      }
    });
    this.input.on('pointerup', () => {
      this.isDraggingCompass = false;
      localStorage.setItem('gravity_doodle_settings', JSON.stringify({
        angle: this.gravityAngle,
        strength: this.gravityStrength
      }));
    });
  }

  private updateGravityFromPointer