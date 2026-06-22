import { Container, Graphics, Text, TextStyle, BitmapText, Rectangle, SCALE_MODES } from 'pixi.js';
import { GameManager, Disciple, TechNode, Resources } from './GameManager.js';
import { ResourceNode, ResourceType, OwnerType, BattleResult } from './ResourceNode.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  graphic: Graphics;
}

interface AnimatedNumber {
  current: number;
  target: number;
  display: Text;
  animTime: number;
}

const COLOR_BG = 0x1a1a1a;
const COLOR_PAPER = 0xf5f0e8;
const COLOR_RED = 0xc04040;
const COLOR_GOLD = 0xffd700;
const COLOR_BLUE = 0x4060c0;
const COLOR_GRAY = 0x888888;

const TITLE_STYLE = new TextStyle({
  fontSize: 16,
  fill: COLOR_PAPER,
  fontFamily: 'serif',
  fontWeight: 'bold',
});

const BODY_STYLE = new TextStyle({
  fontSize: 12,
  fill: COLOR_PAPER,
  fontFamily: 'serif',
});

const SMALL_STYLE = new TextStyle({
  fontSize: 10,
  fill: COLOR_PAPER,
  fontFamily: 'serif',
});

const BATTLE_TITLE_STYLE = new TextStyle({
  fontSize: 18,
  fill: COLOR_GOLD,
  fontFamily: 'serif',
  fontWeight: 'bold',
});

const BATTLE_BODY_STYLE = new TextStyle({
  fontSize: 12,
  fill: COLOR_PAPER,
  fontFamily: 'serif',
});

const STATUS_COLORS: Record<string, number> = {
  idle: 0x4caf50,
  marching: COLOR_GOLD,
  resting: COLOR_RED,
};

const STATUS_NAMES: Record<string, string> = {
  idle: '空闲',
  marching: '出征',
  resting: '休整',
};

const TYPE_ICONS: Record<ResourceType, string> = {
  mine: '矿',
  herb: '药',
  spring: '泉',
};

export class UIManager extends Container {
  private gameManager: GameManager;
  private mapContainer: Container;
  private uiLayer: Container;

  private panelContainer: Container;
  private panelCollapsed: boolean = false;
  private panelWidth: number = 300;

  private discipleList: Container;
  private techTreeContainer: Container;
  private resourceCounters: Container;

  private battleOverlay: Container | null = null;
  private battleTimer: number = 0;

  private selectedNodeId: number | null = null;
  private nodeDetailPanel: Container | null = null;

  private pathLines: Map<number, Graphics> = new Map();
  private discipleSprites: Map<number, Container> = new Map();
  private aiSprites: Map<number, Container> = new Map();
  private baseMarkers: Container;

  private particles: Particle[] = [];
  private particlePool: Graphics[] = [];
  private maxParticles: number = 100;

  private animatedNumbers: Map<string, AnimatedNumber> = new Map();

  private gridGraphics: Graphics;
  private mountainBg: Graphics;

  private techGoldenEffects: Map<string, { graphic: Graphics; timer: number }> = new Map();

  constructor(gameManager: GameManager, mapContainer: Container) {
    super();

    this.gameManager = gameManager;
    this.mapContainer = mapContainer;

    this.gridGraphics = new Graphics();
    this.mountainBg = new Graphics();
    this.baseMarkers = new Container();

    this.uiLayer = new Container();
    this.panelContainer = new Container();
    this.discipleList = new Container();
    this.techTreeContainer = new Container();
    this.resourceCounters = new Container();

    this.drawMapBackground();
    this.drawBaseMarkers();
    this.initResourceCounters();
    this.initPanel();
    this.initDiscipleList();
    this.initTechTree();

    this.mapContainer.addChild(this.mountainBg);
    this.mapContainer.addChild(this.gridGraphics);
    this.mapContainer.addChild(this.baseMarkers);

    this.addChild(this.uiLayer);
    this.uiLayer.addChild(this.panelContainer);
    this.uiLayer.addChild(this.resourceCounters);

    this.setupEvents();
  }

  private drawMapBackground(): void {
    this.gridGraphics.clear();
    const cols = this.gameManager.gridCols;
    const rows = this.gameManager.gridRows;
    const cs = this.gameManager.cellSize;

    this.gridGraphics.lineStyle(0.5, 0x333333, 0.15);
    for (let x = 0; x <= cols; x++) {
      this.gridGraphics.moveTo(x * cs, 0);
      this.gridGraphics.lineTo(x * cs, rows * cs);
    }
    for (let y = 0; y <= rows; y++) {
      this.gridGraphics.moveTo(0, y * cs);
      this.gridGraphics.lineTo(cols * cs, y * cs);
    }

    this.mountainBg.clear();
    this.mountainBg.beginFill(0x2a2a2a, 0.3);
    this.mountainBg.moveTo(0, rows * cs);
    const peaks = [
      [2, rows * cs * 0.6], [5, rows * cs * 0.4], [8, rows * cs * 0.55],
      [11, rows * cs * 0.35], [14, rows * cs * 0.5], [17, rows * cs * 0.42],
      [20, rows * cs * 0.6],
    ];
    for (const p of peaks) {
      this.mountainBg.lineTo(p[0] * cs, p[1]);
    }
    this.mountainBg.lineTo(cols * cs, rows * cs);
    this.mountainBg.endFill();

    this.mountainBg.beginFill(0x222222, 0.2);
    this.mountainBg.moveTo(0, rows * cs);
    const peaks2 = [
      [3, rows * cs * 0.7], [7, rows * cs * 0.55], [10, rows * cs * 0.65],
      [13, rows * cs * 0.5], [16, rows * cs * 0.6], [19, rows * cs * 0.7],
    ];
    for (const p of peaks2) {
      this.mountainBg.lineTo(p[0] * cs, p[1]);
    }
    this.mountainBg.lineTo(cols * cs, rows * cs);
    this.mountainBg.endFill();
  }

  private drawBaseMarkers(): void {
    const cs = this.gameManager.cellSize;
    const pb = this.gameManager.playerBase;
    const ab = this.gameManager.aiBase;

    const playerBase = new Graphics();
    playerBase.beginFill(COLOR_RED, 0.6);
    playerBase.drawRoundedRect(pb.gridX * cs + 5, pb.gridY * cs + 5, cs - 10, cs - 10, 6);
    playerBase.endFill();
    const pbLabel = new Text('本派', { fontSize: 10, fill: COLOR_PAPER, fontFamily: 'serif' });
    pbLabel.anchor.set(0.5);
    pbLabel.x = pb.gridX * cs + cs / 2;
    pbLabel.y = pb.gridY * cs + cs / 2;
    this.baseMarkers.addChild(playerBase);
    this.baseMarkers.addChild(pbLabel);

    const aiBase = new Graphics();
    aiBase.beginFill(COLOR_BLUE, 0.6);
    aiBase.drawRoundedRect(ab.gridX * cs + 5, ab.gridY * cs + 5, cs - 10, cs - 10, 6);
    aiBase.endFill();
    const abLabel = new Text('敌派', { fontSize: 10, fill: COLOR_PAPER, fontFamily: 'serif' });
    abLabel.anchor.set(0.5);
    abLabel.x = ab.gridX * cs + cs / 2;
    abLabel.y = ab.gridY * cs + cs / 2;
    this.baseMarkers.addChild(aiBase);
    this.baseMarkers.addChild(abLabel);
  }

  private initResourceCounters(): void {
    this.resourceCounters.x = 310;
    this.resourceCounters.y = 10;

    const bg = new Graphics();
    bg.beginFill(0x0a0a0a, 0.8);
    bg.drawRoundedRect(0, 0, 280, 36, 6);
    bg.endFill();
    this.resourceCounters.addChild(bg);

    const ores = ['ore', 'herb', 'spring'];
    const icons = ['矿', '药', '泉'];
    const colors = [COLOR_GOLD, 0x4caf50, 0x42a5f5];

    ores.forEach((key, i) => {
      const iconText = new Text(icons[i], {
        fontSize: 14,
        fill: colors[i],
        fontFamily: 'serif',
        fontWeight: 'bold',
      });
      iconText.x = 15 + i * 90;
      iconText.y = 10;
      this.resourceCounters.addChild(iconText);

      const numText = new Text('50', {
        fontSize: 14,
        fill: COLOR_PAPER,
        fontFamily: 'serif',
      });
      numText.x = 35 + i * 90;
      numText.y = 10;
      this.resourceCounters.addChild(numText);

      this.animatedNumbers.set(key, {
        current: 50,
        target: 50,
        display: numText,
        animTime: 0,
      });
    });
  }

  private initPanel(): void {
    this.panelContainer.x = 0;
    this.panelContainer.y = 0;

    const bg = new Graphics();
    bg.beginFill(0x0d0d0d, 0.95);
    bg.drawRect(0, 0, this.panelWidth, 800);
    bg.endFill();
    bg.beginFill(COLOR_RED, 0.3);
    bg.drawRect(0, 0, 3, 800);
    bg.endFill();
    this.panelContainer.addChild(bg);

    const title = new Text('门派经营', TITLE_STYLE);
    title.x = 20;
    title.y = 15;
    this.panelContainer.addChild(title);

    const collapseBtn = new Graphics();
    collapseBtn.beginFill(COLOR_RED, 0.5);
    collapseBtn.drawRoundedRect(this.panelWidth - 35, 10, 25, 25, 4);
    collapseBtn.endFill();
    const collapseIcon = new Text(this.panelCollapsed ? '▶' : '◀', {
      fontSize: 12,
      fill: COLOR_PAPER,
      fontFamily: 'serif',
    });
    collapseIcon.anchor.set(0.5);
    collapseIcon.x = this.panelWidth - 22;
    collapseIcon.y = 22;
    this.panelContainer.addChild(collapseBtn);
    this.panelContainer.addChild(collapseIcon);

    collapseBtn.eventMode = 'static';
    collapseBtn.cursor = 'pointer';
    collapseBtn.on('pointerdown', () => {
      this.panelCollapsed = !this.panelCollapsed;
      this.panelContainer.x = this.panelCollapsed ? -this.panelWidth + 30 : 0;
      collapseIcon.text = this.panelCollapsed ? '▶' : '◀';
    });

    const sectLabel = new Text('弟子列表', { ...BODY_STYLE, fontSize: 13, fill: COLOR_GOLD });
    sectLabel.x = 20;
    sectLabel.y = 50;
    this.panelContainer.addChild(sectLabel);

    this.discipleList.y = 75;
    this.panelContainer.addChild(this.discipleList);

    const techLabel = new Text('科技研发', { ...BODY_STYLE, fontSize: 13, fill: COLOR_GOLD });
    techLabel.x = 20;
    techLabel.y = 310;
    this.panelContainer.addChild(techLabel);

    this.techTreeContainer.y = 335;
    this.panelContainer.addChild(this.techTreeContainer);
  }

  private initDiscipleList(): void {
    this.discipleList.removeChildren();
    const disciples = this.gameManager.playerDisciples;

    disciples.forEach((d, i) => {
      const row = this.createDiscipleRow(d, i);
      this.discipleList.addChild(row);
    });
  }

  private createDiscipleRow(d: Disciple, index: number): Container {
    const row = new Container();
    row.y = index * 45;

    const bg = new Graphics();
    bg.beginFill(0x1f1f1f, 0.8);
    bg.drawRoundedRect(10, 0, this.panelWidth - 25, 40, 4);
    bg.endFill();
    row.addChild(bg);

    const avatar = new Graphics();
    avatar.beginFill(STATUS_COLORS[d.status], 0.7);
    avatar.drawCircle(30, 20, 12);
    avatar.endFill();
    const avatarText = new Text(d.name.charAt(0), {
      fontSize: 11,
      fill: COLOR_PAPER,
      fontFamily: 'serif',
    });
    avatarText.anchor.set(0.5);
    avatarText.x = 30;
    avatarText.y = 20;
    row.addChild(avatar);
    row.addChild(avatarText);

    const info = new Text(`${d.name} Lv${d.level}`, SMALL_STYLE);
    info.x = 50;
    info.y = 4;
    row.addChild(info);

    const power = this.gameManager.getEffectivePower(d);
    const powerText = new Text(`战力:${power}`, {
      fontSize: 10,
      fill: COLOR_GOLD,
      fontFamily: 'serif',
    });
    powerText.x = 50;
    powerText.y = 20;
    row.addChild(powerText);

    const statusText = new Text(STATUS_NAMES[d.status], {
      fontSize: 10,
      fill: STATUS_COLORS[d.status],
      fontFamily: 'serif',
    });
    statusText.x = this.panelWidth - 70;
    statusText.y = 12;
    row.addChild(statusText);

    if (d.status === 'resting') {
      const restText = new Text(`${Math.ceil(d.restTimer)}s`, {
        fontSize: 9,
        fill: COLOR_RED,
        fontFamily: 'serif',
      });
      restText.x = this.panelWidth - 40;
      restText.y = 12;
      row.addChild(restText);
    }

    row.name = `disciple_${d.id}`;
    return row;
  }

  updateDiscipleList(): void {
    this.discipleList.removeChildren();
    const disciples = this.gameManager.playerDisciples;
    disciples.forEach((d, i) => {
      this.discipleList.addChild(this.createDiscipleRow(d, i));
    });
  }

  private initTechTree(): void {
    this.techTreeContainer.removeChildren();
    const techs = this.gameManager.techTree;

    techs.forEach((tech, i) => {
      const node = this.createTechNode(tech, i);
      this.techTreeContainer.addChild(node);
    });

    this.drawTechConnections();
  }

  private createTechNode(tech: TechNode, index: number): Container {
    const node = new Container();
    const col = index % 3;
    const row = Math.floor(index / 3);
    node.x = 10 + col * 95;
    node.y = row * 60;

    const bgColor = tech.researched
      ? 0x2a4a2a
      : tech.researching
        ? 0x3a3a1a
        : 0x1f1f1f;

    const bg = new Graphics();
    bg.beginFill(bgColor, 0.9);
    bg.drawRoundedRect(0, 0, 88, 52, 4);
    bg.endFill();

    if (tech.researched) {
      bg.lineStyle(1.5, COLOR_GOLD, 0.6);
      bg.drawRoundedRect(0, 0, 88, 52, 4);
    }
    node.addChild(bg);

    const name = new Text(tech.name, {
      fontSize: 11,
      fill: tech.researched ? COLOR_GOLD : COLOR_PAPER,
      fontFamily: 'serif',
      fontWeight: 'bold',
    });
    name.x = 6;
    name.y = 4;
    node.addChild(name);

    const desc = new Text(tech.description, {
      fontSize: 9,
      fill: COLOR_GRAY,
      fontFamily: 'serif',
    });
    desc.x = 6;
    desc.y = 18;
    node.addChild(desc);

    if (tech.researching) {
      const progress = 1 - tech.researchTimer / tech.researchDuration;
      const barBg = new Graphics();
      barBg.beginFill(0x333333);
      barBg.drawRect(6, 38, 76, 6);
      barBg.endFill();
      node.addChild(barBg);

      const barFill = new Graphics();
      barFill.beginFill(COLOR_GOLD);
      barFill.drawRect(6, 38, 76 * progress, 6);
      barFill.endFill();
      node.addChild(barFill);

      const timerText = new Text(`${Math.ceil(tech.researchTimer)}s`, {
        fontSize: 9,
        fill: COLOR_GOLD,
        fontFamily: 'serif',
      });
      timerText.x = 70;
      timerText.y = 26;
      node.addChild(timerText);
    } else if (!tech.researched) {
      const costText = new Text(
        `${tech.cost.ore}矿${tech.cost.herb}药${tech.cost.spring}泉`,
        { fontSize: 8, fill: 0x999999, fontFamily: 'serif' }
      );
      costText.x = 6;
      costText.y = 38;
      node.addChild(costText);

      bg.eventMode = 'static';
      bg.cursor = 'pointer';
      bg.on('pointerdown', () => {
        const ok = this.gameManager.researchTech(tech.id);
        if (!ok) {
          this.showBriefMessage('资源不足或前置未完成！');
        }
      });
    } else {
      const doneText = new Text('✓ 已研发', {
        fontSize: 9,
        fill: COLOR_GOLD,
        fontFamily: 'serif',
      });
      doneText.x = 6;
      doneText.y = 38;
      node.addChild(doneText);
    }

    node.name = `tech_${tech.id}`;
    return node;
  }

  private techConnectionLines: Graphics | null = null;

  private drawTechConnections(): void {
    if (this.techConnectionLines) {
      this.techTreeContainer.removeChild(this.techConnectionLines);
      this.techConnectionLines.destroy();
    }

    const lines = new Graphics();
    lines.lineStyle(1, 0x444444, 0.5);

    const techs = this.gameManager.techTree;
    techs.forEach((tech, _i) => {
      for (const preId of tech.prerequisites) {
        const preIdx = techs.findIndex(t => t.id === preId);
        const depIdx = techs.findIndex(t => t.id === tech.id);
        if (preIdx >= 0 && depIdx >= 0) {
          const preCol = preIdx % 3;
          const preRow = Math.floor(preIdx / 3);
          const depCol = depIdx % 3;
          const depRow = Math.floor(depIdx / 3);
          lines.moveTo(10 + preCol * 95 + 44, preRow * 60 + 52);
          lines.lineTo(10 + depCol * 95 + 44, depRow * 60);
        }
      }
    });

    this.techConnectionLines = lines;
    this.techTreeContainer.addChildAt(lines, 0);
  }

  updateTechTree(): void {
    this.initTechTree();
  }

  showBattleReport(result: BattleResult, discipleName: string, nodeName: string, faction: 'player' | 'ai'): void {
    if (this.battleOverlay) {
      this.removeChild(this.battleOverlay);
      this.battleOverlay.destroy();
    }

    this.battleOverlay = new Container();
    const overlayW = 340;
    const overlayH = 220;
    const sx = (Math.max(window.innerWidth, 640) - this.panelWidth) / 2 + this.panelWidth - overlayW / 2;
    const sy = Math.max(window.innerHeight, 400) / 2 - overlayH / 2;

    this.battleOverlay.x = sx;
    this.battleOverlay.y = sy;

    const bg = new Graphics();
    bg.beginFill(0x0a0a0a, 0.92);
    bg.drawRoundedRect(0, 0, overlayW, overlayH, 8);
    bg.endFill();
    bg.lineStyle(2, faction === 'player' ? COLOR_RED : COLOR_BLUE, 0.6);
    bg.drawRoundedRect(0, 0, overlayW, overlayH, 8);
    this.battleOverlay.addChild(bg);

    const title = new Text(
      result.attackerWon ? '⚔ 胜利' : '⚔ 败北',
      BATTLE_TITLE_STYLE
    );
    title.anchor.set(0.5, 0);
    title.x = overlayW / 2;
    title.y = 12;
    this.battleOverlay.addChild(title);

    const attackerLabel = faction === 'player' ? '我方' : '敌方';
    const lines = [
      `${attackerLabel}: ${discipleName} → ${nodeName}`,
      `战斗轮数: ${result.rounds}轮`,
      `攻方剩余HP: ${result.attackerRemainingHp}`,
      `守方剩余HP: ${result.defenderRemainingHp}`,
    ];
    if (result.log.length > 0) {
      const lastRound = result.log[result.log.length - 1];
      lines.push(`最后一轮: 攻${lastRound.attackerHit ? '命中' : '未中'}(${lastRound.attackerDamage} dmg) 守${lastRound.defenderHit ? '命中' : '未中'}(${lastRound.defenderDamage} dmg)`);
    }

    lines.forEach((line, i) => {
      const text = new Text(line, BATTLE_BODY_STYLE);
      text.x = 20;
      text.y = 45 + i * 28;
      if (this.battleOverlay) this.battleOverlay.addChild(text);
    });

    this.addChild(this.battleOverlay);
    this.battleTimer = 2;
  }

  showNodeDetail(nodeId: number, idleDisciples: any[], canDispatch: boolean, remainingSlots: number): void {
    this.hideNodeDetail();

    const node = this.gameManager.getNodeById(nodeId);
    if (!node) return;

    this.selectedNodeId = nodeId;

    const panel = new Container();
    const pw = 250;
    const ph = 150 + idleDisciples.length * 30;
    panel.x = node.x + 30;
    panel.y = node.y - ph / 2;

    const bg = new Graphics();
    bg.beginFill(0x111111, 0.95);
    bg.drawRoundedRect(0, 0, pw, ph, 6);
    bg.endFill();
    bg.lineStyle(1, COLOR_GOLD, 0.4);
    bg.drawRoundedRect(0, 0, pw, ph, 6);
    panel.addChild(bg);

    const typeNames: Record<ResourceType, string> = { mine: '矿山', herb: '药田', spring: '灵泉' };
    const ownerNames: Record<OwnerType, string> = { player: '我方', ai: '敌方', neutral: '中立' };

    const title = new Text(typeNames[node.type], TITLE_STYLE);
    title.x = 12;
    title.y = 8;
    panel.addChild(title);

    const details = [
      `产量: +${node.baseYield}/s`,
      `驻守战力: ${node.guardianPower}`,
      `归属: ${ownerNames[node.owner]}`,
      `易手次数: ${node.contestCount}`,
    ];
    details.forEach((line, i) => {
      const text = new Text(line, SMALL_STYLE);
      text.x = 12;
      text.y = 32 + i * 18;
      panel.addChild(text);
    });

    if (canDispatch && idleDisciples.length > 0) {
      const dispatchLabel = new Text('派遣弟子:', { ...SMALL_STYLE, fill: COLOR_GOLD });
      dispatchLabel.x = 12;
      dispatchLabel.y = 105;
      panel.addChild(dispatchLabel);

      idleDisciples.slice(0, remainingSlots).forEach((d, i) => {
        const btn = new Graphics();
        btn.beginFill(COLOR_RED, 0.6);
        btn.drawRoundedRect(12, 123 + i * 28, pw - 24, 24, 3);
        btn.endFill();
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', () => {
          const ok = this.gameManager.dispatchDisciple(d.id, nodeId);
          if (ok) {
            this.hideNodeDetail();
          }
        });
        panel.addChild(btn);

        const btnText = new Text(`${d.name} (战力:${d.effectivePower})`, SMALL_STYLE);
        btnText.x = 20;
        btnText.y = 127 + i * 28;
        panel.addChild(btnText);
      });
    } else if (!canDispatch) {
      const info = new Text('出征队伍已满', { ...SMALL_STYLE, fill: COLOR_RED });
      info.x = 12;
      info.y = 105;
      panel.addChild(info);
    } else {
      const info = new Text('无空闲弟子', { ...SMALL_STYLE, fill: COLOR_GRAY });
      info.x = 12;
      info.y = 105;
      panel.addChild(info);
    }

    const closeBtn = new Graphics();
    closeBtn.beginFill(COLOR_RED, 0.5);
    closeBtn.drawCircle(pw - 15, 15, 10);
    closeBtn.endFill();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointerdown', () => this.hideNodeDetail());
    panel.addChild(closeBtn);

    const closeX = new Text('✕', { fontSize: 10, fill: COLOR_PAPER, fontFamily: 'serif' });
    closeX.anchor.set(0.5);
    closeX.x = pw - 15;
    closeX.y = 15;
    panel.addChild(closeX);

    this.nodeDetailPanel = panel;
    this.addChild(panel);
  }

  hideNodeDetail(): void {
    if (this.nodeDetailPanel) {
      this.removeChild(this.nodeDetailPanel);
      this.nodeDetailPanel.destroy();
      this.nodeDetailPanel = null;
    }
    this.selectedNodeId = null;
  }

  showBriefMessage(msg: string): void {
    const text = new Text(msg, {
      fontSize: 14,
      fill: COLOR_RED,
      fontFamily: 'serif',
      fontWeight: 'bold',
    });
    text.anchor.set(0.5);
    text.x = window.innerWidth / 2;
    text.y = window.innerHeight / 2 - 50;
    text.alpha = 1;
    this.addChild(text);

    let elapsed = 0;
    const fadeOut = (dt: number) => {
      elapsed += dt;
      if (elapsed > 1) {
        text.alpha = Math.max(0, 1 - (elapsed - 1));
      }
      if (elapsed > 2) {
        this.removeChild(text);
        text.destroy();
      }
    };
    this.on('update', fadeOut);
  }

  updatePathLines(): void {
    for (const [id, line] of this.pathLines) {
      this.mapContainer.removeChild(line);
      line.destroy();
    }
    this.pathLines.clear();

    const allDisciples = [...this.gameManager.playerDisciples, ...this.gameManager.aiDisciples];
    for (const d of allDisciples) {
      if (d.status !== 'marching' || d.path.length < 2) continue;

      const line = new Graphics();
      line.lineStyle(2, d.faction === 'player' ? COLOR_RED : COLOR_BLUE, 0.5);

      const cs = this.gameManager.cellSize;
      for (let i = d.pathIndex; i < d.path.length - 1; i++) {
        const from = d.path[i];
        const to = d.path[i + 1];
        const fx = from.x * cs + cs / 2;
        const fy = from.y * cs + cs / 2;
        const tx = to.x * cs + cs / 2;
        const ty = to.y * cs + cs / 2;

        const segments = 8;
        for (let s = 0; s < segments; s += 2) {
          const t1 = s / segments;
          const t2 = Math.min((s + 1) / segments, 1);
          line.moveTo(fx + (tx - fx) * t1, fy + (ty - fy) * t1);
          line.lineTo(fx + (tx - fx) * t2, fy + (ty - fy) * t2);
        }
      }

      this.mapContainer.addChild(line);
      this.pathLines.set(d.id, line);
    }
  }

  updateDiscipleSprites(): void {
    const allDisciples = [...this.gameManager.playerDisciples, ...this.gameManager.aiDisciples];
    const activeIds = new Set<number>();

    for (const d of allDisciples) {
      activeIds.add(d.id);
      const map = d.faction === 'player' ? this.discipleSprites : this.aiSprites;
      let sprite = map.get(d.id);

      if (!sprite) {
        sprite = new Container();
        const body = new Graphics();
        body.beginFill(d.faction === 'player' ? COLOR_RED : COLOR_BLUE, 0.9);
        body.drawCircle(0, 0, 8);
        body.endFill();
        body.beginFill(0xffffff, 0.3);
        body.drawCircle(-2, -2, 3);
        body.endFill();
        sprite.addChild(body);

        const label = new Text(d.name.charAt(0), {
          fontSize: 8,
          fill: COLOR_PAPER,
          fontFamily: 'serif',
        });
        label.anchor.set(0.5);
        label.y = 1;
        sprite.addChild(label);

        sprite.name = `sprite_${d.id}`;
        map.set(d.id, sprite);
        this.mapContainer.addChild(sprite);
      }

      sprite.x = d.pixelX;
      sprite.y = d.pixelY;
      sprite.visible = d.status === 'marching' || d.status === 'idle';

      if (d.status !== 'marching' && d.faction === 'ai') {
        sprite.visible = false;
      }
    }

    for (const [id, sprite] of this.discipleSprites) {
      if (!activeIds.has(id) || this.gameManager.playerDisciples.find(d => d.id === id)?.status === 'resting') {
        sprite.visible = false;
      }
    }
    for (const [id, sprite] of this.aiSprites) {
      if (!activeIds.has(id) || this.gameManager.aiDisciples.find(d => d.id === id)?.status !== 'marching') {
        sprite.visible = false;
      }
    }
  }

  spawnContestParticles(nodeX: number, nodeY: number): void {
    for (let i = 0; i < 12; i++) {
      const g = this.getParticleFromPool();
      g.beginFill(COLOR_RED, 0.8);
      g.drawCircle(0, 0, 2 + Math.random() * 2);
      g.endFill();

      const particle: Particle = {
        x: nodeX,
        y: nodeY,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 60,
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 2,
        color: COLOR_RED,
        graphic: g,
      };
      g.x = nodeX;
      g.y = nodeY;
      g.visible = true;
      this.mapContainer.addChild(g);
      this.particles.push(particle);
    }
  }

  private getParticleFromPool(): Graphics {
    if (this.particlePool.length > 0) {
      const g = this.particlePool.pop()!;
      g.clear();
      return g;
    }
    return new Graphics();
  }

  private returnParticleToPool(g: Graphics): void {
    if (this.particlePool.length < this.maxParticles) {
      g.visible = false;
      this.particlePool.push(g);
    } else {
      g.destroy();
    }
  }

  private updateParticles(dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 20 * dt;
      p.graphic.x = p.x;
      p.graphic.y = p.y;
      p.graphic.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        toRemove.push(i);
        this.mapContainer.removeChild(p.graphic);
        this.returnParticleToPool(p.graphic);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  updateResourceCounters(resources: Resources, dt: number): void {
    const keys: (keyof Resources)[] = ['ore', 'herb', 'spring'];
    for (const key of keys) {
      const anim = this.animatedNumbers.get(key);
      if (!anim) continue;

      anim.target = resources[key];
      if (anim.current !== anim.target) {
        anim.animTime += dt;
        const t = Math.min(anim.animTime / 0.3, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        anim.current = Math.round(anim.current + (anim.target - anim.current) * eased);
        anim.display.text = String(anim.current);

        if (t >= 1) {
          anim.current = anim.target;
          anim.display.text = String(anim.target);
          anim.animTime = 0;
        }
      }
    }
  }

  showTechGoldenGlow(techId: string): void {
    const techNode = this.techTreeContainer.getChildByName(`tech_${techId}`);
    if (!techNode) return;

    const glow = new Graphics();
    glow.beginFill(COLOR_GOLD, 0.4);
    glow.drawRoundedRect(-3, -3, 94, 58, 6);
    glow.endFill();
    (techNode as Container).addChild(glow);

    this.techGoldenEffects.set(techId, { graphic: glow, timer: 1.5 });
  }

  private updateGoldenGlows(dt: number): void {
    const toRemove: string[] = [];
    for (const [techId, effect] of this.techGoldenEffects) {
      effect.timer -= dt;
      const alpha = 0.4 * (effect.timer / 1.5);
      effect.graphic.alpha = Math.max(0, alpha);
      if (effect.timer <= 0) {
        toRemove.push(techId);
        effect.graphic.parent?.removeChild(effect.graphic);
        effect.graphic.destroy();
      }
    }
    for (const id of toRemove) {
      this.techGoldenEffects.delete(id);
    }
  }

  update(dt: number): void {
    this.updateParticles(dt);
    this.updateGoldenGlows(dt);
    this.updatePathLines();
    this.updateDiscipleSprites();

    if (this.battleOverlay) {
      this.battleTimer -= dt;
      if (this.battleTimer <= 0) {
        this.removeChild(this.battleOverlay);
        this.battleOverlay.destroy();
        this.battleOverlay = null;
      }
    }

    this.emit('update', dt);
  }

  resize(width: number, height: number): void {
    if (width < 1024) {
      this.panelCollapsed = true;
      this.panelContainer.x = -this.panelWidth + 30;
    }
  }

  private setupEvents(): void {
    const gm = this.gameManager;

    gm.emitter.on('node-selected', (data: any) => {
      this.showNodeDetail(
        data.node.id,
        data.idleDisciples,
        data.canDispatch,
        data.remainingSlots
      );
    });

    gm.emitter.on('battle-result', (data: any) => {
      const nodeName = data.node.type === 'mine' ? '矿山' : data.node.type === 'herb' ? '药田' : '灵泉';
      this.showBattleReport(data.result, data.disciple.name, nodeName, data.disciple.faction);

      if (data.result.attackerWon && data.node.contestCount > 3) {
        const node = gm.getNodeById(data.node.id);
        if (node) {
          this.spawnContestParticles(node.x, node.y);
        }
      }
    });

    gm.emitter.on('tech-complete', (data: any) => {
      this.updateTechTree();
      this.showTechGoldenGlow(data.techId);
    });

    gm.emitter.on('tech-progress', () => {
      this.updateTechTree();
    });

    gm.emitter.on('resource-change', (resources: Resources) => {
      this.updateResourceCounters(resources, 0);
    });

    gm.emitter.on('disciple-resting', () => {
      this.updateDiscipleList();
    });

    gm.emitter.on('disciple-ready', () => {
      this.updateDiscipleList();
    });

    gm.emitter.on('node-occupied', () => {
      this.updateDiscipleList();
    });
  }
}
