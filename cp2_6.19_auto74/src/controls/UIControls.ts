import * as dat from 'dat.gui';
import type { SimulationEngine, SimulationParams, PlanetData } from '../SimulationEngine';
import type { Renderer3D } from '../Renderer3D';

export interface UIControlParams {
  gravityConstant: number;
  velocityMultiplier: number;
  timeScale: number;
}

interface DrawerState {
  isExpanded: boolean;
  isDragging: boolean;
  currentHeight: number;
  startY: number;
  startHeight: number;
}

export class UIControls {
  private gui: dat.GUI;
  private engine: SimulationEngine;
  private renderer: Renderer3D;
  private params: UIControlParams;
  private onClearTrailsCallbacks: (() => void)[] = [];

  private selectedPlanetId: string | null = null;
  private lastInfoUpdateTime: number = 0;
  private readonly INFO_UPDATE_INTERVAL = 1.0;

  private drawer: DrawerState = {
    isExpanded: false,
    isDragging: false,
    currentHeight: 0,
    startY: 0,
    startHeight: 0,
  };

  private readonly DRAWER_HANDLE_HEIGHT = 40;
  private readonly DRAWER_MAX_HEIGHT_RATIO = 0.4;
  private readonly MOBILE_BREAKPOINT = 768;

  private infoPanelElement: HTMLElement | null = null;
  private infoElements: {
    name: HTMLElement | null;
    mass: HTMLElement | null;
    velocity: HTMLElement | null;
    orbit: HTMLElement | null;
    period: HTMLElement | null;
  } = {
    name: null,
    mass: null,
    velocity: null,
    orbit: null,
    period: null,
  };

  constructor(engine: SimulationEngine, renderer: Renderer3D) {
    this.engine = engine;
    this.renderer = renderer;

    const engineParams = engine.getParams();
    this.params = {
      gravityConstant: engineParams.gravityConstant,
      velocityMultiplier: engineParams.velocityMultiplier,
      timeScale: engineParams.timeScale,
    };

    this.gui = new dat.GUI({ name: '控制面板', width: 320 });
    this.applyGlassStyle();
    this.buildControls();
    this.setupKeyboardEvents();
    this.setupPlanetSelectionEvents();
    this.setupInfoPanelElements();
    this.setupResponsiveDrawer();
    this.checkInitialResponsiveState();
  }

  private setupInfoPanelElements(): void {
    this.infoPanelElement = document.getElementById('info-panel');
    this.infoElements.name = document.getElementById('planet-name');
    this.infoElements.mass = document.getElementById('info-mass');
    this.infoElements.velocity = document.getElementById('info-velocity');
    this.infoElements.orbit = document.getElementById('info-orbit');
    this.infoElements.period = document.getElementById('info-period');
  }

  private setupPlanetSelectionEvents(): void {
    this.renderer.onPlanetClick((planetId) => {
      this.selectPlanet(planetId);
    });

    this.renderer.onSelectedPlanetData((planet) => {
      this.updateInfoPanelInternal(planet);
    });
  }

  private updateInfoPanelInternal(planet: PlanetData | null): void {
    if (!this.infoPanelElement) return;

    if (!planet) {
      this.infoPanelElement.classList.remove('visible');
      return;
    }

    this.infoPanelElement.classList.add('visible');

    if (this.infoElements.name) this.infoElements.name.textContent = planet.name;
    if (this.infoElements.mass) this.infoElements.mass.textContent = planet.mass.toFixed(3);
    if (this.infoElements.velocity) {
      const speed = Math.sqrt(
        planet.velocity.x ** 2 + planet.velocity.y ** 2 + planet.velocity.z ** 2
      );
      this.infoElements.velocity.textContent = speed.toFixed(3);
    }
    if (this.infoElements.orbit) this.infoElements.orbit.textContent = planet.orbitRadius.toFixed(3);
    if (this.infoElements.period) {
      if (planet.orbitalPeriod > 0 && planet.orbitalPeriod < 10000) {
        this.infoElements.period.textContent = planet.orbitalPeriod.toFixed(2);
      } else {
        this.infoElements.period.textContent = '计算中...';
      }
    }
  }

  updateInfoPanel(planet: PlanetData | null): void {
    this.updateInfoPanelInternal(planet);
  }

  private applyGlassStyle(): void {
    const dom = this.gui.domElement;
    dom.style.background = 'rgba(255, 255, 255, 0.08)';
    dom.style.backdropFilter = 'blur(8px)';
    (dom.style as any).webkitBackdropFilter = 'blur(8px)';
    dom.style.borderRadius = '12px';
    dom.style.border = '1px solid rgba(80, 120, 255, 0.6)';
    dom.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 8px rgba(80, 120, 255, 0.3), inset 0 0 8px rgba(80, 120, 255, 0.05)';
    dom.style.overflow = 'hidden';
    dom.style.position = 'absolute';
    dom.style.top = '20px';
    dom.style.left = '20px';
    dom.style.fontFamily = "'Courier New', Consolas, Monaco, monospace";
    dom.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    dom.style.zIndex = '100';
    dom.style.animation = 'gui-shield-border-cycle 6s linear infinite, gui-shield-glow-pulse 3s ease-in-out infinite';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes gui-shield-border-cycle {
        0% {
          border-color: rgba(80, 120, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 8px rgba(80, 120, 255, 0.3),
            inset 0 0 8px rgba(80, 120, 255, 0.05);
        }
        33% {
          border-color: rgba(140, 80, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 8px rgba(140, 80, 255, 0.3),
            inset 0 0 8px rgba(140, 80, 255, 0.05);
        }
        66% {
          border-color: rgba(180, 100, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 8px rgba(180, 100, 255, 0.3),
            inset 0 0 8px rgba(180, 100, 255, 0.05);
        }
        100% {
          border-color: rgba(80, 120, 255, 0.6);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 8px rgba(80, 120, 255, 0.3),
            inset 0 0 8px rgba(80, 120, 255, 0.05);
        }
      }

      @keyframes gui-shield-glow-pulse {
        0%, 100% {
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 6px rgba(80, 120, 255, 0.2),
            inset 0 0 6px rgba(80, 120, 255, 0.03);
        }
        50% {
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 14px rgba(140, 80, 255, 0.4),
            inset 0 0 14px rgba(140, 80, 255, 0.06);
        }
      }

      .dg.ac {
        z-index: 100 !important;
      }
      .dg {
        opacity: 0.98;
      }
      .dg.main {
        background: transparent !important;
      }
      .dg.main .close-button {
        background-color: rgba(255, 215, 0, 0.2) !important;
        color: #ffd700 !important;
        transition: all 0.2s ease;
        border: none !important;
        font-family: 'Courier New', Consolas, Monaco, monospace;
        letter-spacing: 1px;
      }
      .dg.main .close-button:hover {
        background-color: rgba(255, 215, 0, 0.35) !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
      }
      .dg .title {
        background: rgba(255, 215, 0, 0.15) !important;
        color: #ffd700 !important;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
        font-size: 13px !important;
        font-family: 'Courier New', Consolas, Monaco, monospace !important;
        padding: 10px 12px !important;
        border-bottom: 1px solid rgba(255, 215, 0, 0.2);
      }
      .dg li.title {
        background: rgba(100, 120, 255, 0.12) !important;
        color: #b0c0ff !important;
        font-size: 11px !important;
        letter-spacing: 0.5px;
        border-radius: 6px;
        margin: 6px 4px 2px 4px !important;
        padding: 6px 10px !important;
      }
      .dg li:not(.title) {
        background: transparent !important;
        padding: 4px 8px;
        transition: all 0.2s ease;
      }
      .dg .c {
        background: transparent !important;
        position: relative;
      }
      .dg .c .slider {
        background: linear-gradient(90deg, rgba(20, 20, 60, 0.8), rgba(30, 30, 80, 0.6)) !important;
        border-radius: 8px;
        height: 6px;
        margin-top: 8px;
        margin-bottom: 8px;
        border: 1px solid rgba(80, 120, 255, 0.15);
        transition: all 0.2s ease;
        overflow: visible !important;
      }
      .dg .c .slider:hover {
        border-color: rgba(80, 120, 255, 0.3);
        box-shadow: 0 0 8px rgba(80, 120, 255, 0.2);
      }
      .dg .c .slider-fg {
        background: linear-gradient(90deg, rgba(80, 120, 255, 0.7), rgba(140, 80, 255, 0.7)) !important;
        border-radius: 8px;
        height: 6px;
      }
      .dg .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: radial-gradient(circle at 40% 35%, #e0e8ff, #8090ff 40%, #5070ff 70%, #3050ee);
        border: none;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 140, 255, 0.5), 0 0 16px rgba(100, 140, 255, 0.25), 0 0 2px rgba(255, 255, 255, 0.4) inset;
        transition: box-shadow 0.2s ease, transform 0.1s ease;
        margin-top: -5px;
      }
      .dg .slider::-webkit-slider-thumb:hover {
        box-shadow: 0 0 12px rgba(100, 140, 255, 0.7), 0 0 24px rgba(100, 140, 255, 0.4), 0 0 2px rgba(255, 255, 255, 0.5) inset;
        transform: scale(1.1);
      }
      .dg .slider:active::-webkit-slider-thumb {
        box-shadow: 0 0 16px rgba(140, 180, 255, 0.9), 0 0 32px rgba(140, 180, 255, 0.5), 0 0 3px rgba(255, 255, 255, 0.6) inset;
        transform: scale(1.15);
      }
      .dg .slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: radial-gradient(circle at 40% 35%, #e0e8ff, #8090ff 40%, #5070ff 70%, #3050ee);
        border: none;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 140, 255, 0.5), 0 0 16px rgba(100, 140, 255, 0.25);
        transition: box-shadow 0.2s ease;
      }
      .dg .slider::-moz-range-thumb:hover {
        box-shadow: 0 0 12px rgba(100, 140, 255, 0.7), 0 0 24px rgba(100, 140, 255, 0.4);
      }
      .dg .slider::-moz-range-track {
        background: linear-gradient(90deg, rgba(20, 20, 60, 0.8), rgba(30, 30, 80, 0.6));
        border-radius: 8px;
        height: 6px;
        border: 1px solid rgba(80, 120, 255, 0.15);
      }
      .dg .property-name {
        color: #c0c0e0 !important;
        font-size: 12px !important;
        font-family: 'Courier New', Consolas, Monaco, monospace !important;
        padding: 6px 0 !important;
      }
      .dg .c input[type='text'],
      .dg .c input[type='number'] {
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: #80ff80 !important;
        border-radius: 4px;
        padding: 3px 6px !important;
        font-family: 'Courier New', Consolas, Monaco, monospace !important;
        font-size: 12px !important;
        transition: all 0.2s ease;
      }
      .dg .c input[type='text']:hover,
      .dg .c input[type='number']:hover {
        border-color: rgba(255, 215, 0, 0.4) !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .dg .c input[type='text']:focus,
      .dg .c input[type='number']:focus {
        outline: none;
        border-color: rgba(255, 215, 0, 0.6) !important;
      }
      .dg .slider-value-badge {
        display: inline-block;
        min-width: 50px;
        padding: 2px 8px;
        margin-left: 8px;
        background: rgba(128, 255, 128, 0.15);
        border: 1px solid rgba(128, 255, 128, 0.3);
        border-radius: 4px;
        color: #80ff80;
        font-size: 11px;
        font-weight: bold;
        font-family: 'Courier New', Consolas, Monaco, monospace;
        text-align: center;
        transition: all 0.2s ease;
      }
      .dg .function {
        background: linear-gradient(90deg, rgba(255, 100, 100, 0.2), rgba(255, 150, 100, 0.2)) !important;
        border-radius: 6px !important;
        margin: 6px 4px !important;
        padding: 4px 8px !important;
        transition: all 0.2s ease;
        border: 1px solid rgba(255, 100, 100, 0.2);
      }
      .dg .function:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(255, 100, 100, 0.2);
        border-color: rgba(255, 100, 100, 0.4);
      }
      .dg .has-slider .property-name {
        max-width: 45%;
      }
      @media (max-width: 768px) {
        .dg.ac {
          position: fixed !important;
          bottom: 0 !important;
          top: auto !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          max-height: 40vh !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          border-radius: 16px 16px 0 0 !important;
          border-top: 2px solid rgba(80, 120, 255, 0.3) !important;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          touch-action: none;
        }
        .dg.ac::before {
          content: '≡≡≡';
          display: block;
          text-align: center;
          color: rgba(255, 215, 0, 0.5);
          font-size: 18px;
          padding: 8px 0;
          letter-spacing: 8px;
          cursor: grab;
          height: 40px;
          box-sizing: border-box;
          line-height: 24px;
          user-select: none;
          -webkit-user-select: none;
          background: linear-gradient(180deg, rgba(255, 215, 0, 0.1), transparent);
        }
        .dg.ac:active::before {
          cursor: grabbing;
        }
        .dg.ac.drawer-collapsed {
          transform: translateY(calc(100% - 40px)) !important;
        }
        .dg.ac.drawer-expanded {
          transform: translateY(0) !important;
        }
        .dg.ac.drawer-dragging {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private setupResponsiveDrawer(): void {
    window.addEventListener('resize', () => {
      this.updateDrawerState();
    });

    let pointerStartY = 0;
    let pointerStartHeight = 0;
    let isDragging = false;

    const getPanelElement = (): HTMLElement | null => {
      return document.querySelector('.dg.ac');
    };

    const getMaxHeight = (): number => {
      return window.innerHeight * this.DRAWER_MAX_HEIGHT_RATIO;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (window.innerWidth > this.MOBILE_BREAKPOINT) return;

      const panel = getPanelElement();
      if (!panel) return;

      const target = e.target as HTMLElement;
      const isHandle = target.tagName === 'LI' && target.classList.contains('title') && target.parentElement?.classList.contains('ac');

      if (!isHandle && !target.closest('.dg.ac::before')) {
        const handleArea = document.querySelector('.dg.ac');
        if (handleArea) {
          const rect = handleArea.getBoundingClientRect();
          if (e.clientY - rect.top > this.DRAWER_HANDLE_HEIGHT) {
            return;
          }
        }
      }

      isDragging = true;
      pointerStartY = e.clientY;
      const rect = panel.getBoundingClientRect();
      pointerStartHeight = window.innerHeight - rect.top;

      panel.classList.add('drawer-dragging');
      e.preventDefault();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;

      const panel = getPanelElement();
      if (!panel) return;

      const deltaY = pointerStartY - e.clientY;
      let newHeight = pointerStartHeight + deltaY;
      const maxHeight = getMaxHeight();

      newHeight = Math.max(this.DRAWER_HANDLE_HEIGHT, Math.min(maxHeight, newHeight));

      panel.style.maxHeight = newHeight + 'px';
      panel.style.height = newHeight + 'px';
      this.drawer.currentHeight = newHeight;
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      isDragging = false;

      const panel = getPanelElement();
      if (!panel) return;

      panel.classList.remove('drawer-dragging');
      panel.style.height = '';

      const maxHeight = getMaxHeight();
      const midPoint = (this.DRAWER_HANDLE_HEIGHT + maxHeight) / 2;
      const shouldExpand = this.drawer.currentHeight > midPoint;

      if (shouldExpand) {
        this.expandDrawer();
      } else {
        this.collapseDrawer();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }

  private checkInitialResponsiveState(): void {
    setTimeout(() => {
      this.updateDrawerState();
    }, 100);
  }

  private updateDrawerState(): void {
    const panel = document.querySelector('.dg.ac') as HTMLElement | null;
    if (!panel) return;

    if (window.innerWidth <= this.MOBILE_BREAKPOINT) {
      if (this.drawer.isExpanded) {
        this.expandDrawer();
      } else {
        this.collapseDrawer();
      }
    } else {
      panel.classList.remove('drawer-collapsed', 'drawer-expanded', 'drawer-dragging');
      panel.style.maxHeight = '';
      panel.style.height = '';
    }
  }

  private expandDrawer(): void {
    const panel = document.querySelector('.dg.ac') as HTMLElement | null;
    if (!panel) return;

    this.drawer.isExpanded = true;
    const maxHeight = window.innerHeight * this.DRAWER_MAX_HEIGHT_RATIO;
    panel.style.maxHeight = maxHeight + 'px';
    panel.classList.remove('drawer-collapsed');
    panel.classList.add('drawer-expanded');
  }

  private collapseDrawer(): void {
    const panel = document.querySelector('.dg.ac') as HTMLElement | null;
    if (!panel) return;

    this.drawer.isExpanded = false;
    panel.style.maxHeight = this.DRAWER_HANDLE_HEIGHT + 'px';
    panel.classList.remove('drawer-expanded');
    panel.classList.add('drawer-collapsed');
  }

  private buildControls(): void {
    const physicsFolder = this.gui.addFolder('物理参数');
    physicsFolder.open();

    this.addSliderWithBadge(
      physicsFolder,
      this.params,
      'gravityConstant',
      '引力常数 G',
      0.1,
      10,
      0.1,
      (value: number) => {
        const newParams: Partial<SimulationParams> = { gravityConstant: value };
        this.engine.setParams(newParams);
      }
    );

    this.addSliderWithBadge(
      physicsFolder,
      this.params,
      'velocityMultiplier',
      '初始速度倍率',
      0.5,
      2,
      0.05,
      (value: number) => {
        const newParams: Partial<SimulationParams> = { velocityMultiplier: value };
        this.engine.setParams(newParams);
      }
    );

    this.addSliderWithBadge(
      physicsFolder,
      this.params,
      'timeScale',
      '时间流速',
      0.1,
      5,
      0.1,
      (value: number) => {
        const newParams: Partial<SimulationParams> = { timeScale: value };
        this.engine.setParams(newParams);
      }
    );

    const actionsFolder = this.gui.addFolder('操作');
    actionsFolder.open();

    const clearTrailsObj = {
      '清除所有轨迹 (Space)': () => {
        this.clearTrails();
      },
    };
    const clearBtn = actionsFolder.add(clearTrailsObj, '清除所有轨迹 (Space)');
    this.styleButton(clearBtn, '#ff6666');

    const resetSelectionObj = {
      '取消选择 (Esc)': () => {
        this.renderer.setSelectedPlanet(null);
        this.selectedPlanetId = null;
        this.updateInfoPanelInternal(null);
      },
    };
    const resetBtn = actionsFolder.add(resetSelectionObj, '取消选择 (Esc)');
    this.styleButton(resetBtn, '#66aaff');

    const infoFolder = this.gui.addFolder('快捷键');
    infoFolder.open();
    const info = {
      '选择行星 1': '数字键 1',
      '选择行星 2': '数字键 2',
      '选择行星 3': '数字键 3',
      '选择行星 4': '数字键 4',
      '清除轨迹': '空格键',
      '取消选择': 'Esc',
    };
    Object.keys(info).forEach((key) => {
      const dummy: Record<string, string> = {};
      dummy[key] = (info as Record<string, string>)[key];
      infoFolder.add(dummy, key).listen();
    });
  }

  private addSliderWithBadge(
    folder: dat.GUI,
    target: UIControlParams,
    prop: keyof UIControlParams,
    label: string,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ): void {
    const displayObj = { [label]: target[prop] };
    const controller = folder.add(displayObj, label, min, max, step);

    controller.onChange((value: number) => {
      (target as unknown as Record<string, number>)[prop] = value;
      onChange(value);
    });

    controller.onFinishChange((value: number) => {
      (target as unknown as Record<string, number>)[prop] = value;
      onChange(value);
    });
  }

  private styleButton(controller: dat.GUIController, color: string): void {
    const el = controller.domElement;
    el.style.background = `${color}33`;
    el.style.border = `1px solid ${color}66`;
    el.style.borderRadius = '6px';
    el.style.margin = '6px 4px';
    el.style.transition = 'all 0.2s ease';
    el.style.cursor = 'pointer';
    el.style.overflow = 'hidden';

    el.addEventListener('mouseenter', () => {
      el.style.transform = 'translateY(-2px)';
      el.style.boxShadow = `0 6px 16px ${color}44`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translateY(0)';
      el.style.boxShadow = 'none';
    });
  }

  private setupKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        this.clearTrails();
        return;
      }

      if (e.key === 'Escape') {
        this.renderer.setSelectedPlanet(null);
        this.selectedPlanetId = null;
        this.updateInfoPanelInternal(null);
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const planet = this.engine.getPlanetByIndex(num - 1);
        if (planet) {
          this.selectPlanet(planet.id);
        }
      }
    });
  }

  private selectPlanet(planetId: string): void {
    this.renderer.setSelectedPlanet(planetId);
    this.selectedPlanetId = planetId;
    const planet = this.engine.getPlanetById(planetId);
    if (planet) {
      this.updateInfoPanelInternal(planet);
    }
  }

  private clearTrails(): void {
    this.engine.clearAllTrails();
    this.renderer.startTrailFade();
    this.onClearTrailsCallbacks.forEach((cb) => cb());
  }

  onClearTrails(callback: () => void): void {
    this.onClearTrailsCallbacks.push(callback);
  }

  update(currentTime: number): void {
    if (this.selectedPlanetId) {
      const timeSinceLastUpdate = currentTime - this.lastInfoUpdateTime;
      if (timeSinceLastUpdate >= this.INFO_UPDATE_INTERVAL) {
        this.lastInfoUpdateTime = currentTime;
        const planet = this.engine.getPlanetById(this.selectedPlanetId);
        if (planet) {
          this.updateInfoPanelInternal(planet);
        } else {
          this.selectedPlanetId = null;
          this.updateInfoPanelInternal(null);
        }
      }
    }
  }

  dispose(): void {
    this.gui.destroy();
  }
}
