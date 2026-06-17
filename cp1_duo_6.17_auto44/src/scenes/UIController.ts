import Phaser from 'phaser';
import { GameScene, OreType, ORE_CONFIGS, Asteroid } from './GameScene';

export class UIController extends Phaser.Scene {
  gameScene!: GameScene;

  hudContainer!: Phaser.GameObjects.Container;
  levelText!: Phaser.GameObjects.Text;
  creditsText!: Phaser.GameObjects.Text;
  oreTotalText!: Phaser.GameObjects.Text;
  cargoText!: Phaser.GameObjects.Text;

  marketTexts: Phaser.GameObjects.Text[] = [];
  minimapGfx!: Phaser.GameObjects.Graphics;

  upgradePanel!: Phaser.GameObjects.Container;
  upgradePanelVisible = false;
  smelterPanel!: Phaser.GameObjects.Container;
  smelterPanelVisible = false;
  marketPanel!: Phaser.GameObjects.Container;
  marketPanelVisible = false;
  leaderboardPanel!: Phaser.GameObjects.Container;
  leaderboardPanelVisible = false;
  asteroidPanel!: Phaser.GameObjects.Container;
  asteroidPanelVisible = false;

  asteroidOreTexts: Phaser.GameObjects.Text[] = [];
  notificationText!: Phaser.GameObjects.Text;
  notificationTween?: Phaser.Tweens.Tween;

  dockedLabel!: Phaser.GameObjects.Text;
  stationLabel!: Phaser.GameObjects.Text;

  animatedValues: Map<string, { current: number; target: number; text: Phaser.GameObjects.Text }> = new Map();
  smelterProgressBars: Phaser.GameObjects.Graphics[] = [];
  smelterLabels: Phaser.GameObjects.Text[] = [];
  smelterSlotGfx: Phaser.GameObjects.Graphics[] = [];
  smelterEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  leaderboardEntries: Phaser.GameObjects.Text[] = [];

  shortcutKeys!: { U: Phaser.Input.Keyboard.Key; M: Phaser.Input.Keyboard.Key; L: Phaser.Input.Keyboard.Key; F: Phaser.Input.Keyboard.Key };

  draggedOre: { ore: OreType; sprite: Phaser.GameObjects.Graphics } | null = null;
  smelterSlotRects: { x: number; y: number; w: number; h: number }[] = [];

  techTreeNodes: Map<string, { graphics: Phaser.GameObjects.Graphics; shine?: Phaser.GameObjects.Graphics; glow?: Phaser.GameObjects.Graphics }> = new Map();
  techTreeLines: Map<string, Phaser.GameObjects.Graphics> = new Map();
  lastUnlockedNodeId: string | null = null;

  constructor() {
    super({ key: 'UIController' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene') as GameScene;
    this.initShortcutKeys();
    this.createHUD();
    this.createMarketTicker();
    this.createMinimap();
    this.createUpgradePanel();
    this.createSmelterPanel();
    this.createMarketPanel();
    this.createLeaderboardPanel();
    this.createAsteroidPanel();
    this.createNotification();
    this.createProximityLabels();
    this.setupEvents();
    this.setupDragAndDrop();
    this.scale.on('resize', this.handleResize, this);
  }

  initShortcutKeys() {
    if (!this.input.keyboard) return;
    this.shortcutKeys = {
      U: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      M: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      L: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      F: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(100).setScrollFactor(0);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0a0a1a, 0.7);
    hudBg.fillRoundedRect(12, 12, 260, 110, 8);
    hudBg.lineStyle(1, 0x00d4ff, 0.3);
    hudBg.strokeRoundedRect(12, 12, 260, 110, 8);
    this.hudContainer.add(hudBg);

    this.levelText = this.add.text(28, 24, '等级: 1', { fontSize: '16px', color: '#00d4ff', fontFamily: 'sans-serif' });
    this.creditsText = this.add.text(28, 48, '金币: 1000', { fontSize: '16px', color: '#ffcc00', fontFamily: 'sans-serif' });
    this.oreTotalText = this.add.text(28, 72, '总采矿: 0', { fontSize: '16px', color: '#88aacc', fontFamily: 'sans-serif' });
    this.cargoText = this.add.text(28, 96, '货仓: 0/10', { fontSize: '14px', color: '#aabbcc', fontFamily: 'sans-serif' });

    this.hudContainer.add([this.levelText, this.creditsText, this.oreTotalText, this.cargoText]);
    this.animatedValues.set('credits', { current: 1000, target: 1000, text: this.creditsText });
    this.animatedValues.set('oreTotal', { current: 0, target: 0, text: this.oreTotalText });
  }

  createMarketTicker() {
    const container = this.add.container(0, 0).setDepth(100).setScrollFactor(0);
    const w = this.scale.width;
    const tickerBg = this.add.graphics();
    tickerBg.fillStyle(0x0a0a1a, 0.6);
    tickerBg.fillRoundedRect(12, this.scale.height - 52, w - 24, 40, 6);
    container.add(tickerBg);

    const labels = ['铁矿', '铜矿', '银矿', '金矿', '水晶'];
    let xPos = 28;
    ORE_CONFIGS.forEach((cfg, i) => {
      const txt = this.add.text(xPos, this.scale.height - 42, `${labels[i]}: ${cfg.value}`, {
        fontSize: '13px', color: '#88aacc', fontFamily: 'sans-serif',
      });
      container.add(txt);
      this.marketTexts.push(txt);
      xPos += (w - 56) / 5;
    });
  }

  createMinimap() {
    const container = this.add.container(0, 0).setDepth(100).setScrollFactor(0);
    const mapSize = 140;
    const mapX = this.scale.width - mapSize - 16;
    const mapY = this.scale.height - mapSize - 60;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.7);
    bg.fillRoundedRect(mapX, mapY, mapSize, mapSize, 6);
    bg.lineStyle(1, 0x00d4ff, 0.3);
    bg.strokeRoundedRect(mapX, mapY, mapSize, mapSize, 6);
    container.add(bg);

    this.minimapGfx = this.add.graphics();
    this.minimapGfx.setPosition(mapX, mapY);
    container.add(this.minimapGfx);
  }

  createUpgradePanel() {
    this.upgradePanel = this.add.container(0, 0).setDepth(200).setScrollFactor(0).setVisible(false).setAlpha(0);
    const pw = 640, ph = 520;
    const px = (this.scale.width - pw) / 2, py = this.scale.height - ph - 20;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.97);
    panelBg.fillRoundedRect(0, 0, pw, ph, 12);
    panelBg.lineStyle(2, 0x00d4ff, 0.7);
    panelBg.strokeRoundedRect(0, 0, pw, ph, 12);
    this.upgradePanel.add(panelBg);

    this.upgradePanel.add(
      this.add.text(pw / 2, 20, '⚡ 科技树', { fontSize: '24px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold' }).setOrigin(0.5, 0)
    );

    const closeBtn = this.add.text(pw - 24, 12, '✕', { fontSize: '20px', color: '#ff6666', fontFamily: 'sans-serif' }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleUpgradePanel());
    this.upgradePanel.add(closeBtn);

    const nodes = this.gameScene.upgradeNodes;
    const colWidth = pw / 4, rowHeight = 120;

    this.techTreeNodes.clear();
    this.techTreeLines.clear();

    for (const node of nodes) {
      const nx = 40 + node.col * colWidth, ny = 70 + node.row * rowHeight;

      for (const reqId of node.requires) {
        const req = nodes.find(n => n.id === reqId);
        if (req) {
          const lineId = `${req.id}_${node.id}`;
          const line = this.add.graphics();
          const fromX = 40 + req.col * colWidth + (colWidth - 30) / 2;
          const fromY = 70 + req.row * rowHeight + 80;
          const toX = nx + (colWidth - 30) / 2;
          const toY = ny;

          const isUnlockedPath = node.unlocked || req.unlocked;
          line.lineStyle(isUnlockedPath ? 3 : 2, isUnlockedPath ? 0x00d4ff : 0x334466, isUnlockedPath ? 0.9 : 0.3);
          line.beginPath();
          line.moveTo(fromX, fromY);
          line.lineTo(toX, toY);
          line.strokePath();
          line.setDepth(-1);
          this.upgradePanel.add(line);
          this.techTreeLines.set(lineId, line);

          if (isUnlockedPath) {
            this.tweens.add({
              targets: line,
              alpha: { from: 0.5, to: 1 },
              duration: 1500,
              yoyo: true,
              repeat: -1,
            });
          }
        }
      }

      const nodeGfx = this.add.graphics();
      const nodeWidth = colWidth - 30, nodeHeight = 80;

      const fillColor = node.unlocked ? 0x004466 : 0x222244;
      const strokeColor = node.unlocked ? 0x00d4ff : 0x334466;
      nodeGfx.fillStyle(fillColor, 0.95);
      nodeGfx.fillRoundedRect(nx, ny, nodeWidth, nodeHeight, 8);
      nodeGfx.lineStyle(2, strokeColor, node.unlocked ? 1 : 0.5);
      nodeGfx.strokeRoundedRect(nx, ny, nodeWidth, nodeHeight, 8);
      this.upgradePanel.add(nodeGfx);

      const glowGfx = this.add.graphics();
      glowGfx.fillStyle(0x00d4ff, 0.0);
      glowGfx.fillRoundedRect(nx - 4, ny - 4, nodeWidth + 8, nodeHeight + 8, 10);
      glowGfx.setDepth(-2);
      this.upgradePanel.add(glowGfx);

      if (node.unlocked) {
        this.tweens.add({
          targets: glowGfx,
          fillAlpha: { from: 0.1, to: 0.25 },
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      }

      let shineGfx: Phaser.GameObjects.Graphics | undefined;
      if (node.unlocked) {
        shineGfx = this.add.graphics();
        shineGfx.fillStyle(0x00d4ff, 0);
        shineGfx.fillRoundedRect(nx, ny, nodeWidth, nodeHeight, 8);
        shineGfx.setDepth(2);
        this.upgradePanel.add(shineGfx);

        const shineTween = this.tweens.add({
          targets: shineGfx,
          fillAlpha: { from: 0, to: 0.4 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 1000,
        });

        if (this.lastUnlockedNodeId === node.id) {
          shineTween.stop();
          shineTween.restart();
          this.cameras.main.flash(500, 0, 84, 102, false);
        }
      }

      this.techTreeNodes.set(node.id, { graphics: nodeGfx, shine: shineGfx, glow: glowGfx });

      this.upgradePanel.add(this.add.text(nx + 8, ny + 8, node.name, { fontSize: '13px', color: node.unlocked ? '#00d4ff' : '#667788', fontFamily: 'sans-serif', fontStyle: node.unlocked ? 'bold' : 'normal' }));
      this.upgradePanel.add(this.add.text(nx + 8, ny + 30, `💰 ${node.cost}`, { fontSize: '12px', color: '#ffcc00', fontFamily: 'sans-serif' }));

      const statusColor = node.unlocked ? '#44ff88' : '#556677';
      const statusText = node.unlocked ? '✓ 已解锁' : '🔒 未解锁';
      this.upgradePanel.add(this.add.text(nx + 8, ny + 52, statusText, { fontSize: '11px', color: statusColor, fontFamily: 'sans-serif' }));

      if (!node.unlocked) {
        const btn = this.add.graphics();
        btn.fillStyle(0x00d4ff, 0.2);
        btn.fillRoundedRect(nx + 4, ny + 64, nodeWidth - 8, 12, 4);
        btn.setInteractive(new Phaser.Geom.Rectangle(nx + 4, ny + 64, nodeWidth - 8, 12), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
        btn.on('pointerdown', () => {
          this.lastUnlockedNodeId = node.id;
          this.gameScene.purchaseUpgrade(node.id);
        });
        btn.on('pointerover', () => btn.setAlpha(1));
        btn.on('pointerout', () => btn.setAlpha(0.5));
        btn.setAlpha(0.5);
        this.upgradePanel.add(btn);
        this.upgradePanel.add(this.add.text(nx + nodeWidth / 2, ny + 70, '🔓 解锁', { fontSize: '10px', color: '#00d4ff', fontFamily: 'sans-serif' }).setOrigin(0.5, 0));
      }
    }

    this.upgradePanel.setPosition(px, py);
  }

  createSmelterPanel() {
    this.smelterPanel = this.add.container(0, 0).setDepth(200).setScrollFactor(0).setVisible(false).setAlpha(0);
    const pw = 680, ph = 260;
    const px = (this.scale.width - pw) / 2, py = this.scale.height - ph - 20;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.fillRoundedRect(0, 0, pw, ph, 12);
    panelBg.lineStyle(2, 0x00d4ff, 0.7);
    panelBg.strokeRoundedRect(0, 0, pw, ph, 12);
    this.smelterPanel.add(panelBg);

    this.smelterPanel.add(this.add.text(pw / 2, 16, '🔥 熔炼炉', { fontSize: '20px', color: '#00d4ff', fontFamily: 'sans-serif' }).setOrigin(0.5, 0));

    const closeBtn = this.add.text(pw - 24, 8, '✕', { fontSize: '20px', color: '#ff6666', fontFamily: 'sans-serif' }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleSmelterPanel());
    this.smelterPanel.add(closeBtn);

    this.smelterPanel.add(this.add.text(20, 50, '拖拽矿石至此:', { fontSize: '13px', color: '#88aacc', fontFamily: 'sans-serif' }));

    const slotWidth = 65;
    const startX = (pw - 6 * slotWidth - 5 * 8) / 2;
    const slotY = 80;

    this.smelterSlotRects = [];

    const fireTexture = this.make.graphics({ x: 0, y: 0, add: false });
    fireTexture.fillStyle(0xff6600, 1);
    fireTexture.fillCircle(6, 6, 6);
    fireTexture.fillStyle(0xffff00, 0.6);
    fireTexture.fillCircle(6, 4, 3);
    fireTexture.generateTexture('fireParticle', 12, 12);
    fireTexture.destroy();

    for (let i = 0; i < 6; i++) {
      const sx = startX + i * (slotWidth + 8);
      const slotGfx = this.add.graphics();
      slotGfx.fillStyle(0x222244, 0.8);
      slotGfx.fillRoundedRect(sx, slotY, slotWidth, 80, 6);
      slotGfx.lineStyle(1, 0x334466, 0.6);
      slotGfx.strokeRoundedRect(sx, slotY, slotWidth, 80, 6);
      slotGfx.setInteractive(new Phaser.Geom.Rectangle(sx, slotY, slotWidth, 80), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      slotGfx.setData('slotIndex', i);
      this.smelterPanel.add(slotGfx);
      this.smelterSlotGfx.push(slotGfx);

      this.smelterSlotRects.push({ x: sx, y: slotY, w: slotWidth, h: 80 });

      const pb = this.add.graphics();
      this.smelterPanel.add(pb);
      this.smelterProgressBars.push(pb);

      const label = this.add.text(sx + slotWidth / 2, slotY + 35, '空', { fontSize: '12px', color: '#556677', fontFamily: 'sans-serif' }).setOrigin(0.5);
      this.smelterPanel.add(label);
      this.smelterLabels.push(label);

      const smeltBtn = this.add.text(sx + slotWidth / 2, slotY + 60, '熔炼', { fontSize: '11px', color: '#00d4ff', fontFamily: 'sans-serif' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      smeltBtn.on('pointerdown', () => this.gameScene.startSmelting(i));
      this.smelterPanel.add(smeltBtn);

      const emitter = this.add.particles(0, 0, 'fireParticle', {
        speed: { min: 15, max: 40 },
        lifespan: 600,
        alpha: { start: 0.8, end: 0 },
        scale: { start: 0.8, end: 0.1 },
        blendMode: 'ADD',
        emitting: false,
        quantity: 3,
        follow: this.smelterPanel,
        followOffset: { x: sx + slotWidth / 2, y: slotY + 80 },
      });
      emitter.setDepth(201);
      this.smelterEmitters.push(emitter);
    }

    this.smelterPanel.add(this.add.text(20, ph - 30, '拖拽矿石到槽位 | 点击熔炼按钮开始', { fontSize: '11px', color: '#556677', fontFamily: 'sans-serif' }));
    this.smelterPanel.setPosition(px, py);
  }

  createMarketPanel() {
    this.marketPanel = this.add.container(0, 0).setDepth(200).setScrollFactor(0).setVisible(false).setAlpha(0);
    const pw = 380, ph = 420;
    const px = this.scale.width - pw - 16, py = 16;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.fillRoundedRect(0, 0, pw, ph, 12);
    panelBg.lineStyle(2, 0x00d4ff, 0.7);
    panelBg.strokeRoundedRect(0, 0, pw, ph, 12);
    this.marketPanel.add(panelBg);

    this.marketPanel.add(this.add.text(pw / 2, 16, '💰 星际市场', { fontSize: '20px', color: '#00d4ff', fontFamily: 'sans-serif' }).setOrigin(0.5, 0));

    const closeBtn = this.add.text(pw - 24, 8, '✕', { fontSize: '20px', color: '#ff6666', fontFamily: 'sans-serif' }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleMarketPanel());
    this.marketPanel.add(closeBtn);

    const labels = ['铁矿', '铜矿', '银矿', '金矿', '水晶'];
    ORE_CONFIGS.forEach((cfg, i) => {
      const ry = 55 + i * 55;
      this.marketPanel.add(this.add.text(20, ry, labels[i], { fontSize: '15px', color: '#aabbcc', fontFamily: 'sans-serif' }));
      this.marketPanel.add(this.add.text(100, ry, `${cfg.value} CR`, { fontSize: '15px', color: '#ffcc00', fontFamily: 'sans-serif' }));

      const sellBtn = this.add.text(pw - 90, ry, '出售 x1', {
        fontSize: '13px', color: '#00d4ff', fontFamily: 'sans-serif', backgroundColor: '#222244', padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true });
      sellBtn.on('pointerdown', () => this.gameScene.placeSellOrder(cfg.type, 1));
      sellBtn.on('pointerover', () => sellBtn.setColor('#44eeff'));
      sellBtn.on('pointerout', () => sellBtn.setColor('#00d4ff'));
      this.marketPanel.add(sellBtn);

      const sellAllBtn = this.add.text(pw - 90, ry + 22, '全部出售', {
        fontSize: '12px', color: '#88aacc', fontFamily: 'sans-serif',
      }).setInteractive({ useHandCursor: true });
      sellAllBtn.on('pointerdown', () => {
        const count = this.gameScene.cargo.filter(o => o === cfg.type).length;
        if (count > 0) this.gameScene.placeSellOrder(cfg.type, count);
      });
      this.marketPanel.add(sellAllBtn);
    });

    this.marketPanel.add(this.add.text(pw / 2, ph - 30, '手续费: 5% | 挂单有效期: 24小时', {
      fontSize: '11px', color: '#556677', fontFamily: 'sans-serif',
    }).setOrigin(0.5));

    this.marketPanel.setPosition(px, py);
  }

  createLeaderboardPanel() {
    this.leaderboardPanel = this.add.container(0, 0).setDepth(200).setScrollFactor(0).setVisible(false).setAlpha(0);
    const pw = 340, ph = 360;
    const px = (this.scale.width - pw) / 2, py = (this.scale.height - ph) / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.fillRoundedRect(0, 0, pw, ph, 12);
    panelBg.lineStyle(2, 0x00d4ff, 0.7);
    panelBg.strokeRoundedRect(0, 0, pw, ph, 12);
    this.leaderboardPanel.add(panelBg);

    this.leaderboardPanel.add(this.add.text(pw / 2, 16, '🏆 排行榜', { fontSize: '20px', color: '#00d4ff', fontFamily: 'sans-serif' }).setOrigin(0.5, 0));

    const closeBtn = this.add.text(pw - 24, 8, '✕', { fontSize: '20px', color: '#ff6666', fontFamily: 'sans-serif' }).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleLeaderboardPanel());
    this.leaderboardPanel.add(closeBtn);

    this.leaderboardPanel.add(this.add.text(20, 50, '排名        玩家          金币         矿石', { fontSize: '12px', color: '#667788', fontFamily: 'sans-serif' }));

    this.leaderboardEntries = [];
    for (let i = 0; i < 8; i++) {
      const entry = this.add.text(20, 74 + i * 30, `${i + 1}.  ---  ---  ---`, { fontSize: '13px', color: '#aabbcc', fontFamily: 'sans-serif' });
      this.leaderboardPanel.add(entry);
      this.leaderboardEntries.push(entry);
    }

    this.leaderboardPanel.setPosition(px, py);
  }

  createAsteroidPanel() {
    this.asteroidPanel = this.add.container(0, 0).setDepth(150).setScrollFactor(0).setVisible(false).setAlpha(0);
    const pw = 320, ph = 180;
    const px = 16, py = 140;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.9);
    panelBg.fillRoundedRect(0, 0, pw, ph, 10);
    panelBg.lineStyle(1, 0x00d4ff, 0.5);
    panelBg.strokeRoundedRect(0, 0, pw, ph, 10);
    this.asteroidPanel.add(panelBg);

    this.asteroidPanel.add(this.add.text(pw / 2, 12, '⛏ 小行星矿石', { fontSize: '16px', color: '#00d4ff', fontFamily: 'sans-serif' }).setOrigin(0.5, 0));

    const oreLabels = ['铁矿', '铜矿', '银矿', '金矿', '水晶'];
    ORE_CONFIGS.forEach((cfg, i) => {
      const txt = this.add.text(20, 40 + i * 24, `${oreLabels[i]}: 0`, { fontSize: '13px', color: '#aabbcc', fontFamily: 'sans-serif' });
      this.asteroidPanel.add(txt);
      this.asteroidOreTexts.push(txt);
    });

    this.asteroidPanel.add(this.add.text(pw / 2, ph - 22, '点击相邻格子建立传送带', { fontSize: '11px', color: '#556677', fontFamily: 'sans-serif' }).setOrigin(0.5));
    this.asteroidPanel.setPosition(px, py);
  }

  createNotification() {
    this.notificationText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, '', {
      fontSize: '18px', color: '#ffcc00', fontFamily: 'sans-serif',
      backgroundColor: '#1a1a2e', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0).setAlpha(0);
  }

  createProximityLabels() {
    this.dockedLabel = this.add.text(this.scale.width / 2, this.scale.height - 100, '', {
      fontSize: '14px', color: '#00d4ff', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);

    this.stationLabel = this.add.text(this.scale.width / 2, this.scale.height - 80, '', {
      fontSize: '14px', color: '#ffcc00', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0).setAlpha(0);
  }

  setupEvents() {
    this.game.events.on('stats-updated', (level: number, credits: number, oreTotal: number) => {
      this.animateValue('credits', credits);
      this.animateValue('oreTotal', oreTotal);
      this.levelText.setText(`等级: ${level}`);
    });

    this.game.events.on('cargo-updated', (cargo: OreType[], capacity: number) => {
      this.cargoText.setText(`货仓: ${cargo.length}/${capacity}`);
    });

    this.game.events.on('market-updated', (prices: any[]) => {
      this.updateMarketTicker(prices);
    });

    this.game.events.on('docked-asteroid', (asteroid: Asteroid) => {
      this.showAsteroidPanel(asteroid);
      this.dockedLabel.setText('已停靠 - 点击格子采矿');
      this.tweens.add({ targets: this.dockedLabel, alpha: 1, duration: 300 });
    });

    this.game.events.on('undocked-asteroid', () => {
      this.hideAsteroidPanel();
      this.tweens.add({ targets: this.dockedLabel, alpha: 0, duration: 300 });
    });

    this.game.events.on('proximity-station', (near: boolean) => {
      if (near) {
        this.stationLabel.setText('靠近空间站 - 按M打开市场 / U升级 / L排行榜 / F熔炼');
        this.tweens.add({ targets: this.stationLabel, alpha: 1, duration: 300 });
      } else {
        this.tweens.add({ targets: this.stationLabel, alpha: 0, duration: 300 });
      }
    });

    this.game.events.on('smelter-started', (slotIndex: number) => {
      if (this.smelterEmitters[slotIndex]) {
        this.smelterEmitters[slotIndex].start();
      }
    });

    this.game.events.on('smelter-progress', (slotIndex: number, progress: number) => {
      this.updateSmelterProgress(slotIndex, progress);
    });

    this.game.events.on('smelter-complete', (slotIndex: number, value: number) => {
      this.smelterLabels[slotIndex]?.setText('空');
      this.smelterLabels[slotIndex]?.setColor('#556677');
      if (this.smelterProgressBars[slotIndex]) this.smelterProgressBars[slotIndex].clear();
      if (this.smelterEmitters[slotIndex]) this.smelterEmitters[slotIndex].stop();
      this.showNotification(`熔炼完成！获得 ${value} 金币`);
    });

    this.game.events.on('upgrade-unlocked', (nodeId: string) => {
      this.showNotification(`科技解锁: ${nodeId}`);
      this.rebuildUpgradePanel();
    });

    this.game.events.on('show-notification', (msg: string) => {
      this.showNotification(msg);
    });
  }

  showNotification(msg: string) {
    this.notificationText.setText(msg);
    if (this.notificationTween) this.notificationTween.stop();
    this.notificationText.setAlpha(1);
    this.notificationTween = this.tweens.add({
      targets: this.notificationText,
      alpha: 0,
      duration: 2000,
      delay: 500,
    });
  }

  animateValue(key: string, target: number) {
    const entry = this.animatedValues.get(key);
    if (!entry) return;
    entry.target = target;

    const anim = { val: entry.current };
    this.tweens.add({
      targets: anim,
      val: target,
      duration: 150,
      onUpdate: () => {
        entry.current = Math.floor(anim.val);
        if (key === 'credits') entry.text.setText(`金币: ${entry.current}`);
        else if (key === 'oreTotal') entry.text.setText(`总采矿: ${entry.current}`);
      },
    });
  }

  updateMarketTicker(prices: any[]) {
    const labels = ['铁矿', '铜矿', '银矿', '金矿', '水晶'];
    prices.forEach((p, i) => {
      if (this.marketTexts[i]) {
        const arrow = p.change >= 0 ? '▲' : '▼';
        const color = p.change >= 0 ? '#44ff88' : '#ff4444';
        this.marketTexts[i].setText(`${labels[i]}: ${Math.floor(p.price)} ${arrow}`);
        this.marketTexts[i].setColor(color);
      }
    });
  }

  updateSmelterProgress(slotIndex: number, progress: number) {
    if (slotIndex >= this.smelterProgressBars.length) return;
    const pb = this.smelterProgressBars[slotIndex];
    if (!pb) return;

    const slotWidth = 65;
    const startX = (680 - 6 * slotWidth - 5 * 8) / 2;
    const sx = startX + slotIndex * (slotWidth + 8);
    const sy = 80;
    const slotHeight = 80;

    pb.clear();
    const fillHeight = slotHeight * progress;
    pb.fillStyle(0xff6600, 0.6);
    pb.fillRoundedRect(sx + 2, sy + slotHeight - fillHeight, slotWidth - 4, fillHeight, 3);
  }

  updateMinimap() {
    if (!this.gameScene.ship || !this.minimapGfx) return;
    this.minimapGfx.clear();

    const mapSize = 140;
    const scaleX = mapSize / this.gameScene.worldWidth;
    const scaleY = mapSize / this.gameScene.worldHeight;

    for (const ast of this.gameScene.asteroids) {
      const mx = ast.x * scaleX;
      const my = ast.y * scaleY;
      this.minimapGfx.fillStyle(0x445566, 0.8);
      this.minimapGfx.fillCircle(mx, my, 3);
    }

    const sx = this.gameScene.ship.x * scaleX;
    const sy = this.gameScene.ship.y * scaleY;
    this.minimapGfx.fillStyle(0x00d4ff, 1);
    this.minimapGfx.fillCircle(sx, sy, 4);

    const shipAngle = this.gameScene.shipBody.rotation;
    this.minimapGfx.lineStyle(1, 0x00d4ff, 1);
    this.minimapGfx.beginPath();
    this.minimapGfx.moveTo(sx, sy);
    this.minimapGfx.lineTo(
      sx + Math.cos(shipAngle - Math.PI / 2) * 8,
      sy + Math.sin(shipAngle - Math.PI / 2) * 8
    );
    this.minimapGfx.strokePath();

    const stationX = this.gameScene.stationX * scaleX;
    const stationY = this.gameScene.stationY * scaleY;
    this.minimapGfx.fillStyle(0xffcc00, 0.8);
    this.minimapGfx.fillCircle(stationX, stationY, 4);
  }

  handleResize() {
  }

  update() {
    this.updateMinimap();
    this.checkKeyboardShortcuts();
  }

  showAsteroidPanel(asteroid: Asteroid) {
    const counts = new Map<OreType, number>();
    ORE_CONFIGS.forEach(cfg => counts.set(cfg.type, 0));
    for (const cell of asteroid.cells) {
      if (!cell.mined) {
        counts.set(cell.ore, (counts.get(cell.ore) || 0) + 1);
      }
    }
    const oreLabels = ['铁矿', '铜矿', '银矿', '金矿', '水晶'];
    ORE_CONFIGS.forEach((cfg, i) => {
      if (this.asteroidOreTexts[i]) {
        this.asteroidOreTexts[i].setText(`${oreLabels[i]}: ${counts.get(cfg.type) || 0}`);
      }
    });

    this.asteroidPanelVisible = true;
    this.asteroidPanel.setVisible(true);
    this.tweens.add({ targets: this.asteroidPanel, alpha: 1, y: this.asteroidPanel.y, duration: 300, ease: 'Back.easeOut' });
  }

  hideAsteroidPanel() {
    this.asteroidPanelVisible = false;
    this.tweens.add({ targets: this.asteroidPanel, alpha: 0, duration: 200, onComplete: () => this.asteroidPanel.setVisible(false) });
  }

  toggleUpgradePanel() {
    this.upgradePanelVisible = !this.upgradePanelVisible;
    this.togglePanel(this.upgradePanel, this.upgradePanelVisible);
  }

  toggleSmelterPanel() {
    this.smelterPanelVisible = !this.smelterPanelVisible;
    this.togglePanel(this.smelterPanel, this.smelterPanelVisible);
  }

  toggleMarketPanel() {
    this.marketPanelVisible = !this.marketPanelVisible;
    this.togglePanel(this.marketPanel, this.marketPanelVisible);
  }

  toggleLeaderboardPanel() {
    this.leaderboardPanelVisible = !this.leaderboardPanelVisible;
    this.togglePanel(this.leaderboardPanel, this.leaderboardPanelVisible);
    if (this.leaderboardPanelVisible) {
      this.gameScene.fetchLeaderboard().then((data: any[]) => {
        if (data && data.length > 0) {
          this.updateLeaderboard(data);
        }
      });
    }
  }

  togglePanel(panel: Phaser.GameObjects.Container, visible: boolean) {
    if (visible) {
      panel.setVisible(true);
      this.tweens.add({ targets: panel, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    } else {
      this.tweens.add({ targets: panel, alpha: 0, duration: 200, onComplete: () => panel.setVisible(false) });
    }
  }

  rebuildUpgradePanel() {
    this.upgradePanel.removeAll(true);
    this.createUpgradePanel();
  }

  setupDragAndDrop() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.smelterPanelVisible || this.draggedOre) return;
      const cargo = this.gameScene.cargo;
      if (cargo.length === 0) return;

      const oreToDrag = cargo[0];
      const cfg = ORE_CONFIGS.find(c => c.type === oreToDrag)!;

      const sprite = this.add.graphics();
      sprite.fillStyle(cfg.color, 1);
      sprite.fillCircle(0, 0, 12);
      sprite.fillStyle(0xffffff, 0.5);
      sprite.fillCircle(-3, -3, 4);
      sprite.setPosition(pointer.x, pointer.y);
      sprite.setDepth(400);
      sprite.setScrollFactor(0);

      this.draggedOre = { ore: oreToDrag, sprite };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.draggedOre) {
        this.draggedOre.sprite.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggedOre) return;

      let placed = false;
      if (this.smelterPanelVisible) {
        const panelX = this.smelterPanel.x;
        const panelY = this.smelterPanel.y;
        for (let i = 0; i < this.smelterSlotRects.length; i++) {
          const rect = this.smelterSlotRects[i];
          const absX = rect.x + panelX;
          const absY = rect.y + panelY;
          if (
            pointer.x >= absX && pointer.x <= absX + rect.w &&
            pointer.y >= absY && pointer.y <= absY + rect.h
          ) {
            this.gameScene.placeOreInSmelter(i, this.draggedOre.ore);
            const slot = this.gameScene.smelterSlots[i];
            if (slot.ore) {
              const cfg = ORE_CONFIGS.find(c => c.type === slot.ore)!;
              this.smelterLabels[i].setText(cfg.label);
              this.smelterLabels[i].setColor('#aabbcc');
              placed = true;
            }
            break;
          }
        }
      }

      this.draggedOre.sprite.destroy();
      this.draggedOre = null;
    });
  }

  updateLeaderboard(data: any[]) {
    for (let i = 0; i < this.leaderboardEntries.length; i++) {
      const entry = this.leaderboardEntries[i];
      if (i < data.length) {
        const d = data[i];
        const name = d.name || '---';
        const credits = d.credits || 0;
        const ore = d.totalOreMined || 0;
        entry.setText(`${i + 1}.  ${name}  ${credits}  ${ore}`);
      } else {
        entry.setText(`${i + 1}.  ---  ---  ---`);
      }
    }
  }

  checkKeyboardShortcuts() {
    if (!this.shortcutKeys) return;

    if (Phaser.Input.Keyboard.JustDown(this.shortcutKeys.U)) {
      this.toggleUpgradePanel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.shortcutKeys.M)) {
      this.toggleMarketPanel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.shortcutKeys.L)) {
      this.toggleLeaderboardPanel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.shortcutKeys.F)) {
      this.toggleSmelterPanel();
    }
  }
}
