import Phaser from 'phaser';
import { BattleEngine } from './BattleEngine';
import {
  BattleState,
  BattleEvent,
  Card,
  CreatureOnBoard,
  RuneType,
  Rarity,
  ELEMENT_COLORS,
  RARITY_COLORS
} from './types';

const GRID_ROWS = 3;
const GRID_COLS = 3;

export class GameScene extends Phaser.Scene {
  private battleEngine!: BattleEngine;
  private battleState!: BattleState;
  private gridGroup!: Phaser.GameObjects.Group;
  private playerHeroGroup!: Phaser.GameObjects.Group;
  private enemyHeroGroup!: Phaser.GameObjects.Group;
  private creaturesGroup!: Phaser.GameObjects.Group;
  private particlesGroup!: Phaser.GameObjects.Group;
  private uiGroup!: Phaser.GameObjects.Group;
  
  private cellSize = 80;
  private cellGap = 8;
  
  private playerBattlefieldX = 0;
  private playerBattlefieldY = 0;
  private enemyBattlefieldX = 0;
  private enemyBattlefieldY = 0;
  
  private heroSizeScale = 1;
  
  private selectedCard: Card | null = null;
  private selectedCreature: CreatureOnBoard | null = null;
  private isPlayerTurn = true;
  
  private turnTimerEvent?: Phaser.Time.TimerEvent;
  
  private onStateChange?: (state: BattleState) => void;
  private onCardPlay?: (cardId: string, position?: { row: number; col: number }, isHero?: boolean) => void;
  private onCreatureAttack?: (creatureId: string, position?: { row: number; col: number }, isHero?: boolean) => void;
  private onEndTurn?: () => void;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { battleEngine: BattleEngine }) {
    this.battleEngine = data.battleEngine;
    this.battleState = this.battleEngine.getState();
    
    this.battleEngine.subscribe((state, events) => {
      this.battleState = state;
      this.handleBattleEvents(events);
      if (this.onStateChange) {
        this.onStateChange(state);
      }
    });
  }

  create() {
    this.calculateLayout();
    
    this.gridGroup = this.add.group();
    this.playerHeroGroup = this.add.group();
    this.enemyHeroGroup = this.add.group();
    this.creaturesGroup = this.add.group();
    this.particlesGroup = this.add.group();
    this.uiGroup = this.add.group();
    
    this.createBackground();
    this.createBattlefield();
    this.createHeroModels();
    this.createTurnTimer();
    this.createEndTurnButton();
    this.setupInputHandlers();
    this.startTurnTimer();
    
    this.updateBattlefield();
    
    this.cameras.main.setBackgroundColor('#1a0f1e');
    
    this.scale.on('resize', this.handleResize, this);
  }

  private calculateLayout() {
    const { width, height } = this.scale;
    
    const minDimension = Math.min(width, height);
    
    this.cellSize = Math.floor(minDimension * 0.1);
    this.cellSize = Math.max(50, Math.min(this.cellSize, 100));
    this.cellGap = Math.floor(this.cellSize * 0.1);
    
    this.heroSizeScale = this.cellSize / 80;
    
    const availableWidth = width * 0.7;
    const gridWidth = GRID_COLS * this.cellSize + (GRID_COLS - 1) * this.cellGap;
    
    if (gridWidth * 2 + 100 > availableWidth) {
      const scale = (availableWidth - 100) / (gridWidth * 2);
      this.cellSize = Math.floor(this.cellSize * scale);
      this.cellGap = Math.floor(this.cellSize * 0.1);
      this.heroSizeScale = this.cellSize / 80;
    }
    
    const totalGridWidth = GRID_COLS * this.cellSize + (GRID_COLS - 1) * this.cellGap;
    
    this.playerBattlefieldX = width * 0.25;
    this.playerBattlefieldY = height * 0.5;
    this.enemyBattlefieldX = width * 0.75;
    this.enemyBattlefieldY = height * 0.5;
    
    const maxGridY = height * 0.7;
    const minGridY = height * 0.25;
    const gridHeight = GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap;
    
    if (this.playerBattlefieldY + gridHeight / 2 > maxGridY) {
      this.playerBattlefieldY = maxGridY - gridHeight / 2;
      this.enemyBattlefieldY = maxGridY - gridHeight / 2;
    }
    if (this.playerBattlefieldY - gridHeight / 2 < minGridY) {
      this.playerBattlefieldY = minGridY + gridHeight / 2;
      this.enemyBattlefieldY = minGridY + gridHeight / 2;
    }
  }

  private handleResize() {
    this.calculateLayout();
    this.rebuildScene();
  }

  private rebuildScene() {
    this.gridGroup.clear(true);
    this.playerHeroGroup.clear(true);
    this.enemyHeroGroup.clear(true);
    this.creaturesGroup.clear(true);
    this.uiGroup.clear(true);
    this.particlesGroup.clear(true);
    
    this.createBackground();
    this.createBattlefield();
    this.createHeroModels();
    this.createTurnTimer();
    this.createEndTurnButton();
    this.setupInputHandlers();
    
    this.updateBattlefield();
    this.updateHeroUI();
  }

  private createBackground() {
    const { width, height } = this.scale;
    
    const bgGradient = this.add.graphics();
    bgGradient.fillGradientStyle(
      0x1a0f1e, 0x1a0f1e,
      0x0d0814, 0x0d0814,
      1
    );
    bgGradient.fillRect(0, 0, width, height);
    
    const runePatterns = ['✦', '◇', '○', '△', '☽'];
    const patternCount = Math.floor((width * height) / 20000);
    for (let i = 0; i < Math.min(patternCount, 30); i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const rune = runePatterns[Phaser.Math.Between(0, runePatterns.length - 1)];
      const size = Phaser.Math.Between(12, Math.floor(this.cellSize * 0.4));
      
      const text = this.add.text(x, y, rune, {
        fontFamily: 'Georgia',
        fontSize: `${size}px`,
        color: '#c9a847'
      });
      text.setAlpha(Phaser.Math.FloatBetween(0.05, 0.15));
      text.setOrigin(0.5);
    }
    
    const cornerSize = Math.floor(this.cellSize * 0.7);
    const cornerColor = 0xc9a847;
    const cornerPadding = Math.floor(this.cellSize * 0.2);
    
    const corners = [
      { x: cornerPadding, y: cornerPadding, angle: 0 },
      { x: width - cornerPadding, y: cornerPadding, angle: 90 },
      { x: width - cornerPadding, y: height - cornerPadding, angle: 180 },
      { x: cornerPadding, y: height - cornerPadding, angle: 270 }
    ];
    
    corners.forEach(corner => {
      const g = this.add.graphics();
      g.lineStyle(2, cornerColor, 0.6);
      g.beginPath();
      g.moveTo(corner.x - cornerSize / 3, corner.y);
      g.lineTo(corner.x, corner.y);
      g.lineTo(corner.x, corner.y + cornerSize / 3);
      g.strokePath();
    });
  }

  private createBattlefield() {
    this.createGrid(this.playerBattlefieldX, this.playerBattlefieldY, 'player');
    this.createGrid(this.enemyBattlefieldX, this.enemyBattlefieldY, 'enemy');
    
    const vsFontSize = Math.floor(this.cellSize * 0.6);
    const vsText = this.add.text(
      this.scale.width / 2,
      this.playerBattlefieldY,
      'VS',
      {
        fontFamily: 'Georgia',
        fontSize: `${vsFontSize}px`,
        color: '#c9a847',
        fontStyle: 'bold'
      }
    );
    vsText.setOrigin(0.5);
    vsText.setAlpha(0.8);
    this.uiGroup.add(vsText);
    
    const playerLabel = this.add.text(
      this.playerBattlefieldX,
      this.playerBattlefieldY - (GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap) / 2 - 30,
      '我方战场',
      {
        fontFamily: 'Georgia',
        fontSize: `${Math.floor(this.cellSize * 0.2)}px`,
        color: '#4a90d9',
        fontStyle: 'bold'
      }
    );
    playerLabel.setOrigin(0.5);
    this.uiGroup.add(playerLabel);
    
    const enemyLabel = this.add.text(
      this.enemyBattlefieldX,
      this.enemyBattlefieldY - (GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap) / 2 - 30,
      '敌方战场',
      {
        fontFamily: 'Georgia',
        fontSize: `${Math.floor(this.cellSize * 0.2)}px`,
        color: '#d94a4a',
        fontStyle: 'bold'
      }
    );
    enemyLabel.setOrigin(0.5);
    this.uiGroup.add(enemyLabel);
  }

  private createGrid(centerX: number, centerY: number, owner: 'player' | 'enemy') {
    const totalWidth = GRID_COLS * this.cellSize + (GRID_COLS - 1) * this.cellGap;
    const totalHeight = GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap;
    const startX = centerX - totalWidth / 2;
    const startY = centerY - totalHeight / 2;
    
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * (this.cellSize + this.cellGap);
        const y = startY + row * (this.cellSize + this.cellGap);
        
        const cellBg = this.add.rectangle(
          x + this.cellSize / 2,
          y + this.cellSize / 2,
          this.cellSize,
          this.cellSize,
          0x2c1a3a,
          0.6
        );
        cellBg.setStrokeStyle(2, 0xc9a847, 0.4);
        cellBg.setData('row', row);
        cellBg.setData('col', col);
        cellBg.setData('owner', owner);
        cellBg.setInteractive();
        
        this.gridGroup.add(cellBg);
      }
    }
  }

  private createHeroModels() {
    const { height } = this.scale;
    
    const heroXOffset = this.scale.width * 0.08;
    
    this.createHeroModel(
      heroXOffset,
      height * 0.5,
      'player'
    );
    
    this.createHeroModel(
      this.scale.width - heroXOffset,
      height * 0.5,
      'enemy'
    );
  }

  private createHeroModel(x: number, y: number, owner: 'player' | 'enemy') {
    const group = owner === 'player' ? this.playerHeroGroup : this.enemyHeroGroup;
    const state = this.battleState[owner];
    const scale = this.heroSizeScale;
    
    const bodyWidth = 70 * scale;
    const bodyHeight = 90 * scale;
    const headRadius = 25 * scale;
    
    const heroBody = this.add.graphics();
    heroBody.fillStyle(owner === 'player' ? 0x4a90d9 : 0xd94a4a, 0.9);
    heroBody.fillRoundedRect(x - bodyWidth / 2, y - bodyHeight / 2 + 20 * scale, bodyWidth, bodyHeight, 10 * scale);
    heroBody.lineStyle(3, 0xc9a847, 0.8);
    heroBody.strokeRoundedRect(x - bodyWidth / 2, y - bodyHeight / 2 + 20 * scale, bodyWidth, bodyHeight, 10 * scale);
    group.add(heroBody);
    
    const heroHead = this.add.circle(x, y - 45 * scale, headRadius, owner === 'player' ? 0xf0d5b0 : 0xf0b0b0);
    heroHead.setStrokeStyle(2, 0xc9a847, 0.8);
    group.add(heroHead);
    
    const eyeOffsetX = owner === 'player' ? 8 * scale : -8 * scale;
    const eyeY = y - 48 * scale;
    const eyeSize = 4 * scale;
    const leftEye = this.add.circle(x - 8 * scale + eyeOffsetX, eyeY, eyeSize, 0x333333);
    const rightEye = this.add.circle(x + 8 * scale + eyeOffsetX, eyeY, eyeSize, 0x333333);
    group.add(leftEye);
    group.add(rightEye);
    
    const crown = this.add.graphics();
    crown.fillStyle(0xc9a847, 1);
    crown.beginPath();
    crown.moveTo(x - 20 * scale, y - 65 * scale);
    crown.lineTo(x - 10 * scale, y - 80 * scale);
    crown.lineTo(x, y - 70 * scale);
    crown.lineTo(x + 10 * scale, y - 80 * scale);
    crown.lineTo(x + 20 * scale, y - 65 * scale);
    crown.closePath();
    crown.fillPath();
    group.add(crown);
    
    const healthBarWidth = 80 * scale;
    const healthBarHeight = 12 * scale;
    const healthBarY = y + 80 * scale;
    
    const healthBarBg = this.add.rectangle(x, healthBarY, healthBarWidth, healthBarHeight, 0x333333, 0.8);
    healthBarBg.setStrokeStyle(1, 0xc9a847, 0.5);
    group.add(healthBarBg);
    
    const healthBar = this.add.rectangle(x - healthBarWidth / 2 + 2, healthBarY, healthBarWidth - 4, healthBarHeight - 4, 0x22c55e, 1);
    healthBar.setOrigin(0, 0.5);
    healthBar.setData('type', 'health_bar');
    healthBar.setData('max_width', healthBarWidth - 4);
    group.add(healthBar);
    
    const healthFontSize = Math.floor(10 * scale);
    const healthText = this.add.text(x, healthBarY, `${state.hero.health}/${state.hero.max_health}`, {
      fontFamily: 'Georgia',
      fontSize: `${healthFontSize}px`,
      color: '#ffffff'
    });
    healthText.setOrigin(0.5);
    healthText.setData('type', 'health_text');
    group.add(healthText);
    
    const manaBarWidth = 80 * scale;
    const manaBarHeight = 10 * scale;
    const manaBarY = y + 100 * scale;
    
    const manaBarBg = this.add.rectangle(x, manaBarY, manaBarWidth, manaBarHeight, 0x333333, 0.8);
    manaBarBg.setStrokeStyle(1, 0x38bdf8, 0.5);
    group.add(manaBarBg);
    
    const manaBar = this.add.rectangle(x - manaBarWidth / 2 + 2, manaBarY, manaBarWidth - 4, manaBarHeight - 4, 0x38bdf8, 1);
    manaBar.setOrigin(0, 0.5);
    manaBar.setData('type', 'mana_bar');
    manaBar.setData('max_width', manaBarWidth - 4);
    group.add(manaBar);
    
    const manaFontSize = Math.floor(9 * scale);
    const manaText = this.add.text(x, manaBarY, `${state.hero.mana}/${state.hero.max_mana}`, {
      fontFamily: 'Georgia',
      fontSize: `${manaFontSize}px`,
      color: '#ffffff'
    });
    manaText.setOrigin(0.5);
    manaText.setData('type', 'mana_text');
    group.add(manaText);
    
    const nameFontSize = Math.floor(14 * scale);
    const heroName = this.add.text(x, y + 118 * scale, owner === 'player' ? '你' : '对手', {
      fontFamily: 'Georgia',
      fontSize: `${nameFontSize}px`,
      color: '#e8d5b7'
    });
    heroName.setOrigin(0.5);
    group.add(heroName);
    
    const runeFontSize = Math.floor(16 * scale);
    const runeIcons = this.add.text(x, y + 135 * scale, state.hero.runes.map(r => this.getRuneIcon(r)).join(' '), {
      fontFamily: 'Georgia',
      fontSize: `${runeFontSize}px`,
      color: '#c9a847'
    });
    runeIcons.setOrigin(0.5);
    runeIcons.setData('type', 'rune_icons');
    group.add(runeIcons);
  }

  private getRuneIcon(rune: RuneType): string {
    const icons: Record<RuneType, string> = {
      fire: '🔥',
      ice: '❄️',
      thunder: '⚡',
      shadow: '🌑',
      light: '✨',
      nature: '🌿'
    };
    return icons[rune] || '?';
  }

  private createTurnTimer() {
    const centerX = this.scale.width / 2;
    const centerY = Math.max(40, this.cellSize * 0.5);
    const radius = Math.floor(this.cellSize * 0.4);
    
    const timerBg = this.add.circle(centerX, centerY, radius, 0x1a0f1e, 0.9);
    timerBg.setStrokeStyle(3, 0xc9a847, 0.8);
    this.uiGroup.add(timerBg);
    
    const timerFontSize = Math.floor(this.cellSize * 0.3);
    const timerText = this.add.text(centerX, centerY, '15', {
      fontFamily: 'Georgia',
      fontSize: `${timerFontSize}px`,
      color: '#e8d5b7',
      fontStyle: 'bold'
    });
    timerText.setOrigin(0.5);
    timerText.setData('type', 'timer_text');
    this.uiGroup.add(timerText);
    
    const turnFontSize = Math.floor(this.cellSize * 0.2);
    const turnText = this.add.text(centerX, centerY + radius + 20, '你的回合', {
      fontFamily: 'Georgia',
      fontSize: `${turnFontSize}px`,
      color: '#c9a847'
    });
    turnText.setOrigin(0.5);
    turnText.setData('type', 'turn_text');
    this.uiGroup.add(turnText);
  }

  private createEndTurnButton() {
    const x = this.scale.width / 2;
    const y = this.scale.height - Math.max(40, this.cellSize * 0.6);
    
    const buttonWidth = Math.max(100, this.cellSize * 1.5);
    const buttonHeight = Math.max(35, this.cellSize * 0.5);
    
    const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0xc9a847, 0.9);
    button.setStrokeStyle(2, 0xf0d58d, 1);
    button.setInteractive({ useHandCursor: true });
    button.setData('type', 'end_turn_button');
    this.uiGroup.add(button);
    
    const buttonFontSize = Math.floor(this.cellSize * 0.22);
    const buttonText = this.add.text(x, y, '结束回合', {
      fontFamily: 'Georgia',
      fontSize: `${buttonFontSize}px`,
      color: '#1a0f1e',
      fontStyle: 'bold'
    });
    buttonText.setOrigin(0.5);
    this.uiGroup.add(buttonText);
    
    button.on('pointerover', () => {
      button.setFillStyle(0xf0d58d, 1);
      this.tweens.add({
        targets: button,
        scale: 1.05,
        duration: 300,
        ease: 'Sine.easeOut'
      });
    });
    
    button.on('pointerout', () => {
      button.setFillStyle(0xc9a847, 0.9);
      this.tweens.add({
        targets: button,
        scale: 1,
        duration: 300,
        ease: 'Sine.easeOut'
      });
    });
    
    button.on('pointerdown', () => {
      if (this.isPlayerTurn && this.battleState.phase === 'battle') {
        if (this.onEndTurn) {
          this.onEndTurn();
        }
      }
    });
  }

  private setupInputHandlers() {
    this.gridGroup.getChildren().forEach(cell => {
      const gameObject = cell as Phaser.GameObjects.Rectangle;
      
      gameObject.on('pointerover', () => {
        if (this.canInteract()) {
          gameObject.setStrokeStyle(3, 0xf0d58d, 1);
          gameObject.setFillStyle(0x3d244e, 0.8);
        }
      });
      
      gameObject.on('pointerout', () => {
        const highlight = gameObject.getData('highlight') as boolean;
        gameObject.setStrokeStyle(2, 0xc9a847, highlight ? 0.8 : 0.4);
        gameObject.setFillStyle(0x2c1a3a, highlight ? 0.9 : 0.6);
      });
      
      gameObject.on('pointerdown', () => {
        if (!this.canInteract()) return;
        
        const row = gameObject.getData('row') as number;
        const col = gameObject.getData('col') as number;
        const owner = gameObject.getData('owner') as 'player' | 'enemy';
        
        this.handleGridClick(row, col, owner);
      });
    });
  }

  private canInteract(): boolean {
    return this.isPlayerTurn && this.battleState.phase === 'battle';
  }

  private handleGridClick(row: number, col: number, owner: 'player' | 'enemy') {
    const state = this.battleState;
    
    if (this.selectedCard) {
      if (this.selectedCard.type === 'creature' && owner === 'player') {
        const cell = state.player.battlefield[row][col];
        if (!cell.creature && !cell.frozen) {
          if (this.onCardPlay) {
            this.onCardPlay(this.selectedCard.instance_id, { row, col });
          }
          this.selectedCard = null;
          this.clearGridHighlights();
        }
      } else if (this.selectedCard.type === 'spell' && owner === 'enemy') {
        if (this.onCardPlay) {
          this.onCardPlay(this.selectedCard.instance_id, { row, col });
        }
        this.selectedCard = null;
        this.clearGridHighlights();
      }
      return;
    }
    
    if (this.selectedCreature && owner === 'enemy') {
      const cell = state.enemy.battlefield[row][col];
      if (cell.creature) {
        if (this.onCreatureAttack) {
          this.onCreatureAttack(this.selectedCreature.instance_id, { row, col });
        }
        this.selectedCreature = null;
        this.clearGridHighlights();
      }
      return;
    }
    
    if (owner === 'player') {
      const cell = state.player.battlefield[row][col];
      if (cell.creature && cell.creature.can_attack && !cell.creature.frozen) {
        this.selectedCreature = cell.creature;
        this.highlightAttackTargets();
      }
    }
  }

  private highlightAttackTargets() {
    this.clearGridHighlights();
    
    this.gridGroup.getChildren().forEach(cell => {
      const gameObject = cell as Phaser.GameObjects.Rectangle;
      const owner = gameObject.getData('owner') as string;
      
      if (owner === 'enemy') {
        const row = gameObject.getData('row') as number;
        const col = gameObject.getData('col') as number;
        const creature = this.battleState.enemy.battlefield[row][col].creature;
        
        if (creature) {
          gameObject.setStrokeStyle(3, 0xef4444, 1);
          gameObject.setFillStyle(0x4a1c1c, 0.8);
          gameObject.setData('highlight', true);
        }
      }
    });
  }

  private clearGridHighlights() {
    this.gridGroup.getChildren().forEach(cell => {
      const gameObject = cell as Phaser.GameObjects.Rectangle;
      gameObject.setStrokeStyle(2, 0xc9a847, 0.4);
      gameObject.setFillStyle(0x2c1a3a, 0.6);
      gameObject.setData('highlight', false);
    });
  }

  private startTurnTimer() {
    if (this.turnTimerEvent) {
      this.turnTimerEvent.remove();
    }
    
    this.turnTimerEvent = this.time.addEvent({
      delay: 100,
      callback: () => {
        this.updateTimer();
      },
      loop: true
    });
  }

  private updateTimer() {
    const state = this.battleState;
    const timeLeft = Math.ceil(state.turn_time_left);
    
    const timerText = this.uiGroup.getChildren().find(
      child => child.getData('type') === 'timer_text'
    ) as Phaser.GameObjects.Text;
    
    if (timerText) {
      timerText.setText(timeLeft.toString());
      
      if (timeLeft <= 3) {
        timerText.setColor('#ef4444');
        const pulseScale = 1 + Math.sin(this.time.now * 0.01) * 0.1;
        timerText.setScale(pulseScale);
      } else {
        timerText.setColor('#e8d5b7');
        timerText.setScale(1);
      }
    }
    
    const turnText = this.uiGroup.getChildren().find(
      child => child.getData('type') === 'turn_text'
    ) as Phaser.GameObjects.Text;
    
    if (turnText) {
      turnText.setText(
        this.isPlayerTurn ? `回合 ${state.turn} - 你的回合` : `回合 ${state.turn} - 对手回合`
      );
    }
  }

  private handleBattleEvents(events: BattleEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'turn_start':
          this.onTurnStart(event);
          break;
        case 'turn_end':
          this.onTurnEnd(event);
          break;
        case 'card_drawn':
          this.onCardDrawn(event);
          break;
        case 'card_played':
          this.onCardPlayed(event);
          break;
        case 'creature_summoned':
          this.onCreatureSummoned(event);
          break;
        case 'creature_attacked':
          this.onCreatureAttacked(event);
          break;
        case 'creature_died':
          this.onCreatureDied(event);
          break;
        case 'hero_attacked':
          this.onHeroAttacked(event);
          break;
        case 'spell_cast':
          this.onSpellCast(event);
          break;
        case 'game_end':
          this.onGameEnd(event);
          break;
      }
    }
    
    this.updateBattlefield();
    this.updateHeroUI();
  }

  private onTurnStart(event: BattleEvent) {
    const player = event.data.player as 'player' | 'enemy';
    this.isPlayerTurn = player === 'player';
    
    this.gridGroup.getChildren().forEach(cell => {
      const gameObject = cell as Phaser.GameObjects.Rectangle;
      const owner = gameObject.getData('owner') as string;
      
      if (owner === player) {
        this.tweens.add({
          targets: gameObject,
          strokeAlpha: 1,
          duration: 500,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: 0
        });
      }
    });
  }

  private onTurnEnd(_event: BattleEvent) {
  }

  private onCardDrawn(_event: BattleEvent) {
  }

  private onCardPlayed(event: BattleEvent) {
    const card = event.data.card as Card;
    const player = event.data.player as 'player' | 'enemy';
    
    const x = player === 'player' ? this.playerBattlefieldX : this.enemyBattlefieldX;
    const y = player === 'player' 
      ? this.playerBattlefieldY + (GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap) / 2 + 20
      : this.enemyBattlefieldY - (GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap) / 2 - 20;
    
    this.createCardPlayEffect(x, y, card.element);
  }

  private onCreatureSummoned(event: BattleEvent) {
    const creature = event.data.creature as CreatureOnBoard;
    const position = event.data.position as { row: number; col: number };
    const player = event.data.player as 'player' | 'enemy';
    
    const pos = this.getGridCellPosition(position.row, position.col, player);
    
    this.spawnCreatureVisual(pos.x, pos.y, creature);
    this.createSummonParticles(pos.x, pos.y, creature.element);
  }

  private onCreatureAttacked(event: BattleEvent) {
    const attacker = event.data.attacker as CreatureOnBoard;
    const target = event.data.target as CreatureOnBoard;
    
    this.createAttackEffect(attacker, target);
  }

  private onCreatureDied(event: BattleEvent) {
    const creature = event.data.creature as CreatureOnBoard;
    
    this.createDeathEffect(creature);
  }

  private onHeroAttacked(event: BattleEvent) {
    const player = event.data.player as 'player' | 'enemy';
    const damage = event.data.damage as number;
    
    this.createHeroDamageEffect(player, damage);
    this.screenShake();
  }

  private onSpellCast(event: BattleEvent) {
    const card = event.data.card as Card;
    const player = event.data.player as 'player' | 'enemy';
    
    const x = player === 'player' ? this.playerBattlefieldX : this.enemyBattlefieldX;
    const y = player === 'player' ? this.playerBattlefieldY : this.enemyBattlefieldY;
    
    this.createSpellEffect(x, y, card.element);
  }

  private onGameEnd(_event: BattleEvent) {
    if (this.turnTimerEvent) {
      this.turnTimerEvent.remove();
    }
  }

  private getGridCellPosition(row: number, col: number, owner: 'player' | 'enemy'): { x: number; y: number } {
    const centerX = owner === 'player' ? this.playerBattlefieldX : this.enemyBattlefieldX;
    const centerY = owner === 'player' ? this.playerBattlefieldY : this.enemyBattlefieldY;
    
    const totalWidth = GRID_COLS * this.cellSize + (GRID_COLS - 1) * this.cellGap;
    const totalHeight = GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * this.cellGap;
    const startX = centerX - totalWidth / 2;
    const startY = centerY - totalHeight / 2;
    
    return {
      x: startX + col * (this.cellSize + this.cellGap) + this.cellSize / 2,
      y: startY + row * (this.cellSize + this.cellGap) + this.cellSize / 2
    };
  }

  private spawnCreatureVisual(x: number, y: number, creature: CreatureOnBoard) {
    const elementColor = Phaser.Display.Color.HexStringToColor(ELEMENT_COLORS[creature.element]).color;
    const rarityColor = Phaser.Display.Color.HexStringToColor(RARITY_COLORS[creature.rarity]).color;
    
    const creatureSize = this.cellSize * 0.7;
    
    const creatureSprite = this.add.graphics();
    
    creatureSprite.fillStyle(elementColor, 0.9);
    creatureSprite.fillRoundedRect(-creatureSize / 2, -creatureSize / 2, creatureSize, creatureSize, 8);
    
    creatureSprite.lineStyle(3, rarityColor, 1);
    creatureSprite.strokeRoundedRect(-creatureSize / 2, -creatureSize / 2, creatureSize, creatureSize, 8);
    
    const icon = this.getRuneIcon(creature.element);
    const iconFontSize = Math.floor(this.cellSize * 0.35);
    const iconText = this.add.text(0, -5, icon, {
      fontFamily: 'Georgia',
      fontSize: `${iconFontSize}px`
    });
    iconText.setOrigin(0.5);
    
    const nameFontSize = Math.floor(this.cellSize * 0.12);
    const nameText = this.add.text(0, creatureSize / 2 - 10, creature.name, {
      fontFamily: 'Georgia',
      fontSize: `${nameFontSize}px`,
      color: '#e8d5b7'
    });
    nameText.setOrigin(0.5);
    
    const statSize = Math.floor(this.cellSize * 0.2);
    const statOffset = creatureSize * 0.3;
    const statY = creatureSize / 2 + statSize + 5;
    
    const attackBg = this.add.circle(-statOffset, statY, statSize, 0x333333, 0.9);
    const attackFontSize = Math.floor(this.cellSize * 0.18);
    const attackText = this.add.text(-statOffset, statY, creature.attack.toString(), {
      fontFamily: 'Georgia',
      fontSize: `${attackFontSize}px`,
      color: '#fbbf24',
      fontStyle: 'bold'
    });
    attackText.setOrigin(0.5);
    
    const healthBg = this.add.circle(statOffset, statY, statSize, 0x333333, 0.9);
    const healthText = this.add.text(statOffset, statY, creature.health.toString(), {
      fontFamily: 'Georgia',
      fontSize: `${attackFontSize}px`,
      color: '#22c55e',
      fontStyle: 'bold'
    });
    healthText.setOrigin(0.5);
    
    const container = this.add.container(x, y, [
      creatureSprite,
      iconText,
      nameText,
      attackBg,
      attackText,
      healthBg,
      healthText
    ]);
    container.setData('instance_id', creature.instance_id);
    container.setData('creature', creature);
    container.setData('type', 'creature');
    
    this.creaturesGroup.add(container);
    
    creatureSprite.setAlpha(0);
    iconText.setAlpha(0);
    nameText.setAlpha(0);
    attackBg.setAlpha(0);
    attackText.setAlpha(0);
    healthBg.setAlpha(0);
    healthText.setAlpha(0);
    
    container.setScale(0.5);
    
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
    
    this.tweens.add({
      targets: [creatureSprite, iconText, nameText, attackBg, attackText, healthBg, healthText],
      alpha: 1,
      duration: 300,
      ease: 'Linear'
    });
  }

  private createCardPlayEffect(x: number, y: number, element: RuneType) {
    const color = ELEMENT_COLORS[element];
    const count = Math.floor(this.cellSize * 0.25);
    this.createParticles(x, y, color, count, 500);
  }

  private createSummonParticles(x: number, y: number, element: RuneType) {
    const color = ELEMENT_COLORS[element];
    const count = Math.floor(this.cellSize * 0.35);
    this.createParticles(x, y, color, count, 800);
  }

  private createSpellEffect(x: number, y: number, element: RuneType) {
    const color = ELEMENT_COLORS[element];
    const count = Math.floor(this.cellSize * 0.5);
    this.createParticles(x, y, color, count, 1000);
  }

  private createParticles(x: number, y: number, colorHex: string, count: number, duration: number) {
    const color = Phaser.Display.Color.HexStringToColor(colorHex);
    const minSize = Math.max(2, this.cellSize * 0.04);
    const maxSize = Math.max(5, this.cellSize * 0.1);
    const minDist = this.cellSize * 0.4;
    const maxDist = this.cellSize * 1.2;
    
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(minSize, maxSize);
      const particle = this.add.circle(x, y, size, color.color, 1);
      this.particlesGroup.add(particle);
      
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(minDist, maxDist);
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;
      
      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0,
        duration: duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private createAttackEffect(attacker: CreatureOnBoard, target: CreatureOnBoard) {
    const attackerPos = this.getCreaturePosition(attacker);
    const targetPos = this.getCreaturePosition(target);
    
    if (!attackerPos || !targetPos) return;
    
    const attackerVisual = this.findCreatureVisual(attacker.instance_id);
    if (attackerVisual) {
      this.tweens.add({
        targets: attackerVisual,
        x: targetPos.x,
        y: targetPos.y,
        duration: 200,
        ease: 'Cubic.easeIn',
        yoyo: true,
        hold: 100,
        onYoyo: () => {
          this.createHitEffect(targetPos.x, targetPos.y);
        }
      });
    }
  }

  private createHitEffect(x: number, y: number) {
    const hitRadius = this.cellSize * 0.4;
    const hitFlash = this.add.circle(x, y, hitRadius, 0xffffff, 0.8);
    this.particlesGroup.add(hitFlash);
    
    this.tweens.add({
      targets: hitFlash,
      alpha: 0,
      scale: 2,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        hitFlash.destroy();
      }
    });
    
    this.createParticles(x, y, '#fbbf24', Math.floor(this.cellSize * 0.2), 400);
  }

  private createDeathEffect(creature: CreatureOnBoard) {
    const pos = this.getCreaturePosition(creature);
    if (!pos) return;
    
    const creatureVisual = this.findCreatureVisual(creature.instance_id);
    if (creatureVisual) {
      this.tweens.add({
        targets: creatureVisual,
        alpha: 0,
        scale: 0.5,
        angle: 180,
        duration: 500,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          creatureVisual.destroy();
        }
      });
    }
    
    this.createParticles(pos.x, pos.y, '#ef4444', Math.floor(this.cellSize * 0.3), 600);
  }

  private createHeroDamageEffect(player: 'player' | 'enemy', damage: number) {
    const heroX = player === 'player' ? this.scale.width * 0.08 : this.scale.width * 0.92;
    const heroY = this.scale.height * 0.4;
    
    const damageFontSize = Math.floor(this.cellSize * 0.4);
    const damageText = this.add.text(heroX, heroY, `-${damage}`, {
      fontFamily: 'Georgia',
      fontSize: `${damageFontSize}px`,
      color: '#ef4444',
      fontStyle: 'bold'
    });
    damageText.setOrigin(0.5);
    damageText.setStroke('#ffffff', 2);
    
    this.tweens.add({
      targets: damageText,
      y: heroY - this.cellSize * 0.6,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        damageText.destroy();
      }
    });
    
    const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xef4444, 0.3);
    flash.setOrigin(0);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  private screenShake() {
    const camera = this.cameras.main;
    const shakeIntensity = Math.max(2, this.cellSize * 0.04);
    
    this.tweens.add({
      targets: camera,
      x: {
        getStart: () => camera.x,
        getEnd: () => camera.x + shakeIntensity
      },
      y: {
        getStart: () => camera.y,
        getEnd: () => camera.y - shakeIntensity * 0.7
      },
      duration: 50,
      yoyo: true,
      repeat: 1,
      ease: 'Linear',
      onComplete: () => {
        camera.x = 0;
        camera.y = 0;
      }
    });
  }

  private getCreaturePosition(creature: CreatureOnBoard): { x: number; y: number } | null {
    return this.getGridCellPosition(creature.position.row, creature.position.col, creature.owner);
  }

  private findCreatureVisual(instanceId: string): Phaser.GameObjects.Container | null {
    const children = this.creaturesGroup.getChildren();
    for (const child of children) {
      if (child.getData('instance_id') === instanceId) {
        return child as Phaser.GameObjects.Container;
      }
    }
    return null;
  }

  private updateBattlefield() {
    const toRemove: string[] = [];
    
    const existingCreatures = new Set<string>();
    this.creaturesGroup.getChildren().forEach(child => {
      const id = child.getData('instance_id') as string;
      existingCreatures.add(id);
    });
    
    const livingCreatures = new Set<string>();
    
    for (const owner of ['player', 'enemy'] as const) {
      const battlefield = this.battleState[owner].battlefield;
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const cell = battlefield[row][col];
          if (cell.creature) {
            livingCreatures.add(cell.creature.instance_id);
          }
        }
      }
    }
    
    existingCreatures.forEach(id => {
      if (!livingCreatures.has(id)) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => {
      const visual = this.findCreatureVisual(id);
      if (visual) {
        visual.destroy();
      }
    });
    
    for (const owner of ['player', 'enemy'] as const) {
      const battlefield = this.battleState[owner].battlefield;
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const cell = battlefield[row][col];
          if (cell.creature && !existingCreatures.has(cell.creature.instance_id)) {
            const pos = this.getGridCellPosition(row, col, owner);
            this.spawnCreatureVisual(pos.x, pos.y, cell.creature);
          }
        }
      }
    }
  }

  private updateHeroUI() {
    this.updateHeroBars('player');
    this.updateHeroBars('enemy');
  }

  private updateHeroBars(owner: 'player' | 'enemy') {
    const group = owner === 'player' ? this.playerHeroGroup : this.enemyHeroGroup;
    const state = this.battleState[owner];
    
    group.getChildren().forEach(child => {
      const type = child.getData('type');
      
      if (type === 'health_bar') {
        const bar = child as Phaser.GameObjects.Rectangle;
        const maxWidth = child.getData('max_width') as number;
        const healthPercent = state.hero.health / state.hero.max_health;
        bar.width = maxWidth * healthPercent;
        
        let color: number;
        if (healthPercent > 0.6) {
          color = 0x22c55e;
        } else if (healthPercent > 0.3) {
          color = 0xfacc15;
        } else {
          color = 0xef4444;
        }
        bar.setFillStyle(color, 1);
      }
      
      if (type === 'health_text') {
        const text = child as Phaser.GameObjects.Text;
        text.setText(`${Math.ceil(state.hero.health)}/${state.hero.max_health}`);
      }
      
      if (type === 'mana_bar') {
        const bar = child as Phaser.GameObjects.Rectangle;
        const maxWidth = child.getData('max_width') as number;
        const manaPercent = state.hero.max_mana > 0 ? state.hero.mana / state.hero.max_mana : 0;
        bar.width = maxWidth * manaPercent;
      }
      
      if (type === 'mana_text') {
        const text = child as Phaser.GameObjects.Text;
        text.setText(`${state.hero.mana}/${state.hero.max_mana}`);
      }
      
      if (type === 'rune_icons') {
        const text = child as Phaser.GameObjects.Text;
        text.setText(state.hero.runes.map(r => this.getRuneIcon(r)).join(' '));
      }
    });
  }

  public playCard(cardInstanceId: string) {
    if (!this.isPlayerTurn) return;
    
    const card = this.battleState.player.hand.find(c => c.instance_id === cardInstanceId);
    if (!card) return;
    
    if (this.battleState.player.hero.mana < card.cost) return;
    
    this.selectedCard = card;
    
    if (card.type === 'creature') {
      this.highlightPlayerEmptyCells();
    } else if (card.type === 'spell') {
      this.highlightEnemyTargets();
    }
  }

  private highlightPlayerEmptyCells() {
    this.clearGridHighlights();
    
    this.gridGroup.getChildren().forEach(cell => {
      const gameObject = cell as Phaser.GameObjects.Rectangle;
      const owner = gameObject.getData('owner') as string;
      const row = gameObject.getData('row') as number;
      const col = gameObject.getData('col') as number;
      
      if (owner === 'player') {
        const cellData = this.battleState.player.battlefield[row][col];
        if (!cellData.creature && !cellData.frozen) {
          gameObject.setStrokeStyle(3, 0x22c55e, 1);
          gameObject.setFillStyle(0x1c3d2e, 0.8);
          gameObject.setData('highlight', true);
        }
      }
    });
  }

  private highlightEnemyTargets() {
    this.clearGridHighlights();
    
    this.gridGroup.getChildren().forEach(cell => {
      const gameObject = cell as Phaser.GameObjects.Rectangle;
      const owner = gameObject.getData('owner') as string;
      
      if (owner === 'enemy') {
        const row = gameObject.getData('row') as number;
        const col = gameObject.getData('col') as number;
        const creature = this.battleState.enemy.battlefield[row][col].creature;
        
        if (creature) {
          gameObject.setStrokeStyle(3, 0xef4444, 1);
          gameObject.setFillStyle(0x3d1c1c, 0.8);
          gameObject.setData('highlight', true);
        }
      }
    });
  }

  public cancelSelection() {
    this.selectedCard = null;
    this.selectedCreature = null;
    this.clearGridHighlights();
  }

  public setOnStateChange(callback: (state: BattleState) => void) {
    this.onStateChange = callback;
  }

  public setOnCardPlay(callback: (cardId: string, position?: { row: number; col: number }, isHero?: boolean) => void) {
    this.onCardPlay = callback;
  }

  public setOnCreatureAttack(callback: (creatureId: string, position?: { row: number; col: number }, isHero?: boolean) => void) {
    this.onCreatureAttack = callback;
  }

  public setOnEndTurn(callback: () => void) {
    this.onEndTurn = callback;
  }

  public update() {
  }

  public destroyScene() {
    if (this.turnTimerEvent) {
      this.turnTimerEvent.remove();
    }
    
    this.scale.off('resize', this.handleResize, this);
    
    this.gridGroup.clear(true);
    this.playerHeroGroup.clear(true);
    this.enemyHeroGroup.clear(true);
    this.creaturesGroup.clear(true);
    this.particlesGroup.clear(true);
    this.uiGroup.clear(true);
  }
}

export default GameScene;
