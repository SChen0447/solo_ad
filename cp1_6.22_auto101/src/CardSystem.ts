import type { Card, Position, HighlightCell, Player, Monster } from './types';
import type { GameBoard } from './GameBoard';

const CARD_WIDTH = 72;
const CARD_HEIGHT = 100;
const CARD_RADIUS = 8;
const HAND_GAP = 16;
const DRAW_PER_TURN = 2;
const HAND_LIMIT = 5;
const DISCARD_RESHOVE_THRESHOLD = 10;

interface DraggedCard {
  card: Card;
  handIndex: number;
  offsetX: number;
  offsetY: number;
  screenX: number;
  screenY: number;
}

interface CardAnimation {
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
  type: 'draw' | 'discard' | 'play';
}

export class CardSystem {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  deck: Card[] = [];
  hand: Card[] = [];
  discard: Card[] = [];
  hoveredIndex: number = -1;
  draggedCard: DraggedCard | null = null;
  selectedCard: Card | null = null;
  targetGrid: Position | null = null;
  animations: CardAnimation[] = [];
  energy: number = 3;
  maxEnergy: number = 3;
  gameBoard: GameBoard;
  onCardPlayed?: (card: Card, target: Position | null) => void;
  private cardUidCounter: number = 0;

  constructor(canvas: HTMLCanvasElement, gameBoard: GameBoard) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.gameBoard = gameBoard;
  }

  loadCards(cardData: { cards: Card[] }): void {
    this.deck = cardData.cards.map((c: Card) => ({
      ...c,
      uid: `card_${this.cardUidCounter++}_${c.id}`,
    }));
    this.shuffleDeck();
    this.hand = [];
    this.discard = [];
    this.energy = this.maxEnergy;
    this.initialDraw();
  }

  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  private initialDraw(): void {
    for (let i = 0; i < 5; i++) {
      this.drawSingleCard(true);
    }
  }

  startTurn(): void {
    this.energy = this.maxEnergy;
    for (let i = 0; i < DRAW_PER_TURN; i++) {
      if (this.hand.length >= HAND_LIMIT) break;
      this.drawSingleCard();
    }
  }

  drawSingleCard(instant: boolean = false): Card | null {
    if (this.hand.length >= HAND_LIMIT) return null;
    if (this.deck.length === 0) {
      if (this.discard.length < DISCARD_RESHOVE_THRESHOLD) return null;
      this.deck = this.discard;
      this.discard = [];
      this.shuffleDeck();
    }
    const card = this.deck.shift();
    if (!card) return null;
    this.hand.push(card);
    if (!instant) {
      this.addAnimDraw(card);
    }
    return card;
  }

  private addAnimDraw(card: Card): void {
    const rect = this.canvas.getBoundingClientRect();
    const deckX = rect.width - 80;
    const deckY = rect.height - 40;
    const index = this.hand.length - 1;
    const handPos = this.getHandPosition(index, this.hand.length);
    this.animations.push({
      card,
      fromX: deckX,
      fromY: deckY,
      toX: handPos.x,
      toY: handPos.y,
      progress: 0,
      duration: 0.35,
      type: 'draw',
    });
  }

  getHandPosition(index: number, total: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const totalWidth = total * CARD_WIDTH + (total - 1) * HAND_GAP;
    let startX = (rect.width - totalWidth) / 2;
    startX += CARD_WIDTH / 2;
    return {
      x: startX + index * (CARD_WIDTH + HAND_GAP),
      y: rect.height - CARD_HEIGHT / 2 - 40,
    };
  }

  getHandAreaRect(): { x: number; y: number; w: number; h: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: 0,
      y: rect.height - CARD_HEIGHT - 80,
      w: rect.width,
      h: CARD_HEIGHT + 80,
    };
  }

  isPointInCard(px: number, py: number, cardX: number, cardY: number): boolean {
    return px >= cardX - CARD_WIDTH / 2 &&
           px <= cardX + CARD_WIDTH / 2 &&
           py >= cardY - CARD_HEIGHT / 2 &&
           py <= cardY + CARD_HEIGHT / 2;
  }

  hitTest(x: number, y: number): number {
    for (let i = this.hand.length - 1; i >= 0; i--) {
      if (this.draggedCard && this.draggedCard.handIndex === i) continue;
      const pos = this.getHandPosition(i, this.hand.length);
      const liftY = this.hoveredIndex === i ? -20 : 0;
      if (this.isPointInCard(x, y, pos.x, pos.y + liftY)) {
        return i;
      }
    }
    return -1;
  }

  handleMouseMove(x: number, y: number, player: Player, monsters: Monster[]): void {
    if (this.draggedCard) {
      this.draggedCard.screenX = x;
      this.draggedCard.screenY = y;
      const grid = this.gameBoard.screenToGrid(x, y);
      this.targetGrid = grid;
      this.updateHighlights(this.draggedCard.card, grid, player, monsters);
    } else {
      this.hoveredIndex = this.hitTest(x, y);
    }
  }

  handleMouseDown(x: number, y: number): void {
    const idx = this.hitTest(x, y);
    if (idx >= 0) {
      const card = this.hand[idx];
      if (this.energy >= card.cost) {
        const pos = this.getHandPosition(idx, this.hand.length);
        this.draggedCard = {
          card,
          handIndex: idx,
          offsetX: x - pos.x,
          offsetY: y - (pos.y + (this.hoveredIndex === idx ? -20 : 0)),
          screenX: x,
          screenY: y,
        };
        this.selectedCard = card;
      }
    }
  }

  handleMouseUp(x: number, y: number, player: Player, monsters: Monster[]): boolean {
    if (!this.draggedCard) {
      this.hoveredIndex = -1;
      return false;
    }
    const grid = this.gameBoard.screenToGrid(x, y);
    const card = this.draggedCard.card;
    const validTarget = this.isValidTarget(card, grid, player, monsters);

    if (grid && validTarget) {
      this.playCard(this.draggedCard.handIndex, grid);
      this.draggedCard = null;
      this.selectedCard = null;
      this.targetGrid = null;
      this.gameBoard.clearHighlights();
      this.hoveredIndex = -1;
      return true;
    } else {
      this.draggedCard = null;
      this.selectedCard = null;
      this.targetGrid = null;
      this.gameBoard.clearHighlights();
      this.hoveredIndex = -1;
      return false;
    }
  }

  updateHighlights(card: Card, grid: Position | null, player: Player, monsters: Monster[]): void {
    const cells: HighlightCell[] = [];
    const validCells = this.getValidTargetCells(card, player, monsters);
    for (const c of validCells) {
      cells.push({ x: c.x, y: c.y, valid: true });
    }
    if (grid && validCells.some(c => c.x === grid.x && c.y === grid.y)) {
      cells.push({ x: grid.x, y: grid.y, valid: true });
    }
    this.gameBoard.setHighlights(cells);
  }

  getValidTargetCells(card: Card, player: Player, monsters: Monster[]): Position[] {
    const cells: Position[] = [];
    const gs = this.gameBoard.mapData.gridSize;
    const range = card.range;

    switch (card.type) {
      case 'move':
      case 'dash': {
        const visited = new Set<string>();
        const queue: { x: number; y: number; dist: number }[] = [{ x: player.x, y: player.y, dist: 0 }];
        visited.add(`${player.x},${player.y}`);
        while (queue.length > 0) {
          const cur = queue.shift()!;
          if (cur.dist >= range) continue;
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (const [dx, dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            if (!this.gameBoard.isInBounds(nx, ny)) continue;
            if (this.gameBoard.isWall(nx, ny)) continue;
            const m = this.gameBoard.getMonsterAt(nx, ny, monsters);
            const isMonsterAdj = card.type === 'dash' && m && cur.dist + 1 === range;
            if (!m || isMonsterAdj) {
              visited.add(key);
              cells.push({ x: nx, y: ny });
              queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
            }
          }
        }
        return cells;
      }

      case 'melee': {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = player.x + dx;
            const ny = player.y + dy;
            if (!this.gameBoard.isInBounds(nx, ny)) continue;
            const m = this.gameBoard.getMonsterAt(nx, ny, monsters);
            if (m) cells.push({ x: nx, y: ny });
          }
        }
        return cells;
      }

      case 'ranged': {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of dirs) {
          for (let d = 1; d <= range; d++) {
            const nx = player.x + dx * d;
            const ny = player.y + dy * d;
            if (!this.gameBoard.isInBounds(nx, ny)) break;
            if (this.gameBoard.isWall(nx, ny)) break;
            const m = this.gameBoard.getMonsterAt(nx, ny, monsters);
            if (m) {
              cells.push({ x: nx, y: ny });
              break;
            }
            if (d === range) cells.push({ x: nx, y: ny });
          }
        }
        return cells;
      }

      case 'fire': {
        for (let dy = -range; dy <= range; dy++) {
          for (let dx = -range; dx <= range; dx++) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist === 0 || dist > range) continue;
            const nx = player.x + dx;
            const ny = player.y + dy;
            if (!this.gameBoard.isInBounds(nx, ny)) continue;
            if (this.gameBoard.isWall(nx, ny)) continue;
            cells.push({ x: nx, y: ny });
          }
        }
        return cells;
      }

      case 'heal': {
        cells.push({ x: player.x, y: player.y });
        return cells;
      }
    }

    return cells;
  }

  isValidTarget(card: Card, grid: Position | null, player: Player, monsters: Monster[]): boolean {
    if (!grid) return card.type === 'heal';
    if (card.type === 'heal') return grid.x === player.x && grid.y === player.y;
    const valid = this.getValidTargetCells(card, player, monsters);
    return valid.some(c => c.x === grid.x && c.y === grid.y);
  }

  playCard(index: number, target: Position | null): void {
    const card = this.hand[index];
    if (!card) return;
    if (this.energy < card.cost) return;
    this.energy -= card.cost;
    this.hand.splice(index, 1);
    this.discard.push(card);
    this.addAnimDiscard(card, index);
    if (this.onCardPlayed) {
      this.onCardPlayed(card, target);
    }
  }

  private addAnimDiscard(card: Card, playedIndex: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const fromPos = this.getHandPosition(playedIndex, this.hand.length + 1);
    const discardX = 80;
    const discardY = rect.height - 40;
    this.animations.push({
      card,
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: discardX,
      toY: discardY,
      progress: 0,
      duration: 0.3,
      type: 'discard',
    });
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.animations.length - 1; i >= 0; i--) {
      this.animations[i].progress += dt / this.animations[i].duration;
      if (this.animations[i].progress >= 1) {
        this.animations.splice(i, 1);
      }
    }
  }

  render(time: number): void {
    const ctx = this.ctx;
    this.drawDeckAndDiscard();
    this.drawHand(time);
    this.drawAnimations();
    if (this.draggedCard) {
      this.drawCard(this.draggedCard.screenX, this.draggedCard.screenY, this.draggedCard.card, 1.15, 0.95, true);
    }
  }

  drawDeckAndDiscard(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const deckX = rect.width - 80;
    const deckY = rect.height - 50;
    this.drawCardPile(deckX, deckY, this.deck.length, '#4a5568', '牌库');
    const discardX = 80;
    const discardY = rect.height - 50;
    this.drawCardPile(discardX, discardY, this.discard.length, '#744210', '弃牌堆');
  }

  drawCardPile(x: number, y: number, count: number, color: string, label: string): void {
    const ctx = this.ctx;
    ctx.save();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const ox = -i * 1.5;
      const oy = -i * 1.5;
      const w = CARD_WIDTH * 0.7;
      const h = CARD_HEIGHT * 0.7;
      this.roundRect(ctx, x + ox - w / 2, y + oy - h / 2, w, h, CARD_RADIUS);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ecc94b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000';
    ctx.fillText(`×${count}`, x, y);
    ctx.shadowBlur = 0;
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = '#a0aec0';
    ctx.fillText(label, x, y + CARD_HEIGHT * 0.5 + 12);
    ctx.restore();
  }

  drawHand(time: number): void {
    for (let i = 0; i < this.hand.length; i++) {
      if (this.draggedCard && this.draggedCard.handIndex === i) continue;
      const card = this.hand[i];
      const pos = this.getHandPosition(i, this.hand.length);
      const isHovered = this.hoveredIndex === i;
      const liftY = isHovered ? -20 : 0;
      const canAfford = this.energy >= card.cost;
      const alpha = canAfford ? 1 : 0.5;
      const scale = isHovered ? 1.05 : 1;
      this.drawCard(pos.x, pos.y + liftY, card, scale, alpha, false);
    }
  }

  drawAnimations(): void {
    for (const anim of this.animations) {
      const t = this.easeOutCubic(anim.progress);
      const x = anim.fromX + (anim.toX - anim.fromX) * t;
      const y = anim.fromY + (anim.toY - anim.fromY) * t;
      const alpha = anim.type === 'discard' ? 1 - t * 0.5 : 1;
      const scale = anim.type === 'draw' ? 0.7 + t * 0.3 : 1;
      this.drawCard(x, y, anim.card, scale, alpha, false);
    }
  }

  drawCard(x: number, y: number, card: Card, scale: number = 1, alpha: number = 1, isDragging: boolean = false): void {
    const ctx = this.ctx;
    const w = CARD_WIDTH * scale;
    const h = CARD_HEIGHT * scale;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (isDragging) {
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#ecc94b';
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    }

    this.roundRect(ctx, x - w / 2, y - h / 2, w, h, CARD_RADIUS * scale);
    const bgGrad = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    bgGrad.addColorStop(0, '#2d3748');
    bgGrad.addColorStop(1, '#1a202c');
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = this.getCardFrameColor(card);
    ctx.stroke();
    ctx.lineWidth = 1 * scale;
    ctx.strokeStyle = '#ecc94b';
    ctx.stroke();

    this.drawCostBadge(x - w / 2 + 8 * scale, y - h / 2 + 8 * scale, card.cost, scale);
    this.drawCardIcon(x, y - h * 0.15, card, scale);
    this.drawCardName(x, y + h * 0.1, card, scale);
    this.drawCardDescription(x, y + h * 0.3, card, scale);

    ctx.restore();
  }

  getCardFrameColor(card: Card): string {
    switch (card.type) {
      case 'move': return '#63b3ed';
      case 'melee': return '#fc8181';
      case 'ranged': return '#68d391';
      case 'fire': return '#f6ad55';
      case 'heal': return '#68d391';
      default: return '#a0aec0';
    }
  }

  drawCostBadge(x: number, y: number, cost: number, scale: number): void {
    const ctx = this.ctx;
    const size = 20 * scale;
    const t = Math.min(Math.max((cost - 1) / 2, 0), 1);
    const r = Math.floor(99 + (252 - 99) * t);
    const g = Math.floor(179 + (129 - 179) * t);
    const b = Math.floor(237 + (129 - 237) * t);
    const fillColor = `rgb(${r}, ${g}, ${b})`;

    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.shadowBlur = 6 * scale;
    ctx.shadowColor = fillColor;
    ctx.fillStyle = fillColor;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${13 * scale}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 2;
    ctx.shadowColor = '#000';
    ctx.fillText(String(cost), 0, 0);
    ctx.restore();
  }

  drawCardIcon(x: number, y: number, card: Card, scale: number): void {
    const ctx = this.ctx;
    const size = 36 * scale;
    ctx.save();
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.getCardFrameColor(card);
    ctx.fillText(card.icon, x, y);
    ctx.restore();
  }

  drawCardName(x: number, y: number, card: Card, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `bold ${13 * scale}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ecc94b';
    ctx.shadowBlur = 2;
    ctx.shadowColor = '#000';
    ctx.fillText(card.name, x, y);
    ctx.restore();
  }

  drawCardDescription(x: number, y: number, card: Card, scale: number): void {
    const ctx = this.ctx;
    const w = CARD_WIDTH * scale - 8 * scale;
    const h = CARD_HEIGHT * 0.32 * scale;
    ctx.save();
    this.roundRect(ctx, x - w / 2, y, w, h, 5 * scale);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${10 * scale}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = this.wrapText(ctx, card.description, w - 6 * scale);
    const lineH = 12 * scale;
    const totalH = lines.length * lineH;
    const startY = y + h / 2 - totalH / 2 + lineH / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineH);
    }
    ctx.restore();
  }

  wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split('');
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current + w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
