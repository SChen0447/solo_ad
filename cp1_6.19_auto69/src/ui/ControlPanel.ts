import { eventBus, NodeData, ConstellationData } from '../core/EventBus';

export class ControlPanel {
  private infoPanel: HTMLDivElement;
  private nodeCountSpan: HTMLSpanElement;
  private connectionCountSpan: HTMLSpanElement;
  private saveBtn: HTMLButtonElement;

  private controlPanel: HTMLDivElement;
  private panelHeader: HTMLDivElement;
  private panelContent: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private isPanelCollapsed: boolean = false;
  private isMobile: boolean = false;

  private playBtn: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedLabel: HTMLSpanElement;
  private nodeListContainer: HTMLDivElement;

  private savedTooltip: HTMLDivElement;
  private currentNodes: NodeData[] = [];

  constructor() {
    this.infoPanel = this.createInfoPanel();
    this.nodeCountSpan = this.infoPanel.querySelector('#node-count')!;
    this.connectionCountSpan = this.infoPanel.querySelector('#connection-count')!;
    this.saveBtn = this.infoPanel.querySelector('#save-btn')!;

    const panelResult = this.createControlPanel();
    this.controlPanel = panelResult.panel;
    this.panelHeader = panelResult.header;
    this.panelContent = panelResult.content;
    this.toggleBtn = panelResult.toggleBtn;
    this.playBtn = panelResult.playBtn;
    this.speedSlider = panelResult.speedSlider;
    this.speedLabel = panelResult.speedLabel;
    this.nodeListContainer = panelResult.nodeListContainer;

    this.savedTooltip = this.createSavedTooltip();

    this.bindEvents();
    this.checkViewport();
    window.addEventListener('resize', () => this.checkViewport());
    this.updateStats();
  }

  private createInfoPanel(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: #1b2042;
      border: 1px solid #2a2f5a;
      border-radius: 12px;
      padding: 16px 20px;
      color: #e0e6ff;
      min-width: 200px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      z-index: 100;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    div.innerHTML = `
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #48dbfb; letter-spacing: 0.5px;">
        ✦ 星座信息
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
        <span style="opacity: 0.8;">节点总数</span>
        <span id="node-count" style="font-weight: 600; color: #f0e68c;">0</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 13px;">
        <span style="opacity: 0.8;">连接线总数</span>
        <span id="connection-count" style="font-weight: 600; color: #ff9ff3;">0</span>
      </div>
      <button id="save-btn" style="
        width: 100%;
        background: #2a2f5a;
        color: #e0e6ff;
        border: 1px solid #3a3f6a;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      ">💾 保存星座</button>
    `;

    document.body.appendChild(div);

    const saveBtn = div.querySelector('#save-btn') as HTMLButtonElement;
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.transform = 'translateY(-2px)';
      saveBtn.style.background = '#3a3f7a';
      saveBtn.style.boxShadow = '0 4px 12px rgba(72, 219, 251, 0.2)';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.transform = 'translateY(0)';
      saveBtn.style.background = '#2a2f5a';
      saveBtn.style.boxShadow = 'none';
    });

    return div;
  }

  private createControlPanel(): {
    panel: HTMLDivElement;
    header: HTMLDivElement;
    content: HTMLDivElement;
    toggleBtn: HTMLButtonElement;
    playBtn: HTMLButtonElement;
    speedSlider: HTMLInputElement;
    speedLabel: HTMLSpanElement;
    nodeListContainer: HTMLDivElement;
  } {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 280px;
      max-height: calc(100vh - 40px);
      background: #1b2042;
      border: 1px solid #2a2f5a;
      border-radius: 12px;
      color: #e0e6ff;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      z-index: 100;
      overflow: hidden;
      transition: all 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2a2f5a;
      cursor: pointer;
      user-select: none;
    `;
    header.innerHTML = `
      <div style="font-size: 14px; font-weight: 600; color: #48dbfb; letter-spacing: 0.5px;">
        🎛️ 控制面板
      </div>
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '▼';
    toggleBtn.style.cssText = `
      background: #2a2f5a;
      color: #e0e6ff;
      border: none;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    header.appendChild(toggleBtn);
    panel.appendChild(header);

    const content = document.createElement('div');
    content.style.cssText = `
      padding: 18px;
      overflow-y: auto;
      flex: 1;
      transition: all 0.3s ease;
    `;

    const playSection = document.createElement('div');
    playSection.style.cssText = `margin-bottom: 20px;`;
    playSection.innerHTML = `
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">动画控制</div>
    `;

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ 播放动画';
    playBtn.style.cssText = `
      width: 100%;
      background: linear-gradient(135deg, #48dbfb 0%, #54a0ff 100%);
      color: #0a0e27;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 14px;
      font-family: inherit;
    `;
    playBtn.addEventListener('mouseenter', () => {
      playBtn.style.transform = 'translateY(-2px)';
      playBtn.style.boxShadow = '0 6px 16px rgba(72, 219, 251, 0.4)';
    });
    playBtn.addEventListener('mouseleave', () => {
      playBtn.style.transform = 'translateY(0)';
      playBtn.style.boxShadow = 'none';
    });
    playSection.appendChild(playBtn);

    const speedContainer = document.createElement('div');
    speedContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    const speedHeader = document.createElement('div');
    speedHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      opacity: 0.8;
    `;
    speedHeader.innerHTML = `<span>速度</span><span id="speed-label" style="color: #48dbfb; font-weight: 600;">1.0x</span>`;
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0.5';
    speedSlider.max = '3';
    speedSlider.step = '0.1';
    speedSlider.value = '1';
    speedSlider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #2a2f5a;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #48dbfb;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px #48dbfb, 0 0 20px rgba(72, 219, 251, 0.5);
        transition: all 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 0 14px #48dbfb, 0 0 28px rgba(72, 219, 251, 0.6);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #48dbfb;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px #48dbfb;
      }
      #node-list::-webkit-scrollbar, .panel-content::-webkit-scrollbar {
        width: 6px;
      }
      #node-list::-webkit-scrollbar-track, .panel-content::-webkit-scrollbar-track {
        background: #161b33;
        border-radius: 3px;
      }
      #node-list::-webkit-scrollbar-thumb, .panel-content::-webkit-scrollbar-thumb {
        background: #2a2f5a;
        border-radius: 3px;
      }
      #node-list::-webkit-scrollbar-thumb:hover, .panel-content::-webkit-scrollbar-thumb:hover {
        background: #3a3f7a;
      }
    `;
    document.head.appendChild(sliderStyle);

    const speedLabel = speedHeader.querySelector('#speed-label') as HTMLSpanElement;
    speedContainer.appendChild(speedHeader);
    speedContainer.appendChild(speedSlider);
    playSection.appendChild(speedContainer);
    content.appendChild(playSection);

    const nodeSection = document.createElement('div');
    nodeSection.innerHTML = `
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">节点列表</div>
    `;
    const nodeListContainer = document.createElement('div');
    nodeListContainer.id = 'node-list';
    nodeListContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 320px;
      overflow-y: auto;
    `;
    nodeSection.appendChild(nodeListContainer);
    content.appendChild(nodeSection);

    panel.appendChild(content);
    document.body.appendChild(panel);

    return {
      panel,
      header,
      content,
      toggleBtn,
      playBtn,
      speedSlider,
      speedLabel,
      nodeListContainer
    };
  }

  private createSavedTooltip(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: #1b2042;
      border: 1px solid #48dbfb;
      border-radius: 12px;
      padding: 16px 28px;
      color: #48dbfb;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 0 30px rgba(72, 219, 251, 0.3);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    div.textContent = '✓ 已复制到剪贴板';
    document.body.appendChild(div);
    return div;
  }

  private bindEvents(): void {
    this.saveBtn.addEventListener('click', () => this.handleSave());

    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });
    this.panelHeader.addEventListener('click', () => this.togglePanel());

    this.playBtn.addEventListener('click', () => {
      eventBus.emit('ui:play-toggle');
    });

    this.speedSlider.addEventListener('input', () => {
      const v = parseFloat(this.speedSlider.value);
      this.speedLabel.textContent = `${v.toFixed(1)}x`;
      eventBus.emit('ui:speed-change', { speed: v });
    });

    eventBus.on('stats:update', (data) => {
      const { nodeCount, connectionCount } = data as {
        nodeCount: number;
        connectionCount: number;
      };
      this.nodeCountSpan.textContent = nodeCount.toString();
      this.connectionCountSpan.textContent = connectionCount.toString();
    });

    eventBus.on('anim:state-changed', (data) => {
      const { isPlaying } = data as { isPlaying: boolean };
      if (isPlaying) {
        this.playBtn.textContent = '⏸ 暂停动画';
        this.playBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)';
      } else {
        this.playBtn.textContent = '▶ 播放动画';
        this.playBtn.style.background = 'linear-gradient(135deg, #48dbfb 0%, #54a0ff 100%)';
      }
    });

    eventBus.on('nodelist:update', (data) => {
      this.currentNodes = data as NodeData[];
      this.renderNodeList();
    });
  }

  private togglePanel(): void {
    this.isPanelCollapsed = !this.isPanelCollapsed;
    if (this.isPanelCollapsed) {
      this.panelContent.style.maxHeight = '0';
      this.panelContent.style.padding = '0 18px';
      this.panelContent.style.opacity = '0';
      this.toggleBtn.innerHTML = '▲';
      if (!this.isMobile) {
        this.controlPanel.style.width = '200px';
      }
    } else {
      this.panelContent.style.maxHeight = 'calc(100vh - 80px)';
      this.panelContent.style.padding = '18px';
      this.panelContent.style.opacity = '1';
      this.toggleBtn.innerHTML = '▼';
      if (!this.isMobile) {
        this.controlPanel.style.width = '280px';
      }
    }
  }

  private checkViewport(): void {
    const mobile = window.innerWidth < 768;
    if (mobile !== this.isMobile) {
      this.isMobile = mobile;
      if (mobile) {
        this.controlPanel.style.top = 'auto';
        this.controlPanel.style.bottom = '0';
        this.controlPanel.style.right = '0';
        this.controlPanel.style.left = '0';
        this.controlPanel.style.width = '100%';
        this.controlPanel.style.borderRadius = '16px 16px 0 0';
        this.controlPanel.style.maxHeight = '60vh';
        this.infoPanel.style.top = '12px';
        this.infoPanel.style.left = '12px';
        this.infoPanel.style.minWidth = '160px';
        this.infoPanel.style.padding = '12px 14px';
        if (this.isPanelCollapsed) {
          this.panelContent.style.maxHeight = '0';
          this.panelContent.style.padding = '0 18px';
        }
      } else {
        this.controlPanel.style.top = '20px';
        this.controlPanel.style.bottom = 'auto';
        this.controlPanel.style.right = '20px';
        this.controlPanel.style.left = 'auto';
        this.controlPanel.style.width = this.isPanelCollapsed ? '200px' : '280px';
        this.controlPanel.style.borderRadius = '12px';
        this.controlPanel.style.maxHeight = 'calc(100vh - 40px)';
        this.infoPanel.style.top = '20px';
        this.infoPanel.style.left = '20px';
        this.infoPanel.style.minWidth = '200px';
        this.infoPanel.style.padding = '16px 20px';
      }
    }
  }

  public updateStats(): void {
    eventBus.emit('ui:request-stats');
    eventBus.emit('ui:request-nodelist');
  }

  private renderNodeList(): void {
    this.nodeListContainer.innerHTML = '';
    if (this.currentNodes.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        font-size: 12px;
        opacity: 0.5;
        text-align: center;
        padding: 20px 0;
      `;
      empty.textContent = '暂无节点，点击星空创建';
      this.nodeListContainer.appendChild(empty);
      return;
    }

    this.currentNodes.forEach((node, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        background: #161b33;
        border: 1px solid #2a2f5a;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.2s ease;
      `;
      item.addEventListener('mouseenter', () => {
        item.style.background = '#1e2450';
        item.style.borderColor = '#3a3f7a';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = '#161b33';
        item.style.borderColor = '#2a2f5a';
      });

      const colorDot = document.createElement('div');
      colorDot.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${node.color};
        box-shadow: 0 0 8px ${node.color};
        flex-shrink: 0;
      `;
      item.appendChild(colorDot);

      const info = document.createElement('div');
      info.style.cssText = `
        flex: 1;
        min-width: 0;
      `;
      info.innerHTML = `
        <div style="font-size: 12px; font-weight: 600; color: #e0e6ff;">节点 ${index + 1}</div>
        <div style="font-size: 10px; opacity: 0.6; margin-top: 2px; font-family: monospace;">
          x: ${node.position.x.toFixed(2)}, y: ${node.position.y.toFixed(2)}, z: ${node.position.z.toFixed(2)}
        </div>
      `;
      item.appendChild(info);

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '✕';
      delBtn.style.cssText = `
        background: #2a2f5a;
        color: #ff6b6b;
        border: none;
        border-radius: 6px;
        width: 26px;
        height: 26px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
      `;
      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background = '#ff6b6b';
        delBtn.style.color = '#fff';
        delBtn.style.transform = 'scale(1.1)';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background = '#2a2f5a';
        delBtn.style.color = '#ff6b6b';
        delBtn.style.transform = 'scale(1)';
      });
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        eventBus.emit('ui:delete-node', { id: node.id });
      });
      item.appendChild(delBtn);

      this.nodeListContainer.appendChild(item);
    });
  }

  private async handleSave(): Promise<void> {
    eventBus.emit('ui:request-constellation');

    const handler = (data: unknown) => {
      const constellation = data as ConstellationData;
      const jsonStr = JSON.stringify(constellation, null, 2);
      try {
        navigator.clipboard.writeText(jsonStr);
        this.showSavedTooltip();
      } catch (e) {
        console.error('Failed to copy:', e);
      }
      eventBus.off('constellation:data', handler);
    };
    eventBus.on('constellation:data', handler);
  }

  private showSavedTooltip(): void {
    this.savedTooltip.style.opacity = '1';
    this.savedTooltip.style.transform = 'translate(-50%, -50%) scale(1)';
    setTimeout(() => {
      this.savedTooltip.style.opacity = '0';
      this.savedTooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }, 1500);
  }
}
