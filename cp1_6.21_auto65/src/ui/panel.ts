export interface HistoryState {
  id: string;
  faceCount: number;
  vertexCount: number;
  algorithm: string;
  percent: number;
  elapsedMs: number;
  prevFaceCount: number;
  timestamp: number;
}

type AlgorithmType = 'edge-collapse' | 'vertex-clustering' | 'quadric-collapse';

type PanelEvent =
  | { type: 'SIMPLIFY'; algorithm: AlgorithmType; percent: number; requestId: string }
  | { type: 'APPLY_HISTORY'; historyId: string }
  | { type: 'RESET' }
  | { type: 'TOGGLE_DIFF' };

export class ControlPanel {
  private appContainer: HTMLElement;
  private root: HTMLDivElement;
  private eventListeners: Array<(e: PanelEvent) => void> = [];

  private percentSlider: HTMLInputElement | null = null;
  private percentDisplay: HTMLSpanElement | null = null;
  private historyListEl: HTMLDivElement | null = null;
  private clearHistoryBtn: HTMLButtonElement | null = null;
  private diffBtn: HTMLButtonElement | null = null;
  private activeHistoryId: string | null = null;

  private history: HistoryState[] = [];

  private loadingOverlay: HTMLDivElement | null = null;
  private progressFill: HTMLDivElement | null = null;
  private progressEstimate: HTMLDivElement | null = null;
  private loadingText: HTMLDivElement | null = null;

  constructor(appContainer: HTMLElement) {
    this.appContainer = appContainer;
    this.root = document.createElement('div');
    this.styleRoot();
    this.buildContent();
    this.appContainer.appendChild(this.root);
  }

  private styleRoot(): void {
    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: #21262d;
        border-radius: 3px;
        outline: none;
        transition: filter 200ms ease-in-out;
      }
      #control-panel input[type="range"]:hover {
        filter: brightness(1.25);
      }
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #58a6ff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2);
        transition: all 200ms ease-in-out;
      }
      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        background: #79b8ff;
        box-shadow: 0 0 0 5px rgba(88, 166, 255, 0.25);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #58a6ff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
      #control-panel button {
        transition: filter 200ms ease-in-out, transform 100ms ease, background 200ms ease-in-out, border-color 200ms ease-in-out;
      }
      #control-panel button:hover:not(:disabled) {
        filter: brightness(1.2);
      }
      #control-panel button:active:not(:disabled) {
        transform: scale(0.97);
      }
      #control-panel button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      #control-panel .history-item {
        transition: background 200ms ease-in-out, border-color 200ms ease-in-out;
      }
      #control-panel .history-item:hover {
        background: rgba(88, 166, 255, 0.06);
      }
      #control-panel .history-item.active {
        background: rgba(88, 166, 255, 0.12);
        border-color: rgba(88, 166, 255, 0.45);
      }
      @media (max-width: 768px) {
        #control-panel {
          width: 100% !important;
          height: 420px !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: auto !important;
          position: absolute !important;
        }
      }
    `;
    document.head.appendChild(style);

    this.root.id = 'control-panel';
    this.root.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      background: #161b22;
      border-right: 1px solid rgba(139, 148, 158, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 50;
    `;
  }

  private buildContent(): void {
    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    `;

    const header = this.buildHeader();
    const simplifySection = this.buildSimplifySection();
    const historySection = this.buildHistorySection();

    scrollWrapper.appendChild(header);
    scrollWrapper.appendChild(simplifySection);
    scrollWrapper.appendChild(historySection);

    this.root.appendChild(scrollWrapper);
  }

  private buildHeader(): HTMLDivElement {
    const wrapper = document.createElement('div');

    const title = document.createElement('h1');
    title.textContent = '拓扑优化器';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: #e6edf3;
      margin: 0;
      letter-spacing: 0.3px;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = '多边形网格简化可视化教学工具';
    subtitle.style.cssText = `
      font-size: 11px;
      color: #8b949e;
      margin-top: 4px;
      line-height: 1.5;
    `;

    wrapper.appendChild(title);
    wrapper.appendChild(subtitle);
    return wrapper;
  }

  private sectionTitle(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      font-size: 10.5px;
      font-weight: 600;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      margin-bottom: 10px;
    `;
    return el;
  }

  private buildSimplifySection(): HTMLDivElement {
    const section = document.createElement('div');

    section.appendChild(this.sectionTitle('简化参数'));

    const percentWrapper = document.createElement('div');
    percentWrapper.style.cssText = `
      background: #21262d;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
    `;

    const percentLabel = document.createElement('div');
    percentLabel.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
    `;
    const labelText = document.createElement('span');
    labelText.textContent = '目标面数比例';
    labelText.style.color = '#c9d1d9';
    this.percentDisplay = document.createElement('span');
    this.percentDisplay.textContent = '25%';
    this.percentDisplay.style.cssText = `
      color: #58a6ff;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    `;
    percentLabel.appendChild(labelText);
    percentLabel.appendChild(this.percentDisplay);

    this.percentSlider = document.createElement('input');
    this.percentSlider.type = 'range';
    this.percentSlider.min = '1';
    this.percentSlider.max = '50';
    this.percentSlider.value = '25';
    this.percentSlider.style.width = '100%';
    this.percentSlider.addEventListener('input', () => {
      if (this.percentDisplay && this.percentSlider) {
        this.percentDisplay.textContent = `${this.percentSlider.value}%`;
      }
    });

    percentWrapper.appendChild(percentLabel);
    percentWrapper.appendChild(this.percentSlider);
    section.appendChild(percentWrapper);

    section.appendChild(this.sectionTitle('算法选择'));

    const algGrid = document.createElement('div');
    algGrid.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    `;

    const algorithms: Array<{ key: AlgorithmType; name: string; color: string; desc: string }> = [
      { key: 'edge-collapse', name: '边坍缩法', color: '#58a6ff', desc: '逐边移除，保形性最佳' },
      { key: 'vertex-clustering', name: '顶点聚类法', color: '#a371f7', desc: '速度最快，拓扑变化大' },
      { key: 'quadric-collapse', name: '四边折叠法', color: '#3fb950', desc: '二次误差，精度平衡' },
    ];

    for (const alg of algorithms) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        padding: 10px 12px;
        background: #21262d;
        border: 1px solid rgba(139, 148, 158, 0.15);
        border-left: 3px solid ${alg.color};
        border-radius: 6px;
        color: #e6edf3;
        cursor: pointer;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 2px;
      `;

      const btnName = document.createElement('div');
      btnName.textContent = alg.name;
      btnName.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: ${alg.color};
      `;
      const btnDesc = document.createElement('div');
      btnDesc.textContent = alg.desc;
      btnDesc.style.cssText = `
        font-size: 10.5px;
        color: #8b949e;
      `;
      btn.appendChild(btnName);
      btn.appendChild(btnDesc);

      btn.addEventListener('click', () => this.onAlgorithmClick(alg.key));
      algGrid.appendChild(btn);
    }
    section.appendChild(algGrid);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    this.diffBtn = document.createElement('button');
    this.diffBtn.textContent = '差异高亮';
    this.diffBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: #21262d;
      color: #f0883e;
      border: 1px solid rgba(240, 136, 62, 0.35);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    `;
    this.diffBtn.addEventListener('click', () => {
      this.emit({ type: 'TOGGLE_DIFF' });
    });
    btnRow.appendChild(this.diffBtn);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置模型';
    resetBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: #21262d;
      color: #f85149;
      border: 1px solid rgba(248, 81, 73, 0.35);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    `;
    resetBtn.addEventListener('click', () => {
      this.emit({ type: 'RESET' });
    });
    btnRow.appendChild(resetBtn);

    section.appendChild(btnRow);
    return section;
  }

  private buildHistorySection(): HTMLDivElement {
    const section = document.createElement('div');

    const titleRow = document.createElement('div');
    titleRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    `;
    titleRow.appendChild(this.sectionTitle('历史记录'));

    this.clearHistoryBtn = document.createElement('button');
    this.clearHistoryBtn.textContent = '清空';
    this.clearHistoryBtn.style.cssText = `
      font-size: 11px;
      padding: 3px 8px;
      background: transparent;
      color: #8b949e;
      border: 1px solid rgba(139, 148, 158, 0.2);
      border-radius: 4px;
      cursor: pointer;
    `;
    this.clearHistoryBtn.addEventListener('click', () => {
      this.emit({ type: 'RESET' });
    });
    titleRow.appendChild(this.clearHistoryBtn);
    section.appendChild(titleRow);

    this.historyListEl = document.createElement('div');
    this.historyListEl.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const emptyHint = document.createElement('div');
    emptyHint.id = 'history-empty';
    emptyHint.textContent = '暂无简化历史记录';
    emptyHint.style.cssText = `
      font-size: 11px;
      color: #6e7681;
      text-align: center;
      padding: 24px 12px;
      background: rgba(139, 148, 158, 0.05);
      border-radius: 6px;
      border: 1px dashed rgba(139, 148, 158, 0.15);
    `;
    this.historyListEl.appendChild(emptyHint);

    section.appendChild(this.historyListEl);
    return section;
  }

  private onAlgorithmClick(algorithm: AlgorithmType): void {
    if (!this.percentSlider) return;
    const percent = parseFloat(this.percentSlider.value);
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.emit({ type: 'SIMPLIFY', algorithm, percent, requestId });
  }

  public addHistory(state: HistoryState): void {
    this.history.unshift(state);
    this.activeHistoryId = state.id;
    this.renderHistory();
  }

  public resetHistory(): void {
    this.history = [];
    this.activeHistoryId = null;
    this.renderHistory();
  }

  public setActiveHistory(id: string | null): void {
    this.activeHistoryId = id;
    this.renderHistory();
  }

  public getHistory(): HistoryState[] {
    return [...this.history];
  }

  public getHistoryById(id: string): HistoryState | null {
    return this.history.find(h => h.id === id) ?? null;
  }

  public getLatestHistory(): HistoryState | null {
    return this.history[0] ?? null;
  }

  private renderHistory(): void {
    if (!this.historyListEl) return;
    this.historyListEl.innerHTML = '';

    if (this.history.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.textContent = '暂无简化历史记录';
      emptyHint.style.cssText = `
        font-size: 11px;
        color: #6e7681;
        text-align: center;
        padding: 24px 12px;
        background: rgba(139, 148, 158, 0.05);
        border-radius: 6px;
        border: 1px dashed rgba(139, 148, 158, 0.15);
      `;
      this.historyListEl.appendChild(emptyHint);
      return;
    }

    const colorByAlg: Record<string, string> = {
      'edge-collapse': '#58a6ff',
      'vertex-clustering': '#a371f7',
      'quadric-collapse': '#3fb950',
    };

    const nameByAlg: Record<string, string> = {
      'edge-collapse': '边坍缩',
      'vertex-clustering': '顶点聚类',
      'quadric-collapse': '四边折叠',
    };

    const timelineLine = document.createElement('div');
    timelineLine.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    for (let i = 0; i < this.history.length; i++) {
      const h = this.history[i];
      const isActive = h.id === this.activeHistoryId;

      const item = document.createElement('div');
      item.className = `history-item${isActive ? ' active' : ''}`;
      item.style.cssText = `
        display: flex;
        gap: 10px;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid rgba(139, 148, 158, 0.12);
        background: rgba(255, 255, 255, 0.01);
        cursor: pointer;
        position: relative;
      `;

      const dotWrapper = document.createElement('div');
      dotWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 3px;
      `;
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${colorByAlg[h.algorithm] ?? '#8b949e'};
        box-shadow: 0 0 0 3px ${colorByAlg[h.algorithm] ?? '#8b949e'}22;
        flex-shrink: 0;
      `;
      dotWrapper.appendChild(dot);

      const content = document.createElement('div');
      content.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      `;

      const topRow = document.createElement('div');
      topRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
      `;

      const algTag = document.createElement('span');
      algTag.textContent = nameByAlg[h.algorithm] ?? h.algorithm;
      algTag.style.cssText = `
        display: inline-block;
        padding: 2px 7px;
        border-radius: 10px;
        background: ${colorByAlg[h.algorithm] ?? '#8b949e'}18;
        color: ${colorByAlg[h.algorithm] ?? '#8b949e'};
        font-size: 10.5px;
        font-weight: 600;
      `;

      const percentTag = document.createElement('span');
      percentTag.textContent = `${h.percent}%`;
      percentTag.style.cssText = `
        font-size: 10.5px;
        color: #8b949e;
        font-variant-numeric: tabular-nums;
      `;
      topRow.appendChild(algTag);
      topRow.appendChild(percentTag);

      const midRow = document.createElement('div');
      midRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11.5px;
        color: #c9d1d9;
        font-family: -apple-system, 'SF Mono', 'Consolas', monospace;
        font-variant-numeric: tabular-nums;
      `;
      const fromEl = document.createElement('span');
      fromEl.textContent = h.prevFaceCount.toLocaleString();
      const arrowEl = document.createElement('span');
      arrowEl.textContent = '→';
      arrowEl.style.cssText = `color: #58a6ff; margin: 0 2px;`;
      const toEl = document.createElement('span');
      toEl.textContent = h.faceCount.toLocaleString();
      toEl.style.color = '#3fb950';
      midRow.appendChild(fromEl);
      midRow.appendChild(arrowEl);
      midRow.appendChild(toEl);

      const bottomRow = document.createElement('div');
      bottomRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: 10.5px;
        color: #6e7681;
      `;
      const timeEl = document.createElement('span');
      const time = new Date(h.timestamp);
      timeEl.textContent = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
      const msEl = document.createElement('span');
      msEl.textContent = `${h.elapsedMs.toFixed(0)}ms`;
      msEl.style.color = '#f0883e';
      bottomRow.appendChild(timeEl);
      bottomRow.appendChild(msEl);

      content.appendChild(topRow);
      content.appendChild(midRow);
      content.appendChild(bottomRow);

      item.appendChild(dotWrapper);
      item.appendChild(content);

      item.addEventListener('click', () => {
        this.emit({ type: 'APPLY_HISTORY', historyId: h.id });
      });

      timelineLine.appendChild(item);
    }

    this.historyListEl.appendChild(timelineLine);
  }

  public showLoading(text: string, estimatedMs?: number): void {
    if (this.loadingOverlay) return;

    const container = document.getElementById('canvas-container');
    if (!container) return;

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    this.loadingOverlay.appendChild(spinner);

    this.loadingText = document.createElement('div');
    this.loadingText.className = 'loading-text';
    this.loadingText.textContent = text;
    this.loadingOverlay.appendChild(this.loadingText);

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    this.progressFill = document.createElement('div');
    this.progressFill.className = 'progress-fill';
    progressBar.appendChild(this.progressFill);
    this.loadingOverlay.appendChild(progressBar);

    this.progressEstimate = document.createElement('div');
    this.progressEstimate.className = 'progress-estimate';
    if (estimatedMs) {
      this.progressEstimate.textContent = `预计耗时 ${estimatedMs.toFixed(0)} 毫秒`;
    }
    this.loadingOverlay.appendChild(this.progressEstimate);

    container.appendChild(this.loadingOverlay);
  }

  public hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.remove();
      this.loadingOverlay = null;
      this.progressFill = null;
      this.progressEstimate = null;
      this.loadingText = null;
    }
  }

  public setProgress(progress: number): void {
    if (this.progressFill) {
      this.progressFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    }
  }

  public setLoadingText(text: string): void {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
  }

  public setEstimate(ms: number): void {
    if (this.progressEstimate) {
      this.progressEstimate.textContent = `预计耗时 ${ms.toFixed(0)} 毫秒`;
    }
  }

  public setDiffButtonState(active: boolean): void {
    if (!this.diffBtn) return;
    if (active) {
      this.diffBtn.style.background = 'rgba(240, 136, 62, 0.15)';
      this.diffBtn.style.borderColor = '#f0883e';
      this.diffBtn.style.color = '#f0883e';
    } else {
      this.diffBtn.style.background = '#21262d';
      this.diffBtn.style.borderColor = 'rgba(240, 136, 62, 0.35)';
      this.diffBtn.style.color = '#f0883e';
    }
  }

  private emit(e: PanelEvent): void {
    for (const listener of this.eventListeners) {
      listener(e);
    }
  }

  public addEventListener(listener: (e: PanelEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  public dispose(): void {
    this.hideLoading();
    this.root.remove();
    this.eventListeners = [];
  }
}
