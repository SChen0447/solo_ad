import Phaser from 'phaser';
import { Card, CardEffect } from '../entities/Card';
import { Player, INITIAL_HAND_SIZE, MAX_FIELD_SIZE } from '../entities/Player';
import { GAME_CONFIG } from '../main';

type GamePhase = 'player_turn' | 'ai_turn' | 'animating' | 'game_over';

interface CardSprite {
  container: Phaser.GameObjects.Container;
  card: Card;
  originalX: number;
  originalY: number;
  originalScale: number;
  isDragging: boolean;
  isOnField: boolean;
  isSelected: boolean;
}

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private ai!: Player;
  private gamePhase: GamePhase = 'player_turn';
  private turnNumber: number = 1;
  private selectedAttacker: Card | null = null;
  private cardSprites: Map<string, CardSprite> = new Map();
  private handSprites: CardSprite[] = [];
  private playerFieldSprites: CardSprite[] = [];
  private aiFieldSprites: CardSprite[] = [];
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private draggingCard: CardSprite | null = null;
  private messageText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private aiHealthBar!: Phaser.GameObjects.Graphics;
  private playerEnergyText!: Phaser.GameObjects.Text;
  private aiEnergyText!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private resultText!: Phaser.GameObjects.Text;
  private isAnimating: boolean = false;
  private playerHealthText!: Phaser.GameObjects.Text;
  private aiHealthText!: Phaser.GameObjects.Text;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.player = new Player('玩家', false);
    this.ai = new Player('AI', true);

    this.createBackground();
    this.createUI();
    this.createEndTurnButton();
    this.createGameOverPanel();

    this.player.drawCard(INITIAL_HAND_SIZE);
    this.ai.drawCard(INITIAL_HAND_SIZE);

    this.renderAll();

    this.showMessage('你的回合 - 拖拽卡牌到场地');

    this.input.on('drag', this.onDrag, this);
    this.input.on('dragend', this.onDragEnd, this);

    this.scale.on('resize', this.onResize, this);
  }

  private onResize(): void {
    this.renderAll();
  }

  private createBackground(): void {
    const { width, height } = this.scale;

    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a1a4e, 0x1a1a4e, 1);
    gradient.fillRect(0, 0, width, height);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.setDepth(0);
    }

    const centerY = height / 2;
    const line = this.add.graphics();
    line.lineStyle(2, 0x00e5ff, 0.5);
    line.beginPath();
    line.moveTo(0, centerY);
    line.lineTo(width, centerY);
    line.strokePath();

    const glow = this.add.graphics();
    glow.lineStyle(6, 0x00e5ff, 0.15);
    glow.beginPath();
    glow.moveTo(0, centerY);
    glow.lineTo(width, centerY);
    glow.strokePath();
  }

  private createUI(): void {
    const { width, height } = this.scale;

    this.messageText = this.add.text(width / 2, 30, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.messageText.setDepth(100);

    this.createPlayerInfo();
    this.createAIInfo();
  }

  private createPlayerInfo(): void {
    const { width, height } = this.scale;
    const x = 80;
    const y = height - 80;

    const avatarBg = this.add.circle(x, y, 40, 0x1a1a3e);
    avatarBg.setStrokeStyle(2, 0x00e5ff);

    const avatarIcon = this.add.text(x, y, 'P', {
      fontSize: '32px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const healthBarBg = this.add.graphics();
    healthBarBg.fillStyle(0x333333, 0.8);
    healthBarBg.fillRoundedRect(x - 40, y + 55, 80, 16, 8);

    this.playerHealthBar = this.add.graphics();

    this.playerHealthText = this.add.text(x, y + 63, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const energyBg = this.add.graphics();
    energyBg.fillStyle(0x333333, 0.8);
    energyBg.fillRoundedRect(x - 40, y + 78, 80, 18, 9);

    this.playerEnergyText = this.add.text(x, y + 87, '', {
      fontSize: '14px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.updatePlayerHealthBar();
  }

  private createAIInfo(): void {
    const { width } = this.scale;
    const x = width - 80;
    const y = 80;

    const avatarBg = this.add.circle(x, y, 40, 0x3e1a1a);
    avatarBg.setStrokeStyle(2, 0xff5722);

    const avatarIcon = this.add.text(x, y, 'AI', {
      fontSize: '24px',
      color: '#ff5722',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const healthBarBg = this.add.graphics();
    healthBarBg.fillStyle(0x333333, 0.8);
    healthBarBg.fillRoundedRect(x - 40, y + 55, 80, 16, 8);

    this.aiHealthBar = this.add.graphics();

    this.aiHealthText = this.add.text(x, y + 63, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const energyBg = this.add.graphics();
    energyBg.fillStyle(0x333333, 0.8);
    energyBg.fillRoundedRect(x - 40, y + 78, 80, 18, 9);

    this.aiEnergyText = this.add.text(x, y + 87, '', {
      fontSize: '14px',
      color: '#ff9800',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.updateAIHealthBar();
  }

  private updatePlayerHealthBar(): void {
    const { height } = this.scale;
    const x = 80;
    const y = height - 80;

    this.playerHealthBar.clear();
    this.playerHealthBar.fillStyle(0xe53935, 1);
    const healthPercent = Math.max(0, this.player.health / this.player.maxHealth);
    this.playerHealthBar.fillRoundedRect(x - 40, y + 55, 80 * healthPercent, 16, 8);

    this.playerHealthText.setText(`${this.player.health}/${this.player.maxHealth}`);

    this.playerEnergyText.setText(`${this.player.energy}/${this.player.maxEnergy}`);
  }

  private updateAIHealthBar(): void {
    const { width } = this.scale;
    const x = width - 80;
    const y = 80;

    this.aiHealthBar.clear();
    this.aiHealthBar.fillStyle(0xe53935, 1);
    const healthPercent = Math.max(0, this.ai.health / this.ai.maxHealth);
    this.aiHealthBar.fillRoundedRect(x - 40, y + 55, 80 * healthPercent, 16, 8);

    this.aiHealthText.setText(`${this.ai.health}/${this.ai.maxHealth}`);

    this.aiEnergyText.setText(`${this.ai.energy}/${this.ai.maxEnergy}`);
  }

  private createEndTurnButton(): void {
    const { width, height } = this.scale;
    const btnWidth = 160;
    const btnHeight = 50;
    const x = width / 2;
    const y = height - 40;

    this.endTurnButton = this.add.container(x, y);

    const btnBg = this.add.graphics();
    const gradientColors = [0xff9800, 0xff5722];
    btnBg.fillGradientStyle(
      gradientColors[0], gradientColors[0],
      gradientColors[1], gradientColors[1],
      1
    );
    btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const btnBorder = this.add.graphics();
    btnBorder.lineStyle(1, 0x00e5ff, 1);
    btnBorder.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const btnText = this.add.text(0, 0, '结束回合', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.endTurnButton.add([btnBg, btnBorder, btnText]);
    this.endTurnButton.setSize(btnWidth, btnHeight);
    this.endTurnButton.setInteractive(
      new Phaser.Geom.Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight),
      Phaser.Geom.Rectangle.Contains
    );

    this.endTurnButton.on('pointerover', () => {
      if (this.gamePhase === 'player_turn') {
        btnBg.clear();
        btnBg.fillGradientStyle(
          0xffb74d, 0xffb74d,
          0xff7043, 0xff7043,
          1
        );
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      }
    });

    this.endTurnButton.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillGradientStyle(
        gradientColors[0], gradientColors[0],
        gradientColors[1], gradientColors[1],
        1
      );
      btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    });

    this.endTurnButton.on('pointerdown', () => {
      if (this.gamePhase === 'player_turn' && !this.isAnimating) {
        this.endPlayerTurn();
      }
    });

    this.endTurnButton.setDepth(100);
  }

  private createGameOverPanel(): void {
    const { width, height } = this.scale;

    this.gameOverPanel = this.add.container(width / 2, height / 2);
    this.gameOverPanel.setVisible(false);
    this.gameOverPanel.setDepth(200);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0a2e, 0.95);
    panelBg.fillRoundedRect(-200, -120, 400, 240, 16);
    panelBg.lineStyle(2, 0x00e5ff, 1);
    panelBg.strokeRoundedRect(-200, -120, 400, 240, 16);

    this.resultText = this.add.text(0, -40, '', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const restartBtn = this.add.container(0, 50);
    const btnBg = this.add.graphics();
    btnBg.fillGradientStyle(0x4caf50, 0x4caf50, 0x2e7d32, 0x2e7d32, 1);
    btnBg.fillRoundedRect(-80, -25, 160, 50, 10);
    btnBg.lineStyle(1, 0x00e5ff, 1);
    btnBg.strokeRoundedRect(-80, -25, 160, 50, 10);

    const btnText = this.add.text(0, 0, '重新开始', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    restartBtn.add([btnBg, btnText]);
    restartBtn.setSize(160, 50);
    restartBtn.setInteractive(
      new Phaser.Geom.Rectangle(-80, -25, 160, 50),
      Phaser.Geom.Rectangle.Contains
    );

    restartBtn.on('pointerdown', () => {
      this.restartGame();
    });

    this.gameOverPanel.add([panelBg, this.resultText, restartBtn]);
  }

  private createCardSprite(card: Card, x: number, y: number, isOnField: boolean = false): CardSprite {
    const container = this.add.container(x, y);
    const width = isOnField ? GAME_CONFIG.fieldCardWidth : GAME_CONFIG.cardWidth;
    const height = isOnField ? GAME_CONFIG.fieldCardHeight : GAME_CONFIG.cardHeight;

    const cardBg = this.add.graphics();
    const color = card.getCardColor();
    cardBg.fillStyle(color, 1);
    cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);

    const cardBorder = this.add.graphics();
    cardBorder.lineStyle(1, 0x00e5ff, 1);
    cardBorder.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    const nameFontSize = isOnField ? '14px' : '16px';
    const nameY = -height / 2 + 20;
    const nameText = this.add.text(0, nameY, card.name, {
      fontSize: nameFontSize,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const costBg = this.add.circle(-width / 2 + 15, -height / 2 + 15, 14, 0x2196f3);
    costBg.setStrokeStyle(2, 0xffffff);
    const costText = this.add.text(-width / 2 + 15, -height / 2 + 15, card.cost.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const atkBg = this.add.circle(-width / 2 + 18, height / 2 - 18, 16, 0xff9800);
    atkBg.setStrokeStyle(2, 0xffffff);
    const atkText = this.add.text(-width / 2 + 18, height / 2 - 18, card.attack.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const hpBg = this.add.circle(width / 2 - 18, height / 2 - 18, 16, 0xe53935);
    hpBg.setStrokeStyle(2, 0xffffff);
    const hpText = this.add.text(width / 2 - 18, height / 2 - 18, card.health.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const sleepIcon = this.add.text(0, 0, '💤', {
      fontSize: '32px'
    }).setOrigin(0.5);
    sleepIcon.setVisible(false);
    sleepIcon.setName('sleepIcon');

    const attackIcon = this.add.text(0, -height / 2 - 10, '⚔️', {
      fontSize: '20px'
    }).setOrigin(0.5);
    attackIcon.setVisible(false);
    attackIcon.setName('attackIcon');

    const targetIcon = this.add.text(0, -height / 2 - 10, '🎯', {
      fontSize: '20px'
    }).setOrigin(0.5);
    targetIcon.setVisible(false);
    targetIcon.setName('targetIcon');

    const damageOverlay = this.add.graphics();
    damageOverlay.fillStyle(0xff0000, 0.6);
    damageOverlay.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    damageOverlay.setVisible(false);
    damageOverlay.setName('damageOverlay');

    container.add([
      cardBg, cardBorder, nameText,
      costBg, costText,
      atkBg, atkText,
      hpBg, hpText,
      sleepIcon, attackIcon, targetIcon,
      damageOverlay
    ]);

    container.setSize(width, height);
    container.setName(`card_${card.id}`);

    const cardSprite: CardSprite = {
      container,
      card,
      originalX: x,
      originalY: y,
      originalScale: 1,
      isDragging: false,
      isOnField,
      isSelected: false
    };

    card.sprite = container;
    this.cardSprites.set(card.id, cardSprite);

    return cardSprite;
  }

  private createCardBack(x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x455a64, 1);
    cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);

    const cardBorder = this.add.graphics();
    cardBorder.lineStyle(1, 0x00e5ff, 0.5);
    cardBorder.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    const pattern = this.add.text(0, 0, '?', {
      fontSize: '48px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([cardBg, cardBorder, pattern]);
    container.setSize(width, height);

    return container;
  }

  private renderAll(): void {
    this.clearCardSprites();
    this.renderHand();
    this.renderField();
    this.updatePlayerHealthBar();
    this.updateAIHealthBar();
  }

  private clearCardSprites(): void {
    for (const [id, sprite] of this.cardSprites) {
      sprite.container.destroy();
    }
    this.cardSprites.clear();
    this.handSprites = [];
    this.playerFieldSprites = [];
    this.aiFieldSprites = [];
  }

  private renderHand(): void {
    const { width, height } = this.scale;
    const hand = this.player.hand;
    const count = hand.length;
    const cardWidth = GAME_CONFIG.cardWidth;
    const cardHeight = GAME_CONFIG.cardHeight;
    const spacing = Math.min(cardWidth + 10, (width - 200) / Math.max(count, 1));
    const startX = width / 2 - ((count - 1) * spacing) / 2;
    const baseY = height - 130;
    const fanAngle = count > 1 ? 15 : 0;

    for (let i = 0; i < count; i++) {
      const card = hand[i];
      const x = startX + i * spacing;
      const offsetIndex = i - (count - 1) / 2;
      const angle = count > 1 ? fanAngle * offsetIndex / ((count - 1) / 2) : 0;
      const yOffset = Math.abs(angle) * 5;
      const y = baseY + yOffset;

      const cardSprite = this.createCardSprite(card, x, y, false);
      cardSprite.originalX = x;
      cardSprite.originalY = y;
      cardSprite.container.setRotation(angle * Math.PI / 180);
      cardSprite.container.setDepth(10 + i);

      cardSprite.container.setInteractive(
        new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
        Phaser.Geom.Rectangle.Contains
      );

      this.input.setDraggable(cardSprite.container);

      cardSprite.container.on('pointerover', () => {
        if (this.gamePhase === 'player_turn' && !cardSprite.isDragging && !this.isAnimating) {
          cardSprite.container.setScale(1.2);
          cardSprite.container.setY(cardSprite.originalY - 30);
          cardSprite.container.setDepth(50 + i);
        }
      });

      cardSprite.container.on('pointerout', () => {
        if (!cardSprite.isDragging) {
          cardSprite.container.setScale(1);
          cardSprite.container.setY(cardSprite.originalY);
          cardSprite.container.setDepth(10 + i);
        }
      });

      cardSprite.container.on('dragstart', () => {
        if (this.gamePhase === 'player_turn' && !this.isAnimating) {
          cardSprite.isDragging = true;
          this.draggingCard = cardSprite;
          cardSprite.container.setScale(1.1);
          cardSprite.container.setDepth(100);
        }
      });

      this.handSprites.push(cardSprite);
    }
  }

  private onDrag(pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container): void {
    const cardSprite = this.findCardSpriteByContainer(gameObject);
    if (!cardSprite || !cardSprite.isDragging) return;

    if (this.dragOffsetX === 0 && this.dragOffsetY === 0) {
      this.dragOffsetX = gameObject.x - pointer.x;
      this.dragOffsetY = gameObject.y - pointer.y;
    }

    gameObject.setX(pointer.x + this.dragOffsetX);
    gameObject.setY(pointer.y + this.dragOffsetY);
  }

  private onDragEnd(pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container): void {
    const cardSprite = this.findCardSpriteByContainer(gameObject);
    if (!cardSprite || !cardSprite.isDragging) return;

    cardSprite.isDragging = false;
    this.draggingCard = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    const { height } = this.scale;
    const playerFieldTop = height / 2 + 40;
    const playerFieldBottom = height / 2 + 200;

    const isInPlayerField = pointer.y > playerFieldTop && pointer.y < playerFieldBottom;

    if (isInPlayerField && this.gamePhase === 'player_turn') {
      this.tryPlayCard(cardSprite);
    } else {
      this.tweens.add({
        targets: gameObject,
        x: cardSprite.originalX,
        y: cardSprite.originalY,
        scale: 1,
        duration: 200,
        ease: 'Power2.Out'
      });
    }
  }

  private findCardSpriteByContainer(container: Phaser.GameObjects.Container): CardSprite | undefined {
    return Array.from(this.cardSprites.values()).find(cs => cs.container === container);
  }

  private tryPlayCard(cardSprite: CardSprite): void {
    const card = cardSprite.card;

    if (this.player.energy < card.cost) {
      this.showMessage('能量不足！');
      this.tweens.add({
        targets: cardSprite.container,
        x: cardSprite.originalX,
        y: cardSprite.originalY,
        scale: 1,
        duration: 200,
        ease: 'Power2.Out'
      });
      return;
    }

    if (this.player.field.length >= MAX_FIELD_SIZE) {
      this.showMessage('场地已满！');
      this.tweens.add({
        targets: cardSprite.container,
        x: cardSprite.originalX,
        y: cardSprite.originalY,
        scale: 1,
        duration: 200,
        ease: 'Power2.Out'
      });
      return;
    }

    const playedCard = this.player.playCard(card.id);
    if (!playedCard) {
      this.tweens.add({
        targets: cardSprite.container,
        x: cardSprite.originalX,
        y: cardSprite.originalY,
        scale: 1,
        duration: 200,
        ease: 'Power2.Out'
      });
      return;
    }

    this.isAnimating = true;
    const { width, height } = this.scale;
    const fieldY = height / 2 + 100;
    const fieldCount = this.player.field.length;
    const spacing = 130;
    const startX = width / 2 - ((MAX_FIELD_SIZE - 1) * spacing) / 2;
    const targetX = startX + (fieldCount - 1) * spacing;

    cardSprite.isOnField = true;
    cardSprite.container.removeInteractive();

    this.tweens.add({
      targets: cardSprite.container,
      x: targetX,
      y: fieldY,
      scale: 0.8,
      duration: 300,
      ease: 'Back.Out',
      onComplete: () => {
        this.isAnimating = false;
        this.playerFieldSprites.push(cardSprite);
        this.renderAll();
        this.updatePlayerHealthBar();
        this.setupFieldCardInteraction(cardSprite, true);
      }
    });
  }

  private renderField(): void {
    const { width, height } = this.scale;
    const spacing = 130;
    const startX = width / 2 - ((MAX_FIELD_SIZE - 1) * spacing) / 2;

    const playerFieldY = height / 2 + 100;
    for (let i = 0; i < this.player.field.length; i++) {
      const card = this.player.field[i];
      const x = startX + i * spacing;
      const cardSprite = this.createCardSprite(card, x, playerFieldY, true);
      cardSprite.originalX = x;
      cardSprite.originalY = playerFieldY;
      cardSprite.isOnField = true;
      cardSprite.container.setScale(0.85);
      cardSprite.container.setDepth(20 + i);
      this.playerFieldSprites.push(cardSprite);
      this.setupFieldCardInteraction(cardSprite, true);
      this.updateFieldCardStatus(cardSprite);
    }

    const aiFieldY = height / 2 - 100;
    for (let i = 0; i < this.ai.field.length; i++) {
      const card = this.ai.field[i];
      const x = startX + i * spacing;
      const cardSprite = this.createCardSprite(card, x, aiFieldY, true);
      cardSprite.originalX = x;
      cardSprite.originalY = aiFieldY;
      cardSprite.isOnField = true;
      cardSprite.container.setScale(0.85);
      cardSprite.container.setDepth(20 + i);
      this.aiFieldSprites.push(cardSprite);
      this.setupFieldCardInteraction(cardSprite, false);
      this.updateFieldCardStatus(cardSprite);
    }
  }

  private setupFieldCardInteraction(cardSprite: CardSprite, isPlayerCard: boolean): void {
    const { width: cardW, height: cardH } = cardSprite.container;
    const hitArea = new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH);
    cardSprite.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    if (isPlayerCard) {
      cardSprite.container.on('pointerdown', () => {
        if (this.gamePhase === 'player_turn' && !this.isAnimating) {
          this.selectAttacker(cardSprite);
        }
      });
    } else {
      cardSprite.container.on('pointerdown', () => {
        if (this.gamePhase === 'player_turn' && !this.isAnimating && this.selectedAttacker) {
          this.attackTarget(cardSprite);
        }
      });
    }
  }

  private updateFieldCardStatus(cardSprite: CardSprite): void {
    const sleepIcon = cardSprite.container.getByName('sleepIcon') as Phaser.GameObjects.Text;
    const attackIcon = cardSprite.container.getByName('attackIcon') as Phaser.GameObjects.Text;

    if (!cardSprite.card.canAttack || cardSprite.card.hasAttacked) {
      if (sleepIcon) sleepIcon.setVisible(true);
      if (attackIcon) attackIcon.setVisible(false);
    } else {
      if (sleepIcon) sleepIcon.setVisible(false);
    }

    if (cardSprite.isSelected && attackIcon) {
      attackIcon.setVisible(true);
    } else if (attackIcon) {
      attackIcon.setVisible(false);
    }
  }

  private selectAttacker(cardSprite: CardSprite): void {
    const card = cardSprite.card;
    if (!card.canAttack || card.hasAttacked) {
      this.showMessage('这个随从无法攻击');
      return;
    }

    for (const cs of this.playerFieldSprites) {
      cs.isSelected = false;
      this.updateFieldCardStatus(cs);
    }

    this.selectedAttacker = card;
    cardSprite.isSelected = true;
    this.updateFieldCardStatus(cardSprite);

    this.highlightEnemyTargets(true);
    this.showMessage('选择攻击目标');
  }

  private highlightEnemyTargets(highlight: boolean): void {
    for (const cs of this.aiFieldSprites) {
      const targetIcon = cs.container.getByName('targetIcon') as Phaser.GameObjects.Text;
      if (targetIcon) {
        targetIcon.setVisible(highlight);
      }
    }
  }

  private attackTarget(targetSprite: CardSprite): void {
    if (!this.selectedAttacker) return;

    const attacker = this.selectedAttacker;
    const target = targetSprite.card;

    const tauntCards = this.ai.getTauntCards();
    if (tauntCards.length > 0 && target.effect !== CardEffect.TAUNT) {
      this.showMessage('必须先攻击嘲讽随从！');
      return;
    }

    this.executeAttack(attacker, target, () => {
      this.selectedAttacker = null;
      this.highlightEnemyTargets(false);

      for (const cs of this.playerFieldSprites) {
        cs.isSelected = false;
        this.updateFieldCardStatus(cs);
      }

      this.checkGameOver();
    });
  }

  private executeAttack(attackerCard: Card, targetCard: Card, onComplete: () => void): void {
    this.isAnimating = true;

    const attackerSprite = this.cardSprites.get(attackerCard.id);
    const targetSprite = this.cardSprites.get(targetCard.id);

    if (!attackerSprite || !targetSprite) {
      this.isAnimating = false;
      onComplete();
      return;
    }

    attackerCard.hasAttacked = true;
    this.updateFieldCardStatus(attackerSprite);

    const originalX = attackerSprite.originalX;
    const originalY = attackerSprite.originalY;
    const targetX = targetSprite.container.x;
    const targetY = targetSprite.container.y;

    this.tweens.add({
      targets: attackerSprite.container,
      x: { from: originalX, to: targetX },
      y: { from: originalY, to: targetY - 20 },
      duration: 150,
      ease: 'Power2.In',
      onComplete: () => {
        this.tweens.add({
          targets: attackerSprite.container,
          alpha: { from: 1, to: 0.3 },
          duration: 50,
          yoyo: true,
          repeat: 1
        });

        const damageOverlay = targetSprite.container.getByName('damageOverlay') as Phaser.GameObjects.Graphics;
        if (damageOverlay) {
          damageOverlay.setVisible(true);
          this.tweens.add({
            targets: damageOverlay,
            alpha: { from: 0.6, to: 0 },
            duration: 150,
            onComplete: () => {
              damageOverlay.setVisible(false);
              damageOverlay.setAlpha(0.6);
            }
          });
        }

        this.tweens.add({
          targets: targetSprite.container,
          x: targetX + 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            targetSprite.container.setX(targetSprite.originalX);
          }
        });

        const attackerDead = attackerCard.takeDamage(targetCard.attack);
        const targetDead = targetCard.takeDamage(attackerCard.attack);

        this.updateCardDisplay(attackerSprite);
        this.updateCardDisplay(targetSprite);

        this.time.delayedCall(150, () => {
          this.tweens.add({
            targets: attackerSprite.container,
            x: originalX,
            y: originalY,
            duration: 100,
            ease: 'Power2.Out',
            onComplete: () => {
              if (targetDead) {
                this.destroyCardAnim(targetSprite, () => {
                  this.ai.removeCardFromField(targetCard.id);
                });
              }
              if (attackerDead) {
                this.destroyCardAnim(attackerSprite, () => {
                  this.player.removeCardFromField(attackerCard.id);
                });
              }

              this.time.delayedCall(Math.max(targetDead ? 400 : 0, attackerDead ? 400 : 0), () => {
                this.isAnimating = false;
                this.renderAll();
                onComplete();
              });
            }
          });
        });
      }
    });
  }

  private updateCardDisplay(cardSprite: CardSprite): void {
    const container = cardSprite.container;
    const hpText = container.list.find(c => {
      const txt = c as Phaser.GameObjects.Text;
      return txt.type === 'Text' && txt.x > 0 && txt.y > 0;
    }) as Phaser.GameObjects.Text | undefined;

    const hpBg = container.list.find(c => {
      const g = c as Phaser.GameObjects.Graphics;
      return g.type === 'Graphics' && g.x > 0 && g.y > 0;
    }) as Phaser.GameObjects.Graphics | undefined;
  }

  private destroyCardAnim(cardSprite: CardSprite, onComplete: () => void): void {
    this.createParticles(cardSprite.container.x, cardSprite.container.y);

    this.tweens.add({
      targets: cardSprite.container,
      scale: 0,
      alpha: 0,
      angle: 180,
      duration: 400,
      ease: 'Back.In',
      onComplete: () => {
        onComplete();
      }
    });
  }

  private createParticles(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 30;
      const size = 4 + Math.random() * 6;
      const particle = this.add.rectangle(
        x, y,
        size, size,
        0x00e5ff
      );
      particle.setAlpha(0.8);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Power2.Out',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private showMessage(msg: string): void {
    this.messageText.setText(msg);
  }

  private endPlayerTurn(): void {
    if (this.gamePhase !== 'player_turn') return;

    this.gamePhase = 'ai_turn';
    this.showMessage('AI回合...');
    this.selectedAttacker = null;
    this.highlightEnemyTargets(false);

    for (const cs of this.playerFieldSprites) {
      cs.isSelected = false;
      this.updateFieldCardStatus(cs);
    }

    this.time.delayedCall(500, () => {
      this.aiTurn();
    });
  }

  private aiTurn(): void {
    this.ai.startTurn();
    this.updateAIHealthBar();
    this.renderAll();

    this.time.delayedCall(500, () => {
      this.aiPlayCards();
    });
  }

  private aiPlayCards(): void {
    const playableCards = this.ai.hand
      .filter(c => c.cost <= this.ai.energy)
      .sort((a, b) => a.cost - b.cost);

    if (playableCards.length > 0 && this.ai.field.length < MAX_FIELD_SIZE) {
      const cardToPlay = playableCards[0];
      const playedCard = this.ai.playCard(cardToPlay.id);

      if (playedCard) {
        this.isAnimating = true;
        this.renderAll();

        const { width, height } = this.scale;
        const fieldY = height / 2 - 100;
        const fieldCount = this.ai.field.length;
        const spacing = 130;
        const startX = width / 2 - ((MAX_FIELD_SIZE - 1) * spacing) / 2;
        const targetX = startX + (fieldCount - 1) * spacing;

        const cardSprite = this.cardSprites.get(cardToPlay.id);
        if (cardSprite) {
          cardSprite.container.setY(50);
          cardSprite.container.setScale(0.5);
          cardSprite.container.setAlpha(0);

          this.tweens.add({
            targets: cardSprite.container,
            y: fieldY,
            scale: 0.85,
            alpha: 1,
            duration: 300,
            ease: 'Back.Out',
            onComplete: () => {
              this.isAnimating = false;
              this.updateAIHealthBar();

              this.time.delayedCall(300, () => {
                this.aiPlayCards();
              });
            }
          });
          return;
        }
      }
    }

    this.time.delayedCall(300, () => {
      this.aiAttack();
    });
  }

  private aiAttack(): void {
    const attackableCards = this.ai.getAttackableCards();

    if (attackableCards.length > 0) {
      const attackerCard = attackableCards[0];
      const playerTaunts = this.player.getTauntCards();

      let targetCard: Card | null = null;

      if (playerTaunts.length > 0) {
        targetCard = playerTaunts[0];
      } else if (this.player.field.length > 0) {
        const sortedField = [...this.player.field].sort((a, b) => a.health - b.health);
        targetCard = sortedField[0];
      }

      if (targetCard) {
        this.isAnimating = true;
        this.executeAIAttack(attackerCard, targetCard, () => {
          this.time.delayedCall(200, () => {
            this.aiAttack();
          });
        });
        return;
      } else {
        this.isAnimating = true;
        this.aiAttackPlayer(attackerCard, () => {
          if (this.checkGameOver()) return;
          this.time.delayedCall(200, () => {
            this.aiAttack();
          });
        });
        return;
      }
    }

    this.endAITurn();
  }

  private executeAIAttack(attackerCard: Card, targetCard: Card, onComplete: () => void): void {
    const attackerSprite = this.cardSprites.get(attackerCard.id);
    const targetSprite = this.cardSprites.get(targetCard.id);

    if (!attackerSprite || !targetSprite) {
      this.isAnimating = false;
      onComplete();
      return;
    }

    attackerCard.hasAttacked = true;
    this.updateFieldCardStatus(attackerSprite);

    const originalX = attackerSprite.originalX;
    const originalY = attackerSprite.originalY;
    const targetX = targetSprite.container.x;
    const targetY = targetSprite.container.y;

    this.tweens.add({
      targets: attackerSprite.container,
      x: { from: originalX, to: targetX },
      y: { from: originalY, to: targetY + 20 },
      duration: 150,
      ease: 'Power2.In',
      onComplete: () => {
        this.tweens.add({
          targets: attackerSprite.container,
          alpha: { from: 1, to: 0.3 },
          duration: 50,
          yoyo: true,
          repeat: 1
        });

        const damageOverlay = targetSprite.container.getByName('damageOverlay') as Phaser.GameObjects.Graphics;
        if (damageOverlay) {
          damageOverlay.setVisible(true);
          this.tweens.add({
            targets: damageOverlay,
            alpha: { from: 0.6, to: 0 },
            duration: 150,
            onComplete: () => {
              damageOverlay.setVisible(false);
              damageOverlay.setAlpha(0.6);
            }
          });
        }

        this.tweens.add({
          targets: targetSprite.container,
          x: targetX + 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            targetSprite.container.setX(targetSprite.originalX);
          }
        });

        const attackerDead = attackerCard.takeDamage(targetCard.attack);
        const targetDead = targetCard.takeDamage(attackerCard.attack);

        this.time.delayedCall(150, () => {
          this.tweens.add({
            targets: attackerSprite.container,
            x: originalX,
            y: originalY,
            duration: 100,
            ease: 'Power2.Out',
            onComplete: () => {
              if (targetDead) {
                this.destroyCardAnim(targetSprite, () => {
                  this.player.removeCardFromField(targetCard.id);
                });
              }
              if (attackerDead) {
                this.destroyCardAnim(attackerSprite, () => {
                  this.ai.removeCardFromField(attackerCard.id);
                });
              }

              this.time.delayedCall(Math.max(targetDead ? 400 : 0, attackerDead ? 400 : 0), () => {
                this.isAnimating = false;
                this.renderAll();
                this.updatePlayerHealthBar();
                this.updateAIHealthBar();
                onComplete();
              });
            }
          });
        });
      }
    });
  }

  private aiAttackPlayer(attackerCard: Card, onComplete: () => void): void {
    const attackerSprite = this.cardSprites.get(attackerCard.id);
    if (!attackerSprite) {
      this.isAnimating = false;
      onComplete();
      return;
    }

    attackerCard.hasAttacked = true;
    this.updateFieldCardStatus(attackerSprite);

    const { height } = this.scale;
    const targetY = height - 80;

    this.tweens.add({
      targets: attackerSprite.container,
      y: targetY - 50,
      duration: 200,
      ease: 'Power2.In',
      onComplete: () => {
        this.player.takeDamage(attackerCard.attack);
        this.updatePlayerHealthBar();

        this.cameras.main.shake(150, 0.005);

        this.tweens.add({
          targets: attackerSprite.container,
          y: attackerSprite.originalY,
          duration: 150,
          ease: 'Power2.Out',
          onComplete: () => {
            this.isAnimating = false;
            onComplete();
          }
        });
      }
    });
  }

  private endAITurn(): void {
    this.turnNumber++;
    this.gamePhase = 'player_turn';
    this.player.startTurn();
    this.updatePlayerHealthBar();
    this.renderAll();
    this.showMessage(`回合 ${this.turnNumber} - 你的回合`);
  }

  private checkGameOver(): boolean {
    if (this.player.health <= 0) {
      this.gamePhase = 'game_over';
      this.showGameOver(false);
      return true;
    }
    if (this.ai.health <= 0) {
      this.gamePhase = 'game_over';
      this.showGameOver(true);
      return true;
    }
    return false;
  }

  private showGameOver(playerWon: boolean): void {
    this.gameOverPanel.setVisible(true);
    this.resultText.setText(playerWon ? '胜利！' : '失败...');
    this.resultText.setColor(playerWon ? '#4caf50' : '#e53935');
  }

  private restartGame(): void {
    this.gameOverPanel.setVisible(false);
    this.player.reset();
    this.ai.reset();
    this.gamePhase = 'player_turn';
    this.turnNumber = 1;
    this.selectedAttacker = null;
    this.isAnimating = false;

    this.player.drawCard(INITIAL_HAND_SIZE);
    this.ai.drawCard(INITIAL_HAND_SIZE);

    this.renderAll();
    this.showMessage('你的回合 - 拖拽卡牌到场地');
  }

  update(time: number, delta: number): void {
  }
}
