import { BallManager, Ball } from '../engine/BallManager';
import { TableGeometry } from '../engine/TableGeometry';
import { PhysicsEngine, PocketEvent } from '../engine/PhysicsEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  currentPlayer: number;
  scores: [number, number];
  gameOver: boolean;
  winner: number | null;
  phase: 'placing' | 'aiming' | 'moving' | 'gameover';
}

export class GameUI {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ballManager: BallManager;
  private geometry: TableGeometry;
  private physics: PhysicsEngine;

  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private powerAnim: number = 0;
  private readonly MAX_DRAG_DISTANCE = 300;

  private particles: Particle[] = [];

  private gameState: GameState;

  private placingCue: boolean = false;

  private onStrikeCallback: ((dx: number, dy: number, power: number) => void) | null = null;
  private onResetCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;
  private onRerackCallback: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    ballManager: BallManager,
    geometry: TableGeometry,
    physics: PhysicsEngine
  ) {
    this.container = container;
    this.ballManager = ballManager;
    this.geometry = geometry;
    this.physics = physics;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);

    this.gameState = {
      currentPlayer: 1,
      scores: [0, 0],
      gameOver: false,
      winner: null,
      phase: 'aiming'
    };

    this.setupEventListeners();
    this.handleResize();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      if (this.isDragging && this.gameState.phase === 'aiming') {
        this.isDragging = false;
      }
    });
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (this.gameState.gameOver) {
      const modalH = 250;
      const my = (h - modalH) / 2;
      const btnW = 160;
      const btnH = 45;
      const bx = w / 2 - btnW / 2;
      const by = my + modalH - btnH - 25;
      if (cx >= bx && cx <= bx + btnW && cy >= by && cy <= by + btnH) {
        if (this.onRestartCallback) this.onRestartCallback();
        return;
      }
    }

    const rerackBtnW = 120;
    const rerackBtnH = 40;
    const rerackX = w - rerackBtnW - 20;
    const rerackY = h - rerackBtnH - 20 - 50;
    if (cx >= rerackX && cx <= rerackX + rerackBtnW && cy >= rerackY && cy <= rerackY + rerackBtnH) {
      if (this.onRerackCallback) this.onRerackCallback();
      return;
    }

    const resetBtnW = 120;
    const resetBtnH = 40;
    const resetX = w - resetBtnW - 20;
    const resetY = h - resetBtnH - 20;
    if (cx >= resetX && cx <= resetX + resetBtnW && cy >= resetY && cy <= resetY + resetBtnH) {
      if (this.onResetCallback) this.onResetCallback();
      return;
    }
  }

  private handleResize(): void {
    const parent = this.container.parentElement || this.container;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    this.canvas.width = w * window.devicePixelRatio;
    this.canvas.height = h * window.devicePixelRatio;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    const tableW = this.geometry.width;
    const tableH = this.geometry.height;
    const scaleX = w / tableW;
    const scaleY = h / tableH;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (w - tableW * this.scale) / 2;
    this.offsetY = (h - tableH * this.scale) / 2;
  }

  private screenToTable(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (sx - rect.left - this.offsetX) / this.scale,
      y: (sy - rect.top - this.offsetY) / this.scale
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.gameState.gameOver) return;
    const pos = this.screenToTable(e.clientX, e.clientY);

    if (this.placingCue) {
      this.ballManager.setCueBallPosition(pos.x, pos.y);
      this.placingCue = false;
      this.gameState.phase = 'aiming';
      return;
    }

    if (this.gameState.phase !== 'aiming') return;

    const cue = this.ballManager.getCueBall();
    if (!cue) return;

    const dx = pos.x - cue.x;
    const dy = pos.y - cue.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < cue.radius + 30) {
      this.isDragging = true;
      this.dragStartX = cue.x;
      this.dragStartY = cue.y;
      this.mouseX = pos.x;
      this.mouseY = pos.y;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.screenToTable(e.clientX, e.clientY);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.isDragging) {
      const dx = this.dragStartX - this.mouseX;
      const dy = this.dragStartY - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.powerAnim = Math.min(dist / this.MAX_DRAG_DISTANCE * 100, 100);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isDragging || this.gameState.phase !== 'aiming') {
      this.isDragging = false;
      return;
    }

    const pos = this.screenToTable(e.clientX, e.clientY);
    const cue = this.ballManager.getCueBall();
    if (!cue) return;

    const dx = this.dragStartX - pos.x;
    const dy = this.dragStartY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      this.isDragging = false;
      return;
    }

    const power = Math.min(this.powerAnim, 100);
    this.spawnStrikeParticles(cue.x, cue.y, dx, dy);

    if (this.onStrikeCallback) {
      this.onStrikeCallback(dx, dy, power);
    }

    this.isDragging = false;
    this.gameState.phase = 'moving';
  }

  private spawnStrikeParticles(x: number, y: number, dx: number, dy: number): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const nx = dx / len;
    const ny = dy / len;

    for (let i = 0; i < 15; i++) {
      const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.8;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: '#FFFFFF',
        size: 2 + Math.random() * 3
      });
    }
  }

  private spawnPocketFlash(x: number, y: number): void {
    const count = 35 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      let color: string;
      const rand = Math.random();
      if (rand < 0.7) {
        color = '#FFD700';
      } else if (rand < 0.9) {
        color = '#FFFFFF';
      } else {
        color = '#FF6B35';
      }
      const size = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        color,
        size
      });
    }
  }

  setOnStrike(callback: (dx: number, dy: number, power: number) => void): void {
    this.onStrikeCallback = callback;
  }

  setOnReset(callback: () => void): void {
    this.onResetCallback = callback;
  }

  setOnRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  setOnRerack(callback: () => void): void {
    this.onRerackCallback = callback;
  }

  rerackGame(): void {
    this.gameState.phase = 'aiming';
    this.particles = [];
    this.isDragging = false;
  }

  processPocketEvents(events: PocketEvent[]): boolean {
    let anyPotted = false;
    let cuePotted = false;
    let blackPotted = false;

    for (const event of events) {
      anyPotted = true;
      this.spawnPocketFlash(event.pocket.x, event.pocket.y);

      if (event.ball.isCue) {
        cuePotted = true;
      } else if (event.ball.number === 8) {
        blackPotted = true;
      } else {
        let points = 0;
        if (event.ball.number >= 1 && event.ball.number <= 7) points = 1;
        else if (event.ball.number >= 9 && event.ball.number <= 15) points = 2;
        this.gameState.scores[this.gameState.currentPlayer - 1] += points;
      }
    }

    if (blackPotted) {
      const remaining = this.ballManager.getRemainingColoredBalls();
      const playerIdx = this.gameState.currentPlayer - 1;
      if (remaining.length === 0) {
        this.gameState.gameOver = true;
        this.gameState.winner = this.gameState.currentPlayer;
        this.gameState.phase = 'gameover';
      } else {
        const otherIdx = playerIdx === 0 ? 1 : 0;
        this.gameState.gameOver = true;
        this.gameState.winner = otherIdx + 1;
        this.gameState.phase = 'gameover';
      }
    } else if (cuePotted) {
      this.placingCue = true;
      this.gameState.phase = 'placing';
      this.switchPlayer();
    }

    return anyPotted;
  }

  endTurnIfResting(): void {
    if (this.gameState.phase !== 'moving') return;
    if (!this.physics.areAllBallsResting()) return;

    if (this.gameState.gameOver) return;
    this.gameState.phase = this.placingCue ? 'placing' : 'aiming';
  }

  switchPlayer(): void {
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
  }

  resetGame(): void {
    this.gameState = {
      currentPlayer: 1,
      scores: [0, 0],
      gameOver: false,
      winner: null,
      phase: 'aiming'
    };
    this.placingCue = false;
    this.particles = [];
    this.isDragging = false;
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  getGameState(): GameState {
    return this.gameState;
  }

  render(dt: number): void {
    const ctx = this.ctx;
    this.updateParticles(dt);

    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawTable(ctx);
    this.drawPockets(ctx);

    if (this.isDragging || (this.gameState.phase === 'aiming' && this.ballManager.getCueBall())) {
      this.drawAimLine(ctx);
    }

    this.drawTrails(ctx);
    this.drawBalls(ctx);
    this.drawParticles(ctx);
    this.drawBreakArea(ctx);

    ctx.restore();

    this.drawHUD(ctx, rect.width, rect.height);

    if (this.ballManager.isStalemate() && this.gameState.phase === 'aiming') {
      ctx.save();
      const text = '⚠ 僵局预警 - 建议重新摆球';
      ctx.font = 'bold 28px Segoe UI, Arial';
      const metrics = ctx.measureText(text);
      const textW = metrics.width;
      const textH = 40;
      const tx = (rect.width - textW) / 2 - 20;
      const ty = rect.height / 2 - textH / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(tx, ty, textW + 40, textH);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(tx, ty, textW + 40, textH);
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, rect.width / 2, rect.height / 2);
      ctx.restore();
    }

    this.drawPowerBar(ctx, rect.width, rect.height);
    this.drawResetButton(ctx, rect.width, rect.height);

    if (this.gameState.gameOver) {
      this.drawGameOverModal(ctx, rect.width, rect.height);
    }
  }

  private drawTable(ctx: CanvasRenderingContext2D): void {
    const w = this.geometry.width;
    const h = this.geometry.height;
    const bw = this.geometry.borderWidth;

    ctx.fillStyle = '#3E2723';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#4E342E');
    grad.addColorStop(0.5, '#5D4037');
    grad.addColorStop(1, '#3E2723');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, bw);
    ctx.fillRect(0, h - bw, w, bw);
    ctx.fillRect(0, 0, bw, h);
    ctx.fillRect(w - bw, 0, bw, h);

    ctx.fillStyle = '#0A5C36';
    ctx.fillRect(bw, bw, w - bw * 2, h - bw * 2);

    const feltGrad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w / 2);
    feltGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
    feltGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = feltGrad;
    ctx.fillRect(bw, bw, w - bw * 2, h - bw * 2);
  }

  private drawBreakArea(ctx: CanvasRenderingContext2D): void {
    if (!this.placingCue) return;
    const { breakAreaLeft, breakAreaRight, breakAreaTop, breakAreaBottom } = this.geometry;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(breakAreaLeft, breakAreaTop, breakAreaRight - breakAreaLeft, breakAreaBottom - breakAreaTop);
    ctx.restore();

    const cue = this.ballManager.getCueBall();
    if (cue) {
      const pos = this.geometry.clampToBreakArea(this.mouseX, this.mouseY);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, cue.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPockets(ctx: CanvasRenderingContext2D): void {
    for (const p of this.geometry.pockets) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawAimLine(ctx: CanvasRenderingContext2D): void {
    const cue = this.ballManager.getCueBall();
    if (!cue) return;

    let dirX: number, dirY: number;
    if (this.isDragging) {
      dirX = this.dragStartX - this.mouseX;
      dirY = this.dragStartY - this.mouseY;
    } else {
      dirX = this.mouseX - cue.x;
      dirY = this.mouseY - cue.y;
    }

    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len < 1) return;

    const nx = dirX / len;
    const ny = dirY / len;

    const trajectory = this.physics.predictTrajectory(cue.x, cue.y, nx, ny, 500);
    if (trajectory.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.stroke();
    ctx.restore();

    if (this.isDragging) {
      const dragLen = Math.min(len, 200);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cue.x, cue.y);
      ctx.lineTo(cue.x + nx * dragLen, cue.y + ny * dragLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cue.x + nx * dragLen, cue.y + ny * dragLen);
      const ang = Math.atan2(ny, nx);
      ctx.lineTo(
        cue.x + nx * dragLen - Math.cos(ang - 0.4) * 15,
        cue.y + ny * dragLen - Math.sin(ang - 0.4) * 15
      );
      ctx.moveTo(cue.x + nx * dragLen, cue.y + ny * dragLen);
      ctx.lineTo(
        cue.x + nx * dragLen - Math.cos(ang + 0.4) * 15,
        cue.y + ny * dragLen - Math.sin(ang + 0.4) * 15
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D): void {
    const balls = this.ballManager.getAllBalls();
    for (const ball of balls) {
      if (ball.isPocketed || ball.trail.length < 2) continue;

      for (let i = 1; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * (1 - i / ball.trail.length * 0.5), 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, ball.radius);
        grad.addColorStop(0, ball.color);
        grad.addColorStop(1, ball.stripeColor);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawBalls(ctx: CanvasRenderingContext2D): void {
    const balls = this.ballManager.getBalls();
    for (const ball of balls) {
      this.drawBall(ctx, ball);
    }
  }

  private drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
    const r = ball.radius;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);

    if (ball.isStripe) {
      const grad = ctx.createRadialGradient(
        ball.x - r * 0.3, ball.y - r * 0.3, r * 0.1,
        ball.x, ball.y, r
      );
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.4, '#F5F5F5');
      grad.addColorStop(1, '#CCCCCC');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = ball.stripeColor;
      ctx.fillRect(ball.x - r, ball.y - r * 0.5, r * 2, r);
      ctx.restore();
    } else {
      const grad = ctx.createRadialGradient(
        ball.x - r * 0.3, ball.y - r * 0.3, r * 0.1,
        ball.x, ball.y, r
      );
      grad.addColorStop(0, this.lightenColor(ball.color, 40));
      grad.addColorStop(0.6, ball.color);
      grad.addColorStop(1, this.darkenColor(ball.color, 30));
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();

    if (ball.number > 0 && ball.number <= 15) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      ctx.fillStyle = '#111111';
      ctx.font = `bold ${Math.floor(r * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.number.toString(), ball.x, ball.y + 1);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x - r * 0.35, ball.y - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    ctx.save();
    const player1Active = this.gameState.currentPlayer === 1;
    const player2Active = this.gameState.currentPlayer === 2;

    ctx.font = 'bold 32px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = player1Active ? '#FFD700' : '#AAAAAA';
    ctx.fillText(`玩家 1: ${this.gameState.scores[0]} 分`, w * 0.25, 20);

    ctx.fillStyle = player2Active ? '#FFD700' : '#AAAAAA';
    ctx.fillText(`玩家 2: ${this.gameState.scores[1]} 分`, w * 0.75, 20);

    ctx.font = 'bold 36px Segoe UI, Arial';
    ctx.fillStyle = '#FFFFFF';
    const turnText = this.placingCue
      ? `玩家 ${this.gameState.currentPlayer} - 请放置母球`
      : this.gameState.phase === 'moving'
      ? `击球中...`
      : `玩家 ${this.gameState.currentPlayer} 的回合`;
    ctx.fillText(turnText, w / 2, 20);

    ctx.restore();
  }

  private drawPowerBar(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.isDragging) return;

    const barW = 30;
    const barH = 240;
    const x = w - 70;
    const y = (h - barH) / 2;

    ctx.save();
    ctx.fillStyle = '#333333';
    ctx.fillRect(x - 4, y - 4, barW + 8, barH + 8);

    const grad = ctx.createLinearGradient(x, y + barH, x, y);
    grad.addColorStop(0, '#22C55E');
    grad.addColorStop(0.5, '#EAB308');
    grad.addColorStop(1, '#EF4444');
    ctx.fillStyle = grad;

    const fillH = (this.powerAnim / 100) * barH;
    ctx.fillRect(x, y + barH - fillH, barW, fillH);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(this.powerAnim)}%`, x + barW / 2, y + barH + 15);
    ctx.restore();
  }

  private drawResetButton(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const btnW = 120;
    const btnH = 40;
    const rerackY = h - btnH - 20 - 50;
    const rerackX = w - btnW - 20;

    ctx.save();
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(rerackX, rerackY, btnW, btnH);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.strokeRect(rerackX, rerackY, btnW, btnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新摆球', rerackX + btnW / 2, rerackY + btnH / 2);
    ctx.restore();

    const resetX = w - btnW - 20;
    const resetY = h - btnH - 20;

    ctx.save();
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(resetX, resetY, btnW, btnH);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.strokeRect(resetX, resetY, btnW, btnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重置游戏', resetX + btnW / 2, resetY + btnH / 2);
    ctx.restore();
  }

  private drawGameOverModal(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const modalW = 400;
    const modalH = 250;
    const mx = (w - modalW) / 2;
    const my = (h - modalH) / 2;

    ctx.fillStyle = '#1F2937';
    ctx.beginPath();
    ctx.roundRect(mx, my, modalW, modalH, 12);
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 游戏结束 🏆', w / 2, my + 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Segoe UI, Arial';
    ctx.fillText(`玩家 ${this.gameState.winner} 获胜！`, w / 2, my + 105);

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '18px Segoe UI, Arial';
    ctx.fillText(
      `最终比分: ${this.gameState.scores[0]} - ${this.gameState.scores[1]}`,
      w / 2,
      my + 140
    );

    const btnW = 160;
    const btnH = 45;
    const bx = w / 2 - btnW / 2;
    const by = my + modalH - btnH - 25;

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.roundRect(bx, by, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Segoe UI, Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText('再来一局', w / 2, by + btnH / 2);
    ctx.restore();
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
    const b = Math.min(255, (num & 0x0000ff) + percent);
    return `rgb(${r},${g},${b})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - percent);
    const b = Math.max(0, (num & 0x0000ff) - percent);
    return `rgb(${r},${g},${b})`;
  }
}
