import './style.css';
import { SceneManager } from './scene/SceneManager';
import { TimeSlider } from './analysis/TimeSlider';
import { ShadowAnalyzer } from './analysis/ShadowAnalyzer';
import { BuildingControls } from './ui/BuildingControls';
import { AnalysisPanel } from './ui/AnalysisPanel';
import { MarkedTime, LightParams } from './types';

class App {
  private sceneManager: SceneManager;
  private timeSlider: TimeSlider;
  private shadowAnalyzer: ShadowAnalyzer;
  private buildingControls: BuildingControls;
  private analysisPanel: AnalysisPanel;
  private shadowUpdateTimeout: number | null = null;
  private lastAnalysisTime: number = 0;
  private readonly MIN_ANALYSIS_INTERVAL = 100;

  constructor() {
    this.sceneManager = new SceneManager('scene-canvas');
    this.timeSlider = new TimeSlider(this.sceneManager.getEnvironment(), 'gui-container');
    this.shadowAnalyzer = new ShadowAnalyzer(this.sceneManager.getScene());
    this.buildingControls = new BuildingControls(this.sceneManager);
    this.analysisPanel = new AnalysisPanel(this.sceneManager);

    this.setupEventListeners();
    this.setupTimeControls();
    this.triggerShadowAnalysis();
    
    console.log('建筑日照与阴影分析工具已启动');
  }

  private setupEventListeners(): void {
    this.sceneManager.getEnvironment().setOnLightChange(() => {
      this.scheduleShadowAnalysis();
    });

    this.sceneManager.setOnBuildingChange(() => {
      this.scheduleShadowAnalysis();
    });

    this.shadowAnalyzer.setOnShadowUpdate((results) => {
      this.analysisPanel.updateShadowStats(results);
    });

    this.timeSlider.setOnMarkTime((markedTime) => {
      this.handleMarkTime(markedTime);
    });

    this.timeSlider.setOnClearMark((id) => {
      this.shadowAnalyzer.clearComparisonOverlay(id);
    });

    document.addEventListener('comparisonVisibilityChange', ((e: CustomEvent) => {
      this.shadowAnalyzer.setComparisonVisible(e.detail.visible);
    }) as EventListener);

    document.addEventListener('markTime', ((e: CustomEvent) => {
      const { id, color } = e.detail;
      this.handleUIMarkTime(id, color);
    }) as EventListener);
  }

  private setupTimeControls(): void {
    const timeSliderEl = document.getElementById('time-slider') as HTMLInputElement;
    const datePickerEl = document.getElementById('date-picker') as HTMLInputElement;

    timeSliderEl.addEventListener('input', (e) => {
      const hour = parseFloat((e.target as HTMLInputElement).value);
      const { date } = this.timeSlider.getTime();
      this.timeSlider.setTime(date, hour);
    });

    datePickerEl.addEventListener('change', (e) => {
      const date = (e.target as HTMLInputElement).value;
      const { hour } = this.timeSlider.getTime();
      this.timeSlider.setTime(date, hour);
    });
  }

  private scheduleShadowAnalysis(): void {
    const now = Date.now();
    const timeSinceLastAnalysis = now - this.lastAnalysisTime;

    if (timeSinceLastAnalysis >= this.MIN_ANALYSIS_INTERVAL) {
      this.triggerShadowAnalysis();
    } else {
      if (this.shadowUpdateTimeout) {
        clearTimeout(this.shadowUpdateTimeout);
      }
      this.shadowUpdateTimeout = window.setTimeout(() => {
        this.triggerShadowAnalysis();
      }, this.MIN_ANALYSIS_INTERVAL - timeSinceLastAnalysis);
    }
  }

  private triggerShadowAnalysis(): void {
    const startTime = performance.now();
    
    const buildings = this.sceneManager.getAllBuildings();
    const buildingMeshes = this.sceneManager.getBuildingMeshes();
    const lightParams = this.sceneManager.getEnvironment().getLightParams();

    if (buildings.length > 0) {
      this.shadowAnalyzer.calculateShadows(buildings, buildingMeshes, lightParams);
    }

    this.lastAnalysisTime = Date.now();
    
    const endTime = performance.now();
    if (endTime - startTime > 500) {
      console.warn(`阴影计算耗时: ${(endTime - startTime).toFixed(0)}ms，超过500ms限制`);
    }
  }

  private handleMarkTime(markedTime: MarkedTime): void {
    const lightParams = this.calculateLightParamsForTime(markedTime.date, markedTime.hour);
    const buildings = this.sceneManager.getAllBuildings();
    const buildingMeshes = this.sceneManager.getBuildingMeshes();
    
    if (buildings.length > 0) {
      this.shadowAnalyzer.calculateComparisonShadows(
        buildings,
        buildingMeshes,
        lightParams,
        markedTime.id,
        markedTime.color
      );
    }
  }

  private handleUIMarkTime(id: number, color: string): void {
    const { date, hour } = this.timeSlider.getTime();
    const markedTimes = this.timeSlider.getMarkedTimes();
    const existing = markedTimes.find(m => m.id === id);
    
    if (existing) {
      this.timeSlider.setOnClearMark?.(id);
      this.shadowAnalyzer.clearComparisonOverlay(id);
      
      const labelEl = document.getElementById(`marker-label-${id}`);
      const btnEl = document.getElementById(`mark-time-${id}`);
      if (labelEl) labelEl.textContent = `标记时段${id}`;
      if (btnEl) btnEl.classList.remove('marked');
      
      const filtered = markedTimes.filter(m => m.id !== id);
      Object.defineProperty(this.timeSlider, 'markedTimes', {
        value: filtered,
        writable: true
      });
    } else {
      const markedTime: MarkedTime = { id, date, hour, color };
      
      const lightParams = this.calculateLightParamsForTime(date, hour);
      const buildings = this.sceneManager.getAllBuildings();
      const buildingMeshes = this.sceneManager.getBuildingMeshes();
      
      if (buildings.length > 0) {
        this.shadowAnalyzer.calculateComparisonShadows(
          buildings,
          buildingMeshes,
          lightParams,
          id,
          color
        );
      }
      
      const labelEl = document.getElementById(`marker-label-${id}`);
      const btnEl = document.getElementById(`mark-time-${id}`);
      if (labelEl) {
        const hours = Math.floor(hour);
        const minutes = Math.round((hour - hours) * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const d = new Date(date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        labelEl.textContent = `${dateStr} ${timeStr} (点击清除)`;
      }
      if (btnEl) btnEl.classList.add('marked');
      
      const updated = [...markedTimes, markedTime];
      Object.defineProperty(this.timeSlider, 'markedTimes', {
        value: updated,
        writable: true
      });
    }
  }

  private calculateLightParamsForTime(date: string, hour: number): LightParams {
    const sunPosition = this.sceneManager.getEnvironment().calculateSunPosition(date, hour);
    
    const elevationRad = sunPosition.elevation * Math.PI / 180;
    const azimuthRad = sunPosition.azimuth * Math.PI / 180;
    
    const distance = 200;
    const x = distance * Math.sin(azimuthRad) * Math.cos(elevationRad);
    const y = distance * Math.sin(elevationRad);
    const z = distance * Math.cos(azimuthRad) * Math.cos(elevationRad);
    
    const normalizedElevation = Math.max(0, sunPosition.elevation) / 90;
    const intensity = 0.2 + normalizedElevation * 1.3;
    
    let color: number;
    if (normalizedElevation < 0.2) {
      color = 0xffaa66;
    } else if (normalizedElevation < 0.4) {
      color = 0xffddaa;
    } else {
      color = 0xffffff;
    }
    
    const dir = new THREE.Vector3(-x, -y, -z).normalize();
    
    return {
      position: { x, y, z },
      intensity,
      color,
      direction: { x: dir.x, y: dir.y, z: dir.z }
    };
  }

  public dispose(): void {
    if (this.shadowUpdateTimeout) {
      clearTimeout(this.shadowUpdateTimeout);
    }
    this.shadowAnalyzer.dispose();
    this.timeSlider.dispose();
    this.buildingControls.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
