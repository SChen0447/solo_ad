import { emit, on, type PlanetInfo, type CompareData } from '@/utils/eventBus';

const PLANET_COLORS: Record<string, string> = {
  '水星': '#A0A0A0', '金星': '#E8C56D', '地球': '#4A90D9', '火星': '#C1440E',
  '木星': '#C88B3A', '土星': '#E8D5A3', '天王星': '#7EC8E3', '海王星': '#3D5FC4',
};

const PLANET_LIST: PlanetInfo[] = [
  { name: '水星', englishName: 'Mercury', diameter: 0.2, orbitRadius: 5, orbitPeriod: 88, axialTilt: 0.034, rotationSpeed: 0.017, orbitSpeed: 4.15, color: '#A0A0A0', hasRing: false },
  { name: '金星', englishName: 'Venus', diameter: 0.4, orbitRadius: 7, orbitPeriod: 225, axialTilt: 177.4, rotationSpeed: -0.004, orbitSpeed: 1.62, color: '#E8C56D', hasRing: false },
  { name: '地球', englishName: 'Earth', diameter: 0.4, orbitRadius: 9, orbitPeriod: 365, axialTilt: 23.4, rotationSpeed: 1.0, orbitSpeed: 1.0, color: '#4A90D9', hasRing: false },
  { name: '火星', englishName: 'Mars', diameter: 0.3, orbitRadius: 11, orbitPeriod: 687, axialTilt: 25.2, rotationSpeed: 0.97, orbitSpeed: 0.53, color: '#C1440E', hasRing: false },
  { name: '木星', englishName: 'Jupiter', diameter: 2.0, orbitRadius: 16, orbitPeriod: 4333, axialTilt: 3.1, rotationSpeed: 2.44, orbitSpeed: 0.084, color: '#C88B3A', hasRing: false },
  { name: '土星', englishName: 'Saturn', diameter: 1.7, orbitRadius: 21, orbitPeriod: 10759, axialTilt: 26.7, rotationSpeed: 2.25, orbitSpeed: 0.034, color: '#E8D5A3', hasRing: true },
  { name: '天王星', englishName: 'Uranus', diameter: 1.0, orbitRadius: 26, orbitPeriod: 30687, axialTilt: 97.8, rotationSpeed: -1.39, orbitSpeed: 0.012, color: '#7EC8E3', hasRing: false },
  { name: '海王星', englishName: 'Neptune', diameter: 1.0, orbitRadius: 30, orbitPeriod: 60190, axialTilt: 28.3, rotationSpeed: 1.49, orbitSpeed: 0.006, color: '#3D5FC4', hasRing: false },
];

export class UIController {
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private mobileTopBar: HTMLElement;
  private mobileBottomBar: HTMLElement;
  private selectedPlanets: Set<string> = new Set();
  private currentTextureStyle: 'realistic' | 'cartoon' | 'wireframe' = 'realistic';
  private isMobile: boolean = false;
  private mobileMenuOpen: boolean = false;
  private rightPanelContent: HTMLElement;
  private compareBtn: HTMLButtonElement | null = null;

  constructor() {
    this.leftPanel = document.getElementById('left-panel')!;
    this.rightPanel = document.getElementById('right-panel')!;
    this.mobileTopBar = document.getElementById('mobile-top-bar')!;
    this.mobileBottomBar = document.getElementById('mobile-bottom-bar')!;
    this.rightPanelContent = document.createElement('div');

    this.buildLeftPanel();
    this.buildRightPanel();
    this.buildMobileUI();
    this.checkResponsive();
    this.bindBusEvents();

    window.addEventListener('resize', () => this.checkResponsive());
  }

  private glassPanel(el: HTMLElement): void {
    el.style.background = 'rgba(255,255,255,0.08)';
    el.style.backdropFilter = 'blur(8px)';
    el.style.webkitBackdropFilter = 'blur(8px)';
    el.style.borderRadius = '12px';
    el.style.border = '1px solid rgba(255,255,255,0.12)';
  }

  private buildLeftPanel(): void {
    const panel = this.leftPanel;
    this.glassPanel(panel);
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.left = '16px';
    panel.style.width = '280px';
    panel.style.padding = '20px';
    panel.style.overflowY = 'auto';
    panel.style.maxHeight = 'calc(100vh - 32px)';
    panel.style.zIndex = '10';
    panel.style.color = '#FFFFFF';
    panel.style.fontFamily = `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;

    const title = document.createElement('h2');
    title.textContent = '🪐 行星控制面板';
    title.style.fontSize = '18px';
    title.style.marginBottom = '16px';
    title.style.fontWeight = '600';
    panel.appendChild(title);

    const selectSection = document.createElement('div');
    selectSection.style.marginBottom = '20px';
    const selectLabel = document.createElement('div');
    selectLabel.textContent = '选择行星';
    selectLabel.style.fontSize = '13px';
    selectLabel.style.color = '#AAAAAA';
    selectLabel.style.marginBottom = '10px';
    selectSection.appendChild(selectLabel);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    grid.style.gap = '8px';
    grid.id = 'planet-grid';

    PLANET_LIST.forEach((p) => {
      const item = document.createElement('div');
      item.style.cssText = `
        width: 50px; height: 50px; border-radius: 50%;
        background: ${p.color}; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; color: #fff; text-align: center;
        transition: all 0.2s ease; position: relative;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `;
      item.textContent = p.name;
      item.dataset.planet = p.name;

      item.addEventListener('mouseenter', () => {
        item.style.transform = 'scale(1.1)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.transform = 'scale(1)';
      });
      item.addEventListener('click', () => {
        this.togglePlanetSelect(p.name, item);
      });

      grid.appendChild(item);
    });
    selectSection.appendChild(grid);
    panel.appendChild(selectSection);

    const compareBtn = document.createElement('button');
    compareBtn.textContent = '并排对比';
    compareBtn.style.cssText = `
      width: 100%; padding: 10px; margin-bottom: 20px;
      background: rgba(0,255,136,0.15); color: #00FF88;
      border: 1px solid rgba(0,255,136,0.3); border-radius: 8px;
      cursor: pointer; font-size: 14px; font-weight: 500;
      transition: all 0.15s ease;
    `;
    compareBtn.disabled = true;
    compareBtn.style.opacity = '0.4';
    this.compareBtn = compareBtn;

    compareBtn.addEventListener('mouseenter', () => {
      if (!compareBtn.disabled) {
        compareBtn.style.background = 'rgba(0,255,136,0.25)';
      }
    });
    compareBtn.addEventListener('mouseleave', () => {
      compareBtn.style.background = 'rgba(0,255,136,0.15)';
    });
    compareBtn.addEventListener('mousedown', () => {
      if (!compareBtn.disabled) {
        compareBtn.style.background = 'rgba(0,255,136,0.35)';
      }
    });
    compareBtn.addEventListener('mouseup', () => {
      if (!compareBtn.disabled) {
        compareBtn.style.background = 'rgba(0,255,136,0.25)';
      }
    });
    compareBtn.addEventListener('click', () => {
      this.handleCompare();
    });

    panel.appendChild(compareBtn);

    const speedSection = document.createElement('div');
    speedSection.style.marginBottom = '20px';

    const orbitLabel = document.createElement('div');
    orbitLabel.style.cssText = 'font-size:13px; color:#AAAAAA; margin-bottom:6px;';
    orbitLabel.textContent = '公转速度';
    speedSection.appendChild(orbitLabel);

    const orbitSlider = this.createSlider('orbit-speed', 0.5, 5, 1, 0.1, (val) => {
      emit('speed:orbit', { speed: val });
    });
    speedSection.appendChild(orbitSlider);

    const rotLabel = document.createElement('div');
    rotLabel.style.cssText = 'font-size:13px; color:#AAAAAA; margin-bottom:6px; margin-top:14px;';
    rotLabel.textContent = '自转速度';
    speedSection.appendChild(rotLabel);

    const rotSlider = this.createSlider('rotation-speed', 0, 3, 1, 0.1, (val) => {
      emit('speed:rotation', { speed: val });
    });
    speedSection.appendChild(rotSlider);

    panel.appendChild(speedSection);

    const texSection = document.createElement('div');
    const texLabel = document.createElement('div');
    texLabel.style.cssText = 'font-size:13px; color:#AAAAAA; margin-bottom:10px;';
    texLabel.textContent = '纹理样式';
    texSection.appendChild(texLabel);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px;';

    const styles: Array<{ key: 'realistic' | 'cartoon' | 'wireframe'; label: string }> = [
      { key: 'realistic', label: '真实' },
      { key: 'cartoon', label: '卡通' },
      { key: 'wireframe', label: '线框' },
    ];

    styles.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.dataset.style = key;
      btn.style.cssText = `
        flex:1; padding:8px 0; border-radius:6px; cursor:pointer;
        font-size:12px; border:1px solid rgba(255,255,255,0.15);
        transition: all 0.15s ease;
        ${key === 'realistic'
          ? 'background:rgba(255,255,255,0.2); color:#fff;'
          : 'background:rgba(255,255,255,0.05); color:#AAAAAA;'}
      `;
      btn.addEventListener('click', () => {
        this.currentTextureStyle = key;
        emit('texture:change', { style: key });
        btnRow.querySelectorAll('button').forEach((b) => {
          (b as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
          (b as HTMLElement).style.color = '#AAAAAA';
        });
        btn.style.background = 'rgba(255,255,255,0.2)';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mousedown', () => {
        btn.style.background = 'rgba(255,255,255,0.3)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.background = 'rgba(255,255,255,0.2)';
      });
      btnRow.appendChild(btn);
    });

    texSection.appendChild(btnRow);
    panel.appendChild(texSection);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置视角';
    resetBtn.style.cssText = `
      width: 100%; padding: 8px; margin-top: 20px;
      background: rgba(255,255,255,0.05); color: #AAAAAA;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      cursor: pointer; font-size: 13px;
      transition: all 0.15s ease;
    `;
    resetBtn.addEventListener('click', () => {
      emit('mode:reset', undefined as any);
      emit('camera:reset', undefined as any);
    });
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(255,255,255,0.12)';
      resetBtn.style.color = '#fff';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255,255,255,0.05)';
      resetBtn.style.color = '#AAAAAA';
    });
    panel.appendChild(resetBtn);
  }

  private createSlider(
    id: string, min: number, max: number, value: number, step: number,
    onChange: (val: number) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; padding: 4px 0;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:10px;';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.id = id;
    slider.style.cssText = `
      flex: 1; -webkit-appearance: none; appearance: none;
      height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.15); outline: none;
      cursor: pointer;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #${id}::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 16px; height: 16px; border-radius: 50%;
        background: #00FF88; cursor: pointer;
        box-shadow: 0 0 12px rgba(0,255,136,0.3);
        transition: box-shadow 0.2s ease;
      }
      #${id}:active::-webkit-slider-thumb {
        box-shadow: 0 0 16px rgba(0,255,136,0.5);
      }
      #${id}::-moz-range-thumb {
        width: 16px; height: 16px; border-radius: 50%;
        background: #00FF88; cursor: pointer; border: none;
        box-shadow: 0 0 12px rgba(0,255,136,0.3);
      }
    `;
    document.head.appendChild(styleEl);

    const valDisplay = document.createElement('span');
    valDisplay.textContent = `${value}x`;
    valDisplay.style.cssText = 'font-size:12px; color:#AAAAAA; min-width:36px; text-align:right;';

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valDisplay.textContent = `${v.toFixed(1)}x`;
      onChange(v);
    });

    row.appendChild(slider);
    row.appendChild(valDisplay);
    wrapper.appendChild(row);
    return wrapper;
  }

  private buildRightPanel(): void {
    const panel = this.rightPanel;
    this.glassPanel(panel);
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '320px';
    panel.style.maxHeight = 'calc(100vh - 32px)';
    panel.style.overflowY = 'auto';
    panel.style.padding = '20px';
    panel.style.zIndex = '10';
    panel.style.fontFamily = `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;

    this.rightPanelContent = document.createElement('div');
    this.showEmptyState();
    panel.appendChild(this.rightPanelContent);
  }

  private showEmptyState(): void {
    this.rightPanelContent.innerHTML = '';
    const msg = document.createElement('div');
    msg.textContent = '选择行星以查看详情';
    msg.style.cssText = `
      text-align: center; color: #AAAAAA; font-size: 16px;
      padding: 40px 0;
    `;
    this.rightPanelContent.appendChild(msg);
  }

  private showPlanetDetail(info: PlanetInfo): void {
    this.rightPanelContent.innerHTML = '';

    const name = document.createElement('div');
    name.textContent = info.name;
    name.style.cssText = 'font-size:24px; font-weight:700; color:#FFFFFF; margin-bottom:4px;';
    this.rightPanelContent.appendChild(name);

    const enName = document.createElement('div');
    enName.textContent = info.englishName;
    enName.style.cssText = 'font-size:14px; color:#888888; margin-bottom:20px;';
    this.rightPanelContent.appendChild(enName);

    const dataRows = [
      ['直径', `${(info.diameter * 6371).toFixed(0)} km (×${info.diameter})`],
      ['轨道半径', `${info.orbitRadius} AU (缩放)`],
      ['公转周期', `${info.orbitPeriod.toLocaleString()} 地球日`],
      ['自转倾角', `${info.axialTilt}°`],
      ['公转速度', `${info.orbitSpeed.toFixed(3)}x`],
      ['自转速度', `${info.rotationSpeed.toFixed(3)}x`],
      ['行星环', info.hasRing ? '有' : '无'],
    ];

    dataRows.forEach(([label, val]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06);';
      const lbl = document.createElement('span');
      lbl.textContent = label;
      lbl.style.cssText = 'font-size:13px; color:#888888;';
      const v = document.createElement('span');
      v.textContent = val;
      v.style.cssText = 'font-size:13px; color:#CCCCCC;';
      row.appendChild(lbl);
      row.appendChild(v);
      this.rightPanelContent.appendChild(row);
    });
  }

  private showCompareView(data: CompareData): void {
    this.rightPanelContent.innerHTML = '';

    const title = document.createElement('div');
    title.textContent = `${data.planetA.name} vs ${data.planetB.name}`;
    title.style.cssText = 'font-size:20px; font-weight:700; color:#FFFFFF; margin-bottom:16px; text-align:center;';
    this.rightPanelContent.appendChild(title);

    const metrics: Array<{ label: string; valA: number; valB: number; unit: string; ratio: string }> = [
      {
        label: '半径比',
        valA: data.planetA.diameter,
        valB: data.planetB.diameter,
        unit: '单位',
        ratio: `${data.radiusRatio.toFixed(2)}:1`,
      },
      {
        label: '公转周期比',
        valA: data.planetA.orbitPeriod,
        valB: data.planetB.orbitPeriod,
        unit: '天',
        ratio: `${data.orbitPeriodRatio.toFixed(2)}:1`,
      },
      {
        label: '自转倾角差',
        valA: data.planetA.axialTilt,
        valB: data.planetB.axialTilt,
        unit: '°',
        ratio: `${data.axialTiltDiff.toFixed(1)}°`,
      },
    ];

    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = 'margin-top:16px;';

    metrics.forEach((m) => {
      const mLabel = document.createElement('div');
      mLabel.style.cssText = 'font-size:12px; color:#AAAAAA; margin-bottom:4px; margin-top:12px;';
      mLabel.textContent = `${m.label} (${m.ratio})`;
      chartContainer.appendChild(mLabel);

      const barRow = document.createElement('div');
      barRow.style.cssText = 'display:flex; gap:8px; align-items:flex-end; height:60px;';

      const maxVal = Math.max(m.valA, m.valB, 0.01);
      const hA = (m.valA / maxVal) * 50;
      const hB = (m.valB / maxVal) * 50;

      const colA = document.createElement('div');
      colA.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;';
      const barA = document.createElement('div');
      barA.style.cssText = `width:100%; height:${hA}px; background:#F9A826; border-radius:4px 4px 0 0; transition:height 0.3s ease;`;
      const labelA = document.createElement('div');
      labelA.style.cssText = 'font-size:10px; color:#F9A826;';
      labelA.textContent = `${m.valA}${m.unit}`;
      colA.appendChild(barA);
      colA.appendChild(labelA);

      const colB = document.createElement('div');
      colB.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;';
      const barB = document.createElement('div');
      barB.style.cssText = `width:100%; height:${hB}px; background:#4ECDC4; border-radius:4px 4px 0 0; transition:height 0.3s ease;`;
      const labelB = document.createElement('div');
      labelB.style.cssText = 'font-size:10px; color:#4ECDC4;';
      labelB.textContent = `${m.valB}${m.unit}`;
      colB.appendChild(barB);
      colB.appendChild(labelB);

      barRow.appendChild(colA);
      barRow.appendChild(colB);
      chartContainer.appendChild(barRow);
    });

    this.rightPanelContent.appendChild(chartContainer);

    const exitBtn = document.createElement('button');
    exitBtn.textContent = '退出对比';
    exitBtn.style.cssText = `
      width:100%; padding:8px; margin-top:16px;
      background:rgba(255,255,255,0.05); color:#AAAAAA;
      border:1px solid rgba(255,255,255,0.1); border-radius:8px;
      cursor:pointer; font-size:13px; transition:all 0.15s ease;
    `;
    exitBtn.addEventListener('click', () => {
      emit('planets:compareExit');
      this.selectedPlanets.clear();
      this.updatePlanetGridSelection();
      this.showEmptyState();
    });
    exitBtn.addEventListener('mouseenter', () => {
      exitBtn.style.background = 'rgba(255,255,255,0.12)';
      exitBtn.style.color = '#fff';
    });
    exitBtn.addEventListener('mouseleave', () => {
      exitBtn.style.background = 'rgba(255,255,255,0.05)';
      exitBtn.style.color = '#AAAAAA';
    });
    this.rightPanelContent.appendChild(exitBtn);
  }

  private togglePlanetSelect(name: string, item: HTMLElement): void {
    if (this.selectedPlanets.has(name)) {
      this.selectedPlanets.delete(name);
      item.style.boxShadow = 'none';
      emit('planet:deselect', { name });
    } else {
      if (this.selectedPlanets.size >= 2) {
        const first = this.selectedPlanets.values().next().value!;
        this.selectedPlanets.delete(first);
        const grid = document.getElementById('planet-grid');
        if (grid) {
          const firstEl = grid.querySelector(`[data-planet="${first}"]`) as HTMLElement;
          if (firstEl) firstEl.style.boxShadow = 'none';
        }
        emit('planet:deselect', { name: first });
      }
      this.selectedPlanets.add(name);
      item.style.boxShadow = '0 0 0 2px #00FF88';
      emit('planet:select', { name });
    }

    if (this.compareBtn) {
      this.compareBtn.disabled = this.selectedPlanets.size !== 2;
      this.compareBtn.style.opacity = this.selectedPlanets.size === 2 ? '1' : '0.4';
    }

    if (this.selectedPlanets.size === 1) {
      const pName = this.selectedPlanets.values().next().value!;
      const pInfo = PLANET_LIST.find((p) => p.name === pName);
      if (pInfo) this.showPlanetDetail(pInfo);
    } else if (this.selectedPlanets.size === 0) {
      this.showEmptyState();
    }
  }

  private updatePlanetGridSelection(): void {
    const grid = document.getElementById('planet-grid');
    if (!grid) return;
    grid.querySelectorAll('[data-planet]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const name = htmlEl.dataset.planet!;
      if (this.selectedPlanets.has(name)) {
        htmlEl.style.boxShadow = '0 0 0 2px #00FF88';
      } else {
        htmlEl.style.boxShadow = 'none';
      }
    });
  }

  private handleCompare(): void {
    if (this.selectedPlanets.size !== 2) return;
    const names = Array.from(this.selectedPlanets) as [string, string];
    emit('planets:compare', { names });
  }

  private buildMobileUI(): void {
    this.mobileTopBar.style.display = 'none';
    this.mobileTopBar.style.cssText += `
      position:fixed; top:0; left:0; right:0; height:50px; z-index:20;
      background:rgba(255,255,255,0.08); backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px); border-bottom:1px solid rgba(255,255,255,0.12);
      display:none; align-items:center; padding:0 16px;
    `;

    const hamburger = document.createElement('div');
    hamburger.innerHTML = '&#9776;';
    hamburger.style.cssText = 'font-size:24px; color:#fff; cursor:pointer;';
    hamburger.addEventListener('click', () => {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      if (this.mobileMenuOpen) {
        this.leftPanel.style.display = 'block';
      } else {
        this.leftPanel.style.display = 'none';
      }
    });
    this.mobileTopBar.appendChild(hamburger);

    this.mobileBottomBar.style.display = 'none';
    this.mobileBottomBar.style.cssText += `
      position:fixed; bottom:0; left:0; right:0; height:180px; z-index:20;
      background:rgba(255,255,255,0.08); backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px); border-top:1px solid rgba(255,255,255,0.12);
      overflow-y:auto; padding:12px;
    `;
  }

  private checkResponsive(): void {
    const w = window.innerWidth;
    this.isMobile = w < 900;

    if (this.isMobile) {
      this.leftPanel.style.display = this.mobileMenuOpen ? 'block' : 'none';
      this.leftPanel.style.position = 'fixed';
      this.leftPanel.style.top = '50px';
      this.leftPanel.style.left = '8px';
      this.leftPanel.style.width = '260px';
      this.leftPanel.style.maxHeight = 'calc(100vh - 240px)';

      this.rightPanel.style.position = 'fixed';
      this.rightPanel.style.bottom = '0';
      this.rightPanel.style.right = '0';
      this.rightPanel.style.top = 'auto';
      this.rightPanel.style.width = '100%';
      this.rightPanel.style.maxHeight = '180px';
      this.rightPanel.style.borderRadius = '12px 12px 0 0';

      this.mobileTopBar.style.display = 'flex';
      this.mobileBottomBar.style.display = 'none';
    } else {
      this.leftPanel.style.display = 'block';
      this.leftPanel.style.position = 'absolute';
      this.leftPanel.style.top = '16px';
      this.leftPanel.style.left = '16px';
      this.leftPanel.style.width = '280px';
      this.leftPanel.style.maxHeight = 'calc(100vh - 32px)';

      this.rightPanel.style.position = 'absolute';
      this.rightPanel.style.top = '16px';
      this.rightPanel.style.right = '16px';
      this.rightPanel.style.bottom = 'auto';
      this.rightPanel.style.width = '320px';
      this.rightPanel.style.maxHeight = 'calc(100vh - 32px)';
      this.rightPanel.style.borderRadius = '12px';

      this.mobileTopBar.style.display = 'none';
      this.mobileBottomBar.style.display = 'none';
    }
  }

  private bindBusEvents(): void {
    on('planet:click', (payload) => {
      const pInfo = PLANET_LIST.find((p) => p.name === payload.name);
      if (pInfo) this.showPlanetDetail(pInfo);
    });

    on('planets:compared', (data: CompareData) => {
      this.showCompareView(data);
    });

    on('planets:compareExit', () => {
      this.showEmptyState();
    });

    on('planet:highlighted', (payload) => {
      const grid = document.getElementById('planet-grid');
      if (!grid) return;
      const el = grid.querySelector(`[data-planet="${payload.name}"]`) as HTMLElement;
      if (el) {
        if (payload.highlighted) {
          el.style.boxShadow = '0 0 0 2px #00FF88';
        } else if (!this.selectedPlanets.has(payload.name)) {
          el.style.boxShadow = 'none';
        }
      }
    });

    on('mode:reset', () => {
      this.selectedPlanets.clear();
      this.updatePlanetGridSelection();
      this.showEmptyState();
    });
  }
}
