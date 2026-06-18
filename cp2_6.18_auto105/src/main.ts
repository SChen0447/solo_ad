import { HexMap, type HexCell } from './hexMap';
import { ControlPanel } from './panel';
import { StatusBar, type StatusBarData } from './statusBar';

interface ChainNode {
  key: string;
  label: string;
  icon: string;
  color: string;
  idleColor: string;
  haloColor: string;
  element: HTMLDivElement;
  iconBox: HTMLDivElement;
  glowLayer: HTMLDivElement;
  valueEl: HTMLElement;
  currentValue: number;
  targetValue: number;
  currentColor: string;
  targetColor: string;
  currentHaloAlpha: number;
  targetHaloAlpha: number;
  currentBorderWidth: number;
  targetBorderWidth: number;
  isEmphasized: boolean;
  animStart: number;
  lastDeployedCount: number;
}

interface ChainArrow {
  element: SVGSVGElement;
  path: SVGPathElement;
  dashOffset: number;
  baseColor: string;
  activeColor: string;
}

const BASE_NODE_COLORS: Record<string, string> = {
  mine: '#8b5cf6',
  transport: '#3b82f6',
  refine: '#f59e0b',
  sell: '#10b981',
};

const IDLE_NODE_COLORS: Record<string, string> = {
  mine: '#4c1d95',
  transport: '#1e40af',
  refine: '#92400e',
  sell: '#065f46',
};

const HALO_COLORS: Record<string, string> = {
  mine: '#9ca3af',
  transport: '#1e3a8a',
  refine: '#6d28d9',
  sell: '#fbbf24',
};

const HALO_CYCLE_SEC = 2.0;
const HALO_MIN_ALPHA = 0.1;
const HALO_MAX_ALPHA = 0.3;
const HALO_EMPHASIZED_ALPHA = 0.4;
const EMPHASIS_BORDER_WIDTH = 4;
const DEFAULT_BORDER_WIDTH = 2;
const EMPHASIS_TRANSITION_SEC = 0.3;

class App {
  private app: HTMLElement;
  private hexMap!: HexMap;
  private controlPanel!: ControlPanel;
  private statusBar!: StatusBar;
  private chainNodes: ChainNode[] = [];
  private chainArrows: ChainArrow[] = [];
  private chainContainer!: HTMLDivElement;

  private totalOutput: number = 0;
  private financialIncome: number = 0;
  private lastFrameTime: number = 0;
  private gameStartTime: number = 0;
  private elapsedTime: number = 0;

  private cachedRatePerSec: number = 0;
  private cachedRateDirty: boolean = true;
  private lastDeployedHash: string = '';

  private pendingStatusUpdate: StatusBarData | null = null;
  private statusRafPending: boolean = false;

  private isMineSelected: boolean = false;

  constructor() {
    const appEl = document.getElementById('app');
    if (!appEl) throw new Error('App container not found');
    this.app = appEl;
    this.init();
  }

  private init(): void {
    this.injectGlobalStyles();
    this.createLayout();
    this.initModules();
    this.gameStartTime = performance.now();
    this.lastFrameTime = this.gameStartTime;
    this.startGameLoop();
  }

  private injectGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .chain-node-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-width: 100px;
        flex-shrink: 0;
        position: relative;
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chain-node-icon-holder {
        position: relative;
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chain-node-glow {
        position: absolute;
        top: -16px;
        left: -16px;
        width: 84px;
        height: 84px;
        border-radius: 50%;
        pointer-events: none;
        transition: opacity ${EMPHASIS_TRANSITION_SEC}s ease-out;
        filter: blur(8px);
      }
      .chain-node-iconbox {
        position: relative;
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        border-style: solid;
        z-index: 1;
        transition: background-color 0.5s ease-out,
                    border-color 0.5s ease-out,
                    border-width ${EMPHASIS_TRANSITION_SEC}s ease-out,
                    box-shadow ${EMPHASIS_TRANSITION_SEC}s ease-out,
                    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chain-node-label {
        font-size: 12px;
        color: #9ca3af;
        transition: color 0.5s ease-out;
      }
      .chain-node-label.active {
        color: #e5e7eb;
      }
      .chain-node-value {
        font-size: 16px;
        font-weight: 700;
        min-width: 80px;
        text-align: center;
        transition: color 0.5s ease-out,
                    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes chainPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
      }
      .chain-node-active .chain-node-iconbox {
        animation: chainPulse 1.8s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  private createLayout(): void {
    const mainRow = document.createElement('div');
    mainRow.style.cssText = `
      display: flex;
      gap: 20px;
      padding: 20px;
      flex: 1;
      overflow: hidden;
    `;
    this.app.appendChild(mainRow);

    const leftColumn = document.createElement('div');
    leftColumn.style.cssText = `
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      gap: 0;
    `;
    mainRow.appendChild(leftColumn);

    const mapContainer = document.createElement('div');
    mapContainer.style.cssText = `
      width: 100%;
      height: 600px;
      min-height: 600px;
      background: #0b0f19;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      border: 1px solid #1f2937;
    `;
    leftColumn.appendChild(mapContainer);

    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    mapContainer.appendChild(canvas);

    this.chainContainer = document.createElement('div');
    this.chainContainer.style.cssText = `
      width: 100%;
      height: 120px;
      min-height: 120px;
      background: #111827;
      border-radius: 12px;
      margin-top: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 40px;
      gap: 0;
      position: relative;
      border-top: 1px solid #1f2937;
      border-bottom: 1px solid #1f2937;
    `;
    this.createSupplyChain();
    leftColumn.appendChild(this.chainContainer);

    const panelContainer = document.createElement('div');
    panelContainer.style.cssText = `
      display: flex;
      flex-direction: column;
    `;
    mainRow.appendChild(panelContainer);
    (this.app as any)._panelContainer = panelContainer;
    (this.app as any)._canvas = canvas;
  }

  private createSupplyChain(): void {
    const nodeConfigs = [
      { key: 'mine', label: '矿场', icon: '⛏️' },
      { key: 'transport', label: '运输', icon: '🚀' },
      { key: 'refine', label: '精炼', icon: '🔥' },
      { key: 'sell', label: '出售', icon: '💎' },
    ];

    for (let i = 0; i < nodeConfigs.length; i++) {
      const config = nodeConfigs[i];
      const baseColor = BASE_NODE_COLORS[config.key];
      const idleColor = IDLE_NODE_COLORS[config.key];
      const haloColor = HALO_COLORS[config.key];
      const node = this.createChainNode(config.label, config.icon, idleColor, baseColor, haloColor);
      this.chainContainer.appendChild(node.element);
      this.chainNodes.push({
        key: config.key,
        label: config.label,
        icon: config.icon,
        color: baseColor,
        idleColor,
        haloColor,
        element: node.element,
        iconBox: node.iconBox,
        glowLayer: node.glowLayer,
        valueEl: node.valueEl,
        currentValue: 0,
        targetValue: 0,
        currentColor: idleColor,
        targetColor: idleColor,
        currentHaloAlpha: HALO_MIN_ALPHA,
        targetHaloAlpha: HALO_MIN_ALPHA,
        currentBorderWidth: DEFAULT_BORDER_WIDTH,
        targetBorderWidth: DEFAULT_BORDER_WIDTH,
        isEmphasized: false,
        animStart: 0,
        lastDeployedCount: 0,
      });

      if (i < nodeConfigs.length - 1) {
        const arrow = this.createChainArrow(i);
        this.chainContainer.appendChild(arrow.element);
        this.chainArrows.push({
          element: arrow.element,
          path: arrow.path,
          dashOffset: 0,
          baseColor: '#1e3a8a',
          activeColor: '#2563eb',
        });
      }
    }
  }

  private createChainNode(
    label: string,
    icon: string,
    _idleColor: string,
    _baseColor: string,
    haloColor: string
  ) {
    const wrap = document.createElement('div');
    wrap.className = 'chain-node-wrap';

    const holder = document.createElement('div');
    holder.className = 'chain-node-icon-holder';

    const glowLayer = document.createElement('div');
    glowLayer.className = 'chain-node-glow';
    glowLayer.style.background = `radial-gradient(circle, ${haloColor} 0%, transparent 70%)`;
    glowLayer.style.opacity = HALO_MIN_ALPHA.toString();

    const iconBox = document.createElement('div');
    iconBox.className = 'chain-node-iconbox';
    const key =
      label === '矿场'
        ? 'mine'
        : label === '运输'
        ? 'transport'
        : label === '精炼'
        ? 'refine'
        : 'sell';
    iconBox.style.background = `${IDLE_NODE_COLORS[key]}20`;
    iconBox.style.borderColor = IDLE_NODE_COLORS[key];
    iconBox.style.borderWidth = `${DEFAULT_BORDER_WIDTH}px`;
    iconBox.style.boxShadow = `0 0 8px ${IDLE_NODE_COLORS[key]}30`;
    iconBox.textContent = icon;

    holder.appendChild(glowLayer);
    holder.appendChild(iconBox);

    const labelEl = document.createElement('div');
    labelEl.className = 'chain-node-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'chain-node-value';
    valueEl.style.color = IDLE_NODE_COLORS[key];
    valueEl.textContent = '0.00 吨/秒';

    wrap.appendChild(holder);
    wrap.appendChild(labelEl);
    wrap.appendChild(valueEl);

    return { element: wrap, iconBox, glowLayer, valueEl };
  }

  private createChainArrow(_index: number) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '90');
    svg.setAttribute('height', '32');
    svg.setAttribute('viewBox', '0 0 90 32');
    svg.style.cssText = 'flex-shrink: 0; transition: opacity 0.5s ease-out;';
    svg.style.opacity = '0.4';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M4 16 L68 16 M60 8 L68 16 L60 24');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#1e3a8a');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-dasharray', '6 6');
    path.setAttribute('stroke-dashoffset', '0');
    svg.appendChild(path);

    return { element: svg, path };
  }

  private initModules(): void {
    const canvas = (this.app as any)._canvas as HTMLCanvasElement;
    const panelContainer = (this.app as any)._panelContainer as HTMLElement;

    this.hexMap = new HexMap(canvas, {
      onSelect: (cell) => this.onHexSelect(cell),
      onUpdate: (cell) => this.onHexUpdate(cell),
      onEfficiencyChange: (cell) => this.onEfficiencyChanged(cell),
    });

    this.controlPanel = new ControlPanel(panelContainer, {
      onEfficiencyChange: (id, eff) => {
        this.hexMap.setEfficiency(id, eff);
        this.cachedRateDirty = true;
      },
    });

    this.statusBar = new StatusBar(this.app);

    this.hexMap.resize();
    this.hexMap.startLoop();
  }

  private onHexSelect(cell: HexCell | null): void {
    this.controlPanel.setCell(cell);
    this.cachedRateDirty = true;
    this.scheduleStatusUpdate();

    this.isMineSelected = cell !== null;
    for (const node of this.chainNodes) {
      if (node.key === 'mine') {
        node.isEmphasized = this.isMineSelected;
        node.targetHaloAlpha = this.isMineSelected
          ? HALO_EMPHASIZED_ALPHA
          : HALO_MIN_ALPHA;
        node.targetBorderWidth = this.isMineSelected
          ? EMPHASIS_BORDER_WIDTH
          : DEFAULT_BORDER_WIDTH;
      }
    }
  }

  private onHexUpdate(cell: HexCell): void {
    this.controlPanel.updateCell(cell);
  }

  private onEfficiencyChanged(_cell: HexCell): void {
    this.cachedRateDirty = true;
    this.scheduleStatusUpdate();
  }

  private computeRateHash(): string {
    const deployed = this.hexMap.getDeployedCells();
    if (deployed.length === 0) return 'empty';
    return deployed
      .map((c) => `${c.id}:${c.efficiency.toFixed(2)}:${c.annualOutput}`)
      .sort()
      .join('|');
  }

  private getDeployedRatePerSec(): number {
    const currentHash = this.computeRateHash();
    if (!this.cachedRateDirty && currentHash === this.lastDeployedHash) {
      return this.cachedRatePerSec;
    }

    const deployed = this.hexMap.getDeployedCells();
    const rate = deployed.reduce((sum, c) => {
      const perYear = c.annualOutput * c.efficiency;
      const perSec = perYear / 31536000;
      return sum + perSec * 100;
    }, 0);

    this.cachedRatePerSec = rate;
    this.lastDeployedHash = currentHash;
    this.cachedRateDirty = false;
    return rate;
  }

  private interpolateColor(from: string, to: string, t: number): string {
    const fr = parseInt(from.slice(1, 3), 16);
    const fg = parseInt(from.slice(3, 5), 16);
    const fb = parseInt(from.slice(5, 7), 16);
    const tr = parseInt(to.slice(1, 3), 16);
    const tg = parseInt(to.slice(3, 5), 16);
    const tb = parseInt(to.slice(5, 7), 16);

    const r = Math.round(fr + (tr - fr) * t);
    const g = Math.round(fg + (tg - fg) * t);
    const b = Math.round(fb + (tb - fb) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  private rgbaString(r: number, g: number, b: number, alpha: number): string {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private computePulseHaloAlpha(elapsedSec: number, emphasized: boolean): number {
    if (emphasized) {
      const phase =
        (Math.sin((elapsedSec / HALO_CYCLE_SEC) * Math.PI * 2) + 1) / 2;
      const baseRange = HALO_EMPHASIZED_ALPHA - HALO_MAX_ALPHA;
      return HALO_MAX_ALPHA + phase * baseRange;
    } else {
      const phase =
        (Math.sin((elapsedSec / HALO_CYCLE_SEC) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      const range = HALO_MAX_ALPHA - HALO_MIN_ALPHA;
      return HALO_MIN_ALPHA + phase * range;
    }
  }

  private updateChainNodes(dt: number): void {
    this.elapsedTime += dt;
    const rate = this.getDeployedRatePerSec();
    const deployed = this.hexMap.getDeployedCells();
    const deployedCount = deployed.length;
    const hasActivity = rate > 0.001;
    const activityT = Math.min(rate * 2, 1);
    const easeT = 1 - Math.pow(1 - activityT, 3);

    const transitionSpeed = 1 / EMPHASIS_TRANSITION_SEC;

    for (let i = 0; i < this.chainNodes.length; i++) {
      const node = this.chainNodes[i];
      const efficiencyLoss = 1 - i * 0.05;
      const targetVal = Math.max(0, rate * efficiencyLoss);
      node.targetValue = targetVal;

      const diff = node.targetValue - node.currentValue;
      node.currentValue += diff * Math.min(dt * 2.5, 1);

      const baseColor = node.color;
      const idleColor = node.idleColor;
      node.targetColor = hasActivity ? baseColor : idleColor;

      if (node.currentColor !== node.targetColor) {
        const colT = Math.min(dt * 3, 1);
        node.currentColor = this.interpolateColor(
          node.currentColor,
          node.targetColor,
          colT
        );
      }

      const pulse = this.computePulseHaloAlpha(this.elapsedTime, node.isEmphasized);
      if (node.key === 'mine' && node.isEmphasized) {
        node.targetHaloAlpha = Math.max(HALO_MAX_ALPHA, pulse);
      } else {
        node.targetHaloAlpha = pulse;
      }

      const haloDiff = node.targetHaloAlpha - node.currentHaloAlpha;
      node.currentHaloAlpha += haloDiff * Math.min(dt * transitionSpeed, 1);
      if (Math.abs(haloDiff) < 0.001) {
        node.currentHaloAlpha = node.targetHaloAlpha;
      }

      const borderDiff = node.targetBorderWidth - node.currentBorderWidth;
      node.currentBorderWidth += borderDiff * Math.min(dt * transitionSpeed, 1);
      if (Math.abs(borderDiff) < 0.01) {
        node.currentBorderWidth = node.targetBorderWidth;
      }

      const haloRgb = this.hexToRgb(node.haloColor);
      const alpha1 = node.currentHaloAlpha;
      const alpha2 = Math.max(0, node.currentHaloAlpha * 0.6);
      const baseGlow = this.rgbaString(haloRgb.r, haloRgb.g, haloRgb.b, alpha1);
      const outerGlow = this.rgbaString(haloRgb.r, haloRgb.g, haloRgb.b, alpha2);
      node.glowLayer.style.background = `radial-gradient(circle, ${baseGlow} 0%, ${outerGlow} 40%, transparent 75%)`;
      node.glowLayer.style.opacity = '1';

      const displayVal = node.currentValue;
      node.valueEl.textContent = `${displayVal.toFixed(2)} 吨/秒`;
      node.valueEl.style.color = node.currentColor;
      node.valueEl.style.transform = hasActivity ? 'scale(1.05)' : 'scale(1)';

      const activityGlowSize = hasActivity ? 18 + 10 * easeT : 8;
      const activityGlowAlpha = hasActivity
        ? (40 + 30 * easeT) / 255
        : 48 / 255;
      const colRgb = this.hexToRgb(node.currentColor);
      const activityShadow = this.rgbaString(
        colRgb.r,
        colRgb.g,
        colRgb.b,
        activityGlowAlpha
      );
      const haloShadowSize = node.isEmphasized ? 22 : 12;
      const haloShadow = this.rgbaString(
        haloRgb.r,
        haloRgb.g,
        haloRgb.b,
        node.currentHaloAlpha
      );

      node.iconBox.style.background = `${node.currentColor}20`;
      node.iconBox.style.borderColor = node.currentColor;
      node.iconBox.style.borderWidth = `${node.currentBorderWidth}px`;
      node.iconBox.style.boxShadow =
        `0 0 ${activityGlowSize}px ${activityShadow}, ` +
        `0 0 ${haloShadowSize}px ${haloShadow}`;

      const labelEl = node.element.querySelector('.chain-node-label') as HTMLElement;
      if (labelEl) {
        labelEl.classList.toggle('active', hasActivity);
      }

      if (hasActivity) {
        node.element.classList.add('chain-node-active');
      } else {
        node.element.classList.remove('chain-node-active');
      }
      node.lastDeployedCount = deployedCount;
    }

    const flowSpeed = 2 + activityT * 6;
    for (let i = 0; i < this.chainArrows.length; i++) {
      const arrow = this.chainArrows[i];
      arrow.dashOffset -= flowSpeed;
      arrow.path.setAttribute('stroke-dashoffset', String(arrow.dashOffset));

      const fromColor = arrow.baseColor;
      const toColor = arrow.activeColor;
      const arrowCol = hasActivity
        ? this.interpolateColor(fromColor, toColor, easeT)
        : fromColor;
      arrow.path.setAttribute('stroke', arrowCol);
      arrow.element.style.opacity = hasActivity
        ? `${0.6 + 0.4 * easeT}`
        : '0.4';

      const prevNode = this.chainNodes[i];
      const nextNode = this.chainNodes[i + 1];
      if (prevNode && nextNode) {
        const hasPrevFlow = prevNode.currentValue > 0.001;
        const hasNextFlow = nextNode.currentValue > 0.001;
        const connected = hasPrevFlow && hasNextFlow;
        arrow.path.setAttribute('stroke-opacity', connected ? '1' : '0.5');
      }
    }
  }

  private scheduleStatusUpdate(): void {
    const data: StatusBarData = {
      totalOutput: this.totalOutput,
      financialIncome: this.financialIncome,
      deployedCount: this.hexMap.getDeployedCells().length,
      totalEfficiencyOutput: this.getDeployedRatePerSec(),
    };
    this.pendingStatusUpdate = data;
    if (!this.statusRafPending) {
      this.statusRafPending = true;
      requestAnimationFrame(() => this.flushStatusUpdate());
    }
  }

  private flushStatusUpdate(): void {
    if (this.pendingStatusUpdate) {
      this.statusBar.update(this.pendingStatusUpdate);
      this.pendingStatusUpdate = null;
    }
    this.statusRafPending = false;
  }

  private startGameLoop(): void {
    let lastStatusBatch = 0;
    const STATUS_BATCH_INTERVAL = 50;

    const loop = (time: number): void => {
      const dt = Math.min((time - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = time;

      const ratePerSec = this.getDeployedRatePerSec();
      this.totalOutput += ratePerSec * dt;
      this.financialIncome += ratePerSec * dt * 0.5;

      this.updateChainNodes(dt);

      this.statusBar.setDisplayedValues(this.totalOutput, this.financialIncome);
      if (time - lastStatusBatch >= STATUS_BATCH_INTERVAL) {
        lastStatusBatch = time;
        this.scheduleStatusUpdate();
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
