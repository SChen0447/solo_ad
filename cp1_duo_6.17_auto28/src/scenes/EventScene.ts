import Phaser from 'phaser';
import { stationManager } from '../utils/StationManager';
import { GameEvent, EventOption, eventGenerator } from '../utils/EventGenerator';

export class EventScene extends Phaser.Scene {
  private eventData: GameEvent | null = null;
  private overlay!: Phaser.GameObjects.Graphics;
  private popupContainer!: Phaser.GameObjects.Container;
  private resultCard!: Phaser.GameObjects.Container;
  private onCloseCallback: (() => void) | null = null;

  constructor() {
    super('EventScene');
  }

  init(data: { event: GameEvent; onClose?: () => void }): void {
    this.eventData = data.event;
    this.onCloseCallback = data.onClose || null;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, width, height);
    this.overlay.setAlpha(0);

    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });

    this.popupContainer = this.add.container(width / 2, height / 2);
    this.popupContainer.setAlpha(0);
    this.popupContainer.setScale(0.8);

    const popupWidth = 600;
    const popupHeight = 400;

    const popupBg = this.add.graphics();
    popupBg.fillStyle(0x1a1a2e, 0.95);
    popupBg.lineStyle(2, 0x00D4FF, 0.8);
    popupBg.strokeRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 16);
    popupBg.fillRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 16);

    this.popupContainer.add(popupBg);

    if (this.eventData) {
      const iconBg = this.add.graphics();
      iconBg.fillStyle(Number(this.eventData.icon_color.replace('#', '0x')), 0.2);
      iconBg.fillCircle(-200, -50, 50);
      iconBg.lineStyle(3, Number(this.eventData.icon_color.replace('#', '0x')), 1);
      iconBg.strokeCircle(-200, -50, 50);
      this.popupContainer.add(iconBg);

      const iconEmoji = this.getEventIcon(this.eventData.type);
      const iconText = this.add.text(-200, -50, iconEmoji, {
        fontSize: '48px'
      }).setOrigin(0.5);
      this.popupContainer.add(iconText);

      const titleText = this.add.text(50, -120, this.eventData.title, {
        fontSize: '28px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#00D4FF',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.popupContainer.add(titleText);

      const descText = this.add.text(50, -60, this.eventData.description, {
        fontSize: '16px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ccccdd',
        wordWrap: { width: 250 }
      }).setOrigin(0, 0);
      this.popupContainer.add(descText);

      const optionsY = 40;
      const optionHeight = 50;
      const optionSpacing = 12;

      this.eventData.options.forEach((option, index) => {
        const y = optionsY + index * (optionHeight + optionSpacing);
        this.createOptionButton(option, index, -popupWidth / 2 + 30, y, popupWidth - 60, optionHeight);
      });
    }

    this.tweens.add({
      targets: this.popupContainer,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });

    this.resultCard = this.add.container(width / 2, height / 2);
    this.resultCard.setAlpha(0);
    this.resultCard.setScale(0.5);
    this.resultCard.setVisible(false);
  }

  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      disaster: '☄️',
      medical: '💊',
      research: '📡',
      malfunction: '⚠️',
      positive: '🚀'
    };
    return icons[type] || '❓';
  }

  private createOptionButton(
    option: EventOption,
    index: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const state = stationManager.getState();
    const canAfford = eventGenerator.canAffordOption(state!, option);

    const buttonBg = this.add.graphics();
    const buttonColor = canAfford ? 0x00D4FF : 0x666666;

    buttonBg.fillStyle(buttonColor, 0.2);
    buttonBg.lineStyle(2, buttonColor, 0.8);
    buttonBg.strokeRoundedRect(x, y, width, height, 8);
    buttonBg.fillRoundedRect(x, y, width, height, 8);

    const textX = x + 15;
    const optionText = this.add.text(textX, y + 10, option.text, {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: canAfford ? '#ffffff' : '#888888'
    }).setOrigin(0, 0);

    const costText = this.add.text(textX, y + 32, `消耗: ${eventGenerator.formatCostText(option.cost)}`, {
      fontSize: '12px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: canAfford ? '#FFD700' : '#666666'
    }).setOrigin(0, 0);

    const hitArea = this.add.zone(x, y, width, height).setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: canAfford });

    if (canAfford) {
      hitArea.on('pointerover', () => {
        buttonBg.clear();
        buttonBg.fillStyle(buttonColor, 0.4);
        buttonBg.lineStyle(2, buttonColor, 1);
        buttonBg.strokeRoundedRect(x, y, width, height, 8);
        buttonBg.fillRoundedRect(x, y, width, height, 8);
      });

      hitArea.on('pointerout', () => {
        buttonBg.clear();
        buttonBg.fillStyle(buttonColor, 0.2);
        buttonBg.lineStyle(2, buttonColor, 0.8);
        buttonBg.strokeRoundedRect(x, y, width, height, 8);
        buttonBg.fillRoundedRect(x, y, width, height, 8);
      });

      hitArea.on('pointerdown', () => {
        this.handleOptionSelect(index);
      });
    }

    this.popupContainer.add([buttonBg, optionText, costText, hitArea]);
  }

  private async handleOptionSelect(optionIndex: number): Promise<void> {
    if (!this.eventData) return;

    const result = await stationManager.handleEvent(this.eventData, optionIndex);

    this.tweens.add({
      targets: this.popupContainer,
      alpha: 0,
      scale: 0.8,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.popupContainer.setVisible(false);
        this.showResultCard(result?.result?.message || '处理完成');
      }
    });
  }

  private showResultCard(message: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.resultCard.removeAll();
    this.resultCard.setVisible(true);

    const cardWidth = 400;
    const cardHeight = 150;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1a1a2e, 0.95);
    cardBg.lineStyle(2, 0x00FF9D, 0.8);
    cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
    cardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);

    const checkIcon = this.add.text(0, -30, '✓', {
      fontSize: '48px',
      color: '#00FF9D'
    }).setOrigin(0.5);

    const messageText = this.add.text(0, 30, message, {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 350 }
    }).setOrigin(0.5);

    this.resultCard.add([cardBg, checkIcon, messageText]);
    this.resultCard.setPosition(width / 2, height / 2);

    this.tweens.add({
      targets: this.resultCard,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [this.resultCard, this.overlay],
        alpha: 0,
        scale: 0.8,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => {
          if (this.onCloseCallback) {
            this.onCloseCallback();
          }
          this.scene.stop();
        }
      });
    });
  }
}
