import GUI from 'lil-gui';
import { RoadNetwork } from '../traffic/roadNetwork';
import { TrafficSimulation } from '../traffic/trafficSimulation';
import { HeatmapRenderer } from '../traffic/heatmap';
import type { SimulationStats, IntersectionConfig } from '../types';

export class ControlPanel {
  private roadNetwork: RoadNetwork;
  private trafficSimulation: TrafficSimulation;
  private heatmapRenderer: HeatmapRenderer;

  private gui: GUI | null = null;
  private mobileGui: GUI | null = null;
  private selectedIntersection: string | null = null;

  private timeSlider: HTMLInputElement | null = null;
  private mobileTimeSlider: HTMLInputElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private mobileTimeDisplay: HTMLElement | null = null;

  private statVehicles: HTMLElement | null = null;
  private statSpeed: HTMLElement | null = null;
  private statCongested: HTMLElement | null = null;
  private statFps: HTMLElement | null = null;

  private statsPanel: HTMLElement | null = null;
  private statsToggle: HTMLElement | null = null;
  private isStatsCollapsed: boolean = false;

  private isMobile: boolean = false;
  private mobileDrawer: HTMLElement | null = null;
  private mobileDrawerToggle: HTMLElement | null = null;
  private isDrawerOpen: boolean = false;
  private drawerTouchStartY: number = 0;
  private drawerCurrentTranslateY: number = 0;
  private drawerIsDragging: boolean = false;

  private onTimeChangeCallbacks: Array<(hour: number) => void> = [];
  private onIntersectionSelectCallbacks: Array<(id: string | null) => void> = [];

  private trafficFolder: GUI | null = null;
  private heatmapFolder: GUI | null = null;
  private intersectionFolder: GUI | null = null;
  private mobileTrafficFolder: GUI | null = null;
  private mobileHeatmapFolder: GUI | null = null;
  private mobileIntersectionFolder: GUI | null = null;

  private settings = {
    timeOfDay: 8,
    showHeatmap: true,
    leftTurnWaitTime: 2,
    minDensityThreshold: 0.2,
    maxDensityThreshold: 0.8,
    baseVehicleCount: 150,
    selectedIntersection: 'int_0_0',
    eastWestGreenDuration: 8,
    northSouthGreenDuration: 6,
    leftTurnGreenDuration: 4,
  };

  constructor(
    roadNetwork: RoadNetwork,
    trafficSimulation: TrafficSimulation,
    heatmapRenderer: HeatmapRenderer
  ) {
    this.roadNetwork = roadNetwork;
    this.trafficSimulation = trafficSimulation;
    this.heatmapRenderer = heatmapRenderer;

    this.checkMobile();
    this.initElements();
    this.initGUI();
    this.initEventListeners();
    this.initStatsPanelDrag();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      if (wasMobile !== this.isMobile) {
        this.handleLayoutChange();
      }
    });
  }

  private handleLayoutChange(): void {
    if (this.mobileDrawer) {
      this.mobileDrawer.classList.toggle('open', this.isDrawerOpen && this.isMobile);
    }
  }

  private initElements(): void {
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.mobileTimeSlider = document.getElementById('mobile-time-slider') as HTMLInputElement;
    this.timeDisplay = document.getElementById('time-display');
    this.mobileTimeDisplay = document.getElementById('mobile-time-display');

    this.statVehicles = document.getElementById('stat-vehicles');
    this.statSpeed = document.getElementById('stat-speed');
    this.statCongested = document.getElementById('stat-congested');
    this.statFps = document.getElementById('stat-fps');

    this.statsPanel = document.getElementById('stats-panel');
    this.statsToggle = document.getElementById('stats-toggle');

    this.mobileDrawer = document.getElementById('mobile-drawer');
    this.mobileDrawerToggle = document.getElementById('mobile-drawer-toggle');
  }

  private initGUI(): void {
    const container = document.getElementById('gui-container');
    const mobileContainer = document.getElementById('mobile-gui-container');

    if (container) {
      this.gui = new GUI({ container, autoPlace: false });
      this.gui.domElement.style.position = 'absolute';
      this.gui.domElement.style.top = '80px';
      this.gui.domElement.style.right = '16px';
      this.gui.domElement.style.zIndex = '99';
      this.setupFolders(this.gui, false);
    }

    if (mobileContainer) {
      this.mobileGui = new GUI({ container: mobileContainer, autoPlace: false });
      this.mobileGui.domElement.style.width = '100%';
      this.setupFolders(this.mobileGui, true);
    }

    this.updateSettingsFromSimulation();
  }

  private setupFolders(gui: GUI, isMobile: boolean): void {
    const trafficFolder = gui.addFolder('交通设置');
    trafficFolder.open();

    trafficFolder
      .add(this.settings, 'baseVehicleCount', 50, 1000, 10)
      .name('基础车辆数')
      .onChange((value: number) => {
        this.trafficSimulation.setConfig({ baseVehicleCount: value });
      });

    trafficFolder
      .add(this.settings, 'leftTurnWaitTime', 0, 10, 0.5)
      .name('左转等待时间(秒)')
      .onChange((value: number) => {
        this.trafficSimulation.setLeftTurnWaitTime(value);
      });

    const heatmapFolder = gui.addFolder('热力图设置');
    heatmapFolder.open();

    heatmapFolder
      .add(this.settings, 'showHeatmap')
      .name('显示热力图')
      .onChange((value: boolean) => {
        this.heatmapRenderer.setVisible(value);
      });

    heatmapFolder
      .add(this.settings, 'minDensityThreshold', 0, 1, 0.05)
      .name('畅通阈值')
      .onChange((value: number) => {
        this.settings.minDensityThreshold = value;
        this.heatmapRenderer.setDensityThresholds(
          this.settings.minDensityThreshold,
          this.settings.maxDensityThreshold
        );
        if (isMobile) {
          this.syncDesktopSettings();
        } else {
          this.syncMobileSettings();
        }
      });

    heatmapFolder
      .add(this.settings, 'maxDensityThreshold', 0, 1, 0.05)
      .name('拥堵阈值')
      .onChange((value: number) => {
        this.settings.maxDensityThreshold = value;
        this.heatmapRenderer.setDensityThresholds(
          this.settings.minDensityThreshold,
          this.settings.maxDensityThreshold
        );
        if (isMobile) {
          this.syncDesktopSettings();
        } else {
          this.syncMobileSettings();
        }
      });

    const intersectionFolder = gui.addFolder('路口信号灯');
    intersectionFolder.open();

    const intersectionIds = this.roadNetwork.getIntersectionIds();
    intersectionFolder
      .add(this.settings, 'selectedIntersection', intersectionIds)
      .name('选择路口')
      .onChange((value: string) => {
        this.selectIntersection(value);
        if (isMobile) {
          this.syncDesktopSettings();
        } else {
          this.syncMobileSettings();
        }
      });

    intersectionFolder
      .add(this.settings, 'eastWestGreenDuration', 2, 20, 1)
      .name('东西绿灯(秒)')
      .onChange((value: number) => {
        this.updateIntersectionConfig('eastWestGreenDuration', value);
      });

    intersectionFolder
      .add(this.settings, 'northSouthGreenDuration', 2, 20, 1)
      .name('南北绿灯(秒)')
      .onChange((value: number) => {
        this.updateIntersectionConfig('northSouthGreenDuration', value);
      });

    intersectionFolder
      .add(this.settings, 'leftTurnGreenDuration', 1, 15, 1)
      .name('左转绿灯(秒)')
      .onChange((value: number) => {
        this.updateIntersectionConfig('leftTurnGreenDuration', value);
      });

    if (isMobile) {
      this.mobileTrafficFolder = trafficFolder;
      this.mobileHeatmapFolder = heatmapFolder;
      this.mobileIntersectionFolder = intersectionFolder;
    } else {
      this.trafficFolder = trafficFolder;
      this.heatmapFolder = heatmapFolder;
      this.intersectionFolder = intersectionFolder;
    }
  }

  private syncMobileSettings(): void {
    if (!this.mobileGui) return;

    const controllers = this.mobileGui.controllersRecursive();
    controllers.forEach((ctrl: any) => {
      if (ctrl.property && this.settings.hasOwnProperty(ctrl.property)) {
        ctrl.setValue((this.settings as any)[ctrl.property]);
      }
    });
  }

  private syncDesktopSettings(): void {
    if (!this.gui) return;

    const controllers = this.gui.controllersRecursive();
    controllers.forEach((ctrl: any) => {
      if (ctrl.property && this.settings.hasOwnProperty(ctrl.property)) {
        ctrl.setValue((this.settings as any)[ctrl.property]);
      }
    });
  }

  private updateIntersectionConfig(key: keyof IntersectionConfig, value: number): void {
    const intersectionId = this.settings.selectedIntersection;
    if (!intersectionId) return;

    this.roadNetwork.setIntersectionConfig(intersectionId, {
      [key]: value,
    } as Partial<IntersectionConfig>);

    this.roadNetwork.forceRefreshAllLights();

    if (this.onIntersectionSelectCallbacks.length > 0) {
      this.onIntersectionSelectCallbacks.forEach((cb) => cb(intersectionId));
    }
  }

  private selectIntersection(id: string): void {
    this.selectedIntersection = id;
    this.settings.selectedIntersection = id;

    const intersection = this.roadNetwork.getIntersection(id);
    if (intersection) {
      this.settings.eastWestGreenDuration = intersection.config.eastWestGreenDuration;
      this.settings.northSouthGreenDuration = intersection.config.northSouthGreenDuration;
      this.settings.leftTurnGreenDuration = intersection.config.leftTurnGreenDuration;

      this.updateIntersectionControllers();
    }

    this.onIntersectionSelectCallbacks.forEach((cb) => cb(id));
  }

  private updateIntersectionControllers(): void {
    if (this.gui) {
      const controllers = this.gui.controllersRecursive();
      controllers.forEach((ctrl: any) => {
        if (ctrl.property === 'eastWestGreenDuration') {
          ctrl.setValue(this.settings.eastWestGreenDuration);
        }
        if (ctrl.property === 'northSouthGreenDuration') {
          ctrl.setValue(this.settings.northSouthGreenDuration);
        }
        if (ctrl.property === 'leftTurnGreenDuration') {
          ctrl.setValue(this.settings.leftTurnGreenDuration);
        }
      });
    }

    if (this.mobileGui) {
      const controllers = this.mobileGui.controllersRecursive();
      controllers.forEach((ctrl: any) => {
        if (ctrl.property === 'eastWestGreenDuration') {
          ctrl.setValue(this.settings.eastWestGreenDuration);
        }
        if (ctrl.property === 'northSouthGreenDuration') {
          ctrl.setValue(this.settings.northSouthGreenDuration);
        }
        if (ctrl.property === 'leftTurnGreenDuration') {
          ctrl.setValue(this.settings.leftTurnGreenDuration);
        }
      });
    }
  }

  private updateSettingsFromSimulation(): void {
    const config = this.trafficSimulation.getConfig();
    this.settings.baseVehicleCount = config.baseVehicleCount;
    this.settings.leftTurnWaitTime = config.leftTurnWaitTime;

    const heatmapConfig = this.heatmapRenderer.getConfig();
    this.settings.minDensityThreshold = heatmapConfig.minDensityThreshold;
    this.settings.maxDensityThreshold = heatmapConfig.maxDensityThreshold;

    this.settings.timeOfDay = 8;
  }

  private initEventListeners(): void {
    if (this.timeSlider) {
      this.timeSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.settings.timeOfDay = value;
        this.updateTimeDisplay(value);
        this.notifyTimeChange(value);
        if (this.mobileTimeSlider) {
          this.mobileTimeSlider.value = value.toString();
        }
      });
    }

    if (this.mobileTimeSlider) {
      this.mobileTimeSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.settings.timeOfDay = value;
        this.updateTimeDisplay(value);
        this.notifyTimeChange(value);
        if (this.timeSlider) {
          this.timeSlider.value = value.toString();
        }
      });
    }

    if (this.statsToggle && this.statsPanel) {
      this.statsToggle.addEventListener('click', () => {
        this.toggleStatsPanel();
      });
    }

    if (this.mobileDrawerToggle) {
      this.mobileDrawerToggle.addEventListener('click', () => {
        this.toggleMobileDrawer();
      });
    }

    if (this.mobileDrawer) {
      const handle = this.mobileDrawer.querySelector('.drawer-handle');
      if (handle) {
        handle.addEventListener('click', () => {
          this.toggleMobileDrawer();
        });
      }

      this.mobileDrawer.addEventListener('touchstart', (e: TouchEvent) => {
        if (!this.isDrawerOpen) return;
        this.drawerTouchStartY = e.touches[0].clientY;
        this.drawerCurrentTranslateY = 0;
        this.drawerIsDragging = true;
      }, { passive: true });

      this.mobileDrawer.addEventListener('touchmove', (e: TouchEvent) => {
        if (!this.drawerIsDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - this.drawerTouchStartY;

        if (deltaY > 0) {
          this.drawerCurrentTranslateY = deltaY;
          this.mobileDrawer!.style.transform = `translateY(${deltaY}px)`;
          this.mobileDrawer!.style.transition = 'none';
        }
      }, { passive: true });

      this.mobileDrawer.addEventListener('touchend', () => {
        if (!this.drawerIsDragging) return;
        this.drawerIsDragging = false;

        this.mobileDrawer!.style.transition = 'transform 0.3s ease';

        if (this.drawerCurrentTranslateY > 80) {
          this.closeMobileDrawer();
        } else {
          this.mobileDrawer!.style.transform = 'translateY(0)';
        }

        this.drawerCurrentTranslateY = 0;
      });
    }
  }

  private initStatsPanelDrag(): void {
    if (!this.statsPanel) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const header = this.statsPanel.querySelector('.stats-header') as HTMLElement;
    if (!header) return;

    header.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).id === 'stats-toggle') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.statsPanel!.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      this.statsPanel!.style.left = startLeft + 'px';
      this.statsPanel!.style.right = 'auto';
      this.statsPanel!.style.top = startTop + 'px';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      this.statsPanel!.style.left = (startLeft + dx) + 'px';
      this.statsPanel!.style.top = (startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartLeft = 0;
    let touchStartTop = 0;
    let isTouchDragging = false;

    header.addEventListener('touchstart', (e: TouchEvent) => {
      if ((e.target as HTMLElement).id === 'stats-toggle') return;
      isTouchDragging = true;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      const rect = this.statsPanel!.getBoundingClientRect();
      touchStartLeft = rect.left;
      touchStartTop = rect.top;

      this.statsPanel!.style.left = touchStartLeft + 'px';
      this.statsPanel!.style.right = 'auto';
      this.statsPanel!.style.top = touchStartTop + 'px';
    });

    document.addEventListener('touchmove', (e) => {
      if (!isTouchDragging) return;
      const touch = e.touches[0];

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      this.statsPanel!.style.left = (touchStartLeft + dx) + 'px';
      this.statsPanel!.style.top = (touchStartTop + dy) + 'px';
    });

    document.addEventListener('touchend', () => {
      isTouchDragging = false;
    });
  }

  private toggleStatsPanel(): void {
    this.isStatsCollapsed = !this.isStatsCollapsed;

    if (this.statsPanel) {
      this.statsPanel.classList.toggle('collapsed', this.isStatsCollapsed);
    }

    if (this.statsToggle) {
      this.statsToggle.textContent = this.isStatsCollapsed ? '+' : '−';
    }
  }

  private toggleMobileDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;

    if (this.mobileDrawer) {
      this.mobileDrawer.style.transition = 'transform 0.3s ease';
      this.mobileDrawer.classList.toggle('open', this.isDrawerOpen);
      if (!this.isDrawerOpen) {
        this.mobileDrawer.style.transform = 'translateY(100%)';
      } else {
        this.mobileDrawer.style.transform = 'translateY(0)';
      }
    }

    if (this.mobileDrawerToggle) {
      this.mobileDrawerToggle.textContent = this.isDrawerOpen ? '关闭面板' : '控制面板';
    }
  }

  private updateTimeDisplay(hour: number): void {
    const hours = Math.floor(hour);
    const minutes = Math.floor((hour % 1) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (this.timeDisplay) {
      this.timeDisplay.textContent = timeStr;
    }
    if (this.mobileTimeDisplay) {
      this.mobileTimeDisplay.textContent = timeStr;
    }
  }

  private notifyTimeChange(hour: number): void {
    this.onTimeChangeCallbacks.forEach((cb) => cb(hour));
  }

  updateStats(stats: SimulationStats): void {
    if (this.statVehicles) {
      this.statVehicles.textContent = stats.totalVehicles.toString();
    }
    if (this.statSpeed) {
      this.statSpeed.textContent = stats.averageSpeed.toFixed(1) + ' km/h';
    }
    if (this.statCongested) {
      this.statCongested.textContent = stats.congestedSegments.toString();
    }
    if (this.statFps) {
      this.statFps.textContent = Math.round(stats.fps).toString();
    }
  }

  onTimeChange(callback: (hour: number) => void): void {
    this.onTimeChangeCallbacks.push(callback);
  }

  onIntersectionSelect(callback: (id: string | null) => void): void {
    this.onIntersectionSelectCallbacks.push(callback);
  }

  setTimeOfDay(hour: number): void {
    this.settings.timeOfDay = hour;
    this.updateTimeDisplay(hour);

    if (this.timeSlider) {
      this.timeSlider.value = hour.toString();
    }
    if (this.mobileTimeSlider) {
      this.mobileTimeSlider.value = hour.toString();
    }
  }

  getSelectedIntersection(): string | null {
    return this.selectedIntersection;
  }

  setSelectedIntersection(id: string): void {
    this.settings.selectedIntersection = id;
    this.selectIntersection(id);
    this.syncMobileSettings();
    this.syncDesktopSettings();
  }

  isMobileLayout(): boolean {
    return this.isMobile;
  }

  show(): void {
    if (this.gui) {
      this.gui.domElement.style.display = '';
    }
  }

  hide(): void {
    if (this.gui) {
      this.gui.domElement.style.display = 'none';
    }
  }

  closeMobileDrawer(): void {
    if (this.isDrawerOpen) {
      this.isDrawerOpen = false;

      if (this.mobileDrawer) {
        this.mobileDrawer.style.transition = 'transform 0.3s ease';
        this.mobileDrawer.style.transform = 'translateY(100%)';
        this.mobileDrawer.classList.remove('open');
      }

      if (this.mobileDrawerToggle) {
        this.mobileDrawerToggle.textContent = '控制面板';
      }
    }
  }
}
