import { GameBoard, CellType, CellData, PLAYER_COLORS, PLAYER_NAMES } from './gameBoard';
import { PlayerManager } from './playerManager';
import { EventEngine, GameEvent } from './eventEngine';

const BOARD_SIZE = 600;

let gameBoard: GameBoard;
let playerManager: PlayerManager;
let eventEngine: EventEngine;

let diceBtn: HTMLButtonElement;
let diceResultEl: HTMLDivElement;
let messageEl: HTMLDivElement;
let turnLabel: HTMLSpanElement;
let playerCardEls: HTMLDivElement[] = [];
let purchaseOverlay: HTMLDivElement;
let eventOverlay: HTMLDivElement;
let gameOverlay: HTMLDivElement;

let diceRollResolve: ((value: number) => void) | null = null;
let purchaseResolve: ((bought: boolean) => void) | null = null;
let eventResolve: (() => void) | null = null;
let messageTimer: ReturnType<typeof setTimeout> | null = null;

function init() {
  injectStyles();

  gameBoard = new GameBoard(BOARD_SIZE);
  (window as any).__gameBoard = gameBoard;
  playerManager = new PlayerManager();
  eventEngine = new EventEngine();

  playerManager.onPositionUpdate = (pi, pos) => {
    gameBoard.updatePlayerPosition(pi, pos);
  };
  playerManager.onPassStart = (pi) => {
    showMessage(`${playerManager.players[pi].name} 经过起点，获得 ¥200！`);
  };

  const app = document.getElementById('app')!;
  app.appendChild(createLayout());

  startRenderLoop();
  runGame();
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #game-container {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 24px;
      padding: 20px;
      height: 100vh;
      overflow: hidden;
    }
    #player-panel {
      width: 200px;
      flex-shrink: 0;
    }
    .player-card {
      background: #111827;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 4px solid transparent;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .player-card.active {
      box-shadow: 0 0 12px rgba(59,130,246,0.3);
    }
    .player-card.bankrupt {
      opacity: 0.4;
    }
    .player-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .player-stat {
      font-size: 12px;
      color: #94A3B8;
      margin-bottom: 4px;
    }
    .player-stat span {
      color: #F1F5F9;
      font-weight: 600;
    }
    #center-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    #control-area {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #1E293B;
      padding: 12px 24px;
      border-radius: 16px;
    }
    #turn-label {
      font-size: 14px;
      color: #F1F5F9;
      font-weight: 600;
      min-width: 100px;
    }
    #dice-btn {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #3B82F6;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s, background-color 0.1s;
      position: relative;
      outline: none;
    }
    #dice-btn:active {
      transform: scale(0.9);
      background-color: #2563EB;
    }
    #dice-btn:hover {
      background-color: #3B82F6;
      box-shadow: 0 0 16px rgba(59,130,246,0.5);
    }
    #dice-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }
    #dice-result {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 60px;
      min-height: 60px;
    }
    #message-area {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
    }
    .toast {
      background: #1E293B;
      color: #F1F5F9;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: toastIn 0.3s ease-out;
      margin-bottom: 8px;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
    #purchase-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    #purchase-overlay.show {
      display: flex;
    }
    #purchase-panel {
      width: 280px;
      border-radius: 12px;
      background: #1F2937;
      padding: 20px;
      color: #F1F5F9;
    }
    .purchase-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .purchase-price {
      font-size: 24px;
      font-weight: bold;
      color: #10B981;
      margin-bottom: 16px;
    }
    .purchase-btns {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-buy, .btn-skip {
      width: 100px;
      height: 40px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: white;
      transition: transform 0.15s ease-out, filter 0.15s ease-out;
    }
    .btn-buy {
      background: #10B981;
    }
    .btn-skip {
      background: #6B7280;
    }
    .btn-buy:hover, .btn-skip:hover {
      filter: brightness(1.15);
      transform: scale(0.95);
    }
    #event-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    #event-overlay.show {
      display: flex;
    }
    #event-card {
      width: 360px;
      border-radius: 16px;
      background: linear-gradient(135deg, #8B5CF6, #3B82F6);
      padding: 32px 24px;
      color: white;
      text-align: center;
      transform: translateY(-100vh);
      transition: transform 0.4s ease-out;
    }
    #event-card.slide-in {
      transform: translateY(0);
    }
    #event-card.slide-out {
      transform: translateY(-100vh);
      transition: transform 0.3s ease-in;
    }
    .event-emoji {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .event-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .event-desc {
      font-size: 16px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .event-gold {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .btn-confirm-event {
      width: 120px;
      height: 44px;
      border-radius: 22px;
      background: white;
      color: #8B5CF6;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: transform 0.15s ease-out, filter 0.15s ease-out;
    }
    .btn-confirm-event:hover {
      filter: brightness(0.95);
      transform: scale(0.95);
    }
    #game-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 300;
      align-items: center;
      justify-content: center;
    }
    #game-overlay.show {
      display: flex;
    }
    #game-over-panel {
      background: #1F293B;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      color: #F1F5F9;
    }
    .winner-name {
      font-size: 28px;
      font-weight: bold;
      margin: 16px 0;
    }
    .btn-restart {
      margin-top: 20px;
      padding: 12px 32px;
      border-radius: 8px;
      background: #3B82F6;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.15s ease-out, filter 0.15s ease-out;
    }
    .btn-restart:hover {
      filter: brightness(1.15);
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);
}

function createLayout(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'game-container';

  const panel = document.createElement('div');
  panel.id = 'player-panel';
  for (let i = 0; i < 4; i++) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-name" style="color:${PLAYER_COLORS[i]}">${PLAYER_NAMES[i]}</div>
      <div class="player-stat">💰 金币: <span id="gold-${i}">1500</span></div>
      <div class="player-stat">🏠 地产: <span id="props-${i}">0</span></div>
    `;
    panel.appendChild(card);
    playerCardEls.push(card);
  }
  container.appendChild(panel);

  const centerCol = document.createElement('div');
  centerCol.id = 'center-col';

  const canvasWrap = document.createElement('div');
  canvasWrap.id = 'canvas-container';
  canvasWrap.appendChild(gameBoard.canvas);
  centerCol.appendChild(canvasWrap);

  const controlArea = document.createElement('div');
  controlArea.id = 'control-area';

  turnLabel = document.createElement('span');
  turnLabel.id = 'turn-label';
  turnLabel.textContent = `${PLAYER_NAMES[0]}的回合`;
  controlArea.appendChild(turnLabel);

  diceBtn = document.createElement('button');
  diceBtn.id = 'dice-btn';
  diceBtn.appendChild(createDiceFace(5, 36));
  diceBtn.disabled = true;
  controlArea.appendChild(diceBtn);

  diceResultEl = document.createElement('div');
  diceResultEl.id = 'dice-result';
  controlArea.appendChild(diceResultEl);

  centerCol.appendChild(controlArea);
  container.appendChild(centerCol);

  messageEl = document.createElement('div');
  messageEl.id = 'message-area';
  document.body.appendChild(messageEl);

  purchaseOverlay = document.createElement('div');
  purchaseOverlay.id = 'purchase-overlay';
  purchaseOverlay.innerHTML = `
    <div id="purchase-panel">
      <div class="purchase-title" id="purchase-name"></div>
      <div class="purchase-price" id="purchase-price"></div>
      <div class="purchase-btns">
        <button class="btn-buy" id="btn-buy">购买</button>
        <button class="btn-skip" id="btn-skip">跳过</button>
      </div>
    </div>
  `;
  document.body.appendChild(purchaseOverlay);

  eventOverlay = document.createElement('div');
  eventOverlay.id = 'event-overlay';
  eventOverlay.innerHTML = `
    <div id="event-card">
      <div class="event-emoji" id="event-emoji"></div>
      <div class="event-title" id="event-title"></div>
      <div class="event-desc" id="event-desc"></div>
      <div class="event-gold" id="event-gold"></div>
      <button class="btn-confirm-event" id="btn-confirm-event">确认</button>
    </div>
  `;
  document.body.appendChild(eventOverlay);

  gameOverlay = document.createElement('div');
  gameOverlay.id = 'game-overlay';
  gameOverlay.innerHTML = `
    <div id="game-over-panel">
      <div style="font-size:18px;">游戏结束！</div>
      <div class="winner-name" id="winner-name"></div>
      <button class="btn-restart" id="btn-restart">再来一局</button>
    </div>
  `;
  document.body.appendChild(gameOverlay);

  return container;
}

function createDiceFace(value: number, size: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `width:${size}px;height:${size}px;position:relative;`;

  const dotSize = Math.max(4, Math.floor(size * 0.16));
  const t = size * 0.22;
  const m = size * 0.5;
  const b = size * 0.78;

  const layouts: Record<number, [number, number][]> = {
    1: [[m, m]],
    2: [[b, t], [t, b]],
    3: [[b, t], [m, m], [t, b]],
    4: [[t, t], [b, t], [t, b], [b, b]],
    5: [[t, t], [b, t], [m, m], [t, b], [b, b]],
    6: [[t, t], [b, t], [t, m], [b, m], [t, b], [b, b]],
  };

  const dots = layouts[value] || [];
  for (const [x, y] of dots) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;
      width:${dotSize}px;height:${dotSize}px;
      border-radius:50%;
      background:white;
      left:${x - dotSize / 2}px;
      top:${y - dotSize / 2}px;
    `;
    container.appendChild(dot);
  }

  return container;
}

function startRenderLoop() {
  function loop(ts: number) {
    gameBoard.render(ts);
    updatePlayerPanel();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

async function runGame() {
  while (!playerManager.isGameOver()) {
    updateTurnUI();
    diceBtn.disabled = false;

    const dice = await waitForDiceRoll();
    diceBtn.disabled = true;

    await showDiceResult(dice);
    await delay(300);

    await playerManager.movePlayer(dice);

    const cell = gameBoard.getCellAt(playerManager.getCurrentPlayer().position);
    await handleLanding(cell);

    if (playerManager.isGameOver()) break;
    playerManager.nextTurn();
  }

  showGameOver();
}

function waitForDiceRoll(): Promise<number> {
  return new Promise((resolve) => {
    diceBtn.onclick = () => {
      const value = playerManager.rollDice();
      resolve(value);
    };
  });
}

async function showDiceResult(value: number): Promise<void> {
  diceResultEl.innerHTML = '';
  diceResultEl.appendChild(createDiceFace(value, 56));
  diceResultEl.style.display = 'flex';

  await delay(2000);

  diceResultEl.style.display = 'none';
}

async function handleLanding(cell: CellData): Promise<void> {
  const player = playerManager.getCurrentPlayer();

  if (cell.type === CellType.Property) {
    if (cell.owner === -1) {
      if (player.gold >= cell.price) {
        const bought = await showPurchasePanel(cell, player);
        if (bought) {
          playerManager.buyProperty(cell.pathIndex);
          showMessage(`${player.name} 购买了 ${cell.name}！`);
        } else {
          showMessage(`${player.name} 放弃购买 ${cell.name}`);
        }
      } else {
        showMessage(`${player.name} 金币不足，无法购买 ${cell.name}`);
      }
    } else if (cell.owner !== player.index && !playerManager.players[cell.owner].bankrupt) {
      const rent = playerManager.payRent(cell.pathIndex, player.index, cell.owner);
      showMessage(`${player.name} 向 ${playerManager.players[cell.owner].name} 支付了 ¥${rent} 租金`);
      if (player.bankrupt) {
        showMessage(`${player.name} 破产了！`);
      }
    } else if (cell.owner === player.index) {
      showMessage(`${player.name} 回到自己的地产 ${cell.name}`);
    }
  } else if (cell.type === CellType.Event) {
    const event = eventEngine.triggerEvent();
    await showEventCard(event);
    eventEngine.executeEvent(event, (amount) => {
      playerManager.addGold(player.index, amount);
    });
    if (player.gold <= 0 && !player.bankrupt) {
      player.bankrupt = true;
      showMessage(`${player.name} 破产了！`);
    }
  } else if (cell.type === CellType.Start) {
    showMessage(`${player.name} 到达起点`);
  }
}

function showPurchasePanel(cell: CellData, _player: { name: string; gold: number }): Promise<boolean> {
  return new Promise((resolve) => {
    const nameEl = document.getElementById('purchase-name')!;
    const priceEl = document.getElementById('purchase-price')!;
    nameEl.textContent = cell.name;
    priceEl.textContent = `¥${cell.price}`;

    purchaseOverlay.classList.add('show');
    purchaseResolve = resolve;

    const buyBtn = document.getElementById('btn-buy')!;
    const skipBtn = document.getElementById('btn-skip')!;

    const onBuy = () => {
      cleanup();
      resolve(true);
    };
    const onSkip = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      purchaseOverlay.classList.remove('show');
      buyBtn.removeEventListener('click', onBuy);
      skipBtn.removeEventListener('click', onSkip);
    };

    buyBtn.addEventListener('click', onBuy);
    skipBtn.addEventListener('click', onSkip);
  });
}

function showEventCard(event: GameEvent): Promise<void> {
  return new Promise((resolve) => {
    const emojiEl = document.getElementById('event-emoji')!;
    const titleEl = document.getElementById('event-title')!;
    const descEl = document.getElementById('event-desc')!;
    const goldEl = document.getElementById('event-gold')!;
    const cardEl = document.getElementById('event-card')!;

    emojiEl.textContent = event.emoji;
    titleEl.textContent = event.title;
    descEl.textContent = event.description;
    goldEl.textContent = event.goldChange > 0 ? `+¥${event.goldChange}` : `-¥${Math.abs(event.goldChange)}`;
    goldEl.style.color = event.goldChange > 0 ? '#4ADE80' : '#F87171';

    eventOverlay.classList.add('show');
    cardEl.classList.remove('slide-out');
    requestAnimationFrame(() => {
      cardEl.classList.add('slide-in');
    });

    const confirmBtn = document.getElementById('btn-confirm-event')!;
    const onConfirm = () => {
      cardEl.classList.remove('slide-in');
      cardEl.classList.add('slide-out');
      setTimeout(() => {
        eventOverlay.classList.remove('show');
        cardEl.classList.remove('slide-out');
        confirmBtn.removeEventListener('click', onConfirm);
        resolve();
      }, 300);
    };
    confirmBtn.addEventListener('click', onConfirm);
  });
}

function showMessage(text: string) {
  if (messageTimer) clearTimeout(messageTimer);

  messageEl.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  messageEl.appendChild(toast);

  messageTimer = setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-out forwards';
    setTimeout(() => {
      messageEl.innerHTML = '';
    }, 300);
  }, 2500);
}

function updateTurnUI() {
  const player = playerManager.getCurrentPlayer();
  turnLabel.textContent = `${player.name}的回合`;
  turnLabel.style.color = player.color;
}

function updatePlayerPanel() {
  for (let i = 0; i < 4; i++) {
    const p = playerManager.players[i];
    const card = playerCardEls[i];

    const goldSpan = document.getElementById(`gold-${i}`);
    const propsSpan = document.getElementById(`props-${i}`);
    if (goldSpan) goldSpan.textContent = String(p.gold);
    if (propsSpan) propsSpan.textContent = String(p.properties.length);

    if (i === playerManager.currentPlayerIndex && !p.bankrupt) {
      card.classList.add('active');
      card.style.borderLeftColor = p.color;
    } else {
      card.classList.remove('active');
      card.style.borderLeftColor = 'transparent';
    }

    if (p.bankrupt) {
      card.classList.add('bankrupt');
    } else {
      card.classList.remove('bankrupt');
    }
  }
}

function showGameOver() {
  const winner = playerManager.getWinner();
  const nameEl = document.getElementById('winner-name')!;
  if (winner) {
    nameEl.textContent = `${winner.name} 获胜！`;
    nameEl.style.color = winner.color;
  } else {
    nameEl.textContent = '平局！';
  }
  gameOverlay.classList.add('show');

  const restartBtn = document.getElementById('btn-restart')!;
  restartBtn.onclick = () => {
    location.reload();
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

init();
