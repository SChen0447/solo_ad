import { Card } from './card';
import { CardData, RARITY_COLORS } from './types';

export interface PlayerData {
  id: string;
  username: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  manaPerTurn: number;
}

export class Player {
  data: PlayerData;
  hand: Card[] = [];
  deck: CardData[] = [];
  maxHandSize: number = 7;
  isCurrentTurn: boolean = false;
  handFanCenterX: number = 0;
  handFanCenterY: number = 0;
  handFanRadius: number = 200;
  handFanSpread: number = 45;
  opponent: boolean = false;
  lastPlayedCards: CardData[] = [];

  constructor(data: PlayerData, isOpponent: boolean = false) {
    this.data = { ...data };
    this.opponent = isOpponent;
  }

  initDeck(collection: CardData[]) {
    this.deck = [...collection].sort(() => Math.random() - 0.5);
  }

  drawCard(count: number = 1): Card[] {
    const drawnCards: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= this.maxHandSize) break;
      if (this.deck.length === 0) break;

      const cardData = this.deck.pop();
      if (cardData) {
        const card = new Card(cardData);
        if (this.opponent) {
          card.isFlipped = true;
        }
        this.hand.push(card);
        drawnCards.push(card);
      }
    }
    this.layoutHand();
    return drawnCards;
  }

  playCard(card: Card): boolean {
    if (this.data.mana < card.data.cost) return false;
    if (!this.isCurrentTurn) return false;

    this.data.mana -= card.data.cost;
    const index = this.hand.indexOf(card);
    if (index > -1) {
      this.hand.splice(index, 1);
    }

    this.lastPlayedCards.unshift(card.data);
    if (this.lastPlayedCards.length > 5) {
      this.lastPlayedCards.pop();
    }

    this.layoutHand();
    return true;
  }

  startTurn() {
    this.isCurrentTurn = true;
    this.data.mana = Math.min(this.data.mana + this.data.manaPerTurn, this.data.maxMana);
    this.drawCard(1);
  }

  endTurn() {
    this.isCurrentTurn = false;
  }

  takeDamage(damage: number) {
    this.data.hp = Math.max(0, this.data.hp - damage);
  }

  layoutHand() {
    const cardCount = this.hand.length;
    if (cardCount === 0) return;

    const startAngle = -this.handFanSpread / 2;
    const angleStep = cardCount > 1 ? this.handFanSpread / (cardCount - 1) : 0;

    for (let i = 0; i < cardCount; i++) {
      const angle = startAngle + angleStep * i;
      const radAngle = (angle * Math.PI) / 180;

      const targetX = this.handFanCenterX + Math.sin(radAngle) * this.handFanRadius;
      const targetY = this.handFanCenterY - Math.cos(radAngle) * this.handFanRadius + 50;

      this.hand[i].targetX = targetX;
      this.hand[i].targetY = targetY;
      this.hand[i].targetRotation = angle;
    }
  }

  update(deltaTime: number) {
    for (const card of this.hand) {
      card.update(deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const card of this.hand) {
      card.render(ctx);
    }
  }

  renderUI(ctx: CanvasRenderingContext2D, x: number, y: number, isTop: boolean) {
    this.renderAvatar(ctx, x, y, isTop);
    this.renderMana(ctx, x + 80, y + (isTop ? 0 : 40));
  }

  private renderAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, isTop: boolean) {
    const radius = 40;

    ctx.strokeStyle = RARITY_COLORS[this.getLevelRarity()];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(x - 10, y - 10, 0, x, y, radius);
    gradient.addColorStop(0, '#4a4a6a');
    gradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.opponent ? '👹' : '🧙', x, y);

    const hpPercent = this.data.hp / this.data.maxHp;
    const hpBarWidth = 80;
    const hpBarHeight = 8;
    const hpBarX = x - hpBarWidth / 2;
    const hpBarY = isTop ? y + radius + 10 : y - radius - 20;

    ctx.fillStyle = '#333333';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    const hpColor = hpPercent > 0.5 ? '#66ff66' : hpPercent > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`${this.data.hp}/${this.data.maxHp}`, x, hpBarY + hpBarHeight / 2);

    ctx.fillStyle = '#cccccc';
    ctx.font = '14px Microsoft YaHei';
    ctx.fillText(this.data.username, x, isTop ? y - radius - 30 : y + radius + 30);

    ctx.fillStyle = RARITY_COLORS[this.getLevelRarity()];
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`Lv.${this.data.level}`, x, isTop ? y - radius - 15 : y + radius + 45);
  }

  private renderMana(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const manaCount = this.data.mana;
    const maxMana = this.data.maxMana;

    for (let i = 0; i < maxMana; i++) {
      const crystalX = x + i * 22;
      const crystalY = y;
      const filled = i < manaCount;

      ctx.fillStyle = filled ? '#4488ff' : '#333355';
      ctx.strokeStyle = filled ? '#66aaff' : '#555577';
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const angle = (j * Math.PI) / 2 + Math.PI / 4;
        const px = crystalX + Math.cos(angle) * 10;
        const py = crystalY + Math.sin(angle) * 10;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (filled) {
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${manaCount}/${maxMana}`, x + maxMana * 22 + 5, y + 5);
  }

  private getLevelRarity() {
    if (this.data.level >= 20) return 'legendary';
    if (this.data.level >= 10) return 'epic';
    if (this.data.level >= 5) return 'rare';
    return 'common';
  }

  getCardAtPoint(px: number, py: number): Card | null {
    for (let i = this.hand.length - 1; i >= 0; i--) {
      if (this.hand[i].containsPoint(px, py)) {
        return this.hand[i];
      }
    }
    return null;
  }

  getTopCardAtPoint(px: number, py: number): Card | null {
    let hoveredCard: Card | null = null;
    let highestIndex = -1;

    for (let i = 0; i < this.hand.length; i++) {
      if (this.hand[i].containsPoint(px, py) && i > highestIndex) {
        hoveredCard = this.hand[i];
        highestIndex = i;
      }
    }

    return hoveredCard;
  }

  setHandHover(card: Card | null) {
    for (const c of this.hand) {
      c.isHovered = c === card;
    }
  }
}
