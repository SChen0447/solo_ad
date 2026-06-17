import {
  GameState,
  CarModel,
  TrackType,
  SpoilerType,
  TireType,
  UIButton,
  PlayerProfile,
  RaceResult
} from './types';
import { GameEngine } from './gameEngine';

const STORAGE_KEY = 'pixel_racing_profile';

const SPOILER_NAMES: Record<SpoilerType, string> = {
  normal: '普通型',
  turbo: '涡轮型',
  rocket: '火箭型'
};

const TIRE_NAMES: Record<TireType, string> = {
  road: '公路胎',
  drift: '漂移胎',
  rain: '雨胎'
};

const TRACK_NAMES: Record<TrackType, string> = {
  circuit: '环形赛道',
  mountain: '山地赛道',
  snow: '雪地赛道'
};

export class UIManager {
  public gameState: GameState = 'menu';
  public buttons: UIButton[] = [];
  public canvasWidth: number = 800;
  public canvasHeight: number = 600;

  public selectedCar: CarModel = 'redLightning';
  public selectedCarColor: string = '';
  public selectedTrack: TrackType = 'circuit';
  public selectedSpoiler: SpoilerType = 'normal';
  public selectedTire: TireType = 'road';

  public fadeInTimer: number = 0;
  public transitionTimer: number = 0;
  public transitionDirection: 'in' | 'out' = 'out';
  public nextState: GameState | null = null;

  public statAnimations: { topSpeed: number; handling: number } = { topSpeed: 0, handling: 0 };
  public statTargetValues: { topSpeed: number; handling: number } = { topSpeed: 0, handling: 0 };

  public menuRotation: number = 0;
  public colorAdjustHue: number = 0;

  public raceResult: RaceResult | null = null;

  private mouseX: number = 0;
  private mouseY: number = 0;

  public onButtonClick: ((action: string) => void) | null = null;

  constructor() {
    this.loadProfile();
    if (!this.selectedCarColor) {
      this.selectedCarColor = GameEngine.getCarColor(this.selectedCar);
    }
  }

  loadProfile(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const profile: PlayerProfile = JSON.parse(data);
        this.selectedCar = profile.selectedCar;
        this.selectedCarColor = profile.carColor;
        this.selectedSpoiler = profile.spoiler;
        this.selectedTire = profile.tire;
      }
    } catch {
    }
  }

  saveProfile(): void {
    const profile: PlayerProfile = {
      selectedCar: this.selectedCar,
      carColor: this.selectedCarColor,
      spoiler: this.selectedSpoiler,
      tire: this.selectedTire,
      bestLapTime: { circuit: null, mountain: null, snow: null }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  public transitionRandomSeed: number[] = [];

  switchState(newState: GameState): void {
    if (this.transitionTimer > 0) return;
    this.transitionRandomSeed = [];
    for (let i = 0; i < 60; i++) {
      this.transitionRandomSeed.push(Math.random());
    }
    this.nextState = newState;
    this.transitionDirection = 'in';
    this.transitionTimer = 0.3;
  }

  private performStateChange(): void {
    if (this.nextState) {
      this.gameState = this.nextState;
      this.nextState = null;
      this.fadeInTimer = 0.5;
      this.buildButtons();
      if (this.gameState === 'garage') {
        this.statAnimations = { topSpeed: 0, handling: 0 };
      }
      if (this.gameState === 'racing') {
        this.fadeInTimer = 0.5;
      }
      this.updateStatTargets();
    }
  }

  buildButtons(): void {
    this.buttons = [];
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    if (this.gameState === 'menu') {
      this.addButton(w / 2 - 100, h / 2 - 40, 200, 50, '开始游戏', 'startGame');
      this.addButton(w / 2 - 100, h / 2 + 30, 200, 50, '改装车间', 'garage');
    } else if (this.gameState === 'carSelect') {
      const models: CarModel[] = ['redLightning', 'blueGale', 'greenHawk'];
      models.forEach((m, i) => {
        this.addButton(80 + i * 220, h / 2 - 60, 180, 180, GameEngine.getCarName(m), `selectCar:${m}`);
      });
      this.addButton(w / 2 - 80, h - 140, 60, 30, '-', 'colorLess');
      this.addButton(w / 2 + 20, h - 140, 60, 30, '+', 'colorMore');
      this.addButton(w / 2 - 100, h - 90, 200, 50, '选择赛道', 'toTrackSelect');
      this.addButton(20, 20, 80, 36, '返回', 'toMenu');
    } else if (this.gameState === 'trackSelect') {
      const tracks: TrackType[] = ['circuit', 'mountain', 'snow'];
      tracks.forEach((t, i) => {
        this.addButton(80 + i * 220, h / 2 - 80, 180, 200, TRACK_NAMES[t], `selectTrack:${t}`);
      });
      this.addButton(w / 2 - 100, h - 90, 200, 50, '开始比赛', 'startRace');
      this.addButton(20, 20, 80, 36, '返回', 'toCarSelect');
    } else if (this.gameState === 'raceEnd') {
      this.addButton(w / 2 - 100, h / 2 + 60, 200, 50, '改装车间', 'garage');
      this.addButton(w / 2 - 100, h / 2 + 130, 200, 50, '返回菜单', 'toMenu');
    } else if (this.gameState === 'garage') {
      const spoilers: SpoilerType[] = ['normal', 'turbo', 'rocket'];
      spoilers.forEach((s, i) => {
        this.addButton(40 + i * 160, 180, 140, 60, SPOILER_NAMES[s], `selectSpoiler:${s}`);
      });
      const tires: TireType[] = ['road', 'drift', 'rain'];
      tires.forEach((t, i) => {
        this.addButton(40 + i * 160, 320, 140, 60, TIRE_NAMES[t], `selectTire:${t}`);
      });
      const models: CarModel[] = ['redLightning', 'blueGale', 'greenHawk'];
      models.forEach((m, i) => {
        this.addButton(40 + i * 160, 460, 140, 60, GameEngine.getCarName(m), `selectCarGarage:${m}`);
      });
      this.addButton(w - 180, h - 120, 160, 50, '保存配置', 'saveConfig');
      this.addButton(20, 20, 80, 36, '返回', 'toMenu');
    }
  }

  private addButton(x: number, y: number, w: number, h: number, label: string, action: string): void {
    this.buttons.push({
      x, y, width: w, height: h, label, action,
      pressed: false, pressTimer: 0, visible: true
    });
  }

  handleMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  handleMouseDown(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    for (const btn of this.buttons) {
      if (this.pointInButton(x, y, btn)) {
        btn.pressed = true;
        btn.pressTimer = 0.2;
      }
    }
  }

  handleMouseUp(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    for (const btn of this.buttons) {
      if (btn.pressed && this.pointInButton(x, y, btn)) {
        if (this.onButtonClick) {
          this.onButtonClick(btn.action);
        }
      }
      btn.pressed = false;
    }
  }

  private pointInButton(x: number, y: number, btn: UIButton): boolean {
    return x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
  }

  processAction(action: string): void {
    if (action === 'startGame') {
      this.switchState('carSelect');
    } else if (action === 'garage') {
      this.switchState('garage');
    } else if (action === 'toMenu') {
      this.switchState('menu');
    } else if (action === 'toCarSelect') {
      this.switchState('carSelect');
    } else if (action === 'toTrackSelect') {
      this.switchState('trackSelect');
    } else if (action.startsWith('selectCar:')) {
      const model = action.split(':')[1] as CarModel;
      this.selectedCar = model;
      this.selectedCarColor = GameEngine.getCarColor(model);
      this.colorAdjustHue = 0;
    } else if (action.startsWith('selectCarGarage:')) {
      const model = action.split(':')[1] as CarModel;
      this.selectedCar = model;
      this.selectedCarColor = GameEngine.getCarColor(model);
      this.colorAdjustHue = 0;
      this.updateStatTargets();
    } else if (action.startsWith('selectTrack:')) {
      this.selectedTrack = action.split(':')[1] as TrackType;
    } else if (action.startsWith('selectSpoiler:')) {
      this.selectedSpoiler = action.split(':')[1] as SpoilerType;
      this.updateStatTargets();
    } else if (action.startsWith('selectTire:')) {
      this.selectedTire = action.split(':')[1] as TireType;
      this.updateStatTargets();
    } else if (action === 'colorLess') {
      this.colorAdjustHue = (this.colorAdjustHue - 15 + 360) % 360;
      this.selectedCarColor = this.adjustColorHue(GameEngine.getCarColor(this.selectedCar), this.colorAdjustHue);
    } else if (action === 'colorMore') {
      this.colorAdjustHue = (this.colorAdjustHue + 15) % 360;
      this.selectedCarColor = this.adjustColorHue(GameEngine.getCarColor(this.selectedCar), this.colorAdjustHue);
    } else if (action === 'startRace') {
      this.switchState('racing');
    } else if (action === 'saveConfig') {
      this.saveProfile();
    }
  }

  private adjustColorHue(hex: string, degrees: number): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = (h + degrees / 360) % 1;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const nr = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const ng = Math.round(hue2rgb(p, q, h) * 255);
    const nb = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  getCurrentStats(): { topSpeed: number; handling: number } {
    const spoilerSpeedBonus: Record<SpoilerType, number> = { normal: 5, turbo: 10, rocket: 15 };
    const spoilerSteerPenalty: Record<SpoilerType, number> = { normal: 5, turbo: 5, rocket: 5 };
    const tireGripEffect: Record<TireType, number> = { road: 0, drift: -10, rain: 10 };

    const topSpeed = 60 + spoilerSpeedBonus[this.selectedSpoiler];
    const handling = 60 - spoilerSteerPenalty[this.selectedSpoiler] + tireGripEffect[this.selectedTire];

    return { topSpeed, handling: Math.max(10, Math.min(100, handling)) };
  }

  updateStatTargets(): void {
    const stats = this.getCurrentStats();
    this.statTargetValues = stats;
  }

  update(dt: number): void {
    this.menuRotation += dt * (Math.PI * 2 / 60);

    for (const btn of this.buttons) {
      if (btn.pressTimer > 0) {
        btn.pressTimer -= dt;
        if (btn.pressTimer <= 0) {
          btn.pressed = false;
        }
      }
    }

    if (this.fadeInTimer > 0) {
      this.fadeInTimer -= dt;
    }

    if (this.transitionTimer > 0) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        if (this.transitionDirection === 'in') {
          this.performStateChange();
          this.transitionDirection = 'out';
          this.transitionTimer = 0.3;
        }
      }
    }

    const lerpRate = 1 - Math.pow(0.01, dt / 0.5);
    this.statAnimations.topSpeed += (this.statTargetValues.topSpeed - this.statAnimations.topSpeed) * lerpRate;
    this.statAnimations.handling += (this.statTargetValues.handling - this.statAnimations.handling) * lerpRate;
  }

  render(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
    ctx.imageSmoothingEnabled = false;

    switch (this.gameState) {
      case 'menu':
        this.renderMenu(ctx);
        break;
      case 'carSelect':
        this.renderCarSelect(ctx);
        break;
      case 'trackSelect':
        this.renderTrackSelect(ctx);
        break;
      case 'racing':
        this.renderRacingHUD(ctx, engine);
        break;
      case 'garage':
        this.renderGarage(ctx);
        break;
      case 'raceEnd':
        this.renderRaceEnd(ctx);
        break;
    }

    this.renderButtons(ctx);

    if (this.fadeInTimer > 0 && this.transitionTimer <= 0) {
      ctx.fillStyle = `rgba(26, 26, 46, ${this.fadeInTimer / 0.5})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    this.renderTransition(ctx);

    if (this.gameState === 'racing') {
      this.renderMobileControls(ctx);
    }
  }

  private renderTransition(ctx: CanvasRenderingContext2D): void {
    if (this.transitionTimer <= 0) return;
    const progress = this.transitionDirection === 'in'
      ? (0.3 - this.transitionTimer) / 0.3
      : this.transitionTimer / 0.3;

    const rows = 40;
    const cols = 60;
    const cellW = this.canvasWidth / cols;
    const cellH = this.canvasHeight / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) % this.transitionRandomSeed.length;
        const threshold = this.transitionRandomSeed[idx] || 0.5;
        if (threshold < progress) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
        }
      }
    }
  }

  private renderButtons(ctx: CanvasRenderingContext2D): void {
    for (const btn of this.buttons) {
      if (!btn.visible) continue;
      const scale = btn.pressed ? 0.9 : 1;
      const cx = btn.x + btn.width / 2;
      const cy = btn.y + btn.height / 2;
      const w = btn.width * scale;
      const h = btn.height * scale;

      const isHover = this.pointInButton(this.mouseX, this.mouseY, btn);
      const baseColor = btn.pressed ? '#3355aa' : (isHover ? '#5588ff' : '#4488ff');

      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6);

      ctx.fillStyle = baseColor;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

      ctx.fillStyle = '#66aaff';
      ctx.fillRect(cx - w / 2, cy - h / 2, w, 4);
      ctx.fillRect(cx - w / 2, cy - h / 2, 4, h);

      ctx.fillStyle = '#2266cc';
      ctx.fillRect(cx - w / 2, cy + h / 2 - 4, w, 4);
      ctx.fillRect(cx + w / 2 - 4, cy - h / 2, 4, h);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(16 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, cx, cy);
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#2a1a4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawMenuRaceTrack(ctx);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4488ff';
    ctx.fillText('像素漂移赛车', this.canvasWidth / 2, 100);
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PIXEL DRIFT RACING', this.canvasWidth / 2, 140);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px monospace';
    ctx.fillText('操作：WASD / 方向键 移动，Shift 漂移', this.canvasWidth / 2, this.canvasHeight - 40);
  }

  private drawMenuRaceTrack(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    const radiusX = Math.min(this.canvasWidth, this.canvasHeight) * 0.35;
    const radiusY = radiusX * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.menuRotation * 0.1);

    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 80;
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 70;
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -this.menuRotation * 100;
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const carAngle = this.menuRotation * 2;
    const carX = Math.cos(carAngle) * radiusX;
    const carY = Math.sin(carAngle) * radiusY;
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(carAngle + Math.PI / 2);
    ctx.fillStyle = this.selectedCarColor;
    ctx.fillRect(-15, -10, 30, 20);
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(5, -6, 8, 12);
    ctx.fillStyle = '#222222';
    ctx.fillRect(-12, -12, 8, 4);
    ctx.fillRect(-12, 8, 8, 4);
    ctx.fillRect(4, -12, 8, 4);
    ctx.fillRect(4, 8, 8, 4);
    ctx.restore();

    ctx.restore();
  }

  private renderCarSelect(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('选择你的赛车', this.canvasWidth / 2, 70);

    const models: CarModel[] = ['redLightning', 'blueGale', 'greenHawk'];
    models.forEach((m, i) => {
      const bx = 80 + i * 220;
      const by = this.canvasHeight / 2 - 60;
      const isSelected = m === this.selectedCar;

      if (isSelected) {
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(bx - 4, by - 4, 188, 188);
      }

      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(bx, by, 180, 180);

      const color = m === this.selectedCar ? this.selectedCarColor : GameEngine.getCarColor(m);
      this.drawCarPreview(ctx, bx + 90, by + 90, color, this.selectedSpoiler, m === this.selectedCar ? this.selectedTire : 'road');

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(GameEngine.getCarName(m), bx + 90, by + 160);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('车身颜色微调', this.canvasWidth / 2, this.canvasHeight - 160);

    this.drawCarPreview(ctx, this.canvasWidth / 2, this.canvasHeight - 100, this.selectedCarColor, this.selectedSpoiler, this.selectedTire, 1.2);
  }

  private renderTrackSelect(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('选择赛道', this.canvasWidth / 2, 70);

    const tracks: TrackType[] = ['circuit', 'mountain', 'snow'];
    const bgColors: Record<TrackType, string> = {
      circuit: '#2d5a2d',
      mountain: '#6b6b6b',
      snow: '#e8e8e8'
    };

    tracks.forEach((t, i) => {
      const bx = 80 + i * 220;
      const by = this.canvasHeight / 2 - 80;
      const isSelected = t === this.selectedTrack;

      if (isSelected) {
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(bx - 4, by - 4, 188, 208);
      }

      ctx.fillStyle = bgColors[t];
      ctx.fillRect(bx, by, 180, 120);

      ctx.fillStyle = '#444444';
      ctx.fillRect(bx, by + 50, 180, 30);

      ctx.fillStyle = '#ffffff';
      ctx.setLineDash([10, 10]);
      ctx.fillRect(bx, by + 63, 180, 4);
      ctx.setLineDash([]);

      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(bx, by + 120, 180, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(TRACK_NAMES[t], bx + 90, by + 150);

      ctx.font = '12px monospace';
      let desc = '';
      if (t === 'circuit') desc = '直线弯道交替';
      else if (t === 'mountain') desc = '上下坡路段';
      else desc = '低摩擦路面';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(desc, bx + 90, by + 175);
    });
  }

  private renderRacingHUD(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
    const isSmall = this.canvasWidth < 768;
    const hudAlpha = this.fadeInTimer > 0 ? Math.max(0, 1 - (this.fadeInTimer / 0.5)) : 1;
    ctx.globalAlpha = hudAlpha;

    if (isSmall) {
      this.renderSpeedometer(ctx, this.canvasWidth / 2 - 110, 8, 0.5, engine);
      this.renderLapCounter(ctx, this.canvasWidth / 2 + 10, 8, 0.5, engine);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${engine.lapTime.toFixed(2)}s`, this.canvasWidth / 2 - 100, 60);
    } else {
      this.renderSpeedometer(ctx, 20, this.canvasHeight - 160, 1, engine);
      this.renderLapCounter(ctx, this.canvasWidth - 180, 20, 1, engine);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`时间: ${engine.lapTime.toFixed(2)}s`, 20, this.canvasHeight - 170);
    }

    if (engine.car.boostMultiplier > 1) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★ 完美漂移加速中! ★', this.canvasWidth / 2, 100);
    }

    ctx.globalAlpha = 1;
  }

  private renderSpeedometer(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, engine: GameEngine): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const w = 200;
    const h = 100;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h, w * 0.4, Math.PI, 0);
    ctx.stroke();

    const speedRatio = Math.min(engine.car.speed / 150, 1);
    const angle = Math.PI + speedRatio * Math.PI;

    const gradient = ctx.createLinearGradient(0, h, w, h);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.5, '#ffff00');
    gradient.addColorStop(1, '#ff0000');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, h, w * 0.4, Math.PI, angle);
    ctx.stroke();

    const cx = w / 2;
    const cy = h;
    const needleLen = w * 0.35;
    const nx = cx + Math.cos(angle) * needleLen;
    const ny = cy + Math.sin(angle) * needleLen;

    ctx.strokeStyle = '#ff6644';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(engine.car.speed)}`, cx, cy - 10);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('px/s', cx, cy + 5);

    ctx.restore();
  }

  private renderLapCounter(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, engine: GameEngine): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const w = 160;
    const h = 70;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const progress = engine.track ? Math.min(engine.lapProgress / engine.track.length, 1) : 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('圈数: 1/1', 10, 22);

    ctx.fillStyle = '#333333';
    ctx.fillRect(10, 32, w - 20, 8);
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(10, 32, (w - 20) * progress, 8);

    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`最高: ${Math.floor(engine.maxSpeedReached)}px/s`, 10, 55);

    ctx.restore();
  }

  private renderMobileControls(ctx: CanvasRenderingContext2D): void {
    if (this.canvasWidth >= 768) return;

    const overlayH = 50;
    const overlayY = this.canvasHeight - overlayH;

    ctx.fillStyle = 'rgba(26, 26, 46, 0.75)';
    ctx.fillRect(0, overlayY, this.canvasWidth, overlayH);

    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, overlayY, this.canvasWidth, overlayH);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W/↑ 加速  S/↓ 减速  A/D/←/→ 转向  Shift 漂移', this.canvasWidth / 2, overlayY + overlayH / 2);
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  private renderGarage(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('改装车间', this.canvasWidth / 2, 50);

    this.drawCarPreview(ctx, this.canvasWidth - 150, 100, this.selectedCarColor, this.selectedSpoiler, this.selectedTire, 2);

    this.drawStatBar(ctx, 40, 90, '最高速度', this.statAnimations.topSpeed, '#4488ff');
    this.drawStatBar(ctx, 40, 130, '操控性', this.statAnimations.handling, '#44ff88');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('尾翼 (+速度 / -操控)', 40, 170);

    const spoilers: SpoilerType[] = ['normal', 'turbo', 'rocket'];
    spoilers.forEach((s, i) => {
      if (s === this.selectedSpoiler) {
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(36 + i * 160, 176, 148, 68);
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.fillText('轮胎 (影响抓地力)', 40, 310);

    const tires: TireType[] = ['road', 'drift', 'rain'];
    tires.forEach((t, i) => {
      if (t === this.selectedTire) {
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(36 + i * 160, 316, 148, 68);
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.fillText('车型', 40, 450);

    const models: CarModel[] = ['redLightning', 'blueGale', 'greenHawk'];
    models.forEach((m, i) => {
      if (m === this.selectedCar) {
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(36 + i * 160, 456, 148, 68);
      }
    });
  }

  private drawStatBar(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: number, color: string): void {
    const w = 250;
    const h = 20;

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 4);

    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * (value / 100), h);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`${Math.floor(value)}`, x + w + 8, y + 14);
  }

  private drawCarPreview(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, spoiler: SpoilerType, tire: TireType, scale: number = 1): void {
    const p = 2 * scale;
    const w = 60 * scale;
    const h = 40 * scale;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.fillStyle = this.darken(color, 0.7);
    ctx.fillRect(-w / 2, -h / 2, w, p);
    ctx.fillRect(-w / 2, h / 2 - p, w, p);

    ctx.fillStyle = this.lighten(color, 1.3);
    ctx.fillRect(-w / 2, -h / 2, p, h);

    ctx.fillStyle = '#88ccff';
    ctx.fillRect(w / 2 - 20 * scale, -h / 4, 16 * scale, h / 2);

    ctx.fillStyle = '#222222';
    const tireW = tire === 'drift' ? 6 * scale : (tire === 'rain' ? 10 * scale : 8 * scale);
    ctx.fillRect(-w / 2 + 8 * scale, -h / 2 - p, 20 * scale, tireW);
    ctx.fillRect(-w / 2 + 8 * scale, h / 2 - tireW + p, 20 * scale, tireW);
    ctx.fillRect(w / 2 - 28 * scale, -h / 2 - p, 20 * scale, tireW);
    ctx.fillRect(w / 2 - 28 * scale, h / 2 - tireW + p, 20 * scale, tireW);

    ctx.fillStyle = '#ffff00';
    ctx.fillRect(w / 2 - p * 2, -h / 3, p, 3 * p);
    ctx.fillRect(w / 2 - p * 2, h / 3 - 3 * p, p, 3 * p);

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-w / 2, -h / 3, p, 3 * p);
    ctx.fillRect(-w / 2, h / 3 - 3 * p, p, 3 * p);

    if (spoiler === 'turbo') {
      ctx.fillStyle = '#444444';
      ctx.fillRect(-w / 2 - 8 * scale, -h / 3, 8 * scale, 4 * scale);
      ctx.fillRect(-w / 2 - 8 * scale, h / 3 - 4 * scale, 8 * scale, 4 * scale);
      ctx.fillRect(-w / 2 - 4 * scale, -h / 2 + 4 * scale, 4 * scale, h - 8 * scale);
    } else if (spoiler === 'rocket') {
      ctx.fillStyle = '#333333';
      ctx.fillRect(-w / 2 - 12 * scale, -h / 3 - 2 * scale, 12 * scale, 8 * scale);
      ctx.fillRect(-w / 2 - 12 * scale, h / 3 - 6 * scale, 12 * scale, 8 * scale);
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(-w / 2 - 8 * scale, -h / 6, 4 * scale, 6 * scale);
      ctx.fillRect(-w / 2 - 8 * scale, h / 6 - 6 * scale, 4 * scale, 6 * scale);
    }

    ctx.restore();
  }

  private darken(hex: string, factor: number): string {
    const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private lighten(hex: string, factor: number): string {
    const r = Math.min(255, Math.floor(parseInt(hex.slice(1, 3), 16) * factor));
    const g = Math.min(255, Math.floor(parseInt(hex.slice(3, 5), 16) * factor));
    const b = Math.min(255, Math.floor(parseInt(hex.slice(5, 7), 16) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private renderRaceEnd(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('比赛完成!', this.canvasWidth / 2, 120);

    if (this.raceResult) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`圈时: ${this.raceResult.lapTime.toFixed(2)} 秒`, this.canvasWidth / 2, this.canvasHeight / 2 - 40);
      ctx.fillText(`最高速度: ${Math.floor(this.raceResult.maxSpeed)} px/s`, this.canvasWidth / 2, this.canvasHeight / 2 - 5);
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`完美漂移: ${this.raceResult.perfectDriftCount} 次`, this.canvasWidth / 2, this.canvasHeight / 2 + 30);
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.buildButtons();
  }
}
