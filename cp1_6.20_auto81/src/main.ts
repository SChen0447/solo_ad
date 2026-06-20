import { RenderEngine } from './RenderEngine';
import { InputManager } from './InputManager';
import { GameManager } from './GameManager';

class GameApp {
  private renderEngine: RenderEngine;
  private inputManager: InputManager;
  private gameManager: GameManager;

  private container: HTMLElement;
  private chargeCanvas: HTMLCanvasElement;
  private chargeCtx: CanvasRenderingContext2D;

  private lastTime: number = 0;
  private animationId: number = 0;
  private selectedPlayerCount: number = 3;

  private countdownTimer: number = 0;
  private countdownValue: number = 3;

  private celebrationCanvas: HTMLCanvasElement;
  private celebrationCtx: CanvasRenderingContext2D;
  private celebrationParticles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
    size: number;
  }[] = [];

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');
    this.container = container;

    this.renderEngine = new RenderEngine(container);
    this.inputManager = new InputManager();
    this.gameManager = new GameManager(this.renderEngine, this.inputManager);

    const chargeCanvas = document.getElementById('charge-canvas') as HTMLCanvasElement;
    if (!chargeCanvas) throw new Error('Charge canvas not found');
    this.chargeCanvas = chargeCanvas;
    this.chargeCtx = chargeCanvas.getContext('2d')!;

    const celebrationCanvas = document.getElementById('celebration-canvas') as HTMLCanvasElement;
    if (!celebrationCanvas) throw new Error('Celebration canvas not found');
    this.celebrationCanvas = celebrationCanvas;
    this.celebrationCtx = celebrationCanvas.getContext('2d')!;
    this.celebrationCanvas.width = window.innerWidth;
    this.celebrationCanvas.height = window.innerHeight;

    this.setupUI();
    this.startGameLoop();
  }

  private setupUI(): void {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.onStartClick());
    }

    const playerSelectBtns = document.querySelectorAll('.player-select-btn');
    playerSelectBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const count = parseInt(target.dataset.players || '2', 10);
        this.selectedPlayerCount = count;

        playerSelectBtns.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
      });
    });

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.onNextRoundClick());
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.onRestartClick());
    }

    window.addEventListener('resize', () => {
      this.celebrationCanvas.width = window.innerWidth;
      this.celebrationCanvas.height = window.innerHeight;
    });
  }

  private onStartClick(): void {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.style.display = 'none';
    }

    this.gameManager.startGame(this.selectedPlayerCount);
    this.startCountdown();
    this.updateHUD();
  }

  private onNextRoundClick(): void {
    const scorePanel = document.getElementById('score-panel');
    if (scorePanel) {
      scorePanel.style.display = 'none';
    }

    const hasNextRound = this.gameManager.startNextRound();
    if (hasNextRound) {
      this.startCountdown();
      this.updateHUD();
    } else {
      this.showFinalPanel();
    }
  }

  private onRestartClick(): void {
    const finalPanel = document.getElementById('final-panel');
    if (finalPanel) {
      finalPanel.style.display = 'none';
    }

    const celebrationCanvas = document.getElementById('celebration-canvas');
    if (celebrationCanvas) {
      celebrationCanvas.style.display = 'none';
    }

    this.gameManager.startGame(this.selectedPlayerCount);
    this.startCountdown();
    this.updateHUD();
  }

  private startCountdown(): void {
    this.countdownTimer = 0;
    this.countdownValue = 3;
    this.gameManager.setGameState('countdown');
  }

  private updateCountdown(deltaTime: number): void {
    if (this.gameManager.getGameState() !== 'countdown') return;

    this.countdownTimer += deltaTime;

    const newValue = 3 - Math.floor(this.countdownTimer);
    if (newValue !== this.countdownValue) {
      this.countdownValue = newValue;
    }

    if (this.countdownTimer >= 3) {
      this.gameManager.startRound();
    }
  }

  private updateHUD(): void {
    const roundInfo = document.getElementById('round-info');
    if (roundInfo) {
      roundInfo.textContent = `第 ${this.gameManager.getCurrentRound()}/${this.gameManager.getTotalRounds()} 局`;
    }

    const playerScores = document.getElementById('player-scores');
    if (playerScores) {
      playerScores.innerHTML = '';

      for (let i = 0; i < this.gameManager.getPlayerCount(); i++) {
        const players = this.gameManager.getPlayers();
        const player = players[i];
        if (!player) continue;

        const playerScoreDiv = document.createElement('div');
        playerScoreDiv.className = 'player-score';
        playerScoreDiv.style.color = this.gameManager.getPlayerColor(i);

        const avatar = document.createElement('span');
        avatar.className = 'player-avatar';
        avatar.style.background = this.gameManager.getPlayerColor(i);

        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = this.gameManager.getPlayerName(i);

        const score = document.createElement('span');
        score.textContent = `${player.score}分`;

        playerScoreDiv.appendChild(avatar);
        playerScoreDiv.appendChild(name);
        playerScoreDiv.appendChild(score);

        playerScores.appendChild(playerScoreDiv);
      }
    }

    const fpsWarning = document.getElementById('fps-warning');
    if (fpsWarning) {
      fpsWarning.style.display = this.gameManager.isLowFPUMode() ? 'block' : 'none';
    }
  }

  private drawChargeBar(): void {
    const ctx = this.chargeCtx;
    const w = this.chargeCanvas.width;
    const h = this.chargeCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const player0 = this.gameManager.getPlayers()[0];
    if (!player0) return;

    const chargeRatio = player0.chargeTime / 2.0;
    const isCharging = player0.isCharging;

    const outerRadius = 45;
    const innerRadius = 35;
    const lineWidth = outerRadius - innerRadius;

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius - lineWidth / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    if (isCharging && chargeRatio > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + chargeRatio * Math.PI * 2;

      const gradient = ctx.createLinearGradient(cx - outerRadius, cy, cx + outerRadius, cy);
      gradient.addColorStop(0, '#4caf50');
      gradient.addColorStop(0.5, '#ffc107');
      gradient.addColorStop(1, '#f44336');

      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius - lineWidth / 2, startAngle, endAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (chargeRatio >= 1) {
        const flash = Math.sin(performance.now() / 100) > 0;
        if (flash) {
          ctx.beginPath();
          ctx.arc(cx, cy, outerRadius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }

    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('蓄力', cx, cy);
  }

  private showRoundEndPanel(): void {
    const scorePanel = document.getElementById('score-panel');
    if (!scorePanel) return;

    const scoreTitle = document.getElementById('score-title');
    if (scoreTitle) {
      scoreTitle.textContent = `第 ${this.gameManager.getCurrentRound()} 局结束`;
    }

    const roundScores = document.getElementById('round-scores');
    if (roundScores) {
      roundScores.innerHTML = '';

      const rankings = this.gameManager.getRoundRankings();
      for (const rank of rankings) {
        const li = document.createElement('li');

        const rankBadge = document.createElement('span');
        rankBadge.className = `rank-badge rank-${rank.rank}`;
        rankBadge.textContent = rank.rank.toString();

        const name = document.createElement('span');
        name.style.color = rank.color;
        name.textContent = rank.name;

        const score = document.createElement('span');
        score.textContent = `+${rank.score}分`;

        li.appendChild(rankBadge);
        li.appendChild(name);
        li.appendChild(score);
        roundScores.appendChild(li);
      }
    }

    scorePanel.style.display = 'block';
  }

  private showFinalPanel(): void {
    const finalPanel = document.getElementById('final-panel');
    if (!finalPanel) return;

    const finalScores = document.getElementById('final-scores');
    if (finalScores) {
      finalScores.innerHTML = '';

      const rankings = this.gameManager.getFinalRankings();
      for (const rank of rankings) {
        const li = document.createElement('li');

        const rankBadge = document.createElement('span');
        rankBadge.className = `rank-badge rank-${rank.rank}`;
        rankBadge.textContent = rank.rank.toString();

        const name = document.createElement('span');
        name.style.color = rank.color;
        name.textContent = rank.name;

        const score = document.createElement('span');
        score.textContent = `${rank.totalScore}分`;

        li.appendChild(rankBadge);
        li.appendChild(name);
        li.appendChild(score);
        finalScores.appendChild(li);
      }
    }

    finalPanel.style.display = 'block';

    const celebrationCanvas = document.getElementById('celebration-canvas');
    if (celebrationCanvas) {
      celebrationCanvas.style.display = 'block';
      this.spawnCelebrationParticles();
    }
  }

  private spawnCelebrationParticles(): void {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#ffffff', '#ffd54f', '#81d4fa'];
    const count = 150;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;

      this.celebrationParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 2 + Math.random() * 1,
        maxLife: 3,
        size: 4 + Math.random() * 8
      });
    }
  }

  private updateCelebrationParticles(deltaTime: number): void {
    const gravity = 30;

    for (let i = this.celebrationParticles.length - 1; i >= 0; i--) {
      const p = this.celebrationParticles[i];

      p.vy += gravity * deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.celebrationParticles.splice(i, 1);
      }
    }

    const ctx = this.celebrationCtx;
    ctx.clearRect(0, 0, this.celebrationCanvas.width, this.celebrationCanvas.height);

    for (const p of this.celebrationParticles) {
      const alpha = Math.min(p.life / p.maxLife, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    deltaTime = Math.min(deltaTime, 0.05);
    this.lastTime = currentTime;

    this.gameManager.update(deltaTime);
    this.renderEngine.update(deltaTime);

    this.updateCountdown(deltaTime);
    this.drawChargeBar();
    this.updateCelebrationParticles(deltaTime);

    if (this.gameManager.getGameState() === 'roundEnd') {
      const scorePanel = document.getElementById('score-panel');
      if (scorePanel && scorePanel.style.display !== 'block') {
        this.showRoundEndPanel();
        this.updateHUD();
      }
    }
  };

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderEngine.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
