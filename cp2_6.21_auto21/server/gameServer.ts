import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

type RoleType = 'farmer' | 'chef' | 'merchant';

interface PlayerState {
  role: RoleType;
  name: string;
  x: number;
  y: number;
  direction: number;
  animFrame: number;
  moving: boolean;
}

interface FieldPlot {
  index: number;
  x: number;
  y: number;
  state: 'empty' | 'planted' | 'grown';
  plantId?: string;
  plantedAt?: number;
  growTimeMs: number;
}

interface Stove {
  index: number;
  x: number;
  y: number;
  state: 'idle' | 'cooking';
  recipeId?: string;
  startedAt?: number;
  cookTimeMs?: number;
}

interface CustomerSpot {
  index: number;
  x: number;
  y: number;
  waiting: boolean;
  wantedDish?: string;
  nextSpawnAt?: number;
}

interface Inventory {
  farmer: Record<string, number>;
  chef: Record<string, number>;
  merchant: Record<string, number>;
}

interface Order {
  id: string;
  recipeId: string;
  createdAt: number;
  expiresAt: number;
  reward: number;
  status: 'pending' | 'cooking' | 'ready' | 'completed' | 'failed';
}

interface ItemTransfer {
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

interface GameState {
  roomCode: string;
  players: Record<string, PlayerState>;
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

interface Client {
  ws: WebSocket;
  roomCode?: string;
  playerId?: string;
  role?: RoleType;
  alive: boolean;
}

const ITEMS: Record<string, { name: string; category: string; emoji: string; color: string; sourceRole?: RoleType }> = {
  tomato: { name: '番茄', category: 'ingredient', emoji: '🍅', color: '#FF4444', sourceRole: 'farmer' },
  wheat: { name: '小麦', category: 'ingredient', emoji: '🌾', color: '#DEB887', sourceRole: 'farmer' },
  carrot: { name: '胡萝卜', category: 'ingredient', emoji: '🥕', color: '#FF8C00', sourceRole: 'farmer' },
  potato: { name: '土豆', category: 'ingredient', emoji: '🥔', color: '#C4A35A', sourceRole: 'farmer' },
  salt: { name: '盐', category: 'seasoning', emoji: '🧂', color: '#FFFFFF', sourceRole: 'merchant' },
  pepper: { name: '胡椒', category: 'seasoning', emoji: '🌶️', color: '#CC2222', sourceRole: 'merchant' },
  oil: { name: '食用油', category: 'seasoning', emoji: '🫒', color: '#FFD700', sourceRole: 'merchant' },
  tomato_pasta: { name: '番茄意面', category: 'dish', emoji: '🍝', color: '#DD4444' },
  carrot_soup: { name: '胡萝卜汤', category: 'dish', emoji: '🍲', color: '#FF8844' },
  mashed_potato: { name: '土豆泥', category: 'dish', emoji: '🥣', color: '#EEDD88' },
  pasta_sauce: { name: '意面酱', category: 'dish', emoji: '🍅', color: '#CC3333' },
};

const RECIPES: Record<string, {
  id: string; name: string; ingredients: Record<string, number>;
  seasonings: Record<string, number>; result: string; cookTimeMs: number; reward: number;
}> = {
  tomato_pasta: {
    id: 'tomato_pasta', name: '番茄意面',
    ingredients: { tomato: 2, wheat: 1 },
    seasonings: { salt: 1, oil: 1 },
    result: 'tomato_pasta', cookTimeMs: 3000, reward: 50,
  },
  carrot_soup: {
    id: 'carrot_soup', name: '胡萝卜汤',
    ingredients: { carrot: 2, potato: 1 },
    seasonings: { salt: 1, pepper: 1 },
    result: 'carrot_soup', cookTimeMs: 3000, reward: 45,
  },
  mashed_potato: {
    id: 'mashed_potato', name: '土豆泥',
    ingredients: { potato: 3 },
    seasonings: { salt: 1, oil: 1 },
    result: 'mashed_potato', cookTimeMs: 3000, reward: 40,
  },
  pasta_sauce: {
    id: 'pasta_sauce', name: '意面酱',
    ingredients: { tomato: 3 },
    seasonings: { salt: 1, pepper: 1 },
    result: 'pasta_sauce', cookTimeMs: 3000, reward: 35,
  },
};

const PLANTS: Record<string, { id: string; growTimeMs: number }> = {
  tomato: { id: 'tomato', growTimeMs: 4000 },
  wheat: { id: 'wheat', growTimeMs: 4000 },
  carrot: { id: 'carrot', growTimeMs: 4000 },
  potato: { id: 'potato', growTimeMs: 4000 },
};

const ROLE_SPAWNS: Record<RoleType, { x: number; y: number }> = {
  farmer: { x: 140, y: 430 },
  chef: { x: 400, y: 430 },
  merchant: { x: 660, y: 430 },
};

const ROLE_ANCHOR: Record<RoleType, { x: number; y: number }> = {
  farmer: { x: 140, y: 430 },
  chef: { x: 400, y: 430 },
  merchant: { x: 660, y: 430 },
};

const PORT = 8080;
const rooms: Map<string, GameState> = new Map();
const clients: Set<Client> = new Set();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(code)) return code;
  }
}

function createInitialFields(): FieldPlot[] {
  const f: FieldPlot[] = [];
  const sx = 60, sy = 200;
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    f.push({ index: i, x: sx + col * 55, y: sy + row * 75, state: 'empty', growTimeMs: 4000 });
  }
  return f;
}

function createInitialStoves(): Stove[] {
  return [
    { index: 0, x: 350, y: 250, state: 'idle' },
    { index: 1, x: 405, y: 250, state: 'idle' },
    { index: 2, x: 460, y: 250, state: 'idle' },
  ];
}

function createInitialSpots(): CustomerSpot[] {
  const now = Date.now();
  return [
    { index: 0, x: 620, y: 260, waiting: false, nextSpawnAt: now + 5000 },
    { index: 1, x: 675, y: 260, waiting: false, nextSpawnAt: now + 12000 },
    { index: 2, x: 730, y: 260, waiting: false, nextSpawnAt: now + 19000 },
  ];
}

function createInitialInventory(): Inventory {
  return { farmer: {}, chef: {}, merchant: { salt: 5, pepper: 5, oil: 5 } };
}

function createRoom(roomCode: string): GameState {
  const now = Date.now();
  return {
    roomCode,
    players: {},
    inventory: createInitialInventory(),
    coins: 0,
    orders: [],
    fields: createInitialFields(),
    stoves: createInitialStoves(),
    customerSpots: createInitialSpots(),
    activeTransfers: [],
    lastOrderTime: now,
  };
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function send(ws: WebSocket, type: string, data: any = {}) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

function broadcastRoom(roomCode: string, type: string, data: any = {}, excludePlayerId?: string) {
  for (const c of clients) {
    if (c.roomCode === roomCode && c.playerId !== excludePlayerId) {
      send(c.ws, type, data);
    }
  }
}

function broadcastFullState(roomCode: string) {
  const state = rooms.get(roomCode);
  if (!state) return;
  const snapshot = cloneState(state);
  for (const c of clients) {
    if (c.roomCode === roomCode) {
      send(c.ws, 'state_sync', { state: snapshot });
    }
  }
}

function generateOrderId(): string {
  return 'o_' + Math.random().toString(36).slice(2, 10);
}

function generateTransferId(): string {
  return 't_' + Math.random().toString(36).slice(2, 10);
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function makeTransfer(state: GameState, itemId: string, fromRole: RoleType, toRole: RoleType, qty: number = 1): ItemTransfer | null {
  const fromInv = state.inventory[fromRole];
  if ((fromInv[itemId] || 0) < qty) return null;
  fromInv[itemId] -= qty;
  if (fromInv[itemId] <= 0) delete fromInv[itemId];
  state.inventory[toRole][itemId] = (state.inventory[toRole][itemId] || 0) + qty;

  const fromAnchor = ROLE_ANCHOR[fromRole];
  const toAnchor = ROLE_ANCHOR[toRole];
  const tr: ItemTransfer = {
    id: generateTransferId(),
    itemId,
    fromRole,
    toRole,
    startX: fromAnchor.x,
    startY: fromAnchor.y - 32,
    endX: toAnchor.x,
    endY: toAnchor.y - 32,
    progress: 0,
    duration: 500,
    startTime: Date.now(),
  };
  state.activeTransfers.push(tr);
  return tr;
}

function tryAutoTransferIngredientsToChef(state: GameState) {
  const inv = state.inventory;
  for (const itemId of Object.keys(inv.farmer)) {
    if (inv.farmer[itemId] > 0) {
      const item = ITEMS[itemId];
      if (item && item.category === 'ingredient') {
        while ((inv.farmer[itemId] || 0) > 0) {
          makeTransfer(state, itemId, 'farmer', 'chef', 1);
        }
      }
    }
  }
}

function tryAutoTransferDishesToMerchant(state: GameState) {
  const inv = state.inventory;
  for (const itemId of Object.keys(inv.chef)) {
    if (inv.chef[itemId] > 0) {
      const item = ITEMS[itemId];
      if (item && item.category === 'dish') {
        while ((inv.chef[itemId] || 0) > 0) {
          makeTransfer(state, itemId, 'chef', 'merchant', 1);
        }
      }
    }
  }
}

function tryAutoTransferSeasoningsToChef(state: GameState) {
  const dishIds = new Set(Object.values(RECIPES).map((r) => r.result));
  const neededSeasonings = new Set<string>();
  for (const recipe of Object.values(RECIPES)) {
    for (const sid of Object.keys(recipe.seasonings)) {
      neededSeasonings.add(sid);
    }
  }
  for (const sid of neededSeasonings) {
    while ((state.inventory.merchant[sid] || 0) > 2 && (state.inventory.chef[sid] || 0) < 3) {
      makeTransfer(state, sid, 'merchant', 'chef', 1);
    }
  }
}

function handleCreateRoom(client: Client, role: RoleType) {
  const roomCode = generateRoomCode();
  const state = createRoom(roomCode);
  const playerId = generatePlayerId();
  const spawn = ROLE_SPAWNS[role];
  state.players[playerId] = {
    role,
    name: role === 'farmer' ? '农场主' : role === 'chef' ? '厨师' : '商贩',
    x: spawn.x, y: spawn.y,
    direction: 0, animFrame: 0, moving: false,
  };
  rooms.set(roomCode, state);
  client.roomCode = roomCode;
  client.playerId = playerId;
  client.role = role;

  send(client.ws, 'room_created', {
    playerId, role, roomCode,
    state: cloneState(state),
  });
}

function handleJoinRoom(client: Client, role: RoleType, roomCode: string) {
  const state = rooms.get(roomCode);
  if (!state) {
    send(client.ws, 'error', { message: `房间 ${roomCode} 不存在` });
    return;
  }
  const takenRoles = new Set(Object.values(state.players).map((p) => p.role));
  if (takenRoles.has(role)) {
    send(client.ws, 'error', { message: `该房间已有${role === 'farmer' ? '农场主' : role === 'chef' ? '厨师' : '商贩'}` });
    return;
  }
  if (Object.keys(state.players).length >= 3) {
    send(client.ws, 'error', { message: '房间已满' });
    return;
  }
  const playerId = generatePlayerId();
  const spawn = ROLE_SPAWNS[role];
  state.players[playerId] = {
    role,
    name: role === 'farmer' ? '农场主' : role === 'chef' ? '厨师' : '商贩',
    x: spawn.x, y: spawn.y,
    direction: 0, animFrame: 0, moving: false,
  };
  client.roomCode = roomCode;
  client.playerId = playerId;
  client.role = role;

  send(client.ws, 'joined_room', {
    playerId, role, roomCode,
    state: cloneState(state),
  });
  broadcastRoom(roomCode, 'player_joined', { state: cloneState(state) }, playerId);
}

function handlePlayerMove(client: Client, x: number, y: number) {
  if (!client.roomCode || !client.playerId) return;
  const state = rooms.get(client.roomCode);
  if (!state) return;
  const p = state.players[client.playerId];
  if (!p) return;
  p.x = x; p.y = y;
  broadcastRoom(client.roomCode, 'player_move_broadcast', {
    playerId: client.playerId,
    x, y,
    direction: p.direction,
    animFrame: p.animFrame,
    moving: p.moving,
  }, client.playerId);
}

function handleActionPlant(client: Client, fieldIndex: number, plantId: string) {
  if (!client.roomCode || client.role !== 'farmer') return;
  const state = rooms.get(client.roomCode);
  if (!state) return;
  const f = state.fields[fieldIndex];
  if (!f || f.state !== 'empty') return;
  if (!PLANTS[plantId]) return;
  f.state = 'planted';
  f.plantId = plantId;
  f.plantedAt = Date.now();
  f.growTimeMs = PLANTS[plantId].growTimeMs;
  broadcastFullState(client.roomCode);
}

function handleActionHarvest(client: Client, fieldIndex: number) {
  if (!client.roomCode || client.role !== 'farmer') return;
  const state = rooms.get(client.roomCode);
  if (!state) return;
  const f = state.fields[fieldIndex];
  if (!f || f.state !== 'grown' || !f.plantId) return;
  const plantId = f.plantId;
  state.inventory.farmer[plantId] = (state.inventory.farmer[plantId] || 0) + 1;
  f.state = 'empty';
  f.plantId = undefined;
  f.plantedAt = undefined;
  tryAutoTransferIngredientsToChef(state);
  broadcastFullState(client.roomCode);
}

function handleActionStartCook(client: Client, stoveIndex: number, recipeId: string) {
  if (!client.roomCode || client.role !== 'chef') return;
  const state = rooms.get(client.roomCode);
  if (!state) return;
  const s = state.stoves[stoveIndex];
  const recipe = RECIPES[recipeId];
  if (!s || s.state !== 'idle' || !recipe) return;

  const inv = state.inventory.chef;
  for (const [id, cnt] of Object.entries(recipe.ingredients)) {
    if ((inv[id] || 0) < cnt) return;
  }
  for (const [id, cnt] of Object.entries(recipe.seasonings)) {
    if ((inv[id] || 0) < cnt) return;
  }

  for (const [id, cnt] of Object.entries(recipe.ingredients)) {
    inv[id] -= cnt;
    if (inv[id] <= 0) delete inv[id];
  }
  for (const [id, cnt] of Object.entries(recipe.seasonings)) {
    inv[id] -= cnt;
    if (inv[id] <= 0) delete inv[id];
  }

  s.state = 'cooking';
  s.recipeId = recipeId;
  s.startedAt = Date.now();
  s.cookTimeMs = recipe.cookTimeMs;
  broadcastFullState(client.roomCode);
}

function handleActionSell(client: Client, spotIndex: number, dishId: string) {
  if (!client.roomCode || client.role !== 'merchant') return;
  const state = rooms.get(client.roomCode);
  if (!state) return;
  const cs = state.customerSpots[spotIndex];
  if (!cs || !cs.waiting || cs.wantedDish !== dishId) return;
  if ((state.inventory.merchant[dishId] || 0) < 1) return;

  state.inventory.merchant[dishId] -= 1;
  if (state.inventory.merchant[dishId] <= 0) delete state.inventory.merchant[dishId];

  const recipe = Object.values(RECIPES).find((r) => r.result === dishId);
  const reward = recipe ? recipe.reward : 30;
  state.coins += reward;

  cs.waiting = false;
  cs.wantedDish = undefined;
  cs.nextSpawnAt = Date.now() + 8000 + Math.random() * 12000;

  if (state.currentOrder && state.currentOrder.recipeId &&
      RECIPES[state.currentOrder.recipeId].result === dishId) {
    state.currentOrder.status = 'completed';
    state.orders = state.orders.filter((o) => o.id !== state.currentOrder!.id);
    state.currentOrder = state.orders[0];
  }

  broadcastRoom(client.roomCode, 'coins_updated', { coins: state.coins });
  broadcastFullState(client.roomCode);
}

function handleActionRestock(client: Client, seasoningId: string) {
  if (!client.roomCode || client.role !== 'merchant') return;
  const state = rooms.get(client.roomCode);
  if (!state) return;
  const item = ITEMS[seasoningId];
  if (!item || item.sourceRole !== 'merchant') return;
  const cost = 5;
  if (state.coins < cost) return;
  state.coins -= cost;
  state.inventory.merchant[seasoningId] = (state.inventory.merchant[seasoningId] || 0) + 3;
  broadcastRoom(client.roomCode, 'coins_updated', { coins: state.coins });
  broadcastFullState(client.roomCode);
}

function gameLoop() {
  const now = Date.now();
  for (const [roomCode, state] of rooms) {

    for (const f of state.fields) {
      if (f.state === 'planted' && f.plantedAt && now - f.plantedAt >= f.growTimeMs) {
        f.state = 'grown';
      }
    }

    for (const s of state.stoves) {
      if (s.state === 'cooking' && s.startedAt && s.cookTimeMs && now - s.startedAt >= s.cookTimeMs) {
        const recipe = s.recipeId ? RECIPES[s.recipeId] : undefined;
        if (recipe) {
          state.inventory.chef[recipe.result] = (state.inventory.chef[recipe.result] || 0) + 1;
        }
        s.state = 'idle';
        s.recipeId = undefined;
        s.startedAt = undefined;
        s.cookTimeMs = undefined;
      }
    }

    tryAutoTransferDishesToMerchant(state);
    tryAutoTransferSeasoningsToChef(state);

    state.activeTransfers = state.activeTransfers.filter((tr) => now - tr.startTime < tr.duration + 50);

    if (!state.currentOrder && now - state.lastOrderTime >= 60000) {
      const recipeIds = Object.keys(RECIPES);
      const recipeId = recipeIds[Math.floor(Math.random() * recipeIds.length)];
      const recipe = RECIPES[recipeId];
      const order: Order = {
        id: generateOrderId(),
        recipeId,
        createdAt: now,
        expiresAt: now + 120000,
        reward: recipe.reward,
        status: 'pending',
      };
      state.orders.push(order);
      state.currentOrder = order;
      state.lastOrderTime = now;
    }

    if (state.currentOrder && now >= state.currentOrder.expiresAt) {
      state.currentOrder.status = 'failed';
      state.orders = state.orders.filter((o) => o.id !== state.currentOrder!.id);
      state.currentOrder = state.orders[0];
    }

    for (const cs of state.customerSpots) {
      if (!cs.waiting && cs.nextSpawnAt && now >= cs.nextSpawnAt) {
        const dishResults = Object.values(RECIPES).map((r) => r.result);
        const wanted = dishResults[Math.floor(Math.random() * dishResults.length)];
        cs.waiting = true;
        cs.wantedDish = wanted;
        cs.nextSpawnAt = undefined;
      }
    }

    broadcastRoom(roomCode, 'tick_sync', { state: cloneState(state) });
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Pixel Town WebSocket server running. Connect via ws://host:' + PORT);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const client: Client = { ws, alive: true };
  clients.add(client);

  ws.on('message', (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }
    const type: string = msg.type || '';
    const data: any = msg.data || {};

    switch (type) {
      case 'create_room':
        handleCreateRoom(client, data.role);
        break;
      case 'join_room':
        handleJoinRoom(client, data.role, data.roomCode);
        break;
      case 'player_move':
        handlePlayerMove(client, data.x, data.y);
        break;
      case 'action_plant':
        handleActionPlant(client, data.fieldIndex, data.plantId);
        break;
      case 'action_harvest':
        handleActionHarvest(client, data.fieldIndex);
        break;
      case 'action_start_cook':
        handleActionStartCook(client, data.stoveIndex, data.recipeId);
        break;
      case 'action_finish_cook':
        break;
      case 'action_sell':
        handleActionSell(client, data.spotIndex, data.dishId);
        break;
      case 'action_restock':
        handleActionRestock(client, data.seasoningId);
        break;
    }
  });

  ws.on('close', () => {
    client.alive = false;
    if (client.roomCode && client.playerId) {
      const state = rooms.get(client.roomCode);
      if (state) {
        delete state.players[client.playerId];
        if (Object.keys(state.players).length === 0) {
          setTimeout(() => {
            if (rooms.has(client.roomCode!) &&
                Object.keys(rooms.get(client.roomCode!)!.players).length === 0) {
              rooms.delete(client.roomCode!);
            }
          }, 60_000);
        } else {
          broadcastRoom(client.roomCode, 'player_left', { state: cloneState(state) });
        }
      }
    }
    clients.delete(client);
  });

  ws.on('pong', () => { client.alive = true; });
});

setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { c.ws.terminate(); continue; }
    c.alive = false;
    try { c.ws.ping(); } catch {}
  }
}, 30_000);

setInterval(gameLoop, 100);

server.listen(PORT, () => {
  console.log(`[PixelTown] WebSocket server listening on ws://localhost:${PORT}`);
  console.log(`[PixelTown] HTTP status endpoint: http://localhost:${PORT}`);
});
