import type { Exhibit, TourRoute, TourStats, PathPoint, Vector3 } from './types';
import { dataManager } from './dataManager';
import { pathEngine } from './pathEngine';
import { sceneManager } from './sceneManager';
import './uiComponents';

export class UIManager {
  private sidebar: HTMLElement | null = null;
  private exhibitList: HTMLElement | null = null;
  private statsPanel: HTMLElement | null = null;
  private audioWaveform: HTMLElement | null = null;
  private exhibitPopup: HTMLElement | null = null;
  private routeControls: HTMLElement | null = null;
  private previewProgress: HTMLElement | null = null;
  private museumTitle: HTMLElement | null = null;
  private fpsCounter: HTMLElement | null = null;

  private currentRoute: TourRoute | null = null;
  private isPreviewMode: boolean = false;
  private isEditMode: boolean = false;
  private selectedExhibitId: string | null = null;
  private fpsUpdateInterval: number = 0;

  constructor() {
    this.setupUIElements();
    this.setupEventListeners();
    this.updateStats();
  }

  private setupUIElements(): void {
    this.sidebar = document.createElement('museum-sidebar');
    this.sidebar.id = 'museum-sidebar';
    document.body.appendChild(this.sidebar);

    this.exhibitList = document.createElement('exhibit-list');
    this.sidebar.appendChild(this.exhibitList);

    const spacer1 = document.createElement('div');
    spacer1.style.height = '15px';
    this.sidebar.appendChild(spacer1);

    this.routeControls = document.createElement('route-controls');
    this.sidebar.appendChild(this.routeControls);

    const spacer2 = document.createElement('div');
    spacer2.style.height = '15px';
    this.sidebar.appendChild(spacer2);

    this.statsPanel = document.createElement('stats-panel');
    this.sidebar.appendChild(this.statsPanel);

    const spacer3 = document.createElement('div');
    spacer3.style.height = '15px';
    this.sidebar.appendChild(spacer3);

    this.audioWaveform = document.createElement('audio-waveform');
    this.sidebar.appendChild(this.audioWaveform);

    this.exhibitPopup = document.createElement('exhibit-popup');
    document.body.appendChild(this.exhibitPopup);

    this.museumTitle = document.createElement('museum-title');
    document.body.appendChild(this.museumTitle);

    this.fpsCounter = document.createElement('fps-counter');
    document.body.appendChild(this.fpsCounter);

    this.previewProgress = document.createElement('preview-progress');
    this.previewProgress.style.display = 'none';
    document.body.appendChild(this.previewProgress);
  }

  private setupEventListeners(): void {
    this.exhibitList?.addEventListener('select', ((e: CustomEvent) => {
      const { exhibitId } = e.detail;
      this.selectExhibit(exhibitId);
    }) as EventListener);

    this.exhibitPopup?.addEventListener('close', () => {
      this.closeExhibitPopup();
    });

    this.exhibitPopup?.addEventListener('select-related', ((e: CustomEvent) => {
      const { exhibitId } = e.detail;
      this.selectExhibit(exhibitId);
    }) as EventListener);

    this.routeControls?.addEventListener('generate', () => {
      this.generateRoute();
    });

    this.routeControls?.addEventListener('edit', () => {
      this.toggleEditMode();
    });

    this.routeControls?.addEventListener('preview', () => {
      this.startPreview();
    });

    this.routeControls?.addEventListener('export', () => {
      this.exportRoute();
    });

    this.previewProgress?.addEventListener('close', () => {
      this.stopPreview();
    });

    this.sidebar?.addEventListener('toggle', ((e: CustomEvent) => {
      const { collapsed } = e.detail;
      this.adjustSceneForSidebar(collapsed);
    }) as EventListener);

    if (sceneManager) {
      sceneManager.setOnExhibitClick((exhibit: Exhibit) => {
        this.showExhibitPopup(exhibit);
      });

      sceneManager.setOnFloorClick((position: Vector3, zoneId: string) => {
        if (this.isEditMode) {
          // 可以在这里添加控制点
        }
      });
    }

    dataManager.subscribe(() => {
      this.updateStats();
    });
  }

  private selectExhibit(exhibitId: string): void {
    const exhibit = dataManager.getExhibitById(exhibitId);
    if (!exhibit) return;

    this.selectedExhibitId = exhibitId;
    this.showExhibitPopup(exhibit);

    if (sceneManager) {
      sceneManager.highlightExhibit(exhibitId, true);
    }
  }

  private showExhibitPopup(exhibit: Exhibit): void {
    if (this.exhibitPopup) {
      (this.exhibitPopup as any).setExhibit(exhibit);
      
      if (this.audioWaveform) {
        (this.audioWaveform as any).setText(exhibit.audioText);
      }
    }
  }

  private closeExhibitPopup(): void {
    if (this.exhibitPopup) {
      (this.exhibitPopup as any).setExhibit(null);
    }

    if (this.selectedExhibitId && sceneManager) {
      sceneManager.highlightExhibit(this.selectedExhibitId, false);
      this.selectedExhibitId = null;
    }
  }

  private generateRoute(): void {
    if (!this.routeControls || !sceneManager) return;

    const startZoneId = (this.routeControls as any).getStartZone();
    const endZoneId = (this.routeControls as any).getEndZone();

    const startZone = dataManager.getZoneById(startZoneId);
    const endZone = dataManager.getZoneById(endZoneId);

    if (!startZone || !endZone) return;

    const startX = (startZone.bounds.minX + startZone.bounds.maxX) / 2;
    const startZ = (startZone.bounds.minZ + startZone.bounds.maxZ) / 2;
    const endX = (endZone.bounds.minX + endZone.bounds.maxX) / 2;
    const endZ = (endZone.bounds.minZ + endZone.bounds.maxZ) / 2;

    const rawPath = pathEngine.findPath(startX, startZ, endX, endZ);
    
    if (rawPath.length === 0) {
      console.warn('无法找到路径');
      return;
    }

    const smoothedPath = pathEngine.smoothPath(rawPath, 3);

    const exhibits = dataManager.getExhibits();
    const routeExhibitIds: string[] = [];

    for (const exhibit of exhibits) {
      let minDist = Infinity;
      for (const point of smoothedPath) {
        const dx = exhibit.position.x - point.x;
        const dz = exhibit.position.z - point.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        minDist = Math.min(minDist, dist);
      }
      if (minDist < 5) {
        routeExhibitIds.push(exhibit.id);
      }
    }

    const controlPoints = pathEngine.getPathControlPoints(smoothedPath, 3);

    const route: TourRoute = {
      id: `route-${Date.now()}`,
      name: '自定义导览路线',
      startZoneId,
      endZoneId,
      exhibitIds: routeExhibitIds,
      pathPoints: smoothedPath,
      controlPoints
    };

    this.currentRoute = route;
    dataManager.setCurrentRoute(route);

    sceneManager.setPath(smoothedPath);

    this.updateStats();
    this.updatePreviewExhibits();
  }

  private toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    
    if (this.routeControls) {
      (this.routeControls as any).setMode(this.isEditMode ? 'edit' : 'idle');
    }
  }

  private startPreview(): void {
    if (!this.currentRoute || !sceneManager) return;

    this.isPreviewMode = true;
    this.isEditMode = false;

    const sidebar = document.getElementById('museum-sidebar');
    if (sidebar) {
      sidebar.style.opacity = '0';
      sidebar.style.pointerEvents = 'none';
      sidebar.style.transition = 'opacity 0.3s ease';
    }

    if (this.museumTitle) {
      this.museumTitle.style.opacity = '0';
      (this.museumTitle as HTMLElement).style.pointerEvents = 'none';
      this.museumTitle.style.transition = 'opacity 0.3s ease';
    }

    if (this.previewProgress) {
      this.previewProgress.style.display = 'block';
    }

    if (this.audioWaveform) {
      (this.audioWaveform as any).play();
    }

    const exhibits = this.currentRoute.exhibitIds
      .map(id => dataManager.getExhibitById(id))
      .filter((e): e is Exhibit => e !== undefined);

    if (this.previewProgress) {
      (this.previewProgress as any).setExhibits(exhibits);
    }

    sceneManager.startPreview(this.currentRoute.exhibitIds);

    this.startPreviewProgressUpdate();
  }

  private startPreviewProgressUpdate(): void {
    const updateProgress = () => {
      if (!this.isPreviewMode || !sceneManager || !this.currentRoute) return;

      const index = sceneManager.getPreviewIndex();
      
      if (this.previewProgress) {
        (this.previewProgress as any).setCurrentIndex(index);
      }

      const exhibit = dataManager.getExhibitById(this.currentRoute.exhibitIds[index]);
      if (exhibit && this.audioWaveform) {
        (this.audioWaveform as any).setText(exhibit.audioText);
        (this.audioWaveform as any).setProgress(0.5);
      }

      if (sceneManager.getIsPreviewMode()) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }

  private stopPreview(): void {
    this.isPreviewMode = false;

    if (sceneManager) {
      sceneManager.stopPreview();
    }

    const sidebar = document.getElementById('museum-sidebar');
    if (sidebar) {
      sidebar.style.opacity = '1';
      sidebar.style.pointerEvents = 'auto';
    }

    if (this.museumTitle) {
      this.museumTitle.style.opacity = '1';
      (this.museumTitle as HTMLElement).style.pointerEvents = 'auto';
    }

    if (this.previewProgress) {
      this.previewProgress.style.display = 'none';
    }

    if (this.audioWaveform) {
      (this.audioWaveform as any).stop();
    }

    if (this.routeControls) {
      (this.routeControls as any).setMode('idle');
    }
  }

  private exportRoute(): void {
    if (!this.currentRoute) {
      alert('请先生成一条路线');
      return;
    }

    const json = dataManager.exportRouteToJSON(this.currentRoute);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tour-route-${this.currentRoute.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private updateStats(): void {
    if (!this.statsPanel) return;

    let stats: TourStats;

    if (this.currentRoute) {
      stats = dataManager.calculateTourStats(this.currentRoute);
    } else {
      stats = {
        totalDistance: 0,
        walkingTime: 0,
        exhibitStayTime: 0,
        totalTime: 0,
        exhibitCount: dataManager.getExhibits().length
      };
    }

    (this.statsPanel as any).setStats(stats);
  }

  private updatePreviewExhibits(): void {
    if (!this.currentRoute || !this.previewProgress) return;

    const exhibits = this.currentRoute.exhibitIds
      .map(id => dataManager.getExhibitById(id))
      .filter((e): e is Exhibit => e !== undefined);

    (this.previewProgress as any).setExhibits(exhibits);
  }

  private adjustSceneForSidebar(collapsed: boolean): void {
    // 可以在这里调整相机或场景以适应侧边栏宽度变化
  }

  public startFpsUpdate(): void {
    const updateFps = () => {
      if (sceneManager && this.fpsCounter) {
        const fps = sceneManager.getFps();
        (this.fpsCounter as any).setFps(fps);
      }
    };

    this.fpsUpdateInterval = window.setInterval(updateFps, 1000);
  }

  public stopFpsUpdate(): void {
    if (this.fpsUpdateInterval) {
      clearInterval(this.fpsUpdateInterval);
    }
  }

  public dispose(): void {
    this.stopFpsUpdate();
    this.stopPreview();
  }
}

export let uiManager: UIManager | null = null;

export function initUIManager(): UIManager {
  uiManager = new UIManager();
  uiManager.startFpsUpdate();
  return uiManager;
}
