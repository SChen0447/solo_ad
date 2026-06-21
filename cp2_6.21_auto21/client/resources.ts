export type RoleType = 'farmer' | 'chef' | 'merchant';

export type ItemCategory = 'ingredient' | 'seasoning' | 'dish';

export interface ItemData {
  id: string;
  name: string;
  category: ItemCategory;
  emoji: string;
  color: string;
  sourceRole?: RoleType;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  ingredients: Record<string, number>;
  seasonings: Record<string, number>;
  result: string;
  cookTimeMs: number;
  reward: number;
}

export interface Order {
  id: string;
  recipeId: string;
  createdAt: number;
  expiresAt: number;
  reward: number;
  status: 'pending' | 'cooking' | 'ready' | 'completed' | 'failed';
}

export interface Inventory {
  farmer: Record<string, number>;
  chef: Record<string, number>;
  merchant: Record<string, number>;
}

export interface FieldPlot {
  index: number;
  x: number;
  y: number;
  state: 'empty' | 'planted' | 'grown';
  plantId?: string;
  plantedAt?: number;
  growTimeMs: number;
}

export interface Stove {
  index: number;
  x: number;
  y: number;
  state: 'idle' | 'cooking';
  recipeId?: string;
  startedAt?: number;
  cookTimeMs?: number;
}

export interface CustomerSpot {
  index: number;
  x: number;
  y: number;
  waiting: boolean;
  wantedDish?: string;
}

export const ITEMS: Record<string, ItemData> = {
  tomato: {
    id: 'tomato',
    name: '番茄',
    category: 'ingredient',
    emoji: '🍅',
    color: '#FF4444',
    sourceRole: 'farmer',
  },
  wheat: {
    id: 'wheat',
    name: '小麦',
    category: 'ingredient',
    emoji: '🌾',
    color: '#DEB887',
    sourceRole: 'farmer',
  },
  carrot: {
    id: 'carrot',
    name: '胡萝卜',
    category: 'ingredient',
    emoji: '🥕',
    color: '#FF8C00',
    sourceRole: 'farmer',
  },
  potato: {
    id: 'potato',
    name: '土豆',
    category: 'ingredient',
    emoji: '🥔',
    color: '#C4A35A',
    sourceRole: 'farmer',
  },
  salt: {
    id: 'salt',
    name: '盐',
    category: 'seasoning',
    emoji: '🧂',
    color: '#FFFFFF',
    sourceRole: 'merchant',
  },
  pepper: {
    id: 'pepper',
    name: '胡椒',
    category: 'seasoning',
    emoji: '🌶️',
    color: '#CC2222',
    sourceRole: 'merchant',
  },
  oil: {
    id: 'oil',
    name: '食用油',
    category: 'seasoning',
    emoji: '🫒',
    color: '#FFD700',
    sourceRole: 'merchant',
  },
  pasta_sauce: {
    id: 'pasta_sauce',
    name: '意面酱',
    category: 'dish',
    emoji: '🍝',
    color: '#CC3333',
  },
  tomato_pasta: {
    id: 'tomato_pasta',
    name: '番茄意面',
    category: 'dish',
    emoji: '🍝',
    color: '#DD4444',
  },
  carrot_soup: {
    id: 'carrot_soup',
    name: '胡萝卜汤',
    category: 'dish',
    emoji: '🍲',
    color: '#FF8844',
  },
  mashed_potato: {
    id: 'mashed_potato',
    name: '土豆泥',
    category: 'dish',
    emoji: '🥣',
    color: '#EEDD88',
  },
};

export const RECIPES: Record<string, Recipe> = {
  tomato_pasta: {
    id: 'tomato_pasta',
    name: '番茄意面',
    emoji: '🍝',
    ingredients: { tomato: 2, wheat: 1 },
    seasonings: { salt: 1, oil: 1 },
    result: 'tomato_pasta',
    cookTimeMs: 3000,
    reward: 50,
  },
  carrot_soup: {
    id: 'carrot_soup',
    name: '胡萝卜汤',
    emoji: '🍲',
    ingredients: { carrot: 2, potato: 1 },
    seasonings: { salt: 1, pepper: 1 },
    result: 'carrot_soup',
    cookTimeMs: 3000,
    reward: 45,
  },
  mashed_potato: {
    id: 'mashed_potato',
    name: '土豆泥',
    emoji: '🥣',
    ingredients: { potato: 3 },
    seasonings: { salt: 1, oil: 1 },
    result: 'mashed_potato',
    cookTimeMs: 3000,
    reward: 40,
  },
  pasta_sauce: {
    id: 'pasta_sauce',
    name: '意面酱',
    emoji: '🍅',
    ingredients: { tomato: 3 },
    seasonings: { salt: 1, pepper: 1 },
    result: 'pasta_sauce',
    cookTimeMs: 3000,
    reward: 35,
  },
};

export const PLANTS = {
  tomato: { id: 'tomato', name: '番茄', growTimeMs: 4000, color: '#FF4444' },
  wheat: { id: 'wheat', name: '小麦', growTimeMs: 4000, color: '#DEB887' },
  carrot: { id: 'carrot', name: '胡萝卜', growTimeMs: 4000, color: '#FF8C00' },
  potato: { id: 'potato', name: '土豆', growTimeMs: 4000, color: '#C4A35A' },
};

export const SEASONINGS = ['salt', 'pepper', 'oil'];

export const ROLE_NAMES: Record<RoleType, string> = {
  farmer: '农场主',
  chef: '厨师',
  merchant: '商贩',
};

export const ROLE_COLORS: Record<RoleType, string> = {
  farmer: '#4CAF50',
  chef: '#FF9800',
  merchant: '#2196F3',
};

export interface GameState {
  roomCode: string;
  players: Record<string, {
    role: RoleType;
    name: string;
    x: number;
    y: number;
    direction: number;
    animFrame: number;
    moving: boolean;
  }>;
  inventory: Inventory;
  coins: number;
  orders: Order[];
  currentOrder?: Order;
  fields: FieldPlot[];
  stoves: Stove[];
  customerSpots: CustomerSpot[];
  activeTransfers: ItemTransfer[];
  lastOrderTime: number;
}

export interface ItemTransfer {
  id: string;
  itemId: string;
  fromRole: RoleType;
  toRole: RoleType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  startTime: number;
}

export interface WSMessage {
  type: string;
  data?: any;
}

export function createInitialInventory(): Inventory {
  return {
    farmer: {},
    chef: {},
    merchant: { salt: 5, pepper: 5, oil: 5 },
  };
}

export function createInitialFields(): FieldPlot[] {
  const fields: FieldPlot[] = [];
  const startX = 60;
  const startY = 200;
  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    fields.push({
      index: i,
      x: startX + col * 55,
      y: startY + row * 75,
      state: 'empty',
      growTimeMs: 4000,
    });
  }
  return fields;
}

export function createInitialStoves(): Stove[] {
  const stoves: Stove[] = [];
  for (let i = 0; i < 3; i++) {
    stoves.push({
      index: i,
      x: 350 + i * 55,
      y: 250,
      state: 'idle',
    });
  }
  return stoves;
}

export function createInitialCustomerSpots(): CustomerSpot[] {
  const spots: CustomerSpot[] = [];
  for (let i = 0; i < 3; i++) {
    spots.push({
      index: i,
      x: 620 + i * 55,
      y: 260,
      waiting: false,
    });
  }
  return spots;
}

export function generateOrder(id: string, createdAt: number): Order {
  const recipeIds = Object.keys(RECIPES);
  const recipeId = recipeIds[Math.floor(Math.random() * recipeIds.length)];
  const recipe = RECIPES[recipeId];
  return {
    id,
    recipeId,
    createdAt,
    expiresAt: createdAt + 120000,
    reward: recipe.reward,
    status: 'pending',
  };
}

export function canCook(recipe: Recipe, inv: Inventory): boolean {
  for (const [itemId, count] of Object.entries(recipe.ingredients)) {
    if ((inv.chef[itemId] || 0) < count) return false;
  }
  for (const [itemId, count] of Object.entries(recipe.seasonings)) {
    if ((inv.chef[itemId] || 0) < count) return false;
  }
  return true;
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number,
  colorStart: string = '#00ff88',
  colorEnd: string = '#00cc66'
) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, width, height);
  const grd = ctx.createLinearGradient(x, y, x + width, y);
  grd.addColorStop(0, colorStart);
  grd.addColorStop(1, colorEnd);
  ctx.fillStyle = grd;
  const fillW = Math.max(0, Math.min(width, width * progress));
  ctx.fillRect(x, y, fillW, height);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

export function drawOrderBanner(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  order: Order | undefined,
  now: number
) {
  const bannerX = 150;
  const bannerY = 40;
  const bannerW = canvasWidth - 300;
  const bannerH = 56;

  ctx.save();
  ctx.fillStyle = '#FFFFFFCC';
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 8);
  ctx.stroke();

  if (order) {
    const recipe = RECIPES[order.recipeId];
    const totalTime = order.expiresAt - order.createdAt;
    const remaining = Math.max(0, order.expiresAt - now);
    const progress = remaining / totalTime;

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${recipe.name}  +${order.reward}`, bannerX + bannerW / 2, bannerY + 18);

    const barX = bannerX + 12;
    const barY = bannerY + bannerH - 16;
    const barW = bannerW - 24;
    const barH = 8;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const fillW = Math.max(0, barW * progress);
    if (fillW > 0) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, barX, barY, barW, barH, 4);
      ctx.clip();

      const grd = ctx.createLinearGradient(barX, barY, barX + barW, barY + barH);
      if (progress > 0.3) {
        grd.addColorStop(0, '#00ff88');
        grd.addColorStop(0.5, '#00dd66');
        grd.addColorStop(1, '#00aa44');
      } else {
        grd.addColorStop(0, '#ff6644');
        grd.addColorStop(0.5, '#ff4422');
        grd.addColorStop(1, '#cc2200');
      }
      ctx.fillStyle = grd;
      ctx.fillRect(barX, barY, fillW, barH);

      const shineGrd = ctx.createLinearGradient(barX, barY, barX, barY + barH);
      shineGrd.addColorStop(0, 'rgba(255,255,255,0.35)');
      shineGrd.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      shineGrd.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = shineGrd;
      ctx.fillRect(barX, barY, fillW, barH);

      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.stroke();

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = progress > 0.3 ? '#333333' : '#cc2222';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, bannerX + bannerW - 14, bannerY + 18);
  } else {
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('等待新订单...', bannerX + bannerW / 2, bannerY + bannerH / 2);
  }
  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCoinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number = 16) {
  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(cx, cy, s / 2 - 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, s / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFEB3B';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, s / 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#B8860B';
  ctx.font = `bold ${s * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy + 1);
}
