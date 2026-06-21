import * as THREE from 'three';
import { ICard, IComboRule, Rarity, cardSystem } from './CardSystem';
import { gameEngine, BattleState, GameEventType, PlayCardResult } from './GameEngine';
import {
  createFloatingNumber,
  createComboNameAnimation,
  createCardFlipAnimation,
  createHighlightPulse,
  createHealthFlash,
  createArmorShieldAnimation,
  createVictoryAnimation,
  createEpicParticleBackground,
  createDragScaleAnimation,
  createSlideAnimation,
} from './effects';

interface UICardElements {
  element: HTMLElement;
  card: ICard;
  index: number;
}

export class UIManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private leftPanel: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private battleArea: HTMLElement | null = null;
  private playerHandArea: HTMLElement | null = null;
  private enemyField: HTMLElement | null = null;
  private playerField: HTMLElement | null = null;
  private playerHealthBar: HTMLElement | null = null;
  private enemyHealthBar: HTMLElement | null = null;
  private energyDisplay: HTMLElement | null = null;
  private turnInfo: HTMLElement | null = null;
  private cardsOnField: Map<string, HTMLElement> = new Map();
  private handCardElements: UICardElements[] = [];
  private selectedCards: Set<string> = new Set();
  private draggedCard: { element: HTMLElement; card: ICard; index: number } | null = null;
  private epicCardCanvases: Map<string, () => void> = new Map();
  private leftPanelCollapsed = false;
  private rightPanelCollapsed = true;
  private isBattleStarted = false;
  private currentStats: ReturnType<typeof gameEngine.getSerializableStats> | null = null;

  constructor(
    container: HTMLElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.initialize();
  }

  private initialize(): void {
    this.createLeftPanel();
    this.createRightPanel();
    this.createBattleArea();
    this.setupEventListeners();
    this.setupGameEngineListeners();
    this.checkResponsiveLayout();
    window.addEventListener('resize', () => this.checkResponsiveLayout());
  }

  private createLeftPanel(): void {
    this.leftPanel = document.createElement('div');
    this.leftPanel.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 320px;
      height: 100%;
      background-color: #16213e;
      border-right: 1px solid #00d4ff33;
      padding: 16px;
      overflow-y: auto;
      z-index: 100;
      transition: transform 0.3s ease-in-out;
    `;
    this.leftPanel.id = 'left-panel';

    const header = document.createElement('div');
    header.innerHTML = `<h2 style="color: #00d4ff; margin-bottom: 16px; font-size: 18px;">⚙️ 卡牌配置</h2>`;
    this.leftPanel.appendChild(header);

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '◀';
    toggleBtn.style.cssText = `
      position: absolute;
      right: -12px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 60px;
      background-color: #00d4ff;
      color: #1a1a2e;
      border: none;
      border-radius: 0 8px 8px 0;
      cursor: pointer;
      font-weight: bold;
      z-index: 101;
    `;
    toggleBtn.onclick = () => this.toggleLeftPanel();
    this.leftPanel.appendChild(toggleBtn);

    const comboSection = document.createElement('div');
    comboSection.style.marginBottom = '20px';
    comboSection.innerHTML = `
      <h3 style="color: #ffd700; margin-bottom: 10px; font-size: 14px;">✨ 连击规则</h3>
      <div id="combo-rules-list" style="margin-bottom: 10px;"></div>
      <button id="add-combo-btn" style="
        width: 100%;
        padding: 8px;
        background: linear-gradient(135deg, #00d4ff, #0099cc);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
      ">+ 新增连击规则</button>
    `;
    this.leftPanel.appendChild(comboSection);

    const cardGrid = document.createElement('div');
    cardGrid.id = 'config-cards-grid';
    cardGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    `;
    this.leftPanel.appendChild(cardGrid);

    this.container.appendChild(this.leftPanel);

    this.renderConfigCards();
    this.renderComboRules();
  }

  private createRightPanel(): void {
    const tabBtn = document.createElement('button');
    tabBtn.textContent = '📊';
    tabBtn.style.cssText = `
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 80px;
      background-color: #00d4ff;
      color: #1a1a2e;
      border: none;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      font-size: 20px;
      z-index: 99;
      transition: right 0.4s ease-in-out;
    `;
    tabBtn.id = 'stats-tab-btn';
    tabBtn.onclick = () => this.toggleRightPanel();
    this.container.appendChild(tabBtn);

    this.rightPanel = document.createElement('div');
    this.rightPanel.style.cssText = `
      position: absolute;
      right: -300px;
      top: 0;
      width: 300px;
      height: 100%;
      background-color: #16213e;
      border-left: 1px solid #00d4ff33;
      padding: 16px;
      overflow-y: auto;
      z-index: 100;
      transition: right 0.4s ease-in-out;
    `;
    this.rightPanel.id = 'right-panel';

    const header = document.createElement('div');
    header.innerHTML = `<h2 style="color: #00d4ff; margin-bottom: 16px; font-size: 18px;">📊 战斗统计</h2>`;
    this.rightPanel.appendChild(header);

    const statsContent = document.createElement('div');
    statsContent.id = 'stats-content';
    statsContent.innerHTML = this.getStatsEmptyState();
    this.rightPanel.appendChild(statsContent);

    this.container.appendChild(this.rightPanel);
  }

  private getStatsEmptyState(): string {
    return `
      <div style="text-align: center; color: #666; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎮</div>
        <p>开始战斗后可查看统计数据</p>
      </div>
    `;
  }

  private createBattleArea(): void {
    this.battleArea = document.createElement('div');
    this.battleArea.style.cssText = `
      position: absolute;
      left: 320px;
      right: 0;
      top: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      transition: left 0.3s ease-in-out, right 0.4s ease-in-out;
    `;
    this.battleArea.id = 'battle-area';

    this.enemyField = document.createElement('div');
    this.enemyField.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-bottom: 1px solid #00d4ff22;
    `;
    this.enemyField.id = 'enemy-field';

    const enemyInfo = document.createElement('div');
    enemyInfo.style.cssText = `
      position: absolute;
      left: 20px;
      top: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    enemyInfo.innerHTML = `
      <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 0 20px #ff444466;">👹</div>
      <div>
        <div style="font-weight: bold; margin-bottom: 4px;">敌 人</div>
        <div id="enemy-health-bar-container" style="width: 150px; height: 12px; background: #333; border-radius: 6px; overflow: hidden;">
          <div id="enemy-health-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff4444, #ff6666); transition: width 0.3s ease-out;"></div>
        </div>
        <div id="enemy-health-text" style="font-size: 12px; color: #ff6666; margin-top: 2px;">100 / 100</div>
        <div id="enemy-armor" style="font-size: 12px; color: #4da6ff; margin-top: 2px;">🛡️ 0</div>
      </div>
    `;
    this.enemyField.appendChild(enemyInfo);

    const enemyCardSlot = document.createElement('div');
    enemyCardSlot.id = 'enemy-card-slot';
    enemyCardSlot.style.cssText = `
      display: flex;
      gap: 10px;
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
    `;
    this.enemyField.appendChild(enemyCardSlot);

    const battleCenter = document.createElement('div');
    battleCenter.style.cssText = `
      flex: 1.5;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      min-height: 200px;
    `;
    battleCenter.id = 'battle-center';

    const turnInfo = document.createElement('div');
    turnInfo.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 212, 255, 0.2);
      padding: 8px 24px;
      border-radius: 20px;
      border: 1px solid #00d4ff66;
      color: #00d4ff;
      font-size: 14px;
    `;
    turnInfo.id = 'turn-info';
    turnInfo.innerHTML = '回合 1 - 你的回合 | 出卡牌数: 0/3';
    this.turnInfo = turnInfo;
    battleCenter.appendChild(turnInfo);

    const startBtn = document.createElement('button');
    startBtn.textContent = '⚔️ 开始战斗';
    startBtn.id = 'start-battle-btn';
    startBtn.style.cssText = `
      padding: 16px 48px;
      font-size: 20px;
      font-weight: bold;
      background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 0 30px #ff6b6b66;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    startBtn.onmouseenter = () => {
      startBtn.style.transform = 'scale(1.05)';
      startBtn.style.boxShadow = '0 0 40px #ff6b6b99';
    };
    startBtn.onmouseleave = () => {
      startBtn.style.transform = 'scale(1)';
      startBtn.style.boxShadow = '0 0 30px #ff6b6b66';
    };
    startBtn.onclick = () => this.startBattle();
    battleCenter.appendChild(startBtn);

    const endTurnBtn = document.createElement('button');
    endTurnBtn.textContent = '结束回合 ➡️';
    endTurnBtn.id = 'end-turn-btn';
    endTurnBtn.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      background: linear-gradient(135deg, #00d4ff, #0099cc);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: none;
    `;
    endTurnBtn.onclick = () => gameEngine.endTurn();
    battleCenter.appendChild(endTurnBtn);

    this.playerField = document.createElement('div');
    this.playerField.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-top: 1px solid #00d4ff22;
    `;
    this.playerField.id = 'player-field';

    const playerCardSlot = document.createElement('div');
    playerCardSlot.id = 'player-card-slot';
    playerCardSlot.style.cssText = `
      display: flex;
      gap: 10px;
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
    `;
    this.playerField.appendChild(playerCardSlot);

    const playerInfo = document.createElement('div');
    playerInfo.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    playerInfo.innerHTML = `
      <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #00d4ff, #0066cc); display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 0 20px #00d4ff66;" id="player-avatar">🧙</div>
      <div>
        <div style="font-weight: bold; margin-bottom: 4px;">你</div>
        <div id="player-health-bar-container" style="width: 150px; height: 12px; background: #333; border-radius: 6px; overflow: hidden;">
          <div id="player-health-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #44ff44, #66ff66); transition: width 0.3s ease-out;"></div>
        </div>
        <div id="player-health-text" style="font-size: 12px; color: #66ff66; margin-top: 2px;">100 / 100</div>
        <div id="player-armor" style="font-size: 12px; color: #4da6ff; margin-top: 2px;">🛡️ 0</div>
        <div id="energy-display" style="font-size: 14px; color: #ffd700; margin-top: 4px;">⚡ 3 / 3</div>
      </div>
    `;
    this.playerField.appendChild(playerInfo);

    this.battleArea.appendChild(this.enemyField);
    this.battleArea.appendChild(battleCenter);
    this.battleArea.appendChild(this.playerField);

    this.playerHandArea = document.createElement('div');
    this.playerHandArea.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px;
      background: linear-gradient(to top, #1a1a2e, transparent);
      pointer-events: none;
    `;
    this.playerHandArea.id = 'player-hand';
    this.playerField.appendChild(this.playerHandArea);

    this.container.appendChild(this.battleArea);

    this.playerHealthBar = document.getElementById('player-health-bar');
    this.enemyHealthBar = document.getElementById('enemy-health-bar');
    this.energyDisplay = document.getElementById('energy-display');
  }

  private renderConfigCards(): void {
    const grid = document.getElementById('config-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    cardSystem.getAllCards().forEach(card => {
      const cardEl = this.createCardElement(card, 'config');
      grid.appendChild(cardEl);
    });
  }

  private renderComboRules(): void {
    const list = document.getElementById('combo-rules-list');
    if (!list) return;
    list.innerHTML = '';

    cardSystem.getAllComboRules().forEach(rule => {
      const ruleEl = document.createElement('div');
      ruleEl.style.cssText = `
        background: #0f0f1a;
        border: 1px solid #ffd70044;
        border-radius: 8px;
        padding: 8px;
        margin-bottom: 8px;
        font-size: 12px;
        position: relative;
      `;

      const triggerNames = rule.triggerCardIds
        .map(id => cardSystem.getCard(id)?.icon + ' ' + cardSystem.getCard(id)?.name)
        .join(' + ');

      ruleEl.innerHTML = `
        <div style="color: #ffd700; font-weight: bold; margin-bottom: 4px;">${rule.name}</div>
        <div style="color: #aaa; margin-bottom: 4px;">
          <span style="color: #00d4ff;">${triggerNames}</span>
          <span style="color: #ffd700;"> → </span>
          <span style="color: #ff6b6b;">${rule.resultDescription}</span>
        </div>
        <button class="delete-combo-btn" data-id="${rule.id}" style="
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">✕</button>
      `;

      list.appendChild(ruleEl);
    });

    list.querySelectorAll('.delete-combo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          cardSystem.removeComboRule(id);
          this.renderComboRules();
        }
      });
    });

    const addBtn = document.getElementById('add-combo-btn');
    if (addBtn) {
      addBtn.onclick = () => this.showAddComboModal();
    }
  }

  private showAddComboModal(): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #16213e;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #00d4ff66;
      width: 400px;
      max-width: 90vw;
    `;

    content.innerHTML = `
      <h3 style="color: #00d4ff; margin-bottom: 16px;">新增连击规则</h3>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; color: #aaa;">连击名称</label>
        <input type="text" id="combo-name" style="
          width: 100%;
          padding: 8px;
          background: #0f0f1a;
          border: 1px solid #333;
          border-radius: 6px;
          color: white;
        " placeholder="例如：冰火交融">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; color: #aaa;">触发卡牌（可多选）</label>
        <div id="combo-card-select" style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 120px; overflow-y: auto;">
          ${cardSystem.getAllCards().map(c => `
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 4px 8px; background: #0f0f1a; border-radius: 4px; font-size: 12px;">
              <input type="checkbox" value="${c.id}" class="combo-card-checkbox"> ${c.icon} ${c.name}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; color: #aaa;">额外伤害</label>
        <input type="number" id="combo-damage" value="10" style="
          width: 100%;
          padding: 8px;
          background: #0f0f1a;
          border: 1px solid #333;
          border-radius: 6px;
          color: white;
        ">
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; color: #aaa;">效果描述</label>
        <input type="text" id="combo-effect" style="
          width: 100%;
          padding: 8px;
          background: #0f0f1a;
          border: 1px solid #333;
          border-radius: 6px;
          color: white;
        " placeholder="例如：造成眩晕一回合">
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="cancel-combo-btn" style="
          flex: 1;
          padding: 10px;
          background: #333;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">取消</button>
        <button id="save-combo-btn" style="
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">保存</button>
      </div>
    `;

    modal.appendChild(content);
    this.container.appendChild(modal);

    document.getElementById('cancel-combo-btn')?.addEventListener('click', () => {
      modal.remove();
    });

    document.getElementById('save-combo-btn')?.addEventListener('click', () => {
      const name = (document.getElementById('combo-name') as HTMLInputElement).value;
      const checkboxes = document.querySelectorAll('.combo-card-checkbox:checked') as NodeListOf<HTMLInputElement>;
      const cardIds = Array.from(checkboxes).map(cb => cb.value);
      const damage = parseInt((document.getElementById('combo-damage') as HTMLInputElement).value) || 0;
      const effect = (document.getElementById('combo-effect') as HTMLInputElement).value;

      if (name && cardIds.length >= 2) {
        cardSystem.addComboRule({
          name,
          triggerCardIds: cardIds,
          resultDescription: effect || `额外造成${damage}点伤害`,
          extraDamage: damage,
          extraEffect: effect,
          specialEffects: [],
        });
        this.renderComboRules();
        modal.remove();
      } else {
        alert('请填写名称并选择至少2张卡牌');
      }
    });
  }

  private createCardElement(card: ICard, mode: 'config' | 'hand' | 'field'): HTMLElement {
    const el = document.createElement('div');
    el.dataset.cardId = card.id;
    el.className = `card rarity-${card.rarity}`;

    const rarityColors: Record<Rarity, string> = {
      common: '#ffffff',
      rare: '#4da6ff',
      epic: '#a855f7',
    };

    const rarityBg: Record<Rarity, string> = {
      common: 'linear-gradient(135deg, #1a1a2e, #2a2a4e)',
      rare: 'linear-gradient(135deg, #2d2d7f, #4444aa)',
      epic: 'linear-gradient(135deg, #1a1a2e, #2a2a4e)',
    };

    const width = mode === 'config' ? '130px' : mode === 'hand' ? '100px' : '90px';
    const height = mode === 'config' ? '180px' : mode === 'hand' ? '140px' : '125px';

    el.style.cssText = `
      width: ${width};
      height: ${height};
      background: ${rarityBg[card.rarity]};
      border: 1px solid ${rarityColors[card.rarity]};
      border-radius: 16px;
      padding: 8px;
      position: relative;
      cursor: pointer;
      transition: all 0.2s ease-out;
      overflow: hidden;
      user-select: none;
    `;

    if (card.rarity === 'rare') {
      el.style.backgroundImage = `
        repeating-linear-gradient(
          45deg,
          transparent,
          transparent 5px,
          rgba(77, 166, 255, 0.1) 5px,
          rgba(77, 166, 255, 0.1) 10px
        ),
        ${rarityBg[card.rarity]}
      `;
    }

    if (card.rarity === 'epic' && mode !== 'field') {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 280;
      canvas.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
      el.appendChild(canvas);
      const cleanup = createEpicParticleBackground(canvas);
      this.epicCardCanvases.set(card.id + '_' + Date.now(), cleanup);
    }

    if (card.modified) {
      const modifiedDot = document.createElement('div');
      modifiedDot.style.cssText = `
        position: absolute;
        top: 6px;
        left: 6px;
        width: 10px;
        height: 10px;
        background: #ff4444;
        border-radius: 50%;
        box-shadow: 0 0 8px #ff4444;
        z-index: 10;
      `;
      el.appendChild(modifiedDot);
    }

    const costBadge = document.createElement('div');
    costBadge.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #ffd700, #ff8c00);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      color: #1a1a2e;
      z-index: 10;
    `;
    costBadge.textContent = card.cost.toString();
    el.appendChild(costBadge);

    const rarityBadge = document.createElement('div');
    rarityBadge.style.cssText = `
      position: absolute;
      top: 34px;
      right: 6px;
      padding: 2px 6px;
      background: ${rarityColors[card.rarity]};
      color: #1a1a2e;
      border-radius: 8px;
      font-size: 9px;
      font-weight: bold;
      z-index: 10;
    `;
    rarityBadge.textContent = card.rarity === 'common' ? '普通' : card.rarity === 'rare' ? '稀有' : '史诗';
    el.appendChild(rarityBadge);

    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = `
      font-size: ${mode === 'config' ? '40px' : mode === 'hand' ? '32px' : '28px'};
      text-align: center;
      margin-top: ${mode === 'config' ? '30px' : '24px'};
      margin-bottom: 4px;
      position: relative;
      z-index: 5;
    `;
    iconDiv.textContent = card.icon;
    el.appendChild(iconDiv);

    const nameDiv = document.createElement('div');
    nameDiv.style.cssText = `
      text-align: center;
      font-weight: bold;
      font-size: ${mode === 'config' ? '13px' : '11px'};
      margin-bottom: 4px;
      color: white;
      position: relative;
      z-index: 5;
    `;
    nameDiv.textContent = card.name;
    el.appendChild(nameDiv);

    const valueDiv = document.createElement('div');
    valueDiv.style.cssText = `
      text-align: center;
      font-size: ${mode === 'config' ? '14px' : '12px'};
      font-weight: bold;
      color: ${card.type === 'attack' ? '#ff6b6b' : card.type === 'defense' ? '#4da6ff' : '#66ff66'};
      position: relative;
      z-index: 5;
    `;
    if (card.baseDamage) valueDiv.textContent = `⚔️ ${card.baseDamage}`;
    else if (card.baseArmor) valueDiv.textContent = `🛡️ ${card.baseArmor}`;
    else valueDiv.textContent = '✨ 功能';
    el.appendChild(valueDiv);

    if (mode === 'config') {
      const descDiv = document.createElement('div');
      descDiv.style.cssText = `
        text-align: center;
        font-size: 10px;
        color: #aaa;
        margin-top: 4px;
        position: relative;
        z-index: 5;
      `;
      descDiv.textContent = card.effects[0];
      el.appendChild(descDiv);

      const editHint = document.createElement('div');
      editHint.style.cssText = `
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        color: #00d4ff66;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 5;
      `;
      editHint.textContent = '双击修改';
      el.appendChild(editHint);

      el.onmouseenter = () => {
        editHint.style.opacity = '1';
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = `0 8px 24px ${rarityColors[card.rarity]}44`;
      };
      el.onmouseleave = () => {
        editHint.style.opacity = '0';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      };

      el.ondblclick = (e) => {
        e.stopPropagation();
        this.showCardEditModal(card);
      };
    }

    if (mode === 'hand') {
      el.style.pointerEvents = 'auto';
      el.draggable = true;

      el.addEventListener('dragstart', (e) => {
        const index = this.handCardElements.findIndex(ce => ce.element === el);
        this.draggedCard = { element: el, card, index };
        createDragScaleAnimation(el, true);
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', index.toString());
      });

      el.addEventListener('dragend', () => {
        if (this.draggedCard) {
          createDragScaleAnimation(el, false);
          this.draggedCard = null;
        }
      });

      el.addEventListener('click', () => {
        if (this.isBattleStarted) {
          const index = this.handCardElements.findIndex(ce => ce.element === el);
          if (index !== -1) {
            this.playCard(index);
          }
        }
      });
    }

    return el;
  }

  private showCardEditModal(card: ICard): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #16213e;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #00d4ff66;
      width: 300px;
    `;

    const valueField = card.baseDamage !== undefined ? 'damage' : card.baseArmor !== undefined ? 'armor' : 'cost';
    const currentValue = card.baseDamage || card.baseArmor || card.cost;
    const valueLabel = valueField === 'damage' ? '伤害' : valueField === 'armor' ? '护甲' : '费用';

    content.innerHTML = `
      <h3 style="color: #00d4ff; margin-bottom: 16px; text-align: center;">${card.icon} ${card.name}</h3>
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #aaa;">费用:</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="edit-btn" data-field="cost" data-delta="-1" style="
              width: 32px; height: 32px; background: #333; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 16px;
            ">−</button>
            <span id="cost-display" style="min-width: 30px; text-align: center; font-weight: bold; color: #ffd700;">${card.cost}</span>
            <button class="edit-btn" data-field="cost" data-delta="1" style="
              width: 32px; height: 32px; background: #333; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 16px;
            ">+</button>
            <span style="font-size: 11px; color: #666;">(±1)</span>
          </div>
        </div>
        ${valueField !== 'cost' ? `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="color: #aaa;">${valueLabel}:</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="edit-btn" data-field="${valueField}" data-delta="-10" style="
              width: 32px; height: 32px; background: #333; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 16px;
            ">−</button>
            <span id="value-display" style="min-width: 40px; text-align: center; font-weight: bold; color: ${valueField === 'damage' ? '#ff6b6b' : '#4da6ff'};">${currentValue}</span>
            <button class="edit-btn" data-field="${valueField}" data-delta="10" style="
              width: 32px; height: 32px; background: #333; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 16px;
            ">+</button>
            <span style="font-size: 11px; color: #666;">(±10)</span>
          </div>
        </div>
        ` : ''}
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="reset-card-btn" style="
          flex: 1;
          padding: 10px;
          background: #666;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">重置</button>
        <button id="close-edit-btn" style="
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">完成</button>
      </div>
    `;

    modal.appendChild(content);
    this.container.appendChild(modal);

    content.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const field = (e.target as HTMLElement).dataset.field as 'damage' | 'armor' | 'cost';
        const delta = parseInt((e.target as HTMLElement).dataset.delta || '0');
        cardSystem.modifyCardValue(card.id, field, delta);

        const updatedCard = cardSystem.getCard(card.id);
        if (updatedCard) {
          const costDisplay = document.getElementById('cost-display');
          const valueDisplay = document.getElementById('value-display');
          if (costDisplay) costDisplay.textContent = updatedCard.cost.toString();
          if (valueDisplay && updatedCard[valueField === 'damage' ? 'baseDamage' : 'baseArmor'] !== undefined) {
            valueDisplay.textContent = (updatedCard[valueField === 'damage' ? 'baseDamage' : 'baseArmor'] as number).toString();
          }
        }
      });
    });

    document.getElementById('reset-card-btn')?.addEventListener('click', () => {
      cardSystem.resetCard(card.id);
      const updatedCard = cardSystem.getCard(card.id);
      if (updatedCard) {
        const costDisplay = document.getElementById('cost-display');
        const valueDisplay = document.getElementById('value-display');
        if (costDisplay) costDisplay.textContent = updatedCard.cost.toString();
        if (valueDisplay && updatedCard[valueField === 'damage' ? 'baseDamage' : 'baseArmor'] !== undefined) {
          valueDisplay.textContent = (updatedCard[valueField === 'damage' ? 'baseDamage' : 'baseArmor'] as number).toString();
        }
      }
    });

    document.getElementById('close-edit-btn')?.addEventListener('click', () => {
      modal.remove();
      this.renderConfigCards();
    });
  }

  private toggleLeftPanel(): void {
    if (!this.leftPanel) return;
    this.leftPanelCollapsed = !this.leftPanelCollapsed;
    const toggleBtn = this.leftPanel.querySelector('button');
    
    if (this.leftPanelCollapsed) {
      this.leftPanel.style.transform = 'translateX(-308px)';
      if (toggleBtn) toggleBtn.textContent = '▶';
      if (this.battleArea) this.battleArea.style.left = '12px';
    } else {
      this.leftPanel.style.transform = 'translateX(0)';
      if (toggleBtn) toggleBtn.textContent = '◀';
      if (this.battleArea) this.battleArea.style.left = '320px';
    }
  }

  private toggleRightPanel(): void {
    if (!this.rightPanel) return;
    this.rightPanelCollapsed = !this.rightPanelCollapsed;
    const tabBtn = document.getElementById('stats-tab-btn');
    
    if (this.rightPanelCollapsed) {
      this.rightPanel.style.right = '-300px';
      if (tabBtn) tabBtn.style.right = '0';
      if (this.battleArea) this.battleArea.style.right = '0';
    } else {
      this.rightPanel.style.right = '0';
      if (tabBtn) tabBtn.style.right = '300px';
      if (this.battleArea) this.battleArea.style.right = '300px';
    }
  }

  private checkResponsiveLayout(): void {
    const width = window.innerWidth;
    
    if (width < 900) {
      if (!this.leftPanelCollapsed) this.toggleLeftPanel();
      if (!this.rightPanelCollapsed) this.toggleRightPanel();
    }

    const cardTexts = document.querySelectorAll('.card .card-name, .card .card-desc');
    if (width < 600) {
      document.querySelectorAll('.card').forEach(card => {
        card.style.width = '60px';
        card.style.height = '90px';
      });
      cardTexts.forEach(text => {
        (text as HTMLElement).style.display = 'none';
      });
    }
  }

  private setupEventListeners(): void {
    const playerField = document.getElementById('player-field');
    if (playerField) {
      playerField.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
      });

      playerField.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.draggedCard && this.isBattleStarted) {
          this.playCard(this.draggedCard.index);
        }
      });
    }
  }

  private setupGameEngineListeners(): void {
    gameEngine.on((event: GameEventType, data?: unknown) => {
      switch (event) {
        case 'stateChanged':
          this.updateBattleState(data as BattleState);
          break;
        case 'cardPlayed':
          this.onCardPlayed(data as { card: ICard; result: PlayCardResult });
          break;
        case 'comboTriggered':
          this.onComboTriggered(data as IComboRule);
          break;
        case 'damageDealt':
          this.onDamageDealt(data as { target: string; amount: number; isCombo?: boolean });
          break;
        case 'armorGained':
          this.onArmorGained(data as { target: string; amount: number });
          break;
        case 'gameOver':
          this.onGameOver(data as { winner: string });
          break;
        case 'statsUpdated':
          this.updateStats(data as ReturnType<typeof gameEngine.getSerializableStats>);
          break;
      }
    });
  }

  private updateBattleState(state: BattleState): void {
    if (this.playerHealthBar) {
      this.playerHealthBar.style.width = `${(state.playerHealth / 100) * 100}%`;
    }
    const playerHealthText = document.getElementById('player-health-text');
    if (playerHealthText) {
      playerHealthText.textContent = `${state.playerHealth} / 100`;
    }

    if (this.enemyHealthBar) {
      this.enemyHealthBar.style.width = `${(state.enemyHealth / 100) * 100}%`;
    }
    const enemyHealthText = document.getElementById('enemy-health-text');
    if (enemyHealthText) {
      enemyHealthText.textContent = `${state.enemyHealth} / 100`;
    }

    const playerArmor = document.getElementById('player-armor');
    if (playerArmor) {
      playerArmor.textContent = `🛡️ ${state.playerArmor}`;
    }

    const enemyArmor = document.getElementById('enemy-armor');
    if (enemyArmor) {
      enemyArmor.textContent = `🛡️ ${state.enemyArmor}`;
    }

    if (this.energyDisplay) {
      this.energyDisplay.textContent = `⚡ ${state.playerEnergy} / ${state.maxEnergy}`;
    }

    if (this.turnInfo) {
      const turnText = state.currentTurn === 'player' ? '你的回合' : '敌人回合';
      this.turnInfo.innerHTML = `回合 ${state.turnNumber} - ${turnText} | 出卡牌数: ${state.cardsPlayedThisTurn}/${state.maxCardsPerTurn}`;
    }

    if (this.isBattleStarted) {
      this.renderPlayerHand();
    }
  }

  private startBattle(): void {
    const allCards = cardSystem.getAllCards();
    const selectedIds = allCards.slice(0, 6).map(c => c.id);
    
    gameEngine.initializeBattle(selectedIds);
    this.isBattleStarted = true;

    const startBtn = document.getElementById('start-battle-btn');
    if (startBtn) startBtn.style.display = 'none';

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) endTurnBtn.style.display = 'block';

    this.renderPlayerHand();
  }

  private renderPlayerHand(): void {
    if (!this.playerHandArea) return;
    
    this.handCardElements.forEach(ce => ce.element.remove());
    this.handCardElements = [];

    const hand = gameEngine.getPlayerHand();
    hand.forEach((card, index) => {
      const cardEl = this.createCardElement(card, 'hand');
      this.playerHandArea!.appendChild(cardEl);
      this.handCardElements.push({ element: cardEl, card, index });
    });
  }

  private playCard(index: number): void {
    const result = gameEngine.playCard(index);
    if (!result.success) {
      console.log(result.message);
    }
  }

  private onCardPlayed(data: { card: ICard; result: PlayCardResult }): void {
    const { card, result } = data;
    const playerSlot = document.getElementById('player-card-slot');
    if (!playerSlot) return;

    const cardEl = this.createCardElement(card, 'field');
    playerSlot.appendChild(cardEl);
    this.cardsOnField.set(card.id + '_' + Date.now(), cardEl);

    createCardFlipAnimation(cardEl).then(() => {
      if (result.affectedCards) {
        result.affectedCards.forEach(cardId => {
          const cardElements = document.querySelectorAll(`[data-card-id="${cardId}"]`);
          cardElements.forEach(el => {
            if (el.closest('#player-card-slot') || el.closest('#config-cards-grid')) {
              createHighlightPulse(el as HTMLElement, '#ffd700', 500);
            }
          });
        });
      }

      if (result.damageDealt) {
        const rect = cardEl.getBoundingClientRect();
        createFloatingNumber(
          this.container,
          rect.left + rect.width / 2,
          rect.top,
          `-${result.damageDealt}`,
          result.comboTriggered ? '#ffd700' : '#ff6b6b',
          1000
        );
      }

      if (result.armorGained) {
        const rect = cardEl.getBoundingClientRect();
        createFloatingNumber(
          this.container,
          rect.left + rect.width / 2,
          rect.top,
          `+${result.armorGained}`,
          '#4da6ff',
          1000
        );

        const playerAvatar = document.getElementById('player-avatar');
        if (playerAvatar) {
          const avatarRect = playerAvatar.getBoundingClientRect();
          createArmorShieldAnimation(
            this.container,
            avatarRect.left + avatarRect.width / 2,
            avatarRect.top + avatarRect.height / 2
          );
        }
      }

      if (result.healthRestored) {
        const playerHealthBar = document.getElementById('player-health-bar-container');
        if (playerHealthBar) {
          const rect = playerHealthBar.getBoundingClientRect();
          createFloatingNumber(
            this.container,
            rect.left + rect.width / 2,
            rect.top,
            `+${result.healthRestored}`,
            '#44ff44',
            1000
          );
          createHealthFlash(playerHealthBar, false);
        }
      }
    });

    setTimeout(() => {
      cardEl.remove();
    }, 2000);
  }

  private onComboTriggered(combo: IComboRule): void {
    createComboNameAnimation(this.container, combo.name);

    combo.triggerCardIds.forEach(cardId => {
      const cardElements = document.querySelectorAll(`[data-card-id="${cardId}"]`);
      cardElements.forEach(el => {
        if (el.closest('#player-card-slot') || el.closest('#config-cards-grid')) {
          createHighlightPulse(el as HTMLElement, '#ffd700', 500);
        }
      });
    });
  }

  private onDamageDealt(data: { target: string; amount: number; isCombo?: boolean }): void {
    if (data.target === 'enemy' && data.amount > 0) {
      const enemyHealthBar = document.getElementById('enemy-health-bar-container');
      if (enemyHealthBar) {
        createHealthFlash(enemyHealthBar, true);
      }
    } else if (data.target === 'player' && data.amount > 0) {
      const playerHealthBar = document.getElementById('player-health-bar-container');
      if (playerHealthBar) {
        createHealthFlash(playerHealthBar, true);
        const rect = playerHealthBar.getBoundingClientRect();
        createFloatingNumber(
          this.container,
          rect.left + rect.width / 2,
          rect.top,
          `-${data.amount}`,
          '#ff6b6b',
          1000
        );
      }
    }
  }

  private onArmorGained(data: { target: string; amount: number }): void {
    if (data.target === 'player') {
      const playerArmor = document.getElementById('player-armor');
      if (playerArmor) {
        const rect = playerArmor.getBoundingClientRect();
        createFloatingNumber(
          this.container,
          rect.left + rect.width / 2,
          rect.top,
          `+${data.amount}`,
          '#4da6ff',
          1000
        );
      }
    }
  }

  private onGameOver(data: { winner: string }): void {
    if (data.winner === 'player') {
      createVictoryAnimation(this.container);
    } else {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
      `;
      overlay.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 96px; color: #ff4444; text-shadow: 0 0 30px #ff4444; margin-bottom: 20px;">失 败</div>
          <div style="font-size: 24px; color: #aaa;">敌人击败了你...</div>
        </div>
      `;
      this.container.appendChild(overlay);
      setTimeout(() => overlay.remove(), 3000);
    }

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) endTurnBtn.style.display = 'none';

    if (this.rightPanelCollapsed) {
      this.toggleRightPanel();
    }
  }

  private updateStats(stats: ReturnType<typeof gameEngine.getSerializableStats>): void {
    this.currentStats = stats;
    const statsContent = document.getElementById('stats-content');
    if (!statsContent) return;

    const maxUsage = Math.max(...stats.cardUsageCount.map(([, count]) => count), 1);
    const rateColor = stats.comboTriggerRate > 50 ? '#44ff44' : stats.comboTriggerRate > 25 ? '#ffd700' : '#ff4444';

    statsContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #aaa;">总回合数</span>
          <span style="font-weight: bold; color: #00d4ff;">${stats.totalTurns}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #aaa;">总伤害输出</span>
          <span style="font-weight: bold; color: #ff6b6b;">${stats.totalDamageDealt}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #aaa;">总护甲获得</span>
          <span style="font-weight: bold; color: #4da6ff;">${stats.totalArmorGained}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <span style="color: #aaa;">触发连击次数</span>
          <span style="font-weight: bold; color: #ffd700;">${stats.comboTriggerCount}</span>
        </div>
      </div>

      <div style="margin-bottom: 20px; text-align: center;">
        <div style="color: #aaa; margin-bottom: 8px;">连击触发率</div>
        <div style="position: relative; width: 120px; height: 120px; margin: 0 auto;">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#333" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="${rateColor}" stroke-width="10"
              stroke-dasharray="${stats.comboTriggerRate * 3.14} ${314 - stats.comboTriggerRate * 3.14}"
              stroke-linecap="round" transform="rotate(-90 60 60)"
              style="transition: stroke-dasharray 0.5s ease-out; filter: drop-shadow(0 0 6px ${rateColor});"/>
          </svg>
          <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: bold; color: ${rateColor};">
            ${stats.comboTriggerRate.toFixed(0)}%
          </div>
        </div>
      </div>

      <div>
        <div style="color: #aaa; margin-bottom: 10px;">卡牌使用次数</div>
        ${stats.cardUsageCount.map(([cardId, count]) => {
          const card = cardSystem.getCard(cardId);
          if (!card) return '';
          const typeColor = card.type === 'attack' ? '#ff6b6b' : card.type === 'defense' ? '#4da6ff' : '#66ff66';
          return `
            <div style="margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
                <span>${card.icon} ${card.name}</span>
                <span>${count}次</span>
              </div>
              <div style="height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${(count / maxUsage) * 100}%; background: ${typeColor}; transition: width 0.3s ease-out;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  public update(deltaTime: number): void {
  }

  public dispose(): void {
    this.epicCardCanvases.forEach(cleanup => cleanup());
    this.epicCardCanvases.clear();
  }
}
