import { Player, Bullet, Particle } from './player';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  speed: number;
}

export interface MenuButton {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

const CANVAS_W = 900;
const CANVAS_H = 600;

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private bufferCanvas: HTMLCanvasElement;
  private bufCtx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private menuTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;

    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = CANVAS_W;
    this.bufferCanvas.height = CANVAS_H;
    this.bufCtx = this.bufferCanvas.getContext('2d')!;

    this.initStars();
  }

  private initStars(): void {
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: 0.5 + Math.random() * 2.5,
        brightness: 0.3 + Math.random() * 0.7,
        speed: 20 + Math.random() * 60,
      });
    }
  }

  updateStars(dt: number): void {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > CANVAS_H) {
        s.y = -2;
        s.x = Math.random() * CANVAS_W;
      }
    }
  }

  private drawBackground(c: CanvasRenderingContext2D): void {
    const grad = c.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#000011');
    c.fillStyle = grad;
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  private drawStars(c: CanvasRenderingContext2D): void {
    for (const s of this.stars) {
      c.globalAlpha = s.brightness;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  drawShip(c: CanvasRenderingContext2D, player: Player): void {
    c.save();
    c.translate(player.x, player.y);
    c.rotate(player.facingAngle + Math.PI / 2);

    const len = 20;
    const halfW = 12;

    c.beginPath();
    c.moveTo(0, -len);
    c.lineTo(-halfW, len);
    c.lineTo(halfW, len);
    c.closePath();

    c.fillStyle = player.color;
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.stroke();

    c.restore();

    for (const p of player.engineParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      c.globalAlpha = alpha;
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  drawBullets(c: CanvasRenderingContext2D, bullets: Bullet[]): void {
    for (const b of bullets) {
      if (!b.active) continue;
      c.save();
      c.shadowColor = '#ff9800';
      c.shadowBlur = 8;
      c.fillStyle = '#ffeb3b';
      c.beginPath();
      c.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      c.restore();
    }
  }

  drawParticles(c: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      c.globalAlpha = alpha;
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  drawFPS(c: CanvasRenderingContext2D, fps: number): void {
    c.globalAlpha = 0.6;
    c.fillStyle = '#ffffff';
    c.font = '14px monospace';
    c.textAlign = 'right';
    c.fillText(`FPS: ${Math.round(fps)}`, CANVAS_W - 10, 20);
    c.globalAlpha = 1;
  }

  drawScores(
    c: CanvasRenderingContext2D,
    p1: Player, p2: Player,
    p1Name: string, p2Name: string
  ): void {
    c.fillStyle = '#ffffff';
    c.font = 'bold 18px sans-serif';
    c.textAlign = 'left';
    c.fillText(`${p1Name}: ${p1.score}`, 20, 30);
    c.textAlign = 'right';
    c.fillText(`${p2Name}: ${p2.score}`, CANVAS_W - 20, 30);
    c.textAlign = 'left';
  }

  drawCountdown(c: CanvasRenderingContext2D, count: number, progress: number): void {
    const scale = 1 + (1 - progress) * 0.5;
    const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
    c.save();
    c.globalAlpha = Math.max(0, alpha);
    c.translate(CANVAS_W / 2, CANVAS_H / 2);
    c.scale(scale, scale);
    c.fillStyle = '#ffffff';
    c.font = 'bold 120px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(count), 0, 0);
    c.restore();
  }

  drawPauseOverlay(c: CanvasRenderingContext2D): void {
    c.save();
    c.fillStyle = 'rgba(0, 0, 0, 0.3)';
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    c.shadowColor = 'rgba(0, 0, 0, 0.8)';
    c.shadowBlur = 12;
    c.fillStyle = 'rgba(255, 255, 255, 0.9)';
    c.font = '36px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('游戏暂停', CANVAS_W / 2, CANVAS_H / 2);
    c.shadowBlur = 0;
    c.restore();
  }

  drawMenu(c: CanvasRenderingContext2D, time: number, hoveredBtn: number): MenuButton[] {
    this.menuTime = time;
    this.drawBackground(c);
    this.drawStars(c);

    const glow = 0.5 + 0.5 * Math.sin(time * Math.PI);
    c.save();
    c.shadowColor = `rgba(0, 229, 255, ${0.4 + glow * 0.6})`;
    c.shadowBlur = 10 + glow * 20;
    c.fillStyle = '#00e5ff';
    c.font = 'bold 48px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('星域对决', CANVAS_W / 2, 150);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.strokeText('星域对决', CANVAS_W / 2, 150);
    c.restore();

    const buttons: MenuButton[] = [
      { x: CANVAS_W / 2 - 100, y: 260, w: 200, h: 50, text: '单人模式' },
      { x: CANVAS_W / 2 - 100, y: 330, w: 200, h: 50, text: '双人模式' },
      { x: CANVAS_W / 2 - 100, y: 400, w: 200, h: 50, text: '退出' },
    ];

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      c.fillStyle = i === hoveredBtn ? '#2a2a5e' : '#1a1a3e';
      this.roundRect(c, btn.x, btn.y, btn.w, btn.h, 12);
      c.fill();
      c.strokeStyle = '#3a3a6e';
      c.lineWidth = 1;
      this.roundRect(c, btn.x, btn.y, btn.w, btn.h, 12);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.font = '20px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }

    return buttons;
  }

  drawDifficultyModal(
    c: CanvasRenderingContext2D, animProgress: number, hoveredBtn: number
  ): MenuButton[] {
    this.drawBackground(c);
    this.drawStars(c);

    const titleGlow = 0.5 + 0.5 * Math.sin(this.menuTime * Math.PI);
    c.save();
    c.shadowColor = `rgba(0, 229, 255, ${0.4 + titleGlow * 0.6})`;
    c.shadowBlur = 10 + titleGlow * 20;
    c.fillStyle = '#00e5ff';
    c.font = 'bold 48px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('星域对决', CANVAS_W / 2, 150);
    c.restore();

    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const scale = Math.min(1, animProgress / 0.3);
    const ease = 1 - Math.pow(1 - scale, 3);
    c.save();
    c.translate(CANVAS_W / 2, CANVAS_H / 2);
    c.scale(ease, ease);

    const mw = 320, mh = 180;
    c.fillStyle = '#1a1a3e';
    this.roundRect(c, -mw / 2, -mh / 2, mw, mh, 16);
    c.fill();
    c.strokeStyle = '#3a3a6e';
    c.lineWidth = 2;
    this.roundRect(c, -mw / 2, -mh / 2, mw, mh, 16);
    c.stroke();

    c.fillStyle = '#ffffff';
    c.font = '22px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('选择难度', 0, -mh / 2 + 40);

    c.restore();

    const buttons: MenuButton[] = [
      { x: CANVAS_W / 2 - 130, y: CANVAS_H / 2 + 10, w: 110, h: 45, text: '简单' },
      { x: CANVAS_W / 2 + 20, y: CANVAS_H / 2 + 10, w: 110, h: 45, text: '困难' },
    ];

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      c.fillStyle = i === hoveredBtn ? '#2a2a5e' : '#1a1a3e';
      this.roundRect(c, btn.x, btn.y, btn.w, btn.h, 12);
      c.fill();
      c.strokeStyle = '#3a3a6e';
      c.lineWidth = 1;
      this.roundRect(c, btn.x, btn.y, btn.w, btn.h, 12);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.font = '18px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }

    return buttons;
  }

  drawGameOver(
    c: CanvasRenderingContext2D,
    winnerName: string,
    p1Score: number,
    p2Score: number,
    p1Name: string,
    p2Name: string,
    fadeIn: number,
    hoveredBtn: number
  ): MenuButton[] {
    this.drawBackground(c);
    this.drawStars(c);

    const alpha = Math.min(1, fadeIn / 0.5);
    c.globalAlpha = alpha;

    const pw = 400, ph = 250;
    const px = CANVAS_W / 2 - pw / 2;
    const py = CANVAS_H / 2 - ph / 2;

    c.fillStyle = '#1a1a2e';
    this.roundRect(c, px, py, pw, ph, 20);
    c.fill();
    c.strokeStyle = '#3a3a6e';
    c.lineWidth = 2;
    this.roundRect(c, px, py, pw, ph, 20);
    c.stroke();

    c.fillStyle = '#00e5ff';
    c.font = 'bold 32px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(`${winnerName} 获胜!`, CANVAS_W / 2, py + 60);

    c.fillStyle = '#ffffff';
    c.font = '22px sans-serif';
    c.fillText(`${p1Name}: ${p1Score}  vs  ${p2Name}: ${p2Score}`, CANVAS_W / 2, py + 110);

    const btn: MenuButton = {
      x: CANVAS_W / 2 - 80,
      y: py + 160,
      w: 160,
      h: 45,
      text: '返回菜单',
    };

    c.fillStyle = hoveredBtn === 0 ? '#2a2a5e' : '#1a1a3e';
    this.roundRect(c, btn.x, btn.y, btn.w, btn.h, 12);
    c.fill();
    c.strokeStyle = '#3a3a6e';
    c.lineWidth = 1;
    this.roundRect(c, btn.x, btn.y, btn.w, btn.h, 12);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.font = '18px sans-serif';
    c.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);

    c.globalAlpha = 1;

    return [btn];
  }

  drawGame(
    players: Player[],
    bullets: Bullet[],
    particles: Particle[],
    p1Name: string,
    p2Name: string,
    fps: number
  ): void {
    const c = this.bufCtx;
    this.drawBackground(c);
    this.drawStars(c);

    for (const p of players) {
      this.drawShip(c, p);
    }
    this.drawBullets(c, bullets);
    this.drawParticles(c, particles);
    this.drawScores(c, players[0], players[1], p1Name, p2Name);
    this.drawFPS(c, fps);

    this.present();
  }

  present(): void {
    this.ctx.drawImage(this.bufferCanvas, 0, 0);
  }

  getContext(): CanvasRenderingContext2D {
    return this.bufCtx;
  }

  getBufferCanvas(): HTMLCanvasElement {
    return this.bufferCanvas;
  }

  private roundRect(
    c: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
}
