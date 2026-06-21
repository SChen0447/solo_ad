import {
  GameState,
  RoleType,
  WSMessage,
  ITEMS,
  RECIPES,
  SEASONINGS,
  ROLE_NAMES,
  ROLE_COLORS,
  ItemTransfer,
  createInitialInventory,
  createInitialFields,
  createInitialStoves,
  createInitialCustomerSpots,
  generateOrder,
  drawCoinIcon,
  canCook,
} from './resources.js';
import { PixelRole, getRoleSpawnPosition, drawRolePreview } from './role.js';
import { Game } from './game.js';

const WS_PORT = 8080;
const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  (window.location.hostname || 'localhost') + ':' + WS_PORT;

let ws: WebSocket | null = null;
let game: Game | null = null;
let selectedRole: RoleType | null = null;
let myPlayerId: string | null = null;
let myRole: RoleType | null = null;
let currentRoomCode: string | null = null;
let state: GameState | null = null;
let previewAnimRaf: number | null = null;
let loadingAnimRaf: number | null = null;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

function init() {
  initLoadingRunner();

  const previewCanvases = document.querySelectorAll<HTMLCanvasElement>('canvas[data-preview]');
  startPreviewAnimations(previewCanvases);

  const coinCanvas = $('coin-icon') as HTMLCanvasElement;
  const cctx = coinCanvas.getContext('2d');
  if (cctx) {
    cctx.imageSmoothingEnabled = false;
    drawCoinIcon(cctx, 0, 0, 16);
  }

  document.querySelectorAll('.role-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (card.classList.contains('disabled')) return;
      document.querySelectorAll('.role-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRole = card.getAttribute('data-role') as RoleType;
      updateJoinButton();
    });
  });

  ($('join-btn') as HTMLButtonElement).addEventListener('click', () => {
    if (!selectedRole) return;
    const roomInput = ($('room-input') as HTMLInputElement).value.trim().toUpperCase();
    connectToServer(selectedRole, roomInput);
  });

  ($('room-input') as HTMLInputElement).addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    updateJoinButton();
  });

  updateJoinButton();
}

function updateJoinButton() {
  const btn = $('join-btn') as HTMLButtonElement;
  const roomInput = ($('room-input') as HTMLInputElement).value.trim();
  if (!selectedRole) {
    btn.disabled = true;
    btn.textContent = '🚪 请先选择角色';
    return;
  }
  btn.disabled = false;
  if (roomInput.length > 0) {
    btn.textContent = '🚪 加入房间';
  } else {
    btn.textContent = '🚪 创建房间';
  }
}

function setStatus(msg: string, isError: boolean = false) {
  const el = $('status-msg');
  el.textContent = msg;
  el.style.color = isError ? '#ff6666' : '#99ff99';
}

function connectToServer(role: RoleType, roomInput: string) {
  showLoading(roomInput ? '正在加入房间...' : '正在创建房间...');
  setStatus('连接服务器中...');
  const btn = $('join-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = '⏳ 连接中...';

  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    hideLoading();
    setStatus('无法连接到服务器，请确认后端是否已启动', true);
    updateJoinButton();
    return;
  }

  const connectTimeout = setTimeout(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      ws.close();
      hideLoading();
      setStatus('连接超时，请检查服务器是否启动 (ws://localhost:' + WS_PORT + ')', true);
      updateJoinButton();
    }
  }, 5000);

  ws.onopen = () => {
    clearTimeout(connectTimeout);
    setStatus(roomInput ? '加入房间中...' : '创建房间中...');
    const msg: WSMessage = {
      type: roomInput ? 'join_room' : 'create_room',
      data: {
        role,
        roomCode: roomInput || undefined,
      },
    };
    ws!.send(JSON.stringify(msg));
  };

  ws.onmessage = (ev) => {
    try {
      const msg: WSMessage = JSON.parse(ev.data);
      handleMessage(msg);
    } catch (e) {
      console.error('Bad message', e, ev.data);
    }
  };

  ws.onclose = () => {
    clearTimeout(connectTimeout);
    hideLoading();
    setStatus('连接已断开', true);
    updateJoinButton();
    if (game) game.stop();
  };

  ws.onerror = () => {
    clearTimeout(connectTimeout);
    hideLoading();
    setStatus('WebSocket 错误，请检查服务器是否启动 (ws://localhost:' + WS_PORT + ')', true);
    updateJoinButton();
  };
}

function handleMessage(msg: WSMessage) {
  switch (msg.type) {
    case 'error':
      hideLoading();
      setStatus(msg.data?.message || '发生错误', true);
      updateJoinButton();
      break;

    case 'room_created':
    case 'joined_room': {
      const d = msg.data;
      myPlayerId = d.playerId;
      myRole = d.role;
      currentRoomCode = d.roomCode;
      state = d.state;

      hideLoading();

      ($('room-display') as HTMLElement).textContent = '房间: ' + currentRoomCode;
      ($('room-code') as HTMLElement).textContent = currentRoomCode;
      ($('room-info') as HTMLElement).style.display = 'flex';
      setStatus(msg.type === 'room_created' ? '房间创建成功！分享房间码给其他玩家' : '成功加入房间！', false);

      ($('role-select') as HTMLElement).style.display = 'none';
      ($('game-container') as HTMLElement).style.display = 'block';
      ($('hud-panel') as HTMLElement).style.display = 'flex';
      ($('inventory-panel') as HTMLElement).style.display = 'flex';

      const canvas = $('game-canvas') as HTMLCanvasElement;
      game = new Game(canvas, state!, myPlayerId!, myRole!, {
        onPlant: (fi, pi) => send('action_plant', { fieldIndex: fi, plantId: pi }),
        onHarvest: (fi) => send('action_harvest', { fieldIndex: fi }),
        onStartCook: (si, ri) => send('action_start_cook', { stoveIndex: si, recipeId: ri }),
        onFinishCook: (si) => send('action_finish_cook', { stoveIndex: si }),
        onSell: (spi, di) => send('action_sell', { spotIndex: spi, dishId: di }),
        onRestockSeasoning: (sid) => send('action_restock', { seasoningId: sid }),
        onPlayerMove: (x, y) => send('player_move', { x, y }),
      });
      game.start();

      updatePanels();
      break;
    }

    case 'state_sync': {
      state = msg.data.state;
      if (game) game.updateState(state!);
      updatePanels();
      break;
    }

    case 'player_joined':
    case 'player_left': {
      state = msg.data.state;
      if (game) game.updateState(state!);
      updateRoleCardsAvailability();
      updatePanels();
      break;
    }

    case 'player_move_broadcast': {
      const { playerId, x, y, direction, animFrame, moving } = msg.data;
      if (!state) return;
      if (state.players[playerId]) {
        state.players[playerId].x = x;
        state.players[playerId].y = y;
        state.players[playerId].direction = direction;
        state.players[playerId].animFrame = animFrame;
        state.players[playerId].moving = moving;
        if (game) game.syncRolesFromState();
      }
      break;
    }

    case 'inventory_update':
    case 'action_result': {
      state = msg.data.state;
      if (msg.data.transfer) {
        const tr: ItemTransfer = msg.data.transfer;
        if (game && state) {
          state.activeTransfers.push(tr);
          game.addTransfer(tr);
        }
      }
      if (game) game.updateState(state!);
      updatePanels();
      break;
    }

    case 'new_order':
    case 'order_completed': {
      state = msg.data.state;
      if (game) game.updateState(state!);
      updatePanels();
      break;
    }

    case 'coins_updated': {
      if (!state) return;
      state.coins = msg.data.coins;
      updatePanels();
      break;
    }

    case 'tick_sync': {
      state = msg.data.state;
      if (game) game.updateState(state!);
      updatePanels();
      break;
    }
  }
}

function updateRoleCardsAvailability() {
  if (!state) return;
  const takenRoles = new Set(Object.values(state.players).map((p) => p.role));
  document.querySelectorAll('.role-card').forEach((card) => {
    const r = card.getAttribute('data-role') as RoleType;
    if (takenRoles.has(r) && r !== myRole) {
      card.classList.add('disabled');
    } else {
      card.classList.remove('disabled');
    }
  });
}

function updatePanels() {
  if (!state) return;

  ($('coin-amount') as HTMLElement).textContent = String(state.coins);

  updateInventoryBox('farmer', state.inventory.farmer);
  updateInventoryBox('chef', state.inventory.chef);
  updateInventoryBox('merchant', state.inventory.merchant);

  updateChefActions();
  updateMerchantActions();
}

function updateInventoryBox(role: RoleType, inv: Record<string, number>) {
  const box = $(`inv-${role}-items`);
  box.innerHTML = '';
  const entries = Object.entries(inv).filter(([, c]) => c > 0);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:7px;color:#666;';
    empty.textContent = '(空)';
    box.appendChild(empty);
    return;
  }
  for (const [id, count] of entries) {
    const item = ITEMS[id];
    if (!item) continue;
    const d = document.createElement('div');
    d.className = 'inv-item';
    d.innerHTML = `<span>${item.emoji}</span><span>${item.name}</span><span class="count">x${count}</span>`;
    box.appendChild(d);
  }
}

function updateChefActions() {
  const container = $('chef-actions');
  container.innerHTML = '';
  if (!state) return;

  const button = document.createElement('button');
  button.className = 'action-btn';
  button.textContent = '📤 食材自动传递';
  button.disabled = true;
  button.title = '食材和调料会自动传递到厨师';
  container.appendChild(button);
}

function updateMerchantActions() {
  const container = $('merchant-actions');
  container.innerHTML = '';
  if (!state) return;

  for (const s of SEASONINGS) {
    const item = ITEMS[s];
    if (!item) continue;
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    const current = state.inventory.merchant[s] || 0;
    btn.textContent = `补货 ${item.emoji}${item.name}(${current})`;
    btn.disabled = state.coins < 5;
    btn.addEventListener('click', () => send('action_restock', { seasoningId: s }));
    container.appendChild(btn);
  }
}

function send(type: string, data: any = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('WS not open, cannot send', type);
    return;
  }
  ws.send(JSON.stringify({ type, data }));
}

function startPreviewAnimations(canvases: NodeListOf<HTMLCanvasElement>) {
  const previewData: {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    role: RoleType;
    bobStart: number;
  }[] = [];

  canvases.forEach((c) => {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    previewData.push({
      canvas: c,
      ctx,
      role: c.dataset.preview as RoleType,
      bobStart: Math.random() * 1000,
    });
  });

  const tick = (t: number) => {
    for (const pd of previewData) {
      const bobT = (t + pd.bobStart) / 1000;
      const bobY = Math.sin(bobT * Math.PI * 2) * 2;
      pd.ctx.clearRect(0, 0, pd.canvas.width, pd.canvas.height);
      pd.ctx.save();
      pd.ctx.translate(0, bobY);
      drawRolePreview(pd.ctx, pd.role, pd.canvas.width, pd.canvas.height);
      pd.ctx.restore();

      const hovered = pd.canvas.closest('.role-card')?.matches(':hover') || false;
      const selected = pd.canvas.closest('.role-card')?.classList.contains('selected') || false;
      if (hovered || selected) {
        const pulse = 0.3 + Math.sin(bobT * Math.PI * 4) * 0.15;
        pd.ctx.save();
        pd.ctx.globalAlpha = pulse;
        const cx = pd.canvas.width / 2;
        const cy = pd.canvas.height / 2 + bobY;
        const grd = pd.ctx.createRadialGradient(cx, cy, 2, cx, cy, pd.canvas.width * 0.6);
        grd.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
        grd.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
        grd.addColorStop(1, 'rgba(0, 212, 255, 0)');
        pd.ctx.fillStyle = grd;
        pd.ctx.fillRect(0, 0, pd.canvas.width, pd.canvas.height);
        pd.ctx.restore();
      }
    }
    previewAnimRaf = requestAnimationFrame(tick);
  };
  previewAnimRaf = requestAnimationFrame(tick);
}

function initLoadingRunner() {
  const canvas = $('loading-runner') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const runFrames: { frame: number; startTime: number } = { frame: 0, startTime: 0 };

  const drawRunner = (t: number) => {
    if (!runFrames.startTime) runFrames.startTime = t;
    const elapsed = t - runFrames.startTime;
    const frame = Math.floor(elapsed / 100) % 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const skin = '#F4C28A';
    const hair = '#5D4037';
    const body = '#2196F3';
    const bodyDk = '#1565C0';
    const boot = '#5D3A1A';
    const eye = '#111111';

    const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, 2, 2); };
    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w * 2, h * 2);
    };
    const ox = 2;
    const oy = 4;

    rect(ox + 2, oy + 0, 6, 1, bodyDk);
    rect(ox + 2, oy + 1, 6, 1, body);

    rect(ox + 2, oy + 2, 6, 1, hair);
    rect(ox + 2, oy + 3, 6, 3, skin);
    px(ox + 3, oy + 4, eye);
    px(ox + 6, oy + 4, eye);

    rect(ox + 2, oy + 6, 6, 1, skin);
    rect(ox + 1, oy + 7, 8, 1, bodyDk);
    rect(ox + 1, oy + 8, 8, 2, body);
    rect(ox + 2, oy + 8, 6, 1, bodyDk);

    if (frame === 0) {
      rect(ox + 0, oy + 7, 1, 3, skin);
      rect(ox + 9, oy + 7, 1, 3, skin);
      rect(ox + 2, oy + 10, 3, 2, bodyDk);
      rect(ox + 6, oy + 10, 3, 2, bodyDk);
      rect(ox + 2, oy + 12, 3, 1, boot);
      rect(ox + 6, oy + 12, 3, 1, boot);
    } else if (frame === 1) {
      rect(ox + 0, oy + 8, 1, 2, skin);
      rect(ox + 9, oy + 7, 1, 3, skin);
      rect(ox + 1, oy + 10, 3, 2, bodyDk);
      rect(ox + 7, oy + 10, 3, 2, bodyDk);
      rect(ox + 1, oy + 12, 3, 1, boot);
      rect(ox + 7, oy + 12, 3, 1, boot);
    } else if (frame === 2) {
      rect(ox + 0, oy + 7, 1, 3, skin);
      rect(ox + 9, oy + 8, 1, 2, skin);
      rect(ox + 3, oy + 10, 3, 2, bodyDk);
      rect(ox + 5, oy + 10, 3, 2, bodyDk);
      rect(ox + 3, oy + 12, 3, 1, boot);
      rect(ox + 5, oy + 12, 3, 1, boot);
    } else {
      rect(ox + 0, oy + 7, 1, 3, skin);
      rect(ox + 9, oy + 7, 1, 3, skin);
      rect(ox + 3, oy + 10, 3, 2, bodyDk);
      rect(ox + 5, oy + 10, 3, 2, bodyDk);
      rect(ox + 3, oy + 12, 3, 1, boot);
      rect(ox + 5, oy + 12, 3, 1, boot);
    }
    loadingAnimRaf = requestAnimationFrame(drawRunner);
  };
  loadingAnimRaf = requestAnimationFrame(drawRunner);
}

function showLoading(text: string = '正在连接服务器...') {
  const overlay = $('loading-overlay');
  const textEl = $('loading-text');
  textEl.textContent = text;
  overlay.classList.add('active');
}

function hideLoading() {
  const overlay = $('loading-overlay');
  overlay.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);

if (document.readyState !== 'loading') {
  init();
}
