export class UI {
  private hudContainer: HTMLElement;
  private loadingScreen: HTMLElement;
  private progressBar: HTMLElement;
  private loadingText: HTMLElement;
  private readyText: HTMLElement;
  private speedGaugeNeedle: HTMLElement;
  private tiltGaugeNeedle: HTMLElement;
  private speedValue: HTMLElement;
  private tiltValue: HTMLElement;
  private fpsValue: HTMLElement;
  private speedGaugeCanvas: HTMLCanvasElement;
  private tiltGaugeCanvas: HTMLCanvasElement;
  private speedNeedleRotation: number = 0;

  constructor() {
    this.hudContainer = document.getElementById('hud-container')!;
    this.loadingScreen = document.getElementById('loading-screen')!;
    this.progressBar = document.getElementById('progress-bar')!;
    this.loadingText = document.getElementById('loading-text')!;
    this.readyText = document.getElementById('ready-text')!;
    this.speedGaugeCanvas = document.createElement('canvas');
    this.tiltGaugeCanvas = document.createElement('canvas');
    this.speedGaugeNeedle = document.createElement('div');
    this.tiltGaugeNeedle = document.createElement('div');
    this.speedValue = document.createElement('div');
    this.tiltValue = document.createElement('div');
    this.fpsValue = document.createElement('div');

    this.createControlPanel();
    this.createGauges();
    this.createFPSCounter();
  }

  private createControlPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '操作说明';
    panel.appendChild(title);

    const controls = [
      { keys: ['W', 'A', 'S', 'D'], desc: '控制小车移动' },
      { keys: ['Shift + 左键'], desc: '地形隆起' },
      { keys: ['左键'], desc: '地形凹陷' },
      { keys: ['拖拽'], desc: '连续编辑地形' }
    ];

    controls.forEach(control => {
      const item = document.createElement('div');
      item.className = 'control-item';

      const keyCap = document.createElement('span');
      keyCap.className = 'key-cap' + (control.keys[0].length > 1 ? ' wide' : '');
      keyCap.textContent = control.keys.join(' + ');
      item.appendChild(keyCap);

      const desc = document.createElement('span');
      desc.textContent = control.desc;
      item.appendChild(desc);

      panel.appendChild(item);
    });

    this.hudContainer.appendChild(panel);
  }

  private createGauges(): void {
    const container = document.createElement('div');
    container.className = 'gauges-container';

    const speedGauge = this.createGauge('速度', this.speedGaugeCanvas, this.speedGaugeNeedle, this.speedValue, 'km/h');
    const tiltGauge = this.createGauge('倾斜', this.tiltGaugeCanvas, this.tiltGaugeNeedle, this.tiltValue, '°');

    container.appendChild(speedGauge);
    container.appendChild(tiltGauge);
    this.hudContainer.appendChild(container);

    this.drawGaugeBackground(this.speedGaugeCanvas, 0, 120, 'speed');
    this.drawGaugeBackground(this.tiltGaugeCanvas, -45, 45, 'tilt');
  }

  private createGauge(
    label: string,
    canvas: HTMLCanvasElement,
    needle: HTMLElement,
    valueDisplay: HTMLElement,
    unit: string
  ): HTMLElement {
    const gauge = document.createElement('div');
    gauge.className = 'gauge';

    canvas.className = 'gauge-canvas';
    canvas.width = 140;
    canvas.height = 140;
    gauge.appendChild(canvas);

    needle.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 2px;
      height: 50px;
      background: linear-gradient(to top, #4fc3f7, transparent);
      transform-origin: center bottom;
      transform: translate(-50%, -100%) rotate(0deg);
      border-radius: 1px;
      box-shadow: 0 0 10px rgba(79, 195, 247, 0.8);
      transition: transform 0.1s ease-out;
    `;
    gauge.appendChild(needle);

    const centerDot = document.createElement('div');
    centerDot.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      background: #4fc3f7;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 15px rgba(79, 195, 247, 0.8);
    `;
    gauge.appendChild(centerDot);

    valueDisplay.className = 'gauge-value';
    valueDisplay.innerHTML = `0<span class="gauge-unit">${unit}</span>`;
    gauge.appendChild(valueDisplay);

    const labelEl = document.createElement('div');
    labelEl.className = 'gauge-label';
    labelEl.textContent = label;
    gauge.appendChild(labelEl);

    return gauge;
  }

  private drawGaugeBackground(
    canvas: HTMLCanvasElement,
    minValue: number,
    maxValue: number,
    type: string
  ): void {
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    ctx.clearRect(0, 0, width, height);

    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const angleRange = endAngle - startAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
    ctx.lineWidth = 8;
    ctx.stroke();

    if (type === 'tilt') {
      const zeroAngle = startAngle + angleRange * (0 - minValue) / (maxValue - minValue);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, zeroAngle - 0.02, zeroAngle + 0.02);
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    const tickCount = type === 'speed' ? 7 : 9;
    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + (maxValue - minValue) * (i / tickCount);
      const angle = startAngle + angleRange * (i / tickCount);

      const innerR = radius - 12;
      const outerR = radius - 4;

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (i % 2 === 0) {
        const labelR = radius - 22;
        const labelX = centerX + Math.cos(angle) * labelR;
        const labelY = centerY + Math.sin(angle) * labelR;

        ctx.font = 'bold 10px Consolas, Monaco, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(value).toString(), labelX, labelY);
      }
    }

    for (let i = 0; i <= tickCount * 4; i++) {
      if (i % 4 === 0) continue;
      const angle = startAngle + angleRange * (i / (tickCount * 4));

      const innerR = radius - 8;
      const outerR = radius - 4;

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private createFPSCounter(): void {
    const fpsContainer = document.createElement('div');
    fpsContainer.className = 'fps-counter';

    const label = document.createElement('span');
    label.className = 'fps-label';
    label.textContent = 'FPS';
    fpsContainer.appendChild(label);

    this.fpsValue.textContent = '60';
    fpsContainer.appendChild(this.fpsValue);

    this.hudContainer.appendChild(fpsContainer);
  }

  public updateLoadingProgress(progress: number, text: string): void {
    this.progressBar.style.width = `${Math.min(100, progress * 100)}%`;
    this.loadingText.textContent = text;
  }

  public hideLoadingScreen(): void {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 800);
  }

  public showLoadingComplete(): void {
    const text = '地形已就绪';
    let charIndex = 0;
    this.readyText.textContent = '';
    this.readyText.classList.add('visible');

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        this.readyText.textContent += text[charIndex];
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 150);

    setTimeout(() => {
      this.readyText.classList.remove('visible');
    }, 3000);
  }

  public updateGauges(speed: number, tilt: number, deltaTime: number): void {
    this.speedNeedleRotation += deltaTime * 30;
    const displaySpeed = (Math.abs(speed) * 3.6) * (0.8 + 0.2 * Math.sin(this.speedNeedleRotation * 0.1));
    const clampedSpeed = Math.min(Math.max(displaySpeed, 0), 120);
    this.speedValue.innerHTML = `${Math.round(clampedSpeed)}<span class="gauge-unit">km/h</span>`;

    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const angleRange = endAngle - startAngle;

    const speedAngle = startAngle + angleRange * (clampedSpeed / 120);
    const speedDeg = (speedAngle - Math.PI / 2) * (180 / Math.PI);
    this.speedGaugeNeedle.style.transform = `translate(-50%, -100%) rotate(${speedDeg}deg)`;

    const clampedTilt = Math.min(Math.max(tilt, -45), 45);
    this.tiltValue.innerHTML = `${Math.round(clampedTilt)}<span class="gauge-unit">°</span>`;

    const tiltAngle = startAngle + angleRange * ((clampedTilt + 45) / 90);
    const tiltDeg = (tiltAngle - Math.PI / 2) * (180 / Math.PI);
    this.tiltGaugeNeedle.style.transform = `translate(-50%, -100%) rotate(${tiltDeg}deg)`;

    if (clampedTilt > 25) {
      this.tiltGaugeNeedle.style.background = 'linear-gradient(to top, #ff5252, transparent)';
      this.tiltGaugeNeedle.style.boxShadow = '0 0 10px rgba(255, 82, 82, 0.8)';
    } else {
      this.tiltGaugeNeedle.style.background = 'linear-gradient(to top, #4fc3f7, transparent)';
      this.tiltGaugeNeedle.style.boxShadow = '0 0 10px rgba(79, 195, 247, 0.8)';
    }
  }

  public updateFPS(fps: number): void {
    this.fpsValue.textContent = Math.round(fps).toString();

    if (fps >= 55) {
      this.fpsValue.style.color = '#4caf50';
    } else if (fps >= 45) {
      this.fpsValue.style.color = '#ff9800';
    } else {
      this.fpsValue.style.color = '#f44336';
    }
  }
}
