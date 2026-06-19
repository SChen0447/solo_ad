import * as dat from 'dat.gui';
import type { SimulationEngine } from '../SimulationEngine';
import type { Renderer3D } from '../Renderer3D';

interface ControlParams extends Record<string, unknown> {
  G: number;
  velocityMultiplier: number;
  timeScale: number;
}

export class UIControls {
  private engine: SimulationEngine;
  private renderer: Renderer3D;
  private gui: dat.GUI;
  private params: ControlParams;
  private floatLabels: Map<string, HTMLElement> = new Map();

  private isMobile: boolean = false;
  private drawerHandle: HTMLElement | null = null;
  private drawerDragging: boolean = false;
  private drawerStartY: number = 0;
  private drawerStartHeight: number = 0;

  constructor(engine: SimulationEngine, renderer: Renderer3D) {
    this.engine = engine;
    this.renderer = renderer;

    this.params = {
      G: engine.params.G,
      velocityMultiplier: engine.params.velocityMultiplier,
      timeScale: engine.params.timeScale
    };

    this.gui = new dat.GUI({ width: 320 } as dat.GUIParams);
    (this.gui as any).title = '控制面板';
    this.gui.domElement.classList.add('glass-panel');
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.left = '20px';
    this.gui.domElement.style.zIndex = '100';

    this.styleGUIPanel();
    this.setupSliders();
    this.setupButtons();
    this.setupKeyboardEvents();
    this.setupPlanetClick();
    this.checkResponsive();

    window.addEventListener('resize', this.checkResponsive);
  }

  private styleGUIPanel(): void {
    this.gui.domElement.style.background = 'rgba(255, 255, 255, 0.08)';
    (this.gui.domElement.style as any).backdropFilter = 'blur(8px)';
    (this.gui.domElement.style as any).webkitBackdropFilter = 'blur(8px)';
    this.gui.domElement.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    this.gui.domElement.style.borderRadius = '12px';
    this.gui.domElement.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
    this.gui.domElement.style.overflow = 'hidden';

    const liElements = this.gui.domElement.querySelectorAll('.c');
    liElements.forEach((el) => {
      (el as HTMLElement).style.position = 'relative';
    });
  }

  private createFloatLabel(controller: dat.GUIController, label: string): HTMLElement {
    const container = controller.domElement.parentElement;
    if (!container) return document.createElement('div');

    const existing = container.querySelector(`.slider-float-label-${label}`);
    if (existing) {
      return existing as HTMLElement;
    }

    const floatLabel = document.createElement('div');
    floatLabel.className = `slider-float-label slider-float-label-${label}`;
    container.style.position = 'relative';
    container.appendChild(floatLabel);
    this.floatLabels.set(label, floatLabel);
    return floatLabel;
  }

  private updateFloatLabel(label: string, value: number, suffix: string = ''): void {
    const el = this.floatLabels.get(label);
    if (el) {
      el.textContent = `${value.toFixed(2)}${suffix}`;
    }
  }

  private setupSliders(): void {
    const gFolder = this.gui.addFolder('引力参数');
    gFolder.open();

    const gController = gFolder.add(this.params, 'G', 0.1, 10, 0.1)
      .name('引力常数 G')
      .onChange((value: number) => {
        this.engine.setParam('G', value);
        this.updateFloatLabel('G', value);
      });
    const gLabel = this.createFloatLabel(gController, 'G');
    gLabel.textContent = `${this.params.G.toFixed(2)}`;

    const velController = gFolder.add(this.params, 'velocityMultiplier', 0.5, 2, 0.05)
      .name('初始速度倍率')
      .onChange((value: number) => {
        this.engine.setParam('velocityMultiplier', value);
        this.updateFloatLabel('vel', value, 'x');
      });
    const velLabel = this.createFloatLabel(velController, 'vel');
    velLabel.textContent = `${this.params.velocityMultiplier.toFixed(2)}x`;

    const timeController = gFolder.add(this.params, 'timeScale', 0.1, 5, 0.1)
      .name('时间流速')
      .onChange((value: number) => {
        this.engine.setParam('timeScale', value);
        this.updateFloatLabel('time', value, 'x');
      });
    const timeLabel = this.createFloatLabel(timeController, 'time');
    timeLabel.textContent = `${this.params.timeScale.toFixed(2)}x`;
  }

  private setupButtons(): void {
    const actionFolder = this.gui.addFolder('操作');
    actionFolder.open();

    const clearObj = {
      clearTrajectories: () => {
        this.renderer.startTrajectoryFade();
      }
    };

    actionFolder.add(clearObj, 'clearTrajectories').name('清除轨迹 (空格)');
  }

  private setupKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.renderer.startTrajectoryFade();
      }
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        this.engine.selectPlanetByIndex(index);
      }
      if (e.key === 'Escape') {
        this.engine.selectPlanet(null);
      }
    });
  }

  private setupPlanetClick(): void {
    this.renderer.setOnPlanetClick((planetId: number) => {
      const currentSelected = this.engine.getSelectedPlanet();
      if (currentSelected && currentSelected.id === planetId) {
        this.engine.selectPlanet(null);
      } else {
        this.engine.selectPlanet(planetId);
      }
    });
  }

  private checkResponsive = (): void => {
    const width = window.innerWidth;
    const wasMobile = this.isMobile;
    this.isMobile = width < 768;

    if (this.isMobile !== wasMobile) {
      this.applyResponsiveLayout();
    }
  };

  private applyResponsiveLayout(): void {
    if (this.isMobile) {
      this.gui.domElement.style.top = 'auto';
      this.gui.domElement.style.left = '0';
      this.gui.domElement.style.right = '0';
      this.gui.domElement.style.bottom = '0';
      this.gui.domElement.style.width = '100%';
      this.gui.domElement.style.maxWidth = '100%';
      this.gui.domElement.style.maxHeight = '40vh';
      this.gui.domElement.style.borderRadius = '12px 12px 0 0';
      this.addDrawerHandle();
    } else {
      this.gui.domElement.style.top = '20px';
      this.gui.domElement.style.left = '20px';
      this.gui.domElement.style.bottom = 'auto';
      this.gui.domElement.style.right = 'auto';
      this.gui.domElement.style.width = '320px';
      this.gui.domElement.style.maxWidth = '';
      this.gui.domElement.style.maxHeight = '';
      this.gui.domElement.style.borderRadius = '12px';
      this.gui.domElement.style.height = 'auto';
      this.removeDrawerHandle();
    }
  }

  private addDrawerHandle(): void {
    if (this.drawerHandle) return;

    this.drawerHandle = document.createElement('div');
    this.drawerHandle.style.cssText = `
      width: 100%;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      user-select: none;
      touch-action: none;
    `;

    const handleIcon = document.createElement('div');
    handleIcon.style.cssText = `
      width: 40px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    `;
    this.drawerHandle.appendChild(handleIcon);

    this.gui.domElement.insertBefore(this.drawerHandle, this.gui.domElement.firstChild);

    this.drawerHandle.addEventListener('pointerdown', this.onDrawerDragStart);
  }

  private removeDrawerHandle(): void {
    if (this.drawerHandle) {
      this.drawerHandle.removeEventListener('pointerdown', this.onDrawerDragStart);
      if (this.drawerHandle.parentNode) {
        this.drawerHandle.parentNode.removeChild(this.drawerHandle);
      }
      this.drawerHandle = null;
    }
    document.removeEventListener('pointermove', this.onDrawerDragMove);
    document.removeEventListener('pointerup', this.onDrawerDragEnd);
    this.drawerDragging = false;
  }

  private onDrawerDragStart = (e: PointerEvent): void => {
    e.preventDefault();
    this.drawerDragging = true;
    this.drawerStartY = e.clientY;
    const rect = this.gui.domElement.getBoundingClientRect();
    this.drawerStartHeight = rect.height;
    if (this.drawerHandle) {
      this.drawerHandle.style.cursor = 'grabbing';
    }
    document.addEventListener('pointermove', this.onDrawerDragMove);
    document.addEventListener('pointerup', this.onDrawerDragEnd);
  };

  private onDrawerDragMove = (e: PointerEvent): void => {
    if (!this.drawerDragging) return;
    const deltaY = this.drawerStartY - e.clientY;
    const newHeight = Math.min(
      Math.max(this.drawerStartHeight + deltaY, 80),
      window.innerHeight * 0.7
    );
    this.gui.domElement.style.height = `${newHeight}px`;
  };

  private onDrawerDragEnd = (): void => {
    this.drawerDragging = false;
    if (this.drawerHandle) {
      this.drawerHandle.style.cursor = 'grab';
    }
    document.removeEventListener('pointermove', this.onDrawerDragMove);
    document.removeEventListener('pointerup', this.onDrawerDragEnd);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.checkResponsive);
    this.removeDrawerHandle();
    this.gui.destroy();
  }
}
