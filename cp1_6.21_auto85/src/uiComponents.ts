import type { Exhibit, Zone, TourStats, TourRoute } from './types';
import { dataManager } from './dataManager';

const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Georgia, 'Times New Roman', serif;
  }

  :host {
    display: block;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  button:hover {
    transform: translateY(-2px);
  }

  button:active {
    transform: translateY(0);
  }
`;

class MuseumSidebar extends HTMLElement {
  private shadow: ShadowRoot;
  private isCollapsed: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
    this.shadow.querySelector('.collapse-btn')?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      this.render();
      this.dispatchEvent(new CustomEvent('toggle', { detail: { collapsed: this.isCollapsed } }));
    });
  }

  render(): void {
    const width = this.isCollapsed ? '60px' : '350px';
    
    this.shadow.innerHTML = `
      <style>
        ${styles}
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: ${width};
          background: #f5f0e8;
          border-right: 2px solid #d4af37;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .sidebar-header {
          padding: 20px;
          background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
          color: #d4af37;
          border-bottom: 2px solid #d4af37;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-title {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 1px;
          white-space: nowrap;
          overflow: hidden;
        }

        .collapse-btn {
          width: 30px;
          height: 30px;
          background: rgba(212, 175, 55, 0.2);
          border: 1px solid #d4af37;
          color: #d4af37;
          border-radius: 4px;
          font-size: 16px;
          flex-shrink: 0;
        }

        .sidebar-content {
          height: calc(100vh - 80px);
          overflow-y: auto;
          padding: ${this.isCollapsed ? '10px 5px' : '15px'};
        }

        .sidebar-content::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: #e8e0d5;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: #d4af37;
          border-radius: 3px;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 14px;
          color: #2a2a2a;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #d4af37;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .icon-only {
          display: ${this.isCollapsed ? 'flex' : 'none'};
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          background: #fff;
          border: 1px solid #d4af37;
          border-radius: 8px;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2a2a2a;
        }

        .icon-btn:hover {
          background: #d4af37;
          color: #fff;
        }

        .content-full {
          display: ${this.isCollapsed ? 'none' : 'block'};
        }
      </style>
      <div class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">${this.isCollapsed ? '' : '博物馆导览'}</span>
          <button class="collapse-btn">${this.isCollapsed ? '→' : '←'}</button>
        </div>
        <div class="sidebar-content">
          <div class="icon-only">
            <button class="icon-btn" title="展品列表">🖼️</button>
            <button class="icon-btn" title="路线">🛤️</button>
            <button class="icon-btn" title="统计">📊</button>
          </div>
          <div class="content-full">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

class ExhibitList extends HTMLElement {
  private shadow: ShadowRoot;
  private exhibits: Exhibit[] = [];
  private expandedZones: Set<string> = new Set();

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.loadExhibits();
    dataManager.subscribe(() => this.loadExhibits());
  }

  private loadExhibits(): void {
    this.exhibits = dataManager.getExhibits();
    const zones = dataManager.getZones();
    zones.forEach(z => this.expandedZones.add(z.id));
    this.render();
  }

  private toggleZone(zoneId: string): void {
    if (this.expandedZones.has(zoneId)) {
      this.expandedZones.delete(zoneId);
    } else {
      this.expandedZones.add(zoneId);
    }
    this.render();
  }

  private selectExhibit(exhibitId: string): void {
    this.dispatchEvent(new CustomEvent('select', { detail: { exhibitId } }));
  }

  render(): void {
    const zones = dataManager.getZones();

    const zoneHtml = zones.map(zone => {
      const zoneExhibits = this.exhibits.filter(e => e.zoneId === zone.id);
      const isExpanded = this.expandedZones.has(zone.id);

      return `
        <div class="zone-group">
          <div class="zone-header" data-zone="${zone.id}">
            <span class="zone-color" style="background: ${zone.accentColor}"></span>
            <span class="zone-name">${zone.name}</span>
            <span class="zone-count">${zoneExhibits.length}</span>
            <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
          </div>
          <div class="zone-exhibits" style="display: ${isExpanded ? 'block' : 'none'}">
            ${zoneExhibits.map(exhibit => `
              <div class="exhibit-item" data-id="${exhibit.id}">
                <div class="exhibit-dot" style="background: ${exhibit.color}"></div>
                <div class="exhibit-info">
                  <div class="exhibit-name">${exhibit.name}</div>
                  <div class="exhibit-era">${exhibit.era}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    this.shadow.innerHTML = `
      <style>
        ${styles}
        .exhibit-list {
          background: #fff;
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .list-title {
          font-size: 16px;
          color: #2a2a2a;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #d4af37;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zone-group {
          margin-bottom: 8px;
        }

        .zone-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: #f9f6f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .zone-header:hover {
          background: #f0ebe0;
        }

        .zone-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .zone-name {
          flex: 1;
          font-size: 13px;
          color: #2a2a2a;
          font-weight: bold;
        }

        .zone-count {
          font-size: 12px;
          color: #888;
          background: #e8e0d5;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .expand-icon {
          font-size: 10px;
          color: #d4af37;
        }

        .zone-exhibits {
          margin-top: 4px;
          padding-left: 10px;
        }

        .exhibit-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .exhibit-item:hover {
          background: #f5f0e8;
          border-left-color: #d4af37;
        }

        .exhibit-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 6px currentColor;
        }

        .exhibit-info {
          flex: 1;
          min-width: 0;
        }

        .exhibit-name {
          font-size: 13px;
          color: #2a2a2a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .exhibit-era {
          font-size: 11px;
          color: #999;
          margin-top: 2px;
        }
      </style>
      <div class="exhibit-list">
        <div class="list-title">🖼️ 展品列表</div>
        ${zoneHtml}
      </div>
    `;

    this.shadow.querySelectorAll('.zone-header').forEach(el => {
      el.addEventListener('click', () => {
        const zoneId = el.getAttribute('data-zone');
        if (zoneId) this.toggleZone(zoneId);
      });
    });

    this.shadow.querySelectorAll('.exhibit-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) this.selectExhibit(id);
      });
    });
  }
}

class StatsPanel extends HTMLElement {
  private shadow: ShadowRoot;
  private stats: TourStats | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  setStats(stats: TourStats): void {
    this.stats = stats;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs}秒`;
  }

  render(): void {
    const stats = this.stats || {
      totalDistance: 0,
      walkingTime: 0,
      exhibitStayTime: 0,
      totalTime: 0,
      exhibitCount: 0
    };

    this.shadow.innerHTML = `
      <style>
        ${styles}
        .stats-panel {
          background: #fff;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .panel-title {
          font-size: 16px;
          color: #2a2a2a;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #d4af37;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .stat-card {
          background: linear-gradient(135deg, #f9f6f0 0%, #f5f0e8 100%);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          border: 1px solid #e8e0d5;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
          border-color: #d4af37;
        }

        .stat-value {
          font-size: 22px;
          font-weight: bold;
          color: #d4af37;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-card.full-width {
          grid-column: span 2;
          background: linear-gradient(135deg, #d4af37 0%, #b8960f 100%);
        }

        .stat-card.full-width .stat-value,
        .stat-card.full-width .stat-label {
          color: #fff;
        }
      </style>
      <div class="stats-panel">
        <div class="panel-title">📊 路线统计</div>
        <div class="stats-grid">
          <div class="stat-card full-width">
            <div class="stat-value">${this.formatTime(stats.totalTime)}</div>
            <div class="stat-label">总时长</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalDistance}m</div>
            <div class="stat-label">路径长度</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this.formatTime(stats.walkingTime)}</div>
            <div class="stat-label">步行时间</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.exhibitCount}个</div>
            <div class="stat-label">展品数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.exhibitStayTime}s</div>
            <div class="stat-label">停留时长</div>
          </div>
        </div>
      </div>
    `;
  }
}

class AudioWaveform extends HTMLElement {
  private shadow: ShadowRoot;
  private isPlaying: boolean = false;
  private barCount: number = 32;
  private bars: number[] = [];
  private animationId: number = 0;
  private text: string = '';
  private scrollProgress: number = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    for (let i = 0; i < this.barCount; i++) {
      this.bars.push(30 + Math.random() * 70);
    }
  }

  setText(text: string): void {
    this.text = text;
    this.render();
  }

  setProgress(progress: number): void {
    this.scrollProgress = progress;
    this.updateTextHighlight();
  }

  play(): void {
    this.isPlaying = true;
    this.animateWaveform();
  }

  stop(): void {
    this.isPlaying = false;
    cancelAnimationFrame(this.animationId);
  }

  private animateWaveform(): void {
    if (!this.isPlaying) return;

    this.bars = this.bars.map(() => 30 + Math.random() * 70);
    this.updateBars();
    this.animationId = requestAnimationFrame(() => {
      setTimeout(() => this.animateWaveform(), 100);
    });
  }

  private updateBars(): void {
    const barElements = this.shadow.querySelectorAll('.bar');
    barElements.forEach((bar, i) => {
      (bar as HTMLElement).style.height = `${this.bars[i]}%`;
    });
  }

  private updateTextHighlight(): void {
    const highlightEl = this.shadow.querySelector('.text-highlight');
    if (highlightEl) {
      (highlightEl as HTMLElement).style.width = `${this.scrollProgress * 100}%`;
    }
  }

  connectedCallback(): void {
    this.render();
  }

  disconnectedCallback(): void {
    this.stop();
  }

  render(): void {
    const barsHtml = this.bars.map((h, i) => 
      `<div class="bar" style="height: ${h}%; animation-delay: ${i * 0.03}s"></div>`
    ).join('');

    this.shadow.innerHTML = `
      <style>
        ${styles}
        .waveform-container {
          background: linear-gradient(180deg, rgba(10, 20, 50, 0.9) 0%, rgba(20, 40, 80, 0.9) 100%);
          border-radius: 12px;
          padding: 15px;
          border: 1px solid rgba(100, 150, 255, 0.3);
        }

        .waveform-title {
          color: #fff;
          font-size: 14px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .waveform-bars {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 3px;
          height: 60px;
          margin-bottom: 15px;
        }

        .bar {
          width: 6px;
          background: linear-gradient(180deg, #00d4ff 0%, #0088ff 50%, #0055aa 100%);
          border-radius: 3px;
          transition: height 0.1s ease;
          min-height: 4px;
          box-shadow: 0 0 8px rgba(0, 150, 255, 0.5);
        }

        .text-container {
          position: relative;
          max-height: 80px;
          overflow-y: auto;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .text-content {
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          line-height: 1.6;
          position: relative;
        }

        .text-highlight {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, 
            rgba(0, 212, 255, 0.3) 0%, 
            rgba(0, 136, 255, 0.1) 80%,
            transparent 100%);
          pointer-events: none;
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .text-container::-webkit-scrollbar {
          width: 4px;
        }

        .text-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .text-container::-webkit-scrollbar-thumb {
          background: rgba(0, 150, 255, 0.5);
          border-radius: 2px;
        }
      </style>
      <div class="waveform-container">
        <div class="waveform-title">🎵 语音解说</div>
        <div class="waveform-bars">
          ${barsHtml}
        </div>
        <div class="text-container">
          <div class="text-content">
            <div class="text-highlight"></div>
            ${this.text || '点击预览开始语音导览...'}
          </div>
        </div>
      </div>
    `;
  }
}

class ExhibitInfoPopup extends HTMLElement {
  private shadow: ShadowRoot;
  private exhibit: Exhibit | null = null;
  private relatedExhibits: Exhibit[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  setExhibit(exhibit: Exhibit | null): void {
    this.exhibit = exhibit;
    if (exhibit) {
      this.relatedExhibits = dataManager.getRelatedExhibits(exhibit.id);
    } else {
      this.relatedExhibits = [];
    }
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  render(): void {
    const exhibit = this.exhibit;

    if (!exhibit) {
      this.shadow.innerHTML = `
        <style>
          ${styles}
          .popup {
            display: none;
          }
        </style>
        <div class="popup"></div>
      `;
      return;
    }

    this.shadow.innerHTML = `
      <style>
        ${styles}
        .popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #f5f0e8;
          border-radius: 16px;
          padding: 24px;
          width: 380px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 2px solid #d4af37;
          z-index: 2000;
          animation: fadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #d4af37;
        }

        .exhibit-icon {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          background: ${exhibit.color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 15px ${exhibit.color}40;
        }

        .exhibit-title {
          flex: 1;
        }

        .exhibit-title h3 {
          font-size: 20px;
          color: #2a2a2a;
          margin-bottom: 4px;
        }

        .exhibit-title .era {
          font-size: 13px;
          color: #888;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e8e0d5;
          color: #666;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #d4af37;
          color: #fff;
        }

        .popup-section {
          margin-bottom: 16px;
        }

        .section-label {
          font-size: 12px;
          color: #d4af37;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .audio-text {
          font-size: 14px;
          line-height: 1.7;
          color: #444;
          background: #fff;
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #d4af37;
        }

        .related-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .related-item {
          padding: 6px 12px;
          background: #fff;
          border: 1px solid #d4af37;
          border-radius: 20px;
          font-size: 12px;
          color: #2a2a2a;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .related-item:hover {
          background: #d4af37;
          color: #fff;
        }

        .no-related {
          color: #999;
          font-size: 13px;
          font-style: italic;
        }

        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1999;
        }
      </style>
      <div class="overlay"></div>
      <div class="popup">
        <div class="popup-header">
          <div class="exhibit-icon">🖼️</div>
          <div class="exhibit-title">
            <h3>${exhibit.name}</h3>
            <span class="era">${exhibit.era}</span>
          </div>
          <button class="close-btn">✕</button>
        </div>
        
        <div class="popup-section">
          <div class="section-label">语音解说</div>
          <div class="audio-text">${exhibit.audioText}</div>
        </div>

        <div class="popup-section">
          <div class="section-label">关联展品</div>
          <div class="related-list">
            ${this.relatedExhibits.length > 0 
              ? this.relatedExhibits.map(r => 
                  `<div class="related-item" data-id="${r.id}">${r.name}</div>`
                ).join('')
              : '<span class="no-related">暂无关联展品</span>'
            }
          </div>
        </div>
      </div>
    `;

    this.shadow.querySelector('.close-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('close'));
    });

    this.shadow.querySelector('.overlay')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('close'));
    });

    this.shadow.querySelectorAll('.related-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) {
          this.dispatchEvent(new CustomEvent('select-related', { detail: { exhibitId: id } }));
        }
      });
    });
  }
}

class RouteControls extends HTMLElement {
  private shadow: ShadowRoot;
  private startZone: string = '';
  private endZone: string = '';
  private mode: 'idle' | 'edit' | 'preview' = 'idle';

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  setMode(mode: 'idle' | 'edit' | 'preview'): void {
    this.mode = mode;
    this.render();
  }

  getStartZone(): string {
    return this.startZone;
  }

  getEndZone(): string {
    return this.endZone;
  }

  connectedCallback(): void {
    const zones = dataManager.getZones();
    this.startZone = zones[0]?.id || '';
    this.endZone = zones[zones.length - 1]?.id || '';
    this.render();
    this.setupEvents();
  }

  private setupEvents(): void {
    this.shadow.querySelector('#startZone')?.addEventListener('change', (e) => {
      this.startZone = (e.target as HTMLSelectElement).value;
    });

    this.shadow.querySelector('#endZone')?.addEventListener('change', (e) => {
      this.endZone = (e.target as HTMLSelectElement).value;
    });

    this.shadow.querySelector('.btn-generate')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('generate'));
    });

    this.shadow.querySelector('.btn-edit')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('edit'));
    });

    this.shadow.querySelector('.btn-preview')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('preview'));
    });

    this.shadow.querySelector('.btn-export')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('export'));
    });
  }

  render(): void {
    const zones = dataManager.getZones();
    const zoneOptions = zones.map(z => 
      `<option value="${z.id}">${z.name}</option>`
    ).join('');

    this.shadow.innerHTML = `
      <style>
        ${styles}
        .route-controls {
          background: #fff;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .controls-title {
          font-size: 16px;
          color: #2a2a2a;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #d4af37;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zone-selectors {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 15px;
        }

        .selector-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .selector-group label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .selector-group select {
          padding: 10px 12px;
          border: 1px solid #d4af37;
          border-radius: 8px;
          background: #f9f6f0;
          font-family: inherit;
          font-size: 13px;
          color: #2a2a2a;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .selector-group select:focus {
          outline: none;
          border-color: #b8960f;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
        }

        .button-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .btn {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .btn-generate {
          background: linear-gradient(135deg, #d4af37 0%, #b8960f 100%);
          color: #fff;
          grid-column: span 2;
        }

        .btn-generate:hover {
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
        }

        .btn-edit {
          background: #f9f6f0;
          color: #2a2a2a;
          border: 1px solid #d4af37;
        }

        .btn-edit:hover {
          background: #d4af37;
          color: #fff;
        }

        .btn-preview {
          background: linear-gradient(135deg, #00aa88 0%, #008866 100%);
          color: #fff;
        }

        .btn-preview:hover {
          box-shadow: 0 4px 15px rgba(0, 170, 136, 0.4);
        }

        .btn-export {
          background: #f9f6f0;
          color: #2a2a2a;
          border: 1px solid #d4af37;
          grid-column: span 2;
        }

        .btn-export:hover {
          background: #2a2a2a;
          color: #d4af37;
          border-color: #2a2a2a;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
      </style>
      <div class="route-controls">
        <div class="controls-title">🛤️ 导览路线</div>
        
        <div class="zone-selectors">
          <div class="selector-group">
            <label>起点展区</label>
            <select id="startZone" value="${this.startZone}">
              ${zoneOptions}
            </select>
          </div>
          <div class="selector-group">
            <label>终点展区</label>
            <select id="endZone" value="${this.endZone}">
              ${zoneOptions}
            </select>
          </div>
        </div>

        <div class="button-group">
          <button class="btn btn-generate">✨ 生成路线</button>
          <button class="btn btn-edit">✏️ 编辑路径</button>
          <button class="btn btn-preview">▶️ 预览导览</button>
          <button class="btn btn-export">📥 导出JSON</button>
        </div>
      </div>
    `;

    const startSelect = this.shadow.querySelector('#startZone') as HTMLSelectElement;
    const endSelect = this.shadow.querySelector('#endZone') as HTMLSelectElement;
    if (startSelect) startSelect.value = this.startZone;
    if (endSelect) endSelect.value = this.endZone;

    this.setupEvents();
  }
}

class PreviewProgressBar extends HTMLElement {
  private shadow: ShadowRoot;
  private currentIndex: number = 0;
  private totalExhibits: number = 0;
  private exhibits: Exhibit[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  setExhibits(exhibits: Exhibit[]): void {
    this.exhibits = exhibits;
    this.totalExhibits = exhibits.length;
    this.render();
  }

  setCurrentIndex(index: number): void {
    this.currentIndex = index;
    this.updateProgress();
  }

  private updateProgress(): void {
    const progressEl = this.shadow.querySelector('.progress-fill');
    if (progressEl && this.totalExhibits > 0) {
      const progress = ((this.currentIndex + 1) / this.totalExhibits) * 100;
      (progressEl as HTMLElement).style.width = `${progress}%`;
    }

    const markers = this.shadow.querySelectorAll('.progress-marker');
    markers.forEach((marker, i) => {
      if (i <= this.currentIndex) {
        marker.classList.add('active');
      } else {
        marker.classList.remove('active');
      }
    });

    const labelEl = this.shadow.querySelector('.progress-label');
    if (labelEl && this.exhibits[this.currentIndex]) {
      labelEl.textContent = this.exhibits[this.currentIndex].name;
    }
  }

  connectedCallback(): void {
    this.render();
  }

  render(): void {
    const markersHtml = this.exhibits.map((exhibit, i) => `
      <div class="progress-marker ${i <= this.currentIndex ? 'active' : ''}" 
           style="left: ${((i + 0.5) / this.totalExhibits) * 100}%">
        <div class="marker-dot" style="background: ${exhibit.color}"></div>
        <div class="marker-label">${exhibit.name}</div>
      </div>
    `).join('');

    this.shadow.innerHTML = `
      <style>
        ${styles}
        .progress-container {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          max-width: 600px;
          background: rgba(42, 42, 42, 0.95);
          border-radius: 20px;
          padding: 15px 25px;
          border: 2px solid #d4af37;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          z-index: 1500;
        }

        .progress-label {
          color: #d4af37;
          font-size: 14px;
          margin-bottom: 10px;
          text-align: center;
        }

        .progress-bar {
          position: relative;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: visible;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e 0%, #ef4444 100%);
          border-radius: 4px;
          transition: width 0.5s ease;
          width: ${this.totalExhibits > 0 ? ((this.currentIndex + 1) / this.totalExhibits) * 100 : 0}%;
        }

        .progress-marker {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.3s ease;
        }

        .marker-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .progress-marker.active .marker-dot {
          transform: scale(1.3);
          box-shadow: 0 0 15px currentColor;
        }

        .marker-label {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #fff;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s ease;
          background: rgba(0, 0, 0, 0.8);
          padding: 3px 8px;
          border-radius: 4px;
        }

        .progress-marker:hover .marker-label {
          opacity: 1;
        }

        .close-preview-btn {
          position: absolute;
          top: 10px;
          right: 15px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-preview-btn:hover {
          background: #ef4444;
        }
      </style>
      <div class="progress-container">
        <button class="close-preview-btn">✕</button>
        <div class="progress-label">${this.exhibits[this.currentIndex]?.name || ''}</div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
          ${markersHtml}
        </div>
      </div>
    `;

    this.shadow.querySelector('.close-preview-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('close'));
    });
  }
}

class MuseumTitle extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  render(): void {
    this.shadow.innerHTML = `
      <style>
        ${styles}
        .museum-title {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
          border: 2px solid #d4af37;
          border-radius: 12px;
          padding: 12px 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          z-index: 100;
        }

        .title-text {
          font-size: 24px;
          color: #d4af37;
          font-weight: bold;
          letter-spacing: 4px;
          text-shadow: 0 2px 10px rgba(212, 175, 55, 0.5);
        }

        .title-sub {
          font-size: 11px;
          color: #888;
          text-align: center;
          margin-top: 4px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
      </style>
      <div class="museum-title">
        <div class="title-text">虚拟博物馆</div>
        <div class="title-sub">Virtual Museum</div>
      </div>
    `;
  }
}

class FpsCounter extends HTMLElement {
  private shadow: ShadowRoot;
  private fps: number = 0;
  private animationId: number = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  setFps(fps: number): void {
    this.fps = fps;
    const fpsEl = this.shadow.querySelector('.fps-value');
    if (fpsEl) {
      fpsEl.textContent = `${Math.round(fps)} FPS`;
      const fpsContainer = this.shadow.querySelector('.fps-counter');
      if (fps >= 50) {
        fpsContainer?.classList.add('good');
        fpsContainer?.classList.remove('medium', 'low');
      } else if (fps >= 30) {
        fpsContainer?.classList.add('medium');
        fpsContainer?.classList.remove('good', 'low');
      } else {
        fpsContainer?.classList.add('low');
        fpsContainer?.classList.remove('good', 'medium');
      }
    }
  }

  connectedCallback(): void {
    this.render();
  }

  render(): void {
    this.shadow.innerHTML = `
      <style>
        ${styles}
        .fps-counter {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(42, 42, 42, 0.9);
          border: 1px solid #d4af37;
          border-radius: 8px;
          padding: 8px 15px;
          z-index: 100;
          font-family: 'Courier New', monospace;
          transition: all 0.3s ease;
        }

        .fps-counter.good {
          border-color: #22c55e;
        }

        .fps-counter.good .fps-value {
          color: #22c55e;
        }

        .fps-counter.medium {
          border-color: #eab308;
        }

        .fps-counter.medium .fps-value {
          color: #eab308;
        }

        .fps-counter.low {
          border-color: #ef4444;
        }

        .fps-counter.low .fps-value {
          color: #ef4444;
        }

        .fps-label {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .fps-value {
          font-size: 18px;
          font-weight: bold;
          color: #d4af37;
          text-align: right;
        }
      </style>
      <div class="fps-counter good">
        <div class="fps-label">帧率</div>
        <div class="fps-value">-- FPS</div>
      </div>
    `;
  }
}

customElements.define('museum-sidebar', MuseumSidebar);
customElements.define('exhibit-list', ExhibitList);
customElements.define('stats-panel', StatsPanel);
customElements.define('audio-waveform', AudioWaveform);
customElements.define('exhibit-popup', ExhibitInfoPopup);
customElements.define('route-controls', RouteControls);
customElements.define('preview-progress', PreviewProgressBar);
customElements.define('museum-title', MuseumTitle);
customElements.define('fps-counter', FpsCounter);

export {
  MuseumSidebar,
  ExhibitList,
  StatsPanel,
  AudioWaveform,
  ExhibitInfoPopup,
  RouteControls,
  PreviewProgressBar,
  MuseumTitle,
  FpsCounter
};
