import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PANEL_WIDTH,
  DEEP_SEA_BLUE,
  CYAN_BORDER,
  CORAL_ORANGE,
  FISH_COUNT,
  GlobalParams,
  DEFAULT_PARAMS,
  ANIMATION_DURATION,
} from './config.js';

type ParamCallback = (params: GlobalParams) => void;

export class UI {
  private params: GlobalParams;
  private onParamChange: ParamCallback;
  private panelX: number;
  private panelOpacity: number = 0;
  private targetPanelOpacity: number = 1;
  private infoPanelOpacity: number = 0;
  private targetInfoPanelOpacity: number = 1;
  private tooltipVisible: boolean = false;
  private tooltipX: number = 0;
  private tooltipY: number = 0;
  private tooltipText: string = '';
  private tooltipSubText: string = '';
  private tooltipAlpha: number = 0;
  private targetTooltipAlpha: number = 0;
  private fps: number = 0;
  private fishAlive: number = 0;
  private jellyfishCount: number = 0;
  private turtleCatchCount: number = 0;
  private ecoActivity: number = 0;
  private sliders: { x: number; y: number; w: number; h: number; key: keyof GlobalParams; min: number; max: number; label: string; unit: string }[] = [];
  private draggingSlider: string | null = null;

  constructor(onParamChange: ParamCallback) {
    this.params = { ...DEFAULT_PARAMS };
    this.onParamChange = onParamChange;
    this.panelX = CANVAS_WIDTH - PANEL_WIDTH;
    this.setupSliders();
  }

  private setupSliders(): void {
    const sx = this.panelX + 15;
    const sw = PANEL_WIDTH - 30;
    this.sliders = [
      { x: sx, y: 80, w: sw, h: 12, key: 'fishSeparation', min: 20, max: 60, label: '鱼群分离距离', unit: 'px' },
      { x: sx, y: 160, w: sw, h: 12, key: 'fishMaxSpeed', min: 2, max: 6, label: '鱼群最大速度', unit: 'px/帧' },
      { x: sx, y: 240, w: sw, h: 12, key: 'jellyfishDensity', min: 5, max: 15, label: '水母密度', unit: '只' },
      { x: sx, y: 320, w: sw, h: 12, key: 'turtleCount', min: 1, max: 3, label: '海龟数量', unit: '只' },
    ];
  }

  getParams(): GlobalParams {
    return { ...this.params };
  }

  updateStats(fps: number, fishAlive: number, jellyfishCount: number, turtleCatchCount: number, ecoActivity: number): void {
    this.fps = fps;
    this.fishAlive = fishAlive;
    this.jellyfishCount = jellyfishCount;
    this.turtleCatchCount = turtleCatchCount;
    this.ecoActivity = ecoActivity;
  }

  handleMouseDown(mx: number, my: number): boolean {
    for (const s of this.sliders) {
      if (mx >= s.x && mx <= s.x + s.w && my >= s.y - 8 && my <= s.y + s.h + 8) {
        this.draggingSlider = s.key;
        this.updateSliderValue(s, mx);
        return true;
      }
    }
    return false;
  }

  handleMouseMove(mx: number, my: number): boolean {
    if (this.draggingSlider) {
      const slider = this.sliders.find(s => s.key === this.draggingSlider);
      if (slider) {
        this.updateSliderValue(slider, mx);
      }
      return true;
    }
    return false;
  }

  handleMouseUp(): void {
    this.draggingSlider = null;
  }

  setTooltip(x: number, y: number, name: string, status: string): void {
    this.tooltipX = x;
    this.tooltipY = y;
    this.tooltipText = name;
    this.tooltipSubText = status;
    this.targetTooltipAlpha = 1;
  }

  setTooltipDetails(x: number, y: number, name: string, details: string[]): void {
    this.tooltipX = x;
    this.tooltipY = y;
    this.tooltipText = name;
    this.tooltipSubText = details.join('|');
    this.targetTooltipAlpha = 1;
  }

  hideTooltip(): void {
    this.targetTooltipAlpha = 0;
  }

  private updateSliderValue(slider: { key: keyof GlobalParams; min: number; max: number; w: number; x: number }, mx: number): void {
    let t = (mx - slider.x) / slider.w;
    t = Math.max(0, Math.min(1, t));
    let value = slider.min + t * (slider.max - slider.min);
    if (slider.key === 'turtleCount' || slider.key === 'jellyfishDensity') {
      value = Math.round(value);
    } else {
      value = Math.round(value * 10) / 10;
    }
    (this.params as any)[slider.key] = value;
    this.onParamChange({ ...this.params });
  }

  update(): void {
    const lerpSpeed = 0.1;
    this.panelOpacity += (this.targetPanelOpacity - this.panelOpacity) * lerpSpeed;
    this.infoPanelOpacity += (this.targetInfoPanelOpacity - this.infoPanelOpacity) * lerpSpeed;
    this.tooltipAlpha += (this.targetTooltipAlpha - this.tooltipAlpha) * lerpSpeed;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderInfoPanel(ctx);
    this.renderControlPanel(ctx);
    this.renderTooltip(ctx);
  }

  private renderInfoPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.infoPanelOpacity;

    const px = 12, py = 12, pw = 180, ph = 115, pr = 12;
    ctx.beginPath();
    ctx.moveTo(px + pr, py);
    ctx.lineTo(px + pw - pr, py);
    ctx.arcTo(px + pw, py, px + pw, py + pr, pr);
    ctx.lineTo(px + pw, py + ph - pr);
    ctx.arcTo(px + pw, py + ph, px + pw - pr, py + ph, pr);
    ctx.lineTo(px + pr, py + ph);
    ctx.arcTo(px, py + ph, px, py + ph - pr, pr);
    ctx.lineTo(px, py + pr);
    ctx.arcTo(px, py, px + pr, py, pr);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 20, 40, 0.7)';
    ctx.fill();
    ctx.strokeStyle = CYAN_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText(`FPS: ${this.fps}`, px + 12, py + 20);
    ctx.fillStyle = '#7abfff';
    ctx.fillText(`鱼群存活: ${this.fishAlive}`, px + 12, py + 38);
    ctx.fillStyle = '#ff96b4';
    ctx.fillText(`水母: ${this.jellyfishCount}`, px + 12, py + 56);
    ctx.fillStyle = '#5ae09a';
    ctx.fillText(`海龟捕获: ${this.turtleCatchCount}`, px + 12, py + 74);

    ctx.fillStyle = '#ffcc66';
    ctx.fillText(`生态活跃度: ${Math.round(this.ecoActivity)}`, px + 12, py + 94);

    const barX = px + 105, barY = py + 88, barW = 65, barH = 7;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.fill();

    const fillW = Math.max(0, Math.min(barW, (this.ecoActivity / 100) * barW));
    const activityGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    activityGrad.addColorStop(0, '#ffcc66');
    activityGrad.addColorStop(1, '#ff9933');
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 3);
    ctx.fillStyle = activityGrad;
    ctx.fill();

    ctx.restore();
  }

  private renderControlPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.panelOpacity;

    const px = this.panelX;
    ctx.fillStyle = 'rgba(10, 20, 40, 0.75)';
    ctx.fillRect(px, 0, PANEL_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, CANVAS_HEIGHT);
    ctx.stroke();

    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = CYAN_BORDER;
    ctx.textAlign = 'center';
    ctx.fillText('控制面板', px + PANEL_WIDTH / 2, 30);

    ctx.beginPath();
    ctx.moveTo(px + 20, 45);
    ctx.lineTo(px + PANEL_WIDTH - 20, 45);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const s of this.sliders) {
      this.renderSlider(ctx, s);
    }

    ctx.restore();
  }

  private renderSlider(ctx: CanvasRenderingContext2D, s: { x: number; y: number; w: number; h: number; key: keyof GlobalParams; min: number; max: number; label: string; unit: string }): void {
    const value = this.params[s.key] as number;
    const t = (value - s.min) / (s.max - s.min);
    const handleX = s.x + t * s.w;

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c0d8e8';
    ctx.fillText(s.label, s.x, s.y - 12);

    ctx.textAlign = 'right';
    ctx.fillStyle = CYAN_BORDER;
    const displayVal = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    ctx.fillText(`${displayVal}${s.unit}`, s.x + s.w, s.y - 12);

    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, 6);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.fill();

    const fillW = Math.max(0, handleX - s.x);
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, fillW, s.h, 6);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(handleX, s.y + s.h / 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = CYAN_BORDER;
    ctx.fill();
    ctx.strokeStyle = '#0a2a40';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.tooltipAlpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = this.tooltipAlpha;

    const title = this.tooltipText;
    const subLines = this.tooltipSubText.includes('|')
      ? this.tooltipSubText.split('|')
      : [this.tooltipSubText];
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    let maxW = ctx.measureText(title).width;
    for (const line of subLines) {
      const w = ctx.measureText(line).width;
      if (w > maxW) maxW = w;
    }
    const tw = maxW + 24;
    const th = 24 + subLines.length * 16;
    let tx = this.tooltipX + 15;
    let ty = this.tooltipY - 20;
    if (tx + tw > CANVAS_WIDTH - PANEL_WIDTH) tx = this.tooltipX - tw - 10;
    if (ty < 5) ty = 5;

    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 8);
    ctx.fillStyle = 'rgba(10, 20, 40, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, tx + 12, ty + 18);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#aaccdd';
    for (let i = 0; i < subLines.length; i++) {
      ctx.fillText(subLines[i], tx + 12, ty + 36 + i * 16);
    }

    ctx.restore();
  }
}
