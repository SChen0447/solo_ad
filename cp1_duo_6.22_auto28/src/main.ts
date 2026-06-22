import { PLATES_DATA } from './data/platesData.js';
import { SceneManager } from './renderer/SceneManager.js';
import { TimelineController } from './animation/TimelineController.js';
import { AnimationEngine } from './animation/AnimationEngine.js';
import { HUD } from './ui/HUD.js';
import { InfoPanel } from './ui/InfoPanel.js';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Container #app not found');
}

const sceneManager = new SceneManager(container);

sceneManager.initPlates(PLATES_DATA);

const timelineController = new TimelineController();

const animationEngine = new AnimationEngine(
  sceneManager,
  timelineController,
  PLATES_DATA
);

const hud = new HUD(timelineController, sceneManager);

const infoPanel = new InfoPanel(sceneManager.plateRenderer, sceneManager);

sceneManager.startRenderLoop();

animationEngine.start();
