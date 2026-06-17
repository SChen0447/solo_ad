import axios from 'axios';
import { GameBoard } from './game/board';
import { Player, PlayerData } from './game/player';
import { Card } from './game/card';
import { EffectManager } from './game/effect';
import { CardData, RARITY_COLORS, ELEMENT_COLORS, ELEMENT_SYMBOLS } from './game/types';

enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

enum TurnPhase {
  PLAYER = 'player',
  ENEMY = 'enemy'
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const uiLayer = document.getElementById('ui-layer')!;

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const TURN_DURATION = 30;

let gameState: GameState = GameState.MENU;
let turnPhase: TurnPhase = TurnPhase.PLAYER;
let turnTimeRemaining: number = TURN_DURATION;
let turnCount: number = 0;
let cardsPlayedThisMatch: number[] = [];

let effectManager: EffectManager;
let gameBoard: GameBoard;
let player: Player;
let enemy: Player;

let draggingCard: Card | null = null;
let hoveredCard: Card | null = null;
let selectedCardForPlacement: Card | null = null;

let gameOverData: {
  winner: 'player' | 'enemy';
  rewardCard: CardData | null;
  rewardFlipped: boolean;
} | null = null;

let allCards: CardData[] = [];
let lastTime: number = 0;

async function init() {
  effectManager = new EffectManager();
  gameBoard = new GameBoard(effectManager, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  try {
    await axios.get('/api/health');
    const cardsResponse = await axios.get('/api/cards');
    allCards = cardsResponse.data;
    
    await loginDefaultUser();
  } catch (e) {
    console.log('后端未连接，使用本地数据');
    generateMockCards();
  }

  initPlayers();
  setupEventListeners();
  showMainMenu();
  
  requestAnimationFrame(gameLoop);
}

async function loginDefaultUser() {
  try {
    await axios.post('/api/auth/login', {
      username: 'player1',
      password: '123456'
    });
  } catch (e) {
    console.log('登录失败');
  }
}

function generateMockCards() {
  const elements: CardData['element'][] = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
  const rarities: CardData['rarity'][] = ['common', 'rare', 'epic', 'legendary'];
  const names = ['精灵', '龙', '巨人', '使者', '领主'];
  const spellNames = ['火球术', '冰锥', '岩石投射', '风刃', '圣光', '暗影箭'];

  let id = 1;
  for (const element of elements) {
    for (let i = 0; i < 5; i++) {
      for (let ri = 0; ri < rarities.length; ri++) {
        const rarity = rarities[ri];
        const isSpell = i >= 3;
        allCards.push({
          id: id++,
          name: isSpell ? spellNames[elements.indexOf(element)] : `${element}${names[i]}`,
          element,
          rarity,
          cost: 1 + ri,
          attack: isSpell ? 0 : 2 + ri * 2,
          health: isSpell ? 0 : 3 + ri * 3,
          is_spell: isSpell,
          description: `${rarity}级${element}属性卡牌`
        });
      }
    }
  }
}

function initPlayers() {
  const playerData: PlayerData = {
    id: 'player_1',
    username: '符文守护者',
    level: 5,
    hp: 30,
    maxHp: 30,
    mana: 3,
    maxMana: 10,
    manaPerTurn: 2
  };

  const enemyData: PlayerData = {
    id: 'enemy_1',
    username: '黑暗领主',
    level: 4,
    hp: 30,
    maxHp: 30,
    mana: 3,
    maxMana: 10,
    manaPerTurn: 2
  };

  player = new Player(playerData, false);
  enemy = new Player(enemyData, true);

  player.handFanCenterX = 180;
  player.handFanCenterY = CANVAS_HEIGHT - 50;
  player.handFanRadius = 180;
  player.handFanSpread = 50;

  enemy.handFanCenterX = CANVAS_WIDTH - 180;
  enemy.handFanCenterY = 50;
  enemy.handFanRadius = 180;
  enemy.handFanSpread = 50;

  const playerDeck = allCards.filter(c => c.rarity === 'common' || c.rarity === 'rare').slice(0, 20);
  const enemyDeck = allCards.filter(c => c.rarity === 'common' || c.rarity === 'rare').slice(0, 20);

  player.initDeck(playerDeck);
  enemy.initDeck(enemyDeck);

  player.drawCard(4);
  enemy.drawCard(4);
}

function showMainMenu() {
  uiLayer.innerHTML = '';
  
  const menuDiv = document.createElement('div');
  menuDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    background: rgba(20, 30, 50, 0.95);
    padding: 60px 80px;
    border-radius: 20px;
    border: 2px solid #4488ff;
    box-shadow: 0 0 50px rgba(68, 136, 255, 0.5);
  `;

  const title = document.createElement('h1');
  title.textContent = '符文守护者';
  title.style.cssText = `
    font-size: 48px;
    color: #ffcc00;
    margin-bottom: 10px;
    text-shadow: 0 0 20px rgba(255, 204, 0, 0.8);
  `;

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Rune Guardians';
  subtitle.style.cssText = `
    font-size: 24px;
    color: #88aaff;
    margin-bottom: 40px;
  `;

  const startBtn = document.createElement('button');
  startBtn.textContent = '开始对战';
  startBtn.className = 'game-button';
  startBtn.style.fontSize = '24px';
  startBtn.style.padding = '15px 50px';
  startBtn.onclick = () => startGame();

  menuDiv.appendChild(title);
  menuDiv.appendChild(subtitle);
  menuDiv.appendChild(startBtn);
  uiLayer.appendChild(menuDiv);
}

function startGame() {
  gameState = GameState.PLAYING;
  turnPhase = TurnPhase.PLAYER;
  turnTimeRemaining = TURN_DURATION;
  turnCount = 1;
  cardsPlayedThisMatch = [];
  gameOverData = null;
  
  uiLayer.innerHTML = '';
  
  initPlayers();
  startPlayerTurn();
  initEndTurnButton();
}

function initEndTurnButton() {
  const btn = document.createElement('button');
  btn.id = 'end-turn-btn';
  btn.textContent = '结束回合';
  btn.className = 'game-button';
  btn.style.cssText = `
    position: absolute;
    right: 20px;
    bottom: 20px;
    font-size: 18px;
    padding: 12px 30px;
  `;
  btn.onclick = () => endPlayerTurn();
  uiLayer.appendChild(btn);
}

function startPlayerTurn() {
  turnPhase = TurnPhase.PLAYER;
  turnTimeRemaining = TURN_DURATION;
  player.startTurn();
  gameBoard.resetCreatureActions();
  gameBoard.clearHighlights();
}

function endPlayerTurn() {
  if (turnPhase !== TurnPhase.PLAYER) return;
  
  player.endTurn();
  gameBoard.clearHighlights();
  turnPhase = TurnPhase.ENEMY;
  
  setTimeout(() => {
    executeEnemyTurn();
  }, 500);
}

async function executeEnemyTurn() {
  enemy.startTurn();
  gameBoard.resetCreatureActions();

  const playableCards = enemy.hand.filter(c => c.data.cost <= enemy.data.mana && !c.data.is_spell);
  
  if (playableCards.length > 0) {
    const card = playableCards[Math.floor(Math.random() * playableCards.length)];
    
    const validCells: { x: number; y: number }[] = [];
    for (let y = 0; y < gameBoard.rows; y++) {
      for (let x = 0; x < gameBoard.cols; x++) {
        if (gameBoard.canPlaceCreature(x, y, 'enemy')) {
          validCells.push({ x, y });
        }
      }
    }

    if (validCells.length > 0) {
      const cell = validCells[Math.floor(Math.random() * validCells.length)];
      if (enemy.playCard(card)) {
        gameBoard.placeCreature(card.data, cell.x, cell.y, 'enemy');
        cardsPlayedThisMatch.push(card.data.id);
      }
    }
  }

  const enemyCreatures = gameBoard.creatures.filter(c => c.owner === 'enemy' && !c.hasActed);
  for (const creature of enemyCreatures) {
    const targets = gameBoard.getAttackableTargets(creature);
    if (targets.length > 0) {
      const target = targets[0];
      if (target.creature) {
        await gameBoard.attack(creature, target.creature);
        checkGameOver();
      }
    }
  }

  enemy.endTurn();
  turnCount++;
  startPlayerTurn();
}

function setupEventListeners() {
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('click', onClick);
}

function onMouseMove(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  if (draggingCard) {
    draggingCard.onDrag(x, y);
    
    const cell = gameBoard.getCellAt(x, y);
    if (cell && selectedCardForPlacement === draggingCard) {
      gameBoard.clearHighlights();
      if (gameBoard.canPlaceCreature(cell.x, cell.y, 'player') && !draggingCard.data.is_spell) {
        cell.highlighted = true;
        cell.highlightType = 'valid';
      } else {
        cell.highlighted = true;
        cell.highlightType = 'invalid';
      }
    }
    return;
  }

  if (turnPhase === TurnPhase.PLAYER) {
    const card = player.getTopCardAtPoint(x, y);
    if (card !== hoveredCard) {
      player.setHandHover(card);
      hoveredCard = card;
    }

    if (gameBoard.selectedCreature) {
      const cell = gameBoard.getCellAt(x, y);
      if (cell && cell.creature && cell.creature.owner === 'enemy') {
        const targets = gameBoard.getAttackableTargets(gameBoard.selectedCreature);
        if (targets.includes(cell)) {
          canvas.style.cursor = 'crosshair';
          return;
        }
      }
    }

    const cell = gameBoard.getCellAt(x, y);
    if (cell && cell.creature && cell.creature.owner === 'player' && !cell.creature.hasActed) {
      canvas.style.cursor = 'pointer';
    } else if (card) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  }
}

function onMouseDown(e: MouseEvent) {
  if (turnPhase !== TurnPhase.PLAYER || gameState !== GameState.PLAYING) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  const card = player.getTopCardAtPoint(x, y);
  if (card) {
    draggingCard = card;
    selectedCardForPlacement = card;
    card.startDrag(x, y);
    gameBoard.highlightValidMoves('player');
    canvas.style.cursor = 'grabbing';
  }
}

function onMouseUp(e: MouseEvent) {
  if (!draggingCard || turnPhase !== TurnPhase.PLAYER) {
    if (draggingCard) {
      draggingCard.endDrag();
      draggingCard = null;
      selectedCardForPlacement = null;
      gameBoard.clearHighlights();
    }
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  const cell = gameBoard.getCellAt(x, y);
  
  if (cell && gameBoard.canPlaceCreature(cell.x, cell.y, 'player') && !draggingCard.data.is_spell) {
    if (player.playCard(draggingCard)) {
      gameBoard.placeCreature(draggingCard.data, cell.x, cell.y, 'player');
      cardsPlayedThisMatch.push(draggingCard.data.id);
    }
  }

  draggingCard.endDrag();
  draggingCard = null;
  selectedCardForPlacement = null;
  gameBoard.clearHighlights();
  canvas.style.cursor = 'default';
}

function onClick(e: MouseEvent) {
  if (turnPhase !== TurnPhase.PLAYER || gameState !== GameState.PLAYING) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  const card = player.getCardAtPoint(x, y);
  if (card && !card.isDragging) {
    card.startFlip();
    return;
  }

  const cell = gameBoard.getCellAt(x, y);
  if (cell) {
    if (gameBoard.selectedCreature && cell.creature && cell.creature.owner === 'enemy') {
      const targets = gameBoard.getAttackableTargets(gameBoard.selectedCreature);
      if (targets.includes(cell)) {
        gameBoard.attack(gameBoard.selectedCreature, cell.creature).then(() => {
          checkGameOver();
        });
        gameBoard.clearHighlights();
        return;
      }
    }

    if (cell.creature && cell.creature.owner === 'player' && !cell.creature.hasActed) {
      gameBoard.selectedCreature = cell.creature;
      gameBoard.highlightAttackTargets(cell.creature);
    } else {
      gameBoard.clearHighlights();
    }
  }
}

function checkGameOver() {
  if (player.data.hp <= 0) {
    endGame('enemy');
  } else if (enemy.data.hp <= 0) {
    endGame('player');
  }

  const playerCreatures = gameBoard.creatures.filter(c => c.owner === 'player').length;
  const enemyCreatures = gameBoard.creatures.filter(c => c.owner === 'enemy').length;
  
  if (playerCreatures === 0 && player.hand.length === 0 && player.deck.length === 0) {
    endGame('enemy');
  } else if (enemyCreatures === 0 && enemy.hand.length === 0 && enemy.deck.length === 0) {
    endGame('player');
  }
}

async function endGame(winner: 'player' | 'enemy') {
  gameState = GameState.GAME_OVER;
  
  let rewardCard: CardData | null = null;
  if (winner === 'player') {
    effectManager.startVictoryEffect(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    try {
      const response = await axios.get('/api/cards/random');
      rewardCard = response.data;
    } catch (e) {
      rewardCard = allCards[Math.floor(Math.random() * allCards.length)];
    }

    try {
      await axios.post('/api/matches', {
        player1_id: player.data.id,
        player2_id: enemy.data.id,
        winner_id: player.data.id,
        turns: turnCount,
        cards_played: cardsPlayedThisMatch,
        reward_card: rewardCard?.id
      });
    } catch (e) {
      console.log('保存对局记录失败');
    }
  }

  gameOverData = {
    winner,
    rewardCard,
    rewardFlipped: false
  };

  setTimeout(() => {
    showGameOverPanel();
  }, 2000);
}

function showGameOverPanel() {
  uiLayer.innerHTML = '';
  
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(20, 30, 50, 0.95);
    padding: 40px 60px;
    border-radius: 20px;
    border: 3px solid ${gameOverData?.winner === 'player' ? '#ffcc00' : '#ff4444'};
    box-shadow: 0 0 50px ${gameOverData?.winner === 'player' ? 'rgba(255, 204, 0, 0.5)' : 'rgba(255, 68, 68, 0.5)'};
    text-align: center;
  `;

  const title = document.createElement('h2');
  title.textContent = gameOverData?.winner === 'player' ? '🎉 胜利！' : '💀 失败';
  title.style.cssText = `
    font-size: 36px;
    color: ${gameOverData?.winner === 'player' ? '#ffcc00' : '#ff4444'};
    margin-bottom: 20px;
  `;

  const stats = document.createElement('p');
  stats.textContent = `回合数: ${turnCount}`;
  stats.style.cssText = `
    font-size: 18px;
    color: #ffffff;
    margin-bottom: 20px;
  `;

  panel.appendChild(title);
  panel.appendChild(stats);

  if (gameOverData?.winner === 'player' && gameOverData.rewardCard) {
    const rewardTitle = document.createElement('p');
    rewardTitle.textContent = '获得奖励卡牌：';
    rewardTitle.style.cssText = 'font-size: 18px; color: #ffcc00; margin: 20px 0;';
    panel.appendChild(rewardTitle);

    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 120;
    cardCanvas.height = 170;
    cardCanvas.style.cssText = `
      display: block;
      margin: 0 auto 20px;
      cursor: pointer;
      border-radius: 12px;
      transition: transform 0.2s;
    `;
    cardCanvas.onmouseenter = () => cardCanvas.style.transform = 'scale(1.05)';
    cardCanvas.onmouseleave = () => cardCanvas.style.transform = 'scale(1)';
    
    const cardCtx = cardCanvas.getContext('2d')!;
    drawRewardCard(cardCtx, gameOverData.rewardCard, false);
    
    cardCanvas.onclick = () => {
      if (gameOverData && !gameOverData.rewardFlipped) {
        gameOverData.rewardFlipped = true;
        animateRewardCard(cardCanvas, cardCtx, gameOverData!.rewardCard!);
      }
    };
    
    panel.appendChild(cardCanvas);
  }

  const restartBtn = document.createElement('button');
  restartBtn.textContent = '再来一局';
  restartBtn.className = 'game-button';
  restartBtn.style.fontSize = '18px';
  restartBtn.onclick = () => {
    initPlayers();
    gameBoard = new GameBoard(effectManager, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    startGame();
  };

  const menuBtn = document.createElement('button');
  menuBtn.textContent = '返回主菜单';
  menuBtn.className = 'game-button';
  menuBtn.style.cssText = 'font-size: 18px; margin-left: 10px;';
  menuBtn.onclick = () => {
    gameState = GameState.MENU;
    uiLayer.innerHTML = '';
    showMainMenu();
  };

  const btnContainer = document.createElement('div');
  btnContainer.appendChild(restartBtn);
  btnContainer.appendChild(menuBtn);
  panel.appendChild(btnContainer);

  uiLayer.appendChild(panel);
}

function drawRewardCard(ctx: CanvasRenderingContext2D, card: CardData, showFront: boolean) {
  const w = 120;
  const h = 170;
  
  ctx.clearRect(0, 0, w, h);
  
  if (showFront) {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#2a2a4a');
    gradient.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = RARITY_COLORS[card.rarity];
    ctx.lineWidth = 3;
    roundRect(ctx, 0, 0, w, h, 12);
    ctx.stroke();

    ctx.fillStyle = ELEMENT_COLORS[card.element];
    ctx.beginPath();
    ctx.arc(w / 2, 45, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ELEMENT_SYMBOLS[card.element], w / 2, 45);

    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.fillText(card.name, w / 2, 90);

    if (!card.is_spell) {
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#ff6666';
      ctx.fillText(`⚔ ${card.attack}`, 25, h - 30);
      ctx.fillStyle = '#66ff66';
      ctx.fillText(`❤ ${card.health}`, w - 25, h - 30);
    }

    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    const cx = 18;
    const cy = 18;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const x = cx + Math.cos(angle) * 12;
      const y = cy + Math.sin(angle) * 12;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(card.cost.toString(), cx, cy);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#3a3a5a');
    gradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = RARITY_COLORS[card.rarity];
    ctx.lineWidth = 3;
    roundRect(ctx, 0, 0, w, h, 12);
    ctx.stroke();

    ctx.strokeStyle = RARITY_COLORS[card.rarity];
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x1 = w / 2 + Math.cos(angle) * 30;
      const y1 = h / 2 + Math.sin(angle) * 30;
      const x2 = w / 2 + Math.cos(angle) * 50;
      const y2 = h / 2 + Math.sin(angle) * 50;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('点击翻开', w / 2, h - 20);
  }
}

function animateRewardCard(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, card: CardData) {
  let progress = 0;
  const duration = 400;
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);
    
    const scaleX = Math.cos(progress * Math.PI);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(Math.abs(scaleX), 1);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    drawRewardCard(ctx, card, progress > 0.5);
    
    ctx.restore();

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function gameLoop(timestamp: number) {
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function update(deltaTime: number) {
  if (gameState === GameState.PLAYING) {
    if (turnPhase === TurnPhase.PLAYER) {
      turnTimeRemaining -= deltaTime;
      if (turnTimeRemaining <= 0) {
        endPlayerTurn();
      }
    }

    if (player) player.update(deltaTime);
    if (enemy) enemy.update(deltaTime);
    if (gameBoard) gameBoard.update(deltaTime);
    if (effectManager) effectManager.update(deltaTime);
  } else if (gameState === GameState.GAME_OVER) {
    if (effectManager) effectManager.update(deltaTime);
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (gameState === GameState.MENU) {
    renderMenuBackground();
    return;
  }

  renderBackground();
  
  if (gameBoard) gameBoard.render(ctx);
  
  if (effectManager) effectManager.render(ctx);
  
  if (player) {
    player.render(ctx);
    player.renderUI(ctx, 100, 60, false);
  }
  
  if (enemy) {
    enemy.render(ctx);
    enemy.renderUI(ctx, CANVAS_WIDTH - 100, 60, true);
    renderEnemyPlayHistory();
  }

  if (turnPhase === TurnPhase.PLAYER) {
    renderTurnTimer();
  }

  renderTurnIndicator();
}

function renderMenuBackground() {
  const gradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2
  );
  gradient.addColorStop(0, '#1a2a4e');
  gradient.addColorStop(1, '#0a0a1e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const time = Date.now() * 0.001;
  for (let i = 0; i < 30; i++) {
    const x = (i * 137.5) % CANVAS_WIDTH;
    const y = CANVAS_HEIGHT / 2 + Math.sin(time + i * 0.5) * 150;
    const size = 2 + Math.sin(time * 2 + i) * 1;
    
    ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#1a1a3e');
  gradient.addColorStop(0.5, '#0d1b2a');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function renderTurnTimer() {
  const centerX = CANVAS_WIDTH / 2;
  const centerY = 50;
  const radius = 30;
  const progress = turnTimeRemaining / TURN_DURATION;
  
  const isLow = turnTimeRemaining <= 5;
  const flash = isLow && Math.floor(Date.now() / 200) % 2 === 0;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  const color = isLow ? (flash ? '#ff4444' : '#ff8888') : '#44ff88';
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();

  if (isLow) {
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = flash ? 20 : 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = color;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(turnTimeRemaining).toString(), centerX, centerY);
}

function renderTurnIndicator() {
  const centerX = CANVAS_WIDTH / 2;
  
  ctx.fillStyle = turnPhase === TurnPhase.PLAYER ? 'rgba(68, 255, 136, 0.9)' : 'rgba(255, 68, 68, 0.9)';
  ctx.font = 'bold 24px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.fillText(
    turnPhase === TurnPhase.PLAYER ? '你的回合' : '对手回合',
    centerX,
    90
  );

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px Arial';
  ctx.fillText(`第 ${turnCount} 回合`, centerX, 115);
}

function renderEnemyPlayHistory() {
  const startX = CANVAS_WIDTH - 300;
  const y = 130;
  const cardWidth = 50;
  const cardHeight = 70;
  const spacing = 10;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px Microsoft YaHei';
  ctx.textAlign = 'left';
  ctx.fillText('对手出牌记录:', startX, y - 10);

  for (let i = 0; i < enemy.lastPlayedCards.length; i++) {
    const card = enemy.lastPlayedCards[i];
    const x = startX + i * (cardWidth + spacing);

    ctx.fillStyle = '#2a2a4a';
    roundRect(ctx, x, y, cardWidth, cardHeight, 6);
    ctx.fill();

    ctx.strokeStyle = RARITY_COLORS[card.rarity];
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardWidth, cardHeight, 6);
    ctx.stroke();

    ctx.fillStyle = ELEMENT_COLORS[card.element];
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(ELEMENT_SYMBOLS[card.element], x + cardWidth / 2, y + cardHeight / 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText(card.name.substring(0, 4), x + cardWidth / 2, y + cardHeight - 8);
  }
}

init();
