import * as THREE from 'three';
import { Plant, PlantSpecies, PLANT_CONFIGS, StatusRating } from './PlantModel';

export class UIHandler {
  private container: HTMLElement;
  private lightSlider: HTMLInputElement;
  private sliderValue: HTMLElement;
  private sliderPanel: HTMLElement;
  private plantSelector: HTMLElement;
  private plantNameEl: HTMLElement;
  private idealLightEl: HTMLElement;
  private currentLightEl: HTMLElement;
  private lightFill: HTMLElement;
  private statusBadge: HTMLElement;

  private plantLabels: Map<string, HTMLElement> = new Map();
  private isDraggingPanel: boolean = false;
  private panelDragOffset: { x: number; y: number } = { x: 0, y: 0 };

  private onLightChangeCallback: ((value: number) => void) | null = null;
  private onPlantSelectCallback: ((species: PlantSpecies) => void) | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.lightSlider = document.getElementById('light-slider') as HTMLInputElement;
    this.sliderValue = document.getElementById('slider-value')!;
    this.sliderPanel = document.getElementById('slider-panel')!;
    this.plantSelector = document.getElementById('plant-selector')!;
    this.plantNameEl = document.getElementById('plant-name')!;
    this.idealLightEl = document.getElementById('ideal-light')!;
    this.currentLightEl = document.getElementById('current-light')!;
    this.lightFill = document.getElementById('light-fill')!;
    this.statusBadge = document.getElementById('status-badge')!;

    this.initPlantSelector();
    this.bindEvents();
  }

  private initPlantSelector(): void {
    const speciesList: PlantSpecies[] = ['pothos', 'monstera', 'snakePlant', 'fiddleLeaf', 'succulent'];
    
    speciesList.forEach((species, index) => {
      const config = PLANT_CONFIGS[species];
      const btn = document.createElement('button');
      btn.className = 'plant-btn';
      btn.textContent = config.name;
      btn.dataset.species = species;
      if (index === 0) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        this.selectPlantButton(species);
        if (this.onPlantSelectCallback) {
          this.onPlantSelectCallback(species);
        }
      });
      this.plantSelector.appendChild(btn);
    });
  }

  private selectPlantButton(species: PlantSpecies): void {
    const buttons = this.plantSelector.querySelectorAll('.plant-btn');
    buttons.forEach((btn) => {
      if ((btn as HTMLElement).dataset.species === species) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private bindEvents(): void {
    this.lightSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderValue(value);
      if (this.onLightChangeCallback) {
        this.onLightChangeCallback(value);
      }
    });

    this.sliderPanel.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('light-slider')) return;
      
      this.isDraggingPanel = true;
      const rect = this.sliderPanel.getBoundingClientRect();
      this.panelDragOffset.x = e.clientX - rect.left;
      this.panelDragOffset.y = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDraggingPanel) {
        const x = e.clientX - this.panelDragOffset.x;
        const y = e.clientY - this.panelDragOffset.y;
        this.sliderPanel.style.left = `${x}px`;
        this.sliderPanel.style.top = `${y}px`;
        this.sliderPanel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDraggingPanel = false;
    });
  }

  public onLightChange(callback: (value: number) => void): void {
    this.onLightChangeCallback = callback;
  }

  public onPlantSelect(callback: (species: PlantSpecies) => void): void {
    this.onPlantSelectCallback = callback;
  }

  public updateSliderValue(value: number): void {
    this.sliderValue.textContent = `${Math.round(value)}%`;
  }

  public getLightValue(): number {
    return parseFloat(this.lightSlider.value);
  }

  public createPlantLabel(plant: Plant): HTMLElement {
    const label = document.createElement('div');
    label.className = 'plant-label';
    label.dataset.plantId = plant.id;
    this.container.appendChild(label);
    this.plantLabels.set(plant.id, label);
    return label;
  }

  public removePlantLabel(plantId: string): void {
    const label = this.plantLabels.get(plantId);
    if (label) {
      label.remove();
      this.plantLabels.delete(plantId);
    }
  }

  public updatePlantLabel(plant: Plant, screenPos: THREE.Vector2): void {
    const label = this.plantLabels.get(plant.id);
    if (!label) return;

    const lux = plant.currentState.receivedLight;
    label.textContent = `${lux} Lux`;
    label.style.left = `${screenPos.x}px`;
    label.style.top = `${screenPos.y - 10}px`;

    const backgroundColor = this.getLightColor(lux);
    label.style.backgroundColor = backgroundColor;
  }

  private getLightColor(lux: number): string {
    if (lux < 50) {
      return 'rgba(244, 67, 54, 0.85)';
    } else if (lux < 100) {
      return 'rgba(255, 152, 0, 0.85)';
    } else if (lux < 200) {
      return 'rgba(139, 195, 74, 0.85)';
    } else {
      return 'rgba(76, 175, 80, 0.9)';
    }
  }

  public updateInfoPanel(plant: Plant | null): void {
    if (!plant) {
      this.plantNameEl.textContent = '-';
      this.idealLightEl.textContent = '-';
      this.currentLightEl.textContent = '-';
      this.lightFill.style.width = '0%';
      this.statusBadge.textContent = '未选择';
      this.statusBadge.className = 'status-badge status-normal';
      return;
    }

    const config = plant.config;
    const state = plant.currentState;

    this.plantNameEl.textContent = config.name;
    this.idealLightEl.textContent = `${config.idealLightMin} - ${config.idealLightMax} Lux`;
    this.currentLightEl.textContent = `${state.receivedLight} Lux`;

    const maxLight = 500;
    const fillPercent = Math.min(100, (state.receivedLight / maxLight) * 100);
    this.lightFill.style.width = `${fillPercent}%`;

    this.updateStatusBadge(state.status);
  }

  private updateStatusBadge(status: StatusRating): void {
    const statusText: Record<StatusRating, string> = {
      excellent: '优秀',
      normal: '正常',
      warning: '警告',
      danger: '危险',
    };

    this.statusBadge.textContent = statusText[status];
    this.statusBadge.className = `status-badge status-${status}`;
  }

  public hideAllLabels(): void {
    this.plantLabels.forEach((label) => {
      label.style.display = 'none';
    });
  }

  public showAllLabels(): void {
    this.plantLabels.forEach((label) => {
      label.style.display = 'block';
    });
  }

  public dispose(): void {
    this.plantLabels.forEach((label) => label.remove());
    this.plantLabels.clear();
  }
}
