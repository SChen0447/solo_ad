import { SceneManager } from '../scene/sceneManager';
import type { SnapshotData, AreaId, AreaMaterialMap } from '../types';
import { DEFAULT_MATERIAL_MAP, AREAS } from '../data/materials';

type MaterialChangeCallback = (snapshot: SnapshotData) => void;
type AnimatingChangeCallback = (isAnimating: boolean) => void;

export class UIController {
  private sceneManager: SceneManager | null = null;
  private selectedArea: AreaId = 'floor';
  private currentMaterials: AreaMaterialMap = { ...DEFAULT_MATERIAL_MAP };
  private isAnimating: boolean = false;
  private onMaterialChange: MaterialChangeCallback | null = null;
  private onAnimatingChange: AnimatingChangeCallback | null = null;

  constructor() {
  }

  public init(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager;
    
    this.sceneManager.setOnMaterialChange((snapshot) => {
      this.handleMaterialChanged(snapshot);
    });
  }

  private handleMaterialChanged(snapshot: SnapshotData): void {
    if (snapshot.areaId === 'all') {
      AREAS.forEach(area => {
        this.currentMaterials[area.id as keyof AreaMaterialMap] = 'default-white';
      });
    } else {
      this.currentMaterials[snapshot.areaId as keyof AreaMaterialMap] = snapshot.materialId;
    }
    
    if (this.onMaterialChange) {
      this.onMaterialChange(snapshot);
    }
  }

  public async switchMaterial(areaId: AreaId, materialId: string): Promise<void> {
    if (!this.sceneManager || this.isAnimating) return;
    
    this.setAnimating(true);
    
    try {
      await this.sceneManager.switchMaterial(areaId, materialId);
    } finally {
      this.setAnimating(false);
    }
  }

  public async resetAllMaterials(): Promise<void> {
    if (!this.sceneManager || this.isAnimating) return;
    
    this.setAnimating(true);
    
    try {
      await this.sceneManager.resetAllMaterials();
    } finally {
      this.setAnimating(false);
    }
  }

  private setAnimating(value: boolean): void {
    this.isAnimating = value;
    if (this.onAnimatingChange) {
      this.onAnimatingChange(value);
    }
  }

  public setSelectedArea(area: AreaId): void {
    this.selectedArea = area;
  }

  public getSelectedArea(): AreaId {
    return this.selectedArea;
  }

  public getCurrentMaterials(): AreaMaterialMap {
    return { ...this.currentMaterials };
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  public setOnMaterialChange(callback: MaterialChangeCallback): void {
    this.onMaterialChange = callback;
  }

  public setOnAnimatingChange(callback: AnimatingChangeCallback): void {
    this.onAnimatingChange = callback;
  }

  public dispose(): void {
    this.sceneManager = null;
    this.onMaterialChange = null;
    this.onAnimatingChange = null;
  }
}
