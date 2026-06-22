export class HUD {
  private container: HTMLElement;
  private fpsValueElement: HTMLElement;
  private coordsElement: HTMLElement;
  private starCountElement: HTMLElement;
  private fpsChartCanvas: HTMLCanvasElement;
  private fpsChartCtx: CanvasRenderingContext2D;
  private fpsHistory: number[] = [];
  private maxFpsHistory: number = 60;
  private warningActive: boolean = false;
  private warningBlinkState: boolean = false;
  private warningBlinkTimer: number = 0;
  private readonly WARNING_THRESHOLD: number = 25;
  private readonly WARNING_BLINK_INTERVAL: number = 500;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    
    const style = document.createElement('style');
    style.textContent = `
      #hud-container {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        gap: 16px;
        padding: 12px 20px;
        background: rgba(10, 10, 30, 0.5);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 12px;
        border: 1px solid rgba(100, 150, 255, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
        color: #a0c0ff;
        font-size: 13px;
        user-select: none;
      }
      
      .hud-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: rgba(20, 30, 60, 0.4);
        border-radius: 8px;
        border: 1px solid rgba(100, 150, 255, 0.1);
      }
      
      .hud-label {
        color: #6080c0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .hud-value {
        color: #c0d8ff;
        font-weight: bold;
        min-width: 40px;
      }
      
      .hud-value.warning {
        animation: blink 0.5s ease-in-out infinite;
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; color: #ff6060; text-shadow: 0 0 10px rgba(255, 96, 96, 0.5); }
        50% { opacity: 0.4; color: #ff9090; text-shadow: none; }
      }
      
      .fps-chart-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      #fps-chart {
        width: 80px;
        height: 24px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(100, 150, 255, 0.2);
      }
      
      @media (max-width: 768px) {
        #hud-container {
          top: 10px;
          padding: 8px 12px;
          gap: 8px;
          font-size: 10px;
        }
        
        .hud-item {
          padding: 3px 8px;
        }
        
        .hud-label {
          font-size: 9px;
        }
        
        #fps-chart {
          width: 60px;
          height: 18px;
        }
      }
    `;
    document.head.appendChild(style);
    
    this.coordsElement = this.createHudItem('POS', 'X: 0 Y: 0 Z: 0');
    this.starCountElement = this.createHudItem('STARS', '0');
    
    const fpsChartContainer = document.createElement('div');
    fpsChartContainer.className = 'hud-item fps-chart-container';
    
    const fpsLabel = document.createElement('span');
    fpsLabel.className = 'hud-label';
    fpsLabel.textContent = 'FPS';
    
    this.fpsChartCanvas = document.createElement('canvas');
    this.fpsChartCanvas.id = 'fps-chart';
    this.fpsChartCanvas.width = 80;
    this.fpsChartCanvas.height = 24;
    this.fpsChartCtx = this.fpsChartCanvas.getContext('2d')!;
    
    this.fpsValueElement = document.createElement('span');
    this.fpsValueElement.className = 'hud-value';
    this.fpsValueElement.textContent = '--';
    
    fpsChartContainer.appendChild(fpsLabel);
    fpsChartContainer.appendChild(this.fpsChartCanvas);
    fpsChartContainer.appendChild(this.fpsValueElement);
    
    this.container.appendChild(this.coordsElement);
    this.container.appendChild(this.starCountElement);
    this.container.appendChild(fpsChartContainer);
    
    document.body.appendChild(this.container);
  }

  private createHudItem(label: string, initialValue: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'hud-item';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'hud-label';
    labelSpan.textContent = label;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'hud-value';
    valueSpan.textContent = initialValue;
    
    item.appendChild(labelSpan);
    item.appendChild(valueSpan);
    
    return item;
  }

  update(position: { x: number; y: number; z: number }, starCount: number, fps: number, deltaTime: number): void {
    this.fpsValueElement.textContent = fps.toFixed(0);
    
    this.warningBlinkTimer += deltaTime * 1000;
    if (fps < this.WARNING_THRESHOLD) {
      if (!this.warningActive) {
        this.warningActive = true;
        this.warningBlinkTimer = 0;
      }
      
      if (this.warningBlinkTimer >= this.WARNING_BLINK_INTERVAL) {
        this.warningBlinkState = !this.warningBlinkState;
        this.warningBlinkTimer = 0;
      }
      
      this.fpsValueElement.classList.add('warning');
    } else {
      this.warningActive = false;
      this.warningBlinkState = false;
      this.fpsValueElement.classList.remove('warning');
    }
    
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }
    
    this.drawFpsChart();
    
    const coordsValue = this.coordsElement.querySelector('.hud-value')!;
    coordsValue.textContent = `X:${position.x.toFixed(1)} Y:${position.y.toFixed(1)} Z:${position.z.toFixed(1)}`;
    
    const starCountValue = this.starCountElement.querySelector('.hud-value')!;
    starCountValue.textContent = starCount.toLocaleString();
  }

  private drawFpsChart(): void {
    const ctx = this.fpsChartCtx;
    const width = this.fpsChartCanvas.width;
    const height = this.fpsChartCanvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = width / this.maxFpsHistory;
    const minFps = 10;
    const maxFps = 75;
    
    for (let i = 0; i < this.fpsHistory.length; i++) {
      const fps = this.fpsHistory[i];
      const normalized = Math.max(0, Math.min(1, (fps - minFps) / (maxFps - minFps)));
      const barHeight = normalized * (height - 2);
      const x = i * barWidth;
      const y = height - barHeight - 1;
      
      if (fps < this.WARNING_THRESHOLD) {
        ctx.fillStyle = '#ff6060';
      } else if (fps < 35) {
        ctx.fillStyle = '#ffb060';
      } else {
        ctx.fillStyle = '#60ff90';
      }
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
    
    const thirtyFpsY = height - ((30 - minFps) / (maxFps - minFps)) * (height - 2) - 1;
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, thirtyFpsY);
    ctx.lineTo(width, thirtyFpsY);
    ctx.stroke();
  }
}
