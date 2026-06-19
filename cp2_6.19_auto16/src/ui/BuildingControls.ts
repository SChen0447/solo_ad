import { BuildingType, BUILDING_PRESETS, MAX_BUILDINGS } from '../types';
import { SceneManager } from '../scene/SceneManager';

export class BuildingControls {
  private sceneManager: SceneManager;
  private buildingCounter: number = 1;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.setupEventListeners();
    this.updateBuildingList();
    this.updateBuildingCount();
    
    this.sceneManager.setOnBuildingChange(() => {
      this.updateBuildingList();
      this.updateBuildingCount();
    });
    
    this.sceneManager.setOnSelectionChange((buildingId) => {
      this.updateSelectedSection(buildingId);
      this.updateBuildingList();
    });
  }

  private setupEventListeners(): void {
    document.querySelectorAll('.building-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).getAttribute('data-type') as BuildingType;
        if (this.sceneManager.getBuildingCount() >= MAX_BUILDINGS) {
          alert(`最多只能添加 ${MAX_BUILDINGS} 栋建筑`);
          return;
        }
        this.sceneManager.setPendingBuildingType(type);
      });
    });

    const heightSlider = document.getElementById('height-slider') as HTMLInputElement;
    const heightValue = document.getElementById('height-value') as HTMLElement;
    
    heightSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      heightValue.textContent = value.toString();
      
      const selectedId = this.sceneManager.getSelectedBuildingId();
      if (selectedId) {
        this.sceneManager.updateBuildingHeight(selectedId, value);
      }
    });
    
    heightSlider.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      heightValue.textContent = value.toString();
    });

    const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    const rotationValue = document.getElementById('rotation-value') as HTMLElement;
    
    rotationSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      rotationValue.textContent = value.toString();
      
      const selectedId = this.sceneManager.getSelectedBuildingId();
      if (selectedId) {
        this.sceneManager.updateBuildingRotation(selectedId, value);
      }
    });
    
    rotationSlider.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      rotationValue.textContent = value.toString();
    });

    const deleteBtn = document.getElementById('delete-building') as HTMLButtonElement;
    deleteBtn.addEventListener('click', () => {
      const selectedId = this.sceneManager.getSelectedBuildingId();
      if (selectedId) {
        this.sceneManager.removeBuilding(selectedId);
      }
    });

    document.querySelectorAll('.panel-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const panelSide = (e.currentTarget as HTMLElement).getAttribute('data-panel');
        const container = document.getElementById(`${panelSide}-container`);
        if (container) {
          container.classList.toggle(`collapsed-${panelSide}`);
        }
      });
    });
    
    document.getElementById('panel-tab-left')?.addEventListener('click', () => {
      const container = document.getElementById('building-container');
      container?.classList.remove('collapsed-left');
    });
    
    document.getElementById('panel-tab-right')?.addEventListener('click', () => {
      const container = document.getElementById('analysis-container');
      container?.classList.remove('collapsed-right');
    });

    document.getElementById('mobile-toggle-left')?.addEventListener('click', () => {
      const container = document.getElementById('building-container');
      const rightContainer = document.getElementById('analysis-container');
      rightContainer?.classList.remove('mobile-open');
      container?.classList.toggle('mobile-open');
    });

    document.getElementById('mobile-toggle-right')?.addEventListener('click', () => {
      const container = document.getElementById('analysis-container');
      const leftContainer = document.getElementById('building-container');
      leftContainer?.classList.remove('mobile-open');
      container?.classList.toggle('mobile-open');
    });
    
    document.getElementById('placing-cancel-btn')?.addEventListener('click', () => {
      this.sceneManager.cancelPlacing();
      this.sceneManager.setPendingBuildingType(null);
    });
    
    this.sceneManager.setOnPlacingModeChange((isPlacing) => {
      const banner = document.getElementById('placing-banner');
      if (banner) {
        banner.style.display = isPlacing ? 'flex' : 'none';
      }
    });

    this.handleResponsiveLayout();
    window.addEventListener('resize', () => this.handleResponsiveLayout());
  }

  private handleResponsiveLayout(): void {
    const width = window.innerWidth;
    const leftToggle = document.getElementById('mobile-toggle-left');
    const rightToggle = document.getElementById('mobile-toggle-right');
    const leftContainer = document.getElementById('building-container');
    const rightContainer = document.getElementById('analysis-container');
    const leftPanel = document.getElementById('building-panel');
    const rightPanel = document.getElementById('analysis-panel');
    
    if (width < 1024) {
      leftToggle?.style.setProperty('display', 'flex');
      rightToggle?.style.setProperty('display', 'flex');
      leftPanel?.classList.remove('mobile-open');
      rightPanel?.classList.remove('mobile-open');
      leftContainer?.classList.remove('collapsed-left');
      rightContainer?.classList.remove('collapsed-right');
    } else {
      leftToggle?.style.setProperty('display', 'none');
      rightToggle?.style.setProperty('display', 'none');
      leftContainer?.classList.remove('collapsed-left');
      rightContainer?.classList.remove('collapsed-right');
    }
  }

  private updateSelectedSection(buildingId: string | null): void {
    const selectedSection = document.getElementById('selected-section') as HTMLElement;
    const heightSlider = document.getElementById('height-slider') as HTMLInputElement;
    const heightValue = document.getElementById('height-value') as HTMLElement;
    const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    const rotationValue = document.getElementById('rotation-value') as HTMLElement;
    
    if (buildingId) {
      const building = this.sceneManager.getBuildingData(buildingId);
      if (building) {
        selectedSection.style.display = 'block';
        heightSlider.value = building.height.toString();
        heightValue.textContent = building.height.toString();
        rotationSlider.value = building.rotation.toString();
        rotationValue.textContent = building.rotation.toString();
      }
    } else {
      selectedSection.style.display = 'none';
    }
  }

  private updateBuildingList(): void {
    const listContainer = document.getElementById('building-list') as HTMLElement;
    const buildings = this.sceneManager.getAllBuildings();
    const selectedId = this.sceneManager.getSelectedBuildingId();
    
    listContainer.innerHTML = '';
    
    if (buildings.length === 0) {
      listContainer.innerHTML = '<p style="color: #666; font-size: 12px; text-align: center;">暂无建筑</p>';
      return;
    }
    
    buildings.forEach((building, index) => {
      const item = document.createElement('div');
      item.className = `building-item-detail ${building.id === selectedId ? 'selected' : ''}`;
      item.dataset.id = building.id;
      
      const typeName = BUILDING_PRESETS[building.type].name;
      const typeColors: Record<string, string> = {
        office: '#4a90d9',
        residential: '#6bbf59',
        tower: '#d9774a'
      };
      
      item.innerHTML = `
        <div class="building-item-header">
          <span class="building-item-name">
            <span class="building-item-dot" style="background: ${typeColors[building.type]}"></span>
            ${this.buildingCounter + index}. ${typeName}
          </span>
        </div>
        <div class="building-item-info">
          <div class="info-col">
            <span class="info-label">高度</span>
            <span class="info-value">${building.height}m</span>
          </div>
          <div class="info-col">
            <span class="info-label">旋转</span>
            <span class="info-value">${building.rotation}°</span>
          </div>
          <div class="info-col">
            <span class="info-label">位置</span>
            <span class="info-value">${building.position.x.toFixed(0)}, ${building.position.z.toFixed(0)}</span>
          </div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.sceneManager.selectBuilding(building.id);
      });
      
      listContainer.appendChild(item);
    });
  }

  private updateBuildingCount(): void {
    const countEl = document.getElementById('building-count') as HTMLElement;
    countEl.textContent = this.sceneManager.getBuildingCount().toString();
  }

  public dispose(): void {
    window.removeEventListener('resize', () => this.handleResponsiveLayout());
  }
}
