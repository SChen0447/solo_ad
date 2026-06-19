import * as dat from 'dat.gui';
import type { SimulationEngine, SimulationParams } from '../SimulationEngine';
import type { Renderer3D } from '../Renderer3D';

export interface UIControlParams {
  gravityConstant: number;
  velocityMultiplier: number;
  timeScale: number;
}

export class UIControls {
  private gui: dat.GUI;
  private engine: SimulationEngine;
  private renderer: Renderer3D;
  private params: UIControlParams;
  private onClearTrailsCallbacks: (() => void)[] = [];

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
    this.setupPlanetClick();
  }

  private applyGlassStyle(): void {
    const dom = this.gui.domElement;
    dom.style.background = 'rgba(255, 255, 255, 0.08)';
    dom.style.backdropFilter = 'blur(8px)';
    (dom.style as any).webkitBackdropFilter = 'blur(8px)';
    dom.style.borderRadius = '12px';
    dom.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    dom.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    dom.style.overflow = 'hidden';
    dom.style.position = 'absolute';
    dom.style.top = '20px';
    dom.style.left = '20px';
    dom.style.fontFamily = "'Courier New', Consolas, Monaco, monospace";

    const style = document.createElement('style');
    style.textContent = `
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
        background: rgba(255, 255, 255, 0.06) !important;
        border-radius: 4px;
        height: 18px;
        margin-top: 4px;
        transition: all 0.2s ease;
      }
      .dg .c .slider:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .dg .c .slider-fg {
        background: linear-gradient(90deg, #4a4aff, #8080ff) !important;
        border-radius: 4px;
      }
      .dg .slider::-webkit-slider-thumb {
        background: #ffd700;
        box-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
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
          max-height: 45vh !important;
          overflow-y: auto !important;
          border-radius: 16px 16px 0 0 !important;
          border-top: 2px solid rgba(255, 215, 0, 0.3) !important;
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
        }
      }
    `;
    document.head.appendChild(style);
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
        this.renderer.updateInfoPanel(null);
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
        this.renderer.updateInfoPanel(null);
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

  private setupPlanetClick(): void {
    this.renderer.onPlanetClick((planetId) => {
      this.selectPlanet(planetId);
    });
  }

  private selectPlanet(planetId: string): void {
    this.renderer.setSelectedPlanet(planetId);
    const planet = this.engine.getPlanetById(planetId);
    if (planet) {
      this.renderer.updateInfoPanel(planet);
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

  update(): void {
    if (this.selectedPlanetId) {
      const planet = this.engine.getPlanetById(this.selectedPlanetId);
      if (planet) {
        this.renderer.updateInfoPanel(planet);
      }
    }
  }

  get selectedPlanetId(): string | null {
    return null;
  }

  dispose(): void {
    this.gui.destroy();
  }
}
