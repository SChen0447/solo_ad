import { ShadowResult, BUILDING_PRESETS } from '../types';
import { SceneManager } from '../scene/SceneManager';

export class AnalysisPanel {
  private sceneManager: SceneManager;
  private buildingCounter: number = 1;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.setupEventListeners();
    
    this.sceneManager.setOnBuildingChange(() => {
      const results = JSON.parse(sessionStorage.getItem('lastShadowResults') || '[]');
      this.updateShadowStats(results);
    });
  }

  private setupEventListeners(): void {
    const showComparison = document.getElementById('show-comparison') as HTMLInputElement;
    showComparison.addEventListener('change', (e) => {
      const visible = (e.target as HTMLInputElement).checked;
      const event = new CustomEvent('comparisonVisibilityChange', { detail: { visible } });
      document.dispatchEvent(event);
    });

    document.getElementById('mark-time-1')?.addEventListener('click', () => {
      this.markTime(1, '#0088FF');
    });
    
    document.getElementById('mark-time-2')?.addEventListener('click', () => {
      this.markTime(2, '#FF4444');
    });
  }

  private markTime(id: number, color: string): void {
    const event = new CustomEvent('markTime', { 
      detail: { id, color } 
    });
    document.dispatchEvent(event);
  }

  public updateShadowStats(results: ShadowResult[]): void {
    const statsContainer = document.getElementById('shadow-stats') as HTMLElement;
    const buildings = this.sceneManager.getAllBuildings();
    
    sessionStorage.setItem('lastShadowResults', JSON.stringify(results));
    
    if (buildings.length === 0) {
      statsContainer.innerHTML = '<p style="color: #666; font-size: 12px; text-align: center;">暂无建筑</p>';
      return;
    }
    
    statsContainer.innerHTML = '';
    
    buildings.forEach((building, index) => {
      const result = results.find(r => r.buildingId === building.id);
      const shadowRate = result?.shadowRate || 0;
      
      const preset = BUILDING_PRESETS[building.type];
      const item = document.createElement('div');
      item.className = 'shadow-stat-item';
      
      const barColor = shadowRate > 50 ? '#FF4444' : shadowRate > 20 ? '#FFD700' : '#00D4FF';
      
      item.innerHTML = `
        <div class="shadow-stat-header">
          <span class="name">${this.buildingCounter + index}. ${preset.name}</span>
          <span class="rate">${shadowRate.toFixed(1)}%</span>
        </div>
        <div class="shadow-bar">
          <div class="shadow-bar-fill" style="width: ${shadowRate}%; background: ${barColor};"></div>
        </div>
      `;
      
      statsContainer.appendChild(item);
    });
  }
}
