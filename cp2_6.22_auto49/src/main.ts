import * as sceneManager from './sceneManager';
import * as controlPanel from './controlPanel';
import * as seasonController from './seasonController';

const sceneContainer = document.getElementById('scene-container')!;

function init(): void {
  sceneManager.initScene(sceneContainer);
  seasonController.init();
  controlPanel.init();

  sceneContainer.addEventListener('click', onSceneClick);
  document.addEventListener('keydown', onKeyDown);

  const exportBtn = document.getElementById('export-btn')!;
  exportBtn.addEventListener('click', () => {
    controlPanel.exportScreenshot();
  });

  controlPanel.setOnModeChange((mode) => {
    sceneContainer.style.cursor = mode === 'placing' ? 'crosshair' : 'default';
  });

  sceneManager.renderLoop();
}

function onSceneClick(event: MouseEvent): void {
  if (event.target !== sceneContainer.querySelector('canvas')) return;

  const mode = controlPanel.getCurrentMode();

  if (mode === 'placing') {
    const plantData = controlPanel.getSelectedPlantData();
    if (!plantData) return;

    const pos = sceneManager.getGroundIntersection(event, sceneContainer);
    if (!pos) return;

    if (Math.abs(pos.x) > 12 || Math.abs(pos.z) > 12) return;

    sceneManager.addPlant(plantData, pos);
    controlPanel.clearSelection();
    return;
  }

  const clickedPlant = sceneManager.findPlantInstanceAtClick(event, sceneContainer);
  if (clickedPlant) {
    sceneManager.selectPlant(clickedPlant);
  } else {
    sceneManager.deselectPlant();
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    event.preventDefault();
    controlPanel.addSnapshot();
  }
}

init();
