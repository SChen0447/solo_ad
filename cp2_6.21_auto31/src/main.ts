import { RenderEngine } from '@/modules/renderEngine';
import { PlanetManager } from '@/modules/planetManager';
import { UIController } from '@/modules/uiController';

const container = document.getElementById('canvas-container');
if (!container) {
  throw new Error('Canvas container not found');
}

const planetManager = new PlanetManager();
const renderEngine = new RenderEngine(container);
const uiController = new UIController();

renderEngine.initPlanetManager(planetManager);

renderEngine.start();

console.log(`太阳系行星漫游应用已启动 | 三角形总数: ${planetManager.getTotalTriangles()}`);
