import { Point, buildTrack } from './editor';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const TRACK_WIDTH = 30;
const TRACK_INNER_COLOR = '#2c3e50';
const TRACK_OUTER_COLOR = '#e74c3c';
const PLAYER_COLOR = '#e74c3c';
const AI_COLOR = '#3498db';
const CAR_SIZE = 20;
const PLAYER_SPEED = 2;
const AI_SPEED = 1.85;
const TOTAL_LAPS = 3;
const MAX_TRAIL_PARTICLES = 20;
const TRAIL_FADE_RATE = 0.05;

interface Car {
  x: number;
  y: number;
  angle: number;
  pathIndex: number;
  pathProgress: number;
  distance: number;
  lap: number;
  lateralOffset: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
}

interface WinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

type GameState = 'ready' | 'running' | 'finished';

export class RacingGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trackPath: Point[] = [];
  private player: Car;
  private ai: Car;
  private keys: Set<string> = new Set();
  private gameState: GameState = 'ready';
  private animationId: number | null = null;
  private playerTrail: Particle[] = [];
  private aiTrail: Particle[] = [];
  private winParticles: WinParticle[] = [];
  private winTimer: number = 0;
  private lastTime: number = 0;

  private onLapUpdate?: (lap: number) => void;
  private onGapUpdate?: (gap: number, playerAhead: boolean) => void;
  private onStatusUpdate?: (status: string) => void;
  private onWin?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createDefaultCar();
    this.ai = this.createDefaultCar();
    this.bindEvents();
  }

  private createDefaultCar(): Car {
    return {
      x: 0,
      y: 0,
      angle: 0,
      pathIndex: 0,
      pathProgress: 0,
      distance: 0,
      lap: 0,
      lateralOffset: 0
    };
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    if (this.gameState === 'ready' && (e.key === ' ' || e.key === 'Enter')) {
      this.start();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  setOnLapUpdate(callback: (lap: number) => void): void {
    this.onLapUpdate = callback;
  }

  setOnGapUpdate(callback: (gap: number, playerAhead: boolean) => void): void {
    this.onGapUpdate = callback;
  }

  setOnStatusUpdate(callback: (status: string) => void): void {
    this.onStatusUpdate = callback;
  }

  setOnWin(callback: () => void): void {
    this.onWin = callback;
  }

  loadTrack(controlPoints: Point[]): boolean {
    if (controlPoints.length < 3) return false;

    this.trackPath = buildTrack(controlPoints);
    if (this.trackPath.length < 10) return false;

    this.resetGame();
    return true;
  }

  resetGame(): void {
    this.gameState = 'ready';
    this.playerTrail = [];
    this.aiTrail = [];
    this.winParticles = [];
    this.winTimer = 0;

    const startPoint = this.trackPath[0];
    const nextPoint = this.trackPath[1];
    const startAngle = Math.atan2(nextPoint.y - startPoint.y, nextPoint.x - startPoint.x);

    this.player = {
      x: startPoint.x,
      y: startPoint.y,
      angle: startAngle,
      pathIndex: 0,
      pathProgress: 0,
      distance: 0,
      lap: 0,
      lateralOffset: 0
    };

    this.ai = {
      x: startPoint.x,
      y: startPoint.y,
      angle: startAngle,
      pathIndex: 0,
      pathProgress: 0,
      distance: 0,
      lap: 0,
      lateralOffset: 0
    };

    this.updateUI();
    this.render();
  }

  start(): void {
    if (this.trackPath.length < 10) return;
    if (this.gameState === 'running') return;

    this.gameState = 'running';
    this.lastTime = performance.now();
    if (this.onStatusUpdate) {
      this.onStatusUpdate('比赛中');
    }
    this.gameLoop();
  }

  stop(): void {
    this.gameState = 'ready';
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop(): void {
    if (this.gameState !== 'running' && this.gameState !== 'finished') return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 16.67;
    this.lastTime = currentTime;

    if (this.gameState === 'running') {
      this.update(deltaTime);
    } else if (this.gameState === 'finished') {
      this.updateWinEffect(deltaTime);
    }

    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.updatePlayer(deltaTime);
    this.updateAI(deltaTime);
    this.updateTrails();
    this.checkLaps();
    this.updateUI();
  }

  private updatePlayer(deltaTime: number): void {
    const lateralSpeed = 2.5 * deltaTime;
    if (this.keys.has('arrowleft') || this.keys.has('a')) {
      this.player.lateralOffset -= lateralSpeed;
    }
    if (this.keys.has('arrowright') || this.keys.has('d')) {
      this.player.lateralOffset += lateralSpeed;
    }

    const maxOffset = TRACK_WIDTH / 2 - 8;
    this.player.lateralOffset = Math.max(-maxOffset, Math.min(maxOffset, this.player.lateralOffset));

    this.moveCarAlongPath(this.player, PLAYER_SPEED * deltaTime);

    if (Math.random() > 0.5) {
      this.playerTrail.push({
        x: this.player.x,
        y: this.player.y,
        size: 2,
        alpha: 0.6,
        color: PLAYER_COLOR
      });
      if (this.playerTrail.length > MAX_TRAIL_PARTICLES) {
        this.playerTrail.shift();
      }
    }
  }

  private updateAI(deltaTime: number): void {
    const lookAhead = 15;
    const targetIndex = Math.min(
      Math.floor(this.ai.pathIndex + lookAhead) % this.trackPath.length,
      this.trackPath.length - 1
    );
    const targetPoint = this.trackPath[targetIndex];

    const dx = targetPoint.x - this.ai.x;
    const dy = targetPoint.y - this.ai.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - this.ai.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const aiSteer = 0.08 * deltaTime;
      this.ai.angle += angleDiff * aiSteer;
    }

    this.moveCarAlongPath(this.ai, AI_SPEED * deltaTime);

    if (Math.random() > 0.5) {
      this.aiTrail.push({
        x: this.ai.x,
        y: this.ai.y,
        size: 2,
        alpha: 0.6,
        color: AI_COLOR
      });
      if (this.aiTrail.length > MAX_TRAIL_PARTICLES) {
        this.aiTrail.shift();
      }
    }
  }

  private moveCarAlongPath(car: Car, speed: number): void {
    let remainingSpeed = speed;

    while (remainingSpeed > 0 && this.trackPath.length > 0) {
      const currentIndex = car.pathIndex;
      const nextIndex = (currentIndex + 1) % this.trackPath.length;

      const current = this.trackPath[currentIndex];
      const next = this.trackPath[nextIndex];

      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (segLen === 0) {
        car.pathIndex = nextIndex;
        continue;
      }

      const remainingDist = segLen * (1 - car.pathProgress);

      if (remainingSpeed >= remainingDist) {
        remainingSpeed -= remainingDist;
        car.pathIndex = nextIndex;
        car.pathProgress = 0;
        car.distance += remainingDist;

        if (car.pathIndex === 0) {
          car.lap++;
        }
      } else {
        car.pathProgress += remainingSpeed / segLen;
        car.distance += remainingSpeed;
        remainingSpeed = 0;
      }
    }

    const current = this.trackPath[car.pathIndex];
    const nextIndex = (car.pathIndex + 1) % this.trackPath.length;
    const next = this.trackPath[nextIndex];

    car.x = current.x + (next.x - current.x) * car.pathProgress;
    car.y = current.y + (next.y - current.y) * car.pathProgress;

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const pathAngle = Math.atan2(dy, dx);
    const perpX = Math.cos(pathAngle + Math.PI / 2);
    const perpY = Math.sin(pathAngle + Math.PI / 2);

    car.x += perpX * car.lateralOffset;
    car.y += perpY * car.lateralOffset;

    if (car.lateralOffset !== 0) {
      const offsetFactor = Math.abs(car.lateralOffset) / (TRACK_WIDTH / 2);
      const angleOffset = offsetFactor * 0.3 * (car.lateralOffset > 0 ? 1 : -1);
      car.angle = pathAngle + angleOffset;
    } else {
      car.angle = pathAngle;
    }
  }

  private updateTrails(): void {
    for (let i = this.playerTrail.length - 1; i >= 0; i--) {
      this.playerTrail[i].alpha -= TRAIL_FADE_RATE;
      if (this.playerTrail[i].alpha <= 0) {
        this.playerTrail.splice(i, 1);
      }
    }

    for (let i = this.aiTrail.length - 1; i >= 0; i--) {
      this.aiTrail[i].alpha -= TRAIL_FADE_RATE;
      if (this.aiTrail[i].alpha <= 0) {
        this.aiTrail.splice(i, 1);
      }
    }
  }

  private checkLaps(): void {
    if (this.player.lap >= TOTAL_LAPS && this.gameState === 'running') {
      this.gameState = 'finished';
      this.createWinParticles();
      this.winTimer = 120;
      if (this.onStatusUpdate) {
        this.onStatusUpdate('胜利！');
      }
      if (this.onWin) {
        this.onWin();
      }
    }
  }

  private createWinParticles(): void {
    const colors = ['#f1c40f', '#e67e22', '#e74c3c', '#2ecc71', '#3498db'];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.winParticles.push({
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 60 + Math.random() * 60
      });
    }
  }

  private updateWinEffect(deltaTime: number): void {
    for (let i = this.winParticles.length - 1; i >= 0; i--) {
      const p = this.winParticles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 0.1 * deltaTime;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / 120);

      if (p.life <= 0) {
        this.winParticles.splice(i, 1);
      }
    }

    this.winTimer -= deltaTime;
    if (this.winTimer <= 0) {
      if (this.onWin) {
        this.onWin();
      }
    }
  }

  private updateUI(): void {
    if (this.onLapUpdate) {
      this.onLapUpdate(Math.min(this.player.lap, TOTAL_LAPS));
    }

    if (this.onGapUpdate) {
      const gap = Math.abs(this.player.distance - this.ai.distance);
      const playerAhead = this.player.distance > this.ai.distance;
      this.onGapUpdate(gap, playerAhead);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawTrack();
    this.drawStartLine();
    this.drawTrails();
    this.drawCar(this.ai, AI_COLOR);
    this.drawCar(this.player, PLAYER_COLOR);

    if (this.gameState === 'finished') {
      this.drawWinParticles();
      this.drawWinText();
    }

    if (this.gameState === 'ready') {
      this.drawReadyText();
    }
  }

  private drawTrack(): void {
    if (this.trackPath.length < 2) return;

    const ctx = this.ctx;

    ctx.strokeStyle = TRACK_OUTER_COLOR;
    ctx.lineWidth = TRACK_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.trackPath[0].x, this.trackPath[0].y);
    for (let i = 1; i < this.trackPath.length; i++) {
      ctx.lineTo(this.trackPath[i].x, this.trackPath[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = TRACK_INNER_COLOR;
    ctx.lineWidth = TRACK_WIDTH * 0.7;
    ctx.beginPath();
    ctx.moveTo(this.trackPath[0].x, this.trackPath[0].y);
    for (let i = 1; i < this.trackPath.length; i++) {
      ctx.lineTo(this.trackPath[i].x, this.trackPath[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawStartLine(): void {
    if (this.trackPath.length < 2) return;

    const ctx = this.ctx;
    const p1 = this.trackPath[0];
    const p2 = this.trackPath[1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = -dy / len;
    const ny = dx / len;
    const halfWidth = TRACK_WIDTH / 2;

    const startX1 = p1.x + nx * halfWidth;
    const startY1 = p1.y + ny * halfWidth;
    const startX2 = p1.x - nx * halfWidth;
    const startY2 = p1.y - ny * halfWidth;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX1, startY1);
    ctx.lineTo(startX2, startY2);
    ctx.stroke();
  }

  private drawTrails(): void {
    const ctx = this.ctx;

    for (const p of this.playerTrail) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.aiTrail) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawCar(car: Car, color: string): void {
    const ctx = this.ctx;
    const size = CAR_SIZE;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(-size / 2, -size / 2.5);
    ctx.lineTo(-size / 3, 0);
    ctx.lineTo(-size / 2, size / 2.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(size / 3, 0);
    ctx.lineTo(-size / 6, -size / 5);
    ctx.lineTo(-size / 6, size / 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawWinParticles(): void {
    const ctx = this.ctx;
    for (const p of this.winParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawWinText(): void {
    const ctx = this.ctx;
    ctx.save();

    const fontSize = 48;
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'gold';
    ctx.shadowBlur = 30;

    const gradient = ctx.createLinearGradient(
      0,
      CANVAS_HEIGHT / 2 - fontSize / 2,
      0,
      CANVAS_HEIGHT / 2 + fontSize / 2
    );
    gradient.addColorStop(0, '#f1c40f');
    gradient.addColorStop(0.5, '#f39c12');
    gradient.addColorStop(1, '#e67e22');

    ctx.fillStyle = gradient;
    ctx.fillText('你赢了！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    ctx.restore();
  }

  private drawReadyText(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 10;

    ctx.fillText('按 空格键 或 Enter 开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    ctx.restore();
  }

  getPlayerLap(): number {
    return Math.min(this.player.lap, TOTAL_LAPS);
  }

  getTotalLaps(): number {
    return TOTAL_LAPS;
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
