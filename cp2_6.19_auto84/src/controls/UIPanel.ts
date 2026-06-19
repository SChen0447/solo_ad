import * as dat from 'dat.gui';
import { ParticleSystem } from '../particle/ParticleSystem';
import { SceneManager } from '../scene/SceneManager';

export interface UIPanelCallbacks {
  onResetCamera: () => void;
  onTogglePause: (paused: boolean) => void;
}

export class UIPanel {
  private container: HTMLElement;
  private particleSystem: ParticleSystem;
  private sceneManager: SceneManager;
  private callbacks: UIPanelCallbacks;

  private gui: dat.GUI | null = null;
  private isPaused: boolean = false;

  private params = {
    density: 1.0,
    windSpeed: 8,
    windDirection: 45,
    turbulence: 0.3
  };

  private pauseButton: HTMLElement | null = null;
  private mobileToggle: HTMLElement | null = null;
  private closePanel: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;

  constructor(
    containerId: string,
    particleSystem: ParticleSystem,
    sceneManager: SceneManager,
    callbacks: UIPanelCallbacks
  ) {
    this.container = document.getElementById(containerId) || document.body;
    this.particleSystem = particleSystem;
    this.sceneManager = sceneManager;
    this.callbacks = callbacks;

    this.init();
  }

  private init(): void {
    this.setupMobileControls();
    this.setupCustomButtons();
    this.setupDatGUI();
    this.setupTooltipSystem();
    this.updatePauseButton();
  }

  private setupDatGUI(): void {
    this.gui = new dat.GUI({
      autoPlace: false,
      width: 260
    });

    const densityController = this.gui
      .add(this.params, 'density', 0.5, 2.0, 0.1)
      .name('沙尘密度')
      .onChange((value: number) => {
        this.particleSystem.setParams({ density: value });
      });

    const windSpeedController = this.gui
      .add(this.params, 'windSpeed', 0, 20, 0.5)
      .name('风速')
      .onChange((value: number) => {
        this.particleSystem.setParams({ windSpeed: value });
      });

    const windDirectionController = this.gui
      .add(this.params, 'windDirection', 0, 360, 1)
      .name('风向 (度)')
      .onChange((value: number) => {
        this.particleSystem.setParams({ windDirection: value });
      });

    const turbulenceController = this.gui
      .add(this.params, 'turbulence', 0, 1, 0.1)
      .name('湍流强度')
      .onChange((value: number) => {
        this.particleSystem.setParams({ turbulence: value });
      });

    this.container.appendChild(this.gui.domElement);

    const controllers = [
      { controller: densityController, tooltip: '控制沙尘粒子的数量，范围0.5-2.0' },
      { controller: windSpeedController, tooltip: '控制风速，范围0-20单位/秒' },
      { controller: windDirectionController, tooltip: '控制风向角度，0-360度' },
      { controller: turbulenceController, tooltip: '控制湍流强度，影响粒子路径随机性' }
    ];

    controllers.forEach(({ controller, tooltip }) => {
      const element = controller.domElement;
      element.setAttribute('data-tooltip', tooltip);
      element.classList.add('has-tooltip');
    });

    this.styleDatGUI();
  }

  private styleDatGUI(): void {
    if (!this.gui) return;

    const domElement = this.gui.domElement;
    domElement.style.background = 'transparent';
    domElement.style.marginTop = '10px';

    const style = document.createElement('style');
    style.textContent = `
      .has-tooltip {
        position: relative;
      }

      .has-tooltip::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-left: 10px;
        padding: 6px 10px;
        background: rgba(200, 200, 200, 0.95);
        color: #ffffff;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        border-radius: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease-out;
        z-index: 1000;
        max-width: 220px;
        white-space: normal;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .has-tooltip:hover::after {
        opacity: 1;
        transition-delay: 0.3s;
      }

      .dg .c .slider {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 4px;
      }

      .dg .c .slider:hover {
        background: rgba(255, 165, 0, 0.3) !important;
      }

      .dg .c .slider .slider-fg {
        background: rgba(255, 165, 0, 0.8) !important;
        border-radius: 4px;
      }

      .dg .c .slider .slider-handle {
        background: #666 !important;
        border-radius: 50% !important;
        width: 14px !important;
        height: 14px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        transition: all 0.15s !important;
      }

      .dg .c .slider .slider-handle:hover {
        background: #FFA500 !important;
        transform: translateY(-50%) scale(1.2) !important;
      }

      .dg .c .slider .slider-handle:active {
        background: white !important;
        transition: background 0.1s !important;
      }

      .dg .property-name {
        color: white !important;
        font-size: 13px !important;
        width: 45% !important;
      }

      .dg .c {
        width: 55% !important;
      }

      .dg .number-input input[type="text"] {
        color: #FFA500 !important;
        background: rgba(0, 0, 0, 0.3) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 3px !important;
        font-size: 12px !important;
      }

      .dg li:not(.folder) {
        background: transparent !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        height: 36px !important;
        line-height: 36px !important;
      }

      .dg.main .close-button {
        display: none !important;
      }

      .dg.main {
        width: 100% !important;
      }

      .dg.ac {
        position: relative !important;
        top: auto !important;
        right: auto !important;
        left: auto !important;
        bottom: auto !important;
        z-index: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  private setupTooltipSystem(): void {
    const buttons = document.querySelectorAll('button[data-tooltip], [title]');
    buttons.forEach(btn => {
      const tooltip = btn.getAttribute('title') || btn.getAttribute('data-tooltip');
      if (tooltip && !btn.classList.contains('has-tooltip')) {
        btn.setAttribute('data-tooltip', tooltip);
        btn.classList.add('has-tooltip');
        btn.removeAttribute('title');
      }
    });
  }

  private setupCustomButtons(): void {
    this.pauseButton = document.getElementById('toggle-pause');
    const resetButton = document.getElementById('reset-camera');
    this.controlPanel = document.getElementById('control-panel');

    if (resetButton) {
      resetButton.setAttribute('data-tooltip', '重置相机视角到初始位置');
      resetButton.classList.add('has-tooltip');
      resetButton.addEventListener('click', () => {
        this.callbacks.onResetCamera();
      });

      resetButton.addEventListener('mousedown', () => {
        resetButton.classList.add('btn-active');
        setTimeout(() => resetButton.classList.remove('btn-active'), 100);
      });
    }

    if (this.pauseButton) {
      this.pauseButton.setAttribute('data-tooltip', '暂停或继续粒子模拟');
      this.pauseButton.classList.add('has-tooltip');
      this.pauseButton.addEventListener('click', () => {
        this.togglePause();
      });

      this.pauseButton.addEventListener('mousedown', () => {
        this.pauseButton?.classList.add('btn-active');
        setTimeout(() => this.pauseButton?.classList.remove('btn-active'), 100);
      });
    }
  }

  private setupMobileControls(): void {
    this.mobileToggle = document.getElementById('mobile-toggle');
    this.closePanel = document.getElementById('close-panel');
    this.controlPanel = document.getElementById('control-panel');

    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => {
        this.controlPanel?.classList.add('mobile-open');
      });
    }

    if (this.closePanel) {
      this.closePanel.addEventListener('click', () => {
        this.controlPanel?.classList.remove('mobile-open');
      });
    }

    const checkMobile = () => {
      if (window.innerWidth <= 768) {
        this.controlPanel?.classList.remove('mobile-open');
      }
    };

    window.addEventListener('resize', checkMobile);
    checkMobile();
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.callbacks.onTogglePause(this.isPaused);
    this.updatePauseButton();
  }

  private updatePauseButton(): void {
    if (this.pauseButton) {
      this.pauseButton.textContent = this.isPaused ? '继续' : '暂停';
      if (this.isPaused) {
        this.pauseButton.classList.add('paused');
      } else {
        this.pauseButton.classList.remove('paused');
      }
    }
  }

  public getParams(): { density: number; windSpeed: number; windDirection: number; turbulence: number } {
    return { ...this.params };
  }

  public dispose(): void {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}
