import {
  Board,
  COLOR_HEX,
  EliminationResult,
  PowerUpType
} from './board';
import { Player } from './player';
import { AnimationManager } from './animation';
import { Renderer, BoardLayout } from './renderer';

type GameState = 'idle' | 'playing' | 'ended';

class GameApp {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  animation: AnimationManager;
  player1: Player;
  player2: Player;
  layoutP1: BoardLayout | null;
  layoutP2: BoardLayout | null;
  gameState: GameState;
  lastTime: number;
  maxScoreForBar: number;

  uiTimer: HTMLElement;
  uiScoreP1: HTMLElement;
  uiScoreP2: HTMLElement;
  uiBarP1: HTMLElement;
  uiBarP2: HTMLElement;
  uiStatus: HTMLElement;
  uiStartBtn: HTMLElement;
  uiResetBtn: HTMLElement;
  canvasWrapper: HTMLElement;

  fireworksSpawned: boolean;
  dimmedPlayers: Set<number>;
  victoryPlayer: number | null;
  victoryTime: number;

  constructor() {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('找不到 Canvas 元素');
    this.canvas = canvas;

    this.animation = new AnimationManager();
    this.renderer = new Renderer(canvas, this.animation);
    this.player1 = new Player(1, '玩家一');
    this.player2 = new Player(2, '玩家二');
    this.layoutP1 = null;
    this.layoutP2 = null;
    this.gameState = 'idle';
    this.lastTime = performance.now();
    this.maxScoreForBar = 2000;

    this.uiTimer = this.requireElement('timerValue');
    this.uiScoreP1 = this.requireElement('scoreP1');
    this.uiScoreP2 = this.requireElement('scoreP2');
    this.uiBarP1 = this.requireElement('barP1');
    this.uiBarP2 = this.requireElement('barP2');
    this.uiStatus = this.requireElement('statusText');
    this.uiStartBtn = this.requireElement('startBtn');
    this.uiResetBtn = this.requireElement('resetBtn');
    this.canvasWrapper = this.requireElement('canvasWrapper');

    this.fireworksSpawned = false;
    this.dimmedPlayers = new Set();
    this.victoryPlayer = null;
    this.victoryTime = 0;

    this.bindEvents();
    this.resizeCanvas();
    this.updateUI();
    this.gameLoop();
  }

  private requireElement(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`找不到元素: ${id}`);
    return el;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('click', (e: MouseEvent) => this.handleCanvasClick(e));

    this.uiStartBtn.addEventListener('click', () => this.startGame());
    this.uiResetBtn.addEventListener('click', () => this.resetGame());
  }

  private resizeCanvas(): void {
    const wrapper = this.canvasWrapper;
    const rect = wrapper.getBoundingClientRect();
    const padding = 40;
    const w = Math.max(400, rect.width - padding);
    const h = Math.max(600, rect.height - padding);
    this.renderer.resize(w, h);
    this.computeLayouts();
  }

  private computeLayouts(): void {
    const cssW = parseFloat(this.canvas.style.width) || this.canvas.width;
    const cssH = parseFloat(this.canvas.style.height) || this.canvas.height;
    const halfH = cssH / 2;

    this.layoutP1 = this.renderer.computeLayout(0, 0, cssW, halfH - 5);
    this.layoutP2 = this.renderer.computeLayout(0, halfH + 5, cssW, halfH - 5);
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (this.gameState !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cssH = parseFloat(this.canvas.style.height) || rect.height;
    const halfH = cssH / 2;

    let player: Player | null = null;
    let layout: BoardLayout | null = null;

    if (clickY < halfH - 2) {
      player = this.player1;
      layout = this.layoutP1;
    } else if (clickY > halfH + 2) {
      player = this.player2;
      layout = this.layoutP2;
    }

    if (!player || !layout) return;
    if (player.board.hasFallingGems()) return;

    const cellX = Math.floor((clickX - layout.x) / layout.cellSize);
    const cellY = Math.floor((clickY - layout.y) / layout.cellSize);

    if (cellX < 0 || cellX >= Board.prototype.size || cellY < 0 || cellY >= Board.prototype.size) {
      return;
    }

    const result = player.selectCell(cellX, cellY);
    const haloKey = `p${player.id}`;

    if (player.selection) {
      this.animation.setSelectionHalo(
        haloKey,
        player.selection.x,
        player.selection.y,
        layout.cellSize
      );
    } else {
      this.animation.clearSelectionHalo(haloKey);
    }

    if (result.shouldSwap) {
      this.animation.clearSelectionHalo(haloKey);
      const swapResult = player.board.trySwap(result.swapX, result.swapY, cellX, cellY);

      if (swapResult.success && swapResult.chainedEliminations.length > 0) {
        this.processEliminations(player, swapResult.chainedEliminations, layout);
      }
    }
  }

  private processEliminations(
    player: Player,
    eliminations: EliminationResult[],
    layout: BoardLayout
  ): void {
    let totalScore = 0;
    const opponent = player.id === 1 ? this.player2 : this.player1;
    const opponentLayout = player.id === 1 ? this.layoutP2 : this.layoutP1;

    let delayAccum = 0;

    for (let i = 0; i < eliminations.length; i++) {
      const elim = eliminations[i];
      const baseScore = elim.eliminatedCount * 10;
      const chainBonus = (elim.chains - 1) * 50;
      const powerBonus = elim.generatedPowerUp ? 50 : 0;
      const scoreGain = baseScore + chainBonus + powerBonus;
      totalScore += scoreGain;

      setTimeout(() => {
        for (const g of elim.eliminatedGems) {
          const cx = layout.x + g.x * layout.cellSize + layout.cellSize / 2;
          const cy = layout.y + g.y * layout.cellSize + layout.cellSize / 2;
          this.animation.spawnShatterParticles(cx, cy, COLOR_HEX[g.color], 18);
        }

        const firstGem = elim.eliminatedGems[0];
        if (firstGem) {
          const tx = layout.x + (firstGem.x + 0.5) * layout.cellSize;
          const ty = layout.y + firstGem.y * layout.cellSize;
          const displayScore = baseScore + chainBonus + powerBonus;
          const label = elim.chains > 1 ? `+${displayScore} x${elim.chains}` : `+${displayScore}`;
          this.animation.spawnFloatingText(tx, ty, label, '#ffffff', 22);
        }

        if (elim.generatedPowerUp && elim.powerUpPosition) {
          player.board.placePowerUp(
            elim.powerUpPosition.x,
            elim.powerUpPosition.y,
            elim.generatedPowerUp as PowerUpType
          );
        }
      }, Math.floor(delayAccum * 1000));

      delayAccum += 0.22;

      if (player.shouldTriggerNegativeEffect([elim]) && opponentLayout) {
        const useRocks = Math.random() > 0.5;
        setTimeout(() => {
          if (useRocks) {
            opponent.dropRocks(2);
            this.showStatus(`${player.name} 向 ${opponent.name} 投掷岩石障碍！`);
          } else {
            opponent.blockCells(2, 3);
            this.showStatus(`${player.name} 封锁了 ${opponent.name} 的格子！`);
          }
        }, Math.floor(delayAccum * 1000));
        delayAccum += 0.15;
      }
    }

    player.score += totalScore;
    this.updateUI();
  }

  private startGame(): void {
    this.player1.reset();
    this.player2.reset();
    this.animation.reset();
    this.fireworksSpawned = false;
    this.dimmedPlayers.clear();
    this.victoryPlayer = null;
    this.victoryTime = 0;
    this.gameState = 'playing';
    this.player1.setActive(true);
    this.player2.setActive(true);
    this.uiStartBtn.textContent = '游戏中...';
    this.uiStartBtn.setAttribute('disabled', 'true');
    this.showStatus('对战开始！消除宝石获得积分，向对手施加负面效果！');
    this.updateUI();
  }

  private resetGame(): void {
    this.player1.reset();
    this.player2.reset();
    this.animation.reset();
    this.fireworksSpawned = false;
    this.dimmedPlayers.clear();
    this.victoryPlayer = null;
    this.victoryTime = 0;
    this.gameState = 'idle';
    this.uiStartBtn.textContent = '开始游戏';
    this.uiStartBtn.removeAttribute('disabled');
    this.showStatus('点击「开始游戏」开始对战');
    this.updateUI();
  }

  private endGame(): void {
    this.gameState = 'ended';
    this.player1.setActive(false);
    this.player2.setActive(false);
    this.animation.clearAllHalos();

    let winner: Player | null = null;
    let loser: Player | null = null;

    if (this.player1.score > this.player2.score) {
      winner = this.player1;
      loser = this.player2;
    } else if (this.player2.score > this.player1.score) {
      winner = this.player2;
      loser = this.player1;
    }

    if (winner && loser) {
      this.victoryPlayer = winner.id;
      this.victoryTime = performance.now();
      this.dimmedPlayers.add(loser.id);
      this.showStatus(`🏆 ${winner.name} 获胜！最终得分: ${winner.score} vs ${loser.score}`);

      const winnerLayout = winner.id === 1 ? this.layoutP1 : this.layoutP2;
      if (winnerLayout) {
        setTimeout(() => {
          this.spawnVictory(winnerLayout);
        }, 300);
      }
    } else {
      this.showStatus(`⚖️ 平局！双方得分: ${this.player1.score} vs ${this.player2.score}`);
    }

    this.uiStartBtn.textContent = '再来一局';
    this.uiStartBtn.removeAttribute('disabled');
  }

  private spawnVictory(layout: BoardLayout): void {
    this.animation.spawnVictoryFireworks(
      layout.width,
      layout.height,
      layout.x,
      layout.y,
      20
    );
  }

  private showStatus(text: string): void {
    this.uiStatus.textContent = text;
  }

  private updateUI(): void {
    const mins = Math.floor(this.player1.timeRemaining / 60);
    const secs = Math.floor(this.player1.timeRemaining % 60);
    this.uiTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.uiScoreP1.textContent = String(this.player1.score);
    this.uiScoreP2.textContent = String(this.player2.score);

    const p1Pct = Math.min(100, (this.player1.score / this.maxScoreForBar) * 100);
    const p2Pct = Math.min(100, (this.player2.score / this.maxScoreForBar) * 100);
    this.uiBarP1.style.width = p1Pct + '%';
    this.uiBarP2.style.width = p2Pct + '%';

    if (this.player1.score > this.maxScoreForBar || this.player2.score > this.maxScoreForBar) {
      this.maxScoreForBar = Math.max(this.player1.score, this.player2.score) * 1.2;
    }
  }

  private update(dt: number): void {
    this.animation.update(dt);

    if (this.gameState === 'playing') {
      this.player1.update(dt);
      this.player2.update(dt);

      const timeUp = this.player1.updateTimer(dt);
      this.player2.timeRemaining = this.player1.timeRemaining;

      this.updateUI();

      if (timeUp) {
        this.endGame();
      }
    }
  }

  private render(): void {
    const { renderer, animation } = this;

    renderer.clear();
    renderer.drawBackground();

    const cssW = parseFloat(this.canvas.style.width) || this.canvas.width;
    const cssH = parseFloat(this.canvas.style.height) || this.canvas.height;
    const halfH = cssH / 2;

    renderer.drawSplitLine(halfH, cssW);

    if (this.layoutP1) {
      this.renderBoardForPlayer(this.player1, this.layoutP1, 1);
    }
    if (this.layoutP2) {
      this.renderBoardForPlayer(this.player2, this.layoutP2, 2);
    }

    const haloP1 = animation.getHalo('p1');
    if (haloP1 && this.layoutP1) {
      haloP1.cellSize = this.layoutP1.cellSize;
      renderer.drawSelectionHalo(haloP1, this.layoutP1);
    }
    const haloP2 = animation.getHalo('p2');
    if (haloP2 && this.layoutP2) {
      haloP2.cellSize = this.layoutP2.cellSize;
      renderer.drawSelectionHalo(haloP2, this.layoutP2);
    }

    renderer.drawParticles(animation.getParticles());
    renderer.drawParticles(animation.getFireworkParticles());
    renderer.drawFloatingTexts(animation.getFloatingTexts());
  }

  private renderBoardForPlayer(player: Player, layout: BoardLayout, id: number): void {
    const { renderer } = this;
    renderer.drawBoard(player.board, layout, id);

    const shouldDim = this.dimmedPlayers.has(id);
    if (shouldDim) {
      renderer.drawDimOverlay(layout, 1);
    }

    if (this.victoryPlayer === id) {
      renderer.drawVictoryGlow(layout, 1);
    }
  }

  private gameLoop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new GameApp();
  } catch (e) {
    console.error('游戏初始化失败:', e);
  }
});
