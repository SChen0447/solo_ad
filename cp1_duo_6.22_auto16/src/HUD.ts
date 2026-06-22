export class HUD {
  private container: HTMLElement;
  private compassContainer: HTMLElement;
  private compassCanvas: HTMLCanvasElement;
  private compassCtx: CanvasRenderingContext2D;
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
      
      #compass-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        background: rgba(10, 10, 30, 0.5);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 12px;
        border: 1px solid rgba(100, 150, 255, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
        user-select: none;
      }
      
      #compass-label {
        color: #6080c0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      #compass-canvas {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(100, 150, 255, 0.2);
      }
      
      #compass-value {
        color: #c0d8ff;
        font-weight: bold;
        font-size: 12px;
        min-width: 30px;
        text-align: center;
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
        
        #compass-container {
          top: 10px;
          right: 10px;
          padding: 6px 10px;
        }
        
        #compass-canvas {
          width: 44px;
          height: 44px;
        }
        
        #compass-label, #compass-value {
          font-size: 9px;
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
    
    this.compassContainer = document.createElement('div');
    this.compassContainer.id = 'compass-container';
    
    const compassLabel = document.createElement('span');
    compassLabel.id = 'compass-label';
    compassLabel.textContent = 'HDG';
    
    this.compassCanvas = document.createElement('canvas');
    this.compassCanvas.id = 'compass-canvas';
    this.compassCanvas.width = 56;
    this.compassCanvas.height = 56;
    this.compassCtx = this.compassCanvas.getContext('2d')!;
    
    const compassValue = document.createElement('span');
    compassValue.id = 'compass-value';
    compassValue.textContent = 'N';
    
    this.compassContainer.appendChild(compassLabel);
    this.compassContainer.appendChild(this.compassCanvas);
    this.compassContainer.appendChild(compassValue);
    
    document.body.appendChild(this.compassContainer);
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

  update(position: { x: number; y: number; z: number }, starCount: number, fps: number, deltaTime: number, theta: number): void {
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
    
    this.updateCompass(theta);
  }

  private updateCompass(theta: number): void {
    const ctx = this.compassCtx;
    const width = this.compassCanvas.width;
    const height = this.compassCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 4;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#6080c0';
    ctx.font = '8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const directions = ['N', 'E', 'S', 'W'];
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 2 + theta;
      const x = cx + Math.cos(angle) * (radius - 8);
      const y = cy + Math.sin(angle) * (radius - 8);
      
      if (i === 0) {
        ctx.fillStyle = '#ff8080';
      } else {
        ctx.fillStyle = '#6080c0';
      }
      ctx.fillText(directions[i], x, y);
    }
    
    const pointerAngle = -Math.PI / 2 + theta;
    ctx.strokeStyle = '#80ff80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(pointerAngle) * (radius - 2),
      cy + Math.sin(pointerAngle) * (radius - 2)
    );
    ctx.stroke();
    
    ctx.fillStyle = '#80ff80';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    
    const compassValue = document.getElementById('compass-value')!;
    const normalizedTheta = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const degrees = Math.round(normalizedTheta * 180 / Math.PI);
    
    let dir = '';
    if (degrees >= 337.5 || degrees < 22.5) dir = 'N';
    else if (degrees >= 22.5 && degrees < 67.5) dir = 'NE';
    else if (degrees >= 67.5 && degrees < 112.5) dir = 'E';
    else if (degrees >= 112.5 && degrees < 157.5) dir = 'SE';
    else if (degrees >= 157.5 && degrees < 202.5) dir = 'S';
    else if (degrees >= 202.5 && degrees < 247.5) dir = 'SW';
    else if (degrees >= 247.5 && degrees < 292.5) dir = 'W';
    else if (degrees >= 292.5 && degrees < 337.5) dir = 'NW';
    
    compassValue.textContent = `${degrees.toString().padStart(3, '0')}° ${dir}`;
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
