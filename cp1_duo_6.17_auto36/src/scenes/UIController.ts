import Phaser from 'phaser';
import axios from 'axios';
import { GameScene } from './GameScene';

const API_BASE = '/api';

const UPGRADE_TREE = [
  { id: 'cargo_1', type: 'cargo', name: '货仓 I', cost: 100, requires: [], row: 0, col: 0 },
  { id: 'cargo_2', type: 'cargo', name: '货仓 II', cost: 150, requires: ['cargo_1'], row: 0, col: 1 },
  { id: 'cargo_3', type: 'cargo', name: '货仓 III', cost: 225, requires: ['cargo_2'], row: 0, col: 2 },
  { id: 'engine_1', type: 'engine', name: '引擎 I', cost: 150, requires: [], row: 1, col: 0 },
  { id: 'engine_2', type: 'engine', name: '引擎 II', cost: 240, requires: ['engine_1'], row: 1, col: 1 },
  { id: 'engine_3', type: 'engine', name: '引擎 III', cost: 384, requires: ['engine_2'], row: 1, col: 2 },
  { id: 'smelter_1', type: 'smelter', name: '熔炉 I', cost: 200, requires: [], row: 2, col: 0 },
  { id: 'smelter_2', type: 'smelter', name: '熔炉 II', cost: 340, requires: ['smelter_1'], row: 2, col: 1 },
  { id: 'smelter_3', type: 'smelter', name: '熔炉 III', cost: 578, requires: ['smelter_2'], row: 2, col: 2 },
];

const ALLOY_LIST = [
  { name: 'bronze', display: '青铜', unlock_cost: 200, ingredients: { copper: 2, iron: 1 } },
  { name: 'electrum', display: '琥珀金', unlock_cost: 500, ingredients: { gold: 1, silver: 2 } },
  { name: 'stellarite', display: '星陨石', unlock_cost: 1000, ingredients: { crystal: 1, gold: 1 } },
  { name: 'dark_matter', display: '暗物质', unlock_cost: 2500, ingredients: { crystal: 2, silver: 3 } },
];

export class UIController extends Phaser.Scene {
  gameScene!: GameScene;

  hudContainer!: Phaser.GameObjects.Container;
  upgradeContainer!: Phaser.GameObjects.Container;
  marketContainer!: Phaser.GameObjects.Container;
  smelterPanel!: Phaser.GameObjects.Container;
  leaderboardContainer!: Phaser.GameObjects.Container;
  minimapContainer!: Phaser.GameObjects.Container;
  dockPanel!: Phaser.GameObjects.Container;

  levelText!: Phaser.GameObjects.Text;
  creditsText!: Phaser.GameObjects.Text;
  oreCountText!: Phaser.GameObjects.Text;
  marketTickerText!: Phaser.GameObjects.Text;

  showUpgrade: boolean = false;
  showMarket: boolean = false;
  showLeaderboard: boolean = false;

  animCredits: number = 0;
  animOreCount: number = 0;
  animLevel: number = 0;

  marketPrices: Record<string, number> = {};
  marketHistory: Record<string, any[]> = {};
  tickerItems: { item: string; price: number; prev: number }[] = [];
  tickerOffset: number = 0;

  constructor() {
    super({ key: 'UIController' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene') as GameScene;

    this.createHUD();
    this.createMinimap();
    this.createDockPanel();
    this.createUpgradePanel();
    this.createMarketPanel();
    this.createLeaderboardPanel();
    this.createSmelterPanel();

    this.setupEventListeners();
    this.setupKeyboard();

    this.refreshMarket();
    this.time.addEvent({ delay: 60000, loop: true, callback: () => this.refreshMarket() });
    this.time.addEvent({ delay: 30000, loop: true, callback: () => this.refreshLeaderboard() });
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0a0a2a, 0.7);
    hudBg.fillRoundedRect(10, 10, 220, 85, 10);
    hudBg.lineStyle(1, 0x00d4ff, 0.3);
    hudBg.strokeRoundedRect(10, 10, 220, 85, 10);

    this.levelText = this.add.text(25, 22, 'Lv.1', {
      fontSize: '18px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    this.creditsText = this.add.text(25, 45, '💰 0', {
      fontSize: '16px', color: '#FFD700', fontFamily: 'sans-serif',
    });
    this.oreCountText = this.add.text(25, 68, '⛏ 0/10', {
      fontSize: '14px', color: '#88ccff', fontFamily: 'sans-serif',
    });

    this.hudContainer.add([hudBg, this.levelText, this.creditsText, this.oreCountText]);

    const btnUpgrade = this.createButton(10, 110, '⬆ 升级', () => this.toggleUpgradePanel());
    const btnMarket = this.createButton(100, 110, '📊 市场', () => this.toggleMarketPanel());
    const btnRank = this.createButton(190, 110, '🏆 排行', () => this.toggleLeaderboardPanel());
    this.hudContainer.add([btnUpgrade.bg, btnUpgrade.text, btnMarket.bg, btnMarket.text, btnRank.bg, btnRank.text]);

    this.marketTickerText = this.add.text(10, this.cameras.main.height - 30, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#88ccff',
    });
    this.marketTickerText.setScrollFactor(0);
    this.marketTickerText.setDepth(100);
  }

  createButton(x: number, y: number, label: string, onClick: () => void): { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text } {
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.85);
    bg.fillRoundedRect(x, y, 80, 30, 6);
    bg.lineStyle(1, 0x00d4ff, 0.5);
    bg.strokeRoundedRect(x, y, 80, 30, 6);
    bg.setScrollFactor(0);
    bg.setDepth(100);
    bg.setInteractive(new Phaser.Geom.Rectangle(x, y, 80, 30), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x00d4ff, 0.2);
      bg.fillRoundedRect(x, y, 80, 30, 6);
      bg.lineStyle(1, 0x00d4ff, 0.8);
      bg.strokeRoundedRect(x, y, 80, 30, 6);
    });
    bg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a2e, 0.85);
      bg.fillRoundedRect(x, y, 80, 30, 6);
      bg.lineStyle(1, 0x00d4ff, 0.5);
      bg.strokeRoundedRect(x, y, 80, 30, 6);
    });
    bg.on('pointerdown', onClick);

    const text = this.add.text(x + 40, y + 15, label, {
      fontSize: '13px', color: '#00d4ff', fontFamily: 'sans-serif',
    });
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);
    text.setDepth(101);

    return { bg, text };
  }

  createMinimap() {
    this.minimapContainer = this.add.container(0, 0);
    this.minimapContainer.setScrollFactor(0);
    this.minimapContainer.setDepth(100);

    const size = 140;
    const x = this.cameras.main.width - size - 15;
    const y = this.cameras.main.height - size - 15;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a2a, 0.75);
    bg.fillRoundedRect(x, y, size, size, 8);
    bg.lineStyle(1, 0x00d4ff, 0.3);
    bg.strokeRoundedRect(x, y, size, size, 8);
    this.minimapContainer.add(bg);

    const label = this.add.text(x + size / 2, y + 10, '星域图', {
      fontSize: '10px', color: '#00d4ff', fontFamily: 'sans-serif',
    });
    label.setOrigin(0.5, 0);
    this.minimapContainer.add(label);

    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => this.updateMinimap(),
    });
  }

  updateMinimap() {
    const size = 140;
    const cx = this.cameras.main.width - size - 15;
    const cy = this.cameras.main.height - size - 15;
    const centerX = cx + size / 2;
    const centerY = cy + size / 2;

    this.minimapContainer.removeAll(true);

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x0a0a2a, 0.75);
    bg.fillRoundedRect(cx, cy, size, size, 8);
    bg.lineStyle(1, 0x00d4ff, 0.3);
    bg.strokeRoundedRect(cx, cy, size, size, 8);
    this.minimapContainer.add(bg);

    const label = this.add.text(centerX, cy + 10, '星域图', {
      fontSize: '10px', color: '#00d4ff', fontFamily: 'sans-serif',
    });
    label.setOrigin(0.5, 0);
    label.setScrollFactor(0);
    this.minimapContainer.add(label);

    const scale = 0.035;
    const asteroids = this.gameScene.getAsteroids();
    for (const ast of asteroids) {
      const dotColor = ast.zone === 'outer' ? 0xd4a5ff : ast.zone === 'middle' ? 0xe0e0ff : 0xaaaaaa;
      const dot = this.add.graphics();
      dot.setScrollFactor(0);
      dot.fillStyle(ast.mined_out ? 0x333333 : dotColor, ast.mined_out ? 0.3 : 0.7);
      dot.fillCircle(centerX + ast.x * scale, centerY + ast.y * scale, ast.mined_out ? 2 : 3);
      this.minimapContainer.add(dot);
    }

    const shipPos = this.gameScene.getShipPosition();
    const shipDot = this.add.graphics();
    shipDot.setScrollFactor(0);
    shipDot.fillStyle(0x00d4ff, 1);
    const sx = centerX + shipPos.x * scale;
    const sy = centerY + shipPos.y * scale;
    shipDot.fillCircle(sx, sy, 4);

    shipDot.fillStyle(0x00ffff, 1);
    const arrowLen = 8;
    const ax = sx + Math.cos(shipPos.angle) * arrowLen;
    const ay = sy + Math.sin(shipPos.angle) * arrowLen;
    shipDot.fillTriangle(
      ax, ay,
      sx + Math.cos(shipPos.angle + 2.5) * 4, sy + Math.sin(shipPos.angle + 2.5) * 4,
      sx + Math.cos(shipPos.angle - 2.5) * 4, sy + Math.sin(shipPos.angle - 2.5) * 4
    );
    this.minimapContainer.add(shipDot);
  }

  createDockPanel() {
    this.dockPanel = this.add.container(0, 0);
    this.dockPanel.setScrollFactor(0);
    this.dockPanel.setDepth(110);
    this.dockPanel.setVisible(false);
  }

  showDockPanel() {
    this.dockPanel.setVisible(true);
    this.dockPanel.removeAll(true);

    const w = this.cameras.main.width;
    const panelW = 320;
    const panelH = 280;
    const px = w - panelW - 20;
    const py = 150;

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 10);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(px, py, panelW, panelH, 10);
    this.dockPanel.add(bg);

    const title = this.add.text(px + panelW / 2, py + 20, '🪨 小行星矿区', {
      fontSize: '16px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setScrollFactor(0);
    this.dockPanel.add(title);

    const ast = this.gameScene.getDockedAsteroid();
    if (ast) {
      const info = this.add.text(px + 15, py + 45, `区域: ${ast.zone} | 格数: ${ast.grid_size}x${ast.grid_size}`, {
        fontSize: '12px', color: '#88ccff', fontFamily: 'sans-serif',
      });
      info.setScrollFactor(0);
      this.dockPanel.add(info);

      const dist: Record<string, number> = ast.ore_distribution;
      let yy = py + 70;
      for (const [ore, count] of Object.entries(dist)) {
        const oreText = this.add.text(px + 20, yy, `${ore}: ${count}`, {
          fontSize: '12px', color: '#ccddff', fontFamily: 'monospace',
        });
        oreText.setScrollFactor(0);
        this.dockPanel.add(oreText);
        yy += 18;
      }
    }

    const undockBtn = this.createButton(px + 20, py + panelH - 50, '离开小行星', () => {
      this.gameScene.undock();
      this.dockPanel.setVisible(false);
    });
    undockBtn.bg.setScrollFactor(0);
    undockBtn.text.setScrollFactor(0);
    this.dockPanel.add([undockBtn.bg, undockBtn.text]);

    const smeltBtn = this.createButton(px + 120, py + panelH - 50, '打开熔炉', () => {
      this.showSmelterPanel();
    });
    smeltBtn.bg.setScrollFactor(0);
    smeltBtn.text.setScrollFactor(0);
    this.dockPanel.add([smeltBtn.bg, smeltBtn.text]);
  }

  createUpgradePanel() {
    this.upgradeContainer = this.add.container(0, 0);
    this.upgradeContainer.setScrollFactor(0);
    this.upgradeContainer.setDepth(120);
    this.upgradeContainer.setVisible(false);
  }

  toggleUpgradePanel() {
    this.showUpgrade = !this.showUpgrade;
    if (this.showUpgrade) {
      this.renderUpgradePanel();
      this.upgradeContainer.setVisible(true);
    } else {
      this.upgradeContainer.setVisible(false);
    }
  }

  renderUpgradePanel() {
    this.upgradeContainer.removeAll(true);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const panelW = 450;
    const panelH = 400;
    const px = (w - panelW) / 2;
    const py = h - panelH;

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.upgradeContainer.add(bg);

    const title = this.add.text(px + panelW / 2, py + 22, '🔬 科技树', {
      fontSize: '18px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setScrollFactor(0);
    this.upgradeContainer.add(title);

    const closeBtn = this.createButton(px + panelW - 45, py + 8, '✕', () => this.toggleUpgradePanel());
    closeBtn.bg.setScrollFactor(0);
    closeBtn.text.setScrollFactor(0);
    this.upgradeContainer.add([closeBtn.bg, closeBtn.text]);

    const player = this.gameScene.getPlayerData();
    if (!player) return;

    const unlocked = player.unlocked_upgrades || [];
    const nodeSize = 42;
    const startXP = px + 40;
    const startYP = py + 60;
    const colSpacing = 130;
    const rowSpacing = 90;

    const nodePositions: Record<string, { x: number; y: number }> = {};

    for (const node of UPGRADE_TREE) {
      const nx = startXP + node.col * colSpacing;
      const ny = startYP + node.row * rowSpacing;
      nodePositions[node.id] = { x: nx, y: ny };

      const isUnlocked = unlocked.includes(node.id);
      const canUnlock = !isUnlocked && node.requires.every(r => unlocked.includes(r));

      // Draw connection lines
      if (node.requires.length > 0) {
        const lineGfx = this.add.graphics();
        lineGfx.setScrollFactor(0);
        for (const reqId of node.requires) {
          const from = nodePositions[reqId];
          if (from) {
            const lineColor = unlocked.includes(reqId) ? 0x00d4ff : 0x334466;
            lineGfx.lineStyle(2, lineColor, unlocked.includes(reqId) ? 0.7 : 0.3);
            lineGfx.beginPath();
            lineGfx.moveTo(from.x + nodeSize / 2, from.y + nodeSize / 2);
            lineGfx.lineTo(nx + nodeSize / 2, ny + nodeSize / 2);
            lineGfx.strokePath();
          }
        }
        this.upgradeContainer.add(lineGfx);
      }

      const nodeGfx = this.add.graphics();
      nodeGfx.setScrollFactor(0);

      if (isUnlocked) {
        nodeGfx.fillStyle(0x00d4ff, 0.3);
        nodeGfx.fillRoundedRect(nx, ny, nodeSize, nodeSize, 6);
        nodeGfx.lineStyle(2, 0x00d4ff, 0.9);
        nodeGfx.strokeRoundedRect(nx, ny, nodeSize, nodeSize, 6);

        const checkMark = this.add.text(nx + nodeSize / 2, ny + nodeSize / 2, '✓', {
          fontSize: '20px', color: '#00ff88', fontFamily: 'sans-serif',
        });
        checkMark.setOrigin(0.5, 0.5);
        checkMark.setScrollFactor(0);
        this.upgradeContainer.add(checkMark);
      } else if (canUnlock) {
        nodeGfx.fillStyle(0x1a1a3e, 0.8);
        nodeGfx.fillRoundedRect(nx, ny, nodeSize, nodeSize, 6);
        nodeGfx.lineStyle(1, 0x00d4ff, 0.6);
        nodeGfx.strokeRoundedRect(nx, ny, nodeSize, nodeSize, 6);

        nodeGfx.setInteractive(new Phaser.Geom.Rectangle(nx, ny, nodeSize, nodeSize), Phaser.Geom.Rectangle.Contains);
        nodeGfx.on('pointerdown', () => this.purchaseUpgrade(node.type));
        nodeGfx.on('pointerover', () => {
          nodeGfx.clear();
          nodeGfx.fillStyle(0x00d4ff, 0.15);
          nodeGfx.fillRoundedRect(nx, ny, nodeSize, nodeSize, 6);
          nodeGfx.lineStyle(2, 0x00d4ff, 1);
          nodeGfx.strokeRoundedRect(nx, ny, nodeSize, nodeSize, 6);
        });
        nodeGfx.on('pointerout', () => {
          nodeGfx.clear();
          nodeGfx.fillStyle(0x1a1a3e, 0.8);
          nodeGfx.fillRoundedRect(nx, ny, nodeSize, nodeSize, 6);
          nodeGfx.lineStyle(1, 0x00d4ff, 0.6);
          nodeGfx.strokeRoundedRect(nx, ny, nodeSize, nodeSize, 6);
        });
      } else {
        nodeGfx.fillStyle(0x111122, 0.6);
        nodeGfx.fillRoundedRect(nx, ny, nodeSize, nodeSize, 6);
        nodeGfx.lineStyle(1, 0x334466, 0.4);
        nodeGfx.strokeRoundedRect(nx, ny, nodeSize, nodeSize, 6);
      }

      this.upgradeContainer.add(nodeGfx);

      const nameLabel = this.add.text(nx + nodeSize / 2, ny + nodeSize + 5, node.name, {
        fontSize: '10px', color: isUnlocked ? '#00d4ff' : canUnlock ? '#88ccff' : '#445566',
        fontFamily: 'sans-serif',
      });
      nameLabel.setOrigin(0.5, 0);
      nameLabel.setScrollFactor(0);
      this.upgradeContainer.add(nameLabel);

      if (!isUnlocked) {
        const costLabel = this.add.text(nx + nodeSize / 2, ny + nodeSize + 18, `💰${node.cost}`, {
          fontSize: '9px', color: canUnlock ? '#FFD700' : '#665533', fontFamily: 'monospace',
        });
        costLabel.setOrigin(0.5, 0);
        costLabel.setScrollFactor(0);
        this.upgradeContainer.add(costLabel);
      }
    }

    // Alloy unlock section
    const alloyYP = py + 310;
    const alloyTitle = this.add.text(px + 15, alloyYP, '⚗ 合金配方 (研究院)', {
      fontSize: '14px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    alloyTitle.setScrollFactor(0);
    this.upgradeContainer.add(alloyTitle);

    let alloyX = px + 15;
    for (const alloy of ALLOY_LIST) {
      const isUnlocked = (player.unlocked_alloys || []).includes(alloy.name);
      const btnW = 100;
      const btnH = 36;

      const btnGfx = this.add.graphics();
      btnGfx.setScrollFactor(0);

      if (isUnlocked) {
        btnGfx.fillStyle(0x00d4ff, 0.2);
        btnGfx.fillRoundedRect(alloyX, alloyYP + 25, btnW, btnH, 5);
        btnGfx.lineStyle(1, 0x00ff88, 0.7);
        btnGfx.strokeRoundedRect(alloyX, alloyYP + 25, btnW, btnH, 5);
      } else {
        btnGfx.fillStyle(0x1a1a3e, 0.8);
        btnGfx.fillRoundedRect(alloyX, alloyYP + 25, btnW, btnH, 5);
        btnGfx.lineStyle(1, 0x00d4ff, 0.4);
        btnGfx.strokeRoundedRect(alloyX, alloyYP + 25, btnW, btnH, 5);

        btnGfx.setInteractive(new Phaser.Geom.Rectangle(alloyX, alloyYP + 25, btnW, btnH), Phaser.Geom.Rectangle.Contains);
        btnGfx.on('pointerdown', () => this.unlockAlloy(alloy.name));
      }
      this.upgradeContainer.add(btnGfx);

      const alloyLabel = this.add.text(alloyX + btnW / 2, alloyYP + 34, alloy.display, {
        fontSize: '11px', color: isUnlocked ? '#00ff88' : '#88ccff', fontFamily: 'sans-serif',
      });
      alloyLabel.setOrigin(0.5, 0);
      alloyLabel.setScrollFactor(0);
      this.upgradeContainer.add(alloyLabel);

      if (!isUnlocked) {
        const costLabel = this.add.text(alloyX + btnW / 2, alloyYP + 50, `💰${alloy.unlock_cost}`, {
          fontSize: '9px', color: '#FFD700', fontFamily: 'monospace',
        });
        costLabel.setOrigin(0.5, 0);
        costLabel.setScrollFactor(0);
        this.upgradeContainer.add(costLabel);
      }

      alloyX += btnW + 10;
    }
  }

  async purchaseUpgrade(type: string) {
    try {
      const player = this.gameScene.getPlayerData();
      const resp = await axios.post(`${API_BASE}/upgrade`, {
        player_id: player.id,
        type: type,
      });
      if (resp.data.status === 'ok') {
        Object.assign(player, resp.data.player);
        this.gameScene.emitPlayerUpdate();
        this.renderUpgradePanel();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Upgrade failed';
      this.showNotification(msg);
    }
  }

  async unlockAlloy(alloyName: string) {
    try {
      const player = this.gameScene.getPlayerData();
      const resp = await axios.post(`${API_BASE}/unlock_alloy`, {
        player_id: player.id,
        alloy: alloyName,
      });
      if (resp.data.status === 'ok') {
        Object.assign(player, resp.data.player);
        this.gameScene.emitPlayerUpdate();
        this.renderUpgradePanel();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Unlock failed';
      this.showNotification(msg);
    }
  }

  createMarketPanel() {
    this.marketContainer = this.add.container(0, 0);
    this.marketContainer.setScrollFactor(0);
    this.marketContainer.setDepth(120);
    this.marketContainer.setVisible(false);
  }

  toggleMarketPanel() {
    this.showMarket = !this.showMarket;
    if (this.showMarket) {
      this.renderMarketPanel();
      this.marketContainer.setVisible(true);
    } else {
      this.marketContainer.setVisible(false);
    }
  }

  renderMarketPanel() {
    this.marketContainer.removeAll(true);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const panelW = 380;
    const panelH = 450;
    const px = w - panelW - 20;
    const py = h - panelH;

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.marketContainer.add(bg);

    const title = this.add.text(px + panelW / 2, py + 22, '📊 星际市场', {
      fontSize: '18px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setScrollFactor(0);
    this.marketContainer.add(title);

    const closeBtn = this.createButton(px + panelW - 45, py + 8, '✕', () => this.toggleMarketPanel());
    closeBtn.bg.setScrollFactor(0);
    closeBtn.text.setScrollFactor(0);
    this.marketContainer.add([closeBtn.bg, closeBtn.text]);

    const player = this.gameScene.getPlayerData();
    if (!player) return;

    const ingots = player.ingots || {};
    const items = ['iron', 'copper', 'silver', 'gold', 'crystal', 'bronze', 'electrum', 'stellarite', 'dark_matter'];
    const itemNames: Record<string, string> = {
      iron: '铁锭', copper: '铜锭', silver: '银锭', gold: '金锭', crystal: '水晶',
      bronze: '青铜', electrum: '琥珀金', stellarite: '星陨石', dark_matter: '暗物质',
    };

    let yy = py + 55;
    for (const item of items) {
      const price = this.marketPrices[item] || 0;
      const owned = ingots[item] || 0;
      const history = this.marketHistory[item] || [];
      const prevPrice = history.length >= 2 ? history[history.length - 2].price : price;
      const change = price > prevPrice ? '▲' : price < prevPrice ? '▼' : '—';
      const changeColor = price > prevPrice ? '#00ff88' : price < prevPrice ? '#ff4444' : '#888888';

      const rowBg = this.add.graphics();
      rowBg.setScrollFactor(0);
      rowBg.fillStyle(0x0a0a2a, 0.6);
      rowBg.fillRoundedRect(px + 10, yy, panelW - 20, 34, 4);
      this.marketContainer.add(rowBg);

      const nameText = this.add.text(px + 20, yy + 8, itemNames[item] || item, {
        fontSize: '12px', color: '#ccddff', fontFamily: 'sans-serif',
      });
      nameText.setScrollFactor(0);
      this.marketContainer.add(nameText);

      const priceText = this.add.text(px + 140, yy + 8, `💰${price.toFixed(1)}`, {
        fontSize: '12px', color: '#FFD700', fontFamily: 'monospace',
      });
      priceText.setScrollFactor(0);
      this.marketContainer.add(priceText);

      const changeText = this.add.text(px + 230, yy + 8, change, {
        fontSize: '12px', color: changeColor, fontFamily: 'sans-serif',
      });
      changeText.setScrollFactor(0);
      this.marketContainer.add(changeText);

      const ownText = this.add.text(px + 260, yy + 8, `持有:${owned}`, {
        fontSize: '11px', color: '#88ccff', fontFamily: 'monospace',
      });
      ownText.setScrollFactor(0);
      this.marketContainer.add(ownText);

      if (owned > 0) {
        const sellBtnGfx = this.add.graphics();
        sellBtnGfx.setScrollFactor(0);
        sellBtnGfx.fillStyle(0x00d4ff, 0.2);
        sellBtnGfx.fillRoundedRect(px + 320, yy + 3, 40, 26, 4);
        sellBtnGfx.lineStyle(1, 0x00d4ff, 0.5);
        sellBtnGfx.strokeRoundedRect(px + 320, yy + 3, 40, 26, 4);
        sellBtnGfx.setInteractive(new Phaser.Geom.Rectangle(px + 320, yy + 3, 40, 26), Phaser.Geom.Rectangle.Contains);
        sellBtnGfx.on('pointerdown', () => this.sellItem(item));
        this.marketContainer.add(sellBtnGfx);

        const sellLabel = this.add.text(px + 340, yy + 15, '卖', {
          fontSize: '11px', color: '#00d4ff', fontFamily: 'sans-serif',
        });
        sellLabel.setOrigin(0.5, 0.5);
        sellLabel.setScrollFactor(0);
        this.marketContainer.add(sellLabel);
      }

      yy += 40;
    }

    // Mini price chart
    if (Object.keys(this.marketHistory).length > 0) {
      const chartX = px + 15;
      const chartY = yy + 10;
      const chartW = panelW - 30;
      const chartH = 60;

      const chartBg = this.add.graphics();
      chartBg.setScrollFactor(0);
      chartBg.fillStyle(0x0a0a2a, 0.5);
      chartBg.fillRoundedRect(chartX, chartY, chartW, chartH, 4);
      this.marketContainer.add(chartBg);

      const firstItem = items[0];
      const hist = this.marketHistory[firstItem] || [];
      if (hist.length > 1) {
        const maxP = Math.max(...hist.map((h: any) => h.price));
        const minP = Math.min(...hist.map((h: any) => h.price));
        const range = maxP - minP || 1;

        const chartLine = this.add.graphics();
        chartLine.setScrollFactor(0);
        chartLine.lineStyle(1, 0x00d4ff, 0.7);
        chartLine.beginPath();
        for (let i = 0; i < hist.length; i++) {
          const hx = chartX + (i / (hist.length - 1)) * chartW;
          const hy = chartY + chartH - ((hist[i].price - minP) / range) * (chartH - 10) - 5;
          if (i === 0) chartLine.moveTo(hx, hy);
          else chartLine.lineTo(hx, hy);
        }
        chartLine.strokePath();
        this.marketContainer.add(chartLine);
      }
    }
  }

  async sellItem(item: string) {
    const player = this.gameScene.getPlayerData();
    if (!player) return;

    try {
      const resp = await axios.post(`${API_BASE}/market/sell`, {
        player_id: player.id,
        item: item,
        amount: 1,
        price: this.marketPrices[item] || 0,
      });

      if (resp.data.status === 'ok') {
        const net = resp.data.net;
        player.credits = (player.credits || 0) + net;
        player.ingots[item] = Math.max(0, (player.ingots[item] || 0) - 1);
        player.total_earned = (player.total_earned || 0) + net;
        this.gameScene.emitPlayerUpdate();
        this.renderMarketPanel();
        this.showNotification(`售出 ${item}，净赚 ${net.toFixed(1)} 金币`);
      }
    } catch (e: any) {
      this.showNotification(e?.response?.data?.error || '出售失败');
    }
  }

  createSmelterPanel() {
    this.smelterPanel = this.add.container(0, 0);
    this.smelterPanel.setScrollFactor(0);
    this.smelterPanel.setDepth(115);
    this.smelterPanel.setVisible(false);
  }

  showSmelterPanel() {
    this.smelterPanel.setVisible(true);
    this.smelterPanel.removeAll(true);

    const w = this.cameras.main.width;
    const panelW = 340;
    const panelH = 350;
    const px = (w - panelW) / 2;
    const py = this.cameras.main.height - panelH;

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.smelterPanel.add(bg);

    const title = this.add.text(px + panelW / 2, py + 22, '🔥 熔炼炉', {
      fontSize: '18px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setScrollFactor(0);
    this.smelterPanel.add(title);

    const closeBtn = this.createButton(px + panelW - 45, py + 8, '✕', () => {
      this.smelterPanel.setVisible(false);
    });
    closeBtn.bg.setScrollFactor(0);
    closeBtn.text.setScrollFactor(0);
    this.smelterPanel.add([closeBtn.bg, closeBtn.text]);

    const player = this.gameScene.getPlayerData();
    if (!player) return;

    const cargo = player.cargo || {};
    const oreList = ['iron', 'copper', 'silver', 'gold', 'crystal'];
    const oreNames: Record<string, string> = { iron: '铁', copper: '铜', silver: '银', gold: '金', crystal: '水晶' };
    const smeltTimes: Record<string, number> = { iron: 3, copper: 4, silver: 6, gold: 10, crystal: 12 };

    let yy = py + 55;
    for (const ore of oreList) {
      const count = cargo[ore] || 0;
      if (count <= 0) continue;

      const rowBg = this.add.graphics();
      rowBg.setScrollFactor(0);
      rowBg.fillStyle(0x0a0a2a, 0.6);
      rowBg.fillRoundedRect(px + 10, yy, panelW - 20, 32, 4);
      this.smelterPanel.add(rowBg);

      const nameText = this.add.text(px + 20, yy + 8, `${oreNames[ore]} (${count}) - ${smeltTimes[ore]}s`, {
        fontSize: '12px', color: '#ccddff', fontFamily: 'sans-serif',
      });
      nameText.setScrollFactor(0);
      this.smelterPanel.add(nameText);

      const smeltBtn = this.add.graphics();
      smeltBtn.setScrollFactor(0);
      smeltBtn.fillStyle(0x00d4ff, 0.2);
      smeltBtn.fillRoundedRect(px + panelW - 80, yy + 3, 60, 26, 4);
      smeltBtn.lineStyle(1, 0x00d4ff, 0.5);
      smeltBtn.strokeRoundedRect(px + panelW - 80, yy + 3, 60, 26, 4);
      smeltBtn.setInteractive(new Phaser.Geom.Rectangle(px + panelW - 80, yy + 3, 60, 26), Phaser.Geom.Rectangle.Contains);
      smeltBtn.on('pointerdown', () => {
        if ((player.cargo[ore] || 0) > 0) {
          player.cargo[ore]--;
          if (player.cargo[ore] <= 0) delete player.cargo[ore];
          this.gameScene.startSmelting(ore);
          this.showSmelterPanel();
        }
      });
      this.smelterPanel.add(smeltBtn);

      const smeltLabel = this.add.text(px + panelW - 50, yy + 15, '熔炼', {
        fontSize: '11px', color: '#00d4ff', fontFamily: 'sans-serif',
      });
      smeltLabel.setOrigin(0.5, 0.5);
      smeltLabel.setScrollFactor(0);
      this.smelterPanel.add(smeltLabel);

      yy += 38;
    }

    // Alloy smelting section
    const unlockedAlloys = player.unlocked_alloys || [];
    if (unlockedAlloys.length > 0) {
      yy += 10;
      const alloyTitle = this.add.text(px + 15, yy, '⚗ 合金熔炼', {
        fontSize: '13px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
      });
      alloyTitle.setScrollFactor(0);
      this.smelterPanel.add(alloyTitle);
      yy += 25;

      for (const alloyName of unlockedAlloys) {
        const recipe = ALLOY_LIST.find(a => a.name === alloyName);
        if (!recipe) continue;

        const canSmelt = Object.entries(recipe.ingredients).every(([ore, needed]) => (cargo[ore] || 0) >= needed);
        const ingredientStr = Object.entries(recipe.ingredients).map(([ore, n]) => `${ore}x${n}`).join('+');

        const rowBg = this.add.graphics();
        rowBg.setScrollFactor(0);
        rowBg.fillStyle(0x0a0a2a, 0.6);
        rowBg.fillRoundedRect(px + 10, yy, panelW - 20, 32, 4);
        this.smelterPanel.add(rowBg);

        const nameText = this.add.text(px + 20, yy + 8, `${recipe.display} (${ingredientStr})`, {
          fontSize: '12px', color: canSmelt ? '#ccddff' : '#665566', fontFamily: 'sans-serif',
        });
        nameText.setScrollFactor(0);
        this.smelterPanel.add(nameText);

        if (canSmelt) {
          const smeltBtn = this.add.graphics();
          smeltBtn.setScrollFactor(0);
          smeltBtn.fillStyle(0x00d4ff, 0.2);
          smeltBtn.fillRoundedRect(px + panelW - 80, yy + 3, 60, 26, 4);
          smeltBtn.lineStyle(1, 0x00d4ff, 0.5);
          smeltBtn.strokeRoundedRect(px + panelW - 80, yy + 3, 60, 26, 4);
          smeltBtn.setInteractive(new Phaser.Geom.Rectangle(px + panelW - 80, yy + 3, 60, 26), Phaser.Geom.Rectangle.Contains);
          smeltBtn.on('pointerdown', () => {
            for (const [ore, needed] of Object.entries(recipe.ingredients)) {
              player.cargo[ore] = (player.cargo[ore] || 0) - needed;
              if (player.cargo[ore] <= 0) delete player.cargo[ore];
            }
            this.gameScene.startSmelting(alloyName, true, alloyName, recipe.ingredients);
            this.showSmelterPanel();
          });
          this.smelterPanel.add(smeltBtn);

          const smeltLabel = this.add.text(px + panelW - 50, yy + 15, '熔炼', {
            fontSize: '11px', color: '#00d4ff', fontFamily: 'sans-serif',
          });
          smeltLabel.setOrigin(0.5, 0.5);
          smeltLabel.setScrollFactor(0);
          this.smelterPanel.add(smeltLabel);
        }

        yy += 38;
      }
    }

    // Active smelter slots
    yy += 15;
    const slotsTitle = this.add.text(px + 15, yy, '🔥 当前熔炼', {
      fontSize: '13px', color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    slotsTitle.setScrollFactor(0);
    this.smelterPanel.add(slotsTitle);
    yy += 22;

    const slots = this.gameScene.getSmelterSlots();
    for (let i = 0; i < Math.min(slots.length, 6); i++) {
      const slot = slots[i];
      const slotX = px + 15 + i * 52;
      const slotGfx = this.add.graphics();
      slotGfx.setScrollFactor(0);
      slotGfx.fillStyle(0x0a0a2a, 0.8);
      slotGfx.fillRoundedRect(slotX, yy, 46, 40, 4);
      slotGfx.lineStyle(1, 0x00d4ff, 0.4);
      slotGfx.strokeRoundedRect(slotX, yy, 46, 40, 4);

      if (slot.ore_type) {
        const progress = Math.min(slot.progress / slot.smelt_time, 1);
        slotGfx.fillStyle(0x00d4ff, 0.3);
        slotGfx.fillRoundedRect(slotX + 2, yy + 2, 42 * progress, 36, 3);

        const slotLabel = this.add.text(slotX + 23, yy + 20, slot.is_alloy ? (slot.alloy_name || '').substring(0, 2) : slot.ore_type.substring(0, 2).toUpperCase(), {
          fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
        });
        slotLabel.setOrigin(0.5, 0.5);
        slotLabel.setScrollFactor(0);
        this.smelterPanel.add(slotLabel);
      }

      this.smelterPanel.add(slotGfx);
    }
  }

  createLeaderboardPanel() {
    this.leaderboardContainer = this.add.container(0, 0);
    this.leaderboardContainer.setScrollFactor(0);
    this.leaderboardContainer.setDepth(120);
    this.leaderboardContainer.setVisible(false);
  }

  toggleLeaderboardPanel() {
    this.showLeaderboard = !this.showLeaderboard;
    if (this.showLeaderboard) {
      this.refreshLeaderboard();
      this.leaderboardContainer.setVisible(true);
    } else {
      this.leaderboardContainer.setVisible(false);
    }
  }

  async refreshLeaderboard() {
    try {
      const resp = await axios.get(`${API_BASE}/leaderboard`);
      this.renderLeaderboard(resp.data);
    } catch (e) {
      console.warn('Leaderboard load failed', e);
    }
  }

  renderLeaderboard(entries: any[] = []) {
    this.leaderboardContainer.removeAll(true);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const panelW = 320;
    const panelH = 380;
    const px = (w - panelW) / 2;
    const py = h - panelH;

    const bg = this.add.graphics();
    bg.setScrollFactor(0);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.leaderboardContainer.add(bg);

    const title = this.add.text(px + panelW / 2, py + 22, '🏆 星际排行', {
      fontSize: '18px', color: '#00d4ff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setScrollFactor(0);
    this.leaderboardContainer.add(title);

    const closeBtn = this.createButton(px + panelW - 45, py + 8, '✕', () => this.toggleLeaderboardPanel());
    closeBtn.bg.setScrollFactor(0);
    closeBtn.text.setScrollFactor(0);
    this.leaderboardContainer.add([closeBtn.bg, closeBtn.text]);

    let yy = py + 50;
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < Math.min(entries.length, 10); i++) {
      const entry = entries[i];
      const medal = i < 3 ? medals[i] : `${i + 1}.`;

      const rowBg = this.add.graphics();
      rowBg.setScrollFactor(0);
      rowBg.fillStyle(0x0a0a2a, 0.5);
      rowBg.fillRoundedRect(px + 10, yy, panelW - 20, 28, 4);
      this.leaderboardContainer.add(rowBg);

      const nameText = this.add.text(px + 20, yy + 6, `${medal} ${entry.name || 'Unknown'}`, {
        fontSize: '12px', color: i < 3 ? '#FFD700' : '#ccddff', fontFamily: 'sans-serif',
      });
      nameText.setScrollFactor(0);
      this.leaderboardContainer.add(nameText);

      const earnText = this.add.text(px + panelW - 30, yy + 6, `💰${(entry.total_earned || 0).toFixed(0)}`, {
        fontSize: '11px', color: '#FFD700', fontFamily: 'monospace',
      });
      earnText.setOrigin(1, 0);
      earnText.setScrollFactor(0);
      this.leaderboardContainer.add(earnText);

      yy += 32;
    }
  }

  setupEventListeners() {
    const gs = this.gameScene;

    gs.events.on('player-updated', (data: any) => {
      this.animateValue('level', data.level);
      this.animateValue('credits', data.credits);
      const totalOre = Object.values(data.cargo || {}).reduce((a: number, b: any) => a + (b as number), 0);
      this.animateValue('oreCount', totalOre);
      this.oreCountText.setText(`⛏ ${totalOre}/${data.cargo_capacity}`);
    });

    gs.events.on('docked', () => {
      this.showDockPanel();
    });

    gs.events.on('undocked', () => {
      this.dockPanel.setVisible(false);
    });

    gs.events.on('cargo-updated', (cargo: any, capacity: number) => {
      const total = Object.values(cargo).reduce((a: any, b: any) => a + (b as number), 0);
      this.oreCountText.setText(`⛏ ${total}/${capacity}`);
    });

    gs.events.on('market-updated', (data: any) => {
      this.marketPrices = data.prices || {};
      this.marketHistory = data.history || {};
      this.updateTicker();
    });

    gs.events.on('smelt-started', () => {
      if (this.smelterPanel.visible) {
        this.showSmelterPanel();
      }
    });

    gs.events.on('smelt-complete', (product: string) => {
      this.showNotification(`熔炼完成: ${product}`);
    });

    gs.events.on('cargo-full', () => {
      this.showNotification('货仓已满！');
    });
  }

  setupKeyboard() {
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.gameScene.isDocked()) {
          this.gameScene.undock();
          this.dockPanel.setVisible(false);
          this.smelterPanel.setVisible(false);
        }
        if (this.showUpgrade) this.toggleUpgradePanel();
        if (this.showMarket) this.toggleMarketPanel();
        if (this.showLeaderboard) this.toggleLeaderboardPanel();
        if (this.smelterPanel.visible) this.smelterPanel.setVisible(false);
      });

      this.input.keyboard.on('keydown-U', () => this.toggleUpgradePanel());
      this.input.keyboard.on('keydown-M', () => this.toggleMarketPanel());
      this.input.keyboard.on('keydown-L', () => this.toggleLeaderboardPanel());
    }
  }

  animateValue(type: string, target: number) {
    const duration = 150;
    const startVal = type === 'level' ? this.animLevel : type === 'credits' ? this.animCredits : this.animOreCount;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(startVal + (target - startVal) * progress);

      if (type === 'level') {
        this.levelText.setText(`Lv.${current}`);
        this.animLevel = current;
      } else if (type === 'credits') {
        this.creditsText.setText(`💰 ${current}`);
        this.animCredits = current;
      } else {
        this.animOreCount = current;
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  updateTicker() {
    const items = Object.entries(this.marketPrices);
    this.tickerItems = items.map(([item, price]) => {
      const hist = this.marketHistory[item] || [];
      const prev = hist.length >= 2 ? hist[hist.length - 2].price : price;
      return { item, price, prev };
    });

    this.renderTicker();
  }

  renderTicker() {
    if (this.tickerItems.length === 0) return;

    const h = this.cameras.main.height;
    const y = h - 30;
    this.marketTickerText.setPosition(10, y);

    let tickerStr = '';
    for (const t of this.tickerItems) {
      const change = t.price > t.prev ? '▲' : t.price < t.prev ? '▼' : '—';
      const color = t.price > t.prev ? '↑' : t.price < t.prev ? '↓' : '—';
      tickerStr += ` ${t.item}: ${t.price.toFixed(1)}${change}  `;
    }

    this.marketTickerText.setText(tickerStr);

    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        this.tickerOffset += 1;
        if (this.tickerOffset > tickerStr.length * 8) this.tickerOffset = 0;
        this.marketTickerText.setX(10 - this.tickerOffset);
      },
    });
  }

  showNotification(msg: string) {
    const w = this.cameras.main.width;
    const notif = this.add.text(w / 2, 60, msg, {
      fontSize: '14px', color: '#00d4ff', fontFamily: 'sans-serif',
      backgroundColor: '#1a1a2e', padding: { x: 12, y: 6 },
    });
    notif.setOrigin(0.5, 0.5);
    notif.setScrollFactor(0);
    notif.setDepth(200);
    notif.alpha = 0;

    this.tweens.add({
      targets: notif,
      alpha: 1,
      y: 50,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: notif,
            alpha: 0,
            y: 40,
            duration: 300,
            onComplete: () => notif.destroy(),
          });
        });
      },
    });
  }

  async refreshMarket() {
    try {
      const resp = await axios.get(`${API_BASE}/market`);
      this.marketPrices = resp.data.prices || {};
      this.marketHistory = resp.data.history || {};
      this.updateTicker();
      if (this.showMarket) {
        this.renderMarketPanel();
      }
    } catch (e) {
      // offline fallback
      const items = ['iron', 'copper', 'silver', 'gold', 'crystal', 'bronze', 'electrum', 'stellarite', 'dark_matter'];
      const basePrices: Record<string, number> = { iron: 5, copper: 10, silver: 20, gold: 50, crystal: 100, bronze: 40, electrum: 100, stellarite: 250, dark_matter: 500 };
      for (const item of items) {
        this.marketPrices[item] = basePrices[item] * (0.85 + Math.random() * 0.3);
      }
      this.updateTicker();
    }
  }
}
