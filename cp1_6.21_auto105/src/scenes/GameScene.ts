import Phaser from 'phaser';
import { WeightBlock, BlockWeight, BLOCK_CONFIGS } from '../objects/WeightBlock';
import { Mechanism, MechanismType } from '../objects/Mechanism';
import { ParticleSystem, ParticleType } from '../systems/ParticleSystem';

interface MechanismInfo {
  type: MechanismType;
  x: number;
  y: number;
  isActive: boolean;
  threshold: number;
  currentWeight: number;
  blocksOnMechanism: Set<string>;
  container: Phaser.GameObjects.Container;
  targetContainer: Phaser.GameObjects.Container;
  originalTargetY: number;
  originalTargetAngle: number;
  heavyBlockCount: number;
  isCompleted: boolean;
}

class SoundGenerator {
  private ctx: AudioContext | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playCollision(): void {
    try {
      const ctx = this.ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  }

  playMechanismActivate(): void {
    try {
      const ctx = this.ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1047, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (_) {}
  }

  playChainFriction(): void {
    try {
      const ctx = this.ensureCtx();
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
    } catch (_) {}
  }
}

export class GameScene extends Phaser.Scene {
  private blocks: WeightBlock[] = [];
  private mechanisms: MechanismInfo[] = [];
  private particleSystem!: ParticleSystem;
  private soundGenerator!: SoundGenerator;
  private blockStats = { light: 0, medium: 0, heavy: 0 };
  private totalMechanisms = 3;
  private completedMechanisms = 0;

  private gameAreaWidth = 0;
  private gameAreaHeight = 0;
  private sidebarWidth = 200;
  private groundY = 0;

  private statsText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressBg!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private resetButton!: Phaser.GameObjects.Container;
  private sidebarPanel!: Phaser.GameObjects.Container;

  private pressurePlateDoor!: Phaser.GameObjects.Rectangle;
  private leverPlatform!: Phaser.GameObjects.Container;
  private drawbridgeVisual!: Phaser.GameObjects.Container;

  private dragBlock: WeightBlock | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.calculateLayout();
    this.soundGenerator = new SoundGenerator();
    this.particleSystem = new ParticleSystem(this);

    this.createBackground();
    this.createBoundaries();
    this.createPressurePlate();
    this.createLever();
    this.createDrawbridge();
    this.createSidebar();
    this.createUI();

    this.matter.world.on('collisionstart', (event: any) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair);
      }
    });

    this.events.on('blockCollision', (block: WeightBlock) => {
      this.particleSystem.emit(ParticleType.BlockCollision, block.x, block.y, 8);
      this.soundGenerator.playCollision();
    });
  }

  private calculateLayout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const isNarrow = w < 1024;

    if (isNarrow) {
      this.sidebarWidth = 0;
      this.gameAreaWidth = w;
      this.gameAreaHeight = h - 80;
    } else {
      this.sidebarWidth = 200;
      this.gameAreaWidth = w - this.sidebarWidth;
      this.gameAreaHeight = h;
    }
    this.groundY = this.gameAreaHeight - 50;
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, this.gameAreaWidth, this.gameAreaHeight);

    const gridSpacing = 40;
    const gridColor = 0x2a2a4e;
    bg.lineStyle(1, gridColor, 0.3);
    for (let x = 0; x < this.gameAreaWidth; x += gridSpacing) {
      bg.lineBetween(x, 0, x, this.gameAreaHeight);
    }
    for (let y = 0; y < this.gameAreaHeight; y += gridSpacing) {
      bg.lineBetween(0, y, this.gameAreaWidth, y);
    }

    const ground = this.add.graphics();
    ground.fillStyle(0x3a3a5c, 1);
    ground.fillRect(0, this.groundY, this.gameAreaWidth, 50);

    for (let x = 0; x < this.gameAreaWidth; x += 20) {
      ground.fillStyle(
        x % 40 === 0 ? 0x3e3e62 : 0x363656,
        1
      );
      ground.fillRect(x, this.groundY, 20, 50);
    }
  }

  private createBoundaries(): void {
    this.matter.world.setBounds(
      10,
      0,
      this.gameAreaWidth - 20,
      this.gameAreaHeight,
      30,
      true,
      true,
      true,
      true
    );

    const wallThickness = 20;
    this.matter.add.rectangle(
      this.gameAreaWidth / 2,
      this.groundY + 25,
      this.gameAreaWidth,
      50,
      { isStatic: true, friction: 0.8, label: 'ground' }
    );

    this.matter.add.rectangle(
      wallThickness / 2,
      this.gameAreaHeight / 2,
      wallThickness,
      this.gameAreaHeight,
      { isStatic: true, label: 'leftWall' }
    );

    this.matter.add.rectangle(
      this.gameAreaWidth - wallThickness / 2,
      this.gameAreaHeight / 2,
      wallThickness,
      this.gameAreaHeight,
      { isStatic: true, label: 'rightWall' }
    );
  }

  private createPressurePlate(): void {
    const px = this.gameAreaWidth * 0.2;
    const py = this.groundY;

    const container = this.add.container(px, py);

    const plate = this.add.rectangle(0, -5, 120, 10, 0x5a5a8a);
    plate.setStrokeStyle(1, 0x7a7aaa);
    container.add(plate);

    const base = this.add.rectangle(0, 0, 140, 5, 0x4a4a6a);
    container.add(base);

    const label = this.add.text(0, -25, '压力板', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#8888aa',
    });
    label.setOrigin(0.5);
    container.add(label);

    this.matter.add.rectangle(px, py - 5, 120, 10, {
      isStatic: true,
      isSensor: true,
      label: 'pressurePlate_sensor',
    });

    const doorX = px;
    const doorY = py - 100;
    this.pressurePlateDoor = this.add.rectangle(doorX, doorY, 60, 80, 0x6a4a2a);
    this.pressurePlateDoor.setStrokeStyle(2, 0x8a6a4a);
    this.pressurePlateDoor.setDepth(5);

    const doorFrame = this.add.rectangle(doorX, doorY, 70, 90, 0x2a2a3a);
    doorFrame.setStrokeStyle(2, 0x4a4a6a);
    doorFrame.setDepth(4);

    this.mechanisms.push({
      type: MechanismType.PressurePlate,
      x: px,
      y: py,
      isActive: false,
      threshold: 1,
      currentWeight: 0,
      blocksOnMechanism: new Set(),
      container,
      targetContainer: this.add.container(doorX, doorY),
      originalTargetY: doorY,
      originalTargetAngle: 0,
      heavyBlockCount: 0,
      isCompleted: false,
    });
  }

  private createLever(): void {
    const lx = this.gameAreaWidth * 0.5;
    const ly = this.groundY;

    const container = this.add.container(lx, ly);

    const fulcrum = this.add.triangle(0, -10, 0, -20, -15, 0, 15, 0, 0x5a5a8a);
    fulcrum.setStrokeStyle(1, 0x7a7aaa);
    container.add(fulcrum);

    const beam = this.add.rectangle(0, -20, 160, 8, 0x6a6a9a);
    beam.setStrokeStyle(1, 0x8a8aaa);
    container.add(beam);

    const leftPad = this.add.rectangle(-60, -28, 50, 8, 0x4a4a7a);
    container.add(leftPad);

    const label = this.add.text(0, -50, '杠杆', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#8888aa',
    });
    label.setOrigin(0.5);
    container.add(label);

    this.matter.add.rectangle(lx - 60, ly - 28, 50, 8, {
      isStatic: true,
      isSensor: true,
      label: 'lever_sensor',
    });

    const platX = lx + 80;
    const platY = ly - 80;
    this.leverPlatform = this.add.container(platX, platY);
    const platRect = this.add.rectangle(0, 0, 80, 10, 0x5a8a5a);
    platRect.setStrokeStyle(1, 0x7aaa7a);
    this.leverPlatform.add(platRect);

    const pivot = this.add.circle(0, 0, 5, 0x8a8aaa);
    this.leverPlatform.add(pivot);

    const support = this.add.rectangle(platX, ly - 20, 6, ly - platY, 0x5a5a8a);
    support.setDepth(3);

    this.mechanisms.push({
      type: MechanismType.Lever,
      x: lx - 60,
      y: ly - 28,
      isActive: false,
      threshold: 3,
      currentWeight: 0,
      blocksOnMechanism: new Set(),
      container,
      targetContainer: this.leverPlatform,
      originalTargetY: platY,
      originalTargetAngle: 0,
      heavyBlockCount: 0,
      isCompleted: false,
    });
  }

  private createDrawbridge(): void {
    const dx = this.gameAreaWidth * 0.78;
    const dy = this.groundY;

    const container = this.add.container(dx, dy);

    const dropZone = this.add.rectangle(0, -30, 100, 50, 0x3a3a5a, 0.5);
    dropZone.setStrokeStyle(2, 0x5a5a8a, 0.5);
    container.add(dropZone);

    const label = this.add.text(0, -65, '吊桥区', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#8888aa',
    });
    label.setOrigin(0.5);
    container.add(label);

    this.matter.add.rectangle(dx, dy - 30, 100, 50, {
      isStatic: true,
      isSensor: true,
      label: 'drawbridge_sensor',
    });

    const bridgeX = dx + 60;
    const bridgeY = dy - 120;
    this.drawbridgeVisual = this.add.container(bridgeX, bridgeY);

    const bridge = this.add.rectangle(0, -40, 16, 80, 0x6a4a2a);
    bridge.setStrokeStyle(1, 0x8a6a4a);
    this.drawbridgeVisual.add(bridge);

    const rope1 = this.add.rectangle(-3, -80, 3, 20, 0x8a7a5a);
    this.drawbridgeVisual.add(rope1);
    const rope2 = this.add.rectangle(3, -80, 3, 20, 0x8a7a5a);
    this.drawbridgeVisual.add(rope2);

    const hinge = this.add.circle(0, 0, 4, 0x8a8aaa);
    this.drawbridgeVisual.add(hinge);

    const pillar = this.add.rectangle(bridgeX, dy - 20, 12, dy - bridgeY + 20, 0x4a4a6a);
    pillar.setDepth(3);

    this.mechanisms.push({
      type: MechanismType.Drawbridge,
      x: dx,
      y: dy - 30,
      isActive: false,
      threshold: 10,
      currentWeight: 0,
      blocksOnMechanism: new Set(),
      container,
      targetContainer: this.drawbridgeVisual,
      originalTargetY: bridgeY,
      originalTargetAngle: 0,
      heavyBlockCount: 0,
      isCompleted: false,
    });
  }

  private createSidebar(): void {
    const isNarrow = this.scale.width < 1024;

    if (isNarrow) {
      this.createBottomBar();
      return;
    }

    const sx = this.gameAreaWidth;
    const panel = this.add.container(sx, 0);

    const bg = this.add.rectangle(
      this.sidebarWidth / 2,
      this.gameAreaHeight / 2,
      this.sidebarWidth,
      this.gameAreaHeight,
      0x2a2a2a,
      0.92
    );
    bg.setStrokeStyle(1, 0x3a3a3a);
    panel.add(bg);

    const title = this.add.text(this.sidebarWidth / 2, 25, '方块选择', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#d0d0d0',
    });
    title.setOrigin(0.5);
    panel.add(title);

    const weights: BlockWeight[] = [BlockWeight.Light, BlockWeight.Medium, BlockWeight.Heavy];
    const cardColors = [0x4a9eff, 0x4aff7a, 0xff4a4a];
    const gradientColors = [0x3a7ecc, 0x3acc5a, 0xcc3a3a];
    const cardLabels = ['轻 1kg', '中 3kg', '重 5kg'];

    const cardHeight = 90;
    const cardWidth = 170;
    const startY = 70;
    const gap = 15;

    weights.forEach((weight, i) => {
      const cardY = startY + i * (cardHeight + gap);
      const card = this.add.container(this.sidebarWidth / 2, cardY + cardHeight / 2);

      const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x353535, 1);
      cardBg.setStrokeStyle(1, 0x4a4a4a);

      const cornerRadius = 12;
      cardBg.setAlpha(0.95);
      card.add(cardBg);

      const gradient = this.add.rectangle(
        -cardWidth / 2 + 4,
        0,
        6,
        cardHeight - 8,
        gradientColors[i],
        1
      );
      card.add(gradient);

      const blockPrev = this.add.rectangle(
        -cardWidth / 4,
        -5,
        BLOCK_CONFIGS[weight].width * 0.7,
        BLOCK_CONFIGS[weight].height * 0.7,
        cardColors[i],
        1
      );
      blockPrev.setStrokeStyle(1, 0xffffff, 0.2);
      card.add(blockPrev);

      const cardLabel = this.add.text(cardWidth / 6, -8, cardLabels[i], {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#d0d0d0',
      });
      card.add(cardLabel);

      const weightLabel = this.add.text(cardWidth / 6, 12, `质量: ${weight}kg`, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#909090',
      });
      card.add(weightLabel);

      card.setSize(cardWidth, cardHeight);
      card.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight),
        Phaser.Geom.Rectangle.Contains
      );

      card.on('pointerover', () => {
        this.tweens.add({
          targets: card,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
          ease: 'Quad.easeOut',
        });
      });

      card.on('pointerout', () => {
        this.tweens.add({
          targets: card,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 150,
          ease: 'Quad.easeOut',
        });
      });

      card.on('pointerdown', () => {
        this.tweens.add({
          targets: card,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 100,
          yoyo: true,
          ease: 'Quad.easeOut',
        });

        const glow = this.add.rectangle(
          sx + this.sidebarWidth / 2,
          cardY + cardHeight / 2,
          cardWidth + 20,
          cardHeight + 20,
          cardColors[i],
          0.3
        );
        this.tweens.add({
          targets: glow,
          alpha: 0,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 300,
          ease: 'Quad.easeOut',
          onComplete: () => glow.destroy(),
        });

        this.spawnBlock(weight);
      });

      panel.add(card);
    });

    const helpText = this.add.text(
      this.sidebarWidth / 2,
      this.gameAreaHeight - 100,
      '点击方块卡片\n生成对应方块\n拖拽到场景中',
      {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#707070',
        align: 'center',
      }
    );
    helpText.setOrigin(0.5);
    panel.add(helpText);

    this.sidebarPanel = panel;
    panel.setDepth(50);
  }

  private createBottomBar(): void {
    const panel = this.add.container(0, this.gameAreaHeight);

    const bg = this.add.rectangle(
      this.gameAreaWidth / 2,
      40,
      this.gameAreaWidth,
      80,
      0x2a2a2a,
      0.92
    );
    bg.setStrokeStyle(1, 0x3a3a3a);
    panel.add(bg);

    const weights: BlockWeight[] = [BlockWeight.Light, BlockWeight.Medium, BlockWeight.Heavy];
    const cardColors = [0x4a9eff, 0x4aff7a, 0xff4a4a];
    const cardLabels = ['轻 1kg', '中 3kg', '重 5kg'];

    weights.forEach((weight, i) => {
      const cardX = 100 + i * 200;
      const card = this.add.container(cardX, 40);

      const cardBg = this.add.rectangle(0, 0, 160, 55, 0x353535, 1);
      cardBg.setStrokeStyle(1, 0x4a4a4a);
      card.add(cardBg);

      const blockPrev = this.add.rectangle(
        -40,
        0,
        BLOCK_CONFIGS[weight].width * 0.6,
        BLOCK_CONFIGS[weight].height * 0.6,
        cardColors[i],
        1
      );
      card.add(blockPrev);

      const cardLabel = this.add.text(20, 0, cardLabels[i], {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#d0d0d0',
      });
      cardLabel.setOrigin(0.5);
      card.add(cardLabel);

      card.setSize(160, 55);
      card.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 160, 55),
        Phaser.Geom.Rectangle.Contains
      );

      card.on('pointerdown', () => {
        this.spawnBlock(weight);
      });

      panel.add(card);
    });

    panel.setDepth(50);
  }

  private createUI(): void {
    this.statsText = this.add.text(15, 15, '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#d0d0d0',
    });
    this.statsText.setDepth(60);
    this.updateStatsText();

    const barWidth = 200;
    const barHeight = 16;
    const barX = 15;
    const barY = this.gameAreaHeight - 30;

    this.progressBg = this.add.rectangle(
      barX + barWidth / 2,
      barY,
      barWidth,
      barHeight,
      0x3a3a3a,
      1
    );
    this.progressBg.setOrigin(0.5);
    this.progressBg.setStrokeStyle(1, 0x5a5a5a);
    this.progressBg.setDepth(60);

    this.progressFill = this.add.rectangle(
      barX,
      barY,
      0,
      barHeight - 4,
      0x4aff7a,
      1
    );
    this.progressFill.setOrigin(0, 0.5);
    this.progressFill.setDepth(61);

    this.progressText = this.add.text(barX, barY - 15, '机关完成度: 0%', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#909090',
    });
    this.progressText.setDepth(60);

    const btnX = this.gameAreaWidth - 70;
    const btnY = 20;
    this.resetButton = this.add.container(btnX, btnY);
    this.resetButton.setDepth(60);

    const btnBg = this.add.rectangle(0, 0, 100, 32, 0x4a2a2a, 1);
    btnBg.setStrokeStyle(1, 0x8a4a4a);
    this.resetButton.add(btnBg);

    const btnText = this.add.text(0, 0, '重置关卡', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#d0d0d0',
    });
    btnText.setOrigin(0.5);
    this.resetButton.add(btnText);

    this.resetButton.setSize(100, 32);
    this.resetButton.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 100, 32),
      Phaser.Geom.Rectangle.Contains
    );

    this.resetButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.resetButton,
        x: btnX + Phaser.Math.Between(-3, 3),
        y: btnY + Phaser.Math.Between(-3, 3),
        duration: 30,
        repeat: 5,
        yoyo: true,
        onComplete: () => {
          this.resetButton.setPosition(btnX, btnY);
        },
      });
      this.resetLevel();
    });
  }

  private spawnBlock(weight: BlockWeight): void {
    const spawnX = this.gameAreaWidth * 0.5;
    const spawnY = 60;

    const block = new WeightBlock(this, spawnX, spawnY, weight);
    block.setDepth(20);

    this.blocks.push(block);

    switch (weight) {
      case BlockWeight.Light:
        this.blockStats.light++;
        break;
      case BlockWeight.Medium:
        this.blockStats.medium++;
        break;
      case BlockWeight.Heavy:
        this.blockStats.heavy++;
        break;
    }
    this.updateStatsText();

    this.particleSystem.emit(ParticleType.BlockCollision, spawnX, spawnY, 6);
  }

  private updateStatsText(): void {
    this.statsText.setText(
      `方块统计 - 轻: ${this.blockStats.light}  中: ${this.blockStats.medium}  重: ${this.blockStats.heavy}`
    );
  }

  private updateProgress(): void {
    this.completedMechanisms = this.mechanisms.filter((m) => m.isCompleted).length;
    const pct = this.totalMechanisms > 0 ? this.completedMechanisms / this.totalMechanisms : 0;
    const barWidth = 200;
    const fillWidth = Math.max(0, (barWidth - 4) * pct);

    this.tweens.add({
      targets: this.progressFill,
      width: fillWidth,
      duration: 300,
      ease: 'Quad.easeOut',
    });

    const r = Math.floor(0x4a + (0xff - 0x4a) * (1 - pct));
    const g = Math.floor(0x4a + (0xff - 0x4a) * pct);
    const b = 0x4a;
    this.progressFill.setFillStyle(Phaser.Display.Color.GetColor(r, g, b));

    this.progressText.setText(`机关完成度: ${Math.round(pct * 100)}%`);
  }

  private handleCollision(pair: any): void {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;

    for (const mech of this.mechanisms) {
      const sensorLabel = this.getSensorLabel(mech.type);

      let blockBody: MatterJS.BodyType | null = null;
      let isSensorCollision = false;

      if (
        (bodyA.label === sensorLabel || bodyB.label === sensorLabel)
      ) {
        isSensorCollision = true;
        if (bodyA.label === sensorLabel) {
          blockBody = bodyB;
        } else {
          blockBody = bodyA;
        }
      }

      if (isSensorCollision && blockBody) {
        const block = this.findBlockByBody(blockBody);
        if (block && !mech.blocksOnMechanism.has(block.id)) {
          mech.blocksOnMechanism.add(block.id);
          mech.currentWeight += block.weight;

          if (mech.type === MechanismType.Drawbridge && block.weight === BlockWeight.Heavy) {
            mech.heavyBlockCount++;
          }

          this.evaluateMechanism(mech);
        }
      }
    }
  }

  private getSensorLabel(type: MechanismType): string {
    switch (type) {
      case MechanismType.PressurePlate:
        return 'pressurePlate_sensor';
      case MechanismType.Lever:
        return 'lever_sensor';
      case MechanismType.Drawbridge:
        return 'drawbridge_sensor';
      default:
        return '';
    }
  }

  private findBlockByBody(body: MatterJS.BodyType): WeightBlock | null {
    for (const block of this.blocks) {
      if ((block as any).matterBody === body) {
        return block;
      }
    }
    return null;
  }

  private evaluateMechanism(mech: MechanismInfo): void {
    switch (mech.type) {
      case MechanismType.PressurePlate:
        this.evaluatePressurePlate(mech);
        break;
      case MechanismType.Lever:
        this.evaluateLever(mech);
        break;
      case MechanismType.Drawbridge:
        this.evaluateDrawbridge(mech);
        break;
    }
  }

  private evaluatePressurePlate(mech: MechanismInfo): void {
    if (mech.currentWeight >= mech.threshold && !mech.isActive) {
      mech.isActive = true;
      mech.isCompleted = true;

      this.tweens.add({
        targets: this.pressurePlateDoor,
        y: mech.originalTargetY - 80,
        duration: 1000,
        ease: 'Quad.easeOut',
      });

      this.particleSystem.emitRing(
        ParticleType.PressureGlow,
        mech.x,
        mech.y - 10,
        40,
        16
      );
      this.soundGenerator.playMechanismActivate();
      this.updateProgress();
    }
  }

  private deactivatePressurePlate(mech: MechanismInfo): void {
    if (mech.currentWeight < mech.threshold && mech.isActive) {
      mech.isActive = false;
      mech.isCompleted = false;

      this.tweens.add({
        targets: this.pressurePlateDoor,
        y: mech.originalTargetY,
        duration: 1000,
        ease: 'Quad.easeOut',
      });

      this.updateProgress();
    }
  }

  private evaluateLever(mech: MechanismInfo): void {
    let targetAngle = 0;
    let isCompleted = false;

    if (mech.currentWeight >= BlockWeight.Heavy) {
      targetAngle = -Math.PI / 3;
      isCompleted = true;
    } else if (mech.currentWeight >= BlockWeight.Medium) {
      targetAngle = -Math.PI / 6;
      isCompleted = false;
    }

    if (mech.currentWeight >= BlockWeight.Medium) {
      this.tweens.add({
        targets: this.leverPlatform,
        angle: (targetAngle * 180) / Math.PI,
        duration: 800,
        ease: 'Quad.easeOut',
      });

      if (!mech.isActive) {
        mech.isActive = true;
        this.particleSystem.emit(
          ParticleType.MechanismActivate,
          mech.x,
          mech.y,
          12
        );
        this.soundGenerator.playMechanismActivate();
      }
    } else if (mech.isActive) {
      mech.isActive = false;
      this.tweens.add({
        targets: this.leverPlatform,
        angle: 0,
        duration: 800,
        ease: 'Quad.easeOut',
      });
    }

    mech.isCompleted = isCompleted;
    this.updateProgress();
  }

  private evaluateDrawbridge(mech: MechanismInfo): void {
    if (mech.heavyBlockCount >= 2 && !mech.isActive) {
      mech.isActive = true;
      mech.isCompleted = true;

      this.tweens.add({
        targets: this.drawbridgeVisual,
        angle: 90,
        duration: 800,
        ease: 'Quad.easeOut',
      });

      this.particleSystem.emit(ParticleType.Dust, mech.x, mech.y - 20, 20);
      this.soundGenerator.playChainFriction();
      this.updateProgress();
    } else if (mech.heavyBlockCount < 2 && mech.isActive) {
      mech.isActive = false;
      mech.isCompleted = false;

      this.tweens.add({
        targets: this.drawbridgeVisual,
        angle: 0,
        duration: 800,
        ease: 'Quad.easeOut',
      });

      this.updateProgress();
    }
  }

  private checkBlockMechanismSeparation(): void {
    for (const mech of this.mechanisms) {
      const toRemove: string[] = [];

      for (const blockId of mech.blocksOnMechanism) {
        const block = this.blocks.find((b) => b.id === blockId);
        if (!block || block.isDragging) {
          toRemove.push(blockId);
          continue;
        }

        const dist = Phaser.Math.Distance.Between(block.x, block.y, mech.x, mech.y);
        if (dist > 120) {
          toRemove.push(blockId);
        }
      }

      for (const blockId of toRemove) {
        const block = this.blocks.find((b) => b.id === blockId);
        if (block) {
          mech.currentWeight -= block.weight;
          if (mech.type === MechanismType.Drawbridge && block.weight === BlockWeight.Heavy) {
            mech.heavyBlockCount = Math.max(0, mech.heavyBlockCount - 1);
          }
        }
        mech.blocksOnMechanism.delete(blockId);
      }

      if (toRemove.length > 0) {
        this.evaluateMechanism(mech);
        if (mech.type === MechanismType.PressurePlate) {
          this.deactivatePressurePlate(mech);
        }
      }
    }
  }

  private resetLevel(): void {
    for (const block of this.blocks) {
      block.destroyBlock();
    }
    this.blocks = [];

    this.blockStats = { light: 0, medium: 0, heavy: 0 };
    this.updateStatsText();

    for (const mech of this.mechanisms) {
      mech.isActive = false;
      mech.isCompleted = false;
      mech.currentWeight = 0;
      mech.heavyBlockCount = 0;
      mech.blocksOnMechanism.clear();
    }

    this.tweens.add({
      targets: this.pressurePlateDoor,
      y: this.mechanisms[0].originalTargetY,
      duration: 300,
      ease: 'Quad.easeOut',
    });

    this.tweens.add({
      targets: this.leverPlatform,
      angle: 0,
      duration: 300,
      ease: 'Quad.easeOut',
    });

    this.tweens.add({
      targets: this.drawbridgeVisual,
      angle: 0,
      duration: 300,
      ease: 'Quad.easeOut',
    });

    this.updateProgress();
    this.particleSystem.clear();
  }

  update(): void {
    for (const block of this.blocks) {
      block.updatePosition();
    }

    this.checkBlockMechanismSeparation();
  }
}
