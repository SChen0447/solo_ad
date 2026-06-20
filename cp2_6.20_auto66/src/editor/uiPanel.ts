export type EditorTool = 'light' | 'shadowBlock' | 'brick' | 'none';

interface ButtonState {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tool: EditorTool;
  hover: boolean;
  pressScale: number;
  hoverScale: number;
}

export class UIPanel {
  panelWidth: number = 280;
  panelX: number;
  panelY: number = 0;
  panelHeight: number;
  buttons: ButtonState[] = [];
  selectedTool: EditorTool = 'none';
  onToolSelect?: (tool: EditorTool) => void;
  onRunTest?: () => void;
  onClearLevel?: () => void;
  runTestBtn: ButtonState;
  clearBtn: ButtonState;
  mouseX: number = 0;
  mouseY: number = 0;

  constructor(gameAreaWidth: number, canvasHeight: number) {
    this.panelX = gameAreaWidth;
    this.panelHeight = canvasHeight;
    this.initButtons();
  }

  private initButtons(): void {
    const btnW = 240;
    const btnH = 44;
    const startX = this.panelX + 20;
    const startY = 80;
    const gap = 58;

    this.buttons = [
      { x: startX, y: startY, w: btnW, h: btnH, label: '💡 添加光源', tool: 'light', hover: false, pressScale: 1, hoverScale: 1 },
      { x: startX, y: startY + gap, w: btnW, h: btnH, label: '🧱 添加影块', tool: 'shadowBlock', hover: false, pressScale: 1, hoverScale: 1 },
      { x: startX, y: startY + gap * 2, w: btnW, h: btnH, label: '🟫 添加砖块', tool: 'brick', hover: false, pressScale: 1, hoverScale: 1 },
    ];

    this.clearBtn = { x: startX, y: startY + gap * 3 + 10, w: btnW, h: btnH, label: '🗑 清空关卡', tool: 'none', hover: false, pressScale: 1, hoverScale: 1 };
    this.runTestBtn = { x: startX, y: startY + gap * 4 + 30, w: btnW, h: 50, label: '▶ 运行测试', tool: 'none', hover: false, pressScale: 1, hoverScale: 1 };
  }

  updateLayout(gameAreaWidth: number, canvasHeight: number): void {
    this.panelX = gameAreaWidth;
    this.panelHeight = canvasHeight;
    this.initButtons();
  }

  handleMouseMove(canvasX: number, canvasY: number): void {
    this.mouseX = canvasX;
    this.mouseY = canvasY;

    for (const btn of this.buttons) {
      btn.hover = this.isInsideButton(canvasX, canvasY, btn);
      btn.hoverScale = btn.hover ? 0.95 : 1;
    }
    this.clearBtn.hover = this.isInsideButton(canvasX, canvasY, this.clearBtn);
    this.clearBtn.hoverScale = this.clearBtn.hover ? 0.95 : 1;
    this.runTestBtn.hover = this.isInsideButton(canvasX, canvasY, this.runTestBtn);
    this.runTestBtn.hoverScale = this.runTestBtn.hover ? 0.95 : 1;
  }

  handleClick(canvasX: number, canvasY: number): EditorTool | 'runTest' | 'clear' | null {
    for (const btn of this.buttons) {
      if (this.isInsideButton(canvasX, canvasY, btn)) {
        btn.pressScale = 0.92;
        setTimeout(() => { btn.pressScale = 1; }, 100);
        this.selectedTool = btn.tool;
        if (this.onToolSelect) this.onToolSelect(btn.tool);
        return btn.tool;
      }
    }

    if (this.isInsideButton(canvasX, canvasY, this.clearBtn)) {
      this.clearBtn.pressScale = 0.92;
      setTimeout(() => { this.clearBtn.pressScale = 1; }, 100);
      if (this.onClearLevel) this.onClearLevel();
      return 'clear';
    }

    if (this.isInsideButton(canvasX, canvasY, this.runTestBtn)) {
      this.runTestBtn.pressScale = 0.92;
      setTimeout(() => { this.runTestBtn.pressScale = 1; }, 100);
      if (this.onRunTest) this.onRunTest();
      return 'runTest';
    }

    return null;
  }

  private isInsideButton(x: number, y: number, btn: ButtonState): boolean {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
    this.roundRect(ctx, this.panelX, this.panelY, this.panelWidth, this.panelHeight, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.panelX, this.panelY, this.panelWidth, this.panelHeight, 10);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🔧 关卡编辑器', this.panelX + this.panelWidth / 2, 40);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px monospace';
    ctx.fillText('点击按钮后在场景中放置', this.panelX + this.panelWidth / 2, 62);

    for (const btn of this.buttons) {
      this.renderButton(ctx, btn, btn.tool === this.selectedTool, time);
    }

    this.renderButton(ctx, this.clearBtn, false, time);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(this.panelX + 20, this.runTestBtn.y - 18, 240, 1);

    this.renderRunTestButton(ctx, time);

    ctx.restore();
  }

  private renderButton(ctx: CanvasRenderingContext2D, btn: ButtonState, isSelected: boolean, time: number): void {
    ctx.save();
    const scale = btn.pressScale || btn.hoverScale || 1;
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    let grad: CanvasGradient;
    if (isSelected) {
      grad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y);
      grad.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
      grad.addColorStop(1, 'rgba(74, 0, 128, 0.4)');
    } else {
      grad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y);
      grad.addColorStop(0, 'rgba(74, 0, 128, 0.3)');
      grad.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
    }

    ctx.fillStyle = grad;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    if (btn.hover) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    } else if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    }
    ctx.lineWidth = isSelected ? 2 : 1;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.85)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, cx, cy);

    ctx.restore();
  }

  private renderRunTestButton(ctx: CanvasRenderingContext2D, time: number): void {
    const btn = this.runTestBtn;
    ctx.save();
    const scale = btn.pressScale || btn.hoverScale || 1;
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    const pulse = 0.9 + 0.1 * Math.sin(time * 3);
    const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y);
    grad.addColorStop(0, `rgba(0, 200, 100, ${pulse * 0.6})`);
    grad.addColorStop(1, `rgba(0, 255, 150, ${pulse * 0.6})`);

    ctx.fillStyle = grad;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    if (btn.hover) {
      ctx.shadowColor = 'rgba(0, 255, 150, 0.5)';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(0, 255, 150, 0.7)';
    } else {
      ctx.strokeStyle = 'rgba(0, 255, 150, 0.5)';
    }
    ctx.lineWidth = 2;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, cx, cy);

    ctx.restore();
  }

  renderSeparator(ctx: CanvasRenderingContext2D, x: number, height: number): void {
    const grad = ctx.createLinearGradient(x, 0, x, height);
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(0.5, '#8B45C6');
    grad.addColorStop(1, '#4A0080');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 1, 0, 2, height);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  isInsidePanel(canvasX: number): boolean {
    return canvasX >= this.panelX;
  }
}
