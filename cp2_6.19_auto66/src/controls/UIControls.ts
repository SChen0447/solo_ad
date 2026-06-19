import * as dat from 'dat.gui';
import { SimulationEngine } from '../SimulationEngine';
import { Renderer3D } from '../Renderer3D';

export class UIControls {
  private gui: dat.GUI;
  private engine: SimulationEngine;
  private renderer: Renderer3D;

  private params = {
    G: 1,
    velocityMultiplier: 1,
    timeScale: 1
  };

  private mobilePanelOpen: boolean = false;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private panelStartY: number = 0;

  constructor(engine: SimulationEngine, renderer: Renderer3D) {
    this.engine = engine;
    this.renderer = renderer;

    this.gui = new dat.GUI({
      name: '控制面板',
      closed: false,
      autoPlace: false
    });

    this.setupGUIPanel();
    this.setupSliders();
    this.setupKeyboardControls();
    this.setupPlanetClickHandler();
    this.setupMobileResponsive();
  }

  private setupGUIPanel(): void {
    const guiDom = this.gui.domElement;
    guiDom.style.position = 'absolute';
    guiDom.style.top = '20px';
    guiDom.style.left = '20px';
    guiDom.style.zIndex = '100';
    guiDom.style.borderRadius = '12px';
    guiDom.style.overflow = 'hidden';
    guiDom.style.background = 'rgba(30, 30, 60, 0.6)';
    guiDom.style.backdropFilter = 'blur(8px)';
    (guiDom.style as any).webkitBackdropFilter = 'blur(8px)';
    guiDom.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    guiDom.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    guiDom.style.transition = 'all 0.3s ease';
    guiDom.id = 'control-panel';

    document.body.appendChild(guiDom);
  }

  private setupSliders(): void {
    const gFolder = this.gui.addFolder('引力参数');
    gFolder.open();

    const gController = gFolder
      .add(this.params, 'G', 0.1, 10)
      .name('引力常数 G')
      .step(0.1)
      .onChange((value: number) => {
        this.engine.setG(value);
      });

    const velController = gFolder
      .add(this.params, 'velocityMultiplier', 0.5, 2)
      .name('速度倍率')
      .step(0.1)
      .onChange((value: number) => {
        this.engine.setVelocityMultiplier(value);
      });

    const timeController = gFolder
      .add(this.params, 'timeScale', 0.1, 5)
      .name('时间流速')
      .step(0.1)
      .onChange((value: number) => {
        this.engine.setTimeScale(value);
      });

    this.addSliderValueDisplay(gController, 'G');
    this.addSliderValueDisplay(velController, 'VM');
    this.addSliderValueDisplay(timeController, 'TS');
  }

  private addSliderValueDisplay(
    controller: dat.GUIController,
    _label: string
  ): void {
    const dom = controller.domElement;
    const slider = dom.querySelector('.slider') as HTMLElement;
    if (!slider) return;

    const valueDisplay = document.createElement('div');
    valueDisplay.style.cssText = `
      position: absolute;
      right: -45px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(100, 150, 255, 0.8);
      color: white;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      pointer-events: none;
      min-width: 32px;
      text-align: center;
      transition: all 0.2s ease;
    `;

    slider.parentElement!.style.position = 'relative';
    slider.parentElement!.appendChild(valueDisplay);

    const updateValue = () => {
      const value = controller.getValue() as number;
      valueDisplay.textContent = value.toFixed(1);
    };

    controller.onChange(updateValue);
    controller.onFinishChange(updateValue);
    updateValue();
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        this.engine.selectPlanetByIndex(index);
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.renderer.startFadeAllTrails();
      }
    });
  }

  private setupPlanetClickHandler(): void {
    this.renderer.onPlanetClick((id: string) => {
      const currentSelected = this.engine.getSelectedPlanet();
      if (currentSelected && currentSelected.id === id) {
        this.engine.selectPlanet(null);
      } else {
        this.engine.selectPlanet(id);
      }
    });
  }

  private setupMobileResponsive(): void {
    const handleMediaQuery = () => {
      const guiDom = this.gui.domElement;
      const mobileHandle = document.getElementById('mobile-handle');

      if (window.innerWidth < 768) {
        guiDom.style.position = 'fixed';
        guiDom.style.left = '0';
        guiDom.style.right = '0';
        guiDom.style.bottom = this.mobilePanelOpen ? '0' : '-280px';
        guiDom.style.top = 'auto';
        guiDom.style.width = '100%';
        guiDom.style.maxHeight = '280px';
        guiDom.style.overflowY = 'auto';
        guiDom.style.borderRadius = '16px 16px 0 0';
        guiDom.style.transition = 'bottom 0.3s ease';

        if (mobileHandle) {
          mobileHandle.classList.remove('hidden');
        }
      } else {
        guiDom.style.position = 'absolute';
        guiDom.style.left = '20px';
        guiDom.style.top = '20px';
        guiDom.style.bottom = 'auto';
        guiDom.style.right = 'auto';
        guiDom.style.width = 'auto';
        guiDom.style.maxHeight = 'none';

        if (mobileHandle) {
          mobileHandle.classList.add('hidden');
        }
      }
    };

    handleMediaQuery();
    window.addEventListener('resize', handleMediaQuery);

    this.setupMobileDragHandle();
  }

  private setupMobileDragHandle(): void {
    const handle = document.getElementById('mobile-handle');
    const guiDom = this.gui.domElement;
    if (!handle) return;

    handle.addEventListener('touchstart', (e: TouchEvent) => {
      this.isDragging = true;
      this.dragStartY = e.touches[0].clientY;
      const bottomStr = guiDom.style.bottom || '0px';
      this.panelStartY = parseInt(bottomStr);
    });

    handle.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();

      const deltaY = e.touches[0].clientY - this.dragStartY;
      const newBottom = Math.min(0, Math.max(-280, this.panelStartY - deltaY));
      guiDom.style.bottom = newBottom + 'px';
      guiDom.style.transition = 'none';
    });

    handle.addEventListener('touchend', () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const bottomStr = guiDom.style.bottom || '0px';
      const currentBottom = parseInt(bottomStr);
      guiDom.style.transition = 'bottom 0.3s ease';

      if (currentBottom > -140) {
        guiDom.style.bottom = '0px';
        this.mobilePanelOpen = true;
      } else {
        guiDom.style.bottom = '-280px';
        this.mobilePanelOpen = false;
      }
    });

    handle.addEventListener('click', () => {
      this.mobilePanelOpen = !this.mobilePanelOpen;
      guiDom.style.bottom = this.mobilePanelOpen ? '0' : '-280px';
    });
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
