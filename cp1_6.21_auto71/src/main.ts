import { SceneManager } from './renderer/SceneManager';
import { BuildingRenderer } from './renderer/BuildingRenderer';
import { AnimationLoop } from './renderer/AnimationLoop';
import { TimeLineController } from './ui/TimeLineController';
import { BuildingInfoPanel } from './ui/BuildingInfoPanel';
import { BUILDINGS_DATA } from './data/BuildingData';

class App {
  private sceneManager!: SceneManager;
  private buildingRenderer!: BuildingRenderer;
  private animationLoop!: AnimationLoop;
  private timeLineController!: TimeLineController;
  private buildingInfoPanel!: BuildingInfoPanel;
  private container!: HTMLElement;
  private labelContainer!: HTMLElement;

  constructor() {
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('scene-container')!;
    this.labelContainer = document.getElementById('label-container')!;

    this.sceneManager = new SceneManager(this.container);

    this.buildingRenderer = new BuildingRenderer(
      this.sceneManager.scene,
      BUILDINGS_DATA,
      this.labelContainer,
      this.sceneManager.camera
    );

    this.animationLoop = new AnimationLoop(this.sceneManager, this.buildingRenderer);

    this.timeLineController = new TimeLineController();
    this.timeLineController.onEraChange = this.handleEraChange.bind(this);

    this.buildingInfoPanel = new BuildingInfoPanel();
    this.buildingInfoPanel.onClose = this.handlePanelClose.bind(this);

    this.bindInteractionEvents();
    this.bindKeyboardEvents();

    this.animationLoop.start();
  }

  private handleEraChange(era: number): void {
    this.buildingRenderer.updateBuildingsForEra(era, true);
    this.buildingInfoPanel.updateEra(era);
  }

  private handlePanelClose(): void {
  }

  private bindInteractionEvents(): void {
    const canvas = this.sceneManager.getCanvas();

    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.sceneManager.getCanvas().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const building = this.buildingRenderer.updateRaycaster(
      x,
      y,
      rect.width,
      rect.height
    );

    this.buildingRenderer.setHoveredBuilding(building);

    if (building) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'grab';
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.sceneManager.getCanvas().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const building = this.buildingRenderer.updateRaycaster(
      x,
      y,
      rect.width,
      rect.height
    );

    if (building) {
      this.buildingInfoPanel.show(building);
    }
  }

  private bindKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.sceneManager.resetCamera(1);
      }
      if (e.key === 'Escape') {
        this.buildingInfoPanel.hide();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
