/**
 * UI渲染模块
 * 
 * 职责: 将游戏状态渲染为Canvas画面，响应鼠标点击事件，显示各类UI面板
 * 
 * 调用关系:
 * - 依赖: GameEngine (订阅状态、调用引擎方法)、types.ts (卡牌类型)
 * - 被调用: main.ts (初始化)
 * - 调用: GameEngine (selectCard、playSelectedCard、endPlayerTurn等)
 * 
 * 数据流向:
 * GameEngine.subscribe → 状态变更检测 hasStateChanged → scheduleRender → render()
 * 用户鼠标事件 → handleCanvasClick → GameEngine方法调用 → 状态更新
 * 
 * 性能优化: 使用状态变更检测，仅在状态真正变化时才重新渲染
 */

import { GameEngine, GameState } from '../engine/GameEngine';
import { Card, RARITY_COLORS, RARITY_NAMES } from '../engine/types';

const COLORS = {
  bg: '#0F172A',
  bgSecondary: '#1E293B',
  primary: '#3B82F6',
  accent: '#F59E0B',
  purple: '#8B5CF6',
  purpleGradient1: '#8B5CF6',
  purpleGradient2: '#6366F1',
  health: '#EF4444',
  success: '#10B981',
  danger: '#EF4444',
  text: '#D1D5DB',
  textDim: '#9CA3AF',
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  logBg: '#1F2937',
  overlay: '#00000080',
  white: '#FFFFFF'
};

const CARD_WIDTH = 180;
const CARD_HEIGHT = 260;
const CARD_RADIUS = 12;
const HAND_AREA_HEIGHT = 120;
const LOG_PANEL_WIDTH = 280;

interface DeckBuildUIState {
  selectedCardIds: string[];
  expanded: boolean;
  hoveredCardId: string | null;
  selectedDetailCard: Card | null;
}

interface BattleUIState {
  hoveredHandCardId: string | null;
  buttonHovered: boolean;
}

export class UIRenderer {
  private engine: GameEngine;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private state: GameState;
  private deckBuildUI: DeckBuildUIState;
  private battleUI: BattleUIState;
  private lastState: GameState | null = null;
  private width: number = 0;
  private height: number = 0;
  private logContainer: HTMLDivElement | null = null;
  private logList: HTMLDivElement | null = null;
  private deckBuildContainer: HTMLDivElement | null = null;
  private overlayContainer: HTMLDivElement | null = null;
  private detailOverlay: HTMLDivElement | null = null;
  private endGameOverlay: HTMLDivElement | null = null;
  private playButton: HTMLDivElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private renderPending: boolean = false;

  constructor(engine: GameEngine, container: HTMLElement) {
    this.engine = engine;
    this.container = container;
    this.state = engine.getState();
    this.deckBuildUI = {
      selectedCardIds: [],
      expanded: true,
      hoveredCardId: null,
      selectedDetailCard: null
    };
    this.battleUI = {
      hoveredHandCardId: null,
      buttonHovered: false
    };

    this.init();
  }

  private init(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.backgroundColor = COLORS.bg;
    this.container.style.overflow = 'hidden';
    this.container.style.minWidth = '1024px';

    this.unsubscribe = this.engine.subscribe((state: GameState) => {
      const stateChanged = this.hasStateChanged(this.state, state);
      this.state = state;
      if (stateChanged) {
        this.scheduleRender();
        this.updateUI();
      }
    });

    this.setupResize();
    this.scheduleRender();
  }

  private hasStateChanged(oldState: GameState, newState: GameState): boolean {
    if (!this.lastState) {
      this.lastState = { ...newState };
      return true;
    }
    const keys = Object.keys(newState) as (keyof GameState)[];
    for (const key of keys) {
      if (key === 'playerHand' || key === 'aiHand' || key === 'battleLog') {
        if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
          this.lastState = { ...newState };
          return true;
        }
      } else if (key === 'playerHero' || key === 'aiHero') {
        if (oldState[key].health !== newState[key].health ||
            oldState[key].armor !== newState[key].armor) {
          this.lastState = { ...newState };
          return true;
        }
      } else if (oldState[key] !== newState[key]) {
        this.lastState = { ...newState };
        return true;
      }
    }
    return false;
  }

  private scheduleRender(): void {
    this.renderPending = true;
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        if (this.renderPending) {
          this.render();
          this.renderPending = false;
        }
        this.animationFrameId = null;
      });
    }
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.scheduleRender();
    });
    this.resize();
  }

  private resize(): void {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    if (this.canvas) {
      this.canvas.width = this.width - LOG_PANEL_WIDTH;
      this.canvas.height = this.height;
    }
    if (this.deckBuildContainer) {
      this.deckBuildContainer.style.width = `${this.width - LOG_PANEL_WIDTH}px`;
    }
  }

  private render(): void {
    if (this.state.phase === 'deck_building') {
      this.renderDeckBuildingPhase();
    } else {
      this.renderBattlePhase();
    }
  }

  private renderDeckBuildingPhase(): void {
    if (!this.deckBuildContainer) {
      this.createDeckBuildingUI();
    }
    this.updateDeckBuildingUI();
  }

  private createDeckBuildingUI(): void {
    this.cleanupBattleUI();

    this.deckBuildContainer = document.createElement('div');
    this.deckBuildContainer.style.position = 'absolute';
    this.deckBuildContainer.style.top = '0';
    this.deckBuildContainer.style.left = '0';
    this.deckBuildContainer.style.width = `${this.width - LOG_PANEL_WIDTH}px`;
    this.deckBuildContainer.style.height = '100%';
    this.deckBuildContainer.style.display = 'flex';
    this.deckBuildContainer.style.flexDirection = 'column';
    this.deckBuildContainer.style.padding = '20px';
    this.deckBuildContainer.style.gap = '16px';
    this.deckBuildContainer.style.overflowY = 'auto';
    this.container.appendChild(this.deckBuildContainer);

    this.createLogPanel();
    this.createOverlayContainer();
  }

  private updateDeckBuildingUI(): void {
    if (!this.deckBuildContainer) return;
    this.deckBuildContainer.innerHTML = '';

    const cardPool = this.engine.getCardPool();
    const selectedIds = this.deckBuildUI.selectedCardIds;
    const selectedCount = selectedIds.length;
    const remaining = 15 - selectedCount;

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';

    const title = document.createElement('h1');
    title.textContent = '牌组构筑';
    title.style.fontSize = '28px';
    title.style.fontWeight = 'bold';
    title.style.color = COLORS.white;
    header.appendChild(title);

    const counter = document.createElement('div');
    counter.style.display = 'flex';
    counter.style.alignItems = 'center';
    counter.style.gap = '16px';
    counter.style.fontSize = '16px';

    const selectedSpan = document.createElement('span');
    selectedSpan.innerHTML = `已选: <strong style="color:${COLORS.accent}">${selectedCount}</strong>/15`;
    counter.appendChild(selectedSpan);

    const remainingSpan = document.createElement('span');
    remainingSpan.innerHTML = `剩余: <strong style="color:${COLORS.success}">${remaining}</strong>`;
    counter.appendChild(remainingSpan);

    const startBtn = document.createElement('button');
    startBtn.textContent = '开始对战';
    startBtn.style.width = '160px';
    startBtn.style.height = '48px';
    startBtn.style.borderRadius = '24px';
    startBtn.style.backgroundColor = selectedCount === 15 ? COLORS.success : COLORS.textDim;
    startBtn.style.color = COLORS.white;
    startBtn.style.fontSize = '16px';
    startBtn.style.fontWeight = 'bold';
    startBtn.style.border = 'none';
    startBtn.style.cursor = selectedCount === 15 ? 'pointer' : 'not-allowed';
    startBtn.style.transition = 'all 0.2s ease-out';
    if (selectedCount === 15) {
      startBtn.addEventListener('mouseenter', () => {
        startBtn.style.transform = 'scale(1.05)';
        startBtn.style.boxShadow = `0 0 20px ${COLORS.success}80`;
      });
      startBtn.addEventListener('mouseleave', () => {
        startBtn.style.transform = 'scale(1)';
        startBtn.style.boxShadow = 'none';
      });
      startBtn.addEventListener('click', () => {
        this.startBattle();
      });
    }
    counter.appendChild(startBtn);

    header.appendChild(counter);
    this.deckBuildContainer.appendChild(header);

    const selectedSection = document.createElement('div');
    const selectedHeader = document.createElement('div');
    selectedHeader.style.display = 'flex';
    selectedHeader.style.justifyContent = 'space-between';
    selectedHeader.style.alignItems = 'center';
    selectedHeader.style.cursor = 'pointer';
    selectedHeader.style.padding = '8px 12px';
    selectedHeader.style.backgroundColor = COLORS.bgSecondary;
    selectedHeader.style.borderRadius = '8px';
    selectedHeader.style.marginBottom = '8px';
    selectedHeader.addEventListener('click', () => {
      this.deckBuildUI.expanded = !this.deckBuildUI.expanded;
      this.scheduleRender();
    });

    const selectedTitle = document.createElement('h2');
    selectedTitle.textContent = `我的套牌 (${selectedCount}/15)`;
    selectedTitle.style.fontSize = '18px';
    selectedTitle.style.color = COLORS.white;
    selectedHeader.appendChild(selectedTitle);

    const arrow = document.createElement('span');
    arrow.textContent = this.deckBuildUI.expanded ? '▼' : '▶';
    arrow.style.color = COLORS.textDim;
    arrow.style.fontSize = '12px';
    selectedHeader.appendChild(arrow);

    selectedSection.appendChild(selectedHeader);

    if (this.deckBuildUI.expanded) {
      const selectedCardsGrid = document.createElement('div');
      selectedCardsGrid.style.display = 'flex';
      selectedCardsGrid.style.flexWrap = 'wrap';
      selectedCardsGrid.style.gap = '12px';
      selectedCardsGrid.style.padding = '12px';
      selectedCardsGrid.style.backgroundColor = COLORS.bgSecondary;
      selectedCardsGrid.style.borderRadius = '8px';
      selectedCardsGrid.style.marginBottom = '16px';

      if (selectedIds.length === 0) {
        const emptyHint = document.createElement('div');
        emptyHint.textContent = '点击下方卡牌池中的卡牌来添加到套牌';
        emptyHint.style.color = COLORS.textDim;
        emptyHint.style.padding = '20px';
        emptyHint.style.textAlign = 'center';
        emptyHint.style.width = '100%';
        selectedCardsGrid.appendChild(emptyHint);
      } else {
        for (const cardId of selectedIds) {
          const card = cardPool.find(c => c.id === cardId);
          if (card) {
            selectedCardsGrid.appendChild(this.createCardElement(card, true));
          }
        }
      }
      selectedSection.appendChild(selectedCardsGrid);
    }

    this.deckBuildContainer.appendChild(selectedSection);

    const poolTitle = document.createElement('h2');
    poolTitle.textContent = `卡牌池 (${cardPool.length}张)`;
    poolTitle.style.fontSize = '18px';
    poolTitle.style.color = COLORS.white;
    poolTitle.style.marginBottom = '12px';
    this.deckBuildContainer.appendChild(poolTitle);

    const poolGrid = document.createElement('div');
    poolGrid.style.display = 'flex';
    poolGrid.style.flexWrap = 'wrap';
    poolGrid.style.gap = '12px';
    poolGrid.style.padding = '12px';
    poolGrid.style.backgroundColor = COLORS.bgSecondary;
    poolGrid.style.borderRadius = '8px';

    for (const card of cardPool) {
      poolGrid.appendChild(this.createCardElement(card, selectedIds.includes(card.id)));
    }
    this.deckBuildContainer.appendChild(poolGrid);
  }

  private createCardElement(card: Card, inDeck: boolean): HTMLDivElement {
    const el = document.createElement('div');
    el.style.width = `${CARD_WIDTH}px`;
    el.style.height = `${CARD_HEIGHT}px`;
    el.style.borderRadius = `${CARD_RADIUS}px`;
    el.style.border = `3px solid ${RARITY_COLORS[card.rarity]}`;
    el.style.backgroundColor = inDeck ? COLORS.bgSecondary : COLORS.bg;
    el.style.opacity = inDeck ? '0.6' : '1';
    el.style.padding = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '8px';
    el.style.cursor = 'pointer';
    el.style.transition = 'all 0.2s ease-out';
    el.style.position = 'relative';
    el.style.boxSizing = 'border-box';
    el.style.overflow = 'hidden';

    el.addEventListener('mouseenter', () => {
      el.style.transform = 'translateY(-4px)';
      el.style.boxShadow = `0 8px 24px ${RARITY_COLORS[card.rarity]}60`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translateY(0)';
      el.style.boxShadow = 'none';
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCardDetail(card);
    });
    el.addEventListener('dblclick', () => {
      this.handleCardDoubleClick(card);
    });

    const costRow = document.createElement('div');
    costRow.style.display = 'flex';
    costRow.style.justifyContent = 'space-between';
    costRow.style.alignItems = 'center';

    const costBadge = document.createElement('div');
    costBadge.style.width = '36px';
    costBadge.style.height = '36px';
    costBadge.style.borderRadius = '50%';
    costBadge.style.backgroundColor = COLORS.accent;
    costBadge.style.display = 'flex';
    costBadge.style.alignItems = 'center';
    costBadge.style.justifyContent = 'center';
    costBadge.style.color = COLORS.white;
    costBadge.style.fontWeight = 'bold';
    costBadge.style.fontSize = '18px';
    costBadge.textContent = String(card.cost);
    costRow.appendChild(costBadge);

    const rarityTag = document.createElement('div');
    rarityTag.style.fontSize = '11px';
    rarityTag.style.color = RARITY_COLORS[card.rarity];
    rarityTag.style.fontWeight = 'bold';
    rarityTag.textContent = RARITY_NAMES[card.rarity];
    costRow.appendChild(rarityTag);

    el.appendChild(costRow);

    const nameEl = document.createElement('div');
    nameEl.style.fontSize = '14px';
    nameEl.style.fontWeight = 'bold';
    nameEl.style.color = COLORS.white;
    nameEl.style.textAlign = 'center';
    nameEl.style.minHeight = '18px';
    nameEl.textContent = card.name;
    el.appendChild(nameEl);

    const artEl = document.createElement('div');
    artEl.style.flex = '1';
    artEl.style.background = `linear-gradient(135deg, ${RARITY_COLORS[card.rarity]}30, ${RARITY_COLORS[card.rarity]}10)`;
    artEl.style.borderRadius = '8px';
    artEl.style.display = 'flex';
    artEl.style.alignItems = 'center';
    artEl.style.justifyContent = 'center';
    artEl.style.fontSize = '48px';
    artEl.textContent = this.getCardEmoji(card);
    el.appendChild(artEl);

    const descEl = document.createElement('div');
    descEl.style.fontSize = '11px';
    descEl.style.color = COLORS.textDim;
    descEl.style.lineHeight = '1.4';
    descEl.style.minHeight = '30px';
    descEl.style.textAlign = 'center';
    descEl.textContent = card.description;
    el.appendChild(descEl);

    const statsRow = document.createElement('div');
    statsRow.style.display = 'flex';
    statsRow.style.justifyContent = 'space-between';

    const atkEl = document.createElement('div');
    atkEl.style.color = COLORS.health;
    atkEl.style.fontWeight = 'bold';
    atkEl.style.fontSize = '16px';
    atkEl.textContent = `⚔ ${card.attack}`;
    statsRow.appendChild(atkEl);

    const hpEl = document.createElement('div');
    hpEl.style.color = COLORS.success;
    hpEl.style.fontWeight = 'bold';
    hpEl.style.fontSize = '16px';
    hpEl.textContent = `❤ ${card.health}`;
    statsRow.appendChild(hpEl);

    el.appendChild(statsRow);

    if (inDeck) {
      const check = document.createElement('div');
      check.style.position = 'absolute';
      check.style.top = '8px';
      check.style.right = '8px';
      check.style.width = '24px';
      check.style.height = '24px';
      check.style.borderRadius = '50%';
      check.style.backgroundColor = COLORS.success;
      check.style.display = 'flex';
      check.style.alignItems = 'center';
      check.style.justifyContent = 'center';
      check.style.color = COLORS.white;
      check.style.fontSize = '14px';
      check.style.fontWeight = 'bold';
      check.textContent = '✓';
      el.appendChild(check);
    }

    return el;
  }

  private getCardEmoji(card: Card): string {
    if (card.effects.some(e => e.type === 'heal')) return '💚';
    if (card.effects.some(e => e.type === 'armor')) return '🛡';
    if (card.effects.some(e => e.type === 'draw')) return '📜';
    if (card.attack >= 8) return '🐉';
    if (card.attack >= 5) return '⚔';
    if (card.attack >= 3) return '🗡';
    return '👤';
  }

  private handleCardDoubleClick(card: Card): void {
    const idx = this.deckBuildUI.selectedCardIds.indexOf(card.id);
    if (idx >= 0) {
      this.deckBuildUI.selectedCardIds.splice(idx, 1);
    } else if (this.deckBuildUI.selectedCardIds.length < 15) {
      this.deckBuildUI.selectedCardIds.push(card.id);
    }
    this.scheduleRender();
  }

  private showCardDetail(card: Card): void {
    if (!this.overlayContainer) return;
    this.overlayContainer.innerHTML = '';
    this.overlayContainer.style.display = 'flex';

    this.detailOverlay = document.createElement('div');
    this.detailOverlay.style.width = '400px';
    this.detailOverlay.style.backgroundColor = COLORS.white;
    this.detailOverlay.style.padding = '24px';
    this.detailOverlay.style.borderRadius = '16px';
    this.detailOverlay.style.color = '#111';
    this.detailOverlay.style.display = 'flex';
    this.detailOverlay.style.flexDirection = 'column';
    this.detailOverlay.style.gap = '16px';
    this.detailOverlay.style.animation = 'fadeIn 0.3s ease-out';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    this.detailOverlay.appendChild(style);

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const h = document.createElement('h2');
    h.textContent = card.name;
    h.style.margin = '0';
    h.style.fontSize = '22px';
    h.style.color = RARITY_COLORS[card.rarity];
    header.appendChild(h);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.border = 'none';
    closeBtn.style.backgroundColor = COLORS.textDim;
    closeBtn.style.color = COLORS.white;
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.transition = 'all 0.2s ease-out';
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.transform = 'scale(1.1)';
      closeBtn.style.backgroundColor = COLORS.danger;
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.transform = 'scale(1)';
      closeBtn.style.backgroundColor = COLORS.textDim;
    });
    closeBtn.addEventListener('click', () => this.hideDetail());
    header.appendChild(closeBtn);

    this.detailOverlay.appendChild(header);

    const cardArt = document.createElement('div');
    cardArt.style.width = '100%';
    cardArt.style.height = '200px';
    cardArt.style.background = `linear-gradient(135deg, ${RARITY_COLORS[card.rarity]}, ${RARITY_COLORS[card.rarity]}80)`;
    cardArt.style.borderRadius = '12px';
    cardArt.style.display = 'flex';
    cardArt.style.alignItems = 'center';
    cardArt.style.justifyContent = 'center';
    cardArt.style.fontSize = '80px';
    cardArt.textContent = this.getCardEmoji(card);
    this.detailOverlay.appendChild(cardArt);

    const infoGrid = document.createElement('div');
    infoGrid.style.display = 'grid';
    infoGrid.style.gridTemplateColumns = '1fr 1fr 1fr';
    infoGrid.style.gap = '8px';

    const costInfo = this.createInfoItem('费用', String(card.cost), COLORS.accent);
    const atkInfo = this.createInfoItem('攻击', String(card.attack), COLORS.health);
    const hpInfo = this.createInfoItem('生命', String(card.health), COLORS.success);
    infoGrid.appendChild(costInfo);
    infoGrid.appendChild(atkInfo);
    infoGrid.appendChild(hpInfo);
    this.detailOverlay.appendChild(infoGrid);

    const rarityInfo = this.createInfoItem('稀有度', RARITY_NAMES[card.rarity], RARITY_COLORS[card.rarity]);
    rarityInfo.style.gridColumn = '1 / -1';
    this.detailOverlay.appendChild(rarityInfo);

    const descLabel = document.createElement('div');
    descLabel.textContent = '效果描述';
    descLabel.style.fontSize = '14px';
    descLabel.style.color = '#555';
    descLabel.style.fontWeight = 'bold';
    this.detailOverlay.appendChild(descLabel);

    const descContent = document.createElement('div');
    descContent.textContent = card.description;
    descContent.style.fontSize = '15px';
    descContent.style.color = '#333';
    descContent.style.lineHeight = '1.6';
    descContent.style.padding = '12px';
    descContent.style.backgroundColor = '#F3F4F6';
    descContent.style.borderRadius = '8px';
    this.detailOverlay.appendChild(descContent);

    const actionBtn = document.createElement('button');
    const isInDeck = this.deckBuildUI.selectedCardIds.includes(card.id);
    const canAdd = this.deckBuildUI.selectedCardIds.length < 15 || isInDeck;
    actionBtn.textContent = isInDeck ? '从套牌中移除' : '添加到套牌';
    actionBtn.style.width = '100%';
    actionBtn.style.height = '44px';
    actionBtn.style.borderRadius = '22px';
    actionBtn.style.backgroundColor = isInDeck ? COLORS.danger : COLORS.primary;
    actionBtn.style.color = COLORS.white;
    actionBtn.style.fontSize = '14px';
    actionBtn.style.fontWeight = 'bold';
    actionBtn.style.border = 'none';
    actionBtn.style.cursor = canAdd ? 'pointer' : 'not-allowed';
    actionBtn.style.opacity = canAdd ? '1' : '0.5';
    actionBtn.style.transition = 'all 0.2s ease-out';
    if (canAdd) {
      actionBtn.addEventListener('mouseenter', () => {
        actionBtn.style.transform = 'translateX(5px)';
        actionBtn.style.boxShadow = `0 0 20px ${isInDeck ? COLORS.danger : COLORS.primary}80`;
      });
      actionBtn.addEventListener('mouseleave', () => {
        actionBtn.style.transform = 'translateX(0)';
        actionBtn.style.boxShadow = 'none';
      });
      actionBtn.addEventListener('click', () => {
        this.handleCardDoubleClick(card);
        this.hideDetail();
      });
    }
    this.detailOverlay.appendChild(actionBtn);

    this.overlayContainer.appendChild(this.detailOverlay);
    this.overlayContainer.addEventListener('click', (e) => {
      if (e.target === this.overlayContainer) {
        this.hideDetail();
      }
    }, { once: true });
  }

  private createInfoItem(label: string, value: string, color: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.padding = '8px';
    el.style.backgroundColor = '#F3F4F6';
    el.style.borderRadius = '8px';

    const l = document.createElement('div');
    l.style.fontSize = '12px';
    l.style.color = '#666';
    l.textContent = label;

    const v = document.createElement('div');
    v.style.fontSize = '20px';
    v.style.fontWeight = 'bold';
    v.style.color = color;
    v.textContent = value;

    el.appendChild(l);
    el.appendChild(v);
    return el;
  }

  private hideDetail(): void {
    if (this.overlayContainer) {
      this.overlayContainer.innerHTML = '';
      this.overlayContainer.style.display = 'none';
    }
  }

  private createOverlayContainer(): void {
    if (this.overlayContainer) return;
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.style.position = 'absolute';
    this.overlayContainer.style.top = '0';
    this.overlayContainer.style.left = '0';
    this.overlayContainer.style.width = '100%';
    this.overlayContainer.style.height = '100%';
    this.overlayContainer.style.backgroundColor = COLORS.overlay;
    this.overlayContainer.style.display = 'none';
    this.overlayContainer.style.alignItems = 'center';
    this.overlayContainer.style.justifyContent = 'center';
    this.overlayContainer.style.zIndex = '100';
    this.container.appendChild(this.overlayContainer);
  }

  private createLogPanel(): void {
    if (this.logContainer) return;

    this.logContainer = document.createElement('div');
    this.logContainer.style.position = 'absolute';
    this.logContainer.style.top = '0';
    this.logContainer.style.right = '0';
    this.logContainer.style.width = `${LOG_PANEL_WIDTH}px`;
    this.logContainer.style.height = '100%';
    this.logContainer.style.backgroundColor = COLORS.logBg;
    this.logContainer.style.display = 'flex';
    this.logContainer.style.flexDirection = 'column';
    this.logContainer.style.borderLeft = `1px solid ${COLORS.bgSecondary}`;
    this.logContainer.style.zIndex = '10';
    this.container.appendChild(this.logContainer);

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '16px';
    header.style.borderBottom = `1px solid ${COLORS.bgSecondary}`;

    const title = document.createElement('div');
    title.textContent = '对战日志';
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    title.style.color = COLORS.white;
    header.appendChild(title);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '✕';
    clearBtn.style.width = '32px';
    clearBtn.style.height = '32px';
    clearBtn.style.borderRadius = '50%';
    clearBtn.style.backgroundColor = COLORS.danger;
    clearBtn.style.color = COLORS.white;
    clearBtn.style.border = 'none';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.fontSize = '14px';
    clearBtn.style.fontWeight = 'bold';
    clearBtn.style.transition = 'transform 0.2s ease-out';
    clearBtn.addEventListener('mouseenter', () => {
      clearBtn.style.transform = 'scale(1.1)';
    });
    clearBtn.addEventListener('mouseleave', () => {
      clearBtn.style.transform = 'scale(1)';
    });
    clearBtn.addEventListener('click', () => {
      this.engine.clearBattleLog();
    });
    header.appendChild(clearBtn);

    this.logContainer.appendChild(header);

    this.logList = document.createElement('div');
    this.logList.style.flex = '1';
    this.logList.style.overflowY = 'auto';
    this.logList.style.padding = '8px';
    this.logList.style.display = 'flex';
    this.logList.style.flexDirection = 'column';
    this.logList.style.gap = '4px';
    this.logList.style.scrollBehavior = 'smooth';
    this.logContainer.appendChild(this.logList);

    this.updateLogPanel();
  }

  private updateLogPanel(): void {
    if (!this.logList) return;
    this.logList.innerHTML = '';

    for (const entry of this.state.battleLog) {
      const item = document.createElement('div');
      item.style.height = '32px';
      item.style.minHeight = '32px';
      item.style.padding = '6px 10px';
      item.style.boxSizing = 'border-box';
      item.style.backgroundColor = entry.actor === 'player' ? '#1E3A5F30' : entry.actor === 'ai' ? '#5F1E3A30' : '#33415530';
      item.style.borderRadius = '6px';
      item.style.fontSize = '12px';
      item.style.lineHeight = '1.4';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.justifyContent = 'center';

      const top = document.createElement('div');
      top.style.display = 'flex';
      top.style.justifyContent = 'space-between';
      top.style.alignItems = 'center';

      const actor = document.createElement('span');
      actor.style.fontWeight = 'bold';
      actor.style.color = entry.actor === 'player' ? COLORS.primary : entry.actor === 'ai' ? '#EC4899' : COLORS.textDim;
      actor.textContent = entry.actor === 'player' ? '玩家' : entry.actor === 'ai' ? 'AI' : '系统';
      top.appendChild(actor);

      const time = document.createElement('span');
      time.style.fontSize = '10px';
      time.style.color = COLORS.textDim;
      time.textContent = entry.timestamp;
      top.appendChild(time);

      item.appendChild(top);

      const bottom = document.createElement('div');
      bottom.style.marginTop = '2px';
      bottom.style.whiteSpace = 'nowrap';
      bottom.style.overflow = 'hidden';
      bottom.style.textOverflow = 'ellipsis';

      const action = document.createElement('span');
      action.style.color = COLORS.accent;
      action.style.fontSize = '11px';
      action.textContent = `[${entry.action}] `;
      bottom.appendChild(action);

      const detail = document.createElement('span');
      detail.style.color = COLORS.text;
      detail.textContent = entry.details;
      bottom.appendChild(detail);

      item.appendChild(bottom);
      this.logList.appendChild(item);
    }

    setTimeout(() => {
      if (this.logList) {
        this.logList.scrollTop = this.logList.scrollHeight;
      }
    }, 0);
  }

  private startBattle(): void {
    if (this.deckBuildUI.selectedCardIds.length !== 15) return;
    this.engine.startBattle([...this.deckBuildUI.selectedCardIds]);
  }

  private renderBattlePhase(): void {
    if (!this.canvas) {
      this.createBattleUI();
    }
    this.updateBattleUI();
    this.updatePlayButton();
  }

  private createBattleUI(): void {
    this.cleanupDeckBuildUI();

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.backgroundColor = COLORS.bg;
    this.canvas.style.cursor = 'pointer';
    this.resize();
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    this.playButton = document.createElement('div');
    this.playButton.style.position = 'absolute';
    this.playButton.style.width = '200px';
    this.playButton.style.height = '60px';
    this.playButton.style.borderRadius = '30px';
    this.playButton.style.background = `linear-gradient(135deg, ${COLORS.purpleGradient1}, ${COLORS.purpleGradient2})`;
    this.playButton.style.display = 'flex';
    this.playButton.style.alignItems = 'center';
    this.playButton.style.justifyContent = 'center';
    this.playButton.style.color = COLORS.white;
    this.playButton.style.fontSize = '20px';
    this.playButton.style.fontWeight = 'bold';
    this.playButton.style.cursor = 'pointer';
    this.playButton.style.transition = 'all 0.2s ease-out';
    this.playButton.style.zIndex = '20';
    this.playButton.style.userSelect = 'none';
    this.playButton.textContent = '出牌';

    this.playButton.addEventListener('mouseenter', () => {
      this.battleUI.buttonHovered = true;
      if (this.state.currentTurn === 'player') {
        this.playButton!.style.transform = 'translateX(5px)';
        this.playButton!.style.boxShadow = `0 0 30px ${COLORS.purple}80`;
      }
    });
    this.playButton.addEventListener('mouseleave', () => {
      this.battleUI.buttonHovered = false;
      this.playButton!.style.transform = 'translateX(0)';
      this.playButton!.style.boxShadow = 'none';
    });
    this.playButton.addEventListener('click', () => {
      if (this.state.phase !== 'battle' || this.state.currentTurn !== 'player') return;
      if (this.state.selectedCardId) {
        this.engine.playSelectedCard();
      } else {
        this.engine.endPlayerTurn();
      }
    });

    this.container.appendChild(this.playButton);
    this.updatePlayButtonPosition();

    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove);
    this.canvas.addEventListener('mouseleave', () => {
      this.battleUI.hoveredHandCardId = null;
      this.scheduleRender();
    });

    this.createLogPanel();
    this.createOverlayContainer();
  }

  private updatePlayButtonPosition(): void {
    if (!this.playButton || !this.canvas) return;
    const x = this.canvas.width / 2 - 100;
    const y = this.canvas.height - HAND_AREA_HEIGHT - 80;
    this.playButton.style.left = `${x}px`;
    this.playButton.style.top = `${y}px`;
  }

  private updatePlayButton(): void {
    if (!this.playButton) return;
    const hasSelection = !!this.state.selectedCardId;
    const isPlayerTurn = this.state.currentTurn === 'player' && this.state.phase === 'battle';

    this.playButton.textContent = hasSelection ? '出牌' : '结束回合';
    this.playButton.style.opacity = isPlayerTurn ? '1' : '0.5';
    this.playButton.style.cursor = isPlayerTurn ? 'pointer' : 'not-allowed';
    this.playButton.style.pointerEvents = isPlayerTurn ? 'auto' : 'none';

    if (hasSelection && isPlayerTurn) {
      this.playButton.style.border = `2px solid ${COLORS.accent}`;
    } else {
      this.playButton.style.border = '2px solid #A78BFA';
    }
  }

  private handleCanvasClick = (e: MouseEvent): void => {
    if (this.state.phase !== 'battle' || this.state.currentTurn !== 'player') return;

    const rect = this.canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handCards = this.state.playerHand;
    const cardW = CARD_WIDTH;
    const totalWidth = handCards.length * cardW + (handCards.length - 1) * 10;
    const startX = (this.canvas!.width - totalWidth) / 2;
    const baseCardY = this.canvas!.height - HAND_AREA_HEIGHT + 10;

    for (let i = 0; i < handCards.length; i++) {
      const card = handCards[i];
      const cx = startX + i * (cardW + 10);
      const isSelected = card.instanceId === this.state.selectedCardId;
      const isHovered = card.instanceId === this.battleUI.hoveredHandCardId;
      const isPlayerTurn = this.state.currentTurn === 'player';

      let offsetY = 0;
      let scale = 1;
      if (isSelected) {
        offsetY = -25;
        scale = 1.08;
      } else if (isHovered && isPlayerTurn) {
        offsetY = -15;
        scale = 1.05;
      }

      const scaledW = cardW * scale;
      const scaledH = CARD_HEIGHT * scale;
      const cardX = cx + (cardW - scaledW) / 2;
      const cardY = baseCardY + offsetY + (CARD_HEIGHT - scaledH) / 2;

      if (x >= cardX && x <= cardX + scaledW && y >= cardY && y <= cardY + scaledH) {
        if (this.state.selectedCardId === card.instanceId) {
          this.engine.selectCard(null);
        } else {
          this.engine.selectCard(card.instanceId);
        }
        return;
      }
    }
  };

  private handleCanvasMouseMove = (e: MouseEvent): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundId: string | null = null;
    const handCards = this.state.playerHand;
    const cardW = CARD_WIDTH;
    const totalWidth = handCards.length * cardW + (handCards.length - 1) * 10;
    const startX = (this.canvas.width - totalWidth) / 2;
    const baseCardY = this.canvas.height - HAND_AREA_HEIGHT + 10;
    const isPlayerTurn = this.state.currentTurn === 'player';

    for (let i = 0; i < handCards.length; i++) {
      const card = handCards[i];
      const cx = startX + i * (cardW + 10);
      const isSelected = card.instanceId === this.state.selectedCardId;
      const isHovered = card.instanceId === this.battleUI.hoveredHandCardId;

      let offsetY = 0;
      let scale = 1;
      if (isSelected) {
        offsetY = -25;
        scale = 1.08;
      } else if (isHovered && isPlayerTurn) {
        offsetY = -15;
        scale = 1.05;
      }

      const scaledW = cardW * scale;
      const scaledH = CARD_HEIGHT * scale;
      const cardX = cx + (cardW - scaledW) / 2;
      const cardY = baseCardY + offsetY + (CARD_HEIGHT - scaledH) / 2;

      if (x >= cardX && x <= cardX + scaledW && y >= cardY && y <= cardY + scaledH) {
        foundId = card.instanceId;
        break;
      }
    }

    if (foundId !== this.battleUI.hoveredHandCardId) {
      this.battleUI.hoveredHandCardId = foundId;
      this.scheduleRender();
    }
  };

  private updateBattleUI(): void {
    if (!this.canvas || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h);
    this.drawHero(ctx, this.state.aiHero, 'AI', w / 2, 60, true);
    this.drawHero(ctx, this.state.playerHero, '玩家', w / 2, h - HAND_AREA_HEIGHT - 80, false);
    this.drawManaCrystals(ctx, this.state.playerMana, this.state.playerMaxMana, 20, h - HAND_AREA_HEIGHT - 60);
    this.drawManaCrystals(ctx, this.state.aiMana, this.state.aiMaxMana, 20, 40);
    this.drawDeckInfo(ctx, w - 120, 40, this.state.aiDeckSize, 'AI牌库');
    this.drawDeckInfo(ctx, w - 120, h - HAND_AREA_HEIGHT - 60, this.state.playerDeckSize, '玩家牌库');
    this.drawHandCards(ctx, w, h);
    this.drawTurnIndicator(ctx, w, h);

    this.updatePlayButtonPosition();
    this.updateLogPanel();

    if (this.state.phase === 'game_over') {
      this.showEndGameOverlay();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, COLORS.bg);
    grad.addColorStop(0.5, '#0B1220');
    grad.addColorStop(1, COLORS.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = COLORS.primary + '30';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 10]);
    ctx.beginPath();
    ctx.moveTo(40, h / 2);
    ctx.lineTo(w - 40, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawHero(ctx: CanvasRenderingContext2D, hero: typeof this.state.playerHero, name: string, x: number, y: number, isTop: boolean): void {
    const radius = 50;

    const grad = ctx.createRadialGradient(x, y, 10, x, y, radius);
    grad.addColorStop(0, isTop ? '#EC4899' : COLORS.primary);
    grad.addColorStop(1, isTop ? '#831843' : '#1E3A8A');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isTop ? '#F472B6' : '#60A5FA';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isTop ? '🤖' : '🧙', x, y);

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(name, x, y + radius + 18);

    const barWidth = 160;
    const barHeight = 14;
    const barX = x - barWidth / 2;
    const barY = y + radius + 36;

    ctx.fillStyle = '#1F2937';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    const healthPct = Math.max(0, hero.health / hero.maxHealth);
    const healthGrad = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    healthGrad.addColorStop(0, '#F87171');
    healthGrad.addColorStop(1, COLORS.health);
    ctx.fillStyle = healthGrad;
    this.roundRect(ctx, barX, barY, barWidth * healthPct, barHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`❤ ${hero.health}/${hero.maxHealth}`, x, barY + barHeight / 2);

    ctx.fillStyle = '#1F2937';
    this.roundRect(ctx, barX, barY + barHeight + 4, barWidth, barHeight, 4);
    ctx.fill();

    const armorPct = Math.min(1, hero.armor / 20);
    const armorGrad = ctx.createLinearGradient(barX, barY + barHeight + 4, barX, barY + barHeight * 2 + 4);
    armorGrad.addColorStop(0, '#60A5FA');
    armorGrad.addColorStop(1, COLORS.primary);
    ctx.fillStyle = armorGrad;
    this.roundRect(ctx, barX, barY + barHeight + 4, barWidth * Math.max(0.05, armorPct), barHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`🛡 ${hero.armor}`, x, barY + barHeight + 4 + barHeight / 2);
  }

  private drawManaCrystals(ctx: CanvasRenderingContext2D, current: number, max: number, x: number, y: number): void {
    const crystalSize = 40;
    const spacing = 8;

    for (let i = 0; i < max; i++) {
      const cx = x + i * (crystalSize + spacing) + crystalSize / 2;
      const cy = y;
      const used = i >= current;

      ctx.beginPath();
      ctx.arc(cx, cy, crystalSize / 2, 0, Math.PI * 2);
      if (used) {
        ctx.fillStyle = COLORS.primary;
      } else {
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, crystalSize / 2);
        grad.addColorStop(0, '#FDE68A');
        grad.addColorStop(1, COLORS.accent);
        ctx.fillStyle = grad;
      }
      ctx.fill();

      ctx.strokeStyle = used ? '#1E40AF' : '#D97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (!used) {
        ctx.fillStyle = COLORS.white;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', cx, cy);
      }
    }

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`法力 ${current}/${max}`, x, y + crystalSize / 2 + 20);
  }

  private drawDeckInfo(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, label: string): void {
    ctx.fillStyle = COLORS.bgSecondary;
    this.roundRect(ctx, x - 40, y - 20, 100, 40, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.primary + '60';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📚 ${count}`, x + 10, y - 2);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px sans-serif';
    ctx.fillText(label, x + 10, y + 12);
  }

  private drawHandCards(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cards = this.state.playerHand;
    const cardW = CARD_WIDTH;
    const totalWidth = cards.length * cardW + (cards.length - 1) * 10;
    const startX = (w - totalWidth) / 2;
    const cardY = h - HAND_AREA_HEIGHT + 10;

    ctx.fillStyle = '#1E293B80';
    ctx.fillRect(0, h - HAND_AREA_HEIGHT, w, HAND_AREA_HEIGHT);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cx = startX + i * (cardW + 10);
      const isSelected = card.instanceId === this.state.selectedCardId;
      const isHovered = card.instanceId === this.battleUI.hoveredHandCardId;
      const canAfford = card.card.cost <= this.state.playerMana;
      const isPlayerTurn = this.state.currentTurn === 'player';

      let offsetY = 0;
      let scale = 1;
      if (isSelected) {
        offsetY = -25;
        scale = 1.08;
      } else if (isHovered && isPlayerTurn) {
        offsetY = -15;
        scale = 1.05;
      }

      ctx.save();
      ctx.translate(cx + cardW / 2, cardY + CARD_HEIGHT / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.translate(-cardW / 2, -CARD_HEIGHT / 2);

      this.drawBattleCard(ctx, card.card, cardW, CARD_HEIGHT, !canAfford || !isPlayerTurn, isSelected, isHovered);

      if ((isHovered || isSelected) && isPlayerTurn) {
        this.drawCardTooltip(ctx, card.card, cardW, CARD_HEIGHT);
      }

      ctx.restore();
    }
  }

  private drawBattleCard(ctx: CanvasRenderingContext2D, card: Card, w: number, h: number, disabled: boolean, selected: boolean, hovered: boolean = false): void {
    if (selected) {
      ctx.save();
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (hovered) {
      ctx.save();
      ctx.shadowColor = RARITY_COLORS[card.rarity];
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = -5;
    }

    this.roundRect(ctx, 0, 0, w, h, CARD_RADIUS);

    if (disabled) {
      ctx.fillStyle = '#374151';
      ctx.globalAlpha = 0.5;
    } else {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    if (selected) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 5;
    } else if (hovered) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
    } else {
      ctx.strokeStyle = RARITY_COLORS[card.rarity];
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    if (selected || hovered) {
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(22, 22, 18, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.accent;
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(card.cost), 22, 22);

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(card.name, w / 2, 58);

    const artY = 72;
    const artH = 90;
    const artGrad = ctx.createLinearGradient(12, artY, w - 12, artY + artH);
    artGrad.addColorStop(0, RARITY_COLORS[card.rarity] + '40');
    artGrad.addColorStop(1, RARITY_COLORS[card.rarity] + '10');
    ctx.fillStyle = artGrad;
    this.roundRect(ctx, 12, artY, w - 24, artH, 6);
    ctx.fill();

    ctx.font = '36px sans-serif';
    ctx.fillText(this.getCardEmoji(card), w / 2, artY + artH / 2);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const words = card.description.split('');
    let line = '';
    let lineY = 175;
    for (const ch of words) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > w - 28 && line.length > 0) {
        ctx.fillText(line, w / 2, lineY);
        line = ch;
        lineY += 14;
      } else {
        line = testLine;
      }
      if (lineY > 215) break;
    }
    if (lineY <= 215) {
      ctx.fillText(line, w / 2, lineY);
    }

    ctx.beginPath();
    ctx.arc(28, h - 26, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#991B1B';
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(card.attack), 28, h - 26);

    ctx.beginPath();
    ctx.arc(w - 28, h - 26, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#065F46';
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.fillText(String(card.health), w - 28, h - 26);
  }

  private drawCardTooltip(ctx: CanvasRenderingContext2D, card: Card, cardW: number, cardH: number): void {
    const tooltipW = cardW + 20;
    const tooltipH = 40;
    const tooltipX = -10;
    const tooltipY = cardH + 5;

    ctx.save();

    const bgGrad = ctx.createLinearGradient(tooltipX, tooltipY, tooltipX, tooltipY + tooltipH);
    bgGrad.addColorStop(0, '#1E293B');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    this.roundRect(ctx, tooltipX, tooltipY, tooltipW, tooltipH, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const midX = tooltipX + tooltipW / 2;
    const midY = tooltipY + tooltipH / 2;

    ctx.fillStyle = COLORS.accent;
    ctx.fillText(`💎 ${card.cost}`, midX - 50, midY);

    ctx.fillStyle = COLORS.health;
    ctx.fillText(`⚔ ${card.attack}`, midX, midY);

    ctx.fillStyle = COLORS.success;
    ctx.fillText(`❤ ${card.health}`, midX + 50, midY);

    ctx.restore();
  }

  private drawTurnIndicator(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.state.phase !== 'battle') return;
    const text = this.state.currentTurn === 'player' ? '玩家回合' : 'AI回合';
    const color = this.state.currentTurn === 'player' ? COLORS.primary : '#EC4899';

    ctx.fillStyle = color + '40';
    this.roundRect(ctx, w / 2 - 70, h / 2 - 20, 140, 40, 20);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private showEndGameOverlay(): void {
    if (this.endGameOverlay) return;
    if (!this.overlayContainer) return;

    this.overlayContainer.innerHTML = '';
    this.overlayContainer.style.display = 'flex';

    this.endGameOverlay = document.createElement('div');
    this.endGameOverlay.style.width = '320px';
    this.endGameOverlay.style.height = '200px';
    this.endGameOverlay.style.backgroundColor = COLORS.white;
    this.endGameOverlay.style.borderRadius = '24px';
    this.endGameOverlay.style.display = 'flex';
    this.endGameOverlay.style.flexDirection = 'column';
    this.endGameOverlay.style.alignItems = 'center';
    this.endGameOverlay.style.justifyContent = 'center';
    this.endGameOverlay.style.gap = '24px';

    const title = document.createElement('h2');
    title.textContent = this.state.winner === 'player' ? '🎉 胜利！' : '💀 失败';
    title.style.fontSize = '28px';
    title.style.margin = '0';
    title.style.color = this.state.winner === 'player' ? COLORS.success : COLORS.danger;
    this.endGameOverlay.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = this.state.winner === 'player' ? '你击败了AI对手！' : 'AI战胜了你...';
    subtitle.style.fontSize = '14px';
    subtitle.style.color = '#666';
    this.endGameOverlay.appendChild(subtitle);

    const btn = document.createElement('button');
    btn.textContent = '重新开始';
    btn.style.width = '160px';
    btn.style.height = '48px';
    btn.style.borderRadius = '24px';
    btn.style.backgroundColor = COLORS.success;
    btn.style.color = COLORS.white;
    btn.style.fontSize = '16px';
    btn.style.fontWeight = 'bold';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease-out';
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = `0 0 20px ${COLORS.success}80`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', () => {
      this.endGameOverlay = null;
      this.deckBuildUI.selectedCardIds = [];
      this.engine.resetGame();
      this.cleanupBattleUI();
      this.hideDetail();
    });
    this.endGameOverlay.appendChild(btn);

    this.overlayContainer.appendChild(this.endGameOverlay);
  }

  private updateUI(): void {
    if (this.state.phase === 'deck_building') {
      this.cleanupBattleUI();
      this.renderDeckBuildingPhase();
    } else {
      this.cleanupDeckBuildUI();
      if (this.endGameOverlay && this.state.phase !== 'game_over') {
        this.endGameOverlay = null;
        this.hideDetail();
      }
      this.renderBattlePhase();
    }
  }

  private cleanupDeckBuildUI(): void {
    if (this.deckBuildContainer) {
      this.deckBuildContainer.remove();
      this.deckBuildContainer = null;
    }
  }

  private cleanupBattleUI(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('click', this.handleCanvasClick);
      this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    if (this.playButton) {
      this.playButton.remove();
      this.playButton = null;
    }
    this.endGameOverlay = null;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.cleanupDeckBuildUI();
    this.cleanupBattleUI();
    if (this.logContainer) {
      this.logContainer.remove();
      this.logContainer = null;
      this.logList = null;
    }
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
  }
}
