import type { Player, Monster, Card, Position, MapData } from './types';
import { GameBoard } from './GameBoard';
import { CardSystem } from './CardSystem';
import { CombatSystem } from './CombatSystem';

const PLAYER_MAX_HP = 20;

interface GameState {
  phase: 'loading' | 'playing' | 'victory' | 'gameover';
  turn: 'player' | 'monster';
  turnCount: number;
  isProcessing: boolean;
}

class Game {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  gameBoard!: GameBoard;
  cardSystem!: CardSystem;
  combatSystem!: CombatSystem;
  player!: Player;
  monsters!: Monster[];
  state!: GameState;
  mapData!: MapData;
  lastFrameTime: number = 0;
  fps: number = 60;
  fpsCounter: { frames: number; lastUpdate: number; current: number } = { frames: 0, lastUpdate: 0, current: 60 };
  pendingTurnButton: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 120, h: 40 };
  turnButtonHovered: boolean = false;
  messageLog: { text: string; time: number; alpha: number }[] = [];
  turnEndButton: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };

  async init(): Promise<void> {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.gameBoard = new GameBoard(this.canvas);
    this.cardSystem = new CardSystem(this.canvas, this.gameBoard);

    this.state = {
      phase: 'loading',
      turn: 'player',
      turnCount: 1,
      isProcessing: false,
    };

    await this.loadData();
    this.bindEvents();
    this.hideLoadingScreen();

    this.state.phase = 'playing';
    this.addLog('地牢探索开始！拖动卡牌到地图上释放。');
    this.gameLoop(performance.now());
  }

  async loadData(): Promise<void> {
    try {
      const [mapRes, cardRes, monsterRes] = await Promise.all([
        fetch('/api/map').then(r => r.json()),
        fetch('/api/cards').then(r => r.json()),
        fetch('/api/monsters').then(r => r.json()),
      ]);

      this.mapData = mapRes as MapData;
      this.gameBoard.setMapData(this.mapData);

      this.player = {
        x: this.mapData.playerStart.x,
        y: this.mapData.playerStart.y,
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
      };

      this.monsters = monsterRes.monsters.map((m: Monster) => ({ ...m, hp: m.hp }));

      this.combatSystem = new CombatSystem(this.gameBoard, this.player, this.monsters);
      this.combatSystem.onCombatEvent = (event) => this.addLog(event);

      this.cardSystem.loadCards(cardRes);

      this.cardSystem.onCardPlayed = async (card: Card, target: Position | null) => {
        await this.onCardPlayed(card, target);
      };
    } catch (e) {
      console.error('数据加载失败，使用本地数据：', e);
      await this.loadLocalData();
    }
  }

  async loadLocalData(): Promise<void> {
    const mapData = (await import('./data/mapData.json')).default as any;
    const cardData = (await import('./data/cardData.json')).default as any;
    const monsterData = (await import('./data/monsterData.json')).default as any;

    this.mapData = mapData;
    this.gameBoard.setMapData(mapData);

    this.player = {
      x: mapData.playerStart.x,
      y: mapData.playerStart.y,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
    };

    this.monsters = monsterData.monsters.map((m: Monster) => ({ ...m, hp: m.hp }));
    this.combatSystem = new CombatSystem(this.gameBoard, this.player, this.monsters);
    this.combatSystem.onCombatEvent = (event) => this.addLog(event);
    this.cardSystem.loadCards(cardData);
    this.cardSystem.onCardPlayed = async (card: Card, target: Position | null) => {
      await this.onCardPlayed(card, target);
    };
  }

  hideLoadingScreen(): void {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => {
        loading.style.display = 'none';
      }, 800);
    }
  }

  bindEvents(): void {
    let isDragging = false;

    const getMousePos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.state.phase !== 'playing' || this.state.turn !== 'player' || this.state.isProcessing) return;
      const pos = getMousePos(e);
      if (this.isEndTurnButton(pos.x, pos.y)) {
        this.endPlayerTurn();
        return;
      }
      isDragging = true;
      this.cardSystem.handleMouseDown(pos.x, pos.y);
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const pos = getMousePos(e);
      this.turnButtonHovered = this.isEndTurnButton(pos.x, pos.y);
      if (this.state.phase !== 'playing' || this.state.turn !== 'player' || this.state.isProcessing) return;
      this.cardSystem.handleMouseMove(pos.x, pos.y, this.player, this.monsters);
    });

    this.canvas.addEventListener('mouseup', (e: MouseEvent) => {
      isDragging = false;
      if (this.state.phase !== 'playing' || this.state.turn !== 'player' || this.state.isProcessing) return;
      const pos = getMousePos(e);
      this.cardSystem.handleMouseUp(pos.x, pos.y, this.player, this.monsters);
    });

    this.canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      this.turnButtonHovered = false;
      this.gameBoard.clearHighlights();
      this.cardSystem.draggedCard = null;
      this.cardSystem.hoveredIndex = -1;
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      if (this.state.phase !== 'playing' || this.state.turn !== 'player' || this.state.isProcessing) return;
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const pos = getMousePos(t);
        if (this.isEndTurnButton(pos.x, pos.y)) {
          this.endPlayerTurn();
          return;
        }
        isDragging = true;
        this.cardSystem.handleMouseDown(pos.x, pos.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const pos = getMousePos(t);
        this.turnButtonHovered = this.isEndTurnButton(pos.x, pos.y);
        if (this.state.phase !== 'playing' || this.state.turn !== 'player' || this.state.isProcessing) return;
        this.cardSystem.handleMouseMove(pos.x, pos.y, this.player, this.monsters);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      isDragging = false;
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const pos = getMousePos(t);
        if (this.state.phase !== 'playing' || this.state.turn !== 'player' || this.state.isProcessing) return;
        this.cardSystem.handleMouseUp(pos.x, pos.y, this.player, this.monsters);
      }
    }, { passive: false });

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.restart());
    }

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.restart());
    }
  }

  isEndTurnButton(x: number, y: number): boolean {
    const btn = this.pendingTurnButton;
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  async onCardPlayed(card: Card, target: Position | null): Promise<void> {
    if (this.state.isProcessing) return;
    this.state.isProcessing = true;
    const result = await this.combatSystem.executeCard(card, target);
    for (const msg of result.logMessages) {
      this.addLog(msg);
    }
    this.state.isProcessing = false;
    if (result.playerDied || this.combatSystem.isPlayerDead()) {
      this.gameOver();
      return;
    }
    if (result.allMonstersDead) {
      this.victory();
      return;
    }
    if (this.cardSystem.hand.length === 0 && this.cardSystem.energy === 0) {
      setTimeout(() => this.endPlayerTurn(), 500);
    }
  }

  async endPlayerTurn(): Promise<void> {
    if (this.state.isProcessing || this.state.turn !== 'player') return;
    this.state.isProcessing = true;
    this.addLog(`回合 ${this.state.turnCount} 结束，怪物行动中...`);
    this.state.turn = 'monster';
    await this.combatSystem.monstersTurn();
    if (this.combatSystem.isPlayerDead()) {
      this.gameOver();
      this.state.isProcessing = false;
      return;
    }
    this.state.turnCount++;
    this.combatSystem.turnCount = this.state.turnCount;
    this.state.turn = 'player';
    this.cardSystem.startTurn();
    this.addLog(`回合 ${this.state.turnCount} 开始！`);
    this.state.isProcessing = false;
  }

  gameOver(): void {
    this.state.phase = 'gameover';
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      setTimeout(() => {
        deathScreen.classList.add('show');
      }, 300);
    }
  }

  victory(): void {
    this.state.phase = 'victory';
    const kc = document.getElementById('kill-count');
    if (kc) kc.textContent = String(this.combatSystem.killCount);
    const tc = document.getElementById('turn-count');
    if (tc) tc.textContent = String(this.state.turnCount);
    const vp = document.getElementById('victory-panel');
    if (vp) {
      setTimeout(() => {
        vp.classList.add('show');
      }, 1200);
    }
  }

  restart(): void {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) deathScreen.classList.remove('show');
    const vp = document.getElementById('victory-panel');
    if (vp) vp.classList.remove('show');
    this.init();
  }

  addLog(text: string): void {
    this.messageLog.unshift({ text, time: performance.now(), alpha: 1 });
    if (this.messageLog.length > 4) this.messageLog.pop();
  }

  gameLoop = (currentTime: number): void => {
    const deltaTime = Math.min(currentTime - this.lastFrameTime, 50);
    this.lastFrameTime = currentTime;

    this.fpsCounter.frames++;
    if (currentTime - this.fpsCounter.lastUpdate >= 1000) {
      this.fpsCounter.current = this.fpsCounter.frames;
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastUpdate = currentTime;
    }

    this.gameBoard.update(deltaTime);
    this.cardSystem.update(deltaTime);
    this.updateLogAlpha(deltaTime);

    this.render(currentTime);

    requestAnimationFrame(this.gameLoop);
  };

  updateLogAlpha(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (const msg of this.messageLog) {
      const age = performance.now() - msg.time;
      if (age > 4000) {
        msg.alpha = Math.max(0, msg.alpha - dt * 0.5);
      }
    }
  }

  render(time: number): void {
    this.gameBoard.render(this.player, this.monsters, time);
    this.cardSystem.render(time);
    this.drawUI(time);
  }

  drawUI(time: number): void {
    this.drawResourceBar(time);
    this.drawEndTurnButton(time);
    this.drawMessageLog();
    this.drawPhaseIndicator(time);
    this.drawWeaknessHints();
  }

  drawResourceBar(time: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const barY = 15;
    const barW = Math.min(rect.width - 40, 560);
    const barX = (rect.width - barW) / 2;
    const barH = 56;

    ctx.save();

    this.drawScrollBar(ctx, barX, barY, barW, barH);

    const centerX = barX + barW / 2;
    const iconSize = 22;
    const leftGroupX = barX + 50;

    ctx.shadowBlur = 6;
    ctx.shadowColor = '#fc8181';
    this.drawHeart(ctx, leftGroupX, barY + barH / 2, iconSize, '#fc8181');
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.player.hp} / ${this.player.maxHp}`, leftGroupX + iconSize * 0.8, barY + barH / 2);

    const centerGroupX = centerX - 30;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#63b3ed';
    this.drawDiamond(ctx, centerGroupX, barY + barH / 2, iconSize, '#63b3ed');
    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px Georgia, serif';
    const deckCount = this.cardSystem.deck.length;
    ctx.fillText(`${deckCount}`, centerGroupX + iconSize * 0.8, barY + barH / 2);

    ctx.shadowBlur = 6;
    ctx.shadowColor = '#d69e2e';
    this.drawEnergyOrbs(ctx, centerGroupX + 110, barY + barH / 2, iconSize, this.cardSystem.energy, this.cardSystem.maxEnergy);
    ctx.shadowBlur = 0;

    const rightGroupX = barX + barW - 120;
    ctx.fillStyle = '#ecc94b';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(`回合 ${this.state.turnCount}`, barX + barW - 40, barY + barH / 2);

    ctx.restore();
  }

  drawScrollBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();

    const innerColor = 'rgba(45, 55, 72, 0.6)';
    ctx.fillStyle = innerColor;
    const scrollEnd = 28;

    this.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(214, 158, 46, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 7);
    ctx.stroke();

    ctx.strokeStyle = '#8b6343';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + h / 2);
    ctx.bezierCurveTo(x - scrollEnd * 0.3, y + h / 2 - scrollEnd * 0.2, x - scrollEnd * 0.3, y + h / 2 + scrollEnd * 0.2, x - 2, y + h / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + w + 2, y + h / 2);
    ctx.bezierCurveTo(x + w + scrollEnd * 0.3, y + h / 2 - scrollEnd * 0.2, x + w + scrollEnd * 0.3, y + h / 2 + scrollEnd * 0.2, x + w + 2, y + h / 2);
    ctx.stroke();

    ctx.fillStyle = '#5c4033';
    ctx.beginPath();
    ctx.ellipse(x - 6, y + h / 2, 8, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d2a22';
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x + w + 6, y + h / 2, 8, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    const s = size / 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.6);
    ctx.bezierCurveTo(s, s * 0.3, s, -s * 0.7, 0, -s * 0.2);
    ctx.bezierCurveTo(-s, -s * 0.7, -s, s * 0.3, 0, s * 0.6);
    ctx.fill();
    ctx.strokeStyle = '#4a0000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    const s = size / 2;
    ctx.fillRect(-s, -s, size, size);
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-s, -s, size, size);
    ctx.restore();
  }

  drawEnergyOrbs(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, current: number, max: number): void {
    const spacing = 22;
    for (let i = 0; i < max; i++) {
      const ox = x + i * spacing;
      const active = i < current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ox, y, size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#ecc94b' : '#4a5568';
      ctx.shadowBlur = active ? 10 : 0;
      ctx.shadowColor = '#ecc94b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = active ? '#b7791f' : '#2d3748';
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEndTurnButton(time: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const w = 130;
    const h = 42;
    const x = rect.width - w - 30;
    const y = rect.height - h - 170;

    this.pendingTurnButton = { x, y, w, h };

    const disabled = this.state.turn !== 'player' || this.state.isProcessing;
    const hovered = this.turnButtonHovered;
    const offset = hovered && !disabled ? -2 : 0;

    ctx.save();
    ctx.translate(0, offset);

    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, disabled ? '#2d3748' : '#4a5568');
    grd.addColorStop(1, disabled ? '#1a202c' : '#2d3748');
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = grd;
    ctx.fill();

    const lineOuter = hovered && !disabled ? '#ecc94b' : '#d69e2e';
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#b7791f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = lineOuter;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = disabled ? '#718096' : '#ecc94b';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = hovered && !disabled ? 6 : 0;
    ctx.shadowColor = '#ecc94b';
    ctx.fillText('结束回合', x + w / 2, y + h / 2);

    ctx.restore();
  }

  drawMessageLog(): void {
    if (this.messageLog.length === 0) return;
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const baseY = rect.height - 200;
    const startX = 30;
    ctx.save();
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < this.messageLog.length; i++) {
      const msg = this.messageLog[i];
      if (msg.alpha <= 0) continue;
      const y = baseY + i * 20;
      ctx.globalAlpha = msg.alpha;
      const text = `> ${msg.text}`;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#000';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(text, startX, y);
    }
    ctx.restore();
  }

  drawPhaseIndicator(time: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const x = rect.width / 2;
    const y = 95;
    ctx.save();
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let text = '';
    let color = '';
    if (this.state.phase === 'gameover') {
      text = '💀 阵亡';
      color = '#fc8181';
    } else if (this.state.phase === 'victory') {
      text = '🏆 胜利';
      color = '#ecc94b';
    } else if (this.state.turn === 'player') {
      text = '⚔️ 你的回合';
      color = '#63b3ed';
    } else {
      text = '👹 敌方回合';
      color = '#fc8181';
    }
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawWeaknessHints(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const baseY = rect.height - 165;
    const startX = rect.width - 260;
    ctx.save();
    const alive = this.monsters.filter(m => !m.isDead);
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    for (let i = 0; i < alive.length; i++) {
      const m = alive[i];
      const y = baseY + i * 18;
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#000';
      ctx.fillStyle = m.color;
      const weakText = this.weaknessToText(m.weakness);
      ctx.fillText(`${m.name}  弱点: ${weakText}`, startX + 230, y);
    }
    ctx.restore();
  }

  weaknessToText(w: string): string {
    switch (w) {
      case 'physical': return '物理 ⚔️';
      case 'fire': return '火焰 🔥';
      case 'ranged': return '远程 🏹';
      default: return w;
    }
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
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init().catch(err => console.error('游戏初始化失败:', err));
});
