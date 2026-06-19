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
        const panel = document.querySelector(`.panel-${panelSide}`);
        if (panel) {
          panel.classList.toggle('collapsed');
        }
      });
    });

    document.getElementById('mobile-toggle-left')?.addEventListener('click', () => {
      const panel = document.getElementById('building-panel');
      const rightPanel = document.getElementById('analysis-panel');
      rightPanel?.classList.remove('mobile-open');
      panel?.classList.toggle('mobile-open');
    });

    document.getElementById('mobile-toggle-right')?.addEventListener('click', () => {
      const panel = document.getElementById('analysis-panel');
      const leftPanel = document.getElementById('building-panel');
      leftPanel?.classList.remove('mobile-open');
      panel?.classList.toggle('mobile-open');
    });

    this.handleResponsiveLayout();
    window.addEventListener('resize', () => this.handleResponsiveLayout());
  }

  private handleResponsiveLayout(): void {
    const width = window.innerWidth;
    const leftToggle = document.getElementById('mobile-toggle-left');
    const rightToggle = document.getElementById('mobile-toggle-right');
    const leftPanel = document.getElementById('building-panel');
    const rightPanel = document.getElementById('analysis-panel');
    
    if (width < 1024) {
      leftToggle?.style.setProperty('display', 'flex');
      rightToggle?.style.setProperty('display', 'flex');
      leftPanel?.classList.remove('mobile-open');
      rightPanel?.classList.remove('mobile-open');
    } else {
      leftToggle?.style.setProperty('display', 'none');
      rightToggle?.style.setProperty('display', 'none');
      leftPanel?.classList.remove('collapsed');
      rightPanel?.classList.remove('collapsed');
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
      item.className = `building-item ${building.id === selectedId ? 'selected' : ''}`;
      item.dataset.id = building.id;
      
      const typeName = BUILDING_PRESETS[building.type].name;
      item.innerHTML = `
        <span class="type">${this.buildingCounter + index}. ${typeName}</span>
        <span class="height">${building.height}m</span>
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
