import * as dat from 'dat.gui';

export interface UIPanelParams {
  density: number;
  windSpeed: number;
  windDirection: number;
  turbulence: number;
  isPaused: boolean;
}

export interface UIPanelCallbacks {
  onDensityChange: (value: number) => void;
  onWindSpeedChange: (value: number) => void;
  onWindDirectionChange: (value: number) => void;
  onTurbulenceChange: (value: number) => void;
  onResetView: () => void;
  onPauseToggle: (isPaused: boolean) => void;
}

export class UIPanel {
  private gui: dat.GUI;
  private params: UIPanelParams;
  private callbacks: UIPanelCallbacks;
  private container: HTMLElement;
  private mobileToggle: HTMLButtonElement;
  private isMobile: boolean;
  private isPanelVisible: boolean = true;

  constructor(containerId: string, callbacks: UIPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById(containerId) || document.body;

    this.params = {
      density: 1.0,
      windSpeed: 8,
      windDirection: 45,
      turbulence: 0.3,
      isPaused: false
    };

    this.isMobile = window.innerWidth < 768;
    this.mobileToggle = this.createMobileToggle();

    this.gui = new dat.GUI({ autoPlace: false, width: 280 });
    this.setupGUI();
    this.styleGUI();

    if (this.isMobile) {
      this.isPanelVisible = false;
      this.gui.domElement.style.display = 'none';
    }

    this.container.appendChild(this.gui.domElement);

    this.setupEventListeners();
    this.setupTooltips();
  }

  private createMobileToggle(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'mobile-toggle';
    button.innerHTML = '⚙️';
    button.title = '控制面板';
    button.style.display = this.isMobile ? 'block' : 'none';
    button.setAttribute('aria-label', '打开控制面板');

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    document.body.appendChild(button);
    return button;
  }

  private togglePanel(): void {
    this.isPanelVisible = !this.isPanelVisible;
    
    const dom = this.gui.domElement;
    
    if (this.isMobile) {
      if (this.isPanelVisible) {
        dom.style.display = 'flex';
        dom.style.flexDirection = 'column';
        dom.style.alignItems = 'stretch';
        dom.style.justifyContent = 'flex-start';
        
        requestAnimationFrame(() => {
          dom.classList.add('panel-visible');
          dom.classList.remove('panel-hidden');
          dom.style.opacity = '1';
          dom.style.transform = 'translateY(0)';
        });
        
        document.body.style.overflow = 'hidden';
        this.mobileToggle.innerHTML = '✕';
        this.mobileToggle.setAttribute('aria-label', '关闭控制面板');
      } else {
        dom.classList.add('panel-hidden');
        dom.classList.remove('panel-visible');
        dom.style.opacity = '0';
        dom.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
          if (!this.isPanelVisible) {
            dom.style.display = 'none';
            document.body.style.overflow = '';
          }
        }, 300);
        
        this.mobileToggle.innerHTML = '⚙️';
        this.mobileToggle.setAttribute('aria-label', '打开控制面板');
      }
    } else {
      if (this.isPanelVisible) {
        dom.style.display = 'block';
        dom.classList.add('panel-visible');
        dom.classList.remove('panel-hidden');
      } else {
        dom.classList.add('panel-hidden');
        dom.classList.remove('panel-visible');
        setTimeout(() => {
          if (!this.isPanelVisible) {
            dom.style.display = 'none';
          }
        }, 300);
      }
    }
  }

  private setupGUI(): void {
    const dustFolder = this.gui.addFolder('沙尘参数');
    dustFolder.open();

    const paramsRecord = this.params as unknown as Record<string, unknown>;

    dustFolder
      .add(paramsRecord, 'density', 0.5, 2.0, 0.1)
      .name('沙尘密度')
      .onChange((value: number) => {
        this.params.density = value;
        this.callbacks.onDensityChange(value);
      })
      .listen();

    dustFolder
      .add(paramsRecord, 'windSpeed', 0, 20, 0.5)
      .name('风速')
      .onChange((value: number) => {
        this.params.windSpeed = value;
        this.callbacks.onWindSpeedChange(value);
      })
      .listen();

    dustFolder
      .add(paramsRecord, 'windDirection', 0, 360, 1)
      .name('风向 (度)')
      .onChange((value: number) => {
        this.params.windDirection = value;
        this.callbacks.onWindDirectionChange(value);
      })
      .listen();

    dustFolder
      .add(paramsRecord, 'turbulence', 0, 1, 0.1)
      .name('湍流强度')
      .onChange((value: number) => {
        this.params.turbulence = value;
        this.callbacks.onTurbulenceChange(value);
      })
      .listen();

    const controlFolder = this.gui.addFolder('视图控制');
    controlFolder.open();

    controlFolder
      .add({ reset: () => this.callbacks.onResetView() }, 'reset')
      .name('重置视角');

    controlFolder
      .add(paramsRecord, 'isPaused')
      .name('暂停')
      .onChange((value: boolean) => {
        this.params.isPaused = value;
        this.callbacks.onPauseToggle(value);
      })
      .listen();

    this.setupSliderInteraction();
  }

  private setupSliderInteraction(): void {
    const sliders = this.gui.domElement.querySelectorAll('.slider');
    
    sliders.forEach((slider) => {
      slider.addEventListener('mouseenter', () => {
        slider.classList.add('slider-hover');
      });

      slider.addEventListener('mouseleave', () => {
        slider.classList.remove('slider-hover');
      });

      slider.addEventListener('mousedown', () => {
        slider.classList.add('slider-active');
        slider.classList.remove('slider-hover');

        const handleMouseUp = () => {
          slider.classList.remove('slider-active');
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mouseup', handleMouseUp);
      });

      slider.addEventListener('touchstart', () => {
        slider.classList.add('slider-active');
      }, { passive: true });

      slider.addEventListener('touchend', () => {
        setTimeout(() => {
          slider.classList.remove('slider-active');
        }, 100);
      });
    });
  }

  private styleGUI(): void {
    const dom = this.gui.domElement;
    dom.style.position = 'fixed';
    dom.style.top = '20px';
    dom.style.left = '20px';
    dom.style.zIndex = '1000';
    dom.style.background = 'rgba(30, 30, 30, 0.8)';
    dom.style.backdropFilter = 'blur(8px)';
    (dom.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = 'blur(8px)';
    dom.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    dom.style.borderRadius = '12px';
    dom.style.overflow = 'hidden';
    dom.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    dom.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';

    if (this.isMobile) {
      dom.style.top = '0';
      dom.style.left = '0';
      dom.style.width = '100%';
      dom.style.height = '100%';
      dom.style.borderRadius = '0';
      dom.style.border = 'none';
      dom.style.overflowY = 'auto';
      dom.style.overflowX = 'hidden';
      dom.style.padding = '60px 20px 20px';
      dom.style.boxSizing = 'border-box';
      dom.style.background = 'rgba(20, 20, 20, 0.95)';
      dom.style.backdropFilter = 'blur(12px)';
      (dom.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = 'blur(12px)';
      dom.style.opacity = this.isPanelVisible ? '1' : '0';
      dom.style.transform = this.isPanelVisible ? 'translateY(0)' : 'translateY(-20px)';
    }

    this.addCustomStyles();
  }

  private addCustomStyles(): void {
    const styleId = 'dat-gui-custom-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .dg.ac {
        z-index: 1000 !important;
      }
      
      .dg.main {
        width: 100% !important;
      }
      
      .dg .c {
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 4px;
        margin: 2px 0;
      }
      
      .dg .slider {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      .dg .slider-fg {
        background: #FFA500 !important;
        border-radius: 4px;
        transition: background 0.2s ease, transform 0.1s ease;
      }
      
      .dg .slider:hover .slider-fg,
      .dg .slider.slider-hover .slider-fg {
        background: #FFB733 !important;
      }
      
      .dg .slider:active .slider-fg,
      .dg .slider.slider-active .slider-fg {
        background: #FFFFFF !important;
        transition: background 0.1s ease;
      }
      
      .dg .c input[type=text] {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #fff !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 4px;
      }
      
      .dg .c input[type=text]:focus {
        border-color: #FFA500 !important;
        outline: none;
      }
      
      .dg .property-name {
        color: #fff !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
      }
      
      .dg .title {
        background: rgba(0, 0, 0, 0.3) !important;
        color: #fff !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        font-size: 14px;
        padding: 8px 12px !important;
      }
      
      .dg .folder .title {
        background: rgba(255, 255, 255, 0.05) !important;
      }
      
      .dg li:not(.folder) {
        background: transparent !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }
      
      .dg .button {
        background: rgba(255, 165, 0, 0.2) !important;
        color: #FFA500 !important;
        border: 1px solid rgba(255, 165, 0, 0.4) !important;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .dg .button:hover {
        background: rgba(255, 165, 0, 0.3) !important;
        border-color: #FFA500 !important;
        transform: translateY(-1px);
      }
      
      .dg .button:active {
        transform: translateY(0);
      }
      
      .dg .has-checkbox .c {
        background: transparent !important;
      }
      
      .dg .checkbox {
        background: rgba(255, 255, 255, 0.2) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 3px;
      }
      
      .dg .checkbox.checked {
        background: #FFA500 !important;
        border-color: #FFA500 !important;
      }
      
      .dg .close-button {
        color: rgba(255, 255, 255, 0.7) !important;
      }
      
      .dg .close-button:hover {
        color: #fff !important;
      }
      
      .dg .drag-thingy {
        background: rgba(255, 255, 255, 0.3) !important;
      }
      
      .dg .cr.boolean .c {
        background: transparent !important;
      }
      
      .dg .cr.number input[type=text] {
        width: 50px !important;
      }
      
      .mobile-toggle {
        display: none;
        position: fixed;
        top: 20px;
        left: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(30, 30, 30, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        z-index: 999;
        transition: all 0.2s ease;
      }
      
      .mobile-toggle:hover {
        background: rgba(255, 165, 0, 0.3);
        border-color: #FFA500;
      }
      
      @media (max-width: 768px) {
        .mobile-toggle {
          display: block;
        }
        
        .dg.ac {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 1000 !important;
        }
        
        .dg.main {
          width: 100% !important;
          max-width: 100% !important;
          padding: 20px !important;
          box-sizing: border-box !important;
        }
        
        .dg .cr {
          padding: 6px 4px !important;
        }
        
        .dg .property-name {
          font-size: 14px !important;
          width: 45% !important;
        }
        
        .dg .c {
          width: 55% !important;
        }
        
        .dg .slider {
          height: 20px !important;
        }
        
        .dg .title {
          font-size: 16px !important;
          padding: 12px 16px !important;
        }
        
        .dg .button {
          padding: 12px !important;
          font-size: 16px !important;
          margin-top: 8px !important;
        }
      }
      
      .info-label {
        position: absolute;
        background: rgba(255, 255, 255, 0.95);
        color: #333;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
        pointer-events: none;
        z-index: 100;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        white-space: nowrap;
      }
      
      .info-label::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid rgba(255, 255, 255, 0.95);
      }
      
      .tooltip {
        position: absolute;
        background: rgba(50, 50, 50, 0.9);
        color: #fff;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: none;
        z-index: 2000;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .tooltip.visible {
        opacity: 1;
      }
    `;

    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;

      if (wasMobile !== this.isMobile) {
        this.mobileToggle.style.display = this.isMobile ? 'block' : 'none';
        
        if (this.isMobile) {
          this.isPanelVisible = false;
          this.gui.domElement.style.display = 'none';
          document.body.style.overflow = '';
          this.mobileToggle.innerHTML = '⚙️';
        } else {
          this.isPanelVisible = true;
          this.gui.domElement.style.display = 'block';
          this.gui.domElement.style.top = '20px';
          this.gui.domElement.style.left = '20px';
          this.gui.domElement.style.width = '280px';
          this.gui.domElement.style.height = 'auto';
          this.gui.domElement.style.padding = '0';
          document.body.style.overflow = '';
        }
        
        this.styleGUI();
      }
    });

    if (this.isMobile) {
      this.setupMobileCloseHandler();
    }
  }

  private setupMobileCloseHandler(): void {
    const dom = this.gui.domElement;
    
    dom.addEventListener('click', (e) => {
      if (e.target === dom && this.isPanelVisible) {
        this.togglePanel();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isPanelVisible && this.isMobile) {
        this.togglePanel();
      }
    });
  }

  private setupTooltips(): void {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    let tooltipTimeout: number | null = null;

    const showTooltip = (text: string, x: number, y: number) => {
      tooltip.textContent = text;
      tooltip.style.left = `${x + 10}px`;
      tooltip.style.top = `${y + 10}px`;
      
      tooltipTimeout = window.setTimeout(() => {
        tooltip.classList.add('visible');
      }, 300);
    };

    const hideTooltip = () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      tooltip.classList.remove('visible');
    };

    const rows = this.gui.domElement.querySelectorAll('.cr');
    const tooltipTexts = [
      '调整场景中沙尘粒子的数量密度',
      '控制沙尘流动的整体速度',
      '设置沙尘流动的水平方向角度',
      '增加粒子运动的随机性和紊乱程度',
      '将相机恢复到初始视角位置',
      '暂停或继续粒子动画'
    ];

    rows.forEach((row, index) => {
      if (index < tooltipTexts.length) {
        row.addEventListener('mouseenter', () => {
          const rect = row.getBoundingClientRect();
          showTooltip(tooltipTexts[index], rect.right, rect.top + rect.height / 2);
        });

        row.addEventListener('mouseleave', () => {
          hideTooltip();
        });

        row.addEventListener('mousemove', (e: Event) => {
          const mouseEvent = e as MouseEvent;
          if (tooltip.classList.contains('visible')) {
            tooltip.style.left = `${mouseEvent.clientX + 10}px`;
            tooltip.style.top = `${mouseEvent.clientY + 10}px`;
          }
        });
      }
    });
  }

  public getParams(): UIPanelParams {
    return { ...this.params };
  }

  public setParams(params: Partial<UIPanelParams>): void {
    Object.assign(this.params, params);
    
    Object.keys(params).forEach((key) => {
      const controller = this.gui.__controllers.find(
        (c) => c.property === key
      );
      if (controller) {
        controller.updateDisplay();
      }
    });
  }

  public dispose(): void {
    this.gui.destroy();
    if (this.mobileToggle.parentNode) {
      this.mobileToggle.parentNode.removeChild(this.mobileToggle);
    }
  }
}

export default UIPanel;
