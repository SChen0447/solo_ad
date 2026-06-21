import { SceneManager } from './core/SceneManager';
import { ShadowSystem } from './core/ShadowSystem';
import {
  BuildingModule,
  MaterialKey,
  BuildingData,
  MATERIALS
} from './modules/BuildingModule';
import { ControlPanel } from './ui/ControlPanel';
import { SaveManager, SchemeData } from './ui/SaveManager';

class Application {
  private sceneManager!: SceneManager;
  private shadowSystem!: ShadowSystem;
  private buildingModule!: BuildingModule;
  private controlPanel!: ControlPanel;
  private saveManager!: SaveManager;

  private rafId: number | null = null;
  private lastFpsUpdate: number = 0;
  private frameCount: number = 0;
  private isDragging: boolean = false;
  private hoveredBuildingId: string | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.sceneManager = new SceneManager('canvas-container');
    this.shadowSystem = new ShadowSystem(this.sceneManager.scene);
    this.buildingModule = new BuildingModule(
      this.sceneManager.scene,
      this.shadowSystem,
      this.sceneManager.camera
    );

    this.controlPanel = new ControlPanel('app', {
      onSunAzimuthChange: (v) => this.handleSunChange(v, null),
      onSunAltitudeChange: (v) => this.handleSunChange(null, v),
      onStartPlacing: () => this.startPlacing(),
      onCancelPlacing: () => this.cancelPlacing(),
      onSizeChange: (w, d, h) => this.handleSizeChange(w, d, h),
      onMaterialChange: (k) => this.handleMaterialChange(k),
      onDeleteSelected: () => this.handleDeleteSelected(),
      onClearAll: () => this.handleClearAll(),
      onSaveScheme: () => this.handleSaveScheme(),
      onToggleDrawer: () => {}
    });

    this.saveManager = new SaveManager(
      this.controlPanel.getSchemeCardsContainer(),
      {
        onLoadScheme: (s) => this.handleLoadScheme(s),
        onDeleteScheme: () => {}
      }
    );

    this.buildingModule.setCallbacks(
      (id) => this.handleBuildingSelected(id),
      (c) => this.controlPanel.setBuildingCount(c)
    );

    this.controlPanel.setBuildingCount(0);
    this.controlPanel.setSunlightParams(this.shadowSystem.getSunlightParams());
    this.controlPanel.setSizeValues(
      this.buildingModule.getPendingSize().width,
      this.buildingModule.getPendingSize().depth,
      this.buildingModule.getPendingSize().height
    );

    this.bindCanvasEvents();
    this.bindKeyboardEvents();
    this.startLoop();
  }

  private handleSunChange(azimuth: number | null, altitude: number | null): void {
    const current = this.shadowSystem.getSunlightParams();
    const az = azimuth ?? current.azimuth;
    const al = altitude ?? current.altitude;
    this.shadowSystem.updateSunlight(az, al);
    this.buildingModule.updateMaterialsShininess();
  }

  private startPlacing(): void {
    this.buildingModule.setPlacingMode(true);
    this.buildingModule.selectBuilding(null);
    this.controlPanel.setPlacingMode(true);
    this.controlPanel.setSelectedBuilding(null);
    document.body.style.cursor = 'crosshair';
  }

  private cancelPlacing(): void {
    this.buildingModule.setPlacingMode(false);
    this.controlPanel.setPlacingMode(false);
    document.body.style.cursor = 'default';
  }

  private handleSizeChange(w: number, d: number, h: number): void {
    if (this.buildingModule.getSelectedId()) {
      this.buildingModule.updateBuildingDimensions(
        this.buildingModule.getSelectedId()!,
        w,
        d,
        h
      );
    } else {
      this.buildingModule.setPendingSize(w, d, h);
    }
  }

  private handleMaterialChange(key: MaterialKey): void {
    if (this.buildingModule.getSelectedId()) {
      this.buildingModule.setBuildingMaterial(
        this.buildingModule.getSelectedId()!,
        key
      );
    } else {
      this.buildingModule.setPendingMaterial(key);
    }
  }

  private handleBuildingSelected(id: string | null): void {
    if (id) {
      const obj = this.buildingModule.getSelectedBuilding();
      if (obj) {
        this.controlPanel.setSelectedBuilding(
          id,
          obj.data.dimensions,
          obj.data.materialKey
        );
      }
    } else {
      this.controlPanel.setSelectedBuilding(null);
    }
  }

  private handleDeleteSelected(): void {
    this.buildingModule.deleteSelectedBuilding();
  }

  private handleClearAll(): void {
    this.buildingModule.clearAll();
  }

  private handleSaveScheme(): void {
    const thumbnail = this.sceneManager.captureThumbnail(80, 80);
    const buildings = this.buildingModule.getBuildingData();
    const sunlight = this.shadowSystem.getSunlightParams();

    const name = prompt(
      '请输入方案名称（留空自动生成）:',
      `方案 ${this.saveManager.getAllSchemes().length + 1}`
    );

    this.saveManager.saveScheme(thumbnail, buildings, sunlight, name || undefined);
    this.controlPanel.openDrawer();
  }

  private handleLoadScheme(scheme: SchemeData): void {
    this.buildingModule.loadBuildings(scheme.buildings);
    this.shadowSystem.updateSunlight(scheme.sunlight.azimuth, scheme.sunlight.altitude);
    this.controlPanel.setSunlightParams(scheme.sunlight);
    this.controlPanel.closeDrawer();
  }

  private bindCanvasEvents(): void {
    const canvas = this.sceneManager.renderer.domElement;

    canvas.addEventListener('mousedown', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const movement = Math.abs(e.movementX) + Math.abs(e.movementY);
      if (movement > 3) this.isDragging = true;

      if (this.buildingModule.isPlacingActive()) {
        const point = this.sceneManager.getGroundIntersection(e);
        if (point) {
          this.buildingModule.updatePreviewPosition(point);
        }
      } else {
        const meshes = this.buildingModule.getAllMeshes();
        const intersects = this.sceneManager.getIntersects(e, meshes, false);
        if (intersects.length > 0) {
          const id = this.buildingModule.getBuildingIdByMesh(intersects[0].object);
          if (id && id !== this.hoveredBuildingId) {
            this.hoveredBuildingId = id;
            this.buildingModule.setHoveredBuilding(id);
            canvas.style.cursor = 'pointer';
          }
        } else {
          if (this.hoveredBuildingId !== null) {
            this.hoveredBuildingId = null;
            this.buildingModule.setHoveredBuilding(null);
          }
          canvas.style.cursor = 'default';
        }
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        return;
      }

      if (this.buildingModule.isPlacingActive()) {
        const point = this.sceneManager.getGroundIntersection(e);
        if (point) {
          const placed = this.buildingModule.placeBuildingAt(point);
          if (placed) {
            if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
              this.cancelPlacing();
            }
          }
        }
      } else {
        const meshes = this.buildingModule.getAllMeshes();
        const intersects = this.sceneManager.getIntersects(e, meshes, false);
        if (intersects.length > 0) {
          const id = this.buildingModule.getBuildingIdByMesh(intersects[0].object);
          this.buildingModule.selectBuilding(id);
        } else {
          this.buildingModule.selectBuilding(null);
        }
      }
      this.isDragging = false;
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.buildingModule.isPlacingActive()) {
        this.cancelPlacing();
      } else {
        this.buildingModule.selectBuilding(null);
      }
    });
  }

  private bindKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.buildingModule.isPlacingActive()) {
          this.cancelPlacing();
        } else {
          this.buildingModule.selectBuilding(null);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          this.buildingModule.getSelectedId() &&
          !(e.target instanceof HTMLInputElement)
        ) {
          this.buildingModule.deleteSelectedBuilding();
        }
      } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.handleSaveScheme();
      } else if ((e.key === 'p' || e.key === 'P') && !e.repeat) {
        if (this.buildingModule.isPlacingActive()) {
          this.cancelPlacing();
        } else {
          this.startPlacing();
        }
      }
    });
  }

  private startLoop(): void {
    const tick = () => {
      this.sceneManager.update();
      this.buildingModule.updateLabelsScale(this.sceneManager.camera.position);
      this.sceneManager.render();

      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsUpdate >= 1000) {
        this.lastFpsUpdate = now;
        this.frameCount = 0;
      }

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.buildingModule.dispose();
    this.shadowSystem.dispose();
    this.controlPanel.dispose();
    this.saveManager.dispose();
    this.sceneManager.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  (window as unknown as { app?: Application }).app = app;
});
